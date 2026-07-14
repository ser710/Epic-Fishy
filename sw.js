const CACHE_NAME = "tackle-box-v9";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./firebase-config.js", "./firebase-bootstrap.js", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// App shell: cache-first. Everything else (weather/tide/radar APIs, CDN modules): network-first,
// falling back to cache only if available, so live data stays fresh whenever online.
self.addEventListener("fetch", (event) => {
  const isAppShell = APP_SHELL.some((p) => event.request.url.endsWith(p.replace("./", "")));
  if (isAppShell) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
