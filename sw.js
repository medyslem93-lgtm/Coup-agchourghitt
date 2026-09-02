const CACHE = "agchorguit-premium-v2";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=20260902-team-covers",
  "public-app.js?v=20260902-team-covers",
  "config.js",
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
  if (url.origin !== self.location.origin || url.pathname.startsWith("/admin/")) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())).catch(() => {});
        return response;
      })
      .catch(async () => (await caches.match(event.request)) || (event.request.mode === "navigate" ? caches.match("./") : Response.error())),
  );
});
