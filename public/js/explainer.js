/* EXPLAINER — ONE template for animated explanations (motion + voice) inside the app. Not a video: the app draws and moves
   everything itself, so the same template shows any lesson from DATA only. How to add a lesson: docs/explain-lessons.md.
   In the app: lesson.json "layout":"explain", "pages" = number of steps, "explain": {nums, steps}. Each step = one page (the app's dots/swipe),
   it plays by itself then goes on; rail = Read/Stop + Restart; the car moves with every line; star when every page was played.
   Data: nums {n: audio}  steps [{name, beats:[{say, audio, hl?, gap?, do:[actions]}]}]   a beat = one line + its motion; ends when both end.
   Actions:
     {scene:"pic", img, w, h}                        the book picture (in its white frame); points below are picture pixels
     {scene:"tree"|"pond", actors:{id:{kind:"bird"|"fish",color,x,y,face}}}   drawn scene with own actors
     {enter:ids,from,gap} {leave:ids,to}             actors fly / swim in or away
     {count:ids|pts:[[x,y]..], start, color}         bounce + number badge + number said (waits for the line)
     {ring:ids|pts, r, color, id} {unring:id|"all"}  hand-drawn ring round a group
     {hold:n, on:ringId, color}                      the number of a group 'in your head' (one badge, said); then {count:ids, start:n+1, keep:true} counts on
     {scene:'pic', frame:false}                      a picture made of framed parts: no big white frame behind it
     {scene:'free', items:[{id,img,x,y,w,h}], ih, top}  separate pictures that move: {move:[{id,x,y}],ms} slides them together, {guide:{x0,y0,x1,y1,color}} draws a dotted line (Math 5-1)
     {link:[[[x,y],[x,y]]..], color, r, id}         "What is the difference?": pairs joined by lines one by one; the ones left over are the difference
     {cross:true, pts, r, color}                     things that go away (subtraction) are crossed out one by one
     {eq:["2","+","3","=","5"]} {eqState:"show"|"dim"} {lit:i,color,value} {pulse:i}   the number sentence on top
     {fly:"2", from:ringId, to:i, color}             a group's number flies into the sentence
     {add:"text", color, card} {line:"break"|"clear"} the story is WRITTEN as normal text (colour = underline of the group; card:true = one card, e.g. the answer "8 cats")
     {order:{chunks, colors, audios}}                Try: the child taps or drags the pieces in order; they are written as text
     {ask:{options, answer, to, color}} {cheer:true} {wait:ms}
     {write:{text:"2 + 3 = 5", keys}}              Try: the child WRITES the sentence with the app keypad (dash under each place)
     {pick:{boxes:[[x0,y0,x1,y1]..], answer}}       the child taps the right part of the picture (e.g. picture A, B or C)
   read:true on a beat = it re-reads the last written sentence; hl = [[start,end] s per word] -> the word lights up while the line re-reads the story (made by tools/lessons/explain_voice.py). */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const W=1000,H=640;
const COL={orange:'#FF8A1F',blue:'#2E8FEA',green:'#3A9A2C',red:'#E8443A',black:'#3B3F4A',pink:'#E8457A'};
const col=c=>COL[c]||c||'#2A7FD8';
const shade=(hex,k)=>{ const n=parseInt(hex.slice(1),16); const f=v=>Math.max(0,Math.min(255,Math.round(v*k)));
  return '#'+[f(n>>16),f(n>>8&255),f(n&255)].map(v=>v.toString(16).padStart(2,'0')).join(''); };
const ease={out:p=>1-Math.pow(1-p,3), inout:p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2, back:p=>{ const c=1.7; return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2); }};
const mk=(tag,attrs,html)=>{ const e=document.createElementNS(NS,tag); for(const k in attrs||{}) e.setAttribute(k,attrs[k]); if(html!=null) e.innerHTML=html; return e; };
const hel=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
// a word the child picks = THE choice button (quiz.js qChBtn, look only in css/qlayout.css; Marwa 2026-11-06)
const xChip=(t,more)=>{ const b=qChBtn(String(t),true); b.classList.add('alopt','alchip','xpick'); if(more) b.classList.add(more); return b; };
const STOP={stop:1};

/* ---------- drawings (our own vector art; colours from data) ---------- */
const ART={
  bird(c){ const d=shade(c,.78), l=shade(c,1.35);
    return `<g class="xb-body"><path d="M-28 6 L-54 -8 L-50 18 Z" fill="${d}" stroke="#6B2E0C" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-6 26 v12 M10 26 v12" stroke="#9A5A12" stroke-width="4" stroke-linecap="round"/>
      <ellipse rx="36" ry="30" fill="${c}" stroke="#6B2E0C" stroke-width="3.5"/>
      <ellipse cx="8" cy="10" rx="20" ry="15" fill="${l}" opacity=".85"/>
      <g class="xb-wing"><path d="M-20 -2 q16 -30 36 -4 q-16 14 -36 4z" fill="${d}" stroke="#6B2E0C" stroke-width="3" stroke-linejoin="round"/></g>
      <circle cx="16" cy="-10" r="8" fill="#fff" stroke="#6B2E0C" stroke-width="2.5"/><circle cx="19" cy="-10" r="4" fill="#222"/>
      <path d="M32 -6 L50 1 L32 9 Z" fill="#FFC928" stroke="#6B2E0C" stroke-width="2.5" stroke-linejoin="round"/></g>`; },
  fish(c){ const d=shade(c,.75), l=shade(c,1.45);
    return `<g class="xb-body"><g class="xb-tail"><path d="M-30 0 L-56 -20 Q-48 0 -56 20 Z" fill="${d}" stroke="#2B1A10" stroke-width="3" stroke-linejoin="round"/></g>
      <ellipse rx="38" ry="22" fill="${c}" stroke="#2B1A10" stroke-width="3.5"/>
      <path d="M-4 -20 q10 -16 22 -2" fill="${d}" stroke="#2B1A10" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-10 6 q10 10 22 2" fill="none" stroke="${l}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="20" cy="-5" r="7" fill="#fff" stroke="#2B1A10" stroke-width="2.5"/><circle cx="22" cy="-5" r="3.5" fill="#111"/></g>`; }
};
const SCENES={
  tree:`<defs><linearGradient id="xsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FE1FF"/><stop offset="1" stop-color="#E6F8FF"/></linearGradient></defs>
    <rect x="-800" y="-600" width="2600" height="1500" fill="#C9EEFF"/><rect x="-800" width="2600" height="${H}" fill="url(#xsky)"/>
    <circle cx="905" cy="215" r="44" fill="#FFE45C" stroke="#FFC928" stroke-width="8"/>
    <g fill="#fff" opacity=".9"><ellipse cx="120" cy="215" rx="58" ry="20"/><ellipse cx="160" cy="200" rx="38" ry="22"/><ellipse cx="760" cy="250" rx="50" ry="16"/></g>
    <path d="M-800 490 Q-300 460 0 500 Q250 455 500 495 T1000 480 Q1400 470 1800 490 V1100 H-800Z" fill="#8BD650"/><path d="M-800 545 Q-300 520 0 548 Q300 515 620 548 T1000 535 Q1400 525 1800 545 V1100 H-800Z" fill="#5DBB3A"/>
    <path d="M118 600 Q132 470 128 330 L172 330 Q168 470 186 600Z" fill="#9A5A2A" stroke="#6B2E0C" stroke-width="4"/>
    <path d="M160 392 Q500 372 880 388" fill="none" stroke="#6B2E0C" stroke-width="22" stroke-linecap="round"/>
    <path d="M160 392 Q500 372 880 388" fill="none" stroke="#A9662F" stroke-width="15" stroke-linecap="round"/>
    <g fill="#4FB23A" stroke="#2F7D24" stroke-width="4"><circle cx="100" cy="290" r="62"/><circle cx="185" cy="258" r="72"/><circle cx="150" cy="330" r="52"/><circle cx="235" cy="320" r="44"/></g>
    <g fill="#6CCB45"><ellipse cx="880" cy="384" rx="30" ry="15"/><ellipse cx="520" cy="372" rx="22" ry="11"/></g>`,
  pond:`<defs><linearGradient id="xsky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FE1FF"/><stop offset="1" stop-color="#E6F8FF"/></linearGradient>
    <radialGradient id="xwater" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#7FD4FF"/><stop offset="1" stop-color="#2E9BE0"/></radialGradient></defs>
    <rect x="-800" y="-600" width="2600" height="1500" fill="#C9EEFF"/><rect x="-800" width="2600" height="${H}" fill="url(#xsky2)"/>
    <path d="M-800 245 Q-300 225 0 250 Q250 215 500 245 T1000 235 Q1400 225 1800 245 V1100 H-800Z" fill="#7FD04A"/>
    <ellipse cx="500" cy="440" rx="390" ry="170" fill="#9A9AA8" stroke="#6E6E7C" stroke-width="5"/>
    <ellipse cx="500" cy="440" rx="370" ry="152" fill="url(#xwater)"/>
    <g fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"><path d="M250 400 q15 -8 30 0 q15 8 30 0"/><path d="M680 500 q15 -8 30 0 q15 8 30 0"/><path d="M470 560 q15 -8 30 0"/></g>
    <g fill="#E8457A"><circle cx="130" cy="290" r="10"/><circle cx="160" cy="300" r="10"/><circle cx="860" cy="292" r="10"/></g>`
};

