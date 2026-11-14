/* EASY WORDS — the test builder (the ? button on a subject). The parent marks whole units, single lessons, single words, or any mix; chooses how many questions
   and which kinds; the questions then run one by one in the practice tab's own templates (not one test page). Units / lessons / words are collapsed:
   a tap opens one, the next tap closes it (the map itself keeps everything open). */
const et={ sel:new Set(), n:10, types:new Set(['missing','order','picture','match']), open:new Set() };
const ET_TYPES=[['missing','حرف ناقص'],['order','ترتيب الحروف'],['picture','صورة واكتب'],['match','توصيل']];
async function ewTestOpen(){
  const s=EW.cur; if(!s) return;
  busy(true); try{ for(const u of ewUnits(s)) for(const l of u.lessons) if(l.open) await ewLesson(l.id); }catch(e){} busy(false);
  et.sel=new Set(); et.open=new Set(); show('ewTest'); ewtDraw(s);
}
function ewtDraw(s){
  const ar=EW_SUBJ[s.id].lang==='ar', body=$('#ewTestBody'); body.scrollTop=0; $('#ewTestTitle').textContent='اختبار';
  const units=ewUnits(s);
  body.innerHTML=`<p class="ewt-help">علّم الوحدات أو الدروس أو الكلمات اللي عايز تختبره فيها</p>
  <div class="ewt-tree">${units.map(u=>{ const ls=u.lessons;
    return `<div class="ewt-node ewt-unit${ls.some(l=>l.open)?'':' soon'}" data-k="u${u.unit}"><div class="ewt-row"><button class="ewt-chk" aria-label="تحديد"></button><button class="ewt-name" dir="${ar?'rtl':'ltr'}"><span>${u.name}</span><small class="ewt-cnt"></small></button><i class="ewt-chev"></i></div>
      <div class="ewt-kids">${ls.map(l=>{ const L=l.open&&EW.les[l.id];
        return `<div class="ewt-node ewt-lesson${L?'':' soon'}" data-k="l${l.id}"><div class="ewt-row"><button class="ewt-chk" aria-label="تحديد"></button><button class="ewt-name" dir="${ar?'rtl':'ltr'}"><span>${ar?ewN(l.lesson):l.lesson} · ${l.name}</span><small class="ewt-cnt">${L?'':'قريبًا'}</small></button><i class="ewt-chev"></i></div>
          <div class="ewt-kids">${L?L.vocab.map(v=>`<div class="ewt-node ewt-word" data-k="w${v.key}"><div class="ewt-row"><button class="ewt-chk" aria-label="تحديد"></button><span class="ewt-wimg">${v.img?`<img src="${v.img}" alt="">`:''}</span><b dir="${v.lang==='ar'?'rtl':'ltr'}">${v.word}</b></div></div>`).join(''):''}</div></div>`; }).join('')}</div></div>`; }).join('')}</div>
  <div class="ewt-opts">
    <div class="ewt-grp"><b>عدد الأسئلة</b><div class="ewt-chips" data-g="n">${[5,10,15,20].map(n=>`<button class="ewt-chip${n===et.n?' on':''}" data-n="${n}">${ewN(n)}</button>`).join('')}</div></div>
    <div class="ewt-grp"><b>نوع الأسئلة</b><div class="ewt-chips" data-g="t">${ET_TYPES.map(([k,l])=>`<button class="ewt-chip${et.types.has(k)?' on':''}" data-t="${k}">${l}</button>`).join('')}</div></div>
    <div class="ewt-go"><button class="ewt-weak">اختار الكلمات الضعيفة</button><button class="ewt-all">اختار الكل</button><span class="ewt-sum"></span><button class="ewt-start pill green">ابدأ الاختبار</button></div>
  </div>`;
  ewtPaint();
}
const ewtWords=node=>{ const k=node.dataset.k; if(k[0]==='w') return [k.slice(1)]; return $$('.ewt-word',node).map(w=>w.dataset.k.slice(1)); };
function ewtPaint(){
  const body=$('#ewTestBody'), t=$('.ewt-start',body), n=et.sel.size;
  $$('.ewt-node',body).forEach(nd=>{ const all=ewtWords(nd), c=all.filter(k=>et.sel.has(k)).length;
    nd.classList.toggle('all',all.length>0&&c===all.length); nd.classList.toggle('some',c>0&&c<all.length); nd.classList.toggle('open',et.open.has(nd.dataset.k));
    const cnt=$('.ewt-cnt',nd); if(cnt&&!nd.classList.contains('soon')) cnt.textContent=all.length?`${ewN(c)}/${ewN(all.length)}`:''; });
  $('.ewt-sum',body).textContent=n?`${ewN(n)} كلمة مختارة`:'ما اخترتش كلمات'; t.disabled=!n||!et.types.size;
}
$('#ewTestBody').addEventListener('click',e=>{
  const body=$('#ewTestBody'), nd=e.target.closest('.ewt-node'), chip=e.target.closest('.ewt-chip');
  if(chip){ if(chip.dataset.n){ et.n=+chip.dataset.n; $$('[data-g="n"] .ewt-chip',body).forEach(c=>c.classList.toggle('on',c===chip)); } else { const k=chip.dataset.t; if(et.types.has(k)&&et.types.size>1) et.types.delete(k); else et.types.add(k); chip.classList.toggle('on',et.types.has(k)); ewtPaint(); } return; }
  if(e.target.closest('.ewt-all')){ $$('.ewt-word',body).forEach(w=>et.sel.add(w.dataset.k.slice(1))); ewtPaint(); return; }
  if(e.target.closest('.ewt-weak')){ et.sel=new Set(); $$('.ewt-word',body).forEach(w=>{ const key=w.dataset.k.slice(1); if(ewClass({key})==='weak') et.sel.add(key); }); ewtPaint(); return; }
  if(e.target.closest('.ewt-start')){ ewtStart(); return; }
  if(!nd||nd.classList.contains('soon')) return;
  if(e.target.closest('.ewt-chk')||(nd.classList.contains('ewt-word')&&e.target.closest('.ewt-row'))){ const all=ewtWords(nd), full=all.every(k=>et.sel.has(k)); all.forEach(k=>full?et.sel.delete(k):et.sel.add(k)); ewtPaint(); return; }
  if(e.target.closest('.ewt-row')){ const k=nd.dataset.k; if(et.open.has(k)) et.open.delete(k); else et.open.add(k); ewtPaint(); }   // a tap opens it, the next tap closes it
});
function ewtStart(){
  const pool=[]; Object.values(EW.les).forEach(L=>L.vocab.forEach(v=>{ if(et.sel.has(v.key)) pool.push(v); }));
  if(!pool.length) return;
  const L=ewVirtual('ew-test','اختبار',pool,{tabs:[],ep:{pool,n:et.n,types:[...et.types]},epSrc:'test',startTab:'practice'});
  ewEnter(L,0);
}
$('#ewTestBtn').addEventListener('click',()=>{ blip(600); ewTestOpen(); });
$('#ewTestBack').addEventListener('click',()=>openMap());
