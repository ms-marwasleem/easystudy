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
  setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; if(qNewEx()) await qTask(); if(run===qz.run&&inQ()&&box._after) await box._after(); if(run===qz.run&&inQ()&&!quiet()) s.type==='qa'?qxQAPlay(q,run):qSay(); },350);
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
    if(k!==q.at) return qxBad(b);
    $$('.qxc',row).forEach(x=>x.classList.add('show')); b.classList.add('right'); qxWin(b,q); }); row.append(b); });
  box.append(row);
}
function qxVowel(box,q,s,run){
  const gs=qxLetters(q.word), at=q.at||0, wd=el('b','qxw'); const gap=el('span','qgap','_'); wd.append(gs.slice(0,at).join(''),gap,gs.slice(at+1).join('')); box.append(wd);
  const row=el('div','qxchoices');
  (q.choices||s.choices).forEach(c=>{ const b=el('button','rb qbtn qlet',`<span>${c}</span>`); b.setAttribute('aria-label',c);
    b.addEventListener('click',()=>{ if(qz.busy) return; if(c!==q.answer){ gap.textContent=c; gap.classList.add('bad'); clearTimeout(gap._t); gap._t=setTimeout(()=>{ gap.textContent='_'; gap.classList.remove('bad'); },650); return qxBad(b); }
      b.classList.add('on'); gap.classList.remove('bad'); gap.textContent=gs[at]; gap.classList.add('got'); qxWin(b,q); }); row.append(b); });
  box.append(row);
}
// the word (or sentence) as hidden letters with their places underlined; spaces are not letters
function qxWordEl(word,chips,faint,ltr){ const b=el('b','qxw'); if(ltr) b.dir='ltr';   /* an English word: left to right inside any subject */ const gs=glyphs(word); b.style.setProperty('--n',gs.length);
  const cnt=(chips||[]).map(c=>glyphs(c).length), ok=cnt.length>1&&cnt.reduce((a,c)=>a+c,0)===gs.length;   // a box per syllable when the chips match the word
  if(ok){ let k=0; cnt.forEach(n=>{ const sg=el('span','qxseg'); gs.slice(k,k+n).forEach(g=>sg.append(el('span','lt hid'+(faint?' fnt':''),g))); k+=n; b.append(sg); }); }
  else gs.forEach(g=>b.append(el('span',g===' '?'sp':'lt hid'+(faint?' fnt':''),g===' '?' ':g)));
  return b; }
