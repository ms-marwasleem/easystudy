/* ADMIN DASHBOARD (Marwa 2026-11-05, docs/coins-and-admin.md). Edits ONE settings object (same shape as data/settings.json):
   coins (on/off, prices, share types), access.free (the free policy for a new child), items (state + price per subject / unit / lesson).
   Save = this device (localStorage es.settings, the app reads it); Download = the file for data/settings.json.
   Accounts + stats read this device (es.account, es.kids, es.wallet.*) until the server API exists (GET /api/admin/accounts, /stats). */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const get=u=>fetch(u,{cache:'no-store'}).then(r=>{ if(!r.ok) throw new Error(u); return r.json(); });
const lsGet=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v; }catch(e){ return d; } };
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
let S=null, FILE=null, COURSE=null, dirty=false;
const toast=t=>{ const o=$('#toast'); o.textContent=t; o.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>o.hidden=true,1800); };
const mark=()=>{ dirty=true; $('#save').textContent='حفظ •'; };

async function boot(){
  FILE=await get('data/settings.json').catch(()=>({coins:{shares:[]},access:{free:{mode:'first',count:3}},items:{}}));
  S=lsGet('es.settings',null)||JSON.parse(JSON.stringify(FILE));
  S.coins=S.coins||{shares:[]}; S.access=S.access||{}; S.access.free=S.access.free||{mode:'first',count:3,list:[]}; S.items=S.items||{};
  S.access.free.list=S.access.free.list||[]; S.coins.referral=S.coins.referral||{on:false,coins:15};
  COURSE=await get('data/course.json');
  await Promise.all(COURSE.subjects.filter(s=>s.file).map(async s=>{ const d=await get(s.file).catch(()=>null); if(!d) return;
    s.units=d.units||[]; s.lessons=(d.lessons||[]).map(l=>({...l,id:`${s.id}-${l.folder}`,built:!!l.title})); }));
  $('#where').textContent=lsGet('es.settings',null)?'الإعدادات المعروضة: المحفوظة على الجهاز ده (لسه مش في الملف). اضغطي "تنزيل" عشان تبقى للكل.':'الإعدادات المعروضة: من ملف data/settings.json.';
  S.promos=S.promos||[];
  drawSettings(); drawTree(); drawPromos(); drawAccounts(); drawStats();
  if(S.api){ const [ac,st]=await Promise.all([api('/admin/accounts'),api('/admin/stats')]); if(ac&&ac.accounts){ SRV.accounts=ac.accounts; drawAccounts(); } if(st&&st.hist){ SRV.stats=st; drawStats(); }
    if(st&&st.promoUses){ SRV.promoUses=st.promoUses; drawPromos(); }
    $('#where').textContent+=ac?' الحسابات والإحصائيات من السيرفر.':' السيرفر مش متاح دلوقتي، المعروض من الجهاز ده بس.'; }
}

