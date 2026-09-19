(() => {
  'use strict';

  const main = document.getElementById('appMain');
  const searchInput = document.getElementById('globalSearch');
  const searchResults = document.getElementById('searchResults');
  const db = window.AGCH_SUPABASE_CLIENT || window.aghDb;
  if (!main || !searchInput || !searchResults || !db) return;

  const CACHE_MS = 2 * 60 * 1000;
  const data = {
    tournaments: [], teams: [], players: [], matches: [], events: [], standings: [], playerStats: [], news: [],
    loadedAt: 0, loading: null,
  };
  let patchTimer = 0;
  let observerBusy = false;

  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  const stripArabic = (value = '') => String(value)
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[گڨ]/g, 'ك')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const image = (url, alt = '') => `<img src="${esc(url || 'assets/tournament.jpg')}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/tournament.jpg'">`;
  const routeParts = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/').map(decodeURIComponent);
  const teamById = (id) => data.teams.find((x) => x.id === id);
  const tournamentById = (id) => data.tournaments.find((x) => x.id === id);
  const fmtDate = (value) => {
    if (!value) return 'موعد غير محدد';
    try { return new Intl.DateTimeFormat('ar-MR', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00Z`)); }
    catch { return value; }
  };
  const fmtTime = (value) => value ? String(value).slice(0, 5) : '--:--';
  const matchTs = (m) => Date.parse(`${m.match_date || '9999-12-31'}T${fmtTime(m.match_time)}:00Z`) || Number.MAX_SAFE_INTEGER;

  async function load(force = false) {
    if (!force && data.loadedAt && Date.now() - data.loadedAt < CACHE_MS) return data;
    if (data.loading) return data.loading;
    data.loading = (async () => {
      try {
        const requests = [
          ['tournaments', db.from('tournaments').select('*').order('sort_order')],
          ['teams', db.from('teams').select('*').order('name')],
          ['players', db.from('players').select('*').order('name')],
          ['matches', db.from('matches').select('*').order('match_date', { ascending: false, nullsFirst: false })],
          ['events', db.from('match_events').select('*')],
          ['standings', db.from('tournament_standings').select('*')],
          ['playerStats', db.from('player_tournament_stats').select('*')],
          ['news', db.from('news').select('*').order('publish_date', { ascending: false })],
        ];
        const results = await Promise.all(requests.map(async ([key, query]) => [key, await query]));
        results.forEach(([key, result]) => { if (!result.error) data[key] = result.data || []; });
        data.loadedAt = Date.now();
      } catch (error) {
        console.warn('Tournament experience data unavailable', error);
      } finally {
        data.loading = null;
      }
      return data;
    })();
    return data.loading;
  }

  function isFinished(m) { return m.status === 'انتهت'; }
  function isKnockoutStage(value = '') {
    const s = stripArabic(value);
    return ['نهائي', 'نصف', 'ربع', 'ثمن', 'خروج', 'دور 16', 'دور16', 'دور 8', 'دور8', 'final', 'semi', 'quarter', 'knockout'].some((x) => s.includes(stripArabic(x)));
  }

  function groupedStandings(tournamentId) {
    const teams = data.teams.filter((t) => t.tournament_id === tournamentId);
    const hasGroups = teams.some((t) => String(t.group_name || '').trim());
    if (!hasGroups) return null;

    const rows = new Map(teams.map((team) => [team.id, {
      team_id: team.id,
      team_name: team.name,
      logo_url: team.logo_url,
      group_name: String(team.group_name || '').trim(),
      played: 0, won: 0, drawn: 0, lost: 0,
      goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
      yellow_cards: 0, red_cards: 0, fair_play_points: 0,
    }]));

    const groupMatches = data.matches.filter((m) => {
      if (m.tournament_id !== tournamentId || !isFinished(m)) return false;
      const a = rows.get(m.team_a_id); const b = rows.get(m.team_b_id);
      if (!a || !b || !a.group_name || a.group_name !== b.group_name) return false;
      return !isKnockoutStage(`${m.stage || ''} ${m.round_name || ''}`);
    });
    const matchIds = new Set(groupMatches.map((m) => m.id));

    groupMatches.forEach((m) => {
      const a = rows.get(m.team_a_id); const b = rows.get(m.team_b_id);
      const sa = Number(m.score_a) || 0; const sb = Number(m.score_b) || 0;
      a.played += 1; b.played += 1;
      a.goals_for += sa; a.goals_against += sb;
      b.goals_for += sb; b.goals_against += sa;
      if (sa > sb) { a.won += 1; b.lost += 1; a.points += 3; }
      else if (sa < sb) { b.won += 1; a.lost += 1; b.points += 3; }
      else { a.drawn += 1; b.drawn += 1; a.points += 1; b.points += 1; }
    });

    data.events.filter((e) => matchIds.has(e.match_id) && rows.has(e.team_id)).forEach((e) => {
      const row = rows.get(e.team_id);
      if (e.type === 'بطاقة صفراء') row.yellow_cards += 1;
      if (e.type === 'بطاقة حمراء') row.red_cards += 1;
    });

    const groups = new Map();
    rows.forEach((row) => {
      row.goal_difference = row.goals_for - row.goals_against;
      row.fair_play_points = row.yellow_cards + row.red_cards * 3;
      if (!groups.has(row.group_name)) groups.set(row.group_name, []);
      groups.get(row.group_name).push(row);
    });

    groups.forEach((list) => list.sort((a, b) =>
      b.points - a.points ||
      b.goal_difference - a.goal_difference ||
      b.goals_for - a.goals_for ||
      a.fair_play_points - b.fair_play_points ||
      String(a.team_name).localeCompare(String(b.team_name), 'ar')
    ).forEach((row, index) => { row.position = index + 1; }));

    return { groups, matches: groupMatches };
  }

  function standingsMarkup(tournamentId, preview = false) {
    const computed = groupedStandings(tournamentId);
    if (!computed) return '';
    return [...computed.groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'ar')).map(([group, rows]) => {
      const visible = preview ? rows.slice(0, 4) : rows;
      return `<section class="tx-group-table"><div class="tx-group-title"><b>المجموعة ${esc(group)}</b><span>${computed.matches.filter((m) => teamById(m.team_a_id)?.group_name === group).length} مباريات مكتملة</span></div><div class="tx-table-wrap"><table><thead><tr><th>#</th><th>الفريق</th><th>ل</th><th>ف</th><th>ت</th><th>خ</th><th>له</th><th>عليه</th><th>±</th><th>ن</th>${preview ? '' : '<th>🟨</th><th>🟥</th><th>نظيف</th>'}</tr></thead><tbody>${visible.map((r) => `<tr data-route="team/${esc(r.team_id)}"><td><span class="tx-rank ${r.position <= 2 ? 'is-top' : ''}">${r.position}</span></td><td><span class="tx-team-cell">${image(r.logo_url, r.team_name)}<b>${esc(r.team_name)}</b></span></td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.goals_for}</td><td>${r.goals_against}</td><td>${r.goal_difference > 0 ? '+' : ''}${r.goal_difference}</td><td><strong>${r.points}</strong></td>${preview ? '' : `<td>${r.yellow_cards}</td><td>${r.red_cards}</td><td>${r.fair_play_points}</td>`}</tr>`).join('')}</tbody></table></div></section>`;
    }).join('');
  }

  function topScorer(tournamentId) {
    const fromView = data.playerStats.filter((r) => r.tournament_id === tournamentId).sort((a, b) => Number(b.goals || 0) - Number(a.goals || 0))[0];
    if (fromView && Number(fromView.goals || 0) > 0) return fromView;
    const ids = new Set(data.matches.filter((m) => m.tournament_id === tournamentId).map((m) => m.id));
    const goals = new Map();
    data.events.filter((e) => ids.has(e.match_id) && ['هدف', 'ركلة جزاء مسجلة'].includes(e.type)).forEach((e) => {
      const key = e.player_id || `name:${e.player_name || 'غير محدد'}`;
      const player = data.players.find((p) => p.id === e.player_id);
      const current = goals.get(key) || { player_id: e.player_id || '', player_name: player?.name || e.player_name || 'غير محدد', team_name: teamById(e.team_id)?.name || '', goals: 0 };
      current.goals += 1; goals.set(key, current);
    });
    return [...goals.values()].sort((a, b) => b.goals - a.goals)[0] || null;
  }

  function matchMini(m, label) {
    if (!m) return `<div class="tx-quick-card is-empty"><span>${esc(label)}</span><b>لا توجد مباراة</b><small>سيظهر الموعد عند إضافته</small></div>`;
    const a = teamById(m.team_a_id) || {}; const b = teamById(m.team_b_id) || {};
    const score = isFinished(m) ? `${Number(m.score_a || 0)} – ${Number(m.score_b || 0)}` : fmtTime(m.match_time);
    return `<button class="tx-quick-card" type="button" data-route="match/${esc(m.id)}"><span>${esc(label)}</span><div class="tx-quick-match"><i>${image(a.logo_url, a.name)}</i><b>${esc(a.name || '—')}</b><strong dir="ltr">${esc(score)}</strong><b>${esc(b.name || '—')}</b><i>${image(b.logo_url, b.name)}</i></div><small>${esc(fmtDate(m.match_date))} · ${esc(m.stage || m.round_name || 'المباراة')}</small></button>`;
  }

  function enhanceTournament() {
    const [root, slug, tab = 'overview'] = routeParts();
    if (root !== 'tournament' || !slug) return;
    const tournament = data.tournaments.find((t) => t.slug === slug);
    if (!tournament) return;
    const hero = main.querySelector('.profile-hero');
    const tabs = main.querySelector('.app-tabs');
    if (!hero || !tabs) return;
    main.classList.add('tx-enhanced');

    if (!main.querySelector('.tx-competition-summary')) {
      const matches = data.matches.filter((m) => m.tournament_id === tournament.id);
      const finished = matches.filter(isFinished);
      const live = matches.filter((m) => m.status === 'مباشر' || (m.stream_enabled && m.stream_status === 'live'));
      const next = matches.filter((m) => !isFinished(m) && m.status !== 'ملغاة').sort((a, b) => matchTs(a) - matchTs(b))[0];
      const goals = finished.reduce((sum, m) => sum + (Number(m.score_a) || 0) + (Number(m.score_b) || 0), 0);
      const summary = document.createElement('section');
      summary.className = 'tx-competition-summary';
      summary.innerHTML = `<div><span>الموسم</span><b>${esc(tournament.season || '2026')}</b></div><div><span>الفرق</span><b>${data.teams.filter((t) => t.tournament_id === tournament.id).length}</b></div><div><span>المباريات</span><b>${matches.length}</b></div><div><span>الأهداف</span><b>${goals}</b></div><div><span>الحالة</span><b>${live.length ? '● مباشر' : esc(tournament.status || '—')}</b></div>${next ? `<button type="button" data-route="match/${esc(next.id)}"><span>القادمة</span><b>${esc(fmtDate(next.match_date))} · ${esc(fmtTime(next.match_time))}</b></button>` : ''}`;
      hero.insertAdjacentElement('afterend', summary);
    }

    if (tab === 'standings') {
      const corrected = standingsMarkup(tournament.id, false);
      const card = main.querySelector('.app-tabs + .standings-card, .standings-card');
      if (corrected && card && !card.dataset.txCorrected) {
        card.dataset.txCorrected = '1';
        card.innerHTML = `<div class="tx-section-head"><div><span>OFFICIAL TABLE</span><h2>الترتيب الصحيح</h2></div><small>يُحتسب من مباريات دور المجموعات فقط، ولا تدخل مباريات نصف النهائي والنهائي في نقاط المجموعات.</small></div>${corrected}<div class="tx-standings-note">معايير الفصل المعروضة: النقاط، فارق الأهداف، الأهداف المسجلة، ثم نقاط اللعب النظيف.</div>`;
      }
      return;
    }

    if (tab !== 'overview' || main.querySelector('.tx-overview')) return;
    const matches = data.matches.filter((m) => m.tournament_id === tournament.id);
    const finished = matches.filter(isFinished).sort((a, b) => matchTs(b) - matchTs(a));
    const next = matches.filter((m) => !isFinished(m) && m.status !== 'ملغاة').sort((a, b) => matchTs(a) - matchTs(b))[0];
    const scorer = topScorer(tournament.id);
    const groupPreview = standingsMarkup(tournament.id, true);
    const stages = [...new Set(matches.map((m) => m.stage || m.round_name).filter(Boolean))];
    const stageMarkup = stages.length ? `<div class="tx-stage-track">${stages.map((stage) => {
      const stageMatches = matches.filter((m) => (m.stage || m.round_name) === stage);
      const done = stageMatches.filter(isFinished).length;
      return `<div class="${done === stageMatches.length && stageMatches.length ? 'is-done' : ''}"><span>${done}/${stageMatches.length}</span><b>${esc(stage)}</b></div>`;
    }).join('')}</div>` : '';

    const overview = document.createElement('section');
    overview.className = 'tx-overview';
    overview.innerHTML = `<div class="tx-section-head"><div><span>COMPETITION CENTER</span><h2>كل تفاصيل ${esc(tournament.short_name || tournament.name)}</h2></div><small>المباريات، المراحل، الترتيب، الفرق، الهدافون والإحصائيات في صفحة واحدة.</small></div><div class="tx-quick-grid">${matchMini(next, 'المباراة القادمة')}${matchMini(finished[0], 'آخر نتيجة')}<button class="tx-quick-card tx-scorer" type="button" data-route="tournament/${esc(slug)}/scorers"><span>هداف البطولة</span><b>${esc(scorer?.player_name || 'لا توجد بيانات')}</b><strong>${Number(scorer?.goals || 0)} هدف</strong><small>${esc(scorer?.team_name || 'يُحدّث تلقائيًا')}</small></button></div>${stageMarkup}${groupPreview ? `<div class="tx-overview-table"><div class="tx-subhead"><b>ترتيب المجموعات</b><button type="button" data-route="tournament/${esc(slug)}/standings">الترتيب الكامل</button></div>${groupPreview}</div>` : ''}`;
    tabs.insertAdjacentElement('afterend', overview);
  }

  function tokenScore(haystack, query) {
    const h = stripArabic(haystack); const q = stripArabic(query);
    if (!q || !h) return 0;
    if (h === q) return 100;
    if (h.startsWith(q)) return 80;
    const words = h.split(' ');
    if (words.some((w) => w.startsWith(q))) return 70;
    if (h.includes(q)) return 60;
    const tokens = q.split(' ').filter(Boolean);
    if (tokens.length > 1 && tokens.every((t) => h.includes(t))) return 55;
    return 0;
  }

  function tournamentSearchText(t) {
    const aliases = t.slug === 'seniors-2026' ? 'الكبار كبار senior seniors بطوله الكبار البطولة الرئيسية' : t.slug === 'middle-2026' ? 'الوسط وسط middle بطوله الوسط' : t.slug === 'juniors-2026' ? 'الصغار صغار junior juniors بطوله الصغار' : t.slug === 'retired-2026' ? 'المعتزلين معتزلين اساطير legends' : '';
    return `${t.name || ''} ${t.short_name || ''} ${t.description || ''} ${t.slug || ''} ${aliases}`;
  }

  function renderSmartSearch(query) {
    const q = String(query || '').trim();
    if (!q) {
      const tournaments = data.tournaments.slice(0, 4);
      searchResults.innerHTML = `<div class="tx-search-empty"><div class="tx-search-title"><b>انتقل مباشرة إلى بطولة</b><small>اختر الفئة أو ابدأ الكتابة</small></div><div class="tx-search-tournaments">${tournaments.map((t) => `<button type="button" data-route="tournament/${esc(t.slug)}/overview">${image(t.logo_url, t.short_name || t.name)}<span><b>${esc(t.short_name || t.name)}</b><small>${esc(t.season || '')} · ${esc(t.status || '')}</small></span></button>`).join('')}</div><div class="tx-search-shortcuts"><button type="button" data-route="matches">كل المباريات</button><button type="button" data-route="teams">كل الفرق</button><button type="button" data-route="stats">الإحصائيات</button></div></div>`;
      return;
    }

    const results = [];
    data.tournaments.forEach((t) => {
      const score = tokenScore(tournamentSearchText(t), q); if (score) results.push({ score: score + 8, type: 'بطولة', route: `tournament/${t.slug}/overview`, title: t.short_name || t.name, meta: `${t.season || ''} · ${t.status || ''}`, image: t.logo_url });
    });
    data.teams.forEach((t) => {
      const tournament = tournamentById(t.tournament_id);
      const score = tokenScore(`${t.name || ''} ${t.category || ''} ${t.group_name || ''} ${tournament?.short_name || ''}`, q);
      if (score) results.push({ score: score + 6, type: 'فريق', route: `team/${t.id}`, title: t.name, meta: `${tournament?.short_name || t.category || ''}${t.group_name ? ` · المجموعة ${t.group_name}` : ''}`, image: t.logo_url });
    });
    data.players.forEach((p) => {
      const team = teamById(p.team_id); const tournament = tournamentById(team?.tournament_id);
      const score = tokenScore(`${p.name || ''} ${p.position || ''} ${p.number || ''} ${team?.name || ''} ${tournament?.short_name || ''}`, q);
      if (score) results.push({ score: score + 4, type: 'لاعب', route: `player/${p.id}`, title: p.name, meta: `${team?.name || ''}${p.position ? ` · ${p.position}` : ''}`, image: p.photo_url || team?.logo_url });
    });
    data.matches.forEach((m) => {
      const a = teamById(m.team_a_id) || {}; const b = teamById(m.team_b_id) || {}; const tournament = tournamentById(m.tournament_id);
      const score = tokenScore(`${a.name || ''} ${b.name || ''} ${tournament?.short_name || ''} ${m.stage || ''} ${m.round_name || ''} ${m.match_date || ''}`, q);
      if (score) results.push({ score: score + 2, type: 'مباراة', route: `match/${m.id}`, title: `${a.name || 'فريق'} × ${b.name || 'فريق'}`, meta: `${tournament?.short_name || ''} · ${fmtDate(m.match_date)} · ${m.status || ''}`, image: a.logo_url });
    });
    data.news.forEach((n) => {
      const score = tokenScore(`${n.title || ''} ${n.description || ''} ${n.content || ''} ${n.type || ''}`, q);
      if (score) results.push({ score, type: 'خبر', route: `news/${n.id}`, title: n.title, meta: fmtDate(n.publish_date), image: n.image_url });
    });

    const sorted = results.sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title), 'ar')).slice(0, 22);
    if (!sorted.length) {
      searchResults.innerHTML = `<div class="tx-search-none"><b>لا توجد نتيجة مطابقة لـ «${esc(q)}»</b><small>جرّب اسم البطولة مثل «الكبار»، أو اسم الفريق أو اللاعب.</small><button type="button" data-route="tournaments">استعراض البطولات</button></div>`;
      return;
    }
    const order = ['بطولة', 'فريق', 'لاعب', 'مباراة', 'خبر'];
    const grouped = order.map((type) => [type, sorted.filter((r) => r.type === type)]).filter(([, rows]) => rows.length);
    searchResults.innerHTML = `<div class="tx-search-query">نتائج البحث عن <b>${esc(q)}</b></div>${grouped.map(([type, rows]) => `<section class="tx-search-group"><div class="tx-search-group-head"><b>${esc(type === 'بطولة' ? 'البطولات' : type === 'فريق' ? 'الفرق' : type === 'لاعب' ? 'اللاعبون' : type === 'مباراة' ? 'المباريات' : 'الأخبار')}</b><span>${rows.length}</span></div>${rows.slice(0, 6).map((r) => `<button class="tx-search-result" type="button" data-route="${esc(r.route)}"><i>${image(r.image, r.title)}</i><span><b>${esc(r.title)}</b><small>${esc(r.meta || '')}</small></span><em>${esc(r.type)}</em></button>`).join('')}</section>`).join('')}`;
  }

  async function patchPage() {
    if (observerBusy) return;
    observerBusy = true;
    try {
      await load();
      enhanceTournament();
      searchInput.placeholder = 'ابحث عن بطولة، فريق، لاعب، مباراة أو خبر…';
      searchInput.setAttribute('autocomplete', 'off');
      if (!document.getElementById('searchLayer').hidden) renderSmartSearch(searchInput.value);
    } finally { observerBusy = false; }
  }

  function schedulePatch() {
    window.clearTimeout(patchTimer);
    patchTimer = window.setTimeout(patchPage, 90);
  }

  searchInput.addEventListener('input', () => {
    window.setTimeout(() => renderSmartSearch(searchInput.value), 0);
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="open-search"]')) window.setTimeout(() => renderSmartSearch(''), 20);
  });
  window.addEventListener('hashchange', schedulePatch);
  window.addEventListener('online', () => load(true).then(schedulePatch));
  const observer = new MutationObserver(() => schedulePatch());
  observer.observe(main, { childList: true, subtree: true });
  window.addEventListener('load', schedulePatch);
  schedulePatch();
})();
