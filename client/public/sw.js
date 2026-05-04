// MuseWave Service Worker
// FIXED: Previous version pre-cached files that didn't exist, causing
// "Failed to fetch" errors. This version only caches what it successfully
// fetches, and never causes the app to break if a resource is missing.

const CACHE_NAME = "musewave-v2";

// Only cache the app shell — files we KNOW exist at these exact paths.
// Do NOT list files here unless you are certain they exist in /public.
const SHELL_URLS = [
  "/",
  "/src/main.tsx", // dev only — in prod this is a hashed JS bundle
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();

  // Pre-cache silently — never let a missing file block installation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        SHELL_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Silently ignore — the file may not exist in this environment
          })
        )
      );
    })
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept:
  // - Non-GET requests (POST, etc.)
  // - API calls to the backend
  // - Cross-origin requests (fonts, CDN assets)
  // - Chrome extension URLs
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.origin !== self.location.origin ||
    url.protocol === "chrome-extension:"
  ) {
    return; // Let the browser handle it normally
  }

  // Network-first strategy: try network, fall back to cache.
  // This means users always get fresh content when online.
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful responses for offline use
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed — try the cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          // For navigation requests (HTML pages), return the cached root
          if (request.mode === "navigate") {
            return caches.match("/");
          }

          // Nothing available — return a minimal error response
          // rather than throwing, which would cause an ugly browser error
          return new Response("Offline — resource not available", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        });
      })
  );
});