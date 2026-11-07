/* LESSON screen — header, reading tab (dialog + recording), tab bar and side buttons. */
/* ---------- Lesson ---------- */
// every path inside a lesson.json is relative to that lesson's own folder
function fixPaths(L,file){
  const base=file.slice(0,file.lastIndexOf('/')+1), R=p=>p&&!/^(https?:|\/|data:)/.test(p)?base+p:p;
  L.base=base; L.scene=R(L.scene); L.picture=R(L.picture); L.pictureTall=R(L.pictureTall); L.pagePictures=(L.pagePictures||[]).map(R); L.pagePicturesTall=(L.pagePicturesTall||[]).map(R); (L.pageAudio||[]).forEach(a=>{ a.normal=R(a.normal); a.slow=R(a.slow); }); if(L.audio){ L.audio.normal=R(L.audio.normal); L.audio.slow=R(L.audio.slow); }
  (L.vocab||[]).forEach(v=>{ v.img=R(v.img); if(v.audio){ v.audio.word=R(v.audio.word); v.audio.again=R(v.audio.again); v.audio.ar=R(v.audio.ar); } if(v.rel){ v.rel.labelAudio=R(v.rel.labelAudio); v.rel.audio=R(v.rel.audio); } (v.parts||[]).forEach(p=>{ p.audio=R(p.audio); p.blend=R(p.blend); }); });
  (L.lines||[]).forEach(l=>{ l.pic=R(l.pic); });
  Object.values(L.bk||{}).forEach(b=>{ b.img=R(b.img); });
  if(L.figure) (L.figure.formula||[]).forEach(x=>{ x.img=R(x.img); });
  L.praise=R(L.praise);
  ((L.math&&(L.math.bonds||L.math).rows)||[]).forEach(r=>{ r.audio=R(r.audio); });
  if(L.math&&L.math.line){ const ln=L.math.line; ln.rows.forEach(r=>{ r.audio=R(r.audio); }); ln.small.audio=R(ln.small.audio); ln.big.audio=R(ln.big.audio); ln.textAudio=R(ln.textAudio); }
  if(L.letter&&typeof fixLetterPaths==='function') fixLetterPaths(L.letter,R);
  return L;
}
async function openLesson(m){
  stopVoice(); markOpened(m.id);
  if(!LESSON || LESSON.id!==m.id){
    busy(true);
    try{ LESSON=fixPaths(await get(m.file), m.file); LESSON.id=m.id; if(LESSON.tabs) LESSON.tabs=currTabs(LESSON.tabs); }catch(e){ busy(false); message('Oops!','This lesson did not load. Check the internet and try again.'); return; }
    preloadImgs([LESSON.scene,LESSON.picture,...(LESSON.pagePictures||[]),...(LESSON.vocab||[]).map(v=>v.img),...(LESSON.lines||[]).map(l=>l.pic),...Object.values(LESSON.bk||{}).map(b=>b.img)]);
    player.bufs={}; player.ready=null; vs.i=0; rd.page=1; rd.done={}; ensureAudio().catch(()=>{}); busy(false);   // an Arabic story not recorded yet (requested slot) stays silent: no error
  }
  rd.halted=false; rd.hold=false; show('lesson'); LESSON.tool=m.tool||null; LESSON.toolN=m.toolN||5;
  $('#lessonMeta').textContent=`${SUBJECT.name} · ${tr(COURSE.grade)} · ${tr(COURSE.term)}`;
  $('#lessonTitle').textContent=isAr()?`${LESSON.unitLabel||`${tr('Unit')} ${num(LESSON.unit)}`} · ${tr('Lesson')} ${num(LESSON.lesson)} · ${LESSON.title}`:`Unit ${LESSON.unit} · Lesson ${LESSON.lesson} · ${LESSON.title}`;
  $('#stage').style.setProperty('--scene',`url("${new URL(LESSON.scene,location.href).href}")`);   // full address: css files live in css/
  switchTab(LESSON.tabs?LESSON.tabs[0]:'read'); fitTitle(); if(tab==='read'&&$('.scene.story')&&LESSON.audio) setTimeout(()=>{ if(tab==='read'&&LESSON&&LESSON.id===m.id&&!rd.playing&&!player.run&&$('.scene.story')){ const [ps,pe]=pageSpan(); playFrom(ps,pe,true,true); } },350);   // opening the lesson starts the story by itself
  if(!LESSON.tabs&&typeof qLoad==='function') qLoad().then(()=>{ if(LESSON&&LESSON.id===m.id) paintTabs(); }); pop('.l-head > *',{y:-20}); pop('.tabs .tab',{y:30,delay:.1});
}

/* ---------- Audio (lesson recordings are separate mp3 files) ---------- */
const rd={auto:false,autoT:0,page:1,done:{},words:[],lineEls:[],spotEls:[],playing:false,slow:false,pick:{},stopAt:null,full:false,cur:-1,curLine:-1,raf:0};
const player={ctx:null,bufs:{},ready:null,src:null,run:false,startCtx:0,startT:0,pos:0};
const AC=window.AudioContext||window.webkitAudioContext, nap=ms=>new Promise(r=>setTimeout(r,ms));
// after the phone locks (or the app is in the background) the speaker can stay asleep: wake it, and if it will not wake, make a new one
async function ensureCtx(){
  player.ctx=ac();   // the one shared speaker (core.js)
  for(let k=0;k<2&&player.ctx.state!=='running';k++){
    try{ await Promise.race([player.ctx.resume(),nap(400)]); }catch(e){}
    if(player.ctx.state!=='running') player.ctx=newSpeaker();
  }
  try{ await Promise.race([player.ctx.resume(),nap(400)]); }catch(e){}
  return player.ctx=SND.ctx;
}
/* MULTI-SEGMENT lesson (RULES.md "Segment slides"): lesson.json "pageAudio":[{normal,slow?,start}] = one recording per slide. They are laid on one timeline (slide k starts at "start"
   seconds, the lesson's word times are on that timeline) so reading, pages, speed and highlight work as for a single recording. No "slow" file = the normal one played at slowRate. */
