/* DEEP LINK (2026-11-09, Ahmed): an address ending in ?go=<subject>[/<place>[/<tab>]] opens that place inside the app. Used by the notification link
   (admin.html -> الإشعارات builds it from lists), and works from any shared link. place = a lesson folder (u1l3) | a unit (unit-5, opens that subject's map)
   | an exam paper (x-<exam id>, a lesson's or a unit's). tab = read | words | quiz | booklet | workbook | grammar.
   Safe by design: a place that does not exist, is not built yet, or is locked / "soon" just opens the subject's map; no child profile yet = normal first launch. */
function deepGo(){
  let go=''; try{ go=new URLSearchParams(location.search).get('go')||''; }catch(e){}
  if(!go) return;
  try{ const u=new URL(location.href); u.searchParams.delete('go'); history.replaceState(null,'',u.pathname+(u.search||'')+u.hash); }catch(e){}   // a reload does not repeat it
  const [sid,place,tabName]=go.split('/'), s=COURSE.subjects.find(x=>x.id===sid&&x.open&&x.lessons);
  if(!s||!kidNow()) return;
  SUBJECT=s;
  needRest(async()=>{
    const m=place&&s.lessons.find(l=>l.folder===place&&l.file);
    if(m){
      if(accessOf(m,!!m.file,'l:'+m.id).st!=='open') return openMap();
      if(tabName&&['read','words','quiz','booklet','workbook','grammar'].includes(tabName)) return bookOpen(m,tabName);
      return openLesson(m);
    }
    const xm=/^x-([\w-]+)$/.exec(place||'');
    if(xm){
      const lm=s.lessons.find(l=>(l.exams||[]).some(e=>e.id===xm[1]));
      if(lm){ const ex=lm.exams.find(e=>e.id===xm[1]); return openExam(lm,ex); }
      const un=(s.units||[]).find(u=>(u.exams||[]).some(e=>e.id===xm[1]));
      if(un){ const ex=un.exams.find(e=>e.id===xm[1]); return openExam({unit:un.unit,folder:'t'+un.unit,id:s.id+':t'+un.unit,exams:un.exams,tabs:[]},ex); }
    }
    openMap();
  });
}
