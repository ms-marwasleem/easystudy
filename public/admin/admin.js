/* ADMIN DASHBOARD (Marwa 2026-11-05, docs/coins-and-admin.md). Edits ONE settings object (same shape as data/settings.json):
   coins (on/off, prices, share types), access.free (the free policy for a new child), items (state + price per subject / unit / lesson).
   Settings are read from and saved to the server only (GET/PUT api/admin/settings); no device copy.
   Accounts + stats read this device (es.account, es.kids, es.wallet.*) until the server API exists (GET /api/admin/accounts, /stats). */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const get=u=>fetch(u,{cache:'no-store'}).then(r=>{ if(!r.ok) throw new Error(u); return r.json(); });
const lsGet=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v; }catch(e){ return d; } };
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
let LOCKED=false, S=null, FILE=null, COURSE=null, GRADES=[], dirty=false;
const toast=t=>{ const o=$('#toast'); o.textContent=t; o.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>o.hidden=true,/^ما اتحفظش/.test(t)?6000:1800); };
const mark=()=>{ dirty=true; $('#save').textContent='حفظ •'; };

async function boot(){
  FILE=await get(window.ADMIN_WORDS?'data/words/settings.json':'data/settings.json').catch(()=>({coins:{},access:{free:{mode:'first',count:1}},items:{}}));
  const API=FILE.api||'/api'; S={api:API};
  const live=await api('/admin/settings');   // THE real settings, kept on the server; nothing is kept on this device
  LOCKED=!(live&&live.coins);
  S=LOCKED?JSON.parse(JSON.stringify(FILE)):live; S.api=API;
  if(LOCKED){ $('#save').disabled=true; }
  S.coins=S.coins||{}; S.access=S.access||{}; S.access.free=S.access.free||{}; S.items=S.items||{};
  const F=S.access.free; F.mode='first'; delete F.perSubject; if(F.count==null||F.count>5) F.count=1; F.per=F.per||{}; F.list=F.list||[];   // free = first lessons of unit 1 per subject
  S.coins.referral=S.coins.referral||{on:false,coins:15}; if(S.coins.shareCoins==null) S.coins.shareCoins=1; if(!S.coins.dailyCap||S.coins.dailyCap>20) S.coins.dailyCap=20; if(!S.coins.lessonCost) S.coins.lessonCost=3;
  S.subs=S.subs||{}; S.subs.prices=S.subs.prices||{}; S.currOff=S.currOff||{}; S.promos=S.promos||[]; if(S.promoOn==null) S.promoOn=true;
  Object.keys(S.items).forEach(k=>{ if(S.items[k].st!=='soon') delete S.items[k]; else S.items[k]={st:'soon'}; });   // old open/locked/price options removed: only "soon" is kept
  COURSE=await get('data/course.json');
    COURSE.subjects=COURSE.subjects.filter(s=>!s.hidden);   // hidden:true in data/course.json = subject switched off for now (German, Science); remove the flag to restore
  const CJ=await get('data/curriculum.json').catch(()=>({grades:[],types:[]})); GRADES=CJ.grades.filter(g=>g.open!==false); CTYPES=CJ.types||[]; window.CSCH=CJ.schools||[];
  await Promise.all(COURSE.subjects.filter(s=>s.file).map(async s=>{ const d=await get(s.file).catch(()=>null); if(!d) return;
    s.units=d.units||[]; s.lessons=(d.lessons||[]).map(l=>({...l,id:`${s.id}-${l.folder}`,built:!!l.title})); }));
  if(window.ADMIN_WORDS){   // EASY WORDS dashboard: only the subjects that have words, only the lessons that have a words tab, "built" = open in data/words/words.json
    const W=await get('data/words/words.json').catch(()=>({})), WS=['arabic','en-ol','en-al'];
    COURSE.subjects=COURSE.subjects.filter(s=>WS.includes(s.id));
    COURSE.subjects.forEach(s=>{ s.lessons=(s.lessons||[]).filter(l=>!(l.tabs&&!l.tabs.includes('words'))&&!/^(test|تقييم|اختبار)/i.test(l.title||l.planned||''))
      .map(l=>({...l,built:!!l.built&&!(W.skip||[]).includes(l.id)&&!!(W.all||(W.open||[]).includes(l.id))}));
      if(s.id==='arabic') s.lessons=s.lessons.filter(l=>l.unit<=4);   // no النحو / final assessments in Easy Words (they have no words)
      s.units=(s.units||[]).filter(u=>s.lessons.some(l=>l.unit===u.unit)); });
  }
  $('#where').textContent=LOCKED?'مش قادرين نجيب الإعدادات الحالية دلوقتي، فالحفظ متوقف عشان ما يتمسحش حاجة. اتأكدي من الإنترنت ومن كلمة السر (زرار «كلمة السر») وافتحي الصفحة تاني.':'';
  drawSettings(); drawTree(); drawPromos(); drawUsers(); drawStats(); drawReports();
  if(S.api){ const [ac,st]=await Promise.all([api('/admin/accounts'),api('/admin/stats')]); if(ac&&ac.accounts){ SRV.accounts=ac.accounts; drawUsers(); loadSubs(); } if(st&&st.hist){ SRV.stats=st; drawStats(); }
    if(st&&st.promoUses){ SRV.promoUses=st.promoUses; drawPromos(); }
    loadReports();
    if(!ac&&!LOCKED) $('#where').textContent='المستخدمين والإحصائيات مش ظاهرين دلوقتي. اتأكدي من الإنترنت وكلمة السر.'; }
}

