const APP_BUILD='cb36a67cbb';
/* MADE BY tools/build-app.py from the files named below. Do not edit here: edit those files, then run the script again. */
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
function stopVoice(){ try{ if(typeof stopAll==='function') stopAll(); if(typeof vStop==='function') vStop(); if(typeof gramStop==='function') gramStop(); if(typeof nahwStop==='function') nahwStop(); }catch(e){} }   // gramStop: a running grammar animation stops too (it went on reading in the background into the next lesson)
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
function unlockSound(){
  if(SND.stale){ SND.stale=false; newSpeaker(); try{ speechSynthesis.cancel(); }catch(e){} }   // back from lock / another app: a fresh speaker
  try{ const c=ac(); if(c){ const b=c.createBuffer(1,1,22050), s=c.createBufferSource(); s.buffer=b; s.connect(c.destination); s.start(0); } }catch(e){}
  if(!unlocked||SND.wokeAt!==SND.ctx){ SND.wokeAt=SND.ctx;   // a tiny silent normal-audio play also wakes the phone's sound for the page
    try{ const a=new Audio(SILENT_WAV); a.volume=0; const p=a.play(); if(p&&p.catch) p.catch(()=>{}); }catch(e){} }
  try{ if('speechSynthesis' in window && !unlocked){ const u=new SpeechSynthesisUtterance('.'); u.volume=0.01; u.rate=2; speechSynthesis.speak(u); speechSynthesis.getVoices(); } }catch(e){}
  unlocked=true;
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
/* ===== js/curriculum.js ===== */
/* CURRICULUM — which subjects and books this child sees (Marwa 2026-11-05).
   data/curriculum.json holds the types (عام / تجريبي / private) and the private schools; the parent's pick is saved as
   {type, school} (es.curr, or the child profile later). currApply() filters the loaded data ONCE (home subjects, lessons,
   tabs, map signs, tests); every screen then simply shows what is there. Questions of a hidden book are dropped in qLoad
   (currSets) and lesson.json tabs in openLesson (currTabs). Never test for a school or subject anywhere else. */
let CURR=null, CURR_ALL=null;
const TAB_BOOK={read:'school',words:'school',quiz:'school',grammar:'school',workbook:'workbook',booklet:'booklet'};
const SET_BOOK={book:'school',workbook:'workbook',booklet:'booklet'};
function currPick(){ try{ const p=JSON.parse(localStorage.getItem('es.curr')||'null'); return p&&p.type?p:null; }catch(e){ return null; } }
function currSave(p){ try{ localStorage.setItem('es.curr',JSON.stringify(p)); }catch(e){} }
// the plan of a pick: {subjects:[ids], books:Set}. A private school = its base type + its own subjects and books.
function currPlan(p){
  const C=CURR||{types:[],schools:[]}, sc=p&&p.school&&C.schools.find(s=>s.id===p.school),
    ty=C.types.find(t=>t.id===(sc?sc.base:p&&p.type))||C.types.find(t=>t.subjects);
  if(!ty) return null;
  return {type:ty, school:sc||null, subjects:[...ty.subjects,...((sc&&sc.subjects)||[])], books:new Set([...ty.books,...((sc&&sc.books)||[])])};
}
let PLAN=null;
const bookOn=k=>!PLAN||PLAN.books.has(k);
const tabOn=t=>bookOn(TAB_BOOK[t]||'school');
const currTabs=ts=>ts&&ts.filter(tabOn);
const currSets=sets=>(sets||[]).filter(s=>bookOn(SET_BOOK[s.book||'book']||s.book));
function currExams(sid,list){ if(!list) return list; const eb=(CURR&&CURR.examBooks&&CURR.examBooks[sid]); const out=list.filter(e=>bookOn(e.book||eb||'school')); return out.length?out:undefined; }
// one lesson of the map, as this curriculum sees it (null = the lesson belongs only to hidden books)
function currLesson(sid,l){
  const m={...l}; let had=0, kept=0;
  if(l.pages){ m.pages={}; Object.entries(l.pages).forEach(([t,v])=>{ had++; if(tabOn(t)){ m.pages[t]=v; kept++; } }); }
  if(l.tabs){ m.tabs=currTabs(l.tabs); if(!m.tabs.length) return null; }
  else if(had&&!kept) return null;
  if(l.exams) m.exams=currExams(sid,l.exams);
  return m;
}
// filter COURSE for the pick (or show everything when nothing is picked yet). Safe to call again after the pick changes.
function currApply(p){
  if(!CURR_ALL) CURR_ALL=COURSE.subjects.map(s=>({...s}));
  PLAN=p?currPlan(p):null;
  const order=PLAN?PLAN.subjects:CURR_ALL.map(s=>s.id);
  COURSE.subjects=order.map(id=>CURR_ALL.find(s=>s.id===id)).filter(Boolean).map(s0=>{
    const s={...s0}; if(!s0.lessons) return s;
    s.lessons=s0.lessons.map(l=>currLesson(s.id,l)).filter(Boolean);
    s.units=(s0.units||[]).map(u=>u.exams?{...u,exams:currExams(s.id,u.exams)}:u);
    return s;
  });
  if(typeof SUBJECT!=='undefined'&&SUBJECT) SUBJECT=COURSE.subjects.find(s=>s.id===SUBJECT.id)||null;
}
;
/* ===== js/coins.js ===== */
/* COINS + ACCESS — who can open which subject / unit / lesson, the parent's coin wallet, the share sheet and the unlock popup
   (Marwa 2026-11-05, design: docs/coins-and-admin.md). Everything is driven by ONE settings object: data/settings.json, or the copy the
   admin dashboard (admin.html) saved on this device (localStorage es.settings). accessOf() in core.js asks coinAccess() here.
   LOCAL-FIRST: wallet, unlocks and free picks live on this device; the server (Cloudflare Worker + D1) replaces only the store functions below.
   Accounts hooks: coinParent() / coinChild() read window.ACCOUNT / window.CHILD when the accounts code sets them ({id,...}); else 'local'. */
let ESET={coins:{enabled:false,shares:[]},items:{},access:{}};
const coinParent=()=>(window.ACCOUNT&&ACCOUNT.id)||'local';
const coinChild=()=>(window.CHILD&&CHILD.id)||'';
const CS=()=>ESET.coins||{};
const coinsOn=()=>!!CS().enabled;
const cGet=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v; }catch(e){ return d; } };
const cSet=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
/* SERVER (Marwa 2026-11-05: coins for EVERY share + a bigger bonus when a new parent registers from the link). When settings "api" is set
   (e.g. "/api", the Worker built in its own thread), the server is the truth: settings from GET api/settings, and every coin action is
   ALSO sent there; its answer {wallet, unlocked, freeused} replaces the copy on this device. No api / offline = this device only (as now).
   API contract: docs/coins-and-admin.md §5. Auth = window.ACCOUNT.token (set by the accounts code) as "Authorization: Bearer". */
const API=()=>ESET.api||'';
function apiCall(path,body){ if(!API()) return Promise.resolve(null);
  const h={'Content-Type':'application/json'}; if(window.ACCOUNT&&ACCOUNT.token) h.Authorization='Bearer '+ACCOUNT.token;
  return fetch(API()+path,{method:body?'POST':'GET',headers:h,body:body?JSON.stringify(body):undefined}).then(r=>r.ok?r.json():null).catch(()=>null); }
function apiTake(r){ if(!r) return; if(r.wallet) walletSave(r.wallet); if(r.unlocked) cSet(unlockKey(),r.unlocked); if(r.freeused) cSet(freeKey(),r.freeused); paintHud(); }
// the referral: a link shared by a parent ends in ?r=<code>; it is kept on this device (es.ref) and the accounts code sends it with the sign-up
try{ const r=new URLSearchParams(location.search).get('r'); if(r&&!localStorage.getItem('es.ref')) localStorage.setItem('es.ref',JSON.stringify({code:r,at:Date.now()})); }catch(e){}
const refCode=()=>(cGet('es.ref',null)||{}).code||null;
const ESET_P=get('data/settings.json').catch(()=>null).then(async d=>{
  const local=cGet('es.settings',null); ESET=local||d||ESET;
  if(ESET.api){ const s=await apiCall('/settings'); if(s&&s.coins) ESET={...s,api:ESET.api}; apiTake(await apiCall('/wallet'+(coinChild()?'?child='+encodeURIComponent(coinChild()):''))); }
  ESET.items=ESET.items||{}; ESET.coins=ESET.coins||{shares:[]};
  if(typeof COURSE!=='undefined'&&COURSE){ paintHud(); if(!$('#subjects').hidden&&typeof drawSubjects==='function') drawSubjects(); else if(!$('#map').hidden&&typeof drawMap==='function') openMap(); }
});

/* ---------- store (this device) ---------- */
const unlockKey=()=>'es.unlocked';   // welcome.js swaps this key when the child changes (KID_KEYS), so it is per child already
const freeKey=()=>'es.freeused';   // per child too (welcome.js KID_KEYS)
function wallet(){ const k='es.wallet.'+coinParent(); let w=cGet(k,null);
  if(!w){ const g=+CS().startCoins||0; w={bal:g,hist:g?[{k:'gift',n:g,at:Date.now()}]:[],last:{}}; cSet(k,w); } return w; }
const walletSave=w=>cSet('es.wallet.'+coinParent(),w);
const coinBal=()=>wallet().bal;
function addUnlock(id,coins,kind){ const s=cGet(unlockKey(),[]); if(!s.includes(id)) s.push(id); cSet(unlockKey(),s);
  const w=wallet(); w.hist.push({k:kind,id,n:-coins,at:Date.now(),child:coinChild()}); w.bal-=coins; walletSave(w);
  apiCall('/unlock',{child:coinChild(),id,kind:kind==='unlock-unit'?'unit':'lesson'}).then(apiTake); }

/* ---------- where an item sits (for the free rules) ---------- */
// the subject of an id: 's:<subj>', 'u:<subj>:<unit>', 'l:<subj>-<folder>'
function subjOf(id){ if(!id) return null; const p=id.split(':'); if(p[0]==='s'||p[0]==='u') return COURSE.subjects.find(s=>s.id===p[1]);
  return COURSE.subjects.find(s=>s.lessons&&s.lessons.some(l=>'l:'+l.id===id)); }
