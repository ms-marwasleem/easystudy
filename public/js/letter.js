/* LETTER lesson tab (lesson.json "type": "letter", "pages": 2) — ONLY these two pages (no syllable merging here), with the page arrows:
   1 where the letter sits in a word (start / middle / end joined / end alone), 2 its sound with each haraka.
   lesson.json "letter": { ch, name, nameAudio, pic, tasks[2], forms:[{label,t,pos}], sounds:[{label,t,har,audio,pic}] }
   pos = start|mid|end-joined|end-alone, har = fatha|damma|kasra|sukoon (spoken names in data/arabic/shared/, the same for every letter).
   Tapping a card says: the letter's name + the place ("ألف في أول الكلمة"), or the letter's name + the haraka + its sound ("ألف فتحة آ").
   A page is done when every card was heard (both pages = the lesson star). Reuses the reading pager (readPager) and the book-page tag. */
function fixLetterPaths(Lt,R){
  Lt.pic=R(Lt.pic); Lt.nameAudio=R(Lt.nameAudio);
  (Lt.sounds||[]).forEach(s=>{ s.audio=R(s.audio); s.pic=R(s.pic); s.say=[s.audio]; });
  (Lt.forms||[]).forEach(f=>{ f.say=[Lt.nameAudio,R('../shared/p-'+f.pos+'.mp3')]; });
}
const lt={run:0,heard:{}};
const lHeard=()=>lt.heard[LESSON.id]=lt.heard[LESSON.id]||{};
const lCount=p=>{ const Lt=LESSON.letter; return p===1?Lt.forms.length:Lt.sounds.length; };
function lMark(p,k,card){
  const h=lHeard(); h[p+':'+k]=1; if(card) card.classList.add('heard');
  let n=0,all=0; for(let q=1;q<=2;q++){ all+=lCount(q); for(let i=0;i<lCount(q);i++) if(h[q+':'+i]) n++; }
  carFrac(n/all);
  if([...Array(lCount(p)).keys()].every(i=>h[p+':'+i])){ rd.done[p]=1; if(Object.keys(rd.done).length>=2) award(LESSON.id,'read'); }
}
// url = one file or a list said one after the other
const lPlay=async(url,btn)=>{ vStop(); const run=++lt.run; if(btn){ btn.classList.add('on'); }
  for(const u of [].concat(url||[])){ if(run!==lt.run) break; try{ await playFile(u); }catch(e){} if(run===lt.run&&u!==[].concat(url).slice(-1)[0]) await new Promise(r=>setTimeout(r,120)); }
  if(btn&&run===lt.run) btn.classList.remove('on'); };
function showLetter(){
  const Lt=LESSON.letter, pg=rd.page, h=lHeard();
  stage.innerHTML=''; rd.words=[]; rd.lineEls=[]; rd.spotEls=[]; lt.run++;
  const scene=el('div','scene pics letter p'+pg), grid=el('div','lgrid p'+pg);
  scene.append(el('p','task',STAR(true)+Lt.tasks[pg-1]),grid);
  const card=(cls,k,html,fn)=>{ const b=el('button','lcard '+cls+(h[pg+':'+k]?' heard':''),html+`<span class="lst">${STAR(true)}</span>`); b.addEventListener('click',()=>fn(b)); grid.append(b); return b; };
  if(pg===1){
    const say=el('button','lspk',SAY_LN); say.setAttribute('aria-label','Listen'); say.onclick=()=>lPlay(Lt.nameAudio,say);
    grid.append(el('div','lhead',`<img src="${Lt.pic}" alt="">`)); $('.lhead',grid).append(say,el('b','lbig',Lt.ch));
    Lt.forms.forEach((f,k)=>card('form',k,`<span class="lglyph">${f.t}</span><span class="llab">${f.label}</span>`,async b=>{ lMark(1,k,b); await lPlay(f.say,b); }));
  } else {
    Lt.sounds.forEach((s,k)=>card('snd',k,`<img src="${s.pic}" alt="">${s.t?`<span class="lglyph">${s.t}</span>`:''}<span class="llab">${s.label}</span>`,async b=>{ lMark(2,k,b); await lPlay(s.say,b); }));
  }
  readPager(scene); stage.append(scene);
  setRail([{kind:'go',icon:'play',label:tr('Listen'),click:lAll}]);
  if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
  if(lt.auto){ lt.auto=0; setTimeout(()=>{ if(tab==='read') lAll(); },500); }
}
// the rail button: every card of the page in turn
async function lAll(){ const cards=$$('.lgrid .lcard'); vStop(); lt.auto=0; const run=++lt.run; for(const c of cards){ if(run!==lt.run) return; c.click(); await new Promise(r=>setTimeout(r,4200)); if(run!==lt.run) return; }
  if(run===lt.run&&tab==='read'&&rd.page<nPages()){ lt.auto=1; readGo(1); } }   // the Listen button reads the whole lesson: on to the next page
