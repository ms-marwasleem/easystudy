/* TERM SUBSCRIPTIONS (Ahmed 2026-11-11, spec: docs/subscriptions-spec.md). Per CHILD, per TERM, all subjects; price per school year + term from the
   dashboard (settings.subs.prices["p1:t1"] = {price, discOn, disc}); manual InstaPay: the parent pays on the InstaPay link, uploads a compressed
   receipt picture + the reference number. The upload opens THAT child's term for 24 hours ONCE (per child per term); the admin then confirms
   (open until 31 Aug) or rejects (closed at once). Everything ends on 31 Aug. No device data is stored anywhere.
   Records live in es.subs = {childId:{"p1:t1":{st,at,trial,until,price,ref,seen}}}: st = pending | active | rejected | closed; trial = ms the 24 h run to.
   With the server (settings "api") the server is the truth: GET /subs fills es.subs, POST /subs sends the receipt (server/src/index.js subs). */
const SUBT_ALL=[['t1','الترم الأول'],['t2','الترم التاني']], SUBT=SUBT_ALL.filter(x=>x[0]==='t1');   // الترم التاني مخفي لحد ما يتبني (ضيفي 't2' في الفلتر يرجع)
const subKey=(k,t)=>(k&&k.grade||'p1')+':'+t;
const subTermNow=()=>/2/.test((window.COURSE&&COURSE.term)||'')?'t2':'t1';   // the term this app's lessons belong to
const subAll=()=>cGet('es.subs',{});
const subRec=(kid,t)=>{ const k=typeof kid==='string'?kids().find(x=>x.id===kid):kid; return k?((subAll()[k.id]||{})[subKey(k,t)]||null):null; };
function subSave(kidId,key,rec){ const A=subAll(); A[kidId]=A[kidId]||{}; if(rec) A[kidId][key]=rec; else delete A[kidId][key]; cSet('es.subs',A); }
// 31 August: the next one after t (school year end; the "ends" date of every purchase)
function subEnd(t){ const d=new Date(t||Date.now()), y=d.getFullYear(), e=new Date(y,7,31,23,59,59); return (d>e?new Date(y+1,7,31,23,59,59):e).getTime(); }
// is this child's term open right now (paid + confirmed, or inside the one-time 24 h after the receipt)
function subOpen(){ const k=kidNow(); if(!k) return false; const r=subRec(k,subTermNow()), t=Date.now(); if(!r||t>=(r.until||0)) return false;
  return r.st==='active'||(r.st==='pending'&&t<(r.trial||0)); }