function lessonOf(id){ const s=subjOf(id); return s&&s.lessons.find(l=>'l:'+l.id===id); }
const unitIdOf=(s,l)=>'u:'+s.id+':'+l.unit;

/* ---------- THE access rule ----------
   1. the admin's own state for this item (ESET.items[id].st = open | soon | locked) wins over everything (soon even when built)
   2. no content = soon
   3. coins off: the old rule (item "status" in the subject json, the free-trial rule in course.json "access")
   4. coins on: the free policy (ESET.access.free) decides; everything else is locked and costs coins (lesson or whole unit) */
function coinAccess(o,hasContent,id,idx,kind){
  const it=(id&&ESET.items[id])||{}, C=CS(), A=COURSE.access||{}, un=new Set(cGet(unlockKey(),[]));
  const cost=it.coins!=null?it.coins:o.coins!=null?o.coins:kind==='unit'?(+C.unitCost||0):id&&id[0]==='l'?(+C.lessonCost||0):(A.coins||0);
  const out=st=>({st,coins:cost,kind:kind||(id&&id[0]==='l'?'lesson':'subject')});
  if(it.st==='soon') return out('soon');
  if(!hasContent) return out('soon');
  if(it.st==='open') return out('open');
  if(id&&promoOpen(un,id)) return out('open');
  if(it.st==='locked') return out('locked');
  if(!coinsOn()){ let st=o.status||'open';
    if(st==='open'&&!o.status&&A.enabled&&A.trial&&kind==='unit'&&idx>=(A.trial.units||1)) st='locked';
    return out(st); }
  if(!id||id[0]==='s') return out(o.status||'open');   // coins never lock a whole subject (the admin can, with items)
  return out(isFree(id,kind,idx)?'open':'locked');
}
// opened for this child: the item itself, or (promo codes) its whole unit, its whole subject, or '*' = every subject
function promoOpen(un,id){ if(un.has(id)||un.has('*')) return true; const s=id[0]==='s'?null:subjOf(id); if(!s) return false;
  if(un.has('s:'+s.id)) return true; const l=id[0]==='l'&&lessonOf(id); return !!(l&&un.has(unitIdOf(s,l))); }
const coinUnlocked=id=>promoOpen(new Set(cGet(unlockKey(),[])),id);
// the free policy for a new child: ESET.access.free = {mode, count, list}
//  first      = the first <count> built lessons of every subject
//  firstUnit  = the first <count> units of every subject
//  pick       = the child picks <count> lessons anywhere (tap a locked lesson -> open it free)
//  pickUnit   = the child picks <count> whole units anywhere
//  list       = only the lessons / units the admin listed (ids like l:arabic-u1l1, u:math:1)
function isFree(id,kind,idx){
  const F=(ESET.access&&ESET.access.free)||{mode:'first',count:3}, n=+F.count||0, s=subjOf(id); if(!s) return true;
  if(F.mode===(kind==='unit'?'pickUnit':'pick')) return cGet(freeKey(),[]).includes(id);   // picked by the child = free
  if(kind==='unit'){ const ui=(s.units||[]).findIndex(u=>'u:'+s.id+':'+u.unit===id);
    if(F.mode==='firstUnit') return ui<n;
    if(F.mode==='pickUnit') return false;
    return true; }   // lesson modes never lock a whole unit: the locks sit on the lessons
  const l=lessonOf(id); if(!l) return true; const uid=unitIdOf(s,l);
  if(new Set(cGet(unlockKey(),[])).has(uid)) return true;
  if(F.mode==='first'){ const built=s.lessons.filter(x=>x.file&&!x.hidden); return built.indexOf(l)<n; }
  if(F.mode==='list') return (F.list||[]).includes(id)||(F.list||[]).includes(uid);
  return true;   // unit modes: the unit decides (the map locks its lessons); pick: locked until picked
}
// free picks left; perSubject (Marwa 2026-11-05: the child picks ONE free lesson in EACH subject) counts the picks of this subject only
function freeLeft(kind,sid){ const F=(ESET.access&&ESET.access.free)||{}; const want=kind==='unit'?'pickUnit':'pick';
  if(!coinsOn()||F.mode!==want) return 0; let used=cGet(freeKey(),[]);
  if(F.perSubject&&sid) used=used.filter(id=>{ const s=subjOf(id); return s&&s.id===sid; });
  return Math.max(0,(+F.count||0)-used.length); }
