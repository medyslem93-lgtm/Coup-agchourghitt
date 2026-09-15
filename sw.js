const CACHE = "agchorguit-premium-v19-20260915-mobile";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=20260915-mobile2",
  "referees-section.css?v=20260915-1",
  "team-calendar-v2.css?v=20260915-1",
  "road-to-cup.css?v=20260915-1",
  "motm-v5.css?v=20260915-1",
  "team-of-week-v6.css?v=20260915-1",
  "goal-of-round-v7.css?v=20260915-1",
  "standings-fairplay-v9.css?v=20260915-1",
  "public-app.js?v=20260915-events5",
  "featured-final-hotfix.js?v=20260915-final2",
  "live-stream.js?v=20260915-score1",
  "config.js",
  "vendor/supabase.js?v=2.116.0",
  "manifest.webmanifest",
  "assets/tournament.jpg",
  "assets/logo-placeholder.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(CORE.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Admin pages and their assets must always go straight to Vercel.
  // Never serve the public-site offline fallback for an admin navigation.
  if (
    url.pathname === "/admin" ||
    url.pathname.startsWith("/admin/") ||
    url.pathname === "/admin-dashboard" ||
    url.pathname === "/admin-dashboard.html"
  ) return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())).catch(() => {});
        return response;
      })
      .catch(async () => (await caches.match(event.request)) || (event.request.mode === "navigate" ? caches.match("./") : Response.error())),
  );
});
