(() => {
  'use strict';

  if (/^\/admin(?:\/|$)/.test(location.pathname)) return;
  const nativeFetch = window.fetch.bind(window);
  let backupPayload = null;
  let backupPromise = null;

  async function getBackup() {
    if (backupPayload) return backupPayload;
    if (backupPromise) return backupPromise;
    backupPromise = nativeFetch('/assets/public-snapshot-20260926-1350.json', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    }).then(async (response) => {
      if (!response.ok) throw new Error(`static_snapshot_${response.status}`);
      backupPayload = await response.json();
      window.__AGH_PUBLIC_SNAPSHOT = window.__AGH_PUBLIC_SNAPSHOT || backupPayload;
      return backupPayload;
    }).finally(() => { backupPromise = null; });
    return backupPromise;
  }

  function asJson(payload, source) {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-agch-data-source': source,
      },
    });
  }

  window.fetch = async function snapshotSafeFetch(input, init = {}) {
    let request;
    let url;
    try {
      request = input instanceof Request ? input : new Request(input, init);
      url = new URL(request.url, location.href);
    } catch (_) {
      return nativeFetch(input, init);
    }

    const method = String(request.method || init.method || 'GET').toUpperCase();
    if (method !== 'GET' || url.origin !== location.origin || url.pathname !== '/api/public-snapshot') {
      return nativeFetch(input, init);
    }

    try {
      const response = await nativeFetch(input, { ...init, cache: 'no-store' });
      if (response.ok) return response;
      return asJson(await getBackup(), 'static-fallback');
    } catch (_) {
      return asJson(await getBackup(), 'static-fallback');
    }
  };
})();
