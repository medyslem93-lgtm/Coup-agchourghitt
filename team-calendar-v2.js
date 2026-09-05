(() => {
  'use strict';

  const config = window.AGCH_CONFIG || {};
  const clientFactory = window.supabase?.createClient;
  if (!clientFactory || !config.supabaseUrl || !config.supabaseKey) return;

  const db = clientFactory(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-team-calendar' } },
  });

  const cache = new Map();
  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const weekdayNames = ['الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد'];
  let activeTeamId = null;
  let selectedMonthKey = null;
  let selectedDate = null;
  let viewMode = 'calendar';
  let realtimeChannel = null;
  let observer = null;

  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const pad = (n) => String(n).padStart(2, '0');
  const monthKey = (date) => date ? String(date).slice(0, 7) : '';
  const localDateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const toDateTime = (match) => {
    if (!match?.match_date) return Number.POSITIVE_INFINITY;
    const t = String(match.match_time || '23:59:59').slice(0, 8);
    const ms = Date.parse(`${match.match_date}T${t}`);
    return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
  };
  const monthLabel = (key) => {
    const [year, month] = key.split('-').map(Number);
    return `${monthNames[month - 1]} ${year}`;
  };
  const timeLabel = (value) => value ? String(value).slice(0, 5) : 'موعد غير محدد';
  const statusClass = (status) => ({
    'مباشر': 'is-live', 'انتهت': 'is-finished', 'مؤجلة': 'is-postponed', 'ملغاة': 'is-cancelled', 'قادمة': 'is-upcoming'
  }[status] || 'is-upcoming');
  const resultText = (match, teamId) => {
    if (match.status !== 'انتهت') return '';
    const homeScore = Number(match.score_a ?? 0);
    const awayScore = Number(match.score_b ?? 0);
    if (homeScore === awayScore) return 'تعادل';
    const teamWon = match.team_a_id === teamId ? homeScore > awayScore : awayScore > homeScore;
    return teamWon ? 'فوز' : 'خسارة';
  };

  function parseTeamIdFromHash() {
    const match = location.hash.match(/^#\/?team\/([0-9a-f-]{36})(?:\/|$)/i);
    return match ? match[1] : null;
  }

  async function fetchTeamCalendar(teamId, force = false) {
    if (!force && cache.has(teamId)) return cache.get(teamId);

    const { data, error } = await db
      .from('matches')
      .select(`
        id, team_a_id, team_b_id, match_date, match_time, venue, category, stage, round_name,
        status, score_a, score_b, minute, tournament_id,
        team_a:teams!matches_team_a_id_fkey(id,name,logo_url),
        team_b:teams!matches_team_b_id_fkey(id,name,logo_url),
        tournament:tournaments!matches_tournament_id_fkey(id,name,short_name,season)
      `)
      .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
      .order('match_date', { ascending: true, nullsFirst: false })
      .order('match_time', { ascending: true, nullsFirst: false });

    if (error) throw error;
    const normalized = (data || []).filter((match) => match.match_date);
    cache.set(teamId, normalized);
    return normalized;
  }

  function getMonths(matches) {
    return [...new Set(matches.map((match) => monthKey(match.match_date)).filter(Boolean))].sort();
  }

  function chooseInitialMonth(matches) {
    const months = getMonths(matches);
    if (!months.length) return null;
    const current = monthKey(localDateKey());
    if (months.includes(current)) return current;
    const future = months.find((m) => m > current);
    return future || months[months.length - 1];
  }

  function getTeamSide(match, teamId) {
    return match.team_a_id === teamId ? 'a' : 'b';
  }

  function getOpponent(match, teamId) {
    return getTeamSide(match, teamId) === 'a' ? match.team_b : match.team_a;
  }

  function scoreLine(match) {
    if (match.status === 'انتهت' || match.status === 'مباشر') {
      return `${Number(match.score_a ?? 0)} — ${Number(match.score_b ?? 0)}`;
    }
    return 'VS';
  }

  function statusLabel(match) {
    if (match.status === 'مباشر') return `🔴 LIVE${match.minute != null ? ` • ${Number(match.minute)}′` : ''}`;
    return match.status || 'قادمة';
  }

  function matchCard(match, teamId, compact = false) {
    const home = match.team_a || { name: 'الفريق الأول', logo_url: '' };
    const away = match.team_b || { name: 'الفريق الثاني', logo_url: '' };
    const today = match.match_date === localDateKey();
    const result = resultText(match, teamId);
    return `<article class="tmc-match-card ${compact ? 'is-compact' : ''} ${today ? 'is-today-match' : ''}">
      <div class="tmc-match-card-head">
        <div><strong>${today ? '⚽ مباراة اليوم' : esc(match.match_date)}</strong>${result ? `<small>${esc(result)}</small>` : ''}</div>
        <span class="tmc-status ${statusClass(match.status)}">${esc(statusLabel(match))}</span>
      </div>
      <div class="tmc-match-teams">
        <div class="tmc-side"><span class="tmc-logo">${home.logo_url ? `<img src="${esc(home.logo_url)}" alt="">` : ''}</span><b>${esc(home.name)}</b></div>
        <strong class="tmc-score">${esc(scoreLine(match))}</strong>
        <div class="tmc-side"><span class="tmc-logo">${away.logo_url ? `<img src="${esc(away.logo_url)}" alt="">` : ''}</span><b>${esc(away.name)}</b></div>
      </div>
      <div class="tmc-meta">
        <span>${esc(timeLabel(match.match_time))}</span>
        ${match.venue ? `<span>${esc(match.venue)}</span>` : ''}
        <span>${esc(match.tournament?.short_name || match.category || '')}${match.stage || match.round_name ? ` · ${esc(match.stage || match.round_name)}` : ''}</span>
      </div>
      <button type="button" class="tmc-details-btn" data-route="match/${esc(match.id)}">تفاصيل المباراة ←</button>
    </article>`;
  }

  function summaryCards(matches, teamId) {
    const now = Date.now();
    const next = matches
      .filter((m) => m.status === 'قادمة' && toDateTime(m) >= now)
      .sort((a, b) => toDateTime(a) - toDateTime(b))[0];
    const previous = matches
      .filter((m) => m.status === 'انتهت')
      .sort((a, b) => toDateTime(b) - toDateTime(a))[0];

    return `<div class="tmc-summary-grid">
      <div class="tmc-summary-card">
        <span class="tmc-summary-kicker">المباراة القادمة</span>
        ${next ? matchCard(next, teamId, true) : '<p class="tmc-empty-inline">لا توجد مباراة قادمة مسجلة.</p>'}
      </div>
      <div class="tmc-summary-card">
        <span class="tmc-summary-kicker">آخر مباراة</span>
        ${previous ? matchCard(previous, teamId, true) : '<p class="tmc-empty-inline">لا توجد مباراة مكتملة مسجلة.</p>'}
      </div>
    </div>`;
  }

  function calendarGrid(matches, key) {
    const [year, month] = key.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const mondayFirstOffset = (firstDay + 6) % 7;
    const byDate = new Map();
    for (const match of matches.filter((m) => monthKey(m.match_date) === key)) {
      const list = byDate.get(match.match_date) || [];
      list.push(match);
      byDate.set(match.match_date, list);
    }

    const cells = [];
    for (let i = 0; i < mondayFirstOffset; i += 1) cells.push('<span class="tmc-day is-empty" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${pad(month)}-${pad(day)}`;
      const dayMatches = byDate.get(date) || [];
      const isToday = date === localDateKey();
      const hasLive = dayMatches.some((m) => m.status === 'مباشر');
      const opponent = dayMatches.length === 1 ? getOpponent(dayMatches[0], activeTeamId) : null;
      cells.push(`<button type="button" class="tmc-day ${dayMatches.length ? 'has-match' : ''} ${isToday ? 'is-today' : ''} ${hasLive ? 'is-live-day' : ''}" ${dayMatches.length ? `data-tmc-date="${date}"` : 'disabled'}>
        <span class="tmc-day-number">${day}</span>
        ${opponent?.logo_url ? `<img class="tmc-day-opponent" src="${esc(opponent.logo_url)}" alt="">` : dayMatches.length ? '<span class="tmc-day-ball">⚽</span>' : ''}
        ${dayMatches.length > 1 ? `<small>${dayMatches.length} مباريات</small>` : ''}
        ${hasLive ? '<b class="tmc-live-badge">LIVE</b>' : ''}
      </button>`);
    }

    return `<div class="tmc-weekdays">${weekdayNames.map((day) => `<span>${day}</span>`).join('')}</div><div class="tmc-calendar-grid">${cells.join('')}</div>`;
  }

  function listView(matches, teamId) {
    if (!matches.length) return '<div class="tmc-empty-state">لا توجد مباريات لهذا الفريق.</div>';
    const groups = new Map();
    for (const match of [...matches].sort((a, b) => toDateTime(a) - toDateTime(b))) {
      const key = monthKey(match.match_date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(match);
    }
    return `<div class="tmc-list-view">${[...groups.entries()].map(([key, items]) => `<section><h4>${esc(monthLabel(key))}</h4>${items.map((m) => matchCard(m, teamId, true)).join('')}</section>`).join('')}</div>`;
  }

  function monthNav(months, current) {
    return `<div class="tmc-month-tabs">${months.map((key) => `<button type="button" class="${key === current ? 'active' : ''}" data-tmc-month="${key}">${esc(monthLabel(key))}</button>`).join('')}</div>`;
  }

  function monthSwitcher(months, current) {
    const index = months.indexOf(current);
    return `<div class="tmc-month-switcher">
      <button type="button" data-tmc-shift="-1" ${index <= 0 ? 'disabled' : ''}>‹</button>
      <strong>${esc(monthLabel(current))}</strong>
      <button type="button" data-tmc-shift="1" ${index >= months.length - 1 ? 'disabled' : ''}>›</button>
    </div>`;
  }

  function renderInto(root, matches, teamId) {
    const months = getMonths(matches);
    if (!selectedMonthKey || !months.includes(selectedMonthKey)) selectedMonthKey = chooseInitialMonth(matches);
    if (!selectedDate || monthKey(selectedDate) !== selectedMonthKey) selectedDate = null;

    const monthMatches = selectedMonthKey ? matches.filter((m) => monthKey(m.match_date) === selectedMonthKey) : [];
    const dayMatches = selectedDate ? matches.filter((m) => m.match_date === selectedDate) : [];

    root.innerHTML = `<section class="tmc-shell">
      <div class="tmc-header">
        <div><span>TEAM MATCH CALENDAR</span><h2>تقويم المباريات</h2></div>
        <div class="tmc-view-toggle"><button type="button" data-tmc-view="calendar" class="${viewMode === 'calendar' ? 'active' : ''}">📅 التقويم</button><button type="button" data-tmc-view="list" class="${viewMode === 'list' ? 'active' : ''}">☰ المباريات</button></div>
      </div>
      ${summaryCards(matches, teamId)}
      ${months.length ? monthNav(months, selectedMonthKey) : ''}
      ${viewMode === 'calendar'
        ? (months.length
          ? `<div class="tmc-calendar-card">${monthSwitcher(months, selectedMonthKey)}${calendarGrid(matches, selectedMonthKey)}<div class="tmc-day-panel">${selectedDate ? dayMatches.map((m) => matchCard(m, teamId)).join('') : (monthMatches.length ? '<p class="tmc-calendar-hint">اضغط على يوم مميز لعرض تفاصيل المباراة.</p>' : '<div class="tmc-empty-state">لا توجد مباريات لهذا الفريق خلال هذا الشهر.</div>')}</div></div>`
          : '<div class="tmc-empty-state">لا توجد مباريات مسجلة لهذا الفريق.</div>')
        : listView(matches, teamId)}
    </section>`;
  }

  function findInsertionPoint() {
    const page = document.querySelector('#appMain .page-shell');
    const hero = page?.querySelector('.profile-hero');
    if (!page || !hero) return null;
    return { page, hero };
  }

  function ensureRoot() {
    const currentId = parseTeamIdFromHash();
    if (!currentId) {
      document.getElementById('teamMatchCalendarRoot')?.remove();
      return null;
    }

    const insertion = findInsertionPoint();
    if (!insertion) return null;
    let root = document.getElementById('teamMatchCalendarRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'teamMatchCalendarRoot';
      insertion.hero.insertAdjacentElement('afterend', root);
    }
    return root;
  }

  async function mountForCurrentTeam(force = false) {
    const teamId = parseTeamIdFromHash();
    if (!teamId) return;
    const root = ensureRoot();
    if (!root) return;

    if (activeTeamId !== teamId) {
      activeTeamId = teamId;
      selectedMonthKey = null;
      selectedDate = null;
      viewMode = 'calendar';
      setupRealtime(teamId);
    }

    root.innerHTML = '<div class="tmc-loading">جاري تحميل تقويم المباريات…</div>';
    try {
      const matches = await fetchTeamCalendar(teamId, force);
      if (teamId !== activeTeamId) return;
      renderInto(root, matches, teamId);
    } catch (error) {
      console.error('Team calendar load failed', error);
      root.innerHTML = '<div class="tmc-empty-state">تعذر تحميل تقويم المباريات الآن.</div>';
    }
  }

  function setupRealtime(teamId) {
    if (realtimeChannel) db.removeChannel(realtimeChannel);
    realtimeChannel = db.channel(`team-calendar-${teamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
        const before = payload.old || {};
        const after = payload.new || {};
        const relevant = [before.team_a_id, before.team_b_id, after.team_a_id, after.team_b_id].includes(teamId);
        if (!relevant) return;
        cache.delete(teamId);
        mountForCurrentTeam(true);
      })
      .subscribe();
  }

  document.addEventListener('click', (event) => {
    const monthBtn = event.target.closest('[data-tmc-month]');
    if (monthBtn) {
      selectedMonthKey = monthBtn.dataset.tmcMonth;
      selectedDate = null;
      const root = document.getElementById('teamMatchCalendarRoot');
      const matches = cache.get(activeTeamId) || [];
      if (root) renderInto(root, matches, activeTeamId);
      return;
    }

    const shiftBtn = event.target.closest('[data-tmc-shift]');
    if (shiftBtn && activeTeamId) {
      const matches = cache.get(activeTeamId) || [];
      const months = getMonths(matches);
      const current = months.indexOf(selectedMonthKey);
      const next = current + Number(shiftBtn.dataset.tmcShift || 0);
      if (next >= 0 && next < months.length) {
        selectedMonthKey = months[next];
        selectedDate = null;
        const root = document.getElementById('teamMatchCalendarRoot');
        if (root) renderInto(root, matches, activeTeamId);
      }
      return;
    }

    const dateBtn = event.target.closest('[data-tmc-date]');
    if (dateBtn && activeTeamId) {
      selectedDate = dateBtn.dataset.tmcDate;
      const root = document.getElementById('teamMatchCalendarRoot');
      const matches = cache.get(activeTeamId) || [];
      if (root) renderInto(root, matches, activeTeamId);
      return;
    }

    const viewBtn = event.target.closest('[data-tmc-view]');
    if (viewBtn && activeTeamId) {
      viewMode = viewBtn.dataset.tmcView;
      const root = document.getElementById('teamMatchCalendarRoot');
      const matches = cache.get(activeTeamId) || [];
      if (root) renderInto(root, matches, activeTeamId);
    }
  });

  function scheduleMount() {
    window.clearTimeout(scheduleMount.timer);
    scheduleMount.timer = window.setTimeout(() => mountForCurrentTeam(false), 50);
  }

  window.addEventListener('hashchange', scheduleMount);
  observer = new MutationObserver(() => {
    if (parseTeamIdFromHash() && !document.getElementById('teamMatchCalendarRoot')) scheduleMount();
  });
  observer.observe(document.getElementById('appMain'), { childList: true, subtree: true });
  scheduleMount();
})();