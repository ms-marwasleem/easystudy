/* START — loads the course data (data/course.json + each subject's own file) and opens the first screen (subjects).
   Every other screen is in js/app-rest.js: it starts loading here, in the background, while the subjects page shows. */
let restOk=false;
const REST=new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='js/app-rest.js'; s.onload=()=>{ restOk=true; ok(); }; s.onerror=no; document.head.append(s); });
REST.catch(()=>{});
// run fn once the other screens are loaded (a tap on a subject right after the page opened waits for them behind the loading screen)
function needRest(fn){ if(restOk) return fn(); busy(true); REST.then(()=>{ busy(false); fn(); },()=>{ busy(false); message('Oops!','The app did not load. Check the internet and try again.'); $('#msgOk').onclick=()=>location.reload(); }); }
putCar($('#helloCar')); if(anim) G.to('#helloCar',{y:-5,duration:.9,yoyo:true,repeat:-1,ease:'sine.inOut'});
// stars saved before the files were split used the bare lesson id
function migrateStars(){ try{ ['zoom-stars','zoom-vocab'].forEach(k=>{ const o=JSON.parse(localStorage.getItem(k)||'{}'); let ch=false;
  Object.keys(o).forEach(id=>{ if(/^u\d+l\d+$/.test(id)&&!o['en-ol-'+id]){ o['en-ol-'+id]=o[id]; delete o[id]; ch=true; } });
  if(ch){ localStorage.setItem(k,JSON.stringify(o)); if(k==='zoom-stars') STARS=o; } }); }catch(e){} }
async function start(){
  migrateStars();
  busy(true);
  try{
    COURSE=await get('data/course.json');
    await Promise.all(COURSE.subjects.filter(s=>s.file).map(async s=>{
      const d=await get(s.file), base=s.file.slice(0,s.file.lastIndexOf('/')+1);
      s.units=d.units; s.lessons=d.lessons.map(l=>({...l, id:`${s.id}-${l.folder}`, file:l.title?base+l.folder+'/lesson.json':null}));
    }));
  }catch(e){ busy(false); message('Oops!','The lessons did not load. Check the internet and try again.'); $('#msgOk').onclick=()=>location.reload(); return; }
  // design file and fonts: wait for them behind the splash screen (fonts at most 2.5 s, then the page shows with the fallback font)
  await cssReady;
  if(document.fonts&&document.fonts.ready) await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]);
  $('#helloSub').textContent=`${COURSE.grade} · ${COURSE.term}`; paintHud(); busy(false); openSubjects(); pop('#subjects .top > *',{y:-20});
  setTimeout(()=>{ const n=$('#splashName'); if(n) n.remove(); $('#loadingText').hidden=false; },400);   // the app name shows on the first screen only; later loads say Loading...
}
// sw.js keeps the app, lessons, sounds and pictures on the device (later opens are instant) and shows library pictures that replaced shipped ones
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(()=>{});
start();
window.__app={award,levelUp,openLesson:m=>openLesson(m),openMap:()=>openMap(),vTeach:()=>vTeach(),vWrite:()=>vWrite(),get LESSON(){return LESSON}};
