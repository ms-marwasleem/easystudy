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
const get = url => fetch(url).then(r=>{ if(!r.ok) throw new Error(url); return r.json(); });

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
   Things the child unlocked with coins are remembered in localStorage (es.unlocked) by id; the real coin balance / server comes later. */
function unlockedIds(){ try{ return new Set(JSON.parse(localStorage.getItem('es.unlocked')||'[]')); }catch(e){ return new Set(); } }
function accessOf(o,hasContent,id,idx,kind){
  const A=COURSE.access||{}; let st=!hasContent?'soon':(o.status||'open');
  if(st==='open'&&!o.status&&A.enabled&&A.trial&&kind==='unit'&&idx>=(A.trial.units||1)) st='locked';
  if(st==='locked'&&id&&unlockedIds().has(id)) st='open';
  return {st,coins:o.coins!=null?o.coins:(A.coins||0)};
}
const COINTXT=n=>n?`${n} ${isAr()?'عملة':'coins'}`:'';
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
  const longest=Math.max(...lines.map(w=>w.length)), size=Math.min(lines.length>1?38:44, 126/(longest*.66));
  const font=s.rtl?'Baloo Bhaijaan 2':'Luckiest Guy', cy=90-(lines.length-1)*size*.5;
  const t=(k,w,dy,fill,stroke,sw,op)=>`<text x="119" y="${(cy+k*size*1.02+size*.34+dy).toFixed(1)}" text-anchor="middle" font-family="${font}, sans-serif" font-weight="${s.rtl?800:400}" letter-spacing="${s.rtl?0:(size*.03).toFixed(1)}" font-size="${size.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" opacity="${op}">${w}</text>`;
  const txt=lines.map((w,k)=>t(k,w,0,'#fff','#fff',s.rtl?0:size*.045,1)).join('')   /* name: plain white, no shadow, in the middle of the cover */;
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
  pencil:'<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.8L16 4.4a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L8.8 18.8z"/><path d="M4 20l4.8-1.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="#fff"><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" stroke-width="2.6"/></svg>'
};


/* picture look (theme part 3): png cut-outs of objects have no frame; people / nature pictures keep the photo frame. The words are in data/pic-frame.json. */
let PFRE=null;
function markPf(i){ if(!PFRE||!i||i.tagName!=='IMG') return; const f=(i.getAttribute('src')||'').split('/').pop().replace(/\.\w+$/,'').replace(/^[0-9a-z]{1,2}-(?=[a-z])/i,''); i.classList.toggle('pf',PFRE.test(f)); }
document.addEventListener('load',e=>{ const i=e.target; if(i&&i.tagName==='IMG'&&i.naturalWidth) i.style.setProperty('--ar',i.naturalWidth/i.naturalHeight); markPf(i); },true);   // --ar = the picture's own shape: the frame hugs it (frame.css)
fetch('data/pic-frame.json').then(r=>r.ok?r.json():null).then(j=>{ if(!j) return; PFRE=new RegExp('(^|-)('+[...(j.people||[]),...(j.nature||[])].join('|')+')(s)?(-|$)','i'); document.querySelectorAll('img').forEach(markPf); }).catch(()=>{});

