/* COINS + ACCESS — who can open which subject / unit / lesson, the parent's coin wallet, the share sheet and the unlock popup
   (Marwa 2026-11-05, design: docs/coins-and-admin.md). Everything is driven by ONE settings object: data/settings.json, or the copy the
   admin dashboard (admin.html) saved on the server (api). accessOf() in core.js asks coinAccess() here.
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
try{ const r=new URLSearchParams(location.search).get('r'); if(r) localStorage.setItem('es.ref',JSON.stringify({code:r,at:Date.now()})); }catch(e){}
const refCode=()=>(cGet('es.ref',null)||{}).code||null;
const ESET_P=get(typeof SETTINGS_FILE!=='undefined'?SETTINGS_FILE:'data/settings.json').catch(()=>null).then(async d=>{
  ESET=d||ESET;   // no device copy: the real settings come from the server below
  if(ESET.api){ const s=await apiCall('/settings'); if(s&&s.coins) ESET={...s,api:ESET.api,whatsapp:s.whatsapp||ESET.whatsapp,adminEmail:s.adminEmail||ESET.adminEmail}; apiTake(await apiCall('/wallet'+(coinChild()?'?child='+encodeURIComponent(coinChild()):''))); }
  ESET.items=ESET.items||{}; ESET.coins=ESET.coins||{shares:[]};
  try{ if(typeof currRefresh==='function'&&typeof kidNow==='function'){ const k=kidNow(); currRefresh((k&&k.curr)||currPick()); } }catch(e){}   // the dashboard's school permission arrives with the settings
  if(typeof COURSE!=='undefined'&&COURSE){ paintHud(); if(!$('#subjects').hidden&&typeof drawSubjects==='function') drawSubjects(); else if(!$('#map').hidden&&typeof drawMap==='function') openMap(); }
});

/* ---------- store (this device) ---------- */
const unlockKey=()=>'es.unlocked';   // welcome.js swaps this key when the child changes (KID_KEYS), so it is per child already
const freeKey=()=>'es.freeused';   // per child too (welcome.js KID_KEYS)
function wallet(){ const k='es.wallet.'+coinParent(); let w=cGet(k,null);
  if(!w){ w={bal:0,hist:[],last:{}}; cSet(k,w); } return w; }
const walletSave=w=>cSet('es.wallet.'+coinParent(),w);
const coinBal=()=>wallet().bal;
function addUnlock(id,coins,kind){ const s=cGet(unlockKey(),[]); if(!s.includes(id)) s.push(id); cSet(unlockKey(),s); if(typeof subSeason==='function') subSeason();   // opened lessons end on 31 Aug too
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
  const cost=it.coins!=null?it.coins:o.coins!=null?o.coins:id&&id[0]==='l'?(+C.lessonCost||0):(A.coins||0);
  const out=st=>({st,coins:cost,kind:kind||(id&&id[0]==='l'?'lesson':'subject')});
  if(it.st==='soon') return out('soon');
  if(!hasContent) return out('soon');
  if(it.st==='open') return out('open');
  if(id&&promoOpen(un,id)) return out('open');
  if(id&&id[0]!=='s'&&typeof subOpen==='function'&&subOpen()) return out('open');   // a paid term (or the 24 h after the receipt) opens every lesson of this child
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
  const F=(ESET.access&&ESET.access.free)||{mode:'first',count:3}, s=subjOf(id); if(!s) return true;
  const n=(F.per&&F.per[s.id]!=null&&F.per[s.id]!==''&&+F.per[s.id]>=0)?+F.per[s.id]:(+F.count||0);   // per-subject free count (dashboard) or the default
  if(kind==='unit'){ const ui=(s.units||[]).findIndex(u=>'u:'+s.id+':'+u.unit===id);
    if(F.mode==='firstUnit') return ui<n;
    if(F.mode==='pickUnit') return false;
    return true; }   // lesson modes never lock a whole unit: the locks sit on the lessons
  const l=lessonOf(id); if(!l) return true; const uid=unitIdOf(s,l);
  if(F.mode==='first'){ const built=s.lessons.filter(x=>x.file&&!x.hidden); return built.indexOf(l)<n; }
  if(F.mode==='list') return (F.list||[]).includes(id)||(F.list||[]).includes(uid);
  return true;   // unit modes: the unit decides (the map locks its lessons); pick: locked until picked
}
// free picks left; perSubject (Marwa 2026-11-05: the child picks ONE free lesson in EACH subject) counts the picks of this subject only
function freeLeft(){ return 0; }   // no more free picks (signup gift removed 2026-11-11)
/* ---------- coin pictures ---------- */
const COIN=`<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="22" r="16" fill="#C98A12" stroke="var(--btn-ol)" stroke-width="2.6"/><circle cx="20" cy="19" r="16" fill="#FFD23F" stroke="var(--btn-ol)" stroke-width="2.6"/><circle cx="20" cy="19" r="11" fill="none" stroke="#E0A419" stroke-width="2.4"/><path d="M20 12v14M16.5 15.5h5.5a2.5 2.5 0 0 1 0 5h-4a2.5 2.5 0 0 0 0 5H24" fill="none" stroke="#B57A0C" stroke-width="2.6" stroke-linecap="round"/><path d="M11 13a11 11 0 0 1 6-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></svg>`;
const SHAREIC='<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.500"/><circle cx="18" cy="6" r="2.500"/><circle cx="18" cy="18" r="2.500"/><path d="M8.200 10.900l7.600-3.800M8.200 13.100l7.600 3.800"/></svg>';
const CT=(ar,en)=>ar;   // credits, share and unlock popups are for the PARENT: always Arabic (Marwa 2026-11-05), whatever the subject; en kept for later

/* ---------- CREDITS (Marwa 2026-11-05: "credits", not coins; shown ONLY in the parent's account, not on the child's screens) ----------
   The HUD chip is gone: coinPaint only removes an old one. The balance lives in the children popup (welcome.js kidMenu -> creditBtn). */
