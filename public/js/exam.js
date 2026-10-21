/* EXAM PAPERS — the school's "Models / تقييمات" sheets, solved on the screen.
   An exam looks like the paper (one or more sheets one after another, same design), NOT like a game: the child types, ticks, circles, underlines,
   matches or colours exactly as the question says. Every answer is checked at once: right = a small celebration, wrong = a warning (no grade at the end).
   Each question's header line has a listen icon (reads only that question) and a help icon (shows the answer faintly for a moment).
   Landscape screens: the sheet is wide and scrolls up/down. Portrait: each sheet is fitted to the screen whole.
   The papers are DATA (data/<subject>/exams/<name>/exam.json), see docs/EXAMS.md: a new exam needs no code.
   The red marker on the map: a lesson in subject.json gets "exams":[{"id":"models","title":"Models","file":"data/math/exams/models/exam.json"}].
   Drawings come from js/exam-art.js. Question audio: "audio" path on a question (recording) else the device voice reads the text (English only; Arabic never). */
const X={base:location.href,qs:[],pages:[],run:0,links:[]};
const xNorm=s=>String(s==null?'':s).replace(/[\u0660-\u0669]/g,d=>d.charCodeAt(0)-0x660).replace(new RegExp('['+AR_MARKS+'\\u0640]','g'),'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase().trim().replace(/\s+/g,' ');

// ---------- open / build ----------
async function openExam(lesson,ex){
  stopAll(); vStop(); busy(true);
  let d; try{ X.base=new URL(ex.file,location.href).href; d=await get(ex.file); }catch(e){ busy(false); message('Oops!','This paper did not load. Check the internet and try again.'); return; }
  await vpLoad(isAr()?null:new URL('.',X.base).href);
  X.d=d; X.title=ex.title||d.title||'Exam'; X.qs=[]; X.pages=[]; X.links=[]; X.run++;
  const root=$('#xPages'); root.innerHTML='';
  (d.pages||[]).forEach((pg,i)=>root.append(xPage(pg,i,d)));
  $('#xTitle').textContent=X.title; $('#xSub').textContent=SUBJECT.name;
  // one button per assessment, ONE assessment on screen at a time: pages that share a "group" (the assessment number) stack under its button; no group = a page is its own assessment
  // button text is short: the number if the assessment is numbered ("Model 2" -> 2, "تقييم نهائي ٣" -> ٣), else its name; "tab" on the page overrides
  X.groups=[]; (d.pages||[]).forEach((p,i)=>{ const g=p.group!=null?String(p.group):'p'+i, k=X.groups.find(x=>x.g===g); if(k) k.pages.push(i); else X.groups.push({g,label:xTabLabel(p),pages:[i]}); });
  $('#xChips').innerHTML=X.groups.length>1?X.groups.map((g,i)=>`<button class="pill cream xchip" data-i="${i}">${g.label}</button>`).join(''):'';
  $$('.xchip').forEach(b=>b.onclick=()=>xShow(+b.dataset.i));
  $$('img',root).forEach(i=>{ if(!i.complete) i.addEventListener('load',()=>{ clearTimeout(xFit.t2); xFit.t2=setTimeout(xFit,60); },{once:true}); });
  X.cur=0; xShow(0,true); show('exam'); busy(false); xFit(); $('#xScroll').scrollTop=0;
  X.qs.forEach(q=>q.el.classList.toggle('done',q.atoms.every(a=>a.solved)));
}
function xPage(pg,pi,d){
  const p=el('article','xpage'); p.dataset.i=pi; X.pages.push(p); if(pg.fs) p.style.setProperty('--fs',pg.fs); if(pg.style) p.classList.add(...pg.style.split(' '));
  const head=pg.head||d.head;
  if(head) p.append(el('header','xtop',`<div class="xtl">${head.l||''}</div><i class="xwave"></i><div class="xtr">${head.r||''}</div>`));
  if(pg.title) p.append(el('h2','xmodel',`<span class="xs">${xArt('smilestars:1,1')}</span><b>${pg.title}</b><span class="xs b">${xArt('smilestars:1,1')}</span>`));
  const flow=el('div','xflow'); p.append(flow);
  let sec=null;
  (pg.blocks||[]).forEach(b=>{
    if(b.t==='section'){ flow.append(el('h3','xsec',`<span class="xpi">${xArt('pencilicon')}</span><span>${b.text}</span>`)); }
    else if(b.t==='art'){ const f=el('div','xfloat '+(b.float||'right')+(b.frame?' frame':'')); f.style.width=(b.w||14)+'em'; f.innerHTML=xArt(b.art,X.base); flow.append(f); }
    else if(b.t==='q') flow.append(xQuestion(b,pi));
  });
  p.append(el('footer','xfoot',`<i class="xwave"></i><span class="xcloud">${xArt('cloudnum:'+(pg.foot||pi+1))}</span>`));
  return p;
}

// ---------- feedback ----------
function xYay(t){   // a small celebration on the right answer
  chime(Math.floor(Math.random()*4)); if(!anim||!t) return;
  const r=t.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  for(let i=0;i<6;i++){ const s=el('div','spark',STAR(true)); s.style.width=s.style.height='1.4rem'; document.body.append(s); const a=Math.PI*2*i/6, d=36+Math.random()*30;
    G.set(s,{left:cx,top:cy,xPercent:-50,yPercent:-50,scale:.2}); G.to(s,{x:Math.cos(a)*d,y:Math.sin(a)*d,scale:.55+Math.random()*.3,rotation:Math.random()*300,duration:.55,ease:'power2.out'}); G.to(s,{opacity:0,duration:.3,delay:.4,onComplete:()=>s.remove()}); }
}
function xWarn(t){   // a warning on the wrong answer: low buzz, a shake and a small red triangle
  tone(170,'square',.06,.2); if(!t) return; if(anim) G.fromTo(t,{x:-6},{x:0,duration:.5,ease:'elastic.out(1.5,.25)'});
  const w=el('span','xwarn','<svg viewBox="0 0 24 24"><path d="M12 3L2 21h20z" fill="#E0412C" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 10v5m0 3v.1" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>');
  const host=t.closest('.xbl,.xo,.xit')||t; host.classList.add('bad'); host.append(w); setTimeout(()=>{ w.remove(); host.classList.remove('bad'); },850);
}
function xAtomDone(Q,a){ a.solved=true; if(Q.atoms.every(x=>x.solved)){ Q.el.classList.add('done'); xFinishCheck(); } }
function xFinishCheck(){ if(X.qs.every(q=>q.atoms.every(a=>a.solved))){ celebrate($('#xTitle')); setTimeout(()=>message(tr('Great!'),'You finished the whole paper!',`<span class="car">${CAR('happy')}</span>`),900); } }

// ---------- a question ----------
function xQuestion(b,pi){
  const Q={el:el('section','xq'),atoms:[],say:b.say,audio:b.audio}; X.qs.push(Q);
  if(b.n!=null) Q.el.append(el('b','xn',b.n+(/^\d+$/.test(b.n)?')':'')));
  const body=el('div','xbody'); Q.el.append(body);
  const t=el('div','xqt'); Q.raw=b.text||''; xInline(Q.raw,Q,t);
  const tools=el('span','xtools',`<button class="xtool xlisten" aria-label="Listen to the question">${SAY_LN}</button><button class="xtool xhelp" aria-label="Help">${ICON.hint}</button>`);
  const lastw=el('span','xlast'), ln=t.lastChild;   // the last word stays together with the icons (they never wrap alone)
  if(ln&&ln.nodeType===3){ const i=ln.data.search(/\S+\s*$/); if(i>0){ lastw.append(document.createTextNode(ln.data.slice(i))); ln.data=ln.data.slice(0,i); } else{ lastw.append(ln); } }
  else if(ln) lastw.append(ln);
  lastw.append(tools); t.append(lastw); body.append(t);
  $('.xlisten',tools).onclick=()=>xSay(Q); $('.xhelp',tools).onclick=()=>xHelp(Q);
  (b.body||[]).forEach(a=>body.append(xAtom(a,Q)));
  return Q.el;
}
// the question as it is spoken: each blank is the sign ⌷ (the voice pack says it like a question waiting for the answer; never the word "blank")
const xSpoken=raw=>String(raw).replace(/\{\{.*?\}\}/g,' ').replace(/\[\[.*?\]\]/g,' ⌷ ').replace(/\.{3,}|_{3,}|…+/g,' ⌷ ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().toLowerCase();
async function xSay(Q){
  vStop(); stopAll(); const run=++X.run;
  const say=Q.say||xSpoken(Q.raw);
  if(Q.audio){ try{ await playFile(new URL(Q.audio,X.base).href); return; }catch(e){ if(isAr()) return; } }
  if(run===X.run) await tts(vpClip(say)?say:say.replace(/⌷/g,', '),isAr()?'ar':'en',.8);   // vocab.js plays it from the paper's voice pack (voice.mp3); only a text missing there falls to the device voice
}
function xHelp(Q){
  const undo=Q.atoms.filter(a=>!a.solved&&a.help).map(a=>a.help()); setTimeout(()=>undo.forEach(u=>u&&u()),2600);
}

// ---------- atoms ----------
function xAtom(a,Q){
  if(typeof a==='string') a={t:'text',text:a};
  const f={text:xTextAtom,mcq:xMcq,link:xLink,fill:xFill,bond:xBond,art:xArtAtom,row:xRow,col:xRow,say:xSayAtom,order:xOrder}[a.t]; const e=f?f(a,Q):el('div');
  if(a.cls) e.classList.add(...a.cls.split(' ')); if(a.float) e.classList.add('xfl-'+a.float); return e;
}
function xTextAtom(a,Q){ const d=el('div','xtext '+(a.style||'')); xInline(a.text,Q,d);
  if(a.listen){ const b=el('button','xwl',SAY_LN); b.setAttribute('aria-label','Listen'); b.onclick=async()=>{ vStop(); stopAll(); await tts(a.listen,'en',.8); }; d.append(b); }   // a small speaker that reads the whole word (the blanks hide its spelling)
  return d; }
// reorder: tap the words one after another to build the sentence; tap a placed word to take it back. {t:"order",words:[..],answer:"Nice to meet you"|[..],end:"."}
function xOrder(a,Q){
  const d=el('div','xorder'), line=el('div','xol'), pool=el('div','xop'), ok=[].concat(a.answer).map(xNorm), end=a.end==null?'.':a.end; d.append(line,pool);
  const chips=a.words.map(w=>{ const b=el('button','xw'); b.textContent=w; return b; }), placed=[];
  const at={solved:false,el:d,help(){ if(at.solved) return null; line.dataset.ghost=[].concat(a.answer)[0]+end; d.classList.add('help'); return ()=>d.classList.remove('help'); }}; Q.atoms.push(at);
  const draw=()=>{ line.innerHTML=''; placed.forEach(c=>line.append(c)); if(end) line.append(el('i','xend',end)); pool.innerHTML=''; chips.filter(c=>!placed.includes(c)).forEach(c=>pool.append(c)); line.classList.toggle('has',placed.length>0); };
  chips.forEach(c=>c.addEventListener('click',()=>{ if(at.solved) return; vStop(); stopAll(); tts(c.textContent,'en',.8);
    if(placed.includes(c)){ placed.splice(placed.indexOf(c),1); draw(); return; }
    placed.push(c); draw();
    if(placed.length===chips.length){ const t=xNorm(placed.map(x=>x.textContent).join(' '));
      if(ok.includes(t)){ at.solved=true; line.classList.add('ok'); xYay(line); xAtomDone(Q,at); }
      else{ xWarn(line); setTimeout(()=>{ placed.length=0; draw(); },800); } } }));
  draw(); return d;
}
// a word to listen to (tap it): its recording, or (English only) the device voice
function xSayAtom(a){ const b=el('button','xsay '+(a.style||''),`<span class="xsw"></span>${SAY_LN}`); $('.xsw',b).textContent=a.text;
  b.onclick=async()=>{ vStop(); stopAll(); if(a.audio){ try{ await playFile(new URL(a.audio,X.base).href); return; }catch(e){} } if(!isAr()) await tts(a.text,'en',.8); }; return b; }

function xArtAtom(a){ const d=el('div','xartbox '+(a.frame?'frame':'')); if(a.w) d.style.width=a.w+'em'; d.innerHTML=xArt(a.art,X.base); return d; }
function xRow(a,Q){ const d=el('div',(a.t==='col'?'xcol ':'xrow ')+(a.style||'')); d.style.setProperty('--cols',a.cols||a.items.length); if(a.gap!=null) d.style.gap=a.gap+'em'; a.items.forEach(i=>d.append(xAtom(i,Q))); return d; }
function xInline(str,Q,host){
  String(str).split(/(\[\[.*?\]\]|\{\{.*?\}\})/).forEach(part=>{ const m=part.match(/^\[\[(.*)\]\]$/), g=part.match(/^\{\{(.*)\}\}$/); if(m) host.append(xBlank(m[1],Q)); else if(g) host.append(el('span','xia',xArt(g[1],X.base))); else if(part){ const s=el('span'); s.innerHTML=part; host.append(...s.childNodes); } });
}
// a blank the child types into. [[answer]] [[a|b]] (alternatives) [[>7]] [[<5]] (any number bigger / smaller); flags after ":" : box, wide, circ, tiny
function xBlank(spec,Q){
  const [ans,fl='']=spec.split(':'), flags=fl.split(',').filter(Boolean), alts=ans.split('|').map(xNorm), rm=alts.length===1&&alts[0].match(/^([<>])(\d+)$/);
  const test=v=>{ v=xNorm(v); if(!v) return false; if(rm){ const n=+v; return /^\d+$/.test(v)&&(rm[1]==='>'?n>+rm[2]:n<+rm[2]); } return alts.includes(v); };
  const show=rm?(rm[1]==='>'?+rm[2]+1:Math.max(0,+rm[2]-1)):ans.split('|')[0], max=Math.max(...alts.map(s=>s.length));
  const w=el('span','xbl '+flags.map(x=>'f-'+x).join(' ')), inp=el('input','xin'), gh=el('i','xgh',show);
  w.style.setProperty('--n',Math.max(2,String(show).length)); inp.type='text'; inp.autocomplete='off'; inp.autocapitalize='none'; inp.spellcheck=false; inp.setAttribute('aria-label','Answer');
  if(/^\d+$|^[<>]\d+$/.test(ans)) inp.inputMode='numeric'; inp.dir=/[\u0600-\u06FF]/.test(ans)?'rtl':'ltr';
  w.append(inp,gh);
  const a={solved:false,el:w,help(){ if(a.solved) return null; w.classList.add('help'); return ()=>w.classList.remove('help'); }}; Q.atoms.push(a);
  let idle=0;
  const win=()=>{ clearTimeout(idle); if(a.solved) return; inp.readOnly=true; inp.tabIndex=-1; w.classList.add('ok'); xYay(w); xAtomDone(Q,a);
    const all=$$('.xbl:not(.ok) .xin',$('#xPages')), nx=all.find(i=>w.compareDocumentPosition(i)&Node.DOCUMENT_POSITION_FOLLOWING); if(nx&&!isIOS()) setTimeout(()=>nx.focus({preventScroll:false}),250); else inp.blur(); };
  const bad=()=>{ clearTimeout(idle); if(a.solved||!inp.value) return; xWarn(w); setTimeout(()=>{ inp.value=''; inp.focus({preventScroll:true}); },800); };
  inp.addEventListener('input',()=>{ clearTimeout(idle); if(!inp.value||a.solved) return; if(test(inp.value)) return win(); if(rm){ if(inp.value.length>=2) idle=setTimeout(bad,900); else idle=setTimeout(bad,1400); } else if(xNorm(inp.value).length>=max) bad(); });
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); test(inp.value)?win():bad(); } });
  return w;
}
const isIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);

