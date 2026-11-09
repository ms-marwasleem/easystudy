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
// design file of another build (an old copy kept on the device or in the browser) = screens without their look: fresh files, reload once
async function buildMixed(){
  let b=''; try{ b=getComputedStyle(document.documentElement).getPropertyValue('--app-build').trim().replace(/["']/g,''); }catch(e){}
  if(typeof APP_BUILD==='undefined'||b===APP_BUILD) { try{ sessionStorage.removeItem('es.rebuilt'); }catch(e){} return false; }
  try{ if(sessionStorage.getItem('es.rebuilt')) return false; sessionStorage.setItem('es.rebuilt','1'); }catch(e){ return false; }
  try{ const c=navigator.serviceWorker&&navigator.serviceWorker.controller;
    if(c) await new Promise(ok=>{ const ch=new MessageChannel(); ch.port1.onmessage=()=>ok(); c.postMessage('update',[ch.port2]); setTimeout(ok,5000); });
    await Promise.all(['index.html','css/app.css','js/app-first.js','js/app-rest.js'].map(f=>fetch(f,{cache:'reload'}).catch(()=>{})));
  }catch(e){}
  location.reload(); return true;
}
async function start(){
  migrateStars();
  busy(true);
  try{
    [COURSE,CURR]=await Promise.all([get('data/course.json'),get('data/curriculum.json').catch(()=>null)]);
    await Promise.all(COURSE.subjects.filter(s=>s.file).map(async s=>{
      const d=await get(s.file), base=s.file.slice(0,s.file.lastIndexOf('/')+1);
      s.units=d.units; s.labels=d.labels; s.lessons=d.lessons.map(l=>({...l, id:`${s.id}-${l.folder}`, file:l.title?base+l.folder+'/lesson.json':null}));
    }));
    currApply((typeof kidNow==='function'&&kidNow()||{}).curr||currPick());   // the parent's curriculum / school decides the subjects, tabs and map signs (js/curriculum.js)
  }catch(e){ busy(false); message('Oops!','The lessons did not load. Check the internet and try again.'); $('#msgOk').onclick=()=>location.reload(); return; }
  // theme: only an ACTIVE theme in course.json "themes" can be used; an inactive one (cardboard...) is never applied, whatever is saved. Flip "active" to offer it.
  try{ const T=COURSE.themes||{list:[]}, want=localStorage.getItem('es.theme')||T.default||'', ok=(T.list.find(t=>t.id===want)||{}).active;
    const r=document.documentElement; if(ok&&want) r.dataset.theme=want; else delete r.dataset.theme; }catch(e){}
  // design file and fonts: wait for them behind the splash screen (fonts at most 2.5 s, then the page shows with the fallback font)
  await cssReady;
  if(await buildMixed()) return;
  if(document.fonts&&document.fonts.ready) await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]);
  $('#helloSub').textContent=`${COURSE.grade} · ${COURSE.term}`; paintHud(); busy(false); kidPaint(); if(!kidNow()) openWelcome(); else { openSubjects(); pop('#subjects .top > *',{y:-20}); deepGo(); }   // first launch: curriculum + accounts (js/welcome.js)
  setTimeout(()=>{ const n=$('#splashName'); if(n) n.remove(); $('#loadingText').hidden=false; },400);   // the app name shows on the first screen only; later loads say Loading...
}
// sw.js keeps the app, lessons, sounds and pictures on the device (later opens are instant) and shows library pictures that replaced shipped ones
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(()=>{});
start();
window.__app={award,levelUp,openLesson:m=>openLesson(m),openMap:()=>openMap(),vTeach:()=>vTeach(),vWrite:()=>vWrite(),get LESSON(){return LESSON}};

/* hidden door to the design page (for the grown-ups reviewing): tap the EasyStudy logo 5 times quickly */
(function(){ let n=0,t=0; document.addEventListener('click',e=>{ if(!e.target.closest('.gamelogo')) return; const now=Date.now(); n=now-t<900?n+1:1; t=now; if(n>=5){ n=0; location.href='design.html'; } }); })();
