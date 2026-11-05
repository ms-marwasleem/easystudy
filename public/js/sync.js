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
