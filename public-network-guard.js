(() => {
  'use strict';

  if (/^\/admin(?:\/|$)/.test(location.pathname)) return;

  const cfg = window.AGCH_CONFIG || {};
  const projectOrigin = String(cfg.supabaseUrl || '').replace(/\/+$/, '');
  const nativeFetch = window.fetch.bind(window);
  const SNAPSHOT_TTL = 5 * 60 * 1000;
  const LIVE_TTL = 8 * 1000;
  const IMAGE_PREFIX = `${projectOrigin}/storage/v1/object/public/tournament-media/`;

  let snapshotValue = null;
  let snapshotAt = 0;
  let snapshotPromise = null;
  let liveText = '';
  let liveStatus = 200;
  let liveHeaders = {};
  let liveAt = 0;
  let livePromise = null;

  function jsonResponse(value, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(value), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...extraHeaders,
      },
    });
  }

  function responseFromText(text, status, headers = {}) {
    return new Response(text, { status, headers });
  }

  function imageProxy(value) {
    if (!value || !IMAGE_PREFIX || !String(value).startsWith(IMAGE_PREFIX)) return value;
    const clean = String(value).split('#')[0];
    if (/\.(?:mp4|mov|m4v|webm|m3u8)(?:\?|$)/i.test(clean)) return value;
    const path = clean.slice(IMAGE_PREFIX.length).split('?')[0];
    return `/api/media-proxy?path=${encodeURIComponent(path)}`;
  }

  function rewriteAssets(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return value;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((item) => rewriteAssets(item, seen));
      return value;
    }
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string' && item.startsWith(IMAGE_PREFIX)) value[key] = imageProxy(item);
      else if (item && typeof item === 'object') rewriteAssets(item, seen);
    }
    return value;
  }

  async function getSnapshot(force = false) {
    const now = Date.now();
    if (!force && snapshotValue && now - snapshotAt < SNAPSHOT_TTL) return snapshotValue;
    if (snapshotPromise) return snapshotPromise;
    snapshotPromise = nativeFetch('/api/public-snapshot', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'default',
      signal: AbortSignal.timeout(15000),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`snapshot_${response.status}`);
      const payload = rewriteAssets(await response.json());
      snapshotValue = payload;
      snapshotAt = Date.now();
      window.__AGH_PUBLIC_SNAPSHOT = payload;
      return payload;
    }).catch((error) => {
      if (snapshotValue) return snapshotValue;
      throw error;
    }).finally(() => { snapshotPromise = null; });
    return snapshotPromise;
  }

  function tableRows(snapshot, table) {
    const map = {
      tournaments: 'tournaments',
      teams: 'teams',
      players: 'players',
      matches: 'matches',
      match_events: 'events',
      match_lineups: 'lineups',
      match_lineup_players: 'lineupPlayers',
      match_stats: 'matchStats',
      tournament_standings: 'standings',
      player_tournament_stats: 'playerStats',
      news: 'news',
      awards: 'awards',
      media_assets: 'media',
      referees: 'referees',
      referee_assignments: 'assignments',
      referee_match_stats: 'refereeMatchStats',
      site_feature_flags: 'featureFlags',
      match_live_clocks: 'liveClocks',
    };
    if (table === 'site_settings') return snapshot.settings && Object.keys(snapshot.settings).length ? [snapshot.settings] : [];
    const rows = snapshot[map[table]];
    return Array.isArray(rows) ? rows.slice() : [];
  }

  function parseValue(value) {
    if (value === 'null') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }

  function comparable(value) {
    if (value === null || value === undefined) return null;
    return String(value);
  }

  function filterRows(rows, url) {
    const reserved = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
    for (const [key, raw] of url.searchParams.entries()) {
      if (reserved.has(key) || key === 'and' || key === 'or') continue;
      const value = String(raw || '');
      if (value.startsWith('eq.')) {
        const wanted = comparable(parseValue(value.slice(3)));
        rows = rows.filter((row) => comparable(row?.[key]) === wanted);
      } else if (value.startsWith('neq.')) {
        const wanted = comparable(parseValue(value.slice(4)));
        rows = rows.filter((row) => comparable(row?.[key]) !== wanted);
      } else if (value === 'not.is.null') {
        rows = rows.filter((row) => row?.[key] !== null && row?.[key] !== undefined);
      } else if (value === 'is.null') {
        rows = rows.filter((row) => row?.[key] === null || row?.[key] === undefined);
      } else if (value.startsWith('in.(') && value.endsWith(')')) {
        const wanted = new Set(value.slice(4, -1).split(',').map((item) => comparable(item.replace(/^"|"$/g, ''))));
        rows = rows.filter((row) => wanted.has(comparable(row?.[key])));
      }
    }

    const order = url.searchParams.get('order');
    if (order) {
      const rules = order.split(',').map((rule) => {
        const parts = rule.split('.');
        return { field: parts[0], desc: parts.includes('desc') };
      }).filter((rule) => rule.field);
      rows.sort((a, b) => {
        for (const rule of rules) {
          const av = a?.[rule.field];
          const bv = b?.[rule.field];
          if (av === bv) continue;
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          const cmp = String(av).localeCompare(String(bv), 'ar', { numeric: true });
          if (cmp) return rule.desc ? -cmp : cmp;
        }
        return 0;
      });
    }

    const offset = Math.max(0, Number(url.searchParams.get('offset') || 0) || 0);
    const limitRaw = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(limitRaw) && limitRaw >= 0 ? limitRaw : rows.length;
    return rows.slice(offset, offset + limit);
  }

  async function serveRestFromSnapshot(request, url) {
    const table = decodeURIComponent(url.pathname.slice('/rest/v1/'.length)).split('/')[0];
    const snapshot = await getSnapshot(false);
    const rows = filterRows(tableRows(snapshot, table), url);
    const accept = request.headers.get('accept') || '';
    const singular = accept.includes('application/vnd.pgrst.object+json');
    const body = singular ? (rows[0] ?? null) : rows;
    const total = rows.length;
    return jsonResponse(body, 200, {
      'content-range': total ? `0-${Math.max(0, total - 1)}/${total}` : '*/0',
      'x-agch-data-source': 'vercel-snapshot',
    });
  }

  async function serveLive(input, init) {
    const now = Date.now();
    if (liveText && now - liveAt < LIVE_TTL) return responseFromText(liveText, liveStatus, liveHeaders);
    if (document.hidden && liveText) return responseFromText(liveText, liveStatus, liveHeaders);
    if (livePromise) {
      const result = await livePromise;
      return responseFromText(result.text, result.status, result.headers);
    }
    livePromise = nativeFetch(input, init).then(async (response) => {
      const text = await response.text();
      const headers = {
        'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      };
      if (response.ok) {
        liveText = text;
        liveStatus = response.status;
        liveHeaders = headers;
        liveAt = Date.now();
      }
      return { text, status: response.status, headers };
    }).finally(() => { livePromise = null; });
    const result = await livePromise;
    return responseFromText(result.text, result.status, result.headers);
  }

  window.fetch = async function guardedFetch(input, init = {}) {
    let request;
    try { request = input instanceof Request ? input : new Request(input, init); }
    catch (_) { return nativeFetch(input, init); }

    const method = String(request.method || init.method || 'GET').toUpperCase();
    let url;
    try { url = new URL(request.url, location.href); }
    catch (_) { return nativeFetch(input, init); }

    if (method === 'GET' && url.origin === location.origin && url.pathname === '/api/public-snapshot') {
      try { return jsonResponse(await getSnapshot(false), 200, { 'x-agch-cache': 'browser' }); }
      catch (_) { return nativeFetch(input, init); }
    }

    if (method === 'GET' && url.origin === location.origin && url.pathname === '/api/live-match-state') {
      return serveLive(input, init);
    }

    if (method === 'GET' && projectOrigin && url.origin === projectOrigin && url.pathname.startsWith('/rest/v1/')) {
      try { return await serveRestFromSnapshot(request, url); }
      catch (_) { return nativeFetch(input, init); }
    }

    return nativeFetch(input, init);
  };

  // The public site does not need one Supabase Realtime socket per visitor.
  // Live-match updates come from the small cached Vercel endpoint instead.
  const db = window.AGCH_SUPABASE_CLIENT || window.aghDb;
  if (db && typeof db.channel === 'function') {
    const fakeChannel = () => {
      const channel = {
        on() { return channel; },
        subscribe(callback) { if (typeof callback === 'function') queueMicrotask(() => callback('SUBSCRIBED')); return channel; },
        unsubscribe() { return Promise.resolve('ok'); },
        send() { return Promise.resolve('ok'); },
        track() { return Promise.resolve('ok'); },
        untrack() { return Promise.resolve('ok'); },
      };
      return channel;
    };
    db.channel = fakeChannel;
    if (typeof db.removeChannel === 'function') db.removeChannel = () => Promise.resolve('ok');
    if (typeof db.removeAllChannels === 'function') db.removeAllChannels = () => Promise.resolve([]);
  }

  // Avoid browser metadata downloads for every video card. A video is loaded only
  // after the viewer chooses to play it.
  const tuneMedia = (root) => {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('video').forEach((video) => {
      if (!video.closest('#aghWatchModal') || video.closest('#aghWatchModal')?.hidden) video.preload = 'none';
    });
  };
  tuneMedia(document);
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) tuneMedia(node);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });

  // Graceful visual fallback while Supabase Storage is temporarily restricted.
  window.addEventListener('error', (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.aghFallback === '1') return;
    if (!String(img.src || '').includes('/api/media-proxy') && !String(img.src || '').includes('/storage/v1/object/')) return;
    img.dataset.aghFallback = '1';
    img.src = '/assets/tournament.jpg';
  }, true);

  // Prime one shared snapshot after the first paint. Failures are intentionally silent.
  const prime = () => getSnapshot(false).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(prime, { timeout: 1500 });
  else setTimeout(prime, 400);
})();
