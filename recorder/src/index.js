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
// KV free plan allows only ~1000 list() calls a day, so the public manifests are NOT listed per request: each is one stored key
// (pub:manifest / pub:pics) that is read with get() and updated whenever a recording or picture is saved or removed.
// Only when the key does not exist yet is it built once from a list (metadata rides on the key).
async function pubMan(kv, name, prefix) { // {id: {path, parts?, alt?, ts, mime}}
  const stored = await kv.get(name, 'json');
  if (stored) return stored;
  const out = {};
  for (const k of await listAll(kv, prefix)) if (k.metadata) out[k.name.slice(2)] = k.metadata;
  await kv.put(name, JSON.stringify(out));
  return out;
}
const manifest = kv => pubMan(kv, 'pub:manifest', 'm:');
const picManifest = kv => pubMan(kv, 'pub:pics', 'j:');
async function setPub(kv, name, prefix, id, md) { // md = metadata to store, or null to remove
  try { const m = await pubMan(kv, name, prefix); if (md) m[id] = md; else delete m[id]; await kv.put(name, JSON.stringify(m)); } catch (e) {}
}

// Everything the page lists is kept in ONE stored key per kind (idx:m recordings, idx:s splits, idx:c requested slots, idx:g regen, idx:j pictures),
// so the page never lists KV or does hundreds of gets per load (that made /api/list fail with a 500 and left the library empty).
// idxdone:<kind> is set by /api/migrate once the old keys were copied in.
async function idxSet(kv, pre, id, obj) {
  const x = (await kv.get('idx:' + pre, 'json')) || {};
  if (obj) x[id] = obj; else delete x[id];
  await kv.put('idx:' + pre, JSON.stringify(x));
}

