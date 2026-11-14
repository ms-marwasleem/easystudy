/* MATH IN ARABIC (math-ar, عام curriculum; Ahmed 2026-11-13: the Arabic book as it is, right to left).
   Digits: the data keeps ASCII digits (0-9, so every template and answer check stays the same); everything the child SEES in a math-ar screen is shown as ٠-٩ here:
   one observer turns the digits of every text node (HTML + SVG) into Arabic-Indic digits, only while a math-ar subject is open. Inputs are never touched.
   A script that compares shown text with a value must turn it back first: arDigitsBack(). The mirroring of lines, number lines and scenes is in the templates (css/math.css .mlrtl, explainer SC.mir). */
(function(){
  const AD='٠١٢٣٤٥٦٧٨٩', on=()=>typeof SUBJECT!=='undefined'&&SUBJECT&&SUBJECT.rtl&&/^math/.test(SUBJECT.id);
  const cv=s=>s.replace(/[0-9]/g,d=>AD[d]);
  window.arDigitsBack=s=>String(s).replace(/[٠-٩]/g,d=>AD.indexOf(d));
  function fixNode(n){
    if(n.nodeType===3){ if(/[0-9]/.test(n.nodeValue)){ const p=n.parentNode; if(p&&/^(INPUT|TEXTAREA|SCRIPT|STYLE)$/i.test(p.nodeName)) return; n.nodeValue=cv(n.nodeValue); } return; }
    if(n.nodeType!==1||/^(SCRIPT|STYLE|INPUT|TEXTAREA)$/i.test(n.nodeName)) return;
    const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT); let t; const L=[]; while((t=w.nextNode())) L.push(t); L.forEach(fixNode);
  }
  function start(){
    new MutationObserver(ms=>{ if(!on()) return; for(const m of ms){ if(m.type==='characterData') fixNode(m.target); else m.addedNodes.forEach(fixNode); } })
      .observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.body) start(); else document.addEventListener('DOMContentLoaded',start);
})();
