/* PUZZLE BOARD — the ONE merge-the-pieces engine (Easy Study's puzzle question and Easy Words' practice puzzle both use it; only the data and the hooks differ).
   A word frame with faint empty pieces on top, the loose pieces lie scattered below. The child drags each piece to ITS place (it snaps; a wrong place goes back),
   tapping a piece says it. When all are placed the pieces disappear, the whole word shows in the frame (written joined) and is said as ONE clip.
   puzzleBoard(box, o): o = {pieces:[text, FIRST piece = the first read], word, rtl (default true: first piece rightmost), say(i) -> promise (a piece's sound),
   whole() -> promise (the whole word's sound), alive() -> false when the question is gone, done() (everything finished, e.g. the star)} */
const PZ_COL=[['#8CCB3C','#5E9A1E'],['#F27CA8','#C4467A']];
function puzzlePieceSvg(i,n,ghost,rtl){ const c=PZ_COL[i%2], knob=i<n-1, sock=i>0;   // the knob goes toward the NEXT piece, the socket takes the previous piece's knob; a left-to-right word mirrors the shape
  const d='M0,0 H100 V'+(sock?'35 a15,15 0 0,0 0,30 V':'')+'100 H0 V'+(knob?'65 a15,15 0 1,1 0,-30 V':'')+'0 Z';
  return `<svg viewBox="0 0 100 100" style="overflow:visible${rtl?'':';transform:scaleX(-1)'}" aria-hidden="true"><path d="${d}" fill="${ghost?'rgba(255,255,255,.16)':c[0]}" stroke="${ghost?'rgba(255,255,255,.7)':c[1]}" stroke-width="${ghost?3:4}" ${ghost?'stroke-dasharray="7 6"':''} stroke-linejoin="round"/></svg>`; }
function puzzleBoard(box,o){
  const rtl=o.rtl!==false, n=o.pieces.length, bd=el('div','qxpb'), slot=el('div','qxpslot'); bd.dataset.noswipe=1; bd.dir=rtl?'rtl':'ltr'; bd.style.direction='ltr'; box.append(bd); bd.append(slot);
  const ghosts=o.pieces.map((t,i)=>{ const g=el('div','qxpg',puzzlePieceSvg(i,n,1,rtl)); slot.append(g); return g; });
  const wordEl=el('b','qxpword',o.word); wordEl.style.direction=rtl?'rtl':'ltr'; slot.append(wordEl);
  const P=o.pieces.map((t,i)=>{ const e=el('div','qxpp'+(rtl?'':' ltr'),puzzlePieceSvg(i,n,0,rtl)+`<b>${t}</b>`); e.style.setProperty('--fs',Math.min(.5,1.6/Math.max(1,t.replace(/[\u064B-\u065F\u0670]/g,'').length)).toFixed(3)); bd.append(e); return {e,i,x:0,y:0,tx:0,ty:0,in:false}; });
  let pw=0,done=false; const put=p=>{ p.e.style.transform=`translate(${p.x}px,${p.y}px)`; };
  const layout=()=>{ const W=bd.clientWidth,H=bd.clientHeight; if(!W||!H||done) return; pw=Math.max(40,Math.min(W/(n+.5),H*.38,170)); bd.style.setProperty('--pw',pw+'px');
    const sw=n*pw, sh=pw, sl=(W-sw)/2, st=H*.03; Object.assign(slot.style,{left:sl+'px',top:st+'px',width:sw+'px',height:sh+'px'});
    P.forEach(p=>{ p.tx=sl+(rtl?n-1-p.i:p.i)*pw; p.ty=st; const g=ghosts[p.i]; g.style.cssText=`left:${p.tx-sl}px;top:${p.ty-st}px;width:${pw}px;height:${pw}px`; });
    const order=P.map((_,i)=>i).sort((a,b)=>((a*7+3)%5)-((b*7+3)%5)); if(n>1&&order.every((v,i)=>v===i)) order.reverse();
    const y0=st+sh+pw*.35, y1=Math.max(y0,H-pw*1.1);
    P.forEach(p=>{ const k=order.indexOf(p.i); if(p.in){ p.x=p.tx; p.y=p.ty; } else { p.x=(W-pw*1.2)*(n>1?k/(n-1):.5)+pw*.1; p.y=y0+(y1-y0)*(k%2?.9:.15); } put(p); }); };
  const say=i=>o.say?o.say(i):Promise.resolve();
  async function finish(last){ if(done) return; done=true; try{ await Promise.race([Promise.resolve(last),new Promise(r=>setTimeout(r,2500))]); }catch(e){}   // the last piece's sound ends first, then the WHOLE word is said as one clip
    if(!o.alive()) return; P.forEach(p=>p.e.classList.add('gone')); slot.classList.add('got'); await new Promise(r=>setTimeout(r,400)); if(!o.alive()) return; try{ await (o.whole&&o.whole()); }catch(e){} if(!o.alive()) return; if(o.done) o.done(); }
  P.forEach(p=>{ let sx,sy,x0,y0,moved=false,on=false;
    p.e.addEventListener('pointerdown',ev=>{ if(done) return; ev.preventDefault(); ev.stopPropagation(); p.e.setPointerCapture(ev.pointerId); sx=ev.clientX; sy=ev.clientY; x0=p.x; y0=p.y; moved=false; on=!p.in; if(on) p.e.classList.add('drag'); });
    p.e.addEventListener('pointermove',ev=>{ if(!on) return; const dx=ev.clientX-sx,dy=ev.clientY-sy; if(!moved&&Math.hypot(dx,dy)<6) return; moved=true; p.x=Math.min(Math.max(0,x0+dx),bd.clientWidth-pw); p.y=Math.min(Math.max(0,y0+dy),bd.clientHeight-pw); put(p); });
    const up=ev=>{ ev.stopPropagation(); p.e.classList.remove('drag'); if(!moved){ if(!done) say(p.i); on=false; return; } if(!on) return; on=false;
      if(Math.hypot(p.x-p.tx,p.y-p.ty)<pw*.85){ p.in=true; p.x=p.tx; p.y=p.ty; p.e.classList.add('in'); put(p); const sp=say(p.i); if(P.every(z=>z.in)) finish(sp); } else if(o.wrong) o.wrong(p.e); };
    p.e.addEventListener('pointerup',up); p.e.addEventListener('pointercancel',up); });
  box._after=()=>layout(); requestAnimationFrame(layout); new ResizeObserver(layout).observe(bd);
  return {board:bd,slot,pieces:P};
}
