/* QUESTIONS tab — the book's exercises as a game. Content: data/<subject>/<lesson>/questions.json.
   One fixed sheet: task line + book page on top, progress stars, the word, then the picture(s).
   pick  = listen, tap the matching picture (two pictures side by side)
   yesno = one picture + word, tap the tick or the cross
   match = one board like the book: the letter in the middle ("center"), the pictures around it at "pos" [x, y] (% of the board);
           tap a picture that starts with it: a line joins it to the letter; a wrong one shakes. One progress star per right picture.
   circle = a board like match but without the letter in the middle: all pictures are on the screen, tap the ones that fit the task;
            a right one gets a ring + celebration, a wrong one an alarm. One progress star per right picture.
   letter = one picture + the word with its first letter missing (_eacher), tap the beginning letter: "letters": ["t","i"], "answer": index
   link   = book "Match the picture with the correct word": all the words in one row (a column on tall phones when there are many) and all the pictures in the other row;
            the child drags a line from a word to its picture (or taps one, then the other). "layout":"cols" = words left, pictures right. One star per pair. item "full": audio (or a list played in order, built from the words' own recordings) of the joined phrase (e.g. أَنَا أَشْعُرُ), said when that pair is joined; rule: say the whole phrase, not only the first word.
   choice = book "circle the correct word": the picture, beside it the text (optional "ask" line, "lead", and "options":[a,b] with "answer": index); tap the right word, it gets a ring.
   Options on a set: "mark":"ring" (pick: the right picture gets a ring, not a tick), "silent":true (circle: do not say the word when it is circled).
   type   = one picture + the word with a letter missing ("missing": its index), the child types it on the keyboard: "answer": "t"
   The choices (tick/cross, letters, words, numbers) are ALWAYS under the question and its picture, in portrait and landscape (css/qlayout.css, Marwa 2026-11-04).
   A right answer: stamp + celebrate (no spoken praise), then on to the next question by itself. A wrong one: a shake, try again.
   Two books: each set says "book": "book" (the student's book, default) or "workbook"; two buttons on top switch between them. */
const qz={sets:null,all:[],list:[],src:'book',i:0,run:0,busy:false,file:null,show:0};
/* THE QUESTION MODELS (docs/RULES.md §6, Marwa 2026-10-20): ONE model per question type, the same in every subject.
   QM[type] = { sheet: 'word' (the word line + the play area) | 'board' (one board for the whole set) | 'box' (one part in the play area),
                draw(...)   how it is shown and solved,  help(q,w)  what the Help bulb lights (nothing = no bulb),
                bulb:0 = the model has its own help,  own:1 = reads itself (no speaker added, no auto-read),
                (choices are ALWAYS under the question, css/qlayout.css; no "side" any more),  fit:0 = no picture stacking }
   Every type registers here (quiz.js, quiz-letters.js, quiz-al.js, quiz-math.js) and qGo draws it through this one path.
   A design change is made in the model, so every question of that type changes together. */
const QM={};
const Q_SRC={book:['Book',ICON.book],workbook:['PTS','<svg viewBox="0 0 24 24"><path d="M5 19l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L9 18z"/><path d="M14.5 6.5l3 3"/><path d="M5 19h14"/></svg>']};
const R_Q=p=>{ const f=qz.file||''; return p&&!/^(https?:|\/|data:)/.test(p)?f.slice(0,f.lastIndexOf('/')+1)+p:p; };
const qSrcOf=s=>s.book||'book';
const tabSrc=()=>({workbook:'workbook',booklet:'booklet'}[tab]||'book');   // the book a Questions-style tab shows: Q = Book, PTS = Workbook, Booklet
// the books that really have questions in this lesson (a book with none yet shows no button); other books (booklet ...) can be added by a set's "book":"booklet"
const qSrcInfo=k=>Q_SRC[k]||[k[0].toUpperCase()+k.slice(1),ICON.book];
const qSrcList=()=>isAL()?[]:[...new Set(['book',...qz.all.map(q=>qSrcOf(q.set))])].filter(k=>qz.all.some(q=>qSrcOf(q.set)===k)).sort((a,b)=>(Object.keys(Q_SRC).indexOf(a)+1||9)-(Object.keys(Q_SRC).indexOf(b)+1||9)).map(k=>[k,qSrcInfo(k)]);
const Q_ARR='<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
const Q_KEY='<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h1M11.5 10h1M16.5 10h1M8 14h8"/></svg>';
const Q_TICK='<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 6.5"/></svg>', Q_CROSS='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

