/* REPORT A PROBLEM (2026-11-06, Ahmed). One small flag button, the same in every subject, so a parent / teacher who finds a mistake can tell the admin.
   WHERE: lesson screens = in the row above the tabs, right next to the book-page tag (#lmeta .lm-l, so it always sits beside the page number it belongs to);
   exam papers = the end of the exam header. Lessons supply nothing: the place is read from the app's own state (SUBJECT, LESSON, tab, qz, rd, vs, X).
   WHAT is sent: subject, unit, lesson, tab, book, book page, question number (and its position), the word / reading page, the comment and a quick reason.
   WHERE it goes: POST {api}/report (server/README.md). No server / no internet = kept on this device (es.reports) and sent later; admin.html shows both.
   Looks: css/report.css. Never add a per-screen report button: this file puts it in both places. */
const RP={open:false};
const RPT={
  ar:{title:'بلّغ عن مشكلة',kinds:[['answer','الإجابة غلط'],['picture','الصورة غلط'],['sound','الصوت غلط'],['text','كلمة مكتوبة غلط'],['other','حاجة تانية']],
    ph:'اكتب المشكلة (اختياري)',send:'ابعت',cancel:'إلغاء',thanks:'شكرًا! وصل البلاغ',kept:'اتحفظ وهيتبعت لما النت يرجع',unit:'الوحدة',lesson:'الدرس',page:'صفحة',q:'سؤال',word:'كلمة',
    tab:{read:'الدرس',words:'الكلمات',quiz:'أسئلة الكتاب',booklet:'الكُتيب',workbook:'كتاب التقييمات',grammar:'القواعد',exam:'ورقة تقييم'}},
  en:{title:'Report a problem',kinds:[['answer','Wrong answer'],['picture','Wrong picture'],['sound','Wrong sound'],['text','Spelling mistake'],['other','Something else']],
    ph:'Tell us what is wrong (optional)',send:'Send',cancel:'Cancel',thanks:'Thank you! Report sent',kept:'Saved. It will be sent when the internet is back',unit:'Unit',lesson:'Lesson',page:'Page',q:'Question',word:'Word',
    tab:{read:'Lesson',words:'Vocabulary',quiz:'Book questions',booklet:'Booklet',workbook:'Assessments',grammar:'Grammar',exam:'Exam paper'}}};
const rpT=()=>RPT[isAr()?'ar':'en'];
const RPFLAG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 5h11l-2.5 4L17 13H6"/></svg>';

// the place the child / parent is looking at, read from the app's state
function rpCtx(){
  const c={subject:SUBJECT?SUBJECT.id:'',subjectName:SUBJECT?SUBJECT.name:'',build:typeof APP_BUILD==='string'?APP_BUILD:'',view:innerWidth+'x'+innerHeight};
  if(!$('#exam').hidden){ c.tab='exam'; c.title=X.title||''; const g=X.groups&&X.groups[X.cur]; if(g) c.part=g.label;
    const m=X.lesson; if(m){ c.lesson=m.folder||m.id; c.unit=m.unit; } return c; }
  if(!LESSON) return c;
  const m=SUBJECT&&SUBJECT.lessons.find(l=>l.id===LESSON.id)||{};
  c.lesson=m.folder||LESSON.id; c.unit=m.unit; c.lessonNo=m.lesson; c.lessonTitle=m.title||LESSON.title||''; c.tab=tab;
  if(inQ()&&typeof qz!=='undefined'&&qz.list[qz.i]){ const s=qz.list[qz.i].set; c.book=qz.src; c.page=s.page; c.ex=s.ex; c.part=s.part||s.model||''; c.qi=qz.i+1; c.qn=qz.list.length; c.qtype=s.type; c.task=String(s.task||'').slice(0,120); }
  else if(tab==='words'&&LESSON.vocab&&LESSON.vocab[vs.i]){ c.wordNo=vs.i+1; c.word=LESSON.vocab[vs.i].word; const ps=m.pages&&[].concat(m.pages.words||[]); if(ps&&ps.length) c.page=ps[0]; }
  else if(tab==='read'){ const ps=m.pages&&[].concat(m.pages.read||[]); if(ps&&ps.length){ const pn=LESSON.pageNums||ps; c.page=nPages()>1?pn[Math.min(rd.page-1,pn.length-1)]:ps[0]; } if(nPages()>1) c.readPage=rd.page; }
  return c;
}
// a short human line for the popup, e.g. "الوحدة ١ · الدرس ٣ · أسئلة الكتاب · صفحة ١٤ · سؤال ٢"
function rpLine(c){ const t=rpT(), n=v=>isAr()?num(v):v, out=[];
  if(c.subjectName) out.push(c.subjectName);
  if(c.unit!=null&&c.unit!=='') out.push(t.unit+' '+n(c.unit)); if(c.lessonNo!=null&&c.lessonNo!=='') out.push(t.lesson+' '+n(c.lessonNo));
  if(c.tab) out.push(t.tab[c.tab]||c.tab);
  if(c.title) out.push(c.title);
  if(c.page!=null&&c.page!=='') out.push(t.page+' '+n(c.page));
  if(c.ex!=null&&c.ex!=='') out.push(t.q+' '+n(c.ex)); else if(c.qi) out.push(t.q+' #'+n(c.qi));
  if(c.word) out.push(t.word+' '+c.word);
  if(c.part&&c.tab==='exam') out.push(c.part);
  return out.join(' — '); }

