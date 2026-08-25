(() => {
  'use strict';
  const body=document.body;
  const topbar=document.querySelector('.topbar');
  const sheet=document.getElementById('sheet');

  function decorateImages(root=document){
    const images=root.matches?.('img')?[root]:[...root.querySelectorAll?.('img')||[]];
    images.forEach(img=>{
      if(img.dataset.uiDecorated==='1')return;
      img.dataset.uiDecorated='1';
      if(!img.hasAttribute('decoding')) img.decoding='async';
      if(!img.hasAttribute('loading') && !img.closest('.brand,.hero,.pred-matchup,.match-row.big')) img.loading='lazy';
      img.addEventListener('error',()=>img.classList.add('img-error'));
      img.addEventListener('load',()=>img.classList.remove('img-error'));
    });
  }

  function syncSheet(){
    if(!sheet)return;
    body.style.overflow=sheet.classList.contains('show')?'hidden':'';
  }

  function onScroll(){topbar?.classList.toggle('is-scrolled',(window.scrollY||0)>12)}

  const observer=new MutationObserver(muts=>{
    for(const m of muts){
      for(const n of m.addedNodes){if(n.nodeType===1)decorateImages(n)}
    }
    syncSheet();
  });

  decorateImages();
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  addEventListener('scroll',onScroll,{passive:true});
  onScroll();syncSheet();
})();