const cached = async (req, ctx, build) => { // 15 s edge cache so many app loads cost one KV list
  const cache = caches.default, key = new Request(new URL(req.url).origin + new URL(req.url).pathname);
  let r = await cache.match(key);
  if (r) return r;
  r = new Response(JSON.stringify(await build()), { headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=30' } });
  ctx && ctx.waitUntil ? ctx.waitUntil(cache.put(key, r.clone())) : 0;
  return r;
};

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), p = url.pathname, kv = env.REC;
    if (p.startsWith('/pub/')) {
      if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
      if (p === '/pub/manifest') return cached(req, ctx, () => manifest(kv)).catch(e => new Response(JSON.stringify({ error: String(e && e.message || e) }), { status: 503, headers: { ...CORS, 'content-type': 'application/json' } }));
      if (p === '/pub/pics') return cached(req, ctx, () => picManifest(kv)).catch(e => new Response(JSON.stringify({ error: String(e && e.message || e) }), { status: 503, headers: { ...CORS, 'content-type': 'application/json' } }));
      const id = p.split('/')[3];
      if (p.startsWith('/pub/p/') && id && safe(id)) {
        const buf = await kv.get('i:' + id, 'arrayBuffer'), m = await kv.get('j:' + id, 'json');
        if (!buf) return new Response('none', { status: 404, headers: CORS });
        return new Response(buf, { headers: { ...CORS, 'content-type': (m && m.mime) || 'image/png', 'cache-control': url.searchParams.get('v') ? 'public, max-age=31536000, immutable' : 'no-cache' } });
      }
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
    if (kind === 'migrate' && req.method === 'POST') { // one-time copy of old m:/s:/c:/g:/j: keys into idx:<kind>, 60 keys per call: ?pre=c[&cursor=..]; also ?pre=m&ids=a,b,c copies given ids
      const pre = url.searchParams.get('pre'); if (!'mscgj'.includes(pre) || pre.length !== 1) return J({ error: 'pre' }, 400);
      try {
        const x = (await kv.get('idx:' + pre, 'json')) || {};
        const ids = url.searchParams.get('ids');
        if (ids) { for (const i of ids.split(',').filter(safe)) { const v = await kv.get(pre + ':' + i, 'json'); if (v && !x[i]) x[i] = v; } await kv.put('idx:' + pre, JSON.stringify(x)); return J({ ok: true, n: Object.keys(x).length }); }
        const r = await kv.list({ prefix: pre + ':', cursor: url.searchParams.get('cursor') || undefined, limit: 60 });
        const vals = await Promise.all(r.keys.map(k => kv.get(k.name, 'json')));
        r.keys.forEach((k, i) => { const id = k.name.slice(2); if (vals[i] && !x[id]) x[id] = vals[i]; });
        await kv.put('idx:' + pre, JSON.stringify(x));
        if (r.list_complete) await kv.put('idxdone:' + pre, '1');
        return J({ ok: true, n: Object.keys(x).length, done: r.list_complete, cursor: r.list_complete ? null : r.cursor });
      } catch (e) { return J({ error: String(e && e.message || e) }, 500); }
    }
    if (kind === 'migrate-done' && req.method === 'POST') { const pre = url.searchParams.get('pre'); if (!'mscgj'.includes(pre) || pre.length !== 1) return J({ error: 'pre' }, 400); await kv.put('idxdone:' + pre, '1'); return J({ ok: true }); }
    const idxAll = async pre => { if (!(await kv.get('idxdone:' + pre))) throw new Error('not-migrated'); return Object.values((await kv.get('idx:' + pre, 'json')) || {}); };
    if (kind === 'list') {
      try { return J({ rec: await idxAll('m'), splits: await idxAll('s'), custom: await idxAll('c'), regen: await idxAll('g'), pics: await idxAll('j') }); }
      catch (e) { return J({ error: String(e && e.message || e) }, 503); }
    }
    if (kind === 'export') { // everything in the format tools/ar-library/import_recordings.py reads; ?offset=&limit= to take it in pieces (default 40 recordings)
      try {
        const metas = await idxAll('m'), off = +url.searchParams.get('offset') || 0, lim = +url.searchParams.get('limit') || 40, docs = [];
        for (const m of metas.slice(off, off + lim)) { const buf = await kv.get('a:' + m.id, 'arrayBuffer'); if (buf) docs.push({ ...m, b64: b64(buf) }); }
        return J({ audio: docs, splits: await idxAll('s'), total: metas.length, offset: off });
      } catch (e) { return J({ error: String(e && e.message || e) }, 503); }
    }
    if (!id || !safe(id)) return J({ error: 'bad id' }, 400);
    if (kind === 'pic') { // PUT body = the image (meta in ?meta=), PUT with ?meta alias only = point this picture at another one, DELETE = back to the shipped picture
      if (req.method === 'GET') { const buf = await kv.get('i:' + id, 'arrayBuffer'), m = await kv.get('j:' + id, 'json'); return buf ? new Response(buf, { headers: { 'content-type': (m && m.mime) || 'image/png', 'cache-control': 'no-store' } }) : J({ error: 'none' }, 404); }
      if (req.method === 'PUT') {
        const meta = JSON.parse(decodeURIComponent(url.searchParams.get('meta') || '{}')); meta.id = id; meta.ts = Date.now();
        if (meta.alias) { delete meta.mime; await kv.delete('i:' + id); }
        else {
          const buf = await req.arrayBuffer();
          if (buf.byteLength < 100 || buf.byteLength > 6e6) return J({ error: 'size' }, 400);
          meta.size = buf.byteLength; meta.mime = (req.headers.get('content-type') || 'image/png').split(';')[0];
          if (!/^image\//.test(meta.mime)) return J({ error: 'type' }, 400);
          await kv.put('i:' + id, buf);
        }
        const pmd = { path: meta.path, alias: meta.alias, ts: meta.ts, mime: meta.mime }; await kv.put('j:' + id, JSON.stringify(meta), { metadata: pmd }); await idxSet(kv, 'j', id, meta); await setPub(kv, 'pub:pics', 'j:', id, pmd); return J({ ok: true });
      }
      if (req.method === 'DELETE') { await kv.delete('i:' + id); await kv.delete('j:' + id); await idxSet(kv, 'j', id, null); await setPub(kv, 'pub:pics', 'j:', id, null); return J({ ok: true }); }
    }
    if (kind === 'audio') {
      if (req.method === 'GET') { const buf = await kv.get('a:' + id, 'arrayBuffer'), m = await kv.get('m:' + id, 'json'); return buf ? new Response(buf, { headers: { 'content-type': (m && m.mime) || 'audio/webm', 'cache-control': 'no-store' } }) : J({ error: 'none' }, 404); }
      if (req.method === 'PUT') {
        const buf = await req.arrayBuffer();
        if (buf.byteLength < 500 || buf.byteLength > 20e6) return J({ error: 'size' }, 400);
        const meta = JSON.parse(decodeURIComponent(url.searchParams.get('meta') || '{}'));
        meta.id = id; meta.size = buf.byteLength; meta.ts = Date.now(); meta.mime = (req.headers.get('content-type') || 'audio/webm').split(';')[0];
        const amd = { path: meta.path, parts: meta.parts, alt: meta.alt, ts: meta.ts, mime: meta.mime }; await kv.put('a:' + id, buf); await kv.put('m:' + id, JSON.stringify(meta), { metadata: amd }); await idxSet(kv, 'm', id, meta); await setPub(kv, 'pub:manifest', 'm:', id, amd); return J({ ok: true });
      }
      if (req.method === 'DELETE') { await kv.delete('a:' + id); await kv.delete('m:' + id); await idxSet(kv, 'm', id, null); await setPub(kv, 'pub:manifest', 'm:', id, null); return J({ ok: true }); }
    }
    const pre = { split: 's:', custom: 'c:', regen: 'g:' }[kind];
    if (pre) {
      if (req.method === 'PUT') { const o = await req.json(); o.id = id; o.ts = Date.now(); await kv.put(pre + id, JSON.stringify(o)); await idxSet(kv, pre[0], id, o); return J({ ok: true }); }
      if (req.method === 'DELETE') { await kv.delete(pre + id); await idxSet(kv, pre[0], id, null); return J({ ok: true }); }
    }
    return J({ error: 'not found' }, 404);
  }
};