async function qLoad(){
  const m=SUBJECT&&SUBJECT.lessons.find(l=>l.id===LESSON.id); if(!m) return false;
  const file=m.file.replace(/lesson\.json$/,'questions.json');
  if(qz.file===file&&qz.sets) return true;
  const base=file.slice(0,file.lastIndexOf('/')+1), R=p=>p&&!/^(https?:|\/|data:)/.test(p)?base+p:p;
  try{ const d=await get(file); qz.sets=currSets(d.sets); qz.file=file; }catch(e){ qz.sets=null; qz.file=null; return false; }
  qz.all=[]; qz.sets.forEach((s,si)=>{ s.taskSrc=Array.isArray(s.taskAudio)?s.taskAudio.map(R):R(s.taskAudio);   // taskAudio: one file, or a list played in order (prompt + letter name)
   
    if(s.type==='link') s.items.forEach(it=>{ it.answer=true; it.fullSrc=[].concat(it.full||[]).map(R); });
    if((QM[s.type]||{}).sheet==='board'){ s.centerSrc=R(s.centerAudio); s.items.forEach(it=>{ it.src=Array.isArray(it.audio)?it.audio.map(R):R(it.audio); it.src2=it.audio2?R(it.audio2):it.src; it.picSrc=R(it.pic); it.wpicSrc=it.wpic?R(it.wpic):''; if(it.dots&&typeof mDots==='function') it.picSrc=mDots(it.dots); });
      if(s.type==='circle'&&s.shuffle&&!s._sh){ s._sh=1; const ps=s.items.map(it=>it.pos); for(let t=0;t<20;t++){ ps.sort(()=>Math.random()-.5); if(ps.some((p,k)=>p!==s.items[k].pos)) break; } s.items.forEach((it,k)=>it.pos=ps[k]); }   // "shuffle": the options swap their places (the book order is not kept)
      if(s.type==='circle') s.items.forEach((it,k)=>{ if(!it.pos){ const n=s.items.length, cols=3, rows=Math.ceil(n/cols), r=Math.floor(k/cols), c=k%cols, inRow=Math.min(cols,n-r*cols);
        it.pos=[(c+.5+(cols-inRow)/2)*100/cols,(r+.5)*100/rows]; } });   // no "pos": spread them in rows of 3
      s.items.filter(it=>it.answer).forEach((it,k)=>qz.all.push({set:s,si,k,word:s.center||''})); return; }
    if(s.type==='sound'){ qz.all.push({set:s,si,k:0,items:s.items}); return; }   // "sound": all the pictures of the exercise on ONE page
    if(s.type==='qa'&&s.together){ qz.all.push({set:s,si,k:0,together:1,items:s.items.map(it=>({...it,audio:R(it.audio),ansAudio:it.ansAudio,pic:R(it.pic)}))}); return; }   // "together": all the question+answer pairs on one page
    s.items.forEach((it,k)=>{
    const q={...it,set:s,si,k,audio:R(it.audio)}; if(it.pics) q.pics=it.pics.map(R); if(it.picsTall) q.picsTall=it.picsTall.map(R); if(it.pic) q.pic=R(it.pic); qz.all.push(q); }); });
  preloadImgs(qz.sets.flatMap(s=>[s.centerPic&&R(s.centerPic),...(s.items||[]).flatMap(it=>[...(it.pics||[]).map(R),it.pic&&R(it.pic)])]));
  qPick(qz.src); return true;
}
async function showQuiz(start){
  stage.innerHTML=''; setRail([]); $('#lesson').classList.add('qtab');
  const me=++qz.show; busy(true); const ok=await qLoad(); busy(false);
  if(!inQ()||me!==qz.show) return;   // another tab, or a newer call (e.g. a book page jump) took over
  stage.innerHTML='';
  if(!ok||!qz.all.length){ $('#lesson').classList.remove('qtab'); showGarage(); return; }
  qPick(isAL()?alSrc():tabSrc());
  if(!qz.list.length){ $('#lesson').classList.remove('qtab'); showGarage(); return; }
  const wrap=el('div','quiz');
  wrap.innerHTML=`<div class="qhead"><span class="qex"></span><span class="qtask"></span><button class="qsay qtsay" aria-label="Hear the question">${typeof SAY_LN==="string"?SAY_LN:ICON.sound}</button>${LESSON.tool?`<button class="qtool tgear" aria-label="${toolName(LESSON.tool)}">${toolLabel(LESSON.tool)}</button>`:''}</div>
    <div class="qdots"></div>
    <div class="qword" dir="ltr"><b></b><button class="qsay" aria-label="Listen again">${typeof SAY_LN==="string"?SAY_LN:ICON.sound}</button></div>
    <div class="qplay"></div><div class="qans"></div>`;
  stage.append(wrap);
  { const hb=el('button','qhelpb',ICON.hint); hb.hidden=true; hb.setAttribute('aria-label',isAr()?'ساعدني':tr('Help')); $('#lmeta .lm-r').replaceChildren(hb); hb.onclick=()=>qHelp(); }   // the Help bulb stands at the right of the row above the tabs
  $('.qword .qsay',wrap).addEventListener('click',()=>qSay());
  $('.qtsay',wrap).addEventListener('click',()=>qTask()); $('.qtask',wrap).addEventListener('click',()=>qTask());   // the header is read once by itself; no speaker icon (CSS hides .qtsay), a tap on the line reads it again
  $('.qword',wrap).addEventListener('click',e=>{ if(wrap.dataset.type==='type'&&!e.target.closest('.qsay')) qFocus(); });
  qStart(start!=null?start:0);
}
// the questions of one book (Book or Workbook)
function qPick(src){ qz.src=src; qz.list=qz.all.filter(q=>qSrcOf(q.set)===src); }
function qStart(i){ const w=$('.quiz'); if(!w) return;
  $('.qdots',w).innerHTML=qz.list.map((q,k)=>`${k&&qGrp(q.set)!==qGrp(qz.list[k-1].set)?'<span class="qsep"></span>':''}<i data-i="${k}">${STAR(false)}</i>`).join('');
  $('.qdots',w).style.setProperty('--n',qz.list.length+$$('.qsep',w).length*2);
  $('.qdots',w).onclick=e=>{ const d=e.target.closest('i[data-i]'); if(!d) return; hideHint(); qz.busy=false; qGo(+d.dataset.i); };   // each star opens its own question
  qLayout(); qGo(Math.min(i,qz.list.length-1)); }
// the arrows: to the start of the next / previous exercise of this book (not the items inside one)
// the star of the question we are on is 'cur'; the stars of its whole part (same exercise) are 'grp'
function qCur(i){ const g=qz.list[i]&&qGrp(qz.list[i].set); $$('.qdots i').forEach((x,k)=>{ x.classList.toggle('cur',k===i); x.classList.toggle('grp',qGrp(qz.list[k].set)===g); }); }
// wait until no sound is playing any more (a sentence read after an answer is never cut by the move to the next question); never longer than `cap` ms (Ahmed 2026-11-10)
async function qIdle(run,cap){ const t0=Date.now(); let idle=0; cap=cap||12000;
  while(Date.now()-t0<cap){ if(run!==qz.run) return; const on=(typeof vs!=='undefined'&&vs.src)||(window.speechSynthesis&&speechSynthesis.speaking); idle=on?0:idle+60; if(idle>=240) return; await new Promise(r=>setTimeout(r,60)); } }
const qGrp=s=>s.grp?s.page+'|'+s.grp:s.ex!=null?s.page+'|'+s.ex:s;   // sets with the same book exercise (e.g. one circle set per colour) are ONE exercise for the arrows
function qSetStart(d){ const s=qz.list[qz.i]&&qz.list[qz.i].set; if(!s) return -1; const g=qGrp(s); let i=qz.i;
  if(d>0){ while(i<qz.list.length&&qGrp(qz.list[i].set)===g) i++; return i<qz.list.length?i:-1; }
  while(i>0&&qGrp(qz.list[i-1].set)===g) i--; if(i===0) return -1; const p=qGrp(qz.list[i-1].set); i--; while(i>0&&qGrp(qz.list[i-1].set)===p) i--; return i; }
function qSet(d){ const i=qSetStart(d); if(i<0) return; hideHint(); blip(600); qGo(i); }
// which question a book page starts at (used by the page jump); picks Book or Workbook from the page
function qFirstOnPage(p,src){ const f=qz.all.find(q=>q.set.page===p&&(!src||qSrcOf(q.set)===src)); qPick(f?qSrcOf(f.set):src||'book');
  const i=qz.list.findIndex(q=>q.set.page===p); return i<0?0:i; }
