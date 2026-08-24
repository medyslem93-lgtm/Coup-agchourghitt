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
  const logoSelectors=['.team img','.teamcard img','.ref-team img','.middle-side img','.middle-team-visual img','.profile-logo','.table-team img','.favorite-card img','.pred-team img','.score-pick img'];
  const isTeamLogo=(img)=>logoSelectors.some(s=>img.matches?.(s));
  function upgradeChrome(){
    document.body.classList.add('world-sport');
    const search=document.getElementById('searchBtn');
    if(search) search.innerHTML=icons.search;
    document.querySelectorAll('.nav [data-page]').forEach(btn=>{
      const span=btn.querySelector('span'); if(!span)return;
      span.innerHTML=icons[btn.dataset.page]||icons.more;
    });
    document.querySelectorAll('[data-pred-pane]').forEach(b=>{if(b.textContent.trim()!=='التوقعات')b.textContent='التوقعات'});
  }
  function installImageGuard(){
    document.addEventListener('error',e=>{
      const img=e.target;
      if(!(img instanceof HTMLImageElement)) return;
      if(img.dataset.worldFallback==='1') return;
      if(isTeamLogo(img)){
        e.stopImmediatePropagation();
        img.dataset.worldFallback='1';
        img.onerror=null;
        img.src='assets/logo-placeholder.svg';
        return;
      }
      if(img.id==='brandLogo'||img.id==='heroLogo'){
        e.stopImmediatePropagation();
        img.dataset.worldFallback='1';
        img.onerror=null;
        img.src='assets/tournament.jpg';
      }
    },true);
  }
  function observeChrome(){
    new MutationObserver(()=>upgradeChrome()).observe(document.body,{subtree:true,childList:true,characterData:true});
  }
  function softenLegacyModes(){
    document.documentElement.style.setProperty('--safe-nav-space','calc(104px + env(safe-area-inset-bottom))');
  }
  addEventListener('DOMContentLoaded',()=>{upgradeChrome();installImageGuard();observeChrome();softenLegacyModes();});
})();