function subPrice(grade,t){ const p=((ESET.subs||{}).prices||{})[grade+':'+t]||{}, fin=p.discOn&&+p.disc>0?+p.disc:(+p.price||0); return {price:+p.price||0,fin,disc:!!(p.discOn&&+p.disc>0)}; }
const subDate=t=>{ try{ return new Date(t).toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'}); }catch(e){ return ''; } };
// the end of a term: expired records are removed and that child's opened lessons + progress start again (Ahmed: everything ends 31 Aug, progress not kept)
const SUB_PROG=['zoom-stars','zoom-opened','zoom-last','zoom-vocab','es.unlocked','es.freeused'];
function subExpire(){ const A=subAll(), now=Date.now(); let ch=false, cur=kidNow(), reload=false;
  Object.keys(A).forEach(id=>Object.keys(A[id]).forEach(key=>{ const r=A[id][key]; if(r.until&&now>=r.until){ delete A[id][key]; ch=true;
    try{ SUB_PROG.forEach(x=>{ if(cur&&cur.id===id){ localStorage.removeItem(x); reload=true; } localStorage.removeItem(`es.kid.${id}.${x}`); }); }catch(e){} } }));
  if(ch){ cSet('es.subs',A); if(reload) setTimeout(()=>location.reload(),50); } }
// credit / promo unlocks end on 31 Aug as well (Ahmed): a 'credit' record {st:'credit',until} per child marks the season of the opened lessons; subExpire wipes it with the rest
function subSeason(kidId){ const k=kidId?kids().find(x=>x.id===kidId):kidNow(); if(!k) return; const A=subAll(); A[k.id]=A[k.id]||{}; const r=A[k.id].credit;
  if(!r||!r.until||Date.now()>=r.until){ A[k.id].credit={st:'credit',at:Date.now(),until:subEnd(Date.now()),seen:true}; cSet('es.subs',A); } }
function subLegacy(){ try{ kids().forEach(k=>{ const cur=kidNow(), v=cur&&cur.id===k.id?localStorage.getItem('es.unlocked'):localStorage.getItem(`es.kid.${k.id}.es.unlocked`);
  let n=[]; try{ n=JSON.parse(v||'[]'); }catch(e){} if(n.length) subSeason(k.id); }); }catch(e){} }
subExpire(); subLegacy();

/* ---------- the server copy: GET /subs; a change to active / rejected / closed shows ONE message (and the account row shows a dot until then) ---------- */
async function subSync(){ const s=typeof sySession==='function'&&sySession(); if(!s||!s.token||!API()) return;
  const r=await syCall('/subs'); if(!r||!r.j.ok) return; const A={}, old=subAll(), mine=new Set(kids().map(k=>k.id));
  r.j.subs.forEach(x=>{ if(!mine.has(x.child)) return; const o=((old[x.child]||{})[x.term])||{};
    (A[x.child]=A[x.child]||{})[x.term]={st:x.st,at:x.at,trial:x.trial,until:x.until,price:x.price,ref:x.ref,note:x.note||'',dec:x.dec||0,seen:o.st===x.st?o.seen:(x.st==='pending')}; });
  Object.keys(old).forEach(id=>{ if(!mine.has(id)) A[id]=old[id]; else Object.keys(old[id]).forEach(key=>{ if(old[id][key].st==='credit') (A[id]=A[id]||{})[key]=old[id][key]; else if(!(A[id]||{})[key]&&old[id][key].st==='pending'&&!r.j.subs.length) (A[id]=A[id]||{})[key]=old[id][key]; }); });
  cSet('es.subs',A); const o=$('#acctPage'); if(o&&!o.hidden) subDot(o); const sp=$('#subsPage'); if(sp&&!sp.hidden) subsOpen(); const np=$('#notifPage'); if(np&&!np.hidden) notifsOpen(); if(typeof puBadge==='function') puBadge(); }
function subNews(){ const out=typeof refNotices==='function'?refNotices().filter(x=>!x.r.seen):[]; const A=subAll(); kids().forEach(k=>Object.entries(A[k.id]||{}).forEach(([key,r])=>{ if(!r.seen&&(r.st==='active'||r.st==='rejected'||r.st==='closed')) out.push({k,key,r}); })); return out; }
function subDot(o){ const b=$('.ac-news em',o); const n=subNews().length; if(b) b.textContent=n?num(n)+' جديد':''; }
setTimeout(subSync,1500); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) subSync(); });

/* ---------- the receipt picture: made small in the browser (about 100 KB) before it is sent ---------- */
function subShrink(file){ return new Promise((ok,no)=>{ const im=new Image(), u=URL.createObjectURL(file);
  im.onload=()=>{ URL.revokeObjectURL(u); let w=im.naturalWidth, h=im.naturalHeight, side=1100, out='';
    for(let round=0;round<4;round++){ const f=Math.min(1,side/Math.max(w,h)), c=document.createElement('canvas'); c.width=Math.round(w*f); c.height=Math.round(h*f);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      for(const q of [.72,.6,.48,.36]){ out=c.toDataURL('image/jpeg',q); if(out.length<=137000) return ok(out); }
      side=Math.round(side*.75); }
    ok(out); };
  im.onerror=()=>{ URL.revokeObjectURL(u); no(new Error('img')); }; im.src=u; }); }

/* ---------- screens (the account page row "اشتراكاتي") ---------- */
const subIsOn=()=>!!((ESET.subs||{}).on);
function subStat(r,t){ const now=Date.now(); if(!r) return {c:'none',t:'مفيش اشتراك'};
  if(r.until&&now>=r.until) return {c:'none',t:'مفيش اشتراك'};
  if(r.st==='active') return {c:'on',t:'مفعّل لحد '+subDate(r.until)};
  if(r.st==='pending') return {c:'wait',t:now<(r.trial||0)?'مفتوح ٢٤ ساعة لحد ما نتأكد من الدفع':'بنراجع الإيصال'};
  if(r.st==='rejected') return {c:'bad',t:'الدفع ما اتأكدش'};
  return {c:'none',t:'اتقفل'}; }
/* the subscriptions PAGE (Ahmed 2026-11-16): a page in the account area (same look as the profile page), two tabs: الاشتراكات = a table per child, one row per term with a strong
   state (active until / not subscribed / waiting / rejected) and the button to subscribe; الإشعارات = what happened to each receipt (confirmed, rejected + the admin's reason, closed).
   The notices are read from the same subscription records (server GET /subs: st, note, dec = the day the admin decided), so there is one data shape and nothing else to keep in step. */
