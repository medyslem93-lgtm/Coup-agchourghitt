(() => {
  "use strict";

  const config = window.AGCH_CONFIG || {};
  const main = document.getElementById("appMain");
  const searchLayer = document.getElementById("searchLayer");
  const searchInput = document.getElementById("globalSearch");
  const searchResults = document.getElementById("searchResults");
  const CACHE_KEY = "aghchorguit-premium-v1";
  const FAVORITES_KEY = "aghchorguit-favorite-teams";
  const SELECTED_TOURNAMENT_KEY = "aghchorguit-selected-tournament";
  const GOAL_TYPES = ["هدف", "ركلة جزاء مسجلة"];
  const FINISHED = "انتهت";

  const state = {
    tournaments: [],
    teams: [],
    players: [],
    matches: [],
    events: [],
    lineups: [],
    lineupPlayers: [],
    matchStats: [],
    standings: [],
    playerStats: [],
    news: [],
    awards: [],
    settings: {},
    selectedTournamentId: localStorage.getItem(SELECTED_TOURNAMENT_KEY) || "",
    matchStatusFilter: "الكل",
    loading: true,
    refreshing: false,
    error: null,
    channel: null,
  };

  const db = window.AGCH_PUBLIC_SB || window.supabase?.createClient?.(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true },
    global: { headers: { "x-client-info": "aghchorguit-premium-web" } },
  });
  if (db) window.AGCH_PUBLIC_SB = db;

  const ICONS = {
    arrow: '<path d="M19 12H5m6-6-6 6 6 6"/>',
    back: '<path d="m9 6 6 6-6 6"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="m12 7 3 2.2-1.1 3.5h-3.8L9 9.2 12 7ZM10.1 12.7l-3 2.1M13.9 12.7l3 2.1M9 9.2 6.7 7.4M15 9.2l2.3-1.8M9.5 17.8l.6-5.1M14.5 17.8l-.6-5.1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0ZM8 6H4v1a5 5 0 0 0 5 5M16 6h4v1a5 5 0 0 1-5 5M12 12v5M8 21h8M9 17h6"/>',
    users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20V7M2 20h21"/>',
    news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h6M7 12h10M7 16h10"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
    heart: '<path d="M20.8 5.7c-2.1-2.2-5.7-1.8-7.5.6L12 8l-1.3-1.7C8.9 3.9 5.3 3.5 3.2 5.7.9 8.2 1.4 12 4 14.3L12 21l8-6.7c2.6-2.3 3.1-6.1.8-8.6Z"/>',
    heartFill: '<path fill="currentColor" stroke="currentColor" d="M20.8 5.7c-2.1-2.2-5.7-1.8-7.5.6L12 8l-1.3-1.7C8.9 3.9 5.3 3.5 3.2 5.7.9 8.2 1.4 12 4 14.3L12 21l8-6.7c2.6-2.3 3.1-6.1.8-8.6Z"/>',
    assist: '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="7" r="2.5"/><path d="M9 12c4.5 0 3.5-5 6.5-5M15 17h5M17.5 14.5V19.5"/>',
    card: '<rect x="7" y="3" width="10" height="18" rx="2"/>',
    penalty: '<path d="M4 20V4h16v16M8 4v4a4 4 0 0 0 8 0V4"/><circle cx="12" cy="15" r="1"/>',
    swap: '<path d="m7 7 3-3 3 3M10 4v12M17 17l-3 3-3-3M14 20V8"/>',
    whistle: '<path d="M4 12h7a5 5 0 1 1-5 5v-2M11 12l4-5 3 3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5M6.5 7.5A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.5 4.5"/>',
    shield: '<path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z"/>',
    home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  };

  function icon(name, className = "") {
    return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.ball}</svg>`;
  }

  function escapeHtml(value = "") {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function imageUrl(value, fallback = "assets/tournament.jpg") {
    if (!value) return fallback;
    const raw = String(value).trim();
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    return raw.replace(/^\.\//, "").replace(/^\.\.\//, "");
  }

  function image(value, alt, options = {}) {
    const src = escapeHtml(imageUrl(value, options.fallback));
    const loading = options.eager ? "eager" : "lazy";
    const priority = options.eager ? ' fetchpriority="high"' : "";
    return `<img src="${src}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async"${priority} onerror="this.onerror=null;this.src='assets/tournament.jpg'">`;
  }

  function initials(name = "") {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("") || "؟";
  }

  function avatar(player, className = "player-avatar") {
    if (player?.photo_url) return `<span class="${className}">${image(player.photo_url, player.name)}</span>`;
    return `<span class="${className}">${escapeHtml(initials(player?.name))}</span>`;
  }

  const teamMap = () => new Map(state.teams.map((team) => [team.id, team]));
  const playerMap = () => new Map(state.players.map((player) => [player.id, player]));
  const tournamentMap = () => new Map(state.tournaments.map((tournament) => [tournament.id, tournament]));
  const getTeam = (id) => teamMap().get(id);
  const getPlayer = (id) => playerMap().get(id);
  const getTournament = (id) => tournamentMap().get(id);
  const getMatch = (id) => state.matches.find((match) => match.id === id);
  const getEvents = (matchId) => state.events.filter((event) => event.match_id === matchId);

  function currentTournament() {
    return getTournament(state.selectedTournamentId) || state.tournaments[0] || null;
  }

  function selectTournament(id, shouldPersist = true) {
    if (!getTournament(id)) return;
    state.selectedTournamentId = id;
    if (shouldPersist) localStorage.setItem(SELECTED_TOURNAMENT_KEY, id);
    document.documentElement.style.setProperty("--accent", getTournament(id)?.accent_color || "#c7ff37");
  }

  function matchDateTime(match) {
    if (!match?.match_date) return Number.MAX_SAFE_INTEGER;
    const time = String(match.match_time || "23:59").slice(0, 5);
    const parsed = Date.parse(`${match.match_date}T${time}:00Z`);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  }

  function formatDate(value, short = false) {
    if (!value) return "موعد غير محدد";
    try {
      return new Intl.DateTimeFormat("ar-MR", short
        ? { day: "numeric", month: "short" }
        : { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        .format(new Date(`${value}T12:00:00Z`));
    } catch { return value; }
  }

  function formatTime(value) {
    return value ? String(value).slice(0, 5) : "--:--";
  }

  function statusClass(status) {
    if (status === "مباشر") return "live";
    if (status === FINISHED) return "finished";
    return "upcoming";
  }

  function score(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function matchesForTournament(tournamentId) {
    return state.matches.filter((match) => match.tournament_id === tournamentId);
  }

  function eventsForTournament(tournamentId) {
    const ids = new Set(matchesForTournament(tournamentId).map((match) => match.id));
    return state.events.filter((event) => ids.has(event.match_id));
  }

  function tournamentTeams(tournamentId) {
    return state.teams.filter((team) => team.tournament_id === tournamentId);
  }

  function playerEventName(event) {
    return getPlayer(event.player_id)?.name || event.player_name || "لاعب غير محدد";
  }

  function assistEventName(event) {
    return getPlayer(event.assist_player_id)?.name || event.assist_name || "";
  }

  function emptyState(title, message = "ستظهر البيانات هنا فور إضافتها من لوحة الإدارة.", iconName = "ball") {
    return `<div class="empty-state"><span class="empty-state-icon">${icon(iconName)}</span><b>${escapeHtml(title)}</b><p>${escapeHtml(message)}</p></div>`;
  }

  function sectionHeading(kicker, title, actionLabel = "", route = "") {
    return `<div class="section-heading"><div><span class="eyebrow">${escapeHtml(kicker)}</span><h2>${escapeHtml(title)}</h2></div>${actionLabel ? `<button class="text-button" type="button" data-route="${escapeHtml(route)}">${escapeHtml(actionLabel)} ${icon("arrow", "button-icon")}</button>` : ""}</div>`;
  }

  function toast(message, type = "success") {
    const item = document.createElement("div");
    item.className = `toast ${type === "error" ? "error" : ""}`;
    item.textContent = message;
    document.getElementById("toastStack").appendChild(item);
    window.setTimeout(() => item.remove(), 3200);
  }

  function getFavorites() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
  }

  function isFavorite(teamId) { return getFavorites().includes(teamId); }

  function toggleFavorite(teamId) {
    const values = new Set(getFavorites());
    const active = values.has(teamId);
    if (active) values.delete(teamId); else values.add(teamId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...values]));
    toast(active ? "تمت إزالة الفريق من المفضلة" : "تمت إضافة الفريق إلى المفضلة");
    renderRoute();
  }

  function pageHeading(kicker, title, description, action = "") {
    return `<div class="page-heading"><div><span class="eyebrow">${escapeHtml(kicker)}</span><h1>${escapeHtml(title)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div>${action}</div>`;
  }

  function tournamentStrip(activeId = state.selectedTournamentId) {
    return `<div class="tournament-strip" aria-label="اختيار البطولة">${state.tournaments.map((tournament) => `
      <button type="button" class="tournament-pill ${tournament.id === activeId ? "active" : ""}" style="--t-accent:${escapeHtml(tournament.accent_color)}" data-select-tournament="${tournament.id}">
        ${image(tournament.logo_url, "")}
        <span><b>${escapeHtml(tournament.short_name)}</b><small>${escapeHtml(tournament.season)}</small></span>
      </button>`).join("")}</div>`;
  }

  function teamForSide(match, side) {
    const id = side === "a" ? match.team_a_id : match.team_b_id;
    const placeholder = side === "a" ? match.team_a_placeholder : match.team_b_placeholder;
    return getTeam(id) || { id: "", name: placeholder || "يتحدد لاحقًا", logo_url: "assets/logo-placeholder.svg" };
  }

  function scoreMarkup(match, compact = false) {
    if (match.status === FINISHED || match.status === "مباشر") {
      return `<strong>${score(match.score_a)} <span>–</span> ${score(match.score_b)}</strong><small>${escapeHtml(match.status === "مباشر" ? `${match.minute || 0}′` : "النتيجة النهائية")}</small>`;
    }
    return `<time>${formatTime(match.match_time)}</time><small>${escapeHtml(compact ? formatDate(match.match_date, true) : "موعد المباراة")}</small>`;
  }

  function heroMatch(match, tournament) {
    if (!match) return emptyState("لا توجد مباراة للعرض", "لم يحدد جدول هذه البطولة بعد.", "calendar");
    const home = teamForSide(match, "a");
    const away = teamForSide(match, "b");
    return `<article class="hero-match-card" style="--t-accent:${escapeHtml(tournament?.accent_color || "#c7ff37")}" data-route="match/${match.id}">
      <div class="hero-match-top"><span class="competition-label">${escapeHtml(tournament?.short_name || match.category)} · ${escapeHtml(match.stage || match.round_name || "المسابقة")}</span><span class="status-pill ${statusClass(match.status)}">${match.status === "مباشر" ? '<span class="live-dot"></span>' : ""}${escapeHtml(match.status)}</span></div>
      <div class="hero-teams">
        <div class="hero-team"><span class="team-logo">${image(home.logo_url, home.name, { eager: true })}</span><b>${escapeHtml(home.name)}</b></div>
        <div class="score-block">${scoreMarkup(match)}</div>
        <div class="hero-team"><span class="team-logo">${image(away.logo_url, away.name, { eager: true })}</span><b>${escapeHtml(away.name)}</b></div>
      </div>
      <div class="hero-match-meta"><span>${icon("calendar")} ${escapeHtml(formatDate(match.match_date))}</span><span>${icon("clock")} ${escapeHtml(formatTime(match.match_time))}</span>${match.venue ? `<span>${icon("pin")} ${escapeHtml(match.venue)}</span>` : ""}</div>
    </article>`;
  }

  function matchCard(match) {
    const tournament = getTournament(match.tournament_id);
    const home = teamForSide(match, "a");
    const away = teamForSide(match, "b");
    return `<article class="match-card" data-route="match/${match.id}">
      <div class="match-card-top"><span class="competition-label">${escapeHtml(tournament?.short_name || match.category)} · ${escapeHtml(match.stage || match.round_name || "المباراة")}</span><span class="status-pill ${statusClass(match.status)}">${escapeHtml(match.status)}</span></div>
      <div class="match-card-main">
        <div class="match-team"><span class="team-logo-small">${image(home.logo_url, home.name)}</span><b>${escapeHtml(home.name)}</b></div>
        <div class="match-score">${scoreMarkup(match, true)}</div>
        <div class="match-team"><span class="team-logo-small">${image(away.logo_url, away.name)}</span><b>${escapeHtml(away.name)}</b></div>
      </div>
      <div class="match-card-footer"><span>${escapeHtml(formatDate(match.match_date, true))}</span><span>${escapeHtml(match.venue || "الملعب غير محدد")}</span></div>
    </article>`;
  }

  function matchCollection(matches, mode = "scroll") {
    if (!matches.length) return emptyState("لا توجد مباريات", "لا توجد مباريات مطابقة في هذه البطولة.", "calendar");
    return `<div class="${mode === "scroll" ? "scroll-row" : "match-list"}">${matches.map(matchCard).join("")}</div>`;
  }

  function computedStandings(tournamentId) {
    const viewRows = state.standings.filter((row) => row.tournament_id === tournamentId);
    if (viewRows.length) return viewRows;
    const rows = new Map(tournamentTeams(tournamentId).map((team) => [team.id, {
      position: 0, tournament_id: tournamentId, team_id: team.id, team_name: team.name,
      logo_url: team.logo_url, group_name: team.group_name, played: 0, won: 0, drawn: 0,
      lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
    }]));
    matchesForTournament(tournamentId).filter((match) => match.status === FINISHED).forEach((match) => {
      const home = rows.get(match.team_a_id); const away = rows.get(match.team_b_id);
      if (!home || !away) return;
      const a = score(match.score_a); const b = score(match.score_b);
      home.played += 1; away.played += 1; home.goals_for += a; home.goals_against += b; away.goals_for += b; away.goals_against += a;
      if (a > b) { home.won += 1; away.lost += 1; home.points += 3; }
      else if (a < b) { away.won += 1; home.lost += 1; away.points += 3; }
      else { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
    });
    const grouped = new Map();
    [...rows.values()].forEach((row) => {
      row.goal_difference = row.goals_for - row.goals_against;
      const key = row.group_name || "";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });
    grouped.forEach((values) => values.sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference || b.goals_for - a.goals_for || a.team_name.localeCompare(b.team_name, "ar")).forEach((row, index) => { row.position = index + 1; }));
    return [...rows.values()];
  }

  function standingsTable(tournamentId, preview = false) {
    const rows = computedStandings(tournamentId);
    if (!rows.length) return emptyState("لا يوجد ترتيب بعد", "سيتم احتساب الترتيب تلقائيًا بعد أول نتيجة.", "chart");
    const groups = [...new Set(rows.map((row) => row.group_name || ""))].sort();
    return groups.map((group) => {
      const values = rows.filter((row) => (row.group_name || "") === group).sort((a, b) => a.position - b.position).slice(0, preview ? (groups.length > 1 ? 3 : 6) : 999);
      return `${groups.length > 1 ? `<h3 class="group-title">${group ? `المجموعة ${escapeHtml(group)}` : "الترتيب العام"}</h3>` : ""}<div class="table-wrap"><table class="standings-table"><thead><tr><th>#</th><th>الفريق</th><th>لعب</th><th>فاز</th><th>تعادل</th><th>خسر</th><th>له</th><th>عليه</th><th>+/-</th><th>نقاط</th></tr></thead><tbody>${values.map((row) => `
        <tr data-route="team/${row.team_id}"><td><span class="position-badge">${row.position}</span></td><td><span class="standings-team">${image(row.logo_url, row.team_name)}<b>${escapeHtml(row.team_name)}</b></span></td><td>${row.played}</td><td>${row.won}</td><td>${row.drawn}</td><td>${row.lost}</td><td>${row.goals_for}</td><td>${row.goals_against}</td><td>${row.goal_difference > 0 ? "+" : ""}${row.goal_difference}</td><td><b>${row.points}</b></td></tr>`).join("")}</tbody></table></div>`;
    }).join("");
  }

  function fallbackPlayerStats(tournamentId) {
    const teams = new Set(tournamentTeams(tournamentId).map((team) => team.id));
    const events = eventsForTournament(tournamentId);
    return state.players.filter((player) => teams.has(player.team_id)).map((player) => {
      const playerEvents = events.filter((event) => event.player_id === player.id);
      const assisted = events.filter((event) => event.assist_player_id === player.id).length;
      const directAssists = playerEvents.filter((event) => event.type === "تمريرة حاسمة").length;
      const matchIds = new Set(playerEvents.map((event) => event.match_id));
      return { tournament_id: tournamentId, player_id: player.id, player_name: player.name, photo_url: player.photo_url, number: player.number, position: player.position, team_id: player.team_id, team_name: getTeam(player.team_id)?.name || "", team_logo_url: getTeam(player.team_id)?.logo_url || "", matches: matchIds.size, goals: playerEvents.filter((event) => GOAL_TYPES.includes(event.type)).length, assists: assisted + directAssists, yellow_cards: playerEvents.filter((event) => event.type === "بطاقة صفراء").length, red_cards: playerEvents.filter((event) => event.type === "بطاقة حمراء").length };
    });
  }

  function playerStats(tournamentId) {
    const rows = state.playerStats.filter((row) => row.tournament_id === tournamentId);
    return rows.length ? rows : fallbackPlayerStats(tournamentId);
  }

  function rankedPlayers(tournamentId, field) {
    return playerStats(tournamentId).filter((row) => Number(row[field]) > 0).sort((a, b) => Number(b[field]) - Number(a[field]) || Number(b.goals) - Number(a.goals) || a.player_name.localeCompare(b.player_name, "ar"));
  }

  function leaderCard(title, rows, field, emptyMessage = "لا توجد أرقام مسجلة بعد", limit = 5) {
    return `<div class="leader-card"><div class="leader-card-head"><h3>${escapeHtml(title)}</h3><span class="soft-badge">${rows.length} لاعب</span></div>${rows.length ? `<div class="leader-list">${rows.slice(0, limit).map((row, index) => {
      const player = getPlayer(row.player_id) || { name: row.player_name, photo_url: row.photo_url };
      return `<div class="leader-row" data-route="player/${row.player_id}"><span class="rank-number">${String(index + 1).padStart(2, "0")}</span>${avatar(player)}<span class="leader-copy"><b class="leader-name">${escapeHtml(row.player_name)}</b><small>${escapeHtml(row.team_name)}</small></span><strong class="leader-value">${Number(row[field]) || 0}</strong></div>`;
    }).join("")}</div>` : emptyState(title, emptyMessage, field === "assists" ? "assist" : "ball")}</div>`;
  }

  function cardRankings(tournamentId, type) {
    const field = type === "بطاقة حمراء" ? "red_cards" : "yellow_cards";
    return rankedPlayers(tournamentId, field);
  }

  function renderHome() {
    const tournament = currentTournament();
    if (!tournament) return renderError("لا توجد بطولة متاحة");
    const matches = matchesForTournament(tournament.id);
    const live = matches.filter((match) => match.status === "مباشر").sort((a, b) => matchDateTime(a) - matchDateTime(b));
    const results = matches.filter((match) => match.status === FINISHED).sort((a, b) => matchDateTime(b) - matchDateTime(a));
    const upcoming = matches.filter((match) => match.status === "قادمة").sort((a, b) => matchDateTime(a) - matchDateTime(b));
    const featured = live[0] || results[0] || upcoming[0];
    const scorers = rankedPlayers(tournament.id, "goals");
    const assists = rankedPlayers(tournament.id, "assists");
    const yellows = cardRankings(tournament.id, "بطاقة صفراء");
    const reds = cardRankings(tournament.id, "بطاقة حمراء");
    main.innerHTML = `<div class="page-shell">
      ${tournamentStrip(tournament.id)}
      <section class="hero-layout">
        <div class="hero-copy-card"><span class="eyebrow">COUPE D’AGHCHORGUIT · ${escapeHtml(tournament.season)}</span><h1>كل البطولة.<br><em>كل لحظة.</em></h1><p>${escapeHtml(state.settings.hero_subtitle || "النتائج والمباريات والفرق والإحصائيات في تجربة رياضية سريعة واحدة.")}</p><div class="hero-actions"><button class="primary-button" type="button" data-route="matches">استكشف المباريات ${icon("arrow", "button-icon")}</button><button class="secondary-button" type="button" data-route="tournament/${tournament.slug}/standings">عرض الترتيب</button></div></div>
        ${heroMatch(featured, tournament)}
      </section>
      ${live.length ? `<section class="section-block">${sectionHeading("LIVE NOW", "مباشر الآن", "كل المباريات", "matches")}${matchCollection(live.slice(0, 5))}</section>` : ""}
      <section class="section-block">${sectionHeading("LATEST RESULTS", "آخر النتائج", "عرض النتائج", `tournament/${tournament.slug}/results`)}${matchCollection(results.slice(0, 6))}</section>
      <section class="section-block">${sectionHeading("UPCOMING", "المباريات القادمة", "الجدول الكامل", `tournament/${tournament.slug}/matches`)}${matchCollection(upcoming.slice(0, 6))}</section>
      <section class="section-block"><div class="two-column"><div class="standings-card">${sectionHeading("TABLE", "ترتيب الفرق", "الترتيب الكامل", `tournament/${tournament.slug}/standings`)}${standingsTable(tournament.id, true)}</div><div>${leaderCard("أفضل الهدافين", scorers, "goals", "لم تسجل أهداف في هذه البطولة بعد", 6)}</div></div></section>
      <section class="section-block">${sectionHeading("LEADERS", "قادة البطولة", "كل الإحصائيات", "stats")}<div class="two-column">${leaderCard("صناعة الأهداف", assists, "assists", "لا توجد صناعات أهداف مسجلة", 5)}${leaderCard("البطاقات الصفراء", yellows, "yellow_cards", "لا توجد بطاقات صفراء", 5)}</div></section>
      <section class="section-block">${sectionHeading("DISCIPLINE", "البطاقات والإيقافات", "كل البطاقات", `tournament/${tournament.slug}/cards`)}<div class="data-grid"><div class="metric-card"><span>البطاقات الصفراء</span><strong>${eventsForTournament(tournament.id).filter((event) => event.type === "بطاقة صفراء").length}</strong><small>إجمالي البطولة</small></div><div class="metric-card"><span>البطاقات الحمراء</span><strong>${eventsForTournament(tournament.id).filter((event) => event.type === "بطاقة حمراء").length}</strong><small>إيقافات مباشرة</small></div><div class="metric-card"><span>الأكثر إنذارًا</span><strong>${escapeHtml(yellows[0]?.player_name || "—")}</strong><small>${yellows[0] ? `${yellows[0].yellow_cards} بطاقات` : "لا توجد بيانات"}</small></div><div class="metric-card accent"><span>آخر حالة طرد</span><strong>${escapeHtml(reds[0]?.player_name || "—")}</strong><small>${escapeHtml(reds[0]?.team_name || "لا توجد حالات")}</small></div></div></section>
      <section class="section-block">${sectionHeading("TOURNAMENT HUBS", "بطولات كأس أغشوركيت", "عرض الكل", "tournaments")}${tournamentCards()}</section>
      <section class="section-block">${sectionHeading("LATEST NEWS", "آخر الأخبار والأحداث", "كل الأخبار", "news")}${newsCards(state.news.slice(0, 3))}</section>
    </div>`;
  }

  function tournamentCards() {
    return `<div class="tournament-grid">${state.tournaments.map((tournament) => {
      const matches = matchesForTournament(tournament.id);
      return `<article class="tournament-card" style="--t-accent:${escapeHtml(tournament.accent_color)}" data-route="tournament/${tournament.slug}/overview"><div><div class="tournament-card-top">${image(tournament.logo_url, tournament.name)}<span class="status-pill ${tournament.status === "مستمرة" ? "finished" : "upcoming"}">${escapeHtml(tournament.status)}</span></div><h2>${escapeHtml(tournament.short_name)}</h2><p>${escapeHtml(tournament.description || tournament.name)}</p></div><div class="tournament-card-stats"><span><b>${tournamentTeams(tournament.id).length}</b><small>فريق</small></span><span><b>${matches.length}</b><small>مباراة</small></span><span><b>${matches.filter((match) => match.status === FINISHED).length}</b><small>نتيجة</small></span></div></article>`;
    }).join("")}</div>`;
  }

  function renderTournaments() {
    main.innerHTML = `<div class="page-shell">${pageHeading("TOURNAMENT HUBS", "البطولات", "كل بطولة مساحة مستقلة بفرقها ومبارياتها وترتيبها وإحصاءاتها.")}${tournamentCards()}</div>`;
  }

  const tournamentTabs = [
    ["overview", "الرئيسية"], ["matches", "المباريات"], ["results", "النتائج"], ["standings", "الترتيب"],
    ["teams", "الفرق"], ["players", "اللاعبون"], ["scorers", "الهدافون"], ["assists", "صناعة الأهداف"],
    ["cards", "البطاقات"], ["stats", "الإحصائيات"],
  ];

  function renderTournament(slug, tab = "overview") {
    const tournament = state.tournaments.find((item) => item.slug === slug);
    if (!tournament) return renderNotFound();
    selectTournament(tournament.id);
    const matches = matchesForTournament(tournament.id);
    const results = matches.filter((match) => match.status === FINISHED).sort((a, b) => matchDateTime(b) - matchDateTime(a));
    const upcoming = matches.filter((match) => match.status !== FINISHED && match.status !== "ملغاة").sort((a, b) => matchDateTime(a) - matchDateTime(b));
    const scorers = rankedPlayers(tournament.id, "goals");
    const assists = rankedPlayers(tournament.id, "assists");
    const teams = tournamentTeams(tournament.id);
    let content = "";
    if (tab === "overview") content = `<div class="data-grid"><div class="metric-card accent"><span>الفرق المشاركة</span><strong>${teams.length}</strong><small>${escapeHtml(tournament.short_name)}</small></div><div class="metric-card"><span>المباريات</span><strong>${matches.length}</strong><small>في جدول البطولة</small></div><div class="metric-card"><span>النتائج</span><strong>${results.length}</strong><small>مباراة مكتملة</small></div><div class="metric-card"><span>الأهداف</span><strong>${eventsForTournament(tournament.id).filter((event) => GOAL_TYPES.includes(event.type)).length}</strong><small>من أحداث المباريات</small></div></div><section class="section-block">${sectionHeading("NEXT", "المباريات القادمة", "كل المباريات", `tournament/${slug}/matches`)}${matchCollection(upcoming.slice(0, 5))}</section><section class="section-block"><div class="two-column">${leaderCard("الهدافون", scorers, "goals", "لا توجد أهداف بعد", 6)}${leaderCard("صناعة الأهداف", assists, "assists", "لا توجد صناعات أهداف بعد", 6)}</div></section>`;
    else if (tab === "matches") content = matchCollection(upcoming, "list");
    else if (tab === "results") content = matchCollection(results, "list");
    else if (tab === "standings") content = `<div class="standings-card">${standingsTable(tournament.id)}</div>`;
    else if (tab === "teams") content = teamCards(teams);
    else if (tab === "players") content = playerList(playerStats(tournament.id), 999);
    else if (tab === "scorers") content = leaderCard("ترتيب الهدافين", scorers, "goals", "لا توجد أهداف مسجلة", 999);
    else if (tab === "assists") content = leaderCard("أفضل صانعي الأهداف", assists, "assists", "لا توجد صناعات أهداف مسجلة", 999);
    else if (tab === "cards") content = `<div class="two-column">${leaderCard("البطاقات الصفراء", cardRankings(tournament.id, "بطاقة صفراء"), "yellow_cards", "لا توجد بطاقات صفراء", 999)}${leaderCard("البطاقات الحمراء", cardRankings(tournament.id, "بطاقة حمراء"), "red_cards", "لا توجد بطاقات حمراء", 999)}</div>`;
    else if (tab === "stats") content = `<div class="data-grid"><div class="metric-card accent"><span>متوسط الأهداف</span><strong>${results.length ? (results.reduce((sum, match) => sum + score(match.score_a) + score(match.score_b), 0) / results.length).toFixed(1) : "0.0"}</strong><small>لكل مباراة مكتملة</small></div><div class="metric-card"><span>إجمالي الأهداف</span><strong>${results.reduce((sum, match) => sum + score(match.score_a) + score(match.score_b), 0)}</strong><small>من النتائج الرسمية</small></div><div class="metric-card"><span>التعادلات</span><strong>${results.filter((match) => score(match.score_a) === score(match.score_b)).length}</strong><small>مباراة</small></div><div class="metric-card"><span>البطاقات</span><strong>${eventsForTournament(tournament.id).filter((event) => ["بطاقة صفراء", "بطاقة حمراء"].includes(event.type)).length}</strong><small>صفراء وحمراء</small></div></div><section class="section-block"><div class="two-column">${leaderCard("الهدافون", scorers, "goals", "لا توجد أهداف", 10)}${leaderCard("صناعة الأهداف", assists, "assists", "لا توجد صناعات", 10)}</div></section>`;
    else content = emptyState("القسم غير متاح", "اختر قسمًا آخر من شريط البطولة.", "info");

    main.innerHTML = `<div class="page-shell"><section class="profile-hero" style="--profile-accent:${escapeHtml(tournament.accent_color)}"><div class="back-row"><button class="back-button" type="button" data-route="tournaments">${icon("back")} كل البطولات</button><span class="status-pill ${tournament.status === "مستمرة" ? "finished" : "upcoming"}">${escapeHtml(tournament.status)}</span></div><div class="profile-main"><span class="team-logo-large">${image(tournament.logo_url, tournament.name, { eager: true })}</span><div><span class="eyebrow">${escapeHtml(tournament.season)} SEASON</span><h1>${escapeHtml(tournament.name)}</h1><p>${escapeHtml(tournament.description || "البطولة الرسمية")}</p><div class="profile-badges"><span class="soft-badge">${icon("users", "button-icon")} ${teams.length} فريق</span><span class="soft-badge">${icon("calendar", "button-icon")} ${matches.length} مباراة</span></div></div><div class="profile-actions"><button class="secondary-button" type="button" data-share="${location.href}">${icon("share", "button-icon")} مشاركة</button></div></div></section><div class="section-block app-tabs">${tournamentTabs.map(([key, label]) => `<button type="button" class="${tab === key ? "active" : ""}" data-route="tournament/${slug}/${key}">${label}</button>`).join("")}</div>${content}</div>`;
  }

  function renderMatches() {
    const tournament = currentTournament();
    if (!tournament) return renderError("لا توجد بطولة متاحة");
    const all = matchesForTournament(tournament.id).sort((a, b) => matchDateTime(b) - matchDateTime(a));
    const filtered = all.filter((match) => {
      if (state.matchStatusFilter === "الكل") return true;
      if (state.matchStatusFilter === "النتائج") return match.status === FINISHED;
      if (state.matchStatusFilter === "القادمة") return match.status === "قادمة";
      return match.status === state.matchStatusFilter;
    });
    main.innerHTML = `<div class="page-shell">${pageHeading("FIXTURES & RESULTS", "المباريات", "جدول ونتائج البطولة المختارة دون خلط بيانات البطولات.")}${tournamentStrip(tournament.id)}<div class="filter-row">${["الكل", "مباشر", "القادمة", "النتائج"].map((filter) => `<button type="button" class="filter-chip ${state.matchStatusFilter === filter ? "active" : ""}" data-match-filter="${filter}">${filter}</button>`).join("")}</div>${matchCollection(filtered, "list")}</div>`;
  }

  function teamCards(teams) {
    if (!teams.length) return emptyState("لا توجد فرق", "لم تضف فرق لهذه البطولة بعد.", "shield");
    return `<div class="team-grid">${teams.map((team) => {
      const table = computedStandings(team.tournament_id).find((row) => row.team_id === team.id);
      return `<article class="team-card" data-route="team/${team.id}"><span class="team-card-logo">${image(team.logo_url, team.name)}</span><span class="team-card-copy"><b>${escapeHtml(team.name)}</b><small>${team.group_name ? `المجموعة ${escapeHtml(team.group_name)} · ` : ""}${state.players.filter((player) => player.team_id === team.id).length} لاعب · ${table?.points || 0} نقطة</small></span><span class="team-card-arrow">${icon("arrow")}</span></article>`;
    }).join("")}</div>`;
  }

  function renderTeams() {
    const tournament = currentTournament();
    if (!tournament) return renderError("لا توجد بطولة متاحة");
    main.innerHTML = `<div class="page-shell">${pageHeading("CLUBS", "الفرق", "ملفات الفرق وإحصاءاتها وقوائم لاعبيها.")}${tournamentStrip(tournament.id)}${teamCards(tournamentTeams(tournament.id))}</div>`;
  }

  function playerList(rows, limit = 60) {
    if (!rows.length) return emptyState("لا يوجد لاعبون", "لم تضف قوائم لاعبين لهذه البطولة بعد.", "user");
    return `<div class="leader-card"><div class="leader-list">${rows.slice().sort((a, b) => Number(b.goals) - Number(a.goals) || a.player_name.localeCompare(b.player_name, "ar")).slice(0, limit).map((row, index) => {
      const player = getPlayer(row.player_id) || { name: row.player_name, photo_url: row.photo_url };
      return `<div class="leader-row" data-route="player/${row.player_id}"><span class="rank-number">${String(index + 1).padStart(2, "0")}</span>${avatar(player)}<span class="leader-copy"><b class="leader-name">${escapeHtml(row.player_name)}</b><small>${escapeHtml(row.team_name)}${row.position ? ` · ${escapeHtml(row.position)}` : ""}</small></span><strong class="leader-value">${Number(row.goals) || 0}</strong></div>`;
    }).join("")}</div></div>`;
  }

  function renderTeam(id) {
    const team = getTeam(id);
    if (!team) return renderNotFound();
    const tournament = getTournament(team.tournament_id);
    const table = computedStandings(team.tournament_id).find((row) => row.team_id === team.id) || {};
    const players = playerStats(team.tournament_id).filter((row) => row.team_id === team.id);
    const matches = matchesForTournament(team.tournament_id).filter((match) => match.team_a_id === id || match.team_b_id === id);
    const results = matches.filter((match) => match.status === FINISHED).sort((a, b) => matchDateTime(b) - matchDateTime(a));
    const upcoming = matches.filter((match) => match.status === "قادمة").sort((a, b) => matchDateTime(a) - matchDateTime(b));
    const favorite = isFavorite(id);
    main.innerHTML = `<div class="page-shell"><section class="profile-hero" style="--profile-accent:${escapeHtml(tournament?.accent_color || "#c7ff37")}"><div class="back-row"><button class="back-button" type="button" data-route="teams">${icon("back")} كل الفرق</button><span class="status-pill finished">${escapeHtml(tournament?.short_name || team.category)}</span></div><div class="profile-main"><span class="team-logo-large">${image(team.logo_url, team.name, { eager: true })}</span><div><span class="eyebrow">TEAM PROFILE</span><h1>${escapeHtml(team.name)}</h1><p>${escapeHtml(team.description || `${tournament?.name || team.category}${team.group_name ? ` · المجموعة ${team.group_name}` : ""}`)}</p><div class="profile-badges">${team.coach ? `<span class="soft-badge">المدرب · ${escapeHtml(team.coach)}</span>` : ""}${team.captain ? `<span class="soft-badge">القائد · ${escapeHtml(team.captain)}</span>` : ""}<span class="soft-badge">${players.length} لاعب</span></div></div><div class="profile-actions"><button class="secondary-button" type="button" data-favorite-team="${team.id}">${icon(favorite ? "heartFill" : "heart", "button-icon")} ${favorite ? "في المفضلة" : "أضف للمفضلة"}</button><button class="secondary-button" type="button" data-share="${location.href}">${icon("share", "button-icon")} مشاركة</button></div></div><div class="profile-metrics"><div class="profile-metric"><strong>${table.played || 0}</strong><span>لعب</span></div><div class="profile-metric"><strong>${table.won || 0}</strong><span>فاز</span></div><div class="profile-metric"><strong>${table.drawn || 0}</strong><span>تعادل</span></div><div class="profile-metric"><strong>${table.lost || 0}</strong><span>خسر</span></div><div class="profile-metric"><strong>${table.goals_for || 0}</strong><span>له</span></div><div class="profile-metric"><strong>${table.goals_against || 0}</strong><span>عليه</span></div><div class="profile-metric"><strong>${(table.goal_difference || 0) > 0 ? "+" : ""}${table.goal_difference || 0}</strong><span>الفارق</span></div><div class="profile-metric"><strong>${table.points || 0}</strong><span>النقاط</span></div></div></section><section class="section-block">${sectionHeading("FORM", "آخر المباريات")}${matchCollection(results.slice(0, 5))}</section><section class="section-block">${sectionHeading("NEXT", "المباريات القادمة")}${matchCollection(upcoming.slice(0, 5))}</section><section class="section-block">${sectionHeading("SQUAD", "قائمة اللاعبين")}<div class="two-column">${playerList(players, 999)}<div>${leaderCard("هدافو الفريق", players.filter((row) => Number(row.goals) > 0).sort((a, b) => b.goals - a.goals), "goals", "لا توجد أهداف مسجلة", 10)}<div style="height:12px"></div>${leaderCard("بطاقات الفريق", players.filter((row) => Number(row.yellow_cards) + Number(row.red_cards) > 0).map((row) => ({ ...row, cards: Number(row.yellow_cards) + Number(row.red_cards) })).sort((a, b) => b.cards - a.cards), "cards", "لا توجد بطاقات", 10)}</div></div></section></div>`;
    const teamHero = main.querySelector(".profile-hero");
    teamHero?.classList.add("team-profile-hero");
    if (team.team_photo_url && teamHero) {
      const cover = document.createElement("div");
      const coverImage = document.createElement("img");
      cover.className = "team-profile-cover";
      cover.setAttribute("aria-hidden", "true");
      coverImage.src = imageUrl(team.team_photo_url);
      coverImage.alt = "";
      coverImage.loading = "eager";
      coverImage.decoding = "async";
      coverImage.fetchPriority = "high";
      coverImage.addEventListener("error", () => cover.remove(), { once: true });
      cover.append(coverImage);
      teamHero.prepend(cover);
      teamHero.classList.add("has-team-cover");
    }
  }

  function renderPlayer(id) {
    const player = getPlayer(id);
    if (!player) return renderNotFound();
    const team = getTeam(player.team_id);
    const tournament = getTournament(team?.tournament_id);
    const stats = playerStats(team?.tournament_id).find((row) => row.player_id === id) || { matches: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 };
    const events = state.events.filter((event) => event.player_id === id || event.assist_player_id === id).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    const matchIds = new Set(events.map((event) => event.match_id));
    state.lineupPlayers.filter((row) => row.player_id === id).forEach((row) => {
      const lineup = state.lineups.find((item) => item.id === row.lineup_id);
      if (lineup) matchIds.add(lineup.match_id);
    });
    const matches = [...matchIds].map(getMatch).filter(Boolean).sort((a, b) => matchDateTime(b) - matchDateTime(a));
    const photo = player.photo_url ? `<span class="team-logo-large">${image(player.photo_url, player.name, { eager: true })}</span>` : `<span class="team-logo-large" style="display:grid;place-items:center;background:var(--surface-3);color:var(--accent);font-size:34px;font-weight:900">${escapeHtml(initials(player.name))}</span>`;
    main.innerHTML = `<div class="page-shell"><section class="profile-hero" style="--profile-accent:${escapeHtml(tournament?.accent_color || "#c7ff37")}"><div class="back-row"><button class="back-button" type="button" data-route="team/${team?.id || ""}">${icon("back")} فريق ${escapeHtml(team?.name || "اللاعب")}</button><span class="status-pill finished">PLAYER</span></div><div class="profile-main">${photo}<div><span class="eyebrow">PLAYER PROFILE</span><h1>${escapeHtml(player.name)}</h1><p>${escapeHtml(team?.name || "فريق غير محدد")}</p><div class="profile-badges">${player.number != null ? `<span class="soft-badge">رقم ${player.number}</span>` : ""}${player.position ? `<span class="soft-badge">${escapeHtml(player.position)}</span>` : ""}${player.is_captain ? '<span class="soft-badge">قائد الفريق</span>' : ""}</div></div><div class="profile-actions"><button class="secondary-button" type="button" data-share="${location.href}">${icon("share", "button-icon")} مشاركة</button></div></div><div class="profile-metrics"><div class="profile-metric"><strong>${stats.matches || 0}</strong><span>المباريات</span></div><div class="profile-metric"><strong>${stats.goals || 0}</strong><span>الأهداف</span></div><div class="profile-metric"><strong>${stats.assists || 0}</strong><span>Assists</span></div><div class="profile-metric"><strong>${stats.yellow_cards || 0}</strong><span>صفراء</span></div><div class="profile-metric"><strong>${stats.red_cards || 0}</strong><span>حمراء</span></div></div></section><section class="section-block">${sectionHeading("MATCH LOG", "سجل المباريات")}${matchCollection(matches, "list")}</section><section class="section-block">${sectionHeading("EVENTS", "أحداث اللاعب")}${eventTimeline(events)}</section></div>`;
  }

  function eventTypeIcon(type) {
    if (type === "تمريرة حاسمة") return "assist";
    if (type === "بطاقة صفراء" || type === "بطاقة حمراء") return "card";
    if (type.includes("ركلة جزاء")) return "penalty";
    if (type === "تبديل") return "swap";
    return "ball";
  }

  function eventClass(type) {
    if (type === "بطاقة صفراء") return "yellow";
    if (type === "بطاقة حمراء") return "red";
    if (type === "تمريرة حاسمة") return "assist";
    return "goal";
  }

  function eventTimeline(events) {
    if (!events.length) return emptyState("لا توجد أحداث", "لم تسجل أحداث لهذه المباراة بعد.", "ball");
    const ordered = events.slice().sort((a, b) => {
      const am = a.minute == null ? 999 : Number(a.minute); const bm = b.minute == null ? 999 : Number(b.minute);
      return am - bm || String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
    return `<div class="timeline">${ordered.map((event) => {
      const team = getTeam(event.team_id);
      const assist = assistEventName(event);
      const match = getMatch(event.match_id);
      const context = match ? `${teamForSide(match, "a").name} × ${teamForSide(match, "b").name}` : team?.name || "";
      return `<article class="event-item ${eventClass(event.type)}"><span class="event-icon">${icon(eventTypeIcon(event.type))}</span><span class="event-copy"><b>${escapeHtml(playerEventName(event))}</b><strong>${event.minute == null ? "—" : `${event.minute}′`}</strong><small>${escapeHtml(event.type)} · ${escapeHtml(team?.name || context)}${assist ? ` · صناعة ${escapeHtml(assist)}` : ""}${event.note ? ` · ${escapeHtml(event.note)}` : ""}</small></span></article>`;
    }).join("")}</div>`;
  }

  function matchSummary(match, events) {
    const goals = events.filter((event) => GOAL_TYPES.includes(event.type));
    const assists = events.filter((event) => event.type === "تمريرة حاسمة").length + goals.filter((event) => event.assist_player_id).length;
    const yellow = events.filter((event) => event.type === "بطاقة صفراء").length;
    const red = events.filter((event) => event.type === "بطاقة حمراء").length;
    return `<div class="summary-grid"><div><div class="event-summary"><div class="event-summary-card"><span>الأهداف</span><strong>${goals.length}</strong></div><div class="event-summary-card"><span>صناعة الأهداف</span><strong>${assists}</strong></div><div class="event-summary-card"><span>بطاقات صفراء</span><strong>${yellow}</strong></div><div class="event-summary-card"><span>بطاقات حمراء</span><strong>${red}</strong></div></div></div><div class="content-card"><div class="leader-card-head"><h3>أبرز أحداث المباراة</h3><span class="soft-badge">${events.length} حدث</span></div>${eventTimeline(events.slice(0, 8))}</div></div>`;
  }

  function statValue(stats, key, fallback) {
    return stats?.[key] == null ? fallback : Number(stats[key]);
  }

  function statLine(label, home, away) {
    const total = Math.max(1, Number(home) + Number(away));
    return `<div><div class="stat-label">${escapeHtml(label)}</div><div class="stat-line"><b>${home}</b><div class="dual-bar"><i class="home" style="width:${Math.max(3, Number(home) / total * 100)}%"></i><i class="away" style="width:${Math.max(3, Number(away) / total * 100)}%"></i></div><b>${away}</b></div></div>`;
  }

  function matchStatistics(match, events) {
    const stats = state.matchStats.find((item) => item.match_id === match.id) || {};
    const teamAEvents = events.filter((event) => event.team_id === match.team_a_id);
    const teamBEvents = events.filter((event) => event.team_id === match.team_b_id);
    const fallback = (type, teamEvents) => teamEvents.filter((event) => event.type === type).length;
    const rows = [
      ["الاستحواذ %", statValue(stats, "possession_a", 0), statValue(stats, "possession_b", 0)],
      ["التسديدات", statValue(stats, "shots_a", score(match.score_a)), statValue(stats, "shots_b", score(match.score_b))],
      ["على المرمى", statValue(stats, "shots_on_target_a", score(match.score_a)), statValue(stats, "shots_on_target_b", score(match.score_b))],
      ["الركنيات", statValue(stats, "corners_a", 0), statValue(stats, "corners_b", 0)],
      ["الأخطاء", statValue(stats, "fouls_a", 0), statValue(stats, "fouls_b", 0)],
      ["بطاقات صفراء", statValue(stats, "yellow_cards_a", fallback("بطاقة صفراء", teamAEvents)), statValue(stats, "yellow_cards_b", fallback("بطاقة صفراء", teamBEvents))],
      ["بطاقات حمراء", statValue(stats, "red_cards_a", fallback("بطاقة حمراء", teamAEvents)), statValue(stats, "red_cards_b", fallback("بطاقة حمراء", teamBEvents))],
    ];
    const meaningful = rows.filter(([, a, b]) => Number(a) || Number(b));
    if (!meaningful.length) return emptyState("لا توجد إحصائيات تفصيلية", "ستظهر الإحصائيات عندما تُسجل من لوحة الإدارة.", "chart");
    return `<div class="content-card"><div class="stat-list">${meaningful.map(([label, a, b]) => statLine(label, a, b)).join("")}</div></div>`;
  }

  function matchLineups(match) {
    const lineups = state.lineups.filter((lineup) => lineup.match_id === match.id);
    if (!lineups.length) return emptyState("التشكيلات غير متاحة", "لم تعتمد تشكيلات هذه المباراة بعد.", "users");
    return `<div class="lineup-grid">${[match.team_a_id, match.team_b_id].map((teamId) => {
      const team = getTeam(teamId); const lineup = lineups.find((item) => item.team_id === teamId);
      if (!lineup) return `<div class="lineup-team">${emptyState(`تشكيلة ${team?.name || "الفريق"}`, "لم تعتمد بعد.", "users")}</div>`;
      const rows = state.lineupPlayers.filter((row) => row.lineup_id === lineup.id).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
      const group = (role) => rows.filter((row) => row.role === role).map((row) => {
        const player = getPlayer(row.player_id); return `<div class="lineup-player" data-route="player/${row.player_id}"><b>${escapeHtml(player?.name || "لاعب غير محدد")}</b><span>${player?.number != null ? `#${player.number}` : escapeHtml(player?.position || "")}</span></div>`;
      }).join("");
      return `<div class="lineup-team"><h3>${image(team?.logo_url, team?.name || "")} ${escapeHtml(team?.name || "الفريق")} ${lineup.formation ? `<span class="soft-badge">${escapeHtml(lineup.formation)}</span>` : ""}</h3><div class="lineup-section-title">الأساسيون</div>${group("أساسي") || emptyState("لا توجد أسماء", "", "users")}<div class="lineup-section-title">البدلاء</div>${group("بديل") || emptyState("لا توجد أسماء", "", "users")}</div>`;
    }).join("")}</div>`;
  }

  function renderMatch(id, tab = "summary") {
    const match = getMatch(id);
    if (!match) return renderNotFound();
    const tournament = getTournament(match.tournament_id);
    const home = teamForSide(match, "a"); const away = teamForSide(match, "b");
    const events = getEvents(id);
    const tabs = [["summary", "الملخص"], ["timeline", "الأحداث"], ["stats", "الإحصائيات"], ["lineups", "التشكيلة"]];
    let content = tab === "timeline" ? eventTimeline(events) : tab === "stats" ? matchStatistics(match, events) : tab === "lineups" ? matchLineups(match) : matchSummary(match, events);
    main.innerHTML = `<div class="page-shell"><section class="match-center-hero" style="--t-accent:${escapeHtml(tournament?.accent_color || "#c7ff37")}"><div class="match-center-heading"><button class="back-button" type="button" data-route="tournament/${tournament?.slug || ""}/matches">${icon("back")} ${escapeHtml(tournament?.short_name || "المباريات")}</button><button class="icon-button" type="button" data-share="${location.href}" aria-label="مشاركة المباراة">${icon("share")}</button></div><div class="match-center-teams"><div class="match-center-team" data-route="team/${home.id}"><span class="team-logo-large">${image(home.logo_url, home.name, { eager: true })}</span><b>${escapeHtml(home.name)}</b></div><div class="match-center-score">${scoreMarkup(match)}<span class="status-pill ${statusClass(match.status)}">${escapeHtml(match.status)}</span></div><div class="match-center-team" data-route="team/${away.id}"><span class="team-logo-large">${image(away.logo_url, away.name, { eager: true })}</span><b>${escapeHtml(away.name)}</b></div></div><div class="match-facts"><span>${icon("calendar", "button-icon")} ${escapeHtml(formatDate(match.match_date))}</span><span>${icon("clock", "button-icon")} ${escapeHtml(formatTime(match.match_time))}</span>${match.venue ? `<span>${icon("pin", "button-icon")} ${escapeHtml(match.venue)}</span>` : ""}<span>${escapeHtml(match.stage || match.round_name || "المباراة")}</span></div></section><div class="section-block app-tabs">${tabs.map(([key, label]) => `<button type="button" class="${tab === key ? "active" : ""}" data-route="match/${match.id}/${key}">${label}</button>`).join("")}</div>${content}</div>`;
  }

  function renderStats(type = "scorers") {
    const tournament = currentTournament();
    if (!tournament) return renderError("لا توجد بطولة متاحة");
    const tabs = [["scorers", "الهدافون"], ["assists", "صناعة الأهداف"], ["yellow", "البطاقات الصفراء"], ["red", "البطاقات الحمراء"]];
    const mapping = { scorers: ["ترتيب الهدافين", "goals"], assists: ["أفضل صانعي الأهداف", "assists"], yellow: ["البطاقات الصفراء", "yellow_cards"], red: ["البطاقات الحمراء", "red_cards"] };
    const [title, field] = mapping[type] || mapping.scorers;
    const rows = rankedPlayers(tournament.id, field);
    main.innerHTML = `<div class="page-shell">${pageHeading("PERFORMANCE", "الإحصائيات", "إحصائيات محسوبة مباشرة من أحداث مباريات البطولة.")}${tournamentStrip(tournament.id)}<div class="app-tabs">${tabs.map(([key, label]) => `<button type="button" class="${type === key ? "active" : ""}" data-route="stats/${key}">${label}</button>`).join("")}</div>${leaderCard(title, rows, field, "لا توجد بيانات مسجلة لهذا التصنيف", 999)}</div>`;
  }

  function newsCards(rows) {
    if (!rows.length) return emptyState("لا توجد أخبار", "ستظهر أخبار البطولة وأحداثها هنا.", "news");
    return `<div class="news-grid">${rows.map((item) => `<article class="news-card" data-route="news/${item.id}"><div class="news-image">${image(item.image_url || state.settings.logo_url, item.title)}</div><div class="news-copy"><div class="news-meta"><span>${escapeHtml(item.type || "خبر")}</span><time>${escapeHtml(formatDate(item.publish_date, true))}</time></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || item.content || "")}</p></div></article>`).join("")}</div>`;
  }

  function renderNews(id = "") {
    if (id) {
      const article = state.news.find((item) => item.id === id);
      if (!article) return renderNotFound();
      main.innerHTML = `<div class="page-shell"><article class="article-card"><div class="back-row"><button class="back-button" type="button" data-route="news">${icon("back")} كل الأخبار</button><button class="icon-button" type="button" data-share="${location.href}" aria-label="مشاركة الخبر">${icon("share")}</button></div><span class="eyebrow">${escapeHtml(article.type || "OFFICIAL NEWS")}</span><h1>${escapeHtml(article.title)}</h1><span class="soft-badge">${escapeHtml(formatDate(article.publish_date))}</span>${article.image_url ? `<div class="article-image">${image(article.image_url, article.title, { eager: true })}</div>` : ""}<div class="article-body">${escapeHtml(article.content || article.description || "لا يوجد نص إضافي لهذا الخبر.")}</div></article></div>`;
      return;
    }
    main.innerHTML = `<div class="page-shell">${pageHeading("OFFICIAL NEWS", "الأخبار والأحداث", "آخر المنشورات الرسمية للبطولات.")}${newsCards(state.news)}</div>`;
  }

  function renderMore() {
    const tournament = currentTournament();
    const actions = [
      ["chart", "الإحصائيات", "الهدافون وصناعة الأهداف والبطاقات", "stats"],
      ["news", "الأخبار", "آخر أخبار وأحداث البطولة", "news"],
      ["search", "البحث الشامل", "ابحث عن فريق أو لاعب أو مباراة", "search"],
      ["trophy", "البطولات", "مساحة مستقلة لكل بطولة", "tournaments"],
      ["lock", "لوحة الإدارة", "إدارة الفرق والمباريات والأحداث", "admin"],
    ];
    main.innerHTML = `<div class="page-shell">${pageHeading("MORE", "المزيد", tournament ? `أدوات ${tournament.short_name}` : "أدوات المنصة")}<div class="more-grid">${actions.map(([ico, title, description, route]) => route === "admin" ? `<a class="action-tile" href="admin/"><span class="action-tile-icon">${icon(ico)}</span><span class="action-tile-copy"><b>${title}</b><small>${description}</small></span>${icon("arrow")}</a>` : `<button class="action-tile" type="button" ${route === "search" ? 'data-action="open-search"' : `data-route="${route}"`}><span class="action-tile-icon">${icon(ico)}</span><span class="action-tile-copy"><b>${title}</b><small>${description}</small></span>${icon("arrow")}</button>`).join("")}</div></div>`;
  }

  function renderError(message = "تعذر تحميل البيانات") {
    main.innerHTML = `<div class="page-shell"><div class="error-state"><span class="empty-state-icon">${icon("refresh")}</span><b>${escapeHtml(message)}</b><p>تحقق من الاتصال ثم أعد المحاولة. لن تفقد أي بيانات.</p><button class="primary-button" type="button" data-action="retry">إعادة المحاولة</button></div></div>`;
  }

  function renderNotFound() {
    main.innerHTML = `<div class="page-shell"><div class="error-state"><span class="empty-state-icon">${icon("info")}</span><b>الصفحة غير موجودة</b><p>قد يكون الرابط قديمًا أو أن العنصر لم يعد متاحًا.</p><button class="primary-button" type="button" data-route="home">العودة للرئيسية</button></div></div>`;
  }

  function parseRoute() {
    const value = location.hash.replace(/^#\/?/, "") || "home";
    return value.split("/").map((part) => decodeURIComponent(part));
  }

  function updateNavigation(root) {
    const active = root === "match" ? "matches" : ["team", "player"].includes(root) ? "teams" : root === "tournament" ? "tournaments" : ["news", "stats", "more"].includes(root) ? (root === "stats" ? "stats" : "more") : root;
    document.querySelectorAll("[data-route]").forEach((element) => {
      const route = element.dataset.route?.split("/")[0];
      if (element.closest(".mobile-navigation, .desktop-navigation")) element.classList.toggle("active", route === active);
    });
  }

  function updateDocumentTitle(parts) {
    const base = state.settings.tournament_name || "كأس أغشوركيت 2026";
    let prefix = "";
    if (parts[0] === "team") prefix = getTeam(parts[1])?.name || "فريق";
    else if (parts[0] === "player") prefix = getPlayer(parts[1])?.name || "لاعب";
    else if (parts[0] === "match") { const match = getMatch(parts[1]); if (match) prefix = `${teamForSide(match, "a").name} × ${teamForSide(match, "b").name}`; }
    else if (parts[0] === "tournament") prefix = state.tournaments.find((item) => item.slug === parts[1])?.short_name || "البطولة";
    else prefix = { home: "الرئيسية", matches: "المباريات", tournaments: "البطولات", teams: "الفرق", stats: "الإحصائيات", news: "الأخبار", more: "المزيد" }[parts[0]] || "";
    document.title = prefix ? `${prefix} | ${base}` : base;
  }

  function renderRoute() {
    if (state.loading && !state.tournaments.length) return;
    if (state.error && !state.tournaments.length) return renderError(state.error);
    const parts = parseRoute();
    updateNavigation(parts[0]); updateDocumentTitle(parts);
    if (parts[0] === "home") renderHome();
    else if (parts[0] === "matches") renderMatches();
    else if (parts[0] === "tournaments") renderTournaments();
    else if (parts[0] === "tournament") renderTournament(parts[1], parts[2] || "overview");
    else if (parts[0] === "teams") renderTeams();
    else if (parts[0] === "team") renderTeam(parts[1]);
    else if (parts[0] === "player") renderPlayer(parts[1]);
    else if (parts[0] === "match") renderMatch(parts[1], parts[2] || "summary");
    else if (parts[0] === "stats") renderStats(parts[1] || "scorers");
    else if (parts[0] === "news") renderNews(parts[1] || "");
    else if (parts[0] === "more") renderMore();
    else renderNotFound();
    main.focus({ preventScroll: true });
  }

  function navigate(route) {
    closeSearch();
    const next = `#${route}`;
    if (location.hash === next) { renderRoute(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else location.hash = next;
  }

  function applySettings() {
    const settings = state.settings || {};
    document.getElementById("brandName").textContent = settings.tournament_name || "كأس أغشوركيت";
    document.getElementById("headerSeason").textContent = settings.season || currentTournament()?.season || "2026";
    const logo = document.getElementById("brandLogo");
    logo.src = imageUrl(settings.logo_url || currentTournament()?.logo_url);
    logo.onerror = () => { logo.onerror = null; logo.src = "assets/tournament.jpg"; };
    const announcement = document.getElementById("announcement");
    announcement.hidden = !settings.announcement;
    announcement.textContent = settings.announcement || "";
    const tournament = currentTournament();
    if (tournament) document.documentElement.style.setProperty("--accent", tournament.accent_color || "#c7ff37");
  }

  function hydrate(payload) {
    Object.keys(payload || {}).forEach((key) => { if (key in state && payload[key] != null) state[key] = payload[key]; });
    if (!getTournament(state.selectedTournamentId)) selectTournament(state.tournaments[0]?.id || "", false);
    state.loading = false; state.error = null;
    applySettings(); renderRoute();
  }

  function restoreCache() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached?.savedAt && Date.now() - cached.savedAt < 15 * 60 * 1000 && cached.payload?.tournaments?.length) hydrate(cached.payload);
    } catch { /* cache is optional */ }
  }

  async function loadData(silent = false) {
    if (!db || state.refreshing) {
      if (!db) { state.loading = false; state.error = "تعذر الاتصال بخدمة البيانات"; renderRoute(); }
      return;
    }
    state.refreshing = true;
    if (!silent && !state.tournaments.length) state.loading = true;
    const queries = {
      tournaments: db.from("tournaments").select("*").order("sort_order"),
      teams: db.from("teams").select("*").order("name"),
      players: db.from("players").select("*").order("name"),
      matches: db.from("matches").select("*").order("match_date", { ascending: false, nullsFirst: false }),
      events: db.from("match_events").select("*").order("created_at", { ascending: true }),
      lineups: db.from("match_lineups").select("*"),
      lineupPlayers: db.from("match_lineup_players").select("*"),
      matchStats: db.from("match_stats").select("*"),
      standings: db.from("tournament_standings").select("*"),
      playerStats: db.from("player_tournament_stats").select("*"),
      news: db.from("news").select("*").order("featured", { ascending: false }).order("sort_order").order("publish_date", { ascending: false }),
      awards: db.from("awards").select("*"),
      settings: db.from("site_settings").select("*").eq("id", "main").maybeSingle(),
    };
    try {
      const entries = await Promise.all(Object.entries(queries).map(async ([key, query]) => [key, await query]));
      const results = Object.fromEntries(entries);
      const coreError = ["tournaments", "teams", "players", "matches", "events"].map((key) => results[key]?.error).find(Boolean);
      if (coreError) throw coreError;
      const payload = {};
      Object.entries(results).forEach(([key, result]) => { payload[key] = result.error ? [] : (key === "settings" ? result.data || {} : result.data || []); });
      hydrate(payload);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), payload })); } catch { /* storage quota is non-fatal */ }
      document.getElementById("connectionState").hidden = true;
    } catch (error) {
      console.error("Tournament data load failed", error);
      state.loading = false;
      state.error = "تعذر تحميل بيانات البطولة";
      if (!state.tournaments.length) renderError(state.error);
      else {
        const connection = document.getElementById("connectionState");
        connection.hidden = false;
        connection.textContent = "تعذر تحديث البيانات الآن — يتم عرض آخر نسخة محفوظة.";
      }
    } finally { state.refreshing = false; }
  }

  function subscribe() {
    if (!db) return;
    let timer;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => loadData(true), 500); };
    state.channel = db.channel("premium-public-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "news" }, refresh)
      .subscribe();
  }

  function openSearch() {
    searchLayer.hidden = false; document.body.style.overflow = "hidden";
    searchInput.value = ""; renderSearchResults(""); window.setTimeout(() => searchInput.focus(), 40);
  }

  function closeSearch() {
    searchLayer.hidden = true; document.body.style.overflow = "";
  }

  function normalize(value) { return String(value || "").trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/\s+/g, " "); }

  function renderSearchResults(query) {
    const q = normalize(query);
    if (!q) {
      searchResults.innerHTML = `<div class="more-grid"><button class="action-tile" type="button" data-route="matches"><span class="action-tile-icon">${icon("calendar")}</span><span class="action-tile-copy"><b>المباريات</b><small>الجدول والنتائج</small></span>${icon("arrow")}</button><button class="action-tile" type="button" data-route="teams"><span class="action-tile-icon">${icon("users")}</span><span class="action-tile-copy"><b>الفرق</b><small>قوائم اللاعبين</small></span>${icon("arrow")}</button></div>`;
      return;
    }
    const teams = state.teams.filter((team) => normalize(team.name).includes(q)).slice(0, 6).map((team) => ({ route: `team/${team.id}`, image: team.logo_url, title: team.name, meta: getTournament(team.tournament_id)?.short_name || team.category, type: "فريق" }));
    const players = state.players.filter((player) => normalize(player.name).includes(q) || normalize(getTeam(player.team_id)?.name).includes(q)).slice(0, 8).map((player) => ({ route: `player/${player.id}`, image: player.photo_url || getTeam(player.team_id)?.logo_url, title: player.name, meta: getTeam(player.team_id)?.name || "", type: "لاعب" }));
    const matches = state.matches.filter((match) => normalize(`${teamForSide(match, "a").name} ${teamForSide(match, "b").name}`).includes(q)).slice(0, 6).map((match) => ({ route: `match/${match.id}`, image: teamForSide(match, "a").logo_url, title: `${teamForSide(match, "a").name} × ${teamForSide(match, "b").name}`, meta: formatDate(match.match_date, true), type: "مباراة" }));
    const rows = [...teams, ...players, ...matches];
    searchResults.innerHTML = rows.length ? rows.map((row) => `<button class="search-result" type="button" data-route="${row.route}">${image(row.image, row.title)}<span class="search-result-copy"><b>${escapeHtml(row.title)}</b><small>${escapeHtml(row.meta)}</small></span><small>${row.type}</small></button>`).join("") : emptyState("لا توجد نتائج", "جرّب كتابة اسم أقصر أو ابحث بكلمة أخرى.", "search");
  }

  async function share(value) {
    const url = String(value || location.href);
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else { await navigator.clipboard.writeText(url); toast("تم نسخ الرابط"); }
    } catch (error) { if (error?.name !== "AbortError") toast("تعذرت مشاركة الرابط", "error"); }
  }

  document.addEventListener("click", (event) => {
    const route = event.target.closest("[data-route]");
    if (route) { event.preventDefault(); navigate(route.dataset.route); return; }
    const selector = event.target.closest("[data-select-tournament]");
    if (selector) { selectTournament(selector.dataset.selectTournament); renderRoute(); return; }
    const filter = event.target.closest("[data-match-filter]");
    if (filter) { state.matchStatusFilter = filter.dataset.matchFilter; renderMatches(); return; }
    const favorite = event.target.closest("[data-favorite-team]");
    if (favorite) { toggleFavorite(favorite.dataset.favoriteTeam); return; }
    const shareButton = event.target.closest("[data-share]");
    if (shareButton) { share(shareButton.dataset.share); return; }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "open-search") openSearch();
    else if (action === "close-search") closeSearch();
    else if (action === "retry") loadData(false);
    if (event.target === searchLayer) closeSearch();
  });

  searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !searchLayer.hidden) closeSearch(); });
  window.addEventListener("hashchange", () => { renderRoute(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  window.addEventListener("online", () => loadData(true));
  window.addEventListener("offline", () => { const connection = document.getElementById("connectionState"); connection.hidden = false; connection.textContent = "أنت غير متصل — يتم عرض البيانات المحفوظة."; });

  if (!location.hash) history.replaceState(null, "", "#home");
  restoreCache();
  loadData(Boolean(state.tournaments.length));
  subscribe();
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
