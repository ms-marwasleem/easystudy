/* ENGLISH AL — box models for the Lesson tab (the book's pages, one after another) and the Booklet tab (QM in quiz.js, drawn through qxGo; same sheet, stars and arrows). They read themselves (own:1).
   Content: data/en-al/<lesson>/questions.json, sets "book":"lesson" (Lesson tab) or "book":"booklet" (Booklet tab). Other types (pick, yesno, link, circle, tick, type ...) work as in quiz.js.
   explain = one book page as a part. item: {pics:[..], labels:[{w:"dad", at:[x%,y%]}] (word chips on the first picture), lines:[{t:"text", a:"audio", cls:"red|blue|head|note|sm"}],
             table:{title, rows:[[{t,a},{t,a}],..]}}. Every word of a line is tappable (that word alone is read). Listen reads the page; when all lines were heard the star comes and the green arrow glows.
   mcq     = a sentence (or a picture) with a blank "____" and 2-4 options: item {stem, options:[..], answer:index, word: the solved sentence, audio: solved sentence, parts:[before,after] (audio of the stem read as a question), pic?}
   cloze   = a text with blanks [[answer]] and a word bank: item {text, bank:[..], audio: whole text read once solved}
   order   = words / chunks as tiles, tap them in the right order: item {chunks:[..in order..], end:".", audio} */
// alSlug / alClean / alWordSrc / alToks (tappable words) are SHARED: js/quiz.js (qToks)
const alStar=()=>{ const d=$(`.qdots i[data-i="${qz.i}"]`); if(d&&d.classList.contains('got')) return carFrac((qz.i+1)/qz.list.length); qStar(); };
const alNextGo=()=>{ if(qz.i+1<qz.list.length) qGo(qz.i+1); else award(LESSON.id,qKey()); };

