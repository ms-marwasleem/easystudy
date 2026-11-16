/* EASY WORDS — a simple report for the parent: the words known well, the words to review, the weak words, tests taken and the average of the answers.
   2026-11-16: it is a page INSIDE the account area (one tab per child) and opens at once: only the lessons the child has practised are loaded first (in a pool of 6 at a time,
   they were read one after the other before = the slowness); the rest of the lessons only fill in the "not asked yet" count in the background.
   "Learn my weak words" opens the usual words template (and practice) on those words only, whatever lesson they come from. */
// the child's own word statistics: the active child's are the live ones, the others are kept under es.kid.<id>.* (js/welcome.js KID_KEYS)
function ewKidStats(k){ const cur=kidNow(), pre=cur&&cur.id===k.id?'':`es.kid.${k.id}.`, rd=(n,d)=>{ try{ return JSON.parse(localStorage.getItem(pre+n)||'null')||d; }catch(e){ return d; } };
  return {stats:rd('ew.stats',{}),log:rd('ew.log',[])}; }
const ewKidCurr=k=>{ const c=k&&k.curr; return c?(c.school||c.type):null; };
async function ewPool(ids,each){ let n=0; await Promise.all(Array.from({length:6},async()=>{ while(n<ids.length){ const id=ids[n++]; try{ const L=await ewLesson(id); if(L) each(L); }catch(e){} } })); }
// the lessons whose words count for this child: the open ones for the active child, the built ones for the others
function ewKidLessons(k){ const cur=kidNow(), same=cur&&cur.id===k.id, old=EW.curr; EW.curr=ewKidCurr(k);
  try{ return ewSubjects().flatMap(s=>ewUnits(s).flatMap(u=>u.lessons)).filter(l=>same?l.open:l.built&&l.st!=='soon'); }finally{ EW.curr=old; } }
const REP={kid:null,seq:0};
function ewReportOpen(id){ parentGate(()=>ewReportPage(id)); }
async function ewReportPage(id){
  const K=kids(); if(!K.length) return; const cur=kidNow(), k=K.find(x=>x.id===(id||REP.kid))||cur||K[0]; REP.kid=k.id; const seq=++REP.seq;
  let o=$('#repPage'); if(!o){ o=el('div','acctpage',''); o.id='repPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Report'); document.body.append(o); }
  const same=!!(cur&&cur.id===k.id), D=ewKidStats(k);
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back rp-back" aria-label="Back">${ICON.back}</button><h2>تقرير الكلمات</h2></div><div class="ac-in">
    ${K.length>1?`<div class="rp-kids">${K.map(x=>`<button class="rp-kid${x.id===k.id?' on':''}" data-kid="${x.id}">${wlEsc(x.name)}</button>`).join('')}</div>`:`<h3 class="rp-one">${wlEsc(k.name)}</h3>`}
    <div class="rp-body"><p class="ewt-help">ثواني...</p></div></div>`;
  $('.rp-back',o).addEventListener('click',()=>o.hidden=true);
  $$('.rp-kid',o).forEach(b=>b.addEventListener('click',()=>ewReportPage(b.dataset.kid)));
  o.hidden=false;
  // 1) only the lessons that have statistics: the page is drawn from these at once
  const lids=[...new Set(Object.keys(D.stats).map(x=>x.split('|')[0]))], words=[];
  await ewPool(lids,L=>L.vocab.forEach(v=>words.push(v))); if(seq!==REP.seq) return;
  const by={good:[],review:[],weak:[]}, cls=v=>{ const s=D.stats[v.key||v.word]; if(!s||!s.a) return null; const last=s.l[s.l.length-1], two=s.l.slice(-2), r=s.c/s.a;
    if(last===0||r<.5) return 'weak'; if(two.length>=2&&two.every(x=>x===1)&&r>=.7) return 'good'; return 'review'; };
  words.forEach(v=>{ const c=cls(v); if(c) by[c].push(v); });
  const tests=D.log.filter(x=>x.src==='test').length, rounds=D.log.length, qn=D.log.reduce((a,x)=>a+x.n,0), qr=D.log.reduce((a,x)=>a+x.right,0);
  const chips=(l,max)=>{ max=max||60; return l.length?`<div class="ew-words rep">${l.slice(0,max).map(v=>`<span class="ew-wsq"><span class="ew-wimg">${v.img?`<img src="${v.img}" alt="" loading="lazy">`:''}</span><b dir="${v.lang==='ar'?'rtl':'ltr'}">${v.word}</b></span>`).join('')}</div>${l.length>max?`<p class="ewt-help">و ${ewN(l.length-max)} كلمة كمان</p>`:''}`:'<p class="ewt-help">—</p>'; };
  const sec=(c,title,l,extra)=>`<section class="ac-card rp-sec ${c}"><div class="ew-rhead"><h3>${title} <em>${ewN(l.length)}</em></h3>${extra||''}</div>${chips(l)}</section>`;
  const body=$('.rp-body',o);
  body.innerHTML=`<div class="ew-rsum rp-sum"><div><b>${ewN(rounds)}</b><span>تدريبات واختبارات</span></div><div><b>${ewN(tests)}</b><span>اختبارات</span></div><div><b>${qn?ewN(Math.round(qr*100/qn))+'٪':'—'}</b><span>معدل الإجابات الصح</span></div></div>`+
    sec('weak','كلمات ضعيفة',by.weak,same&&by.weak.length?'<button class="pill green ew-learnweak">اتعلم الكلمات الضعيفة</button>':'')+
    sec('review','محتاجة مراجعة',by.review)+sec('good','حافظها كويس',by.good)+
    `<section class="ac-card rp-sec new"><div class="ew-rhead"><h3>لسه ما اتسألتش <em class="rp-newn">…</em></h3></div></section>`;
  const b=$('.ew-learnweak',body); if(b) b.addEventListener('click',()=>{ o.hidden=true; const a=$('#acctPage'); if(a) a.hidden=true; const L=ewVirtual('ew-weak','الكلمات الضعيفة',by.weak); ewEnter(L,0); });
  // 2) the rest of the lessons, in the background: only the count and a few examples
  const seen=new Set(lids), rest=ewKidLessons(k).filter(l=>!seen.has(l.id)).map(l=>l.id), fresh=[];
  await ewPool(rest,L=>L.vocab.forEach(v=>fresh.push(v))); if(seq!==REP.seq) return;
  const nw=words.filter(v=>!cls(v)).concat(fresh), n=$('.rp-newn',body); if(n) n.textContent=ewN(nw.length);
  const sc=$('.rp-sec.new',body); if(sc) sc.insertAdjacentHTML('beforeend',chips(nw,24));
}
{ const b=$('#ewRepBtn'); if(b) b.addEventListener('click',()=>{ blip(600); ewReportOpen(); }); }
