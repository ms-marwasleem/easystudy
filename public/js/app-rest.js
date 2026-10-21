/* MADE BY tools/build-app.py from the files named below. Do not edit here: edit those files, then run the script again. */
/* ===== js/map.js ===== */
/* MAP screen — the journey for one subject. */
/* ---------- Map: ONE template for every subject (only the names, pages and lessons come from the subject's data).
   All units on one road that zigzags in rows; units are boxes, lessons are numbered squares with their page signs beside the road,
   the car sits at the lesson the child opened last. The rows follow the screen direction (Arabic starts on the right). ---------- */
const LOCK=`<svg viewBox="0 0 60 64" aria-hidden="true"><path d="M16 28V18a14 14 0 0 1 28 0v10" fill="none" stroke="${OL}" stroke-width="11"/><path d="M16 28V18a14 14 0 0 1 28 0v10" fill="none" stroke="#B9C1C9" stroke-width="6"/>
  <rect x="6" y="26" width="48" height="34" rx="10" fill="#9AA4AE" stroke="${OL}" stroke-width="4"/><rect x="10" y="30" width="40" height="8" rx="4" fill="#fff" opacity=".35"/><circle cx="30" cy="43" r="5" fill="${OL}"/><path d="M30 46v7" stroke="${OL}" stroke-width="4" stroke-linecap="round"/></svg>`;
function unitBox(u,open){
  const hole=open?`<ellipse cx="100" cy="128" rx="34" ry="24" fill="#3A1F0C" stroke="${OL}" stroke-width="4"/><g class="peek"><ellipse cx="88" cy="128" rx="8" ry="9" fill="#fff"/><ellipse cx="112" cy="128" rx="8" ry="9" fill="#fff"/><circle cx="90" cy="130" r="4" fill="${OL}"/><circle cx="114" cy="130" r="4" fill="${OL}"/></g>`
    :`<path d="M8 104Q100 132 192 104" fill="none" stroke="#6E7781" stroke-width="12" stroke-dasharray="14 6" stroke-linecap="round"/><path d="M8 104Q100 132 192 104" fill="none" stroke="${OL}" stroke-width="3" stroke-dasharray="14 6" opacity=".6"/>`;
  return `<div class="ubox ${open?'open':'locked'}"><svg viewBox="0 0 200 170" aria-hidden="true">
    <path d="M14 40L30 18H170L186 40Z" fill="#E8B878" stroke="${OL}" stroke-width="5" stroke-linejoin="round"/><path d="M100 18V40" stroke="${OL}" stroke-width="3" opacity=".5"/>
    <rect x="14" y="40" width="172" height="122" rx="6" fill="${open?'#D9A764':'#C99A5E'}" stroke="${OL}" stroke-width="5"/>
    <path d="M22 50H178" stroke="rgba(255,255,255,.35)" stroke-width="4" stroke-linecap="round"/>${hole}</svg>
    <b class="outline${isAr()?' ar':''}">${tr('Unit')} ${num(u.unit)}</b>${open?'':`<span class="ulock">${LOCK}</span>`}</div>`;
}
function mkLesson(m,nextL,isCur,isLast){
  const open=!!m.file, n=lessonStars(m.id);
  const s=el('div','jl'+(open?' open':' locked')+(isCur?' cur':'')); s.dataset.stars=n; s.dataset.touched=lessonTouched(m)?1:0;
  // the lesson sits on the road: a small square with its number, the stars above it, the name on a label across its bottom edge.
  // From it to the next lesson its pages stand beside the road, each a little sign: Book pages on one side, Workbook pages on the other.
  s.innerHTML=`<div class="jbox">`+(open?`<span class="js">${Array.from({length:lessonParts(m)},(_,k)=>`<span>${STAR(k<n)}</span>`).join('')}</span>`:'')+
    `<button class="jcard" aria-label="${open?`Lesson ${m.lesson} ${m.title}`:`Lesson ${m.lesson} soon`}"><b class="jn${/-/.test(m.lesson)?' two':''}">${num(m.lesson)}</b>${open?'':`<span class="jlock">${LOCK}</span>`}</button>`+
    (open?`<span class="jt${isAr()?' ar':''}">${m.title}</span>`:'')+`</div>`+
    (open&&typeof bookSides==='function'?bookSides(m,nextL):'');
  if(isLast) s.classList.add('last');
  $('.jbox',s).addEventListener('click',()=>{   // the whole box (number, stars, name) opens the lesson
    hideHint(); if(open){ blip(600); openLesson(m); } else message(tr('Soon!'),isAr()?'الدرس ده قريبًا!':COURSE.hints.soonLesson,`<span class="car">${CAR('sad')}</span>`); });
  const go=(t,p)=>{ hideHint(); blip(600); bookOpen(m,t,p); };
  $$('.jpm:not(.ex):not(.tl):not(.rv)',s).forEach(b=>b.addEventListener('click',()=>go(b.dataset.tab,+b.dataset.p)));
  $$('.jpm.ex:not(.rv)',s).forEach(b=>b.addEventListener('click',()=>{ hideHint(); blip(600); openExam(m,m.exams.find(x=>x.id===b.dataset.ex)); }));   // red signs: exam papers
  $$('.jpm.rv',s).forEach(b=>b.addEventListener('click',()=>{ hideHint(); blip(600); const t=SUBJECT.lessons.find(x=>x.folder===b.dataset.rev); if(t) bookOpen(t,'booklet',+b.dataset.p); }));   // red sign: a revision (a lesson folder of its own, hidden from the road)
  $$('.jpm.tl',s).forEach(b=>b.addEventListener('click',()=>{ hideHint(); blip(600); toolOpen(5); }));   // yellow circles: helper tools
  return s;
}
function drawMap(redraw){
  const j=el('div','journey snake'); return drawMapAll(j,redraw);
}
// each lesson's stretch of road starts at its square and runs to the next lesson; its page signs stand along it,
// so the stretch is as long as its pages need (more pages = longer road).
// one lesson's stretch of road: comfortable length (pages nicely spaced) and the least it can shrink to (signs nearly touching)
function lessonLens(l){
  const bx=$('.jbox',l), em=parseFloat(getComputedStyle(bx||$('.jside',l)).fontSize), bw=bx?bx.offsetWidth:0, bh=bx?bx.offsetHeight:0, sides=$$('.jside',l);   // .jcont: the road of a lesson going on along the next row (signs only)
  l.style.setProperty('--bw',bw+'px'); l.style.setProperty('--bh',bh+'px');
  const len=gap=>bw+em*(gap?1.4:1)+(sides.length?Math.max(...sides.map(sd=>{ const b=$('.jpm',sd); return b?+sd.dataset.n*(b.offsetWidth+gap):0; })):0);
  return {need:Math.ceil(len(14)),least:Math.ceil(len(5))};
}
// ---- landscape: ONE map with every unit and lesson. The road goes back and forth (snake) in R rows; a unit box sits on the road before its lessons.
// We look for the biggest size (fs) at which everything fits the screen's width when cut into R rows that fit its height; if even the smallest size
// does not fit, the map is bigger than the screen and can be dragged, touched or wheel-scrolled.
let SNAKE_EM=12.2, SNAKE_MAXFS=26;
const snakeMin=()=>matchMedia('(max-aspect-ratio:1/1)').matches?3.5:8;
function drawMapAll(j,redraw){
  const wrap=$('#mapWrap'), units=SUBJECT.units||[{unit:1}], lessons=SUBJECT.lessons.filter(l=>!l.hidden);
  const openOf=u=>lessons.some(l=>l.unit===u.unit&&l.file);
  const openL=lessons.filter(l=>l.file), curM=curLessonOf(lessons)||lessons[0];
  j.innerHTML=`<svg class="jroad" aria-hidden="true"></svg><div class="jcar"></div>`;
  const row=el('div','jrow'), atoms=[];
  units.forEach(u=>{
    const open=openOf(u), box=el('div','jend'); box.innerHTML=unitBox(u,open);
    $('.ubox',box).addEventListener('click',()=>{ hideHint(); if(open) blip(600); else message(tr('Soon!'),isAr()?`${tr('Unit')} ${num(u.unit)} قريبًا!`:`Unit ${u.unit} is coming soon!`,unitBox(u,false)); });
    atoms.push({kind:'u',els:[box,el('span','jgo')]});
    const list=lessons.filter(l=>l.unit===u.unit);
    list.forEach((m,i)=>atoms.push({kind:'l',els:[mkLesson(m,list[i+1],m===curM,i===list.length-1)]}));
  });
  j.append(row); wrap.innerHTML=''; wrap.append(j);
  j._atoms=atoms; snakeLayout();
  placeCar(Math.max(0,$$('.jl',j).findIndex(e=>e.classList.contains('cur'))), !redraw);
}
// a lesson with more page signs than one row holds at the readable size goes on along the next row(s): the rest of its signs stand on a
// continuation of its road (.jcont). Same for every subject; before, a map with one long lesson shrank everything to fit it.
function snakeSplit(j,W,meas,target){
  const base=j._atoms0||(j._atoms0=j._atoms);
  base.forEach(a=>{ if(!a.conts) return; const l=a.els[0];   // put back the signs of an earlier split
    a.conts.forEach(c=>$$('.jside',c).forEach(sd=>$('.jside.'+sd.classList[1]+' .jpgs',l).append(...$$('.jpg',sd)))); a.conts=null;
    $$('.jside',l).forEach(sd=>sd.dataset.n=Math.max(1,$$('.jpg',sd).length)); });
  j._atoms=base; const m=meas(target), room=W-2*m.pad-m.gw-8, out=[];
  base.forEach(a=>{ out.push(a); if(a.kind!=='l') return; const l=a.els[0]; if(lessonLens(l).least<=room) return;
    const sg=$('.jpg',l), sw=sg.offsetWidth+5, em=parseFloat(getComputedStyle($('.jbox',l)).fontSize);
    const first=Math.max(1,Math.floor((room-$('.jbox',l).offsetWidth-em*1.4)/sw)), per=Math.max(1,Math.floor((room-em*1.4)/sw));
    const sides=$$('.jside',l).map(sd=>({cls:sd.classList[1],rest:$$('.jpg',sd).slice(first)}));
    const nc=Math.max(...sides.map(s=>Math.ceil(s.rest.length/per))); a.conts=[];
    for(let k=0;k<nc;k++){ const c=el('div','jcont'); c.innerHTML=sides.map(s=>`<div class="jside ${s.cls}"><span class="jpgs"></span></div>`).join('');
      sides.forEach((s,i)=>{ const part=s.rest.slice(k*per,(k+1)*per), sd=$$('.jside',c)[i]; $('.jpgs',sd).append(...part); sd.dataset.n=Math.max(1,part.length); if(!part.length) sd.style.visibility='hidden'; });
      a.conts.push(c); out.push({kind:'c',els:[c]}); }
    $$('.jside',l).forEach(sd=>sd.dataset.n=Math.max(1,$$('.jpg',sd).length)); });
  j._atoms=out; return out;
}
function snakeLayout(){
  const j=$('.journey'), w=j.parentElement, row=$('.jrow',j); if(!j._atoms) return;
  const W=w.clientWidth, H=w.clientHeight;
  let atoms=j._atoms0||j._atoms, all=atoms.flatMap(a=>a.els), n=atoms.length;
  SNAKE_EM=all.some(e=>e.querySelector&&e.querySelector('.jside.wb'))?12.2:10.6;   // rows only as tall as their signs need (the two-sided maps need more)
  const mkSpacer=()=>el('span','jgo');
  const put=(R,fs)=>{   // size things for (R rows, fs) and put everything in one flat row to measure it
    const lh=fs*SNAKE_EM; j.style.setProperty('--fs',fs+'px'); j.style.setProperty('--lh',lh+'px');
    row.innerHTML=''; const ln=el('div','jline'); ln.style.width='max-content'; row.append(ln); ln.append(...all);
    const wd=atoms.map(a=>a.kind!=='u'?(a.els[0].style.flex=a.els[0].style.minWidth='',lessonLens(a.els[0]).least):a.els.reduce((t,e)=>t+e.offsetWidth+6,0));
    const cs=getComputedStyle(j), rb=parseFloat(cs.getPropertyValue('--rb'))||fs*1.9, pad=rb*1.3+6;
    return {lh,wd,pad,gw:atoms[0].els[1].offsetWidth+6,rb};
  };
  const split=(m,R)=>{   // cut the items into R rows in order, the widest row as narrow as possible (dynamic programming)
    const pre=[0]; m.wd.forEach((x,i)=>pre.push(pre[i]+x+(atoms[i].kind!=='u'?6:0)));
    const rw=(a,b,k)=>2*m.pad+pre[b]-pre[a]+(k?m.gw:0);
    const best=[], from=[]; for(let k=0;k<R;k++){ best.push([]); from.push([]); }
    for(let i=1;i<=n;i++){ best[0][i]=rw(0,i,0); from[0][i]=0; }
    for(let k=1;k<R;k++) for(let i=k+1;i<=n;i++){ let bv=1e12,bj=k; for(let a=k;a<i;a++){ const v=Math.max(best[k-1][a],rw(a,i,k)); if(v<bv){bv=v;bj=a;} } best[k][i]=bv; from[k][i]=bj; }
    const c=[n]; for(let k=R-1,i=n;k>0;k--){ i=from[k][i]; c.unshift(i); }
    return {mx:best[R-1][n],c};
  };
  // ONE size for every subject on a screen: the readable size (rem-based, so it follows the screen). A lesson too long for a row goes on
  // along the next row (snakeSplit) and the map scrolls up/down; only when a row still cannot fit (a very narrow screen) the size steps down.
  const SNAKE_MINFS=snakeMin();
  const rootPx=parseFloat(getComputedStyle(document.documentElement).fontSize)||16, target=Math.min(SNAKE_MAXFS,rootPx*(matchMedia('(max-aspect-ratio:1/1)').matches?.68:1.15));
  atoms=snakeSplit(j,W,f=>put(1,f),target); all=atoms.flatMap(a=>a.els); n=atoms.length;
  const fit=m0=>{ if(split(m0,n).mx>W) return 0; let lo=1, hi=n; while(lo<hi){ const mid=(lo+hi)>>1; if(split(m0,mid).mx<=W) hi=mid; else lo=mid+1; } return lo; };   // fewest rows that fit the width
  let pick=null; for(let fs=target;fs>=SNAKE_MINFS&&!pick;fs-=.5){ const R=fit(put(1,fs)); if(R) pick={R,fs}; }
  if(!pick) pick={R:n,fs:SNAKE_MINFS};
  let {R,fs}=pick, m=put(R,fs), b=split(m,R);
  for(let k=0;k<8&&b.mx>W&&fs-.25>=SNAKE_MINFS;k++){ fs-=.25; m=put(R,fs); b=split(m,R); }   // the worked-out size was a hair too big: measure for real and step down
  const Wj=W; row.innerHTML=''; row.style.width=Wj+'px';
  const lines=[]; for(let k=0;k<R;k++){ const ln=el('div','jline'+(k%2?' rev':'')); lines.push(ln); row.append(ln); }
  b.c.forEach((e,k)=>{ const a=k?b.c[k-1]:0; if(k&&atoms[a].kind==='l') lines[k].append(mkSpacer()); for(let i=a;i<e;i++) lines[k].append(...atoms[i].els); });
  $$('.jl,.jcont',j).forEach(l=>{ const {need,least}=lessonLens(l); l.style.flex=`${need} 1 ${need}px`; l.style.minWidth=least+'px'; });
  j._rows=lines; j._lh=m.lh; j._rb=m.rb; j._pad=m.pad; j._Wj=Wj;
  j.style.height=''; drawRoad();
  const wr=w.getBoundingClientRect(), c=$('.jl.cur',j), cr=c&&c.getBoundingClientRect();
  if(c){ w.scrollLeft+=cr.left+cr.width/2-(wr.left+wr.width/2); w.scrollTop+=cr.top+cr.height/2-(wr.top+wr.height/2); }
}
// the road: one svg path through the middle of every row with a half-circle turn at each end; drawn as a few thin strokes on top of each other
// to look like the straight ribbon (dark edge, light sides, dark middle). The teal copy is the part already driven.
function drawRoad(){
  const j=$('.journey'), svg=$('.jroad',j); if(!svg||!j._rows) return;
  const R=j._rows.length, lh=j._lh, rb=j._rb, Wj=j._Wj, xl=rb*.85+6, xr=Wj-xl, r=Math.min(rb*1.1,lh/2), H=Math.max(lh*R,j.parentElement.clientHeight);
  const st=xl, far=xr, sg=1, sw=1;   // the road starts on the left in every subject (only Arabic TEXT runs right to left)
  let d=`M${st},${lh/2}`;
  for(let k=0;k<R;k++){ const y=lh*(k+.5), fwd=k%2===0;
    d+=fwd?` H${far-sg*r}`:` H${st+sg*r}`;
    if(k<R-1) d+=fwd?` A${r},${r} 0 0 ${sw} ${far},${y+r} V${y+lh-r} A${r},${r} 0 0 ${sw} ${far-sg*r},${y+lh}`:` A${r},${r} 0 0 ${1-sw} ${st},${y+r} V${y+lh-r} A${r},${r} 0 0 ${1-sw} ${st+sg*r},${y+lh}`; }
  d+=R%2===1?` H${far}`:` H${st}`;
  svg.setAttribute('viewBox',`0 0 ${Wj} ${H}`); svg.setAttribute('width',Wj); svg.setAttribute('height',H); svg.style.height=H+'px';
  const L=(w,c)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const layers=(a,b,c)=>`${L(rb,a)}${L(rb*.76,b)}${L(rb*.4,c)}`;
  svg.innerHTML=`<path d="${d}" fill="none" stroke="rgba(90,52,24,.35)" stroke-width="${rb+6}" stroke-linecap="round" transform="translate(0,4)"/>`+
    `<path d="${d}" fill="none" stroke="#5A3418" stroke-width="${rb+6}" stroke-linecap="round" stroke-linejoin="round"/>`+layers('#D49A70','#94503A','#7E3D2B')+
    `<g class="rdone" style="display:none">${layers('#9BE0D4','#3BA597','#2A8C80').replace(/<path /g,'<path class="dn" ')}</g>`;
  j._path=svg.firstElementChild; j._d=d; j._geo={R,lh,r,st,far,sg};
}
function placeCar(i, drive){
  const j=$('.journey'), L=$$('.jl',j), car=$('.jcar',j);
  const cur=L[i]; if(!cur||!car) return;
  putCar(car); placeCarSnake(j,L,i,cur,car,drive);
}
// landscape: the car waits at the start of the road leading to its lesson, facing the way the row goes (left in the odd rows)
function placeCarSnake(j,L,i,cur,car,drive){
  const jr=j.getBoundingClientRect(), line=cur.parentElement, rev=line.classList.contains('rev')!==(getComputedStyle(line).direction==='rtl'), d=rev?-1:1;   // rev here = this row runs to the left
  const card=$('.jcard',cur).getBoundingClientRect(), box=$('.jbox',cur).getBoundingClientRect(), first=!cur.previousElementSibling||!cur.previousElementSibling.classList.contains('jl');
  const lead=first?cur.previousElementSibling.getBoundingClientRect():$('.jbox',L[i-1]).getBoundingClientRect();
  const edge=first?(rev?lead.right:lead.left):(rev?lead.left:lead.right), near=rev?box.right:box.left;
  car.classList.toggle('rev',rev); car.style.width=''; const full=car.offsetWidth;
  const room=Math.abs(near-edge)-8; car.style.width=Math.max(34,Math.min(full,room))+'px';
  const lt=LAST[subjKey()], sg=lt&&lt.p&&lt.id===cur.id&&$$('.jpm[data-p="'+lt.p+'"]',cur)[0];   // she came in by a page sign: the car stands at that page
  const cw=car.offsetWidth, x=sg?(r=>r.left+r.width/2-jr.left)(sg.getBoundingClientRect()):(rev?box.left:box.right)+d*(4+cw/2)-jr.left, y=card.top+card.height/2-jr.top;
  car.style.left=x+'px'; car.style.top=y+'px';
  // the driven part of the road: along the path up to the lesson's square
  const path=j._path, done=$('.rdone',j);
  if(path&&done){ const tx=sg?x:card.left+card.width/2-jr.left, ty=y, tot=path.getTotalLength(); let bt=0;
    // worked out from the road's shape (straight rows joined by half circles); searching along the path point by point took seconds on a long road
    const g=j._geo, k=Math.max(0,Math.min(g.R-1,Math.floor(ty/g.lh))), full=Math.abs(g.far-g.st), turn=Math.PI*g.r+g.lh-2*g.r;
    const rowLen=i=>full-(g.R===1?0:(i===0||i===g.R-1)?g.r:2*g.r), rowX=i=>i===0?g.st:i%2?g.far-g.sg*g.r:g.st+g.sg*g.r;
    for(let i=0;i<k;i++) bt+=rowLen(i)+turn;
    bt+=Math.max(0,Math.min(rowLen(k),Math.abs(tx-rowX(k))));
    done.style.display=''; $$('.dn',done).forEach(p=>{ p.style.strokeDasharray=`${bt} ${tot+10}`; p.setAttribute('stroke-linecap','butt'); }); }
  if(anim&&drive){
    const start=$('.jend',j).getBoundingClientRect(), sx=start.left+start.width/2-jr.left, sy=start.top+start.height/2-jr.top;
    G.from(car,{x:sx-x,y:sy-y,duration:1.2,ease:'power2.out',onStart:()=>G.to($$('.wheel',car),{rotation:360,transformOrigin:'50% 50%',duration:.4,repeat:2,ease:'none'})});
    G.from('.jl .jcard',{scale:0,duration:.5,ease:'back.out(2)',stagger:.1});
    G.from('.jend .ubox',{scale:.5,opacity:0,duration:.5,ease:'back.out(2)',stagger:.2});
    G.to('.ubox.open .peek',{x:5,duration:.9,yoyo:true,repeat:-1,ease:'sine.inOut'});
    G.to('.jl.cur .jcard',{scale:1.06,duration:.7,yoyo:true,repeat:-1,ease:'sine.inOut',delay:1});
  }
}
function openMap(){
  if(!SUBJECT) SUBJECT=COURSE.subjects.find(s=>s.open);
  stopAll(); vStop(); clearMarks(); show('map');
  $('#mapTitle').textContent=SUBJECT.name; $('#mapSub').textContent=`${tr(COURSE.grade)} · ${tr(COURSE.term)}`;
  drawLegend(); drawMap(); showHint($('.jl.cur .jcard'),isAr()?'اضغط هنا لتبدأ!':COURSE.hints.map,1500,'map');
}
let rsT=0; addEventListener('resize',()=>{ clearTimeout(rsT); rsT=setTimeout(()=>{ if($('#map').hidden) return;
  const j=$('.journey'), cur=Math.max(0,$$('.jl').findIndex(e=>e.classList.contains('cur')));
  if(j){ snakeLayout(); placeCar(cur,false); } },200); });
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
  w.addEventListener('wheel',e=>{ const v=w.scrollHeight>w.clientHeight+1, h=w.scrollWidth>w.clientWidth+1;
    if(!v&&h&&Math.abs(e.deltaY)>Math.abs(e.deltaX)){ w.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false});
})();
;
/* ===== js/lesson.js ===== */
/* LESSON screen — header, reading tab (dialog + recording), tab bar and side buttons. */
/* ---------- Lesson ---------- */
// every path inside a lesson.json is relative to that lesson's own folder
function fixPaths(L,file){
  const base=file.slice(0,file.lastIndexOf('/')+1), R=p=>p&&!/^(https?:|\/|data:)/.test(p)?base+p:p;
  L.scene=R(L.scene); L.picture=R(L.picture); L.pagePictures=(L.pagePictures||[]).map(R); if(L.audio){ L.audio.normal=R(L.audio.normal); L.audio.slow=R(L.audio.slow); }
  (L.vocab||[]).forEach(v=>{ v.img=R(v.img); if(v.audio){ v.audio.word=R(v.audio.word); v.audio.again=R(v.audio.again); v.audio.ar=R(v.audio.ar); } if(v.rel){ v.rel.labelAudio=R(v.rel.labelAudio); v.rel.audio=R(v.rel.audio); } (v.parts||[]).forEach(p=>{ p.audio=R(p.audio); p.blend=R(p.blend); }); });
  (L.lines||[]).forEach(l=>{ l.pic=R(l.pic); });
  Object.values(L.bk||{}).forEach(b=>{ b.img=R(b.img); });
  L.praise=R(L.praise);
  ((L.math&&(L.math.bonds||L.math).rows)||[]).forEach(r=>{ r.audio=R(r.audio); });
  if(L.math&&L.math.line){ const ln=L.math.line; ln.rows.forEach(r=>{ r.audio=R(r.audio); }); ln.small.audio=R(ln.small.audio); ln.big.audio=R(ln.big.audio); ln.textAudio=R(ln.textAudio); }
  if(L.letter&&typeof fixLetterPaths==='function') fixLetterPaths(L.letter,R);
  return L;
}
async function openLesson(m){
  stopAll(); markOpened(m.id);
  if(!LESSON || LESSON.id!==m.id){
    busy(true);
    try{ LESSON=fixPaths(await get(m.file), m.file); LESSON.id=m.id; }catch(e){ busy(false); message('Oops!','This lesson did not load. Check the internet and try again.'); return; }
    preloadImgs([LESSON.scene,LESSON.picture,...(LESSON.pagePictures||[]),...(LESSON.vocab||[]).map(v=>v.img),...(LESSON.lines||[]).map(l=>l.pic),...Object.values(LESSON.bk||{}).map(b=>b.img)]);
    player.bufs={}; player.ready=null; vs.i=0; rd.page=1; rd.done={}; ensureAudio().catch(()=>{}); busy(false);   // an Arabic story not recorded yet (requested slot) stays silent: no error
  }
  show('lesson'); LESSON.tool=m.tool||null; LESSON.toolN=m.toolN||5;
  $('#lessonMeta').textContent=`${SUBJECT.name} · ${tr(COURSE.grade)} · ${tr(COURSE.term)}`;
  $('#lessonTitle').textContent=isAr()?`${tr('Unit')} ${num(LESSON.unit)} · ${tr('Lesson')} ${num(LESSON.lesson)} · ${LESSON.title}`:`Unit ${LESSON.unit} · Lesson ${LESSON.lesson} · ${LESSON.title}`;
  $('#stage').style.setProperty('--scene',`url("${new URL(LESSON.scene,location.href).href}")`);   // full address: css files live in css/
  switchTab(LESSON.tabs?LESSON.tabs[0]:'read'); if(!LESSON.tabs&&typeof qLoad==='function') qLoad().then(()=>{ if(LESSON&&LESSON.id===m.id) paintTabs(); }); pop('.l-head > *',{y:-20}); pop('.tabs .tab',{y:30,delay:.1});
}

/* ---------- Audio (lesson recordings are separate mp3 files) ---------- */
const rd={page:1,done:{},words:[],lineEls:[],spotEls:[],playing:false,slow:false,pick:{},stopAt:null,full:false,cur:-1,curLine:-1,raf:0};
const player={ctx:null,bufs:{},ready:null,src:null,run:false,startCtx:0,startT:0,pos:0};
const AC=window.AudioContext||window.webkitAudioContext, nap=ms=>new Promise(r=>setTimeout(r,ms));
// after the phone locks (or the app is in the background) the speaker can stay asleep: wake it, and if it will not wake, make a new one
async function ensureCtx(){
  player.ctx=ac();   // the one shared speaker (core.js)
  for(let k=0;k<2&&player.ctx.state!=='running';k++){
    try{ await Promise.race([player.ctx.resume(),nap(400)]); }catch(e){}
    if(player.ctx.state!=='running') player.ctx=newSpeaker();
  }
  try{ await Promise.race([player.ctx.resume(),nap(400)]); }catch(e){}
  return player.ctx=SND.ctx;
}
function ensureAudio(){
  if(!LESSON.audio) return Promise.resolve();
  const ready=ensureCtx().then(()=>{
    if(!player.ready){
      const dec=url=>fetch(url).then(r=>r.arrayBuffer()).then(b=>decodeSnd(player.ctx,b));
      player.ready=Promise.all([dec(LESSON.audio.normal),dec(LESSON.audio.slow)]).then(([n,s])=>{ player.bufs.n=n; player.bufs.s=s; });
    }
    return player.ready;
  });
  return ready;
}
const factor=()=>rd.slow?1/(LESSON.audio.slowRate||.75):1;
function now(){ return player.run?player.startT+Math.max(0,player.ctx.currentTime-player.startCtx)/factor():player.pos; }
function halt(){ if(player.src){ player.src.onended=null; try{player.src.stop();}catch(e){} player.src=null; } }
async function playFrom(t,stopAt=null,full=stopAt==null){
  hideHint(); halt(); player.run=false; rd.stopAt=stopAt; rd.playing=full; rd.full=full; readRail();
  try{ await ensureAudio(); }catch(e){ rd.playing=false; readRail(); return; }
  const f=factor(), src=player.ctx.createBufferSource(); src.buffer=rd.slow?player.bufs.s:player.bufs.n; src.connect(player.ctx.destination);
  const dur=stopAt!=null?Math.max(.05,(stopAt-t)*f):undefined; const lead=.12, at=player.ctx.currentTime+lead; dur!=null?src.start(at,t*f,dur):src.start(at,t*f);
  player.src=src; player.run=true; player.startCtx=at; player.startT=t;
  src.onended=()=>{ if(player.src!==src) return; player.src=null; player.run=false; const w=rd.full; player.pos=0; rd.stopAt=null; rd.full=false; endPlay(w); };
  startLoop();
}
function pausePlay(){ if(!player.run) return; player.pos=now(); halt(); player.run=false; rd.playing=false; cancelAnimationFrame(rd.raf); carDrive(false); }
function stopAll(){ halt(); player.run=false; player.pos=0; rd.stopAt=null; rd.playing=false; rd.full=false; cancelAnimationFrame(rd.raf); carDrive(false); }

