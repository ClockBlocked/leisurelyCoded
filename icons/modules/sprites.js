




/* ============================================================
   ICON FORGE — js/sprite.js
   Loads Font Awesome sprite files, parses their <symbol>s,
   injects them into a hidden <svg> mount, and exposes a clean
   registry API for the rest of the app.

   Design notes:
   - FA sprites use IDs like "fa-solid fa-house" (spaces!).
     Spaces in fragment IDs are awkward to reference via
     <use href="#...">. We normalize each symbol to a SAFE id:
        sym--{variety}--{name}      (e.g. sym--solid--house)
     and remember the original.
   - Missing sprite files → that variety is marked unavailable
     but the app keeps working (chips show 0, warnings logged).
   - If EVERY sprite fails, we inject the FALLBACK_SYMBOLS so
     the UI still renders meaningfully during development.
   ============================================================ */

import { SPRITES, VARIETIES, FALLBACK_SYMBOLS } from "./config.js";
import { log, slug, unique } from "./utils.js";

const PARSER = new DOMParser();

/* ------------------------------------------------------------
   INTERNAL STATE
   ------------------------------------------------------------ */
const state = {
  loaded: false,
  loading: null,                 // Promise<Registry>
  mount: null,                   // <svg id="sprite-mount">
  varieties: Object.create(null), // variety -> { available, error, icons: [], count }
  symbols: Object.create(null),   // safeId -> { safeId, originalId, variety, name, viewBox, node }
  byName: Object.create(null),    // name -> Set<variety>
  totals: { icons: 0, varieties: 0, bytes: 0 },
};

/* ------------------------------------------------------------
   PUBLIC: loadSprites
   ------------------------------------------------------------
   Idempotent. Call as many times as you like.
   @param  {function} onProgress  optional (loaded, total, variety)
   @return {Promise<Registry>}
   ------------------------------------------------------------ */
export function loadSprites(onProgress) {
  if (state.loading) return state.loading;

  state.mount = document.getElementById("sprite-mount");
  if (!state.mount) {
    log.warn("sprite mount not found; creating one");
    const m = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    m.id = "sprite-mount";
    m.setAttribute("aria-hidden", "true");
    m.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    document.body.prepend(m);
    state.mount = m;
  }

  const keys = Object.keys(SPRITES);
  let done = 0;

  state.loading = Promise.all(
    keys.map(async (variety) => {
      const url = SPRITES[variety];
      try {
        const text = await fetchText(url);
        const count = ingestSprite(variety, text, url);
        state.varieties[variety] = {
          available: count > 0,
          error: count > 0 ? null : "no symbols parsed",
          icons: state.varieties[variety]?.icons ?? [],
          count,
        };
        log.info(`loaded ${count} symbols for "${variety}"`);
      } catch (err) {
        log.warn(`sprite "${variety}" failed:`, err.message);
        state.varieties[variety] = {
          available: false,
          error: err.message,
          icons: [],
          count: 0,
        };
      } finally {
        done++;
        onProgress?.(done, keys.length, variety);
      }
    })
  ).then(() => {
    // If nothing loaded at all, inject fallbacks so the UI works.
    const anyLoaded = Object.values(state.varieties).some((v) => v.available);
    if (!anyLoaded) {
      log.warn("no sprites loaded — injecting fallback symbols");
      injectFallbacks();
    }
    state.loaded = true;
    state.totals.icons = Object.values(state.symbols).length;
    state.totals.varieties = Object.values(state.varieties).filter(
      (v) => v.available
    ).length;
    log.info(
      `sprite registry ready — ${state.totals.icons} icons across ${state.totals.varieties} varieties`
    );
    return registry;
  });

  return state.loading;
}

/* ------------------------------------------------------------
   FETCH + PARSE
   ------------------------------------------------------------ */
async function fetchText(url) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
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

    const name = extractIconName(originalId, variety);
    if (!name) continue;

    const safeId = makeSafeId(variety, name);
    if (state.symbols[safeId]) continue; // dedupe

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

  // Sort the variety's icons alphabetically for stable output.
  icons.sort((a, b) => a.localeCompare(b));
  state.varieties[variety] = state.varieties[variety] || {};
  state.varieties[variety].icons = icons;
  state.varieties[variety].available = count > 0;
  state.varieties[variety].error = count > 0 ? null : "no symbols";
  state.varieties[variety].count = count;

  return count;
}

/**
 * Extract the icon name from an FA symbol id.
 * Handles:
 *   "fa-solid fa-house"              → "house"
 *   "fa-regular fa-heart"            → "heart"
 *   "fa-sharp fa-solid fa-bolt"      → "bolt"
 *   "fa-house"                       → "house"
 *   "house"                          → "house"
 */
