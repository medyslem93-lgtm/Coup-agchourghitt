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
