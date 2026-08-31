const C = "agchorguit-live-v45";
const CORE = [
  "./",
  "index.html",
  "styles.css",
  "match-v2.css",
  "prediction-league.css",
  "matches-reference.css",
  "middle-section.css",
  "football-pro-2026.css",
  "bedouin-final.css",
  "config.js",
  "public-app.js",
  "fair-play-standings.js",
  "prediction-league.js",
  "match-details-final.js",
  "matches-reference.js",
  "rtl-score-fix.js",
  "middle-section.js",
  "football-pro-2026.js",
  "manifest.webmanifest",
  "assets/tournament.jpg",
  "assets/logo-placeholder.svg",
  "assets/teams/senior/hilal.svg",
  "assets/teams/senior/kabba.svg",
  "assets/teams/senior/noujoum.svg",
  "assets/teams/senior/bougabra.svg",
  "assets/teams/senior/hamd.svg",
  "assets/teams/senior/birbaraka.svg"
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
  event.respondWith(fetch(event.request).then(r=>{if(r&&r.ok)caches.open(C).then(c=>c.put(event.request,r.clone())).catch(()=>{});return r}).catch(()=>caches.match(event.request)))
});