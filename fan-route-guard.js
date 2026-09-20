(() => {
  'use strict';

  const main = document.getElementById('appMain');
  if (!main) return;

  const CUSTOM_ROUTES = new Set(['watch', 'profile', 'follows']);
  let timer = 0;
  let attempts = 0;
  let activeHash = '';

  const currentRoute = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];

  function ensureFanRoute() {
    const route = currentRoute();
    if (!CUSTOM_ROUTES.has(route)) {
      attempts = 0;
      activeHash = '';
      return;
    }
    if (main.querySelector('.fan-page')) {
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
      if (!CUSTOM_ROUTES.has(currentRoute()) || main.querySelector('.fan-page')) return;
      if (attempts >= 6) return;
      attempts += 1;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, 80);
  }

  const observer = new MutationObserver(ensureFanRoute);
  observer.observe(main, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => window.setTimeout(ensureFanRoute, 100));
  window.addEventListener('load', () => window.setTimeout(ensureFanRoute, 250));
  window.setTimeout(ensureFanRoute, 250);

  if (!document.querySelector('script[data-agh-official-community-v2]')) {
    const script = document.createElement('script');
    script.src = 'assets/community-official-v2.js?v=20260920-1';
    script.dataset.aghOfficialCommunityV2 = '1';
    script.async = true;
    document.head.appendChild(script);
  }

  if (!document.querySelector('script[data-agh-site-reliability-v1]')) {
    const script = document.createElement('script');
    script.src = 'assets/site-reliability-v1.js?v=20260920-1';
    script.dataset.aghSiteReliabilityV1 = '1';
    script.async = true;
    document.head.appendChild(script);
  }

  if (!document.querySelector('script[data-agh-directory-guest-fix-v1]')) {
    const script = document.createElement('script');
    script.src = 'assets/directory-guest-fix-v1.js?v=20260920-1';
    script.dataset.aghDirectoryGuestFixV1 = '1';
    script.async = true;
    document.head.appendChild(script);
  }

  if (!document.querySelector('script[data-agh-community-guest-v1]')) {
    const script = document.createElement('script');
    script.src = 'assets/community-guest-interactions-v1.js?v=20260920-1';
    script.dataset.aghCommunityGuestV1 = '1';
    script.async = true;
    document.head.appendChild(script);
  }
})();
