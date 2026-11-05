/* GRAMMAR ANIMATION — ONE template for the Grammar tab (used by showGrammar in quiz-al.js when a card has "anim").
   Not text cards: each grammar card is one animated page (dots at the bottom, plays by itself, tap Restart to see again).
   Data only, in lesson.json "grammar":[{title, rows, anim:{kind, ...}}]  (rows stay as the plain text of the card):
     kind "sort"   bins:["am","is","are"], items:[{t:"He", bin:1, a?:audio}]      words fly into the bucket of their verb
     kind "morph"  steps:[{from:"I am a child.", to:"I'm a child.", map:[[0,1],[2],[3]], hl?:[j..], fa?, ta?, ans?:{t,a}}]
                   the long sentence turns into the short one / the question / the negative; map[j] = the from-words word j of "to" comes from
                   ([] = a new word that pops in); changed words light up; fa / ta = audio of the from / to sentence; ans = answer line shown after
     kind "reveal" items:[{t, a, hl?:"in", fig?:{place:"in"|"on"|"under"|"next to"|"between"|"in front of"|"behind"|"opposite"} | {arrow:"left"|"right"|"straight"|"stop"}
                   | {dist:"near"|"far", n:1|3} | {mark:"yes"|"no"}}], one:true = one big picture at a time (else the lines pile up)
     kind "pair"   items:[{l:{t,a}, r:{t,a}}]  opposites: two words slide in from both sides
   Audio paths are the same as the text cards used (data/en-shared/q/...). Star (award 'grammar') when every page played. */
