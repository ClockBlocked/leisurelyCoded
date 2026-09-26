




/* ============================================================
   ICON FORGE — js/store.js
   A tiny reactive store. No framework, no deps.
   Holds route, filters, bookmarks, recent, theme.
   Persists the pieces that should survive a reload.
   ============================================================ */

import {
  STORAGE,
  UI,
  CATEGORIES,
} from "./config.js";
import { storage, slug, log, unique } from "./utils.js";

/* ============================================================
   1. STATE SHAPE
   ============================================================ */
const initialState = {
  /* ---- routing ------------------------------------------------ */
  route: {
    name: "home",         // "home" | "categories" | "varieties" |
                          // "bookmarks" | "category" | "variety" | "search"
    params: {},           // e.g. { key: "coding" }
    path: "/",            // raw hash path for the top-nav highlight
  },

  /* ---- browsing context --------------------------------------- */
  variety: UI.defaultVariety,   // active variety key (persisted)
  query: "",                    // search string (in-memory only)
  filter: null,                 // extra chip filter, e.g. "recent"
  category: null,               // current category key (if any)

  /* ---- user data (persisted) ---------------------------------- */
  bookmarks: [],                // array of { variety, name }
  recent: [],                   // array of { variety, name, at }
  theme: UI.defaultTheme,       // "dark" | "light"

  /* ---- transient ---------------------------------------------- */
  busy: false,                  // true during a route transition
  ready: false,                 // set to true after first paint
};

/* ============================================================
   2. INTERNAL
   ============================================================ */
const state = { ...initialState };

/** list of subscriber functions */
const subscribers = new Set();

/** guards against concurrent transitions */
let busyLock = false;

/* ============================================================
   3. PUBLIC API
   ============================================================ */
export const store = {
  /* ---- read ---- */
  get() {
    return state;
  },

  pick(...keys) {
    const out = {};
    for (const k of keys) out[k] = state[k];
    return out;
  },

  /* ---- write ---- */
  set(patch, opts = {}) {
    const { silent = false, persist = false } = opts;
    let changed = false;

    for (const [k, v] of Object.entries(patch)) {
      if (!shallowEqual(state[k], v)) {
        state[k] = v;
        changed = true;
      }
    }

    if (persist) persistSlice(Object.keys(patch));
    if (changed && !silent) notify(patch);
    return changed;
  },

  /* ---- subscribe ---- */
  subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },

  /* ---- busy lock ---- */
  isBusy() {
    return busyLock;
  },

  tryBusy() {
    if (busyLock) return false;
    busyLock = true;
    state.busy = true;
    notify({ busy: true });
    return true;
  },

  releaseBusy() {
    busyLock = false;
    state.busy = false;
    notify({ busy: false });
  },

  /* ---- bookmarks ---- */
  bookmark: {
    has(variety, name) {
      return state.bookmarks.some((b) => b.variety === variety && b.name === name);
    },
    add(variety, name) {
      if (store.bookmark.has(variety, name)) return false;
      const next = [{ variety, name }, ...state.bookmarks];
      store.set({ bookmarks: next }, { persist: true });
      return true;
    },
    remove(variety, name) {
      const next = state.bookmarks.filter(
        (b) => !(b.variety === variety && b.name === name)
      );
      if (next.length === state.bookmarks.length) return false;
      store.set({ bookmarks: next }, { persist: true });
      return true;
    },
    toggle(variety, name) {
      return store.bookmark.has(variety, name)
        ? (store.bookmark.remove(variety, name), false)
        : (store.bookmark.add(variety, name), true);
    },
    all() {
      return [...state.bookmarks];
    },
    clear() {
      store.set({ bookmarks: [] }, { persist: true });
    },
  },

  /* ---- recent ---- */
  recent: {
    push(variety, name) {
      const entry = { variety, name, at: Date.now() };
      const filtered = state.recent.filter(
        (r) => !(r.variety === variety && r.name === name)
      );
      const next = [entry, ...filtered].slice(0, UI.maxRecent);
      store.set({ recent: next }, { persist: true });
    },
    all() {
      return [...state.recent];
    },
    clear() {
      store.set({ recent: [] }, { persist: true });
    },
  },

  /* ---- theme ---- */
  theme: {
    set(theme) {
      store.set({ theme }, { persist: true });
    },
    toggle() {
      store.theme.set(state.theme === "dark" ? "light" : "dark");
    },
    current() {
      return state.theme;
    },
  },

  /* ---- variety ---- */
  variety: {
    set(variety) {
      store.set({ variety }, { persist: true });
    },
    current() {
      return state.variety;
    },
  },

  /* ---- reset (used by dev tools / tests) ---- */
  reset() {
    Object.assign(state, initialState);
    notify({});
  },
};

/* ============================================================
   4. NOTIFY
   ============================================================ */
function notify(patch) {
  const snapshot = state;
  for (const fn of subscribers) {
    try {
      fn(snapshot, patch);
    } catch (err) {
      log.error("subscriber threw:", err);
    }
  }
}

/* ============================================================
   5. EQUALITY
   ============================================================ */
function shallowEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    const aK = Object.keys(a);
    const bK = Object.keys(b);
    if (aK.length !== bK.length) return false;
    return aK.every((k) => a[k] === b[k]);
  }
  return false;
}

/* ============================================================
   6. PERSISTENCE
   ============================================================ */
function persistSlice(keys) {
  for (const k of keys) {
    switch (k) {
      case "bookmarks":
        storage.set(STORAGE.bookmarks, state.bookmarks);
        break;
      case "recent":
        storage.set(STORAGE.recent, state.recent);
        break;
      case "theme":
        storage.set(STORAGE.theme, state.theme);
        break;
      case "variety":
        storage.set(STORAGE.variety, state.variety);
        break;
    }
  }
}

function hydrate() {
  const b = storage.get(STORAGE.bookmarks, []);
  if (Array.isArray(b)) {
    state.bookmarks = b.filter(
      (x) => x && typeof x.variety === "string" && typeof x.name === "string"
    );
  }

  const r = storage.get(STORAGE.recent, []);
  if (Array.isArray(r)) {
    state.recent = r
      .filter(
        (x) =>
          x &&
          typeof x.variety === "string" &&
          typeof x.name === "string" &&
          typeof x.at === "number"
      )
      .slice(0, UI.maxRecent);
  }

  const t = storage.get(STORAGE.theme, null);
  if (t === "dark" || t === "light") state.theme = t;

  const v = storage.get(STORAGE.variety, null);
  if (typeof v === "string" && v) state.variety = v;
}

/* ============================================================
   7. CATEGORY CLASSIFIER
   ------------------------------------------------------------
   Reads the CATEGORIES table and buckets an icon name by
   keyword matching. Returns an array of category keys (a name
   can belong to more than one category when keywords overlap).

   Matching is:
     - case-insensitive
     - whole-word OR substring (both accepted)
     - deduplicated
   ============================================================ */
export function categorize(name) {
  const n = String(name).toLowerCase();
  const hits = [];
  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      const needle = kw.toLowerCase();
      if (!needle) continue;
      // whole-word match
      const ww = new RegExp(`(^|[^a-z0-9])${escapeRe(needle)}([^a-z0-9]|$)`);
      if (ww.test(n) || n.includes(needle)) {
        hits.push(cat.key);
        break;
      }
    }
  }
  return unique(hits);
}

/** Convenience: human-readable meta for a category key. */
export function categoryByKey(key) {
  return CATEGORIES.find((c) => c.key === key) || null;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ============================================================
   8. BOOT — hydrate on import
   ============================================================ */
hydrate();