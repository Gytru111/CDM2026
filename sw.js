const CACHE='cdm2026-v1';
const URLS=['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>k!==CACHE&&caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return e.respondWith(fetch(e.request));
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(r=>{const c=caches.open(CACHE);c.then(ca=>ca.put(e.request,r.clone()));return r;})));
});
