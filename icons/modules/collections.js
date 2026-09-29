/* ============================================================
   modules/collections.js
   ============================================================ */

import { store } from "./store.js";
import { slug } from "./utils.js";

const MAX_NAME = 60;
const MAX_DESC = 240;
const MAX_ITEMS = 500;

export const collections = {
  all() {
    return store.get().collections.map(clone);
  },
  get(id) {
    const c = find(id);
    return c ? clone(c) : null;
  },
  count(id) {
    const c = find(id);
    return c ? c.items.length : 0;
  },

  has(id, variety, name) {
    const c = find(id);
    return c
      ? c.items.some((i) => i.variety === variety && i.name === name)
      : false;
  },

  containing(variety, name) {
    return store
      .get()
      .collections.filter((c) =>
        c.items.some((i) => i.variety === variety && i.name === name),
      )
      .map(clone);
  },

  create(name, description = "") {
    const cleanName = sanitizeName(name);
    if (!cleanName) return null;
    const collection = {
      id: genId(),
      name: cleanName,
      description: sanitizeDesc(description),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [],
    };
    const next = [collection, ...store.get().collections];
    store.set({ collections: next }, { persist: true });
    return clone(collection);
  },

  rename(id, name) {
    const cleanName = sanitizeName(name);
    if (!cleanName) return false;
    return mutate(id, (c) => ({
      ...c,
      name: cleanName,
      updatedAt: Date.now(),
    }));
  },

  describe(id, description) {
    const d = sanitizeDesc(description);
    return mutate(id, (c) => ({ ...c, description: d, updatedAt: Date.now() }));
  },

  update(id, patch = {}) {
    return mutate(id, (c) => {
      const next = { ...c, updatedAt: Date.now() };
      if (typeof patch.name === "string") next.name = sanitizeName(patch.name);
      if (typeof patch.description === "string")
        next.description = sanitizeDesc(patch.description);
      return next;
    });
  },

  remove(id) {
    const existing = store.get().collections;
    const next = existing.filter((c) => c.id !== id);
    if (next.length === existing.length) return false;
    store.set({ collections: next }, { persist: true });
    return true;
  },

  duplicate(id) {
    const src = find(id);
    if (!src) return null;
    const copy = {
      id: genId(),
      name: uniqueName(`${src.name} (copy)`),
      description: src.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: src.items.map((i) => ({ ...i })),
    };
    const next = [copy, ...store.get().collections];
    store.set({ collections: next }, { persist: true });
    return clone(copy);
  },

  add(id, variety, name) {
    const src = find(id);
    if (!src) return false;
    if (src.items.length >= MAX_ITEMS) return false;
    if (src.items.some((i) => i.variety === variety && i.name === name))
      return false;
    return mutate(id, (c) => ({
      ...c,
      items: [{ variety, name, addedAt: Date.now() }, ...c.items],
      updatedAt: Date.now(),
    }));
  },

  remove_item(id, variety, name) {
    const src = find(id);
    if (!src) return false;
    if (!src.items.some((i) => i.variety === variety && i.name === name))
      return false;
    return mutate(id, (c) => ({
      ...c,
      items: c.items.filter((i) => !(i.variety === variety && i.name === name)),
      updatedAt: Date.now(),
    }));
  },

  toggle(id, variety, name) {
    if (collections.has(id, variety, name)) {
      collections.remove_item(id, variety, name);
      return false;
    }
    collections.add(id, variety, name);
    return true;
  },

  clear(id) {
    return mutate(id, (c) => ({ ...c, items: [], updatedAt: Date.now() }));
  },

  exportJson(id) {
    const c = find(id);
    if (!c) return null;
    return JSON.stringify(
      {
        app: "Icon Forge",
        kind: "collection",
        version: 1,
        exportedAt: new Date().toISOString(),
        collection: {
          name: c.name,
          description: c.description,
          items: c.items.map((i) => ({ variety: i.variety, name: i.name })),
        },
      },
      null,
      2,
    );
  },

  exportAll() {
    return JSON.stringify(
      {
        app: "Icon Forge",
        kind: "collections",
        version: 1,
        exportedAt: new Date().toISOString(),
        collections: store.get().collections.map((c) => ({
          name: c.name,
          description: c.description,
          items: c.items.map((i) => ({ variety: i.variety, name: i.name })),
        })),
      },
      null,
      2,
    );
  },

  importJson(json) {
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      const payload = parsed?.collection || parsed;
      if (!payload || typeof payload !== "object") return null;
      const name = sanitizeName(payload.name || "Imported collection");
      if (!name) return null;
      const created = collections.create(
        uniqueName(name),
        sanitizeDesc(payload.description || ""),
      );
      if (!created) return null;
      const items = Array.isArray(payload.items) ? payload.items : [];
      for (const it of items) {
        if (
          it &&
          typeof it.variety === "string" &&
          typeof it.name === "string"
        ) {
          collections.add(created.id, it.variety, it.name);
        }
      }
      return collections.get(created.id);
    } catch {
      return null;
    }
  },

  importAll(json) {
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      const list = Array.isArray(parsed?.collections)
        ? parsed.collections
        : Array.isArray(parsed)
          ? parsed
          : null;
      if (!list) return 0;
      let added = 0;
      for (const entry of list) {
        const single = collections.importJson({ collection: entry });
        if (single) added++;
      }
      return added;
    } catch {
      return 0;
    }
  },
};

function find(id) {
  return store.get().collections.find((c) => c.id === id) || null;
}

function mutate(id, fn) {
  const existing = store.get().collections;
  let changed = false;
  const next = existing.map((c) => {
    if (c.id !== id) return c;
    changed = true;
    return fn(c);
  });
  if (!changed) return false;
  store.set({ collections: next }, { persist: true });
  return true;
}

function clone(c) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    items: c.items.map((i) => ({ ...i })),
  };
}

function sanitizeName(name) {
  const s = String(name || "")
    .replace(/\s+/g, " ")
    .trim();
  return s ? s.slice(0, MAX_NAME) : "";
}

function sanitizeDesc(desc) {
  return String(desc || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DESC);
}

function uniqueName(base) {
  const existing = new Set(
    store.get().collections.map((c) => c.name.toLowerCase()),
  );
  if (!existing.has(base.toLowerCase())) return base;
  let n = 2;
  while (existing.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}

function genId() {
  return (
    "c_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

export function collectionFileName(collection) {
  const base = slug(collection?.name || "collection") || "collection";
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  return `icon-forge-${base}-${stamp}.json`;
}
