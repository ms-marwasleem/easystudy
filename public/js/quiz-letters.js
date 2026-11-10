/* QUESTIONS tab — the "box" models (QM[type].sheet='box', drawn by qxGo below inside the sheet of quiz.js: task line, stars, speaker) and the letter models.
   position = a picture and one empty circle per letter of its word (right to left): tap the circle where the letter is. item: {word, pic, audio, at: index of the letter}
   vowel    = a picture, its word with the letter missing, and the letter with each haraka: tap the right one. set: "choices":["أَ","أُ","إِ","أْ"]; item: {word, pic, audio, answer: the letter with its haraka, at?: the letter's place (default 0 = the first)}
   write    = the child types a word on the keyboard, each right letter fills in its place with its marks (the speaker says it, the bulb shows the next letter).
              item: {word, audio, pic?, chips?: syllables shown above (book: merge the syllables)}; set "sentence": true for a sentence
   mad      = a picture, the word big as letter tiles, two places (set "labels": [mad letter, elongated letter]): drag (or tap) the mad letter into the first place, the letter that is elongated into the second. item: {word, pic, audio, mad: index of the mad letter, mm: index of the elongated letter}
   arrange  = the letters of the word (with their marks) scrambled as tiles; drag them (or tap) in the right order to the word's blanks; the word is written joined as it fills. item: {word, pic, audio} */
// write: set "faint":true = the book's "write like the example": the text to copy shows faintly and the child types it over it
// every box model: QM[type].draw(box,q,s,run) builds its part; the sheet adds the listen icon beside the thing that is read and reads it, unless the model reads itself (own) or the question is quiet (q.hush)
// a box with more than its room holds (a tall picture + the writing places + the bulb on a phone): the space between its parts gets smaller first, so nothing is cut at the bottom
function qxFit(box){ if(!box.isConnected) return; box.style.gap=''; const cs=getComputedStyle(box); if(cs.flexDirection!=='column') return;
  const kids=[...box.children].filter(e=>e.offsetParent!==null&&getComputedStyle(e).position!=='absolute'); if(kids.length<2) return;
  const used=kids.reduce((a,e)=>{ const st=getComputedStyle(e); return a+e.getBoundingClientRect().height+parseFloat(st.marginTop)+parseFloat(st.marginBottom); },0), g=parseFloat(cs.rowGap)||0, free=box.clientHeight-used;
  if(free<g*(kids.length-1)) box.style.gap=Math.max(4,Math.floor(free/(kids.length-1)))+'px'; }
function qxGo(w,q,i,run){
  const s=q.set, play=$('.qplay',w), ans=$('.qans',w); play.innerHTML=''; ans.innerHTML=''; $('.qword b',w).innerHTML='';
  const box=el('div','qx qx-'+s.type+(s.sentence?' sent':'')); play.append(box);
  const m=QM[s.type], quiet=()=>q.together||q.hush||m.own; { const qw=$('.qword',w); if(qw) qw.hidden=!!m.noword; const ts=$('.qtsay',w); if(ts) ts.hidden=!!m.notsay; }
  let sp=null; if(!quiet()&&(q.audio||q.word)){ sp=el('button','qsay qxsay',SAY_LN); sp.setAttribute('aria-label','Listen'); sp.onclick=()=>s.type==='qa'?qxQAPlay(q,qz.run):qSay(); }
  if(q.pic) box.append(el('div','qxpic',`<img src="${q.pic}" alt="">`));
  (q.together?qxQAAll:m.draw)(box,q,s,run);
  // the listen icon sits right beside the thing that is read (the word / sentence); with no word (circles, a picture) it sits on the picture's corner
  if(sp&&!q.hush){ const tg=$('.qxline',box)||$('.qxw',box)||$('.qxqa',box)||$('.qxcircles',box);
    if(tg){ const row=el('div','qxrow'); tg.before(row); row.append(sp,tg); } else { const pc=$('.qxpic',box); (pc||box).append(sp); sp.classList.add('onpic'); } }
  { const wi=$('#qxin'); if(wi&&s.type==='write') wi.focus({preventScroll:true}); }   // moving the line into the speaker row dropped the focus: the keyboard opens with the question
  if(!m.own){ requestAnimationFrame(()=>qxFit(box)); $$('img',box).forEach(im=>{ if(!im.complete) im.addEventListener('load',()=>qxFit(box),{once:true}); }); }
  qLayout(); carFrac(i/qz.list.length);
  setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; if(qNewEx()) await qTask(); if(run===qz.run&&inQ()&&box._after) await box._after(); if(run===qz.run&&inQ()&&!quiet()&&q.autoSay) s.type==='qa'?qxQAPlay(q,run):qSay(); },350);
}
const qxBad=b=>qBad(b);
// a right answer: celebrate, say the word, on to the next
// the answer sentence is said to its END before the next question comes (Marwa: it was cut off), then a short pause
async function qxWin(target,q,ms=1500){ if(qz.busy) return; qz.busy=true; const run=qz.run; vStop(); q.solved=true; celebrate(target);
  const t0=Date.now(); await Promise.race([Promise.resolve(qSay()).catch(()=>{}),new Promise(r=>setTimeout(r,15000))]);
  return qAdvance(run,Math.max(900,ms-(Date.now()-t0))); }
function qxLetters(word){ return glyphs(word); }

function qxPosition(box,q,s,run){
  const gs=qxLetters(q.word), row=el('div','qxcircles'); row.style.setProperty('--n',gs.length);   // the circles share the width, so a long word stays inside the screen
  gs.forEach((g,k)=>{ const b=el('button','qxc',`<span>${g}</span>`); b.setAttribute('aria-label','Letter '+(k+1)); b.addEventListener('click',()=>{ if(qz.busy) return;
    if(k!==q.at&&!(q.also||[]).includes(k)) return qxBad(b);   // "also": other places of the same letter that are right too (مُثَلَّث: the ث in the middle and at the end, Marwa 2026-11-05)
    $$('.qxc',row).forEach(x=>x.classList.add('show')); b.classList.add('right'); qxWin(b,q); }); row.append(b); });
  box.append(row);
}
function qxVowel(box,q,s,run){
  const at=q.at||0, wd=wsFill(el('b','qxw'),q.word,{hide:[at]}), gap=$('.lt.hid',wd); gap.classList.add('cur'); box.append(wd);   // THE word component (js/wordslots.js)
  const row=el('div','qxchoices');
  (q.choices||s.choices).forEach(c=>{ const b=qChBtn(c);   // THE choice button (quiz.js qChBtn)
    b.addEventListener('click',()=>{ if(qz.busy) return; if(c!==q.answer){ wsBad(gap); return qxBad(b); }
      b.classList.add('on'); gap.classList.remove('bad','hid','cur'); gap.classList.add('got'); qxWin(b,q); }); row.append(b); });
  box.append(row);
}
// the word (or sentence) as hidden letters with their places underlined; spaces are not letters
function qxWordEl(word,chips,faint,ltr,gaps){ const gs=glyphs(word);   // THE word component (js/wordslots.js); ltr: an English word inside any subject
  const cnt=(chips||[]).map(c=>glyphs(c).length), ok=cnt.length>1&&cnt.reduce((a,c)=>a+c,0)===gs.length;   // grouped per syllable when the chips match the word
  let k=0; const parts=ok?cnt.map(n=>gs.slice(k,k+=n).join('')):null;
  return wsFill(el('b','qxw'),word,{hide:gaps||true,faint,parts,ltr}); }
