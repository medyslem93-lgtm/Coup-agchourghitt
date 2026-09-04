(() => {
  'use strict';
  const cfg = window.AGCH_CONFIG || {};
  const main = document.getElementById('appMain');
  if (!main || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const headers = { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}` };
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let cache = null;

  async function loadData() {
    if (cache) return cache;
    const [tRes, rRes] = await Promise.all([
      fetch(`${cfg.supabaseUrl}/rest/v1/tournaments?select=id,slug,name,short_name`, { headers, cache: 'no-store' }),
      fetch(`${cfg.supabaseUrl}/rest/v1/referee_assignments?match_id=is.null&select=id,tournament_id,category,role,name&order=role.asc,name.asc`, { headers, cache: 'no-store' })
    ]);
    if (!tRes.ok || !rRes.ok) throw new Error('referees data unavailable');
    const tournaments = await tRes.json();
    const referees = await rRes.json();
    cache = { tournaments, referees };
    return cache;
  }

  function currentSlug() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    return parts[0] === 'tournament' ? parts[1] : '';
  }

  function card(ref) {
    const label = ref.role === 'main' ? 'حكم رئيسي' : 'حكم مساعد';
    return `<article class="agh-referee-card"><div class="agh-referee-avatar" aria-hidden="true">⚖️</div><div><b>${esc(ref.name)}</b><small>${label}</small></div></article>`;
  }

  async function inject() {
    const slug = currentSlug();
    if (!slug) return;
    if (main.querySelector('.agh-referees-section')) return;
    try {
      const { tournaments, referees } = await loadData();
      const tournament = tournaments.find(t => t.slug === slug);
      if (!tournament) return;
      const rows = referees.filter(r => r.tournament_id === tournament.id);
      if (!rows.length) return;
      const shell = main.querySelector('.page-shell');
      if (!shell) return;
      const mains = rows.filter(r => r.role === 'main');
      const assistants = rows.filter(r => r.role === 'assistant');
      const section = document.createElement('section');
      section.className = 'section-block agh-referees-section';
      section.innerHTML = `
        <div class="agh-referees-heading"><div><span>OFFICIALS</span><h2>حكام البطولة</h2><p>الطاقم التحكيمي المسجل رسميًا لهذه البطولة.</p></div><div class="agh-whistle">◉</div></div>
        <div class="agh-referee-groups">
          <div class="agh-referee-group"><div class="agh-referee-group-title"><b>الحكام الرئيسيون</b><span>${mains.length}</span></div><div class="agh-referee-grid">${mains.map(card).join('')}</div></div>
          <div class="agh-referee-group"><div class="agh-referee-group-title"><b>الحكام المساعدون</b><span>${assistants.length}</span></div><div class="agh-referee-grid">${assistants.map(card).join('')}</div></div>
        </div>`;
      shell.appendChild(section);
    } catch (err) {
      console.warn('Referees section skipped', err);
    }
  }

  const observer = new MutationObserver(() => setTimeout(inject, 60));
  observer.observe(main, { childList: true, subtree: false });
  window.addEventListener('hashchange', () => setTimeout(inject, 120));
  setTimeout(inject, 350);
})();