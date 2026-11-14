/* SUBJECTS screen — the cardboard boxes. */
/* ---------- Subjects ---------- */
let wig=null;
function drawSubjects(){
  const g=$('#boxes'); g.innerHTML=''; g.classList.toggle('n3',COURSE.subjects.length<=3);   // 3 books (عام / تجريبي): one column in portrait, one row in landscape
  COURSE.subjects.forEach(s0=>{
    const ac=accessOf(s0,!!s0.open,'s:'+s0.id), st=ac.st, s=Object.assign({},s0,{_st:st});
    const b=el('button','box '+st);
    const tag = st==='open' ? `${STAR(true)}${s.lessons?s.lessons.reduce((a,l)=>a+lessonStars(l.id),0):0}` : st==='locked' ? `${ICON.lock}${COINTXT(ac.coins)}` : '';
    b.innerHTML=`<span class="cube">${BOX(s)}</span>${tag?`<span class="tag">${tag}</span>`:''}`;
    b.setAttribute('aria-label', st==='open'?s.name:s.name+(st==='locked'?', locked':', coming soon'));
    b.addEventListener('click',()=>{ if(st==='open'){ SUBJECT=s0; needRest(()=>openMap()); }
      else if(st==='locked') message(isAr()?'مقفول':'Locked', ac.coins?(isAr()?`تفتحيه بـ ${COINTXT(ac.coins)}`:`Open it with ${COINTXT(ac.coins)}!`):(isAr()?'ده هيتفتح قريبًا':'This opens later!'), `<span class="cube" style="display:block">${BOX(s)}</span>`);
      else message('Soon!', s.rtl?'مادة العربي قريباً!':COURSE.hints.soonSubject, `<span class="cube" style="display:block">${BOX(s)}</span>`); });
    g.append(b);
  });
  if(anim){ if(wig) wig.kill(); const cubes=$$('.box.open .cube',g);
    // every open box wiggles in turn, then it starts again from the first
    wig=G.timeline({repeat:-1,repeatDelay:1.2,delay:1.4}); cubes.forEach(o=>wig.to(o,{rotation:-4,y:-6,duration:.12}).to(o,{rotation:4,duration:.1,repeat:3,yoyo:true}).to(o,{rotation:0,y:0,duration:.15}).to({},{duration:.5}));
    $$('.peek',g).forEach(p=>G.to(p,{x:4,duration:.9,yoyo:true,repeat:-1,ease:'sine.inOut'})); }
}
function openSubjects(){ stopVoice(); if(restOk){ stopAll(); vStop(); clearMarks(); } show('subjects'); kidPaint(); drawSubjects(); pop('.box'); showHint($('.box.open'),COURSE.hints.subjects,1300,'subjects'); }
