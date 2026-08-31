(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function go(page){$$('.page').forEach(x=>x.classList.toggle('active',x.id===page));$$('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===page));window.scrollTo(0,0);}
function bind(){
 document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-page]');
  if(nav){e.preventDefault();e.stopPropagation();go(nav.dataset.page);return;}
  const quick=e.target.closest('[data-quickcat]');
  if(quick){e.preventDefault();go('matches');const cat=quick.dataset.quickcat;const btn=$(`[data-matchcat="${CSS.escape(cat)}"]`);if(btn)setTimeout(()=>btn.click(),0);return;}
 },true);
 window.go=go;
}
function fixScores(root=document){
 root.querySelectorAll('.ref-match-card').forEach(card=>{const a=card.querySelector('.ref-team[data-side="a"] .ref-team-score'),b=card.querySelector('.ref-team[data-side="b"] .ref-team-score'),clock=card.querySelector('.ref-clock');if(a&&b&&clock){clock.textContent=`${a.textContent.trim()} - ${b.textContent.trim()}`;clock.dir='rtl';}});
}
function init(){bind();fixScores();setTimeout(()=>fixScores(),1200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();