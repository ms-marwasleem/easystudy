/* EASY WORDS — the lesson screen. It IS the curriculum app's lesson screen (js/lesson.js tab bar + js/vocab.js words template: say the word 3 times with its syllables,
   helper buttons, then the child writes it). Only two tabs: Words (that template, untouched) and Practice (js/words-practice.js). */
TABS.practice=['Practice','quiz']; PARTS.push(['practice','Practice']);
// the dots under the question: one per QUESTION of the round, a gap between the groups; the one on screen is solid; tap a dot to go to that question
function lnavPaint(){
  const d=$('#lmDots'); if(!d) return;
  if(tab!=='practice'||!ep.groups||ep.qs.length<2||!ep.qs[ep.i]){ d.hidden=true; d.innerHTML=''; return; }
  const cur=ep.i; d.hidden=false; d.innerHTML=ep.qs.map((q,k)=>`<button class="ldot${k===cur?' on':''}${q.done?' done':''}${k&&q.g!==ep.qs[k-1].g?' gs':''}" aria-label="${k+1}"></button>`).join('');
  $$('.ldot',d).forEach((b,k)=>b.addEventListener('click',()=>epGo(k)));
  const on=$('.ldot.on',d); if(on) d.scrollLeft=on.offsetLeft-d.clientWidth/2+on.offsetWidth/2;
}
// the subject decides the text language (isAr) and keyboard: a mixed list (weak words, test) switches it word by word
function ewSubjFor(v){ const s=v&&ewSubjOf(v.lid||''); if(s&&SUBJECT!==s){ SUBJECT=s; subjDir(); } }
const _ewRender=vRender; vRender=function(f){ if(LESSON&&LESSON.virtual) ewSubjFor(LESSON.vocab[vs.i]); return _ewRender(f); };
const _ewStop=stopVoice; stopVoice=function(){ if(typeof ep!=='undefined') ep.run++; return _ewStop.apply(this,arguments); };
const _ewSwitch=switchTab;
switchTab=function(t,at){
  const L=$('#lesson'); L.classList.remove('ptab','qtab');
  if(t!=='practice'){ const r=_ewSwitch(t,at); lnavPaint(); return r; }
  setLook(t); if(WP.saved) wpClose(); stopVoice(); { const r=$('#lmeta .lm-r'); if(r) r.innerHTML=''; } hideHint();
  L.classList.remove('vtab','story','poem'); document.body.classList.remove('typing','kb');
  tab=t; paintTabs(); L.classList.add('qtab','ptab'); setRail([]); epStart(); pop('#stage > *',{scale:.85,y:10});
};
function ewTitle(L,s){
  const ar=EW_SUBJ[s.id].lang==='ar';
  return L.virtual?L.title:ar?`الوحدة ${ewN(L.unit)} - الدرس ${ewN(L.lesson)} - ${L.title}`:`Unit ${L.unit} - Lesson ${L.lesson} - ${L.title}`;
}
// open a prepared lesson object (a real lesson, or a made-up one of words picked from many lessons)
function ewEnter(L,at){
  stopVoice(); LESSON=L; player.bufs={}; player.ready=null; rd.page=1; rd.done={}; rd.halted=false; rd.hold=false; vs.i=Math.max(0,Math.min(at||0,L.vocab.length-1));
  const s=ewSubjOf(L.vocab[0]?L.vocab[0].lid:L.id)||SUBJECT; SUBJECT=s; show('lesson');
  $('#lessonMeta').textContent=L.virtual?'Easy Words':EW_SUBJ[s.id].name; $('#lessonTitle').textContent=ewTitle(L,s);
  $('#lessonTitle').dir=L.virtual||EW_SUBJ[s.id].lang==='ar'?'rtl':'ltr';
  switchTab(L.startTab||'words'); fitTitle(); pop('.l-head > *',{y:-20}); pop('.tabs .tab',{y:30,delay:.1});
}
async function ewOpenLesson(id,at){
  stopVoice(); busy(true); let L=null; try{ L=await ewLesson(id); }catch(e){} busy(false);
  if(!L) return message('أوبس!','الدرس ما اتفتحش. اتأكد من النت وجرب تاني.');
  SUBJECT=ewSubjOf(id); EW.cur=SUBJECT; L.virtual=false; ewEnter(L,at);
}
// a lesson made of chosen words (weak words, a test): same lesson screen, same two tabs
function ewVirtual(id,title,vocab,extra){
  const src=EW.les[vocab[0]&&vocab[0].lid]||{};
  return Object.assign({id,title,vocab,virtual:true,tabs:['words','practice'],tabLabels:{words:'كلمات',practice:'تدريبات'},hints:src.hints||{},base:'',unit:0,lesson:0,subj:src.subj,vocabRepeats:src.vocabRepeats||3},extra||{});
}
// the words tab ends with the same stars popup as the curriculum app; its "Map" button comes back to the units
$('#lvlMap').textContent='الدروس'; $('#lvlAgain').textContent='تاني';
