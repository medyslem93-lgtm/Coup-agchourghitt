(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  const factory = window.supabase?.createClient;
  if (!factory || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = factory(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-road-to-cup' } },
  });

  const teamCache = new Map();
  const tournamentCache = new Map();
  const selectedTournamentStage = new Map();
  let channel = null;
  let currentKey = '';

  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const norm = (v = '') => String(v).trim().toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ـ/g,'').replace(/\s+/g,' ');
  const time = v => v ? String(v).slice(0,5) : 'موعد غير محدد';
  const sideName = (m, side) => m[side] || { name: m[`${side}_placeholder`] || 'لم يتحدد بعد', logo_url: '' };

  function parseRoute() {
    const team = location.hash.match(/^#\/?team\/([0-9a-f-]{36})(?:\/|$)/i);
    if (team) return { type:'team', id:team[1] };
    const tour = location.hash.match(/^#\/?tournament\/([^/]+)(?:\/([^/]+))?/i);
    if (tour) return { type:'tournament', slug:decodeURIComponent(tour[1]), tab:tour[2] || 'overview' };
    return null;
  }

  function isNonKnockout(label = '') {
    const s = norm(label);
    return s.includes('دوري المجموعات') || s.includes('مرحله المجموعات') || s.includes('مرحله الضمان') || s === 'المجموعات';
  }

  function isFinalStage(label = '') {
    const s = norm(label);
    return s === 'النهائي' || s === 'نهائي' || s === 'المباراه النهائيه' || s === 'المباراة النهائية';
  }

  function stageRank(label = '') {
    const s = norm(label);
    if (s.includes('الدور الاول') || s.includes('الدور 1')) return 10;
    if (s.includes('الدور الثاني') || s.includes('الدور 2')) return 20;
    if (s.includes('دور 16') || s.includes('دور الـ16') || s.includes('ثمن')) return 30;
    if (s.includes('ربع النهائي') || s.includes('ربع نهائي')) return 40;
    if (s.includes('نصف النهائي') || s.includes('نصف نهائي')) return 50;
    if (s.includes('المركز الثالث') || s.includes('تحديد المركز الثالث')) return 60;
    if (isFinalStage(label)) return 70;
    if (s.includes('الفاصله') || s.includes('قرعه الثلاثه')) return 25;
    return 35;
  }

  function isKnockoutMatch(m) {
    const label = m.stage || m.round_name || '';
    if (!label || isNonKnockout(label)) return false;
    const s = norm(label);
    return isFinalStage(label) || ['ربع','نصف','دور 16','دور الـ16','ثمن','الدور الاول','الدور الثاني','الفاصله','قرعه الثلاثه','المركز الثالث'].some(k => s.includes(norm(k)));
  }

  const stageLabel = m => m.stage || m.round_name || 'مرحلة إقصائية';
  const itemOrder = item => Number(item.display_order ?? 9999);

  function winnerFromNote(m) {
    const note = norm(m.qualifier_note || '');
    if (!note) return null;
    for (const [id, name] of [[m.team_a_id,m.team_a?.name],[m.team_b_id,m.team_b?.name]]) {
      if (!id || !name) continue;
      const n = norm(name);
      if (note.includes(`فاز ${n}`) || note.includes(`فوز ${n}`) || note.includes(`تاهل ${n}`)) return id;
    }
    return null;
  }

  function winnerId(m) {
    if (m.status !== 'انتهت') return null;
    if (m.home_penalty_score != null && m.away_penalty_score != null && Number(m.home_penalty_score) !== Number(m.away_penalty_score)) {
      return Number(m.home_penalty_score) > Number(m.away_penalty_score) ? m.team_a_id : m.team_b_id;
    }
    const a = Number(m.score_a), b = Number(m.score_b);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a > b ? m.team_a_id : m.team_b_id;
    return winnerFromNote(m);
  }

  function penaltyLine(m) {
    if (m.home_penalty_score != null && m.away_penalty_score != null) return `ركلات الترجيح: ${m.home_penalty_score} — ${m.away_penalty_score}`;
    const note = m.qualifier_note || '';
    return /ركلات الترجيح/.test(note) ? (note.match(/ركلات الترجيح[^.،\n]{0,80}/)?.[0] || '') : '';
  }

  function statusText(m) {
    if (m.status === 'مباشر') return `🔴 LIVE${m.minute != null ? ` • ${m.minute}′` : ''}`;
    if (m.status === 'مؤجلة') return '⏸ مؤجلة';
    if (m.status === 'ملغاة') return 'ملغاة';
    if (m.status === 'قادمة') return '⏳ قادمة';
    return 'انتهت';
  }

  function teamStageState(m, teamId) {
    if (m.status !== 'انتهت') return statusText(m);
    const w = winnerId(m);
    if (!w) return 'انتهت';
    if (isFinalStage(stageLabel(m)) && w === teamId) return '🏆 بطل';
    return w === teamId ? '✅ تأهل' : '❌ خرج';
  }

  function logo(team) {
    return team?.logo_url ? `<img src="${esc(team.logo_url)}" alt="">` : '<span class="rtc-logo-fallback">⚽</span>';
  }

  function matchCard(m) {
    const a = sideName(m,'team_a');
    const b = sideName(m,'team_b');
    const win = winnerId(m);
    const penalties = penaltyLine(m);
    const final = isFinalStage(stageLabel(m));
    return `<article class="rtc-match ${final ? 'is-final' : ''}" data-rtc-match="${esc(m.id)}" tabindex="0">
      <div class="rtc-match-head"><span>${esc(stageLabel(m))}</span><b>${esc(statusText(m))}</b></div>
      <div class="rtc-team-row ${win === m.team_a_id ? 'is-winner' : ''}">${logo(a)}<span>${esc(a.name)}</span><strong>${['قادمة','مؤجلة','ملغاة'].includes(m.status) ? '' : (m.score_a ?? '')}</strong></div>
      <div class="rtc-team-row ${win === m.team_b_id ? 'is-winner' : ''}">${logo(b)}<span>${esc(b.name)}</span><strong>${['قادمة','مؤجلة','ملغاة'].includes(m.status) ? '' : (m.score_b ?? '')}</strong></div>
      ${penalties ? `<div class="rtc-penalties">${esc(penalties)}</div>` : ''}
      <div class="rtc-match-foot"><span>${m.match_date ? esc(m.match_date) : 'موعد غير محدد'}${m.match_time ? ` • ${esc(time(m.match_time))}` : ''}</span><span>تفاصيل المباراة ←</span></div>
    </article>`;
  }

  function qualificationCard(e) {
    const team = e.team || { name:e.participant_label || 'فريق', logo_url:'' };
    return `<article class="rtc-match rtc-qualification-card">
      <div class="rtc-match-head"><span>${esc(e.stage || 'تأهل')}</span><b>✅ ${esc(e.status || 'تأهل')}</b></div>
      <div class="rtc-team-row is-winner">${logo(team)}<span>${esc(team.name || e.participant_label || 'الفريق')}</span><strong>✓</strong></div>
      ${e.opponent_label ? `<div class="rtc-penalties">${esc(e.opponent_label)}</div>` : ''}
    </article>`;
  }

  async function fetchTeamRoad(teamId, force = false) {
    if (!force && teamCache.has(teamId)) return teamCache.get(teamId);
    const { data:team, error:teamError } = await db.from('teams').select('id,name,logo_url,tournament_id,tournament:tournaments(id,name,short_name,slug,division,season)').eq('id',teamId).single();
    if (teamError) throw teamError;
    const [matchRes, qualRes] = await Promise.all([
      db.from('matches').select(`id,tournament_id,team_a_id,team_b_id,team_a_placeholder,team_b_placeholder,match_date,match_time,stage,round_name,status,score_a,score_b,minute,display_order,qualifier_note,home_penalty_score,away_penalty_score,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)`).eq('tournament_id',team.tournament_id).or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`).order('display_order'),
      db.from('qualification_events').select('id,tournament_id,stage,participant_team_id,participant_label,opponent_label,status,event_date,event_time,display_order,team:teams!qualification_events_participant_team_id_fkey(id,name,logo_url)').eq('tournament_id',team.tournament_id).eq('participant_team_id',teamId).order('display_order')
    ]);
    if (matchRes.error) throw matchRes.error;
    if (qualRes.error) throw qualRes.error;
    const result = { team, matches:matchRes.data || [], qualifications:qualRes.data || [] };
    teamCache.set(teamId,result);
    return result;
  }

  async function fetchTournamentBracket(slug, force = false) {
    if (!force && tournamentCache.has(slug)) return tournamentCache.get(slug);
    const { data:tournament, error:tError } = await db.from('tournaments').select('id,name,short_name,slug,division,season,status,accent_color').eq('slug',slug).single();
    if (tError) throw tError;
    const { data:matches, error:matchError } = await db.from('matches').select(`id,tournament_id,team_a_id,team_b_id,team_a_placeholder,team_b_placeholder,match_date,match_time,stage,round_name,status,score_a,score_b,minute,display_order,qualifier_note,home_penalty_score,away_penalty_score,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)`).eq('tournament_id',tournament.id).order('display_order');
    if (matchError) throw matchError;
    const result = { tournament, matches:matches || [] };
    tournamentCache.set(slug,result);
    return result;
  }

  function roadMarkup(data) {
    const items = [
      ...data.matches.filter(isKnockoutMatch).map(m => ({kind:'match',...m})),
      ...data.qualifications.map(e => ({kind:'qualification',...e}))
    ].sort((a,b)=>itemOrder(a)-itemOrder(b));
    if (!items.length) return `<section class="rtc-shell"><div class="rtc-title"><span>ROAD TO THE CUP</span><h2>طريق ${esc(data.team.name)} إلى الكأس</h2></div><div class="rtc-empty">لم يبدأ طريق الأدوار الإقصائية لهذا الفريق بعد.</div></section>`;
    const visible = [];
    for (const item of items) {
      visible.push(item);
      if (item.kind === 'match' && item.status === 'انتهت' && winnerId(item) && winnerId(item) !== data.team.id) break;
    }
    const champion = visible.some(i => i.kind === 'match' && isFinalStage(stageLabel(i)) && winnerId(i) === data.team.id);
    return `<section class="rtc-shell rtc-road-shell">${champion ? `<div class="rtc-champion">🏆 بطل ${esc(data.team.tournament?.short_name || data.team.tournament?.name || 'كأس أغشوركيت')}</div>` : ''}<div class="rtc-title"><span>ROAD TO THE CUP</span><h2>طريق ${esc(data.team.name)} إلى الكأس</h2></div><div class="rtc-road">${visible.map((item,i)=>`<div class="rtc-road-step"><div class="rtc-stage-badge">${esc(item.stage || item.round_name || 'مرحلة')}<strong>${item.kind === 'qualification' ? `✅ ${esc(item.status || 'تأهل')}` : esc(teamStageState(item,data.team.id))}</strong></div>${item.kind === 'qualification' ? qualificationCard(item) : matchCard(item)}${i < visible.length-1 ? '<div class="rtc-arrow">↓</div>' : ''}</div>`).join('')}</div></section>`;
  }

  function groupStages(data) {
    const map = new Map();
    data.matches.filter(isKnockoutMatch).forEach(m => {
      const label = stageLabel(m);
      if (!map.has(label)) map.set(label,[]);
      map.get(label).push(m);
    });
    return [...map.entries()].map(([label,items]) => ({
      label,
      items: items.sort((a,b)=>itemOrder(a)-itemOrder(b)),
      rank: stageRank(label),
      order: Math.min(...items.map(itemOrder)),
    })).sort((a,b)=>a.rank-b.rank || a.order-b.order || a.label.localeCompare(b.label,'ar'));
  }

  function championFrom(matches) {
    const final = matches.filter(m => isFinalStage(stageLabel(m)) && m.status === 'انتهت').sort((a,b)=>itemOrder(b)-itemOrder(a))[0];
    if (!final) return null;
    const id = winnerId(final);
    return id === final.team_a_id ? final.team_a : id === final.team_b_id ? final.team_b : null;
  }

  function defaultStageLabel(data, stages) {
    const saved = selectedTournamentStage.get(data.tournament.slug);
    if (saved && stages.some(s=>s.label===saved)) return saved;
    const live = stages.find(s=>s.items.some(m=>m.status==='مباشر'));
    if (live) return live.label;
    const active = [...stages].reverse().find(s=>s.items.some(m=>m.status==='قادمة' || m.status==='مؤجلة'));
    if (active) return active.label;
    const finished = [...stages].reverse().find(s=>s.items.some(m=>m.status==='انتهت'));
    return finished?.label || stages[stages.length-1]?.label || stages[0]?.label || '';
  }

  function bracketMarkup(data, requestedLabel = '') {
    const stages = groupStages(data);
    if (!stages.length) return `<section class="rtc-shell rtc-bracket-shell"><div class="rtc-title"><span>TOURNAMENT BRACKET</span><h2>طريق النهائي</h2></div><div class="rtc-empty">لم تبدأ الأدوار الإقصائية بعد.</div></section>`;
    const selected = stages.find(s=>s.label===requestedLabel) || stages.find(s=>s.label===defaultStageLabel(data,stages)) || stages[0];
    selectedTournamentStage.set(data.tournament.slug, selected.label);
    const champion = championFrom(data.matches);
    const tabs = stages.map((stage,index)=>`<button type="button" class="rtc-stage-tab ${stage.label===selected.label?'is-active':''}" data-rtc-stage-index="${index}" aria-pressed="${stage.label===selected.label?'true':'false'}">${esc(stage.label)}</button>`).join('');
    return `<section class="rtc-shell rtc-bracket-shell">${champion ? `<div class="rtc-champion">🏆 البطل <span>${logo(champion)}${esc(champion.name)}</span></div>` : ''}<div class="rtc-title"><span>TOURNAMENT BRACKET</span><h2>طريق النهائي</h2><p>${esc(data.tournament.name)}</p></div><div class="rtc-stage-tabs" role="tablist" aria-label="أدوار البطولة">${tabs}</div><div class="rtc-bracket"><section class="rtc-round ${isFinalStage(selected.label)?'is-final-round':''}" data-rtc-selected-stage="${esc(selected.label)}"><div class="rtc-round-head"><b>${esc(selected.label)}</b><span>${selected.items.length} ${selected.items.length===1?'مباراة':'مباريات'}</span></div><div class="rtc-round-list">${selected.items.map(matchCard).join('')}</div></section></div></section>`;
  }

  function ensureTeamRoot() {
    const page = document.querySelector('#appMain .page-shell'), hero = page?.querySelector('.profile-hero');
    if (!page || !hero) return null;
    let root = document.getElementById('roadToCupRoot');
    if (!root) { root=document.createElement('div'); root.id='roadToCupRoot'; (document.getElementById('teamMatchCalendarRoot') || hero).insertAdjacentElement('afterend',root); }
    return root;
  }

  function ensureTournamentRoot() {
    const page = document.querySelector('#appMain .page-shell'), hero = page?.querySelector('.profile-hero');
    if (!page || !hero) return null;
    let root = document.getElementById('tournamentBracketRoot');
    if (!root) { root=document.createElement('div'); root.id='tournamentBracketRoot'; (page.querySelector('.app-tabs') || hero).insertAdjacentElement('afterend',root); }
    return root;
  }

  const loading = (root,text) => root.innerHTML=`<div class="rtc-loading"><i></i><i></i><i></i><span>${esc(text)}</span></div>`;
  const errorState = (root,msg) => root.innerHTML=`<div class="rtc-error">${esc(msg)}<button type="button" data-rtc-retry>إعادة المحاولة</button></div>`;

  function scrollActiveStage(root, smooth = false) {
    const active = root?.querySelector('.rtc-stage-tab.is-active');
    if (!active) return;
    requestAnimationFrame(()=>active.scrollIntoView({behavior:smooth?'smooth':'auto',block:'nearest',inline:'center'}));
  }

  function setupRealtime(cacheKey,tournamentId,teamId=null) {
    if (channel) db.removeChannel(channel);
    channel = db.channel(`rtc-${cacheKey}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'matches',filter:`tournament_id=eq.${tournamentId}`},payload=>{
        if (teamId) {
          const old=payload.old||{}, next=payload.new||{};
          if (![old.team_a_id,old.team_b_id,next.team_a_id,next.team_b_id].includes(teamId)) return;
          teamCache.delete(teamId);
        } else tournamentCache.delete(cacheKey);
        scheduleMount(true);
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'qualification_events',filter:`tournament_id=eq.${tournamentId}`},payload=>{
        if (teamId && ![payload.old?.participant_team_id,payload.new?.participant_team_id].includes(teamId)) return;
        if (teamId) { teamCache.delete(teamId); scheduleMount(true); }
      }).subscribe();
  }

  async function mount(force=false) {
    const route=parseRoute();
    if (!route) { document.getElementById('roadToCupRoot')?.remove(); document.getElementById('tournamentBracketRoot')?.remove(); return; }
    if (route.type === 'tournament' && route.tab !== 'overview') { document.getElementById('tournamentBracketRoot')?.remove(); return; }
    try {
      if (route.type === 'team') {
        const root=ensureTeamRoot(); if (!root) return;
        const key=`team:${route.id}`; if (currentKey!==key) { currentKey=key; loading(root,'جاري تحميل طريق الفريق…'); }
        const data=await fetchTeamRoad(route.id,force); if (parseRoute()?.id!==route.id) return;
        root.innerHTML=roadMarkup(data); setupRealtime(route.id,data.team.tournament_id,route.id);
      } else {
        const root=ensureTournamentRoot(); if (!root) return;
        const key=`tour:${route.slug}`; if (currentKey!==key) { currentKey=key; loading(root,'جاري تحميل مخطط البطولة…'); }
        const data=await fetchTournamentBracket(route.slug,force); if (parseRoute()?.slug!==route.slug) return;
        root.innerHTML=bracketMarkup(data); scrollActiveStage(root,false); setupRealtime(route.slug,data.tournament.id);
      }
    } catch (e) {
      console.error('Road to Cup load failed',e);
      const root=route.type==='team' ? ensureTeamRoot() : ensureTournamentRoot();
      if (root) errorState(root,route.type==='team'?'تعذر تحميل طريق الفريق.':'تعذر تحميل مخطط البطولة.');
    }
  }

  function scheduleMount(force=false) { clearTimeout(scheduleMount.t); scheduleMount.t=setTimeout(()=>mount(force),80); }
  function openMatch(el) { if (el?.dataset.rtcMatch) location.hash=`#match/${el.dataset.rtcMatch}`; }

  document.addEventListener('click',e=>{
    const stageButton=e.target.closest('[data-rtc-stage-index]');
    if (stageButton) {
      const route=parseRoute();
      const data=route?.type==='tournament' ? tournamentCache.get(route.slug) : null;
      const root=document.getElementById('tournamentBracketRoot');
      const stages=data ? groupStages(data) : [];
      const stage=stages[Number(stageButton.dataset.rtcStageIndex)];
      if (data && root && stage) {
        selectedTournamentStage.set(route.slug,stage.label);
        root.innerHTML=bracketMarkup(data,stage.label);
        scrollActiveStage(root,true);
      }
      return;
    }
    const card=e.target.closest('[data-rtc-match]');
    if (card) return openMatch(card);
    if (e.target.closest('[data-rtc-retry]')) scheduleMount(true);
  });
  document.addEventListener('keydown',e=>{ const card=e.target.closest?.('[data-rtc-match]'); if (card && (e.key==='Enter'||e.key===' ')) { e.preventDefault(); openMatch(card); } });
  window.addEventListener('hashchange',()=>{ currentKey=''; scheduleMount(false); });
  new MutationObserver(()=>{ const r=parseRoute(); if (!r) return; if (r.type==='team' && !document.getElementById('roadToCupRoot')) scheduleMount(false); if (r.type==='tournament' && r.tab==='overview' && !document.getElementById('tournamentBracketRoot')) scheduleMount(false); }).observe(document.getElementById('appMain'),{childList:true,subtree:true});
  scheduleMount(false);
})();