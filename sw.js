const C = "agchorguit-live-v39";
const CORE = [
  "./",
  "index.html",
  "styles.css",
  "match-v2.css",
  "prediction-league.css",
  "matches-reference.css",
  "middle-section.css",
  "stadium-2026.css",
  "football-pro-2026.css",
  "bedouin-final.css",
  "config.js",
  "public-app.js",
  "media-enhancer.js",
  "prediction-league.js",
  "prediction-verification-patch.js",
  "match-details-v2.js",
  "referee-photos.js",
  "matches-reference.js",
  "score-display-fix.js",
  "middle-section.js",
  "stadium-2026.js",
  "football-pro-2026.js",
  "final-stability.js",
  "image-fallback.js",
  "manifest.webmanifest",
  "assets/tournament.jpg",
  "assets/logo-placeholder.svg"
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(C).then(cache=>Promise.all(CORE.map(url=>cache.add(url).catch(()=>null)))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(url.pathname.startsWith("/admin/")){event.respondWith(fetch(event.request));return}
  const isDoc=event.request.mode==="navigate"||event.request.destination==="document";
  if(isDoc){event.respondWith(fetch(event.request).then(r=>{if(r&&r.ok)caches.open(C).then(c=>c.put(event.request,r.clone())).catch(()=>{});return r}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./"))));return}
  event.respondWith(caches.match(event.request).then(hit=>{const network=fetch(event.request).then(r=>{if(r&&r.ok)caches.open(C).then(c=>c.put(event.request,r.clone())).catch(()=>{});return r}).catch(()=>hit);return hit||network}))
});