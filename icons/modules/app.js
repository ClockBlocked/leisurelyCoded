




/* ============================================================
   ICON FORGE — js/app.js
   Boot orchestrator. This is the only file index.html needs
   to include (as type="module").

   Responsibilities:
     1. Initialize DOM-only modules (progress, spinner, toast,
        theme, chrome, search, stage).
     2. Load every sprite file.
     3. Build the icon index from the loaded registry.
     4. Register route handlers for every page.
     5. Kick the router.

   Failure modes:
     • If sprites can't be fetched, the sprite module installs
       fallback symbols so the UI still renders.
     • If a route handler throws, the router logs and continues.
   ============================================================ */

import { log }        from "./utils.js";
import { progress }   from "./progress.js";
import { spinner }    from "./spinner.js";
import { toast }      from "./toast.js";
import { theme }      from "./theme.js";
import { chrome }     from "./chrome.js";
import { search }     from "./search.js";
import { stage }      from "./stage.js";
import { loadSprites, registry } from "./sprite.js";
import { buildIndex, data }      from "./data.js";
import { store }      from "./store.js";
import { router }     from "./router.js";

/* ------------------------------------------------------------
   View modules
   ------------------------------------------------------------ */
import * as HomeView       from "./views/home.js";
import * as CategoriesView from "./views/categories.js";
import * as CategoryView   from "./views/category.js";
import * as VarietiesView  from "./views/varieties.js";
import * as VarietyView    from "./views/variety.js";
import * as BookmarksView  from "./views/bookmarks.js";
import * as SearchView     from "./views/search.js";

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  // ---- 1. DOM modules first so the loading UI is wired before
  //         any network activity.
  progress.init();
  spinner.init();
  toast.init();
  theme.init();
  stage.init();

  // Show the top bar immediately so the app feels alive.
  progress.start();
  progress.set(0.08);

  // ---- 2. Load every sprite file
  await loadSprites((done, total) => {
    const fraction = 0.08 + (done / Math.max(total, 1)) * 0.72;
    progress.set(fraction);
  });

  progress.set(0.9);

  // ---- 3. Build the icon index from the registry
  buildIndex();

  // ---- 4. Now that data exists, mount the nav bars so they
  //         reflect real counts.
  chrome.init();
  search.init();

  // ---- 5. Register routes and let the router paint the first
  //         view.
  router.init({
    render: renderRoute,
    onChange: (route, meta) => {
      // Update <title> and a data attribute for CSS hooks.
      updateDocumentTitle(route);
    },
  });

  // ---- 6. Tidy boot
  await progress.finish();

  // Reflect initial variety in the URL if we landed on home
  // without one (this keeps deep links clean).
  const current = router.current();
  if (current?.name === "home" && !location.hash) {
    // no-op — the store already holds the persisted variety
  }

  log.info("Icon Forge ready");
}

/* ============================================================
   ROUTE DISPATCH
   ------------------------------------------------------------
   Every route handler is `(container, route) => Promise<void>`.
   ============================================================ */
async function renderRoute(route) {
  const container = document.getElementById("view");
  if (!container) {
    log.error("#view element missing");
    return;
  }

  const view = {
    home:       HomeView,
    categories: CategoriesView,
    category:   CategoryView,
    varieties:  VarietiesView,
    variety:    VarietyView,
    bookmarks:  BookmarksView,
    search:     SearchView,
  }[route.name] || HomeView;

  try {
    await view.render(container, route);
  } catch (err) {
    log.error(`route "${route.name}" threw:`, err);
    renderFallback(container, err);
  }

  // Restore focus to the top of the page after full navigations
  // (feels abrupt otherwise, especially on mobile).
  if (route.level === "full") {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
}

/* ============================================================
   FALLBACK ERROR VIEW
   ============================================================ */
function renderFallback(container, err) {
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
        <p class="empty__text">${escapeHtml(err?.message || "Unknown error")}</p>
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
  const base = "Icon Forge";
  const map = {
    home:       null,
    categories: "Categories",
    category:   route.params?.key ? prettyKey(route.params.key) : "Category",
    varieties:  "Varieties",
    variety:    route.params?.key ? prettyKey(route.params.key) : "Variety",
    bookmarks:  "Bookmarks",
    search:     route.query?.q ? `“${route.query.q}”` : "Search",
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
   BOOT WHEN READY
   ============================================================ */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  // Already parsed (module scripts are deferred by nature, so
  // this path is the usual one).
  boot();
}

/* ============================================================
   Expose a tiny debug surface (safe to leave in production).
   ============================================================ */
window.__forge = {
  store,
  router,
  registry,
  data,
  progress,
  spinner,
};