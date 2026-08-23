(() => {
  'use strict';
  if(!window.supabase||!window.AGCH_CONFIG)return;
  const sb=window.supabase.createClient(window.AGCH_CONFIG.supabaseUrl,window.AGCH_CONFIG.supabaseKey);
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const active=()=>localStorage.getItem('agh-active-category')||'الكبار';
  const fmt=d=>{if(!d)return 'غير محدد';try{return new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${d}T12:00:00Z`))}catch{return d}};
  const sideName=(m,k)=>m[`team_${k}`]?.name||m[`team_${k}_placeholder`]||'غير محدد';
  let cached=null;
  async function data(){if(cached)return cached;const [mr,qr,tr]=await Promise.all([sb.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)').eq('category','الوسط').order('display_order'),sb.from('qualification_events').select('*,participant:teams(id,name,logo_url)').eq('category','الوسط').order('display_order'),sb.from('teams').select('id,name').eq('category','الوسط')]);cached={matches:mr.data||[],quals:qr.data||[],teams:tr.data||[]};return cached}
  function row(m){return `<div class="middle-bracket-row"><div><b>${esc(sideName(m,'a'))}</b><span> × </span><b>${esc(sideName(m,'b'))}</b></div><span>${esc(fmt(m.match_date))} · ${esc(String(m.match_time||'').slice(0,5)||'غير محدد')}</span></div>`}
  async function renderTournament(){
    if(active()!=='الوسط'||document.querySelector('.page.active')?.id!=='tournament')return;const d=await data();
    const overview=document.getElementById('tourOverview'),stand=document.getElementById('standings'),bracket=document.getElementById('bracket');if(!overview||!stand||!bracket)return;
    overview.innerHTML=`<div class="middle-overview-grid"><div class="metric"><b>${d.teams.length}</b><span>فريق</span></div><div class="metric"><b>${d.matches.length}</b><span>مباراة مجدولة</span></div><div class="metric"><b>26 أغسطس</b><span>بداية البطولة</span></div><div class="metric"><b>18 سبتمبر</b><span>النهائي</span></div></div><div class="middle-overview-note"><b>بطولة الوسط</b><span>بطولة إقصائية. الأطراف غير المحسومة تبقى بوصف المتأهل حتى اعتماد الفريق رسميًا من الإدارة.</span></div>`;
    stand.innerHTML='<div class="card empty"><b>بطولة الوسط بنظام إقصائي</b><span>لا يوجد جدول ترتيب مجموعات لهذه المرحلة.</span></div>';
    const stages=['الدور الأول','الدور الثاني','الدور الثالث / نصف النهائي','النهائي'];
    bracket.innerHTML=`<div class="middle-bracket">${stages.map(s=>{const ms=d.matches.filter(m=>m.stage===s);if(!ms.length)return'';return `<section class="middle-bracket-stage"><h3>${esc(s)}</h3>${ms.map(row).join('')}</section>`}).join('')}${d.quals.length?`<section class="middle-bracket-stage"><h3>التأهل بالقرعة</h3>${d.quals.map(q=>`<div class="middle-bracket-row"><b>${esc(q.participant?.name||q.participant_label||'الشمال')}</b><span>${esc(q.opponent_label||'تأهل تلقائي')}</span></div>`).join('')}</section>`:''}</div>`;
  }
  function restoreClasses(){if(active()==='الوسط')return;const tg=document.getElementById('teamGrid'),ml=document.getElementById('matchesList'),up=document.getElementById('upcoming');if(tg)tg.className='teamgrid';if(ml)ml.className='';if(up)up.className='scroll'}
  function invalidate(){cached=null;if(active()==='الوسط')setTimeout(renderTournament,80)}
  document.addEventListener('click',e=>{if(e.target.closest('[data-page="tournament"],[data-tourcat="الوسط"],[data-global-cat]'))setTimeout(()=>{restoreClasses();renderTournament()},80);if(e.target.closest('[data-global-cat],[data-matchcat],[data-teamcat],[data-tourcat]'))setTimeout(restoreClasses,100)});
  sb.channel('middle-tournament-patch').on('postgres_changes',{event:'*',schema:'public',table:'matches',filter:'category=eq.الوسط'},invalidate).on('postgres_changes',{event:'*',schema:'public',table:'qualification_events',filter:'category=eq.الوسط'},invalidate).on('postgres_changes',{event:'*',schema:'public',table:'teams'},invalidate).subscribe();
  setTimeout(()=>{restoreClasses();renderTournament()},1000);
})();
