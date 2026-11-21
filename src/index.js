// EasyStudy server: parent accounts (email code, no password), children + progress, coin wallet, shares, referrals, unlocks,
// admin settings / accounts / stats. Cloudflare Worker + D1 (binding DB). The static app is served by the assets binding;
// only /api/* runs this code (wrangler.jsonc run_worker_first). Design + setup: server/README.md, app/docs/coins-and-admin.md.
//
// Secrets / vars (wrangler secret put ...):  RESEND_API_KEY + MAIL_FROM (send the code email), ADMIN_TOKEN (admin dashboard),
// DEV_CODES="1" only in local dev (the code comes back in the answer instead of an email).


const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const ERR = (code, s = 400, extra) => J({ ok: false, error: code, ...extra }, s);
const now = () => Date.now();
const enc = new TextEncoder();
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const rnd = (n, abc = 'abcdefghijkmnpqrstuvwxyz23456789') => { const b = crypto.getRandomValues(new Uint8Array(n)); return [...b].map(x => abc[x % abc.length]).join(''); };
// the day for daily caps, in Egypt's time
const day = (t = now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
// two columns added later (2026-11-16): subs.note (the rejection message the admin wrote) and parents.notify (the parent turned notices on / off). Added once per Worker start when missing; a database made from schema.sql already has them.
let MIGRATED = false;
async function migrate(env) {
  if (MIGRATED) return; MIGRATED = true;
  for (const q of ["ALTER TABLE subs ADD COLUMN note TEXT NOT NULL DEFAULT ''", "ALTER TABLE parents ADD COLUMN notify INTEGER NOT NULL DEFAULT 1", "ALTER TABLE coin_events ADD COLUMN note TEXT NOT NULL DEFAULT ''", "ALTER TABLE parents ADD COLUMN pending_ref TEXT NOT NULL DEFAULT ''", "ALTER TABLE subs ADD COLUMN inv TEXT NOT NULL DEFAULT ''", "ALTER TABLE children ADD COLUMN sgrant INTEGER NOT NULL DEFAULT 0", "ALTER TABLE subs ADD COLUMN promo TEXT NOT NULL DEFAULT ''",
    // merge of the two dashboards / databases (2026-11-21): columns that only add (the tables whose primary key changes are rebuilt by docs/d1-merge-2026-11-21.sql)
    "ALTER TABLE parents ADD COLUMN bal_w INTEGER NOT NULL DEFAULT 0", "ALTER TABLE children ADD COLUMN progress_w TEXT NOT NULL DEFAULT '{}'", "ALTER TABLE children ADD COLUMN progress_at_w INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE coin_events ADD COLUMN app TEXT NOT NULL DEFAULT 'study'", "ALTER TABLE reports ADD COLUMN app TEXT NOT NULL DEFAULT 'study'", "ALTER TABLE push_subs ADD COLUMN app TEXT NOT NULL DEFAULT 'study'", "ALTER TABLE push_msgs ADD COLUMN app TEXT NOT NULL DEFAULT 'study'",
    "CREATE TABLE IF NOT EXISTS kid_alias (old_id TEXT PRIMARY KEY, child_id TEXT NOT NULL)"]) { try { await env.DB.prepare(q).run(); } catch (e) { /* already there */ } }
}
// ONE shared database for Easy Study (APP_ID 'study') and Easy Words (APP_ID 'words'): parents, children, sessions are shared;
// credits balance, progress, subscriptions, unlocks, promo uses, credit history, reports, push and settings are kept per app.
const appOf = env => env.APP_ID === 'words' ? 'words' : 'study';
const SFX = env => appOf(env) === 'words' ? '_w' : '';     // per-app column of a shared row: bal / bal_w, progress / progress_w, progress_at / progress_at_w
const BAL = env => 'bal' + SFX(env);
const appName = env => appOf(env) === 'words' ? 'Easy Words' : 'EasyStudy';
const forApp = (env, a) => a === 'words' || a === 'study' ? Object.assign(Object.create(Object.getPrototypeOf(env)), env, { APP_ID: a }) : env;   // the dashboard works on either app
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const clip = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
const ITEM = /^(l:[\w-]{1,80}|u:[\w-]{1,40}:\d{1,3})$/;

async function body(req) { try { const t = await req.text(); if (t.length > 200000) return null; return t ? JSON.parse(t) : {}; } catch (e) { return null; } }

/* ---------- settings: D1 copy (saved from the dashboard) wins over the file bundled with the server ---------- */
async function settings(env) {
  const r = await env.DB.prepare('SELECT json FROM settings WHERE key=?').bind(appOf(env) === 'words' ? 'app:words' : 'app').first();
  let s; try { s = r ? JSON.parse(r.json) : null; } catch (e) { s = null; }
  // nothing saved from the dashboard yet = the app's own data/settings.json (served by the assets binding)
  if (!s && env.ASSETS) s = await env.ASSETS.fetch('https://assets/' + (appOf(env) === 'words' ? 'data/words/settings.json' : 'data/settings.json')).then(r => r.ok ? r.json() : null).catch(() => null);
  s = s || { coins: { enabled: false, shares: [] } }; s.coins = s.coins || { shares: [] }; s.coins.referral = s.coins.referral || { on: false, coins: 0 };
  s.access = s.access || {}; s.items = s.items || {}; return s;
}

/* ---------- auth ---------- */
async function who(req, env) {
  const h = req.headers.get('authorization') || ''; const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok || tok.length > 100) return null;
  const hs = await sha('s:' + tok);
  const p = await env.DB.prepare('SELECT p.* FROM sessions s JOIN parents p ON p.id=s.parent_id WHERE s.hash=?').bind(hs).first();
  if (!p) return null;
  const t = now();
  if (t - p.last_seen > 3600e3) await env.DB.batch([env.DB.prepare('UPDATE sessions SET last_seen=? WHERE hash=?').bind(t, hs), env.DB.prepare('UPDATE parents SET last_seen=? WHERE id=?').bind(t, p.id)]);
  p.session = hs; return p;
}

