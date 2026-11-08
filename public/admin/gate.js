/* Admin password gate: the page is hidden until the server accepts the password (ADMIN_TOKEN, sent as Bearer).
   No server (local preview: /api/admin/stats gives 404 or fails) = no gate. */
(()=>{
  const KEY='es.adminToken', U='/api/admin/stats';
  const get=()=>{ try{ return localStorage.getItem(KEY)||''; }catch(e){ return ''; } };
  const st=document.createElement('style'); st.textContent='body>*:not(#gate){display:none!important}#gate{position:fixed;inset:0;background:#fff7e6;display:flex;align-items:center;justify-content:center;z-index:99999;font-family:inherit}#gate form{background:#fff;border-radius:16px;padding:24px;box-shadow:0 4px 20px #0002;display:flex;flex-direction:column;gap:12px;width:min(90vw,340px);direction:rtl;text-align:center}#gate input,#gate button{font:inherit;padding:10px;border-radius:10px;border:1px solid #ccc}#gate button{background:#f59e0b;color:#fff;border:0}#gate .e{color:#c00;min-height:1.2em}';
  document.head.appendChild(st);
  const g=document.createElement('div'); g.id='gate'; g.innerHTML='<form><b>لوحة التحكم</b><input type="password" id="gp" placeholder="كلمة السر" autocomplete="current-password"><button>دخول</button><div class="e"></div></form>'; g.style.display='none';
  document.body.appendChild(g);
  const open=()=>{ st.remove(); g.remove(); };
  const ask=msg=>{ g.style.display='flex'; g.querySelector('.e').textContent=msg||''; };
  const check=async t=>{ try{ const r=await fetch(U,{headers:t?{Authorization:'Bearer '+t}:{}}); if(r.status===404) return 'none'; return r.ok?'ok':'bad'; }catch(e){ return 'none'; } };
  g.style.display='none';
  check(get()).then(s=>{ if(s==='ok'||s==='none') return open(); ask(get()?'كلمة السر غير صحيحة':''); });
  g.querySelector('form').addEventListener('submit',async e=>{ e.preventDefault(); const v=g.querySelector('#gp').value.trim(); if(!v) return;
    const s=await check(v); if(s==='ok'||s==='none'){ try{ localStorage.setItem(KEY,v); }catch(x){} location.reload(); } else ask('كلمة السر غير صحيحة'); });
})();
