/* ============================================================
   ICON FORGE — js/taxonomy.js
   Category classification. Kept separate from store.js so the
   classifier can be tested, reused, and tree-shaken.
   ============================================================ */

import { CATEGORIES } from "./config.js";
import { unique } from "./utils.js";

/* ------------------------------------------------------------
   classify(name) → string[]  (category keys)
   ------------------------------------------------------------ */
export function categorize(name) {
  const n = String(name).toLowerCase();
  const hits = [];

  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      const needle = String(kw).toLowerCase();
      if (!needle) continue;

      if (wholeWord(n, needle)) {
        hits.push(cat.key);
        break;
      }
      if (needle.length >= 3 && n.includes(needle)) {
        hits.push(cat.key);
        break;
      }
    }
  }
  return unique(hits);
}

export function categoryByKey(key) {
  return CATEGORIES.find((c) => c.key === key) || null;
}

function wholeWord(haystack, needle) {
  const i = haystack.indexOf(needle);
  if (i === -1) return false;
  const before = i === 0 ? "" : haystack[i - 1];
  const after =
    i + needle.length >= haystack.length ? "" : haystack[i + needle.length];
  const isWord = (c) => /[a-z0-9]/i.test(c);
  return (!before || !isWord(before)) && (!after || !isWord(after));
}