/* ---------- player ---------- */
function mount(root, data, opt){
  opt=opt||{}; const base=opt.base||'';
  root.classList.add('xpl'); root.classList.toggle('xwide',!!data.wide); root.innerHTML='';
  const svg=mk('svg',{viewBox:`0 0 ${W} ${H}`,preserveAspectRatio:'xMidYMid meet',class:'xpl-svg','aria-hidden':'true'});
  const Lbg=mk('g'), Lring=mk('g'), Lact=mk('g'), Lbadge=mk('g'), Leq=mk('g'), Lfx=mk('g');
  svg.append(Lbg,Lring,Lact,Lbadge,Leq,Lfx);
  const stageEl=hel('div','xpl-stage'); stageEl.append(svg);
  const cap=hel('div','xpl-cap'), capT=hel('p','xpl-capt'); capT.dir=data.lang==='ar'?'rtl':'ltr'; cap.append(capT);
  const askRow=hel('div','xpl-ask'), line=hel('div','xpl-line'); if(data.lang==='ar') line.dir='rtl'; cap.append(line,askRow);   // Arabic: the sentence builds from the right
  root.append(stageEl,cap);

  /* clock: everything waits on a virtual time; leaving the page (the element is gone) stops everything */
  const X={vt:0,last:null,jobs:[],gen:0,fast:false,step:0,playing:false};
  const loop=t=>{ if(!root.isConnected){ X.gen++; X.jobs=[]; X.playing=false; return; }   // the page changed: the app already stopped the sound
  if(X.last==null) X.last=t; const dt=Math.min(100,t-X.last); X.last=t; X.vt+=dt;
    const now=X.vt, keep=[], fire=[]; X.jobs.forEach(j=>{ if(now>=j.at) fire.push(j); else { keep.push(j); if(j.tick) j.tick(now); } });
    X.jobs=keep; fire.forEach(j=>j.fn()); X.raf=requestAnimationFrame(loop); };
  X.raf=requestAnimationFrame(loop);
  const live=g=>{ if(g!==X.gen) throw STOP; };
  const wait=ms=>{ const g=X.gen; if(X.fast||ms<=0) return Promise.resolve(); return new Promise(r=>X.jobs.push({at:X.vt+ms,fn:r})).then(()=>live(g)); };
  const tween=(ms,fn,e)=>{ const g=X.gen; e=e||ease.inout; if(X.fast||ms<=0){ fn(1); return Promise.resolve(); }
    const t0=X.vt; return new Promise(r=>{ const j={at:t0+ms,fn:()=>{ fn(1); r(); },tick:vt=>{ if(vt<t0+ms) fn(e(Math.max(0,(vt-t0)/ms))); }}; X.jobs.push(j); }).then(()=>live(g)); };

  /* sounds go through the app's own player (opt.play = playFile: the audio library first, then the file in the app).
     A sound that is not there yet: the line just takes the time it needs. */
  const sayMs=t=>Math.max(1400,(t||'').split(/\s+/).filter(Boolean).length*420+500);
  function play(path,fallbackMs){
    const g=X.gen; if(X.fast) return Promise.resolve();
    if(!path||!opt.play) return wait(fallbackMs||0);
    const t0=X.vt; return Promise.resolve(opt.play(base+path)).then(()=>live(g),()=>{ live(g); return wait((fallbackMs||0)-(X.vt-t0)); });
  }

  /* ---------- the drawing state ---------- */
  let A={}, rings={}, eqT=[], badges=[], VH=H, PIC=null;
  let TOP=170;   // a book picture sits under a band of sky that holds the number sentence
  const P=(x,y)=>PIC?[x*PIC.k,TOP+y*PIC.k]:[x,y];
  const setT=a=>a.g.setAttribute('transform',`translate(${a.x} ${a.y}) scale(${a.s*a.face} ${a.s})`);
  /* a LINE of things (people, rabbits, cars…): n things side by side, "Front" at the left end, "Back" at the right end (as in the book).
     d.unit = one picture repeated n times, or d.img = one strip picture with n equal slots (d.w,d.h = its pixels). Coordinates under it are picture px
     (x 0..1000, y below the number band). A line: slots x 120..880. The helper of the data builder (tools/lessons/math-gen/position_u2l1.py) computes them. */
  let LAB={}, IT={};
  /* FREE scene (Math 5-1 lengths): separate see-through pictures (pencils, strings…) that can MOVE. d.items=[{id,img,x,y,w,h}] (picture px, top-left + drawn size),
     d.ih = height of the white panel, d.top = gap above it (default 30). Actions {move:[{id,x,y}],ms} slide things together; {guide:{x0,y0,x1,y1,color,id}} draws a dotted line. */
  function freeScene(d){ PIC={k:1}; const ih=d.ih||420; VH=TOP+ih; const tag=[];
    if(d.frame!==false) tag.push(`<rect x="-9" y="${TOP-9}" width="1018" height="${ih+18}" rx="30" fill="#fff" style="filter:drop-shadow(0 6px 8px rgba(90,52,24,.3))"/>`);
    (d.items||[]).forEach((o,i)=>tag.push(`<image data-i="${i}" href="${base+o.img}" x="${o.x}" y="${TOP+o.y}" width="${o.w}" height="${o.h}" preserveAspectRatio="none"/>`));
    Lbg.innerHTML=tag.join(''); IT={};   // (scene() empties the actors layer afterwards, so the things live in the background layer)
    (d.items||[]).forEach((o,i)=>{ IT[o.id]={e:Lbg.querySelector(`image[data-i="${i}"]`),x:o.x,y:o.y}; }); }
  async function move(list,ms){ const L=[].concat(list).map(m=>({...m,it:IT[m.id]})).filter(m=>m.it); const f=L.map(m=>({m,x0:m.it.x,y0:m.it.y}));
    await tween(X.fast?1:(ms||1500),v=>f.forEach(o=>{ const x=o.x0+(o.m.x-o.x0)*v, y=o.y0+(o.m.y-o.y0)*v; o.m.it.e.setAttribute('x',x); o.m.it.e.setAttribute('y',TOP+y); if(v>=1){ o.m.it.x=o.m.x; o.m.it.y=o.m.y; } })); }
  // a dotted line (the book's alignment line) drawn from its start to its end, over the pictures
  async function guide(o){ const [x0,y0]=P(o.x0,o.y0), [x1,y1]=P(o.x1,o.y1); const l=mk('line',{x1:x0,y1:y0,x2:x0,y2:y0,stroke:col(o.color||'black'),'stroke-width':o.w||6,'stroke-dasharray':'3 13','stroke-linecap':'round'}); Lbadge.append(l);
    await tween(X.fast?1:(o.ms||900),v=>{ l.setAttribute('x2',x0+(x1-x0)*v); l.setAttribute('y2',y0+(y1-y0)*v); }); }
  let SC={}, PICD=null;
  function lineScene(d){
    const ends=d.ends||['Front','Back'], tag=[], items=d.items; const card=ih=>`<rect x="-9" y="${TOP-9}" width="1018" height="${ih+18}" rx="30" fill="#fff" style="filter:drop-shadow(0 6px 8px rgba(90,52,24,.3))"/>`;
    if(items&&d.vert){   // a column (first end above, second below): cells 110 high in the middle, the arrow at its right
      const n=items.length, ih=60+110*n+70; TOP=20; PIC={k:1}; VH=TOP+ih; SC={vert:true,n,y0:60,ch:110,ax:790};
      tag.push(card(ih)); tag.push(`<rect x="400" y="${TOP+60}" width="200" height="${110*n}" fill="none" stroke="#c9b9a8" stroke-width="4"/>`);
      items.forEach((it,i)=>{ if(i) tag.push(`<path d="M400 ${TOP+60+110*i} H600" stroke="#c9b9a8" stroke-width="3"/>`); tag.push(`<image href="${base+it}" x="420" y="${TOP+60+110*i+8}" width="160" height="94" preserveAspectRatio="xMidYMid meet"/>`); });
      tag.push(`<text class="xl-end" id="xlf" x="500" y="${TOP+46}" text-anchor="middle">${ends[0]}</text><text class="xl-end" id="xlb" x="500" y="${TOP+60+110*n+52}" text-anchor="middle">${ends[1]}</text>`);
    } else {
      const ih=d.ih||230; PIC={k:1}; VH=TOP+ih; const n=items?items.length:d.n, x0=120, x1=880, sw=(x1-x0)/n, base0=TOP+(d.floor||200); SC={vert:false,n};
      tag.push(card(ih));
      const MI=!!d.mirror, flip=cx=>MI?` transform="translate(${2*cx} 0) scale(-1 1)"`:''; SC.mir=MI;   // Arabic: Front at the right, the pictures face the other way
      if(d.img){ const w=x1-x0, h=Math.round(w*d.h/d.w); tag.push(`<image href="${base+d.img}" x="${x0}" y="${base0-h}" width="${w}" height="${h}" preserveAspectRatio="none"${flip(500)}/>`); }
      else { const mw=Math.min(sw*.82,d.maxw||150), mh=d.maxh||150; for(let i=0;i<n;i++){ tag.push(`<image href="${base+(items?items[i]:d.unit)}" x="${x0+sw*(i+.5)-mw/2}" y="${base0-mh}" width="${mw}" height="${mh}" preserveAspectRatio="xMidYMax meet"${flip(x0+sw*(i+.5))}/>`); } }
      tag.push(`<text class="xl-end" id="xlf" x="${MI?940:60}" y="${base0-30}" text-anchor="middle">${ends[0]}</text><text class="xl-end" id="xlb" x="${MI?60:940}" y="${base0-30}" text-anchor="middle">${ends[1]}</text>`);
    }
    Leq.innerHTML=''; eqT=[];
    Lbg.innerHTML=tag.join(''); LAB={f:Lbg.querySelector('#xlf'),b:Lbg.querySelector('#xlb')}; }
  /* "Numbers up to 20" (book 7-1): n cubes = a ROW OF TEN (blue) and the ones under it (orange). Picture px: row 1 y=50, row 2 y=170, cube 66 wide, step 80, first x=100. */
  function tensScene(d){ const n=d.n, ih=d.ih||300; PIC={k:1}; TOP=170; VH=TOP+ih; const tag=[`<rect x="-9" y="${TOP-9}" width="1018" height="${ih+18}" rx="30" fill="#fff" style="filter:drop-shadow(0 6px 8px rgba(90,52,24,.3))"/>`];
    const cube=(x,y,c)=>`<rect x="${x}" y="${y}" width="66" height="66" rx="12" fill="${c}" stroke="#1f5f96" stroke-width="4"/><path d="M${x+10} ${y+16} h46" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>`;
    for(let i=0;i<Math.min(10,n);i++) tag.push(cube(100+i*80,TOP+50,'#46A8E8')); for(let i=0;i<n-10;i++) tag.push(cube(100+i*80,TOP+170,'#FF9A3C'));
    Leq.innerHTML=''; eqT=[]; Lbg.innerHTML=tag.join(''); LAB={}; SC={}; }
  /* NUMBER LINE (Math 7-3): ticks 0..max with the numbers under them; d.pet = a picture standing on tick d.at; d.arrow='right' draws "Greater" arrow. Picture px: line y=130, tick i at x=50+45*i, label y=190; count pts at y=100. */
  function nlineScene(d){ const mx=d.max||20, ih=d.ih||225, X0=50, ST=900/mx; PIC={k:1}; VH=TOP+ih; SC={};
    const tag=[`<rect x="-9" y="${TOP-9}" width="1018" height="${ih+18}" rx="30" fill="#fff" style="filter:drop-shadow(0 6px 8px rgba(90,52,24,.3))"/>`, `<path d="M${X0-20} ${TOP+130} H${X0+900+20}" stroke="#444" stroke-width="5" stroke-linecap="round"/>`];
    for(let i=0;i<=mx;i++){ const x=X0+ST*i; tag.push(`<path d="M${x} ${TOP+118} v24" stroke="#444" stroke-width="4"/><text x="${x}" y="${TOP+185}" text-anchor="middle" font-size="27" font-weight="700" fill="#333">${i}</text>`); }
    if(d.arrow){ const r=d.arrow==='right'; tag.push(`<path d="M${r?200:800} ${TOP+50} H${r?800:200}" stroke="#E5352B" stroke-width="7" stroke-linecap="round"/><path d="${r?'M780 '+(TOP+34)+' L808 '+(TOP+50)+' L780 '+(TOP+66):'M220 '+(TOP+34)+' L192 '+(TOP+50)+' L220 '+(TOP+66)}" fill="none" stroke="#E5352B" stroke-width="7" stroke-linecap="round"/>`); }
    if(d.pet!=null&&d.img){ const x=X0+ST*d.pet; tag.push(`<image href="${base+d.img}" x="${x-35}" y="${TOP+15}" width="70" height="72" preserveAspectRatio="xMidYMax meet"/>`); }
    Leq.innerHTML=''; eqT=[]; Lbg.innerHTML=tag.join(''); LAB={}; }
  /* GROUPS scene (Math 7-6, numbers over 20): d.t rows of ten blue cubes on the left, d.o orange ones on the right (picture px: row r y=20+62r, cube 42, step 50, x0=40; ones x=640+58(i%5), y=20+62(i/5), size 46). */
  function groupsScene(d){ const t=d.t, o=d.o||0, ih=Math.max(t,2)*62+40; PIC={k:1}; TOP=170; VH=TOP+ih; SC={};
    const cube=(x,y,z,c)=>`<rect x="${x}" y="${TOP+y}" width="${z}" height="${z}" rx="9" fill="${c}" stroke="#1f5f96" stroke-width="3"/>`;
    const tag=[`<rect x="-9" y="${TOP-9}" width="1018" height="${ih+18}" rx="30" fill="#fff" style="filter:drop-shadow(0 6px 8px rgba(90,52,24,.3))"/>`];
    for(let r=0;r<t;r++) for(let j=0;j<10;j++) tag.push(cube(40+j*50,20+r*62,42,'#46A8E8'));
    for(let i=0;i<o;i++) tag.push(cube(640+58*(i%5),20+62*Math.floor(i/5),46,'#FF9A3C'));
    Leq.innerHTML=''; eqT=[]; Lbg.innerHTML=tag.join(''); LAB={}; }
  /* CLOCK scene (Math 8-1): face with numbers; d.h = hour, d.half = 1 for half past (long hand on 6). Picture px: centre (500,215), face r 190, short hand 105 (red), long hand 150 (blue). */
  function clockScene(d){ const ih=430, cx=500, cy=215; PIC={k:1}; TOP=170; VH=TOP+ih; SC={};
    const tag=[`<rect x="-9" y="${TOP-9}" width="1018" height="${ih+18}" rx="30" fill="#fff" style="filter:drop-shadow(0 6px 8px rgba(90,52,24,.3))"/>`, `<circle cx="${cx}" cy="${TOP+cy}" r="190" fill="#fffdf5" stroke="#444" stroke-width="8"/>`];
    for(let i=0;i<60;i++){ const a=i*Math.PI/30, r1=i%5?176:164; tag.push(`<path d="M${cx+Math.sin(a)*r1} ${TOP+cy-Math.cos(a)*r1} L${cx+Math.sin(a)*184} ${TOP+cy-Math.cos(a)*184}" stroke="#444" stroke-width="${i%5?2:4}"/>`); }
    for(let i=1;i<=12;i++){ const a=i*Math.PI/6; tag.push(`<text x="${cx+Math.sin(a)*135}" y="${TOP+cy-Math.cos(a)*135+13}" text-anchor="middle" font-size="38" font-weight="700" fill="#333">${i}</text>`); }
    const ha=((d.h%12)+(d.half?.5:0))*Math.PI/6, ma=d.half?Math.PI:0;
    tag.push(`<path d="M${cx} ${TOP+cy} L${cx+Math.sin(ma)*150} ${TOP+cy-Math.cos(ma)*150}" stroke="#1E6FD0" stroke-width="10" stroke-linecap="round"/>`);
    tag.push(`<path d="M${cx} ${TOP+cy} L${cx+Math.sin(ha)*105} ${TOP+cy-Math.cos(ha)*105}" stroke="#E5352B" stroke-width="15" stroke-linecap="round"/><circle cx="${cx}" cy="${TOP+cy}" r="12" fill="#333"/>`);
    Leq.innerHTML=''; eqT=[]; Lbg.innerHTML=tag.join(''); LAB={}; }
  function scene(name,actors,d){
    TOP=(name==='free'&&d&&d.top!=null)?d.top:170; IT={}; if(d&&d.wide!==undefined) root.classList.toggle('xwide',!!d.wide);
    if(name==='pic'&&d&&d.img){ const k=1000/d.w, ih=Math.round(d.h*k); PIC={k}; VH=TOP+ih; PICD={href:base+d.img,ih};
      Lbg.innerHTML=`<defs><clipPath id="xpc"><rect x="0" y="${TOP}" width="1000" height="${ih}" rx="22"/></clipPath></defs>
        ${d.frame===false?'':`<rect x="-9" y="${TOP-9}" width="1018" height="${ih+18}" rx="30" fill="#fff" style="filter:drop-shadow(0 6px 8px rgba(90,52,24,.3))"/>`}
        <image href="${base+d.img}" x="0" y="${TOP}" width="1000" height="${ih}" preserveAspectRatio="none" ${d.frame===false?'':'clip-path="url(#xpc)"'}/>`; }
    else if(name==='line'&&d){ lineScene(d); }
    else if(name==='tens'&&d){ tensScene(d); }
    else if(name==='nline'&&d){ nlineScene(d); }
    else if(name==='groups'&&d){ groupsScene(d); }
    else if(name==='clock'&&d){ clockScene(d); }
    else if(name==='free'&&d){ freeScene(d); }
    else { PIC=null; VH=H; Lbg.innerHTML=SCENES[name]||''; }
    line.innerHTML=''; cap.classList.remove('built'); fit();
    Lact.innerHTML=''; Lfx.innerHTML=''; Lring.innerHTML=''; Lbadge.innerHTML=''; A={}; rings={}; badges=[];
    for(const id in actors||{}){ const d=actors[id]; const g=mk('g',{class:'xa xa-'+d.kind}); g.innerHTML=(ART[d.kind]||ART.bird)(col(d.color));
      const a={id,g,kind:d.kind,hx:d.x,hy:d.y,x:d.x,y:d.y,s:1,face:d.face||1}; g.style.opacity=0; A[id]=a; setT(a); Lact.append(g); }
  }
  const ids=v=>[].concat(v||[]).filter(i=>A[i]);
  async function enter(list,from,gap){
    await Promise.all(ids(list).map(async(id,k)=>{ const a=A[id]; await wait((gap==null?260:gap)*k);
      const fx=from?from[0]:(a.hx<W/2?-120:W+120), fy=from?from[1]:a.hy-(a.kind==='fish'?0:140); a.x=fx; a.y=fy; a.g.style.opacity=1; setT(a);
      a.g.classList.add('moving'); const swim=a.kind==='fish';
      await tween(1500,p=>{ a.x=fx+(a.hx-fx)*p; a.y=fy+(a.hy-fy)*p-(swim?Math.sin(p*Math.PI*3)*10:Math.sin(p*Math.PI)*70); setT(a); },ease.out);
      a.g.classList.remove('moving'); a.x=a.hx; a.y=a.hy;
      await tween(240,p=>{ a.s=1+.12*Math.sin(p*Math.PI); setT(a); }); }));
  }
  async function leave(list,to,gap){
    await Promise.all(ids(list).map(async(id,k)=>{ const a=A[id]; await wait((gap==null?200:gap)*k); const fx=a.x,fy=a.y,tx=to?to[0]:W+140,ty=to?to[1]:fy-260;
      a.g.classList.add('moving'); await tween(1300,p=>{ a.x=fx+(tx-fx)*p; a.y=fy+(ty-fy)*p; a.g.style.opacity=1-Math.max(0,p-.6)/.4; setT(a); },ease.inout); a.g.classList.remove('moving'); }));
  }
  function clearBadges(){ badges.forEach(b=>b.remove()); badges=[]; }
  async function count(list,start,color,pts,keep,rr){
    if(!keep) clearBadges(); let n=(start||1)-1;
    if(pts){ for(const pt of pts){ n++; const [x,y]=P(pt[0],pt[1]);   // things drawn in a book picture: the number appears on each one
      const b=mk('g',{class:'xbadge'}); const R=rr||26; b.innerHTML=`<circle r="${R}" fill="${col(color||'#2A7FD8')}" stroke="#fff" stroke-width="${R>20?5:3}"/><text y="${Math.round(R*.42)}" text-anchor="middle" ${R<26?`style="font-size:${Math.round(R*1.3)}px"`:''}>${n}</text>`;
      b.style.opacity=0; Lbadge.append(b); badges.push(b);
      const snd=play((data.nums||{})[n]||null,0); snd.catch(()=>{});
      await tween(320,p=>{ b.style.opacity=Math.min(1,p*2); b.setAttribute('transform',`translate(${x} ${y}) scale(${.4+.6*ease.back(p)})`); },x=>x);
      await Promise.all([snd,wait(450)]); } return; }
    for(const id of ids(list)){ n++; const a=A[id];
      const b=mk('g',{class:'xbadge',transform:`translate(${a.hx} ${a.hy-(a.kind==='fish'?52:62)})`}); b.innerHTML=`<circle r="26" fill="${col(color||'#2A7FD8')}" stroke="#fff" stroke-width="5"/><text y="11" text-anchor="middle">${n}</text>`;
      b.style.opacity=0; Lbadge.append(b); badges.push(b);
      const snd=play((data.nums||{})[n]?((data.nums||{})[n]):null,0); snd.catch(()=>{});
      await tween(320,p=>{ b.style.opacity=Math.min(1,p*2); b.setAttribute('transform',`translate(${a.hx} ${a.hy-(a.kind==='fish'?52:62)}) scale(${.4+.6*ease.back(p)})`); a.s=1+.22*Math.sin(p*Math.PI); setT(a); },x=>x);
      await Promise.all([snd,wait(380)]); }
  }
  function bbox(list){ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; ids(list).forEach(id=>{ const a=A[id]; x0=Math.min(x0,a.hx-52); x1=Math.max(x1,a.hx+52); y0=Math.min(y0,a.hy-44); y1=Math.max(y1,a.hy+44); }); return {x0,y0,x1,y1,cx:(x0+x1)/2,cy:(y0+y1)/2}; }
  async function ring(list,color,id,box,pts,r){
    if(pts){ r=r||40; const q=pts.map(t=>P(t[0],t[1])), rr=(PIC?PIC.k:1)*r, g=mk('g'); Lring.append(g);   // one ring round EACH thing (things of two groups mix in a picture)
      const ps=q.map(([x,y])=>{ const e=mk('path',{d:`M${x-rr} ${y} a${rr} ${rr} 0 1 1 ${2*rr} 3 a${rr} ${rr} 0 1 1 ${-2*rr} -3`,class:'xring',stroke:col(color),pathLength:'1'}); g.append(e); return e; });
      const xs=q.map(t=>t[0]), ys=q.map(t=>t[1]), b={x0:Math.min(...xs)-rr,x1:Math.max(...xs)+rr,y0:Math.min(...ys)-rr,y1:Math.max(...ys)+rr}; b.cx=(b.x0+b.x1)/2; b.cy=(b.y0+b.y1)/2;
      rings[id||('r'+Object.keys(rings).length)]={el:g,b}; await tween(700,v=>ps.forEach(e=>e.style.strokeDashoffset=1-v)); return; }
    let b; if(box){ const [x0,y0]=P(box[0],box[1]), [x1,y1]=P(box[2],box[3]); b={x0,y0,x1,y1,cx:(x0+x1)/2,cy:(y0+y1)/2}; } else b=bbox(list);
    const rx=(b.x1-b.x0)/2+16, ry=(b.y1-b.y0)/2+20;
    const p=mk('path',{d:`M${b.cx-rx} ${b.cy} a${rx} ${ry} 0 1 1 ${2*rx} 4 a${rx} ${ry} 0 1 1 ${-2*rx} -4`,class:'xring',stroke:col(color),pathLength:'1'});
    Lring.append(p); rings[id||('r'+Object.keys(rings).length)]={el:p,b}; await tween(700,q=>{ p.style.strokeDashoffset=1-q; });
  }
  // the child taps the right part of a book picture (e.g. "Which picture shows 5 + 3?"): wrong = red frame flashes, right = green frame
  function pick(o){
    const g=X.gen, bx=o.boxes.map(b=>{ const [x0,y0]=P(b[0],b[1]), [x1,y1]=P(b[2],b[3]); return {x0,y0,x1,y1}; });
    const frame=(b,c)=>{ const r=mk('rect',{x:b.x0-8,y:b.y0-8,width:b.x1-b.x0+16,height:b.y1-b.y0+16,rx:18,fill:'none',stroke:col(c),'stroke-width':10}); Lring.append(r); return r; };
    if(X.fast){ frame(bx[o.answer],'green'); return Promise.resolve(); }
    return new Promise((res,rej)=>{ X.rejAsk=rej;
      bx.forEach((b,i)=>{ const h=mk('rect',{x:b.x0,y:b.y0,width:b.x1-b.x0,height:b.y1-b.y0,fill:'#fff','fill-opacity':'0.01',class:'xhit'}); Lfx.append(h);
        h.addEventListener('click',()=>{ if(g!==X.gen) return;
          if(i!==o.answer){ if(opt.wrong) opt.wrong(); const r=frame(b,'red'); setTimeout(()=>r.remove(),800); return; }
          X.rejAsk=null; Lfx.innerHTML=''; frame(b,'green'); setTimeout(()=>{ if(g===X.gen) res(); },700); }); }); }).then(()=>live(g));
  }
  // things that GO AWAY in a book picture (subtraction): each one is crossed out, one after another
  async function cross(pts,r,color){ r=r||40; const g=mk('g'); Lring.append(g); const rr=(PIC?PIC.k:1)*r;
    for(const t of pts||[]){ const [x,y]=P(t[0],t[1]); const c=mk('circle',{cx:x,cy:y,r:rr,fill:'rgba(255,255,255,.5)'}); c.style.opacity=0;
      const e=mk('path',{d:`M${x-rr*.75} ${y-rr*.75} L${x+rr*.75} ${y+rr*.75}`,class:'xring xcross',stroke:col(color||'red'),pathLength:'1'}); g.append(c,e);
      await tween(420,v=>{ c.style.opacity=v; e.style.strokeDashoffset=1-v; }); } }
  // "What is the difference?": each thing of one group is joined by a line to one thing of the other group, one pair after another;
  // the ones with no partner are the difference. pairs = [[[x,y],[x,y]],..] picture px; r = the line stops this far from each centre
  async function link(pairs,color,r,id){ const g=mk('g'); Lring.append(g); const rr=(PIC?PIC.k:1)*(r||0); const xs=[], ys=[];
    for(const [a,b] of pairs||[]){ let [x0,y0]=P(a[0],a[1]), [x1,y1]=P(b[0],b[1]); const L=Math.hypot(x1-x0,y1-y0)||1, ux=(x1-x0)/L, uy=(y1-y0)/L;
      x0+=ux*rr; y0+=uy*rr; x1-=ux*rr; y1-=uy*rr; xs.push(x0,x1); ys.push(y0,y1);
      const e=mk('path',{d:`M${x0} ${y0} L${x1} ${y1}`,class:'xring xlink',stroke:col(color||'blue'),pathLength:'1'}); g.append(e);
      if(typeof blip==='function'&&!X.fast) blip(520+xs.length*20,.04); await tween(X.fast?1:380,v=>{ e.style.strokeDashoffset=1-v; }); }
    const b={x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)}; b.cx=(b.x0+b.x1)/2; b.cy=(b.y0+b.y1)/2; rings[id||'link']={el:g,b}; }
  async function hold(n,on,color){ if(X.fast) return; clearBadges(); const r=rings[on]; const x=r?r.b.cx:W/2, y=r?r.b.y0-34:H/2;
    const b=mk('g',{class:'xbadge xhold'}); b.innerHTML=`<circle r="36" fill="${col(color||'#2A7FD8')}" stroke="#fff" stroke-width="6"/><text y="15" text-anchor="middle">${n}</text>`;
    b.style.opacity=0; Lbadge.append(b); badges.push(b); const snd=play((data.nums||{})[n]||null,0); snd.catch(()=>{});
    await tween(380,p=>{ b.style.opacity=Math.min(1,p*2); b.setAttribute('transform',`translate(${x} ${y}) scale(${.4+.6*ease.back(p)})`); },x=>x); await Promise.all([snd,wait(500)]); }
  function unring(id){ (id==='all'?Object.keys(rings):[].concat(id)).forEach(k=>{ if(rings[k]){ rings[k].el.remove(); delete rings[k]; } }); }
  /* number sentence on the sky */
  function eq(cells,state){
    Leq.innerHTML=''; const n=cells.length, step=118, x0=W/2-(n-1)*step/2;
    eqT=cells.map((c,i)=>{ const op=/[+=−-]/.test(c); const g=mk('g',{class:'xeq'+(op?' op':''),transform:`translate(${x0+i*step} 92)`});
      g.innerHTML=op?`<text y="26" text-anchor="middle">${c}</text>`:`<rect x="-52" y="-56" width="104" height="112" rx="24"/><text y="28" text-anchor="middle">${c}</text>`;
      Leq.append(g); return {g,c,x:x0+i*step,op}; });
    eqState(state||'show');
  }
  function eqState(state){ eqT.forEach(t=>{ t.g.classList.remove('lit'); t.g.style.removeProperty('--xc'); t.g.classList.toggle('dim',state==='dim'); if(!t.op&&state==='dim') t.g.querySelector('text').textContent='?'; else t.g.querySelector('text').textContent=t.c; }); }
  async function lit(i,color,value){ const t=eqT[i]; if(!t) return; t.g.classList.remove('dim'); if(value!=null) t.c=String(value); t.g.querySelector('text').textContent=t.c;
    if(!t.op&&color){ t.g.classList.add('lit'); t.g.style.setProperty('--xc',col(color)); }   // a pulse (no colour) keeps the tile as it is
    await tween(380,p=>{ t.g.setAttribute('transform',`translate(${t.x} 92) scale(${1+.25*Math.sin(p*Math.PI)})`); }); }
  async function fly(v,from,to,color){
    const r=rings[from], t=eqT[to]; if(!t) return; const sx=r?r.b.cx:W/2, sy=r?r.b.y0-40:H/2;
    const f=mk('g',{class:'xfly'}); f.innerHTML=`<circle r="40" fill="${col(color)}" stroke="#fff" stroke-width="6"/><text y="17" text-anchor="middle">${v}</text>`; Lfx.append(f);
    await tween(900,p=>{ const x=sx+(t.x-sx)*p, y=sy+(92-sy)*p-Math.sin(p*Math.PI)*60; f.setAttribute('transform',`translate(${x} ${y}) scale(${1+.3*Math.sin(p*Math.PI)})`); },ease.inout);
    f.remove(); await lit(to,color,v);
  }
  async function cheer(){ if(X.fast) return;
    const stars=[...Array(16)].map((_,k)=>{ const s=mk('path',{d:'M0-22 6-7 22-6 9 4 13 20 0 11-13 20-9 4-22-6-6-7Z',fill:['#FFC928','#FF8A1F','#E8457A','#2E8FEA'][k%4],stroke:'#fff','stroke-width':3}); Lfx.append(s);
      return {s,x:80+Math.random()*840,y:-30-Math.random()*120,r:Math.random()*360,v:.5+Math.random()*.5}; });
    await tween(1500,p=>stars.forEach(o=>o.s.setAttribute('transform',`translate(${o.x} ${o.y+p*700*o.v}) rotate(${o.r+p*300})`)),x=>x).finally(()=>stars.forEach(o=>o.s.remove()));
  }
  function ask(o){
    const g=X.gen; askRow.innerHTML=''; cap.classList.add('asking');
    if(X.fast){ cap.classList.remove('asking'); return lit(o.to,o.color,o.answer); }
    return new Promise((res,rej)=>{
      o.options.forEach(v=>{ const b=/\D/.test(String(v))?xChip(v,'xans'):hel('button','xpl-opt',String(v)); b.addEventListener('click',async()=>{
        if(g!==X.gen) return; if(v!==o.answer){ b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); if(opt.wrong) opt.wrong(); return; }
        b.classList.add('yes'); askRow.querySelectorAll('button').forEach(x=>x.disabled=true);
        try{ await lit(o.to,o.color,o.answer); cap.classList.remove('asking'); askRow.innerHTML=''; res(); }catch(e){ rej(e); } }); askRow.append(b); });
      X.rejAsk=rej;
    });
  }
  /* the child WRITES the number sentence: a dash under each place, the app keypad 0-9 + − = (Marwa 2026-11-03; same as the Exercise model mwrite) */
  function write(o){
    const g=X.gen; cap.classList.add('built'); const wd=qxWordEl(o.text,null,false,true); wd.classList.add('xwrite'); line.append(wd,' ');
    const all=()=>wd.querySelectorAll('.lt.hid').forEach(l=>{ l.classList.remove('hid'); l.classList.add('got'); });
    if(X.fast){ all(); return Promise.resolve(); }
    askRow.innerHTML=''; cap.classList.add('asking'); const pad=hel('div','qmpad mwkeys xkeys'); askRow.append(pad);
    const cur=()=>{ wd.querySelectorAll('.lt').forEach(x=>x.classList.remove('cur')); const n=qxNext(wd); if(n) n.classList.add('cur'); }; cur();
    return new Promise((res,rej)=>{ X.rejAsk=rej;
      [...(o.keys||'1234567890+\u2212=')].forEach(k=>{ const b=hel('button','rb qbtn qlet qmn',`<span>${k}</span>`); b.dataset.v=k;
        b.addEventListener('click',()=>{ if(g!==X.gen) return; const n=qxNext(wd); if(!n) return;
          if(k===(window.arDigitsBack?arDigitsBack(n.textContent):n.textContent)){ qxReveal(wd); if(typeof blip==='function') blip(560+wd.querySelectorAll('.lt.got').length*40,.05); cur();
            if(qxDone(wd)){ X.rejAsk=null; wd.querySelectorAll('.lt').forEach(x=>x.classList.remove('cur')); askRow.innerHTML=''; cap.classList.remove('asking'); res(); } }
          else { n.classList.add('bad'); setTimeout(()=>n.classList.remove('bad'),500); b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); if(opt.wrong) opt.wrong(); } });
        pad.append(b); }); }).then(()=>live(g));
  }
  /* the story sentence is built under the picture, piece by piece (the same chips as the "order" question) */
  function words(t,color,card){ cap.classList.add('built'); const out=[];
    if(card){ const sp=hel('span','xtw xcard'); sp.textContent=t; line.append(sp,' '); out.push(sp); return out; }   // the answer + its word in one card
    String(t).split(/\s+/).filter(Boolean).forEach(w=>{ const sp=hel('span','xtw'); sp.textContent=w; if(color){ sp.style.setProperty('--xc',col(color)); sp.classList.add('xcol'); } line.append(sp,' '); out.push(sp); });
    return out; }
  async function add(t,color,card){ const ws=words(t,color,card); ws.forEach(w=>w.style.opacity=0);
    await tween(350,p=>ws.forEach(w=>w.style.opacity=p)); }
  /* the child builds the story: the pieces lie mixed under the line; tap them in order (the next piece is taken, any other one shakes and stays) */
  function order(o){
    const g=X.gen, ch=o.chunks, cols=o.colors||[], snd=o.audios||[];
    const put=k=>{ const ws=words(ch[k],cols[k]); if(/[.?!]$/.test(ch[k])&&k<ch.length-1&&/^[A-Z]/.test(ch[k+1])) line.append(hel('br')); return ws; };   // a chosen piece is WRITTEN on the line like normal text
    if(X.fast){ ch.forEach((_,k)=>put(k)); return Promise.resolve(); }
    askRow.innerHTML=''; cap.classList.add('asking','built');
    let mix=ch.map((_,k)=>k); for(let t=0;t<30;t++){ mix.sort(()=>Math.random()-.5); if(mix.some((v,k)=>v!==k)) break; }
    return new Promise((res,rej)=>{ let next=0; X.rejAsk=rej;
      mix.forEach(k=>{ const b=xChip(ch[k]); askRow.append(b);
        b.addEventListener('click',()=>{ if(g!==X.gen||b.classList.contains('used')) return;
          if(ch[k]!==ch[next]){ b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); if(opt.wrong) opt.wrong(); return; }   // same text (e.g. "are" twice) = either piece is right
          const n=next; b.classList.add('used'); const ws=put(n); next++; if(opt.stop) opt.stop(); if(snd[n]) Promise.resolve(opt.play&&opt.play(base+snd[n])).catch(()=>{});
          ws.forEach(w=>w.animate&&w.animate([{opacity:0},{opacity:1}],{duration:300}));
          if(next===ch.length){ X.rejAsk=null; setTimeout(()=>{ if(g!==X.gen) return; askRow.innerHTML=''; cap.classList.remove('asking'); res(); },900); } }); if(typeof chipDrag==='function') chipDrag(b,line,()=>g===X.gen); });
    }).then(()=>live(g));
  }
  /* where does counting start? a big arrow in the top band from the Front end (or the Back end) of the line; that end's word lights up */
  async function dir(side,color){ Leq.innerHTML=''; eqT=[]; const c=col(color||'orange'), fr=side!=='back';
    if(SC.vert){ if(LAB.f){ LAB.f.classList.toggle('on',fr); LAB.b.classList.toggle('on',!fr); }
      const ya=TOP+SC.y0+(fr?14:SC.ch*SC.n-14), yb=TOP+SC.y0+(fr?SC.ch*SC.n-14:14), x=SC.ax, g=mk('g'); Leq.append(g);
      const p=mk('path',{d:`M${x} ${ya} L${x} ${yb}`,class:'xring',stroke:c,pathLength:'1'}); p.style.strokeWidth='14px'; g.append(p);
      const h=mk('path',{d:`M${x-28} ${yb+(fr?-34:34)} L${x} ${yb} L${x+28} ${yb+(fr?-34:34)}`,class:'xring',stroke:c,pathLength:'1'}); h.style.strokeDashoffset=1; h.style.strokeWidth='14px'; h.style.strokeLinejoin='round'; g.append(h);
      g.append(mk('circle',{cx:x,cy:ya,r:20,fill:c,stroke:'#fff','stroke-width':6}));
      await tween(X.fast?1:1300,v=>{ p.style.strokeDashoffset=1-v; }); await tween(X.fast?1:260,v=>{ h.style.strokeDashoffset=1-v; }); return; }
    const xa=(fr!==!!SC.mir)?150:850, xb=(fr!==!!SC.mir)?850:150, y=92;   // (mirrored line: the Front end is at the right)
    if(LAB.f){ LAB.f.classList.toggle('on',fr); LAB.b.classList.toggle('on',!fr); }
    const g=mk('g'); Leq.append(g);
    const p=mk('path',{d:`M${xa} ${y} L${xb} ${y}`,class:'xring',stroke:c,'stroke-width':14,pathLength:'1','stroke-linecap':'round'}); p.style.strokeWidth='14px'; g.append(p);
    const h=mk('path',{d:`M${xb+(xb>xa?-34:34)} ${y-28} L${xb} ${y} L${xb+(xb>xa?-34:34)} ${y+28}`,class:'xring',stroke:c,'stroke-width':14,pathLength:'1','stroke-linecap':'round','stroke-linejoin':'round',fill:'none'}); h.style.strokeDashoffset=1; h.style.strokeWidth='14px'; g.append(h);
    const dot=mk('circle',{cx:xa,cy:y,r:20,fill:c,stroke:'#fff','stroke-width':6}); g.append(dot);
    await tween(X.fast?1:1300,v=>{ p.style.strokeDashoffset=1-v; }); await tween(X.fast?1:260,v=>{ h.style.strokeDashoffset=1-v; }); }
  /* a rounded rectangle is DRAWN round a part of the line (the book's orange frame): box in picture px */
  async function frame(o){ const [x0,y0]=P(o.box[0],o.box[1]), [x1,y1]=P(o.box[2],o.box[3]), r=Math.min(26,(y1-y0)/3);
    const pth=mk('path',{d:`M${x0+r} ${y0} H${x1-r} A${r} ${r} 0 0 1 ${x1} ${y0+r} V${y1-r} A${r} ${r} 0 0 1 ${x1-r} ${y1} H${x0+r} A${r} ${r} 0 0 1 ${x0} ${y1-r} V${y0+r} A${r} ${r} 0 0 1 ${x0+r} ${y0} Z`,class:'xring',stroke:col(o.color||'orange'),'stroke-width':9,fill:'none',pathLength:'1'});
    pth.style.strokeWidth='9px'; Lring.append(pth); rings[o.id||('f'+Object.keys(rings).length)]={el:pth,b:{x0,y0,x1,y1,cx:(x0+x1)/2,cy:(y0+y1)/2}}; await tween(X.fast?1:800,v=>{ pth.style.strokeDashoffset=1-v; }); }
  /* "color from the bottom up" (book 6-1): a piece of the book picture (o.src = [x0,y0,x1,y1] picture px, e.g. one strawberry) is copied into each cell of o.cells = [[x0,y0,x1,y1]..]
     one after another, in the order given (data lists the bottom cell first) */
  async function stamp(o){ const k=PIC?PIC.k:1, sr=(o.src||[0,0,1,1]).map(v=>v*k);
    for(const c of o.cells){ const [x0,y0]=P(c[0],c[1]), [x1,y1]=P(c[2],c[3]);
      let sv;
      if(o.shape){ const cx=(x0+x1)/2, cy=(y0+y1)/2, r=Math.min(x1-x0,y1-y0)*.38, F={circle:'#1E9BE8',triangle:'#1FA25C',square:'#E5352B',star:'#FFD91A'}[o.shape]||'#888';
        const d={circle:`M${cx-r} ${cy} a${r} ${r} 0 1 0 ${2*r} 0 a${r} ${r} 0 1 0 ${-2*r} 0Z`, triangle:`M${cx} ${cy-r} L${cx+r*1.1} ${cy+r*.85} L${cx-r*1.1} ${cy+r*.85}Z`, square:`M${cx-r*.9} ${cy-r*.9} h${r*1.8} v${r*1.8} h${-r*1.8}Z`,
          star:`M${cx} ${cy-r*1.1} L${cx+r*.3} ${cy-r*.35} L${cx+r*1.1} ${cy-r*.3} L${cx+r*.5} ${cy+r*.25} L${cx+r*.7} ${cy+r*1.0} L${cx} ${cy+r*.55} L${cx-r*.7} ${cy+r*1.0} L${cx-r*.5} ${cy+r*.25} L${cx-r*1.1} ${cy-r*.3} L${cx-r*.3} ${cy-r*.35}Z`}[o.shape];
        sv=mk('path',{d,fill:F,stroke:'#333','stroke-width':3,'stroke-linejoin':'round'}); }
      else { sv=mk('svg',{x:x0,y:y0,width:x1-x0,height:y1-y0,viewBox:`${sr[0]} ${sr[1]} ${sr[2]-sr[0]} ${sr[3]-sr[1]}`,preserveAspectRatio:'xMidYMid meet',overflow:'hidden'});
        sv.append(mk('image',{href:PICD.href,x:0,y:0,width:1000,height:PICD.ih,preserveAspectRatio:'none'})); } sv.style.opacity=0; sv.style.overflow='hidden'; Lring.append(sv);
      if(typeof blip==='function'&&!X.fast) blip(600,.04); await tween(X.fast?1:300,v=>{ sv.style.opacity=v; }); } }
  async function act(d){
    if(d.scene) return scene(d.scene,d.actors,d);
    if(d.move) return move(d.move,d.ms);
    if(d.guide) return guide(d.guide);
    if(d.dir) return dir(d.dir,d.color);
    if(d.frame) return frame(d.frame);
    if(d.stamp) return stamp(d.stamp);
    if(d.enter) return enter(d.enter,d.from,d.gap);
    if(d.leave) return leave(d.leave,d.to,d.gap);
    if(d.count) return count(d.count,d.start,d.color,d.pts,d.keep,d.r);
    if(d.hold) return hold(d.hold,d.on,d.color);
    if(d.ring) return ring(d.ring,d.color,d.id,d.box,d.pts,d.r);
    if(d.add) return add(d.add,d.color,d.card);
    if(d.line) return d.line==='break'?line.append(hel('br')):(line.innerHTML='',cap.classList.remove('built'));
    if(d.unring) return unring(d.unring);
    if(d.cross) return cross(d.pts,d.r,d.color);
    if(d.link) return link(d.link,d.color,d.r,d.id);
    if(d.pick) return pick(d.pick);
    if(d.badges===false) return clearBadges();
    if(d.eq) return eq(d.eq,d.state);
    if(d.eqState) return eqState(d.eqState);
    if(d.lit!=null) return lit(d.lit,d.color,d.value);
    if(d.pulse!=null) return lit(d.pulse);
    if(d.fly!=null) return fly(d.fly,d.from,d.to,d.color);
    if(d.ask) return ask(d.ask);
    if(d.write) return write(d.write);
    if(d.order) return order(d.order);
    if(d.cheer) return cheer();
    if(d.wait) return wait(d.wait);
  }
  async function beat(b){
    if(b.say!=null){ capT.textContent=data.caption===false?'':b.say; cap.classList.toggle('empty',data.caption===false||!b.say); }   // caption:false = the spoken words are NOT written, only important things (Ahmed 2026-11-12)
    const voice=b.say?play(b.audio,sayMs(b.say)):Promise.resolve();
    if(b.hl&&!X.fast){ const ws=[...line.querySelectorAll('.xtw')].slice(-b.hl.length), t0=X.vt;   // the LAST words on the line = the sentence being re-read
      b.hl.forEach(([a,e],i)=>{ const w=ws[i]; if(!w) return; X.jobs.push({at:t0+a*1000,fn:()=>w.classList.add('reading')},{at:t0+e*1000+60,fn:()=>w.classList.remove('reading')}); }); }
    let motion=Promise.resolve(); for(const d of b.do||[]) motion=motion.then(()=>X.fast||!(d.after||d.count||d.ask||d.order||d.pick||d.hold||d.write)?act(d):voice.then(()=>act(d)));
    // actions run one after another inside a beat, while the line is said; {after:true} = wait for the line first.
    // Anything with its own sound (counting, a question) always waits for the line, so two voices never talk together.
    await Promise.all([voice,motion]); await wait(b.gap!=null?b.gap:750);
  }

  /* ---------- steps (= the lesson's pages: the app's dots move between them) ---------- */
  const steps=data.steps||[];
  function halt(){ X.gen++; X.jobs=[]; if(X.playing){ X.playing=false; if(opt.stop) opt.stop(); if(opt.onState) opt.onState(false); }
    if(X.rejAsk){ const r=X.rejAsk; X.rejAsk=null; r(STOP); } askRow.innerHTML=''; cap.classList.remove('asking'); Lfx.innerHTML=''; }
  async function rebuild(i){ X.fast=true; scene('tree',{}); Leq.innerHTML=''; eqT=[];   // a step opened directly: earlier steps are laid out at once, silently
    try{ for(let k=0;k<i;k++) for(const b of steps[k].beats||[]) await beat(b); } finally{ X.fast=false; } }
  // show step i as it is when it starts (nothing plays)
  async function show(i){ halt(); X.step=i; await rebuild(i); const b=(steps[i].beats||[])[0]; capT.textContent=data.caption===false?'':(b&&b.say||''); }
  // play step i from its start; onDone when its last line ended
  async function play1(i){
    halt(); const g=X.gen; X.step=i; X.playing=true; if(opt.onState) opt.onState(true);
    try{ await rebuild(i); live(g); const bs=steps[i].beats||[]; for(let j=0;j<bs.length;j++){ if(opt.onBeat) opt.onBeat(i,j/bs.length); await beat(bs[j]); } live(g);
      X.playing=false; if(opt.onState) opt.onState(false); if(opt.onDone) opt.onDone(i);
    }catch(e){ if(e!==STOP) console.error(e); }
  }
  // phone held upright: the scene's sides are empty sky/grass, so show its middle bigger
  function fit(){ const r=stageEl.getBoundingClientRect(); if(!r.height) return; svg.setAttribute('viewBox',PIC||r.width/r.height>=1.2?`0 0 ${W} ${VH}`:`185 0 630 ${H}`); }
  if(window.ResizeObserver) new ResizeObserver(fit).observe(stageEl); fit();
  return { play:play1, show, stop:halt, playing:()=>X.playing };
}
window.Explainer={mount};
})();

