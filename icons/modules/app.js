/* ============================================================
   modules/app.js
   ============================================================ */

import { APP } from "./config.js";
import { log } from "./utils.js";

import { progress } from "./progress.js";
import { spinner } from "./spinner.js";
import { toast, init as toastInit } from "./toast.js";
import { init as themeInit } from "./theme.js";
import { loadSprites, registry } from "./sprite.js";
import { buildIndex, invalidate, data } from "./data.js";
import { store } from "./store.js";
import { collections } from "./collections.js";
import { router } from "./router.js";
import { chrome } from "./chrome.js";
import { search } from "./search.js";
import { stage } from "./stage.js";
import * as palette from "./palette.js";
import { swRegister, clearCaches, unregisterSW } from "./sw-register.js";

import * as HomeView from "./views/home.js";
import * as CategoriesView from "./views/categories.js";
import * as CategoryView from "./views/category.js";
import * as VarietiesView from "./views/varieties.js";
import * as VarietyView from "./views/variety.js";
import * as BookmarksView from "./views/bookmarks.js";
import * as CollectionsView from "./views/collections.js";
import * as CollectionView from "./views/collection.js";
import * as SearchView from "./views/search.js";

const VIEWS = {
  home: HomeView,
  categories: CategoriesView,
  category: CategoryView,
  varieties: VarietiesView,
  variety: VarietyView,
  bookmarks: BookmarksView,
  collections: CollectionsView,
  collection: CollectionView,
  search: SearchView,
};

async function boot() {
  progress.init();
  spinner.init();
  toastInit();
  themeInit();
  stage.init();
  palette.init();
  swRegister.init();

  progress.start();
  progress.set(0.06);

  const initialVariety = store.variety.current() || "solid";
  progress.set(0.15);

  await loadSprites({
    initial: initialVariety,
    onProgress: (done, total) => {
      const fraction = 0.15 + (done / Math.max(total, 1)) * 0.65;
      progress.set(fraction);
    },
  });
  progress.set(0.82);

  buildIndex();

  const available = data.varieties().filter((v) => v.available && v.loaded);
  const current = store.variety.current();
  const currentValid = available.some((v) => v.key === current);
  if (!currentValid && available.length) store.variety.set(available[0].key);

  chrome.init();
  search.init();

  router.init({
    render: renderRoute,
    onChange: (route) => updateDocumentTitle(route),
  });

  await progress.finish();

  log.info(`${APP.name} v${APP.version} ready — ${registry.total()} icons loaded, ` +
    `${data.varieties().length} varieties registered`);
}

async function renderRoute(route) {
  const container = document.getElementById("view");
  if (!container) { log.error("#view element missing"); return; }

  const currentVariety = store.variety.current();
  if (currentVariety && !registry.isLoaded(currentVariety)) {
    try {
      await registry.ensure(currentVariety);
      invalidate();
    } catch {}
  }

  const view = VIEWS[route.name] || HomeView;

  try {
    await view.render(container, route);
  } catch (err) {
    log.error(`route "${route.name}" threw:`, err);
    renderFallback(container, err);
  }

  if (route.level === "full") {
    try { window.scrollTo({ top: 0, behavior: "instant" }); }
    catch { window.scrollTo(0, 0); }
  }
}

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
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateDocumentTitle(route) {
  const base = APP.name;
  const map = {
    home: null,
    categories: "Categories",
    category: route.params?.key ? prettyKey(route.params.key) : "Category",
    varieties: "Varieties",
    variety: route.params?.key ? prettyKey(route.params.key) : "Variety",
    bookmarks: "Bookmarks",
    collections: "Collections",
    collection: "Collection",
    search: route.query?.q ? `“${route.query.q}”` : "Search",
  };
  const extra = map[route.name];
  document.title = extra ? `${extra} · ${base}` : base;
}

function prettyKey(key) {
  return String(key).split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

window.__forge = {
  version: APP.version,
  store, router, registry, data, collections,
  progress, spinner,
  palette: {
    open: palette.openPalette,
    close: palette.close,
    toggle: palette.toggle,
    isOpen: palette.isOpen,
  },
  sw: { clearCaches, unregister: unregisterSW },
  async reset() {
    store.reset();
    localStorage.clear();
    log.info("state + storage reset — reload to boot clean");
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}