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
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const clip = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
const ITEM = /^(l:[\w-]{1,80}|u:[\w-]{1,40}:\d{1,3})$/;

async function body(req) { try { const t = await req.text(); if (t.length > 200000) return null; return t ? JSON.parse(t) : {}; } catch (e) { return null; } }

/* ---------- settings: D1 copy (saved from the dashboard) wins over the file bundled with the server ---------- */
async function settings(env) {
  const r = await env.DB.prepare("SELECT json FROM settings WHERE key='app'").first();
  let s; try { s = r ? JSON.parse(r.json) : null; } catch (e) { s = null; }
  // nothing saved from the dashboard yet = the app's own data/settings.json (served by the assets binding)
  if (!s && env.ASSETS) s = await env.ASSETS.fetch('https://assets/data/settings.json').then(r => r.ok ? r.json() : null).catch(() => null);
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
  if (env.DEV_CODES === '1') return { dev: code };
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) throw new Error('mail-not-set');
  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:18px;color:#333">
    <p>أهلًا ${name ? escapeHtml(name) : ''}،</p><p>كود الدخول لتطبيق EasyStudy:</p>
    <p style="font-size:34px;font-weight:bold;letter-spacing:8px;direction:ltr;text-align:center">${code}</p>
    <p style="color:#777;font-size:14px">الكود صالح لمدة ١٥ دقيقة. لو ما طلبتش الكود ده تجاهل الرسالة.</p></div>`;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [email], subject: `كود الدخول ${code} - EasyStudy`, html, text: `كود الدخول لتطبيق EasyStudy: ${code} (صالح ١٥ دقيقة)` }) });
  if (!r.ok) throw new Error('mail-failed ' + r.status);
  return {};
}
const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// POST /api/auth/start {email, name?} -> a 6-digit code to the email. Limits: 1 a minute, 6 a day per email, 30 a day per IP.
async function authStart(req, env, ip) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const email = clip(b.email, 254).toLowerCase(); if (!EMAIL.test(email)) return ERR('bad-email');
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
  return J({ ok: true, known, ...(out.dev ? { devCode: out.dev } : {}) });
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
  let p = await env.DB.prepare('SELECT * FROM parents WHERE email=?').bind(email).first(), isNew = false;
  if (p && p.blocked) return ERR('blocked', 403);
  const S = await settings(env), C = S.coins, d = day(t), stmts = [];
  if (!p) {
    isNew = true;
    const id = 'p_' + rnd(14); let ref = null;
    const sharer = b.ref ? await env.DB.prepare('SELECT id, blocked FROM parents WHERE ref_code=? OR id=?').bind(clip(b.ref, 24), clip(b.ref, 24)).first() : null;
    if (sharer && !sharer.blocked) ref = sharer.id;
    p = { id, email, name: clip(b.name, 60), phone: clip(b.phone, 20), curr: JSON.stringify(b.curr || {}), ref_code: rnd(7), ref_by: ref, bal: 0, blocked: 0, created: t, last_seen: t };
    const gift = Math.max(0, +C.startCoins || 0);
    p.bal = gift;
    stmts.push(env.DB.prepare('INSERT INTO parents(id,email,name,phone,curr,ref_code,ref_by,bal,blocked,created,last_seen) VALUES(?,?,?,?,?,?,?,?,0,?,?)')
      .bind(p.id, p.email, p.name, p.phone, p.curr, p.ref_code, p.ref_by, p.bal, t, t));
    if (gift) stmts.push(ev(env, p.id, 'gift', '', '', gift, t, device, ip));
    // referral: the sharer earns when a NEW parent registers from the link on a device never seen before (max per day = referral.maxPerDay)
    const R = C.referral || {}, rc = Math.max(0, +R.coins || 0);
    if (ref && R.on !== false && rc) {
      const seen = (device ? await env.DB.prepare('SELECT 1 FROM devices WHERE id=?').bind(device).first() : true)
        || (p.phone && await env.DB.prepare('SELECT 1 FROM parents WHERE phone=?').bind(p.phone).first());
      const todays = await env.DB.prepare("SELECT COUNT(*) n FROM coin_events WHERE parent_id=? AND kind='referral' AND day=?").bind(ref, d).first();
      if (!seen && (todays.n < (R.maxPerDay != null ? +R.maxPerDay : 10))) {
        stmts.push(ev(env, ref, 'referral', p.id, '', rc, t, device, ip), env.DB.prepare('UPDATE parents SET bal=bal+? WHERE id=?').bind(rc, ref));
      }
    }
  } else if (b.name || b.phone) {   // a known parent signing in again: keep the stored name unless it was empty
    if (!p.name && b.name) stmts.push(env.DB.prepare('UPDATE parents SET name=? WHERE id=?').bind(clip(b.name, 60), p.id));
    if (!p.phone && b.phone) stmts.push(env.DB.prepare('UPDATE parents SET phone=? WHERE id=?').bind(clip(b.phone, 20), p.id));
  }
  if (device) stmts.push(env.DB.prepare('INSERT OR IGNORE INTO devices(id,first_parent,created) VALUES(?,?,?)').bind(device, p.id, t));
  const tok = rnd(40, 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789');
  stmts.push(env.DB.prepare('INSERT INTO sessions(hash,parent_id,device,created,last_seen) VALUES(?,?,?,?,?)').bind(await sha('s:' + tok), p.id, device, t, t));
  await env.DB.batch(stmts);
  return J({ ok: true, token: tok, isNew, me: await me(env, p.id) });
}
const ev = (env, pid, kind, ref, child, amount, t, device, ip) =>
  env.DB.prepare('INSERT INTO coin_events(parent_id,kind,ref,child_id,amount,at,day,device,ip) VALUES(?,?,?,?,?,?,?,?,?)').bind(pid, kind, ref || '', child || '', amount, t, day(t), device || '', ip || '');

/* ---------- the parent's whole state (the app keeps a copy for offline) ---------- */
async function me(env, pid) {
  const [p, kids, un, w] = await Promise.all([
    env.DB.prepare('SELECT id,email,name,phone,curr,ref_code FROM parents WHERE id=?').bind(pid).first(),
    env.DB.prepare('SELECT id,name,grade,curr,progress,progress_at,created FROM children WHERE parent_id=? AND deleted=0 ORDER BY created').bind(pid).all(),
    env.DB.prepare('SELECT u.child_id,u.item,u.how FROM unlocks u JOIN children c ON c.id=u.child_id WHERE c.parent_id=?').bind(pid).all(),
    walletOf(env, pid, '')]);
  const pj = s => { try { return JSON.parse(s); } catch (e) { return {}; } };
  const pc = await env.DB.prepare('SELECT created FROM parents WHERE id=?').bind(pid).first();
  return { id: p.id, email: p.email, name: p.name, phone: p.phone, curr: pj(p.curr), ref: p.ref_code, created: new Date(pc.created).toISOString(), wallet: w.wallet,
    kids: kids.results.map(k => ({ id: k.id, name: k.name, grade: k.grade, curr: pj(k.curr), created: new Date(k.created).toISOString(), progress: pj(k.progress), progressAt: k.progress_at,
      unlocked: un.results.filter(u => u.child_id === k.id && (u.how === 'coins' || u.how === 'promo')).map(u => u.item), freeused: un.results.filter(u => u.child_id === k.id && u.how === 'free').map(u => u.item) })) };
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
    .bind(id, p.id, name, clip(b.grade, 10) || 'p1', JSON.stringify(b.curr || {}), now()).run();
  return J({ ok: true });
}
// PUT /api/kids/<id>/progress {progress:{key: string}, at} : newest copy wins (at = when the device saved it)
const PROG_KEYS = ['zoom-stars', 'zoom-opened', 'zoom-last', 'zoom-vocab'];
async function kidProgress(req, env, p, id) {
  const b = await body(req); if (!b || typeof b.progress !== 'object') return ERR('bad-body');
  const k = await env.DB.prepare('SELECT parent_id, progress_at FROM children WHERE id=?').bind(id).first();
  if (!k || k.parent_id !== p.id) return ERR('not-yours', 403);
  const at = Math.min(+b.at || now(), now()); if (at <= k.progress_at) return J({ ok: true, older: true });
  const keep = {}; PROG_KEYS.forEach(x => { if (typeof b.progress[x] === 'string') keep[x] = b.progress[x].slice(0, 60000); });
  await env.DB.prepare('UPDATE children SET progress=?, progress_at=? WHERE id=?').bind(JSON.stringify(keep), at, id).run();
  return J({ ok: true });
}

/* ---------- coins (client contract: app/docs/coins-and-admin.md §5; every answer = {wallet, unlocked, freeused} of the child) ---------- */
async function walletOf(env, pid, child) {
  const [p, hist, un] = await Promise.all([
    env.DB.prepare('SELECT bal FROM parents WHERE id=?').bind(pid).first(),
    env.DB.prepare('SELECT kind,ref,child_id,amount,at FROM coin_events WHERE parent_id=? ORDER BY at DESC LIMIT 200').bind(pid).all(),
    child ? env.DB.prepare('SELECT u.item,u.how FROM unlocks u JOIN children c ON c.id=u.child_id WHERE u.child_id=? AND c.parent_id=?').bind(child, pid).all() : { results: [] }]);
  const last = {}, H = hist.results.slice().reverse();
  H.forEach(h => { if (h.kind === 'share') last[h.ref] = h.at; });
  return { wallet: { bal: p ? p.bal : 0, last, hist: H.map(h => ({ k: h.kind, n: h.amount, at: h.at, ...(h.kind === 'share' ? { t: h.ref } : h.ref ? { id: h.ref } : {}), ...(h.child_id ? { child: h.child_id } : {}) })) },
    ...(child ? { unlocked: un.results.filter(u => u.how === 'coins' || u.how === 'promo').map(u => u.item), freeused: un.results.filter(u => u.how === 'free').map(u => u.item) } : {}) };
}
const childOk = async (env, p, child) => { const k = child && await env.DB.prepare('SELECT parent_id FROM children WHERE id=? AND deleted=0').bind(child).first(); return !!k && k.parent_id === p.id; };
// the subject of an item id: u:<subject>:<unit>, l:<subject>-<folder> (subject ids can hold "-", folders never do)
const subjectOf = item => item[0] === 'u' ? item.split(':')[1] : item.slice(2, item.lastIndexOf('-'));

// POST /api/share {type, device}: pays the share type's coins once per cooldownH, at most dailyCap a day per parent
// (and 3 x dailyCap a day per IP, so one person with many accounts can't farm).
async function share(req, env, p, ip, child) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const S = await settings(env), C = S.coins, t = now(), d = day(t);
  const T = (C.shares || []).find(x => x.id === b.type && x.on);
  let pay = 0;
  if (C.enabled && T) {
    const last = await env.DB.prepare("SELECT MAX(at) at FROM coin_events WHERE parent_id=? AND kind='share' AND ref=?").bind(p.id, T.id).first();
    if (!(last && last.at && t - last.at < (+T.cooldownH || 0) * 3600e3)) {
      const cap = C.dailyCap != null ? +C.dailyCap : 1e9;
      const got = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) n FROM coin_events WHERE parent_id=? AND kind='share' AND day=?").bind(p.id, d).first();
      const byIp = ip ? await env.DB.prepare("SELECT COALESCE(SUM(amount),0) n FROM coin_events WHERE ip=? AND kind='share' AND day=?").bind(ip, d).first() : { n: 0 };
      pay = Math.max(0, Math.min(+T.coins || 0, cap - got.n, cap * 3 - byIp.n));
    }
  }
  if (pay) await env.DB.batch([ev(env, p.id, 'share', T.id, '', pay, t, clip(b.device, 40), ip), env.DB.prepare('UPDATE parents SET bal=bal+? WHERE id=?').bind(pay, p.id)]);
  return J({ ok: true, paid: pay, ...(await walletOf(env, p.id, child)) });
}
// the price of an item: the admin's own price, else lessonCost / unitCost (never the app's price)
const priceOf = (S, item) => { const it = S.items[item] || {}; return it.coins != null ? +it.coins : item[0] === 'u' ? +S.coins.unitCost || 0 : +S.coins.lessonCost || 0; };
async function itemCheck(req, env, p) {
  const b = await body(req); if (!b) return { e: ERR('bad-body') };
  const item = clip(b.id, 90), child = clip(b.child, 32);
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
  if (!(await env.DB.prepare('SELECT 1 FROM unlocks WHERE child_id=? AND item=?').bind(child, item).first())) {
    const cost = priceOf(S, item); if (!(cost > 0)) return ERR('no-price', 409);
    // the UPDATE itself checks the balance, so two taps at once can't spend twice
    const r = await env.DB.prepare('UPDATE parents SET bal=bal-? WHERE id=? AND bal>=?').bind(cost, p.id, cost).run();
    if (!r.meta.changes) return ERR('not-enough', 402, await walletOf(env, p.id, child));
    await env.DB.batch([ev(env, p.id, item[0] === 'u' ? 'unlock-unit' : 'unlock-lesson', item, child, -cost, t, '', ip),
      env.DB.prepare("INSERT OR IGNORE INTO unlocks(child_id,item,subject,how,coins,at) VALUES(?,?,?,'coins',?,?)").bind(child, item, subject, cost, t)]);
  }
  return J({ ok: true, ...(await walletOf(env, p.id, child)) });
}
// POST /api/pick {child, id}: a free pick while access.free (mode pick / pickUnit, count, perSubject) leaves one
async function pick(req, env, p) {
  const x = await itemCheck(req, env, p); if (x.e) return x.e;
  const { item, child, S, subject } = x;
  if (!(await env.DB.prepare('SELECT 1 FROM unlocks WHERE child_id=? AND item=?').bind(child, item).first())) {
    const F = (S.access && S.access.free) || {}, want = item[0] === 'u' ? 'pickUnit' : 'pick';
    if (F.mode !== want) return ERR('no-free', 409);
    const used = await env.DB.prepare("SELECT COUNT(*) n FROM unlocks WHERE child_id=? AND how='free'" + (F.perSubject ? ' AND subject=?' : '')).bind(...(F.perSubject ? [child, subject] : [child])).first();
    if (used.n >= (+F.count || 0)) return ERR('no-free-left', 409, await walletOf(env, p.id, child));
    await env.DB.prepare("INSERT INTO unlocks(child_id,item,subject,how,coins,at) VALUES(?,?,?,'free',0,?)").bind(child, item, subject, now()).run();
  }
  return J({ ok: true, ...(await walletOf(env, p.id, child)) });
}

/* ---------- promo codes (Marwa 2026-11-05; app/docs/coins-and-admin.md §7) ----------
   POST /api/promo {child, code}: settings.promos = [{code, what: lesson|unit|subject|all, target, uses: once|many, max, until, on}].
   once = one use in total (any parent); many = each child once, at most max in total (0 = no limit). until = last day (Cairo).
   Opens for the child: the lesson / unit id, 's:<subject>' or '*'. Costs nothing; a 0-credit 'promo' coin event keeps the history. */
const promoNorm = c => String(c || '').toUpperCase().replace(/[\s\-_]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
async function promo(req, env, p, ip) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const child = clip(b.child, 32), c = promoNorm(clip(b.code, 40));
  if (!c) return ERR('empty');
  if (!(await childOk(env, p, child))) return ERR('not-yours', 403);
  // a few wrong tries are fine; many from one parent in a day = guessing
  const lk = 'promo:' + p.id + ':' + day(), tries = await env.DB.prepare('SELECT n FROM limits WHERE key=?').bind(lk).first();
  if (tries && tries.n >= 20) return ERR('slow', 429);
  const S = await settings(env), P = (S.promos || []).find(x => promoNorm(x.code) === c);
  const bad = async e => { await env.DB.prepare('INSERT INTO limits(key,n,day) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1').bind(lk, day()).run(); return ERR(e, 409); };
  if (!P || P.on === false || (P.what !== 'all' && !P.target)) return bad('bad');
  if (P.until && day() > P.until) return ERR('old', 409);
  if (await env.DB.prepare('SELECT 1 FROM promo_uses WHERE code=? AND child_id=?').bind(c, child).first()) return ERR('used', 409);
  const used = (await env.DB.prepare('SELECT COUNT(*) n FROM promo_uses WHERE code=?').bind(c).first()).n;
  if (P.uses !== 'many' && used >= 1) return ERR('used', 409);
  if (P.uses === 'many' && +P.max > 0 && used >= +P.max) return ERR('full', 409);
  const item = P.what === 'all' ? '*' : P.what === 'subject' ? 's:' + P.target : P.target, t = now();
  if (!/^(\*|s:[\w-]{1,40})$/.test(item) && !ITEM.test(item)) return bad('bad');
  const subject = item === '*' ? '' : item[0] === 's' ? item.slice(2) : subjectOf(item);
  // the INSERT itself checks the count (and the primary key code+child), so two uses at the same moment can't pass the limit
  const cap = P.uses === 'many' ? (+P.max > 0 ? +P.max : 1e9) : 1;
  const r = await env.DB.prepare('INSERT OR IGNORE INTO promo_uses(code,parent_id,child_id,item,at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM promo_uses WHERE code=?) < ?')
    .bind(c, p.id, child, item, t, c, cap).run();
  if (!r.meta.changes) return ERR(P.uses === 'many' ? 'full' : 'used', 409);
  await env.DB.batch([env.DB.prepare("INSERT OR IGNORE INTO unlocks(child_id,item,subject,how,coins,at) VALUES(?,?,?,'promo',0,?)").bind(child, item, subject, t),
    ev(env, p.id, 'promo', item, child, 0, t, '', ip)]);
  return J({ ok: true, promo: { what: P.what, target: P.target || '' }, ...(await walletOf(env, p.id, child)) });
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
  const rows = (await env.DB.prepare(`SELECT p.id,p.email,p.name,p.phone,p.curr,p.ref_by,p.bal,p.blocked,p.created,p.last_seen,
      (SELECT COUNT(*) FROM parents r WHERE r.ref_by=p.id) referred,
      (SELECT COUNT(*) FROM coin_events e WHERE e.parent_id=p.id AND e.kind='referral') referred_paid
    FROM parents p WHERE p.created>=? AND (?='' OR p.email LIKE ? OR p.name LIKE ? OR p.phone LIKE ?) ORDER BY p.created DESC LIMIT ?`)
    .bind(since, q, '%' + q + '%', '%' + q + '%', '%' + q + '%', lim).all()).results;
  const kids = rows.length ? (await env.DB.prepare(`SELECT parent_id,name,grade FROM children WHERE deleted=0 AND parent_id IN (${rows.map(() => '?').join(',')}) ORDER BY created`).bind(...rows.map(r => r.id)).all()).results : [];
  const pj = s => { try { return JSON.parse(s); } catch (e) { return {}; } };
  return J({ ok: true, accounts: rows.map(r => ({ ...r, curr: pj(r.curr), created: new Date(r.created).toISOString(), last_seen: new Date(r.last_seen).toISOString(),
    kids: kids.filter(k => k.parent_id === r.id).map(k => ({ name: k.name, grade: k.grade })) })) });
}
// GET /api/admin/stats -> {hist:[{k,t,id,n,at,parent}] latest 500, totals, byDay (last 14 days)}
async function adminStats(env) {
  const one = (sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const [parents, week, kids, active, hist, byDay] = await Promise.all([
    one('SELECT COUNT(*) n FROM parents'), one('SELECT COUNT(*) n FROM parents WHERE created>=?', now() - 7 * 864e5),
    one('SELECT COUNT(*) n FROM children WHERE deleted=0'), one('SELECT COUNT(*) n FROM parents WHERE last_seen>=?', now() - 7 * 864e5),
    env.DB.prepare('SELECT e.kind,e.ref,e.amount,e.at,e.child_id,p.name FROM coin_events e JOIN parents p ON p.id=e.parent_id ORDER BY e.at DESC LIMIT 500').all(),
    env.DB.prepare("SELECT day, SUM(kind='share') shares, SUM(kind='referral') referrals, SUM(kind='gift') signups, SUM(CASE WHEN amount<0 THEN -amount ELSE 0 END) spent FROM coin_events WHERE day>=? GROUP BY day ORDER BY day").bind(day(now() - 13 * 864e5)).all()]);
  const promoUses = (await env.DB.prepare('SELECT code, COUNT(*) n FROM promo_uses GROUP BY code').all()).results;
  return J({ ok: true, totals: { parents: parents.n, week: week.n, kids: kids.n, active7: active.n }, byDay: byDay.results, promoUses,
    hist: hist.results.map(h => ({ k: h.kind, n: h.amount, at: h.at, parent: h.name, ...(h.kind === 'share' ? { t: h.ref } : h.ref ? { id: h.ref } : {}) })) });
}
// POST /api/admin/parent/<id> {blocked?, coins?(+/-), note?}
async function adminParent(req, env, id) {
  const b = await body(req); if (!b) return ERR('bad-body');
  const p = await env.DB.prepare('SELECT id FROM parents WHERE id=?').bind(id).first(); if (!p) return ERR('not-found', 404);
  const st = [];
  if (b.blocked != null) { st.push(env.DB.prepare('UPDATE parents SET blocked=? WHERE id=?').bind(b.blocked ? 1 : 0, id)); if (b.blocked) st.push(env.DB.prepare('DELETE FROM sessions WHERE parent_id=?').bind(id)); }
  const n = Math.trunc(+b.coins || 0);
  if (n) st.push(ev(env, id, 'admin', clip(b.note, 80), '', n, now(), '', ''), env.DB.prepare('UPDATE parents SET bal=MAX(0,bal+?) WHERE id=?').bind(n, id));
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
  const r = await env.DB.prepare('INSERT OR IGNORE INTO reports(id,at,status,subject,unit,lesson,tab,page,ex,kind,comment,ctx,parent_id,device) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, Math.min(t, +b.at || t), 'open', clip(c.subject, 40), num(c.unit), clip(c.lesson, 60), clip(c.tab, 20), num(c.page), num(c.ex), clip(b.kind, 30), clip(b.comment, 1000), ctx, p ? p.id : '', dev).run();
  const inc = [ip ? env.DB.prepare('INSERT INTO limits(key,n,day) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1').bind(kIp, d) : null,
    dev ? env.DB.prepare('INSERT INTO limits(key,n,day) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1').bind(kDev, d) : null].filter(Boolean);
  if (r.meta.changes && inc.length) await env.DB.batch(inc);
  return J({ ok: true });
}
// GET /api/admin/reports?status=open|done|all&subject=<id> -> {reports:[{id,at,status,subject,unit,lesson,tab,page,ex,kind,comment,ctx,parent,device,done_at}]} newest first, at most 500
async function adminReports(env, url) {
  const st = url.searchParams.get('status') || 'open', sj = clip(url.searchParams.get('subject'), 40);
  const rows = (await env.DB.prepare(`SELECT r.*, p.name parent FROM reports r LEFT JOIN parents p ON p.id=r.parent_id WHERE (?='all' OR r.status=?) AND (?='' OR r.subject=?) ORDER BY r.at DESC LIMIT 500`).bind(st, st, sj, sj).all()).results;
  const open = (await env.DB.prepare("SELECT COUNT(*) n FROM reports WHERE status='open'").first()).n;
  const pj = s => { try { return JSON.parse(s); } catch (e) { return {}; } };
  return J({ ok: true, open, reports: rows.map(r => ({ ...r, ctx: pj(r.ctx), parent_id: undefined })) });
}
// POST /api/admin/report/<id> {status}
async function adminReport(req, env, id) {
  const b = await body(req); if (!b || !['open', 'done'].includes(b.status)) return ERR('bad-body');
  const r = await env.DB.prepare('UPDATE reports SET status=?, done_at=? WHERE id=?').bind(b.status, b.status === 'done' ? now() : 0, id).run();
  return r.meta.changes ? J({ ok: true }) : ERR('not-found', 404);
}

/* ---------- router ---------- */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), path = url.pathname, m = req.method, ip = req.headers.get('cf-connecting-ip') || '';
    if (!path.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Not found', { status: 404 });
    if (m === 'POST' || m === 'PUT') { const o = req.headers.get('origin'); if (o && o !== url.origin && !(env.DEV_CODES === '1')) return ERR('origin', 403); }
    try {
      if (path === '/api/ping') return J({ ok: true, v: 1 });
      if (path === '/api/settings' && m === 'GET') { const S = await settings(env); delete S.promos; return J(S); }   // promo codes stay on the server
      if (path === '/api/report' && m === 'POST') return await reportIn(req, env, ip);
      if (path === '/api/auth/start' && m === 'POST') return await authStart(req, env, ip);
      if (path === '/api/auth/verify' && m === 'POST') return await authVerify(req, env, ip);
      if (path.startsWith('/api/admin/')) {
        if (!(await isAdmin(req, env))) return ERR('admin-only', 401);
        if (path === '/api/admin/settings' && m === 'PUT') { const b = await body(req); if (!b || !b.coins) return ERR('bad-body');
          await env.DB.prepare("INSERT INTO settings(key,json,updated) VALUES('app',?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json,updated=excluded.updated").bind(JSON.stringify(b), now()).run(); return J({ ok: true }); }
        if (path === '/api/admin/accounts' && m === 'GET') return await adminAccounts(env, url);
        if (path === '/api/admin/stats' && m === 'GET') return await adminStats(env);
        if (path === '/api/admin/reports' && m === 'GET') return await adminReports(env, url);
        const rp = path.match(/^\/api\/admin\/report\/(r_[\w-]+)$/); if (rp && m === 'POST') return await adminReport(req, env, rp[1]);
        const ap = path.match(/^\/api\/admin\/parent\/(p_\w+)$/); if (ap && m === 'POST') return await adminParent(req, env, ap[1]);
        return ERR('not-found', 404);
      }
      const p = await who(req, env); if (!p) return ERR('signed-out', 401);
      if (p.blocked) return ERR('blocked', 403);
      if (path === '/api/me' && m === 'GET') return J({ ok: true, me: await me(env, p.id) });
      if (path === '/api/me' && m === 'PUT') { const b = await body(req); if (!b) return ERR('bad-body');
        await env.DB.prepare('UPDATE parents SET name=COALESCE(NULLIF(?,\'\'),name), phone=? WHERE id=?').bind(clip(b.name, 60), clip(b.phone, 20), p.id).run(); return J({ ok: true }); }
      if (path === '/api/auth/signout' && m === 'POST') { await env.DB.prepare('DELETE FROM sessions WHERE hash=?').bind(p.session).run(); return J({ ok: true }); }
      const kp = path.match(/^\/api\/kids\/(k\w+)(\/progress)?$/);
      if (kp && m === 'PUT') return kp[2] ? await kidProgress(req, env, p, kp[1]) : await kidPut(req, env, p, kp[1]);
      if (kp && m === 'DELETE' && !kp[2]) { await env.DB.prepare('UPDATE children SET deleted=1 WHERE id=? AND parent_id=?').bind(kp[1], p.id).run(); return J({ ok: true }); }
      const child = clip(url.searchParams.get('child'), 32);
      if (path === '/api/wallet' && m === 'GET') return J({ ok: true, ...(await walletOf(env, p.id, child && await childOk(env, p, child) ? child : '')) });
      if (path === '/api/share' && m === 'POST') return await share(req, env, p, ip, child && await childOk(env, p, child) ? child : '');
      if (path === '/api/unlock' && m === 'POST') return await unlock(req, env, p, ip);
      if (path === '/api/pick' && m === 'POST') return await pick(req, env, p);
      if (path === '/api/promo' && m === 'POST') return await promo(req, env, p, ip);
      return ERR('not-found', 404);
    } catch (e) { console.error(e); return ERR('server', 500); }
  },
};