const trackCar=$('#trackCar'); putCar(trackCar);
let spin=null;
// a lesson with "pages" (each line has "page": 1|2): the reading tab shows one page at a time; its span is where that page's lines are in the recording
const nPages=()=>LESSON&&LESSON.pages>1?LESSON.pages:1;
function pageSpan(){ if(nPages()<2) return [0,LESSON.end]; const ls=LESSON.lines.filter(l=>l.page===rd.page); if(!ls.length) return [0,LESSON.end];
  return [rd.page===1?0:Math.max(0,ls[0].words[0][1]-.15), rd.page===nPages()?LESSON.end:ls[ls.length-1].words.slice(-1)[0][2]+.35]; }
function carAt(t){ if(!LESSON) return; const [a,b]=pageSpan(); carFrac((t-a)/(b-a)); }
// p = 0..1 along the header road (reading time in the Lesson tab, words learned in Vocabulary)
function carFrac(p){ p=Math.max(0,Math.min(1,p||0)); const tw=Math.max(0,trackCar.parentElement.clientWidth-trackCar.offsetWidth-52);
  trackCar.style.transform=`translate(${(p*tw).toFixed(1)}px,-56%)`; }
function carDrive(on){
  if(!anim) return;
  if(on){ if(!spin) spin=G.to('#trackCar .wheel',{rotation:360,transformOrigin:'50% 50%',duration:.45,repeat:-1,ease:'none'}); else spin.play();
    G.to('#trackCar .cb',{y:-2,duration:.18,yoyo:true,repeat:-1,ease:'sine.inOut'}); }
  else { if(spin) spin.pause(); G.killTweensOf('#trackCar .cb'); G.set('#trackCar .cb',{y:0}); }
}
function mark(t){
  let wi=-1; for(let i=0;i<rd.words.length;i++){ const w=rd.words[i]; if(t>=w.s-.03&&t<w.e+.12) wi=i; }   // last match wins: the next word takes over as soon as it starts
  if(wi!==rd.cur){ if(rd.cur>=0&&rd.words[rd.cur]) rd.words[rd.cur].el.classList.remove('reading');
    if(wi>=0&&rd.words[wi]){ const e=rd.words[wi].el; e.classList.add('reading'); if(anim) G.fromTo(e,{scale:1.2},{scale:1,duration:.35,ease:'back.out(3)'}); }
    rd.cur=wi; }
  let li=-1; if(LESSON) LESSON.lines.forEach((l,i)=>{ const a=l.words[0][1], b=l.words[l.words.length-1][2]; if(t>=a-.05&&t<b+.25) li=i; });
  if(li!==rd.curLine){ rd.lineEls.forEach((e,i)=>e.classList.toggle('on',i===li)); rd.spotEls.forEach(e=>e&&e.classList.remove('on')); if(rd.spotEls[li]) rd.spotEls[li].classList.add('on'); rd.curLine=li;
    const ln=li>=0&&rd.lineEls[li]; if(ln&&$('.acticon',ln)){ ln.classList.add('acting'); clearTimeout(ln._act); ln._act=setTimeout(()=>ln.classList.remove('acting'),2200); } if(li>=0&&rd.lineEls[li]) rd.lineEls[li].scrollIntoView({block:'nearest',behavior:'smooth'}); }
  if(rd.full&&t>=0) carAt(t);
}
function loop(){ if(!player.run) return; mark(now()); rd.raf=requestAnimationFrame(loop); }
function startLoop(){ cancelAnimationFrame(rd.raf); carDrive(rd.full); rd.raf=requestAnimationFrame(loop); }
function clearMarks(){ mark(-1); }
function endPlay(full){
  rd.playing=false; cancelAnimationFrame(rd.raf); carDrive(false); setTimeout(()=>{ if(!player.run) clearMarks(); },500); readRail();
  if(full){ carAt(pageSpan()[1]); rd.done[rd.page]=1; if(Object.keys(rd.done).length>=nPages()) award(LESSON.id,'read'); setTimeout(()=>{ if(!player.run) carAt(pageSpan()[0]); },4000); }
}

/* ---------- Tabs + rail ---------- */
const stage=$('#stage'), rail=$('#rail'); let tab='read';
const TABAR={Lesson:'الدرس',Vocab:'كلمات',Q:'أسئلة',Booklet:'كُتيب',PTS:'التقييمات',Grammar:'القواعد'};   // the bottom tabs in Arabic lessons
const TABS={read:['Lesson','book'],words:['Vocab','abc'],quiz:['Q','quiz'],booklet:['Booklet','quiz'],workbook:['PTS','quiz'],grammar:['Grammar','hint']};
// English AL: the Lesson tab (book parts) and the Booklet tab both run on the questions engine (quiz.js); inQ() = a questions-style sheet is on screen
const isAL=()=>!!(LESSON&&LESSON.type==='al'), inQ=()=>tab==='quiz'||tab==='workbook'||tab==='booklet'||(isAL()&&tab==='read'), alSrc=()=>tab==='booklet'?'booklet':'lesson', qKey=()=>isAL()?tab:'quiz';
const KEYTAB={read:'book',quiz:'book',grammar:'book',booklet:'bk',workbook:'pts'};   // the map-key colour each tab belongs to (Words has none)
function paintTabs(){ $$('.tab').forEach(b=>{ const [l0,ic]=TABS[b.dataset.tab], l=(LESSON&&LESSON.tabLabels&&LESSON.tabLabels[b.dataset.tab])||l0, got=LESSON&&STARS[LESSON.id]&&STARS[LESSON.id][b.dataset.tab];
  b.dataset.book=KEYTAB[b.dataset.tab]||''; b.innerHTML=ICON[ic]+`<span>${isAr()&&TABAR[l]||tr(l)}</span>`+(b.dataset.book?'<i class="kd"></i>':'')+(got?`<span class="st">${STAR(true)}</span>`:''); b.hidden=LESSON&&LESSON.tabs?!LESSON.tabs.includes(b.dataset.tab):['booklet','workbook'].includes(b.dataset.tab)?!hasBook(b.dataset.tab):b.dataset.tab==='grammar'; b.setAttribute('aria-selected',b.dataset.tab===tab); }); const tb=$('.tabs'); if(tb) tb.classList.toggle('many',$$('.tab:not([hidden])').length>3); }   // optional "tabs": ["read","quiz"] in lesson.json shows only those tabs (Math: explanation + questions, or questions only)
