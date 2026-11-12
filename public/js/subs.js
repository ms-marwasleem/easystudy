/* TERM SUBSCRIPTIONS (Ahmed 2026-11-11, spec: docs/subscriptions-spec.md). Per CHILD, per TERM, all subjects; price per school year + term from the
   dashboard (settings.subs.prices["p1:t1"] = {price, discOn, disc}); manual InstaPay: the parent pays on the InstaPay link, uploads a compressed
   receipt picture + the reference number. The upload opens THAT child's term for 24 hours ONCE (per child per term); the admin then confirms
   (open until 31 Aug) or rejects (closed at once). Everything ends on 31 Aug. No device data is stored anywhere.
   Records live in es.subs = {childId:{"p1:t1":{st,at,trial,until,price,ref,seen}}}: st = pending | active | rejected | closed; trial = ms the 24 h run to.
   With the server (settings "api") the server is the truth: GET /subs fills es.subs, POST /subs sends the receipt (server/src/index.js subs). */
const SUBT=[['t1','الترم الأول'],['t2','الترم التاني']];
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
    (A[x.child]=A[x.child]||{})[x.term]={st:x.st,at:x.at,trial:x.trial,until:x.until,price:x.price,ref:x.ref,seen:o.st===x.st?o.seen:(x.st==='pending')}; });
  Object.keys(old).forEach(id=>{ if(!mine.has(id)) A[id]=old[id]; else Object.keys(old[id]).forEach(key=>{ if(old[id][key].st==='credit') (A[id]=A[id]||{})[key]=old[id][key]; else if(!(A[id]||{})[key]&&old[id][key].st==='pending'&&!r.j.subs.length) (A[id]=A[id]||{})[key]=old[id][key]; }); });
  cSet('es.subs',A); subNotice(); const o=$('#acctPage'); if(o&&!o.hidden) subDot(o); }
function subNews(){ const out=[]; const A=subAll(); kids().forEach(k=>Object.entries(A[k.id]||{}).forEach(([key,r])=>{ if(!r.seen&&(r.st==='active'||r.st==='rejected'||r.st==='closed')) out.push({k,key,r}); })); return out; }
function subNotice(){ const n=subNews()[0]; if(!n||$('#coinPop')&&!$('#coinPop').hidden) return;
  const t=n.key.split(':')[1], tn=(SUBT.find(x=>x[0]===t)||[])[1]||'', ok=n.r.st==='active';
  const A=subAll(); A[n.k.id][n.key].seen=true; cSet('es.subs',A);
  coinPop(`<h2 class="outline">${ok?'تم تفعيل الاشتراك':n.r.st==='closed'?'الاشتراك اتقفل':'الاشتراك ما اتفعلش'}</h2>
    <p class="msg-text">${ok?`اشتراك <b>${wlEsc(n.k.name)}</b> في ${tn} اتفعل ويفضل مفتوح لحد ${subDate(n.r.until)}.`:n.r.st==='closed'?`اشتراك <b>${wlEsc(n.k.name)}</b> في ${tn} اتقفل.`:`مقدرناش نتأكد من الدفع لاشتراك <b>${wlEsc(n.k.name)}</b> في ${tn}، فالدروس اتقفلت. ممكن تبعتي الإيصال تاني.`}</p>
    <button class="pill green" data-ok>تمام</button>`, p=>$('[data-ok]',p).addEventListener('click',()=>{ coinClose(); if(typeof drawSubjects==='function'&&!$('#subjects').hidden) drawSubjects(); subNotice(); })); }
function subDot(o){ const b=$('.ac-subs em',o); if(b) b.textContent=subNews().length?'جديد':''; }
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
function subsPage(){ parentGate(()=>{ const K=kids(); const on=subIsOn();
  coinPop(`<h2 class="outline">اشتراكاتي</h2><div class="subscroll">${on?'':'<p class="msg-text">الاشتراك هيتفتح قريبًا.</p>'}
    <div class="subk">${K.map(k=>`<div class="subkid"><b class="sn">${wlEsc(k.name)}</b>${SUBT.map(([t,tn])=>{ const r=subRec(k,t), s=subStat(r,t), pr=subPrice(k.grade||'p1',t);
      return `<button class="subrow ${s.c}" data-k="${k.id}" data-t="${t}"${on&&pr.fin?'':' disabled'}><span class="st">${tn}</span><em>${s.t}</em>${pr.fin?`<strong>${num(pr.fin)} جنيه</strong>`:''}</button>`; }).join('')}</div>`).join('')}</div></div>`,
    p=>$$('.subrow',p).forEach(b=>b.addEventListener('click',()=>subBuy(b.dataset.k,b.dataset.t)))); }); }
