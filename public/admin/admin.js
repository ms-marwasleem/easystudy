/* ADMIN DASHBOARD (Marwa 2026-11-05, docs/coins-and-admin.md). Edits ONE settings object (same shape as data/settings.json):
   coins (on/off, prices, share types), access.free (the free policy for a new child), items (state + price per subject / unit / lesson).
   Save = this device (localStorage es.settings, the app reads it); Download = the file for data/settings.json.
   Accounts + stats read this device (es.account, es.kids, es.wallet.*) until the server API exists (GET /api/admin/accounts, /stats). */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const get=u=>fetch(u,{cache:'no-store'}).then(r=>{ if(!r.ok) throw new Error(u); return r.json(); });
const lsGet=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v; }catch(e){ return d; } };
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
let S=null, FILE=null, COURSE=null, GRADES=[], dirty=false;
const toast=t=>{ const o=$('#toast'); o.textContent=t; o.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>o.hidden=true,1800); };
const mark=()=>{ dirty=true; $('#save').textContent='حفظ •'; };

async function boot(){
  FILE=await get('data/settings.json').catch(()=>({coins:{},access:{free:{mode:'first',count:1}},items:{}}));
  S=lsGet('es.settings',null)||JSON.parse(JSON.stringify(FILE));
  S.coins=S.coins||{}; S.access=S.access||{}; S.access.free=S.access.free||{}; S.items=S.items||{};
  const F=S.access.free; F.mode='first'; delete F.perSubject; if(F.count==null||F.count>5) F.count=1; F.per=F.per||{}; F.list=F.list||[];   // free = first lessons of unit 1 per subject
  S.coins.referral=S.coins.referral||{on:false,coins:15}; if(S.coins.shareCoins==null) S.coins.shareCoins=1; if(!S.coins.dailyCap||S.coins.dailyCap>20) S.coins.dailyCap=20; if(!S.coins.lessonCost) S.coins.lessonCost=3;
  S.subs=S.subs||{}; S.subs.prices=S.subs.prices||{}; S.currOff=S.currOff||{}; S.promos=S.promos||[]; if(S.promoOn==null) S.promoOn=true;
  Object.keys(S.items).forEach(k=>{ if(S.items[k].st!=='soon') delete S.items[k]; else S.items[k]={st:'soon'}; });   // old open/locked/price options removed: only "soon" is kept
  COURSE=await get('data/course.json');
  const CJ=await get('data/curriculum.json').catch(()=>({grades:[],types:[]})); GRADES=CJ.grades.filter(g=>g.open!==false); CTYPES=CJ.types||[];
  await Promise.all(COURSE.subjects.filter(s=>s.file).map(async s=>{ const d=await get(s.file).catch(()=>null); if(!d) return;
    s.units=d.units||[]; s.lessons=(d.lessons||[]).map(l=>({...l,id:`${s.id}-${l.folder}`,built:!!l.title})); }));
  $('#where').textContent=lsGet('es.settings',null)?'الإعدادات المعروضة: المحفوظة على الجهاز ده (لسه مش في الملف). اضغطي "تنزيل" عشان تبقى للكل.':'الإعدادات المعروضة: من ملف data/settings.json.';
  drawSettings(); drawTree(); drawPromos(); drawUsers(); drawStats(); drawReports();
  if(S.api){ const [ac,st]=await Promise.all([api('/admin/accounts'),api('/admin/stats')]); if(ac&&ac.accounts){ SRV.accounts=ac.accounts; drawUsers(); loadSubs(); } if(st&&st.hist){ SRV.stats=st; drawStats(); }
    if(st&&st.promoUses){ SRV.promoUses=st.promoUses; drawPromos(); }
    loadReports();
    $('#where').textContent+=ac?' المستخدمين والإحصائيات من السيرفر.':' السيرفر مش متاح دلوقتي، المعروض من الجهاز ده بس.'; }
}

/* ---------- settings page ---------- */
let CTYPES=[];
const NUMS=['shareCoins','lessonCost','dailyCap'];
const TERMS=[['t1','الترم الأول'],['t2','الترم الثاني']];
function drawSettings(){ $('#u-grade').innerHTML=GRADES.map(g=>`<option value="${esc(g.id)}">${esc(g.ar)}</option>`).join('');
  const C=S.coins, B=S.subs;
  $('#c-enabled').checked=!!C.enabled; $('#c-parentGate').checked=C.parentGate!==false;
  NUMS.forEach(k=>$('#c-'+k).value=C[k]!=null?C[k]:'');
  $('#c-wa').value=S.whatsapp||''; $('#s-name').value=B.name||''; $('#s-link').value=B.link||'';
  $('#c-shareText').value=C.shareText||''; $('#c-shareUrl').value=C.shareUrl||'';
  $('#r-on').checked=!!C.referral.on; $('#r-coins').value=C.referral.coins||0;
  $('#s-on').checked=!!B.on; $('#p-on').checked=S.promoOn!==false;
  $('#f-count').value=S.access.free.count; drawPrices(); drawFreePer(); drawCurr();
}
// curricula on/off (S.currOff[id]=true = closed in the signup / student step)
function drawCurr(){ const box=$('#curr-on'); box.innerHTML=CTYPES.map(t=>`<div class="row" data-t="${t.id}"><b class="nm">${esc(t.id==='private'?'لغات':t.ar)}</b><label class="sw"><input type="checkbox"${S.currOff[t.id]?'':' checked'}><span></span> متاح</label></div>`).join('');
  $$('.row',box).forEach(r=>$('input',r).addEventListener('change',e=>{ if(e.target.checked) delete S.currOff[r.dataset.t]; else S.currOff[r.dataset.t]=true; mark(); })); }
