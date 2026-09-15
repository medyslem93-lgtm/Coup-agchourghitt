(() => {
  'use strict';
  const FINAL_STAGE = 'النهائي';
  const KEY = 'aghchorguit-selected-tournament';
  let finals = new Map(), teams = new Map(), busy = false;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate = v => { try { return new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${v}T12:00:00Z`)); } catch { return v || ''; } };
  const img = t => t?.logo_url ? `<img src="${esc(t.logo_url)}" alt="${esc(t.name)}" loading="eager" decoding="async">` : `<img src="assets/tournament.jpg" alt="${esc(t?.name||'')}" loading="eager">`;
  function scoreBlock(m){
    if(m.status==='انتهت'||m.status==='مباشر') return `<div class="hero-score"><strong>${Number(m.score_a||0)} <span>–</span> ${Number(m.score_b||0)}</strong><small>${m.status==='مباشر'?`${Number(m.minute||0)}′`:'النتيجة النهائية'}</small></div>`;
    return `<div class="hero-score"><time>${esc(String(m.match_time||'--:--').slice(0,5))}</time><small>موعد المباراة</small></div>`;
  }
  function render(){
    const id = localStorage.getItem(KEY); const m = finals.get(id); const card = document.querySelector('.hero-layout .hero-match-card');
    if(!m || !card || card.dataset.finalFeatured===m.id) return;
    const a=teams.get(m.team_a_id), b=teams.get(m.team_b_id);
    card.dataset.finalFeatured=m.id; card.dataset.route=`match/${m.id}`;
    card.innerHTML=`<div class="hero-match-top"><span class="competition-label">${esc(m.category||'بطولة')} · النهائي</span><span class="status-pill ${m.status==='مباشر'?'live':m.status==='انتهت'?'finished':'upcoming'}">${m.status==='مباشر'?'<span class="live-dot"></span>':''}${esc(m.status||'قادمة')}</span></div><div class="hero-match-body"><div class="hero-team">${img(a)}<b>${esc(a?.name||'الفريق الأول')}</b></div>${scoreBlock(m)}<div class="hero-team">${img(b)}<b>${esc(b?.name||'الفريق الثاني')}</b></div></div><div class="hero-match-meta"><span>🏆 النهائي</span><span>🗓 ${esc(fmtDate(m.match_date))}</span><span>◷ ${esc(String(m.match_time||'--:--').slice(0,5))}</span></div>`;
  }
  async function load(){ if(busy)return; busy=true; try{
    const cfg=window.AGCH_CONFIG||{}; if(!window.supabase?.createClient||!cfg.supabaseUrl||!cfg.supabaseKey)return;
    const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false}});
    const [{data:ms},{data:ts}] = await Promise.all([db.from('matches').select('*').eq('stage',FINAL_STAGE),db.from('teams').select('id,name,logo_url')]);
    (ts||[]).forEach(t=>teams.set(t.id,t));
    (ms||[]).sort((x,y)=>Number(y.display_order||0)-Number(x.display_order||0)).forEach(m=>{if(!finals.has(m.tournament_id))finals.set(m.tournament_id,m)});
    render();
  } finally {busy=false;} }
  new MutationObserver(()=>render()).observe(document.getElementById('appMain'),{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('[data-select-tournament]'))setTimeout(render,80)});
  load();
})();
