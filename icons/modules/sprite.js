/* ============================================================
   ICON FORGE — js/sprite.js
   Loads Font Awesome sprite files (in whatever shape your
   Pro folder uses) and injects their <symbol>s into a hidden
   <svg> mount.

   Discovery strategy:
     1. Try SPRITES.manifestUrl (./sprite-manifest.json).
        If it exists and parses, that's the source of truth.
     2. Otherwise, probe SPRITES.defaultCandidates under
        SPRITES.defaultBase in parallel and keep whatever
        succeeds.

   All symbols get normalised into safe IDs:
       sym--{variety}--{name}
   so <use href="#..."> works even with FA's odd ids like
   "fa-solid fa-house".

   Public API (unchanged from v1):
     loadSprites(onProgress) → Promise<registry>
     registry.{ isReady, ready, getVarieties, isVarietyAvailable,
                listIcons, listAllIconNames, count, total,
                has, get, varietiesFor, cloneSymbol,
                svgString, exportString }
   ============================================================ */

import {
  SPRITES,
  VARIETY_META,
  FALLBACK_SYMBOLS,
} from "./config.js";
import { log, slug, unique } from "./utils.js";

const PARSER = new DOMParser();

/* ============================================================
   STATE
   ============================================================ */
const state = {
  loaded: false,
  loading: null,
  mount: null,
  varieties: Object.create(null), // key → { available, error, icons: [], count, label, blurb }
  symbols: Object.create(null),   // safeId → { safeId, originalId, variety, name, viewBox, node }
  byName: Object.create(null),    // name → Set<variety>
  totals: { icons: 0, varieties: 0 },
};

/* ============================================================
   DISCOVERY
   ============================================================ */
