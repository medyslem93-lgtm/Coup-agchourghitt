(() => {
  'use strict';

  const MATCH_ID = 'c0766b04-e3b2-42be-8748-095bc15ae45b';
  const TOURNAMENT_SLUG = 'retired-2026';
  const STYLE_ID = 'agh-retired-dual-champions-style';
  const BANNER_CLASS = 'agh-dual-champions';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${BANNER_CLASS}{margin:14px 0;padding:14px;border:1px solid rgba(214,176,73,.45);border-radius:18px;background:linear-gradient(135deg,rgba(214,176,73,.16),rgba(10,28,20,.88));box-shadow:inset 0 0 0 1px rgba(255,255,255,.03);text-align:center;color:#fff}
      .${BANNER_CLASS}__title{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;color:#f1d878;font-weight:900;font-size:15px}
      .${BANNER_CLASS}__teams{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}
      .${BANNER_CLASS}__team{display:flex;align-items:center;justify-content:center;gap:7px;min-width:0;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);font-weight:900}
      .${BANNER_CLASS}__team span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .${BANNER_CLASS}__cup{font-size:22px;filter:drop-shadow(0 2px 6px rgba(214,176,73,.35))}
      .${BANNER_CLASS}__note{margin-top:9px;color:rgba(255,255,255,.72);font-size:11px;line-height:1.7}
      @media(max-width:520px){.${BANNER_CLASS}{padding:12px 10px;border-radius:16px}.${BANNER_CLASS}__teams{gap:6px}.${BANNER_CLASS}__team{padding:9px 7px;font-size:12px}.${BANNER_CLASS}__cup{font-size:18px}}
    `;
    document.head.appendChild(style);
  }

  function bannerMarkup() {
    return `<div class="${BANNER_CLASS}" role="status" aria-label="الأسود والنجوم بطلا بطولة المعتزلين">
      <div class="${BANNER_CLASS}__title"><span>🏆</span><span>بطلان معًا — نهائي تكريمي</span><span>🏆</span></div>
      <div class="${BANNER_CLASS}__teams">
        <div class="${BANNER_CLASS}__team"><span class="${BANNER_CLASS}__cup">🏆</span><span>الأسود — بطل</span></div>
        <strong>1 — 1</strong>
        <div class="${BANNER_CLASS}__team"><span class="${BANNER_CLASS}__cup">🏆</span><span>النجوم — بطل</span></div>
      </div>
      <div class="${BANNER_CLASS}__note">مباراة تكريمية للأساطير؛ الفريقان يتقاسمان لقب بطولة المعتزلين 2026.</div>
    </div>`;
  }

  function removeOld() {
    document.querySelectorAll(`.${BANNER_CLASS}`).forEach((el) => el.remove());
  }

  function apply() {
    ensureStyles();
    const hash = decodeURIComponent(location.hash || '');
    const isMatch = new RegExp(`^#/?match/${MATCH_ID}(?:/|$)`, 'i').test(hash);
    const isTournament = hash.includes(`tournament/${TOURNAMENT_SLUG}`);

    if (!isMatch && !isTournament) {
      removeOld();
      return;
    }

    if (isMatch) {
      const recap = document.querySelector('.match-recap');
      if (recap && !recap.querySelector(`.${BANNER_CLASS}`)) {
        const scoreboard = recap.querySelector('.match-recap-scoreboard');
        if (scoreboard) scoreboard.insertAdjacentHTML('beforebegin', bannerMarkup());
        else recap.insertAdjacentHTML('afterbegin', bannerMarkup());
      }
    }

    if (isTournament) {
      const shell = document.querySelector('#tournamentBracketRoot .rtc-shell');
      if (shell && !shell.querySelector(`.${BANNER_CLASS}`)) {
        shell.insertAdjacentHTML('afterbegin', bannerMarkup());
      }
    }
  }

  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = window.setTimeout(apply, 80);
  };

  window.addEventListener('hashchange', schedule);
  const root = document.getElementById('appMain');
  if (root) new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  schedule();
})();