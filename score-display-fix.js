(()=>{
'use strict';
const cfg=window.AGCH_CONFIG;
if(!cfg||!window.supabase)return;
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
let byId=new Map();
let patchTimer=null;
const isScored=m=>m&&['انتهت','مباشر','جارية'].includes(m.status);
function patchScores(){
  document.querySelectorAll('.ref-match-card[data-open-match]').forEach(card=>{
    const m=byId.get(card.dataset.openMatch);
    if(!isScored(m))return;
    const clock=card.querySelector('.ref-clock');
    if(!clock)return;
    // بطاقات RTL تعرض الفريق A على اليمين والفريق B على اليسار.
    // لذلك نعرض النتيجة بصريًا من اليسار إلى اليمين: B - A.
    clock.textContent=`${Number(m.score_b??0)} - ${Number(m.score_a??0)}`;
    clock.setAttribute('dir','ltr');
    clock.setAttribute('aria-label',`${Number(m.score_a??0)} لصالح ${card.querySelector('.ref-team:first-child b')?.textContent||'الفريق الأول'}، ${Number(m.score_b??0)} لصالح ${card.querySelector('.ref-team:last-child b')?.textContent||'الفريق الثاني'}`);
  });
}
function schedulePatch(){clearTimeout(patchTimer);patchTimer=setTimeout(patchScores,30)}
async function loadScores(){
  const {data,error}=await sb.from('matches').select('id,status,score_a,score_b');
  if(error)return;
  byId=new Map((data||[]).map(m=>[m.id,m]));
  patchScores();
}
const observer=new MutationObserver(schedulePatch);
observer.observe(document.documentElement,{childList:true,subtree:true});
loadScores();
sb.channel('score-display-fix').on('postgres_changes',{event:'*',schema:'public',table:'matches'},payload=>{
  if(payload.eventType==='DELETE')byId.delete(payload.old?.id);
  else if(payload.new?.id)byId.set(payload.new.id,payload.new);
  schedulePatch();
}).subscribe();
})();
