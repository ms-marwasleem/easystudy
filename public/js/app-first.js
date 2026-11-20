const APP_BUILD='7dfb88e296';
/* MADE BY tools/build-app.py from the files named below. Do not edit here: edit those files, then run the script again. */
/* ===== js/core.js ===== */
// Arabic-Indic (٠-٩) and Eastern Persian (۰-۹) digits typed anywhere count as Western digits: one helper, applied to every text box before any answer check
const DIG_RE=/[\u0660-\u0669\u06F0-\u06F9]/g, normDigits=s=>String(s==null?'':s).replace(DIG_RE,d=>{ const c=d.charCodeAt(0); return String(c>=0x6F0?c-0x6F0:c-0x660); });
document.addEventListener('input',e=>{ const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA')&&DIG_RE.test(t.value)){ DIG_RE.lastIndex=0; const p=t.selectionStart; t.value=normDigits(t.value); try{ t.setSelectionRange(p,p); }catch(_){} } DIG_RE.lastIndex=0; },true);
/* CORE — shared helpers for every screen: drawings, sounds, motion, hints, popups, stars, navigation state.
   index.html loads js/app-first.js (core, lib, subjects, start) then js/app-rest.js; both made by tools/build-app.py from these files.
   Colours/sizes live in css/, words a child reads live in data/ — neither needs a change here. */
const G = window.gsap || null;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const anim = !!G && !calm;
const OL = 'var(--ol)';   // outline colour (theme.css --ol) for the SVG drawings
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const el = (tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e};
/* Fetch + decode pictures ahead of time so they show whole at once, not strip by strip. Kept in _pre so the browser cache holds them.
   Only the newest 80 are kept: before, every picture of every lesson opened stayed in memory, and the iPad, short of memory, threw
   pictures (or the whole page) away and drew them again piece by piece. A picture asked again is moved to the end, not doubled. */
const _pre=[], PRE_MAX=80; function preloadImgs(list){ [...new Set((list||[]).filter(Boolean))].forEach(u=>{ if(!/\.(jpe?g|png|webp)$/i.test(u)) return;
  const k=_pre.findIndex(x=>x._u===u); if(k>=0){ _pre.push(_pre.splice(k,1)[0]); return; }
  const i=new Image(); i.decoding='async'; i._u=u; i.src=u; _pre.push(i); if(i.decode) i.decode().catch(()=>{}); });
  if(_pre.length>PRE_MAX) _pre.splice(0,_pre.length-PRE_MAX); }
/* COUNT PICTURE — ONE component for every subject (Marwa 2026-11-06): the library keeps ONE unit picture (one banana, one bee) and
   never one picture per count. Data writes the unit + the count after "#": "../../pics/banana-single.png#5". Every json goes through
   get(), so cpicFill draws the unit n times (rows of up to 5, the last row centred) into ONE transparent picture and puts it in the
   string's place (marked data:image/png;cpic=1 so css/frame.css shows it as a cut-out, no frame): every screen (count, choose, link, pick, yes/no, lesson pages, exams) shows it like any other picture. */
const CPIC_RE=/\.(png|jpe?g|webp)#(\d+)([nf]*)$/i, _cpic={};   /* flags after the count: n = the number written above, f = faded (an "inactive" picture = the SAME library picture at low opacity, Ahmed 2026-11-19: no separate off pictures) */
const cpicCols=n=>n<=4?n:Math.min(5,Math.ceil(n/2));
/* NUMBER CARD: "#6n" = the same repeated unit with the digit 6 written big above it (transparent, no card), for any lesson that teaches a number (English OL u5l3). */
const CPIC_COL={6:'#ffffff',7:'#ffe27a',8:'#ffb36b',9:'#9fe3ff',10:'#c9f7a5'};
function cpicMake(src,n,fl){ fl=fl===true?'n':(fl||''); const dig=/n/.test(fl), fad=/f/.test(fl), k=src+'#'+n+fl; if(_cpic[k]) return _cpic[k];
  return _cpic[k]=new Promise(ok=>{ const im=new Image(); im.onload=async()=>{ const s=Math.min(1,260/Math.max(im.naturalWidth,im.naturalHeight)), w=Math.round(im.naturalWidth*s), h=Math.round(im.naturalHeight*s), g=Math.round(Math.max(w,h)*.12), cols=cpicCols(n), rows=Math.ceil(n/cols), c=document.createElement('canvas');
    const gw=cols*w+(cols-1)*g, gh=rows*h+(rows-1)*g, th=dig?Math.round(h*1.25):0; c.width=Math.max(gw,dig?Math.round(th*1.1):0); c.height=gh+th+(dig?g:0); const x=c.getContext('2d'), ox=(c.width-gw)/2, oy=th+(dig?g:0);
    if(dig){ try{ await document.fonts.ready; }catch(e){} x.font='700 '+Math.round(th*.8)+'px '+(getComputedStyle(document.body).fontFamily||'sans-serif'); x.textAlign='center'; x.textBaseline='middle'; x.lineJoin='round'; x.lineWidth=Math.round(th*.14); x.strokeStyle='#6b2d12'; x.strokeText(String(n),c.width/2,th/2); x.fillStyle=CPIC_COL[n]||'#fff'; x.fillText(String(n),c.width/2,th/2); }
    for(let i=0;i<n;i++){ const r=Math.floor(i/cols), inRow=Math.min(cols,n-r*cols), off=(cols-inRow)*(w+g)/2; x.globalAlpha=fad?.3:1; x.drawImage(im,ox+off+(i%cols)*(w+g),oy+r*(h+g),w,h); }
    ok(c.toDataURL('image/png').replace('data:image/png;','data:image/png;cpic=1;')); }; im.onerror=()=>ok(src); im.src=src; }); }
/* MIXED GROUPS (Marwa/Ahmed 2026-11-18, booklet "3 elephants + 1" / "which picture shows 2+4"): "unit-a#3 plus unit-b#1" = a group of 3 a, a plus sign, a group of 1 b; "unit-a#2 and unit-b#4" = the same without the plus sign (two kinds side by side in one picture, a gap between) */
const CPIC_MIX=/^[^#+|]+\.(png|jpe?g|webp)#\d+f?([+|][^#+|]+\.(png|jpe?g|webp)#\d+f?)+$/i;
function cpicMix(spec,base){ const k='mix:'+spec; if(_cpic[k]) return _cpic[k];
  const parts=spec.split(/([+|])/), gs=[], seps=[]; parts.forEach((t,i)=>{ if(i%2) seps.push(t); else { const m=t.match(/^(.*)#(\d+)(f?)$/); gs.push({src:new URL(m[1],base).href,n:+m[2],f:!!m[3]}); } });
  return _cpic[k]=Promise.all(gs.map(g=>new Promise(r=>{ const im=new Image(); im.onload=()=>r(im); im.onerror=()=>r(null); im.src=g.src; }))).then(ims=>{
    if(ims.some(i=>!i)) return spec;
    if(!seps.includes('+')){ /* kinds side by side in ONE compact block (the book's boxes): all things in a near-square grid, first kind first */ const U=140, G=14, all=[]; gs.forEach((g,i)=>{ for(let j=0;j<g.n;j++) all.push({im:ims[i],f:g.f}); }); const cols=Math.ceil(Math.sqrt(all.length*1.15)), rows=Math.ceil(all.length/cols), c=document.createElement('canvas'); c.width=cols*(U+G)-G; c.height=rows*(U+G)-G; const x=c.getContext('2d');
      all.forEach((o,j)=>{ const im=o.im; x.globalAlpha=o.f?.3:1; const r=Math.floor(j/cols), inRow=Math.min(cols,all.length-r*cols), off=(cols-inRow)*(U+G)/2, sc=Math.min(U/im.naturalHeight,U/im.naturalWidth), w=im.naturalWidth*sc, h=im.naturalHeight*sc; x.drawImage(im,off+(j%cols)*(U+G)+(U-w)/2,r*(U+G)+(U-h)/2,w,h); });
      return c.toDataURL('image/png').replace('data:image/png;','data:image/png;cpic=1;'); }
    const U=150, G=26, pl=64, boxes=gs.map((g,i)=>{ const im=ims[i], s=Math.min(U/im.naturalHeight,U/im.naturalWidth), w=Math.round(im.naturalWidth*s), h=Math.round(im.naturalHeight*s), cols=cpicCols(g.n), rows=Math.ceil(g.n/cols); return {im,w,h,cols,rows,gw:cols*w+(cols-1)*G*.4,gh:rows*h+(rows-1)*G*.4}; });
    const mh=Math.max(...boxes.map(b=>b.gh)), W=boxes.reduce((a,b,i)=>a+b.gw+(i?(seps[i-1]==='+'?pl+G:G*1.6):0),0), c=document.createElement('canvas'); c.width=Math.round(W); c.height=Math.round(mh); const x=c.getContext('2d'); let ox=0;
    boxes.forEach((b,i)=>{ if(i){ if(seps[i-1]==='+'){ x.font='700 '+Math.round(pl*.9)+'px sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.lineJoin='round'; x.lineWidth=8; x.strokeStyle='#6b2d12'; x.strokeText('+',ox+(pl+G)/2,mh/2); x.fillStyle='#fff'; x.fillText('+',ox+(pl+G)/2,mh/2); ox+=pl+G; } else ox+=G*1.6; }
      const oy=(mh-b.gh)/2; x.globalAlpha=gs[i].f?.3:1; for(let j=0;j<gs[i].n;j++){ const r=Math.floor(j/b.cols), inRow=Math.min(b.cols,gs[i].n-r*b.cols), off=(b.cols-inRow)*(b.w+G*.4)/2; x.drawImage(b.im,ox+off+(j%b.cols)*(b.w+G*.4),oy+r*(b.h+G*.4),b.w,b.h); } ox+=b.gw; });
    return c.toDataURL('image/png').replace('data:image/png;','data:image/png;cpic=1;'); }); }

/* LIVE SCENES (Ahmed 2026-11-19): a workbook picture made of repeated things / numbers / hands / tables is never stored as a picture. data/live-scenes.json
   holds a tiny recipe per scene and a lesson / question writes "live:<scene id>" where the picture would be; every json goes through get(), so cpicFill draws the scene
   from the LIBRARY pictures (one unit picture repeated, faded / crossed / boxed ones, dashed match lines, number badges, a baseline) into one picture in that place.
   recipe: {u:unit px, gap, frame:true (thin white frame) , line:{color, badges:[..]} (floor line under the things, badge under each group),
            rows:[{items:[{p:"candy",n:4,s:1,fade:0,cross:0,box:0,rot:0,badge:"1"}], sep:"−", gap}], link:true (dashed lines between the things of two rows)}
   a table: {table:{head:["..",..], rows:[{label:"..", p:"id", n:6, off:2}], cell:70}}: a label column + cells with one picture each, the first `off` of a row faded. */
const LIVE_RE=/^live:[A-Za-z0-9_-]+$/; let _live=null; const _livec={};
const liveSpecs=()=>_live||(_live=fetch('data/live-scenes.json').then(r=>r.ok?r.json():{}).catch(()=>({})));
const liveImg=(M,id)=>new Promise(ok=>{ const f=M.files[(M.merged&&M.merged[id])||id]||M.files[id]; if(!f) return ok(null); const im=new Image(); im.onload=()=>ok(im); im.onerror=()=>ok(null); im.src='data/pics/'+f; });
function liveMake(id){ if(_livec[id]) return _livec[id];
  return _livec[id]=Promise.all([liveSpecs(),picMap()]).then(async([S,M])=>{ const sp=S[id]; if(!sp) return 'live:'+id;
    const ids=new Set(); (sp.rows||[]).forEach(r=>r.items.forEach(it=>ids.add(it.p))); ((sp.table&&Array.isArray(sp.table.rows)&&sp.table.rows)||[]).forEach(r=>{ if(r.p) ids.add(r.p); }); ((sp.table&&sp.table.cols)||[]).forEach(r=>{ if(r.p) ids.add(r.p); });
    const IM={}; await Promise.all([...ids].map(async p=>{ IM[p]=await liveImg(M,p); })); if([...ids].some(p=>!IM[p])) return 'live:'+id;
    try{ await document.fonts.ready; }catch(e){}
    const c=sp.table?liveTable(sp,IM):liveRows(sp,IM); return c.toDataURL('image/png').replace('data:image/png;',sp.frame||sp.table?'data:image/png;scene=1;':'data:image/png;cpic=1;'); }); }
function liveRows(sp,IM){ const U=sp.u||150, G=sp.gap==null?18:sp.gap, PAD=sp.frame?18:6, FONT=getComputedStyle(document.body).fontFamily||'sans-serif';
  const fit=(it)=>{ const im=IM[it.p], bx=U*(it.s||1), sc=Math.min(bx/im.naturalWidth,bx/im.naturalHeight), r=!!(it.rot&&Math.abs(it.rot)===90); let w=im.naturalWidth*sc, h=im.naturalHeight*sc; if(r){ const t=w; w=h; h=t; } return {im,w,h,sc}; };
  const rows=sp.rows.map(r=>({r,g:r.items.map(it=>({it,u:Array.from({length:it.n||1},()=>fit(it))}))}));
  const cellW=sp.link?Math.max(...rows.flatMap(R=>R.g.flatMap(g=>g.u.map(u=>u.w)))):0;
  rows.forEach(R=>{ R.gap=R.r.gap==null?G:R.r.gap; R.h=0; R.w=0; R.g.forEach((g,gi)=>{ g.x=R.w+(gi?(R.r.sep?60:G*1.6):0); g.w=g.u.reduce((a,u,i)=>a+(cellW||u.w)+(i?R.gap:0),0); g.h=Math.max(...g.u.map(u=>u.h)); R.w=g.x+g.w; R.h=Math.max(R.h,g.h); }); });
  const lineH=sp.line?64:0, rowGap=sp.link?58:(sp.rowGap==null?24:sp.rowGap), vl=sp.vline?70:0;
  const W=Math.max(...rows.map(R=>R.w))+PAD*2+vl, H=rows.reduce((a,R,i)=>a+R.h+(i?rowGap:0),0)+PAD*2+lineH+(sp.link?0:0), c=document.createElement('canvas'), S=2; c.width=Math.round(W*S); c.height=Math.round(H*S); const x=c.getContext('2d'); x.scale(S,S);
  if(sp.frame){ x.fillStyle='#fff'; x.strokeStyle='rgba(60,60,80,.25)'; x.lineWidth=2; x.beginPath(); x.roundRect(1,1,W-2,H-2,16); x.fill(); x.stroke(); }
  let y=PAD; const pos=[];
  rows.forEach((R,ri)=>{ const ox=PAD+vl+(sp.align==='left'?0:(W-PAD*2-vl-R.w)/2); const rp=[]; pos.push(rp);
    R.g.forEach((g,gi)=>{ const it=g.it; let ux=ox+g.x; g.u.forEach((u,i)=>{ const slot=cellW||u.w, px=ux+(slot-u.w)/2, py=y+R.h-u.h, last=g.u.length-i, faded=it.fade&&last<=it.fade, crossed=it.cross&&last<=it.cross;
        x.save(); x.globalAlpha=faded?.3:1; if(it.rot){ x.translate(px+u.w/2,py+u.h/2); x.rotate(it.rot*Math.PI/180); x.drawImage(u.im,-u.sc*u.im.naturalWidth/2,-u.sc*u.im.naturalHeight/2,u.sc*u.im.naturalWidth,u.sc*u.im.naturalHeight); } else x.drawImage(u.im,px,py,u.w,u.h); x.restore();
        if(crossed){ x.strokeStyle='#d32f2f'; x.lineWidth=5; x.lineCap='round'; x.beginPath(); x.moveTo(px,py); x.lineTo(px+u.w,py+u.h); x.moveTo(px+u.w,py); x.lineTo(px,py+u.h); x.stroke(); }
        rp.push({x:px+u.w/2,t:py,b:py+u.h}); ux+=slot+R.gap; });
      if(it.box){ const n=g.u.length, k=Math.min(it.box,n), x0=ox+g.x+(n-k)*((cellW||g.u[0].w)+R.gap)-8, x1=ox+g.x+g.w+8; x.strokeStyle='#444'; x.lineWidth=3; x.strokeRect(x0,y-8,x1-x0,R.h+16); }
      if(R.r.sep&&gi<R.g.length-1){ x.font='700 54px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillStyle='#444'; x.fillText(R.r.sep,ox+g.x+g.w+30,y+R.h/2); }
      if(it.badge!=null){ const bx=ox+g.x+g.w/2, by=y+R.h+(sp.line?42:0); liveBadge(x,bx,by,it.badge,FONT); } });
    y+=R.h+rowGap; });
  if(sp.link) for(let r=0;r+1<rows.length;r++) for(let i=0;i<Math.min(pos[r].length,pos[r+1].length);i++){ x.strokeStyle='#444'; x.lineWidth=2; x.setLineDash([5,5]); x.beginPath(); x.moveTo(pos[r][i].x,pos[r][i].b+4); x.lineTo(pos[r+1][i].x,pos[r+1][i].t-4); x.stroke(); x.setLineDash([]); }
  if(sp.line){ const ly=PAD+rows.reduce((a,R,i)=>a+R.h+(i?rowGap:0),0)+6; x.strokeStyle=sp.line.color||'#d62e8f'; x.lineWidth=5; x.beginPath(); x.moveTo(PAD,ly); x.lineTo(W-PAD,ly); x.stroke(); }
  if(sp.vline){ x.strokeStyle='#d32f2f'; x.lineWidth=6; x.beginPath(); x.moveTo(PAD+22,PAD); x.lineTo(PAD+22,H-PAD); x.stroke(); }
  return c; }
function liveBadge(x,bx,by,t,FONT){ x.fillStyle='#fb9b2a'; x.beginPath(); x.arc(bx,by,22,0,7); x.fill(); x.fillStyle='#fff'; x.font='700 26px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText(String(t),bx,by+2); }
function liveTableV(sp,IM){ const T=sp.table, cell=T.cell||64, FONT=getComputedStyle(document.body).fontFamily||'sans-serif', nrow=T.rows, nc=T.cols.length, lh=34, W=nc*cell+2, H=nrow*cell+lh+2, S=2, c=document.createElement('canvas'); c.width=W*S; c.height=H*S; const x=c.getContext('2d'); x.scale(S,S);
  x.fillStyle='#fff'; x.fillRect(0,0,W,H); x.strokeStyle='#222'; x.lineWidth=2; x.font='700 20px '+FONT; x.textBaseline='middle'; x.textAlign='center';
  T.cols.forEach((col,ci)=>{ const cx=1+(T.rtl!==false?nc-1-ci:ci)*cell; for(let r=0;r<nrow;r++){ const y=1+r*cell; x.strokeRect(cx,y,cell,cell); const k=nrow-1-r; if(col.p){ const im=IM[col.p], sc=Math.min((cell-12)/im.naturalWidth,(cell-12)/im.naturalHeight); x.globalAlpha=k<col.n?1:.28; x.drawImage(im,cx+(cell-im.naturalWidth*sc)/2,y+(cell-im.naturalHeight*sc)/2,im.naturalWidth*sc,im.naturalHeight*sc); x.globalAlpha=1; } }
    x.strokeRect(cx,1+nrow*cell,cell,lh); x.fillStyle='#222'; x.fillText(col.label||'',cx+cell/2,1+nrow*cell+lh/2); });
  return c; }
function liveTable(sp,IM){ if(sp.table.cols) return liveTableV(sp,IM); const T=sp.table, cell=T.cell||64, FONT=getComputedStyle(document.body).fontFamily||'sans-serif', ncol=Math.max(...T.rows.map(r=>r.n)), lw=T.labelW||90, rtl=T.rtl!==false, hh=T.head?36:0, W=lw+ncol*cell+2, H=hh+T.rows.length*cell+2, S=2, c=document.createElement('canvas'); c.width=W*S; c.height=H*S; const x=c.getContext('2d'); x.scale(S,S);
  x.fillStyle='#fff'; x.fillRect(0,0,W,H); x.strokeStyle='#222'; x.lineWidth=2; x.font='700 22px '+FONT; x.textBaseline='middle'; x.textAlign='center';
  T.rows.forEach((r,ri)=>{ const y=hh+ri*cell+1, lx=rtl?1+ncol*cell:1, cx0=rtl?1:1+lw; x.strokeRect(lx,y,lw,cell); x.fillStyle='#222'; x.fillText(r.label||'',lx+lw/2,y+cell/2);
    for(let i=0;i<ncol;i++){ const cx=cx0+i*cell; x.strokeRect(cx,y,cell,cell); if(i<r.n&&r.p){ const im=IM[r.p], sc=Math.min((cell-12)/im.naturalWidth,(cell-12)/im.naturalHeight); x.globalAlpha=(r.off&&i<r.off)?.28:1; x.drawImage(im,cx+(cell-im.naturalWidth*sc)/2,y+(cell-im.naturalHeight*sc)/2,im.naturalWidth*sc,im.naturalHeight*sc); x.globalAlpha=1; } } });
  if(T.head){ x.fillStyle='#222'; (T.head||[]).forEach((t,i)=>{ x.fillText(t,(rtl?1:1+lw)+i*cell+cell/2,hh/2); }); }
  return c; }
function cpicFill(d,url){ const todo=[], base=new URL(url,location.href);
  const walk=o=>{ if(o&&typeof o==='object') for(const k in o){ const v=o[k]; if(typeof v==='string'){ if(CPIC_MIX.test(v)){ todo.push(cpicMix(v,base).then(u=>{ o[k]=u; })); continue; } const m=v.match(CPIC_RE); if(m) todo.push(cpicMake(new URL(v.slice(0,v.lastIndexOf('#')),base).href,+m[2],m[3]).then(u=>{ o[k]=u; })); else if(LIVE_RE.test(v)) todo.push(liveMake(v.slice(5)).then(u=>{ o[k]=u; })); } else walk(v); } };
  walk(d); return Promise.all(todo).then(()=>d); }
/* THE PICTURE KEY (Marwa 2026-11-08): a lesson / question / exam points at a picture by its library id (the name in ../../pics/<id>.png). data/pics/map.json
   (written by tools/pics/reindex.py) says which FILE an id has now (png / jpg / webp) and which weak ids were merged into which. Every json goes through get(),
   so picFix writes the CURRENT file of the id into the string: replace / add / merge a library picture and the whole app follows, no lesson json to edit. */
const PIC_RE=/^(.*\/pics\/)([A-Za-z0-9_-]+)\.(png|jpe?g|webp)(#\d+[nf]*)?$/i; let _picmap=null;
const picMap=()=>_picmap||(_picmap=fetch('data/pics/map.json').then(r=>r.ok?r.json():{files:{},merged:{}}).catch(()=>({files:{},merged:{}})));
function picFix(d,url){ if(/\/pics\/(pics|map)\.json$/.test(url)) return d; return picMap().then(M=>{ const walk=o=>{ if(o&&typeof o==='object') for(const k in o){ const v=o[k]; if(typeof v==='string'){ const m=v.match(PIC_RE); if(m){ let id=m[2]; for(let n=0;n<4&&M.merged[id];n++) id=M.merged[id]; const f=M.files[id]; if(f&&f!==m[2]+'.'+m[3]) o[k]=m[1]+f+(m[4]||''); } } else walk(v); } }; walk(d); return d; }); }
const get = url => fetch(url).then(r=>{ if(!r.ok) throw new Error(url); return r.json(); }).then(d=>picFix(d,url)).then(d=>cpicFill(d,url));

/* ---------- Drawings ---------- */
let gid=0;
/* the game lettering for big names: letters wrapped one by one so css can tilt / resize them (Arabic stays joined: no wrapping) */
const GT=s=>/[\u0600-\u06FF]/.test(s)?s:String(s).split(' ').map(w=>`<span class="w">${[...w].map(ch=>`<i>${ch}</i>`).join('')}</span>`).join(' ');
const STAR_PATH = (()=>{ const p=[]; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, r=i%2?21:44; p.push((50+r*Math.cos(a)).toFixed(1)+' '+(54+r*Math.sin(a)).toFixed(1)); } return 'M'+p.join('L')+'Z'; })();
function STAR(on=true){
  if(!on) return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${STAR_PATH}" fill="rgba(110,60,0,.28)" stroke="rgba(110,60,0,.45)" stroke-width="9" stroke-linejoin="round"/></svg>`;
  const id='st'+(gid++);
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--star-a)"/><stop offset=".5" stop-color="var(--star-b)"/><stop offset="1" stop-color="var(--star-c)"/></linearGradient></defs>
  <path d="${STAR_PATH}" fill="var(--star-under)" stroke="var(--star-under)" stroke-width="11" stroke-linejoin="round" transform="translate(0 3)"/>
  <path d="${STAR_PATH}" fill="url(#${id})" stroke="var(--star-edge)" stroke-width="9" stroke-linejoin="round"/>
  <path d="M30 46Q38 28 50 22" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".85"/><circle cx="25" cy="55" r="3" fill="#fff" opacity=".8"/>
  <path d="M63 76l5 3 3-5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/></svg>`;
}
function CAR(mood='happy'){
  const id='cr'+(gid++);
  const mouth = mood==='wow'
    ? `<ellipse cx="104" cy="56" rx="8" ry="9" fill="var(--car-mouth)" stroke="${OL}" stroke-width="3"/><ellipse cx="104" cy="61" rx="5" ry="3.4" fill="var(--car-tongue)"/>`
    : mood==='sad' ? `<path d="M94 62Q104 52 114 62" fill="none" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>`
    : `<path d="M88 50Q104 74 122 50Z" fill="var(--car-mouth)" stroke="${OL}" stroke-width="3.5" stroke-linejoin="round"/><path d="M91 51.500H119Q116 56 104 56Q94 56 91 51.500Z" fill="#fff"/><path d="M96 63Q104 58 113 63Q108 69 104 69Q99 69 96 63Z" fill="var(--car-tongue)"/>`;
  const eye=(x)=>`<ellipse cx="${x}" cy="25" rx="12.5" ry="14" fill="#fff" stroke="${OL}" stroke-width="3.2"/><ellipse cx="${x+2}" cy="28" rx="7.600" ry="8.600" fill="var(--car-iris)"/><circle cx="${x+2}" cy="29" r="4.400" fill="var(--car-pupil)"/><circle cx="${x+4.500}" cy="24.500" r="2.800" fill="#fff"/><circle cx="${x-1}" cy="32" r="1.400" fill="#fff"/>`;
  const lid=(x)=>`<rect class="lid" x="${x-13}" y="10" width="26" height="30" rx="12" fill="var(--car-lid)" transform="scale(1 0)" style="transform-box:fill-box;transform-origin:top"/>`;
  return `<svg viewBox="-4 -6 136 98" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--car-1)"/><stop offset=".55" stop-color="var(--car-2)"/><stop offset="1" stop-color="var(--car-3)"/></linearGradient></defs><g class="cb">
  <ellipse cx="66" cy="87" rx="56" ry="5" fill="rgba(60,20,0,.3)"/>
  <path d="M5 60Q3 42 21 38L34 14Q41 3 56 3H88Q104 3 110 14L118 34Q130 40 130 56V66Q130 76 120 76H14Q5 76 5 66Z" fill="url(#${id})" stroke="${OL}" stroke-width="3.600" stroke-linejoin="round"/>
  <path d="M7 64H128V67Q128 74 119 74H15Q7 74 7 67Z" fill="var(--car-shade)" opacity=".55"/>
  <path d="M44 9Q50 6 58 6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".75"/><path d="M12 46Q14 41 22 40" fill="none" stroke="#fff" stroke-width="3.500" stroke-linecap="round" opacity=".7"/>
  ${eye(62)}${eye(92)}${lid(62)}${lid(92)}
  <ellipse cx="80" cy="48" rx="5.500" ry="3.300" fill="var(--car-cheek)" opacity=".9"/><ellipse cx="124" cy="46" rx="4" ry="2.800" fill="var(--car-cheek)" opacity=".0"/>
  ${mouth}
  <circle cx="124" cy="46" r="6.500" fill="var(--car-light)" stroke="${OL}" stroke-width="3"/><circle cx="122.500" cy="44" r="2" fill="#fff"/>
  <rect x="3" y="48" width="9" height="10" rx="3.500" fill="var(--car-bumper)" stroke="${OL}" stroke-width="2.800"/>
  <g class="wheel"><circle cx="34" cy="74" r="14.500" fill="var(--car-tyre)" stroke="${OL}" stroke-width="3.600"/><circle cx="34" cy="74" r="7" fill="var(--car-hub)" stroke="${OL}" stroke-width="2.600"/><path d="M34 66.500v5M34 77v5M26.500 74h5M37 74h5" stroke="var(--car-spoke)" stroke-width="2.600" stroke-linecap="round"/></g>
  <g class="wheel"><circle cx="98" cy="74" r="14.500" fill="var(--car-tyre)" stroke="${OL}" stroke-width="3.600"/><circle cx="98" cy="74" r="7" fill="var(--car-hub)" stroke="${OL}" stroke-width="2.600"/><path d="M98 66.500v5M98 77v5M90.500 74h5M101 74h5" stroke="var(--car-spoke)" stroke-width="2.600" stroke-linecap="round"/></g>
  </g></svg>`;
}
const FLASK = c=>`<svg x="22" y="20" width="36" height="46" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/></svg>`;
/* ACCESS: every subject / unit / lesson has a status. 'open' = playable. 'soon' = not added yet (faded + "Soon", not tappable). 'locked' = exists but needs coins or a subscription (chunky padlock + chain).
   Set per item with "status" (and optional "coins" cost) in data/course.json (subjects) or the subject's json (units / lessons); the future admin dashboard writes the same two fields.
   Nothing written = 'open' when it has content, otherwise 'soon'. COURSE.access (off for now) holds the free-trial rule: {enabled, trial:{units:N free units per subject}, coins:default price}.
   Things the child unlocked with coins are remembered in localStorage (es.unlocked) by id; the real coin balance / server comes later.
   NOW (Marwa 2026-11-05): the whole rule (the admin's state per item, the free policy for new users, coins) is in js/coins.js coinAccess; see docs/coins-and-admin.md. */
function accessOf(o,hasContent,id,idx,kind){ return coinAccess(o,hasContent,id,idx,kind); }
const COINTXT=n=>n?`${n} ${isAr()?'كريدت':'credits'}`:'';
/* a chunky childlike padlock (3D: dark underside, glossy gold face, thick silver shackle), drawn in a 60 x 68 box; used by the home books, the lesson circles and the chained unit books */
const PADLOCK=`<g class="padlock"><path d="M17 31V21a13 13 0 0 1 26 0v10" fill="none" stroke="var(--btn-ol)" stroke-width="11.500" stroke-linecap="round"/><path d="M17 31V21a13 13 0 0 1 26 0v10" fill="none" stroke="var(--lock-metal)" stroke-width="6" stroke-linecap="round"/><path d="M20 29V21a10 10 0 0 1 6.500-9.300" fill="none" stroke="#fff" stroke-width="2.200" stroke-linecap="round" opacity=".85"/>
  <rect x="4" y="32" width="52" height="34" rx="14" fill="var(--lock-body-dk)" stroke="var(--btn-ol)" stroke-width="4"/><rect x="4" y="28" width="52" height="33" rx="14" fill="var(--lock-body)" stroke="var(--btn-ol)" stroke-width="4"/><rect x="10" y="33" width="24" height="6.500" rx="3.250" fill="#fff" opacity=".6"/><circle cx="30" cy="43.500" r="5.500" fill="var(--btn-ol)"/><path d="M30 46v9" stroke="var(--btn-ol)" stroke-width="5" stroke-linecap="round"/></g>`;
/* a 3D cardboard box; open ones have a hole with eyes peeking out */
function shade(hex,k){ // k>0 lighter, k<0 darker (own helper for the book colours)
  const n=parseInt(hex.slice(1),16); const f=v=>Math.round(k>=0?v+(255-v)*k:v*(1+k)); const r=f(n>>16),g=f((n>>8)&255),b=f(n&255);
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
/* the subject book: glossy cover, rounded spine with ridges, pages and a ribbon, the NAME standing on the cover in 3D letters (own drawing; colour per subject from course.json) */
function BOX(s){
  const c=s.color||'#2E8BE6', c1=shade(c,.38), c2=shade(c,-.22), c3=shade(c,-.4), ex=shade(c,.55), gx='bk'+(gid++);
  const words=(s.name||'').split(' '), lines=words.length>1&&s.name.length>7?words:[s.name];
  const ar=s.rtl||/[\u0600-\u06FF]/.test(s.name||'');   /* an Arabic name (e.g. رياضيات of the Arabic Math book) needs the Arabic font and no letter-spacing, or its letters come apart (Marwa 2026-11-05) */
  const size=27;   /* ONE fixed name size on every cover (Marwa 2026-11-05): fits the longest word (7 letters, e.g. ENGLISH); long names wrap, never shrink or grow */
  const font=ar?'Baloo Bhaijaan 2':'Luckiest Guy', cy=90-(lines.length-1)*size*.5;
  const t=(k,w,dy,fill,stroke,sw,op)=>`<text x="119" y="${(cy+k*size*1.02+size*.34+dy).toFixed(1)}" text-anchor="middle"${ar?' direction="rtl"':''} font-family="${font}, sans-serif" font-weight="${ar?800:400}" letter-spacing="${ar?0:(size*.03).toFixed(1)}" font-size="${size.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" opacity="${op}">${w}</text>`;
  const txt=lines.map((w,k)=>t(k,w,0,'#fff','#fff',ar?0:size*.045,1)).join('')   /* name: plain white, no shadow, in the middle of the cover */;
  const lock = s._st==='locked'?`<g transform="translate(98 100) scale(.85)">${PADLOCK}</g>`:'';
  const soon = s._st==='soon'?`<g><rect x="62" y="136" width="116" height="30" rx="15" fill="rgba(110,60,10,.6)"/><text x="120" y="158" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="22" fill="#fff">Soon</text></g>`:'';
  const bi=s.book||'blue';   // the book picture (Marwa's own art, app/data/books/<colour>.png); the name stands on its cover
  return `<svg viewBox="0 0 200 210" aria-hidden="true"><defs>
  <linearGradient id="${gx}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${shade(c,.8)}"/></linearGradient></defs>
  <filter id="${gx}f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
  <rect x="2" y="12" width="196" height="186" rx="44" fill="rgba(50,20,0,.6)" filter="url(#${gx}f)"/>   <!-- soft shadow round the edges (left, right, sides), not under the book -->
  <image class="bkimg" href="data/books/${bi}.png" x="2" y="6" width="196" height="202" preserveAspectRatio="xMidYMid meet"/>
  ${txt}${soon}${lock}
  </svg>`;
}
const ICON = {
  home:'<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  map:'<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>',
  stop:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
  pause:'<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.5" height="14" rx="1.5"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.5"/></svg>',
  restart:'<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/></svg>',
  slow:'<svg viewBox="0 0 24 24"><path d="M3 15c0-4 3.5-7 8-7s8 3 8 7z"/><circle cx="20" cy="13" r="2.4"/><rect x="5" y="15" width="3" height="3" rx="1"/><rect x="14" y="15" width="3" height="3" rx="1"/></svg>',
  fast:'<svg viewBox="0 0 24 24"><path d="M3 15l3-5h9l4 5z"/><circle cx="7.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>',
  road:'<svg viewBox="0 0 24 24"><path d="M7 21c0-5 10-5 10-10S7 8 7 3"/><path d="M7 12v.1M17 17v.1"/></svg>',
  exam:'<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12l2 2 4-4M9 18h6"/></svg>',
  arcs:'<svg viewBox="0 0 24 24"><text x="12" y="8" text-anchor="middle" textLength="23" lengthAdjust="spacingAndGlyphs" font-size="9" font-weight="700" font-family="sans-serif" style="fill:currentColor;stroke:none">5 6 7 10</text><path d="M3 11c0 6 3.500 10 9 10s9-4 9-10"/><path d="M7 11c0 4 2 6.500 5 6.500s5-2.500 5-6.500"/><path d="M11 11c0 1.500.4 2.300 1 2.300s1-.8 1-2.300"/></svg>',
  book:'<svg viewBox="0 0 24 24"><path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13C17 4 14 4.5 12 6z"/><path d="M12 6v13"/></svg>',
  abc:'<svg viewBox="0 0 24 24"><path d="M3 18l4-11 4 11M4.5 14h5"/><path d="M14 7v11h3.5a2.7 2.7 0 0 0 0-5.5H14m0 0h3a2.7 2.7 0 0 0 0-5.5h-3"/></svg>',
  quiz:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.4"/><path d="M12 17.2v.1"/></svg>',
  hint:'<svg viewBox="0 0 24 24"><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.6.5.9 1.1.9 1.9V17h5.8v-.8c0-.8.3-1.4.9-1.9A6.5 6.5 0 0 0 12 2.5z"/><rect x="9" y="18.3" width="6" height="2.6" rx="1.3"/></svg>',
  sound:'<svg viewBox="0 0 24 24"><path d="M3 9.5h4l5-4.5v14l-5-4.5H3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  kid:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4.5"/><path d="M3.5 21c.8-4.4 4.2-7 8.5-7s7.7 2.6 8.5 7"/></svg>',
  back:'<svg viewBox="0 0 24 24"><path d="M20 12H5M11 5l-7 7 7 7"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  pencil:'<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.8L16 4.4a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L8.8 18.8z"/><path d="M4 20l4.8-1.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="#fff"><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" stroke-width="2.6"/></svg>'
};


/* picture look (theme part 3): png cut-outs of objects have no frame; people / nature pictures keep the photo frame. The words are in data/pic-frame.json. */
let PFRE=null;
function markPf(i){ if(!PFRE||!i||i.tagName!=='IMG') return; const f=(i.getAttribute('src')||'').split('/').pop().replace(/\.\w+$/,'').replace(/^[0-9a-z]{1,2}-(?=[a-z])/i,''); i.classList.toggle('pf',PFRE.test(f)); }
document.addEventListener('load',e=>{ const i=e.target; if(i&&i.tagName==='IMG'&&i.naturalWidth) i.style.setProperty('--ar',i.naturalWidth/i.naturalHeight); markPf(i); },true);   // --ar = the picture's own shape: the frame hugs it (frame.css)
fetch('data/pic-frame.json').then(r=>r.ok?r.json():null).then(j=>{ if(!j) return; PFRE=new RegExp('(^|-)('+[...(j.people||[]),...(j.nature||[])].join('|')+')(s)?(-|$)','i'); document.querySelectorAll('img').forEach(markPf); }).catch(()=>{});

/* ONE voice at a time: whatever is being read (lesson recording, word, question, exam) stops the moment the child goes somewhere else */
function stopVoice(){ try{ if(typeof stopAll==='function') stopAll(); if(typeof vStop==='function') vStop(); if(typeof gramStop==='function') gramStop(); if(typeof nahwStop==='function') nahwStop(); if(typeof explainStop==='function') explainStop(); if(typeof mathStop==='function') mathStop(); }catch(e){} }   // gramStop: a running grammar animation stops too (it went on reading in the background into the next lesson)
/* ---------- Motion helpers ---------- */
/* light motion: times and ease come from theme.css (--t-pop, --t-fade); small scale, no bouncing */
const TM=(n,d)=>{ const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)); return isFinite(v)?v:d; };
function pop(t,o={}){ if(anim) G.from(t,{scale:.85,opacity:0,y:8,duration:TM('--t-pop',.22),ease:'power2.out',stagger:.03,clearProps:'transform,opacity',...o}); }
function fadeIn(t){ if(anim&&G) G.fromTo(t,{opacity:0},{opacity:1,duration:TM('--t-fade',.18),ease:'power1.out',clearProps:'opacity'}); }
function blink(svg){
  if(!anim||!svg) return; const lids=svg.querySelectorAll('.lid');
  const go=()=>{ if(!svg.isConnected) return; G.to(lids,{attr:{transform:'scale(1 1)'},duration:.08,yoyo:true,repeat:1,onComplete:()=>G.delayedCall(2+Math.random()*3,go)}); };
  G.delayedCall(1+Math.random()*2,go);
}
function putCar(node,mood){ node.innerHTML=CAR(mood); blink(node.querySelector('svg')); return node; }
document.addEventListener('pointerdown',e=>{ const b=e.target.closest('.pill,.rb,.box'); if(!b) return; blip(520,.05); hideHint();
  if(anim){ G.killTweensOf(b,'scaleX,scaleY'); G.to(b,{scaleX:1.1,scaleY:.88,duration:.08}); } });
document.addEventListener('pointerup',()=>{ if(anim) $$('.pill,.rb,.box').forEach(b=>{ if(b._gsap&&b._gsap.scaleX!==1) G.to(b,{scaleX:1,scaleY:1,duration:.7,ease:'elastic.out(1.1,.35)'}); }); });

/* ---------- Sounds ---------- */
/* ONE speaker (Web Audio) for every sound in the app: effects, letters, words, reading, celebrations.
   iPad/iPhone: after the screen locks or another app is used, the old speaker can stay mute (sometimes
   while it even says "running"). So when the app is hidden all sounds stop, and on the next tap the old
   speaker is thrown away and a new one is made inside that tap (see unlockSound below). */
const SND={ctx:null,stale:false};
// decode a sound file; a file that is not a sound (an Arabic slot not recorded yet) only rejects here: the browser's own second promise is caught, so no script error
const decodeSnd=(ctx,b)=>new Promise((ok,no)=>{ const p=ctx.decodeAudioData(b,ok,no); if(p&&p.catch) p.catch(()=>{}); });
const wakeCtx=c=>{ try{ const p=c.resume(); if(p&&p.catch) p.catch(()=>{}); }catch(e){} };
function newSpeaker(){ try{ if(SND.ctx&&SND.ctx.state!=='closed') SND.ctx.close(); }catch(e){}
  try{ SND.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ SND.ctx=null; } return SND.ctx; }
function ac(){ const c=SND.ctx&&SND.ctx.state!=='closed'?SND.ctx:newSpeaker(); if(c&&c.state!=='running') wakeCtx(c); return c; }
function tone(f,type,vol,len,slide){ const c=ac(); if(!c) return; const t=c.currentTime,o=c.createOscillator(),g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(f*slide,t+len*.8);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+len); o.connect(g).connect(c.destination); o.start(t); o.stop(t+len+.02); }
const blip=(f=520,v=.06)=>tone(f,'sine',v,.14,1.8);
function chime(step=0){ const b=[659,784,988,1175][step%4]; tone(b,'triangle',.12,.6); tone(b*2,'sine',.05,.5); tone(b*3,'sine',.03,.4); }
const whoosh=()=>tone(300,'sine',.07,.55,4.5);
function honk(){ [[0,.12],[.18,.2]].forEach(([d,l])=>setTimeout(()=>{ tone(392,'square',.035,l); tone(494,'square',.035,l); },d*1000)); }

/* ---------- Confetti ---------- */
const fx=$('#fx'), ctx=fx.getContext('2d'); let bits=[], fxOn=false;
function confetti(n=140){
  if(calm) return; const d=devicePixelRatio||1; fx.width=innerWidth*d; fx.height=innerHeight*d;
  const cols=['#FFCB2E','#2E8BE6','#43A82A','#EF4B3C','#8A5BE0','#F57F28'];
  for(let i=0;i<n;i++) bits.push({x:fx.width*Math.random(),y:-20*d-Math.random()*fx.height*.4,vx:(Math.random()-.5)*3*d,vy:(2+Math.random()*3)*d,
    r:Math.random()*6.3,vr:(Math.random()-.5)*.3,w:(8+Math.random()*8)*d,h:(4+Math.random()*4)*d,c:cols[i%cols.length],d});
  if(!fxOn){fxOn=true;requestAnimationFrame(tick);}
}
function tick(){ ctx.clearRect(0,0,fx.width,fx.height); bits=bits.filter(b=>b.y<fx.height+30*b.d);
  bits.forEach(b=>{ b.x+=b.vx+Math.sin(b.y/40)*.8*b.d; b.y+=b.vy; b.r+=b.vr; ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.r); ctx.fillStyle=b.c; ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h); ctx.restore(); });
  if(bits.length) requestAnimationFrame(tick); else { fxOn=false; ctx.clearRect(0,0,fx.width,fx.height); } }

/* ---------- Hints: small handwritten note + drawn arrow, placed in the emptiest spot.
   Each hint shows at most HINT_MAX times on this device, then never again. ---------- */
const HINT_MAX=2;
let hintT=0, hintTarget=null, hintTw=null, HC={};
try{ HC=JSON.parse(localStorage.getItem('zoom-hints')||'{}')||{}; }catch(e){}
const OBST='.gamelogo,.hello .car,.note .in,.box .cube,.box .name,.stop .pop,.tab,.dash,.rb,.hud,.sign,.track,.vthumb,.vimg,.vword,.vmeaning,.pill';
function showHint(target, text, delay=900, key=text){
  clearTimeout(hintT); if(!target||!text||(HC[key]||0)>=HINT_MAX) return;
  hintT=setTimeout(()=>{
    if(!target.isConnected || target.closest('[hidden]') || $('.overlay:not([hidden])')) return;
    HC[key]=(HC[key]||0)+1; try{ localStorage.setItem('zoom-hints',JSON.stringify(HC)); }catch(e){}
    const box=$('#hint'), note=$('#hintText'), svg=$('#hintArrow'), r=target.getBoundingClientRect(), W=innerWidth, H=innerHeight;
    note.textContent=text; box.hidden=false; svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.innerHTML='';
    const nw=note.offsetWidth, nh=note.offsetHeight, g=56, cx=r.left+r.width/2, cy=r.top+r.height/2;
    const obs=$$(OBST).filter(o=>!o.closest('[hidden]')&&o!==target&&!target.contains(o)).map(o=>o.getBoundingClientRect());
    const ov=(x,y,R)=>Math.max(0,Math.min(x+nw,R.right)-Math.max(x,R.left))*Math.max(0,Math.min(y+nh,R.bottom)-Math.max(y,R.top));
    const cands=[[r.left-g-nw,cy-nh/2],[r.right+g,cy-nh/2],[cx-nw/2,r.top-g-nh],[cx-nw/2,r.bottom+g],
      [r.left-g-nw,r.top-g-nh],[r.right+g,r.top-g-nh],[r.left-g-nw,r.bottom+g],[r.right+g,r.bottom+g]];
    let best=null;
    cands.forEach(([x,y],i)=>{ const ox=x, oy=y; x=Math.max(8,Math.min(W-nw-8,x)); y=Math.max(8,Math.min(H-nh-8,y));
      let s=ov(x,y,r)*50+Math.abs(ox-x)+Math.abs(oy-y); obs.forEach(R=>s+=ov(x,y,R)); s+=i*2;
      if(!best||s<best.s) best={x,y,s}; });
    const {x,y}=best;
    note.style.left=x+'px'; note.style.top=y+'px';
    const sx=Math.max(x,Math.min(x+nw,cx)), sy=Math.max(y,Math.min(y+nh,cy));
    let ex=cx, ey=cy; const dx=ex-sx, dy=ey-sy, L=Math.hypot(dx,dy)||1, pad=Math.min(r.width,r.height)/2+6;
    ex-=dx/L*pad; ey-=dy/L*pad;
    const mx=(sx+ex)/2-dy/L*24, my=(sy+ey)/2+dx/L*24, ang=Math.atan2(ey-my,ex-mx), h=13;
    if(L>pad+14) svg.innerHTML=`<path d="M${sx} ${sy}Q${mx} ${my} ${ex} ${ey}"/><path d="M${ex-h*Math.cos(ang-.5)} ${ey-h*Math.sin(ang-.5)}L${ex} ${ey}L${ex-h*Math.cos(ang+.5)} ${ey-h*Math.sin(ang+.5)}"/>`;
    hintTarget=target;
    if(anim){
      G.fromTo(note,{scale:.5,opacity:0,rotation:-2},{scale:1,opacity:1,rotation:-2,duration:.45,ease:'back.out(2)'});
      const p=svg.querySelector('path'); if(p){ const len=p.getTotalLength();
        G.fromTo(p,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:.5,delay:.15,ease:'power2.out'});
        G.fromTo(svg.lastChild,{opacity:0},{opacity:1,duration:.2,delay:.6}); }
      hintTw=G.to(target,{scale:1.07,duration:.55,yoyo:true,repeat:-1,ease:'sine.inOut',delay:.7});
    }
    setTimeout(()=>{ if(hintTarget===target) hideHint(); },7000);
  },delay);
}
function hideHint(){ clearTimeout(hintT); $('#hint').hidden=true; if(hintTw){ hintTw.kill(); hintTw=null; if(hintTarget&&anim) G.to(hintTarget,{scale:1,duration:.2}); } hintTarget=null; }
addEventListener('resize',hideHint);

/* ---------- Popups ---------- */
function spinRays(o){ if(anim){ const r=$('.rays',o); G.killTweensOf(r); G.fromTo(r,{rotation:0,opacity:0,scale:.4},{rotation:360,duration:24,ease:'none',repeat:-1}); G.to(r,{opacity:1,scale:1,duration:.5}); } }
function message(title,text,art){
  hideHint(); const o=$('#msg'); $('#msgTitle').textContent=title; $('#msgText').textContent=text; $('#msgArt').innerHTML=art||'';
  const car=$('#msgArt .car'); if(car) blink(car.querySelector('svg'));
  o.hidden=false; spinRays(o);
  if(anim){ G.from('#msgTitle',{scale:0,duration:.5,ease:'back.out(2.4)'}); G.from('#msgArt',{scale:0,rotation:-20,duration:.6,delay:.1,ease:'back.out(2)'});
    G.from('#msgText,#msgOk',{y:30,opacity:0,duration:.4,delay:.25,stagger:.1}); }
}
$('#msgOk').addEventListener('click',()=>{ $('#msg').hidden=true; });
$('#msg').addEventListener('click',e=>{ if(e.target.id==='msg') $('#msg').hidden=true; });

/* ---------- Stars (kept on this tablet) ---------- */
let STARS={}; try{ STARS=JSON.parse(localStorage.getItem('zoom-stars')||'{}')||{}; }catch(e){}
const total=()=>Object.values(STARS).reduce((a,o)=>a+Object.keys(o).length,0);
const lessonStars=id=>STARS[id]?Object.keys(STARS[id]).length:0;
// lessons the child has opened (kept on this device): the map's car stands after the last lesson opened or earned, not only after finished ones
let OPENED={}; try{ OPENED=JSON.parse(localStorage.getItem('zoom-opened')||'{}')||{}; }catch(e){}
const markOpened=id=>{ if(!OPENED[id]){ OPENED[id]=1; try{ localStorage.setItem('zoom-opened',JSON.stringify(OPENED)); }catch(e){} } setLast(id); };
// where the child last was, per subject: the lesson, and the book page when she came in through a page sign (the map's car stops there)
let LAST={}; try{ LAST=JSON.parse(localStorage.getItem('zoom-last')||'{}')||{}; }catch(e){}
const subjKey=()=>(typeof SUBJECT!=='undefined'&&SUBJECT&&(SUBJECT.id||SUBJECT.name))||'';
function setLast(id,p){ LAST[subjKey()]=p?{id,p}:{id}; try{ localStorage.setItem('zoom-last',JSON.stringify(LAST)); }catch(e){} }
const lessonTouched=l=>!!(l&&(OPENED[l.id]||lessonStars(l.id)>0));
const lessonParts=m=>(m&&m.tabs&&m.tabs.length)||3;   // a lesson with fewer tabs has fewer stars to earn (subject.json lesson "tabs")
// the lesson the map points at: the furthest one touched (opened or starred) while it is unfinished, else the one after it; nothing touched yet = the first
function curLessonOf(list){ const L=list.filter(l=>l.file); if(!L.length) return null; const lt=LAST[subjKey()], lm=lt&&L.find(l=>l.id===lt.id); if(lm) return lm; let f=-1; L.forEach((l,i)=>{ if(lessonTouched(l)) f=i; });
  if(f<0) return L[0]; return lessonStars(L[f].id)>=lessonParts(L[f])&&L[f+1]?L[f+1]:L[f]; }
function paintHud(){ $$('[data-hud]').forEach(h=>h.innerHTML=`<span class="ic">${STAR(true)}</span><span>${total()}</span>`); if(typeof coinPaint==='function') coinPaint(); }
const PARTS=[['read','Lesson'],['words','Vocabulary'],['quiz','Questions'],['booklet','Booklet'],['workbook','PTS'],['grammar','Grammar']];   // names go through tr() when shown

// the star waits until the last sound of the lesson / question has finished (no overlap), at most 6 s
function award(id,part){ const t0=Date.now(), busyNow=()=>{ try{ return !!(vs.src||(player&&player.run)||speechSynthesis.speaking); }catch(e){ return false; } };
  const wait=()=>{ if(busyNow()&&Date.now()-t0<6000) return setTimeout(wait,150); setTimeout(()=>awardNow(id,part),Date.now()-t0>400?250:0); }; setTimeout(wait,250); }   // short first pause: a sound that was only just started is not playing yet
function awardNow(id,part){
  const isNew=!(STARS[id]&&STARS[id][part]);
  STARS[id]=STARS[id]||{}; STARS[id][part]=1; try{ localStorage.setItem('zoom-stars',JSON.stringify(STARS)); }catch(e){}
  honk(); hideHint();
  const after=()=>{ if(isNew){ paintHud(); paintTabs(); if(anim) G.fromTo('#hudLesson .ic',{scale:1.7},{scale:1,duration:.8,ease:'elastic.out(1.2,.35)'}); chime(3); }
    setTimeout(()=>levelUp(id,isNew),350); };
  if(!anim){ after(); return; }
  const s=el('div','bigstar',STAR(true)); document.body.append(s);
  const r=s.getBoundingClientRect(), t=$('#hudLesson .ic').getBoundingClientRect();
  const dx=t.left+t.width/2-(r.left+r.width/2), dy=t.top+t.height/2-(r.top+r.height/2), sc=t.width/r.width;
  confetti(110); chime(0);
  G.timeline({onComplete:()=>{ s.remove(); after(); }})
    .fromTo(s,{scale:0,rotation:-200},{scale:1.15,rotation:10,duration:.6,ease:'back.out(2.2)'})
    .to(s,{scale:1,rotation:0,duration:.25})
    .to(s,{scaleX:1.12,scaleY:.9,duration:.12,yoyo:true,repeat:3})
    .add(whoosh)
    .to(s,{x:dx,y:dy,scale:sc,rotation:360,duration:.75,ease:'power2.in'});
}
function levelUp(id,isNew){
  const o=$('#levelUp'), t=$('#lvlTitle'); const word=tr(isNew?'Great!':'Super!'); t.textContent=word; t.dataset.t=word; $('#lvlAgain').textContent=tr('Again'); $('#lvlMap').textContent=tr('Map');
  $('#slots').innerHTML=PARTS.filter(([p])=>{ const t=$('.tab[data-tab="'+p+'"]'); return t?!t.hidden:(LESSON&&LESSON.tabs?LESSON.tabs.includes(p):['read','words','quiz'].includes(p)); }).map(([p,l0])=>{ const l=(typeof TABAR!=='undefined'&&isAr()&&TABAR[p==='workbook'?'Assignments':l0])||tr(l0); return `<button class="slot" data-p="${p}" aria-label="Go to ${l}">${STAR(false)}${STARS[id]&&STARS[id][p]?`<span class="on" style="position:absolute;inset:0">${STAR(true)}</span>`:''}<span class="lbl">${l}</span></button>`; }).join('');
  { const sl=$('#slots'), n=sl.children.length; sl.style.setProperty('--n',n); sl.classList.toggle('n3',n<=3); sl.classList.toggle('many',n>3); }
  putCar($('#lvlCar'),'wow'); o.hidden=false; spinRays(o);
  if(!anim) return;
  G.from('#lvlTitle',{scale:0,rotation:-8,duration:.55,ease:'back.out(2.4)'});
  G.from('#slots .slot',{scale:0,duration:.35,stagger:.08,delay:.15,ease:'back.out(2)'});
  $$('#slots .on').forEach((s,i)=>G.fromTo(s,{scale:2.6,y:-160,opacity:0,rotation:-120},{scale:1,y:0,opacity:1,rotation:0,duration:.6,ease:'bounce.out',delay:.6+i*.45,onStart:()=>chime(i)}));
  G.fromTo('#lvlCar',{y:0},{y:-16,duration:.28,yoyo:true,repeat:5,ease:'power1.out',delay:.5});
  G.from('#levelUp .btns',{y:40,opacity:0,duration:.4,delay:.9});
  G.delayedCall(.7+$$('#slots .on').length*.45,()=>confetti(150));
}
$('#lvlAgain').addEventListener('click',()=>{ $('#levelUp').hidden=true; if(tab==='words'){ vs.i=0; vTeach(); } else if(tab==='read'&&LESSON&&LESSON.layout==='nahw'&&typeof nahwRestart==='function') nahwRestart(); else if(inQ()) showQuiz(0); else playFrom(0); });
$('#lvlMap').addEventListener('click',()=>{ $('#levelUp').hidden=true; openMap(); });
// each star (and its name) opens that part of the lesson: Lesson, Vocabulary or Questions
$('#slots').addEventListener('click',e=>{ const s=e.target.closest('.slot'); if(!s) return; $('#levelUp').hidden=true; switchTab(s.dataset.p); });
$('#levelUp').addEventListener('click',e=>{ if(!e.target.closest('button')){ $('#levelUp').hidden=true; if(tab==='read') showHint(rd.words[0]&&rd.words[0].el, LESSON.hints&&LESSON.hints.word, 400,'word'); } });

/* ---------- State ---------- */
let COURSE=null, SUBJECT=null, LESSON=null;
/* ---------- Arabic subject: SUBJECT.rtl (course.json) makes the TEXT Arabic (class .ar on the screen; text blocks run right to left, css/arabic.css); the layout and button places stay the same as every subject; numbers are ١٢٣ ---------- */
const AR_UI={'Models':'تقييمات','Tests':'اختبارات','Test':'اختبار','Tool':'أداة','Tools':'أدوات','Booklet':'كُتيب','Map key':'مفتاح الخريطة','Revision':'مراجعة','Previous':'السابق','Next':'التالي','Lesson':'الدرس','Vocabulary':'الكلمات','Questions':'الأسئلة','Read':'اسمع','Continue':'كمّل','Pause':'وقّف','Restart':'من الأول','Slow':'بطيء','Normal':'عادي',
  'Help':'ساعدني','Listen':'اسمع','Teach':'علّمني','Write':'اكتب','Stop':'وقّف','Listen!':'اسمع!','Read with me!':'اقرأ معي!','Your turn! Write it.':'دورك! اكتب الكلمة','Tap and write!':'اضغط واكتب!',
  'Great!':'ممتاز!','Super!':'رائع!','Again':'تاني','Map':'الخريطة','Nice!':'تمام!','Unit':'الوحدة','Soon':'قريبًا','Book':'الكتاب','Loading...':'لحظة...','Coming soon!':'قريبًا!','Soon!':'قريبًا!','Oops!':'أوبس!','Primary 1':'الصف الأول','Term 1':'الترم الأول'};
const isAr=()=>!!(SUBJECT&&SUBJECT.rtl);
const ptsName=()=>isAr()?'كتاب التقييمات':(SUBJECT&&/^math/.test(SUBJECT.id)?'PTS':'Assessments');   // the Workbook: languages call it Assessments
const tr=s=>(SUBJECT&&SUBJECT.labels&&SUBJECT.labels[s])||(s==='PTS'?ptsName():isAr()&&AR_UI[s]||s);   // a subject can rename tabs / signs with "labels" in its subject.json (English OL: Book's questions, Performance book)
// Arabic letters come with their marks (a letter + fatha/damma/kasra/sukun/shadda = one glyph); other text is split per character
const AR_MARKS='\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED';
function glyphs(s){ if(!/[\u0600-\u06FF]/.test(s)) return [...s]; const out=[]; for(const ch of s){ if(new RegExp('['+AR_MARKS+']').test(ch)&&out.length) out[out.length-1]+=ch; else out.push(ch); } return out; }
const arBase=g=>g.replace(new RegExp('['+AR_MARKS+'\\u0640\\u200d]','g'),'');
const sameLetter=(a,b)=>{ const n=c=>arBase(c).replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase(); return n(a)===n(b); };
const num=n=>isAr()?String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]):String(n);
// the direction of the subject's screens is set ONCE, here: languages left-to-right, Arabic right-to-left (course.json "rtl").
// Everything inside follows it (logical css: inline-start/end); only parts that must keep their place say direction:ltr themselves (page/question arrows, the lesson road).
function subjDir(){ const ar=isAr(); ['map','lesson','exam'].forEach(s=>{ const e=$('#'+s); e.dir='ltr'; e.lang=ar?'ar':'en'; e.classList.toggle('ar',ar); }); }
function setLook(t){ const sj=(typeof SUBJECT!=='undefined'&&SUBJECT)?SUBJECT.id:''; const k=(t==='booklet'||t==='workbook')?'booklet':'school'; const v=sj?sj+'-'+k:''; if(v) document.documentElement.dataset.look=v; else delete document.documentElement.dataset.look; }   // book look = subject + which printed book the tab belongs to (theme.css BOOK LOOKS)
function show(id){ if(id!=='lesson') setLook(''); stopVoice(); if(id!=='subjects') subjDir(); { const sj=(id!=='subjects'&&id!=='welcome'&&typeof SUBJECT!=='undefined'&&SUBJECT)?SUBJECT.id:''; [document.documentElement,document.body].forEach(e=>{ e.dataset.view=id; e.dataset.subj=sj; }); } ['welcome','subjects','map','lesson','exam'].forEach(s=>$('#'+s).hidden=s!==id); hideHint(); if(typeof appNav==='function') appNav(id); fadeIn('#'+id); }
$$('[data-icon]').forEach(b=>b.innerHTML=ICON[b.dataset.icon]);
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>b.dataset.go==='map'?openMap():openSubjects()));

/* ---------- Loading screen (shown while data, pictures or sounds load) ---------- */
let busyN=0;
function busy(on,text){ busyN=Math.max(0,busyN+(on?1:-1)); const b=$('#loading'); if(!b) return;
  if(text) $('#loadingText').textContent=text;
  if(busyN>0){ b.hidden=false; b.style.display='grid'; b.style.opacity=1; } else { b.style.opacity=0; setTimeout(()=>{ if(!busyN){ b.hidden=true; b.style.display='none'; } },300); } }

/* ---------- Sound unlock: Safari (iPad/iPhone) only lets sound start from a tap,
   so on the first taps we wake up both the speaker (Web Audio) and the talking voice. ---------- */
let unlocked=false;
const SILENT_WAV='data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
// whenSound(fn): run fn (it starts a sound by itself) now if the browser already allowed sound (a tap happened); else at the FIRST tap (Safari / iPad: no sound before a touch)
const SOUNDQ=[];
function whenSound(fn){ if(unlocked) fn(); else SOUNDQ.push(fn); }
function unlockSound(){
  if(SND.stale){ SND.stale=false; newSpeaker(); try{ speechSynthesis.cancel(); }catch(e){} }   // back from lock / another app: a fresh speaker
  try{ const c=ac(); if(c){ const b=c.createBuffer(1,1,22050), s=c.createBufferSource(); s.buffer=b; s.connect(c.destination); s.start(0); } }catch(e){}
  if(!unlocked||SND.wokeAt!==SND.ctx){ SND.wokeAt=SND.ctx;   // a tiny silent normal-audio play also wakes the phone's sound for the page
    try{ const a=new Audio(SILENT_WAV); a.volume=0; const p=a.play(); if(p&&p.catch) p.catch(()=>{}); }catch(e){} }
  try{ if('speechSynthesis' in window && !unlocked){ const u=new SpeechSynthesisUtterance('.'); u.volume=0.01; u.rate=2; speechSynthesis.speak(u); speechSynthesis.getVoices(); } }catch(e){}
  unlocked=true;
  while(SOUNDQ.length){ const f=SOUNDQ.shift(); try{ f(); }catch(e){} }   // the sounds that waited for the first tap
}
['pointerdown','touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,unlockSound,{capture:true}));
if('speechSynthesis' in window){ try{ speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices(); }catch(e){} }

// leaving (screen lock, another app): stop every sound and mark the speaker old; coming back: try to wake it, the next tap makes a new one
function sleepSound(){ SND.stale=true;
  try{ if(typeof player!=='undefined'&&player.run){ pausePlay(); readRail(); } }catch(e){}
  try{ if(typeof vStop==='function') vStop(); }catch(e){}
  try{ speechSynthesis.cancel(); }catch(e){}
  try{ if(SND.ctx&&SND.ctx.state==='running') SND.ctx.suspend(); }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(document.hidden) return sleepSound(); if(SND.ctx&&SND.ctx.state!=='closed') wakeCtx(SND.ctx); });
addEventListener('pagehide',sleepSound);
addEventListener('pageshow',e=>{ if(e.persisted) SND.stale=true; });

/* ===== THE PHONE KEYBOARD: ONE place for every screen (Marwa 2026-11-06: the account form shook while scrolling and the keyboard hid the field / the word / the Help bulb).
   While the keyboard is open: --kb = its height and body.kb-open; the screens (except the lesson, which lifts the word itself in js/wordslots.js) end right above it
   (css/base.css), so their own scroll reaches every field; the page itself never slides under the keyboard (pinned at the top, but never during the child's finger drag,
   which was the shaking); a text box the child / parent taps scrolls smoothly into the room above the keyboard. */
const KB={h:0,touch:false};
function kbRoom(){ const vv=window.visualViewport, H=document.documentElement.clientHeight||innerHeight; if(!vv) return null;   // the page height without the keyboard (iPhone keeps it; innerHeight may follow the keyboard)
  return {top:vv.offsetTop,bottom:vv.offsetTop+vv.height,kb:Math.max(0,Math.round(H-vv.height-vv.offsetTop)),H}; }
function kbPin(){ if(!KB.touch&&(scrollY||document.documentElement.scrollTop)) scrollTo(0,0); }
function kbSync(){ const R=kbRoom(); if(!R) return; const h=R.kb>120?R.kb:0;
  if(h!==KB.h){ KB.h=h; document.documentElement.style.setProperty('--kb',h+'px'); document.body.classList.toggle('kb-open',!!h); if(h) setTimeout(kbShow,60); }
  kbPin(); }
// the text box being written in stands in the room above the keyboard (its label too), scrolled smoothly inside its own screen
function kbField(t){ return t&&t.matches&&t.matches('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select')&&!['vin','qin','qxin'].includes(t.id); }
function kbShow(){ const t=document.activeElement; if(!kbField(t)) return; const R=kbRoom(); if(!R) return;
  let sc=t.parentElement; while(sc&&sc!==document.body){ const o=getComputedStyle(sc).overflowY; if((o==='auto'||o==='scroll')&&sc.scrollHeight>sc.clientHeight+1) break; sc=sc.parentElement; }
  if(!sc||sc===document.body) return;
  const box=(t.closest('label,.wl-field')||t).getBoundingClientRect(), r=t.getBoundingClientRect(), cr=sc.getBoundingClientRect();
  const top=Math.max(R.top,cr.top)+12, bottom=Math.min(R.bottom,cr.bottom)-16;
  let d=0; if(r.bottom>bottom) d=r.bottom-bottom; else if(box.top<top) d=box.top-top;
  if(Math.abs(d)>2) sc.scrollTo({top:sc.scrollTop+d,behavior:calm?'auto':'smooth'}); }   // an exact place (called again while it slides, it never overshoots)
if(window.visualViewport){ visualViewport.addEventListener('resize',kbSync); visualViewport.addEventListener('scroll',kbSync); }
addEventListener('scroll',()=>{ if(KB.h) kbPin(); },{passive:true});
document.addEventListener('touchstart',()=>{ KB.touch=true; },{passive:true,capture:true});
document.addEventListener('touchend',()=>{ KB.touch=false; setTimeout(kbPin,30); },{passive:true,capture:true});
document.addEventListener('touchcancel',()=>{ KB.touch=false; },{passive:true,capture:true});
document.addEventListener('focusin',e=>{ if(kbField(e.target)) [80,350,700].forEach(t=>setTimeout(()=>{ kbSync(); kbShow(); },t)); });

/* ONE Help (lightbulb) button for the whole app (Ahmed 2026-11-16): every place builds it with helpBtn(); its size is the --hlp-box / --hlp-icon tokens in theme.css (one rule at the end of qlayout.css) */
function helpBtn(cls,label){ const b=el('button',cls||'qhelpb',ICON.hint); b.setAttribute('aria-label',label||'Help'); return b; }
;
/* ===== js/lib.js ===== */
/* LIBRARY — plays the sounds Ahmed records/uploads in the audio library (Cloudflare Worker "easystudy-recorder") straight away.
   The library keeps, per recording, the file it replaces in the app (path, under data/), optional "alt" extra paths and "parts"
   (one recording of several syllables, cut here at the pauses). The app asks for a tiny list of what exists (the manifest), then
   fetches only the sound being played; each sound has its own versioned address, so the browser keeps it. If the library cannot be
   reached, or a sound is not in it, the file shipped inside the app is used. Works for any language: it only matches paths. */
const tokMs=(n,d)=>{ const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)); return v>0?v:d; };   // a timing token from theme.css (milliseconds)
const LIB = { url:'https://easystudy-recorder.marwasleem.workers.dev', man:null, at:0, idx:{}, bufs:{}, groups:{}, tries:0 };

