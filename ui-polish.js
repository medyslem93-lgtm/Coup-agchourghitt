(() => {
  'use strict';
  const body=document.body;
  const topbar=document.querySelector('.topbar');
  const sheet=document.getElementById('sheet');

  function decorateImages(root=document){
    root.querySelectorAll('img').forEach((img,i)=>{
      if(!img.hasAttribute('decoding')) img.decoding='async';
      if(!img.hasAttribute('loading') && !img.closest('.brand,.hero,.pred-matchup,.match-row.big')) img.loading='lazy';
      img.addEventListener('error',()=>img.classList.add('img-error'),{once:true});
      img.addEventListener('load',()=>img.classList.remove('img-error'));
    });
  }

  function syncSheet(){
    if(!sheet)return;
    const open=sheet.classList.contains('show');
    body.style.overflow=open?'hidden':'';
  }

  let lastY=0;
  function onScroll(){
    const y=window.scrollY||0;
    topbar?.classList.toggle('is-scrolled',y>12);
    lastY=y;
  }

  const observer=new MutationObserver(muts=>{
    muts.forEach(m=>m.addedNodes.forEach(n=>{
      if(n.nodeType!==1)return;
      if(n.matches?.('img'))decorateImages(n.parentElement||document);
      else decorateImages(n);
    }));
    syncSheet();
  });

  decorateImages();
  if(sheet)observer.observe(sheet,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  observer.observe(document.body,{childList:true,subtree:true});
  addEventListener('scroll',onScroll,{passive:true});
  onScroll();
})();
