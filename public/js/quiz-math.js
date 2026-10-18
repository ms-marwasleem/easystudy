/* QUESTIONS tab — extra types for the MATH lessons (called from qGo in quiz.js through QX / QXF). All use the sheet of quiz.js (task line, stars, speaker).
   Numbers are tapped on a keypad (or on "options"), never typed, so no keyboard opens. Right: celebrate + the answer is said, then on. Wrong: a shake, try again.
   numline = a row of numbers with gaps (book: write the missing number). item: {seq:[1,2,null,4,5,null]} (null = a gap, filled left to right) or {from:1,to:6,gaps:[2,5]} (gap indexes);
             optional "options":[3,6,2,9] (else a keypad 0-10, "max" on the item changes the top number).
   bond    = number tree (book: 5 -> 3 and ?). item: {whole:5, parts:[3,null]} or {whole:null, parts:[3,2]}: tap the missing number. optional "options".
   bigger  = pick the bigger / smaller number. item: {nums:[3,7], find:"bigger"|"smaller", dots:true}; "dots":true shows red dots under each number.
   count   = count the pictures and tap the number. item: {img:"apple.png", n:4, options:[3,4,5]} (no options = keypad 0-10); no "img" = red dots; "group":true = the picture already shows all n (book picture), shown once. "cols" sets the pictures per row.
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
  h.onclick=()=>{ if(qz.busy) return; const c=getCell(); if(!c) return; const b=$('b',c); b.textContent=getVal(); c.classList.add('peek'); setTimeout(()=>{ if(c.classList.contains('peek')){ c.classList.remove('peek'); if(c.classList.contains('gap')) b.textContent=''; } },1500); }; box.append(h); }
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
  const t=el('div','qmbond'); t.innerHTML=`<svg viewBox="0 0 100 60" preserveAspectRatio="none"><path d="M50 20 L22 44 M50 20 L78 44"/></svg>`;
  const mk=(cls,v)=>{ const c=el('div','qmb '+cls+(v==null?' gap cur':''),`<b>${v==null?'':v}</b>`); t.append(c); return c; };
  const top=mk('top',q.whole), a=mk('l',parts[0]), b=mk('r',parts[1]), target=q.whole==null?top:miss===0?a:b;
  box.append(t);
  if(/^write /i.test(s.task||'')||s.typed){ qxWrite(box,q,s,run,String(ans),()=>{ $('b',target).textContent=ans; target.classList.remove('cur','gap'); target.classList.add('got'); qxWin(t,q,1600); }); return; }
  q.hush=1; mHelp(box,()=>target.classList.contains('gap')?target:null,()=>ans);
  mPad(box,(q.options?mShuffle(q.options):mKeys(q.max||10)),(v)=>{ if(v!==ans) return false; $('b',target).textContent=v; target.classList.remove('cur','gap'); target.classList.add('got'); qxWin(t,q,1600); return true; });
}
function mBigger(box,q,s,run){
  const want=q.find==='smaller'?Math.min(...q.nums):Math.max(...q.nums); q.word=q.word||q.find||'bigger';
  const row=el('div','qmbig'); q.nums.forEach(n=>{ const b=el('button','qmbn',`<b>${n}</b>${q.dots?`<img src="${mDots(n)}" alt="">`:''}`); b.setAttribute('aria-label',String(n));
    b.addEventListener('click',()=>{ if(qz.busy) return; if(n!==want) return qxBad(b); b.classList.add('got'); $$('.qmbn',row).forEach(x=>x!==b&&x.classList.add('dim')); qRing(b); qxWin(b,q,1600); }); row.append(b); });
  box.append(row);
}
function mCount(box,q,s,run){
  const n=q.n; q.word=q.word||mW(n);  q.hush=1; const grid=el('div','qmcount'+(q.group?' grp':'')); grid.style.setProperty('--c',q.cols||Math.min(n,5)); grid.style.setProperty('--r',Math.ceil(n/(q.cols||Math.min(n,5))));
  if(q.img&&q.group){ const im=new Image(); im.src=R_Q(q.img); im.alt=''; grid.append(im); } else if(q.img){ const src=R_Q(q.img); for(let k=0;k<n;k++){ const im=new Image(); im.src=src; im.alt=''; grid.append(im); } } else { const im=new Image(); im.src=mDots(n); im.alt=''; grid.append(im); }
  box.append(grid);
  if(/^write the number/i.test(s.task||'')||s.typed){
    if(s.both) box.append(el('div','qxduo'));   // the book's "write the number": the child types it (Help shows it faintly for a moment); "both":true = then types its word too
    qxWrite(box,q,s,run,String(n),s.both?(()=>{ q.word=mW(n); qxWrite(box,q,s,run,mW(n)); }):null); return; }
  mPad(box,(q.options?mShuffle(q.options):mKeys(q.max||Math.max(10,n))),(v)=>{ if(v!==n) return false; qxWin(grid,q,1600); return true; });
}
QX.numline=QX.bond=QX.bigger=QX.count=1;
Object.assign(QXF,{numline:mNumline,bond:mBond,bigger:mBigger,count:mCount});
