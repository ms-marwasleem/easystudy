/* EASY WORDS — start: load the data, then the first screen (curriculum picker the first time, then the subject icons). */
/* the stars popup (js/words-popup.js) replaces the curriculum app's level-up for both tabs. The curriculum is chosen the first time here; later it is changed in the account / student settings. */
levelUp=function(id,isNew){ ewPopup(tab==='practice'?'practice':'words'); };
async function ewStart(){
  busy(true);
  try{ await ewLoad(); }catch(e){ busy(false); message('أوبس!','التطبيق ما اتحملش. اتأكد من النت وجرب تاني.'); $('#msgOk').onclick=()=>location.reload(); return; }
  ewDefs(); await cssReady;
  if(document.fonts&&document.fonts.ready) await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]);
  paintHud(); busy(false);
  if(!EW.curr||!ewChoices().some(c=>c.id===EW.curr)){ EW.curr=null; ewPick(); } else openSubjects();
}
ewStart();
