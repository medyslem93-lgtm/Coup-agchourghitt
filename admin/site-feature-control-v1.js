(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG||{};
  const db=window.AGCH_SUPABASE_CLIENT||window.aghDb||window.supabase?.createClient?.(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(!db)return;
  const state={flags:new Map(),ready:false};
  const routeMap={matches:'matches',tournaments:'tournaments',teams:'teams',stats:'stats',news:'news',watch:'watch',profile:'profile'};
  const on=(key)=>state.flags.get(key)!==false;
  const setHidden=(el,hidden)=>{if(!el)return;el.classList.toggle('agh-feature-hidden',hidden);el.setAttribute('aria-hidden',hidden?'true':'false')};
  function installStyles(){if(document.getElementById('aghFeatureControlStyles'))return;const s=document.createElement('style');s.id='aghFeatureControlStyles';s.textContent='.agh-feature-hidden{display:none!important}';document.head.appendChild(s)}
  function routeRoot(){return decodeURIComponent(location.hash||'').replace(/^#\/?/,'').split(/[/?]/)[0].trim()||'home'}
  function fallbackRoute(){for(const r of ['matches','tournaments','teams','news']){const key=Object.keys(routeMap).find(k=>routeMap[k]===r);if(!key||on(key))return r}return'home'}
  function apply(){
    installStyles();
    Object.entries(routeMap).forEach(([key,route])=>document.querySelectorAll(`[data-route="${route}"]`).forEach(el=>setHidden(el,!on(key))));
    document.querySelectorAll('[data-action="open-search"]').forEach(el=>setHidden(el,!on('search')));
    document.querySelectorAll('#aghPlayerTournamentVote,#aghPotSheet').forEach(el=>setHidden(el,!on('voting')));
    if(!on('scorers')){
      document.querySelectorAll('.scorers-showcase-card').forEach(el=>setHidden(el,true));
      document.querySelectorAll('.leader-card').forEach(card=>{const t=card.querySelector('.leader-card-head h3')?.textContent?.trim()||card.querySelector('h3')?.textContent?.trim()||'';if(['أفضل الهدافين','الهدافون','ترتيب الهدافين'].includes(t))setHidden(card,true)});
    }else document.querySelectorAll('.scorers-showcase-card.agh-feature-hidden').forEach(el=>setHidden(el,false));
    if(!on('live_stream'))document.querySelectorAll('[data-live-stream],.live-stream,.stream-player,#liveStream,#liveStreamPlayer').forEach(el=>setHidden(el,true));
    const current=routeRoot();
    if(current==='home'&&!on('home')) location.hash=`#/${fallbackRoute()}`;
    for(const [key,route] of Object.entries(routeMap))if(current===route&&!on(key)){location.hash='#/home';break}
  }
  async function load(){const {data,error}=await db.from('site_feature_flags').select('key,enabled');if(error)return;state.flags=new Map((data||[]).map(x=>[x.key,x.enabled]));state.ready=true;apply()}
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(state.ready)apply()})};
  const obs=new MutationObserver(schedule);obs.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('hashchange',schedule);document.addEventListener('DOMContentLoaded',schedule);
  load();
  db.channel('site-feature-flags-live').on('postgres_changes',{event:'*',schema:'public',table:'site_feature_flags'},()=>load()).subscribe();
})();