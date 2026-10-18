/* LESSON screen — header, reading tab (dialog + recording), tab bar and side buttons. */
/* ---------- Lesson ---------- */
// every path inside a lesson.json is relative to that lesson's own folder
function fixPaths(L,file){
  const base=file.slice(0,file.lastIndexOf('/')+1), R=p=>p&&!/^(https?:|\/|data:)/.test(p)?base+p:p;
  L.scene=R(L.scene); L.picture=R(L.picture); L.pagePictures=(L.pagePictures||[]).map(R); if(L.audio){ L.audio.normal=R(L.audio.normal); L.audio.slow=R(L.audio.slow); }
  (L.vocab||[]).forEach(v=>{ v.img=R(v.img); if(v.audio){ v.audio.word=R(v.audio.word); v.audio.again=R(v.audio.again); v.audio.ar=R(v.audio.ar); } if(v.rel){ v.rel.labelAudio=R(v.rel.labelAudio); v.rel.audio=R(v.rel.audio); } (v.parts||[]).forEach(p=>{ p.audio=R(p.audio); p.blend=R(p.blend); }); });
  (L.lines||[]).forEach(l=>{ l.pic=R(l.pic); });
  Object.values(L.bk||{}).forEach(b=>{ b.img=R(b.img); });
  L.praise=R(L.praise);
  ((L.math&&(L.math.bonds||L.math).rows)||[]).forEach(r=>{ r.audio=R(r.audio); });
  if(L.math&&L.math.line){ const ln=L.math.line; ln.rows.forEach(r=>{ r.audio=R(r.audio); }); ln.small.audio=R(ln.small.audio); ln.big.audio=R(ln.big.audio); ln.textAudio=R(ln.textAudio); }
  if(L.letter&&typeof fixLetterPaths==='function') fixLetterPaths(L.letter,R);
  return L;
}
async function openLesson(m){
  stopAll();
  if(!LESSON || LESSON.id!==m.id){
    busy(true);
    try{ LESSON=fixPaths(await get(m.file), m.file); LESSON.id=m.id; }catch(e){ busy(false); message('Oops!','This lesson did not load. Check the internet and try again.'); return; }
    preloadImgs([LESSON.scene,LESSON.picture,...(LESSON.pagePictures||[]),...(LESSON.vocab||[]).map(v=>v.img),...(LESSON.lines||[]).map(l=>l.pic),...Object.values(LESSON.bk||{}).map(b=>b.img)]);
    player.bufs={}; player.ready=null; vs.i=0; rd.page=1; rd.done={}; ensureAudio(); busy(false);
  }
  show('lesson');
  $('#lessonMeta').textContent=`${SUBJECT.name} · ${tr(COURSE.grade)} · ${tr(COURSE.term)}`;
  $('#lesson').classList.toggle('ar',isAr()); $('#lesson').lang=isAr()?'ar':'en';
  $('#lessonTitle').textContent=isAr()?`${tr('Unit')} ${num(LESSON.unit)} · ${tr('Lesson')} ${num(LESSON.lesson)} · ${LESSON.title}`:`Unit ${LESSON.unit} · Lesson ${LESSON.lesson} · ${LESSON.title}`;
  $('#stage').style.setProperty('--scene',`url("${new URL(LESSON.scene,location.href).href}")`);   // full address: css files live in css/
  switchTab(LESSON.tabs?LESSON.tabs[0]:'read'); pop('.l-head > *',{y:-20}); pop('.tabs .tab',{y:30,delay:.1});
}

