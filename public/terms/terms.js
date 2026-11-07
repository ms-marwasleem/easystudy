// TERMS OF USE page (terms.html): builds the page from data/terms.json (text, ar + en) and data/credits.json (sources). ?lang=en for English.
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const link = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t || u)}</a>`;
  const q = new URLSearchParams(location.search).get('lang');
  let lang = q === 'en' || q === 'ar' ? q : ((navigator.language || '').startsWith('ar') ? 'ar' : 'en');
  let T = null, C = null;
  function sources(L) {
    return '<ul class="tm-src">' + (C.sources || []).map(s => {
      const kinds = (s.kinds || []).map(k => `<span>${esc(L.kinds[k] || k)}</span>`).join('');
      const items = (s.items || []).length ? '<ul class="tm-items">' + s.items.map(i => `<li>${esc(i.what || i.file)}: ${link(i.link)}</li>`).join('') + '</ul>' : '';
      return `<li><b>${link(s.url, s.name)}</b><span class="tm-kinds">${kinds}</span>`
        + `<p>${esc((s.usedFor || {})[lang])}</p>`
        + `<small>${esc(L.licenceLabel)}: ${esc((s.licence || {})[lang])}</small>`
        + (s.credit ? `<small class="tm-credit">${link(s.url, s.credit)}</small>` : '') + items + '</li>';
    }).join('') + '</ul>';
  }
  function draw() {
    const L = T[lang], el = document.getElementById('tm');
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = 'EasyStudy · ' + L.title;
    document.querySelectorAll('.tm-lang button').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
    const last = L.sections.length - 1;
    el.innerHTML = `<h1>${esc(L.title)}</h1><p class="tm-date">${esc(L.updatedLabel)}: <bdi>${esc(T.updated)}</bdi></p>`
      + L.sections.map((s, i) => `<section><h2>${esc(s.h)}</h2>${(s.p || []).map(p => `<p>${esc(p)}</p>`).join('')}`
        + (s.credits ? sources(L) : '')
        + (i === last && T.contactEmail ? `<p>${link('mailto:' + T.contactEmail, T.contactEmail)}</p>` : '') + '</section>').join('');
  }
  document.querySelectorAll('.tm-lang button').forEach(b => b.onclick = () => {
    lang = b.dataset.l; draw();
    try { history.replaceState(null, '', '?lang=' + lang); } catch (e) {}
  });
  Promise.all(['data/terms.json', 'data/credits.json'].map(f => fetch(f, { cache: 'no-cache' }).then(r => r.json())))
    .then(([t, c]) => { T = t; C = c; draw(); })
    .catch(() => { document.getElementById('tm').textContent = 'Could not load the page. Please try again.'; });
})();
