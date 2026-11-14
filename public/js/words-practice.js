/* EASY WORDS — the Practice tab. A few question TEMPLATES (not one page per question); every round is made from DATA: the words of the lesson (or of the chosen
   units / lessons / words in a test, or the child's weak words), picked at random each time, so the missing letters, the scrambled word, the pictures to link
   are different on every round. Template list (Ahmed 2026-11-13): missing letter(s) · put the letters in order · picture, write the whole word · link words to pictures.
   Words are shown with the curriculum app's ONE word component (wsFill, js/wordslots.js); the picture/head/dots parts reuse the curriculum app's question layout (.quiz). */
const ep={ run:0, qs:[], i:0, bad:0, pool:[], n:5, types:[], src:'lesson', busy:false, held:null };
const EP_TASK={ ar:{ missing:'اكتب الحرف الناقص', missing2:'اكتب الحروف الناقصة', order:'رتّب الحروف علشان تكوّن الكلمة', picture:'اكتب اسم الصورة', match:'وصّل كل كلمة بصورتها' },
  en:{ missing:'Write the missing letter', missing2:'Write the missing letters', order:'Put the letters in order to make the word', picture:'Write the name of the picture', match:'Match each word with its picture' } };
const epShuffle=a=>{ const b=a.slice(); for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; };
const epGl=w=>glyphs(String(w)), epIdx=w=>epGl(w).map((g,i)=>g===' '?-1:i).filter(i=>i>=0);   // glyph numbers that are letters (not spaces)
const epWait=(ms,run)=>new Promise((ok,no)=>setTimeout(()=>run===ep.run?ok():no('stop'),ms));
const epSay=v=>Promise.race([sayWord(v).catch(()=>0),new Promise(r=>setTimeout(r,2600))]);
const EP_CAN={
  missing:(v)=>epIdx(v.word).length>=3,
  order:(v)=>epIdx(v.word).length>=3,
  picture:(v)=>!!v.img,
  match:(v,pool)=>!!v.img&&pool.filter(x=>x.img).length>=3
};
// the round is made of GROUPS, one per question template (like the exercise groups of the curriculum app); each group has `per` questions, the words at random,
// never the same word twice in a row. The dots under the question are the groups; the stars above it are the questions of the group on screen.
function epBuild(pool,per,types){
  const out=[]; let last=null; ep.groups=[];
  types.forEach(t=>{
    const ok=pool.filter(v=>EP_CAN[t](v,pool)); if(!ok.length) return;
    const g=ep.groups.length, start=out.length; let bag=[];
    for(let k=0;k<per;k++){
      if(!bag.length) bag=epShuffle(ok);
      let v=bag.pop(); if(ok.length>1&&v===last&&bag.length){ const w=bag.pop(); bag.push(v); v=w; }
      last=v; const q={t,v,g};
      if(t==='missing'){ const ix=epIdx(v.word), many=ix.length>=6; q.hide=epShuffle(ix).slice(0,many?2:1).sort((a,b)=>a-b); }
      if(t==='match'){ const others=epShuffle(pool.filter(x=>x.img&&x!==v&&x.word!==v.word)); q.set=epShuffle([v,...others.slice(0,Math.min(3,others.length))]); }
      out.push(q);
    }
    ep.groups.push({t,start,n:per});
  });
  return out;
}
// start a round. o = {pool,n,types,src,title} or nothing = the open lesson's own words
function epStart(o){
  o=o||{}; ep.run++; ep.pool=(o.pool||(LESSON.ep&&LESSON.ep.pool)||LESSON.vocab).filter(v=>v&&v.word);
  ep.n=o.n||(LESSON.ep&&LESSON.ep.n)||(EW.cfg&&EW.cfg.questions)||5;
  ep.types=(o.types||(LESSON.ep&&LESSON.ep.types)||(EW.cfg&&EW.cfg.types)||['missing','order','picture','match']).filter(t=>EP_CAN[t]&&ep.pool.some(v=>EP_CAN[t](v,ep.pool)));
  ep.src=o.src||LESSON.epSrc||'lesson'; ep.i=0; ep.bad=0; ep.busy=false; ep.lastG=-1;
  if(!ep.pool.length){ $('#stage').innerHTML='<div class="ew-empty">مفيش كلمات للتدريب</div>'; return; }
  if(!ep.types.length) ep.types=['order'];
  const total=!!(o.n||(LESSON.ep&&LESSON.ep.n)); ep.qs=epBuild(ep.pool,total?Math.max(1,Math.ceil(ep.n/ep.types.length)):ep.n,ep.types); epLayout(); epShow();
}
function epLayout(){ const L=$('#lesson'), land=innerWidth>innerHeight*1.1; L.classList.toggle('q-land',land); L.classList.toggle('q-port',!land); }
addEventListener('resize',()=>{ if(tab==='practice') epLayout(); });
function epGrp(){ return ep.groups[ep.qs[ep.i].g]; }
function epDots(){ const g=epGrp(); return Array.from({length:g.n},(_,k)=>`<i data-i="${g.start+k}">${STAR(false)}</i>`).join(''); }
function epHelpBtn(fn){ const r=$('#lmeta .lm-r'); if(!r) return; r.replaceChildren(); if(!fn) return; const hb=el('button','qhelpb',ICON.hint); hb.setAttribute('aria-label','ساعدني'); hb.onclick=()=>{ if(!ep.busy) fn(); }; r.append(hb); }
function epShow(){
  const q=ep.qs[ep.i], st=$('#stage'); stopVoice(); const run=ep.run; ep.busy=false; hideHint();   // (stopVoice makes a new run number: the question before can no longer act)
  const s=ewSubjOf(q.v.lid||'')||SUBJECT; if(s&&SUBJECT!==s){ SUBJECT=s; subjDir(); }
  st.innerHTML=''; const w=el('div','quiz ep'), say=typeof SAY_LN==='string'?SAY_LN:ICON.sound, task=q.t==='missing'&&q.hide.length>1?'missing2':q.t, lg=EW_SUBJ[(ewSubjOf(q.v.lid||'')||{}).id]?.lang==='ar'?'ar':'en';
  w.dataset.type=q.t==='match'?'link':'type'; w.dataset.ep=q.t; w.lang=EW_SUBJ[(ewSubjOf(q.v.lid||'')||{}).id]?.lang==='ar'?'ar':'en';
  w.innerHTML=`<div class="qhead"><span class="qtask">${EP_TASK[lg][task]}</span></div><div class="qdots"></div>
    <div class="qword" dir="ltr"><b></b><button class="qsay" aria-label="اسمع">${say}</button></div><div class="qplay"></div><div class="qans"></div>`;
  st.append(w); const dots=$('.qdots',w); dots.style.setProperty('--n',epGrp().n); dots.innerHTML=epDots();
  $$('i',dots).forEach(d=>{ const k=+d.dataset.i; d.classList.toggle('cur',k===ep.i); if(k<ep.i){ d.innerHTML=STAR(true); d.classList.add('got'); } });
  $('.qword .qsay',w).addEventListener('click',e=>{ e.stopPropagation(); epSay(q.v); });
  q.bad=0; q.try=0;
  // the header is read once when a new group (exercise) starts, and again when it is tapped (same as the curriculum app's qTask)
  const tk=$('.qtask',w), say_task=()=>{ tk.classList.add('lit'); const dn=()=>tk.classList.remove('lit'); return tts(EP_TASK[lg][task],lg,.85).then(dn,dn); };
  ep.taskP=ep.lastG!==q.g?say_task():Promise.resolve(); ep.lastG=q.g; tk.addEventListener('click',()=>{ if(!ep.busy) say_task(); });
  ({missing:epMissing,order:epOrder,picture:epPicture,match:epMatch})[q.t](q,w,run); lnavPaint();
  if(anim) G.fromTo(w,{opacity:0,y:14},{opacity:1,y:0,duration:.25});
}
// the right answer: celebrate, say the word, record it for the report, next question
async function epRight(q,w,run,wordsOk){
  if(ep.busy||run!==ep.run) return; ep.busy=true; epHelpBtn(null);
  const bad=q.t==='match'?(wordsOk.some(x=>!x.ok)):q.bad; if(bad) ep.bad++;
  if(q.t==='match') wordsOk.forEach(x=>ewRec(x.v,x.ok)); else ewRec(q.v,!q.bad);
  q.done=1; const d=$(`.qdots i[data-i="${ep.i}"]`,w); if(d){ d.innerHTML=STAR(true); d.classList.add('got'); if(anim) G.fromTo(d,{scale:1.8},{scale:1,duration:.6,ease:'elastic.out(1.2,.4)'}); }
  celebrate(q.t==='match'?$('.epm',w):($('.qword b',w)||w));
  try{ const ip=$('#qin'); if(ip) ip.blur(); if(q.t!=='match') await epSay(q.v); await epWait(900,run); }catch(e){ return; }
  if(run!==ep.run) return;
  if(ep.i<ep.qs.length-1){ ep.i++; epShow(); } else epFinish();
}
const epMark=/^[ؐ-ًؚ-ٰٟۖ-ۭ]$/;
// typing a hidden letter (missing letter(s) and "write the whole word"): same typing behaviour as the words tab (a wrong letter is never written; the place shakes)
function epTyper(q,w,hide,run){
  const box=$('.qword b',w), gl=epGl(q.v.word), ar=!!(SUBJECT&&SUBJECT.rtl), inp=el('input','qin'); let k=0, typed='';
  wsFill(box,q.v.word,{hide,ltr:!ar}); wsCur(box);
  Object.assign(inp,{type:'text',id:'qin',autocomplete:'off',spellcheck:false}); wsInput(inp,q.v.word,ar?'ar':'en'); inp.setAttribute('enterkeyhint','done'); $('.qword',w).append(inp);
  const lt=i=>$(`.lt[data-i="${i}"]`,box);
  inp.addEventListener('input',()=>{
    if(ep.busy||run!==ep.run) return; hideHint(); const val=inp.value.replace(/\s/g,'');
    if(val.startsWith(typed)){
      for(const ch of val.slice(typed.length)){
        if(k>=hide.length) break; const want=gl[hide[k]];
        if(ar&&epMark.test(ch)){ typed+=ch; continue; }
        if(ar?sameLetter(ch,want):ch.toLowerCase()===want.toLowerCase()){ const b=lt(hide[k]); b.classList.remove('hid','peek'); b.classList.add('got'); typed+=ch; blip(560+k*40,.05); if(anim&&!ar) G.fromTo(b,{scale:1.3},{scale:1,duration:.35,ease:'back.out(3)'}); k++; wsCur(box); }
        else { tone(170,'square',.06,.18); wsBad(lt(hide[k])||box); q.bad=1; break; }
      }
    }
    inp.value=typed; if(k>=hide.length) epRight(q,w,run);
  });
  $('.qword',w).addEventListener('click',e=>{ if(!e.target.closest('.qsay')) inp.focus({preventScroll:true}); });
  epHelpBtn(()=>{ if(k>=hide.length) return; const b=lt(hide[k]); if(!b) return; b.classList.add('peek'); setTimeout(()=>b.classList.remove('peek'),tokMs('--help-letter-ms',1500)); inp.focus({preventScroll:true}); });
  setTimeout(()=>{ if(run===ep.run&&tab==='practice') inp.focus({preventScroll:true}); },250);   // (a phone only opens the keyboard right after a tap; the first question comes from a tap on the Practice tab)
  return inp;
}
function epPic(q,w){ if(q.v.img){ $('.qplay',w).append(el('div','qpic one',`<img src="${q.v.img}" alt=""${/\.png$/i.test(q.v.img)?' class="cut"':''}>`)); } }
// 1) missing letter(s)
function epMissing(q,w,run){ epPic(q,w); epTyper(q,w,q.hide,run); const tp=ep.taskP||Promise.resolve(); tp.then(()=>setTimeout(()=>{ if(run===ep.run) epSay(q.v); },400)); }
// 3) a picture, write the whole word
function epPicture(q,w,run){ epPic(q,w); epTyper(q,w,epIdx(q.v.word),run); }
// 2) the letters scrambled: tap them in order
function epOrder(q,w,run){
  epPic(q,w); const box=$('.qword b',w), gl=epGl(q.v.word), ix=epIdx(q.v.word), ar=!!(SUBJECT&&SUBJECT.rtl);
  wsFill(box,q.v.word,{hide:true,ltr:!ar}); wsCur(box);
  let tiles=epShuffle(ix.map(i=>({i,g:gl[i]}))); for(let t=0;t<6&&ix.length>1&&tiles.every((x,k)=>x.i===ix[k]);t++) tiles=epShuffle(tiles);
  const ans=$('.qans',w); ans.classList.add('ep-tiles'); ans.dir=ar?'rtl':'ltr'; let k=0;
  tiles.forEach(t=>{ const b=el('button','eptile',`<span class="${/[؀-ۿ]/.test(t.g)?'ewa':''}">${t.g}</span>`); b.dataset.i=t.i;
    b.addEventListener('click',()=>{ if(ep.busy||run!==ep.run||b.disabled) return; const want=gl[ix[k]];
      if(ar?sameLetter(t.g,want):t.g.toLowerCase()===want.toLowerCase()){ const l=$(`.lt[data-i="${ix[k]}"]`,box); l.classList.remove('hid','peek'); l.classList.add('got'); b.disabled=true; b.classList.add('used'); blip(560+k*40,.05); k++; wsCur(box); if(k>=ix.length) epRight(q,w,run); }
      else { tone(170,'square',.06,.18); q.bad=1; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); setTimeout(()=>b.classList.remove('shake'),450); } });
    ans.append(b); });
  epHelpBtn(()=>{ const want=gl[ix[k]]; const hit=$$('.eptile:not(.used)',ans).find(b=>{ const g=gl[+b.dataset.i]; return ar?sameLetter(g,want):g.toLowerCase()===want.toLowerCase(); }); if(hit){ hit.classList.add('glow'); setTimeout(()=>hit.classList.remove('glow'),tokMs('--help-pick-ms',2000)); } });
  setTimeout(()=>{ if(run===ep.run) epSay(q.v); },500);
}
// 4) link every word to its picture: the curriculum app's own link board (classes, line drawing, layout), drag a line or tap the word then the picture
function epMatch(q,w,run){
  $('.qword',w).hidden=true; const set=q.set, ok=set.map(v=>({v,ok:true})), n=set.length;
  const items=set.map(v=>({word:v.word,picSrc:v.img})), bd=el('div','qlink'); bd.dataset.n=n; bd.style.setProperty('--n',n); bd._set={items,layout:$('#lesson').classList.contains('q-land')?'':'cols'}; bd._pairs=[];
  const wd=el('div','qlw'), pc=el('div','qlp'); let ord=items.map((_,k)=>k); for(let t=0;t<30;t++){ ord.sort(()=>Math.random()-.5); if(n<2||ord.every((v,k)=>v!==k)) break; }
  set.forEach((v,k)=>{ const b=el('button','qlk qlkw',`<b dir="${v.lang==='ar'?'rtl':'ltr'}">${v.word}</b>`); b.dataset.k=k; wd.append(b); });
  ord.forEach(k=>{ const b=el('button','qlk qlkp',`<img src="${items[k].picSrc}" alt="" draggable="false">`); b.dataset.k=k; b.setAttribute('aria-label','Picture'); pc.append(b); });
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','qlsvg'); bd.append(wd,pc,svg); $('.qplay',w).append(bd);
  let drag=null, sel=null, done=0; const rel=(x,y)=>{ const B=bd.getBoundingClientRect(); return [x-B.left,y-B.top]; }, kind=b=>b.classList.contains('qlkw')?'w':'p';
  const tmp=()=>{ let l=$('.qtmp',svg); if(!l){ l=document.createElementNS('http://www.w3.org/2000/svg','line'); l.setAttribute('class','qtmp'); svg.append(l); } return l; };
  const clearSel=()=>{ if(sel){ sel.classList.remove('sel'); sel=null; } };
  const tryJoin=(a,b)=>{ const wb=kind(a)==='w'?a:b, pb=wb===a?b:a;
    if(wb.dataset.k!==pb.dataset.k){ const l=qLinkLine(bd,wb,pb,'qlj bad'); setTimeout(()=>l.remove(),500); qBad([wb,pb]); ok[+wb.dataset.k].ok=false; return; }
    wb.classList.add('done'); pb.classList.add('done'); bd._pairs.push([wb,pb]); const l=qLinkLine(bd,wb,pb);
    if(anim){ const len=l.getTotalLength?l.getTotalLength():300; G.fromTo(l,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.35,ease:'power2.out'}); }
    celebrate(pb); blip(620+done*60,.06); done++; if(done>=n) epRight(q,w,run,ok); else epSay(set[+wb.dataset.k]); };
  bd.addEventListener('pointerdown',e=>{ const b=e.target.closest('.qlk'); if(!b||ep.busy||run!==ep.run) return; e.preventDefault(); hideHint();
    if(b.classList.contains('done')){ if(kind(b)==='w') epSay(set[+b.dataset.k]); return; }
    drag={b,x:e.clientX,y:e.clientY,moved:false}; try{ bd.setPointerCapture(e.pointerId); }catch(_){} });
  bd.addEventListener('pointermove',e=>{ if(!drag) return; if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10) return; drag.moved=true;
    const [a,b]=qAnchor(bd,drag.b,kind(drag.b)==='w'), [x,y]=rel(e.clientX,e.clientY), l=tmp(); l.setAttribute('x1',a); l.setAttribute('y1',b); l.setAttribute('x2',x); l.setAttribute('y2',y); });
  const end=e=>{ if(!drag) return; const d=drag; drag=null; const l=$('.qtmp',svg); if(l) l.remove();
    const t=e.type==='pointerup'&&document.elementFromPoint(e.clientX,e.clientY); let tb=t&&t.closest&&t.closest('.qlk');
    if(e.type==='pointerup'&&(!tb||kind(tb)===kind(d.b))){ let best=null,bd2=1e9; $$('.qlk',bd).forEach(c=>{ if(kind(c)===kind(d.b)||c.classList.contains('done')) return; const r=c.getBoundingClientRect(), dx=Math.max(r.left-e.clientX,0,e.clientX-r.right), dy=Math.max(r.top-e.clientY,0,e.clientY-r.bottom), dd=Math.hypot(dx,dy); if(dd<bd2){ bd2=dd; best=c; } }); tb=bd2<=60?best:null; }
    if(e.type==='pointercancel') return;
    if(d.moved){ clearSel(); if(tb&&tb!==d.b&&kind(tb)!==kind(d.b)&&!tb.classList.contains('done')) tryJoin(d.b,tb); return; }
    if(kind(d.b)==='w') epSay(set[+d.b.dataset.k]);
    if(sel&&sel!==d.b&&kind(sel)!==kind(d.b)){ const a=sel; clearSel(); tryJoin(a,d.b); return; }
    if(sel===d.b){ clearSel(); return; } clearSel(); sel=d.b; d.b.classList.add('sel'); };
  bd.addEventListener('pointerup',end); bd.addEventListener('pointercancel',end);
  qLinkRefresh($('#lesson').classList.contains('q-land'));
  epHelpBtn(()=>{ const wb=$$('.qlkw',bd).find(b=>!b.classList.contains('done')); if(!wb) return; [wb,$$('.qlkp',bd).find(b=>b.dataset.k===wb.dataset.k)].forEach(x=>{ x.classList.add('qhl'); setTimeout(()=>x.classList.remove('qhl'),tokMs('--help-pick-ms',2000)); }); });
}
addEventListener('resize',()=>{ if(tab==='practice'&&$('.qlink')){ epLayout(); qLinkRefresh($('#lesson').classList.contains('q-land')); } });
// end of a round: the lesson's practice star is earned; a test is logged for the report; the stars popup (js/words-popup.js)
function epFinish(){
  const n=ep.qs.length, right=n-ep.bad;
  EW.log.push({t:Date.now(),n,right,src:ep.src}); ewSave();
  if(ep.src==='lesson'&&LESSON&&!LESSON.virtual){ const id=LESSON.id; STARS[id]=STARS[id]||{}; if(!STARS[id].practice){ STARS[id].practice=1; try{ localStorage.setItem('zoom-stars',JSON.stringify(STARS)); }catch(e){} } paintHud(); paintTabs(); }
  epHelpBtn(null); ewPopup('practice',{right,n});
}

// move between QUESTIONS (not groups): the dots under the question, or a swipe with the finger / drag with the mouse on the question
function epGo(i){ if(ep.busy||i<0||i>=ep.qs.length||i===ep.i) return; blip(600); ep.i=i; epShow(); }
(()=>{ let d=null; const st=$('#stage');
  st.addEventListener('pointerdown',e=>{ if(tab!=='practice'||e.target.closest('.qlk,.eptile,input,button')) return; d={x:e.clientX,y:e.clientY}; });
  const end=e=>{ if(!d) return; const dx=e.clientX-d.x, dy=e.clientY-d.y; d=null; if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5) epGo(ep.i+(dx<0?1:-1)); };
  st.addEventListener('pointerup',end); st.addEventListener('pointercancel',()=>{ d=null; }); })();
