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
  $('#ewDefs').innerHTML=`<linearGradient id="ewg" x1="0" y1="0" x2="0" y2="1"><stop offset=".3" stop-color="#fff"/><stop offset="1" stop-color="#d4e6fb"/></linearGradient>
  <filter id="ews" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".3"/></filter>
  <linearGradient id="ewsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#f5a81c"/></linearGradient><clipPath id="ewsc"><path d="${EW_STAR}"/></clipPath>
  <g id="ewstar"><path d="${EW_STAR}" fill="#fff" stroke="#fff" stroke-width="9" stroke-linejoin="round" transform="rotate(12)"/><g transform="rotate(12)"><path d="${EW_STAR}" fill="url(#ewsg)" stroke="#1c58b8" stroke-width="2.5" stroke-linejoin="round"/><path d="M-8,-14 L-2,-24 L4,-14" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".85"/></g></g>`;
}
const ewT=(t,x,y,fs,sw,rot,ar)=>{ const a=`x="${x}" y="${y}" text-anchor="middle" class="ewt${ar?' ewa':''}" font-size="${fs}"`; const d=Math.max(3,Math.round(fs/10));   /* the logo look: white letters, a blue edge, a deeper blue extrusion below (3D) */
  return `<g transform="rotate(${rot} ${x} ${y})"><text ${a} fill="#1c4fa8" stroke="#1c4fa8" stroke-width="${sw+2}" transform="translate(0,${d})">${t}</text><text ${a} fill="url(#ewg)" stroke="#2b6bd2" stroke-width="${sw}">${t}</text></g>`; };
const ewStar=(x,y,s)=>`<g filter="url(#ews)" transform="translate(${x},${y}) scale(${s})"><use href="#ewstar"/></g>`;
// kind: 'app' | a subject id. Same layout as the Easy Study logo: small word on top, big word below, a big sticker where the star is.
function ewIcon(kind){
  if(kind==='app') return `<svg viewBox="0 0 240 240" aria-hidden="true"><g transform="translate(0,-4)">${ewT('EASY',100,112,46,8,-5)}${ewT('WORDS',120,178,66,11,2)}${ewStar(196,88,1.2)}${ewStar(34,82,.5)}</g></svg>`;
  const d=EW_SUBJ[kind]; if(!d) return ''; const sm='<g transform="translate(120 120) scale(.76) translate(-120 -120)">', e='</g></svg>';   // (the writing stays well inside the square)
  if(d.lang==='ar') return `<svg viewBox="0 0 240 240" aria-hidden="true">${sm}${ewT(d.small,120,86,60,9,-3,1)}${ewT(d.big,120,188,84,11,2,1)}${e}`;
  return `<svg viewBox="0 0 240 240" aria-hidden="true">${sm}${ewT(d.small,88,92,35,8,-5)}${ewT(d.sub,120,178,66,11,2)}${ewT(d.big,176,134,66,9,8)}${e}`;
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
  if(!EW.curr) return openWelcome();
  SUBJECT=null; EW.cur=null; show('subjects'); ewHome();
}
function ewHome(){
  $('#ewHomeLogo').innerHTML=ewIcon('app'); paintHud();
  $('#ewGrade').textContent=ewGradeLine();
  const subs=ewSubjects(); const box=$('#ewHome'); box.dataset.n=subs.length;
  box.innerHTML=subs.map(s=>`<button class="ew-subj" data-id="${s.id}" aria-label="${EW_SUBJ[s.id].name}"><span class="ew-icon">${ewIcon(s.id)}</span></button>`).join('')||'<p class="ew-empty">قريبًا</p>';
  $$('#ewHome .ew-subj').forEach(b=>b.addEventListener('click',()=>{ blip(600); EW.cur=COURSE.subjects.find(s=>s.id===b.dataset.id); openMap(); }));
}