/* ---------- coin pictures ---------- */
const COIN=`<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="22" r="16" fill="#C98A12" stroke="var(--btn-ol)" stroke-width="2.6"/><circle cx="20" cy="19" r="16" fill="#FFD23F" stroke="var(--btn-ol)" stroke-width="2.6"/><circle cx="20" cy="19" r="11" fill="none" stroke="#E0A419" stroke-width="2.4"/><path d="M20 12v14M16.5 15.5h5.5a2.5 2.5 0 0 1 0 5h-4a2.5 2.5 0 0 0 0 5H24" fill="none" stroke="#B57A0C" stroke-width="2.6" stroke-linecap="round"/><path d="M11 13a11 11 0 0 1 6-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></svg>`;
const SHAREIC={
  'wa-chat':'<svg viewBox="0 0 24 24"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.3 2.300 2.300 4.300 4.700 4.800l1.100-1.200 1.700.8c-.3 1.100-1.300 1.800-2.400 1.600-3.200-.6-5.600-3-6.200-6.200-.2-1.100.5-2.100 1.600-2.400l.8 1.700z" fill="currentColor" stroke="none"/></svg>',
  'fb':'<svg viewBox="0 0 24 24"><path d="M14 8h2.500V4.500H14A4 4 0 0 0 10 8.500V11H7.500v3.500H10V21h3.500v-6.500H16l.5-3.500h-3V8.700c0-.4.3-.7.7-.7z" fill="currentColor" stroke="none"/></svg>',
  'messenger':'<svg viewBox="0 0 24 24"><path d="M12 3C7 3 3 6.700 3 11.300c0 2.600 1.300 4.900 3.300 6.400V21l3-1.700c.9.300 1.800.4 2.700.4 5 0 9-3.700 9-8.400S17 3 12 3z"/><path d="M7.500 13.500l3-3.200 2 2 3.500-2.300-3 3.300-2-2z" fill="currentColor"/></svg>',
  'telegram':'<svg viewBox="0 0 24 24"><path d="M3 11.500L20.500 4.500 17.500 19.500 11.500 15l-2.500 3v-4.500l8-7.500-10 6z"/></svg>',
  'copy':'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.500"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  'other':'<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.500"/><circle cx="18" cy="6" r="2.500"/><circle cx="18" cy="18" r="2.500"/><path d="M8.200 10.900l7.600-3.800M8.200 13.100l7.600 3.800"/></svg>'};
const shareIcon=id=>SHAREIC[id]||SHAREIC[/^wa/.test(id)?'wa-chat':/^fb/.test(id)?'fb':'other'];
const CT=(ar,en)=>ar;   // credits, share and unlock popups are for the PARENT: always Arabic (Marwa 2026-11-05), whatever the subject; en kept for later

/* ---------- CREDITS (Marwa 2026-11-05: "credits", not coins; shown ONLY in the parent's account, not on the child's screens) ----------
   The HUD chip is gone: coinPaint only removes an old one. The balance lives in the children popup (welcome.js kidMenu -> creditBtn). */
function coinPaint(){ $$('.coinhud').forEach(c=>c.remove()); }
const CRED=n=>`${num(n)} ${CT('كريدت','credits')}`;
const balLine=n=>`<div class="coinbig" dir="rtl"><span class="lab">${CT('رصيدك:','Balance:')}</span><span class="ic">${COIN}</span><b class="outline">${num(n)}</b></div>`;

/* ---------- popups (one overlay of our own, the app's popup look) ---------- */
function coinPop(html,onOpen){
  let o=$('#coinPop'); if(!o){ o=el('div','overlay'); o.id='coinPop'; document.body.append(o); o.addEventListener('click',e=>{ if(e.target===o) coinClose(); }); }
  o.innerHTML=`<div class="rays"></div><div class="popup coinpop" role="dialog"><button class="rb popx" aria-label="Close" data-icon="close">${ICON.close}</button>${html}</div>`;
  $('.popx',o).addEventListener('click',coinClose); o.hidden=false; if(typeof spinRays==='function') spinRays(o);
  if(anim) G.from($('.popup',o),{scale:.6,opacity:0,duration:.35,ease:'back.out(2)'});
  if(onOpen) onOpen($('.popup',o));
}
const coinClose=()=>{ const o=$('#coinPop'); if(o) o.hidden=true; };
const bigCoins=balLine;

// a grown-up question first (Marwa 2026-11-05: no times-table sum): type the parent's name saved in the parent account.
// Tolerant: spaces, case, harakat, tatweel, أ/إ/آ=ا, ة=ه, ى=ي; the full name or its first word. No parent name yet = no question.
// Passed once = no more questions until the app is opened again.
let gateOk=false;
const gateNorm=t=>String(t||'').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();
function parentGate(then){
  const nm=gateNorm((window.ACCOUNT||{}).name);
  if(gateOk||!CS().parentGate||!nm) return then();
  coinPop(`<h2 class="outline">${CT('لولي الأمر','For grown-ups')}</h2><p class="msg-text">${CT('اكتب اسم ولي الأمر:','Type the parent\'s name:')}</p>
    <input class="coingate" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" dir="auto"><button class="pill green" data-go>${CT('تمام','OK')}</button>`, p=>{
    const i=$('.coingate',p), go=()=>{ const v=gateNorm(i.value); if(v&&(v===nm||v===nm.split(' ')[0])){ gateOk=true; then(); } else { i.value=''; if(anim) G.fromTo(i,{x:-8},{x:0,duration:.4,ease:'elastic.out(1,.3)'}); } };
    $('[data-go]',p).addEventListener('click',go); i.addEventListener('keydown',e=>{ if(e.key==='Enter') go(); }); setTimeout(()=>i.focus(),50); });
}

/* ---------- the share sheet ---------- */
// ?r= = the parent's ref code or server id (js/sync.js); never the email (no server = no r at all)
function shareLink(){ const u=CS().shareUrl||location.origin+location.pathname.replace(/[^/]*$/,''), A=window.ACCOUNT||{}, r=A.ref||(A.token&&A.id&&!String(A.id).includes('@')?A.id:'');
  return r?u+(u.includes('?')?'&':'?')+'r='+encodeURIComponent(r):u; }
function shareOpen(t){
  const url=shareLink(), txt=(CS().shareText||'EasyStudy')+' '+url, e=encodeURIComponent;
  if(/^wa/.test(t.id)) return window.open('https://wa.me/?text='+e(txt),'_blank');
  if(t.id==='messenger') return window.open(/Android|iPhone|iPad/i.test(navigator.userAgent)?'fb-messenger://share/?link='+e(url):'https://www.facebook.com/sharer/sharer.php?u='+e(url),'_blank');
  if(/^fb/.test(t.id)) return window.open('https://www.facebook.com/sharer/sharer.php?u='+e(url),'_blank');
  if(t.id==='telegram') return window.open('https://t.me/share/url?url='+e(url)+'&text='+e(CS().shareText||''),'_blank');
  if(t.id==='copy'){ try{ navigator.clipboard.writeText(txt); }catch(x){} return; }
  if(navigator.share) navigator.share({title:'EasyStudy',text:CS().shareText||'',url}).catch(()=>{});
}
// how many credits a share of this type pays now (0 = cooldown or the day's cap)
function sharePays(t,w){ const C=CS(), now=Date.now(), last=w.last[t.id]||0;
  if(now-last<(+t.cooldownH||0)*3600e3) return 0;
  const day=new Date().toDateString(), got=w.hist.filter(h=>h.k==='share'&&new Date(h.at).toDateString()===day).reduce((a,h)=>a+h.n,0);
  return Math.max(0,Math.min(+t.coins||0,(C.dailyCap!=null?+C.dailyCap:1e9)-got)); }
/* SHARE CHECK (Marwa 2026-11-05: "do the most we can to make sure the share happened"). A web page can never see inside WhatsApp / Facebook,
   so the strongest proof on the device is: after the tap the app must really LEAVE (WhatsApp / Facebook / Messenger opened over it; for
   "copy link" the parent goes to another app to paste) within a few seconds, stay away long enough to send (coins.shareMinSec, default 8 s),
   and come BACK. A tap with no leaving, or a quick bounce back, pays nothing. On top: one pay per type per cooldownH, the day cap, and on the
   server the per-account / device / IP limits plus the referral bonus (the only share that is fully proven: a new parent registers). */
let SHR=null;
const shareMin=()=>(CS().shareMinSec!=null?+CS().shareMinSec:8)*1000;
function shareStart(t,after){ const w=wallet(), p=sharePays(t,w);
  if(!p){ shareOpen(t); return; }   // already paid for this type today: the share still opens, no credits
  SHR={t,p,at:Date.now(),left:0,after};
  const leaveIn=t.id==='copy'?60000:5000;
  shareOpen(t);
  setTimeout(()=>{ if(SHR&&SHR.t===t&&!SHR.left){ SHR=null; shareNote('no',t,after); } },leaveIn);
  if(t.id==='copy') shareNote('copied',t,after); }
document.addEventListener('visibilitychange',()=>{ if(!SHR) return;
  if(document.hidden){ if(!SHR.left) SHR.left=Date.now(); return; }
  if(!SHR.left) return; const s=SHR; SHR=null;
  if(Date.now()-s.left<shareMin()) return shareNote('short',s.t,s.after);
  sharePay(s.t,s.after); });
function sharePay(t,after){ const w=wallet(), p=sharePays(t,w); if(!p) return coinSheet(after);
  w.bal+=p; w.last[t.id]=Date.now(); w.hist.push({k:'share',t:t.id,n:p,at:Date.now()}); walletSave(w); paintHud();
  apiCall('/share',{type:t.id}).then(apiTake);   // the server pays again by its own rules (cooldown, day cap) and sends the true wallet
  if(typeof chime==='function') chime(2);
  coinPop(`<h2 class="outline">${CT('شكرًا!','Thank you!')}</h2>${balLine(w.bal)}<p class="msg-text">${CT(`أخدت ${CRED(p)} على المشاركة`,`You got ${CRED(p)} for sharing`)}</p><button class="pill green" data-ok>${CT('تمام','OK')}</button>`,
    pp=>$('[data-ok]',pp).addEventListener('click',()=>coinSheet(after))); }
function shareNote(why,t,after){ const nm=t.ar;
  const txt={no:CT(`ملحقناش نشوف ${nm} اتفتح. ابعت الرسالة وارجع هنا عشان تاخد الكريدتس`,`We did not see ${nm} open. Send the message, then come back here to get the credits`),
    short:CT('رجعت بسرعة قوي. ابعت الرسالة فعلًا وارجع هنا عشان تاخد الكريدتس','You came back too fast. Really send the message, then come back here for the credits'),
    copied:CT('الرابط اتنسخ. الصقه في محادثة أو جروب وابعته، وارجع هنا عشان تاخد الكريدتس','The link is copied. Paste it in a chat or group and send it, then come back here for the credits')}[why];
  coinPop(`<h2 class="outline">${why==='copied'?CT('اتنسخ','Copied'):CT('لسه','Not yet')}</h2><p class="msg-text">${txt}</p><button class="pill green" data-ok>${CT('تمام','OK')}</button>`,
    pp=>$('[data-ok]',pp).addEventListener('click',()=>why==='copied'?coinClose():coinSheet(after))); }
function coinSheet(after){ parentGate(()=>{
  const w=wallet(), list=(CS().shares||[]).filter(t=>t.on);
  coinPop(`<h2 class="outline">${CT('اجمع كريدتس','Get credits')}</h2>${balLine(w.bal)}
    <p class="msg-text">${CT('شارك التطبيق مع أصحابك واكسب كريدتس تفتح بيها دروس جديدة. ابعت الرسالة فعلًا وارجع هنا عشان تتحسب','Share the app with friends and earn credits to open new lessons. Really send it, then come back here so it counts')}</p>
    <div class="coinshares">${list.map(t=>{ const p=sharePays(t,w); return `<button class="cshare ${/^wa/.test(t.id)?'wa':/^fb|messenger/.test(t.id)?'fb':''}" data-id="${t.id}"><span class="si">${shareIcon(t.id)}</span><span class="sn">${t.ar}</span><span class="sc${p?'':' done'}">${p?'+'+num(p):'✓'}</span></button>`; }).join('')}</div>
    ${list.some(t=>!sharePays(t,w))?`<p class="cnote">✓ ${CT('= خدت كريدتس المشاركة دي النهارده، تقدر تكسبها تاني بكرة','= paid today for this share, again tomorrow')}</p>`:''}`, pp=>{
    $$('.cshare',pp).forEach(b=>b.addEventListener('click',()=>shareStart(list.find(x=>x.id===b.dataset.id),after)));
    if(after) $('.popx',pp).addEventListener('click',after);
  }); }); }

/* ---------- the parent's credits page (children popup -> "رصيدي") — total, from shares, from invites, then the history ---------- */
const HK={gift:['هدية التسجيل','Sign-up gift'],share:['مشاركة','Share'],ref:['ولي أمر سجّل من رابطك','A parent joined from your link'],referral:['ولي أمر سجّل من رابطك','A parent joined from your link'],
  promo:['برومو كود','Promo code'],'unlock-lesson':['فتح درس','Unlocked a lesson'],'unlock-unit':['فتح وحدة','Unlocked a unit']};
function histName(h){ const b=HK[h.k]||[h.k,h.k]; let x=CT(b[0],b[1]);
  if(h.k==='share'){ const t=(CS().shares||[]).find(s=>s.id===h.t); if(t) x+=': '+t.ar; }
  if(h.k==='promo') x+=': '+promoWhat(h.id);
  if(h.id&&h.k==='unlock-lesson'){ const l=lessonOf(h.id), s=subjOf(h.id); if(l) x+=': '+(s?s.name+' · ':'')+(l.title||''); }
  if(h.id&&h.k==='unlock-unit'){ const p=h.id.split(':'), s=subjOf(h.id); x+=': '+(s?s.name+' · ':'')+CT('الوحدة ','Unit ')+num(p[2]||''); }
  return x; }
function creditBtn(){ return coinsOn()?`<button class="pill yellow wl-big wl-cred"><span class="wl-ar">${CT('رصيدي:','My credits:')} ${CRED(coinBal())}</span><small>${CT('اجمع كريدتس وافتح دروس','Earn credits, open lessons')}</small></button>`:''; }
function creditsPage(){ parentGate(()=>{
  const w=wallet(), H=w.hist||[], sum=f=>H.filter(f).reduce((a,h)=>a+(+h.n||0),0);
  const sh=sum(h=>h.k==='share'), inv=sum(h=>h.k==='ref'||h.k==='referral'), R=CS().referral||{};
  const dt=at=>{ try{ return new Date(at).toLocaleDateString(isAr()?'ar-EG':'en-GB',{day:'numeric',month:'short'}); }catch(e){ return ''; } };
  coinPop(`<h2 class="outline">${CT('رصيدي','My credits')}</h2>
    <div class="cstats"><div><b>${num(w.bal)}</b><small>${CT('الرصيد','Balance')}</small></div><div class="g"><b>${num(sh)}</b><small>${CT('من المشاركة','From shares')}</small></div><div class="y"><b>${num(inv)}</b><small>${CT('من الدعوات','From invites')}</small></div></div>
    <div class="cinfo"><b>${CT('محتاج رصيد؟','Need credits?')}</b> ${CT(`شارك التطبيق (+٣ أو +٥ لكل مشاركة)${R.on?`، ولما ولي أمر جديد يسجل من رابطك تاخد +${num(R.coins||0)}`:''}.`,`Share the app (+3 or +5 a share)${R.on?`; when a new parent registers from your link you get +${R.coins||0}`:''}.`)}
      <button class="pill green" data-share>${CT('شارك التطبيق','Share the app')}</button></div>
    <h3 class="chh">${CT('السجل','History')}</h3>
    <div class="chist">${H.slice().reverse().map(h=>`<div class="crow"><span class="cpm ${h.n<0?'m':'p'}">${h.n<0?'−':'+'}</span><span class="cn"><b>${typeof wlEsc==="function"?wlEsc(histName(h)):histName(h)}</b><small>${dt(h.at)}</small></span><span class="ca ${h.n<0?'m':'p'}" dir="ltr">${h.n<0?'-':'+'}${num(Math.abs(h.n))}</span></div>`).join('')||`<p class="cnote">${CT('لسه مفيش حاجة','Nothing yet')}</p>`}</div>`, pp=>{
    $('[data-share]',pp).addEventListener('click',()=>coinSheet(creditsPage)); }); }); }

/* ---------- a tap on a locked lesson / unit ----------
   kind 'lesson': open this lesson (lessonCost), or its whole unit (unitCost) when unitCost is set; a free pick when the policy gives picks.
   kind 'unit':   open the whole unit (unitCost). Credits off, or no price = "this opens later". onOpen() redraws the map. */
function lockTap(kind,item,cost,art,onOpen){
  const C=CS(), title=CT('مقفول','Locked');
  if(!coinsOn()){ message(title,cost?CT(`تفتحيه بـ ${COINTXT(cost)}`,`Open it with ${COINTXT(cost)}!`):CT('ده هيتفتح قريبًا','This opens later!'),art); return; }
  const s=SUBJECT, uid=kind==='unit'?'u:'+s.id+':'+item.unit:unitIdOf(s,item), lid=kind==='lesson'?'l:'+item.id:null;
  const uc=(ESET.items[uid]&&ESET.items[uid].coins)!=null?ESET.items[uid].coins:(+C.unitCost||0), uOff=ESET.items[uid]&&ESET.items[uid].st==='locked'&&kind==='lesson';
  const fl=freeLeft(kind==='unit'?'unit':'lesson',s.id), lc=cost||(+C.lessonCost||0), F=(ESET.access&&ESET.access.free)||{}, fc=+F.count||1;
  const done=()=>{ coinClose(); paintHud(); if(typeof chime==='function') chime(3); onOpen&&onOpen(); };
  const pay=(id,n,k)=>{ if(coinBal()<n) return; addUnlock(id,n,k); done(); };
  if(fl){ const what=kind==='unit'?(fc>1?CT(`${num(fc)} وحدات`,`${fc} units`):CT('وحدة','one unit')):(fc>1?CT(`${num(fc)} دروس`,`${fc} lessons`):CT('درس','one lesson'));
    const txt=F.perSubject?CT(`هدية التسجيل: تقدر تفتح أي ${what} تختاره من كل مادة مجانًا. تحب تفتح ${kind==='unit'?'الوحدة دي':'الدرس ده'} كهديتك في المادة دي؟`,`Sign-up gift: you can open any ${what} you choose in each subject for free. Open this ${kind} as your gift in this subject?`)
      :CT(`هدية التسجيل: تقدر تفتح أي ${what} تختاره مجانًا (باقي لك ${num(fl)}). تحب تفتح ${kind==='unit'?'الوحدة دي':'الدرس ده'}؟`,`Sign-up gift: you can open any ${what} you choose for free (${fl} left). Open this ${kind}?`);
    coinPop(`<h2 class="outline">${CT('هدية!','A gift!')}</h2><div class="msg-art">${art||''}</div>
      <p class="msg-text">${txt}</p><button class="pill green" data-free>${CT('افتحه مجانًا','Open it free')}</button>`,
      p=>$('[data-free]',p).addEventListener('click',()=>{ const f=cGet(freeKey(),[]); f.push(kind==='unit'?uid:lid); cSet(freeKey(),f); apiCall('/pick',{child:coinChild(),id:kind==='unit'?uid:lid}).then(apiTake); done(); })); return; }
  parentGate(()=>{ const bal=coinBal(), btn=(n,lab,attr)=>`<button class="pill ${bal>=n?'green':'cream off'} cbuy" ${attr}${bal>=n?'':' disabled aria-disabled="true"'}><span>${lab} = ${num(n)} ${CT('كريدتس','credits')}</span></button>`;   // Marwa 2026-11-05: "افتح الدرس = ٣ كريدتس" (word, no coin picture)
    const prices=[kind==='lesson'&&lc?lc:0,uc&&!uOff?uc:0].filter(Boolean), low=prices.length&&bal<Math.min(...prices);
    coinPop(`<h2 class="outline">${title}</h2><div class="msg-art">${art||''}</div>${balLine(bal)}
      <div class="cbuys">${kind==='lesson'&&lc?btn(lc,CT('افتح الدرس','Open the lesson'),'data-l'):''}${uc&&!uOff?btn(uc,CT('افتح الوحدة كلها','Open the whole unit'),'data-u'):''}</div>
      ${low?`<p class="msg-text clow">${CT('رصيدك لا يكفي','Not enough credits')}</p>`:''}
      <button class="pill blue" data-more>${CT('اجمع كريدتس','Get credits')}</button>${promoLine()}`, p=>{
      promoWire(p,onOpen);
      const l=$('[data-l]',p), u=$('[data-u]',p);
      if(l) l.addEventListener('click',()=>pay(lid,lc,'unlock-lesson'));
      if(u) u.addEventListener('click',()=>pay(uid,uc,'unlock-unit'));
      $('[data-more]',p).addEventListener('click',()=>coinSheet(()=>lockTap(kind,item,cost,art,onOpen))); }); });
}

/* ---------- PROMO CODES (Marwa 2026-11-05) ----------
   The admin makes codes in admin.html (page "البرومو كود"); settings.promos = [{code, what, target, uses, max, until, on, note}]
     what   = lesson | unit | subject | all         target = l:<subject>-<folder> | u:<subject>:<unit> | <subject id> | ''
     uses   = once (one use in total) | many (each child once; max = most uses in total, 0 = no limit)    until = 'YYYY-MM-DD' (last day) or ''
   A small underlined line under "اجمع كريدتس" in the lock popup opens the code field. A good code opens its target for THIS child
   (stored with the unlocks: the item id, 's:<subject>' or '*'), costs no credits, and adds a 0-credit "promo" row to the history.
   LOCAL (no settings "api"): the codes come from the settings on this device and the uses are counted on this device only (es.promoUses),
   so "once" means once per device. SERVER (settings "api"): the app sends POST /promo {child, code}; the server keeps the codes
   (never sent to the app) and counts every use (server/src/index.js promo). */
const promoNorm=c=>String(c||'').toUpperCase().replace(/[\s\-_]/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
function promoWhat(p){ if(!p) return ''; if(typeof p==='string') p={what:p==='*'?'all':p[0]==='s'?'subject':p[0]==='u'?'unit':'lesson',target:p[0]==='s'?p.slice(2):p};
  const t=p.target||'';
  if(p.what==='all') return CT('كل المواد','All subjects');
  if(p.what==='subject'){ const s=COURSE.subjects.find(x=>x.id===t); return CT('مادة ','Subject ')+(s?s.name:t); }
  if(p.what==='unit'){ const s=subjOf(t), u=t.split(':')[2]; return (s?s.name+' · ':'')+CT('الوحدة ','Unit ')+num(u||''); }
  const l=lessonOf(t), s=subjOf(t); return l?(s?s.name+' · ':'')+(l.title||''):t; }
const promoKey=p=>p.what==='all'?'*':p.what==='subject'?'s:'+p.target:p.target;
function promoCheck(code){   // local check -> {p} or {err}
  const c=promoNorm(code); if(!c) return {err:'empty'};
  const p=(ESET.promos||[]).find(x=>promoNorm(x.code)===c); if(!p||p.on===false) return {err:'bad'};
  if(p.until&&new Date().toISOString().slice(0,10)>p.until) return {err:'old'};
  if(p.what!=='all'&&!p.target) return {err:'bad'};
  const U=cGet('es.promoUses',{}), mine=cGet(freeKey()+'.promo',[]), n=U[c]||0;
  if(mine.includes(c)) return {err:'used'};
  if(p.uses!=='many'&&n>=1) return {err:'used'};
  if(p.uses==='many'&&+p.max>0&&n>=+p.max) return {err:'full'};
  return {p,c}; }
function promoApply(p,c){ const id=promoKey(p), s=cGet(unlockKey(),[]); if(!s.includes(id)) s.push(id); cSet(unlockKey(),s);
  const U=cGet('es.promoUses',{}); U[c]=(U[c]||0)+1; cSet('es.promoUses',U);
  const mine=cGet(freeKey()+'.promo',[]); mine.push(c); cSet(freeKey()+'.promo',mine);
  const w=wallet(); w.hist.push({k:'promo',id,n:0,at:Date.now(),child:coinChild(),code:c}); walletSave(w); }
const PROMO_ERR={empty:['اكتب الكود الأول','Type the code first'],bad:['الكود ده مش صحيح','This code is not valid'],old:['الكود ده انتهى','This code has expired'],
  used:['الكود ده اتستخدم قبل كده','This code was already used'],full:['الكود ده خلص عدد مرات استخدامه','This code has no uses left'],net:['مفيش اتصال، جرّب تاني','No connection, try again']};
function promoLine(){ return `<button type="button" class="cpromo" data-promo>${CT('عندك برومو كود؟','Have a promo code?')}</button>
  <form class="cpromof" hidden autocomplete="off"><input class="cpromoin" name="code" dir="ltr" inputmode="latin" autocapitalize="characters" spellcheck="false" maxlength="32" placeholder="${CT('اكتب الكود','Type the code')}" aria-label="${CT('البرومو كود','Promo code')}">
  <button class="pill green cpromogo">${CT('فعّل','Use')}</button><p class="cpromoerr" role="alert" hidden></p></form>`; }
function promoWire(pp,onOpen){
  const b=$('[data-promo]',pp), f=$('.cpromof',pp); if(!b||!f) return; const inp=$('input',f), er=$('.cpromoerr',f);
  b.addEventListener('click',()=>{ b.hidden=true; f.hidden=false; pp.classList.add('promo-on'); inp.focus(); });   // the padlock picture hides: room for the field on short screens
  const bad=k=>{ er.textContent=CT(...PROMO_ERR[k]||PROMO_ERR.bad); er.hidden=false; inp.classList.add('bad'); inp.focus();   // same as every form (welcome.js wlBad): red, shake, focus
    if(anim) G.fromTo(inp,{x:0},{x:8,duration:.06,repeat:5,yoyo:true,clearProps:'transform'}); };
  inp.addEventListener('input',()=>{ er.hidden=true; inp.classList.remove('bad'); });
  const ok=p=>{ coinClose(); paintHud(); if(typeof chime==='function') chime(3);
    coinPop(`<h2 class="outline">${CT('اتفتح!','Unlocked!')}</h2><div class="msg-art">${typeof CAR==='function'?`<span class="car">${CAR('happy')}</span>`:''}</div>
      <p class="msg-text">${CT('الكود فتح لك:','The code opened:')}<br><b>${promoWhat(p)}</b></p><button class="pill green" data-pgo>${CT('يلا نذاكر','Let\'s go')}</button>`,
      q=>{ const go=()=>{ coinClose(); onOpen&&onOpen(); }; $('[data-pgo]',q).addEventListener('click',go); $('.popx',q).addEventListener('click',()=>onOpen&&onOpen()); }); };
  f.addEventListener('submit',async e=>{ e.preventDefault(); const code=inp.value; if(!promoNorm(code)) return bad('empty');
    if(API()){ const go=$('.cpromogo',f); go.disabled=true;
      const r=await fetch(API()+'/promo',{method:'POST',headers:{'Content-Type':'application/json',...(window.ACCOUNT&&ACCOUNT.token?{Authorization:'Bearer '+ACCOUNT.token}:{})},body:JSON.stringify({child:coinChild(),code})})
        .then(x=>x.json()).catch(()=>({error:'net'})); go.disabled=false;
      if(!r||!r.ok) return bad(r&&PROMO_ERR[r.error]?r.error:r&&r.error==='net'?'net':'bad');
      apiTake(r); return ok(r.promo); }
    const x=promoCheck(code); if(x.err) return bad(x.err); promoApply(x.p,x.c); ok(x.p); });
}
;
/* ===== js/push.js ===== */
/* NOTIFICATIONS (2026-11-09, Ahmed): a small bell on the subjects page lets a parent allow notifications on this device.
   Notifications are written and sent ONLY by hand from the admin page (admin.html -> الإشعارات); the app and the server never send by themselves.
   Needs settings "api" (the server keeps the devices) and the service worker (sw.js shows the message). iPhone / iPad: only when the app was added to the
   Home Screen (iOS 16.4+): then the bell shows a short "add to Home Screen" note instead. Looks: css/push.css. */
const PUSH={sub:null};
const PUT={
  ar:{on:'الإشعارات شغّالة. دوس تاني لو عايز توقفها',off:'فعّل الإشعارات',denied:'الإشعارات متقفلة من إعدادات المتصفح',ios:'عشان الإشعارات تشتغل على الآيفون / الآيباد: افتح قائمة المشاركة واختار "إضافة إلى الشاشة الرئيسية"، وافتح التطبيق منها وبعدين دوس على الجرس',fail:'مقدرناش نفعّل الإشعارات، جرّب تاني'},
  en:{on:'Notifications are on. Tap again to turn them off',off:'Turn on notifications',denied:'Notifications are blocked in the browser settings',ios:'On iPhone / iPad: open the Share menu, choose "Add to Home Screen", open the app from there, then tap the bell',fail:'Could not turn notifications on, try again'}};
const puT=()=>PUT.ar;   // the home page has no subject language yet: Egyptian Arabic (parents)
const puIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const puStandalone=()=>navigator.standalone===true||(matchMedia&&matchMedia('(display-mode: standalone)').matches);
const puCan=()=>!!API()&&'serviceWorker' in navigator&&/^https?:/.test(location.protocol)&&(puIOS()?true:('PushManager' in window&&'Notification' in window));
const puKey=k=>{ const p='='.repeat((4-k.length%4)%4), r=atob((k+p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(r,c=>c.charCodeAt(0)); };
async function puReg(){ return navigator.serviceWorker.ready; }
async function puCurrent(){ try{ if(!('PushManager' in window)) return null; return await (await puReg()).pushManager.getSubscription(); }catch(e){ return null; } }
function puPaint(){ const b=$('#pushBtn'); if(!b) return; const on=!!PUSH.sub&&Notification.permission==='granted';
  b.classList.toggle('on',on); b.title=b.ariaLabel=on?puT().on:puT().off; }
async function puToggle(){
  const T=puT();
  if(puIOS()&&!puStandalone()) return message('🔔',T.ios);   // iOS only allows it from the Home Screen app
  if(PUSH.sub){ const e=PUSH.sub.endpoint; try{ await PUSH.sub.unsubscribe(); }catch(x){} PUSH.sub=null; apiCall('/push/unsub',{endpoint:e}); puPaint(); return; }
  if(Notification.permission==='denied') return message('🔔',T.denied);
  try{
    const perm=await Notification.requestPermission(); if(perm!=='granted') return puPaint();   // asked only now, after a tap
    const k=await apiCall('/push/key'); if(!k||!k.key) throw 0;
    const s=await (await puReg()).pushManager.subscribe({userVisibleOnly:true,applicationServerKey:puKey(k.key)});
    const r=await apiCall('/push/sub',{endpoint:s.endpoint}); if(!r||!r.ok) throw 0;
    PUSH.sub=s; puPaint();
  }catch(e){ message('🔔',T.fail); }
}
async function puInit(){
  if(!puCan()||$('#pushBtn')) return;
  const b=document.createElement('button'); b.id='pushBtn'; b.className='pushbtn rb'; b.type='button';
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21a2 2 0 0 0 4 0"/></svg>';
  b.addEventListener('click',puToggle); $('#subjects').appendChild(b);
  PUSH.sub=await puCurrent(); puPaint();
}
// the settings (api address) arrive a moment after the page opens
if(typeof ESET_P!=='undefined') ESET_P.then(()=>puInit()).catch(()=>{}); else puInit();
;
/* ===== js/deeplink.js ===== */
/* DEEP LINK (2026-11-09, Ahmed): an address ending in ?go=<subject>[/<place>[/<tab>]] opens that place inside the app. Used by the notification link
   (admin.html -> الإشعارات builds it from lists), and works from any shared link. place = a lesson folder (u1l3) | a unit (unit-5, opens that subject's map)
   | an exam paper (x-<exam id>, a lesson's or a unit's). tab = read | words | quiz | booklet | workbook | grammar.
   Safe by design: a place that does not exist, is not built yet, or is locked / "soon" just opens the subject's map; no child profile yet = normal first launch. */
function deepGo(){
  let go=''; try{ go=new URLSearchParams(location.search).get('go')||''; }catch(e){}
  if(!go) return;
  try{ const u=new URL(location.href); u.searchParams.delete('go'); history.replaceState(null,'',u.pathname+(u.search||'')+u.hash); }catch(e){}   // a reload does not repeat it
  const [sid,place,tabName]=go.split('/'), s=COURSE.subjects.find(x=>x.id===sid&&x.open&&x.lessons);
  if(!s||!kidNow()) return;
  SUBJECT=s;
  needRest(async()=>{
    const m=place&&s.lessons.find(l=>l.folder===place&&l.file);
    if(m){
      if(accessOf(m,!!m.file,'l:'+m.id).st!=='open') return openMap();
      if(tabName&&['read','words','quiz','booklet','workbook','grammar'].includes(tabName)) return bookOpen(m,tabName);
      return openLesson(m);
    }
    const xm=/^x-([\w-]+)$/.exec(place||'');
    if(xm){
      const lm=s.lessons.find(l=>(l.exams||[]).some(e=>e.id===xm[1]));
      if(lm){ const ex=lm.exams.find(e=>e.id===xm[1]); return openExam(lm,ex); }
      const un=(s.units||[]).find(u=>(u.exams||[]).some(e=>e.id===xm[1]));
      if(un){ const ex=un.exams.find(e=>e.id===xm[1]); return openExam({unit:un.unit,folder:'t'+un.unit,id:s.id+':t'+un.unit,exams:un.exams,tabs:[]},ex); }
    }
    openMap();
  });
}
;
/* ===== js/subjects.js ===== */
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
function openSubjects(){ if(restOk){ stopAll(); vStop(); clearMarks(); } show('subjects'); kidPaint(); drawSubjects(); pop('.box'); showHint($('.box.open'),COURSE.hints.subjects,1300,'subjects'); }
;
/* ===== js/welcome.js ===== */
/* WELCOME + ACCOUNTS (Marwa 2026-11-05). First launch: 1) the curriculum (عام / تجريبي / مدارس خاصة -> school list),
   2) the parent's account (name, email, phone optional), 3) the first child's profile (name, grade, curriculum). Then the home page.
   Later: the profile button (home, bottom right, child's name beside it) switches child or adds one (steps 1 + 3).
   SERVER (js/sync.js, when settings "api" is set): the email is confirmed with a code, children + progress are kept on the server too.
   LOCAL VERSION: everything is kept on this device (localStorage es.account / es.kids / es.kid). The server account (Cloudflare) replaces
   only acctSave / kidsSave later; the screens stay. Each child keeps its own stars, map place and opened lessons: the progress keys (KID_KEYS)
   are swapped when the child changes, so the rest of the app keeps reading its usual keys. */
const KID_KEYS=['zoom-stars','zoom-opened','zoom-last','zoom-vocab','es.unlocked','es.freeused'];   // es.freeused = the child's free picks (js/coins.js)
const wlGet=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v; }catch(e){ return d; } };
const wlSet=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const acct=()=>wlGet('es.account',null), kids=()=>wlGet('es.kids',[]), kidNow=()=>{ const id=wlGet('es.kid',null), K=kids(); return K.find(k=>k.id===id)||K[0]||null; };
// the curriculum line of a pick, in Arabic (for the parent)
function currLabel(p){ if(!p||!CURR) return ''; const sc=p.school&&CURR.schools.find(s=>s.id===p.school), ty=CURR.types.find(t=>t.id===p.type); return sc?sc.ar:ty?ty.ar:''; }
const gradeLabel=g=>((CURR&&CURR.grades||[]).find(x=>x.id===g)||{}).ar||'';
// change child: keep the current child's progress under its own name, bring the other child's back, open the app again
function kidSwitch(id){ const cur=kidNow(); if(cur&&cur.id===id) return;
  try{ KID_KEYS.forEach(k=>{ const v=localStorage.getItem(k); if(cur){ if(v==null) localStorage.removeItem(`es.kid.${cur.id}.${k}`); else localStorage.setItem(`es.kid.${cur.id}.${k}`,v); }
    const n=localStorage.getItem(`es.kid.${id}.${k}`); if(n==null) localStorage.removeItem(k); else localStorage.setItem(k,n); }); }catch(e){}
  const kd=kids().find(k=>k.id===id); wlSet('es.kid',id); if(kd) currSave(kd.curr); location.reload(); }

/* ---------- the welcome steps ---------- */
const WL={step:'curr',pick:null,adding:false,hist:[]};
const wlEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// a wrong / missing field: THAT field turns red, shakes and gets the focus; the message shows under the form (Marwa 2026-11-05, every form)
function wlBad(f,name,msg){ const er=$('.wl-err',f); $$('.bad',f).forEach(x=>x.classList.remove('bad')); if(er){ er.textContent=msg; er.hidden=false; }
  const i=name&&f[name]; if(!i) return; i.classList.add('bad'); i.focus(); if(anim) G.fromTo(i,{x:0},{x:8,duration:.06,repeat:5,yoyo:true,clearProps:'transform'});
  i.addEventListener('input',()=>{ i.classList.remove('bad'); if(er) er.hidden=true; },{once:true}); }
// the short app description (Marwa 2026-11-05/06): on the loading screen (index.html #splashName .ldab, first load only), big on the first curriculum step and small on the parent account step
function wlAbout(sz='sm'){ return `<div class="wl-about ${sz}" dir="rtl"><p class="wl-tag">مذاكرة أولى ابتدائي بلعبة مسلية للأطفال</p><ul class="wl-pts"><li>شرح الدرس</li><li>تحفيظ الكلمات</li><li>تدريب الأسئلة</li></ul></div>`; }
function wlHead(ar,en){ return `<h2 class="wl-h"><span>${ar}</span><small>${en}</small></h2>`; }
// autofocus (Ahmed 2026-11-07): a form opens with the cursor in its first EMPTY required field; Enter moves to the next empty one, the last one submits
function wlFocus(f){ if(!f) return; const ins=[...f.querySelectorAll('input[required]')], first=ins.find(i=>!i.value.trim());
  ins.forEach(i=>i.addEventListener('keydown',e=>{ if(e.key!=='Enter') return; const nx=ins.slice(ins.indexOf(i)+1).find(x=>!x.value.trim()); if(nx){ e.preventDefault(); nx.focus(); } }));
  if(first) setTimeout(()=>{ try{ first.focus({preventScroll:true}); const n=first.value.length; first.setSelectionRange&&first.type!=='email'&&first.setSelectionRange(n,n); }catch(_){} },120); }
function wlGo(step,back){ if(!back&&WL.step!==step) WL.hist.push(WL.step); WL.step=step; wlDraw(); }
function wlDraw(){
  const b=$('#wlBody'); $('#wlBack').hidden=!WL.hist.length&&!WL.adding; $('#welcome').dataset.step=WL.step;   // big logo on the first step, smaller on the forms (css/welcome.css)
  if(WL.step==='curr'){
    const C=CURR||{types:[],schools:[]}, open=WL.pick&&WL.pick.type==='private';
    b.innerHTML=(WL.adding?'':wlAbout(''))+wlHead('اختيار المنهج','Choose the curriculum')+`<div class="wl-list">`+C.types.map(t=>
      `<button class="pill wl-big${t.schools?' wl-more':''}${open&&t.schools?' open':''}" data-type="${t.id}"><span class="wl-ar">${t.ar}</span><small>${t.en}</small></button>`+
      (t.schools?`<div class="wl-schools"${open?'':' hidden'}>`+C.schools.map(s=>`<button class="pill yellow wl-school" data-school="${s.id}"><span class="wl-ar">${s.ar}</span><small>${s.en}</small></button>`).join('')+`</div>`:'')).join('')+`</div>`;
    $$('[data-type]',b).forEach(x=>x.addEventListener('click',()=>{ const t=C.types.find(y=>y.id===x.dataset.type);
      if(t.schools){ WL.pick={type:t.id}; const s=$('.wl-schools',b), o=s.hidden; s.hidden=!o; x.classList.toggle('open',o); if(o) pop('.wl-school',{y:-14}); return; }
      WL.pick={type:t.id}; wlNext(); }));
    $$('[data-school]',b).forEach(x=>x.addEventListener('click',()=>{ WL.pick={type:'private',school:x.dataset.school}; wlNext(); }));
  } else if(WL.step==='parent'){
    const a=acct()||{};
    b.innerHTML=wlAbout()+wlHead('حساب ولي الأمر','Parent account')+`<form class="wl-form" novalidate>
      <label><span>الاسم <small>Name</small></span><input name="name" autocomplete="name" value="${wlEsc(a.name)}" required></label>
      <label><span>البريد الإلكتروني <small>Email</small></span><input name="email" type="email" dir="ltr" autocomplete="email" inputmode="email" value="${wlEsc(a.email)}" required></label>
      <label><span>رقم الموبايل (اختياري) <small>Phone (optional)</small></span><input name="phone" type="tel" dir="ltr" autocomplete="tel" inputmode="tel" value="${wlEsc(a.phone)}"></label>
      <p class="wl-err" hidden></p>
      <button class="pill wl-big wl-go" type="submit"><span class="wl-ar">التالي</span><small>Next</small></button></form>`;
    $('form',b).addEventListener('submit',e=>{ e.preventDefault(); const f=e.target, v=n=>f[n].value.trim(), er=$('.wl-err',b);
      const bad=!v('name')?['name','اكتب الاسم']:!v('email')?['email','اكتب البريد الإلكتروني']:!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))?['email','البريد الإلكتروني مش مكتوب صح']:v('phone')&&!/^[+0-9٠-٩ ]{8,16}$/.test(v('phone'))?['phone','رقم الموبايل مش مكتوب صح']:null;
      if(bad) return wlBad(f,...bad);
      const go=$('.wl-go',b); go.disabled=true;   // server on: a code to the email first (js/sync.js); off: kept on this device
      acctSubmit({name:v('name'),email:v('email'),phone:v('phone'),created:(a.created||new Date().toISOString())},t=>{ er.textContent=t; er.hidden=false; go.disabled=false; }); });
  } else if(WL.step==='code'){ syDrawCode(b);
  } else {
    const G=(CURR&&CURR.grades)||[{id:'p1',ar:'الصف الأول الابتدائي',open:true}], ed=WL.edit&&kids().find(k=>k.id===WL.edit), gr=WL.grade||(ed&&ed.grade)||G[0].id;
    if(WL.draft==null&&ed) WL.draft=ed.name;
    b.innerHTML=wlHead(ed?'تعديل حساب الطفل':'حساب الطفل',ed?'Edit child':'Child profile')+`<form class="wl-form" novalidate>
      <label><span>اسم الطفل <small>Child's name</small></span><input name="kid" autocomplete="off" value="${wlEsc(WL.draft||'')}" required></label>
      <div class="wl-field"><span>السنة الدراسية <small>Grade</small></span><div class="wl-chips">${G.map(g=>`<button type="button" class="pill cream wl-chip${g.id===gr?' on':''}" data-grade="${g.id}"${g.open?'':' disabled'}>${g.ar}</button>`).join('')}</div></div>
      <div class="wl-field"><span>المنهج <small>Curriculum</small></span><button type="button" class="pill cream wl-chip on wl-curr">${wlEsc(currLabel(WL.pick))}<i>${ICON.pencil}</i></button></div>
      <p class="wl-err" hidden></p>
      <button class="pill wl-big wl-go green" type="submit">${ed?'<span class="wl-ar">حفظ</span><small>Save</small>':'<span class="wl-ar">يلا نبدأ</span><small>Let\'s go</small>'}</button></form>`;
    $('input[name=kid]',b).addEventListener('input',e=>WL.draft=e.target.value);
    $$('[data-grade]',b).forEach(x=>x.addEventListener('click',()=>{ WL.grade=x.dataset.grade; $$('[data-grade]',b).forEach(y=>y.classList.toggle('on',y===x)); }));
    $('.wl-curr',b).addEventListener('click',()=>wlGo('curr'));
    $('form',b).addEventListener('submit',e=>{ e.preventDefault(); const n=e.target.kid.value.trim();
      if(!n) return wlBad(e.target,'kid','اكتب اسم الطفل');
      if(ed){ kidSave(ed.id,{name:n,grade:WL.grade||ed.grade,curr:WL.pick||ed.curr}); return; }
      const K=kids(), first=!K.length, kd={id:'k'+Date.now().toString(36),name:n,grade:WL.grade||gr,curr:WL.pick,created:new Date().toISOString()};
      K.push(kd); wlSet('es.kids',K); syPushKids();
      if(first){ wlSet('es.kid',kd.id); currSave(kd.curr); currApply(kd.curr); WL.hist=[]; kidPaint(); openSubjects(); pop('#subjects .top > *',{y:-20}); }   // the first child keeps the progress already on this device
      else kidSwitch(kd.id); });
  }
  pop('#wlBody > *, #wlBody .wl-list > *, #wlBody form > *',{y:16});
  if(WL.step==='parent'||WL.step==='kid') wlFocus($('form',b));
}
function wlNext(){ if(WL.edit&&WL.hist.length){ wlGo(WL.hist.pop(),true); return; } wlGo(WL.adding||acct()?'kid':'parent'); }
$('#wlBack').addEventListener('click',()=>{ if(WL.hist.length) wlGo(WL.hist.pop(),true); else if(WL.adding){ WL.adding=false; WL.edit=null; openSubjects(); } });
function openWelcome(adding){ WL.adding=!!adding; WL.edit=null; WL.draft=null; WL.grade=null; WL.hist=[]; WL.pick=adding?null:currPick(); WL.step='curr'; show('welcome'); wlDraw(); }
// edit a child (name, grade, curriculum / school): the child form filled in; its curriculum button opens the curriculum list and comes back
function openKidEdit(id){ const k=kids().find(x=>x.id===id); if(!k) return; WL.adding=true; WL.edit=id; WL.draft=null; WL.grade=null; WL.hist=[]; WL.pick=k.curr; WL.step='kid'; show('welcome'); wlDraw(); }
// save an edited child: progress stays (it belongs to the child, not to the curriculum); the active child's subjects / tabs follow the new curriculum
function kidSave(id,ch){ const K=kids(), k=K.find(x=>x.id===id); if(!k) return; Object.assign(k,ch); wlSet('es.kids',K); if(typeof syPushKids==='function') syPushKids();
  WL.edit=null; WL.adding=false; const cur=kidNow(); if(cur&&cur.id===id){ currSave(k.curr); setTimeout(()=>location.reload(),300); } else { kidPaint(); openSubjects(); } }

