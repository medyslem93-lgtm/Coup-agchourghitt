(() => {
  "use strict";
  const config = window.AGCH_CONFIG || {};
  if (!window.supabase?.createClient || !config.supabaseUrl || !config.supabaseKey) return;

  const db = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "aghchorguit-visit-tracker" } },
  });

  const visitorKey = "aghchorguit-visitor-id";
  const sessionKey = "aghchorguit-session-id";
  const makeId = () => (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  let visitorId = localStorage.getItem(visitorKey);
  if (!visitorId) {
    visitorId = makeId();
    localStorage.setItem(visitorKey, visitorId);
  }

  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = makeId();
    sessionStorage.setItem(sessionKey, sessionId);
  }

  let lastPath = "";
  const record = async () => {
    const path = `${location.pathname}${location.hash || ""}`.slice(0, 500) || "/";
    if (path === lastPath) return;
    lastPath = path;
    let referrerHost = null;
    try { referrerHost = document.referrer ? new URL(document.referrer).host.slice(0, 255) : null; } catch (_) {}
    try {
      await db.from("site_visits").insert({
        visitor_id: visitorId.slice(0, 128),
        session_id: sessionId.slice(0, 128),
        path,
        referrer_host: referrerHost,
      });
    } catch (_) {}
  };

  record();
  window.addEventListener("hashchange", record, { passive: true });
})();
