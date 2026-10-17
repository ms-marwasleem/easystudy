/* QUESTIONS tab — the book's exercises as a game. Content: data/<subject>/<lesson>/questions.json.
   One fixed sheet: task line + book page on top, progress stars, the word, then the picture(s).
   pick  = listen, tap the matching picture (two pictures side by side)
   yesno = one picture + word, tap the tick or the cross
   match = one board like the book: the letter in the middle ("center"), the pictures around it at "pos" [x, y] (% of the board);
           tap a picture that starts with it: a line joins it to the letter; a wrong one shakes. One progress star per right picture.
   circle = a board like match but without the letter in the middle: all pictures are on the screen, tap the ones that fit the task;
            a right one gets a ring + celebration, a wrong one an alarm. One progress star per right picture.
   tick   = all pictures on the screen at once, each with its word and a tick and a cross (both faded): the child taps the right one, which lights up
            (a wrong tap = alarm); "answer": true/false. One progress star per picture.
   letter = one picture + the word with its first letter missing (_eacher), tap the beginning letter: "letters": ["t","i"], "answer": index
   link   = book "Match the picture with the correct word": all the words in one row (a column on tall phones when there are many) and all the pictures in the other row;
            the child drags a line from a word to its picture (or taps one, then the other). "layout":"cols" = words left, pictures right. One star per pair.
   choice = book "circle the correct word": the picture, beside it the text (optional "ask" line, "lead", and "options":[a,b] with "answer": index); tap the right word, it gets a ring.
   Options on a set: "mark":"ring" (pick: the right picture gets a ring, not a tick), "silent":true (circle: do not say the word when it is circled).
   type   = one picture + the word with a letter missing ("missing": its index), the child types it on the keyboard: "answer": "t"
   On wide screens the choices (tick/cross, letters, the keyboard button) sit right beside the picture, not at the sheet's edge.
   A right answer: stamp + celebrate (no spoken praise), then on to the next question by itself. A wrong one: a shake, try again.
   Two books: each set says "book": "book" (the student's book, default) or "workbook"; two buttons on top switch between them. */
const qz={sets:null,all:[],list:[],src:'book',i:0,run:0,busy:false,file:null,show:0};
const Q_SRC={book:['Book',ICON.book],workbook:['Workbook','<svg viewBox="0 0 24 24"><path d="M5 19l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L9 18z"/><path d="M14.5 6.5l3 3"/><path d="M5 19h14"/></svg>']};
const R_Q=p=>{ const f=qz.file||''; return p&&!/^(https?:|\/|data:)/.test(p)?f.slice(0,f.lastIndexOf('/')+1)+p:p; };
const qSrcOf=s=>s.book==='workbook'?'workbook':'book';
const Q_ARR='<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
const Q_KEY='<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h1M11.5 10h1M16.5 10h1M8 14h8"/></svg>';
const Q_TICK='<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 6.5"/></svg>', Q_CROSS='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

