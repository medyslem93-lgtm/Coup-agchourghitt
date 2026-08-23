const C='agchorguit-live-v15';
const CORE=['./','index.html','styles.css','match-v2.css','matches-reference.css','matches-reference-patch.css','middle-section.css','middle-section-patch.css','config.js','public-app.js','media-enhancer.js','match-details-v2.js','matches-reference.js','middle-section.js','middle-section-patch.js','manifest.webmanifest','assets/tournament.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  const u=new URL(e.request.url);
  if(u.pathname.startsWith('/admin/')){e.respondWith(fetch(e.request));return}
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(C).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))));
});