function drawPrices(){ const P=S.subs.prices, box=$('#prices'), rows=[];
  GRADES.forEach(g=>TERMS.forEach(([t,tn])=>{ const k=g.id+':'+t, p=P[k]||{}, fin=p.discOn&&+p.disc>0?+p.disc:(+p.price||0);
    rows.push(`<div class="row prc" data-k="${k}"><b class="nm">${esc(g.ar)} — ${tn}</b>
      <label>السعر <input type="number" min="0" data-f="price" value="${p.price!=null?p.price:''}" placeholder="500"></label>
      <label class="sw"><input type="checkbox" data-f="discOn"${p.discOn?' checked':''}><span></span> خصم</label>
      <label>بعد الخصم <input type="number" min="0" data-f="disc" value="${p.disc!=null?p.disc:''}" placeholder="300"${p.discOn?'':' disabled'}></label>
      <em class="fin">${fin?'يدفع '+ar(fin)+' جنيه':'—'}</em></div>`); }));
  box.innerHTML=rows.join('')||'<p class="empty">مفيش سنوات دراسية في ملف المنهج.</p>';
  $$('.prc',box).forEach(r=>{ const k=r.dataset.k; $$('[data-f]',r).forEach(i=>i.addEventListener(i.type==='checkbox'?'change':'input',()=>{ const f=i.dataset.f, p=P[k]=P[k]||{};
    p[f]=f==='discOn'?i.checked:(i.value===''?undefined:+i.value); mark(); if(f==='discOn'){ drawPrices(); return; }
    const q=P[k], fin=q.discOn&&+q.disc>0?+q.disc:(+q.price||0); $('.fin',r).textContent=fin?'يدفع '+ar(fin)+' جنيه':'—'; })); });
}
function drawFreePer(){ const per=S.access.free.per;
  $('#free-per').innerHTML=COURSE.subjects.filter(s=>s.lessons).map(s=>`<div class="row frp" data-s="${s.id}"><b class="nm">${esc(s.name)}</b><input type="number" min="0" value="${per[s.id]!=null?per[s.id]:''}" placeholder="${S.access.free.count}" aria-label="${esc(s.name)}"></div>`).join('');
  $$('#free-per .frp').forEach(r=>$('input',r).addEventListener('input',e=>{ const v=e.target.value; if(v==='') delete per[r.dataset.s]; else per[r.dataset.s]=+v; mark(); })); }
$('#c-enabled').addEventListener('change',e=>{ S.coins.enabled=e.target.checked; mark(); });
$('#c-parentGate').addEventListener('change',e=>{ S.coins.parentGate=e.target.checked; mark(); });
$('#s-on').addEventListener('change',e=>{ S.subs.on=e.target.checked; mark(); });
$('#p-on').addEventListener('change',e=>{ S.promoOn=e.target.checked; mark(); });
NUMS.forEach(k=>$('#c-'+k).addEventListener('input',e=>{ S.coins[k]=+e.target.value||0; mark(); }));
$('#c-wa').addEventListener('input',e=>{ S.whatsapp=e.target.value.trim(); mark(); });
$('#s-name').addEventListener('input',e=>{ S.subs.name=e.target.value; mark(); });
$('#s-link').addEventListener('input',e=>{ S.subs.link=e.target.value.trim(); mark(); });
$('#c-shareText').addEventListener('input',e=>{ S.coins.shareText=e.target.value; mark(); });
$('#c-shareUrl').addEventListener('input',e=>{ S.coins.shareUrl=e.target.value; mark(); });
$('#r-on').addEventListener('change',e=>{ S.coins.referral.on=e.target.checked; mark(); });
$('#r-coins').addEventListener('input',e=>{ S.coins.referral.coins=+e.target.value||0; mark(); });
$('#f-count').addEventListener('input',e=>{ S.access.free.count=+e.target.value||0; mark(); drawFreePer(); });

/* ---------- lessons page: tree subject > unit > lesson, multi-select, open | soon ----------
   Default: a built lesson is open, an unbuilt one is "soon". Only "soon" is stored (S.items[id]={st:'soon'}); open = no entry. */