function qGo(i){
  stopVoice(); $$('#lmeta .qxhelp').forEach(x=>x.remove()); hideHint(); setTimeout(qHelpShow,60); const run=++qz.run; qz.i=i; qz.busy=false;
  const q=qz.list[i], s=q.set, w=$('.quiz'); if(!w) return;
  q.solved=false;   // every visit draws the question unsolved, so its speaker reads the question again (never the answer)
  w.dataset.type=s.type;
  { const old=$('.qmodel',w); if(old) old.remove(); }   // the paper's heading (Classroom / Homework / Weekly C) is no longer shown on any question
  $('.qex',w).textContent=s.ex?num(s.ex):'?'; $('.qex',w).hidden=false; $('.qtask',w).textContent=s.task; qFitTask();   // RULE (Marwa 2026-11-05): every question header shows its number, or '?' when the book has none
  footPage(s.page); lnavPaint();
  qCur(i);
  if($('#lesson').classList.contains('qrail')){ $('#lesson').classList.remove('qrail'); setRail([]); }   // the side Listen / Stop button belongs to the 'together' page only
  const a0=$('.qans',w); if(a0.parentElement!==w) w.append(a0);   // back in its own place before the pictures are cleared (qLayout moves it beside the picture)
  const qi=$('#qin'); if(qi&&s.type!=='type'){ qi.blur(); qi.remove(); }
  const qxi=$('#qxin'); if(qxi&&s.type!=='write'){ qxi.blur(); qxi.remove(); }
  const m=QM[s.type]; if(!m) return;
  $$('.qask',w).forEach(e=>e.parentNode&&e.parentNode.removeChild(e));   // a question line left over from the previous question must not hide this question's speaker (css :has(.qask))
  if(m.sheet!=='box'){ const qw=$('.qword',w); if(qw) qw.hidden=false; const ts=$('.qtsay',w); if(ts) ts.hidden=false; }   // a box question (colour / face / story...) hides the word line; the next word question shows it again
  if(m.sheet==='board') return qBoard(w,q,i,run);
  w._board=null;
  if(m.sheet==='box') return qxGo(w,q,i,run);
  // the word line: the word (letter / type: with its gaps), the play area, the answers
  { const b=$('.qword b',w); b.className=''; b.removeAttribute('dir'); if(m.word) b.innerHTML=m.word(q); else { b.textContent=''; qToks(b,q.word); if(/\s/.test(String(q.word||'').trim())){ b.classList.add('qsent'); if(isAr()) b.dir='rtl'; } } }   // a sentence wraps, big and centred (css/qlayout.css)   // a plain word / sentence: every word tappable (shared qToks)
  const play=$('.qplay',w), ans=$('.qans',w); play.innerHTML=''; ans.innerHTML='';
  m.draw(play,ans,q,s);
  qLayout(); carFrac(i/qz.list.length);
  // the first question of each exercise: the instruction is read first, then the word
  setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; if(qNewEx()) await qTask(); if(run===qz.run&&inQ()){ if(s.type==='type') qFocus(); if(q.autoSay) qSay(); } },350);   // Marwa 2026-11-04: the question itself is NOT read by itself (the child reads; the speaker beside it helps)
}
// letter / type: the word with its gaps ("missing" = one letter, "gaps" = several, typed left to right), filled in when the child finds them
const qGapWord=q=>{ const lw=q.letters&&q.letters[q.answer]!=null?String(q.letters[q.answer]):'', gps=q.gaps||(q.missing==null&&[...lw].length>1&&String(q.word).startsWith(lw)?[...lw].map((_,i)=>i):[q.missing||0]), w=wsWord(q.word,{hide:gps,ltr:!isAr()}); $$('.lt.hid',w).forEach(x=>x.classList.add('qgap')); wsCur(w);   // THE word component (js/wordslots.js); the gaps are its hidden letters
  return (q.scr?`<span class="qscr">${q.scr.split('').join(' ')}</span>`:'')+w.outerHTML; };
const qOnePic=q=>el('div','qpic one',`<img src="${q.pic}" alt="${q.word||''}"><span class="qmark"></span>`);
const qHalf=a=>{ const o=a.map((x,k)=>k); if(Math.random()<.5) o.reverse(); return o; };   // the right one is not always on the same side
/* ---------- SHARED tappable words (every subject, every question model): a tap on one word reads that word alone (Marwa 2026-11-04).
   English: data/en-shared/q/<slug>.mp3 (falls back to the word pack / device voice). Arabic: NO machine voice, so an Arabic word is a span
   (it can carry the vocab pen) but says nothing unless the model gives it its own recording (onTap). qToks = alToks. ---------- */
const alSlug=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60).replace(/-+$/,'');
const alClean=w=>String(w).replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g,'');
const alWordSrc=w=>`data/en-shared/q/${alSlug(alClean(w))}.mp3`;
// text -> tappable words (a tap reads that word alone: the child is learning to read)
function alToks(host,text,onTap){
  String(text).split(/\s+/).filter(Boolean).forEach((w,k)=>{ const sp=el('span','alw',w); if(/[\u0600-\u06FF]/.test(w)&&!onTap){ host.append(k?' ':'',sp); return; } sp.addEventListener('click',e=>{ e.stopPropagation(); if(qz.busy&&!onTap) return; hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(w),alClean(w)).then(()=>sp.classList.remove('lit')); if(onTap) onTap(w); });
    host.append(k?' ':'',sp); });
}
const qToks=alToks;
QM.pick={sheet:'word', draw(play,ans,q){ qHalf(q.pics).forEach(k=>{ const b=el('button','qpic',`<img src="${q.pics[k]}" alt=""><span class="qmark"></span>`); b.setAttribute('aria-label','Picture '+(k+1)); b.dataset.k=k;
    b.addEventListener('click',()=>qAnswer(b,k===q.answer)); play.append(b); }); },
  help:(q,w)=>$$('.qpic',w).filter(b=>+b.dataset.k===q.answer)};
/* THE choice button (Marwa 2026-11-04, every subject): one look, one size (--q-choice, css/qlayout.css), always UNDER the question (.qans / a choices row).
   A letter or a number = a round button; a word = a pill of the same height (words:true = the row has words, so even "up" is a pill). Models make their choices ONLY with qChBtn. */
const qWords=a=>a.some(o=>[...String(o)].length>2);
const qChBtn=(t,words)=>{ const s=String(t), n=[...s].length, b=el('button','rb qbtn qlet qch'+(n>2||words?' wd':n>1?' two':''),'<span></span>'); $('span',b).textContent=s; b.setAttribute('aria-label',s); return b; };
// the answer is marked the way the book asks: "circle" -> a ring round it; "match" / "join" / "صل" -> a line (Marwa 2026-11-04)
const qCircleTask=s=>/\bcircle\b|دائر|حوّ?ط/i.test((s&&s.task)||'');
QM.letter={sheet:'word', word:qGapWord, draw(play,ans,q){ play.append(qOnePic(q));
    qHalf(q.letters).forEach(k=>{ const b=qChBtn(q.letters[k]); b.setAttribute('aria-label','Letter '+q.letters[k]); b.dataset.k=k;
      b.addEventListener('click',()=>qAnswer(b,k===q.answer)); ans.append(b); }); },
  help:(q,w)=>$$('.qans .qlet',w).filter(b=>+b.dataset.k===q.answer)};
/* choice ("Look, read, and circle"): the sentence big on top with a blank where the answer goes, the picture, the word choices under it (THE choice buttons) */
QM.choice={sheet:'word', fit:0, word:()=>'', draw(play,ans,q){ const b=$('.qword b'); b.classList.add('qsent'); b.textContent=''; b.dir=isAr()?'rtl':'ltr';   // an Arabic sentence reads right to left (the word line itself is ltr for letter gaps)
    if(q.ask){ const a=el('span','qask'); qToks(a,q.ask); b.append(a); }
    const sen=el('span','qsen'); if(q.lead){ qToks(sen,q.lead); sen.append(' '); } sen.append(el('span','qblank','')); if(q.tail){ sen.append(' '); const t=el('span'); qToks(t,q.tail); sen.append(t); } b.append(sen);
    if(q.pic) play.append(el('div','qpic one',`<img src="${q.pic}" alt="">`));   // a choice without a picture (Arabic appendix pronoun sentences, no picture in the book)
    q.options.forEach((o,k)=>{ const c=qChBtn(o,qWords(q.options)); c.dataset.k=k; c.addEventListener('click',()=>qChoose(c,k,q)); ans.append(c); }); },
  help:(q,w)=>$$('.qans .qch',w).filter(b=>+b.dataset.k===q.answer)};