// ---------- sending: server when there is one, else (or when it can't be reached) kept on this device ----------
const rpQueue=()=>wlGet('es.reports',[]);
const rpSave=q=>{ try{ localStorage.setItem('es.reports',JSON.stringify(q.slice(-100))); }catch(e){} };
async function rpPost(r){
  try{ await ESET_P; }catch(e){}
  const base=API(); if(!base) return false;
  const h={'Content-Type':'application/json'}, s=typeof sySession==='function'?sySession():null; if(s&&s.token) h.Authorization='Bearer '+s.token;
  try{ const x=await fetch(base+'/report',{method:'POST',headers:h,body:JSON.stringify({id:r.id,at:r.at,ctx:r.ctx,kind:r.kind,comment:r.comment,device:typeof syDevice==='function'?syDevice():''})});
    return x.ok||x.status===400; }catch(e){ return false; }   // 400 = the server will never accept it: don't keep trying
}
async function rpSend(r){ const q=rpQueue(); q.push(r); rpSave(q); if(await rpPost(r)){ r.sent=1; rpSave(q); return true; } return false; }
async function rpRetry(){ const q=rpQueue(), todo=q.filter(r=>!r.sent); for(const r of todo){ if(!(await rpPost(r))) break; r.sent=1; } if(todo.length) rpSave(q); }

// ---------- the popup ----------
function rpOpen(){
  if(RP.open) return; RP.open=true; hideHint(); if(typeof stopVoice==='function') stopVoice();
  const t=rpT(), c=rpCtx(), o=el('div','overlay rp-ov','<div class="rays"></div>'); o.dir=isAr()?'rtl':'ltr';
  let kind='';
  o.insertAdjacentHTML('beforeend',`<div class="popup rp-pop" role="dialog" aria-label="${t.title}"><h2 class="outline">${t.title}</h2>
    <p class="rp-where">${rpLine(c)}</p>
    <div class="rp-kinds">${t.kinds.map(([k,l])=>`<button type="button" class="pill cream rp-k" data-k="${k}">${l}</button>`).join('')}</div>
    <textarea class="rp-txt" rows="3" maxlength="600" placeholder="${t.ph}"></textarea>
    <div class="btns"><button type="button" class="pill green rp-go">${t.send}</button><button type="button" class="pill cream rp-no">${t.cancel}</button></div></div>`);
  document.body.append(o);
  const close=()=>{ RP.open=false; o.remove(); };
  o.addEventListener('click',e=>{ if(e.target===o) close(); });
  $('.rp-no',o).onclick=close;
  $$('.rp-k',o).forEach(b=>b.onclick=()=>{ kind=kind===b.dataset.k?'':b.dataset.k; $$('.rp-k',o).forEach(x=>x.classList.toggle('on',x.dataset.k===kind)); });
  $('.rp-go',o).onclick=async()=>{ const go=$('.rp-go',o); go.disabled=true;
    const r={id:'r_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),at:Date.now(),ctx:c,kind,comment:$('.rp-txt',o).value.trim()};
    const sent=await rpSend(r); $('.rp-pop',o).innerHTML=`<span class="car rp-car">${CAR('happy')}</span><p class="rp-where">${sent?t.thanks:t.kept}</p>`; setTimeout(close,1600); };   // a thank-you in the same popup, then it closes by itself
  if(typeof anim!=='undefined'&&anim) G.from($('.rp-pop',o),{scale:.9,opacity:0,duration:.2,ease:'power2.out',clearProps:'transform,opacity'});
}

// ---------- the button: lesson row (beside the page tag) and the exam header ----------
function rpButton(){ const b=el('button','rpbtn',RPFLAG); b.type='button'; b.setAttribute('aria-label','Report a problem'); b.addEventListener('click',e=>{ e.stopPropagation(); rpOpen(); }); return b; }
(function(){
  const sg=$('#lesson .sign'); if(sg) sg.append(rpButton());   // end of the subject·term line (2026-11-14), no longer beside the page tag
  const xh=$('#exam > header'); if(xh) xh.append(rpButton());
  rpRetry(); addEventListener('online',rpRetry); document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') rpRetry(); });
})();
