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
function wsFill(box,text,o){ o=o||{}; text=String(text==null?'':text); box.classList.add('ws'); box.replaceChildren();
  const ar=/[\u0600-\u06FF]/.test(text); box.classList.toggle('ws-ar',ar); if(o.ltr) box.dir='ltr';
  const gs=glyphs(text); box.style.setProperty('--n',gs.length); let k=0;
  const hid=i=>o.hide===true||(Array.isArray(o.hide)&&o.hide.includes(i));
  const lt=g=>{ const i=k++; if(g===' ') return el('span','sp',' '); const s=el('span','lt'+(hid(i)?' hid':'')+(o.faint?' fnt':''),g); s.dataset.i=i; return s; };
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
function wsParts(){ const a=document.activeElement, id=a&&a.id; if(!WS_IN.includes(id)) return null;
  const st=$('#stage'), stTop=st?st.getBoundingClientRect().top:0;
  if(id==='vin'){ const w=$('.vword'); if(!w) return null; const tools=$('.vtools'); return {word:w,movers:[$('.vwrow'),$('.vinfo'),tools].filter(Boolean),bottom:tools||w,top:stTop+6,help:0}; }
  if(id==='qin'){ const qw=$('.qword'); if(!qw) return null; const hd=$('.quiz .qhead'); return {word:$('b',qw)||qw,movers:[qw],bottom:qw,top:hd?hd.getBoundingClientRect().bottom+4:stTop,help:1,say:$('.qsay',qw)}; }
  const bx=a.closest('.qx'), line=a.closest('.qxline'); if(!bx||!line) return null; const hd=$('.quiz .qhead');
  return {word:$('.qxw',line)||line,movers:[bx],bottom:line,top:hd?hd.getBoundingClientRect().bottom+4:stTop,help:1,say:$('.qxsay',bx)}; }
// how much of the screen the phone keyboard leaves: the visible top and bottom (page px). Inside a frame (preview) the phone does not tell the frame, so a touch screen guesses the keyboard.
function wsRoom(){ const vv=window.visualViewport, H=innerHeight; if(!vv) return null;
  if(H-vv.height>120) return {top:vv.offsetTop,bottom:vv.offsetTop+vv.height};
  let framed=false; try{ framed=window.top!==window; }catch(e){ framed=true; }
  if(framed&&matchMedia('(pointer:coarse)').matches) return {top:0,bottom:H*(innerWidth>H?.42:.55)};
  return null; }
function wsKeep(){
  $$('.ws-mv').forEach(e=>{ e.style.translate=''; e.classList.remove('ws-mv'); });
  const P0=wsParts(), R=P0&&wsRoom(), open=!!R, B=document.body;
  B.classList.toggle('ws-typing',open);
  B.classList.toggle('ws-tight',open&&R.bottom-R.top<parseFloat(getComputedStyle(document.documentElement).fontSize)*22);   // little room (phone on its side): the title, lesson name and road step aside while typing
  wsHelp(null);
  if(!open) return;
  const P=wsParts()||P0, w=P.word.getBoundingClientRect(), pad=Math.max(10,w.height*.15);
  const hs=P.help?wsHelpEls():[], hh=hs.length?(hs[0].offsetWidth||40)+Math.max(6,w.height*.12):0;   // the Help bulb stands under the word
  const top=Math.max(P.top,R.top+6);
  const over=Math.max(P.bottom.getBoundingClientRect().bottom,w.bottom+hh)+pad-R.bottom;
  let sh=over>0?Math.min(Math.max(0,w.top-top),over):0;
  if(over<=0&&w.top<top) sh=w.top-top;   // the phone scrolled the page: bring the word back down into sight
  if(sh) P.movers.forEach(m=>{ m.style.translate='0 '+(-Math.round(sh))+'px'; m.classList.add('ws-mv'); });
  if(P.help) wsHelp(P);
}
const wsHelpEls=()=>$$('#lmeta .qxhelp, #lmeta .qhelpb, .quiz>.qhelpb').filter(h=>!h.hidden&&getComputedStyle(h).display!=='none');
// while typing, the Help bulb stands right under the word, in the middle (the keyboard covers its corner)
function wsHelp(P){
  $$('.ws-side').forEach(h=>{ h.classList.remove('ws-side'); h.style.left=''; h.style.top=''; });
  if(!P) return;
  const r=P.word.getBoundingClientRect();
  wsHelpEls().forEach(h=>{ h.classList.add('ws-side'); const s=h.offsetWidth||40, g=Math.max(6,r.height*.12);
    const x=Math.max(6,Math.min(innerWidth-s-6,r.left+r.width/2-s/2));
    h.style.left=Math.round(x)+'px'; h.style.top=Math.round(r.bottom+g)+'px'; });
}
if(window.visualViewport) ['resize','scroll'].forEach(e=>visualViewport.addEventListener(e,()=>wsKeep()));
document.addEventListener('focusin',e=>{ if(e.target&&WS_IN.includes(e.target.id)) [50,300,650,1000].forEach(t=>setTimeout(wsKeep,t)); });
document.addEventListener('focusout',e=>{ if(e.target&&WS_IN.includes(e.target.id)) setTimeout(wsKeep,60); });
addEventListener('resize',()=>setTimeout(wsKeep,80)); addEventListener('orientationchange',()=>setTimeout(wsKeep,400));
