



/* ============================================================
   ICON FORGE — js/utils.js
   Pure helpers: DOM, strings, async, storage, math, colors.
   No side effects. No app-state imports.
   ============================================================ */

/* ------------------------------------------------------------
   1. DOM SELECTORS
   ------------------------------------------------------------ */
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Create an element with attributes, dataset, styles & children. */
export function el(tag, opts = {}, ...children) {
  const node = document.createElement(tag);
  const { attrs = {}, dataset = {}, style = {}, html, text, on = {}, cls } = opts;

  if (cls) node.className = Array.isArray(cls) ? cls.filter(Boolean).join(" ") : cls;

  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const [k, v] of Object.entries(dataset)) {
    if (v != null) node.dataset[k] = String(v);
  }
  for (const [k, v] of Object.entries(style)) {
    if (v != null) node.style.setProperty(k, String(v));
  }
  for (const [evt, fn] of Object.entries(on)) {
    node.addEventListener(evt, fn);
  }

  if (html != null) node.innerHTML = html;
  else if (text != null) node.textContent = text;

  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Replace all children of a node with the given list. */
export function mount(parent, ...children) {
  parent.replaceChildren(...children.flat().filter(Boolean));
  return parent;
}

/** Escape a string for safe innerHTML interpolation. */
export function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------
   2. STRINGS
   ------------------------------------------------------------ */
export function slug(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function titleCase(str) {
  return String(str)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function camelCase(str) {
  return String(str)
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

export function pascalCase(str) {
  const cc = camelCase(str);
  return cc.charAt(0).toUpperCase() + cc.slice(1);
}

/** Replace typical Font Awesome prefixes to a clean display name. */
export function prettyIconName(name) {
  return titleCase(
    String(name)
      .replace(/^fa[- ]/, "")
      .replace(/^(solid|regular|sharp|duotone|thin|light|brands|fab|fas|far|fal|fat|fad)[- ]/, "")
  );
}

/** Truncate with an ellipsis. */
export function clamp(str, max = 40) {
  const s = String(str);
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/* ------------------------------------------------------------
   3. ARRAYS / OBJECTS
   ------------------------------------------------------------ */
export function unique(arr) {
  return [...new Set(arr)];
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, Object.create(null));
}

/** Pick N random items, stable order. */
export function sample(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

/* ------------------------------------------------------------
   4. ASYNC
   ------------------------------------------------------------ */
export const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

export const afterFrame = async (n = 1) => {
  for (let i = 0; i < n; i++) await nextFrame();
};

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function debounce(fn, ms = 180) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn, ms = 100) {
  let last = 0;
  let timer;
  return (...args) => {
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      clearTimeout(timer);
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
}

/** Race a promise against a fixed time. */
export function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    promise,
    new Promise((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

/* ------------------------------------------------------------
   5. STORAGE (namespaced, JSON, graceful on failure)
   ------------------------------------------------------------ */
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

/* ------------------------------------------------------------
   6. NUMBER / MATH
   ------------------------------------------------------------ */
export const clampNum = (n, min, max) => Math.min(Math.max(n, min), max);

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/* ------------------------------------------------------------
   7. COLORS
   ------------------------------------------------------------ */
export function isColor(str) {
  if (!str) return false;
  if (str === "currentColor") return true;
  return /^#([0-9a-f]{3,8})$/i.test(str) ||
         /^rgba?\(/i.test(str) ||
         /^hsla?\(/i.test(str);
}

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/* ------------------------------------------------------------
   8. CLIPBOARD + DOWNLOAD
   ------------------------------------------------------------ */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("no clipboard api");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function download(filename, contents, mime = "text/plain") {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ------------------------------------------------------------
   9. SVG
   ------------------------------------------------------------ */
/** Build an inline <svg> string referencing a sprite symbol. */
export function useSymbol(id, { size = 24, cls = "", attrs = "" } = {}) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="${cls}" aria-hidden="true" ${attrs}><use href="#${id}"/></svg>`;
}

/** Convert a serialized SVG string into a Data URI. */
export function svgToDataURI(svg) {
  const min = svg
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return (
    "data:image/svg+xml," +
    encodeURIComponent(min)
      .replace(/'/g, "%27")
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29")
  );
}

/** Convert an SVG string to JSX (attribute camelCasing). */
export function svgToJSX(svg) {
  return svg
    .replace(/stroke-width/g, "strokeWidth")
    .replace(/stroke-linecap/g, "strokeLinecap")
    .replace(/stroke-linejoin/g, "strokeLinejoin")
    .replace(/fill-rule/g, "fillRule")
    .replace(/clip-rule/g, "clipRule")
    .replace(/stroke-opacity/g, "strokeOpacity")
    .replace(/fill-opacity/g, "fillOpacity")
    .replace(/xmlns:xlink/g, "xmlnsXlink")
    .replace(/\sclass=/g, " className=")
    .replace(/\sstyle=(["'])(.*?)\1/g, (m, q, v) => {
      // convert "prop:value; prop:value" → { prop: "value" }
      const pairs = v
        .split(";")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const [k, val] = p.split(":").map((s) => s.trim());
          return `${camelCase(k)}: "${val}"`;
        });
      return ` style={{ ${pairs.join(", ")} }}`;
    });
}

/* ------------------------------------------------------------
   10. SCROLL LOCK
   ------------------------------------------------------------ */
let __savedPad = "";
export function lockScroll() {
  const gap = window.innerWidth - document.documentElement.clientWidth;
  __savedPad = document.body.style.paddingRight;
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  document.body.style.overflow = "hidden";
  document.body.classList.add("is-locked");
}

export function unlockScroll() {
  document.body.style.overflow = "";
  document.body.style.paddingRight = __savedPad || "";
  document.body.classList.remove("is-locked");
}

/* ------------------------------------------------------------
   11. FLIP HELPER
   ------------------------------------------------------------ */
export function flipTransform(fromRect, toRect) {
  const dx = fromRect.left - toRect.left;
  const dy = fromRect.top - toRect.top;
  const sx = fromRect.width / toRect.width;
  const sy = fromRect.height / toRect.height;
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

/* ------------------------------------------------------------
   12. MISC
   ------------------------------------------------------------ */
export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isVisible = (rect) =>
  rect.bottom > 0 &&
  rect.top < window.innerHeight &&
  rect.right > 0 &&
  rect.left < window.innerWidth &&
  rect.width > 0;

export function safeFocus(node, opts = { preventScroll: true }) {
  try {
    node?.focus?.(opts);
  } catch {
    /* noop */
  }
}

/** Log with a small prefix so dev-tools stays readable. */
export const log = {
  info:  (...a) => console.info ("%c[forge]", "color:#7c8cff;font-weight:600", ...a),
  warn:  (...a) => console.warn ("%c[forge]", "color:#fbbf24;font-weight:600", ...a),
  error: (...a) => console.error("%c[forge]", "color:#fb7185;font-weight:600", ...a),
};