const EW_BUILD='e7f22af224';
/* MADE BY tools/build-words.py from the files named below. Do not edit here. */
/* ===== js/core.js ===== */
// Arabic-Indic (٠-٩) and Eastern Persian (۰-۹) digits typed anywhere count as Western digits: one helper, applied to every text box before any answer check
const DIG_RE=/[\u0660-\u0669\u06F0-\u06F9]/g, normDigits=s=>String(s==null?'':s).replace(DIG_RE,d=>{ const c=d.charCodeAt(0); return String(c>=0x6F0?c-0x6F0:c-0x660); });
document.addEventListener('input',e=>{ const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA')&&DIG_RE.test(t.value)){ DIG_RE.lastIndex=0; const p=t.selectionStart; t.value=normDigits(t.value); try{ t.setSelectionRange(p,p); }catch(_){} } DIG_RE.lastIndex=0; },true);
/* CORE — shared helpers for every screen: drawings, sounds, motion, hints, popups, stars, navigation state.
   index.html loads js/app-first.js (core, lib, subjects, start) then js/app-rest.js; both made by tools/build-app.py from these files.
   Colours/sizes live in css/, words a child reads live in data/ — neither needs a change here. */
const G = window.gsap || null;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const anim = !!G && !calm;
const OL = 'var(--ol)';   // outline colour (theme.css --ol) for the SVG drawings
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const el = (tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e};
/* Fetch + decode pictures ahead of time so they show whole at once, not strip by strip. Kept in _pre so the browser cache holds them.
   Only the newest 80 are kept: before, every picture of every lesson opened stayed in memory, and the iPad, short of memory, threw
   pictures (or the whole page) away and drew them again piece by piece. A picture asked again is moved to the end, not doubled. */
const _pre=[], PRE_MAX=80; function preloadImgs(list){ [...new Set((list||[]).filter(Boolean))].forEach(u=>{ if(!/\.(jpe?g|png|webp)$/i.test(u)) return;
  const k=_pre.findIndex(x=>x._u===u); if(k>=0){ _pre.push(_pre.splice(k,1)[0]); return; }
  const i=new Image(); i.decoding='async'; i._u=u; i.src=u; _pre.push(i); if(i.decode) i.decode().catch(()=>{}); });
  if(_pre.length>PRE_MAX) _pre.splice(0,_pre.length-PRE_MAX); }
/* COUNT PICTURE — ONE component for every subject (Marwa 2026-11-06): the library keeps ONE unit picture (one banana, one bee) and
   never one picture per count. Data writes the unit + the count after "#": "../../pics/banana-hat.png#5". Every json goes through
   get(), so cpicFill draws the unit n times (rows of up to 5, the last row centred) into ONE transparent picture and puts it in the
   string's place (marked data:image/png;cpic=1 so css/frame.css shows it as a cut-out, no frame): every screen (count, choose, link, pick, yes/no, lesson pages, exams) shows it like any other picture. */
const CPIC_RE=/\.(png|jpe?g|webp)#(\d+)(n?)$/i, _cpic={};
const cpicCols=n=>n<=4?n:Math.min(5,Math.ceil(n/2));
/* NUMBER CARD: "#6n" = the same repeated unit with the digit 6 written big above it (transparent, no card), for any lesson that teaches a number (English OL u5l3). */
const CPIC_COL={6:'#ffffff',7:'#ffe27a',8:'#ffb36b',9:'#9fe3ff',10:'#c9f7a5'};
function cpicMake(src,n,dig){ const k=src+'#'+n+(dig?'n':''); if(_cpic[k]) return _cpic[k];
  return _cpic[k]=new Promise(ok=>{ const im=new Image(); im.onload=async()=>{ const s=Math.min(1,260/Math.max(im.naturalWidth,im.naturalHeight)), w=Math.round(im.naturalWidth*s), h=Math.round(im.naturalHeight*s), g=Math.round(Math.max(w,h)*.12), cols=cpicCols(n), rows=Math.ceil(n/cols), c=document.createElement('canvas');
    const gw=cols*w+(cols-1)*g, gh=rows*h+(rows-1)*g, th=dig?Math.round(h*1.25):0; c.width=Math.max(gw,dig?Math.round(th*1.1):0); c.height=gh+th+(dig?g:0); const x=c.getContext('2d'), ox=(c.width-gw)/2, oy=th+(dig?g:0);
    if(dig){ try{ await document.fonts.ready; }catch(e){} x.font='700 '+Math.round(th*.8)+'px '+(getComputedStyle(document.body).fontFamily||'sans-serif'); x.textAlign='center'; x.textBaseline='middle'; x.lineJoin='round'; x.lineWidth=Math.round(th*.14); x.strokeStyle='#6b2d12'; x.strokeText(String(n),c.width/2,th/2); x.fillStyle=CPIC_COL[n]||'#fff'; x.fillText(String(n),c.width/2,th/2); }
    for(let i=0;i<n;i++){ const r=Math.floor(i/cols), inRow=Math.min(cols,n-r*cols), off=(cols-inRow)*(w+g)/2; x.drawImage(im,ox+off+(i%cols)*(w+g),oy+r*(h+g),w,h); }
    ok(c.toDataURL('image/png').replace('data:image/png;','data:image/png;cpic=1;')); }; im.onerror=()=>ok(src); im.src=src; }); }
function cpicFill(d,url){ const todo=[], base=new URL(url,location.href);
  const walk=o=>{ if(o&&typeof o==='object') for(const k in o){ const v=o[k]; if(typeof v==='string'){ const m=v.match(CPIC_RE); if(m) todo.push(cpicMake(new URL(v.slice(0,v.lastIndexOf('#')),base).href,+m[2],!!m[3]).then(u=>{ o[k]=u; })); } else walk(v); } };
  walk(d); return Promise.all(todo).then(()=>d); }
/* THE PICTURE KEY (Marwa 2026-11-08): a lesson / question / exam points at a picture by its library id (the name in ../../pics/<id>.png). data/pics/map.json
   (written by tools/pics/reindex.py) says which FILE an id has now (png / jpg / webp) and which weak ids were merged into which. Every json goes through get(),
   so picFix writes the CURRENT file of the id into the string: replace / add / merge a library picture and the whole app follows, no lesson json to edit. */
const PIC_RE=/^(.*\/pics\/)([A-Za-z0-9_-]+)\.(png|jpe?g|webp)(#\d+n?)?$/i; let _picmap=null;
const picMap=()=>_picmap||(_picmap=fetch('data/pics/map.json').then(r=>r.ok?r.json():{files:{},merged:{}}).catch(()=>({files:{},merged:{}})));
function picFix(d,url){ if(/\/pics\/(pics|map)\.json$/.test(url)) return d; return picMap().then(M=>{ const walk=o=>{ if(o&&typeof o==='object') for(const k in o){ const v=o[k]; if(typeof v==='string'){ const m=v.match(PIC_RE); if(m){ let id=m[2]; for(let n=0;n<4&&M.merged[id];n++) id=M.merged[id]; const f=M.files[id]; if(f&&f!==m[2]+'.'+m[3]) o[k]=m[1]+f+(m[4]||''); } } else walk(v); } }; walk(d); return d; }); }
const get = url => fetch(url).then(r=>{ if(!r.ok) throw new Error(url); return r.json(); }).then(d=>picFix(d,url)).then(d=>cpicFill(d,url));

/* ---------- Drawings ---------- */
let gid=0;
/* the game lettering for big names: letters wrapped one by one so css can tilt / resize them (Arabic stays joined: no wrapping) */
const GT=s=>/[\u0600-\u06FF]/.test(s)?s:String(s).split(' ').map(w=>`<span class="w">${[...w].map(ch=>`<i>${ch}</i>`).join('')}</span>`).join(' ');
const STAR_PATH = (()=>{ const p=[]; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, r=i%2?21:44; p.push((50+r*Math.cos(a)).toFixed(1)+' '+(54+r*Math.sin(a)).toFixed(1)); } return 'M'+p.join('L')+'Z'; })();
function STAR(on=true){
  if(!on) return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${STAR_PATH}" fill="rgba(110,60,0,.28)" stroke="rgba(110,60,0,.45)" stroke-width="9" stroke-linejoin="round"/></svg>`;
  const id='st'+(gid++);
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--star-a)"/><stop offset=".5" stop-color="var(--star-b)"/><stop offset="1" stop-color="var(--star-c)"/></linearGradient></defs>
  <path d="${STAR_PATH}" fill="var(--star-under)" stroke="var(--star-under)" stroke-width="11" stroke-linejoin="round" transform="translate(0 3)"/>
  <path d="${STAR_PATH}" fill="url(#${id})" stroke="var(--star-edge)" stroke-width="9" stroke-linejoin="round"/>
  <path d="M30 46Q38 28 50 22" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".85"/><circle cx="25" cy="55" r="3" fill="#fff" opacity=".8"/>
  <path d="M63 76l5 3 3-5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/></svg>`;
}
function CAR(mood='happy'){
  const id='cr'+(gid++);
  const mouth = mood==='wow'
    ? `<ellipse cx="104" cy="56" rx="8" ry="9" fill="var(--car-mouth)" stroke="${OL}" stroke-width="3"/><ellipse cx="104" cy="61" rx="5" ry="3.4" fill="var(--car-tongue)"/>`
    : mood==='sad' ? `<path d="M94 62Q104 52 114 62" fill="none" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>`
    : `<path d="M88 50Q104 74 122 50Z" fill="var(--car-mouth)" stroke="${OL}" stroke-width="3.5" stroke-linejoin="round"/><path d="M91 51.500H119Q116 56 104 56Q94 56 91 51.500Z" fill="#fff"/><path d="M96 63Q104 58 113 63Q108 69 104 69Q99 69 96 63Z" fill="var(--car-tongue)"/>`;
  const eye=(x)=>`<ellipse cx="${x}" cy="25" rx="12.5" ry="14" fill="#fff" stroke="${OL}" stroke-width="3.2"/><ellipse cx="${x+2}" cy="28" rx="7.600" ry="8.600" fill="var(--car-iris)"/><circle cx="${x+2}" cy="29" r="4.400" fill="var(--car-pupil)"/><circle cx="${x+4.500}" cy="24.500" r="2.800" fill="#fff"/><circle cx="${x-1}" cy="32" r="1.400" fill="#fff"/>`;
  const lid=(x)=>`<rect class="lid" x="${x-13}" y="10" width="26" height="30" rx="12" fill="var(--car-lid)" transform="scale(1 0)" style="transform-box:fill-box;transform-origin:top"/>`;
  return `<svg viewBox="-4 -6 136 98" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--car-1)"/><stop offset=".55" stop-color="var(--car-2)"/><stop offset="1" stop-color="var(--car-3)"/></linearGradient></defs><g class="cb">
  <ellipse cx="66" cy="87" rx="56" ry="5" fill="rgba(60,20,0,.3)"/>
  <path d="M5 60Q3 42 21 38L34 14Q41 3 56 3H88Q104 3 110 14L118 34Q130 40 130 56V66Q130 76 120 76H14Q5 76 5 66Z" fill="url(#${id})" stroke="${OL}" stroke-width="3.600" stroke-linejoin="round"/>
  <path d="M7 64H128V67Q128 74 119 74H15Q7 74 7 67Z" fill="var(--car-shade)" opacity=".55"/>
  <path d="M44 9Q50 6 58 6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".75"/><path d="M12 46Q14 41 22 40" fill="none" stroke="#fff" stroke-width="3.500" stroke-linecap="round" opacity=".7"/>
  ${eye(62)}${eye(92)}${lid(62)}${lid(92)}
  <ellipse cx="80" cy="48" rx="5.500" ry="3.300" fill="var(--car-cheek)" opacity=".9"/><ellipse cx="124" cy="46" rx="4" ry="2.800" fill="var(--car-cheek)" opacity=".0"/>
  ${mouth}
  <circle cx="124" cy="46" r="6.500" fill="var(--car-light)" stroke="${OL}" stroke-width="3"/><circle cx="122.500" cy="44" r="2" fill="#fff"/>
  <rect x="3" y="48" width="9" height="10" rx="3.500" fill="var(--car-bumper)" stroke="${OL}" stroke-width="2.800"/>
  <g class="wheel"><circle cx="34" cy="74" r="14.500" fill="var(--car-tyre)" stroke="${OL}" stroke-width="3.600"/><circle cx="34" cy="74" r="7" fill="var(--car-hub)" stroke="${OL}" stroke-width="2.600"/><path d="M34 66.500v5M34 77v5M26.500 74h5M37 74h5" stroke="var(--car-spoke)" stroke-width="2.600" stroke-linecap="round"/></g>
  <g class="wheel"><circle cx="98" cy="74" r="14.500" fill="var(--car-tyre)" stroke="${OL}" stroke-width="3.600"/><circle cx="98" cy="74" r="7" fill="var(--car-hub)" stroke="${OL}" stroke-width="2.600"/><path d="M98 66.500v5M98 77v5M90.500 74h5M101 74h5" stroke="var(--car-spoke)" stroke-width="2.600" stroke-linecap="round"/></g>
  </g></svg>`;
}
const FLASK = c=>`<svg x="22" y="20" width="36" height="46" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/></svg>`;
/* ACCESS: every subject / unit / lesson has a status. 'open' = playable. 'soon' = not added yet (faded + "Soon", not tappable). 'locked' = exists but needs coins or a subscription (chunky padlock + chain).
   Set per item with "status" (and optional "coins" cost) in data/course.json (subjects) or the subject's json (units / lessons); the future admin dashboard writes the same two fields.
   Nothing written = 'open' when it has content, otherwise 'soon'. COURSE.access (off for now) holds the free-trial rule: {enabled, trial:{units:N free units per subject}, coins:default price}.
   Things the child unlocked with coins are remembered in localStorage (es.unlocked) by id; the real coin balance / server comes later.
   NOW (Marwa 2026-11-05): the whole rule (the admin's state per item, the free policy for new users, coins) is in js/coins.js coinAccess; see docs/coins-and-admin.md. */
function accessOf(o,hasContent,id,idx,kind){ return coinAccess(o,hasContent,id,idx,kind); }
const COINTXT=n=>n?`${n} ${isAr()?'كريدت':'credits'}`:'';
/* a chunky childlike padlock (3D: dark underside, glossy gold face, thick silver shackle), drawn in a 60 x 68 box; used by the home books, the lesson circles and the chained unit books */
const PADLOCK=`<g class="padlock"><path d="M17 31V21a13 13 0 0 1 26 0v10" fill="none" stroke="var(--btn-ol)" stroke-width="11.500" stroke-linecap="round"/><path d="M17 31V21a13 13 0 0 1 26 0v10" fill="none" stroke="var(--lock-metal)" stroke-width="6" stroke-linecap="round"/><path d="M20 29V21a10 10 0 0 1 6.500-9.300" fill="none" stroke="#fff" stroke-width="2.200" stroke-linecap="round" opacity=".85"/>
  <rect x="4" y="32" width="52" height="34" rx="14" fill="var(--lock-body-dk)" stroke="var(--btn-ol)" stroke-width="4"/><rect x="4" y="28" width="52" height="33" rx="14" fill="var(--lock-body)" stroke="var(--btn-ol)" stroke-width="4"/><rect x="10" y="33" width="24" height="6.500" rx="3.250" fill="#fff" opacity=".6"/><circle cx="30" cy="43.500" r="5.500" fill="var(--btn-ol)"/><path d="M30 46v9" stroke="var(--btn-ol)" stroke-width="5" stroke-linecap="round"/></g>`;
/* a 3D cardboard box; open ones have a hole with eyes peeking out */
function shade(hex,k){ // k>0 lighter, k<0 darker (own helper for the book colours)
  const n=parseInt(hex.slice(1),16); const f=v=>Math.round(k>=0?v+(255-v)*k:v*(1+k)); const r=f(n>>16),g=f((n>>8)&255),b=f(n&255);
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
/* the subject book: glossy cover, rounded spine with ridges, pages and a ribbon, the NAME standing on the cover in 3D letters (own drawing; colour per subject from course.json) */
function BOX(s){
  const c=s.color||'#2E8BE6', c1=shade(c,.38), c2=shade(c,-.22), c3=shade(c,-.4), ex=shade(c,.55), gx='bk'+(gid++);
  const words=(s.name||'').split(' '), lines=words.length>1&&s.name.length>7?words:[s.name];
  const ar=s.rtl||/[\u0600-\u06FF]/.test(s.name||'');   /* an Arabic name (e.g. رياضيات of the Arabic Math book) needs the Arabic font and no letter-spacing, or its letters come apart (Marwa 2026-11-05) */
  const size=27;   /* ONE fixed name size on every cover (Marwa 2026-11-05): fits the longest word (7 letters, e.g. ENGLISH); long names wrap, never shrink or grow */
  const font=ar?'Baloo Bhaijaan 2':'Luckiest Guy', cy=90-(lines.length-1)*size*.5;
  const t=(k,w,dy,fill,stroke,sw,op)=>`<text x="119" y="${(cy+k*size*1.02+size*.34+dy).toFixed(1)}" text-anchor="middle"${ar?' direction="rtl"':''} font-family="${font}, sans-serif" font-weight="${ar?800:400}" letter-spacing="${ar?0:(size*.03).toFixed(1)}" font-size="${size.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" opacity="${op}">${w}</text>`;
  const txt=lines.map((w,k)=>t(k,w,0,'#fff','#fff',ar?0:size*.045,1)).join('')   /* name: plain white, no shadow, in the middle of the cover */;
  const lock = s._st==='locked'?`<g transform="translate(98 100) scale(.85)">${PADLOCK}</g>`:'';
  const soon = s._st==='soon'?`<g><rect x="62" y="136" width="116" height="30" rx="15" fill="rgba(110,60,10,.6)"/><text x="120" y="158" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="22" fill="#fff">Soon</text></g>`:'';
  const bi=s.book||'blue';   // the book picture (Marwa's own art, app/data/books/<colour>.png); the name stands on its cover
  return `<svg viewBox="0 0 200 210" aria-hidden="true"><defs>
  <linearGradient id="${gx}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${shade(c,.8)}"/></linearGradient></defs>
  <filter id="${gx}f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
  <rect x="2" y="12" width="196" height="186" rx="44" fill="rgba(50,20,0,.6)" filter="url(#${gx}f)"/>   <!-- soft shadow round the edges (left, right, sides), not under the book -->
  <image class="bkimg" href="data/books/${bi}.png" x="2" y="6" width="196" height="202" preserveAspectRatio="xMidYMid meet"/>
  ${txt}${soon}${lock}
  </svg>`;
}
const ICON = {
  home:'<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  map:'<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>',
  stop:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
  pause:'<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.5" height="14" rx="1.5"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.5"/></svg>',
  restart:'<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/></svg>',
  slow:'<svg viewBox="0 0 24 24"><path d="M3 15c0-4 3.5-7 8-7s8 3 8 7z"/><circle cx="20" cy="13" r="2.4"/><rect x="5" y="15" width="3" height="3" rx="1"/><rect x="14" y="15" width="3" height="3" rx="1"/></svg>',
  fast:'<svg viewBox="0 0 24 24"><path d="M3 15l3-5h9l4 5z"/><circle cx="7.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>',
  road:'<svg viewBox="0 0 24 24"><path d="M7 21c0-5 10-5 10-10S7 8 7 3"/><path d="M7 12v.1M17 17v.1"/></svg>',
  exam:'<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12l2 2 4-4M9 18h6"/></svg>',
  arcs:'<svg viewBox="0 0 24 24"><text x="12" y="8" text-anchor="middle" textLength="23" lengthAdjust="spacingAndGlyphs" font-size="9" font-weight="700" font-family="sans-serif" style="fill:currentColor;stroke:none">5 6 7 10</text><path d="M3 11c0 6 3.500 10 9 10s9-4 9-10"/><path d="M7 11c0 4 2 6.500 5 6.500s5-2.500 5-6.500"/><path d="M11 11c0 1.500.4 2.300 1 2.300s1-.8 1-2.300"/></svg>',
  book:'<svg viewBox="0 0 24 24"><path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13C17 4 14 4.5 12 6z"/><path d="M12 6v13"/></svg>',
  abc:'<svg viewBox="0 0 24 24"><path d="M3 18l4-11 4 11M4.5 14h5"/><path d="M14 7v11h3.5a2.7 2.7 0 0 0 0-5.5H14m0 0h3a2.7 2.7 0 0 0 0-5.5h-3"/></svg>',
  quiz:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.4"/><path d="M12 17.2v.1"/></svg>',
  hint:'<svg viewBox="0 0 24 24"><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.6.5.9 1.1.9 1.9V17h5.8v-.8c0-.8.3-1.4.9-1.9A6.5 6.5 0 0 0 12 2.5z"/><rect x="9" y="18.3" width="6" height="2.6" rx="1.3"/></svg>',
  sound:'<svg viewBox="0 0 24 24"><path d="M3 9.5h4l5-4.5v14l-5-4.5H3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  kid:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4.5"/><path d="M3.5 21c.8-4.4 4.2-7 8.5-7s7.7 2.6 8.5 7"/></svg>',
  back:'<svg viewBox="0 0 24 24"><path d="M20 12H5M11 5l-7 7 7 7"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  pencil:'<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.8L16 4.4a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L8.8 18.8z"/><path d="M4 20l4.8-1.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="#fff"><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" stroke-width="2.6"/></svg>'
};


/* picture look (theme part 3): png cut-outs of objects have no frame; people / nature pictures keep the photo frame. The words are in data/pic-frame.json. */
let PFRE=null;
function markPf(i){ if(!PFRE||!i||i.tagName!=='IMG') return; const f=(i.getAttribute('src')||'').split('/').pop().replace(/\.\w+$/,'').replace(/^[0-9a-z]{1,2}-(?=[a-z])/i,''); i.classList.toggle('pf',PFRE.test(f)); }
document.addEventListener('load',e=>{ const i=e.target; if(i&&i.tagName==='IMG'&&i.naturalWidth) i.style.setProperty('--ar',i.naturalWidth/i.naturalHeight); markPf(i); },true);   // --ar = the picture's own shape: the frame hugs it (frame.css)
fetch('data/pic-frame.json').then(r=>r.ok?r.json():null).then(j=>{ if(!j) return; PFRE=new RegExp('(^|-)('+[...(j.people||[]),...(j.nature||[])].join('|')+')(s)?(-|$)','i'); document.querySelectorAll('img').forEach(markPf); }).catch(()=>{});

/* ONE voice at a time: whatever is being read (lesson recording, word, question, exam) stops the moment the child goes somewhere else */
function stopVoice(){ try{ if(typeof stopAll==='function') stopAll(); if(typeof vStop==='function') vStop(); if(typeof gramStop==='function') gramStop(); if(typeof nahwStop==='function') nahwStop(); if(typeof explainStop==='function') explainStop(); if(typeof mathStop==='function') mathStop(); }catch(e){} }   // gramStop: a running grammar animation stops too (it went on reading in the background into the next lesson)
/* ---------- Motion helpers ---------- */
/* light motion: times and ease come from theme.css (--t-pop, --t-fade); small scale, no bouncing */
const TM=(n,d)=>{ const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)); return isFinite(v)?v:d; };
function pop(t,o={}){ if(anim) G.from(t,{scale:.85,opacity:0,y:8,duration:TM('--t-pop',.22),ease:'power2.out',stagger:.03,clearProps:'transform,opacity',...o}); }
function fadeIn(t){ if(anim&&G) G.fromTo(t,{opacity:0},{opacity:1,duration:TM('--t-fade',.18),ease:'power1.out',clearProps:'opacity'}); }
function blink(svg){
  if(!anim||!svg) return; const lids=svg.querySelectorAll('.lid');
  const go=()=>{ if(!svg.isConnected) return; G.to(lids,{attr:{transform:'scale(1 1)'},duration:.08,yoyo:true,repeat:1,onComplete:()=>G.delayedCall(2+Math.random()*3,go)}); };
  G.delayedCall(1+Math.random()*2,go);
}
function putCar(node,mood){ node.innerHTML=CAR(mood); blink(node.querySelector('svg')); return node; }
document.addEventListener('pointerdown',e=>{ const b=e.target.closest('.pill,.rb,.box'); if(!b) return; blip(520,.05); hideHint();
  if(anim){ G.killTweensOf(b,'scaleX,scaleY'); G.to(b,{scaleX:1.1,scaleY:.88,duration:.08}); } });
document.addEventListener('pointerup',()=>{ if(anim) $$('.pill,.rb,.box').forEach(b=>{ if(b._gsap&&b._gsap.scaleX!==1) G.to(b,{scaleX:1,scaleY:1,duration:.7,ease:'elastic.out(1.1,.35)'}); }); });

/* ---------- Sounds ---------- */
/* ONE speaker (Web Audio) for every sound in the app: effects, letters, words, reading, celebrations.
   iPad/iPhone: after the screen locks or another app is used, the old speaker can stay mute (sometimes
   while it even says "running"). So when the app is hidden all sounds stop, and on the next tap the old
   speaker is thrown away and a new one is made inside that tap (see unlockSound below). */
const SND={ctx:null,stale:false};
// decode a sound file; a file that is not a sound (an Arabic slot not recorded yet) only rejects here: the browser's own second promise is caught, so no script error
const decodeSnd=(ctx,b)=>new Promise((ok,no)=>{ const p=ctx.decodeAudioData(b,ok,no); if(p&&p.catch) p.catch(()=>{}); });
const wakeCtx=c=>{ try{ const p=c.resume(); if(p&&p.catch) p.catch(()=>{}); }catch(e){} };
function newSpeaker(){ try{ if(SND.ctx&&SND.ctx.state!=='closed') SND.ctx.close(); }catch(e){}
  try{ SND.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ SND.ctx=null; } return SND.ctx; }
function ac(){ const c=SND.ctx&&SND.ctx.state!=='closed'?SND.ctx:newSpeaker(); if(c&&c.state!=='running') wakeCtx(c); return c; }
function tone(f,type,vol,len,slide){ const c=ac(); if(!c) return; const t=c.currentTime,o=c.createOscillator(),g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(f*slide,t+len*.8);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+len); o.connect(g).connect(c.destination); o.start(t); o.stop(t+len+.02); }
const blip=(f=520,v=.06)=>tone(f,'sine',v,.14,1.8);
function chime(step=0){ const b=[659,784,988,1175][step%4]; tone(b,'triangle',.12,.6); tone(b*2,'sine',.05,.5); tone(b*3,'sine',.03,.4); }
const whoosh=()=>tone(300,'sine',.07,.55,4.5);
function honk(){ [[0,.12],[.18,.2]].forEach(([d,l])=>setTimeout(()=>{ tone(392,'square',.035,l); tone(494,'square',.035,l); },d*1000)); }

/* ---------- Confetti ---------- */
const fx=$('#fx'), ctx=fx.getContext('2d'); let bits=[], fxOn=false;
function confetti(n=140){
  if(calm) return; const d=devicePixelRatio||1; fx.width=innerWidth*d; fx.height=innerHeight*d;
  const cols=['#FFCB2E','#2E8BE6','#43A82A','#EF4B3C','#8A5BE0','#F57F28'];
  for(let i=0;i<n;i++) bits.push({x:fx.width*Math.random(),y:-20*d-Math.random()*fx.height*.4,vx:(Math.random()-.5)*3*d,vy:(2+Math.random()*3)*d,
    r:Math.random()*6.3,vr:(Math.random()-.5)*.3,w:(8+Math.random()*8)*d,h:(4+Math.random()*4)*d,c:cols[i%cols.length],d});
  if(!fxOn){fxOn=true;requestAnimationFrame(tick);}
}
function tick(){ ctx.clearRect(0,0,fx.width,fx.height); bits=bits.filter(b=>b.y<fx.height+30*b.d);
  bits.forEach(b=>{ b.x+=b.vx+Math.sin(b.y/40)*.8*b.d; b.y+=b.vy; b.r+=b.vr; ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.r); ctx.fillStyle=b.c; ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h); ctx.restore(); });
  if(bits.length) requestAnimationFrame(tick); else { fxOn=false; ctx.clearRect(0,0,fx.width,fx.height); } }

/* ---------- Hints: small handwritten note + drawn arrow, placed in the emptiest spot.
   Each hint shows at most HINT_MAX times on this device, then never again. ---------- */
const HINT_MAX=2;
let hintT=0, hintTarget=null, hintTw=null, HC={};
try{ HC=JSON.parse(localStorage.getItem('zoom-hints')||'{}')||{}; }catch(e){}
const OBST='.gamelogo,.hello .car,.note .in,.box .cube,.box .name,.stop .pop,.tab,.dash,.rb,.hud,.sign,.track,.vthumb,.vimg,.vword,.vmeaning,.pill';
function showHint(target, text, delay=900, key=text){
  clearTimeout(hintT); if(!target||!text||(HC[key]||0)>=HINT_MAX) return;
  hintT=setTimeout(()=>{
    if(!target.isConnected || target.closest('[hidden]') || $('.overlay:not([hidden])')) return;
    HC[key]=(HC[key]||0)+1; try{ localStorage.setItem('zoom-hints',JSON.stringify(HC)); }catch(e){}
    const box=$('#hint'), note=$('#hintText'), svg=$('#hintArrow'), r=target.getBoundingClientRect(), W=innerWidth, H=innerHeight;
    note.textContent=text; box.hidden=false; svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.innerHTML='';
    const nw=note.offsetWidth, nh=note.offsetHeight, g=56, cx=r.left+r.width/2, cy=r.top+r.height/2;
    const obs=$$(OBST).filter(o=>!o.closest('[hidden]')&&o!==target&&!target.contains(o)).map(o=>o.getBoundingClientRect());
    const ov=(x,y,R)=>Math.max(0,Math.min(x+nw,R.right)-Math.max(x,R.left))*Math.max(0,Math.min(y+nh,R.bottom)-Math.max(y,R.top));
    const cands=[[r.left-g-nw,cy-nh/2],[r.right+g,cy-nh/2],[cx-nw/2,r.top-g-nh],[cx-nw/2,r.bottom+g],
      [r.left-g-nw,r.top-g-nh],[r.right+g,r.top-g-nh],[r.left-g-nw,r.bottom+g],[r.right+g,r.bottom+g]];
    let best=null;
    cands.forEach(([x,y],i)=>{ const ox=x, oy=y; x=Math.max(8,Math.min(W-nw-8,x)); y=Math.max(8,Math.min(H-nh-8,y));
      let s=ov(x,y,r)*50+Math.abs(ox-x)+Math.abs(oy-y); obs.forEach(R=>s+=ov(x,y,R)); s+=i*2;
      if(!best||s<best.s) best={x,y,s}; });
    const {x,y}=best;
    note.style.left=x+'px'; note.style.top=y+'px';
    const sx=Math.max(x,Math.min(x+nw,cx)), sy=Math.max(y,Math.min(y+nh,cy));
    let ex=cx, ey=cy; const dx=ex-sx, dy=ey-sy, L=Math.hypot(dx,dy)||1, pad=Math.min(r.width,r.height)/2+6;
    ex-=dx/L*pad; ey-=dy/L*pad;
    const mx=(sx+ex)/2-dy/L*24, my=(sy+ey)/2+dx/L*24, ang=Math.atan2(ey-my,ex-mx), h=13;
    if(L>pad+14) svg.innerHTML=`<path d="M${sx} ${sy}Q${mx} ${my} ${ex} ${ey}"/><path d="M${ex-h*Math.cos(ang-.5)} ${ey-h*Math.sin(ang-.5)}L${ex} ${ey}L${ex-h*Math.cos(ang+.5)} ${ey-h*Math.sin(ang+.5)}"/>`;
    hintTarget=target;
    if(anim){
      G.fromTo(note,{scale:.5,opacity:0,rotation:-2},{scale:1,opacity:1,rotation:-2,duration:.45,ease:'back.out(2)'});
      const p=svg.querySelector('path'); if(p){ const len=p.getTotalLength();
        G.fromTo(p,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.5,delay:.15,ease:'power2.out'});
        G.fromTo(svg.lastChild,{opacity:0},{opacity:1,duration:.2,delay:.6}); }
      hintTw=G.to(target,{scale:1.07,duration:.55,yoyo:true,repeat:-1,ease:'sine.inOut',delay:.7});
    }
    setTimeout(()=>{ if(hintTarget===target) hideHint(); },7000);
  },delay);
}
function hideHint(){ clearTimeout(hintT); $('#hint').hidden=true; if(hintTw){ hintTw.kill(); hintTw=null; if(hintTarget&&anim) G.to(hintTarget,{scale:1,duration:.2}); } hintTarget=null; }
addEventListener('resize',hideHint);

