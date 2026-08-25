const C='agchorguit-live-v33';
const CORE=['./','index.html','styles.css','match-v2.css','prediction-league.css','matches-reference.css','matches-reference-patch.css','middle-section.css','middle-section-patch.css','world-ui.css','site-health.css','config.js','public-app.js','media-enhancer.js','prediction-league.js','prediction-verification-patch.js','match-details-v2.js','referee-photos.js','matches-reference.js','score-display-fix.js','middle-section.js','middle-section-patch.js','middle-watchdog.js','image-fallback.js','world-ui.js','runtime-health.js','site-health.js','manifest.webmanifest','assets/tournament.jpg','assets/logo-placeholder.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(C).then(cache=>Promise.all(CORE.map(url=>cache.add(url).catch(()=>null)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(url.pathname.startsWith('/admin/')){event.respondWith(fetch(event.request));return;}
  event.respondWith(fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(C).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./'))));
});
