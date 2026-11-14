/* EASY WORDS — the ONE stars popup, shown when the words tab or a practice round ends (same popup, same component).
   A ribbon title (well done), two stars (words, practice) of this lesson, a ruler of all the stars earned out of all the stars of the curriculum
   (words + practice of every lesson), and the buttons: ONE arrow (words -> practice, practice -> words), again, map. Language of the title follows the subject. */
const EW_PI={
  prev:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next:'<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  again:'<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>',
  map:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>'
};
// every lesson of the chosen curriculum, in order (all subjects): for the ruler
function ewAllLessons(){ const out=[]; ewSubjects().forEach(s=>ewUnits(s).forEach(u=>u.lessons.forEach(l=>out.push(l)))); return out; }
function ewPopup(kind,info){
  const L=LESSON, s=(L&&L.vocab&&L.vocab[0]&&ewSubjOf(L.vocab[0].lid||L.id))||SUBJECT, ar=!s||EW_SUBJ[s.id].lang==='ar', real=L&&!L.virtual;
  const st=real&&STARS[L.id]||{}, gotW=!!st.words, gotP=!!st.practice;
  let sw=gotW, sp=gotP; if(!real){ const r=info?info.right/info.n:1; sw=r>=.5; sp=r>=.9; }
  const all=ewAllLessons(), total=all.length*2; let earned=0; all.forEach(l=>{ const x=STARS[l.id]||{}; earned+=(x.words?1:0)+(x.practice?1:0); });
  const pct=total?Math.max(4,Math.round(earned*100/total)):0;
  const T=(a,e)=>ar?a:e, o=$('#ewDone'), pop=$('.popup',o);
  const line=kind==='practice'&&info?T(`جاوبت ${ewN(info.right)} من ${ewN(info.n)} صح من أول مرة`,`${info.right} of ${info.n} right the first time`):'';
  pop.dir=ar?'rtl':'ltr';
  pop.innerHTML=`<div class="ew-ribbon"><span>${T('أحسنت','Well done')}</span></div>
    <div class="ew-pstars"><div class="ew-ps${sw?' on':''}"><i>${STAR(sw)}</i><small>${T('كلمات','Words')}</small></div><div class="ew-ps${sp?' on':''}"><i>${STAR(sp)}</i><small>${T('تدريبات','Practice')}</small></div></div>
    ${line?`<p class="ew-ptxt">${line}</p>`:''}
    <div class="ew-bar" dir="ltr"><div class="ew-fill" style="width:${pct}%"></div><b>${real?`${earned}/${total}`:''}</b><span class="ew-bstar">${STAR(true)}</span></div>
    <div class="ew-pbtns" dir="ltr">
      <button class="ew-pb nav" aria-label="${kind==='words'?T('التدريبات','Practice'):T('الكلمات','Words')}">${(kind==='words')!==ar?EW_PI.next:EW_PI.prev}</button>
      <button class="ew-pb again" aria-label="${T('تاني','Again')}">${EW_PI.again}</button>
      <button class="ew-pb map" aria-label="${T('الدروس','Lessons')}">${EW_PI.map}</button>
    </div>`;
  const close=()=>{ o.hidden=true; };
  $('.again',pop).onclick=()=>{ close(); if(kind==='words'){ vs.i=0; vTeach(); } else epStart(); };
  $('.map',pop).onclick=()=>{ close(); epHelpBtn&&epHelpBtn(null); openMap(); };
  // ONE arrow: in the words it goes on to the practice, in the practice it goes back to the words
  $('.nav',pop).onclick=()=>{ close(); epHelpBtn&&epHelpBtn(null); switchTab(kind==='words'?'practice':'words'); };
  o.hidden=false; spinRays(o); chime(2); confetti(110);
  if(anim){ G.from('.ew-ribbon',{scale:0,duration:.5,ease:'back.out(2.4)'}); G.from('.ew-ps i',{scale:0,rotation:-120,duration:.45,stagger:.18,delay:.2,ease:'back.out(2)'});
    G.from('.ew-fill',{width:0,duration:.8,delay:.5,ease:'power2.out'}); G.from('.ew-pbtns .ew-pb',{scale:0,duration:.3,stagger:.07,delay:.7,ease:'back.out(2)'}); }
}
