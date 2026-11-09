/* NAHW — ONE template for the animated grammar (النحو) lessons of the Arabic subject (layout "nahw"). Not a video: the app draws and moves it, so a lesson is DATA only.
   lesson.json: "layout":"nahw", "pages" = number of steps (the app's dots), "nahw":{ "steps":[ step ] }  — each step = one page, plays by itself, then goes on.
   step = { name, text, board, pic?, beats:[ {words:[from,to], audio?, ms?, do:[actions]} ] }
     text   the rule sentence as the book/teacher wrote it (always shown whole, big; the words of the beat being said light up, later ones are faded)
     board  {kind:"tiles", cells:[{id, b:"ص", m:"َ"}]}      each letter in its own tile (b = the letter, m = its mark)      OR
            {kind:"word",  cells:[{id, t:"حِ"}]}             a whole written word, letters joined (spans never change shape, only colour)
     pic    {src, w?}  a picture shown above the board (e.g. the horse)
   Actions (in a beat, all start together; after:ms on any action = start later):
     {add:[ids], from:"right"|"top"|"pop"}   tiles / word letters appear one after the other
     {lit:id, color}  {unlit:id}              the letter is coloured   (colours: blue, green, red, orange)
     {tag:id, text, color, up?}   (up:true = above the letter, else under it)  {untag:id|"all"}   a label under the letter ("حرف المد")
     {pulse:id}                               the letter / its mark bounces
     {sukoon:id}                              a sukoon mark tries to sit on the letter; it is refused (red ✕) and goes away
     {pic:true}                               the picture pops in
   audio = file under the lesson folder (an Arabic recording not made yet is silent: the beat takes the time it needs: ms, else 380 ms per word).
   Star (award 'read') when every page was played. */