function libIndex(man){
  const idx={};
  Object.entries(man||{}).forEach(([id,m])=>{
    if(!m||!m.ts) return;
    if(m.parts&&m.parts.length) m.parts.forEach((p,i)=>{ idx[p]={id,ts:m.ts,part:i,n:m.parts.length}; });
    else [m.path].concat(m.alt||[]).forEach(p=>{ if(p&&!/^grp:/.test(p)) idx[p]={id,ts:m.ts}; });
  });
  return idx;
}
/* Requests to the library are kept to a minimum: the list (manifest) is saved on the device and used as is; it is asked for again only
   when the child moves to another screen (libNav) and the last check is older than LIB_EVERY, never in the middle of a question.
   Each sound has a versioned address; its bytes are kept on the device (Cache Storage) and downloaded again only when its number changes. */
const LIB_EVERY=60000;
try{ const s=JSON.parse(localStorage.getItem('es-libman')||'null'); if(s&&s.man){ LIB.man=s.man; LIB.idx=libIndex(s.man); LIB.at=s.at||0; } }catch(e){}
function libRefresh(){   // one small request for the list, in the background; later sounds use the new list
  if(LIB.pending) return LIB.pending;
  LIB.pending=Promise.race([fetch(LIB.url+'/pub/manifest',{cache:'no-cache'}).then(r=>{ if(!r.ok) throw 0; return r.json(); }),new Promise((_,no)=>setTimeout(no,2500))])
    .then(m=>{ LIB.man=m; LIB.idx=libIndex(m); LIB.tries=0; try{ localStorage.setItem('es-libman',JSON.stringify({man:m,at:Date.now()})); }catch(e){} }).catch(()=>{ LIB.tries++; })
    .finally(()=>{ LIB.at=Date.now(); LIB.pending=null; });
  return LIB.pending;
}
function libSync(){
  if(LIB.man) return LIB.pending||Promise.resolve();   // a saved list exists: use it, no waiting, no request
  if(LIB.tries>=2&&Date.now()-LIB.at<60000) return Promise.resolve();   // library down: don't make every sound wait
  return libRefresh();
}
function libNav(){ if(Date.now()-LIB.at>LIB_EVERY) libRefresh(); }
async function libBytes(url){   // sound bytes: from the device when kept, else downloaded once and kept
  try{ if(self.caches){ const c=await caches.open('es-lib'), hit=await c.match(url); if(hit) return hit.arrayBuffer();
    const r=await fetch(url); if(!r.ok) throw 0; c.put(url,r.clone()).catch(()=>{}); return r.arrayBuffer(); } }catch(e){}
  const r=await fetch(url); if(!r.ok) throw 0; return r.arrayBuffer();
}

