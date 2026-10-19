/* BOOK PAGES — jump to the part of the app that matches a page of the school book.
   Each lesson in subject.json can say which book pages each tab covers:
     "pages": { "read": [8], "words": [9], "quiz": [10, 11], "workbook": [4, 5] }
   (read / words / quiz = pages of the student's Book; workbook = pages of the Workbook, they open the Workbook questions)
   A round book button (map + lesson headers) opens a number pad; Go opens that lesson and tab
   (for Questions, at the first question from that page). The lesson header shows the page of the tab in use. */
function bookIndex(){
  const out=[]; (COURSE&&COURSE.subjects||[]).filter(s=>s.lessons).forEach(s=>s.lessons.forEach(l=>{
    if(!l.file||!l.pages) return;
    Object.entries(l.pages).forEach(([t,ps])=>[].concat(ps).forEach(p=>out.push({page:+p,tab:t,lesson:l,subject:s})));
  }));
  return out;
}
const TABNAME={read:'Lesson',words:'Vocabulary',quiz:'Questions',workbook:'PTS',booklet:'Booklet',grammar:'Grammar'};

// the book page of the tab in use, in the same style and spot as the page on the Questions sheet:
// pinned to the top-right corner of the stage in every tab (on the Lesson picture it sits on a small paper chip, or in the reading card's corner when the card or the book picture is there). Questions show their own page per question set.
function bookTag(){
  const old=$('#pageTag'); if(old) old.remove();
  if(!LESSON||inQ()) return;
  const m=SUBJECT&&SUBJECT.lessons.find(l=>l.id===LESSON.id), ps=m&&m.pages&&[].concat(m.pages[tab]||[]);
  if(!(ps&&ps.length)) return;
  // a lesson read in several pages: show the book page of the page on screen (lesson.json "pageNums" can list them when they differ from the book pages)
  const np=tab==='read'&&LESSON.pages>1?LESSON.pages:0, pn=np&&(LESSON.pageNums||ps), one=np?pn[Math.min(rd.page-1,pn.length-1)]:null;
  const n=np?one:ps.length>1?ps[0]+'–'+ps[ps.length-1]:ps[0], t=el('button','qpage pagetag',ICON.book+`<span>${isAr()?'ص ':'p. '}${num(n)}</span>`);
  t.id='pageTag'; t.setAttribute('aria-label','Book page '+n); t.addEventListener('click',()=>bookPad());
  t.classList.add('pin'); stage.append(t);
  // on the Lesson tab the reading card can cover that corner (wide screens): then the page sits in the card's own corner
  // (or the book picture, which it would hide part of)
  const note=tab==='read'&&$('#stage .note');
  if(note){ const a=t.getBoundingClientRect(), hit=e=>{ if(!e) return false; const b=e.getBoundingClientRect(); return a.right>b.left&&a.left<b.right&&a.bottom>b.top-8&&a.top<b.bottom; };
    if(hit(note)||hit($('#stage .bfit'))){ t.classList.add('innote'); note.append(t); } }
}
addEventListener('resize',()=>{ clearTimeout(bookTag.t); bookTag.t=setTimeout(()=>{ if($('#pageTag')) bookTag(); },200); });

/* the book picker: the books of this subject (Book, Workbook, Booklet ...) on top, under them the pages of the chosen book; tap a page to go there.
   A lesson's "pages" can name any other book as a key, e.g. "booklet":[3,4] (its questions are the sets with "book":"booklet"). */
const BOOKOF=t=>t==='read'||t==='words'||t==='quiz'?'book':t;
const BOOKNAME=k=>({book:'Book',workbook:'PTS'}[k]||k[0].toUpperCase()+k.slice(1));
function booksOf(s=SUBJECT){ const ks=[...new Set(bookIndex().filter(e=>e.subject===s).map(e=>BOOKOF(e.tab)))];
  return ks.sort((a,b)=>(['book','workbook'].indexOf(a)+1||9)-(['book','workbook'].indexOf(b)+1||9)); }