// Help: the next syllable (or letter) shows faintly for a moment, then is hidden again: the child writes it
function qxPeek(wd){ const n=qxNext(wd); if(!n) return; const sg=n.closest('.wsg'); wsPeek(sg?$$('.lt.hid',sg):[n]); }
function qxNext(wd){ return $('.lt.hid',wd); }
function qxReveal(wd){ const n=qxNext(wd); if(!n) return false; n.classList.remove('hid'); n.classList.add('got'); return true; }
const qxDone=wd=>!qxNext(wd);
function qxWrite(box,q,s,run,text,onDone){   // text: what to type (default the question's word); onDone: called instead of the win (math: number, then its word)
  text=text||q.word; $$('.qxhelp',box).forEach(x=>x.remove());
  if(q.chips&&text===q.word){ const c=el('div','qxchips'); c.innerHTML=q.chips.map(t=>`<i>${t}</i>`).join('<u>/</u>'); box.append(c); }
  const wd=qxWordEl(text,text===q.word?q.chips:null,s.faint,s.lang==='en'||/^[\x00-\x7f]+$/.test(text),text===q.word&&q.gaps&&q.gaps.length?q.gaps:null), help=el('button','qxhelp',ICON.hint); help.setAttribute('aria-label','Help');
  const line=el('div','qxline'); line.append(wd); const duo=$('.qxduo',box); (duo||box).append(line); qHelpHost(help);   // duo: number and its word side by side
  let inp=$('#qxin');
  if(!inp){ inp=el('input','qin'); Object.assign(inp,{type:'text',id:'qxin',autocomplete:'off',spellcheck:false,lang:s.lang||'ar'}); ['autocorrect','autocapitalize'].forEach(a=>inp.setAttribute(a,'off')); inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Type the word'); }
  line.append(inp); wsInput(inp,text,/^\d+$/.test(text)?'en':(s.lang||null));   // keyboard language from the word (js/wordslots.js)
  const cur=()=>{ $$('.lt',wd).forEach(x=>x.classList.remove('cur')); const n=qxNext(wd); if(n) n.classList.add('cur'); }; cur();
  const type=ch=>{ if(qz.busy||qz.list[qz.i]!==q||!ch||/\s/.test(ch)) return; const n=qxNext(wd); if(!n) return;
    if(sameLetter(ch,n.textContent)){ qxReveal(wd); blip(560+$$('.lt.got',wd).length*40,.05); cur(); if(qxDone(wd)){ if(onDone) onDone(wd); else qxWin(wd,q,1700); } }
    else { wsBad(n); qxBad(line); } };
  qxWrite.type=type;   // a key pressed anywhere on the page types too (no click into the box first)
  inp.oninput=()=>{ const ch=inp.value.replace(/\s/g,'').slice(-1); inp.value=''; type(ch); };
  inp.onfocus=()=>line.classList.add('focus'); inp.onblur=()=>line.classList.remove('focus');
  line.onclick=()=>inp.focus({preventScroll:true});
  help.onpointerdown=e=>{ if(document.activeElement===inp) e.preventDefault(); };
  help.onclick=()=>{ if(qz.busy) return; qxPeek(wd); inp.focus({preventScroll:true}); };
  inp.focus({preventScroll:true}); showHint(line,s.lang==='en'||/^[\x00-\x7f]+$/.test(text)?'Type here':'اكتب هنا',500,'qxwrite');
}
document.addEventListener('keydown',e=>{ const inp=$('#qxin'); if(!inp||!inQ()||document.activeElement===inp||e.ctrlKey||e.metaKey||e.altKey||e.key.length!==1||!qxWrite.type) return;
  const a=document.activeElement; if(a&&/^(INPUT|TEXTAREA)$/.test(a.tagName)) return; inp.focus({preventScroll:true}); qxWrite.type(normDigits(e.key)); e.preventDefault(); });
function qxArrange(box,q,s,run){
  const WS=!!(q.words||s.words), wd=WS?el('b','qxw qxwords'):qxWordEl(q.word,q.split), line=el('div','qxline');   // q.split = [group,...]: the whole word is shown above, the blanks are grouped with slashes (letters or syllables); the tiles are still single letters
  if(q.split&&!WS){ box.append(el('b','qxw qxshow',q.word)); wd.classList.add('qxsplit'); }   // words: the tiles are whole words of a sentence
  if(WS){ q.word.split(' ').forEach(w=>wd.append(el('span','lt hid',w))); }
  line.append(wd); box.append(line);
  const gs=WS?q.word.split(' '):qxLetters(q.word).filter(g=>g!==' '), tg=(!WS&&q.scr)?qxLetters(q.scr).filter(g=>g!==' '):gs;   // q.scr = the letters already scrambled by the book
  let ord=tg.map((g,k)=>k); if(tg===gs) for(let t=0;t<30;t++){ ord.sort(()=>Math.random()-.5); if(gs.length<2||ord.some((v,k)=>v!==k)) break; }
  const tiles=el('div','qxtiles'); box.append(tiles);
  // ORDER RULE (Marwa 2026-11-01): the tiles are put in order, first letter first. A tile only goes in when it is the letter of the NEXT empty slot (a tap or a drop anywhere on the word); any other tile is a mistake: it goes back + wrong shake.
  const fill=tile=>{ const n=qxNext(wd); if(!n||tile.classList.contains('used')||!sameLetter(tile.dataset.g,n.textContent)) return false;
    n.classList.remove('hid'); n.classList.add('got'); tile.classList.add('used'); blip(560+$$('.lt.got',wd).length*40,.05);
    if(qxDone(wd)) qxWin(wd,q,1700); return true; };
  const place=tile=>fill(tile);
  ord.forEach(k=>{ const t=el('button','qxtile'+(WS?' wide':''),`<span>${tg[k]}</span>`); t.dataset.g=tg[k]; tiles.append(t); });
  let drag=null;
  tiles.addEventListener('pointerdown',e=>{ const t=e.target.closest('.qxtile'); if(!t||qz.busy||t.classList.contains('used')) return; e.preventDefault(); hideHint();
    drag={t,x:e.clientX,y:e.clientY,moved:false,g:null}; try{ tiles.setPointerCapture(e.pointerId); }catch(_){} });
  tiles.addEventListener('pointermove',e=>{ if(!drag) return; if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10) return;
    if(!drag.moved){ drag.moved=true; const r=drag.t.getBoundingClientRect(), g=drag.t.cloneNode(true); g.classList.add('ghost'); g.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:50;pointer-events:none;margin:0`; document.body.append(g); drag.g=g; drag.t.classList.add('lift'); drag.ox=e.clientX-r.left; drag.oy=e.clientY-r.top; }
    drag.g.style.left=(e.clientX-drag.ox)+'px'; drag.g.style.top=(e.clientY-drag.oy)+'px'; });
  const end=e=>{ if(!drag) return; const d=drag; drag=null; if(d.g) d.g.remove(); d.t.classList.remove('lift'); if(e.type==='pointercancel') return;
    const L=line.getBoundingClientRect(), pad=24, over=e.clientX>L.left-pad&&e.clientX<L.right+pad&&e.clientY>L.top-pad&&e.clientY<L.bottom+pad;
    if(d.moved&&!over) return;   // dropped somewhere else: it just goes back
    if(!place(d.t)) qxBad(d.t); };
  tiles.addEventListener('pointerup',end); tiles.addEventListener('pointercancel',end);
}

function qxMad(box,q,s,run){
  const gs=qxLetters(q.word), want=[gs[q.mad],gs[q.mm]], labels=s.labels||['',''];
  const word=el('b','qxjoin'), line=el('div','qxline'); gs.forEach(g=>{ const t=el('span','qxl',g); t.dataset.g=g; word.append(t); });   // the word written joined (letters side by side keep joining); every letter can be dragged out of it
  word.style.setProperty('--n',gs.length); line.append(word); box.append(line);
  const slots=el('div','qxslots'); box.append(slots);
  const sl=want.map((g,k)=>{ const d=el('div','qxslot'); d.innerHTML=`<b class="qxsg"></b><small>${labels[k]||''}</small>`; slots.append(d); return d; });
  const nextI=()=>sl.findIndex(d=>!d.classList.contains('got'));
  const fill=(tile,k)=>{ const d=sl[k]; if(!d||d.classList.contains('got')||tile.classList.contains('used')||!sameLetter(tile.dataset.g,want[k])) return false;
    $('.qxsg',d).textContent=want[k]; d.classList.add('got'); tile.classList.add('used'); blip(560+k*80,.05);
    if(nextI()<0) qxWin(slots,q,1700); return true; };
  let drag=null;
  word.addEventListener('pointerdown',e=>{ const t=e.target.closest('.qxl'); if(!t||qz.busy||t.classList.contains('used')) return; e.preventDefault(); hideHint();
    drag={t,x:e.clientX,y:e.clientY,moved:false,g:null}; try{ word.setPointerCapture(e.pointerId); }catch(_){} });
  word.addEventListener('pointermove',e=>{ if(!drag) return; if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10) return;
    if(!drag.moved){ drag.moved=true; const g=el('div','qxtile ghost',`<span>${drag.t.dataset.g}</span>`); g.style.cssText='position:fixed;z-index:50;pointer-events:none;margin:0'; document.body.append(g); drag.g=g; drag.t.classList.add('lift'); }
    const r=drag.g.getBoundingClientRect(); drag.g.style.left=(e.clientX-r.width/2)+'px'; drag.g.style.top=(e.clientY-r.height*.8)+'px'; });
  const end=e=>{ if(!drag) return; const d=drag; drag=null; if(d.g) d.g.remove(); d.t.classList.remove('lift'); if(e.type==='pointercancel') return;
    let k=-1; if(d.moved){ const pad=18; k=sl.findIndex(x=>{ const r=x.getBoundingClientRect(); return e.clientX>r.left-pad&&e.clientX<r.right+pad&&e.clientY>r.top-pad&&e.clientY<r.bottom+pad; }); if(k<0) return; }   // dropped elsewhere: it just goes back
    else k=nextI();   // a tap goes to the first empty place
    if(!fill(d.t,k)) qxBad(d.t); };
  word.addEventListener('pointerup',end); word.addEventListener('pointercancel',end);
  showHint($$('.qxl',word)[q.mad],'اسحب الحرف',700,'qxmad');   // the usual first-time guide: a short note with an arrow
}

// qa = book "question and answer": the picture, the question (red) and its answer (blue); nothing to choose. Both are read aloud, question first, then it goes on.
// item: {ask, word: the answer sentence, audio: question sound, ansAudio: answer sound, pic}. Tap the question or the answer to hear just that one, the speaker for both.
function qxQA(box,q,s,run){
  const t=el('div','qxqa');
  const a=el('button','qxqq',q.ask), b=el('button','qxqa-a',q.word);
  a.onclick=()=>{ if(!qz.busy) qxQALine(a,q.audio,q.ask); }; b.onclick=()=>{ if(!qz.busy) qxQALine(b,R_Q(q.ansAudio),q.word); };
  t.append(a,b); box.append(t);
}
async function qxQALine(btn,src,text){ btn.classList.add('lit'); await qSound(src,text); btn.classList.remove('lit'); }
async function qxQAPlay(q,run){
  if(qz.busy) return; qz.busy=true; const [a,b]=[$('.qxqq'),$('.qxqa-a')];
  await qxQALine(a,q.audio,q.ask); if(run!==qz.run||!inQ()) return;
  await new Promise(r=>setTimeout(r,350)); if(run!==qz.run||!inQ()) return;
  await qxQALine(b,R_Q(q.ansAudio),q.word); if(run!==qz.run||!inQ()) return;
  return qAdvance(run,900);
}

// qa "together" (Marwa 2026-11-05, RULES.md "Q&A slides"): the pairs are SLIDES like the listening lesson's segment slides (the same book card:
// picture in its frame, the question and its answer on the light panel over its bottom edge). One slide per pair, the same slide-in / picture fade,
// the text reads by itself (question then answer) and goes on to the next slide; no speaker beside a line. Any tap or a slide change by the child
// stops the sound (a tap on a line reads that line). The side button = Listen (from this slide on) / Stop. Swipe = the shared pager (book.js, q.sl).
function qxQAAll(box,q,s,run){
  box.classList.add('qa-slides'); let tok=0, i=0, playing=false, lines=[];
  const scene=el('div','scene story point slide qasl'), fig=el('div','pfig'), card=el('div','scard'), pbox=el('div','pbox'), img=el('img'), note=el('div','note');
  const badge=el('span','sbadge');
  img.alt=''; img.draggable=false; pbox.append(img); card.append(pbox,note,badge); fig.append(card); scene.append(fig); box.append(scene);
  // one card size for every slide (the pictures differ in shape): the picture sits whole inside the frame
  preloadImgs(q.items.map(it=>it.pic).filter(Boolean));
  const live=()=>scene.isConnected&&qz.list[qz.i]===q&&run===qz.run&&inQ();
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const paint=()=>{ if(!scene.isConnected) return; setRail([playing?{kind:'stop',icon:'stop',label:tr('Stop'),click:stop}:{kind:'go',icon:'play',label:tr('Listen'),click:()=>play()}]); };
  const one=async(w,src,t,k)=>{ w.classList.add('reading'); playing=true; paint(); await qSound(src,t); w.classList.remove('reading'); return k===tok&&live(); };
  function stop(){ ++tok; vStop(); playing=false; $$('.w.reading',note).forEach(x=>x.classList.remove('reading')); paint(); }
  const text=k=>{ const it=q.items[k], inn=el('div','in'), ul=el('ul','lines');
    lines=[[it.ask,it.audio,'qa-q'],[it.word,R_Q(it.ansAudio),'qa-a']].filter(x=>x[0]).map(([t,src,c])=>{ const li=el('li','line '+c), tx=el('span','txt'), w=el('span','w',t); tx.append(w); li.append(tx); ul.append(li);
      li.addEventListener('click',ev=>{ ev.stopPropagation(); stop(); const k=tok; one(w,src,t,k).then(()=>{ if(k===tok){ playing=false; paint(); } }); }); return {w,src,t}; });
    inn.append(ul); return inn; };
  // the words are as big as the panel allows: shrink only when a slide would not fit (as fitStory)
  let fsK='', fsV=0;   // ONE size for every slide: the biggest at which all of them fit
  const fit=()=>{ const inn=$('.in:last-child',note); if(!inn||!note.clientHeight) return; const k=note.clientWidth+'x'+note.clientHeight;
    if(k!==fsK){ inn.style.fontSize=''; let fs=parseFloat(getComputedStyle(inn).fontSize); const keep=lines;
      q.items.forEach((_,j)=>{ const t=text(j); t.style.cssText+='visibility:hidden;position:absolute;left:0;right:0;top:0;height:auto'; t.style.fontSize=fs+'px'; note.append(t); for(let n=0;n<80&&t.offsetHeight>note.clientHeight-2&&fs>11;n++){ fs-=.5; t.style.fontSize=fs+'px'; } t.remove(); });
      lines=keep; fsK=k; fsV=fs; }
    $$('.in',note).forEach(x=>x.style.fontSize=fsV+'px'); };
  new ResizeObserver(fit).observe(card);
  function show(k,d){ i=k; badge.textContent=num(k+1); const old=$('.in',note), nin=text(k), u=q.items[k].pic; note.append(nin); fit();
    if(anim&&d){ G.killTweensOf([old,nin]); G.fromTo(nin,{x:d*60,opacity:0},{x:0,opacity:1,duration:.32,ease:'power2.out',clearProps:'transform,opacity'});
      if(old) G.to(old,{x:-d*60,opacity:0,duration:.28,ease:'power2.in',onComplete:()=>old.remove()}); } else if(old) old.remove();
    if(u&&img.dataset.u!==u){ img.dataset.u=u; if(anim&&d){ G.killTweensOf(pbox); G.timeline().to(pbox,{opacity:0,duration:.22,ease:'power1.in'}).call(()=>{ img.src=u; }).to(pbox,{opacity:1,duration:.3,ease:'power1.out',clearProps:'opacity'}); } else img.src=u; }
    lnavPaint(); }
  // from this slide on to the end: question, short pause, answer, then the next slide; after the last one the exercise is done
  async function play(){ const k0=++tok; vStop();
    for(;;){ for(let j=0;j<lines.length;j++){ const L=lines[j]; if(!(await one(L.w,L.src,L.t,k0))) return; await sleep(j<lines.length-1?350:700); if(k0!==tok||!live()) return; }   // an item without "ask" is an answer-only slide
      if(i+1<q.items.length) show(i+1,1); else break; await sleep(450); if(k0!==tok||!live()) return; }
    playing=false; paint(); if(qz.busy) return; qz.busy=true; q.solved=true; return qAdvance(run,900); }
  q.sl={live,i:()=>i,n:q.items.length,go:d=>{ stop(); show(i+d,d); }};   // the shared pager's model (book.js lnavModel): the child's swipe moves the slides first
  scene.addEventListener('click',()=>{ if(playing) stop(); });
  $('#lesson').classList.add('qrail'); show(0,0); paint(); box._after=()=>play();
}

// a computer keyboard writes at once: a key pressed while no box has focus goes into the writing box on screen (letters questions and the vocabulary Write), no click needed
addEventListener('keydown',e=>{ if(e.ctrlKey||e.metaKey||e.altKey||e.key.length!==1) return; const a=document.activeElement; if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  const inp=['qxin','vin'].map(id=>document.getElementById(id)).find(x=>x&&x.isConnected&&x.offsetParent!==null); if(!inp) return;
  e.preventDefault(); inp.focus({preventScroll:true}); inp.value=e.key; inp.dispatchEvent(new Event('input',{bubbles:true})); });


// story = the book's "listen to the story and jump when you hear a word with the letter": the story picture (big, cut) with a small listen/stop button on it, the story text in a panel under it; it plays by itself after the task is read, a word with the set's letter gets a small pop when it is read, then the closing question is read (and shown). The child jumps by herself, nothing to tap.
// item: {scene (the book's story picture, cut, transparent), text, audio, times?: [[start,end] per word, from the recording], ask, askAudio}; set: "letter":"ا" (the letter looked for, forms of alef count as one)
const qxNorm=t=>t.replace(/[\u064B-\u0652\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا');
function qxStory(box,q,s,run){
  const L=qxNorm(s.letter||''), ws=q.text.split(/\s+/).filter(Boolean), tm=q.times||[]; let tok=0;
  const fig=el('div','qxsc',`<span class="qxsi"><img src="${R_Q(q.scene)}" alt=""></span>`), btn=el('button','rb qsbtn'); btn.setAttribute('aria-label','Listen');
  const tx=el('div','qxstory'), els=ws.map(w=>{ const sp=el('span','w',w); if(L&&qxNorm(w).includes(L)) sp.dataset.hit=1; tx.append(sp,' '); return sp; });
  const ask=el('div','qxstask',q.ask); ask.hidden=true; $('.qxsi',fig).append(btn); tx.append(ask); box.append(fig,tx);
  // the picture takes what is left between the stars and the bottom after the text panel (never cropped, never over the stars); a very long text scrolls inside its own panel
  const fit=()=>{ if(!box.isConnected) return; const img=$('img',fig), H=box.clientHeight, gap=parseFloat(getComputedStyle(box).rowGap)||8; tx.style.maxHeight=''; let th=tx.offsetHeight; if(H-th-gap<H*.4){ tx.style.maxHeight=Math.round(H*.55)+'px'; th=tx.offsetHeight; } const a=Math.max(60,H-th-gap); fig.style.height=a+'px'; img.style.maxHeight=a+'px'; };
  new ResizeObserver(fit).observe(box); $('img',fig).addEventListener('load',fit); requestAnimationFrame(fit);
  const stop=()=>{ ++tok; vStop(); els.forEach(e=>e.classList.remove('reading','pop')); };
  const paint=on=>{ btn.innerHTML=ICON[on?'stop':'play']; btn.classList.toggle('on',on); };
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function play(){ const t=++tok; vStop(); ask.hidden=true; paint(true); const est=i=>tm[i]?tm[i][0]*1000:i*350;   // no recording timings yet: an even pace
    const snd=qSound(R_Q(q.audio),''); const sched=els.map((e,i)=>setTimeout(()=>{ if(t!==tok) return; els.forEach(x=>x.classList.remove('reading')); e.classList.add('reading'); if(e.dataset.hit){ e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); } },est(i)));
    await Promise.all([snd,sleep(ws.length*350)]); sched.forEach(clearTimeout); if(t!==tok||run!==qz.run||!inQ()) return;
    els.forEach(x=>x.classList.remove('reading')); await sleep(500); if(t!==tok||run!==qz.run||!inQ()) return;
    ask.hidden=false; await qSound(R_Q(q.askAudio),q.ask); if(t!==tok||run!==qz.run||!inQ()) return;
    paint(false); if(qz.busy) return; qz.busy=true; q.solved=true; return qAdvance(run,1500); }
  btn.onclick=()=>btn.classList.contains('on')?(stop(),paint(false)):play(); paint(false); box._after=()=>play();
}
QM.story={sheet:'box', own:1, noword:1, notsay:1, bulb:0, draw:qxStory};

// sound = the book's "say the letter with its haraka": big pictures in cloud frames, each with its letter+haraka above (book order, first = right). It plays by itself: every picture's whole sentence in turn
// (item.audio = a LIST of library recordings said one after another: letter name, haraka name, the sound, the word), the picture being said is lit; tapping a picture says its sentence again by itself. Listen/stop on the side; done when the autoplay ends.
// item: {ask: the letter with its haraka, word, pic, audio: [files]}
function qxSound(box,q,s,run){
  const row=el('div','qxsd'); let tok=0; const items=q.items;
  const cells=items.map((it,i)=>{ const b=el('button','qsd',`<b>${it.ask}</b><span class="qsdp"><img src="${R_Q(it.pic)}" alt=""></span>`); b.setAttribute('aria-label',it.word); row.append(b); return b; });
  box.append(row);
  const say=async(i,t)=>{ cells[i].classList.add('lit'); for(const f of [].concat(items[i].audio)){ if(t!==tok) break; await qSound(R_Q(f),''); } cells[i].classList.remove('lit'); };
  const sideBtn=on=>{ if(!row.isConnected) return; setRail(on?[{kind:'stop',icon:'stop',label:tr('Stop'),click:()=>{ ++tok; vStop(); cells.forEach(c=>c.classList.remove('lit')); sideBtn(false); }}]:[{kind:'go',icon:'play',label:tr('Listen'),click:()=>playAll()}]); };
  async function playAll(){ const t=++tok; vStop(); sideBtn(true);
    for(let i=0;i<cells.length;i++){ if(t!==tok||run!==qz.run||!inQ()) return; await say(i,t); await new Promise(r=>setTimeout(r,500)); }
    if(t!==tok||run!==qz.run||!inQ()) return; sideBtn(false); if(qz.busy) return; qz.busy=true; q.solved=true; return qAdvance(run,1200); }
  cells.forEach((b,i)=>b.addEventListener('click',()=>{ const t=++tok; vStop(); cells.forEach(c=>c.classList.remove('lit')); sideBtn(false); say(i,t); }));
  $('#lesson').classList.add('qrail'); sideBtn(false); box._after=()=>playAll();
}
QM.sound={sheet:'box', own:1, noword:1, bulb:0, draw:qxSound};

// puzzle = the book's "say, then merge the letters to make a word": our own clean puzzle pieces (one letter each, centred inside, drawn in SVG) lie scattered under the word frame; the frame above shows one faint empty piece per letter.
// The child drags each piece to ITS place in the frame (it snaps; a wrong place does not), tapping a piece says that letter's sound. When all are placed the pieces disappear, the written word shows in the frame and is read.
// Dragging never moves the page (board is data-noswipe) and nothing jumps to another question by itself. ONE listen icon (beside the picture, the word to build).
// item: {word, pieces: [text per piece, FIRST = RIGHTMOST], pieceAudio?: [file per piece], audio (the word), pic?}
const QXP_COL=[['#8CCB3C','#5E9A1E'],['#F27CA8','#C4467A']];
function qxPieceSvg(i,n,ghost){ const c=QXP_COL[i%2], knob=i<n-1, sock=i>0;   // knob to the left (into the next piece), socket on the right (takes the previous piece's knob)
  const d='M0,0 H100 V'+(sock?'35 a15,15 0 0,0 0,30 V':'')+'100 H0 V'+(knob?'65 a15,15 0 1,1 0,-30 V':'')+'0 Z';
  return `<svg viewBox="0 0 100 100" style="overflow:visible" aria-hidden="true"><path d="${d}" fill="${ghost?'rgba(255,255,255,.16)':c[0]}" stroke="${ghost?'rgba(255,255,255,.7)':c[1]}" stroke-width="${ghost?3:4}" ${ghost?'stroke-dasharray="7 6"':''} stroke-linejoin="round"/></svg>`; }
function qxPuzzle(box,q,s,run){
  const n=q.pieces.length, bd=el('div','qxpb'), slot=el('div','qxpslot'); bd.dataset.noswipe=1; box.append(bd); bd.append(slot);
  const ghosts=q.pieces.map((t,i)=>{ const g=el('div','qxpg',qxPieceSvg(i,n,1)); slot.append(g); return g; });
  const wordEl=el('b','qxpword',q.word); slot.append(wordEl);
  const P=q.pieces.map((t,i)=>{ const e=el('div','qxpp',qxPieceSvg(i,n,0)+`<b>${t}</b>`); bd.append(e); return {e,i,x:0,y:0,tx:0,ty:0,in:false}; });
  let pw=0,done=false; const put=p=>{ p.e.style.transform=`translate(${p.x}px,${p.y}px)`; };
  const layout=()=>{ const W=bd.clientWidth,H=bd.clientHeight; if(!W||!H||done) return; pw=Math.max(40,Math.min(W/(n+.5),H*.38,170)); bd.style.setProperty('--pw',pw+'px');
    const sw=n*pw, sh=pw, sl=(W-sw)/2, st=H*.03; Object.assign(slot.style,{left:sl+'px',top:st+'px',width:sw+'px',height:sh+'px'});
    const left0=sl, cy=st; P.forEach(p=>{ p.tx=left0+(n-1-p.i)*pw; p.ty=cy; const g=ghosts[p.i]; g.style.cssText=`left:${p.tx-sl}px;top:${p.ty-st}px;width:${pw}px;height:${pw}px`; });
    const order=P.map((_,i)=>i).sort((a,b)=>((a*7+3)%5)-((b*7+3)%5)); if(n>1&&order.every((v,i)=>v===i)) order.reverse();
    const y0=st+sh+pw*.35, y1=Math.max(y0,H-pw*1.1);
    P.forEach(p=>{ const k=order.indexOf(p.i); if(p.in){ p.x=p.tx; p.y=p.ty; } else { p.x=(W-pw*1.2)*(n>1?k/(n-1):.5)+pw*.1; p.y=y0+(y1-y0)*(k%2?.9:.15); } put(p); }); };
  const say=i=>qSound(q.pieceAudio&&q.pieceAudio[i]?R_Q(q.pieceAudio[i]):null,'');
  async function finish(last){ if(done) return; done=true; try{ await Promise.race([Promise.resolve(last),new Promise(r=>setTimeout(r,2500))]); }catch(e){}   // the last piece's sound ends first, then the WHOLE word is said (Marwa 2026-11-09)
    if(run!==qz.run||!inQ()) return; q.solved=true; P.forEach(p=>p.e.classList.add('gone')); slot.classList.add('got'); await new Promise(r=>setTimeout(r,400)); if(run!==qz.run||!inQ()) return; await qSound(R_Q(q.audio),q.word); if(run!==qz.run||!inQ()) return; qStar(); }
  P.forEach(p=>{ let sx,sy,x0,y0,moved=false,on=false;
    p.e.addEventListener('pointerdown',ev=>{ if(done) return; ev.preventDefault(); ev.stopPropagation(); p.e.setPointerCapture(ev.pointerId); sx=ev.clientX; sy=ev.clientY; x0=p.x; y0=p.y; moved=false; on=!p.in; if(on) p.e.classList.add('drag'); });
    p.e.addEventListener('pointermove',ev=>{ if(!on) return; const dx=ev.clientX-sx,dy=ev.clientY-sy; if(!moved&&Math.hypot(dx,dy)<6) return; moved=true; p.x=Math.min(Math.max(0,x0+dx),bd.clientWidth-pw); p.y=Math.min(Math.max(0,y0+dy),bd.clientHeight-pw); put(p); });
    const up=ev=>{ ev.stopPropagation(); p.e.classList.remove('drag'); if(!moved){ if(!done) say(p.i); on=false; return; } if(!on) return; on=false;
      if(Math.hypot(p.x-p.tx,p.y-p.ty)<pw*.85){ p.in=true; p.x=p.tx; p.y=p.ty; p.e.classList.add('in'); put(p); const sp=say(p.i); if(P.every(z=>z.in)) finish(sp); } };
    p.e.addEventListener('pointerup',up); p.e.addEventListener('pointercancel',up); });
  box._after=()=>layout(); requestAnimationFrame(layout); new ResizeObserver(layout).observe(bd);
}
QM.puzzle={sheet:'box', noword:1, bulb:0, draw:qxPuzzle};
// face = the book's "draw the missing parts of the face" (Marwa 2026-11-02: drag-and-drop with the book's own pictures): the face (its dotted places show where parts go) stands on one side, the loose parts lie on the other.
// The child drags each part to ITS place on the face (it snaps; a wrong place goes back), tapping a part says its name. When all are placed the star comes. Dragging never moves the page (board is data-noswipe).
// item: {word (the face's name), face: picture, parts: [{pic, x, y (centre of its place, % of the face), w (its width, % of the face), word?, audio?}]}
function qxFace(box,q,s,run){
  const bd=el('div','qxfb'); bd.dataset.noswipe=1; box.append(bd);
  const fi=el('img','qxff'); fi.alt=''; fi.draggable=false; fi.src=R_Q(q.face); bd.append(fi);
  const P=q.parts.map((t,i)=>{ const im=el('img','qxfp'); im.alt=''; im.draggable=false; im.src=R_Q(t.pic); bd.append(im); return {e:im,t,i,s:i,x:0,y:0,tx:0,ty:0,w:0,h:0,tw:0,th:0,in:false}; });
  let done=false, fx=0,fy=0,fw=0,fh=0; const put=p=>{ p.e.style.transform=`translate(${p.x}px,${p.y}px)`; };
  const say=p=>p.t.audio?qSound(R_Q(p.t.audio),p.t.word||''):null;
  const size=p=>{ const w=p.in?p.tw:p.w, h=p.in?p.th:p.h; p.e.style.width=w+'px'; p.e.style.height=h+'px'; };
  const layout=()=>{ const W=bd.clientWidth,H=bd.clientHeight; if(!W||!H||!fi.naturalWidth||done) return;
    const ar=fi.naturalWidth/fi.naturalHeight; const sy=$('.qxsay',box), sw=sy&&!sy.hidden&&sy.offsetParent?sy.offsetWidth+6:0;   // the face starts right of the Listen speaker, never under it
    fh=H*.96; fw=fh*ar; if(fw>W*.62-sw){ fw=W*.62-sw; fh=fw/ar; } fx=Math.max(W*.01,sw); fy=(H-fh)/2;
    Object.assign(fi.style,{left:fx+'px',top:fy+'px',width:fw+'px',height:fh+'px'});
    const trX=fx+fw+W*.03, trW=Math.max(20,W-trX), n=P.length;
    P.forEach((p,k)=>{ const nw=p.e.naturalWidth||1, nh=p.e.naturalHeight||1; p.tw=p.t.w/100*fw; p.th=p.tw*nh/nw;   // tw/th = its true size on the face
      const m=Math.max(1,Math.min(1.8,Math.max(H*.09,46)/Math.max(p.tw,p.th))); p.w=p.tw*m; p.h=p.th*m;   // loose parts are never tiny: easy to grab on a phone / iPad
      size(p);
      const st=P[p.s].t; p.cx=fx+st.x/100*fw; p.cy=fy+st.y/100*fh; p.tx=p.cx-p.tw/2; p.ty=p.cy-p.th/2;   // p.s = the place (slot) this part belongs in
      if(p.in){ p.x=p.tx; p.y=p.ty; } put(p); });
    const cols=[P.filter((_,k)=>k%2===0).reverse(),P.filter((_,k)=>k%2===1)]; cols.forEach((c,ci)=>c.forEach((p,j)=>{ if(p.in) return; const step=fh/c.length; p.x=trX+(trW-p.w)*(ci?.78:.22); p.y=fy+step*(j+.5)-p.h/2; put(p); })); };   // two columns, one slot of the height each: loose parts never overlap
  async function finish(last){ if(done) return; done=true; try{ await Promise.race([Promise.resolve(last),new Promise(r=>setTimeout(r,2500))]); }catch(e){}   // the last piece's sound ends first, then the WHOLE word is said (Marwa 2026-11-09)
    if(run!==qz.run||!inQ()) return; q.solved=true; await new Promise(r=>setTimeout(r,350)); if(run!==qz.run||!inQ()) return; qStar(); }
  // Forgiving drag (Ahmed 2026-11-10, shared look: touch grabs the NEAREST loose part within a wide margin, a drop near the right place snaps, an identical twin place also counts):
  const grab=ev=>{ const r=bd.getBoundingClientRect(), px=ev.clientX-r.left, py=ev.clientY-r.top; let best=null,bd2=1e9;
    P.forEach(p=>{ if(p.in) return; const m=Math.max(16,Math.min(p.w,p.h)*.5), cx=p.x+p.w/2, cy=p.y+p.h/2;
      if(px>=p.x-m&&px<=p.x+p.w+m&&py>=p.y-m&&py<=p.y+p.h+m){ const d=Math.hypot(px-cx,py-cy); if(d<bd2){ bd2=d; best=p; } } }); return best; };
  let cur=null,sx,sy,x0,y0,moved=false;
  bd.addEventListener('pointerdown',ev=>{ if(done) return; const p=grab(ev); if(!p) return; ev.preventDefault(); ev.stopPropagation(); try{ bd.setPointerCapture(ev.pointerId); }catch(e){}
    cur=p; sx=ev.clientX; sy=ev.clientY; x0=p.x; y0=p.y; moved=false; p.e.classList.add('drag'); });
  bd.addEventListener('pointermove',ev=>{ if(!cur) return; const dx=ev.clientX-sx,dy=ev.clientY-sy; if(!moved&&Math.hypot(dx,dy)<8) return; moved=true; ev.preventDefault();
    cur.x=Math.min(Math.max(0,x0+dx),bd.clientWidth-cur.w); cur.y=Math.min(Math.max(0,y0+dy),bd.clientHeight-cur.h); put(cur); });
  const up=ev=>{ if(!cur) return; ev.stopPropagation(); const p=cur; cur=null; p.e.classList.remove('drag'); if(!moved){ say(p); return; }
    const cx=p.x+p.w/2, cy=p.y+p.h/2, reach=Math.max(p.w,p.h,p.tw,p.th)*.9+20;
    let tgt=null,td=1e9; P.forEach(z=>{ if(z.in||(z!==p&&z.t.pic!==p.t.pic)) return; const d=Math.hypot(cx-z.cx,cy-z.cy); if(d<reach&&d<td){ td=d; tgt=z; } });   // z = a free place with the same part (the two eyes / two brows are alike)
    if(tgt){ if(tgt!==p){ const k=p.s; p.s=tgt.s; tgt.s=k; p.tx=tgt.cx-p.tw/2; p.ty=tgt.cy-p.th/2; tgt.tx=p.cx-tgt.tw/2; tgt.ty=p.cy-tgt.th/2; const c=[p.cx,p.cy]; [p.cx,p.cy]=[tgt.cx,tgt.cy]; [tgt.cx,tgt.cy]=c; }
      p.in=true; size(p); p.x=p.tx; p.y=p.ty; p.e.classList.add('in'); put(p); say(p); if(P.every(z=>z.in)) finish(); }
    else layout(); };
  bd.addEventListener('pointerup',up); bd.addEventListener('pointercancel',up);
  box._after=()=>layout(); fi.addEventListener('load',layout); P.forEach(p=>p.e.addEventListener('load',layout)); requestAnimationFrame(layout); new ResizeObserver(layout).observe(bd);
}
QM.face={sheet:'box', noword:1, bulb:0, draw:qxFace};
function qxColour(box,q,s,run){
  const bd=el('div','qxcb'); bd.dataset.noswipe=1; box.append(bd);
  const nb=el('button','qxcn'); nb.type='button'; nb.textContent=q.num; nb.onclick=()=>{ if(q.audio) qSound(R_Q(q.audio),q.word||''); }; bd.append(nb);
  const row=el('div','qxcr'); bd.append(row); let on=0, done=false;
  const cells=[]; for(let i=0;i<q.total;i++){ const im=el('img','qxcs'); im.alt=''; im.draggable=false; im.src=R_Q(q.off); im.dataset.on=0; row.append(im); cells.push(im); }
  const cnt=()=>cells.filter(c=>c.dataset.on==='1').length;
  async function finish(last){ if(done) return; done=true; try{ await Promise.race([Promise.resolve(last),new Promise(r=>setTimeout(r,2500))]); }catch(e){}   // the last piece's sound ends first, then the WHOLE word is said (Marwa 2026-11-09)
    if(run!==qz.run||!inQ()) return; q.solved=true; await new Promise(r=>setTimeout(r,450)); if(run!==qz.run||!inQ()) return; qStar(); }
  cells.forEach(c=>c.addEventListener('click',ev=>{ ev.stopPropagation(); if(done) return;
    if(c.dataset.on==='1'){ c.dataset.on=0; c.src=R_Q(q.off); return; }
    if(cnt()>=q.num){ c.classList.remove('no'); void c.offsetWidth; c.classList.add('no'); return; }
    c.dataset.on=1; c.src=R_Q(q.on); if(cnt()===q.num) finish(); }));
}
QM.colour={sheet:'box', noword:1, bulb:0, draw:qxColour};

QM.position={sheet:'box', draw:qxPosition, help:(q,w)=>[$$('.qxc',w)[q.at]]};
QM.vowel={sheet:'box', draw:qxVowel, help:(q,w)=>$$('.qxchoices .qlet',w).filter(b=>b.textContent===q.answer)};
QM.write={sheet:'box', bulb:0, draw:qxWrite};
QM.mad={sheet:'box', draw:qxMad, help:(q,w)=>{ const k=$$('.qxslot',w).findIndex(d=>!d.classList.contains('got')); if(k<0) return []; const g=glyphs(q.word)[k?q.mm:q.mad]; return $$('.qxl:not(.used)',w).filter(b=>sameLetter(b.dataset.g,g)).slice(0,1); }};
QM.arrange={sheet:'box', draw:qxArrange, help:(q,w)=>{ const n=$('.qxw .lt.hid',w); return n?$$('.qxtile:not(.used)',w).filter(b=>sameLetter(b.dataset.g,n.textContent)).slice(0,1):[]; }};
QM.qa={sheet:'box', bulb:0, draw:qxQA};

/* RULE: while the phone keyboard is open the word stays above it, and the Help bulb moves beside the word: shared, js/wordslots.js (wsKeep) */

/* first    = "write the FIRST letter of each picture's word, then merge the letters into the new word" (book booklet ex12): a row of pictures, a place under each for its first letter (typed), then the merged word is typed. The result picture (q.pic) is on top.
   item: {word: the merged word, result: its picture, parts:[{pic, first: the letter}, ...], hush: true (the word is the answer, so no speaker)} */
function qxFirst(box,q,s,run){
  const row=el('div','qxfirsts'), cells=q.parts.map(p=>{ const f=el('figure','qxfi'); f.append(el('div','qxfp2',`<img src="${R_Q(p.pic)}" alt="">`)); const h=el('div','qxfh'); f.append(h); row.append(f); return h; });
  let rc=null; if(q.result){ row.append(el('span','qxeq','=')); const f=el('figure','qxfi'); f.append(el('div','qxfp2',`<img src="${R_Q(q.result)}" alt="">`)); rc=el('div','qxfh'); f.append(rc); row.append(f); }   // the merged word's own picture and its place, after "="
  box.append(row);
  const stage=k=>{ const last=k>=q.parts.length;
    qxWrite(box,q,s,run,last?q.word:q.parts[k].first,last?null:()=>{ stage(k+1); });
    const ln=$$('.qxline',box).pop(); if(ln) (last&&rc?rc:cells[k]).append(ln); };
  stage(0);
}
QM.first={sheet:'box', noword:1, bulb:0, draw:qxFirst};

/* build    = "make words from these letters" (book workbook): ALL the letters sit on top once, each can be dragged (or tapped) as many times as the child wants into the places below, one place per word to build (3-4 places). A place that spells one of the words locks in green; the question is done when `need` words are built.
   item: {letters:["أ","ب",...], words:["أَب","أُمّ",...] (the words that count, marks ignored), slots:4, need:3} */
function qxBuild(box,q,s,run){
  const key=t=>(t||'').replace(/[ً-ْٰـ]/g,'').replace(/[أإآٱ]/g,'ا'), ok=(q.words||[]).map(w=>({k:key(w),w}));
  const fits=l=>{ const c={}; (q.letters||[]).forEach(g=>{ const t=key(g); c[t]=(c[t]||0)+1; }); return l.every(g=>{ const t=key(g); return c[t]>0&&c[t]--; }); };   // a dictionary word may use each given letter only as many times as it is given
  let DICT=null; fetch('data/arabic/dict.json').then(r=>r.ok?r.json():[]).then(j=>{ DICT=new Set(j); }).catch(()=>{});
  const bank=el('div','qxtiles qxbank'); (q.letters||[]).forEach(g=>{ const t=el('button','qxtile',`<span>${g}</span>`); t.dataset.g=g; bank.append(t); });
  if(q.pics&&!q.picWords&&q.words&&q.words.length===q.pics.length) q.picWords=q.words.map(w=>[w]);   // pictures + one word per picture (same order): every place gets exactly the word's letter boxes, never fewer
  const places=el('div','qxbplaces'), P=[]; const PW=q.pics&&q.picWords;   // picWords (with pics): place i belongs to picture i and accepts ONLY that picture's name (list of spellings), with exactly as many letter boxes as the name has letters; a built word turns into one joined written word
  for(let i=0;i<(PW?q.pics.length:(q.slots||4));i++){ const d=el('div','qxbp'+(q.cells?' cells':'')), w=el('b','qxbw'), c=el('button','qxbx','×'); c.setAttribute('aria-label','Clear'); d.append(w,c); places.append(d); P.push({d,w,c,l:[],done:false,i}); }
  if(PW){ const cols=[...places.children]; cols.forEach((d,i)=>{ const col=el('div','qxbcol'), f=el('figure','qxfi'); f.append(el('div','qxfp2',`<img src="${q.pics[i]}" alt="">`)); d.replaceWith(col); col.append(f,d); }); }   // pictures stand at the sides: each one right above its own place
  if(q.pics&&q.pics.length&&!PW){ const pr=el('div','qxfirsts qxbpics'); q.pics.forEach(u=>{ const f=el('figure','qxfi'); f.append(el('div','qxfp2',`<img src="${u}" alt="">`)); pr.append(f); }); box.append(pr); }   // "pics": the book's pictures of the words to make (shown above the letters; the answer is still ANY word the letters make)
  box.append(bank,places);
  const MAXL=PW?6:6, need=P.length, pwN=p=>PW?(q.picWords[p.i][0].match(/[^ً-ْٰـ][ً-ْٰـ]*/g)||[]).length:0, act=()=>P.find(p=>!p.done&&p.l.length<MAXL), show=p=>{ if(!q.cells){ p.w.textContent=p.l.join(''); return; }
    // q.cells = N: the place is split into N letter boxes so the child sees where each letter goes (one box per letter; a built word shows its marks)
    // boxes do NOT tell how long the word is: as many boxes as letters placed plus one empty (at least 2, at most MAXL); a built word shows its letters with marks
    if(PW&&p.done){ p.w.innerHTML=''; p.w.append(el('span','qxbjoin',p.wk)); return; }
    const parts=p.done?(p.wk||'').match(/[^ً-ْٰـ][ً-ْٰـ]*/g)||[]:p.l, n=PW?pwN(p):p.done?parts.length:Math.min(MAXL,Math.max(2,p.l.length+1)); p.w.innerHTML=''; for(let i=0;i<n;i++){ const c=el('span','qxbc'+(parts[i]?' on':'')); c.textContent=parts[i]||''; p.w.append(c); } };
  const put=(g,p)=>{ if(!p||p.done||p.l.length>=(PW?pwN(p):MAXL)||qz.busy) return false; p.l.push(g); show(p); blip(520+p.l.length*60,.05);
    const lock=m=>{ p.done=true; p.k=m.k; p.wk=m.w; if(q.cells) show(p); else p.w.textContent=m.w; p.d.classList.add('got'); celebrate(p.d); if(P.filter(x=>x.done).length>=need) qxWin(places,q,1700); };
    if(PW){ const k=key(p.l.join('')), w=q.picWords[p.i].find(x=>key(x)===k); if(w) lock({k,w}); else if(p.l.length>=pwN(p)){ qxBad(p.d); setTimeout(()=>{ p.l=[]; show(p); },420); } return true; }
    const k=key(p.l.join('')), m=ok.find(o=>o.k===k&&!P.some(x=>x.done&&x.k===o.k));
    if(m) lock(m);
    else if(p.l.length>=2&&!P.some(x=>x.done&&x.k===k)&&DICT&&DICT.has(k)&&fits(p.l)){   // ANY real word the letters can make counts (every word of the Arabic data); wait a moment so a longer word can still be finished
      const was=p.l.join(''); setTimeout(()=>{ if(!p.done&&p.l.join('')===was&&!P.some(x=>x.done&&x.k===k)) lock({k,w:was}); },p.l.length>=MAXL?0:900); }
    else if(p.l.length>=MAXL){ qxBad(p.d); setTimeout(()=>{ p.l=[]; show(p); },420); }
    return true; };
  if(q.cells) P.forEach(show);
  P.forEach(p=>{ p.c.onclick=e=>{ e.stopPropagation(); if(p.done||qz.busy) return; p.l=[]; show(p); }; });
  let drag=null;
  bank.addEventListener('pointerdown',e=>{ const t=e.target.closest('.qxtile'); if(!t||qz.busy) return; e.preventDefault(); hideHint();
    drag={t,x:e.clientX,y:e.clientY,moved:false,g:null}; try{ bank.setPointerCapture(e.pointerId); }catch(_){} });
  bank.addEventListener('pointermove',e=>{ if(!drag) return; if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10) return;
    if(!drag.moved){ drag.moved=true; const g=el('div','qxtile ghost',`<span>${drag.t.dataset.g}</span>`); g.style.cssText='position:fixed;z-index:50;pointer-events:none;margin:0'; document.body.append(g); drag.g=g; }
    const r=drag.g.getBoundingClientRect(); drag.g.style.left=(e.clientX-r.width/2)+'px'; drag.g.style.top=(e.clientY-r.height*.8)+'px'; });
  const end=e=>{ if(!drag) return; const d=drag; drag=null; if(d.g) d.g.remove(); if(e.type==='pointercancel') return;
    let p=null; if(d.moved){ const pad=14; p=P.find(x=>{ const r=x.d.getBoundingClientRect(); return e.clientX>r.left-pad&&e.clientX<r.right+pad&&e.clientY>r.top-pad&&e.clientY<r.bottom+pad; }); if(!p) return; }   // dropped elsewhere: it just goes back
    else if(PW) return;   // with pictures a tap does nothing: the child drags the letter onto the right picture's place
    else p=act();   // a tap goes to the first place that is not full / built
    if(!put(d.t.dataset.g,p)) qxBad(d.t); };
  bank.addEventListener('pointerup',end); bank.addEventListener('pointercancel',end);
}
QM.build={sheet:'box', noword:1, bulb:0, draw:qxBuild};
/* ring     = "listen and CIRCLE THE LETTER inside the word" (booklet ex 11): the word stands whole (joined letters, THE word component); the child taps a letter of it, and a right one gets a circle drawn round it. Every place of the letter must be circled (a word with the letter twice needs both). A wrong letter shakes.
   (Circle the WHOLE word that has the letter = type `circle`; circle the LETTER inside one word = this one.)
   item: {word:"تُوت", letter:"ت" (marks ignored), audio} */
function qxRing(box,q,s,run){
  const wd=wsFill(el('b','qxw'),q.word,{letters:true}), L=$$('.lt',wd), want=l=>sameLetter(arBase(l.textContent),q.letter); wd.classList.add('ring'); box.append(wd);
  L.forEach(l=>l.addEventListener('click',()=>{ if(qz.busy||l.classList.contains('rung')) return; if(!want(l)) return qxBad(l);
    l.classList.add('rung'); blip(560+$$('.rung',wd).length*60,.05); if(L.every(x=>!want(x)||x.classList.contains('rung'))) qxWin(wd,q,1500); }));
}
QM.ring={sheet:'box', noword:1, draw:qxRing, help:(q,w)=>$$('.qxw.ring .lt',w).filter(l=>sameLetter(arBase(l.textContent),q.letter)&&!l.classList.contains('rung')).slice(0,1)};

/* ringword = "listen, then CIRCLE THE WORD in the sentence that fits the question" (assessments book u2l1 p30 ex 1: "هات من العبارة: كلمة بها حرف (د)"): the question line (`ask`) stands on top, the WHOLE sentence below with every word its own tap target (each word is THE word component); a right word gets a circle round it; a wrong word shakes. Any word that fits is accepted (the book leaves the blank free). One item = one question about the sentence; the next item asks again about the same sentence.
   (Circle a LETTER inside one word = `ring`; circle a whole picture/word on a board = `circle`.)
   item: {word:"the sentence", ask:"كَلِمَةٌ بِهَا حَرْفُ (د)", letter:"د" (a word containing it, marks ignored) | prefix:"ال" (a word starting with it), audio:"the sentence read aloud"} */
const qxRwBase=w=>arBase(String(w).replace(/[«»،.؟!:]/g,''));
const qxRwFits=(q,w)=>{ const b=qxRwBase(w); return q.prefix?b.startsWith(arBase(q.prefix)):glyphs(b).some(g=>sameLetter(g,q.letter)); };
function qxRingWord(box,q,s,run){
  if(q.ask) box.append(el('div','qxask',q.ask));
  const sen=el('div','qxsent');
  String(q.word).split(/\s+/).filter(Boolean).forEach(w=>{ const wd=wsWord(w,{}); wd.classList.add('qxcw'); sen.append(wd);
    wd.addEventListener('click',()=>{ if(qz.busy||wd.classList.contains('rung')) return; if(!qxRwFits(q,w)) return qxBad(wd);
      wd.classList.add('rung'); blip(620,.05); qxWin(wd,q,1500); }); });
  box.append(sen);
}
QM.ringword={sheet:'box', noword:1, draw:qxRingWord, help:(q,w)=>$$('.qxcw',w).filter(x=>qxRwFits(q,x.textContent)).slice(0,1)};

/* split    = "analyse the word into syllables (or letters)" (book booklet ex "حلل"): the WHOLE word is written JOINED on top (one connected word, not letter cards; every letter in it is draggable); below, ONE place per part with a "/" between the parts, each place has one box per letter. The child DRAGS the letters one by one from the word into the boxes (a tap does nothing); a wrong letter goes back (shake), a drop elsewhere just goes back. Done when every box is filled. Mouse + touch.
   item: {word:"كِتَاب", parts:["كِ","تَا","ب"]}  (the parts joined = the word; one letter = a letter + its marks) */
function qxSplit(box,q,s,run){
  const GL=/[^ً-ْٰـ][ً-ْٰـ]*/g, letters=q.word.match(GL)||[];
  const bank=el('b','qxjoin qxsword'), line=el('div','qxline'); letters.forEach(g=>{ const t=el('span','qxl',g); t.dataset.g=g; bank.append(t); });   // the word written joined; every letter can be dragged out of it
  bank.style.setProperty('--n',letters.length); line.append(bank);
  const row=el('div','qxsplit'), P=[];
  q.parts.forEach((pt,k)=>{ if(k) row.append(el('span','qxsl','/')); const g=pt.match(GL)||[], d=el('div','qxsy'), cells=g.map(()=>{ const c=el('span','qxbc'); d.append(c); return c; }); row.append(d); P.push({d,g,cells,n:0}); });
  box.append(line,row);
  const total=P.reduce((a,p)=>a+p.g.length,0); let filled=0;
  const put=(t,p)=>{ if(!p||qz.busy||t.classList.contains('used')) return false; if(p.n>=p.g.length||p.g[p.n]!==t.dataset.g) return false;
    const c=p.cells[p.n++]; c.textContent=t.dataset.g; c.classList.add('on'); t.classList.add('used'); blip(520+filled*50,.05); filled++;
    if(p.n===p.g.length) p.d.classList.add('got');
    if(filled>=total) qxWin(row,q,1700); return true; };
  let drag=null;
  bank.addEventListener('pointerdown',e=>{ const t=e.target.closest('.qxl'); if(!t||qz.busy||t.classList.contains('used')) return; e.preventDefault(); hideHint();
    drag={t,x:e.clientX,y:e.clientY,moved:false,g:null}; try{ bank.setPointerCapture(e.pointerId); }catch(_){} });
  bank.addEventListener('pointermove',e=>{ if(!drag) return; if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10) return;
    if(!drag.moved){ drag.moved=true; const g=el('div','qxtile ghost',`<span>${drag.t.dataset.g}</span>`); g.style.cssText='position:fixed;z-index:50;pointer-events:none;margin:0'; document.body.append(g); drag.g=g; drag.t.classList.add('lift'); }
    const r=drag.g.getBoundingClientRect(); drag.g.style.left=(e.clientX-r.width/2)+'px'; drag.g.style.top=(e.clientY-r.height*.8)+'px'; });
  const end=e=>{ if(!drag) return; const d=drag; drag=null; if(d.g) d.g.remove(); d.t.classList.remove('lift'); if(e.type==='pointercancel'||!d.moved) return;   // a plain tap does nothing: the child must drag
    const pad=14, p=P.find(x=>{ const r=x.d.getBoundingClientRect(); return e.clientX>r.left-pad&&e.clientX<r.right+pad&&e.clientY>r.top-pad&&e.clientY<r.bottom+pad; });
    if(!p) return;   // dropped elsewhere: it just goes back
    if(!put(d.t,p)) qxBad(d.t); };
  bank.addEventListener('pointerup',end); bank.addEventListener('pointercancel',end);
}
QM.split={sheet:'box', noword:1, bulb:0, draw:qxSplit};

