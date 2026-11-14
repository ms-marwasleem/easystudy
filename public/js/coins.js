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
try{ const r=new URLSearchParams(location.search).get('r'); if(r&&!localStorage.getItem('es.ref')) localStorage.setItem('es.ref',JSON.stringify({code:r,at:Date.now()})); }catch(e){}
const refCode=()=>(cGet('es.ref',null)||{}).code||null;
const ESET_P=get('data/settings.json').catch(()=>null).then(async d=>{
  ESET=d||ESET;   // no device copy: the real settings come from the server below
  if(ESET.api){ const s=await apiCall('/settings'); if(s&&s.coins) ESET={...s,api:ESET.api,whatsapp:s.whatsapp||ESET.whatsapp,adminEmail:s.adminEmail||ESET.adminEmail}; apiTake(await apiCall('/wallet'+(coinChild()?'?child='+encodeURIComponent(coinChild()):''))); }
  ESET.items=ESET.items||{}; ESET.coins=ESET.coins||{shares:[]};
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
// ONE share button (Ahmed 2026-11-11): the device share sheet; no sheet (desktop) = copy the link. Any share = 1 credit, at most dailyCap (20) shares a day.
let COPIED=false;
function shareOpen(){
  const url=shareLink(), text=CS().shareText||'EasyStudy'; COPIED=false;
  if(navigator.share) return navigator.share({title:'EasyStudy',text,url}).catch(()=>{});
  try{ navigator.clipboard.writeText(text+' '+url); }catch(x){} COPIED=true; }
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
function shareStart(after){ const w=wallet(), p=sharePays(w);
  if(!p){ shareOpen(); return shareNote('cap',after); }   // the day's 20 shares are paid: the share still opens, no credits
  SHR={p,at:Date.now(),left:0,after};
  const copy=!navigator.share, leaveIn=copy?60000:5000, me=SHR;
  shareOpen();
  setTimeout(()=>{ if(SHR===me&&!SHR.left){ SHR=null; shareNote('no',after); } },leaveIn);
  if(copy) shareNote('copied',after); }
document.addEventListener('visibilitychange',()=>{ if(!SHR) return;
  if(document.hidden){ if(!SHR.left) SHR.left=Date.now(); return; }
  if(!SHR.left) return; const s=SHR; SHR=null;
  if(Date.now()-s.left<shareMin()) return shareNote('short',s.after);
  sharePay(s.after); });
function sharePay(after){ const w=wallet(), p=sharePays(w); if(!p) return coinSheet(after);
  w.bal+=p; w.hist.push({k:'share',n:p,at:Date.now()}); walletSave(w); paintHud();
  apiCall('/share',{}).then(apiTake);   // the server pays again by its own rules and sends the true wallet
  if(typeof chime==='function') chime(2);
  coinPop(`<h2 class="outline">${CT('شكرًا!','Thank you!')}</h2>${balLine(w.bal)}<p class="msg-text">${CT(`أخدت ${CRED(p)} على المشاركة`,`You got ${CRED(p)} for sharing`)}</p><button class="pill green" data-ok>${CT('تمام','OK')}</button>`,
    pp=>$('[data-ok]',pp).addEventListener('click',()=>coinSheet(after))); }
function shareNote(why,after){
  const txt={no:CT('ملحقناش نشوف المشاركة اتبعتت. ابعت الرسالة وارجع هنا عشان تاخد الكريدتس','We did not see the share go out. Send the message, then come back here to get the credits'),
    short:CT('رجعت بسرعة قوي. ابعت الرسالة فعلًا وارجع هنا عشان تاخد الكريدتس','You came back too fast. Really send the message, then come back here for the credits'),
    cap:CT('خلصت مشاركات النهارده (٢٠). كمّل بكرة','You reached today\'s 20 shares. Continue tomorrow'),
    copied:CT('الرابط اتنسخ. الصقه في محادثة أو جروب وابعته، وارجع هنا عشان تاخد الكريدتس','The link is copied. Paste it in a chat or group and send it, then come back here for the credits')}[why];
  coinPop(`<h2 class="outline">${why==='copied'?CT('اتنسخ','Copied'):why==='cap'?CT('كفاية النهارده','Enough for today'):CT('لسه','Not yet')}</h2><p class="msg-text">${txt}</p><button class="pill green" data-ok>${CT('تمام','OK')}</button>`,
    pp=>$('[data-ok]',pp).addEventListener('click',()=>why==='copied'?coinClose():coinSheet(after))); }
function coinSheet(after){ parentGate(()=>{
  const w=wallet(), p=sharePays(w);
  coinPop(`<h2 class="outline">${CT('اجمع كريدتس','Get credits')}</h2>${balLine(w.bal)}
    <p class="msg-text">${CT('شارك التطبيق مع أصحابك واكسب كريدت على كل مشاركة، وافتح بيها دروس جديدة. ابعت الرسالة فعلًا وارجع هنا عشان تتحسب','Share the app with friends: every share earns a credit to open new lessons. Really send it, then come back here so it counts')}</p>
    <button class="pill green cshare1" data-share><span class="si">${SHAREIC}</span><span>${CT('شارك','Share')}</span>${p?`<span class="sc">+${num(p)}</span>`:''}</button>`, pp=>{
    $('[data-share]',pp).addEventListener('click',()=>shareStart(after));
    if(after) $('.popx',pp).addEventListener('click',after);
  }); }); }

/* ---------- the parent's credits page (children popup -> "رصيدي") — total, from shares, from invites, then the history ---------- */
const HK={gift:['هدية التسجيل','Sign-up gift'],share:['مشاركة','Share'],ref:['ولي أمر سجّل من رابطك','A parent joined from your link'],referral:['ولي أمر سجّل من رابطك','A parent joined from your link'],
  promo:['برومو كود','Promo code'],'unlock-lesson':['فتح درس','Unlocked a lesson'],'unlock-unit':['فتح وحدة','Unlocked a unit']};
function histName(h){ const b=HK[h.k]||[h.k,h.k]; let x=CT(b[0],b[1]);
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
  if(!coinsOn()||kind!=='lesson'){ message(title,kind==='lesson'&&cost?CT(`تفتحيه بـ ${COINTXT(cost)}`,`Open it with ${COINTXT(cost)}!`):CT('ده هيتفتح قريبًا','This opens later!'),art); return; }
  const lid='l:'+item.id, lc=cost||(+C.lessonCost||3);   // credits open LESSONS only (Ahmed 2026-11-11): no whole-unit buy, no sign-up gift
  const done=()=>{ coinClose(); paintHud(); if(typeof chime==='function') chime(3); onOpen&&onOpen(); };
  parentGate(()=>{ const bal=coinBal(), ok=bal>=lc;
    coinPop(`<h2 class="outline">${title}</h2><div class="msg-art">${art||''}</div>${balLine(bal)}
      <div class="cbuys"><button class="pill ${ok?'green':'cream off'} cbuy" data-l${ok?'':' disabled aria-disabled="true"'}><span>${CT('افتح الدرس','Open the lesson')} = ${num(lc)} ${CT('كريدتس','credits')}</span></button></div>
      ${ok?'':`<p class="msg-text clow">${CT('رصيدك لا يكفي','Not enough credits')}</p>`}
      <button class="pill blue" data-more>${CT('اجمع كريدتس','Get credits')}</button>${promoLine()}`, p=>{
      promoWire(p,onOpen);
      const l=$('[data-l]',p);
      if(l) l.addEventListener('click',()=>{ if(coinBal()<lc) return; addUnlock(lid,lc,'unlock-lesson'); done(); });
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
  const p=(ESET.promos||[]).find(x=>promoNorm(x.code)===c); if(ESET.promoOn===false||!p||p.on===false) return {err:'bad'};
  if(p.until&&new Date().toISOString().slice(0,10)>p.until) return {err:'old'};
  if(p.what!=='all'&&!p.target) return {err:'bad'};
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
