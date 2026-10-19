/* ENGLISH AL — part types for the Lesson tab (the book's pages, one after another) and the Booklet tab (called from qGo in quiz.js through QX / QXF; same sheet, stars and arrows).
   Content: data/en-al/<lesson>/questions.json, sets "book":"lesson" (Lesson tab) or "book":"booklet" (Booklet tab). Other types (pick, yesno, link, circle, tick, type ...) work as in quiz.js.
   explain = one book page as a part. item: {pics:[..], labels:[{w:"dad", at:[x%,y%]}] (word chips on the first picture), lines:[{t:"text", a:"audio", cls:"red|blue|head|note|sm"}],
             table:{title, rows:[[{t,a},{t,a}],..]}}. Every word of a line is tappable (that word alone is read). Listen reads the page; when all lines were heard the star comes and the green arrow glows.
   mcq     = a sentence (or a picture) with a blank "____" and 2-4 options: item {stem, options:[..], answer:index, word: the solved sentence, audio: solved sentence, parts:[before,after] (audio of the stem read as a question), pic?}
   cloze   = a text with blanks [[answer]] and a word bank: item {text, bank:[..], audio: whole text read once solved}
   order   = words / chunks as tiles, tap them in the right order: item {chunks:[..in order..], end:".", audio} */
const alSlug=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60).replace(/-+$/,'');
const alClean=w=>String(w).replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g,'');
const alWordSrc=w=>`data/en-shared/q/${alSlug(alClean(w))}.mp3`;
// text -> tappable words (a tap reads that word alone: the child is learning to read)
function alToks(host,text,onTap){
  String(text).split(/\s+/).filter(Boolean).forEach((w,k)=>{ const sp=el('span','alw',w); sp.addEventListener('click',e=>{ e.stopPropagation(); if(qz.busy&&!onTap) return; hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(w),alClean(w)).then(()=>sp.classList.remove('lit')); if(onTap) onTap(w); });
    host.append(k?' ':'',sp); });
}
const alStar=()=>{ const d=$(`.qdots i[data-i="${qz.i}"]`); if(d&&!d.classList.contains('got')){ d.innerHTML=STAR(true); d.classList.add('got'); if(anim) G.fromTo(d,{scale:1.8},{scale:1,duration:.6,ease:'elastic.out(1.2,.4)'}); } carFrac((qz.i+1)/qz.list.length); };
const alNextGo=()=>{ if(qz.i+1<qz.list.length) qGo(qz.i+1); else award(LESSON.id,qKey()); };

