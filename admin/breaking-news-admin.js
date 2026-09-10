(() => {
'use strict';
const cfg=window.AGCH_CONFIG||{};
if(!window.supabase?.createClient||!cfg.supabaseUrl||!cfg.supabaseKey)return;
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function mount(){
 const host=document.getElementById('settingsSummary');if(!host)return;
 const {data}=await sb.from('site_settings').select('breaking_news_text,breaking_news_enabled').eq('id','main').maybeSingle();
 let box=document.getElementById('breakingNewsAdminBox');if(!box){box=document.createElement('div');box.id='breakingNewsAdminBox';box.className='card';host.prepend(box)}
 box.innerHTML=`<div class="head"><div><span class="admin-kicker">BREAKING NEWS</span><h2>الخبر العاجل</h2><p>عدّل الشريط الأحمر في الموقع مباشرة دون إعادة نشر.</p></div></div><div class="field"><label>نص الخبر العاجل</label><textarea id="breakingNewsText" rows="4" placeholder="اكتب الخبر العاجل هنا...">${esc(data?.breaking_news_text||'')}</textarea></div><label style="display:flex;gap:10px;align-items:center;margin:12px 0"><input id="breakingNewsEnabled" type="checkbox" ${data?.breaking_news_enabled!==false?'checked':''}> <b>إظهار الخبر العاجل في الموقع</b></label><div class="savebar"><button id="saveBreakingNews" class="primary">حفظ ونشر فورًا</button></div>`;
 document.getElementById('saveBreakingNews').onclick=async()=>{const text=document.getElementById('breakingNewsText').value.trim(),enabled=document.getElementById('breakingNewsEnabled').checked;const {error}=await sb.from('site_settings').update({breaking_news_text:text,breaking_news_enabled:enabled,updated_at:new Date().toISOString()}).eq('id','main');if(error){alert('تعذر حفظ الخبر: '+error.message);return}alert('تم تحديث الخبر العاجل في الموقع')};
}
window.addEventListener('load',()=>setTimeout(mount,800));document.addEventListener('click',e=>{if(e.target.closest('[data-tab="settings"]'))setTimeout(mount,250)});
})();