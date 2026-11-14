/* LETTER lesson tab (lesson.json "type": "letter", "pages": 2) — ONLY these two pages (no syllable merging here), with the page arrows:
   1 where the letter sits in a word (start / middle / end joined / end alone), 2 its sound with each haraka.
   lesson.json "letter": { ch, name, nameAudio, pic, tasks[2], forms:[{label,t,pos}], sounds:[{label,t,har,audio,pic}] }
   pos = start|mid|end-joined|end-alone, har = fatha|damma|kasra|sukoon (spoken names in data/arabic/shared/, the same for every letter).
   Tapping a card says: the letter's name + the place ("ألف في أول الكلمة"), or the letter's name + the haraka + its sound ("ألف فتحة آ").
   A page is done when every card was heard (both pages = the lesson star). Reuses the reading pager (readPager) and the book-page tag. */
function fixLetterPaths(Lt,R){
  Lt.pic=R(Lt.pic); Lt.nameAudio=R(Lt.nameAudio);
  // spoken: the letter's name, then the haraka's name, then the letter with that haraka (Marwa 2026-11-08); forms: name + place. Cards run from the RIGHT: fatha, damma, kasra, sukoon / start, mid, end-joined, end-alone
  const HO=['fatha','damma','kasra','sukoon'], PO=['start','mid','end-joined','end-alone'];
  (Lt.sounds||[]).forEach(s=>{ s.audio=R(s.audio); s.pic=R(s.pic); s.say=s.har?[Lt.nameAudio,R('../shared/k-h-'+s.har+'.mp3'),s.audio]:[s.audio]; });
  (Lt.forms||[]).forEach(f=>{ f.say=f.pos?[Lt.nameAudio,R('../shared/k-p-'+f.pos+'.mp3')]:[Lt.nameAudio]; });
  if((Lt.sounds||[]).every(s=>s.har)) Lt.sounds.sort((a,b)=>HO.indexOf(a.har)-HO.indexOf(b.har));
  if((Lt.forms||[]).length&&Lt.forms.every(f=>f.pos)) Lt.forms.sort((a,b)=>PO.indexOf(a.pos)-PO.indexOf(b.pos));
  if(Lt.chant){ Lt.chant.pic=R(Lt.chant.pic); Lt.chant.lines.forEach(l=>l.audio=R(l.audio)); }
}
const lt={run:0,heard:{}};
const lOff=()=>LESSON.letter&&LESSON.letter.chant?1:0;   // with a chant the FIRST page is "نشيد الحرف" (showChant); the two letter pages follow
const lHeard=()=>lt.heard[LESSON.id]=lt.heard[LESSON.id]||{};
const lCount=p=>{ const Lt=LESSON.letter; return p===1?Lt.forms.length:Lt.sounds.length; };
function lMark(p,k,card){
  const h=lHeard(); h[p+':'+k]=1; if(card) card.classList.add('heard');
  let n=0,all=0; for(let q=1;q<=2;q++){ all+=lCount(q); for(let i=0;i<lCount(q);i++) if(h[q+':'+i]) n++; }
  carFrac(n/all);
  if([...Array(lCount(p)).keys()].every(i=>h[p+':'+i])){ rd.done[p]=1; if(Object.keys(rd.done).length>=nPages()) award(LESSON.id,'read'); }
}
// url = one file or a list said one after the other
const lPlay=async(url,btn)=>{ vStop(); const run=++lt.run, vr=vs.run; if(btn){ btn.classList.add('on'); }   // vr: any other stop of the sound (another tab, the map) ends the list too
  for(const u of [].concat(url||[])){ if(run!==lt.run||vr!==vs.run) break; try{ await playFile(u); }catch(e){} if(run===lt.run&&vr===vs.run&&u!==[].concat(url).slice(-1)[0]) await new Promise(r=>setTimeout(r,120)); }
  if(btn) btn.classList.remove('on'); };   // (a card whose sound was cut by another card or a tab must not stay lit)
