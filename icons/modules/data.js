/* ============================================================
   modules/data.js
   ============================================================ */

import { CATEGORIES } from "./config.js";
import { registry } from "./sprite.js";
import { log } from "./utils.js";
import { categorize as rawCategorize } from "./taxonomy.js";

const index = {
  built: false,
  byName: Object.create(null),
  byCategory: Object.create(null),
};

export function buildIndex() {
  if (index.built) return index;
  for (const cat of CATEGORIES) {
    index.byCategory[cat.key] = {
      key: cat.key,
      label: cat.label,
      blurb: cat.blurb,
      icon: cat.icon,
      names: [],
    };
  }
  index.built = true;
  log.info("data index initialised (lazy classification)");
  return index;
}

export function invalidate() {
  // no-op placeholder for cache invalidation hook
}

function classify(name) {
  if (index.byName[name]) return index.byName[name].categories;
  const categories = rawCategorize(name);
  index.byName[name] = { name, categories };
  for (const key of categories) {
    const bucket = index.byCategory[key];
    if (!bucket) continue;
    if (!bucket.names.includes(name)) bucket.names.push(name);
  }
  return categories;
}

export const data = {
  isReady() {
    return index.built;
  },

  totals() {
    const varieties = registry.getVarieties();
    const loaded = varieties.filter((v) => v.loaded);
    return {
      names: registry.listAllIconNames().length,
      records: registry.total(),
      categories: Object.keys(index.byCategory).length,
      loadedVarieties: loaded.length,
      totalVarieties: varieties.length,
    };
  },

  allNames() {
    return registry.listAllIconNames();
  },

  varieties() {
    return registry.getVarieties();
  },

  categories() {
    const out = [];
    for (const cat of Object.values(index.byCategory)) {
      const names = namesLoadedInCategory(cat.key);
      if (!names.length) continue;
      out.push({
        key: cat.key,
        label: cat.label,
        blurb: cat.blurb,
        icon: cat.icon,
        count: names.length,
      });
    }
    return out;
  },

  category(key) {
    const cat = index.byCategory[key];
    if (!cat) return null;
    const names = namesLoadedInCategory(key);
    return {
      key: cat.key,
      label: cat.label,
      blurb: cat.blurb,
      icon: cat.icon,
      count: names.length,
      names,
    };
  },

  varietyNames(variety) {
    return registry.listIcons(variety);
  },

  record(name) {
    if (!registry.hasAnywhere(name)) return null;
    return { name, categories: index.byName[name]?.categories || [] };
  },

  categoryNamesForVariety(categoryKey, variety) {
    const cat = index.byCategory[categoryKey];
    if (!cat) return [];
    const avail = new Set(registry.listIcons(variety));
    // Make sure everything's classified.
    for (const n of avail) if (!index.byName[n]) classify(n);
    return cat.names.filter((n) => avail.has(n));
  },

  categoryNames(categoryKey) {
    return namesLoadedInCategory(categoryKey);
  },

  search(query, { variety = null, limit = 500 } = {}) {
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return [];

    const pool = variety
      ? registry.listIcons(variety)
      : registry.listAllIconNames();
    const results = [];

    for (const name of pool) {
      const n = name.toLowerCase();
      let score = 0;
      if (n === q) score = 100;
      else if (n.startsWith(q)) score = 60;
      else if (n.includes(q)) score = 30;
      else {
        const cats = index.byName[name]?.categories || classify(name);
        for (const k of cats) {
          const bucket = index.byCategory[k];
          if (bucket && bucket.label.toLowerCase().includes(q)) {
            score = 15;
            break;
          }
        }
        if (!score && q.length >= 3 && fuzzyPrefix(n, q)) score = 5;
      }
      if (score > 0) results.push({ name, score });
    }

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return naturalCompare(a.name, b.name);
    });

    return results.slice(0, limit).map((r) => r.name);
  },

  resolve(pairs, { keepMissing = false } = {}) {
    const out = [];
    for (const p of pairs) {
      if (!p || typeof p.variety !== "string" || typeof p.name !== "string")
        continue;
      const exists = registry.has(p.variety, p.name);
      if (exists || keepMissing)
        out.push({ variety: p.variety, name: p.name, exists });
    }
    return out;
  },

  preview(variety, n = 5, preferred = null) {
    const pool = registry.listIcons(variety);
    if (preferred && preferred.length) {
      const picked = preferred
        .filter((name) => pool.includes(name))
        .slice(0, n);
      if (picked.length >= n) return picked;
      const extra = pool
        .filter((name) => !picked.includes(name))
        .slice(0, n - picked.length);
      return [...picked, ...extra];
    }
    return pool.slice(0, n);
  },
};

function namesLoadedInCategory(key) {
  const cat = index.byCategory[key];
  if (!cat) return [];
  const allNames = registry.listAllIconNames();
  for (const name of allNames) {
    if (!index.byName[name]) classify(name);
  }
  const loaded = new Set(allNames);
  return cat.names.filter((n) => loaded.has(n));
}

function naturalCompare(a, b) {
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function fuzzyPrefix(name, query) {
  let qi = 0,
    gap = 0,
    lastMatch = -1;
  for (let i = 0; i < name.length && qi < query.length; i++) {
    if (name[i] === query[qi]) {
      if (lastMatch !== -1 && i - lastMatch > 2) gap++;
      lastMatch = i;
      qi++;
      if (gap > 2) return false;
    }
  }
  return qi === query.length;
}