/* ---------- Audio (lesson recordings are separate mp3 files) ---------- */
const rd={page:1,done:{},words:[],lineEls:[],spotEls:[],playing:false,slow:false,pick:{},stopAt:null,full:false,cur:-1,curLine:-1,raf:0};
const player={ctx:null,bufs:{},ready:null,src:null,run:false,startCtx:0,startT:0,pos:0};
const AC=window.AudioContext||window.webkitAudioContext, nap=ms=>new Promise(r=>setTimeout(r,ms));
// after the phone locks (or the app is in the background) the speaker can stay asleep: wake it, and if it will not wake, make a new one
async function ensureCtx(){
  if(!player.ctx||player.ctx.state==='closed') player.ctx=new AC();
  for(let k=0;k<2&&player.ctx.state!=='running';k++){
    try{ await Promise.race([player.ctx.resume(),nap(400)]); }catch(e){}
    if(player.ctx.state!=='running'){ try{ player.ctx.close(); }catch(e){} player.ctx=new AC(); }
  }
  try{ await Promise.race([player.ctx.resume(),nap(400)]); }catch(e){}
  return player.ctx;
}
function ensureAudio(){
  if(!LESSON.audio) return Promise.resolve();
  const ready=ensureCtx().then(()=>{
    if(!player.ready){
      const dec=url=>fetch(url).then(r=>r.arrayBuffer()).then(b=>new Promise((res,rej)=>player.ctx.decodeAudioData(b,res,rej)));
      player.ready=Promise.all([dec(LESSON.audio.normal),dec(LESSON.audio.slow)]).then(([n,s])=>{ player.bufs.n=n; player.bufs.s=s; });
    }
    return player.ready;
  });
  return ready;
}
const factor=()=>rd.slow?1/(LESSON.audio.slowRate||.75):1;
function now(){ return player.run?player.startT+Math.max(0,player.ctx.currentTime-player.startCtx)/factor():player.pos; }
function halt(){ if(player.src){ player.src.onended=null; try{player.src.stop();}catch(e){} player.src=null; } }
async function playFrom(t,stopAt=null,full=stopAt==null){
  hideHint(); halt(); player.run=false; rd.stopAt=stopAt; rd.playing=full; rd.full=full; readRail();
  try{ await ensureAudio(); }catch(e){ rd.playing=false; readRail(); return; }
  const f=factor(), src=player.ctx.createBufferSource(); src.buffer=rd.slow?player.bufs.s:player.bufs.n; src.connect(player.ctx.destination);
  const dur=stopAt!=null?Math.max(.05,(stopAt-t)*f):undefined; const lead=.12, at=player.ctx.currentTime+lead; dur!=null?src.start(at,t*f,dur):src.start(at,t*f);
  player.src=src; player.run=true; player.startCtx=at; player.startT=t;
  src.onended=()=>{ if(player.src!==src) return; player.src=null; player.run=false; const w=rd.full; player.pos=0; rd.stopAt=null; rd.full=false; endPlay(w); };
  startLoop();
}
function pausePlay(){ if(!player.run) return; player.pos=now(); halt(); player.run=false; rd.playing=false; cancelAnimationFrame(rd.raf); carDrive(false); }
function stopAll(){ halt(); player.run=false; player.pos=0; rd.stopAt=null; rd.playing=false; rd.full=false; cancelAnimationFrame(rd.raf); carDrive(false); }

const trackCar=$('#trackCar'); putCar(trackCar);
let spin=null;
// a lesson with "pages" (each line has "page": 1|2): the reading tab shows one page at a time; its span is where that page's lines are in the recording
const nPages=()=>LESSON&&LESSON.pages>1?LESSON.pages:1;
function pageSpan(){ if(nPages()<2) return [0,LESSON.end]; const ls=LESSON.lines.filter(l=>l.page===rd.page); if(!ls.length) return [0,LESSON.end];
  return [rd.page===1?0:Math.max(0,ls[0].words[0][1]-.15), rd.page===nPages()?LESSON.end:ls[ls.length-1].words.slice(-1)[0][2]+.35]; }
function carAt(t){ if(!LESSON) return; const [a,b]=pageSpan(); carFrac((t-a)/(b-a)); }
// p = 0..1 along the header road (reading time in the Lesson tab, words learned in Vocabulary)
function carFrac(p){ p=Math.max(0,Math.min(1,p||0)); const tw=Math.max(0,trackCar.parentElement.clientWidth-trackCar.offsetWidth-52);
  trackCar.style.transform=`translate(${(p*tw).toFixed(1)}px,-56%)`; }
