(() => {
  'use strict';
  const TOURNAMENT='assets/tournament.jpg';
  const PLACEHOLDER='assets/logo-placeholder.svg';
  const isTournament=img=>img.id==='brandLogo'||img.id==='heroLogo'||/شعار (?:كأس أغشوركيت|البطولة)/.test(img.alt||'');

  document.addEventListener('error',ev=>{
    const img=ev.target;
    if(!(img instanceof HTMLImageElement))return;
    ev.stopPropagation();
    if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
    img.onerror=null;
    img.style.objectFit='contain';
    if(img.dataset.fallbackDone==='1')return;
    img.dataset.fallbackDone='1';
    img.src=isTournament(img)?TOURNAMENT:PLACEHOLDER;
    if(!isTournament(img))img.alt=img.alt?`${img.alt} — الشعار غير متوفر`:'الشعار غير متوفر';
  },true);
})();
