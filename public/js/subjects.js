/* SUBJECTS screen — the cardboard boxes. */
/* ---------- Subjects ---------- */
let wig=null;
function drawSubjects(){
  const g=$('#boxes'); g.innerHTML='';
  COURSE.subjects.forEach(s=>{
    const b=el('button','box '+(s.open?'open':'locked'));
    const tag = s.open ? `${STAR(true)}${s.lessons?s.lessons.reduce((a,l)=>a+lessonStars(l.id),0):0}` : `${ICON.lock}Soon`;
    b.innerHTML=`<span class="cube">${BOX(s)}</span><span class="name outline${s.rtl?' ar':''}">${s.name}</span><span class="tag">${tag}</span>`;
    b.setAttribute('aria-label', s.open?s.name:s.name+', coming soon');
    b.addEventListener('click',()=>{ if(s.open){ SUBJECT=s; openMap(); }
      else message('Soon!', s.rtl?'مادة العربي قريباً!':COURSE.hints.soonSubject, `<span class="cube" style="display:block">${BOX(s)}</span>`); });
    g.append(b);
  });
  if(anim){ if(wig) wig.kill(); const cubes=$$('.box.open .cube',g);
    // every open box wiggles in turn, then it starts again from the first
    wig=G.timeline({repeat:-1,repeatDelay:1.2,delay:1.4}); cubes.forEach(o=>wig.to(o,{rotation:-4,y:-6,duration:.12}).to(o,{rotation:4,duration:.1,repeat:3,yoyo:true}).to(o,{rotation:0,y:0,duration:.15}).to({},{duration:.5}));
    $$('.peek',g).forEach(p=>G.to(p,{x:4,duration:.9,yoyo:true,repeat:-1,ease:'sine.inOut'})); }
}
function openSubjects(){ stopAll(); vStop(); clearMarks(); show('subjects'); drawSubjects(); pop('.box'); showHint($('.box.open'),COURSE.hints.subjects,1300,'subjects'); }