function carDrive(on){
  if(!anim) return;
  if(on){ if(!spin) spin=G.to('#trackCar .wheel',{rotation:360,transformOrigin:'50% 50%',duration:.45,repeat:-1,ease:'none'}); else spin.play();
    G.to('#trackCar .cb',{y:-2,duration:.18,yoyo:true,repeat:-1,ease:'sine.inOut'}); }
  else { if(spin) spin.pause(); G.killTweensOf('#trackCar .cb'); G.set('#trackCar .cb',{y:0}); }
}
function mark(t){
  let wi=-1; for(let i=0;i<rd.words.length;i++){ const w=rd.words[i]; if(t>=w.s-.03&&t<w.e+.12) wi=i; }   // last match wins: the next word takes over as soon as it starts
  if(wi!==rd.cur){ if(rd.cur>=0&&rd.words[rd.cur]) rd.words[rd.cur].el.classList.remove('reading');
    if(wi>=0&&rd.words[wi]){ const e=rd.words[wi].el; e.classList.add('reading'); if(anim) G.fromTo(e,{scale:1.2},{scale:1,duration:.35,ease:'back.out(3)'}); }
    rd.cur=wi; }
  let li=-1; if(LESSON) LESSON.lines.forEach((l,i)=>{ const a=l.words[0][1], b=l.words[l.words.length-1][2]; if(t>=a-.05&&t<b+.25) li=i; });
  if(li!==rd.curLine){ rd.lineEls.forEach((e,i)=>e.classList.toggle('on',i===li)); rd.spotEls.forEach((e,i)=>e&&e.classList.toggle('on',i===li)); rd.curLine=li;
    const ln=li>=0&&rd.lineEls[li]; if(ln&&$('.acticon',ln)){ ln.classList.add('acting'); clearTimeout(ln._act); ln._act=setTimeout(()=>ln.classList.remove('acting'),2200); } if(li>=0&&rd.lineEls[li]) rd.lineEls[li].scrollIntoView({block:'nearest',behavior:'smooth'}); }
  if(rd.full&&t>=0) carAt(t);
}
function loop(){ if(!player.run) return; mark(now()); rd.raf=requestAnimationFrame(loop); }
function startLoop(){ cancelAnimationFrame(rd.raf); carDrive(rd.full); rd.raf=requestAnimationFrame(loop); }
function clearMarks(){ mark(-1); }
function endPlay(full){
  rd.playing=false; cancelAnimationFrame(rd.raf); carDrive(false); setTimeout(()=>{ if(!player.run) clearMarks(); },500); readRail();
  if(full){ carAt(pageSpan()[1]); rd.done[rd.page]=1; if(Object.keys(rd.done).length>=nPages()) award(LESSON.id,'read'); setTimeout(()=>{ if(!player.run) carAt(pageSpan()[0]); },4000); }
}

/* ---------- Tabs + rail ---------- */
const stage=$('#stage'), rail=$('#rail'); let tab='read';
const TABS={read:['Lesson','book'],words:['Vocabulary','abc'],quiz:['Questions','quiz']};
function paintTabs(){ $$('.tab').forEach(b=>{ const [l0,ic]=TABS[b.dataset.tab], l=(LESSON&&LESSON.tabLabels&&LESSON.tabLabels[b.dataset.tab])||l0, got=LESSON&&STARS[LESSON.id]&&STARS[LESSON.id][b.dataset.tab];
  b.innerHTML=ICON[ic]+`<span>${tr(l)}</span>`+(got?`<span class="st">${STAR(true)}</span>`:''); b.hidden=!!(LESSON&&LESSON.tabs&&!LESSON.tabs.includes(b.dataset.tab)); b.setAttribute('aria-selected',b.dataset.tab===tab); }); }   // optional "tabs": ["read","quiz"] in lesson.json shows only those tabs (Math: explanation + questions, or questions only)
