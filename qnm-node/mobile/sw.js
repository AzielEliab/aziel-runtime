/**
 * Shell cache for the Track 2 LAN join page.
 * /v1/ and /health stay on the network. This worker does not invent peers.
 * Author: Aziel Eliab only.
 */

const CACHE = "track2-mobile-shell-1";
const SHELL = [
  "/mobile/",
  "/mobile/index.html",
  "/mobile/page.css",
  "/mobile/page.mjs",
  "/mobile/join.mjs",
  "/mobile/manifest.webmanifest",
  "/mobile/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/v1/") || url.pathname === "/health" || url.pathname.startsWith("/local/")) return;
  if (!url.pathname.startsWith("/mobile")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request)),
  );
});