async function qLoad(){
  const m=SUBJECT&&SUBJECT.lessons.find(l=>l.id===LESSON.id); if(!m) return false;
  const file=m.file.replace(/lesson\.json$/,'questions.json');
  if(qz.file===file&&qz.sets) return true;
  const base=file.slice(0,file.lastIndexOf('/')+1), R=p=>p&&!/^(https?:|\/|data:)/.test(p)?base+p:p;
  try{ const d=await get(file); qz.sets=d.sets; qz.file=file; }catch(e){ qz.sets=null; qz.file=null; return false; }
  qz.all=[]; qz.sets.forEach((s,si)=>{ s.taskSrc=Array.isArray(s.taskAudio)?s.taskAudio.map(R):R(s.taskAudio);   // taskAudio: one file, or a list played in order (prompt + letter name)
   
    if(s.type==='link') s.items.forEach(it=>{ it.answer=true; });
    if(s.type==='match'||s.type==='circle'||s.type==='tick'||s.type==='link'){ s.centerSrc=R(s.centerAudio); s.items.forEach(it=>{ it.src=R(it.audio); it.picSrc=R(it.pic); });
      if(s.type==='circle'&&s.shuffle&&!s._sh){ s._sh=1; const ps=s.items.map(it=>it.pos); for(let t=0;t<20;t++){ ps.sort(()=>Math.random()-.5); if(ps.some((p,k)=>p!==s.items[k].pos)) break; } s.items.forEach((it,k)=>it.pos=ps[k]); }   // "shuffle": the options swap their places (the book order is not kept)
      if(s.type==='circle') s.items.forEach((it,k)=>{ if(!it.pos){ const n=s.items.length, cols=3, rows=Math.ceil(n/cols), r=Math.floor(k/cols), c=k%cols, inRow=Math.min(cols,n-r*cols);
        it.pos=[(c+.5+(cols-inRow)/2)*100/cols,(r+.5)*100/rows]; } });   // no "pos": spread them in rows of 3
      s.items.filter(it=>s.type==='tick'||it.answer).forEach((it,k)=>qz.all.push({set:s,si,k,word:s.center||''})); return; }
    s.items.forEach((it,k)=>{
    const q={...it,set:s,si,k,audio:R(it.audio)}; if(it.pics) q.pics=it.pics.map(R); if(it.pic) q.pic=R(it.pic); qz.all.push(q); }); });
  preloadImgs(qz.sets.flatMap(s=>[s.centerPic&&R(s.centerPic),...(s.items||[]).flatMap(it=>[...(it.pics||[]).map(R),it.pic&&R(it.pic)])]));
  qPick(qz.src); return true;
}
async function showQuiz(start){
  stage.innerHTML=''; setRail([]); $('#lesson').classList.add('qtab');
  const me=++qz.show; busy(true); const ok=await qLoad(); busy(false);
  if(tab!=='quiz'||me!==qz.show) return;   // another tab, or a newer call (e.g. a book page jump) took over
  stage.innerHTML='';
  if(!ok||!qz.all.length){ $('#lesson').classList.remove('qtab'); showGarage(); return; }
  if(!qz.list.length) qPick('book');
  const wrap=el('div','quiz');
  wrap.innerHTML=`<div class="qsrc"><button class="qarr prev" aria-label="Previous question">${Q_ARR}</button>${Object.entries(Q_SRC).filter(([k])=>!isAr()||qz.all.some(q=>qSrcOf(q.set)===k)).map(([k,[l,ic]])=>`<button class="qsb" data-src="${k}">${ic}<span>${tr(l)}</span>${qz.all.some(q=>qSrcOf(q.set)===k)?'':`<i class="qlock">${LOCK}</i>`}</button>`).join('')}<button class="qarr next" aria-label="Next question">${Q_ARR}</button></div>
    <div class="qhead"><span class="qex"></span><span class="qtask"></span><button class="qsay qtsay" aria-label="Hear the question">${typeof SAY_LN==="string"?SAY_LN:ICON.sound}</button><span class="qpage"></span></div>
    <div class="qdots"></div>
    <div class="qword" dir="ltr"><b></b><button class="qsay" aria-label="Listen again">${typeof SAY_LN==="string"?SAY_LN:ICON.sound}</button></div>
    <div class="qplay"></div><div class="qans"></div>`;
  stage.append(wrap);
  $$('.qsb',wrap).forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.src; if(k===qz.src) return; hideHint();
    if(!qz.all.some(q=>qSrcOf(q.set)===k)) return message('Soon!',`${Q_SRC[k][0]} questions are coming soon!`,`<span class="car">${CAR('sad')}</span>`);
    blip(600); qPick(k); qStart(0); }));
  $$('.qarr',wrap).forEach(b=>b.addEventListener('click',()=>qSet(b.classList.contains('next')?1:-1)));
  $('.qword .qsay',wrap).addEventListener('click',()=>qSay());
  $('.qtsay',wrap).addEventListener('click',()=>qTask());
  $('.qword',wrap).addEventListener('click',e=>{ if(wrap.dataset.type==='type'&&!e.target.closest('.qsay')) qFocus(); });
  qStart(start!=null?start:0);
}
// the questions of one book (Book or Workbook)
function qPick(src){ qz.src=src; qz.list=qz.all.filter(q=>qSrcOf(q.set)===src); }
function qStart(i){ const w=$('.quiz'); if(!w) return;
  $$('.qsb',w).forEach(b=>b.classList.toggle('on',b.dataset.src===qz.src));
  $('.qdots',w).innerHTML=qz.list.map((q,k)=>`<i data-i="${k}">${STAR(false)}</i>`).join('');
  qLayout(); qGo(Math.min(i,qz.list.length-1)); }
// the arrows: to the start of the next / previous exercise of this book (not the items inside one)
const qGrp=s=>s.ex!=null?s.page+'|'+s.ex:s;   // sets with the same book exercise (e.g. one circle set per colour) are ONE exercise for the arrows
function qSetStart(d){ const s=qz.list[qz.i]&&qz.list[qz.i].set; if(!s) return -1; const g=qGrp(s); let i=qz.i;
  if(d>0){ while(i<qz.list.length&&qGrp(qz.list[i].set)===g) i++; return i<qz.list.length?i:-1; }
  while(i>0&&qGrp(qz.list[i-1].set)===g) i--; if(i===0) return -1; const p=qGrp(qz.list[i-1].set); i--; while(i>0&&qGrp(qz.list[i-1].set)===p) i--; return i; }