// choose: tap the right option(s). opts: text, or {art}; labels: upper (A.) lower (a.) paren ((A)) none; style: box (boxed numbers), ul (underline instead of circle)
function xMcq(a,Q){
  const d=el('div','xmcq '+(a.style||'')+(a.stack?' stack':'')), ans=[].concat(a.answer); d.style.setProperty('--cols',a.cols||(a.stack?1:a.opts.length));
  if(a.lead) d.append(el('span','xlead',a.lead));
  const L=a.labels||'upper', lab=i=>L==='none'?'':L==='lower'?String.fromCharCode(97+i)+'.':L==='paren'?'('+String.fromCharCode(65+i)+')':String.fromCharCode(65+i)+'.';
  let got=0; const bs=[], need=a.any?1:ans.length;
  const at={solved:false,el:d,help(){ const on=ans.filter(i=>!bs[i].classList.contains('ok')); on.forEach(i=>bs[i].classList.add('help')); return ()=>on.forEach(i=>bs[i].classList.remove('help')); }}; Q.atoms.push(at);
  a.opts.forEach((o,i)=>{ const b=el('button','xo',`${lab(i)?`<span class="xl">${lab(i)}</span>`:''}<span class="xv"></span>`); bs.push(b); const v=$('.xv',b);
    if(o&&o.art){ v.innerHTML=xArt(o.art,X.base); if(o.h) v.style.setProperty('--ah',o.h+'em'); } else v.innerHTML=o; d.append(b);
    b.addEventListener('click',()=>{ if(at.solved||b.classList.contains('ok')) return;
      if(ans.includes(i)){ b.classList.add('ok'); xYay(b); if(++got>=need) xAtomDone(Q,at); } else xWarn(b); }); });
  if(a.pre){ Q.atoms.pop(); bs[ans[0]].classList.add('ok'); d.classList.add('pre'); }   // the worked example: already done
  return d;
}