function coinPaint(){ $$('.coinhud').forEach(c=>c.remove()); }
const CRED=n=>`${num(n)} ${CT('كريدت','credits')}`;
/* the parent popups (lock, get credits, subscribe) write every number with 0-9 and the word "Credits" in English (Ahmed 2026-11-20), whatever the subject */
const EN=n=>String(n).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const CRE=n=>`<bdi dir="ltr" class="cre">${EN(n)} ${+n===1?'Credit':'Credits'}</bdi>`;
const balLine=n=>`<div class="coinbig" dir="ltr"><span class="ic">${COIN}</span><b>${EN(n)}</b><span class="lab">Credits</span></div>`;

/* ---------- popups (one overlay of our own, the app's popup look) ---------- */
function coinPop(html,onOpen){
  let o=$('#coinPop'); if(!o){ o=el('div','overlay'); o.id='coinPop'; document.body.append(o); o.addEventListener('click',e=>{ if(e.target===o) coinDismiss(); }); }
  o.classList.remove('pro'); o.innerHTML=`<div class="rays"></div><div class="popup coinpop" role="dialog"><button class="rb popx" aria-label="Close" data-icon="close">${ICON.close}</button>${html}</div>`;
  $('.popx',o).addEventListener('click',coinDismiss); o.hidden=false; if(typeof spinRays==='function') spinRays(o);
  if(anim) G.from($('.popup',o),{scale:.6,opacity:0,duration:.35,ease:'back.out(2)'});
  if(onOpen) onOpen($('.popup',o));
}
// the same popup in the calm parent-area look (white card, flat buttons; css/account.css .pro)
function coinPopPro(html,onOpen){ coinPop(html,p=>{ p.parentNode.classList.add('pro'); if(onOpen) onOpen(p); }); }
const coinClose=()=>{ const o=$('#coinPop'); if(o) o.hidden=true; };
// the X / a tap outside a lock popup opened by lockGuard (a page of a locked lesson): back to the map
let lockBack=null;
const coinDismiss=()=>{ coinClose(); const f=lockBack; lockBack=null; if(f) f(); };
/* EVERY way into a lesson or one of its pages (map sign, page picker, deep link, resume, an Easy Words word) goes through here (Ahmed 2026-11-20).
   A locked lesson (or a lesson of a locked unit) does NOT open: the same locked popup (credits / term subscription) shows; unlocked -> resume() opens what was asked, closed -> the map. Returns true when blocked. */
function lockGuard(m,resume,isWords){
  if(!m||!m.id||m.testsOnly||!m.file&&!isWords) return false;
  const id='l:'+m.id; let st=coinAccess(m,true,id,0,'lesson').st;
  if(st==='open'&&!isWords&&typeof SUBJECT!=='undefined'&&SUBJECT&&SUBJECT.units&&!((ESET.items||{})[id]||{}).st&&!coinUnlocked(id)){
    const u=SUBJECT.units.find(x=>x.unit===m.unit);
    if(u&&coinAccess(u,true,'u:'+SUBJECT.id+':'+u.unit,SUBJECT.units.indexOf(u),'unit').st==='locked') st='locked'; }
  if(st!=='locked') return false;
  const back=()=>{ if(typeof openMap==='function') openMap(); };
  lockBack=back;
  lockTap('lesson',m,coinAccess(m,true,id,0,'lesson').coins,`<span class="jlockbig">${typeof LOCK!=='undefined'?LOCK:''}</span>`,()=>{ lockBack=null; if(resume) resume(); else back(); });
  return true;
}
const bigCoins=balLine;