async function pagesAudio(dec){
  const L=LESSON.pageAudio, f=1/(LESSON.audio.slowRate||.75), sr=player.ctx.sampleRate;
  const n=await Promise.all(L.map(a=>dec(a.normal))), s=L.every(a=>a.slow)?await Promise.all(L.map(a=>dec(a.slow))):null;
  const mix=(bufs,k)=>{ const len=Math.ceil(Math.max(...bufs.map((b,i)=>(L[i].start*k)*sr+b.length))), out=player.ctx.createBuffer(1,len,sr);
    bufs.forEach((b,i)=>{ const ch=out.getChannelData(0), src=b.getChannelData(0), o=Math.round(L[i].start*k*sr); for(let j=0;j<src.length;j++) ch[o+j]+=src[j]; }); return out; };
  return [mix(n,1),s?mix(s,f):null];
}
function ensureAudio(){
  if(!LESSON.audio) return Promise.resolve();
  const ready=ensureCtx().then(()=>{
    if(!player.ready){
      const dec=url=>fetch(url).then(r=>{ if(!r.ok) throw new Error('no recording'); return r.arrayBuffer(); }).then(b=>decodeSnd(player.ctx,b));
      if(LESSON.pageAudio) player.ready=pagesAudio(dec).then(([n,s])=>{ player.bufs.n=n; player.bufs.s=s; });   // one recording per slide, laid on ONE timeline at each slide's "start"
      else player.ready=Promise.all([dec(LESSON.audio.normal),dec(LESSON.audio.slow)]).then(([n,s])=>{ player.bufs.n=n; player.bufs.s=s; });
    }
    return player.ready;
  });
  return ready;
}
const factor=()=>rd.slow?1/(LESSON.audio.slowRate||.75):1;
function now(){ return player.run?player.startT+Math.max(0,player.ctx.currentTime-player.startCtx)/factor():player.pos; }
function halt(){ if(player.src){ player.src.onended=null; try{player.src.stop();}catch(e){} player.src=null; } }
async function playFrom(t,stopAt=null,full=stopAt==null,auto=false){
  rd.halted=false; hideHint(); if(typeof vStop==='function') vStop(); halt(); player.run=false; clearTimeout(rd.autoT); rd.auto=auto; rd.stopAt=stopAt; rd.playing=full; rd.full=full; readRail();
  try{ await ensureAudio(); }catch(e){ rd.playing=false; readRail(); if(LESSON.layout==='poem'||LESSON.pageAudio) showHint($('#rail .dash.go .rb'),LESSON.pageAudio?'لسه مفيش تسجيل':'لسه مفيش تسجيل للنشيد',60,'norec'+Date.now()); return; }   // an empty recording slot: say so
  const f=factor(), src=player.ctx.createBufferSource(), rate=rd.slow&&!player.bufs.s; src.buffer=rd.slow&&player.bufs.s?player.bufs.s:player.bufs.n; if(rate) src.playbackRate.value=1/f; src.connect(player.ctx.destination);   // rate: no slow recording = the normal one slowed down
  const o=rate?t:t*f, dur=stopAt!=null?Math.max(.05,(stopAt-t)*f):undefined; const lead=.12, at=player.ctx.currentTime+lead; dur!=null?src.start(at,o,rate&&dur!=null?(stopAt-t):dur):src.start(at,o);
  player.src=src; player.run=true; player.startCtx=at; player.startT=t;
  src.onended=()=>{ if(player.src!==src) return; player.src=null; player.run=false; const w=rd.full; player.pos=0; rd.stopAt=null; rd.full=false; endPlay(w); };
  startLoop();
}
function pausePlay(){ rd.auto=false; clearTimeout(rd.autoT); if(!player.run) return; player.pos=now(); halt(); player.run=false; rd.playing=false; cancelAnimationFrame(rd.raf); carDrive(false); }
function stopAll(){ rd.auto=false; clearTimeout(rd.autoT); halt(); player.run=false; player.pos=0; rd.stopAt=null; rd.playing=false; rd.full=false; cancelAnimationFrame(rd.raf); carDrive(false); }

const trackCar=$('#trackCar'); putCar(trackCar);
let spin=null;
// a lesson with "pages" (each line has "page": 1|2): the reading tab shows one page at a time; its span is where that page's lines are in the recording
const nPages=()=>LESSON&&LESSON.pages>1?LESSON.pages:1;
function pageSpan(){ if(nPages()<2) return [0,LESSON.end]; const ls=LESSON.lines.filter(l=>l.page===rd.page); if(!ls.length) return [0,LESSON.end];
  return [rd.page===1?0:Math.max(0,ls[0].words[0][1]-.15), rd.page===nPages()?LESSON.end:ls[ls.length-1].words.slice(-1)[0][2]+.35]; }
function carAt(t){ if(!LESSON) return; if(LESSON.layout==='explain'&&tab==='read') return carFrac((rd.page-1)/nPages());   // explain pages: the car moves page by page (explainer onBeat), never back to 0
  const [a,b]=pageSpan(), n=nPages(); carFrac(((rd.page-1)+Math.max(0,Math.min(1,(t-a)/(b-a))))/n); }   // progress runs over ALL pages of the lesson, not per page
// p = 0..1 along the header road (reading time in the Lesson tab, words learned in Vocabulary)
function carFrac(p){ p=Math.max(0,Math.min(1,p||0)); const tw=Math.max(0,trackCar.parentElement.clientWidth-trackCar.offsetWidth-52);
  trackCar.style.transform=`translate(${(p*tw).toFixed(1)}px,0)`; }