// a default lesson shows Booklet / PTS only when it has that book (its pages in subject.json, or questions of that book)
function hasBook(k){ const m=SUBJECT&&LESSON&&SUBJECT.lessons.find(l=>l.id===LESSON.id); return !!(m&&m.pages&&[].concat(m.pages[k]||[]).length)||!!(qz.sets&&qz.file&&LESSON&&qz.file.includes('/'+(m&&m.folder)+'/')&&qz.all.some(q=>qSrcOf(q.set)===k)); }
function setRail(items){ rail.innerHTML=''; items.forEach(it=>{ const b=el('button','dash '+it.kind+(it.on?' on':'')+(it.icon==='restart'?' ln':''),`<span class="rb">${ICON[it.icon]}</span><span>${it.label}</span>`); b.addEventListener('click',it.click); rail.append(b); }); }
function switchTab(t,at){ if(typeof WP!=='undefined'&&WP.saved) wpClose(); stopAll(); vStop(); hideHint(); $('#lesson').classList.remove('vtab','qtab'); document.body.classList.remove('typing','kb'); tab=t; paintTabs(); lnavPaint(); carAt(0); (t==='booklet'||t==='read'&&isAL())?showQuiz(at):t==='grammar'?showGrammar():t==='read'?showRead():t==='words'&&LESSON.vocab?showWords():t==='quiz'&&typeof showQuiz==='function'?showQuiz(at):showGarage(); if(typeof bookTag==='function') bookTag(); pop('#stage > *',{scale:.85,y:10}); pop('#rail .dash',{x:30,y:0}); }
$$('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

// default speed: slow for a page that is a conversation (2+ speakers), normal for everything else; a child's own choice per page wins
function pageDefaultSlow(){ return new Set(LESSON.lines.filter(l=>nPages()<2||l.page===rd.page).map(l=>l.who)).size>1; }
function showRead(){
  { const k=LESSON.id+':'+rd.page; rd.slow=k in rd.pick?rd.pick[k]:pageDefaultSlow(); }
  stage.innerHTML=''; rd.words=[]; rd.lineEls=[]; rd.spotEls=[]; rd.cur=-1; rd.curLine=-1;
  if(LESSON.type==='letter'&&typeof showLetter==='function') return showLetter();
  if(LESSON.type==='math'&&typeof showMathExplain==='function') return showMathExplain();
  const pl=(LESSON.pageLayouts||[])[rd.page-1];   // optional per page: "text" (dialog on the scene) or "pictures"
  if(pl==='bubbles') return showBubbles();
  if(LESSON.layout==='pictures'||pl==='pictures') return showPics();
  const scene=el('div','scene'+(LESSON.picture?' book':'')+(LESSON.compact?' long':'')); scene.setAttribute('role','img'); scene.setAttribute('aria-label',LESSON.sceneAlt||'');
  const np=nPages(), note=el('div','note'), inn=el('div','in'); const tk=el('p','task',STAR(true)+((LESSON.pageTasks&&LESSON.pageTasks[rd.page-1])||LESSON.task));
  if(LESSON.titleWords&&rd.page===1){ tk.innerHTML=STAR(true); LESSON.titleWords.forEach(([w,s0,e0],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s:s0,e:e0}); sp.addEventListener('click',()=>playFrom(Math.max(0,s0-.04),e0+.06)); tk.append(sp,' '); }); }   // "titleWords": the title line is spoken at the start of the recording and lights up with it
  inn.append(tk);
  if(LESSON.titleWords&&rd.page===1){ const tp=$('p.task',inn); tp.innerHTML=STAR(true); LESSON.titleWords.forEach(([w,s,e])=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); tp.append(sp,' '); }); }   // optional "titleWords": the recording says the title first, so the title words light up with the audio
  const ul=el('ul','lines');
  LESSON.lines.forEach((l,li)=>{
    if(np>1&&l.page!==rd.page) return;
    const row=el('li','line'), who=l.who?el('button','who',l.who+':'):el('button','who say',SAY_LN); who.style.color=(LESSON.speakers||{})[l.who]||OL;   // a story (no speaker name): a small speaker that reads the paragraph
    who.setAttribute('aria-label','Listen to this line'); who.addEventListener('click',()=>playLine(li));
    const txt=el('span','txt'); if(l.color){ txt.style.color=l.color; who.style.color=l.color; }   // optional "color": a story paragraph read in a colour (the book's speaker colours)
    l.words.forEach(([w,s,e])=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); txt.append(sp,' '); });
    if(l.act){ const ac=el('span','act',l.act), ic=actIcon(l.act); if(ic) ac.append(ic); txt.append(ac); }
    row.append(who,txt); ul.append(row); rd.lineEls[li]=row;
  });
  inn.append(ul); note.append(inn);
  // a lesson with a book picture ("picture" + a "spot" per line): the whole picture beside the words (above them on tall screens);
  // the thing being read gets a ring on the picture, and tapping a thing reads its line
  const bookPic=(LESSON.pagePictures&&LESSON.pagePictures[rd.page-1])||LESSON.picture;   // optional "pagePictures": one picture per page
  if(bookPic){
    const box=el('div','bpic'), fit=el('div','bfit',`<img src="${bookPic}" alt="">`);
    $('img',fit).addEventListener('load',e=>{ const im=e.target; if(im.naturalWidth) box.style.setProperty('--ar',im.naturalWidth/im.naturalHeight); });
    const same={};   // lines on the same part of the picture share ONE spot (a tap reads the first of them; the ring stays while any of them is read)
    LESSON.lines.forEach((l,li)=>{ if(!l.spot){ rd.spotEls.push(null); return; } const k=l.spot.join(','); if(same[k]){ rd.spotEls.push(same[k]); return; }
      const [x,y,w,h]=l.spot, b=el('button','spot'); same[k]=b;
      b.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%`; b.setAttribute('aria-label','Listen: '+l.words.map(w=>w[0]).join(' '));
      b.addEventListener('click',()=>playLine(li)); fit.append(b); rd.spotEls.push(b); });
    box.append(fit); scene.append(box);
  }
  scene.append(note);
  readPager(scene);
  stage.append(scene);
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
// pages of one lesson: two arrows in the bottom middle, and a mouse or finger swipe left / right
function readGo(d){ const np=nPages(); if(rd.page+d<1||rd.page+d>np) return; stopAll(); clearMarks(); rd.page+=d; lnavPaint(); showRead(); carAt(pageSpan()[0]); const [ps,pe]=pageSpan(); if(LESSON.lines.some(l=>l.page===rd.page)) playFrom(ps,pe,true); }   // the new page starts reading by itself
function readPager(scene){
  const np=nPages(); if(np<2) return;
  let x0=null,y0=0,sw=false;
  scene.addEventListener('pointerdown',e=>{ if(e.target.closest('.pager')) return; x0=e.clientX; y0=e.clientY; sw=false; });
  scene.addEventListener('pointerup',e=>{ if(x0==null) return; const dx=e.clientX-x0, dy=e.clientY-y0; x0=null;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){ sw=true; readGo(dx<0?1:-1); } });
  scene.addEventListener('pointercancel',()=>{ x0=null; });
  scene.addEventListener('click',e=>{ if(sw){ e.stopPropagation(); e.preventDefault(); sw=false; } },true);
}
// "layout": "pictures" (Lesson 2): no text card; each line is a picture ("pic") spread over the stage at "pos" [x, y] % (its centre),
// its word written under it. The word being read is marked as usual and its picture pops up a little; tapping the word (or the picture) reads it.
function showPics(){
  const scene=el('div','scene pics'+(LESSON.pkWrap?' wrap':'')), area=el('div','pkarea'), np=nPages();
  scene.append(el('p','task',STAR(true)+((LESSON.pageTasks&&LESSON.pageTasks[rd.page-1])||LESSON.task)), area);
  LESSON.lines.forEach((l,li)=>{
    if(np>1&&l.page!==rd.page) return;
    // tall pictures (the teacher) are made a bit taller, so all look about the same size
    if(l.more){ const prev=area.lastElementChild, row=el('span','txt'); l.words.forEach(([w,s,e],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); row.append(sp); if(k<l.words.length-1) row.append(' '); });
      row.addEventListener('click',ev=>{ if(ev.target===row) playLine(li); }); prev.append(row); rd.lineEls[li]=row; return; }   // "more": true = another sentence under the previous picture
    const [x,y]=l.pos||[50,50], it=el('div','pk'), pic=el('button','pkpic',`<img src="${l.pic}" alt="">`), txt=el('span','txt');
    it.style.cssText=`left:${x}%;top:${y}%`; if(l.posP){ it.classList.add('two'); it.style.cssText=`--lx:${x}%;--ly:${y}%;--px:${l.posP[0]}%;--py:${l.posP[1]}%`; }   // "posP": [x, y] on a tall screen $('img',pic).addEventListener('load',e=>{ const im=e.target; if(im.naturalWidth) it.style.setProperty('--k',l.k||Math.min(1.35,Math.max(.85,Math.sqrt(im.naturalHeight/im.naturalWidth)))); });
    if(l.mw) it.style.setProperty('--mw',l.mw+'cqw');   // optional per line: "k" = size factor, "mw" = widest it may be (% of the stage)
    pic.setAttribute('aria-label','Listen: '+l.words.map(w=>w[0]).join(' ')); pic.addEventListener('click',()=>playLine(li));
    l.words.forEach(([w,s,e],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); txt.append(sp); if(k<l.words.length-1) txt.append(' '); });
    it.append(pic,txt); area.append(it); rd.lineEls[li]=it;
  });
  readPager(scene);
  stage.append(scene);
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
// "bubbles" page (a book page with speech bubbles over a picture): LESSON.bk[page] = { img, ar:[wide screen, tall screen],
//   pic:{l:[x,y,w],p:[x,y,w]}, bubs:[{ l:[x,y,w,font], p:[x,y,w,font], tail:[% along the bottom, length in em], round }] } (l = wide screen, p = tall one;
//   x, w in % of the canvas width, y in % of its height, font in % of its width). A line says which bubble it is in ("bub"); tapping a sentence or a word reads it.
function showBubbles(){
  const cfg=LESSON.bk[rd.page], np=nPages(), scene=el('div','scene pics bub'), wrap=el('div','bkwrap'), cv=el('div','bk');
  const S=(e,k,v)=>e.style.setProperty(k,v), two=(e,k,a,i)=>{ S(e,'--l'+k,a.l[i]+(i<3?'%':'')); S(e,'--p'+k,a.p[i]+(i<3?'%':'')); };
  S(cv,'--ar',cfg.ar[0]); S(cv,'--arP',cfg.ar[1]);
  scene.append(el('p','task',STAR(true)+((LESSON.pageTasks&&LESSON.pageTasks[rd.page-1])||LESSON.task)),wrap); wrap.append(cv);
  const im=el('img','bkpic'); im.src=cfg.img; im.alt=''; ['x','y','w'].forEach((k,i)=>two(im,k,cfg.pic,i)); cv.append(im);
  const bs=cfg.bubs.map(b=>{ const d=el('div','bkb'+(b.round?' round':'')); ['x','y','w','f'].forEach((k,i)=>two(d,k,b,i)); S(d,'--tx',(b.tail?b.tail[0]:50)+'%'); S(d,'--tl',(b.tail?b.tail[1]:.9)+'em'); cv.append(d); return d; });
  LESSON.lines.forEach((l,li)=>{
    if(np>1&&l.page!==rd.page) return;
    const row=el('p','bks'); l.words.forEach(([w,s,e],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',ev=>{ ev.stopPropagation(); playFrom(Math.max(0,s-.04),e+.06); }); row.append(sp); if(k<l.words.length-1) row.append(' '); });
    row.addEventListener('click',()=>playLine(li)); bs[l.bub||0].append(row); rd.lineEls[li]=row;
  });
  readPager(scene);
  stage.append(scene);
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
// a stage direction like "(They shake hands)" gets a little moving picture beside it; it plays while that line is read
const ACT_ICONS=[[/shake hands/i,`<svg viewBox="0 13 80 40" aria-hidden="true"><g class="hs" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
  <path d="M3 47L15 30L27 38L17 51Z" fill="#4A90E2"/><path d="M77 47L65 30L53 38L63 51Z" fill="#E8457A"/>
  <path d="M15 30C21 21 31 18 41 21L49 25C51 30 46 36 38 38L27 38Z" fill="#F7C99A"/>
  <path d="M65 30C59 22 50 18 42 19C37 20 34 23 35 26C36 28 39 28 42 27L46 26L53 38Z" fill="#E9A96E"/>
  <path d="M42 27C38 29 33 31 30 30M44 31C40 33 35 35 31 34M46 35C42 37 38 38 34 38" fill="none" stroke-width="2.2"/>
  <path d="M35 26C33 22 36 17 40 17C44 17 45 20 43 23" fill="#F7C99A"/></g></svg>`]];
function actIcon(text){ const f=ACT_ICONS.find(([re])=>re.test(text)); if(!f) return null; const s=el('span','acticon',f[1]); return s; }
function playLine(li){ const l=LESSON.lines[li]; playFrom(Math.max(0,l.words[0][1]-.05),l.words[l.words.length-1][2]+.15); }
function readRail(){
  if(tab!=='read') return; const [ps,pe]=pageSpan(), res=!player.run&&player.pos>ps+.2, part=()=>rd.stopAt!=null&&!rd.full;
  const on=rd.playing||player.run;   // ONE button: Read while it is quiet, Stop while it reads; a tap toggles
  setRail([
    on?{kind:'stop',icon:'stop',label:tr('Stop'),click:()=>{ if(part()){ stopAll(); clearMarks(); } else pausePlay(); readRail(); }}
      :{kind:'go',icon:'play',label:tr(res?'Continue':'Read'),click:()=>playFrom(res?player.pos:ps,pe,true)},
    {kind:'again',icon:'restart',label:tr('Restart'),click:()=>playFrom(ps,pe,true)},
    {kind:'speed',icon:rd.slow?'slow':'fast',label:tr(rd.slow?'Slow':'Normal'),click:()=>{ const was=player.run&&!part(), t=now(); if(was){ halt(); player.run=false; } rd.slow=!rd.slow; rd.pick[LESSON.id+':'+rd.page]=rd.slow; if(was) playFrom(t,pe,true); else readRail(); }}
  ]);
}

function showGarage(){
  stage.innerHTML='';
  const g=el('div','garage',`<div><span class="car"></span><p class="outline">${tr('Coming soon!')}</p><span>${COURSE.hints.garage}</span></div>`);
  putCar(g.querySelector('.car'),'sad'); stage.append(g); setRail([]);
}
;
/* ===== js/vocab.js ===== */
/* VOCABULARY tab + the shared celebration. */
/* ---------- Celebration: used for every correct answer (word written, question answered) ---------- */
function fanfare(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>{ tone(f,'triangle',.11,.35); tone(f*2,'sine',.04,.3); },i*110)); setTimeout(()=>{ tone(1568,'sine',.05,.5,1.2); tone(2093,'sine',.04,.5); },480); }
function celebrate(target){
  fanfare(); confetti(110);
  if(!anim||!target) return;
  const r=target.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  for(let i=0;i<10;i++){ const s=el('div','spark',STAR(true)); document.body.append(s);
    const a=Math.PI*2*i/10, d=90+Math.random()*80;
    G.set(s,{left:cx,top:cy,xPercent:-50,yPercent:-50,scale:.2});
    G.to(s,{x:Math.cos(a)*d,y:Math.sin(a)*d,scale:.6+Math.random()*.5,rotation:Math.random()*360,duration:.7,ease:'power2.out'});
    G.to(s,{opacity:0,duration:.35,delay:.55,onComplete:()=>s.remove()}); }
  G.fromTo(target,{scale:1},{scale:1.15,duration:.15,yoyo:true,repeat:1,ease:'power1.out'});
}

/* ---------- Vocabulary: picture + word + meaning (with its own speaker); parts then whole word x3; then the child writes it ---------- */
const vs={i:0, run:0, mode:'learn', src:null, files:{}, pos:0, letters:[]};
let VDONE={}; try{ VDONE=JSON.parse(localStorage.getItem('zoom-vocab')||'{}')||{}; }catch(e){}
const vDone=()=>VDONE[LESSON.id]=VDONE[LESSON.id]||[];
const vSleep=(ms,run)=>new Promise((res,rej)=>setTimeout(()=>run===vs.run?res():rej('stop'),ms));
let lastCancel=0, keepU=[];
function vStop(){ vs.run++; try{ if(speechSynthesis.speaking||speechSynthesis.pending){ speechSynthesis.cancel(); lastCancel=Date.now(); } }catch(e){} if(vs.src){ try{vs.src.stop();}catch(e){} vs.src=null; } }
// talking voice of the device (used only where there is no recording yet)
// Arabic is NEVER machine-voiced: only Ahmed's recordings; a missing one stays silent
// voice packs: a paper (exam) ships voice.mp3 + voice.json made with the man's Kokoro voice; English text found there is played from it, the device voice is only the last resort
const VP={packs:[],key:t=>String(t||'').replace(/\s+/g,' ').trim().toLowerCase()};
async function vpLoad(base){
  VP.packs=[]; if(!base) return;
  try{ const [idx,ab]=await Promise.all([fetch(base+'voice.json').then(r=>r.json()),fetch(base+'voice.mp3').then(r=>r.arrayBuffer())]); await ensureCtx();
    const buf=await decodeSnd(player.ctx,ab); VP.packs.push({idx,buf}); }catch(e){}
}
function vpClip(text){ const k=VP.key(text); for(const p of VP.packs){ const c=p.idx[k]; if(c) return [p.buf,c]; } return null; }
function tts(text,lang='en',rate=.8){
  if(lang!=='ar'){ const c=vpClip(text); if(c) return playBuf(c[0],Math.max(0,c[1][0]-.02),c[1][1]-c[1][0]+.06); }
  return new Promise(res=>{
    if(lang==='ar'||!('speechSynthesis' in window)||!text){ setTimeout(res,350); return; }
    const go=()=>{
      try{ speechSynthesis.resume(); }catch(e){}
      const u=new SpeechSynthesisUtterance(text), vv=speechSynthesis.getVoices().filter(v=>v.lang.replace('_','-').toLowerCase().startsWith(lang));
      const pick=vv.find(v=>/google|natural|samantha|aria|jenny|salma|shakir|zeina|maged/i.test(v.name))||vv[0]; if(pick) u.voice=pick;
      u.lang=lang==='ar'?'ar-EG':'en-US'; u.rate=rate; u.volume=1;
      keepU.push(u); if(keepU.length>8) keepU.shift();   // Safari drops the end signal of utterances it forgets
      let done=false; const fin=()=>{ if(!done){ done=true; res(); } };
      u.onend=fin; u.onerror=fin; setTimeout(fin,1400+text.length*240/rate); speechSynthesis.speak(u);
    };
    const wait=Math.max(0,150-(Date.now()-lastCancel)); wait?setTimeout(go,wait):go();   // Safari ignores a voice started right after a stop
  });
}
// tapping a word of a sentence on the screen reads THAT word alone (a child learning to read needs to hear which word it is)
const TAPWORD='.xqt,.xtext,.xsec,.qask,.qsen>span:not(.qopts)', TAPSKIP='button,input,textarea,select,a,.xbl,.xo,.xit,.qopts,.xwarn';
function wordAtPoint(x,y){
  let n,o; if(document.caretPositionFromPoint){ const c=document.caretPositionFromPoint(x,y); if(c){ n=c.offsetNode; o=c.offset; } }
  else if(document.caretRangeFromPoint){ const r=document.caretRangeFromPoint(x,y); if(r){ n=r.startContainer; o=r.startOffset; } }
  if(!n||n.nodeType!==3) return '';
  const re=/[A-Za-z0-9\u0660-\u0669][A-Za-z0-9\u0660-\u0669']*/g; let m;
  while((m=re.exec(n.data))){ if(o>=m[0].length*0+m.index&&o<=m.index+m[0].length){
    const r=document.createRange(); r.setStart(n,m.index); r.setEnd(n,m.index+m[0].length);
    const hit=[...r.getClientRects()].some(b=>x>=b.left-3&&x<=b.right+3&&y>=b.top-3&&y<=b.bottom+3);
    return hit?m[0].replace(/^'+|'+$/g,''):''; } }
  return '';
}
document.addEventListener('click',e=>{
  const t=e.target; if(!t.closest||!t.closest(TAPWORD)||t.closest(TAPSKIP)||isAr()) return;
  const w=wordAtPoint(e.clientX,e.clientY); if(!w) return;
  vStop(); if(typeof stopAll==='function') stopAll(); tts(w.replace(/[\u0660-\u0669]/g,d=>d.charCodeAt(0)-0x660),'en',.75).catch(()=>{});
});
function playBuf(buf,from=0,dur){ return new Promise(res=>{ const s=player.ctx.createBufferSource(); s.buffer=buf; s.connect(player.ctx.destination);
  vs.src=s; s.onended=()=>{ if(vs.src===s) vs.src=null; res(); }; dur!=null?s.start(0,from,dur):s.start(0,from); }); }
async function playFile(url){ await ensureCtx();
  let buf=await libBuffer(url,player.ctx).catch(()=>null);   // a recording from the audio library wins; else the file in the app
  if(!buf){ const parts=await composeFiles(url).catch(()=>null);   // a sentence with variables: its pieces, one after the other
    if(parts){ const run=vs.run; for(let k=0;k<parts.length;k++){ if(run!==vs.run) return; await playFile(parts[k]); if(k<parts.length-1&&run===vs.run) await new Promise(r=>setTimeout(r,70)); } return; } }
  if(!buf){
    if(!vs.files[url]) vs.files[url]=fetch(url).then(r=>{ if(!r.ok) throw new Error('missing'); return r.arrayBuffer(); }).then(b=>decodeSnd(player.ctx,b)).catch(()=>{ delete vs.files[url]; return null; });
    buf=await vs.files[url];
  }
  if(!buf){ if(isAr()){ await nap(350); return; } throw new Error('missing audio'); }   // Arabic: a recording not made yet is silent
  return playBuf(buf); }
async function playClip([s,e]){ try{ await ensureAudio(); }catch(err){ return; } if(!player.bufs.n) return; return playBuf(player.bufs.n,Math.max(0,s-.03),e-s+.08); }   // single words: normal speed
const sayWord=v=>v.audio&&v.audio.word?playFile(v.audio.word):v.clip?playClip(v.clip):tts(v.word,isAr()?'ar':'en',.75);
// the whole word said after its parts (her second take sounds natural there); falls back to the first take
const sayWordAgain=v=>v.audio&&v.audio.again?playFile(v.audio.again):sayWord(v);
const sayAr=v=>v.audio&&v.audio.ar?playFile(v.audio.ar):tts(v.ar,'ar',.85);
const sayPart=p=>p.silent?new Promise(r=>setTimeout(r,350)):p.audio?playFile(p.audio):p.say?tts(p.say,isAr()?'ar':'en',.7):new Promise(r=>setTimeout(r,300));

// the small speaker next to a text: just a blue line drawing, not a round button
const SAY_LN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
function showWords(){
  stage.innerHTML='';
  vs.i=Math.min(vs.i,LESSON.vocab.length-1);
  $('#lesson').classList.add('vtab'); $('#lesson').classList.toggle('vmode',vMode()); setRail([]); vLayout();
  const wrap=el('div','vocab'), pick=el('div','vpick');
  LESSON.vocab.forEach((v,i)=>{ const b=el('button','vthumb'+(i===vs.i?' on':''),`${vMode()?`<span class="vtw">${v.word}</span>`:`<img src="${v.img}" alt=""${/\.png$/i.test(v.img)?' class="cut"':''}>`}<b>${i+1}</b>${vDone().includes(v.word)?`<span class="vst">${STAR(true)}</span>`:''}`);
    b.setAttribute('aria-label',`Word ${i+1}: ${v.word}`); b.addEventListener('click',()=>{ vs.i=i; vTeach(); }); pick.append(b); });
  wrap.innerHTML=`<div class="vword"></div>
    <div class="vinfo"><div class="vstatus"></div><div class="vmeaning" dir="rtl"><span class="vm-t"></span><button class="vm-say" aria-label="Arabic meaning">${SAY_LN}</button></div></div>
    <div class="vtools"></div><div class="vimgwrap"><img class="vimg" alt=""></div>`;
  wrap.append(pick); stage.append(wrap); vPickFit();
  $('.vm-say').addEventListener('click',e=>{ e.stopPropagation(); const v=LESSON.vocab[vs.i]; $('.vmeaning').classList.add('lit'); sayAr(v).then(()=>$('.vmeaning')&&$('.vmeaning').classList.remove('lit')); });
  vTools(); vRender(true); vRail(); vCar(false);
  if(vMode()){ $('.vword').addEventListener('click',()=>vMeanSay('word')); $('.vmeaning').addEventListener('click',()=>vMeanSay('rel')); }
  showHint(pick,LESSON.hints.vocabPick,900,'vocabPick');
  setTimeout(()=>{ if(tab==='words') vTeach(); },350);
}
function vRender(fill){
  const v=LESSON.vocab[vs.i], img=$('.vimg');
  if(!img._fit){ img._fit=1; img.addEventListener('load',vFitImg); }
  if(img.getAttribute('src')!==v.img){ img.src=v.img; if(anim){ G.set(img,{opacity:0}); const go=()=>G.to(img,{opacity:1,duration:.3}); img.decode?img.decode().then(go,go):go(); } }
  img.alt=v.word; img.classList.toggle('cut',/\.png$/i.test(v.img)); if(vMode()&&v.rel) $('.vm-t').innerHTML=`<small>${v.rel.label}</small><span>${v.rel.text}</span>`; else $('.vm-t').textContent=v.ar||''; $('.vmeaning').hidden=!(v.ar||v.rel);   // library cut-outs are png
  $$('.vthumb').forEach((b,i)=>b.classList.toggle('on',i===vs.i));
  const pk=$('.vpick'), on=$('.vthumb.on'); if(pk&&on&&pk.scrollWidth>pk.clientWidth) pk.scrollTo({left:on.offsetLeft-pk.clientWidth/2+on.offsetWidth/2,behavior:'smooth'});   // keep the current word in view in the strip
  const w=$('.vword'); w.innerHTML=''; w.classList.remove('lit','writing','focus');
  w.style.fontSize='';
  v.parts.forEach((p,pi)=>{ if(p.t===' '){ w.append(el('span','vgap')); return; }
    const s=el('span','vseg'); s.dataset.p=pi; glyphs(p.t).forEach(ch=>s.append(el('span','lt'+(fill?'':' hid'),ch))); w.append(s); });   // hidden letters keep their place
  fitWord();
}
const vStatus=t=>{ const s=$('.vstatus'); if(s){ s.textContent=t; if(anim) G.fromTo(s,{opacity:0},{opacity:1,duration:.3}); } };
// "meaning" lessons (nasheed): no spelling or writing; hear the word, then its meaning or plural (rel = {label,labelAudio,text,audio})
const vMode=()=>LESSON.vocabMode==='meaning';
const sayRel=v=>v.rel.labelAudio?playFile(v.rel.labelAudio).then(()=>v.rel.audio?playFile(v.rel.audio):0):tts(v.ar,'ar',.85);
async function vMeanSay(what){
  vStop(); const run=++vs.run, v=LESSON.vocab[vs.i]; vs.mode='idle'; vRail();
  try{
    if(what!=='rel'){ $('.vword').classList.add('lit'); await sayWord(v); if(run!==vs.run) return; $('.vword').classList.remove('lit'); await vSleep(500,run); }
    if(what!=='word'||vs.mode==='idle'){ $('.vmeaning').hidden=false; $('.vmeaning').classList.remove('hid'); $('.vmeaning').classList.add('lit'); await sayRel(v); if(run===vs.run) $('.vmeaning').classList.remove('lit'); }
  }catch(e){}
}
async function vMean(){
  vStop(); hideHint(); const run=++vs.run; vs.mode='learn'; vRail();
  const v=LESSON.vocab[vs.i]; vRender(true); vStatus(tr('Listen!')); $('.vmeaning').classList.add('hid');
  try{
    await vSleep(500,run);
    for(let rep=0;rep<2;rep++){
      $('.vword').classList.add('lit'); await sayWord(v); if(run!==vs.run) return; $('.vword').classList.remove('lit'); await vSleep(700,run);
      const m=$('.vmeaning'); m.classList.remove('hid'); m.classList.add('lit'); if(anim) G.from(m,{opacity:0,y:10,duration:.35});
      await sayRel(v); if(run!==vs.run) return; m.classList.remove('lit'); await vSleep(900,run);
    }
    vStatus(''); vs.mode='done'; vRail(); celebrate($('.vword'));
    const d=vDone(); if(!d.includes(v.word)){ d.push(v.word); try{ localStorage.setItem('zoom-vocab',JSON.stringify(VDONE)); }catch(e){} }
    vCar(true); const th=$$('.vthumb')[vs.i]; if(th&&!$('.vst',th)) th.append(el('span','vst',STAR(true)));
    await vSleep(1200,run); if(tab!=='words') return;
    const left=LESSON.vocab.map((x,i)=>i).filter(i=>!vDone().includes(LESSON.vocab[i].word));
    if(!left.length){ vs.mode='idle'; vRail(); award(LESSON.id,'words'); return; }
    vs.i=left.find(i=>i>vs.i) ?? left[0]; vMean();
  }catch(e){}
}
async function vTeach(){
  if(vMode()) return vMean();
  vStop(); hideHint(); const ip=$('#vin'); if(ip) ip.blur();
  const run=++vs.run; vs.mode='learn'; vRail();
  const v=LESSON.vocab[vs.i];
  vRender(true); vStatus(tr('Listen!'));
  if(anim) G.from('.vword .lt',{opacity:0,stagger:.04,duration:.3});
  try{
    await vSleep(500,run);
    $('.vword').classList.add('lit'); await sayWord(v); if(run!==vs.run) return; $('.vword').classList.remove('lit'); await vSleep(800,run);
    const reps=LESSON.vocabRepeats||3;   // fixed order: word once, then (parts -> whole word) x3
    for(let rep=1;rep<=reps;rep++){
      vStatus(isAr()?`${tr('Read with me!')} ${num(rep)}/${num(reps)}`:`Read with me! ${rep}/${reps}`);
      if(anim) await new Promise(r=>G.to('.vword .lt',{opacity:0,duration:.2,onComplete:r}));
      if(run!==vs.run) return;
      vRender(false); await vSleep(350,run);
      for(let pi=0;pi<v.parts.length;pi++){
        const p=v.parts[pi]; if(p.t===' '){ await vSleep(350,run); continue; }
        const seg=$(`.vseg[data-p="${pi}"]`), lts=$$('.lt',seg); seg.classList.add('on');
        const snd=sayPart(p);
        for(let k=0;k<lts.length;k++){ lts[k].classList.remove('hid'); if(anim) G.fromTo(lts[k],{scale:1.4},{scale:1,duration:.3,ease:'back.out(3)'}); await vSleep(260,run); }
        await snd; if(run!==vs.run) return;
        seg.classList.remove('on'); await vSleep(750,run);   // longer pause between parts than between letters
        if(p.blend){   // the sounds so far, joined: sh-a-k-e -> "shake"
          let k=pi; const grp=[]; while(k>=0 && v.parts[k].t!==' '){ const g=$(`.vseg[data-p="${k}"]`); if(g) grp.push(g); k--; }
          grp.forEach(g=>g.classList.add('on')); await playFile(p.blend); if(run!==vs.run) return; grp.forEach(g=>g.classList.remove('on')); await vSleep(650,run);
        }
      }
      $('.vword').classList.add('lit'); await sayWordAgain(v); if(run!==vs.run) return; await vSleep(700,run); $('.vword').classList.remove('lit'); await vSleep(500,run);
    }
    if(run===vs.run) vWrite();
  }catch(e){}
}
function vWrite(){
  vStop(); const run=vs.run; vs.mode='write'; vRail();
  const v=LESSON.vocab[vs.i]; vRender(false); $('.vword').classList.add('writing'); vStatus(tr(TOUCH()?'Tap and write!':'Your turn! Write it.'));
  const boxes=$$('.vword .lt'); vs.letters=glyphs(v.word).filter(c=>c!==' '); vs.pos=0; let typed='';
  const inp=el('input','vin'); Object.assign(inp,{type:'text',autocomplete:'off',spellcheck:false,id:'vin'});
  inp.setAttribute('autocorrect','off'); inp.setAttribute('autocapitalize','off'); inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Type the word');
  $('.vword').append(inp); $('.vword').addEventListener('click',()=>inp.focus({preventScroll:true}));
  inp.addEventListener('focus',()=>{ $('.vword').classList.add('focus'); if(vs.mode==='write') $('.vstatus').textContent=tr('Your turn! Write it.'); });
  inp.addEventListener('blur',()=>{ const w=$('.vword'); if(w) w.classList.remove('focus'); });
  const cur=()=>boxes.forEach((b,i)=>b.classList.toggle('cur',i===vs.pos));
  cur(); fitWord(); inp.focus({preventScroll:true});   // open the keyboard straight away (an iPhone/iPad only allows it right after a tap, e.g. on Write)
  showHint($('.vword'),LESSON.hints.vocabWrite,600,'vocabWrite');
  inp.addEventListener('input',()=>{
    hideHint(); const val=inp.value.replace(/\s/g,'');
    if(val.startsWith(typed)){
      for(const ch of val.slice(typed.length)){
        if(vs.pos>=vs.letters.length) break;
        const want=vs.letters[vs.pos];
        if(isAr()&&new RegExp('['+AR_MARKS+']').test(ch)){ typed+=ch; continue; }   // a vowel mark typed on its own is ignored
        if(isAr()?sameLetter(ch,want):ch.toLowerCase()===want.toLowerCase()){ const b=boxes[vs.pos]; b.classList.remove('hid','peek'); b.classList.add('good'); typed+=ch; blip(560+vs.pos*40,.05);
          if(anim) G.fromTo(b,{scale:1.3},{scale:1,duration:.35,ease:'back.out(3)'}); vs.pos++; }
        else { tone(170,'square',.06,.18); const b=boxes[vs.pos]; b.classList.add('bad'); if(anim) G.fromTo(b,{x:-7},{x:0,duration:.45,ease:'elastic.out(1.5,.25)'}); setTimeout(()=>b.classList.remove('bad'),400); break; }
      }
    }
    inp.value=typed; cur();
    if(vs.pos>=vs.letters.length && run===vs.run) vWin(v);
  });
}
// Help: show the letter the child is on (faintly) and say the sound of its part
function vHelp(){
  if(vs.mode!=='write') return; const v=LESSON.vocab[vs.i], boxes=$$('.vword .lt'), i=vs.pos; if(i>=boxes.length) return;
  const b=boxes[i]; b.classList.remove('hid'); b.classList.add('peek'); if(anim) G.fromTo(b,{scale:1.3},{scale:1,duration:.4,ease:'back.out(3)'});
  const seg=b.closest('.vseg'); const p=v.parts[+seg.dataset.p]; seg.classList.add('on'); sayPart(p).then(()=>seg.classList.remove('on'));
  setTimeout(()=>{ if(b.classList.contains('peek')){ b.classList.add('hid'); b.classList.remove('peek'); } },1600);
  const inp=$('#vin'); if(inp) inp.focus({preventScroll:true});
}
// word written right: celebrate, say the word, then go straight on to the next word (no "Next" button)
async function vWin(v){
  vs.mode='done'; vRail(); const run=vs.run;
  vStatus(''); celebrate($('.vword'));   // the celebration is the praise: no "Good job" said or written
  const d=vDone(); if(!d.includes(v.word)){ d.push(v.word); try{ localStorage.setItem('zoom-vocab',JSON.stringify(VDONE)); }catch(e){} }
  vCar(true);
  const th=$$('.vthumb')[vs.i]; if(th&&!$('.vst',th)) th.append(el('span','vst',STAR(true)));
  await new Promise(r=>setTimeout(r,500)); if(run!==vs.run) return;
  await sayWord(v); await new Promise(r=>setTimeout(r,700)); if(run!==vs.run||tab!=='words') return;
  if(vs.popup){ vs.mode='idle'; vRail(); const x=$('.wpclose'); if(x) x.click(); return; }   // popup: one word only, then back to the words page
  const left=LESSON.vocab.map((x,i)=>i).filter(i=>!vDone().includes(LESSON.vocab[i].word));
  if(!left.length){ const ip=$('#vin'); if(ip) ip.blur(); vs.mode='idle'; vRail(); award(LESSON.id,'words'); return; }
  vs.i=left.find(i=>i>vs.i) ?? left[0]; vTeach();
}
// the 5 buttons are made once and never move; vRail only fades the ones that can't be used now
function vTools(){
  const tools=$('.vtools'); tools.innerHTML='';
  const items=[
    {k:'help',kind:'speed',icon:'hint',label:isAr()?'ساعدني':tr('Help'),click:vHelp},
    {k:'listen',kind:'again',icon:'sound',label:isAr()?'اسمع الكلمة':tr('Listen'),click:()=>{ if(vMode()) return vMeanSay('all'); vStop(); if(vs.mode==='learn'){ vs.mode='idle'; vRail(); } sayWord(LESSON.vocab[vs.i]); }},
    {k:'teach',kind:'go',icon:'restart',label:isAr()?(vMode()?'علّمني':'علّمني الكلمة'):tr('Teach'),click:vTeach},
    {k:'write',kind:'speed',icon:'pencil',label:isAr()?'اكتب الكلمة':tr('Write'),click:()=>{ if(vs.mode!=='write') vWrite(); else { const i=$('#vin'); i&&i.focus({preventScroll:true}); } }},
    {k:'stop',kind:'stop',icon:'pause',label:tr('Stop'),click:()=>{ vStop(); if(vs.mode!=='write'){ vs.mode='idle'; vRail(); } }}
  ];
  (vMode()?items.filter(it=>!['help','write','listen'].includes(it.k)):items).forEach(it=>{ const b=el('button','dash '+it.kind+(it.icon==='restart'?' ln':''),`<span class="rb">${ICON[it.icon]}</span><span>${it.label}</span>`); b.dataset.k=it.k;
    b.addEventListener('pointerdown',e=>{ if($('#vin')&&$('#vin')===document.activeElement) e.preventDefault(); });   // keep the keyboard open
    b.addEventListener('click',it.click); tools.append(b); });
}
function vRail(){
  if(tab!=='words') return; const m=vs.mode, B=k=>$(`.vtools .dash[data-k="${k}"]`)||document.createElement('i'); if(!$('.vtools .dash')) return;
  B('help').classList.toggle('off',m!=='write');
  B('teach').classList.toggle('on',m==='learn');
  B('write').classList.toggle('on',m==='write');
  B('stop').classList.toggle('off',m!=='learn');
  ['listen','teach','write'].forEach(k=>B(k).classList.toggle('off',m==='done'));
}
// make the word fit on one line in its place
function fitWord(){
  const w=$('.vword'); if(!w) return; w.style.fontSize='';
  let fs=parseFloat(getComputedStyle(w).fontSize);
  for(let k=0;k<30 && w.scrollWidth>w.clientWidth+1 && fs>18;k++){ fs-=3; w.style.fontSize=fs+'px'; }
}
const TOUCH=()=>matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints>0 && !matchMedia('(pointer:fine)').matches;
/* Portrait or landscape, and the sizes, come from the screen size WITHOUT the keyboard:
   the keyboard makes the visible part short, but the page must not change when it opens. */
const vScr={w:innerWidth,h:innerHeight};
function vLayout(){
  const L=$('#lesson'); if(!L) return;
  const typing=document.activeElement&&document.activeElement.id==='vin';
  if(innerWidth!==vScr.w || innerHeight>vScr.h || !typing){ vScr.w=innerWidth; vScr.h=innerHeight; }   // only turning the device (or no keyboard) changes it
  const {w,h}=vScr, land=w>h*1.1, c=(a,x,b)=>Math.round(Math.max(a,Math.min(b,x)));
  L.classList.toggle('v-land',land); L.classList.toggle('v-port',!land); L.classList.toggle('v-short',h<500);
  if(!typing){ const st=$('#stage'); if(st&&st.clientHeight>0) vScr.sh=st.clientHeight; }
  const sh=vScr.sh||h*.62, n=(LESSON&&LESSON.vocab||[]).length||1;
  L.style.setProperty('--wfs',c(34,land?Math.min(w*.07,h*.13):Math.min(w*.13,h*.08),96)+'px');
  L.style.setProperty('--wbtn',c(38,land?Math.min(h*.08,w*.042):Math.min(w*.11,h*.06),60)+'px');
  L.style.setProperty('--pich',c(70,land?Math.min(sh*.78,w*.3):Math.min(w*.45,h*.2),520)+'px');
  L.style.setProperty('--vgap',c(6,h*.014,16)+'px');
  if(land){   // the word pictures: as many columns as give the biggest pictures, filling the right-hand column
    const pw=w*.26, pad=30, gap=c(5,sh*.02,12); let best=[0,1];
    for(let cols=1;cols<=3;cols++){ const rows=Math.ceil(n/cols), cw=(pw-(cols-1)*gap)/cols, chh=(sh-pad-(rows-1)*gap)/rows, s=Math.min(cw,chh*4/3); if(s>best[0]) best=[s,cols]; }
    L.style.setProperty('--pw',Math.round(pw)+'px'); L.style.setProperty('--pcols',best[1]); L.style.setProperty('--pgap',gap+'px');
    L.style.setProperty('--thumb',c(40,best[0],140)+'px');
  } else { L.style.setProperty('--thumb',c(48,Math.min(w*.14,h*.07),90)+'px'); }
}
// the picture's white frame hugs the picture (no empty strips): the box is cut to the picture's own proportions, as big as the room allows
function vFitImg(){ const im=$('.vimg'), wrap=im&&im.parentElement; if(!im||!im.naturalWidth||!wrap||!wrap.clientWidth) return;
  const b=parseFloat(getComputedStyle(im).borderTopWidth)||0, pich=parseFloat($('#lesson').style.getPropertyValue('--pich'))||140, ar=im.naturalWidth/im.naturalHeight;
  const bw=wrap.clientWidth-8-2*b, bh=wrap.clientHeight-8-2*b; let h=Math.min(pich,bh), w=h*ar; if(w>bw){ w=bw; h=w/ar; }
  im.style.width=Math.max(20,w)+'px'; im.style.height=Math.max(20,h)+'px'; }
// word buttons without pictures (vmode) in the landscape column: as many columns as it takes so every word shows whole (never cut at the bottom)
function vPickFit(){ const pk=$('.vpick'); if(!pk) return; pk.style.gridTemplateColumns=''; if(!$('#lesson').classList.contains('vmode')||!$('#lesson').classList.contains('v-land')) return;
  for(let c=2;c<=4&&pk.scrollHeight>pk.clientHeight+1;c++) pk.style.gridTemplateColumns=`repeat(${c},auto)`; }
addEventListener('resize',()=>{ if(tab==='words'){ vLayout(); fitWord(); vPickFit(); setTimeout(vFitImg,60); } });
// iPhone may slide the page under the keyboard: slide it back so everything stays exactly where it was
if(window.visualViewport) visualViewport.addEventListener('scroll',()=>{ if(scrollY) scrollTo(0,0); });

// the car in the header moves one step for every word learned
function vCar(drive){ const n=LESSON.vocab.length||1; if(drive){ carDrive(true); setTimeout(()=>carDrive(false),900); } carFrac(vDone().length/n); }

/* ---------- Pen on lesson words: a word that is also in this lesson's Words tab gets a small pen; it opens that ONE word in the usual
   learn-then-write page as a popup over the page the child is on, and closing it puts him back exactly there ---------- */
const WP={saved:null};
function wpClose(){
  const s=WP.saved; if(!s) return; WP.saved=null; vStop(); vs.popup=0; vs.mode='idle';
  s.L.vocab=s.vocab; vs.i=s.i; tab=s.tab; const L=$('#lesson'); L.className=s.cls;
  stage.innerHTML=''; s.stage.forEach(n=>stage.append(n)); rail.innerHTML=''; s.rail.forEach(n=>rail.append(n)); trackCar.style.transform=s.car;
}
function wpOpen(v){
  if(WP.saved) return;
  const L=$('#lesson'); stopAll(); vStop(); hideHint();
  WP.saved={L:LESSON,vocab:LESSON.vocab,i:vs.i,tab,cls:L.className,stage:[...stage.childNodes],rail:[...rail.childNodes],car:trackCar.style.transform};
  LESSON.vocab=[v]; vs.i=0; vs.popup=1; tab='words'; L.classList.add('wpop');
  showWords();
  const x=el('button','wpclose','✕'); x.setAttribute('aria-label','Close'); stage.append(x); x.addEventListener('click',wpClose);
}
const wpKey=t=>String(t||'').toLowerCase().replace(/[^a-z']/g,'');
function penify(){
  if(isAr()||!LESSON||!LESSON.vocab||!LESSON.vocab.length||tab==='words'||WP.saved) return;
  const by={}; LESSON.vocab.forEach(v=>{ if(/^[A-Za-z']+$/.test(v.word)) by[wpKey(v.word)]=v; });
  $$('#stage .w, #stage .alw').forEach(sp=>{
    if(sp._pen!==undefined) return; const v=by[wpKey(sp.firstChild&&sp.firstChild.nodeType===3?sp.firstChild.data:sp.textContent)]; sp._pen=v?1:0; if(!v) return;
    const b=el('span','wpn',ICON.pencil); b.setAttribute('role','button'); b.setAttribute('aria-label','Learn the word '+v.word);
    b.addEventListener('click',e=>{ e.stopPropagation(); e.preventDefault(); wpOpen(v); }); sp.append(b);
  });
}
{ let pt=0; new MutationObserver(()=>{ clearTimeout(pt); pt=setTimeout(penify,60); }).observe(stage,{childList:true,subtree:true}); }
;
/* ===== js/quiz.js ===== */
/* QUESTIONS tab — the book's exercises as a game. Content: data/<subject>/<lesson>/questions.json.
   One fixed sheet: task line + book page on top, progress stars, the word, then the picture(s).
   pick  = listen, tap the matching picture (two pictures side by side)
   yesno = one picture + word, tap the tick or the cross
   match = one board like the book: the letter in the middle ("center"), the pictures around it at "pos" [x, y] (% of the board);
           tap a picture that starts with it: a line joins it to the letter; a wrong one shakes. One progress star per right picture.
   circle = a board like match but without the letter in the middle: all pictures are on the screen, tap the ones that fit the task;
            a right one gets a ring + celebration, a wrong one an alarm. One progress star per right picture.
   tick   = all pictures on the screen at once, each with its word and a tick and a cross (both faded): the child taps the right one, which lights up
            (a wrong tap = alarm); "answer": true/false. One progress star per picture.
   letter = one picture + the word with its first letter missing (_eacher), tap the beginning letter: "letters": ["t","i"], "answer": index
   link   = book "Match the picture with the correct word": all the words in one row (a column on tall phones when there are many) and all the pictures in the other row;
            the child drags a line from a word to its picture (or taps one, then the other). "layout":"cols" = words left, pictures right. One star per pair. item "full": audio (or a list played in order, built from the words' own recordings) of the joined phrase (e.g. أَنَا أَشْعُرُ), said when that pair is joined; rule: say the whole phrase, not only the first word.
   choice = book "circle the correct word": the picture, beside it the text (optional "ask" line, "lead", and "options":[a,b] with "answer": index); tap the right word, it gets a ring.
   Options on a set: "mark":"ring" (pick: the right picture gets a ring, not a tick), "silent":true (circle: do not say the word when it is circled).
   type   = one picture + the word with a letter missing ("missing": its index), the child types it on the keyboard: "answer": "t"
   On wide screens the choices (tick/cross, letters, the keyboard button) sit right beside the picture, not at the sheet's edge.
   A right answer: stamp + celebrate (no spoken praise), then on to the next question by itself. A wrong one: a shake, try again.
   Two books: each set says "book": "book" (the student's book, default) or "workbook"; two buttons on top switch between them. */
const qz={sets:null,all:[],list:[],src:'book',i:0,run:0,busy:false,file:null,show:0};
/* THE QUESTION MODELS (docs/RULES.md §6, Marwa 2026-10-20): ONE model per question type, the same in every subject.
   QM[type] = { sheet: 'word' (the word line + the play area) | 'board' (one board for the whole set) | 'box' (one part in the play area),
                draw(...)   how it is shown and solved,  help(q,w)  what the Help bulb lights (nothing = no bulb),
                bulb:0 = the model has its own help,  own:1 = reads itself (no speaker added, no auto-read),
                side:1 = the answers sit beside the picture on wide screens,  fit:0 = no picture stacking }
   Every type registers here (quiz.js, quiz-letters.js, quiz-al.js, quiz-math.js) and qGo draws it through this one path.
   A design change is made in the model, so every question of that type changes together. */
const QM={};
const Q_SRC={book:['Book',ICON.book],workbook:['PTS','<svg viewBox="0 0 24 24"><path d="M5 19l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L9 18z"/><path d="M14.5 6.5l3 3"/><path d="M5 19h14"/></svg>']};
const R_Q=p=>{ const f=qz.file||''; return p&&!/^(https?:|\/|data:)/.test(p)?f.slice(0,f.lastIndexOf('/')+1)+p:p; };
const qSrcOf=s=>s.book||'book';
const tabSrc=()=>({workbook:'workbook',booklet:'booklet'}[tab]||'book');   // the book a Questions-style tab shows: Q = Book, PTS = Workbook, Booklet
// the books that really have questions in this lesson (a book with none yet shows no button); other books (booklet ...) can be added by a set's "book":"booklet"
const qSrcInfo=k=>Q_SRC[k]||[k[0].toUpperCase()+k.slice(1),ICON.book];
const qSrcList=()=>isAL()?[]:[...new Set(['book',...qz.all.map(q=>qSrcOf(q.set))])].filter(k=>qz.all.some(q=>qSrcOf(q.set)===k)).sort((a,b)=>(Object.keys(Q_SRC).indexOf(a)+1||9)-(Object.keys(Q_SRC).indexOf(b)+1||9)).map(k=>[k,qSrcInfo(k)]);
const Q_ARR='<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
const Q_KEY='<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h1M11.5 10h1M16.5 10h1M8 14h8"/></svg>';
const Q_TICK='<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 6.5"/></svg>', Q_CROSS='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

async function qLoad(){
  const m=SUBJECT&&SUBJECT.lessons.find(l=>l.id===LESSON.id); if(!m) return false;
  const file=m.file.replace(/lesson\.json$/,'questions.json');
  if(qz.file===file&&qz.sets) return true;
  const base=file.slice(0,file.lastIndexOf('/')+1), R=p=>p&&!/^(https?:|\/|data:)/.test(p)?base+p:p;
  try{ const d=await get(file); qz.sets=d.sets; qz.file=file; }catch(e){ qz.sets=null; qz.file=null; return false; }
  qz.all=[]; qz.sets.forEach((s,si)=>{ s.taskSrc=Array.isArray(s.taskAudio)?s.taskAudio.map(R):R(s.taskAudio);   // taskAudio: one file, or a list played in order (prompt + letter name)
   
    if(s.type==='link') s.items.forEach(it=>{ it.answer=true; it.fullSrc=[].concat(it.full||[]).map(R); });
    if((QM[s.type]||{}).sheet==='board'){ s.centerSrc=R(s.centerAudio); s.items.forEach(it=>{ it.src=R(it.audio); it.src2=it.audio2?R(it.audio2):it.src; it.picSrc=R(it.pic); if(it.dots&&typeof mDots==='function') it.picSrc=mDots(it.dots); });
      if(s.type==='circle'&&s.shuffle&&!s._sh){ s._sh=1; const ps=s.items.map(it=>it.pos); for(let t=0;t<20;t++){ ps.sort(()=>Math.random()-.5); if(ps.some((p,k)=>p!==s.items[k].pos)) break; } s.items.forEach((it,k)=>it.pos=ps[k]); }   // "shuffle": the options swap their places (the book order is not kept)
      if(s.type==='circle') s.items.forEach((it,k)=>{ if(!it.pos){ const n=s.items.length, cols=3, rows=Math.ceil(n/cols), r=Math.floor(k/cols), c=k%cols, inRow=Math.min(cols,n-r*cols);
        it.pos=[(c+.5+(cols-inRow)/2)*100/cols,(r+.5)*100/rows]; } });   // no "pos": spread them in rows of 3
      s.items.filter(it=>s.type==='tick'||it.answer).forEach((it,k)=>qz.all.push({set:s,si,k,word:s.center||''})); return; }
    if(s.type==='qa'&&s.together){ qz.all.push({set:s,si,k:0,together:1,items:s.items.map(it=>({...it,audio:R(it.audio),ansAudio:it.ansAudio,pic:R(it.pic)}))}); return; }   // "together": all the question+answer pairs on one page
    s.items.forEach((it,k)=>{
    const q={...it,set:s,si,k,audio:R(it.audio)}; if(it.pics) q.pics=it.pics.map(R); if(it.pic) q.pic=R(it.pic); qz.all.push(q); }); });
  preloadImgs(qz.sets.flatMap(s=>[s.centerPic&&R(s.centerPic),...(s.items||[]).flatMap(it=>[...(it.pics||[]).map(R),it.pic&&R(it.pic)])]));
  qPick(qz.src); return true;
}
async function showQuiz(start){
  stage.innerHTML=''; setRail([]); $('#lesson').classList.add('qtab');
  const me=++qz.show; busy(true); const ok=await qLoad(); busy(false);
  if(!inQ()||me!==qz.show) return;   // another tab, or a newer call (e.g. a book page jump) took over
  stage.innerHTML='';
  if(!ok||!qz.all.length){ $('#lesson').classList.remove('qtab'); showGarage(); return; }
  qPick(isAL()?alSrc():tabSrc());
  if(!qz.list.length){ $('#lesson').classList.remove('qtab'); showGarage(); return; }
  const wrap=el('div','quiz');
  wrap.innerHTML=`<div class="qhead"><span class="qex"></span><span class="qtask"></span><button class="qsay qtsay" aria-label="Hear the question">${typeof SAY_LN==="string"?SAY_LN:ICON.sound}</button>${LESSON.tool?`<button class="qtool" aria-label="Make numbers tool"><img src="data/tools/make-numbers/icon.webp" alt=""></button>`:''}</div>
    <div class="qdots"></div>
    <div class="qword" dir="ltr"><b></b><button class="qsay" aria-label="Listen again">${typeof SAY_LN==="string"?SAY_LN:ICON.sound}</button></div>
    <div class="qplay"></div><div class="qans"></div><button class="qhelpb" aria-label="${isAr()?'ساعدني':tr('Help')}" hidden>${ICON.hint}</button>`;
  stage.append(wrap);
  $('.qword .qsay',wrap).addEventListener('click',()=>qSay());
  $('.qtsay',wrap).addEventListener('click',()=>qTask());
  $('.qhelpb',wrap).onclick=()=>qHelp();
  $('.qword',wrap).addEventListener('click',e=>{ if(wrap.dataset.type==='type'&&!e.target.closest('.qsay')) qFocus(); });
  qStart(start!=null?start:0);
}
// the questions of one book (Book or Workbook)
function qPick(src){ qz.src=src; qz.list=qz.all.filter(q=>qSrcOf(q.set)===src); }
function qStart(i){ const w=$('.quiz'); if(!w) return;
  $('.qdots',w).innerHTML=qz.list.map((q,k)=>`<i data-i="${k}">${STAR(false)}</i>`).join('');
  $('.qdots',w).onclick=e=>{ const d=e.target.closest('i[data-i]'); if(!d) return; hideHint(); qz.busy=false; qGo(+d.dataset.i); };   // each star opens its own question
  qLayout(); qGo(Math.min(i,qz.list.length-1)); }
// the arrows: to the start of the next / previous exercise of this book (not the items inside one)
const qGrp=s=>s.grp?s.page+'|'+s.grp:s.ex!=null?s.page+'|'+s.ex:s;   // sets with the same book exercise (e.g. one circle set per colour) are ONE exercise for the arrows
function qSetStart(d){ const s=qz.list[qz.i]&&qz.list[qz.i].set; if(!s) return -1; const g=qGrp(s); let i=qz.i;
  if(d>0){ while(i<qz.list.length&&qGrp(qz.list[i].set)===g) i++; return i<qz.list.length?i:-1; }
  while(i>0&&qGrp(qz.list[i-1].set)===g) i--; if(i===0) return -1; const p=qGrp(qz.list[i-1].set); i--; while(i>0&&qGrp(qz.list[i-1].set)===p) i--; return i; }
function qSet(d){ const i=qSetStart(d); if(i<0) return; hideHint(); blip(600); qGo(i); }
// which question a book page starts at (used by the page jump); picks Book or Workbook from the page
function qFirstOnPage(p,src){ const f=qz.all.find(q=>q.set.page===p&&(!src||qSrcOf(q.set)===src)); qPick(f?qSrcOf(f.set):src||'book');
  const i=qz.list.findIndex(q=>q.set.page===p); return i<0?0:i; }
function qGo(i){
  vStop(); hideHint(); setTimeout(qHelpShow,60); const run=++qz.run; qz.i=i; qz.busy=false;
  const q=qz.list[i], s=q.set, w=$('.quiz'); if(!w) return;
  w.dataset.type=s.type;
  let mdl=$('.qmodel',w); if(!mdl){ mdl=el('span','qmodel'); $('.qhead',w).prepend(mdl); } mdl.textContent=s.model||''; mdl.hidden=!s.model;   // "model": the paper's heading (Model 1) shown as a yellow pill
  $('.qex',w).textContent=s.ex!=null?num(s.ex):''; $('.qex',w).hidden=!s.ex; $('.qtask',w).textContent=s.task;
  footPage(s.page); lnavPaint();
  $$('.qdots i',w).forEach((d,k)=>{ d.classList.toggle('cur',k===i); });
  if($('#lesson').classList.contains('qrail')){ $('#lesson').classList.remove('qrail'); setRail([]); }   // the side Listen / Stop button belongs to the 'together' page only
  const a0=$('.qans',w); if(a0.parentElement!==w) w.append(a0);   // back in its own place before the pictures are cleared (qLayout moves it beside the picture)
  const qi=$('#qin'); if(qi&&s.type!=='type'){ qi.blur(); qi.remove(); }
  const qxi=$('#qxin'); if(qxi&&s.type!=='write'){ qxi.blur(); qxi.remove(); }
  const m=QM[s.type]; if(!m) return;
  if(m.sheet==='board') return qBoard(w,q,i,run);
  w._board=null;
  if(m.sheet==='box') return qxGo(w,q,i,run);
  // the word line: the word (letter / type: with its gaps), the play area, the answers
  $('.qword b',w).innerHTML=m.word?m.word(q):q.word;
  const play=$('.qplay',w), ans=$('.qans',w); play.innerHTML=''; ans.innerHTML='';
  m.draw(play,ans,q,s);
  qLayout(); carFrac(i/qz.list.length);
  // the first question of each exercise: the instruction is read first, then the word
  setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; if(qNewEx()) await qTask(); if(run===qz.run&&inQ()){ if(s.type==='type') qFocus(); qSay(); } },350);
}
// letter / type: the word with its gaps ("missing" = one letter, "gaps" = several, typed left to right), filled in when the child finds them
const qGapWord=q=>{ const gps=q.gaps||[q.missing||0]; return (q.scr?`<span class="qscr">${q.scr.split('').join(' ')}</span>`:'')+[...q.word].map((c,k)=>gps.includes(k)?`<span class="qgap" data-i="${k}">_</span>`:c).join(''); };
const qOnePic=q=>el('div','qpic one',`<img src="${q.pic}" alt="${q.word||''}"><span class="qmark"></span>`);
const qHalf=a=>{ const o=a.map((x,k)=>k); if(Math.random()<.5) o.reverse(); return o; };   // the right one is not always on the same side
QM.pick={sheet:'word', draw(play,ans,q){ qHalf(q.pics).forEach(k=>{ const b=el('button','qpic',`<img src="${q.pics[k]}" alt=""><span class="qmark"></span>`); b.setAttribute('aria-label','Picture '+(k+1)); b.dataset.k=k;
    b.addEventListener('click',()=>qAnswer(b,k===q.answer)); play.append(b); }); },
  help:(q,w)=>$$('.qpic',w).filter(b=>+b.dataset.k===q.answer)};
QM.letter={sheet:'word', side:1, word:qGapWord, draw(play,ans,q){ play.append(qOnePic(q));
    qHalf(q.letters).forEach(k=>{ const b=el('button','rb qbtn qlet'+(q.letters[k].length>1?' two':''),`<span>${q.letters[k]}</span>`); b.setAttribute('aria-label','Letter '+q.letters[k]); b.dataset.k=k;
      b.addEventListener('click',()=>qAnswer(b,k===q.answer)); ans.append(b); }); },
  help:(q,w)=>$$('.qans .qlet',w).filter(b=>+b.dataset.k===q.answer)};
QM.choice={sheet:'word', fit:0, draw(play,ans,q){ play.append(el('div','qpic one',`<img src="${q.pic}" alt="">`));
    const t=el('div','qtxt',`${q.ask?`<div class="qask">${q.ask}</div>`:''}<div class="qsen">${q.lead?`<span>${q.lead}</span> `:''}<span class="qopts">(${q.options.map(o=>`<button class="qopt">${o}</button>`).join(' - ')})</span>${q.tail?` <span>${q.tail}</span>`:''}<button class="qsay" aria-label="Listen again">${SAY_LN}</button></div>`);
    $$('.qopt',t).forEach((b,k)=>b.addEventListener('click',()=>qChoose(b,k,q))); $('.qsay',t).addEventListener('click',()=>qSay());
    play.append(t); },
  help:(q,w)=>[$$('.qopt',w)[q.answer]].filter(Boolean)};
QM.type={sheet:'word', side:1, word:qGapWord, draw(play,ans,q){ play.append(qOnePic(q));
    qFocus(); },   // the keyboard stays open from one word to the next; it first opens when the instruction has been read (or when the child taps the letter)
  help:(q,w)=>[$('.qword .qgap:not(.got)',w)].filter(Boolean)};
QM.yesno={sheet:'word', side:1, draw(play,ans,q){ play.append(qOnePic(q));
    [[true,'yes',Q_TICK,'It matches'],[false,'no',Q_CROSS,'It does not match']].forEach(([v,c,ic,l])=>{
      const b=el('button','rb qbtn '+c,ic); b.setAttribute('aria-label',l); b.addEventListener('click',()=>qAnswer(b,v===q.answer,v)); ans.append(b); }); },
  help:(q,w)=>[$(q.answer?'.qans .qbtn.yes':'.qans .qbtn.no',w)].filter(Boolean)};
// the match board: built once per set; each right picture joined moves on to the next star without rebuilding it
function qBoard(w,q,i,run){
  const s=q.set; carFrac(i/qz.list.length); qLayout();
  if(w._board===s) return;
  w._board=s; const play=$('.qplay',w); play.innerHTML=''; $('.qans',w).innerHTML='';
  QM[s.type].draw(w,s,play,run);
}
// match / circle: the pictures (or words) on one board like the book, the letter / picture in the middle when the set has one
function qPicBoard(w,s,play,run){
  const b=el('div','qboard'); if(s.bigP) b.classList.add('bigP');   // "bigP": bigger pictures on tall screens (with "posP" per item)
  if(s.centerPic){ const c=el('div','qcenter pic',`<img src="${R_Q(s.centerPic)}" alt="">`); if(s.centerAt){ c.style.setProperty('--cx',s.centerAt[0]); c.style.setProperty('--cy',s.centerAt[1]); } b.append(c); }   // "centerPic": a picture to match (book: circle the SIMILAR picture)
  if(s.center){ const c=el('button','qcenter',`<span>${s.center}</span>`); c.setAttribute('aria-label','Letter '+s.center); c.addEventListener('click',()=>qSound(s.centerSrc,s.center[0]));
    b.append(c); }
  s.items.forEach(it=>{ const p=el('button','qmp'+(it.picSrc?'':' tx'),(it.picSrc?`<img src="${it.picSrc}" alt="">`:`<b>${it.word}</b>`)+`<span class="qmark"></span>`); p.setAttribute('aria-label',it.word);   // a word-only option (book: circle the different WORD)
    const ps=it.posP&&!$('#lesson').classList.contains('q-land')?it.posP:it.pos; p.style.left=`clamp(calc(var(--w) / 2), ${ps[0]}%, calc(100% - var(--w) / 2))`; p.style.top=`clamp(calc(var(--w) / 2), ${ps[1]}%, calc(100% - var(--w) / 2))`; p.addEventListener('click',()=>qMatch(p,it,s)); b.append(p); });
  play.append(b);
  // the first time: read the instruction, then the letter's sound
  const first=qNewEx(); setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; if(first) await qTask(); if(s.center&&qz.list[qz.i]&&qz.list[qz.i].set===s&&inQ()) qSound(s.centerSrc,s.center[0]); },350);
}
// tick: every picture of the exercise on one sheet, each with its word and a tick and a cross; the right one lights up when tapped
function qSheet(w,s,play,run){
  const sh=el('div','qsheet'); s.left=s.items.length;
  s.items.forEach(it=>{ const c=el('div','qcell');
    c.innerHTML=`<button class="qcw" aria-label="${it.word}"><b>${it.word}</b></button><button class="qcp"><img src="${it.picSrc}" alt=""></button><div class="qcb"></div>`;
    [[true,'yes',Q_TICK,'It matches'],[false,'no',Q_CROSS,'It does not match']].forEach(([v,cl,ic,l])=>{
      const b=el('button','qbtn qt '+cl,ic); b.setAttribute('aria-label',l); b.addEventListener('click',()=>qTick(c,it,s,v,b)); $('.qcb',c).append(b); });
    [$('.qcw',c),$('.qcp',c)].forEach(x=>x.addEventListener('click',()=>qSound(it.src,it.word)));
    sh.append(c); });
  play.append(sh);
  if(qNewEx()) setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; await qTask(); },350);
}
async function qTick(cell,it,s,val,btn){
  if(qz.busy||cell.classList.contains('done')) return; hideHint();
  if(val!==it.answer) return qBad(btn);
  const run=qz.run; cell.classList.add('done'); btn.classList.add('on'); celebrate(btn); qSound(it.src,it.word);
  qStar();
  const next=qz.i+1;
  if(next>=qz.list.length||qz.list[next].set!==s){ qz.busy=true; await new Promise(r=>setTimeout(r,1400)); if(run!==qz.run||!inQ()) return; qz.busy=false;
    if(next>=qz.list.length) award(LESSON.id,qKey()); else qGo(next); return; }
  qz.i=next; $$('.qdots i').forEach((x,k)=>x.classList.toggle('cur',k===next));   // same sheet: just move the star on
}
// the lines of the joined pictures, worked out again when the screen changes size
function qLines(fresh){ const bd=$('.qboard'); if(!bd||$('.quiz').dataset.type!=='match') return; const c=$('.qcenter span',bd); if(!c) return; const B=bd.getBoundingClientRect();
  const mid=e=>{ const r=e.getBoundingClientRect(); return [r.left+r.width/2-B.left,r.top+r.height/2-B.top]; }, [x2,y2]=mid(c);
  $$('.qmp.done',bd).forEach(p=>{ let ln=p._line; if(!ln){ ln=p._line=el('i','qline'); bd.prepend(ln); }
    const [x1,y1]=mid(p), len=Math.hypot(x2-x1,y2-y1);
    ln.style.cssText=`left:${x1}px;top:${y1}px;width:${len}px;transform:rotate(${Math.atan2(y2-y1,x2-x1)}rad)`+(p===fresh?' scaleX(0)':'');
    if(p===fresh) requestAnimationFrame(()=>requestAnimationFrame(()=>{ ln.style.transform=`rotate(${Math.atan2(y2-y1,x2-x1)}rad) scaleX(1)`; })); });
}
// the same for every model: a right answer lights its progress star and moves the car on; a wrong one gives the soft alarm + a shake
function qStar(){ const d=$(`.qdots i[data-i="${qz.i}"]`); if(d){ d.innerHTML=STAR(true); d.classList.add('got'); if(anim) G.fromTo(d,{scale:1.8},{scale:1,duration:.6,ease:'elastic.out(1.2,.4)'}); } carFrac((qz.i+1)/qz.list.length); }
const qCross=b=>{ const m=$('.qmark',b); if(!m) return; m.className='qmark bad'; m.innerHTML=Q_CROSS; setTimeout(()=>{ m.className='qmark'; m.innerHTML=''; },700); };   // a wrong picture: a red cross for a moment
function qBad(b){ tone(170,'square',.06,.18); if(anim) G.fromTo(b,{x:-9},{x:0,duration:.5,ease:'elastic.out(1.5,.25)'}); }
function qSound(src,text){ vStop(); return (src?playFile(src).catch(()=>tts(text,isAr()?'ar':'en',.75)):tts(text,isAr()?'ar':'en',.75)).catch(()=>{}); }
async function qMatch(btn,it,s){
  if(qz.busy) return; hideHint();
  if(btn.classList.contains('done')) return s.silent?null:qSound(it.src,it.word);
  if(!it.answer){
    qCross(btn); return qBad(btn);
  }
  const run=qz.run, more=qSetMoreAfter(s); btn.classList.add('done'); if(!more) qz.busy=true;
  // a line from the picture to the letter in the middle, drawn out like a pencil line
  if(s.type==='match') qLines(btn);
  if(s.type==='circle'&&anim) G.fromTo(btn,{'--ring':1.5},{'--ring':1,duration:.4,ease:'back.out(2)'});
  celebrate(btn); if(!s.silent) qSound(it.src,it.word);
  if(qMore(s)) return; return qDone(s,run,1100);
}
// a right answer of a board that has more answers still to find: its star, and on to the next one at once (nothing waits, so the child can tap the next right picture straight away)
const qBoardHelp=(q,w)=>{ const s=q.set, ps=$$('.qmp',w), it=s.items.find((x,k)=>x.answer&&ps[k]&&!ps[k].classList.contains('done')); return it?[ps[s.items.indexOf(it)]]:[]; };
QM.match={sheet:'board', draw:qPicBoard, help:qBoardHelp};
QM.circle={sheet:'board', draw:qPicBoard, help:qBoardHelp};
QM.tick={sheet:'board', draw:qSheet, help:(q,w)=>{ const cs=$$('.qcell',w), c=cs.find(c=>!c.classList.contains('done')); if(!c) return []; const it=q.set.items[cs.indexOf(c)]; return [$(it.answer?'.qbtn.yes':'.qbtn.no',c)].filter(Boolean); }};
const qSetMoreAfter=s=>qz.i+1<qz.list.length&&qz.list[qz.i+1].set===s;
function qMore(s){ const next=qz.i+1; if(next>=qz.list.length||qz.list[next].set!==s) return false;
  qStar(); qz.i=next; $$('.qdots i').forEach((x,k)=>x.classList.toggle('cur',k===next));
  lnavPaint(); return true; }
// one more right answer of a board: its star, then on to the next one (the same board stays when the exercise has more)
async function qDone(s,run,ms){
  qStar();
  await new Promise(r=>setTimeout(r,ms)); if(run!==qz.run||!inQ()) return;
  const next=qz.i+1;
  if(next>=qz.list.length){ qz.busy=false; award(LESSON.id,qKey()); return; }
  if(qz.list[next].set!==s) await new Promise(r=>setTimeout(r,500)); if(run!==qz.run||!inQ()) return;
  qGo(next);
}
// the hidden text box for "type" questions: one box kept while the questions change, so the keyboard does not close between words
function qFocus(){ const wd=$('.qword'); if(!wd) return; let inp=$('#qin');
  if(!inp){ inp=el('input','qin'); Object.assign(inp,{type:'text',id:'qin',autocomplete:'off',spellcheck:false});
    ['autocorrect','autocapitalize'].forEach(a=>inp.setAttribute(a,'off')); inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Type the missing letter');
    inp.addEventListener('input',()=>{ const ch=inp.value.replace(/\s/g,'').slice(-1); inp.value=''; qTyped(ch); });
    inp.addEventListener('focus',()=>wd.classList.add('focus')); inp.addEventListener('blur',()=>wd.classList.remove('focus'));
    wd.append(inp); }
  inp.focus({preventScroll:true}); }
function qTyped(ch){ const q=qz.list[qz.i]; if(!ch||qz.busy||!q||q.set.type!=='type') return;
  const gap=$('.qword .qgap:not(.got)'), gi=gap&&gap.dataset.i!=null&&q.gaps?+gap.dataset.i:null, right=ch.toLowerCase()===String(gi!=null?q.word[gi]:q.answer).toLowerCase();
  if(right&&q.gaps&&$$('.qword .qgap:not(.got)').length>1){ gap.classList.remove('bad'); gap.textContent=q.word[gi]; gap.classList.add('got'); tone(660,'sine',.05,.12); if(anim) G.fromTo(gap,{scale:1.8},{scale:1,duration:.4,ease:'back.out(3)'}); return; }   // one gap filled, more to go
  if(!right&&gap){ gap.textContent=ch; gap.classList.add('bad'); clearTimeout(gap._t); gap._t=setTimeout(()=>{ if(!gap.classList.contains('got')){ gap.textContent='_'; gap.classList.remove('bad'); } },650); }
  qAnswer(gap||$('.qword'),right); }
// a computer keyboard works even when the text box lost focus (e.g. after tapping the speaker)
addEventListener('keydown',e=>{ if(!inQ()||e.ctrlKey||e.metaKey||e.altKey||e.key.length!==1) return; const q=qz.list[qz.i];
  if(!q||q.set.type!=='type'||document.activeElement&&document.activeElement.id==='qin') return; e.preventDefault(); qTyped(normDigits(e.key)); });
function qSay(){ const q=qz.list[qz.i]; if(!q) return; vStop(); const w=$('.qword'); w.classList.add('lit');
  if(q.sayFn&&!q.solved) return q.sayFn();   // English AL: the question read with a pause where the blank is
  const done=()=>{ const x=$('.qword'); if(x) x.classList.remove('lit'); };
  if(q.ask&&!q.solved) return tts(q.ask,'en',.75).then(done,done);   // "q.ask": the question read without its answer (the full sentence is said once it is solved)
  (q.audio?playFile(q.audio).catch(()=>tts(q.word,isAr()?'ar':'en',.75)):tts(q.word,isAr()?'ar':'en',.75)).then(done,done); }
// read the exercise instruction aloud (its line lights up while it plays)
function qTask(){ const q=qz.list[qz.i]; if(!q) return Promise.resolve(); vStop(); const t=$('.qtask'); if(t) t.classList.add('lit');
  const done=()=>{ const x=$('.qtask'); if(x) x.classList.remove('lit'); };
  const ts=q.set.taskSrc, fb=()=>tts(q.set.task,isAr()?'ar':'en',.85);
  const play=Array.isArray(ts)?ts.reduce((p,u,k)=>p.then(()=>{ if(qz.list[qz.i]!==q) return; return (k?new Promise(r=>setTimeout(r,120)):Promise.resolve()).then(()=>playFile(u)); }),Promise.resolve()):playFile(ts);
  return (ts?play.catch(fb):fb()).then(done,done); }
function qStamp(pic,cross){
  const m=$('.qmark',pic); m.className='qmark good'; m.innerHTML=cross?Q_CROSS:Q_TICK;
  if(anim){ const p=$('path',m), len=p.getTotalLength(); G.fromTo(m,{scale:1.6},{scale:1,duration:.35,ease:'back.out(3)'}); G.fromTo(p,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.35,ease:'power2.out'}); }
}
async function qAnswer(btn,right,said){
  if(qz.busy) return; hideHint(); const run=qz.run, q=qz.list[qz.i];
  if(!right){
    if(q.set.type==='pick') qCross(btn);
    return qBad(btn);
  }
  qz.busy=true; vStop();
  if(q.set.type==='pick'){ if(q.set.mark==='ring') qRing(btn); else qStamp(btn,false); } else { btn.classList.add('on'); qStamp($('.qpic.one'),said===false); }
  $$('.qword .qgap').forEach(gap=>{ gap.classList.remove('bad'); gap.textContent=q.word[gap.dataset.i!=null?+gap.dataset.i:q.missing||0]; gap.classList.add('got'); if(anim) G.fromTo(gap,{scale:1.8},{scale:1,duration:.5,ease:'back.out(3)'}); });
  $$('.qpic').forEach(p=>p!==btn&&q.set.type==='pick'&&p.classList.add('dim'));
  celebrate(q.set.type==='pick'?btn:$('.qpic.one'));
  qStar();
  await new Promise(r=>setTimeout(r,500)); if(run!==qz.run) return;
  await new Promise(r=>setTimeout(r,900)); if(run!==qz.run||!inQ()) return;
  if(qz.i+1<qz.list.length) qGo(qz.i+1); else { qz.busy=false; award(LESSON.id,qKey()); }
}
/* portrait or landscape, from the screen size WITHOUT the keyboard (same idea as the vocabulary page): the page does not change when it opens */
const qScr={w:innerWidth,h:innerHeight};
function qLayout(){ const L=$('#lesson'); if(!L) return;
  const typing=document.activeElement&&document.activeElement.id==='qin';
  if(innerWidth!==qScr.w||innerHeight>qScr.h||!typing){ qScr.w=innerWidth; qScr.h=innerHeight; }
  const land=qScr.w>qScr.h*1.1;
  L.classList.toggle('q-land',land); L.classList.toggle('q-port',!land); L.classList.toggle('q-short',land&&qScr.h<500);
  // wide screens: the choices go right beside the picture (inside the picture row), so the child sees what to do
  const wr=$('.quiz'), ans=$('.qans'), pla=$('.qplay');
  if(wr&&ans&&pla){ const side=land&&!!(QM[wr.dataset.type]||{}).side; if(side&&ans.parentElement!==pla) pla.append(ans); else if(!side&&ans.parentElement===pla) wr.append(ans); }
  qLinkRefresh(land);
  // two pictures: side by side, or one above the other when that makes them bigger (tall phones)
  const pl=$('.qplay'); if(!pl) return; pl.classList.remove('stack'); if(wr&&(QM[wr.dataset.type]||{}).fit===0) return; const w=pl.clientWidth, h=pl.clientHeight, a=.8;
  pl.classList.toggle('stack', Math.min(w,h/2*a) > Math.min(w/2,h*a)*1.15); }
addEventListener('resize',()=>{ if(inQ()){ qLayout(); qLines(); } });

/* link: words in one row, pictures in the other (or two columns); a line joins a word to its picture */
function qLinkBoard(w,s,play,run){
  const n=s.items.length, bd=el('div','qlink'); bd.dataset.n=n; bd.style.setProperty('--n',n); bd._set=s; bd._pairs=[];
  const wd=el('div','qlw'), pc=el('div','qlp');
  let ord=s.items.map((_,k)=>k); for(let t=0;t<30;t++){ ord.sort(()=>Math.random()-.5); if(n<2||ord.every((v,k)=>v!==k)) break; }   // the pictures are not under their own words
  s.items.forEach((it,k)=>{ const b=el('button','qlk qlkw',`<b>${it.word}</b>${it.rel?`<small class="qrel">${it.rel}</small>`:''}`); b.dataset.k=k; b.setAttribute('aria-label',it.word); wd.append(b); });
  ord.forEach(k=>{ const it=s.items[k], b=el('button','qlk qlkp'+(it.picSrc?'':' tx'),it.picSrc?`<img src="${it.picSrc}" alt="" draggable="false">`:`<b>${it.text2}</b>`); b.dataset.k=k; b.setAttribute('aria-label',it.picSrc?'Picture':it.text2); pc.append(b); });   // "text2": a word to join instead of a picture
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','qlsvg');
  bd.append(wd,pc,svg); play.append(bd);
  let drag=null, sel=null; const rel=(x,y)=>{ const B=bd.getBoundingClientRect(); return [x-B.left,y-B.top]; };
  const kind=b=>b.classList.contains('qlkw')?'w':'p';
  const tmp=()=>{ let l=$('.qtmp',svg); if(!l){ l=document.createElementNS('http://www.w3.org/2000/svg','line'); l.setAttribute('class','qtmp'); svg.append(l); } return l; };
  const clearSel=()=>{ if(sel){ sel.classList.remove('sel'); sel=null; } };
  bd.addEventListener('pointerdown',e=>{ const b=e.target.closest('.qlk'); if(!b||qz.busy) return; e.preventDefault(); hideHint();
    const it=s.items[+b.dataset.k];
    if(b.classList.contains('done')){ if(kind(b)==='w') qSound(it.src,it.word); else if(b.classList.contains('tx')) qSound(it.src2||it.src,it.text2); return; }
    drag={b,x:e.clientX,y:e.clientY,moved:false}; try{ bd.setPointerCapture(e.pointerId); }catch(_){} });
  bd.addEventListener('pointermove',e=>{ if(!drag) return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10) return; drag.moved=true;
    const [a,b]=qAnchor(bd,drag.b,kind(drag.b)==='w'), [x,y]=rel(e.clientX,e.clientY), l=tmp(); l.setAttribute('x1',a); l.setAttribute('y1',b); l.setAttribute('x2',x); l.setAttribute('y2',y); });
  const end=e=>{ if(!drag) return; const d=drag; drag=null; const l=$('.qtmp',svg); if(l) l.remove();
    const t=e.type==='pointerup'&&document.elementFromPoint(e.clientX,e.clientY); let tb=t&&t.closest&&t.closest('.qlk');
    if(e.type==='pointerup'&&(!tb||kind(tb)===kind(d.b))){   // dropped near, not exactly on: join the closest free one of the other row (whole word / whole picture area counts)
      let best=null,bd2=1e9; $$('.qlk',bd).forEach(c=>{ if(kind(c)===kind(d.b)||c.classList.contains('done')) return; const r=c.getBoundingClientRect(), dx=Math.max(r.left-e.clientX,0,e.clientX-r.right), dy=Math.max(r.top-e.clientY,0,e.clientY-r.bottom), dd=Math.hypot(dx,dy); if(dd<bd2){ bd2=dd; best=c; } });
      tb=bd2<=60?best:null; }
    if(e.type==='pointercancel') return;
    if(d.moved){ clearSel(); if(tb&&tb!==d.b&&kind(tb)!==kind(d.b)&&!tb.classList.contains('done')) qLinkTry(bd,s,d.b,tb,run); return; }
    // a tap: pick it up (a word also says itself), or join it to the one picked before
    if(kind(d.b)==='w'){ const it=s.items[+d.b.dataset.k]; qSound(it.src,it.word); } else if(d.b.classList.contains('tx')){ const it=s.items[+d.b.dataset.k]; qSound(it.src2||it.src,it.text2); }
    if(sel&&sel!==d.b&&kind(sel)!==kind(d.b)){ const a=sel; clearSel(); qLinkTry(bd,s,a,d.b,run); return; }
    if(sel===d.b){ clearSel(); return; }
    clearSel(); sel=d.b; d.b.classList.add('sel'); };
  bd.addEventListener('pointerup',end); bd.addEventListener('pointercancel',end);
  qLinkRefresh(L$().classList.contains('q-land'));
  if(qNewEx()) setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; await qTask(); },350);
}
const L$=()=>$('#lesson');
QM.link={sheet:'board', fit:0, draw:qLinkBoard, help:(q,w)=>{ const bd=$('.qlink',w); if(!bd) return []; const wb=$$('.qlkw',bd).find(b=>!b.classList.contains('done')); return wb?[wb,$$('.qlkp',bd).find(b=>b.dataset.k===wb.dataset.k)].filter(Boolean):[]; }};
const qNewEx=()=>{ const i=qz.i; return i<=0||qGrp(qz.list[i-1].set)!==qGrp(qz.list[i].set); };   // the instruction is read only when a new exercise starts, not for each part of it
// where a line leaves a word / arrives at a picture (bottom / top in rows, right / left in columns), in the board's own pixels
function qAnchor(bd,b,isWord){ const B=bd.getBoundingClientRect(), r=b.getBoundingClientRect(), cols=bd.classList.contains('cols');
  return cols?[(isWord?r.right:r.left)-B.left, r.top+r.height/2-B.top]:[r.left+r.width/2-B.left,(isWord?r.bottom:r.top)-B.top]; }
function qLinkLine(bd,wb,pb,cls){ const svg=$('.qlsvg',bd), l=document.createElementNS('http://www.w3.org/2000/svg','line'); l.setAttribute('class',cls||'qlj');
  const [x1,y1]=qAnchor(bd,wb,true), [x2,y2]=qAnchor(bd,pb,false); [['x1',x1],['y1',y1],['x2',x2],['y2',y2]].forEach(([k,v])=>l.setAttribute(k,v)); svg.append(l); return l; }
function qLinkLines(){ const bd=$('.qlink'); if(!bd) return; $$('.qlj',bd).forEach(l=>l.remove()); bd._pairs.forEach(([wb,pb])=>qLinkLine(bd,wb,pb)); }
// words and pictures as big as the board allows; rows or columns follow the screen
function qLinkRefresh(land){ const bd=$('.qlink'); if(!bd) return; const s=bd._set, n=s.items.length;
  bd.classList.toggle('cols',s.layout==='cols'||(!land&&n>4));
  const B=bd.getBoundingClientRect(), cols=bd.classList.contains('cols'), mx=Math.max(...s.items.map(it=>Math.max(it.word.length,(it.text2||'').length)));
  const cw=cols?B.width*.4:(B.width-(n-1)*8)/n-14, rh=cols?B.height/n*.5:40;
  bd.style.setProperty('--fs',Math.max(12,Math.min(isAr()?48:32,cw/(.6*mx),rh*1.1))+'px'); qLinkLines(); }
async function qLinkTry(bd,s,a,b){
  const run=qz.run;   // the board is kept from pair to pair, so it must use the question running NOW, not the one it was built in
  const wb=a.classList.contains('qlkw')?a:b, pb=wb===a?b:a, it=s.items[+wb.dataset.k];
  if(wb.dataset.k!==pb.dataset.k){ const l=qLinkLine(bd,wb,pb,'qlj bad'); setTimeout(()=>l.remove(),500); return qBad([wb,pb]); }
  if(!qSetMoreAfter(s)) qz.busy=true; wb.classList.add('done'); pb.classList.add('done'); bd._pairs.push([wb,pb]);
  const l=qLinkLine(bd,wb,pb); if(anim){ const len=l.getTotalLength?l.getTotalLength():300; G.fromTo(l,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.35,ease:'power2.out'}); }
  celebrate(pb); if(it.full) (async()=>{ vStop(); for(const f of it.fullSrc){ try{ await playFile(f); }catch(_){} } })(); else qSound(it.src,it.word);   // "full": the joined phrase of the pair (word + its partner), said on a right join
  if(qMore(s)) return; return qDone(s,run,900);
}
/* choice: tap the right word of the two; it gets a hand-drawn ring */
async function qChoose(btn,k,q){
  if(qz.busy) return; hideHint();
  if(k!==q.answer) return qBad(btn);
  qz.busy=true; const run=qz.run; qRing(btn); $$('.qopt').forEach(o=>o!==btn&&o.classList.add('dim')); celebrate(btn); qSay();
  return qAdvance(run,1900);
}
async function qAdvance(run,ms){
  qStar();
  await new Promise(r=>setTimeout(r,ms)); if(run!==qz.run||!inQ()) return;
  if(qz.i+1<qz.list.length) qGo(qz.i+1); else { qz.busy=false; award(LESSON.id,qKey()); }
}
// the child "circles" it: a pink oval drawn round the picture or word
function qRing(el0){ const im=el0.classList.contains('qpic')&&$('img',el0);   // a picture button can be taller than its picture: ring the picture itself
  if(im){ const b=el0.getBoundingClientRect(), r=im.getBoundingClientRect(); el0.style.setProperty('--rt',(r.top-b.top)+'px'); el0.style.setProperty('--rb',(b.bottom-r.bottom)+'px'); el0.style.setProperty('--rl',(r.left-b.left)+'px'); el0.style.setProperty('--rr',(b.right-r.right)+'px'); }
  el0.classList.add('ringed'); if(anim) G.fromTo(el0,{'--ring':1.6},{'--ring':1,duration:.4,ease:'back.out(2)'}); }

/* Help (the same bulb for every model): the right answer lights up faintly for a moment, then fades away again.
   qHelpEls() = what the question's MODEL lights now (QM[type].help); nothing = no bulb. Models with their own help (write, qa, math keypads) say bulb:0 */
function qHelpEls(){ const q=qz.list[qz.i], w=$('.quiz'); if(!q||!w||qz.busy) return []; const m=QM[q.set.type];
  return m&&m.help&&m.bulb!==0?m.help(q,w).filter(Boolean):[]; }
function qHelpShow(){ const b=$('.quiz .qhelpb'); if(!b) return; b.hidden=!qHelpEls().length; lnavFit(); }
function qHelp(){ if(qz.busy) return; const L=qHelpEls(); if(!L.length) return; hideHint(); blip(660,.05);
  L.forEach(e=>{ const f=e.classList.contains('qxc')?$('span',e):null; e.classList.remove('qhl'); void e.offsetWidth; e.classList.add('qhl'); if(f) f.classList.add('qhl-t'); setTimeout(()=>{ e.classList.remove('qhl'); if(f) f.classList.remove('qhl-t'); },2000); }); }
;
/* ===== js/letter.js ===== */
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
;
/* ===== js/quiz-letters.js ===== */
/* QUESTIONS tab — the "box" models (QM[type].sheet='box', drawn by qxGo below inside the sheet of quiz.js: task line, stars, speaker) and the letter models.
   position = a picture and one empty circle per letter of its word (right to left): tap the circle where the letter is. item: {word, pic, audio, at: index of the letter}
   vowel    = a picture, its word with the letter missing, and the letter with each haraka: tap the right one. set: "choices":["أَ","أُ","إِ","أْ"]; item: {word, pic, audio, answer: the letter with its haraka, at?: the letter's place (default 0 = the first)}
   write    = the child types a word on the keyboard, each right letter fills in its place with its marks (the speaker says it, the bulb shows the next letter).
              item: {word, audio, pic?, chips?: syllables shown above (book: merge the syllables)}; set "sentence": true for a sentence
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
  const m=QM[s.type], quiet=()=>q.together||q.hush||m.own;
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
async function qxWin(target,q,ms=1500){ if(qz.busy) return; qz.busy=true; const run=qz.run; vStop(); q.solved=true; celebrate(target); qSay(); return qAdvance(run,ms); }
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
  s.choices.forEach(c=>{ const b=el('button','rb qbtn qlet',`<span>${c}</span>`); b.setAttribute('aria-label',c);
    b.addEventListener('click',()=>{ if(qz.busy) return; if(c!==q.answer){ gap.textContent=c; gap.classList.add('bad'); clearTimeout(gap._t); gap._t=setTimeout(()=>{ gap.textContent='_'; gap.classList.remove('bad'); },650); return qxBad(b); }
      b.classList.add('on'); gap.classList.remove('bad'); gap.textContent=gs[at]; gap.classList.add('got'); qxWin(b,q); }); row.append(b); });
  box.append(row);
}
// the word (or sentence) as hidden letters with their places underlined; spaces are not letters
function qxWordEl(word,chips,faint,ltr){ const b=el('b','qxw'); if(ltr) b.dir='ltr';   /* an English word: left to right inside any subject */ const gs=glyphs(word);
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
  if(q.chips&&text===q.word){ const c=el('div','qxchips'); c.innerHTML=q.chips.map(t=>`<i>${t}</i>`).join('<u>/</u>'); box.append(c); }
  const wd=qxWordEl(text,text===q.word?q.chips:null,s.faint,s.lang==='en'||/^[\x00-\x7f]+$/.test(text)), help=el('button','qxhelp',ICON.hint); help.setAttribute('aria-label','Help');
  const line=el('div','qxline'); line.append(wd); const duo=$('.qxduo',box); (duo||box).append(line); box.append(help);   // duo: number and its word side by side
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
  const WS=!!(q.words||s.words), wd=WS?el('b','qxw qxwords'):qxWordEl(q.word), line=el('div','qxline');   // words: the tiles are whole words of a sentence
  if(WS){ q.word.split(' ').forEach(w=>wd.append(el('span','lt hid',w))); }
  line.append(wd); box.append(line);
  const gs=WS?q.word.split(' '):qxLetters(q.word).filter(g=>g!==' '); let ord=gs.map((g,k)=>k); for(let t=0;t<30;t++){ ord.sort(()=>Math.random()-.5); if(gs.length<2||ord.some((v,k)=>v!==k)) break; }
  const tiles=el('div','qxtiles'); box.append(tiles);
  const place=tile=>{ const n=qxNext(wd); if(!n||tile.classList.contains('used')) return false;
    if(!sameLetter(tile.dataset.g,n.textContent)) return false;
    qxReveal(wd); tile.classList.add('used'); blip(560+$$('.lt.got',wd).length*40,.05);
    if(qxDone(wd)) qxWin(wd,q,1700); return true; };
  ord.forEach(k=>{ const t=el('button','qxtile'+(WS?' wide':''),`<span>${gs[k]}</span>`); t.dataset.g=gs[k]; tiles.append(t); });
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
  const wrap=el('div','qaall'); box.classList.add('qa-together'); const heard={}; let tok=0;
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

QM.position={sheet:'box', draw:qxPosition, help:(q,w)=>[$$('.qxc',w)[q.at]]};
QM.vowel={sheet:'box', draw:qxVowel, help:(q,w)=>$$('.qxchoices .qlet',w).filter(b=>b.textContent===q.answer)};
QM.write={sheet:'box', bulb:0, draw:qxWrite};
QM.arrange={sheet:'box', draw:qxArrange, help:(q,w)=>{ const n=$('.qxw .lt.hid',w); return n?$$('.qxtile:not(.used)',w).filter(b=>sameLetter(b.dataset.g,n.textContent)).slice(0,1):[]; }};
QM.qa={sheet:'box', bulb:0, draw:qxQA};
;
/* ===== js/quiz-al.js ===== */
/* ENGLISH AL — box models for the Lesson tab (the book's pages, one after another) and the Booklet tab (QM in quiz.js, drawn through qxGo; same sheet, stars and arrows). They read themselves (own:1).
   Content: data/en-al/<lesson>/questions.json, sets "book":"lesson" (Lesson tab) or "book":"booklet" (Booklet tab). Other types (pick, yesno, link, circle, tick, type ...) work as in quiz.js.
   explain = one book page as a part. item: {pics:[..], labels:[{w:"dad", at:[x%,y%]}] (word chips on the first picture), lines:[{t:"text", a:"audio", cls:"red|blue|head|note|sm"}],
             table:{title, rows:[[{t,a},{t,a}],..]}}. Every word of a line is tappable (that word alone is read). Listen reads the page; when all lines were heard the star comes and the green arrow glows.
   mcq     = a sentence (or a picture) with a blank "____" and 2-4 options: item {stem, options:[..], answer:index, word: the solved sentence, audio: solved sentence, parts:[before,after] (audio of the stem read as a question), pic?}
   cloze   = a text with blanks [[answer]] and a word bank: item {text, bank:[..], audio: whole text read once solved}
   order   = words / chunks as tiles, tap them in the right order: item {chunks:[..in order..], end:".", audio} */
const alSlug=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60).replace(/-+$/,'');
const alClean=w=>String(w).replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g,'');
const alWordSrc=w=>`data/en-shared/q/${alSlug(alClean(w))}.mp3`;
// text -> tappable words (a tap reads that word alone: the child is learning to read)
function alToks(host,text,onTap){
  String(text).split(/\s+/).filter(Boolean).forEach((w,k)=>{ const sp=el('span','alw',w); sp.addEventListener('click',e=>{ e.stopPropagation(); if(qz.busy&&!onTap) return; hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(w),alClean(w)).then(()=>sp.classList.remove('lit')); if(onTap) onTap(w); });
    host.append(k?' ':'',sp); });
}
const alStar=()=>{ const d=$(`.qdots i[data-i="${qz.i}"]`); if(d&&d.classList.contains('got')) return carFrac((qz.i+1)/qz.list.length); qStar(); };
const alNextGo=()=>{ if(qz.i+1<qz.list.length) qGo(qz.i+1); else award(LESSON.id,qKey()); };

/* ---------- explain ---------- */
function alExplain(box,q,s,run){
  const pg=el('div','alpage'+((q.pics||[]).length?' haspic':'')+(q.pics&&q.pics.length>1?' multi':'')+(q.pics&&q.pics.length>4?' many':'')+(q.table?' hastable':'')+(!(q.lines||[]).length&&!q.table?' notext':'')); box.append(pg);
  const labs=[];   // word chips on the pictures (labels: {w, at:[x%,y%], p: picture index}) and captions under them (caps: [word..]); a tap reads that word
  const chip=(cls,w,host,at)=>{ const b=el('button',cls,w); if(at){ b.style.left=at[0]+'%'; b.style.top=at[1]+'%'; } host.append(b); const id='L:'+w+labs.length; labs.push({b,w,id});
    b.addEventListener('click',async e=>{ e.stopPropagation(); hideHint(); vStop(); tok++; b.classList.add('lit'); await qSound(alWordSrc(w),alClean(w)); b.classList.remove('lit'); heard(id); }); return b; };
  if((q.pics||[]).length){ const pc=el('div','alpics'); q.pics.forEach((p,k)=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=p; im.alt=''; f.append(im); pc.append(f);
    (q.labels||[]).filter(lb=>(lb.p||0)===k).forEach(lb=>{ const b=chip('allabel',lb.w,f,lb.at); b.dataset.x=lb.at[0]; b.dataset.y=lb.at[1]; });
    if((q.labels||[]).some(lb=>(lb.p||0)===k)){ const place=()=>{ const fr=f.getBoundingClientRect(), ir=im.getBoundingClientRect(), placed=[]; if(!ir.width) return; $$('.allabel',f).forEach(b=>{ const bw=b.offsetWidth, bh=b.offsetHeight;
        let cx=Math.min(Math.max(ir.left-fr.left+ir.width*b.dataset.x/100,bw/2+2),fr.width-bw/2-2), cy=Math.min(Math.max(ir.top-fr.top+ir.height*b.dataset.y/100,bh/2+2),fr.height-bh/2-2);
        // a small picture (phone) brings two chips onto each other: move this one sideways away from the one already placed, or up/down when the side is full
        for(const o of placed){ const dx=(bw+o.w)/2+3-Math.abs(cx-o.x), dy=(bh+o.h)/2+2-Math.abs(cy-o.y); if(dx<=0||dy<=0) continue;
          const sx=cx>=o.x?1:-1, nx=cx+sx*dx; if(nx-bw/2>=2&&nx+bw/2<=fr.width-2){ cx=nx; continue; }
          const sy=cy>=o.y?1:-1, ny=cy+sy*dy; cy=(ny-bh/2>=2&&ny+bh/2<=fr.height-2)?ny:o.y-sy*((bh+o.h)/2+2); }
        placed.push({x:cx,y:cy,w:bw,h:bh}); b.style.left=cx+'px'; b.style.top=cy+'px'; }); };
      im.addEventListener('load',place); new ResizeObserver(place).observe(f); setTimeout(place,60); }
    if(q.caps&&q.caps[k]) chip('alcap',q.caps[k],f); });
    pg.append(pc); }
  const tx=el('div','altext'); pg.append(tx);
  const rows=[], need=new Set(), got=new Set(); let tok=0;
  const heard=k=>{ got.add(k); if(need.size&&[...need].every(x=>got.has(x))) done(); };
  const mk=(t,src,cls,host)=>{ const row=el('div','alline'+(cls?' '+String(cls).split(/\s+/).map(c=>'al-'+c).join(' '):''))   /* line styles get an al- prefix: a bare .note/.head would pick up the reading card's rules */, sp=el('button','qsay alsp',SAY_LN); sp.setAttribute('aria-label','Listen'); const p=el('p','altx'); alToks(p,t); row.append(sp,p); host.append(row);
    const id='T'+rows.length; need.add(id); const r={row,t,src,id}; rows.push(r);
    const go=async()=>{ if(!row.isConnected) return; const my=++tok; clearOn(); vStop(); row.classList.add('on'); await qSound(src,t); if(my===tok){ row.classList.remove('on'); heard(id); } };
    sp.onclick=go; row.addEventListener('click',e=>{ if(e.target.closest('.alw')) return; go(); }); r.go=go; r.play=async()=>{ row.classList.add('on'); await qSound(src,t); row.classList.remove('on'); heard(id); }; return r; };
  const clearOn=()=>rows.forEach(r=>r.row.classList.remove('on'));
  (q.lines||[]).forEach(l=>mk(l.t,l.a?R_Q(l.a):null,l.cls,tx));
  if(q.table){ const tb=el('div','altable'); if(q.table.title){ const h=el('div','althead'); alToks(h,q.table.title); tb.append(h); }
    const grid=el('div','altrows'); q.table.rows.forEach(r=>{ const rw=el('div','altrow'); r.forEach(c=>{ const cell=el('button','altcell'); alToks(cell,c.t); const id='T'+rows.length; need.add(id); const it={row:cell,t:c.t,src:c.a?R_Q(c.a):null,id}; rows.push(it);
        cell.addEventListener('click',async e=>{ if(e.target.closest('.alw')) return; const my=++tok; clearOn(); vStop(); cell.classList.add('on'); await qSound(it.src,c.t); if(my===tok){ cell.classList.remove('on'); heard(id); } });
        it.play=async()=>{ cell.classList.add('on'); await qSound(it.src,c.t); cell.classList.remove('on'); heard(id); }; rw.append(cell); }); grid.append(rw); }); tb.append(grid); tx.append(tb); }
  labs.forEach(l=>need.add(l.id));
  const next=el('button','rb alnext',Q_ARR); next.setAttribute('aria-label','Next'); next.disabled=true; next.addEventListener('click',()=>{ if(!next.disabled){ hideHint(); blip(600); alNextGo(); } }); pg.append(next);
  const lis=el('button','alall',`${SAY_LN}<span>${tr('Listen')}</span>`); lis.setAttribute('aria-label','Listen to the page'); pg.append(lis);
  function done(){ if(q._done) return; q._done=1; alStar(); next.disabled=false; next.classList.add('ready'); if(anim) G.fromTo(next,{scale:1.35},{scale:1,duration:.6,ease:'elastic.out(1.3,.4)'}); }
  if(q._done){ next.disabled=false; next.classList.add('ready'); }
  const all=async()=>{ const my=++tok; clearOn(); vStop(); for(const r of rows){ if(my!==tok||qz.list[qz.i]!==q||!inQ()) return false; await r.play(); if(my!==tok) return false; await new Promise(z=>setTimeout(z,r.row.classList.contains('al-head')?300:450)); }
    for(const l of labs){ if(my!==tok||qz.list[qz.i]!==q||!inQ()) return false; l.b.classList.add('lit'); await qSound(alWordSrc(l.w),alClean(l.w)); l.b.classList.remove('lit'); heard(l.id); if(my!==tok) return false; await new Promise(z=>setTimeout(z,350)); } return my===tok; };
  lis.addEventListener('click',()=>{ hideHint(); all(); });
  box._after=async()=>{ if(!q._done) await all(); };
}

/* ---------- mcq ---------- */
function alMcq(box,q,s,run){
  const w=el('div','almcq'+(q.pics?' haspic':'')); box.append(w);
  if(q.pics){ const pc=el('div','alpics'); q.pics.forEach((p,k)=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=p; im.alt=''; f.append(im); if(q.caps&&q.caps[k]){ const c=el('button','alcap',q.caps[k]); c.onclick=()=>{ vStop(); c.classList.add('lit'); qSound(alWordSrc(q.caps[k]),q.caps[k]).then(()=>c.classList.remove('lit')); }; f.append(c); } pc.append(f); }); w.append(pc); }
  const st=el('div','alstem'); w.append(st); let blank=null;
  const sp=el('button','qsay alsp',SAY_LN); sp.setAttribute('aria-label','Listen'); sp.onclick=()=>{ if(!qz.busy) q.sayFn(); };
  if(q.ask){ const a=el('p','alask',''); alToks(a,q.ask); st.append(a); }
  st.append(sp);
  const p=el('p','altx'); st.append(p);
  const word=(t,k)=>{ const sp=el('span','alw',t); sp.addEventListener('click',()=>{ hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(t),alClean(t)).then(()=>sp.classList.remove('lit')); }); p.append(k?' ':'',sp); };
  String(q.stem).split(/\s+/).filter(Boolean).forEach((t,k)=>{ const m=/^([^_]*)_{2,}([^_]*)$/.exec(t);
    if(m&&!blank){ blank=el('button','alblank','<i></i>'); if(k) p.append(' '); if(m[1]) p.append(m[1]); p.append(blank); if(m[2]) p.append(m[2]); blank.addEventListener('click',()=>q.sayFn&&q.sayFn()); }
    else word(t,k); });
  const say=q.optSay||q.options;
  const ops=el('div','alopts'+(q.options.some(o=>o.length>14)?' long':'')); w.append(ops);
  q.options.forEach((o,k)=>{ const b=el('button','alopt',`<i>${'abcd'[k]||''}</i><span></span>`); $('span',b).textContent=o; b.dataset.k=k;
    b.addEventListener('click',async()=>{ if(qz.busy||q.solved) return; hideHint();
      if(k!==q.answer){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(alWordSrc(say[k]),say[k]); return; }
      if(blank){ blank.classList.add('got'); blank.innerHTML=''; blank.textContent=o; }
      qRing(b); $$('.alopt',ops).forEach(x=>x!==b&&x.classList.add('dim')); return qxWin(b,q,q.winMs||2300); });
    ops.append(b); });
  q.sayFn=async()=>{ vStop(); const ps=(q.parts||[]).map(R_Q); if(!ps.length) return qSound(q.audio,q.word); for(let i=0;i<ps.length;i++){ if(qz.list[qz.i]!==q||q.solved) return; await qSound(ps[i],''); if(i<ps.length-1) await new Promise(z=>setTimeout(z,350)); } };
  box._after=()=>q.sayFn();
}

/* ---------- cloze ---------- */
function alCloze(box,q,s,run){
  const w=el('div','alcloze'); box.append(w); q.solved=false;
  const ans=[]; const txt=el('p','altx'); w.append(txt);
  const sentences=String(q.text).split(/(\[\[.+?\]\])/);
  let n=0; sentences.forEach(seg=>{ const m=/^\[\[(.+?)\]\]$/.exec(seg);
    if(m){ ans.push(m[1]); const b=el('button','alblank',`<small>(${++n})</small><i></i>`); b.dataset.n=n-1; txt.append(b); }
    else seg.split(/(\s+)/).forEach(t=>{ if(!t) return; if(/^\s+$/.test(t)) return txt.append(' '); const sp=el('span','alw',t); sp.addEventListener('click',()=>{ hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(t),alClean(t)).then(()=>sp.classList.remove('lit')); }); txt.append(sp); }); });
  const bank=el('div','albank'); w.append(bank); let cur=0; const blanks=$$('.alblank',txt);
  const mark=()=>{ blanks.forEach((b,k)=>b.classList.toggle('cur',k===cur)); };
  q.bank.forEach((o,bk)=>{ const sy=(q.bankSay||q.bank)[bk]; const b=el('button','alopt alchip',''); b.textContent=o; bank.append(b);
    b.addEventListener('click',async()=>{ if(qz.busy||q.solved||b.classList.contains('used')) return; hideHint();
      if(o.toLowerCase()!==String(ans[cur]).toLowerCase()){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(alWordSrc(sy),sy); return; }
      const bl=blanks[cur]; bl.classList.add('got'); bl.innerHTML=''; bl.textContent=ans[cur]; if(!q.reuse) b.classList.add('used'); celebrate(bl); qSound(alWordSrc(sy),sy); cur++; mark();
      if(cur>=ans.length){ q.solved=true; qz.busy=true; q.word=String(q.text).replace(/\[\[(.+?)\]\]/g,'$1'); const run0=qz.run; celebrate(txt); await qSound(q.audio,q.word); if(run0!==qz.run) return; return qAdvance(run0,900); } }); });
  mark();
}

/* ---------- order ---------- */
function alOrder(box,q,s,run){
  const w=el('div','alorder'); box.append(w);
  if(q.img){ const pc=el('div','alspellpic',''); const im=el('img','',''); im.src=R_Q(q.img); im.alt=''; pc.append(im); w.append(pc); }
  const line=el('div','alsent'); const pool=el('div','alpool'); w.append(line,pool); const chunks=q.chunks, end=q.end||'';
  let seq=[]; const tiles=[];
  let order=chunks.map((c,k)=>k); for(let t=0;t<30;t++){ order.sort(()=>Math.random()-.5); if(chunks.length<2||order.some((v,k)=>v!==k)) break; }
  const draw=()=>{ line.innerHTML=''; seq.forEach(k=>{ const b=el('button','alopt alchip placed',''); b.textContent=chunks[k]; b.onclick=()=>{ if(qz.busy) return; vStop(); seq=seq.filter(x=>x!==k); tiles[k].classList.remove('used'); draw(); }; line.append(b); });
    if(!seq.length) line.append(el('span','alph','…')); else if(end&&seq.length===chunks.length) line.append(el('span','alend',end)); };
  order.forEach(k=>{ const b=el('button','alopt alchip',''); b.textContent=chunks[k]; tiles[k]=b; pool.append(b);
    b.addEventListener('click',()=>{ if(qz.busy||b.classList.contains('used')) return; hideHint(); b.classList.add('used'); seq.push(k); draw(); qSound(alWordSrc((q.say||chunks)[k]),(q.say||chunks)[k]);
      if(seq.length===chunks.length){ if(seq.every((x,i)=>x===i)){ q.solved=true; $$('.alchip.placed',line).forEach(x=>x.classList.add('good')); qxWin(line,q,q.winMs||2300); }
        else { qxBad(line); line.classList.add('bad'); setTimeout(()=>{ line.classList.remove('bad'); seq=[]; tiles.forEach(t=>t.classList.remove('used')); draw(); },700); } } }); });
  draw();
}

/* ---------- check: tick boxes next to words / sentences; item {words:[..], n:how many to tick, ok:[indices that are right] (omit = any), audio/word: read when done} ---------- */
function alCheck(box,q,s,run){
  const w=el('div','alcheck'); box.append(w); const picked=new Set(); const n=q.n||1;
  if(q.ask){ const a=el('p','alask',''); alToks(a,q.ask); w.append(a); }
  const list=el('div','alchecks'+(q.words.some(t=>t.length>16)?' long':'')); w.append(list);
  q.words.forEach((t,k)=>{ const b=el('button','alck',`<i></i><span></span>`); $('span',b).textContent=t; b.dataset.k=k; list.append(b);
    b.addEventListener('click',async()=>{ if(qz.busy||q.solved) return; hideHint(); vStop();
      if(q.ok&&!q.ok.includes(k)){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(q.audios?R_Q(q.audios[k]):alWordSrc(t),t); return; }
      if(picked.has(k)){ picked.delete(k); b.classList.remove('on'); return; }
      picked.add(k); b.classList.add('on'); await qSound(q.audios?R_Q(q.audios[k]):alWordSrc(t),t);
      if(picked.size>=n&&!q.solved){ q.solved=true; qz.busy=false; $$('.alck',list).forEach(x=>!x.classList.contains('on')&&x.classList.add('dim')); const run0=qz.run; celebrate(w); qz.busy=true; return qAdvance(run0,900); } }); });
  box._after=async()=>{ if(q.taskSay) await qSound(R_Q(q.taskSay),''); };
}

QM.explain={sheet:'box', own:1, draw:alExplain};
QM.mcq={sheet:'box', own:1, draw:alMcq, help:(q,w)=>[$$('.alopt',w)[q.answer]]};
QM.cloze={sheet:'box', own:1, draw:alCloze, help:(q,w)=>{ const bl=$$('.alblank',w).find(b=>!b.classList.contains('got')); if(!bl) return []; const a=String((q.text.match(/\[\[(.+?)\]\]/g)||[])[+bl.dataset.n]||'').replace(/\[|\]/g,''); return $$('.alchip:not(.used)',w).filter(x=>x.textContent.toLowerCase()===a.toLowerCase()).slice(0,1); }};
QM.order={sheet:'box', own:1, draw:alOrder, help:(q,w)=>{ const k=$$('.alchip.placed',w).length; return $$('.alpool .alchip',w).filter(x=>!x.classList.contains('used')&&x.textContent===q.chunks[k]).slice(0,1); }};
QM.check={sheet:'box', own:1, draw:alCheck, help:(q,w)=>{ const ok=q.ok||q.words.map((x,k)=>k); return $$('.alck',w).filter(x=>ok.includes(+x.dataset.k)&&!x.classList.contains('on')).slice(0,1); }};

/* ---------- Grammar tab: the lesson's grammar boxes (lesson.json "grammar":[{title, rows:[[{t,a},..],..]}]); tap a row to hear it, hear them all = star ---------- */
function showGrammar(){
  stage.innerHTML=''; setRail([]); $('#lesson').classList.add('qtab','gtab'); document.body.classList.remove('typing','kb');
  const G0=LESSON.grammar||[]; if(!G0.length) return showGarage();
  const wrap=el('div','quiz algram'); const sc=el('div','algscroll'); wrap.append(sc); stage.append(wrap);
  const R=p=>p, need=new Set(), got=new Set(); let tok=0;
  const heard=id=>{ got.add(id); if([...need].every(x=>got.has(x))&&!showGrammar.done){ showGrammar.done=1; award(LESSON.id,'grammar'); } };
  G0.forEach((g,gi)=>{ const card=el('div','algcard'); if(g.title){ const h=el('h3','algh'); alToks(h,g.title); card.append(h); }
    if(g.note){ const n=el('p','algn'); alToks(n,g.note); card.append(n); }
    (g.rows||[]).forEach((r,ri)=>{ const rw=el('div','algrow'+(r.length>1?' two':'')); r.forEach((c,ci)=>{ const id=`${gi}.${ri}.${ci}`; need.add(id); const b=el('button','algcell'+(c.cls?' '+c.cls:'')); alToks(b,c.t);
        b.addEventListener('click',async e=>{ if(e.target.closest('.alw')) return; const my=++tok; vStop(); $$('.algcell.on',wrap).forEach(x=>x.classList.remove('on')); b.classList.add('on'); await qSound(c.a?R(c.a):alWordSrc(c.t),c.t); if(my===tok){ b.classList.remove('on'); heard(id); } }); rw.append(b); }); card.append(rw); });
    sc.append(card); });
  showGrammar.done=!!(STARS[LESSON.id]&&STARS[LESSON.id].grammar);
  carFrac(0);
}
;
/* ===== js/quiz-math.js ===== */
/* QUESTIONS tab — the number models (box models in QM, quiz.js; drawn through qxGo). All use the sheet of quiz.js (task line, stars, speaker); their help is the bulb next to the answer place (bulb:0).
   Numbers are tapped on a keypad (or on "options"), never typed, so no keyboard opens. Right: celebrate + the answer is said, then on. Wrong: a shake, try again.
   numline = a row of numbers with gaps (book: write the missing number). item: {seq:[1,2,null,4,5,null]} (null = a gap, filled left to right) or {from:1,to:6,gaps:[2,5]} (gap indexes);
             optional "options":[3,6,2,9] (else a keypad 0-10, "max" on the item changes the top number).
   bond    = number tree (book: 5 -> 3 and ?). item: {whole:5, parts:[3,null]} or {whole:null, parts:[3,2]}: tap the missing number. optional "options".
   bigger  = pick the bigger / smaller number. item: {nums:[3,7], find:"bigger"|"smaller", dots:true}; "dots":true shows red dots under each number.
   count   = count the pictures and tap the number. item: {img:"apple.png", n:4, options:[3,4,5]} (no options = keypad 0-10); no "img" = red dots; "group":true = the picture already shows all n (book picture), shown once. "cols" sets the pictures per row.
   In link sets an item may have "dots":n instead of "pic" (red dots as the picture), e.g. dots <-> number, number ("word") <-> its word ("text2"). */
const M_WORDS=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
const mW=n=>M_WORDS[n]!=null?M_WORDS[n]:String(n);
// n red dots (rows of 5) as a picture: a data URI, so link / count need no picture file
function mDots(n,img){ if(n===0) return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">${Array.from({length:10},(_,k)=>`<circle cx="${(k%5)*40+20}" cy="${Math.floor(k/5)*40+20}" r="14" fill="none" stroke="#9A8A7A" stroke-width="3"/>`).join('')}</svg>`); const R=5, rows=Math.ceil(n/R), s=40, w=R*s, h=rows*s;
  const c=Array.from({length:n},(_,k)=>`<circle cx="${(k%R)*s+s/2+(Math.floor(k/R)===rows-1?(R-(n-(rows-1)*R))*s/2:0)}" cy="${Math.floor(k/R)*s+s/2}" r="14" fill="#E0412C" stroke="#5A3418" stroke-width="3"/>`).join('');
  return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${c}</svg>`); }
// the keypad / options row; onPick(value, button) -> true when right
function mPad(box,values,onPick){ const row=el('div','qmpad'); values.forEach(v=>{ const b=el('button','rb qbtn qlet qmn',`<span>${v}</span>`); b.setAttribute('aria-label',String(v));
  b.addEventListener('click',()=>{ if(qz.busy) return; if(onPick(v,b)){ b.classList.add('on'); } else qxBad(b); }); row.append(b); }); box.append(row); return row; }
// Help: the answer shows faintly in the empty box for a moment, then is wiped; the question never says the answer on its own
function mHelp(box,getCell,getVal){ const h=el('button','qxhelp qmhelp',ICON.hint); h.setAttribute('aria-label','Help');
  h.onclick=()=>{ if(qz.busy) return; const c=getCell(); if(!c) return; const b=$('b',c); b.textContent=getVal(); c.classList.add('peek'); setTimeout(()=>{ if(c.classList.contains('peek')){ c.classList.remove('peek'); if(c.classList.contains('gap')) b.textContent=''; } },1500); }; box.append(h); }
const mKeys=(max=10)=>Array.from({length:max+1},(_,k)=>k);
const mShuffle=a=>{ a=a.slice(); for(let t=0;t<30;t++){ const b=a.slice().sort(()=>Math.random()-.5); if(b.some((v,k)=>v!==a[k])||a.length<2){ a=b; break; } } return a; };

function mNumline(box,q,s,run){
  const seq=q.seq||Array.from({length:q.to-q.from+1},(_,k)=>(q.gaps||[]).includes(k)?null:q.from+k), full=q.full||(q.from!=null?Array.from({length:q.to-q.from+1},(_,k)=>q.from+k):null);
  const ans=q.answers||seq.map((v,k)=>v==null?(full?full[k]:null):null).filter(v=>v!=null);   // with "seq" and no "answers": the gaps are filled from the run of numbers around them
  if(!q.answers&&!full){ const base=seq.find(v=>v!=null), bi=seq.indexOf(base); ans.length=0; seq.forEach((v,k)=>{ if(v==null) ans.push(base+(k-bi)); }); }
  q.word=q.word||seq.map((v,k)=>mW(v==null?ans[seq.slice(0,k).filter(x=>x==null).length]:v)).join(', ');
  const line=el('div','qmline'); line.style.setProperty('--n',seq.length); const cells=[];
  seq.forEach(v=>{ const c=el('div','qmcell'+(v==null?' gap':''),`<b>${v==null?'':v}</b>`); line.append(c); cells.push(c); });
  line.append(el('i','qmarrow')); box.append(line); let g=0; const gaps=cells.filter(c=>c.classList.contains('gap')); gaps[0].classList.add('cur');
  q.hush=1; mHelp(box,()=>gaps[g]&&gaps[g].classList.contains('gap')?gaps[g]:null,()=>ans[g]);
  mPad(box,q.options?mShuffle(q.options):mKeys(q.max||Math.max(10,...seq.filter(v=>v!=null),...ans)),(v)=>{
    if(v!==ans[g]) return false; const c=gaps[g]; $('b',c).textContent=v; c.classList.remove('cur','gap'); c.classList.add('got'); blip(560+g*60,.05); g++;
    if(g<gaps.length) gaps[g].classList.add('cur'); else qxWin(line,q,1600); return true; });
}
function mBond(box,q,s,run){
  const parts=q.parts, miss=q.whole==null?-1:parts.findIndex(v=>v==null), ans=miss<0?parts[0]+parts[1]:q.whole-parts[1-miss];
  q.word=q.word||`${mW(miss===0?ans:parts[0])} and ${mW(miss===1?ans:parts[1])} make ${mW(q.whole==null?ans:q.whole)}`;
  q.ask=`${miss===0?'what':mW(parts[0])} and ${miss===1?'what':mW(parts[1])} make ${q.whole==null?'what':mW(q.whole)}`;   // the question never says its own answer
  const t=el('div','qmbond'); t.innerHTML=`<svg viewBox="0 0 100 60" preserveAspectRatio="none"><path d="M50 20 L22 44 M50 20 L78 44"/></svg>`;
  const mk=(cls,v)=>{ const c=el('div','qmb '+cls+(v==null?' gap cur':''),`<b>${v==null?'':v}</b>`); t.append(c); return c; };
  const top=mk('top',q.whole), a=mk('l',parts[0]), b=mk('r',parts[1]), target=q.whole==null?top:miss===0?a:b;
  box.append(t);
  if(/^write /i.test(s.task||'')||s.typed){ qxWrite(box,q,s,run,String(ans),()=>{ $('b',target).textContent=ans; target.classList.remove('cur','gap'); target.classList.add('got'); qxWin(t,q,1600); }); return; }
  q.hush=1; mHelp(box,()=>target.classList.contains('gap')?target:null,()=>ans);
  mPad(box,(q.options?mShuffle(q.options):mKeys(q.max||10)),(v)=>{ if(v!==ans) return false; $('b',target).textContent=v; target.classList.remove('cur','gap'); target.classList.add('got'); qxWin(t,q,1600); return true; });
}
function mBigger(box,q,s,run){
  const want=q.find==='smaller'?Math.min(...q.nums):Math.max(...q.nums); q.word=q.word||q.find||'bigger';
  const row=el('div','qmbig'); q.nums.forEach(n=>{ const b=el('button','qmbn',`<b>${n}</b>${q.dots?`<img src="${mDots(n)}" alt="">`:''}`); b.setAttribute('aria-label',String(n));
    b.addEventListener('click',()=>{ if(qz.busy) return; if(n!==want) return qxBad(b); b.classList.add('got'); $$('.qmbn',row).forEach(x=>x!==b&&x.classList.add('dim')); qRing(b); qxWin(b,q,1600); }); row.append(b); });
  box.append(row);
}
function mCount(box,q,s,run){
  const n=q.n; q.word=q.word||mW(n);  q.hush=1; const grid=el('div','qmcount'+(q.group?' grp':'')); grid.style.setProperty('--c',q.cols||Math.min(n,5)); grid.style.setProperty('--r',Math.ceil(n/(q.cols||Math.min(n,5))));
  if(q.img&&q.group){ const im=new Image(); im.src=R_Q(q.img); im.alt=''; grid.append(im); } else if(q.img){ const src=R_Q(q.img); for(let k=0;k<n;k++){ const im=new Image(); im.src=src; im.alt=''; grid.append(im); } } else { const im=new Image(); im.src=mDots(n); im.alt=''; grid.append(im); }
  box.append(grid);
  if(/^write the number/i.test(s.task||'')||s.typed){
    if(s.both){ const duo=el('div','qxduo'); box.append(duo); const pre=el('div','qxline qxpre'); pre.append(qxWordEl(mW(n),null,false,true)); pre.style.order=2; duo.append(pre); }   // both places (number, word) show from the start   // the book's "write the number": the child types it (Help shows it faintly for a moment); "both":true = then types its word too
    qxWrite(box,q,s,run,String(n),s.both?(()=>{ q.word=mW(n); $$('.qxpre',box).forEach(x=>x.remove()); qxWrite(box,q,s,run,mW(n)); }):null); return; }
  mPad(box,(q.options?mShuffle(q.options):mKeys(q.max||Math.max(10,n))),(v)=>{ if(v!==n) return false; qxWin(grid,q,1600); return true; });
}
QM.numline={sheet:'box', bulb:0, draw:mNumline};
QM.bond={sheet:'box', bulb:0, draw:mBond};
QM.bigger={sheet:'box', bulb:0, draw:mBigger};
QM.count={sheet:'box', bulb:0, draw:mCount};
;
/* ===== js/math-explain.js ===== */
/* MATH lesson EXPLAIN tab (lesson.json "type": "math", "math": {rows:[{n, word, audio}]}) — the book's number table: red dots, the number, its word.
   One row per number; tap a row to hear the word (the speaker sits beside the word). Done (star) when every row was heard.
   The dots are drawn by mDots() (quiz-math.js), so no picture files. */
const mx={run:0,all:0,heard:{}};
const mxHeard=()=>mx.heard[LESSON.id]=mx.heard[LESSON.id]||{};
function mxMark(i,row){ const h=mxHeard(); h[i]=1; row.classList.add('heard'); carFrac(Object.keys(h).length/(LESSON.math.bonds||LESSON.math.line||LESSON.math).rows.length); }
// the star comes only after the last row's sound has finished
function mxDone(){ if(Object.keys(mxHeard()).length>=(LESSON.math.bonds||LESSON.math.line||LESSON.math).rows.length) award(LESSON.id,'read'); }
async function mxSay(r,btn){ vStop(); const run=++mx.run; btn.classList.add('on'); try{ await playFile(r.audio); }catch(e){} if(run===mx.run){ btn.classList.remove('on'); mxDone(); } }
// "What makes N?" table: M.bonds = {whole:8, rows:[{a:1,b:7,audio}]}: red + blue dots in a frame, "1 and 7 make 8" (tap = the sentence is said)
function mxBondDots(a,b){ const R=5,s=40,n=a+b,rows=Math.ceil(n/R),c=Array.from({length:n},(_,k)=>`<circle cx="${(k%R)*s+s/2}" cy="${Math.floor(k/R)*s+s/2}" r="14" fill="${k<a?'#E0412C':'#2A7FD8'}" stroke="#5A3418" stroke-width="3"/>`).join('');
  return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${R*s} ${rows*s}">${c}</svg>`); }
