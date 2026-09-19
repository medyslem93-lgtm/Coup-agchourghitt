(() => {
  'use strict';

  const main = document.getElementById('appMain');
  const cfg = window.AGCH_CONFIG || {};
  if (!main) return;

  const KEYS = {
    teams: 'aghchorguit-favorite-teams',
    players: 'agh_followed_players_v1',
  };

  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rootRoute = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/').filter(Boolean)[0] || 'home';
  const arrayStore = (key) => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

  let db = null;
  if (window.supabase?.createClient && cfg.supabaseUrl && cfg.supabaseKey) {
    db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-client-info': 'aghchorguit-app-structure-v2' } },
    });
  }

  let tournamentData = null;
  let loadingTournaments = null;
  let applyTimer = 0;

  async function loadTournamentHub() {
    if (tournamentData) return tournamentData;
    if (loadingTournaments) return loadingTournaments;
    if (!db) return { tournaments: [], teams: [], matches: [] };
    loadingTournaments = Promise.all([
      db.from('tournaments').select('id,slug,name,short_name,season,status,logo_url,accent_color,sort_order').order('sort_order'),
      db.from('teams').select('id,tournament_id,name').order('name'),
      db.from('matches').select('id,tournament_id,status,match_date').order('match_date', { ascending: false, nullsFirst: false }),
    ]).then(([tournaments, teams, matches]) => {
      tournamentData = {
        tournaments: tournaments.data || [],
        teams: teams.data || [],
        matches: matches.data || [],
      };
      return tournamentData;
    }).catch(() => ({ tournaments: [], teams: [], matches: [] })).finally(() => { loadingTournaments = null; });
    return loadingTournaments;
  }

  function signature(nav) {
    return [...nav.querySelectorAll(':scope > button')].map(btn => btn.getAttribute('data-route') || btn.getAttribute('data-fan-hash') || btn.getAttribute('data-action') || '').join('|');
  }

  function installPrimaryNavigation() {
    const desktop = document.querySelector('.desktop-navigation');
    if (desktop && signature(desktop) !== 'home|matches|tournaments|watch|directory|profile') {
      desktop.dataset.appStructureV2 = '1';
      desktop.innerHTML = '<button data-route="home">الرئيسية</button><button data-route="matches">المباريات</button><button data-route="tournaments">البطولات</button><button data-route="watch">شاهد</button><button data-route="directory">المزيد</button><button data-route="profile">ملفي</button>';
    }

    const mobile = document.querySelector('.mobile-navigation');
    if (mobile && signature(mobile) !== 'home|matches|tournaments|watch|profile') {
      mobile.dataset.appStructureV2 = '1';
      mobile.innerHTML = '<button data-route="home"><span>الرئيسية</span></button><button data-route="matches"><span>المباريات</span></button><button class="nav-primary" data-route="tournaments"><span>البطولات</span></button><button data-route="watch"><span>شاهد</span></button><button data-route="profile"><span>ملفي</span></button>';
    }

    const extra = document.getElementById('aghSectionNav');
    if (extra) extra.setAttribute('aria-hidden', 'true');
  }

  function cleanDirectory() {
    if (rootRoute() !== 'directory') return;
    main.querySelectorAll('.agh-dir-card').forEach((card) => {
      const r = card.getAttribute('data-route');
      if (['tournaments','matches','watch','following','follows','profile'].includes(r || '')) card.hidden = true;
    });
    const title = main.querySelector('.agh-dir-page-head h1');
    if (title && title.textContent !== 'المزيد') title.textContent = 'المزيد';
    const hero = main.querySelector('.agh-dir-hero h2');
    if (hero && hero.textContent !== 'الأقسام الأخرى') hero.textContent = 'الأقسام الأخرى';
    const introText = 'الفرق واللاعبون والحكام والإحصائيات والأخبار؛ الأقسام التي لا تحتاجها في الشريط الرئيسي.';
    const intro = main.querySelector('.agh-dir-page-head p');
    if (intro && intro.textContent !== introText) intro.textContent = introText;
  }

  function profileFollowingHub() {
    if (rootRoute() !== 'profile') return;
    const page = main.querySelector('.fan-page');
    const hero = main.querySelector('.fan-profile-hero');
    if (!page || !hero || page.querySelector('[data-profile-following-hub]')) return;

    const followedTeams = arrayStore(KEYS.teams).length;
    const followedPlayers = arrayStore(KEYS.players).length;
    const hub = document.createElement('section');
    hub.className = 'fan-section agh-profile-following-hub';
    hub.dataset.profileFollowingHub = '1';
    hub.innerHTML = `<div class="agh-profile-following-title"><div><span>MY FOLLOWS</span><h2>متابعاتي</h2><p>فرقك ولاعبوك الذين تتابعهم أصبحوا جزءًا من ملفك الشخصي، وليسوا صفحة مستقلة.</p></div><div class="agh-profile-following-counts"><button type="button" data-route="teams"><strong>${followedTeams}</strong><small>فرق أتابعها</small></button><button type="button" data-route="players"><strong>${followedPlayers}</strong><small>لاعبون أتابعهم</small></button></div></div>`;
    hero.insertAdjacentElement('afterend', hub);
  }

  function redirectLegacyFollowing() {
    const r = rootRoute();
    if (r === 'following' || r === 'follows') location.replace('#/profile');
  }

  function tournamentCard(t, teams, matches) {
    const teamCount = teams.filter(x => x.tournament_id === t.id).length;
    const tournamentMatches = matches.filter(x => x.tournament_id === t.id);
    const played = tournamentMatches.filter(x => x.status === 'انتهت').length;
    const live = tournamentMatches.filter(x => x.status === 'مباشر').length;
    const total = tournamentMatches.length;
    const status = live ? 'مباشر الآن' : (t.status || 'بطولة');
    return `<article class="agh-tournament-choice" style="--tour-accent:${esc(t.accent_color || '#c7ff37')}">
      <button type="button" class="agh-tournament-choice-main" data-route="tournament/${esc(t.slug)}/overview">
        <i>${t.logo_url ? `<img src="${esc(t.logo_url)}" alt="${esc(t.short_name || t.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/tournament.jpg'">` : '<span>🏆</span>'}</i>
        <span><small>${esc(t.season || '2026')} · ${esc(status)}</small><b>${esc(t.short_name || t.name)}</b><em>${teamCount} فرق · ${played}/${total || 0} مباراة</em></span>
        <strong>فتح البطولة <span>←</span></strong>
      </button>
      <nav aria-label="اختصارات البطولة">
        <button type="button" data-route="tournament/${esc(t.slug)}/matches">المباريات</button>
        <button type="button" data-route="tournament/${esc(t.slug)}/standings">الترتيب</button>
        <button type="button" data-route="tournament/${esc(t.slug)}/teams">الفرق</button>
        <button type="button" data-route="tournament/${esc(t.slug)}/players">اللاعبون</button>
      </nav>
    </article>`;
  }

  async function renderTournamentChooser() {
    if (rootRoute() !== 'tournaments' || main.querySelector('[data-tournament-chooser-v2]')) return;
    const data = await loadTournamentHub();
    if (rootRoute() !== 'tournaments' || main.querySelector('[data-tournament-chooser-v2]')) return;
    const page = document.createElement('div');
    page.className = 'page-shell agh-tournament-chooser-page';
    page.dataset.tournamentChooserV2 = '1';
    page.innerHTML = `<section class="agh-tournament-chooser-head"><div><span>COMPETITIONS</span><h1>البطولات</h1><p>اختر البطولة أولًا. داخل كل بطولة ستجد مبارياتها وترتيبها وفرقها ولاعبيها وكل تفاصيلها في مكان واحد.</p></div><button type="button" data-action="open-search">⌕ البحث</button></section><section class="agh-tournament-choice-grid">${data.tournaments.map(t => tournamentCard(t, data.teams, data.matches)).join('') || '<div class="agh-tournament-choice-empty">لا توجد بطولات متاحة حاليًا.</div>'}</section>`;
    main.replaceChildren(page);
  }

  function applyStructure() {
    redirectLegacyFollowing();
    installPrimaryNavigation();
    cleanDirectory();
    profileFollowingHub();
    if (rootRoute() === 'tournaments') renderTournamentChooser();
  }

  function scheduleApply(delay = 50) {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyStructure, delay);
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-route]');
    if (!target) return;
    const r = target.getAttribute('data-route');
    if (r === 'following' || r === 'follows') {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.hash = '#/profile';
    }
  }, true);

  window.addEventListener('hashchange', () => scheduleApply(40));
  new MutationObserver(() => scheduleApply(70)).observe(main, { childList: true, subtree: true });
  const desktop = document.querySelector('.desktop-navigation');
  const mobile = document.querySelector('.mobile-navigation');
  if (desktop) new MutationObserver(() => scheduleApply(20)).observe(desktop, { childList: true });
  if (mobile) new MutationObserver(() => scheduleApply(20)).observe(mobile, { childList: true });
  scheduleApply(0);
})();