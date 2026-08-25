(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const style=document.createElement('style');style.textContent=`
    .pa-selected-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0 14px}.pa-selected-metrics>div{padding:12px;border:1px solid rgba(214,169,43,.28);border-radius:14px;background:linear-gradient(135deg,#111a17,#17221e);color:#fff}.pa-selected-metrics b{display:block;font-size:18px;color:#e0bd55}.pa-selected-metrics span{display:block;margin-top:3px;font-size:9px;color:#aab4ad}.pa-selected-metrics .good b{color:#66d19e}.pa-selected-metrics .bad b{color:#ff8c8c}.pa-selected-metrics .wait b{color:#e0bd55}@media(max-width:680px){.pa-selected-metrics{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(style);
  let busy=false,lastKey='';
  async function refresh(){
    const sec=document.getElementById('predictionAdmin'),sel=document.getElementById('paMatch');if(!sec||!sel||!sel.value||busy)return;
    const key=sel.value+'|'+(document.getElementById('paCategory')?.value||'');if(key===lastKey&&sec.querySelector('.pa-selected-metrics'))return;busy=true;
    try{
      const [{data:ps,error},{data:m}]=await Promise.all([sb.from('match_predictions').select('id,is_correct,points').eq('match_id',sel.value),sb.from('matches').select('status').eq('id',sel.value).maybeSingle()]);
      if(error)return;const rows=ps||[],finished=m?.status==='انتهت',correct=rows.filter(x=>x.is_correct===true).length,wrong=finished?rows.filter(x=>x.is_correct===false).length:0,pending=finished?0:rows.length-correct;
      let box=sec.querySelector('.pa-selected-metrics');if(!box){box=document.createElement('div');box.className='pa-selected-metrics';document.getElementById('paOverall')?.after(box)}
      box.innerHTML=`<div><b>${rows.length}</b><span>إجمالي توقعات المباراة</span></div><div class="good"><b>${correct}</b><span>التوقعات الصحيحة</span></div><div class="bad"><b>${wrong}</b><span>التوقعات الخاطئة</span></div><div class="wait"><b>${pending}</b><span>قيد انتظار النتيجة</span></div>`;lastKey=key;
    }finally{busy=false}
  }
  function patchLabels(){const tab=document.querySelector('[data-tab="predictionAdmin"]');if(tab)tab.textContent='توقعات المباريات';const h=document.querySelector('#predictionAdmin h2');if(h)h.textContent='إدارة التوقعات والنقاط'}
  const obs=new MutationObserver(()=>{patchLabels();lastKey='';refresh()});
  const start=()=>{obs.observe(document.body,{childList:true,subtree:true});document.addEventListener('change',e=>{if(e.target?.id==='paMatch'||e.target?.id==='paCategory'){lastKey='';setTimeout(refresh,60)}});patchLabels();refresh()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();