function qSet(d){ const i=qSetStart(d); if(i<0) return; hideHint(); blip(600); qGo(i); }
// which question a book page starts at (used by the page jump); picks Book or Workbook from the page
function qFirstOnPage(p,src){ const f=qz.all.find(q=>q.set.page===p&&(!src||qSrcOf(q.set)===src)); qPick(f?qSrcOf(f.set):src||'book');
  const i=qz.list.findIndex(q=>q.set.page===p); return i<0?0:i; }
function qGo(i){
  vStop(); hideHint(); const run=++qz.run; qz.i=i; qz.busy=false;
  const q=qz.list[i], s=q.set, w=$('.quiz'); if(!w) return;
  w.dataset.type=s.type;
  $('.qex',w).textContent=s.ex!=null?num(s.ex):''; $('.qex',w).hidden=!s.ex; $('.qtask',w).textContent=s.task;
  $('.qpage',w).innerHTML=s.page?`${ICON.book}<span>${isAr()?'ص ':'p. '}${num(s.page)}</span>`:'';
  $$('.qdots i',w).forEach((d,k)=>{ d.classList.toggle('cur',k===i); });
  $('.qarr.prev',w).disabled=qSetStart(-1)<0; $('.qarr.next',w).disabled=qSetStart(1)<0;
  const a0=$('.qans',w); if(a0.parentElement!==w) w.append(a0);   // back in its own place before the pictures are cleared (qLayout moves it beside the picture)
  const qi=$('#qin'); if(qi&&s.type!=='type'){ qi.blur(); qi.remove(); }
  const qxi=$('#qxin'); if(qxi&&s.type!=='write'){ qxi.blur(); qxi.remove(); }
  if(s.type==='match'||s.type==='circle'||s.type==='tick'||s.type==='link') return qBoard(w,q,i,run);
  w._board=null;
  if(typeof QX!=='undefined'&&QX[s.type]) return qxGo(w,q,i,run);
  // letter: the word with its first letter left out, filled in when the child finds it
  // type: the same, with any letter ("missing") left out; the child types it
  const mi=q.missing||0;
  $('.qword b',w).innerHTML=s.type==='letter'||s.type==='type'?`${q.word.slice(0,mi)}<span class="qgap">_</span>${q.word.slice(mi+1)}`:q.word;
  const play=$('.qplay',w), ans=$('.qans',w); play.innerHTML=''; ans.innerHTML='';
  if(s.type==='pick'){
    // shuffle where the right picture sits, so it is not always the same side
    const order=q.pics.map((p,k)=>k); if(Math.random()<.5) order.reverse();
    order.forEach(k=>{ const b=el('button','qpic',`<img src="${q.pics[k]}" alt=""><span class="qmark"></span>`); b.setAttribute('aria-label','Picture '+(k+1));
      b.addEventListener('click',()=>qAnswer(b,k===q.answer)); play.append(b); });
  } else if(s.type==='letter'){
    play.append(el('div','qpic one',`<img src="${q.pic}" alt="${q.word}"><span class="qmark"></span>`));
    const order=q.letters.map((x,k)=>k); if(Math.random()<.5) order.reverse();
    order.forEach(k=>{ const b=el('button','rb qbtn qlet'+(q.letters[k].length>1?' two':''),`<span>${q.letters[k]}</span>`); b.setAttribute('aria-label','Letter '+q.letters[k]);
      b.addEventListener('click',()=>qAnswer(b,k===q.answer)); ans.append(b); });
  } else if(s.type==='choice'){
    play.append(el('div','qpic one',`<img src="${q.pic}" alt="">`));
    const t=el('div','qtxt',`${q.ask?`<div class="qask">${q.ask}</div>`:''}<div class="qsen">${q.lead?`<span>${q.lead}</span> `:''}<span class="qopts">(<button class="qopt">${q.options[0]}</button> - <button class="qopt">${q.options[1]}</button>)</span><button class="qsay" aria-label="Listen again">${typeof SAY_LN==="string"?SAY_LN:ICON.sound}</button></div>`);
    $$('.qopt',t).forEach((b,k)=>b.addEventListener('click',()=>qChoose(b,k,q))); $('.qsay',t).addEventListener('click',()=>qSay());
    play.append(t);
  } else if(s.type==='type'){
    play.append(el('div','qpic one',`<img src="${q.pic}" alt="${q.word}"><span class="qmark"></span>`));
    qFocus();   // the keyboard stays open from one word to the next; it first opens when the instruction has been read (or when the child taps the letter)
  } else {
    play.append(el('div','qpic one',`<img src="${q.pic}" alt="${q.word}"><span class="qmark"></span>`));
    [[true,'yes',Q_TICK,'It matches'],[false,'no',Q_CROSS,'It does not match']].forEach(([v,c,ic,l])=>{
      const b=el('button','rb qbtn '+c,ic); b.setAttribute('aria-label',l); b.addEventListener('click',()=>qAnswer(b,v===q.answer,v)); ans.append(b); });
  }
  qLayout(); carFrac(i/qz.list.length);
  // the first question of each exercise: the instruction is read first, then the word
  setTimeout(async()=>{ if(run!==qz.run||tab!=='quiz') return; if(q.k===0&&(i===0||qGrp(qz.list[i-1].set)!==qGrp(s))) await qTask(); if(run===qz.run&&tab==='quiz'){ if(s.type==='type') qFocus(); qSay(); } },350);
}
// the match board: built once per set; each right picture joined moves on to the next star without rebuilding it
function qBoard(w,q,i,run){
  const s=q.set; carFrac(i/qz.list.length); qLayout();
  if(w._board===s) return;
  w._board=s; const play=$('.qplay',w); play.innerHTML=''; $('.qans',w).innerHTML='';
  if(s.type==='tick') return qSheet(w,s,play,run);
  if(s.type==='link') return qLinkBoard(w,s,play,run);
  const b=el('div','qboard'); if(s.bigP) b.classList.add('bigP');   // "bigP": bigger pictures on tall screens (with "posP" per item)
  if(s.centerPic){ const c=el('div','qcenter pic',`<img src="${R_Q(s.centerPic)}" alt="">`); if(s.centerAt){ c.style.setProperty('--cx',s.centerAt[0]); c.style.setProperty('--cy',s.centerAt[1]); } b.append(c); }   // "centerPic": a picture to match (book: circle the SIMILAR picture)
  if(s.center){ const c=el('button','qcenter',`<span>${s.center}</span>`); c.setAttribute('aria-label','Letter '+s.center); c.addEventListener('click',()=>qSound(s.centerSrc,s.center[0]));
    b.append(c); }
  s.items.forEach(it=>{ const p=el('button','qmp'+(it.picSrc?'':' tx'),(it.picSrc?`<img src="${it.picSrc}" alt="">`:`<b>${it.word}</b>`)+`<span class="qmark"></span>`); p.setAttribute('aria-label',it.word);   // a word-only option (book: circle the different WORD)
    const ps=it.posP&&!$('#lesson').classList.contains('q-land')?it.posP:it.pos; p.style.left=`clamp(calc(var(--w) / 2), ${ps[0]}%, calc(100% - var(--w) / 2))`; p.style.top=`clamp(calc(var(--w) / 2), ${ps[1]}%, calc(100% - var(--w) / 2))`; p.addEventListener('click',()=>qMatch(p,it,s)); b.append(p); });
  play.append(b);
  // the first time: read the instruction, then the letter's sound
  const first=qNewEx(); setTimeout(async()=>{ if(run!==qz.run||tab!=='quiz') return; if(first) await qTask(); if(s.center&&qz.list[qz.i]&&qz.list[qz.i].set===s&&tab==='quiz') qSound(s.centerSrc,s.center[0]); },350);
}
// tick: every picture of the exercise on one sheet, each with its word and a tick and a cross; the right one lights up when tapped
function qSheet(w,s,play,run){
  const sh=el('div','qsheet'); s.left=s.items.length;
  s.items.forEach(it=>{ const c=el('div','qcell');
    c.innerHTML=`<button class="qcw" aria-label="${it.word}"><b>${it.word}</b></button><button class="qcp"><img src="${it.picSrc}" alt=""></button><div class="qcb"></div>`;
    [[true,'yes',Q_TICK,'It matches'],[false,'no',Q_CROSS,'It does not match']].forEach(([v,cl,ic,l])=>{
      const b=el('button','qbtn qt '+cl,ic); b.setAttribute('aria-label',l); b.addEventListener('click',()=>qTick(c,it,s,v,b)); $('.qcb',c).append(b); });
    [$('.qcw',c),$('.qcp',c)].forEach(x=>x.addEventListener('click',()=>qSound(it.src,it.word)));
    sh.append(c); });
  play.append(sh);
  if(qNewEx()) setTimeout(async()=>{ if(run!==qz.run||tab!=='quiz') return; await qTask(); },350);
}
async function qTick(cell,it,s,val,btn){
  if(qz.busy||cell.classList.contains('done')) return; hideHint();
  if(val!==it.answer){ tone(170,'square',.06,.18); if(anim) G.fromTo(btn,{x:-9},{x:0,duration:.5,ease:'elastic.out(1.5,.25)'}); return; }
  const run=qz.run; cell.classList.add('done'); btn.classList.add('on'); celebrate(btn); qSound(it.src,it.word);
  const d=$(`.qdots i[data-i="${qz.i}"]`); if(d){ d.innerHTML=STAR(true); d.classList.add('got'); if(anim) G.fromTo(d,{scale:1.8},{scale:1,duration:.6,ease:'elastic.out(1.2,.4)'}); }
  carFrac((qz.i+1)/qz.list.length);
  const next=qz.i+1;
  if(next>=qz.list.length||qz.list[next].set!==s){ qz.busy=true; await new Promise(r=>setTimeout(r,1400)); if(run!==qz.run||tab!=='quiz') return; qz.busy=false;
    if(next>=qz.list.length) award(LESSON.id,'quiz'); else qGo(next); return; }
  qz.i=next; $$('.qdots i').forEach((x,k)=>x.classList.toggle('cur',k===next));   // same sheet: just move the star on
}
// the lines of the joined pictures, worked out again when the screen changes size
function qLines(fresh){ const bd=$('.qboard'); if(!bd||$('.quiz').dataset.type!=='match') return; const c=$('.qcenter span',bd); if(!c) return; const B=bd.getBoundingClientRect();
  const mid=e=>{ const r=e.getBoundingClientRect(); return [r.left+r.width/2-B.left,r.top+r.height/2-B.top]; }, [x2,y2]=mid(c);
  $$('.qmp.done',bd).forEach(p=>{ let ln=p._line; if(!ln){ ln=p._line=el('i','qline'); bd.prepend(ln); }
    const [x1,y1]=mid(p), len=Math.hypot(x2-x1,y2-y1);
    ln.style.cssText=`left:${x1}px;top:${y1}px;width:${len}px;transform:rotate(${Math.atan2(y2-y1,x2-x1)}rad)`+(p===fresh?' scaleX(0)':'');
    if(p===fresh) requestAnimationFrame(()=>requestAnimationFrame(()=>{ ln.style.transform=`rotate(${Math.atan2(y2-y1,x2-x1)}rad) scaleX(1)`; })); });
}
function qSound(src,text){ vStop(); return (src?playFile(src).catch(()=>tts(text,isAr()?'ar':'en',.75)):tts(text,isAr()?'ar':'en',.75)).catch(()=>{}); }
async function qMatch(btn,it,s){
  if(qz.busy) return; hideHint();
  if(btn.classList.contains('done')) return s.silent?null:qSound(it.src,it.word);
  if(!it.answer){
    tone(170,'square',.06,.18); const m=$('.qmark',btn); m.className='qmark bad'; m.innerHTML=Q_CROSS; setTimeout(()=>{ m.className='qmark'; m.innerHTML=''; },700);
    if(anim) G.fromTo(btn,{x:-9},{x:0,duration:.5,ease:'elastic.out(1.5,.25)'});
    return;
  }
  const run=qz.run, more=qSetMoreAfter(s); btn.classList.add('done'); if(!more) qz.busy=true;
  // a line from the picture to the letter in the middle, drawn out like a pencil line
  if(s.type==='match') qLines(btn);
  if(s.type==='circle'&&anim) G.fromTo(btn,{'--ring':1.5},{'--ring':1,duration:.4,ease:'back.out(2)'});
  celebrate(btn); if(!s.silent) qSound(it.src,it.word);
  if(qMore(s)) return; return qDone(s,run,1100);
}
// a right answer of a board that has more answers still to find: its star, and on to the next one at once (nothing waits, so the child can tap the next right picture straight away)
const qSetMoreAfter=s=>qz.i+1<qz.list.length&&qz.list[qz.i+1].set===s;
function qMore(s){ const next=qz.i+1; if(next>=qz.list.length||qz.list[next].set!==s) return false;
  const d=$(`.qdots i[data-i="${qz.i}"]`); if(d){ d.innerHTML=STAR(true); d.classList.add('got'); if(anim) G.fromTo(d,{scale:1.8},{scale:1,duration:.6,ease:'elastic.out(1.2,.4)'}); }
  carFrac((qz.i+1)/qz.list.length); qz.i=next; $$('.qdots i').forEach((x,k)=>x.classList.toggle('cur',k===next));
  $('.qarr.prev').disabled=qSetStart(-1)<0; $('.qarr.next').disabled=qSetStart(1)<0; return true; }
