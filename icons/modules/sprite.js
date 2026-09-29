/* ============================================================
   ICON FORGE — js/sprite.js
   Lazy-loading sprite registry.

   Why lazy:
     Pro+ sprite files are HUGE (60–70 MiB total, ~50k symbols).
     Injecting them all at boot crashes the tab.

   New model:
     • loadManifest()  → discovers varieties (URLs + labels)
     • loadVariety(k)  → fetches ONE sprite, injects its symbols
     • loadSprites()   → manifest + the requested initial variety
     • registry.ensure(k) → returns a promise for one variety

   Public API mirrors the old one, plus:
     registry.isLoaded(key)
     registry.ensure(key)
     registry.loadedVarieties()
   ============================================================ */

import {
  SPRITES,
  VARIETY_META,
  FALLBACK_SYMBOLS,
} from "./config.js";
import { log, slug } from "./utils.js";

const PARSER = new DOMParser();

/* ============================================================
   STATE
   ============================================================ */
const state = {
  manifestLoaded: false,
  mount: null,
  varieties: Object.create(null),  // key → { url, label, blurb, available, loaded, loading, error, icons, count, primary }
  symbols: Object.create(null),    // safeId → entry
  byName: Object.create(null),     // name → Set<variety>
  ensurePromises: Object.create(null), // key → Promise
  totals: { icons: 0, loadedVarieties: 0 },
};

/* ============================================================
   MANIFEST / DISCOVERY
   ============================================================ */