/* the Lesson tab of an "explain" lesson (LT.explain in lesson.js) */
const xp={done:{}};
function showExplain(){
  $('#lesson').classList.remove('story');
  const host=el('div','scene xhost'); stage.append(host);
  const i=rd.page-1, np=nPages(), done=xp.done[LESSON.id]=xp.done[LESSON.id]||{};
  const rail=on=>{ if(!host.isConnected||tab!=='read') return; setRail([
      on?{kind:'stop',icon:'stop',label:tr('Stop'),click:()=>{ rd.auto=false; x.stop(); }}:{kind:'go',icon:'play',label:tr('Read'),click:()=>{ rd.auto=true; x.play(rd.page-1); }},
      {kind:'again',icon:'restart',label:tr('Restart'),click:()=>{ rd.auto=true; x.play(rd.page-1); }}]); };
  if(typeof vStop==='function') vStop();
  const x=Explainer.mount(host,LESSON.explain,{base:LESSON.base,play:u=>{ if(typeof vStop==='function') vStop(); return playFile(u); },stop:()=>{ if(typeof vStop==='function') vStop(); },wrong:()=>{ if(typeof tone==='function') tone(170,'square',.06,.18); },onState:rail,
    onBeat:(k,f)=>{ if(host.isConnected&&tab==='read') carFrac((k+f)/np); },
    onDone:k=>{ done[k]=1; carFrac((k+1)/np); if(Object.keys(done).length>=np) award(LESSON.id,'read');
      if(rd.auto!==false&&rd.page<np) rd.autoT=setTimeout(()=>{ if(tab==='read'&&host.isConnected) readGo(1,true); },900); }});
  carFrac(i/np); rail(false); if(typeof bookTag==='function') bookTag();
  window.explainStop=()=>{ try{ x.stop(); }catch(e){} };   // core.js stopVoice: leaving the lesson/tab stops the explain animation and its queued clips
  rd.auto=true; x.play(i);   // a new page always starts by itself
}