// one more right answer of a board: its star, then on to the next one (the same board stays when the exercise has more)
async function qDone(s,run,ms){
  const d=$(`.qdots i[data-i="${qz.i}"]`); if(d){ d.innerHTML=STAR(true); d.classList.add('got'); if(anim) G.fromTo(d,{scale:1.8},{scale:1,duration:.6,ease:'elastic.out(1.2,.4)'}); }
  carFrac((qz.i+1)/qz.list.length);
  await new Promise(r=>setTimeout(r,ms)); if(run!==qz.run||tab!=='quiz') return;
  const next=qz.i+1;
  if(next>=qz.list.length){ qz.busy=false; award(LESSON.id,'quiz'); return; }
  if(qz.list[next].set!==s) await new Promise(r=>setTimeout(r,500)); if(run!==qz.run||tab!=='quiz') return;
  qGo(next);
}
// the hidden text box for "type" questions: one box kept while the questions change, so the keyboard does not close between words
function qFocus(){ const wd=$('.qword'); if(!wd) return; let inp=$('#qin');
  if(!inp){ inp=el('input','qin'); Object.assign(inp,{type:'text',id:'qin',autocomplete:'off',spellcheck:false});
    ['autocorrect','autocapitalize'].forEach(a=>inp.setAttribute(a,'off')); inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Type the missing letter');
    inp.addEventListener('input',()=>{ const ch=inp.value.replace(/\s/g,'').slice(-1); inp.value=''; qTyped(ch); });
    inp.addEventListener('focus',()=>wd.classList.add('focus')); inp.addEventListener('blur',()=>wd.classList.remove('focus'));
    wd.append(inp); }
  inp.focus({preventScroll:true}); }
