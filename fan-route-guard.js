(() => {
  'use strict';

  const main = document.getElementById('appMain');
  if (!main) return;

  const CUSTOM_ROUTES = new Set(['watch', 'profile', 'follows', 'community']);
  let timer = 0;
  let attempts = 0;
  let activeHash = '';

  const currentRoute = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
  const customReady = () => currentRoute() === 'community'
    ? !!main.querySelector('[data-community-instagram="v3"]')
    : !!main.querySelector('.fan-page');

  function ensureFanRoute() {
    const route = currentRoute();
    if (!CUSTOM_ROUTES.has(route)) {
      attempts = 0;
      activeHash = '';
      return;
    }
    if (customReady()) {
      attempts = 0;
      activeHash = location.hash;
      return;
    }

    if (activeHash !== location.hash) {
      activeHash = location.hash;
      attempts = 0;
    }

    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!CUSTOM_ROUTES.has(currentRoute()) || customReady()) return;
      if (attempts >= 8) return;
      attempts += 1;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, 100);
  }

  const observer = new MutationObserver(ensureFanRoute);
  observer.observe(main, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => window.setTimeout(ensureFanRoute, 100));
  window.addEventListener('load', () => window.setTimeout(ensureFanRoute, 250));
  window.setTimeout(ensureFanRoute, 250);

  const load = (selector, src, dataKey) => {
    if (document.querySelector(selector)) return;
    const script = document.createElement('script');
    script.src = src;
    script.dataset[dataKey] = '1';
    script.async = true;
    document.head.appendChild(script);
  };

  load('script[data-agh-community-instagram-v3]', 'assets/community-instagram-v3.js?v=20260921-1', 'aghCommunityInstagramV3');
  load('script[data-agh-site-reliability-v1]', 'assets/site-reliability-v1.js?v=20260920-1', 'aghSiteReliabilityV1');
  load('script[data-agh-directory-guest-fix-v1]', 'assets/directory-guest-fix-v1.js?v=20260920-1', 'aghDirectoryGuestFixV1');
  load('script[data-agh-community-guest-v1]', 'assets/community-guest-interactions-v1.js?v=20260920-2', 'aghCommunityGuestV1');
  load('script[data-agh-lineup-polish-v2]', 'assets/tournament-lineup-polish-v2.js?v=20260924-tournament1', 'aghLineupPolishV2');
  load('script[data-agh-player-vote-profile-flow-v1]', 'assets/player-vote-profile-flow-v1.js?v=20260921-1', 'aghPlayerVoteProfileFlowV1');
  load('script[data-agh-admin-live-refresh-v1]', 'assets/admin-live-refresh-v1.js?v=20260920-2', 'aghAdminLiveRefreshV1');
})();