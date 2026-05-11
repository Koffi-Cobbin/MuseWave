// MuseWave Service Worker v3
// Strategy: network-first for all same-origin GET requests.
// Falls back to cache when offline. Never blocks install on missing files.

const CACHE_NAME = "musewave-v3";

// App shell — pre-cached during install for offline support
const SHELL_URLS = [
  "/",
  "/favicon.png",
  "/favicon_io/android-chrome-192x192.png",
  "/favicon_io/android-chrome-512x512.png",
  "/favicon_io/apple-touch-icon.png",
  "/manifest.json",
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        SHELL_URLS.map((url) => cache.add(url).catch(() => {}))
      )
    )
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through: non-GET, API calls, cross-origin, chrome-extension
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.origin !== self.location.origin ||
    url.protocol === "chrome-extension:"
  ) {
    return;
  }

  // Network-first: try network, write to cache, fall back to cache on failure
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // For page navigations, serve the cached root so the SPA can handle routing
          if (request.mode === "navigate") return caches.match("/");
          return new Response("Offline — resource not available", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        })
      )
  );
});