async function sendCode(env, email, code, name) {
  const replyTo = ((await settings(env).catch(() => ({}))).adminEmail || '').trim();   // dashboard "إيميل الإدارة"
  if (env.DEV_CODES === '1') return { dev: code };
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) throw new Error('mail-not-set');
  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:18px;color:#333">
    <p>أهلًا ${name ? escapeHtml(name) : ''}،</p><p>كود الدخول لتطبيق ${appName(env)}:</p>
    <p style="font-size:34px;font-weight:bold;letter-spacing:8px;direction:ltr;text-align:center">${code}</p>
    <p style="color:#777;font-size:14px">الكود صالح لمدة ١٥ دقيقة. لو ما طلبتش الكود ده تجاهل الرسالة.</p></div>`;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [email], ...(replyTo ? { reply_to: replyTo } : {}), subject: `كود الدخول ${code} - ${appName(env)}`, html, text: `كود الدخول لتطبيق ${appName(env)}: ${code} (صالح ١٥ دقيقة)` }) });
  if (!r.ok) throw new Error('mail-failed ' + r.status);
  return {};
}
const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const phoneDigits = v => { const d = String(v || '').replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).replace(/\D/g, ''); return d.length >= 8 ? d : ''; };
// POST /api/auth/start {email?, phone?, name?} -> a 6-digit code to the email. Limits: 1 a minute, 6 a day per email, 30 a day per IP.
async function authStart(req, env, ip) {
  const b = await body(req); if (!b) return ERR('bad-body');
  let email = clip(b.email, 254).toLowerCase(), viaPhone = false;
  // login by mobile alone (or an email that is not stored): a known mobile sends the code to the email stored on that account
  const ph = phoneDigits(b.phone);
  if (ph && !(email && await env.DB.prepare('SELECT 1 FROM parents WHERE email=?').bind(email).first())) {
    const q = await env.DB.prepare("SELECT email FROM parents WHERE phone!='' AND substr(replace(replace(replace(replace(phone,' ',''),'+',''),'-',''),'(',''),-9)=? AND email NOT LIKE '%@phone.local' ORDER BY created LIMIT 1").bind(ph.slice(-9)).first();
    if (q) { email = q.email; viaPhone = true; }
  }
  if (!EMAIL.test(email)) return ERR('bad-email');
  const t = now(), d = day(t), old = await env.DB.prepare('SELECT * FROM codes WHERE email=?').bind(email).first();
  if (old && t - old.sent < 60e3) return ERR('wait', 429, { wait: Math.ceil((60e3 - (t - old.sent)) / 1000) });
  const sendsToday = old && old.day === d ? old.sends_today + 1 : 1;
  if (sendsToday > 6) return ERR('too-many', 429);
  const lim = ip ? await env.DB.prepare('SELECT n FROM limits WHERE key=?').bind('code:' + ip + ':' + d).first() : null;
  if (lim && lim.n >= 30) return ERR('too-many', 429);
  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  const out = await sendCode(env, email, code, clip(b.name, 60)).catch(e => ({ fail: String(e.message || e) }));
  if (out.fail) return ERR(out.fail === 'mail-not-set' ? 'mail-not-set' : 'mail-failed', 503);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO codes(email,hash,expires,tries,sent,sends_today,day) VALUES(?,?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET hash=excluded.hash,expires=excluded.expires,tries=0,sent=excluded.sent,sends_today=excluded.sends_today,day=excluded.day')
      .bind(email, await sha('c:' + email + ':' + code), t + 15 * 60e3, 0, t, sendsToday, d),
    env.DB.prepare('INSERT INTO limits(key,n,day) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1').bind('code:' + ip + ':' + d, d)]);
  const known = !!(await env.DB.prepare('SELECT 1 FROM parents WHERE email=?').bind(email).first());
  return J({ ok: true, known, ...(viaPhone ? { email } : {}), ...(out.dev ? { devCode: out.dev } : {}) });
}

// POST /api/auth/verify {email, code, name, phone, curr, ref, device} -> {token, me}. A new email = a new parent (gift coins,
// and the sharer of the ref link gets the referral coins when this device is new and the sharer is not the same person).
async function authVerify(req, env, ip) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const email = clip(b.email, 254).toLowerCase(), code = clip(b.code, 6).replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)), device = clip(b.device, 40);
  const t = now(), c = await env.DB.prepare('SELECT * FROM codes WHERE email=?').bind(email).first();
  if (!c || c.expires < t) return ERR('code-expired');
  if (c.tries >= 5) return ERR('too-many', 429);
  if (await sha('c:' + email + ':' + code) !== c.hash) { await env.DB.prepare('UPDATE codes SET tries=tries+1 WHERE email=?').bind(email).run(); return ERR('code-wrong', 400, { left: 4 - c.tries }); }
  await env.DB.prepare('DELETE FROM codes WHERE email=?').bind(email).run();
  return await enterParent(env, b, ip, email, device);
}
// POST /api/auth/login {email?, phone?, name?, curr, ref, device} -> {token, isNew, me}. For now (Ahmed 2026-11-15) NO confirmation: a stored email or
// mobile signs straight in to that account, and an unknown one registers a new parent. The code flow above stays for later.
async function authLogin(req, env, ip) {
  const b = await body(req); if (!b) return ERR('bad-body');
  let email = clip(b.email, 254).toLowerCase(); const ph = phoneDigits(b.phone), device = clip(b.device, 40);
  if (!email && !ph) return ERR('bad-email'); if (email && !EMAIL.test(email)) return ERR('bad-email');
  const d = day(now()), lk = 'login:' + ip + ':' + d, lim = ip ? await env.DB.prepare('SELECT n FROM limits WHERE key=?').bind(lk).first() : null;
  if (lim && lim.n >= 120) return ERR('too-many', 429);
  if (ip) await env.DB.prepare('INSERT INTO limits(key,n,day) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1').bind(lk, d).run();
  let q = email ? await env.DB.prepare('SELECT email FROM parents WHERE email=?').bind(email).first() : null;
  if (!q && ph) q = await env.DB.prepare("SELECT email FROM parents WHERE phone!='' AND substr(replace(replace(replace(replace(phone,' ',''),'+',''),'-',''),'(',''),-9)=? ORDER BY created LIMIT 1").bind(ph.slice(-9)).first();
  // Ahmed 2026-11-20: a NEW parent is not stored when the contact is typed; the app asks {check:1} first (nothing is created), then registers
  // parent + first student in ONE call ({kid:{id,name,grade,curr}}) once the student, curriculum and "هيا نبدأ" are done.
  if (b.check) return J({ ok: true, exists: !!q, blocked: !!(q && (await env.DB.prepare('SELECT blocked FROM parents WHERE email=?').bind(q.email).first() || {}).blocked) });
  if (q && b.kid && b.register) return ERR('exists', 409);
  if (!q && !b.kid) return ERR('not-found', 404);
  let kid = null;
  if (!q) { const k = b.kid || {}, name = clip(k.name, 40);
    if (!/^k[\w]{2,30}$/.test(String(k.id || '')) || !name) return ERR('bad-name');
    kid = { id: k.id, name, grade: clip(k.grade, 10) || 'p1', curr: JSON.stringify((({ grant, ...c }) => c)(k.curr || {})) }; }
  email = q ? q.email : (email || ph + '@phone.local');
  return await enterParent(env, b, ip, email, device, kid);
}
// a parent identified by email (known = sign in, unknown = register): the session, and the contact the account lacked
async function enterParent(env, b, ip, email, device, kid) {
  const t = now();
  let p = await env.DB.prepare('SELECT * FROM parents WHERE email=?').bind(email).first(), isNew = false;
  if (p && p.blocked) return ERR('blocked', 403);
  const S = await settings(env), C = S.coins, d = day(t), stmts = [];
  if (!p) {
    isNew = true;
    const id = 'p_' + rnd(14); let ref = null;
    const sharer = b.ref ? await env.DB.prepare('SELECT id, blocked FROM parents WHERE ref_code=? OR id=?').bind(clip(b.ref, 24), clip(b.ref, 24)).first() : null;
    if (sharer && !sharer.blocked) ref = sharer.id;
    p = { id, email, name: clip(b.name, 60), phone: clip(b.phone, 20), curr: JSON.stringify(b.curr || {}), ref_code: rnd(7), ref_by: null, bal: 0, blocked: 0, created: t, last_seen: t };
    const gift = Math.max(0, +C.startCoins || 0);
    p.bal = gift;
    stmts.push(env.DB.prepare(`INSERT INTO parents(id,email,name,phone,curr,ref_code,ref_by,${BAL(env)},blocked,created,last_seen) VALUES(?,?,?,?,?,?,?,?,0,?,?)`)
      .bind(p.id, p.email, p.name, p.phone, p.curr, p.ref_code, p.ref_by, p.bal, t, t));
    if (kid) stmts.push(env.DB.prepare('INSERT INTO children(id,parent_id,name,grade,curr,created) VALUES(?,?,?,?,?,?)').bind(kid.id, p.id, kid.name, kid.grade, kid.curr, t));
    if (gift) stmts.push(ev(env, p.id, 'gift', '', '', gift, t, device, ip));
    // referral: the sharer earns when a NEW parent registers from the link on a device never seen before (max per day = referral.maxPerDay)
    const R = C.referral || {}, rc = Math.max(0, +R.coins || 0);
    if (ref && R.on !== false && rc) {
      const seen = (device ? await env.DB.prepare('SELECT 1 FROM devices WHERE id=?').bind(device).first() : true)
        || (p.phone && await env.DB.prepare('SELECT 1 FROM parents WHERE phone=?').bind(p.phone).first());
      const todays = await env.DB.prepare("SELECT COUNT(*) n FROM coin_events WHERE parent_id=? AND kind='referral' AND day=? AND app=?").bind(ref, d, appOf(env)).first();
      if (!seen && (todays.n < (R.maxPerDay != null ? +R.maxPerDay : 10))) {
        stmts.push(ev(env, ref, 'referral', p.id, '', rc, t, device, ip, clip((p.name || '').split(/\s+/)[0], 40)), env.DB.prepare(`UPDATE parents SET ${BAL(env)}=${BAL(env)}+? WHERE id=?`).bind(rc, ref));
      }
    }
  } else if (b.ref) {   // a known parent opens a link again: a fresh one-off pending referral (no lasting tie; consumed by the next credited action)
    const sh = await env.DB.prepare('SELECT id, blocked FROM parents WHERE ref_code=? OR id=?').bind(clip(b.ref, 24), clip(b.ref, 24)).first();
    if (sh && !sh.blocked && sh.id !== p.id) stmts.push(env.DB.prepare('UPDATE parents SET pending_ref=? WHERE id=?').bind(sh.id, p.id));
    if (b.name || b.phone) { if (!p.name && b.name) stmts.push(env.DB.prepare('UPDATE parents SET name=? WHERE id=?').bind(clip(b.name, 60), p.id));
      if (!p.phone && b.phone) stmts.push(env.DB.prepare('UPDATE parents SET phone=? WHERE id=?').bind(clip(b.phone, 20), p.id)); }
  } else if (b.name || b.phone) {   // a known parent signing in again: keep the stored name unless it was empty
    if (!p.name && b.name) stmts.push(env.DB.prepare('UPDATE parents SET name=? WHERE id=?').bind(clip(b.name, 60), p.id));
    if (!p.phone && b.phone) stmts.push(env.DB.prepare('UPDATE parents SET phone=? WHERE id=?').bind(clip(b.phone, 20), p.id));
  }
  if (!isNew) {   // a parent who already has the other app's account: the sign-up gift of this app, once (no credit history and no balance in this app yet)
    const gift = Math.max(0, +C.startCoins || 0), seen = new Set((await env.DB.prepare('SELECT DISTINCT app FROM coin_events WHERE parent_id=?').bind(p.id).all()).results.map(x => x.app));
    if (gift && seen.size && !seen.has(appOf(env)) && !(+p[BAL(env)] > 0))   // only a parent already known in the OTHER app (nothing changes for anyone else)
      stmts.push(ev(env, p.id, 'gift', '', '', gift, t, device, ip), env.DB.prepare(`UPDATE parents SET ${BAL(env)}=${BAL(env)}+? WHERE id=?`).bind(gift, p.id));
  }
  { const be = clip(b.email, 254).toLowerCase();   // a mobile-only account that now gives an email: keep it on the account (if no other account has it)
    if (p && /@phone\.local$/.test(p.email) && be && EMAIL.test(be) && !(await env.DB.prepare('SELECT 1 FROM parents WHERE email=?').bind(be).first()))
      stmts.push(env.DB.prepare('UPDATE parents SET email=? WHERE id=?').bind(be, p.id)); }
  if (device) stmts.push(env.DB.prepare('INSERT OR IGNORE INTO devices(id,first_parent,created) VALUES(?,?,?)').bind(device, p.id, t));
  const tok = rnd(40, 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789');
  stmts.push(env.DB.prepare('INSERT INTO sessions(hash,parent_id,device,created,last_seen) VALUES(?,?,?,?,?)').bind(await sha('s:' + tok), p.id, device, t, t));
  await env.DB.batch(stmts);
  return J({ ok: true, token: tok, isNew, me: await me(env, p.id) });
}
const ev = (env, pid, kind, ref, child, amount, t, device, ip, note) =>
  env.DB.prepare('INSERT INTO coin_events(parent_id,kind,ref,child_id,amount,at,day,device,ip,note,app) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(pid, kind, ref || '', child || '', amount, t, day(t), device || '', ip || '', note || '', appOf(env));

/* ---------- the parent's whole state (the app keeps a copy for offline) ---------- */
async function me(env, pid) {
  const [p, kids, un, w] = await Promise.all([
    env.DB.prepare('SELECT id,email,name,phone,curr,ref_code,notify FROM parents WHERE id=?').bind(pid).first(),
    env.DB.prepare(`SELECT id,name,grade,curr,progress${SFX(env)} AS progress,progress_at${SFX(env)} AS progress_at,created,sgrant FROM children WHERE parent_id=? AND deleted=0 ORDER BY created`).bind(pid).all(),
    env.DB.prepare('SELECT u.child_id,u.item,u.how,u.at FROM unlocks u JOIN children c ON c.id=u.child_id WHERE c.parent_id=? AND u.app=?').bind(pid, appOf(env)).all(),
    walletOf(env, pid, '')]);
  const pj = s => { try { return JSON.parse(s); } catch (e) { return {}; } };
  const cut = seasonStart(now());   // everything opened / learned before the last 31 Aug has ended (Ahmed: progress not kept)
  const pc = await env.DB.prepare('SELECT created FROM parents WHERE id=?').bind(pid).first();
  return { id: p.id, email: /@phone\.local$/.test(p.email) ? '' : p.email, name: p.name, phone: p.phone, notify: p.notify !== 0, curr: pj(p.curr), ref: p.ref_code, created: new Date(pc.created).toISOString(), wallet: w.wallet,
    kids: kids.results.map(k => ({ id: k.id, name: k.name, grade: k.grade, curr: k.sgrant ? { ...pj(k.curr), grant: 1 } : pj(k.curr), created: new Date(k.created).toISOString(), progress: k.progress_at >= cut ? pj(k.progress) : {}, progressAt: k.progress_at >= cut ? k.progress_at : 0,
      unlocked: un.results.filter(u => u.child_id === k.id && u.at >= cut && (u.how === 'coins' || u.how === 'promo')).map(u => u.item), freeused: un.results.filter(u => u.child_id === k.id && u.at >= cut && u.how === 'free').map(u => u.item) })) };
}

/* ---------- children ---------- */
// PUT /api/kids/<id> {name, grade, curr}  (create or rename; the id is made on the device)
async function kidPut(req, env, p, id) {
  if (!/^k[\w]{2,30}$/.test(id)) return ERR('bad-id');
  const b = await body(req); if (!b) return ERR('bad-body');
  const k = await env.DB.prepare('SELECT parent_id FROM children WHERE id=?').bind(id).first();
  if (k && k.parent_id !== p.id) return ERR('not-yours', 403);
  if (!k) { const n = await env.DB.prepare('SELECT COUNT(*) n FROM children WHERE parent_id=? AND deleted=0').bind(p.id).first(); if (n.n >= 10) return ERR('too-many-kids'); }
  const name = clip(b.name, 40); if (!name) return ERR('bad-name');
  await env.DB.prepare('INSERT INTO children(id,parent_id,name,grade,curr,created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,grade=excluded.grade,curr=excluded.curr,deleted=0')
    .bind(id, p.id, name, clip(b.grade, 10) || 'p1', JSON.stringify((({ grant, ...c }) => c)(b.curr || {})), now()).run();
  return J({ ok: true });
}
// PUT /api/kids/<id>/progress {progress:{key: string}, at} : newest copy wins (at = when the device saved it)
const PROG_KEYS = ['zoom-stars', 'zoom-opened', 'zoom-last', 'zoom-vocab'];
async function kidProgress(req, env, p, id) {
  const b = await body(req); if (!b || typeof b.progress !== 'object') return ERR('bad-body');
  const k = await env.DB.prepare(`SELECT parent_id, progress_at${SFX(env)} AS progress_at FROM children WHERE id=?`).bind(id).first();
  if (!k || k.parent_id !== p.id) return ERR('not-yours', 403);
  const at = Math.min(+b.at || now(), now()); if (at <= k.progress_at) return J({ ok: true, older: true });
  const keep = {}; PROG_KEYS.forEach(x => { if (typeof b.progress[x] === 'string') keep[x] = b.progress[x].slice(0, 60000); });
  await env.DB.prepare(`UPDATE children SET progress${SFX(env)}=?, progress_at${SFX(env)}=? WHERE id=?`).bind(JSON.stringify(keep), at, id).run();
  return J({ ok: true });
}

/* ---------- coins (client contract: app/docs/coins-and-admin.md §5; every answer = {wallet, unlocked, freeused} of the child) ---------- */
async function walletOf(env, pid, child) {
  const [p, hist, un] = await Promise.all([
    env.DB.prepare(`SELECT ${BAL(env)} AS bal FROM parents WHERE id=?`).bind(pid).first(),
    env.DB.prepare('SELECT kind,ref,child_id,amount,at,note FROM coin_events WHERE parent_id=? AND app=? ORDER BY at DESC LIMIT 200').bind(pid, appOf(env)).all(),
    child ? env.DB.prepare('SELECT u.item,u.how FROM unlocks u JOIN children c ON c.id=u.child_id WHERE u.child_id=? AND c.parent_id=? AND u.app=?').bind(child, pid, appOf(env)).all() : { results: [] }]);
  const last = {}, H = hist.results.slice().reverse();
  H.forEach(h => { if (h.kind === 'share') last[h.ref] = h.at; });
  return { wallet: { bal: p ? p.bal : 0, last, hist: H.map(h => ({ k: h.kind, n: h.amount, at: h.at, ...(h.kind === 'share' ? { t: h.ref } : h.ref && h.kind !== 'refsub' ? { id: h.ref } : {}), ...(h.kind === 'refsub' || h.kind === 'referral' ? { who: h.note || '' } : {}), ...(h.child_id ? { child: h.child_id } : {}) })) },
    ...(child ? { unlocked: un.results.filter(u => u.how === 'coins' || u.how === 'promo').map(u => u.item), freeused: un.results.filter(u => u.how === 'free').map(u => u.item) } : {}) };
}
// a student that was the same child in both apps got ONE id when the databases were merged; a device that still holds the other id is pointed to it
const kidId = async (env, id) => { if (!id) return id; try { const a = await env.DB.prepare('SELECT child_id FROM kid_alias WHERE old_id=?').bind(id).first(); return a ? a.child_id : id; } catch (e) { return id; } };
const childOk = async (env, p, child) => { const k = child && await env.DB.prepare('SELECT parent_id FROM children WHERE id=? AND deleted=0').bind(child).first(); return !!k && k.parent_id === p.id; };
// the subject of an item id: u:<subject>:<unit>, l:<subject>-<folder> (subject ids can hold "-", folders never do)
const subjectOf = item => item[0] === 'u' ? item.split(':')[1] : item.slice(2, item.lastIndexOf('-'));

// POST /api/share {type, device}: pays the share type's coins once per cooldownH, at most dailyCap a day per parent
// (and 3 x dailyCap a day per IP, so one person with many accounts can't farm).
async function share(req, env, p, ip, child) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const S = await settings(env), C = S.coins, t = now(), d = day(t);
  // the app sends no share type any more (4 app buttons, one price = coins.shareCoins, default 1, at most dailyCap shares a day): no type = the general share
  const T = (C.shares || []).find(x => x.id === b.type && x.on) || (b.type ? null : { id: 'share', coins: C.shareCoins != null ? +C.shareCoins : 1, cooldownH: 0 });
  let pay = 0;
  if (C.enabled && T) {
    const last = await env.DB.prepare("SELECT MAX(at) at FROM coin_events WHERE parent_id=? AND kind='share' AND ref=? AND app=?").bind(p.id, T.id, appOf(env)).first();
    if (!(last && last.at && t - last.at < (+T.cooldownH || 0) * 3600e3)) {
      const cap = C.dailyCap != null ? +C.dailyCap * (T.id === 'share' ? Math.max(1, +T.coins || 1) : 1) : 1e9;
      const got = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) n FROM coin_events WHERE parent_id=? AND kind='share' AND day=? AND app=?").bind(p.id, d, appOf(env)).first();
      const byIp = ip ? await env.DB.prepare("SELECT COALESCE(SUM(amount),0) n FROM coin_events WHERE ip=? AND kind='share' AND day=? AND app=?").bind(ip, d, appOf(env)).first() : { n: 0 };
      pay = Math.max(0, Math.min(+T.coins || 0, cap - got.n, cap * 3 - byIp.n));
    }
  }
  if (pay) await env.DB.batch([ev(env, p.id, 'share', T.id, '', pay, t, clip(b.device, 40), ip), env.DB.prepare(`UPDATE parents SET ${BAL(env)}=${BAL(env)}+? WHERE id=?`).bind(pay, p.id)]);
  return J({ ok: true, paid: pay, ...(await walletOf(env, p.id, child)) });
}
// the price of an item: the admin's own price, else lessonCost / unitCost (never the app's price)
const priceOf = (S, item) => { const it = S.items[item] || {}; return it.coins != null ? +it.coins : item[0] === 'u' ? +S.coins.unitCost || 0 : +S.coins.lessonCost || 0; };
async function itemCheck(req, env, p) {
  const b = await body(req); if (!b) return { e: ERR('bad-body') };
  const item = clip(b.id, 90), child = await kidId(env, clip(b.child, 32));
  if (!ITEM.test(item) || (item[0] === 'l' && item.lastIndexOf('-') < 3)) return { e: ERR('bad-item') };
  if (!(await childOk(env, p, child))) return { e: ERR('not-yours', 403) };
  const S = await settings(env);
  if (!S.coins.enabled) return { e: ERR('coins-off', 409) };
  if ((S.items[item] || {}).st === 'soon') return { e: ERR('soon', 409) };
  return { b, item, child, S, subject: subjectOf(item) };
}
// POST /api/unlock {child, id, kind}: spend the price; refused (402) when the balance is too low
async function unlock(req, env, p, ip) {
  const x = await itemCheck(req, env, p); if (x.e) return x.e;
  const { item, child, S, subject } = x, t = now();
  if (!(await env.DB.prepare('SELECT 1 FROM unlocks WHERE child_id=? AND item=? AND app=?').bind(child, item, appOf(env)).first())) {
    const cost = priceOf(S, item); if (!(cost > 0)) return ERR('no-price', 409);
    // the UPDATE itself checks the balance, so two taps at once can't spend twice
    const r = await env.DB.prepare(`UPDATE parents SET ${BAL(env)}=${BAL(env)}-? WHERE id=? AND ${BAL(env)}>=?`).bind(cost, p.id, cost).run();
    if (!r.meta.changes) return ERR('not-enough', 402, await walletOf(env, p.id, child));
    await env.DB.batch([ev(env, p.id, item[0] === 'u' ? 'unlock-unit' : 'unlock-lesson', item, child, -cost, t, '', ip),
      env.DB.prepare("INSERT OR IGNORE INTO unlocks(child_id,item,subject,how,coins,at,app) VALUES(?,?,?,'coins',?,?,?)").bind(child, item, subject, cost, t, appOf(env))]);
  }
  return J({ ok: true, ...(await walletOf(env, p.id, child)) });
}
// POST /api/pick {child, id}: a free pick while access.free (mode pick / pickUnit, count, perSubject) leaves one
async function pick(req, env, p) {
  const x = await itemCheck(req, env, p); if (x.e) return x.e;
  const { item, child, S, subject } = x;
  if (!(await env.DB.prepare('SELECT 1 FROM unlocks WHERE child_id=? AND item=? AND app=?').bind(child, item, appOf(env)).first())) {
    const F = (S.access && S.access.free) || {}, want = item[0] === 'u' ? 'pickUnit' : 'pick';
    if (F.mode !== want) return ERR('no-free', 409);
    const used = await env.DB.prepare("SELECT COUNT(*) n FROM unlocks WHERE child_id=? AND how='free' AND app=?" + (F.perSubject ? ' AND subject=?' : '')).bind(...(F.perSubject ? [child, appOf(env), subject] : [child, appOf(env)])).first();
    if (used.n >= (+F.count || 0)) return ERR('no-free-left', 409, await walletOf(env, p.id, child));
    await env.DB.prepare("INSERT INTO unlocks(child_id,item,subject,how,coins,at,app) VALUES(?,?,?,'free',0,?,?)").bind(child, item, subject, now(), appOf(env)).run();
  }
  return J({ ok: true, ...(await walletOf(env, p.id, child)) });
}


/* ---------- TERM SUBSCRIPTIONS (Ahmed 2026-11-11, docs/subscriptions-spec.md) ----------
   Parent: GET /api/subs -> {subs:[{child,term,st,at,trial,until,price,ref}]}; POST /api/subs {child, term:'p1:t1', ref, receipt:'data:image/jpeg;base64,...'}
     -> {ok, at, trial, until}. The price is read from settings.subs.prices[term] here (never from the app). The FIRST upload per child+term opens it for 24 h
     (trial); a re-upload after a rejection / closing has no 24 h. 'active' or a pending one that is still waiting = refused.
   Admin: GET /api/admin/subs?st=pending|all (no receipts); GET /api/admin/sub/<child>/<term>/receipt -> {receipt}; POST /api/admin/sub {child, term, action: activate|reject|close}
     activate / reject / close work on an existing row; POST /api/admin/sub/grant {child, term} opens it with no receipt (creates the row).
   Everything ends 31 August (subEnd, Cairo time); a row past 'until' counts as closed for the app. */
const TERM = /^[\w-]{1,12}:t[12]$/;
// the last 31 Aug at or before t (the start of the current season)
function seasonStart(t = now()) { const y = +day(t).slice(0, 4), e = Date.parse(y + '-08-31T23:59:59+03:00'); return t > e ? e : Date.parse((y - 1) + '-08-31T23:59:59+03:00'); }
function subEnd(t = now()) { const y = +day(t).slice(0, 4), e = Date.parse(y + '-08-31T23:59:59+03:00'); return t > e ? Date.parse((y + 1) + '-08-31T23:59:59+03:00') : e; }
const subPub = r => ({ child: r.child_id, term: r.term, st: r.until <= now() && r.st !== 'rejected' ? 'closed' : r.st, at: r.at, trial: r.trial, until: r.until, price: r.price, ref: r.ref, note: r.note || '', dec: r.decided || 0, by: r.by || '' });
async function subsList(env, p) {
  const rows = (await env.DB.prepare('SELECT child_id,term,st,price,ref,at,trial,until,note,decided,by FROM subs WHERE parent_id=? AND app=?').bind(p.id, appOf(env)).all()).results;
  return J({ ok: true, subs: rows.map(subPub) });
}
async function subsIn(req, env, p) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const child = await kidId(env, clip(b.child, 32)), term = clip(b.term, 20), ref = clip(b.ref, 40), rc = String(b.receipt || '');
  if (!child || !(await childOk(env, p, child)) || !TERM.test(term)) return ERR('bad-body');
  const S = await settings(env);
  // a 100 % discount code: the price is 0, so there is no payment and no receipt; the term opens at once (to 31 Aug)
  const P100 = b.promo ? (S.promoOn === false ? null : (S.promos || []).find(x => promoNorm(x.code) === promoNorm(clip(b.promo, 40)))) : null, free = !!(P100 && P100.what === 'percent' && +P100.pct >= 100);
  if (!free) {
    if (!ref) return ERR('bad-body');
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(rc)) return ERR('bad-receipt');
    if (rc.length > 220000) return ERR('big');
  }
  if (!(S.subs && S.subs.on)) return ERR('off');
  const pr = (S.subs.prices || {})[term] || {}, fin0 = pr.discOn && +pr.disc > 0 ? +pr.disc : (+pr.price || 0); if (!fin0) return ERR('no-price');
  let fin = fin0;
  const old = await env.DB.prepare('SELECT st,until,trial FROM subs WHERE child_id=? AND term=? AND app=?').bind(child, term, appOf(env)).first(), t = now();
  if (old && old.until > t && old.st === 'active') return ERR('already', 409);
  if (old && old.until > t && old.st === 'pending' && old.trial <= t) return ERR('pending', 409);   // waiting for the admin (the 24 h is over)
  // a percent promo code (b.promo): checked again here (never trusted from the app), the price drops by its percent, and the use is counted now
  if (b.promo) {
    const c = promoNorm(clip(b.promo, 40)), P = S.promoOn === false ? null : (S.promos || []).find(x => promoNorm(x.code) === c);
    if (!P || P.what !== 'percent') return ERR('bad', 409);
    const pe = await promoProblem(env, S, P, c, child); if (pe) return ERR(pe, 409);
    fin = free ? 0 : Math.max(1, Math.round(fin0 * (100 - +P.pct) / 100));
    const u = await env.DB.prepare("INSERT OR IGNORE INTO promo_uses(code,parent_id,child_id,item,at,app) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM promo_uses WHERE code=? AND app=?) < ?")
      .bind(c, p.id, child, 'pct:' + term, t, appOf(env), c, appOf(env), promoCap(P)).run();
    if (!u.meta.changes) return ERR(P.uses === 'many' ? 'full' : 'used', 409);
  }
  if (free) {
    await env.DB.prepare(`INSERT INTO subs(child_id,term,parent_id,st,price,ref,receipt,at,trial,until,decided,by,promo,app) VALUES(?,?,?,'active',0,?,'',?,0,?,?,'promo',?,?)
      ON CONFLICT(app,child_id,term) DO UPDATE SET st='active',price=0,ref=excluded.ref,receipt='',at=excluded.at,trial=0,until=excluded.until,decided=excluded.decided,by='promo',promo=excluded.promo`)
      .bind(child, term, p.id, 'code:' + promoNorm(clip(b.promo, 40)), t, subEnd(t), t, promoNorm(clip(b.promo, 40)), appOf(env)).run();
    return J({ ok: true, at: t, trial: 0, until: subEnd(t), active: true });
  }
  const trial = old ? (old.until > t && old.st === 'pending' ? old.trial : 0) : t + 864e5, until = subEnd(t);   // 24 h only the first time ever for this child + term
  await env.DB.prepare(`INSERT INTO subs(child_id,term,parent_id,st,price,ref,receipt,at,trial,until,promo,app) VALUES(?,?,?,'pending',?,?,?,?,?,?,?,?)
    ON CONFLICT(app,child_id,term) DO UPDATE SET st='pending',price=excluded.price,ref=excluded.ref,receipt=excluded.receipt,at=excluded.at,trial=excluded.trial,until=excluded.until,decided=0,by='',promo=excluded.promo`)
    .bind(child, term, p.id, fin, ref, rc, t, trial, until, b.promo ? promoNorm(clip(b.promo, 40)) : '', appOf(env)).run();
  try { await Promise.allSettled([waNotifySub(env, S, child, term, fin, ref, p.id), mailNotifySub(env, S, child, term, fin, ref, p.id)]); } catch (e) { /* the notices never block the subscription */ }
  return J({ ok: true, at: t, trial, until });
}
// "new subscription needs activation" to the admin WhatsApp number (settings "whatsapp"), sent by the server through the WhatsApp Business Cloud API.
// Needs the Worker secrets WA_TOKEN + WA_PHONE_ID (Meta); WA_TEMPLATE (an approved template whose body has 5 variables: student, term, price, ref, contact; WA_LANG default ar)
// is needed to reach the admin outside WhatsApp's 24 h window, without it a plain text is sent. No secrets = silently nothing.
async function waNotifySub(env, S, child, term, fin, ref, parentId) {
  if (!env.WA_TOKEN || !env.WA_PHONE_ID) return;
  const to = String(S.whatsapp || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, ''); if (!to) return;
  const c = await env.DB.prepare('SELECT c.name,p.email,p.phone FROM children c JOIN parents p ON p.id=? WHERE c.id=?').bind(parentId, child).first() || {};
  const contact = [c.email && !/@phone\.local$/.test(c.email) ? c.email : '', c.phone].filter(Boolean).join(' / ') || '-';
  const vals = [c.name || '-', term, String(fin), ref, contact];
  const msg = env.WA_TEMPLATE
    ? { type: 'template', template: { name: env.WA_TEMPLATE, language: { code: env.WA_LANG || 'ar' }, components: [{ type: 'body', parameters: vals.map(text => ({ type: 'text', text })) }] } }
    : { type: 'text', text: { body: 'اشتراك جديد محتاج التفعيل - easy study\nالطالب: ' + vals[0] + '\nالترم: ' + term + '\nالمبلغ: ' + fin + ' جنيه\nرقم العملية: ' + ref + '\nولي الأمر: ' + contact } };
  await fetch('https://graph.facebook.com/v21.0/' + env.WA_PHONE_ID + '/messages', { method: 'POST', headers: { authorization: 'Bearer ' + env.WA_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, ...msg }), signal: AbortSignal.timeout(5000) });
}
// The same notice by email to the dashboard "إيميل الإدارة" (settings adminEmail; Worker variable ADMIN_EMAIL as a fallback) through Resend (RESEND_API_KEY). Without a verified domain Resend only sends FROM onboarding@resend.dev
// TO the email of the Resend account owner, which is enough for this notice (MAIL_FROM is used when set). No ADMIN_EMAIL / key = nothing.
async function mailNotifySub(env, S, child, term, fin, ref, parentId) {
  const to = String(S.adminEmail || env.ADMIN_EMAIL || '').trim();   // dashboard "إيميل الإدارة" first
  if (!env.RESEND_API_KEY || !to) return;
  const c = await env.DB.prepare('SELECT c.name,p.email,p.phone FROM children c JOIN parents p ON p.id=? WHERE c.id=?').bind(parentId, child).first() || {};
  const contact = [c.email && !/@phone\.local$/.test(c.email) ? c.email : '', c.phone].filter(Boolean).join(' / ') || '-';
  const rows = [['الطالب', c.name || '-'], ['الترم', term], ['المبلغ', fin + ' جنيه'], ['رقم العملية', ref], ['ولي الأمر', contact]];
  const html = '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:17px;color:#333"><p><b>اشتراك جديد محتاج التفعيل</b></p>' + rows.map(r => '<p>' + r[0] + ': ' + escapeHtml(r[1]) + '</p>').join('') + '<p>الإيصال في لوحة التحكم (المستخدمين).</p></div>';
  await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM || `${appName(env)} <onboarding@resend.dev>`, to: [to], subject: 'اشتراك جديد محتاج التفعيل - ' + (c.name || ''), html }), signal: AbortSignal.timeout(5000) });
}
// The rejection message by email to the address the parent registered with (only when they keep notices on). The in-app notice is the same text in subs.note.
async function mailRejectSub(env, child, term, note) {
  if (!env.RESEND_API_KEY) return false;
  const c = await env.DB.prepare('SELECT c.name,p.email,p.notify FROM children c JOIN parents p ON p.id=c.parent_id WHERE c.id=?').bind(child).first();
  if (!c || c.notify === 0 || !c.email || /@phone\.local$/.test(c.email)) return false;
  const html = '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:17px;color:#333"><p><b>اشتراك ' + escapeHtml(c.name || '') + ' ما اتفعلش</b></p><p>' + escapeHtml(note || 'مقدرناش نتأكد من الدفع. ابعت صورة الإيصال تاني.').replace(/\n/g, '<br>') + '</p></div>';
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM || `${appName(env)} <onboarding@resend.dev>`, to: [c.email], subject: 'اشتراكك ما اتفعلش - ' + (appName(env)), html }), signal: AbortSignal.timeout(5000) });
  return r.ok;
}
async function adminSubs(env, url) {
  const all = url.searchParams.get('st') === 'all';
  const rows = (await env.DB.prepare(`SELECT s.child_id,s.term,s.st,s.price,s.ref,s.at,s.trial,s.until,s.decided,s.by,s.note,s.inv,s.promo,c.name child,c.grade,p.email,p.phone,length(s.receipt)>0 has_receipt, rp.name inv_name, rp.email inv_email, rp.phone inv_phone
    FROM subs s JOIN children c ON c.id=s.child_id JOIN parents p ON p.id=s.parent_id LEFT JOIN parents rp ON rp.id=p.pending_ref WHERE s.app=? AND (?=1 OR s.st='pending') ORDER BY s.at DESC LIMIT 500`).bind(appOf(env), all ? 1 : 0).all()).results;
  return J({ ok: true, subs: rows.map(r => ({ ...subPub(r), name: r.child, grade: r.grade, email: /@phone\.local$/.test(r.email) ? '' : r.email, phone: r.phone, receipt: !!r.has_receipt, decided: r.decided, by: r.by, promo: r.promo || '', inv: r.inv || r.inv_name || r.inv_email || r.inv_phone ? (r.inv_name || (/@phone\.local$/.test(r.inv_email || '') ? '' : r.inv_email) || r.inv_phone || '') : '' })) });
}
// POST /api/admin/user {email?, phone?, kid, grade?, curr?, activate?: 'p1:t1'} -> {ok, parent, child}: the admin makes a parent + one child (or adds a child to a known email / phone),
// and may open a term with NO receipt. The parent signs in later with that email (code) like anyone; the child shows up on the device after sign-in.
async function adminUserAdd(req, env) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const email = clip(b.email, 200).toLowerCase(), phone = clip(b.phone, 20).replace(/[^\d+]/g, ''), kid = clip(b.kid, 40), grade = clip(b.grade, 10) || 'p1', t = now();
  if (!kid) return ERR('bad-name'); if (!email && !phone) return ERR('need-contact'); if (email && !EMAIL.test(email)) return ERR('bad-email');
  const act = b.activate ? clip(b.activate, 20) : ''; if (act && !TERM.test(act)) return ERR('bad-term');
  let p = (email ? await env.DB.prepare('SELECT id FROM parents WHERE email=?').bind(email).first() : null) || (phone ? await env.DB.prepare("SELECT id FROM parents WHERE phone=? AND phone!=''").bind(phone).first() : null);
  const stmts = [], cid = 'k' + t.toString(36) + rnd(3);
  if (!p) { p = { id: 'p_' + rnd(14) };
    stmts.push(env.DB.prepare('INSERT INTO parents(id,email,name,phone,curr,ref_code,ref_by,bal,blocked,created,last_seen) VALUES(?,?,?,?,?,?,NULL,0,0,?,?)')
      .bind(p.id, email || (phone.replace(/\D/g, '') + '@phone.local'), '', phone, '{}', rnd(7), t, t)); }
  stmts.push(env.DB.prepare('INSERT INTO children(id,parent_id,name,grade,curr,created) VALUES(?,?,?,?,?,?)').bind(cid, p.id, kid, grade, JSON.stringify(b.curr || {}), t));
  if (act) stmts.push(env.DB.prepare(`INSERT INTO subs(child_id,term,parent_id,st,at,until,decided,by,app) VALUES(?,?,?,'active',?,?,?,'admin',?)`).bind(cid, act, p.id, t, subEnd(t), t, appOf(env)));
  await env.DB.batch(stmts); return J({ ok: true, parent: p.id, child: cid });
}
// POST /api/admin/user/<id> {email?, phone?}: edit a parent's contact (an empty email = phone-only account). POST /api/admin/kid/<id> {name}: rename a student.
// POST /api/admin/user/<id>/delete: remove the parent with ALL their data (children, subscriptions + receipts, unlocks, credits, sessions, promo uses). Reports are kept.
// the one place a parent's email / mobile / notices are changed (the dashboard and the app's profile page both come here); returns an error name or null
async function contactUpdate(env, id, b) {
  const p = await env.DB.prepare('SELECT id,email,phone FROM parents WHERE id=?').bind(id).first(); if (!p) return 'not-found';
  const phone = b.phone != null ? clip(b.phone, 20).replace(/[^\d+]/g, '') : p.phone;
  const email = b.email != null ? clip(b.email, 200).toLowerCase() : (/@phone\.local$/.test(p.email) ? '' : p.email);
  if (email && !EMAIL.test(email)) return 'bad-email'; if (!email && !phone) return 'need-contact';
  const mail = email || (phone.replace(/\D/g, '') + '@phone.local');
  if (await env.DB.prepare('SELECT id FROM parents WHERE email=? AND id!=?').bind(mail, id).first()) return 'email-taken';
  if (phone && await env.DB.prepare("SELECT id FROM parents WHERE phone=? AND id!=?").bind(phone, id).first()) return 'phone-taken';
  await env.DB.prepare('UPDATE parents SET email=?, phone=?, notify=COALESCE(?,notify) WHERE id=?').bind(mail, phone, b.notify == null ? null : (b.notify ? 1 : 0), id).run();
  return null;
}
async function adminUserEdit(req, env, id) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const e = await contactUpdate(env, id, b); return e ? ERR(e, e === 'not-found' ? 404 : e.endsWith('taken') ? 409 : 400) : J({ ok: true });
}
async function adminUserDelete(env, id) {
  const p = await env.DB.prepare('SELECT id FROM parents WHERE id=?').bind(id).first(); if (!p) return ERR('not-found', 404);
  const kids = `(SELECT id FROM children WHERE parent_id=?)`;
  // one statement at a time: a table that is missing in this app's database (older schema) must not stop the delete (a batch is all-or-nothing)
  const st = [
    [`DELETE FROM subs WHERE parent_id=? OR child_id IN ${kids}`, [id, id]],
    [`DELETE FROM unlocks WHERE child_id IN ${kids}`, [id]],
    [`DELETE FROM promo_uses WHERE parent_id=? OR child_id IN ${kids}`, [id, id]],
    ['DELETE FROM coin_events WHERE parent_id=?', [id]],
    ['DELETE FROM sessions WHERE parent_id=?', [id]],
    ['DELETE FROM children WHERE parent_id=?', [id]]];
  const miss = [];
  for (const [q, a] of st) { try { await env.DB.prepare(q).bind(...a).run(); } catch (e) { miss.push(String(e && e.message || e).slice(0, 120)); } }
  try { await env.DB.prepare('DELETE FROM parents WHERE id=?').bind(id).run(); } catch (e) { return ERR('delete-failed: ' + String(e && e.message || e).slice(0, 160), 500); }
  return J({ ok: true, skipped: miss });
}
async function adminKidEdit(req, env, id) {
  const b = await body(req); if (!b) return ERR('bad-body'); const name = clip(b.name, 40), grade = clip(b.grade, 10); if (!name) return ERR('bad-name');
  const r = await env.DB.prepare('UPDATE children SET name=?, grade=COALESCE(NULLIF(?,\'\'),grade) WHERE id=? AND deleted=0').bind(name, grade, id).run();
  return r.meta && r.meta.changes ? J({ ok: true }) : ERR('not-found', 404);
}
// POST /api/admin/kid/<id>/grant {on: true|false}: let ONE student use the added curriculum of the school they chose (a school marked "needs permission" in the dashboard)
async function adminKidGrant(req, env, id) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const r = await env.DB.prepare('UPDATE children SET sgrant=? WHERE id=? AND deleted=0').bind(b.on ? 1 : 0, id).run();
  return r.meta && r.meta.changes ? J({ ok: true, grant: b.on ? 1 : 0 }) : ERR('not-found', 404);
}
// POST /api/admin/user/<id>/kid {name, grade?}: add another student to an existing parent.
async function adminKidAdd(req, env, pid) {
  const b = await body(req); if (!b) return ERR('bad-body'); const name = clip(b.name, 40), grade = clip(b.grade, 10) || 'p1'; if (!name) return ERR('bad-name');
  if (!(await env.DB.prepare('SELECT 1 FROM parents WHERE id=?').bind(pid).first())) return ERR('not-found', 404);
  const t = now(), cid = 'k' + t.toString(36) + rnd(3);
  await env.DB.prepare('INSERT INTO children(id,parent_id,name,grade,curr,created) VALUES(?,?,?,?,?,?)').bind(cid, pid, name, grade, '{}', t).run(); return J({ ok: true, child: cid });
}

/* ---------- invite a friend (Ahmed 2026-11-17): a parent whose PENDING referral (parents.pending_ref = the last link they opened; one-off, no lasting tie) earns the link owner credits when a SUBSCRIPTION of theirs is activated by the admin
   (activate or grant). Credits = settings.coins.referral.subCoins (dashboard). One award per child+term (coin_events kind 'refsub', ref = child:term, never twice); never to oneself.
   The referrer gets the credits, a notice in the app (the wallet history row carries the student's name in `note`) and an email when notices are on. ---------- */
async function awardReferralSub(env, child, term) {
  try {
    const c = await env.DB.prepare('SELECT c.name, c.parent_id, p.pending_ref ref_by FROM children c JOIN parents p ON p.id=c.parent_id WHERE c.id=?').bind(child).first();
    if (!c || !c.ref_by || c.ref_by === c.parent_id) return 0;
    const S = await settings(env), R = (S.coins || {}).referral || {}, n = Math.max(0, Math.floor(+R.subCoins || 0));
    if (!n) return 0;   // independent of the registration reward (referral.on / referral.coins)
    const sharer = await env.DB.prepare('SELECT id,name,email,notify,blocked FROM parents WHERE id=?').bind(c.ref_by).first();
    if (!sharer || sharer.blocked) return 0;
    const t = now(), who = clip((c.name || '').split(/\s+/)[0], 40) || 'طالب', key = child + ':' + term;
    const r = await env.DB.prepare(`INSERT INTO coin_events(parent_id,kind,ref,child_id,amount,at,day,device,ip,note,app) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM coin_events WHERE parent_id=? AND kind='refsub' AND ref=? AND app=?)`)
      .bind(sharer.id, 'refsub', key, '', n, t, day(t), '', '', who, appOf(env), sharer.id, key, appOf(env)).run();
    if (!(r.meta && r.meta.changes)) return 0;   // already paid for this subscription
    await env.DB.prepare(`UPDATE parents SET ${BAL(env)}=${BAL(env)}+? WHERE id=?`).bind(n, sharer.id).run();
    await env.DB.prepare("UPDATE parents SET pending_ref='' WHERE id=?").bind(c.parent_id).run();   // consumed: the next credited action needs a new link visit
    await env.DB.prepare('UPDATE subs SET inv=? WHERE child_id=? AND term=? AND app=?').bind(clip(sharer.name || '', 40), child, term, appOf(env)).run().catch(() => {});
    if (env.RESEND_API_KEY && sharer.notify !== 0 && sharer.email && !/@phone\.local$/.test(sharer.email)) {
      const html = '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:17px;color:#333"><p><b>تم اشتراك ' + escapeHtml(who) + ' عن طريق لينك الدعوة بتاعك</b></p><p>وخدت ' + n + ' كريدت.</p></div>';
      await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ from: env.MAIL_FROM || `${appName(env)} <onboarding@resend.dev>`, to: [sharer.email], subject: 'خدت كريدتس من دعوة صديق - ' + (appName(env)), html }), signal: AbortSignal.timeout(5000) }).catch(() => {});
    }
    return n;
  } catch (e) { return 0; }   // the award never blocks the activation
}
async function adminSub(req, env, path) {
  const rc = path.match(/^\/api\/admin\/sub\/(k\w+)\/([\w-]+:t[12])\/receipt$/);
  if (rc) { const r = await env.DB.prepare('SELECT receipt FROM subs WHERE child_id=? AND term=? AND app=?').bind(rc[1], rc[2], appOf(env)).first(); return r && r.receipt ? J({ ok: true, receipt: r.receipt }) : ERR('not-found', 404); }
  const b = await body(req); if (!b) return ERR('bad-body');
  const child = clip(b.child, 32), term = clip(b.term, 20), t = now(); if (!TERM.test(term)) return ERR('bad-body');
  if (path === '/api/admin/sub/grant') {   // open a child's term with NO receipt (cash, gift, a problem with the picture)
    const c = await env.DB.prepare('SELECT parent_id FROM children WHERE id=? AND deleted=0').bind(child).first(); if (!c) return ERR('not-found', 404);
    await env.DB.prepare(`INSERT INTO subs(child_id,term,parent_id,st,at,until,decided,by,app) VALUES(?,?,?,'active',?,?,?,'admin',?)
      ON CONFLICT(app,child_id,term) DO UPDATE SET st='active',until=excluded.until,decided=excluded.decided,by='admin'`).bind(child, term, c.parent_id, t, subEnd(t), t, appOf(env)).run(); await awardReferralSub(env, child, term); return J({ ok: true }); }
  const st = { activate: 'active', reject: 'rejected', close: 'closed' }[b.action]; if (!st) return ERR('bad-body');
  const note = st === 'rejected' ? clip(b.message, 500) : '';
  const r = await env.DB.prepare('UPDATE subs SET st=?, decided=?, by=\'admin\', note=?, trial=CASE WHEN ?=\'active\' THEN trial ELSE 0 END WHERE child_id=? AND term=? AND app=?').bind(st, t, note, st, child, term, appOf(env)).run();
  if (!(r.meta && r.meta.changes)) return ERR('not-found', 404);
  if (st === 'active') await awardReferralSub(env, child, term);
  let mailed = false; if (st === 'rejected') { try { mailed = await mailRejectSub(env, child, term, note); } catch (e) { /* the in-app notice still reaches the parent */ } }
  return J({ ok: true, mailed });
}

/* ---------- promo codes (Marwa 2026-11-05; app/docs/coins-and-admin.md §7) ----------
   POST /api/promo {child, code}: settings.promos = [{code, what: lesson|unit|subject|all, target, uses: once|many, max, until, on}].
   once = one use in total (any parent); many = each child once, at most max in total (0 = no limit). until = last day (Cairo).
   Opens for the child: the lesson / unit id, 's:<subject>' or '*'. Costs nothing; a 0-credit 'promo' coin event keeps the history. */
const promoNorm = c => String(c || '').toUpperCase().replace(/[\s\-_]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
// the checks every use of a code goes through (wrong tries are counted by the caller): null when fine, else the error name
async function promoProblem(env, S, P, c, child) {
  if (!P || P.on === false) return 'bad';
  if (P.what === 'all') return 'bad';   // «فتح كل المواد» was removed (2026-11-20): use the term-subscription type; old codes of it stay in the settings but no longer work
  if (P.what === 'percent') { if (!(+P.pct > 0 && +P.pct <= 100)) return 'bad'; }
  else if (P.what === 'term') { if (!/^t[12]$/.test(P.term || '')) return 'bad'; }
  else if (P.what !== 'all' && P.what !== 'any' && !P.target) return 'bad';
  if (P.until && day() > P.until) return 'old';
  if (await env.DB.prepare('SELECT 1 FROM promo_uses WHERE code=? AND child_id=? AND app=?').bind(c, child, appOf(env)).first()) return 'used';
  const used = (await env.DB.prepare('SELECT COUNT(*) n FROM promo_uses WHERE code=? AND app=?').bind(c, appOf(env)).first()).n;
  if (P.uses !== 'many' && used >= 1) return 'used';
  if (P.uses === 'many' && +P.max > 0 && used >= +P.max) return 'full';
  return null;
}
const promoCap = P => P.uses === 'many' ? (+P.max > 0 ? +P.max : 1e9) : 1;
// POST /api/promo {child, code, id?}. Types: lesson | unit | subject | all open their target at once.
// 'any' (the user picks ONE lesson): without id it only says {ok, pick:true} (nothing used); with id (a built lesson id, l:...) it opens that lesson and counts one use.
// 'percent': says {ok, percent:N} and uses nothing; the use is counted when POST /subs arrives with {promo:code} (subsIn).
async function promo(req, env, p, ip) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const child = await kidId(env, clip(b.child, 32)), c = promoNorm(clip(b.code, 40));
  if (!c) return ERR('empty');
  if (!(await childOk(env, p, child))) return ERR('not-yours', 403);
  // a few wrong tries are fine; many from one parent in a day = guessing
  const lk = 'promo:' + p.id + ':' + day(), tries = await env.DB.prepare('SELECT n FROM limits WHERE key=?').bind(lk).first();
  if (tries && tries.n >= 20) return ERR('slow', 429);
  const S = await settings(env), P = S.promoOn === false ? null : (S.promos || []).find(x => promoNorm(x.code) === c);
  const bad = async e => { await env.DB.prepare('INSERT INTO limits(key,n,day) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1').bind(lk, day()).run(); return ERR(e, 409); };
  const pr = await promoProblem(env, S, P, c, child); if (pr) return pr === 'bad' ? bad('bad') : ERR(pr, 409);
  if (P.what === 'percent') return J({ ok: true, percent: +P.pct });
  if (P.what === 'term') {   // opens the whole term (all subjects) for this child at once, to 31 Aug; the use is counted with the same atomic INSERT
    const kid = await env.DB.prepare('SELECT grade FROM children WHERE id=? AND deleted=0').bind(child).first(); if (!kid) return ERR('not-yours', 403);
    const term = (kid.grade || 'p1') + ':' + P.term, t = now();
    const r = await env.DB.prepare('INSERT OR IGNORE INTO promo_uses(code,parent_id,child_id,item,at,app) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM promo_uses WHERE code=? AND app=?) < ?')
      .bind(c, p.id, child, 'term:' + term, t, appOf(env), c, appOf(env), promoCap(P)).run();
    if (!r.meta.changes) return ERR(P.uses === 'many' ? 'full' : 'used', 409);
    await env.DB.prepare(`INSERT INTO subs(child_id,term,parent_id,st,price,ref,receipt,at,trial,until,decided,by,promo,app) VALUES(?,?,?,'active',0,?,'',?,0,?,?,'promo',?,?)
      ON CONFLICT(app,child_id,term) DO UPDATE SET st='active',price=0,ref=excluded.ref,receipt='',at=excluded.at,trial=0,until=excluded.until,decided=excluded.decided,by='promo',promo=excluded.promo`)
      .bind(child, term, p.id, 'code:' + c, t, subEnd(t), t, c, appOf(env)).run();
    await ev(env, p.id, 'promo', 'term:' + P.term, child, 0, t, '', ip, c).run();   // a 0-credit history line: «تفعيل بكود»
    return J({ ok: true, term: { key: term, until: subEnd(t) }, ...(await walletOf(env, p.id, child)) });
  }
  let item = P.what === 'all' ? '*' : P.what === 'subject' ? 's:' + P.target : P.target;
  if (P.what === 'any') {
    if (!b.id) return J({ ok: true, pick: true });
    item = clip(b.id, 80);
    if (item[0] !== 'l' || (S.items[item] || {}).st === 'soon') return bad('bad');
  }
  const t = now();
  if (!/^(\*|s:[\w-]{1,40})$/.test(item) && !ITEM.test(item)) return bad('bad');
  const subject = item === '*' ? '' : item[0] === 's' ? item.slice(2) : subjectOf(item);
  // the INSERT itself checks the count (and the primary key code+child), so two uses at the same moment can't pass the limit
  const r = await env.DB.prepare('INSERT OR IGNORE INTO promo_uses(code,parent_id,child_id,item,at,app) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM promo_uses WHERE code=? AND app=?) < ?')
    .bind(c, p.id, child, item, t, appOf(env), c, appOf(env), promoCap(P)).run();
  if (!r.meta.changes) return ERR(P.uses === 'many' ? 'full' : 'used', 409);
  await env.DB.batch([env.DB.prepare("INSERT OR IGNORE INTO unlocks(child_id,item,subject,how,coins,at,app) VALUES(?,?,?,'promo',0,?,?)").bind(child, item, subject, t, appOf(env)),
    ev(env, p.id, 'promo', item, child, 0, t, '', ip)]);
  return J({ ok: true, promo: { what: P.what === 'any' ? 'lesson' : P.what, target: P.what === 'any' ? item : (P.target || '') }, ...(await walletOf(env, p.id, child)) });
}

/* ---------- admin ----------
   Login = Cloudflare Access in front of /admin.html and /api/admin/* (Access checks Marwa's email, then sends a signed JWT).
   The Worker checks that JWT itself (ACCESS_TEAM = <team>.cloudflareaccess.com, ACCESS_AUD = the app's AUD tag), so a request that
   skipped Access is refused. ADMIN_TOKEN (Bearer) works too, for scripts. DEV_ADMIN="1" (local .dev.vars only) = no check. */
let CERTS = null;
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0));
async function accessOk(req, env) {
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD) return false;
  const ck = (req.headers.get('cookie') || '').match(/CF_Authorization=([^;]+)/);
  const jwt = req.headers.get('cf-access-jwt-assertion') || (ck && ck[1]); if (!jwt) return false;
  const [h, pl, sig] = jwt.split('.'); if (!sig) return false;
  try {
    const head = JSON.parse(new TextDecoder().decode(b64u(h))), claims = JSON.parse(new TextDecoder().decode(b64u(pl)));
    if (!CERTS || CERTS.at < now() - 3600e3) CERTS = { at: now(), keys: (await (await fetch(`https://${env.ACCESS_TEAM}/cdn-cgi/access/certs`)).json()).keys };
    const jwk = CERTS.keys.find(k => k.kid === head.kid); if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(sig), enc.encode(h + '.' + pl)))) return false;
    const aud = [].concat(claims.aud || []);
    return aud.includes(env.ACCESS_AUD) && claims.exp * 1000 > now() && claims.iss === `https://${env.ACCESS_TEAM}`;
  } catch (e) { return false; }
}
const isAdmin = async (req, env) => env.DEV_ADMIN === '1' || (!!env.ADMIN_TOKEN && env.ADMIN_TOKEN.length >= 16 && req.headers.get('authorization') === 'Bearer ' + env.ADMIN_TOKEN) || accessOk(req, env);

