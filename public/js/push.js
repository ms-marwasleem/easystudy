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

/* after sign-up, in the INSTALLED app only (Ahmed 2026-11-20): one calm popup (parent-account look) asks to turn notifications on.
   Not shown in a browser tab, nor when the permission is already granted / blocked, nor when the parent already answered (es.pushAsked). Both buttons count as an answer; closing with X / outside does not. */
async function puAsk(){
  try{
    if(!puStandalone()||!puCan()||typeof coinPopPro!=='function') return;
    if(wlGet('es.pushAsked',0)||!('Notification' in window)||Notification.permission!=='default') return;
    if(await puCurrent()) return;
    const done=()=>{ wlSet('es.pushAsked',1); coinClose(); };
    coinPopPro(`<div class="pu-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21a2 2 0 0 0 4 0"/></svg></div>
      <h2 class="outline">فعّل الإشعارات</h2><p class="msg-text">لاستقبال الرسائل المهمة والمميزات الجديدة</p>
      <button class="pill" data-en>فعّل الإشعارات</button><button class="pill cream" data-later>لاحقًا</button>`,p=>{
      $('[data-en]',p).addEventListener('click',async()=>{ done(); await puToggle(); });
      $('[data-later]',p).addEventListener('click',done); });
  }catch(e){}
}