async function discoverSprites() {
  // ---- 1. Manifest ----
  try {
    const res = await fetch(SPRITES.manifestUrl, { cache: "no-store" });
    if (res.ok) {
      const text = await res.text();
      // Guard against the server returning index.html for 404s.
      if (/^\s*[{[]/.test(text)) {
        const manifest = JSON.parse(text);
        const list = normaliseManifest(manifest);
        if (list.length) {
          log.info(`sprite manifest loaded — ${list.length} varieties declared`);
          return list;
        }
      }
    }
  } catch {
    // Silent — manifest is optional.
  }

  // ---- 2. Probe candidates ----
  log.info("no manifest — probing default candidates");
  const base = SPRITES.defaultBase;
  const results = await Promise.all(
    SPRITES.defaultCandidates.map(async (cand) => {
      const url = base + cand.file;
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (!res.ok) return null;
      } catch {
        // HEAD may be blocked; fall through and let the real fetch decide.
      }
      return {
        key: cand.key,
        url,
        label: cand.label,
        blurb: VARIETY_META[cand.key]?.blurb || "",
      };
    })
  );

  // Keep the ones we *believe* exist. Actual GET will confirm.
  return results.filter(Boolean);
}

function normaliseManifest(manifest) {
  if (!manifest || typeof manifest !== "object") return [];
  const base = typeof manifest.base === "string" ? manifest.base : SPRITES.defaultBase;
  const list = Array.isArray(manifest.varieties) ? manifest.varieties : [];
  return list
    .filter((v) => v && typeof v.key === "string" && typeof v.file === "string")
    .map((v) => ({
      key: v.key,
      url: joinUrl(base, v.file),
      label: v.label || VARIETY_META[v.key]?.label || v.key,
      blurb: v.blurb || VARIETY_META[v.key]?.blurb || "",
    }));
}

function joinUrl(base, file) {
  if (/^https?:\/\//.test(file)) return file;
  const b = base.endsWith("/") ? base : base + "/";
  const f = file.startsWith("/") ? file.slice(1) : file;
  return b + f;
}

/* ============================================================
   PUBLIC: loadSprites
   ------------------------------------------------------------
   onProgress(done, total, varietyKey, phase)
   ============================================================ */
export function loadSprites(onProgress) {
  if (state.loading) return state.loading;

  state.mount = document.getElementById("sprite-mount");
  if (!state.mount) {
    const m = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    m.id = "sprite-mount";
    m.setAttribute("aria-hidden", "true");
    m.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    document.body.prepend(m);
    state.mount = m;
  }

  state.loading = (async () => {
    const discovered = await discoverSprites();
    onProgress?.(0, discovered.length, null, "discovered");

    let done = 0;

    await Promise.all(
      discovered.map(async (v) => {
        try {
          const text = await fetchText(v.url);
          const count = ingestSprite(v.key, text, v.url);
          state.varieties[v.key] = {
            available: count > 0,
            error: count > 0 ? null : "no symbols parsed",
            icons: state.varieties[v.key]?.icons ?? [],
            count,
            label: v.label,
            blurb: v.blurb,
          };
          log.info(`loaded ${count} symbols for "${v.key}"`);
        } catch (err) {
          log.warn(`sprite "${v.key}" skipped:`, err.message);
          state.varieties[v.key] = {
            available: false,
            error: err.message,
            icons: [],
            count: 0,
            label: v.label,
            blurb: v.blurb,
          };
        } finally {
          done++;
          onProgress?.(done, discovered.length, v.key, "loaded");
        }
      })
    );

    // If nothing loaded, inject fallbacks so the UI works.
    const anyLoaded = Object.values(state.varieties).some((x) => x.available);
    if (!anyLoaded) {
      log.warn("no sprites loaded — injecting fallback symbols");
      injectFallbacks();
    }

    state.loaded = true;
    state.totals.icons = Object.keys(state.symbols).length;
    state.totals.varieties = Object.values(state.varieties).filter(
      (x) => x.available
    ).length;

    log.info(
      `sprite registry ready — ${state.totals.icons} icons across ${state.totals.varieties} varieties`
    );

    return registry;
  })();

  return state.loading;
}

/* ============================================================
   FETCH + PARSE
   ============================================================ */
async function fetchText(url) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  // A server that returns index.html for missing files would
  // give us a valid 200. Guard against that.
  if (!/<svg[\s>]/i.test(text)) {
    throw new Error("not an SVG sprite");
  }
  return text;
}

function ingestSprite(variety, svgText, url) {
  const doc = PARSER.parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    throw new Error(`XML parse error in ${url}`);
  }

  const symbols = doc.querySelectorAll("symbol");
  let count = 0;
  const icons = [];

  for (const sym of symbols) {
    const originalId = sym.getAttribute("id") || "";
    if (!originalId) continue;

    const name = extractIconName(originalId);
    if (!name) continue;

    const safeId = makeSafeId(variety, name);
    if (state.symbols[safeId]) continue;

    const viewBox = sym.getAttribute("viewBox") || "0 0 512 512";
    const node = cloneToMount(sym, safeId);

    state.symbols[safeId] = {
      safeId,
      originalId,
      variety,
      name,
      viewBox,
      node,
    };
    (state.byName[name] ||= new Set()).add(variety);
    icons.push(name);
    count++;
  }

  icons.sort((a, b) => a.localeCompare(b));
  state.varieties[variety] = state.varieties[variety] || {};
  state.varieties[variety].icons = icons;
  state.varieties[variety].available = count > 0;
  state.varieties[variety].error = count > 0 ? null : "no symbols";
  state.varieties[variety].count = count;

  return count;
}

/**
 * Extract a clean icon name from FA's odd symbol IDs.
 *   "fa-solid fa-house"           → "house"
 *   "fa-light fa-heart"           → "heart"
 *   "fa-sharp fa-solid fa-bolt"   → "bolt"
 *   "fa-sharp-solid fa-cat"       → "cat"
 */
function extractIconName(originalId) {
  const tokens = originalId.trim().split(/\s+/);
  const modifiers = new Set([
    "fa-solid", "fa-regular", "fa-light", "fa-thin",
    "fa-duotone", "fa-brands", "fa-sharp", "fa-sharp-solid",
    "fa-sharp-regular", "fa-sharp-light", "fa-sharp-thin",
    "fa-fw",
  ]);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (modifiers.has(t)) continue;
    if (t.startsWith("fa-")) return t.slice(3);
    if (t && !t.startsWith("fa")) return t.replace(/^fa-/, "");
  }
  return "";
}

function makeSafeId(variety, name) {
  return `sym--${slug(variety)}--${slug(name)}`;
}

function cloneToMount(sym, safeId) {
  const clone = sym.cloneNode(true);
  clone.setAttribute("id", safeId);
  state.mount.appendChild(clone);
  return clone;
}

/* ============================================================
   FALLBACK (dev mode)
   ============================================================ */