// colour: tap circles until there are n coloured ones. {t:"fill",n:4,total:10,cols:5}
function xFill(a,Q){
  const d=el('div','xfill'); d.style.setProperty('--cols',a.cols||5); if(a.size) d.style.setProperty('--cs',a.size+'em'); let on=0; const cs=[];
  const at={solved:false,el:d,help(){ const off=cs.filter(c=>!c.classList.contains('on')).slice(0,a.n-on); off.forEach(c=>c.classList.add('help')); return ()=>off.forEach(c=>c.classList.remove('help')); }}; Q.atoms.push(at);
  for(let i=0;i<(a.total||10);i++){ const c=el('button','xc'); cs.push(c); d.append(c);
    c.addEventListener('click',()=>{ if(at.solved) return; if(c.classList.contains('on')){ c.classList.remove('on'); on--; return; }
      if(on>=a.n){ xWarn(c); return; } c.classList.add('on'); on++; if(on===a.n){ xYay(d); d.classList.add('ok'); xAtomDone(Q,at); } }); }
  return d;
}

// number tree: {t:"bond",top:"6",l:"[[2]]",r:"4"} (each box takes text or a blank)
function xBond(a,Q){
  const d=el('div','xbond'); d.innerHTML='<svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path d="M50 24L22 37M50 24L78 37" fill="none" vector-effect="non-scaling-stroke"/></svg>';
  [['top',a.top],['l',a.l],['r',a.r]].forEach(([k,v])=>{ const b=el('div','xbox '+k); xInline(v,Q,b); d.append(b); }); return d;
}