function bookPages_(k){ const seen={}; bookIndex().filter(e=>e.subject===SUBJECT&&BOOKOF(e.tab)===k).sort((a,b)=>a.page-b.page).forEach(e=>{ if(!seen[e.page]) seen[e.page]=e; }); return Object.values(seen); }
function bookPad(){
  hideHint(); let o=$('#pagePad');
  if(!o){
    o=el('div','overlay','<div class="rays"></div>'); o.id='pagePad'; o.hidden=true;
    o.insertAdjacentHTML('beforeend',`<div class="popup pagepad" role="dialog" aria-label="Books"><h2 class="outline big">Pages</h2><div class="pp-books"></div><div class="pp-pages"></div></div>`);
    document.body.append(o);
    o.addEventListener('click',e=>{ if(e.target===o) o.hidden=true; });
  }
  const ks=booksOf(); if(!ks.length) return;
  const inTab=tab==='quiz'&&typeof qz!=='undefined'?qz.src:BOOKOF(tab), cur=ks.includes(inTab)?inTab:ks[0];
  bookList(cur); o.hidden=false; spinRays(o);
  if(anim) G.from('#pagePad .pagepad',{scale:.6,opacity:0,duration:.4,ease:'back.out(2)'});
}
function bookList(k){
  const o=$('#pagePad'), ks=booksOf();
  $('.pp-books',o).innerHTML=ks.map(b=>`<button class="pill ${b===k?'blue':'cream'} pp-book" data-b="${b}">${tr(BOOKNAME(b))}</button>`).join('');
  $('.pp-books',o).hidden=ks.length<2;
  $('.pp-pages',o).innerHTML=bookPages_(k).map(e=>`<button class="rb pp-pg" data-p="${e.page}" data-b="${k}" aria-label="Page ${e.page}: ${e.lesson.title}"><span>${num(e.page)}</span></button>`).join('');
  $$('.pp-book',o).forEach(b=>b.addEventListener('click',()=>bookList(b.dataset.b)));
  $$('.pp-pg',o).forEach(b=>b.addEventListener('click',()=>bookGo(+b.dataset.p,b.dataset.b)));
}
async function bookGo(n,k){
  const e=bookPages_(k).find(x=>x.page===n); if(!e) return;
  $('#pagePad').hidden=true; SUBJECT=e.subject; bookOpen(e.lesson,e.tab,n);
}
// open a lesson at the part that matches a book page (Questions: at the first question from that page)
async function bookOpen(lesson,t,page){
  await openLesson(lesson); if($('#lesson').hidden) return;
  if(isAL()&&(t==='read'||t==='booklet')){ await qLoad(); qPick(t==='read'?'lesson':'booklet'); const i=qz.list.findIndex(q=>q.set.page===page); switchTab(t,i<0?0:i); return; }   // English AL: a book / booklet page opens at its first part
  if(BOOKOF(t)!=='book'||t==='quiz'){ const k=BOOKOF(t); await qLoad(); switchTab('quiz',qFirstOnPage(page,k));
    if(k!=='book'&&!qz.all.some(q=>qSrcOf(q.set)===k)) message('Soon!',`${BOOKNAME(k)} questions are coming soon!`,`<span class="car">${CAR('sad')}</span>`); }
  else if(t!==tab) switchTab(t);
}
// the pages of a lesson on the map road, on its two sides: the Book on one, the Workbook on the other.
// Book: every page from the lesson's first page to the page before the next lesson starts; each opens its own part
// (a page with no part listed opens the part of the next listed page). Workbook: its pages, each opens the Workbook questions.
function bookPages(l,next){
  if(!l.pages) return [];
  const part={}; ['read','words','quiz'].forEach(t=>[].concat(l.pages[t]||[]).forEach(p=>{ if(!part[+p]) part[+p]=t; }));
  const ps=Object.keys(part).map(Number); if(!ps.length) return [];
  const nb=next&&next.pages?['read','words','quiz'].flatMap(t=>[].concat(next.pages[t]||[])).map(Number):[], nx=nb.length?Math.min(...nb):Infinity;
  const from=Math.min(...ps), to=Math.max(Math.max(...ps), nx<Infinity&&nx-from<=12?nx-1:0);
  const out=[]; for(let p=from;p<=to;p++){ const k=ps.filter(x=>x>=p).sort((a,b)=>a-b)[0]??Math.max(...ps); out.push({page:p,tab:part[p]||part[k],known:!!part[p]}); }
  return out;
}
// the map key: each kind of sign on the map has its own colour. Book = green, Tests = red, Booklet = orange, PTS (Performance Tasks and Assessment) = blue, Tools = yellow.
const KEYCLS={workbook:'pts',booklet:'bk'};
function keyTypes(s=SUBJECT){
  const L=(s.lessons||[]).filter(l=>!l.hidden), has=f=>L.some(f), pg=(l,k)=>l.pages&&[].concat(l.pages[k]||[]).length;
  return [has(l=>['read','words','quiz'].some(k=>pg(l,k)))&&['book','Book'], has(l=>pg(l,'booklet'))&&['bk','Booklet'], has(l=>pg(l,'workbook'))&&['pts','PTS'],
    has(l=>(l.exams||[]).length||(l.revs||[]).length)&&['ex','Tests'], has(l=>(l.tools||[]).length)&&['tl','Tools']].filter(Boolean);
}
function mapKey(){
  hideHint(); let o=$('#mapKey');
  if(!o){ o=el('div','overlay','<div class="rays"></div>'); o.id='mapKey'; o.hidden=true; o.insertAdjacentHTML('beforeend','<div class="popup mapkey" role="dialog"><h2 class="outline big"></h2><div class="mk-rows"></div></div>'); document.body.append(o); o.addEventListener('click',()=>{ o.hidden=true; }); }
  $('h2',o).textContent=tr('Map key');
  $('.mk-rows',o).innerHTML=keyTypes().map(([c,n])=>`<div class="mk-row"><span class="jpm ${c==='book'?'':c}"><b>${c==='tl'?'':'1'}</b></span><span class="mk-n">${tr(n)}</span></div>`).join('');
  o.hidden=false; spinRays(o); if(anim) G.from('#mapKey .mapkey',{scale:.6,opacity:0,duration:.4,ease:'back.out(2)'});
}
function bookSides(l,next){
  // each page is a little speech-bubble sign (like the "Level 11" sign in Ahmed's picture): the book's name small on top, the page number big,
  // the bubble's tail pointing at the road. Book pages on one side of the road, Workbook pages on the other, spread between this lesson and the next.
  const tile=(name,inner,attrs)=>`<span class="jpg"><button class="jpm" ${attrs}><small>${name}</small>${inner}</button><i class="jsl"></i></span>`;
  const box=e=>{ const name=e.tab==='workbook'?'PTS':e.tab==='booklet'?tr('Booklet'):tr('Book');
    return tile(name,`<b>${num(e.page)}</b>`,`data-tab="${e.tab}" data-p="${e.page}" aria-label="${name} page ${e.page}: ${TABNAME[e.tab]}"`).replace('class="jpm"',`class="jpm ${KEYCLS[e.tab]||''}"`); };
  const side=(cls,title,list,extra=[])=>`<div class="jside ${cls}" data-n="${Math.max(1,list.length+extra.length)}"><span class="jpgs">`+
    ((list.length||extra.length)?list.map(box).join('')+extra.join(''):tile(title,`<span class="jlk">${LOCK}</span>`,`data-soon="${title}" aria-label="${title} pages soon"`).replace('class="jpm"',`class="jpm soon ${title===tr('Book')?'':KEYCLS[wk]}"`))+`</span></div>`;
  const wk=l.pages&&l.pages.booklet?'booklet':'workbook', WK=wk==='booklet'?tr('Booklet'):'PTS';
  const wb=[].concat(l.pages&&l.pages[wk]||[]).map(Number).sort((a,b)=>a-b).map(p=>({page:p,tab:wk,known:true}));
  // exam papers (Models / تقييمات): red signs on the Workbook side, after its pages (lesson "exams" in subject.json)
  const exs=(l.exams||[]).map(e=>tile(tr(e.label||'Tests'),`<b class="jex">${ICON.exam}</b>`,`class="ex" data-ex="${e.id}" aria-label="${e.title||'Exam'}"`).replace('<button class="jpm" class="ex"','<button class="jpm ex"'));
  const rvs=(l.revs||[]).map(e=>tile(tr(e.label||'Revision'),`<b class="jex">${ICON.exam}</b>`,`data-rev="${e.folder}" data-p="${e.page}" aria-label="${e.label||'Revision'}"`).replace('class="jpm"','class="jpm ex rv"'));
  const tls=(l.tools||[]).map(e=>tile(tr(e.label||'Tool'),`<b class="jex"><img src="data/tools/make-numbers/icon.webp" alt=""></b>`,`data-tool="${e.id}" aria-label="${e.title||'Tool'}"`).replace('class="jpm"','class="jpm tl"'));
  return (l.pages&&l.pages.booklet&&!bookPages(l,next).length?'':side('bkp',tr('Book'),bookPages(l,next)))+(isAr()&&!wb.length&&!exs.length&&!tls.length&&!rvs.length?'':side('wb',WK,wb,[...rvs,...exs,...tls]));   // the Arabic term booklet has no workbook
}

// the book button next to Home on the map and lesson screens
$$('#map .navbtns, #lesson .navbtns').forEach(nb=>{
  const b=el('button','rb bookbtn',ICON.book); b.setAttribute('aria-label','Book page'); b.addEventListener('click',()=>bookPad());
  const after=$('[data-go="map"]',nb)||$('[data-go="subjects"]',nb); after.after(b);
  if(nb.closest('#map')){ const k=el('button','rb keybtn','<svg viewBox="0 0 24 24"><circle cx="5" cy="6" r="2.2"/><circle cx="5" cy="12" r="2.2"/><circle cx="5" cy="18" r="2.2"/><path d="M10 6h10M10 12h10M10 18h10"/></svg>'); k.setAttribute('aria-label','Map key'); k.addEventListener('click',mapKey); b.after(k); }
});

