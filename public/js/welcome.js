/* WELCOME + ACCOUNTS (Marwa 2026-11-05; redesigned 2026-11-11). ONE screen in stages: 1) "دخول ولي الأمر" = email and/or mobile (at least one, no parent name),
   known parent -> straight into the app (child picker when more than one child); new parent -> stage 2 opens below on the same page:
   the student (name, grade, curriculum; لغات -> school list + "إضافة مدرسة" popup that sends a WhatsApp request to the administration). Then the home page.
   Later: the profile button (home, bottom right, child's name beside it) opens the parent gate (Arabic number words, js/coins.js) and then the account page (children, profile, my subscriptions).
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
const WL={step:'main',stage:1,pick:null,adding:false,login:null,pending:false};
const wlEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wlDigits=s=>String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g,'');
const wlSamePhone=(a,b)=>{ a=wlDigits(a); b=wlDigits(b); return a.length>=8&&b.length>=8&&a.slice(-10)===b.slice(-10); };
const wlSameId=(a,b)=>!!a&&!!b&&((!!a.email&&!!b.email&&a.email.toLowerCase()===b.email.toLowerCase())||wlSamePhone(a.phone,b.phone));
// a wrong / missing field: THAT field turns red, shakes and gets the focus; the message shows under the form (Marwa 2026-11-05, every form)
function wlBad(f,name,msg){ const er=$('.wl-err',f); $$('.bad',f).forEach(x=>x.classList.remove('bad')); if(er){ er.textContent=msg; er.hidden=false; }
  const i=name&&f[name]; if(!i) return; i.classList.add('bad'); i.focus(); if(anim) G.fromTo(i,{x:0},{x:8,duration:.06,repeat:5,yoyo:true,clearProps:'transform'});
  i.addEventListener('input',()=>{ i.classList.remove('bad'); if(er) er.hidden=true; },{once:true}); }
// the short app description (Marwa 2026-11-05/06): on the loading screen (index.html #splashName .ldab, first load only), big on the first stage, small later
function wlAbout(sz='sm'){ return `<div class="wl-about ${sz}" dir="rtl"><p class="wl-tag">مذاكرة أولى ابتدائي بلعبة مسلية للأطفال</p><ul class="wl-pts"><li>شرح الدرس</li><li>تحفيظ الكلمات</li><li>تدريب الأسئلة</li></ul></div>`; }
function wlHead(ar,en){ return `<h2 class="wl-h"><span>${ar}</span><small>${en}</small></h2>`; }
// autofocus (Ahmed 2026-11-07): a form opens with the cursor in its first EMPTY required field; Enter moves to the next empty one, the last one submits
function wlFocus(f){ if(!f) return; const ins=[...f.querySelectorAll('input[required]')], first=ins.find(i=>!i.value.trim());
  ins.forEach(i=>i.addEventListener('keydown',e=>{ if(e.key!=='Enter') return; const nx=ins.slice(ins.indexOf(i)+1).find(x=>!x.value.trim()); if(nx){ e.preventDefault(); nx.focus(); } }));
  if(first) setTimeout(()=>{ try{ first.focus({preventScroll:true}); const n=first.value.length; first.setSelectionRange&&first.type!=='email'&&first.setSelectionRange(n,n); }catch(_){} },120); }
function wlGo(step){ WL.step=step; wlDraw(); }
// a child's round picture: its first letter on a colour (same child = same colour)
const AVC=['#F27A0C','#2DAE8A','#3F8FE0','#E0508A','#8A5CD6','#D9A400'];
const wlAv=k=>{ let h=0; for(const c of String(k.id||k.name)) h=(h*31+c.charCodeAt(0))%997; return `<i class="wl-av" style="--av:${AVC[h%AVC.length]}">${wlEsc([...String(k.name||'?')][0])}</i>`; };
const wlTypeOn=t=>!((typeof ESET!=='undefined'&&ESET&&ESET.currOff)||{})[t.id];   // admin switch (dashboard > إعدادات التطبيق > المناهج)
const wlTypeLabel=t=>t.id==='private'?'لغات':t.ar;
function wlDraw(){
  const b=$('#wlBody'); $('#wlBack').hidden=!(WL.adding||WL.step==='code'); $('#welcome').dataset.step=WL.step==='main'&&!WL.adding&&WL.stage===1?'curr':'form';   // big logo on the first stage, smaller later (css/welcome.css)
  if(WL.step==='code') syDrawCode(b);
  else if(WL.step==='pick') wlPicker(b);
  else wlMain(b);
  b.insertAdjacentHTML('afterbegin',wlBrand());   // the app logo at the top of the soft card (Ahmed 2026-11-19)
  pop('#wlBody > *, #wlBody form > *',{y:16});
}
// the logo of the app (the same block that used to sit on the game background), now inside the white login card; hidden outside by css/account.css
function wlBrand(){ const l=$('#welcome .wl-logo'); return l?`<div class="wl-brand" aria-hidden="true">${l.innerHTML.replace(/ id="[^"]*"/g,'')}</div>`:''; }
function wlMain(b){
  const ed=WL.edit&&kids().find(k=>k.id===WL.edit), onlyKid=WL.adding||!!ed, L=WL.login||(WL.login={email:'',phone:''}), reg=WL.stage>1;
  let h=onlyKid?'':wlAbout(reg?'sm':'');
  if(!onlyKid){
    h+=wlHead('دخول ولي الأمر','Parent login')+(reg?`<div class="wl-sum"><span dir="ltr">${wlEsc([L.email,L.phone].filter(Boolean).join('  ·  '))}</span><button type="button" class="pill cream wl-chip wl-chg">تعديل</button></div>`:
    `<form class="wl-form wl-login" novalidate>
      <label><span>البريد الإلكتروني <small>Email</small></span><input name="email" type="email" dir="ltr" autocomplete="email" inputmode="email" value="${wlEsc(L.email)}"></label>
      <div class="wl-or" aria-hidden="true"><span>أو</span></div>
      <label><span>رقم الموبايل <small>Mobile</small></span><input name="phone" type="tel" dir="ltr" autocomplete="tel" inputmode="tel" value="${wlEsc(L.phone)}"></label>
      <p class="wl-err" hidden></p>
      <button class="pill wl-big wl-go" type="submit"><span class="wl-ar">دخول</span><small>Continue</small></button></form>`);
  }
  if(onlyKid||reg) h+=wlStudentHTML(ed);
  b.innerHTML=h;
  if(!onlyKid&&!reg){
    const f=$('.wl-login',b); f.addEventListener('submit',e=>{ e.preventDefault(); const v=n=>f[n].value.trim(), er=$('.wl-err',b);
      const bad=!v('email')&&!v('phone')?['email','اكتب الإيميل أو رقم الموبايل (واحد على الأقل)']:v('email')&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))?['email','البريد الإلكتروني مش مكتوب صح']:v('phone')&&!/^[+0-9٠-٩ ]{8,16}$/.test(v('phone'))?['phone','رقم الموبايل مش مكتوب صح']:null;
      if(bad) return wlBad(f,...bad);
      const go=$('.wl-go',b); go.disabled=true, id={email:v('email'),phone:v('phone')};
      wlLogin(id,t=>{ er.textContent=t; er.hidden=false; go.disabled=false; }); });
    wlFocus(f);
  } else { const c=$('.wl-chg',b); if(c) c.addEventListener('click',()=>{ WL.stage=1; wlDraw(); }); wlStudentBind(b,ed); }
}
// the parent's login: known on this device -> in; server on + email -> a code (js/sync.js); otherwise the student stage opens below
function wlLogin(id,err){
  WL.login=id; const ex=acct();
  if(ex&&wlSameId(ex,id)&&kids().length) return wlEnter();
  acctSubmit(id,err);
}
// a known parent: one child = straight into the app, more = the child picker
function wlEnter(){ const K=kids(); if(!K.length) return; WL.stage=1; WL.adding=false; wlGo('pick'); }   // an existing account: always the student chooser (name + picture, or add a new student)
function wlPicker(b){ const K=kids();
  b.innerHTML=wlHead('مين اللي هيتعلم؟','Who\'s learning?')+`<div class="wl-pick">${K.map(k=>`<button type="button" class="wl-who" data-kid="${k.id}">${wlAv(k)}<b>${wlEsc(k.name)}</b><small>${wlEsc(gradeLabel(k.grade))}</small></button>`).join('')}
    <button type="button" class="wl-who wl-newkid"><i class="wl-av wl-plus">${ICON.plus}</i><b>إضافة طالب جديد</b></button></div>`;
  $$('[data-kid]',b).forEach(x=>x.addEventListener('click',()=>{ const id=x.dataset.kid, cur=kidNow(); if(cur&&cur.id===id){ openSubjects(); pop('#subjects .top > *',{y:-20}); } else kidSwitch(id); }));
  $('.wl-newkid',b).addEventListener('click',()=>{ WL.adding=true; WL.fromPick=true; WL.edit=null; WL.draft=null; WL.grade=null; WL.pick=null; WL.step='main'; wlDraw(); }); }
// the student form (stage 2, add a child, edit a child): name, grade, curriculum; لغات -> the school list
function wlSchoolName(id){ const s=id&&CURR&&CURR.schools.find(x=>x.id===id); return s?s.ar:''; }
// "اختر مدرسة": one button -> a popup list of the schools; "إضافة مدرسة" at the end only at registration (canAdd)
function wlSchoolList(btn,canAdd){
  const host=btn.parentNode; host.classList.add('wl-ddhost');
  let d=$('.wl-dd',host); if(d){ d.hidden=!d.hidden; return; }
  const C=CURR||{schools:[]}, cur=(WL.pick||{}).school;
  d=el('div','wl-dd',`${canAdd?`<button type="button" class="pill green wl-addsch">${ICON.plus} إضافة مدرسة</button>`:''}${C.schools.map(s=>`<button type="button" class="wl-ddi${cur===s.id?' on':''}" data-school="${s.id}">${s.ar}</button>`).join('')}`);
  host.append(d);
  document.addEventListener('click',e=>{ if(!d.contains(e.target)&&e.target!==btn) d.hidden=true; });
  $$('[data-school]',d).forEach(x=>x.addEventListener('click',()=>{ WL.pick={type:'private',school:x.dataset.school}; btn.textContent=wlSchoolName(x.dataset.school); btn.classList.add('on'); $$('.wl-ddi',d).forEach(y=>y.classList.toggle('on',y===x)); d.hidden=true;
    const ek=WL.edit&&kids().find(k=>k.id===WL.edit), granted=!!(ek&&ek.curr&&ek.curr.school===x.dataset.school&&ek.curr.grant);
    if(typeof schoolNeedsPerm==='function'&&schoolNeedsPerm(x.dataset.school)&&!granted) wlPermPop(x.dataset.school); }));
  const ad=$('.wl-addsch',d); if(ad) ad.addEventListener('click',()=>{ d.hidden=true; wlSchoolPop(); });
}
/* a school that needs the school's permission (dashboard: المناهج والمدارس > محتاجة سماح): an OFFICIAL popup (a white card like the account pages, not the game popup) with one button that opens the parent's own
   WhatsApp with the request already written; the parent picks the school's contact and sends. The pick stays; the school's own books open when the admin grants THIS student (users table). */