// a grown-up question first (Ahmed 2026-11-11, replaces typing the parent's name): 3 numbers written as ARABIC WORDS ("واحد - ثلاثة - خمسة"); the parent taps them on a keypad.
// Guards the account page and every credits / unlock sheet. Passed once = no more questions until the app is opened again. Switch off: settings coins.parentGate=false.
let gateOk=false;
const GATEW=['','واحد','اثنين','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة'], GATED='٠١٢٣٤٥٦٧٨٩';
function parentGate(then){
  if(gateOk||CS().parentGate===false) return then();
  const want=[0,0,0].map(()=>1+Math.floor(Math.random()*9)); let got=[];
  coinPop(`<h2 class="outline">لولي الأمر</h2><p class="msg-text">اضغط الأرقام دي بالترتيب:</p><p class="msg-text gate-w">${want.map(n=>GATEW[n]).join(' - ')}</p>
    <div class="gate-dots" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="gate-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" class="gate-k" data-n="${n}">${GATED[n]}</button>`).join('')}<span></span><button type="button" class="gate-k gate-x" aria-label="مسح">⌫</button></div>`, p=>{
    p.parentNode.classList.add('pro');   // the parent area is soft and calm, not the game look (css/account.css)
    const dots=$$('.gate-dots i',p), paint=()=>dots.forEach((d,i)=>d.classList.toggle('on',i<got.length));
    $$('.gate-k[data-n]',p).forEach(k=>k.addEventListener('click',()=>{ if(got.length>=3) return; got.push(+k.dataset.n); paint();
      if(got.length<3) return;
      if(got.join()===want.join()){ gateOk=true; coinClose(); then(); }
      else { if(anim) G.fromTo($('.gate-dots',p),{x:-10},{x:0,duration:.4,ease:'elastic.out(1,.3)'}); got=[]; setTimeout(paint,250); } }));
    $('.gate-x',p).addEventListener('click',()=>{ got.pop(); paint(); }); });
}

/* ---------- the share sheet ---------- */
// ?r= = the parent's ref code or server id (js/sync.js); never the email (no server = no r at all)
function shareLink(){ const u=CS().shareUrl||location.origin+location.pathname.replace(/[^/]*$/,''), A=window.ACCOUNT||{}, r=A.ref||(A.token&&A.id&&!String(A.id).includes('@')?A.id:'');
  return r?u+(u.includes('?')?'&':'?')+'r='+encodeURIComponent(r):u; }
/* SHARE (Ahmed 2026-11-19): NO device share sheet any more. One button per app - WhatsApp, Facebook, Messenger, Telegram - each opens THAT app with the dashboard message (settings coins.shareText,
   dashboard "رسالة الدعوة والمشاركة") + the parent's link already written; the parent only picks who gets it and sends inside that app. Any share = 1 credit, at most dailyCap (20) shares a day (see the share check below).
   [key, Arabic name, English name, colour, icon] */
const SHAPPS=[
 ['wa','واتساب','WhatsApp','#25D366','<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5a9.400 9.400 0 0 0-8 14.300L2.600 21.500l4.800-1.300A9.400 9.400 0 1 0 12 2.500zm0 17.200c-1.500 0-2.900-.4-4.100-1.200l-.3-.2-2.800.8.8-2.700-.2-.3a7.700 7.700 0 1 1 6.600 3.600zm4.200-5.700c-.2-.1-1.400-.7-1.600-.8-.2-.1-.4-.1-.5.100l-.7.900c-.1.200-.3.200-.5.100-1.300-.6-2.200-1.200-3-2.600-.2-.4.200-.4.600-1.200.1-.1 0-.3 0-.4l-.7-1.700c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.100-.6.300-.6.600-.9 1.300-.9 2.100 0 .9.400 1.800 1 2.500 1.100 1.500 2.500 2.600 4.300 3.300 1.600.6 2.200.5 3 .4.600-.1 1.500-.6 1.700-1.200.2-.6.200-1.100.1-1.200-.1-.1-.2-.2-.5-.3z"/></svg>'],
 ['fb','فيسبوك','Facebook','#1877F2','<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13.500 21.500v-8h2.700l.4-3.200h-3.100V8.300c0-.9.300-1.500 1.600-1.500h1.700V3.900c-.3 0-1.300-.1-2.400-.1-2.400 0-4 1.400-4 4.100v2.400H7.700v3.200h2.700v8z"/></svg>'],
 ['ms','ماسنجر','Messenger','#0084FF','<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.500 2 2 6.200 2 11.400c0 2.900 1.400 5.500 3.700 7.200V22l3.400-1.900c.9.300 1.900.4 2.900.4 5.500 0 10-4.200 10-9.500S17.500 2 12 2zm1 12.800l-2.500-2.700-4.900 2.700 5.400-5.700 2.600 2.700 4.800-2.700z"/></svg>'],
 ['tg','تيليجرام','Telegram','#27A7E7','<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.200 3.600L2.900 10.700c-1.200.5-1.200 1.200-.2 1.500l4.700 1.500 1.800 5.600c.2.600.1.800.7.800.5 0 .7-.2 1-.5l2.200-2.200 4.600 3.400c.8.500 1.500.2 1.800-.8l3-14.200c.3-1.200-.5-1.800-1.300-1.200zM8.800 13.200l9.500-6c.4-.3.800-.1.500.2l-7.800 7.100-.3 3.200z"/></svg>']];
const shareMobile=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Mac/.test(navigator.platform));
// the address that opens the app itself (a phone) or its web page (a computer)
function shareHref(k,text,url){ const e=encodeURIComponent, all=(text+(url?' '+url:'')).trim(), m=shareMobile();
  if(k==='wa') return m?'whatsapp://send?text='+e(all):'https://wa.me/?text='+e(all);
  if(k==='tg') return m?'tg://msg?text='+e(all):'https://t.me/share/url?url='+e(url||' ')+'&text='+e(text);
  if(k==='ms') return m?'fb-messenger://share/?link='+e(url||location.origin+location.pathname):'https://www.messenger.com/';   // Messenger takes a link only: the message text is copied (shareGo)
  return 'https://www.facebook.com/sharer/sharer.php?u='+e(url||(location.origin+location.pathname))+'&quote='+e(text); }
// open the app: its own address scheme replaces the page (the app goes to the background, the share check below sees it leave), a web address opens in a new tab
function shareGo(k,text,url){ if(text==null){ text=CS().shareText||CS().appName||'EasyStudy'; url=shareLink(); }
  const h=shareHref(k,text,url||'');
  if(k==='ms'){ try{ navigator.clipboard.writeText((text+' '+(url||'')).trim()); }catch(x){} COPIED=!shareMobile(); }   // Messenger cannot take a text: the full message is copied, the parent pastes it there
  if(/^https?:/.test(h)) window.open(h,'_blank'); else location.href=h; }
let COPIED=false;
// the popup with the four buttons; onGo(key) runs when one is tapped (the share check starts there)
function sharePick(onGo,after,noPay){ const w=wallet(), p=noPay?0:sharePays(w);
  coinPopPro(`<h2 class="outline">${CT('ادعو صديق','Invite a friend')}</h2><p class="msg-text">${CT('اختار التطبيق، وبعدين اختار صاحبك وابعت الرسالة من جواه','Pick an app, then choose your friend and send the message there')}</p>
    <div class="shgrid">${SHAPPS.map(a=>`<button type="button" class="shbtn" data-sh="${a[0]}" style="--shc:${a[3]}"><i>${a[4]}</i><span>${CT(a[1],a[2])}</span></button>`).join('')}</div>${p?`<p class="msg-text shpay">${CT('+'+num(p)+' كريدت لكل مشاركة','+'+num(p)+' credit per share')}</p>`:''}`, pp=>{
    $$('[data-sh]',pp).forEach(b=>b.addEventListener('click',()=>{ if(onGo) onGo(b.dataset.sh); shareGo(b.dataset.sh); }));
    if(after) $('.popx',pp).addEventListener('click',after); }); }
// how many credits one share pays now (0 = today's cap of shares is reached)
function sharePays(w){ const C=CS(), per=C.shareCoins!=null?+C.shareCoins:1, cap=C.dailyCap!=null?+C.dailyCap:20, day=new Date().toDateString(),
    n=w.hist.filter(h=>h.k==='share'&&new Date(h.at).toDateString()===day).length;
  return n<cap?per:0; }
/* SHARE CHECK (Marwa 2026-11-05: "do the most we can to make sure the share happened"). A web page can never see inside WhatsApp / Facebook,
   so the strongest proof on the device is: after the tap the app must really LEAVE (WhatsApp / Facebook / Messenger opened over it; for
   "copy link" the parent goes to another app to paste) within a few seconds, stay away long enough to send (coins.shareMinSec, default 8 s),
   and come BACK. A tap with no leaving, or a quick bounce back, pays nothing. On top: one pay per type per cooldownH, the day cap, and on the
   server the per-account / device / IP limits plus the referral bonus (the only share that is fully proven: a new parent registers). */
let SHR=null;
const shareMin=()=>(CS().shareMinSec!=null?+CS().shareMinSec:8)*1000;
function shareArm(k,p,after){ const me=SHR={p,at:Date.now(),left:0,after}, copy=k==='ms'&&!shareMobile(), leaveIn=copy?60000:6000;
  setTimeout(()=>{ if(SHR===me&&!SHR.left){ SHR=null; shareNote(copy?'copied':'no',after); } },leaveIn); }
function shareStart(after){ const w=wallet(), p=sharePays(w);
  if(!p) return sharePick(null,after);   // the day's shares are paid: the share still opens, no credits
  sharePick(k=>shareArm(k,p,after),after); }
document.addEventListener('visibilitychange',()=>{ if(!SHR) return;
  if(document.hidden){ if(!SHR.left) SHR.left=Date.now(); return; }
  if(!SHR.left) return; const s=SHR; SHR=null;
  if(Date.now()-s.left<shareMin()) return shareNote('short',s.after);
  sharePay(s.after); });
function sharePay(after){ const w=wallet(), p=sharePays(w); if(!p) return coinSheet(after);
  w.bal+=p; w.hist.push({k:'share',n:p,at:Date.now()}); walletSave(w); paintHud();
  apiCall('/share',{}).then(apiTake);   // the server pays again by its own rules and sends the true wallet
  if(typeof chime==='function') chime(2);
  coinPopPro(`<h2 class="outline">${CT('شكرًا!','Thank you!')}</h2>${balLine(w.bal)}<p class="msg-text">${CT(`أخدت ${CRED(p)} على المشاركة`,`You got ${CRED(p)} for sharing`)}</p><button class="pill green" data-ok>${CT('تمام','OK')}</button>`,
    pp=>$('[data-ok]',pp).addEventListener('click',()=>coinSheet(after))); }
function shareNote(why,after){
  const txt={no:CT('ملحقناش نشوف المشاركة اتبعتت. ابعت الرسالة وارجع هنا عشان تاخد الكريدتس','We did not see the share go out. Send the message, then come back here to get the credits'),
    short:CT('رجعت بسرعة قوي. ابعت الرسالة فعلًا وارجع هنا عشان تاخد الكريدتس','You came back too fast. Really send the message, then come back here for the credits'),
    cap:CT('خلصت مشاركات النهارده (٢٠). كمّل بكرة','You reached today\'s 20 shares. Continue tomorrow'),
    copied:CT('الرابط اتنسخ. الصقه في محادثة أو جروب وابعته، وارجع هنا عشان تاخد الكريدتس','The link is copied. Paste it in a chat or group and send it, then come back here for the credits')}[why];
  coinPopPro(`<h2 class="outline">${why==='copied'?CT('اتنسخ','Copied'):why==='cap'?CT('كفاية النهارده','Enough for today'):CT('لسه','Not yet')}</h2><p class="msg-text">${txt}</p><button class="pill green" data-ok>${CT('تمام','OK')}</button>`,
    pp=>$('[data-ok]',pp).addEventListener('click',()=>why==='copied'?coinClose():coinSheet(after))); }
const shareGrid=()=>`<div class="shgrid">${SHAPPS.map(a=>`<button type="button" class="shbtn" data-sh="${a[0]}" style="--shc:${a[3]}"><i>${a[4]}</i><span>${CT(a[1],a[2])}</span></button>`).join('')}</div>`;
// the credits popup: the message is built from the dashboard numbers (credits per share, shares per day), then ONE button per app
function coinSheet(after){ parentGate(()=>{
  const w=wallet(), p=sharePays(w), C=CS(), per=C.shareCoins!=null?+C.shareCoins:1, cap=C.dailyCap!=null?+C.dailyCap:20;
  coinPopPro(`<h2 class="outline">${CT('اجمع','Get')} Credits</h2>${balLine(w.bal)}
    <p class="msg-text shrule">${CT('شارك التطبيق مع أصحابك. كل مشاركة =','Share the app with friends. Every share =')} ${CRE(per)}${cap?`${CT('، بحد أقصى','. Up to')} <bdi dir="ltr" class="cre">${EN(cap)}</bdi> ${CT('مشاركة في اليوم','shares a day')}`:''}.</p>
    ${shareGrid()}
    <p class="msg-text cnote">${p?CT('ابعت الرسالة فعلًا وارجع هنا عشان الكريدتس تتحسب','Really send the message, then come back here so it counts'):CT('خلصت مشاركات النهارده، لسه تقدر تشارك من غير Credits','Today\'s shares are done, you can still share without Credits')}</p>`, pp=>{
    $$('[data-sh]',pp).forEach(b=>b.addEventListener('click',()=>{ if(p) shareArm(b.dataset.sh,p,after); shareGo(b.dataset.sh); }));
    if(after) $('.popx',pp).addEventListener('click',after);
  }); }); }

/* ---------- INVITE A FRIEND (Ahmed 2026-11-17) — account page row "دعوة صديق" ----------
   Every parent has ONE personal link (shareLink(): the app address + ?r=<their code>); a friend who registers from it is tied to that parent on the server (parents.ref_by).
   When the admin activates a subscription of that friend, the server pays the parent settings.coins.referral.subCoins credits (once per subscription, never to oneself) and the wallet
   history gets a 'refsub' row (who = the student's first name). That row is the notice: it shows on the notifications page (unread until tapped) and in the credits history. */
const refSeen=()=>cGet('es.refSeen',[]);
function refNotices(){ const S=new Set(refSeen()); return ((wallet().hist)||[]).filter(h=>h.k==='refsub'||h.k==='referral').map(h=>({k:{id:'ref',name:h.who||''},key:'ref:'+h.at,t:h.at,r:{st:'ref',sub:h.k==='refsub',n:h.n,who:h.who||'',seen:S.has(h.at)}})); }
function refMark(keys){ const S=new Set(refSeen()); refNotices().forEach(x=>{ if(!keys||keys.includes('ref|'+x.key)) S.add(x.t); }); cSet('es.refSeen',[...S].slice(-300)); }
// the parent's code makes the link: a device that lost it (an old sign-in, an ended session) asks the server again, or signs in again with the contact kept on the device (no code any more)
async function inviteEnsure(){
  const A0=window.ACCOUNT||{}; if(A0.ref&&A0.token) return true;
  if(typeof syCall!=='function') return false;
  const s=typeof sySession==='function'&&sySession();
  if(s&&s.token){ const r=await syCall('/me'); if(!r) return false;
    if(r.j&&r.j.ok&&r.j.me&&r.j.me.ref){ const me=r.j.me; wlSet('es.account',{...(acct()||{}),ref:me.ref}); wlSet('es.session',{...(sySession()||{}),ref:me.ref}); window.ACCOUNT={...(window.ACCOUNT||{}),ref:me.ref,token:s.token}; return true; } }
  const a=acct(); if(a&&(a.email||a.phone)&&await syApi()){
    const r=await syCall('/auth/login',{email:a.email||'',phone:a.phone||'',curr:currPick()||{},device:typeof syDevice==='function'?syDevice():''});
    if(r&&r.j&&r.j.ok&&r.j.me){ syTake(r.j.token,r.j.me); if(typeof syPushKids==='function') syPushKids(); return !!(window.ACCOUNT&&window.ACCOUNT.ref); } }
  return false; }
function invitePage(tried){
  let o=$('#invPage'); if(!o){ o=el('div','acctpage',''); o.id='invPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Invite a friend'); document.body.append(o); }
  const A=window.ACCOUNT||{}, ok=!!(A.ref&&A.token), url=ok?shareLink():'', R=CS().referral||{}, n=Math.max(0,+R.subCoins||0), n0=R.on===false?0:Math.max(0,+R.coins||0),
    HH=((wallet().hist)||[]), sg=HH.filter(h=>h.k==='ref'||h.k==='referral'), sb=HH.filter(h=>h.k==='refsub'), tot=a=>a.reduce((x,h)=>x+(+h.n||0),0);
  const wait=!ok&&tried!=='done';
  const steps=[['ابعت لينكك لأصحابك',''],...(n0?[[`لما صديقك يسجّل حساب جديد من لينكك هتاخد <b>${num(n0)}</b> كريدت`,'']]:[]),...(n?[[`ولما صديقك يشترك اشتراك مدفوع هتاخد <b>${num(n)}</b> كريدت`,'']]:[])];
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back inv-back" aria-label="Back">${ICON.back}</button><h2>دعوة صديق</h2></div>
    <div class="ac-in inv-card"><section class="ac-card inv-hero"><i class="inv-ic">${ACH.inv}</i><h3>شارك لينكك واكسب كريدتس</h3><p>كل ما صاحب ليك يستخدم التطبيق من لينكك، رصيدك بيزيد.</p></section>
      <section class="ac-card"><h3>إزاي بتكسب؟</h3><ol class="inv-steps">${steps.map(x=>`<li><i></i><span>${x[0]}</span></li>`).join('')}</ol></section>
      <section class="ac-card">${ok?`<label class="inv-l"><span>لينكك</span></label><div class="inv-row"><input class="inv-url" type="text" readonly dir="ltr" value="${wlEsc(url)}"><button class="pill green inv-copy" type="button">نسخ</button></div><p class="pf-ok inv-ok" hidden>اتنسخ</p>
        <p class="inv-or">أو ابعته على</p><div class="inv-apps">${SHAPPS.map(a=>`<button type="button" class="shbtn" data-sh="${a[0]}" style="--shc:${a[3]}"><i>${a[4]}</i><span>${a[1]}</span></button>`).join('')}</div>`
      :wait?`<p class="inv-wait">جاري تجهيز لينكك…</p>`
      :`<p class="wl-err">مقدرناش نجهز لينكك دلوقتي. اتأكد إنك متصل بالإنترنت وجرب تاني.</p><button class="pill green inv-retry" type="button">جرب تاني</button>`}</section>
      <div class="inv-st2"><div class="ac-card"><small>كريدتس من تسجيل الأصدقاء</small><b>${num(tot(sg))}</b><em>${num(sg.length)} صديق</em></div><div class="ac-card"><small>كريدتس من اشتراك الأصدقاء</small><b>${num(tot(sb))}</b><em>${num(sb.length)} اشتراك</em></div></div></div>`;
  $('.inv-back',o).addEventListener('click',()=>o.hidden=true);
  const cp=$('.inv-copy',o), rt=$('.inv-retry',o);
  if(cp) cp.addEventListener('click',async()=>{ const f=$('.inv-url',o), t=(CS().shareText||'')+' '+url; try{ await navigator.clipboard.writeText(t.trim()); }catch(e){ f.select(); try{ document.execCommand('copy'); }catch(x){} } $('.inv-ok',o).hidden=false; });
  $$('[data-sh]',o).forEach(b=>b.addEventListener('click',()=>shareGo(b.dataset.sh)));
  if(rt) rt.addEventListener('click',()=>invitePage());
  if(!tried) document.body.append(o); o.hidden=false; if(!tried) pop('.ac-card',{y:14});
  if(!ok&&!tried) inviteEnsure().then(g=>{ if(!o.hidden) invitePage('done'); }); }