/* ---------- explain ---------- */
function alExplain(box,q,s,run){
  const pg=el('div','alpage'+((q.pics||[]).length?' haspic':'')+(q.pics&&q.pics.length>1?' multi':'')+(q.pics&&q.pics.length>4?' many':'')+(q.table?' hastable':'')+(!(q.lines||[]).length&&!q.table?' notext':'')); box.append(pg);
  const labs=[];   // word chips on the pictures (labels: {w, at:[x%,y%], p: picture index}) and captions under them (caps: [word..]); a tap reads that word
  const chip=(cls,w,host,at)=>{ const b=el('button',cls,w); if(at){ b.style.left=at[0]+'%'; b.style.top=at[1]+'%'; } host.append(b); const id='L:'+w+labs.length; labs.push({b,w,id});
    b.addEventListener('click',async e=>{ e.stopPropagation(); hideHint(); vStop(); tok++; b.classList.add('lit'); await qSound(alWordSrc(w),alClean(w)); b.classList.remove('lit'); heard(id); }); return b; };
  if((q.pics||[]).length){ const pc=el('div','alpics'); q.pics.forEach((p,k)=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=p; im.alt=''; f.append(im); pc.append(f);
    (q.labels||[]).filter(lb=>(lb.p||0)===k).forEach(lb=>{ const b=chip('allabel',lb.w,f,lb.at); b.dataset.x=lb.at[0]; b.dataset.y=lb.at[1]; });
    if((q.labels||[]).some(lb=>(lb.p||0)===k)){ const place=()=>{ const fr=f.getBoundingClientRect(), ir=im.getBoundingClientRect(); if(!ir.width) return; $$('.allabel',f).forEach(b=>{ const bw=b.offsetWidth, bh=b.offsetHeight;
        const cx=Math.min(Math.max(ir.left-fr.left+ir.width*b.dataset.x/100,bw/2+2),fr.width-bw/2-2), cy=Math.min(Math.max(ir.top-fr.top+ir.height*b.dataset.y/100,bh/2+2),fr.height-bh/2-2); b.style.left=cx+'px'; b.style.top=cy+'px'; }); };
      im.addEventListener('load',place); new ResizeObserver(place).observe(f); setTimeout(place,60); }
    if(q.caps&&q.caps[k]) chip('alcap',q.caps[k],f); });
    pg.append(pc); }
  const tx=el('div','altext'); pg.append(tx);
  const rows=[], need=new Set(), got=new Set(); let tok=0;
  const heard=k=>{ got.add(k); if(need.size&&[...need].every(x=>got.has(x))) done(); };
  const mk=(t,src,cls,host)=>{ const row=el('div','alline'+(cls?' '+cls:'')), sp=el('button','qsay alsp',SAY_LN); sp.setAttribute('aria-label','Listen'); const p=el('p','altx'); alToks(p,t); row.append(sp,p); host.append(row);
    const id='T'+rows.length; need.add(id); const r={row,t,src,id}; rows.push(r);
    const go=async()=>{ if(!row.isConnected) return; const my=++tok; clearOn(); vStop(); row.classList.add('on'); await qSound(src,t); if(my===tok){ row.classList.remove('on'); heard(id); } };
    sp.onclick=go; row.addEventListener('click',e=>{ if(e.target.closest('.alw')) return; go(); }); r.go=go; r.play=async()=>{ row.classList.add('on'); await qSound(src,t); row.classList.remove('on'); heard(id); }; return r; };
  const clearOn=()=>rows.forEach(r=>r.row.classList.remove('on'));
  (q.lines||[]).forEach(l=>mk(l.t,l.a?R_Q(l.a):null,l.cls,tx));
  if(q.table){ const tb=el('div','altable'); if(q.table.title){ const h=el('div','althead'); alToks(h,q.table.title); tb.append(h); }
    const grid=el('div','altrows'); q.table.rows.forEach(r=>{ const rw=el('div','altrow'); r.forEach(c=>{ const cell=el('button','altcell'); alToks(cell,c.t); const id='T'+rows.length; need.add(id); const it={row:cell,t:c.t,src:c.a?R_Q(c.a):null,id}; rows.push(it);
        cell.addEventListener('click',async e=>{ if(e.target.closest('.alw')) return; const my=++tok; clearOn(); vStop(); cell.classList.add('on'); await qSound(it.src,c.t); if(my===tok){ cell.classList.remove('on'); heard(id); } });
        it.play=async()=>{ cell.classList.add('on'); await qSound(it.src,c.t); cell.classList.remove('on'); heard(id); }; rw.append(cell); }); grid.append(rw); }); tb.append(grid); tx.append(tb); }
  labs.forEach(l=>need.add(l.id));
  const next=el('button','rb alnext',Q_ARR); next.setAttribute('aria-label','Next'); next.disabled=true; next.addEventListener('click',()=>{ if(!next.disabled){ hideHint(); blip(600); alNextGo(); } }); pg.append(next);
  const lis=el('button','alall',`${SAY_LN}<span>${tr('Listen')}</span>`); lis.setAttribute('aria-label','Listen to the page'); pg.append(lis);
  function done(){ if(q._done) return; q._done=1; alStar(); next.disabled=false; next.classList.add('ready'); if(anim) G.fromTo(next,{scale:1.35},{scale:1,duration:.6,ease:'elastic.out(1.3,.4)'}); }
  if(q._done){ next.disabled=false; next.classList.add('ready'); }
  const all=async()=>{ const my=++tok; clearOn(); vStop(); for(const r of rows){ if(my!==tok||qz.list[qz.i]!==q||!inQ()) return false; await r.play(); if(my!==tok) return false; await new Promise(z=>setTimeout(z,r.row.classList.contains('head')?300:450)); }
    for(const l of labs){ if(my!==tok||qz.list[qz.i]!==q||!inQ()) return false; l.b.classList.add('lit'); await qSound(alWordSrc(l.w),alClean(l.w)); l.b.classList.remove('lit'); heard(l.id); if(my!==tok) return false; await new Promise(z=>setTimeout(z,350)); } return my===tok; };
  lis.addEventListener('click',()=>{ hideHint(); all(); });
  box._after=async()=>{ if(!q._done) await all(); };
}