function showLetter(){
  const Lt=LESSON.letter, pg=rd.page-lOff(), h=lHeard();
  if(pg<1) return showChant();
  stage.innerHTML=''; rd.words=[]; rd.lineEls=[]; rd.spotEls=[]; lt.run++;
  const scene=el('div','scene pics letter p'+pg), grid=el('div','lgrid p'+pg); grid.dir='rtl';
  scene.append(el('p','task',STAR(true)+Lt.tasks[pg-1]),grid);
  const card=(cls,k,html,fn)=>{ const b=el('button','lcard '+cls+(h[pg+':'+k]?' heard':''),html+`<span class="lst">${STAR(true)}</span>`); b.addEventListener('click',()=>fn(b)); b._play=()=>fn(b); grid.append(b); return b; };
  if(pg===1){
    const say=el('button','lspk',SAY_LN); say.setAttribute('aria-label','Listen'); say.onclick=()=>lPlay(Lt.nameAudio,say);
    grid.append(el('div','lhead',`<img src="${Lt.pic}" alt="">`)); $('.lhead',grid).append(say,el('b','lbig',Lt.ch)); $('.lhead',grid).style.direction='ltr';
    Lt.forms.forEach((f,k)=>card('form',k,`<span class="lglyph">${f.t}</span>${f.label?`<span class="llab">${f.label}</span>`:''}`,async b=>{ lMark(1,k,b); await lPlay(f.say,b); }));
  } else {
    Lt.sounds.forEach((s,k)=>card('snd',k,`<img src="${s.pic}" alt="">${s.t?`<span class="lglyph">${s.t}</span>`:''}<span class="llab">${s.label}</span>`,async b=>{ lMark(2,k,b); await lPlay(s.say,b); }));
  }
  readPager(scene); stage.append(scene);
  setRail([{kind:'go',icon:'play',label:tr('Listen'),click:lAll}]);
  if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
  letterAuto();   // every page plays by itself, card after card (Ahmed 2026-11-13)
}
// automatic start of a page: only if nothing else started meanwhile (a tap, another page, the map): lt.run / rd.autoGen say so
function letterAuto(fn){ const r=lt.run, g=rd.autoGen=(rd.autoGen||0)+1, id=LESSON.id, pg=rd.page; fn=fn||lAll;
  whenSound(()=>setTimeout(()=>{ if(!LESSON||LESSON.id!==id||tab!=='read'||rd.page!==pg||lt.run!==r||rd.autoGen!==g||$('#lesson').hidden) return; fn(); },500)); }
// the rail button: every card of the page in turn
async function lAll(){ const cards=$$('.lgrid .lcard'); vStop(); let run=++lt.run, vr=vs.run; const dead=()=>run!==lt.run||vr!==vs.run||tab!=='read';
  for(const c of cards){ if(dead()) return; const r0=lt.run, v0=vs.run; await c._play(); if(lt.run===r0+1&&vs.run===v0+1){ run=lt.run; vr=vs.run; } if(dead()) return;   /* a card's own play = lPlay: it starts with vStop() and lt.run++ (exactly +1 each): take those over, or the list stopped after the first card; any other change (a tap, a tab) still stops it (Ahmed 2026-11-13) */ await nap(450); if(dead()) return; }   // card by card: each one to its END (places of the letter / harakat), then a short pause
  if(!dead()&&rd.page<nPages()) readGo(1,true); }   // the Listen button reads the whole lesson: on to the next page, which reads by itself

/* CHANT page (lesson.json letter.chant = {pic, task, lines:[{t, audio}]}): the book's picture + the chant lines written big; the rail = the listening controls
   (Read / Stop (pause) / Continue, Restart, Slow / Normal). The audio is the library's recording of each line (an empty requested slot stays silent: the lines still light one by one). */
const ch={i:0,slow:false,on:false};
const chBuf=async url=>{ await ensureCtx(); let b=await libBuffer(url,player.ctx).catch(()=>null);
  if(!b){ if(!vs.files[url]) vs.files[url]=fetch(url).then(r=>{ if(!r.ok) throw new Error('missing'); return r.arrayBuffer(); }).then(x=>decodeSnd(player.ctx,x)).catch(()=>{ delete vs.files[url]; return null; }); b=await vs.files[url]; }
  return b; };
