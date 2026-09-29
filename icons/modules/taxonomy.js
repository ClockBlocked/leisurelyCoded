/* ============================================================
   modules/taxonomy.js
   ============================================================ */

import { CATEGORIES } from "./config.js";
import { unique } from "./utils.js";

const CACHE = new Map();

export function categorize(name) {
  if (CACHE.has(name)) return CACHE.get(name);

  const n = String(name).toLowerCase();
  const hits = [];

  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      const needle = String(kw).toLowerCase();
      if (!needle) continue;

      if (wholeWord(n, needle)) { hits.push(cat.key); break; }
      if (needle.length >= 3 && n.includes(needle)) { hits.push(cat.key); break; }
    }
  }

  const result = unique(hits);
  CACHE.set(name, result);
  return result;
}

export function categoryByKey(key) {
  return CATEGORIES.find((c) => c.key === key) || null;
}

function wholeWord(haystack, needle) {
  const i = haystack.indexOf(needle);
  if (i === -1) return false;
  const before = i === 0 ? "" : haystack[i - 1];
  const after = i + needle.length >= haystack.length ? "" : haystack[i + needle.length];
  const isWord = (c) => /[a-z0-9]/i.test(c);
  return (!before || !isWord(before)) && (!after || !isWord(after));
}