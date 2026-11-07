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