function setRail(items){ rail.innerHTML=''; items.forEach(it=>{ const b=el('button','dash '+it.kind+(it.on?' on':'')+(it.icon==='restart'?' ln':''),`<span class="rb">${ICON[it.icon]}</span><span>${it.label}</span>`); b.addEventListener('click',it.click); rail.append(b); }); }
function switchTab(t,at){ stopAll(); vStop(); hideHint(); $('#lesson').classList.remove('vtab','qtab'); document.body.classList.remove('typing','kb'); tab=t; paintTabs(); carAt(0); t==='read'?showRead():t==='words'&&LESSON.vocab?(LESSON.letter&&typeof showLetterWords==='function'?showLetterWords():showWords()):t==='quiz'&&typeof showQuiz==='function'?showQuiz(at):showGarage(); if(typeof bookTag==='function') bookTag(); pop('#stage > *',{scale:.85,y:10}); pop('#rail .dash',{x:30,y:0}); }
$$('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

// default speed: slow for a page that is a conversation (2+ speakers), normal for everything else; a child's own choice per page wins
function pageDefaultSlow(){ return new Set(LESSON.lines.filter(l=>nPages()<2||l.page===rd.page).map(l=>l.who)).size>1; }
function showRead(){
  { const k=LESSON.id+':'+rd.page; rd.slow=k in rd.pick?rd.pick[k]:pageDefaultSlow(); }
  stage.innerHTML=''; rd.words=[]; rd.lineEls=[]; rd.spotEls=[]; rd.cur=-1; rd.curLine=-1;
  if(LESSON.type==='letter'&&typeof showLetter==='function') return showLetter();
  if(LESSON.type==='math'&&typeof showMathExplain==='function') return showMathExplain();
  const pl=(LESSON.pageLayouts||[])[rd.page-1];   // optional per page: "text" (dialog on the scene) or "pictures"
  if(pl==='bubbles') return showBubbles();
  if(LESSON.layout==='pictures'||pl==='pictures') return showPics();
  const scene=el('div','scene'+(LESSON.picture?' book':'')+(LESSON.compact?' long':'')); scene.setAttribute('role','img'); scene.setAttribute('aria-label',LESSON.sceneAlt||'');
  const np=nPages(), note=el('div','note'), inn=el('div','in'); const tk=el('p','task',STAR(true)+((LESSON.pageTasks&&LESSON.pageTasks[rd.page-1])||LESSON.task));
  if(LESSON.titleWords&&rd.page===1){ tk.innerHTML=STAR(true); LESSON.titleWords.forEach(([w,s0,e0],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s:s0,e:e0}); sp.addEventListener('click',()=>playFrom(Math.max(0,s0-.04),e0+.06)); tk.append(sp,' '); }); }   // "titleWords": the title line is spoken at the start of the recording and lights up with it
  inn.append(tk);
  if(LESSON.titleWords&&rd.page===1){ const tp=$('p.task',inn); tp.innerHTML=STAR(true); LESSON.titleWords.forEach(([w,s,e])=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); tp.append(sp,' '); }); }   // optional "titleWords": the recording says the title first, so the title words light up with the audio
  const ul=el('ul','lines');
  LESSON.lines.forEach((l,li)=>{
    if(np>1&&l.page!==rd.page) return;
    const row=el('li','line'), who=l.who?el('button','who',l.who+':'):el('button','who say',SAY_LN); who.style.color=(LESSON.speakers||{})[l.who]||OL;   // a story (no speaker name): a small speaker that reads the paragraph
    who.setAttribute('aria-label','Listen to this line'); who.addEventListener('click',()=>playLine(li));
    const txt=el('span','txt');
    l.words.forEach(([w,s,e])=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); txt.append(sp,' '); });
    if(l.act){ const ac=el('span','act',l.act), ic=actIcon(l.act); if(ic) ac.append(ic); txt.append(ac); }
    row.append(who,txt); ul.append(row); rd.lineEls[li]=row;
  });
  inn.append(ul); note.append(inn);
  // a lesson with a book picture ("picture" + a "spot" per line): the whole picture beside the words (above them on tall screens);
  // the thing being read gets a ring on the picture, and tapping a thing reads its line
  const bookPic=(LESSON.pagePictures&&LESSON.pagePictures[rd.page-1])||LESSON.picture;   // optional "pagePictures": one picture per page
  if(bookPic){
    const box=el('div','bpic'), fit=el('div','bfit',`<img src="${bookPic}" alt="">`);
    $('img',fit).addEventListener('load',e=>{ const im=e.target; if(im.naturalWidth) box.style.setProperty('--ar',im.naturalWidth/im.naturalHeight); });
    LESSON.lines.forEach((l,li)=>{ if(!l.spot){ rd.spotEls.push(null); return; } const [x,y,w,h]=l.spot, b=el('button','spot');
      b.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%`; b.setAttribute('aria-label','Listen: '+l.words.map(w=>w[0]).join(' '));
      b.addEventListener('click',()=>playLine(li)); fit.append(b); rd.spotEls.push(b); });
    box.append(fit); scene.append(box);
  }
  scene.append(note);
  readPager(scene);
  stage.append(scene);
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
// pages of one lesson: two arrows in the bottom middle, and a mouse or finger swipe left / right
function readGo(d){ const np=nPages(); if(rd.page+d<1||rd.page+d>np) return; stopAll(); clearMarks(); rd.page+=d; showRead(); carAt(pageSpan()[0]); const [ps,pe]=pageSpan(); if(LESSON.lines.some(l=>l.page===rd.page)) playFrom(ps,pe,true); }   // the new page starts reading by itself
function readPager(scene){
  const np=nPages(); if(np<2) return;
  const bar=el('div','pager'); scene.classList.add('paged');
  [-1,1].forEach(d=>{ const b=el('button','qarr parr '+(d<0?'prev':'next'),Q_ARR+`<span class="qal">${tr(d<0?'Previous':'Next')}</span>`); b.setAttribute('aria-label',d<0?'Previous page':'Next page'); b.disabled=rd.page+d<1||rd.page+d>np;
    b.addEventListener('click',()=>readGo(d)); bar.append(b); });
  scene.append(bar);
  let x0=null,y0=0,sw=false;
  scene.addEventListener('pointerdown',e=>{ if(e.target.closest('.pager')) return; x0=e.clientX; y0=e.clientY; sw=false; });
  scene.addEventListener('pointerup',e=>{ if(x0==null) return; const dx=e.clientX-x0, dy=e.clientY-y0; x0=null;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){ sw=true; readGo(dx<0?1:-1); } });
  scene.addEventListener('pointercancel',()=>{ x0=null; });
  scene.addEventListener('click',e=>{ if(sw){ e.stopPropagation(); e.preventDefault(); sw=false; } },true);
}
// "layout": "pictures" (Lesson 2): no text card; each line is a picture ("pic") spread over the stage at "pos" [x, y] % (its centre),
// its word written under it. The word being read is marked as usual and its picture pops up a little; tapping the word (or the picture) reads it.
function showPics(){
  const scene=el('div','scene pics'+(LESSON.pkWrap?' wrap':'')), area=el('div','pkarea'), np=nPages();
  scene.append(el('p','task',STAR(true)+((LESSON.pageTasks&&LESSON.pageTasks[rd.page-1])||LESSON.task)), area);
  LESSON.lines.forEach((l,li)=>{
    if(np>1&&l.page!==rd.page) return;
    // tall pictures (the teacher) are made a bit taller, so all look about the same size
    if(l.more){ const prev=area.lastElementChild, row=el('span','txt'); l.words.forEach(([w,s,e],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); row.append(sp); if(k<l.words.length-1) row.append(' '); });
      row.addEventListener('click',ev=>{ if(ev.target===row) playLine(li); }); prev.append(row); rd.lineEls[li]=row; return; }   // "more": true = another sentence under the previous picture
    const [x,y]=l.pos||[50,50], it=el('div','pk'), pic=el('button','pkpic',`<img src="${l.pic}" alt="">`), txt=el('span','txt');
    it.style.cssText=`left:${x}%;top:${y}%`; if(l.posP){ it.classList.add('two'); it.style.cssText=`--lx:${x}%;--ly:${y}%;--px:${l.posP[0]}%;--py:${l.posP[1]}%`; }   // "posP": [x, y] on a tall screen $('img',pic).addEventListener('load',e=>{ const im=e.target; if(im.naturalWidth) it.style.setProperty('--k',l.k||Math.min(1.35,Math.max(.85,Math.sqrt(im.naturalHeight/im.naturalWidth)))); });
    if(l.mw) it.style.setProperty('--mw',l.mw+'cqw');   // optional per line: "k" = size factor, "mw" = widest it may be (% of the stage)
    pic.setAttribute('aria-label','Listen: '+l.words.map(w=>w[0]).join(' ')); pic.addEventListener('click',()=>playLine(li));
    l.words.forEach(([w,s,e],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); txt.append(sp); if(k<l.words.length-1) txt.append(' '); });
    it.append(pic,txt); area.append(it); rd.lineEls[li]=it;
  });
  readPager(scene);
  stage.append(scene);
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
// "bubbles" page (a book page with speech bubbles over a picture): LESSON.bk[page] = { img, ar:[wide screen, tall screen],
//   pic:{l:[x,y,w],p:[x,y,w]}, bubs:[{ l:[x,y,w,font], p:[x,y,w,font], tail:[% along the bottom, length in em], round }] } (l = wide screen, p = tall one;
//   x, w in % of the canvas width, y in % of its height, font in % of its width). A line says which bubble it is in ("bub"); tapping a sentence or a word reads it.
function showBubbles(){
  const cfg=LESSON.bk[rd.page], np=nPages(), scene=el('div','scene pics bub'), wrap=el('div','bkwrap'), cv=el('div','bk');
  const S=(e,k,v)=>e.style.setProperty(k,v), two=(e,k,a,i)=>{ S(e,'--l'+k,a.l[i]+(i<3?'%':'')); S(e,'--p'+k,a.p[i]+(i<3?'%':'')); };
  S(cv,'--ar',cfg.ar[0]); S(cv,'--arP',cfg.ar[1]);
  scene.append(el('p','task',STAR(true)+((LESSON.pageTasks&&LESSON.pageTasks[rd.page-1])||LESSON.task)),wrap); wrap.append(cv);
  const im=el('img','bkpic'); im.src=cfg.img; im.alt=''; ['x','y','w'].forEach((k,i)=>two(im,k,cfg.pic,i)); cv.append(im);
  const bs=cfg.bubs.map(b=>{ const d=el('div','bkb'+(b.round?' round':'')); ['x','y','w','f'].forEach((k,i)=>two(d,k,b,i)); S(d,'--tx',(b.tail?b.tail[0]:50)+'%'); S(d,'--tl',(b.tail?b.tail[1]:.9)+'em'); cv.append(d); return d; });
  LESSON.lines.forEach((l,li)=>{
    if(np>1&&l.page!==rd.page) return;
    const row=el('p','bks'); l.words.forEach(([w,s,e],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',ev=>{ ev.stopPropagation(); playFrom(Math.max(0,s-.04),e+.06); }); row.append(sp); if(k<l.words.length-1) row.append(' '); });
    row.addEventListener('click',()=>playLine(li)); bs[l.bub||0].append(row); rd.lineEls[li]=row;
  });
  readPager(scene);
  stage.append(scene);
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
// a stage direction like "(They shake hands)" gets a little moving picture beside it; it plays while that line is read
const ACT_ICONS=[[/shake hands/i,`<svg viewBox="0 13 80 40" aria-hidden="true"><g class="hs" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
  <path d="M3 47L15 30L27 38L17 51Z" fill="#4A90E2"/><path d="M77 47L65 30L53 38L63 51Z" fill="#E8457A"/>
  <path d="M15 30C21 21 31 18 41 21L49 25C51 30 46 36 38 38L27 38Z" fill="#F7C99A"/>
  <path d="M65 30C59 22 50 18 42 19C37 20 34 23 35 26C36 28 39 28 42 27L46 26L53 38Z" fill="#E9A96E"/>
  <path d="M42 27C38 29 33 31 30 30M44 31C40 33 35 35 31 34M46 35C42 37 38 38 34 38" fill="none" stroke-width="2.2"/>
  <path d="M35 26C33 22 36 17 40 17C44 17 45 20 43 23" fill="#F7C99A"/></g></svg>`]];
function actIcon(text){ const f=ACT_ICONS.find(([re])=>re.test(text)); if(!f) return null; const s=el('span','acticon',f[1]); return s; }
function playLine(li){ const l=LESSON.lines[li]; playFrom(Math.max(0,l.words[0][1]-.05),l.words[l.words.length-1][2]+.15); }
function readRail(){
  if(tab!=='read') return; const [ps,pe]=pageSpan(), res=!player.run&&player.pos>ps+.2, part=()=>rd.stopAt!=null&&!rd.full;
  setRail([
    {kind:'go',icon:'play',label:tr(res?'Continue':'Read'),on:rd.playing,click:()=>{ if(!rd.playing) playFrom(res?player.pos:ps,pe,true); }},
    {kind:'stop',icon:'pause',label:tr('Pause'),click:()=>{ if(part()){ stopAll(); clearMarks(); } else pausePlay(); readRail(); }},
    {kind:'again',icon:'restart',label:tr('Restart'),click:()=>playFrom(ps,pe,true)},
    {kind:'speed',icon:rd.slow?'slow':'fast',label:tr(rd.slow?'Slow':'Normal'),click:()=>{ const was=player.run&&!part(), t=now(); if(was){ halt(); player.run=false; } rd.slow=!rd.slow; rd.pick[LESSON.id+':'+rd.page]=rd.slow; if(was) playFrom(t,pe,true); else readRail(); }}
  ]);
}

function showGarage(){
  stage.innerHTML='';
  const g=el('div','garage',`<div><span class="car"></span><p class="outline">${tr('Coming soon!')}</p><span>${COURSE.hints.garage}</span></div>`);
  putCar(g.querySelector('.car'),'sad'); stage.append(g); setRail([]);
}
