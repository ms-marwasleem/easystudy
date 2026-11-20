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
function mPad(box,values,onPick){ const row=el('div','qmpad'); values.forEach(v=>{ const b=qChBtn(v); b.classList.add('qmn'); b.setAttribute('aria-label',String(v));
  b.addEventListener('click',()=>{ if(qz.busy) return; if(onPick(v,b)){ b.classList.add('on'); } else qxBad(b); }); row.append(b); }); box.append(row); return row; }
// Help: the answer shows faintly in the empty box for a moment, then is wiped; the question never says the answer on its own
function mHelp(box,getCell,getVal){ const h=helpBtn('qxhelp qmhelp');
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
  if(/^write /i.test(s.task||'')||s.typed){
    // typed: the number is written straight into its own square (no writing line below, no word-line speaker); the speaker sits beside the question line and says the question (Ahmed 2026-11-16, both subjects)
    const [x,y,w]=[parts[0],parts[1],q.whole].map(v=>v==null?'?':v), qa=isAr()?(miss===0?`كم و${y} يُكوّنان ${w}؟`:miss===1?`${x} و كم يُكوّنان ${w}؟`:`${x} و ${y} يُكوّنان كم؟`):(miss===0?`? and ${y} make ${w}`:miss===1?`${x} and ? make ${w}`:`${x} and ${y} make ?`);
    const row=el('div','qmask'); row.dir=isAr()?'rtl':'ltr'; const sp=el('button','qsay qmaskb',typeof SAY_LN==='string'?SAY_LN:ICON.sound); sp.setAttribute('aria-label','Hear the question'); sp.onclick=()=>{ if(!qz.busy) qSay(); };
    row.append(sp,el('span','qmaskt',qa)); box.insertBefore(row,t); const qw=$('.qword'); if(qw) qw.hidden=true;
    qxWrite(box,q,s,run,String(ans),()=>{ $('b',target).textContent=ans; target.classList.remove('cur','gap'); target.classList.add('got'); qxWin(t,q,1600); });
    hideHint(); $$('.qxsay',box).forEach(x=>{ x.hidden=true; x.style.display='none'; });   // no "write here" bubble and no second speaker: the number goes straight into the square
    const line=$('.qxline',box); if(line){ line.classList.add('qmhide'); const wd=$('.qxw',line), tp=qxWrite.type;
      qxWrite.type=ch=>{ const before=$$('.lt.got',wd).length; tp(ch); const g=$$('.lt.got',wd); if(g.length>before) $('b',target).textContent=g.map(l=>l.textContent).join(''); else if(ch&&!/\s/.test(ch)) qxBad(t); };
      const inp=$('#qxin'); if(inp) inp.oninput=()=>{ const ch=inp.value.replace(/\s/g,'').slice(-1); inp.value=''; qxWrite.type(ch); }; }
    return; }
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
  const n=q.n; q.word=q.word||mW(n);  q.hush=1; const grid=el('div','qmcount'+(q.group||q.img?' grp':'')); grid.style.setProperty('--c',q.cols||Math.max(1,Math.min(n,5))); grid.style.setProperty('--r',Math.max(1,Math.ceil(n/(q.cols||Math.max(1,Math.min(n,5))))));
  if(q.img&&q.group){ const im=new Image(); im.src=R_Q(q.img); im.alt=''; grid.append(im); } else if(q.img){ const im=new Image(); im.alt=''; cpicMake(new URL(R_Q(q.img),location.href).href,n).then(u=>{ im.src=u; }); grid.append(im); }   // a unit without "#n": the ONE count-picture helper (core.js) repeats it n times else { const im=new Image(); im.src=mDots(n); im.alt=''; grid.append(im); }
  box.append(grid);
  if(/^write the number/i.test(s.task||'')||s.typed){
    if(s.both){ const duo=el('div','qxduo'); box.append(duo); const pre=el('div','qxline qxpre'); pre.append(qxWordEl(mW(n),null,false,true)); pre.style.order=2; duo.append(pre); }   // both places (number, word) show from the start   // the book's "write the number": the child types it (Help shows it faintly for a moment); "both":true = then types its word too
    qxWrite(box,q,s,run,String(n),s.both?(()=>{ q.word=mW(n); $$('.qxpre',box).forEach(x=>x.remove()); qxWrite(box,q,s,run,mW(n)); }):null); return; }
  mPad(box,(q.options?mShuffle(q.options):mKeys(q.max||Math.max(10,n))),(v)=>{ if(v!==n) return false; qxWin(grid,q,1600); return true; });
}
// an addition sentence written the other way round is right too: "3 + 4 = 7" -> "4 + 3 = 7" when the child starts with the second number (subtraction keeps its order)
const mSwapSum=(w,k)=>{ const m=String(w).match(/^(\d+) \+ (\d+) = (\d+)$/); return m&&m[1]!==m[2]&&k===m[2][0]&&k!==m[1][0]?`${m[2]} + ${m[1]} = ${m[3]}`:null; };
/* a word problem in ONE slide (Ahmed 2026-11-18): the child writes the sentence, then under it the answer choices appear ("Answer: ___") - item.then = {lead, options, answer, askAudio, askSay, audio, word} */
async function mThen(w,st,pad,q,line){ const t=q.then; q.stage=2; qz.busy=true; const run=qz.run; $$('.lt',line).forEach(x=>x.classList.remove('cur')); try{ await qSound(q.audio,q.word); }catch(e){} if(run!==qz.run) return;
  pad.hidden=true; const ans=el('div','qxline mwline mwans'); ans.append(el('span','mwlead',t.lead||'')); const blank=el('span','mwcard mwblank','\u00a0\u00a0\u00a0\u00a0'); ans.append(blank); st.append(ans);
  const chips=el('div','qxchoices mwchips'); w.append(chips); const opts=t.options, wordy=opts.some(o=>[...String(o)].length>2);
  opts.forEach((o,k)=>{ const b=qChBtn(o,wordy); b.dataset.k=k; b.addEventListener('click',()=>{ if(qz.busy||q.solved) return; hideHint(); if(k!==t.answer) return qxBad(b);
      blank.textContent=o; blank.classList.add('got'); $$('.qch',chips).forEach(x=>x!==b&&x.classList.add('dim')); q.audio=t.audio||q.audio; q.word=t.word||q.word; qxWin(ans,q,1700); }); chips.append(b); });
  qz.busy=false; q.sayFn=async()=>{ vStop(); if(q.solved) return qSound(q.audio,q.word); return t.askAudio?qSound(R_Q(t.askAudio),t.askSay||''):undefined; };
  if(qAuto(q)) q.sayFn(); }
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
  [...(q.keys||s.keys||'1234567890')].forEach(k=>{ const b=qChBtn(k); b.classList.add('qmn'); b.dataset.v=k; b.setAttribute('aria-label',k==='−'?'minus':k==='+'?'plus':k==='='?'equals':k);
    b.addEventListener('click',()=>{ if(qz.busy||q.solved||qz.list[qz.i]!==q) return; hideHint(); let n=qxNext(wd); if(!n) return;
      if(k!==arDb(n.textContent)&&!$$('.lt.got',wd).length){ const sw=mSwapSum(q.word,k); if(sw){ q.word=sw; const nw=qxWordEl(sw,null,false,true); wd.replaceWith(nw); wd=nw; n=qxNext(wd); } }   // addition in either order is right: 4 + 3 = 7 as well as 3 + 4 = 7 (Marwa 2026-11-05)
      if(k===arDb(n.textContent)){ qxReveal(wd); blip(560+$$('.lt.got',wd).length*40,.05); cur(); if(qxDone(wd)){ if(q.then) mThen(w,st,pad,q,line); else qxWin(wd,q,1700); } }
      else { wsBad(n); qxBad(line); } }); pad.append(b); });
  q.sayFn=async()=>{ vStop(); if(q.askAudio&&!q.solved) return qSound(R_Q(q.askAudio),q.ask||''); return qSound(q.audio,q.word); };
  box._after=()=>{ if(qAuto(q)) return q.sayFn(); };
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
  btns.forEach((b,i)=>b.addEventListener('click',()=>{ if(qz.busy||q.solved) return;
    if(i!==target){ if(fr?i<target:i>target){ b.classList.add('cnt'); b.dataset.n=fr?i+1:n-i; return; } return qxBad(b); }   // counting on the way to the answer (1st, 2nd, 3rd...) is not a mistake; only a thing after it is
   
    const sl=q.group?(fr?[0,target]:[target,n-1]):[target,target]; const fb=el('div','mlframe'); fb.style.setProperty('--a',sl[0]); fb.style.setProperty('--b',sl[1]+1); things.append(fb);
    (fr?lf:lb).classList.add('on'); qxWin(w,q,1600); }));
}
QM.line={sheet:'box', draw:mLine, help:(q,w)=>q.items?$$('.mlchips .qch',w).filter(b=>+b.dataset.v===(q.from!=='back'?q.target+1:q.items.length-q.target)):$$('.mlt',w).filter((b,i)=>i===(q.from!=='back'?q.at-1:q.n-q.at))};
QM.numline={sheet:'box', bulb:0, draw:mNumline};
QM.bond={sheet:'box', bulb:0, draw:mBond};
QM.bigger={sheet:'box', draw:mBigger, help:(q,w)=>{ const v=q.find==='smaller'?Math.min(...q.nums):Math.max(...q.nums); return $$('.qmbig .qch',w).filter(b=>+b.dataset.v===v); }};
QM.count={sheet:'box', bulb:0, draw:mCount};
// shade = the book's "Color the same number of things" (performance book): the picture of n things on top, a row of empty circles under it; the child taps circles to colour them,
// the star comes when exactly n are coloured (one tap more than n = shake, that circle stays empty; tap a coloured one to take it back). item {img "x.png#n" + group:true | img + n, n, slots (circles, default 10), audio, word}
function mShade(box,q,s,run){
  const n=q.n; q.word=q.word||mW(n); q.hush=1; const slots=q.slots||10;
  const grid=el('div','qmcount grp'); grid.style.setProperty('--c',1); grid.style.setProperty('--r',1);
  if(!q.img){ const nb=el('div','qmbignum',String(n)); grid.append(nb); }   // no picture: the number itself is shown ("Color the given number")
  else if(q.group){ const im=new Image(); im.src=R_Q(q.img); im.alt=''; grid.append(im); } else { const im=new Image(); im.alt=''; cpicMake(new URL(R_Q(q.img),location.href).href,n).then(u=>{ im.src=u; }); grid.append(im); }
  const row=el('div','qmcirc');
  for(let i=0;i<slots;i++){ const b=el('button','qcirc'); b.setAttribute('aria-label','circle '+(i+1)); row.append(b);
    b.addEventListener('click',()=>{ if(qz.busy||q.solved) return;
      if(b.classList.contains('on')){ b.classList.remove('on'); return; }
      if($$('.qcirc.on',row).length>=n) return qxBad(b);
      b.classList.add('on'); blip(520+$$('.qcirc.on',row).length*40,.05);
      if($$('.qcirc.on',row).length===n) qxWin(row,q,1600); }); }
  box.append(grid,row);
}
QM.shade={sheet:'box', draw:mShade, help:(q,w)=>$$('.qcirc',w).filter((b,i)=>i<q.n)};
QM.mwrite={sheet:'box', own:1, draw:mWrite, help:(q,w)=>{ if(q.stage===2) return $$('.mwchips .qch',w).filter(b=>+b.dataset.k===q.then.answer); const n=qxNext($('.mwline .qxw',w)); return n?$$('.mwkeys .qmn',w).filter(b=>b.dataset.v===arDb(n.textContent)):[]; }};