function subBuy(kidId,t){ const k=kids().find(x=>x.id===kidId); if(!k) return; const key=subKey(k,t), r=subRec(k,t), pr=subPrice(k.grade||'p1',t), S=ESET.subs||{}, tn=(SUBT.find(x=>x[0]===t)||[])[1];
  const live=r&&(!r.until||Date.now()<r.until)&&(r.st==='active'||r.st==='pending');
  if(live&&r.st==='active'||live&&r.st==='pending'&&Date.now()>=(r.trial||0)){   // paid, or the receipt is waiting for the admin: only the state
    const s=subStat(r,t); return coinPop(`<h2 class="outline">${wlEsc(k.name)} · ${tn}</h2><p class="msg-text">${s.t}</p><button class="pill green" data-ok>تمام</button>`,p=>$('[data-ok]',p).addEventListener('click',subsPage)); }
  const link=S.link||'', who=S.name||'', pro=ESET.promoOn!==false&&((ESET.promos&&ESET.promos.length)||API());
  coinPop(`<h2 class="outline">${wlEsc(k.name)} · ${tn}</h2>
    <div class="subscroll"><p class="subprice">${pr.disc?`<s>${num(pr.price)}</s> `:''}<b>${num(pr.fin)}</b> جنيه</p>
    <ol class="substeps"><li>ادفعي على إنستا باي${who?` لحساب <b>${wlEsc(who)}</b>`:''}.${link?`<br><a class="pill yellow subpay" href="${wlEsc(link)}" target="_blank" rel="noopener">افتحي إنستا باي</a>`:''}</li>
      <li>اكتبي رقم العملية وارفعي صورة الإيصال.</li></ol>
    <form class="subf" autocomplete="off" novalidate>
      <label><span>رقم العملية</span><input name="ref" dir="ltr" inputmode="text" maxlength="40" required></label>
      <label class="subfile"><span>صورة الإيصال</span><input type="file" name="img" accept="image/*" required></label>
      <p class="subimg" hidden></p><p class="wl-err" hidden></p>
      <button class="pill green wl-big" type="submit"><span class="wl-ar">ابعتي الإيصال</span></button></form>
    <p class="subnote">بعد الإرسال الدروس بتتفتح ٢٤ ساعة لحد ما نتأكد من الدفع.<br>الاشتراك لحد ${subDate(subEnd())}، وبعدها الدروس بتتقفل والتقدم بيبدأ من الأول.<br>مفيش استرجاع للفلوس.</p>${pro?promoLine():''}</div>`,
    p=>{ promoWire(p,()=>{ subsPage(); });
      const f=$('.subf',p), er=$('.wl-err',p), im=$('.subimg',p); let pic='';
      const say=m=>{ er.textContent=m; er.hidden=false; };
      f.img.addEventListener('change',async()=>{ pic=''; im.hidden=true; const file=f.img.files[0]; if(!file) return;
        try{ pic=await subShrink(file); im.textContent='الصورة جاهزة ('+num(Math.round(pic.length*.75/1024))+' ك.ب)'; im.hidden=false; er.hidden=true; }catch(e){ say('الصورة دي مش بتفتح. جربي صورة تانية'); } });
      f.addEventListener('submit',async e=>{ e.preventDefault(); const ref=f.ref.value.trim();
        if(!ref) return wlBad(f,'ref','اكتبي رقم العملية'); if(!pic) return wlBad(f,'img','ارفعي صورة الإيصال');
        const go=$('button[type=submit]',f); go.disabled=true; const t0=Date.now();
        let rec; const has=subRec(k,t);
        if(API()&&typeof sySession==='function'&&sySession()){ const x=await syCall('/subs',{child:k.id,term:key,ref,receipt:pic});
          if(!x){ go.disabled=false; return say('مفيش إنترنت دلوقتي'); }
          if(!x.j.ok){ go.disabled=false; return say({'already':'الاشتراك ده شغال','pending':'الإيصال متبعت وبنراجعه','no-price':'السعر لسه متحددش','big':'الصورة كبيرة','bad-receipt':'الصورة مش مظبوطة','off':'الاشتراك لسه مش شغال'}[x.j.error]||'حصلت مشكلة. جربي تاني'); }
          rec={st:'pending',at:x.j.at,trial:x.j.trial,until:x.j.until,price:pr.fin,ref,seen:true}; }
        else rec={st:'pending',at:t0,trial:has&&has.trialUsed?0:t0+864e5,until:subEnd(t0),price:pr.fin,ref,seen:true,trialUsed:true,local:true};   // no server: kept on this device (admin cannot see it)
        subSave(k.id,key,rec); coinClose(); if(typeof chime==='function') chime(3);
        coinPop(`<h2 class="outline">وصلنا الإيصال</h2><p class="msg-text">دروس <b>${wlEsc(k.name)}</b> مفتوحة ٢٤ ساعة لحد ما نتأكد من الدفع.</p><button class="pill green" data-ok>تمام</button>`,
          p2=>$('[data-ok]',p2).addEventListener('click',()=>{ coinClose(); if(typeof drawSubjects==='function'&&!$('#subjects').hidden) drawSubjects(); })); }); }); }
