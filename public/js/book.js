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
  if(!LESSON||inQ()) return;   // the Questions sheets say their own page (qGo)
  const m=SUBJECT&&SUBJECT.lessons.find(l=>l.id===LESSON.id), ps=m&&m.pages&&[].concat(m.pages[tab]||[]);
  if(!(ps&&ps.length)) return footPage(null);
  // a lesson read in several pages: show the book page of the page on screen (lesson.json "pageNums" can list them when they differ from the book pages)
  const np=tab==='read'&&LESSON.pages>1?LESSON.pages:0, pn=np&&(LESSON.pageNums||ps);
  footPage(np?pn[Math.min(rd.page-1,pn.length-1)]:ps.length>1?ps[0]+'–'+ps[ps.length-1]:ps[0]);
}
// the book page of what is on screen: bottom right corner, in the tab bar's row
function footPage(n){
  let t=$('#pageTag');
  if(n==null||n===''){ if(t) t.remove(); return; }
  if(!t){ t=el('button','pgtag'); t.id='pageTag'; t.addEventListener('click',()=>bookPad()); $('#lmeta .lm-l').append(t); }
  t.setAttribute('aria-label','Book page '+n); t.innerHTML=ICON.book+`<span>${isAr()?'ص ':'p. '}${num(n)}</span>`;
}

/* LESSON NAV — above the tabs: the parts of the page (top row) and the pages of the book in use (second row), each with Previous / Next arrows.
   Questions-style tabs (Q, Booklet, PTS, English AL lessons): pages = the book pages that have questions, parts = the exercises of the page on screen.
   Lesson tab with several pages: the pages of the lesson. Anything else (one page only) shows no rows. */
function lnavModel(){
  if(!LESSON) return {};
  if(inQ()){
    const cur=qz.list[qz.i]; if(!cur) return {};
    const pg=[], sec=[], cp=cur.set.page, cg=qGrp(cur.set);
    qz.list.forEach((q,i)=>{ const p=q.set.page; if(p!=null&&!pg.some(x=>x.n===p)) pg.push({n:p,i}); });
    qz.list.forEach((q,i)=>{ if(q.set.page!==cp) return; const g=qGrp(q.set); if(!sec.some(x=>x.g===g)) sec.push({g,i,l:q.set.part||(q.set.ex!=null?num(q.set.ex):q.set.model||num(sec.length+1))}); });
    const pi=pg.findIndex(x=>x.n===cp), jump=i=>{ hideHint(); blip(600); qz.busy=false; qGo(i); };
    return {pages:pg.map(x=>({l:num(x.n),on:x.n===cp,go:()=>jump(x.i)})), secs:sec.length>1||(sec[0]&&pg.length>0)?sec.map(x=>({l:x.l,on:x.g===cg,go:()=>jump(x.i)})):[],
      pPrev:pi>0&&(()=>jump(pg[pi-1].i)), pNext:pi>=0&&pi<pg.length-1&&(()=>jump(pg[pi+1].i)),
      sPrev:cur.sl&&cur.sl.live()&&cur.sl.i()>0?()=>cur.sl.go(-1):qSetStart(-1)>=0&&(()=>qSet(-1)),   // Q&A slides (quiz-letters.js qxQAAll): a swipe moves the slides first
      sNext:cur.sl&&cur.sl.live()&&cur.sl.i()<cur.sl.n-1?()=>cur.sl.go(1):qSetStart(1)>=0&&(()=>qSet(1))};
  }
  if(tab==='read'&&nPages()>1){
    const m=SUBJECT.lessons.find(l=>l.id===LESSON.id), ps=LESSON.pageNums||(m&&m.pages&&[].concat(m.pages.read||[]))||[];
    return {pages:Array.from({length:nPages()},(_,k)=>({l:num(ps[k]!=null?ps[k]:k+1),on:k+1===rd.page,go:()=>readGo(k+1-rd.page)})), secs:[],
      pPrev:rd.page>1&&(()=>readGo(-1)), pNext:rd.page<nPages()&&(()=>readGo(1))};
  }
  return {};
}
/* DOTS (replace the old page / part number rows): one small dot per exercise group of the questions (or per page of a lesson read in several pages),
   the one in use is solid white, the others light white; tap a dot, drag the strip, or swipe the page to move between them. No numbers. */