function extractIconName(originalId, variety) {
  const tokens = originalId.trim().split(/\s+/);
  // Walk from the end, picking the first "fa-XXX" token that
  // isn't just a style/variety modifier.
  const modifiers = new Set([
    "fa-solid", "fa-regular", "fa-light", "fa-thin",
    "fa-duotone", "fa-brands", "fa-sharp", "fa-sharp-solid",
    "fa-sharp-regular", "fa-sharp-light", "fa-fw",
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

/* ------------------------------------------------------------
   FALLBACK (dev mode — no sprites present)
   ------------------------------------------------------------ */
function injectFallbacks() {
  const varieties = VARIETIES.map((v) => v.key);
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
      // Fallback symbols are single-path outlines drawn for 24×24.
      // Use stroke rendering when the variety expects it.
      path.setAttribute("d", d);
      if (variety === "solid" || variety === "brands" || variety === "duotone") {
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
    };
  }
}

/* ------------------------------------------------------------
   PUBLIC API — registry
   ------------------------------------------------------------ */
export const registry = {
  /* ---- top-level ---- */
  isReady() {
    return state.loaded;
  },

  /** Wait for the registry to be ready (idempotent). */
  ready() {
    return state.loading || Promise.resolve(registry);
  },

  /* ---- varieties ---- */
  getVarieties() {
    return Object.entries(state.varieties).map(([key, v]) => ({
      key,
      available: v.available,
      count: v.count,
      error: v.error,
      icons: v.icons,
    }));
  },

  isVarietyAvailable(variety) {
    return !!state.varieties[variety]?.available;
  },

  /** Return the icons for a variety (as names). */
  listIcons(variety) {
    return state.varieties[variety]?.icons ?? [];
  },

  /** Every icon across every variety (as unique names). */
  listAllIconNames() {
    return Object.keys(state.byName).sort((a, b) => a.localeCompare(b));
  },

  /** Number of icons in a given variety. */
  count(variety) {
    return state.varieties[variety]?.count ?? 0;
  },

  /** Total icon count across every variety. */
  total() {
    return Object.values(state.symbols).length;
  },

  /* ---- lookups ---- */
  has(variety, name) {
    return !!state.symbols[makeSafeId(variety, name)];
  },

  get(variety, name) {
    return state.symbols[makeSafeId(variety, name)] || null;
  },

  /** Names that exist for a given variety AND every other. */
  varietiesFor(name) {
    return [...(state.byName[name] || [])];
  },

  /** Return a cloned <symbol> node ready to append somewhere. */
  cloneSymbol(variety, name) {
    const entry = registry.get(variety, name);
    if (!entry) return null;
    return entry.node.cloneNode(true);
  },

  /** Render helper: inline SVG markup string for an <use> reference. */
  svgString(variety, name, opts = {}) {
    const entry = registry.get(variety, name);
    if (!entry) return "";
    return buildInlineSvg(entry, opts);
  },

  /** Export helper: standalone SVG string with xmlns + width/height. */
  exportString(variety, name, opts = {}) {
    const entry = registry.get(variety, name);
    if (!entry) return "";
    return buildExportSvg(entry, opts);
  },

  /* ---- raw access (used sparingly) ---- */
  _symbols: state.symbols,
  _varieties: state.varieties,
};

/* ------------------------------------------------------------
   RENDER BUILDERS
   ------------------------------------------------------------ */
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
  const roleAttr = ariaLabel ? ` role="img" aria-label="${escapeAttr(ariaLabel)}"` : ' aria-hidden="true"';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${dim}${clsAttr}${colorAttr}${strokeAttr}${roleAttr} ${attrs}><use href="#${entry.safeId}"/></svg>`;
}

function buildExportSvg(entry, opts = {}) {
  const {
    color = "currentColor",
    stroke = null,
    size = 24,
  } = opts;

  // Expand the symbol's contents inline — this is what makes the
  // exported SVG standalone (no external sprite dependency).
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

/** Serialize a symbol's children (without the <symbol> wrapper). */
function serializeSymbolInner(symNode) {
  const inner = [...symNode.childNodes]
    .map((n) => {
      if (n.nodeType === 1) return n.outerHTML;
      if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim();
      return "";
    })
    .filter(Boolean)
    .join("\n");
  // Indent for a tidy export
  return inner
    .split("\n")
    .map((line) => "  " + line.trim())
    .filter((l) => l.trim())
    .join("\n");
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}