




/* ============================================================
   ICON FORGE — js/router.js
   Hash-based router. The single orchestrator of full vs.
   fragment transitions — nothing else should drive the
   progress bar or spinner during navigation.

   Route shapes:
     #/                     → home          (full)
     #/categories           → categories    (full)
     #/categories/:key      → category      (full)
     #/varieties            → varieties     (full)
     #/varieties/:key       → variety       (full)
     #/bookmarks            → bookmarks     (full)
     #/search?q=…           → search        (fragment)

   Level decision:
     • Same route name + only query differs  → fragment
     • Route declared as "fragment"          → fragment
     • Otherwise                             → full

   The renderer is injected at init(). It must return a Promise
   that resolves when the view is painted; the router will hold
   the loading UX until then, plus an artificial delay from
   TIMING so the animations stay legible.
   ============================================================ */

import { TIMING, UI } from "./config.js";
import { progress } from "./progress.js";
import { spinner }  from "./spinner.js";
import { log } from "./utils.js";

/* ============================================================
   1. ROUTE TABLE
   ============================================================ */
const ROUTES = [
  { name: "home",       pattern: /^\/?$/,                       level: "full",     params: [] },
  { name: "categories", pattern: /^\/categories\/?$/,           level: "full",     params: [] },
  { name: "category",   pattern: /^\/categories\/([^/]+)\/?$/,  level: "full",     params: ["key"] },
  { name: "varieties",  pattern: /^\/varieties\/?$/,            level: "full",     params: [] },
  { name: "variety",    pattern: /^\/varieties\/([^/]+)\/?$/,   level: "full",     params: ["key"] },
  { name: "bookmarks",  pattern: /^\/bookmarks\/?$/,            level: "full",     params: [] },
  { name: "search",     pattern: /^\/search\/?$/,               level: "fragment", params: [] },
];

const DEFAULT_PATH = "/";

/* ============================================================
   2. STATE
   ============================================================ */
const state = {
  current: null,     // parsed route object
  renderer: null,    // async (route) => void
  token: 0,          // increments per transition (cancels stale)
  booted: false,
};

const listeners = new Set();

/* ============================================================
   3. PUBLIC API
   ============================================================ */
export const router = {
  /**
   * Boot the router.
   * @param {object} opts
   * @param {(route) => Promise<void>} opts.render
   * @param {(route) => void} [opts.onChange]
   */
  init({ render, onChange } = {}) {
    if (state.booted) return;
    state.booted = true;
    state.renderer = render || (async () => {});
    if (onChange) listeners.add(onChange);

    window.addEventListener("hashchange", onHashChange, { passive: true });

    // Kick off the initial render without a visible transition.
    const route = parseRoute(readHash());
    state.current = route;
    notify(route, { initial: true });

    // Use microtask so the DOM has had a chance to settle.
    Promise.resolve().then(() => {
      // Initial render: no artificial delay, no progress bar.
      // The app boots under whatever splash the host page wants.
      return state.renderer(route).catch((err) => {
        log.error("initial render failed:", err);
      });
    });
  },

  /** Programmatic navigation. */
  go(path, { replace = false } = {}) {
    const next = normalizePath(path);
    if (replace) {
      const url = location.pathname + location.search + "#" + next;
      history.replaceState(null, "", url);
      onHashChange();
    } else {
      location.hash = next;
    }
  },

  /** Force a re-run of the current route. */
  refresh() {
    onHashChange();
  },

  current() {
    return state.current;
  },

  /** Build an href string for a given path/params. */
  href(path) {
    return "#" + normalizePath(path);
  },

  /** Subscribe to route changes (outside of the render cycle). */
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Names of the currently active route. */
  isActive(name) {
    return state.current?.name === name;
  },
};

/* ============================================================
   4. HASH HANDLING
   ============================================================ */
function readHash() {
  const raw = location.hash.replace(/^#/, "");
  return raw || DEFAULT_PATH;
}

function normalizePath(path) {
  if (!path) return DEFAULT_PATH;
  let p = String(path).trim();
  if (!p.startsWith("/")) p = "/" + p;
  return p;
}

let lastSeenHash = "";
function onHashChange() {
  const rawHash = location.hash;
  // Chromium sometimes fires hashchange with the same value.
  if (rawHash === lastSeenHash) return;
  lastSeenHash = rawHash;

  const route = parseRoute(readHash());
  transition(route).catch((err) => {
    log.error("transition failed:", err);
    // Always release the UX, even if the render crashed.
    progress.finish();
    spinner.hide();
  });
}

/* ============================================================
   5. PARSE
   ============================================================ */
function parseRoute(raw) {
  // Split path & query: "/search?q=arrow" → ["/search", "q=arrow"]
  const [pathPart, queryPart = ""] = String(raw).split("?");
  const path = pathPart.startsWith("/") ? pathPart : "/" + pathPart;

  const params = {};
  let matched = null;

  for (const def of ROUTES) {
    const m = def.pattern.exec(path);
    if (!m) continue;

    def.params.forEach((key, i) => {
      params[key] = decodeURIComponent(m[i + 1] || "");
    });
    matched = def;
    break;
  }

  // Fallback: home
  if (!matched) matched = ROUTES[0];

  const query = Object.fromEntries(new URLSearchParams(queryPart));

  return {
    name: matched.name,
    level: matched.level,
    params,
    query,
    path,
    raw,
  };
}

/* ============================================================
   6. TRANSITION
   ============================================================ */
async function transition(next) {
  const prev = state.current;
  const token = ++state.token;

  // Are we superseded by another transition? Bail.
  const stale = () => token !== state.token;

  // Determine level: explicit override wins.
  const level = pickLevel(prev, next);

  // Update store + listeners BEFORE render so the nav highlight
  // and title reflect the destination during the load.
  state.current = next;
  notify(next, { from: prev, level });
  document.documentElement.dataset.route = next.name;

  if (stale()) return;

  // ---------- FULL PAGE ----------
  if (level === "full") {
    // Close any open stage so it doesn't sit underneath the bar.
    // (Stage module listens for this via router.onChange.)

    progress.start();
    progress.set(0.12);
    await nextFrame();
    if (stale()) return;

    const work = (async () => {
      progress.set(0.35);
      await Promise.all([
        state.renderer(next),
        sleep(TIMING.full),
      ]);
      if (stale()) return;
      progress.set(0.9);
    })();

    try {
      await work;
    } finally {
      if (token === state.token) {
        await progress.finish();
      }
    }
    return;
  }

  // ---------- FRAGMENT ----------
  spinner.show(labelFor(next));

  try {
    await Promise.all([
      state.renderer(next),
      sleep(TIMING.fragment),
    ]);
  } finally {
    if (token === state.token) {
      await spinner.hide();
    }
  }
}

/* ============================================================
   7. LEVEL DECISION
   ============================================================ */
function pickLevel(prev, next) {
  if (!prev) return next.level;

  // Same route name → only the query changed → fragment.
  if (prev.name === next.name) {
    // …unless the params changed, which means a real content swap
    const paramsDiffer =
      JSON.stringify(prev.params) !== JSON.stringify(next.params);
    if (paramsDiffer) return next.level;
    return "fragment";
  }

  // Explicit level on the destination.
  return next.level;
}

/* ============================================================
   8. MISC
   ============================================================ */
function notify(route, meta = {}) {
  for (const fn of listeners) {
    try {
      fn(route, meta);
    } catch (err) {
      log.error("route listener threw:", err);
    }
  }
}

function labelFor(route) {
  switch (route.name) {
    case "search":  return "Searching…";
    default:        return "Loading…";
  }
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));