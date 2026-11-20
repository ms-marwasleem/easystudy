/* EASY WORDS — start: load the data, then the first screen (curriculum picker the first time, then the subject icons). */
/* the stars popup (js/words-popup.js) replaces the curriculum app's level-up for both tabs. The curriculum is chosen the first time here; later it is changed in the account / student settings. */
levelUp=function(id,isNew){ ewPopup(tab==='practice'?'practice':'words'); };
async function ewStart(){
  busy(true);
  try{ await ewLoad(); }catch(e){ busy(false); message('أوبس!','التطبيق ما اتحملش. اتأكد من النت وجرب تاني.'); $('#msgOk').onclick=()=>location.reload(); return; }
  try{ await ESET_P; }catch(e){}   // the school permission (dashboard) decides the child's curriculum
  try{ const k=kidNow(); EW.curr=k&&k.curr?currEff(k.curr):EW.curr; }catch(e){}
  ewDefs(); await cssReady;
  if(document.fonts&&document.fonts.ready) await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,700))]);
  $('#ewWlLogo').innerHTML=ewIcon('app'); paintHud(); kidPaint(); busy(false);
  if(!kidNow()||!EW.curr||!ewChoices().some(c=>c.id===EW.curr)){ openWelcome(); } else openSubjects();
}
ewStart();
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(()=>{});   // keeps the app on the device (and the bell works): same file as the curriculum app
