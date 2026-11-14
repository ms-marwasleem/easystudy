/* QUESTIONS tab — the number models (box models in QM, quiz.js; drawn through qxGo). All use the sheet of quiz.js (task line, stars, speaker); their help is the bulb next to the answer place (bulb:0).
   Numbers are tapped on a keypad (or on "options"), never typed, so no keyboard opens. Right: celebrate + the answer is said, then on. Wrong: a shake, try again.
   numline = a row of numbers with gaps (book: write the missing number). item: {seq:[1,2,null,4,5,null]} (null = a gap, filled left to right) or {from:1,to:6,gaps:[2,5]} (gap indexes);
             optional "options":[3,6,2,9] (else a keypad 0-10, "max" on the item changes the top number).
   bond    = number tree (book: 5 -> 3 and ?). item: {whole:5, parts:[3,null]} or {whole:null, parts:[3,2]}: tap the missing number. optional "options".
   bigger  = pick the bigger / smaller number. item: {nums:[3,7], find:"bigger"|"smaller", dots:true}; "dots":true shows red dots under each number.
   count   = count the pictures and tap the number. item: {img:"apple.png", n:4, options:[3,4,5]} (no options = keypad 0-10); no "img" = red dots; "group":true = the picture already shows all n, shown once. Count pictures are ONE unit repeated: write "img":"../../pics/bee.png#4" (core.js cpicFill) — never a library picture per count. "cols" sets the pictures per row.
   mwrite  = the child WRITES a number sentence or an answer on lines (like the word writing), with the app's own keypad: 0-9 and + − = (no phone keyboard).
             item: {pics, ask, lead:"Addition sentence:", word:"3 + 4 = 7", tail:"bicycles" (a card after the lines), keys:"0123456789+−=" (default digits), askAudio, audio}
             a wrong key: the line shakes with a soft buzz; done: the full sentence is said (audio), then on.
   In link sets an item may have "dots":n instead of "pic" (red dots as the picture), e.g. dots <-> number, number ("word") <-> its word ("text2"). */
