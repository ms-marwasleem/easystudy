/* EASY WORDS — accounts. The parent login, the children, the account page, subscriptions, credits and the bell are the SHARED code of the curriculum app
   (js/welcome.js, sync.js, subs.js, coins.js, push.js); this file only tells it what is different here: the words and the report. Own data (users, subscriptions, credits)
   lives on the Easy Words Worker + database, so the two apps never mix. The child's curriculum (and grade) is the one chosen in the student settings. */
wlAbout=()=>`<div class="wl-about" dir="rtl"><p class="wl-tag">اتعلّم كلمات المنهج بلعبة مسلية للأطفال</p><ul class="wl-pts"><li>حفظ الكلمات</li><li>كتابة وتهجئة</li><li>تدريبات وصور</li></ul></div>`;
// the shared code re-applies the child's pick after a change: here it only means "this is the curriculum now"
currApply=p=>{ EW.curr=currEff(p); };
ACH.rep='<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>';
acctExtraRows=()=>wlRow('ac-rep',ACH.rep,'تقرير الكلمات','');
acctExtraBind=o=>{ const b=$('.ac-rep',o); if(b) b.addEventListener('click',()=>ewReportPage(kidNow()&&kidNow().id)); };
// the line under the logo: the child's school year and the term of the lessons
function ewGradeLine(){ const k=kidNow(); return `${(k&&gradeLabel(k.grade))||'الصف الأول الابتدائي'} · ${subTermNow()==='t2'?'الترم الثاني':'الترم الأول'}`; }
