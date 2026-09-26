(() => {
  'use strict';

  const visitorKey = 'aghchorguit-visitor-id';
  const sessionKey = 'aghchorguit-visit-sent-v3';
  const makeId = () => (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  let visitorId = localStorage.getItem(visitorKey);
  if (!visitorId) {
    visitorId = makeId();
    localStorage.setItem(visitorKey, visitorId);
  }

  const recordEntry = () => {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    const path = `${location.pathname}${location.hash || ''}`.slice(0, 500) || '/';
    let referrerHost = null;
    try { referrerHost = document.referrer ? new URL(document.referrer).host.slice(0, 255) : null; } catch (_) {}
    const body = JSON.stringify({
      visitor_id: visitorId.slice(0, 128),
      session_id: makeId().slice(0, 128),
      path,
      referrer_host: referrerHost,
    });
    fetch('/api/visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', recordEntry, { once: true });
  else recordEntry();
})();