// GET /api/admin/accounts?since=<ms>&q=<text> -> {accounts:[{id,name,email,phone,created,kids:[{name,grade}],ref_by,referred,bal,blocked,last_seen}]} newest first
async function adminAccounts(env, url) {
  const since = +url.searchParams.get('since') || 0, q = clip(url.searchParams.get('q'), 80).toLowerCase(), lim = Math.min(1000, +url.searchParams.get('limit') || 300);
  const rows = (await env.DB.prepare(`SELECT p.id,p.email,p.name,p.phone,p.curr,p.ref_by,p.${BAL(env)} AS bal,p.bal AS bal_study,p.bal_w AS bal_words,p.blocked,p.created,p.last_seen,p.notify,
      (SELECT COUNT(*) FROM parents r WHERE r.ref_by=p.id) referred,
      (SELECT COUNT(*) FROM coin_events e WHERE e.parent_id=p.id AND e.kind='referral' AND e.app='${appOf(env)}') referred_paid
    FROM parents p WHERE p.created>=? AND (?='' OR p.email LIKE ? OR p.name LIKE ? OR p.phone LIKE ?) ORDER BY p.created DESC LIMIT ?`)
    .bind(since, q, '%' + q + '%', '%' + q + '%', '%' + q + '%', lim).all()).results;
  const kids = rows.length ? (await env.DB.prepare(`SELECT id,parent_id,name,grade,created,curr,sgrant FROM children WHERE deleted=0 AND parent_id IN (${rows.map(() => '?').join(',')}) ORDER BY created`).bind(...rows.map(r => r.id)).all()).results : [];
  const pj = s => { try { return JSON.parse(s); } catch (e) { return {}; } };
  return J({ ok: true, accounts: rows.map(r => ({ ...r, curr: pj(r.curr), created: new Date(r.created).toISOString(), last_seen: new Date(r.last_seen).toISOString(),
    kids: kids.filter(k => k.parent_id === r.id).map(k => ({ id: k.id, name: k.name, grade: k.grade, created: new Date(k.created).toISOString(), school: pj(k.curr).school || '', grant: k.sgrant ? 1 : 0 })) })) });
}
// GET /api/admin/stats -> {hist:[{k,t,id,n,at,parent}] latest 500, totals, byDay (last 14 days)}
async function adminStats(env) {
  const one = (sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const [parents, week, kids, active, hist, byDay] = await Promise.all([
    one('SELECT COUNT(*) n FROM parents'), one('SELECT COUNT(*) n FROM parents WHERE created>=?', now() - 7 * 864e5),
    one('SELECT COUNT(*) n FROM children WHERE deleted=0'), one('SELECT COUNT(*) n FROM parents WHERE last_seen>=?', now() - 7 * 864e5),
    env.DB.prepare(`SELECT e.kind,e.ref,e.amount,e.at,e.child_id,e.parent_id,p.name,p.email,p.phone,p.${BAL(env)} AS bal,c.name AS kid FROM coin_events e JOIN parents p ON p.id=e.parent_id LEFT JOIN children c ON c.id=e.child_id WHERE e.app=? ORDER BY e.at DESC LIMIT 3000`).bind(appOf(env)).all(),
    env.DB.prepare("SELECT day, SUM(kind='share') shares, SUM(kind='referral') referrals, SUM(kind='gift') signups, SUM(CASE WHEN amount<0 THEN -amount ELSE 0 END) spent FROM coin_events WHERE day>=? AND app=? GROUP BY day ORDER BY day").bind(day(now() - 13 * 864e5), appOf(env)).all()]);
  const promoUses = (await env.DB.prepare('SELECT code, COUNT(*) n FROM promo_uses WHERE app=? GROUP BY code').bind(appOf(env)).all()).results;
  return J({ ok: true, totals: { parents: parents.n, week: week.n, kids: kids.n, active7: active.n }, byDay: byDay.results, promoUses,
    hist: hist.results.map(h => ({ k: h.kind, n: h.amount, at: h.at, parent: h.name, pid: h.parent_id, email: h.email, phone: h.phone, bal: h.bal, ...(h.kid ? { kid: h.kid } : {}), ...(h.kind === 'share' ? { t: h.ref } : h.ref ? { id: h.ref } : {}) })) });
}
// POST /api/admin/parent/<id> {blocked?, coins?(+/-), note?}
async function adminParent(req, env, id) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const p = await env.DB.prepare('SELECT id FROM parents WHERE id=?').bind(id).first(); if (!p) return ERR('not-found', 404);
  const st = [];
  if (b.blocked != null) { st.push(env.DB.prepare('UPDATE parents SET blocked=? WHERE id=?').bind(b.blocked ? 1 : 0, id)); if (b.blocked) st.push(env.DB.prepare('DELETE FROM sessions WHERE parent_id=?').bind(id)); }
  const n = Math.trunc(+b.coins || 0);
  if (n) st.push(ev(env, id, 'admin', clip(b.note, 80), '', n, now(), '', ''), env.DB.prepare(`UPDATE parents SET ${BAL(env)}=MAX(0,${BAL(env)}+?) WHERE id=?`).bind(n, id));
  if (st.length) await env.DB.batch(st);
  return J({ ok: true });
}

