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
  pop('#wlBody > *, #wlBody form > *',{y:16});
}
function wlMain(b){
  const ed=WL.edit&&kids().find(k=>k.id===WL.edit), onlyKid=WL.adding||!!ed, L=WL.login||(WL.login={email:'',phone:''}), reg=WL.stage>1;
  let h=onlyKid?'':wlAbout(reg?'sm':'');
  if(!onlyKid){
    h+=wlHead('دخول ولي الأمر','Parent login')+(reg?`<div class="wl-sum"><span dir="ltr">${wlEsc([L.email,L.phone].filter(Boolean).join('  ·  '))}</span><button type="button" class="pill cream wl-chip wl-chg">تعديل</button></div>`:
    `<form class="wl-form wl-login" novalidate><p class="wl-note2">اكتبي الإيميل أو رقم الموبايل (واحد منهم على الأقل)</p>
      <label><span>البريد الإلكتروني <small>Email</small></span><input name="email" type="email" dir="ltr" autocomplete="email" inputmode="email" value="${wlEsc(L.email)}"></label>
      <label><span>رقم الموبايل <small>Mobile</small></span><input name="phone" type="tel" dir="ltr" autocomplete="tel" inputmode="tel" value="${wlEsc(L.phone)}"></label>
      <p class="wl-err" hidden></p>
      <button class="pill wl-big wl-go" type="submit"><span class="wl-ar">دخول</span><small>Continue</small></button></form>`);
  }
  if(onlyKid||reg) h+=wlStudentHTML(ed);
  b.innerHTML=h;
  if(!onlyKid&&!reg){
    const f=$('.wl-login',b); f.addEventListener('submit',e=>{ e.preventDefault(); const v=n=>f[n].value.trim(), er=$('.wl-err',b);
      const bad=!v('email')&&!v('phone')?['email','اكتبي الإيميل أو رقم الموبايل (واحد على الأقل)']:v('email')&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))?['email','البريد الإلكتروني مش مكتوب صح']:v('phone')&&!/^[+0-9٠-٩ ]{8,16}$/.test(v('phone'))?['phone','رقم الموبايل مش مكتوب صح']:null;
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
function wlEnter(){ const K=kids(); if(K.length>1){ WL.stage=1; wlGo('pick'); return; } const k=K[0]; if(!k) return;
  const cur=kidNow(); if(cur&&cur.id===k.id){ WL.adding=false; openSubjects(); pop('#subjects .top > *',{y:-20}); } else kidSwitch(k.id); }
function wlPicker(b){ const K=kids();
  b.innerHTML=wlHead('مين اللي هيتعلم ويلعب؟','Who\'s learning and playing?')+`<div class="wl-card wl-pick">${K.map(k=>`<button class="wl-who" data-kid="${k.id}">${wlAv(k)}<b>${wlEsc(k.name)}</b></button>`).join('')}</div>`;
  $$('[data-kid]',b).forEach(x=>x.addEventListener('click',()=>{ const id=x.dataset.kid, cur=kidNow(); if(cur&&cur.id===id){ openSubjects(); pop('#subjects .top > *',{y:-20}); } else kidSwitch(id); })); }
// the student form (stage 2, add a child, edit a child): name, grade, curriculum; لغات -> the school list
function wlStudentHTML(ed){
  const G=(CURR&&CURR.grades)||[{id:'p1',ar:'الصف الأول الابتدائي',open:true}], C=CURR||{types:[],schools:[]}, gr=WL.grade||(ed&&ed.grade)||G[0].id, pk=WL.pick||{}, priv=pk.type==='private';
  if(WL.draft==null&&ed) WL.draft=ed.name;
  return wlHead(ed?'تعديل حساب الطفل':'تسجيل الطالب',ed?'Edit child':'Student')+`<form class="wl-form wl-stu" novalidate>
    <label><span>اسم الطالب <small>Student's name</small></span><input name="kid" autocomplete="off" value="${wlEsc(WL.draft||'')}" required></label>
    <div class="wl-field"><span>السنة الدراسية <small>Grade</small></span><div class="wl-chips">${G.map(g=>`<button type="button" class="pill cream wl-chip${g.id===gr?' on':''}" data-grade="${g.id}"${g.open?'':' disabled'}>${g.ar}</button>`).join('')}</div></div>
    <div class="wl-field"><span>المنهج <small>Curriculum</small></span><div class="wl-chips">${C.types.map(t=>`<button type="button" class="pill cream wl-chip${pk.type===t.id?' on':''}" data-type="${t.id}"${wlTypeOn(t)||pk.type===t.id?'':' disabled'}>${wlTypeLabel(t)}${wlTypeOn(t)?'':' <small>قريبًا</small>'}</button>`).join('')}</div></div>
    ${priv?`<div class="wl-field wl-schools2"><span class="wl-sh">اختر المدرسة لتوافق كتب المستوى الرفيع AL</span><div class="wl-chips col">${C.schools.map(s=>`<button type="button" class="pill cream wl-chip${pk.school===s.id?' on':''}" data-school="${s.id}">${s.ar}</button>`).join('')}<button type="button" class="pill yellow wl-chip wl-addsch">${ICON.plus} إضافة مدرسة</button></div></div>`:''}
    <p class="wl-err" hidden></p>
    <button class="pill wl-big wl-go green" type="submit">${ed?'<span class="wl-ar">حفظ</span><small>Save</small>':'<span class="wl-ar">يلا نبدأ</span><small>Let\'s go</small>'}</button></form>`; }
function wlStudentBind(b,ed){
  const G=(CURR&&CURR.grades)||[{id:'p1'}], f=$('.wl-stu',b);
  $('input[name=kid]',b).addEventListener('input',e=>WL.draft=e.target.value);
  $$('[data-grade]',b).forEach(x=>x.addEventListener('click',()=>{ WL.grade=x.dataset.grade; $$('[data-grade]',b).forEach(y=>y.classList.toggle('on',y===x)); }));
  $$('[data-type]',b).forEach(x=>x.addEventListener('click',()=>{ WL.pick={type:x.dataset.type}; WL.draft=f.kid.value; wlDraw(); }));
  $$('[data-school]',b).forEach(x=>x.addEventListener('click',()=>{ WL.pick={type:'private',school:x.dataset.school}; $$('[data-school]',b).forEach(y=>y.classList.toggle('on',y===x)); }));
  const ad=$('.wl-addsch',b); if(ad) ad.addEventListener('click',()=>wlSchoolPop());
  f.addEventListener('submit',e=>{ e.preventDefault(); const n=f.kid.value.trim(), pk=WL.pick;
    if(!n) return wlBad(f,'kid','اكتب اسم الطالب');
    if(!pk) return wlBad(f,null,'اختار المنهج');
    if(pk.type==='private'&&!pk.school) return wlBad(f,null,'اختار المدرسة (أو اطلب إضافة مدرستك)');
    const gr=WL.grade||(ed&&ed.grade)||G[0].id;
    if(ed){ kidSave(ed.id,{name:n,grade:gr,curr:pk}); return; }
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
    <label><span>رقم المسؤول</span><input name="tel" type="tel" dir="ltr" inputmode="tel" required></label>
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
$('#wlBack').addEventListener('click',()=>{ if(WL.step==='code'){ WL.stage=1; wlGo('main'); } else if(WL.adding){ WL.adding=false; WL.edit=null; openSubjects(); } });
function openWelcome(adding){ WL.adding=!!adding; WL.edit=null; WL.draft=null; WL.grade=null; WL.stage=1; WL.login=null; WL.pending=false; WL.pick=null; WL.step='main'; show('welcome'); wlDraw(); }
// edit a child (name, grade, curriculum / school): the student form filled in
function openKidEdit(id){ const k=kids().find(x=>x.id===id); if(!k) return; WL.adding=true; WL.edit=id; WL.draft=null; WL.grade=null; WL.pick=k.curr; WL.step='main'; show('welcome'); wlDraw(); }
// save an edited child: progress stays (it belongs to the child, not to the curriculum); the active child's subjects / tabs follow the new curriculum
function kidSave(id,ch){ const K=kids(), k=K.find(x=>x.id===id); if(!k) return; Object.assign(k,ch); wlSet('es.kids',K); if(typeof syPushKids==='function') syPushKids();
  WL.edit=null; WL.adding=false; const cur=kidNow(); if(cur&&cur.id===id){ currSave(k.curr); setTimeout(()=>location.reload(),300); } else { kidPaint(); openSubjects(); } }

/* ---------- profile button (home, bottom right) -> parent gate -> the account page ---------- */
function kidPaint(){ const k=kidNow(), b=$('#kidBtn'); if(!b) return; b.hidden=!k; if(k) $('#kidName').textContent=k.name; }
const ACH={ user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.6-7 8-7s8 2.5 8 7"/></svg>', card:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10.5h18M7 15h3"/></svg>',
  coin:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6-1 1.4-2.5 1.8-2.5.8-2.5 1.8 1 1.5 2.5 1.5 2.5-.5 2.5-1.5"/></svg>', out:'<svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/></svg>' };
const wlRow=(cls,ic,ar,note)=>`<button class="arow ${cls}"><i>${ic}</i><b>${ar}</b>${note?`<em>${note}</em>`:''}<s></s></button>`;
function kidMenu(){
  let o=$('#acctPage'); if(!o){ o=el('div','acctpage',''); o.id='acctPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Account'); document.body.append(o); }
  const a=acct()||{}, cur=kidNow();
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back" aria-label="Back">${ICON.back}</button><h2>حسابي</h2></div>
    <div class="ac-in"><section class="ac-card"><h3>أولادي</h3><div class="ac-kids">${kids().map(k=>`<div class="ac-kid${cur&&k.id===cur.id?' on':''}"><button class="ac-pic" data-kid="${k.id}" aria-label="${wlEsc(k.name)}">${wlAv(k)}</button><button class="ac-pen" data-edit="${k.id}" aria-label="Edit ${wlEsc(k.name)}">${ICON.pencil}</button><b>${wlEsc(k.name)}</b><small>${wlEsc(gradeLabel(k.grade))}</small></div>`).join('')}
      <div class="ac-kid"><button class="ac-pic ac-add" aria-label="Add a child">${ICON.plus}</button><b>إضافة طفل</b></div></div></section>
    <div class="arows">${wlRow('ac-prof',ACH.user,'الملف الشخصي','')}${typeof coinsOn==='function'&&coinsOn()?wlRow('wl-cred',ACH.coin,'رصيدي',CRED(coinBal())):''}${wlRow('ac-subs',ACH.card,'اشتراكاتي',subNews().length?'جديد':'')}</div></div>`;
  $('.ac-back',o).addEventListener('click',()=>o.hidden=true);
  $$('[data-kid]',o).forEach(b=>b.addEventListener('click',()=>{ o.hidden=true; kidSwitch(b.dataset.kid); }));
  $$('[data-edit]',o).forEach(b=>b.addEventListener('click',()=>{ o.hidden=true; openKidEdit(b.dataset.edit); }));
  $('.ac-add',o).addEventListener('click',()=>{ o.hidden=true; openWelcome(true); });
  $('.ac-prof',o).addEventListener('click',()=>coinPop(`<h2 class="outline">الملف الشخصي</h2><p class="msg-text" dir="ltr">${wlEsc(a.email||'—')}</p><p class="msg-text" dir="ltr">${wlEsc(a.phone||'—')}</p>`));
  $('.ac-subs',o).addEventListener('click',subsPage);
  const cb=$('.wl-cred',o); if(cb) cb.addEventListener('click',()=>{ creditsPage(); });   // the parent's credits (js/coins.js)
  syMenuButtons(o,()=>o.hidden=true);   // confirm the email / sign out (server only, js/sync.js)
  o.hidden=false; pop('.ac-card, .arow',{y:14});
}
$('#kidBtn').addEventListener('click',()=>parentGate(kidMenu));
// hooks for other parts (coins.js reads window.ACCOUNT / window.CHILD): {id,...} of the parent and the active child
// signed in to the server (js/sync.js es.session): id = the server's parent id (share links carry it), token for the API calls
window.ACCOUNT=(()=>{ const a=acct(), s=wlGet('es.session',null); return a?{...a,id:(s&&s.id)||a.id||a.email||'local',...(s&&s.token?{token:s.token}:{})}:null; })(); window.CHILD=kidNow();