(function(){
'use strict';
const STOP={stop:1};
const an=(e,kf,o)=>{ try{ return e.animate(kf,{duration:600,easing:'ease',fill:'both',...o}).finished.catch(()=>{}); }catch(x){ return Promise.resolve(); } };
const norm=w=>w.toLowerCase().replace(/[^a-z']/g,'');
const rich=(host,text,hl)=>{ host.textContent=''; const m=hl&&new RegExp('(^|[^A-Za-z\'])('+hl.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?![A-Za-z\'])','i').exec(text);
  if(!m){ host.append(text); return; } const k=m.index+m[1].length; host.append(text.slice(0,k)); const b=el('b','gr-hl'); b.textContent=m[2]; host.append(b,text.slice(k+m[2].length)); };
const blob=(x,y,r,c='#FF8A1F',cls='')=>`<g transform="translate(${x} ${y})"><g class="mv ${cls}"><ellipse rx="${r}" ry="${r*.92}" fill="${c}" stroke="#6B2E0C" stroke-width="3"/><circle cx="${-r*.32}" cy="${-r*.2}" r="${r*.26}" fill="#fff"/><circle cx="${r*.32}" cy="${-r*.2}" r="${r*.26}" fill="#fff"/><circle cx="${-r*.28}" cy="${-r*.18}" r="${r*.12}" fill="#222"/><circle cx="${r*.36}" cy="${-r*.18}" r="${r*.12}" fill="#222"/></g></g>`;
const WOOD='fill="#C98A4B" stroke="#6B2E0C" stroke-width="3" stroke-linejoin="round"';
const block=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ${WOOD}/>`;
const table=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h*.22}" rx="4" ${WOOD}/><rect x="${x+w*.08}" y="${y}" width="${w*.1}" height="${h}" ${WOOD}/><rect x="${x+w*.82}" y="${y}" width="${w*.1}" height="${h}" ${WOOD}/>`;
/* figures: the mover (class .mv) is animated in; viewBox 200 x 120 */
const FIG={
  place(rel){ const g=(inner)=>`<svg viewBox="0 0 200 120" class="gr-svg">${inner}</svg>`;
    switch(rel){
      case 'in': return {svg:g(block(70,48,60,58).replace('/>',' opacity=".55"/>')+blob(100,76,17)+`<rect x="70" y="72" width="60" height="34" rx="4" ${WOOD}/>`),from:[0,-60]};
      case 'on': return {svg:g(table(60,60,80,46)+blob(100,40,17)),from:[0,-50]};
      case 'under': return {svg:g(blob(100,86,15)+table(60,44,80,62)),from:[0,50]};
      case 'next to': return {svg:g(block(95,56,50,50)+blob(55,82,22)),from:[-70,0]};
      case 'between': return {svg:g(block(30,56,44,50)+block(126,56,44,50)+blob(100,82,20)),from:[0,-60]};
      case 'in front of': return {svg:g(block(80,34,64,72)+blob(80,86,22)),from:[-60,0]};
      case 'behind': return {svg:g(blob(112,70,22)+block(68,44,64,62)),from:[60,0]};
      case 'opposite': return {svg:g(`<path d="M72 96 H128" stroke="#fff" stroke-width="3" stroke-dasharray="6 6"/>`+blob(36,78,22)+blob(164,78,22,'#2E8FEA')),from:[-70,0]};
    } return {svg:g(blob(100,70,22)),from:[0,0]}; },
  arrow(d){ const rot={left:-90,right:90,straight:0}[d]; if(d==='stop') return {svg:`<svg viewBox="0 0 200 120" class="gr-svg"><polygon points="76,18 124,18 150,44 150,92 124,118 76,118 50,92 50,44" transform="translate(0 -6)" fill="#E8443A" stroke="#fff" stroke-width="6"/><text x="100" y="78" text-anchor="middle" font-size="30" fill="#fff" font-family="inherit">STOP</text></svg>`,from:[0,0]};
    return {svg:`<svg viewBox="0 0 200 120" class="gr-svg"><g transform="translate(100 60) rotate(${rot})"><path class="mv" d="M-18 40 V-6 H-40 L0 -48 L40 -6 H18 V40 Z" fill="#FFC928" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></g></svg>`,from:[0,0],mv:d}; },
  dist(f){ const x=f.dist==='near'?78:158, ys=f.n>1?[48,70,92]:[70]; const star=(cx,cy)=>`<g transform="translate(${cx} ${cy}) scale(${f.dist==='near'?1:.7})"><path class="mv" d="M0 -14 L4 -4 L15 -4 L6 3 L9 14 L0 7 L-9 14 L-6 3 L-15 -4 L-4 -4Z" fill="#FFC928" stroke="#6B2E0C" stroke-width="2.5" stroke-linejoin="round"/></g>`;
    return {svg:`<svg viewBox="0 0 200 120" class="gr-svg">${blob(28,78,18,'#2E8FEA')}${ys.map((y,i)=>star(x+(f.n>1?[(i-1)*8,0,(1-i)*8][i]*0:0),y)).join('')}</svg>`,from:[40,0]}; },
  mark(m){ return {svg:`<svg viewBox="0 0 200 120" class="gr-svg">${m==='yes'?'<path class="mv" d="M52 62 L88 96 L150 28" fill="none" stroke="#5BD13A" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>':'<g class="mv" stroke="#E8443A" stroke-width="18" stroke-linecap="round"><path d="M56 22 L144 100"/><path d="M144 22 L56 100"/></g>'}</svg>`,from:[0,0]}; }
};
function figure(f){ if(f.place) return FIG.place(f.place); if(f.arrow) return FIG.arrow(f.arrow); if(f.dist) return FIG.dist(f); if(f.mark) return FIG.mark(f.mark); return null; }

window.gramAnim=function(cards){
  const wrap=el('div','quiz gan'); const title=el('h3','gan-title'), box=el('div','gan-box'), dots=el('div','gan-dots'); wrap.append(title,box,dots); stage.append(wrap);
  let gen=0, cur=0, playing=false; const done=new Set(STARS[LESSON.id]&&STARS[LESSON.id].grammar?cards.map((_,k)=>k):[]);
  const live=g=>{ if(g!==gen||!wrap.isConnected) throw STOP; };
  const wait=(ms,g)=>new Promise(r=>setTimeout(r,ms)).then(()=>live(g));
  const say=async(a,t,g)=>{ if(a===null) return; await qSound(a||alWordSrc(t),t); live(g); };
  const apo=(host,w)=>{ host.textContent=''; w.split("'").forEach((p,k)=>{ if(k){ const i=el('i','gm-ap'); i.textContent="'"; host.append(i); } host.append(p); }); };

  async function kSort(a,g){
    box.innerHTML=''; const tray=el('div','gs-tray'), bins=el('div','gs-bins'); box.append(tray,bins);
    const B=a.bins.map((t,i)=>{ const b=el('div','gs-bin c'+i), h=el('div','gs-h'), st=el('div','gs-stack'); h.textContent=t; b.append(h,st); bins.append(b); return {h,st}; });
    await an(bins,[{opacity:0,transform:'translateY(2rem)'},{opacity:1,transform:'none'}],{duration:500}); live(g);
    for(const it of a.items){ const c=el('div','gs-chip c'+it.bin); c.textContent=it.t; tray.append(c);
      await an(c,[{transform:'scale(0)'},{transform:'scale(1)'}],{duration:300,easing:'cubic-bezier(.3,1.5,.5,1)'}); await wait(300,g);
      const r0=c.getBoundingClientRect(); B[it.bin].st.append(c); const r1=c.getBoundingClientRect();
      await an(c,[{transform:`translate(${r0.left-r1.left}px,${r0.top-r1.top}px)`},{transform:'none'}],{duration:700,easing:'cubic-bezier(.3,1.3,.5,1)'}); live(g);
      const v=el('b','gs-v'); v.textContent=a.bins[it.bin]; c.append(' ',v); an(v,[{transform:'scale(0)'},{transform:'scale(1.3)'},{transform:'scale(1)'}],{duration:400});
      an(B[it.bin].h,[{transform:'scale(1)'},{transform:'scale(1.3)'},{transform:'scale(1)'}],{duration:450});
      if(it.a) await say(it.a,it.t,g); await wait(200,g); }
    await wait(500,g);
  }
  async function kMorph(a,g){
    for(const s of a.steps){ box.innerHTML=''; const st=el('div','gm-stack'), L1=el('div','gm-line'), L2=el('div','gm-line');
      const f=s.from.split(' '), t=s.to.split(' ');
      const F=f.map(w=>{ const e=el('span','gm-w'); e.textContent=w; L1.append(e); return e; });
      let mx=-1; const chg=t.map((w,j)=>{ const sr=s.map[j]||[]; const c=sr.length!==1||norm(f[sr[0]])!==norm(w)||sr[0]<mx; if(sr.length) mx=Math.max(mx,...sr); return s.hl?s.hl.includes(j):c; });
      const T=t.map((w,j)=>{ const e=el('span','gm-w gm-t'+(chg[j]?' chg':'')); apo(e,w); L2.append(e); return e; });
      st.append(L1,L2); box.append(st); T.forEach(e=>e.style.opacity=0);
      await an(L1,[{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'none'}],{duration:350}); live(g);
      if(s.fa) await say(s.fa,s.from,g); else await wait(900,g);
      const rf=F.map(e=>e.getBoundingClientRect()), rt=T.map(e=>e.getBoundingClientRect()), jobs=[], moved=new Set();
      s.map.forEach((sr,j)=>{ sr.forEach(i=>{ moved.add(i); const dx=rt[j].left-rf[i].left, dy=rt[j].top-rf[i].top;
          jobs.push(an(F[i],[{transform:'none',opacity:1},{transform:`translate(${dx}px,${dy}px)`,opacity:1,offset:.7},{transform:`translate(${dx}px,${dy}px)`,opacity:0}],{duration:1300,easing:'ease-in-out'})); });
        jobs.push(an(T[j],[{opacity:0,transform:'scale(.7)'},{opacity:0,transform:'scale(.7)',offset:.6},{opacity:1,transform:'scale(1.15)',offset:.85},{opacity:1,transform:'scale(1)'}],{duration:1300})); });
      F.forEach((e,i)=>{ if(!moved.has(i)) jobs.push(an(e,[{opacity:1,transform:'none'},{opacity:0,transform:'scale(.2)'}],{duration:700})); });
      await Promise.all(jobs); live(g); await say(s.ta,s.to,g);
      if(s.ans){ const A=el('div','gm-ans'); rich(A,s.ans.t); box.append(A); await an(A,[{opacity:0,transform:'translateY(1rem)'},{opacity:1,transform:'none'}],{duration:400}); await say(s.ans.a,s.ans.t,g); }
      await wait(700,g); }
  }
  async function kReveal(a,g){
    box.innerHTML=''; const list=el('div','gr-list'+(a.one?' one':'')); box.append(list);
    for(const it of a.items){ if(a.one) list.innerHTML=''; const row=el('div','gr-row'); const tx=el('div','gr-t'); rich(tx,it.t,it.hl); const fg=it.fig?figure(it.fig):null;
      if(fg){ const fw=el('div','gr-fig'); fw.innerHTML=fg.svg; row.append(fw); list.append(row); const mv=fw.querySelector('.mv');
        if(mv){ const sc=1; await an(mv,[{opacity:0,transform:`translate(${fg.from[0]}px,${fg.from[1]}px)`},{opacity:1,transform:'none'}].map(k=>k),{duration:fg.mv?500:800,easing:'cubic-bezier(.3,1.3,.5,1)'}); } }
      row.append(tx); if(!fg) list.append(row);
      await an(tx,[{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'none'}],{duration:350}); live(g);
      await say(it.a,it.t,g); await wait(a.one?900:350,g); }
    await wait(400,g);
  }
  async function kPair(a,g){
    box.innerHTML=''; const list=el('div','gp-list'); box.append(list);
    for(const it of a.items){ list.innerHTML=''; const row=el('div','gp-row'), l=el('div','gp-w c0'), m=el('div','gp-m'), r=el('div','gp-w c1'); l.textContent=it.l.t; r.textContent=it.r.t; m.innerHTML='<svg viewBox="0 0 80 40"><path d="M8 20 H72 M20 8 L6 20 L20 32 M60 8 L74 20 L60 32" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      row.append(l,m,r); list.append(row);
      await Promise.all([an(l,[{opacity:0,transform:'translateX(-40vw)'},{opacity:1,transform:'none'}],{duration:600,easing:'cubic-bezier(.3,1.2,.5,1)'}),an(r,[{opacity:0,transform:'translateX(40vw)'},{opacity:1,transform:'none'}],{duration:600,easing:'cubic-bezier(.3,1.2,.5,1)'})]); live(g);
      await an(m,[{transform:'scale(0)'},{transform:'scale(1.2)'},{transform:'scale(1)'}],{duration:350}); await say(it.l.a,it.l.t,g); an(l,[{transform:'scale(1)'},{transform:'scale(1.2)'},{transform:'scale(1)'}],{duration:350});
      await say(it.r.a,it.r.t,g); an(r,[{transform:'scale(1)'},{transform:'scale(1.2)'},{transform:'scale(1)'}],{duration:350}); await wait(700,g); }
  }
  const KINDS={sort:kSort,morph:kMorph,reveal:kReveal,pair:kPair};

  const rail=on=>{ if(!wrap.isConnected||tab!=='grammar') return; setRail([
    on?{kind:'stop',icon:'stop',label:tr('Stop'),click:()=>{ ++gen; vStop(); playing=false; rail(false); }}:{kind:'go',icon:'play',label:tr('Read'),click:()=>run(cur,true)},
    {kind:'again',icon:'restart',label:tr('Restart'),click:()=>run(cur,true)}]); };
  const paint=()=>{ dots.innerHTML=''; cards.forEach((c,k)=>{ const d=el('button','gan-dot'+(k===cur?' on':'')+(done.has(k)?' ok':'')); d.setAttribute('aria-label',String(k+1)); d.addEventListener('click',()=>run(k,true)); dots.append(d); }); title.textContent=cards[cur].title||''; };
  async function run(i,auto){
    const g=++gen; vStop(); cur=i; paint(); playing=true; rail(true); carFrac(i/cards.length);
    try{ const a=cards[i].anim; await KINDS[a.kind](a,g); done.add(i); paint(); carFrac((i+1)/cards.length);
      if(done.size>=cards.length&&!showGrammar.done){ showGrammar.done=1; award(LESSON.id,'grammar'); }
      live(g); playing=false; rail(false); if(auto&&i<cards.length-1){ await wait(900,g); run(i+1,true); }
    }catch(e){ if(e!==STOP) console.error(e); } }
  window.gramStop=()=>{ ++gen; playing=false; };   // core.js stopVoice: leaving the tab / lesson stops the animation and its voice
  showGrammar.done=!!(STARS[LESSON.id]&&STARS[LESSON.id].grammar);
  setTimeout(()=>run(0,true),60);
};
})();
