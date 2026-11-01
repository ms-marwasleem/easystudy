/* MAP screen — the journey for one subject. */
/* ---------- Map: ONE template for every subject (only the names, pages and lessons come from the subject's data).
   All units on one road that zigzags in rows; units are boxes, lessons are numbered squares with their page signs beside the road,
   the car sits at the lesson the child opened last. The rows follow the screen direction (Arabic starts on the right). ---------- */
const LOCK=`<svg viewBox="0 0 60 68" aria-hidden="true">${PADLOCK}</svg>`;
/* a unit = a small book (the subject's book colour) with "Unit 1" on its cover; a locked one is wrapped in a fat chain with a padlock */
const CHAINLOCK=`<svg class="uchain" viewBox="0 0 100 100" aria-hidden="true">
  ${[0,1,2,3,4,5,6,7].map(k=>{ const h=k%2===0, x=9+k*11.7, w=h?15:8, hh=h?9:13; return `<rect x="${(x-w/2).toFixed(1)}" y="${(74-hh/2).toFixed(1)}" width="${w}" height="${hh}" rx="4" fill="none" stroke="var(--btn-ol)" stroke-width="6.500"/><rect x="${(x-w/2).toFixed(1)}" y="${(74-hh/2).toFixed(1)}" width="${w}" height="${hh}" rx="4" fill="none" stroke="var(--lock-metal)" stroke-width="3.200"/><path d="M${(x-w/2+2).toFixed(1)} ${(74-hh/2).toFixed(1)}h${(w*.4).toFixed(1)}" stroke="#fff" stroke-width="1.200" stroke-linecap="round" opacity=".9"/>`; }).join('')}
  <g transform="translate(26 44) scale(.8)">${PADLOCK}</g></svg>`;