function qTyped(ch){ const q=qz.list[qz.i]; if(!ch||qz.busy||!q||q.set.type!=='type') return;
  const gap=$('.qword .qgap'), right=ch.toLowerCase()===String(q.answer).toLowerCase();
  if(!right&&gap){ gap.textContent=ch; gap.classList.add('bad'); clearTimeout(gap._t); gap._t=setTimeout(()=>{ if(!gap.classList.contains('got')){ gap.textContent='_'; gap.classList.remove('bad'); } },650); }
  qAnswer(gap||$('.qword'),right); }
// a computer keyboard works even when the text box lost focus (e.g. after tapping the speaker)
addEventListener('keydown',e=>{ if(tab!=='quiz'||e.ctrlKey||e.metaKey||e.altKey||e.key.length!==1) return; const q=qz.list[qz.i];
  if(!q||q.set.type!=='type'||document.activeElement&&document.activeElement.id==='qin') return; e.preventDefault(); qTyped(e.key); });
function qSay(){ const q=qz.list[qz.i]; if(!q) return; vStop(); const w=$('.qword'); w.classList.add('lit');
  const done=()=>{ const x=$('.qword'); if(x) x.classList.remove('lit'); };
  (q.audio?playFile(q.audio).catch(()=>tts(q.word,isAr()?'ar':'en',.75)):tts(q.word,isAr()?'ar':'en',.75)).then(done,done); }
