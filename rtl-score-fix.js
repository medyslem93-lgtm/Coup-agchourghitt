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
function init(){bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();