/* ---------- explain ---------- */
function alExplain(box,q,s,run){
  const pg=el('div','alpage'+((q.pics||[]).length?' haspic':'')+(q.pics&&q.pics.length>1?' multi':'')+(q.pics&&q.pics.length>4?' many':'')+(q.table?' hastable':'')+(!(q.lines||[]).length&&!q.table?' notext':'')); box.append(pg);
  const labs=[];   // word chips on the pictures (labels: {w, at:[x%,y%], p: picture index}) and captions under them (caps: [word..]); a tap reads that word
  const chip=(cls,w,host,at)=>{ const b=el('button',cls,w); if(at){ b.style.left=at[0]+'%'; b.style.top=at[1]+'%'; } host.append(b); const id='L:'+w+labs.length; labs.push({b,w,id});
    b.addEventListener('click',async e=>{ e.stopPropagation(); hideHint(); vStop(); tok++; b.classList.add('lit'); await qSound(alWordSrc(w),alClean(w)); b.classList.remove('lit'); heard(id); }); return b; };
  if((q.pics||[]).length){ const pc=el('div','alpics'); q.pics.forEach((p,k)=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=p; im.alt=''; if(q.pics.length===1&&(q.lines||[]).length) im.addEventListener('load',()=>{ if(im.naturalWidth/im.naturalHeight>1.7) pg.classList.add('stack'); }); /* a wide picture (a comic strip) gets the full width, the text goes under it */ f.append(im); pc.append(f);
    (q.labels||[]).filter(lb=>(lb.p||0)===k).forEach(lb=>{ const b=chip('allabel',lb.w,f,lb.at); b.dataset.x=lb.at[0]; b.dataset.y=lb.at[1]; });
    if((q.labels||[]).some(lb=>(lb.p||0)===k)){ f.classList.add('haslab');
      // words stand OUTSIDE the picture (left / right gutter, like the book); a thin line runs from each word to its spot and ends in a small dot
      const NS='http://www.w3.org/2000/svg', sv=document.createElementNS(NS,'svg'); sv.setAttribute('class','allines'); f.append(sv);
      const place=()=>{ const fr=f.getBoundingClientRect(), ir=im.getBoundingClientRect(); if(!ir.width) return; sv.textContent='';
        const bs=$$('.allabel',f).map(b=>({b,w:b.offsetWidth,h:b.offsetHeight,tx:ir.left-fr.left+ir.width*b.dataset.x/100,ty:ir.top-fr.top+ir.height*b.dataset.y/100}));
        const gl=ir.left-fr.left, gr=fr.right-ir.right;
        bs.forEach(o=>o.side=(o.tx-gl)<ir.width/2?'L':'R');
        for(const side of ['L','R']){ const g=bs.filter(o=>o.side===side).sort((a,c)=>a.ty-c.ty); let prev=-1e9;
          g.forEach(o=>{ o.cy=Math.min(Math.max(o.ty,o.h/2+2),fr.height-o.h/2-2); if(o.cy-o.h/2<prev+3) o.cy=prev+3+o.h/2; prev=o.cy+o.h/2; });
          for(let i=g.length-1,top=fr.height-2;i>=0;i--){ if(g[i].cy+g[i].h/2>top) g[i].cy=top-g[i].h/2; top=g[i].cy-g[i].h/2-3; }
          g.forEach(o=>{ o.cx=side==='L'?Math.max(o.w/2+2,gl-8-o.w/2):Math.min(fr.width-o.w/2-2,(fr.width-gr)+8+o.w/2); o.b.style.left=o.cx+'px'; o.b.style.top=o.cy+'px';
            const x1=side==='L'?o.cx+o.w/2:o.cx-o.w/2, ln=document.createElementNS(NS,'line'), dt=document.createElementNS(NS,'circle');
            ln.setAttribute('x1',x1); ln.setAttribute('y1',o.cy); ln.setAttribute('x2',o.tx); ln.setAttribute('y2',o.ty); dt.setAttribute('cx',o.tx); dt.setAttribute('cy',o.ty); dt.setAttribute('r',3.5); sv.append(ln,dt); }); } };
      im.addEventListener('load',place); new ResizeObserver(place).observe(f); setTimeout(place,60); }
    if(q.caps&&q.caps[k]) chip('alcap',q.caps[k],f); });
    pg.append(pc); }
  const tx=el('div','altext'); pg.append(tx);
  const rows=[], need=new Set(), got=new Set(); let tok=0;
  const heard=k=>{ got.add(k); if(need.size&&[...need].every(x=>got.has(x))) done(); };
  const lightT=[]; const clearLit=()=>{ lightT.forEach(clearTimeout); lightT.length=0; $$('.alw.rd',tx).forEach(x=>x.classList.remove('rd')); };
  // the words of a line light up one by one while it is read (share of the line's length; the sound's own length from the playing buffer)
  const lightLine=async(row,pr)=>{ const ws=$$('.alw',row); let d=0; for(let i=0;i<25&&!d;i++){ await new Promise(z=>setTimeout(z,24)); if(vs.src&&vs.src.buffer) d=vs.src.buffer.duration; }
    if(d&&ws.length){ const wt=ws.map(x=>x.textContent.length+1), tot=wt.reduce((u,v)=>u+v,0); let c=0; ws.forEach((x,k)=>{ const at=d*.97*c/tot*1000; c+=wt[k]; lightT.push(setTimeout(()=>{ $$('.alw.rd',tx).forEach(y=>y.classList.remove('rd')); x.classList.add('rd'); },at)); }); lightT.push(setTimeout(()=>ws.forEach(x=>x.classList.remove('rd')),d*1000)); }
    await pr; };
  const mk=(t,src,cls,host)=>{ const row=el('div','alline'+(cls?' '+String(cls).split(/\s+/).map(c=>'al-'+c).join(' '):''))   /* line styles get an al- prefix: a bare .note/.head would pick up the reading card's rules */; const p=el('p','altx'); alToks(p,t); row.append(p); host.append(row); if(!cls) host.append(' ');
    const id='T'+rows.length; need.add(id); const r={row,t,src,id}; rows.push(r);
    const go=async()=>{ if(!row.isConnected) return; const my=++tok; clearOn(); vStop(); row.classList.add('on'); await lightLine(row,qSound(src,t)); if(my===tok){ row.classList.remove('on'); heard(id); } };
    row.addEventListener('click',e=>{ if(e.target.closest('.alw')) return; go(); }); r.go=go; r.play=async()=>{ row.classList.add('on'); await lightLine(row,qSound(src,t)); row.classList.remove('on'); heard(id); }; return r; };
  const clearOn=()=>{ clearLit(); rows.forEach(r=>r.row.classList.remove('on')); };
  if((q.lines||[]).length&&!q.table) tx.classList.add('alprose');
  pg.addEventListener('pointerdown',e=>{ if(!e.target.closest('.alw,.alline')&&qz.list[qz.i]===q){ tok++; vStop(); clearOn(); } },true);   // a tap elsewhere stops the reading
  (q.lines||[]).forEach(l=>mk(l.t,l.a?R_Q(l.a):null,l.cls,tx));
  if(q.table){ const tb=el('div','altable'); if(q.table.title){ const h=el('div','althead'); alToks(h,q.table.title); tb.append(h); }
    const grid=el('div','altrows'); q.table.rows.forEach(r=>{ const rw=el('div','altrow'); r.forEach(c=>{ const cell=el('button','altcell'); alToks(cell,c.t); const id='T'+rows.length; need.add(id); const it={row:cell,t:c.t,src:c.a?R_Q(c.a):null,id}; rows.push(it);
        cell.addEventListener('click',async e=>{ if(e.target.closest('.alw')) return; const my=++tok; clearOn(); vStop(); cell.classList.add('on'); await qSound(it.src,c.t); if(my===tok){ cell.classList.remove('on'); heard(id); } });
        it.play=async()=>{ cell.classList.add('on'); await qSound(it.src,c.t); cell.classList.remove('on'); heard(id); }; rw.append(cell); }); grid.append(rw); }); tb.append(grid); tx.append(tb); }
  labs.forEach(l=>need.add(l.id));
  let playing=false, allGen=0; const setPl=on=>{ playing=on; const b=$('#rail .dash.go')||rail.firstElementChild; if(b){ const r=$('.rb',b), t=b.lastElementChild; if(r) r.innerHTML=on?ICON.stop:ICON.play; if(t) t.textContent=on?tr('Stop'):tr('Listen'); } };   // the Listen button is also Pause/Stop while the page is read (Ahmed 2026-11-15)
  setRail([{kind:'go',icon:'play',label:tr('Listen'),click:()=>{ hideHint(); if(playing){ tok++; vStop(); clearOn(); setPl(false); } else all(); }}]); $('#lesson').classList.add('qrail');   // the shared Listen button, top right with the help buttons; the stars under the title move on
  function done(){ if(q._done) return; q._done=1; alStar(); }
  const all=async()=>{ const my=++tok; clearOn(); vStop(); const id=++allGen; setPl(true); try{ return await all0(my); } finally{ if(id===allGen) setPl(false); } };
  const all0=async my=>{ for(const r of rows){ if(my!==tok||qz.list[qz.i]!==q||!inQ()) return false; await r.play(); if(my!==tok) return false; await new Promise(z=>setTimeout(z,r.row.classList.contains('al-head')?300:450)); }
    for(const l of labs){ if(my!==tok||qz.list[qz.i]!==q||!inQ()) return false; l.b.classList.add('lit'); await qSound(alWordSrc(l.w),alClean(l.w)); l.b.classList.remove('lit'); heard(l.id); if(my!==tok) return false; await new Promise(z=>setTimeout(z,350)); } return my===tok; };
  box._after=async()=>{ if(!q._done) await all(); };
}