/* ---------- settings page ---------- */
const NUMS=['lessonCost','unitCost','startCoins','dailyCap'];
function drawSettings(){
  const C=S.coins;
  $('#c-enabled').checked=!!C.enabled; $('#c-parentGate').checked=C.parentGate!==false;
  NUMS.forEach(k=>$('#c-'+k).value=C[k]!=null?C[k]:'');
  $('#c-shareText').value=C.shareText||''; $('#c-shareUrl').value=C.shareUrl||'';
  $('#r-on').checked=!!C.referral.on; $('#r-coins').value=C.referral.coins||0;
  $('#f-mode').value=S.access.free.mode||'first'; $('#f-count').value=S.access.free.count!=null?S.access.free.count:3;
  drawShares(); freeHint();
}
function drawShares(){
  const box=$('#shares'); box.innerHTML=`<div class="row shr h"><span>تشغيل</span><span>الاسم</span><span>كريدتس</span><span>كل (ساعة)</span><span></span></div>`+
    S.coins.shares.map((t,i)=>`<div class="row shr" data-i="${i}"><label class="sw"><input type="checkbox" data-k="on"${t.on?' checked':''}><span></span></label>
      <input type="text" data-k="ar" value="${esc(t.ar)}" aria-label="الاسم"><input type="number" min="0" data-k="coins" value="${t.coins||0}" aria-label="كريدتس">
      <input type="number" min="0" data-k="cooldownH" value="${t.cooldownH||0}" aria-label="كل كام ساعة"><button class="x" aria-label="حذف">×</button></div>`).join('');
  $$('.shr[data-i]',box).forEach(r=>{ const t=S.coins.shares[+r.dataset.i];
    $$('[data-k]',r).forEach(i=>i.addEventListener('input',()=>{ const k=i.dataset.k; t[k]=k==='on'?i.checked:k==='ar'?i.value:+i.value; mark(); }));
    $('.x',r).addEventListener('click',()=>{ S.coins.shares.splice(+r.dataset.i,1); mark(); drawShares(); }); });
}
$('#addShare').addEventListener('click',()=>{ S.coins.shares.push({id:'share-'+Date.now().toString(36),ar:'نوع جديد',on:true,coins:5,cooldownH:24}); mark(); drawShares(); });
$('#c-enabled').addEventListener('change',e=>{ S.coins.enabled=e.target.checked; mark(); });
$('#c-parentGate').addEventListener('change',e=>{ S.coins.parentGate=e.target.checked; mark(); });
NUMS.forEach(k=>$('#c-'+k).addEventListener('input',e=>{ S.coins[k]=+e.target.value||0; mark(); }));
$('#c-shareText').addEventListener('input',e=>{ S.coins.shareText=e.target.value; mark(); });
$('#c-shareUrl').addEventListener('input',e=>{ S.coins.shareUrl=e.target.value; mark(); });
$('#r-on').addEventListener('change',e=>{ S.coins.referral.on=e.target.checked; mark(); });
$('#r-coins').addEventListener('input',e=>{ S.coins.referral.coins=+e.target.value||0; mark(); });
$('#f-mode').addEventListener('change',e=>{ S.access.free.mode=e.target.value; mark(); freeHint(); drawTree(); });
$('#f-count').addEventListener('input',e=>{ S.access.free.count=+e.target.value||0; mark(); freeHint(); });
$('#f-per').addEventListener('change',e=>{ S.access.free.perSubject=e.target.checked; mark(); freeHint(); });
function freeHint(){ const F=S.access.free, n=ar(F.count||0), pick=/^pick/.test(F.mode);
  $('#f-per').checked=!!F.perSubject; $('#f-per-row').hidden=!pick;
  if(pick&&F.perSubject){ $('#f-hint').textContent=F.mode==='pick'?`الطفل يختار ${n} درس مجانًا من كل مادة، بالضغط على أي درس مقفول فيها.`:`الطفل يختار ${n} وحدة كاملة مجانًا من كل مادة.`; if(!S.coins.enabled) $('#f-hint').textContent+=' (الكريدتس مقفولة دلوقتي، فكل الدروس الجاهزة مفتوحة إلا اللي تقفليه بنفسك.)'; return; }
  $('#f-hint').textContent={first:`أول ${n} دروس في كل مادة مفتوحة، والباقي يتفتح بالكريدتس.`,firstUnit:`أول ${n} وحدات في كل مادة مفتوحة كاملة.`,
    pick:`الطفل يختار ${n} دروس مجانًا من أي مادة، بالضغط على أي درس مقفول.`,pickUnit:`الطفل يختار ${n} وحدات كاملة مجانًا.`,
    list:`المفتوح بس هو اللي تعلّمي عليه "مجاني" في صفحة الدروس (${ar(F.list.length)} دلوقتي). العدد مش مستخدم هنا.`}[F.mode]||'';
  if(!S.coins.enabled) $('#f-hint').textContent+=' (الكريدتس مقفولة دلوقتي، فكل الدروس الجاهزة مفتوحة إلا اللي تقفليه بنفسك.)'; }

