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