const SEL=new Set();
const kidsOf=s=>(s.units||[]).map(u=>({u,ls:(s.lessons||[]).filter(l=>l.unit===u.unit&&!l.hidden)}));
function lessonOpen(l){ return l.built&&!(S.items['l:'+l.id]||{}).st; }
function stOf(kind,s,u,ls,l){
  if(kind==='les') return lessonOpen(l)?'open':'soon';
  const own=(S.items[kind==='subj'?'s:'+s.id:`u:${s.id}:${u.unit}`]||{}).st==='soon';
  const L=kind==='subj'?(s.lessons||[]).filter(x=>!x.hidden):ls, n=L.filter(lessonOpen).length;
  if(own||!n) return 'soon'; return n===L.length?'open':'mixed'; }
const STLBL={open:'مفتوح',soon:'قريبًا',mixed:'مختلط'};
function row(cls,id,name,built,st){ return `<div class="it ${cls}" data-id="${id}"><input type="checkbox" class="sel"${SEL.has(id)?' checked':''} aria-label="تعليم"><i class="dot${built?' b':''}"></i><span class="nm" title="${esc(name)}">${esc(name)}</span><span class="stb ${st}">${STLBL[st]}</span></div>`; }
function drawTree(){
  const sel=$('#l-subj'), cur=sel.value; sel.innerHTML='<option value="">كل المواد</option>'+COURSE.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join(''); sel.value=cur;
  $('#tree').innerHTML=COURSE.subjects.filter(s=>!sel.value||s.id===sel.value).map(s=>{
    let h=row('subj','s:'+s.id,s.name,!!s.lessons,s.lessons?stOf('subj',s):'soon');
    kidsOf(s).forEach(({u,ls})=>{ h+=row('unit',`u:${s.id}:${u.unit}`,u.label||`الوحدة ${ar(u.unit)}`,ls.some(l=>l.built),stOf('unit',s,u,ls));
      ls.forEach(l=>h+=row('les','l:'+l.id,`${ar(l.lesson)}. ${l.title||l.planned||'—'}`,l.built,stOf('les',s,u,ls,l))); });
    return h; }).join('');
  $$('#tree .it').forEach(r=>$('.sel',r).addEventListener('change',e=>{ const id=r.dataset.id, on=e.target.checked, rows=$$('#tree .it'), i=rows.indexOf(r), cls=r.classList.contains('subj')?'subj':r.classList.contains('unit')?'unit':'les';
    const set=(x,v)=>{ v?SEL.add(x.dataset.id):SEL.delete(x.dataset.id); $('.sel',x).checked=v; }; set(r,on);
    if(cls!=='les') for(let k=i+1;k<rows.length;k++){ const c=rows[k].classList; if(c.contains('subj')||(cls==='unit'&&c.contains('unit'))) break; set(rows[k],on); }
    bulkInfo(); }));
  bulkInfo();
}
function bulkInfo(){ const n=SEL.size; $('#bulk-n').textContent=n?'معلّم '+ar(n):'مفيش حاجة معلّمة'; $$('#bulk button').forEach(b=>b.disabled=!n); }
$$('#bulk button').forEach(b=>b.addEventListener('click',()=>{ const st=b.dataset.st;
  SEL.forEach(id=>{ if(st==='soon') S.items[id]={st:'soon'}; else delete S.items[id]; });
  SEL.clear(); mark(); drawTree(); toast(st==='soon'?'اتحطت "قريبًا"':st==='open'?'اتفتحت (اللي جاهز بس)':'اتلغى التعليم'); }));
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
const tokGet=()=>{ try{ return localStorage.getItem('es.adminToken')||''; }catch(e){ return ''; } };
const hdr=()=>{ const t=tokGet(), h={'Content-Type':'application/json'}; if(t) h.Authorization='Bearer '+t; return h; }; // no-domain admin: ADMIN_TOKEN as Bearer
const api=(path,body)=>S.api?fetch(S.api+path,{method:body?'PUT':'GET',credentials:'include',headers:hdr(),body:body?JSON.stringify(body):undefined}).then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(null);
let SRV={subs:null,accounts:null,stats:null,promoUses:null,reports:null};
function accounts(){ if(SRV.accounts) return SRV.accounts; const a=lsGet('es.account',null); if(!a) return []; return [{...a,kids:lsGet('es.kids',[])}]; }
const subRow=(kid,t)=>(SRV.subs||[]).find(x=>x.child===kid&&x.term.split(':')[1]===t);
function drawUsers(){ const A=accounts(), box=$('#users'), q=$('#u-q').value.trim().toLowerCase(), srv=!!SRV.accounts;
  $('#u-where').textContent=srv?'من السيرفر.':'دلوقتي بيظهر الحساب اللي على الجهاز ده بس. لما السيرفر يشتغل هتظهر كل الحسابات هنا بنفس الشكل، وأزرار الاشتراك وإضافة مستخدم بتشتغل.';
  const L=A.filter(a=>!q||[a.email,a.phone,...(a.kids||[]).map(k=>k.name)].join(' ').toLowerCase().includes(q)); $('#u-count').textContent=ar(L.length)+' ولي أمر';
  $('#u-add').disabled=!srv; $('#u-add').title=srv?'':'السيرفر مش شغال';
  if(!L.length){ box.innerHTML='<p class="empty">'+(A.length?'مفيش نتيجة.':'مفيش حسابات مسجلة لسه.')+'</p>'; return; }
  const dis=srv?'':' disabled title="السيرفر مش شغال"';
  box.innerHTML=L.map(a=>`<div class="usr"><div class="usr-top"><b dir="ltr">${esc(a.email&&!/@phone\.local$/.test(a.email)?a.email:'—')}</b><span dir="ltr">${esc(a.phone||'')}</span><span class="rep-at">${a.created?fmt(a.created):''}</span></div>
    ${(a.kids||[]).length?a.kids.map(k=>`<div class="kid kidh"><span class="nm">${esc(k.name)}${k.school?' · '+esc(k.school):''}</span></div>`+['t1','t2'].map(t=>{ const r=subRow(k.id,t), live=r&&r.st==='active'&&r.until>Date.now(), g=k.grade||'p1';
      return `<div class="kid trm" data-k="${esc(k.id)}" data-g="${esc(g)}" data-t="${t}"><span class="nm">${TNAME[t]}</span><span class="stb ${live?'on':'none'}">${r?(live?'مفعّل لحد '+new Date(r.until).toLocaleDateString('ar-EG',{day:'numeric',month:'long'}):STN[r.st]||r.st):'بدون اشتراك'}</span>${r&&r.ref?`<span dir="ltr" class="rep-at">${esc(r.ref)}</span>`:''}
        ${r&&r.receipt?`<button data-a="rc"${dis}>الإيصال</button>`:''}${live?'':`<button data-a="grant"${dis}>${r&&r.st==='pending'?'تفعيل':'تفعيل بدون إيصال'}</button>`}${r&&(r.st==='active'||r.st==='pending')?`<button data-a="close"${dis}>إلغاء</button>`:''}<div class="sb-img"></div></div>`; }).join('')).join(''):'<p class="empty">مفيش أطفال.</p>'}</div>`).join(''); }
