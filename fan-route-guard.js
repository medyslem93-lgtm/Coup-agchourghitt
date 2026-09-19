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
})();
