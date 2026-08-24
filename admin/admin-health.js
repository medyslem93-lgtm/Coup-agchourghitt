(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;
  if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const FALLBACK='../assets/logo-placeholder.svg';
  let logos=new Map();

  async function syncTeams(){
    const {data,error}=await sb.from('teams').select('name,logo_url').not('logo_url','is',null);
    if(error)return;
    logos=new Map((data||[]).filter(x=>x.name&&x.logo_url).map(x=>[String(x.name).trim(),x.logo_url]));
    document.querySelectorAll('img').forEach(repair);
  }

  function repair(img){
    if(!(img instanceof HTMLImageElement))return;
    if(/شعار البطولة/i.test(img.alt||''))return;
    const name=String(img.alt||'').trim(),wanted=logos.get(name);
    const src=String(img.getAttribute('src')||'');
    if(wanted&&(!src||/tournament\.jpg|logo-placeholder\.svg/i.test(src))){
      img.onerror=()=>{img.onerror=null;img.src=FALLBACK};
      img.src=wanted;img.style.objectFit='contain';
    }
  }

  document.addEventListener('error',ev=>{
    const img=ev.target;if(!(img instanceof HTMLImageElement)||/شعار البطولة/i.test(img.alt||''))return;
    img.onerror=null;img.src=logos.get(String(img.alt||'').trim())||FALLBACK;img.style.objectFit='contain';
  },true);

  const mo=new MutationObserver(rows=>rows.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1){if(n instanceof HTMLImageElement)repair(n);n.querySelectorAll?.('img').forEach(repair)}})));
  document.addEventListener('DOMContentLoaded',()=>{mo.observe(document.body,{subtree:true,childList:true});syncTeams();document.body.classList.toggle('is-offline',!navigator.onLine)},{once:true});
  addEventListener('online',()=>{document.body.classList.remove('is-offline');syncTeams()});
  addEventListener('offline',()=>document.body.classList.add('is-offline'));
  sb.channel('admin-health-teams').on('postgres_changes',{event:'*',schema:'public',table:'teams'},syncTeams).subscribe();
})();