/* ---------- fixed passage over a question (reading comprehension) ---------- */
function alPassage(w,q){
  if(!q.set||!q.set.grp||q.set.type==='explain') return;
  const src=qz.list.find(x=>x.set&&x.set!==q.set&&x.set.type==='explain'&&x.set.grp===q.set.grp&&x.set.page===q.set.page); if(!src||!(src.lines||[]).length) return;
  const ps=el('div','alpassage'); w.classList.add('haspass'); w.prepend(ps);
  if((src.pics||[]).length){ const im=el('img','alpimg',''); im.src=src.pics[0]; im.alt=''; ps.append(im); }
  const tx=el('div','alptext'); ps.append(tx); const rows=[];
  src.lines.forEach(l=>{ const p=el('p','altx'+(l.cls==='head'?' alphead':'')); alToks(p,l.t); tx.append(p); rows.push({p,a:l.a?R_Q(l.a):null,t:l.t}); });
  const bt=el('button','qsay alsp alpplay',SAY_LN); bt.setAttribute('aria-label','Listen'); ps.append(bt); let gen=0;
  const stop=()=>{ gen++; vStop(); bt.classList.remove('on'); rows.forEach(r=>r.p.classList.remove('on')); };
  bt.addEventListener('click',async e=>{ e.stopPropagation(); hideHint(); if(bt.classList.contains('on')){ stop(); return; } stop(); const my=gen; bt.classList.add('on');
    for(const r of rows){ if(my!==gen) return; r.p.classList.add('on'); await qSound(r.a,r.t); r.p.classList.remove('on'); if(my!==gen) return; await new Promise(z=>setTimeout(z,350)); } if(my===gen) bt.classList.remove('on'); });
  w.addEventListener('pointerdown',e=>{ if(bt.classList.contains('on')&&!e.target.closest('.alpplay')) stop(); },true);
  const prev=qz.list[qz.i-1]; if(!(prev&&prev.set&&prev.set.grp===q.set.grp&&prev.set.type==='mcq')) q._passPlay=()=>{ if(!bt.classList.contains('on')) bt.click(); };   // the first question of the passage: the passage plays by itself, a pause button stops it
}

/* ---------- mistake: "Correct the mistake in each sentence." (Ahmed 2026-11-15) — the wrong sentence on top, under it two boxes: "Mistake" and "Correct word".
   The child TAPS a word of the sentence, or DRAGS it, into the Mistake box (a wrong word shakes); then types the correct word with the keyboard in the Correct word box.
   item {ask: "My dog are very playful.", word: "My dog is very playful." (the right sentence), audio: right sentence} — the wrong span is found by comparing ask and word. ---------- */