$('#u-q').addEventListener('input',drawUsers);
/* ---------- term subscriptions (server only; docs/subscriptions-spec.md): pending receipts first, activate / reject / close, grant with no receipt ---------- */
const termNow=()=>/2/.test((COURSE&&COURSE.term)||'')?'t2':'t1', TNAME={t1:'الترم الأول',t2:'الترم التاني'};
const STN={pending:'منتظر المراجعة',active:'مفعّل',rejected:'مرفوض',closed:'مقفول'};
const post=(path,body)=>fetch(S.api+path,{method:body?'POST':'GET',credentials:'include',headers:hdr(),body:body?JSON.stringify(body):undefined}).then(r=>r.json()).catch(()=>null);
const subOf=id=>{ const r=(SRV.subs||[]).filter(x=>x.child===id&&x.st==='active'&&x.until>Date.now()); return r.length?'مفعّل: '+r.map(x=>TNAME[x.term.split(':')[1]]).join('، '):'بدون اشتراك'; };
async function loadSubs(){ if(!S.api){ drawSubs(); return; } const r=await post('/admin/subs?st=all'); if(r&&r.subs){ SRV.subs=r.subs; } drawSubs(); drawUsers(); }
function drawSubs(){ const box=$('#subsList'), all=$('#sb-all').checked, L=(SRV.subs||[]).filter(x=>all||x.st==='pending');
  $('#sb-where').textContent=S.api?(SRV.subs?'الإيصالات المرفوعة من التطبيق. التأكيد بيفضل لحد ٣١ أغسطس، والرفض بيقفل الدروس فورًا.':'السيرفر مش متاح.'):'الاشتراكات محتاجة السيرفر.';
  box.innerHTML=L.length?L.map(x=>`<div class="usr sb" data-c="${esc(x.child)}" data-t="${esc(x.term)}"><div class="usr-top"><b>${esc(x.name)} — ${TNAME[x.term.split(':')[1]]||esc(x.term)}</b><span dir="ltr">${esc(x.email||'')} ${esc(x.phone||'')}</span><span class="rep-at">${fmt(x.at)}</span></div>
    <div class="kid"><span class="nm">${ar(x.price)} جنيه · رقم العملية <b dir="ltr">${esc(x.ref||'—')}</b></span><span class="stb ${x.st==='active'?'on':'none'}">${STN[x.st]||x.st}</span>
      ${x.receipt?'<button data-act="rc">الإيصال</button>':''}${x.st!=='active'?'<button data-act="activate">تفعيل</button>':''}${x.st==='pending'?'<button data-act="reject">رفض</button>':''}${x.st==='active'?'<button data-act="close">إلغاء</button>':''}</div><div class="sb-img"></div></div>`).join(''):'<p class="empty">مفيش اشتراكات هنا.</p>';
  $$('.sb',box).forEach(r=>$$('[data-act]',r).forEach(b=>b.addEventListener('click',async()=>{ const c=r.dataset.c, t=r.dataset.t, act=b.dataset.act;
    if(act==='rc'){ const x=await post(`/admin/sub/${c}/${t}/receipt`); $('.sb-img',r).innerHTML=x&&x.receipt?`<img src="${x.receipt}" alt="receipt" style="max-width:100%;max-height:70vh;border-radius:.5rem">`:'<p class="empty">الإيصال مش متاح.</p>'; return; }
    if(act==='reject'&&!confirm('رفض الإيصال بيقفل الدروس فورًا. متأكدة؟')) return; if(act==='close'&&!confirm('إلغاء الاشتراك؟')) return;
    const x=await post('/admin/sub',{child:c,term:t,action:act}); if(!x||!x.ok) alert('ما نفعش. جربي تاني'); loadSubs(); })));
}
$('#sb-all').addEventListener('change',drawSubs);
$('#users').addEventListener('click',async e=>{ const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; const r=b.closest('.trm'), id=r.dataset.k, term=r.dataset.g+':'+r.dataset.t, tn=TNAME[r.dataset.t], a=b.dataset.a;
  if(a==='rc'){ const x=await post(`/admin/sub/${id}/${term}/receipt`); $('.sb-img',r).innerHTML=x&&x.receipt?`<img src="${x.receipt}" alt="receipt" style="max-width:100%;max-height:70vh;border-radius:.5rem">`:'<p class="empty">الإيصال مش متاح.</p>'; return; }
  if(a==='grant'){ if(!confirm('تفعيل '+tn+' بدون مراجعة إيصال؟')) return; const x=await post('/admin/sub/grant',{child:id,term}); if(!x||!x.ok) alert('ما نفعش'); }
  else { if(!confirm('إلغاء اشتراك '+tn+'؟ الدروس هتتقفل فورًا.')) return; const x=await post('/admin/sub',{child:id,term,action:'close'}); if(!x||!x.ok) alert('مفيش اشتراك ليه أو ما نفعش'); }
  loadSubs(); });
