(() => {
'use strict';
const cfg=window.AGCH_CONFIG||{};
const ticker=document.getElementById('aghBreakingTicker');
if(!ticker||!window.supabase?.createClient||!cfg.supabaseUrl||!cfg.supabaseKey)return;
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
const moving=ticker.querySelector('.agh-moving');
function apply(row){
 const text=(row?.breaking_news_text||'').trim();
 const enabled=row?.breaking_news_enabled!==false && !!text;
 ticker.hidden=!enabled;
 ticker.style.display=enabled?'flex':'none';
 if(moving&&enabled)moving.textContent=text;
}
async function load(){const {data,error}=await db.from('site_settings').select('breaking_news_text,breaking_news_enabled').eq('id','main').maybeSingle();if(!error&&data)apply(data)}
load();
db.channel('breaking-news-live').on('postgres_changes',{event:'UPDATE',schema:'public',table:'site_settings',filter:'id=eq.main'},p=>apply(p.new)).subscribe();
})();