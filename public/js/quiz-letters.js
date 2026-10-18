/* QUESTIONS tab — extra types for the Arabic LETTER lessons (called from qGo in quiz.js through QX / qxGo). All use the sheet of quiz.js (task line, stars, speaker).
   position = a picture and one empty circle per letter of its word (right to left): tap the circle where the letter is. item: {word, pic, audio, at: index of the letter}
   vowel    = a picture, its word with the first letter missing, and the letter with each haraka: tap the right one. set: "choices":["أَ","أُ","إِ","أْ"]; item: {word, pic, audio, answer: the first letter with its haraka}
   write    = the child types a word on the keyboard, each right letter fills in its place with its marks (the speaker says it, the bulb shows the next letter).
              item: {word, audio, pic?, chips?: syllables shown above (book: merge the syllables)}; set "sentence": true for a sentence
   arrange  = the letters of the word (with their marks) scrambled as tiles; drag them (or tap) in the right order to the word's blanks; the word is written joined as it fills. item: {word, pic, audio} */
// write: set "faint":true = the book's "write like the example": the text to copy shows faintly and the child types it over it
const QX={position:1,vowel:1,write:1,arrange:1,qa:1}, QXF={};   // QXF: render functions added by other files (quiz-math.js)
function qxGo(w,q,i,run){
  const s=q.set, play=$('.qplay',w), ans=$('.qans',w); play.innerHTML=''; ans.innerHTML=''; $('.qword b',w).innerHTML='';
  const box=el('div','qx qx-'+s.type+(s.sentence?' sent':'')); play.append(box);
  let sp=null; if(!q.together&&!q.hush&&(q.audio||q.word)){ sp=el('button','qsay qxsay',SAY_LN); sp.setAttribute('aria-label','Listen'); sp.onclick=()=>s.type==='qa'?qxQAPlay(q,qz.run):qSay(); }
  if(q.pic) box.append(el('div','qxpic',`<img src="${q.pic}" alt="">`));
  (q.together?qxQAAll:QXF[s.type]||{position:qxPosition,vowel:qxVowel,write:qxWrite,arrange:qxArrange,qa:qxQA}[s.type])(box,q,s,run);
  // the listen icon sits right beside the thing that is read (the word / sentence); with no word (circles, a picture) it sits on the picture's corner
  if(sp&&!q.hush){ const tg=$('.qxline',box)||$('.qxw',box)||$('.qxqa',box)||$('.qxcircles',box);
    if(tg){ const row=el('div','qxrow'); tg.before(row); row.append(sp,tg); } else { const pc=$('.qxpic',box); (pc||box).append(sp); sp.classList.add('onpic'); } }
  qLayout(); carFrac(i/qz.list.length);
  setTimeout(async()=>{ if(run!==qz.run||tab!=='quiz') return; if(q.k===0&&(i===0||qGrp(qz.list[i-1].set)!==qGrp(s))) await qTask(); if(run===qz.run&&tab==='quiz'&&!q.together&&!q.hush) s.type==='qa'?qxQAPlay(q,run):qSay(); },350);
}
const qxBad=(b)=>{ tone(170,'square',.06,.18); if(anim) G.fromTo(b,{x:-9},{x:0,duration:.5,ease:'elastic.out(1.5,.25)'}); };
// a right answer: celebrate, say the word, on to the next
async function qxWin(target,q,ms=1500){ if(qz.busy) return; qz.busy=true; const run=qz.run; vStop(); celebrate(target); qSay(); return qAdvance(run,ms); }
function qxLetters(word){ return glyphs(word); }

function qxPosition(box,q,s,run){
  const gs=qxLetters(q.word), row=el('div','qxcircles'); row.dir='rtl';
  gs.forEach((g,k)=>{ const b=el('button','qxc',`<span>${g}</span>`); b.setAttribute('aria-label','Letter '+(k+1)); b.addEventListener('click',()=>{ if(qz.busy) return;
    if(k!==q.at) return qxBad(b);
    $$('.qxc',row).forEach(x=>x.classList.add('show')); b.classList.add('right'); qxWin(b,q); }); row.append(b); });
  box.append(row);
}
function qxVowel(box,q,s,run){
  const gs=qxLetters(q.word), wd=el('b','qxw'); wd.dir='rtl'; const gap=el('span','qgap','_'); wd.append(gap,gs.slice(1).join('')); box.append(wd);
  const row=el('div','qxchoices'); row.dir='rtl';
  s.choices.forEach(c=>{ const b=el('button','rb qbtn qlet',`<span>${c}</span>`); b.setAttribute('aria-label',c);
    b.addEventListener('click',()=>{ if(qz.busy) return; if(c!==q.answer){ gap.textContent=c; gap.classList.add('bad'); clearTimeout(gap._t); gap._t=setTimeout(()=>{ gap.textContent='_'; gap.classList.remove('bad'); },650); return qxBad(b); }
      b.classList.add('on'); gap.classList.remove('bad'); gap.textContent=gs[0]; gap.classList.add('got'); qxWin(b,q); }); row.append(b); });
  box.append(row);
}
// the word (or sentence) as hidden letters with their places underlined; spaces are not letters
function qxWordEl(word,chips,faint,ltr){ const b=el('b','qxw'); b.dir=ltr?'ltr':'rtl'; const gs=glyphs(word);
  const cnt=(chips||[]).map(c=>glyphs(c).length), ok=cnt.length>1&&cnt.reduce((a,c)=>a+c,0)===gs.length;   // a box per syllable when the chips match the word
  if(ok){ let k=0; cnt.forEach(n=>{ const sg=el('span','qxseg'); gs.slice(k,k+n).forEach(g=>sg.append(el('span','lt hid'+(faint?' fnt':''),g))); k+=n; b.append(sg); }); }
  else gs.forEach(g=>b.append(el('span',g===' '?'sp':'lt hid'+(faint?' fnt':''),g===' '?' ':g)));
  return b; }