/* ---------- the parent's credits page (children popup -> "رصيدي") — total, from shares, from invites, then the history ---------- */
const HK={gift:['هدية التسجيل','Sign-up gift'],share:['مشاركة','Share'],ref:['ولي أمر سجّل من رابطك','A parent joined from your link'],refsub:['اشتراك من دعوتك','A friend subscribed from your link'],referral:['ولي أمر سجّل من رابطك','A parent joined from your link'],
  promo:['برومو كود','Promo code'],'unlock-lesson':['فتح درس','Unlocked a lesson'],'unlock-unit':['فتح وحدة','Unlocked a unit']};
function histName(h){ const b=HK[h.k]||[h.k,h.k]; let x=CT(b[0],b[1]);
  if(h.k==='promo') x+=': '+promoWhat(h.id);
  if(h.k==='refsub'&&h.who) x+=': '+h.who;
  if(h.id&&h.k==='unlock-lesson'){ const l=lessonOf(h.id), s=subjOf(h.id); if(l) x+=': '+(s?s.name+' · ':'')+(l.title||''); }
  if(h.id&&h.k==='unlock-unit'){ const p=h.id.split(':'), s=subjOf(h.id); x+=': '+(s?s.name+' · ':'')+CT('الوحدة ','Unit ')+num(p[2]||''); }
  return x; }
