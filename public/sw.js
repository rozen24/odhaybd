// "" on a normal domain, "/odhaybd" in the sub-folder
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");

   const CACHE_NAME = "odhay-static-v2";
   const STATIC_ASSETS = ["/", "/offline", "/manifest.webmanifest", "/icons/icon-192.svg", "/icons/icon-512.svg"].map((p) => BASE + p);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
     const path = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname;
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (["/api/", "/account", "/admin", "/seller", "/checkout", "/login"].some((p) => path.startsWith(p))) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(BASE + "/offline")));
    return;
  }

  if (["script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })));
  }
});