// match: {t:"link",dir:"v"|"h",a:[items],b:[items],pairs:[[0,1],..]}  items: text or {art}. Drag a line, or tap one then the other.
function xLink(a,Q){
  const d=el('div','xlink '+(a.dir==='h'?'h':'v')), A=el('div','xla'), B=el('div','xlb'); d.append(A,B,el('div','xlsvg'));
  const mk=(list,side,host)=>list.forEach((o,i)=>{ const e=el('button','xit',''); e.dataset.side=side; e.dataset.i=i; if(o&&o.art){ e.innerHTML=xArt(o.art,X.base); if(o.w) e.style.setProperty('--aw',o.w+'em'); } else e.innerHTML=o; host.append(e); });
  mk(a.a,'a',A); mk(a.b,'b',B); if((a.pre||[]).length) $$('.xit',d).forEach(e=>{ if(a.pre.some(p=>(e.dataset.side==='a'?p[0]:p[1])===+e.dataset.i)) e.classList.add('pre'); });
  if(a.circ) d.classList.add('circ'); const L={d,pairs:a.pairs,links:(a.pre||[]).map(p=>({i:p[0],j:p[1],ok:true})),sel:null,drag:null}; X.links.push(L); const need=a.pairs.length;
  const at={solved:L.links.length>=a.pairs.length,el:d,help(){ L.ghost=a.pairs.filter(p=>!L.links.some(l=>l.i===p[0]&&l.j===p[1])); xDrawLinks(L); return ()=>{ L.ghost=null; xDrawLinks(L); }; }}; if(!at.solved) Q.atoms.push(at);
  const ptOf=e=>e&&e.closest('.xit'), pt=(e,ev)=>{ const r=d.getBoundingClientRect(); return [ev.clientX-r.left,ev.clientY-r.top]; };
  const tryPair=(x,y)=>{ const [ea,eb]=x.dataset.side==='a'?[x,y]:[y,x], i=+ea.dataset.i, j=+eb.dataset.i;
    if(L.links.some(l=>l.i===i||l.j===j)){ xWarn(x); return; }
    if(a.pairs.some(p=>p[0]===i&&p[1]===j)){ L.links.push({i,j,ok:true}); xDrawLinks(L); xYay(eb); if(L.links.length>=need) xAtomDone(Q,at); }
    else{ const bad={i,j,ok:false}; L.links.push(bad); xDrawLinks(L); xWarn(eb); setTimeout(()=>{ L.links=L.links.filter(l=>l!==bad); xDrawLinks(L); },800); } };
  d.addEventListener('pointerdown',e=>{ const p=ptOf(e.target); if(!p||at.solved) return; L.drag={from:p,x:e.clientX,y:e.clientY,moved:false}; d.setPointerCapture&&d.setPointerCapture(e.pointerId); e.preventDefault(); });
  d.addEventListener('pointermove',e=>{ if(!L.drag) return; if(Math.hypot(e.clientX-L.drag.x,e.clientY-L.drag.y)>6) L.drag.moved=true; if(L.drag.moved){ L.rub=pt(d,e); xDrawLinks(L); } });
  const end=e=>{ if(!L.drag) return; const f=L.drag.from, moved=L.drag.moved; L.drag=null; L.rub=null;
    const t=ptOf(document.elementFromPoint(e.clientX,e.clientY)); const ok=t&&d.contains(t)&&t.dataset.side!==f.dataset.side;
    if(moved){ if(ok) tryPair(f,t); L.sel=null; }
    else if(L.sel&&L.sel!==f&&L.sel.dataset.side!==f.dataset.side){ tryPair(L.sel,f); L.sel=null; } else L.sel=L.sel===f?null:f;
    $$('.xit',d).forEach(x=>x.classList.toggle('sel',x===L.sel)); xDrawLinks(L); };
  d.addEventListener('pointerup',end); d.addEventListener('pointercancel',()=>{ L.drag=null; L.rub=null; xDrawLinks(L); });
  return d;
}
function xDrawLinks(L){
  const d=L.d, svg=$('.xlsvg',d), r=d.getBoundingClientRect(), h=d.classList.contains('h'); if(!r.width) return;
  const anchor=(e)=>{ const q=e.getBoundingClientRect(), a=e.dataset.side==='a'; return h?[(a?q.right:q.left)-r.left,q.top+q.height/2-r.top]:[q.left+q.width/2-r.left,(a?q.bottom:q.top)-r.top]; };
  const items=$$('.xit',d), P=(s,i)=>anchor(items.find(e=>e.dataset.side===s&&+e.dataset.i===i));
  let s=''; items.forEach(e=>{ const [x,y]=anchor(e); s+=`<circle cx="${x}" cy="${y}" r="${r.width*.008+2}" class="xdot"/>`; });
  const line=(p,q,c)=>`<path d="M${p[0]},${p[1]}L${q[0]},${q[1]}" class="${c}"/>`;
  (L.ghost||[]).forEach(p=>s+=line(P('a',p[0]),P('b',p[1]),'xlg'));
  L.links.forEach(l=>s+=line(P('a',l.i),P('b',l.j),l.ok?'xlok':'xlbad'));
  if(L.rub&&L.drag){ const f=anchor(L.drag.from); s+=line(f,L.rub,'xlrub'); }
  svg.innerHTML=`<svg viewBox="0 0 ${r.width} ${r.height}" width="${r.width}" height="${r.height}">${s}</svg>`;
}

