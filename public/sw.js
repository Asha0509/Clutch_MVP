// Clutch service worker: makes the investor demo work offline (PRD Sec 3.3, Sec 13 step 9).
// Pages: network first, falling back to the cached copy. Static assets: cache first.
const CACHE = "clutch-demo-v2";
const PAGES = [
  "/",
  "/demo/checkup",
  "/demo/change",
  "/demo/waiver",
  "/demo/pay",
  "/demo/verdict",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PAGES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const save = (request, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches
        .match(request)
        .then((hit) => hit || fetch(request).then((res) => save(request, res))),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => save(request, res))
      .catch(() =>
        caches.match(request).then((hit) => {
          if (hit) return hit;
          if (request.mode !== "navigate") return Response.error(); // Next.js then loads the page in full
          // Only demo pages fall back to the demo; live pages must never show the made-up person's figures.
          if (url.pathname === "/" || url.pathname.startsWith("/demo"))
            return caches.match("/demo/checkup");
          return new Response(
            "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Offline</title>" +
              "<p style='font-family:sans-serif;padding:1rem'>You are offline. This page needs a connection. " +
              "<a href='/demo/checkup'>The demo</a> works offline.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }),
      ),
  );
});
