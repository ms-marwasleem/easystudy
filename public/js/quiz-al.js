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
  if((q.pics||[]).length){ const pc=el('div','alpics'); q.pics.forEach((p,k)=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=p; im.alt=''; f.append(im); pc.append(f);
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
  setRail([{kind:'go',icon:'play',label:tr('Listen'),click:()=>{ hideHint(); all(); }}]); $('#lesson').classList.add('qrail');   // the shared Listen button, top right with the help buttons; the stars under the title move on
  function done(){ if(q._done) return; q._done=1; alStar(); }
  const all=async()=>{ const my=++tok; clearOn(); vStop(); for(const r of rows){ if(my!==tok||qz.list[qz.i]!==q||!inQ()) return false; await r.play(); if(my!==tok) return false; await new Promise(z=>setTimeout(z,r.row.classList.contains('al-head')?300:450)); }
    for(const l of labs){ if(my!==tok||qz.list[qz.i]!==q||!inQ()) return false; l.b.classList.add('lit'); await qSound(alWordSrc(l.w),alClean(l.w)); l.b.classList.remove('lit'); heard(l.id); if(my!==tok) return false; await new Promise(z=>setTimeout(z,350)); } return my===tok; };
  box._after=async()=>{ if(!q._done) await all(); };
}

/* ---------- mcq ---------- */
function alMcq(box,q,s,run){
  const w=el('div','almcq'+(q.pics?' haspic':'')); box.append(w);
  if(q.pics){ const pc=el('div','alpics'); q.pics.forEach((p,k)=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=p; im.alt=''; qPicFit(im,(q.picsTall||[])[k]); f.append(im); if(q.caps&&q.caps[k]){ const c=el('button','alcap',q.caps[k]); c.onclick=()=>{ vStop(); c.classList.add('lit'); qSound(alWordSrc(q.caps[k]),q.caps[k]).then(()=>c.classList.remove('lit')); }; f.append(c); } pc.append(f); }); w.append(pc); }
  const st=el('div','alstem'); w.append(st); let blank=null;
  const sp=el('button','qsay alsp',SAY_LN); sp.setAttribute('aria-label','Listen'); sp.onclick=()=>{ if(!qz.busy) q.sayFn(); };
  if(q.ask){ const a=el('p','alask',''); alToks(a,q.ask); st.append(a); }
  const p=el('p','altx'); st.append(p); if(isAr()&&/^math/.test(SUBJECT.id)){ p.dir='rtl'; p.classList.add('mrtl'); }   // Arabic math: the number sentence and "الإجابة: __" read from the right (Ahmed 2026-11-14)
  const word=(t,k)=>{ const sp=el('span','alw',t); sp.addEventListener('click',()=>{ hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(t),alClean(t)).then(()=>sp.classList.remove('lit')); }); p.append(k?' ':'',sp); };
  String(q.stem).split(/\s+/).filter(Boolean).forEach((t,k)=>{ const m=/^([^_]*)_{2,}([^_]*)$/.exec(t);
    if(m&&!blank){ blank=el('button','alblank','<i></i>'); if(k) p.append(' '); if(m[1]) p.append(m[1]); p.append(blank); if(m[2]) p.append(m[2]); blank.addEventListener('click',()=>q.sayFn&&q.sayFn()); }
    else word(t,k); });
  p.append(' ',sp);   // the small speaker straight AFTER the question text (reads the question only, never the answer)
  const say=q.optSay||q.options;
  const ops=el('div','alopts'+(q.options.some(o=>o.length>14)?' long':'')); w.append(ops);
  q.options.forEach((o,k)=>{ const b=qChBtn(o,qWords(q.options)); b.classList.add('alopt'); b.dataset.k=k;   // THE choice button (quiz.js qChBtn, look in css/qlayout.css)
    b.addEventListener('click',async()=>{ if(qz.busy||q.solved) return; hideHint();
      if(k!==q.answer){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(alWordSrc(say[k]),say[k]); return; }
      if(blank){ blank.classList.add('got'); blank.innerHTML=''; blank.textContent=o; }
      qRing(b); $$('.alopt',ops).forEach(x=>x!==b&&x.classList.add('dim')); return qxWin(b,q,q.winMs||2300); });
    ops.append(b); });
  q.sayFn=async()=>{ vStop(); const ps=(q.parts||[]).map(R_Q); if(q.askAudio&&!q.solved) return qSound(R_Q(q.askAudio),q.stem);   // the question; once solved, audio = the sentence WITH its answer
    if(!ps.length) return qSound(q.audio,q.word); for(let i=0;i<ps.length;i++){ if(qz.list[qz.i]!==q||q.solved) return; await qSound(ps[i],''); if(i<ps.length-1) await new Promise(z=>setTimeout(z,350)); } };
  box._after=()=>{ if(q.autoSay) return q.sayFn(); };   // the question is read only when the child taps the speaker
}