// Help: the next syllable (or letter) shows faintly for a moment, then is hidden again: the child writes it
function qxPeek(wd){ const n=qxNext(wd); if(!n) return; const sg=n.closest('.qxseg'), L=sg?$$('.lt.hid',sg):[n]; L.forEach(x=>x.classList.add('peek')); setTimeout(()=>L.forEach(x=>x.classList.remove('peek')),1500); }
function qxNext(wd){ return $('.lt.hid',wd); }
function qxReveal(wd){ const n=qxNext(wd); if(!n) return false; n.classList.remove('hid'); n.classList.add('got'); return true; }
const qxDone=wd=>!qxNext(wd);
function qxWrite(box,q,s,run,text,onDone){   // text: what to type (default the question's word); onDone: called instead of the win (math: number, then its word)
  text=text||q.word; $$('.qxhelp',box).forEach(x=>x.remove());
  if(q.chips&&text===q.word){ const c=el('div','qxchips'); c.dir='rtl'; c.innerHTML=q.chips.map(t=>`<i>${t}</i>`).join('<u>/</u>'); box.append(c); }
  const wd=qxWordEl(text,text===q.word?q.chips:null,s.faint,s.lang==='en'||/^[\x00-\x7f]+$/.test(text)), help=el('button','qxhelp',ICON.hint); help.setAttribute('aria-label','Help');
  const line=el('div','qxline'); line.append(wd); const duo=$('.qxduo',box); (duo||box).append(line); box.append(help);   // duo: number and its word side by side
  let inp=$('#qxin');
  if(!inp){ inp=el('input','qin'); Object.assign(inp,{type:'text',id:'qxin',autocomplete:'off',spellcheck:false,lang:s.lang||'ar'}); ['autocorrect','autocapitalize'].forEach(a=>inp.setAttribute(a,'off')); inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Type the word'); }
  line.append(inp); if(/^\d+$/.test(text)){ inp.setAttribute('inputmode','numeric'); inp.lang='en'; } else inp.removeAttribute('inputmode');
  const cur=()=>{ $$('.lt',wd).forEach(x=>x.classList.remove('cur')); const n=qxNext(wd); if(n) n.classList.add('cur'); }; cur();
  const type=ch=>{ if(qz.busy||qz.list[qz.i]!==q||!ch||/\s/.test(ch)) return; const n=qxNext(wd); if(!n) return;
    if(sameLetter(ch,n.textContent)){ qxReveal(wd); blip(560+$$('.lt.got',wd).length*40,.05); cur(); if(qxDone(wd)){ if(onDone) onDone(wd); else qxWin(wd,q,1700); } }
    else { n.classList.add('bad'); setTimeout(()=>n.classList.remove('bad'),500); qxBad(line); } };
  inp.oninput=()=>{ const ch=inp.value.replace(/\s/g,'').slice(-1); inp.value=''; type(ch); };
  inp.onfocus=()=>line.classList.add('focus'); inp.onblur=()=>line.classList.remove('focus');
  line.onclick=()=>inp.focus({preventScroll:true});
  help.onpointerdown=e=>{ if(document.activeElement===inp) e.preventDefault(); };
  help.onclick=()=>{ if(qz.busy) return; qxPeek(wd); inp.focus({preventScroll:true}); };
  inp.focus({preventScroll:true}); showHint(line,s.lang==='en'||/^[\x00-\x7f]+$/.test(text)?'Type here':'اكتب هنا',500,'qxwrite');
}
function qxArrange(box,q,s,run){
  const wd=qxWordEl(q.word), line=el('div','qxline'); line.append(wd); box.append(line);
  const gs=qxLetters(q.word).filter(g=>g!==' '); let ord=gs.map((g,k)=>k); for(let t=0;t<30;t++){ ord.sort(()=>Math.random()-.5); if(gs.length<2||ord.some((v,k)=>v!==k)) break; }
  const tiles=el('div','qxtiles'); tiles.dir='rtl'; box.append(tiles);
  const place=tile=>{ const n=qxNext(wd); if(!n||tile.classList.contains('used')) return false;
    if(!sameLetter(tile.dataset.g,n.textContent)) return false;
    qxReveal(wd); tile.classList.add('used'); blip(560+$$('.lt.got',wd).length*40,.05);
    if(qxDone(wd)) qxWin(wd,q,1700); return true; };
  ord.forEach(k=>{ const t=el('button','qxtile',`<span>${gs[k]}</span>`); t.dataset.g=gs[k]; tiles.append(t); });
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

// qa = book "question and answer": the picture, the question (red) and its answer (blue); nothing to choose. Both are read aloud, question first, then it goes on.
// item: {ask, word: the answer sentence, audio: question sound, ansAudio: answer sound, pic}. Tap the question or the answer to hear just that one, the speaker for both.
function qxQA(box,q,s,run){
  const t=el('div','qxqa'); t.dir='rtl';
  const a=el('button','qxqq',q.ask), b=el('button','qxqa-a',q.word);
  a.onclick=()=>{ if(!qz.busy) qxQALine(a,q.audio,q.ask); }; b.onclick=()=>{ if(!qz.busy) qxQALine(b,R_Q(q.ansAudio),q.word); };
  t.append(a,b); box.append(t);
}
async function qxQALine(btn,src,text){ btn.classList.add('lit'); await qSound(src,text); btn.classList.remove('lit'); }
async function qxQAPlay(q,run){
  if(qz.busy) return; qz.busy=true; const [a,b]=[$('.qxqq'),$('.qxqa-a')];
  await qxQALine(a,q.audio,q.ask); if(run!==qz.run||tab!=='quiz') return;
  await new Promise(r=>setTimeout(r,350)); if(run!==qz.run||tab!=='quiz') return;
  await qxQALine(b,R_Q(q.ansAudio),q.word); if(run!==qz.run||tab!=='quiz') return;
  return qAdvance(run,900);
}

// qa "together": every question (red) and its answer (blue) of the exercise on ONE page, a small listen icon beside each pair,
// and two buttons: listen to all in turn / stop. Done when every pair was heard.
function qxQAAll(box,q,s,run){
  const wrap=el('div','qaall'); box.classList.add('qa-together'); const heard={}; let tok=0;
  const rows=q.items.map((it,i)=>{ const r=el('div','qarow'); r.dir='rtl';
    const mk=(cls,txt,src)=>{ const ln=el('div','qaline'), b=el('button',cls,txt), sp=el('button','qsay qarsay',SAY_LN); sp.setAttribute('aria-label','Listen'); ln.append(b,sp); return {ln,b,sp,src,txt}; };
    const a=mk('qxqq',it.ask,it.audio), b=mk('qxqa-a',it.word,R_Q(it.ansAudio)), t=el('div','qartxt'); t.append(a.ln,b.ln);
    if(it.pic) r.append(el('div','qarpic',`<img src="${it.pic}" alt="">`));
    r.append(t); wrap.append(r); return {r,a,b}; });
  const mark=(i,k)=>{ heard[i+k]=1; if(Object.keys(heard).length===rows.length*2&&!qz.busy&&qz.list[qz.i]===q){ qz.busy=true; qAdvance(run,1200); } };
  const clear=()=>rows.forEach(y=>y.r.classList.remove('on'));
  const one=async(i,k,t)=>{ const x=rows[i], l=k==='a'?x.a:x.b; x.r.classList.add('on'); await qxQALine(l.b,l.src,l.txt); x.r.classList.remove('on'); if(t===tok) mark(i,k); return t===tok; };
  rows.forEach((x,i)=>{ [['a',x.a],['b',x.b]].forEach(([k,l])=>{ const go=()=>{ if(qz.list[qz.i]!==q) return; clear(); one(i,k,++tok); }; l.sp.onclick=go; l.b.onclick=go; }); });
  const bar=el('div','qabar'), all=el('button','qabtn go',ICON.play+'<span>'+tr('Listen')+'</span>'), stop=el('button','qabtn stop',ICON.pause+'<span>'+tr('Stop')+'</span>');
  all.onclick=async()=>{ const t=++tok; clear(); for(let i=0;i<rows.length;i++){ for(const k of ['a','b']){ if(t!==tok||qz.list[qz.i]!==q) return; if(!(await one(i,k,t))) return; await new Promise(r=>setTimeout(r,k==='a'?300:500)); } } };
  stop.onclick=()=>{ ++tok; vStop(); clear(); $$('.qxqq,.qxqa-a',wrap).forEach(y=>y.classList.remove('lit')); };
  bar.append(all,stop); box.append(bar,wrap);
}
