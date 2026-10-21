/* TOOLS — helper sheets the school sends (yellow round markers on the map), shown as one interactive slide in a popup.
   Today: "make-numbers" (Math). Subject.json: a lesson gets "tools":[{"id":"make-numbers","label":"Tool","title":"Make numbers"}] for the map marker,
   and a lesson gets "tool":"make-numbers","toolN":5 for the small arcs button beside Home/Map (opens the same slide over the lesson, X closes it).
   Sounds: data/tools/make-numbers/<one>-and-<four>-make-<five>.mp3 (both orders). */
const TW='zero one two three four five six seven eight nine ten'.split(), TCOL=['#E0412C','#2A7FD8','#2FA8A0','#D8396B','#F08A2C','#2A7FD8','#3FA34D','#8A5CC9','#E0412C','#2FA8A0','#2A7FD8'];
document.addEventListener('click',e=>{ if(e.target.closest('.qtool')) toolOpen(LESSON&&LESSON.toolN); });
const ARC=['#E0412C','#2A7FD8','#3FA34D','#F2B01E','#8A5CC9','#D8396B'];
const tl={n:5,on:{},run:0};
function arcPath(a,b,T){ const x=i=>i*100+50, dist=Math.abs(b-a), h=6+Math.max(70,dist/T*270)*1.33;
  return dist?`M${x(a)} 6C${x(a)} ${h} ${x(b)} ${h} ${x(b)} 6`:`M${x(a)-26} 6C${x(a)-26} 96 ${x(a)+26} 96 ${x(a)+26} 6`; }
function arcAdd(svg,a,b,T,cls){ const p=document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('d',arcPath(a,b,T)); p.setAttribute('class','tlarc '+cls); p.style.stroke=ARC[Math.min(a,b)%ARC.length]; svg.append(p); }
const tlSound=(a,b)=>`data/tools/make-numbers/${TW[a]}-and-${TW[b]}-make-${TW[a+b]}.mp3`;
function toolOpen(n){
  tl.n=null; tl.on={}; let o=$('#toolPop');
  if(!o){ o=el('div','overlay toolpop'); o.id='toolPop'; o.innerHTML=`<div class="tlcard" role="dialog" aria-label="Make numbers"><button class="rb tlx" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="tlbody"></div></div>`;
    document.body.append(o); o.addEventListener('click',e=>{ if(e.target===o) toolClose(); }); $('.tlx',o).addEventListener('click',toolClose);
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!o.hidden) toolClose(); }); }
  o.hidden=false; toolDraw(); if(anim) G.from($('.tlcard',o),{scale:.85,opacity:0,duration:.3,ease:'back.out(1.6)',clearProps:'transform,opacity'});
}
function toolClose(){ const o=$('#toolPop'); if(o) o.hidden=true; tl.run++; vStop(); }
function toolDraw(){
  const T=tl.n, body=$('#toolPop .tlbody'), N=T==null?0:T; tl.on={};
  const rows=[]; for(let a=0;a<=N-a;a++) rows.push(a);
  body.innerHTML=`<h2 class="tlh outline">Make</h2><svg class="tlarr" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 3v34M7 26l13 15 13-15"/></svg><div class="tltgt">${[5,6,7,8,9,10].map(k=>`<button class="tlt${k===T?' on':''}" data-n="${k}" style="--c:${TCOL[k]}"><b>${k}</b></button>`).join('')}</div>
    <div class="tlrow" style="--n:${T==null?6:T+1}">${T==null?'':Array.from({length:T+1},(_,i)=>`<button class="tld" data-i="${i}" style="--c:${TCOL[i]}"><b>${i}</b></button>`).join('')}</div>
    <svg class="tlarcs" viewBox="0 0 ${(N+1)*100} 300" preserveAspectRatio="none" aria-hidden="true"></svg>
    <div class="tllist">${rows.map(a=>`<button class="tls" data-a="${a}"><b style="color:${TCOL[a]}">${a}</b> <i>and</i> <b style="color:${TCOL[T-a]}">${T-a}</b> <i>make</i> <b class="m">${T}</b></button>`).join('')}</div>`;
  if(T!=null){ const sv=$('.tlarcs',body); for(let a=0;a<=T-a;a++) arcAdd(sv,a,T-a,T,'ghost'); }
  $$('.tlt',body).forEach(b=>b.addEventListener('click',()=>{ tl.n=+b.dataset.n; vStop(); tl.run++; toolDraw(); if(anim) G.from($('.tlrow',body),{opacity:0,y:-10,duration:.25,clearProps:'all'}); }));
  $$('.tld',body).forEach(b=>b.addEventListener('click',()=>toolPick(+b.dataset.i)));
  $$('.tls',body).forEach(b=>b.addEventListener('click',()=>toolPick(+b.dataset.a)));
}
async function toolPick(a){
  const T=tl.n, b=T-a, lo=Math.min(a,b), body=$('#toolPop .tlbody'), svg=$('.tlarcs',body); vStop(); const run=++tl.run;
  $$('.tld',body).forEach(d=>d.classList.toggle('now',+d.dataset.i===a||+d.dataset.i===b));
  $$('.tlarc.on',svg).forEach(q=>q.remove()); $$('.tls',body).forEach(r=>r.classList.remove('on','pop'));
  arcAdd(svg,a,b,T,'on'+(anim?' draw':''));
  const row=$(`.tls[data-a="${lo}"]`,body); row.classList.add('on'); void row.offsetWidth; row.classList.add('pop');
  try{ await playFile(tlSound(a,b)); }catch(e){}
}
