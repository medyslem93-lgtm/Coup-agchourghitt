(() => {
  'use strict';

  const DISCIPLINE = {
    'البلد الطيب': { yellow: 3, red: 0 },
    'الحمد': { yellow: 2, red: 1 },
    'بير البركة': { yellow: 3, red: 0 },
  };

  function normalizeName(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function enhanceStandings() {
    document.querySelectorAll('.standings-table').forEach((table) => {
      if (table.dataset.disciplineV8 === '1') return;
      const rows = [...table.querySelectorAll('tbody tr')];
      if (!rows.length) return;

      const headRow = table.querySelector('thead tr');
      if (!headRow) return;

      const yellowHead = document.createElement('th');
      yellowHead.textContent = '🟨';
      yellowHead.title = 'البطاقات الصفراء';
      const redHead = document.createElement('th');
      redHead.textContent = '🟥';
      redHead.title = 'البطاقات الحمراء';
      headRow.append(yellowHead, redHead);

      rows.forEach((row) => {
        const name = normalizeName(row.querySelector('.standings-team b')?.textContent || '');
        const data = DISCIPLINE[name] || { yellow: 0, red: 0 };
        const yellowCell = document.createElement('td');
        yellowCell.textContent = String(data.yellow);
        yellowCell.setAttribute('aria-label', `${data.yellow} بطاقة صفراء`);
        const redCell = document.createElement('td');
        redCell.textContent = String(data.red);
        redCell.setAttribute('aria-label', `${data.red} بطاقة حمراء`);
        row.append(yellowCell, redCell);
      });
      table.dataset.disciplineV8 = '1';
    });
  }

  const observer = new MutationObserver(() => requestAnimationFrame(enhanceStandings));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceStandings);
  else enhanceStandings();
})();