/* ---------- profile button (home, bottom right) + the children popup ---------- */
function kidPaint(){ const k=kidNow(), b=$('#kidBtn'); if(!b) return; b.hidden=!k; if(k) $('#kidName').textContent=k.name; }
function kidMenu(){
  let o=$('#kidPop'); if(!o){ o=el('div','overlay','<div class="rays"></div><div class="popup kidpop" role="dialog" aria-label="Children"></div>'); o.id='kidPop'; document.body.append(o); o.addEventListener('click',e=>{ if(e.target===o) o.hidden=true; }); }
  const a=acct()||{}, cur=kidNow(), p=$('.kidpop',o);
  p.innerHTML=`<button class="rb popx" aria-label="Close">${ICON.close}</button><h2 class="wl-h"><span>${wlEsc(a.name||'ولي الأمر')}</span><small>${wlEsc(a.email||'')}</small></h2>
    <div class="wl-list">${kids().map(k=>`<div class="wl-kidrow"><button class="pill wl-big wl-kid${cur&&k.id===cur.id?' green':' cream'}" data-kid="${k.id}"><span class="wl-ar">${wlEsc(k.name)}</span><small>${gradeLabel(k.grade)} · ${wlEsc(currLabel(k.curr))}</small></button><button class="rb wl-edit" data-edit="${k.id}" aria-label="Edit ${wlEsc(k.name)}">${ICON.pencil}</button></div>`).join('')}
    ${typeof creditBtn==='function'?creditBtn():''}
    <button class="pill yellow wl-big wl-add"><span class="wl-ar">${ICON.plus} إضافة طفل</span><small>Add a child</small></button>
    <button class="pill cream wl-big wl-rep" disabled><span class="wl-ar">تقارير التقدم · قريبًا</span><small>Progress reports · soon</small></button></div>`;
  $('.popx',p).addEventListener('click',()=>o.hidden=true);
  $$('[data-kid]',p).forEach(b=>b.addEventListener('click',()=>{ o.hidden=true; kidSwitch(b.dataset.kid); }));
  $$('[data-edit]',p).forEach(b=>b.addEventListener('click',()=>{ o.hidden=true; openKidEdit(b.dataset.edit); }));
  $('.wl-add',p).addEventListener('click',()=>{ o.hidden=true; openWelcome(true); });
  const cb=$('.wl-cred',p); if(cb) cb.addEventListener('click',()=>{ o.hidden=true; creditsPage(); });   // the parent's credits (js/coins.js)
  syMenuButtons(p,()=>o.hidden=true);   // confirm the email / sign out (server only, js/sync.js)
  o.hidden=false; spinRays(o); pop('.kidpop > *, .kidpop .wl-list > *',{y:14});
}
$('#kidBtn').addEventListener('click',kidMenu);
// hooks for other parts (coins.js reads window.ACCOUNT / window.CHILD): {id,...} of the parent and the active child
// signed in to the server (js/sync.js es.session): id = the server's parent id (share links carry it), token for the API calls
window.ACCOUNT=(()=>{ const a=acct(), s=wlGet('es.session',null); return a?{...a,id:(s&&s.id)||a.id||a.email||'local',...(s&&s.token?{token:s.token}:{})}:null; })(); window.CHILD=kidNow();
;
/* ===== js/sync.js ===== */
/* ACCOUNT SERVER SYNC (Marwa 2026-11-05: the parent's account is confirmed with a code sent to the email, no password; the code is asked
   only on a new device or after sign-out). Server = easystudy/server (Cloudflare Worker + D1), API contract in server/README.md.
   It is ON only when the settings have "api" (e.g. "/api", js/coins.js API()). No api, or the server can't be reached = the local
   version exactly as before (js/welcome.js keeps everything on this device). Kept on this device:
     es.session = {token, id, ref}  (the signed-in parent; window.ACCOUNT.token for js/coins.js)
     es.device  = a random id for this device (a referral pays only for a new device)
     es.progAt.<kid> = when this device last sent that child's progress (the newest copy wins) */
