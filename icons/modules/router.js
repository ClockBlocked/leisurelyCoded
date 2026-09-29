/* ============================================================
   ICON FORGE — js/router.js
   Hash-based router. The single orchestrator of full vs.
   fragment transitions — nothing else should drive the
   progress bar or spinner during navigation.

   Route shapes:
     #/                        → home          (full)
     #/categories              → categories    (full)
     #/categories/:key         → category      (full)
     #/varieties               → varieties     (full)
     #/varieties/:key          → variety       (full)
     #/bookmarks               → bookmarks     (full)
     #/collections             → collections   (full)
     #/collections/:id         → collection    (full)
     #/search?q=…              → search        (fragment)

   Level decision:
     • Same route name + only query differs  → fragment
     • Route declared as "fragment"          → fragment
     • Otherwise                             → full
   ============================================================ */

import { TIMING } from "./config.js";
import { progress } from "./progress.js";
import { spinner }  from "./spinner.js";
import { log } from "./utils.js";

/* ============================================================
   1. ROUTE TABLE
   ============================================================ */
const ROUTES = [
  { name: "home",        pattern: /^\/?$/,                         level: "full",     params: [] },
  { name: "categories",  pattern: /^\/categories\/?$/,             level: "full",     params: [] },
  { name: "category",    pattern: /^\/categories\/([^/]+)\/?$/,    level: "full",     params: ["key"] },
  { name: "varieties",   pattern: /^\/varieties\/?$/,              level: "full",     params: [] },
  { name: "variety",     pattern: /^\/varieties\/([^/]+)\/?$/,     level: "full",     params: ["key"] },
  { name: "bookmarks",   pattern: /^\/bookmarks\/?$/,              level: "full",     params: [] },
  { name: "collections", pattern: /^\/collections\/?$/,            level: "full",     params: [] },
  { name: "collection",  pattern: /^\/collections\/([^/]+)\/?$/,   level: "full",     params: ["id"] },
  { name: "search",      pattern: /^\/search\/?$/,                 level: "fragment", params: [] },
];

const DEFAULT_PATH = "/";

/* ============================================================
   2. STATE
   ============================================================ */
const state = {
  current: null,
  renderer: null,
  token: 0,
  booted: false,
};

const listeners = new Set();

/* ============================================================
   3. PUBLIC API
   ============================================================ */
export const router = {
  init({ render, onChange } = {}) {
    if (state.booted) return;
    state.booted = true;
    state.renderer = render || (async () => {});
    if (onChange) listeners.add(onChange);

    window.addEventListener("hashchange", onHashChange, { passive: true });

    // Initial render (no progress bar — the app owns boot UX).
    const route = parseRoute(readHash());
    state.current = route;
    document.documentElement.dataset.route = route.name;
    notify(route, { initial: true });

    Promise.resolve().then(() =>
      state.renderer(route).catch((err) => {
        log.error("initial render failed:", err);
      })
    );
  },

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

  refresh() {
    onHashChange();
  },

  current() {
    return state.current;
  },

  href(path) {
    return "#" + normalizePath(path);
  },

  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

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
  if (rawHash === lastSeenHash) return;
  lastSeenHash = rawHash;

  const route = parseRoute(readHash());
  transition(route).catch((err) => {
    log.error("transition failed:", err);
    progress.finish();
    spinner.hide();
  });
}

/* ============================================================
   5. PARSE
   ============================================================ */
function parseRoute(raw) {
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
  const stale = () => token !== state.token;

  const level = pickLevel(prev, next);

  state.current = next;
  document.documentElement.dataset.route = next.name;
  notify(next, { from: prev, level });

  if (stale()) return;

  /* ---------- FULL PAGE ---------- */
  if (level === "full") {
    progress.start();
    progress.set(0.12);
    await nextFrame();
    if (stale()) return;

    try {
      await Promise.all([
        state.renderer(next),
        sleep(TIMING.full),
      ]);
      if (stale()) return;
      progress.set(0.9);
    } finally {
      if (token === state.token) {
        await progress.finish();
      }
    }
    return;
  }

  /* ---------- FRAGMENT ---------- */
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

  if (prev.name === next.name) {
    const paramsDiffer =
      JSON.stringify(prev.params) !== JSON.stringify(next.params);
    if (paramsDiffer) return next.level;
    return "fragment";
  }

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
    case "search":      return "Searching…";
    case "collection":  return "Loading collection…";
    case "category":    return "Loading category…";
    case "variety":     return "Switching variety…";
    default:            return "Loading…";
  }
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));