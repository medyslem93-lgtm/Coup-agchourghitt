(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;
  if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const FALLBACK='assets/logo-placeholder.svg';
  let logos=new Map();
  let syncTimer=null;

  const normalize=u=>{
    if(!u)return'';
    try{return new URL(u,location.href).href}catch{return String(u)}
  };

  function isTournamentImage(img){
    return img.id==='brandLogo'||img.id==='heroLogo'||/شعار كأس أغشوركيت|شعار البطولة/i.test(img.alt||'');
  }

  function logoFor(img){
    const name=String(img.alt||'').trim();
    return name&&logos.get(name)||'';
  }

  function repair(img,force=false){
    if(!(img instanceof HTMLImageElement)||isTournamentImage(img))return;
    const wanted=logoFor(img);
    if(!wanted)return;
    const current=normalize(img.getAttribute('src')||img.currentSrc||'');
    const broken=/tournament\.jpg|logo-placeholder\.svg/i.test(current);
    if(force||broken){
      img.onerror=()=>{img.onerror=null;img.src=FALLBACK};
      if(current!==normalize(wanted))img.src=wanted;
      img.style.objectFit='contain';
    }
  }

  function scan(root=document,force=false){
    const nodes=root instanceof HTMLImageElement?[root]:(root.querySelectorAll?.('img')||[]);
    nodes.forEach(img=>repair(img,force));
  }

  async function syncTeams(){
    clearTimeout(syncTimer);
    const {data,error}=await sb.from('teams').select('name,logo_url').not('logo_url','is',null);
    if(error){console.warn('Team logo sync failed',error.message);return}
    logos=new Map((data||[]).filter(x=>x.name&&x.logo_url).map(x=>[String(x.name).trim(),x.logo_url]));
    scan(document,true);
  }

  document.addEventListener('error',ev=>{
    const img=ev.target;
    if(!(img instanceof HTMLImageElement)||isTournamentImage(img))return;
    const wanted=logoFor(img);
    img.onerror=null;
    img.src=wanted||FALLBACK;
    img.style.objectFit='contain';
  },true);

  const observer=new MutationObserver(records=>{
    for(const r of records){
      if(r.type==='attributes'&&r.target instanceof HTMLImageElement)repair(r.target);
      for(const n of r.addedNodes)if(n.nodeType===1)scan(n);
    }
  });

  function onlineState(){
    document.body.classList.toggle('is-offline',!navigator.onLine);
    if(navigator.onLine)syncTeams();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
    syncTeams();
    onlineState();
  },{once:true});
  addEventListener('online',onlineState);
  addEventListener('offline',onlineState);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncTeams()});
  sb.channel('runtime-health-teams').on('postgres_changes',{event:'*',schema:'public',table:'teams'},()=>{
    clearTimeout(syncTimer);syncTimer=setTimeout(syncTeams,180);
  }).subscribe();
})();
