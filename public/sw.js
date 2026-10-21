/* THE APP ON THE DEVICE + PICTURES FROM THE LIBRARY — every request of the app passes here.
   1. Keeping the app on the device: every file the app uses (page, design, code, lesson files, sounds, pictures, fonts) is kept on the
      device the first time it is downloaded, and later opens take it from there at once, even with a slow or no internet.
      Kept per published version: version.json (written by sync.sh) names the newest version, media.json lists every sound/picture with a
      fingerprint. When the page sees a newer version (lib.js appNav) it asks this file to 'update': the kept page/design/code/lesson files are
      dropped, and only the sounds/pictures whose fingerprint changed; then the page reloads with the new version. Never an old app after a publish.
      A local copy (no version.json, e.g. a preview) is never served from the device first: it always downloads, the kept copy is only for no internet.
   2. Pictures from the library: anything under data/ ending .png/.jpg/.webp is first looked up in the picture library (Cloudflare Worker
      "easystudy-recorder", page pics.html), which keeps the pictures Ahmed replaced, each under the file it replaces (its path under data/),
      or an alias (use the picture of another path). The list of replaced pictures is kept on the device; nothing ever waits for it:
      while it is not known yet, or the library is down, the file shipped inside the app is shown. */
const LIB = 'https://easystudy-recorder.marwasleem.workers.dev';
const APP = 'es-app', MEDIA = 'es-media', EXT = 'es-ext';
const SCOPE = new URL(self.registration.scope).pathname;
const at_ = p => new URL(p, self.registration.scope).href;

// ---------- 1. keeping the app on the device ----------
let ver = null, verReady = null;   // {v, files} of the app copy kept on the device; null = local copy (no version.json) or not known yet
async function meta(key, val) {
  const c = await caches.open('es-meta');
  if (val === undefined) { const r = await c.match(key); return r ? r.json() : null; }
  await c.put(key, new Response(JSON.stringify(val)));
}
async function latest() {   // the newest published version and its list of sounds/pictures (null on a local copy or without internet)
  const r = await fetch(at_('version.json'), { cache: 'no-store' }); if (!r.ok) return null;
  const v = await r.json(); if (!v || !v.v) return null;
  let files = null; try { const f = await fetch(at_('media.json'), { cache: 'no-store' }); if (f.ok) files = await f.json(); } catch (e) {}
  return { v: v.v, files };
}
function loadVer() {
  return verReady || (verReady = (async () => {
    try { ver = await meta('app-ver'); } catch (e) {}
    if (!ver) { try { ver = await latest(); if (ver) await meta('app-ver', ver); } catch (e) {} }
  })().finally(() => { if (!ver) setTimeout(() => { verReady = null; }, 60000); }));   // not known (local copy / no internet): asked again a minute later
}
async function update() {   // the page saw a newer version: drop what changed, keep the rest
  const nv = await latest(); if (!nv) return;
  await caches.delete(APP);
  const mc = await caches.open(MEDIA), same = ver && ver.files && nv.files;
  for (const k of await mc.keys()) {
    const p = decodeURIComponent(new URL(k.url).pathname).slice(SCOPE.length);
    if (!same || nv.files[p] !== ver.files[p]) await mc.delete(k);
  }
  ver = nv; await meta('app-ver', ver);
}
// a kept file at once; otherwise downloaded and kept. On a local copy: always downloaded, the kept one only when there is no internet
async function keep(name, req, key) {
  await loadVer();
  const c = await caches.open(name), k = key || req;
  if (ver || name === EXT) { const hit = await c.match(k); if (hit) return hit; }
  try {
    let r = await fetch(req, name === APP ? { cache: 'no-cache' } : undefined);
    if (r.redirected) r = new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers });   // a page may not be answered with a redirect
    if (r.ok || r.type === 'opaque') c.put(k, r.clone()).catch(() => {});
    return r;
  } catch (e) { const hit = await c.match(k); if (hit) return hit; throw e; }
}

// ---------- 2. pictures from the library ----------
let man = null, at = 0, pending = null;
const idOf = p => p.replace(/[\/:]/g, '~');
const EVERY = 60000;   // the list is asked for at most once a minute, and only after the child moved to another screen ('nav' message from the page)
async function stored() { try { return await meta('pics-man'); } catch (e) { return null; } }
function refresh() {   // one small request for the list of replaced pictures, in the background
  if (pending) return pending;
  pending = Promise.race([fetch(LIB + '/pub/pics', { cache: 'no-cache' }).then(r => { if (!r.ok) throw 0; return r.json(); }), new Promise((_, no) => setTimeout(no, 2500))])
    .then(m => { man = m; meta('pics-man', m).catch(() => {}); }).catch(() => { if (!man) man = {}; }).finally(() => { at = Date.now(); pending = null; });
  return pending;
}
async function sync() {   // the saved list is used as is; no picture ever waits for the library
  if (!man) { const s = await stored(); if (s) { man = s; at = 0; } }
  if (!man) refresh();
}
async function pic(url) {   // picture bytes kept on the device per version; downloaded again only when its number changes
  try { const c = await caches.open('es-pics'), hit = await c.match(url); if (hit) return hit; const r = await fetch(url); if (r.ok) c.put(url, r.clone()).catch(() => {}); return r; } catch (e) { return fetch(url); }
}
async function answer(req, path) {
  await sync();
  let m = man && man[idOf(path)], p = path;
  if (m && m.alias) { p = m.alias; m = man[idOf(p)]; if (m && m.alias) m = null; }   // one step only
  if (m && !m.alias) {
    try { const r = await pic(`${LIB}/pub/p/${idOf(p)}?v=${m.ts}`); if (r.ok) return r; } catch (e) {}
  }
  if (p !== path) return keep(MEDIA, new Request(at_('data/' + p.split('/').map(encodeURIComponent).join('/'))));   // alias of a shipped picture
  return keep(MEDIA, req);
}

self.addEventListener('message', e => {
  if (e.data === 'nav' && Date.now() - at > EVERY) refresh();   // child moved to another screen
  if (e.data === 'update') e.waitUntil(update().catch(() => {}).finally(() => { if (e.ports[0]) e.ports[0].postMessage('ok'); }));
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || r.headers.has('range')) return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) {   // fonts and the animation library: same address = same file, kept for good
    if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(u.hostname)) e.respondWith(keep(EXT, r).catch(() => fetch(r)));
    return;
  }
  if (!u.pathname.startsWith(SCOPE)) return;
  const rel = decodeURIComponent(u.pathname.slice(SCOPE.length));
  if (/^(version\.json|media\.json|sw\.js)$/.test(rel)) return;   // always asked fresh
  const m = /^data\/(.+\.(?:png|jpe?g|webp))$/i.exec(rel);
  if (m) e.respondWith(answer(r, m[1]).catch(() => fetch(r)));
  else if (r.mode === 'navigate') e.respondWith((rel === '' || rel === 'index.html' ? keep(APP, new Request(at_('./')), at_('index.html')) : keep(APP, r)).catch(() => fetch(r)));
  else if (/\.(mp3|wav|ogg|m4a|png|jpe?g|webp|gif|svg|woff2?|ttf)$/i.test(rel)) e.respondWith(keep(MEDIA, r).catch(() => fetch(r)));
  else e.respondWith(keep(APP, r).catch(() => fetch(r)));
});
