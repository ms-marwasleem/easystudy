/* EASY WORDS — the test builder (the ? button on a subject). The parent marks whole units, single lessons, single words, or any mix; chooses how many questions
   and which kinds; the questions then run one by one in the practice tab's own templates (not one test page). Units / lessons / words are collapsed:
   a tap opens one, the next tap closes it (the map itself keeps everything open). */
const et={ sel:new Set(), n:10, types:new Set(['missing','order','picture','match']), open:new Set() };
const ET_TYPES=[['missing','حرف ناقص'],['order','ترتيب الحروف'],['picture','إملاء الكلمة'],['match','توصيل']];
async function ewTestOpen(){
  const s=EW.cur; if(!s) return;
  busy(true); try{ for(const u of ewUnits(s)) for(const l of u.lessons) if(l.open) await ewLesson(l.id); }catch(e){} busy(false);
  et.sel=new Set(); et.open=new Set(); show('ewTest'); ewtDraw(s);
}
function ewtDraw(s){
  const ar=EW_SUBJ[s.id].lang==='ar', body=$('#ewTestBody'); body.scrollTop=0; $('#ewTestTitle').textContent='اختبار';
  const units=ewUnits(s), dir=ar?'rtl':'ltr';
  // the choices first (how many, which kinds, weak words only, start), then the lessons / words in the map's own look (smaller squares); not chosen = faded, chosen = full colour
  body.innerHTML=`<div class="ewt-opts">
    <div class="ewt-grp"><b>عدد الأسئلة</b><div class="ewt-chips" data-g="n">${[5,10,15,20].map(n=>`<button class="ewt-chip${n===et.n?' on':''}" data-n="${n}">${ewN(n)}</button>`).join('')}</div></div>
    <div class="ewt-grp"><b>نوع الأسئلة</b><div class="ewt-chips" data-g="t">${ET_TYPES.map(([k,l])=>`<button class="ewt-chip${et.types.has(k)?' on':''}" data-t="${k}">${l}</button>`).join('')}</div></div>
  </div>
  <p class="ewt-help">اختار الوحدات أو الدروس أو الكلمات اللي عايز تختبره فيها</p>
  <button class="ewt-weak">الكلمات الضعيفة فقط</button>
  <div class="ewt-tree">${units.map(u=>`<section class="ew-unit ewt-unit" data-k="u${u.unit}"><div class="ew-utab ewt-pick" data-k="u${u.unit}" dir="${dir}"><span>${u.name}</span></div><div class="ew-ubody">`+u.lessons.map(l=>{
    const L=l.open&&EW.les[l.id], num=ar?ewN(l.lesson):l.lesson;
    return `<div class="ew-lrow${L?'':' solo'}"><button class="ew-lsq ewt-pick${L?'':' soon'}" data-k="l${l.id}" ${L?'':'disabled'}><b class="ew-lnum">${num}</b><span class="ew-lname" dir="${dir}">${l.name}</span>${L?'':'<i>قريبًا</i>'}</button>`+
      (L?`<div class="ew-words">${L.vocab.map(v=>`<button class="ew-wsq ewt-pick" data-k="w${v.key}" aria-label="${v.word}"><span class="ew-wimg">${v.img?`<img src="${v.img}" alt=""${/\.png$/i.test(v.img)?' class="cut"':''}>`:''}</span><b dir="${dir}">${v.word}</b></button>`).join('')}</div>`:'')+`</div>`; }).join('')+`</div></section>`).join('')}</div>
  <div class="ewt-go"><span class="ewt-sum"></span><button class="ewt-start pill green">ابدأ الاختبار</button></div>`;
  body.classList.toggle('ewt-ar',ar);
  ewtPaint();
}
// the words under a unit tab / lesson square / word square
const ewtWords=node=>{ const k=node.dataset.k;
  if(k[0]==='w') return [k.slice(1)];
  if(k[0]==='l') return $$('.ew-wsq',node.closest('.ew-lrow')).map(w=>w.dataset.k.slice(1));
  return $$('.ew-wsq',node.closest('.ew-unit')).map(w=>w.dataset.k.slice(1)); };
const ewtWeak=()=>$$('.ew-wsq',$('#ewTestBody')).map(w=>w.dataset.k.slice(1)).filter(key=>ewClass({key})==='weak');   // the weak words shown in the lists
function ewtPaint(){
  const body=$('#ewTestBody'), t=$('.ewt-start',body), n=et.sel.size;
  $$('.ewt-pick',body).forEach(nd=>{ if(nd.classList.contains('soon')) return; const all=ewtWords(nd), c=all.filter(k=>et.sel.has(k)).length;
    nd.classList.toggle('all',all.length>0&&c===all.length); nd.classList.toggle('some',c>0&&c<all.length); });
  const wk=ewtWeak(); $('.ewt-weak',body).classList.toggle('on',wk.length>0&&wk.every(k=>et.sel.has(k)));
  $('.ewt-sum',body).textContent=n?`${ewN(n)} كلمة مختارة`:'ما اخترتش كلمات'; t.disabled=!n||!et.types.size;
}
$('#ewTestBody').addEventListener('click',e=>{
  const body=$('#ewTestBody'), nd=e.target.closest('.ewt-pick'), chip=e.target.closest('.ewt-chip');
  if(chip){ if(chip.dataset.n){ et.n=+chip.dataset.n; $$('[data-g="n"] .ewt-chip',body).forEach(c=>c.classList.toggle('on',c===chip)); } else { const k=chip.dataset.t; if(et.types.has(k)&&et.types.size>1) et.types.delete(k); else et.types.add(k); chip.classList.toggle('on',et.types.has(k)); ewtPaint(); } return; }
  if(e.target.closest('.ewt-weak')){ const wk=ewtWeak(), on=wk.length>0&&wk.every(k=>et.sel.has(k)); wk.forEach(k=>{ if(on) et.sel.delete(k); else et.sel.add(k); }); ewtPaint(); return; }   // marks every weak word in the lists (again = unmarks)
  if(e.target.closest('.ewt-start')){ ewtStart(); return; }
  if(!nd||nd.classList.contains('soon')) return; blip(600);
  const all=ewtWords(nd), full=all.length>0&&all.every(k=>et.sel.has(k)); all.forEach(k=>{ if(full) et.sel.delete(k); else et.sel.add(k); }); ewtPaint();
});
function ewtStart(){
  const pool=[]; Object.values(EW.les).forEach(L=>L.vocab.forEach(v=>{ if(et.sel.has(v.key)) pool.push(v); }));
  if(!pool.length) return;
  const L=ewVirtual('ew-test','اختبار',pool,{tabs:[],ep:{pool,n:et.n,types:[...et.types]},epSrc:'test',startTab:'practice'});
  ewEnter(L,0);
}
$('#ewTestBtn').addEventListener('click',()=>{ blip(600); ewTestOpen(); });
$('#ewTestBack').addEventListener('click',()=>openMap());
