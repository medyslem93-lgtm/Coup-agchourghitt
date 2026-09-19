(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-fan-experience' } },
  });

  const KEYS = {
    profile: 'agh_fan_profile_v1',
    teams: 'aghchorguit-favorite-teams',
    players: 'agh_followed_players_v1',
    savedMedia: 'agh_saved_media_v1',
  };

  const state = { teams: [], players: [], matches: [], tournaments: [], media: [], loaded: false, loading: false };
  const main = document.getElementById('appMain');
  if (!main) return;

  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const img = (url, alt = '') => `<img src="${esc(url || 'assets/tournament.jpg')}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/tournament.jpg'">`;
  const arrayStore = (key) => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  const saveArray = (key, values) => localStorage.setItem(key, JSON.stringify([...new Set(values)]));
  const teamById = (id) => state.teams.find((x) => x.id === id);
  const playerById = (id) => state.players.find((x) => x.id === id);
  const tournamentById = (id) => state.tournaments.find((x) => x.id === id);
  const route = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
  const matchTime = (m) => Date.parse(`${m.match_date || '9999-12-31'}T${String(m.match_time || '23:59').slice(0,5)}:00Z`) || Number.MAX_SAFE_INTEGER;

  function profile() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEYS.profile) || 'null');
      if (stored?.id) return stored;
    } catch {}
    const p = { id: crypto?.randomUUID?.() || `fan-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: 'مشجع أغشوركيت', createdAt: new Date().toISOString() };
    localStorage.setItem(KEYS.profile, JSON.stringify(p));
    return p;
  }

  function setProfile(next) {
    localStorage.setItem(KEYS.profile, JSON.stringify({ ...profile(), ...next }));
  }

  function initials(name = '') {
    return String(name).trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('') || 'م';
  }

  async function load() {
    if (state.loaded || state.loading) return;
    state.loading = true;
    try {
      const [teams, players, matches, tournaments, media] = await Promise.all([
        db.from('teams').select('id,name,logo_url,tournament_id,category').order('name'),
        db.from('players').select('id,name,photo_url,team_id,number,position').order('name'),
        db.from('matches').select('id,tournament_id,team_a_id,team_b_id,status,match_date,match_time,score_a,score_b,stream_enabled,stream_status,stream_type,stream_url,recap_published,recap_title').order('match_date', { ascending: false }),
        db.from('tournaments').select('id,name,short_name,slug,logo_url,accent_color,season').order('sort_order'),
        db.from('media_assets').select('id,entity_id,entity_type,kind,media_type,public_url,caption,created_at').eq('entity_type', 'match').order('created_at', { ascending: false }).limit(120),
      ]);
      state.teams = teams.data || [];
      state.players = players.data || [];
      state.matches = matches.data || [];
      state.tournaments = tournaments.data || [];
      state.media = media.data || [];
      state.loaded = true;
    } catch (error) {
      console.warn('Fan experience data unavailable', error);
    } finally {
      state.loading = false;
    }
  }

  function setHash(value) { location.hash = value; }

  function formatDate(m) {
    if (!m?.match_date) return 'موعد غير محدد';
    try { return new Intl.DateTimeFormat('ar-MR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${m.match_date}T12:00:00Z`)); }
    catch { return m.match_date; }
  }

  function matchLabel(m) {
    const a = teamById(m.team_a_id)?.name || 'فريق';
    const b = teamById(m.team_b_id)?.name || 'فريق';
    return `${a} × ${b}`;
  }

  function matchMini(m) {
    const a = teamById(m.team_a_id) || {};
    const b = teamById(m.team_b_id) || {};
    const live = m.status === 'مباشر' || (m.stream_enabled && m.stream_status === 'live');
    const score = m.status === 'قادمة' ? String(m.match_time || '').slice(0,5) : `${Number(m.score_a || 0)} - ${Number(m.score_b || 0)}`;
    return `<button class="fan-match-mini" type="button" data-fan-hash="match/${esc(m.id)}"><span class="fan-match-state ${live ? 'is-live' : ''}">${live ? 'LIVE' : esc(formatDate(m))}</span><span class="fan-match-teams"><i>${img(a.logo_url,a.name)}</i><b>${esc(a.name || '—')}</b><strong dir="ltr">${esc(score)}</strong><b>${esc(b.name || '—')}</b><i>${img(b.logo_url,b.name)}</i></span></button>`;
  }

  function mediaCard(asset) {
    const m = state.matches.find((x) => x.id === asset.entity_id);
    if (!m) return '';
    const url = asset.public_url || '';
    const video = asset.media_type === 'video' || String(asset.kind || '').includes('video') || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
    const saved = arrayStore(KEYS.savedMedia).includes(asset.id);
    return `<article class="fan-media-card"><button type="button" class="fan-media-preview" data-fan-hash="match/${esc(m.id)}/summary">${video ? `<video src="${esc(url)}" muted playsinline preload="metadata"></video><span class="fan-play">▶</span>` : img(url, asset.caption || matchLabel(m))}<span class="fan-media-tag">${video ? 'فيديو' : 'صورة'}</span></button><div class="fan-media-copy"><b>${esc(asset.caption || matchLabel(m))}</b><small>${esc(matchLabel(m))}</small><button type="button" data-save-media="${esc(asset.id)}">${saved ? '✓ محفوظ' : '♡ حفظ'}</button></div></article>`;
  }

  function liveCards() {
    return state.matches.filter((m) => m.status === 'مباشر' || (m.stream_enabled && m.stream_status === 'live')).sort((a,b) => matchTime(a)-matchTime(b));
  }

  function recaps() {
    const matchIdsWithMedia = new Set(state.media.map((a) => a.entity_id));
    return state.matches.filter((m) => m.recap_published || matchIdsWithMedia.has(m.id)).sort((a,b) => matchTime(b)-matchTime(a));
  }

  function favoriteTeams() { return arrayStore(KEYS.teams).map(teamById).filter(Boolean); }
  function followedPlayers() { return arrayStore(KEYS.players).map(playerById).filter(Boolean); }

  function renderWatch() {
    const live = liveCards();
    const assets = state.media.slice(0, 24);
    const recapMatches = recaps().slice(0, 10);
    main.innerHTML = `<div class="page-shell fan-page"><section class="fan-page-head"><span>WATCH</span><h1>البث والملخصات</h1><p>المباشر، الأهداف، اللقطات والملخصات الرسمية في مكان واحد.</p></section>${live.length ? `<section class="fan-section"><div class="fan-section-title"><div><span class="fan-live-dot"></span><b>مباشر الآن</b></div></div><div class="fan-live-grid">${live.map(matchMini).join('')}</div></section>` : `<section class="fan-empty-live"><span>●</span><div><b>لا يوجد بث مباشر الآن</b><small>سيظهر البث هنا تلقائيًا فور تشغيله من لوحة الإدارة.</small></div></section>`}<section class="fan-section"><div class="fan-section-title"><b>أحدث الملخصات</b><button type="button" data-fan-hash="matches">كل المباريات</button></div><div class="fan-recap-strip">${recapMatches.map(matchMini).join('') || '<p class="fan-muted">لا توجد ملخصات منشورة بعد.</p>'}</div></section><section class="fan-section"><div class="fan-section-title"><b>آخر الفيديوهات واللقطات</b></div><div class="fan-media-grid">${assets.map(mediaCard).join('') || '<p class="fan-muted">ستظهر الفيديوهات والصور هنا عند نشرها.</p>'}</div></section></div>`;
  }

  function profileStats() {
    const teams = favoriteTeams();
    const players = followedPlayers();
    const saved = arrayStore(KEYS.savedMedia).length;
    const since = profile().createdAt ? new Date(profile().createdAt).getFullYear() : new Date().getFullYear();
    return { teams, players, saved, since };
  }

  function renderProfile() {
    const p = profile();
    const s = profileStats();
    main.innerHTML = `<div class="page-shell fan-page"><section class="fan-profile-hero"><div class="fan-avatar">${esc(initials(p.name))}</div><div class="fan-profile-copy"><span>FAN PROFILE</span><h1>${esc(p.name)}</h1><p>عضو مجتمع كأس أغشوركيت منذ ${s.since}</p></div><button class="secondary-button" type="button" data-edit-fan>تعديل الملف</button><div class="fan-profile-metrics"><div><strong>${s.teams.length}</strong><span>فرق أتابعها</span></div><div><strong>${s.players.length}</strong><span>لاعبون أتابعهم</span></div><div><strong>${s.saved}</strong><span>محفوظات</span></div></div></section><section class="fan-section"><div class="fan-section-title"><b>فرقي المفضلة</b><button type="button" data-fan-hash="teams">إضافة فريق</button></div>${s.teams.length ? `<div class="fan-follow-grid">${s.teams.map((t) => `<button type="button" data-fan-hash="team/${esc(t.id)}"><i>${img(t.logo_url,t.name)}</i><span><b>${esc(t.name)}</b><small>${esc(t.category || tournamentById(t.tournament_id)?.short_name || '')}</small></span></button>`).join('')}</div>` : '<div class="fan-empty">لم تختر فريقًا مفضلاً بعد. افتح صفحة أي فريق واضغط «أضف للمفضلة».</div>'}</section><section class="fan-section"><div class="fan-section-title"><b>اللاعبون الذين أتابعهم</b></div>${s.players.length ? `<div class="fan-follow-grid">${s.players.map((p) => `<button type="button" data-fan-hash="player/${esc(p.id)}"><i>${p.photo_url ? img(p.photo_url,p.name) : `<span>${esc(initials(p.name))}</span>`}</i><span><b>${esc(p.name)}</b><small>${esc(teamById(p.team_id)?.name || '')}</small></span></button>`).join('')}</div>` : '<div class="fan-empty">عند متابعة أي لاعب سيظهر هنا مباشرة.</div>'}</section></div>`;
  }

  function renderFollows() {
    const teams = favoriteTeams();
    const players = followedPlayers();
    const teamIds = new Set(teams.map((t) => t.id));
    const playerIds = new Set(players.map((p) => p.id));
    const relatedMatches = state.matches.filter((m) => teamIds.has(m.team_a_id) || teamIds.has(m.team_b_id)).sort((a,b) => matchTime(b)-matchTime(a)).slice(0,12);
    const relatedMedia = state.media.filter((asset) => {
      const m = state.matches.find((x) => x.id === asset.entity_id);
      return m && (teamIds.has(m.team_a_id) || teamIds.has(m.team_b_id));
    }).slice(0,12);
    main.innerHTML = `<div class="page-shell fan-page"><section class="fan-page-head"><span>FOR YOU</span><h1>متابعاتي</h1><p>كل ما يتعلق بفرقك ولاعبيك المفضلين.</p></section>${!teams.length && !players.length ? '<div class="fan-empty fan-empty-large">ابدأ بمتابعة فريق أو لاعب، وسنبني لك صفحة مخصصة هنا.</div>' : ''}${relatedMatches.length ? `<section class="fan-section"><div class="fan-section-title"><b>مباريات فرقك</b></div><div class="fan-live-grid">${relatedMatches.map(matchMini).join('')}</div></section>` : ''}${relatedMedia.length ? `<section class="fan-section"><div class="fan-section-title"><b>لقطات قد تهمك</b></div><div class="fan-media-grid">${relatedMedia.map(mediaCard).join('')}</div></section>` : ''}${players.length ? `<section class="fan-section"><div class="fan-section-title"><b>اللاعبون المتابعون</b></div><div class="fan-follow-grid">${players.map((p) => `<button type="button" data-fan-hash="player/${esc(p.id)}"><i>${p.photo_url ? img(p.photo_url,p.name) : `<span>${esc(initials(p.name))}</span>`}</i><span><b>${esc(p.name)}</b><small>${esc(teamById(p.team_id)?.name || '')}</small></span></button>`).join('')}</div></section>` : ''}</div>`;
  }

  function customizeNavigation() {
    const mobile = document.querySelector('.mobile-navigation');
    if (mobile && mobile.dataset.fanNav !== '1') {
      mobile.dataset.fanNav = '1';
      mobile.innerHTML = `<button data-fan-hash="home"><span>الرئيسية</span></button><button data-fan-hash="matches"><span>المباريات</span></button><button class="nav-primary fan-watch-nav" data-fan-hash="watch"><span>شاهد</span></button><button data-fan-hash="follows"><span>متابعاتي</span></button><button data-fan-hash="profile"><span>ملفي</span></button>`;
    }
    const desktop = document.querySelector('.desktop-navigation');
    if (desktop && !desktop.querySelector('[data-fan-hash="watch"]')) {
      desktop.insertAdjacentHTML('beforeend', '<button data-fan-hash="watch">شاهد</button><button data-fan-hash="profile">ملفي</button>');
    }
    document.querySelectorAll('.mobile-navigation [data-fan-hash], .desktop-navigation [data-fan-hash]').forEach((button) => {
      button.classList.toggle('active', button.dataset.fanHash === route());
    });
  }

  function enhancePlayerPage() {
    if (route() !== 'player') return;
    const id = location.hash.replace(/^#\/?player\//, '').split('/')[0];
    if (!id || !playerById(id)) return;
    const actions = main.querySelector('.profile-actions');
    if (!actions || actions.querySelector('[data-follow-player]')) return;
    const followed = arrayStore(KEYS.players).includes(id);
    actions.insertAdjacentHTML('afterbegin', `<button class="secondary-button" type="button" data-follow-player="${esc(id)}">${followed ? '✓ أتابعه' : '+ متابعة اللاعب'}</button>`);
  }

  function injectHomePersonal() {
    if (route() !== 'home' || main.querySelector('[data-fan-home]')) return;
    const shell = main.querySelector('.page-shell');
    const hero = shell?.querySelector('.hero-layout');
    if (!shell || !hero) return;
    const teams = favoriteTeams();
    const players = followedPlayers();
    const ids = new Set(teams.map((t) => t.id));
    const personalMatches = state.matches.filter((m) => ids.has(m.team_a_id) || ids.has(m.team_b_id)).sort((a,b) => matchTime(a)-matchTime(b)).slice(0,4);
    const live = liveCards().slice(0,3);
    const recent = state.media.slice(0,6);
    const panel = document.createElement('section');
    panel.className = 'fan-home-panel section-block';
    panel.dataset.fanHome = '1';
    panel.innerHTML = `<div class="fan-home-shortcuts"><button type="button" data-fan-hash="watch"><span class="fan-shortcut-icon">▶</span><b>شاهد</b><small>البث والملخصات</small></button><button type="button" data-fan-hash="follows"><span class="fan-shortcut-icon">★</span><b>لك</b><small>فرقك ولاعبوك</small></button><button type="button" data-fan-hash="profile"><span class="fan-shortcut-icon">☺</span><b>ملفي</b><small>متابعاتك ومحفوظاتك</small></button></div>${live.length ? `<div class="fan-home-live"><div class="fan-section-title"><div><span class="fan-live-dot"></span><b>مباشر الآن</b></div><button type="button" data-fan-hash="watch">شاهد الكل</button></div><div class="fan-recap-strip">${live.map(matchMini).join('')}</div></div>` : ''}${teams.length || players.length ? `<div class="fan-home-for-you"><div class="fan-section-title"><b>لك</b><button type="button" data-fan-hash="follows">كل متابعاتي</button></div>${personalMatches.length ? `<div class="fan-recap-strip">${personalMatches.map(matchMini).join('')}</div>` : `<p class="fan-muted">تابع فرقًا أكثر لتظهر لك المباريات هنا.</p>`}</div>` : `<div class="fan-onboard-inline"><div><span>✨</span><b>اجعل الصفحة الرئيسية خاصة بك</b><small>تابع فريقك ولاعبيك المفضلين لتصلك أخبارهم ومبارياتهم هنا.</small></div><button type="button" data-fan-hash="teams">اختر فريقك</button></div>`}${recent.length ? `<div class="fan-home-media"><div class="fan-section-title"><b>آخر اللقطات</b><button type="button" data-fan-hash="watch">عرض الكل</button></div><div class="fan-media-grid fan-media-grid-home">${recent.map(mediaCard).join('')}</div></div>` : ''}`;
    hero.insertAdjacentElement('afterend', panel);
  }

  function editProfile() {
    const current = profile();
    const name = prompt('اكتب الاسم الذي تريد ظهوره في ملفك الشخصي:', current.name || '');
    if (name == null) return;
    const cleaned = name.trim().slice(0, 60);
    if (!cleaned) return;
    setProfile({ name: cleaned });
    renderProfile();
  }

  function followPlayer(id) {
    const values = new Set(arrayStore(KEYS.players));
    if (values.has(id)) values.delete(id); else values.add(id);
    saveArray(KEYS.players, [...values]);
    document.querySelectorAll(`[data-follow-player="${CSS.escape(id)}"]`).forEach((button) => { button.textContent = values.has(id) ? '✓ أتابعه' : '+ متابعة اللاعب'; });
  }

  function toggleSaved(id) {
    const values = new Set(arrayStore(KEYS.savedMedia));
    if (values.has(id)) values.delete(id); else values.add(id);
    saveArray(KEYS.savedMedia, [...values]);
    document.querySelectorAll(`[data-save-media="${CSS.escape(id)}"]`).forEach((button) => { button.textContent = values.has(id) ? '✓ محفوظ' : '♡ حفظ'; });
  }

  async function renderCustomRoute() {
    customizeNavigation();
    const r = route();
    if (!['watch','profile','follows'].includes(r)) {
      enhancePlayerPage();
      injectHomePersonal();
      return;
    }
    await load();
    if (r === 'watch') renderWatch();
    else if (r === 'profile') renderProfile();
    else renderFollows();
    customizeNavigation();
  }

  document.addEventListener('click', (event) => {
    const hash = event.target.closest('[data-fan-hash]');
    if (hash) { event.preventDefault(); setHash(hash.dataset.fanHash); return; }
    const follow = event.target.closest('[data-follow-player]');
    if (follow) { event.preventDefault(); followPlayer(follow.dataset.followPlayer); return; }
    const save = event.target.closest('[data-save-media]');
    if (save) { event.preventDefault(); toggleSaved(save.dataset.saveMedia); return; }
    if (event.target.closest('[data-edit-fan]')) { event.preventDefault(); editProfile(); }
  }, true);

  window.addEventListener('hashchange', () => setTimeout(renderCustomRoute, 0));
  const observer = new MutationObserver(() => {
    customizeNavigation();
    if (state.loaded) { enhancePlayerPage(); injectHomePersonal(); }
  });
  observer.observe(main, { childList: true, subtree: true });

  profile();
  customizeNavigation();
  load().then(renderCustomRoute);
})();
