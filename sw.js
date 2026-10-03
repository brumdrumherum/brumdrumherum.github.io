// Service Worker: macht die App offline nutzbar und installierbar.
// Bei jeder neuen Version die Nummer erhöhen (z.B. 1.0.5, 2.0.0, ...), sonst zeigen die Handys die alte Version.
const CACHE = "brumdrumherum-1.0.5"; // Version 1.0 (Sprint 1), interner Zwischenstand 5
const FILES = ["./", "./index.html", "./demo.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Immer live laden, nie zwischenspeichern: Mapbox, Xano (Baustellen) und die Einstellungen.
  if (url.hostname.endsWith("mapbox.com") || url.hostname.endsWith("xano.io") || url.pathname.endsWith("/config.js")) return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{}); return res;
  }).catch(() => caches.match("./index.html"))));
});