QM.type={sheet:'word', word:qGapWord, draw(play,ans,q){ play.append(qOnePic(q));
    qFocus(); },   // the keyboard stays open from one word to the next; it first opens when the instruction has been read (or when the child taps the letter)
  help:(q,w)=>[$('.qword .qgap:not(.got)',w)].filter(Boolean),
  peek(q,w){ const g=$('.qword .qgap:not(.got)',w); if(!g) return; const gi=g.dataset.i!=null&&q.gaps?+g.dataset.i:null, ch=gi!=null?q.word[gi]:q.answer; if(!ch) return;
    wsPeek(g); qFocus(); }};
QM.yesno={sheet:'word', draw(play,ans,q){ play.append(qOnePic(q));
    const fc=q.faces?'<img src="data/pics/ar-smiley.png" alt="">':'', sd=q.faces?'<img src="data/pics/ar-sad-face.png" alt="">':'';   // faces:true = a happy and a sad face in place of the tick and the cross (Arabic u2l1 ex 2, Marwa 2026-11-06)
    [[true,'yes',q.faces?fc:Q_TICK,'It matches'],[false,'no',q.faces?sd:Q_CROSS,'It does not match']].forEach(([v,c,ic,l])=>{
      const b=el('button','rb qbtn '+c+(q.faces?' qface':''),ic); b.setAttribute('aria-label',l); b.addEventListener('click',()=>qAnswer(b,v===q.answer,v)); ans.append(b); }); },
  help:(q,w)=>[$(q.answer?'.qans .qbtn.yes':'.qans .qbtn.no',w)].filter(Boolean)};
// the match board: built once per set; each right picture joined moves on to the next star without rebuilding it
function qBoard(w,q,i,run){
  const s=q.set; carFrac(i/qz.list.length); qLayout();
  if(w._board===s) return;
  w._board=s; const play=$('.qplay',w); play.innerHTML=''; $('.qans',w).innerHTML='';
  QM[s.type].draw(w,s,play,run);
}
// match / circle: the pictures (or words) on one board like the book, the letter / picture in the middle when the set has one
function qPicBoard(w,s,play,run){
  const b=el('div','qboard'); if(s.bigP) b.classList.add('bigP'); if(s.dense) b.classList.add('dense');   /* "dense": many small options (the book's 28-letter board, Arabic u3l10 p113): smaller buttons so rows of 6 never overlap */ if(s.type==='circle'||qCircleTask(s)) b.classList.add('ring'); if(s.mark==='tick') b.classList.add('tickmk');   // "mark":"tick" (circle): a small green check under the tapped item, not a ring (book: put a ✓ under the letter, Ahmed 2026-11-06)   // the book says "circle": a ring round the picture, never a line (Marwa 2026-11-04)   // "bigP": bigger pictures on tall screens (with "posP" per item)
  if(s.centerPic){ const c=el('div','qcenter pic',`<img src="${R_Q(s.centerPic)}" alt="">`); { const ca=(s.centerAtP&&!$('#lesson').classList.contains('q-land'))?s.centerAtP:s.centerAt; if(ca){ c.style.setProperty('--cx',ca[0]); c.style.setProperty('--cy',ca[1]); } } b.append(c); }   // "centerPic": a picture to match (book: circle the SIMILAR picture)
  if(s.center){ const c=el('button','qcenter',`<span>${s.center}</span>`); c.setAttribute('aria-label','Letter '+s.center); c.addEventListener('click',()=>qSound(s.centerSrc,s.center[0]));
    b.append(c); }
  b._items=s.items;
  s.items.forEach(it=>{ const p=el('button','qmp'+(it.picSrc?'':' tx'),(it.picSrc?`<img src="${it.picSrc}" alt="">`+(it.text?`<b class="qpt">${it.text}</b>`:''):`<b>${it.word}</b>`)+`<span class="qmark"></span>`); p.setAttribute('aria-label',it.word);   // a word-only option (book: circle the different WORD)
    if(!it.picSrc&&it.audio&&it.src){ const sp=el('span','qsay qmsay',typeof SAY_LN==='string'?SAY_LN:ICON.sound); sp.setAttribute('role','button'); sp.setAttribute('aria-label','Listen'); sp.addEventListener('click',e=>{ e.stopPropagation(); if(!qz.busy) qSound(it.src,it.word); }); p.prepend(sp); }   // a word to find gets its Listen speaker (Ahmed 2026-11-09, all word boards): a child who cannot read it hears it before choosing; a tap on the speaker never circles
    const ps=it.posP&&!$('#lesson').classList.contains('q-land')?it.posP:it.pos; p.style.left=`clamp(calc(var(--w) / 2), ${ps[0]}%, calc(100% - var(--w) / 2))`; p.style.top=`clamp(calc(var(--w) / 2), ${ps[1]}%, calc(100% - var(--w) / 2))`; p.addEventListener('click',()=>qMatch(p,it,s)); b.append(p); });
  play.append(b); qFitBoard(b); requestAnimationFrame(()=>qFitBoard(b));
  // the first time: read the instruction, then the letter's sound
  const first=qNewEx(); setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; if(first) await qTask(); if(s.center&&qz.list[qz.i]&&qz.list[qz.i].set===s&&inQ()) qSound(s.centerSrc,s.center[0]); },350);
}
// BIGGEST pictures that fit (Marwa 2026-11-08, ALL subjects): a board of pictures sizes every picture from the room it has: as big as the nearest
// neighbours / the letter in the middle / the board edges allow (squares never overlap), so a page with room never shows tiny pictures. Looks at the pictures
// only (a board with words keeps its own sizes); --wfit is read by css/quiz.css (.qmp), re-run on every resize.
function qFitBoard(b){ b=b||$('.qboard'); if(!b||b.classList.contains('dense')||b.querySelector('.qmp.tx')) return;
  const B=b.getBoundingClientRect(); if(!B.width||!B.height) return; const its=[...b.querySelectorAll('.qmp')], c=b.querySelector('.qcenter'); if(!its.length) return;
  const pts=its.map((e,k)=>{ const it=b._items&&b._items[k]; const ps=it?((it.posP&&!$('#lesson').classList.contains('q-land'))?it.posP:it.pos):null; return ps?[ps[0]*B.width/100,ps[1]*B.height/100]:null; });
  if(pts.some(p=>!p)) return;
  let w=Math.min(B.width,B.height)*.92; const cw=c?c.getBoundingClientRect().width:0; if(c&&c.classList.contains('pic')) return;
  for(let i=0;i<pts.length;i++){ for(let j=i+1;j<pts.length;j++){ w=Math.min(w,Math.max(Math.abs(pts[i][0]-pts[j][0]),Math.abs(pts[i][1]-pts[j][1]))*.94); }
    if(c){ const cr=c.getBoundingClientRect(), cx=cr.left+cr.width/2-B.left, cy=cr.top+cr.height/2-B.top; w=Math.min(w,(2*Math.max(Math.abs(pts[i][0]-cx),Math.abs(pts[i][1]-cy))-cw)*.94); } }
  const lo=Math.min(B.width*.2,B.height*.3); b.style.setProperty('--wfit',Math.max(lo,w).toFixed(0)+'px'); }