/* clock = the clock models (Arabic book unit 8, "قراءة الساعة"): ONE widget (clockWidget) used by the questions (QM.clock) and by the weekly papers (exam atom {t:"clock"}).
   item {h:6, m:0|30, mode, ask, options}:
     "set"  : the child sets BOTH hands for h:m (short hand = hours, long hand = minutes). He taps the clock where the selected hand must point; right = the hand stays (and the other hand is selected), wrong = shake.
     "long" : the short hand is already drawn; the child sets only the LONG hand ("نرسم العقرب الطويل").
     "read" : the clock shows h:m; the child picks the time from "options" (time words) — default 4 options made from h and m.
   The hour hand is checked to 15 degrees (half hours sit between two numbers), the minute hand to 30 degrees (the numbers). The numbers are DOM text, so math-ar shows Arabic-Indic digits like everywhere else. */
function clockTime(h,m){ return m===30?(isAr()?`الساعة ${h} ونصف`:`${h}:30`):(isAr()?`الساعة ${h}`:`${h} o'clock`); }
function clockWidget(o){
  const NS='http://www.w3.org/2000/svg', mode=o.mode||'set', h=o.h, m=o.m||0, hrA=((h%12)*30+m/2)%360, mnA=(m*6)%360;
  const w=el('div','clkw clk-'+mode), svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox','0 0 200 200'); svg.setAttribute('class','clkface'); w.append(svg);
  const add=(tag,at,txt)=>{ const e=document.createElementNS(NS,tag); Object.keys(at).forEach(k=>e.setAttribute(k,at[k])); if(txt!=null) e.textContent=txt; svg.append(e); return e; };
  add('circle',{cx:100,cy:100,r:94,fill:'#fff',stroke:'#3a2a1a','stroke-width':5});
  for(let i=0;i<60;i++){ const a=i*6*Math.PI/180, big=i%5===0, r1=big?82:86; add('line',{x1:100+Math.sin(a)*r1,y1:100-Math.cos(a)*r1,x2:100+Math.sin(a)*90,y2:100-Math.cos(a)*90,stroke:'#3a2a1a','stroke-width':big?2.4:1}); }
  for(let i=1;i<=12;i++){ const a=i*30*Math.PI/180; add('text',{x:100+Math.sin(a)*68,y:100-Math.cos(a)*68+1,'text-anchor':'middle','dominant-baseline':'central','font-size':19,'font-weight':800,fill:'#3a2a1a','font-family':'inherit'},String(i)); }
  const hand=(len,wd,col,cls)=>add('line',{x1:100,y1:100,x2:100,y2:100-len,stroke:col,'stroke-width':wd,'stroke-linecap':'round',class:'clkh '+cls,style:'display:none'});
  const hr=hand(46,9,'#E0412C','clk-hr'), mn=hand(70,5.5,'#2E7DD1','clk-mn'); add('circle',{cx:100,cy:100,r:6,fill:'#3a2a1a'});
  const aim=add('circle',{cx:100,cy:100,r:7,fill:'#FFC94A',stroke:'#3a2a1a','stroke-width':2,style:'display:none'});
  const put=(e,a)=>{ e.setAttribute('transform',`rotate(${a} 100 100)`); e.style.display=''; };
  const st={hr:mode==='long'||mode==='read',mn:mode==='read',sel:mode==='long'?'mn':'hr',done:false};
  if(mode==='long'||mode==='read') put(hr,hrA); if(mode==='read') put(mn,mnA);
  const chips=el('div','clkchips'); w.append(chips);
  const mk=(k,t)=>{ const b=el('button','clkchip',t); b.dataset.k=k; b.onclick=()=>{ if(st.done) return; st.sel=k; sync(); }; chips.append(b); return b; };
  let bh,bm; if(mode==='set'){ bh=mk('hr',isAr()?'العقرب القصير (الساعات)':'Short hand (hours)'); bm=mk('mn',isAr()?'العقرب الطويل (الدقائق)':'Long hand (minutes)'); }
  const sync=()=>{ if(bh){ bh.classList.toggle('on',st.sel==='hr'); bh.classList.toggle('ok',st.hr); bm.classList.toggle('on',st.sel==='mn'); bm.classList.toggle('ok',st.mn); } };
  sync();
  const finish=()=>{ st.done=true; w.classList.add('clkdone'); o.onDone&&o.onDone(); };
  if(mode==='read'){
    const ops=o.options||[], row=el('div','clkopts'); w.append(row);
    ops.forEach(t=>{ const b=el('button','clkchip clkopt',t); b.onclick=()=>{ if(st.done) return; if(t!==o.answer){ o.onWrong&&o.onWrong(b); return; } b.classList.add('ok'); finish(); }; row.append(b); });
    chips.hidden=true;
  } else {
    svg.addEventListener('pointerdown',e=>{ if(st.done) return; const r=svg.getBoundingClientRect(), sx=200/r.width, dx=(e.clientX-r.left)*sx-100, dy=(e.clientY-r.top)*sx-100; if(Math.hypot(dx,dy)<14) return;
      const a=(Math.atan2(dx,-dy)*180/Math.PI+360)%360, k=st.sel; if(st[k]) return;
      const snap=k==='mn'?30:15, s=(Math.round(a/snap)*snap)%360, tgt=k==='mn'?mnA:hrA;
      if(s!==tgt){ o.onWrong&&o.onWrong(svg); return; }
      put(k==='mn'?mn:hr,tgt); st[k]=true; blip(640,.05); const other=k==='mn'?'hr':'mn'; if(mode==='set'&&!st[other]) st.sel=other; sync();
      if(st.hr&&st.mn) finish(); }); }
  w.hint=()=>{ if(st.done) return null; if(mode==='read'){ const b=$$('.clkopt',w).find(x=>x.textContent===o.answer); if(b){ b.classList.add('peek'); return ()=>b.classList.remove('peek'); } return null; }
    const k=st.sel, a=(k==='mn'?mnA:hrA)*Math.PI/180, r=k==='mn'?70:46; aim.setAttribute('cx',100+Math.sin(a)*r); aim.setAttribute('cy',100-Math.cos(a)*r); aim.style.display=''; return ()=>{ aim.style.display='none'; }; };
  return w;
}
function mClockOptions(h,m){ const set=new Set([clockTime(h,m)]); [[h,m===30?0:30],[h%12+1,m],[(h+10)%12+1,m],[(h+4)%12+1,m===30?0:30]].forEach(([a,b])=>{ if(set.size<4) set.add(clockTime(a,b)); }); return mShuffle([...set]); }
function mClock(box,q,s,run){
  q.hush=1; q.word=q.word||q.ask||s.task||''; const mode=q.mode||'set';
  const w=el('div','mclock'); box.append(w);
  if(q.ask){ const p=el('p','clkask',''); p.append(document.createTextNode(q.ask)); if(q.askAudio||q.ask){ const sp=el('button','qsay clkspk',SAY_LN); sp.setAttribute('aria-label','Listen'); sp.onclick=()=>qSay(); p.append(sp); box._after=()=>{ if(qAuto(q)) return qSay(); }; } w.append(p); }   // the question's own speaker sits INSIDE its line (it used to be a separate row above that took room and nobody knew what it was: Ahmed 2026-11-14)
  const opts=q.options||(mode==='read'?mClockOptions(q.h,q.m||0):null), ans=q.answer||clockTime(q.h,q.m||0);
  const cw=clockWidget({h:q.h,m:q.m||0,mode,options:opts,answer:ans,onWrong:t=>qxBad(t),onDone:()=>qxWin(w,q,1600)}); w.append(cw); q.clockEl=cw;
  const hb=helpBtn('qxhelp qmhelp'); let undo=null; hb.onclick=()=>{ if(qz.busy||q.solved) return; if(undo) undo(); undo=cw.hint(); setTimeout(()=>{ if(undo){ undo(); undo=null; } },1800); }; qHelpHost(hb);
}
QM.clock={sheet:'box', noword:1, bulb:0, draw:mClock};

