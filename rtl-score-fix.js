(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function go(page){$$('.page').forEach(x=>x.classList.toggle('active',x.id===page));$$('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===page));window.scrollTo(0,0);}
function fixCard(card){
 const a=card.querySelector('.ref-team[data-side="a"] .ref-team-score');
 const b=card.querySelector('.ref-team[data-side="b"] .ref-team-score');
 const clock=card.querySelector('.ref-clock');
 if(a&&b&&clock) clock.textContent=`${b.textContent.trim()} - ${a.textContent.trim()}`;
}
function fixScores(root=document){root.querySelectorAll?.('.ref-match-card').forEach(fixCard);}
function bind(){
 document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-page]');
  if(nav){e.preventDefault();e.stopPropagation();go(nav.dataset.page);return;}
  const quick=e.target.closest('[data-quickcat]');
  if(quick){e.preventDefault();go('matches');const cat=quick.dataset.quickcat;const btn=$(`[data-matchcat="${CSS.escape(cat)}"]`);if(btn)setTimeout(()=>btn.click(),0);return;}
 },true);
 window.go=go;
 const observer=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)fixScores(n.matches?.('.ref-match-card')?n.parentElement:n);});
 observer.observe(document.body,{childList:true,subtree:true});
 fixScores();
}
function init(){bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();