// Help: the next syllable (or letter) shows faintly for a moment, then is hidden again: the child writes it
function qxPeek(wd){ const n=qxNext(wd); if(!n) return; const sg=n.closest('.qxseg'), L=sg?$$('.lt.hid',sg):[n]; L.forEach(x=>x.classList.add('peek')); setTimeout(()=>L.forEach(x=>x.classList.remove('peek')),tokMs('--help-letter-ms',1500)); }
function qxNext(wd){ return $('.lt.hid',wd); }
function qxReveal(wd){ const n=qxNext(wd); if(!n) return false; n.classList.remove('hid'); n.classList.add('got'); return true; }
const qxDone=wd=>!qxNext(wd);
function qxWrite(box,q,s,run,text,onDone){   // text: what to type (default the question's word); onDone: called instead of the win (math: number, then its word)
  text=text||q.word; $$('.qxhelp',box).forEach(x=>x.remove());
  if(q.chips&&text===q.word){ const c=el('div','qxchips'); c.innerHTML=q.chips.map(t=>`<i>${t}</i>`).join('<u>/</u>'); box.append(c); }
  const wd=qxWordEl(text,text===q.word?q.chips:null,s.faint,s.lang==='en'||/^[\x00-\x7f]+$/.test(text)), help=el('button','qxhelp',ICON.hint); help.setAttribute('aria-label','Help');
  const line=el('div','qxline'); line.append(wd); const duo=$('.qxduo',box); (duo||box).append(line); qHelpHost(help);   // duo: number and its word side by side
  let inp=$('#qxin');
  if(!inp){ inp=el('input','qin'); Object.assign(inp,{type:'text',id:'qxin',autocomplete:'off',spellcheck:false,lang:s.lang||'ar'}); ['autocorrect','autocapitalize'].forEach(a=>inp.setAttribute(a,'off')); inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Type the word'); }
  line.append(inp); if(/^\d+$/.test(text)){ inp.setAttribute('inputmode','numeric'); inp.lang='en'; } else inp.removeAttribute('inputmode');
  const cur=()=>{ $$('.lt',wd).forEach(x=>x.classList.remove('cur')); const n=qxNext(wd); if(n) n.classList.add('cur'); }; cur();
  const type=ch=>{ if(qz.busy||qz.list[qz.i]!==q||!ch||/\s/.test(ch)) return; const n=qxNext(wd); if(!n) return;
    if(sameLetter(ch,n.textContent)){ qxReveal(wd); blip(560+$$('.lt.got',wd).length*40,.05); cur(); if(qxDone(wd)){ if(onDone) onDone(wd); else qxWin(wd,q,1700); } }
    else { n.classList.add('bad'); setTimeout(()=>n.classList.remove('bad'),500); qxBad(line); } };
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

// qa "together": every question (red) and its answer (blue) of the exercise on ONE page, a small listen icon beside each pair,
// and two buttons: listen to all in turn / stop. Done when every pair was heard.
function qxQAAll(box,q,s,run){
  const wrap=el('div','qaall'+(q.items.length>3?' many':'')); box.classList.add('qa-together'); const heard={}; let tok=0;
  const rows=q.items.map((it,i)=>{ const r=el('div','qarow');
    const mk=(cls,txt,src)=>{ const ln=el('div','qaline'), b=el('button',cls,txt), sp=el('button','qsay qarsay',SAY_LN); sp.setAttribute('aria-label','Listen'); ln.append(b,sp); return {ln,b,sp,src,txt}; };
    const a=mk('qxqq',it.ask,it.audio), b=mk('qxqa-a',it.word,R_Q(it.ansAudio)), t=el('div','qartxt'); t.append(a.ln,b.ln);
    if(it.pic) r.append(el('div','qarpic',`<img src="${it.pic}" alt="">`));
    r.append(t); wrap.append(r); return {r,a,b}; });
  const mark=(i,k)=>{ heard[i+k]=1; if(Object.keys(heard).length===rows.length*2&&!qz.busy&&qz.list[qz.i]===q){ qz.busy=true; qAdvance(run,1200); } };
  const clear=()=>rows.forEach(y=>y.r.classList.remove('on'));
  const one=async(i,k,t)=>{ const x=rows[i], l=k==='a'?x.a:x.b; x.r.classList.add('on'); await qxQALine(l.b,l.src,l.txt); x.r.classList.remove('on'); if(t===tok) mark(i,k); return t===tok; };
  rows.forEach((x,i)=>{ [['a',x.a],['b',x.b]].forEach(([k,l])=>{ const go=()=>{ if(qz.list[qz.i]!==q) return; clear(); one(i,k,++tok); }; l.sp.onclick=go; l.b.onclick=go; }); });
  const stopAll=()=>{ ++tok; vStop(); clear(); $$('.qxqq,.qxqa-a',wrap).forEach(y=>y.classList.remove('lit')); };
  const sideBtn=()=>{ if(!wrap.isConnected) return; const on=!!$('.qxqq.lit,.qxqa-a.lit',wrap);   // ONE button on the side: Listen while quiet, Stop while it reads (like the lesson reading)
    setRail([on?{kind:'stop',icon:'stop',label:tr('Stop'),click:()=>{ stopAll(); sideBtn(); }}:{kind:'go',icon:'play',label:tr('Listen'),click:async()=>{ const t=++tok; clear(); sideBtn(); for(let i=0;i<rows.length;i++){ for(const k of ['a','b']){ if(t!==tok||qz.list[qz.i]!==q) return; if(!(await one(i,k,t))) return; await new Promise(r=>setTimeout(r,k==='a'?300:500)); } } sideBtn(); }}]); };
  $('#lesson').classList.add('qrail');
  new MutationObserver(sideBtn).observe(wrap,{subtree:true,attributes:true,attributeFilter:['class']});
  box.append(wrap); sideBtn();
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
  async function finish(){ if(done) return; done=true; q.solved=true; P.forEach(p=>p.e.classList.add('gone')); slot.classList.add('got'); await new Promise(r=>setTimeout(r,400)); if(run!==qz.run||!inQ()) return; await qSound(R_Q(q.audio),q.word); if(run!==qz.run||!inQ()) return; qStar(); }
  P.forEach(p=>{ let sx,sy,x0,y0,moved=false,on=false;
    p.e.addEventListener('pointerdown',ev=>{ if(done) return; ev.preventDefault(); ev.stopPropagation(); p.e.setPointerCapture(ev.pointerId); sx=ev.clientX; sy=ev.clientY; x0=p.x; y0=p.y; moved=false; on=!p.in; if(on) p.e.classList.add('drag'); });
    p.e.addEventListener('pointermove',ev=>{ if(!on) return; const dx=ev.clientX-sx,dy=ev.clientY-sy; if(!moved&&Math.hypot(dx,dy)<6) return; moved=true; p.x=Math.min(Math.max(0,x0+dx),bd.clientWidth-pw); p.y=Math.min(Math.max(0,y0+dy),bd.clientHeight-pw); put(p); });
    const up=ev=>{ ev.stopPropagation(); p.e.classList.remove('drag'); if(!moved){ if(!done) say(p.i); on=false; return; } if(!on) return; on=false;
      if(Math.hypot(p.x-p.tx,p.y-p.ty)<pw*.55){ p.in=true; p.x=p.tx; p.y=p.ty; p.e.classList.add('in'); put(p); say(p.i); if(P.every(z=>z.in)) finish(); } };
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
  const P=q.parts.map((t,i)=>{ const im=el('img','qxfp'); im.alt=''; im.draggable=false; im.src=R_Q(t.pic); bd.append(im); return {e:im,t,i,x:0,y:0,tx:0,ty:0,w:0,h:0,in:false}; });
  let done=false, fx=0,fy=0,fw=0,fh=0; const put=p=>{ p.e.style.transform=`translate(${p.x}px,${p.y}px)`; };
  const say=p=>p.t.audio?qSound(R_Q(p.t.audio),p.t.word||''):null;
  const layout=()=>{ const W=bd.clientWidth,H=bd.clientHeight; if(!W||!H||!fi.naturalWidth||done) return;
    const ar=fi.naturalWidth/fi.naturalHeight; fh=H*.96; fw=fh*ar; if(fw>W*.62){ fw=W*.62; fh=fw/ar; } fx=W*.01; fy=(H-fh)/2;
    Object.assign(fi.style,{left:fx+'px',top:fy+'px',width:fw+'px',height:fh+'px'});
    const trX=fx+fw+W*.03, trW=Math.max(20,W-trX), n=P.length;
    P.forEach((p,k)=>{ const nw=p.e.naturalWidth||1, nh=p.e.naturalHeight||1; p.w=p.t.w/100*fw; p.h=p.w*nh/nw; p.e.style.width=p.w+'px'; p.e.style.height=p.h+'px';
      p.tx=fx+p.t.x/100*fw-p.w/2; p.ty=fy+p.t.y/100*fh-p.h/2;
      if(p.in){ p.x=p.tx; p.y=p.ty; } else { const order=(k%2)?n-1-(k>>1):(k>>1); p.x=trX+(trW-p.w)*((k%2)?.8:.2); p.y=fy+(fh-p.h)*(n>1?order/(n-1):.5); } put(p); }); };
  async function finish(){ if(done) return; done=true; q.solved=true; await new Promise(r=>setTimeout(r,350)); if(run!==qz.run||!inQ()) return; qStar(); }
  P.forEach(p=>{ let sx,sy,x0,y0,moved=false,on=false;
    p.e.addEventListener('pointerdown',ev=>{ if(done||p.in) return; ev.preventDefault(); ev.stopPropagation(); p.e.setPointerCapture(ev.pointerId); sx=ev.clientX; sy=ev.clientY; x0=p.x; y0=p.y; moved=false; on=true; p.e.classList.add('drag'); });
    p.e.addEventListener('pointermove',ev=>{ if(!on) return; const dx=ev.clientX-sx,dy=ev.clientY-sy; if(!moved&&Math.hypot(dx,dy)<6) return; moved=true; p.x=Math.min(Math.max(0,x0+dx),bd.clientWidth-p.w); p.y=Math.min(Math.max(0,y0+dy),bd.clientHeight-p.h); put(p); });
    const up=ev=>{ ev.stopPropagation(); p.e.classList.remove('drag'); if(!on) return; on=false; if(!moved){ say(p); return; }
      if(Math.hypot(p.x-p.tx,p.y-p.ty)<Math.max(p.w,p.h)*.6){ p.in=true; p.x=p.tx; p.y=p.ty; p.e.classList.add('in'); put(p); say(p); if(P.every(z=>z.in)) finish(); } };
    p.e.addEventListener('pointerup',up); p.e.addEventListener('pointercancel',up); });
  box._after=()=>layout(); fi.addEventListener('load',layout); P.forEach(p=>p.e.addEventListener('load',layout)); requestAnimationFrame(layout); new ResizeObserver(layout).observe(bd);
}
QM.face={sheet:'box', noword:1, bulb:0, draw:qxFace};
function qxColour(box,q,s,run){
  const bd=el('div','qxcb'); bd.dataset.noswipe=1; box.append(bd);
  const nb=el('button','qxcn'); nb.type='button'; nb.textContent=q.num; nb.onclick=()=>{ if(q.audio) qSound(R_Q(q.audio),q.word||''); }; bd.append(nb);
  const row=el('div','qxcr'); bd.append(row); let on=0, done=false;
  const cells=[]; for(let i=0;i<q.total;i++){ const im=el('img','qxcs'); im.alt=''; im.draggable=false; im.src=R_Q(q.off); im.dataset.on=0; row.append(im); cells.push(im); }
  const cnt=()=>cells.filter(c=>c.dataset.on==='1').length;
  async function finish(){ if(done) return; done=true; q.solved=true; await new Promise(r=>setTimeout(r,450)); if(run!==qz.run||!inQ()) return; qStar(); }
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

/* RULE: while the phone keyboard is open, the word being written (the line with its chips) is lifted above the keyboard, into the empty space above it */
function qxKeep(){ const bx=$('.qx-write'), line=bx&&$('.qxline',bx), vv=window.visualViewport; if(!bx||!line||!vv) return;
  bx.style.translate=''; const open=document.activeElement&&document.activeElement.id==='qxin'&&innerHeight-vv.height>120;
  if(!open) return;
  const r=line.getBoundingClientRect(), b=bx.getBoundingClientRect(), pad=Math.max(110,vv.height*.14), over=r.bottom+pad-(vv.offsetTop+vv.height);
  const room=Math.max(0,b.top-(vv.offsetTop+Math.min(150,vv.height*.2)));   // never up into the title
  if(over>0) bx.style.translate='0 '+(-Math.min(over,room))+'px'; }
if(window.visualViewport){ ['resize','scroll'].forEach(e=>visualViewport.addEventListener(e,()=>{ if(inQ()) qxKeep(); })); }
document.addEventListener('focusin',e=>{ if(e.target&&e.target.id==='qxin') [50,300,600].forEach(t=>setTimeout(qxKeep,t)); });
document.addEventListener('focusout',e=>{ if(e.target&&e.target.id==='qxin'){ const bx=$('.qx-write'); if(bx) bx.style.translate=''; } });