function injectFallbacks() {
  const varieties = SPRITES.defaultCandidates.map((c) => c.key);
  for (const variety of varieties) {
    const icons = [];
    for (const [name, d] of Object.entries(FALLBACK_SYMBOLS)) {
      const safeId = makeSafeId(variety, name);
      const symbol = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "symbol"
      );
      symbol.setAttribute("id", safeId);
      symbol.setAttribute("viewBox", "0 0 24 24");
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", d);
      const isFilled =
        variety === "solid" ||
        variety === "brands" ||
        variety === "duotone" ||
        variety.startsWith("sharp-solid");
      if (isFilled) {
        path.setAttribute("fill", "currentColor");
      } else {
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "1.75");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
      }
      symbol.appendChild(path);
      state.mount.appendChild(symbol);

      state.symbols[safeId] = {
        safeId,
        originalId: `fa-${variety} fa-${name}`,
        variety,
        name,
        viewBox: "0 0 24 24",
        node: symbol,
      };
      (state.byName[name] ||= new Set()).add(variety);
      icons.push(name);
    }
    icons.sort((a, b) => a.localeCompare(b));
    state.varieties[variety] = {
      available: true,
      error: null,
      icons,
      count: icons.length,
      label: VARIETY_META[variety]?.label || variety,
      blurb: VARIETY_META[variety]?.blurb || "",
    };
  }
}

/* ============================================================
   REGISTRY (public API — unchanged)
   ============================================================ */
export const registry = {
  isReady() { return state.loaded; },
  ready() { return state.loading || Promise.resolve(registry); },

  getVarieties() {
    return Object.entries(state.varieties).map(([key, v]) => ({
      key,
      available: v.available,
      count: v.count,
      error: v.error,
      icons: v.icons,
      label: v.label || VARIETY_META[key]?.label || key,
      blurb: v.blurb || VARIETY_META[key]?.blurb || "",
    }));
  },

  isVarietyAvailable(variety) {
    return !!state.varieties[variety]?.available;
  },

  listIcons(variety) {
    return state.varieties[variety]?.icons ?? [];
  },

  listAllIconNames() {
    return Object.keys(state.byName).sort((a, b) => a.localeCompare(b));
  },

  count(variety) {
    return state.varieties[variety]?.count ?? 0;
  },

  total() {
    return Object.values(state.symbols).length;
  },

  has(variety, name) {
    return !!state.symbols[makeSafeId(variety, name)];
  },

  get(variety, name) {
    return state.symbols[makeSafeId(variety, name)] || null;
  },

  varietiesFor(name) {
    return [...(state.byName[name] || [])];
  },

  cloneSymbol(variety, name) {
    const entry = registry.get(variety, name);
    if (!entry) return null;
    return entry.node.cloneNode(true);
  },

  svgString(variety, name, opts = {}) {
    const entry = registry.get(variety, name);
    if (!entry) return "";
    return buildInlineSvg(entry, opts);
  },

  exportString(variety, name, opts = {}) {
    const entry = registry.get(variety, name);
    if (!entry) return "";
    return buildExportSvg(entry, opts);
  },

  _symbols: state.symbols,
  _varieties: state.varieties,
};

/* ============================================================
   RENDER BUILDERS
   ============================================================ */
function buildInlineSvg(entry, opts = {}) {
  const {
    size = null,
    cls = "",
    color = null,
    stroke = null,
    ariaLabel = "",
    attrs = "",
  } = opts;

  const vb = entry.viewBox;
  const dim = size ? ` width="${size}" height="${size}"` : "";
  const clsAttr = cls ? ` class="${cls}"` : "";
  const colorAttr = color ? ` color="${color}"` : "";
  const strokeAttr =
    stroke != null
      ? ` stroke-width="${stroke}" stroke="currentColor" fill="none"`
      : "";
  const roleAttr = ariaLabel
    ? ` role="img" aria-label="${escapeAttr(ariaLabel)}"`
    : ' aria-hidden="true"';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${dim}${clsAttr}${colorAttr}${strokeAttr}${roleAttr} ${attrs}><use href="#${entry.safeId}"/></svg>`;
}

function buildExportSvg(entry, opts = {}) {
  const { color = "currentColor", stroke = null, size = 24 } = opts;

  const inner = serializeSymbolInner(entry.node);
  const vb = entry.viewBox;

  const paintAttrs =
    stroke != null
      ? `fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"`
      : `fill="${color}"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size}" height="${size}" ${paintAttrs}>
${inner}
</svg>`;
}

function serializeSymbolInner(symNode) {
  const inner = [...symNode.childNodes]
    .map((n) => {
      if (n.nodeType === 1) return n.outerHTML;
      if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim();
      return "";
    })
    .filter(Boolean)
    .join("\n");
  return inner
    .split("\n")
    .map((line) => "  " + line.trim())
    .filter((l) => l.trim())
    .join("\n");
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}