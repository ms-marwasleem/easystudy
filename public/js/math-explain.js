/* MATH lesson EXPLAIN tab (lesson.json "type": "math", "math": {rows:[{n, word, audio}]}) — the book's number table: red dots, the number, its word.
   One row per number; tap a row to hear the word (the speaker sits beside the word). Done (star) when every row was heard.
   The dots are drawn by mDots() (quiz-math.js), so no picture files. */
const mx={run:0,heard:{}};
const mxHeard=()=>mx.heard[LESSON.id]=mx.heard[LESSON.id]||{};
function mxMark(i,row){ const h=mxHeard(); h[i]=1; row.classList.add('heard'); const n=Object.keys(h).length, all=(LESSON.math.bonds||LESSON.math.line||LESSON.math).rows.length; carFrac(n/all); if(n>=all) award(LESSON.id,'read'); }
async function mxSay(r,btn){ vStop(); const run=++mx.run; btn.classList.add('on'); try{ await playFile(r.audio); }catch(e){} if(run===mx.run) btn.classList.remove('on'); }
// "What makes N?" table: M.bonds = {whole:8, rows:[{a:1,b:7,audio}]}: red + blue dots in a frame, "1 and 7 make 8" (tap = the sentence is said)
function mxBondDots(a,b){ const R=5,s=40,n=a+b,rows=Math.ceil(n/R),c=Array.from({length:n},(_,k)=>`<circle cx="${(k%R)*s+s/2}" cy="${Math.floor(k/R)*s+s/2}" r="14" fill="${k<a?'#E0412C':'#2A7FD8'}" stroke="#5A3418" stroke-width="3"/>`).join('');
  return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${R*s} ${rows*s}">${c}</svg>`); }
function mxBondRow(r,whole){ return el('button','mxrow mxbond',`<span class="mxdots"><img src="${mxBondDots(r.a,r.b)}" alt=""></span><span class="mxeq"><b class="r">${r.a}</b><i>and</i><b class="b">${r.b}</b></span><span class="mxmk">make <b>${whole}</b></span><i class="mxsay">${SAY_LN}</i>`); }
// number line (M.line = {rows:[{n,word,audio}], small:{img,word,audio}, big:{...}, text, textAudio}): coloured stones 1..10, mouse = Smallest, elephant = Biggest; tap = said
const MX_STONE=['#E0412C','#2A7FD8','#F2B321','#2FA8A0','#8A5CC9','#F08A2C','#3FA34D','#D8396B','#E0412C','#8A5CC9'];
function showMathLine(){
  const L=LESSON.math.line, h=mxHeard(); stage.innerHTML=''; mx.run++;
  const scene=el('div','scene pics mx'), box=el('div','mxline'); const bind=(b,r,mark)=>{ b.addEventListener('click',()=>{ if(mark!=null) mxMark(mark,b); mxSay(r,b); }); return b; };
  const end=(c,o)=>bind(el('button','mxend '+c,`<img src="${o.img}" alt=""><b>${o.word}</b>`),o);
  const stones=el('div','mxstones'); L.rows.forEach((r,i)=>{ const b=bind(el('button','mxstone'+(h[i]?' heard':''),`<b>${r.n}</b>`),r,i); b.style.background=MX_STONE[i]; b.setAttribute('aria-label',r.word); stones.append(b); });
  const cap=bind(el('button','mxcap',`<span>${L.text}</span><i class="mxsay">${SAY_LN}</i>`),{audio:L.textAudio});
  box.append(end('sm',L.small),stones,end('bg',L.big),cap); scene.append(box); stage.append(scene); carFrac(Object.keys(h).length/L.rows.length);
  setRail([{kind:'go',icon:'play',label:tr('Listen'),click:async()=>{ vStop(); const run=++mx.run; for(const b of $$('.mxstone')){ if(run!==mx.run) return; b.click(); await new Promise(x=>setTimeout(x,1300)); } }}]);
  if(typeof bookTag==='function') bookTag();
}
function showMathExplain(){
  if(LESSON.math.line) return showMathLine();
  const M=LESSON.math, h=mxHeard(); stage.innerHTML=''; mx.run++;
  const B=M.bonds, ROWS=B?B.rows:M.rows;
  const scene=el('div','scene pics mx'), grid=el('div','mxgrid'); grid.style.setProperty('--n',ROWS.length);
  scene.append(grid);
  ROWS.forEach((r,i)=>{ const b=B?mxBondRow(r,B.whole):el('button','mxrow'+(h[i]?' heard':''),
    `<span class="mxdots"><img src="${mDots(r.n)}" alt=""></span><b class="mxnum">${r.n}</b><span class="mxword">${r.word}</span><i class="mxsay">${SAY_LN}</i>`);
    if(B&&h[i]) b.classList.add('heard'); b.setAttribute('aria-label',B?`${r.a} and ${r.b} make ${B.whole}`:r.word); b.addEventListener('click',()=>{ mxMark(i,b); mxSay(r,b); }); grid.append(b); });
  stage.append(scene); carFrac(Object.keys(h).length/ROWS.length);
  setRail([{kind:'go',icon:'play',label:tr('Listen'),click:mxAll}]);
  if(typeof bookTag==='function') bookTag();
}
async function mxAll(){ const rows=$$('.mxgrid .mxrow'); vStop(); const run=++mx.run; for(const r of rows){ if(run!==mx.run) return; r.click(); await new Promise(x=>setTimeout(x,1500)); } }