function mxBondRow(r,whole){ return el('button','mxrow mxbond',`<span class="mxdots"><img src="${mxBondDots(r.a,r.b)}" alt=""></span><span class="mxeq"><b class="r">${r.a}</b><i>and</i><b class="b">${r.b}</b></span><span class="mxmk">make <b>${whole}</b></span><i class="mxsay">${SAY_LN}</i>`); }
// number line (M.line = {rows:[{n,word,audio}], small:{img,word,audio}, big:{...}, text, textAudio}): coloured stones 1..10, mouse = Smallest, elephant = Biggest; tap = said
const MX_STONE=['#E0412C','#2A7FD8','#F2B321','#2FA8A0','#8A5CC9','#F08A2C','#3FA34D','#D8396B','#E0412C','#8A5CC9'];
function showMathLine(){
  const L=LESSON.math.line, h=mxHeard(); stage.innerHTML=''; mx.run++;
  const scene=el('div','scene pics mx'), box=el('div','mxline'); const bind=(b,r,mark)=>{ b.addEventListener('click',e=>{ if(e.isTrusted) mx.all++; if(mark!=null) mxMark(mark,b); mxSay(r,b); }); return b; };
  const end=(c,o)=>bind(el('button','mxend '+c,`<img src="${o.img}" alt=""><b>${o.word}</b>`),o);
  const stones=el('div','mxstones'); L.rows.forEach((r,i)=>{ const b=bind(el('button','mxstone'+(h[i]?' heard':''),`<b>${r.n}</b>`),r,i); b.style.background=MX_STONE[i]; b.setAttribute('aria-label',r.word); stones.append(b); });
  const cap=bind(el('button','mxcap',`<span>${L.text}</span><i class="mxsay">${SAY_LN}</i>`),{audio:L.textAudio});
  box.append(end('sm',L.small),stones,end('bg',L.big),cap); scene.append(box); stage.append(scene); carFrac(Object.keys(h).length/L.rows.length);
  setRail([{kind:'go',icon:'play',label:tr('Listen'),click:()=>mxSeq($$('.mxstone'))},...mxTool()]);
  if(typeof bookTag==='function') bookTag();
}
function showMathExplain(){
  if(LESSON.math.line) return showMathLine();
  const M=LESSON.math, h=mxHeard(); stage.innerHTML=''; mx.run++;
  const B=M.bonds, ROWS=B?B.rows:M.rows;
  const scene=el('div','scene pics mx'), grid=el('div','mxgrid'); grid.style.setProperty('--n',ROWS.length);
  scene.append(grid);
  ROWS.forEach((r,i)=>{ const b=B?mxBondRow(r,B.whole):el('button','mxrow'+(h[i]?' heard':''),
    `<span class="mxdots"><img src="${mDots(r.n)}" alt=""></span><b class="mxnum">${r.n}</b><span class="mxword">${r.word}</span><i class="mxsay">${SAY_LN}</i>`);
    if(B&&h[i]) b.classList.add('heard'); b.setAttribute('aria-label',B?`${r.a} and ${r.b} make ${B.whole}`:r.word); b.addEventListener('click',e=>{ if(e.isTrusted) mx.all++; mxMark(i,b); mxSay(r,b); }); grid.append(b); });
  stage.append(scene); carFrac(Object.keys(h).length/ROWS.length);
  setRail([{kind:'go',icon:'play',label:tr('Listen'),click:mxAll},...mxTool()]);
  if(typeof bookTag==='function') bookTag();
}
// Listen (the big green button): every row in order, each one after the last has finished; a tap on a row stops the sequence
async function mxSeq(els){ vStop(); const tok=++mx.all; for(const r of els){ if(tok!==mx.all) return; r.click(); await new Promise(x=>setTimeout(x,120)); while(tok===mx.all&&r.classList.contains('on')) await new Promise(x=>setTimeout(x,80)); await new Promise(x=>setTimeout(x,200)); } }
const mxAll=()=>mxSeq($$('.mxgrid .mxrow'));