// the lines of the joined pictures, worked out again when the screen changes size
function qLines(fresh){ const bd=$('.qboard'); if(!bd||$('.quiz').dataset.type!=='match'||bd.classList.contains('ring')) return; const c=$('.qcenter span',bd); if(!c) return; const B=bd.getBoundingClientRect();
  const mid=e=>{ const r=e.getBoundingClientRect(); return [r.left+r.width/2-B.left,r.top+r.height/2-B.top]; }, [x2,y2]=mid(c);
  $$('.qmp.done',bd).forEach(p=>{ let ln=p._line; if(!ln){ ln=p._line=el('i','qline'); bd.prepend(ln); }
    const [x1,y1]=mid(p), len=Math.hypot(x2-x1,y2-y1);
    ln.style.cssText=`left:${x1}px;top:${y1}px;width:${len}px;transform:rotate(${Math.atan2(y2-y1,x2-x1)}rad)`+(p===fresh?' scaleX(0)':'');
    if(p===fresh) requestAnimationFrame(()=>requestAnimationFrame(()=>{ ln.style.transform=`rotate(${Math.atan2(y2-y1,x2-x1)}rad) scaleX(1)`; })); });
}
// the same for every model: a right answer lights its progress star and moves the car on; a wrong one gives the soft alarm + a shake
function qStar(){ const d=$(`.qdots i[data-i="${qz.i}"]`); if(d){ d.innerHTML=STAR(true); d.classList.add('got'); if(anim) G.fromTo(d,{scale:1.8},{scale:1,duration:.6,ease:'elastic.out(1.2,.4)'}); } carFrac((qz.i+1)/qz.list.length); }
const qCross=b=>{ const m=$('.qmark',b); if(!m) return; m.className='qmark bad'; m.innerHTML=Q_CROSS; setTimeout(()=>{ m.className='qmark'; m.innerHTML=''; },700); };   // a wrong picture: a red cross for a moment
function qBad(b){ tone(170,'square',.06,.18); if(anim) G.fromTo(b,{x:-9},{x:0,duration:.5,ease:'elastic.out(1.5,.25)'}); }
function qSound(src,text){ vStop(); if(Array.isArray(src)) return src.reduce((p,f)=>p.then(()=>playFile(f)),Promise.resolve()).catch(()=>{}); return (src?playFile(src).catch(()=>tts(text,isAr()?'ar':'en',.75)):tts(text,isAr()?'ar':'en',.75)).catch(()=>{}); }
async function qMatch(btn,it,s){
  if(qz.busy) return; hideHint();
  if(btn.classList.contains('done')) return s.silent?null:qSound(it.src,it.word);
  if(!it.answer){
    qCross(btn); return qBad(btn);
  }
  const run=qz.run, more=qSetMoreAfter(s); btn.classList.add('done'); if(!more) qz.busy=true;
  // a line from the picture to the letter in the middle, drawn out like a pencil line
  const ring=btn.closest('.qboard.ring'); if(!ring) qLines(btn);
  if(ring&&anim) G.fromTo(btn,{'--ring':1.5},{'--ring':1,duration:.4,ease:'back.out(2)'});
  celebrate(btn); if(!s.silent) qSound(it.src,it.word);
  if(qMore(s)) return; return qDone(s,run,1100);
}
// a right answer of a board that has more answers still to find: its star, and on to the next one at once (nothing waits, so the child can tap the next right picture straight away)
const qBoardHelp=(q,w)=>{ const s=q.set, ps=$$('.qmp',w), it=s.items.find((x,k)=>x.answer&&ps[k]&&!ps[k].classList.contains('done')); return it?[ps[s.items.indexOf(it)]]:[]; };
QM.match={sheet:'board', draw:qPicBoard, help:qBoardHelp};
QM.circle={sheet:'board', draw:qPicBoard, help:qBoardHelp};
const qSetMoreAfter=s=>qz.i+1<qz.list.length&&qz.list[qz.i+1].set===s;
function qMore(s){ const next=qz.i+1; if(next>=qz.list.length||qz.list[next].set!==s) return false;
  qStar(); qz.i=next; qCur(next);
  lnavPaint(); return true; }
// one more right answer of a board: its star, then on to the next one (the same board stays when the exercise has more)
async function qDone(s,run,ms){
  qStar();
  await new Promise(r=>setTimeout(r,ms)); await qIdle(run); if(run!==qz.run||!inQ()) return;
  const next=qz.i+1;
  if(next>=qz.list.length){ qz.busy=false; award(LESSON.id,qKey()); return; }
  if(qz.list[next].set!==s) await new Promise(r=>setTimeout(r,500)); if(run!==qz.run||!inQ()) return;
  qGo(next);
}
// the hidden text box for "type" questions: one box kept while the questions change, so the keyboard does not close between words
function qFocus(){ const wd=$('.qword'); if(!wd) return; let inp=$('#qin');
  if(!inp){ inp=el('input','qin'); Object.assign(inp,{type:'text',id:'qin',autocomplete:'off',spellcheck:false});
    ['autocorrect','autocapitalize'].forEach(a=>inp.setAttribute(a,'off')); inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Type the missing letter');
    inp.addEventListener('input',()=>{ const ch=inp.value.replace(/\s/g,'').slice(-1); inp.value=''; qTyped(ch); });
    inp.addEventListener('focus',()=>wd.classList.add('focus')); inp.addEventListener('blur',()=>wd.classList.remove('focus'));
    wd.append(inp); }
  { const q=qz.list[qz.i]; wsInput(inp,q&&q.word); }   // English word: English keyboard (js/wordslots.js)
  inp.focus({preventScroll:true}); }
function qTyped(ch){ const q=qz.list[qz.i]; if(!ch||qz.busy||!q||q.set.type!=='type') return;
  const gap=$('.qword .qgap:not(.got)'), gi=gap&&gap.dataset.i!=null&&q.gaps?+gap.dataset.i:null, want=gap&&gap.textContent?gap.textContent:(gi!=null?q.word[gi]:q.answer), right=sameLetter(normDigits(ch),String(want));   // the truth is the letter the child SEES missing (the gap's own letter); q.answer is only a fallback (Marwa 2026-11-05: ch_ir showed the i missing but wanted a)
  if(right&&q.gaps&&$$('.qword .qgap:not(.got)').length>1){ gap.classList.remove('bad','hid','cur'); gap.classList.add('got'); wsCur($('.qword .ws')); tone(660,'sine',.05,.12); if(anim) G.fromTo(gap,{scale:1.4},{scale:1,duration:.35,ease:'back.out(3)'}); return; }   // one gap filled, more to go
  if(!right&&gap) wsBad(gap);   // a wrong letter is never written: the place only shakes
  qAnswer(gap||$('.qword'),right); }
// a computer keyboard works even when the text box lost focus (e.g. after tapping the speaker)
addEventListener('keydown',e=>{ if(!inQ()||e.ctrlKey||e.metaKey||e.altKey||e.key.length!==1) return; const q=qz.list[qz.i];
  if(!q||q.set.type!=='type'||document.activeElement&&document.activeElement.id==='qin') return; e.preventDefault(); qTyped(normDigits(e.key)); });