async function discover() {
  // 1. Try the manifest
  try {
    const res = await fetch(SPRITES.manifestUrl, { cache: "no-store" });
    if (res.ok) {
      const text = await res.text();
      if (/^\s*[{[]/.test(text)) {
        const manifest = JSON.parse(text);
        const list = normaliseManifest(manifest);
        if (list.length) {
          log.info(`manifest loaded — ${list.length} varieties declared`);
          return list;
        }
      }
    }
  } catch {
    /* optional */
  }

  // 2. Fall back to probing the default candidates
  log.info("no manifest — probing default candidates");
  const base = SPRITES.defaultBase;
  const results = await Promise.all(
    SPRITES.defaultCandidates.map(async (cand) => {
      try {
        const res = await fetch(base + cand.file, { method: "HEAD" });
        if (!res.ok) return null;
      } catch {
        /* fall through — some servers block HEAD */
      }
      return {
        key: cand.key,
        url: base + cand.file,
        label: cand.label,
        blurb: VARIETY_META[cand.key]?.blurb || "",
        primary: true,
      };
    })
  );
  return results.filter(Boolean);
}

function normaliseManifest(manifest) {
  if (!manifest || typeof manifest !== "object") return [];
  const base =
    typeof manifest.base === "string" ? manifest.base : SPRITES.defaultBase;
  const list = Array.isArray(manifest.varieties) ? manifest.varieties : [];
  return list
    .filter(
      (v) => v && typeof v.key === "string" && typeof v.file === "string"
    )
    .map((v) => ({
      key: v.key,
      url: joinUrl(base, v.file),
      label: v.label || VARIETY_META[v.key]?.label || v.key,
      blurb: v.blurb || VARIETY_META[v.key]?.blurb || "",
      primary: v.primary !== false,
    }));
}

function joinUrl(base, file) {
  if (/^https?:\/\//.test(file)) return file;
  const b = base.endsWith("/") ? base : base + "/";
  const f = file.startsWith("/") ? file.slice(1) : file;
  return b + f;
}

/* ============================================================
   PUBLIC
   ============================================================ */
export async function loadSprites({ initial = null, onProgress } = {}) {
  state.mount = document.getElementById("sprite-mount");
  if (!state.mount) {
    const m = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    m.id = "sprite-mount";
    m.setAttribute("aria-hidden", "true");
    m.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    document.body.prepend(m);
    state.mount = m;
  }

  // Discover once.
  const discovered = await discover();
  for (const v of discovered) {
    state.varieties[v.key] = {
      url: v.url,
      label: v.label,
      blurb: v.blurb,
      primary: v.primary !== false,
      available: true,  // optimistic until proven otherwise
      loaded: false,
      loading: false,
      error: null,
      icons: [],
      count: 0,
    };
  }
  state.manifestLoaded = true;
  onProgress?.(0, discovered.length, null, "discovered");

  // Load the initial variety if requested.
  if (initial && state.varieties[initial]) {
    await ensure(initial);
  }

  return registry;
}

export async function ensure(key) {
  if (!state.varieties[key]) return null;
  if (state.varieties[key].loaded) return state.varieties[key];
  if (state.ensurePromises[key]) return state.ensurePromises[key];

  state.ensurePromises[key] = (async () => {
    const v = state.varieties[key];
    v.loading = true;
    try {
      const res = await fetch(v.url, { cache: "force-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!/<svg[\s>]/i.test(text)) throw new Error("not an SVG sprite");
      ingestSprite(key, text, v.url);
      v.loaded = true;
      v.available = v.count > 0;
      v.error = v.count > 0 ? null : "no symbols";
      log.info(`loaded ${v.count} symbols for "${key}"`);
    } catch (err) {
      v.available = false;
      v.error = err.message;
      v.count = 0;
      log.warn(`sprite "${key}" failed: ${err.message}`);
    } finally {
      v.loading = false;
      delete state.ensurePromises[key];
      state.totals.loadedVarieties =
        Object.values(state.varieties).filter((x) => x.loaded).length;
      state.totals.icons = Object.keys(state.symbols).length;
    }
    return v;
  })();

  return state.ensurePromises[key];
}

/* ============================================================
   INGEST
   ============================================================ */
function ingestSprite(variety, svgText, url) {
  const doc = PARSER.parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    throw new Error(`XML parse error in ${url}`);
  }

  const symbols = doc.querySelectorAll("symbol");
  const icons = [];
  let count = 0;

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
  state.varieties[variety].icons = icons;
  state.varieties[variety].count = count;
  return count;
}

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
   FALLBACK (dev-only)
   ============================================================ */
export function injectFallbacks() {
  const varieties = SPRITES.defaultCandidates.map((c) => c.key);
  for (const variety of varieties) {
    if (!state.varieties[variety]) {
      state.varieties[variety] = {
        url: "",
        label: VARIETY_META[variety]?.label || variety,
        blurb: VARIETY_META[variety]?.blurb || "",
        primary: true,
        available: true,
        loaded: true,
        loading: false,
        error: null,
        icons: [],
        count: 0,
      };
    }

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
    state.varieties[variety].icons = icons;
    state.varieties[variety].count = icons.length;
    state.varieties[variety].available = true;
  }
  state.totals.loadedVarieties =
    Object.values(state.varieties).filter((x) => x.loaded).length;
  state.totals.icons = Object.keys(state.symbols).length;
}

/* ============================================================
   REGISTRY
   ============================================================ */
export const registry = {
  isReady() {
    return state.manifestLoaded;
  },

  ready() {
    return Promise.resolve(registry);
  },

  /* --- loading --- */
  ensure(key) {
    return ensure(key);
  },

  isLoaded(key) {
    return !!state.varieties[key]?.loaded;
  },

  isVarietyAvailable(variety) {
    return !!state.varieties[variety]?.available;
  },

  isLoading(key) {
    return !!state.varieties[key]?.loading;
  },

  /* --- meta --- */
  getVarieties() {
    return Object.entries(state.varieties).map(([key, v]) => ({
      key,
      available: v.available,
      loaded: v.loaded,
      loading: v.loading,
      count: v.count,
      error: v.error,
      icons: v.icons,
      label: v.label || VARIETY_META[key]?.label || key,
      blurb: v.blurb || VARIETY_META[key]?.blurb || "",
      primary: v.primary !== false,
    }));
  },

  loadedVarieties() {
    return Object.keys(state.varieties).filter(
      (k) => state.varieties[k].loaded
    );
  },

  /* --- reads --- */
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
    return Object.keys(state.symbols).length;
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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${entry.viewBox}"${dim}${clsAttr}${colorAttr}${strokeAttr}${roleAttr} ${attrs}><use href="#${entry.safeId}"/></svg>`;
}

function buildExportSvg(entry, opts = {}) {
  const { color = "currentColor", stroke = null, size = 24 } = opts;
  const inner = serializeSymbolInner(entry.node);
  const paintAttrs =
    stroke != null
      ? `fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"`
      : `fill="${color}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${entry.viewBox}" width="${size}" height="${size}" ${paintAttrs}>
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