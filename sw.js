// Service Worker: macht die App offline nutzbar und installierbar.
// Strategie: Seiten (HTML) immer zuerst frisch aus dem Netz, nur offline aus dem Speicher.
// So zeigt das Handy nach einem Update sofort die neue Version.
// Bei jeder neuen Version die Nummer erhöhen (z.B. 1.0.8, 2.0.0, ...).
const CACHE = "brumdrumherum-1.0.7"; // Version 1.0 (Sprint 1), interner Zwischenstand 7
const FILES = ["./", "./index.html", "./demo.html", "./beta.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  // cache: "reload" umgeht den Browser-Zwischenspeicher, damit wirklich die neuen Dateien gespeichert werden
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: "reload" })))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Immer live laden, nie zwischenspeichern: Mapbox, Xano (Baustellen) und die Einstellungen.
  if (url.hostname.endsWith("mapbox.com") || url.hostname.endsWith("xano.io") || url.pathname.endsWith("/config.js")) return;
  const isPage = e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/sw.js");
  if (isPage) {
    // Netz zuerst, Speicher nur als Rückfall (offline)
    e.respondWith(fetch(new Request(e.request, { cache: "no-store" })).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html"))));
    return;
  }
  // Bilder und Manifest: Speicher zuerst
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return res;
  })));
});

// Push (Beta): zeigt die Nachricht des Backends an und öffnet beim Antippen die Beta-App.
self.addEventListener("push", e => {
  let d = {}; try{ d = e.data ? e.data.json() : {}; }catch(_){ d = {body: e.data && e.data.text()}; }
  e.waitUntil(self.registration.showNotification(d.title || "Brumdrumherum", { body: d.body || "Neue Baustelle auf deiner Strecke.", icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: d.url || "beta.html" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "beta.html", self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:"window", includeUncontrolled:true}).then(list => { for(const c of list){ if(c.url===url && "focus" in c) return c.focus(); } return clients.openWindow(url); }));
});