const SUB_TAB={kid:null};
function subsPage(){ parentGate(()=>subsOpen()); }
// any subscription this account ever had (credit-unlock seasons are not subscriptions)
function subHasAny(){ const A=subAll(); return kids().some(k=>Object.values(A[k.id]||{}).some(r=>r&&r.st&&r.st!=='credit')); }
// the page shows only what exists: active subscriptions (and a receipt still being reviewed) of the student whose tab is open; buying starts from the "عمل اشتراك" button
const subLive=r=>!!r&&(!r.until||Date.now()<r.until)&&(r.st==='active'||r.st==='pending');
function subTermsFor(k){ return SUBT.filter(([t])=>!subLive(subRec(k,t))&&subPrice(k.grade||'p1',t).fin>0); }
function subNew(){ const on=subIsOn(), K=kids(); if(!on||!K.length) return;
  let kid=K.length===1?K[0].id:SUB_TAB.kid;
  const draw=p=>{ const k=K.find(x=>x.id===kid), T=k?subTermsFor(k):[];
    p.innerHTML=`<h2 class="outline">عمل اشتراك</h2><div class="subscroll">${K.length>1?`<p class="msg-text">اختار الطالب</p><div class="sp-pick">${K.map(x=>`<button class="pill ${x.id===kid?'green':'cream'} sp-pk" data-k="${x.id}">${wlEsc(x.name)}</button>`).join('')}</div>`:''}
      ${k?(T.length?`<p class="msg-text">اختار الترم</p><div class="sp-pick">${T.map(([t,tn])=>`<button class="pill yellow sp-pt" data-t="${t}">${tn}<small>${num(subPrice(k.grade||'p1',t).fin)} جنيه</small></button>`).join('')}</div>`:'<p class="msg-text">مفيش ترمات متاحة للاشتراك دلوقتي.</p>'):''}
      <button class="pill cream sp-pc">إلغاء</button></div>`;
    $$('.sp-pk',p).forEach(b=>b.addEventListener('click',()=>{ kid=b.dataset.k; draw(p); }));
    $$('.sp-pt',p).forEach(b=>b.addEventListener('click',()=>{ coinClose(); subBuy(kid,b.dataset.t); }));
    $('.sp-pc',p).addEventListener('click',coinClose); };
  coinPop('<div class="sp-pop"></div>',p=>draw($('.sp-pop',p))); }
function subsOpen(tab){ if(tab) SUB_TAB.kid=tab; const on=subIsOn();
  let o=$('#subsPage'); if(!o){ o=el('div','acctpage',''); o.id='subsPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Subscriptions'); document.body.append(o); }
  const K=kids(), cur=kidNow(); if(!K.find(x=>x.id===SUB_TAB.kid)) SUB_TAB.kid=(cur&&cur.id)||(K[0]&&K[0].id);
  const k=K.find(x=>x.id===SUB_TAB.kid);
  const rows=k?SUBT.map(([t,tn])=>({t,tn,r:subRec(k,t)})).filter(x=>subLive(x.r)):[];
  const tabs=K.length>1?`<div class="sp-tabs" role="tablist">${K.map(x=>`<button class="sp-tab-b${x.id===SUB_TAB.kid?' on':''}" data-tab="${x.id}" role="tab">${wlEsc(x.name)}</button>`).join('')}</div>`:'';
  const body=(on?`<button class="pill green sp-new">عمل اشتراك</button>`:'<p class="sp-soon">الاشتراكات غير مفعلة حاليا</p>')+tabs+
    `<section class="ac-card sp-kid">${K.length>1?'':`<h3>${k?wlEsc(k.name):''}</h3>`}${rows.length?`<div class="sp-tbl" role="table">${rows.map(({t,tn,r})=>{ const s=subStat(r,t), ic=s.c==='on'?'✓':'…';
      return `<div class="sp-r ${s.c}" role="row"><b>${tn}</b><span class="sp-s"><i class="sp-ic">${ic}</i>${s.t}</span></div>`; }).join('')}</div>`:`<p class="sp-empty">مفيش اشتراكات مفعّلة${k?' لـ '+wlEsc(k.name):''}.</p>`}</section>`;
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back sp-back" aria-label="Back">${ICON.back}</button><h2>اشتراكاتي</h2></div><div class="ac-in">${body}</div>`;
  $('.sp-back',o).addEventListener('click',()=>o.hidden=true);
  $$('.sp-tab-b',o).forEach(b=>b.addEventListener('click',()=>subsOpen(b.dataset.tab)));
  const nb=$('.sp-new',o); if(nb) nb.addEventListener('click',subNew);
  o.hidden=false; }
