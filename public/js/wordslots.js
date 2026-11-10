/* ===== WORD SLOTS: ONE way to show and write a word, in every subject and every place (Marwa 2026-11-04, RULES.md "Word slots") =====
   Every place builds the word with wsFill / wsWord below and only gives the word (data): Words tab (.vword), missing letter "type" / "letter" (.qword),
   word / sentence writing "write", "arrange", vowel, math words, explainer (qxWordEl -> .qxw).
   Look: css/wordslots.css (same white, same size, a thin light-white line only under letters to type, a wrong letter is never written).
   Here: the keyboard language follows the word, the word (and its lines) stays above the phone keyboard,
   and while typing the Help bulb stands right under the word; with little room (phone on its side) the header steps aside. */
const WS_IN=['vin','qin','qxin'];
/* THE word component. wsFill(box,text,o) fills box (any element) with the word, one <span class="lt"> per letter; wsWord(text,o) = a new <b class="ws">.
   o.hide: true (every letter) or [letter numbers] = still to write (see-through, keeps its place);  o.faint: hidden letters show faintly (copy the example);
   o.parts: [part texts] = the letters shown in groups in <span class="wsg" data-p> (syllables / chips; ' ' = a space);  o.ltr: left to right inside any subject.
   States the places switch on a letter: hid (to write) · cur (its turn: brighter line) · peek (Help) · got (written) · bad (wrong: shakes, never written).
   The look is ONLY in css/wordslots.css; a place never styles .lt itself. */
const parts0=o=>!!(o&&o.parts&&o.parts.length);
function wsFill(box,text,o){ o=o||{}; text=String(text==null?'':text); box.classList.add('ws'); box.replaceChildren();
  const ar=/[\u0600-\u06FF]/.test(text); box.classList.toggle('ws-ar',ar); if(o.ltr) box.dir='ltr';
  const gs=glyphs(text); box.style.setProperty('--n',gs.length); let k=0;
  const hid=i=>o.hide===true||(Array.isArray(o.hide)&&o.hide.includes(i));
  /* Arabic in iOS Safari: a word cut into one <span> per letter can come out as loose, unjoined letters. So (1) a word that only has to be SHOWN (no letter to write, no groups) is ONE text node
     in ONE span, and (2) when letters must be separate spans (write / groups / ring) each one carries a zero-width joiner on the sides where it joins its neighbour, so it keeps its joined shape. */
  const flat=parts0(o)?o.parts.flatMap(p=>p===' '?[' ']:glyphs(p)):gs;
  const NOJOIN='ءآأإاةدذرزوؤ', joinsNext=(g,n)=>{ if(!g||!n||g===' '||n===' ') return false; const b=arBase(g); return !!b&&!NOJOIN.includes(b[0])&&!!arBase(n); };
  if(ar&&!parts0(o)&&o.hide!==true&&!(Array.isArray(o.hide)&&o.hide.length)&&!o.letters){ const s=el('span','lt',text); s.dataset.i=0; box.append(s); return box; }
  const lt=g=>{ const i=k++; if(g===' ') return el('span','sp',' '); let t=g; if(ar){ const pv=flat[i-1], nx=flat[i+1]; if(joinsNext(pv,g)) t='\u200d'+t; if(joinsNext(g,nx)) t+='\u200d'; } const s=el('span','lt'+(hid(i)?' hid':'')+(o.faint?' fnt':''),t); s.dataset.i=i; return s; };
  const parts=o.parts&&o.parts.length?o.parts:null;   // the parts are shown as given (Arabic syllables may spell a shadda out)
  if(parts) parts.forEach((p,pi)=>{ if(p===' '){ box.append(lt(' ')); return; } const g=el('span','wsg'); g.dataset.p=pi; glyphs(p).forEach(c=>g.append(lt(c))); box.append(g); });
  else gs.forEach(g=>box.append(lt(g)));
  return box; }
