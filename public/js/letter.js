/* LETTER lesson tab (lesson.json "type": "letter", "pages": 3) — the book's letter lesson as three pages with the page arrows:
   1 the shapes of the letter (start / middle / end joined / end alone), 2 its sound with each haraka, 3 merging syllables into a word.
   lesson.json "letter": { ch, name, nameAudio, pic, tasks[3], forms:[{label,t}], sounds:[{label,t,audio,pic}], merge:[{word,pic,audio,parts:[{t,audio}]}] }
   Tapping a card says it; a page is done when every card was heard (all three pages = the lesson star). Reuses the reading pager (readPager) and the book-page tag. */
function fixLetterPaths(Lt,R){
  Lt.pic=R(Lt.pic); Lt.nameAudio=R(Lt.nameAudio);
  (Lt.sounds||[]).forEach(s=>{ s.audio=R(s.audio); s.pic=R(s.pic); });
  (Lt.merge||[]).forEach(m=>{ m.pic=R(m.pic); m.audio=R(m.audio); m.parts.forEach(p=>{ p.audio=R(p.audio); }); });
}
const lt={run:0,heard:{}};
const lHeard=()=>lt.heard[LESSON.id]=lt.heard[LESSON.id]||{};
const lCount=p=>{ const Lt=LESSON.letter; return p===1?Lt.forms.length:p===2?Lt.sounds.length:Lt.merge.length; };
function lMark(p,k,card){
  const h=lHeard(); h[p+':'+k]=1; if(card) card.classList.add('heard');
  let n=0,all=0; for(let q=1;q<=3;q++){ all+=lCount(q); for(let i=0;i<lCount(q);i++) if(h[q+':'+i]) n++; }
  carFrac(n/all);
  if([...Array(lCount(p)).keys()].every(i=>h[p+':'+i])){ rd.done[p]=1; if(Object.keys(rd.done).length>=3) award(LESSON.id,'read'); }
}
const lPlay=async(url,btn)=>{ vStop(); const run=++lt.run; if(btn){ btn.classList.add('on'); }
  try{ await (url?playFile(url):Promise.resolve()); }catch(e){} if(btn&&run===lt.run) btn.classList.remove('on'); };
function showLetter(){
  const Lt=LESSON.letter, pg=rd.page, h=lHeard();
  stage.innerHTML=''; rd.words=[]; rd.lineEls=[]; rd.spotEls=[]; lt.run++;
  const scene=el('div','scene pics letter p'+pg), grid=el('div','lgrid p'+pg); grid.dir='rtl';
  scene.append(el('p','task',STAR(true)+Lt.tasks[pg-1]),grid);
  const card=(cls,k,html,fn)=>{ const b=el('button','lcard '+cls+(h[pg+':'+k]?' heard':''),html+`<span class="lst">${STAR(true)}</span>`); b.addEventListener('click',()=>fn(b)); grid.append(b); return b; };
  if(pg===1){
    grid.append(el('div','lhead',`<img src="${Lt.pic}" alt=""><b class="lbig">${Lt.ch}</b>`));
    Lt.forms.forEach((f,k)=>card('form',k,`<span class="lglyph">${f.t}</span><span class="llab">${f.label}</span>`,async b=>{ lMark(1,k,b); await lPlay(Lt.nameAudio,b); }));
  } else if(pg===2){
    Lt.sounds.forEach((s,k)=>card('snd',k,`<img src="${s.pic}" alt=""><span class="lglyph">${s.t}</span><span class="llab">${s.label}</span>`,async b=>{ lMark(2,k,b); await lPlay(s.audio,b); }));
  } else {
    Lt.merge.forEach((m,k)=>{
      const b=card('mrg',k,`<span class="lpic"><img src="${m.pic}" alt=""></span><span class="lchips">${m.parts.map((p,i)=>`<i class="lchip" data-i="${i}">${p.t}</i>`).join('<u>+</u>')}</span><span class="lmerged">${m.word}</span><i class="lgo">${ICON.play}</i>`,()=>{});
      const word=$('.lmerged',b), chips=$$('.lchip',b);
      chips.forEach((c,i)=>c.addEventListener('click',async e=>{ e.stopPropagation(); await lPlay(m.parts[i].audio,c); }));
      $('.lpic',b).addEventListener('click',e=>{ e.stopPropagation(); word.classList.add('show'); lPlay(m.audio,word); });
      b.onclick=async e=>{ if(e.target.closest('.lchip,.lpic')) return; vStop(); const run=++lt.run; word.classList.remove('show');
        for(let i=0;i<chips.length;i++){ if(run!==lt.run) return; chips[i].classList.add('on'); try{ await playFile(m.parts[i].audio); }catch(_){} chips[i].classList.remove('on'); await new Promise(r=>setTimeout(r,120)); }
        if(run!==lt.run) return; word.classList.add('show'); lMark(3,k,b); try{ await playFile(m.audio); }catch(_){} };
    });
  }
  readPager(scene); stage.append(scene);
  setRail([{kind:'go',icon:'play',label:tr('Listen'),click:lAll}]);
  if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
// the rail button: every card of the page in turn
async function lAll(){ const cards=$$('.lgrid .lcard'); vStop(); const run=++lt.run; for(const c of cards){ if(run!==lt.run) return; c.click(); await new Promise(r=>setTimeout(r,c.classList.contains('mrg')?4200:1600)); if(run!==lt.run) return; } }