$('#u-add').addEventListener('click',()=>{ const f=$('#u-form'); f.hidden=!f.hidden; });
$('#u-form').addEventListener('submit',async e=>{ e.preventDefault(); const f=e.target, er=$('.u-err',f), v=n=>f.elements[n].value.trim(); er.hidden=true;
  const body={email:v('email'),phone:v('phone'),kid:v('kid'),grade:v('grade'),activate:f.elements.act.checked?v('grade')+':'+v('term'):''};
  if(!body.kid){ er.textContent='اكتبي اسم الطفل'; er.hidden=false; return; } if(!body.email&&!body.phone){ er.textContent='اكتبي الإيميل أو الموبايل'; er.hidden=false; return; }
  const x=await post('/admin/user',body); if(!x||!x.ok){ er.textContent={'bad-email':'الإيميل مش مظبوط','need-contact':'اكتبي الإيميل أو الموبايل','bad-name':'اكتبي اسم الطفل'}[x&&x.error]||'ما نفعش. جربي تاني'; er.hidden=false; return; }
  f.reset(); f.hidden=true; const ac=await api('/admin/accounts'); if(ac&&ac.accounts) SRV.accounts=ac.accounts; loadSubs(); });

function wallets(){ const out=[]; try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k.startsWith('es.wallet.')) out.push(lsGet(k,{bal:0,hist:[]})); } }catch(e){} return out; }
const KIND={promo:'برومو كود',share:'مشاركة',gift:'هدية',referral:'تسجيل من رابطه','unlock-lesson':'فتح درس','unlock-unit':'فتح وحدة'};
function drawStats(){
  const A=accounts(), W=wallets(), H=SRV.stats?SRV.stats.hist:W.flatMap(w=>w.hist||[]).sort((a,b)=>b.at-a.at);
  const earned=H.filter(h=>h.n>0).reduce((a,h)=>a+h.n,0), spent=-H.filter(h=>h.n<0).reduce((a,h)=>a+h.n,0), shares=H.filter(h=>h.k==='share');
  const today=new Date().toDateString(), newToday=A.filter(a=>a.created&&new Date(a.created).toDateString()===today).length;
  const K=[['حسابات أولياء الأمور',A.length],['حسابات اليوم',newToday],['الأطفال',A.reduce((a,x)=>a+x.kids.length,0)],['المشاركات',shares.length],
    ['كريدتس اتكسبت',earned],['كريدتس اتصرفت',spent],['دروس اتفتحت',H.filter(h=>h.k==='unlock-lesson').length]];
  $('#kpis').innerHTML=K.map(([l,v])=>`<div class="kpi"><b>${ar(v)}</b><span>${l}</span></div>`).join('');
  const name=id=>{ const t=(S.coins.shares||[]).find(x=>x.id===id); return t?t.ar:id||''; };
  $('#hist').innerHTML=H.length?`<div class="row hr h"><span>الوقت</span><span>النوع</span><span>التفاصيل</span><span>كريدتس</span></div>`+H.slice(0,40).map(h=>`<div class="row hr"><span>${fmt(h.at)}</span><span>${KIND[h.k]||h.k}</span><span>${esc(h.k==='share'?name(h.t):h.k==='promo'?(h.code?h.code+' · ':'')+(h.id||''):h.id||'')}</span><b dir="ltr">${h.n>0?'+':''}${h.n}</b></div>`).join(''):'<p class="empty">مفيش حركات كريدتس على الجهاز ده لسه.</p>';
}

