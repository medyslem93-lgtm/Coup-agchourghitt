const CACHE = "agchorguit-premium-v34-20260921-health1";
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
  "fan-experience.css?v=20260919-1",
  "tournament-experience.css?v=20260919-2",
  "site-directory.css?v=20260919-1",
  "app-structure-v2.css?v=20260919-1",
  "scorers-showcase.css?v=20260920-1",
  "player-of-tournament.css?v=20260920-guest1",
  "public-app.js?v=20260918-recap2",
  "fan-experience.js?v=20260919-1",
  "fan-route-guard.js?v=20260920-guest1",
  "tournament-experience.js?v=20260919-2",
  "site-directory.js?v=20260919-1",
  "app-structure-v2.js?v=20260919-1",
  "watch-center-v2.js?v=20260920-1",
  "watch-match-overlay-v1.js?v=20260920-2",
  "watch-overlay-polish-v3.js?v=20260920-1",
  "match-media-score-fix.js?v=20260918-2",
  "match-media-ui-fix.js?v=20260918-2",
  "road-to-cup.js?v=20260917-stages1",
  "featured-final-hotfix.js?v=20260915-final2",
  "live-stream.js?v=20260915-score1",
  "player-of-tournament.js?v=20260920-guest1",
  "config.js?v=20260910-6",
  "vendor/supabase.js?v=2.116.0",
  "manifest.webmanifest",
  "assets/tournament.jpg",
  "assets/logo-placeholder.svg",
  "assets/site-reliability-v1.js?v=20260920-1",
  "assets/directory-guest-fix-v1.js?v=20260920-1",
  "assets/community-official-v2.js?v=20260920-1",
  "assets/community-guest-interactions-v1.js?v=20260920-2",
  "assets/tournament-lineup-polish-v2.js?v=20260920-2",
  "assets/player-vote-profile-flow-v1.js?v=20260920-2",
  "assets/admin-live-refresh-v1.js?v=20260920-2",
  "assets/site-smooth-v5.js?v=20260920-guest1",
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