(() => {
  "use strict";
  const config = window.AGCH_CONFIG || {};
  if (!window.supabase?.createClient || !config.supabaseUrl || !config.supabaseKey) return;

  const db = window.AGCH_SUPABASE_CLIENT || window.aghDb || window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { headers: { "x-client-info": "aghchorguit-visit-tracker-v2" } },
  });

  const visitorKey = "aghchorguit-visitor-id";
  const makeId = () => (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  let visitorId = localStorage.getItem(visitorKey);
  if (!visitorId) {
    visitorId = makeId();
    localStorage.setItem(visitorKey, visitorId);
  }

  let sent = false;
  const recordEntry = async () => {
    if (sent) return;
    sent = true;
    const path = `${location.pathname}${location.hash || ""}`.slice(0, 500) || "/";
    let referrerHost = null;
    try { referrerHost = document.referrer ? new URL(document.referrer).host.slice(0, 255) : null; } catch (_) {}
    try {
      await db.from("site_visits").insert({
        visitor_id: visitorId.slice(0, 128),
        session_id: makeId().slice(0, 128),
        path,
        referrer_host: referrerHost,
      });
    } catch (_) {}
  };

  // كل دخول/تحميل للموقع يضيف زيارة واحدة فقط. التنقل داخل الصفحات لا يكرر العد.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", recordEntry, { once: true });
  else recordEntry();
})();