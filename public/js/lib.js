/* LIBRARY — plays the sounds Ahmed records/uploads in the audio library (Cloudflare Worker "easystudy-recorder") straight away.
   The library keeps, per recording, the file it replaces in the app (path, under data/), optional "alt" extra paths and "parts"
   (one recording of several syllables, cut here at the pauses). The app asks for a tiny list of what exists (the manifest), then
   fetches only the sound being played; each sound has its own versioned address, so the browser keeps it. If the library cannot be
   reached, or a sound is not in it, the file shipped inside the app is used. Works for any language: it only matches paths. */
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
      const raw=await libBytes(`${LIB.url}/pub/a/${e.id}?v=${e.ts}`).then(b=>new Promise((ok,no)=>ctx.decodeAudioData(b,ok,no)));
      const d=libPCM(raw), sr=raw.sampleRate;
      if(e.part==null) return libMake(ctx,d,sr,0,d.length);
      const gk=e.id+'@'+e.ts+'#'+e.n; if(!LIB.groups[gk]) LIB.groups[gk]=libCut(d,sr,e.n);
      const segs=LIB.groups[gk]; return segs?libMake(ctx,d,sr,segs[e.part][0],segs[e.part][1]):null;
    }catch(err){ return null; }
  })();
  const b=await LIB.bufs[key]; if(!b) delete LIB.bufs[key]; return b;
}

/* APP UPDATES — index.html carries APP_V (set when the app is published, see sync.sh); version.json says the newest. When the child moves
   to another screen the app quietly checks (a small file), and reloads itself on the home screen, where nothing can be lost
   (never during a question or while sound plays). On a local copy without APP_V nothing happens. */
const APPV={at:0,newer:false};
async function appNav(screen){
  libNav(); try{ navigator.serviceWorker&&navigator.serviceWorker.controller&&navigator.serviceWorker.controller.postMessage('nav'); }catch(e){}
  if(!window.APP_V||!/^https?:/.test(location.protocol)) return;
  if(!APPV.newer&&Date.now()-APPV.at>LIB_EVERY){ APPV.at=Date.now();
    try{ const v=await (await fetch('version.json',{cache:'no-cache'})).json(); if(v&&v.v&&v.v!==window.APP_V) APPV.newer=true; }catch(e){} }
  if(APPV.newer&&screen==='subjects'&&!document.getElementById('subjects').hidden&&!(typeof player!=='undefined'&&player.run)) location.reload();
}