/* ---------- mcq ---------- */
function alMcq(box,q,s,run){
  const w=el('div','almcq'+(q.pics?' haspic':'')); box.append(w);
  if(q.pics){ const pc=el('div','alpics'); q.pics.forEach((p,k)=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=p; im.alt=''; f.append(im); if(q.caps&&q.caps[k]){ const c=el('button','alcap',q.caps[k]); c.onclick=()=>{ vStop(); c.classList.add('lit'); qSound(alWordSrc(q.caps[k]),q.caps[k]).then(()=>c.classList.remove('lit')); }; f.append(c); } pc.append(f); }); w.append(pc); }
  const st=el('div','alstem'); w.append(st); let blank=null;
  const sp=el('button','qsay alsp',SAY_LN); sp.setAttribute('aria-label','Listen'); sp.onclick=()=>{ if(!qz.busy) q.sayFn(); };
  if(q.ask){ const a=el('p','alask',''); alToks(a,q.ask); st.append(a); }
  st.append(sp);
  const p=el('p','altx'); st.append(p);
  const word=(t,k)=>{ const sp=el('span','alw',t); sp.addEventListener('click',()=>{ hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(t),alClean(t)).then(()=>sp.classList.remove('lit')); }); p.append(k?' ':'',sp); };
  String(q.stem).split(/\s+/).filter(Boolean).forEach((t,k)=>{ const m=/^([^_]*)_{2,}([^_]*)$/.exec(t);
    if(m&&!blank){ blank=el('button','alblank','<i></i>'); if(k) p.append(' '); if(m[1]) p.append(m[1]); p.append(blank); if(m[2]) p.append(m[2]); blank.addEventListener('click',()=>q.sayFn&&q.sayFn()); }
    else word(t,k); });
  const say=q.optSay||q.options;
  const ops=el('div','alopts'+(q.options.some(o=>o.length>14)?' long':'')); w.append(ops);
  q.options.forEach((o,k)=>{ const b=el('button','alopt',`<i>${'abcd'[k]||''}</i><span></span>`); $('span',b).textContent=o; b.dataset.k=k;
    b.addEventListener('click',async()=>{ if(qz.busy||q.solved) return; hideHint();
      if(k!==q.answer){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(alWordSrc(say[k]),say[k]); return; }
      if(blank){ blank.classList.add('got'); blank.innerHTML=''; blank.textContent=o; }
      qRing(b); $$('.alopt',ops).forEach(x=>x!==b&&x.classList.add('dim')); return qxWin(b,q,q.winMs||2300); });
    ops.append(b); });
  q.sayFn=async()=>{ vStop(); const ps=(q.parts||[]).map(R_Q); if(!ps.length) return qSound(q.audio,q.word); for(let i=0;i<ps.length;i++){ if(qz.list[qz.i]!==q||q.solved) return; await qSound(ps[i],''); if(i<ps.length-1) await new Promise(z=>setTimeout(z,350)); } };
  box._after=()=>q.sayFn();
}