/* ---------- settings page ---------- */
let CTYPES=[];
const NUMS=['shareCoins','lessonCost','dailyCap'];
const TERMS_ALL=[['t1','الترم الأول'],['t2','الترم الثاني']], TERMS=TERMS_ALL.filter(x=>x[0]==='t1');   // الترم الثاني مخفي لحد ما يتبني: ضيفي 't2' هنا ويرجع
function drawSettings(){ $('#u-grade').innerHTML=GRADES.map(g=>`<option value="${esc(g.id)}">${esc(g.ar)}</option>`).join('');
  const C=S.coins, B=S.subs;
  $('#c-enabled').checked=!!C.enabled; $('#c-parentGate').checked=C.parentGate!==false;
  NUMS.forEach(k=>$('#c-'+k).value=C[k]!=null?C[k]:'');
  $('#c-wa').value=S.whatsapp||''; $('#c-email').value=S.adminEmail||''; $('#s-name').value=B.name||''; $('#s-link').value=B.link||'';
  $('#c-shareText').value=C.shareText||''; $('#c-shareUrl').value=C.shareUrl||'';
  $('#r-on').checked=!!C.referral.on; $('#r-coins').value=C.referral.coins||0; $('#r-sub').value=C.referral.subCoins||0;
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
  box.innerHTML=rows.join('')||'<p class="empty">مفيش سنوات دراسية.</p>';
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
$('#c-email').addEventListener('input',e=>{ S.adminEmail=e.target.value.trim(); mark(); });
$('#s-name').addEventListener('input',e=>{ S.subs.name=e.target.value; mark(); });
$('#s-link').addEventListener('input',e=>{ S.subs.link=e.target.value.trim(); mark(); });
$('#c-shareText').addEventListener('input',e=>{ S.coins.shareText=e.target.value; mark(); });
$('#c-shareUrl').addEventListener('input',e=>{ S.coins.shareUrl=e.target.value; mark(); });
$('#r-on').addEventListener('change',e=>{ S.coins.referral.on=e.target.checked; mark(); });
$('#r-coins').addEventListener('input',e=>{ S.coins.referral.coins=+e.target.value||0; mark(); });
$('#r-sub').addEventListener('input',e=>{ S.coins.referral.subCoins=Math.max(0,+e.target.value||0); mark(); });
$('#f-count').addEventListener('input',e=>{ S.access.free.count=+e.target.value||0; mark(); drawFreePer(); });

/* ---------- lessons page: tree subject > unit > lesson, multi-select, open | soon ----------
   Default: a built lesson is open, an unbuilt one is "soon". Only "soon" is stored (S.items[id]={st:'soon'}); open = no entry. */
const SEL=new Set(), OPEN=new Set();   // OPEN = expanded subject/unit ids (collapsed by default)
const kidsOf=s=>(s.units||[]).map(u=>({u,ls:(s.lessons||[]).filter(l=>l.unit===u.unit&&!l.hidden)}));
function lessonOpen(l){ return l.built&&!(S.items['l:'+l.id]||{}).st; }
function stOf(kind,s,u,ls,l){
  if(kind==='les') return lessonOpen(l)?'open':'soon';
  const own=(S.items[kind==='subj'?'s:'+s.id:`u:${s.id}:${u.unit}`]||{}).st==='soon';
  const L=kind==='subj'?(s.lessons||[]).filter(x=>!x.hidden):ls, n=L.filter(lessonOpen).length;
  if(own||!n) return 'soon'; return n===L.length?'open':'mixed'; }
const STLBL={open:'مفتوح',soon:'قريبًا',mixed:'مختلط'};
function row(cls,id,name,built,st,par){ return `<div class="it ${cls}" data-id="${id}"${par?` data-par="${par}"`:''}><input type="checkbox" class="sel"${SEL.has(id)?' checked':''} aria-label="تعليم">${cls==='les'?'':'<b class="car">◂</b>'}<i class="dot${built?' b':''}"></i><span class="nm" title="${esc(name)}">${esc(name)}</span><span class="stb ${st}">${STLBL[st]}</span></div>`; }
// the subjects of one curriculum: its type's list (+ English AL for the experimental one); لغات = the base book of every private school + the school's own subjects
function currSubjects(id){ const ty=CTYPES.find(c=>c.id===id)||{}; if(id!=='private'&&ty.subjects) return ty.subjects.concat(id==='tajribi'?['en-al']:[]);
  const out=[]; (window.CSCH||[]).forEach(sc=>{ const b=CTYPES.find(c=>c.id===sc.base)||{}; out.push(...(b.subjects||[]),...(sc.subjects||[])); }); return out; }
function drawTree(){
  const sel=$('#l-subj'), cur=sel.value; sel.innerHTML='<option value="">كل المواد</option>'+(window.ADMIN_WORDS?`<optgroup label="حسب المنهج">${(CTYPES||[]).map(c=>`<option value="c:${c.id}">${esc(c.id==='private'?'لغات':c.ar||c.id)}</option>`).join('')}</optgroup>`:'')+COURSE.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join(''); sel.value=cur;
  const inSel=s=>!sel.value||s.id===sel.value||(sel.value.startsWith('c:')&&currSubjects(sel.value.slice(2)).includes(s.id));   // a curriculum (عام / تجريبي) shows its subjects
  $('#tree').innerHTML=COURSE.subjects.filter(inSel).map(s=>{
    let h=row('subj','s:'+s.id,s.name,!!s.lessons,s.lessons?stOf('subj',s):'soon');
    kidsOf(s).forEach(({u,ls})=>{ h+=row('unit',`u:${s.id}:${u.unit}`,u.label||`الوحدة ${ar(u.unit)}`,ls.some(l=>l.built),stOf('unit',s,u,ls),'s:'+s.id);
      ls.forEach(l=>h+=row('les','l:'+l.id,`${ar(l.lesson)}. ${l.title||l.planned||'—'}`,l.built,stOf('les',s,u,ls,l),`u:${s.id}:${u.unit}`)); });
    return h; }).join('');
  $$('#tree .it').forEach(r=>$('.sel',r).addEventListener('change',e=>{ const id=r.dataset.id, on=e.target.checked, rows=$$('#tree .it'), i=rows.indexOf(r), cls=r.classList.contains('subj')?'subj':r.classList.contains('unit')?'unit':'les';
    const set=(x,v)=>{ v?SEL.add(x.dataset.id):SEL.delete(x.dataset.id); $('.sel',x).checked=v; }; set(r,on);
    if(cls!=='les') for(let k=i+1;k<rows.length;k++){ const c=rows[k].classList; if(c.contains('subj')||(cls==='unit'&&c.contains('unit'))) break; set(rows[k],on); }
    bulkInfo(); }));
  $$('#tree .it:not(.les)').forEach(r=>r.addEventListener('click',e=>{ if(e.target.closest('.sel')) return; const id=r.dataset.id; OPEN.has(id)?OPEN.delete(id):OPEN.add(id); applyOpen(); }));
  applyOpen(); bulkInfo();
}
function applyOpen(){   // a unit shows only when its subject is open, a lesson only when its unit and subject are open
  $$('#tree .it').forEach(r=>{ const p=r.dataset.par; let hide=false;
    if(p){ hide=!OPEN.has(p); if(!hide&&r.classList.contains('les')) hide=!OPEN.has('s:'+p.split(':')[1]); }
    r.classList.toggle('cl',hide); r.classList.toggle('xo',OPEN.has(r.dataset.id)); }); }
function bulkInfo(){ const n=SEL.size; $('#bulk-n').textContent=n?'معلّم '+ar(n):'مفيش حاجة معلّمة'; $$('#bulk button').forEach(b=>b.disabled=!n); }
$$('#bulk button').forEach(b=>b.addEventListener('click',()=>{ const st=b.dataset.st;
  SEL.forEach(id=>{ if(st==='soon') S.items[id]={st:'soon'}; else delete S.items[id]; });
  SEL.clear(); mark(); drawTree(); toast(st==='soon'?'اتحطت "قريبًا"':st==='open'?'اتفتحت (اللي جاهز بس)':'اتلغى التعليم'); }));
$('#l-subj').addEventListener('change',drawTree);

/* ---------- promo codes (Marwa 2026-11-05): S.promos = [{code, what, target, uses, max, until, on, note}] — js/coins.js PROMO CODES ---------- */
const WHAT=[['lesson','درس واحد'],['any','أي درس يختاره المستخدم'],['unit','وحدة كاملة'],['subject','مادة كاملة'],['all','كل المواد']];   // 'percent' (discount) is its own code TYPE, chosen in "نوع الكود"
const promoNorm=c=>String(c||'').toUpperCase().replace(/[\s\-_]/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const newCode=()=>{ const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789', b=crypto.getRandomValues(new Uint8Array(8)); return [...b].map(x=>a[x%a.length]).join(''); };
function targets(what,cur){   // the <option>s for "what it opens"
  if(what==='all'||what==='any'||what==='percent') return '<option value="">—</option>';
  const S2=COURSE.subjects.filter(s=>s.lessons);
  if(what==='subject') return S2.map(s=>`<option value="${s.id}"${cur===s.id?' selected':''}>${esc(s.name)}</option>`).join('');
  return S2.map(s=>`<optgroup label="${esc(s.name)}">`+(what==='unit'
    ?(s.units||[]).map(u=>{ const id=`u:${s.id}:${u.unit}`; return `<option value="${id}"${cur===id?' selected':''}>${esc(u.label||'الوحدة '+ar(u.unit))}</option>`; }).join('')
    :(s.lessons||[]).filter(l=>!l.hidden&&l.built).map(l=>{ const id='l:'+l.id; return `<option value="${id}"${cur===id?' selected':''}>${ar(l.unit)}-${ar(l.lesson)} ${esc(l.title)}</option>`; }).join(''))+'</optgroup>').join(''); }
const firstTarget=what=>{ const m=targets(what,'').match(/<option value="([^"]*)"/); return m?m[1]:''; };
function promoUses(c){ if(SRV.promoUses) return (SRV.promoUses.find(x=>x.code===c)||{}).n||0; return lsGet('es.promoUses',{})[c]||0; }
function drawPromos(){ const box=$('#promos'), P=S.promos;
  $('#promoWhere').textContent=SRV.promoUses?'عدد مرات الاستخدام لكل المستخدمين.':'عدد مرات الاستخدام مش ظاهر دلوقتي.';
  if(!P.length){ box.innerHTML='<p class="empty">مفيش أكواد لسه.</p>'; return; }
  box.innerHTML=P.map((p,i)=>{ const c=promoNorm(p.code), dup=P.findIndex(x=>promoNorm(x.code)===c)!==i, n=promoUses(c), old=p.until&&new Date().toISOString().slice(0,10)>p.until;
    return `<div class="pr-card${p.on===false||old?' off':''}" data-i="${i}">
      <div class="pr-top"><label class="sw" title="شغال"><input type="checkbox" data-k="on"${p.on!==false?' checked':''}><span></span></label>
        <input type="text" data-k="code" class="pr-code${dup||!c?' bad':''}" dir="ltr" value="${esc(p.code)}" aria-label="الكود" maxlength="32">
        <span class="pr-used">${old?'<b class="pr-old">انتهى</b> · ':''}اتستخدم ${ar(n)}${p.uses==='many'&&+p.max>0?' من '+ar(p.max):p.uses!=='many'?' من ١':''}</span>
        <button class="x" aria-label="حذف">×</button></div>
      ${dup?'<p class="pr-warn">الكود ده متكرر، غيّريه.</p>':''}
      <div class="grid pr-grid">
        <label>نوع الكود <select data-k="type"><option value="open"${p.what!=='percent'?' selected':''}>فتح دروس</option><option value="percent"${p.what==='percent'?' selected':''}>خصم على سعر الاشتراك</option></select></label>
        ${p.what==='percent'?`<label>نسبة الخصم % <small>(من ١ لـ ٩٩)</small><input type="number" min="1" max="99" data-k="pct" value="${+p.pct>0?p.pct:''}" placeholder="مثلًا ٢٠"></label>`
        :`<label>بيفتح <select data-k="what">${WHAT.map(([v,l])=>`<option value="${v}"${p.what===v?' selected':''}>${l}</option>`).join('')}</select></label>`}
        <label${p.what==='all'||p.what==='any'||p.what==='percent'?' hidden':''}>${{lesson:'الدرس',unit:'الوحدة',subject:'المادة'}[p.what]||''} <select data-k="target">${targets(p.what,p.target)}</select></label>
        <label>الاستخدام <select data-k="uses"><option value="once"${p.uses!=='many'?' selected':''}>مرة واحدة بس</option><option value="many"${p.uses==='many'?' selected':''}>أكتر من مرة (كل طفل مرة)</option></select></label>
        <label${p.uses==='many'?'':' hidden'}>أقصى عدد <small>(فاضي = من غير حد)</small><input type="number" min="0" data-k="max" value="${+p.max>0?p.max:''}"></label>
        <label>آخر يوم <small>(فاضي = دايمًا)</small><span class="dwrap${p.until?'':' empty'}"><input type="date" data-k="until" value="${esc(p.until||'')}"><em>دايمًا</em>${p.until?'<button type="button" class="dclr" title="مسح التاريخ">×</button>':''}</span></label>
        <label>ملاحظة <input type="text" data-k="note" value="${esc(p.note||'')}" placeholder="لمين الكود ده"></label>
      </div></div>`; }).join('');
  $$('.pr-card',box).forEach(r=>{ const p=S.promos[+r.dataset.i];
    $$('[data-k]',r).forEach(inp=>inp.addEventListener(inp.tagName==='SELECT'||inp.type==='checkbox'||inp.type==='date'?'change':'input',()=>{ const k=inp.dataset.k;
      if(k==='type'){ if(inp.value==='percent'){ p.what='percent'; p.target=''; p.pct=+p.pct>0?p.pct:10; } else { p.what='lesson'; p.target=firstTarget('lesson'); delete p.pct; } mark(); return drawPromos(); }
      p[k]=k==='on'?inp.checked:k==='max'||k==='pct'?Math.min(k==='pct'?99:1e9,Math.max(0,+inp.value||0)):k==='code'?inp.value.toUpperCase().replace(/\s/g,''):inp.value;
      if(k==='code'&&inp.value!==p.code){ const at=inp.selectionStart; inp.value=p.code; try{ inp.setSelectionRange(at,at); }catch(e){} }
      if(k==='what') p.target=p.what==='all'||p.what==='any'?'':firstTarget(p.what);
      mark(); if(['what','uses','on','until'].includes(k)) drawPromos(); else if(k==='code'){ const c=promoNorm(p.code), d=S.promos.filter(x=>promoNorm(x.code)===c).length>1; inp.classList.toggle('bad',d||!c); } }));
    const dc=$('.dclr',r); if(dc) dc.addEventListener('click',e=>{ e.preventDefault(); p.until=''; mark(); drawPromos(); });
    $('.x',r).addEventListener('click',()=>{ if(!confirm('تمسحي الكود '+p.code+'؟')) return; S.promos.splice(+r.dataset.i,1); mark(); drawPromos(); }); });
}
$('#addPromo').addEventListener('click',()=>{ S.promos.unshift({code:newCode(),what:'lesson',target:firstTarget('lesson'),uses:'once',max:0,until:'',on:true,note:''}); mark(); drawPromos(); const c=$('#promos .pr-code'); if(c){ c.focus(); c.select(); } });

/* ---------- accounts + stats (this device until the server) ---------- */
const fmt=t=>{ try{ return new Date(t).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}); }catch(e){ return t; } };
// with a server (settings "api"): the real lists come from GET api/admin/accounts and api/admin/stats (same shapes as the local ones below)
const tokGet=()=>{ try{ return localStorage.getItem('es.adminToken')||''; }catch(e){ return ''; } };
const hdr=()=>{ const t=tokGet(), h={'Content-Type':'application/json'}; if(t) h.Authorization='Bearer '+t; return h; }; // no-domain admin: ADMIN_TOKEN as Bearer
const api=(path,body)=>S.api?fetch(S.api+path+(body?'':(path.includes('?')?'&':'?')+'_='+Date.now()),{method:body?'PUT':'GET',cache:'no-store',credentials:'include',headers:hdr(),body:body?JSON.stringify(body):undefined}).then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(null);
let SRV={subs:null,accounts:null,stats:null,promoUses:null,reports:null};
function accounts(){ if(SRV.accounts) return SRV.accounts; const a=lsGet('es.account',null); if(!a) return []; return [{...a,kids:lsGet('es.kids',[])}]; }
const subRow=(kid,t)=>(SRV.subs||[]).find(x=>x.child===kid&&x.term.split(':')[1]===t);
/* ---------- users tab (2026-11-16): one column per fact, every cell edits in place and saves at once, a live search / picker under each column, ON/OFF switch per student and term ---------- */
const nrm=t=>String(t==null?'':t).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().replace(/\s+/g,' ').trim();
const fmtD=t=>{ if(!t) return ''; const d=new Date(t); if(isNaN(d)) return ''; const p=n=>String(n).padStart(2,'0'); return ar(p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()); };
const gradeName=id=>{ const g=GRADES.find(x=>x.id===id); return g?g.ar:(id||''); };
const gradeOpts=sel=>GRADES.map(g=>`<option value="${esc(g.id)}"${g.id===sel?' selected':''}>${esc(g.ar)}</option>`).join('');
const mailOf=a=>a.email&&!/@phone\.local$/.test(a.email)?a.email:'';
const UF={}, UD={date:{},kdate:{},sdate:{}};   // UF = text typed under a column; UD = from / to days picked under a date column
function subState(r){ const t=Date.now(); if(r&&r.st==='active'&&r.until>t) return 'on'; if(r&&r.st==='pending'&&r.until>t) return 'wait'; return 'off'; }
const dayMs=(v,end)=>{ if(!v) return 0; const d=new Date(v+'T00:00:00'); return d.getTime()+(end?864e5-1:0); };
const inRange=(t,c)=>{ const f=dayMs(UD[c].from), e=dayMs(UD[c].to,true); if(!f&&!e) return true; if(!t) return false; const x=new Date(t).getTime(); return (!f||x>=f)&&(!e||x<=e); };
const hasKF=()=>UF.kid||UF.kdate||UD.kdate.from||UD.kdate.to||UF.sub||UD.sdate.from||UD.sdate.to;
function drawUsers(){ const A=accounts(), box=$('#users'), srv=!!SRV.accounts, all=nrm($('#u-q').value);
  $('#u-where').textContent=srv?'اكتبي في أي خانة وهتتحفظ على طول.':'قائمة المستخدمين مش ظاهرة دلوقتي. اتأكدي من الإنترنت وكلمة السر وافتحي الصفحة تاني.';
  const rows=A.map((a,i)=>({a,idx:i+1,kids:(a.kids||[]).map(k=>({k,sub:TERMS.map(x=>x[0]).map(t=>{ const r=subRow(k.id,t); return {t,r,st:subState(r)}; })}))}));
  const L=rows.filter(o=>{ const a=o.a;
    if(UF.num&&!nrm(o.idx).includes(UF.num)) return false; if(UF.email&&!nrm(mailOf(a)).includes(UF.email)) return false; if(UF.phone&&!nrm(a.phone).includes(UF.phone)) return false; if(!inRange(a.created,'date')) return false;
    o.show=o.kids.filter(x=>(!UF.kid||nrm(x.k.name+' '+gradeName(x.k.grade)).includes(UF.kid))&&inRange(x.k.created,'kdate')
      &&(!UF.sub||(UF.sub==='on'?x.sub.some(s=>s.st==='on'):!x.sub.some(s=>s.st==='on')))&&((!UD.sdate.from&&!UD.sdate.to)||x.sub.some(s=>inRange(s.r&&s.r.at,'sdate'))));
    if(all){ const hay=nrm(o.idx+' '+fmtD(a.created)+' '+mailOf(a)+' '+a.phone+' '+o.kids.map(x=>x.k.name+' '+gradeName(x.k.grade)).join(' ')); if(!hay.includes(all)) return false; }
    return hasKF()?o.show.length>0:true; });
  $('#u-count').textContent=ar(L.length)+' مستخدم';
  $('#u-add-go').disabled=!srv;
  if(!L.length){ box.innerHTML='<tr><td colspan="10"><p class="empty">'+(A.length?'مفيش نتيجة.':'مفيش حسابات مسجلة لسه.')+'</p></td></tr>'; return; }
  const dis=srv?'':' disabled';
  box.innerHTML=L.map(o=>{ const a=o.a, K=hasKF()?o.show:o.kids, n=K.length+1, P=a.id||'';
    const first=`<td rowspan="${n}" class="u-n"><b>${ar(o.idx)}</b></td><td rowspan="${n}" class="u-dt">${fmtD(a.created)||'—'}</td>
      <td rowspan="${n}"><input class="u-in" data-f="email" dir="ltr" type="email" value="${esc(mailOf(a))}" placeholder="—"${dis}></td>
      <td rowspan="${n}"><input class="u-in" data-f="phone" dir="ltr" type="tel" value="${esc(a.phone||'')}" placeholder="—"${dis}></td>`;
    const last=`<td rowspan="${n}" class="u-act"><button type="button" class="u-del" data-a="del"${dis}>حذف</button></td>`;
    const rowsK=K.map((x,j)=>{ const k=x.k, g=k.grade||'p1', blk=f=>x.sub.map(s=>`<div class="trm" data-k="${esc(k.id)}" data-g="${esc(g)}" data-t="${s.t}">${f(s)}</div>`).join('');
      return `<tr data-p="${esc(P)}" data-k="${esc(k.id)}">`+(j?'':first)+`<td class="u-kc"><input class="u-in" data-f="kid" value="${esc(k.name)}"${dis}><select class="u-in" data-f="grade"${dis}>${gradeOpts(g)}</select>${k.school?'<small>'+esc(k.school)+'</small>':''}</td><td class="u-dt">${fmtD(k.created)||'—'}</td>`+
        `<td>${blk(s=>`<label class="sw"><input type="checkbox" data-a="tog"${s.st==='on'?' checked':''}${dis}><span></span></label><span class="nm">${TNAME[s.t]}</span><span class="stb ${s.st==='on'?'open':''}">${s.st==='on'?'مشترك':s.st==='wait'?'منتظر':'غير مشترك'}</span>`)}</td>`+
        `<td class="u-dt">${blk(s=>fmtD(s.r&&s.r.at)||'—')}</td>`+
        `<td>${blk(s=>s.r&&s.r.receipt?`<button type="button" class="ghost" data-a="rc">عرض الإيصال</button>`:'—')}</td>`+(j?'':last)+'</tr>'; }).join('');
    const addRow=`<tr data-p="${esc(P)}" class="u-addk">`+(K.length?'':first)+`<td colspan="5" class="u-akc"><button type="button" class="ghost" data-a="addk"${dis}>+ إضافة طالب</button></td>`+(K.length?'':last)+'</tr>';
    return rowsK+addRow; }).join(''); }
const refreshUsers=async()=>{ const ac=await api('/admin/accounts'); if(ac&&ac.accounts) SRV.accounts=ac.accounts; await loadSubs(); };
$('#u-q').addEventListener('input',drawUsers);
$$('.u-f').forEach(i=>i.addEventListener('input',()=>{ UF[i.dataset.c]=i.tagName==='SELECT'?i.value:nrm(i.value); drawUsers(); }));
$$('.u-d').forEach(i=>i.addEventListener('input',()=>{ UD[i.dataset.c][i.dataset.e]=i.value; drawUsers(); }));
$$('.u-dclr').forEach(b=>b.addEventListener('click',()=>{ const c=b.dataset.c; UD[c]={}; $$(`.u-d[data-c="${c}"]`).forEach(i=>i.value=''); drawUsers(); }));
/* a small window (receipt picture, rejection message, confirm): no browser pop-ups, which some phones and browsers block */
function uModal(html,cls){ const m=$('#u-modal'); $('#u-modal-in').className='u-modal-in '+(cls||''); $('#u-modal-in').innerHTML=html; m.hidden=false; return m; }
const uClose=()=>{ $('#u-modal').hidden=true; $('#u-modal-in').innerHTML=''; };
$('#u-modal').addEventListener('click',e=>{ if(e.target.id==='u-modal'||e.target.closest('[data-m="x"]')) uClose(); });
const ask=(msg,yes)=>new Promise(res=>{ uModal(`<p class="u-q">${esc(msg)}</p><div class="u-btns"><button type="button" class="pri" data-m="y">${esc(yes||'أيوه')}</button><button type="button" class="ghost" data-m="x">لأ</button></div>`,'sm'); let done=false;
  $('#u-modal-in').querySelector('[data-m=y]').onclick=()=>{ done=true; uClose(); res(true); }; const o=new MutationObserver(()=>{ if($('#u-modal').hidden){ o.disconnect(); if(!done) res(false); } }); o.observe($('#u-modal'),{attributes:true,attributeFilter:['hidden']}); });
const U_ERR={'bad-email':'الإيميل مش مظبوط','need-contact':'لازم إيميل أو موبايل','email-taken':'الإيميل ده لحساب تاني','phone-taken':'الموبايل ده لحساب تاني','bad-name':'اكتبي اسم الطالب'};
const showReceipt=async(child,term)=>{ const x=await post(`/admin/sub/${child}/${term}/receipt`);
  uModal(x&&x.receipt?`<img src="${x.receipt}" alt="" class="u-rc"><div class="u-btns"><button type="button" class="ghost" data-m="x">إغلاق</button></div>`:`<p class="empty">الإيصال مش متاح.</p><div class="u-btns"><button type="button" class="ghost" data-m="x">إغلاق</button></div>`,'big'); };
// every cell saves the moment it changes (email, mobile, student name, grade)
$('#users').addEventListener('change',async e=>{ const i=e.target.closest('.u-in'), tg=e.target.closest('[data-a=tog]');
  if(tg){ const r=tg.closest('.trm'), on=tg.checked; tg.disabled=true;
    const x=on?await post('/admin/sub/grant',{child:r.dataset.k,term:r.dataset.g+':'+r.dataset.t}):await post('/admin/sub',{child:r.dataset.k,term:r.dataset.g+':'+r.dataset.t,action:'close'});
    if(x&&x.ok) toast(on?'الاشتراك اتفعّل':'الاشتراك اتوقف'); else toast(x&&x.error==='admin-only'?'كلمة السر مش مظبوطة':on?'ما اتفعّلش، جربي تاني':'ما اتوقفش، جربي تاني');
    await loadSubs(); return; }
  if(!i||i.disabled) return; const tr=i.closest('tr'), f=i.dataset.f, pid=tr.dataset.p, a=accounts().find(x=>x.id===pid); let x;
  if(f==='kid'||f==='grade'){ const k=a&&a.kids.find(q=>q.id===tr.dataset.k), nm=tr.querySelector('[data-f=kid]').value.trim(), gr=tr.querySelector('[data-f=grade]').value;
    if(!nm){ toast('اكتبي اسم الطالب'); return drawUsers(); } x=await post('/admin/kid/'+tr.dataset.k,{name:nm,grade:gr}); if(x&&x.ok&&k){ k.name=nm; k.grade=gr; if(f==='grade') drawUsers(); } }
  else { const row=tr.parentNode.querySelector(`tr[data-p="${pid}"]`), g=n=>row.querySelector(`[data-f="${n}"]`).value.trim(); x=await post('/admin/user/'+pid,{email:g('email'),phone:g('phone')}); if(x&&x.ok&&a){ a.email=g('email'); a.phone=g('phone'); } }
  if(x&&x.ok) toast('اتحفظ'); else { toast(U_ERR[x&&x.error]||'ما اتحفظش، جربي تاني'); await refreshUsers(); drawUsers(); } });
$('#users').addEventListener('click',async e=>{ const b=e.target.closest('[data-a]'); if(!b||b.disabled||b.dataset.a==='tog') return; const tr=b.closest('tr'), pid=tr.dataset.p;
  if(b.dataset.a==='del'){ if(!(await ask('حذف المستخدم ده نهائيًا؟ هيتمسح معاه الطلاب والاشتراكات والإيصالات والكريدتس، ومفيش رجوع.','احذف'))) return; const x=await post('/admin/user/'+pid+'/delete',{}); if(x&&x.ok){ toast('اتحذف'); await refreshUsers(); } else toast('ما اتحذفش، جربي تاني'); return; }
  if(b.dataset.a==='rc'){ const r=b.closest('.trm'); return showReceipt(r.dataset.k,r.dataset.g+':'+r.dataset.t); }
  if(b.dataset.a==='addk'){ const c=b.parentNode; c.innerHTML=`<input class="u-in" data-f="nn" placeholder="اسم الطالب الجديد"><select class="u-in" data-f="ng">${gradeOpts('p1')}</select><button type="button" class="pri" data-a="addk-go">إضافة</button><button type="button" class="ghost" data-a="addk-x">إلغاء</button>`; c.querySelector('input').focus(); return; }
  if(b.dataset.a==='addk-x') return drawUsers();
  if(b.dataset.a==='addk-go'){ const c=b.parentNode, nm=c.querySelector('[data-f=nn]').value.trim(), gr=c.querySelector('[data-f=ng]').value; if(!nm) return toast('اكتبي اسم الطالب');
    b.disabled=true; const x=await post('/admin/user/'+pid+'/kid',{name:nm,grade:gr}); if(x&&x.ok){ toast('اتضاف الطالب'); await refreshUsers(); } else { b.disabled=false; toast(U_ERR[x&&x.error]||'ما اتضافش، جربي تاني'); } } });
$('#u-form').addEventListener('submit',async e=>{ e.preventDefault(); const f=e.target, er=$('.u-err',f), v=n=>f.elements[n].value.trim(); er.hidden=true;
  const body={email:v('email'),phone:v('phone'),kid:v('kid'),grade:v('grade')};
  if(!body.email&&!body.phone){ er.textContent='اكتبي الإيميل أو الموبايل'; er.hidden=false; return; } if(!body.kid){ er.textContent='اكتبي اسم الطالب'; er.hidden=false; return; }
  const x=await post('/admin/user',body); if(!x||!x.ok){ er.textContent=U_ERR[x&&x.error]||'ما اتضافش، جربي تاني'; er.hidden=false; return; }
  f.reset(); toast('اتضاف المستخدم'); await refreshUsers(); });
/* ---------- term subscriptions (server only; docs/subscriptions-spec.md): pending receipts first, activate / reject / close, grant with no receipt ---------- */
const termNow=()=>/2/.test((COURSE&&COURSE.term)||'')?'t2':'t1', TNAME={t1:'الترم الأول',t2:'الترم التاني'};
const STN={pending:'منتظر المراجعة',active:'مفعّل',rejected:'مرفوض',closed:'مقفول'};
const post=(path,body)=>fetch(S.api+path,{method:body?'POST':'GET',credentials:'include',headers:hdr(),body:body?JSON.stringify(body):undefined}).then(r=>r.json()).catch(()=>null);
const subOf=id=>{ const r=(SRV.subs||[]).filter(x=>x.child===id&&x.st==='active'&&x.until>Date.now()); return r.length?'مفعّل: '+r.map(x=>TNAME[x.term.split(':')[1]]).join('، '):'بدون اشتراك'; };
async function loadSubs(){ if(!S.api){ drawSubs(); return; } const r=await post('/admin/subs?st=all'); if(r&&r.subs){ SRV.subs=r.subs; } drawSubs(); drawUsers(); }
const SB_MSG='مقدرناش نتأكد من الدفع. ابعتي صورة الإيصال تاني من صفحة اشتراكاتي.';
function drawSubs(){ const box=$('#subsList'), all=$('#sb-all').checked, L=(SRV.subs||[]).filter(x=>all||x.st==='pending');
  $('#sb-where').textContent=SRV.subs?'الإيصالات المرفوعة من التطبيق. التفعيل بيفضل لحد ٣١ أغسطس، والرفض بيقفل الدروس فورًا وبيبعت رسالتك لولي الأمر.':'الاشتراكات مش ظاهرة دلوقتي. اتأكدي من الإنترنت وكلمة السر.';
  box.innerHTML=L.length?`<div class="utwrap"><table class="utbl sbtbl"><thead><tr><th>المستخدم</th><th>الطالب</th><th>الترم</th><th>تاريخ الاشتراك</th><th>رقم العملية</th><th>الإيصال</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>`+L.map(x=>`<tr data-c="${esc(x.child)}" data-t="${esc(x.term)}">
    <td dir="ltr" class="u-tx">${esc(x.email||'')}${x.email&&x.phone?'<br>':''}${esc(x.phone||'')}</td><td><b>${esc(x.name)}</b>${x.inv?`<small>جاي من دعوة: ${esc(x.inv)}</small>`:''}</td><td>${TNAME[x.term.split(':')[1]]||esc(x.term)}${x.price?`<small>${ar(x.price)} جنيه</small>`:''}</td><td class="u-dt">${fmtD(x.at)||'—'}</td><td dir="ltr">${esc(x.ref||'—')}</td>
    <td>${x.receipt?'<button type="button" class="ghost" data-act="rc">عرض الإيصال</button>':'—'}</td><td><span class="stb ${x.st==='active'?'open':''}">${STN[x.st]||x.st}</span>${x.st==='rejected'&&x.note?`<small>${esc(x.note)}</small>`:''}</td>
    <td class="sb-act">${x.st!=='active'?'<button type="button" class="pri" data-act="activate">تفعيل</button>':''}${x.st==='pending'||x.st==='active'?'<button type="button" class="u-del" data-act="reject">رفض</button>':''}</td></tr>`).join('')+'</tbody></table></div>':'<p class="empty">مفيش اشتراكات هنا.</p>'; }
$('#subsList').addEventListener('click',async e=>{ const b=e.target.closest('[data-act]'); if(!b||b.disabled) return; const r=b.closest('tr'), c=r.dataset.c, t=r.dataset.t, act=b.dataset.act, row=(SRV.subs||[]).find(x=>x.child===c&&x.term===t)||{};
  if(act==='rc') return showReceipt(c,t);
  if(act==='activate'){ b.disabled=true; const x=await post('/admin/sub',{child:c,term:t,action:'activate'}); if(x&&x.ok) toast('الاشتراك اتفعّل'); else { const g=await post('/admin/sub/grant',{child:c,term:t}); toast(g&&g.ok?'الاشتراك اتفعّل':'ما اتفعّلش، جربي تاني'); } return loadSubs(); }
  if(act==='reject'){ uModal(`<h3>رفض الاشتراك</h3><p class="u-q">اكتبي سبب الرفض لـ <b>${esc(row.name||'')}</b>. هتوصل لولي الأمر كإشعار في التطبيق وعلى الإيميل المسجل.</p><textarea id="u-rmsg" rows="4">${esc(SB_MSG)}</textarea>
      <div class="u-btns"><button type="button" class="u-del" data-m="send">رفض وإرسال الرسالة</button><button type="button" class="ghost" data-m="x">إلغاء</button></div>`);
    $('#u-modal-in [data-m=send]').onclick=async()=>{ const msg=$('#u-rmsg').value.trim()||SB_MSG; const x=await post('/admin/sub',{child:c,term:t,action:'reject',message:msg}); uClose();
      toast(x&&x.ok?(x.mailed?'اترفض واتبعتت الرسالة في التطبيق وعلى الإيميل':'اترفض واتبعتت الرسالة في التطبيق'):'ما اترفضش، جربي تاني'); loadSubs(); }; } });
$('#sb-all').addEventListener('change',drawSubs);
$('#u-form').addEventListener('submit',async e=>{ e.preventDefault(); const f=e.target, er=$('.u-err',f), v=n=>f.elements[n].value.trim(); er.hidden=true;
  const body={email:v('email'),phone:v('phone'),kid:v('kid'),grade:v('grade')};
  if(!body.email&&!body.phone){ er.textContent='اكتبي الإيميل أو الموبايل'; er.hidden=false; return; } if(!body.kid){ er.textContent='اكتبي اسم الطالب'; er.hidden=false; return; }
  const x=await post('/admin/user',body); if(!x||!x.ok){ er.textContent=U_ERR[x&&x.error]||'ما اتضافش، جربي تاني'; er.hidden=false; return; }
  f.reset(); toast('اتضاف المستخدم'); await refreshUsers(); });

function wallets(){ const out=[]; try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k.startsWith('es.wallet.')) out.push(lsGet(k,{bal:0,hist:[]})); } }catch(e){} return out; }
const KIND={promo:'برومو كود',share:'مشاركة',gift:'هدية',referral:'تسجيل من رابطه',refsub:'اشتراك من رابطه','unlock-lesson':'فتح درس','unlock-unit':'فتح وحدة'};
function drawStats(){
  const A=accounts(), W=wallets(), H=SRV.stats?SRV.stats.hist:W.flatMap(w=>w.hist||[]).sort((a,b)=>b.at-a.at);
  const earned=H.filter(h=>h.n>0).reduce((a,h)=>a+h.n,0), spent=-H.filter(h=>h.n<0).reduce((a,h)=>a+h.n,0), shares=H.filter(h=>h.k==='share');
  const today=new Date().toDateString(), newToday=A.filter(a=>a.created&&new Date(a.created).toDateString()===today).length;
  const K=[['حسابات أولياء الأمور',A.length,'users'],['حسابات اليوم',newToday,'users'],['الأطفال',A.reduce((a,x)=>a+x.kids.length,0),'users'],['المشاركات',shares.length,'shares','shares'],
    ['كريدتس اتكسبت',earned,'shares','acc'],['كريدتس اتصرفت',spent,'shares','spend'],['دروس اتفتحت',H.filter(h=>h.k==='unlock-lesson').length,'shares','spend']];
  $('#kpis').innerHTML=K.map(([l,v,p,h])=>`<button type="button" class="kpi" data-go="${p}" data-h="${h||''}"><b>${ar(v)}</b><span>${l}</span></button>`).join('');
  $$('#kpis .kpi').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.h) SH.t=b.dataset.h; showTab(b.dataset.go); if(b.dataset.go==='shares') drawShares(); }));
  drawShares();
  const name=id=>{ const t=(S.coins.shares||[]).find(x=>x.id===id); return t?t.ar:id||''; };
  $('#hist').innerHTML=H.length?`<div class="row hr h"><span>الوقت</span><span>النوع</span><span>التفاصيل</span><span>كريدتس</span></div>`+H.slice(0,40).map(h=>`<div class="row hr"><span>${fmt(h.at)}</span><span>${KIND[h.k]||h.k}</span><span>${esc(h.k==='share'?name(h.t):h.k==='promo'?(h.code?h.code+' · ':'')+(h.id||''):h.id||'')}</span><b dir="ltr">${h.n>0?'+':''}${h.n}</b></div>`).join(''):'<p class="empty">مفيش حركات كريدتس على الجهاز ده لسه.</p>';
}

