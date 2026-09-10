(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG||{};
  const main=document.getElementById('appMain');
  if(!main||!cfg.supabaseUrl||!cfg.supabaseKey)return;
  const headers={apikey:cfg.supabaseKey,Authorization:`Bearer ${cfg.supabaseKey}`};
  let teams=[];
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function load(){const r=await fetch(`${cfg.supabaseUrl}/rest/v1/teams?select=id,name,team_photo_url`,{headers,cache:'no-store'});if(r.ok)teams=await r.json()}
  function teamId(){const p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);return p[0]==='team'?p[1]:''}
  function apply(){const id=teamId();if(!id)return;const t=teams.find(x=>x.id===id);if(!t?.team_photo_url)return;const shell=main.querySelector('.page-shell');if(!shell)return;let hero=shell.querySelector('.team-background-live');if(!hero){hero=document.createElement('div');hero.className='team-background-live';shell.prepend(hero)}hero.innerHTML=`<img src="${esc(t.team_photo_url)}" alt="خلفية ${esc(t.name)}"><span></span>`}
  async function refresh(){try{await load();apply()}catch(e){console.warn('team background skipped',e)}}
  const obs=new MutationObserver(()=>setTimeout(apply,50));obs.observe(main,{childList:true,subtree:false});window.addEventListener('hashchange',()=>setTimeout(apply,100));refresh();
})();