/* ---------- cloze ---------- */
function alCloze(box,q,s,run){
  const w=el('div','alcloze'); box.append(w); q.solved=false;
  const ans=[]; const txt=el('p','altx'); w.append(txt);
  const sentences=String(q.text).split(/(\[\[.+?\]\])/);
  let n=0; sentences.forEach(seg=>{ const m=/^\[\[(.+?)\]\]$/.exec(seg);
    if(m){ ans.push(m[1]); const b=el('button','alblank',`<small>(${++n})</small><i></i>`); b.dataset.n=n-1; txt.append(b); }
    else seg.split(/(\s+)/).forEach(t=>{ if(!t) return; if(/^\s+$/.test(t)) return txt.append(' '); const sp=el('span','alw',t); sp.addEventListener('click',()=>{ hideHint(); vStop(); sp.classList.add('lit'); qSound(alWordSrc(t),alClean(t)).then(()=>sp.classList.remove('lit')); }); txt.append(sp); }); });
  const bank=el('div','albank'); w.append(bank); let cur=0; const blanks=$$('.alblank',txt);
  const mark=()=>{ blanks.forEach((b,k)=>b.classList.toggle('cur',k===cur)); };
  q.bank.forEach((o,bk)=>{ const sy=(q.bankSay||q.bank)[bk]; const b=el('button','alopt alchip',''); b.textContent=o; bank.append(b);
    b.addEventListener('click',async()=>{ if(qz.busy||q.solved||b.classList.contains('used')) return; hideHint();
      if(o.toLowerCase()!==String(ans[cur]).toLowerCase()){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(alWordSrc(sy),sy); return; }
      const bl=blanks[cur]; bl.classList.add('got'); bl.innerHTML=''; bl.textContent=ans[cur]; if(!q.reuse) b.classList.add('used'); celebrate(bl); qSound(alWordSrc(sy),sy); cur++; mark();
      if(cur>=ans.length){ q.solved=true; qz.busy=true; q.word=String(q.text).replace(/\[\[(.+?)\]\]/g,'$1'); const run0=qz.run; celebrate(txt); await qSound(q.audio,q.word); if(run0!==qz.run) return; return qAdvance(run0,900); } }); });
  mark();
}

/* ---------- order ---------- */
function alOrder(box,q,s,run){
  const w=el('div','alorder'); box.append(w);
  if(q.img){ const pc=el('div','alspellpic',''); const im=el('img','',''); im.src=R_Q(q.img); im.alt=''; pc.append(im); w.append(pc); }
  const line=el('div','alsent'); const pool=el('div','alpool'); w.append(line,pool); const chunks=q.chunks, end=q.end||'';
  let seq=[]; const tiles=[];
  let order=chunks.map((c,k)=>k); for(let t=0;t<30;t++){ order.sort(()=>Math.random()-.5); if(chunks.length<2||order.some((v,k)=>v!==k)) break; }
  const draw=()=>{ line.innerHTML=''; seq.forEach(k=>{ const b=el('button','alopt alchip placed',''); b.textContent=chunks[k]; b.onclick=()=>{ if(qz.busy) return; vStop(); seq=seq.filter(x=>x!==k); tiles[k].classList.remove('used'); draw(); }; line.append(b); });
    if(!seq.length) line.append(el('span','alph','…')); else if(end&&seq.length===chunks.length) line.append(el('span','alend',end)); };
  order.forEach(k=>{ const b=el('button','alopt alchip',''); b.textContent=chunks[k]; tiles[k]=b; pool.append(b);
    b.addEventListener('click',()=>{ if(qz.busy||b.classList.contains('used')) return; hideHint(); b.classList.add('used'); seq.push(k); draw(); qSound(alWordSrc((q.say||chunks)[k]),(q.say||chunks)[k]);
      if(seq.length===chunks.length){ if(seq.every((x,i)=>x===i)){ q.solved=true; $$('.alchip.placed',line).forEach(x=>x.classList.add('good')); qxWin(line,q,q.winMs||2300); }
        else { qxBad(line); line.classList.add('bad'); setTimeout(()=>{ line.classList.remove('bad'); seq=[]; tiles.forEach(t=>t.classList.remove('used')); draw(); },700); } } }); });
  draw();
}

