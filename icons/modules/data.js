




/* ============================================================
   ICON FORGE — js/data.js
   Builds an in-memory index from the sprite registry, then
   answers every query the app needs: category listings, search,
   per-variety listings, bookmarks resolution, etc.

   Design notes:
   - One flat array of "records": { name, variety, categories[] }
     plus per-variety / per-category / per-name dictionaries.
   - Category classification is keyword-based (see config.js).
     It runs ONCE per name (not per variety) since a name's
     category is variety-independent.
   - Search is a weighted substring match over name + category
     labels. It's fast enough for a few thousand icons in
     plain JS; no need for a fancy index.
   ============================================================ */

import { CATEGORIES } from "./config.js";
import { registry } from "./sprite.js";
import { slug, log, unique } from "./utils.js";

/* ============================================================
   1. INTERNAL STATE
   ============================================================ */
const index = {
  built: false,
  /** name -> { name, prettyName, categories: [key, ...] } */
  byName: Object.create(null),
  /** variety -> [name, ...] */
  byVariety: Object.create(null),
  /** categoryKey -> { key, label, blurb, icon, names: [name, ...] } */
  byCategory: Object.create(null),
  /** flat list of all names (unique) */
  allNames: [],
  /** variety metadata in display order */
  varietyMeta: [],
  /** total unique names */
  totals: { names: 0, records: 0, categories: 0 },
};

/* ============================================================
   2. BUILD
   ============================================================ */
export function buildIndex() {
  if (index.built) return index;

  if (!registry.isReady()) {
    log.warn("buildIndex called before sprites were ready");
  }

  const varieties = registry.getVarieties();
  index.varietyMeta = varieties.map((v) => ({
    key: v.key,
    available: v.available,
    count: v.count,
    icons: v.icons,
  }));

  // 1. Populate per-variety lists
  for (const v of varieties) {
    index.byVariety[v.key] = v.icons.slice();
  }

  // 2. Build unique-name set
  const allNames = new Set();
  for (const v of varieties) {
    for (const n of v.icons) allNames.add(n);
  }
  index.allNames = [...allNames].sort(naturalCompare);

  // 3. Classify each name once
  for (const name of index.allNames) {
    const categories = categorize(name);
    index.byName[name] = {
      name,
      categories,
    };
  }

  // 4. Bucket names by category
  for (const cat of CATEGORIES) {
    index.byCategory[cat.key] = {
      key: cat.key,
      label: cat.label,
      blurb: cat.blurb,
      icon: cat.icon,
      names: [],
    };
  }
  for (const name of index.allNames) {
    for (const key of index.byName[name].categories) {
      const bucket = index.byCategory[key];
      if (bucket) bucket.names.push(name);
    }
  }
  // Sort each category and prune empty ones
  for (const key of Object.keys(index.byCategory)) {
    const bucket = index.byCategory[key];
    bucket.names.sort(naturalCompare);
    if (bucket.names.length === 0) delete index.byCategory[key];
  }

  index.totals.names = index.allNames.length;
  index.totals.categories = Object.keys(index.byCategory).length;
  index.totals.records = index.totals.names * Math.max(1, varieties.length);

  index.built = true;
  log.info(
    `data index ready — ${index.totals.names} names, ${index.totals.categories} categories`
  );
  return index;
}

/* ============================================================
   3. CATEGORY CLASSIFIER
   ------------------------------------------------------------
   Whole-word OR substring match, case-insensitive.
   See config.js → CATEGORIES for the keyword tables.
   ============================================================ */
function categorize(name) {
  const n = String(name).toLowerCase();
  const hits = [];
  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      const needle = String(kw).toLowerCase();
      if (!needle) continue;

      // Whole-word match (letters/digits on both sides).
      if (wholeWord(n, needle)) {
        hits.push(cat.key);
        break;
      }
      // Substring match (helpful for compound names like "arrow-up").
      if (needle.length >= 3 && n.includes(needle)) {
        hits.push(cat.key);
        break;
      }
    }
  }
  return unique(hits);
}

function wholeWord(haystack, needle) {
  const i = haystack.indexOf(needle);
  if (i === -1) return false;
  const before = i === 0 ? "" : haystack[i - 1];
  const after  = i + needle.length >= haystack.length
    ? ""
    : haystack[i + needle.length];
  const isWord = (c) => /[a-z0-9]/i.test(c);
  return (!before || !isWord(before)) && (!after || !isWord(after));
}