/* ---------- lessons page: a state + price per subject / unit / lesson ---------- */
const STATES=[['','تلقائي'],['open','مفتوح'],['soon','قريبًا'],['locked','مقفول']];
function row(cls,id,name,built,priceDefault){ const it=S.items[id]||{}, isList=S.access.free.mode==='list'&&cls!=='subj';
  return `<div class="it ${cls}" data-id="${id}"><i class="dot${built?' b':''}"></i><span class="nm" title="${esc(name)}">${esc(name)}</span>
    <select class="${it.st||''}" aria-label="الحالة">${STATES.map(([v,l])=>`<option value="${v}"${(it.st||'')===v?' selected':''}>${l}</option>`).join('')}</select>
    <input type="number" min="0" class="pr" placeholder="${priceDefault}" value="${it.coins!=null?it.coins:''}" aria-label="السعر" title="سعر خاص (فاضي = السعر العام)">
    <label class="fr"${isList?'':' hidden'}><input type="checkbox" class="fl"${S.access.free.list.includes(id)?' checked':''}> مجاني</label></div>`; }
function drawTree(){
  const sel=$('#l-subj'), cur=sel.value; sel.innerHTML='<option value="">كل المواد</option>'+COURSE.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join(''); sel.value=cur;
  const C=S.coins, lc=C.lessonCost||0, uc=C.unitCost||0;
  $('#tree').innerHTML=COURSE.subjects.filter(s=>!sel.value||s.id===sel.value).map(s=>{
    let h=row('subj','s:'+s.id,s.name,!!s.lessons,'');
    (s.units||[]).forEach(u=>{ const ls=(s.lessons||[]).filter(l=>l.unit===u.unit&&!l.hidden);
      h+=row('unit',`u:${s.id}:${u.unit}`,u.label||`الوحدة ${ar(u.unit)}`,ls.some(l=>l.built),uc);
      ls.forEach(l=>h+=row('les','l:'+l.id,`${ar(l.lesson)}. ${l.title||l.planned||'—'}`,l.built,lc)); });
    return h; }).join('');
  $$('#tree .it').forEach(r=>{ const id=r.dataset.id, put=()=>{ const it=S.items[id]||{}; if(!it.st) delete it.st; if(it.coins==null) delete it.coins; if(Object.keys(it).length) S.items[id]=it; else delete S.items[id]; mark(); };
    const s=$('select',r); s.addEventListener('change',()=>{ (S.items[id]=S.items[id]||{}).st=s.value||undefined; s.className=s.value; put(); });
    $('.pr',r).addEventListener('input',e=>{ (S.items[id]=S.items[id]||{}).coins=e.target.value===''?undefined:+e.target.value; put(); });
    const f=$('.fl',r); if(f) f.addEventListener('change',()=>{ const L=S.access.free.list, k=L.indexOf(id); if(f.checked&&k<0) L.push(id); if(!f.checked&&k>=0) L.splice(k,1); mark(); freeHint(); }); });
}
$('#l-subj').addEventListener('change',drawTree);

