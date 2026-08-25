(()=>{
'use strict';
const PLACEHOLDER='assets/logo-placeholder.svg';
let toastTimer=null;
const tournamentIds=new Set(['brandLogo','heroLogo']);
function toast(msg){
  let t=document.getElementById('aghHealthToast');
  if(!t){t=document.createElement('div');t.id='aghHealthToast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
}
function isTournament(img){return tournamentIds.has(img.id)||/شعار كأس أغشوركيت|شعار البطولة/i.test(img.alt||'')}
function fixImage(img){
  if(!(img instanceof HTMLImageElement))return;
  img.decoding='async';if(!img.loading)img.loading='lazy';
  if(isTournament(img))return;
  img.style.objectFit='contain';
}
function scan(root=document){
  const imgs=root instanceof HTMLImageElement?[root]:(root.querySelectorAll?.('img')||[]);imgs.forEach(fixImage);
  const buttons=root.querySelectorAll?.('button:not([type])')||[];buttons.forEach(b=>b.type='button');
}
function setOffline(){
  let bar=document.getElementById('aghOfflineBar');
  if(!navigator.onLine){if(!bar){bar=document.createElement('div');bar.id='aghOfflineBar';bar.textContent='أنت غير متصل بالإنترنت — سيتم تحديث البيانات عند عودة الاتصال';document.body.appendChild(bar)}}
  else if(bar){bar.remove()}
}
function addRetryToErrors(){
  document.querySelectorAll('.empty').forEach(el=>{
    const text=el.textContent||'';
    if(!/تعذر تحميل|حاول مرة أخرى|تحقق من الاتصال/.test(text)||el.querySelector('.agh-retry'))return;
    const b=document.createElement('button');b.className='agh-retry';b.type='button';b.textContent='إعادة المحاولة';b.onclick=()=>location.reload();el.appendChild(b);
  });
}
function swRefresh(){
  if(!('serviceWorker'in navigator))return;
  navigator.serviceWorker.getRegistration().then(r=>r?.update?.()).catch(()=>{});
}
document.addEventListener('error',ev=>{
  const target=ev.target;
  if(!(target instanceof HTMLImageElement)||isTournament(target))return;
  target.style.objectFit='contain';
  setTimeout(()=>{
    if(!target.isConnected||isTournament(target))return;
    const src=String(target.getAttribute('src')||'');
    if(!src.includes('logo-placeholder.svg')&&/tournament\.jpg(?:$|[?#])/i.test(src)){
      target.onerror=null;target.src=PLACEHOLDER;
    }
  },0);
},true);
window.addEventListener('unhandledrejection',ev=>{console.error('Unhandled promise rejection',ev.reason);toast('تعذر تنفيذ العملية. تحقق من الاتصال وحاول مرة أخرى.')});
window.addEventListener('error',ev=>{if(ev.target!==window)return;console.error('Runtime error',ev.error||ev.message);toast('حدث خلل مؤقت في الواجهة. أعد المحاولة.')});
const mo=new MutationObserver(rows=>{for(const r of rows){for(const n of r.addedNodes){if(n.nodeType===1){scan(n);addRetryToErrors()}}}});
document.addEventListener('DOMContentLoaded',()=>{
  scan();setOffline();addRetryToErrors();mo.observe(document.body,{childList:true,subtree:true});swRefresh();
  document.body.dataset.healthReady='true';
},{once:true});
addEventListener('online',()=>{setOffline();toast('عاد الاتصال بالإنترنت');setTimeout(()=>location.reload(),450)});
addEventListener('offline',setOffline);
addEventListener('pageshow',()=>{scan();addRetryToErrors();swRefresh()});
})();