/* ============================================================
   4. PUBLIC API
   ============================================================ */
export const data = {
  /* ---- meta ---- */
  isReady() {
    return index.built;
  },

  totals() {
    return { ...index.totals };
  },

  /** Unique icon names (sorted). */
  allNames() {
    return index.allNames.slice();
  },

  /** Variety metadata in display order. */
  varieties() {
    return index.varietyMeta.map((v) => ({ ...v }));
  },

  /** Category metadata + count. */
  categories() {
    return Object.values(index.byCategory).map((c) => ({
      key: c.key,
      label: c.label,
      blurb: c.blurb,
      icon: c.icon,
      count: c.names.length,
    }));
  },

  /** Fetch a single category bucket (or null). */
  category(key) {
    const c = index.byCategory[key];
    if (!c) return null;
    return {
      key: c.key,
      label: c.label,
      blurb: c.blurb,
      icon: c.icon,
      count: c.names.length,
      names: c.names.slice(),
    };
  },

  /** Names for a given variety. */
  varietyNames(variety) {
    return (index.byVariety[variety] || []).slice();
  },

  /** Record for a single icon name. */
  record(name) {
    return index.byName[name] || null;
  },

  /** Names that belong to a category, but only those that exist in
      the given variety (used when browsing a category at a
      specific variety level). */
  categoryNamesForVariety(categoryKey, variety) {
    const c = index.byCategory[categoryKey];
    if (!c) return [];
    const avail = new Set(index.byVariety[variety] || []);
    return c.names.filter((n) => avail.has(n));
  },

  /** Names that belong to a category across all varieties. */
  categoryNames(categoryKey) {
    const c = index.byCategory[categoryKey];
    return c ? c.names.slice() : [];
  },

  /**
   * Search icons by free-text query.
   *
   * Scoring:
   *   +100  exact name match
   *   +60   name starts with query
   *   +30   name contains query
   *   +15   query matches a category label
   *   +5    query matches a category key
   * Ties broken alphabetically.
   */
  search(query, { variety = null, limit = 500 } = {}) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];

    const pool = variety
      ? index.byVariety[variety] || []
      : index.allNames;

    const catLabelMatches = new Set();
    for (const cat of CATEGORIES) {
      const label = cat.label.toLowerCase();
      const key = cat.key.toLowerCase();
      if (label.includes(q) || key.includes(q)) catLabelMatches.add(cat.key);
    }

    const results = [];
    for (const name of pool) {
      const n = name.toLowerCase();
      let score = 0;

      if (n === q) score = 100;
      else if (n.startsWith(q)) score = 60;
      else if (n.includes(q)) score = 30;
      else {
        const rec = index.byName[name];
        if (rec) {
          const hit = rec.categories.some((k) => catLabelMatches.has(k));
          if (hit) score = 15;
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

  /**
   * Resolve a list of { variety, name } entries (e.g. bookmarks)
   * into icons that actually exist in the loaded sprites.
   */
  resolve(pairs, { keepMissing = false } = {}) {
    const out = [];
    for (const p of pairs) {
      if (!p || typeof p.variety !== "string" || typeof p.name !== "string") {
        continue;
      }
      const exists = registry.has(p.variety, p.name);
      if (exists || keepMissing) {
        out.push({ variety: p.variety, name: p.name, exists });
      }
    }
    return out;
  },

  /** Return a preview list of N names for a variety (for banners). */
  preview(variety, n = 5, preferred = null) {
    const pool = index.byVariety[variety] || [];
    if (preferred && preferred.length) {
      const picked = preferred.filter((name) => pool.includes(name)).slice(0, n);
      if (picked.length >= n) return picked;
      const extra = pool
        .filter((name) => !picked.includes(name))
        .slice(0, n - picked.length);
      return [...picked, ...extra];
    }
    return pool.slice(0, n);
  },
};

/* ============================================================
   5. SORTING HELPERS
   ============================================================ */
function naturalCompare(a, b) {
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Cheap fuzzy: does `name` contain the query's characters in order,
 * with at most a small gap? Used as a low-confidence fallback.
 */
function fuzzyPrefix(name, query) {
  let qi = 0;
  let gap = 0;
  let lastMatch = -1;
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