// 0.2.0-test: retire the prototype's cache-first service worker during hardware tests.
// No fetch handler means every navigation and script request uses the network.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("quick-label-d11h-")).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});