const mxTool=()=>LESSON.tool?[{kind:'tool',icon:'arcs',label:'Tool',click:()=>toolOpen(LESSON.toolN)}]:[];
;
/* ===== js/book.js ===== */
/* BOOK PAGES — jump to the part of the app that matches a page of the school book.
   Each lesson in subject.json can say which book pages each tab covers:
     "pages": { "read": [8], "words": [9], "quiz": [10, 11], "workbook": [4, 5] }
   (read / words / quiz = pages of the student's Book; workbook = pages of the Workbook, they open the Workbook questions)
   A round book button (map + lesson headers) opens a number pad; Go opens that lesson and tab
   (for Questions, at the first question from that page). The lesson header shows the page of the tab in use. */
function bookIndex(){
  const out=[]; (COURSE&&COURSE.subjects||[]).filter(s=>s.lessons).forEach(s=>s.lessons.forEach(l=>{
    if(!l.file||!l.pages) return;
    Object.entries(l.pages).forEach(([t,ps])=>[].concat(ps).forEach(p=>out.push({page:+p,tab:t,lesson:l,subject:s})));
  }));
  return out;
}
const TABNAME={read:'Lesson',words:'Vocabulary',quiz:'Questions',workbook:'PTS',booklet:'Booklet',grammar:'Grammar'};