function carDrive(on){
  if(!anim) return;
  if(on){ if(!spin) spin=G.to('#trackCar .wheel',{rotation:360,transformOrigin:'50% 50%',duration:.45,repeat:-1,ease:'none'}); else spin.play();
    G.to('#trackCar .cb',{y:-2,duration:.18,yoyo:true,repeat:-1,ease:'sine.inOut'}); }
  else { if(spin) spin.pause(); G.killTweensOf('#trackCar .cb'); G.set('#trackCar .cb',{y:0}); }
}
function mark(t){
  let wi=-1; for(let i=0;i<rd.words.length;i++){ const w=rd.words[i]; if(t>=w.s-.03&&t<w.e+.12) wi=i; }   // last match wins: the next word takes over as soon as it starts
  if(wi!==rd.cur){ if(rd.cur>=0&&rd.words[rd.cur]) rd.words[rd.cur].el.classList.remove('reading'); $$('.pfig .pop').forEach(x=>x.classList.remove('pop'));
    if(wi>=0&&rd.words[wi]&&rd.words[wi].pop) rd.words[wi].pop.forEach(id=>$$(`.pfig [data-id="${id}"]`).forEach(x=>x.classList.add('pop')));   // a pointing page with a built figure: the letters being talked about pop
    if(wi>=0&&rd.words[wi]){ const e=rd.words[wi].el; e.classList.add('reading'); storyScroll(e); if(anim) G.fromTo(e,{scale:1.2},{scale:1,duration:.35,ease:'back.out(3)'}); }
    rd.cur=wi; }
  let li=-1; if(LESSON) LESSON.lines.forEach((l,i)=>{ const a=l.words[0][1], b=l.words[l.words.length-1][2]; if(t>=a-.05&&t<b+.25) li=i; });
  if(li!==rd.curLine){ rd.lineEls.forEach((e,i)=>e.classList.toggle('on',i===li)); rd.spotEls.forEach(e=>e&&e.classList.remove('on')); if(rd.spotEls[li]) rd.spotEls[li].classList.add('on'); rd.curLine=li;
    const ln=li>=0&&rd.lineEls[li]; if(ln&&$('.acticon',ln)){ ln.classList.add('acting'); clearTimeout(ln._act); ln._act=setTimeout(()=>ln.classList.remove('acting'),2200); } if(li>=0&&rd.lineEls[li]&&!rd.lineEls[li].closest('.scene.story:not(.poem):not(.point)')) rd.lineEls[li].scrollIntoView({block:'nearest',behavior:'smooth'}); }
  if(rd.full&&t>=0) carAt(t);
}
function loop(){ if(!player.run) return; mark(now()); rd.raf=requestAnimationFrame(loop); }
function startLoop(){ cancelAnimationFrame(rd.raf); carDrive(rd.full); rd.raf=requestAnimationFrame(loop); }
function clearMarks(){ mark(-1); }
function endPlay(full){
  rd.playing=false; cancelAnimationFrame(rd.raf); carDrive(false); setTimeout(()=>{ if(!player.run) clearMarks(); },500); readRail();
  if(full){ if(rd.auto&&rd.page<nPages()) rd.autoT=setTimeout(()=>{ if(rd.auto&&tab==='read') readGo(1,true); },900); else rd.auto=false;
    carAt(pageSpan()[1]); rd.done[rd.page]=1; if(Object.keys(rd.done).length>=nPages()) award(LESSON.id,'read'); setTimeout(()=>{ if(!player.run) carAt(pageSpan()[0]); },4000); }
}

/* ---------- Tabs + rail ---------- */
const stage=$('#stage'), rail=$('#rail'); let tab='read';
const TABAR={Lesson:'الدرس',Vocab:'كلمات',Q:'أسئلة',Vocabulary:'كلمات',Questions:'أسئلة',Assignments:'كتاب التقييمات',Booklet:'كُتيب',PTS:'كتاب التقييمات',Grammar:'القواعد'};   // the bottom tabs in Arabic lessons
const TABS={read:['Lesson','book'],words:['Vocabulary','abc'],quiz:['Questions','quiz'],booklet:['Booklet','quiz'],workbook:['Assignments','quiz'],grammar:['Grammar','hint']};
// English AL: the Lesson tab (book parts) and the Booklet tab both run on the questions engine (quiz.js); inQ() = a questions-style sheet is on screen
const isAL=()=>!!(LESSON&&LESSON.type==='al'), inQ=()=>tab==='quiz'||tab==='workbook'||tab==='booklet'||(isAL()&&tab==='read'), alSrc=()=>tab==='booklet'?'booklet':'lesson', qKey=()=>isAL()?tab:'quiz';
const KEYTAB={read:'book',quiz:'book',grammar:'book',booklet:'bk',workbook:'pts'};   // the map-key colour each tab belongs to (Words has none)
function paintTabs(){ $$('.tab').forEach(b=>{ const [l0,ic]=TABS[b.dataset.tab], l=(LESSON&&LESSON.tabLabels&&LESSON.tabLabels[b.dataset.tab])||l0, got=LESSON&&STARS[LESSON.id]&&STARS[LESSON.id][b.dataset.tab];
  b.dataset.book=KEYTAB[b.dataset.tab]||''; b.innerHTML=ICON[ic]+`<span>${isAr()&&TABAR[l]||tr(l)}</span>`+(b.dataset.book?'<i class="kd"></i>':'')+(got?`<span class="st">${STAR(true)}</span>`:''); b.hidden=LESSON&&LESSON.tabs?!LESSON.tabs.includes(b.dataset.tab):['booklet','workbook'].includes(b.dataset.tab)?!hasBook(b.dataset.tab):b.dataset.tab==='grammar'||(b.dataset.tab==='quiz'&&SUBJECT&&SUBJECT.id==='arabic'&&!hasBook('quiz')); b.setAttribute('aria-selected',b.dataset.tab===tab); }); const tb=$('.tabs'); if(tb){ const nt=$$('.tab:not([hidden])').length; tb.classList.toggle('many',nt>3); tb.classList.toggle('many5',nt>4); const on=$('.tab[aria-selected="true"]',tb); if(on) tb.scrollTo({left:on.offsetLeft-tb.clientWidth/2+on.offsetWidth/2,behavior:'auto'}); } }   // optional "tabs": ["read","quiz"] in lesson.json shows only those tabs (Math: explanation + questions, or questions only)