function qSay(){ const q=qz.list[qz.i]; if(!q) return; vStop(); const w=$('.qword'); w.classList.add('lit');
  if(q.sayFn&&!q.solved) return q.sayFn();   // English AL: the question read with a pause where the blank is
  const done=()=>{ const x=$('.qword'); if(x) x.classList.remove('lit'); };
  if((q.askTask||(q.set.type==='choice'&&!q.askAudio&&!q.ask))&&!q.solved) return qTask().then(done,done);   // a choice with no question text of its own ("choose the title of the nasheed"): the speaker reads the exercise header only, never the item's sound (the answer / the whole nasheed) (Marwa 2026-11-05)
  if(q.askAudio&&!q.solved) return qSound(R_Q(q.askAudio),'').then(done,done);   // the QUESTION (with all its choices), never the answer: tools/lessons/choice_ask_audio.py; Arabic = a library slot, silent until recorded
  if(q.ask&&!q.solved) return tts(q.ask,'en',.75).then(done,done);   // "q.ask": the question read without its answer (the full sentence is said once it is solved)
  return (q.audio?playFile(q.audio).catch(()=>tts(q.word,isAr()?'ar':'en',.75)):tts(q.word,isAr()?'ar':'en',.75)).then(done,done); }
// read the exercise instruction aloud (its line lights up while it plays)
function qTask(){ const q=qz.list[qz.i]; if(!q) return Promise.resolve(); vStop(); const t=$('.qtask'); if(t) t.classList.add('lit');
  const done=()=>{ const x=$('.qtask'); if(x) x.classList.remove('lit'); };
  const ts=q.set.taskSrc, fb=()=>tts(q.set.task,isAr()?'ar':'en',.85);
  if(!ts) return fb().then(done,done);   // no task recording: never ask for a file called "undefined"
  const play=Array.isArray(ts)?ts.reduce((p,u,k)=>p.then(()=>{ if(qz.list[qz.i]!==q) return; return (k?new Promise(r=>setTimeout(r,120)):Promise.resolve()).then(()=>playFile(u)); }),Promise.resolve()):playFile(ts);
  return play.catch(fb).then(done,done); }
function qStamp(pic,cross){
  const m=$('.qmark',pic); m.className='qmark good'; m.innerHTML=cross?Q_CROSS:Q_TICK;
  if(anim){ const p=$('path',m), len=p.getTotalLength(); G.fromTo(m,{scale:1.6},{scale:1,duration:.35,ease:'back.out(3)'}); G.fromTo(p,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.35,ease:'power2.out'}); }
}
async function qAnswer(btn,right,said){
  if(qz.busy) return; hideHint(); const run=qz.run, q=qz.list[qz.i];
  if(!right){
    if(q.set.type==='pick') qCross(btn);
    return qBad(btn);
  }
  qz.busy=true; vStop();
  if(q.set.type==='pick'){ if(q.set.mark==='ring') qRing(btn); else qStamp(btn,false); } else { btn.classList.add('on'); if(btn.classList.contains('qch')&&qCircleTask(q.set)) qRing(btn); qStamp($('.qpic.one'),said===false); }
  $$('.qword .qgap:not(.got)').forEach(gap=>{ gap.classList.remove('bad','hid','cur','peek'); gap.classList.add('got'); if(anim) G.fromTo(gap,{scale:1.4},{scale:1,duration:.4,ease:'back.out(3)'}); });
  $$('.qpic').forEach(p=>p!==btn&&q.set.type==='pick'&&p.classList.add('dim'));
  celebrate(q.set.type==='pick'?btn:$('.qpic.one'));
  qStar();
  await new Promise(r=>setTimeout(r,500)); if(run!==qz.run) return;
  await new Promise(r=>setTimeout(r,900)); await qIdle(run); if(run!==qz.run||!inQ()) return;
  if(qz.i+1<qz.list.length) qGo(qz.i+1); else { qz.busy=false; award(LESSON.id,qKey()); }
}
/* portrait or landscape, from the screen size WITHOUT the keyboard (same idea as the vocabulary page): the page does not change when it opens */
const qScr={w:innerWidth,h:innerHeight};
function qLayout(){ const L=$('#lesson'); if(!L) return;
  const typing=document.activeElement&&document.activeElement.id==='qin';
  if(innerWidth!==qScr.w||innerHeight>qScr.h||!typing){ qScr.w=innerWidth; qScr.h=innerHeight; }
  const land=qScr.w>qScr.h*1.1;
  L.classList.toggle('q-land',land); L.classList.toggle('q-port',!land); L.classList.toggle('q-short',land&&qScr.h<500);
  // wide screens: the choices go right beside the picture (inside the picture row), so the child sees what to do
  const wr=$('.quiz'), ans=$('.qans'), pla=$('.qplay');
  if(wr&&ans&&pla){ const side=land&&!!(QM[wr.dataset.type]||{}).side; if(side&&ans.parentElement!==pla) pla.append(ans); else if(!side&&ans.parentElement===pla) wr.append(ans); }
  qLinkRefresh(land);
  // two pictures: side by side, or one above the other when that makes them bigger (tall phones)
  const pl=$('.qplay'); if(!pl) return; pl.classList.remove('stack'); if(wr&&(QM[wr.dataset.type]||{}).fit===0) return; const w=pl.clientWidth, h=pl.clientHeight, a=.8;
  pl.classList.toggle('stack', Math.min(w,h/2*a) > Math.min(w/2,h*a)*1.15); }
addEventListener('resize',()=>{ if(inQ()){ qLayout(); qLines(); qFitBoard(); } });