/* ---------- Popups ---------- */
function spinRays(o){ if(anim){ const r=$('.rays',o); G.killTweensOf(r); G.fromTo(r,{rotation:0,opacity:0,scale:.4},{rotation:360,duration:24,ease:'none',repeat:-1}); G.to(r,{opacity:1,scale:1,duration:.5}); } }
function message(title,text,art){
  hideHint(); const o=$('#msg'); $('#msgTitle').textContent=title; $('#msgText').textContent=text; $('#msgArt').innerHTML=art||'';
  const car=$('#msgArt .car'); if(car) blink(car.querySelector('svg'));
  o.hidden=false; spinRays(o);
  if(anim){ G.from('#msgTitle',{scale:0,duration:.5,ease:'back.out(2.4)'}); G.from('#msgArt',{scale:0,rotation:-20,duration:.6,delay:.1,ease:'back.out(2)'});
    G.from('#msgText,#msgOk',{y:30,opacity:0,duration:.4,delay:.25,stagger:.1}); }
}
$('#msgOk').addEventListener('click',()=>{ $('#msg').hidden=true; });
$('#msg').addEventListener('click',e=>{ if(e.target.id==='msg') $('#msg').hidden=true; });

/* ---------- Stars (kept on this tablet) ---------- */
let STARS={}; try{ STARS=JSON.parse(localStorage.getItem('zoom-stars')||'{}')||{}; }catch(e){}
const total=()=>Object.values(STARS).reduce((a,o)=>a+Object.keys(o).length,0);
const lessonStars=id=>STARS[id]?Object.keys(STARS[id]).length:0;
// lessons the child has opened (kept on this device): the map's car stands after the last lesson opened or earned, not only after finished ones
let OPENED={}; try{ OPENED=JSON.parse(localStorage.getItem('zoom-opened')||'{}')||{}; }catch(e){}
const markOpened=id=>{ if(!OPENED[id]){ OPENED[id]=1; try{ localStorage.setItem('zoom-opened',JSON.stringify(OPENED)); }catch(e){} } setLast(id); };
// where the child last was, per subject: the lesson, and the book page when she came in through a page sign (the map's car stops there)
let LAST={}; try{ LAST=JSON.parse(localStorage.getItem('zoom-last')||'{}')||{}; }catch(e){}
const subjKey=()=>(typeof SUBJECT!=='undefined'&&SUBJECT&&(SUBJECT.id||SUBJECT.name))||'';
function setLast(id,p){ LAST[subjKey()]=p?{id,p}:{id}; try{ localStorage.setItem('zoom-last',JSON.stringify(LAST)); }catch(e){} }
const lessonTouched=l=>!!(l&&(OPENED[l.id]||lessonStars(l.id)>0));
const lessonParts=m=>(m&&m.tabs&&m.tabs.length)||3;   // a lesson with fewer tabs has fewer stars to earn (subject.json lesson "tabs")
// the lesson the map points at: the furthest one touched (opened or starred) while it is unfinished, else the one after it; nothing touched yet = the first
function curLessonOf(list){ const L=list.filter(l=>l.file); if(!L.length) return null; const lt=LAST[subjKey()], lm=lt&&L.find(l=>l.id===lt.id); if(lm) return lm; let f=-1; L.forEach((l,i)=>{ if(lessonTouched(l)) f=i; });
  if(f<0) return L[0]; return lessonStars(L[f].id)>=lessonParts(L[f])&&L[f+1]?L[f+1]:L[f]; }
function paintHud(){ $$('[data-hud]').forEach(h=>h.innerHTML=`<span class="ic">${STAR(true)}</span><span>${total()}</span>`); if(typeof coinPaint==='function') coinPaint(); }
const PARTS=[['read','Lesson'],['words','Vocabulary'],['quiz','Questions'],['booklet','Booklet'],['workbook','PTS'],['grammar','Grammar']];   // names go through tr() when shown

// the star waits until the last sound of the lesson / question has finished (no overlap), at most 6 s
function award(id,part){ const t0=Date.now(), busyNow=()=>{ try{ return !!(vs.src||(player&&player.run)||speechSynthesis.speaking); }catch(e){ return false; } };
  const wait=()=>{ if(busyNow()&&Date.now()-t0<6000) return setTimeout(wait,150); setTimeout(()=>awardNow(id,part),Date.now()-t0>400?250:0); }; setTimeout(wait,250); }   // short first pause: a sound that was only just started is not playing yet
function awardNow(id,part){
  const isNew=!(STARS[id]&&STARS[id][part]);
  STARS[id]=STARS[id]||{}; STARS[id][part]=1; try{ localStorage.setItem('zoom-stars',JSON.stringify(STARS)); }catch(e){}
  honk(); hideHint();
  const after=()=>{ if(isNew){ paintHud(); paintTabs(); if(anim) G.fromTo('#hudLesson .ic',{scale:1.7},{scale:1,duration:.8,ease:'elastic.out(1.2,.35)'}); chime(3); }
    setTimeout(()=>levelUp(id,isNew),350); };
  if(!anim){ after(); return; }
  const s=el('div','bigstar',STAR(true)); document.body.append(s);
  const r=s.getBoundingClientRect(), t=$('#hudLesson .ic').getBoundingClientRect();
  const dx=t.left+t.width/2-(r.left+r.width/2), dy=t.top+t.height/2-(r.top+r.height/2), sc=t.width/r.width;
  confetti(110); chime(0);
  G.timeline({onComplete:()=>{ s.remove(); after(); }})
    .fromTo(s,{scale:0,rotation:-200},{scale:1.15,rotation:10,duration:.6,ease:'back.out(2.2)'})
    .to(s,{scale:1,rotation:0,duration:.25})
    .to(s,{scaleX:1.12,scaleY:.9,duration:.12,yoyo:true,repeat:3})
    .add(whoosh)
    .to(s,{x:dx,y:dy,scale:sc,rotation:360,duration:.75,ease:'power2.in'});
}
function levelUp(id,isNew){
  const o=$('#levelUp'), t=$('#lvlTitle'); const word=tr(isNew?'Great!':'Super!'); t.textContent=word; t.dataset.t=word; $('#lvlAgain').textContent=tr('Again'); $('#lvlMap').textContent=tr('Map');
  $('#slots').innerHTML=PARTS.filter(([p])=>{ const t=$('.tab[data-tab="'+p+'"]'); return t?!t.hidden:(LESSON&&LESSON.tabs?LESSON.tabs.includes(p):['read','words','quiz'].includes(p)); }).map(([p,l0])=>{ const l=(typeof TABAR!=='undefined'&&isAr()&&TABAR[p==='workbook'?'Assignments':l0])||tr(l0); return `<button class="slot" data-p="${p}" aria-label="Go to ${l}">${STAR(false)}${STARS[id]&&STARS[id][p]?`<span class="on" style="position:absolute;inset:0">${STAR(true)}</span>`:''}<span class="lbl">${l}</span></button>`; }).join('');
  { const sl=$('#slots'), n=sl.children.length; sl.style.setProperty('--n',n); sl.classList.toggle('n3',n<=3); sl.classList.toggle('many',n>3); }
  putCar($('#lvlCar'),'wow'); o.hidden=false; spinRays(o);
  if(!anim) return;
  G.from('#lvlTitle',{scale:0,rotation:-8,duration:.55,ease:'back.out(2.4)'});
  G.from('#slots .slot',{scale:0,duration:.35,stagger:.08,delay:.15,ease:'back.out(2)'});
  $$('#slots .on').forEach((s,i)=>G.fromTo(s,{scale:2.6,y:-160,opacity:0,rotation:-120},{scale:1,y:0,opacity:1,rotation:0,duration:.6,ease:'bounce.out',delay:.6+i*.45,onStart:()=>chime(i)}));
  G.fromTo('#lvlCar',{y:0},{y:-16,duration:.28,yoyo:true,repeat:5,ease:'power1.out',delay:.5});
  G.from('#levelUp .btns',{y:40,opacity:0,duration:.4,delay:.9});
  G.delayedCall(.7+$$('#slots .on').length*.45,()=>confetti(150));
}
$('#lvlAgain').addEventListener('click',()=>{ $('#levelUp').hidden=true; if(tab==='words'){ vs.i=0; vTeach(); } else if(tab==='read'&&LESSON&&LESSON.layout==='nahw'&&typeof nahwRestart==='function') nahwRestart(); else if(inQ()) showQuiz(0); else playFrom(0); });
$('#lvlMap').addEventListener('click',()=>{ $('#levelUp').hidden=true; openMap(); });
// each star (and its name) opens that part of the lesson: Lesson, Vocabulary or Questions
$('#slots').addEventListener('click',e=>{ const s=e.target.closest('.slot'); if(!s) return; $('#levelUp').hidden=true; switchTab(s.dataset.p); });
$('#levelUp').addEventListener('click',e=>{ if(!e.target.closest('button')){ $('#levelUp').hidden=true; if(tab==='read') showHint(rd.words[0]&&rd.words[0].el, LESSON.hints&&LESSON.hints.word, 400,'word'); } });

/* ---------- State ---------- */
let COURSE=null, SUBJECT=null, LESSON=null;
/* ---------- Arabic subject: SUBJECT.rtl (course.json) makes the TEXT Arabic (class .ar on the screen; text blocks run right to left, css/arabic.css); the layout and button places stay the same as every subject; numbers are ١٢٣ ---------- */
const AR_UI={'Models':'تقييمات','Tests':'اختبارات','Test':'اختبار','Tool':'أداة','Tools':'أدوات','Booklet':'كُتيب','Map key':'مفتاح الخريطة','Revision':'مراجعة','Previous':'السابق','Next':'التالي','Lesson':'الدرس','Vocabulary':'الكلمات','Questions':'الأسئلة','Read':'اسمع','Continue':'كمّل','Pause':'وقّف','Restart':'من الأول','Slow':'بطيء','Normal':'عادي',
  'Help':'ساعدني','Listen':'اسمع','Teach':'علّمني','Write':'اكتب','Stop':'وقّف','Listen!':'اسمع!','Read with me!':'اقرأ معي!','Your turn! Write it.':'دورك! اكتب الكلمة','Tap and write!':'اضغط واكتب!',
  'Great!':'ممتاز!','Super!':'رائع!','Again':'تاني','Map':'الخريطة','Nice!':'تمام!','Unit':'الوحدة','Soon':'قريبًا','Book':'الكتاب','Loading...':'لحظة...','Coming soon!':'قريبًا!','Soon!':'قريبًا!','Oops!':'أوبس!','Primary 1':'الصف الأول','Term 1':'الترم الأول'};
const isAr=()=>!!(SUBJECT&&SUBJECT.rtl);
const ptsName=()=>isAr()?'كتاب التقييمات':(SUBJECT&&/^math/.test(SUBJECT.id)?'PTS':'Assessments');   // the Workbook: languages call it Assessments
const tr=s=>(SUBJECT&&SUBJECT.labels&&SUBJECT.labels[s])||(s==='PTS'?ptsName():isAr()&&AR_UI[s]||s);   // a subject can rename tabs / signs with "labels" in its subject.json (English OL: Book's questions, Performance book)
// Arabic letters come with their marks (a letter + fatha/damma/kasra/sukun/shadda = one glyph); other text is split per character
const AR_MARKS='\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED';
function glyphs(s){ if(!/[\u0600-\u06FF]/.test(s)) return [...s]; const out=[]; for(const ch of s){ if(new RegExp('['+AR_MARKS+']').test(ch)&&out.length) out[out.length-1]+=ch; else out.push(ch); } return out; }
const arBase=g=>g.replace(new RegExp('['+AR_MARKS+'\\u0640\\u200d]','g'),'');
const sameLetter=(a,b)=>{ const n=c=>arBase(c).replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase(); return n(a)===n(b); };
const num=n=>isAr()?String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]):String(n);
// the direction of the subject's screens is set ONCE, here: languages left-to-right, Arabic right-to-left (course.json "rtl").
// Everything inside follows it (logical css: inline-start/end); only parts that must keep their place say direction:ltr themselves (page/question arrows, the lesson road).
function subjDir(){ const ar=isAr(); ['map','lesson','exam'].forEach(s=>{ const e=$('#'+s); e.dir='ltr'; e.lang=ar?'ar':'en'; e.classList.toggle('ar',ar); }); }
function setLook(t){ const sj=(typeof SUBJECT!=='undefined'&&SUBJECT)?SUBJECT.id:''; const k=(t==='booklet'||t==='workbook')?'booklet':'school'; const v=sj?sj+'-'+k:''; if(v) document.documentElement.dataset.look=v; else delete document.documentElement.dataset.look; }   // book look = subject + which printed book the tab belongs to (theme.css BOOK LOOKS)
function show(id){ if(id!=='lesson') setLook(''); stopVoice(); if(id!=='subjects') subjDir(); { const sj=(id!=='subjects'&&id!=='welcome'&&typeof SUBJECT!=='undefined'&&SUBJECT)?SUBJECT.id:''; [document.documentElement,document.body].forEach(e=>{ e.dataset.view=id; e.dataset.subj=sj; }); } ['welcome','subjects','map','lesson','exam'].forEach(s=>$('#'+s).hidden=s!==id); hideHint(); if(typeof appNav==='function') appNav(id); fadeIn('#'+id); }
$$('[data-icon]').forEach(b=>b.innerHTML=ICON[b.dataset.icon]);
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>b.dataset.go==='map'?openMap():openSubjects()));

/* ---------- Loading screen (shown while data, pictures or sounds load) ---------- */
let busyN=0;
function busy(on,text){ busyN=Math.max(0,busyN+(on?1:-1)); const b=$('#loading'); if(!b) return;
  if(text) $('#loadingText').textContent=text;
  if(busyN>0){ b.hidden=false; b.style.display='grid'; b.style.opacity=1; } else { b.style.opacity=0; setTimeout(()=>{ if(!busyN){ b.hidden=true; b.style.display='none'; } },300); } }

/* ---------- Sound unlock: Safari (iPad/iPhone) only lets sound start from a tap,
   so on the first taps we wake up both the speaker (Web Audio) and the talking voice. ---------- */
let unlocked=false;
const SILENT_WAV='data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
// whenSound(fn): run fn (it starts a sound by itself) now if the browser already allowed sound (a tap happened); else at the FIRST tap (Safari / iPad: no sound before a touch)
const SOUNDQ=[];
function whenSound(fn){ if(unlocked) fn(); else SOUNDQ.push(fn); }
function unlockSound(){
  if(SND.stale){ SND.stale=false; newSpeaker(); try{ speechSynthesis.cancel(); }catch(e){} }   // back from lock / another app: a fresh speaker
  try{ const c=ac(); if(c){ const b=c.createBuffer(1,1,22050), s=c.createBufferSource(); s.buffer=b; s.connect(c.destination); s.start(0); } }catch(e){}
  if(!unlocked||SND.wokeAt!==SND.ctx){ SND.wokeAt=SND.ctx;   // a tiny silent normal-audio play also wakes the phone's sound for the page
    try{ const a=new Audio(SILENT_WAV); a.volume=0; const p=a.play(); if(p&&p.catch) p.catch(()=>{}); }catch(e){} }
  try{ if('speechSynthesis' in window && !unlocked){ const u=new SpeechSynthesisUtterance('.'); u.volume=0.01; u.rate=2; speechSynthesis.speak(u); speechSynthesis.getVoices(); } }catch(e){}
  unlocked=true;
  while(SOUNDQ.length){ const f=SOUNDQ.shift(); try{ f(); }catch(e){} }   // the sounds that waited for the first tap
}
['pointerdown','touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,unlockSound,{capture:true}));
if('speechSynthesis' in window){ try{ speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices(); }catch(e){} }

// leaving (screen lock, another app): stop every sound and mark the speaker old; coming back: try to wake it, the next tap makes a new one
function sleepSound(){ SND.stale=true;
  try{ if(typeof player!=='undefined'&&player.run){ pausePlay(); readRail(); } }catch(e){}
  try{ if(typeof vStop==='function') vStop(); }catch(e){}
  try{ speechSynthesis.cancel(); }catch(e){}
  try{ if(SND.ctx&&SND.ctx.state==='running') SND.ctx.suspend(); }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(document.hidden) return sleepSound(); if(SND.ctx&&SND.ctx.state!=='closed') wakeCtx(SND.ctx); });
addEventListener('pagehide',sleepSound);
addEventListener('pageshow',e=>{ if(e.persisted) SND.stale=true; });

/* ===== THE PHONE KEYBOARD: ONE place for every screen (Marwa 2026-11-06: the account form shook while scrolling and the keyboard hid the field / the word / the Help bulb).
   While the keyboard is open: --kb = its height and body.kb-open; the screens (except the lesson, which lifts the word itself in js/wordslots.js) end right above it
   (css/base.css), so their own scroll reaches every field; the page itself never slides under the keyboard (pinned at the top, but never during the child's finger drag,
   which was the shaking); a text box the child / parent taps scrolls smoothly into the room above the keyboard. */
const KB={h:0,touch:false};
function kbRoom(){ const vv=window.visualViewport, H=document.documentElement.clientHeight||innerHeight; if(!vv) return null;   // the page height without the keyboard (iPhone keeps it; innerHeight may follow the keyboard)
  return {top:vv.offsetTop,bottom:vv.offsetTop+vv.height,kb:Math.max(0,Math.round(H-vv.height-vv.offsetTop)),H}; }
function kbPin(){ if(!KB.touch&&(scrollY||document.documentElement.scrollTop)) scrollTo(0,0); }
function kbSync(){ const R=kbRoom(); if(!R) return; const h=R.kb>120?R.kb:0;
  if(h!==KB.h){ KB.h=h; document.documentElement.style.setProperty('--kb',h+'px'); document.body.classList.toggle('kb-open',!!h); if(h) setTimeout(kbShow,60); }
  kbPin(); }
// the text box being written in stands in the room above the keyboard (its label too), scrolled smoothly inside its own screen
function kbField(t){ return t&&t.matches&&t.matches('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select')&&!['vin','qin','qxin'].includes(t.id); }
function kbShow(){ const t=document.activeElement; if(!kbField(t)) return; const R=kbRoom(); if(!R) return;
  let sc=t.parentElement; while(sc&&sc!==document.body){ const o=getComputedStyle(sc).overflowY; if((o==='auto'||o==='scroll')&&sc.scrollHeight>sc.clientHeight+1) break; sc=sc.parentElement; }
  if(!sc||sc===document.body) return;
  const box=(t.closest('label,.wl-field')||t).getBoundingClientRect(), r=t.getBoundingClientRect(), cr=sc.getBoundingClientRect();
  const top=Math.max(R.top,cr.top)+12, bottom=Math.min(R.bottom,cr.bottom)-16;
  let d=0; if(r.bottom>bottom) d=r.bottom-bottom; else if(box.top<top) d=box.top-top;
  if(Math.abs(d)>2) sc.scrollTo({top:sc.scrollTop+d,behavior:calm?'auto':'smooth'}); }   // an exact place (called again while it slides, it never overshoots)
if(window.visualViewport){ visualViewport.addEventListener('resize',kbSync); visualViewport.addEventListener('scroll',kbSync); }
addEventListener('scroll',()=>{ if(KB.h) kbPin(); },{passive:true});
document.addEventListener('touchstart',()=>{ KB.touch=true; },{passive:true,capture:true});
document.addEventListener('touchend',()=>{ KB.touch=false; setTimeout(kbPin,30); },{passive:true,capture:true});
document.addEventListener('touchcancel',()=>{ KB.touch=false; },{passive:true,capture:true});
document.addEventListener('focusin',e=>{ if(kbField(e.target)) [80,350,700].forEach(t=>setTimeout(()=>{ kbSync(); kbShow(); },t)); });
;
/* ===== js/lib.js ===== */
/* LIBRARY — plays the sounds Ahmed records/uploads in the audio library (Cloudflare Worker "easystudy-recorder") straight away.
   The library keeps, per recording, the file it replaces in the app (path, under data/), optional "alt" extra paths and "parts"
   (one recording of several syllables, cut here at the pauses). The app asks for a tiny list of what exists (the manifest), then
   fetches only the sound being played; each sound has its own versioned address, so the browser keeps it. If the library cannot be
   reached, or a sound is not in it, the file shipped inside the app is used. Works for any language: it only matches paths. */
const tokMs=(n,d)=>{ const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)); return v>0?v:d; };   // a timing token from theme.css (milliseconds)
const LIB = { url:'https://easystudy-recorder.marwasleem.workers.dev', man:null, at:0, idx:{}, bufs:{}, groups:{}, tries:0 };

function libIndex(man){
  const idx={};
  Object.entries(man||{}).forEach(([id,m])=>{
    if(!m||!m.ts) return;
    if(m.parts&&m.parts.length) m.parts.forEach((p,i)=>{ idx[p]={id,ts:m.ts,part:i,n:m.parts.length}; });
    else [m.path].concat(m.alt||[]).forEach(p=>{ if(p&&!/^grp:/.test(p)) idx[p]={id,ts:m.ts}; });
  });
  return idx;
}
/* Requests to the library are kept to a minimum: the list (manifest) is saved on the device and used as is; it is asked for again only
   when the child moves to another screen (libNav) and the last check is older than LIB_EVERY, never in the middle of a question.
   Each sound has a versioned address; its bytes are kept on the device (Cache Storage) and downloaded again only when its number changes. */
const LIB_EVERY=60000;
try{ const s=JSON.parse(localStorage.getItem('es-libman')||'null'); if(s&&s.man){ LIB.man=s.man; LIB.idx=libIndex(s.man); LIB.at=s.at||0; } }catch(e){}
function libRefresh(){   // one small request for the list, in the background; later sounds use the new list
  if(LIB.pending) return LIB.pending;
  LIB.pending=Promise.race([fetch(LIB.url+'/pub/manifest',{cache:'no-cache'}).then(r=>{ if(!r.ok) throw 0; return r.json(); }),new Promise((_,no)=>setTimeout(no,2500))])
    .then(m=>{ LIB.man=m; LIB.idx=libIndex(m); LIB.tries=0; try{ localStorage.setItem('es-libman',JSON.stringify({man:m,at:Date.now()})); }catch(e){} }).catch(()=>{ LIB.tries++; })
    .finally(()=>{ LIB.at=Date.now(); LIB.pending=null; });
  return LIB.pending;
}
function libSync(){
  if(LIB.man) return LIB.pending||Promise.resolve();   // a saved list exists: use it, no waiting, no request
  if(LIB.tries>=2&&Date.now()-LIB.at<60000) return Promise.resolve();   // library down: don't make every sound wait
  return libRefresh();
}
function libNav(){ if(Date.now()-LIB.at>LIB_EVERY) libRefresh(); }
async function libBytes(url){   // sound bytes: from the device when kept, else downloaded once and kept
  try{ if(self.caches){ const c=await caches.open('es-lib'), hit=await c.match(url); if(hit) return hit.arrayBuffer();
    const r=await fetch(url); if(!r.ok) throw 0; c.put(url,r.clone()).catch(()=>{}); return r.arrayBuffer(); } }catch(e){}
  const r=await fetch(url); if(!r.ok) throw 0; return r.arrayBuffer();
}

const libPath=url=>{ const m=/(?:^|\/)data\/(.+?)(?:\?.*)?$/.exec(url||''); return m?decodeURIComponent(m[1]):null; };

/* ---- clean-up that the import step used to do: cut silence at both ends, even out the loudness ---- */
function libPCM(buf){ const d=buf.getChannelData(0); if(buf.numberOfChannels<2) return d.slice(); const o=new Float32Array(d.length);
  for(let c=0;c<buf.numberOfChannels;c++){ const x=buf.getChannelData(c); for(let i=0;i<o.length;i++) o[i]+=x[i]/buf.numberOfChannels; } return o; }
function libFrames(d,sr){ const f=Math.round(sr*.01), n=Math.floor(d.length/f), db=new Float32Array(n);
  for(let i=0;i<n;i++){ let s=0; for(let k=i*f;k<(i+1)*f;k++) s+=d[k]*d[k]; db[i]=10*Math.log10(s/f+1e-12); } return {db,f}; }
function libMake(ctx,d,sr,a,b){   // samples a..b -> trimmed, normalised AudioBuffer
  const {db,f}=libFrames(d.subarray(a,b),sr); let s=0,e=db.length-1;
  while(s<e&&db[s]<-45) s++; while(e>s&&db[e]<-45) e--;
  const from=Math.max(0,a+(s-5)*f), to=Math.min(d.length,a+(e+6)*f); if(to-from<sr*.08) return null;
  const out=new Float32Array(to-from+Math.round(sr*.04)); let pk=0,sq=0,n=0;
  for(let i=from;i<to;i++){ out[i-from]=d[i]; const v=Math.abs(d[i]); if(v>pk) pk=v; if(v>.01){ sq+=d[i]*d[i]; n++; } }
  const rms=n?Math.sqrt(sq/n):.1, g=Math.min(.1/rms,.9/(pk||1),8); for(let i=0;i<out.length;i++) out[i]*=g;
  const r=ctx.createBuffer(1,out.length,sr); r.copyToChannel(out,0); return r;
}
function libCut(d,sr,n){   // find n sounds separated by pauses; several thresholds are tried until the count matches
  let pk=0; for(let i=0;i<d.length;i++){ const v=Math.abs(d[i]); if(v>pk) pk=v; }
  const off=-20*Math.log10(pk||1), {db,f}=libFrames(d,sr);
  for(const th of [-35,-40,-30,-45,-25]) for(const pause of [.30,.22,.40,.15,.5]){
    const segs=[]; let st=-1,quiet=0; const minQ=Math.round(pause/.01);
    for(let i=0;i<=db.length;i++){
      const loud=i<db.length&&db[i]+off>th;
      if(loud){ if(st<0) st=i; quiet=0; } else if(st>=0){ quiet++; if(quiet>=minQ||i===db.length){ const end=i-quiet+1; if(end-st>=8) segs.push([st,end]); st=-1; quiet=0; } }
    }
    if(segs.length===n) return segs.map(([a,b])=>[Math.max(0,(a-6)*f),Math.min(d.length,(b+6)*f)]);
  }
  return null;
}
// the sound for a file of the app from the library, or null (then the app's own file is used)
async function libBuffer(url,ctx){
  const path=libPath(url); if(!path) return null;
  await libSync(); const e=LIB.idx[path]; if(!e) return null;
  const key=path+'@'+e.ts; if(LIB.bufs[key]) return LIB.bufs[key];
  LIB.bufs[key]=(async()=>{
    try{
      const raw=await libBytes(`${LIB.url}/pub/a/${e.id}?v=${e.ts}`).then(b=>decodeSnd(ctx,b));
      const d=libPCM(raw), sr=raw.sampleRate;
      if(e.part==null) return libMake(ctx,d,sr,0,d.length);
      const gk=e.id+'@'+e.ts+'#'+e.n; if(!LIB.groups[gk]) LIB.groups[gk]=libCut(d,sr,e.n);
      const segs=LIB.groups[gk]; return segs?libMake(ctx,d,sr,segs[e.part][0],segs[e.part][1]):null;
    }catch(err){ return null; }
  })();
  const b=await LIB.bufs[key]; if(!b) delete LIB.bufs[key]; return b;
}


/* SENTENCES WITH VARIABLES — en-shared/q/index.json lists entries {path,template,params,vals}; their own mp3 is NOT shipped. The sentence is built here from
   pieces said once: the template's fixed parts (en-shared/t) and each value (en-shared/v), played one after the other. A recording of the whole
   sentence in the library (same path) still wins. A new combination needs no new file. */
