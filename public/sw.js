// ---------------------------------------------------------------------------
// Infinity X Enterprise Cloud Portal — Offline Service Worker
//
// Strategy:
//  - Navigation requests (HTML pages): network-first, falling back to the
//    cached /offline.html shell if the network is unreachable.
//  - Static build assets (_next/static, fonts, images): stale-while-
//    revalidate — serve from cache instantly, refresh the cache in the
//    background for next time.
//  - Everything else (API calls, telemetry beacons, etc.): passed straight
//    through to the network, untouched.
//
// Bump CACHE_VERSION on any deploy that changes what should be precached —
// this drives cleanup of old caches in the activate event.
// ---------------------------------------------------------------------------

const CACHE_VERSION = "ix-portal-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = ["/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("ix-portal-") &&
              key !== STATIC_CACHE &&
              key !== RUNTIME_CACHE
          )
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept GET — never cache mutations, telemetry POSTs, etc.
  if (request.method !== "GET") return;

  // Navigations: try the network first so users always get fresh HTML when
  // online; fall back to the offline shell only when the network fails.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match("/offline.html")
          .then((cached) => cached || Response.error())
      )
    );
    return;
  }

  // Static build assets: stale-while-revalidate.
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Everything else — API routes, telemetry, SSE streams — untouched.
});