(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-watch-match-overlay-v2' } },
  });

  const state = {
    assets: [],
    assetsLoaded: false,
    contextKey: '',
    pollTimer: 0,
    eventTimer: 0,
    fired: new Set(),
    seenEventIds: new Set(),
    events: [],
    match: null,
    teamA: null,
    teamB: null,
    tournament: null,
    asset: null,
  };

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
      if (value === null || value === undefined || value === '') continue;
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

  function eventMeta(e) {
    const t = eventType(e);
    if (/هدف عكسي|own[_ ]?goal/.test(t)) return { key: 'goal', icon: '⚽', label: 'هدف عكسي!' };
    if (/ركلة جزاء مسجلة|penalty[_ ]?goal|penalty goal/.test(t)) return { key: 'goal', icon: '⚽', label: 'هدف من ركلة جزاء!' };
    if (/هدف|goal/.test(t)) return { key: 'goal', icon: '⚽', label: 'هدف!' };
    if (/بطاقة صفراء|yellow/.test(t)) return { key: 'yellow', icon: '🟨', label: 'بطاقة صفراء' };
    if (/بطاقة حمراء|red/.test(t)) return { key: 'red', icon: '🟥', label: 'بطاقة حمراء' };
    if (/تبديل|substitution|sub\b/.test(t)) return { key: 'sub', icon: '🔁', label: 'تبديل' };
    if (/بداية المباراة|kick.?off|match start/.test(t)) return { key: 'start', icon: '▶', label: 'بداية المباراة' };
    if (/نهاية الشوط|half.?time|end half/.test(t)) return { key: 'half', icon: '⏸', label: 'نهاية الشوط' };
    if (/نهاية المباراة|full.?time|match end/.test(t)) return { key: 'final', icon: '✅', label: 'نهاية المباراة' };
    if (/var/.test(t)) return { key: 'var', icon: '📺', label: 'VAR' };
    if (/تمريرة حاسمة|assist/.test(t)) return { key: 'assist', icon: '🎯', label: 'تمريرة حاسمة' };
    return null;
  }

  const isGoal = (e) => eventMeta(e)?.key === 'goal';

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
    const k = `${asset?.kind || ''} ${asset?.caption || ''}`.toLowerCase();
    if (/summary|recap|highlight|ملخص|لقطة|هدف|goal/.test(k)) return 'ملخص';
    if (s === 'انتهت' || /finished|final|ft|منته/.test(s.toLowerCase())) return 'FT';
    return s || 'فيديو';
  }

  function ensureStyles() {
    if (document.getElementById('aghMatchOverlayStyles')) return;
    const style = document.createElement('style');
    style.id = 'aghMatchOverlayStyles';
    style.textContent = `
      .agh-watch-match-overlay{position:absolute;inset:0;z-index:3;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;padding:12px 12px 58px;color:#fff;font-family:Cairo,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.58)}
      .agh-watch-overlay-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-left:48px}
      .agh-watch-overlay-chip{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:5px 9px;border-radius:999px;background:rgba(5,8,7,.74);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(9px);font-size:10px;font-weight:900;white-space:nowrap}
      .agh-watch-overlay-status.is-live{background:#d92323;border-color:#ff5656;box-shadow:0 0 0 4px rgba(217,35,35,.12)}
      .agh-watch-overlay-status.is-live:before{content:"";width:6px;height:6px;border-radius:50%;background:#fff;animation:aghOverlayPulse 1.2s ease-in-out infinite}
      @keyframes aghOverlayPulse{50%{opacity:.25}}
      .agh-watch-overlay-bottom{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:9px;width:min(620px,96%);margin:0 auto;padding:9px 11px;border-radius:16px;background:linear-gradient(180deg,rgba(7,10,8,.76),rgba(5,7,6,.9));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(12px);box-shadow:0 12px 34px rgba(0,0,0,.24)}
      .agh-watch-overlay-team{display:flex;align-items:center;gap:7px;min-width:0;font-size:11px;font-weight:900}
      .agh-watch-overlay-team:last-child{justify-content:flex-end}
      .agh-watch-overlay-team img{width:29px;height:29px;flex:0 0 29px;object-fit:contain;border-radius:50%;background:#fff;padding:2px}
      .agh-watch-overlay-team span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .agh-watch-overlay-score{display:flex;align-items:center;justify-content:center;min-width:66px;padding:5px 8px;border-radius:10px;background:#0a0d0b;border:1px solid rgba(199,255,55,.26);font:1000 18px/1 Arial,sans-serif;direction:ltr;letter-spacing:.5px;color:#fff;transition:transform .2s,color .2s}
      .agh-watch-overlay-score.is-updated{transform:scale(1.14);color:#c7ff37}
      .agh-watch-overlay-event{position:absolute;left:50%;bottom:126px;transform:translateX(-50%);width:min(410px,84%);padding:11px 13px;border-radius:15px;background:linear-gradient(135deg,rgba(13,17,14,.96),rgba(25,31,27,.96));border:1px solid rgba(199,255,55,.35);box-shadow:0 18px 45px rgba(0,0,0,.38);display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:9px;animation:aghEventIn .3s ease both}
      .agh-watch-overlay-event[hidden]{display:none}
      .agh-watch-overlay-event[data-event-kind="yellow"]{border-color:rgba(255,214,47,.55)}
      .agh-watch-overlay-event[data-event-kind="red"]{border-color:rgba(255,64,64,.58)}
      .agh-watch-overlay-event[data-event-kind="sub"]{border-color:rgba(83,207,255,.52)}
      .agh-watch-overlay-event-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(199,255,55,.12);font-size:20px}
      .agh-watch-overlay-event-copy{display:grid;gap:2px;min-width:0}
      .agh-watch-overlay-event-copy b{font-size:13px;color:#c7ff37}
      .agh-watch-overlay-event[data-event-kind="yellow"] .agh-watch-overlay-event-copy b{color:#ffd72f}
      .agh-watch-overlay-event[data-event-kind="red"] .agh-watch-overlay-event-copy b{color:#ff6666}
      .agh-watch-overlay-event[data-event-kind="sub"] .agh-watch-overlay-event-copy b{color:#64d9ff}
      .agh-watch-overlay-event-copy span{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .agh-watch-overlay-event-minute{font-size:12px;font-weight:1000}
      @keyframes aghEventIn{from{opacity:0;transform:translate(-50%,14px) scale(.97)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
      .agh-watch-close{z-index:6!important}
      @media(max-width:640px){
        .agh-watch-match-overlay{padding:9px 9px 52px}
        .agh-watch-overlay-top{gap:5px;padding-left:44px}
        .agh-watch-overlay-chip{font-size:8.5px;min-height:24px;padding:4px 7px}
        .agh-watch-overlay-bottom{gap:6px;padding:7px 8px;border-radius:13px;width:98%}
        .agh-watch-overlay-team{font-size:9px;gap:5px}
        .agh-watch-overlay-team img{width:24px;height:24px;flex-basis:24px}
        .agh-watch-overlay-score{min-width:55px;font-size:16px;padding:5px 6px}
        .agh-watch-overlay-event{bottom:106px;width:90%;grid-template-columns:34px minmax(0,1fr) auto;padding:9px 10px}
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
        <span class="agh-watch-overlay-event-icon" data-ov-event-icon>⚽</span>
        <span class="agh-watch-overlay-event-copy"><b data-ov-event-title>هدف!</b><span data-ov-event-text></span></span>
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
    state.seenEventIds.clear();
    state.events = [];
    state.match = null;
    state.teamA = null;
    state.teamB = null;
    state.tournament = null;
    state.asset = null;
    const overlay = document.querySelector('.agh-watch-match-overlay');
    if (overlay) overlay.hidden = true;
  }

  async function loadAssets() {
    if (state.assetsLoaded) return state.assets;
    const { data, error } = await db.from('media_assets').select('*').eq('entity_type', 'match').order('created_at', { ascending: false }).limit(220);
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
    try {
      const { data, error } = await db.from('match_events').select('*').eq('match_id', matchId).order('minute', { ascending: true }).order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) return data;
    } catch {}
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

  function scoreForAsset(asset, match) {
    if (asset && (asset.score_a != null || asset.score_b != null)) {
      return { a: asNumber(asset.score_a), b: asNumber(asset.score_b) };
    }
    return scoreFromMatch(match);
  }

  function minuteForAsset(asset, match) {
    if (asset?.captured_minute != null) return asNumber(asset.captured_minute);
    return matchMinute(match);
  }

  function timelineScores(events, match) {
    let a = 0;
    let b = 0;
    const teamAId = match?.team_a_id ?? match?.home_team_id;
    const teamBId = match?.team_b_id ?? match?.away_team_id;
    const sorted = [...events].sort((x, y) => eventMinute(x) - eventMinute(y));

    sorted.forEach((e) => {
      if (!isGoal(e)) {
        e.__score_a = a;
        e.__score_b = b;
        return;
      }
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
    return sorted;
  }

  function renderOverlay() {
    const overlay = ensureOverlay();
    if (!overlay || !state.match) return;
    const match = state.match;
    const asset = state.asset;
    const score = scoreForAsset(asset, match);
    const status = statusLabel(match, asset);
    const minute = minuteForAsset(asset, match);

    overlay.querySelector('[data-ov-status]').textContent = status;
    overlay.querySelector('[data-ov-status]').classList.toggle('is-live', status === 'LIVE');
    overlay.querySelector('[data-ov-tournament]').textContent = state.tournament?.short_name || state.tournament?.name || 'كأس أغشوركيت';
    overlay.querySelector('[data-ov-minute]').textContent = status === 'FT' ? 'نهاية' : (minute ? `${minute}'` : (status === 'ملخص' ? 'ملخص' : '—'));
    overlay.querySelector('[data-ov-a-name]').textContent = state.teamA?.name || 'الفريق الأول';
    overlay.querySelector('[data-ov-b-name]').textContent = state.teamB?.name || 'الفريق الثاني';
    overlay.querySelector('[data-ov-a-logo]').src = state.teamA?.logo_url || 'assets/logo-placeholder.svg';
    overlay.querySelector('[data-ov-b-logo]').src = state.teamB?.logo_url || 'assets/logo-placeholder.svg';
    overlay.querySelector('[data-ov-score]').textContent = `${score.a} - ${score.b}`;
    overlay.hidden = false;
  }

  function setScore(a, b, minute) {
    const overlay = ensureOverlay();
    if (!overlay) return;
    const score = overlay.querySelector('[data-ov-score]');
    score.textContent = `${a} - ${b}`;
    score.classList.remove('is-updated');
    void score.offsetHeight;
    score.classList.add('is-updated');
    setTimeout(() => score.classList.remove('is-updated'), 700);
    if (minute) overlay.querySelector('[data-ov-minute]').textContent = `${minute}'`;
  }

  function eventDetails(e) {
    const meta = eventMeta(e);
    if (!meta) return null;
    const player = eventPlayerName(e) || e.__player_name || '';
    const note = String(e?.note || '').trim();
    if (meta.key === 'goal') {
      const a = asNumber(e.__score_a);
      const b = asNumber(e.__score_b);
      const scorer = player || note || 'تم تسجيل هدف';
      return { ...meta, text: `${scorer} · ${state.teamA?.name || 'الفريق الأول'} ${a} - ${b} ${state.teamB?.name || 'الفريق الثاني'}` };
    }
    if (meta.key === 'final') {
      const score = scoreFromMatch(state.match);
      return { ...meta, text: `${state.teamA?.name || 'الفريق الأول'} ${score.a} - ${score.b} ${state.teamB?.name || 'الفريق الثاني'}` };
    }
    return { ...meta, text: player || note || meta.label };
  }

  function showEvent(e) {
    const details = eventDetails(e);
    const overlay = ensureOverlay();
    if (!overlay || !details) return;
    const box = overlay.querySelector('[data-ov-event]');
    const minute = eventMinute(e);
    box.dataset.eventKind = details.key;
    box.querySelector('[data-ov-event-icon]').textContent = details.icon;
    box.querySelector('[data-ov-event-title]').textContent = details.label;
    box.querySelector('[data-ov-event-text]').textContent = details.text;
    box.querySelector('[data-ov-event-minute]').textContent = minute ? `${minute}'` : '';
    box.hidden = false;
    box.style.animation = 'none';
    void box.offsetHeight;
    box.style.animation = '';
    clearTimeout(state.eventTimer);
    state.eventTimer = setTimeout(() => { box.hidden = true; }, details.key === 'goal' ? 3400 : 2600);
  }

  function eventMatchesClip(e, asset) {
    if (!asset) return false;
    const minute = asNumber(asset.captured_minute);
    if (minute && eventMinute(e) === minute) return true;
    const caption = String(asset.caption || '').toLowerCase();
    const meta = eventMeta(e);
    const player = (eventPlayerName(e) || e.__player_name || '').toLowerCase();
    if (player && caption.includes(player)) return true;
    if (!meta) return false;
    if (meta.key === 'goal' && /هدف|goal/.test(caption)) return true;
    if (meta.key === 'yellow' && /بطاقة صفراء|yellow/.test(caption)) return true;
    if (meta.key === 'red' && /بطاقة حمراء|red/.test(caption)) return true;
    if (meta.key === 'sub' && /تبديل|sub/.test(caption)) return true;
    return false;
  }

  function wireTimeline(video, asset) {
    state.fired.clear();
    const events = timelineScores(state.events, state.match).filter((e) => eventMeta(e));
    if (!events.length) return;

    const markers = events.map((e, index) => ({ e, index, second: markerSecond(e) }));
    const explicit = markers.filter((m) => m.second != null);
    const clipEvents = events.filter((e) => eventMatchesClip(e, asset));

    if (!explicit.length && clipEvents.length) {
      clipEvents.forEach((e, i) => {
        const idx = events.indexOf(e);
        explicit.push({ e, index: idx, second: 0.8 + i * 3.5 });
      });
    }

    function onTime() {
      const current = video.currentTime || 0;
      let active = explicit.length > 0;

      if (!active && video.duration >= 1500) {
        const maxMinute = Math.max(40, ...events.map(eventMinute));
        markers.forEach((m) => {
          m.second = Math.max(0.5, (eventMinute(m.e) / maxMinute) * video.duration);
        });
        active = true;
      }

      if (!active) return;
      const schedule = [...markers.filter((m) => m.second != null)];
      explicit.forEach((m) => {
        if (!schedule.some((x) => x.e === m.e && x.second === m.second)) schedule.push(m);
      });

      schedule.forEach((m) => {
        if (current < m.second || state.fired.has(m.index)) return;
        state.fired.add(m.index);
        if (isGoal(m.e)) setScore(m.e.__score_a, m.e.__score_b, eventMinute(m.e));
        else if (eventMinute(m.e)) ensureOverlay()?.querySelector('[data-ov-minute]')?.replaceChildren(document.createTextNode(`${eventMinute(m.e)}'`));
        showEvent(m.e);
      });
    }

    if (video.__aghOverlayTimeHandler) video.removeEventListener('timeupdate', video.__aghOverlayTimeHandler);
    video.__aghOverlayTimeHandler = onTime;
    video.addEventListener('timeupdate', onTime);

    const initial = scoreForAsset(asset, state.match);
    setScore(initial.a, initial.b, minuteForAsset(asset, state.match));
  }

  async function refreshLive(matchId) {
    let fresh, freshEvents;
    try {
      const response = await fetch('/api/live-match-state', { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return;
      const feed = await response.json();
      fresh = feed.matches?.find(match => match.id === matchId);
      freshEvents = feed.events?.filter(event => event.match_id === matchId) || [];
    } catch { return; }
    if (!fresh || state.contextKey !== String(matchId)) return;
    state.match = fresh;
    state.asset = null;
    renderOverlay();

    const normalized = await resolvePlayerNames(freshEvents);
    const scored = timelineScores(normalized, fresh);
    const unseen = scored.filter((e) => e.id && !state.seenEventIds.has(e.id) && eventMeta(e));
    scored.forEach((e) => { if (e.id) state.seenEventIds.add(e.id); });
    state.events = normalized;
    if (unseen.length) {
      const latest = unseen[unseen.length - 1];
      if (isGoal(latest)) {
        const score = scoreFromMatch(fresh);
        setScore(score.a, score.b, matchMinute(fresh) || eventMinute(latest));
      }
      showEvent(latest);
    }
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

    const [teamA, teamB, tournament, events] = await Promise.all([
      one('teams', match.team_a_id),
      one('teams', match.team_b_id),
      one('tournaments', match.tournament_id),
      loadEvents(matchId),
    ]);
    if (state.contextKey !== contextKey) return;

    state.match = match;
    state.teamA = teamA;
    state.teamB = teamB;
    state.tournament = tournament;
    state.asset = asset;
    state.events = await resolvePlayerNames(events);
    state.seenEventIds = new Set(state.events.map((e) => e.id).filter(Boolean));

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

    const observeModal = (modal) => {
      if (!modal || modal.dataset.overlayObserved === '1') return;
      modal.dataset.overlayObserved = '1';
      const observer = new MutationObserver(() => {
        if (modal.hidden) {
          resetContext();
          return;
        }
        const url = modal.dataset.url || modal.querySelector('video')?.currentSrc || modal.querySelector('video')?.src || '';
        if (url) setTimeout(() => attachContext(url), 20);
      });
      observer.observe(modal, { attributes: true, attributeFilter: ['hidden', 'data-url'] });
      if (!modal.hidden) {
        const url = modal.dataset.url || modal.querySelector('video')?.src || '';
        if (url) attachContext(url);
      }
    };

    const bodyObserver = new MutationObserver(() => observeModal(document.getElementById('aghWatchModal')));
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    observeModal(document.getElementById('aghWatchModal'));
  }

  watchModal();
})();