/* ---------- reports (2026-11-06): "report a problem" flags from the app (js/report.js). Server: GET api/admin/reports, POST api/admin/report/<id>; no server: this device's es.reports ---------- */
const RPTAB={read:'الدرس',words:'الكلمات',quiz:'أسئلة الكتاب',booklet:'الكُتيب',workbook:'كتاب التقييمات',grammar:'القواعد',exam:'ورقة تقييم'};
const RPKIND={answer:'الإجابة غلط',picture:'الصورة غلط',sound:'الصوت غلط',text:'كلمة مكتوبة غلط',other:'حاجة تانية'};
const apiPost=(path,body)=>fetch(S.api+path,{method:'POST',credentials:'include',headers:hdr(),body:JSON.stringify(body)}).then(r=>r.ok?r.json():null).catch(()=>null);
async function loadReports(){ const r=await api('/admin/reports?status=all'); if(r&&r.reports){ SRV.reports=r.reports; drawReports(); } }
function reportList(){ if(SRV.reports) return SRV.reports;
  return lsGet('es.reports',[]).map(r=>({id:r.id,at:r.at,status:r.done?'done':'open',subject:r.ctx.subject,unit:r.ctx.unit,lesson:r.ctx.lesson,tab:r.ctx.tab,page:r.ctx.page,ex:r.ctx.ex,kind:r.kind,comment:r.comment,ctx:r.ctx})).reverse(); }
function rpPlace(r){ const c=r.ctx||{}, o=[]; o.push(c.subjectName||r.subject||'');
  if(r.unit!==''&&r.unit!=null) o.push('الوحدة '+ar(r.unit)); if(c.lessonNo!=null&&c.lessonNo!=='') o.push('الدرس '+ar(c.lessonNo)); else if(r.lesson) o.push(r.lesson);
  if(c.lessonTitle) o.push('«'+c.lessonTitle+'»'); if(r.tab) o.push(RPTAB[r.tab]||r.tab); if(c.title) o.push(c.title); if(c.part&&r.tab==='exam') o.push(c.part);
  if(r.page!==''&&r.page!=null) o.push('صفحة '+ar(r.page)); if(r.ex!==''&&r.ex!=null) o.push('سؤال '+ar(r.ex)); else if(c.qi) o.push('السؤال رقم '+ar(c.qi)+(c.qn?' من '+ar(c.qn):''));
  if(c.word) o.push('الكلمة: '+c.word); if(c.readPage) o.push('صفحة الشاشة '+ar(c.readPage)); return o.filter(Boolean).join(' — '); }
function drawReports(){
  const all=reportList(), st=$('#rp-status').value, sj=$('#rp-subj'), cur=sj.value, q=$('#rp-q').value.trim().toLowerCase();
  const subs=[...new Set(all.map(r=>r.subject).filter(Boolean))];
  sj.innerHTML='<option value="">كل المواد</option>'+subs.map(x=>`<option value="${esc(x)}">${esc(((COURSE&&COURSE.subjects.find(s=>s.id===x))||{}).name||x)}</option>`).join(''); sj.value=subs.includes(cur)?cur:'';
  const open=all.filter(r=>r.status!=='done').length, b=$('#repBadge'); b.hidden=!open; b.textContent=ar(open);
  const L=all.filter(r=>(st==='all'||(st==='done')===(r.status==='done'))&&(!sj.value||r.subject===sj.value)&&(!q||(r.comment+' '+rpPlace(r)).toLowerCase().includes(q)));
  $('#rp-count').textContent=ar(L.length)+' بلاغ'+(SRV.reports?'':' (من الجهاز ده)');
  $('#reports').innerHTML=L.length?L.map(r=>`<div class="rep${r.status==='done'?' done':''}" data-id="${esc(r.id)}">
    <div class="rep-top"><b>${esc(rpPlace(r))}</b><span class="rep-at">${fmt(r.at)}</span></div>
    ${r.kind?`<span class="rep-kind">${esc(RPKIND[r.kind]||r.kind)}</span>`:''}${r.comment?`<p class="rep-c">${esc(r.comment)}</p>`:'<p class="rep-c none">من غير تعليق</p>'}
    ${r.ctx&&r.ctx.task?`<p class="rep-t">${esc(r.ctx.task)}</p>`:''}
    <div class="rep-act"><button data-s="${r.status==='done'?'open':'done'}">${r.status==='done'?'رجّعيه مفتوح':'اتحل ✓'}</button></div></div>`).join(''):'<p class="empty">مفيش بلاغات.</p>';
  $$('#reports .rep').forEach(d=>$('button',d).addEventListener('click',async e=>{ const id=d.dataset.id, s=e.target.dataset.s;
    if(SRV.reports){ const ok=await apiPost('/admin/report/'+id,{status:s}); if(!ok) return toast('السيرفر مش متاح'); const r=SRV.reports.find(x=>x.id===id); if(r) r.status=s; }
    else { const q2=lsGet('es.reports',[]), r=q2.find(x=>x.id===id); if(r){ r.done=s==='done'?1:0; localStorage.setItem('es.reports',JSON.stringify(q2)); } }
    drawReports(); }));
}
['rp-status','rp-subj'].forEach(i=>$('#'+i).addEventListener('change',drawReports)); $('#rp-q').addEventListener('input',drawReports);

