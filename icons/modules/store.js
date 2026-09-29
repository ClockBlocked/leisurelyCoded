/* ============================================================
   ICON FORGE — js/store.js
   Reactive store. Holds route, filters, bookmarks, collections,
   recent, theme. Persists durable state to localStorage.

   Contract:
     store.get()                    → snapshot
     store.set(patch, opts)         → merge + notify
     store.subscribe(fn)            → unsubscribe()
     store.tryBusy() / releaseBusy()
     store.bookmark.{has,add,remove,toggle,all,clear}
     store.collection.{...}         → see collections.js
     store.recent.{push,all,clear}
     store.theme.{set,toggle,current}
     store.variety.{set,current}
   ============================================================ */

import { STORAGE, UI } from "./config.js";
import { storage, log } from "./utils.js";

/* ============================================================
   1. STATE SHAPE
   ============================================================ */
const initialState = {
  /* routing */
  route: {
    name: "home",
    params: {},
    query: {},
    path: "/",
  },

  /* browsing context */
  variety: UI.defaultVariety,
  query: "",
  filter: null,
  category: null,

  /* user data (persisted) */
  bookmarks: [],     // [{ variety, name }]
  collections: [],   // [{ id, name, description, createdAt, updatedAt, items: [{ variety, name, addedAt }] }]
  recent: [],        // [{ variety, name, at }]
  paletteRecent: [], // ["cmd:go-home", "icon:solid:house", ...]

  /* appearance */
  theme: UI.defaultTheme,

  /* transient */
  busy: false,
  ready: false,
};

const state = { ...initialState };

const subscribers = new Set();
let busyLock = false;

/* ============================================================
   2. CORE API
   ============================================================ */
export const store = {
  get() {
    return state;
  },

  pick(...keys) {
    const out = {};
    for (const k of keys) out[k] = state[k];
    return out;
  },

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

  subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },

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

  reset() {
    Object.assign(state, initialState);
    notify({});
  },
};

/* ============================================================
   3. BOOKMARKS
   ============================================================ */
store.bookmark = {
  has(variety, name) {
    return state.bookmarks.some(
      (b) => b.variety === variety && b.name === name
    );
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
    if (store.bookmark.has(variety, name)) {
      store.bookmark.remove(variety, name);
      return false;
    }
    store.bookmark.add(variety, name);
    return true;
  },

  all() {
    return state.bookmarks.map((b) => ({ ...b }));
  },

  clear() {
    store.set({ bookmarks: [] }, { persist: true });
  },
};

/* ============================================================
   4. RECENT
   ============================================================ */
store.recent = {
  push(variety, name) {
    const entry = { variety, name, at: Date.now() };
    const filtered = state.recent.filter(
      (r) => !(r.variety === variety && r.name === name)
    );
    const next = [entry, ...filtered].slice(0, UI.maxRecent);
    store.set({ recent: next }, { persist: true });
  },

  all() {
    return state.recent.map((r) => ({ ...r }));
  },

  clear() {
    store.set({ recent: [] }, { persist: true });
  },
};

/* ============================================================
   5. THEME + VARIETY
   ============================================================ */
store.theme = {
  set(theme) {
    store.set({ theme: theme === "light" ? "light" : "dark" }, { persist: true });
  },
  toggle() {
    store.theme.set(state.theme === "dark" ? "light" : "dark");
  },
  current() {
    return state.theme;
  },
};

store.variety = {
  set(variety) {
    if (typeof variety !== "string" || !variety) return;
    store.set({ variety }, { persist: true });
  },
  current() {
    return state.variety;
  },
};

/* ============================================================
   6. PALETTE RECENT
   ============================================================ */
store.paletteRecent = {
  push(id) {
    if (!id) return;
    const filtered = state.paletteRecent.filter((x) => x !== id);
    const next = [id, ...filtered].slice(0, 20);
    store.set({ paletteRecent: next }, { persist: true });
  },
  all() {
    return [...state.paletteRecent];
  },
  clear() {
    store.set({ paletteRecent: [] }, { persist: true });
  },
};

/* ============================================================
   7. NOTIFY
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
   8. EQUALITY (shallow, enough for our state shapes)
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
   9. PERSISTENCE
   ============================================================ */
function persistSlice(keys) {
  for (const k of keys) {
    switch (k) {
      case "bookmarks":
        storage.set(STORAGE.bookmarks, state.bookmarks);
        break;
      case "collections":
        storage.set(STORAGE.collections, state.collections);
        break;
      case "recent":
        storage.set(STORAGE.recent, state.recent);
        break;
      case "paletteRecent":
        storage.set(STORAGE.paletteRecent, state.paletteRecent);
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
      (x) =>
        x &&
        typeof x.variety === "string" &&
        typeof x.name === "string"
    );
  }

  const c = storage.get(STORAGE.collections, []);
  if (Array.isArray(c)) {
    state.collections = c
      .filter((x) => x && typeof x.id === "string" && typeof x.name === "string")
      .map((x) => ({
        id: x.id,
        name: x.name,
        description: typeof x.description === "string" ? x.description : "",
        createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
        updatedAt: typeof x.updatedAt === "number" ? x.updatedAt : Date.now(),
        items: Array.isArray(x.items)
          ? x.items.filter(
              (i) =>
                i &&
                typeof i.variety === "string" &&
                typeof i.name === "string"
            )
          : [],
      }));
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

  const pr = storage.get(STORAGE.paletteRecent, []);
  if (Array.isArray(pr)) {
    state.paletteRecent = pr.filter((x) => typeof x === "string").slice(0, 20);
  }

  const t = storage.get(STORAGE.theme, null);
  if (t === "dark" || t === "light") state.theme = t;

  const v = storage.get(STORAGE.variety, null);
  if (typeof v === "string" && v) state.variety = v;
}

hydrate();

/* ============================================================
   10. CATEGORY HELPERS (still exported — used by data.js)
   ============================================================ */
export { categorize, categoryByKey } from "./taxonomy.js";