// a default lesson shows Booklet / PTS only when it has that book (its pages in subject.json, or questions of that book)
function hasBook(k){ const m=SUBJECT&&LESSON&&SUBJECT.lessons.find(l=>l.id===LESSON.id); return !!(m&&m.pages&&[].concat(m.pages[k]||[]).length)||!!(qz.sets&&qz.file&&LESSON&&qz.file.includes('/'+(m&&m.folder)+'/')&&qz.all.some(q=>qSrcOf(q.set)===k)); }
function setRail(items){ rail.innerHTML=''; items.forEach(it=>{ const b=el('button','dash '+it.kind+(it.on?' on':'')+(it.icon==='restart'?' ln':''),`<span class="rb${it.kind==='tool'?' tgear':''}">${it.kind==='tool'?toolLabel(LESSON.tool):ICON[it.icon]}</span><span>${it.label}</span>`); b.addEventListener('click',it.click); rail.append(b); }); }
function switchTab(t,at){ setLook(t); if(typeof WP!=='undefined'&&WP.saved) wpClose(); stopVoice(); { const r=$('#lmeta .lm-r'); if(r) r.innerHTML=''; } hideHint(); $('#lesson').classList.remove('vtab','qtab','story','poem'); document.body.classList.remove('typing','kb'); tab=t; paintTabs(); lnavPaint(); carAt(0); (t==='booklet'||t==='workbook'||t==='read'&&isAL())?showQuiz(at):t==='grammar'?showGrammar():t==='read'?showRead():t==='words'&&LESSON.vocab?showWords():t==='quiz'&&typeof showQuiz==='function'?showQuiz(at):showGarage(); if(typeof bookTag==='function') bookTag(); pop('#stage > *',{scale:.85,y:10}); pop('#rail .dash',{x:30,y:0}); }
$$('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

// default speed: slow for a page that is a conversation (2+ speakers), normal for everything else; a child's own choice per page wins
function pageDefaultSlow(){ return new Set(LESSON.lines.filter(l=>nPages()<2||l.page===rd.page).map(l=>l.who)).size>1; }
/* LESSON-TEMPLATE REGISTRY (like QM for questions; the list of names + required data is tools/check/lessons.json, docs/templates.md).
   One entry per lesson/page template: show = draws the page from data, story = true when pages swipe inside the story panel. A new template = a new entry + lessons.json + docs; a lesson only names it ("layout" for the lesson, "pageLayouts"[i] per page) and supplies data. */
const LT={
  letter:{show:()=>showLetter(),story:false}, math:{show:()=>showMathExplain(),story:false}, explain:{show:()=>showExplain(),story:false},
  bubbles:{show:()=>showBubbles(),story:false}, point:{show:()=>showPoint(),story:false}, slide:{show:()=>showPoint(),story:false},
  pictures:{show:()=>showPics(),story:false}, poem:{show:()=>showPoem(),story:false}, story:{show:()=>showStory(),story:true}, text:{show:()=>showStory(),story:true}
};
function showRead(){
  { const k=LESSON.id+':'+rd.page; rd.slow=k in rd.pick?rd.pick[k]:pageDefaultSlow(); }
  stage.innerHTML=''; rd.words=[]; rd.lineEls=[]; rd.spotEls=[]; rd.cur=-1; rd.curLine=-1; $('#lesson').classList.remove('story','poem');
  if((LESSON.type==='letter'&&typeof showLetter==='function')||(LESSON.type==='math'&&typeof showMathExplain==='function')) return LT[LESSON.type].show();
  const pl=(LESSON.pageLayouts||[])[rd.page-1];   // optional per page: a name from the LT registry (below)
  const m=LT[pl]||LT[LESSON.layout]; return (m?m.show:showStory)();   // stories and dialogs: picture as the background, words on a soft panel (below)
}
// pages of one lesson: a swipe / drag left or right, the dots above the tabs, or a dot tap. A new page ALWAYS starts reading by itself (Marwa 2026-11-01).
const isStoryPage=p=>{ const m=LT[(LESSON.pageLayouts||[])[p-1]]||LT[LESSON.layout]||LT[LESSON.type]; return !m||m.story; };
function readGo(d,auto){ const np=nPages(), to=rd.page+d; if(to<1||to>np) return; if(!auto) rd.hold=rd.halted; if($('.scene.story:not(.point)')&&isStoryPage(to)) return storyGo(d,auto);
  if(!auto) stopVoice(); clearMarks(); rd.page=to; lnavPaint(); showRead(); carAt(pageSpan()[0]);
  if(LESSON.lines.some(l=>l.page===rd.page)&&!(rd.hold&&!auto)){ const [ps,pe]=pageSpan(); playFrom(ps,pe,true,!!auto); } rd.halted=!auto&&!!rd.hold; }   // (the child stopped the sound before moving = it stays quiet, never restarts by itself) a new page ALWAYS starts reading by itself (Marwa 2026-11-01); the child's own move reads that page only, the automatic run goes on to the next
function readPager(){}   // swipe itself = the shared pager in book.js

/* ---------- STORY / DIALOG lessons (the default Lesson tab) ----------
   The lesson picture is the BACKGROUND of the whole content area (under the side buttons too); the words sit on a soft light panel at the bottom.
   One picture for all pages = only the text slides; a picture per page = the text slides and the picture fades out / in.
   Opening the lesson starts the reading by itself and, when a page ends, goes to the next page and reads it (rd.auto). ANY touch of the sound
   (pause, restart, speed, a word or line, another page, another tab) stops the sound and the automatic run (stopAll clears rd.auto). */
// a lesson may give a second drawing of the same picture for TALL (portrait) screens: lesson.json "pictureTall" / "pagePicturesTall"
const tallScreen=()=>innerHeight>innerWidth;
// where the picture sits behind the story card (the text panel covers its bottom): lesson.json "picturePos" / "picturePosTall" = CSS background-position, e.g. "50% 100%" keeps the faces above the text
const storyPos=bg=>{ bg.style.backgroundPosition=(tallScreen()&&LESSON.picturePosTall)||LESSON.picturePos||''; };
const storyBg=p=>(tallScreen()&&((LESSON.pagePicturesTall&&LESSON.pagePicturesTall[p-1])||LESSON.pictureTall))||(LESSON.pagePictures&&LESSON.pagePictures[p-1])||LESSON.picture||LESSON.scene;
const cssUrl=u=>`url("${new URL(u,location.href).href}")`;
function storyText(){
  const np=nPages(), inn=el('div','in'), ul=el('ul','lines');
  if(LESSON.titleWords&&rd.page===1){ const tk=el('p','stitle'); LESSON.titleWords.forEach(([w,s,e])=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',ev=>{ ev.stopPropagation(); playFrom(Math.max(0,s-.04),e+.06); }); tk.append(sp,' '); }); inn.append(tk); }   // a title that is spoken in the recording stays (it lights up); the "Listen to the story" sentence is gone
  LESSON.lines.forEach((l,li)=>{
    if(np>1&&l.page!==rd.page) return;
    const row=el('li','line'), txt=el('span','txt'); if(l.color) txt.style.color=l.color;
    if(l.who){ const who=el('span','who',l.who+':'); who.style.color=(LESSON.speakers||{})[l.who]||OL; if(l.color) who.style.color=l.color; row.append(who); }
    l.words.forEach(([w,s,e,pop])=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e,pop}); sp.addEventListener('click',ev=>{ ev.stopPropagation(); playFrom(Math.max(0,s-.04),e+.06); }); txt.append(sp,' '); });
    if(l.act){ const ac=el('span','act',l.act), ic=actIcon(l.act); if(ic) ac.append(ic); txt.append(ac); }
    row.addEventListener('click',()=>playLine(li)); row.append(txt); ul.append(row); rd.lineEls[li]=row;
  });
  inn.append(ul); return inn;
}
// ONE text size for the whole lesson (Marwa 2026-11-05): the biggest size (CSS token) at which EVERY page of the lesson fits its panel; every page uses it
// plain story card (Marwa 2026-11-06): the text panel shows ONLY 3 lines (more room for the picture); the text slides up when the reading reaches the hidden lines (mark -> storyScroll)
function fitStory3(note,inn){ note.style.height=''; inn.style.fontSize=''; const full=note.clientHeight, cs=getComputedStyle(inn); if(!full) return;
  const pad=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom); let fs=parseFloat(cs.fontSize), h, pitch=()=>{ const tops=[...new Set($$('.w',inn).map(w=>Math.round(w.getBoundingClientRect().top)))].sort((a,b)=>a-b); const nx=tops.find(t=>t-tops[0]>.8*fs); return nx!=null?nx-tops[0]:1.65*fs; };
  const calc=()=>{ inn.style.fontSize=fs+'px'; h=3*pitch()+parseFloat(getComputedStyle(inn).paddingTop)-.1*fs; };   // the REAL distance between two lines (Arabic marks make a line taller than 1.65em)
  calc(); for(let i=0;i<60&&h>full&&fs>12;i++){ fs-=.5; calc(); }
  $$('.in',note).forEach(x=>x.style.fontSize=fs+'px'); note.style.height=Math.min(h,full)+'px';
  const cw=rd.cur>=0&&rd.words[rd.cur]; if(cw) storyScroll(cw.el,true); else $$('.in',note).forEach(x=>{ x.scrollTop=0; }); }   // after a re-fit the text sits on a whole line again
