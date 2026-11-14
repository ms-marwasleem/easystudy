/* EASY WORDS — a simple report for the parent: the words known well, the words to review, the weak words, tests taken and the average of the answers.
   "Learn my weak words" opens the usual words template (and practice) on those words only, whatever lesson they come from. */
async function ewReportOpen(){
  busy(true); let words=[]; try{ words=await ewAllWords(); }catch(e){} busy(false);
  show('ewReport'); const body=$('#ewRepBody'); body.scrollTop=0;
  const by={good:[],review:[],weak:[],new:[]}; words.forEach(v=>by[ewClass(v)].push(v));
  const tests=EW.log.filter(x=>x.src==='test').length, rounds=EW.log.length, qn=EW.log.reduce((a,x)=>a+x.n,0), qr=EW.log.reduce((a,x)=>a+x.right,0);
  const chips=l=>l.length?`<div class="ew-words rep">${l.map(v=>`<span class="ew-wsq"><span class="ew-wimg">${v.img?`<img src="${v.img}" alt="">`:''}</span><b dir="${v.lang==='ar'?'rtl':'ltr'}">${v.word}</b></span>`).join('')}</div>`:'<p class="ewt-help">—</p>';
  const sec=(k,title,l,extra)=>`<section class="ew-rsec ${k}"><div class="ew-rhead"><h3>${title} <em>${ewN(l.length)}</em></h3>${extra||''}</div>${chips(l)}</section>`;
  body.innerHTML=`<div class="ew-rsum"><div><b>${ewN(rounds)}</b><span>تدريبات واختبارات</span></div><div><b>${ewN(tests)}</b><span>اختبارات</span></div><div><b>${qn?ewN(Math.round(qr*100/qn))+'٪':'—'}</b><span>معدل الإجابات الصح</span></div></div>`+
    sec('weak','كلمات ضعيفة',by.weak,by.weak.length?'<button class="pill green ew-learnweak">اتعلم الكلمات الضعيفة</button>':'')+
    sec('review','محتاجة مراجعة',by.review)+sec('good','حافظها كويس',by.good)+sec('new','لسه ما اتسألتش',by.new);
  const b=$('.ew-learnweak',body); if(b) b.addEventListener('click',()=>{ const L=ewVirtual('ew-weak','الكلمات الضعيفة',by.weak); ewEnter(L,0); });
}
{ const b=$('#ewRepBtn'); if(b) b.addEventListener('click',()=>{ blip(600); ewReportOpen(); }); }
