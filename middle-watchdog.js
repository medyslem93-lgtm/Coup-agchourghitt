(() => {
  'use strict';
  let busy=false;
  const active=()=>localStorage.getItem('agh-active-category')==='الوسط';
  function repair(){
    if(!active()||busy)return;const page=document.querySelector('.page.active')?.id;let missing=false;
    if(page==='matches')missing=!!document.getElementById('matchesList')&&!document.querySelector('#matchesList .middle-match-card');
    if(page==='teams')missing=!!document.getElementById('teamGrid')&&!document.querySelector('#teamGrid .middle-team-card');
    if(page==='home')missing=!!document.getElementById('nextMatch')&&!document.querySelector('#nextMatch .middle-hero-match');
    if(!missing)return;const b=document.querySelector('#middleCategoryBar [data-global-cat="الوسط"]');if(!b)return;busy=true;b.click();setTimeout(()=>busy=false,700)
  }
  const mo=new MutationObserver(()=>setTimeout(repair,60));mo.observe(document.body,{subtree:true,childList:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')repair()});setTimeout(repair,1300);
})();

(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;
  if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const cache=new Map();
  const pending=new Map();
  const FALLBACK='assets/logo-placeholder.svg';

  function normalizeLogo(url){
    if(!url)return '';
    try{
      const u=new URL(url,location.href);
      if(u.origin===location.origin||u.pathname.includes('/assets/logos/')) return u.pathname.replace(/^\//,'')+(u.search||'');
      return u.href;
    }catch{return String(url).replace(/^\.\.\//,'').replace(/^\.\//,'')}
  }

  function isTeamImage(img){
    const alt=String(img.alt||'').trim();
    if(!alt||/شعار البطولة|كأس أغشوركيت/i.test(alt))return false;
    return !!img.closest('#sheetPanel .team,#sheetPanel .lineup-selector,#sheetPanel .lineup-head,.match-card,.middle-match-card,.ref-match-card');
  }

  function needsRepair(img){
    const src=String(img.getAttribute('src')||img.currentSrc||'');
    return !src||/tournament\.jpg|logo-placeholder\.svg/i.test(src);
  }

  async function getLogo(name){
    if(cache.has(name))return cache.get(name);
    if(pending.has(name))return pending.get(name);
    const task=(async()=>{
      const {data,error}=await sb.from('teams').select('logo_url').eq('name',name).not('logo_url','is',null).limit(1);
      const logo=!error&&data?.[0]?.logo_url?normalizeLogo(data[0].logo_url):'';
      cache.set(name,logo);
      pending.delete(name);
      return logo;
    })();
    pending.set(name,task);
    return task;
  }

  async function repairImage(img){
    if(!(img instanceof HTMLImageElement)||!isTeamImage(img)||!needsRepair(img)||img.dataset.logoRepair==='loading')return;
    const name=String(img.alt||'').trim();
    img.dataset.logoRepair='loading';
    const logo=await getLogo(name);
    if(!document.contains(img))return;
    if(logo){
      img.onerror=()=>{img.onerror=null;img.src=FALLBACK;img.dataset.logoRepair='failed'};
      img.src=logo;
      img.dataset.logoRepair='done';
    }else{
      img.onerror=null;
      img.src=FALLBACK;
      img.dataset.logoRepair='missing';
    }
  }

  function scan(root=document){
    const imgs=root instanceof HTMLImageElement?[root]:root.querySelectorAll?.('img')||[];
    imgs.forEach(img=>repairImage(img));
  }

  const observer=new MutationObserver(records=>{
    for(const r of records){
      if(r.type==='attributes'&&r.target instanceof HTMLImageElement)repairImage(r.target);
      r.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)});
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
  scan();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scan()});
})();