/* ---------- check: tick boxes next to words / sentences; item {words:[..], n:how many to tick, ok:[indices that are right] (omit = any), audio/word: read when done} ---------- */
function alCheck(box,q,s,run){
  const w=el('div','alcheck'); box.append(w); const picked=new Set(); const n=q.n||1;
  if(q.ask){ const a=el('p','alask',''); alToks(a,q.ask); w.append(a); }
  const list=el('div','alchecks'+(q.words.some(t=>t.length>16)?' long':'')); w.append(list);
  q.words.forEach((t,k)=>{ const b=el('button','alck',`<i></i><span></span>`); $('span',b).textContent=t; b.dataset.k=k; list.append(b);
    b.addEventListener('click',async()=>{ if(qz.busy||q.solved) return; hideHint(); vStop();
      if(q.ok&&!q.ok.includes(k)){ qxBad(b); b.classList.add('bad'); setTimeout(()=>b.classList.remove('bad'),700); qSound(q.audios?R_Q(q.audios[k]):alWordSrc(t),t); return; }
      if(picked.has(k)){ picked.delete(k); b.classList.remove('on'); return; }
      picked.add(k); b.classList.add('on'); await qSound(q.audios?R_Q(q.audios[k]):alWordSrc(t),t);
      if(picked.size>=n&&!q.solved){ q.solved=true; qz.busy=false; $$('.alck',list).forEach(x=>!x.classList.contains('on')&&x.classList.add('dim')); const run0=qz.run; celebrate(w); qz.busy=true; return qAdvance(run0,900); } }); });
  box._after=async()=>{ if(q.taskSay) await qSound(R_Q(q.taskSay),''); };
}

QX.explain=QX.mcq=QX.cloze=QX.order=QX.check=1; const QOWN={explain:1,mcq:1,cloze:1,order:1,check:1};   // these draw their own listen buttons / read themselves (quiz-letters.js does not add its speaker or auto-read)
Object.assign(QXF,{explain:alExplain,mcq:alMcq,cloze:alCloze,order:alOrder,check:alCheck});

/* Help: light the right option / chip */
const QHELP={
  mcq:(q,w)=>{ const b=$$('.alopt',w)[q.answer]; return b?[b]:[]; },
  cloze:(q,w)=>{ const bl=$$('.alblank',w).find(b=>!b.classList.contains('got')); if(!bl) return []; const a=String((q.text.match(/\[\[(.+?)\]\]/g)||[])[+bl.dataset.n]||'').replace(/\[|\]/g,''); const c=$$('.alchip:not(.used)',w).find(x=>x.textContent.toLowerCase()===a.toLowerCase()); return c?[c]:[]; },
  check:(q,w)=>{ const ok=q.ok||q.words.map((x,k)=>k); const b=$$('.alck',w).find(x=>ok.includes(+x.dataset.k)&&!x.classList.contains('on')); return b?[b]:[]; },
  order:(q,w)=>{ const k=$$('.alchip.placed',w).length; const t=$$('.alpool .alchip',w).find(x=>!x.classList.contains('used')&&x.textContent===q.chunks[k]); return t?[t]:[]; }
};

/* ---------- Grammar tab: the lesson's grammar boxes (lesson.json "grammar":[{title, rows:[[{t,a},..],..]}]); tap a row to hear it, hear them all = star ---------- */
function showGrammar(){
  stage.innerHTML=''; setRail([]); $('#lesson').classList.add('qtab','gtab'); document.body.classList.remove('typing','kb');
  const G0=LESSON.grammar||[]; if(!G0.length) return showGarage();
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
