(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;if(!cfg||!window.supabase)return;
  const sb=window.AGCH_ADMIN_SB||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const state={matches:[],predictions:[],category:'الكبار',matchId:'',query:''};
  const teamLabel=m=>`${m.team_a?.name||'الفريق الأول'} × ${m.team_b?.name||'الفريق الثاني'}`;
  const activate=()=>{document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id==='predictions'));document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='predictions'));scrollTo({top:0,behavior:'smooth'});load()};

  function init(){
    const tabs=document.querySelector('.tabs'),settings=document.getElementById('settings');if(!tabs||!settings||document.querySelector('[data-tab="predictions"]'))return;
    const btn=document.createElement('button');btn.dataset.tab='predictions';btn.textContent='توقعات المباريات';btn.onclick=activate;tabs.insertBefore(btn,tabs.querySelector('[data-tab="settings"]'));
    const sec=document.createElement('section');sec.id='predictions';sec.className='section';sec.innerHTML=`<div class="head"><div><h2>توقعات المباريات</h2><p class="muted">إدارة توقعات مباريات الكبار والوسط دون عرض أرقام الهواتف في الموقع العام.</p></div><button id="predRefresh" class="primary">تحديث</button></div><div class="pred-admin-filters"><select id="predCategory" class="search"><option>الكبار</option><option>الوسط</option></select><select id="predMatch" class="search"><option value="">كل المباريات</option></select><input id="predSearch" class="search" placeholder="بحث بالاسم أو رقم الهاتف"></div><div id="predMetrics" class="pred-admin-metrics"></div><div class="pred-admin-grid"><div class="card"><div class="head"><h3>أكثر النتائج توقعًا</h3></div><div id="predPopular"></div></div><div class="card"><div class="head"><h3>ملخص المباراة</h3></div><div id="predMatchSummary"></div></div></div><div class="head" style="margin-top:18px"><h3>قائمة التوقعات</h3><span id="predCount" class="muted"></span></div><div id="predAdminList" class="list"></div>`;
    settings.parentNode.insertBefore(sec,settings);
    document.getElementById('predRefresh').onclick=load;
    document.getElementById('predCategory').onchange=e=>{state.category=e.target.value;state.matchId='';renderMatchOptions();render()};
    document.getElementById('predMatch').onchange=e=>{state.matchId=e.target.value;render()};
    document.getElementById('predSearch').oninput=e=>{state.query=e.target.value.trim().toLowerCase();renderList()};
    document.addEventListener('click',async e=>{const d=e.target.closest('[data-delete-prediction]');if(!d)return;if(!confirm('هل تريد حذف هذا التوقع؟'))return;const {error}=await sb.from('match_predictions').delete().eq('id',d.dataset.deletePrediction);if(error){alert('تعذر حذف التوقع: '+error.message);return}await load()});
  }

  async function load(){
    const list=document.getElementById('predAdminList');if(list)list.innerHTML='<div class="empty card">جارٍ تحميل التوقعات...</div>';
    const [mr,pr]=await Promise.all([
      sb.from('matches').select('id,category,status,match_date,match_time,score_a,score_b,team_a:teams!matches_team_a_id_fkey(name,logo_url),team_b:teams!matches_team_b_id_fkey(name,logo_url)').in('category',['الكبار','الوسط']).order('match_date',{ascending:false}),
      sb.from('match_predictions').select('*').order('submitted_at',{ascending:false})
    ]);
    if(mr.error||pr.error){if(list)list.innerHTML=`<div class="empty card">تعذر تحميل البيانات: ${esc(mr.error?.message||pr.error?.message||'')}</div>`;return}
    state.matches=mr.data||[];state.predictions=pr.data||[];renderMatchOptions();render();
  }
  function renderMatchOptions(){const sel=document.getElementById('predMatch');if(!sel)return;const ms=state.matches.filter(m=>m.category===state.category);sel.innerHTML='<option value="">كل مباريات '+esc(state.category)+'</option>'+ms.map(m=>`<option value="${m.id}" ${state.matchId===m.id?'selected':''}>${esc(teamLabel(m))} · ${esc(m.match_date||'')}</option>`).join('')}
  function filtered(){return state.predictions.filter(p=>p.category===state.category&&(!state.matchId||p.match_id===state.matchId))}
  function currentMatch(){return state.matches.find(m=>m.id===state.matchId)}
  function render(){renderMetrics();renderPopular();renderSummary();renderList()}
  function renderMetrics(){const a=filtered(),ok=a.filter(x=>x.is_correct===true).length,bad=a.filter(x=>x.is_correct===false).length,pending=a.filter(x=>x.is_correct==null).length;document.getElementById('predMetrics').innerHTML=`<div><b>${a.length}</b><span>إجمالي التوقعات</span></div><div><b>${ok}</b><span>التوقعات الصحيحة</span></div><div><b>${bad}</b><span>التوقعات الخاطئة</span></div><div><b>${pending}</b><span>بانتظار النتيجة</span></div>`}
  function renderPopular(){const m=new Map();filtered().forEach(p=>{const k=`${p.prediction_a} - ${p.prediction_b}`;m.set(k,(m.get(k)||0)+1)});const rows=[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);document.getElementById('predPopular').innerHTML=rows.length?rows.map(([k,n],i)=>`<div class="pred-popular-row"><b dir="ltr">${k}</b><span>${n} توقعًا</span><i style="--w:${Math.max(8,(n/rows[0][1])*100)}%"></i></div>`).join(''):'<div class="empty">لا توجد توقعات بعد</div>'}
  function renderSummary(){const m=currentMatch();if(!m){document.getElementById('predMatchSummary').innerHTML='<div class="empty">اختر مباراة لمشاهدة ملخصها.</div>';return}const a=state.predictions.filter(p=>p.match_id===m.id),ok=a.filter(p=>p.is_correct===true).length;document.getElementById('predMatchSummary').innerHTML=`<div class="pred-admin-match"><b>${esc(teamLabel(m))}</b><span>${esc(m.match_date||'')} · ${esc(String(m.match_time||'').slice(0,5))}</span><strong>${m.status==='انتهت'?`النتيجة: <span dir="ltr">${m.score_a??0} - ${m.score_b??0}</span>`:esc(m.status)}</strong><small>${a.length} مشاركة · ${ok} توقع صحيح</small></div>`}
  function renderList(){const q=state.query;let a=filtered();if(q)a=a.filter(p=>String(p.user_name||'').toLowerCase().includes(q)||String(p.phone||'').includes(q));document.getElementById('predCount').textContent=`${a.length} توقع`;document.getElementById('predAdminList').innerHTML=a.length?a.map(p=>{const m=state.matches.find(x=>x.id===p.match_id),status=p.is_correct===true?'<span class="pred-badge ok">توقع صحيح ✓</span>':p.is_correct===false?'<span class="pred-badge bad">غير صحيح</span>':'<span class="pred-badge pending">قيد الانتظار</span>';return `<div class="item pred-admin-item"><div class="pred-avatar">🏆</div><div class="meta"><b>${esc(p.user_name)}</b><small>📞 ${esc(p.phone)} · ${esc(teamLabel(m||{}))}</small><small>${esc(new Date(p.submitted_at).toLocaleString('ar-MR'))}</small></div><div class="pred-admin-score"><b dir="ltr">${p.prediction_a} - ${p.prediction_b}</b>${status}</div><div class="actions"><button class="danger" data-delete-prediction="${p.id}">حذف</button></div></div>`}).join(''):'<div class="empty card">لا توجد توقعات مطابقة.</div>'}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
