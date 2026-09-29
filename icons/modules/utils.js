/* ============================================================
   modules/utils.js
   ============================================================ */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, opts = {}, ...children) {
  const node = document.createElement(tag);

  const safeOpts = opts || {};
  const attrs   = safeOpts.attrs   || {};
  const dataset = safeOpts.dataset || {};
  const style   = safeOpts.style   || {};
  const on      = safeOpts.on      || {};
  const { html, text, cls } = safeOpts;

  if (cls) {
    node.className = Array.isArray(cls) ? cls.filter(Boolean).join(" ") : cls;
  }

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
    if (typeof fn === "function") node.addEventListener(evt, fn);
  }

  if (html != null) node.innerHTML = html;
  else if (text != null) node.textContent = text;

  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function mount(parent, ...children) {
  parent.replaceChildren(...children.flat().filter(Boolean));
  return parent;
}

export function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

export function prettyIconName(name) {
  return titleCase(
    String(name)
      .replace(/^fa[- ]/, "")
      .replace(/^(solid|regular|sharp|duotone|thin|light|brands|fab|fas|far|fal|fat|fad)[- ]/, "")
  );
}

export function unique(arr) {
  return [...new Set(arr)];
}

export const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function debounce(fn, ms = 180) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

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
    try { localStorage.removeItem(key); } catch {}
  },
};

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
    try { ok = document.execCommand("copy"); } catch { ok = false; }
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

export function svgToDataURI(svg) {
  const min = svg.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  return (
    "data:image/svg+xml," +
    encodeURIComponent(min).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29")
  );
}

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
    .replace(/\sclass=/g, " className=");
}

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

export function flipTransform(fromRect, toRect) {
  const dx = fromRect.left - toRect.left;
  const dy = fromRect.top - toRect.top;
  const sx = fromRect.width / toRect.width;
  const sy = fromRect.height / toRect.height;
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isVisible = (rect) =>
  rect.bottom > 0 && rect.top < window.innerHeight &&
  rect.right > 0 && rect.left < window.innerWidth && rect.width > 0;

export function safeFocus(node, opts = { preventScroll: true }) {
  try { node?.focus?.(opts); } catch {}
}

export const log = {
  info:  (...a) => console.info ("%c[forge]", "color:#7c8cff;font-weight:600", ...a),
  warn:  (...a) => console.warn ("%c[forge]", "color:#fbbf24;font-weight:600", ...a),
  error: (...a) => console.error("%c[forge]", "color:#fb7185;font-weight:600", ...a),
};