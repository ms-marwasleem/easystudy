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
