/* ============================================================
   sw.js
   ============================================================ */

const VERSION = "v3.0.0";
const SHELL   = `iconforge-shell-${VERSION}`;
const SPRITES = `iconforge-sprites-${VERSION}`;
const RUNTIME = `iconforge-runtime-${VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./sprite-manifest.json",
  "./modules/app.js",
  "./modules/chrome.js",
  "./modules/collections.js",
  "./modules/config.js",
  "./modules/data.js",
  "./modules/palette.js",
  "./modules/progress.js",
  "./modules/router.js",
  "./modules/search.js",
  "./modules/spinner.js",
  "./modules/sprite.js",
  "./modules/stage.js",
  "./modules/store.js",
  "./modules/sw-register.js",
  "./modules/taxonomy.js",
  "./modules/theme.js",
  "./modules/toast.js",
  "./modules/utils.js",
  "./modules/views/home.js",
  "./modules/views/categories.js",
  "./modules/views/category.js",
  "./modules/views/varieties.js",
  "./modules/views/variety.js",
  "./modules/views/bookmarks.js",
  "./modules/views/collections.js",
  "./modules/views/collection.js",
  "./modules/views/search.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(PRECACHE_URLS.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "reload" });
        if (res.ok) await cache.put(url, res);
      } catch {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/sw.js") || url.pathname.endsWith("/sw-register.js")) return;

  if (url.pathname.endsWith(".svg") || url.pathname.endsWith("sprite-manifest.json")) {
    event.respondWith(cacheFirst(req, SPRITES));
    return;
  }

  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(networkFirst(req, SHELL));
    return;
  }

  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".html")) {
    event.respondWith(staleWhileRevalidate(req, SHELL));
    return;
  }

  event.respondWith(networkFirst(req, RUNTIME));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response("Offline", { status: 504, statusText: "Offline" });
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    return new Response("Offline", { status: 504, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await fetchPromise) || new Response("Offline", { status: 504 });
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  else if (data.type === "CLEAR_CACHES") {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    })());
  }
});