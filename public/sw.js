/* PICTURES FROM THE LIBRARY — every picture of the app (anything under data/ ending .png/.jpg/.webp) is asked for here first.
   The picture library (Cloudflare Worker "easystudy-recorder", page pics.html) keeps the pictures Ahmed replaced, each under the file
   it replaces (its path under data/), or an alias (use the picture of another path). This file only decides what to answer; it never caches the app.
   Library down, slow (2.5 s) or picture not in it -> the file shipped inside the app, exactly as before. */
const LIB = 'https://easystudy-recorder.marwasleem.workers.dev';
let man = null, at = 0, pending = null;
const idOf = p => p.replace(/[\/:]/g, '~');
function sync() {   // the small list of replaced pictures, refreshed when older than 20 s so a change in the library shows up quickly
  if (pending) return pending;
  if (man && Date.now() - at < 20000) return Promise.resolve();
  pending = Promise.race([fetch(LIB + '/pub/pics', { cache: 'no-cache' }).then(r => { if (!r.ok) throw 0; return r.json(); }), new Promise((_, no) => setTimeout(no, 2500))])
    .then(m => { man = m; }).catch(() => { if (!man) man = {}; }).finally(() => { at = Date.now(); pending = null; });
  return pending;
}
async function answer(req, path) {
  await sync();
  let m = man[idOf(path)], p = path;
  if (m && m.alias) { p = m.alias; m = man[idOf(p)]; if (m && m.alias) m = null; }   // one step only
  if (m && !m.alias) {
    try { const r = await fetch(`${LIB}/pub/p/${idOf(p)}?v=${m.ts}`); if (r.ok) return r; } catch (e) {}
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
