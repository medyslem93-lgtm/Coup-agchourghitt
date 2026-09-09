(() => {
  'use strict';
  const cfg = window.AGCH_CONFIG || {};
  const factory = window.supabase?.createClient;
  const db = factory && cfg.supabaseUrl && cfg.supabaseKey ? factory(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}}) : null;
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const cache = new Map();
  async function teamByName(name){
    const key=String(name||'').trim(); if(!key||!db)return null; if(cache.has(key))return cache.get(key);
    const {data}=await db.from('teams').select('id,name,logo_url').eq('name',key).limit(1);
    const team=data?.[0]||null; cache.set(key,team); return team;
  }
  async function fix(){
    const cards=[...document.querySelectorAll('.rtc-qualification-card')];
    for(const card of cards){
      const old=card.querySelector('.rtc-penalties');
      if(!old||old.dataset.opponentFixed==='1')continue;
      const name=old.textContent.trim(); if(!name)continue;
      old.dataset.opponentFixed='1';
      const team=await teamByName(name);
      const logo=team?.logo_url ? `<img src="${esc(team.logo_url)}" alt="">` : '<span class="rtc-logo-fallback">⚽</span>';
      const row=document.createElement('div'); row.className='rtc-team-row rtc-opponent-row';
      row.innerHTML=`${logo}<span>${esc(team?.name||name)}</span><strong></strong>`;
      old.replaceWith(row);
    }
  }
  let busy=false;
  const run=()=>{if(busy)return;busy=true;Promise.resolve(fix()).finally(()=>busy=false)};
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('hashchange',()=>setTimeout(run,0));
  document.addEventListener('DOMContentLoaded',run); run();
})();