const wsWord=(text,o)=>wsFill(el('b',''),text,o);
// the letter whose turn it is gets the brighter line (the first one still to write)
function wsCur(box){ if(!box) return null; $$('.lt.cur',box).forEach(x=>x.classList.remove('cur')); const n=$('.lt.hid',box); if(n) n.classList.add('cur'); return n; }
// a wrong letter: never written, the place shakes
function wsBad(n){ if(!n) return; n.classList.remove('bad'); void n.offsetWidth; n.classList.add('bad'); clearTimeout(n._wb); n._wb=setTimeout(()=>n.classList.remove('bad'),450); }
// Help: the letter shows see-through for a moment
function wsPeek(L,ms){ L=[].concat(L).filter(Boolean); L.forEach(x=>x.classList.add('peek')); setTimeout(()=>L.forEach(x=>x.classList.remove('peek')),ms||tokMs('--help-letter-ms',1500)); }
const wsLang=t=>/[؀-ۿ]/.test(String(t||''))?'ar':'en';
// the hidden typing box: English word -> English (Latin) keyboard, Arabic word -> Arabic, a number -> number pad
function wsInput(inp,text,lang){ lang=lang||wsLang(text); inp.lang=lang; inp.setAttribute('lang',lang); inp.dir=lang==='ar'?'rtl':'ltr';
  inp.setAttribute('inputmode',/^\d+$/.test(String(text||''))?'numeric':'text');
  ['autocorrect','autocapitalize','autocomplete'].forEach(a=>inp.setAttribute(a,'off')); inp.spellcheck=false; return inp; }
// the lowest fixed thing above the typing word: the question title, or the progress stars under it (the stars stay visible while typing)
function qTopEl(){ const h=$('.quiz .qhead'), d=$('.quiz .qdots'); return d&&d.offsetHeight&&!document.body.classList.contains('ws-tight')&&h&&d.getBoundingClientRect().bottom>h.getBoundingClientRect().bottom?d:h; }
function wsParts(){ const a=document.activeElement, id=a&&a.id; if(!WS_IN.includes(id)) return null;
  const st=$('#stage'), stTop=st?st.getBoundingClientRect().top:0;
  if(id==='vin'){ const w=$('.vword'); if(!w) return null; const tools=$('.vtools'); return {word:w,movers:[$('.vwrow'),$('.vinfo'),tools].filter(Boolean),bottom:tools||w,top:stTop+6,help:0}; }
  if(id==='qin'){ const qw=$('.qword'); if(!qw) return null; const hd=qTopEl(); const pic=$('.quiz .qplay'); return {word:$('b',qw)||qw,movers:[qw,pic].filter(Boolean),pic,bottom:qw,top:hd?hd.getBoundingClientRect().bottom+4:stTop,help:1,head:$('.quiz .qhead'),say:$('.qsay',qw)}; }
  const bx=a.closest('.qx'), line=a.closest('.qxline'); if(!bx||!line) return null; const hd=qTopEl();
  return {word:$('.qxw',line)||line,movers:[bx],bottom:line,top:hd?hd.getBoundingClientRect().bottom+4:stTop,help:1,head:$('.quiz .qhead'),say:$('.qxsay',bx)}; }
// how much of the screen the phone keyboard leaves: the visible top and bottom (page px). Inside a frame (preview) the phone does not tell the frame, so a touch screen guesses the keyboard.
function framedTouch(){ try{ return window.top!==window&&matchMedia('(pointer:coarse)').matches; }catch(e){ return matchMedia('(pointer:coarse)').matches; } }
let WS_GUESS=false;   // true while the room is only a guess (framed preview): then the keyboard never reports back, so nothing may react to scroll/resize events (that made the word jump up and down)
function wsRoom(){ WS_GUESS=false; const vv=window.visualViewport, H=document.documentElement.clientHeight||innerHeight; if(!vv) return null;   // the page height without the keyboard (js/core.js kbRoom)
  if(H-vv.height>120) return {top:vv.offsetTop,bottom:vv.offsetTop+vv.height};
  let framed=false; try{ framed=window.top!==window; }catch(e){ framed=true; }
  if(framed&&matchMedia('(pointer:coarse)').matches){ WS_GUESS=true; return {top:0,bottom:Math.round(H*(innerWidth>H?.42:.55))}; }
  return null; }
