(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;
  if(!cfg||!window.supabase)return;
  const sb=window.AGCH_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const FALLBACK='../assets/logo-placeholder.svg';
  let logos=new Map();
  let healthChannel=null;
  let reconnectTimer=null;
  let reconnectAttempt=0;

  const abs=u=>{try{return new URL(u,location.href).href}catch{return String(u||'')}};

  async function syncTeams(){
    const {data,error}=await sb.from('teams').select('name,logo_url').not('logo_url','is',null);
    if(error)return;
    logos=new Map((data||[]).filter(x=>x.name&&x.logo_url).map(x=>[String(x.name).trim(),x.logo_url]));
    document.querySelectorAll('img').forEach(img=>{delete img.dataset.failedLogo;repair(img,true)});
  }

  function repair(img,force=false){
    if(!(img instanceof HTMLImageElement)||/شعار البطولة/i.test(img.alt||''))return;
    const name=String(img.alt||'').trim(),wanted=logos.get(name);if(!wanted)return;
    const src=abs(img.getAttribute('src')||''),wantedAbs=abs(wanted),failed=img.dataset.failedLogo||'';
    const broken=!src||/tournament\.jpg|logo-placeholder\.svg/i.test(src);
    if((force||broken)&&failed!==wantedAbs&&src!==wantedAbs){img.src=wanted;img.style.objectFit='contain'}
  }

  document.addEventListener('error',ev=>{
    const img=ev.target;if(!(img instanceof HTMLImageElement)||/شعار البطولة/i.test(img.alt||''))return;
    const wanted=logos.get(String(img.alt||'').trim()),src=abs(img.getAttribute('src')||'');
    if(wanted&&src===abs(wanted))img.dataset.failedLogo=abs(wanted);
    img.onerror=null;if(!/logo-placeholder\.svg/i.test(src))img.src=FALLBACK;img.style.objectFit='contain';
  },true);

  const reconnectRealtime=()=>{
    if(reconnectTimer||!navigator.onLine)return;
    const delay=Math.min(12000,1000*Math.pow(2,Math.min(reconnectAttempt,3)));
    reconnectAttempt+=1;
    reconnectTimer=setTimeout(()=>{
      reconnectTimer=null;
      try{sb.realtime?.connect?.()}catch{}
      syncTeams();
    },delay);
  };

  const handleRealtimeStatus=status=>{
    if(status==='SUBSCRIBED'){
      reconnectAttempt=0;
      if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null;}
      document.body.classList.remove('realtime-offline');
      return;
    }
    if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
      document.body.classList.add('realtime-offline');
      reconnectRealtime();
    }
  };

  function subscribeHealth(){
    if(healthChannel)return;
    healthChannel=sb.channel('admin-health-teams')
      .on('postgres_changes',{event:'*',schema:'public',table:'teams'},syncTeams)
      .subscribe(handleRealtimeStatus);
  }

  const mo=new MutationObserver(rows=>rows.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1){if(n instanceof HTMLImageElement)repair(n);n.querySelectorAll?.('img').forEach(img=>repair(img))}})));
  document.addEventListener('DOMContentLoaded',()=>{mo.observe(document.body,{subtree:true,childList:true});syncTeams();subscribeHealth();document.body.classList.toggle('is-offline',!navigator.onLine)},{once:true});
  addEventListener('online',()=>{document.body.classList.remove('is-offline');try{sb.realtime?.connect?.()}catch{}syncTeams();subscribeHealth()});
  addEventListener('offline',()=>document.body.classList.add('is-offline'));
  addEventListener('admin:connection',event=>handleRealtimeStatus(event?.detail));

  // Isolated Team of the Week admin enhancer. Loaded here to avoid altering the legacy admin shell again.
  if(!document.querySelector('script[data-tow-eligibility-loader]')){
    const s=document.createElement('script');
    s.src='team-of-week-eligibility-v6.js?v=20260906-1';
    s.async=true;
    s.dataset.towEligibilityLoader='1';
    document.head.appendChild(s);
  }
})();
