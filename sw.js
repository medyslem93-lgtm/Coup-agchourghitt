const CACHE = "agchorguit-live-clock-v58-20260925";
// Keep installation small so a first-time viewer can open the site during a match.
const CORE = ["./", "index.html", "styles.css?v=20260917-media1", "public-app.js?v=20260925-clock2", "config.js?v=20260910-6", "assets/tournament.jpg"];

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
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || event.request.destination === "video" || event.request.headers.has("range")) return;
  const cachePut = (response) => {
    if (response.ok && response.type === "basic") {
      caches.open(CACHE).then(cache => cache.put(event.request, response.clone())).catch(() => {});
    }
    return response;
  };
  if (event.request.mode === "navigate" || url.pathname === "/index.html" || url.pathname === "/") {
    event.respondWith(fetch(event.request).then(cachePut).catch(async () =>
      (await caches.match(event.request)) || (await caches.match("./")) || Response.error()));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(cachePut)));
});