const SY={};
const syDevice=()=>{ let d=wlGet('es.device',null); if(!d){ d='d'+Date.now().toString(36)+Math.random().toString(36).slice(2,10); wlSet('es.device',d); } return d; };
const sySession=()=>wlGet('es.session',null);
async function syApi(){ try{ await ESET_P; }catch(e){} return API(); }
// one call; answer = {s: status, j: json} or null when the server can't be reached
async function syCall(path,body,method){ const base=await syApi(); if(!base) return null;
  const h={'Content-Type':'application/json'}, s=sySession(); if(s&&s.token) h.Authorization='Bearer '+s.token;
  try{ const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:h,body:body?JSON.stringify(body):undefined}); let j={}; try{ j=await r.json(); }catch(e){}
    if(r.status===401&&s&&path.indexOf('/auth/')!==0){ syForget(); }   // the session ended (signed out elsewhere / blocked)
    return {s:r.status,j}; }catch(e){ return null; } }
function syForget(){ try{ localStorage.removeItem('es.session'); }catch(e){} if(window.ACCOUNT) delete ACCOUNT.token; }
const SYERR={'bad-email':'البريد الإلكتروني مش مكتوب صح','wait':'استني دقيقة وبعدين اطلبي كود جديد','too-many':'محاولات كتير. جربي تاني بكرة',
  'code-wrong':'الكود مش صح','code-expired':'الكود انتهى. اطلبي كود جديد','blocked':'الحساب ده موقوف','mail-not-set':'إرسال الإيميل لسه مش متجهز','mail-failed':'الإيميل ما اتبعتش. جربي تاني'};

