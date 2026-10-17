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
const bookFind=(p,s=SUBJECT)=>{ const all=bookIndex().filter(e=>e.page===p); return all.find(e=>e.subject===s)||all[0]; };
const TABNAME={read:'Lesson',words:'Vocabulary',quiz:'Questions',workbook:'Workbook'};

// the book page of the tab in use, in the same style and spot as the page on the Questions sheet:
// pinned to the top-right corner of the stage in every tab (on the Lesson picture it sits on a small paper chip, or in the reading card's corner when the card or the book picture is there). Questions show their own page per question set.
function bookTag(){
  const old=$('#pageTag'); if(old) old.remove();
  if(!LESSON||tab==='quiz') return;
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

/* the number pad */
function bookPad(){
  hideHint(); let o=$('#pagePad');
  if(!o){
    o=el('div','overlay','<div class="rays"></div>'); o.id='pagePad'; o.hidden=true;
    const keys=[1,2,3,4,5,6,7,8,9,'del',0,'go'].map(k=>k==='go'?`<button class="pill green pk-go" data-k="go">Go</button>`
      :k==='del'?`<button class="rb pk" data-k="del" aria-label="Delete"><svg viewBox="0 0 24 24"><path d="M9 6h11v12H9l-6-6z"/><path d="M12 10l4 4M16 10l-4 4"/></svg></button>`
      :`<button class="rb pk" data-k="${k}">${k}</button>`).join('');
    o.insertAdjacentHTML('beforeend',`<div class="popup pagepad" role="dialog" aria-label="Book page">
      <h2 class="outline big">Book page</h2>
      <div class="pp-num"><span class="pp-ic">${ICON.book}</span><b id="ppNum"></b></div>
      <p class="pp-what" id="ppWhat"></p>
      <div class="pp-keys">${keys}</div></div>`);
    document.body.append(o);
    o.addEventListener('click',e=>{ if(e.target===o) o.hidden=true; });
    $$('[data-k]',o).forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.k, n=$('#ppNum');
      if(k==='go') return bookGo(+n.textContent);
      if(k==='del') n.textContent=n.textContent.slice(0,-1); else if(n.textContent.length<3) n.textContent=(n.textContent+k).replace(/^0+/,'');
      bookWhat(); }));
  }
  $('#ppNum').textContent=''; bookWhat(); o.hidden=false; spinRays(o);
  if(anim) G.from('#pagePad .pagepad',{scale:.6,opacity:0,duration:.4,ease:'back.out(2)'});
}
// under the number: what that page has in the app (or that it is not here yet)
function bookWhat(){
  const n=+$('#ppNum').textContent, w=$('#ppWhat'), go=$('#pagePad .pk-go');
  if(!n){ const ps=[...new Set(bookIndex().filter(e=>e.subject===SUBJECT).map(e=>e.page))].sort((a,b)=>a-b);
    w.textContent=ps.length?'Pages here: '+ps.join(', '):'Type a page number'; go.disabled=true; return; }
  const e=bookFind(n);
  w.textContent=e?`Lesson ${e.lesson.lesson} · ${e.lesson.title} · ${TABNAME[e.tab]||e.tab}`:`Page ${n} is not here yet`;
  go.disabled=!e;
}
async function bookGo(n){
  const e=bookFind(n); if(!e) return;
  $('#pagePad').hidden=true; SUBJECT=e.subject; bookOpen(e.lesson,e.tab,n);
}
// open a lesson at the part that matches a book page (Questions: at the first question from that page)
async function bookOpen(lesson,t,page){
  await openLesson(lesson); if($('#lesson').hidden) return;
  if(t==='quiz'||t==='workbook'){ await qLoad(); switchTab('quiz',qFirstOnPage(page,t==='workbook'?'workbook':'book'));
    if(t==='workbook'&&!qz.all.some(q=>qSrcOf(q.set)==='workbook')) message('Soon!','Workbook questions are coming soon!',`<span class="car">${CAR('sad')}</span>`); }
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
function bookSides(l,next){
  // each page is a little speech-bubble sign (like the "Level 11" sign in Ahmed's picture): the book's name small on top, the page number big,
  // the bubble's tail pointing at the road. Book pages on one side of the road, Workbook pages on the other, spread between this lesson and the next.
  const tile=(name,inner,attrs)=>`<span class="jpg"><button class="jpm" ${attrs}><small>${name}</small>${inner}</button><i class="jsl"></i></span>`;
  const box=e=>{ const name=e.tab==='workbook'?'Workbook':tr('Book');
    return tile(name,`<b>${num(e.page)}</b>`,`data-tab="${e.tab}" data-p="${e.page}" aria-label="${name} page ${e.page}: ${TABNAME[e.tab]}"`); };
  const side=(cls,title,list)=>`<div class="jside ${cls}" data-n="${Math.max(1,list.length)}"><span class="jpgs">`+
    (list.length?list.map(box).join(''):tile(title,`<span class="jlk">${LOCK}</span>`,`data-soon="${title}" aria-label="${title} pages soon"`).replace('class="jpm"','class="jpm soon"'))+`</span></div>`;
  const wb=[].concat(l.pages&&l.pages.workbook||[]).map(Number).sort((a,b)=>a-b).map(p=>({page:p,tab:'workbook',known:true}));
  return side('bkp',tr('Book'),bookPages(l,next))+(isAr()&&!wb.length?'':side('wb','Workbook',wb));   // the Arabic term booklet has no workbook
}

// the book button next to Home on the map and lesson screens
$$('#map .navbtns, #lesson .navbtns').forEach(nb=>{
  const b=el('button','rb bookbtn',ICON.book); b.setAttribute('aria-label','Book page'); b.addEventListener('click',()=>bookPad());
  const after=$('[data-go="map"]',nb)||$('[data-go="subjects"]',nb); after.after(b);
});