/* ---------- the NOTIFICATIONS page (Ahmed 2026-11-17): its own row in the account page ("الإشعارات") and the bell on the home page (with the unread count) both open it.
   Inside: the on / off switch of the device notifications (js/push.js; before the first permission it is one button that asks), a filter all / unread only, "mark all as read",
   and the list = what happened to each receipt (confirmed, rejected + the admin's reason, closed; read from the subscription records). A notice is unread until it is tapped or "mark all" is pressed; nothing ever pops up by itself. ---------- */
const NF={f:'all'};
const notifUnread=n=>!n.r.seen&&(n.r.st==='ref'||n.r.st==='active'||n.r.st==='rejected'||n.r.st==='closed');
function subNotices(){ const out=[]; const A=subAll(); kids().forEach(k=>Object.entries(A[k.id]||{}).forEach(([key,r])=>{ if(r.st==='credit'||!r.st) return; out.push({k,key,r,t:r.dec||r.at||0}); })); if(typeof refNotices==='function') out.push(...refNotices()); return out.sort((a,b)=>b.t-a.t); }
function notifRefresh(){ if(typeof puBadge==='function') puBadge(); const ap=$('#acctPage'); if(ap&&!ap.hidden) subDot(ap); }
function notifMark(keys){ const A=subAll(); let ch=false; Object.entries(A).forEach(([kid,m])=>Object.entries(m).forEach(([key,r])=>{ if(r&&!r.seen&&(!keys||keys.includes(kid+'|'+key))){ r.seen=true; ch=true; } })); if(ch) cSet('es.subs',A); if(typeof refMark==='function') refMark(keys); notifRefresh(); notifsOpen(); }
function notifsPage(){ notifsOpen(); }
function notifPushRow(o){ const box=$('.nf-push',o); if(!box) return;
  if(typeof puCan!=='function'||!puCan()){ box.hidden=true; return; }
  const perm=typeof Notification!=='undefined'?Notification.permission:'default', on=!!PUSH.sub&&perm==='granted', first=!PUSH.sub&&perm==='default';
  box.hidden=false;
  box.innerHTML=first?`<span class="nf-ask-t">خلّي الإشعارات توصلك على الجهاز حتى لو التطبيق مقفول</span><button class="pill green nf-ask" type="button">فعّل الإشعارات</button>`
    :`<label class="pf-sw"><input type="checkbox" class="nf-sw"${on?' checked':''}><i></i><span>إشعارات الجهاز</span></label>`;
  const go=async()=>{ await puToggle(); notifPushRow(o); };
  const a=$('.nf-ask',box), w=$('.nf-sw',box); if(a) a.addEventListener('click',go); if(w) w.addEventListener('click',e=>{ e.preventDefault(); go(); }); }