const EW_LOCK='<svg class="ewlock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
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
  const F=EW.fold||(EW.fold={}), CHEV='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  body.innerHTML=`<div class="ew-mapbar"><button class="ew-foldall" id="ewFoldAll" type="button"></button></div>`+ewUnits(s).map(u=>`<section class="ew-unit${F['u'+s.id+u.unit]?' closed':''}" data-k="u${s.id}${u.unit}"><div class="ew-utab" role="button" tabindex="0" aria-expanded="${F['u'+s.id+u.unit]?'false':'true'}" dir="${ar?'rtl':'ltr'}"><span>${u.name}</span><i class="ew-chev">${CHEV}</i></div><div class="ew-ubody">`+u.lessons.map(l=>{
    const L=l.open&&EW.les[l.id], num=ar?ewN(l.lesson):l.lesson, fk='l'+l.id;
    return `<div class="ew-lrow${L?'':' solo'}${F[fk]?' closed':''}" data-k="${fk}"><div class="ew-lwrap"><button class="ew-lsq${l.open?'':l.locked?' soon locked':' soon'}" data-id="${l.id}" ${l.open||l.locked?'':'disabled'}><b class="ew-lnum">${num}</b><span class="ew-lname" dir="${ar?'rtl':'ltr'}">${l.name}</span>${l.open?'':l.locked?`<i class="lk">${EW_LOCK} مقفول</i>`:'<i>قريبًا</i>'}</button>${L?`<button class="ew-lfold" type="button" aria-label="${l.name}" aria-expanded="${F[fk]?'false':'true'}">${CHEV}</button>`:''}</div>`+
      (L?`<div class="ew-words">${L.vocab.map((v,i)=>`<button class="ew-wsq" data-id="${l.id}" data-i="${i}" aria-label="${v.word}"><span class="ew-wimg">${v.img?`<img src="${v.img}" alt=""${/\.png$/i.test(v.img)?' class="cut"':''}>`:''}</span><b dir="${ar?'rtl':'ltr'}">${v.word}</b>${(VDONE[l.id]||[]).includes(v.word)?`<span class="vst">${STAR(true)}</span>`:''}</button>`).join('')}</div>`:'')+`</div>`; }).join('')+`</div></section>`).join('');
  // expand / collapse: whole map (button, top right), one unit (arrow on its tab), one lesson's words (arrow on the lesson)
  const fa=$('#ewFoldAll'), sync=()=>{ const any=$$('#ewMapBody .ew-unit:not(.closed)').length||$$('#ewMapBody .ew-lrow:not(.solo):not(.closed)').length; fa.dataset.mode=any?'close':'open'; fa.innerHTML=`<i class="ew-chev">${CHEV}</i><span>${any?'إغلاق الكل':'فتح الكل'}</span>`; };
  const setU=(e,c)=>{ e.classList.toggle('closed',c); F[e.dataset.k]=c; e.querySelector('.ew-utab').setAttribute('aria-expanded',c?'false':'true'); };
  const setL=(e,c)=>{ e.classList.toggle('closed',c); F[e.dataset.k]=c; const b=e.querySelector('.ew-lfold'); if(b) b.setAttribute('aria-expanded',c?'false':'true'); };
  $$('#ewMapBody .ew-utab').forEach(h=>{ const go=()=>{ blip(600); const e=h.parentNode; setU(e,!e.classList.contains('closed')); sync(); }; h.addEventListener('click',go); h.addEventListener('keydown',ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); go(); } }); });
  $$('#ewMapBody .ew-lfold').forEach(b=>b.addEventListener('click',()=>{ blip(600); const e=b.closest('.ew-lrow'); setL(e,!e.classList.contains('closed')); sync(); }));
  fa.addEventListener('click',()=>{ blip(600); const c=fa.dataset.mode==='close'; $$('#ewMapBody .ew-unit').forEach(e=>setU(e,c)); $$('#ewMapBody .ew-lrow:not(.solo)').forEach(e=>setL(e,c)); sync(); });
  sync();
  $$('#ewMapBody .ew-lsq:not(.soon)').forEach(b=>b.addEventListener('click',()=>{ blip(600); ewOpenLesson(b.dataset.id,0); }));
  $$('#ewMapBody .ew-lsq.locked').forEach(b=>b.addEventListener('click',()=>{ blip(600); const l=ewUnits(s).flatMap(u=>u.lessons).find(x=>x.id===b.dataset.id); if(l) lockTap('lesson',l,coinAccess(l,true,'l:'+l.id,0,'lesson').coins,`<span class="jlockbig">${EW_LOCK}</span>`,()=>openMap()); }));   // js/coins.js: open with credits or a subscription
  $$('#ewMapBody .ew-wsq').forEach(b=>b.addEventListener('click',()=>{ blip(600); ewOpenLesson(b.dataset.id,+b.dataset.i,true); }));
}