// read the exercise instruction aloud (its line lights up while it plays)
function qTask(){ const q=qz.list[qz.i]; if(!q) return Promise.resolve(); vStop(); const t=$('.qtask'); if(t) t.classList.add('lit');
  const done=()=>{ const x=$('.qtask'); if(x) x.classList.remove('lit'); };
  const ts=q.set.taskSrc, fb=()=>tts(q.set.task,isAr()?'ar':'en',.85);
  const play=Array.isArray(ts)?ts.reduce((p,u,k)=>p.then(()=>{ if(qz.list[qz.i]!==q) return; return (k?new Promise(r=>setTimeout(r,120)):Promise.resolve()).then(()=>playFile(u)); }),Promise.resolve()):playFile(ts);
  return (ts?play.catch(fb):fb()).then(done,done); }
function qStamp(pic,cross){
  const m=$('.qmark',pic); m.className='qmark good'; m.innerHTML=cross?Q_CROSS:Q_TICK;
  if(anim){ const p=$('path',m), len=p.getTotalLength(); G.fromTo(m,{scale:1.6},{scale:1,duration:.35,ease:'back.out(3)'}); G.fromTo(p,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.35,ease:'power2.out'}); }
}
async function qAnswer(btn,right,said){
  if(qz.busy) return; hideHint(); const run=qz.run, q=qz.list[qz.i];
  if(!right){
    tone(170,'square',.06,.18);
    if(q.set.type==='pick'){ const m=$('.qmark',btn); m.className='qmark bad'; m.innerHTML=Q_CROSS; setTimeout(()=>{ m.className='qmark'; m.innerHTML=''; },700); }
    if(anim) G.fromTo(btn,{x:-9},{x:0,duration:.5,ease:'elastic.out(1.5,.25)'});
    return;
  }
  qz.busy=true; vStop();
  if(q.set.type==='pick'){ if(q.set.mark==='ring') qRing(btn); else qStamp(btn,false); } else { btn.classList.add('on'); qStamp($('.qpic.one'),said===false); }
  const gap=$('.qword .qgap'); if(gap){ gap.classList.remove('bad'); gap.textContent=q.word[q.missing||0]; gap.classList.add('got'); if(anim) G.fromTo(gap,{scale:1.8},{scale:1,duration:.5,ease:'back.out(3)'}); }
  $$('.qpic').forEach(p=>p!==btn&&q.set.type==='pick'&&p.classList.add('dim'));
  celebrate(q.set.type==='pick'?btn:$('.qpic.one'));
  const d=$(`.qdots i[data-i="${qz.i}"]`); if(d){ d.innerHTML=STAR(true); d.classList.add('got'); if(anim) G.fromTo(d,{scale:1.8},{scale:1,duration:.6,ease:'elastic.out(1.2,.4)'}); }
  carFrac((qz.i+1)/qz.list.length);
  await new Promise(r=>setTimeout(r,500)); if(run!==qz.run) return;
  await new Promise(r=>setTimeout(r,900)); if(run!==qz.run||tab!=='quiz') return;
  if(qz.i+1<qz.list.length) qGo(qz.i+1); else { qz.busy=false; award(LESSON.id,'quiz'); }
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
  if(wr&&ans&&pla){ const side=land&&['yesno','letter','type'].includes(wr.dataset.type); if(side&&ans.parentElement!==pla) pla.append(ans); else if(!side&&ans.parentElement===pla) wr.append(ans); }
  qLinkRefresh(land);
  // two pictures: side by side, or one above the other when that makes them bigger (tall phones)
  const pl=$('.qplay'); if(!pl) return; pl.classList.remove('stack'); if(wr&&(wr.dataset.type==='choice'||wr.dataset.type==='link')) return; const w=pl.clientWidth, h=pl.clientHeight, a=.8;
  pl.classList.toggle('stack', Math.min(w,h/2*a) > Math.min(w/2,h*a)*1.15); }