function notifsOpen(){ const on=subIsOn();
  let o=$('#notifPage'); if(!o){ o=el('div','acctpage',''); o.id='notifPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Notifications'); document.body.append(o); }
  const all=subNotices(), nu=all.filter(notifUnread).length, L=NF.f==='unread'?all.filter(notifUnread):all;
  const tabs=`<div class="sp-tabs" role="tablist"><button class="sp-tab-b${NF.f==='all'?' on':''}" data-f="all" role="tab">الكل</button><button class="sp-tab-b${NF.f==='unread'?' on':''}" data-f="unread" role="tab">غير المقروء${nu?`<i class="sp-dot">${num(nu)}</i>`:''}</button></div>`;
  const list=L.length?`<div class="sp-news">${L.map(n=>{ if(n.r.st==='ref') return `<article class="ac-card sp-n active${notifUnread(n)?' unread':''}" data-nk="${n.k.id}|${n.key}"><div class="sp-nh"><b>دعوة صديق</b><small>${n.t?subDate(n.t):''}</small></div><p>${n.r.sub?'تم اشتراك':'تم تسجيل'} <b>${wlEsc(n.r.who||'صديق')}</b> ${n.r.sub?'':'كحساب جديد '}عن طريق لينك الدعوة بتاعك وخدتي <b>${num(n.r.n)}</b> كريدت.</p></article>`; const t=n.key.split(':')[1], tn=(SUBT_ALL.find(x=>x[0]===t)||[])[1]||'', st=n.r.st, expired=n.r.until&&Date.now()>=n.r.until;
      const kind=expired||st==='closed'?'closed':st, ttl={active:'تم تفعيل الاشتراك',rejected:'الاشتراك ما اتفعلش',closed:'الاشتراك اتقفل',pending:'وصلنا الإيصال'}[kind]||'';
      const txt={active:`اشتراك <b>${wlEsc(n.k.name)}</b> في ${tn} مفعّل ومفتوح لحد ${subDate(n.r.until)}.`,
        rejected:`مقدرناش نتأكد من الدفع لاشتراك <b>${wlEsc(n.k.name)}</b> في ${tn}، فالدروس اتقفلت.`,
        closed:`اشتراك <b>${wlEsc(n.k.name)}</b> في ${tn} اتقفل.`,
        pending:`إيصال اشتراك <b>${wlEsc(n.k.name)}</b> في ${tn} وصلنا وبنراجعه.`}[kind]||'';
      return `<article class="ac-card sp-n ${kind}${notifUnread(n)?' unread':''}" data-nk="${n.k.id}|${n.key}"><div class="sp-nh"><b>${ttl}</b><small>${n.t?subDate(n.t):''}</small></div><p>${txt}</p>${kind==='rejected'?`<p class="sp-why"><span>السبب</span>${wlEsc(n.r.note||'مقدرناش نتأكد من الدفع').replace(/\n/g,'<br>')}</p>`:''}${kind==='rejected'&&on?`<button class="pill green sp-buy" data-k="${n.k.id}" data-t="${t}">ابعت الإيصال تاني</button>`:''}</article>`; }).join('')}</div>`
    :`<section class="ac-card"><p class="sp-empty">${NF.f==='unread'?'مفيش إشعارات غير مقروءة.':'مفيش إشعارات لسه.'}</p></section>`;
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back nf-back" aria-label="Back">${ICON.back}</button><h2>الإشعارات</h2></div><div class="ac-in"><section class="ac-card nf-push" hidden></section>${tabs}${nu?'<button class="pill yellow nf-all" type="button">تعليم الكل كمقروء</button>':''}${list}</div>`;
  $('.nf-back',o).addEventListener('click',()=>{ o.hidden=true; notifRefresh(); });
  $$('.sp-tab-b',o).forEach(b=>b.addEventListener('click',()=>{ NF.f=b.dataset.f; notifsOpen(); }));
  const ba=$('.nf-all',o); if(ba) ba.addEventListener('click',()=>notifMark());
  $$('.sp-n.unread',o).forEach(a=>a.addEventListener('click',e=>{ if(e.target.closest('.sp-buy')) return; notifMark([a.dataset.nk]); }));
  $$('.sp-buy',o).forEach(b=>b.addEventListener('click',()=>subBuy(b.dataset.k,b.dataset.t)));
  notifPushRow(o); o.hidden=false; }
