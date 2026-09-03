(() => {
  'use strict';
  const cfg = window.AGCH_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey) return;
  const H = { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}` };
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const q = async (path) => { const r = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, { headers:H, cache:'no-store' }); if(!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); };
  const route = () => location.hash.replace(/^#\/?/,'').split('/').map(decodeURIComponent).filter(Boolean);
  const uuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
  const img = (u,a='') => u ? `<img src="${esc(u)}" alt="${esc(a)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '<span class="mr-placeholder">⚽</span>';
  const ts = m => m.match_date ? Date.parse(`${m.match_date}T${String(m.match_time||'00:00').slice(0,5)}:00Z`) : 0;
  const hasPenalties = m => Number.isInteger(m.home_penalty_score) && Number.isInteger(m.away_penalty_score);
  const winnerFor = (m, teamId) => {
    if (m.status !== 'انتهت' || m.score_a == null || m.score_b == null) return null;
    let a = Number(m.score_a), b = Number(m.score_b);
    if (a === b && hasPenalties(m)) { a = Number(m.home_penalty_score); b = Number(m.away_penalty_score); }
    if (a === b) return 'D';
    const aWon = a > b;
    return (teamId === m.team_a_id) === aWon ? 'W' : 'L';
  };
  const shootoutMarkup = m => {
    if (!hasPenalties(m)) return '';
    const rows = Array.isArray(m.penalty_shootout) ? m.penalty_shootout : [];
    const by = side => rows.filter(x => x && x.side === side).sort((a,b)=>(a.order||0)-(b.order||0));
    const dots = side => by(side).map(x => `<i class="${x.scored ? 'ok':'miss'}"></i>`).join('');
    return `<div class="mr-shootout"><b>ركلات الترجيح: ${m.home_penalty_score} - ${m.away_penalty_score}</b>${rows.length ? `<div class="mr-shootout-row"><span>${dots('home')}</span><span>${dots('away')}</span></div>` : ''}</div>`;
  };
  async function enhanceMatch(matchId){
    const host = document.querySelector('.agh-match-page'); if(!host) return;
    const [matches,teams] = await Promise.all([
      q('matches?select=id,team_a_id,team_b_id,match_date,match_time,status,score_a,score_b,home_penalty_score,away_penalty_score,penalty_shootout'),
      q('teams?select=id,name,logo_url')
    ]);
    const current = matches.find(m=>m.id===matchId); if(!current) return;
    const teamBy = id => teams.find(t=>t.id===id)||{};
    const home=teamBy(current.team_a_id), away=teamBy(current.team_b_id);
    const prior = matches.filter(m => m.id!==current.id && m.status==='انتهت' && ((m.team_a_id===current.team_a_id&&m.team_b_id===current.team_b_id)||(m.team_a_id===current.team_b_id&&m.team_b_id===current.team_a_id)) && (!current.match_date || ts(m) < ts(current))).sort((a,b)=>ts(b)-ts(a))[0];
    const target = host.querySelector('.agh-overview') || host.querySelector('.agh-match-tabs')?.parentElement;
    if (!target || document.getElementById('mrMatchExtra')) return;
    let previous = `<div class="mr-empty">لا توجد مواجهة سابقة مسجلة بين الفريقين.</div>`;
    if(prior){
      const pHome=teamBy(prior.team_a_id), pAway=teamBy(prior.team_b_id);
      previous = `<article class="mr-prev-card"><div class="mr-prev-team">${img(pHome.logo_url,pHome.name)}<b>${esc(pHome.name)}</b><span class="mr-form ${winnerFor(prior,pHome.id)?.toLowerCase()}">${winnerFor(prior,pHome.id)||'D'}</span></div><div class="mr-prev-score"><strong>${prior.score_a} - ${prior.score_b}</strong>${shootoutMarkup(prior)}<small>${esc(prior.match_date||'')}</small></div><div class="mr-prev-team">${img(pAway.logo_url,pAway.name)}<b>${esc(pAway.name)}</b><span class="mr-form ${winnerFor(prior,pAway.id)?.toLowerCase()}">${winnerFor(prior,pAway.id)||'D'}</span></div></article>`;
    }
    const extra = document.createElement('section'); extra.id='mrMatchExtra'; extra.className='mr-match-extra';
    extra.innerHTML = `${shootoutMarkup(current)}<h2>آخر مواجهة بين الفريقين</h2>${previous}`;
    target.appendChild(extra);
  }
  const monthNames={8:'أغسطس 2026',9:'سبتمبر 2026'};
  function calendarMarkup(team,matches,month){
    const first = new Date(Date.UTC(2026,month-1,1));
    const days = new Date(Date.UTC(2026,month,0)).getUTCDate();
    const shift = (first.getUTCDay()+6)%7;
    const cells=[]; for(let i=0;i<shift;i++) cells.push('<div class="mr-day blank"></div>');
    for(let d=1;d<=days;d++){
      const ds=`2026-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const list=matches.filter(m=>m.match_date===ds);
      cells.push(`<button class="mr-day ${list.length?'has':''}" ${list[0]?`data-route="match/${list[0].id}"`:''}><b>${d}</b>${list.map(m=>{const opp=m.team_a_id===team.id?m._b:m._a;return `<span class="mr-day-logo">${img(opp?.logo_url,opp?.name)}</span>`}).join('')}</button>`);
    }
    return `<div class="mr-calendar"><div class="mr-cal-head"><button data-mr-month="${month===8?9:8}">${month===8?'سبتمبر ›':'‹ أغسطس'}</button><h3>${monthNames[month]}</h3><button data-mr-month="${month===9?8:9}">${month===9?'‹ أغسطس':'سبتمبر ›'}</button></div><div class="mr-week"><span>الاثنين</span><span>الثلاثاء</span><span>الأربعاء</span><span>الخميس</span><span>الجمعة</span><span>السبت</span><span>الأحد</span></div><div class="mr-days">${cells.join('')}</div>${matches.some(m=>Number(String(m.match_date||'').slice(5,7))===month)?'':'<div class="mr-empty">لا توجد مباريات مسجلة لهذا الفريق خلال هذا الشهر.</div>'}</div>`;
  }
  async function enhanceTeam(teamId){
    const host=document.querySelector('.page-shell'); if(!host || document.getElementById('mrTeamCalendar')) return;
    const [teams,matches]=await Promise.all([q('teams?select=id,name,logo_url'),q('matches?select=id,team_a_id,team_b_id,match_date,match_time,status,score_a,score_b,home_penalty_score,away_penalty_score')]);
    const team=teams.find(t=>t.id===teamId); if(!team) return;
    const own=matches.filter(m=>m.team_a_id===teamId||m.team_b_id===teamId).filter(m=>/^2026-(08|09)-/.test(m.match_date||'')).map(m=>({...m,_a:teams.find(t=>t.id===m.team_a_id),_b:teams.find(t=>t.id===m.team_b_id)}));
    const section=document.createElement('section'); section.id='mrTeamCalendar'; section.className='section-block';
    section.innerHTML=`<div class="section-heading"><div><span class="eyebrow">MATCH CALENDAR</span><h2>مباريات الفريق</h2></div></div><div id="mrCalendarBody">${calendarMarkup(team,own,8)}</div>`;
    const profile=host.querySelector('.profile-hero'); (profile?.nextSibling ? host.insertBefore(section, profile.nextSibling) : host.appendChild(section));
    section.addEventListener('click',e=>{ const b=e.target.closest('[data-mr-month]'); if(!b) return; document.getElementById('mrCalendarBody').innerHTML=calendarMarkup(team,own,Number(b.dataset.mrMonth)); });
  }
  async function run(){
    const p=route();
    try{
      if((p[0]==='match'||p[0]==='matches'||p[0]==='match-details')&&uuid(p[1])) await enhanceMatch(p[1]);
      if(p[0]==='team'&&uuid(p[1])) await enhanceTeam(p[1]);
    }catch(e){ console.warn('match-reference-upgrades',e); }
  }
  const obs=new MutationObserver(()=>{ clearTimeout(window.__mrRun); window.__mrRun=setTimeout(run,120); });
  obs.observe(document.getElementById('appMain')||document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(run,180));
  document.addEventListener('click',e=>{const r=e.target.closest('[data-route]'); if(r?.dataset.route) setTimeout(run,220);});
  run();
})();