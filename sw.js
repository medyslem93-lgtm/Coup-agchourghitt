const C = "agchorguit-rebuild-v47";
const CORE = [
  "./",
  "index.html",
  "app-rebuild-2026.css",
  "styles.css",
  "match-v2.css",
  "prediction-league.css",
  "matches-reference.css",
  "middle-section.css",
  "football-pro-2026.css",
  "bedouin-final.css",
  "ux-rtl-2026.css",
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
  "assets/logo-placeholder.svg"
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(C).then(cache=>Promise.all(CORE.map(url=>cache.add(new Request(url,{cache:"reload"})).catch(()=>null)))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))).then(async()=>{await self.clients.claim();const clients=await self.clients.matchAll({type:"window"});clients.forEach(client=>client.postMessage({type:"UI_REBUILD_READY",cache:C}))}))});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(url.pathname.startsWith("/admin/")){event.respondWith(fetch(event.request));return}
  const isDoc=event.request.mode==="navigate"||event.request.destination==="document";
  event.respondWith(fetch(new Request(event.request,{cache:"no-store"})).then(r=>{if(r&&r.ok)caches.open(C).then(c=>c.put(event.request,r.clone())).catch(()=>{});return r}).catch(()=>isDoc?caches.match("./"):caches.match(event.request)))
});