// the book page of the tab in use, in the same style and spot as the page on the Questions sheet:
// pinned to the top-right corner of the stage in every tab (on the Lesson picture it sits on a small paper chip, or in the reading card's corner when the card or the book picture is there). Questions show their own page per question set.
function bookTag(){
  if(!LESSON||inQ()) return;   // the Questions sheets say their own page (qGo)
  const m=SUBJECT&&SUBJECT.lessons.find(l=>l.id===LESSON.id), ps=m&&m.pages&&[].concat(m.pages[tab]||[]);
  if(!(ps&&ps.length)) return footPage(null);
  // a lesson read in several pages: show the book page of the page on screen (lesson.json "pageNums" can list them when they differ from the book pages)
  const np=tab==='read'&&LESSON.pages>1?LESSON.pages:0, pn=np&&(LESSON.pageNums||ps);
  footPage(np?pn[Math.min(rd.page-1,pn.length-1)]:ps.length>1?ps[0]+'–'+ps[ps.length-1]:ps[0]);
}
// the book page of what is on screen: bottom right corner, in the tab bar's row
function footPage(n){
  let t=$('#pageTag');
  if(n==null||n===''){ if(t) t.remove(); return; }
  if(!t){ t=el('button','pgtag'); t.id='pageTag'; t.addEventListener('click',()=>bookPad()); $('#lesson .tabs').append(t); }
  t.setAttribute('aria-label','Book page '+n); t.innerHTML=ICON.book+`<span>${isAr()?'ص ':'p. '}${num(n)}</span>`;
}

/* LESSON NAV — above the tabs: the parts of the page (top row) and the pages of the book in use (second row), each with Previous / Next arrows.
   Questions-style tabs (Q, Booklet, PTS, English AL lessons): pages = the book pages that have questions, parts = the exercises of the page on screen.
   Lesson tab with several pages: the pages of the lesson. Anything else (one page only) shows no rows. */
function lnavModel(){
  if(!LESSON) return {};
  if(inQ()){
    const cur=qz.list[qz.i]; if(!cur) return {};
    const pg=[], sec=[], cp=cur.set.page, cg=qGrp(cur.set);
    qz.list.forEach((q,i)=>{ const p=q.set.page; if(p!=null&&!pg.some(x=>x.n===p)) pg.push({n:p,i}); });
    qz.list.forEach((q,i)=>{ if(q.set.page!==cp) return; const g=qGrp(q.set); if(!sec.some(x=>x.g===g)) sec.push({g,i,l:q.set.part||(q.set.ex!=null?num(q.set.ex):q.set.model||num(sec.length+1))}); });
    const pi=pg.findIndex(x=>x.n===cp), jump=i=>{ hideHint(); blip(600); qz.busy=false; qGo(i); };
    return {pages:pg.map(x=>({l:num(x.n),on:x.n===cp,go:()=>jump(x.i)})), secs:sec.length>1||(sec[0]&&pg.length>0)?sec.map(x=>({l:x.l,on:x.g===cg,go:()=>jump(x.i)})):[],
      pPrev:pi>0&&(()=>jump(pg[pi-1].i)), pNext:pi>=0&&pi<pg.length-1&&(()=>jump(pg[pi+1].i)),
      sPrev:qSetStart(-1)>=0&&(()=>qSet(-1)), sNext:qSetStart(1)>=0&&(()=>qSet(1))};
  }
  if(tab==='read'&&nPages()>1){
    const m=SUBJECT.lessons.find(l=>l.id===LESSON.id), ps=LESSON.pageNums||(m&&m.pages&&[].concat(m.pages.read||[]))||[];
    return {pages:Array.from({length:nPages()},(_,k)=>({l:num(ps[k]!=null?ps[k]:k+1),on:k+1===rd.page,go:()=>readGo(k+1-rd.page)})), secs:[],
      pPrev:rd.page>1&&(()=>readGo(-1)), pNext:rd.page<nPages()&&(()=>readGo(1))};
  }
  return {};
}
function lnavPaint(){
  const n=$('#lnav'); if(!n) return; const md=lnavModel();
  const row=(sel,items,prev,next,round)=>{ const r=$(sel,n); r.hidden=!(items&&items.length); if(r.hidden){ r.innerHTML=''; return; }
    r.className='ln-row '+sel.slice(1).replace('.','')+(round?' round':'');
    r.innerHTML=`<button class="qarr ln-arr prev" aria-label="Previous" ${prev?'':'disabled'}>${Q_ARR}</button><div class="ln-items">${items.map(it=>`<button class="ln-it${it.on?' on':''}">${it.l}</button>`).join('')}</div><button class="qarr ln-arr next" aria-label="Next" ${next?'':'disabled'}>${Q_ARR}</button>`;
    $$('.ln-it',r).forEach((b,k)=>b.addEventListener('click',()=>{ if(!items[k].on) items[k].go(); }));
    $('.prev',r).addEventListener('click',()=>prev&&prev()); $('.next',r).addEventListener('click',()=>next&&next());
    lnavWin(r); };
  row('.ln-sec',md.secs,md.sPrev,md.sNext,false); row('.ln-pg',md.pages&&md.pages.length>1?md.pages:[],md.pPrev,md.pNext,true);   // one page only: no page row
  const hb=$('.quiz .qhelpb'); if(hb&&!inQ()) hb.hidden=true;
  lnavFit();
  // the arrows of the rows are laid out after they are visible: scroll the page in use to the middle again
  $$('.ln-row',n).forEach(lnavWin);
}
/* a row with more buttons than the screen holds shows only WHOLE buttons (never a sliver under the arrows): the strip gets the width of the buttons
   that fit around the one in use, and swiping it stops on a button (scroll-snap in lesson.css) */
function lnavWin(r){
  const box=$('.ln-items',r), its=$$('.ln-it',r); if(!box||!its.length||r.hidden) return; box.style.width='';
  const gap=parseFloat(getComputedStyle(box).columnGap)||0, pad=parseFloat(getComputedStyle(box).paddingLeft)+parseFloat(getComputedStyle(box).paddingRight);
  const arr=$$('.ln-arr',r).reduce((a,b)=>a+b.offsetWidth,0)+2*(parseFloat(getComputedStyle(r).columnGap)||0);
  const room=r.clientWidth-arr-pad, w=its.map(b=>b.offsetWidth), all=w.reduce((a,b)=>a+b,0)+gap*(w.length-1);
  if(all<=room){ box.scrollLeft=0; return; }
  let k=Math.max(0,its.findIndex(b=>b.classList.contains('on'))), a=k, z=k, used=w[k];
  for(let side=0;;side^=1){ const i=side?z+1:a-1; if(i>=0&&i<w.length&&used+gap+w[i]<=room){ used+=gap+w[i]; side?z=i:a=i; continue; }
    const j=side?a-1:z+1; if(j>=0&&j<w.length&&used+gap+w[j]<=room){ used+=gap+w[j]; side?a=j:z=j; continue; } break; }
  box.style.width=(used+pad)+'px'; box.scrollLeft=its[a].offsetLeft-its[0].offsetLeft;
}
function lnavFit(){ const n=$('#lnav'); if(n) n.hidden=!!($('.ln-sec',n).hidden&&$('.ln-pg',n).hidden); }
addEventListener('resize',()=>{ clearTimeout(bookTag.t); bookTag.t=setTimeout(()=>{ if($('#pageTag')) bookTag(); $$('#lnav .ln-row').forEach(lnavWin); },200); });

/* the book picker: the books of this subject (Book, Workbook, Booklet ...) on top, under them the pages of the chosen book; tap a page to go there.
   A lesson's "pages" can name any other book as a key, e.g. "booklet":[3,4] (its questions are the sets with "book":"booklet"). */
const BOOKOF=t=>t==='read'||t==='words'||t==='quiz'?'book':t;
const BOOKNAME=k=>({book:'Book',workbook:'PTS'}[k]||k[0].toUpperCase()+k.slice(1));
function booksOf(s=SUBJECT){ const ks=[...new Set(bookIndex().filter(e=>e.subject===s).map(e=>BOOKOF(e.tab)))];
  return ks.sort((a,b)=>(['book','workbook'].indexOf(a)+1||9)-(['book','workbook'].indexOf(b)+1||9)); }
function bookPages_(k){ const seen={}; bookIndex().filter(e=>e.subject===SUBJECT&&BOOKOF(e.tab)===k).sort((a,b)=>a.page-b.page).forEach(e=>{ if(!seen[e.page]) seen[e.page]=e; }); return Object.values(seen); }
function bookPad(){
  hideHint(); let o=$('#pagePad');
  if(!o){
    o=el('div','overlay','<div class="rays"></div>'); o.id='pagePad'; o.hidden=true;
    o.insertAdjacentHTML('beforeend',`<div class="popup pagepad" role="dialog" aria-label="Books"><h2 class="outline big">Pages</h2><div class="pp-books"></div><div class="pp-pages"></div></div>`);
    document.body.append(o);
    o.addEventListener('click',e=>{ if(e.target===o) o.hidden=true; });
  }
  const ks=booksOf(); if(!ks.length) return;
  const inTab=inQ()&&typeof qz!=='undefined'?qz.src:BOOKOF(tab), cur=ks.includes(inTab)?inTab:ks[0];
  bookList(cur); o.hidden=false; spinRays(o);
  if(anim) G.from('#pagePad .pagepad',{scale:.6,opacity:0,duration:.4,ease:'back.out(2)'});
}
function bookList(k){
  const o=$('#pagePad'), ks=booksOf();
  $('.pp-books',o).innerHTML=ks.map(b=>`<button class="pill ${b===k?'blue':'cream'} pp-book" data-b="${b}">${tr(BOOKNAME(b))}</button>`).join('');
  $('.pp-books',o).hidden=ks.length<2;
  $('.pp-pages',o).innerHTML=bookPages_(k).map(e=>`<button class="rb pp-pg" data-p="${e.page}" data-b="${k}" aria-label="Page ${e.page}: ${e.lesson.title}"><span>${num(e.page)}</span></button>`).join('');
  $$('.pp-book',o).forEach(b=>b.addEventListener('click',()=>bookList(b.dataset.b)));
  $$('.pp-pg',o).forEach(b=>b.addEventListener('click',()=>bookGo(+b.dataset.p,b.dataset.b)));
}
async function bookGo(n,k){
  const e=bookPages_(k).find(x=>x.page===n); if(!e) return;
  $('#pagePad').hidden=true; SUBJECT=e.subject; bookOpen(e.lesson,e.tab,n);
}
// open a lesson at the part that matches a book page (Questions: at the first question from that page)
async function bookOpen(lesson,t,page){
  await openLesson(lesson); if($('#lesson').hidden) return; if(page) setLast(lesson.id,page);
  if(isAL()&&(t==='read'||t==='booklet')){ await qLoad(); qPick(t==='read'?'lesson':'booklet'); const i=qz.list.findIndex(q=>q.set.page===page); switchTab(t,i<0?0:i); return; }   // English AL: a book / booklet page opens at its first part
  if(BOOKOF(t)!=='book'||t==='quiz'){ const k=BOOKOF(t); await qLoad(); const has=k==='book'||qz.all.some(q=>qSrcOf(q.set)===k); switchTab(has&&['workbook','booklet'].includes(k)?k:'quiz',has?qFirstOnPage(page,k):0);
    if(!has) message('Soon!',`${BOOKNAME(k)} questions are coming soon!`,`<span class="car">${CAR('sad')}</span>`); }
  else if(t!==tab) switchTab(t);
}
// the pages of a lesson on the map road, on its two sides: the Book on one, the Workbook on the other.
// Book: every page from the lesson's first page to the page before the next lesson starts; each opens its own part
// (a page with no part listed opens the part of the next listed page). Workbook: its pages, each opens the Workbook questions.
function bookPages(l,next){
  if(!l.pages) return [];
  const part={}; ['read','words','quiz'].forEach(t=>[].concat(l.pages[t]||[]).forEach(p=>{ if(!part[+p]) part[+p]=t; }));
  const ps=Object.keys(part).map(Number); if(!ps.length) return [];
  const nb=next&&next.pages?['read','words','quiz'].flatMap(t=>[].concat(next.pages[t]||[])).map(Number):[], nx=nb.length?Math.min(...nb):Infinity;
  const from=Math.min(...ps), to=Math.max(Math.max(...ps), nx<Infinity&&nx-from<=12?nx-1:0);
  const out=[]; for(let p=from;p<=to;p++){ const k=ps.filter(x=>x>=p).sort((a,b)=>a-b)[0]??Math.max(...ps); out.push({page:p,tab:part[p]||part[k],known:!!part[p]}); }
  return out;
}
// the legend above the map: one line, a coloured square and the name for each kind of sign (same on every subject)
const KEYCLS={workbook:'pts',booklet:'bk'};
const LEGEND=[['bk0','Book'],['pts','PTS'],['bk','Booklet'],['tl','Tool'],['ex','Test']];
function drawLegend(){
  const g=$('#mapLegend'); if(!g) return;
  g.innerHTML=LEGEND.map(([c,n])=>`<span class="lg lg-${c}"><i></i><b>${tr(n)}</b></span>`).join('');
}

