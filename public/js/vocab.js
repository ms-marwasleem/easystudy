/* VOCABULARY tab + the shared celebration. */
/* ---------- Celebration: used for every correct answer (word written, question answered) ---------- */
function fanfare(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>{ tone(f,'triangle',.11,.35); tone(f*2,'sine',.04,.3); },i*110)); setTimeout(()=>{ tone(1568,'sine',.05,.5,1.2); tone(2093,'sine',.04,.5); },480); }
function celebrate(target){
  fanfare(); confetti(110);
  if(!anim||!target) return;
  const r=target.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  for(let i=0;i<10;i++){ const s=el('div','spark',STAR(true)); document.body.append(s);
    const a=Math.PI*2*i/10, d=90+Math.random()*80;
    G.set(s,{left:cx,top:cy,xPercent:-50,yPercent:-50,scale:.2});
    G.to(s,{x:Math.cos(a)*d,y:Math.sin(a)*d,scale:.6+Math.random()*.5,rotation:Math.random()*360,duration:.7,ease:'power2.out'});
    G.to(s,{opacity:0,duration:.35,delay:.55,onComplete:()=>s.remove()}); }
  G.fromTo(target,{scale:1},{scale:1.15,duration:.15,yoyo:true,repeat:1,ease:'power1.out'});
}