/* the passage is NOT read by itself (the child reads it, Marwa 2026-11-04); the small speaker AFTER the text reads it (tap while playing = stop).
   Any tap elsewhere, a slide change or a question change stops it, so two sounds never overlap. Used by cloze and underline. */
function alReplay(box,txt,q){
  const rp=el('button','qsay alsp alreplay',SAY_LN); rp.setAttribute('aria-label','Listen'); txt.append(' ',rp); let pt=0;
  const stopP=()=>{ pt++; vStop(); rp.classList.remove('on'); };
  const playP=async()=>{ stopP(); const my=pt; rp.classList.add('on'); await qSound(!q.solved&&q.askAudio?R_Q(q.askAudio):q.audio,''); if(my===pt) rp.classList.remove('on'); };   // unsolved cloze: askAudio = the passage with a pause at each blank (never the answers; tools/lessons/cloze_ask_audio.py)
  rp.addEventListener('click',e=>{ e.stopPropagation(); hideHint(); rp.classList.contains('on')?stopP():playP(); });
  box.addEventListener('pointerdown',e=>{ if(rp.classList.contains('on')&&!e.target.closest('.alreplay')) stopP(); },true);
  box._after=()=>{ if(q.autoSay) playP(); };   // the passage is the question: the child reads it; the small speaker after it helps
}

/* ---------- cloze ---------- */
function alCloze(box,q,s,run){
  const w=el('div','alcloze'); box.append(w); q.solved=false;
  const ans=[]; const txt=el('p','altx'); w.append(txt);
  const sentences=String(q.text).split(/(\[\[.+?\]\])/);
  let n=0; sentences.forEach(seg=>{ const m=/^\[\[(.+?)\]\]$/.exec(seg);
    if(m){ ans.push(m[1]); const b=el('button','alblank',`<small>(${++n})</small><i></i>`); b.dataset.n=n-1; txt.append(b); }
    else seg.split(/(\s+)/).forEach(t=>{ if(!t) return; if(/^\s+$/.test(t)) return txt.append(' '); const sp=el('span','alw',t); sp.addEventListener('click',()=>{ hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(t),alClean(t)).then(()=>sp.classList.remove('lit')); }); txt.append(sp); }); });
  const bank=el('div','albank'); const one=ans.length===1&&String(q.text).replace(/\[\[|\]\]/g,'').length<=90;   // Marwa 2026-11-04: ONLY a passage keeps the word choices pinned on top (text slides under them)
  if(one){ w.classList.add('one'); $$('.alblank small',txt).forEach(x=>x.remove()); w.append(bank); } else w.prepend(bank); let cur=0; const blanks=$$('.alblank',txt);
  const mark=()=>{ blanks.forEach((b,k)=>b.classList.toggle('cur',k===cur)); };
  q.bank.forEach((o,bk)=>{ const sy=(q.bankSay||q.bank)[bk]; const b=qChBtn(o,qWords(q.bank)); b.classList.add('alopt','alchip'); bank.append(b);   // THE choice button
    b.addEventListener('click',async()=>{ if(qz.busy||q.solved||b.classList.contains('used')) return; hideHint();
      if(o.toLowerCase()!==String(ans[cur]).toLowerCase()){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(alWordSrc(sy),sy); return; }
      const bl=blanks[cur]; bl.classList.add('got'); bl.innerHTML=''; bl.textContent=ans[cur]; if(!q.reuse) b.classList.add('used'); celebrate(bl); qSound(alWordSrc(sy),sy); cur++; mark();
      if(cur>=ans.length){ q.solved=true; qz.busy=true; q.word=String(q.text).replace(/\[\[(.+?)\]\]/g,'$1'); const run0=qz.run; celebrate(txt); await qIdle(run0,4000); if(run0!==qz.run) return; await qSound(q.audio,q.word); return qAdvance(run0,600); } }); });
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
QM.mcq={sheet:'box', own:1, draw:alMcq, help:(q,w)=>[$$('.alopt',w)[q.answer]]};
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
