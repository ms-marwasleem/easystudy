/* EASY WORDS — data. The words app owns NO words: a word, its picture, syllables and sounds come BY REFERENCE from the curriculum app's own files
   (data/<subject>/subject.json = units and lessons, lesson.json "vocab" = the words), so one change there shows in both apps.
   Own here: which curriculum shows which subjects, which lessons are open (data/words/words.json), and the child's word statistics. */
const EW={ cfg:null, curr:null, cur:null, les:{}, stats:{}, log:[] };
// the subjects that have words; order = order on the home page. small/big/sub = the three lines of the icon (see words-ui.js ewIcon)
const EW_SUBJ={
  'arabic':{ name:'عربي كلمات', small:'عربي', big:'كلمات', lang:'ar' },
  'en-ol': { name:'English OL words', small:'ENGLISH', big:'OL', sub:'WORDS', lang:'en' },
  'en-al': { name:'English AL words', small:'ENGLISH', big:'AL', sub:'WORDS', lang:'en' }
};
try{ EW.curr=localStorage.getItem('ew.curr')||null; }catch(e){}
try{ EW.stats=JSON.parse(localStorage.getItem('ew.stats')||'{}')||{}; EW.log=JSON.parse(localStorage.getItem('ew.log')||'[]')||[]; }catch(e){}
const ewSave=()=>{ try{ localStorage.setItem('ew.stats',JSON.stringify(EW.stats)); localStorage.setItem('ew.log',JSON.stringify(EW.log.slice(-200))); }catch(e){} };
const ewN=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);   // the words app speaks Arabic to the parent and child: numbers in Arabic digits

async function ewLoad(){
  let CURR0;
  [COURSE,CURR0,EW.cfg]=await Promise.all([get('data/course.json'),get('data/curriculum.json'),get('data/words/words.json').catch(()=>({open:[]}))]);
  EW.CURR=CURR0;
  await Promise.all(Object.keys(EW_SUBJ).map(async id=>{
    const s=COURSE.subjects.find(x=>x.id===id); if(!s||!s.file) return;
    const d=await get(s.file), base=s.file.slice(0,s.file.lastIndexOf('/')+1);
    s.units=d.units; s.labels=d.labels; s.lessons=d.lessons.map(l=>({...l, id:`${s.id}-${l.folder}`, file:l.title?base+l.folder+'/lesson.json':null}));
  }));
}
// the choices shown on the first screen: General / Experimental / Private school (from the same data/curriculum.json the curriculum app uses)
function ewChoices(){ const C=EW.CURR; if(!C) return []; const out=C.types.filter(t=>!t.schools).map(t=>({id:t.id,ar:t.ar})); (C.schools||[]).forEach(s=>out.push({id:s.id,ar:'لغات',full:s.ar})); return out; }
// the subjects of the chosen curriculum that have words (a future subject, e.g. German, appears here once it is in EW_SUBJ and has lessons)
function ewSubjects(){
  const C=EW.CURR; if(!C||!EW.curr) return [];
  let ids=[]; const t=C.types.find(x=>x.id===EW.curr), sc=(C.schools||[]).find(x=>x.id===EW.curr);
  if(t) ids=t.subjects||[]; else if(sc){ const b=C.types.find(x=>x.id===sc.base); ids=[...(b?b.subjects:[]),...(sc.subjects||[])]; }
  if(t&&t.id==='tajribi'&&!ids.includes('en-al')) ids=[...ids,'en-al'];   // Ahmed 2026-11-14: English AL is in the experimental curriculum too
  return Object.keys(EW_SUBJ).filter(id=>ids.includes(id)).map(id=>COURSE.subjects.find(s=>s.id===id)).filter(s=>s&&s.lessons);
}
// the units of a subject as the words app shows them: only lessons that have a Words tab; unit name from the book's own unit names
function ewUnits(s){
  const by={}; (s.lessons||[]).forEach(l=>{ if(l.tabs&&!l.tabs.includes('words')) return; if(/^(test|تقييم|اختبار)/i.test(l.title||l.planned||'')) return; (by[l.unit]=by[l.unit]||[]).push(l); });
  return Object.keys(by).map(u=>{ const un=(s.units||[]).find(x=>x.unit==u)||{};
    return { unit:+u, name:s.id==='arabic'?`الوحدة ${ewN(u)}${un.title?' · '+un.title:''}`:`Unit ${u}`, lessons:by[u].map(l=>({...l,name:l.title||l.planned||'',open:!!l.file&&ewOpen(l.id)})) }; })
    .filter(u=>u.lessons.length&&(s.id!=='arabic'||u.unit<=5||u.lessons.some(l=>l.open)));
}
const ewOpen=id=>!!(EW.cfg&&(EW.cfg.all||(EW.cfg.open||[]).includes(id)));
const ewSubjOf=id=>COURSE.subjects.find(s=>id.startsWith(s.id+'-'));
// one open lesson with its words (loaded once; paths already resolved by the curriculum app's own fixPaths)
async function ewLesson(id){
  if(EW.les[id]) return EW.les[id];
  const s=ewSubjOf(id), m=s&&s.lessons.find(l=>l.id===id); if(!m||!m.file) return null;
  const L=fixPaths(await get(m.file),m.file); L.id=id; L.subj=s.id; L.tabs=['words','practice']; L.tabLabels={words:'كلمات',practice:'تدريبات'};
  L.vocab=(L.vocab||[]).filter(v=>v&&v.word); L.vocab.forEach((v,i)=>{ v.lid=id; v.key=id+'|'+v.word; v.ix=i; v.lang=s.id==='arabic'?'ar':'en'; });
  return EW.les[id]=L;
}
// ---- word statistics (kept on this device; later in the parent's account) ----
// a = times asked, c = times right first try, l = the last 4 results (1 right / 0 wrong)
function ewRec(v,ok){ const k=v.key||v.word, o=EW.stats[k]=EW.stats[k]||{a:0,c:0,l:[]}; o.a++; if(ok) o.c++; o.l.push(ok?1:0); if(o.l.length>4) o.l.shift(); o.t=Date.now(); ewSave(); }
// good = right the last two times (and mostly right); weak = wrong last time or mostly wrong; in between = needs review; never asked = new
function ewClass(v){ const o=EW.stats[v.key||v.word]; if(!o||!o.a) return 'new'; const last=o.l[o.l.length-1], two=o.l.slice(-2), r=o.c/o.a;
  if(last===0||r<.5) return 'weak'; if(two.length>=2&&two.every(x=>x===1)&&r>=.7) return 'good'; return 'review'; }
// every word of the open lessons of the chosen curriculum (the test builder, the report and "learn my weak words" read this)
async function ewAllWords(){ const out=[]; for(const s of ewSubjects()) for(const u of ewUnits(s)) for(const l of u.lessons){ if(!l.open) continue; const L=await ewLesson(l.id); if(L) L.vocab.forEach(v=>out.push(v)); } return out; }
