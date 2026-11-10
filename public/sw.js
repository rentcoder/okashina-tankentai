// Only the generic offline page is cached. Never cache family APIs or invitations.
const CACHE = "tankentai-offline-__VERSION__";
const OFFLINE = "/offline";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("tankentai-offline-") && key !== CACHE)
          await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(
        async () =>
          (await caches.match(OFFLINE)) ||
          new Response("オフラインです。つながったら、もういちどひらいてね。", {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
      ),
    );
  }
});