function alMistake(box,q,s,run){
  const w=el('div','almcq almistake'); box.append(w); q.solved=false;
  const core=t=>String(t).toLowerCase().replace(/[^a-z0-9'’]+/g,''), A=String(q.ask).split(/\s+/).filter(Boolean), B=String(q.word).split(/\s+/).filter(Boolean);
  let a0=0; while(a0<A.length&&a0<B.length&&core(A[a0])===core(B[a0])) a0++;
  let ea=A.length, eb=B.length; while(ea>a0&&eb>a0&&core(A[ea-1])===core(B[eb-1])){ ea--; eb--; }
  const wrongTxt=A.slice(a0,ea).join(' ').replace(/[.?!,]+$/,''), rightTxt=B.slice(a0,eb).join(' ').replace(/[.?!,]+$/,'');
  const st=el('div','alstem'); w.append(st); const p=el('p','altx almsent'); st.append(p);
  const slots=el('div','almslots'); w.append(slots);
  const mk=el('div','almslot'); mk.innerHTML='<small>Mistake</small>'; const mkv=el('b','almval',''); mk.append(mkv);
  const cw=el('div','almslot off'); cw.innerHTML='<small>Correct word</small>'; const inp=el('input','almin'); inp.type='text'; inp.autocomplete='off'; inp.autocapitalize='off'; inp.spellcheck=false; inp.disabled=true; cw.append(inp);
  const go=el('button','almgo','✓'); go.type='button'; go.setAttribute('aria-label','Check'); cw.append(go); slots.append(mk,cw);
  let found=false; const spans=[];
  const pick=(k,sp)=>{ if(qz.busy||q.solved||found) return;
    if(k<a0||k>=ea){ qxBad(sp); sp.classList.add('bad'); setTimeout(()=>sp.classList.remove('bad'),700); mk.classList.add('no'); setTimeout(()=>mk.classList.remove('no'),700); return; }
    found=true; spans.slice(a0,ea).forEach(x=>x.classList.add('wrong')); mkv.textContent=wrongTxt; mk.classList.add('got'); cw.classList.remove('off'); inp.disabled=false; setTimeout(()=>inp.focus(),50); };
  A.forEach((t,k)=>{ const sp=el('span','alw almw',t); spans.push(sp); p.append(k?' ':'',sp);
    let d=null, mv=false;
    sp.addEventListener('pointerdown',e=>{ if(qz.busy||q.solved||found||e.button>0) return; d={x:e.clientX,y:e.clientY,id:e.pointerId}; mv=false; });
    sp.addEventListener('pointermove',e=>{ if(!d||e.pointerId!==d.id) return;
      if(!mv&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>8){ mv=true; try{ sp.setPointerCapture(e.pointerId); }catch(_){} d.g=el('span','aldrag almdrag',t); document.body.append(d.g); hideHint(); }
      if(mv&&d.g){ d.g.style.left=e.clientX+'px'; d.g.style.top=e.clientY+'px'; const r=mk.getBoundingClientRect(); mk.classList.toggle('over',e.clientX>r.left-10&&e.clientX<r.right+10&&e.clientY>r.top-10&&e.clientY<r.bottom+10); } });
    const end=e=>{ if(!d||e.pointerId!==d.id) return; const g=d.g, over=mk.classList.contains('over'); d=null; mk.classList.remove('over'); if(g){ g.remove(); if(over) pick(k,sp); } };
    sp.addEventListener('pointerup',end); sp.addEventListener('pointercancel',e=>{ if(d&&d.g) d.g.remove(); mk.classList.remove('over'); d=null; });
    sp.addEventListener('click',()=>{ if(mv){ mv=false; return; } hideHint(); vStop(); qSound(alWordSrc(t.replace(/[^\w']+/g,'')),alClean(t)); pick(k,sp); }); });
  const check=async()=>{ if(qz.busy||q.solved||!found) return; const v=core(inp.value);
    if(!v) return;
    if(v!==core(rightTxt)){ qxBad(cw); cw.classList.add('no'); setTimeout(()=>cw.classList.remove('no'),700); return; }
    inp.disabled=true; q.solved=true; document.body.classList.remove('typing','kb'); inp.blur(); cw.classList.add('got'); inp.value=rightTxt;
    p.textContent=''; B.forEach((t,i)=>{ const sp=el('span','alw'+(i>=a0&&i<eb?' fixed':''),t); p.append(i?' ':'',sp); }); return qxWin(cw,q,q.winMs||2300); };
  go.addEventListener('click',check); inp.addEventListener('keydown',e=>{ if(e.key==='Enter') check(); });
  q.sayFn=async()=>{ vStop(); return qSound(q.solved?q.audio:null,q.solved?q.word:q.ask); };
  box._after=()=>{};
}

/* ---------- mcq ---------- */
/* tap the squares to count (Ahmed 2026-11-18): item.cells = [ [ [x,y,w,h] (fractions of the picture) in counting order ] per thing ]; tapping the next square of a thing numbers it 1, 2, 3 ...; the choices below still have to be answered */
function alCells(f,im,q){ const G=q.cells; if(!G||!G.length) return; const ov=el('div','alcells'); f.append(ov); const n=G.map(()=>0);
  const place=()=>{ ov.style.cssText=`left:${im.offsetLeft}px;top:${im.offsetTop}px;width:${im.offsetWidth}px;height:${im.offsetHeight}px`; };
  if(window.ResizeObserver) new ResizeObserver(place).observe(im); im.addEventListener('load',place); place();
  G.forEach((g,gi)=>g.forEach((c,ci)=>{ const b=el('button','alcell'); b.setAttribute('aria-label',String(ci+1)); b.style.cssText=`left:${c[0]*100}%;top:${c[1]*100}%;width:${c[2]*100}%;height:${c[3]*100}%`;
    b.addEventListener('click',()=>{ if(qz.busy) return; hideHint(); if(b.dataset.n) return; if(ci!==n[gi]) return qxBad(b); n[gi]++; b.dataset.n=n[gi]; b.innerHTML='<i>'+n[gi]+'</i>'; try{ blip(520+n[gi]*40,.05); }catch(e){} }); ov.append(b); })); }
function alMcq(box,q,s,run){
  const w=el('div','almcq'+(q.pics?' haspic':'')+(q.pics&&/(^|\/)(clock|hand)-/.test(String(q.pics[0]))?' clockq':'')); box.append(w);
  if(q.pics){ const pc=el('div','alpics'); q.pics.forEach((p,k)=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=p; im.alt=''; qPicFit(im,(q.picsTall||[])[k]); im.addEventListener('load',()=>{ if(im.naturalHeight/im.naturalWidth>1.1) w.classList.add('chartq'); }); /* a tall picture = a chart/table: it gets the room, the choices get smaller (Ahmed 2026-11-14) */ f.append(im); if(k===0) alCells(f,im,q); if(q.caps&&q.caps[k]){ const c=el('button','alcap',q.caps[k]); c.onclick=()=>{ vStop(); c.classList.add('lit'); qSound(alWordSrc(q.caps[k]),q.caps[k]).then(()=>c.classList.remove('lit')); }; f.append(c); } pc.append(f); }); w.append(pc); }
  alPassage(w,q);   // reading comprehension: the passage of the same "grp" stays fixed on top, one question at a time (Ahmed 2026-11-15)
  const st=el('div','alstem'); w.append(st); let blank=null;
  const sp=el('button','qsay alsp',SAY_LN); sp.setAttribute('aria-label','Listen'); sp.onclick=()=>{ if(!qz.busy) q.sayFn(); };
  let stemT=String(q.stem), askT=q.ask;
  if(isAr()&&/^math/.test(SUBJECT.id)&&askT&&/^\s*[\d٠-٩]+\s*[+−\-]\s*[\d٠-٩]+\s*=\s*[؟?]\s*$/.test(askT)&&/^الإجابة:?\s*_{2,}\s*$/.test(stemT)){ stemT=askT.replace(/[؟?]\s*$/,'___').trim(); askT=null; }   // Arabic math: no big word "الإجابة", the number sentence itself is the big line (Ahmed 2026-11-18)
  let askEl=null; if(askT){ const a=el('p','alask',''); alToks(a,askT); st.append(a); askEl=a; }
  const p=el('p','altx'); if(!(q.noStem&&askEl)) st.append(p);   // noStem: the question is asked ONCE; the child answers with the choices straight away (Ahmed 2026-11-18) if(isAr()&&/^math/.test(SUBJECT.id)){ p.dir='rtl'; p.classList.add('mrtl'); }   // Arabic math: the number sentence and "الإجابة: __" read from the right (Ahmed 2026-11-14)
  /* word problems (task "Solve the problem." / "نحل المسائل."): the number sentence is HIDDEN until the Help bulb, so the child reads and understands the story first (Ahmed 2026-11-14). Same in English and Arabic math. */
  if(/^(Solve the problem|نحل المسائل)/.test(String(q.set.task||''))&&/\d\s*[+−\-]\s*\d\s*=/.test(String(q.stem))){ p.classList.add('eqhid'); q.eqHidden=true; }
  const word=(t,k)=>{ const sp=el('span','alw',t); sp.addEventListener('click',()=>{ hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(t),alClean(t)).then(()=>sp.classList.remove('lit')); }); p.append(k?' ':'',sp); };
  stemT.split(/\s+/).filter(Boolean).forEach((t,k)=>{ const m=/^([^_]*)_{2,}([^_]*)$/.exec(t);
    if(m&&!blank){ blank=el('button','alblank','<i></i>'); if(k) p.append(' '); if(m[1]) p.append(m[1]); p.append(blank); if(m[2]) p.append(m[2]); blank.addEventListener('click',()=>q.sayFn&&q.sayFn()); }
    else word(t,k); });
  (q.noStem&&askEl?askEl:p).append(' ',sp);   // the small speaker straight AFTER the question text (reads the question only, never the answer)
  const say=q.optSay||q.options;
  const ops=el('div','alopts'+(q.options.some(o=>o.length>14)?' long':'')); w.append(ops);
  q.options.forEach((o,k)=>{ const b=qChBtn(o,qWords(q.options)); b.classList.add('alopt'); b.dataset.k=k;   // THE choice button (quiz.js qChBtn, look in css/qlayout.css)
    b.addEventListener('click',async()=>{ if(qz.busy||q.solved) return; hideHint();
      if(k!==q.answer){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(alWordSrc(say[k]),say[k]); return; }
      if(blank){ blank.classList.add('got'); blank.innerHTML=''; blank.textContent=o; }
      p.classList.remove('eqhid'); q.eqHidden=false; alHandDraw(w,q,o); qRing(b); $$('.alopt',ops).forEach(x=>x!==b&&x.classList.add('dim')); return qxWin(b,q,q.winMs||2300); });
    ops.append(b); });
  q.sayFn=async()=>{ vStop(); const ps=(q.parts||[]).map(R_Q); if(q.askAudio&&!q.solved) return qSound(R_Q(q.askAudio),q.stem);   // the question; once solved, audio = the sentence WITH its answer
    if(q.solved) return qSound(q.audio,q.word);   // solved: the whole sentence with its answer (Ahmed 2026-11-20: the speaker also replays after the answer)
    if(!ps.length){ const qt=q.ask||(/_/.test(String(q.stem))?'':q.stem); if(qt) return tts(qt,isAr()?'ar':'en',.75).catch(()=>{}); return; }   // unsolved and no question clip: NEVER the item's audio (it is the answer); the question text is read, a missing clip is listed in audio-requests (Ahmed 2026-11-20)
    for(let i=0;i<ps.length;i++){ if(qz.list[qz.i]!==q||q.solved) return; await qSound(ps[i],''); if(i<ps.length-1) await new Promise(z=>setTimeout(z,350)); } };
  box._after=()=>{ if(q._passPlay) return q._passPlay(); if(qAuto(q)) return q.sayFn(); };   // the first question of a passage: the passage plays (never two sounds); later ones: the question itself plays   // the question is read only when the child taps the speaker; a fixed passage plays by itself when its first question opens
}

/* the passage is NOT read by itself (the child reads it, Marwa 2026-11-04); the small speaker AFTER the text reads it (tap while playing = stop).
   Any tap elsewhere, a slide change or a question change stops it, so two sounds never overlap. Used by cloze and underline. */
/* "Draw the long hand" (math u8, English + Arabic): the picture (hand-H-M.svg) shows only the short hand; the right answer DRAWS the long hand where the child chose, with the short hand and the centre dot on top (Ahmed 2026-11-14). */
function alHandDraw(w,q,o){ const m=q.pics&&/(^|\/)hand-(\d+)-(\d)\.svg/.exec(String(q.pics[0])), n=parseInt(typeof arDigitsBack==='function'?arDigitsBack(o):o,10), fg=$('.alfig',w); if(!m||!fg||!(n>=1&&n<=12)||$('.clkdraw',fg)) return;
  const h=+m[2], half=+m[3], la=(n%12)*30*Math.PI/180, sa=((h%12)+(half?.5:0))*30*Math.PI/180, pt=(a,r)=>`${(150+Math.sin(a)*r).toFixed(1)} ${(150-Math.cos(a)*r).toFixed(1)}`;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 300 300'); svg.setAttribute('class','clkdraw');
  svg.innerHTML=`<path d="M150 150 L${pt(la,112)}" stroke="#1E6FD0" stroke-width="7" stroke-linecap="round"/><path d="M150 150 L${pt(sa,76)}" stroke="#E5352B" stroke-width="10" stroke-linecap="round"/><circle cx="150" cy="150" r="9" fill="#333"/>`;
  fg.append(svg); svg.style.opacity=0; requestAnimationFrame(()=>{ svg.style.transition='opacity .35s'; svg.style.opacity=1; }); }
function alReplay(box,txt,q){
  const rp=el('button','qsay alsp alreplay',SAY_LN); rp.setAttribute('aria-label','Listen'); txt.append(' ',rp); let pt=0;
  const stopP=()=>{ pt++; vStop(); rp.classList.remove('on'); };
  const playP=async()=>{ stopP(); const my=pt; rp.classList.add('on'); await qSound(!q.solved&&q.askAudio?R_Q(q.askAudio):q.audio,''); if(my===pt) rp.classList.remove('on'); };   // unsolved cloze: askAudio = the passage with a pause at each blank (never the answers; tools/lessons/cloze_ask_audio.py)
  rp.addEventListener('click',e=>{ e.stopPropagation(); hideHint(); rp.classList.contains('on')?stopP():playP(); });
  box.addEventListener('pointerdown',e=>{ if(rp.classList.contains('on')&&!e.target.closest('.alreplay')) stopP(); },true);
  box._after=()=>{ if(qAuto(q)) playP(); };   // the passage is the question: the child reads it; the small speaker after it helps
}

/* ---------- cloze ---------- */
function alCloze(box,q,s,run){
  const w=el('div','alcloze'); box.append(w); q.solved=false;
  const ans=[]; const txt=el('p','altx'); w.append(txt);
  const sentences=String(q.text).split(/(\[\[.+?\]\])/);
  let n=0; sentences.forEach(seg=>{ const m=/^\[\[(.+?)\]\]$/.exec(seg);
    if(m){ ans.push(m[1]); const b=el('button','alblank',`<i></i>`); ++n; b.dataset.n=n-1; txt.append(b); }
    else seg.split(/(\s+)/).forEach(t=>{ if(!t) return; if(/^\s+$/.test(t)) return txt.append(' '); const sp=el('span','alw',t); sp.addEventListener('click',()=>{ hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(t),alClean(t)).then(()=>sp.classList.remove('lit')); }); txt.append(sp); }); });
  const bank=el('div','albank'); const one=ans.length===1&&String(q.text).replace(/\[\[|\]\]/g,'').length<=90;   // Marwa 2026-11-04: ONLY a passage keeps the word choices pinned on top (text slides under them)
  if(one){ w.classList.add('one'); $$('.alblank small',txt).forEach(x=>x.remove()); w.append(bank); } else w.prepend(bank); let cur=0; const blanks=$$('.alblank',txt);
  const filled=new Set(); const firstOpen=()=>blanks.findIndex((b,k)=>!filled.has(k));
  const mark=()=>{ cur=firstOpen(); blanks.forEach((b,k)=>b.classList.toggle('cur',k===cur)); };
  // a chip fills a blank by a TAP (the first open blank) or by DRAGGING it onto any blank (Ahmed 2026-11-15)
  const tryFill=async(b,o,sy,idx)=>{ if(qz.busy||q.solved||b.classList.contains('used')||filled.has(idx)) return;
    if(o.toLowerCase()!==String(ans[idx]).toLowerCase()){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(alWordSrc(sy),sy); return; }
    const bl=blanks[idx]; filled.add(idx); bl.classList.add('got'); bl.innerHTML=''; bl.textContent=ans[idx]; if(!q.reuse) b.classList.add('used'); celebrate(bl); qSound(alWordSrc(sy),sy); mark();
    if(filled.size>=ans.length){ q.solved=true; qz.busy=true; q.word=String(q.text).replace(/\[\[(.+?)\]\]/g,'$1'); const run0=qz.run; celebrate(txt); await qIdle(run0,4000); if(run0!==qz.run) return; await qSound(q.audio,q.word); return qAdvance(run0,600); } };
  q.bank.forEach((o,bk)=>{ const sy=(q.bankSay||q.bank)[bk]; const b=qChBtn(o,qWords(q.bank)); b.classList.add('alopt','alchip'); bank.append(b);   // THE choice button
    let drag=null, moved=false;
    b.addEventListener('pointerdown',e=>{ if(qz.busy||q.solved||b.classList.contains('used')||e.button>0) return; drag={x:e.clientX,y:e.clientY,id:e.pointerId}; moved=false; });
    b.addEventListener('pointermove',e=>{ if(!drag||e.pointerId!==drag.id) return;
      if(!moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){ moved=true; try{ b.setPointerCapture(e.pointerId); }catch(_){} drag.g=b.cloneNode(true); drag.g.classList.add('aldrag'); { const cs=getComputedStyle(b); Object.assign(drag.g.style,{width:b.offsetWidth+'px',height:b.offsetHeight+'px',fontSize:cs.fontSize,fontFamily:cs.fontFamily,background:'#fff',border:'.14rem solid #5A3418',borderRadius:'999px',display:'grid',placeItems:'center',color:'#3a2410',margin:'0'}); } document.body.append(drag.g); b.classList.add('lifted'); hideHint(); }
      if(moved&&drag.g){ drag.g.style.left=e.clientX+'px'; drag.g.style.top=e.clientY+'px'; blanks.forEach(x=>{ const r=x.getBoundingClientRect(); x.classList.toggle('over',!x.classList.contains('got')&&e.clientX>r.left-10&&e.clientX<r.right+10&&e.clientY>r.top-14&&e.clientY<r.bottom+14); }); } });
    const end=e=>{ if(!drag||e.pointerId!==drag.id) return; const g=drag.g; drag=null; if(g){ g.remove(); b.classList.remove('lifted'); const hit=blanks.findIndex(x=>x.classList.contains('over')); blanks.forEach(x=>x.classList.remove('over')); if(hit>=0) tryFill(b,o,sy,hit); else if(moved) return; } };
    b.addEventListener('pointerup',end); b.addEventListener('pointercancel',e=>{ if(drag&&drag.g) drag.g.remove(); b.classList.remove('lifted'); blanks.forEach(x=>x.classList.remove('over')); drag=null; });
    b.addEventListener('click',()=>{ if(moved){ moved=false; return; } hideHint(); tryFill(b,o,sy,firstOpen()); }); });
  mark();
  // the passage reads itself when the question opens (whole text, no title, no gap); the small speaker AFTER the text reads it again.
  // Any tap elsewhere, a slide change or a question change stops it, so two sounds never overlap.
  alReplay(box,txt,q);
}


/* ---------- underline: "Read. Underline the words for ..." — the passage as plain text (reads itself, speaker after it); the child taps the words that are answers.
   item {text: "... a [[desk]] and a [[chair]] ...", audio: whole passage, pics?: [..]}. A right tap underlines the word and marks it right; a wrong tap = the wrong shake. All found = solved. ---------- */
function alUnderline(box,q,s,run){
  const w=el('div','alcloze alunder'); box.append(w); q.solved=false;
  if((q.pics||[]).length){ const pc=el('div','alpics'); q.pics.forEach(pp=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=pp; im.alt=''; f.append(im); pc.append(f); }); w.append(pc); }
  const txt=el('p','altx'); w.append(txt); const goal=[]; let found=0;
  const say=(t)=>qSound(alWordSrc(t),alClean(t));
  String(q.text).split(/(\[\[.+?\]\])/).forEach(seg=>{ const m=/^\[\[(.+?)\]\]$/.exec(seg);
    if(m){ const sp=el('span','alw alans',''); m[1].split(/\s+/).forEach((t,k)=>{ if(k) sp.append(' '); sp.append(t); }); goal.push(sp); txt.append(sp); sp.addEventListener('click',async()=>{ if(q.solved||sp.classList.contains('right')) return; hideHint(); sp.classList.add('right'); celebrate(sp); found++; await say(m[1]);
        if(found>=goal.length&&!q.solved){ q.solved=true; qz.busy=true; const run0=qz.run; celebrate(txt); return qAdvance(run0,1000); } }); }
    else seg.split(/(\s+)/).forEach(t=>{ if(!t) return; if(/^\s+$/.test(t)) return txt.append(' '); if(!/[A-Za-z0-9]/.test(t)) return txt.append(t);
      const sp=el('span','alw',t); sp.addEventListener('click',()=>{ if(q.solved) return; hideHint(); qxBad(sp); sp.classList.add('bad'); setTimeout(()=>sp.classList.remove('bad'),700); say(t); }); txt.append(sp); }); });
  alReplay(box,txt,q);
}

/* ---------- order ---------- */
function alOrder(box,q,s,run){
  const w=el('div','alorder'+(q.chunks.length>7?' many':'')); box.append(w);
  if(q.img){ const pc=el('div','alspellpic',''); const im=el('img','',''); im.src=R_Q(q.img); im.alt=''; pc.append(im); w.append(pc); }
  const line=el('div','alsent'); const pool=el('div','alpool'); w.append(line,pool); const chunks=q.chunks, end=q.end||'';
  let seq=[]; const tiles=[];
  let order=chunks.map((c,k)=>k); for(let t=0;t<30;t++){ order.sort(()=>Math.random()-.5); if(chunks.length<2||order.some((v,k)=>v!==k)) break; }
  const draw=()=>{ line.innerHTML=''; seq.forEach(k=>{ const b=el('span','alword placed',''); b.textContent=chunks[k]; line.append(b); });   // only the right next piece is ever placed, so nothing to take back
    if(!seq.length) line.append(el('span','alph','…')); else if(end&&seq.length===chunks.length) line.append(el('span','alend',end)); };
  order.forEach(k=>{ const b=qChBtn(chunks[k],true); b.classList.add('alopt','alchip'); tiles[k]=b; pool.append(b);   // THE choice button (Marwa 2026-11-06: the same pill as every word choice)
    // Marwa 2026-11-03: only the piece whose turn it is goes on the line (same text = same piece); any other one shakes with a soft buzz and stays
    b.addEventListener('click',()=>{ if(qz.busy||b.classList.contains('used')) return; hideHint();
      if(chunks[k]!==chunks[seq.length]){ qxBad(b); b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); return; }
      b.classList.add('used'); seq.push(k); draw(); qSound(alWordSrc((q.say||chunks)[k]),(q.say||chunks)[k]);
      if(seq.length===chunks.length){ q.solved=true; $$('.placed',line).forEach(x=>x.classList.add('good')); qxWin(line,q,q.winMs||2300); } }); chipDrag(b,line,()=>!qz.busy); });
  draw();
}

/* ---------- check: tick boxes next to words / sentences; item {words:[..], n:how many to tick, ok:[indices that are right] (omit = any), audio/word: read when done} ---------- */
function alCheck(box,q,s,run){
  const w=el('div','alcheck'); box.append(w); const picked=new Set(); const n=q.n||1;
  if(q.ask){ const a=el('p','alask',''); alToks(a,q.ask); w.append(a); }
  if((q.pics||[]).length){ const pc=el('div','alpics'); q.pics.forEach(pp=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=pp; im.alt=''; f.append(im); pc.append(f); }); w.append(pc); }
  const list=el('div','alchecks'+(q.words.some(t=>t.length>16)?' long':'')); w.append(list);
  q.words.forEach((t,k)=>{ const b=el('button','alck',`<i></i><span></span>`); $('span',b).textContent=t; b.dataset.k=k; list.append(b);
    b.addEventListener('click',async()=>{ if(qz.busy||q.solved) return; hideHint(); vStop();
      if(q.ok&&!q.ok.includes(k)){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(q.audios?R_Q(q.audios[k]):alWordSrc(t),t); return; }
      if(picked.has(k)){ picked.delete(k); b.classList.remove('on'); return; }
      picked.add(k); b.classList.add('on'); await qSound(q.audios?R_Q(q.audios[k]):alWordSrc(t),t);
      if(picked.size>=n&&!q.solved){ q.solved=true; qz.busy=false; $$('.alck',list).forEach(x=>!x.classList.contains('on')&&x.classList.add('dim')); const run0=qz.run; celebrate(w); qz.busy=true; return qAdvance(run0,900); } }); });
  box._after=async()=>{ if(q.taskSay) await qSound(R_Q(q.taskSay),''); };
}

QM.explain={sheet:'box', own:1, draw:alExplain};
QM.mistake={sheet:'box', own:1, draw:alMistake, help:(q,w)=>q.solved?[]:($('.almw.wrong',w)?[$('.almin',w)]:(()=>{ const A=String(q.ask).split(/\s+/),B=String(q.word).split(/\s+/); const k=A.findIndex((t,i)=>String(t).toLowerCase()!==String(B[i]||'').toLowerCase()); return k>=0?[$$('.almw',w)[k]]:[]; })())};
QM.mcq={sheet:'box', own:1, draw:alMcq, help:(q,w)=>[$$('.alopt',w)[q.answer]],
  // a hidden number sentence (word problem): the first Help shows it; the next Help lights the right answer as usual
  peek:(q,w)=>{ const t=$('.altx.eqhid',w); if(t){ t.classList.remove('eqhid'); q.eqHidden=false; return; }
    const e=$$('.alopt',w)[q.answer]; if(!e) return; e.classList.remove('qhl'); void e.offsetWidth; e.classList.add('qhl'); setTimeout(()=>e.classList.remove('qhl'),2000); }};
QM.cloze={sheet:'box', own:1, draw:alCloze, help:(q,w)=>{ const bl=$$('.alblank',w).find(b=>!b.classList.contains('got')); if(!bl) return []; const a=String((q.text.match(/\[\[(.+?)\]\]/g)||[])[+bl.dataset.n]||'').replace(/\[|\]/g,''); return $$('.alchip:not(.used)',w).filter(x=>x.textContent.toLowerCase()===a.toLowerCase()).slice(0,1); }};
QM.underline={sheet:'box', own:1, draw:alUnderline, help:(q,w)=>$$('.alans:not(.right)',w).slice(0,1)};
QM.order={sheet:'box', own:1, draw:alOrder, help:(q,w)=>{ const k=$$('.placed',w).length; return $$('.alpool .alchip',w).filter(x=>!x.classList.contains('used')&&x.textContent===q.chunks[k]).slice(0,1); }};
QM.check={sheet:'box', own:1, draw:alCheck, help:(q,w)=>{ const ok=q.ok||q.words.map((x,k)=>k); return $$('.alck',w).filter(x=>ok.includes(+x.dataset.k)&&!x.classList.contains('on')).slice(0,1); }};

/* ---------- Grammar tab: the lesson's grammar boxes (lesson.json "grammar":[{title, rows:[[{t,a},..],..]}]); tap a row to hear it, hear them all = star ---------- */
function showGrammar(){
  stage.innerHTML=''; setRail([]); $('#lesson').classList.add('qtab','gtab'); document.body.classList.remove('typing','kb');
  const G0=LESSON.grammar||[]; if(!G0.length) return showGarage();
  if(G0.some(g=>g.anim)) return gramAnim(G0.filter(g=>g.anim));   // animated grammar template: js/gramanim.js
  const wrap=el('div','quiz algram'); const sc=el('div','algscroll'); wrap.append(sc); stage.append(wrap);
  const R=p=>p, need=new Set(), got=new Set(); let tok=0;
  const heard=id=>{ got.add(id); if([...need].every(x=>got.has(x))&&!showGrammar.done){ showGrammar.done=1; award(LESSON.id,'grammar'); } };
  G0.forEach((g,gi)=>{ const card=el('div','algcard'); if(g.title){ const h=el('h3','algh'); alToks(h,g.title); card.append(h); }
    if(g.note){ const n=el('p','algn'); alToks(n,g.note); card.append(n); }
    (g.rows||[]).forEach((r,ri)=>{ const rw=el('div','algrow'+(r.length>1?' two':'')); r.forEach((c,ci)=>{ const id=`${gi}.${ri}.${ci}`; need.add(id); const b=el('button','algcell'+(c.cls?' '+c.cls:'')); alToks(b,c.t);
        b.addEventListener('click',async e=>{ if(e.target.closest('.alw')) return; const my=++tok; vStop(); $$('.algcell.on',wrap).forEach(x=>x.classList.remove('on')); b.classList.add('on'); await qSound(c.a?R(c.a):alWordSrc(c.t),c.t); if(my===tok){ b.classList.remove('on'); heard(id); } }); rw.append(b); }); card.append(rw); });
    sc.append(card); });
  showGrammar.done=!!(STARS[LESSON.id]&&STARS[LESSON.id].grammar);
  carFrac(0);
}