let LM={prev:null,next:null};
function lnavPaint(){
  const d=$('#lmDots'); if(!d) return; const md=lnavModel();
  const items=inQ()?(()=>{ const out=[], cg=qz.list[qz.i]&&qGrp(qz.list[qz.i].set); qz.list.forEach((q,i)=>{ const g=qGrp(q.set); if(!out.some(x=>x.g===g)) out.push({g,i,on:g===cg}); }); return out.map(x=>({on:x.on,go:()=>{ hideHint(); blip(600); qz.busy=false; qGo(x.i); }})); })()
    :(md.pages||[]);
  LM.prev=md.sPrev||md.pPrev||null; LM.next=md.sNext||md.pNext||null;
  d.hidden=items.length<2; if(d.hidden){ d.innerHTML=''; } else {
    d.innerHTML=items.map((it,k)=>`<button class="ldot${it.on?' on':''}" aria-label="${k+1}"></button>`).join('');
    $$('.ldot',d).forEach((b,k)=>b.addEventListener('click',()=>{ if(!items[k].on) items[k].go(); }));
    const on=$('.ldot.on',d); if(on) d.scrollLeft=on.offsetLeft-d.clientWidth/2+on.offsetWidth/2; }
  const hb=$('#lmeta .qhelpb'); if(hb&&!inQ()) hb.hidden=true;
}
function lnavFit(){}
const dotsStep=k=>{ const f=k>0?LM.next:LM.prev; if(f) f(); };
// drag the dots strip with the mouse / finger (touch scrolls it natively), and swipe the page itself (only from empty places, never from an answer or a picture)
(function(){
  const d=$('#lmDots'); let dn=null;
  d.addEventListener('pointerdown',e=>{ if(e.pointerType==='mouse') dn={x:e.clientX,l:d.scrollLeft,m:false}; });
  addEventListener('pointermove',e=>{ if(dn){ const dx=e.clientX-dn.x; if(Math.abs(dx)>4) dn.m=true; d.scrollLeft=dn.l-dx; } });
  addEventListener('pointerup',()=>{ if(dn&&dn.m){ d.addEventListener('click',e=>e.stopPropagation(),{capture:true,once:true}); } dn=null; });
})();
/* THE ONE PAGER (RULES.md "Swipe"): swipe / drag (finger or mouse) left or right from ANY place of the page area (under the road down to above the tabs: .mid + the dots row)
   = next / previous page through LM (dots model: reading pages, story pages, question groups, words). Per-screen code never adds its own swipe. */