/* ---------- promo codes (Marwa 2026-11-05): S.promos = [{code, what, target, uses, max, until, on, note}] — js/coins.js PROMO CODES ---------- */
const WHAT=[['lesson','درس واحد'],['unit','وحدة كاملة'],['subject','مادة كاملة'],['all','كل المواد']];
const promoNorm=c=>String(c||'').toUpperCase().replace(/[\s\-_]/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const newCode=()=>{ const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789', b=crypto.getRandomValues(new Uint8Array(8)); return [...b].map(x=>a[x%a.length]).join(''); };
function targets(what,cur){   // the <option>s for "what it opens"
  if(what==='all') return '<option value="">—</option>';
  const S2=COURSE.subjects.filter(s=>s.lessons);
  if(what==='subject') return S2.map(s=>`<option value="${s.id}"${cur===s.id?' selected':''}>${esc(s.name)}</option>`).join('');
  return S2.map(s=>`<optgroup label="${esc(s.name)}">`+(what==='unit'
    ?(s.units||[]).map(u=>{ const id=`u:${s.id}:${u.unit}`; return `<option value="${id}"${cur===id?' selected':''}>${esc(u.label||'الوحدة '+ar(u.unit))}</option>`; }).join('')
    :(s.lessons||[]).filter(l=>!l.hidden&&l.built).map(l=>{ const id='l:'+l.id; return `<option value="${id}"${cur===id?' selected':''}>${ar(l.unit)}-${ar(l.lesson)} ${esc(l.title)}</option>`; }).join(''))+'</optgroup>').join(''); }
const firstTarget=what=>{ const m=targets(what,'').match(/<option value="([^"]*)"/); return m?m[1]:''; };
function promoUses(c){ if(SRV.promoUses) return (SRV.promoUses.find(x=>x.code===c)||{}).n||0; return lsGet('es.promoUses',{})[c]||0; }
function drawPromos(){ const box=$('#promos'), P=S.promos;
  $('#promoWhere').textContent=S.api?(SRV.promoUses?'عدد مرات الاستخدام من السيرفر (لكل المستخدمين).':'السيرفر مش متاح: عدد الاستخدام من الجهاز ده بس.')
    :'دلوقتي (من غير سيرفر) "مرة واحدة" يعني مرة على كل جهاز، وعدد الاستخدام من الجهاز ده بس. لما السيرفر يشتغل هيتحسب لكل المستخدمين.';
  if(!P.length){ box.innerHTML='<p class="empty">مفيش أكواد لسه.</p>'; return; }
  box.innerHTML=P.map((p,i)=>{ const c=promoNorm(p.code), dup=P.findIndex(x=>promoNorm(x.code)===c)!==i, n=promoUses(c), old=p.until&&new Date().toISOString().slice(0,10)>p.until;
    return `<div class="pr-card${p.on===false||old?' off':''}" data-i="${i}">
      <div class="pr-top"><label class="sw" title="شغال"><input type="checkbox" data-k="on"${p.on!==false?' checked':''}><span></span></label>
        <input type="text" data-k="code" class="pr-code${dup||!c?' bad':''}" dir="ltr" value="${esc(p.code)}" aria-label="الكود" maxlength="32">
        <span class="pr-used">${old?'<b class="pr-old">انتهى</b> · ':''}اتستخدم ${ar(n)}${p.uses==='many'&&+p.max>0?' من '+ar(p.max):p.uses!=='many'?' من ١':''}</span>
        <button class="x" aria-label="حذف">×</button></div>
      ${dup?'<p class="pr-warn">الكود ده متكرر، غيّريه.</p>':''}
      <div class="grid pr-grid">
        <label>بيفتح <select data-k="what">${WHAT.map(([v,l])=>`<option value="${v}"${p.what===v?' selected':''}>${l}</option>`).join('')}</select></label>
        <label${p.what==='all'?' hidden':''}>${{lesson:'الدرس',unit:'الوحدة',subject:'المادة'}[p.what]||''} <select data-k="target">${targets(p.what,p.target)}</select></label>
        <label>الاستخدام <select data-k="uses"><option value="once"${p.uses!=='many'?' selected':''}>مرة واحدة بس</option><option value="many"${p.uses==='many'?' selected':''}>أكتر من مرة (كل طفل مرة)</option></select></label>
        <label${p.uses==='many'?'':' hidden'}>أقصى عدد <small>(فاضي = من غير حد)</small><input type="number" min="0" data-k="max" value="${+p.max>0?p.max:''}"></label>
        <label>آخر يوم <small>(فاضي = دايمًا)</small><input type="date" data-k="until" value="${esc(p.until||'')}"></label>
        <label>ملاحظة <input type="text" data-k="note" value="${esc(p.note||'')}" placeholder="لمين الكود ده"></label>
      </div></div>`; }).join('');
  $$('.pr-card',box).forEach(r=>{ const p=S.promos[+r.dataset.i];
    $$('[data-k]',r).forEach(inp=>inp.addEventListener(inp.tagName==='SELECT'||inp.type==='checkbox'||inp.type==='date'?'change':'input',()=>{ const k=inp.dataset.k;
      p[k]=k==='on'?inp.checked:k==='max'?(+inp.value||0):k==='code'?inp.value.toUpperCase().replace(/\s/g,''):inp.value;
      if(k==='code'&&inp.value!==p.code){ const at=inp.selectionStart; inp.value=p.code; try{ inp.setSelectionRange(at,at); }catch(e){} }
      if(k==='what') p.target=p.what==='all'?'':firstTarget(p.what);
      mark(); if(['what','uses','on','until'].includes(k)) drawPromos(); else if(k==='code'){ const c=promoNorm(p.code), d=S.promos.filter(x=>promoNorm(x.code)===c).length>1; inp.classList.toggle('bad',d||!c); } }));
    $('.x',r).addEventListener('click',()=>{ if(!confirm('تمسحي الكود '+p.code+'؟')) return; S.promos.splice(+r.dataset.i,1); mark(); drawPromos(); }); });
}
$('#addPromo').addEventListener('click',()=>{ S.promos.unshift({code:newCode(),what:'lesson',target:firstTarget('lesson'),uses:'once',max:0,until:'',on:true,note:''}); mark(); drawPromos(); const c=$('#promos .pr-code'); if(c){ c.focus(); c.select(); } });

/* ---------- accounts + stats (this device until the server) ---------- */
const fmt=t=>{ try{ return new Date(t).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}); }catch(e){ return t; } };
// with a server (settings "api"): the real lists come from GET api/admin/accounts and api/admin/stats (same shapes as the local ones below)
const api=(path,body)=>S.api?fetch(S.api+path,{method:body?'PUT':'GET',credentials:'include',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}).then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(null);
let SRV={accounts:null,stats:null,promoUses:null};
function accounts(){ if(SRV.accounts) return SRV.accounts; const a=lsGet('es.account',null); if(!a) return []; return [{...a,kids:lsGet('es.kids',[])}]; }
function drawAccounts(){ const A=accounts(), box=$('#accts');
  if(!A.length){ box.innerHTML='<p class="empty">مفيش حسابات مسجلة على الجهاز ده لسه.</p>'; return; }
  box.innerHTML=`<div class="row acr h"><span>ولي الأمر</span><span>الإيميل</span><span>التليفون</span><span>الأطفال</span><span>التسجيل</span></div>`+
    A.map(a=>`<div class="row acr"><b>${esc(a.name)}</b><span dir="ltr">${esc(a.email)}</span><span dir="ltr">${esc(a.phone||'—')}</span><span>${a.kids.map(k=>esc(k.name)).join('، ')||'—'}</span><span>${a.created?fmt(a.created):'—'}</span></div>`).join(''); }
