/* ============================================================
   ICON FORGE — sw.js
   Service worker for offline caching.

   Strategy:
     • App shell (HTML, CSS, JS modules) → stale-while-revalidate
     • Sprite SVGs + manifest          → cache-first, forever
       (they don't change unless you redeploy)
     • Everything else                 → network, fall back to cache

   Cache names are versioned; bumping VERSION invalidates
   everything cleanly on the next visit.

   Registered from js/sw-register.js. Skipped on localhost by
   default (so dev iteration is instant) — override with
   ?sw=force in the URL.
   ============================================================ */

const VERSION   = "v2.0.0";
const SHELL     = `iconforge-shell-${VERSION}`;
const SPRITES   = `iconforge-sprites-${VERSION}`;
const RUNTIME   = `iconforge-runtime-${VERSION}`;

/* ------------------------------------------------------------
   PRECACHE (best-effort — missing files don't break install)
   ------------------------------------------------------------ */
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./js/app.js",
  "./js/chrome.js",
  "./js/collections.js",
  "./js/config.js",
  "./js/data.js",
  "./js/palette.js",
  "./js/progress.js",
  "./js/router.js",
  "./js/search.js",
  "./js/spinner.js",
  "./js/sprite.js",
  "./js/stage.js",
  "./js/store.js",
  "./js/taxonomy.js",
  "./js/theme.js",
  "./js/toast.js",
  "./js/utils.js",
  "./js/views/home.js",
  "./js/views/categories.js",
  "./js/views/category.js",
  "./js/views/varieties.js",
  "./js/views/variety.js",
  "./js/views/bookmarks.js",
  "./js/views/collections.js",
  "./js/views/collection.js",
  "./js/views/search.js",
];

/* ------------------------------------------------------------
   INSTALL
   ------------------------------------------------------------ */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Fetch each URL individually so one 404 doesn't abort install.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, res);
          } catch {
            /* missing file — skip silently */
          }
        })
      );
      self.skipWaiting();
    })()
  );
});

/* ------------------------------------------------------------
   ACTIVATE — prune old caches
   ------------------------------------------------------------ */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.endsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/* ------------------------------------------------------------
   FETCH
   ------------------------------------------------------------ */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GETs
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Ignore cross-origin (analytics, fonts, etc.)
  if (url.origin !== self.location.origin) return;

  // Ignore the service worker itself and the register script.
  if (url.pathname.endsWith("/sw.js") || url.pathname.endsWith("/sw-register.js")) {
    return;
  }

  // ---- Sprite SVG → cache-first, long-lived ----
  if (
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith("sprite-manifest.json")
  ) {
    event.respondWith(cacheFirst(req, SPRITES));
    return;
  }

  // ---- Navigation requests (HTML) → network-first, fall back to cache ----
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(networkFirst(req, SHELL));
    return;
  }

  // ---- App shell JS / CSS → stale-while-revalidate ----
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".html")
  ) {
    event.respondWith(staleWhileRevalidate(req, SHELL));
    return;
  }

  // ---- Everything else → network with runtime cache fallback ----
  event.respondWith(networkFirst(req, RUNTIME));
});

/* ------------------------------------------------------------
   STRATEGIES
   ------------------------------------------------------------ */
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;

  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // Offline and not cached — return a 504 so the caller can
    // gracefully degrade (sprite.js handles this case).
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

  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  return hit || (await fetchPromise) || new Response("Offline", { status: 504 });
}

/* ------------------------------------------------------------
   MESSAGE CHANNEL
   ------------------------------------------------------------
   The page can postMessage({ type: "SKIP_WAITING" }) to force
   an update. Useful when you deploy a new version and want the
   user to pick up changes without closing every tab.
   ------------------------------------------------------------ */
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (data.type === "CLEAR_CACHES") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      })()
    );
  }
});