(function(){
  const L=$('#lesson'); let sw=null, moved=false;
  const own='input,textarea,select,.qlk,.qxtile,.qlink,.xlink,.qbd,.board,.spot,.lm-dots,.tabs,[data-noswipe],.alchip,.xpick,.dragging';   // elements that use the drag themselves
  const inArea=t=>t.closest('.mid,.lmeta');
  L.addEventListener('pointerdown',e=>{ moved=false; sw=(e.button||!inArea(e.target)||e.target.closest(own))?null:{x:e.clientX,y:e.clientY}; });
  L.addEventListener('pointerup',e=>{ if(!sw) return; const dx=e.clientX-sw.x, dy=e.clientY-sw.y; sw=null;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4){ moved=true; dotsStep(dx<0?1:-1); } });
  L.addEventListener('pointercancel',()=>{ sw=null; });
  L.addEventListener('click',e=>{ if(moved){ e.stopPropagation(); e.preventDefault(); moved=false; } },true);
})();
addEventListener('resize',()=>{ clearTimeout(bookTag.t); bookTag.t=setTimeout(()=>{ if($('#pageTag')) bookTag(); lnavPaint(); },200); });

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
  const inTab=inQ()&&typeof qz!=='undefined'?qz.src:BOOKOF(tab), cur=ks.includes(inTab)?inTab:ks[0];
  bookList(cur); o.hidden=false; spinRays(o);
  if(anim) G.from('#pagePad .pagepad',{scale:.9,opacity:0,duration:TM('--t-pop',.22),ease:'power2.out',clearProps:'transform,opacity'});
}
function bookList(k){
  const o=$('#pagePad'), ks=booksOf();
  $('.pp-books',o).innerHTML=ks.map(b=>`<button class="mtab mt-${({book:'bk0',workbook:'pts',booklet:'bk'})[b]||'ex'} pp-book${b===k?' on':''}" data-b="${b}"><span>${tr(BOOKNAME(b))}</span></button>`).join('');
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
  await openLesson(lesson); if($('#lesson').hidden) return; if(page) setLast(lesson.id,page);
  if(isAL()&&(t==='read'||t==='booklet')){ await qLoad(); qPick(t==='read'?'lesson':'booklet'); const i=qz.list.findIndex(q=>q.set.page===page); switchTab(t,i<0?0:i); return; }   // English AL: a book / booklet page opens at its first part
  if(BOOKOF(t)!=='book'||t==='quiz'){ const k=BOOKOF(t); await qLoad(); const has=k==='book'||qz.all.some(q=>qSrcOf(q.set)===k); switchTab(has&&['workbook','booklet'].includes(k)?k:'quiz',has?qFirstOnPage(page,k):0);
    if(!has) message('Soon!',`${BOOKNAME(k)} questions are coming soon!`,`<span class="car">${CAR('sad')}</span>`); }
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
// the legend above the map: one line, a coloured square and the name for each kind of sign (same on every subject)
const KEYCLS={workbook:'pts',booklet:'bk'};
const LEGEND=[['bk0','Book'],['pts','PTS'],['bk','Booklet'],['tl','Tool'],['ex','Test']];
function drawLegend(){
  const g=$('#mapLegend'); if(!g) return;
  g.innerHTML=LEGEND.map(([c,n])=>`<span class="lg lg-${c}"><i></i><b>${tr(n)}</b></span>`).join('');
}

function bookSides(l,next){
  // each page is a little speech-bubble sign (like the "Level 11" sign in Ahmed's picture): the book's name small on top, the page number big,
  // the bubble's tail pointing at the road. Book pages on one side of the road, Workbook pages on the other, spread between this lesson and the next.
  const tile=(name,inner,attrs)=>`<span class="jpg"><button class="jpm" ${attrs}><small>${name}</small>${inner}</button><i class="jsl"></i></span>`;
  const box=e=>{ const name=e.tab==='workbook'?tr('PTS'):e.tab==='booklet'?tr('Booklet'):tr('Book');
    return tile(name,`<b>${num(e.page)}</b>`,`data-tab="${e.tab}" data-p="${e.page}" aria-label="${name} page ${e.page}: ${TABNAME[e.tab]}"`).replace('class="jpm"',`class="jpm ${KEYCLS[e.tab]||''}"`); };
  const side=(cls,list,extra=[])=>`<div class="jside ${cls}" data-n="${Math.max(1,list.length+extra.length)}"><span class="jpgs">`+list.map(box).join('')+extra.join('')+`</span></div>`;
  const wb=['workbook','booklet'].flatMap(k=>[].concat(l.pages&&l.pages[k]||[]).map(Number).sort((a,b)=>a-b).map(p=>({page:p,tab:k,known:true})));   // PTS / Assessments pages, then Booklet pages
  // exam papers (Tests): red signs on the Workbook side, after its pages (lesson "exams" in subject.json)
  const exs=(l.exams||[]).map(e=>tile(tr(e.label||'Test'),`<b class="jex">${ICON.exam}</b>`,`class="ex" data-ex="${e.id}" aria-label="${e.title||'Exam'}"`).replace('<button class="jpm" class="ex"','<button class="jpm ex"'));
  const rvs=(l.revs||[]).map(e=>tile(tr(e.label||'Test'),`<b class="jex">${ICON.exam}</b>`,`data-rev="${e.folder}" data-p="${e.page}" aria-label="${e.label||'Test'}"`).replace('class="jpm"','class="jpm ex rv"'));
  const tls=(l.tools||[]).map(e=>tile(tr(e.label||'Tool'),`<b class="jex jtx">${toolLabel(e.id)}</b>`,`data-tool="${e.id}" aria-label="${toolName(e.id)}"`).replace('class="jpm"','class="jpm tl"'));
  // the same in every subject: a side with nothing on it is left out (no "soon" sign)
  const bk=bookPages(l,next), more=[...rvs,...exs,...tls];
  return (bk.length?side('bkp',bk):'')+(wb.length||more.length?side('wb',wb,more):'');
}

// the book button next to Home on the map and lesson screens
$$('#map .navbtns, #lesson .navbtns').forEach(nb=>{
  const b=el('button','rb bookbtn',ICON.book); b.setAttribute('aria-label','Book page'); b.addEventListener('click',()=>bookPad());
  const after=$('[data-go="map"]',nb)||$('[data-go="subjects"]',nb); after.after(b);
});