const M_WORDS=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
const mW=n=>M_WORDS[n]!=null?M_WORDS[n]:String(n);
// n red dots (rows of 5) as a picture: a data URI, so link / count need no picture file
function mDots(n,img){ if(n===0) return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">${Array.from({length:10},(_,k)=>`<circle cx="${(k%5)*40+20}" cy="${Math.floor(k/5)*40+20}" r="14" fill="none" stroke="#9A8A7A" stroke-width="3"/>`).join('')}</svg>`); const R=5, rows=Math.ceil(n/R), s=40, w=R*s, h=rows*s;
  const c=Array.from({length:n},(_,k)=>`<circle cx="${(k%R)*s+s/2+(Math.floor(k/R)===rows-1?(R-(n-(rows-1)*R))*s/2:0)}" cy="${Math.floor(k/R)*s+s/2}" r="14" fill="#E0412C" stroke="#5A3418" stroke-width="3"/>`).join('');
  return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${c}</svg>`); }
// the keypad / options row; onPick(value, button) -> true when right
function mPad(box,values,onPick){ const row=el('div','qmpad'); values.forEach(v=>{ const b=el('button','rb qbtn qlet qmn',`<span>${v}</span>`); b.setAttribute('aria-label',String(v));
  b.addEventListener('click',()=>{ if(qz.busy) return; if(onPick(v,b)){ b.classList.add('on'); } else qxBad(b); }); row.append(b); }); box.append(row); return row; }
// Help: the answer shows faintly in the empty box for a moment, then is wiped; the question never says the answer on its own
function mHelp(box,getCell,getVal){ const h=el('button','qxhelp qmhelp',ICON.hint); h.setAttribute('aria-label','Help');
  h.onclick=()=>{ if(qz.busy) return; const c=getCell(); if(!c) return; const b=$('b',c); b.textContent=getVal(); c.classList.add('peek'); setTimeout(()=>{ if(c.classList.contains('peek')){ c.classList.remove('peek'); if(c.classList.contains('gap')) b.textContent=''; } },1500); }; qHelpHost(h); }
const mKeys=(max=10)=>Array.from({length:max+1},(_,k)=>k);
const mShuffle=a=>{ a=a.slice(); for(let t=0;t<30;t++){ const b=a.slice().sort(()=>Math.random()-.5); if(b.some((v,k)=>v!==a[k])||a.length<2){ a=b; break; } } return a; };

function mNumline(box,q,s,run){
  const seq=q.seq||Array.from({length:q.to-q.from+1},(_,k)=>(q.gaps||[]).includes(k)?null:q.from+k), full=q.full||(q.from!=null?Array.from({length:q.to-q.from+1},(_,k)=>q.from+k):null);
  const ans=q.answers||seq.map((v,k)=>v==null?(full?full[k]:null):null).filter(v=>v!=null);   // with "seq" and no "answers": the gaps are filled from the run of numbers around them
  if(!q.answers&&!full){ const base=seq.find(v=>v!=null), bi=seq.indexOf(base); ans.length=0; seq.forEach((v,k)=>{ if(v==null) ans.push(base+(k-bi)); }); }
  q.word=q.word||seq.map((v,k)=>mW(v==null?ans[seq.slice(0,k).filter(x=>x==null).length]:v)).join(', ');
  const line=el('div','qmline'); line.style.setProperty('--n',seq.length); const cells=[];
  seq.forEach(v=>{ const c=el('div','qmcell'+(v==null?' gap':''),`<b>${v==null?'':v}</b>`); line.append(c); cells.push(c); });
  line.append(el('i','qmarrow')); box.append(line); let g=0; const gaps=cells.filter(c=>c.classList.contains('gap')); gaps[0].classList.add('cur');
  q.hush=1; mHelp(box,()=>gaps[g]&&gaps[g].classList.contains('gap')?gaps[g]:null,()=>ans[g]);
  mPad(box,q.options?mShuffle(q.options):mKeys(q.max||Math.max(10,...seq.filter(v=>v!=null),...ans)),(v)=>{
    if(v!==ans[g]) return false; const c=gaps[g]; $('b',c).textContent=v; c.classList.remove('cur','gap'); c.classList.add('got'); blip(560+g*60,.05); g++;
    if(g<gaps.length) gaps[g].classList.add('cur'); else qxWin(line,q,1600); return true; });
}
function mBond(box,q,s,run){
  const parts=q.parts, miss=q.whole==null?-1:parts.findIndex(v=>v==null), ans=miss<0?parts[0]+parts[1]:q.whole-parts[1-miss];
  q.word=q.word||`${mW(miss===0?ans:parts[0])} and ${mW(miss===1?ans:parts[1])} make ${mW(q.whole==null?ans:q.whole)}`;
  if(!q.ask) q.ask=`${miss===0?'what':mW(parts[0])} and ${miss===1?'what':mW(parts[1])} make ${q.whole==null?'what':mW(q.whole)}`;   // the question never says its own answer
  const t=el('div','qmbond'+(/\bbox/i.test(s.task||'')||s.boxed?' box':'')); t.innerHTML=`<svg viewBox="0 0 100 60" preserveAspectRatio="none"><path d="M50 20 L22 44 M50 20 L78 44"/></svg>`;
  const mk=(cls,v)=>{ const c=el('div','qmb '+cls+(v==null?' gap cur':''),`<b>${v==null?'':v}</b>`); t.append(c); return c; };
  const top=mk('top',q.whole), a=mk(isAr()?'r':'l',parts[0]), b=mk(isAr()?'l':'r',parts[1]), target=q.whole==null?top:miss===0?a:b;
  box.append(t);
  if(/^write /i.test(s.task||'')||s.typed){ qxWrite(box,q,s,run,String(ans),()=>{ $('b',target).textContent=ans; target.classList.remove('cur','gap'); target.classList.add('got'); qxWin(t,q,1600); }); return; }
  q.hush=1; mHelp(box,()=>target.classList.contains('gap')?target:null,()=>ans);
  mPad(box,(q.options?mShuffle(q.options):mKeys(q.max||10)),(v)=>{ if(v!==ans) return false; $('b',target).textContent=v; target.classList.remove('cur','gap'); target.classList.add('got'); qxWin(t,q,1600); return true; });
}
function mBigger(box,q,s,run){
  // THE choice buttons (quiz.js qChBtn) in the usual choices row; no speaker before the answer (it would say the answer), the Help bulb lights the right one (Marwa 2026-11-04)
  const want=q.find==='smaller'?Math.min(...q.nums):Math.max(...q.nums); q.word=q.word||q.find||'bigger'; q.hush=1;
  const row=el('div','qxchoices qmbig'); q.nums.forEach(n=>{ const b=qChBtn(n); b.dataset.v=n; if(q.dots){ const d=el('span','qmbdots',`<img src="${mDots(n)}" alt="">`); const c=el('div','qmbcol'); c.append(b,d); row.append(c); } else row.append(b);
    b.addEventListener('click',()=>{ if(qz.busy) return; if(n!==want) return qxBad(b); b.classList.add('on'); $$('.qch',row).forEach(x=>x!==b&&x.classList.add('dim')); if(qCircleTask(s)) qRing(b); qxWin(b,q,1600); }); });
  box.append(row);
}
function mCount(box,q,s,run){
  const n=q.n; q.word=q.word||mW(n);  q.hush=1; const grid=el('div','qmcount'+(q.group||q.img?' grp':'')); grid.style.setProperty('--c',q.cols||Math.min(n,5)); grid.style.setProperty('--r',Math.ceil(n/(q.cols||Math.min(n,5))));
  if(q.img&&q.group){ const im=new Image(); im.src=R_Q(q.img); im.alt=''; grid.append(im); } else if(q.img){ const im=new Image(); im.alt=''; cpicMake(new URL(R_Q(q.img),location.href).href,n).then(u=>{ im.src=u; }); grid.append(im); }   // a unit without "#n": the ONE count-picture helper (core.js) repeats it n times else { const im=new Image(); im.src=mDots(n); im.alt=''; grid.append(im); }
  box.append(grid);
  if(/^write the number/i.test(s.task||'')||s.typed){
    if(s.both){ const duo=el('div','qxduo'); box.append(duo); const pre=el('div','qxline qxpre'); pre.append(qxWordEl(mW(n),null,false,true)); pre.style.order=2; duo.append(pre); }   // both places (number, word) show from the start   // the book's "write the number": the child types it (Help shows it faintly for a moment); "both":true = then types its word too
    qxWrite(box,q,s,run,String(n),s.both?(()=>{ q.word=mW(n); $$('.qxpre',box).forEach(x=>x.remove()); qxWrite(box,q,s,run,mW(n)); }):null); return; }
  mPad(box,(q.options?mShuffle(q.options):mKeys(q.max||Math.max(10,n))),(v)=>{ if(v!==n) return false; qxWin(grid,q,1600); return true; });
}
// an addition sentence written the other way round is right too: "3 + 4 = 7" -> "4 + 3 = 7" when the child starts with the second number (subtraction keeps its order)
const mSwapSum=(w,k)=>{ const m=String(w).match(/^(\d+) \+ (\d+) = (\d+)$/); return m&&m[1]!==m[2]&&k===m[2][0]&&k!==m[1][0]?`${m[2]} + ${m[1]} = ${m[3]}`:null; };
function mWrite(box,q,s,run){
  const w=el('div','almcq mwrite'+(q.pics?' haspic':'')); box.append(w);
  if(q.pics){ const pc=el('div','alpics'); q.pics.forEach((p,k)=>{ const f=el('div','alfig'); const im=el('img','',''); im.src=p; im.alt=''; qPicFit(im,(q.picsTall||[])[k]); f.append(im); pc.append(f); }); w.append(pc); }
  const st=el('div','alstem'); w.append(st);
  const sp=el('button','qsay alsp',SAY_LN); sp.setAttribute('aria-label','Listen'); sp.onclick=()=>{ if(!qz.busy) q.sayFn(); };
  if(q.ask){ const a=el('p','alask',''); alToks(a,q.ask); a.append(' ',sp); st.append(a); } else st.append(sp);   // the listen icon at the end of the story (no line of its own)
  const line=el('div','qxline mwline'); if(q.lead) line.append(el('span','mwlead',q.lead));
  let wd=qxWordEl(q.word,null,false,!isAr()); line.append(wd); if(q.tail) line.append(el('span','mwcard',q.tail)); st.append(line);
  const cur=()=>{ $$('.lt',wd).forEach(x=>x.classList.remove('cur')); const n=qxNext(wd); if(n) n.classList.add('cur'); }; cur();
  const pad=el('div','qmpad mwkeys'); w.append(pad);
  [...(q.keys||s.keys||'1234567890')].forEach(k=>{ const b=el('button','rb qbtn qlet qmn',`<span>${k}</span>`); b.dataset.v=k; b.setAttribute('aria-label',k==='−'?'minus':k==='+'?'plus':k==='='?'equals':k);
    b.addEventListener('click',()=>{ if(qz.busy||q.solved||qz.list[qz.i]!==q) return; hideHint(); let n=qxNext(wd); if(!n) return;
      if(k!==arDb(n.textContent)&&!$$('.lt.got',wd).length){ const sw=mSwapSum(q.word,k); if(sw){ q.word=sw; const nw=qxWordEl(sw,null,false,true); wd.replaceWith(nw); wd=nw; n=qxNext(wd); } }   // addition in either order is right: 4 + 3 = 7 as well as 3 + 4 = 7 (Marwa 2026-11-05)
      if(k===arDb(n.textContent)){ qxReveal(wd); blip(560+$$('.lt.got',wd).length*40,.05); cur(); if(qxDone(wd)) qxWin(wd,q,1700); }
      else { wsBad(n); qxBad(line); } }); pad.append(b); });
  q.sayFn=async()=>{ vStop(); if(q.askAudio&&!q.solved) return qSound(R_Q(q.askAudio),q.ask||''); return qSound(q.audio,q.word); };
  box._after=()=>{ if(q.autoSay) return q.sayFn(); };
}
/* line = "Circle the answer" on a LINE of things (book 2-1 What's the Position?): item {unit | img, n (things, or equal slots of the strip), from:"front"|"back", at:k (the k-th thing from that end), group:true ("4 cats from the front") }.
   The child taps the k-th thing (for a group: its last one); right = the frame is drawn round it / round the group, wrong = shake. */
const arDb=s=>window.arDigitsBack?arDigitsBack(s):s;   // math-ar shows ٠-٩ (js/math-ar.js): turn shown digits back before comparing
const mEnds=()=>isAr()?['أمام','خلف']:['Front','Back'];   // Arabic book: Front at the RIGHT end (css .mlrtl)
const M_ORD_AR=['','الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'];
const M_ORD_ARF=['','الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة'];
const mOrd=(k,fem)=>isAr()?((fem?M_ORD_ARF:M_ORD_AR)[k]||String(k)):({1:'1st',2:'2nd',3:'3rd'})[k]||k+'th';
// ordinal mode (book 2-2 "Where is it?"): q.items = the things (library pictures) in a row / column, q.target = the marked thing, q.from = which end counting starts, q.vert = a column,
// q.ends = ["Top","Bottom"] | ["Left","Right"]; the child picks 1st, 2nd, 3rd... (the right one is worked out from target and from).
function mLineOrd(box,q,s,run){
  q.hush=1; q.word=q.word||s.task||''; const n=q.items.length, fr=q.from!=='back', ends=q.ends||mEnds(), ans=fr?q.target+1:n-q.target;
  const w=el('div','mline mlord'+(q.vert?' mlv':'')+(!q.ends&&isAr()?' mlrtl':'')); w.style.setProperty('--n',n); const row=el('div','mlrow'); const lf=el('span','mlend',ends[0]), lb=el('span','mlend',ends[1]); const things=el('div','mlthings');
  q.items.forEach((it,i)=>{ const c=el('div','mlc'+(i===q.target?' mark':'')); const im=new Image(); im.alt=''; im.src=R_Q(it); c.append(im); things.append(c); });
  row.append(lf,things,lb); w.append(row); box.append(w);
  const chips=el('div','qxchoices mlchips'); for(let k=1;k<=n;k++){ const b=qChBtn(mOrd(k,q.fem)); b.dataset.v=k;
    b.addEventListener('click',()=>{ if(qz.busy||q.solved) return; if(k!==ans) return qxBad(b); b.classList.add('on'); $$('.qch',chips).forEach(x=>x!==b&&x.classList.add('dim')); (fr?lf:lb).classList.add('on'); qxWin(w,q,1600); }); chips.append(b); }
  w.append(chips); }
function mLine(box,q,s,run){
  if(q.items) return mLineOrd(box,q,s,run);
  q.hush=1; q.word=q.word||s.task||''; const n=q.n, fr=q.from!=='back';
  const w=el('div','mline'+(isAr()?' mlrtl':'')); w.style.setProperty('--n',n); const row=el('div','mlrow'); const lf=el('span','mlend',mEnds()[0]), lb=el('span','mlend',mEnds()[1]); const things=el('div','mlthings'+(q.img&&!q.unit?' strip':''));
  row.append(lf,things,lb); w.append(row); box.append(w); const btns=[];
  if(q.img&&!q.unit){ const im=new Image(); im.alt=''; im.src=R_Q(q.img); things.append(im); }
  for(let i=0;i<n;i++){ const b=el('button','mlt'); b.setAttribute('aria-label',String(i+1)); if(q.unit){ const im=new Image(); im.alt=''; im.src=R_Q(q.unit); b.append(im); } things.append(b); btns.push(b); }
  const target=fr?q.at-1:n-q.at;
  btns.forEach((b,i)=>b.addEventListener('click',()=>{ if(qz.busy||q.solved) return; if(i!==target) return qxBad(b);
    const sl=q.group?(fr?[0,target]:[target,n-1]):[target,target]; const fb=el('div','mlframe'); fb.style.setProperty('--a',sl[0]); fb.style.setProperty('--b',sl[1]+1); things.append(fb);
    (fr?lf:lb).classList.add('on'); qxWin(w,q,1600); }));
}
QM.line={sheet:'box', draw:mLine, help:(q,w)=>q.items?$$('.mlchips .qch',w).filter(b=>+b.dataset.v===(q.from!=='back'?q.target+1:q.items.length-q.target)):$$('.mlt',w).filter((b,i)=>i===(q.from!=='back'?q.at-1:q.n-q.at))};
QM.numline={sheet:'box', bulb:0, draw:mNumline};
QM.bond={sheet:'box', bulb:0, draw:mBond};
QM.bigger={sheet:'box', draw:mBigger, help:(q,w)=>{ const v=q.find==='smaller'?Math.min(...q.nums):Math.max(...q.nums); return $$('.qmbig .qch',w).filter(b=>+b.dataset.v===v); }};
QM.count={sheet:'box', bulb:0, draw:mCount};
QM.mwrite={sheet:'box', own:1, draw:mWrite, help:(q,w)=>{ const n=qxNext($('.mwline .qxw',w)); return n?$$('.mwkeys .qmn',w).filter(b=>b.dataset.v===arDb(n.textContent)):[]; }};

// colorn = the Arabic book 1-1 "colour the same number of circles as things in the picture": item {img:"../../pics/dog.png#2", n:2, group:true}; the child taps circles of a 2x5 frame (red); the n-th one = right,
// one more than n = shake (not coloured); tap a red one = back to white. The frame fills from the right in RTL (math-ar).
function mColorN(box,q,s,run){
  const n=q.n; q.word=q.word||mW(n); q.hush=1; const grid=el('div','qmcount grp'); grid.style.setProperty('--c',1); grid.style.setProperty('--r',1);
  if(q.img&&q.group){ const im=new Image(); im.src=R_Q(q.img); im.alt=''; grid.append(im); } else if(q.img){ const im=new Image(); im.alt=''; cpicMake(new URL(R_Q(q.img),location.href).href,n).then(u=>{ im.src=u; }); grid.append(im); }
  const fr=el('div','qmcirc'); const cs=Array.from({length:q.max||10},()=>{ const b=el('button','qmcc'); b.setAttribute('aria-label','circle'); fr.append(b); return b; });
  const on=()=>cs.filter(x=>x.classList.contains('on')).length;
  cs.forEach(b=>b.addEventListener('click',()=>{ if(qz.busy||q.solved) return; if(b.classList.contains('on')){ b.classList.remove('on'); return; }
    if(on()>=n) return qxBad(b); b.classList.add('on'); blip(560+on()*40,.05); if(on()===n) qxWin(fr,q,1600); }));
  box.append(grid,fr);
  const h=el('button','qxhelp qmhelp',ICON.hint); h.setAttribute('aria-label','Help');
  h.onclick=()=>{ if(qz.busy||q.solved) return; cs.slice(0,n).forEach(c=>c.classList.add('peek')); setTimeout(()=>cs.forEach(c=>c.classList.remove('peek')),1500); }; qHelpHost(h);
}
QM.colorn={sheet:'box', bulb:0, draw:mColorN};