function unitBox(u,st){
  const b=(SUBJECT&&SUBJECT.book)||'blue';
  return `<div class="ubox ${st}"><img src="data/books/${b}.png" alt="" draggable="false"><b class="gt${isAr()?' ar':''}"><small>${GT(tr('Unit'))}</small><span class="n">${num(u.unit)}</span></b>${st==='locked'?CHAINLOCK:st==='soon'?`<span class="usoon">${tr('Soon')}</span>`:''}</div>`;
}
function mkLesson(m,nextL,isCur,isLast,st,coins){
  st=st||(m.file?'open':'soon'); const open=st==='open', n=lessonStars(m.id);
  const s=el('div','jl '+st+(isCur?' cur':'')); s.dataset.stars=n; s.dataset.touched=lessonTouched(m)?1:0;
  // the lesson sits on the road: a round badge with its number, the stars above it, the name in a pill across its bottom edge.
  // 'soon' = faded + "Soon" pill, 'locked' = the chunky padlock on the badge. From an open lesson its pages stand beside the road as little signs.
  s.innerHTML=`<div class="jbox">`+(st!=='soon'?`<span class="js">${Array.from({length:lessonParts(m)},(_,k)=>`<span>${STAR(k<n)}</span>`).join('')}</span>`:'')+
    `<button class="jcard" aria-label="${open?`Lesson ${m.lesson} ${m.title}`:`Lesson ${m.lesson} ${st}`}"><b class="jn${/-/.test(m.lesson)?' two':''}">${num(m.lesson)}</b>${st==='locked'?`<span class="jlock">${LOCK}</span>`:''}</button>`+
    (st==='soon'?`<span class="jt soon">${tr('Soon')}</span>`:`<span class="jt gt${isAr()?' ar':''}">${GT(m.title)}</span>`)+`</div>`+
    (open&&typeof bookSides==='function'?bookSides(m,nextL):'');
  if(isLast) s.classList.add('last');
  $('.jbox',s).addEventListener('click',()=>{   // the whole box (number, stars, name) opens the lesson
    hideHint(); if(open){ blip(600); openLesson(m); } else if(st==='locked') message(isAr()?'مقفول':'Locked',coins?(isAr()?`تفتحيه بـ ${COINTXT(coins)}`:`Open it with ${COINTXT(coins)}!`):(isAr()?'ده هيتفتح قريبًا':'This opens later!'),`<span class="jlockbig">${LOCK}</span>`); else message(tr('Soon!'),isAr()?'الدرس ده قريبًا!':COURSE.hints.soonLesson,`<span class="car">${CAR('sad')}</span>`); });
  const go=(t,p)=>{ hideHint(); blip(600); bookOpen(m,t,p); };
  $$('.jpm:not(.ex):not(.tl):not(.rv)',s).forEach(b=>b.addEventListener('click',()=>go(b.dataset.tab,+b.dataset.p)));
  $$('.jpm.ex:not(.rv)',s).forEach(b=>b.addEventListener('click',()=>{ hideHint(); blip(600); openExam(m,m.exams.find(x=>x.id===b.dataset.ex)); }));   // red signs: exam papers
  $$('.jpm.rv',s).forEach(b=>b.addEventListener('click',()=>{ hideHint(); blip(600); const t=SUBJECT.lessons.find(x=>x.folder===b.dataset.rev); if(t) bookOpen(t,'booklet',+b.dataset.p); }));   // red sign: a revision (a lesson folder of its own, hidden from the road)
  $$('.jpm.tl',s).forEach(b=>b.addEventListener('click',()=>{ hideHint(); blip(600); toolOpen(5); }));   // yellow circles: helper tools
  return s;
}
function drawMap(redraw){
  const j=el('div','journey vmap'); return drawMapAll(j,redraw);
}
// ---- VERTICAL MAP (one template for every subject): an open book page. A smooth zigzag road runs down it through the unit books and the lesson
// buttons (lessons swing left / right alternately). Each lesson's page signs stand ON the road, left and right in turn, each tied to the road by a
// small dotted line; the lesson's name is written on the page beside its button. Everything is placed here (rem-based sizes), so each lesson takes
// exactly the room its pages need, the same gap everywhere, and the road is drawn through the nodes.
const KINDS=[['bk0','Book'],['pts','PTS'],['bk','Booklet'],['tl','Tool'],['ex','Test']];
const kindOf=jp=>jp.classList.contains('pts')?'pts':jp.classList.contains('bk')?'bk':jp.classList.contains('tl')?'tl':(jp.classList.contains('ex')||jp.classList.contains('rv'))?'ex':'bk0';
const MAPF={};
function drawMapAll(j,redraw){
  const wrap=$('#mapWrap'), units=SUBJECT.units||[{unit:1}], lessons=SUBJECT.lessons.filter(l=>!l.hidden);
  const openOf=u=>lessons.some(l=>l.unit===u.unit&&l.file);
  const curM=curLessonOf(lessons.filter(l=>l.file))||lessons[0], items=[];
  j.innerHTML=`<svg class="jroad" aria-hidden="true"></svg><div class="jcar"></div>`;
  units.forEach(u=>{
    const ua=accessOf(u,openOf(u),'u:'+SUBJECT.id+':'+u.unit,units.indexOf(u),'unit'), ust=ua.st, box=el('div','jend'); box.innerHTML=unitBox(u,ust);
    $('.ubox',box).addEventListener('click',()=>{ hideHint(); if(ust==='open') blip(600); else if(ust==='locked') message(isAr()?'مقفول':'Locked',ua.coins?(isAr()?`تفتحيه بـ ${COINTXT(ua.coins)}`:`Open it with ${COINTXT(ua.coins)}!`):(isAr()?'ده هيتفتح قريبًا':'This opens later!'),unitBox(u,'locked')); else message(tr('Soon!'),isAr()?`${tr('Unit')} ${num(u.unit)} قريبًا!`:`Unit ${u.unit} is coming soon!`,unitBox(u,'soon')); });
    j.append(box); items.push({k:'u',el:box});
    const list=lessons.filter(l=>l.unit===u.unit);
    list.forEach((m,i)=>{ const L=mkLesson(m,list[i+1],m===curM,i===list.length-1,(()=>{ const la=accessOf(m,!!m.file,'l:'+m.id); return la.st==='open'&&ust==='locked'?'locked':la.st; })(),ua.coins), signs=$$('.jpg',L), nm=$('.jt',L);
      [nm,...signs].forEach(e=>{ if(e) e.dataset.touched=L.dataset.touched; }); $$('.jside',L).forEach(s=>s.remove()); if(nm){ j.append(nm); nm.addEventListener('click',()=>$('.jbox',L).click()); } j.append(L); signs.forEach(s=>j.append(s)); items.push({k:'l',el:L,signs,name:nm}); });
  });
  j._items=items; wrap.innerHTML=`<div class="mtitle"><div><b${isAr()?' class="ar"':''}>${SUBJECT.name}</b><small>${tr(COURSE.grade)} · ${tr(COURSE.term)}</small></div></div>`; wrap.append(j);
  j.dataset.f=MAPF[subjKey()]||'';
  mapTabs(j); applyMapFilter(j,false);
  placeCar(Math.max(0,$$('.jl',j).findIndex(e=>e.classList.contains('cur'))), !redraw);
  const c=$('.jl.cur',j); if(c) wrap.scrollTop=Math.max(0,c.offsetTop-wrap.clientHeight*.38);
}
// the bookmarks at the bottom: only the kinds this subject really has. Tap one = only those signs show and the page scrolls to the first;
// tap it again (or the page itself) = everything shows (default).
function mapTabs(j){
  const g=$('#mapTabs'); if(!g) return; const have=new Set($$('.jpm',j).map(kindOf));
  g.innerHTML=KINDS.filter(([k])=>have.has(k)).map(([k,n])=>`<button class="mtab mt-${k}" data-k="${k}" aria-pressed="false"><span>${tr(n)}</span></button>`).join('');
  $$('.mtab',g).forEach(b=>b.addEventListener('click',()=>{ hideHint(); blip(300);
    const key=subjKey(); MAPF[key]=MAPF[key]===b.dataset.k?'':b.dataset.k; j.dataset.f=MAPF[key]; applyMapFilter(j,!!MAPF[key]); }));
}
function applyMapFilter(j,focus){
  const f=j.dataset.f||'', wrap=j.parentElement;
  $$('.jpg',j).forEach(p=>{ const jp=$('.jpm',p); p.style.display=(!f||kindOf(jp)===f)?'':'none'; });
  $$('.mtab').forEach(b=>{ const on=b.dataset.k===f; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); });
  mapLayout(j); placeCar(Math.max(0,$$('.jl',j).findIndex(e=>e.classList.contains('cur'))),false);
  if(focus){ const first=$$('.jpg',j).find(p=>p.style.display!==''?false:true); if(first) wrap.scrollTo({top:Math.max(0,first.offsetTop-wrap.clientHeight*.3),behavior:'smooth'}); }
}
function mapLayout(j){
  const fs=parseFloat(getComputedStyle(j).fontSize)||16, W=j.clientWidth, cx=W/2;
  const sway=Math.min(W*.2,4.4*fs), off=2.6*fs, step=3.6*fs, rh=.75*fs;
  let y=fs*3.4, side=-1; const pts=[], place=[];
  j._items.forEach(it=>{
    if(it.k==='u'){ const e=it.el; e.style.left=cx+'px'; e.style.top=y+'px'; const h=e.offsetHeight; pts.push([cx,y+h*.55]); y+=h+fs*1.2; return; }
    const L=it.el, x=cx+side*sway; side=-side; if(L.classList.contains('cur')) y+=4.2*fs; L.style.left=x+'px'; L.style.top=y+'px';
    const cy=y+3.4*fs; pts.push([x,cy]);
    let belowName=cy+1.7*fs;
    const nm=it.name; if(nm){ const nw=nm.offsetWidth, nx=Math.max(nw/2+fs*.4,Math.min(W-nw/2-fs*.4,x)); nm.style.left=nx+'px'; nm.style.top=(cy+1.5*fs)+'px'; belowName=cy+1.5*fs+nm.offsetHeight; }
    const vis=it.signs.filter(s=>s.style.display!=='none'); let ry=belowName+fs*.9;
    for(let r=0;r*2<vis.length;r++){ const pair=vis.slice(r*2,r*2+2), h=Math.max(...pair.map(s=>$('.jpm',s).offsetHeight)); pair.forEach((s,k)=>place.push({s,yc:ry+h/2,left:k===0})); ry+=h+fs*.9; }
    y=vis.length?ry+fs*.3:belowName+fs*1.4;
  });
  j.style.height=(y+fs*1.5)+'px';
  const svg=$('.jroad',j), H=y+fs*1.5; if(!pts.length) return;
  const all=[[pts[0][0],Math.max(0,pts[0][1]-fs*2)],...pts,[pts[pts.length-1][0],Math.max(pts[pts.length-1][1]+fs*2.5,y-fs*.4)]];   // the road runs to the very last page sign

  let d=`M${all[0][0].toFixed(1)},${all[0][1].toFixed(1)}`;
  const segs=[];
  for(let k=0;k<all.length-1;k++){ const a=all[Math.max(0,k-1)],b=all[k],c=all[k+1],e=all[Math.min(all.length-1,k+2)];
    const c1=[b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6], c2=[c[0]-(e[0]-b[0])/6,c[1]-(e[1]-b[1])/6]; segs.push([b,c1,c2,c]);
    d+=` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`; }
  const rb=1.5*fs; svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.setAttribute('width',W); svg.setAttribute('height',H);
  svg.innerHTML=`<path class="rbase" d="${d}" fill="none" stroke-width="${rb}" stroke-linecap="round"/><path class="rdone" d="${d}" fill="none" stroke-width="${rb}" stroke-linecap="round" stroke-dasharray="0 99999"/>`;
  j._road=$('.rbase',svg); j._done=$('.rdone',svg);
  const bz=(s,t)=>{ const u=1-t, w=[u*u*u,3*u*u*t,3*u*t*t,t*t*t]; return [w[0]*s[0][0]+w[1]*s[1][0]+w[2]*s[2][0]+w[3]*s[3][0], w[0]*s[0][1]+w[1]*s[1][1]+w[2]*s[2][1]+w[3]*s[3][1]]; };
  const xAt=yy=>{ let a=0,b=segs.length-1; while(a<b){ const mid=(a+b)>>1; if(segs[mid][3][1]<yy) a=mid+1; else b=mid; }   // the segment that holds this height, then bisect inside it (no slow svg path measuring)
    const s=segs[a]; let lo=0,hi=1; for(let k=0;k<16;k++){ const mid=(lo+hi)/2; if(bz(s,mid)[1]<yy) lo=mid; else hi=mid; } return bz(s,lo)[0]; };
  place.forEach(p=>{ const s=p.s, jp=$('.jpm',s), w=jp.offsetWidth, h=jp.offsetHeight, rx=xAt(p.yc), ln=$('.jsl',s), len=off-rh;
    ln.style.width=len+'px'; s.classList.toggle('lf',p.left); s.classList.toggle('rt',!p.left);
    s.style.top=(p.yc-h/2)+'px'; s.style.left=(p.left?rx-off-w:rx+rh)+'px'; });
}
function placeCar(i, drive){
  const j=$('.journey'), L=$$('.jl',j), car=$('.jcar',j), cur=L[i]; if(!cur||!car) return;
  putCar(car); const road=j._road; if(!road) return;
  const jr=j.getBoundingClientRect(), cc=$('.jcard',cur).getBoundingClientRect(), cy=cc.top+cc.height/2-jr.top, cw=car.offsetWidth||80, tot=road.getTotalLength();
  let lo=0,hi=tot; for(let k=0;k<22;k++){ const mid=(lo+hi)/2; if(road.getPointAtLength(mid).y<cy) lo=mid; else hi=mid; }
  const at=Math.max(0,lo-cw*1.1), q=road.getPointAtLength(at);
  car.style.left=q.x+'px'; car.style.top=(q.y-cw*.12)+'px';
  j._done.setAttribute('stroke-dasharray',`${at} ${tot+10}`);
  if(anim&&drive){
    G.from(car,{y:-cw*.9,opacity:0,duration:.8,ease:'power2.out',onStart:()=>G.to($$('.wheel',car),{rotation:360,transformOrigin:'50% 50%',duration:.4,repeat:2,ease:'none'})});
    G.from('.jl .jcard',{scale:.7,opacity:0,duration:TM('--t-pop',.22),ease:'power2.out',stagger:.03,clearProps:'transform,opacity'});
    G.from('.jend .ubox',{scale:.85,opacity:0,duration:TM('--t-pop',.22),ease:'power2.out',stagger:.05,clearProps:'transform,opacity'});
    G.to('.jl.cur .jcard',{scale:1.07,duration:.7,yoyo:true,repeat:-1,ease:'sine.inOut',delay:1});
  }
}
function openMap(){
  if(!SUBJECT) SUBJECT=COURSE.subjects.find(s=>s.open);
  stopAll(); vStop(); clearMarks(); show('map');
  drawMap(); showHint($('.jl.cur .jcard'),isAr()?'اضغط هنا لتبدأ!':COURSE.hints.map,1500,'map');
}
let rsT=0; addEventListener('resize',()=>{ clearTimeout(rsT); rsT=setTimeout(()=>{ if($('#map').hidden) return;
  const j=$('.journey'), cur=Math.max(0,$$('.jl').findIndex(e=>e.classList.contains('cur')));
  if(j){ mapLayout(j); placeCar(cur,false); } },200); });
