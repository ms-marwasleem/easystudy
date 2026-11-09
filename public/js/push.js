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
async function puInit(){
  if(!puCan()||$('#pushBtn')) return;
  const b=document.createElement('button'); b.id='pushBtn'; b.className='pushbtn rb'; b.type='button';
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21a2 2 0 0 0 4 0"/></svg>';
  b.addEventListener('click',puToggle); $('#subjects').appendChild(b);
  PUSH.sub=await puCurrent(); puPaint();
}
// the settings (api address) arrive a moment after the page opens
if(typeof ESET_P!=='undefined') ESET_P.then(()=>puInit()).catch(()=>{}); else puInit();
