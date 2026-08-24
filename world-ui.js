(() => {
  'use strict';

  const icons={
    search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.2 12 4l8.5 7.2v8.3a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/></svg>',
    matches:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    tournament:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0zM10 12v4m4-4v4M8 20h8M6 6H4v2a4 4 0 0 0 4 4M18 6h2v2a4 4 0 0 1-4 4"/></svg>',
    teams:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M14 15.5a4.5 4.5 0 0 1 6.5 4.5"/></svg>',
    more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>'
  };

  const teamLogoSelectors=[
    '.team img','.teamcard img','.ref-team img','.middle-side img','.middle-team-visual img',
    '.middle-hero-team img','.profile-logo','.table-team img','.favorite-card img','.pred-team img',
    '.score-pick img','.search-result img[data-team-logo]'
  ];
  const tournamentAlts=['شعار كأس أغشوركيت','شعار البطولة'];
  let navObserver=null,domObserver=null,lastToast=0;

  const isTeamLogo=img=>teamLogoSelectors.some(s=>img.matches?.(s));
  const isTournamentImage=img=>tournamentAlts.some(x=>(img.alt||'').includes(x))||img.id==='brandLogo'||img.id==='heroLogo';
  const pointsToTournament=img=>/assets\/tournament\.jpg(?:$|\?)/.test(img.getAttribute('src')||'')||/assets\/tournament\.jpg(?:$|\?)/.test(img.currentSrc||'');

  function setIcon(el,html){
    if(!el||el.innerHTML===html)return;
    el.innerHTML=html;
  }

  function upgradeChrome(){
    document.body.classList.add('world-sport');
    const search=document.getElementById('searchBtn');
    if(search){setIcon(search,icons.search);search.setAttribute('aria-label','البحث');search.type='button';}
    document.querySelectorAll('.nav [data-page]').forEach(btn=>{
      const span=btn.querySelector('span');
      if(span)setIcon(span,icons[btn.dataset.page]||icons.more);
      btn.type='button';
      btn.setAttribute('aria-label',btn.querySelector('b')?.textContent?.trim()||btn.dataset.page||'تنقل');
      if(btn.classList.contains('active'))btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
    });
  }

  function replaceBrokenTeamLogo(img){
    if(!img||img.dataset.safeLogo==='placeholder')return;
    img.dataset.safeLogo='placeholder';
    img.onerror=null;
    img.src='assets/logo-placeholder.svg';
    img.alt=img.alt?`${img.alt} — الشعار غير متوفر`:'الشعار غير متوفر';
    img.style.objectFit='contain';
  }

  function prepareImage(img){
    if(!(img instanceof HTMLImageElement))return;
    img.decoding='async';
    if(!img.loading)img.loading='lazy';
    if(isTeamLogo(img)){
      img.style.objectFit='contain';
      if(pointsToTournament(img)&&!isTournamentImage(img))replaceBrokenTeamLogo(img);
    }
  }

  function scanImages(root=document){
    if(root instanceof HTMLImageElement)prepareImage(root);
    root.querySelectorAll?.('img').forEach(prepareImage);
  }

  function installImageGuard(){
    document.addEventListener('error',e=>{
      const img=e.target;
      if(!(img instanceof HTMLImageElement))return;
      if(isTeamLogo(img)&&!isTournamentImage(img))replaceBrokenTeamLogo(img);
      else if(isTournamentImage(img)&&!pointsToTournament(img)){
        img.onerror=null;img.src='assets/tournament.jpg';
      }
    },true);
    scanImages();
    domObserver=new MutationObserver(records=>{
      records.forEach(r=>r.addedNodes.forEach(n=>{
        if(n.nodeType===1)scanImages(n);
      }));
    });
    domObserver.observe(document.body,{subtree:true,childList:true});
  }

  function manualGo(page){
    const target=document.getElementById(page);
    if(!target)return false;
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p===target));
    document.querySelectorAll('.nav [data-page]').forEach(b=>{
      const on=b.dataset.page===page;b.classList.toggle('active',on);
      if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
    try{history.replaceState(null,'',`#${page}`)}catch{}
    window.scrollTo({top:0,behavior:'smooth'});
    return true;
  }

  function installNavigationGuard(){
    const original=typeof window.go==='function'?window.go.bind(window):null;
    window.go=function(page){
      if(original){
        try{const result=original(page);setTimeout(()=>{manualGo(page);upgradeChrome();},0);return result}catch(e){console.warn('Primary navigation fallback used',e)}
      }
      return manualGo(page);
    };
    document.addEventListener('click',e=>{
      const nav=e.target.closest('.nav [data-page]');
      if(nav){
        const page=nav.dataset.page;
        setTimeout(()=>{manualGo(page);upgradeChrome();},0);
      }
    });
    addEventListener('hashchange',()=>{
      const page=location.hash.replace('#','');
      if(page&&document.getElementById(page))manualGo(page);
    });
  }

  function enhanceButtons(){
    document.querySelectorAll('button:not([type])').forEach(b=>b.type='button');
    document.querySelectorAll('[data-open-match],[data-open-team],[data-news]').forEach(el=>{
      if(!el.getAttribute('role')&&el.tagName!=='BUTTON')el.setAttribute('role','button');
    });
  }

  function ensureContentClearance(){
    document.documentElement.style.setProperty('--safe-nav-space','calc(120px + env(safe-area-inset-bottom))');
    const nav=document.querySelector('.nav');
    if(nav){
      const h=Math.ceil(nav.getBoundingClientRect().height||78);
      document.documentElement.style.setProperty('--ui-nav',`${Math.max(70,Math.min(h,92))}px`);
    }
  }

  function toast(text){
    const now=Date.now();if(now-lastToast<2500)return;lastToast=now;
    let el=document.getElementById('uiStatusToast');
    if(!el){el=document.createElement('div');el.id='uiStatusToast';Object.assign(el.style,{position:'fixed',zIndex:'9999',left:'50%',bottom:'calc(104px + env(safe-area-inset-bottom))',transform:'translateX(-50%)',background:'#151b17',color:'#fff',border:'1px solid rgba(255,255,255,.12)',borderRadius:'14px',padding:'10px 14px',font:'700 11px Cairo',boxShadow:'0 12px 34px rgba(0,0,0,.3)',maxWidth:'calc(100vw - 32px)',textAlign:'center'});document.body.appendChild(el)}
    el.textContent=text;el.hidden=false;clearTimeout(el._timer);el._timer=setTimeout(()=>el.hidden=true,2600);
  }

  function installNetworkState(){
    addEventListener('offline',()=>toast('لا يوجد اتصال بالإنترنت. سيتم عرض آخر بيانات محفوظة إن توفرت.'));
    addEventListener('online',()=>toast('عاد الاتصال بالإنترنت.'));
  }

  async function refreshServiceWorker(){
    if(!('serviceWorker'in navigator))return;
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg)await reg.update();
    }catch{}
  }

  function watchChrome(){
    const nav=document.querySelector('.nav');if(!nav)return;
    navObserver=new MutationObserver(()=>{
      navObserver.disconnect();
      try{upgradeChrome();enhanceButtons();ensureContentClearance();}
      finally{navObserver.observe(nav,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});}
    });
    navObserver.observe(nav,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  }

  function init(){
    upgradeChrome();
    enhanceButtons();
    installImageGuard();
    installNavigationGuard();
    installNetworkState();
    ensureContentClearance();
    watchChrome();
    scanImages();
    const page=location.hash.replace('#','');
    if(page&&document.getElementById(page))setTimeout(()=>manualGo(page),20);
    setTimeout(refreshServiceWorker,900);
    addEventListener('resize',ensureContentClearance,{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