function storyScroll(e,force){ const inn=e&&e.closest&&e.closest('.scene.story:not(.poem):not(.point) .in'); if(!inn) return false;
  const r=e.getBoundingClientRect(), b=inn.getBoundingClientRect(), cs=getComputedStyle(inn), pt=parseFloat(cs.paddingTop), pb=parseFloat(cs.paddingBottom);
  if(force||r.bottom>b.bottom-pb+1||r.top<b.top+pt-1) inn.scrollTo({top:inn.scrollTop+(r.top-b.top)-pt,behavior:force||!anim?'auto':'smooth'}); return true; }
function fitStory(){ const note=$('.scene.story:not(.poem) .note'), inn=note&&$('.in:last-child',note); if(!inn||!note.clientHeight&&!note.style.height) return;
  if(note.closest('.scene.story:not(.poem):not(.point)')&&!matchMedia('(min-aspect-ratio:5/4)').matches) return fitStory3(note,inn);   // portrait: 3 lines; landscape: the text column fits the whole page
  if(note.style.height) note.style.height='';
  const key=LESSON.id+':'+note.clientWidth+'x'+note.clientHeight;
  if(fitStory.key!==key){ inn.style.fontSize=''; let fs=parseFloat(getComputedStyle(inn).fontSize); const sv=[rd.page,rd.words,rd.lineEls], np=nPages();
    for(let p=1;p<=np;p++){ if(np>1&&!LESSON.lines.some(l=>l.page===p)) continue; rd.page=p; rd.words=[]; rd.lineEls=[];
      const t=storyText(); t.style.visibility='hidden'; t.style.fontSize=fs+'px'; note.append(t);
      for(let i=0;i<60&&t.scrollHeight>t.clientHeight+1&&fs>12;i++){ fs-=.5; t.style.fontSize=fs+'px'; } t.remove(); }
    [rd.page,rd.words,rd.lineEls]=sv; fitStory.key=key; fitStory.fs=fs; }
  $$('.in',note).forEach(x=>x.style.fontSize=fitStory.fs+'px'); }