/* ---------- parent step: send the code (server on) or keep it on this device (server off / can't be reached) ---------- */
async function acctSubmit(a,err){
  if(!(await syApi())){ wlSet('es.account',a); return wlGo('kid'); }
  const r=await syCall('/auth/start',{email:a.email,name:a.name});
  if(!r){ wlSet('es.account',{...a,pending:true}); return wlGo('kid'); }   // offline: go on locally, confirm the email later (children popup)
  if(!r.j.ok){ err(SYERR[r.j.error]||'حصلت مشكلة. جربي تاني'); return; }
  SY.a=a; SY.dev=r.j.devCode||''; SY.known=r.j.known; wlGo('code');
}
// the code step (drawn by wlDraw in js/welcome.js)
function syDrawCode(b){
  const a=SY.a||acct()||{};
  b.innerHTML=wlHead('كود التأكيد','Confirmation code')+`<form class="wl-form" novalidate>
    <p class="wl-note">بعتنا كود من ٦ أرقام على <b dir="ltr">${wlEsc(a.email)}</b>${SY.dev?` <small dir="ltr">(dev: ${SY.dev})</small>`:''}</p>
    <label><span>الكود <small>Code</small></span><input name="code" class="wl-code" dir="ltr" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>
    <p class="wl-err" hidden></p>
    <button class="pill wl-big wl-go green" type="submit"><span class="wl-ar">تأكيد</span><small>Confirm</small></button>
    <button class="pill cream wl-resend" type="button"><span class="wl-ar">ابعت كود تاني</span></button></form>`;
  const f=$('form',b), er=$('.wl-err',b), say=t=>{ er.textContent=t; er.hidden=false; };
  setTimeout(()=>f.code.focus(),60);
  $('.wl-resend',b).addEventListener('click',async()=>{ const r=await syCall('/auth/start',{email:a.email,name:a.name}); if(!r) return say('مفيش إنترنت دلوقتي');
    if(!r.j.ok) return say(SYERR[r.j.error]||'حصلت مشكلة'); SY.dev=r.j.devCode||''; say('اتبعت كود جديد'); });
  f.addEventListener('submit',async e=>{ e.preventDefault(); const code=f.code.value.trim();
    if(!/^[0-9٠-٩]{6}$/.test(code)) return wlBad(f,'code','اكتبي الـ ٦ أرقام');
    const ref=typeof refCode==='function'?refCode():null;
    const r=await syCall('/auth/verify',{email:a.email,code,name:a.name,phone:a.phone,curr:WL.pick||currPick()||{},ref,device:syDevice()});
    if(!r) return say('مفيش إنترنت دلوقتي');
    if(!r.j.ok) return wlBad(f,r.j.error==='code-wrong'?'code':'',(SYERR[r.j.error]||'حصلت مشكلة')+(r.j.error==='code-wrong'&&r.j.left>=0?` (باقي ${r.j.left} محاولات)`:''));
    syTake(r.j.token,r.j.me);
    if(r.j.me.kids.length&&!WL.adding&&!WL.after){ syRestore(r.j.me); return; }   // a parent coming back on a new device: their children come back
    syPushKids(); if(WL.after){ const go=WL.after; WL.after=null; go(); } else wlGo('kid'); });
}
// keep the signed-in parent on this device
function syTake(token,me){ const old=acct()||{};
  wlSet('es.session',{token,id:me.id,ref:me.ref});
  wlSet('es.account',{name:me.name||old.name,email:me.email,phone:me.phone||old.phone||'',created:me.created||old.created,id:me.id,ref:me.ref});
  window.ACCOUNT={...acct(),id:me.id,token}; if(me.wallet&&typeof walletSave==='function') walletSave(me.wallet); }