const libPath=url=>{ const m=/(?:^|\/)data\/(.+?)(?:\?.*)?$/.exec(url||''); return m?decodeURIComponent(m[1]):null; };

/* ---- clean-up that the import step used to do: cut silence at both ends, even out the loudness ---- */
function libPCM(buf){ const d=buf.getChannelData(0); if(buf.numberOfChannels<2) return d.slice(); const o=new Float32Array(d.length);
  for(let c=0;c<buf.numberOfChannels;c++){ const x=buf.getChannelData(c); for(let i=0;i<o.length;i++) o[i]+=x[i]/buf.numberOfChannels; } return o; }
function libFrames(d,sr){ const f=Math.round(sr*.01), n=Math.floor(d.length/f), db=new Float32Array(n);
  for(let i=0;i<n;i++){ let s=0; for(let k=i*f;k<(i+1)*f;k++) s+=d[k]*d[k]; db[i]=10*Math.log10(s/f+1e-12); } return {db,f}; }
function libMake(ctx,d,sr,a,b){   // samples a..b -> trimmed, normalised AudioBuffer
  const {db,f}=libFrames(d.subarray(a,b),sr); let s=0,e=db.length-1;
  while(s<e&&db[s]<-45) s++; while(e>s&&db[e]<-45) e--;
  const from=Math.max(0,a+(s-5)*f), to=Math.min(d.length,a+(e+6)*f); if(to-from<sr*.08) return null;
  const out=new Float32Array(to-from+Math.round(sr*.04)); let pk=0,sq=0,n=0;
  for(let i=from;i<to;i++){ out[i-from]=d[i]; const v=Math.abs(d[i]); if(v>pk) pk=v; if(v>.01){ sq+=d[i]*d[i]; n++; } }
  const rms=n?Math.sqrt(sq/n):.1, g=Math.min(.1/rms,.9/(pk||1),8); for(let i=0;i<out.length;i++) out[i]*=g;
  const r=ctx.createBuffer(1,out.length,sr); r.copyToChannel(out,0); return r;
}
function libCut(d,sr,n){   // find n sounds separated by pauses; several thresholds are tried until the count matches
  let pk=0; for(let i=0;i<d.length;i++){ const v=Math.abs(d[i]); if(v>pk) pk=v; }
  const off=-20*Math.log10(pk||1), {db,f}=libFrames(d,sr);
  for(const th of [-35,-40,-30,-45,-25]) for(const pause of [.30,.22,.40,.15,.5]){
    const segs=[]; let st=-1,quiet=0; const minQ=Math.round(pause/.01);
    for(let i=0;i<=db.length;i++){
      const loud=i<db.length&&db[i]+off>th;
      if(loud){ if(st<0) st=i; quiet=0; } else if(st>=0){ quiet++; if(quiet>=minQ||i===db.length){ const end=i-quiet+1; if(end-st>=8) segs.push([st,end]); st=-1; quiet=0; } }
    }
    if(segs.length===n) return segs.map(([a,b])=>[Math.max(0,(a-6)*f),Math.min(d.length,(b+6)*f)]);
  }
  return null;
}
// the sound for a file of the app from the library, or null (then the app's own file is used)
async function libBuffer(url,ctx){
  const path=libPath(url); if(!path) return null;
  await libSync(); const e=LIB.idx[path]; if(!e) return null;
  const key=path+'@'+e.ts; if(LIB.bufs[key]) return LIB.bufs[key];
  LIB.bufs[key]=(async()=>{
    try{
      const raw=await libBytes(`${LIB.url}/pub/a/${e.id}?v=${e.ts}`).then(b=>decodeSnd(ctx,b));
      const d=libPCM(raw), sr=raw.sampleRate;
      if(e.part==null) return libMake(ctx,d,sr,0,d.length);
      const gk=e.id+'@'+e.ts+'#'+e.n; if(!LIB.groups[gk]) LIB.groups[gk]=libCut(d,sr,e.n);
      const segs=LIB.groups[gk]; return segs?libMake(ctx,d,sr,segs[e.part][0],segs[e.part][1]):null;
    }catch(err){ return null; }
  })();
  const b=await LIB.bufs[key]; if(!b) delete LIB.bufs[key]; return b;
}


/* SENTENCES WITH VARIABLES — en-shared/q/index.json lists entries {path,template,params,vals}; their own mp3 is NOT shipped. The sentence is built here from
   pieces said once: the template's fixed parts (en-shared/t) and each value (en-shared/v), played one after the other. A recording of the whole
   sentence in the library (same path) still wins. A new combination needs no new file. */
