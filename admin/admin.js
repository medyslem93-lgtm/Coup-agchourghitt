(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=id=>document.getElementById(id);
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const CATS=['الكبار','الوسط','الصغار'];
  const EVENT_TYPES=['هدف','هدف عكسي','ركلة جزاء مسجلة','ركلة جزاء ضائعة','تمريرة حاسمة','بطاقة صفراء','بطاقة حمراء','تبديل','رجل المباراة','بداية المباراة','نهاية الشوط','نهاية المباراة'];
  const S={tournaments:[],teams:[],players:[],matches:[],events:[],news:[],refs:[],media:[],settings:null,audits:[],awards:[],user:null,loading:false};
  let liveChannel=null;
  const byId=(arr,id)=>arr.find(x=>x.id===id);
  const team=id=>byId(S.teams,id);
  const player=id=>byId(S.players,id);
  const match=id=>byId(S.matches,id);
  const mediaUrl=(u,f='../assets/tournament.jpg')=>!u?f:/^(https?:|data:|blob:)/i.test(u)?u:'../'+String(u).replace(/^\.\.\//,'').replace(/^\.\//,'');
  const img=(u,a='')=>`<img src="${esc(mediaUrl(u))}" alt="${esc(a)}" onerror="this.onerror=null;this.src='../assets/tournament.jpg'">`;
  const toast=(m,ok=true)=>{const t=$('toast');t.textContent=m;t.style.borderColor=ok?'#32634c':'#813c42';t.style.background=ok?'#193d2d':'#431e22';t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2300)};
  const confirmDelete=(label)=>window.confirm(`هل أنت متأكد من حذف ${label}؟`);
  const show=(html)=>{$('panel').innerHTML=html;$('sheet').classList.add('on')};
  const close=()=>{$('sheet').classList.remove('on');$('panel').innerHTML=''};
  const val=id=>$(id)?.value?.trim?.()??'';
  const nullable=v=>v===''?null:v;
  const debounce=(fn,ms=300)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
  const fmtDate=d=>d||'بدون تاريخ';
  const eventPlayerName=e=>e.player_name||player(e.player_id)?.name||'';
  const eventTeamName=e=>team(e.team_id)?.name||'';

  async function guard(){
    const {data:{session}}=await sb.auth.getSession();
    if(!session){location.replace('/admin/login.html');return false}
    const {data,error}=await sb.from('admin_emails').select('email').limit(1);
    if(error||!data?.length){await sb.auth.signOut();location.replace('/admin/login.html');return false}
    S.user=session.user;$('adminUser').textContent=session.user.email||'المسؤول';return true;
  }

  async function loadAll(silent=false){
    if(S.loading)return;S.loading=true;if(!silent)toast('جارٍ تحميل بيانات الإدارة...');
    try{
      const [tor,tr,pr,mr,er,nr,rr,med,sr,au,aw]=await Promise.all([
        sb.from('tournaments').select('*').order('sort_order'),sb.from('teams').select('*').order('category').order('name'),sb.from('players').select('*').order('name'),sb.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)').order('match_date',{ascending:false,nullsFirst:false}),sb.from('match_events').select('*').order('created_at',{ascending:false}),sb.from('news').select('*').order('featured',{ascending:false}).order('sort_order').order('publish_date',{ascending:false}),sb.from('referee_assignments').select('*').order('category'),sb.from('media_assets').select('*').order('created_at',{ascending:false}),sb.from('site_settings').select('*').eq('id','main').maybeSingle(),sb.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(50),sb.from('awards').select('*,player:players(id,name,team_id,photo_url)').order('award_date',{ascending:false,nullsFirst:false})]);
      const bad=[tor,tr,pr,mr,er,nr,rr,med,sr,au,aw].find(x=>x.error);if(bad)throw bad.error;
      S.tournaments=tor.data||[];S.teams=tr.data||[];S.players=pr.data||[];S.matches=mr.data||[];S.events=er.data||[];S.news=nr.data||[];S.refs=rr.data||[];S.media=med.data||[];S.settings=sr.data||{};S.audits=au.data||[];S.awards=aw.data||[];renderAll();
    }catch(e){console.error(e);toast('تعذر تحميل بعض بيانات الإدارة',false)}finally{S.loading=false}
  }
  function renderAll(){renderDashboard();renderTournaments();renderTeams();renderPlayers();renderMatches();renderEvents();renderRefs();renderNews();renderAwards();renderSettings();renderMedia();window.dispatchEvent(new CustomEvent('admin:data',{detail:S}))}
  function renderDashboard(){$('stTeams').textContent=S.teams.length;$('stPlayers').textContent=S.players.length;$('stMatches').textContent=S.matches.length;$('stFinished').textContent=S.matches.filter(m=>m.status==='انتهت').length;$('stUpcoming').textContent=S.matches.filter(m=>m.status==='قادمة').length;$('stGoals').textContent=S.events.filter(e=>['هدف','ركلة جزاء مسجلة','هدف عكسي'].includes(e.type)).length;$('auditList').innerHTML=S.audits.length?S.audits.slice(0,20).map(a=>`<div class="audit-row"><span>${esc(a.action)}</span><b>${esc(a.summary||a.record_id||'تعديل')}</b><small>${esc((a.created_at||'').replace('T',' ').slice(0,16))}</small></div>`).join(''):'<div class="empty">لا توجد تعديلات مسجلة بعد</div>'}

  /* Remaining admin functions are loaded from the previous dashboard modules. */
  window.adminControl={state:S,client:sb,loadAll,toast,show,close};
  (async()=>{if(!await guard())return;if(typeof bindStatic==='function')bindStatic();await loadAll(true);if(typeof refreshTeamFilters==='function')refreshTeamFilters();if(typeof renderPlayers==='function')renderPlayers();if(typeof renderEvents==='function')renderEvents();if(typeof subscribe==='function')subscribe()})();
})();