/* ---------- the shares tab (Ahmed 2026-11-16): who shared, the credits each account earned / spent, what they bought with them and how many lessons were opened with credits.
   Same data as the stats list (server: GET api/admin/stats hist, each row has the account's email / mobile and the child's name; no server: this device's wallets). ---------- */
const SH={t:'acc'};
function shHist(){ const A=accounts(); if(SRV.stats) return SRV.stats.hist.map(h=>({...h,acc:h.pid||h.parent||''}));
  return wallets().flatMap(w=>(w.hist||[]).map(h=>({...h,acc:'device',email:(A[0]&&mailOf(A[0]))||'',phone:(A[0]&&A[0].phone)||''}))); }
const shWho=h=>{ const m=h.email&&!/@phone\.local$/.test(h.email)?h.email:'', p=h.phone||''; return [m,p].filter(Boolean).join(' · ')||h.parent||'—'; };
function shItem(id){ id=String(id||''); if(!id) return '—';
  const lid=id.replace(/^l:/,''); for(const s of (COURSE&&COURSE.subjects)||[]){ const l=(s.lessons||[]).find(x=>x.id===lid); if(l) return s.name+' · الدرس '+ar(l.lesson)+' '+(l.title||l.planned||''); }
  const u=id.match(/^u:([\w-]+):(\d+)$/); if(u){ const s=((COURSE&&COURSE.subjects)||[]).find(x=>x.id===u[1]); return (s?s.name+' · ':'')+'الوحدة '+ar(u[2]); }
  return id; }
