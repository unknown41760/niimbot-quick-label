// Bump VERSION with every app release so the whole offline shell updates together.
const VERSION = "0.4.0-test";
const CACHE_PREFIX = "quick-label-d11h-";
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const ASSETS = [
  "./",
  "./index.html",
  "./app.js?v=0.4.0",
  "./vendor/niimbot.js?v=2.6.0",
  "./vendor/label-memory.js?v=2.6.0",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
];
const ASSET_URLS = new Set(ASSETS.map((path) => new URL(path, self.registration.scope).href));
const ROOT_PATH = new URL("./", self.registration.scope).pathname;
const INDEX_PATH = new URL("./index.html", self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // A failed download leaves the previous worker and its complete cache in place.
      await cache.addAll(ASSETS.map((path) => new Request(new URL(path, self.registration.scope), { cache: "reload" })));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Navigation query strings do not change the app shell. Script query strings
  // are exact release identifiers and must never be mixed across releases.
  const key = event.request.mode === "navigate" && (url.pathname === ROOT_PATH || url.pathname === INDEX_PATH)
    ? new URL("./", self.registration.scope).href
    : (ASSET_URLS.has(url.href) ? url.href : null);
  if (!key) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(key)) || fetch(event.request);
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  } else if (event.data?.type === "GET_STATUS" && event.ports?.[0]) {
    event.waitUntil((async () => {
      const ready = await caches.has(CACHE_NAME);
      event.ports[0].postMessage({ version: VERSION, offlineReady: ready });
    })());
  }
});