/* WORDS tab of the maths lessons (Ahmed 2026-11-18): the picture of a word is DRAWN here from its spec (no picture files):
   img "data:draw,num,N,ar|en" = the numeral (Arabic or English digits) in a lesson colour; "data:draw,pos,K,N,ar|en" = N cats in a row with the K-th ringed (Arabic: the front is at the RIGHT, the cats face the other way).
   Called once when a lesson with such words opens (lesson.js openLesson). */
const M_DIG='٠١٢٣٤٥٦٧٨٩', M_NUMCOL=['#E0412C','#2A7FD8','#F2B321','#2FA8A0','#8A5CC9','#F08A2C','#3FA34D','#D8396B','#E0412C','#8A5CC9'];
function mDrawLoad(src){ return new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src=src; }); }
async function mVocabPics(L){
  const cat=await mDrawLoad(new URL((L.base||'')+'../../pics/cat.png',document.baseURI).href), ff=getComputedStyle(document.body).fontFamily||'sans-serif';
  for(const v of L.vocab||[]){
    const m=/^data:draw,(num|pos),(.*)$/.exec(v.img||''); if(!m) continue; const a=m[2].split(','), c=document.createElement('canvas'), x=c.getContext('2d');
    if(m[1]==='num'){ const n=+a[0], ar=a[1]==='ar', t=ar?String(n).split('').map(d=>M_DIG[+d]).join(''):String(n); c.width=520; c.height=420; x.textAlign='center'; x.textBaseline='middle';
      let fs=n>9?260:330; x.font=`700 ${fs}px ${ff}`; x.lineJoin='round'; x.lineWidth=26; x.strokeStyle='#fff'; x.strokeText(t,260,225); x.fillStyle=M_NUMCOL[(n-1)%10]; x.fillText(t,260,225); }
    else { const k=+a[0], n=+a[1], ar=a[2]==='ar', W=900, H=300; c.width=W; c.height=H; x.fillStyle='#fff'; x.beginPath(); x.roundRect(0,40,W,H-80,36); x.fill();
      const sw=(W-60)/n, ih=H-120; for(let i=0;i<n;i++){ const cx=30+sw*(i+.5); if(cat){ const w=Math.min(sw*.86,ih*cat.width/cat.height), h=w*cat.height/cat.width; x.save(); x.translate(cx,H-52); if(ar) x.scale(-1,1); x.drawImage(cat,-w/2,-h,w,h); x.restore(); } }
      const i=ar?n-k:k-1, cx=30+sw*(i+.5); x.strokeStyle='#E8457A'; x.lineWidth=12; x.beginPath(); x.ellipse(cx,H/2,Math.min(sw*.52,70),ih/2+14,0,0,Math.PI*2); x.stroke(); }
    v.img=c.toDataURL('image/png'); }
}