function drawShares(){ const box=$('#sh-body'); if(!box) return; const H=shHist(), q=nrm($('#sh-q').value), T=SH.t;
  $$('#sh-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.h===T));
  $('#sh-where').textContent=SRV.stats?'':'الأرقام دي من الجهاز ده بس لحد ما السيرفر يشتغل.';
  const sharesName=id=>{ const t=(S.coins.shares||[]).find(x=>x.id===id); return t?t.ar:id||''; };
  const hit=s=>!q||nrm(s).includes(q); let head='', rows=[];
  if(T==='acc'){ const M={}; H.forEach(h=>{ const o=M[h.acc]=M[h.acc]||{who:shWho(h),earn:0,spent:0,sh:0,les:0,uni:0,bal:h.bal,last:0,items:[]};
      if(h.n>0) o.earn+=h.n; else o.spent-=h.n; if(h.k==='share') o.sh++; if(h.k==='unlock-lesson'){ o.les++; o.items.push(shItem(h.id)); } if(h.k==='unlock-unit'){ o.uni++; o.items.push(shItem(h.id)); } o.last=Math.max(o.last,h.at||0); });
    head='<tr><th>الحساب</th><th>مشاركات</th><th>كريدتس اتكسبت</th><th>كريدتس اتصرفت</th><th>الرصيد</th><th>دروس اتفتحت</th><th>وحدات اتفتحت</th><th>صرفها في</th></tr>';
    rows=Object.values(M).sort((a,b)=>b.last-a.last).filter(o=>hit(o.who+' '+o.items.join(' '))).map(o=>`<tr><td dir="ltr" class="u-tx">${esc(o.who)}</td><td>${ar(o.sh)}</td><td>${ar(o.earn)}</td><td>${ar(o.spent)}</td><td>${o.bal==null?'—':ar(o.bal)}</td><td>${ar(o.les)}</td><td>${ar(o.uni)}</td><td>${o.items.length?o.items.map(esc).join('<br>'):'—'}</td></tr>`); }
  else if(T==='shares'){ head='<tr><th>الوقت</th><th>الحساب</th><th>اتشارك عن طريق</th><th>كريدتس</th></tr>';
    rows=H.filter(h=>h.k==='share'&&hit(shWho(h)+' '+sharesName(h.t))).map(h=>`<tr><td>${fmt(h.at)}</td><td dir="ltr" class="u-tx">${esc(shWho(h))}</td><td>${esc(sharesName(h.t))}</td><td>+${ar(h.n)}</td></tr>`); }
  else { head='<tr><th>الوقت</th><th>الحساب</th><th>الطفل</th><th>اتفتح إيه</th><th>كريدتس</th></tr>';
    rows=H.filter(h=>/^unlock/.test(h.k)&&hit(shWho(h)+' '+(h.kid||'')+' '+shItem(h.id))).map(h=>`<tr><td>${fmt(h.at)}</td><td dir="ltr" class="u-tx">${esc(shWho(h))}</td><td>${esc(h.kid||'—')}</td><td>${esc(shItem(h.id))}</td><td>${ar(-h.n)}</td></tr>`); }
  $('#sh-head').innerHTML=head; $('#sh-count').textContent=ar(rows.length)+(T==='acc'?' حساب':' حركة');
  box.innerHTML=rows.length?rows.join(''):'<tr><td colspan="8"><p class="empty">مفيش بيانات لسه.</p></td></tr>'; }
$$('#sh-tabs button').forEach(b=>b.addEventListener('click',()=>{ SH.t=b.dataset.h; drawShares(); })); $('#sh-q').addEventListener('input',drawShares);

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
  $('#rp-count').textContent=ar(L.length)+' بلاغ';
  $('#reports').innerHTML=L.length?L.map(r=>`<div class="rep${r.status==='done'?' done':''}" data-id="${esc(r.id)}">
    <div class="rep-top"><b>${esc(rpPlace(r))}</b><span class="rep-at">${fmt(r.at)}</span></div>
    ${r.kind?`<span class="rep-kind">${esc(RPKIND[r.kind]||r.kind)}</span>`:''}${r.comment?`<p class="rep-c">${esc(r.comment)}</p>`:'<p class="rep-c none">من غير تعليق</p>'}
    ${r.ctx&&r.ctx.task?`<p class="rep-t">${esc(r.ctx.task)}</p>`:''}
    <div class="rep-act"><button data-s="${r.status==='done'?'open':'done'}">${r.status==='done'?'رجّعيه مفتوح':'اتحل ✓'}</button></div></div>`).join(''):'<p class="empty">مفيش بلاغات.</p>';
  $$('#reports .rep').forEach(d=>$('button',d).addEventListener('click',async e=>{ const id=d.dataset.id, s=e.target.dataset.s;
    if(SRV.reports){ const ok=await apiPost('/admin/report/'+id,{status:s}); if(!ok) return toast('مش متاح دلوقتي، حاولي تاني'); const r=SRV.reports.find(x=>x.id===id); if(r) r.status=s; }
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
  if(!r){ c.textContent='الإشعارات مش متاحة دلوقتي. اتأكدي من الإنترنت وكلمة السر.'; $('#pu-list').innerHTML=''; return; }
  c.textContent=ar(r.subs)+' جهاز مفعّل الإشعارات'+(r.ready?'':' — الإشعارات لسه مش جاهزة للإرسال');
  $('#pu-list').innerHTML=r.msgs.length?r.msgs.map(m=>`<div class="rep"><div class="rep-top"><b>${esc(m.title)}</b><span class="rep-at">${fmt(m.at)}</span></div><p class="rep-c">${esc(m.body)}</p><span class="rep-kind">وصلت لـ ${ar(m.sent)} جهاز${m.gone?' — اتشال '+ar(m.gone)+' جهاز مقفول':''}</span></div>`).join(''):'<p class="empty">لسه ما بعتّيش حاجة.</p>'; }
$('#pu-send').addEventListener('click',async()=>{
  const title=$('#pu-title').value.trim(), body=$('#pu-body').value.trim(), url=$('#pu-url').value.trim(); if(!title||!body) return toast('اكتبي العنوان والنص');
  if(!S.api) return toast('مش متاح دلوقتي، حاولي تاني');
  if(!confirm('تبعتي الإشعار ده لكل الأجهزة المفعّلة؟\n\n'+title+'\n'+body)) return;
  const btn=$('#pu-send'); btn.disabled=true;
  try{ const r=await apiPost('/admin/push/send',{title,body,url}); if(!r||!r.id) return toast('ماتبعتش');
    let left=1, tries=0; while(left>0&&tries++<200){ const d=await apiPost('/admin/push/deliver/'+r.id,{}); if(!d) { toast('وقف في النص، دوسي ابعت تاني'); break; } left=d.left; btn.textContent='بيتبعت… باقي '+ar(left); }
    $('#pu-title').value=$('#pu-body').value=''; toast('اتبعت'); }
  finally{ btn.disabled=false; btn.textContent='ابعت لكل الأجهزة'; loadPush(); } });

/* ---------- tabs + save / download / reset ---------- */
function showTab(p,keep){ const b=$('#tabs button[data-p="'+p+'"]'); if(!b) return; $$('#tabs button').forEach(x=>x.classList.toggle('on',x===b)); $$('.page').forEach(q=>q.hidden=q.id!=='p-'+p); if(!keep){ try{ localStorage.setItem('es.adminTab',p); }catch(e){} try{ history.replaceState(null,'','#'+p); }catch(e){} }
  if(keep) return; if(p==='stats') drawStats(); if(p==='users') drawUsers(); if(p==='subs') drawSubs(); if(p==='push'){ puInit(); loadPush(); } }
$$('#tabs button').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.p)));
{ let t=location.hash.replace('#',''); if(!t){ try{ t=localStorage.getItem('es.adminTab')||''; }catch(e){} } if(t) showTab(t,true); }   // a refresh stays on the same tab
$('#save').addEventListener('click',async()=>{ if(LOCKED) return toast('الحفظ متوقف دلوقتي'); const btn=$('#save'); btn.disabled=true;
  try{ let st=0,r=null; try{ const x=await fetch(S.api+'/admin/settings',{method:'PUT',cache:'no-store',credentials:'include',headers:hdr(),body:JSON.stringify(S)}); st=x.status; r=await x.json().catch(()=>null); }catch(e){ st=-1; }
    if(!(st===200&&r&&r.ok)) return toast(st===-1?'ما اتحفظش: مفيش اتصال بالسيرفر. اتأكدي من الإنترنت وحاولي تاني':(st===401||st===403)?'ما اتحفظش: كلمة السر مش مظبوطة (زرار «كلمة السر»)':'ما اتحفظش: السيرفر رجّع خطأ ('+st+(r&&r.error?' '+r.error:'')+'). حاولي تاني');
    const back=await api('/admin/settings');   // read it back from the server: success is shown only if it is really there
    if(!(back&&back.coins&&JSON.stringify(back.coins)===JSON.stringify(S.coins)&&JSON.stringify(back.subs||{})===JSON.stringify(S.subs||{}))) return toast('ما اتحفظش بشكل مؤكد: السيرفر ما رجّعش اللي اتكتب. حاولي تاني');
    dirty=false; btn.textContent='حفظ'; toast('اتحفظ على السيرفر وتأكدنا منه'); }
  finally{ btn.disabled=false; } });

$$('#stabs button').forEach(b=>b.addEventListener('click',()=>{ $$('#stabs button').forEach(x=>x.classList.toggle('on',x===b)); $$('#p-settings [data-st]').forEach(c=>c.hidden=c.dataset.st!==b.dataset.s); }));
$$('#p-settings [data-st]').forEach(c=>c.hidden=c.dataset.st!=='contact');
boot().catch(e=>{ $('#where').textContent='الصفحة ما اتحمّلتش كاملة، افتحيها تاني.'; });

/* admin password (ADMIN_TOKEN) for use without a domain: kept on this device, sent as Authorization Bearer */
{ const b=document.getElementById('tok'); if(b){ const show=()=>{ b.textContent=tokGet()?'كلمة السر: محفوظة ✓':'كلمة السر'; }; show();
  b.addEventListener('click',()=>{ const v=prompt('اكتبي كلمة سر لوحة الإدارة.',''); if(v===null) return; try{ if(v.trim()) localStorage.setItem('es.adminToken',v.trim()); else localStorage.removeItem('es.adminToken'); }catch(e){} show(); location.reload(); }); } }
