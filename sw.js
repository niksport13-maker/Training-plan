// AI Coach — service worker for offline support.
// Strategy: cache-first for everything the app shell needs (this page, React/
// ReactDOM/Babel from CDN, and anything else the page fetches at runtime,
// e.g. Google Fonts files). After the first successful online visit, the app
// opens from cache even with no network at all.

const CACHE_NAME = "ai-coach-v1";

// Paths are relative to wherever this file is deployed, so it still works if
// the repo/subfolder name differs. "./" covers whatever file is served as
// the directory index (e.g. index.html).
const APP_SHELL = [
  "./",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // don't fail install if e.g. offline during first deploy check
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline and not cached yet — nothing more we can do
      // Cache-first: serve instantly from cache if we have it, still refresh
      // the cache in the background when online.
      return cached || network;
    })
  );
});