// the server's children replace this device's: each child's progress goes to its own keys, the first child becomes the active one
function syRestore(me){
  const K=me.kids.map(k=>({id:k.id,name:k.name,grade:k.grade,curr:k.curr,created:k.created}));
  try{ me.kids.forEach(k=>{ const P={...(k.progress||{}),'es.unlocked':JSON.stringify(k.unlocked||[]),'es.freeused':JSON.stringify(k.freeused||[])};
    KID_KEYS.forEach(x=>{ if(P[x]!=null) localStorage.setItem(`es.kid.${k.id}.${x}`,P[x]); else localStorage.removeItem(`es.kid.${k.id}.${x}`); });
    wlSet('es.progAt.'+k.id,k.progressAt||0); });
    const f=K[0]; KID_KEYS.forEach(x=>{ const v=localStorage.getItem(`es.kid.${f.id}.${x}`); if(v==null) localStorage.removeItem(x); else localStorage.setItem(x,v); }); }catch(e){}
  wlSet('es.kids',K); wlSet('es.kid',K[0].id); currSave(K[0].curr); location.reload();
}
// send this device's children (name, grade, curriculum) to the server
function syPushKids(){ if(!sySession()) return; kids().forEach(k=>syCall('/kids/'+k.id,{name:k.name,grade:k.grade,curr:k.curr},'PUT')); }
// send the active child's progress (stars, map place, opened lessons, words); unlocks / free picks go through js/coins.js
function syPushProgress(){ const k=kidNow(); if(!k||!sySession()) return; const P={}, at=Date.now();
  ['zoom-stars','zoom-opened','zoom-last','zoom-vocab'].forEach(x=>{ const v=localStorage.getItem(x); if(v!=null) P[x]=v; });
  const key=JSON.stringify(P); if(SY.lastProg===key) return; SY.lastProg=key;
  syCall('/kids/'+k.id+'/progress',{progress:P,at},'PUT').then(r=>{ if(r&&r.j.ok) wlSet('es.progAt.'+k.id,at); else SY.lastProg=null; }); }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') syPushProgress(); });