function bookSides(l,next){
  // each page is a little speech-bubble sign (like the "Level 11" sign in Ahmed's picture): the book's name small on top, the page number big,
  // the bubble's tail pointing at the road. Book pages on one side of the road, Workbook pages on the other, spread between this lesson and the next.
  const tile=(name,inner,attrs)=>`<span class="jpg"><button class="jpm" ${attrs}><small>${name}</small>${inner}</button><i class="jsl"></i></span>`;
  const box=e=>{ const name=e.tab==='workbook'?tr('PTS'):e.tab==='booklet'?tr('Booklet'):tr('Book');
    return tile(name,`<b>${num(e.page)}</b>`,`data-tab="${e.tab}" data-p="${e.page}" aria-label="${name} page ${e.page}: ${TABNAME[e.tab]}"`).replace('class="jpm"',`class="jpm ${KEYCLS[e.tab]||''}"`); };
  const side=(cls,list,extra=[])=>`<div class="jside ${cls}" data-n="${Math.max(1,list.length+extra.length)}"><span class="jpgs">`+list.map(box).join('')+extra.join('')+`</span></div>`;
  const wk=l.pages&&l.pages.booklet?'booklet':'workbook';
  const wb=[].concat(l.pages&&l.pages[wk]||[]).map(Number).sort((a,b)=>a-b).map(p=>({page:p,tab:wk,known:true}));
  // exam papers (Tests): red signs on the Workbook side, after its pages (lesson "exams" in subject.json)
  const exs=(l.exams||[]).map(e=>tile(tr(e.label||'Test'),`<b class="jex">${ICON.exam}</b>`,`class="ex" data-ex="${e.id}" aria-label="${e.title||'Exam'}"`).replace('<button class="jpm" class="ex"','<button class="jpm ex"'));
  const rvs=(l.revs||[]).map(e=>tile(tr(e.label||'Test'),`<b class="jex">${ICON.exam}</b>`,`data-rev="${e.folder}" data-p="${e.page}" aria-label="${e.label||'Test'}"`).replace('class="jpm"','class="jpm ex rv"'));
  const tls=(l.tools||[]).map(e=>tile(tr(e.label||'Tool'),`<b class="jex jtx">${(e.map||e.title||'').split(' ').join('<br>')}</b>`,`data-tool="${e.id}" aria-label="${e.title||'Tool'}"`).replace('class="jpm"','class="jpm tl"'));
  // the same in every subject: a side with nothing on it is left out (no "soon" sign)
  const bk=bookPages(l,next), more=[...rvs,...exs,...tls];
  return (bk.length?side('bkp',bk):'')+(wb.length||more.length?side('wb',wb,more):'');
}

// the book button next to Home on the map and lesson screens
$$('#map .navbtns, #lesson .navbtns').forEach(nb=>{
  const b=el('button','rb bookbtn',ICON.book); b.setAttribute('aria-label','Book page'); b.addEventListener('click',()=>bookPad());
  const after=$('[data-go="map"]',nb)||$('[data-go="subjects"]',nb); after.after(b);
});
;
/* ===== js/exam-art.js ===== */
/* EXAM PAPER ART — the little drawings printed on the exam papers (stars, apples, birds, ten-frames ...), drawn as SVG so they stay sharp and clean.
   An exam question uses one by name: "art":"apples:6" (name:param,param). Another file (.svg/.png/.jpg/.webp, path relative to the exam.json) works too.
   To add a drawing: XA.name=(a,b)=>svg string. Helpers: xg (a grid of n things), the draw functions below take a centre (cx,cy) and a size. */
const XA={};
const XS=(w,h,body)=>`<svg class="xart" viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`;
// n things in rows of `cols`, each cell cw x ch, the last row left-aligned
function xg(n,cols,cw,ch,draw,pad=8){ cols=Math.min(cols,n)||1; const rows=Math.ceil(n/cols); let b='';
  for(let i=0;i<n;i++) b+=draw((i%cols+.5)*cw+pad,(Math.floor(i/cols)+.5)*ch+pad,Math.min(cw,ch)*.46,i);
  return XS(cols*cw+pad*2,rows*ch+pad*2,b); }
const xStar=(cx,cy,r,fill='#D9566B',line='#A02E48')=>{ const p=[]; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, k=i%2?r*.5:r; p.push((cx+k*Math.cos(a)).toFixed(1)+','+(cy+k*Math.sin(a)).toFixed(1)); }
  return `<polygon points="${p.join(' ')}" fill="${fill}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>`; };
const xApple=(cx,cy,r)=>`<path d="M${cx},${cy-r*.7}C${cx+r*1.2},${cy-r*1.2} ${cx+r*1.4},${cy+r*.5} ${cx+r*.55},${cy+r*.95}C${cx+r*.25},${cy+r*1.1} ${cx-r*.25},${cy+r*1.1} ${cx-r*.55},${cy+r*.95}C${cx-r*1.4},${cy+r*.5} ${cx-r*1.2},${cy-r*1.2} ${cx},${cy-r*.7}Z" fill="#E2362E" stroke="#9E1B1B" stroke-width="2"/>`+
  `<path d="M${cx},${cy-r*.7}q${r*.05},${-r*.35} ${r*.2},${-r*.55}" stroke="#6B3A1A" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M${cx+r*.12},${cy-r*.9}q${r*.5},${-r*.4} ${r*.85},${-r*.05}q${-r*.4},${r*.45} ${-r*.85},${r*.05}z" fill="#58B947" stroke="#2F7D2A" stroke-width="1.5"/>`+
  `<ellipse cx="${cx-r*.5}" cy="${cy-r*.15}" rx="${r*.16}" ry="${r*.3}" fill="#fff" opacity=".4"/>`;
const xBird=(cx,cy,r)=>`<g stroke="#2F6FA8" stroke-width="2" stroke-linejoin="round"><path d="M${cx-r*.9},${cy+r*.1}l${-r*.5},${-r*.35}l${r*.1},${r*.7}z" fill="#5BA3DD"/><ellipse cx="${cx}" cy="${cy+r*.1}" rx="${r*.95}" ry="${r*.7}" fill="#6DB3EA"/><circle cx="${cx+r*.55}" cy="${cy-r*.45}" r="${r*.45}" fill="#6DB3EA"/><path d="M${cx+r*.95},${cy-r*.5}l${r*.45},${r*.12}l${-r*.45},${r*.2}z" fill="#F4A62A" stroke="#B87312"/><path d="M${cx-r*.45},${cy+r*.05}q${r*.5},${-r*.3} ${r*.75},${r*.35}q${-r*.4},${r*.3} ${-r*.75},${-r*.35}z" fill="#3F86C4"/></g><circle cx="${cx+r*.66}" cy="${cy-r*.52}" r="${r*.1}" fill="#233"/><path d="M${cx-r*.2},${cy+r*.75}v${r*.35}m${r*.35},${-r*.35}v${r*.35}" stroke="#B87312" stroke-width="2.5" stroke-linecap="round"/>`;
const xCar=(cx,cy,r,body='#7DBD6B',line='#3F7D33')=>{ const w=r*2.1, x=cx-w/2, y=cy-r*.1;
  return `<g stroke="${line}" stroke-width="2" stroke-linejoin="round"><path d="M${x+w*.2},${y}l${w*.12},${-r*.5}h${w*.36}l${w*.14},${r*.5}z" fill="${body}"/><rect x="${x}" y="${y}" width="${w}" height="${r*.7}" rx="${r*.2}" fill="${body}"/><path d="M${x+w*.27},${y-r*.05}l${w*.08},${-r*.38}h${w*.14}v${r*.38}zM${x+w*.54},${y-r*.05}v${-r*.38}h${w*.12}l${w*.09},${r*.38}z" fill="#D8EEF8"/><circle cx="${x+w*.25}" cy="${y+r*.72}" r="${r*.26}" fill="#334" stroke="#223"/><circle cx="${x+w*.75}" cy="${y+r*.72}" r="${r*.26}" fill="#334" stroke="#223"/></g>`; };
const xPencil=(cx,cy,h,body='#F6C94D')=>{ const w=h*.2; return `<g stroke="#9A5A12" stroke-width="1.6" stroke-linejoin="round"><rect x="${cx-w/2}" y="${cy-h/2+h*.12}" width="${w}" height="${h*.62}" fill="${body}"/><path d="M${cx-w/2},${cy-h/2+h*.12}l${w/2},${-h*.12}l${w/2},${h*.12}z" fill="#F5D7B0"/><path d="M${cx-w*.18},${cy-h/2+h*.02}h${w*.36}l${-w*.18},${-h*.02}z" fill="#444"/><rect x="${cx-w/2}" y="${cy+h/2-h*.26}" width="${w}" height="${h*.1}" fill="#C8CBD2"/><rect x="${cx-w/2}" y="${cy+h/2-h*.16}" width="${w}" height="${h*.16}" rx="${w*.2}" fill="#EE7F96"/></g>`; };
const xFish=(cx,cy,r,body='#F4B63A')=>`<g stroke="#B4741A" stroke-width="2" stroke-linejoin="round"><path d="M${cx+r*.7},${cy}l${r*.75},${-r*.5}v${r}z" fill="#E9962B"/><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r*.62}" fill="${body}"/><path d="M${cx-r*.1},${cy-r*.6}q${r*.3},${-r*.4} ${r*.6},${-r*.05}" fill="#E9962B"/></g><circle cx="${cx-r*.45}" cy="${cy-r*.12}" r="${r*.13}" fill="#fff" stroke="#233"/><circle cx="${cx-r*.47}" cy="${cy-r*.12}" r="${r*.06}" fill="#233"/><path d="M${cx+r*.1},${cy-r*.3}v${r*.6}" stroke="#B4741A" stroke-width="2" opacity=".5"/>`;
const xDolphin=(cx,cy,r)=>`<g transform="rotate(-10 ${cx} ${cy})" stroke="#2F6FA8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M${cx-r*1.05},${cy}l${-r*.5},${-r*.5}q${r*.3},${r*.5} ${r*.25},${r*.5}q${r*.05},${r*.05} ${-r*.25},${r*.5}q${r*.2},${-r*.5} ${r*.5},${-r*.5}z" fill="#4A93D1"/><path d="M${cx-r*.1},${cy-r*.45}l${r*.15},${-r*.6}l${r*.4},${r*.5}z" fill="#4A93D1"/><ellipse cx="${cx}" cy="${cy}" rx="${r*1.1}" ry="${r*.5}" fill="#6DB3EA"/><ellipse cx="${cx+r*1.2}" cy="${cy+r*.1}" rx="${r*.38}" ry="${r*.15}" fill="#6DB3EA"/><path d="M${cx-r*.6},${cy+r*.2}q${r*.9},${r*.35} ${r*1.7},${-r*.05}" fill="none" stroke="#CFE8F8" stroke-width="3"/></g><circle cx="${cx+r*.7}" cy="${cy-r*.12}" r="${r*.09}" fill="#233"/>`;
const xSmileStar=(cx,cy,r)=>xStar(cx,cy,r,'#FFC83A','#C98A00')+`<circle cx="${cx-r*.25}" cy="${cy-r*.05}" r="${r*.07}" fill="#533"/><circle cx="${cx+r*.25}" cy="${cy-r*.05}" r="${r*.07}" fill="#533"/><path d="M${cx-r*.2},${cy+r*.2}q${r*.2},${r*.2} ${r*.4},0" stroke="#533" stroke-width="2" fill="none" stroke-linecap="round"/>`;
const xButterfly=(cx,cy,r)=>`<g stroke="#B8527A" stroke-width="2" stroke-linejoin="round"><path d="M${cx},${cy}q${-r*1.2},${-r*1.1} ${-r*1.1},${-r*.1}q${r*.1},${r*.6} ${r*1.1},${r*.1}z" fill="#F7A8C4"/><path d="M${cx},${cy}q${r*1.2},${-r*1.1} ${r*1.1},${-r*.1}q${-r*.1},${r*.6} ${-r*1.1},${r*.1}z" fill="#F7A8C4"/><path d="M${cx},${cy}q${-r*.9},${r*.2} ${-r*.8},${r*.8}q${r*.6},${r*.1} ${r*.8},${-r*.8}z" fill="#F4C26B"/><path d="M${cx},${cy}q${r*.9},${r*.2} ${r*.8},${r*.8}q${-r*.6},${r*.1} ${-r*.8},${-r*.8}z" fill="#F4C26B"/><rect x="${cx-r*.07}" y="${cy-r*.45}" width="${r*.14}" height="${r*.95}" rx="${r*.07}" fill="#7A3E12"/></g>`;
const xIce=(cx,cy,r)=>`<g stroke="#A5632A" stroke-width="2" stroke-linejoin="round"><path d="M${cx-r*.5},${cy-r*.1}L${cx},${cy+r*1.25}L${cx+r*.5},${cy-r*.1}z" fill="#F0C27A"/><circle cx="${cx}" cy="${cy-r*.45}" r="${r*.62}" fill="#F2A0BE" stroke="#C0587F"/><path d="M${cx-r*.62},${cy-r*.1}q${r*.62},${r*.35} ${r*1.24},0" fill="none" stroke="#C0587F"/></g>`;
const xDot=(cx,cy,r,fill='#E2362E',line='#8F1D1D')=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${line}" stroke-width="2"/>`;
const xCases={pink:['#F0A2C0','#C5527E'],blue:['#8FC6EE','#3F86C4'],purple:['#C3A0E6','#7C54AE'],yellow:['#F8DF8E','#C99A1E']}, xPens=['#D43A44','#3F86C4','#58B947','#3F86C4','#9BCB4A','#F6C94D','#EE8A4B'];
function xCase(n,key){ const [c,l]=xCases[key]||xCases.pink; let b=''; const w=96, gap=Math.min(15,(w-8)/n);
  for(let i=0;i<n;i++){ const x=48-(n-1)*gap/2+i*gap; b+=`<g stroke="#334" stroke-width="1.4" stroke-linejoin="round"><rect x="${x-5}" y="${8}" width="10" height="${40}" rx="2" fill="${xPens[i%xPens.length]}"/><path d="M${x-5},8l5,-8l5,8z" fill="#F5D7B0"/></g>`; }
  b+=`<rect x="4" y="38" width="${w}" height="46" rx="14" fill="${c}" stroke="${l}" stroke-width="3"/><path d="M52 66c-8-9-3-15 0-9c3-6 8 0 0 9z" fill="#fff" stroke="${l}" stroke-width="2"/>`; return XS(104,92,b); }
function xBowl(n,key){ const col={orange:['#F0B253','#B87A1E'],blue:['#7FB2DE','#3F78A8'],purple:['#B391D8','#6F4C9E']}[key]||['#F0B253','#B87A1E'];
  const at=[[34,34],[62,32],[48,22],[76,38],[20,38],[48,40]].slice(0,n); let b=''; at.forEach(p=>b+=xApple(p[0],p[1],13));
  return XS(100,70,`<path d="M6 40h88c0 22-18 28-44 28S6 62 6 40z" fill="${col[0]}" stroke="${col[1]}" stroke-width="3"/>`.replace('<path','<path')+b.replace(/$/,'')+`<path d="M4 40q46 14 92 0" stroke="${col[1]}" stroke-width="3" fill="none"/>`); }

// ---- named drawings ----
XA.stars=(n=10)=>{ const at=[[28,16],[52,16],[82,26],[14,38],[38,42],[58,44],[88,54],[14,64],[36,72],[64,70],[75,40],[50,60]].slice(0,n); return XS(100,86,at.map(p=>xStar(p[0]+4,p[1]+4,11)).join('')); };
XA.apples=(n=6,cols=3)=>xg(n,+cols,40,40,(x,y,r)=>xApple(x,y,r*.72));
XA.cars=(n=8,cols=3)=>xg(n,+cols,50,34,(x,y,r)=>xCar(x,y,r*.95));
XA.birds=(n=3,cols=3)=>xg(n,+cols,40,38,(x,y,r)=>xBird(x,y,r*.72));
XA.fish=(n=6,cols=6)=>xg(n,+cols,46,34,(x,y,r)=>xFish(x,y,r*.72));
XA.dolphins=(n=4,cols=4)=>xg(n,+cols,56,34,(x,y,r)=>xDolphin(x,y,r*.7));
XA.smilestars=(n=7,cols=7)=>xg(n,+cols,40,38,(x,y,r)=>xSmileStar(x,y,r*.95));
XA.butterflies=(n=7,cols=4)=>xg(n,+cols,40,38,(x,y,r)=>xButterfly(x,y,r*.8));
XA.icecreams=(n=4,cols=4)=>xg(n,+cols,36,58,(x,y,r)=>xIce(x,y-6,r*.95));
XA.pencils=(n=9)=>XS(n*17+14,64,`<rect x="3" y="3" width="${n*17+8}" height="58" rx="8" fill="#FFFDF4" stroke="#78A8CF" stroke-width="2.5"/>`+Array.from({length:n},(_,i)=>xPencil(17*i+16,32,48)).join(''));
XA.pencilcase=(n=7,key='pink')=>xCase(+n,key);
XA.bowl=(n=3,key='orange')=>xBowl(+n,key);
XA.branch=()=>XS(110,64,`<path d="M4 38C28 24 62 28 98 22l8 8-4 14C66 48 34 50 8 48z" fill="#9A5B3A" stroke="#5A3418" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="102" cy="34" rx="4" ry="9" fill="#C98C62"/>`+[[28,16,-30],[24,52,40],[84,12,-50],[80,56,30]].map(p=>`<g transform="translate(${p[0]} ${p[1]}) rotate(${p[2]})"><path d="M0 0q9-14 20 0q-9 14-20 0z" fill="#79C84A" stroke="#3F7D2A" stroke-width="1.8"/></g>`).join(''));
XA.hand=(n=3)=>{ const fx=[[46,6,-12],[58,2,0],[70,6,12],[80,22,28],[32,24,-34]]; let f=''; for(let i=0;i<n;i++){ const p=fx[i]; f+=`<rect x="${p[0]-6}" y="${p[1]}" width="12" height="38" rx="6" fill="#F4C7A6" stroke="#B2634A" stroke-width="2" transform="rotate(${p[2]} ${p[0]} ${p[1]+38})"/>`; }
  return XS(110,100,f+`<path d="M34 50q4-8 12-6h34q10 0 12 10l-2 24q-2 14-18 18H52q-16-4-18-20z" fill="#F4C7A6" stroke="#B2634A" stroke-width="2.4"/><path d="M42 60q10-4 16 4M60 60q10-4 16 4" stroke="#B2634A" stroke-width="2" fill="none"/><path d="M12 30l10 6M98 30l-10 6M8 50h12M100 50H90" stroke="#F1C45A" stroke-width="5" stroke-linecap="round"/>`); };
XA.fishbowl=()=>XS(120,100,`<ellipse cx="60" cy="56" rx="48" ry="38" fill="#DCEFFB" fill-opacity=".7" stroke="#6AA8D8" stroke-width="4"/><ellipse cx="60" cy="20" rx="26" ry="7" fill="#fff" fill-opacity=".6" stroke="#6AA8D8" stroke-width="4"/><path d="M26 40q4-12 14-16" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/><rect x="40" y="90" width="40" height="6" rx="3" fill="#8FC0E8" stroke="#6AA8D8" stroke-width="2"/><circle cx="104" cy="12" r="5" fill="none" stroke="#6AA8D8" stroke-width="2"/><circle cx="112" cy="26" r="3.5" fill="none" stroke="#6AA8D8" stroke-width="2"/>`);
XA.cars2=()=>XS(120,72,xCar(38,28,26,'#F4C94A','#B98A12')+xCar(78,50,26,'#7FB9E2','#3F7BA8'));
XA.tenframe=(n=6)=>{ let b=`<rect x="3" y="3" width="124" height="52" rx="6" fill="#FFFDF4" stroke="#6AA8D8" stroke-width="2.5"/><path d="M31 3v52M57 3v52M83 3v52M109 3v52M3 29h124" stroke="#9CC4E4" stroke-width="2"/>`;
  for(let i=0;i<n;i++) b+=xDot(16+(i%5)*26,16+Math.floor(i/5)*26,8.5); return XS(130,58,b); };
XA.dotrow=(k=3,tot=5)=>{ let b=`<rect x="3" y="3" width="${tot*28+10}" height="34" rx="8" fill="#FFFDF4" stroke="#6AA8D8" stroke-width="2.5"/>`; for(let i=0;i<tot;i++) b+=i<k?xDot(20+i*28,20,9):`<circle cx="${20+i*28}" cy="20" r="9" fill="#fff" stroke="#8A97A3" stroke-width="2"/>`; return XS(tot*28+16,40,b); };
XA.circles=(k=4,tot=5)=>{ let b=`<rect x="3" y="3" width="${tot*28+10}" height="34" rx="8" fill="#FFFDF4" stroke="#6AA8D8" stroke-width="2.5"/>`; for(let i=0;i<tot;i++) b+=i<k?xDot(20+i*28,20,10,'#6F8FC4','#3D5A94'):`<circle cx="${20+i*28}" cy="20" r="10" fill="#fff" stroke="#8A97A3" stroke-width="2"/>`; return XS(tot*28+16,40,b); };
XA.dots=(n=6,cols=5)=>xg(n,+cols,26,26,(x,y)=>xDot(x,y,9,'#2F8BD9','#1C5C9E'),6);
XA.bond=(t='',l='',r='')=>{ const bx=(x,y,v,c='#FFFFFF')=>`<rect x="${x}" y="${y}" width="30" height="26" rx="6" fill="${c}" stroke="#7AB3DC" stroke-width="2.5"/><text x="${x+15}" y="${y+19}" text-anchor="middle" font-family="Baloo Bhaijaan 2,Arial" font-weight="800" font-size="17" fill="#243F5C">${v}</text>`;
  return XS(110,76,`<path d="M55 28L25 48M55 28L85 48" stroke="#7AB3DC" stroke-width="2.5" fill="none"/>`+bx(40,3,t==='?'?'':t,t==='?'?'#FFE8C2':'#fff')+bx(8,46,l)+bx(72,46,r)); };
XA.books=()=>XS(110,84,`<rect x="14" y="52" width="86" height="22" rx="4" fill="#79C84A" stroke="#3F7D2A" stroke-width="2.5"/><rect x="8" y="30" width="86" height="22" rx="4" fill="#5CA6E0" stroke="#2F6FA8" stroke-width="2.5"/><rect x="16" y="10" width="86" height="22" rx="4" fill="#E87AA8" stroke="#A8386A" stroke-width="2.5"/><path d="M24 62h66M18 40h66M26 20h66" stroke="#fff" stroke-width="3" opacity=".6"/>${xStar(56,6,9,'#FFC83A','#C98A00')}`);
XA.pencilcup=()=>XS(90,100,`${xPencil(30,26,52,'#5CA6E0')}${xPencil(48,20,60,'#79C84A')}${xPencil(66,26,52,'#E87AA8')}<path d="M18 46h54l-6 44H24z" fill="#F8DF8E" stroke="#C99A1E" stroke-width="3" stroke-linejoin="round"/><path d="M45 74c-9-9-4-14 0-9c4-5 9 0 0 9z" fill="#EE7F96" stroke="#A8386A" stroke-width="1.5"/>`);
XA.cloudnum=(n=1)=>XS(80,52,`<path d="M16 40q-12 0-12-11t13-11q2-12 17-12 11 0 15 8 14-3 20 7 10 2 8 14t-12 5z" fill="#CFE6F8" stroke="#6AA8D8" stroke-width="3" stroke-linejoin="round"/><text x="40" y="33" text-anchor="middle" font-family="Baloo Bhaijaan 2,Arial" font-weight="800" font-size="22" fill="#2F6FA8">${n}</text>`);
XA.pencilicon=()=>XS(40,40,`<g transform="rotate(45 20 20)"><rect x="14" y="2" width="12" height="28" fill="#F6C94D" stroke="#9A5A12" stroke-width="2"/><path d="M14 30l6 9 6-9z" fill="#F5D7B0" stroke="#9A5A12" stroke-width="2" stroke-linejoin="round"/><path d="M18 36l2 3 2-3z" fill="#444"/><rect x="14" y="2" width="12" height="6" fill="#EE7F96" stroke="#9A5A12" stroke-width="2"/></g>`);
XA.bicycle=()=>XS(120,80,`<g fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="28" cy="56" r="20" stroke="#2F3A4A" stroke-width="5"/><circle cx="94" cy="56" r="20" stroke="#2F3A4A" stroke-width="5"/><circle cx="28" cy="56" r="3" fill="#2F3A4A"/><circle cx="94" cy="56" r="3" fill="#2F3A4A"/><path d="M28 56L50 28H80L94 56M50 28L62 56H28M62 56L80 28" stroke="#E2362E" stroke-width="5"/><path d="M44 22h14M82 28l-4-14h12" stroke="#2F3A4A" stroke-width="5"/><rect x="82" y="2" width="16" height="12" rx="3" fill="#F4C94A" stroke="#B98A12" stroke-width="2"/></g>`);
XA.coins=()=>XS(120,64,[[34,'#E7B83A','١'],[84,'#F0CB5A','١']].map(c=>`<circle cx="${c[0]}" cy="32" r="26" fill="${c[1]}" stroke="#A9781B" stroke-width="3"/><circle cx="${c[0]}" cy="32" r="19" fill="none" stroke="#C99A2B" stroke-width="2"/><text x="${c[0]}" y="41" text-anchor="middle" font-family="Baloo Bhaijaan 2,Arial" font-weight="800" font-size="26" fill="#8A5E12">${c[2]}</text>`).join(''));
XA.mountain=()=>XS(130,84,`<rect x="2" y="2" width="126" height="80" rx="8" fill="#BFE3F6"/><circle cx="104" cy="22" r="10" fill="#FFD84A"/><path d="M2 82L44 22L66 50L84 30L128 82Z" fill="#6E8FA8" stroke="#46647C" stroke-width="2.5" stroke-linejoin="round"/><path d="M44 22L34 38L42 34L48 42L54 34L60 40Z" fill="#fff" stroke="#46647C" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 82L28 58L58 82Z" fill="#79C84A" stroke="#3F7D2A" stroke-width="2" stroke-linejoin="round"/>`);
XA.story=(n=1)=>{ const sky='<ellipse cx="50" cy="50" rx="46" ry="46" fill="#CDEBFA" stroke="#8DBFE0" stroke-width="3"/><path d="M6 66Q50 52 94 66A46 46 0 0 1 6 66Z" fill="#B07A4A"/>', leaf=(x,y,r,s=1)=>`<path d="M${x},${y}q${14*s},${-18*s} ${30*s},${-4*s}q${-12*s},${18*s} ${-30*s},${4*s}z" transform="rotate(${r} ${x} ${y})" fill="#6CC04A" stroke="#357A2A" stroke-width="2"/>`;
  const b=[`<path d="M50 62q-8-8-4-16q8 0 8 10z" fill="#79C84A" stroke="#357A2A" stroke-width="2"/><path d="M44 70q6 10 12 0q-2-14-6-18q-4 6-6 18z" fill="#6FA8DC" stroke="#3F78A8" stroke-width="2"/>`,
   `<path d="M50 66V46" stroke="#357A2A" stroke-width="4" stroke-linecap="round"/>${leaf(50,48,-35,.8)}${leaf(50,48,-145,.8)}`,
   `<path d="M50 66V30" stroke="#357A2A" stroke-width="5" stroke-linecap="round"/>${leaf(50,58,-30)}${leaf(50,58,-150)}${leaf(50,42,-40,.9)}${leaf(50,42,-140,.9)}${leaf(50,30,-80,.7)}`,
   `<path d="M44 68V40h12v28z" fill="#8A5A34" stroke="#5A3418" stroke-width="2.5"/><circle cx="50" cy="30" r="20" fill="#5CB83F" stroke="#357A2A" stroke-width="2.5"/><circle cx="36" cy="38" r="12" fill="#6CC04A" stroke="#357A2A" stroke-width="2.5"/><circle cx="64" cy="38" r="12" fill="#6CC04A" stroke="#357A2A" stroke-width="2.5"/><circle cx="46" cy="26" r="3" fill="#E2362E"/><circle cx="58" cy="34" r="3" fill="#E2362E"/>`];
  return XS(100,100,sky+b[n-1]); };
function xArt(spec,base){ if(!spec) return ''; if(/\.(svg|png|jpe?g|webp)$/i.test(spec)) return `<img class="xart" src="${new URL(spec,base)}" alt="">`;
  const [n,p]=String(spec).split(':'), f=XA[n]; return f?f(...(p?p.split(',').map(v=>/^-?\d+(\.\d+)?$/.test(v)?+v:v):[])):''; }
;
/* ===== js/exam.js ===== */
/* EXAM PAPERS — the school's "Models / تقييمات" sheets, solved on the screen.
   An exam looks like the paper (one or more sheets one after another, same design), NOT like a game: the child types, ticks, circles, underlines,
   matches or colours exactly as the question says. Every answer is checked at once: right = a small celebration, wrong = a warning (no grade at the end).
   Each question's header line has a listen icon (reads only that question) and a help icon (shows the answer faintly for a moment).
   Landscape screens: the sheet is wide and scrolls up/down. Portrait: each sheet is fitted to the screen whole.
   The papers are DATA (data/<subject>/exams/<name>/exam.json), see docs/EXAMS.md: a new exam needs no code.
   The red marker on the map: a lesson in subject.json gets "exams":[{"id":"models","title":"Models","file":"data/math/exams/models/exam.json"}].
   Drawings come from js/exam-art.js. Question audio: "audio" path on a question (recording) else the device voice reads the text (English only; Arabic never). */
