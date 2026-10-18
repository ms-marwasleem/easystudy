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
function tts(text,lang='en',rate=.8){
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
function playBuf(buf,from=0,dur){ return new Promise(res=>{ const s=player.ctx.createBufferSource(); s.buffer=buf; s.connect(player.ctx.destination);
  vs.src=s; s.onended=()=>{ if(vs.src===s) vs.src=null; res(); }; dur!=null?s.start(0,from,dur):s.start(0,from); }); }
async function playFile(url){ await ensureCtx();
  let buf=await libBuffer(url,player.ctx).catch(()=>null);   // a recording from the audio library wins; else the file in the app
  if(!buf){
    if(!vs.files[url]) vs.files[url]=fetch(url).then(r=>{ if(!r.ok) throw new Error('missing'); return r.arrayBuffer(); }).then(b=>new Promise((ok,no)=>player.ctx.decodeAudioData(b,ok,no))).catch(()=>{ delete vs.files[url]; return null; });
    buf=await vs.files[url];
  }
  if(!buf){ if(isAr()){ await nap(350); return; } throw new Error('missing audio'); }   // Arabic: a recording not made yet is silent
  return playBuf(buf); }
async function playClip([s,e]){ await ensureAudio(); return playBuf(player.bufs.n,Math.max(0,s-.03),e-s+.08); }   // single words: normal speed
const sayWord=v=>v.audio&&v.audio.word?playFile(v.audio.word):v.clip?playClip(v.clip):tts(v.word,isAr()?'ar':'en',.75);
// the whole word said after its parts (her second take sounds natural there); falls back to the first take
const sayWordAgain=v=>v.audio&&v.audio.again?playFile(v.audio.again):sayWord(v);
const sayAr=v=>v.audio&&v.audio.ar?playFile(v.audio.ar):tts(v.ar,'ar',.85);
const sayPart=p=>p.silent?new Promise(r=>setTimeout(r,350)):p.audio?playFile(p.audio):p.say?tts(p.say,isAr()?'ar':'en',.7):new Promise(r=>setTimeout(r,300));

// the small speaker next to a text: just a blue line drawing, not a round button
const SAY_LN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
function showWords(){
  stage.innerHTML='';
  vs.i=Math.min(vs.i,LESSON.vocab.length-1);
  $('#lesson').classList.add('vtab'); $('#lesson').classList.toggle('vmode',vMode()); setRail([]); vLayout();
  const wrap=el('div','vocab'), pick=el('div','vpick');
  LESSON.vocab.forEach((v,i)=>{ const b=el('button','vthumb'+(i===vs.i?' on':''),`${vMode()?`<span class="vtw">${v.word}</span>`:`<img src="${v.img}" alt=""${/\.png$/i.test(v.img)?' class="cut"':''}>`}<b>${i+1}</b>${vDone().includes(v.word)?`<span class="vst">${STAR(true)}</span>`:''}`);
    b.setAttribute('aria-label',`Word ${i+1}: ${v.word}`); b.addEventListener('click',()=>{ vs.i=i; vTeach(); }); pick.append(b); });
  wrap.innerHTML=`<div class="vword" dir="${isAr()?'rtl':'ltr'}"></div>
    <div class="vinfo"><div class="vstatus"></div><div class="vmeaning" dir="rtl"><span class="vm-t"></span><button class="vm-say" aria-label="Arabic meaning">${SAY_LN}</button></div></div>
    <div class="vtools"></div><div class="vimgwrap"><img class="vimg" alt=""></div>`;
  wrap.append(pick); stage.append(wrap);
  $('.vm-say').addEventListener('click',e=>{ e.stopPropagation(); const v=LESSON.vocab[vs.i]; $('.vmeaning').classList.add('lit'); sayAr(v).then(()=>$('.vmeaning')&&$('.vmeaning').classList.remove('lit')); });
  vTools(); vRender(true); vRail(); vCar(false);
  if(vMode()){ $('.vword').addEventListener('click',()=>vMeanSay('word')); $('.vmeaning').addEventListener('click',()=>vMeanSay('rel')); }
  showHint(pick,LESSON.hints.vocabPick,900,'vocabPick');
  setTimeout(()=>{ if(tab==='words') vTeach(); },350);
}
function vRender(fill){
  const v=LESSON.vocab[vs.i], img=$('.vimg');
  if(img.getAttribute('src')!==v.img){ img.src=v.img; if(anim){ G.set(img,{opacity:0}); const go=()=>G.to(img,{opacity:1,duration:.3}); img.decode?img.decode().then(go,go):go(); } }
  img.alt=v.word; img.classList.toggle('cut',/\.png$/i.test(v.img)); if(vMode()&&v.rel) $('.vm-t').innerHTML=`<small>${v.rel.label}</small><span>${v.rel.text}</span>`; else $('.vm-t').textContent=v.ar||''; $('.vmeaning').hidden=!(v.ar||v.rel);   // library cut-outs are png
  $$('.vthumb').forEach((b,i)=>b.classList.toggle('on',i===vs.i));
  const pk=$('.vpick'), on=$('.vthumb.on'); if(pk&&on&&pk.scrollWidth>pk.clientWidth) pk.scrollTo({left:on.offsetLeft-pk.clientWidth/2+on.offsetWidth/2,behavior:'smooth'});   // keep the current word in view in the strip
  const w=$('.vword'); w.innerHTML=''; w.classList.remove('lit','writing','focus');
  w.style.fontSize='';
  v.parts.forEach((p,pi)=>{ if(p.t===' '){ w.append(el('span','vgap')); return; }
    const s=el('span','vseg'); s.dataset.p=pi; glyphs(p.t).forEach(ch=>s.append(el('span','lt'+(fill?'':' hid'),ch))); w.append(s); });   // hidden letters keep their place
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
  const v=LESSON.vocab[vs.i]; vRender(true); vStatus(tr('Listen!')); $('.vmeaning').classList.add('hid');
  try{
    await vSleep(500,run);
    for(let rep=0;rep<2;rep++){
      $('.vword').classList.add('lit'); await sayWord(v); if(run!==vs.run) return; $('.vword').classList.remove('lit'); await vSleep(700,run);
      const m=$('.vmeaning'); m.classList.remove('hid'); m.classList.add('lit'); if(anim) G.from(m,{opacity:0,y:10,duration:.35});
      await sayRel(v); if(run!==vs.run) return; m.classList.remove('lit'); await vSleep(900,run);
    }
    vStatus(''); vs.mode='done'; vRail(); celebrate($('.vword'));
    const d=vDone(); if(!d.includes(v.word)){ d.push(v.word); try{ localStorage.setItem('zoom-vocab',JSON.stringify(VDONE)); }catch(e){} }
    vCar(true); const th=$$('.vthumb')[vs.i]; if(th&&!$('.vst',th)) th.append(el('span','vst',STAR(true)));
    await vSleep(1200,run); if(tab!=='words') return;
    const left=LESSON.vocab.map((x,i)=>i).filter(i=>!vDone().includes(LESSON.vocab[i].word));
    if(!left.length){ vs.mode='idle'; vRail(); award(LESSON.id,'words'); return; }
    vs.i=left.find(i=>i>vs.i) ?? left[0]; vMean();
  }catch(e){}
}
async function vTeach(){
  if(vMode()) return vMean();
  vStop(); hideHint(); const ip=$('#vin'); if(ip) ip.blur();
  const run=++vs.run; vs.mode='learn'; vRail();
  const v=LESSON.vocab[vs.i];
  vRender(true); vStatus(tr('Listen!'));
  if(anim) G.from('.vword .lt',{opacity:0,stagger:.04,duration:.3});
  try{
    await vSleep(500,run);
    $('.vword').classList.add('lit'); await sayWord(v); if(run!==vs.run) return; $('.vword').classList.remove('lit'); await vSleep(800,run);
    const reps=LESSON.vocabRepeats||3;   // fixed order: word once, then (parts -> whole word) x3
    for(let rep=1;rep<=reps;rep++){
      vStatus(isAr()?`${tr('Read with me!')} ${num(rep)}/${num(reps)}`:`Read with me! ${rep}/${reps}`);
      if(anim) await new Promise(r=>G.to('.vword .lt',{opacity:0,duration:.2,onComplete:r}));
      if(run!==vs.run) return;
      vRender(false); await vSleep(350,run);
      for(let pi=0;pi<v.parts.length;pi++){
        const p=v.parts[pi]; if(p.t===' '){ await vSleep(350,run); continue; }
        const seg=$(`.vseg[data-p="${pi}"]`), lts=$$('.lt',seg); seg.classList.add('on');
        const snd=sayPart(p);
        for(let k=0;k<lts.length;k++){ lts[k].classList.remove('hid'); if(anim) G.fromTo(lts[k],{scale:1.4},{scale:1,duration:.3,ease:'back.out(3)'}); await vSleep(260,run); }
        await snd; if(run!==vs.run) return;
        seg.classList.remove('on'); await vSleep(750,run);   // longer pause between parts than between letters
        if(p.blend){   // the sounds so far, joined: sh-a-k-e -> "shake"
          let k=pi; const grp=[]; while(k>=0 && v.parts[k].t!==' '){ const g=$(`.vseg[data-p="${k}"]`); if(g) grp.push(g); k--; }
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
  inp.setAttribute('autocorrect','off'); inp.setAttribute('autocapitalize','off'); inp.setAttribute('enterkeyhint','done'); inp.setAttribute('aria-label','Type the word');
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
        if(isAr()?sameLetter(ch,want):ch.toLowerCase()===want.toLowerCase()){ const b=boxes[vs.pos]; b.classList.remove('hid','peek'); b.classList.add('good'); typed+=ch; blip(560+vs.pos*40,.05);
          if(anim) G.fromTo(b,{scale:1.3},{scale:1,duration:.35,ease:'back.out(3)'}); vs.pos++; }
        else { tone(170,'square',.06,.18); const b=boxes[vs.pos]; b.classList.add('bad'); if(anim) G.fromTo(b,{x:-7},{x:0,duration:.45,ease:'elastic.out(1.5,.25)'}); setTimeout(()=>b.classList.remove('bad'),400); break; }
      }
    }
    inp.value=typed; cur();
    if(vs.pos>=vs.letters.length && run===vs.run) vWin(v);
  });
}
// Help: show the letter the child is on (faintly) and say the sound of its part
function vHelp(){
  if(vs.mode!=='write') return; const v=LESSON.vocab[vs.i], boxes=$$('.vword .lt'), i=vs.pos; if(i>=boxes.length) return;
  const b=boxes[i]; b.classList.remove('hid'); b.classList.add('peek'); if(anim) G.fromTo(b,{scale:1.3},{scale:1,duration:.4,ease:'back.out(3)'});
  const seg=b.closest('.vseg'); const p=v.parts[+seg.dataset.p]; seg.classList.add('on'); sayPart(p).then(()=>seg.classList.remove('on'));
  setTimeout(()=>{ if(b.classList.contains('peek')){ b.classList.add('hid'); b.classList.remove('peek'); } },1600);
  const inp=$('#vin'); if(inp) inp.focus({preventScroll:true});
}
// word written right: celebrate, say the word, then go straight on to the next word (no "Next" button)
async function vWin(v){
  vs.mode='done'; vRail(); const run=vs.run;
  vStatus(''); celebrate($('.vword'));   // the celebration is the praise: no "Good job" said or written
  const d=vDone(); if(!d.includes(v.word)){ d.push(v.word); try{ localStorage.setItem('zoom-vocab',JSON.stringify(VDONE)); }catch(e){} }
  vCar(true);
  const th=$$('.vthumb')[vs.i]; if(th&&!$('.vst',th)) th.append(el('span','vst',STAR(true)));
  await new Promise(r=>setTimeout(r,500)); if(run!==vs.run) return;
  await sayWord(v); await new Promise(r=>setTimeout(r,700)); if(run!==vs.run||tab!=='words') return;
  if(vs.popup){ vs.mode='idle'; vRail(); const x=$('.wpclose'); if(x) x.click(); return; }   // popup: one word only, then back to the words page
  const left=LESSON.vocab.map((x,i)=>i).filter(i=>!vDone().includes(LESSON.vocab[i].word));
  if(!left.length){ const ip=$('#vin'); if(ip) ip.blur(); vs.mode='idle'; vRail(); award(LESSON.id,'words'); return; }
  vs.i=left.find(i=>i>vs.i) ?? left[0]; vTeach();
}
// the 5 buttons are made once and never move; vRail only fades the ones that can't be used now
function vTools(){
  const tools=$('.vtools'); tools.innerHTML='';
  const items=[
    {k:'help',kind:'speed',icon:'hint',label:isAr()?'ساعدني':tr('Help'),click:vHelp},
    {k:'listen',kind:'again',icon:'sound',label:isAr()?'اسمع الكلمة':tr('Listen'),click:()=>{ if(vMode()) return vMeanSay('all'); vStop(); if(vs.mode==='learn'){ vs.mode='idle'; vRail(); } sayWord(LESSON.vocab[vs.i]); }},
    {k:'teach',kind:'go',icon:'restart',label:isAr()?'علّمني الكلمة':tr('Teach'),click:vTeach},
    {k:'write',kind:'speed',icon:'pencil',label:isAr()?'اكتب الكلمة':tr('Write'),click:()=>{ if(vs.mode!=='write') vWrite(); else { const i=$('#vin'); i&&i.focus({preventScroll:true}); } }},
    {k:'stop',kind:'stop',icon:'pause',label:tr('Stop'),click:()=>{ vStop(); if(vs.mode!=='write'){ vs.mode='idle'; vRail(); } }}
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
  L.style.setProperty('--vgap',c(6,h*.014,16)+'px');
  if(land){   // the word pictures: as many columns as give the biggest pictures, filling the right-hand column
    const pw=w*.26, pad=16, gap=c(5,sh*.02,12); let best=[0,1];
    for(let cols=1;cols<=3;cols++){ const rows=Math.ceil(n/cols), cw=(pw-(cols-1)*gap)/cols, chh=(sh-pad-(rows-1)*gap)/rows, s=Math.min(cw,chh*4/3); if(s>best[0]) best=[s,cols]; }
    L.style.setProperty('--pw',Math.round(pw)+'px'); L.style.setProperty('--pcols',best[1]); L.style.setProperty('--pgap',gap+'px');
    L.style.setProperty('--thumb',c(40,best[0],140)+'px');
  } else { L.style.setProperty('--thumb',c(48,Math.min(w*.14,h*.07),90)+'px'); }
}
addEventListener('resize',()=>{ if(tab==='words'){ vLayout(); fitWord(); } });
// iPhone may slide the page under the keyboard: slide it back so everything stays exactly where it was
if(window.visualViewport) visualViewport.addEventListener('scroll',()=>{ if(scrollY) scrollTo(0,0); });

// the car in the header moves one step for every word learned
function vCar(drive){ const n=LESSON.vocab.length||1; if(drive){ carDrive(true); setTimeout(()=>carDrive(false),900); } carFrac(vDone().length/n); }