/* ---------- problem reports (2026-11-06) ----------
   POST /api/report {id, ctx:{subject,unit,lesson,tab,book,page,ex,qi,...}, kind, comment, device}: anyone using the app (signed in or not) sends "I found a mistake here".
   The id is made by the app, so a retry of the same report is stored once. Limits: 30 a day per IP, 15 a day per device.
   Admin: GET /api/admin/reports?status=open|done|all  and  POST /api/admin/report/<id> {status:'open'|'done'}. */
const REPORT_ID = /^r_[\w-]{6,40}$/;
async function reportIn(req, env, ip) {
  const b = await body(req); if (!b || !b.ctx || typeof b.ctx !== 'object') return ERR('bad-body');
  const id = clip(b.id, 48); if (!REPORT_ID.test(id)) return ERR('bad-id');
  const c = b.ctx, dev = clip(b.device, 40), d = day();
  const bump = async k => { const r = await env.DB.prepare('SELECT n FROM limits WHERE key=?').bind(k).first(); return r ? r.n : 0; };
  const kIp = 'report:' + ip + ':' + d, kDev = 'report:d:' + dev + ':' + d;
  if ((ip && await bump(kIp) >= 30) || (dev && await bump(kDev) >= 15)) return ERR('slow', 429);
  const p = await who(req, env).catch(() => null), t = now();
  const ctx = JSON.stringify(c).slice(0, 4000), num = v => (v == null || v === '') ? '' : clip(v, 20);
  const r = await env.DB.prepare('INSERT OR IGNORE INTO reports(id,at,status,subject,unit,lesson,tab,page,ex,kind,comment,ctx,parent_id,device,app) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, Math.min(t, +b.at || t), 'open', clip(c.subject, 40), num(c.unit), clip(c.lesson, 60), clip(c.tab, 20), num(c.page), num(c.ex), clip(b.kind, 30), clip(b.comment, 1000), ctx, p ? p.id : '', dev, appOf(env)).run();
  const inc = [ip ? env.DB.prepare('INSERT INTO limits(key,n,day) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1').bind(kIp, d) : null,
    dev ? env.DB.prepare('INSERT INTO limits(key,n,day) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1').bind(kDev, d) : null].filter(Boolean);
  if (r.meta.changes && inc.length) await env.DB.batch(inc);
  return J({ ok: true });
}
// GET /api/admin/reports?status=open|done|all&subject=<id> -> {reports:[{id,at,status,subject,unit,lesson,tab,page,ex,kind,comment,ctx,parent,device,done_at}]} newest first, at most 500
async function adminReports(env, url) {
  const st = url.searchParams.get('status') || 'open', sj = clip(url.searchParams.get('subject'), 40);
  const rows = (await env.DB.prepare(`SELECT r.*, p.name parent FROM reports r LEFT JOIN parents p ON p.id=r.parent_id WHERE r.app=? AND (?='all' OR r.status=?) AND (?='' OR r.subject=?) ORDER BY r.at DESC LIMIT 500`).bind(appOf(env), st, st, sj, sj).all()).results;
  const open = (await env.DB.prepare("SELECT COUNT(*) n FROM reports WHERE status='open' AND app=?").bind(appOf(env)).first()).n;
  const pj = s => { try { return JSON.parse(s); } catch (e) { return {}; } };
  return J({ ok: true, open, reports: rows.map(r => ({ ...r, ctx: pj(r.ctx), parent_id: undefined })) });
}
// POST /api/admin/report/<id> {status}
async function adminReport(req, env, id) {
  const b = await body(req); if (!b || !['open', 'done'].includes(b.status)) return ERR('bad-body');
  const r = await env.DB.prepare('UPDATE reports SET status=?, done_at=? WHERE id=?').bind(b.status, b.status === 'done' ? now() : 0, id).run();
  return r.meta.changes ? J({ ok: true }) : ERR('not-found', 404);
}

/* ---------- push notifications (2026-11-09, Ahmed): MANUAL ONLY. Nothing here sends by itself: no schedule, no trigger. ----------
   Device: POST /api/push/sub {endpoint} (allowed) / POST /api/push/unsub {endpoint}; GET /api/push/key (VAPID public key); GET /api/push/latest (newest message).
   Admin: GET /api/admin/push -> {subs, msgs}; POST /api/admin/push/send {title, body, url} -> {id} (stores the message);
          POST /api/admin/push/deliver/<id> -> {sent, left} pushes to the next 40 devices (a Worker call may make few outgoing requests: the dashboard repeats until left=0).
   The push has NO payload (no encryption needed): the service worker wakes, reads GET /api/push/latest and shows it. VAPID keys: secrets VAPID_PUBLIC, VAPID_PRIVATE (JWK json), VAPID_SUBJECT. */
const b64 = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// the VAPID keys of an app: the Easy Words devices were subscribed with the Easy Words Worker's key. The dashboard (on the Easy Study Worker) sends to them with VAPID_*_WORDS when those secrets are set; the Easy Words Worker itself uses its own VAPID_*
const vk = env => appOf(env) === 'words' && env.VAPID_PUBLIC_WORDS && env.VAPID_PRIVATE_WORDS ? { pub: env.VAPID_PUBLIC_WORDS, priv: env.VAPID_PRIVATE_WORDS, sub: env.VAPID_SUBJECT_WORDS || env.VAPID_SUBJECT } : { pub: env.VAPID_PUBLIC, priv: env.VAPID_PRIVATE, sub: env.VAPID_SUBJECT };
const VKEYS = {};
async function vapidHeader(env, endpoint, subject) {
  const K = vk(env); if (!VKEYS[K.pub]) VKEYS[K.pub] = await crypto.subtle.importKey('jwk', JSON.parse(K.priv), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const pl = b64(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now() / 1000) + 12 * 3600, sub: K.sub || (subject ? 'mailto:' + subject : 'mailto:admin@example.com') })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, VKEYS[K.pub], enc.encode(head + '.' + pl)));
  return `vapid t=${head}.${pl}.${b64(sig)}, k=${K.pub}`;
}
const ENDPOINT = /^https:\/\/[\w.-]{3,100}\/[\w\-./~%+=?&:@]{8,900}$/;
async function pushSub(req, env, ip, on) {
  const b = await body(req), e = b && clip(b.endpoint, 1000); if (!e || !ENDPOINT.test(e)) return ERR('bad-body');
  if (!on) { await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=? AND app=?').bind(e, appOf(env)).run(); return J({ ok: true }); }
  const d = day(), k = 'push:' + ip + ':' + d, r = await env.DB.prepare('SELECT n FROM limits WHERE key=?').bind(k).first();
  if (ip && r && r.n >= 60) return ERR('slow', 429);
  const last = (await env.DB.prepare('SELECT COALESCE(MAX(id),0) m FROM push_msgs WHERE app=?').bind(appOf(env)).first()).m;   // a new device does not get the old messages
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO push_subs(endpoint,created,last_msg,app) VALUES(?,?,?,?)').bind(e, now(), last, appOf(env)).run();
  if (ip && ins.meta.changes) await env.DB.prepare('INSERT INTO limits(key,n,day) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1').bind(k, d).run();
  return J({ ok: true });
}
async function adminPush(env) {
  const subs = (await env.DB.prepare('SELECT COUNT(*) n FROM push_subs WHERE app=?').bind(appOf(env)).first()).n;
  const msgs = (await env.DB.prepare('SELECT id,at,title,body,url,sent,gone FROM push_msgs WHERE app=? ORDER BY id DESC LIMIT 30').bind(appOf(env)).all()).results;
  return J({ ok: true, subs, ready: !!(vk(env).pub && vk(env).priv), msgs });
}
async function adminPushSend(req, env) {
  const b = await body(req), title = b && clip(b.title, 80), text = b && clip(b.body, 300), url = b && clip(b.url, 200);
  if (!title || !text) return ERR('bad-body');
  if (url && !/^(\/|https:\/\/)/.test(url)) return ERR('bad-url');
  if (!vk(env).pub || !vk(env).priv) return ERR('no-keys', 500);
  const r = await env.DB.prepare('INSERT INTO push_msgs(at,title,body,url,app) VALUES(?,?,?,?,?)').bind(now(), title, text, url, appOf(env)).run();
  return J({ ok: true, id: r.meta.last_row_id });
}
async function adminPushDeliver(env, id) {
  const m = await env.DB.prepare('SELECT id FROM push_msgs WHERE id=? AND app=?').bind(id, appOf(env)).first(); if (!m) return ERR('not-found', 404);
  const rows = (await env.DB.prepare('SELECT endpoint FROM push_subs WHERE last_msg<? AND app=? ORDER BY created LIMIT 40').bind(id, appOf(env)).all()).results;
  let sent = 0, gone = 0;
  const adminMail = (await settings(env).catch(() => ({}))).adminEmail || '';   // dashboard "إيميل الإدارة"
  await Promise.all(rows.map(async ({ endpoint }) => {
    let st = 0;
    try { st = (await fetch(endpoint, { method: 'POST', headers: { Authorization: await vapidHeader(env, endpoint, adminMail), TTL: '86400', Urgency: 'normal', 'Content-Length': '0' } })).status; } catch (e) { st = 0; }
    if (st === 404 || st === 410) { gone++; await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(endpoint).run(); }
    else { if (st >= 200 && st < 300) sent++; await env.DB.prepare('UPDATE push_subs SET last_msg=? WHERE endpoint=?').bind(id, endpoint).run(); }   // other errors: skipped, not retried forever
  }));
  await env.DB.prepare('UPDATE push_msgs SET sent=sent+?, gone=gone+? WHERE id=?').bind(sent, gone, id).run();
  const left = (await env.DB.prepare('SELECT COUNT(*) n FROM push_subs WHERE last_msg<? AND app=?').bind(id, appOf(env)).first()).n;
  return J({ ok: true, sent, gone, left });
}


/* ---------- MERGE of the old Easy Words database into the shared one (2026-11-21, once) ----------
   POST /api/admin/merge-words {dryRun?:true, force?:true}. Needs the binding WORDS_OLD = the OLD Easy Words D1 database (kept untouched: it is the rollback copy).
   Reads the old database, never writes to it, and only ADDS to the shared one: parents are matched by email, then by mobile (last 9 digits); a matched parent keeps its Easy Study
   row (the old Easy Words balance goes to bal_w, empty name / mobile are filled in); a student is matched by the same id, else by the same parent + the same name (alias kept so
   a device that still holds the old id works); everything of Easy Words (credit history, unlocks, subscriptions + receipts, promo uses, reports, push, settings, sessions) is copied with app='words'.
   Runs once (marker settings 'merge-words-done'; {force:true} runs it again); a run that stopped half way can simply be run again (balances are SET from the old database, not added); dryRun only reports what it would do. */
const nameKey = n => String(n || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
const ph9 = v => { const d = String(v || '').replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).replace(/\D/g, ''); return d.length >= 8 ? d.slice(-9) : ''; };
let MERGED = false;
const mergeDone = async env => MERGED || (MERGED = !!(await env.DB.prepare("SELECT 1 FROM settings WHERE key='merge-words-done'").first().catch(() => null)));
async function mergeWords(req, env) {
  const b = (await body(req)) || {}, dry = b.dryRun !== false && b.dryRun !== 0 && !b.run;   // anything but {run:true} is a dry run
  if (!env.WORDS_OLD) return ERR('no-old-db', 409);
  const OLD = env.WORDS_OLD, NEW = env.DB;
  const done = await NEW.prepare("SELECT json FROM settings WHERE key='merge-words-done'").first();
  if (done && !b.force) return J({ ok: false, error: 'already-merged', done: JSON.parse(done.json) }, 409);
  const all = async (db, q, ...a) => { try { return (await db.prepare(q).bind(...a).all()).results; } catch (e) { return []; } };
  const [oParents, oKids] = [await all(OLD, 'SELECT * FROM parents'), await all(OLD, 'SELECT * FROM children')];
  const nParents = await all(NEW, 'SELECT id,email,name,phone,curr,ref_by,pending_ref,created,last_seen,blocked,ref_code FROM parents');
  const nKids = await all(NEW, 'SELECT id,parent_id,name,grade,curr,deleted,sgrant FROM children');
  const byEmail = new Map(nParents.map(p => [p.email, p])), byPhone = new Map();
  nParents.slice().sort((a, c) => a.created - c.created).forEach(p => { const k = ph9(p.phone); if (k && !byPhone.has(k)) byPhone.set(k, p); });
  const usedIds = new Set(nParents.map(p => p.id)), usedRef = new Set(nParents.map(p => p.ref_code)), kidIds = new Set(nKids.map(k => k.id));
  const rep = { parentsMatchedByEmail: 0, parentsMatchedByPhone: 0, parentsNew: 0, kidsSameId: 0, kidsMatchedByName: 0, kidsNew: 0, kidsIdChanged: 0, phoneMatches: [], rows: {} };
  const pmap = new Map(), pNew = new Map(), st = [];
  for (const o of oParents) {
    let m = byEmail.get(o.email), how = 'email';
    if (!m) { const k = ph9(o.phone); m = k && byPhone.get(k); how = 'phone'; }
    if (m) {
      pmap.set(o.id, m.id); rep[how === 'email' ? 'parentsMatchedByEmail' : 'parentsMatchedByPhone']++;
      if (how === 'phone') rep.phoneMatches.push({ words: o.email, study: m.email });
      st.push(NEW.prepare(`UPDATE parents SET bal_w=?, name=CASE WHEN name='' THEN ? ELSE name END, phone=CASE WHEN phone='' THEN ? ELSE phone END, curr=CASE WHEN curr IN ('','{}') THEN ? ELSE curr END,
        blocked=MAX(blocked,?), created=MIN(created,?), last_seen=MAX(last_seen,?), notify=MIN(notify,?) WHERE id=?`).bind(o.bal || 0, o.name || '', o.phone || '', o.curr || '{}', o.blocked ? 1 : 0, o.created || 0, o.last_seen || 0, o.notify == null ? 1 : o.notify, m.id));
    } else {
      const id = usedIds.has(o.id) ? 'p_' + rnd(14) : o.id; usedIds.add(id); pmap.set(o.id, id); pNew.set(o.id, id); rep.parentsNew++;
      let rc = o.ref_code; if (usedRef.has(rc)) rc = rnd(7); usedRef.add(rc);
      st.push(NEW.prepare('INSERT INTO parents(id,email,name,phone,curr,ref_code,ref_by,bal,bal_w,blocked,created,last_seen,notify,pending_ref) VALUES(?,?,?,?,?,?,NULL,0,?,?,?,?,?,\'\')')
        .bind(id, o.email, o.name || '', o.phone || '', o.curr || '{}', rc, o.bal || 0, o.blocked ? 1 : 0, o.created || 0, o.last_seen || 0, o.notify == null ? 1 : o.notify));
    }
  }
  for (const o of oParents) {   // referral links: the sharer's id changes when the sharer was matched; only a NEW parent row gets them (a matched one keeps its Easy Study ties)
    if (pNew.has(o.id) && (o.ref_by || o.pending_ref)) st.push(NEW.prepare('UPDATE parents SET ref_by=?, pending_ref=? WHERE id=?').bind(o.ref_by ? pmap.get(o.ref_by) || null : null, o.pending_ref ? pmap.get(o.pending_ref) || '' : '', pmap.get(o.id)));
  }
  const kmap = new Map(), taken = new Set(), alias = [];
  const kidsOf = pid => nKids.filter(k => k.parent_id === pid);
  for (const o of oKids) {
    const np = pmap.get(o.parent_id); if (!np) continue;
    let m = nKids.find(k => k.id === o.id && k.parent_id === np);
    if (m) rep.kidsSameId++;
    else { m = kidsOf(np).find(k => !taken.has(k.id) && nameKey(k.name) === nameKey(o.name)); if (m) rep.kidsMatchedByName++; }
    if (m) {
      taken.add(m.id); kmap.set(o.id, m.id); if (m.id !== o.id) { alias.push([o.id, m.id]); rep.kidsIdChanged++; }
      st.push(NEW.prepare(`UPDATE children SET progress_w=?, progress_at_w=?, sgrant=MAX(sgrant,?), deleted=MIN(deleted,?), curr=CASE WHEN curr IN ('','{}') THEN ? ELSE curr END WHERE id=?`)
        .bind(o.progress || '{}', o.progress_at || 0, o.sgrant ? 1 : 0, o.deleted ? 1 : 0, o.curr || '{}', m.id));
    } else {
      let id = o.id; if (kidIds.has(id)) { id = 'k' + Date.now().toString(36) + rnd(4); alias.push([o.id, id]); rep.kidsIdChanged++; } kidIds.add(id); kmap.set(o.id, id); rep.kidsNew++;
      st.push(NEW.prepare('INSERT INTO children(id,parent_id,name,grade,curr,progress,progress_at,progress_w,progress_at_w,created,deleted,sgrant) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, np, o.name, o.grade || 'p1', o.curr || '{}', '{}', 0, o.progress || '{}', o.progress_at || 0, o.created || 0, o.deleted ? 1 : 0, o.sgrant ? 1 : 0));
    }
  }
  for (const [a, c] of alias) st.push(NEW.prepare('INSERT OR REPLACE INTO kid_alias(old_id,child_id) VALUES(?,?)').bind(a, c));
  const pm = x => pmap.get(x) || x, km = x => (x ? kmap.get(x) || x : '');
  // the rest of the words data: copied with app='words'
  const copies = [];
  for (const r of await all(OLD, 'SELECT * FROM sessions')) if (pmap.has(r.parent_id)) copies.push(['sessions', NEW.prepare('INSERT OR IGNORE INTO sessions(hash,parent_id,device,created,last_seen) VALUES(?,?,?,?,?)').bind(r.hash, pm(r.parent_id), r.device || '', r.created, r.last_seen)]);
  for (const r of await all(OLD, 'SELECT * FROM devices')) copies.push(['devices', NEW.prepare('INSERT OR IGNORE INTO devices(id,first_parent,created) VALUES(?,?,?)').bind(r.id, r.first_parent ? pm(r.first_parent) : null, r.created)]);
  for (const r of await all(OLD, 'SELECT * FROM coin_events ORDER BY id')) if (pmap.has(r.parent_id)) copies.push(['coin_events', NEW.prepare('INSERT INTO coin_events(parent_id,kind,ref,child_id,amount,at,day,device,ip,note,app) VALUES(?,?,?,?,?,?,?,?,?,?,\'words\')')
    .bind(pm(r.parent_id), r.kind, r.ref || '', km(r.child_id), r.amount, r.at, r.day, r.device || '', r.ip || '', r.note || '')]);
  for (const r of await all(OLD, 'SELECT * FROM unlocks')) if (kmap.has(r.child_id)) copies.push(['unlocks', NEW.prepare("INSERT OR IGNORE INTO unlocks(child_id,item,subject,how,coins,at,app) VALUES(?,?,?,?,?,?,'words')").bind(km(r.child_id), r.item, r.subject || '', r.how, r.coins || 0, r.at)]);
  for (const r of await all(OLD, 'SELECT * FROM promo_uses')) copies.push(['promo_uses', NEW.prepare("INSERT OR IGNORE INTO promo_uses(code,parent_id,child_id,item,at,app) VALUES(?,?,?,?,?,'words')").bind(r.code, pm(r.parent_id), km(r.child_id), r.item, r.at)]);
  const nSubs = (await OLD.prepare('SELECT COUNT(*) n FROM subs').first().catch(() => ({ n: 0 }))).n;   // receipts are big: read 25 at a time
  for (let off = 0; off < nSubs; off += 25) for (const r of await all(OLD, 'SELECT * FROM subs ORDER BY child_id,term LIMIT 25 OFFSET ?', off)) if (kmap.has(r.child_id))
    copies.push(['subs', NEW.prepare("INSERT OR IGNORE INTO subs(child_id,term,parent_id,st,price,ref,receipt,at,trial,until,decided,by,note,promo,inv,app) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'words')")
      .bind(km(r.child_id), r.term, pm(r.parent_id), r.st, r.price || 0, r.ref || '', r.receipt || '', r.at, r.trial || 0, r.until, r.decided || 0, r.by || '', r.note || '', r.promo || '', r.inv || '')]);
  for (const r of await all(OLD, 'SELECT * FROM reports')) copies.push(['reports', NEW.prepare("INSERT OR IGNORE INTO reports(id,at,status,subject,unit,lesson,tab,page,ex,kind,comment,ctx,parent_id,device,done_at,app) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'words')")
    .bind(r.id, r.at, r.status, r.subject || '', r.unit || '', r.lesson || '', r.tab || '', r.page || '', r.ex || '', r.kind || '', r.comment || '', r.ctx || '{}', r.parent_id ? pm(r.parent_id) : '', r.device || '', r.done_at || 0)]);
  const oMsgs = await all(OLD, 'SELECT * FROM push_msgs ORDER BY id'), msgNew = [];   // new ids are made by the insert: kept in order to translate push_subs.last_msg afterwards
  for (const r of oMsgs) copies.push(['push_msgs', NEW.prepare("INSERT INTO push_msgs(at,title,body,url,sent,gone,app) VALUES(?,?,?,?,?,?,'words')").bind(r.at, r.title, r.body, r.url || '', r.sent || 0, r.gone || 0)]);
  const oPushSubs = await all(OLD, 'SELECT * FROM push_subs');
  rep.rows = {}; for (const [t] of copies) rep.rows[t] = (rep.rows[t] || 0) + 1; rep.rows.push_subs = oPushSubs.length; rep.rows.parents = oParents.length; rep.rows.children = oKids.length; rep.rows.subs_total = nSubs;
  const oSet = await all(OLD, "SELECT json,updated FROM settings WHERE key='app'");
  rep.rows.settings = oSet.length;
  if (dry) return J({ ok: true, dryRun: true, report: rep });
  const flush = async list => { for (let i = 0; i < list.length; i += 80) await NEW.batch(list.slice(i, i + 80)); };
  // safe to run again after a run that stopped half way: what a previous attempt copied (rows that have no key of their own) is removed first; Easy Words answers 'maintenance' meanwhile, so nothing else of it exists yet
  await NEW.batch(["DELETE FROM coin_events WHERE app='words'", "DELETE FROM push_msgs WHERE app='words'", "DELETE FROM push_subs WHERE app='words'"].map(q => NEW.prepare(q)));
  await flush(st);
  await flush(copies.filter(c => c[0] !== 'push_msgs').map(c => c[1]));
  for (const c of copies.filter(c => c[0] === 'push_msgs')) { const r = await c[1].run(); msgNew.push(r.meta.last_row_id); }
  const toNew = old => { let n = 0; oMsgs.forEach((m, i) => { if (m.id <= old) n = msgNew[i]; }); return n; };
  await flush(oPushSubs.map(r => NEW.prepare("INSERT OR IGNORE INTO push_subs(endpoint,created,last_msg,app) VALUES(?,?,?,'words')").bind(r.endpoint, r.created, toNew(r.last_msg || 0))));
  if (oSet[0]) await NEW.prepare("INSERT OR IGNORE INTO settings(key,json,updated) VALUES('app:words',?,?)").bind(oSet[0].json, oSet[0].updated || now()).run();
  await NEW.prepare("INSERT OR REPLACE INTO settings(key,json,updated) VALUES('merge-words-done',?,?)").bind(JSON.stringify({ at: now(), report: { ...rep, phoneMatches: rep.phoneMatches.length } }), now()).run();
  return J({ ok: true, dryRun: false, report: rep });
}

/* ---------- router ---------- */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), path = url.pathname, m = req.method, ip = req.headers.get('cf-connecting-ip') || '';
    if (!path.startsWith('/api/')) {
      if (!env.ASSETS) return new Response('Not found', { status: 404 });
      // ONE dashboard for both apps (2026-11-21): the Easy Words address sends the dashboard paths to the Easy Study dashboard, opened on the Easy Words side
      if (env.STUDY_ORIGIN && appOf(env) === 'words' && (path === '/admin.html' || path === '/admin' || path === '/admin/' || path === '/admin-words.html')) return Response.redirect(env.STUDY_ORIGIN.replace(/\/$/, '') + '/admin.html?app=words', 302);
      // Easy Words Worker (ROOT_PAGE=/words.html): the home address opens that page; everything else is served as it is
      if (env.ROOT_PAGE && (path === '/' || path === '/index.html')) return env.ASSETS.fetch(new URL(env.ROOT_PAGE, req.url).toString());
      if (env.ADMIN_PAGE && (path === '/admin.html' || path === '/admin' || path === '/admin/')) return env.ASSETS.fetch(new URL(env.ADMIN_PAGE, req.url).toString());   // Easy Words: its own dashboard page at the same address
      return env.ASSETS.fetch(req);
    }
    if (m === 'POST' || m === 'PUT') { const o = req.headers.get('origin'); if (o && o !== url.origin && !(env.DEV_CODES === '1')) return ERR('origin', 403); }
    try {
      if (path.startsWith('/api/')) await migrate(env);
      if (path === '/api/ping') return J({ ok: true, v: 1 });
      // the Easy Words Worker still holds the OLD database binding (WORDS_OLD) until its data is merged: it answers 'maintenance' (the app stays on its own copy) so nothing new lands in the shared database before the merge
      if (env.WORDS_OLD && appOf(env) === 'words' && !path.startsWith('/api/admin/') && !(await mergeDone(env))) return ERR('maintenance', 503);
      if (path === '/api/settings' && m === 'GET') { const S = await settings(env); delete S.promos; return J(S); }   // promo codes stay on the server
      if (path === '/api/report' && m === 'POST') return await reportIn(req, env, ip);
      if (path === '/api/push/key' && m === 'GET') return J({ ok: true, key: env.VAPID_PUBLIC || '' });
      if (path === '/api/push/latest' && m === 'GET') { const r = await env.DB.prepare('SELECT id,title,body,url FROM push_msgs WHERE app=? ORDER BY id DESC LIMIT 1').bind(appOf(env)).first(); return J({ ok: true, msg: r || null }); }
      if (path === '/api/push/sub' && m === 'POST') return await pushSub(req, env, ip, true);
      if (path === '/api/push/unsub' && m === 'POST') return await pushSub(req, env, ip, false);
      if (path === '/api/auth/start' && m === 'POST') return await authStart(req, env, ip);
      if (path === '/api/auth/verify' && m === 'POST') return await authVerify(req, env, ip);
      if (path === '/api/auth/login' && m === 'POST') return await authLogin(req, env, ip);
      if (path.startsWith('/api/admin/')) {
        if (!(await isAdmin(req, env))) return ERR('admin-only', 401);
        env = forApp(env, url.searchParams.get('app'));   // the dashboard picks the app per call (?app=study|words); without it, this Worker's own app
        if (path === '/api/admin/merge-words' && m === 'POST') return await mergeWords(req, env);
        if (path === '/api/admin/merge-words' && m === 'GET') { const d = await env.DB.prepare("SELECT json FROM settings WHERE key='merge-words-done'").first(); return J({ ok: true, hasOld: !!env.WORDS_OLD, done: d ? JSON.parse(d.json) : null }); }
        if (path === '/api/admin/settings' && m === 'GET') return J(await settings(env));   // full copy incl. promos, for the dashboard
        if (path === '/api/admin/settings' && m === 'PUT') { const b = await body(req); if (!b || !b.coins) return ERR('bad-body');
          await env.DB.prepare("INSERT INTO settings(key,json,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json,updated=excluded.updated").bind(appOf(env) === 'words' ? 'app:words' : 'app', JSON.stringify(b), now()).run(); return J({ ok: true }); }
        if (path === '/api/admin/user' && m === 'POST') return await adminUserAdd(req, env);
        if (path === '/api/admin/subs' && m === 'GET') return await adminSubs(env, url);
        if (path.startsWith('/api/admin/sub/') && (m === 'POST' || m === 'GET')) return await adminSub(req, env, path);
        if (path === '/api/admin/sub' && m === 'POST') return await adminSub(req, env, path);
        if (path === '/api/admin/accounts' && m === 'GET') return await adminAccounts(env, url);
        if (path === '/api/admin/stats' && m === 'GET') return await adminStats(env);
        if (path === '/api/admin/reports' && m === 'GET') return await adminReports(env, url);
        if (path === '/api/admin/push' && m === 'GET') return await adminPush(env);
        if (path === '/api/admin/push/send' && m === 'POST') return await adminPushSend(req, env);
        const pd = path.match(/^\/api\/admin\/push\/deliver\/(\d{1,12})$/); if (pd && m === 'POST') return await adminPushDeliver(env, +pd[1]);
        const rp = path.match(/^\/api\/admin\/report\/(r_[\w-]+)$/); if (rp && m === 'POST') return await adminReport(req, env, rp[1]);
        const ka = path.match(/^\/api\/admin\/user\/(p_\w+)\/kid$/); if (ka && m === 'POST') return await adminKidAdd(req, env, ka[1]);
        const ue = path.match(/^\/api\/admin\/user\/(p_\w+)(\/delete)?$/); if (ue && m === 'POST') return ue[2] ? await adminUserDelete(env, ue[1]) : await adminUserEdit(req, env, ue[1]);
        const ke = path.match(/^\/api\/admin\/kid\/(k\w+)$/); if (ke && m === 'POST') return await adminKidEdit(req, env, ke[1]);
        const kg = path.match(/^\/api\/admin\/kid\/(k\w+)\/grant$/); if (kg && m === 'POST') return await adminKidGrant(req, env, kg[1]);
        const ap = path.match(/^\/api\/admin\/parent\/(p_\w+)$/); if (ap && m === 'POST') return await adminParent(req, env, ap[1]);
        return ERR('not-found', 404);
      }
      const p = await who(req, env); if (!p) return ERR('signed-out', 401);
      if (p.blocked) return ERR('blocked', 403);
      if (path === '/api/ref' && m === 'POST') { const b = await body(req); const sh = b && b.code ? await env.DB.prepare('SELECT id, blocked FROM parents WHERE ref_code=? OR id=?').bind(clip(b.code, 24), clip(b.code, 24)).first() : null;
        if (sh && !sh.blocked && sh.id !== p.id) await env.DB.prepare('UPDATE parents SET pending_ref=? WHERE id=?').bind(sh.id, p.id).run(); return J({ ok: true }); }
      if (path === '/api/me' && m === 'GET') return J({ ok: true, me: await me(env, p.id) });
      if (path === '/api/me' && m === 'PUT') { const b = await body(req); if (!b) return ERR('bad-body');
        if (b.name) await env.DB.prepare('UPDATE parents SET name=? WHERE id=?').bind(clip(b.name, 60), p.id).run();
        const e = await contactUpdate(env, p.id, { email: b.email, phone: b.phone, notify: b.notify }); if (e) return ERR(e, e.endsWith('taken') ? 409 : 400);
        return J({ ok: true, me: await me(env, p.id) }); }
      if (path === '/api/auth/signout' && m === 'POST') { await env.DB.prepare('DELETE FROM sessions WHERE hash=?').bind(p.session).run(); return J({ ok: true }); }
      const kp = path.match(/^\/api\/kids\/(k\w+)(\/progress)?$/); if (kp) kp[1] = await kidId(env, kp[1]);
      if (kp && m === 'PUT') return kp[2] ? await kidProgress(req, env, p, kp[1]) : await kidPut(req, env, p, kp[1]);
      if (kp && m === 'DELETE' && !kp[2]) { await env.DB.prepare('UPDATE children SET deleted=1 WHERE id=? AND parent_id=?').bind(kp[1], p.id).run(); return J({ ok: true }); }
      const child = await kidId(env, clip(url.searchParams.get('child'), 32));
      if (path === '/api/wallet' && m === 'GET') return J({ ok: true, ...(await walletOf(env, p.id, child && await childOk(env, p, child) ? child : '')) });
      if (path === '/api/share' && m === 'POST') return await share(req, env, p, ip, child && await childOk(env, p, child) ? child : '');
      if (path === '/api/unlock' && m === 'POST') return await unlock(req, env, p, ip);
      if (path === '/api/pick' && m === 'POST') return await pick(req, env, p);
      if (path === '/api/subs' && m === 'GET') return await subsList(env, p);
      if (path === '/api/subs' && m === 'POST') return await subsIn(req, env, p);
      if (path === '/api/promo' && m === 'POST') return await promo(req, env, p, ip);
      return ERR('not-found', 404);
    } catch (e) { console.error(e); return ERR('server', 500); }
  },
};
