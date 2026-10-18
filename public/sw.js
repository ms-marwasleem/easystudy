/* PICTURES FROM THE LIBRARY — every picture of the app (anything under data/ ending .png/.jpg/.webp) is asked for here first.
   The picture library (Cloudflare Worker "easystudy-recorder", page pics.html) keeps the pictures Ahmed replaced, each under the file
   it replaces (its path under data/), or an alias (use the picture of another path). This file only decides what to answer; it never caches the app (only library pictures and their list are kept, per version number).
   Library down, slow (2.5 s) or picture not in it -> the file shipped inside the app, exactly as before. */
const LIB = 'https://easystudy-recorder.marwasleem.workers.dev';
let man = null, at = 0, pending = null;
const idOf = p => p.replace(/[\/:]/g, '~');
const EVERY = 60000;   // the list is asked for at most once a minute, and only after the child moved to another screen ('nav' message from the page)
async function stored() { try { const c = await caches.open('es-meta'), r = await c.match('pics-man'); return r ? await r.json() : null; } catch (e) { return null; } }
function refresh() {   // one small request for the list of replaced pictures
  if (pending) return pending;
  pending = Promise.race([fetch(LIB + '/pub/pics', { cache: 'no-cache' }).then(r => { if (!r.ok) throw 0; return r.json(); }), new Promise((_, no) => setTimeout(no, 2500))])
    .then(m => { man = m; caches.open('es-meta').then(c => c.put('pics-man', new Response(JSON.stringify(m)))).catch(() => {}); }).catch(() => { if (!man) man = {}; }).finally(() => { at = Date.now(); pending = null; });
  return pending;
}
async function sync() {   // saved list on the device is used as is; no request per picture
  if (pending) return pending;
  if (!man) { const s = await stored(); if (s) { man = s; at = 0; } }
  if (!man) return refresh();
  return;
}
self.addEventListener('message', e => { if (e.data === 'nav' && Date.now() - at > EVERY) refresh(); });   // child moved to another screen
async function pic(url) {   // picture bytes kept on the device per version; downloaded again only when its number changes
  try { const c = await caches.open('es-pics'), hit = await c.match(url); if (hit) return hit; const r = await fetch(url); if (r.ok) c.put(url, r.clone()).catch(() => {}); return r; } catch (e) { return fetch(url); }
}
async function answer(req, path) {
  await sync();
  let m = man[idOf(path)], p = path;
  if (m && m.alias) { p = m.alias; m = man[idOf(p)]; if (m && m.alias) m = null; }   // one step only
  if (m && !m.alias) {
    try { const r = await pic(`${LIB}/pub/p/${idOf(p)}?v=${m.ts}`); if (r.ok) return r; } catch (e) {}
  }
  if (p !== path) return fetch(new Request(new URL('data/' + p.split('/').map(encodeURIComponent).join('/'), self.registration.scope).href));   // alias of a shipped picture
  return fetch(req);
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  const m = /\/data\/(.+\.(?:png|jpe?g|webp))$/i.exec(u.pathname); if (!m) return;
  e.respondWith(answer(r, decodeURIComponent(m[1])).catch(() => fetch(r)));
});
