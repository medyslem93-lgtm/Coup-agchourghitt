(() => {
  'use strict';

  const main = document.getElementById('appMain');
  const cfg = window.AGCH_CONFIG || {};
  if (!main) return;

  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rootRoute = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/').filter(Boolean)[0] || 'home';

  let db = null;
  if (window.supabase?.createClient && cfg.supabaseUrl && cfg.supabaseKey) {
    db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-client-info': 'aghchorguit-app-structure-stable' } },
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
    ]).then(([tournaments, teams, matches]) => ({
      tournaments: tournaments.data || [],
      teams: teams.data || [],
      matches: matches.data || [],
    })).catch(() => ({ tournaments: [], teams: [], matches: [] })).finally(() => { loadingTournaments = null; });
    tournamentData = await loadingTournaments;
    return tournamentData;
  }

  function signature(nav) {
    return [...nav.querySelectorAll(':scope > button')].map(btn => btn.getAttribute('data-route') || '').join('|');
  }

  function desiredMobileActive(route) {
    if (route === 'home') return 'home';
    if (route === 'matches' || route === 'match') return 'matches';
    if (route === 'tournaments' || route === 'tournament') return 'tournaments';
    if (['teams', 'team', 'players', 'player'].includes(route)) return 'teams';
    return 'directory';
  }

  function installPrimaryNavigation() {
    const desktop = document.querySelector('.desktop-navigation');
    const desktopSig = 'home|matches|tournaments|teams|stats|news';
    if (desktop && signature(desktop) !== desktopSig) {
      desktop.dataset.appStructureStable = '1';
      desktop.innerHTML = '<button data-route="home">الرئيسية</button><button data-route="matches">المباريات</button><button data-route="tournaments">البطولات</button><button data-route="teams">الفرق</button><button data-route="stats">الإحصائيات</button><button data-route="news">الأخبار</button>';
    }

    const mobile = document.querySelector('.mobile-navigation');
    const mobileSig = 'home|matches|tournaments|teams|directory';
    if (mobile && signature(mobile) !== mobileSig) {
      mobile.dataset.appStructureStable = '1';
      mobile.innerHTML = '<button data-route="home"><span>الرئيسية</span></button><button data-route="matches"><span>المباريات</span></button><button class="nav-primary" data-route="tournaments"><span>البطولات</span></button><button data-route="teams"><span>الفرق</span></button><button data-route="directory"><span>المزيد</span></button>';
    }

    const activeRoute = rootRoute();
    const mobileActive = desiredMobileActive(activeRoute);
    document.querySelectorAll('.desktop-navigation button').forEach(btn => {
      const route = btn.dataset.route || '';
      const active = route === activeRoute || (route === 'tournaments' && activeRoute === 'tournament') || (route === 'teams' && ['team', 'players', 'player'].includes(activeRoute));
      btn.classList.toggle('active', active);
    });
    document.querySelectorAll('.mobile-navigation button').forEach(btn => btn.classList.toggle('active', (btn.dataset.route || '') === mobileActive));

    const extra = document.getElementById('aghSectionNav');
    if (extra) extra.setAttribute('aria-hidden', 'true');
  }

  function cleanDirectory() {
    if (!['directory', 'more'].includes(rootRoute())) return;
    main.querySelectorAll('.agh-dir-card').forEach((card) => {
      const r = card.getAttribute('data-route') || '';
      if (['following', 'follows', 'profile', 'community'].includes(r)) card.remove();
    });
    const title = main.querySelector('.agh-dir-page-head h1');
    if (title) title.textContent = 'المزيد';
    const hero = main.querySelector('.agh-dir-hero h2');
    if (hero) hero.textContent = 'كل أقسام الموقع';
    const intro = main.querySelector('.agh-dir-page-head p');
    if (intro) intro.textContent = 'شاهد، الحكام، الإحصائيات، الأخبار وبقية أقسام كأس أغشوركيت.';
  }

  function redirectLegacyFanRoutes() {
    const r = rootRoute();
    if (['following', 'follows', 'profile', 'community'].includes(r)) location.replace('#/directory');
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
    redirectLegacyFanRoutes();
    installPrimaryNavigation();
    cleanDirectory();
    if (rootRoute() === 'tournaments') renderTournamentChooser();
  }

  function scheduleApply(delay = 40) {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyStructure, delay);
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-route]');
    if (!target) return;
    const r = target.getAttribute('data-route');
    if (['following', 'follows', 'profile', 'community'].includes(r || '')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.hash = '#/directory';
    }
  }, true);

  window.addEventListener('hashchange', () => scheduleApply(25));
  new MutationObserver(() => scheduleApply(55)).observe(main, { childList: true, subtree: true });
  const desktop = document.querySelector('.desktop-navigation');
  const mobile = document.querySelector('.mobile-navigation');
  if (desktop) new MutationObserver(() => scheduleApply(10)).observe(desktop, { childList: true });
  if (mobile) new MutationObserver(() => scheduleApply(10)).observe(mobile, { childList: true });
  scheduleApply(0);
})();