const COMP={map:null};
async function composeMap(url){
  if(!COMP.map) COMP.map=(async()=>{ const m={};
    try{ const base=(url.match(/^(.*?\/)data\//)||['',''])[1]; const d=await (await fetch(base+'data/en-shared/q/index.json')).json();
      const T={}; d.templates.forEach(t=>T[t.id]=t);
      d.entries.forEach(e=>{ const t=T[e.template]; if(t&&t.parts&&e.vals) m[e.path]=t.parts.map(x=>x.path||e.vals[x.v]); }); }catch(e){}
    try{ const base=(url.match(/^(.*?\/)data\//)||['',''])[1]; const d=await (await fetch(base+'data/audio-compose.json')).json(); Object.assign(m,d.map||{}); }catch(e){}   // audio-compose.json: any path -> the library clips it is built from (equations = number + plus/minus/equals clips; same sentence = one clip)
    return m; })();
  return COMP.map;
}
async function composeFiles(url){ const p=libPath(url); if(!p) return null;
  const m=await composeMap(url); const l=m[p]; if(!l) return null;
  return l.map(f=>url.replace(/data\/.+?(\?.*)?$/,'data/'+f)); }

/* APP UPDATES — index.html carries APP_V (set when the app is published, see sync.sh); version.json says the newest. When the child moves
   to another screen the app quietly checks (a small file), and reloads itself on the home screen, where nothing can be lost
   (never during a question or while sound plays). On a local copy without APP_V nothing happens. */
const APPV={at:0,newer:false};
async function appNav(screen){
  libNav(); try{ navigator.serviceWorker&&navigator.serviceWorker.controller&&navigator.serviceWorker.controller.postMessage('nav'); }catch(e){}
  if(!window.APP_V||!/^https?:/.test(location.protocol)) return;
  if(!APPV.newer&&Date.now()-APPV.at>LIB_EVERY){ APPV.at=Date.now();
    try{ const v=await (await fetch('version.json',{cache:'no-cache'})).json(); if(v&&v.v&&v.v!==window.APP_V) APPV.newer=true; else if(v&&v.v) sessionStorage.removeItem('es.vtry'); }catch(e){} }
  if(APPV.newer&&screen==='subjects'&&!document.getElementById('subjects').hidden&&!(typeof player!=='undefined'&&player.run)){
    // at most 2 reloads in a row for an update: if the new page still is not there (a server still giving the old page for a moment),
    // the app simply goes on with this one instead of reloading again and again (2026-11-07)
    let n=0; try{ n=+sessionStorage.getItem('es.vtry')||0; sessionStorage.setItem('es.vtry',n+1); }catch(e){ n=9; } if(n>=2) return;
    await swFresh(); location.reload(); }
}
// the app is kept on the device (sw.js): before reloading for a new version, it drops the old files there (at most 5 s wait)
function swFresh(){ const c=navigator.serviceWorker&&navigator.serviceWorker.controller; if(!c) return Promise.resolve();
  return new Promise(ok=>{ const ch=new MessageChannel(); ch.port1.onmessage=()=>ok(); c.postMessage('update',[ch.port2]); setTimeout(ok,5000); }); }

/* chipDrag: a word piece (order questions, explainer Try) can be TAPPED or DRAGGED onto the sentence line (Marwa 2026-11-03).
   A drag that ends on/near `target` = the same as a tap (b.click()); anywhere else = the piece goes back. The pager ignores these chips (book.js own list). */
function chipDrag(b,target,ok){
  b.style.touchAction='none';
  b.addEventListener('click',e=>{ if(b._skip){ e.stopImmediatePropagation(); e.preventDefault(); } },true);
  b.addEventListener('pointerdown',e=>{ if(e.button||b.disabled||b.classList.contains('used')||(ok&&!ok())) return; const sx=e.clientX, sy=e.clientY; let gh=null;
    const mv=ev=>{ const dx=ev.clientX-sx, dy=ev.clientY-sy;
      if(!gh&&Math.hypot(dx,dy)>8){ const r=b.getBoundingClientRect(); gh=b.cloneNode(true); gh.classList.add('chipghost');
        Object.assign(gh.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',margin:0,zIndex:999,pointerEvents:'none'}); document.body.append(gh); b.style.opacity=.35; }
      if(gh){ ev.preventDefault(); gh.style.transform=`translate(${dx}px,${dy}px) scale(1.06)`; } };
    const up=ev=>{ removeEventListener('pointermove',mv); removeEventListener('pointerup',up); removeEventListener('pointercancel',up);
      if(!gh) return; gh.remove(); b.style.opacity=''; b._skip=true; setTimeout(()=>b._skip=false,80);
      const t=typeof target==='function'?target():target, r=t&&t.getBoundingClientRect(), m=40;
      if(ev.type==='pointerup'&&r&&ev.clientX>r.left-m&&ev.clientX<r.right+m&&ev.clientY>r.top-m&&ev.clientY<r.bottom+m){ b._skip=false; b.click(); b._skip=true; } };
    addEventListener('pointermove',mv,{passive:false}); addEventListener('pointerup',up); addEventListener('pointercancel',up); });
}
;
/* ===== js/curriculum.js ===== */
/* CURRICULUM — which subjects and books this child sees (Marwa 2026-11-05).
   data/curriculum.json holds the types (عام / تجريبي / private) and the private schools; the parent's pick is saved as
   {type, school} (es.curr, or the child profile later). currApply() filters the loaded data ONCE (home subjects, lessons,
   tabs, map signs, tests); every screen then simply shows what is there. Questions of a hidden book are dropped in qLoad
   (currSets) and lesson.json tabs in openLesson (currTabs). Never test for a school or subject anywhere else. */
let CURR=null, CURR_ALL=null;
const TAB_BOOK={read:'school',words:'school',quiz:'school',grammar:'school',workbook:'workbook',booklet:'booklet'};
const SET_BOOK={book:'school',lesson:'school',bq:'school',workbook:'workbook',booklet:'booklet'};   // English AL sets: lesson = the Lesson tab, bq = Book's questions (both the school's own curriculum)
function currPick(){ try{ const p=JSON.parse(localStorage.getItem('es.curr')||'null'); return p&&p.type?p:null; }catch(e){ return null; } }
function currSave(p){ try{ localStorage.setItem('es.curr',JSON.stringify(p)); }catch(e){} }
// the plan of a pick: {subjects:[ids], books:Set}. A private school = its base type + its own subjects and books.
/* SCHOOLS THAT NEED PERMISSION (Ahmed 2026-11-19): the dashboard marks a school "needs permission" (settings schoolPerm[id], default = the school's own "perm" in curriculum.json).
   A student of such a school sees only the base curriculum (its ministry books) until the admin grants THAT student (children.sgrant on the server -> curr.grant = 1 on the device). */
function schoolNeedsPerm(id){ try{ const o=(typeof ESET!=='undefined'&&ESET&&ESET.schoolPerm)||{}; if(o[id]!=null) return !!o[id]; const s=CURR&&CURR.schools&&CURR.schools.find(x=>x.id===id); return !!(s&&s.perm); }catch(e){ return false; } }
const schoolLocked=p=>!!(p&&p.school&&schoolNeedsPerm(p.school)&&!p.grant);
// the id of the curriculum that really applies (the base type of a locked school) - Easy Words keeps its curriculum as one id
const currEff=p=>p?(p.school?(schoolLocked(p)?((((CURR&&CURR.schools)||[]).find(s=>s.id===p.school)||{}).base||p.type):p.school):p.type):null;
function currRefresh(p){ if(CURR_ALL||typeof EW!=='undefined') currApply(p); }
function currPlan(p){
  const C=CURR||{types:[],schools:[]}, sc0=p&&p.school&&C.schools.find(s=>s.id===p.school), sc=schoolLocked(p)?null:sc0,
    ty=C.types.find(t=>t.id===(sc0?sc0.base:p&&p.type))||C.types.find(t=>t.subjects);
  if(!ty) return null;
  return {type:ty, school:sc||null, subjects:[...ty.subjects,...((sc&&sc.subjects)||[])], books:new Set([...ty.books,...((sc&&sc.books)||[])])};
}
let PLAN=null;
// the private school of the child (null for general / experimental). A vocab word tagged "school":"<id>" (a word that exists only in that school's booklet, Ahmed 2026-11-15) shows only for a child of that school; untagged words = the ministry curriculum, for everyone.
function currSchoolId(){ try{ if(PLAN&&PLAN.school) return PLAN.school.id; const k=typeof kidNow==='function'&&kidNow(), c=(k&&k.curr)||currPick(); return (c&&c.school&&!schoolLocked(c))?c.school:null; }catch(e){ return null; } }
const vocabFor=list=>(list||[]).filter(v=>v&&(!v.school||v.school===currSchoolId()));
const bookOn=k=>!PLAN||PLAN.books.has(k);
const tabOn=t=>bookOn(TAB_BOOK[t]||'school');
const currTabs=ts=>ts&&ts.filter(tabOn);
const currSets=sets=>(sets||[]).filter(s=>bookOn(SET_BOOK[s.book||'book']||s.book));
function currExams(sid,list){ if(!list) return list; const eb=(CURR&&CURR.examBooks&&CURR.examBooks[sid]); const out=list.filter(e=>bookOn(e.book||eb||'school')); return out.length?out:undefined; }
// one lesson of the map, as this curriculum sees it (null = the lesson belongs only to hidden books)
function currLesson(sid,l){
  const m={...l}; let had=0, kept=0;
  if(l.pages){ m.pages={}; Object.entries(l.pages).forEach(([t,v])=>{ had++; if(tabOn(t)){ m.pages[t]=v; kept++; } }); }
  if(l.tabs){ m.tabs=currTabs(l.tabs); if(!m.tabs.length) return null; }
  else if(had&&!kept) return null;
  if(l.exams) m.exams=currExams(sid,l.exams);
  return m;
}
// filter COURSE for the pick (or show everything when nothing is picked yet). Safe to call again after the pick changes.
function currApply(p){
  if(!CURR_ALL) CURR_ALL=COURSE.subjects.map(s=>({...s}));
  PLAN=p?currPlan(p):null;
  const order=PLAN?PLAN.subjects:CURR_ALL.map(s=>s.id);
  COURSE.subjects=order.map(id=>CURR_ALL.find(s=>s.id===id)).filter(Boolean).map(s0=>{
    const s={...s0}; if(!s0.lessons) return s;
    s.lessons=s0.lessons.map(l=>currLesson(s.id,l)).filter(Boolean);
    s.units=(s0.units||[]).map(u=>u.exams?{...u,exams:currExams(s.id,u.exams)}:u);
    return s;
  });
  if(typeof SUBJECT!=='undefined'&&SUBJECT) SUBJECT=COURSE.subjects.find(s=>s.id===SUBJECT.id)||null;
}
;
/* ===== js/coins.js ===== */
/* COINS + ACCESS — who can open which subject / unit / lesson, the parent's coin wallet, the share sheet and the unlock popup
   (Marwa 2026-11-05, design: docs/coins-and-admin.md). Everything is driven by ONE settings object: data/settings.json, or the copy the
   admin dashboard (admin.html) saved on the server (api). accessOf() in core.js asks coinAccess() here.
   LOCAL-FIRST: wallet, unlocks and free picks live on this device; the server (Cloudflare Worker + D1) replaces only the store functions below.
   Accounts hooks: coinParent() / coinChild() read window.ACCOUNT / window.CHILD when the accounts code sets them ({id,...}); else 'local'. */
let ESET={coins:{enabled:false,shares:[]},items:{},access:{}};
const coinParent=()=>(window.ACCOUNT&&ACCOUNT.id)||'local';
const coinChild=()=>(window.CHILD&&CHILD.id)||'';
const CS=()=>ESET.coins||{};
const coinsOn=()=>!!CS().enabled;
const cGet=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v; }catch(e){ return d; } };
const cSet=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
/* SERVER (Marwa 2026-11-05: coins for EVERY share + a bigger bonus when a new parent registers from the link). When settings "api" is set
   (e.g. "/api", the Worker built in its own thread), the server is the truth: settings from GET api/settings, and every coin action is
   ALSO sent there; its answer {wallet, unlocked, freeused} replaces the copy on this device. No api / offline = this device only (as now).
   API contract: docs/coins-and-admin.md §5. Auth = window.ACCOUNT.token (set by the accounts code) as "Authorization: Bearer". */
const API=()=>ESET.api||'';
function apiCall(path,body){ if(!API()) return Promise.resolve(null);
  const h={'Content-Type':'application/json'}; if(window.ACCOUNT&&ACCOUNT.token) h.Authorization='Bearer '+ACCOUNT.token;
  return fetch(API()+path,{method:body?'POST':'GET',headers:h,body:body?JSON.stringify(body):undefined}).then(r=>r.ok?r.json():null).catch(()=>null); }
function apiTake(r){ if(!r) return; if(r.wallet) walletSave(r.wallet); if(r.unlocked) cSet(unlockKey(),r.unlocked); if(r.freeused) cSet(freeKey(),r.freeused); paintHud(); }
// the referral: a link shared by a parent ends in ?r=<code>; it is kept on this device (es.ref) and the accounts code sends it with the sign-up
try{ const r=new URLSearchParams(location.search).get('r'); if(r) localStorage.setItem('es.ref',JSON.stringify({code:r,at:Date.now()})); }catch(e){}
const refCode=()=>(cGet('es.ref',null)||{}).code||null;
const ESET_P=get(typeof SETTINGS_FILE!=='undefined'?SETTINGS_FILE:'data/settings.json').catch(()=>null).then(async d=>{
  ESET=d||ESET;   // no device copy: the real settings come from the server below
  if(ESET.api){ const s=await apiCall('/settings'); if(s&&s.coins) ESET={...s,api:ESET.api,whatsapp:s.whatsapp||ESET.whatsapp,adminEmail:s.adminEmail||ESET.adminEmail}; apiTake(await apiCall('/wallet'+(coinChild()?'?child='+encodeURIComponent(coinChild()):''))); }
  ESET.items=ESET.items||{}; ESET.coins=ESET.coins||{shares:[]};
  try{ if(typeof currRefresh==='function'&&typeof kidNow==='function'){ const k=kidNow(); currRefresh((k&&k.curr)||currPick()); } }catch(e){}   // the dashboard's school permission arrives with the settings
  if(typeof COURSE!=='undefined'&&COURSE){ paintHud(); if(!$('#subjects').hidden&&typeof drawSubjects==='function') drawSubjects(); else if(!$('#map').hidden&&typeof drawMap==='function') openMap(); }
});

/* ---------- store (this device) ---------- */
const unlockKey=()=>'es.unlocked';   // welcome.js swaps this key when the child changes (KID_KEYS), so it is per child already
const freeKey=()=>'es.freeused';   // per child too (welcome.js KID_KEYS)
function wallet(){ const k='es.wallet.'+coinParent(); let w=cGet(k,null);
  if(!w){ w={bal:0,hist:[],last:{}}; cSet(k,w); } return w; }
const walletSave=w=>cSet('es.wallet.'+coinParent(),w);
const coinBal=()=>wallet().bal;
function addUnlock(id,coins,kind){ const s=cGet(unlockKey(),[]); if(!s.includes(id)) s.push(id); cSet(unlockKey(),s); if(typeof subSeason==='function') subSeason();   // opened lessons end on 31 Aug too
  const w=wallet(); w.hist.push({k:kind,id,n:-coins,at:Date.now(),child:coinChild()}); w.bal-=coins; walletSave(w);
  apiCall('/unlock',{child:coinChild(),id,kind:kind==='unlock-unit'?'unit':'lesson'}).then(apiTake); }

/* ---------- where an item sits (for the free rules) ---------- */
// the subject of an id: 's:<subj>', 'u:<subj>:<unit>', 'l:<subj>-<folder>'
function subjOf(id){ if(!id) return null; const p=id.split(':'); if(p[0]==='s'||p[0]==='u') return COURSE.subjects.find(s=>s.id===p[1]);
  return COURSE.subjects.find(s=>s.lessons&&s.lessons.some(l=>'l:'+l.id===id)); }
function lessonOf(id){ const s=subjOf(id); return s&&s.lessons.find(l=>'l:'+l.id===id); }
const unitIdOf=(s,l)=>'u:'+s.id+':'+l.unit;

/* ---------- THE access rule ----------
   1. the admin's own state for this item (ESET.items[id].st = open | soon | locked) wins over everything (soon even when built)
   2. no content = soon
   3. coins off: the old rule (item "status" in the subject json, the free-trial rule in course.json "access")
   4. coins on: the free policy (ESET.access.free) decides; everything else is locked and costs coins (lesson or whole unit) */
function coinAccess(o,hasContent,id,idx,kind){
  const it=(id&&ESET.items[id])||{}, C=CS(), A=COURSE.access||{}, un=new Set(cGet(unlockKey(),[]));
  const cost=it.coins!=null?it.coins:o.coins!=null?o.coins:id&&id[0]==='l'?(+C.lessonCost||0):(A.coins||0);
  const out=st=>({st,coins:cost,kind:kind||(id&&id[0]==='l'?'lesson':'subject')});
  if(it.st==='soon') return out('soon');
  if(!hasContent) return out('soon');
  if(it.st==='open') return out('open');
  if(id&&promoOpen(un,id)) return out('open');
  if(id&&id[0]!=='s'&&typeof subOpen==='function'&&subOpen()) return out('open');   // a paid term (or the 24 h after the receipt) opens every lesson of this child
  if(it.st==='locked') return out('locked');
  if(!coinsOn()){ let st=o.status||'open';
    if(st==='open'&&!o.status&&A.enabled&&A.trial&&kind==='unit'&&idx>=(A.trial.units||1)) st='locked';
    return out(st); }
  if(!id||id[0]==='s') return out(o.status||'open');   // coins never lock a whole subject (the admin can, with items)
  return out(isFree(id,kind,idx)?'open':'locked');
}
// opened for this child: the item itself, or (promo codes) its whole unit, its whole subject, or '*' = every subject
function promoOpen(un,id){ if(un.has(id)||un.has('*')) return true; const s=id[0]==='s'?null:subjOf(id); if(!s) return false;
  if(un.has('s:'+s.id)) return true; const l=id[0]==='l'&&lessonOf(id); return !!(l&&un.has(unitIdOf(s,l))); }
const coinUnlocked=id=>promoOpen(new Set(cGet(unlockKey(),[])),id);
// the free policy for a new child: ESET.access.free = {mode, count, list}
//  first      = the first <count> built lessons of every subject
//  firstUnit  = the first <count> units of every subject
//  pick       = the child picks <count> lessons anywhere (tap a locked lesson -> open it free)
//  pickUnit   = the child picks <count> whole units anywhere
//  list       = only the lessons / units the admin listed (ids like l:arabic-u1l1, u:math:1)
function isFree(id,kind,idx){
  const F=(ESET.access&&ESET.access.free)||{mode:'first',count:3}, s=subjOf(id); if(!s) return true;
  const n=(F.per&&F.per[s.id]!=null&&F.per[s.id]!==''&&+F.per[s.id]>=0)?+F.per[s.id]:(+F.count||0);   // per-subject free count (dashboard) or the default
  if(kind==='unit'){ const ui=(s.units||[]).findIndex(u=>'u:'+s.id+':'+u.unit===id);
    if(F.mode==='firstUnit') return ui<n;
    if(F.mode==='pickUnit') return false;
    return true; }   // lesson modes never lock a whole unit: the locks sit on the lessons
  const l=lessonOf(id); if(!l) return true; const uid=unitIdOf(s,l);
  if(F.mode==='first'){ const built=s.lessons.filter(x=>x.file&&!x.hidden); return built.indexOf(l)<n; }
  if(F.mode==='list') return (F.list||[]).includes(id)||(F.list||[]).includes(uid);
  return true;   // unit modes: the unit decides (the map locks its lessons); pick: locked until picked
}
// free picks left; perSubject (Marwa 2026-11-05: the child picks ONE free lesson in EACH subject) counts the picks of this subject only
function freeLeft(){ return 0; }   // no more free picks (signup gift removed 2026-11-11)
/* ---------- coin pictures ---------- */
const COIN=`<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="22" r="16" fill="#C98A12" stroke="var(--btn-ol)" stroke-width="2.6"/><circle cx="20" cy="19" r="16" fill="#FFD23F" stroke="var(--btn-ol)" stroke-width="2.6"/><circle cx="20" cy="19" r="11" fill="none" stroke="#E0A419" stroke-width="2.4"/><path d="M20 12v14M16.5 15.5h5.5a2.5 2.5 0 0 1 0 5h-4a2.5 2.5 0 0 0 0 5H24" fill="none" stroke="#B57A0C" stroke-width="2.6" stroke-linecap="round"/><path d="M11 13a11 11 0 0 1 6-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></svg>`;
const SHAREIC='<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.500"/><circle cx="18" cy="6" r="2.500"/><circle cx="18" cy="18" r="2.500"/><path d="M8.200 10.900l7.600-3.800M8.200 13.100l7.600 3.800"/></svg>';
const CT=(ar,en)=>ar;   // credits, share and unlock popups are for the PARENT: always Arabic (Marwa 2026-11-05), whatever the subject; en kept for later

/* ---------- CREDITS (Marwa 2026-11-05: "credits", not coins; shown ONLY in the parent's account, not on the child's screens) ----------
   The HUD chip is gone: coinPaint only removes an old one. The balance lives in the children popup (welcome.js kidMenu -> creditBtn). */
function coinPaint(){ $$('.coinhud').forEach(c=>c.remove()); }
const CRED=n=>`${num(n)} ${CT('كريدت','credits')}`;
/* the parent popups (lock, get credits, subscribe) write every number with 0-9 and the word "Credits" in English (Ahmed 2026-11-20), whatever the subject */
const EN=n=>String(n).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const CRE=n=>`<bdi dir="ltr" class="cre">${EN(n)} ${+n===1?'Credit':'Credits'}</bdi>`;
const balLine=n=>`<div class="coinbig" dir="ltr"><span class="ic">${COIN}</span><b>${EN(n)}</b><span class="lab">Credits</span></div>`;

/* ---------- popups (one overlay of our own, the app's popup look) ---------- */
function coinPop(html,onOpen){
  let o=$('#coinPop'); if(!o){ o=el('div','overlay'); o.id='coinPop'; document.body.append(o); o.addEventListener('click',e=>{ if(e.target===o) coinDismiss(); }); }
  o.classList.remove('pro'); o.innerHTML=`<div class="rays"></div><div class="popup coinpop" role="dialog"><button class="rb popx" aria-label="Close" data-icon="close">${ICON.close}</button>${html}</div>`;
  $('.popx',o).addEventListener('click',coinDismiss); o.hidden=false; if(typeof spinRays==='function') spinRays(o);
  if(anim) G.from($('.popup',o),{scale:.6,opacity:0,duration:.35,ease:'back.out(2)'});
  if(onOpen) onOpen($('.popup',o));
}
// the same popup in the calm parent-area look (white card, flat buttons; css/account.css .pro)
function coinPopPro(html,onOpen){ coinPop(html,p=>{ p.parentNode.classList.add('pro'); if(onOpen) onOpen(p); }); }
const coinClose=()=>{ const o=$('#coinPop'); if(o) o.hidden=true; };
// the X / a tap outside a lock popup opened by lockGuard (a page of a locked lesson): back to the map
let lockBack=null;
const coinDismiss=()=>{ coinClose(); const f=lockBack; lockBack=null; if(f) f(); };
/* EVERY way into a lesson or one of its pages (map sign, page picker, deep link, resume, an Easy Words word) goes through here (Ahmed 2026-11-20).
   A locked lesson (or a lesson of a locked unit) does NOT open: the same locked popup (credits / term subscription) shows; unlocked -> resume() opens what was asked, closed -> the map. Returns true when blocked. */
function lockGuard(m,resume,isWords){
  if(!m||!m.id||m.testsOnly||!m.file&&!isWords) return false;
  const id='l:'+m.id; let st=coinAccess(m,true,id,0,'lesson').st;
  if(st==='open'&&!isWords&&typeof SUBJECT!=='undefined'&&SUBJECT&&SUBJECT.units&&!((ESET.items||{})[id]||{}).st&&!coinUnlocked(id)){
    const u=SUBJECT.units.find(x=>x.unit===m.unit);
    if(u&&coinAccess(u,true,'u:'+SUBJECT.id+':'+u.unit,SUBJECT.units.indexOf(u),'unit').st==='locked') st='locked'; }
  if(st!=='locked') return false;
  const back=()=>{ if(typeof openMap==='function') openMap(); };
  lockBack=back;
  lockTap('lesson',m,coinAccess(m,true,id,0,'lesson').coins,`<span class="jlockbig">${typeof LOCK!=='undefined'?LOCK:''}</span>`,()=>{ lockBack=null; if(resume) resume(); else back(); });
  return true;
}
const bigCoins=balLine;

// a grown-up question first (Ahmed 2026-11-11, replaces typing the parent's name): 3 numbers written as ARABIC WORDS ("واحد - ثلاثة - خمسة"); the parent taps them on a keypad.
// Guards the account page and every credits / unlock sheet. Passed once = no more questions until the app is opened again. Switch off: settings coins.parentGate=false.
let gateOk=false;
const GATEW=['','واحد','اثنين','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة'], GATED='٠١٢٣٤٥٦٧٨٩';
function parentGate(then){
  if(gateOk||CS().parentGate===false) return then();
  const want=[0,0,0].map(()=>1+Math.floor(Math.random()*9)); let got=[];
  coinPop(`<h2 class="outline">لولي الأمر</h2><p class="msg-text">اضغط الأرقام دي بالترتيب:</p><p class="msg-text gate-w">${want.map(n=>GATEW[n]).join(' - ')}</p>
    <div class="gate-dots" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="gate-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" class="gate-k" data-n="${n}">${GATED[n]}</button>`).join('')}<span></span><button type="button" class="gate-k gate-x" aria-label="مسح">⌫</button></div>`, p=>{
    p.parentNode.classList.add('pro');   // the parent area is soft and calm, not the game look (css/account.css)
    const dots=$$('.gate-dots i',p), paint=()=>dots.forEach((d,i)=>d.classList.toggle('on',i<got.length));
    $$('.gate-k[data-n]',p).forEach(k=>k.addEventListener('click',()=>{ if(got.length>=3) return; got.push(+k.dataset.n); paint();
      if(got.length<3) return;
      if(got.join()===want.join()){ gateOk=true; coinClose(); then(); }
      else { if(anim) G.fromTo($('.gate-dots',p),{x:-10},{x:0,duration:.4,ease:'elastic.out(1,.3)'}); got=[]; setTimeout(paint,250); } }));
    $('.gate-x',p).addEventListener('click',()=>{ got.pop(); paint(); }); });
}

/* ---------- the share sheet ---------- */
// ?r= = the parent's ref code or server id (js/sync.js); never the email (no server = no r at all)
function shareLink(){ const u=CS().shareUrl||location.origin+location.pathname.replace(/[^/]*$/,''), A=window.ACCOUNT||{}, r=A.ref||(A.token&&A.id&&!String(A.id).includes('@')?A.id:'');
  return r?u+(u.includes('?')?'&':'?')+'r='+encodeURIComponent(r):u; }
/* SHARE (Ahmed 2026-11-19): NO device share sheet any more. One button per app - WhatsApp, Facebook, Messenger, Telegram - each opens THAT app with the dashboard message (settings coins.shareText,
   dashboard "رسالة الدعوة والمشاركة") + the parent's link already written; the parent only picks who gets it and sends inside that app. Any share = 1 credit, at most dailyCap (20) shares a day (see the share check below).
   [key, Arabic name, English name, colour, icon] */
const SHAPPS=[
 ['wa','واتساب','WhatsApp','#25D366','<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5a9.400 9.400 0 0 0-8 14.300L2.600 21.500l4.800-1.300A9.400 9.400 0 1 0 12 2.500zm0 17.200c-1.500 0-2.900-.4-4.100-1.200l-.3-.2-2.800.8.8-2.700-.2-.3a7.700 7.700 0 1 1 6.600 3.600zm4.200-5.700c-.2-.1-1.400-.7-1.600-.8-.2-.1-.4-.1-.5.100l-.7.900c-.1.200-.3.200-.5.100-1.300-.6-2.200-1.200-3-2.600-.2-.4.200-.4.600-1.200.1-.1 0-.3 0-.4l-.7-1.700c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.100-.6.300-.6.600-.9 1.300-.9 2.100 0 .9.400 1.800 1 2.500 1.100 1.500 2.500 2.600 4.300 3.300 1.600.6 2.200.5 3 .4.600-.1 1.500-.6 1.700-1.200.2-.6.200-1.100.1-1.200-.1-.1-.2-.2-.5-.3z"/></svg>'],
 ['fb','فيسبوك','Facebook','#1877F2','<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13.500 21.500v-8h2.700l.4-3.200h-3.100V8.300c0-.9.300-1.500 1.600-1.500h1.700V3.900c-.3 0-1.300-.1-2.400-.1-2.400 0-4 1.400-4 4.100v2.400H7.700v3.200h2.700v8z"/></svg>'],
 ['ms','ماسنجر','Messenger','#0084FF','<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.500 2 2 6.200 2 11.400c0 2.900 1.400 5.500 3.700 7.200V22l3.400-1.900c.9.300 1.900.4 2.900.4 5.500 0 10-4.200 10-9.500S17.500 2 12 2zm1 12.800l-2.500-2.700-4.900 2.700 5.400-5.700 2.600 2.700 4.800-2.700z"/></svg>'],
 ['tg','تيليجرام','Telegram','#27A7E7','<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.200 3.600L2.900 10.700c-1.200.5-1.200 1.200-.2 1.500l4.700 1.500 1.800 5.600c.2.600.1.800.7.800.5 0 .7-.2 1-.5l2.200-2.200 4.600 3.400c.8.500 1.500.2 1.800-.8l3-14.200c.3-1.200-.5-1.800-1.300-1.200zM8.800 13.200l9.500-6c.4-.3.800-.1.500.2l-7.800 7.100-.3 3.200z"/></svg>']];
const shareMobile=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Mac/.test(navigator.platform));
// the address that opens the app itself (a phone) or its web page (a computer)
function shareHref(k,text,url){ const e=encodeURIComponent, all=(text+(url?' '+url:'')).trim(), m=shareMobile();
  if(k==='wa') return m?'whatsapp://send?text='+e(all):'https://wa.me/?text='+e(all);
  if(k==='tg') return m?'tg://msg?text='+e(all):'https://t.me/share/url?url='+e(url||' ')+'&text='+e(text);
  if(k==='ms') return m?'fb-messenger://share/?link='+e(url||location.origin+location.pathname):'https://www.messenger.com/';   // Messenger takes a link only: the message text is copied (shareGo)
  return 'https://www.facebook.com/sharer/sharer.php?u='+e(url||(location.origin+location.pathname))+'&quote='+e(text); }
// open the app: its own address scheme replaces the page (the app goes to the background, the share check below sees it leave), a web address opens in a new tab
function shareGo(k,text,url){ if(text==null){ text=CS().shareText||CS().appName||'EasyStudy'; url=shareLink(); }
  const h=shareHref(k,text,url||'');
  if(k==='ms'){ try{ navigator.clipboard.writeText((text+' '+(url||'')).trim()); }catch(x){} COPIED=!shareMobile(); }   // Messenger cannot take a text: the full message is copied, the parent pastes it there
  if(/^https?:/.test(h)) window.open(h,'_blank'); else location.href=h; }
let COPIED=false;
// the popup with the four buttons; onGo(key) runs when one is tapped (the share check starts there)
function sharePick(onGo,after,noPay){ const w=wallet(), p=noPay?0:sharePays(w);
  coinPopPro(`<h2 class="outline">${CT('ادعو صديق','Invite a friend')}</h2><p class="msg-text">${CT('اختار التطبيق، وبعدين اختار صاحبك وابعت الرسالة من جواه','Pick an app, then choose your friend and send the message there')}</p>
    <div class="shgrid">${SHAPPS.map(a=>`<button type="button" class="shbtn" data-sh="${a[0]}" style="--shc:${a[3]}"><i>${a[4]}</i><span>${CT(a[1],a[2])}</span></button>`).join('')}</div>${p?`<p class="msg-text shpay">${CT('+'+num(p)+' كريدت لكل مشاركة','+'+num(p)+' credit per share')}</p>`:''}`, pp=>{
    $$('[data-sh]',pp).forEach(b=>b.addEventListener('click',()=>{ if(onGo) onGo(b.dataset.sh); shareGo(b.dataset.sh); }));
    if(after) $('.popx',pp).addEventListener('click',after); }); }
// how many credits one share pays now (0 = today's cap of shares is reached)
function sharePays(w){ const C=CS(), per=C.shareCoins!=null?+C.shareCoins:1, cap=C.dailyCap!=null?+C.dailyCap:20, day=new Date().toDateString(),
    n=w.hist.filter(h=>h.k==='share'&&new Date(h.at).toDateString()===day).length;
  return n<cap?per:0; }
/* SHARE CHECK (Marwa 2026-11-05: "do the most we can to make sure the share happened"). A web page can never see inside WhatsApp / Facebook,
   so the strongest proof on the device is: after the tap the app must really LEAVE (WhatsApp / Facebook / Messenger opened over it; for
   "copy link" the parent goes to another app to paste) within a few seconds, stay away long enough to send (coins.shareMinSec, default 8 s),
   and come BACK. A tap with no leaving, or a quick bounce back, pays nothing. On top: one pay per type per cooldownH, the day cap, and on the
   server the per-account / device / IP limits plus the referral bonus (the only share that is fully proven: a new parent registers). */
let SHR=null;
const shareMin=()=>(CS().shareMinSec!=null?+CS().shareMinSec:8)*1000;
function shareArm(k,p,after){ const me=SHR={p,at:Date.now(),left:0,after}, copy=k==='ms'&&!shareMobile(), leaveIn=copy?60000:6000;
  setTimeout(()=>{ if(SHR===me&&!SHR.left){ SHR=null; shareNote(copy?'copied':'no',after); } },leaveIn); }
function shareStart(after){ const w=wallet(), p=sharePays(w);
  if(!p) return sharePick(null,after);   // the day's shares are paid: the share still opens, no credits
  sharePick(k=>shareArm(k,p,after),after); }
document.addEventListener('visibilitychange',()=>{ if(!SHR) return;
  if(document.hidden){ if(!SHR.left) SHR.left=Date.now(); return; }
  if(!SHR.left) return; const s=SHR; SHR=null;
  if(Date.now()-s.left<shareMin()) return shareNote('short',s.after);
  sharePay(s.after); });
function sharePay(after){ const w=wallet(), p=sharePays(w); if(!p) return coinSheet(after);
  w.bal+=p; w.hist.push({k:'share',n:p,at:Date.now()}); walletSave(w); paintHud();
  apiCall('/share',{}).then(apiTake);   // the server pays again by its own rules and sends the true wallet
  if(typeof chime==='function') chime(2);
  coinPopPro(`<h2 class="outline">${CT('شكرًا!','Thank you!')}</h2>${balLine(w.bal)}<p class="msg-text">${CT(`أخدت ${CRED(p)} على المشاركة`,`You got ${CRED(p)} for sharing`)}</p><button class="pill green" data-ok>${CT('تمام','OK')}</button>`,
    pp=>$('[data-ok]',pp).addEventListener('click',()=>coinSheet(after))); }
function shareNote(why,after){
  const txt={no:CT('ملحقناش نشوف المشاركة اتبعتت. ابعت الرسالة وارجع هنا عشان تاخد الكريدتس','We did not see the share go out. Send the message, then come back here to get the credits'),
    short:CT('رجعت بسرعة قوي. ابعت الرسالة فعلًا وارجع هنا عشان تاخد الكريدتس','You came back too fast. Really send the message, then come back here for the credits'),
    cap:CT('خلصت مشاركات النهارده (٢٠). كمّل بكرة','You reached today\'s 20 shares. Continue tomorrow'),
    copied:CT('الرابط اتنسخ. الصقه في محادثة أو جروب وابعته، وارجع هنا عشان تاخد الكريدتس','The link is copied. Paste it in a chat or group and send it, then come back here for the credits')}[why];
  coinPopPro(`<h2 class="outline">${why==='copied'?CT('اتنسخ','Copied'):why==='cap'?CT('كفاية النهارده','Enough for today'):CT('لسه','Not yet')}</h2><p class="msg-text">${txt}</p><button class="pill green" data-ok>${CT('تمام','OK')}</button>`,
    pp=>$('[data-ok]',pp).addEventListener('click',()=>why==='copied'?coinClose():coinSheet(after))); }
const shareGrid=()=>`<div class="shgrid">${SHAPPS.map(a=>`<button type="button" class="shbtn" data-sh="${a[0]}" style="--shc:${a[3]}"><i>${a[4]}</i><span>${CT(a[1],a[2])}</span></button>`).join('')}</div>`;
// the credits popup: the message is built from the dashboard numbers (credits per share, shares per day), then ONE button per app
function coinSheet(after){ parentGate(()=>{
  const w=wallet(), p=sharePays(w), C=CS(), per=C.shareCoins!=null?+C.shareCoins:1, cap=C.dailyCap!=null?+C.dailyCap:20;
  coinPopPro(`<h2 class="outline">${CT('اجمع','Get')} Credits</h2>${balLine(w.bal)}
    <p class="msg-text shrule">${CT('شارك التطبيق مع أصحابك. كل مشاركة =','Share the app with friends. Every share =')} ${CRE(per)}${cap?`${CT('، بحد أقصى','. Up to')} <bdi dir="ltr" class="cre">${EN(cap)}</bdi> ${CT('مشاركة في اليوم','shares a day')}`:''}.</p>
    ${shareGrid()}
    <p class="msg-text cnote">${p?CT('ابعت الرسالة فعلًا وارجع هنا عشان الكريدتس تتحسب','Really send the message, then come back here so it counts'):CT('خلصت مشاركات النهارده، لسه تقدر تشارك من غير Credits','Today\'s shares are done, you can still share without Credits')}</p>`, pp=>{
    $$('[data-sh]',pp).forEach(b=>b.addEventListener('click',()=>{ if(p) shareArm(b.dataset.sh,p,after); shareGo(b.dataset.sh); }));
    if(after) $('.popx',pp).addEventListener('click',after);
  }); }); }

/* ---------- INVITE A FRIEND (Ahmed 2026-11-17) — account page row "دعوة صديق" ----------
   Every parent has ONE personal link (shareLink(): the app address + ?r=<their code>); a friend who registers from it is tied to that parent on the server (parents.ref_by).
   When the admin activates a subscription of that friend, the server pays the parent settings.coins.referral.subCoins credits (once per subscription, never to oneself) and the wallet
   history gets a 'refsub' row (who = the student's first name). That row is the notice: it shows on the notifications page (unread until tapped) and in the credits history. */
const refSeen=()=>cGet('es.refSeen',[]);
function refNotices(){ const S=new Set(refSeen()); return ((wallet().hist)||[]).filter(h=>h.k==='refsub'||h.k==='referral').map(h=>({k:{id:'ref',name:h.who||''},key:'ref:'+h.at,t:h.at,r:{st:'ref',sub:h.k==='refsub',n:h.n,who:h.who||'',seen:S.has(h.at)}})); }
function refMark(keys){ const S=new Set(refSeen()); refNotices().forEach(x=>{ if(!keys||keys.includes('ref|'+x.key)) S.add(x.t); }); cSet('es.refSeen',[...S].slice(-300)); }
// the parent's code makes the link: a device that lost it (an old sign-in, an ended session) asks the server again, or signs in again with the contact kept on the device (no code any more)
async function inviteEnsure(){
  const A0=window.ACCOUNT||{}; if(A0.ref&&A0.token) return true;
  if(typeof syCall!=='function') return false;
  const s=typeof sySession==='function'&&sySession();
  if(s&&s.token){ const r=await syCall('/me'); if(!r) return false;
    if(r.j&&r.j.ok&&r.j.me&&r.j.me.ref){ const me=r.j.me; wlSet('es.account',{...(acct()||{}),ref:me.ref}); wlSet('es.session',{...(sySession()||{}),ref:me.ref}); window.ACCOUNT={...(window.ACCOUNT||{}),ref:me.ref,token:s.token}; return true; } }
  const a=acct(); if(a&&(a.email||a.phone)&&await syApi()){
    const r=await syCall('/auth/login',{email:a.email||'',phone:a.phone||'',curr:currPick()||{},device:typeof syDevice==='function'?syDevice():''});
    if(r&&r.j&&r.j.ok&&r.j.me){ syTake(r.j.token,r.j.me); if(typeof syPushKids==='function') syPushKids(); return !!(window.ACCOUNT&&window.ACCOUNT.ref); } }
  return false; }
function invitePage(tried){
  let o=$('#invPage'); if(!o){ o=el('div','acctpage',''); o.id='invPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Invite a friend'); document.body.append(o); }
  const A=window.ACCOUNT||{}, ok=!!(A.ref&&A.token), url=ok?shareLink():'', R=CS().referral||{}, n=Math.max(0,+R.subCoins||0), n0=R.on===false?0:Math.max(0,+R.coins||0),
    HH=((wallet().hist)||[]), sg=HH.filter(h=>h.k==='ref'||h.k==='referral'), sb=HH.filter(h=>h.k==='refsub'), tot=a=>a.reduce((x,h)=>x+(+h.n||0),0);
  const wait=!ok&&tried!=='done';
  const steps=[['ابعت لينكك لأصحابك',''],...(n0?[[`لما صديقك يسجّل حساب جديد من لينكك هتاخد <b>${num(n0)}</b> كريدت`,'']]:[]),...(n?[[`ولما صديقك يشترك اشتراك مدفوع هتاخد <b>${num(n)}</b> كريدت`,'']]:[])];
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back inv-back" aria-label="Back">${ICON.back}</button><h2>دعوة صديق</h2></div>
    <div class="ac-in inv-card"><section class="ac-card inv-hero"><i class="inv-ic">${ACH.inv}</i><h3>شارك لينكك واكسب كريدتس</h3><p>كل ما صاحب ليك يستخدم التطبيق من لينكك، رصيدك بيزيد.</p></section>
      <section class="ac-card"><h3>إزاي بتكسب؟</h3><ol class="inv-steps">${steps.map(x=>`<li><i></i><span>${x[0]}</span></li>`).join('')}</ol></section>
      <section class="ac-card">${ok?`<label class="inv-l"><span>لينكك</span></label><div class="inv-row"><input class="inv-url" type="text" readonly dir="ltr" value="${wlEsc(url)}"><button class="pill green inv-copy" type="button">نسخ</button></div><p class="pf-ok inv-ok" hidden>اتنسخ</p>
        <p class="inv-or">أو ابعته على</p><div class="inv-apps">${SHAPPS.map(a=>`<button type="button" class="shbtn" data-sh="${a[0]}" style="--shc:${a[3]}"><i>${a[4]}</i><span>${a[1]}</span></button>`).join('')}</div>`
      :wait?`<p class="inv-wait">جاري تجهيز لينكك…</p>`
      :`<p class="wl-err">مقدرناش نجهز لينكك دلوقتي. اتأكد إنك متصل بالإنترنت وجرب تاني.</p><button class="pill green inv-retry" type="button">جرب تاني</button>`}</section>
      <div class="inv-st2"><div class="ac-card"><small>كريدتس من تسجيل الأصدقاء</small><b>${num(tot(sg))}</b><em>${num(sg.length)} صديق</em></div><div class="ac-card"><small>كريدتس من اشتراك الأصدقاء</small><b>${num(tot(sb))}</b><em>${num(sb.length)} اشتراك</em></div></div></div>`;
  $('.inv-back',o).addEventListener('click',()=>o.hidden=true);
  const cp=$('.inv-copy',o), rt=$('.inv-retry',o);
  if(cp) cp.addEventListener('click',async()=>{ const f=$('.inv-url',o), t=(CS().shareText||'')+' '+url; try{ await navigator.clipboard.writeText(t.trim()); }catch(e){ f.select(); try{ document.execCommand('copy'); }catch(x){} } $('.inv-ok',o).hidden=false; });
  $$('[data-sh]',o).forEach(b=>b.addEventListener('click',()=>shareGo(b.dataset.sh)));
  if(rt) rt.addEventListener('click',()=>invitePage());
  if(!tried) document.body.append(o); o.hidden=false; if(!tried) pop('.ac-card',{y:14});
  if(!ok&&!tried) inviteEnsure().then(g=>{ if(!o.hidden) invitePage('done'); }); }

/* ---------- the parent's credits page (children popup -> "رصيدي") — total, from shares, from invites, then the history ---------- */
const HK={gift:['هدية التسجيل','Sign-up gift'],share:['مشاركة','Share'],ref:['ولي أمر سجّل من رابطك','A parent joined from your link'],refsub:['اشتراك من دعوتك','A friend subscribed from your link'],referral:['ولي أمر سجّل من رابطك','A parent joined from your link'],
  promo:['برومو كود','Promo code'],'unlock-lesson':['فتح درس','Unlocked a lesson'],'unlock-unit':['فتح وحدة','Unlocked a unit']};
function histName(h){ const b=HK[h.k]||[h.k,h.k]; let x=CT(b[0],b[1]);
  if(h.k==='promo') x+=': '+promoWhat(h.id);
  if(h.k==='refsub'&&h.who) x+=': '+h.who;
  if(h.id&&h.k==='unlock-lesson'){ const l=lessonOf(h.id), s=subjOf(h.id); if(l) x+=': '+(s?s.name+' · ':'')+(l.title||''); }
  if(h.id&&h.k==='unlock-unit'){ const p=h.id.split(':'), s=subjOf(h.id); x+=': '+(s?s.name+' · ':'')+CT('الوحدة ','Unit ')+num(p[2]||''); }
  return x; }
function creditBtn(){ return coinsOn()?`<button class="pill yellow wl-big wl-cred"><span class="wl-ar">${CT('رصيدي:','My credits:')} ${CRED(coinBal())}</span><small>${CT('اجمع كريدتس وافتح دروس','Earn credits, open lessons')}</small></button>`:''; }
function creditsPage(){ parentGate(()=>{
  let o=$('#credPage'); if(!o){ o=el('div','acctpage',''); o.id='credPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Credits'); document.body.append(o); }
  const w=wallet(), H=w.hist||[], sum=f=>H.filter(f).reduce((a,h)=>a+(+h.n||0),0);
  const sh=sum(h=>h.k==='share'), inv=sum(h=>h.k==='ref'||h.k==='referral'||h.k==='refsub');
  const dt=at=>{ try{ return new Date(at).toLocaleDateString('ar-EG',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return ''; } };
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back cr-back" aria-label="Back">${ICON.back}</button><h2>رصيدي</h2></div>
    <div class="ac-in"><section class="ac-card cr-tot"><small>إجمالي الكريدتس</small><b>${num(w.bal)}</b></section>
      <div class="cr-cols"><div class="ac-card"><b>${num(inv)}</b><small>من الدعوات</small></div><div class="ac-card"><b>${num(sh)}</b><small>من المشاركة</small></div></div>
      <section class="ac-card cr-cta"><h3>محتاج كريدتس أكتر؟</h3><p>ادعو أصحابك أو شارك التطبيق واكسب كريدتس تفتح بيها دروس جديدة.</p>
        <div class="cr-btns"><button class="pill green cr-inv" type="button">دعوة أصدقاء</button><button class="pill cream cr-share" type="button">شارك التطبيق</button></div></section>
      <section class="ac-card"><h3>السجل</h3><div class="cr-hist">${H.slice().reverse().map(h=>`<div class="crow"><span class="cpm ${h.n<0?'m':'p'}">${h.n<0?'−':'+'}</span><span class="cn"><b>${wlEsc(histName(h))}</b><small>${dt(h.at)}</small></span><span class="ca ${h.n<0?'m':'p'}" dir="ltr">${h.n<0?'-':'+'}${num(Math.abs(h.n))}</span></div>`).join('')||'<p class="cnote">لسه مفيش حاجة</p>'}</div></section></div>`;
  $('.cr-back',o).addEventListener('click',()=>o.hidden=true);
  $('.cr-inv',o).addEventListener('click',()=>invitePage());
  $('.cr-share',o).addEventListener('click',()=>coinSheet(creditsPage));
  document.body.append(o); o.hidden=false; pop('.ac-card',{y:14}); }); }

/* ---------- a tap on a locked lesson / unit ----------
   kind 'lesson': open this lesson (lessonCost), or its whole unit (unitCost) when unitCost is set; a free pick when the policy gives picks.
   kind 'unit':   open the whole unit (unitCost). Credits off, or no price = "this opens later". onOpen() redraws the map. */
function lockTap(kind,item,cost,art,onOpen){
  const C=CS(), title=CT('مقفول','Locked');
  const kid=typeof kidNow==='function'?kidNow():null, subOk=kind==='lesson'&&!!kid&&typeof subIsOn==='function'&&subIsOn()&&typeof subTermsFor==='function'&&subTermsFor(kid).some(x=>x[0]===subTermNow());
  if(kind!=='lesson'||(!coinsOn()&&!subOk)){ message(title,kind==='lesson'&&cost?CT(`تفتحه بـ ${COINTXT(cost)}`,`Open it with ${COINTXT(cost)}!`):CT('ده هيتفتح قريبًا','This opens later!'),art); return; }
  const lid='l:'+item.id, lc=cost||(+C.lessonCost||3);   // credits open LESSONS only (Ahmed 2026-11-11): no whole-unit buy, no sign-up gift
  const done=()=>{ coinClose(); paintHud(); if(typeof chime==='function') chime(3); onOpen&&onOpen(); };
  const again=()=>lockTap(kind,item,cost,art,onOpen);
  parentGate(()=>{ const bal=coinBal(), ok=bal>=lc, on=coinsOn(), t=subTermNow(), pr=subOk?subPrice(kid.grade||'p1',t):null;
    const tn=(SUBT_ALL.find(x=>x[0]===t)||[])[1]||'';
    coinPopPro(`<h2 class="outline">${title}</h2><div class="lkart">${art||''}</div>
      ${on?`${balLine(bal)}
      <button class="pill ${ok?'green':'cream off'} cbuy" data-l${ok?'':' disabled aria-disabled="true"'}><span>${CT('افتح الدرس بـ','Open the lesson for')} ${CRE(lc)}</span></button>
      ${ok?'':`<p class="msg-text clow">${CT('رصيدك لا يكفي','Not enough credits')}</p>`}
      <button class="pill cream" data-more>${CT('اجمع','Get')} Credits</button>`:''}
      ${subOk?`<div class="lksub">${on?`<div class="lkor"><span>${CT('أو','or')}</span></div>`:''}<h3>${CT('اشترك في','Subscribe to')} ${tn}</h3>
        <p class="msg-text">${CT('كل المواد لـ','All subjects for')} <b>${wlEsc(kid.name)}</b> · <bdi dir="ltr" class="lkp">${pr.disc?`<s>${EN(pr.price)}</s> `:''}${EN(pr.fin)}</bdi> ${CT('جنيه','EGP')}</p>
        <button class="pill ${on?'':'green'} lkbtn" data-sub>${CT('اشترك الآن','Subscribe now')}</button></div>`:''}
      ${on?promoLine():''}`, p=>{
      if(on) promoWire(p,onOpen);
      const l=$('[data-l]',p);
      if(l) l.addEventListener('click',()=>{ if(coinBal()<lc) return; addUnlock(lid,lc,'unlock-lesson'); done(); });
      const m=$('[data-more]',p); if(m) m.addEventListener('click',()=>coinSheet(again));
      const b=$('[data-sub]',p); if(b) b.addEventListener('click',()=>{ coinClose(); subBuy(kid.id,t,again,onOpen); }); }); });
}

/* ---------- PROMO CODES (Marwa 2026-11-05) ----------
   The admin makes codes in admin.html (page "البرومو كود"); settings.promos = [{code, what, target, uses, max, until, on, note}]
     what   = lesson | unit | subject | all | any (the user picks ONE built lesson, then it opens; one use) | percent (pct = 1-99 % off a subscription price; used when the receipt is sent)         target = l:<subject>-<folder> | u:<subject>:<unit> | <subject id> | ''
     uses   = once (one use in total) | many (each child once; max = most uses in total, 0 = no limit)    until = 'YYYY-MM-DD' (last day) or ''
   A small underlined line under "اجمع كريدتس" in the lock popup opens the code field. A good code opens its target for THIS child
   (stored with the unlocks: the item id, 's:<subject>' or '*'), costs no credits, and adds a 0-credit "promo" row to the history.
   LOCAL (no settings "api"): the codes come from the settings on this device and the uses are counted on this device only (es.promoUses),
   so "once" means once per device. SERVER (settings "api"): the app sends POST /promo {child, code}; the server keeps the codes
   (never sent to the app) and counts every use (server/src/index.js promo). */
const promoNorm=c=>String(c||'').toUpperCase().replace(/[\s\-_]/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
function promoWhat(p){ if(!p) return ''; if(typeof p==='string') p={what:p==='*'?'all':p[0]==='s'?'subject':p[0]==='u'?'unit':'lesson',target:p[0]==='s'?p.slice(2):p};
  const t=p.target||'';
  if(p.what==='all') return CT('كل المواد','All subjects');
  if(p.what==='any') return CT('أي درس تختاره','Any lesson you choose');
  if(p.what==='subject'){ const s=COURSE.subjects.find(x=>x.id===t); return CT('مادة ','Subject ')+(s?s.name:t); }
  if(p.what==='unit'){ const s=subjOf(t), u=t.split(':')[2]; return (s?s.name+' · ':'')+CT('الوحدة ','Unit ')+num(u||''); }
  const l=lessonOf(t), s=subjOf(t); return l?(s?s.name+' · ':'')+(l.title||''):t; }
const promoKey=p=>p.what==='all'?'*':p.what==='subject'?'s:'+p.target:p.target;
function promoCheck(code){   // local check -> {p} or {err}
  const c=promoNorm(code); if(!c) return {err:'empty'};
  const p=(ESET.promos||[]).find(x=>promoNorm(x.code)===c); if(ESET.promoOn===false||!p||p.on===false) return {err:'bad'};
  if(p.until&&new Date().toISOString().slice(0,10)>p.until) return {err:'old'};
  if(p.what!=='all'&&p.what!=='any'&&p.what!=='percent'&&!p.target) return {err:'bad'};
  const U=cGet('es.promoUses',{}), mine=cGet(freeKey()+'.promo',[]), n=U[c]||0;
  if(mine.includes(c)) return {err:'used'};
  if(p.uses!=='many'&&n>=1) return {err:'used'};
  if(p.uses==='many'&&+p.max>0&&n>=+p.max) return {err:'full'};
  return {p,c}; }
function promoApply(p,c){ const id=promoKey(p), s=cGet(unlockKey(),[]); if(!s.includes(id)) s.push(id); cSet(unlockKey(),s); if(typeof subSeason==='function') subSeason();
  const U=cGet('es.promoUses',{}); U[c]=(U[c]||0)+1; cSet('es.promoUses',U);
  const mine=cGet(freeKey()+'.promo',[]); mine.push(c); cSet(freeKey()+'.promo',mine);
  const w=wallet(); w.hist.push({k:'promo',id,n:0,at:Date.now(),child:coinChild(),code:c}); walletSave(w); }
const PROMO_ERR={empty:['اكتب الكود الأول','Type the code first'],bad:['الكود ده مش صحيح','This code is not valid'],old:['الكود ده انتهى','This code has expired'],
  used:['الكود ده اتستخدم قبل كده','This code was already used'],full:['الكود ده خلص عدد مرات استخدامه','This code has no uses left'],net:['مفيش اتصال، جرّب تاني','No connection, try again']};
function promoLine(){ if(ESET.promoOn===false) return ''; return `<button type="button" class="cpromo" data-promo>${CT('عندك برومو كود؟','Have a promo code?')}</button>
  <form class="cpromof" hidden autocomplete="off"><input class="cpromoin" name="code" dir="ltr" inputmode="latin" autocapitalize="characters" spellcheck="false" maxlength="32" placeholder="${CT('اكتب الكود','Type the code')}" aria-label="${CT('البرومو كود','Promo code')}">
  <button class="pill green cpromogo">${CT('فعّل','Use')}</button><p class="cpromoerr" role="alert" hidden></p></form>`; }
function promoWire(pp,onOpen,ctx){
  const b=$('[data-promo]',pp), f=$('.cpromof',pp); if(!b||!f) return; const inp=$('input',f), er=$('.cpromoerr',f);
  b.addEventListener('click',()=>{ b.hidden=true; f.hidden=false; pp.classList.add('promo-on'); inp.focus(); });   // the padlock picture hides: room for the field on short screens
  const bad=k=>{ er.textContent=CT(...PROMO_ERR[k]||PROMO_ERR.bad); er.hidden=false; inp.classList.add('bad'); inp.focus();   // same as every form (welcome.js wlBad): red, shake, focus
    if(anim) G.fromTo(inp,{x:0},{x:8,duration:.06,repeat:5,yoyo:true,clearProps:'transform'}); };
  inp.addEventListener('input',()=>{ er.hidden=true; inp.classList.remove('bad'); });
  const ok=p=>{ coinClose(); paintHud(); if(typeof chime==='function') chime(3);
    coinPop(`<h2 class="outline">${CT('اتفتح!','Unlocked!')}</h2><div class="msg-art">${typeof CAR==='function'?`<span class="car">${CAR('happy')}</span>`:''}</div>
      <p class="msg-text">${CT('الكود فتح لك:','The code opened:')}<br><b>${promoWhat(p)}</b></p><button class="pill green" data-pgo>${CT('يلا نذاكر','Let\'s go')}</button>`,
      q=>{ const go=()=>{ coinClose(); onOpen&&onOpen(); }; $('[data-pgo]',q).addEventListener('click',go); $('.popx',q).addEventListener('click',()=>onOpen&&onOpen()); }); };
  f.addEventListener('submit',async e=>{ e.preventDefault(); const code=inp.value; if(!promoNorm(code)) return bad('empty');
    const go=$('.cpromogo',f); go.disabled=true; const r=await promoGo(code); go.disabled=false;
    if(r.err) return bad(r.err);
    if(r.pick) return promoPick(code,ok,onOpen);
    if(r.pct){   // a percent-off code: it works on the subscription price (subs.js hands us ctx.pct); anywhere else it only tells what it is, nothing is used
      if(ctx&&ctx.pct) return ctx.pct(r.pct,code);
      return coinPop(`<h2 class="outline">${CT('كود خصم','Discount code')}</h2><p class="msg-text">${CT('الكود ده خصم ','This code gives ')}<b>${num(r.pct)}%</b>${CT(' على الاشتراك. بتكتبه في صفحة الاشتراك وقت الدفع.',' off a subscription. Type it on the subscription page when you pay.')}</p><button class="pill green" data-pgo>${CT('تمام','OK')}</button>`,
        q=>{ $('[data-pgo]',q).addEventListener('click',coinClose); }); }
    ok(r.p); });
}
// one try of a code: {err} | {pick:true} (an "any lesson" code: the user must choose the lesson, nothing is used yet) | {pct:N} (percent off a subscription, nothing used yet) | {p} (opened)
async function promoGo(code,id){
  if(API()){
    const r=await fetch(API()+'/promo',{method:'POST',headers:{'Content-Type':'application/json',...(window.ACCOUNT&&ACCOUNT.token?{Authorization:'Bearer '+ACCOUNT.token}:{})},body:JSON.stringify({child:coinChild(),code,...(id?{id}:{})})})
      .then(x=>x.json()).catch(()=>({error:'net'}));
    if(!r||!r.ok) return {err:r&&PROMO_ERR[r.error]?r.error:r&&r.error==='net'?'net':'bad'};
    if(r.pick) return {pick:true};
    if(r.percent) return {pct:+r.percent};
    apiTake(r); return {p:r.promo}; }
  const x=promoCheck(code); if(x.err) return x;
  if(x.p.what==='percent') return +x.p.pct>0&&+x.p.pct<100?{pct:+x.p.pct}:{err:'bad'};
  if(x.p.what==='any'){ if(!id) return {pick:true}; if(!promoPickable().some(g=>g.ls.some(l=>'l:'+l.id===id))) return {err:'bad'};
    const q={what:'lesson',target:id}; promoApply(q,x.c); return {p:q}; }
  promoApply(x.p,x.c); return {p:x.p}; }
// a percent code was used on a subscription without a server: count the use on this device (with a server, POST /subs counts it)
function promoSpend(code){ const c=promoNorm(code), U=cGet('es.promoUses',{}); U[c]=(U[c]||0)+1; cSet('es.promoUses',U);
  const mine=cGet(freeKey()+'.promo',[]); mine.push(c); cSet(freeKey()+'.promo',mine); }
// the lessons an "any lesson" code can open: built, shown, and not open for this child already
function promoPickable(){ const un=new Set(cGet(unlockKey(),[])), out=[];
  COURSE.subjects.forEach(s=>{ if(!s.lessons) return;
    const ls=s.lessons.filter(l=>l.file&&!l.hidden&&!promoOpen(un,'l:'+l.id)&&accessOf({},true,'l:'+l.id,0,'lesson').st!=='open'&&((ESET.items||{})['l:'+l.id]||{}).st!=='soon');
    if(ls.length) out.push({s,ls}); }); return out; }
function promoPick(code,ok,onOpen){
  const G2=promoPickable();
  if(!G2.length){ coinPop(`<h2 class="outline">${CT('كل الدروس مفتوحة','All lessons are open')}</h2><p class="msg-text">${CT('مفيش درس مقفول تفتحه بالكود ده دلوقتي.','There is no locked lesson left to open.')}</p><button class="pill green" data-pgo>${CT('تمام','OK')}</button>`,
      q=>{ $('[data-pgo]',q).addEventListener('click',coinClose); }); return; }
  let cur=G2[0].s.id, chosen='';
  coinPop(`<h2 class="outline">${CT('اختار الدرس','Choose a lesson')}</h2>
    ${G2.length>1?`<select class="cpick-s" aria-label="${CT('المادة','Subject')}">${G2.map(g=>`<option value="${g.s.id}">${g.s.name}</option>`).join('')}</select>`:''}
    <div class="cpick-l" role="listbox"></div><p class="cpromoerr" role="alert" hidden></p>
    <button class="pill green" data-pgo disabled>${CT('افتح الدرس','Open the lesson')}</button>`,
    q=>{ const box=$('.cpick-l',q), btn=$('[data-pgo]',q), er=$('.cpromoerr',q), sel=$('.cpick-s',q);
      const draw=()=>{ const g=G2.find(x=>x.s.id===cur); let u=null; box.innerHTML=g.ls.map(l=>{ const h=l.unit!==u?(u=l.unit,`<b class="cpick-u">${CT('الوحدة ','Unit ')}${num(l.unit)}</b>`):'';
          return h+`<button type="button" class="cpick-i${chosen==='l:'+l.id?' on':''}" role="option" data-id="l:${l.id}">${num(l.lesson)}. ${l.title||''}</button>`; }).join(''); };
      draw(); if(sel) sel.addEventListener('change',()=>{ cur=sel.value; chosen=''; btn.disabled=true; draw(); });
      box.addEventListener('click',e=>{ const b=e.target.closest('.cpick-i'); if(!b) return; chosen=b.dataset.id; btn.disabled=false; er.hidden=true; $$('.cpick-i',box).forEach(x=>x.classList.toggle('on',x===b)); });
      btn.addEventListener('click',async()=>{ if(!chosen) return; btn.disabled=true; const r=await promoGo(code,chosen);
        if(r.err){ er.textContent=CT(...PROMO_ERR[r.err]||PROMO_ERR.bad); er.hidden=false; btn.disabled=false; return; }
        ok(r.p); }); }); }
;
/* ===== js/push.js ===== */
/* NOTIFICATIONS (2026-11-09, Ahmed): a small bell on the subjects page lets a parent allow notifications on this device.
   Notifications are written and sent ONLY by hand from the admin page (admin.html -> الإشعارات); the app and the server never send by themselves.
   Needs settings "api" (the server keeps the devices) and the service worker (sw.js shows the message). iPhone / iPad: only when the app was added to the
   Home Screen (iOS 16.4+): then the bell shows a short "add to Home Screen" note instead. Looks: css/push.css. */
const PUSH={sub:null};
const PUT={
  ar:{on:'الإشعارات شغّالة. دوس تاني لو عايز توقفها',off:'فعّل الإشعارات',denied:'الإشعارات متقفلة من إعدادات المتصفح',ios:'عشان الإشعارات تشتغل على الآيفون / الآيباد: افتح قائمة المشاركة واختار "إضافة إلى الشاشة الرئيسية"، وافتح التطبيق منها وبعدين دوس على الجرس',fail:'مقدرناش نفعّل الإشعارات، جرّب تاني'},
  en:{on:'Notifications are on. Tap again to turn them off',off:'Turn on notifications',denied:'Notifications are blocked in the browser settings',ios:'On iPhone / iPad: open the Share menu, choose "Add to Home Screen", open the app from there, then tap the bell',fail:'Could not turn notifications on, try again'}};
const puT=()=>PUT.ar;   // the home page has no subject language yet: Egyptian Arabic (parents)
const puIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const puStandalone=()=>navigator.standalone===true||(matchMedia&&matchMedia('(display-mode: standalone)').matches);
const puCan=()=>!!API()&&'serviceWorker' in navigator&&/^https?:/.test(location.protocol)&&(puIOS()?true:('PushManager' in window&&'Notification' in window));
const puKey=k=>{ const p='='.repeat((4-k.length%4)%4), r=atob((k+p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(r,c=>c.charCodeAt(0)); };
async function puReg(){ return navigator.serviceWorker.ready; }
async function puCurrent(){ try{ if(!('PushManager' in window)) return null; return await (await puReg()).pushManager.getSubscription(); }catch(e){ return null; } }
function puPaint(){ const b=$('#pushBtn'); if(!b) return; const on=!!PUSH.sub&&Notification.permission==='granted';
  b.classList.toggle('on',on); b.title=b.ariaLabel=on?puT().on:puT().off; }
async function puToggle(){
  const T=puT();
  if(puIOS()&&!puStandalone()) return message('🔔',T.ios);   // iOS only allows it from the Home Screen app
  if(PUSH.sub){ const e=PUSH.sub.endpoint; try{ await PUSH.sub.unsubscribe(); }catch(x){} PUSH.sub=null; apiCall('/push/unsub',{endpoint:e}); puPaint(); return; }
  if(Notification.permission==='denied') return message('🔔',T.denied);
  try{
    const perm=await Notification.requestPermission(); if(perm!=='granted') return puPaint();   // asked only now, after a tap
    const k=await apiCall('/push/key'); if(!k||!k.key) throw 0;
    const s=await (await puReg()).pushManager.subscribe({userVisibleOnly:true,applicationServerKey:puKey(k.key)});
    const r=await apiCall('/push/sub',{endpoint:s.endpoint}); if(!r||!r.ok) throw 0;
    PUSH.sub=s; puPaint();
  }catch(e){ message('🔔',T.fail); }
}
/* the bell on the home page (Ahmed 2026-11-17): shows the unread count and opens the notifications page (js/subs.js); it is there even when device notifications are not possible.
   The on / off switch moved into that page. */
function puBadge(){ const b=$('#pushBtn'); if(!b) return; const n=typeof subNews==='function'?subNews().length:0; let d=$('.pushdot',b);
  if(!n){ if(d) d.remove(); b.classList.remove('unread'); b.setAttribute('aria-label','الإشعارات'); return; }
  if(!d){ d=document.createElement('i'); d.className='pushdot'; b.appendChild(d); }
  d.textContent=n>99?'99+':(typeof num==='function'?num(n):n); b.classList.add('unread'); b.setAttribute('aria-label','الإشعارات ('+n+')'); }
async function puInit(){
  if($('#pushBtn')) return;
  const b=document.createElement('button'); b.id='pushBtn'; b.className='pushbtn rb'; b.type='button'; b.setAttribute('aria-label','الإشعارات');
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21a2 2 0 0 0 4 0"/></svg>';
  b.addEventListener('click',()=>{ if(typeof notifsPage==='function') notifsPage(); }); $('#subjects').appendChild(b);
  puBadge(); if(puCan()) PUSH.sub=await puCurrent();
}
/* a tap on a device notification while the app is open: the service worker (sw.js notificationclick) sends the link here and the app goes there without a reload.
   The link is ?go=... (js/deeplink.js, EasyStudy) or another address of this app. It answers on the port so the worker knows it was handled. */
if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message',e=>{ const d=e.data; if(!d||d.type!=='es-go') return;
  try{ if(e.ports&&e.ports[0]) e.ports[0].postMessage('ok'); }catch(x){}
  try{ const u=new URL(d.url,location.href); if(u.origin!==location.origin) return;
    $$('.acctpage').forEach(p=>p.hidden=true);
    const go=u.searchParams.get('go');
    if(go&&typeof deepGo==='function') deepGo(go); else if(u.pathname+u.search!==location.pathname+location.search) location.href=u.href; }catch(x){} });
// the settings (api address) arrive a moment after the page opens
if(typeof ESET_P!=='undefined') ESET_P.then(()=>puInit()).catch(()=>{}); else puInit();
;
/* ===== js/deeplink.js ===== */
/* DEEP LINK (2026-11-09, Ahmed): an address ending in ?go=<subject>[/<place>[/<tab>]] opens that place inside the app. Used by the notification link
   (admin.html -> الإشعارات builds it from lists), and works from any shared link. place = a lesson folder (u1l3) | a unit (unit-5, opens that subject's map)
   | an exam paper (x-<exam id>, a lesson's or a unit's). tab = read | words | quiz | booklet | workbook | grammar.
   Safe by design: a place that does not exist, is not built yet, or is locked / "soon" just opens the subject's map; no child profile yet = normal first launch. */
function deepGo(g){   // g = the ?go= text when a tap on a notification arrives while the app is open (js/push.js); no argument = read it from the address (a fresh start)
  let go=g||''; if(!go){ try{ go=new URLSearchParams(location.search).get('go')||''; }catch(e){} }
  if(!go) return;
  try{ const u=new URL(location.href); u.searchParams.delete('go'); history.replaceState(null,'',u.pathname+(u.search||'')+u.hash); }catch(e){}   // a reload does not repeat it
  const [sid,place,tabName]=go.split('/'), s=COURSE.subjects.find(x=>x.id===sid&&x.open&&x.lessons);
  if(!s||!kidNow()) return;
  SUBJECT=s;
  needRest(async()=>{
    const m=place&&s.lessons.find(l=>l.folder===place&&l.file);
    if(m){
      if(accessOf(m,!!m.file,'l:'+m.id).st!=='open') return openMap();
      if(tabName&&['read','words','quiz','booklet','workbook','grammar'].includes(tabName)) return bookOpen(m,tabName);
      return openLesson(m);
    }
    const xm=/^x-([\w-]+)$/.exec(place||'');
    if(xm){
      const lm=s.lessons.find(l=>(l.exams||[]).some(e=>e.id===xm[1]));
      if(lm){ const ex=lm.exams.find(e=>e.id===xm[1]); return openExam(lm,ex); }
      const un=(s.units||[]).find(u=>(u.exams||[]).some(e=>e.id===xm[1]));
      if(un){ const ex=un.exams.find(e=>e.id===xm[1]); return openExam({unit:un.unit,folder:'t'+un.unit,id:s.id+':t'+un.unit,exams:un.exams,tabs:[]},ex); }
    }
    openMap();
  });
}
;
/* ===== js/subjects.js ===== */
/* SUBJECTS screen — the cardboard boxes. */
/* ---------- Subjects ---------- */
let wig=null;
function drawSubjects(){
  const g=$('#boxes'); g.innerHTML=''; g.classList.toggle('n3',COURSE.subjects.length<=3);   // 3 books (عام / تجريبي): one column in portrait, one row in landscape
  COURSE.subjects.forEach(s0=>{
    const ac=accessOf(s0,!!s0.open,'s:'+s0.id), st=ac.st, s=Object.assign({},s0,{_st:st});
    const b=el('button','box '+st);
    const tag = st==='open' ? `${STAR(true)}${s.lessons?s.lessons.reduce((a,l)=>a+lessonStars(l.id),0):0}` : st==='locked' ? `${ICON.lock}${COINTXT(ac.coins)}` : '';
    b.innerHTML=`<span class="cube">${BOX(s)}</span>${tag?`<span class="tag">${tag}</span>`:''}`;
    b.setAttribute('aria-label', st==='open'?s.name:s.name+(st==='locked'?', locked':', coming soon'));
    b.addEventListener('click',()=>{ if(st==='open'){ SUBJECT=s0; needRest(()=>openMap()); }
      else if(st==='locked') message(isAr()?'مقفول':'Locked', ac.coins?(isAr()?`تفتحيه بـ ${COINTXT(ac.coins)}`:`Open it with ${COINTXT(ac.coins)}!`):(isAr()?'ده هيتفتح قريبًا':'This opens later!'), `<span class="cube" style="display:block">${BOX(s)}</span>`);
      else message('Soon!', s.rtl?'مادة العربي قريباً!':COURSE.hints.soonSubject, `<span class="cube" style="display:block">${BOX(s)}</span>`); });
    g.append(b);
  });
  if(anim){ if(wig) wig.kill(); const cubes=$$('.box.open .cube',g);
    // every open box wiggles in turn, then it starts again from the first
    wig=G.timeline({repeat:-1,repeatDelay:1.2,delay:1.4}); cubes.forEach(o=>wig.to(o,{rotation:-4,y:-6,duration:.12}).to(o,{rotation:4,duration:.1,repeat:3,yoyo:true}).to(o,{rotation:0,y:0,duration:.15}).to({},{duration:.5}));
    $$('.peek',g).forEach(p=>G.to(p,{x:4,duration:.9,yoyo:true,repeat:-1,ease:'sine.inOut'})); }
}
function openSubjects(){ stopVoice(); if(restOk){ stopAll(); vStop(); clearMarks(); } show('subjects'); kidPaint(); drawSubjects(); pop('.box'); showHint($('.box.open'),COURSE.hints.subjects,1300,'subjects'); }
;
/* ===== js/welcome.js ===== */
/* WELCOME + ACCOUNTS (Marwa 2026-11-05; redesigned 2026-11-11). ONE screen in stages: 1) "دخول ولي الأمر" = email and/or mobile (at least one, no parent name),
   known parent -> straight into the app (child picker when more than one child); new parent -> stage 2 opens below on the same page:
   the student (name, grade, curriculum; لغات -> school list + "إضافة مدرسة" popup that sends a WhatsApp request to the administration). Then the home page.
   Later: the profile button (home, bottom right, child's name beside it) opens the parent gate (Arabic number words, js/coins.js) and then the account page (children, profile, my subscriptions).
   SERVER (js/sync.js, when settings "api" is set): the email is confirmed with a code, children + progress are kept on the server too.
   LOCAL VERSION: everything is kept on this device (localStorage es.account / es.kids / es.kid). The server account (Cloudflare) replaces
   only acctSave / kidsSave later; the screens stay. Each child keeps its own stars, map place and opened lessons: the progress keys (KID_KEYS)
   are swapped when the child changes, so the rest of the app keeps reading its usual keys. */
const KID_KEYS=['zoom-stars','zoom-opened','zoom-last','zoom-vocab','es.unlocked','es.freeused'];   // es.freeused = the child's free picks (js/coins.js)
const wlGet=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v; }catch(e){ return d; } };
const wlSet=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const acct=()=>wlGet('es.account',null), kids=()=>wlGet('es.kids',[]), kidNow=()=>{ const id=wlGet('es.kid',null), K=kids(); return K.find(k=>k.id===id)||K[0]||null; };
// the curriculum line of a pick, in Arabic (for the parent)
function currLabel(p){ if(!p||!CURR) return ''; const sc=p.school&&CURR.schools.find(s=>s.id===p.school), ty=CURR.types.find(t=>t.id===p.type); return sc?sc.ar:ty?ty.ar:''; }
const gradeLabel=g=>((CURR&&CURR.grades||[]).find(x=>x.id===g)||{}).ar||'';
// change child: keep the current child's progress under its own name, bring the other child's back, open the app again
function kidSwitch(id){ const cur=kidNow(); if(cur&&cur.id===id) return;
  try{ KID_KEYS.forEach(k=>{ const v=localStorage.getItem(k); if(cur){ if(v==null) localStorage.removeItem(`es.kid.${cur.id}.${k}`); else localStorage.setItem(`es.kid.${cur.id}.${k}`,v); }
    const n=localStorage.getItem(`es.kid.${id}.${k}`); if(n==null) localStorage.removeItem(k); else localStorage.setItem(k,n); }); }catch(e){}
  const kd=kids().find(k=>k.id===id); wlSet('es.kid',id); if(kd) currSave(kd.curr); location.reload(); }

/* ---------- the welcome steps ---------- */
const WL={step:'main',stage:1,pick:null,adding:false,login:null,pending:false};
const wlEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wlDigits=s=>String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g,'');
const wlSamePhone=(a,b)=>{ a=wlDigits(a); b=wlDigits(b); return a.length>=8&&b.length>=8&&a.slice(-10)===b.slice(-10); };
const wlSameId=(a,b)=>!!a&&!!b&&((!!a.email&&!!b.email&&a.email.toLowerCase()===b.email.toLowerCase())||wlSamePhone(a.phone,b.phone));
// a wrong / missing field: THAT field turns red, shakes and gets the focus; the message shows under the form (Marwa 2026-11-05, every form)
function wlBad(f,name,msg){ const er=$('.wl-err',f); $$('.bad',f).forEach(x=>x.classList.remove('bad')); if(er){ er.textContent=msg; er.hidden=false; }
  const i=name&&f[name]; if(!i) return; i.classList.add('bad'); i.focus(); if(anim) G.fromTo(i,{x:0},{x:8,duration:.06,repeat:5,yoyo:true,clearProps:'transform'});
  i.addEventListener('input',()=>{ i.classList.remove('bad'); if(er) er.hidden=true; },{once:true}); }
// the short app description (Marwa 2026-11-05/06): on the loading screen (index.html #splashName .ldab, first load only), big on the first stage, small later
function wlAbout(sz='sm'){ return `<div class="wl-about ${sz}" dir="rtl"><p class="wl-tag">مذاكرة أولى ابتدائي بلعبة مسلية للأطفال</p><ul class="wl-pts"><li>شرح الدرس</li><li>تحفيظ الكلمات</li><li>تدريب الأسئلة</li></ul></div>`; }
function wlHead(ar,en){ return `<h2 class="wl-h"><span>${ar}</span><small>${en}</small></h2>`; }
// autofocus (Ahmed 2026-11-07): a form opens with the cursor in its first EMPTY required field; Enter moves to the next empty one, the last one submits
function wlFocus(f){ if(!f) return; const ins=[...f.querySelectorAll('input[required]')], first=ins.find(i=>!i.value.trim());
  ins.forEach(i=>i.addEventListener('keydown',e=>{ if(e.key!=='Enter') return; const nx=ins.slice(ins.indexOf(i)+1).find(x=>!x.value.trim()); if(nx){ e.preventDefault(); nx.focus(); } }));
  if(first) setTimeout(()=>{ try{ first.focus({preventScroll:true}); const n=first.value.length; first.setSelectionRange&&first.type!=='email'&&first.setSelectionRange(n,n); }catch(_){} },120); }
function wlGo(step){ WL.step=step; wlDraw(); }
// a child's round picture: its first letter on a colour (same child = same colour)
const AVC=['#F27A0C','#2DAE8A','#3F8FE0','#E0508A','#8A5CD6','#D9A400'];
const wlAv=k=>{ let h=0; for(const c of String(k.id||k.name)) h=(h*31+c.charCodeAt(0))%997; return `<i class="wl-av" style="--av:${AVC[h%AVC.length]}">${wlEsc([...String(k.name||'?')][0])}</i>`; };
const wlTypeOn=t=>!((typeof ESET!=='undefined'&&ESET&&ESET.currOff)||{})[t.id];   // admin switch (dashboard > إعدادات التطبيق > المناهج)
const wlTypeLabel=t=>t.id==='private'?'لغات':t.ar;
function wlDraw(){
  const b=$('#wlBody'); $('#wlBack').hidden=!(WL.adding||WL.step==='code'); $('#welcome').dataset.step=WL.step==='main'&&!WL.adding&&WL.stage===1?'curr':'form';   // big logo on the first stage, smaller later (css/welcome.css)
  if(WL.step==='code') syDrawCode(b);
  else if(WL.step==='pick') wlPicker(b);
  else wlMain(b);
  b.insertAdjacentHTML('afterbegin',wlBrand());   // the app logo at the top of the soft card (Ahmed 2026-11-19)
  pop('#wlBody > *, #wlBody form > *',{y:16});
}
// the logo of the app (the same block that used to sit on the game background), now inside the white login card; hidden outside by css/account.css
function wlBrand(){ const l=$('#welcome .wl-logo'); return l?`<div class="wl-brand" aria-hidden="true">${l.innerHTML.replace(/ id="[^"]*"/g,'')}</div>`:''; }
function wlMain(b){
  const ed=WL.edit&&kids().find(k=>k.id===WL.edit), onlyKid=WL.adding||!!ed, L=WL.login||(WL.login={email:'',phone:''}), reg=WL.stage>1;
  let h=onlyKid?'':wlAbout(reg?'sm':'');
  if(!onlyKid){
    h+=wlHead('دخول ولي الأمر','Parent login')+(reg?`<div class="wl-sum"><span dir="ltr">${wlEsc([L.email,L.phone].filter(Boolean).join('  ·  '))}</span><button type="button" class="pill cream wl-chip wl-chg">تعديل</button></div>`:
    `<form class="wl-form wl-login" novalidate>
      <label><span>البريد الإلكتروني <small>Email</small></span><input name="email" type="email" dir="ltr" autocomplete="email" inputmode="email" value="${wlEsc(L.email)}"></label>
      <div class="wl-or" aria-hidden="true"><span>أو</span></div>
      <label><span>رقم الموبايل <small>Mobile</small></span><input name="phone" type="tel" dir="ltr" autocomplete="tel" inputmode="tel" value="${wlEsc(L.phone)}"></label>
      <p class="wl-err" hidden></p>
      <button class="pill wl-big wl-go" type="submit"><span class="wl-ar">دخول</span><small>Continue</small></button></form>`);
  }
  if(onlyKid||reg) h+=wlStudentHTML(ed);
  b.innerHTML=h;
  if(!onlyKid&&!reg){
    const f=$('.wl-login',b); f.addEventListener('submit',e=>{ e.preventDefault(); const v=n=>f[n].value.trim(), er=$('.wl-err',b);
      const bad=!v('email')&&!v('phone')?['email','اكتب الإيميل أو رقم الموبايل (واحد على الأقل)']:v('email')&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))?['email','البريد الإلكتروني مش مكتوب صح']:v('phone')&&!/^[+0-9٠-٩ ]{8,16}$/.test(v('phone'))?['phone','رقم الموبايل مش مكتوب صح']:null;
      if(bad) return wlBad(f,...bad);
      const go=$('.wl-go',b); go.disabled=true, id={email:v('email'),phone:v('phone')};
      wlLogin(id,t=>{ er.textContent=t; er.hidden=false; go.disabled=false; }); });
    wlFocus(f);
  } else { const c=$('.wl-chg',b); if(c) c.addEventListener('click',()=>{ WL.stage=1; wlDraw(); }); wlStudentBind(b,ed); }
}
// the parent's login: known on this device -> in; server on + email -> a code (js/sync.js); otherwise the student stage opens below
function wlLogin(id,err){
  WL.login=id; const ex=acct();
  if(ex&&wlSameId(ex,id)&&kids().length) return wlEnter();
  acctSubmit(id,err);
}
// a known parent: one child = straight into the app, more = the child picker
function wlEnter(){ const K=kids(); if(!K.length) return; WL.stage=1; WL.adding=false; wlGo('pick'); }   // an existing account: always the student chooser (name + picture, or add a new student)
function wlPicker(b){ const K=kids();
  b.innerHTML=wlHead('مين اللي هيتعلم؟','Who\'s learning?')+`<div class="wl-pick">${K.map(k=>`<button type="button" class="wl-who" data-kid="${k.id}">${wlAv(k)}<b>${wlEsc(k.name)}</b><small>${wlEsc(gradeLabel(k.grade))}</small></button>`).join('')}
    <button type="button" class="wl-who wl-newkid"><i class="wl-av wl-plus">${ICON.plus}</i><b>إضافة طالب جديد</b></button></div>`;
  $$('[data-kid]',b).forEach(x=>x.addEventListener('click',()=>{ const id=x.dataset.kid, cur=kidNow(); if(cur&&cur.id===id){ openSubjects(); pop('#subjects .top > *',{y:-20}); } else kidSwitch(id); }));
  $('.wl-newkid',b).addEventListener('click',()=>{ WL.adding=true; WL.fromPick=true; WL.edit=null; WL.draft=null; WL.grade=null; WL.pick=null; WL.step='main'; wlDraw(); }); }
// the student form (stage 2, add a child, edit a child): name, grade, curriculum; لغات -> the school list
function wlSchoolName(id){ const s=id&&CURR&&CURR.schools.find(x=>x.id===id); return s?s.ar:''; }
// "اختر مدرسة": one button -> a popup list of the schools; "إضافة مدرسة" at the end only at registration (canAdd)
function wlSchoolList(btn,canAdd){
  const host=btn.parentNode; host.classList.add('wl-ddhost');
  let d=$('.wl-dd',host); if(d){ d.hidden=!d.hidden; return; }
  const C=CURR||{schools:[]}, cur=(WL.pick||{}).school;
  d=el('div','wl-dd',`${canAdd?`<button type="button" class="pill green wl-addsch">${ICON.plus} إضافة مدرسة</button>`:''}${C.schools.map(s=>`<button type="button" class="wl-ddi${cur===s.id?' on':''}" data-school="${s.id}">${s.ar}</button>`).join('')}`);
  host.append(d);
  document.addEventListener('click',e=>{ if(!d.contains(e.target)&&e.target!==btn) d.hidden=true; });
  $$('[data-school]',d).forEach(x=>x.addEventListener('click',()=>{ WL.pick={type:'private',school:x.dataset.school}; btn.textContent=wlSchoolName(x.dataset.school); btn.classList.add('on'); $$('.wl-ddi',d).forEach(y=>y.classList.toggle('on',y===x)); d.hidden=true;
    const ek=WL.edit&&kids().find(k=>k.id===WL.edit), granted=!!(ek&&ek.curr&&ek.curr.school===x.dataset.school&&ek.curr.grant);
    if(typeof schoolNeedsPerm==='function'&&schoolNeedsPerm(x.dataset.school)&&!granted) wlPermPop(x.dataset.school); }));
  const ad=$('.wl-addsch',d); if(ad) ad.addEventListener('click',()=>{ d.hidden=true; wlSchoolPop(); });
}
/* a school that needs the school's permission (dashboard: المناهج والمدارس > محتاجة سماح): an OFFICIAL popup (a white card like the account pages, not the game popup) with one button that opens the parent's own
   WhatsApp with the request already written; the parent picks the school's contact and sends. The pick stays; the school's own books open when the admin grants THIS student (users table). */
function wlPermPop(id){
  let o=$('#permPop'); if(!o){ o=el('div','offback',''); o.id='permPop'; o.setAttribute('role','dialog'); document.body.append(o); o.addEventListener('click',e=>{ if(e.target===o) o.hidden=true; }); }
  const S=typeof CS==='function'?CS():{}, link=S.shareUrl||location.origin+location.pathname.replace(/[^/]*$/,''), name=S.appName||'EasyStudy';
  const msg='برجاء السماح لى باستخدام المدرسة على '+name+' :\n'+link;
  o.innerHTML=`<section class="ac-card offpop"><h3>${wlEsc(wlSchoolName(id))}</h3><p class="offt">اطلب من المدرسة السماح لك</p>
    <button type="button" class="pill green off-wa">${typeof SHAPPS!=='undefined'?SHAPPS[0][4]:''}<span>إرسال على واتساب</span></button><button type="button" class="pill cream off-x">تمام</button></section>`;
  $('.off-x',o).addEventListener('click',()=>o.hidden=true);
  $('.off-wa',o).addEventListener('click',()=>{ if(typeof shareGo==='function') shareGo('wa',msg,''); else window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank'); });
  o.hidden=false; }
function wlStudentHTML(ed){
  const G=(CURR&&CURR.grades)||[{id:'p1',ar:'الصف الأول الابتدائي',open:true}], C=CURR||{types:[],schools:[]}, gr=WL.grade||(ed&&ed.grade)||G[0].id, pk=WL.pick||{}, priv=pk.type==='private';
  if(WL.draft==null&&ed) WL.draft=ed.name;
  return wlHead(ed?'تعديل حساب الطفل':'تسجيل الطالب',ed?'Edit child':'Student')+`<form class="wl-form wl-stu" novalidate>
    <label><span>اسم الطالب <small>Student's name</small></span><input name="kid" autocomplete="off" value="${wlEsc(WL.draft||'')}" required></label>
    <div class="wl-field"><span>السنة الدراسية <small>Grade</small></span><div class="wl-chips">${G.map(g=>`<button type="button" class="pill cream wl-chip${g.id===gr?' on':''}" data-grade="${g.id}"${g.open?'':' disabled'}>${g.ar}</button>`).join('')}</div></div>
    <div class="wl-field"><span>المنهج <small>Curriculum</small></span><div class="wl-chips">${C.types.map(t=>`<button type="button" class="pill cream wl-chip${pk.type===t.id?' on':''}" data-type="${t.id}"${wlTypeOn(t)||pk.type===t.id?'':' disabled'}>${wlTypeLabel(t)}${wlTypeOn(t)?'':' <small>قريبًا</small>'}</button>`).join('')}</div></div>
    ${priv?`<div class="wl-field wl-schools2"><span class="wl-sh">المدرسة <small>لتوافق كتب المستوى الرفيع AL</small></span><div class="wl-chips col"><button type="button" class="pill cream wl-chip wl-pickschool${pk.school?' on':''}">${wlSchoolName(pk.school)||'اختر مدرسة'}</button></div></div>`:''}
    <p class="wl-err" hidden></p>
    <button class="pill wl-big wl-go green" type="submit">${ed?'<span class="wl-ar">حفظ</span><small>Save</small>':'<span class="wl-ar">يلا نبدأ</span><small>Let\'s go</small>'}</button></form>`; }
function wlStudentBind(b,ed){
  const G=(CURR&&CURR.grades)||[{id:'p1'}], f=$('.wl-stu',b);
  $('input[name=kid]',b).addEventListener('input',e=>WL.draft=e.target.value);
  $$('[data-grade]',b).forEach(x=>x.addEventListener('click',()=>{ WL.grade=x.dataset.grade; $$('[data-grade]',b).forEach(y=>y.classList.toggle('on',y===x)); }));
  $$('[data-type]',b).forEach(x=>x.addEventListener('click',()=>{ WL.pick={type:x.dataset.type}; WL.draft=f.kid.value; wlDraw(); }));
  const ps=$('.wl-pickschool',b); if(ps) ps.addEventListener('click',()=>wlSchoolList(ps,!ed));
  f.addEventListener('submit',e=>{ e.preventDefault(); const n=f.kid.value.trim(), pk=WL.pick;
    if(!n) return wlBad(f,'kid','اكتب اسم الطالب');
    if(!pk) return wlBad(f,null,'اختار المنهج');
    if(pk.type==='private'&&!pk.school) return wlBad(f,null,'اختار المدرسة (أو اطلب إضافة مدرستك)');
    const gr=WL.grade||(ed&&ed.grade)||G[0].id;
    if(ed){ kidSave(ed.id,{name:n,grade:gr,curr:(ed.curr&&ed.curr.grant&&pk.school&&ed.curr.school===pk.school)?{...pk,grant:1}:pk}); return; }
    // a different parent than the one kept on this device: that device list starts again (the server brings its own children back)
    const A=acct(); if(!WL.adding&&A&&!wlSameId(A,WL.login)){ wlSet('es.kids',[]); wlSet('es.kid',null); }
    if(!WL.adding&&!(acct()&&wlSameId(acct(),WL.login))) wlSet('es.account',{email:WL.login.email,phone:WL.login.phone,created:new Date().toISOString(),...(WL.pending?{pending:true}:{})});
    const K=kids(), first=!K.length, kd={id:'k'+Date.now().toString(36),name:n,grade:gr,curr:pk,created:new Date().toISOString()};
    K.push(kd); wlSet('es.kids',K); syPushKids();
    if(first){ wlSet('es.kid',kd.id); currSave(kd.curr); currApply(kd.curr); WL.adding=false; WL.stage=1; kidPaint(); openSubjects(); pop('#subjects .top > *',{y:-20}); }   // the first child keeps the progress already on this device
    else kidSwitch(kd.id); });
  wlFocus(f);
}
// "إضافة مدرسة": 4 fields -> a WhatsApp message to the administration (settings "whatsapp" = their number, set in admin.html; none = the parent picks the contact)
function wlSchoolPop(){
  let o=$('#schPop'); if(!o){ o=el('div','overlay','<div class="rays"></div><div class="popup kidpop" role="dialog" aria-label="Add school"></div>'); o.id='schPop'; document.body.append(o); o.addEventListener('click',e=>{ if(e.target===o) o.hidden=true; }); }
  const p=$('.kidpop',o);
  p.innerHTML=`<button class="rb popx" aria-label="Close">${ICON.close}</button>${wlHead('إضافة مدرسة','Add a school')}<form class="wl-form" novalidate>
    <label><span>اسم المدرسة</span><input name="school" autocomplete="off" required></label>
    <label><span>اسم المسؤول</span><input name="who" autocomplete="off" required></label>
    <label><span>وظيفة المسؤول</span><input name="job" autocomplete="off" required></label>
    <label><span>رقم المسؤول</span><input name="tel" type="tel" dir="ltr" autocomplete="tel" inputmode="tel" required></label>
    <p class="wl-err" hidden></p>
    <button class="pill wl-big wl-go green" type="submit"><span class="wl-ar">إرسال على واتساب</span><small>Send on WhatsApp</small></button></form>`;
  $('.popx',p).addEventListener('click',()=>o.hidden=true);
  const f=$('form',p); f.addEventListener('submit',e=>{ e.preventDefault(); const v=n=>f[n].value.trim();
    const bad=!v('school')?['school','اكتب اسم المدرسة']:!v('who')?['who','اكتب اسم المسؤول']:!v('job')?['job','اكتب وظيفة المسؤول']:!v('tel')?['tel','اكتب رقم المسؤول']:null;
    if(bad) return wlBad(f,...bad);
    const msg='طلب إضافة مدرسة لتطبيق easy study\n\nاسم المدرسة: '+v('school')+'\nاسم المسؤول: '+v('who')+'\nوظيفة المسؤول: '+v('job')+'\nرقم المسؤول: '+v('tel'),
      num=wlDigits((typeof ESET!=='undefined'&&ESET&&ESET.whatsapp)||'');
    window.open('https://wa.me/'+num+'?text='+encodeURIComponent(msg),'_blank'); o.hidden=true; });
  o.hidden=false; if(typeof spinRays==='function') spinRays(o); wlFocus(f);
}
$('#wlBack').addEventListener('click',()=>{ if(WL.fromPick&&WL.adding){ WL.fromPick=false; WL.adding=false; WL.edit=null; wlGo('pick'); } else if(WL.step==='code'){ WL.stage=1; wlGo('main'); } else if(WL.adding){ WL.adding=false; WL.edit=null; openSubjects(); } });
function openWelcome(adding){ WL.fromPick=false; WL.adding=!!adding; WL.edit=null; WL.draft=null; WL.grade=null; WL.stage=1; WL.login=null; WL.pending=false; WL.pick=null; WL.step='main'; show('welcome'); wlDraw(); }
// edit a child (name, grade, curriculum / school): the student form filled in
function openKidEdit(id){ const k=kids().find(x=>x.id===id); if(!k) return; WL.adding=true; WL.edit=id; WL.draft=null; WL.grade=null; WL.pick=k.curr; WL.step='main'; show('welcome'); wlDraw(); }
// save an edited child: progress stays (it belongs to the child, not to the curriculum); the active child's subjects / tabs follow the new curriculum
function kidSave(id,ch){ const K=kids(), k=K.find(x=>x.id===id); if(!k) return; Object.assign(k,ch); wlSet('es.kids',K); if(typeof syPushKids==='function') syPushKids();
  WL.edit=null; WL.adding=false; const cur=kidNow(); if(cur&&cur.id===id){ currSave(k.curr); setTimeout(()=>location.reload(),300); } else { kidPaint(); openSubjects(); } }

/* ---------- profile button (home, bottom right) -> parent gate -> the account page ---------- */
function kidPaint(){ const k=kidNow(), b=$('#kidBtn'); if(!b) return; b.hidden=!k; if(k) $('#kidName').textContent=k.name; }
const ACH={ user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.6-7 8-7s8 2.5 8 7"/></svg>', card:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10.5h18M7 15h3"/></svg>',
  inv:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.8 2.9-6 6.5-6s6.5 2.2 6.5 6M19 8v6M16 11h6"/></svg>',
  bell:'<svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21a2 2 0 0 0 4 0"/></svg>',
  coin:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6-1 1.4-2.5 1.8-2.5.8-2.5 1.8 1 1.5 2.5 1.5 2.5-.5 2.5-1.5"/></svg>', out:'<svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/></svg>' };
const wlRow=(cls,ic,ar,note)=>`<button class="arow ${cls}"><i>${ic}</i><b>${ar}</b>${note?`<em>${note}</em>`:''}<s></s></button>`;
function kidMenu(){
  let o=$('#acctPage'); if(!o){ o=el('div','acctpage',''); o.id='acctPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Account'); document.body.append(o); }
  const a=acct()||{}, cur=kidNow();
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back" aria-label="Back">${ICON.back}</button><h2>حسابي</h2></div>
    <div class="ac-in"><section class="ac-card ac-me"><i class="ac-meic">${ACH.user}</i><div><b>ولي الأمر</b>${[(a.email&&!/@phone\.local$/.test(a.email))?a.email:'',a.phone].filter(Boolean).map(x=>`<small dir="ltr">${wlEsc(x)}</small>`).join('')}</div></section>
    <section class="ac-card"><h3>الطلاب</h3><div class="ac-kids">${kids().map(k=>`<div class="ac-kid${cur&&k.id===cur.id?' on':''}"><button class="ac-pic" data-kid="${k.id}" aria-label="${wlEsc(k.name)}">${wlAv(k)}</button><button class="ac-pen" data-edit="${k.id}" aria-label="Edit ${wlEsc(k.name)}">${ICON.pencil}</button><b>${wlEsc(k.name)}</b><small>${wlEsc(gradeLabel(k.grade))}</small></div>`).join('')}
      <div class="ac-kid"><button class="ac-pic ac-add" aria-label="Add a child">${ICON.plus}</button><b>إضافة طالب</b></div></div></section>
    <div class="arows">${wlRow('ac-prof',ACH.user,'الملف الشخصي','')}${typeof coinsOn==='function'&&coinsOn()?wlRow('wl-cred',ACH.coin,'رصيدي',CRED(coinBal())):''}${typeof invitePage==='function'?wlRow('ac-inv',ACH.inv,'دعوة صديق',''):''}${(typeof subIsOn==='function'&&(subIsOn()||subHasAny()))?wlRow('ac-subs',ACH.card,'اشتراكاتي',''):''}${wlRow('ac-news',ACH.bell,'الإشعارات',subNews().length?num(subNews().length)+' جديد':'')}${typeof acctExtraRows==='function'?acctExtraRows():''}</div></div>`;
  $('.ac-back',o).addEventListener('click',()=>o.hidden=true);
  $$('[data-kid]',o).forEach(b=>b.addEventListener('click',()=>{ o.hidden=true; kidSwitch(b.dataset.kid); }));
  $$('[data-edit]',o).forEach(b=>b.addEventListener('click',()=>{ o.hidden=true; openKidEdit(b.dataset.edit); }));
  $('.ac-add',o).addEventListener('click',()=>{ o.hidden=true; openWelcome(true); });
  $('.ac-prof',o).addEventListener('click',profilePage);
  { const sb=$('.ac-subs',o); if(sb) sb.addEventListener('click',subsPage); }
  $('.ac-news',o).addEventListener('click',notifsPage);
  { const ib=$('.ac-inv',o); if(ib) ib.addEventListener('click',invitePage); }
  if(typeof acctExtraBind==='function') acctExtraBind(o);   // the other app's own rows (Easy Words: the report)
  const cb=$('.wl-cred',o); if(cb) cb.addEventListener('click',()=>{ creditsPage(); });   // the parent's credits (js/coins.js)
  syMenuButtons(o,()=>o.hidden=true);   // confirm the email / sign out (server only, js/sync.js)
  o.hidden=false; pop('.ac-card, .arow',{y:14});
}
/* ---------- the profile page (Ahmed 2026-11-16): the parent's email and mobile, both editable, and the notices on / off. Saved to the account on the server (PUT /me) and on this device ---------- */
const PROF_ERR={'bad-email':'الإيميل مش مكتوب صح','need-contact':'لازم إيميل أو موبايل واحد على الأقل','email-taken':'الإيميل ده مسجل لحساب تاني','phone-taken':'الموبايل ده مسجل لحساب تاني','blocked':'الحساب ده موقوف'};
function profilePage(){
  let o=$('#profPage'); if(!o){ o=el('div','acctpage',''); o.id='profPage'; o.setAttribute('role','dialog'); document.body.append(o); }
  const a=acct()||{}, on=a.notify!==false;
  o.innerHTML=`<div class="ac-top"><button class="rb pf-back" aria-label="Back">${ICON.back}</button><h2>الملف الشخصي</h2></div>
    <div class="ac-in"><section class="ac-card"><form class="wl-form pf-form" autocomplete="off" novalidate>
      <label class="pf-f"><span>الإيميل</span><input name="email" type="email" dir="ltr" autocomplete="email" inputmode="email" value="${wlEsc((a.email&&!/@phone\.local$/.test(a.email))?a.email:'')}"></label>
      <label class="pf-f"><span>رقم الموبايل</span><input name="phone" type="tel" dir="ltr" autocomplete="tel" inputmode="tel" value="${wlEsc(a.phone||'')}"></label>
      <div class="pf-g"><span class="pf-l">الإشعارات</span><label class="pf-sw"><input name="notify" type="checkbox"${on?' checked':''}><i></i><span>استقبال الإشعارات على التطبيق والإيميل</span></label></div>
      <p class="wl-err pf-err" hidden></p><p class="pf-ok" hidden>اتحفظ</p>
      <button class="pill green pf-save" type="submit">حفظ</button></form></section></div>`;
  $('.pf-back',o).addEventListener('click',()=>o.hidden=true);
  const f=$('.pf-form',o), er=$('.pf-err',o), ok=$('.pf-ok',o), bad=t=>{ er.textContent=t; er.hidden=false; ok.hidden=true; };
  f.addEventListener('submit',async e=>{ e.preventDefault(); er.hidden=true; ok.hidden=true;
    const email=f.elements.email.value.trim(), phone=f.elements.phone.value.trim(), notify=f.elements.notify.checked;
    if(!email&&!phone) return bad(PROF_ERR['need-contact']); if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad(PROF_ERR['bad-email']);
    const s=typeof sySession==='function'&&sySession();
    if(s&&s.token){ const r=await syCall('/me',{email,phone,notify},'PUT'); if(!r) return bad('مفيش اتصال بالإنترنت، جرب تاني'); if(!r.j.ok) return bad(PROF_ERR[r.j.error]||'ما اتحفظش، جرب تاني'); }
    wlSet('es.account',{...(acct()||{}),email,phone,notify}); window.ACCOUNT={...acct(),id:(s&&s.id)||(acct()||{}).id,...(s&&s.token?{token:s.token}:{})};
    ok.hidden=false; });
  o.hidden=false; pop('.ac-card',{y:14}); }
$('#kidBtn').addEventListener('click',()=>parentGate(kidMenu));
// hooks for other parts (coins.js reads window.ACCOUNT / window.CHILD): {id,...} of the parent and the active child
// signed in to the server (js/sync.js es.session): id = the server's parent id (share links carry it), token for the API calls
window.ACCOUNT=(()=>{ const a=acct(), s=wlGet('es.session',null); return a?{...a,id:(s&&s.id)||a.id||a.email||'local',...(s&&s.token?{token:s.token}:{})}:null; })(); window.CHILD=kidNow();
;
/* ===== js/sync.js ===== */
/* ACCOUNT SERVER SYNC (Marwa 2026-11-05: the parent's account is confirmed with a code sent to the email, no password; the code is asked
   only on a new device or after sign-out). Server = easystudy/server (Cloudflare Worker + D1), API contract in server/README.md.
   It is ON only when the settings have "api" (e.g. "/api", js/coins.js API()). No api, or the server can't be reached = the local
   version exactly as before (js/welcome.js keeps everything on this device). Kept on this device:
     es.session = {token, id, ref}  (the signed-in parent; window.ACCOUNT.token for js/coins.js)
     es.device  = a random id for this device (a referral pays only for a new device)
     es.progAt.<kid> = when this device last sent that child's progress (the newest copy wins) */
const SY={};
const syDevice=()=>{ let d=wlGet('es.device',null); if(!d){ d='d'+Date.now().toString(36)+Math.random().toString(36).slice(2,10); wlSet('es.device',d); } return d; };
const sySession=()=>wlGet('es.session',null);
async function syApi(){ try{ await ESET_P; }catch(e){} return API(); }
// one call; answer = {s: status, j: json} or null when the server can't be reached
async function syCall(path,body,method){ const base=await syApi(); if(!base) return null;
  const h={'Content-Type':'application/json'}, s=sySession(); if(s&&s.token) h.Authorization='Bearer '+s.token;
  try{ const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:h,body:body?JSON.stringify(body):undefined}); let j={}; try{ j=await r.json(); }catch(e){}
    if(r.status===401&&s&&path.indexOf('/auth/')!==0){ syForget(); }   // the session ended (signed out elsewhere / blocked)
    return {s:r.status,j}; }catch(e){ return null; } }
function syForget(){ try{ localStorage.removeItem('es.session'); }catch(e){} if(window.ACCOUNT) delete ACCOUNT.token; }
const SYERR={'bad-email':'البريد الإلكتروني مش مكتوب صح','wait':'استنى دقيقة وبعدين اطلب كود جديد','too-many':'محاولات كتير. جرب تاني بكرة',
  'code-wrong':'الكود مش صح','code-expired':'الكود انتهى. اطلب كود جديد','blocked':'الحساب ده موقوف','mail-not-set':'إرسال الإيميل لسه مش متجهز','mail-failed':'الإيميل ما اتبعتش. جرب تاني'};

/* ---------- parent login (stage 1): a code to the email (server on) or the student stage opens below (server off / phone only / can't be reached) ---------- */
async function acctSubmit(a,err){
  WL.login=a; WL.pending=false;
  if(!(await syApi())||(!a.email&&!a.phone)){ WL.stage=2; return wlGo('main'); }   // no server yet: kept on this device
  // for now no confirmation (Ahmed 2026-11-15): a stored email OR mobile signs straight in to that account; an unknown one registers a new parent (the code step below stays for later)
  const ref=typeof refCode==='function'?refCode():null;
  const r=await syCall('/auth/login',{email:a.email||'',phone:a.phone||'',curr:WL.pick||currPick()||{},ref,device:syDevice()});
  if(!r||!r.j.ok){ if(r&&r.j.error==='blocked'){ err(SYERR.blocked); return; } if(r&&r.j.error==='too-many'){ err(SYERR['too-many']); return; } WL.pending=true; WL.stage=2; return wlGo('main'); }   // offline / server trouble: go on locally, never show a server message
  syTake(r.j.token,r.j.me);
  if(r.j.me.kids.length&&!WL.adding&&!WL.after){ syRestore(r.j.me); return; }   // a registered parent: the children come back, straight into the app (child picker when more than one)
  syPushKids(); if(WL.after){ const go=WL.after; WL.after=null; go(); } else { WL.stage=2; wlGo('main'); }
}
// the code step (drawn by wlDraw in js/welcome.js)
function syDrawCode(b){
  const a=SY.a||acct()||{};
  b.innerHTML=wlHead('كود التأكيد','Confirmation code')+`<form class="wl-form" novalidate>
    <p class="wl-note">بعتنا كود من ٦ أرقام على <b dir="ltr">${wlEsc(a.email)}</b>${SY.dev?` <small dir="ltr">(dev: ${SY.dev})</small>`:''}</p>
    <label><span>الكود <small>Code</small></span><input name="code" class="wl-code" dir="ltr" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>
    <p class="wl-err" hidden></p>
    <button class="pill wl-big wl-go green" type="submit"><span class="wl-ar">تأكيد</span><small>Confirm</small></button>
    <button class="pill cream wl-resend" type="button"><span class="wl-ar">ابعت كود تاني</span></button></form>`;
  const f=$('form',b), er=$('.wl-err',b), say=t=>{ er.textContent=t; er.hidden=false; };
  setTimeout(()=>f.code.focus(),60);
  $('.wl-resend',b).addEventListener('click',async()=>{ const r=await syCall('/auth/start',{email:a.email}); if(!r) return say('مفيش إنترنت دلوقتي');
    if(!r.j.ok) return say(SYERR[r.j.error]||'حصلت مشكلة'); SY.dev=r.j.devCode||''; say('اتبعت كود جديد'); });
  f.addEventListener('submit',async e=>{ e.preventDefault(); const code=f.code.value.trim();
    if(!/^[0-9٠-٩]{6}$/.test(code)) return wlBad(f,'code','اكتب الـ ٦ أرقام');
    const ref=typeof refCode==='function'?refCode():null;
    const r=await syCall('/auth/verify',{email:a.email,code,phone:a.phone,curr:WL.pick||currPick()||{},ref,device:syDevice()});
    if(!r) return say('مفيش إنترنت دلوقتي');
    if(!r.j.ok) return wlBad(f,r.j.error==='code-wrong'?'code':'',(SYERR[r.j.error]||'حصلت مشكلة')+(r.j.error==='code-wrong'&&r.j.left>=0?` (باقي ${r.j.left} محاولات)`:''));
    syTake(r.j.token,r.j.me);
    if(r.j.me.kids.length&&!WL.adding&&!WL.after){ syRestore(r.j.me); return; }   // a registered parent: their children come back, straight into the app (child picker when more than one)
    syPushKids(); if(WL.after){ const go=WL.after; WL.after=null; go(); } else { WL.stage=2; wlGo('main'); } });   // a new parent: the student stage opens
}
// keep the signed-in parent on this device
function syTake(token,me){ const old=acct()||{}; try{ localStorage.removeItem('es.ref'); }catch(e){}   // the link visit is used up by this sign-in / sign-up (no lasting tie)
  wlSet('es.session',{token,id:me.id,ref:me.ref});
  wlSet('es.account',{email:me.email,phone:me.phone||old.phone||'',created:me.created||old.created,id:me.id,ref:me.ref,notify:me.notify!==false});
  window.ACCOUNT={...acct(),id:me.id,token}; if(me.wallet&&typeof walletSave==='function') walletSave(me.wallet); }
// the server's children replace this device's: each child's progress goes to its own keys, the first child becomes the active one
function syRestore(me){
  const K=me.kids.map(k=>({id:k.id,name:k.name,grade:k.grade,curr:k.curr,created:k.created}));
  try{ me.kids.forEach(k=>{ const P={...(k.progress||{}),'es.unlocked':JSON.stringify(k.unlocked||[]),'es.freeused':JSON.stringify(k.freeused||[])};
    KID_KEYS.forEach(x=>{ if(P[x]!=null) localStorage.setItem(`es.kid.${k.id}.${x}`,P[x]); else localStorage.removeItem(`es.kid.${k.id}.${x}`); });
    wlSet('es.progAt.'+k.id,k.progressAt||0); });
    const f=K[0]; KID_KEYS.forEach(x=>{ const v=localStorage.getItem(`es.kid.${f.id}.${x}`); if(v==null) localStorage.removeItem(x); else localStorage.setItem(x,v); }); }catch(e){}
  wlSet('es.kids',K); wlSet('es.kid',K[0].id); currSave(K[0].curr); if(K.length>=1){ try{ sessionStorage.setItem('es.pick','1'); }catch(e){} } location.reload();
}
// send this device's children (name, grade, curriculum) to the server
function syPushKids(){ if(!sySession()) return; kids().forEach(k=>syCall('/kids/'+k.id,{name:k.name,grade:k.grade,curr:k.curr},'PUT')); }
// send the active child's progress (stars, map place, opened lessons, words); unlocks / free picks go through js/coins.js
function syPushProgress(){ const k=kidNow(); if(!k||!sySession()) return; const P={}, at=Date.now();
  ['zoom-stars','zoom-opened','zoom-last','zoom-vocab'].forEach(x=>{ const v=localStorage.getItem(x); if(v!=null) P[x]=v; });
  const key=JSON.stringify(P); if(SY.lastProg===key) return; SY.lastProg=key;
  syCall('/kids/'+k.id+'/progress',{progress:P,at},'PUT').then(r=>{ if(r&&r.j.ok) wlSet('es.progAt.'+k.id,at); else SY.lastProg=null; }); }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') syPushProgress(); });
setInterval(syPushProgress,120e3);

/* ---------- on app open: refresh from the server (children, newer progress from another device) ---------- */
async function syBoot(){
  const s=sySession(); if(!s||!s.token) return;
  const r=await syCall('/me'); if(!r||!r.j.ok) return;
  const me=r.j.me, local=kids(), ids=new Set(me.kids.map(k=>k.id)); let changed=false, regrant=false;
  if(me.ref){ const a=acct()||{}; if(a.ref!==me.ref){ wlSet('es.account',{...a,ref:me.ref}); wlSet('es.session',{...(sySession()||{}),ref:me.ref}); } window.ACCOUNT={...(window.ACCOUNT||acct()||{}),ref:me.ref}; }   // the invite link needs the parent's code
  // the school permission the admin gave (or took back) for a student: kept in the child's curriculum pick (curr.grant)
  me.kids.forEach(sk=>{ const lk=local.find(x=>x.id===sk.id); if(!lk||!lk.curr||!lk.curr.school) return; const g=sk.curr&&sk.curr.grant?1:0; if((lk.curr.grant?1:0)!==g){ if(g) lk.curr.grant=1; else lk.curr.grant=0; changed=true; const c=kidNow(); if(c&&c.id===lk.id) regrant=true; } });
  local.filter(k=>!ids.has(k.id)).forEach(k=>syCall('/kids/'+k.id,{name:k.name,grade:k.grade,curr:k.curr},'PUT'));   // made offline
  me.kids.filter(k=>!local.some(x=>x.id===k.id)).forEach(k=>{ local.push({id:k.id,name:k.name,grade:k.grade,curr:k.curr,created:k.created}); changed=true;
    try{ Object.entries(k.progress||{}).forEach(([x,v])=>localStorage.setItem(`es.kid.${k.id}.${x}`,v)); }catch(e){} wlSet('es.progAt.'+k.id,k.progressAt||0); });
  if(changed){ wlSet('es.kids',local); kidPaint(); if(regrant){ const c=kidNow(); if(c){ currSave(c.curr); location.reload(); return; } } }
  // the active child played on another device later than this one sent: take that copy
  const cur=kidNow(), sk=cur&&me.kids.find(k=>k.id===cur.id);
  if(sk&&sk.progressAt>(wlGet('es.progAt.'+cur.id,0)||0)&&Object.keys(sk.progress||{}).length){
    try{ Object.entries(sk.progress).forEach(([x,v])=>localStorage.setItem(x,v)); }catch(e){} wlSet('es.progAt.'+cur.id,sk.progressAt); location.reload(); }
}
syBoot();

/* ---------- account page: sign out (no email confirmation any more, Ahmed 2026-11-16) ---------- */
async function syMenuButtons(p,close){
  const list=$('.arows',p); if(!list||$('.wl-acct',list)) return;
  const b=el('button','arow wl-acct',`<i>${ACH.out}</i><b>تسجيل الخروج</b><s></s>`);
  list.append(b);
  b.addEventListener('click',async()=>{ close(); if(!confirm('تسجيل الخروج من الجهاز ده؟')) return;
    const s=sySession(); if(s){ syPushProgress(); await syCall('/auth/signout',{}); syForget(); }
    ['es.account','es.kids','es.kid'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} }); location.reload(); });
}

// a link opened while already signed in: tell the server (a fresh one-off pending referral for this parent), then forget it on this device
setTimeout(()=>{ const c=typeof refCode==='function'?refCode():null; if(c&&sySession()) syCall('/ref',{code:c},'POST').then(r=>{ if(r&&r.j&&r.j.ok) try{ localStorage.removeItem('es.ref'); }catch(e){} }); },1800);
;
/* ===== js/subs.js ===== */
/* TERM SUBSCRIPTIONS (Ahmed 2026-11-11, spec: docs/subscriptions-spec.md). Per CHILD, per TERM, all subjects; price per school year + term from the
   dashboard (settings.subs.prices["p1:t1"] = {price, discOn, disc}); manual InstaPay: the parent pays on the InstaPay link, uploads a compressed
   receipt picture + the reference number. The upload opens THAT child's term for 24 hours ONCE (per child per term); the admin then confirms
   (open until 31 Aug) or rejects (closed at once). Everything ends on 31 Aug. No device data is stored anywhere.
   Records live in es.subs = {childId:{"p1:t1":{st,at,trial,until,price,ref,seen}}}: st = pending | active | rejected | closed; trial = ms the 24 h run to.
   With the server (settings "api") the server is the truth: GET /subs fills es.subs, POST /subs sends the receipt (server/src/index.js subs). */
const SUBT_ALL=[['t1','الترم الأول'],['t2','الترم التاني']], SUBT=SUBT_ALL.filter(x=>x[0]==='t1');   // الترم التاني مخفي لحد ما يتبني (ضيفي 't2' في الفلتر يرجع)
const subKey=(k,t)=>(k&&k.grade||'p1')+':'+t;
const subTermNow=()=>/2/.test((window.COURSE&&COURSE.term)||'')?'t2':'t1';   // the term this app's lessons belong to
const subAll=()=>cGet('es.subs',{});
const subRec=(kid,t)=>{ const k=typeof kid==='string'?kids().find(x=>x.id===kid):kid; return k?((subAll()[k.id]||{})[subKey(k,t)]||null):null; };
function subSave(kidId,key,rec){ const A=subAll(); A[kidId]=A[kidId]||{}; if(rec) A[kidId][key]=rec; else delete A[kidId][key]; cSet('es.subs',A); }
// 31 August: the next one after t (school year end; the "ends" date of every purchase)
function subEnd(t){ const d=new Date(t||Date.now()), y=d.getFullYear(), e=new Date(y,7,31,23,59,59); return (d>e?new Date(y+1,7,31,23,59,59):e).getTime(); }
// is this child's term open right now (paid + confirmed, or inside the one-time 24 h after the receipt)
function subOpen(){ const k=kidNow(); if(!k) return false; const r=subRec(k,subTermNow()), t=Date.now(); if(!r||t>=(r.until||0)) return false;
  return r.st==='active'||(r.st==='pending'&&t<(r.trial||0)); }
function subPrice(grade,t){ const p=((ESET.subs||{}).prices||{})[grade+':'+t]||{}, fin=p.discOn&&+p.disc>0?+p.disc:(+p.price||0); return {price:+p.price||0,fin,disc:!!(p.discOn&&+p.disc>0)}; }
const subDateL=t=>{ try{ return new Date(t).toLocaleDateString('ar-EG-u-nu-latn',{day:'numeric',month:'long',year:'numeric'}); }catch(e){ return ''; } };   // Latin digits (the parent popups)
const subDate=t=>{ try{ return new Date(t).toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'}); }catch(e){ return ''; } };
// the end of a term: expired records are removed and that child's opened lessons + progress start again (Ahmed: everything ends 31 Aug, progress not kept)
const SUB_PROG=['zoom-stars','zoom-opened','zoom-last','zoom-vocab','es.unlocked','es.freeused'];
function subExpire(){ const A=subAll(), now=Date.now(); let ch=false, cur=kidNow(), reload=false;
  Object.keys(A).forEach(id=>Object.keys(A[id]).forEach(key=>{ const r=A[id][key]; if(r.until&&now>=r.until){ delete A[id][key]; ch=true;
    try{ SUB_PROG.forEach(x=>{ if(cur&&cur.id===id){ localStorage.removeItem(x); reload=true; } localStorage.removeItem(`es.kid.${id}.${x}`); }); }catch(e){} } }));
  if(ch){ cSet('es.subs',A); if(reload) setTimeout(()=>location.reload(),50); } }
// credit / promo unlocks end on 31 Aug as well (Ahmed): a 'credit' record {st:'credit',until} per child marks the season of the opened lessons; subExpire wipes it with the rest
function subSeason(kidId){ const k=kidId?kids().find(x=>x.id===kidId):kidNow(); if(!k) return; const A=subAll(); A[k.id]=A[k.id]||{}; const r=A[k.id].credit;
  if(!r||!r.until||Date.now()>=r.until){ A[k.id].credit={st:'credit',at:Date.now(),until:subEnd(Date.now()),seen:true}; cSet('es.subs',A); } }
function subLegacy(){ try{ kids().forEach(k=>{ const cur=kidNow(), v=cur&&cur.id===k.id?localStorage.getItem('es.unlocked'):localStorage.getItem(`es.kid.${k.id}.es.unlocked`);
  let n=[]; try{ n=JSON.parse(v||'[]'); }catch(e){} if(n.length) subSeason(k.id); }); }catch(e){} }
subExpire(); subLegacy();

/* ---------- the server copy: GET /subs; a change to active / rejected / closed shows ONE message (and the account row shows a dot until then) ---------- */
async function subSync(){ const s=typeof sySession==='function'&&sySession(); if(!s||!s.token||!API()) return;
  const r=await syCall('/subs'); if(!r||!r.j.ok) return; const A={}, old=subAll(), mine=new Set(kids().map(k=>k.id));
  r.j.subs.forEach(x=>{ if(!mine.has(x.child)) return; const o=((old[x.child]||{})[x.term])||{};
    (A[x.child]=A[x.child]||{})[x.term]={st:x.st,at:x.at,trial:x.trial,until:x.until,price:x.price,ref:x.ref,note:x.note||'',dec:x.dec||0,seen:o.st===x.st?o.seen:(x.st==='pending')}; });
  Object.keys(old).forEach(id=>{ if(!mine.has(id)) A[id]=old[id]; else Object.keys(old[id]).forEach(key=>{ if(old[id][key].st==='credit') (A[id]=A[id]||{})[key]=old[id][key]; else if(!(A[id]||{})[key]&&old[id][key].st==='pending'&&!r.j.subs.length) (A[id]=A[id]||{})[key]=old[id][key]; }); });
  cSet('es.subs',A); const o=$('#acctPage'); if(o&&!o.hidden) subDot(o); const sp=$('#subsPage'); if(sp&&!sp.hidden) subsOpen(); const np=$('#notifPage'); if(np&&!np.hidden) notifsOpen(); if(typeof puBadge==='function') puBadge(); }
function subNews(){ const out=typeof refNotices==='function'?refNotices().filter(x=>!x.r.seen):[]; const A=subAll(); kids().forEach(k=>Object.entries(A[k.id]||{}).forEach(([key,r])=>{ if(!r.seen&&(r.st==='active'||r.st==='rejected'||r.st==='closed')) out.push({k,key,r}); })); return out; }
function subDot(o){ const b=$('.ac-news em',o); const n=subNews().length; if(b) b.textContent=n?num(n)+' جديد':''; }
setTimeout(subSync,1500); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) subSync(); });

/* ---------- the receipt picture: made small in the browser (about 100 KB) before it is sent ---------- */
function subShrink(file){ return new Promise((ok,no)=>{ const im=new Image(), u=URL.createObjectURL(file);
  im.onload=()=>{ URL.revokeObjectURL(u); let w=im.naturalWidth, h=im.naturalHeight, side=1100, out='';
    for(let round=0;round<4;round++){ const f=Math.min(1,side/Math.max(w,h)), c=document.createElement('canvas'); c.width=Math.round(w*f); c.height=Math.round(h*f);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      for(const q of [.72,.6,.48,.36]){ out=c.toDataURL('image/jpeg',q); if(out.length<=137000) return ok(out); }
      side=Math.round(side*.75); }
    ok(out); };
  im.onerror=()=>{ URL.revokeObjectURL(u); no(new Error('img')); }; im.src=u; }); }

/* ---------- screens (the account page row "اشتراكاتي") ---------- */
const subIsOn=()=>!!((ESET.subs||{}).on);
function subStat(r,t){ const now=Date.now(); if(!r) return {c:'none',t:'مفيش اشتراك'};
  if(r.until&&now>=r.until) return {c:'none',t:'مفيش اشتراك'};
  if(r.st==='active') return {c:'on',t:'مفعّل لحد '+subDate(r.until)};
  if(r.st==='pending') return {c:'wait',t:now<(r.trial||0)?'مفتوح ٢٤ ساعة لحد ما نتأكد من الدفع':'بنراجع الإيصال'};
  if(r.st==='rejected') return {c:'bad',t:'الدفع ما اتأكدش'};
  return {c:'none',t:'اتقفل'}; }
/* the subscriptions PAGE (Ahmed 2026-11-16): a page in the account area (same look as the profile page), two tabs: الاشتراكات = a table per child, one row per term with a strong
   state (active until / not subscribed / waiting / rejected) and the button to subscribe; الإشعارات = what happened to each receipt (confirmed, rejected + the admin's reason, closed).
   The notices are read from the same subscription records (server GET /subs: st, note, dec = the day the admin decided), so there is one data shape and nothing else to keep in step. */
const SUB_TAB={kid:null};
function subsPage(){ parentGate(()=>subsOpen()); }
// any subscription this account ever had (credit-unlock seasons are not subscriptions)
function subHasAny(){ const A=subAll(); return kids().some(k=>Object.values(A[k.id]||{}).some(r=>r&&r.st&&r.st!=='credit')); }
// the page shows only what exists: active subscriptions (and a receipt still being reviewed) of the student whose tab is open; buying starts from the "عمل اشتراك" button
const subLive=r=>!!r&&(!r.until||Date.now()<r.until)&&(r.st==='active'||r.st==='pending');
function subTermsFor(k){ return SUBT.filter(([t])=>!subLive(subRec(k,t))&&subPrice(k.grade||'p1',t).fin>0); }
function subNew(){ const on=subIsOn(), K=kids(); if(!on||!K.length) return;
  let kid=K.length===1?K[0].id:SUB_TAB.kid;
  const draw=p=>{ const k=K.find(x=>x.id===kid), T=k?subTermsFor(k):[];
    p.innerHTML=`<h2 class="outline">عمل اشتراك</h2><div class="subscroll">${K.length>1?`<p class="msg-text">اختار الطالب</p><div class="sp-pick">${K.map(x=>`<button class="pill ${x.id===kid?'green':'cream'} sp-pk" data-k="${x.id}">${wlEsc(x.name)}</button>`).join('')}</div>`:''}
      ${k?(T.length?`<p class="msg-text">اختار الترم</p><div class="sp-pick">${T.map(([t,tn])=>`<button class="pill yellow sp-pt" data-t="${t}">${tn}<small>${num(subPrice(k.grade||'p1',t).fin)} جنيه</small></button>`).join('')}</div>`:'<p class="msg-text">مفيش ترمات متاحة للاشتراك دلوقتي.</p>'):''}
      <button class="pill cream sp-pc">إلغاء</button></div>`;
    $$('.sp-pk',p).forEach(b=>b.addEventListener('click',()=>{ kid=b.dataset.k; draw(p); }));
    $$('.sp-pt',p).forEach(b=>b.addEventListener('click',()=>{ coinClose(); subBuy(kid,b.dataset.t); }));
    $('.sp-pc',p).addEventListener('click',coinClose); };
  coinPopPro('<div class="sp-pop"></div>',p=>draw($('.sp-pop',p))); }
function subsOpen(tab){ if(tab) SUB_TAB.kid=tab; const on=subIsOn();
  let o=$('#subsPage'); if(!o){ o=el('div','acctpage',''); o.id='subsPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Subscriptions'); document.body.append(o); }
  const K=kids(), cur=kidNow(); if(!K.find(x=>x.id===SUB_TAB.kid)) SUB_TAB.kid=(cur&&cur.id)||(K[0]&&K[0].id);
  const k=K.find(x=>x.id===SUB_TAB.kid);
  const rows=k?SUBT.map(([t,tn])=>({t,tn,r:subRec(k,t)})).filter(x=>subLive(x.r)):[];
  const tabs=K.length>1?`<div class="sp-tabs" role="tablist">${K.map(x=>`<button class="sp-tab-b${x.id===SUB_TAB.kid?' on':''}" data-tab="${x.id}" role="tab">${wlEsc(x.name)}</button>`).join('')}</div>`:'';
  const body=(on?`<button class="pill green sp-new">عمل اشتراك</button>`:'<p class="sp-soon">الاشتراكات غير مفعلة حاليا</p>')+tabs+
    `<section class="ac-card sp-kid">${K.length>1?'':`<h3>${k?wlEsc(k.name):''}</h3>`}${rows.length?`<div class="sp-tbl" role="table">${rows.map(({t,tn,r})=>{ const s=subStat(r,t), ic=s.c==='on'?'✓':'…';
      return `<div class="sp-r ${s.c}" role="row"><b>${tn}</b><span class="sp-s"><i class="sp-ic">${ic}</i>${s.t}</span></div>`; }).join('')}</div>`:`<p class="sp-empty">مفيش اشتراكات مفعّلة${k?' لـ '+wlEsc(k.name):''}.</p>`}</section>`;
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back sp-back" aria-label="Back">${ICON.back}</button><h2>اشتراكاتي</h2></div><div class="ac-in">${body}</div>`;
  $('.sp-back',o).addEventListener('click',()=>o.hidden=true);
  $$('.sp-tab-b',o).forEach(b=>b.addEventListener('click',()=>subsOpen(b.dataset.tab)));
  const nb=$('.sp-new',o); if(nb) nb.addEventListener('click',subNew);
  o.hidden=false; }
/* ---------- the NOTIFICATIONS page (Ahmed 2026-11-17): its own row in the account page ("الإشعارات") and the bell on the home page (with the unread count) both open it.
   Inside: the on / off switch of the device notifications (js/push.js; before the first permission it is one button that asks), a filter all / unread only, "mark all as read",
   and the list = what happened to each receipt (confirmed, rejected + the admin's reason, closed; read from the subscription records). A notice is unread until it is tapped or "mark all" is pressed; nothing ever pops up by itself. ---------- */
const NF={f:'all'};
const notifUnread=n=>!n.r.seen&&(n.r.st==='ref'||n.r.st==='active'||n.r.st==='rejected'||n.r.st==='closed');
function subNotices(){ const out=[]; const A=subAll(); kids().forEach(k=>Object.entries(A[k.id]||{}).forEach(([key,r])=>{ if(r.st==='credit'||!r.st) return; out.push({k,key,r,t:r.dec||r.at||0}); })); if(typeof refNotices==='function') out.push(...refNotices()); return out.sort((a,b)=>b.t-a.t); }
function notifRefresh(){ if(typeof puBadge==='function') puBadge(); const ap=$('#acctPage'); if(ap&&!ap.hidden) subDot(ap); }
function notifMark(keys){ const A=subAll(); let ch=false; Object.entries(A).forEach(([kid,m])=>Object.entries(m).forEach(([key,r])=>{ if(r&&!r.seen&&(!keys||keys.includes(kid+'|'+key))){ r.seen=true; ch=true; } })); if(ch) cSet('es.subs',A); if(typeof refMark==='function') refMark(keys); notifRefresh(); notifsOpen(); }
function notifsPage(){ notifsOpen(); }
function notifPushRow(o){ const box=$('.nf-push',o); if(!box) return;
  if(typeof puCan!=='function'||!puCan()){ box.hidden=true; return; }
  const perm=typeof Notification!=='undefined'?Notification.permission:'default', on=!!PUSH.sub&&perm==='granted', first=!PUSH.sub&&perm==='default';
  box.hidden=false;
  box.innerHTML=first?`<span class="nf-ask-t">خلّي الإشعارات توصلك على الجهاز حتى لو التطبيق مقفول</span><button class="pill green nf-ask" type="button">فعّل الإشعارات</button>`
    :`<label class="pf-sw"><input type="checkbox" class="nf-sw"${on?' checked':''}><i></i><span>تفعيل/إيقاف الإشعارات</span></label>`;
  const go=async()=>{ await puToggle(); notifPushRow(o); };
  const a=$('.nf-ask',box), w=$('.nf-sw',box); if(a) a.addEventListener('click',go); if(w) w.addEventListener('click',e=>{ e.preventDefault(); go(); }); }
function notifsOpen(){ const on=subIsOn();
  let o=$('#notifPage'); if(!o){ o=el('div','acctpage',''); o.id='notifPage'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Notifications'); document.body.append(o); }
  const all=subNotices(), nu=all.filter(notifUnread).length, L=NF.f==='unread'?all.filter(notifUnread):all;
  const tabs=`<div class="nf-seg" role="tablist"><button class="nf-sb${NF.f==='all'?' on':''}" data-f="all" role="tab">الكل</button><button class="nf-sb${NF.f==='unread'?' on':''}" data-f="unread" role="tab">غير المقروء${nu?`<i class="sp-dot">${num(nu)}</i>`:''}</button></div>`;
  const list=L.length?`<div class="sp-news">${L.map(n=>{ if(n.r.st==='ref') return `<article class="ac-card sp-n active${notifUnread(n)?' unread':''}" data-nk="${n.k.id}|${n.key}"><div class="sp-nh"><b>دعوة صديق</b><small>${n.t?subDate(n.t):''}</small></div><p>${n.r.sub?'تم اشتراك':'تم تسجيل'} <b>${wlEsc(n.r.who||'صديق')}</b> ${n.r.sub?'':'كحساب جديد '}عن طريق لينك الدعوة بتاعك وخدت <b>${num(n.r.n)}</b> كريدت.</p></article>`; const t=n.key.split(':')[1], tn=(SUBT_ALL.find(x=>x[0]===t)||[])[1]||'', st=n.r.st, expired=n.r.until&&Date.now()>=n.r.until;
      const kind=expired||st==='closed'?'closed':st, ttl={active:'تم تفعيل الاشتراك',rejected:'الاشتراك ما اتفعلش',closed:'الاشتراك اتقفل',pending:'وصلنا الإيصال'}[kind]||'';
      const txt={active:`اشتراك <b>${wlEsc(n.k.name)}</b> في ${tn} مفعّل ومفتوح لحد ${subDate(n.r.until)}.`,
        rejected:`مقدرناش نتأكد من الدفع لاشتراك <b>${wlEsc(n.k.name)}</b> في ${tn}، فالدروس اتقفلت.`,
        closed:`اشتراك <b>${wlEsc(n.k.name)}</b> في ${tn} اتقفل.`,
        pending:`إيصال اشتراك <b>${wlEsc(n.k.name)}</b> في ${tn} وصلنا وبنراجعه.`}[kind]||'';
      return `<article class="ac-card sp-n ${kind}${notifUnread(n)?' unread':''}" data-nk="${n.k.id}|${n.key}"><div class="sp-nh"><b>${ttl}</b><small>${n.t?subDate(n.t):''}</small></div><p>${txt}</p>${kind==='rejected'?`<p class="sp-why"><span>السبب</span>${wlEsc(n.r.note||'مقدرناش نتأكد من الدفع').replace(/\n/g,'<br>')}</p>`:''}${kind==='rejected'&&on?`<button class="pill green sp-buy" data-k="${n.k.id}" data-t="${t}">ابعت الإيصال تاني</button>`:''}</article>`; }).join('')}</div>`
    :`<section class="ac-card"><p class="sp-empty">${NF.f==='unread'?'مفيش إشعارات غير مقروءة.':'مفيش إشعارات لسه.'}</p></section>`;
  o.innerHTML=`<div class="ac-top"><button class="rb ac-back nf-back" aria-label="Back">${ICON.back}</button><h2>الإشعارات</h2></div><div class="ac-in"><section class="ac-card nf-push" hidden></section>${tabs}${nu?'<button class="pill yellow nf-all" type="button">تعليم الكل كمقروء</button>':''}${list}</div>`;
  $('.nf-back',o).addEventListener('click',()=>{ o.hidden=true; notifRefresh(); });
  $$('.nf-sb',o).forEach(b=>b.addEventListener('click',()=>{ NF.f=b.dataset.f; notifsOpen(); }));
  const ba=$('.nf-all',o); if(ba) ba.addEventListener('click',()=>notifMark());
  $$('.sp-n.unread',o).forEach(a=>a.addEventListener('click',e=>{ if(e.target.closest('.sp-buy')) return; notifMark([a.dataset.nk]); }));
  $$('.sp-buy',o).forEach(b=>b.addEventListener('click',()=>subBuy(b.dataset.k,b.dataset.t)));
  notifPushRow(o); o.hidden=false; }
function subBuy(kidId,t,back,done){ const k=kids().find(x=>x.id===kidId); if(!k) return; const key=subKey(k,t), r=subRec(k,t), pr=subPrice(k.grade||'p1',t), S=ESET.subs||{}, tn=(SUBT_ALL.find(x=>x[0]===t)||[])[1];
  const live=r&&(!r.until||Date.now()<r.until)&&(r.st==='active'||r.st==='pending');
  if(live&&r.st==='active'||live&&r.st==='pending'&&Date.now()>=(r.trial||0)){   // paid, or the receipt is waiting for the admin: only the state
    const s=subStat(r,t); return coinPopPro(`<h2 class="outline">${wlEsc(k.name)} · ${tn}</h2><p class="msg-text">${s.t}</p><button class="pill green" data-ok>تمام</button>`,p=>$('[data-ok]',p).addEventListener('click',()=>{ coinClose(); if(done) done(); else subsOpen(); })); }
  let disc=null;   // a percent promo code typed on this page: {pct, code}
  const link=S.link||'', who=S.name||'', pro=ESET.promoOn!==false&&((ESET.promos&&ESET.promos.length)||API());
  const shareTxt=`رابط الدفع لاشتراك ${k.name} في ${tn}:`;
  coinPopPro(`<h2 class="outline">${CT('اشتراك','Subscription')} ${wlEsc(k.name)} · ${tn}</h2>
    <div class="subscroll"><p class="subprice" data-sp>${pr.disc?`<s>${EN(pr.price)}</s> `:''}<b>${EN(pr.fin)}</b> جنيه</p>
    <p class="subsub">كل المواد · لحد ${subDateL(subEnd())}</p>
    <ol class="substeps"><li><span class="subst-n">1</span><div><span><b>ادفع على إنستا باي</b>${who?` لحساب <b>${wlEsc(who)}</b>`:''}</span>
        ${link?`<a class="pill subpay" href="${wlEsc(link)}" target="_blank" rel="noopener">افتح إنستا باي</a>`:''}
        ${link?`<div class="subshare"><small>هتدفع من جهاز تاني؟ ابعت رابط الدفع:</small><div class="shrow">${SHAPPS.map(a=>`<button type="button" class="shmini" data-pay="${a[0]}" style="--shc:${a[3]}" aria-label="${a[1]}" title="${a[1]}"><i>${a[4]}</i></button>`).join('')}</div></div>`:''}</div></li>
      <li><span class="subst-n">2</span><div><b>اكتب رقم العملية وارفع صورة الإيصال</b>
    <form class="subf" autocomplete="off" novalidate>
      <label><span>رقم العملية</span><input name="ref" dir="ltr" inputmode="text" maxlength="40" required></label>
      <label class="subfile"><span>صورة الإيصال</span><input type="file" name="img" accept="image/*" required></label>
      <p class="subimg" hidden></p><p class="wl-err" hidden></p>
      <button class="pill green wl-big" type="submit"><span class="wl-ar">ابعت الإيصال</span></button></form></div></li></ol>
    <p class="subnote">بعد ما تبعت الإيصال الدروس بتتفتح 24 ساعة لحد ما نتأكد من الدفع.<br>الاشتراك لحد ${subDateL(subEnd())}، وبعدها الدروس بتتقفل والتقدم بيبدأ من الأول.<br>مفيش استرجاع للفلوس.</p>${pro?promoLine():''}
    <button type="button" class="pill cream subback">${back?'رجوع':'إلغاء'}</button></div>`,
    p=>{ $$('[data-pay]',p).forEach(b=>b.addEventListener('click',()=>shareGo(b.dataset.pay,shareTxt,link)));
      $('.subback',p).addEventListener('click',()=>{ coinClose(); if(back) back(); });
      const fin=()=>disc?Math.max(1,Math.round(pr.fin*(100-disc.pct)/100)):pr.fin;
      promoWire(p,()=>{ subsOpen(); },{pct:(n,code)=>{ disc={pct:n,code};
        $('[data-sp]',p).innerHTML=`<s>${EN(pr.fin)}</s> <b>${EN(fin())}</b> جنيه<small class="subpct">خصم ${EN(n)}%</small>`;
        const b=$('[data-promo]',p), pf=$('.cpromof',p); if(b) b.hidden=true; if(pf) pf.hidden=true; p.classList.remove('promo-on'); }});
      const f=$('.subf',p), er=$('.wl-err',p), im=$('.subimg',p); let pic='';
      const say=m=>{ er.textContent=m; er.hidden=false; };
      f.img.addEventListener('change',async()=>{ pic=''; im.hidden=true; const file=f.img.files[0]; if(!file) return;
        try{ pic=await subShrink(file); im.textContent='الصورة جاهزة ('+num(Math.round(pic.length*.75/1024))+' ك.ب)'; im.hidden=false; er.hidden=true; }catch(e){ say('الصورة دي مش بتفتح. جرب صورة تانية'); } });
      f.addEventListener('submit',async e=>{ e.preventDefault(); const ref=f.ref.value.trim();
        if(!ref) return wlBad(f,'ref','اكتب رقم العملية'); if(!pic) return wlBad(f,'img','ارفع صورة الإيصال');
        const go=$('button[type=submit]',f); go.disabled=true; const t0=Date.now();
        let rec; const has=subRec(k,t);
        if(API()&&typeof sySession==='function'&&sySession()){ const x=await syCall('/subs',{child:k.id,term:key,ref,receipt:pic,...(disc?{promo:disc.code}:{})});
          if(!x){ go.disabled=false; return say('مفيش إنترنت دلوقتي'); }
          if(!x.j.ok){ go.disabled=false; return say({'already':'الاشتراك ده شغال','pending':'الإيصال متبعت وبنراجعه','no-price':'السعر لسه متحددش','big':'الصورة كبيرة','bad-receipt':'الصورة مش مظبوطة','off':'الاشتراك لسه مش شغال','bad':'الكود ده مش صحيح','old':'الكود ده انتهى','used':'الكود ده اتستخدم قبل كده','full':'الكود ده خلص عدد مرات استخدامه'}[x.j.error]||'حصلت مشكلة. جرب تاني'); }
          rec={st:'pending',at:x.j.at,trial:x.j.trial,until:x.j.until,price:fin(),ref,seen:true}; }
        else rec={st:'pending',at:t0,trial:has&&has.trialUsed?0:t0+864e5,until:subEnd(t0),price:fin(),ref,seen:true,trialUsed:true,local:true}; if(disc) promoSpend(disc.code);   // no server: kept on this device (admin cannot see it)
        subSave(k.id,key,rec); coinClose(); if(typeof chime==='function') chime(3);
        coinPopPro(`<h2 class="outline">وصلنا الإيصال</h2><p class="msg-text">الدروس اتفتحت لـ <b>${wlEsc(k.name)}</b> لمدة 24 ساعة لحد ما نتأكد من الإيصال.</p><button class="pill green" data-ok>تمام</button>`,
          p2=>$('[data-ok]',p2).addEventListener('click',()=>{ coinClose(); if(typeof drawSubjects==='function'&&!$('#subjects').hidden) drawSubjects(); const sp=$('#subsPage'); if(sp&&!sp.hidden) subsOpen(); if(done) done(); })); }); }); }
;
/* ===== js/install.js ===== */
/* INSTALL-APP BUTTON (Ahmed 2026-11-20): in a normal phone browser a floating button "نزّل التطبيق على جهازك" opens a popup with the steps to put the app
   on the home screen, chosen by the phone/browser. Never shown when the app is already opened from the home screen (installed / standalone).
   Same file in both apps (EasyStudy orange, Easy Words blue via --pa); the name comes from the page (Easy Words = html[data-theme=words]). */
(function(){
  const KEY='es.install.off', DAYS=7, ua=navigator.userAgent||'';
  const standalone=()=>{ try{ return navigator.standalone===true||['standalone','fullscreen','minimal-ui','window-controls-overlay'].some(m=>matchMedia('(display-mode: '+m+')').matches)||/^android-app:/.test(document.referrer||''); }catch(e){ return false; } };
  const iOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const android=/Android/i.test(ua);
  if(!/^https?:/.test(location.protocol)||!(iOS||android)||standalone()) return;
  const off=()=>{ try{ const t=+localStorage.getItem(KEY); return t&&Date.now()-t<DAYS*864e5; }catch(e){ return false; } };
  let ev=null, installed=false;
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); ev=e; });
  window.addEventListener('appinstalled',()=>{ installed=true; closeIt(); const b=document.getElementById('instBtn'); if(b) b.remove(); });
  const kind=()=>{
    if(iOS){ return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|Line\/|; wv\)/.test(ua)||!/Safari/.test(ua)?'ios-other':'ios-safari'; }
    if(/SamsungBrowser/i.test(ua)) return 'samsung';
    if(/Firefox|OPR\/|Opera|EdgA|UCBrowser|; wv\)/.test(ua)) return 'generic';
    if(/Chrome\//.test(ua)) return 'chrome';
    return 'generic';
  };
  const I={
    share:'<svg viewBox="0 0 24 24"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
    add:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    dots:'<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
    menu:'<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    safari:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    home:'<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/></svg>',
    ok:'<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
    dl:'<svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>'
  };
  const STEPS=()=>{
    const n=document.documentElement.dataset.theme==='words'?'Easy Words':'EasyStudy', k=kind();
    const M={
      'ios-safari':{t:'على الآيفون (Safari)',s:[[I.share,'اضغط على زر المشاركة <b>Share</b> في أسفل الشاشة'],[I.add,'اختار <b>Add to Home Screen</b> (إضافة إلى الشاشة الرئيسية)'],[I.ok,'اضغط <b>Add</b> وهتلاقي التطبيق على الشاشة الرئيسية']]},
      'ios-other':{t:'على الآيفون',s:[[I.safari,'افتح الموقع من متصفح <b>Safari</b> (انسخ الرابط والصقه فيه)'],[I.share,'اضغط على زر المشاركة <b>Share</b> في أسفل الشاشة'],[I.add,'اختار <b>Add to Home Screen</b> ثم اضغط <b>Add</b>']]},
      'chrome':{t:'على الأندرويد (Chrome)',s:[[I.dots,'اضغط على النقط الثلاث <b>⋮</b> أعلى المتصفح'],[I.dl,'اختار <b>Install app</b> (تثبيت التطبيق) أو <b>Add to Home screen</b>'],[I.ok,'اضغط <b>Install</b> وهتلاقي التطبيق على الشاشة الرئيسية']]},
      'samsung':{t:'على سامسونج (Samsung Internet)',s:[[I.menu,'اضغط على زر القائمة <b>☰</b> أسفل المتصفح'],[I.add,'اختار <b>Add page to</b> ثم <b>Home screen</b>'],[I.ok,'اضغط <b>Add</b> وهتلاقي التطبيق على الشاشة الرئيسية']]},
      'generic':{t:'على موبايلك',s:[[I.dots,'افتح قائمة المتصفح (النقط أو الخطوط في أعلى الشاشة أو أسفلها)'],[I.add,'دوّر على <b>Add to Home screen</b> أو <b>Install app</b>'],[I.home,'أكد وهتلاقي التطبيق على الشاشة الرئيسية']]}
    };
    return {name:n,k:k,...M[k]};
  };
  function closeIt(){ const p=document.getElementById('instPop'); if(p) p.remove(); }
  function open(){
    closeIt(); const d=STEPS(), canNative=!!ev&&d.k==='chrome';
    const p=document.createElement('div'); p.id='instPop'; p.className='inst-back'; p.dir='rtl';
    p.innerHTML='<div class="inst-card" role="dialog" aria-modal="true"><button class="inst-x" aria-label="إغلاق">✕</button>'+
      '<div class="inst-ic">'+I.home+'</div><h3>نزّل '+(document.documentElement.dataset.theme==='words'?'تطبيق ':'تطبيق ')+d.name+' على جهازك</h3>'+
      '<p class="inst-sub">'+d.t+' — خطوات بسيطة وبتفتحه بعد كده زي أي تطبيق</p>'+
      '<ol>'+d.s.map((s,i)=>'<li><span class="inst-n">'+(i+1)+'</span><span class="inst-i">'+s[0]+'</span><span class="inst-t">'+s[1]+'</span></li>').join('')+'</ol>'+
      (canNative?'<button class="pill inst-go">نزّل التطبيق الآن</button>':'')+
      '<button class="pill cream inst-ok">تمام</button></div>';
    document.body.appendChild(p);
    p.onclick=e=>{ if(e.target===p) closeIt(); };
    p.querySelector('.inst-x').onclick=p.querySelector('.inst-ok').onclick=closeIt;
    const g=p.querySelector('.inst-go'); if(g) g.onclick=async()=>{ try{ ev.prompt(); await ev.userChoice; }catch(e){} ev=null; closeIt(); };
  }
  function mount(){
    if(installed||off()||standalone()||document.getElementById('instBtn')) return;
    const w=document.createElement('div'); w.id='instBtn'; w.dir='rtl';
    w.innerHTML='<button class="inst-open">'+I.dl+'<span>نزّل التطبيق على جهازك</span></button><button class="inst-close" aria-label="إخفاء">✕</button>';
    document.body.appendChild(w);
    w.querySelector('.inst-open').onclick=open;
    w.querySelector('.inst-close').onclick=()=>{ try{ localStorage.setItem(KEY,String(Date.now())); }catch(e){} w.remove(); };
  }
  setTimeout(mount,2500);
})();
;
/* ===== js/start.js ===== */
/* START — loads the course data (data/course.json + each subject's own file) and opens the first screen (subjects).
   Every other screen is in js/app-rest.js: it starts loading here, in the background, while the subjects page shows. */
let restOk=false;
const REST=new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='js/app-rest.js'; s.onload=()=>{ restOk=true; ok(); }; s.onerror=no; document.head.append(s); });
REST.catch(()=>{});
// run fn once the other screens are loaded (a tap on a subject right after the page opened waits for them behind the loading screen)
function needRest(fn){ if(restOk) return fn(); busy(true); REST.then(()=>{ busy(false); fn(); },()=>{ busy(false); message('Oops!','The app did not load. Check the internet and try again.'); $('#msgOk').onclick=()=>location.reload(); }); }
putCar($('#helloCar')); if(anim) G.to('#helloCar',{y:-5,duration:.9,yoyo:true,repeat:-1,ease:'sine.inOut'});
// stars saved before the files were split used the bare lesson id
function migrateStars(){ try{ ['zoom-stars','zoom-vocab'].forEach(k=>{ const o=JSON.parse(localStorage.getItem(k)||'{}'); let ch=false;
  Object.keys(o).forEach(id=>{ if(/^u\d+l\d+$/.test(id)&&!o['en-ol-'+id]){ o['en-ol-'+id]=o[id]; delete o[id]; ch=true; } });
  if(ch){ localStorage.setItem(k,JSON.stringify(o)); if(k==='zoom-stars') STARS=o; } }); }catch(e){} }
// design file of another build (an old copy kept on the device or in the browser) = screens without their look: fresh files, reload once
async function buildMixed(){
  let b=''; try{ b=getComputedStyle(document.documentElement).getPropertyValue('--app-build').trim().replace(/["']/g,''); }catch(e){}
  if(typeof APP_BUILD==='undefined'||b===APP_BUILD) { try{ sessionStorage.removeItem('es.rebuilt'); }catch(e){} return false; }
  try{ if(sessionStorage.getItem('es.rebuilt')) return false; sessionStorage.setItem('es.rebuilt','1'); }catch(e){ return false; }
  try{ const c=navigator.serviceWorker&&navigator.serviceWorker.controller;
    if(c) await new Promise(ok=>{ const ch=new MessageChannel(); ch.port1.onmessage=()=>ok(); c.postMessage('update',[ch.port2]); setTimeout(ok,5000); });
    await Promise.all(['index.html','css/app.css','js/app-first.js','js/app-rest.js'].map(f=>fetch(f,{cache:'reload'}).catch(()=>{})));
  }catch(e){}
  location.reload(); return true;
}
async function start(){
  migrateStars();
  busy(true);
  try{
    [COURSE,CURR]=await Promise.all([get('data/course.json'),get('data/curriculum.json').catch(()=>null)]);
    COURSE.subjects=COURSE.subjects.filter(s=>!s.hidden);   // hidden:true in data/course.json = subject switched off for now (German, Science); remove the flag to restore
    await Promise.all(COURSE.subjects.filter(s=>s.file).map(async s=>{
      const d=await get(s.file), base=s.file.slice(0,s.file.lastIndexOf('/')+1);
      s.units=d.units; s.labels=d.labels; s.lessons=d.lessons.map(l=>({...l, id:`${s.id}-${l.folder}`, file:l.title?base+l.folder+'/lesson.json':null}));
    }));
    currApply((typeof kidNow==='function'&&kidNow()||{}).curr||currPick());   // the parent's curriculum / school decides the subjects, tabs and map signs (js/curriculum.js)
  }catch(e){ busy(false); message('Oops!','The lessons did not load. Check the internet and try again.'); $('#msgOk').onclick=()=>location.reload(); return; }
  // theme: only an ACTIVE theme in course.json "themes" can be used; an inactive one (cardboard...) is never applied, whatever is saved. Flip "active" to offer it.
  try{ const T=COURSE.themes||{list:[]}, want=localStorage.getItem('es.theme')||T.default||'', ok=(T.list.find(t=>t.id===want)||{}).active;
    const r=document.documentElement; if(ok&&want) r.dataset.theme=want; else delete r.dataset.theme; }catch(e){}
  // design file and fonts: wait for them behind the splash screen (fonts at most 2.5 s, then the page shows with the fallback font)
  await cssReady;
  if(await buildMixed()) return;
  if(document.fonts&&document.fonts.ready) await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]);
  $('#helloSub').textContent=`${COURSE.grade} · ${COURSE.term}`; paintHud(); busy(false); kidPaint(); if(!kidNow()) openWelcome(); else if((()=>{ try{ const v=sessionStorage.getItem('es.pick'); sessionStorage.removeItem('es.pick'); return v; }catch(e){ return null; } })()){ show('welcome'); WL.step='pick'; wlDraw(); } else { openSubjects(); pop('#subjects .top > *',{y:-20}); deepGo(); }   // first launch: curriculum + accounts (js/welcome.js)
  setTimeout(()=>{ const n=$('#splashName'); if(n) n.remove(); $('#loadingText').hidden=false; },400);   // the app name shows on the first screen only; later loads say Loading...
}
// sw.js keeps the app, lessons, sounds and pictures on the device (later opens are instant) and shows library pictures that replaced shipped ones
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(()=>{});
start();
window.__app={award,levelUp,openLesson:m=>openLesson(m),openMap:()=>openMap(),vTeach:()=>vTeach(),vWrite:()=>vWrite(),get LESSON(){return LESSON}};

/* hidden door to the design page (for the grown-ups reviewing): tap the EasyStudy logo 5 times quickly */
(function(){ let n=0,t=0; document.addEventListener('click',e=>{ if(!e.target.closest('.gamelogo')) return; const now=Date.now(); n=now-t<900?n+1:1; t=now; if(n>=5){ n=0; location.href='design.html'; } }); })();
;