setInterval(syPushProgress,120e3);

/* ---------- on app open: refresh from the server (children, newer progress from another device) ---------- */
async function syBoot(){
  const s=sySession(); if(!s||!s.token) return;
  const r=await syCall('/me'); if(!r||!r.j.ok) return;
  const me=r.j.me, local=kids(), ids=new Set(me.kids.map(k=>k.id)); let changed=false;
  local.filter(k=>!ids.has(k.id)).forEach(k=>syCall('/kids/'+k.id,{name:k.name,grade:k.grade,curr:k.curr},'PUT'));   // made offline
  me.kids.filter(k=>!local.some(x=>x.id===k.id)).forEach(k=>{ local.push({id:k.id,name:k.name,grade:k.grade,curr:k.curr,created:k.created}); changed=true;
    try{ Object.entries(k.progress||{}).forEach(([x,v])=>localStorage.setItem(`es.kid.${k.id}.${x}`,v)); }catch(e){} wlSet('es.progAt.'+k.id,k.progressAt||0); });
  if(changed){ wlSet('es.kids',local); kidPaint(); }
  // the active child played on another device later than this one sent: take that copy
  const cur=kidNow(), sk=cur&&me.kids.find(k=>k.id===cur.id);
  if(sk&&sk.progressAt>(wlGet('es.progAt.'+cur.id,0)||0)&&Object.keys(sk.progress||{}).length){
    try{ Object.entries(sk.progress).forEach(([x,v])=>localStorage.setItem(x,v)); }catch(e){} wlSet('es.progAt.'+cur.id,sk.progressAt); location.reload(); }
}
syBoot();

/* ---------- children popup: confirm the email (made offline) / sign out ---------- */
async function syMenuButtons(p,close){
  if(!(await syApi())) return; const s=sySession(), a=acct()||{}, list=$('.wl-list',p); if(!list) return;
  const b=el('button',`pill ${s?'cream':'yellow'} wl-big wl-acct`,s?`<span class="wl-ar">تسجيل الخروج</span><small>Sign out</small>`:`<span class="wl-ar">تأكيد الحساب بالإيميل</span><small>Confirm your email</small>`);
  list.append(b);
  b.addEventListener('click',async()=>{ close();
    if(s){ if(!confirm('تسجيل الخروج من الجهاز ده؟ هيتطلب كود جديد على الإيميل للدخول تاني.')) return; syPushProgress(); await syCall('/auth/signout',{}); syForget();
      ['es.account','es.kids','es.kid'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} }); location.reload(); return; }
    WL.hist=[]; WL.adding=false; WL.pick=currPick(); WL.after=()=>{ openSubjects(); }; show('welcome');
    const r=await syCall('/auth/start',{email:a.email,name:a.name}); if(!r||!r.j.ok){ WL.step='parent'; wlDraw(); return; }
    SY.a=a; SY.dev=r.j.devCode||''; WL.step='code'; wlDraw(); });
}
;
/* ===== js/start.js ===== */
/* START — loads the course data (data/course.json + each subject's own file) and opens the first screen (subjects).
   Every other screen is in js/app-rest.js: it starts loading here, in the background, while the subjects page shows. */
let restOk=false;
const REST=new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='js/app-rest.js'; s.onload=()=>{ restOk=true; ok(); }; s.onerror=no; document.head.append(s); });
REST.catch(()=>{});
// run fn once the other screens are loaded (a tap on a subject right after the page opened waits for them behind the loading screen)
function needRest(fn){ if(restOk) return fn(); busy(true); REST.then(()=>{ busy(false); fn(); },()=>{ busy(false); message('Oops!','The app did not load. Check the internet and try again.'); $('#msgOk').onclick=()=>location.reload(); }); }
putCar($('#helloCar')); if(anim) G.to('#helloCar',{y:-5,duration:.9,yoyo:true,repeat:-1,ease:'sine.inOut'});
// stars saved before the files were split used the bare lesson id
function migrateStars(){ try{ ['zoom-stars','zoom-vocab'].forEach(k=>{ const o=JSON.parse(localStorage.getItem(k)||'{}'); let ch=false;
  Object.keys(o).forEach(id=>{ if(/^u\d+l\d+$/.test(id)&&!o['en-ol-'+id]){ o['en-ol-'+id]=o[id]; delete o[id]; ch=true; } });
  if(ch){ localStorage.setItem(k,JSON.stringify(o)); if(k==='zoom-stars') STARS=o; } }); }catch(e){} }
// design file of another build (an old copy kept on the device or in the browser) = screens without their look: fresh files, reload once
async function buildMixed(){
  let b=''; try{ b=getComputedStyle(document.documentElement).getPropertyValue('--app-build').trim().replace(/["']/g,''); }catch(e){}
  if(typeof APP_BUILD==='undefined'||b===APP_BUILD) { try{ sessionStorage.removeItem('es.rebuilt'); }catch(e){} return false; }
  try{ if(sessionStorage.getItem('es.rebuilt')) return false; sessionStorage.setItem('es.rebuilt','1'); }catch(e){ return false; }
  try{ const c=navigator.serviceWorker&&navigator.serviceWorker.controller;
    if(c) await new Promise(ok=>{ const ch=new MessageChannel(); ch.port1.onmessage=()=>ok(); c.postMessage('update',[ch.port2]); setTimeout(ok,5000); });
    await Promise.all(['index.html','css/app.css','js/app-first.js','js/app-rest.js'].map(f=>fetch(f,{cache:'reload'}).catch(()=>{})));
  }catch(e){}
  location.reload(); return true;
}
async function start(){
  migrateStars();
  busy(true);
  try{
    [COURSE,CURR]=await Promise.all([get('data/course.json'),get('data/curriculum.json').catch(()=>null)]);
    await Promise.all(COURSE.subjects.filter(s=>s.file).map(async s=>{
      const d=await get(s.file), base=s.file.slice(0,s.file.lastIndexOf('/')+1);
      s.units=d.units; s.labels=d.labels; s.lessons=d.lessons.map(l=>({...l, id:`${s.id}-${l.folder}`, file:l.title?base+l.folder+'/lesson.json':null}));
    }));
    currApply((typeof kidNow==='function'&&kidNow()||{}).curr||currPick());   // the parent's curriculum / school decides the subjects, tabs and map signs (js/curriculum.js)
  }catch(e){ busy(false); message('Oops!','The lessons did not load. Check the internet and try again.'); $('#msgOk').onclick=()=>location.reload(); return; }
  // theme: only an ACTIVE theme in course.json "themes" can be used; an inactive one (cardboard...) is never applied, whatever is saved. Flip "active" to offer it.
  try{ const T=COURSE.themes||{list:[]}, want=localStorage.getItem('es.theme')||T.default||'', ok=(T.list.find(t=>t.id===want)||{}).active;
    const r=document.documentElement; if(ok&&want) r.dataset.theme=want; else delete r.dataset.theme; }catch(e){}
  // design file and fonts: wait for them behind the splash screen (fonts at most 2.5 s, then the page shows with the fallback font)
  await cssReady;
  if(await buildMixed()) return;
  if(document.fonts&&document.fonts.ready) await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]);
  $('#helloSub').textContent=`${COURSE.grade} · ${COURSE.term}`; paintHud(); busy(false); kidPaint(); if(!kidNow()) openWelcome(); else { openSubjects(); pop('#subjects .top > *',{y:-20}); deepGo(); }   // first launch: curriculum + accounts (js/welcome.js)
  setTimeout(()=>{ const n=$('#splashName'); if(n) n.remove(); $('#loadingText').hidden=false; },400);   // the app name shows on the first screen only; later loads say Loading...
}
// sw.js keeps the app, lessons, sounds and pictures on the device (later opens are instant) and shows library pictures that replaced shipped ones
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(()=>{});
start();
window.__app={award,levelUp,openLesson:m=>openLesson(m),openMap:()=>openMap(),vTeach:()=>vTeach(),vWrite:()=>vWrite(),get LESSON(){return LESSON}};

/* hidden door to the design page (for the grown-ups reviewing): tap the EasyStudy logo 5 times quickly */
(function(){ let n=0,t=0; document.addEventListener('click',e=>{ if(!e.target.closest('.gamelogo')) return; const now=Date.now(); n=now-t<900?n+1:1; t=now; if(n>=5){ n=0; location.href='design.html'; } }); })();
;