// the words of a chant line light one by one (the recording has no word times: spread over its length by letters) - the WORD itself, transparent background, never a box round the line (Marwa 2026-11-06, all reading in the app)
ch.T=[];
function chWordsStop(){ ch.T.forEach(clearTimeout); ch.T=[]; $$('.lchant .w.reading').forEach(x=>x.classList.remove('reading')); }
function chWords(i,dur){ const ws=$$('.lchant .cl')[i]; if(!ws) return; const w=$$('.w',ws), tot=w.reduce((a,x)=>a+x.textContent.length,0)||1; let acc=0;
  w.forEach(x=>{ const at=acc/tot*dur*1000; acc+=x.textContent.length; ch.T.push(setTimeout(()=>{ $$('.lchant .w.reading').forEach(y=>y.classList.remove('reading')); x.classList.add('reading'); },at)); }); }
const chSay=async(url,i)=>{ const b=await chBuf(url); if(!b){ chWords(i,2.6); await nap(2600); return; }
  return new Promise(res=>{ const s=player.ctx.createBufferSource(); s.buffer=b; s.playbackRate.value=ch.slow?.75:1; s.connect(player.ctx.destination); vs.src=s; s.onended=()=>{ if(vs.src===s) vs.src=null; res(); }; chWords(i,b.duration/(ch.slow?.75:1)); s.start(0); }); };
function chLit(i){ chWordsStop(); $$('.lchant .cl').forEach((e,k)=>e.classList.toggle('now',k===i)); }
async function chRun(from){ const Lt=LESSON.letter.chant; vStop(); lt.run++; const run=lt.run, vr=vs.run; ch.on=true; chRail();
  const dead=()=>run!==lt.run||vr!==vs.run||tab!=='read';
  for(let i=from;i<Lt.lines.length;i++){ ch.i=i; chLit(i); try{ await chSay(Lt.lines[i].audio,i); }catch(e){} if(dead()) return; if(i<Lt.lines.length-1) await nap(350); if(dead()) return; }
  ch.on=false; ch.i=0; chLit(-1); chRail(); rd.done[1]=1; if(Object.keys(rd.done).length>=nPages()) award(LESSON.id,'read'); carFrac(1);
  await nap(900); if(!dead()&&rd.page<nPages()) readGo(1,true); }   // then the next page (places of the letter) reads by itself
function chPause(){ vStop(); lt.run++; ch.on=false; chWordsStop(); chRail(); }
function chRail(){ if(tab!=='read'||!$('.lchant')) return; const res=!ch.on&&ch.i>0;
  setRail([ ch.on?{kind:'stop',icon:'stop',label:tr('Stop'),click:chPause}:{kind:'go',icon:'play',label:tr(res?'Continue':'Read'),click:()=>chRun(ch.i)},
    {kind:'again',icon:'restart',label:tr('Restart'),click:()=>chRun(0)},
    {kind:'speed',icon:ch.slow?'slow':'fast',label:tr(ch.slow?'Slow':'Normal'),click:()=>{ ch.slow=!ch.slow; if(ch.on) chRun(ch.i); else chRail(); }} ]); }
function showChant(){
  const C=LESSON.letter.chant; stage.innerHTML=''; lt.run++; ch.on=false; ch.i=0;
  const scene=el('div','scene pics letter chantp'), body=el('div','lchant');
  scene.append(el('p','task',STAR(true)+(C.task||'نشيد الحرف')),body);
  body.append(el('div','cpic fit-media',`<img src="${C.pic}" alt="">`)); const tx=el('div','ctx'); body.append(tx);
  C.lines.forEach((l,i)=>{ const b=el('button','cl txt'); String(l.t).split(/\s+/).filter(Boolean).forEach((w,k,a)=>{ b.append(el('span','w',w)); if(k<a.length-1) b.append(' '); }); b.addEventListener('click',()=>{ chRun(i); }); tx.append(b); });
  readPager(scene); stage.append(scene); carFrac(0); chRail(); letterAuto(()=>chRun(0));   // the nasheed of the letter plays by itself
  if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.chant||LESSON.hints&&LESSON.hints.read,1400,'read');
}