const X={base:location.href,qs:[],pages:[],run:0,links:[]};
const xNorm=s=>String(s==null?'':s).replace(/[\u0660-\u0669]/g,d=>d.charCodeAt(0)-0x660).replace(new RegExp('['+AR_MARKS+'\\u0640]','g'),'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase().trim().replace(/\s+/g,' ');

// ---------- open / build ----------
async function openExam(lesson,ex){
  stopAll(); vStop(); busy(true);
  let d; try{ X.base=new URL(ex.file,location.href).href; d=await get(ex.file); }catch(e){ busy(false); message('Oops!','This paper did not load. Check the internet and try again.'); return; }
  await vpLoad(isAr()?null:new URL('.',X.base).href);
  X.d=d; X.title=ex.title||d.title||'Exam'; X.qs=[]; X.pages=[]; X.links=[]; X.run++;
  const root=$('#xPages'); root.innerHTML='';
  (d.pages||[]).forEach((pg,i)=>root.append(xPage(pg,i,d)));
  $('#xTitle').textContent=X.title; $('#xSub').textContent=SUBJECT.name;
  // one button per assessment, ONE assessment on screen at a time: pages that share a "group" (the assessment number) stack under its button; no group = a page is its own assessment
  // button text is short: the number if the assessment is numbered ("Model 2" -> 2, "تقييم نهائي ٣" -> ٣), else its name; "tab" on the page overrides
  X.groups=[]; (d.pages||[]).forEach((p,i)=>{ const g=p.group!=null?String(p.group):'p'+i, k=X.groups.find(x=>x.g===g); if(k) k.pages.push(i); else X.groups.push({g,label:xTabLabel(p),pages:[i]}); });
  $('#xChips').innerHTML=X.groups.length>1?X.groups.map((g,i)=>`<button class="pill cream xchip" data-i="${i}">${g.label}</button>`).join(''):'';
  $$('.xchip').forEach(b=>b.onclick=()=>xShow(+b.dataset.i));
  $$('img',root).forEach(i=>{ if(!i.complete) i.addEventListener('load',()=>{ clearTimeout(xFit.t2); xFit.t2=setTimeout(xFit,60); },{once:true}); });
  X.cur=0; xShow(0,true); show('exam'); busy(false); xFit(); $('#xScroll').scrollTop=0;
  X.qs.forEach(q=>q.el.classList.toggle('done',q.atoms.every(a=>a.solved)));
}
function xPage(pg,pi,d){
  const p=el('article','xpage'); p.dataset.i=pi; X.pages.push(p); if(pg.fs) p.style.setProperty('--fs',pg.fs); if(pg.style) p.classList.add(...pg.style.split(' '));
  const head=pg.head||d.head;
  if(head) p.append(el('header','xtop',`<div class="xtl">${head.l||''}</div><i class="xwave"></i><div class="xtr">${head.r||''}</div>`));
  if(pg.title) p.append(el('h2','xmodel',`<span class="xs">${xArt('smilestars:1,1')}</span><b>${pg.title}</b><span class="xs b">${xArt('smilestars:1,1')}</span>`));
  const flow=el('div','xflow'); p.append(flow);
  let sec=null;
  (pg.blocks||[]).forEach(b=>{
    if(b.t==='section'){ flow.append(el('h3','xsec',`<span class="xpi">${xArt('pencilicon')}</span><span>${b.text}</span>`)); }
    else if(b.t==='art'){ const f=el('div','xfloat '+(b.float||'right')+(b.frame?' frame':'')); f.style.width=(b.w||14)+'em'; f.innerHTML=xArt(b.art,X.base); flow.append(f); }
    else if(b.t==='q') flow.append(xQuestion(b,pi));
  });
  p.append(el('footer','xfoot',`<i class="xwave"></i><span class="xcloud">${xArt('cloudnum:'+(pg.foot||pi+1))}</span>`));
  return p;
}

// ---------- feedback ----------
function xYay(t){   // a small celebration on the right answer
  chime(Math.floor(Math.random()*4)); if(!anim||!t) return;
  const r=t.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  for(let i=0;i<6;i++){ const s=el('div','spark',STAR(true)); s.style.width=s.style.height='1.4rem'; document.body.append(s); const a=Math.PI*2*i/6, d=36+Math.random()*30;
    G.set(s,{left:cx,top:cy,xPercent:-50,yPercent:-50,scale:.2}); G.to(s,{x:Math.cos(a)*d,y:Math.sin(a)*d,scale:.55+Math.random()*.3,rotation:Math.random()*300,duration:.55,ease:'power2.out'}); G.to(s,{opacity:0,duration:.3,delay:.4,onComplete:()=>s.remove()}); }
}
function xWarn(t){   // a warning on the wrong answer: low buzz, a shake and a small red triangle
  tone(170,'square',.06,.2); if(!t) return; if(anim) G.fromTo(t,{x:-6},{x:0,duration:.5,ease:'elastic.out(1.5,.25)'});
  const w=el('span','xwarn','<svg viewBox="0 0 24 24"><path d="M12 3L2 21h20z" fill="#E0412C" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 10v5m0 3v.1" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>');
  const host=t.closest('.xbl,.xo,.xit')||t; host.classList.add('bad'); host.append(w); setTimeout(()=>{ w.remove(); host.classList.remove('bad'); },850);
}
function xAtomDone(Q,a){ a.solved=true; if(Q.atoms.every(x=>x.solved)){ Q.el.classList.add('done'); xFinishCheck(); } }
function xFinishCheck(){ if(X.qs.every(q=>q.atoms.every(a=>a.solved))){ celebrate($('#xTitle')); setTimeout(()=>message(tr('Great!'),'You finished the whole paper!',`<span class="car">${CAR('happy')}</span>`),900); } }

// ---------- a question ----------
function xQuestion(b,pi){
  const Q={el:el('section','xq'),atoms:[],say:b.say,audio:b.audio}; X.qs.push(Q);
  if(b.n!=null) Q.el.append(el('b','xn',b.n+(/^\d+$/.test(b.n)?')':'')));
  const body=el('div','xbody'); Q.el.append(body);
  const t=el('div','xqt'); Q.raw=b.text||''; xInline(Q.raw,Q,t);
  const tools=el('span','xtools',`<button class="xtool xlisten" aria-label="Listen to the question">${SAY_LN}</button><button class="xtool xhelp" aria-label="Help">${ICON.hint}</button>`);
  const lastw=el('span','xlast'), ln=t.lastChild;   // the last word stays together with the icons (they never wrap alone)
  if(ln&&ln.nodeType===3){ const i=ln.data.search(/\S+\s*$/); if(i>0){ lastw.append(document.createTextNode(ln.data.slice(i))); ln.data=ln.data.slice(0,i); } else{ lastw.append(ln); } }
  else if(ln) lastw.append(ln);
  lastw.append(tools); t.append(lastw); body.append(t);
  $('.xlisten',tools).onclick=()=>xSay(Q); $('.xhelp',tools).onclick=()=>xHelp(Q);
  (b.body||[]).forEach(a=>body.append(xAtom(a,Q)));
  return Q.el;
}
// the question as it is spoken: each blank is the sign ⌷ (the voice pack says it like a question waiting for the answer; never the word "blank")
const xSpoken=raw=>String(raw).replace(/\{\{.*?\}\}/g,' ').replace(/\[\[.*?\]\]/g,' ⌷ ').replace(/\.{3,}|_{3,}|…+/g,' ⌷ ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().toLowerCase();
async function xSay(Q){
  vStop(); stopAll(); const run=++X.run;
  const say=Q.say||xSpoken(Q.raw);
  if(Q.audio){ try{ await playFile(new URL(Q.audio,X.base).href); return; }catch(e){ if(isAr()) return; } }
  if(run===X.run) await tts(vpClip(say)?say:say.replace(/⌷/g,', '),isAr()?'ar':'en',.8);   // vocab.js plays it from the paper's voice pack (voice.mp3); only a text missing there falls to the device voice
}
function xHelp(Q){
  const undo=Q.atoms.filter(a=>!a.solved&&a.help).map(a=>a.help()); setTimeout(()=>undo.forEach(u=>u&&u()),2600);
}

// ---------- atoms ----------
function xAtom(a,Q){
  if(typeof a==='string') a={t:'text',text:a};
  const f={text:xTextAtom,mcq:xMcq,link:xLink,fill:xFill,bond:xBond,art:xArtAtom,row:xRow,col:xRow,say:xSayAtom,order:xOrder}[a.t]; const e=f?f(a,Q):el('div');
  if(a.cls) e.classList.add(...a.cls.split(' ')); if(a.float) e.classList.add('xfl-'+a.float); return e;
}
function xTextAtom(a,Q){ const d=el('div','xtext '+(a.style||'')); xInline(a.text,Q,d);
  if(a.listen){ const b=el('button','xwl',SAY_LN); b.setAttribute('aria-label','Listen'); b.onclick=async()=>{ vStop(); stopAll(); await tts(a.listen,'en',.8); }; d.append(b); }   // a small speaker that reads the whole word (the blanks hide its spelling)
  return d; }
// reorder: tap the words one after another to build the sentence; tap a placed word to take it back. {t:"order",words:[..],answer:"Nice to meet you"|[..],end:"."}
function xOrder(a,Q){
  const d=el('div','xorder'), line=el('div','xol'), pool=el('div','xop'), ok=[].concat(a.answer).map(xNorm), end=a.end==null?'.':a.end; d.append(line,pool);
  const chips=a.words.map(w=>{ const b=el('button','xw'); b.textContent=w; return b; }), placed=[];
  const at={solved:false,el:d,help(){ if(at.solved) return null; line.dataset.ghost=[].concat(a.answer)[0]+end; d.classList.add('help'); return ()=>d.classList.remove('help'); }}; Q.atoms.push(at);
  const draw=()=>{ line.innerHTML=''; placed.forEach(c=>line.append(c)); if(end) line.append(el('i','xend',end)); pool.innerHTML=''; chips.filter(c=>!placed.includes(c)).forEach(c=>pool.append(c)); line.classList.toggle('has',placed.length>0); };
  chips.forEach(c=>c.addEventListener('click',()=>{ if(at.solved) return; vStop(); stopAll(); tts(c.textContent,'en',.8);
    if(placed.includes(c)){ placed.splice(placed.indexOf(c),1); draw(); return; }
    placed.push(c); draw();
    if(placed.length===chips.length){ const t=xNorm(placed.map(x=>x.textContent).join(' '));
      if(ok.includes(t)){ at.solved=true; line.classList.add('ok'); xYay(line); xAtomDone(Q,at); }
      else{ xWarn(line); setTimeout(()=>{ placed.length=0; draw(); },800); } } }));
  draw(); return d;
}
// a word to listen to (tap it): its recording, or (English only) the device voice
function xSayAtom(a){ const b=el('button','xsay '+(a.style||''),`<span class="xsw"></span>${SAY_LN}`); $('.xsw',b).textContent=a.text;
  b.onclick=async()=>{ vStop(); stopAll(); if(a.audio){ try{ await playFile(new URL(a.audio,X.base).href); return; }catch(e){} } if(!isAr()) await tts(a.text,'en',.8); }; return b; }

function xArtAtom(a){ const d=el('div','xartbox '+(a.frame?'frame':'')); if(a.w) d.style.width=a.w+'em'; d.innerHTML=xArt(a.art,X.base); return d; }
function xRow(a,Q){ const d=el('div',(a.t==='col'?'xcol ':'xrow ')+(a.style||'')); d.style.setProperty('--cols',a.cols||a.items.length); if(a.gap!=null) d.style.gap=a.gap+'em'; a.items.forEach(i=>d.append(xAtom(i,Q))); return d; }
function xInline(str,Q,host){
  String(str).split(/(\[\[.*?\]\]|\{\{.*?\}\})/).forEach(part=>{ const m=part.match(/^\[\[(.*)\]\]$/), g=part.match(/^\{\{(.*)\}\}$/); if(m) host.append(xBlank(m[1],Q)); else if(g) host.append(el('span','xia',xArt(g[1],X.base))); else if(part){ const s=el('span'); s.innerHTML=part; host.append(...s.childNodes); } });
}
// a blank the child types into. [[answer]] [[a|b]] (alternatives) [[>7]] [[<5]] (any number bigger / smaller); flags after ":" : box, wide, circ, tiny
function xBlank(spec,Q){
  const [ans,fl='']=spec.split(':'), flags=fl.split(',').filter(Boolean), alts=ans.split('|').map(xNorm), rm=alts.length===1&&alts[0].match(/^([<>])(\d+)$/);
  const test=v=>{ v=xNorm(v); if(!v) return false; if(rm){ const n=+v; return /^\d+$/.test(v)&&(rm[1]==='>'?n>+rm[2]:n<+rm[2]); } return alts.includes(v); };
  const show=rm?(rm[1]==='>'?+rm[2]+1:Math.max(0,+rm[2]-1)):ans.split('|')[0], max=Math.max(...alts.map(s=>s.length));
  const w=el('span','xbl '+flags.map(x=>'f-'+x).join(' ')), inp=el('input','xin'), gh=el('i','xgh',show);
  w.style.setProperty('--n',Math.max(2,String(show).length)); inp.type='text'; inp.autocomplete='off'; inp.autocapitalize='none'; inp.spellcheck=false; inp.setAttribute('aria-label','Answer');
  if(/^\d+$|^[<>]\d+$/.test(ans)) inp.inputMode='numeric'; inp.dir=/[\u0600-\u06FF]/.test(ans)?'rtl':'ltr';
  w.append(inp,gh);
  const a={solved:false,el:w,help(){ if(a.solved) return null; w.classList.add('help'); return ()=>w.classList.remove('help'); }}; Q.atoms.push(a);
  let idle=0;
  const win=()=>{ clearTimeout(idle); if(a.solved) return; inp.readOnly=true; inp.tabIndex=-1; w.classList.add('ok'); xYay(w); xAtomDone(Q,a);
    const all=$$('.xbl:not(.ok) .xin',$('#xPages')), nx=all.find(i=>w.compareDocumentPosition(i)&Node.DOCUMENT_POSITION_FOLLOWING); if(nx&&!isIOS()) setTimeout(()=>nx.focus({preventScroll:false}),250); else inp.blur(); };
  const bad=()=>{ clearTimeout(idle); if(a.solved||!inp.value) return; xWarn(w); setTimeout(()=>{ inp.value=''; inp.focus({preventScroll:true}); },800); };
  inp.addEventListener('input',()=>{ clearTimeout(idle); if(!inp.value||a.solved) return; if(test(inp.value)) return win(); if(rm){ if(inp.value.length>=2) idle=setTimeout(bad,900); else idle=setTimeout(bad,1400); } else if(xNorm(inp.value).length>=max) bad(); });
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); test(inp.value)?win():bad(); } });
  return w;
}
const isIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);

// choose: tap the right option(s). opts: text, or {art}; labels: upper (A.) lower (a.) paren ((A)) none; style: box (boxed numbers), ul (underline instead of circle)
function xMcq(a,Q){
  const d=el('div','xmcq '+(a.style||'')+(a.stack?' stack':'')), ans=[].concat(a.answer); d.style.setProperty('--cols',a.cols||(a.stack?1:a.opts.length));
  if(a.lead) d.append(el('span','xlead',a.lead));
  const L=a.labels||'upper', lab=i=>L==='none'?'':L==='lower'?String.fromCharCode(97+i)+'.':L==='paren'?'('+String.fromCharCode(65+i)+')':String.fromCharCode(65+i)+'.';
  let got=0; const bs=[], need=a.any?1:ans.length;
  const at={solved:false,el:d,help(){ const on=ans.filter(i=>!bs[i].classList.contains('ok')); on.forEach(i=>bs[i].classList.add('help')); return ()=>on.forEach(i=>bs[i].classList.remove('help')); }}; Q.atoms.push(at);
  a.opts.forEach((o,i)=>{ const b=el('button','xo',`${lab(i)?`<span class="xl">${lab(i)}</span>`:''}<span class="xv"></span>`); bs.push(b); const v=$('.xv',b);
    if(o&&o.art){ v.innerHTML=xArt(o.art,X.base); if(o.h) v.style.setProperty('--ah',o.h+'em'); } else v.innerHTML=o; d.append(b);
    b.addEventListener('click',()=>{ if(at.solved||b.classList.contains('ok')) return;
      if(ans.includes(i)){ b.classList.add('ok'); xYay(b); if(++got>=need) xAtomDone(Q,at); } else xWarn(b); }); });
  if(a.pre){ Q.atoms.pop(); bs[ans[0]].classList.add('ok'); d.classList.add('pre'); }   // the worked example: already done
  return d;
}

// colour: tap circles until there are n coloured ones. {t:"fill",n:4,total:10,cols:5}
function xFill(a,Q){
  const d=el('div','xfill'); d.style.setProperty('--cols',a.cols||5); if(a.size) d.style.setProperty('--cs',a.size+'em'); let on=0; const cs=[];
  const at={solved:false,el:d,help(){ const off=cs.filter(c=>!c.classList.contains('on')).slice(0,a.n-on); off.forEach(c=>c.classList.add('help')); return ()=>off.forEach(c=>c.classList.remove('help')); }}; Q.atoms.push(at);
  for(let i=0;i<(a.total||10);i++){ const c=el('button','xc'); cs.push(c); d.append(c);
    c.addEventListener('click',()=>{ if(at.solved) return; if(c.classList.contains('on')){ c.classList.remove('on'); on--; return; }
      if(on>=a.n){ xWarn(c); return; } c.classList.add('on'); on++; if(on===a.n){ xYay(d); d.classList.add('ok'); xAtomDone(Q,at); } }); }
  return d;
}

// number tree: {t:"bond",top:"6",l:"[[2]]",r:"4"} (each box takes text or a blank)
function xBond(a,Q){
  const d=el('div','xbond'); d.innerHTML='<svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path d="M50 24L22 37M50 24L78 37" fill="none" vector-effect="non-scaling-stroke"/></svg>';
  [['top',a.top],['l',a.l],['r',a.r]].forEach(([k,v])=>{ const b=el('div','xbox '+k); xInline(v,Q,b); d.append(b); }); return d;
}

// match: {t:"link",dir:"v"|"h",a:[items],b:[items],pairs:[[0,1],..]}  items: text or {art}. Drag a line, or tap one then the other.
function xLink(a,Q){
  const d=el('div','xlink '+(a.dir==='h'?'h':'v')), A=el('div','xla'), B=el('div','xlb'); d.append(A,B,el('div','xlsvg'));
  const mk=(list,side,host)=>list.forEach((o,i)=>{ const e=el('button','xit',''); e.dataset.side=side; e.dataset.i=i; if(o&&o.art){ e.innerHTML=xArt(o.art,X.base); if(o.w) e.style.setProperty('--aw',o.w+'em'); } else e.innerHTML=o; host.append(e); });
  mk(a.a,'a',A); mk(a.b,'b',B); if((a.pre||[]).length) $$('.xit',d).forEach(e=>{ if(a.pre.some(p=>(e.dataset.side==='a'?p[0]:p[1])===+e.dataset.i)) e.classList.add('pre'); });
  if(a.circ) d.classList.add('circ'); const L={d,pairs:a.pairs,links:(a.pre||[]).map(p=>({i:p[0],j:p[1],ok:true})),sel:null,drag:null}; X.links.push(L); const need=a.pairs.length;
  const at={solved:L.links.length>=a.pairs.length,el:d,help(){ L.ghost=a.pairs.filter(p=>!L.links.some(l=>l.i===p[0]&&l.j===p[1])); xDrawLinks(L); return ()=>{ L.ghost=null; xDrawLinks(L); }; }}; if(!at.solved) Q.atoms.push(at);
  const ptOf=e=>e&&e.closest('.xit'), pt=(e,ev)=>{ const r=d.getBoundingClientRect(); return [ev.clientX-r.left,ev.clientY-r.top]; };
  const tryPair=(x,y)=>{ const [ea,eb]=x.dataset.side==='a'?[x,y]:[y,x], i=+ea.dataset.i, j=+eb.dataset.i;
    if(L.links.some(l=>l.i===i||l.j===j)){ xWarn(x); return; }
    if(a.pairs.some(p=>p[0]===i&&p[1]===j)){ L.links.push({i,j,ok:true}); xDrawLinks(L); xYay(eb); if(L.links.length>=need) xAtomDone(Q,at); }
    else{ const bad={i,j,ok:false}; L.links.push(bad); xDrawLinks(L); xWarn(eb); setTimeout(()=>{ L.links=L.links.filter(l=>l!==bad); xDrawLinks(L); },800); } };
  d.addEventListener('pointerdown',e=>{ const p=ptOf(e.target); if(!p||at.solved) return; L.drag={from:p,x:e.clientX,y:e.clientY,moved:false}; d.setPointerCapture&&d.setPointerCapture(e.pointerId); e.preventDefault(); });
  d.addEventListener('pointermove',e=>{ if(!L.drag) return; if(Math.hypot(e.clientX-L.drag.x,e.clientY-L.drag.y)>6) L.drag.moved=true; if(L.drag.moved){ L.rub=pt(d,e); xDrawLinks(L); } });
  const end=e=>{ if(!L.drag) return; const f=L.drag.from, moved=L.drag.moved; L.drag=null; L.rub=null;
    const t=ptOf(document.elementFromPoint(e.clientX,e.clientY)); const ok=t&&d.contains(t)&&t.dataset.side!==f.dataset.side;
    if(moved){ if(ok) tryPair(f,t); L.sel=null; }
    else if(L.sel&&L.sel!==f&&L.sel.dataset.side!==f.dataset.side){ tryPair(L.sel,f); L.sel=null; } else L.sel=L.sel===f?null:f;
    $$('.xit',d).forEach(x=>x.classList.toggle('sel',x===L.sel)); xDrawLinks(L); };
  d.addEventListener('pointerup',end); d.addEventListener('pointercancel',()=>{ L.drag=null; L.rub=null; xDrawLinks(L); });
  return d;
}
function xDrawLinks(L){
  const d=L.d, svg=$('.xlsvg',d), r=d.getBoundingClientRect(), h=d.classList.contains('h'); if(!r.width) return;
  const anchor=(e)=>{ const q=e.getBoundingClientRect(), a=e.dataset.side==='a'; return h?[(a?q.right:q.left)-r.left,q.top+q.height/2-r.top]:[q.left+q.width/2-r.left,(a?q.bottom:q.top)-r.top]; };
  const items=$$('.xit',d), P=(s,i)=>anchor(items.find(e=>e.dataset.side===s&&+e.dataset.i===i));
  let s=''; items.forEach(e=>{ const [x,y]=anchor(e); s+=`<circle cx="${x}" cy="${y}" r="${r.width*.008+2}" class="xdot"/>`; });
  const line=(p,q,c)=>`<path d="M${p[0]},${p[1]}L${q[0]},${q[1]}" class="${c}"/>`;
  (L.ghost||[]).forEach(p=>s+=line(P('a',p[0]),P('b',p[1]),'xlg'));
  L.links.forEach(l=>s+=line(P('a',l.i),P('b',l.j),l.ok?'xlok':'xlbad'));
  if(L.rub&&L.drag){ const f=anchor(L.drag.from); s+=line(f,L.rub,'xlrub'); }
  svg.innerHTML=`<svg viewBox="0 0 ${r.width} ${r.height}" width="${r.width}" height="${r.height}">${s}</svg>`;
}

// ---------- screen fit ----------
function xTabLabel(p){ const t=p.tab||p.chip||p.title||'', m=String(t).match(/[0-9\u0660-\u0669]+\s*$/); return p.tab||(m?m[0].trim():t); }
function xShow(gi,first){   // only the pages of assessment gi are on screen; the others wait behind their buttons
  X.cur=gi; const on=X.groups[gi].pages; X.pages.forEach((p,i)=>p.hidden=!on.includes(i));
  $$('.xchip').forEach((b,i)=>b.classList.toggle('on',i===gi));
  if(!first){ stopAll(); vStop(); xFit(); $('#xScroll').scrollTop=0; }
}
function xFit(){
  const sc=$('#xScroll'); if(!sc||$('#exam').hidden) return; const rem=parseFloat(getComputedStyle(document.documentElement).fontSize)||16,
    cw=sc.clientWidth-rem*.5, ch=sc.clientHeight-rem*.5, ratio=(X.d&&X.d.ratio)||.707, portrait=matchMedia('(max-aspect-ratio:1/1)').matches;
  const w=portrait?Math.min(cw,ch*ratio):cw;
  sc.classList.toggle('portrait',portrait); X.pages.forEach(p=>{ p.style.setProperty('--pw',w+'px'); p.style.setProperty('--ph',w/ratio+'px'); });
  X.pages.filter(p=>!p.hidden).forEach(xFitPage); X.links.forEach(xDrawLinks);
}
// a sheet's text can be a little too long for its page on some screens (the smallest sizes of text and icons do not shrink): make the questions' text smaller until all fits
function xFitPage(p){
  const base=+(X.d.pages[+p.dataset.i].fs||1), fl=$('.xflow',p), ft=$('.xfoot',p); let fs=base; p.style.setProperty('--fs',fs);
  for(let k=0;k<6;k++){ const last=fl.lastElementChild; if(!last) break; const top=fl.getBoundingClientRect().top, need=last.getBoundingClientRect().bottom-top, have=ft.getBoundingClientRect().top-top-2;
    if(need<=have||fs<=.72) break; fs=Math.max(.72,fs*Math.max(.7,have/need)*.99); p.style.setProperty('--fs',fs); }
}
addEventListener('resize',()=>{ clearTimeout(xFit.t); xFit.t=setTimeout(xFit,120); });
;
/* ===== js/tool.js ===== */
/* TOOLS — helper sheets the school sends (yellow round markers on the map), shown as one interactive slide in a popup.
   Today: "make-numbers" (Math). Subject.json: a lesson gets "tools":[{"id":"make-numbers","label":"Tool","title":"Make numbers"}] for the map marker,
   and a lesson gets "tool":"make-numbers","toolN":5 for the small arcs button beside Home/Map (opens the same slide over the lesson, X closes it).
   Sounds: data/tools/make-numbers/<one>-and-<four>-make-<five>.mp3 (both orders). */
const TW='zero one two three four five six seven eight nine ten'.split(), TCOL=['#E0412C','#2A7FD8','#2FA8A0','#D8396B','#F08A2C','#2A7FD8','#3FA34D','#8A5CC9','#E0412C','#2FA8A0','#2A7FD8'];
document.addEventListener('click',e=>{ if(e.target.closest('.qtool')) toolOpen(LESSON&&LESSON.toolN); });
const ARC=['#E0412C','#2A7FD8','#3FA34D','#F2B01E','#8A5CC9','#D8396B'];
const tl={n:5,on:{},run:0};
function arcPath(a,b,T){ const x=i=>i*100+50, dist=Math.abs(b-a), h=6+Math.max(70,dist/T*270)*1.33;
  return dist?`M${x(a)} 6C${x(a)} ${h} ${x(b)} ${h} ${x(b)} 6`:`M${x(a)-26} 6C${x(a)-26} 96 ${x(a)+26} 96 ${x(a)+26} 6`; }
function arcAdd(svg,a,b,T,cls){ const p=document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('d',arcPath(a,b,T)); p.setAttribute('class','tlarc '+cls); p.style.stroke=ARC[Math.min(a,b)%ARC.length]; svg.append(p); }
const tlSound=(a,b)=>`data/tools/make-numbers/${TW[a]}-and-${TW[b]}-make-${TW[a+b]}.mp3`;
function toolOpen(n){
  tl.n=null; tl.on={}; let o=$('#toolPop');
  if(!o){ o=el('div','overlay toolpop'); o.id='toolPop'; o.innerHTML=`<div class="tlcard" role="dialog" aria-label="Make numbers"><button class="rb tlx" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="tlbody"></div></div>`;
    document.body.append(o); o.addEventListener('click',e=>{ if(e.target===o) toolClose(); }); $('.tlx',o).addEventListener('click',toolClose);
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!o.hidden) toolClose(); }); }
  o.hidden=false; toolDraw(); if(anim) G.from($('.tlcard',o),{scale:.85,opacity:0,duration:.3,ease:'back.out(1.6)',clearProps:'transform,opacity'});
}
function toolClose(){ const o=$('#toolPop'); if(o) o.hidden=true; tl.run++; vStop(); }
function toolDraw(){
  const T=tl.n, body=$('#toolPop .tlbody'), N=T==null?0:T; tl.on={};
  const rows=[]; for(let a=0;a<=N-a;a++) rows.push(a);
  body.innerHTML=`<h2 class="tlh outline">Make</h2><svg class="tlarr" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 3v34M7 26l13 15 13-15"/></svg><div class="tltgt">${[5,6,7,8,9,10].map(k=>`<button class="tlt${k===T?' on':''}" data-n="${k}" style="--c:${TCOL[k]}"><b>${k}</b></button>`).join('')}</div>
    <div class="tlrow" style="--n:${T==null?6:T+1}">${T==null?'':Array.from({length:T+1},(_,i)=>`<button class="tld" data-i="${i}" style="--c:${TCOL[i]}"><b>${i}</b></button>`).join('')}</div>
    <svg class="tlarcs" viewBox="0 0 ${(N+1)*100} 300" preserveAspectRatio="none" aria-hidden="true"></svg>
    <div class="tllist">${rows.map(a=>`<button class="tls" data-a="${a}"><b style="color:${TCOL[a]}">${a}</b> <i>and</i> <b style="color:${TCOL[T-a]}">${T-a}</b> <i>make</i> <b class="m">${T}</b></button>`).join('')}</div>`;
  if(T!=null){ const sv=$('.tlarcs',body); for(let a=0;a<=T-a;a++) arcAdd(sv,a,T-a,T,'ghost'); }
  $$('.tlt',body).forEach(b=>b.addEventListener('click',()=>{ tl.n=+b.dataset.n; vStop(); tl.run++; toolDraw(); if(anim) G.from($('.tlrow',body),{opacity:0,y:-10,duration:.25,clearProps:'all'}); }));
  $$('.tld',body).forEach(b=>b.addEventListener('click',()=>toolPick(+b.dataset.i)));
  $$('.tls',body).forEach(b=>b.addEventListener('click',()=>toolPick(+b.dataset.a)));
}
async function toolPick(a){
  const T=tl.n, b=T-a, lo=Math.min(a,b), body=$('#toolPop .tlbody'), svg=$('.tlarcs',body); vStop(); const run=++tl.run;
  $$('.tld',body).forEach(d=>d.classList.toggle('now',+d.dataset.i===a||+d.dataset.i===b));
  $$('.tlarc.on',svg).forEach(q=>q.remove()); $$('.tls',body).forEach(r=>r.classList.remove('on','pop'));
  arcAdd(svg,a,b,T,'on'+(anim?' draw':''));
  const row=$(`.tls[data-a="${lo}"]`,body); row.classList.add('on'); void row.offsetWidth; row.classList.add('pop');
  try{ await playFile(tlSound(a,b)); }catch(e){}
}
;