function wlPermPop(id){
  let o=$('#permPop'); if(!o){ o=el('div','offback',''); o.id='permPop'; o.setAttribute('role','dialog'); document.body.append(o); o.addEventListener('click',e=>{ if(e.target===o) o.hidden=true; }); }
  const S=typeof CS==='function'?CS():{}, link=S.shareUrl||location.origin+location.pathname.replace(/[^/]*$/,''), name=S.appName||'EasyStudy';
  const msg='برجاء السماح لى باستخدام المدرسة على '+name+' :\n'+link;
  o.innerHTML=`<section class="ac-card offpop"><h3>${wlEsc(wlSchoolName(id))}</h3><p class="offt">اطلب من المدرسة السماح لك</p>
    <button type="button" class="pill green off-wa">${typeof SHAPPS!=='undefined'?SHAPPS[0][4]:''}<span>إرسال على واتساب</span></button><button type="button" class="pill cream off-x">تمام</button></section>`;
  $('.off-x',o).addEventListener('click',()=>o.hidden=true);
  $('.off-wa',o).addEventListener('click',()=>{ if(typeof shareGo==='function') shareGo('wa',msg,''); else window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank'); });
  o.hidden=false; }
function wlStudentHTML(ed){
  const G=(CURR&&CURR.grades)||[{id:'p1',ar:'الصف الأول الابتدائي',open:true}], C=CURR||{types:[],schools:[]}, gr=WL.grade||(ed&&ed.grade)||G[0].id, pk=WL.pick||{}, priv=pk.type==='private';
  if(WL.draft==null&&ed) WL.draft=ed.name;
  return wlHead(ed?'تعديل حساب الطفل':'تسجيل الطالب',ed?'Edit child':'Student')+`<form class="wl-form wl-stu" novalidate>
    <label><span>اسم الطالب <small>Student's name</small></span><input name="kid" autocomplete="off" value="${wlEsc(WL.draft||'')}" required></label>
    <div class="wl-field"><span>السنة الدراسية <small>Grade</small></span><div class="wl-chips">${G.map(g=>`<button type="button" class="pill cream wl-chip${g.id===gr?' on':''}" data-grade="${g.id}"${g.open?'':' disabled'}>${g.ar}</button>`).join('')}</div></div>
    <div class="wl-field"><span>المنهج <small>Curriculum</small></span><div class="wl-chips">${C.types.map(t=>`<button type="button" class="pill cream wl-chip${pk.type===t.id?' on':''}" data-type="${t.id}"${wlTypeOn(t)||pk.type===t.id?'':' disabled'}>${wlTypeLabel(t)}${wlTypeOn(t)?'':' <small>قريبًا</small>'}</button>`).join('')}</div></div>
    ${priv?`<div class="wl-field wl-schools2"><span class="wl-sh">المدرسة <small>لتوافق كتب المستوى الرفيع AL</small></span><div class="wl-chips col"><button type="button" class="pill cream wl-chip wl-pickschool${pk.school?' on':''}">${wlSchoolName(pk.school)||'اختر مدرسة'}</button></div></div>`:''}
    <p class="wl-err" hidden></p>
    <button class="pill wl-big wl-go green" type="submit">${ed?'<span class="wl-ar">حفظ</span><small>Save</small>':'<span class="wl-ar">يلا نبدأ</span><small>Let\'s go</small>'}</button></form>`; }
function wlStudentBind(b,ed){
  const G=(CURR&&CURR.grades)||[{id:'p1'}], f=$('.wl-stu',b);
  $('input[name=kid]',b).addEventListener('input',e=>WL.draft=e.target.value);
  $$('[data-grade]',b).forEach(x=>x.addEventListener('click',()=>{ WL.grade=x.dataset.grade; $$('[data-grade]',b).forEach(y=>y.classList.toggle('on',y===x)); }));
  $$('[data-type]',b).forEach(x=>x.addEventListener('click',()=>{ WL.pick={type:x.dataset.type}; WL.draft=f.kid.value; wlDraw(); }));
  const ps=$('.wl-pickschool',b); if(ps) ps.addEventListener('click',()=>wlSchoolList(ps,!ed));
  f.addEventListener('submit',e=>{ e.preventDefault(); const n=f.kid.value.trim(), pk=WL.pick;
    if(!n) return wlBad(f,'kid','اكتب اسم الطالب');
    if(!pk) return wlBad(f,null,'اختار المنهج');
    if(pk.type==='private'&&!pk.school) return wlBad(f,null,'اختار المدرسة (أو اطلب إضافة مدرستك)');
    const gr=WL.grade||(ed&&ed.grade)||G[0].id;
    if(ed){ kidSave(ed.id,{name:n,grade:gr,curr:(ed.curr&&ed.curr.grant&&pk.school&&ed.curr.school===pk.school)?{...pk,grant:1}:pk}); return; }
    // a different parent than the one kept on this device: that device list starts again (the server brings its own children back)
    const A=acct(); if(!WL.adding&&A&&!wlSameId(A,WL.login)){ wlSet('es.kids',[]); wlSet('es.kid',null); }
    if(!WL.adding&&!(acct()&&wlSameId(acct(),WL.login))) wlSet('es.account',{email:WL.login.email,phone:WL.login.phone,created:new Date().toISOString(),...(WL.pending?{pending:true}:{})});
    const K=kids(), first=!K.length, kd={id:'k'+Date.now().toString(36),name:n,grade:gr,curr:pk,created:new Date().toISOString()};
    K.push(kd); wlSet('es.kids',K); syPushKids();
    if(first){ wlSet('es.kid',kd.id); currSave(kd.curr); currApply(kd.curr); WL.adding=false; WL.stage=1; kidPaint(); openSubjects(); pop('#subjects .top > *',{y:-20}); }   // the first child keeps the progress already on this device
    else kidSwitch(kd.id); });
  wlFocus(f);
}
// "إضافة مدرسة": 4 fields -> a WhatsApp message to the administration (settings "whatsapp" = their number, set in admin.html; none = the parent picks the contact)
function wlSchoolPop(){
  let o=$('#schPop'); if(!o){ o=el('div','overlay','<div class="rays"></div><div class="popup kidpop" role="dialog" aria-label="Add school"></div>'); o.id='schPop'; document.body.append(o); o.addEventListener('click',e=>{ if(e.target===o) o.hidden=true; }); }
  const p=$('.kidpop',o);
  p.innerHTML=`<button class="rb popx" aria-label="Close">${ICON.close}</button>${wlHead('إضافة مدرسة','Add a school')}<form class="wl-form" novalidate>
    <label><span>اسم المدرسة</span><input name="school" autocomplete="off" required></label>
    <label><span>اسم المسؤول</span><input name="who" autocomplete="off" required></label>
    <label><span>وظيفة المسؤول</span><input name="job" autocomplete="off" required></label>
    <label><span>رقم المسؤول</span><input name="tel" type="tel" dir="ltr" autocomplete="tel" inputmode="tel" required></label>
    <p class="wl-err" hidden></p>
    <button class="pill wl-big wl-go green" type="submit"><span class="wl-ar">إرسال على واتساب</span><small>Send on WhatsApp</small></button></form>`;
  $('.popx',p).addEventListener('click',()=>o.hidden=true);
  const f=$('form',p); f.addEventListener('submit',e=>{ e.preventDefault(); const v=n=>f[n].value.trim();
    const bad=!v('school')?['school','اكتب اسم المدرسة']:!v('who')?['who','اكتب اسم المسؤول']:!v('job')?['job','اكتب وظيفة المسؤول']:!v('tel')?['tel','اكتب رقم المسؤول']:null;
    if(bad) return wlBad(f,...bad);
    const msg='طلب إضافة مدرسة لتطبيق easy study\n\nاسم المدرسة: '+v('school')+'\nاسم المسؤول: '+v('who')+'\nوظيفة المسؤول: '+v('job')+'\nرقم المسؤول: '+v('tel'),
      num=wlDigits((typeof ESET!=='undefined'&&ESET&&ESET.whatsapp)||'');
    window.open('https://wa.me/'+num+'?text='+encodeURIComponent(msg),'_blank'); o.hidden=true; });
  o.hidden=false; if(typeof spinRays==='function') spinRays(o); wlFocus(f);
}
$('#wlBack').addEventListener('click',()=>{ if(WL.fromPick&&WL.adding){ WL.fromPick=false; WL.adding=false; WL.edit=null; wlGo('pick'); } else if(WL.step==='code'){ WL.stage=1; wlGo('main'); } else if(WL.adding){ WL.adding=false; WL.edit=null; openSubjects(); } });
function openWelcome(adding){ WL.fromPick=false; WL.adding=!!adding; WL.edit=null; WL.draft=null; WL.grade=null; WL.stage=1; WL.login=null; WL.pending=false; WL.pick=null; WL.step='main'; show('welcome'); wlDraw(); }
// edit a child (name, grade, curriculum / school): the student form filled in
function openKidEdit(id){ const k=kids().find(x=>x.id===id); if(!k) return; WL.adding=true; WL.edit=id; WL.draft=null; WL.grade=null; WL.pick=k.curr; WL.step='main'; show('welcome'); wlDraw(); }
// save an edited child: progress stays (it belongs to the child, not to the curriculum); the active child's subjects / tabs follow the new curriculum
function kidSave(id,ch){ const K=kids(), k=K.find(x=>x.id===id); if(!k) return; Object.assign(k,ch); wlSet('es.kids',K); if(typeof syPushKids==='function') syPushKids();
  WL.edit=null; WL.adding=false; const cur=kidNow(); if(cur&&cur.id===id){ currSave(k.curr); setTimeout(()=>location.reload(),300); } else { kidPaint(); openSubjects(); } }

/* ---------- profile button (home, bottom right) -> parent gate -> the account page ---------- */
function kidPaint(){ const k=kidNow(), b=$('#kidBtn'); if(!b) return; b.hidden=!k; if(k) $('#kidName').textContent=k.name; }
const ACH={ user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.6-7 8-7s8 2.5 8 7"/></svg>', card:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10.5h18M7 15h3"/></svg>',
  inv:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.8 2.9-6 6.5-6s6.5 2.2 6.5 6M19 8v6M16 11h6"/></svg>',
  bell:'<svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21a2 2 0 0 0 4 0"/></svg>',
  coin:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6-1 1.4-2.5 1.8-2.5.8-2.5 1.8 1 1.5 2.5 1.5 2.5-.5 2.5-1.5"/></svg>', out:'<svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/></svg>' };
const wlRow=(cls,ic,ar,note)=>`<button class="arow ${cls}"><i>${ic}</i><b>${ar}</b>${note?`<em>${note}</em>`:''}<s></s></button>`;
function kidMenu(){
  let o=$('#acctPage'); if(!o){ o=el('div','acctpage',''); o.id='acctPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Account'); document.body.append(o); }
  const a=acct()||{}, cur=kidNow();
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back" aria-label="Back">${ICON.back}</button><h2>حسابي</h2></div>
    <div class="ac-in"><section class="ac-card ac-me"><i class="ac-meic">${ACH.user}</i><div><b>ولي الأمر</b>${[(a.email&&!/@phone\.local$/.test(a.email))?a.email:'',a.phone].filter(Boolean).map(x=>`<small dir="ltr">${wlEsc(x)}</small>`).join('')}</div></section>
    <section class="ac-card"><h3>الطلاب</h3><div class="ac-kids">${kids().map(k=>`<div class="ac-kid${cur&&k.id===cur.id?' on':''}"><button class="ac-pic" data-kid="${k.id}" aria-label="${wlEsc(k.name)}">${wlAv(k)}</button><button class="ac-pen" data-edit="${k.id}" aria-label="Edit ${wlEsc(k.name)}">${ICON.pencil}</button><b>${wlEsc(k.name)}</b><small>${wlEsc(gradeLabel(k.grade))}</small></div>`).join('')}
      <div class="ac-kid"><button class="ac-pic ac-add" aria-label="Add a child">${ICON.plus}</button><b>إضافة طالب</b></div></div></section>
    <div class="arows">${wlRow('ac-prof',ACH.user,'الملف الشخصي','')}${typeof coinsOn==='function'&&coinsOn()?wlRow('wl-cred',ACH.coin,'رصيدي',CRED(coinBal())):''}${typeof invitePage==='function'?wlRow('ac-inv',ACH.inv,'دعوة صديق',''):''}${(typeof subIsOn==='function'&&(subIsOn()||subHasAny()))?wlRow('ac-subs',ACH.card,'اشتراكاتي',''):''}${wlRow('ac-news',ACH.bell,'الإشعارات',subNews().length?num(subNews().length)+' جديد':'')}${typeof acctExtraRows==='function'?acctExtraRows():''}</div></div>`;
  $('.ac-back',o).addEventListener('click',()=>o.hidden=true);
  $$('[data-kid]',o).forEach(b=>b.addEventListener('click',()=>{ o.hidden=true; kidSwitch(b.dataset.kid); }));
  $$('[data-edit]',o).forEach(b=>b.addEventListener('click',()=>{ o.hidden=true; openKidEdit(b.dataset.edit); }));
  $('.ac-add',o).addEventListener('click',()=>{ o.hidden=true; openWelcome(true); });
  $('.ac-prof',o).addEventListener('click',profilePage);
  { const sb=$('.ac-subs',o); if(sb) sb.addEventListener('click',subsPage); }
  $('.ac-news',o).addEventListener('click',notifsPage);
  { const ib=$('.ac-inv',o); if(ib) ib.addEventListener('click',invitePage); }
  if(typeof acctExtraBind==='function') acctExtraBind(o);   // the other app's own rows (Easy Words: the report)
  const cb=$('.wl-cred',o); if(cb) cb.addEventListener('click',()=>{ creditsPage(); });   // the parent's credits (js/coins.js)
  syMenuButtons(o,()=>o.hidden=true);   // confirm the email / sign out (server only, js/sync.js)
  o.hidden=false; pop('.ac-card, .arow',{y:14});
}
/* ---------- the profile page (Ahmed 2026-11-16): the parent's email and mobile, both editable, and the notices on / off. Saved to the account on the server (PUT /me) and on this device ---------- */
const PROF_ERR={'bad-email':'الإيميل مش مكتوب صح','need-contact':'لازم إيميل أو موبايل واحد على الأقل','email-taken':'الإيميل ده مسجل لحساب تاني','phone-taken':'الموبايل ده مسجل لحساب تاني','blocked':'الحساب ده موقوف'};
function profilePage(){
  let o=$('#profPage'); if(!o){ o=el('div','acctpage',''); o.id='profPage'; o.setAttribute('role','dialog'); document.body.append(o); }
  const a=acct()||{}, on=a.notify!==false;
  o.innerHTML=`<div class="ac-top"><button class="rb pf-back" aria-label="Back">${ICON.back}</button><h2>الملف الشخصي</h2></div>
    <div class="ac-in"><section class="ac-card"><form class="wl-form pf-form" autocomplete="off" novalidate>
      <label class="pf-f"><span>الإيميل</span><input name="email" type="email" dir="ltr" autocomplete="email" inputmode="email" value="${wlEsc((a.email&&!/@phone\.local$/.test(a.email))?a.email:'')}"></label>
      <label class="pf-f"><span>رقم الموبايل</span><input name="phone" type="tel" dir="ltr" autocomplete="tel" inputmode="tel" value="${wlEsc(a.phone||'')}"></label>
      <div class="pf-g"><span class="pf-l">الإشعارات</span><label class="pf-sw"><input name="notify" type="checkbox"${on?' checked':''}><i></i><span>استقبال الإشعارات على التطبيق والإيميل</span></label></div>
      <p class="wl-err pf-err" hidden></p><p class="pf-ok" hidden>اتحفظ</p>
      <button class="pill green pf-save" type="submit">حفظ</button></form></section></div>`;
  $('.pf-back',o).addEventListener('click',()=>o.hidden=true);
  const f=$('.pf-form',o), er=$('.pf-err',o), ok=$('.pf-ok',o), bad=t=>{ er.textContent=t; er.hidden=false; ok.hidden=true; };
  f.addEventListener('submit',async e=>{ e.preventDefault(); er.hidden=true; ok.hidden=true;
    const email=f.elements.email.value.trim(), phone=f.elements.phone.value.trim(), notify=f.elements.notify.checked;
    if(!email&&!phone) return bad(PROF_ERR['need-contact']); if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad(PROF_ERR['bad-email']);
    const s=typeof sySession==='function'&&sySession();
    if(s&&s.token){ const r=await syCall('/me',{email,phone,notify},'PUT'); if(!r) return bad('مفيش اتصال بالإنترنت، جرب تاني'); if(!r.j.ok) return bad(PROF_ERR[r.j.error]||'ما اتحفظش، جرب تاني'); }
    wlSet('es.account',{...(acct()||{}),email,phone,notify}); window.ACCOUNT={...acct(),id:(s&&s.id)||(acct()||{}).id,...(s&&s.token?{token:s.token}:{})};
    ok.hidden=false; });
  o.hidden=false; pop('.ac-card',{y:14}); }
$('#kidBtn').addEventListener('click',()=>parentGate(kidMenu));
// hooks for other parts (coins.js reads window.ACCOUNT / window.CHILD): {id,...} of the parent and the active child
// signed in to the server (js/sync.js es.session): id = the server's parent id (share links carry it), token for the API calls
window.ACCOUNT=(()=>{ const a=acct(), s=wlGet('es.session',null); return a?{...a,id:(s&&s.id)||a.id||a.email||'local',...(s&&s.token?{token:s.token}:{})}:null; })(); window.CHILD=kidNow();
