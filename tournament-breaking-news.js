(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  const main = document.getElementById('appMain');
  if (!main || !window.supabase?.createClient) return;

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  const MIDDLE_SLUG = 'middle-2026';
  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  let item = null;
  let loading = false;

  async function ensureData() {
    if (loading || item) return;
    loading = true;
    try {
      const { data: tournament } = await sb.from('tournaments').select('id').eq('slug', MIDDLE_SLUG).maybeSingle();
      if (!tournament?.id) return;
      const { data } = await sb.from('news')
        .select('id,title,description,content,status,is_breaking,is_story,published_at,created_at')
        .eq('tournament_id', tournament.id)
        .eq('is_breaking', true)
        .eq('is_story', false)
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      item = data || null;
    } finally { loading = false; }
  }

  function renderBanner() {
    document.querySelectorAll('.tournament-breaking-banner').forEach(el => el.remove());
    if (!item) return;
    const shell = main.querySelector('.page-shell') || main.firstElementChild || main;
    const banner = document.createElement('button');
    banner.type = 'button';
    banner.className = 'tournament-breaking-banner';
    banner.setAttribute('aria-label', `خبر عاجل: ${item.title || ''}`);
    banner.innerHTML = `<span class="tournament-breaking-label">عاجل</span><span class="tournament-breaking-text">${esc(item.description || item.content || item.title || 'خبر عاجل')}</span>`;
    banner.addEventListener('click', () => { location.hash = `#news/${item.id}`; });
    shell.prepend(banner);
  }

  async function run() {
    await ensureData();
    requestAnimationFrame(renderBanner);
  }

  window.addEventListener('hashchange', () => setTimeout(run, 100));
  window.addEventListener('load', () => setTimeout(run, 300));
  const observer = new MutationObserver(() => setTimeout(renderBanner, 25));
  observer.observe(main, { childList: true, subtree: false });
})();