/* ---------- Vocabulary: picture + word + meaning (with its own speaker); parts then whole word x3; then the child writes it ---------- */
const vs={i:0, run:0, mode:'learn', src:null, files:{}, pos:0, letters:[]};
let VDONE={}; try{ VDONE=JSON.parse(localStorage.getItem('zoom-vocab')||'{}')||{}; }catch(e){}
const vDone=()=>VDONE[LESSON.id]=VDONE[LESSON.id]||[];
const vSleep=(ms,run)=>new Promise((res,rej)=>setTimeout(()=>run===vs.run?res():rej('stop'),ms));
let lastCancel=0, keepU=[];
function vStop(){ vs.run++; try{ if(speechSynthesis.speaking||speechSynthesis.pending){ speechSynthesis.cancel(); lastCancel=Date.now(); } }catch(e){} if(vs.src){ try{vs.src.stop();}catch(e){} vs.src=null; } }
// talking voice of the device (used only where there is no recording yet)
// Arabic is NEVER machine-voiced: only Ahmed's recordings; a missing one stays silent
// voice packs: a paper (exam) ships voice.mp3 + voice.json made with the man's Kokoro voice; English text found there is played from it, the device voice is only the last resort
const VP={packs:[],key:t=>String(t||'').replace(/\s+/g,' ').trim().toLowerCase()};
async function vpLoad(base){
  VP.packs=[]; if(!base) return;
  try{ const [idx,ab]=await Promise.all([fetch(base+'voice.json').then(r=>r.json()),fetch(base+'voice.mp3').then(r=>r.arrayBuffer())]); await ensureCtx();
    const buf=await decodeSnd(player.ctx,ab); VP.packs.push({idx,buf}); }catch(e){}
}
function vpClip(text){ const k=VP.key(text); for(const p of VP.packs){ const c=p.idx[k]; if(c) return [p.buf,c]; } return null; }
function tts(text,lang='en',rate=.8){
  if(lang!=='ar'){ const c=vpClip(text); if(c) return playBuf(c[0],Math.max(0,c[1][0]-.02),c[1][1]-c[1][0]+.06); }
  return new Promise(res=>{
    if(lang==='ar'||!('speechSynthesis' in window)||!text){ setTimeout(res,350); return; }
    const go=()=>{
      try{ speechSynthesis.resume(); }catch(e){}
      const u=new SpeechSynthesisUtterance(text), vv=speechSynthesis.getVoices().filter(v=>v.lang.replace('_','-').toLowerCase().startsWith(lang));
      const pick=vv.find(v=>/google|natural|samantha|aria|jenny|salma|shakir|zeina|maged/i.test(v.name))||vv[0]; if(pick) u.voice=pick;
      u.lang=lang==='ar'?'ar-EG':'en-US'; u.rate=rate; u.volume=1;
      keepU.push(u); if(keepU.length>8) keepU.shift();   // Safari drops the end signal of utterances it forgets
      let done=false; const fin=()=>{ if(!done){ done=true; res(); } };
      u.onend=fin; u.onerror=fin; setTimeout(fin,1400+text.length*240/rate); speechSynthesis.speak(u);
    };
    const wait=Math.max(0,150-(Date.now()-lastCancel)); wait?setTimeout(go,wait):go();   // Safari ignores a voice started right after a stop
  });
}
// tapping a word of a sentence on the screen reads THAT word alone (a child learning to read needs to hear which word it is)
const TAPWORD='.xqt,.xtext,.xsec,.qask,.qsen>span:not(.qopts)', TAPSKIP='button,input,textarea,select,a,.xbl,.xo,.xit,.qopts,.xwarn';
function wordAtPoint(x,y){
  let n,o; if(document.caretPositionFromPoint){ const c=document.caretPositionFromPoint(x,y); if(c){ n=c.offsetNode; o=c.offset; } }
  else if(document.caretRangeFromPoint){ const r=document.caretRangeFromPoint(x,y); if(r){ n=r.startContainer; o=r.startOffset; } }
  if(!n||n.nodeType!==3) return '';
  const re=/[A-Za-z0-9\u0660-\u0669][A-Za-z0-9\u0660-\u0669']*/g; let m;
  while((m=re.exec(n.data))){ if(o>=m[0].length*0+m.index&&o<=m.index+m[0].length){
    const r=document.createRange(); r.setStart(n,m.index); r.setEnd(n,m.index+m[0].length);
    const hit=[...r.getClientRects()].some(b=>x>=b.left-3&&x<=b.right+3&&y>=b.top-3&&y<=b.bottom+3);
    return hit?m[0].replace(/^'+|'+$/g,''):''; } }
  return '';
}
document.addEventListener('click',e=>{
  const t=e.target; if(!t.closest||!t.closest(TAPWORD)||t.closest(TAPSKIP)||isAr()) return;
  const w=wordAtPoint(e.clientX,e.clientY); if(!w) return;
  vStop(); if(typeof stopAll==='function') stopAll(); tts(w.replace(/[\u0660-\u0669]/g,d=>d.charCodeAt(0)-0x660),'en',.75).catch(()=>{});
});
function playBuf(buf,from=0,dur){ return new Promise(res=>{ const s=player.ctx.createBufferSource(); s.buffer=buf; s.connect(player.ctx.destination);
  vs.src=s; s.onended=()=>{ if(vs.src===s) vs.src=null; res(); }; dur!=null?s.start(0,from,dur):s.start(0,from); }); }
async function playFile(url){ await ensureCtx();
  let buf=await libBuffer(url,player.ctx).catch(()=>null);   // a recording from the audio library wins; else the file in the app
  if(!buf){ const parts=await composeFiles(url).catch(()=>null);   // a sentence with variables: its pieces, one after the other
    if(parts){ const run=vs.run; for(let k=0;k<parts.length;k++){ if(run!==vs.run) return; await playFile(parts[k]); if(k<parts.length-1&&run===vs.run) await new Promise(r=>setTimeout(r,70)); } return; } }
  if(!buf){
    if(!vs.files[url]) vs.files[url]=fetch(url).then(r=>{ if(!r.ok) throw new Error('missing'); return r.arrayBuffer(); }).then(b=>decodeSnd(player.ctx,b)).catch(()=>{ delete vs.files[url]; return null; });
    buf=await vs.files[url];
  }
  if(!buf){ if(isAr()){ await nap(350); return; } throw new Error('missing audio'); }   // Arabic: a recording not made yet is silent
  return playBuf(buf); }
// load + decode a sound BEFORE it is needed (the first play of a file waits for the network otherwise: Ahmed 2026-11-09 "the sound lags on the first join")
async function warmFile(url){ try{ if(!url) return; await ensureCtx(); if(await libBuffer(url,player.ctx).catch(()=>null)) return;
  if(!vs.files[url]) vs.files[url]=fetch(url).then(r=>{ if(!r.ok) throw new Error('missing'); return r.arrayBuffer(); }).then(b=>decodeSnd(player.ctx,b)).catch(()=>{ delete vs.files[url]; return null; }); await vs.files[url]; }catch(_){} }
async function playClip([s,e]){ try{ await ensureAudio(); }catch(err){ return; } if(!player.bufs.n) return; return playBuf(player.bufs.n,Math.max(0,s-.03),e-s+.08); }   // single words: normal speed
const sayWord=v=>v.audio&&v.audio.word?playFile(v.audio.word):v.clip?playClip(v.clip):tts(v.word,isAr()?'ar':'en',.75);
// LETTER-WORDS component (letter lessons): each word has v.har (fatha|damma|kasra|sukoon). Beside the word sits the haraka boy (library ar-boy-<har>);
// saying the word first says the letter's name and the haraka's name ("ألف، فتحة"), then the word. Recordings: letter.nameAudio + data/arabic/shared/h-<har>.mp3.
const letterWords=()=>LESSON.type==='letter'&&LESSON.vocab.some(v=>v.har);
const sayHead=async v=>{ if(letterWords()&&v.har){ if(LESSON.letter&&LESSON.letter.nameAudio) await playFile(LESSON.base+LESSON.letter.nameAudio); await playFile(LESSON.base+'../shared/k-h-'+v.har+'.mp3'); await nap(250); } return sayWord(v); };
// the whole word said after its parts (her second take sounds natural there); falls back to the first take
const sayWordAgain=v=>v.audio&&v.audio.again?playFile(v.audio.again):sayWord(v);
const sayAr=v=>v.audio&&v.audio.ar?playFile(v.audio.ar):tts(v.ar,'ar',.85);
const sayPart=p=>p.silent?new Promise(r=>setTimeout(r,350)):p.audio?playFile(p.audio):p.say?tts(p.say,isAr()?'ar':'en',.7):new Promise(r=>setTimeout(r,300));

// the small speaker next to a text: just a blue line drawing, not a round button
const SAY_LN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const VHAR={fatha:'\u0640\u064E',damma:'\u0640\u064F',kasra:'\u0640\u0650',sukoon:'\u0640\u0652'};
function showWords(){
  vs.seen=new Set();   // the words taught in THIS visit: the stars screen comes only when the child has been through the WHOLE tab (earlier visits never make the first word the last)
  stage.innerHTML='';
  vs.i=Math.min(vs.i,LESSON.vocab.length-1);
  $('#lesson').classList.add('vtab'); $('#lesson').classList.toggle('vmode',vMode()); setRail([]); vLayout();
  const wrap=el('div','vocab'), pick=el('div','vpick');
  LESSON.vocab.forEach((v,i)=>{ const b=el('button','vthumb'+(i===vs.i?' on':''),`${vMode()?`<span class="vtw">${v.word}</span>`:`<img src="${v.img}" alt=""${/\.png$/i.test(v.img)?' class="cut"':''}>`}<b>${i+1}</b>${vDone().includes(v.word)?`<span class="vst">${STAR(true)}</span>`:''}`);
    if(v.har&&i&&LESSON.vocab[i-1].har!==v.har) b.classList.add('vgrp');   // letter lessons: words grouped by haraka (fatha, damma, kasra, sukoon)
    b.setAttribute('aria-label',`Word ${i+1}: ${v.word}`); b.addEventListener('click',()=>{ vs.i=i; vTeach(); }); pick.append(b); });
  wrap.innerHTML=`<div class="vwrow">${letterWords()?'<img class="vboy" alt="">':''}<div class="vword"></div><button class="vsay" aria-label="${isAr()?'اسمع الكلمة':tr('Listen')}">${SAY_LN}</button></div>
    <div class="vinfo"><div class="vstatus"></div><div class="vmeaning" dir="rtl"><span class="vm-t"></span><button class="vm-say" aria-label="Arabic meaning">${SAY_LN}</button></div></div>
    <div class="vtools"></div><div class="vimgwrap"><img class="vimg" alt=""></div>`;
  wrap.append(pick); stage.append(wrap); vPickFit();
  $('.vm-say').addEventListener('click',e=>{ e.stopPropagation(); const v=LESSON.vocab[vs.i]; $('.vmeaning').classList.add('lit'); sayAr(v).then(()=>$('.vmeaning')&&$('.vmeaning').classList.remove('lit')); });
  $('.vsay').addEventListener('click',e=>{ e.stopPropagation(); if(vMode()) return vMeanSay('all'); vStop(); if(vs.mode==='learn'){ vs.mode='idle'; vRail(); } sayHead(LESSON.vocab[vs.i]); });   // the small speaker beside the word (replaces the Listen / Stop buttons)
  vTools(); vRender(true); vRail(); vCar(false);
  if(vMode()){ $('.vword').addEventListener('click',()=>vMeanSay('word')); $('.vmeaning').addEventListener('click',()=>vMeanSay('rel')); }
  showHint(pick,LESSON.hints.vocabPick,900,'vocabPick');
  setTimeout(()=>{ if(tab==='words') vTeach(); },350);
}
function vRender(fill){
  const v=LESSON.vocab[vs.i], img=$('.vimg');
  if(!img._fit){ img._fit=1; img.addEventListener('load',vFitImg); }
  if(v.img&&img.getAttribute('src')!==v.img){ img.src=v.img; if(anim){ G.set(img,{opacity:0}); const go=()=>G.to(img,{opacity:1,duration:.3}); img.decode?img.decode().then(go,go):go(); } }
  const boy=$('.vboy'); if(boy){ boy.hidden=!v.har; if(v.har) boy.src=LESSON.base+'../../pics/ar-boy-'+v.har+'.png'; }
  img.alt=v.word; img.classList.toggle('cut',/\.png$/i.test(v.img||'')); if(vMode()&&v.rel) $('.vm-t').innerHTML=`<small>${v.rel.label}</small><span>${v.rel.text}</span>`; else $('.vm-t').textContent=v.ar||''; $('.vmeaning').hidden=!(v.ar||v.rel);   // library cut-outs are png
  $$('.vthumb').forEach((b,i)=>b.classList.toggle('on',i===vs.i));
  const pk=$('.vpick'), on=$('.vthumb.on'); if(pk&&on&&pk.scrollWidth>pk.clientWidth) pk.scrollTo({left:on.offsetLeft-pk.clientWidth/2+on.offsetWidth/2,behavior:'smooth'});   // keep the current word in view in the strip
  const w=$('.vword'); w.innerHTML=''; w.classList.remove('lit','writing','focus');
  w.style.fontSize='';
  wsFill(w,v.word,{hide:!fill,parts:v.parts.map(p=>p.t)});   // THE word component (js/wordslots.js): hidden letters keep their place
  fitWord();
}
const vStatus=t=>{ const s=$('.vstatus'); if(s){ s.textContent=t; if(anim) G.fromTo(s,{opacity:0},{opacity:1,duration:.3}); } };
// "meaning" lessons (nasheed): no spelling or writing; hear the word, then its meaning or plural (rel = {label,labelAudio,text,audio})
const vMode=()=>LESSON.vocabMode==='meaning';
const sayRel=v=>v.rel.labelAudio?playFile(v.rel.labelAudio).then(()=>v.rel.audio?playFile(v.rel.audio):0):tts(v.ar,'ar',.85);
async function vMeanSay(what){
  vStop(); const run=++vs.run, v=LESSON.vocab[vs.i]; vs.mode='idle'; vRail();
  try{
    if(what!=='rel'){ $('.vword').classList.add('lit'); await sayWord(v); if(run!==vs.run) return; $('.vword').classList.remove('lit'); await vSleep(500,run); }
    if(what!=='word'||vs.mode==='idle'){ $('.vmeaning').hidden=false; $('.vmeaning').classList.remove('hid'); $('.vmeaning').classList.add('lit'); await sayRel(v); if(run===vs.run) $('.vmeaning').classList.remove('lit'); }
  }catch(e){}
}
async function vMean(){
  vStop(); hideHint(); const run=++vs.run; vs.mode='learn'; vRail();
  const v=LESSON.vocab[vs.i]; vRender(true); vStatus(tr('Listen!'));   // the plural / meaning / opposite word stays WRITTEN under the word the whole time (Marwa 2026-11-06); it lights up while it is spoken
  try{
    await vSleep(500,run);
    for(let rep=0;rep<2;rep++){
      $('.vword').classList.add('lit'); await sayWord(v); if(run!==vs.run) return; $('.vword').classList.remove('lit'); await vSleep(700,run);
      const m=$('.vmeaning'); m.classList.remove('hid'); m.classList.add('lit');
      await sayRel(v); if(run!==vs.run) return; m.classList.remove('lit'); await vSleep(900,run);
    }
    vStatus(''); vs.mode='done'; vRail(); celebrate($('.vword'));
    if(vs.popup){ await vSleep(1200,run); if(tab!=='words') return; vs.mode='idle'; vRail(); const x=$('.wpclose'); if(x) x.click(); return; }   // the pen popup (one word seen from the lesson page): NO star, NO progress, NO stars screen - back to the lesson (Marwa 2026-11-06)
    const d=vDone(); if(!d.includes(v.word)){ d.push(v.word); try{ localStorage.setItem('zoom-vocab',JSON.stringify(VDONE)); }catch(e){} } (vs.seen||(vs.seen=new Set())).add(v.word);
    vCar(true); const th=$$('.vthumb')[vs.i]; if(th&&!$('.vst',th)) th.append(el('span','vst',STAR(true)));
    await vSleep(1200,run); if(tab!=='words') return;
    const left=LESSON.vocab.map((x,i)=>i).filter(i=>!vs.seen.has(LESSON.vocab[i].word));
    if(!left.length){ vs.mode='idle'; vRail(); award(LESSON.id,'words'); return; }
    vs.i=left.find(i=>i>vs.i) ?? left[0]; vMean();
  }catch(e){}
}
/* Arabic letters are separate inline spans; iOS Safari stops joining them when a span is animated (opacity/transform), so Arabic letters are never animated by GSAP (the colour states still change). */
const ltAnim=()=>anim&&!$('.vword')?.classList.contains('ws-ar');
async function vTeach(){
  if(vMode()) return vMean();
  vStop(); hideHint(); const ip=$('#vin'); if(ip) ip.blur();
  const run=++vs.run; vs.mode='learn'; vRail();
  const v=LESSON.vocab[vs.i];
  vRender(true); vStatus(tr('Listen!'));
  if(ltAnim()) G.from('.vword .lt',{opacity:0,stagger:.04,duration:.3});
  try{
    await vSleep(500,run);
    $('.vword').classList.add('lit'); await sayHead(v); if(run!==vs.run) return; $('.vword').classList.remove('lit'); await vSleep(800,run);
    const reps=LESSON.vocabRepeats||3;   // fixed order: word once, then (parts -> whole word) x3
    for(let rep=1;rep<=reps;rep++){
      vStatus(isAr()?`${tr('Read with me!')} ${num(rep)}/${num(reps)}`:`Read with me! ${rep}/${reps}`);
      if(ltAnim()) await new Promise(r=>G.to('.vword .lt',{opacity:0,duration:.2,onComplete:r}));
      if(run!==vs.run) return;
      vRender(false); await vSleep(350,run);
      for(let pi=0;pi<v.parts.length;pi++){
        const p=v.parts[pi]; if(p.t===' '){ await vSleep(350,run); continue; }
        const seg=$(`.vword .wsg[data-p="${pi}"]`), lts=$$('.lt',seg); seg.classList.add('on');
        const snd=sayPart(p);
        for(let k=0;k<lts.length;k++){ lts[k].classList.remove('hid'); if(ltAnim()) G.fromTo(lts[k],{scale:1.4},{scale:1,duration:.3,ease:'back.out(3)'}); await vSleep(260,run); }
        await snd; if(run!==vs.run) return;
        seg.classList.remove('on'); await vSleep(750,run);   // longer pause between parts than between letters
        if(p.blend){   // the sounds so far, joined: sh-a-k-e -> "shake"
          let k=pi; const grp=[]; while(k>=0 && v.parts[k].t!==' '){ const g=$(`.vword .wsg[data-p="${k}"]`); if(g) grp.push(g); k--; }
          grp.forEach(g=>g.classList.add('on')); await playFile(p.blend); if(run!==vs.run) return; grp.forEach(g=>g.classList.remove('on')); await vSleep(650,run);
        }
      }
      $('.vword').classList.add('lit'); await sayWordAgain(v); if(run!==vs.run) return; await vSleep(700,run); $('.vword').classList.remove('lit'); await vSleep(500,run);
    }
    if(run===vs.run) vWrite();
  }catch(e){}
}
function vWrite(){
  vStop(); const run=vs.run; vs.mode='write'; vRail();
  const v=LESSON.vocab[vs.i]; vRender(false); $('.vword').classList.add('writing'); vStatus(tr(TOUCH()?'Tap and write!':'Your turn! Write it.'));
  const boxes=$$('.vword .lt'); vs.letters=glyphs(v.word).filter(c=>c!==' '); vs.pos=0; let typed='';
  const inp=el('input','vin'); Object.assign(inp,{type:'text',autocomplete:'off',spellcheck:false,id:'vin'});
  wsInput(inp,v.word,isAr()?'ar':'en'); inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Type the word');
  $('.vword').append(inp); $('.vword').addEventListener('click',()=>inp.focus({preventScroll:true}));
  inp.addEventListener('focus',()=>{ $('.vword').classList.add('focus'); if(vs.mode==='write') $('.vstatus').textContent=tr('Your turn! Write it.'); });
  inp.addEventListener('blur',()=>{ const w=$('.vword'); if(w) w.classList.remove('focus'); });
  const cur=()=>boxes.forEach((b,i)=>b.classList.toggle('cur',i===vs.pos));
  cur(); fitWord(); inp.focus({preventScroll:true});   // open the keyboard straight away (an iPhone/iPad only allows it right after a tap, e.g. on Write)
  showHint($('.vword'),LESSON.hints.vocabWrite,600,'vocabWrite');
  inp.addEventListener('input',()=>{
    hideHint(); const val=inp.value.replace(/\s/g,'');
    if(val.startsWith(typed)){
      for(const ch of val.slice(typed.length)){
        if(vs.pos>=vs.letters.length) break;
        const want=vs.letters[vs.pos];
        if(isAr()&&new RegExp('['+AR_MARKS+']').test(ch)){ typed+=ch; continue; }   // a vowel mark typed on its own is ignored
        if(isAr()?sameLetter(ch,want):ch.toLowerCase()===want.toLowerCase()){ const b=boxes[vs.pos]; b.classList.remove('hid','peek'); b.classList.add('got'); typed+=ch; blip(560+vs.pos*40,.05);
          if(ltAnim()) G.fromTo(b,{scale:1.3},{scale:1,duration:.35,ease:'back.out(3)'}); vs.pos++; }
        else { tone(170,'square',.06,.18); wsBad(boxes[vs.pos]); break; }   // never written, the place shakes
      }
    }
    inp.value=typed; cur();
    if(vs.pos>=vs.letters.length && run===vs.run) vWin(v);
  });
}
// Help: show the letter the child is on (faintly) and say the sound of its part
function vHelp(){
  if(vs.mode!=='write') return; const v=LESSON.vocab[vs.i], boxes=$$('.vword .lt'), i=vs.pos; if(i>=boxes.length) return;
  const b=boxes[i]; b.classList.remove('hid'); b.classList.add('peek'); if(ltAnim()) G.fromTo(b,{scale:1.3},{scale:1,duration:.4,ease:'back.out(3)'});
  const seg=b.closest('.wsg'); const p=v.parts[+seg.dataset.p]; seg.classList.add('on'); sayPart(p).then(()=>seg.classList.remove('on'));
  setTimeout(()=>{ if(b.classList.contains('peek')){ b.classList.add('hid'); b.classList.remove('peek'); } },tokMs('--help-letter-ms',1500));
  const inp=$('#vin'); if(inp) inp.focus({preventScroll:true});
}
// word written right: celebrate, say the word, then go straight on to the next word (no "Next" button)
async function vWin(v){
  vs.mode='done'; vRail(); const run=vs.run;
  vStatus(''); celebrate($('.vword'));   // the celebration is the praise: no "Good job" said or written
  if(vs.popup){ await sayWord(v); await new Promise(r=>setTimeout(r,700)); if(run!==vs.run||tab!=='words') return; vs.mode='idle'; vRail(); const x=$('.wpclose'); if(x) x.click(); return; }   // the pen popup: no star / progress, only the word, then back to the lesson
  const d=vDone(); if(!d.includes(v.word)){ d.push(v.word); try{ localStorage.setItem('zoom-vocab',JSON.stringify(VDONE)); }catch(e){} } (vs.seen||(vs.seen=new Set())).add(v.word);
  vCar(true);
  const th=$$('.vthumb')[vs.i]; if(th&&!$('.vst',th)) th.append(el('span','vst',STAR(true)));
  await new Promise(r=>setTimeout(r,500)); if(run!==vs.run) return;
  await sayWord(v); await new Promise(r=>setTimeout(r,700)); if(run!==vs.run||tab!=='words') return;
  if(vs.popup){ vs.mode='idle'; vRail(); const x=$('.wpclose'); if(x) x.click(); return; }   // popup: one word only, then back to the words page
  const left=LESSON.vocab.map((x,i)=>i).filter(i=>!vs.seen.has(LESSON.vocab[i].word));
  if(!left.length){ const ip=$('#vin'); if(ip) ip.blur(); vs.mode='idle'; vRail(); award(LESSON.id,'words'); return; }
  vs.i=left.find(i=>i>vs.i) ?? left[0]; vTeach();
}
// the 5 buttons are made once and never move; vRail only fades the ones that can't be used now
function vTools(){
  const tools=$('.vtools'); tools.innerHTML='';
  const items=[
    {k:'help',kind:'help',icon:'hint',label:isAr()?'ساعدني':tr('Help'),click:vHelp},
    {k:'teach',kind:'go',icon:'restart',label:isAr()?'علّمني':tr('Teach'),click:vTeach},
    {k:'write',kind:'speed',icon:'pencil',label:isAr()?'اكتب':tr('Write'),click:()=>{ if(vs.mode!=='write') vWrite(); else { const i=$('#vin'); i&&i.focus({preventScroll:true}); } }}
  ];
  (vMode()?items.filter(it=>!['help','write'].includes(it.k)):items).forEach(it=>{ const b=el('button','dash '+it.kind+(it.icon==='restart'?' ln':''),`<span class="rb">${ICON[it.icon]}</span><span>${it.label}</span>`); b.dataset.k=it.k;
    b.addEventListener('pointerdown',e=>{ if($('#vin')&&$('#vin')===document.activeElement) e.preventDefault(); });   // keep the keyboard open
    b.addEventListener('click',it.click); tools.append(b); });
}
function vRail(){
  if(tab!=='words') return; const m=vs.mode, B=k=>$(`.vtools .dash[data-k="${k}"]`)||document.createElement('i'); if(!$('.vtools .dash')) return;
  B('help').classList.toggle('off',m!=='write');
  B('teach').classList.toggle('on',m==='learn');
  B('write').classList.toggle('on',m==='write');
  B('stop').classList.toggle('off',m!=='learn');
  ['listen','teach','write'].forEach(k=>B(k).classList.toggle('off',m==='done'));
}
// make the word fit on one line in its place
function fitWord(){
  const w=$('.vword'); if(!w) return; w.style.fontSize='';
  let fs=parseFloat(getComputedStyle(w).fontSize);
  for(let k=0;k<30 && w.scrollWidth>w.clientWidth+1 && fs>18;k++){ fs-=3; w.style.fontSize=fs+'px'; }
}
const TOUCH=()=>matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints>0 && !matchMedia('(pointer:fine)').matches;
/* Portrait or landscape, and the sizes, come from the screen size WITHOUT the keyboard:
   the keyboard makes the visible part short, but the page must not change when it opens. */
const vScr={w:innerWidth,h:innerHeight};
function vLayout(){
  const L=$('#lesson'); if(!L) return;
  const typing=document.activeElement&&document.activeElement.id==='vin';
  if(innerWidth!==vScr.w || innerHeight>vScr.h || !typing){ vScr.w=innerWidth; vScr.h=innerHeight; }   // only turning the device (or no keyboard) changes it
  const {w,h}=vScr, land=w>h*1.1, c=(a,x,b)=>Math.round(Math.max(a,Math.min(b,x)));
  L.classList.toggle('v-land',land); L.classList.toggle('v-port',!land); L.classList.toggle('v-short',h<500);
  if(!typing){ const st=$('#stage'); if(st&&st.clientHeight>0) vScr.sh=st.clientHeight; }
  const sh=vScr.sh||h*.62, n=(LESSON&&LESSON.vocab||[]).length||1;
  L.style.setProperty('--wfs',c(34,land?Math.min(w*.07,h*.13):Math.min(w*.13,h*.08),96)+'px');
  L.style.setProperty('--wbtn',c(38,land?Math.min(h*.08,w*.042):Math.min(w*.11,h*.06),60)+'px');
  L.style.setProperty('--pich',c(70,land?Math.min(sh*.78,w*.3):Math.min(w*.45,h*.2),520)+'px');
  if(vs.popup){ L.style.setProperty('--pich',c(90,Math.min(h*.3,w*.55),260)+'px'); L.style.setProperty('--wfs',c(40,Math.min(w*.12,h*.1),84)+'px'); }   // word popup: one compact card (picture and word sized to the card, not to the page)
  L.style.setProperty('--vgap',c(6,h*.014,16)+'px');
  if(land){   // the word pictures: as many columns as give the biggest pictures, filling the right-hand column
    const pw=w*.26, pad=30, gap=c(5,sh*.02,12); let best=[0,1];
    for(let cols=1;cols<=3;cols++){ const rows=Math.ceil(n/cols), cw=(pw-(cols-1)*gap)/cols, chh=(sh-pad-(rows-1)*gap)/rows, s=Math.min(cw,chh*4/3); if(s>best[0]) best=[s,cols]; }
    L.style.setProperty('--pw',Math.round(pw)+'px'); L.style.setProperty('--pcols',best[1]); L.style.setProperty('--pgap',gap+'px');
    L.style.setProperty('--thumb',c(40,best[0],140)+'px');
  } else { L.style.setProperty('--thumb',c(48,Math.min(w*.14,h*.07),90)+'px'); }
}
// the picture's white frame hugs the picture (no empty strips): the box is cut to the picture's own proportions, as big as the room allows
function vFitImg(){ const im=$('.vimg'), wrap=im&&im.parentElement; if(!im||!im.naturalWidth||!wrap||!wrap.clientWidth) return;
  const b=parseFloat(getComputedStyle(im).borderTopWidth)||0, pich=parseFloat($('#lesson').style.getPropertyValue('--pich'))||140, ar=im.naturalWidth/im.naturalHeight;
  const rem=parseFloat(getComputedStyle(document.documentElement).fontSize)||16, bw=wrap.clientWidth-.75*rem-2*b, bh=wrap.clientHeight-.625*rem-2*b;   /* same margins as the css max-width/max-height, so the box never gets clamped away from the picture's shape */ let h=Math.min(pich-2*b,bh), w=h*ar; if(w>bw){ w=bw; h=w/ar; }   // w x h = the PICTURE; the frame border is added round it
  im.style.width=Math.max(20,w)+2*b+'px'; im.style.height=Math.max(20,h)+2*b+'px'; }
// word buttons without pictures (vmode) in the landscape column: as many columns as it takes so every word shows whole (never cut at the bottom)
function vPickFit(){ const pk=$('.vpick'); if(!pk) return; pk.style.gridTemplateColumns=''; if(!$('#lesson').classList.contains('vmode')||!$('#lesson').classList.contains('v-land')) return;
  for(let c=2;c<=4&&pk.scrollHeight>pk.clientHeight+1;c++) pk.style.gridTemplateColumns=`repeat(${c},auto)`; }
addEventListener('resize',()=>{ if(tab==='words'){ vLayout(); fitWord(); vPickFit(); setTimeout(vFitImg,60); } });
// iPhone may slide the page under the keyboard: js/core.js (kbSync / kbPin) slides it back, for every screen

// the car in the header moves one step for every word learned
function vCar(drive){ const n=LESSON.vocab.length||1; if(drive){ carDrive(true); setTimeout(()=>carDrive(false),900); } carFrac(vDone().length/n); }

/* ---------- Pen on lesson words: a word that is also in this lesson's Words tab gets a small pen; it opens that ONE word in the usual
   learn-then-write page as a popup over the page the child is on, and closing it puts him back exactly there ---------- */
const WP={saved:null};
function wpClose(){
  const s=WP.saved; if(!s) return; WP.saved=null; (WP.back||[]).forEach(n=>n.remove()); WP.back=null; vStop(); vs.popup=0; vs.mode='idle';
  s.L.vocab=s.vocab; vs.i=s.i; tab=s.tab; const L=$('#lesson'); L.className=s.cls;
  stage.innerHTML=''; s.stage.forEach(n=>stage.append(n)); rail.innerHTML=''; s.rail.forEach(n=>rail.append(n)); trackCar.style.transform=s.car;
}
function wpOpen(v){
  if(WP.saved) return;
  const L=$('#lesson'); stopAll(); vStop(); hideHint();
  WP.saved={L:LESSON,vocab:LESSON.vocab,i:vs.i,tab,cls:L.className,stage:[...stage.childNodes],rail:[...rail.childNodes],car:trackCar.style.transform};
  // the page the child is on stays visible (still copy) under a dim; the word page is the popup card on top
  const back=stage.cloneNode(false); back.classList.add('wpback'); back.setAttribute('inert',''); back.setAttribute('aria-hidden','true'); WP.saved.stage.forEach(n=>back.append(n.cloneNode(true)));
  const dim=el('div','wpdim'); stage.after(back,dim); WP.back=[back,dim]; dim.addEventListener('click',wpClose);
  LESSON.vocab=[v]; vs.i=0; vs.popup=1; tab='words'; L.classList.add('wpop');
  showWords();
  const x=el('button','rb popx wpclose',ICON.close); x.setAttribute('aria-label','Close'); stage.append(x); x.addEventListener('click',wpClose);
}
const wpKey=t=>String(t||'').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/[^a-z'\u0621-\u064A]/g,'');
function penify(){
  if(!LESSON||!LESSON.vocab||!LESSON.vocab.length||tab==='words'||WP.saved) return;
  // one word -> its vocab entry; a phrase ("shake hands", "alarm clock") -> its words in order (the pen goes on its LAST word)
  const by={}, multi=[]; LESSON.vocab.forEach(v=>{ const ws=String(v.word).trim().split(/\s+/).map(wpKey).filter(Boolean); if(!ws.length) return;
    if(ws.length>1) multi.push({ws,v}); else { by[ws[0]]=v; if(/^\u0627\u0644/.test(ws[0])) by[ws[0].slice(2)]=by[ws[0].slice(2)]||v; } });
  const txt=sp=>sp.firstChild&&sp.firstChild.nodeType===3?sp.firstChild.data:sp.textContent;
  const find=k=>by[k]||(/^\u0627\u0644/.test(k)&&by[k.slice(2)])||null;   // Arabic: "\u0627\u0644\u0652\u0623\u064E\u0631\u0652\u0646\u064E\u0628\u064F" in a text is the vocab word "\u0623\u064E\u0631\u0652\u0646\u064E\u0628" (harakat already ignored)
  const pen=(sp,v)=>{ sp._pen=1; const b=el('span','wpn',ICON.pencil); b.setAttribute('role','button'); b.setAttribute('aria-label','Learn the word '+v.word);
    b.addEventListener('click',e=>{ e.stopPropagation(); e.preventDefault(); wpOpen(v); }); sp.classList.add('haspen'); sp.append(b); };
  const all=$$('#stage .w, #stage .alw').filter(sp=>!sp.closest('.wpback'));
  all.forEach((sp,i)=>{
    if(sp._pen!==undefined||sp.classList.contains('alans')) return; const k=wpKey(txt(sp));
    for(const m of multi){ const n=m.ws.length; if(i+1<n||m.ws[n-1]!==k) continue;   // this span ends the phrase: the n-1 spans before it (same line) must be its first words
      const prev=all.slice(i-n+1,i); if(prev.every((p,j)=>p.parentElement===sp.parentElement&&wpKey(txt(p))===m.ws[j])) return pen(sp,m.v); }
    const v=find(k); sp._pen=v?1:0; if(v) pen(sp,v);
  });
}
{ let pt=0; new MutationObserver(()=>{ clearTimeout(pt); pt=setTimeout(penify,60); }).observe(stage,{childList:true,subtree:true}); }
