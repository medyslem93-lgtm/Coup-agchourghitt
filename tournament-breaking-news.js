(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  const main = document.getElementById('appMain');
  if (!main || !window.supabase?.createClient) return;

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  let cache = [];
  let loading = false;

  function currentTournamentSlug() {
    const match = location.hash.match(/^#tournament\/([^/]+)(?:\/|$)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  async function ensureData() {
    if (loading || cache.length) return;
    loading = true;
    try {
      const [{ data: tournaments }, { data: news }] = await Promise.all([
        sb.from('tournaments').select('id,slug,name,short_name'),
        sb.from('news').select('id,title,description,content,tournament_id,status,is_breaking,is_story,published_at,created_at').eq('is_breaking', true).eq('is_story', false).order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
      ]);
      const tourById = new Map((tournaments || []).map(t => [t.id, t]));
      cache = (news || []).map(item => ({ ...item, tournament: tourById.get(item.tournament_id) || null }));
    } finally {
      loading = false;
    }
  }

  function published(item) {
    return item && item.status !== 'draft' && item.status !== 'scheduled';
  }

  function renderBanner() {
    document.querySelectorAll('.tournament-breaking-banner').forEach(el => el.remove());
    const slug = currentTournamentSlug();
    if (!slug) return;

    const item = cache.find(n => published(n) && n.tournament?.slug === slug);
    if (!item) return;

    const shell = main.querySelector('.page-shell');
    const hero = shell?.querySelector('.profile-hero');
    if (!shell || !hero) return;

    const banner = document.createElement('button');
    banner.type = 'button';
    banner.className = 'tournament-breaking-banner';
    banner.setAttribute('aria-label', `خبر عاجل: ${item.title || ''}`);
    banner.innerHTML = `
      <span class="tournament-breaking-label">عاجل</span>
      <span class="tournament-breaking-text">${esc(item.title || item.description || item.content || 'خبر عاجل')}</span>
    `;
    banner.addEventListener('click', () => {
      location.hash = `#news/${item.id}`;
    });

    hero.insertAdjacentElement('beforebegin', banner);
  }

  async function run() {
    if (!currentTournamentSlug()) {
      renderBanner();
      return;
    }
    await ensureData();
    requestAnimationFrame(renderBanner);
  }

  window.addEventListener('hashchange', () => setTimeout(run, 180));
  window.addEventListener('load', () => setTimeout(run, 450));

  const observer = new MutationObserver(() => {
    if (currentTournamentSlug()) setTimeout(renderBanner, 30);
  });
  observer.observe(main, { childList: true, subtree: false });
})();
