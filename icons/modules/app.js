/* ============================================================
   ICON FORGE — js/app.js
   Boot orchestrator. The only module index.html includes.

   Boot order:
     1.  DOM-only modules (progress, spinner, toast, theme,
         stage, palette, service worker register)
     2.  Load every sprite file (auto-discovery or manifest)
     3.  Build the icon index from the loaded registry
     4.  Chrome (navbars) + global search — now that data exists
     5.  Router init + first route render
     6.  Tidy up the boot UX

   Failures:
     • Sprite files → sprite.js installs fallbacks so the UI
       renders meaningfully.
     • A route handler throwing → the router logs and paints an
       error card.
     • Service worker → silently skipped on localhost and file://.
   ============================================================ */

import { APP, UI, TIMING } from "./config.js";
import { log, storage }    from "./utils.js";

import { progress }   from "./progress.js";
import { spinner }    from "./spinner.js";
import { toast }      from "./toast.js";
import { theme }      from "./theme.js";
import { loadSprites, registry } from "./sprite.js";
import { buildIndex, data }      from "./data.js";
import { store }      from "./store.js";
import { collections } from "./collections.js";
import { router }     from "./router.js";
import { chrome }     from "./chrome.js";
import { search }     from "./search.js";

/* Stage — the module exposes `stage` as a namespace object
   (see the patch note at the bottom of this file if you haven't
   applied it yet). */
import { stage }      from "./stage.js";

/* Palette — namespace-style named exports. */
import * as palette   from "./palette.js";

/* Service worker */
import { swRegister, clearCaches, unregisterSW } from "./sw-register.js";

/* ------------------------------------------------------------
   Views
   ------------------------------------------------------------ */
import * as HomeView        from "./views/home.js";
import * as CategoriesView  from "./views/categories.js";
import * as CategoryView    from "./views/category.js";
import * as VarietiesView   from "./views/varieties.js";
import * as VarietyView     from "./views/variety.js";
import * as BookmarksView   from "./views/bookmarks.js";
import * as CollectionsView from "./views/collections.js";
import * as CollectionView  from "./views/collection.js";
import * as SearchView      from "./views/search.js";

/* ============================================================
   ROUTE → VIEW MAP
   ============================================================ */
const VIEWS = {
  home:        HomeView,
  categories:  CategoriesView,
  category:    CategoryView,
  varieties:   VarietiesView,
  variety:     VarietyView,
  bookmarks:   BookmarksView,
  collections: CollectionsView,
  collection:  CollectionView,
  search:      SearchView,
};

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  /* ---------- 1. DOM-only modules ---------- */
  progress.init();
  spinner.init();
  toast.init();
  theme.init();

  // Stage and palette both build their own UI, but rely on the
  // DOM nodes from index.html and the sprite registry existing
  // by the time they're first used. Safe to init now.
  stage.init();
  palette.init();

  // Service worker registration is deferred (see sw-register.js).
  swRegister.init();

  /* ---------- 2. Show the top progress bar immediately ---------- */
  progress.start();
  progress.set(0.06);

  /* ---------- 3. Load sprites (lazy — one variety only) ---------- */
  const initialVariety = store.variety.current() || "solid";
  progress.set(0.15);
  await loadSprites({
    initial: initialVariety,
    onProgress: (done, total) => {
      // Manifest discovery gives us a count; the actual load
      // brings us most of the way.
      const fraction = 0.15 + (done / Math.max(total, 1)) * 0.65;
      progress.set(fraction);
    },
  });
  progress.set(0.82);

  /* ---------- 4. Build the icon index ---------- */
  buildIndex();

  /* ---------- 5. Sanity check the persisted variety ---------- */
  const allVarieties = data.varieties();
  const available    = allVarieties.filter((v) => v.available);
  const current      = store.variety.current();
  const currentValid = available.some((v) => v.key === current);
  if (!currentValid && available.length) {
    store.variety.set(available[0].key);
  }

  /* ---------- 6. Chrome + search ---------- */
  chrome.init();
  search.init();

  /* ---------- 7. Router init and first render ---------- */
  router.init({
    render:   renderRoute,
    onChange: (route) => updateDocumentTitle(route),
  });

  /* ---------- 8. Tidy the boot UX ---------- */
  await progress.finish();

  log.info(
    `${APP.name} v${APP.version} ready — ` +
    `${registry.total()} icons · ${available.length} varieties`
  );
}

/* ============================================================
   ROUTE DISPATCH
   ============================================================ */
async function renderRoute(route) {
  const container = document.getElementById("view");
  if (!container) {
    log.error("#view element missing");
    return;
  }

  const view = VIEWS[route.name] || HomeView;

  try {
    await view.render(container, route);
  } catch (err) {
    log.error(`route "${route.name}" threw:`, err);
    renderFallback(container, err);
  }

  // Full navigations scroll to the top of the page. Fragment
  // transitions leave the user where they were.
  if (route.level === "full") {
    try {
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }
  }
}

/* ============================================================
   FALLBACK ERROR VIEW
   ============================================================ */
function renderFallback(container, err) {
  const safeMessage = escapeHtml(err?.message || "Unknown error");
  container.replaceChildren(
    Object.assign(document.createElement("div"), {
      className: "empty",
      innerHTML: `
        <span class="empty__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true"><path d="M12 9v4M12 17h.01"/>
            <circle cx="12" cy="12" r="9"/></svg>
        </span>
        <h3 class="empty__title">Something went sideways</h3>
        <p class="empty__text">${safeMessage}</p>
        <button class="empty__cta" type="button" onclick="location.hash='#/'">
          Back to Home
        </button>
      `,
    })
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   DOCUMENT TITLE
   ============================================================ */
function updateDocumentTitle(route) {
  const base = APP.name;
  const map = {
    home:        null,
    categories:  "Categories",
    category:    route.params?.key ? prettyKey(route.params.key) : "Category",
    varieties:   "Varieties",
    variety:     route.params?.key ? prettyKey(route.params.key) : "Variety",
    bookmarks:   "Bookmarks",
    collections: "Collections",
    collection:  "Collection",
    search:      route.query?.q ? `“${route.query.q}”` : "Search",
  };
  const extra = map[route.name];
  document.title = extra ? `${extra} · ${base}` : base;
}

function prettyKey(key) {
  return String(key)
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

/* ============================================================
   DEBUG SURFACE
   ============================================================ */
window.__forge = {
  version: APP.version,

  // core
  store,
  router,
  registry,
  data,
  collections,

  // loading UX (useful when tuning TIMING.*)
  progress,
  spinner,

  // palette control
  palette: {
    open: palette.openPalette,
    close: palette.close,
    toggle: palette.toggle,
    isOpen: palette.isOpen,
  },

  // service worker controls
  sw: {
    clearCaches,
    unregister: unregisterSW,
  },

  // shorthands for the console
  async reset() {
    store.reset();
    localStorage.clear();
    log.info("state + storage reset — reload to boot clean");
  },
};

/* ============================================================
   KICK OFF
   ============================================================ */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}