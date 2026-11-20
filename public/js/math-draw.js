/* WORDS tab of the maths lessons (Ahmed 2026-11-18): the picture of a word is DRAWN here from its spec (no picture files):
   img "data:draw,num,N,ar|en" = the numeral (Arabic or English digits) in a lesson colour; "data:draw,pos,K,N,ar|en" = N cats in a row with the K-th ringed (Arabic: the front is at the RIGHT, the cats face the other way).
   "data:draw,cmp,size|len,big|long|small|short,ar|en" (2026-11-20, bigger/smaller, longer/shorter words) = an elephant and a mouse / two pencils of different length from the library, the asked one ringed (Arabic: mirrored order).
   Called once when a lesson with such words opens (lesson.js openLesson). */
const M_DIG='٠١٢٣٤٥٦٧٨٩', M_NUMCOL=['#E0412C','#2A7FD8','#F2B321','#2FA8A0','#8A5CC9','#F08A2C','#3FA34D','#D8396B','#E0412C','#8A5CC9'];
function mDrawLoad(src){ return new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src=src; }); }
async function mVocabPics(L){
  const pic=n=>mDrawLoad(new URL((L.base||'')+'../../pics/'+n+'.png',document.baseURI).href), cat=await pic('cat'), ff=getComputedStyle(document.body).fontFamily||'sans-serif';
  for(const v of L.vocab||[]){
    const m=/^data:draw,(num|pos|cmp),(.*)$/.exec(v.img||''); if(!m) continue; const a=m[2].split(','), c=document.createElement('canvas'), x=c.getContext('2d');
    if(m[1]==='cmp'){ const kind=a[0], big=a[1]==='big'||a[1]==='long', ar=a[2]==='ar', W=900, H=300; c.width=W; c.height=H; x.fillStyle='#fff'; x.beginPath(); x.roundRect(0,20,W,H-40,36); x.fill();
      x.strokeStyle='#E8457A'; x.lineWidth=12;
      if(kind==='size'){ const [e,mo]=await Promise.all([pic('elephant'),pic('mouse')]); if(e&&mo){ const eh=200, ew=eh*e.width/e.height, mh=84, mw=mh*mo.width/mo.height, gap=90, x0=(W-ew-mw-gap)/2, ex=ar?W-x0-ew:x0, mx=ar?x0:x0+ew+gap;
          x.drawImage(e,ex,H-40-eh,ew,eh); x.drawImage(mo,mx,H-40-mh,mw,mh); const bx=big?ex:mx, bw=big?ew:mw, bh=big?eh:mh; x.beginPath(); x.ellipse(bx+bw/2,H-40-bh/2,bw/2+18,bh/2+16,0,0,Math.PI*2); x.stroke(); } }
      else { const p0=await pic('len-pen-green'); if(p0){ const L1=760, L2=380, h=L1*p0.height/p0.width, hs=L2*p0.height/p0.width, y1=70, y2=170, x1=ar?W-30-L1:30, x2=ar?W-30-L2:30; x.drawImage(p0,x1,y1,L1,h); x.drawImage(p0,x2,y2,L2,hs);
          const tx=big?x1:x2, tw=big?L1:L2, ty=big?y1:y2, th=big?h:hs; x.beginPath(); x.roundRect(tx-14,ty-14,tw+28,th+28,22); x.stroke(); } } }
    else if(m[1]==='num'){ const n=+a[0], ar=a[1]==='ar', t=ar?String(n).split('').map(d=>M_DIG[+d]).join(''):String(n); c.width=520; c.height=420; x.textAlign='center'; x.textBaseline='middle';
      let fs=n>9?260:330; x.font=`700 ${fs}px ${ff}`; x.lineJoin='round'; x.lineWidth=26; x.strokeStyle='#fff'; x.strokeText(t,260,225); x.fillStyle=M_NUMCOL[(n-1)%10]; x.fillText(t,260,225); }
    else { const k=+a[0], n=+a[1], ar=a[2]==='ar', W=900, H=300; c.width=W; c.height=H; x.fillStyle='#fff'; x.beginPath(); x.roundRect(0,40,W,H-80,36); x.fill();
      const sw=(W-60)/n, ih=H-120; for(let i=0;i<n;i++){ const cx=30+sw*(i+.5); if(cat){ const w=Math.min(sw*.86,ih*cat.width/cat.height), h=w*cat.height/cat.width; x.save(); x.translate(cx,H-52); if(ar) x.scale(-1,1); x.drawImage(cat,-w/2,-h,w,h); x.restore(); } }
      const i=ar?n-k:k-1, cx=30+sw*(i+.5); x.strokeStyle='#E8457A'; x.lineWidth=12; x.beginPath(); x.ellipse(cx,H/2,Math.min(sw*.52,70),ih/2+14,0,0,Math.PI*2); x.stroke(); }
    v.img=c.toDataURL('image/png'); }
}
