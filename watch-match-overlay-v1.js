(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-watch-match-overlay-v1' } },
  });

  const state = {
    assets: [],
    assetsLoaded: false,
    contextKey: '',
    pollTimer: 0,
    eventTimer: 0,
    fired: new Set(),
    events: [],
    match: null,
    teamA: null,
    teamB: null,
    tournament: null,
  };

  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const cleanUrl = (value = '') => {
    try {
      const u = new URL(value, location.href);
      u.hash = '';
      return u.href;
    } catch {
      return String(value || '').split('#')[0];
    }
  };

  const asNumber = (...values) => {
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  };

  const matchMinute = (m) => asNumber(
    m?.minute, m?.current_minute, m?.live_minute, m?.match_minute,
    m?.elapsed, m?.elapsed_minute, m?.clock_minute,
  );

  const eventMinute = (e) => asNumber(
    e?.minute, e?.event_minute, e?.match_minute, e?.elapsed_minute,
    e?.minute_number, e?.time_minute,
  );

  const eventType = (e) => String(
    e?.event_type ?? e?.type ?? e?.kind ?? e?.action ?? e?.event ?? '',
  ).trim().toLowerCase();

  const isGoal = (e) => {
    const t = eventType(e);
    return /goal|هدف|penalty_goal|penalty goal|ركلة جزاء.*هدف|هدف.*جزاء|own_goal|own goal|هدف عكسي/.test(t);
  };

  const eventTeamId = (e) =>
    e?.scoring_team_id ?? e?.beneficiary_team_id ?? e?.team_id ?? e?.club_id ?? null;

  const eventPlayerName = (e) => String(
    e?.player_name ?? e?.scorer_name ?? e?.player ?? e?.name ?? e?.description ?? '',
  ).trim();

  function markerSecond(e) {
    const raw = e?.video_second ?? e?.clip_second ?? e?.media_second ??
      e?.timestamp_seconds ?? e?.video_timestamp ?? e?.media_timestamp ?? null;
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') return raw;
    const text = String(raw).trim();
    if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
    const parts = text.split(':').map(Number);
    if (parts.some((n) => !Number.isFinite(n))) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  function statusLabel(match, asset) {
    const s = String(match?.status || '').trim();
    const streamLive = match?.stream_enabled && String(match?.stream_status || '').toLowerCase() === 'live';
    if (s === 'مباشر' || /live|مباشر/.test(s.toLowerCase()) || streamLive) return 'LIVE';
    if (s === 'انتهت' || /finished|final|ft|منته/.test(s.toLowerCase())) {
      const k = String(asset?.kind || '').toLowerCase();
      return /summary|recap|highlight|ملخص|هدف|goal/.test(k) ? 'ملخص' : 'FT';
    }
    return /summary|recap|highlight|ملخص|هدف|goal/.test(String(asset?.kind || '').toLowerCase()) ? 'ملخص' : (s || 'فيديو');
  }

  function logo(team) {
    return esc(team?.logo_url || 'assets/logo-placeholder.svg');
  }

  function ensureStyles() {
    if (document.getElementById('aghMatchOverlayStyles')) return;
    const style = document.createElement('style');
    style.id = 'aghMatchOverlayStyles';
    style.textContent = `
      .agh-watch-match-overlay{position:absolute;inset:0;z-index:3;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;padding:12px 12px 58px;color:#fff;font-family:Cairo,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.55)}
      .agh-watch-overlay-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-left:48px}
      .agh-watch-overlay-chip{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:5px 9px;border-radius:999px;background:rgba(5,8,7,.72);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(9px);font-size:10px;font-weight:900;white-space:nowrap}
      .agh-watch-overlay-status.is-live{background:#d92323;border-color:#ff5656;box-shadow:0 0 0 4px rgba(217,35,35,.12)}
      .agh-watch-overlay-status.is-live:before{content:"";width:6px;height:6px;border-radius:50%;background:#fff;animation:aghOverlayPulse 1.2s ease-in-out infinite}
      @keyframes aghOverlayPulse{50%{opacity:.25}}
      .agh-watch-overlay-bottom{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:9px;width:min(620px,96%);margin:0 auto;padding:9px 11px;border-radius:16px;background:linear-gradient(180deg,rgba(7,10,8,.74),rgba(5,7,6,.88));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(12px);box-shadow:0 12px 34px rgba(0,0,0,.24)}
      .agh-watch-overlay-team{display:flex;align-items:center;gap:7px;min-width:0;font-size:11px;font-weight:900}
      .agh-watch-overlay-team:last-child{justify-content:flex-end}
      .agh-watch-overlay-team img{width:29px;height:29px;flex:0 0 29px;object-fit:contain;border-radius:50%;background:#fff;padding:2px}
      .agh-watch-overlay-team span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .agh-watch-overlay-score{display:flex;align-items:center;justify-content:center;min-width:66px;padding:5px 8px;border-radius:10px;background:#0a0d0b;border:1px solid rgba(199,255,55,.26);font:1000 18px/1 Arial,sans-serif;direction:ltr;letter-spacing:.5px;color:#fff}
      .agh-watch-overlay-event{position:absolute;left:50%;bottom:126px;transform:translateX(-50%);width:min(390px,82%);padding:11px 13px;border-radius:15px;background:linear-gradient(135deg,rgba(13,17,14,.96),rgba(25,31,27,.96));border:1px solid rgba(199,255,55,.35);box-shadow:0 18px 45px rgba(0,0,0,.38);display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:9px;animation:aghGoalIn .3s ease both}
      .agh-watch-overlay-event[hidden]{display:none}
      .agh-watch-overlay-event-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(199,255,55,.13);font-size:20px}
      .agh-watch-overlay-event-copy{display:grid;gap:2px;min-width:0}
      .agh-watch-overlay-event-copy b{font-size:13px;color:#c7ff37}
      .agh-watch-overlay-event-copy span{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .agh-watch-overlay-event-minute{font-size:12px;font-weight:1000}
      @keyframes aghGoalIn{from{opacity:0;transform:translate(-50%,14px) scale(.97)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
      .agh-watch-close{z-index:6!important}
      @media(max-width:640px){
        .agh-watch-match-overlay{padding:9px 9px 52px}
        .agh-watch-overlay-top{gap:5px;padding-left:44px}
        .agh-watch-overlay-chip{font-size:8.5px;min-height:24px;padding:4px 7px}
        .agh-watch-overlay-bottom{gap:6px;padding:7px 8px;border-radius:13px;width:98%}
        .agh-watch-overlay-team{font-size:9px;gap:5px}
        .agh-watch-overlay-team img{width:24px;height:24px;flex-basis:24px}
        .agh-watch-overlay-score{min-width:55px;font-size:16px;padding:5px 6px}
        .agh-watch-overlay-event{bottom:106px;width:88%;grid-template-columns:34px minmax(0,1fr) auto;padding:9px 10px}
        .agh-watch-overlay-event-icon{width:34px;height:34px;font-size:18px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay() {
    const modal = document.getElementById('aghWatchModal');
    const player = modal?.querySelector('.agh-watch-player');
    if (!modal || !player) return null;
    let overlay = player.querySelector('.agh-watch-match-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'agh-watch-match-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="agh-watch-overlay-top">
        <span class="agh-watch-overlay-chip agh-watch-overlay-status" data-ov-status>فيديو</span>
        <span class="agh-watch-overlay-chip" data-ov-tournament>كأس أغشوركيت</span>
        <span class="agh-watch-overlay-chip" data-ov-minute>—</span>
      </div>
      <div class="agh-watch-overlay-event" data-ov-event hidden>
        <span class="agh-watch-overlay-event-icon">⚽</span>
        <span class="agh-watch-overlay-event-copy"><b>هدف!</b><span data-ov-event-text></span></span>
        <span class="agh-watch-overlay-event-minute" data-ov-event-minute></span>
      </div>
      <div class="agh-watch-overlay-bottom">
        <span class="agh-watch-overlay-team"><img data-ov-a-logo alt=""><span data-ov-a-name>الفريق الأول</span></span>
        <strong class="agh-watch-overlay-score" data-ov-score>0 - 0</strong>
        <span class="agh-watch-overlay-team"><span data-ov-b-name>الفريق الثاني</span><img data-ov-b-logo alt=""></span>
      </div>`;
    player.appendChild(overlay);
    return overlay;
  }

  function resetContext() {
    clearInterval(state.pollTimer);
    clearTimeout(state.eventTimer);
    state.pollTimer = 0;
    state.eventTimer = 0;
    state.contextKey = '';
    state.fired.clear();
    state.events = [];
    state.match = null;
    state.teamA = null;
    state.teamB = null;
    state.tournament = null;
    const overlay = document.querySelector('.agh-watch-match-overlay');
    if (overlay) overlay.hidden = true;
  }

  async function loadAssets() {
    if (state.assetsLoaded) return state.assets;
    const { data, error } = await db.from('media_assets').select('*').eq('entity_type', 'match').order('created_at', { ascending: false }).limit(200);
    if (!error) {
      state.assets = data || [];
      state.assetsLoaded = true;
    }
    return state.assets;
  }

  function assetForUrl(url) {
    const target = cleanUrl(url);
    return state.assets.find((a) => cleanUrl(a.public_url || '') === target) ||
      state.assets.find((a) => String(a.public_url || '').split('?')[0] === String(url || '').split('?')[0]);
  }

  async function one(table, id) {
    if (!id) return null;
    const { data, error } = await db.from(table).select('*').eq('id', id).maybeSingle();
    return error ? null : data;
  }

  async function loadEvents(matchId) {
    for (const table of ['match_events', 'match_timeline', 'events']) {
      try {
        const { data, error } = await db.from(table).select('*').eq('match_id', matchId);
        if (!error && Array.isArray(data)) return data.sort((a, b) => eventMinute(a) - eventMinute(b));
      } catch {}
    }
    return [];
  }

  async function resolvePlayerNames(events) {
    const ids = [...new Set(events.map((e) => e.player_id ?? e.scorer_id).filter(Boolean))];
    if (!ids.length) return events;
    try {
      const { data, error } = await db.from('players').select('id,name').in('id', ids);
      if (error) return events;
      const names = new Map((data || []).map((p) => [p.id, p.name]));
      events.forEach((e) => {
        if (!eventPlayerName(e)) e.__player_name = names.get(e.player_id ?? e.scorer_id) || '';
      });
    } catch {}
    return events;
  }

  function scoreFromMatch(m) {
    return {
      a: asNumber(m?.score_a, m?.team_a_score, m?.home_score, m?.score_home),
      b: asNumber(m?.score_b, m?.team_b_score, m?.away_score, m?.score_away),
    };
  }

  function timelineScores(events, match) {
    let a = 0;
    let b = 0;
    const teamAId = match?.team_a_id ?? match?.home_team_id;
    const teamBId = match?.team_b_id ?? match?.away_team_id;
    const goals = events.filter(isGoal).sort((x, y) => eventMinute(x) - eventMinute(y));

    goals.forEach((e) => {
      const explicitA = e?.score_a ?? e?.home_score ?? e?.team_a_score ?? e?.score_home;
      const explicitB = e?.score_b ?? e?.away_score ?? e?.team_b_score ?? e?.score_away;
      if (explicitA != null || explicitB != null) {
        a = asNumber(explicitA, a);
        b = asNumber(explicitB, b);
      } else {
        const tid = eventTeamId(e);
        if (tid && String(tid) === String(teamBId)) b += 1;
        else if (tid && String(tid) === String(teamAId)) a += 1;
        else if (e?.team_side === 'B' || e?.side === 'away') b += 1;
        else a += 1;
      }
      e.__score_a = a;
      e.__score_b = b;
    });
    return goals;
  }

  function renderOverlay() {
    const overlay = ensureOverlay();
    if (!overlay || !state.match) return;
    const match = state.match;
    const asset = assetForUrl(document.getElementById('aghWatchModal')?.dataset.url || '');
    const finalScore = scoreFromMatch(match);
    const status = statusLabel(match, asset);
    const minute = matchMinute(match);

    overlay.querySelector('[data-ov-status]').textContent = status;
    overlay.querySelector('[data-ov-status]').classList.toggle('is-live', status === 'LIVE');
    overlay.querySelector('[data-ov-tournament]').textContent = state.tournament?.short_name || state.tournament?.name || 'كأس أغشوركيت';
    overlay.querySelector('[data-ov-minute]').textContent = status === 'FT' ? 'نهاية' : (minute ? `${minute}'` : (status === 'ملخص' ? 'ملخص' : '—'));
    overlay.querySelector('[data-ov-a-name]').textContent = state.teamA?.name || 'الفريق الأول';
    overlay.querySelector('[data-ov-b-name]').textContent = state.teamB?.name || 'الفريق الثاني';
    overlay.querySelector('[data-ov-a-logo]').src = logo(state.teamA);
    overlay.querySelector('[data-ov-b-logo]').src = logo(state.teamB);
    overlay.querySelector('[data-ov-score]').textContent = `${finalScore.a} - ${finalScore.b}`;
    overlay.hidden = false;
  }

  function setScore(a, b, minute) {
    const overlay = ensureOverlay();
    if (!overlay) return;
    overlay.querySelector('[data-ov-score]').textContent = `${a} - ${b}`;
    if (minute) overlay.querySelector('[data-ov-minute]').textContent = `${minute}'`;
  }

  function showEvent(e) {
    const overlay = ensureOverlay();
    if (!overlay) return;
    const box = overlay.querySelector('[data-ov-event]');
    const player = eventPlayerName(e) || e.__player_name || 'هدف';
    const minute = eventMinute(e);
    const a = asNumber(e.__score_a, e.score_a, e.home_score);
    const b = asNumber(e.__score_b, e.score_b, e.away_score);
    const scoreText = `${state.teamA?.name || 'الفريق الأول'} ${a} - ${b} ${state.teamB?.name || 'الفريق الثاني'}`;
    box.querySelector('[data-ov-event-text]').textContent = `${player} · ${scoreText}`;
    box.querySelector('[data-ov-event-minute]').textContent = minute ? `${minute}'` : '';
    box.hidden = false;
    box.style.animation = 'none';
    void box.offsetHeight;
    box.style.animation = '';
    clearTimeout(state.eventTimer);
    state.eventTimer = setTimeout(() => { box.hidden = true; }, 3200);
  }

  function wireTimeline(video, asset) {
    state.fired.clear();
    const goals = timelineScores(state.events, state.match);
    if (!goals.length) return;

    const assetEventId = asset?.event_id ?? asset?.match_event_id ?? null;
    const assetKind = String(asset?.kind || '').toLowerCase();
    const goalClip = /goal|هدف/.test(assetKind) || /هدف/.test(String(asset?.caption || ''));

    const markers = goals.map((e, index) => {
      let second = markerSecond(e);
      if (second == null && assetEventId && String(e.id) === String(assetEventId)) second = 0.8;
      return { e, index, second };
    });

    const explicit = markers.filter((x) => x.second != null);
    if (!explicit.length && goalClip) {
      const candidate = goals.find((e) => {
        const caption = String(asset?.caption || '');
        const player = eventPlayerName(e) || e.__player_name || '';
        return player && caption.includes(player);
      }) || goals[0];
      const idx = goals.indexOf(candidate);
      explicit.push({ e: candidate, index: idx, second: 0.8 });
    }

    function onTime() {
      const current = video.currentTime || 0;
      let usedExplicit = explicit.length > 0;

      if (!usedExplicit && video.duration >= 1500) {
        const maxMinute = Math.max(40, ...goals.map(eventMinute));
        markers.forEach((m) => {
          m.second = Math.max(0.5, (eventMinute(m.e) / maxMinute) * video.duration);
        });
        usedExplicit = true;
      }

      if (!usedExplicit) return;
      markers.concat(explicit.filter((x) => !markers.includes(x))).forEach((m) => {
        if (m.second == null || current < m.second || state.fired.has(m.index)) return;
        state.fired.add(m.index);
        setScore(m.e.__score_a, m.e.__score_b, eventMinute(m.e));
        showEvent(m.e);
      });
    }

    video.__aghOverlayTimeHandler && video.removeEventListener('timeupdate', video.__aghOverlayTimeHandler);
    video.__aghOverlayTimeHandler = onTime;
    video.addEventListener('timeupdate', onTime);
  }

  async function refreshLive(matchId) {
    const fresh = await one('matches', matchId);
    if (!fresh || state.contextKey !== String(matchId)) return;
    state.match = fresh;
    renderOverlay();
  }

  async function attachContext(url) {
    const modal = document.getElementById('aghWatchModal');
    if (!modal || modal.hidden || !url) return;
    await loadAssets();
    const asset = assetForUrl(url);
    const matchId = asset?.entity_id ?? modal.dataset.matchId ?? null;
    if (!matchId) {
      const overlay = ensureOverlay();
      if (overlay) overlay.hidden = true;
      return;
    }

    const contextKey = String(matchId);
    state.contextKey = contextKey;

    const match = await one('matches', matchId);
    if (!match || state.contextKey !== contextKey) return;

    const teamAId = match.team_a_id ?? match.home_team_id;
    const teamBId = match.team_b_id ?? match.away_team_id;
    const [teamA, teamB, tournament, events] = await Promise.all([
      one('teams', teamAId),
      one('teams', teamBId),
      one('tournaments', match.tournament_id),
      loadEvents(matchId),
    ]);
    if (state.contextKey !== contextKey) return;

    state.match = match;
    state.teamA = teamA;
    state.teamB = teamB;
    state.tournament = tournament;
    state.events = await resolvePlayerNames(events);

    renderOverlay();

    const video = modal.querySelector('video');
    if (video) wireTimeline(video, asset);

    const status = statusLabel(match, asset);
    if (status === 'LIVE') {
      clearInterval(state.pollTimer);
      state.pollTimer = setInterval(() => refreshLive(matchId), 5000);
    }
  }

  function watchModal() {
    ensureStyles();
    const observer = new MutationObserver(() => {
      const modal = document.getElementById('aghWatchModal');
      if (!modal) return;
      if (modal.hidden) {
        resetContext();
        return;
      }
      const url = modal.dataset.url || modal.querySelector('video')?.currentSrc || modal.querySelector('video')?.src || '';
      if (url) setTimeout(() => attachContext(url), 20);
    });

    const bodyObserver = new MutationObserver(() => {
      const modal = document.getElementById('aghWatchModal');
      if (!modal || modal.dataset.overlayObserved === '1') return;
      modal.dataset.overlayObserved = '1';
      observer.observe(modal, { attributes: true, attributeFilter: ['hidden', 'data-url'] });
      if (!modal.hidden) {
        const url = modal.dataset.url || modal.querySelector('video')?.src || '';
        if (url) attachContext(url);
      }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
    const modal = document.getElementById('aghWatchModal');
    if (modal) {
      modal.dataset.overlayObserved = '1';
      observer.observe(modal, { attributes: true, attributeFilter: ['hidden', 'data-url'] });
    }
  }

  watchModal();
})();