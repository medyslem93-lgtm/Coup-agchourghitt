(() => {
  'use strict';
  const FINAL_STAGE = 'النهائي';
  const KEY = 'aghchorguit-selected-tournament';
  const VERIFIED_PREGAME_ID = '1e79da7b-1d03-46e3-8f61-b7948d9634ce';
  const VERIFIED_PREGAME_AT = Date.parse('2026-09-26T00:01:17.371Z');
  let finals = new Map(), teams = new Map(), busy = false;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate = v => { try { return new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${v}T12:00:00Z`)); } catch { return v || ''; } };
  const img = t => `<span class="team-logo"><img src="${esc(t?.logo_url || 'assets/tournament.jpg')}" alt="${esc(t?.name || '')}" width="74" height="74" loading="eager" decoding="async"></span>`;
  function scoreBlock(m){
    if(m.status==='انتهت'||m.status==='مباشر') return `<div class="score-block"><strong>${Number(m.score_a||0)} <span>–</span> ${Number(m.score_b||0)}</strong><span>${m.status==='مباشر'?`${Number(m.minute||0)}′`:'النتيجة النهائية'}</span></div>`;
    return `<div class="score-block"><time>${esc(String(m.match_time||'--:--').slice(0,5))}</time><span>موعد المباراة</span></div>`;
  }
  function correctVerifiedPregame(m){
    if(!m || m.id!==VERIFIED_PREGAME_ID) return m;
    const updated = Date.parse(m.updated_at || '');
    if(Number.isFinite(updated) && updated >= VERIFIED_PREGAME_AT) return m;
    return {...m,status:'قادمة',stream_enabled:false,stream_status:'offline',stream_url:null,score_a:null,score_b:null,minute:null,clock_elapsed_seconds:0,clock_anchor_at:null,clock_running:false,updated_at:'2026-09-26T00:01:17.371Z'};
  }
  function render(){
    const id = localStorage.getItem(KEY); const m = finals.get(id); const card = document.querySelector('.hero-layout .hero-match-card');
    if(!m || !card) return;
    const fingerprint = `${m.id}:${m.status}:${m.score_a??''}:${m.score_b??''}:${m.minute??''}:${m.updated_at??''}`;
    if(card.dataset.finalFeatured===fingerprint) return;
    const a=teams.get(m.team_a_id), b=teams.get(m.team_b_id);
    card.dataset.finalFeatured=fingerprint; card.dataset.route=`match/${m.id}`;
    card.innerHTML=`<div class="hero-match-top"><span class="competition-label">${esc(m.category||'بطولة')} · النهائي</span><span class="status-pill ${m.status==='مباشر'?'live':m.status==='انتهت'?'finished':'upcoming'}">${m.status==='مباشر'?'<span class="live-dot"></span>':''}${esc(m.status||'قادمة')}</span></div><div class="hero-teams"><div class="hero-team">${img(a)}<b>${esc(a?.name||'الفريق الأول')}</b></div>${scoreBlock(m)}<div class="hero-team">${img(b)}<b>${esc(b?.name||'الفريق الثاني')}</b></div></div><div class="hero-match-meta"><span>🏆 النهائي</span><span>🗓 ${esc(fmtDate(m.match_date))}</span><span>◷ ${esc(String(m.match_time||'--:--').slice(0,5))}</span></div>`;
  }
  async function load(){
    if(busy)return; busy=true;
    try{
      const response = await fetch('/api/public-snapshot',{cache:'no-store',signal:AbortSignal.timeout?AbortSignal.timeout(12000):undefined});
      if(!response.ok) throw new Error(`snapshot_${response.status}`);
      const payload = await response.json();
      const ms = Array.isArray(payload?.matches) ? payload.matches.map(correctVerifiedPregame).filter(m=>m?.stage===FINAL_STAGE) : [];
      const ts = Array.isArray(payload?.teams) ? payload.teams : [];
      teams = new Map(ts.map(t=>[t.id,t]));
      finals = new Map();
      ms.sort((x,y)=>Number(y.display_order||0)-Number(x.display_order||0)).forEach(m=>{if(!finals.has(m.tournament_id))finals.set(m.tournament_id,m)});
      render();
    } catch(error) {
      console.warn('Featured final snapshot unavailable', error?.message || error);
      render();
    } finally {busy=false;}
  }
  const appMain=document.getElementById('appMain');
  if(appMain)new MutationObserver(()=>render()).observe(appMain,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('[data-select-tournament]'))setTimeout(render,80)});
  window.addEventListener('agh:public-snapshot',()=>load());
  load();
})();
