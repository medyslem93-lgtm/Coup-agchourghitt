(() => {
  'use strict';
  const TOURNAMENT='https://raw.githubusercontent.com/medyslem93-lgtm/Coup-agchourghitt/main/assets/tournament.jpg';
  const PLACEHOLDER='assets/logo-placeholder.svg';
  const isTournament=(img)=>img.id==='brandLogo'||img.id==='heroLogo'||/tournament\.jpg/i.test(img.currentSrc||img.src||'')||/شعار البطولة/.test(img.alt||'');
  document.addEventListener('error',(ev)=>{
    const img=ev.target;
    if(!(img instanceof HTMLImageElement)) return;
    const step=Number(img.dataset.fallbackStep||0);
    img.dataset.fallbackStep=String(step+1);
    img.style.objectFit='contain';
    if(step===0 && isTournament(img)){
      img.src=TOURNAMENT+'?v=20260823';
      return;
    }
    if(step<=1){
      img.src=PLACEHOLDER;
      return;
    }
    img.style.visibility='hidden';
  },true);
})();