function showStory(){
  $('#lesson').classList.add('story');
  const scene=el('div','scene story'), bg=el('div','sbg'), note=el('div','note');
  scene.setAttribute('role','img'); scene.setAttribute('aria-label',LESSON.sceneAlt||'');
  bg.style.backgroundImage=cssUrl(storyBg(rd.page)); bg.dataset.u=storyBg(rd.page); storyPos(bg);
  note.append(storyText()); scene.append(bg,note); if(nPages()>1) scene.append(el('span','sbadge',num(rd.page))); stage.append(scene);   // the page number badge of the story card
  const pre=new Set([LESSON.pictureTall,...(LESSON.pagePicturesTall||[])].filter(Boolean)); for(let p=1;p<=nPages();p++) pre.add(storyBg(p)); preloadImgs([...pre]);
  fitStory(); fitTitle();
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
/* "point" page (a picture the words point at, RULES.md "Pointing page"): the WHOLE picture sits on top, uncropped; the words below it.
   While a sentence is read, a circle is drawn on the thing it talks about. Data: lesson.json "pageLayouts":[..,"point",..], the picture = LESSON.pagePictures[page-1] || picture || scene,
   and per line (optional) "mark": {x,y,w,h} or a list of them = centre and size in % of the picture (h left out = a round circle of width w). A line with no mark draws no circle. */
function pointFigure(f){
  const w=el('div','pfx'); if(f.formula){ const r=el('div','pfx-f'); f.formula.forEach(x=>{ const b=el('span',x.img?'pfx-p pfx-i':x.id?'pfx-p':'pfx-o',x.img?'':x.t); if(x.img){ const im=el('img'); im.src=x.img; im.alt=''; im.draggable=false; b.append(im); } if(x.id) b.dataset.id=x.id; r.append(b); }); w.append(r); }
  if(f.word){ const r=el('div','pfx-w'); glyphs(f.word).forEach((g,i)=>{ const b=el('span','pfx-g',g); b.dataset.id='g'+i; r.append(b); }); w.append(r); }
  return w; }
function showPoint(){
  $('#lesson').classList.add('story');
  const scene=el('div','scene story point'+(((LESSON.pageLayouts||[])[rd.page-1]==='slide')?' slide':'')), fig=el('div','pfig'), box=el('div','pbox'), img=el('img'), note=el('div','note'), u=storyBg(rd.page);
  scene.setAttribute('role','img'); scene.setAttribute('aria-label',LESSON.sceneAlt||'');
  img.alt=''; img.draggable=false; img.src=new URL(u,location.href).href;
  const ar=()=>{ if(img.naturalWidth) box.style.setProperty('--ar',img.naturalWidth+'/'+img.naturalHeight); }; img.addEventListener('load',ar); ar();
  if(LESSON.figure){ box.classList.add('figbox'); box.style.removeProperty('--ar'); box.append(pointFigure(LESSON.figure)); } else box.append(img);   // figure = built from text (no picture): {formula:[{t,id?}], word}; its letters have ids g0,g1.. and pop while read
  if(scene.classList.contains('slide')){ const card=el('div','scard'); card.style.setProperty('--ar',box.style.getPropertyValue('--ar')||'1.4'); img.addEventListener('load',()=>card.style.setProperty('--ar',img.naturalWidth+'/'+img.naturalHeight)); card.append(box,note,el('span','sbadge',num(rd.page))); fig.append(card); note.append(storyText()); scene.append(fig); stage.append(scene); }   // slide = the book's card: picture in its frame, the sentence on a light panel over its bottom edge
  else { fig.append(box);
  note.append(storyText()); scene.append(fig,note); stage.append(scene); }
  LESSON.lines.forEach((l,li)=>{ if(!l.mark||(LESSON.pages>1&&l.page!==rd.page)) return;
    const g=el('div','pmg'); [].concat(l.mark).forEach(m=>{ const c=el('i','pmk'); c.style.cssText=`left:${m.x}%;top:${m.y}%;width:${m.w}%;`+(m.h?`height:${m.h}%;aspect-ratio:auto`:''); g.append(c); });
    box.append(g); rd.spotEls[li]=g; });
  fitStory(); fitTitle();
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
/* NASHEED page (layout "poem", RULES.md "Nasheed page"): the book page is the background (poem and QR box already removed from the picture), the poem is LIVE text
   placed where the book prints it. Data: lesson.json "layout":"poem", "poem":{ "ar":[w,h] (only the page's width:height RATIO), "bg":colour round the page, "size":font size in % of the page width,
   "base":baseline shift in em, "lines":[ {"y": baseline in % of the page height, "parts":[ {"r":right edge in % of the page width,"l":left edge in %,"n":words} ... ] } ]  (ALL relative: no pixel in lesson data) } and "lines"[i].words as in any lesson
   (a word may hold ONE or more "ـ" = where the book stretches it). The stretch is re-built here so every half-line is exactly as wide as in the book. */
function showPoem(){
  const P=LESSON.poem, [W,H]=P.ar, scene=el('div','scene story poem'), pg=el('div','pg');
  $('#lesson').classList.add('story','poem');
  scene.setAttribute('role','img'); scene.setAttribute('aria-label',LESSON.sceneAlt||'');
  scene.style.setProperty('--poem-bg',P.bg||'#e5f3f6'); pg.style.setProperty('--ar',W+'/'+H); pg.style.setProperty('--arn',W/H);
  pg.style.setProperty('--fs',P.size||5); pg.style.setProperty('--base',(P.base==null?.62:P.base)+'em'); pg.style.backgroundImage=cssUrl(storyBg(1));
  LESSON.lines.forEach((l,li)=>{
    const row=el('div','pline'), cfg=P.lines[li]; let wi=0;
    row.style.top=cfg.y+'%'; row.addEventListener('click',()=>playLine(li)); rd.lineEls[li]=row;
    cfg.parts.forEach(pt=>{
      const h=el('span','ph'); h.style.right=(100-pt.r)+'%'; h.dataset.tw=(pt.r-pt.l).toFixed(3);
      l.words.slice(wi,wi+pt.n).forEach(([w,s,e,pop],k)=>{ const sp=el('span','w'); sp.dataset.t=w; sp.textContent=w; rd.words.push({el:sp,s,e,pop});
        sp.addEventListener('click',ev=>{ ev.stopPropagation(); playFrom(Math.max(0,s-.04),e+.06); }); if(k) h.append(' '); h.append(sp); });
      wi+=pt.n; row.append(h);
    });
    pg.append(row);
  });
  scene.append(pg); stage.append(scene);
  fitPoem(); fitTitle();
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
// the stretch ("ـ") of each half-line: as many as make it exactly as wide as the book's (binary search on the total, spread over the stretched words by their book weights)
function fitPoem(){
  const pg=$('.scene.poem .pg'); if(!pg) return; const full=pg.getBoundingClientRect().width; if(!full) return;
  $$('.ph',pg).forEach(h=>{
    const ws=$$('.w',h).map(w=>({w,p:w.dataset.t.split(/(ـ+)/)})), runs=[]; ws.forEach(x=>x.p.forEach((t,i)=>{ if(i%2) runs.push({x,i,wt:t.length}); }));
    h.style.width=''; if(!runs.length) return;
    const target=parseFloat(h.dataset.tw)/100*full, tot=runs.reduce((a,r)=>a+r.wt,0);
    const set=T=>{ runs.forEach(r=>{ r.x.p[r.i]='ـ'.repeat(Math.max(1,Math.round(T*r.wt/tot))); }); ws.forEach(x=>{ x.w.textContent=x.p.join(''); }); return h.getBoundingClientRect().width; };
    let lo=runs.length, hi=300; while(lo<hi){ const m=(lo+hi+1)>>1; if(set(m)<=target) lo=m; else hi=m-1; } set(lo); h.style.width=h.dataset.tw+'%';   // the last few pixels go into the gaps between the words
  });
}
// d = +1 next / -1 previous. auto = the run that goes by itself (the sound just ended): it reads the new page too
function storyGo(d,auto){
  const to=rd.page+d; if(to<1||to>nPages()) return;
  const scene=$('.scene.story'); if(!scene) return;
  if(!auto) stopVoice();   // the child's own move: sound off, no automatic run
  clearMarks(); rd.page=to; rd.words=[]; rd.lineEls=[]; rd.spotEls=[]; rd.cur=-1; rd.curLine=-1;
  { const k=LESSON.id+':'+rd.page; rd.slow=k in rd.pick?rd.pick[k]:pageDefaultSlow(); }
  lnavPaint(); carAt(pageSpan()[0]); if(typeof bookTag==='function') bookTag();
  { const bd=$('.sbadge',scene); if(bd) bd.textContent=num(rd.page); }
  const note=$('.note',scene), old=$('.in',note), nin=storyText(), bg=$('.sbg',scene), u=storyBg(rd.page);
  note.append(nin); fitStory();
  if(anim){
    G.killTweensOf([old,nin]);
    G.fromTo(nin,{x:d*60,opacity:0},{x:0,opacity:1,duration:.32,ease:'power2.out',clearProps:'transform,opacity'});
    if(old) G.to(old,{x:-d*60,opacity:0,duration:.28,ease:'power2.in',onComplete:()=>old.remove()});
  } else if(old) old.remove();
  if(bg.dataset.u!==u){   // another picture: fade the old one out, the new one in
    bg.dataset.u=u;
    if(anim){ G.killTweensOf(bg); G.timeline().to(bg,{opacity:0,duration:.22,ease:'power1.in'}).call(()=>{ bg.style.backgroundImage=cssUrl(u); }).to(bg,{opacity:1,duration:.3,ease:'power1.out',clearProps:'opacity'}); }
    else bg.style.backgroundImage=cssUrl(u);
  }
  readRail();
  if(LESSON.lines.some(l=>l.page===rd.page)&&!(rd.hold&&!auto)){ const [ps,pe]=pageSpan(); playFrom(ps,pe,true,!!auto); } rd.halted=!auto&&!!rd.hold;   // same rule: every new page reads by itself
}
// swipe / drag left or right = ONE shared pager in book.js (whole page area); no per-screen swipe code
// the unit / lesson / name line is ONE line always: the letters shrink until it fits
function fitTitle(){ const h=$('#lessonTitle'), box=h&&h.parentElement; if(!h||!box||!box.offsetWidth) return; h.style.fontSize=''; let fs=parseFloat(getComputedStyle(h).fontSize);
  for(let i=0;i<40&&h.scrollWidth>box.clientWidth+1&&fs>7;i++){ fs-=.5; h.style.fontSize=fs+'px'; } }
addEventListener('resize',()=>{ clearTimeout(fitTitle.t); fitTitle.t=setTimeout(()=>{ fitTitle(); if($('.scene.story')) fitStory(); const bg=$('.scene.story .sbg'); if(bg&&LESSON&&bg.dataset.u!==storyBg(rd.page)){ bg.dataset.u=storyBg(rd.page); bg.style.backgroundImage=cssUrl(bg.dataset.u); } if(bg&&LESSON) storyPos(bg); },150); });   // turned the tablet: the tall / wide drawing
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ fitTitle(); fitStory(); if(typeof fitPoem==='function') fitPoem(); });
// "layout": "pictures" (Lesson 2): no text card; each line is a picture ("pic") spread over the stage at "pos" [x, y] % (its centre),
// its word written under it. The word being read is marked as usual and its picture pops up a little; tapping the word (or the picture) reads it.
function showPics(){
  const scene=el('div','scene pics'+(LESSON.pkWrap?' wrap':'')), area=el('div','pkarea'), np=nPages();
  scene.append(el('p','task',STAR(true)+((LESSON.pageTasks&&LESSON.pageTasks[rd.page-1])||LESSON.task)), area);
  // ONE even layout for every word-reading page (Marwa 2026-11-01): the pictures are spread in equal cells (columns x rows chosen from how many there are),
  // never placed by hand per lesson, so no big empty parts next to crowded ones. P = tall screen, L = wide screen.
  // a page with sentences under the pictures ("more" lines): on a tall screen ONE column, each row = picture | its sentences (cells were too narrow, text fell on the next picture)
  const sents=LESSON.lines.some(l=>l.more&&(np<=1||l.page===rd.page)); if(sents) area.classList.add('sents');
  const cnt=LESSON.lines.filter(l=>!l.more&&(np<=1||l.page===rd.page)).length||1, cP=cnt<=2||sents?1:2, cL=cnt<=3?cnt:4;
  area.style.cssText=`--pcP:${cP};--prP:${Math.ceil(cnt/cP)};--pcL:${cL};--prL:${Math.ceil(cnt/cL)}`;
  LESSON.lines.forEach((l,li)=>{
    if(np>1&&l.page!==rd.page) return;
    // tall pictures (the teacher) are made a bit taller, so all look about the same size
    if(l.more){ const prev=area.lastElementChild, row=el('span','txt'); l.words.forEach(([w,s,e],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); row.append(sp); if(k<l.words.length-1) row.append(' '); });
      row.addEventListener('click',ev=>{ if(ev.target===row) playLine(li); }); prev.append(row); prev.classList.add('sent'); rd.lineEls[li]=row; return; }   // "more": true = another sentence under the previous picture
    const it=el('div','pk'), pic=el('button','pkpic',`<img src="${l.pic}" alt="">`), txt=el('span','txt');
    // (no hand-placed position any more: lesson.json "pos"/"posP" are ignored, the cells decide)
    if(l.mw) it.style.setProperty('--mw',l.mw+'cqw');   // optional per line: "k" = size factor, "mw" = widest it may be (% of the stage)
    pic.setAttribute('aria-label','Listen: '+l.words.map(w=>w[0]).join(' ')); pic.addEventListener('click',()=>playLine(li));
    l.words.forEach(([w,s,e],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); txt.append(sp); if(k<l.words.length-1) txt.append(' '); });
    it.append(pic,txt); area.append(it); rd.lineEls[li]=it;
  });
  readPager(scene);
  stage.append(scene); fitPk(); $$('img',area).forEach(im=>{ if(!im.complete) im.addEventListener('load',()=>setTimeout(fitPk,30),{once:true}); }); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitPk); setTimeout(fitPk,700);   // again once the word pens are on the words (they make words a bit wider)
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
/* every cell keeps its picture AND its sentences inside it (Marwa 2026-11-04, Shapes and Colors page 3 was all on top of each other): the text of the page
   shrinks together (one size for the whole page) until no cell spills over. Any screen, any lesson; no per-lesson sizes. */