function creditBtn(){ return coinsOn()?`<button class="pill yellow wl-big wl-cred"><span class="wl-ar">${CT('رصيدي:','My credits:')} ${CRED(coinBal())}</span><small>${CT('اجمع كريدتس وافتح دروس','Earn credits, open lessons')}</small></button>`:''; }
function creditsPage(){ parentGate(()=>{
  let o=$('#credPage'); if(!o){ o=el('div','acctpage',''); o.id='credPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Credits'); document.body.append(o); }
  const w=wallet(), H=w.hist||[], sum=f=>H.filter(f).reduce((a,h)=>a+(+h.n||0),0);
  const sh=sum(h=>h.k==='share'), inv=sum(h=>h.k==='ref'||h.k==='referral'||h.k==='refsub');
  const dt=at=>{ try{ return new Date(at).toLocaleDateString('ar-EG',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return ''; } };
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back cr-back" aria-label="Back">${ICON.back}</button><h2>رصيدي</h2></div>
    <div class="ac-in"><section class="ac-card cr-tot"><small>إجمالي الكريدتس</small><b>${num(w.bal)}</b></section>
      <div class="cr-cols"><div class="ac-card"><b>${num(inv)}</b><small>من الدعوات</small></div><div class="ac-card"><b>${num(sh)}</b><small>من المشاركة</small></div></div>
      <section class="ac-card cr-cta"><h3>محتاج كريدتس أكتر؟</h3><p>ادعو أصحابك أو شارك التطبيق واكسب كريدتس تفتح بيها دروس جديدة.</p>
        <div class="cr-btns"><button class="pill green cr-inv" type="button">دعوة أصدقاء</button><button class="pill cream cr-share" type="button">شارك التطبيق</button></div></section>
      <section class="ac-card"><h3>السجل</h3><div class="cr-hist">${H.slice().reverse().map(h=>`<div class="crow"><span class="cpm ${h.n<0?'m':'p'}">${h.n<0?'−':'+'}</span><span class="cn"><b>${wlEsc(histName(h))}</b><small>${dt(h.at)}</small></span><span class="ca ${h.n<0?'m':'p'}" dir="ltr">${h.n<0?'-':'+'}${num(Math.abs(h.n))}</span></div>`).join('')||'<p class="cnote">لسه مفيش حاجة</p>'}</div></section></div>`;
  $('.cr-back',o).addEventListener('click',()=>o.hidden=true);
  $('.cr-inv',o).addEventListener('click',()=>invitePage());
  $('.cr-share',o).addEventListener('click',()=>coinSheet(creditsPage));
  document.body.append(o); o.hidden=false; pop('.ac-card',{y:14}); }); }

/* ---------- a tap on a locked lesson / unit ----------
   kind 'lesson': open this lesson (lessonCost), or its whole unit (unitCost) when unitCost is set; a free pick when the policy gives picks.
   kind 'unit':   open the whole unit (unitCost). Credits off, or no price = "this opens later". onOpen() redraws the map. */
function lockTap(kind,item,cost,art,onOpen){
  const C=CS(), title=CT('مقفول','Locked');
  const kid=typeof kidNow==='function'?kidNow():null, subOk=kind==='lesson'&&!!kid&&typeof subIsOn==='function'&&subIsOn()&&typeof subTermsFor==='function'&&subTermsFor(kid).some(x=>x[0]===subTermNow());
  if(kind!=='lesson'||(!coinsOn()&&!subOk)){ message(title,kind==='lesson'&&cost?CT(`تفتحه بـ ${COINTXT(cost)}`,`Open it with ${COINTXT(cost)}!`):CT('ده هيتفتح قريبًا','This opens later!'),art); return; }
  const lid='l:'+item.id, lc=cost||(+C.lessonCost||3);   // credits open LESSONS only (Ahmed 2026-11-11): no whole-unit buy, no sign-up gift
  const done=()=>{ coinClose(); paintHud(); if(typeof chime==='function') chime(3); onOpen&&onOpen(); };
  const again=()=>lockTap(kind,item,cost,art,onOpen);
  parentGate(()=>{ const bal=coinBal(), ok=bal>=lc, on=coinsOn(), t=subTermNow(), pr=subOk?subPrice(kid.grade||'p1',t):null;
    const tn=(SUBT_ALL.find(x=>x[0]===t)||[])[1]||'';
    coinPopPro(`<h2 class="outline">${title}</h2><div class="lkart">${art||''}</div>
      ${on?`${balLine(bal)}
      <button class="pill ${ok?'green':'cream off'} cbuy" data-l${ok?'':' disabled aria-disabled="true"'}><span>${CT('افتح الدرس بـ','Open the lesson for')} ${CRE(lc)}</span></button>
      ${ok?'':`<p class="msg-text clow">${CT('رصيدك لا يكفي','Not enough credits')}</p>`}
      <button class="pill cream" data-more>${CT('اجمع','Get')} Credits</button>`:''}
      ${subOk?`<div class="lksub">${on?`<div class="lkor"><span>${CT('أو','or')}</span></div>`:''}<h3>${CT('اشترك في','Subscribe to')} ${tn}</h3>
        <p class="msg-text">${CT('كل المواد لـ','All subjects for')} <b>${wlEsc(kid.name)}</b> · <bdi dir="ltr" class="lkp">${pr.disc?`<s>${EN(pr.price)}</s> `:''}${EN(pr.fin)}</bdi> ${CT('جنيه','EGP')}</p>
        <button class="pill ${on?'':'green'} lkbtn" data-sub>${CT('اشترك الآن','Subscribe now')}</button></div>`:''}
      ${on?promoLine():''}`, p=>{
      if(on) promoWire(p,onOpen);
      const l=$('[data-l]',p);
      if(l) l.addEventListener('click',()=>{ if(coinBal()<lc) return; addUnlock(lid,lc,'unlock-lesson'); done(); });
      const m=$('[data-more]',p); if(m) m.addEventListener('click',()=>coinSheet(again));
      const b=$('[data-sub]',p); if(b) b.addEventListener('click',()=>{ coinClose(); subBuy(kid.id,t,again,onOpen); }); }); });
}

/* ---------- PROMO CODES (Marwa 2026-11-05) ----------
   The admin makes codes in admin.html (page "البرومو كود"); settings.promos = [{code, what, target, uses, max, until, on, note}]
     what   = lesson | unit | subject | all | any (the user picks ONE built lesson, then it opens; one use) | percent (pct = 1-99 % off a subscription price; used when the receipt is sent)         target = l:<subject>-<folder> | u:<subject>:<unit> | <subject id> | ''
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
  if(p.what==='any') return CT('أي درس تختاره','Any lesson you choose');
  if(p.what==='subject'){ const s=COURSE.subjects.find(x=>x.id===t); return CT('مادة ','Subject ')+(s?s.name:t); }
  if(p.what==='unit'){ const s=subjOf(t), u=t.split(':')[2]; return (s?s.name+' · ':'')+CT('الوحدة ','Unit ')+num(u||''); }
  const l=lessonOf(t), s=subjOf(t); return l?(s?s.name+' · ':'')+(l.title||''):t; }
const promoKey=p=>p.what==='all'?'*':p.what==='subject'?'s:'+p.target:p.target;
function promoCheck(code){   // local check -> {p} or {err}
  const c=promoNorm(code); if(!c) return {err:'empty'};
  const p=(ESET.promos||[]).find(x=>promoNorm(x.code)===c); if(ESET.promoOn===false||!p||p.on===false) return {err:'bad'};
  if(p.until&&new Date().toISOString().slice(0,10)>p.until) return {err:'old'};
  if(p.what!=='all'&&p.what!=='any'&&p.what!=='percent'&&!p.target) return {err:'bad'};
  const U=cGet('es.promoUses',{}), mine=cGet(freeKey()+'.promo',[]), n=U[c]||0;
  if(mine.includes(c)) return {err:'used'};
  if(p.uses!=='many'&&n>=1) return {err:'used'};
  if(p.uses==='many'&&+p.max>0&&n>=+p.max) return {err:'full'};
  return {p,c}; }
function promoApply(p,c){ const id=promoKey(p), s=cGet(unlockKey(),[]); if(!s.includes(id)) s.push(id); cSet(unlockKey(),s); if(typeof subSeason==='function') subSeason();
  const U=cGet('es.promoUses',{}); U[c]=(U[c]||0)+1; cSet('es.promoUses',U);
  const mine=cGet(freeKey()+'.promo',[]); mine.push(c); cSet(freeKey()+'.promo',mine);
  const w=wallet(); w.hist.push({k:'promo',id,n:0,at:Date.now(),child:coinChild(),code:c}); walletSave(w); }
const PROMO_ERR={empty:['اكتب الكود الأول','Type the code first'],bad:['الكود ده مش صحيح','This code is not valid'],old:['الكود ده انتهى','This code has expired'],
  used:['الكود ده اتستخدم قبل كده','This code was already used'],full:['الكود ده خلص عدد مرات استخدامه','This code has no uses left'],net:['مفيش اتصال، جرّب تاني','No connection, try again']};
function promoLine(){ if(ESET.promoOn===false) return ''; return `<button type="button" class="cpromo" data-promo>${CT('عندك برومو كود؟','Have a promo code?')}</button>
  <form class="cpromof" hidden autocomplete="off"><input class="cpromoin" name="code" dir="ltr" inputmode="latin" autocapitalize="characters" spellcheck="false" maxlength="32" placeholder="${CT('اكتب الكود','Type the code')}" aria-label="${CT('البرومو كود','Promo code')}">
  <button class="pill green cpromogo">${CT('فعّل','Use')}</button><p class="cpromoerr" role="alert" hidden></p></form>`; }
function promoWire(pp,onOpen,ctx){
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
    const go=$('.cpromogo',f); go.disabled=true; const r=await promoGo(code); go.disabled=false;
    if(r.err) return bad(r.err);
    if(r.pick) return promoPick(code,ok,onOpen);
    if(r.pct){   // a percent-off code: it works on the subscription price (subs.js hands us ctx.pct); anywhere else it only tells what it is, nothing is used
      if(ctx&&ctx.pct) return ctx.pct(r.pct,code);
      return coinPop(`<h2 class="outline">${CT('كود خصم','Discount code')}</h2><p class="msg-text">${CT('الكود ده خصم ','This code gives ')}<b>${num(r.pct)}%</b>${CT(' على الاشتراك. بتكتبه في صفحة الاشتراك وقت الدفع.',' off a subscription. Type it on the subscription page when you pay.')}</p><button class="pill green" data-pgo>${CT('تمام','OK')}</button>`,
        q=>{ $('[data-pgo]',q).addEventListener('click',coinClose); }); }
    ok(r.p); });
}
// one try of a code: {err} | {pick:true} (an "any lesson" code: the user must choose the lesson, nothing is used yet) | {pct:N} (percent off a subscription, nothing used yet) | {p} (opened)
async function promoGo(code,id){
  if(API()){
    const r=await fetch(API()+'/promo',{method:'POST',headers:{'Content-Type':'application/json',...(window.ACCOUNT&&ACCOUNT.token?{Authorization:'Bearer '+ACCOUNT.token}:{})},body:JSON.stringify({child:coinChild(),code,...(id?{id}:{})})})
      .then(x=>x.json()).catch(()=>({error:'net'}));
    if(!r||!r.ok) return {err:r&&PROMO_ERR[r.error]?r.error:r&&r.error==='net'?'net':'bad'};
    if(r.pick) return {pick:true};
    if(r.percent) return {pct:+r.percent};
    apiTake(r); return {p:r.promo}; }
  const x=promoCheck(code); if(x.err) return x;
  if(x.p.what==='percent') return +x.p.pct>0&&+x.p.pct<100?{pct:+x.p.pct}:{err:'bad'};
  if(x.p.what==='any'){ if(!id) return {pick:true}; if(!promoPickable().some(g=>g.ls.some(l=>'l:'+l.id===id))) return {err:'bad'};
    const q={what:'lesson',target:id}; promoApply(q,x.c); return {p:q}; }
  promoApply(x.p,x.c); return {p:x.p}; }
// a percent code was used on a subscription without a server: count the use on this device (with a server, POST /subs counts it)
function promoSpend(code){ const c=promoNorm(code), U=cGet('es.promoUses',{}); U[c]=(U[c]||0)+1; cSet('es.promoUses',U);
  const mine=cGet(freeKey()+'.promo',[]); mine.push(c); cSet(freeKey()+'.promo',mine); }
// the lessons an "any lesson" code can open: built, shown, and not open for this child already
function promoPickable(){ const un=new Set(cGet(unlockKey(),[])), out=[];
  COURSE.subjects.forEach(s=>{ if(!s.lessons) return;
    const ls=s.lessons.filter(l=>l.file&&!l.hidden&&!promoOpen(un,'l:'+l.id)&&accessOf({},true,'l:'+l.id,0,'lesson').st!=='open'&&((ESET.items||{})['l:'+l.id]||{}).st!=='soon');
    if(ls.length) out.push({s,ls}); }); return out; }
function promoPick(code,ok,onOpen){
  const G2=promoPickable();
  if(!G2.length){ coinPop(`<h2 class="outline">${CT('كل الدروس مفتوحة','All lessons are open')}</h2><p class="msg-text">${CT('مفيش درس مقفول تفتحه بالكود ده دلوقتي.','There is no locked lesson left to open.')}</p><button class="pill green" data-pgo>${CT('تمام','OK')}</button>`,
      q=>{ $('[data-pgo]',q).addEventListener('click',coinClose); }); return; }
  let cur=G2[0].s.id, chosen='';
  coinPop(`<h2 class="outline">${CT('اختار الدرس','Choose a lesson')}</h2>
    ${G2.length>1?`<select class="cpick-s" aria-label="${CT('المادة','Subject')}">${G2.map(g=>`<option value="${g.s.id}">${g.s.name}</option>`).join('')}</select>`:''}
    <div class="cpick-l" role="listbox"></div><p class="cpromoerr" role="alert" hidden></p>
    <button class="pill green" data-pgo disabled>${CT('افتح الدرس','Open the lesson')}</button>`,
    q=>{ const box=$('.cpick-l',q), btn=$('[data-pgo]',q), er=$('.cpromoerr',q), sel=$('.cpick-s',q);
      const draw=()=>{ const g=G2.find(x=>x.s.id===cur); let u=null; box.innerHTML=g.ls.map(l=>{ const h=l.unit!==u?(u=l.unit,`<b class="cpick-u">${CT('الوحدة ','Unit ')}${num(l.unit)}</b>`):'';
          return h+`<button type="button" class="cpick-i${chosen==='l:'+l.id?' on':''}" role="option" data-id="l:${l.id}">${num(l.lesson)}. ${l.title||''}</button>`; }).join(''); };
      draw(); if(sel) sel.addEventListener('change',()=>{ cur=sel.value; chosen=''; btn.disabled=true; draw(); });
      box.addEventListener('click',e=>{ const b=e.target.closest('.cpick-i'); if(!b) return; chosen=b.dataset.id; btn.disabled=false; er.hidden=true; $$('.cpick-i',box).forEach(x=>x.classList.toggle('on',x===b)); });
      btn.addEventListener('click',async()=>{ if(!chosen) return; btn.disabled=true; const r=await promoGo(code,chosen);
        if(r.err){ er.textContent=CT(...PROMO_ERR[r.err]||PROMO_ERR.bad); er.hidden=false; btn.disabled=false; return; }
        ok(r.p); }); }); }