// moving the map with the mouse (drag), the finger (the page's own touch scrolling) or the wheel (also sideways when the map is only wider than the screen)
(function(){
  const w=$('#mapWrap'); let dn=null, moved=false;
  w.addEventListener('pointerdown',e=>{ if(e.pointerType==='touch'||e.button) return; dn={x:e.clientX,y:e.clientY,sl:w.scrollLeft,st:w.scrollTop}; moved=false; });
  addEventListener('pointermove',e=>{ if(!dn) return; const dx=e.clientX-dn.x, dy=e.clientY-dn.y;
    if(!moved&&Math.hypot(dx,dy)>6){ moved=true; w.classList.add('drag'); }
    if(moved){ w.scrollTop=dn.st-dy; e.preventDefault(); } });
  const up=()=>{ dn=null; w.classList.remove('drag'); setTimeout(()=>moved=false,0); };
  addEventListener('pointerup',up); addEventListener('pointercancel',up);
  w.addEventListener('click',e=>{ if(moved){ e.stopPropagation(); e.preventDefault(); } },true);
  w.addEventListener('click',e=>{ const j=$('.journey',w); if(j&&j.dataset.f&&!e.target.closest('.jpm,.jbox,.ubox,.jt')){ MAPF[subjKey()]=''; j.dataset.f=''; applyMapFilter(j,false); } });
  w.addEventListener('wheel',e=>{ const v=w.scrollHeight>w.clientHeight+1, h=w.scrollWidth>w.clientWidth+1;
    if(!v&&h&&Math.abs(e.deltaY)>Math.abs(e.deltaX)){ w.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false});
})();
