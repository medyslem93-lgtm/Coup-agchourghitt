(() => {
  'use strict';
  let busy=false,timer=null;
  const active=()=>localStorage.getItem('agh-active-category')==='الوسط';
  function repair(){
    if(!active()||busy)return;
    const page=document.querySelector('.page.active')?.id;
    let missing=false;
    if(page==='matches')missing=!!document.getElementById('matchesList')&&!document.querySelector('#matchesList .middle-match-card');
    if(page==='teams')missing=!!document.getElementById('teamGrid')&&!document.querySelector('#teamGrid .middle-team-card');
    if(page==='home')missing=!!document.getElementById('nextMatch')&&!document.querySelector('#nextMatch .middle-hero-match');
    if(!missing)return;
    const button=document.querySelector('#middleCategoryBar [data-global-cat="الوسط"]');
    if(!button)return;
    busy=true;
    button.click();
    setTimeout(()=>{busy=false;},900);
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(repair,140);}
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule();});
  setTimeout(repair,1400);
})();