const COMP={map:null};
async function composeMap(url){
  if(!COMP.map) COMP.map=(async()=>{ const m={};
    try{ const base=(url.match(/^(.*?\/)data\//)||['',''])[1]; const d=await (await fetch(base+'data/en-shared/q/index.json')).json();
      const T={}; d.templates.forEach(t=>T[t.id]=t);
      d.entries.forEach(e=>{ const t=T[e.template]; if(t&&t.parts&&e.vals) m[e.path]=t.parts.map(x=>x.path||e.vals[x.v]); }); }catch(e){}
    return m; })();
  return COMP.map;
}
async function composeFiles(url){ const p=libPath(url); if(!p||p.indexOf('en-shared/q/')!==0) return null;
  const m=await composeMap(url); const l=m[p]; if(!l) return null;
  return l.map(f=>url.replace(/data\/.+?(\?.*)?$/,'data/'+f)); }

/* APP UPDATES — index.html carries APP_V (set when the app is published, see sync.sh); version.json says the newest. When the child moves
   to another screen the app quietly checks (a small file), and reloads itself on the home screen, where nothing can be lost
   (never during a question or while sound plays). On a local copy without APP_V nothing happens. */
const APPV={at:0,newer:false};
async function appNav(screen){
  libNav(); try{ navigator.serviceWorker&&navigator.serviceWorker.controller&&navigator.serviceWorker.controller.postMessage('nav'); }catch(e){}
  if(!window.APP_V||!/^https?:/.test(location.protocol)) return;
  if(!APPV.newer&&Date.now()-APPV.at>LIB_EVERY){ APPV.at=Date.now();
    try{ const v=await (await fetch('version.json',{cache:'no-cache'})).json(); if(v&&v.v&&v.v!==window.APP_V) APPV.newer=true; else if(v&&v.v) sessionStorage.removeItem('es.vtry'); }catch(e){} }
  if(APPV.newer&&screen==='subjects'&&!document.getElementById('subjects').hidden&&!(typeof player!=='undefined'&&player.run)){
    // at most 2 reloads in a row for an update: if the new page still is not there (a server still giving the old page for a moment),
    // the app simply goes on with this one instead of reloading again and again (2026-11-07)
    let n=0; try{ n=+sessionStorage.getItem('es.vtry')||0; sessionStorage.setItem('es.vtry',n+1); }catch(e){ n=9; } if(n>=2) return;
    await swFresh(); location.reload(); }
}
// the app is kept on the device (sw.js): before reloading for a new version, it drops the old files there (at most 5 s wait)
function swFresh(){ const c=navigator.serviceWorker&&navigator.serviceWorker.controller; if(!c) return Promise.resolve();
  return new Promise(ok=>{ const ch=new MessageChannel(); ch.port1.onmessage=()=>ok(); c.postMessage('update',[ch.port2]); setTimeout(ok,5000); }); }

/* chipDrag: a word piece (order questions, explainer Try) can be TAPPED or DRAGGED onto the sentence line (Marwa 2026-11-03).
   A drag that ends on/near `target` = the same as a tap (b.click()); anywhere else = the piece goes back. The pager ignores these chips (book.js own list). */
function chipDrag(b,target,ok){
  b.style.touchAction='none';
  b.addEventListener('click',e=>{ if(b._skip){ e.stopImmediatePropagation(); e.preventDefault(); } },true);
  b.addEventListener('pointerdown',e=>{ if(e.button||b.disabled||b.classList.contains('used')||(ok&&!ok())) return; const sx=e.clientX, sy=e.clientY; let gh=null;
    const mv=ev=>{ const dx=ev.clientX-sx, dy=ev.clientY-sy;
      if(!gh&&Math.hypot(dx,dy)>8){ const r=b.getBoundingClientRect(); gh=b.cloneNode(true); gh.classList.add('chipghost');
        Object.assign(gh.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',margin:0,zIndex:999,pointerEvents:'none'}); document.body.append(gh); b.style.opacity=.35; }
      if(gh){ ev.preventDefault(); gh.style.transform=`translate(${dx}px,${dy}px) scale(1.06)`; } };
    const up=ev=>{ removeEventListener('pointermove',mv); removeEventListener('pointerup',up); removeEventListener('pointercancel',up);
      if(!gh) return; gh.remove(); b.style.opacity=''; b._skip=true; setTimeout(()=>b._skip=false,80);
      const t=typeof target==='function'?target():target, r=t&&t.getBoundingClientRect(), m=40;
      if(ev.type==='pointerup'&&r&&ev.clientX>r.left-m&&ev.clientX<r.right+m&&ev.clientY>r.top-m&&ev.clientY<r.bottom+m){ b._skip=false; b.click(); b._skip=true; } };
    addEventListener('pointermove',mv,{passive:false}); addEventListener('pointerup',up); addEventListener('pointercancel',up); });
}
;
/* ===== js/lesson.js ===== */
/* LESSON screen — header, reading tab (dialog + recording), tab bar and side buttons. */
/* ---------- Lesson ---------- */
// every path inside a lesson.json is relative to that lesson's own folder
function fixPaths(L,file){
  const base=file.slice(0,file.lastIndexOf('/')+1), R=p=>p&&!/^(https?:|\/|data:)/.test(p)?base+p:p;
  L.base=base; L.scene=R(L.scene); L.picture=R(L.picture); L.pictureTall=R(L.pictureTall); L.pagePictures=(L.pagePictures||[]).map(R); L.pagePicturesTall=(L.pagePicturesTall||[]).map(R); (L.pageAudio||[]).forEach(a=>{ a.normal=R(a.normal); a.slow=R(a.slow); }); if(L.audio){ L.audio.normal=R(L.audio.normal); L.audio.slow=R(L.audio.slow); }
  (L.vocab||[]).forEach(v=>{ v.img=R(v.img); if(v.audio){ v.audio.word=R(v.audio.word); v.audio.again=R(v.audio.again); v.audio.ar=R(v.audio.ar); } if(v.rel){ v.rel.labelAudio=R(v.rel.labelAudio); v.rel.audio=R(v.rel.audio); } (v.parts||[]).forEach(p=>{ p.audio=R(p.audio); p.blend=R(p.blend); }); });
  (L.lines||[]).forEach(l=>{ l.pic=R(l.pic); });
  Object.values(L.bk||{}).forEach(b=>{ b.img=R(b.img); });
  if(L.figure) (L.figure.formula||[]).forEach(x=>{ x.img=R(x.img); });
  L.praise=R(L.praise);
  ((L.math&&(L.math.bonds||L.math).rows)||[]).forEach(r=>{ r.audio=R(r.audio); });
  if(L.math&&L.math.line){ const ln=L.math.line; ln.rows.forEach(r=>{ r.audio=R(r.audio); }); ln.small.audio=R(ln.small.audio); ln.big.audio=R(ln.big.audio); ln.textAudio=R(ln.textAudio); }
  if(L.letter&&typeof fixLetterPaths==='function') fixLetterPaths(L.letter,R);
  return L;
}
async function openLesson(m){
  stopVoice(); markOpened(m.id);
  if(!LESSON || LESSON.id!==m.id){
    busy(true);
    try{ LESSON=fixPaths(await get(m.file), m.file); LESSON.id=m.id; if(LESSON.tabs) LESSON.tabs=currTabs(LESSON.tabs); }catch(e){ busy(false); message('Oops!','This lesson did not load. Check the internet and try again.'); return; }
    preloadImgs([LESSON.scene,LESSON.picture,...(LESSON.pagePictures||[]),...(LESSON.vocab||[]).map(v=>v.img),...(LESSON.lines||[]).map(l=>l.pic),...Object.values(LESSON.bk||{}).map(b=>b.img)]);
    player.bufs={}; player.ready=null; vs.i=0; rd.page=1; rd.done={}; ensureAudio().catch(()=>{}); busy(false);   // an Arabic story not recorded yet (requested slot) stays silent: no error
  }
  rd.halted=false; rd.hold=false; show('lesson'); LESSON.tool=m.tool||null; LESSON.toolN=m.toolN||5;
  $('#lessonMeta').textContent=`${SUBJECT.name} · ${tr(COURSE.grade)} · ${tr(COURSE.term)}`;
  $('#lessonTitle').textContent=isAr()?`${LESSON.unitLabel||`${tr('Unit')} ${num(LESSON.unit)}`} · ${tr('Lesson')} ${num(LESSON.lesson)} · ${LESSON.title}`:`Unit ${LESSON.unit} · Lesson ${LESSON.lesson} · ${LESSON.title}`;
  $('#stage').style.setProperty('--scene',`url("${new URL(LESSON.scene,location.href).href}")`);   // full address: css files live in css/
  switchTab(LESSON.tabs?LESSON.tabs[0]:'read'); fitTitle();   // (the Lesson tab reads by itself: switchTab -> readAuto)
  if(!LESSON.tabs&&typeof qLoad==='function') qLoad().then(()=>{ if(LESSON&&LESSON.id===m.id) paintTabs(); }); pop('.l-head > *',{y:-20}); pop('.tabs .tab',{y:30,delay:.1});
}

/* ---------- Audio (lesson recordings are separate mp3 files) ---------- */
const rd={auto:false,autoT:0,page:1,done:{},words:[],lineEls:[],spotEls:[],playing:false,slow:false,pick:{},stopAt:null,full:false,cur:-1,curLine:-1,raf:0};
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
/* MULTI-SEGMENT lesson (RULES.md "Segment slides"): lesson.json "pageAudio":[{normal,slow?,start}] = one recording per slide. They are laid on one timeline (slide k starts at "start"
   seconds, the lesson's word times are on that timeline) so reading, pages, speed and highlight work as for a single recording. No "slow" file = the normal one played at slowRate. */
async function pagesAudio(dec){
  const L=LESSON.pageAudio, f=1/(LESSON.audio.slowRate||.75), sr=player.ctx.sampleRate;
  const n=await Promise.all(L.map(a=>dec(a.normal))), s=L.every(a=>a.slow)?await Promise.all(L.map(a=>dec(a.slow))):null;
  const mix=(bufs,k)=>{ const len=Math.ceil(Math.max(...bufs.map((b,i)=>(L[i].start*k)*sr+b.length))), out=player.ctx.createBuffer(1,len,sr);
    bufs.forEach((b,i)=>{ const ch=out.getChannelData(0), src=b.getChannelData(0), o=Math.round(L[i].start*k*sr); for(let j=0;j<src.length;j++) ch[o+j]+=src[j]; }); return out; };
  return [mix(n,1),s?mix(s,f):null];
}
function ensureAudio(){
  if(!LESSON.audio) return Promise.resolve();
  const ready=ensureCtx().then(()=>{
    if(!player.ready){
      const dec=url=>fetch(url).then(r=>{ if(!r.ok) throw new Error('no recording'); return r.arrayBuffer(); }).then(b=>decodeSnd(player.ctx,b));
      if(LESSON.pageAudio) player.ready=pagesAudio(dec).then(([n,s])=>{ player.bufs.n=n; player.bufs.s=s; });   // one recording per slide, laid on ONE timeline at each slide's "start"
      else player.ready=Promise.all([dec(LESSON.audio.normal),dec(LESSON.audio.slow)]).then(([n,s])=>{ player.bufs.n=n; player.bufs.s=s; });
    }
    return player.ready;
  });
  return ready;
}
const factor=()=>rd.slow?1/(LESSON.audio.slowRate||.75):1;
function now(){ return player.run?player.startT+Math.max(0,player.ctx.currentTime-player.startCtx)/factor():player.pos; }
function halt(){ if(player.src){ player.src.onended=null; try{player.src.stop();}catch(e){} player.src=null; } }
async function playFrom(t,stopAt=null,full=stopAt==null,auto=false,quiet=false){
  rd.halted=false; hideHint(); if(typeof vStop==='function') vStop(); halt(); player.run=false; clearTimeout(rd.autoT); rd.auto=auto; rd.stopAt=stopAt; rd.playing=full; rd.full=full; readRail();
  try{ await ensureAudio(); }catch(e){ rd.playing=false; readRail(); if(!quiet&&(LESSON.layout==='poem'||LESSON.pageAudio)) showHint($('#rail .dash.go .rb'),LESSON.pageAudio?'لسه مفيش تسجيل':'لسه مفيش تسجيل للنشيد',60,'norec'+Date.now()); return; }   // an empty recording slot: say so
  const f=factor(), src=player.ctx.createBufferSource(), rate=rd.slow&&!player.bufs.s; src.buffer=rd.slow&&player.bufs.s?player.bufs.s:player.bufs.n; if(rate) src.playbackRate.value=1/f; src.connect(player.ctx.destination);   // rate: no slow recording = the normal one slowed down
  const o=rate?t:t*f, dur=stopAt!=null?Math.max(.05,(stopAt-t)*f):undefined; const lead=.12, at=player.ctx.currentTime+lead; dur!=null?src.start(at,o,rate&&dur!=null?(stopAt-t):dur):src.start(at,o);
  player.src=src; player.run=true; player.startCtx=at; player.startT=t;
  src.onended=()=>{ if(player.src!==src) return; player.src=null; player.run=false; const w=rd.full; player.pos=0; rd.stopAt=null; rd.full=false; endPlay(w); };
  startLoop();
}
function pausePlay(){ rd.auto=false; clearTimeout(rd.autoT); if(!player.run) return; player.pos=now(); halt(); player.run=false; rd.playing=false; cancelAnimationFrame(rd.raf); carDrive(false); }
function stopAll(){ rd.autoGen=(rd.autoGen||0)+1; rd.auto=false; clearTimeout(rd.autoT); halt(); player.run=false; player.pos=0; rd.stopAt=null; rd.playing=false; rd.full=false; cancelAnimationFrame(rd.raf); carDrive(false); }

const trackCar=$('#trackCar'); putCar(trackCar);
let spin=null;
// a lesson with "pages" (each line has "page": 1|2): the reading tab shows one page at a time; its span is where that page's lines are in the recording
const nPages=()=>LESSON&&LESSON.pages>1?LESSON.pages:1;
function pageSpan(){ if(nPages()<2) return [0,LESSON.end]; const ls=LESSON.lines.filter(l=>l.page===rd.page); if(!ls.length) return [0,LESSON.end];
  return [rd.page===1?0:Math.max(0,ls[0].words[0][1]-.15), rd.page===nPages()?LESSON.end:Math.min(ls[ls.length-1].words.slice(-1)[0][2]+.35,((LESSON.lines.find(l=>l.page===rd.page+1)||{words:[[0,1e9]]}).words[0][1])-.2)]; }   // a page never plays into the first word of the next page (its start is fragment-free)
function carAt(t){ if(!LESSON) return; if(LESSON.layout==='explain'&&tab==='read') return carFrac((rd.page-1)/nPages());   // explain pages: the car moves page by page (explainer onBeat), never back to 0
  const [a,b]=pageSpan(), n=nPages(); carFrac(((rd.page-1)+Math.max(0,Math.min(1,(t-a)/(b-a))))/n); }   // progress runs over ALL pages of the lesson, not per page
// p = 0..1 along the header road (reading time in the Lesson tab, words learned in Vocabulary)
function carFrac(p){ p=Math.max(0,Math.min(1,p||0)); const tw=Math.max(0,trackCar.parentElement.clientWidth-trackCar.offsetWidth-52);
  trackCar.style.transform=`translate(${(p*tw).toFixed(1)}px,0)`; }
function carDrive(on){
  if(!anim) return;
  if(on){ if(!spin) spin=G.to('#trackCar .wheel',{rotation:360,transformOrigin:'50% 50%',duration:.45,repeat:-1,ease:'none'}); else spin.play();
    G.to('#trackCar .cb',{y:-2,duration:.18,yoyo:true,repeat:-1,ease:'sine.inOut'}); }
  else { if(spin) spin.pause(); G.killTweensOf('#trackCar .cb'); G.set('#trackCar .cb',{y:0}); }
}
function mark(t){
  let wi=-1; for(let i=0;i<rd.words.length;i++){ const w=rd.words[i]; if(t>=w.s-.03&&t<w.e+.12) wi=i; }   // last match wins: the next word takes over as soon as it starts
  if(wi!==rd.cur){ if(rd.cur>=0&&rd.words[rd.cur]) rd.words[rd.cur].el.classList.remove('reading'); $$('.pfig .pop').forEach(x=>x.classList.remove('pop'));
    if(wi>=0&&rd.words[wi]&&rd.words[wi].pop) rd.words[wi].pop.forEach(id=>$$(`.pfig [data-id="${id}"]`).forEach(x=>x.classList.add('pop')));   // a pointing page with a built figure: the letters being talked about pop
    if(wi>=0&&rd.words[wi]){ const e=rd.words[wi].el; e.classList.add('reading'); storyScroll(e); if(anim) G.fromTo(e,{scale:1.2},{scale:1,duration:.35,ease:'back.out(3)'}); }
    rd.cur=wi; }
  let li=-1; if(LESSON) LESSON.lines.forEach((l,i)=>{ const a=l.words[0][1], b=l.words[l.words.length-1][2]; if(t>=a-.05&&t<b+.25) li=i; });
  if(li!==rd.curLine){ rd.lineEls.forEach((e,i)=>e.classList.toggle('on',i===li)); rd.spotEls.forEach(e=>e&&e.classList.remove('on')); if(rd.spotEls[li]) rd.spotEls[li].classList.add('on'); rd.curLine=li;
    const ln=li>=0&&rd.lineEls[li]; if(ln&&$('.acticon',ln)){ ln.classList.add('acting'); clearTimeout(ln._act); ln._act=setTimeout(()=>ln.classList.remove('acting'),2200); } if(li>=0&&rd.lineEls[li]&&!rd.lineEls[li].closest('.scene.story:not(.poem):not(.point)')) rd.lineEls[li].scrollIntoView({block:'nearest',behavior:'smooth'}); }
  if(rd.full&&t>=0) carAt(t);
}
function loop(){ if(!player.run) return; mark(now()); rd.raf=requestAnimationFrame(loop); }
function startLoop(){ cancelAnimationFrame(rd.raf); carDrive(rd.full); rd.raf=requestAnimationFrame(loop); }
function clearMarks(){ mark(-1); }
function endPlay(full){
  rd.playing=false; cancelAnimationFrame(rd.raf); carDrive(false); setTimeout(()=>{ if(!player.run) clearMarks(); },500); readRail();
  if(full){ if(rd.auto&&rd.page<nPages()) rd.autoT=setTimeout(()=>{ if(rd.auto&&tab==='read') readGo(1,true); },900); else rd.auto=false;
    carAt(pageSpan()[1]); rd.done[rd.page]=1; if(Object.keys(rd.done).length>=nPages()) award(LESSON.id,'read'); setTimeout(()=>{ if(!player.run) carAt(pageSpan()[0]); },4000); }
}

/* ---------- Tabs + rail ---------- */
const stage=$('#stage'), rail=$('#rail'); let tab='read';
const TABAR={Lesson:'الدرس',Vocab:'كلمات',Q:'أسئلة',Vocabulary:'كلمات',Questions:'أسئلة',Assignments:'كتاب التقييمات','Book Questions':'أسئلة الكتاب','Assessment Book':'كتاب التقييمات',Booklet:'كُتيب',PTS:'كتاب التقييمات',Grammar:'القواعد'};   // the bottom tabs in Arabic lessons
const TABS={read:['Lesson','book'],words:['Vocabulary','abc'],quiz:['Questions','quiz'],booklet:['Booklet','quiz'],workbook:['Assignments','quiz'],grammar:['Grammar','hint']};
// English AL: the Lesson tab (book parts) and the Booklet tab both run on the questions engine (quiz.js); inQ() = a questions-style sheet is on screen
const isAL=()=>!!(LESSON&&LESSON.type==='al'), inQ=()=>tab==='quiz'||tab==='workbook'||tab==='booklet'||(isAL()&&tab==='read'), alSrc=()=>tab==='booklet'?'booklet':'lesson', qKey=()=>isAL()||tab==='booklet'||tab==='workbook'?tab:'quiz';
const KEYTAB={read:'book',quiz:'book',grammar:'book',booklet:'bk',workbook:'pts'};   // the map-key colour each tab belongs to (Words has none)
function paintTabs(){ $$('.tab').forEach(b=>{ const [l0,ic]=TABS[b.dataset.tab], l=(LESSON&&LESSON.tabLabels&&LESSON.tabLabels[b.dataset.tab])||l0, got=LESSON&&STARS[LESSON.id]&&STARS[LESSON.id][b.dataset.tab];
  b.dataset.book=KEYTAB[b.dataset.tab]||''; b.innerHTML=ICON[ic]+`<span>${isAr()&&TABAR[l]||tr(l)}</span>`+(b.dataset.book?'<i class="kd"></i>':'')+(got?`<span class="st">${STAR(true)}</span>`:''); b.hidden=LESSON&&LESSON.tabs?!LESSON.tabs.includes(b.dataset.tab):['booklet','workbook'].includes(b.dataset.tab)?!hasBook(b.dataset.tab):b.dataset.tab==='grammar'||(b.dataset.tab==='quiz'&&SUBJECT&&SUBJECT.id==='arabic'&&!hasBook('quiz')); b.setAttribute('aria-selected',b.dataset.tab===tab); }); const tb=$('.tabs'); if(tb){ const nt=$$('.tab:not([hidden])').length; tb.classList.toggle('many',nt>3); tb.classList.toggle('many5',nt>4); const on=$('.tab[aria-selected="true"]',tb); if(on) tb.scrollTo({left:on.offsetLeft-tb.clientWidth/2+on.offsetWidth/2,behavior:'auto'}); } }   // optional "tabs": ["read","quiz"] in lesson.json shows only those tabs (Math: explanation + questions, or questions only)
// a default lesson shows Booklet / PTS only when it has that book (its pages in subject.json, or questions of that book)
function hasBook(k){ const m=SUBJECT&&LESSON&&SUBJECT.lessons.find(l=>l.id===LESSON.id); return !!(m&&m.pages&&[].concat(m.pages[k]||[]).length)||!!(qz.sets&&qz.file&&LESSON&&qz.file.includes('/'+(m&&m.folder)+'/')&&qz.all.some(q=>qSrcOf(q.set)===k)); }
function setRail(items){ rail.innerHTML=''; items.forEach(it=>{ const b=el('button','dash '+it.kind+(it.on?' on':'')+(it.icon==='restart'?' ln':''),`<span class="rb${it.kind==='tool'?' tgear':''}">${it.kind==='tool'?toolLabel(LESSON.tool):ICON[it.icon]}</span><span>${it.label}</span>`); b.addEventListener('click',it.click); rail.append(b); }); }
function switchTab(t,at){ setLook(t); if(typeof WP!=='undefined'&&WP.saved) wpClose(); stopVoice(); { const r=$('#lmeta .lm-r'); if(r) r.innerHTML=''; } hideHint(); $('#lesson').classList.remove('vtab','qtab','story','poem'); document.body.classList.remove('typing','kb'); tab=t; paintTabs(); lnavPaint(); carAt(0); (t==='booklet'||t==='workbook'||t==='read'&&isAL())?showQuiz(at):t==='grammar'?showGrammar():t==='read'?showRead():t==='words'&&LESSON.vocab?showWords():t==='quiz'&&typeof showQuiz==='function'?showQuiz(at):showGarage(); if(typeof bookTag==='function') bookTag(); pop('#stage > *',{scale:.85,y:10}); pop('#rail .dash',{x:30,y:0}); if(t==='read') readAuto(); }
$$('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

// default speed: always normal; a child's own choice per page wins
function pageDefaultSlow(){ return false; }
/* LESSON-TEMPLATE REGISTRY (like QM for questions; the list of names + required data is tools/check/lessons.json, docs/templates.md).
   One entry per lesson/page template: show = draws the page from data, story = true when pages swipe inside the story panel. A new template = a new entry + lessons.json + docs; a lesson only names it ("layout" for the lesson, "pageLayouts"[i] per page) and supplies data. */
const LT={
  letter:{show:()=>showLetter(),story:false}, math:{show:()=>showMathExplain(),story:false}, explain:{show:()=>showExplain(),story:false}, nahw:{show:()=>showNahw(),story:false},
  bubbles:{show:()=>showBubbles(),story:false}, point:{show:()=>showPoint(),story:false}, slide:{show:()=>showStory(),story:true},
  pictures:{show:()=>showPics(),story:false}, poem:{show:()=>showPoem(),story:false}, story:{show:()=>showStory(),story:true}, text:{show:()=>showStory(),story:true}
};
function showRead(){
  { const k=LESSON.id+':'+rd.page; rd.slow=k in rd.pick?rd.pick[k]:pageDefaultSlow(); }
  stage.innerHTML=''; rd.words=[]; rd.lineEls=[]; rd.spotEls=[]; rd.cur=-1; rd.curLine=-1; $('#lesson').classList.remove('story','poem');
  if((LESSON.type==='letter'&&typeof showLetter==='function')||(LESSON.type==='math'&&typeof showMathExplain==='function')) return LT[LESSON.type].show();
  const pl=(LESSON.pageLayouts||[])[rd.page-1];   // optional per page: a name from the LT registry (below)
  const m=LT[pl]||LT[LESSON.layout]; return (m?m.show:showStory)();   // stories and dialogs: picture as the background, words on a soft panel (below)
}
// EVERY page of a reading / nasheed lesson reads by itself (Ahmed 2026-11-13): opening the lesson, coming back to the Lesson tab, any new page (one slide or many).
// Only the pages that have their own player (letter chant / cards, math, explain, nahw) start their own sound. whenSound (core.js) waits for the first tap if the browser has not allowed sound yet.
const OWNPLAYER=()=>isAL()||LESSON.type==='letter'||LESSON.type==='math'||['explain','nahw'].includes(LESSON.layout);
function readAuto(){ if(!LESSON||!LESSON.audio||OWNPLAYER()) return; const id=LESSON.id, pg=rd.page, g=rd.autoGen=(rd.autoGen||0)+1;
  whenSound(()=>setTimeout(()=>{ if(!LESSON||LESSON.id!==id||tab!=='read'||rd.page!==pg||rd.autoGen!==g||rd.playing||player.run||$('#lesson').hidden||!$('.scene')) return;
    if(nPages()>1&&!LESSON.lines.some(l=>l.page===rd.page)) return; const [ps,pe]=pageSpan(); playFrom(ps,pe,true,true,true); },350)); }
// pages of one lesson: a swipe / drag left or right, the dots above the tabs, or a dot tap. A new page ALWAYS starts reading by itself (Marwa 2026-11-01).
const isStoryPage=p=>{ const m=LT[(LESSON.pageLayouts||[])[p-1]]||LT[LESSON.layout]||LT[LESSON.type]; return !m||m.story; };
function readGo(d,auto){ const np=nPages(), to=rd.page+d; if(to<1||to>np) return; if($('.scene.story:not(.point)')&&isStoryPage(to)) return storyGo(d,auto);
  if(!auto) stopVoice(); clearMarks(); rd.page=to; lnavPaint(); showRead(); carAt(pageSpan()[0]);
  if(LESSON.lines.some(l=>l.page===rd.page)){ const [ps,pe]=pageSpan(); playFrom(ps,pe,true,!!auto); } }   // a new page ALWAYS starts reading by itself (Marwa 2026-11-01, Ahmed 2026-11-13: even after a Stop); the child's own move reads that page only, the automatic run goes on to the next
function readPager(){}   // swipe itself = the shared pager in book.js

/* ---------- STORY / DIALOG lessons (the default Lesson tab) ----------
   The lesson picture is the BACKGROUND of the whole content area (under the side buttons too); the words sit on a soft light panel at the bottom.
   One picture for all pages = only the text slides; a picture per page = the text slides and the picture fades out / in.
   Opening the lesson starts the reading by itself and, when a page ends, goes to the next page and reads it (rd.auto). ANY touch of the sound
   (pause, restart, speed, a word or line, another page, another tab) stops the sound and the automatic run (stopAll clears rd.auto). */
// a lesson may give a second drawing of the same picture for TALL (portrait) screens: lesson.json "pictureTall" / "pagePicturesTall"
const tallScreen=()=>innerHeight>innerWidth;
// where the picture sits behind the story card (the text panel covers its bottom): lesson.json "picturePos" / "picturePosTall" = CSS background-position, e.g. "50% 100%" keeps the faces above the text
const storyPos=bg=>{ bg.style.backgroundPosition=(tallScreen()&&LESSON.picturePosTall)||LESSON.picturePos||''; };
const storyBg=p=>(tallScreen()&&((LESSON.pagePicturesTall&&LESSON.pagePicturesTall[p-1])||LESSON.pictureTall))||(LESSON.pagePictures&&LESSON.pagePictures[p-1])||LESSON.picture||LESSON.scene;
const cssUrl=u=>`url("${new URL(u,location.href).href}")`;
function storyText(){
  const np=nPages(), inn=el('div','in'), ul=el('ul','lines');
  if(LESSON.titleWords&&rd.page===1){ const tk=el('p','stitle'); LESSON.titleWords.forEach(([w,s,e])=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',ev=>{ ev.stopPropagation(); playFrom(Math.max(0,s-.04),e+.06); }); tk.append(sp,' '); }); inn.append(tk); }   // a title that is spoken in the recording stays (it lights up); the "Listen to the story" sentence is gone
  LESSON.lines.forEach((l,li)=>{
    if(np>1&&l.page!==rd.page) return;
    const row=el('li','line'), txt=el('span','txt'); if(l.color) txt.style.color=l.color;
    if(l.who){ const who=el('span','who',l.who+':'); who.style.color=(LESSON.speakers||{})[l.who]||OL; if(l.color) who.style.color=l.color; row.append(who); }
    l.words.forEach(([w,s,e,pop])=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e,pop}); sp.addEventListener('click',ev=>{ ev.stopPropagation(); playFrom(Math.max(0,s-.04),e+.06); }); txt.append(sp,' '); });
    if(l.act){ const ac=el('span','act',l.act), ic=actIcon(l.act); if(ic) ac.append(ic); txt.append(ac); }
    row.addEventListener('click',()=>playLine(li)); row.append(txt); ul.append(row); rd.lineEls[li]=row;
  });
  inn.append(ul); return inn;
}
// ONE text size for the whole lesson (Marwa 2026-11-05): the biggest size (CSS token) at which EVERY page of the lesson fits its panel; every page uses it
// plain story card (Marwa 2026-11-06): the text panel shows ONLY 3 lines (more room for the picture); the text slides up when the reading reaches the hidden lines (mark -> storyScroll)
function fitStory3(note,inn){ note.style.height=''; inn.style.fontSize=''; const full=note.clientHeight, cs=getComputedStyle(inn); if(!full) return;
  const pad=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom); let fs=parseFloat(cs.fontSize), h, pitch=()=>{ const tops=[...new Set($$('.w',inn).map(w=>Math.round(w.getBoundingClientRect().top)))].sort((a,b)=>a-b); const nx=tops.find(t=>t-tops[0]>.8*fs); return nx!=null?nx-tops[0]:1.65*fs; };
  const calc=()=>{ inn.style.fontSize=fs+'px'; h=3*pitch()+parseFloat(getComputedStyle(inn).paddingTop)-.1*fs; };   // the REAL distance between two lines (Arabic marks make a line taller than 1.65em)
  calc(); for(let i=0;i<60&&h>full&&fs>12;i++){ fs-=.5; calc(); }
  $$('.in',note).forEach(x=>x.style.fontSize=fs+'px'); { const body=[...inn.children].reduce((s,c)=>s+c.getBoundingClientRect().height,0)+parseFloat(getComputedStyle(inn).paddingTop)+.35*fs; note.style.height=Math.min(h,full,Math.max(body,1.4*fs))+'px'; }   // fewer than 3 lines = the panel is only as tall as its text
  const cw=rd.cur>=0&&rd.words[rd.cur]; if(cw) storyScroll(cw.el,true); else $$('.in',note).forEach(x=>{ x.scrollTop=0; }); }   // after a re-fit the text sits on a whole line again
function storyScroll(e,force){ const inn=e&&e.closest&&e.closest('.scene.story:not(.poem):not(.point) .in, .scene.point.slide .in'); if(!inn) return false;
  const r=e.getBoundingClientRect(), b=inn.getBoundingClientRect(), cs=getComputedStyle(inn), pt=parseFloat(cs.paddingTop), pb=parseFloat(cs.paddingBottom);
  if(force||r.bottom>b.bottom-pb+1||r.top<b.top+pt-1) inn.scrollTo({top:inn.scrollTop+(r.top-b.top)-pt,behavior:force||!anim?'auto':'smooth'}); return true; }
function fitStory(){ const note=$('.scene.story:not(.poem) .note'), inn=note&&$('.in:last-child',note); if(!inn||!note.clientHeight&&!note.style.height) return;
  if(note.closest('.scene.point.slide')){ inn.style.fontSize=''; note.style.maxHeight=''; let fs=parseFloat(getComputedStyle(inn).fontSize); for(let i=0;i<80&&inn.scrollHeight>note.clientHeight+1&&fs>11;i++){ fs-=.5; inn.style.fontSize=fs+'px'; } return; }   // slide card: the panel grows up to 48% of the picture, then the text shrinks to fit (long segments)
  if(note.closest('.scene.story:not(.poem):not(.point)')&&!matchMedia('(min-aspect-ratio:5/4)').matches) return fitStory3(note,inn);   // portrait: 3 lines; landscape: the text column fits the whole page
  if(note.style.height) note.style.height='';
  if(note.closest('.scene.story:not(.poem):not(.point)')){ $$('.in',note).forEach(x=>{ x.style.fontSize=''; }); const cw=rd.cur>=0&&rd.words[rd.cur]; if(cw) storyScroll(cw.el,true); else $$('.in',note).forEach(x=>{ x.scrollTop=0; }); return; }   // landscape (Marwa 2026-11-08): BIG text in the right column, it scrolls and follows the read word (same as portrait), nothing is shrunk to fit a whole page
  const key=LESSON.id+':'+note.clientWidth+'x'+note.clientHeight;
  if(fitStory.key!==key){ inn.style.fontSize=''; let fs=parseFloat(getComputedStyle(inn).fontSize); const sv=[rd.page,rd.words,rd.lineEls], np=nPages();
    for(let p=1;p<=np;p++){ if(np>1&&!LESSON.lines.some(l=>l.page===p)) continue; rd.page=p; rd.words=[]; rd.lineEls=[];
      const t=storyText(); t.style.visibility='hidden'; t.style.fontSize=fs+'px'; note.append(t);
      for(let i=0;i<60&&t.scrollHeight>t.clientHeight+1&&fs>12;i++){ fs-=.5; t.style.fontSize=fs+'px'; } t.remove(); }
    [rd.page,rd.words,rd.lineEls]=sv; fitStory.key=key; fitStory.fs=fs; }
  $$('.in',note).forEach(x=>x.style.fontSize=fitStory.fs+'px'); }
function showStory(){
  $('#lesson').classList.add('story');
  const scene=el('div','scene story'), bg=el('div','sbg'), note=el('div','note');
  scene.setAttribute('role','img'); scene.setAttribute('aria-label',LESSON.sceneAlt||'');
  bg.style.backgroundImage=cssUrl(storyBg(rd.page)); bg.dataset.u=storyBg(rd.page); storyPos(bg);
  note.append(storyText()); scene.append(bg,note); if(nPages()>1) scene.append(el('span','sbadge',num(rd.page))); stage.append(scene);   // the page number badge of the story card
  const pre=new Set([LESSON.pictureTall,...(LESSON.pagePicturesTall||[])].filter(Boolean)); for(let p=1;p<=nPages();p++) pre.add(storyBg(p)); preloadImgs([...pre]);
  fitStory(); fitTitle();
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
/* "point" page (a picture the words point at, RULES.md "Pointing page"): the WHOLE picture sits on top, uncropped; the words below it.
   While a sentence is read, a circle is drawn on the thing it talks about. Data: lesson.json "pageLayouts":[..,"point",..], the picture = LESSON.pagePictures[page-1] || picture || scene,
   and per line (optional) "mark": {x,y,w,h} or a list of them = centre and size in % of the picture (h left out = a round circle of width w). A line with no mark draws no circle. */
function pointFigure(f){
  const w=el('div','pfx'); if(f.formula){ const r=el('div','pfx-f'); f.formula.forEach(x=>{ const b=el('span',x.img?'pfx-p pfx-i':x.id?'pfx-p':'pfx-o',x.img?'':x.t); if(x.img){ const im=el('img'); im.src=x.img; im.alt=''; im.draggable=false; b.append(im); } if(x.id) b.dataset.id=x.id; r.append(b); }); w.append(r); }
  if(f.word){ const r=el('div','pfx-w'); glyphs(f.word).forEach((g,i)=>{ const b=el('span','pfx-g',g); b.dataset.id='g'+i; r.append(b); }); w.append(r); }
  return w; }
function showPoint(){
  $('#lesson').classList.add('story');
  const scene=el('div','scene story point'+(((LESSON.pageLayouts||[])[rd.page-1]==='slide')?' slide':'')), fig=el('div','pfig'), box=el('div','pbox'), img=el('img'), note=el('div','note'), u=storyBg(rd.page);
  scene.setAttribute('role','img'); scene.setAttribute('aria-label',LESSON.sceneAlt||'');
  img.alt=''; img.draggable=false; img.src=new URL(u,location.href).href;
  const ar=()=>{ if(img.naturalWidth) box.style.setProperty('--ar',img.naturalWidth+'/'+img.naturalHeight); }; img.addEventListener('load',ar); ar();
  if(LESSON.figure){ box.classList.add('figbox'); box.style.removeProperty('--ar'); box.append(pointFigure(LESSON.figure)); } else box.append(img);   // figure = built from text (no picture): {formula:[{t,id?}], word}; its letters have ids g0,g1.. and pop while read
  if(scene.classList.contains('slide')){ const card=el('div','scard'); card.style.setProperty('--ar',box.style.getPropertyValue('--ar')||'1.4'); img.addEventListener('load',()=>card.style.setProperty('--ar',img.naturalWidth+'/'+img.naturalHeight)); card.append(box,note,el('span','sbadge',num(rd.page))); fig.append(card); note.append(storyText()); scene.append(fig); stage.append(scene); note.style.visibility='hidden'; const fit=(force)=>requestAnimationFrame(()=>{ fitSlideNote(note); if(force===true||img.complete) note.style.visibility=''; }); fit(); img.addEventListener('load',fit); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fit); setTimeout(()=>fit(true),700); }   // the text shows ONCE, only after the picture is in and the size fitted (no flash of text that then re-sizes)   // slide = the book's card: picture in its frame, the sentence on a light panel over its bottom edge
  else { fig.append(box);
  note.append(storyText()); scene.append(fig,note); stage.append(scene); }
  LESSON.lines.forEach((l,li)=>{ if(!l.mark||(LESSON.pages>1&&l.page!==rd.page)) return;
    const g=el('div','pmg'); [].concat(l.mark).forEach(m=>{ const c=el('i','pmk'); c.style.cssText=`left:${m.x}%;top:${m.y}%;width:${m.w}%;`+(m.h?`height:${m.h}%;aspect-ratio:auto`:''); g.append(c); });
    box.append(g); rd.spotEls[li]=g; });
  fitStory(); fitTitle();
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
/* NASHEED page (layout "poem", RULES.md "Nasheed page"): the book page is the background (poem and QR box already removed from the picture), the poem is LIVE text
   placed where the book prints it. Data: lesson.json "layout":"poem", "poem":{ "ar":[w,h] (only the page's width:height RATIO), "bg":colour round the page, "size":font size in % of the page width,
   "base":baseline shift in em, "lines":[ {"y": baseline in % of the page height, "parts":[ {"r":right edge in % of the page width,"l":left edge in %,"n":words} ... ] } ]  (ALL relative: no pixel in lesson data) } and "lines"[i].words as in any lesson
   (a word may hold ONE or more "ـ" = where the book stretches it). The stretch is re-built here so every half-line is exactly as wide as in the book. */
function showPoem(){
  const P=LESSON.poem, [W,H]=P.ar, scene=el('div','scene story poem'), pg=el('div','pg');
  $('#lesson').classList.add('story','poem');
  scene.setAttribute('role','img'); scene.setAttribute('aria-label',LESSON.sceneAlt||'');
  scene.style.setProperty('--poem-bg',P.bg||'#e5f3f6'); pg.style.setProperty('--ar',W+'/'+H); pg.style.setProperty('--arn',W/H);
  pg.style.setProperty('--fs',P.size||5); pg.style.setProperty('--base',(P.base==null?.62:P.base)+'em'); pg.style.backgroundImage=cssUrl(storyBg(1));
  LESSON.lines.forEach((l,li)=>{
    const row=el('div','pline'), cfg=P.lines[li]; let wi=0;
    row.style.top=cfg.y+'%'; row.addEventListener('click',()=>playLine(li)); rd.lineEls[li]=row;
    cfg.parts.forEach(pt=>{
      const h=el('span','ph'); h.style.right=(100-pt.r)+'%'; h.dataset.tw=(pt.r-pt.l).toFixed(3);
      l.words.slice(wi,wi+pt.n).forEach(([w,s,e,pop],k)=>{ const sp=el('span','w'); sp.dataset.t=w; sp.textContent=w; rd.words.push({el:sp,s,e,pop});
        sp.addEventListener('click',ev=>{ ev.stopPropagation(); playFrom(Math.max(0,s-.04),e+.06); }); if(k) h.append(' '); h.append(sp); });
      wi+=pt.n; row.append(h);
    });
    pg.append(row);
  });
  scene.append(pg); stage.append(scene);
  fitPoem(); fitTitle();
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
// the stretch ("ـ") of each half-line: as many as make it exactly as wide as the book's (binary search on the total, spread over the stretched words by their book weights)
function fitPoem(){
  const pg=$('.scene.poem .pg'); if(!pg) return; const full=pg.getBoundingClientRect().width; if(!full) return;
  $$('.ph',pg).forEach(h=>{
    const ws=$$('.w',h).map(w=>({w,p:w.dataset.t.split(/(ـ+)/)})), runs=[]; ws.forEach(x=>x.p.forEach((t,i)=>{ if(i%2) runs.push({x,i,wt:t.length}); }));
    h.style.width=''; if(!runs.length) return;
    const target=parseFloat(h.dataset.tw)/100*full, tot=runs.reduce((a,r)=>a+r.wt,0);
    const set=T=>{ runs.forEach(r=>{ r.x.p[r.i]='ـ'.repeat(Math.max(1,Math.round(T*r.wt/tot))); }); ws.forEach(x=>{ x.w.textContent=x.p.join(''); }); return h.getBoundingClientRect().width; };
    let lo=runs.length, hi=300; while(lo<hi){ const m=(lo+hi+1)>>1; if(set(m)<=target) lo=m; else hi=m-1; } set(lo); h.style.width=h.dataset.tw+'%';   // the last few pixels go into the gaps between the words
  });
}
// d = +1 next / -1 previous. auto = the run that goes by itself (the sound just ended): it reads the new page too
function storyGo(d,auto){
  const to=rd.page+d; if(to<1||to>nPages()) return;
  const scene=$('.scene.story'); if(!scene) return;
  if(!auto) stopVoice();   // the child's own move: sound off, no automatic run
  clearMarks(); rd.page=to; rd.words=[]; rd.lineEls=[]; rd.spotEls=[]; rd.cur=-1; rd.curLine=-1;
  { const k=LESSON.id+':'+rd.page; rd.slow=k in rd.pick?rd.pick[k]:pageDefaultSlow(); }
  lnavPaint(); carAt(pageSpan()[0]); if(typeof bookTag==='function') bookTag();
  { const bd=$('.sbadge',scene); if(bd) bd.textContent=num(rd.page); }
  const note=$('.note',scene), old=$('.in',note), nin=storyText(), bg=$('.sbg',scene), u=storyBg(rd.page);
  note.append(nin); fitStory();
  if(anim){
    G.killTweensOf([old,nin]);
    G.fromTo(nin,{x:d*60,opacity:0},{x:0,opacity:1,duration:.32,ease:'power2.out',clearProps:'transform,opacity'});
    if(old) G.to(old,{x:-d*60,opacity:0,duration:.28,ease:'power2.in',onComplete:()=>old.remove()});
  } else if(old) old.remove();
  if(bg.dataset.u!==u){   // another picture: fade the old one out, the new one in
    bg.dataset.u=u;
    if(anim){ G.killTweensOf(bg); G.timeline().to(bg,{opacity:0,duration:.22,ease:'power1.in'}).call(()=>{ bg.style.backgroundImage=cssUrl(u); }).to(bg,{opacity:1,duration:.3,ease:'power1.out',clearProps:'opacity'}); }
    else bg.style.backgroundImage=cssUrl(u);
  }
  readRail();
  if(LESSON.lines.some(l=>l.page===rd.page)){ const [ps,pe]=pageSpan(); playFrom(ps,pe,true,!!auto); }   // same rule: every new page reads by itself
}
// swipe / drag left or right = ONE shared pager in book.js (whole page area); no per-screen swipe code
// the unit / lesson / name line is ONE line always: the letters shrink until it fits
function fitTitle(){ const h=$('#lessonTitle'), box=h&&h.parentElement; if(!h||!box||!box.offsetWidth) return; h.style.fontSize=''; let fs=parseFloat(getComputedStyle(h).fontSize);
  for(let i=0;i<40&&h.scrollWidth>box.clientWidth+1&&fs>7;i++){ fs-=.5; h.style.fontSize=fs+'px'; } }
addEventListener('resize',()=>{ clearTimeout(fitTitle.t); fitTitle.t=setTimeout(()=>{ fitTitle(); if($('.scene.story')) fitStory(); const bg=$('.scene.story .sbg'); if(bg&&LESSON&&bg.dataset.u!==storyBg(rd.page)){ bg.dataset.u=storyBg(rd.page); bg.style.backgroundImage=cssUrl(bg.dataset.u); } if(bg&&LESSON) storyPos(bg); },150); });   // turned the tablet: the tall / wide drawing
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ fitTitle(); fitStory(); if(typeof fitPoem==='function') fitPoem(); });
// "layout": "pictures" (Lesson 2): no text card; each line is a picture ("pic") spread over the stage at "pos" [x, y] % (its centre),
// its word written under it. The word being read is marked as usual and its picture pops up a little; tapping the word (or the picture) reads it.
function showPics(){
  const scene=el('div','scene pics'+(LESSON.pkWrap?' wrap':'')), area=el('div','pkarea'), np=nPages();
  scene.append(el('p','task',STAR(true)+((LESSON.pageTasks&&LESSON.pageTasks[rd.page-1])||LESSON.task)), area);
  // ONE even layout for every word-reading page (Marwa 2026-11-01): the pictures are spread in equal cells (columns x rows chosen from how many there are),
  // never placed by hand per lesson, so no big empty parts next to crowded ones. P = tall screen, L = wide screen.
  // a page with sentences under the pictures ("more" lines): on a tall screen ONE column, each row = picture | its sentences (cells were too narrow, text fell on the next picture)
  const sents=LESSON.lines.some(l=>l.more&&(np<=1||l.page===rd.page)); if(sents) area.classList.add('sents');
  const cnt=LESSON.lines.filter(l=>!l.more&&(np<=1||l.page===rd.page)).length||1, cP=cnt<=2||sents?1:2, cL=cnt<=3?cnt:4;
  area.style.cssText=`--pcP:${cP};--prP:${Math.ceil(cnt/cP)};--pcL:${cL};--prL:${Math.ceil(cnt/cL)}`;
  LESSON.lines.forEach((l,li)=>{
    if(np>1&&l.page!==rd.page) return;
    // tall pictures (the teacher) are made a bit taller, so all look about the same size
    if(l.more){ const prev=area.lastElementChild, row=el('span','txt'); l.words.forEach(([w,s,e],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); row.append(sp); if(k<l.words.length-1) row.append(' '); });
      row.addEventListener('click',ev=>{ if(ev.target===row) playLine(li); }); prev.append(row); prev.classList.add('sent'); rd.lineEls[li]=row; return; }   // "more": true = another sentence under the previous picture
    const it=el('div','pk'), pic=el('button','pkpic',`<img src="${l.pic}" alt="">`), txt=el('span','txt');
    // (no hand-placed position any more: lesson.json "pos"/"posP" are ignored, the cells decide)
    if(l.mw) it.style.setProperty('--mw',l.mw+'cqw');   // optional per line: "k" = size factor, "mw" = widest it may be (% of the stage)
    pic.setAttribute('aria-label','Listen: '+l.words.map(w=>w[0]).join(' ')); pic.addEventListener('click',()=>playLine(li));
    l.words.forEach(([w,s,e],k)=>{ const sp=el('span','w',w); rd.words.push({el:sp,s,e}); sp.addEventListener('click',()=>playFrom(Math.max(0,s-.04),e+.06)); txt.append(sp); if(k<l.words.length-1) txt.append(' '); });
    it.append(pic,txt); area.append(it); rd.lineEls[li]=it;
  });
  readPager(scene);
  stage.append(scene); fitPk(); $$('img',area).forEach(im=>{ if(!im.complete) im.addEventListener('load',()=>setTimeout(fitPk,30),{once:true}); }); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitPk); setTimeout(fitPk,700);   // again once the word pens are on the words (they make words a bit wider)
  readRail(); if(typeof bookTag==='function') bookTag(); showHint($('#rail .dash.go .rb'),LESSON.hints&&LESSON.hints.read,1400,'read');
}
/* every cell keeps its picture AND its sentences inside it (Marwa 2026-11-04, Shapes and Colors page 3 was all on top of each other): the text of the page
   shrinks together (one size for the whole page) until no cell spills over. Any screen, any lesson; no per-lesson sizes. */
function fitPk(){ requestAnimationFrame(()=>{ const ar=$('.scene.pics .pkarea'); if(!ar) return; const ts=$$('.pk .txt',ar), pks=$$('.pk',ar); if(!ts.length) return;
  ts.forEach(t=>t.style.fontSize=''); let fs=parseFloat(getComputedStyle(ts[0]).fontSize);
  const over=()=>pks.some(p=>p.scrollHeight>p.clientHeight+1||[...p.children].some(c=>c.scrollWidth>p.clientWidth+1));
  if(!over()) return; let lo=8, hi=fs; const set=v=>ts.forEach(t=>t.style.fontSize=v+'px');
  for(let k=0;k<12;k++){ const m=(lo+hi)/2; set(m); if(over()) hi=m; else lo=m; } set(Math.floor(lo)); }); }   // the biggest size that fits
addEventListener('resize',()=>{ clearTimeout(fitPk.t); fitPk.t=setTimeout(fitPk,160); });
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
/* story pages: the text panel starts BELOW the whole button column (RULES.md, story page). --rail-h = height of the rail */
function railH(){ const r=$('#rail'),l=$('#lesson'); if(r&&l) l.style.setProperty('--rail-h',(((c=>c?c.offsetTop+c.offsetHeight:0)(r.lastElementChild))||0)+'px'); if($('.scene.story .in')) fitStory(); }   // the panel's room changed: fit the text again
addEventListener('resize',()=>setTimeout(railH,60));
function readRail(){ setTimeout(railH,0); 
  if(tab!=='read') return; const [ps,pe]=pageSpan(), res=!player.run&&player.pos>ps+.2, part=()=>rd.stopAt!=null&&!rd.full;
  const on=rd.playing||player.run;   // ONE button: Read while it is quiet, Stop while it reads; a tap toggles
  setRail([
    on?{kind:'stop',icon:'stop',label:tr('Stop'),click:()=>{ if(part()){ stopAll(); clearMarks(); } else pausePlay(); rd.halted=true; readRail(); }}
      :{kind:'go',icon:'play',label:tr(res?'Continue':'Read'),click:()=>playFrom(res?player.pos:ps,pe,true,rd.page<nPages())},
    {kind:'again',icon:'restart',label:tr('Restart'),click:()=>playFrom(ps,pe,true,rd.page<nPages())},
    {kind:'speed',icon:rd.slow?'slow':'fast',label:tr(rd.slow?'Slow':'Normal'),click:()=>{ const was=player.run&&!part(), t=now(); if(was){ halt(); player.run=false; } rd.slow=!rd.slow; rd.pick[LESSON.id+':'+rd.page]=rd.slow; if(was) playFrom(t,pe,true); else readRail(); }}
  ]);
}

function showGarage(){
  stage.innerHTML='';
  const g=el('div','garage',`<div><span class="car"></span><p class="outline">${tr('Coming soon!')}</p><span>${COURSE.hints.garage}</span></div>`);
  putCar(g.querySelector('.car'),'sad'); stage.append(g); setRail([]);
}

// the tab bar is a slider: a finger scrolls it, the mouse drags it
(function(){ const tb=$('.tabs'); let dn=null;
  tb.addEventListener('pointerdown',e=>{ if(e.pointerType==='mouse') dn={x:e.clientX,l:tb.scrollLeft,m:false}; });
  addEventListener('pointermove',e=>{ if(dn){ const dx=e.clientX-dn.x; if(Math.abs(dx)>5) dn.m=true; if(dn.m) tb.scrollLeft=dn.l-dx; } });
  addEventListener('pointerup',()=>{ if(dn&&dn.m) tb.addEventListener('click',e=>{ e.stopPropagation(); e.preventDefault(); },{capture:true,once:true}); dn=null; });
})();

// a new word of the lesson (its Vocabulary list) inside the reading text gets its own colour
function markNewWords(){
  if(!LESSON||!LESSON.vocab) return; const set=new Set(LESSON.vocab.map(v=>String(v.word).toLowerCase().replace(/[^\p{L}\p{N}' ]/gu,'').trim()).filter(Boolean));
  $$('#stage .w').forEach(w=>{ const t=w.textContent.toLowerCase().replace(/[^\p{L}\p{N}']/gu,''); w.classList.toggle('nw',!!t&&set.has(t)); });
}
{ const _sr=showRead; showRead=function(){ const r=_sr.apply(this,arguments); try{ markNewWords(); }catch(e){} return r; }; }

function fitSlideNote(note){ if(!note.isConnected) return; const inn=$('.in',note)||note, card=note.closest('.scard'); if(!card) return;
  // slide card = the same as the plain story card (Marwa 2026-11-08): ONLY 3 lines show, in the BIG story size; the text slides up when the reading reaches the hidden lines (storyScroll)
  const sp=(k,v)=>note.style.setProperty(k,v,'important'); inn.style.fontSize=''; sp('height','auto'); sp('max-height','none'); sp('min-height','0'); inn.scrollTop=0;
  const cw=card.clientWidth; if(!cw) return; const pbx=$('.pbox',card), fg=card.closest('.pfig'), port=!matchMedia('(min-aspect-ratio:5/4)').matches, maxH=port&&pbx&&fg?Math.max(60,fg.clientHeight-pbx.offsetHeight-12):card.clientHeight*.5; let fs=cw*.074, h=0;   // portrait: the room UNDER the picture; landscape: half of the card
  const calc=()=>{ inn.style.fontSize=fs+'px'; inn.style.height='auto'; inn.style.overflow='visible'; inn.style.display='block'; inn.style.paddingTop=inn.style.paddingBottom='.3em'; const full=inn.scrollHeight, top=inn.getBoundingClientRect().top;
    const tops=[...new Set($$('.w',inn).map(w=>Math.round(w.getBoundingClientRect().top)))].sort((a,b)=>a-b); h=tops.length>3?tops[3]-top-.12*fs:full; };   // the panel ends right before the 4th line starts (paragraph gaps included)
  calc(); for(let i=0;i<60&&h>maxH&&fs>14;i++){ fs-=.5; calc(); }
  inn.style.overflow='hidden'; inn.style.height='100%'; sp('height',h+'px'); note.style.alignItems='stretch';
  const w=rd.cur>=0&&rd.words[rd.cur]; if(w) storyScroll(w.el,true);
}   // a long page text shows 3 lines at a time (slide lessons)
addEventListener('resize',()=>{ clearTimeout(fitSlideNote.t); fitSlideNote.t=setTimeout(()=>$$('.scene.point.slide .note').forEach(fitSlideNote),160); });
;
/* ===== js/wordslots.js ===== */
/* ===== WORD SLOTS: ONE way to show and write a word, in every subject and every place (Marwa 2026-11-04, RULES.md "Word slots") =====
   Every place builds the word with wsFill / wsWord below and only gives the word (data): Words tab (.vword), missing letter "type" / "letter" (.qword),
   word / sentence writing "write", "arrange", vowel, math words, explainer (qxWordEl -> .qxw).
   Look: css/wordslots.css (same white, same size, a thin light-white line only under letters to type, a wrong letter is never written).
   Here: the keyboard language follows the word, the word (and its lines) stays above the phone keyboard,
   and while typing the Help bulb stands right under the word; with little room (phone on its side) the header steps aside. */
const WS_IN=['vin','qin','qxin'];
/* THE word component. wsFill(box,text,o) fills box (any element) with the word, one <span class="lt"> per letter; wsWord(text,o) = a new <b class="ws">.
   o.hide: true (every letter) or [letter numbers] = still to write (see-through, keeps its place);  o.faint: hidden letters show faintly (copy the example);
   o.parts: [part texts] = the letters shown in groups in <span class="wsg" data-p> (syllables / chips; ' ' = a space);  o.ltr: left to right inside any subject.
   States the places switch on a letter: hid (to write) · cur (its turn: brighter line) · peek (Help) · got (written) · bad (wrong: shakes, never written).
   The look is ONLY in css/wordslots.css; a place never styles .lt itself. */
const parts0=o=>!!(o&&o.parts&&o.parts.length);
function wsFill(box,text,o){ o=o||{}; text=String(text==null?'':text); box.classList.add('ws'); box.replaceChildren();
  const ar=/[\u0600-\u06FF]/.test(text); box.classList.toggle('ws-ar',ar); if(o.ltr) box.dir='ltr';
  const gs=glyphs(text); box.style.setProperty('--n',gs.length); let k=0;
  const hid=i=>o.hide===true||(Array.isArray(o.hide)&&o.hide.includes(i));
  /* Arabic in iOS Safari: a word cut into one <span> per letter can come out as loose, unjoined letters. So (1) a word that only has to be SHOWN (no letter to write, no groups) is ONE text node
     in ONE span, and (2) when letters must be separate spans (write / groups / ring) each one carries a zero-width joiner on the sides where it joins its neighbour, so it keeps its joined shape. */
  const flat=parts0(o)?o.parts.flatMap(p=>p===' '?[' ']:glyphs(p)):gs;
  const NOJOIN='ءآأإاةدذرزوؤ', joinsNext=(g,n)=>{ if(!g||!n||g===' '||n===' ') return false; const b=arBase(g); return !!b&&!NOJOIN.includes(b[0])&&!!arBase(n); };
  if(ar&&!parts0(o)&&o.hide!==true&&!(Array.isArray(o.hide)&&o.hide.length)&&!o.letters){ const s=el('span','lt',text); s.dataset.i=0; box.append(s); return box; }
  const lt=g=>{ const i=k++; if(g===' ') return el('span','sp',' '); let t=g; if(ar){ const pv=flat[i-1], nx=flat[i+1]; if(joinsNext(pv,g)) t='\u200d'+t; if(joinsNext(g,nx)) t+='\u200d'; } const s=el('span','lt'+(hid(i)?' hid':'')+(o.faint?' fnt':''),t); s.dataset.i=i; return s; };
  const parts=o.parts&&o.parts.length?o.parts:null;   // the parts are shown as given (Arabic syllables may spell a shadda out)
  if(parts) parts.forEach((p,pi)=>{ if(p===' '){ box.append(lt(' ')); return; } const g=el('span','wsg'); g.dataset.p=pi; glyphs(p).forEach(c=>g.append(lt(c))); box.append(g); });
  else gs.forEach(g=>box.append(lt(g)));
  return box; }
const wsWord=(text,o)=>wsFill(el('b',''),text,o);
// the letter whose turn it is gets the brighter line (the first one still to write)
function wsCur(box){ if(!box) return null; $$('.lt.cur',box).forEach(x=>x.classList.remove('cur')); const n=$('.lt.hid',box); if(n) n.classList.add('cur'); return n; }
// a wrong letter: never written, the place shakes
function wsBad(n){ if(!n) return; n.classList.remove('bad'); void n.offsetWidth; n.classList.add('bad'); clearTimeout(n._wb); n._wb=setTimeout(()=>n.classList.remove('bad'),450); }
// Help: the letter shows see-through for a moment
function wsPeek(L,ms){ L=[].concat(L).filter(Boolean); L.forEach(x=>x.classList.add('peek')); setTimeout(()=>L.forEach(x=>x.classList.remove('peek')),ms||tokMs('--help-letter-ms',1500)); }
const wsLang=t=>/[؀-ۿ]/.test(String(t||''))?'ar':'en';
// the hidden typing box: English word -> English (Latin) keyboard, Arabic word -> Arabic, a number -> number pad
function wsInput(inp,text,lang){ lang=lang||wsLang(text); inp.lang=lang; inp.setAttribute('lang',lang); inp.dir=lang==='ar'?'rtl':'ltr';
  inp.setAttribute('inputmode',/^\d+$/.test(String(text||''))?'numeric':'text');
  ['autocorrect','autocapitalize','autocomplete'].forEach(a=>inp.setAttribute(a,'off')); inp.spellcheck=false; return inp; }
// the lowest fixed thing above the typing word: the question title, or the progress stars under it (the stars stay visible while typing)
function qTopEl(){ const h=$('.quiz .qhead'), d=$('.quiz .qdots'); return d&&d.offsetHeight&&!document.body.classList.contains('ws-tight')&&h&&d.getBoundingClientRect().bottom>h.getBoundingClientRect().bottom?d:h; }
function wsParts(){ const a=document.activeElement, id=a&&a.id; if(!WS_IN.includes(id)) return null;
  const st=$('#stage'), stTop=st?st.getBoundingClientRect().top:0;
  if(id==='vin'){ const w=$('.vword'); if(!w) return null; const tools=$('.vtools'); return {word:w,movers:[$('.vwrow'),$('.vinfo'),tools].filter(Boolean),bottom:tools||w,top:stTop+6,help:0}; }
  if(id==='qin'){ const qw=$('.qword'); if(!qw) return null; const hd=qTopEl(); const pic=$('.quiz .qplay'); return {word:$('b',qw)||qw,movers:[qw,pic].filter(Boolean),pic,bottom:qw,top:hd?hd.getBoundingClientRect().bottom+4:stTop,help:1,head:$('.quiz .qhead'),say:$('.qsay',qw)}; }
  const bx=a.closest('.qx'), line=a.closest('.qxline'); if(!bx||!line) return null; const hd=qTopEl();
  return {word:$('.qxw',line)||line,movers:[bx],bottom:line,top:hd?hd.getBoundingClientRect().bottom+4:stTop,help:1,head:$('.quiz .qhead'),say:$('.qxsay',bx)}; }
// how much of the screen the phone keyboard leaves: the visible top and bottom (page px). Inside a frame (preview) the phone does not tell the frame, so a touch screen guesses the keyboard.
function framedTouch(){ try{ return window.top!==window&&matchMedia('(pointer:coarse)').matches; }catch(e){ return matchMedia('(pointer:coarse)').matches; } }
let WS_GUESS=false;   // true while the room is only a guess (framed preview): then the keyboard never reports back, so nothing may react to scroll/resize events (that made the word jump up and down)
function wsRoom(){ WS_GUESS=false; const vv=window.visualViewport, H=document.documentElement.clientHeight||innerHeight; if(!vv) return null;   // the page height without the keyboard (js/core.js kbRoom)
  if(H-vv.height>120) return {top:vv.offsetTop,bottom:vv.offsetTop+vv.height};
  let framed=false; try{ framed=window.top!==window; }catch(e){ framed=true; }
  if(framed&&matchMedia('(pointer:coarse)').matches){ WS_GUESS=true; return {top:0,bottom:Math.round(H*(innerWidth>H?.42:.55))}; }
  return null; }
function wsKeep(){
  const prev=$$('.ws-mv'); prev.forEach(e=>{ e.style.translate=''; });   // measured from the natural place; the transition is off, so no visible jump while the phone keeps reporting scroll/resize
  const P0=wsParts(), R=P0&&wsRoom(), open=!!R, B=document.body;
  if(open&&!WS_GUESS&&typeof kbPin==='function') kbPin();   // the page never stays slid under the keyboard (js/core.js)
  B.classList.toggle('ws-typing',open);
  const rem=parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
  B.classList.toggle('ws-tight',open&&R.bottom-R.top<rem*22);   // little room (phone on its side): the title, lesson name and road step aside while typing
  wsHelp(null);
  prev.forEach(e=>e.classList.remove('ws-mv'));
  if(!open) return;
  let lift=wsLift(wsParts()||P0,R);
  if(lift.short&&!B.classList.contains('ws-tight')){ B.classList.add('ws-tight'); lift.undo(); lift=wsLift(wsParts()||P0,R); }   // still not enough room above the keyboard: the header steps aside too
  if(lift.P.help) wsHelp(lift.P,R);
}
// lift the word (and its lines) so all of it, and the Help bulb under it, stand above the keyboard; short = it still does not fit
function wsLift(P,R){
  const w=P.word.getBoundingClientRect(), pad=Math.max(10,w.height*.15);
  const hh=0;   // the Help bulb stands BESIDE the word (opposite the speaker), so it takes no height
  const top=Math.max(P.top,R.top+6);
  const over=Math.max(P.bottom.getBoundingClientRect().bottom,w.bottom+hh)+pad-R.bottom;
  let sh=over>0?Math.min(Math.max(0,w.top-top),over):0;
  if(over<=0&&w.top<top) sh=w.top-top;   // the phone scrolled the page: bring the word back down into sight
  if(P.pic){ const o2=P.pic.getBoundingClientRect().bottom+pad-R.bottom; if(o2>0) sh=Math.max(sh,Math.min(Math.max(0,w.top-top),o2)); }   // the picture under the word rises with it (as far as the room above allows) so more of it shows above the keyboard
  if(sh) P.movers.forEach(m=>{ m.style.translate='0 '+(-Math.round(sh))+'px'; m.classList.add('ws-mv'); });
  return {P,short:over-sh>1,undo:()=>P.movers.forEach(m=>{ m.style.translate=''; m.classList.remove('ws-mv'); })};
}
const wsHelpEls=()=>$$('#lmeta .qxhelp, #lmeta .qhelpb, .quiz>.qhelpb').filter(h=>!h.hidden&&getComputedStyle(h).display!=='none');
// while typing, the Help bulb stands right beside the word, on the side away from the Listen speaker (fixed: it never moves the layout)
function wsHelp(P,R){
  $$('.ws-side').forEach(h=>{ h.classList.remove('ws-side'); h.style.left=''; h.style.top=''; });
  if(!P) return;
  const r=P.word.getBoundingClientRect(), bot=R?R.bottom:innerHeight, topL=R?R.top:0, sr=P.say&&P.say.getBoundingClientRect();
  const sayRight=!!(sr&&sr.width&&(sr.left+sr.width/2>r.left+r.width/2));   // speaker right of the word -> bulb on its left, and the other way round
  wsHelpEls().forEach(h=>{ h.classList.add('ws-side'); const s=h.offsetWidth||28, g=Math.max(4,r.height*.08);
    const hasSay=!!(sr&&sr.width); let x, y=(hasSay?sr.top+sr.height/2:r.top+r.height/2)-s/2;   // 2026-11-11 (Ahmed): the bulb stands NEXT TO THE SPEAKER, on the far side of it from the word (all pages, questions too)
    if(hasSay) x=sayRight?sr.right+g:sr.left-s-g; else x=r.left-s-g;
    if(x<4||x+s>innerWidth-4) x=hasSay?(sayRight?sr.left-s-g:sr.right+g):(x<4?r.right+g:r.left-s-g);   // no room on that side: the other side of the speaker
    if(x<4||x+s>innerWidth-4){ x=sayRight?r.left:r.right-s; y=r.top-s-4; }   // the word fills the width: the bulb sits just above its corner, never over a letter
    x=Math.max(4,Math.min(innerWidth-s-4,x)); y=Math.max(topL+2,Math.min(bot-s-6,y));   // never under the keyboard
    h.style.left=Math.round(x)+'px'; h.style.top=Math.round(y)+'px'; });
}
if(window.visualViewport) ['resize','scroll'].forEach(e=>visualViewport.addEventListener(e,()=>{ if(!WS_GUESS) wsKeep(); }));
document.addEventListener('focusin',e=>{ if(e.target&&WS_IN.includes(e.target.id)) (framedTouch()?[60,400]:[50,300,650,1000]).forEach(t=>setTimeout(wsKeep,t)); });
document.addEventListener('focusout',e=>{ if(e.target&&WS_IN.includes(e.target.id)) setTimeout(wsKeep,60); });
addEventListener('resize',()=>{ if(!WS_GUESS) setTimeout(wsKeep,80); }); addEventListener('orientationchange',()=>setTimeout(wsKeep,400));
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
// load + decode a sound BEFORE it is needed (the first play of a file waits for the network otherwise: Ahmed 2026-11-09 "the sound lags on the first join")
async function warmFile(url){ try{ if(!url) return; await ensureCtx(); if(await libBuffer(url,player.ctx).catch(()=>null)) return;
  if(!vs.files[url]) vs.files[url]=fetch(url).then(r=>{ if(!r.ok) throw new Error('missing'); return r.arrayBuffer(); }).then(b=>decodeSnd(player.ctx,b)).catch(()=>{ delete vs.files[url]; return null; }); await vs.files[url]; }catch(_){} }
async function playClip([s,e]){ try{ await ensureAudio(); }catch(err){ return; } if(!player.bufs.n) return; return playBuf(player.bufs.n,Math.max(0,s-.03),e-s+.08); }   // single words: normal speed
const sayWord=v=>v.audio&&v.audio.word?playFile(v.audio.word):v.clip?playClip(v.clip):tts(v.word,isAr()?'ar':'en',.75);
// LETTER-WORDS component (letter lessons): each word has v.har (fatha|damma|kasra|sukoon). Beside the word sits the haraka boy (library ar-boy-<har>);
// saying the word first says the letter's name and the haraka's name ("ألف، فتحة"), then the word. Recordings: letter.nameAudio + data/arabic/shared/h-<har>.mp3.
const letterWords=()=>LESSON.type==='letter'&&LESSON.vocab.some(v=>v.har);
const sayHead=async v=>{ if(letterWords()&&v.har){ const vr=vs.run; if(LESSON.letter&&LESSON.letter.nameAudio) await playFile(LESSON.base+LESSON.letter.nameAudio); if(vr!==vs.run) return; await playFile(LESSON.base+'../shared/k-h-'+v.har+'.mp3'); if(vr!==vs.run) return; await nap(250); if(vr!==vs.run) return; } return sayWord(v); };
// the whole word said after its parts (her second take sounds natural there); falls back to the first take
const sayWordAgain=v=>v.audio&&v.audio.again?playFile(v.audio.again):sayWord(v);
const sayAr=v=>v.audio&&v.audio.ar?playFile(v.audio.ar):tts(v.ar,'ar',.85);
const sayPart=p=>p.silent?new Promise(r=>setTimeout(r,350)):p.audio?playFile(p.audio):p.say?tts(p.say,isAr()?'ar':'en',.7):new Promise(r=>setTimeout(r,300));

// the small speaker next to a text: just a blue line drawing, not a round button
const SAY_LN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const VHAR={fatha:'\u0640\u064E',damma:'\u0640\u064F',kasra:'\u0640\u0650',sukoon:'\u0640\u0652'};
function showWords(){
  vs.seen=new Set();   // the words taught in THIS visit: the stars screen comes only when the child has been through the WHOLE tab (earlier visits never make the first word the last)
  stage.innerHTML='';
  vs.i=Math.min(vs.i,LESSON.vocab.length-1);
  $('#lesson').classList.add('vtab'); $('#lesson').classList.toggle('vmode',vMode()); setRail([]); vLayout();
  const wrap=el('div','vocab'), pick=el('div','vpick');
  LESSON.vocab.forEach((v,i)=>{ const b=el('button','vthumb'+(i===vs.i?' on':''),`${vMode()?`<span class="vtw">${v.word}</span>`:`<img src="${v.img}" alt=""${/\.png$/i.test(v.img)?' class="cut"':''}>`}<b>${i+1}</b>${vDone().includes(v.word)?`<span class="vst">${STAR(true)}</span>`:''}`);
    if(v.har&&i&&LESSON.vocab[i-1].har!==v.har) b.classList.add('vgrp');   // letter lessons: words grouped by haraka (fatha, damma, kasra, sukoon)
    b.setAttribute('aria-label',`Word ${i+1}: ${v.word}`); b.addEventListener('click',()=>{ vs.i=i; vTeach(); }); pick.append(b); });
  wrap.innerHTML=`<div class="vwrow">${letterWords()?'<img class="vboy" alt="">':''}<div class="vword"></div><button class="vsay" aria-label="${isAr()?'اسمع الكلمة':tr('Listen')}">${SAY_LN}</button></div>
    <div class="vinfo"><div class="vstatus"></div><div class="vmeaning" dir="rtl"><span class="vm-t"></span><button class="vm-say" aria-label="Arabic meaning">${SAY_LN}</button></div></div>
    <div class="vtools"></div><div class="vimgwrap"><img class="vimg" alt=""></div>`;
  wrap.append(pick); stage.append(wrap); vPickFit();
  $('.vm-say').addEventListener('click',e=>{ e.stopPropagation(); const v=LESSON.vocab[vs.i]; $('.vmeaning').classList.add('lit'); sayAr(v).then(()=>$('.vmeaning')&&$('.vmeaning').classList.remove('lit')); });
  $('.vsay').addEventListener('click',e=>{ e.stopPropagation(); if(vMode()) return vMeanSay('all'); vStop(); if(vs.mode==='learn'){ vs.mode='idle'; vRail(); } sayHead(LESSON.vocab[vs.i]); });   // the small speaker beside the word (replaces the Listen / Stop buttons)
  vTools(); vRender(true); vRail(); vCar(false);
  if(vMode()){ $('.vword').addEventListener('click',()=>vMeanSay('word')); $('.vmeaning').addEventListener('click',()=>vMeanSay('rel')); }
  showHint(pick,LESSON.hints.vocabPick,900,'vocabPick');
  setTimeout(()=>{ if(tab==='words') vTeach(); },350);
}
function vRender(fill){
  const v=LESSON.vocab[vs.i], img=$('.vimg');
  if(!img._fit){ img._fit=1; img.addEventListener('load',vFitImg); }
  if(v.img&&img.getAttribute('src')!==v.img){ img.src=v.img; if(anim){ G.set(img,{opacity:0}); const go=()=>G.to(img,{opacity:1,duration:.3}); img.decode?img.decode().then(go,go):go(); } }
  const boy=$('.vboy'); if(boy){ boy.hidden=!v.har; if(v.har) boy.src=LESSON.base+'../../pics/ar-boy-'+v.har+'.png'; }
  img.alt=v.word; img.classList.toggle('cut',/\.png$/i.test(v.img||'')); if(vMode()&&v.rel) $('.vm-t').innerHTML=`<small>${v.rel.label}</small><span>${v.rel.text}</span>`; else $('.vm-t').textContent=v.ar||''; $('.vmeaning').hidden=!(v.ar||v.rel);   // library cut-outs are png
  $$('.vthumb').forEach((b,i)=>b.classList.toggle('on',i===vs.i));
  const pk=$('.vpick'), on=$('.vthumb.on'); if(pk&&on&&pk.scrollWidth>pk.clientWidth) pk.scrollTo({left:on.offsetLeft-pk.clientWidth/2+on.offsetWidth/2,behavior:'smooth'});   // keep the current word in view in the strip
  const w=$('.vword'); w.innerHTML=''; w.classList.remove('lit','writing','focus');
  w.style.fontSize='';
  wsFill(w,v.word,{hide:!fill,parts:v.parts.map(p=>p.t)});   // THE word component (js/wordslots.js): hidden letters keep their place
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
  const v=LESSON.vocab[vs.i]; vRender(true); vStatus(tr('Listen!'));   // the plural / meaning / opposite word stays WRITTEN under the word the whole time (Marwa 2026-11-06); it lights up while it is spoken
  try{
    await vSleep(500,run);
    for(let rep=0;rep<2;rep++){
      $('.vword').classList.add('lit'); await sayWord(v); if(run!==vs.run) return; $('.vword').classList.remove('lit'); await vSleep(700,run);
      const m=$('.vmeaning'); m.classList.remove('hid'); m.classList.add('lit');
      await sayRel(v); if(run!==vs.run) return; m.classList.remove('lit'); await vSleep(900,run);
    }
    vStatus(''); vs.mode='done'; vRail(); celebrate($('.vword'));
    if(vs.popup){ await vSleep(1200,run); if(tab!=='words') return; vs.mode='idle'; vRail(); const x=$('.wpclose'); if(x) x.click(); return; }   // the pen popup (one word seen from the lesson page): NO star, NO progress, NO stars screen - back to the lesson (Marwa 2026-11-06)
    const d=vDone(); if(!d.includes(v.word)){ d.push(v.word); try{ localStorage.setItem('zoom-vocab',JSON.stringify(VDONE)); }catch(e){} } (vs.seen||(vs.seen=new Set())).add(v.word);
    vCar(true); const th=$$('.vthumb')[vs.i]; if(th&&!$('.vst',th)) th.append(el('span','vst',STAR(true)));
    await vSleep(1200,run); if(tab!=='words') return;
    const left=LESSON.vocab.map((x,i)=>i).filter(i=>!vs.seen.has(LESSON.vocab[i].word));
    if(!left.length){ vs.mode='idle'; vRail(); award(LESSON.id,'words'); return; }
    vs.i=left.find(i=>i>vs.i) ?? left[0]; vMean();
  }catch(e){}
}
/* Arabic letters are separate inline spans; iOS Safari stops joining them when a span is animated (opacity/transform), so Arabic letters are never animated by GSAP (the colour states still change). */
const ltAnim=()=>anim&&!$('.vword')?.classList.contains('ws-ar');
async function vTeach(){
  if(vMode()) return vMean();
  vStop(); hideHint(); const ip=$('#vin'); if(ip) ip.blur();
  const run=++vs.run; vs.mode='learn'; vRail();
  const v=LESSON.vocab[vs.i];
  vRender(true); vStatus(tr('Listen!'));
  if(ltAnim()) G.from('.vword .lt',{opacity:0,stagger:.04,duration:.3});
  try{
    await vSleep(500,run);
    $('.vword').classList.add('lit'); await sayHead(v); if(run!==vs.run) return; $('.vword').classList.remove('lit'); await vSleep(800,run);
    const reps=LESSON.vocabRepeats||3;   // fixed order: word once, then (parts -> whole word) x3
    for(let rep=1;rep<=reps;rep++){
      vStatus(isAr()?`${tr('Read with me!')} ${num(rep)}/${num(reps)}`:`Read with me! ${rep}/${reps}`);
      if(ltAnim()) await new Promise(r=>G.to('.vword .lt',{opacity:0,duration:.2,onComplete:r}));
      if(run!==vs.run) return;
      vRender(false); await vSleep(350,run);
      for(let pi=0;pi<v.parts.length;pi++){
        const p=v.parts[pi]; if(p.t===' '){ await vSleep(350,run); continue; }
        const seg=$(`.vword .wsg[data-p="${pi}"]`), lts=$$('.lt',seg); seg.classList.add('on');
        const snd=sayPart(p);
        for(let k=0;k<lts.length;k++){ lts[k].classList.remove('hid'); if(ltAnim()) G.fromTo(lts[k],{scale:1.4},{scale:1,duration:.3,ease:'back.out(3)'}); await vSleep(260,run); }
        await snd; if(run!==vs.run) return;
        seg.classList.remove('on'); await vSleep(750,run);   // longer pause between parts than between letters
        if(p.blend){   // the sounds so far, joined: sh-a-k-e -> "shake"
          let k=pi; const grp=[]; while(k>=0 && v.parts[k].t!==' '){ const g=$(`.vword .wsg[data-p="${k}"]`); if(g) grp.push(g); k--; }
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
  wsInput(inp,v.word,isAr()?'ar':'en'); inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Type the word');
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
        if(isAr()?sameLetter(ch,want):ch.toLowerCase()===want.toLowerCase()){ const b=boxes[vs.pos]; b.classList.remove('hid','peek'); b.classList.add('got'); typed+=ch; blip(560+vs.pos*40,.05);
          if(ltAnim()) G.fromTo(b,{scale:1.3},{scale:1,duration:.35,ease:'back.out(3)'}); vs.pos++; }
        else { tone(170,'square',.06,.18); wsBad(boxes[vs.pos]); break; }   // never written, the place shakes
      }
    }
    inp.value=typed; cur();
    if(vs.pos>=vs.letters.length && run===vs.run) vWin(v);
  });
}
// Help: show the letter the child is on (faintly) and say the sound of its part
function vHelp(){
  if(vs.mode!=='write') return; const v=LESSON.vocab[vs.i], boxes=$$('.vword .lt'), i=vs.pos; if(i>=boxes.length) return;
  const b=boxes[i]; b.classList.remove('hid'); b.classList.add('peek'); if(ltAnim()) G.fromTo(b,{scale:1.3},{scale:1,duration:.4,ease:'back.out(3)'});
  const seg=b.closest('.wsg'); const p=v.parts[+seg.dataset.p]; seg.classList.add('on'); sayPart(p).then(()=>seg.classList.remove('on'));
  setTimeout(()=>{ if(b.classList.contains('peek')){ b.classList.add('hid'); b.classList.remove('peek'); } },tokMs('--help-letter-ms',1500));
  const inp=$('#vin'); if(inp) inp.focus({preventScroll:true});
}
// word written right: celebrate, say the word, then go straight on to the next word (no "Next" button)
async function vWin(v){
  vs.mode='done'; vRail(); const run=vs.run;
  vStatus(''); celebrate($('.vword'));   // the celebration is the praise: no "Good job" said or written
  if(vs.popup){ await sayWord(v); await new Promise(r=>setTimeout(r,700)); if(run!==vs.run||tab!=='words') return; vs.mode='idle'; vRail(); const x=$('.wpclose'); if(x) x.click(); return; }   // the pen popup: no star / progress, only the word, then back to the lesson
  const d=vDone(); if(!d.includes(v.word)){ d.push(v.word); try{ localStorage.setItem('zoom-vocab',JSON.stringify(VDONE)); }catch(e){} } (vs.seen||(vs.seen=new Set())).add(v.word);
  vCar(true);
  const th=$$('.vthumb')[vs.i]; if(th&&!$('.vst',th)) th.append(el('span','vst',STAR(true)));
  await new Promise(r=>setTimeout(r,500)); if(run!==vs.run) return;
  await sayWord(v); await new Promise(r=>setTimeout(r,700)); if(run!==vs.run||tab!=='words') return;
  if(vs.popup){ vs.mode='idle'; vRail(); const x=$('.wpclose'); if(x) x.click(); return; }   // popup: one word only, then back to the words page
  const left=LESSON.vocab.map((x,i)=>i).filter(i=>!vs.seen.has(LESSON.vocab[i].word));
  if(!left.length){ const ip=$('#vin'); if(ip) ip.blur(); vs.mode='idle'; vRail(); award(LESSON.id,'words'); return; }
  vs.i=left.find(i=>i>vs.i) ?? left[0]; vTeach();
}
// the 5 buttons are made once and never move; vRail only fades the ones that can't be used now
function vTools(){
  const tools=$('.vtools'); tools.innerHTML='';
  const items=[
    {k:'help',kind:'help',icon:'hint',label:isAr()?'ساعدني':tr('Help'),click:vHelp},
    {k:'teach',kind:'go',icon:'restart',label:isAr()?'علّمني':tr('Teach'),click:vTeach},
    {k:'write',kind:'speed',icon:'pencil',label:isAr()?'اكتب':tr('Write'),click:()=>{ if(vs.mode!=='write') vWrite(); else { const i=$('#vin'); i&&i.focus({preventScroll:true}); } }}
  ];
  (vMode()?items.filter(it=>!['help','write'].includes(it.k)):items).forEach(it=>{ const b=el('button','dash '+it.kind+(it.icon==='restart'?' ln':''),`<span class="rb">${ICON[it.icon]}</span><span>${it.label}</span>`); b.dataset.k=it.k;
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
  if(vs.popup){ L.style.setProperty('--pich',c(90,Math.min(h*.3,w*.55),260)+'px'); L.style.setProperty('--wfs',c(40,Math.min(w*.12,h*.1),84)+'px'); }   // word popup: one compact card (picture and word sized to the card, not to the page)
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
  const rem=parseFloat(getComputedStyle(document.documentElement).fontSize)||16, bw=wrap.clientWidth-.75*rem-2*b, bh=wrap.clientHeight-.625*rem-2*b;   /* same margins as the css max-width/max-height, so the box never gets clamped away from the picture's shape */ let h=Math.min(pich-2*b,bh), w=h*ar; if(w>bw){ w=bw; h=w/ar; }   // w x h = the PICTURE; the frame border is added round it
  im.style.width=Math.max(20,w)+2*b+'px'; im.style.height=Math.max(20,h)+2*b+'px'; }
// word buttons without pictures (vmode) in the landscape column: as many columns as it takes so every word shows whole (never cut at the bottom)
function vPickFit(){ const pk=$('.vpick'); if(!pk) return; pk.style.gridTemplateColumns=''; if(!$('#lesson').classList.contains('vmode')||!$('#lesson').classList.contains('v-land')) return;
  for(let c=2;c<=4&&pk.scrollHeight>pk.clientHeight+1;c++) pk.style.gridTemplateColumns=`repeat(${c},auto)`; }
addEventListener('resize',()=>{ if(tab==='words'){ vLayout(); fitWord(); vPickFit(); setTimeout(vFitImg,60); } });
// iPhone may slide the page under the keyboard: js/core.js (kbSync / kbPin) slides it back, for every screen

// the car in the header moves one step for every word learned
function vCar(drive){ const n=LESSON.vocab.length||1; if(drive){ carDrive(true); setTimeout(()=>carDrive(false),900); } carFrac(vDone().length/n); }

/* ---------- Pen on lesson words: a word that is also in this lesson's Words tab gets a small pen; it opens that ONE word in the usual
   learn-then-write page as a popup over the page the child is on, and closing it puts him back exactly there ---------- */
const WP={saved:null};
function wpClose(){
  const s=WP.saved; if(!s) return; WP.saved=null; (WP.back||[]).forEach(n=>n.remove()); WP.back=null; vStop(); vs.popup=0; vs.mode='idle';
  s.L.vocab=s.vocab; vs.i=s.i; tab=s.tab; const L=$('#lesson'); L.className=s.cls;
  stage.innerHTML=''; s.stage.forEach(n=>stage.append(n)); rail.innerHTML=''; s.rail.forEach(n=>rail.append(n)); trackCar.style.transform=s.car;
}
function wpOpen(v){
  if(WP.saved) return;
  const L=$('#lesson'); stopAll(); vStop(); hideHint();
  WP.saved={L:LESSON,vocab:LESSON.vocab,i:vs.i,tab,cls:L.className,stage:[...stage.childNodes],rail:[...rail.childNodes],car:trackCar.style.transform};
  // the page the child is on stays visible (still copy) under a dim; the word page is the popup card on top
  const back=stage.cloneNode(false); back.classList.add('wpback'); back.setAttribute('inert',''); back.setAttribute('aria-hidden','true'); WP.saved.stage.forEach(n=>back.append(n.cloneNode(true)));
  const dim=el('div','wpdim'); stage.after(back,dim); WP.back=[back,dim]; dim.addEventListener('click',wpClose);
  LESSON.vocab=[v]; vs.i=0; vs.popup=1; tab='words'; L.classList.add('wpop');
  showWords();
  const x=el('button','rb popx wpclose',ICON.close); x.setAttribute('aria-label','Close'); stage.append(x); x.addEventListener('click',wpClose);
}
const wpKey=t=>String(t||'').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/[^a-z'\u0621-\u064A]/g,'');
function penify(){
  if(!LESSON||!LESSON.vocab||!LESSON.vocab.length||tab==='words'||WP.saved) return;
  // one word -> its vocab entry; a phrase ("shake hands", "alarm clock") -> its words in order (the pen goes on its LAST word)
  const by={}, multi=[]; LESSON.vocab.forEach(v=>{ const ws=String(v.word).trim().split(/\s+/).map(wpKey).filter(Boolean); if(!ws.length) return;
    if(ws.length>1) multi.push({ws,v}); else { by[ws[0]]=v; if(/^\u0627\u0644/.test(ws[0])) by[ws[0].slice(2)]=by[ws[0].slice(2)]||v; } });
  const txt=sp=>sp.firstChild&&sp.firstChild.nodeType===3?sp.firstChild.data:sp.textContent;
  const find=k=>by[k]||(/^\u0627\u0644/.test(k)&&by[k.slice(2)])||null;   // Arabic: "\u0627\u0644\u0652\u0623\u064E\u0631\u0652\u0646\u064E\u0628\u064F" in a text is the vocab word "\u0623\u064E\u0631\u0652\u0646\u064E\u0628" (harakat already ignored)
  const pen=(sp,v)=>{ sp._pen=1; const b=el('span','wpn',ICON.pencil); b.setAttribute('role','button'); b.setAttribute('aria-label','Learn the word '+v.word);
    b.addEventListener('click',e=>{ e.stopPropagation(); e.preventDefault(); wpOpen(v); }); sp.classList.add('haspen'); sp.append(b); };
  const all=$$('#stage .w, #stage .alw').filter(sp=>!sp.closest('.wpback'));
  all.forEach((sp,i)=>{
    if(sp._pen!==undefined||sp.classList.contains('alans')) return; const k=wpKey(txt(sp));
    for(const m of multi){ const n=m.ws.length; if(i+1<n||m.ws[n-1]!==k) continue;   // this span ends the phrase: the n-1 spans before it (same line) must be its first words
      const prev=all.slice(i-n+1,i); if(prev.every((p,j)=>p.parentElement===sp.parentElement&&wpKey(txt(p))===m.ws[j])) return pen(sp,m.v); }
    const v=find(k); sp._pen=v?1:0; if(v) pen(sp,v);
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
   letter = one picture + the word with its first letter missing (_eacher), tap the beginning letter: "letters": ["t","i"], "answer": index
   link   = book "Match the picture with the correct word": all the words in one row (a column on tall phones when there are many) and all the pictures in the other row;
            the child drags a line from a word to its picture (or taps one, then the other). "layout":"cols" = words left, pictures right. One star per pair. item "full": audio (or a list played in order, built from the words' own recordings) of the joined phrase (e.g. أَنَا أَشْعُرُ), said when that pair is joined; rule: say the whole phrase, not only the first word.
   choice = book "circle the correct word": the picture, beside it the text (optional "ask" line, "lead", and "options":[a,b] with "answer": index); tap the right word, it gets a ring.
   Options on a set: "mark":"ring" (pick: the right picture gets a ring, not a tick), "silent":true (circle: do not say the word when it is circled).
   type   = one picture + the word with a letter missing ("missing": its index), the child types it on the keyboard: "answer": "t"
   The choices (tick/cross, letters, words, numbers) are ALWAYS under the question and its picture, in portrait and landscape (css/qlayout.css, Marwa 2026-11-04).
   A right answer: stamp + celebrate (no spoken praise), then on to the next question by itself. A wrong one: a shake, try again.
   Two books: each set says "book": "book" (the student's book, default) or "workbook"; two buttons on top switch between them. */
const qz={sets:null,all:[],list:[],src:'book',i:0,run:0,busy:false,file:null,show:0};
/* THE QUESTION MODELS (docs/RULES.md §6, Marwa 2026-10-20): ONE model per question type, the same in every subject.
   QM[type] = { sheet: 'word' (the word line + the play area) | 'board' (one board for the whole set) | 'box' (one part in the play area),
                draw(...)   how it is shown and solved,  help(q,w)  what the Help bulb lights (nothing = no bulb),
                bulb:0 = the model has its own help,  own:1 = reads itself (no speaker added, no auto-read),
                (choices are ALWAYS under the question, css/qlayout.css; no "side" any more),  fit:0 = no picture stacking }
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
  try{ const d=await get(file); qz.sets=currSets(d.sets); qz.file=file; }catch(e){ qz.sets=null; qz.file=null; return false; }
  qz.all=[]; qz.sets.forEach((s,si)=>{ s.taskSrc=Array.isArray(s.taskAudio)?s.taskAudio.map(R):R(s.taskAudio);   // taskAudio: one file, or a list played in order (prompt + letter name)
   
    if(s.type==='link') s.items.forEach(it=>{ it.answer=true; it.fullSrc=[].concat(it.full||[]).map(R); });
    if((QM[s.type]||{}).sheet==='board'){ s.centerSrc=R(s.centerAudio); s.items.forEach(it=>{ it.src=Array.isArray(it.audio)?it.audio.map(R):R(it.audio); it.src2=it.audio2?R(it.audio2):it.src; it.psrc=it.paudio?R(it.paudio):''; it.picSrc=R(it.pic); it.wpicSrc=it.wpic?R(it.wpic):''; if(it.dots&&typeof mDots==='function') it.picSrc=mDots(it.dots); });
      if(s.type==='circle'&&s.shuffle&&!s._sh){ s._sh=1; const ps=s.items.map(it=>it.pos); for(let t=0;t<20;t++){ ps.sort(()=>Math.random()-.5); if(ps.some((p,k)=>p!==s.items[k].pos)) break; } s.items.forEach((it,k)=>it.pos=ps[k]); }   // "shuffle": the options swap their places (the book order is not kept)
      if(s.type==='circle'&&s.center&&!s.centerAt&&s.items.length>=7&&s.items.every(it=>!it.pos)){ const T=s.items.length+1, rows=Math.ceil(T/3), mr=Math.floor(rows/2), mid=mr*3+1; let cell=0; s.items.forEach(it=>{ if(cell===mid) cell++; it.pos=[(cell%3+.5)*100/3,(Math.floor(cell/3)+.5)*100/rows]; cell++; }); s._cAt=[50,(mr+.5)*100/rows]; }   // a letter in the middle of 7+ pictures with no "pos": the letter takes the middle cell of the grid, the pictures the other cells (never on the letter)
      if(s.type==='circle') s.items.forEach((it,k)=>{ if(!it.pos){ const n=s.items.length, cols=3, rows=Math.ceil(n/cols), r=Math.floor(k/cols), c=k%cols, inRow=Math.min(cols,n-r*cols);
        it.pos=[(c+.5+(cols-inRow)/2)*100/cols,(r+.5)*100/rows]; } });   // no "pos": spread them in rows of 3
      s.items.filter(it=>it.answer).forEach((it,k)=>qz.all.push({set:s,si,k,word:s.center||''})); return; }
    if(s.type==='sound'){ qz.all.push({set:s,si,k:0,items:s.items}); return; }   // "sound": all the pictures of the exercise on ONE page
    if(s.type==='qa'&&s.together){ qz.all.push({set:s,si,k:0,together:1,items:s.items.map(it=>({...it,audio:R(it.audio),ansAudio:it.ansAudio,pic:R(it.pic)}))}); return; }   // "together": all the question+answer pairs on one page
    s.items.forEach((it,k)=>{
    const q={...it,set:s,si,k,audio:R(it.audio)}; if(it.pics) q.pics=it.pics.map(R); if(it.picsTall) q.picsTall=it.picsTall.map(R); if(it.pic) q.pic=R(it.pic); qz.all.push(q); }); });
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
  wrap.innerHTML=`<div class="qhead"><span class="qex"></span><span class="qtask"></span><button class="qsay qtsay" aria-label="Hear the question">${typeof SAY_LN==="string"?SAY_LN:ICON.sound}</button>${LESSON.tool?`<button class="qtool tgear" aria-label="${toolName(LESSON.tool)}">${toolLabel(LESSON.tool)}</button>`:''}</div>
    <div class="qdots"></div>
    <div class="qword" dir="ltr"><b></b><button class="qsay" aria-label="Listen again">${typeof SAY_LN==="string"?SAY_LN:ICON.sound}</button></div>
    <div class="qplay"></div><div class="qans"></div>`;
  stage.append(wrap);
  { const hb=el('button','qhelpb',ICON.hint); hb.hidden=true; hb.setAttribute('aria-label',isAr()?'ساعدني':tr('Help')); $('#lmeta .lm-r').replaceChildren(hb); hb.onclick=()=>qHelp(); }   // the Help bulb stands at the right of the row above the tabs
  $('.qword .qsay',wrap).addEventListener('click',()=>qSay());
  $('.qtsay',wrap).addEventListener('click',()=>qTask()); $('.qtask',wrap).addEventListener('click',()=>qTask());   // the header is read once by itself; no speaker icon (CSS hides .qtsay), a tap on the line reads it again
  $('.qword',wrap).addEventListener('click',e=>{ if(wrap.dataset.type==='type'&&!e.target.closest('.qsay')) qFocus(); });
  qStart(start!=null?start:0);
}
// the questions of one book (Book or Workbook)
function qPick(src){ qz.src=src; qz.list=qz.all.filter(q=>qSrcOf(q.set)===src); }
function qStart(i){ const w=$('.quiz'); if(!w) return;
  $('.qdots',w).innerHTML=qz.list.map((q,k)=>`${k&&qGrp(q.set)!==qGrp(qz.list[k-1].set)?'<span class="qsep"></span>':''}<i data-i="${k}">${STAR(false)}</i>`).join('');
  $('.qdots',w).style.setProperty('--n',qz.list.length+$$('.qsep',w).length*2);
  $('.qdots',w).onclick=e=>{ const d=e.target.closest('i[data-i]'); if(!d) return; hideHint(); qz.busy=false; qGo(+d.dataset.i); };   // each star opens its own question
  qLayout(); qGo(Math.min(i,qz.list.length-1)); }
// the arrows: to the start of the next / previous exercise of this book (not the items inside one)
// the star of the question we are on is 'cur'; the stars of its whole part (same exercise) are 'grp'
function qCur(i){ const g=qz.list[i]&&qGrp(qz.list[i].set); $$('.qdots i').forEach((x,k)=>{ x.classList.toggle('cur',k===i); x.classList.toggle('grp',qGrp(qz.list[k].set)===g); }); }
// wait until no sound is playing any more (a sentence read after an answer is never cut by the move to the next question); never longer than `cap` ms (Ahmed 2026-11-10)
async function qIdle(run,cap){ const t0=Date.now(); let idle=0; cap=cap||12000;
  while(Date.now()-t0<cap){ if(run!==qz.run) return; const on=(typeof vs!=='undefined'&&vs.src)||(window.speechSynthesis&&speechSynthesis.speaking); idle=on?0:idle+60; if(idle>=240) return; await new Promise(r=>setTimeout(r,60)); } }
const qGrp=s=>s.grp?s.page+'|'+s.grp:s.ex!=null?s.page+'|'+s.ex:s;   // sets with the same book exercise (e.g. one circle set per colour) are ONE exercise for the arrows
function qSetStart(d){ const s=qz.list[qz.i]&&qz.list[qz.i].set; if(!s) return -1; const g=qGrp(s); let i=qz.i;
  if(d>0){ while(i<qz.list.length&&qGrp(qz.list[i].set)===g) i++; return i<qz.list.length?i:-1; }
  while(i>0&&qGrp(qz.list[i-1].set)===g) i--; if(i===0) return -1; const p=qGrp(qz.list[i-1].set); i--; while(i>0&&qGrp(qz.list[i-1].set)===p) i--; return i; }
function qSet(d){ const i=qSetStart(d); if(i<0) return; hideHint(); blip(600); qGo(i); }
// which question a book page starts at (used by the page jump); picks Book or Workbook from the page
function qFirstOnPage(p,src){ const f=qz.all.find(q=>q.set.page===p&&(!src||qSrcOf(q.set)===src)); qPick(f?qSrcOf(f.set):src||'book');
  const i=qz.list.findIndex(q=>q.set.page===p); return i<0?0:i; }
function qGo(i){
  stopVoice(); $$('#lmeta .qxhelp').forEach(x=>x.remove()); hideHint(); setTimeout(qHelpShow,60); const run=++qz.run; qz.i=i; qz.busy=false;
  const q=qz.list[i], s=q.set, w=$('.quiz'); if(!w) return;
  q.solved=false;   // every visit draws the question unsolved, so its speaker reads the question again (never the answer)
  w.dataset.type=s.type;
  { const old=$('.qmodel',w); if(old) old.remove(); }   // the paper's heading (Classroom / Homework / Weekly C) is no longer shown on any question
  $('.qex',w).textContent=s.ex?num(s.ex):'?'; $('.qex',w).hidden=false; $('.qtask',w).textContent=s.task; qFitTask();   // RULE (Marwa 2026-11-05): every question header shows its number, or '?' when the book has none
  footPage(s.page); lnavPaint();
  qCur(i);
  if($('#lesson').classList.contains('qrail')){ $('#lesson').classList.remove('qrail'); setRail([]); }   // the side Listen / Stop button belongs to the 'together' page only
  const a0=$('.qans',w); if(a0.parentElement!==w) w.append(a0);   // back in its own place before the pictures are cleared (qLayout moves it beside the picture)
  const qi=$('#qin'); if(qi&&s.type!=='type'){ qi.blur(); qi.remove(); }
  const qxi=$('#qxin'); if(qxi&&s.type!=='write'){ qxi.blur(); qxi.remove(); }
  const m=QM[s.type]; if(!m) return;
  $$('.qask',w).forEach(e=>e.parentNode&&e.parentNode.removeChild(e));   // a question line left over from the previous question must not hide this question's speaker (css :has(.qask))
  if(m.sheet!=='box'){ const qw=$('.qword',w); if(qw) qw.hidden=false; const ts=$('.qtsay',w); if(ts) ts.hidden=false; }   // a box question (colour / face / story...) hides the word line; the next word question shows it again
  if(m.sheet==='board') return qBoard(w,q,i,run);
  w._board=null;
  if(m.sheet==='box') return qxGo(w,q,i,run);
  // the word line: the word (letter / type: with its gaps), the play area, the answers
  { const b=$('.qword b',w); b.className=''; b.removeAttribute('dir'); if(m.word) b.innerHTML=m.word(q); else { b.textContent=''; qToks(b,q.word); if(/\s/.test(String(q.word||'').trim())){ b.classList.add('qsent'); if(isAr()) b.dir='rtl'; } } }   // a sentence wraps, big and centred (css/qlayout.css)   // a plain word / sentence: every word tappable (shared qToks)
  const play=$('.qplay',w), ans=$('.qans',w); play.innerHTML=''; ans.innerHTML='';
  m.draw(play,ans,q,s);
  qLayout(); carFrac(i/qz.list.length);
  // the first question of each exercise: the instruction is read first, then the word
  setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; if(qNewEx()) await qTask(); if(run===qz.run&&inQ()){ if(s.type==='type') qFocus(); if(q.autoSay) qSay(); } },350);   // Marwa 2026-11-04: the question itself is NOT read by itself (the child reads; the speaker beside it helps)
}
// letter / type: the word with its gaps ("missing" = one letter, "gaps" = several, typed left to right), filled in when the child finds them
const qGapWord=q=>{ const lw=q.letters&&q.letters[q.answer]!=null?String(q.letters[q.answer]):'', gps=q.gaps||(q.missing==null&&[...lw].length>1&&String(q.word).startsWith(lw)?[...lw].map((_,i)=>i):[q.missing||0]), w=wsWord(q.word,{hide:gps,ltr:!isAr()}); $$('.lt.hid',w).forEach(x=>x.classList.add('qgap')); wsCur(w);   // THE word component (js/wordslots.js); the gaps are its hidden letters
  return (q.scr?`<span class="qscr">${q.scr.split('').join(' ')}</span>`:'')+w.outerHTML; };
const qOnePic=q=>el('div','qpic one',`<img src="${q.pic}" alt="${q.word||''}"><span class="qmark"></span>`);
const qHalf=a=>{ const o=a.map((x,k)=>k); if(Math.random()<.5) o.reverse(); return o; };   // the right one is not always on the same side
/* ---------- SHARED tappable words (every subject, every question model): a tap on one word reads that word alone (Marwa 2026-11-04).
   English: data/en-shared/q/<slug>.mp3 (falls back to the word pack / device voice). Arabic: NO machine voice, so an Arabic word is a span
   (it can carry the vocab pen) but says nothing unless the model gives it its own recording (onTap). qToks = alToks. ---------- */
const alSlug=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60).replace(/-+$/,'');
const alClean=w=>String(w).replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g,'');
const alWordSrc=w=>`data/en-shared/q/${alSlug(alClean(w))}.mp3`;
// text -> tappable words (a tap reads that word alone: the child is learning to read)
function alToks(host,text,onTap){
  String(text).split(/\s+/).filter(Boolean).forEach((w,k)=>{ const sp=el('span','alw',w); if(/[\u0600-\u06FF]/.test(w)&&!onTap){ host.append(k?' ':'',sp); return; } sp.addEventListener('click',e=>{ e.stopPropagation(); if(qz.busy&&!onTap) return; hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(w),alClean(w)).then(()=>sp.classList.remove('lit')); if(onTap) onTap(w); });
    host.append(k?' ':'',sp); });
}
const qToks=alToks;
QM.pick={sheet:'word', draw(play,ans,q){ qHalf(q.pics).forEach(k=>{ const b=el('button','qpic',`<img src="${q.pics[k]}" alt=""><span class="qmark"></span>`); b.setAttribute('aria-label','Picture '+(k+1)); b.dataset.k=k;
    b.addEventListener('click',()=>qAnswer(b,k===q.answer)); play.append(b); }); },
  help:(q,w)=>$$('.qpic',w).filter(b=>+b.dataset.k===q.answer)};
/* THE choice button (Marwa 2026-11-04, every subject): one look, one size (--q-choice, css/qlayout.css), always UNDER the question (.qans / a choices row).
   A letter or a number = a round button; a word = a pill of the same height (words:true = the row has words, so even "up" is a pill). Models make their choices ONLY with qChBtn. */
const qWords=a=>a.some(o=>[...String(o)].length>2);
const qChBtn=(t,words)=>{ const s=String(t), n=[...s].length, b=el('button','rb qbtn qlet qch'+(n>2||words?' wd':n>1?' two':''),'<span></span>'); $('span',b).textContent=s; b.setAttribute('aria-label',s); return b; };
// the answer is marked the way the book asks: "circle" -> a ring round it; "match" / "join" / "صل" -> a line (Marwa 2026-11-04)
const qCircleTask=s=>/\bcircle\b|دائر|حوّ?ط/i.test((s&&s.task)||'');
QM.letter={sheet:'word', word:qGapWord, draw(play,ans,q){ play.append(qOnePic(q));
    qHalf(q.letters).forEach(k=>{ const b=qChBtn(q.letters[k]); b.setAttribute('aria-label','Letter '+q.letters[k]); b.dataset.k=k;
      b.addEventListener('click',()=>qAnswer(b,k===q.answer)); ans.append(b); }); },
  help:(q,w)=>$$('.qans .qlet',w).filter(b=>+b.dataset.k===q.answer)};
/* choice ("Look, read, and circle"): the sentence big on top with a blank where the answer goes, the picture, the word choices under it (THE choice buttons) */
QM.choice={sheet:'word', fit:0, word:()=>'', draw(play,ans,q){ const b=$('.qword b'); b.classList.add('qsent'); b.textContent=''; b.dir=isAr()?'rtl':'ltr';   // an Arabic sentence reads right to left (the word line itself is ltr for letter gaps)
    if(q.ask){ const a=el('span','qask'); qToks(a,q.ask); b.append(a); }
    const sen=el('span','qsen'), sp=q.forms?'':' '; if(q.lead){ qToks(sen,q.lead); sen.append(sp); } sen.append(el('span','qblank','')); if(q.tail){ sen.append(sp); const t=el('span'); qToks(t,q.tail); sen.append(t); } b.append(sen);   // forms = a letter choice inside a word: letters touch (the script joins them), each choice shown in its position form (ـز, ز) as in the book
    if(q.pic) play.append(el('div','qpic one',`<img src="${q.pic}" alt="">`));   // a choice without a picture (Arabic appendix pronoun sentences, no picture in the book)
    q.options.forEach((o,k)=>{ const c=qChBtn(q.forms?q.forms[k]:o,q.forms?0:qWords(q.options)); c.dataset.k=k; c.addEventListener('click',()=>qChoose(c,k,q)); ans.append(c); }); },
  help:(q,w)=>$$('.qans .qch',w).filter(b=>+b.dataset.k===q.answer)};
QM.type={sheet:'word', word:qGapWord, draw(play,ans,q){ play.append(qOnePic(q));
    qFocus(); },   // the keyboard stays open from one word to the next; it first opens when the instruction has been read (or when the child taps the letter)
  help:(q,w)=>[$('.qword .qgap:not(.got)',w)].filter(Boolean),
  peek(q,w){ const g=$('.qword .qgap:not(.got)',w); if(!g) return; const gi=g.dataset.i!=null&&q.gaps?+g.dataset.i:null, ch=gi!=null?q.word[gi]:q.answer; if(!ch) return;
    wsPeek(g); qFocus(); }};
QM.yesno={sheet:'word', draw(play,ans,q){ play.append(qOnePic(q));
    const fc=q.faces?'<img src="data/pics/ar-smiley.png" alt="">':'', sd=q.faces?'<img src="data/pics/ar-sad-face.png" alt="">':'';   // faces:true = a happy and a sad face in place of the tick and the cross (Arabic u2l1 ex 2, Marwa 2026-11-06)
    [[true,'yes',q.faces?fc:Q_TICK,'It matches'],[false,'no',q.faces?sd:Q_CROSS,'It does not match']].forEach(([v,c,ic,l])=>{
      const b=el('button','rb qbtn '+c+(q.faces?' qface':''),ic); b.setAttribute('aria-label',l); b.addEventListener('click',()=>qAnswer(b,v===q.answer,v)); ans.append(b); }); },
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
  const b=el('div','qboard'); if(s.bigP) b.classList.add('bigP'); if(s.dense) b.classList.add('dense');   /* "dense": many small options (the book's 28-letter board, Arabic u3l10 p113): smaller buttons so rows of 6 never overlap */ if(s.type==='circle'||qCircleTask(s)) b.classList.add('ring'); if(s.mark==='tick') b.classList.add('tickmk');   // "mark":"tick" (circle): a small green check under the tapped item, not a ring (book: put a ✓ under the letter, Ahmed 2026-11-06)   // the book says "circle": a ring round the picture, never a line (Marwa 2026-11-04)   // "bigP": bigger pictures on tall screens (with "posP" per item)
  if(s.centerPic){ const c=el('div','qcenter pic',`<img src="${R_Q(s.centerPic)}" alt="">`); { const ca=(s.centerAtP&&!$('#lesson').classList.contains('q-land'))?s.centerAtP:s.centerAt; if(ca){ c.style.setProperty('--cx',ca[0]); c.style.setProperty('--cy',ca[1]); } } b.append(c); }   // "centerPic": a picture to match (book: circle the SIMILAR picture)
  if(s.center){ const c=el('button','qcenter',`<span>${s.center}</span>`); c.setAttribute('aria-label','Letter '+s.center); c.addEventListener('click',()=>qSound(s.centerSrc,s.center[0]));
    if(s._cAt) b.classList.add('cgrid');
    { const ca=s._cAt||((s.centerAtP&&!$('#lesson').classList.contains('q-land'))?s.centerAtP:s.centerAt); if(ca){ c.style.setProperty('--cx',ca[0]); c.style.setProperty('--cy',ca[1]); } }   // "centerAt"/"centerAtP" (landscape / portrait) also place a LETTER in the middle, like a centre picture
    b.append(c); }
  b._items=s.items;
  s.items.forEach(it=>{ const p=el('button','qmp'+(it.picSrc?'':' tx'),(it.picSrc?`<img src="${it.picSrc}" alt="">`+(it.text?`<b class="qpt">${it.text}</b>`:''):`<b>${it.word}</b>`)+`<span class="qmark"></span>`); p.setAttribute('aria-label',it.word);   // a word-only option (book: circle the different WORD)
    if(!it.picSrc&&it.audio&&it.src){ const sp=el('span','qsay qmsay',typeof SAY_LN==='string'?SAY_LN:ICON.sound); sp.setAttribute('role','button'); sp.setAttribute('aria-label','Listen'); sp.addEventListener('click',e=>{ e.stopPropagation(); if(!qz.busy) qSound(it.src,it.word); }); p.prepend(sp); }   // a word to find gets its Listen speaker (Ahmed 2026-11-09, all word boards): a child who cannot read it hears it before choosing; a tap on the speaker never circles
    const ps=it.posP&&!$('#lesson').classList.contains('q-land')?it.posP:it.pos; p.style.left=`clamp(calc(var(--w) / 2), ${ps[0]}%, calc(100% - var(--w) / 2))`; p.style.top=`clamp(calc(var(--w) / 2), ${ps[1]}%, calc(100% - var(--w) / 2))`; p.addEventListener('click',()=>qMatch(p,it,s)); b.append(p); });
  play.append(b); qFitBoard(b); requestAnimationFrame(()=>qFitBoard(b));
  // the first time: read the instruction, then the letter's sound
  const first=qNewEx(); setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; if(first) await qTask(); if(s.center&&qz.list[qz.i]&&qz.list[qz.i].set===s&&inQ()) qSound(s.centerSrc,s.center[0]); },350);
}
// BIGGEST pictures that fit (Marwa 2026-11-08, ALL subjects): a board of pictures sizes every picture from the room it has: as big as the nearest
// neighbours / the letter in the middle / the board edges allow (squares never overlap), so a page with room never shows tiny pictures. Looks at the pictures
// only (a board with words keeps its own sizes); --wfit is read by css/quiz.css (.qmp), re-run on every resize.
function qFitBoard(b){ b=b||$('.qboard'); if(!b||b.classList.contains('dense')||b.querySelector('.qmp.tx')) return;
  const B=b.getBoundingClientRect(); if(!B.width||!B.height) return; const its=[...b.querySelectorAll('.qmp')], c=b.querySelector('.qcenter'); if(!its.length) return;
  const pts=its.map((e,k)=>{ const it=b._items&&b._items[k]; const ps=it?((it.posP&&!$('#lesson').classList.contains('q-land'))?it.posP:it.pos):null; return ps?[ps[0]*B.width/100,ps[1]*B.height/100]:null; });
  if(pts.some(p=>!p)) return;
  let w=Math.min(B.width,B.height)*.92; const cw=c?c.getBoundingClientRect().width:0; if(c&&c.classList.contains('pic')) return;
  for(let i=0;i<pts.length;i++){ for(let j=i+1;j<pts.length;j++){ w=Math.min(w,Math.max(Math.abs(pts[i][0]-pts[j][0]),Math.abs(pts[i][1]-pts[j][1]))*.94); }
    if(c){ const cr=c.getBoundingClientRect(), cx=cr.left+cr.width/2-B.left, cy=cr.top+cr.height/2-B.top; w=Math.min(w,(2*Math.max(Math.abs(pts[i][0]-cx),Math.abs(pts[i][1]-cy))-cw)*.94); } }
  const lo=Math.min(B.width*.2,B.height*.3); b.style.setProperty('--wfit',Math.max(lo,w).toFixed(0)+'px'); }
// the lines of the joined pictures, worked out again when the screen changes size
function qLines(fresh){ const bd=$('.qboard'); if(!bd||$('.quiz').dataset.type!=='match'||bd.classList.contains('ring')) return; const c=$('.qcenter span',bd); if(!c) return; const B=bd.getBoundingClientRect();
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
function qSound(src,text){ vStop(); if(Array.isArray(src)){ const vr=vs.run; return src.reduce((p,f)=>p.then(()=>{ if(vr===vs.run) return playFile(f); }),Promise.resolve()).catch(()=>{}); } return (src?playFile(src).catch(()=>tts(text,isAr()?'ar':'en',.75)):tts(text,isAr()?'ar':'en',.75)).catch(()=>{}); }
async function qMatch(btn,it,s){
  if(qz.busy) return; hideHint();
  if(btn.classList.contains('done')) return s.silent?null:qSound(it.src,it.word);
  if(!it.answer){
    qCross(btn); return qBad(btn);
  }
  const run=qz.run, more=qSetMoreAfter(s); btn.classList.add('done'); if(!more) qz.busy=true;
  // a line from the picture to the letter in the middle, drawn out like a pencil line
  const ring=btn.closest('.qboard.ring'); if(!ring) qLines(btn);
  if(ring&&anim) G.fromTo(btn,{'--ring':1.5},{'--ring':1,duration:.4,ease:'back.out(2)'});
  celebrate(btn); if(!s.silent) qSound(it.src,it.word);
  if(qMore(s)) return; return qDone(s,run,1100);
}
// a right answer of a board that has more answers still to find: its star, and on to the next one at once (nothing waits, so the child can tap the next right picture straight away)
const qBoardHelp=(q,w)=>{ const s=q.set, ps=$$('.qmp',w), it=s.items.find((x,k)=>x.answer&&ps[k]&&!ps[k].classList.contains('done')); return it?[ps[s.items.indexOf(it)]]:[]; };
QM.match={sheet:'board', draw:qPicBoard, help:qBoardHelp};
QM.circle={sheet:'board', draw:qPicBoard, help:qBoardHelp};
const qSetMoreAfter=s=>qz.i+1<qz.list.length&&qz.list[qz.i+1].set===s;
function qMore(s){ const next=qz.i+1; if(next>=qz.list.length||qz.list[next].set!==s) return false;
  qStar(); qz.i=next; qCur(next);
  lnavPaint(); return true; }
// one more right answer of a board: its star, then on to the next one (the same board stays when the exercise has more)
async function qDone(s,run,ms){
  qStar();
  await new Promise(r=>setTimeout(r,ms)); await qIdle(run); if(run!==qz.run||!inQ()) return;
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
  { const q=qz.list[qz.i]; wsInput(inp,q&&q.word); }   // English word: English keyboard (js/wordslots.js)
  inp.focus({preventScroll:true}); }
function qTyped(ch){ const q=qz.list[qz.i]; if(!ch||qz.busy||!q||q.set.type!=='type') return;
  const gap=$('.qword .qgap:not(.got)'), gi=gap&&gap.dataset.i!=null&&q.gaps?+gap.dataset.i:null, want=gap&&gap.textContent?gap.textContent:(gi!=null?q.word[gi]:q.answer), right=sameLetter(normDigits(ch),String(want));   // the truth is the letter the child SEES missing (the gap's own letter); q.answer is only a fallback (Marwa 2026-11-05: ch_ir showed the i missing but wanted a)
  if(right&&q.gaps&&$$('.qword .qgap:not(.got)').length>1){ gap.classList.remove('bad','hid','cur'); gap.classList.add('got'); wsCur($('.qword .ws')); tone(660,'sine',.05,.12); if(anim) G.fromTo(gap,{scale:1.4},{scale:1,duration:.35,ease:'back.out(3)'}); return; }   // one gap filled, more to go
  if(!right&&gap) wsBad(gap);   // a wrong letter is never written: the place only shakes
  qAnswer(gap||$('.qword'),right); }
// a computer keyboard works even when the text box lost focus (e.g. after tapping the speaker)
addEventListener('keydown',e=>{ if(!inQ()||e.ctrlKey||e.metaKey||e.altKey||e.key.length!==1) return; const q=qz.list[qz.i];
  if(!q||q.set.type!=='type'||document.activeElement&&document.activeElement.id==='qin') return; e.preventDefault(); qTyped(normDigits(e.key)); });
function qSay(){ const q=qz.list[qz.i]; if(!q) return; vStop(); const w=$('.qword'); w.classList.add('lit');
  if(q.sayFn&&!q.solved) return q.sayFn();   // English AL: the question read with a pause where the blank is
  const done=()=>{ const x=$('.qword'); if(x) x.classList.remove('lit'); };
  if((q.askTask||(q.set.type==='choice'&&!q.askAudio&&!q.ask))&&!q.solved) return qTask().then(done,done);   // a choice with no question text of its own ("choose the title of the nasheed"): the speaker reads the exercise header only, never the item's sound (the answer / the whole nasheed) (Marwa 2026-11-05)
  if(q.askAudio&&!q.solved) return qSound(R_Q(q.askAudio),'').then(done,done);   // the QUESTION (with all its choices), never the answer: tools/lessons/choice_ask_audio.py; Arabic = a library slot, silent until recorded
  if(q.ask&&!q.solved) return tts(q.ask,'en',.75).then(done,done);   // "q.ask": the question read without its answer (the full sentence is said once it is solved)
  return (q.audio?playFile(q.audio).catch(()=>tts(q.word,isAr()?'ar':'en',.75)):tts(q.word,isAr()?'ar':'en',.75)).then(done,done); }
// read the exercise instruction aloud (its line lights up while it plays)
function qTask(){ const q=qz.list[qz.i]; if(!q) return Promise.resolve(); vStop(); const t=$('.qtask'); if(t) t.classList.add('lit');
  const done=()=>{ const x=$('.qtask'); if(x) x.classList.remove('lit'); };
  const ts=q.set.taskSrc, fb=()=>tts(q.set.task,isAr()?'ar':'en',.85);
  if(!ts) return fb().then(done,done);   // no task recording: never ask for a file called "undefined"
  const vr=vs.run, play=Array.isArray(ts)?ts.reduce((p,u,k)=>p.then(()=>{ if(qz.list[qz.i]!==q||vr!==vs.run) return; return (k?new Promise(r=>setTimeout(r,120)):Promise.resolve()).then(()=>playFile(u)); }),Promise.resolve()):playFile(ts);
  return play.catch(fb).then(done,done); }
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
  if(q.set.type==='pick'){ if(q.set.mark==='ring') qRing(btn); else qStamp(btn,false); } else { btn.classList.add('on'); if(btn.classList.contains('qch')&&qCircleTask(q.set)) qRing(btn); qStamp($('.qpic.one'),said===false); }
  $$('.qword .qgap:not(.got)').forEach(gap=>{ gap.classList.remove('bad','hid','cur','peek'); gap.classList.add('got'); if(anim) G.fromTo(gap,{scale:1.4},{scale:1,duration:.4,ease:'back.out(3)'}); });
  $$('.qpic').forEach(p=>p!==btn&&q.set.type==='pick'&&p.classList.add('dim'));
  celebrate(q.set.type==='pick'?btn:$('.qpic.one'));
  qStar();
  await new Promise(r=>setTimeout(r,500)); if(run!==qz.run) return;
  await new Promise(r=>setTimeout(r,900)); await qIdle(run); if(run!==qz.run||!inQ()) return;
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
addEventListener('resize',()=>{ if(inQ()){ qLayout(); qLines(); qFitBoard(); } });

/* link: words in one row, pictures in the other (or two columns); a line joins a word to its picture */
function qLinkBoard(w,s,play,run){
  const n=s.items.length, bd=el('div','qlink'); bd.dataset.n=n; bd.style.setProperty('--n',n); bd._set=s; bd._pairs=[];
  const wd=el('div','qlw'), pc=el('div','qlp');
  let ord=s.items.map((_,k)=>k); for(let t=0;t<30;t++){ ord.sort(()=>Math.random()-.5); if(n<2||ord.every((v,k)=>v!==k)) break; }   // the pictures are not under their own words
  s.items.forEach((it,k)=>{ const b=el('button','qlk qlkw'+(it.wpicSrc?' pw':''),(it.wpicSrc?`<img src="${it.wpicSrc}" alt="" draggable="false">`:`<b>${it.word}</b>`)+`${it.rel?`<small class="qrel">${it.rel}</small>`:''}`); b.dataset.k=k; b.setAttribute('aria-label',it.word); wd.append(b); });
  ord.forEach(k=>{ const it=s.items[k], b=el('button','qlk qlkp'+(it.picSrc?'':' tx'),it.picSrc?`<img src="${it.picSrc}" alt="" draggable="false">`:`<b>${it.text2}</b>`); b.dataset.k=k; b.setAttribute('aria-label',it.picSrc?'Picture':it.text2); pc.append(b); });   // "text2": a word to join instead of a picture
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','qlsvg');
  bd.append(wd,pc,svg); play.append(bd);
  s.items.forEach(it=>[it.src,it.src2,it.psrc,...(it.fullSrc||[])].flat().filter(Boolean).forEach(f=>warmFile(f)));   // every sound of the board is ready before the first join
  let drag=null, sel=null; const rel=(x,y)=>{ const B=bd.getBoundingClientRect(); return [x-B.left,y-B.top]; };
  const kind=b=>b.classList.contains('qlkw')?'w':'p';
  const tmp=()=>{ let l=$('.qtmp',svg); if(!l){ l=document.createElementNS('http://www.w3.org/2000/svg','line'); l.setAttribute('class','qtmp'); svg.append(l); } return l; };
  const clearSel=()=>{ if(sel){ sel.classList.remove('sel'); sel=null; } };
  bd.addEventListener('pointerdown',e=>{ const b=e.target.closest('.qlk'); if(!b||qz.busy) return; e.preventDefault(); hideHint();
    const it=s.items[+b.dataset.k];
    if(b.classList.contains('done')){ if(kind(b)==='w'||b.classList.contains('tx')) qLinkSay(it); else if(it.psrc) qSound(it.psrc,''); return; }
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
    if(kind(d.b)==='w'){ const it=s.items[+d.b.dataset.k]; qSound(it.src,it.word); } else if(s.items[+d.b.dataset.k].psrc&&!d.b.classList.contains('tx')){ const it=s.items[+d.b.dataset.k]; qSound(it.psrc,''); } else if(d.b.classList.contains('tx')){ const it=s.items[+d.b.dataset.k]; qSound(it.src2||it.src,it.text2); }
    if(sel&&sel!==d.b&&kind(sel)!==kind(d.b)){ const a=sel; clearSel(); qLinkTry(bd,s,a,d.b,run); return; }
    if(sel===d.b){ clearSel(); return; }
    clearSel(); sel=d.b; d.b.classList.add('sel'); };
  bd.addEventListener('pointerup',end); bd.addEventListener('pointercancel',end);
  qLinkRefresh(L$().classList.contains('q-land'));
  if(qNewEx()) setTimeout(async()=>{ if(run!==qz.run||!inQ()) return; await qTask(); },350);
}
const L$=()=>$('#lesson');
QM.link={sheet:'board', fit:0, draw:qLinkBoard, help:(q,w)=>{ const bd=$('.qlink',w); if(!bd) return []; const wb=$$('.qlkw',bd).find(b=>!b.classList.contains('done')); return wb?[wb,$$('.qlkp',bd).find(b=>b.dataset.k===wb.dataset.k)].filter(Boolean):[]; }};
const qNewEx=()=>{ const i=qz.i; return i<=0||qGrp(qz.list[i-1].set)!==qGrp(qz.list[i].set)||qz.list[i-1].set.task!==qz.list[i].set.task; };   // the instruction is read only when a new exercise starts, not for each part of it
// where a line leaves a word / arrives at a picture (bottom / top in rows, right / left in columns), in the board's own pixels
function qAnchor(bd,b,isWord){ const B=bd.getBoundingClientRect(), r=b.getBoundingClientRect(), cols=bd.classList.contains('cols');
  return cols?[(isWord?r.right:r.left)-B.left, r.top+r.height/2-B.top]:[r.left+r.width/2-B.left,(isWord?r.bottom:r.top)-B.top]; }
function qLinkLine(bd,wb,pb,cls){ const svg=$('.qlsvg',bd), l=document.createElementNS('http://www.w3.org/2000/svg','line'); l.setAttribute('class',cls||'qlj');
  const [x1,y1]=qAnchor(bd,wb,true), [x2,y2]=qAnchor(bd,pb,false); [['x1',x1],['y1',y1],['x2',x2],['y2',y2]].forEach(([k,v])=>l.setAttribute(k,v)); svg.append(l); return l; }
function qLinkLines(){ const bd=$('.qlink'); if(!bd) return; $$('.qlj',bd).forEach(l=>l.remove()); bd._pairs.forEach(([wb,pb])=>qLinkLine(bd,wb,pb)); }
// words and pictures as big as the board allows; rows or columns follow the screen
function qLinkRefresh(land){ const bd=$('.qlink'); if(!bd) return; const s=bd._set, n=s.items.length;
  const wordsOnly=s.items.every(it=>!it.picSrc&&!it.wpicSrc);   // word-to-word joins (meaning / plural): in portrait two columns, so the words can be BIG with room for the dots (Ahmed 2026-11-09)
  const mx=Math.max(...s.items.map(it=>Math.max(it.word.length,(it.text2||'').length))), sent=!land&&s.items.some(it=>it.word.split(/\s+/).length>=3&&it.word.length>16);   // whole sentences do not fit side by side on a tall screen (Ahmed 2026-11-09)
  bd.classList.toggle('cols',s.layout==='cols'||(!land&&(n>4||wordsOnly||sent))); bd.classList.toggle('sent',sent);
  const B=bd.getBoundingClientRect(), cols=bd.classList.contains('cols');
  const cw=cols?B.width*.4:(B.width-(n-1)*8)/n-14, rh=cols?B.height/n*.5:40;
  const gp=parseFloat(getComputedStyle(cols?bd:($('.qlw',bd)||bd)).columnGap)||0, colW=cols?(B.width-gp)/2:(B.width-(n-1)*gp)/n;   // the room one word box really has
  let fs=Math.max(12,Math.min(isAr()?48:32,cw/(.6*mx),rh*1.1,colW/(1.12*(.6*mx+1.2))));
  if(sent) fs=Math.max(14,Math.min(26,colW/(.6*mx/2.4),rh*.55));   // 2-3 wrapped lines per sentence
  if(cols&&wordsOnly) fs=Math.max(fs,Math.min(38,colW/3.2,rh*1.1));   // big words: the fit loop below shrinks it if a word does not fit
  bd.style.setProperty('--fs',fs+'px');
  // the WHOLE word must sit inside its rectangle: shrink until the widest text fits its box (never cut, never over the connector dot)
  for(let k=0;k<30&&fs>10;k++){ const bad=$$('.qlkw,.qlkp.tx',bd).some(bx=>{ const b=$('b',bx); return b&&(b.scrollWidth>bx.clientWidth-parseFloat(getComputedStyle(bx).paddingLeft)-parseFloat(getComputedStyle(bx).paddingRight)+1||b.getBoundingClientRect().bottom>bd.getBoundingClientRect().bottom+1||(sent&&bx.offsetHeight>B.height/n*.96)); }); if(!bad) break; fs-=1; bd.style.setProperty('--fs',fs+'px'); }
  qLinkLines(); }
/* what a joined pair says: "full" (whole phrase) if given; else, when the partner has its own recording ("audio2"), the word then the partner; else the word */
async function qLinkSay(it){ vStop(); const vr=vs.run; if(it.psrc){ for(const f of [it.src,it.psrc]){ if(vr!==vs.run) return; try{ await playFile(f); }catch(_){} } return; }   /* "paudio" = the picture's own word: a right join says the letter (with its harakah) then that word */ if(it.fullSrc&&it.fullSrc.length){ for(const f of it.fullSrc){ if(vr!==vs.run) return; try{ await playFile(f); }catch(_){} } return; } if(it.text2&&it.audio2&&it.src2&&it.src2!==it.src){ for(const f of [it.src,it.src2]){ if(vr!==vs.run) return; try{ await playFile(f); }catch(_){} } return; } return qSound(it.src,it.word); }
async function qLinkTry(bd,s,a,b){
  const run=qz.run;   // the board is kept from pair to pair, so it must use the question running NOW, not the one it was built in
  const wb=a.classList.contains('qlkw')?a:b, pb=wb===a?b:a, it=s.items[+wb.dataset.k];
  if(wb.dataset.k!==pb.dataset.k&&!(s.group&&(it.text2?s.items[+pb.dataset.k].text2===it.text2:it.pic&&s.items[+pb.dataset.k].word===it.word))){ const l=qLinkLine(bd,wb,pb,'qlj bad'); setTimeout(()=>l.remove(),500); return qBad([wb,pb]); }
  if(!qSetMoreAfter(s)) qz.busy=true; wb.classList.add('done'); pb.classList.add('done'); bd._pairs.push([wb,pb]);
  const l=qLinkLine(bd,wb,pb); if(anim){ const len=l.getTotalLength?l.getTotalLength():300; G.fromTo(l,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.35,ease:'power2.out'}); }
  celebrate(pb); qLinkSay(it);   // "full": the joined phrase of the pair (word + its partner), said on a right join
  if(qMore(s)) return; return qDone(s,run,900);
}
/* choice: tap the right word of the two; it gets a hand-drawn ring */
async function qChoose(btn,k,q){
  if(qz.busy) return; hideHint();
  if(k!==q.answer) return qBad(btn);
  qz.busy=true; q.solved=true; const run=qz.run; qRing(btn); btn.classList.add('on'); $$('.qans .qch').forEach(o=>o!==btn&&o.classList.add('dim')); { const bl=$('.qword .qblank'); if(bl){ bl.textContent=q.options[k]; bl.classList.add('got'); } } celebrate(btn); qSay();   // solved: now the whole answer sentence is said
  return qAdvance(run,1900);
}
async function qAdvance(run,ms){
  qStar();
  await new Promise(r=>setTimeout(r,ms)); await qIdle(run); if(run!==qz.run||!inQ()) return;
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
// a type with its own Help bulb (write, math) puts it at the right of the row above the tabs, where the generic bulb stands
// the question text takes the whole line: one line, the font shrinks a little when it must (wraps only below 13px)
function qFitTask(){ const t=$('.quiz .qtask'); if(!t) return; t.style.fontSize=''; t.style.whiteSpace='nowrap'; requestAnimationFrame(()=>{ if(!t.isConnected) return; let fs=parseFloat(getComputedStyle(t).fontSize); for(let k=0;k<20&&t.scrollWidth>t.clientWidth+1&&fs>13;k++){ fs--; t.style.fontSize=fs+'px'; } if(t.scrollWidth>t.clientWidth+1) t.style.whiteSpace=''; }); }
function qHelpHost(b){ const r=$('#lmeta .lm-r'); if(r) r.append(b); const g=$('#lmeta .qhelpb'); if(g) g.hidden=true; }
function qHelpShow(){ const b=$('#lmeta .qhelpb'); if(!b) return; b.hidden=!qHelpEls().length; lnavFit(); }
function qHelp(){ if(qz.busy) return; const L=qHelpEls(); if(!L.length) return; hideHint(); blip(660,.05);
  const pk=QM[qz.list[qz.i].set.type].peek; if(pk){ pk(qz.list[qz.i],$('.quiz')); return; }   // write types: the letter now due shows light and see-through for a moment (same as the Words tab)
  L.forEach(e=>{ const f=e.classList.contains('qxc')?$('span',e):null; e.classList.remove('qhl'); void e.offsetWidth; e.classList.add('qhl'); if(f) f.classList.add('qhl-t'); setTimeout(()=>{ e.classList.remove('qhl'); if(f) f.classList.remove('qhl-t'); },2000); }); }

/* a very wide picture can come with a TALL copy (the same things in 2 rows: item picsTall, tools/pics/trim.py --stack).
   The one that shows the things BIGGER in the picture box is used: wide on a short phone box, tall on a tablet (Marwa 2026-11-04) */
function qPicFit(im,tall){ if(!tall) return; const wide=im.src, d={}, t=new Image();
  const pick=()=>{ const f=im.parentElement; if(!im.isConnected){ removeEventListener('resize',pick); return; }
    if(!d.w&&im.naturalWidth&&im.src===wide) d.w=[im.naturalWidth,im.naturalHeight]; if(!f||!d.w||!t.naturalWidth) return;
    const W=f.clientWidth, H=f.clientHeight, sc=(w,h)=>Math.min(W/w,H/h), want=sc(t.naturalWidth,t.naturalHeight)>sc(...d.w)*1.08?t.src:wide;
    if(im.src!==want) im.src=want; };
  im.addEventListener('load',pick); t.onload=pick; t.src=tall; addEventListener('resize',pick); }
;
/* ===== js/words-data.js ===== */
/* EASY WORDS — data. The words app owns NO words: a word, its picture, syllables and sounds come BY REFERENCE from the curriculum app's own files
   (data/<subject>/subject.json = units and lessons, lesson.json "vocab" = the words), so one change there shows in both apps.
   Own here: which curriculum shows which subjects, which lessons are open (data/words/words.json), and the child's word statistics. */
const EW={ cfg:null, curr:null, cur:null, les:{}, stats:{}, log:[] };
// the subjects that have words; order = order on the home page. small/big/sub = the three lines of the icon (see words-ui.js ewIcon)
const EW_SUBJ={
  'arabic':{ name:'عربي كلمات', small:'عربي', big:'كلمات', lang:'ar' },
  'en-ol': { name:'English OL words', small:'ENGLISH', big:'OL', sub:'WORDS', lang:'en' },
  'en-al': { name:'English AL words', small:'ENGLISH', big:'AL', sub:'WORDS', lang:'en' }
};
try{ EW.curr=localStorage.getItem('ew.curr')||null; }catch(e){}
try{ EW.stats=JSON.parse(localStorage.getItem('ew.stats')||'{}')||{}; EW.log=JSON.parse(localStorage.getItem('ew.log')||'[]')||[]; }catch(e){}
const ewSave=()=>{ try{ localStorage.setItem('ew.stats',JSON.stringify(EW.stats)); localStorage.setItem('ew.log',JSON.stringify(EW.log.slice(-200))); }catch(e){} };
const ewN=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);   // the words app speaks Arabic to the parent and child: numbers in Arabic digits

async function ewLoad(){
  let CURR0;
  [COURSE,CURR0,EW.cfg]=await Promise.all([get('data/course.json'),get('data/curriculum.json'),get('data/words/words.json').catch(()=>({open:[]}))]);
  EW.CURR=CURR0;
  await Promise.all(Object.keys(EW_SUBJ).map(async id=>{
    const s=COURSE.subjects.find(x=>x.id===id); if(!s||!s.file) return;
    const d=await get(s.file), base=s.file.slice(0,s.file.lastIndexOf('/')+1);
    s.units=d.units; s.labels=d.labels; s.lessons=d.lessons.map(l=>({...l, id:`${s.id}-${l.folder}`, file:l.title?base+l.folder+'/lesson.json':null}));
  }));
}
// the choices shown on the first screen: General / Experimental / Private school (from the same data/curriculum.json the curriculum app uses)
function ewChoices(){ const C=EW.CURR; if(!C) return []; const out=C.types.filter(t=>!t.schools).map(t=>({id:t.id,ar:t.ar})); (C.schools||[]).forEach(s=>out.push({id:s.id,ar:'لغات',full:s.ar})); return out; }
// the subjects of the chosen curriculum that have words (a future subject, e.g. German, appears here once it is in EW_SUBJ and has lessons)
function ewSubjects(){
  const C=EW.CURR; if(!C||!EW.curr) return [];
  let ids=[]; const t=C.types.find(x=>x.id===EW.curr), sc=(C.schools||[]).find(x=>x.id===EW.curr);
  if(t) ids=t.subjects||[]; else if(sc){ const b=C.types.find(x=>x.id===sc.base); ids=[...(b?b.subjects:[]),...(sc.subjects||[])]; }
  if(t&&t.id==='tajribi'&&!ids.includes('en-al')) ids=[...ids,'en-al'];   // Ahmed 2026-11-14: English AL is in the experimental curriculum too
  return Object.keys(EW_SUBJ).filter(id=>ids.includes(id)).map(id=>COURSE.subjects.find(s=>s.id===id)).filter(s=>s&&s.lessons);
}
// the units of a subject as the words app shows them: only lessons that have a Words tab; unit name from the book's own unit names
function ewUnits(s){
  const by={}; (s.lessons||[]).forEach(l=>{ if(l.tabs&&!l.tabs.includes('words')) return; if(/^(test|تقييم|اختبار)/i.test(l.title||l.planned||'')) return; (by[l.unit]=by[l.unit]||[]).push(l); });
  return Object.keys(by).map(u=>{ const un=(s.units||[]).find(x=>x.unit==u)||{};
    return { unit:+u, name:s.id==='arabic'?`الوحدة ${ewN(u)}${un.title?' · '+un.title:''}`:`Unit ${u}`, lessons:by[u].map(l=>({...l,name:l.title||l.planned||'',open:!!l.file&&ewOpen(l.id)})) }; })
    .filter(u=>u.lessons.length&&(s.id!=='arabic'||u.unit<=5||u.lessons.some(l=>l.open)));
}
const ewOpen=id=>!!(EW.cfg&&(EW.cfg.all||(EW.cfg.open||[]).includes(id)));
const ewSubjOf=id=>COURSE.subjects.find(s=>id.startsWith(s.id+'-'));
// one open lesson with its words (loaded once; paths already resolved by the curriculum app's own fixPaths)
async function ewLesson(id){
  if(EW.les[id]) return EW.les[id];
  const s=ewSubjOf(id), m=s&&s.lessons.find(l=>l.id===id); if(!m||!m.file) return null;
  const L=fixPaths(await get(m.file),m.file); L.id=id; L.subj=s.id; L.tabs=['words','practice']; L.tabLabels={words:'كلمات',practice:'تدريبات'};
  L.vocab=(L.vocab||[]).filter(v=>v&&v.word); L.vocab.forEach((v,i)=>{ v.lid=id; v.key=id+'|'+v.word; v.ix=i; v.lang=s.id==='arabic'?'ar':'en'; });
  return EW.les[id]=L;
}
// ---- word statistics (kept on this device; later in the parent's account) ----
// a = times asked, c = times right first try, l = the last 4 results (1 right / 0 wrong)
function ewRec(v,ok){ const k=v.key||v.word, o=EW.stats[k]=EW.stats[k]||{a:0,c:0,l:[]}; o.a++; if(ok) o.c++; o.l.push(ok?1:0); if(o.l.length>4) o.l.shift(); o.t=Date.now(); ewSave(); }
// good = right the last two times (and mostly right); weak = wrong last time or mostly wrong; in between = needs review; never asked = new
function ewClass(v){ const o=EW.stats[v.key||v.word]; if(!o||!o.a) return 'new'; const last=o.l[o.l.length-1], two=o.l.slice(-2), r=o.c/o.a;
  if(last===0||r<.5) return 'weak'; if(two.length>=2&&two.every(x=>x===1)&&r>=.7) return 'good'; return 'review'; }
// every word of the open lessons of the chosen curriculum (the test builder, the report and "learn my weak words" read this)
async function ewAllWords(){ const out=[]; for(const s of ewSubjects()) for(const u of ewUnits(s)) for(const l of u.lessons){ if(!l.open) continue; const L=await ewLesson(l.id); if(L) L.vocab.forEach(v=>out.push(v)); } return out; }
;
/* ===== js/words-ui.js ===== */
/* EASY WORDS — screens: curriculum picker, home (subject icons), subject map (unit files > lesson squares > word squares). No road, no page numbers, no Arabic progress.
   Every look is in css/words.css (theme tokens + parts); this file only builds the same parts again and again from data. */
// ---- the two extra screens (test builder, report) join the curriculum app's show() ----
const ewExtra=['ewTest','ewReport'];
const _ewShow=show;
show=function(id){
  if(ewExtra.includes(id)){ stopVoice(); hideHint(); ['welcome','subjects','map','lesson','exam',...ewExtra].forEach(s=>{ const e=$('#'+s); if(e) e.hidden=s!==id; }); [document.documentElement,document.body].forEach(e=>e.dataset.view=id); return; }
  ewExtra.forEach(s=>{ const e=$('#'+s); if(e) e.hidden=true; }); _ewShow(id);
};

// ---- drawings: the logo and the subject icons use the Easy Study logo's own font, white fill, dark outline, stickers ----
const EW_STAR=(()=>{ const p=[]; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, r=i%2?13:30; p.push((r*Math.cos(a)).toFixed(1)+','+(r*Math.sin(a)).toFixed(1)); } return 'M'+p.join('L')+'Z'; })();
function ewDefs(){
  let hatch=''; for(let i=0;i<18;i++) hatch+=`<line x1="${-60+i*7}" y1="40" x2="${-60+i*7+60}" y2="-40"/>`;
  $('#ewDefs').innerHTML=`<linearGradient id="ewg" x1="0" y1="0" x2="0" y2="1"><stop offset=".25" stop-color="#fff"/><stop offset="1" stop-color="#d6e4e6"/></linearGradient>
  <filter id="ews" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".3"/></filter>
  <clipPath id="ewsc"><path d="${EW_STAR}"/></clipPath>
  <g id="ewstar"><path d="${EW_STAR}" fill="#fff" stroke="#fff" stroke-width="9" stroke-linejoin="round" transform="rotate(12)"/><g transform="rotate(12)"><path d="${EW_STAR}" fill="#2f7a86"/><g clip-path="url(#ewsc)" stroke="#1f5f6b" stroke-width="2" opacity=".8">${hatch}</g></g></g>`;
}
const ewT=(t,x,y,fs,sw,rot,ar)=>`<text x="${x}" y="${y}" text-anchor="middle" class="ewt${ar?' ewa':''}" fill="url(#ewg)" stroke="#1d4f57" font-size="${fs}" stroke-width="${sw}" transform="rotate(${rot} ${x} ${y})">${t}</text>`;
const ewStar=(x,y,s)=>`<g filter="url(#ews)" transform="translate(${x},${y}) scale(${s})"><use href="#ewstar"/></g>`;
// kind: 'app' | a subject id. Same layout as the Easy Study logo: small word on top, big word below, a big sticker where the star is.
function ewIcon(kind){
  if(kind==='app') return `<svg viewBox="0 0 240 240" aria-hidden="true"><g transform="translate(0,-4)">${ewT('EASY',100,112,46,8,-5)}${ewT('WORDS',120,178,66,11,2)}${ewStar(196,88,1.2)}${ewStar(34,82,.5)}</g></svg>`;
  const d=EW_SUBJ[kind]; if(!d) return '';
  if(d.lang==='ar') return `<svg viewBox="0 0 240 240" aria-hidden="true">${ewT(d.small,120,86,60,9,-3,1)}${ewT(d.big,120,188,84,11,2,1)}</svg>`;
  return `<svg viewBox="0 0 240 240" aria-hidden="true">${ewT(d.small,88,92,35,8,-5)}${ewT(d.sub,120,178,66,11,2)}${ewT(d.big,176,134,66,9,8)}</svg>`;
}

// ---- the first screen: which curriculum ----
function ewPick(){
  const L=ewChoices();
  $('#ewPick').innerHTML=`<div class="ew-logo big">${ewIcon('app')}</div><h2 class="ew-h">اختار المنهج</h2><div class="ew-picks">${L.map(c=>`<button class="ew-pickb" data-id="${c.id}"><b>${c.ar}</b>${c.full?`<small>${c.full}</small>`:''}</button>`).join('')}</div>`;
  $$('#ewPick .ew-pickb').forEach(b=>b.addEventListener('click',()=>{ EW.curr=b.dataset.id; try{ localStorage.setItem('ew.curr',EW.curr); }catch(e){} openSubjects(); }));
  show('welcome');
}

// ---- home: the subjects as icons ----
function openSubjects(){
  if(!EW.curr) return ewPick();
  SUBJECT=null; EW.cur=null; show('subjects'); ewHome();
}
function ewHome(){
  $('#ewHomeLogo').innerHTML=ewIcon('app'); paintHud();
  $('#ewGrade').textContent='الصف الأول الابتدائي · الترم الأول';
  const subs=ewSubjects(); const box=$('#ewHome'); box.dataset.n=subs.length;
  box.innerHTML=subs.map(s=>`<button class="ew-subj" data-id="${s.id}" aria-label="${EW_SUBJ[s.id].name}"><span class="ew-icon">${ewIcon(s.id)}</span></button>`).join('')||'<p class="ew-empty">قريبًا</p>';
  $$('#ewHome .ew-subj').forEach(b=>b.addEventListener('click',()=>{ blip(600); EW.cur=COURSE.subjects.find(s=>s.id===b.dataset.id); openMap(); }));
}

// ---- subject map ----
async function openMap(){
  const s=EW.cur; if(!s||!EW_SUBJ[s.id]) return openSubjects();
  SUBJECT=s; busy(true);
  try{ for(const u of ewUnits(s)) for(const l of u.lessons) if(l.open) await ewLesson(l.id); }catch(e){}
  busy(false); show('map'); ewDrawMap(s);
}
function ewDrawMap(s){
  $('#ewMapTitle').textContent=EW_SUBJ[s.id].name; $('#ewMapTitle').dir=EW_SUBJ[s.id].lang==='ar'?'rtl':'ltr'; paintHud();
  const ar=EW_SUBJ[s.id].lang==='ar', body=$('#ewMapBody'); body.scrollTop=0;
  body.innerHTML=ewUnits(s).map(u=>`<section class="ew-unit"><div class="ew-utab" dir="${ar?'rtl':'ltr'}"><span>${u.name}</span></div><div class="ew-ubody">`+u.lessons.map(l=>{
    const L=l.open&&EW.les[l.id], num=ar?ewN(l.lesson):l.lesson;
    return `<div class="ew-lrow${L?'':' solo'}"><button class="ew-lsq${l.open?'':' soon'}" data-id="${l.id}" ${l.open?'':'disabled'}><b class="ew-lnum">${num}</b><span class="ew-lname" dir="${ar?'rtl':'ltr'}">${l.name}</span>${l.open?'':'<i>قريبًا</i>'}</button>`+
      (L?`<div class="ew-words">${L.vocab.map((v,i)=>`<button class="ew-wsq" data-id="${l.id}" data-i="${i}" aria-label="${v.word}"><span class="ew-wimg">${v.img?`<img src="${v.img}" alt=""${/\.png$/i.test(v.img)?' class="cut"':''}>`:''}</span><b dir="${ar?'rtl':'ltr'}">${v.word}</b>${(VDONE[l.id]||[]).includes(v.word)?`<span class="vst">${STAR(true)}</span>`:''}</button>`).join('')}</div>`:'')+`</div>`; }).join('')+`</div></section>`).join('');
  $$('#ewMapBody .ew-lsq:not(.soon)').forEach(b=>b.addEventListener('click',()=>{ blip(600); ewOpenLesson(b.dataset.id,0); }));
  $$('#ewMapBody .ew-wsq').forEach(b=>b.addEventListener('click',()=>{ blip(600); ewOpenLesson(b.dataset.id,+b.dataset.i,true); }));
}
;
/* ===== js/words-lesson.js ===== */
/* EASY WORDS — the lesson screen. It IS the curriculum app's lesson screen (js/lesson.js tab bar + js/vocab.js words template: say the word 3 times with its syllables,
   helper buttons, then the child writes it). Only two tabs: Words (that template, untouched) and Practice (js/words-practice.js). */
TABS.practice=['Practice','quiz']; PARTS.push(['practice','Practice']);
// the dots under the question: one per QUESTION of the round, a gap between the groups; the one on screen is solid; tap a dot to go to that question
function lnavPaint(){
  const d=$('#lmDots'); if(!d) return;
  if(tab!=='practice'||!ep.groups||ep.qs.length<2||!ep.qs[ep.i]){ d.hidden=true; d.innerHTML=''; return; }
  const cur=ep.i; d.hidden=false; d.innerHTML=ep.qs.map((q,k)=>`<button class="ldot${k===cur?' on':''}${q.done?' done':''}${k&&q.g!==ep.qs[k-1].g?' gs':''}" aria-label="${k+1}"></button>`).join('');
  $$('.ldot',d).forEach((b,k)=>b.addEventListener('click',()=>epGo(k)));
  const on=$('.ldot.on',d); if(on) d.scrollLeft=on.offsetLeft-d.clientWidth/2+on.offsetWidth/2;
}
// the subject decides the text language (isAr) and keyboard: a mixed list (weak words, test) switches it word by word
function ewSubjFor(v){ const s=v&&ewSubjOf(v.lid||''); if(s&&SUBJECT!==s){ SUBJECT=s; subjDir(); } }
const _ewRender=vRender; vRender=function(f){ if(LESSON&&LESSON.virtual) ewSubjFor(LESSON.vocab[vs.i]); return _ewRender(f); };
const _ewStop=stopVoice; stopVoice=function(){ if(typeof ep!=='undefined') ep.run++; return _ewStop.apply(this,arguments); };
const _ewSwitch=switchTab;
switchTab=function(t,at){
  const L=$('#lesson'); L.classList.remove('ptab','qtab');
  if(t!=='practice'){ const r=_ewSwitch(t,at); lnavPaint(); return r; }
  setLook(t); if(WP.saved) wpClose(); stopVoice(); { const r=$('#lmeta .lm-r'); if(r) r.innerHTML=''; } hideHint();
  L.classList.remove('vtab','story','poem'); document.body.classList.remove('typing','kb');
  tab=t; paintTabs(); L.classList.add('qtab','ptab'); setRail([]); epStart(); pop('#stage > *',{scale:.85,y:10});
};
function ewTitle(L,s){
  const ar=EW_SUBJ[s.id].lang==='ar';
  return L.virtual?L.title:ar?`الوحدة ${ewN(L.unit)} - الدرس ${ewN(L.lesson)} - ${L.title}`:`Unit ${L.unit} - Lesson ${L.lesson} - ${L.title}`;
}
// open a prepared lesson object (a real lesson, or a made-up one of words picked from many lessons)
function ewEnter(L,at){
  stopVoice(); LESSON=L; player.bufs={}; player.ready=null; rd.page=1; rd.done={}; rd.halted=false; rd.hold=false; vs.i=Math.max(0,Math.min(at||0,L.vocab.length-1));
  const s=ewSubjOf(L.vocab[0]?L.vocab[0].lid:L.id)||SUBJECT; SUBJECT=s; show('lesson');
  $('#lessonMeta').textContent=L.virtual?'Easy Words':EW_SUBJ[s.id].name; $('#lessonTitle').textContent=ewTitle(L,s);
  $('#lessonTitle').dir=L.virtual||EW_SUBJ[s.id].lang==='ar'?'rtl':'ltr';
  switchTab(L.startTab||'words'); fitTitle(); pop('.l-head > *',{y:-20}); pop('.tabs .tab',{y:30,delay:.1});
}
async function ewOpenLesson(id,at){
  stopVoice(); busy(true); let L=null; try{ L=await ewLesson(id); }catch(e){} busy(false);
  if(!L) return message('أوبس!','الدرس ما اتفتحش. اتأكد من النت وجرب تاني.');
  SUBJECT=ewSubjOf(id); EW.cur=SUBJECT; L.virtual=false; ewEnter(L,at);
}
// a lesson made of chosen words (weak words, a test): same lesson screen, same two tabs
function ewVirtual(id,title,vocab,extra){
  const src=EW.les[vocab[0]&&vocab[0].lid]||{};
  return Object.assign({id,title,vocab,virtual:true,tabs:['words','practice'],tabLabels:{words:'كلمات',practice:'تدريبات'},hints:src.hints||{},base:'',unit:0,lesson:0,subj:src.subj,vocabRepeats:src.vocabRepeats||3},extra||{});
}
// the words tab ends with the same stars popup as the curriculum app; its "Map" button comes back to the units
$('#lvlMap').textContent='الدروس'; $('#lvlAgain').textContent='تاني';
;
/* ===== js/words-practice.js ===== */
/* EASY WORDS — the Practice tab. A few question TEMPLATES (not one page per question); every round is made from DATA: the words of the lesson (or of the chosen
   units / lessons / words in a test, or the child's weak words), picked at random each time, so the missing letters, the scrambled word, the pictures to link
   are different on every round. Template list (Ahmed 2026-11-13): missing letter(s) · put the letters in order · picture, write the whole word · link words to pictures.
   Words are shown with the curriculum app's ONE word component (wsFill, js/wordslots.js); the picture/head/dots parts reuse the curriculum app's question layout (.quiz). */
const ep={ run:0, qs:[], i:0, bad:0, pool:[], n:5, types:[], src:'lesson', busy:false, held:null };
const EP_TASK={ ar:{ missing:'اكتب الحرف الناقص', missing2:'اكتب الحروف الناقصة', order:'رتّب الحروف علشان تكوّن الكلمة', picture:'اكتب اسم الصورة', match:'وصّل كل كلمة بصورتها' },
  en:{ missing:'Write the missing letter', missing2:'Write the missing letters', order:'Put the letters in order to make the word', picture:'Write the name of the picture', match:'Match each word with its picture' } };
const epShuffle=a=>{ const b=a.slice(); for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; };
const epGl=w=>glyphs(String(w)), epIdx=w=>epGl(w).map((g,i)=>g===' '?-1:i).filter(i=>i>=0);   // glyph numbers that are letters (not spaces)
const epWait=(ms,run)=>new Promise((ok,no)=>setTimeout(()=>run===ep.run?ok():no('stop'),ms));
const epSay=v=>Promise.race([sayWord(v).catch(()=>0),new Promise(r=>setTimeout(r,2600))]);
const EP_CAN={
  missing:(v)=>epIdx(v.word).length>=3,
  order:(v)=>epIdx(v.word).length>=3,
  picture:(v)=>!!v.img,
  match:(v,pool)=>!!v.img&&pool.filter(x=>x.img).length>=3
};
// the round is made of GROUPS, one per question template (like the exercise groups of the curriculum app); each group has `per` questions, the words at random,
// never the same word twice in a row. The dots under the question are the groups; the stars above it are the questions of the group on screen.
function epBuild(pool,per,types){
  const out=[]; let last=null; ep.groups=[];
  types.forEach(t=>{
    const ok=pool.filter(v=>EP_CAN[t](v,pool)); if(!ok.length) return;
    const g=ep.groups.length, start=out.length; let bag=[];
    for(let k=0;k<per;k++){
      if(!bag.length) bag=epShuffle(ok);
      let v=bag.pop(); if(ok.length>1&&v===last&&bag.length){ const w=bag.pop(); bag.push(v); v=w; }
      last=v; const q={t,v,g};
      if(t==='missing'){ const ix=epIdx(v.word), many=ix.length>=6; q.hide=epShuffle(ix).slice(0,many?2:1).sort((a,b)=>a-b); }
      if(t==='match'){ const others=epShuffle(pool.filter(x=>x.img&&x!==v&&x.word!==v.word)); q.set=epShuffle([v,...others.slice(0,Math.min(3,others.length))]); }
      out.push(q);
    }
    ep.groups.push({t,start,n:per});
  });
  return out;
}
// start a round. o = {pool,n,types,src,title} or nothing = the open lesson's own words
function epStart(o){
  o=o||{}; ep.run++; ep.pool=(o.pool||(LESSON.ep&&LESSON.ep.pool)||LESSON.vocab).filter(v=>v&&v.word);
  ep.n=o.n||(LESSON.ep&&LESSON.ep.n)||(EW.cfg&&EW.cfg.questions)||5;
  ep.types=(o.types||(LESSON.ep&&LESSON.ep.types)||(EW.cfg&&EW.cfg.types)||['missing','order','picture','match']).filter(t=>EP_CAN[t]&&ep.pool.some(v=>EP_CAN[t](v,ep.pool)));
  ep.src=o.src||LESSON.epSrc||'lesson'; ep.i=0; ep.bad=0; ep.busy=false; ep.lastG=-1;
  if(!ep.pool.length){ $('#stage').innerHTML='<div class="ew-empty">مفيش كلمات للتدريب</div>'; return; }
  if(!ep.types.length) ep.types=['order'];
  const total=!!(o.n||(LESSON.ep&&LESSON.ep.n)); ep.qs=epBuild(ep.pool,total?Math.max(1,Math.ceil(ep.n/ep.types.length)):ep.n,ep.types); epLayout(); epShow();
}
function epLayout(){ const L=$('#lesson'), land=innerWidth>innerHeight*1.1; L.classList.toggle('q-land',land); L.classList.toggle('q-port',!land); }
addEventListener('resize',()=>{ if(tab==='practice') epLayout(); });
function epGrp(){ return ep.groups[ep.qs[ep.i].g]; }
function epDots(){ const g=epGrp(); return Array.from({length:g.n},(_,k)=>`<i data-i="${g.start+k}">${STAR(false)}</i>`).join(''); }
function epHelpBtn(fn){ const r=$('#lmeta .lm-r'); if(!r) return; r.replaceChildren(); if(!fn) return; const hb=el('button','qhelpb',ICON.hint); hb.setAttribute('aria-label','ساعدني'); hb.onclick=()=>{ if(!ep.busy) fn(); }; r.append(hb); }
function epShow(){
  const q=ep.qs[ep.i], st=$('#stage'); stopVoice(); const run=ep.run; ep.busy=false; hideHint();   // (stopVoice makes a new run number: the question before can no longer act)
  const s=ewSubjOf(q.v.lid||'')||SUBJECT; if(s&&SUBJECT!==s){ SUBJECT=s; subjDir(); }
  st.innerHTML=''; const w=el('div','quiz ep'), say=typeof SAY_LN==='string'?SAY_LN:ICON.sound, task=q.t==='missing'&&q.hide.length>1?'missing2':q.t, lg=EW_SUBJ[(ewSubjOf(q.v.lid||'')||{}).id]?.lang==='ar'?'ar':'en';
  w.dataset.type=q.t==='match'?'link':'type'; w.dataset.ep=q.t; w.lang=EW_SUBJ[(ewSubjOf(q.v.lid||'')||{}).id]?.lang==='ar'?'ar':'en';
  w.innerHTML=`<div class="qhead"><span class="qtask">${EP_TASK[lg][task]}</span></div><div class="qdots"></div>
    <div class="qword" dir="ltr"><b></b><button class="qsay" aria-label="اسمع">${say}</button></div><div class="qplay"></div><div class="qans"></div>`;
  st.append(w); const dots=$('.qdots',w); dots.style.setProperty('--n',epGrp().n); dots.innerHTML=epDots();
  $$('i',dots).forEach(d=>{ const k=+d.dataset.i; d.classList.toggle('cur',k===ep.i); if(k<ep.i){ d.innerHTML=STAR(true); d.classList.add('got'); } });
  $('.qword .qsay',w).addEventListener('click',e=>{ e.stopPropagation(); epSay(q.v); });
  q.bad=0; q.try=0;
  // the header is read once when a new group (exercise) starts, and again when it is tapped (same as the curriculum app's qTask)
  const tk=$('.qtask',w), say_task=()=>{ tk.classList.add('lit'); const dn=()=>tk.classList.remove('lit'); return tts(EP_TASK[lg][task],lg,.85).then(dn,dn); };
  ep.taskP=ep.lastG!==q.g?say_task():Promise.resolve(); ep.lastG=q.g; tk.addEventListener('click',()=>{ if(!ep.busy) say_task(); });
  ({missing:epMissing,order:epOrder,picture:epPicture,match:epMatch})[q.t](q,w,run); lnavPaint();
  if(anim) G.fromTo(w,{opacity:0,y:14},{opacity:1,y:0,duration:.25});
}
// the right answer: celebrate, say the word, record it for the report, next question
async function epRight(q,w,run,wordsOk){
  if(ep.busy||run!==ep.run) return; ep.busy=true; epHelpBtn(null);
  const bad=q.t==='match'?(wordsOk.some(x=>!x.ok)):q.bad; if(bad) ep.bad++;
  if(q.t==='match') wordsOk.forEach(x=>ewRec(x.v,x.ok)); else ewRec(q.v,!q.bad);
  q.done=1; const d=$(`.qdots i[data-i="${ep.i}"]`,w); if(d){ d.innerHTML=STAR(true); d.classList.add('got'); if(anim) G.fromTo(d,{scale:1.8},{scale:1,duration:.6,ease:'elastic.out(1.2,.4)'}); }
  celebrate(q.t==='match'?$('.epm',w):($('.qword b',w)||w));
  try{ const ip=$('#qin'); if(ip) ip.blur(); if(q.t!=='match') await epSay(q.v); await epWait(900,run); }catch(e){ return; }
  if(run!==ep.run) return;
  if(ep.i<ep.qs.length-1){ ep.i++; epShow(); } else epFinish();
}
const epMark=/^[ؐ-ًؚ-ٰٟۖ-ۭ]$/;
// typing a hidden letter (missing letter(s) and "write the whole word"): same typing behaviour as the words tab (a wrong letter is never written; the place shakes)
function epTyper(q,w,hide,run){
  const box=$('.qword b',w), gl=epGl(q.v.word), ar=!!(SUBJECT&&SUBJECT.rtl), inp=el('input','qin'); let k=0, typed='';
  wsFill(box,q.v.word,{hide,ltr:!ar}); wsCur(box);
  Object.assign(inp,{type:'text',id:'qin',autocomplete:'off',spellcheck:false}); wsInput(inp,q.v.word,ar?'ar':'en'); inp.setAttribute('enterkeyhint','done'); $('.qword',w).append(inp);
  const lt=i=>$(`.lt[data-i="${i}"]`,box);
  inp.addEventListener('input',()=>{
    if(ep.busy||run!==ep.run) return; hideHint(); const val=inp.value.replace(/\s/g,'');
    if(val.startsWith(typed)){
      for(const ch of val.slice(typed.length)){
        if(k>=hide.length) break; const want=gl[hide[k]];
        if(ar&&epMark.test(ch)){ typed+=ch; continue; }
        if(ar?sameLetter(ch,want):ch.toLowerCase()===want.toLowerCase()){ const b=lt(hide[k]); b.classList.remove('hid','peek'); b.classList.add('got'); typed+=ch; blip(560+k*40,.05); if(anim&&!ar) G.fromTo(b,{scale:1.3},{scale:1,duration:.35,ease:'back.out(3)'}); k++; wsCur(box); }
        else { tone(170,'square',.06,.18); wsBad(lt(hide[k])||box); q.bad=1; break; }
      }
    }
    inp.value=typed; if(k>=hide.length) epRight(q,w,run);
  });
  $('.qword',w).addEventListener('click',e=>{ if(!e.target.closest('.qsay')) inp.focus({preventScroll:true}); });
  epHelpBtn(()=>{ if(k>=hide.length) return; const b=lt(hide[k]); if(!b) return; b.classList.add('peek'); setTimeout(()=>b.classList.remove('peek'),tokMs('--help-letter-ms',1500)); inp.focus({preventScroll:true}); });
  setTimeout(()=>{ if(run===ep.run&&tab==='practice') inp.focus({preventScroll:true}); },250);   // (a phone only opens the keyboard right after a tap; the first question comes from a tap on the Practice tab)
  return inp;
}
function epPic(q,w){ if(q.v.img){ $('.qplay',w).append(el('div','qpic one',`<img src="${q.v.img}" alt=""${/\.png$/i.test(q.v.img)?' class="cut"':''}>`)); } }
// 1) missing letter(s)
function epMissing(q,w,run){ epPic(q,w); epTyper(q,w,q.hide,run); const tp=ep.taskP||Promise.resolve(); tp.then(()=>setTimeout(()=>{ if(run===ep.run) epSay(q.v); },400)); }
// 3) a picture, write the whole word
function epPicture(q,w,run){ epPic(q,w); epTyper(q,w,epIdx(q.v.word),run); }
// 2) the letters scrambled: tap them in order
function epOrder(q,w,run){
  epPic(q,w); const box=$('.qword b',w), gl=epGl(q.v.word), ix=epIdx(q.v.word), ar=!!(SUBJECT&&SUBJECT.rtl);
  wsFill(box,q.v.word,{hide:true,ltr:!ar}); wsCur(box);
  let tiles=epShuffle(ix.map(i=>({i,g:gl[i]}))); for(let t=0;t<6&&ix.length>1&&tiles.every((x,k)=>x.i===ix[k]);t++) tiles=epShuffle(tiles);
  const ans=$('.qans',w); ans.classList.add('ep-tiles'); ans.dir=ar?'rtl':'ltr'; let k=0;
  tiles.forEach(t=>{ const b=el('button','eptile',`<span class="${/[؀-ۿ]/.test(t.g)?'ewa':''}">${t.g}</span>`); b.dataset.i=t.i;
    b.addEventListener('click',()=>{ if(ep.busy||run!==ep.run||b.disabled) return; const want=gl[ix[k]];
      if(ar?sameLetter(t.g,want):t.g.toLowerCase()===want.toLowerCase()){ const l=$(`.lt[data-i="${ix[k]}"]`,box); l.classList.remove('hid','peek'); l.classList.add('got'); b.disabled=true; b.classList.add('used'); blip(560+k*40,.05); k++; wsCur(box); if(k>=ix.length) epRight(q,w,run); }
      else { tone(170,'square',.06,.18); q.bad=1; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); setTimeout(()=>b.classList.remove('shake'),450); } });
    ans.append(b); });
  epHelpBtn(()=>{ const want=gl[ix[k]]; const hit=$$('.eptile:not(.used)',ans).find(b=>{ const g=gl[+b.dataset.i]; return ar?sameLetter(g,want):g.toLowerCase()===want.toLowerCase(); }); if(hit){ hit.classList.add('glow'); setTimeout(()=>hit.classList.remove('glow'),tokMs('--help-pick-ms',2000)); } });
  setTimeout(()=>{ if(run===ep.run) epSay(q.v); },500);
}
// 4) link every word to its picture: the curriculum app's own link board (classes, line drawing, layout), drag a line or tap the word then the picture
function epMatch(q,w,run){
  $('.qword',w).hidden=true; const set=q.set, ok=set.map(v=>({v,ok:true})), n=set.length;
  const items=set.map(v=>({word:v.word,picSrc:v.img})), bd=el('div','qlink'); bd.dataset.n=n; bd.style.setProperty('--n',n); bd._set={items,layout:$('#lesson').classList.contains('q-land')?'':'cols'}; bd._pairs=[];
  const wd=el('div','qlw'), pc=el('div','qlp'); let ord=items.map((_,k)=>k); for(let t=0;t<30;t++){ ord.sort(()=>Math.random()-.5); if(n<2||ord.every((v,k)=>v!==k)) break; }
  set.forEach((v,k)=>{ const b=el('button','qlk qlkw',`<b dir="${v.lang==='ar'?'rtl':'ltr'}">${v.word}</b>`); b.dataset.k=k; wd.append(b); });
  ord.forEach(k=>{ const b=el('button','qlk qlkp',`<img src="${items[k].picSrc}" alt="" draggable="false">`); b.dataset.k=k; b.setAttribute('aria-label','Picture'); pc.append(b); });
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','qlsvg'); bd.append(wd,pc,svg); $('.qplay',w).append(bd);
  let drag=null, sel=null, done=0; const rel=(x,y)=>{ const B=bd.getBoundingClientRect(); return [x-B.left,y-B.top]; }, kind=b=>b.classList.contains('qlkw')?'w':'p';
  const tmp=()=>{ let l=$('.qtmp',svg); if(!l){ l=document.createElementNS('http://www.w3.org/2000/svg','line'); l.setAttribute('class','qtmp'); svg.append(l); } return l; };
  const clearSel=()=>{ if(sel){ sel.classList.remove('sel'); sel=null; } };
  const tryJoin=(a,b)=>{ const wb=kind(a)==='w'?a:b, pb=wb===a?b:a;
    if(wb.dataset.k!==pb.dataset.k){ const l=qLinkLine(bd,wb,pb,'qlj bad'); setTimeout(()=>l.remove(),500); qBad([wb,pb]); ok[+wb.dataset.k].ok=false; return; }
    wb.classList.add('done'); pb.classList.add('done'); bd._pairs.push([wb,pb]); const l=qLinkLine(bd,wb,pb);
    if(anim){ const len=l.getTotalLength?l.getTotalLength():300; G.fromTo(l,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.35,ease:'power2.out'}); }
    celebrate(pb); blip(620+done*60,.06); done++; if(done>=n) epRight(q,w,run,ok); else epSay(set[+wb.dataset.k]); };
  bd.addEventListener('pointerdown',e=>{ const b=e.target.closest('.qlk'); if(!b||ep.busy||run!==ep.run) return; e.preventDefault(); hideHint();
    if(b.classList.contains('done')){ if(kind(b)==='w') epSay(set[+b.dataset.k]); return; }
    drag={b,x:e.clientX,y:e.clientY,moved:false}; try{ bd.setPointerCapture(e.pointerId); }catch(_){} });
  bd.addEventListener('pointermove',e=>{ if(!drag) return; if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10) return; drag.moved=true;
    const [a,b]=qAnchor(bd,drag.b,kind(drag.b)==='w'), [x,y]=rel(e.clientX,e.clientY), l=tmp(); l.setAttribute('x1',a); l.setAttribute('y1',b); l.setAttribute('x2',x); l.setAttribute('y2',y); });
  const end=e=>{ if(!drag) return; const d=drag; drag=null; const l=$('.qtmp',svg); if(l) l.remove();
    const t=e.type==='pointerup'&&document.elementFromPoint(e.clientX,e.clientY); let tb=t&&t.closest&&t.closest('.qlk');
    if(e.type==='pointerup'&&(!tb||kind(tb)===kind(d.b))){ let best=null,bd2=1e9; $$('.qlk',bd).forEach(c=>{ if(kind(c)===kind(d.b)||c.classList.contains('done')) return; const r=c.getBoundingClientRect(), dx=Math.max(r.left-e.clientX,0,e.clientX-r.right), dy=Math.max(r.top-e.clientY,0,e.clientY-r.bottom), dd=Math.hypot(dx,dy); if(dd<bd2){ bd2=dd; best=c; } }); tb=bd2<=60?best:null; }
    if(e.type==='pointercancel') return;
    if(d.moved){ clearSel(); if(tb&&tb!==d.b&&kind(tb)!==kind(d.b)&&!tb.classList.contains('done')) tryJoin(d.b,tb); return; }
    if(kind(d.b)==='w') epSay(set[+d.b.dataset.k]);
    if(sel&&sel!==d.b&&kind(sel)!==kind(d.b)){ const a=sel; clearSel(); tryJoin(a,d.b); return; }
    if(sel===d.b){ clearSel(); return; } clearSel(); sel=d.b; d.b.classList.add('sel'); };
  bd.addEventListener('pointerup',end); bd.addEventListener('pointercancel',end);
  qLinkRefresh($('#lesson').classList.contains('q-land'));
  epHelpBtn(()=>{ const wb=$$('.qlkw',bd).find(b=>!b.classList.contains('done')); if(!wb) return; [wb,$$('.qlkp',bd).find(b=>b.dataset.k===wb.dataset.k)].forEach(x=>{ x.classList.add('qhl'); setTimeout(()=>x.classList.remove('qhl'),tokMs('--help-pick-ms',2000)); }); });
}
addEventListener('resize',()=>{ if(tab==='practice'&&$('.qlink')){ epLayout(); qLinkRefresh($('#lesson').classList.contains('q-land')); } });
// end of a round: the lesson's practice star is earned; a test is logged for the report; the stars popup (js/words-popup.js)
function epFinish(){
  const n=ep.qs.length, right=n-ep.bad;
  EW.log.push({t:Date.now(),n,right,src:ep.src}); ewSave();
  if(ep.src==='lesson'&&LESSON&&!LESSON.virtual){ const id=LESSON.id; STARS[id]=STARS[id]||{}; if(!STARS[id].practice){ STARS[id].practice=1; try{ localStorage.setItem('zoom-stars',JSON.stringify(STARS)); }catch(e){} } paintHud(); paintTabs(); }
  epHelpBtn(null); ewPopup('practice',{right,n});
}

// move between QUESTIONS (not groups): the dots under the question, or a swipe with the finger / drag with the mouse on the question
function epGo(i){ if(ep.busy||i<0||i>=ep.qs.length||i===ep.i) return; blip(600); ep.i=i; epShow(); }
(()=>{ let d=null; const st=$('#stage');
  st.addEventListener('pointerdown',e=>{ if(tab!=='practice'||e.target.closest('.qlk,.eptile,input,button')) return; d={x:e.clientX,y:e.clientY}; });
  const end=e=>{ if(!d) return; const dx=e.clientX-d.x, dy=e.clientY-d.y; d=null; if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5) epGo(ep.i+(dx<0?1:-1)); };
  st.addEventListener('pointerup',end); st.addEventListener('pointercancel',()=>{ d=null; }); })();
;
/* ===== js/words-test.js ===== */
/* EASY WORDS — the test builder (the ? button on a subject). The parent marks whole units, single lessons, single words, or any mix; chooses how many questions
   and which kinds; the questions then run one by one in the practice tab's own templates (not one test page). Units / lessons / words are collapsed:
   a tap opens one, the next tap closes it (the map itself keeps everything open). */
const et={ sel:new Set(), n:10, types:new Set(['missing','order','picture','match']), open:new Set() };
const ET_TYPES=[['missing','حرف ناقص'],['order','ترتيب الحروف'],['picture','صورة واكتب'],['match','توصيل']];
async function ewTestOpen(){
  const s=EW.cur; if(!s) return;
  busy(true); try{ for(const u of ewUnits(s)) for(const l of u.lessons) if(l.open) await ewLesson(l.id); }catch(e){} busy(false);
  et.sel=new Set(); et.open=new Set(); show('ewTest'); ewtDraw(s);
}
function ewtDraw(s){
  const ar=EW_SUBJ[s.id].lang==='ar', body=$('#ewTestBody'); body.scrollTop=0; $('#ewTestTitle').textContent='اختبار';
  const units=ewUnits(s);
  body.innerHTML=`<p class="ewt-help">علّم الوحدات أو الدروس أو الكلمات اللي عايز تختبره فيها</p>
  <div class="ewt-tree">${units.map(u=>{ const ls=u.lessons;
    return `<div class="ewt-node ewt-unit${ls.some(l=>l.open)?'':' soon'}" data-k="u${u.unit}"><div class="ewt-row"><button class="ewt-chk" aria-label="تحديد"></button><button class="ewt-name" dir="${ar?'rtl':'ltr'}"><span>${u.name}</span><small class="ewt-cnt"></small></button><i class="ewt-chev"></i></div>
      <div class="ewt-kids">${ls.map(l=>{ const L=l.open&&EW.les[l.id];
        return `<div class="ewt-node ewt-lesson${L?'':' soon'}" data-k="l${l.id}"><div class="ewt-row"><button class="ewt-chk" aria-label="تحديد"></button><button class="ewt-name" dir="${ar?'rtl':'ltr'}"><span>${ar?ewN(l.lesson):l.lesson} · ${l.name}</span><small class="ewt-cnt">${L?'':'قريبًا'}</small></button><i class="ewt-chev"></i></div>
          <div class="ewt-kids">${L?L.vocab.map(v=>`<div class="ewt-node ewt-word" data-k="w${v.key}"><div class="ewt-row"><button class="ewt-chk" aria-label="تحديد"></button><span class="ewt-wimg">${v.img?`<img src="${v.img}" alt="">`:''}</span><b dir="${v.lang==='ar'?'rtl':'ltr'}">${v.word}</b></div></div>`).join(''):''}</div></div>`; }).join('')}</div></div>`; }).join('')}</div>
  <div class="ewt-opts">
    <div class="ewt-grp"><b>عدد الأسئلة</b><div class="ewt-chips" data-g="n">${[5,10,15,20].map(n=>`<button class="ewt-chip${n===et.n?' on':''}" data-n="${n}">${ewN(n)}</button>`).join('')}</div></div>
    <div class="ewt-grp"><b>نوع الأسئلة</b><div class="ewt-chips" data-g="t">${ET_TYPES.map(([k,l])=>`<button class="ewt-chip${et.types.has(k)?' on':''}" data-t="${k}">${l}</button>`).join('')}</div></div>
    <div class="ewt-go"><button class="ewt-weak">اختار الكلمات الضعيفة</button><button class="ewt-all">اختار الكل</button><span class="ewt-sum"></span><button class="ewt-start pill green">ابدأ الاختبار</button></div>
  </div>`;
  ewtPaint();
}
const ewtWords=node=>{ const k=node.dataset.k; if(k[0]==='w') return [k.slice(1)]; return $$('.ewt-word',node).map(w=>w.dataset.k.slice(1)); };
function ewtPaint(){
  const body=$('#ewTestBody'), t=$('.ewt-start',body), n=et.sel.size;
  $$('.ewt-node',body).forEach(nd=>{ const all=ewtWords(nd), c=all.filter(k=>et.sel.has(k)).length;
    nd.classList.toggle('all',all.length>0&&c===all.length); nd.classList.toggle('some',c>0&&c<all.length); nd.classList.toggle('open',et.open.has(nd.dataset.k));
    const cnt=$('.ewt-cnt',nd); if(cnt&&!nd.classList.contains('soon')) cnt.textContent=all.length?`${ewN(c)}/${ewN(all.length)}`:''; });
  $('.ewt-sum',body).textContent=n?`${ewN(n)} كلمة مختارة`:'ما اخترتش كلمات'; t.disabled=!n||!et.types.size;
}
$('#ewTestBody').addEventListener('click',e=>{
  const body=$('#ewTestBody'), nd=e.target.closest('.ewt-node'), chip=e.target.closest('.ewt-chip');
  if(chip){ if(chip.dataset.n){ et.n=+chip.dataset.n; $$('[data-g="n"] .ewt-chip',body).forEach(c=>c.classList.toggle('on',c===chip)); } else { const k=chip.dataset.t; if(et.types.has(k)&&et.types.size>1) et.types.delete(k); else et.types.add(k); chip.classList.toggle('on',et.types.has(k)); ewtPaint(); } return; }
  if(e.target.closest('.ewt-all')){ $$('.ewt-word',body).forEach(w=>et.sel.add(w.dataset.k.slice(1))); ewtPaint(); return; }
  if(e.target.closest('.ewt-weak')){ et.sel=new Set(); $$('.ewt-word',body).forEach(w=>{ const key=w.dataset.k.slice(1); if(ewClass({key})==='weak') et.sel.add(key); }); ewtPaint(); return; }
  if(e.target.closest('.ewt-start')){ ewtStart(); return; }
  if(!nd||nd.classList.contains('soon')) return;
  if(e.target.closest('.ewt-chk')||(nd.classList.contains('ewt-word')&&e.target.closest('.ewt-row'))){ const all=ewtWords(nd), full=all.every(k=>et.sel.has(k)); all.forEach(k=>full?et.sel.delete(k):et.sel.add(k)); ewtPaint(); return; }
  if(e.target.closest('.ewt-row')){ const k=nd.dataset.k; if(et.open.has(k)) et.open.delete(k); else et.open.add(k); ewtPaint(); }   // a tap opens it, the next tap closes it
});
function ewtStart(){
  const pool=[]; Object.values(EW.les).forEach(L=>L.vocab.forEach(v=>{ if(et.sel.has(v.key)) pool.push(v); }));
  if(!pool.length) return;
  const L=ewVirtual('ew-test','اختبار',pool,{tabs:[],ep:{pool,n:et.n,types:[...et.types]},epSrc:'test',startTab:'practice'});
  ewEnter(L,0);
}
$('#ewTestBtn').addEventListener('click',()=>{ blip(600); ewTestOpen(); });
$('#ewTestBack').addEventListener('click',()=>openMap());
;
/* ===== js/words-report.js ===== */
/* EASY WORDS — a simple report for the parent: the words known well, the words to review, the weak words, tests taken and the average of the answers.
   "Learn my weak words" opens the usual words template (and practice) on those words only, whatever lesson they come from. */
async function ewReportOpen(){
  busy(true); let words=[]; try{ words=await ewAllWords(); }catch(e){} busy(false);
  show('ewReport'); const body=$('#ewRepBody'); body.scrollTop=0;
  const by={good:[],review:[],weak:[],new:[]}; words.forEach(v=>by[ewClass(v)].push(v));
  const tests=EW.log.filter(x=>x.src==='test').length, rounds=EW.log.length, qn=EW.log.reduce((a,x)=>a+x.n,0), qr=EW.log.reduce((a,x)=>a+x.right,0);
  const chips=l=>l.length?`<div class="ew-words rep">${l.map(v=>`<span class="ew-wsq"><span class="ew-wimg">${v.img?`<img src="${v.img}" alt="">`:''}</span><b dir="${v.lang==='ar'?'rtl':'ltr'}">${v.word}</b></span>`).join('')}</div>`:'<p class="ewt-help">—</p>';
  const sec=(k,title,l,extra)=>`<section class="ew-rsec ${k}"><div class="ew-rhead"><h3>${title} <em>${ewN(l.length)}</em></h3>${extra||''}</div>${chips(l)}</section>`;
  body.innerHTML=`<div class="ew-rsum"><div><b>${ewN(rounds)}</b><span>تدريبات واختبارات</span></div><div><b>${ewN(tests)}</b><span>اختبارات</span></div><div><b>${qn?ewN(Math.round(qr*100/qn))+'٪':'—'}</b><span>معدل الإجابات الصح</span></div></div>`+
    sec('weak','كلمات ضعيفة',by.weak,by.weak.length?'<button class="pill green ew-learnweak">اتعلم الكلمات الضعيفة</button>':'')+
    sec('review','محتاجة مراجعة',by.review)+sec('good','حافظها كويس',by.good)+sec('new','لسه ما اتسألتش',by.new);
  const b=$('.ew-learnweak',body); if(b) b.addEventListener('click',()=>{ const L=ewVirtual('ew-weak','الكلمات الضعيفة',by.weak); ewEnter(L,0); });
}
{ const b=$('#ewRepBtn'); if(b) b.addEventListener('click',()=>{ blip(600); ewReportOpen(); }); }
;
/* ===== js/words-popup.js ===== */
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
;
/* ===== js/words-start.js ===== */
/* EASY WORDS — start: load the data, then the first screen (curriculum picker the first time, then the subject icons). */
/* the stars popup (js/words-popup.js) replaces the curriculum app's level-up for both tabs. The curriculum is chosen the first time here; later it is changed in the account / student settings. */
levelUp=function(id,isNew){ ewPopup(tab==='practice'?'practice':'words'); };
async function ewStart(){
  busy(true);
  try{ await ewLoad(); }catch(e){ busy(false); message('أوبس!','التطبيق ما اتحملش. اتأكد من النت وجرب تاني.'); $('#msgOk').onclick=()=>location.reload(); return; }
  ewDefs(); await cssReady;
  if(document.fonts&&document.fonts.ready) await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]);
  paintHud(); busy(false);
  if(!EW.curr||!ewChoices().some(c=>c.id===EW.curr)){ EW.curr=null; ewPick(); } else openSubjects();
}
ewStart();
;
