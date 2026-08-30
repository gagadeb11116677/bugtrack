const CACHE_NAME = "bugtrack-v1";
const STATIC_ASSETS = ["/", "/brand.jpg", "/icon-192.png", "/icon-512.png", "/manifest.json"];

// Install — cache static assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate — cleanup old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache (except API)
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Don't cache API calls — always network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Network first for pages, cache fallback
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          // Fallback to homepage for navigation requests
          if (e.request.mode === "navigate") return caches.match("/");
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });
      })
  );
});
