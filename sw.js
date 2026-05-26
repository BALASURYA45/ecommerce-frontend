/* eslint-disable no-restricted-globals */

const CACHE_NAME = "shopsmart-v11";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./cart.html",
  "./product.html",
  "./login.html",
  "./signup.html",
  "./checkout.html",
  "./admin.html",
  "./admin-tools.html",
  "./styles/main.css",
  "./scripts/cart.js",
  "./scripts/cart-page.js",
  "./scripts/app.js",
  "./scripts/product.js",
  "./scripts/checkout.js",
  "./scripts/admin.js",
  "./scripts/admin-tools.js",
  "./scripts/firebase-init.js",
  "./scripts/firebase-config.js",
  "./scripts/session-ui.js",
  "./scripts/pwa.js",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./favicon.ico",
  "./assets/product-fallback.svg",
  "./assets/products/electronics.svg",
  "./assets/products/fashion.svg",
  "./assets/products/home.svg",
  "./assets/products/accessories.svg",
  "./assets/products/beauty.svg",
  "./assets/products/sports.svg",
  "./assets/demo-products.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => (key === CACHE_NAME ? undefined : caches.delete(key))))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache developer/local-only config files. They change frequently and may not exist.
  if (url.pathname.endsWith(".local.json")) return;

  const isCodeOrDoc = ["script", "style", "document"].includes(request.destination);

  // For HTML/JS/CSS, prefer network to avoid stale assets during development.
  if (isCodeOrDoc) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // For other assets, cache-first is fine.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
