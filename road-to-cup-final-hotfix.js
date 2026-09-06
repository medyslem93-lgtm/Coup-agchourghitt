(() => {
  'use strict';

  const normalize = (value = '') => String(value).trim().replace(/ـ/g, '').replace(/\s+/g, ' ');

  function hasRealFinishedFinal(bracket) {
    const rounds = [...bracket.querySelectorAll('.rtc-round')];
    return rounds.some(round => {
      const label = normalize(round.querySelector('.rtc-round-head b')?.textContent || '');
      if (label !== 'النهائي' && label !== 'نهائي') return false;
      return [...round.querySelectorAll('.rtc-match')].some(match => {
        const status = normalize(match.querySelector('.rtc-match-head b')?.textContent || '');
        return status === 'انتهت';
      });
    });
  }

  function fixChampionBanner() {
    document.querySelectorAll('.rtc-bracket-shell').forEach(bracket => {
      const champion = bracket.querySelector(':scope > .rtc-champion');
      if (champion && !hasRealFinishedFinal(bracket)) champion.remove();
    });

    document.querySelectorAll('.rtc-road-shell').forEach(road => {
      const champion = road.querySelector(':scope > .rtc-champion');
      if (!champion) return;
      const finalStep = [...road.querySelectorAll('.rtc-road-step')].find(step => {
        const label = normalize(step.querySelector('.rtc-stage-badge')?.childNodes?.[0]?.textContent || '');
        return label === 'النهائي' || label === 'نهائي';
      });
      if (!finalStep || !normalize(finalStep.textContent).includes('🏆 بطل')) champion.remove();
    });
  }

  const observer = new MutationObserver(fixChampionBanner);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => setTimeout(fixChampionBanner, 0));
  document.addEventListener('DOMContentLoaded', fixChampionBanner);
  fixChampionBanner();
})();