/* link: words in one row, pictures in the other (or two columns); a line joins a word to its picture */
function qLinkBoard(w,s,play,run){
  const n=s.items.length, bd=el('div','qlink'); bd.dataset.n=n; bd.style.setProperty('--n',n); bd._set=s; bd._pairs=[];
  const wd=el('div','qlw'), pc=el('div','qlp');
  let ord=s.items.map((_,k)=>k); for(let t=0;t<30;t++){ ord.sort(()=>Math.random()-.5); if(n<2||ord.every((v,k)=>v!==k)) break; }   // the pictures are not under their own words
  s.items.forEach((it,k)=>{ const b=el('button','qlk qlkw'+(it.wpicSrc?' pw':''),(it.wpicSrc?`<img src="${it.wpicSrc}" alt="" draggable="false">`:`<b>${it.word}</b>`)+`${it.rel?`<small class="qrel">${it.rel}</small>`:''}`); b.dataset.k=k; b.setAttribute('aria-label',it.word); wd.append(b); });
  ord.forEach(k=>{ const it=s.items[k], b=el('button','qlk qlkp'+(it.picSrc?'':' tx'),it.picSrc?`<img src="${it.picSrc}" alt="" draggable="false">`:`<b>${it.text2}</b>`); b.dataset.k=k; b.setAttribute('aria-label',it.picSrc?'Picture':it.text2); pc.append(b); });   // "text2": a word to join instead of a picture
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','qlsvg');
  bd.append(wd,pc,svg); play.append(bd);
  s.items.forEach(it=>[it.src,it.src2,...(it.fullSrc||[])].flat().forEach(f=>warmFile(f)));   // every sound of the board is ready before the first join
  let drag=null, sel=null; const rel=(x,y)=>{ const B=bd.getBoundingClientRect(); return [x-B.left,y-B.top]; };
  const kind=b=>b.classList.contains('qlkw')?'w':'p';
  const tmp=()=>{ let l=$('.qtmp',svg); if(!l){ l=document.createElementNS('http://www.w3.org/2000/svg','line'); l.setAttribute('class','qtmp'); svg.append(l); } return l; };
  const clearSel=()=>{ if(sel){ sel.classList.remove('sel'); sel=null; } };
  bd.addEventListener('pointerdown',e=>{ const b=e.target.closest('.qlk'); if(!b||qz.busy) return; e.preventDefault(); hideHint();
    const it=s.items[+b.dataset.k];
    if(b.classList.contains('done')){ if(kind(b)==='w'||b.classList.contains('tx')) qLinkSay(it); return; }
    drag={b,x:e.clientX,y:e.clientY,moved:false}; try{ bd.setPointerCapture(e.pointerId); }catch(_){} });
  bd.addEventListener('pointermove',e=>{ if(!drag) return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10) return; drag.moved=true;
    const [a,b]=qAnchor(bd,drag.b,kind(drag.b)==='w'), [x,y]=rel(e.clientX,e.clientY), l=tmp(); l.setAttribute('x1',a); l.setAttribute('y1',b); l.setAttribute('x2',x); l.setAttribute('y2',y); });
  const end=e=>{ if(!drag) return; const d=drag; drag=null; const l=$('.qtmp',svg); if(l) l.remove();
    const t=e.type==='pointerup'&&document.elementFromPoint(e.clientX,e.clientY); let tb=t&&t.closest&&t.closest('.qlk');
    if(e.type==='pointerup'&&(!tb||kind(tb)===kind(d.b))){   // dropped near, not exactly on: join the closest free one of the other row (whole word / whole picture area counts)
      let best=null,bd2=1e9; $$('.qlk',bd).forEach(c=>{ if(kind(c)===kind(d.b)||c.classList.contains('done')) return; const r=c.getBoundingClientRect(), dx=Math.max(r.left-e.clientX,0,e.clientX-r.right), dy=Math.max(r.top-e.clientY,0,e.clientY-r.bottom), dd=Math.hypot(dx,dy); if(dd<bd2){ bd2=dd; best=c; } });
      tb=bd2<=60?best:null; }
    if(e.type==='pointercancel') return;
    if(d.moved){ clearSel(); if(tb&&tb!==d.b&&kind(tb)!==kind(d.b)&&!tb.classList.contains('done')) qLinkTry(bd,s,d.b,tb,run); return; }
    // a tap: pick it up (a word also says itself), or join it to the one picked before
    if(kind(d.b)==='w'){ const it=s.items[+d.b.dataset.k]; qSound(it.src,it.word); } else if(d.b.classList.contains('tx')){ const it=s.items[+d.b.dataset.k]; qSound(it.src2||it.src,it.text2); }
    if(sel&&sel!==d.b&&kind(sel)!==kind(d.b)){ const a=sel; clearSel(); qLinkTry(bd,s,a,d.b,run); return; }
    if(sel===d.b){ clearSel(); return; }
    clearSel(); sel=d.b; d.b.classList.add('sel'); };
  bd.addEventListener('pointerup',end); bd.addEventListener('pointercancel',end);
  qLinkRefresh(L$().classList.contains('q-land'));
  if(qNewEx()) setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; await qTask(); },350);
}
const L$=()=>$('#lesson');
QM.link={sheet:'board', fit:0, draw:qLinkBoard, help:(q,w)=>{ const bd=$('.qlink',w); if(!bd) return []; const wb=$$('.qlkw',bd).find(b=>!b.classList.contains('done')); return wb?[wb,$$('.qlkp',bd).find(b=>b.dataset.k===wb.dataset.k)].filter(Boolean):[]; }};
const qNewEx=()=>{ const i=qz.i; return i<=0||qGrp(qz.list[i-1].set)!==qGrp(qz.list[i].set)||qz.list[i-1].set.task!==qz.list[i].set.task; };   // the instruction is read only when a new exercise starts, not for each part of it
// where a line leaves a word / arrives at a picture (bottom / top in rows, right / left in columns), in the board's own pixels
function qAnchor(bd,b,isWord){ const B=bd.getBoundingClientRect(), r=b.getBoundingClientRect(), cols=bd.classList.contains('cols');
  return cols?[(isWord?r.right:r.left)-B.left, r.top+r.height/2-B.top]:[r.left+r.width/2-B.left,(isWord?r.bottom:r.top)-B.top]; }
function qLinkLine(bd,wb,pb,cls){ const svg=$('.qlsvg',bd), l=document.createElementNS('http://www.w3.org/2000/svg','line'); l.setAttribute('class',cls||'qlj');
  const [x1,y1]=qAnchor(bd,wb,true), [x2,y2]=qAnchor(bd,pb,false); [['x1',x1],['y1',y1],['x2',x2],['y2',y2]].forEach(([k,v])=>l.setAttribute(k,v)); svg.append(l); return l; }
function qLinkLines(){ const bd=$('.qlink'); if(!bd) return; $$('.qlj',bd).forEach(l=>l.remove()); bd._pairs.forEach(([wb,pb])=>qLinkLine(bd,wb,pb)); }
// words and pictures as big as the board allows; rows or columns follow the screen
function qLinkRefresh(land){ const bd=$('.qlink'); if(!bd) return; const s=bd._set, n=s.items.length;
  const wordsOnly=s.items.every(it=>!it.picSrc&&!it.wpicSrc);   // word-to-word joins (meaning / plural): in portrait two columns, so the words can be BIG with room for the dots (Ahmed 2026-11-09)
  const mx=Math.max(...s.items.map(it=>Math.max(it.word.length,(it.text2||'').length))), sent=!land&&s.items.some(it=>it.word.split(/\s+/).length>=3&&it.word.length>16);   // whole sentences do not fit side by side on a tall screen (Ahmed 2026-11-09)
  bd.classList.toggle('cols',s.layout==='cols'||(!land&&(n>4||wordsOnly||sent))); bd.classList.toggle('sent',sent);
  const B=bd.getBoundingClientRect(), cols=bd.classList.contains('cols');
  const cw=cols?B.width*.4:(B.width-(n-1)*8)/n-14, rh=cols?B.height/n*.5:40;
  const gp=parseFloat(getComputedStyle(cols?bd:($('.qlw',bd)||bd)).columnGap)||0, colW=cols?(B.width-gp)/2:(B.width-(n-1)*gp)/n;   // the room one word box really has
  let fs=Math.max(12,Math.min(isAr()?48:32,cw/(.6*mx),rh*1.1,colW/(1.12*(.6*mx+1.2))));
  if(sent) fs=Math.max(14,Math.min(26,colW/(.6*mx/2.4),rh*.55));   // 2-3 wrapped lines per sentence
  if(cols&&wordsOnly) fs=Math.max(fs,Math.min(38,colW/3.2,rh*1.1));   // big words: the fit loop below shrinks it if a word does not fit
  bd.style.setProperty('--fs',fs+'px');
  // the WHOLE word must sit inside its rectangle: shrink until the widest text fits its box (never cut, never over the connector dot)
  for(let k=0;k<30&&fs>10;k++){ const bad=$$('.qlkw,.qlkp.tx',bd).some(bx=>{ const b=$('b',bx); return b&&(b.scrollWidth>bx.clientWidth-parseFloat(getComputedStyle(bx).paddingLeft)-parseFloat(getComputedStyle(bx).paddingRight)+1||b.getBoundingClientRect().bottom>bd.getBoundingClientRect().bottom+1||(sent&&bx.offsetHeight>B.height/n*.96)); }); if(!bad) break; fs-=1; bd.style.setProperty('--fs',fs+'px'); }
  qLinkLines(); }
