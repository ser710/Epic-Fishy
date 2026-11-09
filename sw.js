const CACHE_NAME = "tackle-box-v27";
const PREFS_CACHE = "epic-fishy-prefs"; // small settings shared with the page (alert prefs); never deleted on update
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
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== PREFS_CACHE).map((k) => caches.delete(k)))
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


// ---------- Weather safety alerts ----------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow("./");
    })
  );
});

async function readPref(name, fallback) {
  try {
    const cache = await caches.open(PREFS_CACHE);
    const res = await cache.match("prefs/" + name + ".json");
    return res ? await res.json() : fallback;
  } catch (e) {
    return fallback;
  }
}

async function writePref(name, value) {
  try {
    const cache = await caches.open(PREFS_CACHE);
    await cache.put("prefs/" + name + ".json", new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } }));
  } catch (e) {
    // ignore
  }
}

// Best effort: Chrome decides if/when this runs (installed app + engagement), often only every
// several hours. It checks official National Weather Service alerts for the saved location.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "safety-check") event.waitUntil(backgroundSafetyCheck());
});

async function backgroundSafetyCheck() {
  try {
    const prefs = await readPref("safety", null);
    if (!prefs || !prefs.enabled || typeof prefs.lat !== "number" || typeof prefs.lon !== "number") return;
    const res = await fetch("https://api.weather.gov/alerts/active?point=" + prefs.lat.toFixed(4) + "," + prefs.lon.toFixed(4));
    if (!res.ok) return;
    const data = await res.json();
    const seen = await readPref("notified", []);
    const idOf = (f) => "nws-" + ((f.properties && f.properties.id) || f.id);
    const fresh = (data.features || []).filter((f) => !seen.includes(idOf(f)));
    for (const f of fresh.slice(0, 3)) {
      const pr = f.properties || {};
      const severe = pr.severity === "Severe" || pr.severity === "Extreme";
      await self.registration.showNotification("⚠️ " + (pr.event || "Weather alert"), {
        body: [pr.headline, pr.instruction].filter(Boolean).join(" ").slice(0, 300),
        tag: idOf(f),
        icon: "icons/icon-192.png",
        badge: "icons/icon-192.png",
        requireInteraction: severe,
      });
    }
    if (fresh.length) await writePref("notified", seen.concat(fresh.map(idOf)).slice(-100));
  } catch (e) {
    // never let a background check throw
  }
}
