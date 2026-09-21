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
      global: { headers: { 'x-client-info': 'aghchorguit-app-structure-v3' } },
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
    return [...nav.querySelectorAll(':scope > button')].map(btn => btn.getAttribute('data-route') || btn.getAttribute('data-fan-hash') || '').join('|');
  }

  function installPrimaryNavigation() {
    const desktop = document.querySelector('.desktop-navigation');
    const dSig = 'home|matches|watch|community|profile';
    if (desktop && signature(desktop) !== dSig) {
      desktop.dataset.appStructureV3 = '1';
      desktop.innerHTML = '<button data-route="home">الرئيسية</button><button data-route="matches">المباريات</button><button data-route="watch">شاهد</button><button data-route="community">المجتمع</button><button data-route="profile">ملفي</button>';
    }

    const mobile = document.querySelector('.mobile-navigation');
    const mSig = 'community|profile|home|watch|matches';
    if (mobile && signature(mobile) !== mSig) {
      mobile.dataset.appStructureV3 = '1';
      mobile.innerHTML = '<button data-route="community" aria-label="المجتمع"><i aria-hidden="true">◎</i><span>المجتمع</span></button><button data-route="profile" aria-label="ملفي"><i aria-hidden="true">♙</i><span>ملفي</span></button><button class="nav-primary" data-route="home" aria-label="الرئيسية"><i aria-hidden="true">⌂</i><span>الرئيسية</span></button><button data-route="watch" aria-label="شاهد"><i aria-hidden="true">▶</i><span>شاهد</span></button><button data-route="matches" aria-label="المباريات"><i aria-hidden="true">⚽</i><span>المباريات</span></button>';
    }

    const active = rootRoute();
    document.querySelectorAll('.desktop-navigation button,.mobile-navigation button').forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.route || '') === active);
    });

    const extra = document.getElementById('aghSectionNav');
    if (extra) extra.setAttribute('aria-hidden', 'true');
  }

  function cleanDirectory() {
    if (rootRoute() !== 'directory') return;
    main.querySelectorAll('.agh-dir-card').forEach((card) => {
      const r = card.getAttribute('data-route');
      if (['tournaments','matches','watch','community','following','follows','profile'].includes(r || '')) card.hidden = true;
    });
    const title = main.querySelector('.agh-dir-page-head h1');
    if (title) title.textContent = 'المزيد';
    const hero = main.querySelector('.agh-dir-hero h2');
    if (hero) hero.textContent = 'الأقسام الأخرى';
    const intro = main.querySelector('.agh-dir-page-head p');
    if (intro) intro.textContent = 'الفرق واللاعبون والحكام والإحصائيات والأخبار في مكان واحد.';
  }

  function redirectLegacyFanRoutes() {
    const r = rootRoute();
    if (['following', 'follows'].includes(r)) location.replace('#/profile');
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
    if (['following','follows'].includes(r || '')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.hash = '#/profile';
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