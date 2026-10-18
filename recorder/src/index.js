// Recorder for Ahmed's Arabic audio. Static page in public/, recordings in KV.
// Password: the first person to open the page chooses it (stored hashed in KV); every /api call needs it.
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const hash = async (pw, salt) => {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
};
const safe = id => /^[\w~.\-]{1,190}$/.test(id);
const b64 = buf => { let s = '', u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };

async function listAll(kv, prefix) {
  const out = []; let cursor;
  do { const r = await kv.list({ prefix, cursor }); out.push(...r.keys); cursor = r.list_complete ? null : r.cursor; } while (cursor);
  return out;
}
const readJson = async (kv, prefix) => (await Promise.all((await listAll(kv, prefix)).map(k => kv.get(k.name, 'json')))).filter(Boolean);

// Public read-only side for the app (no password, CORS open): GET /pub/manifest = what is recorded, GET /pub/a/<id> = the sound.
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS' };
async function manifest(kv) { // {id: {path, parts?, alt?, ts, mime}}; metadata rides on the key so no per-clip reads are needed
  const keys = await listAll(kv, 'm:'), out = {};
  await Promise.all(keys.map(async k => {
    let m = k.metadata;
    if (!m) { const full = await kv.get(k.name, 'json'); if (!full) return; m = { path: full.path, parts: full.parts, alt: full.alt, ts: full.ts, mime: full.mime }; await kv.put(k.name, JSON.stringify(full), { metadata: m }); }
    out[k.name.slice(2)] = m;
  }));
  return out;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname, kv = env.REC;
    if (p.startsWith('/pub/')) {
      if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
      if (p === '/pub/manifest') return new Response(JSON.stringify(await manifest(kv)), { headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' } });
      const id = p.split('/')[3];
      if (p.startsWith('/pub/a/') && id && safe(id)) {
        const buf = await kv.get('a:' + id, 'arrayBuffer'), m = await kv.get('m:' + id, 'json');
        if (!buf) return new Response('none', { status: 404, headers: CORS });
        // the app asks with ?v=<timestamp>, so a new recording is a new address: cache for good
        return new Response(buf, { headers: { ...CORS, 'content-type': (m && m.mime) || 'audio/webm', 'cache-control': url.searchParams.get('v') ? 'public, max-age=31536000, immutable' : 'no-cache' } });
      }
      return new Response('not found', { status: 404, headers: CORS });
    }
    if (!p.startsWith('/api/')) return env.ASSETS.fetch(req);
    const cfg = await kv.get('cfg:pw', 'json');
    if (p === '/api/state') return J({ claimed: !!cfg });
    if (p === '/api/claim' && req.method === 'POST') {
      if (cfg) return J({ error: 'claimed' }, 409);
      const { password } = await req.json();
      if (!password || password.length < 4) return J({ error: 'short' }, 400);
      const salt = crypto.randomUUID();
      await kv.put('cfg:pw', JSON.stringify({ salt, h: await hash(password, salt) }));
      return J({ ok: true });
    }
    if (!cfg || (await hash(req.headers.get('x-pw') || '', cfg.salt)) !== cfg.h) return J({ error: 'auth' }, 401);
    const parts = p.split('/').filter(Boolean); // api, kind, id
    const kind = parts[1], id = parts[2];
    if (kind === 'check') return J({ ok: true });
    if (kind === 'list') return J({ rec: await readJson(kv, 'm:'), splits: await readJson(kv, 's:'), custom: await readJson(kv, 'c:'), regen: await readJson(kv, 'g:') });
    if (kind === 'export') { // everything in the format tools/ar-library/import_recordings.py reads
      const metas = await readJson(kv, 'm:'), docs = [];
      for (const m of metas) { const buf = await kv.get('a:' + m.id, 'arrayBuffer'); if (buf) docs.push({ ...m, b64: b64(buf) }); }
      return J({ audio: docs, splits: await readJson(kv, 's:') });
    }
    if (!id || !safe(id)) return J({ error: 'bad id' }, 400);
    if (kind === 'audio') {
      if (req.method === 'GET') { const buf = await kv.get('a:' + id, 'arrayBuffer'), m = await kv.get('m:' + id, 'json'); return buf ? new Response(buf, { headers: { 'content-type': (m && m.mime) || 'audio/webm', 'cache-control': 'no-store' } }) : J({ error: 'none' }, 404); }
      if (req.method === 'PUT') {
        const buf = await req.arrayBuffer();
        if (buf.byteLength < 500 || buf.byteLength > 20e6) return J({ error: 'size' }, 400);
        const meta = JSON.parse(decodeURIComponent(url.searchParams.get('meta') || '{}'));
        meta.id = id; meta.size = buf.byteLength; meta.ts = Date.now(); meta.mime = (req.headers.get('content-type') || 'audio/webm').split(';')[0];
        await kv.put('a:' + id, buf); await kv.put('m:' + id, JSON.stringify(meta), { metadata: { path: meta.path, parts: meta.parts, alt: meta.alt, ts: meta.ts, mime: meta.mime } }); return J({ ok: true });
      }
      if (req.method === 'DELETE') { await kv.delete('a:' + id); await kv.delete('m:' + id); return J({ ok: true }); }
    }
    const pre = { split: 's:', custom: 'c:', regen: 'g:' }[kind];
    if (pre) {
      if (req.method === 'PUT') { const o = await req.json(); o.id = id; o.ts = Date.now(); await kv.put(pre + id, JSON.stringify(o)); return J({ ok: true }); }
      if (req.method === 'DELETE') { await kv.delete(pre + id); return J({ ok: true }); }
    }
    return J({ error: 'not found' }, 404);
  }
};
