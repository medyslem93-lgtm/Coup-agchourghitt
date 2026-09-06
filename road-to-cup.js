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
  let channel = null;
  let currentKey = '';
  let observer = null;

  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (v = '') => String(v).trim().toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ـ/g,'').replace(/\s+/g,' ');
  const time = v => v ? String(v).slice(0,5) : 'موعد غير محدد';
  const routeMatch = id => { if (id) location.hash = `#match/${id}`; };
  const sideName = (m, side) => m[side] || { name: m[`${side}_placeholder`] || 'لم يتحدد بعد', logo_url: '' };

  function parseRoute() {
    const team = location.hash.match(/^#\/?team\/([0-9a-f-]{36})(?:\/|$)/i);
    if (team) return { type:'team', id:team[1] };
    const tour = location.hash.match(/^#\/?tournament\/([^/]+)(?:\/|$)/i);
    if (tour) return { type:'tournament', slug:decodeURIComponent(tour[1]) };
    return null;
  }

  function isNonKnockout(label = '') {
    const s = norm(label);
    return s.includes('دوري المجموعات') || s.includes('مرحله المجموعات') || s.includes('مرحله الضمان') || s === 'المجموعات';
  }

  function isKnockout(m) {
    const label = m.stage || m.round_name || '';
    if (!label || isNonKnockout(label)) return false;
    const s = norm(label);
    return ['نهائي','ربع','نصف','دور 16','دور الـ16','ثمن','الدور الاول','الدور الثاني','الفاصله','قرعه الثلاثه','المركز الثالث'].some(k => s.includes(norm(k)));
  }

  function stageRank(label = '') {
    const s = norm(label);
    if (s.includes('دور 16') || s.includes('دور الـ16') || s.includes('ثمن')) return 10;
    if (s.includes('الدور الاول')) return 11;
    if (s.includes('ربع')) return 20;
    if (s.includes('الدور الثاني')) return 21;
    if (s.includes('قرعه الثلاثه')) return 28;
    if (s.includes('نصف')) return 30;
    if (s.includes('المركز الثالث')) return 34;
    if (s.includes('الفاصله')) return 35;
    if (s.includes('النهائي')) return 40;
    return 25;
  }

  function stageLabel(m) { return m.stage || m.round_name || 'مرحلة إقصائية'; }

  function winnerFromNote(m) {
    const note = norm(m.qualifier_note || '');
    if (!note) return null;
    const a = m.team_a?.name || '';
    const b = m.team_b?.name || '';
    for (const [id, name] of [[m.team_a_id,a],[m.team_b_id,b]]) {
      if (!id || !name) continue;
      const n = norm(name);
      if (note.includes(`فاز ${n}`) || note.includes(`فوز ${n}`) || note.includes(`تاهل ${n}`)) return id;
    }
    return null;
  }

  function winnerId(m) {
    if (m.status !== 'انتهت') return null;
    const pa = m.home_penalty_score;
    const pb = m.away_penalty_score;
    if (pa != null && pb != null && Number(pa) !== Number(pb)) return Number(pa) > Number(pb) ? m.team_a_id : m.team_b_id;
    const a = Number(m.score_a);
    const b = Number(m.score_b);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a > b ? m.team_a_id : m.team_b_id;
    return winnerFromNote(m);
  }

  function penaltyLine(m) {
    if (m.home_penalty_score != null && m.away_penalty_score != null) return `ركلات الترجيح: ${m.home_penalty_score} — ${m.away_penalty_score}`;
    const note = m.qualifier_note || '';
    if (/ركلات الترجيح/.test(note)) {
      const short = note.match(/ركلات الترجيح[^.،\n]{0,80}/)?.[0];
      if (short) return short;
    }
    return '';
  }

  function statusText(m) {
    if (m.status === 'مباشر') return `🔴 LIVE${m.minute != null ? ` • ${m.minute}′` : ''}`;
    if (m.status === 'مؤجلة') return '⏸ مؤجلة';
    if (m.status === 'ملغاة') return 'ملغاة';
    if (m.status === 'قادمة') return '⏳ قادمة';
    return 'انتهت';
  }

  function teamStageState(m, teamId) {
    if (m.status === 'مباشر') return statusText(m);
    if (m.status === 'مؤجلة') return '⏸ مؤجلة';
    if (m.status === 'ملغاة') return 'ملغاة';
    if (m.status === 'قادمة') return '⏳ قادمة';
    const w = winnerId(m);
    if (!w) return 'انتهت';
    if (norm(stageLabel(m)).includes('النهائي') && w === teamId) return '🏆 بطل';
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
    const final = norm(stageLabel(m)).includes('النهائي');
    return `<article class="rtc-match ${final ? 'is-final' : ''}" ${m.id ? `data-rtc-match="${esc(m.id)}" tabindex="0"` : ''}>
      <div class="rtc-match-head"><span>${esc(stageLabel(m))}</span><b>${esc(statusText(m))}</b></div>
      <div class="rtc-team-row ${win && win === m.team_a_id ? 'is-winner' : ''}">${logo(a)}<span>${esc(a.name)}</span><strong>${m.status === 'قادمة' ? '' : (m.score_a ?? '')}</strong></div>
      <div class="rtc-team-row ${win && win === m.team_b_id ? 'is-winner' : ''}">${logo(b)}<span>${esc(b.name)}</span><strong>${m.status === 'قادمة' ? '' : (m.score_b ?? '')}</strong></div>
      ${penalties ? `<div class="rtc-penalties">${esc(penalties)}</div>` : ''}
      <div class="rtc-match-foot"><span>${m.match_date ? esc(m.match_date) : 'موعد غير محدد'}${m.match_time ? ` • ${esc(time(m.match_time))}` : ''}</span>${m.id ? '<span>تفاصيل المباراة ←</span>' : ''}</div>
    </article>`;
  }

  async function fetchTeamRoad(teamId, force = false) {
    if (!force && teamCache.has(teamId)) return teamCache.get(teamId);
    const { data: team, error: teamError } = await db.from('teams').select('id,name,logo_url,tournament_id,tournament:tournaments(id,name,short_name,slug,division,season)').eq('id',teamId).single();
    if (teamError) throw teamError;
    const { data: matches, error } = await db.from('matches').select(`id,tournament_id,team_a_id,team_b_id,team_a_placeholder,team_b_placeholder,match_date,match_time,stage,round_name,status,score_a,score_b,minute,display_order,qualifier_note,home_penalty_score,away_penalty_score,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)`).eq('tournament_id',team.tournament_id).or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`).order('display_order').order('match_date');
    if (error) throw error;
    const result = { team, matches: matches || [] };
    teamCache.set(teamId,result);
    return result;
  }

  async function fetchTournamentBracket(slug, force = false) {
    if (!force && tournamentCache.has(slug)) return tournamentCache.get(slug);
    const { data: tournament, error: tError } = await db.from('tournaments').select('id,name,short_name,slug,division,season,status,accent_color').eq('slug',slug).single();
    if (tError) throw tError;
    const { data: matches, error } = await db.from('matches').select(`id,tournament_id,team_a_id,team_b_id,team_a_placeholder,team_b_placeholder,match_date,match_time,stage,round_name,status,score_a,score_b,minute,display_order,qualifier_note,home_penalty_score,away_penalty_score,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)`).eq('tournament_id',tournament.id).order('display_order').order('match_date');
    if (error) throw error;
    const result = { tournament, matches: matches || [] };
    tournamentCache.set(slug,result);
    return result;
  }

  function roadMarkup(data) {
    const ko = data.matches.filter(isKnockout).sort((a,b) => stageRank(stageLabel(a))-stageRank(stageLabel(b)) || (a.display_order||0)-(b.display_order||0));
    if (!ko.length) return `<section class="rtc-shell"><div class="rtc-title"><span>ROAD TO THE CUP</span><h2>طريق ${esc(data.team.name)} إلى الكأس</h2></div><div class="rtc-empty">لم يبدأ طريق الأدوار الإقصائية لهذا الفريق بعد.</div></section>`;
    const visible = [];
    for (const m of ko) {
      visible.push(m);
      if (m.status === 'انتهت' && winnerId(m) && winnerId(m) !== data.team.id) break;
    }
    const champion = visible.some(m => norm(stageLabel(m)).includes('النهائي') && winnerId(m) === data.team.id);
    return `<section class="rtc-shell rtc-road-shell">${champion ? `<div class="rtc-champion">🏆 بطل ${esc(data.team.tournament?.short_name || data.team.tournament?.name || 'كأس أغشوركيت')}</div>` : ''}<div class="rtc-title"><span>ROAD TO THE CUP</span><h2>طريق ${esc(data.team.name)} إلى الكأس</h2></div><div class="rtc-road">${visible.map((m,i) => `<div class="rtc-road-step"><div class="rtc-stage-badge">${esc(stageLabel(m))}<strong>${esc(teamStageState(m,data.team.id))}</strong></div>${matchCard(m)}${i < visible.length-1 ? '<div class="rtc-arrow">↓</div>' : ''}</div>`).join('')}</div></section>`;
  }

  function groupStages(matches) {
    const ko = matches.filter(isKnockout);
    const map = new Map();
    ko.forEach(m => { const label = stageLabel(m); if (!map.has(label)) map.set(label,[]); map.get(label).push(m); });
    return [...map.entries()].sort((a,b) => stageRank(a[0])-stageRank(b[0]) || Math.min(...a[1].map(x=>x.display_order||999))-Math.min(...b[1].map(x=>x.display_order||999)));
  }

  function championFrom(matches) {
    const finals = matches.filter(m => norm(stageLabel(m)).includes('النهائي') && m.status === 'انتهت');
    const final = finals.sort((a,b)=>(b.display_order||0)-(a.display_order||0))[0];
    if (!final) return null;
    const id = winnerId(final);
    if (!id) return null;
    return id === final.team_a_id ? final.team_a : final.team_b;
  }

  function bracketMarkup(data) {
    const stages = groupStages(data.matches);
    if (!stages.length) return `<section class="rtc-shell rtc-bracket-shell"><div class="rtc-title"><span>TOURNAMENT BRACKET</span><h2>طريق النهائي</h2></div><div class="rtc-empty">لم تبدأ الأدوار الإقصائية بعد.</div></section>`;
    const champion = championFrom(data.matches);
    return `<section class="rtc-shell rtc-bracket-shell">${champion ? `<div class="rtc-champion">🏆 البطل <span>${logo(champion)}${esc(champion.name)}</span></div>` : ''}<div class="rtc-title"><span>TOURNAMENT BRACKET</span><h2>طريق النهائي</h2><p>${esc(data.tournament.name)}</p></div><div class="rtc-bracket">${stages.map(([label,items]) => `<section class="rtc-round ${norm(label).includes('النهائي') ? 'is-final-round' : ''}"><div class="rtc-round-head"><b>${esc(label)}</b><span>${items.length} ${items.length===1?'مباراة':'مباريات'}</span></div><div class="rtc-round-list">${items.map(m=>matchCard(m)).join('')}</div></section>`).join('')}</div></section>`;
  }

  function ensureTeamRoot() {
    const page = document.querySelector('#appMain .page-shell');
    const hero = page?.querySelector('.profile-hero');
    if (!page || !hero) return null;
    let root = document.getElementById('roadToCupRoot');
    if (!root) {
      root = document.createElement('div'); root.id = 'roadToCupRoot';
      const calendar = document.getElementById('teamMatchCalendarRoot');
      (calendar || hero).insertAdjacentElement('afterend',root);
    }
    return root;
  }

  function ensureTournamentRoot() {
    const page = document.querySelector('#appMain .page-shell');
    const hero = page?.querySelector('.profile-hero');
    if (!page || !hero) return null;
    let root = document.getElementById('tournamentBracketRoot');
    if (!root) {
      root = document.createElement('div'); root.id = 'tournamentBracketRoot';
      const tabs = page.querySelector('.app-tabs');
      (tabs || hero).insertAdjacentElement('afterend',root);
    }
    return root;
  }

  function loading(root, text) { root.innerHTML = `<div class="rtc-loading"><i></i><i></i><i></i><span>${esc(text)}</span></div>`; }
  function errorState(root, message) { root.innerHTML = `<div class="rtc-error">${esc(message)}<button type="button" data-rtc-retry>إعادة المحاولة</button></div>`; }

  function setupRealtime(key, tournamentId, teamId = null) {
    if (channel) db.removeChannel(channel);
    channel = db.channel(`rtc-${key}`).on('postgres_changes',{event:'*',schema:'public',table:'matches',filter:`tournament_id=eq.${tournamentId}`},payload => {
      if (teamId) {
        const b = payload.old || {}, a = payload.new || {};
        if (![b.team_a_id,b.team_b_id,a.team_a_id,a.team_b_id].includes(teamId)) return;
        teamCache.delete(teamId);
      } else tournamentCache.delete(key);
      scheduleMount(true);
    }).subscribe();
  }

  async function mount(force = false) {
    const route = parseRoute();
    if (!route) { document.getElementById('roadToCupRoot')?.remove(); document.getElementById('tournamentBracketRoot')?.remove(); return; }
    try {
      if (route.type === 'team') {
        const root = ensureTeamRoot(); if (!root) return;
        const key = `team:${route.id}`; if (currentKey !== key) { currentKey = key; loading(root,'جاري تحميل طريق الفريق…'); }
        const data = await fetchTeamRoad(route.id,force); if (parseRoute()?.id !== route.id) return;
        root.innerHTML = roadMarkup(data);
        setupRealtime(route.id,data.team.tournament_id,route.id);
      } else {
        const root = ensureTournamentRoot(); if (!root) return;
        const key = `tour:${route.slug}`; if (currentKey !== key) { currentKey = key; loading(root,'جاري تحميل مخطط البطولة…'); }
        const data = await fetchTournamentBracket(route.slug,force); if (parseRoute()?.slug !== route.slug) return;
        root.innerHTML = bracketMarkup(data);
        setupRealtime(route.slug,data.tournament.id,null);
      }
    } catch (e) {
      console.error('Road to Cup load failed',e);
      const root = route.type === 'team' ? ensureTeamRoot() : ensureTournamentRoot();
      if (root) errorState(root, route.type === 'team' ? 'تعذر تحميل طريق الفريق.' : 'تعذر تحميل مخطط البطولة.');
    }
  }

  function scheduleMount(force = false) { clearTimeout(scheduleMount.t); scheduleMount.t = setTimeout(()=>mount(force),80); }

  document.addEventListener('click',e => {
    const card = e.target.closest('[data-rtc-match]'); if (card) { routeMatch(card.dataset.rtcMatch); return; }
    if (e.target.closest('[data-rtc-retry]')) scheduleMount(true);
  });
  document.addEventListener('keydown',e => { const card = e.target.closest?.('[data-rtc-match]'); if (card && (e.key==='Enter'||e.key===' ')) { e.preventDefault(); routeMatch(card.dataset.rtcMatch); } });
  window.addEventListener('hashchange',()=>{ currentKey=''; scheduleMount(false); });
  observer = new MutationObserver(()=>{ const r=parseRoute(); if (!r) return; if (r.type==='team' && !document.getElementById('roadToCupRoot')) scheduleMount(false); if (r.type==='tournament' && !document.getElementById('tournamentBracketRoot')) scheduleMount(false); });
  observer.observe(document.getElementById('appMain'),{childList:true,subtree:true});
  scheduleMount(false);
})();