(function(){
'use strict';
const STOP={stop:1};
const COL={blue:'#2E8FEA',green:'#3A9A2C',red:'#E8443A',orange:'#FF8A1F'};
const col=c=>COL[c]||c||COL.blue;
const hel=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
const an=(e,kf,o)=>{ try{ return e.animate(kf,{duration:450,easing:'ease',fill:'both',...o}).finished.catch(()=>{}); }catch(x){ return Promise.resolve(); } };
const BOUNCE='cubic-bezier(.3,1.5,.5,1)';

function mount(root,data,opt){
  opt=opt||{}; const base=opt.base||''; let gen=0;
  root.classList.add('nh'); root.innerHTML='';
  const board=hel('div','nh-board'), cap=hel('div','nh-cap'), capT=hel('p','nh-capt'); capT.dir='rtl'; cap.append(capT);
  root.append(board,cap);
  const live=g=>{ if(g!==gen||!root.isConnected) throw STOP; };
  const wait=(ms,g)=>new Promise(r=>setTimeout(r,ms)).then(()=>live(g));
  const say=async(a,g)=>{ if(!a||!opt.play) return; try{ await opt.play(base+a); }catch(e){} live(g); };

  async function beat(S,B,ctx,g){
    const words=ctx.words; const [w0,w1]=B.words||[0,words.length];
    words.forEach((w,k)=>{ w.classList.toggle('now',k>=w0&&k<w1); w.classList.toggle('past',k<w0); w.classList.toggle('next',k>=w1); });
    const est=B.ms||Math.max(900,(w1-w0)*380);
    const jobs=[ say(B.audio,g), wait(est,g) ];
    for(const a of (B.do||[])) jobs.push(act(a,ctx,g));
    await Promise.all(jobs); live(g); await wait(300,g);
  }
  const cell=(ctx,id)=>ctx.cells[id];
  const rectIn=e=>({x:e.offsetLeft,y:e.offsetTop,w:e.offsetWidth,h:e.offsetHeight});   // layout position (not the moving one): the board is the offset parent
  async function act(a,ctx,g){
    if(a.after) await wait(a.after,g);
    if(a.add){ for(const id of a.add){ const c=cell(ctx,id); if(!c) continue; c.classList.remove('hid');
        const from=a.from||'pop', kf=from==='right'?[{opacity:0,transform:'translateX(55cqw) scale(.8)'},{opacity:1,transform:'none'}]:from==='top'?[{opacity:0,transform:'translateY(-30cqh)'},{opacity:1,transform:'none'}]:[{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1)'}];
        if(ctx.kind==='word'){ c.style.opacity=1; await wait(260,g); } else await an(c,kf,{duration:650,easing:BOUNCE}); live(g); } return; }
    if(a.lit){ const c=cell(ctx,a.lit); if(c){ c.style.setProperty('--xc',col(a.color)); c.classList.add('lit'); } return; }
    if(a.unlit){ const c=cell(ctx,a.unlit); if(c) c.classList.remove('lit'); return; }
    if(a.tag){ const c=cell(ctx,a.tag); if(!c) return; const r=rectIn(c), t=hel('div','nh-tag'); t.textContent=a.text; t.style.setProperty('--xc',col(a.color)); t.dataset.for=a.tag;
      t.style.left=(r.x+r.w/2)+'px'; if(a.up){ t.classList.add('up'); t.style.top=r.y+'px'; } else t.style.top=(r.y+r.h)+'px'; ctx.board.append(t); ctx.tags.push(t);
      await an(t,[{opacity:0,transform:'translate(-50%,var(--ty,0%)) scale(.6)'},{opacity:1,transform:'translate(-50%,var(--ty,0%)) scale(1)'}],{duration:450,easing:BOUNCE}); return; }
    if(a.untag){ ctx.tags=ctx.tags.filter(t=>{ if(a.untag==='all'||t.dataset.for===a.untag){ t.remove(); return false; } return true; }); return; }
    if(a.pulse){ const c=cell(ctx,a.pulse); if(c) await an(c,[{transform:'scale(1)'},{transform:'scale(1.25)'},{transform:'scale(1)'}],{duration:500,easing:BOUNCE}); return; }
    if(a.pic){ if(ctx.pic){ ctx.pic.classList.remove('hid'); await an(ctx.pic,[{opacity:0,transform:'scale(.6)'},{opacity:1,transform:'scale(1)'}],{duration:600,easing:BOUNCE}); } return; }
    if(a.sukoon){ const c=cell(ctx,a.sukoon); if(!c) return; const r=rectIn(c), s=hel('div','nh-suk'), x=hel('div','nh-x','✕');
      s.style.left=(r.x+r.w/2)+'px'; s.style.top=(r.y-r.h*.15)+'px'; x.style.left=(r.x+r.w/2)+'px'; x.style.top=(r.y+r.h/2)+'px'; ctx.board.append(s,x); x.style.opacity=0;
      await an(s,[{opacity:0,transform:'translate(-50%,-90%) scale(.5)'},{opacity:1,transform:'translate(-50%,-60%) scale(1)'}],{duration:450}); live(g);
      await an(s,[{transform:'translate(-50%,-60%)'},{transform:'translate(-50%,10%)'},{transform:'translate(-50%,-60%)'}],{duration:450,easing:'ease-in-out'}); live(g);
      await Promise.all([an(x,[{opacity:0,transform:'translate(-50%,-50%) scale(.3)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)'}],{duration:350,easing:BOUNCE}),an(c,[{transform:'translateX(0)'},{transform:'translateX(-.5rem)'},{transform:'translateX(.5rem)'},{transform:'translateX(-.35rem)'},{transform:'none'}],{duration:450})]); live(g);
      await wait(550,g); await Promise.all([an(s,[{opacity:1},{opacity:0,transform:'translate(-50%,-140%)'}],{duration:400}),an(x,[{opacity:1},{opacity:0}],{duration:400})]); s.remove(); x.remove(); return; }
  }

  async function play(i,done){
    const g=++gen, S=data.steps[i]; board.innerHTML=''; capT.textContent='';
    const ctx={kind:S.board.kind,cells:{},tags:[],words:[],board};
    // the picture (optional)
    if(S.pic){ const p=hel('img','nh-pic hid'); p.alt=''; p.draggable=false; p.src=new URL(base+S.pic.src,location.href).href; board.append(p); ctx.pic=p; }
    // the letters
    const row=hel('div','nh-row '+S.board.kind); board.append(row);
    S.board.cells.forEach(c=>{ let e;
      if(S.board.kind==='tiles'){ e=hel('div','nh-tile hid'); const b=hel('span','nh-b'); b.textContent=c.b; e.append(b); if(c.m){ const m=hel('span','nh-m'); m.textContent=c.m; b.append(m); } }
      else { e=hel('span','nh-wl'); e.textContent=c.t; e.style.opacity=0; }
      if(c.id) ctx.cells[c.id]=e; row.append(e); });
    // the sentence, word by word
    String(S.text).split(/\s+/).forEach((w,k,all)=>{ const s=hel('span','nh-w next'); s.textContent=w; capT.append(s); if(k<all.length-1) capT.append(' '); ctx.words.push(s); });
    try{
      await wait(300,g);
      for(const B of S.beats) await beat(S,B,ctx,g);
      ctx.words.forEach(w=>{ w.classList.remove('past','next'); w.classList.add('now'); });
      live(g); if(done) done(i);
    }catch(e){ if(e!==STOP) console.error(e); }
  }
  return { play:i=>play(i,opt.onDone), stop:()=>{ ++gen; if(opt.stop) opt.stop(); if(opt.onState) opt.onState(false); } , onPlayState:null };
}
window.Nahw={mount};

/* the Lesson tab of a "nahw" lesson (LT.nahw in lesson.js) — same shell as the explainer: Read/Stop + Restart on the rail, the car moves page by page, auto-advances */
const np_done={};
window.showNahw=function(){
  $('#lesson').classList.remove('story');
  const host=el('div','scene xhost nhhost'); stage.append(host);
  const i=rd.page-1, np=nPages(), done=np_done[LESSON.id]=np_done[LESSON.id]||{}; let playing=false;
  const rail=on=>{ playing=on; if(!host.isConnected||tab!=='read') return; setRail([
      on?{kind:'stop',icon:'stop',label:tr('Stop'),click:()=>{ rd.auto=false; x.stop(); rail(false); }}:{kind:'go',icon:'play',label:tr('Read'),click:()=>{ rd.auto=true; go(rd.page-1); }},
      {kind:'again',icon:'restart',label:tr('Restart'),click:()=>{ rd.auto=true; go(rd.page-1); }}]); };
  if(typeof vStop==='function') vStop();
  const x=Nahw.mount(host,LESSON.nahw,{base:LESSON.base,play:u=>{ if(typeof vStop==='function') vStop(); return playFile(u); },stop:()=>{ if(typeof vStop==='function') vStop(); },
    onDone:k=>{ rail(false); done[k]=1; carFrac((k+1)/np); if(Object.keys(done).length>=np) award(LESSON.id,'read');
      if(rd.auto!==false&&rd.page<np) rd.autoT=setTimeout(()=>{ if(tab==='read'&&host.isConnected) readGo(1,true); },900); }});
  const go=k=>{ rail(true); carFrac(k/np); x.play(k); };
  window.nahwStop=()=>{ try{ x.stop(); }catch(e){} };
  carFrac(i/np); rail(false); if(typeof bookTag==='function') bookTag();
  rd.auto=true; go(i);
};
})();