// ---------- screen fit ----------
function xTabLabel(p){ const t=p.tab||p.chip||p.title||'', m=String(t).match(/[0-9\u0660-\u0669]+\s*$/); return p.tab||(m?m[0].trim():t); }
function xShow(gi,first){   // only the pages of assessment gi are on screen; the others wait behind their buttons
  X.cur=gi; const on=X.groups[gi].pages; X.pages.forEach((p,i)=>p.hidden=!on.includes(i));
  $$('.xchip').forEach((b,i)=>b.classList.toggle('on',i===gi));
  if(!first){ stopAll(); vStop(); xFit(); $('#xScroll').scrollTop=0; }
}
function xFit(){
  const sc=$('#xScroll'); if(!sc||$('#exam').hidden) return; const rem=parseFloat(getComputedStyle(document.documentElement).fontSize)||16,
    cw=sc.clientWidth-rem*.5, ch=sc.clientHeight-rem*.5, ratio=(X.d&&X.d.ratio)||.707, portrait=matchMedia('(max-aspect-ratio:1/1)').matches;
  const w=portrait?Math.min(cw,ch*ratio):cw;
  sc.classList.toggle('portrait',portrait); X.pages.forEach(p=>{ p.style.setProperty('--pw',w+'px'); p.style.setProperty('--ph',w/ratio+'px'); });
  X.pages.filter(p=>!p.hidden).forEach(xFitPage); X.links.forEach(xDrawLinks);
}
// a sheet's text can be a little too long for its page on some screens (the smallest sizes of text and icons do not shrink): make the questions' text smaller until all fits
function xFitPage(p){
  const base=+(X.d.pages[+p.dataset.i].fs||1), fl=$('.xflow',p), ft=$('.xfoot',p); let fs=base; p.style.setProperty('--fs',fs);
  for(let k=0;k<6;k++){ const last=fl.lastElementChild; if(!last) break; const top=fl.getBoundingClientRect().top, need=last.getBoundingClientRect().bottom-top, have=ft.getBoundingClientRect().top-top-2;
    if(need<=have||fs<=.72) break; fs=Math.max(.72,fs*Math.max(.7,have/need)*.99); p.style.setProperty('--fs',fs); }
}
addEventListener('resize',()=>{ clearTimeout(xFit.t); xFit.t=setTimeout(xFit,120); });