function fitPk(){ requestAnimationFrame(()=>{ const ar=$('.scene.pics .pkarea'); if(!ar) return; const ts=$$('.pk .txt',ar), pks=$$('.pk',ar); if(!ts.length) return;
  ts.forEach(t=>t.style.fontSize=''); let fs=parseFloat(getComputedStyle(ts[0]).fontSize);
  const over=()=>pks.some(p=>p.scrollHeight>p.clientHeight+1||[...p.children].some(c=>c.scrollWidth>p.clientWidth+1));
  if(!over()) return; let lo=8, hi=fs; const set=v=>ts.forEach(t=>t.style.fontSize=v+'px');
  for(let k=0;k<12;k++){ const m=(lo+hi)/2; set(m); if(over()) hi=m; else lo=m; } set(Math.floor(lo)); }); }   // the biggest size that fits
addEventListener('resize',()=>{ clearTimeout(fitPk.t); fitPk.t=setTimeout(fitPk,160); });
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
/* story pages: the text panel starts BELOW the whole button column (RULES.md, story page). --rail-h = height of the rail */
function railH(){ const r=$('#rail'),l=$('#lesson'); if(r&&l) l.style.setProperty('--rail-h',(((c=>c?c.offsetTop+c.offsetHeight:0)(r.lastElementChild))||0)+'px'); if($('.scene.story .in')) fitStory(); }   // the panel's room changed: fit the text again
addEventListener('resize',()=>setTimeout(railH,60));
function readRail(){ setTimeout(railH,0); 
  if(tab!=='read') return; const [ps,pe]=pageSpan(), res=!player.run&&player.pos>ps+.2, part=()=>rd.stopAt!=null&&!rd.full;
  const on=rd.playing||player.run;   // ONE button: Read while it is quiet, Stop while it reads; a tap toggles
  setRail([
    on?{kind:'stop',icon:'stop',label:tr('Stop'),click:()=>{ if(part()){ stopAll(); clearMarks(); } else pausePlay(); rd.halted=true; readRail(); }}
      :{kind:'go',icon:'play',label:tr(res?'Continue':'Read'),click:()=>playFrom(res?player.pos:ps,pe,true)},
    {kind:'again',icon:'restart',label:tr('Restart'),click:()=>playFrom(ps,pe,true)},
    {kind:'speed',icon:rd.slow?'slow':'fast',label:tr(rd.slow?'Slow':'Normal'),click:()=>{ const was=player.run&&!part(), t=now(); if(was){ halt(); player.run=false; } rd.slow=!rd.slow; rd.pick[LESSON.id+':'+rd.page]=rd.slow; if(was) playFrom(t,pe,true); else readRail(); }}
  ]);
}

