(() => {
  'use strict';
  const started = performance.now();
  function show() {
    const splash = document.createElement('div');
    splash.className = 'agh-entry';
    splash.setAttribute('role', 'status');
    splash.setAttribute('aria-label', 'الموطن الجديد لبطولة أغشوركيت');
    splash.innerHTML = '<div class="agh-entry-content"><img src="assets/agchourghit-cup-splash.jpeg" alt="كأس أغشوركيت"><h1>كأس أغشوركيت</h1><span class="agh-entry-line" aria-hidden="true"></span><p>الموطن الجديد لبطولة أغشوركيت</p></div>';
    document.body.appendChild(splash);
    setTimeout(() => {
      document.documentElement.classList.remove('agh-entry-pending');
      splash.remove();
    }, Math.max(0, 1080 - (performance.now() - started)));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
  else show();
  // Never leave the page covered if the DOM or image takes unusually long to load.
  setTimeout(() => document.documentElement.classList.remove('agh-entry-pending'), 1400);
})();