/* what a joined pair says: "full" (whole phrase) if given; else, when the partner has its own recording ("audio2"), the word then the partner; else the word */
async function qLinkSay(it){ vStop(); if(it.fullSrc&&it.fullSrc.length){ for(const f of it.fullSrc){ try{ await playFile(f); }catch(_){} } return; } if(it.text2&&it.audio2&&it.src2&&it.src2!==it.src){ for(const f of [it.src,it.src2]){ try{ await playFile(f); }catch(_){} } return; } return qSound(it.src,it.word); }
async function qLinkTry(bd,s,a,b){
  const run=qz.run;   // the board is kept from pair to pair, so it must use the question running NOW, not the one it was built in
  const wb=a.classList.contains('qlkw')?a:b, pb=wb===a?b:a, it=s.items[+wb.dataset.k];
  if(wb.dataset.k!==pb.dataset.k&&!(s.group&&(it.text2?s.items[+pb.dataset.k].text2===it.text2:it.pic&&s.items[+pb.dataset.k].word===it.word))){ const l=qLinkLine(bd,wb,pb,'qlj bad'); setTimeout(()=>l.remove(),500); return qBad([wb,pb]); }
  if(!qSetMoreAfter(s)) qz.busy=true; wb.classList.add('done'); pb.classList.add('done'); bd._pairs.push([wb,pb]);
  const l=qLinkLine(bd,wb,pb); if(anim){ const len=l.getTotalLength?l.getTotalLength():300; G.fromTo(l,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.35,ease:'power2.out'}); }
  celebrate(pb); qLinkSay(it);   // "full": the joined phrase of the pair (word + its partner), said on a right join
  if(qMore(s)) return; return qDone(s,run,900);
}
/* choice: tap the right word of the two; it gets a hand-drawn ring */
async function qChoose(btn,k,q){
  if(qz.busy) return; hideHint();
  if(k!==q.answer) return qBad(btn);
  qz.busy=true; q.solved=true; const run=qz.run; qRing(btn); btn.classList.add('on'); $$('.qans .qch').forEach(o=>o!==btn&&o.classList.add('dim')); { const bl=$('.qword .qblank'); if(bl){ bl.textContent=q.options[k]; bl.classList.add('got'); } } celebrate(btn); qSay();   // solved: now the whole answer sentence is said
  return qAdvance(run,1900);
}
async function qAdvance(run,ms){
  qStar();
  await new Promise(r=>setTimeout(r,ms)); await qIdle(run); if(run!==qz.run||!inQ()) return;
  if(qz.i+1<qz.list.length) qGo(qz.i+1); else { qz.busy=false; award(LESSON.id,qKey()); }
}
// the child "circles" it: a pink oval drawn round the picture or word
function qRing(el0){ const im=el0.classList.contains('qpic')&&$('img',el0);   // a picture button can be taller than its picture: ring the picture itself
  if(im){ const b=el0.getBoundingClientRect(), r=im.getBoundingClientRect(); el0.style.setProperty('--rt',(r.top-b.top)+'px'); el0.style.setProperty('--rb',(b.bottom-r.bottom)+'px'); el0.style.setProperty('--rl',(r.left-b.left)+'px'); el0.style.setProperty('--rr',(b.right-r.right)+'px'); }
  el0.classList.add('ringed'); if(anim) G.fromTo(el0,{'--ring':1.6},{'--ring':1,duration:.4,ease:'back.out(2)'}); }

/* Help (the same bulb for every model): the right answer lights up faintly for a moment, then fades away again.
   qHelpEls() = what the question's MODEL lights now (QM[type].help); nothing = no bulb. Models with their own help (write, qa, math keypads) say bulb:0 */
function qHelpEls(){ const q=qz.list[qz.i], w=$('.quiz'); if(!q||!w||qz.busy) return []; const m=QM[q.set.type];
  return m&&m.help&&m.bulb!==0?m.help(q,w).filter(Boolean):[]; }
// a type with its own Help bulb (write, math) puts it at the right of the row above the tabs, where the generic bulb stands
// the question text takes the whole line: one line, the font shrinks a little when it must (wraps only below 13px)
function qFitTask(){ const t=$('.quiz .qtask'); if(!t) return; t.style.fontSize=''; t.style.whiteSpace='nowrap'; requestAnimationFrame(()=>{ if(!t.isConnected) return; let fs=parseFloat(getComputedStyle(t).fontSize); for(let k=0;k<20&&t.scrollWidth>t.clientWidth+1&&fs>13;k++){ fs--; t.style.fontSize=fs+'px'; } if(t.scrollWidth>t.clientWidth+1) t.style.whiteSpace=''; }); }
function qHelpHost(b){ const r=$('#lmeta .lm-r'); if(r) r.append(b); const g=$('#lmeta .qhelpb'); if(g) g.hidden=true; }
function qHelpShow(){ const b=$('#lmeta .qhelpb'); if(!b) return; b.hidden=!qHelpEls().length; lnavFit(); }
function qHelp(){ if(qz.busy) return; const L=qHelpEls(); if(!L.length) return; hideHint(); blip(660,.05);
  const pk=QM[qz.list[qz.i].set.type].peek; if(pk){ pk(qz.list[qz.i],$('.quiz')); return; }   // write types: the letter now due shows light and see-through for a moment (same as the Words tab)
  L.forEach(e=>{ const f=e.classList.contains('qxc')?$('span',e):null; e.classList.remove('qhl'); void e.offsetWidth; e.classList.add('qhl'); if(f) f.classList.add('qhl-t'); setTimeout(()=>{ e.classList.remove('qhl'); if(f) f.classList.remove('qhl-t'); },2000); }); }

/* a very wide picture can come with a TALL copy (the same things in 2 rows: item picsTall, tools/pics/trim.py --stack).
   The one that shows the things BIGGER in the picture box is used: wide on a short phone box, tall on a tablet (Marwa 2026-11-04) */
function qPicFit(im,tall){ if(!tall) return; const wide=im.src, d={}, t=new Image();
  const pick=()=>{ const f=im.parentElement; if(!im.isConnected){ removeEventListener('resize',pick); return; }
    if(!d.w&&im.naturalWidth&&im.src===wide) d.w=[im.naturalWidth,im.naturalHeight]; if(!f||!d.w||!t.naturalWidth) return;
    const W=f.clientWidth, H=f.clientHeight, sc=(w,h)=>Math.min(W/w,H/h), want=sc(t.naturalWidth,t.naturalHeight)>sc(...d.w)*1.08?t.src:wide;
    if(im.src!==want) im.src=want; };
  im.addEventListener('load',pick); t.onload=pick; t.src=tall; addEventListener('resize',pick); }