function showGarage(){
  stage.innerHTML='';
  const g=el('div','garage',`<div><span class="car"></span><p class="outline">${tr('Coming soon!')}</p><span>${COURSE.hints.garage}</span></div>`);
  putCar(g.querySelector('.car'),'sad'); stage.append(g); setRail([]);
}

// the tab bar is a slider: a finger scrolls it, the mouse drags it
(function(){ const tb=$('.tabs'); let dn=null;
  tb.addEventListener('pointerdown',e=>{ if(e.pointerType==='mouse') dn={x:e.clientX,l:tb.scrollLeft,m:false}; });
  addEventListener('pointermove',e=>{ if(dn){ const dx=e.clientX-dn.x; if(Math.abs(dx)>5) dn.m=true; if(dn.m) tb.scrollLeft=dn.l-dx; } });
  addEventListener('pointerup',()=>{ if(dn&&dn.m) tb.addEventListener('click',e=>{ e.stopPropagation(); e.preventDefault(); },{capture:true,once:true}); dn=null; });
})();

// a new word of the lesson (its Vocabulary list) inside the reading text gets its own colour
function markNewWords(){
  if(!LESSON||!LESSON.vocab) return; const set=new Set(LESSON.vocab.map(v=>String(v.word).toLowerCase().replace(/[^\p{L}\p{N}' ]/gu,'').trim()).filter(Boolean));
  $$('#stage .w').forEach(w=>{ const t=w.textContent.toLowerCase().replace(/[^\p{L}\p{N}']/gu,''); w.classList.toggle('nw',!!t&&set.has(t)); });
}
{ const _sr=showRead; showRead=function(){ const r=_sr.apply(this,arguments); try{ markNewWords(); }catch(e){} return r; }; }