function wallets(){ const out=[]; try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k.startsWith('es.wallet.')) out.push(lsGet(k,{bal:0,hist:[]})); } }catch(e){} return out; }
const KIND={promo:'برومو كود',share:'مشاركة',gift:'هدية',referral:'تسجيل من رابطه','unlock-lesson':'فتح درس','unlock-unit':'فتح وحدة'};
function drawStats(){
  const A=accounts(), W=wallets(), H=SRV.stats?SRV.stats.hist:W.flatMap(w=>w.hist||[]).sort((a,b)=>b.at-a.at);
  const earned=H.filter(h=>h.n>0).reduce((a,h)=>a+h.n,0), spent=-H.filter(h=>h.n<0).reduce((a,h)=>a+h.n,0), shares=H.filter(h=>h.k==='share');
  const today=new Date().toDateString(), newToday=A.filter(a=>a.created&&new Date(a.created).toDateString()===today).length;
  const K=[['حسابات أولياء الأمور',A.length],['حسابات اليوم',newToday],['الأطفال',A.reduce((a,x)=>a+x.kids.length,0)],['المشاركات',shares.length],
    ['كريدتس اتكسبت',earned],['كريدتس اتصرفت',spent],['دروس اتفتحت',H.filter(h=>h.k==='unlock-lesson').length],['وحدات اتفتحت',H.filter(h=>h.k==='unlock-unit').length]];
  $('#kpis').innerHTML=K.map(([l,v])=>`<div class="kpi"><b>${ar(v)}</b><span>${l}</span></div>`).join('');
  const by={}; shares.forEach(h=>by[h.t]=(by[h.t]||0)+1); const mx=Math.max(1,...Object.values(by));
  $('#byShare').innerHTML=(S.coins.shares||[]).map(t=>`<div class="bar"><span>${esc(t.ar)}</span><i style="width:${((by[t.id]||0)/mx*100).toFixed(0)}%"></i><em>${ar(by[t.id]||0)}</em></div>`).join('')||'<p class="empty">مفيش أنواع مشاركة.</p>';
  const name=id=>{ const t=(S.coins.shares||[]).find(x=>x.id===id); return t?t.ar:id||''; };
  $('#hist').innerHTML=H.length?`<div class="row hr h"><span>الوقت</span><span>النوع</span><span>التفاصيل</span><span>كريدتس</span></div>`+H.slice(0,40).map(h=>`<div class="row hr"><span>${fmt(h.at)}</span><span>${KIND[h.k]||h.k}</span><span>${esc(h.k==='share'?name(h.t):h.k==='promo'?(h.code?h.code+' · ':'')+(h.id||''):h.id||'')}</span><b dir="ltr">${h.n>0?'+':''}${h.n}</b></div>`).join(''):'<p class="empty">مفيش حركات كريدتس على الجهاز ده لسه.</p>';
}

