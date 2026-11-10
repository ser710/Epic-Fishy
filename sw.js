const CACHE_NAME = "tackle-box-v46";
const TILE_CACHE = "epic-fishy-tiles-2"; // saved + recently viewed map tiles; never deleted on update
const TILE_MAX = 1200;
const PREFS_CACHE = "epic-fishy-prefs"; // small settings shared with the page (alert prefs); never deleted on update
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./firebase-config.js", "./firebase-bootstrap.js", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(APP_SHELL.map((u) => fetch(new Request(u, { cache: "reload" })).then((r) => (r.ok ? cache.put(u, r) : null))))).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== PREFS_CACHE && k !== TILE_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Pages (index.html): network-first so a new release shows on the very next open; falls back to the saved copy offline.
// Other app-shell files: cache-first. Everything else (weather/tide/radar APIs, CDN modules): network-first.
// Same key the page uses when it saves tiles for offline .
function tileKey(url) {
  const m = /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Topo_Map\/MapServer\/tile\/(\d+)\/(\d+)\/(\d+)/.exec(url);
  return m ? "https://epicfishy.tiles/topo/" + m[1] + "/" + m[2] + "/" + m[3] : null;
}
let tilePuts = 0;
async function tileResponse(request, key) {
  const cache = await caches.open(TILE_CACHE);
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = await fetch(new Request(request.url, { mode: "cors" }));
  if (res && res.ok) {
    cache.put(key, res.clone());
    if (++tilePuts % 25 === 0) {
      cache.keys().then((ks) => { if (ks.length > TILE_MAX) ks.slice(0, ks.length - TILE_MAX + 200).forEach((k) => cache.delete(k)); });
    }
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = event.request.url;
  const tk = tileKey(url);
  if (tk) { event.respondWith(tileResponse(event.request, tk).catch(() => Response.error())); return; }
  const isPage = event.request.mode === "navigate" || /\/(index\.html)?(\?.*)?$/.test(url);
  const isAppShell = APP_SHELL.some((p) => url.endsWith(p.replace("./", "")));
  if (isPage) {
    event.respondWith(
      fetch(new Request(event.request, { cache: "no-cache" }))
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy)); }
          return res;
        })
        .catch(() => caches.match("./index.html").then((c) => c || caches.match(event.request)))
    );
  } else if (isAppShell) {
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
