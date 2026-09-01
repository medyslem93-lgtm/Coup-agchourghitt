(() => {
  'use strict';
  const SENIORS_ID = '011a04a0-6635-4cea-be5c-7948efe1bc09';
  const TARGET_PLAYER_ID = '472c9d3d-2cb6-4787-ad6e-76cf78c7dd0e';

  function patchSeniorScorers() {
    try {
      const current = localStorage.getItem('aghchorguit-selected-tournament');
      if (current !== SENIORS_ID) return;
      document.querySelectorAll('.leader-card').forEach((card) => {
        const title = card.querySelector('.leader-card-head h3')?.textContent?.trim() || '';
        if (!['أفضل الهدافين','الهدافون','ترتيب الهدافين'].includes(title)) return;
        const list = card.querySelector('.leader-list');
        if (!list) return;
        const rows = [...list.querySelectorAll('.leader-row')];
        const target = rows.find((row) => row.getAttribute('data-route') === `player/${TARGET_PLAYER_ID}`);
        if (!target) return;
        const insertBefore = list.children[2] || null;
        if (insertBefore !== target) list.insertBefore(target, insertBefore);
        [...list.querySelectorAll('.leader-row')].forEach((row, index) => {
          const rank = row.querySelector('.rank-number');
          if (rank) rank.textContent = String(index + 1).padStart(2, '0');
        });
      });
    } catch (_) {}
  }

  const observer = new MutationObserver(patchSeniorScorers);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', patchSeniorScorers);
  window.addEventListener('load', patchSeniorScorers);
  setInterval(patchSeniorScorers, 1200);
})();