/* ---------- tabs + save / download / reset ---------- */
$$('#tabs button').forEach(b=>b.addEventListener('click',()=>{ $$('#tabs button').forEach(x=>x.classList.toggle('on',x===b)); $$('.page').forEach(p=>p.hidden=p.id!=='p-'+b.dataset.p); if(b.dataset.p==='stats') drawStats(); }));
$('#save').addEventListener('click',()=>{ try{ localStorage.setItem('es.settings',JSON.stringify(S)); dirty=false; $('#save').textContent='حفظ'; toast('اتحفظ على الجهاز ده. افتحي التطبيق تشوفيه.'); if(S.api) api('/admin/settings',S).then(r=>toast(r?'اتحفظ على السيرفر كمان، لكل المستخدمين.':'السيرفر مش متاح، اتحفظ على الجهاز بس.')); $('#where').textContent='الإعدادات المعروضة: المحفوظة على الجهاز ده (لسه مش في الملف). اضغطي "تنزيل" عشان تبقى للكل.'; }catch(e){ toast('الحفظ مش متاح هنا'); } });
$('#dl').addEventListener('click',()=>{ const out={_note:FILE&&FILE._note,...S}; const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'})); a.download='settings.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); });
$('#reset').addEventListener('click',()=>{ if(!confirm('ترجعي لإعدادات الملف وتمسحي المحفوظ على الجهاز ده؟')) return; try{ localStorage.removeItem('es.settings'); }catch(e){} S=JSON.parse(JSON.stringify(FILE)); location.reload(); });
addEventListener('beforeunload',e=>{ if(dirty){ e.preventDefault(); e.returnValue=''; } });
boot().catch(e=>{ $('#where').textContent='مش قادر يحمّل ملفات المنهج: '+e.message; });