/* the notification link picker: subject > unit > lesson or exam > tab. Builds ?go=<subject>[/<lesson folder>[/<tab>]] | /x-<exam id> | unit-<n> (js/deeplink.js reads it). Only built lessons are listed. */
const PU_TABS={read:'الدرس',words:'الكلمات',quiz:'أسئلة الكتاب',booklet:'الكُتيب',workbook:'كتاب التقييمات',grammar:'القواعد'};
const puOpts=(sel,list,first)=>{ sel.innerHTML=`<option value="">${first}</option>`+list.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join(''); sel.hidden=!list.length; };
function puSubj(){ return COURSE&&COURSE.subjects.find(x=>x.id===$('#pu-s').value); }
function puUnitName(u){ return u.label||u.title||('الوحدة '+ar(u.unit)); }
function puItems(){ const s=puSubj(), un=(s.units||[]).find(u=>String(u.unit)===$('#pu-u').value); if(!un) return [];
  const out=[]; (s.lessons||[]).filter(l=>l.unit===un.unit&&l.built&&!l.hidden).forEach(l=>{ out.push(['l:'+l.folder,'الدرس '+ar(l.lesson)+' — '+l.title]);
    (l.exams||[]).forEach(e=>out.push(['x:'+e.id,'اختبار: '+(e.title||e.label)+' (مع الدرس '+ar(l.lesson)+')']));
    });
  (un.exams||[]).forEach(e=>out.push(['x:'+e.id,'اختبار: '+(e.title||e.label)])); return out; }
function puTabs(){ const s=puSubj(), v=$('#pu-i').value; if(!v.startsWith('l:')) return [];
  const l=(s.lessons||[]).find(x=>x.folder===v.slice(2)); if(!l) return [];
  const ks=(l.tabs&&l.tabs.length?l.tabs:Object.keys(l.pages||{}).filter(k=>(l.pages[k]||[]).length)); return ks.filter(k=>PU_TABS[k]).map(k=>[k,PU_TABS[k]]); }
function puLink(){ const s=$('#pu-s').value, u=$('#pu-u').value, i=$('#pu-i').value, t=$('#pu-t').value; let go='';
  if(s){ go=s; if(i.startsWith('l:')){ go+='/'+i.slice(2)+(t?'/'+t:''); } else if(i.startsWith('x:')) go+='/x-'+i.slice(2); else if(u) go+='/unit-'+u; }
  $('#pu-url').value=go?'/?go='+go:''; }
function puInit(){ if(!COURSE||$("#pu-s").options.length) return;
  puOpts($('#pu-s'),COURSE.subjects.filter(x=>x.lessons).map(x=>[x.id,x.name]),'الصفحة الرئيسية للتطبيق (من غير مكان)'); $('#pu-u').hidden=$('#pu-i').hidden=$('#pu-t').hidden=true; puLink(); }
$('#pu-s').addEventListener('change',()=>{ const s=puSubj(); puOpts($('#pu-u'),s?(s.units||[]).map(u=>[String(u.unit),puUnitName(u)]):[],'خريطة المادة كلها'); puOpts($('#pu-i'),[],''); puOpts($('#pu-t'),[],''); puLink(); });
$('#pu-u').addEventListener('change',()=>{ puOpts($('#pu-i'),$('#pu-u').value?puItems():[],'الوحدة نفسها (الخريطة)'); puOpts($('#pu-t'),[],''); puLink(); });
$('#pu-i').addEventListener('change',()=>{ puOpts($('#pu-t'),puTabs(),'الدرس من أوله'); puLink(); });
$('#pu-t').addEventListener('change',puLink);