function wsKeep(){
  const prev=$$('.ws-mv'); prev.forEach(e=>{ e.style.translate=''; });   // measured from the natural place; the transition is off, so no visible jump while the phone keeps reporting scroll/resize
  const P0=wsParts(), R=P0&&wsRoom(), open=!!R, B=document.body;
  if(open&&!WS_GUESS&&typeof kbPin==='function') kbPin();   // the page never stays slid under the keyboard (js/core.js)
  B.classList.toggle('ws-typing',open);
  const rem=parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
  B.classList.toggle('ws-tight',open&&R.bottom-R.top<rem*22);   // little room (phone on its side): the title, lesson name and road step aside while typing
  wsHelp(null);
  prev.forEach(e=>e.classList.remove('ws-mv'));
  if(!open) return;
  let lift=wsLift(wsParts()||P0,R);
  if(lift.short&&!B.classList.contains('ws-tight')){ B.classList.add('ws-tight'); lift.undo(); lift=wsLift(wsParts()||P0,R); }   // still not enough room above the keyboard: the header steps aside too
  if(lift.P.help) wsHelp(lift.P,R);
}
// lift the word (and its lines) so all of it, and the Help bulb under it, stand above the keyboard; short = it still does not fit
function wsLift(P,R){
  const w=P.word.getBoundingClientRect(), pad=Math.max(10,w.height*.15);
  const hh=0;   // the Help bulb stands BESIDE the word (opposite the speaker), so it takes no height
  const top=Math.max(P.top,R.top+6);
  const over=Math.max(P.bottom.getBoundingClientRect().bottom,w.bottom+hh)+pad-R.bottom;
  let sh=over>0?Math.min(Math.max(0,w.top-top),over):0;
  if(over<=0&&w.top<top) sh=w.top-top;   // the phone scrolled the page: bring the word back down into sight
  if(P.pic){ const o2=P.pic.getBoundingClientRect().bottom+pad-R.bottom; if(o2>0) sh=Math.max(sh,Math.min(Math.max(0,w.top-top),o2)); }   // the picture under the word rises with it (as far as the room above allows) so more of it shows above the keyboard
  if(sh) P.movers.forEach(m=>{ m.style.translate='0 '+(-Math.round(sh))+'px'; m.classList.add('ws-mv'); });
  return {P,short:over-sh>1,undo:()=>P.movers.forEach(m=>{ m.style.translate=''; m.classList.remove('ws-mv'); })};
}
const wsHelpEls=()=>$$('#lmeta .qxhelp, #lmeta .qhelpb, .quiz>.qhelpb').filter(h=>!h.hidden&&getComputedStyle(h).display!=='none');
// while typing, the Help bulb stands right beside the word, on the side away from the Listen speaker (fixed: it never moves the layout)
function wsHelp(P,R){
  $$('.ws-side').forEach(h=>{ h.classList.remove('ws-side'); h.style.left=''; h.style.top=''; });
  if(!P) return;
  const r=P.word.getBoundingClientRect(), bot=R?R.bottom:innerHeight, topL=R?R.top:0, sr=P.say&&P.say.getBoundingClientRect();
  const sayRight=!!(sr&&sr.width&&(sr.left+sr.width/2>r.left+r.width/2));   // speaker right of the word -> bulb on its left, and the other way round
  wsHelpEls().forEach(h=>{ h.classList.add('ws-side'); const s=h.offsetWidth||28, g=Math.max(4,r.height*.08);
    if(P.head&&P.head.getBoundingClientRect().height){ const hr=P.head.getBoundingClientRect(); h.style.left=Math.round(Math.max(4,Math.min(innerWidth-s-8,hr.right-s-4)))+'px'; h.style.top=Math.round(Math.max(topL+2,Math.min(bot-s-6,hr.top+hr.height/2-s/2)))+'px'; return; }   // question pages: the bulb stands at the right end of the title row, far from every letter of the answer
    let x=(sr&&sr.width&&!sayRight)?r.right+g:r.left-s-g, y=r.top+r.height/2-s/2;
    if(x<4||x+s>innerWidth-4) x=(x<4)?r.right+g:r.left-s-g;   // no room on that side: the other side
    if(x<4||x+s>innerWidth-4){ x=sayRight?r.left:r.right-s; y=r.top-s-4; }   // the word fills the width: the bulb sits just above its corner, never over a letter
    x=Math.max(4,Math.min(innerWidth-s-4,x)); y=Math.max(topL+2,Math.min(bot-s-6,y));   // never under the keyboard
    h.style.left=Math.round(x)+'px'; h.style.top=Math.round(y)+'px'; });
}
if(window.visualViewport) ['resize','scroll'].forEach(e=>visualViewport.addEventListener(e,()=>{ if(!WS_GUESS) wsKeep(); }));
document.addEventListener('focusin',e=>{ if(e.target&&WS_IN.includes(e.target.id)) (framedTouch()?[60,400]:[50,300,650,1000]).forEach(t=>setTimeout(wsKeep,t)); });
document.addEventListener('focusout',e=>{ if(e.target&&WS_IN.includes(e.target.id)) setTimeout(wsKeep,60); });
addEventListener('resize',()=>{ if(!WS_GUESS) setTimeout(wsKeep,80); }); addEventListener('orientationchange',()=>setTimeout(wsKeep,400));