/* ONE voice at a time: whatever is being read (lesson recording, word, question, exam) stops the moment the child goes somewhere else */
function stopVoice(){ try{ if(typeof stopAll==='function') stopAll(); if(typeof vStop==='function') vStop(); }catch(e){} }
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
function paintHud(){ $$('[data-hud]').forEach(h=>h.innerHTML=`<span class="ic">${STAR(true)}</span><span>${total()}</span>`); }
const PARTS=[['read','Lesson'],['words','Vocabulary'],['quiz','Questions'],['booklet','Booklet'],['grammar','Grammar']];   // names go through tr() when shown

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
  $('#slots').innerHTML=PARTS.filter(([p])=>LESSON&&LESSON.tabs?LESSON.tabs.includes(p):['read','words','quiz'].includes(p)).map(([p,l0])=>{ const l=tr(l0); return `<button class="slot" data-p="${p}" aria-label="Go to ${l}">${STAR(false)}${STARS[id]&&STARS[id][p]?`<span class="on" style="position:absolute;inset:0">${STAR(true)}</span>`:''}<span class="lbl">${l}</span></button>`; }).join('');
  putCar($('#lvlCar'),'wow'); o.hidden=false; spinRays(o);
  if(!anim) return;
  G.from('#lvlTitle',{scale:0,rotation:-8,duration:.55,ease:'back.out(2.4)'});
  G.from('#slots .slot',{scale:0,duration:.35,stagger:.08,delay:.15,ease:'back.out(2)'});
  $$('#slots .on').forEach((s,i)=>G.fromTo(s,{scale:2.6,y:-160,opacity:0,rotation:-120},{scale:1,y:0,opacity:1,rotation:0,duration:.6,ease:'bounce.out',delay:.6+i*.45,onStart:()=>chime(i)}));
  G.fromTo('#lvlCar',{y:0},{y:-16,duration:.28,yoyo:true,repeat:5,ease:'power1.out',delay:.5});
  G.from('#levelUp .btns',{y:40,opacity:0,duration:.4,delay:.9});
  G.delayedCall(.7+$$('#slots .on').length*.45,()=>confetti(150));
}
$('#lvlAgain').addEventListener('click',()=>{ $('#levelUp').hidden=true; if(tab==='words'){ vs.i=0; vTeach(); } else if(inQ()) showQuiz(0); else playFrom(0); });
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
const arBase=g=>g.replace(new RegExp('['+AR_MARKS+'\\u0640]','g'),'');
const sameLetter=(a,b)=>{ const n=c=>arBase(c).replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase(); return n(a)===n(b); };
const num=n=>isAr()?String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]):String(n);
// the direction of the subject's screens is set ONCE, here: languages left-to-right, Arabic right-to-left (course.json "rtl").
// Everything inside follows it (logical css: inline-start/end); only parts that must keep their place say direction:ltr themselves (page/question arrows, the lesson road).
function subjDir(){ const ar=isAr(); ['map','lesson','exam'].forEach(s=>{ const e=$('#'+s); e.dir='ltr'; e.lang=ar?'ar':'en'; e.classList.toggle('ar',ar); }); }
function setLook(t){ const sj=(typeof SUBJECT!=='undefined'&&SUBJECT)?SUBJECT.id:''; const k=(t==='booklet'||t==='workbook')?'booklet':'school'; const v=sj?sj+'-'+k:''; if(v) document.documentElement.dataset.look=v; else delete document.documentElement.dataset.look; }   // book look = subject + which printed book the tab belongs to (theme.css BOOK LOOKS)
function show(id){ if(id!=='lesson') setLook(''); stopVoice(); if(id!=='subjects') subjDir(); { const sj=(id!=='subjects'&&typeof SUBJECT!=='undefined'&&SUBJECT)?SUBJECT.id:''; [document.documentElement,document.body].forEach(e=>{ e.dataset.view=id; e.dataset.subj=sj; }); } ['subjects','map','lesson','exam'].forEach(s=>$('#'+s).hidden=s!==id); hideHint(); if(typeof appNav==='function') appNav(id); fadeIn('#'+id); }
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
    try{ const v=await (await fetch('version.json',{cache:'no-cache'})).json(); if(v&&v.v&&v.v!==window.APP_V) APPV.newer=true; }catch(e){} }
  if(APPV.newer&&screen==='subjects'&&!document.getElementById('subjects').hidden&&!(typeof player!=='undefined'&&player.run)){ await swFresh(); location.reload(); }
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
/* ===== js/subjects.js ===== */
/* SUBJECTS screen — the cardboard boxes. */
/* ---------- Subjects ---------- */
let wig=null;
function drawSubjects(){
  const g=$('#boxes'); g.innerHTML='';
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
function openSubjects(){ if(restOk){ stopAll(); vStop(); clearMarks(); } show('subjects'); drawSubjects(); pop('.box'); showHint($('.box.open'),COURSE.hints.subjects,1300,'subjects'); }
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
async function start(){
  migrateStars();
  busy(true);
  try{
    COURSE=await get('data/course.json');
    await Promise.all(COURSE.subjects.filter(s=>s.file).map(async s=>{
      const d=await get(s.file), base=s.file.slice(0,s.file.lastIndexOf('/')+1);
      s.units=d.units; s.labels=d.labels; s.lessons=d.lessons.map(l=>({...l, id:`${s.id}-${l.folder}`, file:l.title?base+l.folder+'/lesson.json':null}));
    }));
  }catch(e){ busy(false); message('Oops!','The lessons did not load. Check the internet and try again.'); $('#msgOk').onclick=()=>location.reload(); return; }
  // theme: only an ACTIVE theme in course.json "themes" can be used; an inactive one (cardboard...) is never applied, whatever is saved. Flip "active" to offer it.
  try{ const T=COURSE.themes||{list:[]}, want=localStorage.getItem('es.theme')||T.default||'', ok=(T.list.find(t=>t.id===want)||{}).active;
    const r=document.documentElement; if(ok&&want) r.dataset.theme=want; else delete r.dataset.theme; }catch(e){}
  // design file and fonts: wait for them behind the splash screen (fonts at most 2.5 s, then the page shows with the fallback font)
  await cssReady;
  if(document.fonts&&document.fonts.ready) await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]);
  $('#helloSub').textContent=`${COURSE.grade} · ${COURSE.term}`; paintHud(); busy(false); openSubjects(); pop('#subjects .top > *',{y:-20});
  setTimeout(()=>{ const n=$('#splashName'); if(n) n.remove(); $('#loadingText').hidden=false; },400);   // the app name shows on the first screen only; later loads say Loading...
}
// sw.js keeps the app, lessons, sounds and pictures on the device (later opens are instant) and shows library pictures that replaced shipped ones
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(()=>{});
start();
window.__app={award,levelUp,openLesson:m=>openLesson(m),openMap:()=>openMap(),vTeach:()=>vTeach(),vWrite:()=>vWrite(),get LESSON(){return LESSON}};

/* hidden door to the design page (for the grown-ups reviewing): tap the EasyStudy logo 5 times quickly */
(function(){ let n=0,t=0; document.addEventListener('click',e=>{ if(!e.target.closest('.gamelogo')) return; const now=Date.now(); n=now-t<900?n+1:1; t=now; if(n>=5){ n=0; location.href='design.html'; } }); })();
;