function subBuy(kidId,t){ const k=kids().find(x=>x.id===kidId); if(!k) return; const key=subKey(k,t), r=subRec(k,t), pr=subPrice(k.grade||'p1',t), S=ESET.subs||{}, tn=(SUBT_ALL.find(x=>x[0]===t)||[])[1];
  const live=r&&(!r.until||Date.now()<r.until)&&(r.st==='active'||r.st==='pending');
  if(live&&r.st==='active'||live&&r.st==='pending'&&Date.now()>=(r.trial||0)){   // paid, or the receipt is waiting for the admin: only the state
    const s=subStat(r,t); return coinPop(`<h2 class="outline">${wlEsc(k.name)} · ${tn}</h2><p class="msg-text">${s.t}</p><button class="pill green" data-ok>تمام</button>`,p=>$('[data-ok]',p).addEventListener('click',()=>{ coinClose(); subsOpen(); })); }
  let disc=null;   // a percent promo code typed on this page: {pct, code}
  const link=S.link||'', who=S.name||'', pro=ESET.promoOn!==false&&((ESET.promos&&ESET.promos.length)||API());
  coinPop(`<h2 class="outline">${wlEsc(k.name)} · ${tn}</h2>
    <div class="subscroll"><p class="subprice" data-sp>${pr.disc?`<s>${num(pr.price)}</s> `:''}<b>${num(pr.fin)}</b> جنيه</p>
    <ol class="substeps"><li>ادفعي على إنستا باي${who?` لحساب <b>${wlEsc(who)}</b>`:''}.${link?`<br><a class="pill yellow subpay" href="${wlEsc(link)}" target="_blank" rel="noopener">افتحي إنستا باي</a>`:''}</li>
      <li>اكتبي رقم العملية وارفعي صورة الإيصال.</li></ol>
    <form class="subf" autocomplete="off" novalidate>
      <label><span>رقم العملية</span><input name="ref" dir="ltr" inputmode="text" maxlength="40" required></label>
      <label class="subfile"><span>صورة الإيصال</span><input type="file" name="img" accept="image/*" required></label>
      <p class="subimg" hidden></p><p class="wl-err" hidden></p>
      <button class="pill green wl-big" type="submit"><span class="wl-ar">ابعتي الإيصال</span></button></form>
    <p class="subnote">بعد الإرسال الدروس بتتفتح ٢٤ ساعة لحد ما نتأكد من الدفع.<br>الاشتراك لحد ${subDate(subEnd())}، وبعدها الدروس بتتقفل والتقدم بيبدأ من الأول.<br>مفيش استرجاع للفلوس.</p>${pro?promoLine():''}</div>`,
    p=>{ const fin=()=>disc?Math.max(1,Math.round(pr.fin*(100-disc.pct)/100)):pr.fin;
      promoWire(p,()=>{ subsOpen(); },{pct:(n,code)=>{ disc={pct:n,code};
        $('[data-sp]',p).innerHTML=`<s>${num(pr.fin)}</s> <b>${num(fin())}</b> جنيه<small class="subpct">خصم ${num(n)}%</small>`;
        const b=$('[data-promo]',p), pf=$('.cpromof',p); if(b) b.hidden=true; if(pf) pf.hidden=true; p.classList.remove('promo-on'); }});
      const f=$('.subf',p), er=$('.wl-err',p), im=$('.subimg',p); let pic='';
      const say=m=>{ er.textContent=m; er.hidden=false; };
      f.img.addEventListener('change',async()=>{ pic=''; im.hidden=true; const file=f.img.files[0]; if(!file) return;
        try{ pic=await subShrink(file); im.textContent='الصورة جاهزة ('+num(Math.round(pic.length*.75/1024))+' ك.ب)'; im.hidden=false; er.hidden=true; }catch(e){ say('الصورة دي مش بتفتح. جربي صورة تانية'); } });
      f.addEventListener('submit',async e=>{ e.preventDefault(); const ref=f.ref.value.trim();
        if(!ref) return wlBad(f,'ref','اكتبي رقم العملية'); if(!pic) return wlBad(f,'img','ارفعي صورة الإيصال');
        const go=$('button[type=submit]',f); go.disabled=true; const t0=Date.now();
        let rec; const has=subRec(k,t);
        if(API()&&typeof sySession==='function'&&sySession()){ const x=await syCall('/subs',{child:k.id,term:key,ref,receipt:pic,...(disc?{promo:disc.code}:{})});
          if(!x){ go.disabled=false; return say('مفيش إنترنت دلوقتي'); }
          if(!x.j.ok){ go.disabled=false; return say({'already':'الاشتراك ده شغال','pending':'الإيصال متبعت وبنراجعه','no-price':'السعر لسه متحددش','big':'الصورة كبيرة','bad-receipt':'الصورة مش مظبوطة','off':'الاشتراك لسه مش شغال','bad':'الكود ده مش صحيح','old':'الكود ده انتهى','used':'الكود ده اتستخدم قبل كده','full':'الكود ده خلص عدد مرات استخدامه'}[x.j.error]||'حصلت مشكلة. جربي تاني'); }
          rec={st:'pending',at:x.j.at,trial:x.j.trial,until:x.j.until,price:fin(),ref,seen:true}; }
        else rec={st:'pending',at:t0,trial:has&&has.trialUsed?0:t0+864e5,until:subEnd(t0),price:fin(),ref,seen:true,trialUsed:true,local:true}; if(disc) promoSpend(disc.code);   // no server: kept on this device (admin cannot see it)
        subSave(k.id,key,rec); coinClose(); if(typeof chime==='function') chime(3);
        coinPop(`<h2 class="outline">وصلنا الإيصال</h2><p class="msg-text">دروس <b>${wlEsc(k.name)}</b> مفتوحة ٢٤ ساعة لحد ما نتأكد من الدفع.</p><button class="pill green" data-ok>تمام</button>`,
          p2=>$('[data-ok]',p2).addEventListener('click',()=>{ coinClose(); if(typeof drawSubjects==='function'&&!$('#subjects').hidden) drawSubjects(); const sp=$('#subsPage'); if(sp&&!sp.hidden) subsOpen(); })); }); }); }