/* ---------- notifications (2026-11-09): written and sent by hand only. Server: GET api/admin/push, POST api/admin/push/send, POST api/admin/push/deliver/<id> ---------- */
async function loadPush(){ const r=await api('/admin/push'); const c=$('#pu-count');
  if(!r){ c.textContent='السيرفر مش متاح، الإشعارات محتاجة السيرفر'; $('#pu-list').innerHTML=''; return; }
  c.textContent=ar(r.subs)+' جهاز مفعّل الإشعارات'+(r.ready?'':' — مفاتيح VAPID مش متظبطة على السيرفر');
  $('#pu-list').innerHTML=r.msgs.length?r.msgs.map(m=>`<div class="rep"><div class="rep-top"><b>${esc(m.title)}</b><span class="rep-at">${fmt(m.at)}</span></div><p class="rep-c">${esc(m.body)}</p><span class="rep-kind">وصلت لـ ${ar(m.sent)} جهاز${m.gone?' — اتشال '+ar(m.gone)+' جهاز مقفول':''}</span></div>`).join(''):'<p class="empty">لسه ما بعتّيش حاجة.</p>'; }
$('#pu-send').addEventListener('click',async()=>{
  const title=$('#pu-title').value.trim(), body=$('#pu-body').value.trim(), url=$('#pu-url').value.trim(); if(!title||!body) return toast('اكتبي العنوان والنص');
  if(!S.api) return toast('السيرفر مش متاح');
  if(!confirm('تبعتي الإشعار ده لكل الأجهزة المفعّلة؟\n\n'+title+'\n'+body)) return;
  const btn=$('#pu-send'); btn.disabled=true;
  try{ const r=await apiPost('/admin/push/send',{title,body,url}); if(!r||!r.id) return toast('ماتبعتش');
    let left=1, tries=0; while(left>0&&tries++<200){ const d=await apiPost('/admin/push/deliver/'+r.id,{}); if(!d) { toast('وقف في النص، دوسي ابعت تاني'); break; } left=d.left; btn.textContent='بيتبعت… باقي '+ar(left); }
    $('#pu-title').value=$('#pu-body').value=''; toast('اتبعت'); }
  finally{ btn.disabled=false; btn.textContent='ابعت لكل الأجهزة'; loadPush(); } });

/* ---------- tabs + save / download / reset ---------- */
$$('#tabs button').forEach(b=>b.addEventListener('click',()=>{ $$('#tabs button').forEach(x=>x.classList.toggle('on',x===b)); $$('.page').forEach(p=>p.hidden=p.id!=='p-'+b.dataset.p); if(b.dataset.p==='stats') drawStats(); if(b.dataset.p==='users'){ drawUsers(); drawSubs(); } if(b.dataset.p==='push'){ puInit(); loadPush(); } }));
$('#save').addEventListener('click',()=>{ try{ localStorage.setItem('es.settings',JSON.stringify(S)); dirty=false; $('#save').textContent='حفظ'; toast('اتحفظ على الجهاز ده. افتحي التطبيق تشوفيه.'); if(S.api) api('/admin/settings',S).then(r=>toast(r?'اتحفظ على السيرفر كمان، لكل المستخدمين.':'السيرفر مش متاح، اتحفظ على الجهاز بس.')); $('#where').textContent='الإعدادات المعروضة: المحفوظة على الجهاز ده (لسه مش في الملف). اضغطي "تنزيل" عشان تبقى للكل.'; }catch(e){ toast('الحفظ مش متاح هنا'); } });
$('#dl').addEventListener('click',()=>{ const out={_note:FILE&&FILE._note,...S}; const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'})); a.download='settings.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); });
$('#reset').addEventListener('click',()=>{ if(!confirm('ترجعي لإعدادات الملف وتمسحي المحفوظ على الجهاز ده؟')) return; try{ localStorage.removeItem('es.settings'); }catch(e){} S=JSON.parse(JSON.stringify(FILE)); location.reload(); });
addEventListener('beforeunload',e=>{ if(dirty){ e.preventDefault(); e.returnValue=''; } });
boot().catch(e=>{ $('#where').textContent='مش قادر يحمّل ملفات المنهج: '+e.message; });

/* admin password (ADMIN_TOKEN) for use without a domain: kept on this device, sent as Authorization Bearer */
{ const b=document.getElementById('tok'); if(b){ const show=()=>{ b.textContent=tokGet()?'كلمة السر: محفوظة ✓':'كلمة السر'; }; show();
  b.addEventListener('click',()=>{ const v=prompt('اكتبي كلمة سر الأدمن (ADMIN_TOKEN). سيبيها فاضية عشان تتمسح من الجهاز ده.',''); if(v===null) return; try{ if(v.trim()) localStorage.setItem('es.adminToken',v.trim()); else localStorage.removeItem('es.adminToken'); }catch(e){} show(); location.reload(); }); } }