addEventListener('resize',()=>{ if(tab==='quiz'){ qLayout(); qLines(); } });

/* link: words in one row, pictures in the other (or two columns); a line joins a word to its picture */
function qLinkBoard(w,s,play,run){
  const n=s.items.length, bd=el('div','qlink'); bd.dataset.n=n; bd.style.setProperty('--n',n); bd._set=s; bd._pairs=[];
  const wd=el('div','qlw'), pc=el('div','qlp');
  let ord=s.items.map((_,k)=>k); for(let t=0;t<30;t++){ ord.sort(()=>Math.random()-.5); if(n<2||ord.every((v,k)=>v!==k)) break; }   // the pictures are not under their own words
  s.items.forEach((it,k)=>{ const b=el('button','qlk qlkw',`<b>${it.word}</b>`); b.dataset.k=k; b.setAttribute('aria-label',it.word); wd.append(b); });
  ord.forEach(k=>{ const it=s.items[k], b=el('button','qlk qlkp'+(it.picSrc?'':' tx'),it.picSrc?`<img src="${it.picSrc}" alt="" draggable="false">`:`<b>${it.text2}</b>`); b.dataset.k=k; b.setAttribute('aria-label',it.picSrc?'Picture':it.text2); pc.append(b); });   // "text2": a word to join instead of a picture
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','qlsvg');
  bd.append(wd,pc,svg); play.append(bd);
  let drag=null, sel=null; const rel=(x,y)=>{ const B=bd.getBoundingClientRect(); return [x-B.left,y-B.top]; };
  const kind=b=>b.classList.contains('qlkw')?'w':'p';
  const tmp=()=>{ let l=$('.qtmp',svg); if(!l){ l=document.createElementNS('http://www.w3.org/2000/svg','line'); l.setAttribute('class','qtmp'); svg.append(l); } return l; };
  const clearSel=()=>{ if(sel){ sel.classList.remove('sel'); sel=null; } };
  bd.addEventListener('pointerdown',e=>{ const b=e.target.closest('.qlk'); if(!b||qz.busy) return; e.preventDefault(); hideHint();
    const it=s.items[+b.dataset.k];
    if(b.classList.contains('done')){ if(kind(b)==='w') qSound(it.src,it.word); return; }
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
    if(kind(d.b)==='w'){ const it=s.items[+d.b.dataset.k]; qSound(it.src,it.word); }
    if(sel&&sel!==d.b&&kind(sel)!==kind(d.b)){ const a=sel; clearSel(); qLinkTry(bd,s,a,d.b,run); return; }
    if(sel===d.b){ clearSel(); return; }
    clearSel(); sel=d.b; d.b.classList.add('sel'); };
  bd.addEventListener('pointerup',end); bd.addEventListener('pointercancel',end);
  qLinkRefresh(L$().classList.contains('q-land'));
  if(qNewEx()) setTimeout(async()=>{ if(run!==qz.run||tab!=='quiz') return; await qTask(); },350);
}
const L$=()=>$('#lesson');
const qNewEx=()=>{ const i=qz.i; return i<=0||qGrp(qz.list[i-1].set)!==qGrp(qz.list[i].set); };   // the instruction is read only when a new exercise starts, not for each part of it
// where a line leaves a word / arrives at a picture (bottom / top in rows, right / left in columns), in the board's own pixels
function qAnchor(bd,b,isWord){ const B=bd.getBoundingClientRect(), r=b.getBoundingClientRect(), cols=bd.classList.contains('cols');
  return cols?[(isWord?r.right:r.left)-B.left, r.top+r.height/2-B.top]:[r.left+r.width/2-B.left,(isWord?r.bottom:r.top)-B.top]; }
function qLinkLine(bd,wb,pb,cls){ const svg=$('.qlsvg',bd), l=document.createElementNS('http://www.w3.org/2000/svg','line'); l.setAttribute('class',cls||'qlj');
  const [x1,y1]=qAnchor(bd,wb,true), [x2,y2]=qAnchor(bd,pb,false); [['x1',x1],['y1',y1],['x2',x2],['y2',y2]].forEach(([k,v])=>l.setAttribute(k,v)); svg.append(l); return l; }
function qLinkLines(){ const bd=$('.qlink'); if(!bd) return; $$('.qlj',bd).forEach(l=>l.remove()); bd._pairs.forEach(([wb,pb])=>qLinkLine(bd,wb,pb)); }
// words and pictures as big as the board allows; rows or columns follow the screen
function qLinkRefresh(land){ const bd=$('.qlink'); if(!bd) return; const s=bd._set, n=s.items.length;
  bd.classList.toggle('cols',s.layout==='cols'||(!land&&n>4));
  const B=bd.getBoundingClientRect(), cols=bd.classList.contains('cols'), mx=Math.max(...s.items.map(it=>Math.max(it.word.length,(it.text2||'').length)));
  const cw=cols?B.width*.4:(B.width-(n-1)*8)/n-14, rh=cols?B.height/n*.5:40;
  bd.style.setProperty('--fs',Math.max(12,Math.min(isAr()?48:32,cw/(.6*mx),rh*1.1))+'px'); qLinkLines(); }
async function qLinkTry(bd,s,a,b){
  const run=qz.run;   // the board is kept from pair to pair, so it must use the question running NOW, not the one it was built in
  const wb=a.classList.contains('qlkw')?a:b, pb=wb===a?b:a, it=s.items[+wb.dataset.k];
  if(wb.dataset.k!==pb.dataset.k){ tone(170,'square',.06,.18); const l=qLinkLine(bd,wb,pb,'qlj bad'); setTimeout(()=>l.remove(),500);
    if(anim) G.fromTo([wb,pb],{x:-8},{x:0,duration:.5,ease:'elastic.out(1.5,.25)'}); return; }
  if(!qSetMoreAfter(s)) qz.busy=true; wb.classList.add('done'); pb.classList.add('done'); bd._pairs.push([wb,pb]);
  const l=qLinkLine(bd,wb,pb); if(anim){ const len=l.getTotalLength?l.getTotalLength():300; G.fromTo(l,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.35,ease:'power2.out'}); }
  celebrate(pb); qSound(it.src,it.word);
  if(qMore(s)) return; return qDone(s,run,900);
}
/* choice: tap the right word of the two; it gets a hand-drawn ring */
async function qChoose(btn,k,q){
  if(qz.busy) return; hideHint();
  if(k!==q.answer){ tone(170,'square',.06,.18); if(anim) G.fromTo(btn,{x:-9},{x:0,duration:.5,ease:'elastic.out(1.5,.25)'}); return; }
  qz.busy=true; const run=qz.run; qRing(btn); $$('.qopt').forEach(o=>o!==btn&&o.classList.add('dim')); celebrate(btn); qSay();
  return qAdvance(run,1900);
}
async function qAdvance(run,ms){
  const d=$(`.qdots i[data-i="${qz.i}"]`); if(d){ d.innerHTML=STAR(true); d.classList.add('got'); if(anim) G.fromTo(d,{scale:1.8},{scale:1,duration:.6,ease:'elastic.out(1.2,.4)'}); }
  carFrac((qz.i+1)/qz.list.length);
  await new Promise(r=>setTimeout(r,ms)); if(run!==qz.run||tab!=='quiz') return;
  if(qz.i+1<qz.list.length) qGo(qz.i+1); else { qz.busy=false; award(LESSON.id,'quiz'); }
}
// the child "circles" it: a pink oval drawn round the picture or word
function qRing(el0){ const im=el0.classList.contains('qpic')&&$('img',el0);   // a picture button can be taller than its picture: ring the picture itself
  if(im){ const b=el0.getBoundingClientRect(), r=im.getBoundingClientRect(); el0.style.setProperty('--rt',(r.top-b.top)+'px'); el0.style.setProperty('--rb',(b.bottom-r.bottom)+'px'); el0.style.setProperty('--rl',(r.left-b.left)+'px'); el0.style.setProperty('--rr',(b.right-r.right)+'px'); }
  el0.classList.add('ringed'); if(anim) G.fromTo(el0,{'--ring':1.6},{'--ring':1,duration:.4,ease:'back.out(2)'}); }
