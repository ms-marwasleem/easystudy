/* CURRICULUM — which subjects and books this child sees (Marwa 2026-11-05).
   data/curriculum.json holds the types (عام / تجريبي / private) and the private schools; the parent's pick is saved as
   {type, school} (es.curr, or the child profile later). currApply() filters the loaded data ONCE (home subjects, lessons,
   tabs, map signs, tests); every screen then simply shows what is there. Questions of a hidden book are dropped in qLoad
   (currSets) and lesson.json tabs in openLesson (currTabs). Never test for a school or subject anywhere else. */
let CURR=null, CURR_ALL=null;
const TAB_BOOK={read:'school',words:'school',quiz:'school',grammar:'school',workbook:'workbook',booklet:'booklet'};
const SET_BOOK={book:'school',lesson:'school',bq:'school',workbook:'workbook',booklet:'booklet'};   // English AL sets: lesson = the Lesson tab, bq = Book's questions (both the school's own curriculum)
function currPick(){ try{ const p=JSON.parse(localStorage.getItem('es.curr')||'null'); return p&&p.type?p:null; }catch(e){ return null; } }
function currSave(p){ try{ localStorage.setItem('es.curr',JSON.stringify(p)); }catch(e){} }
// the plan of a pick: {subjects:[ids], books:Set}. A private school = its base type + its own subjects and books.
/* SCHOOLS THAT NEED PERMISSION (Ahmed 2026-11-19): the dashboard marks a school "needs permission" (settings schoolPerm[id], default = the school's own "perm" in curriculum.json).
   A student of such a school sees only the base curriculum (its ministry books) until the admin grants THAT student (children.sgrant on the server -> curr.grant = 1 on the device). */
function schoolNeedsPerm(id){ try{ const o=(typeof ESET!=='undefined'&&ESET&&ESET.schoolPerm)||{}; if(o[id]!=null) return !!o[id]; const s=CURR&&CURR.schools&&CURR.schools.find(x=>x.id===id); return !!(s&&s.perm); }catch(e){ return false; } }
const schoolLocked=p=>!!(p&&p.school&&schoolNeedsPerm(p.school)&&!p.grant);
// the id of the curriculum that really applies (the base type of a locked school) - Easy Words keeps its curriculum as one id
const currEff=p=>p?(p.school?(schoolLocked(p)?((((CURR&&CURR.schools)||[]).find(s=>s.id===p.school)||{}).base||p.type):p.school):p.type):null;
function currRefresh(p){ if(CURR_ALL||typeof EW!=='undefined') currApply(p); }
function currPlan(p){
  const C=CURR||{types:[],schools:[]}, sc0=p&&p.school&&C.schools.find(s=>s.id===p.school), sc=schoolLocked(p)?null:sc0,
    ty=C.types.find(t=>t.id===(sc0?sc0.base:p&&p.type))||C.types.find(t=>t.subjects);
  if(!ty) return null;
  return {type:ty, school:sc||null, subjects:[...ty.subjects,...((sc&&sc.subjects)||[])], books:new Set([...ty.books,...((sc&&sc.books)||[])])};
}
let PLAN=null;
// the private school of the child (null for general / experimental). A vocab word tagged "school":"<id>" (a word that exists only in that school's booklet, Ahmed 2026-11-15) shows only for a child of that school; untagged words = the ministry curriculum, for everyone.
function currSchoolId(){ try{ if(PLAN&&PLAN.school) return PLAN.school.id; const k=typeof kidNow==='function'&&kidNow(), c=(k&&k.curr)||currPick(); return (c&&c.school&&!schoolLocked(c))?c.school:null; }catch(e){ return null; } }
const vocabFor=list=>(list||[]).filter(v=>v&&(!v.school||v.school===currSchoolId()));
const bookOn=k=>!PLAN||PLAN.books.has(k);
const tabOn=t=>bookOn(TAB_BOOK[t]||'school');
const currTabs=ts=>ts&&ts.filter(tabOn);
const currSets=sets=>(sets||[]).filter(s=>bookOn(SET_BOOK[s.book||'book']||s.book));
function currExams(sid,list){ if(!list) return list; const eb=(CURR&&CURR.examBooks&&CURR.examBooks[sid]); const out=list.filter(e=>bookOn(e.book||eb||'school')); return out.length?out:undefined; }
// one lesson of the map, as this curriculum sees it (null = the lesson belongs only to hidden books)
function currLesson(sid,l){
  const m={...l}; let had=0, kept=0;
  if(l.pages){ m.pages={}; Object.entries(l.pages).forEach(([t,v])=>{ had++; if(tabOn(t)){ m.pages[t]=v; kept++; } }); }
  if(l.tabs){ m.tabs=currTabs(l.tabs); if(!m.tabs.length) return null; }
  else if(had&&!kept) return null;
  if(l.exams) m.exams=currExams(sid,l.exams);
  return m;
}
// filter COURSE for the pick (or show everything when nothing is picked yet). Safe to call again after the pick changes.
function currApply(p){
  if(!CURR_ALL) CURR_ALL=COURSE.subjects.map(s=>({...s}));
  PLAN=p?currPlan(p):null;
  const order=PLAN?PLAN.subjects:CURR_ALL.map(s=>s.id);
  COURSE.subjects=order.map(id=>CURR_ALL.find(s=>s.id===id)).filter(Boolean).map(s0=>{
    const s={...s0}; if(!s0.lessons) return s;
    s.lessons=s0.lessons.map(l=>currLesson(s.id,l)).filter(Boolean);
    s.units=(s0.units||[]).map(u=>u.exams?{...u,exams:currExams(s.id,u.exams)}:u);
    return s;
  });
  if(typeof SUBJECT!=='undefined'&&SUBJECT) SUBJECT=COURSE.subjects.find(s=>s.id===SUBJECT.id)||null;
}
