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
