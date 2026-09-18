const CACHE = "agchorguit-premium-v29-20260918-media-goal-download";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=20260917-media1",
  "referees-section.css?v=20260915-1",
  "team-calendar-v2.css?v=20260915-1",
  "road-to-cup.css?v=20260917-stages1",
  "team-of-week-v6.css?v=20260915-1",
  "goal-of-round-v7.css?v=20260915-1",
  "standings-fairplay-v9.css?v=20260915-1",
  "public-app.js?v=20260918-recap2",
  "match-media-score-fix.js?v=20260918-2",
  "road-to-cup.js?v=20260917-stages1",
  "welcome-screen.js?v=20260916-intro1",
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