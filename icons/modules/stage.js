/* ============================================================
   modules/stage.js
   ============================================================ */

import { ACTIONS, SWATCHES, GLYPHS } from "./config.js";
import {
  $,
  $$,
  el,
  mount,
  prettyIconName,
  slug,
  copyText,
  download,
  svgToJSX,
  svgToDataURI,
  flipTransform,
  isVisible,
  safeFocus,
  prefersReducedMotion,
  lockScroll,
  unlockScroll,
  log,
} from "./utils.js";
import { registry } from "./sprite.js";
import { data } from "./data.js";
import { store } from "./store.js";
import { router } from "./router.js";
import { toast } from "./toast.js";

const state = {
  open: false,
  busy: false,
  variety: null,
  name: null,
  color: "currentColor",
  stroke: 0,
  sourceTile: null,
  openAnim: null,
  closeAnim: null,
};

let stageEl, stageIcon, stageTitle, stageSub;
let closeBtn, prevBtn, nextBtn;
let actionsEl, swatchesEl;
let strokeRange, strokeValue;
let bookmarkBtn, bookmarkLabel;
let scrimEl;

export function init() {
  stageEl = $("#stage");
  stageIcon = $("#stageIcon");
  stageTitle = $("#stageTitle");
  stageSub = $("#stageSub");
  closeBtn = $("#closeBtn");
  prevBtn = $("#prevBtn");
  nextBtn = $("#nextBtn");
  actionsEl = $("#actions");
  swatchesEl = $("#swatches");
  strokeRange = $("#strokeRange");
  strokeValue = $("#strokeValue");
  bookmarkBtn = $("#bookmarkBtn");
  bookmarkLabel = $("#bookmarkLabel");
  scrimEl = stageEl?.querySelector(".stage__scrim");

  if (!stageEl) {
    log.warn("stage element not found");
    return;
  }

  buildSwatches();
  buildActions();
  wireControls();
  wireKeyboard();
  document.addEventListener("click", onTileClick, false);
  router.onChange(() => {
    if (state.open) close();
  });
}

function onTileClick(e) {
  const tile = e.target.closest?.(".tile");
  if (!tile) return;
  if (e.target.closest?.("[data-nostage]")) return;
  const { variety, name } = tile.dataset;
  if (!variety || !name) return;
  e.preventDefault();
  open({ variety, name, from: tile });
}

export async function open({ variety, name, from = null }) {
  if (state.open || state.busy) return;
  const entry = registry.get(variety, name);
  if (!entry) {
    log.warn(`icon not in registry: ${variety}/${name}`);
    return;
  }

  state.busy = true;
  state.variety = variety;
  state.name = name;
  state.color = "currentColor";
  state.stroke = 0;
  state.sourceTile = from;

  if (store.variety.current() !== variety) store.variety.set(variety);
  store.recent.push(variety, name);

  lockScroll();
  renderContent();

  stageEl.hidden = false;
  stageEl.classList.remove("is-open");
  await raf();
  await raf();

  const fromRect = from?.querySelector?.("svg")?.getBoundingClientRect?.();
  const toRect = stageIcon.getBoundingClientRect();

  stageEl.classList.add("is-open");

  if (
    !prefersReducedMotion() &&
    fromRect &&
    fromRect.width > 0 &&
    toRect.width > 0
  ) {
    state.openAnim = stageIcon.animate(
      [
        {
          transform: flipTransform(fromRect, toRect),
          opacity: 0.35,
          filter: "brightness(1.6)",
        },
        {
          transform: "translate(0,0) scale(1,1)",
          opacity: 1,
          filter: "brightness(1)",
        },
      ],
      { duration: 600, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" },
    );
    state.openAnim.onfinish = () => {
      state.openAnim?.cancel?.();
      state.openAnim = null;
    };
  }

  if (from) from.setAttribute("aria-current", "true");

  state.open = true;
  state.busy = false;

  requestAnimationFrame(() => safeFocus(closeBtn));
}

export function close() {
  if (!state.open || state.busy) return;
  state.busy = true;

  const tile = state.sourceTile;
  const toRect = stageIcon.getBoundingClientRect();

  let fromRect = null;
  if (tile && document.contains(tile)) {
    const r = tile.querySelector("svg")?.getBoundingClientRect?.();
    if (r && isVisible(r)) fromRect = r;
  }

  const finish = () => {
    stageEl.hidden = true;
    stageEl.classList.remove("is-open");
    stageIcon.innerHTML = "";
    if (tile) tile.removeAttribute("aria-current");
    state.open = false;
    state.busy = false;
    state.openAnim = null;
    state.closeAnim = null;
    unlockScroll();
    safeFocus(tile);
  };

  stageEl.classList.remove("is-open");

  if (!prefersReducedMotion() && fromRect) {
    state.closeAnim = stageIcon.animate(
      [
        { transform: "translate(0,0) scale(1,1)", opacity: 1 },
        { transform: flipTransform(fromRect, toRect), opacity: 0.4 },
      ],
      { duration: 440, easing: "cubic-bezier(.5, 0, .75, 0)", fill: "both" },
    );
    state.closeAnim.onfinish = () => {
      state.closeAnim?.cancel?.();
      state.closeAnim = null;
      finish();
    };
  } else {
    setTimeout(finish, prefersReducedMotion() ? 0 : 240);
  }
}

export function isOpen() {
  return state.open;
}

function renderContent() {
  const { variety, name } = state;
  stageTitle.textContent = prettyIconName(name);
  stageSub.textContent = `${prettyVariety(variety)} · ${slug(name)}`;
  stageIcon.innerHTML = registry.svgString(variety, name, { size: 320 });
  applyPaint();
  refreshBookmarkBtn();
  syncSwatchPressed();
  syncStrokeInput();
}

function buildSwatches() {
  if (!swatchesEl) return;
  mount(
    swatchesEl,
    SWATCHES.map((s) =>
      el("button", {
        cls: "swatch" + (s.cls ? " " + s.cls : ""),
        type: "button",
        attrs: {
          "aria-label": s.label,
          "aria-pressed": "false",
          title: s.label,
        },
        dataset: { value: s.value },
        style: { color: s.value === "currentColor" ? "var(--text)" : s.value },
        on: {
          click: () => {
            state.color = s.value;
            applyPaint();
            syncSwatchPressed();
          },
        },
      }),
    ),
  );
}

function syncSwatchPressed() {
  $$(".swatch", swatchesEl).forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.value === state.color)),
  );
}

function syncStrokeInput() {
  if (!strokeRange) return;
  strokeRange.value = String(state.stroke);
  strokeValue.textContent = formatStroke(state.stroke);
}

function wireControls() {
  strokeRange?.addEventListener("input", () => {
    state.stroke = parseFloat(strokeRange.value);
    strokeValue.textContent = formatStroke(state.stroke);
    applyPaint();
  });

  bookmarkBtn?.addEventListener("click", () => {
    const { variety, name } = state;
    if (!variety || !name) return;
    const nowMarked = store.bookmark.toggle(variety, name);
    refreshBookmarkBtn();
    if (state.sourceTile)
      state.sourceTile.classList.toggle("is-bookmarked", nowMarked);
    toast(nowMarked ? "Bookmarked" : "Bookmark removed");
  });

  prevBtn?.addEventListener("click", () => step(-1));
  nextBtn?.addEventListener("click", () => step(1));
  closeBtn?.addEventListener("click", close);
  scrimEl?.addEventListener("click", close);
}

function refreshBookmarkBtn() {
  const { variety, name } = state;
  const marked = store.bookmark.has(variety, name);
  bookmarkBtn?.setAttribute("aria-pressed", String(marked));
  if (bookmarkLabel)
    bookmarkLabel.textContent = marked ? "Bookmarked" : "Bookmark";
}

function formatStroke(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "auto";
  return n.toFixed(2).replace(/0$/, "");
}

function applyPaint() {
  const svg = stageIcon?.querySelector("svg");
  if (!svg) return;
  if (state.color && state.color !== "currentColor")
    svg.style.color = state.color;
  else svg.style.color = "";
  if (state.stroke > 0) {
    svg.style.strokeWidth = String(state.stroke);
    svg.style.stroke = "currentColor";
  } else {
    svg.style.strokeWidth = "";
    svg.style.stroke = "";
  }
}

function buildActions() {
  if (!actionsEl) return;
  mount(
    actionsEl,
    ACTIONS.map((a) =>
      el("button", {
        cls: "action" + (a.primary ? " action--primary" : ""),
        type: "button",
        dataset: { action: a.id },
        on: { click: (e) => runAction(a.id, e.currentTarget) },
        html: `${glyphSvg(GLYPHS[a.glyph])}<span>${a.label}</span>`,
      }),
    ),
  );
}

function glyphSvg(d) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">${d}</svg>`;
}

async function runAction(id, btn) {
  const { variety, name } = state;
  if (!variety || !name) return;

  const svgStr = registry.exportString(variety, name, {
    color: state.color === "currentColor" ? "currentColor" : state.color,
    stroke: state.stroke > 0 ? state.stroke : null,
  });

  if (!svgStr) {
    toast("Couldn't build SVG", { variant: "error" });
    return;
  }
  const base = `fa-${slug(variety)}-${slug(name)}`;

  switch (id) {
    case "copy-svg": {
      const ok = await copyText(svgStr);
      toast(ok ? "SVG copied" : "Copy failed", {
        variant: ok ? "success" : "error",
      });
      if (ok) flash(btn);
      break;
    }
    case "copy-jsx": {
      const ok = await copyText(svgToJSX(svgStr));
      toast(ok ? "JSX copied" : "Copy failed", {
        variant: ok ? "success" : "error",
      });
      if (ok) flash(btn);
      break;
    }
    case "copy-uri": {
      const ok = await copyText(svgToDataURI(svgStr));
      toast(ok ? "Data URI copied" : "Copy failed", {
        variant: ok ? "success" : "error",
      });
      if (ok) flash(btn);
      break;
    }
    case "dl-txt":
      download(`${base}.txt`, svgStr, "text/plain");
      toast(`Downloading ${base}.txt`);
      flash(btn);
      break;
    case "dl-svg":
      download(`${base}.svg`, svgStr, "image/svg+xml");
      toast(`Downloading ${base}.svg`);
      flash(btn);
      break;
    case "source":
      window.open(
        `https://fontawesome.com/icons/${encodeURIComponent(name)}`,
        "_blank",
        "noopener,noreferrer",
      );
      toast("Opening fontawesome.com");
      break;
  }
}

function flash(btn) {
  if (!btn) return;
  btn.classList.add("is-done");
  setTimeout(() => btn.classList.remove("is-done"), 900);
}

function step(delta) {
  const { variety, name } = state;
  if (!variety || !name) return;
  const pool = data.varietyNames(variety);
  if (!pool.length) return;
  const idx = pool.indexOf(name);
  const next = pool[(idx + delta + pool.length) % pool.length];
  if (!next || next === name) return;

  state.name = next;
  store.recent.push(variety, next);

  const tile = document.querySelector(
    `.tile[data-variety="${cssEscape(variety)}"][data-name="${cssEscape(next)}"]`,
  );
  if (tile) state.sourceTile = tile;

  stageTitle.textContent = prettyIconName(next);
  stageSub.textContent = `${prettyVariety(variety)} · ${slug(next)}`;
  stageIcon.innerHTML = registry.svgString(variety, next, { size: 320 });
  applyPaint();
  refreshBookmarkBtn();

  if (!prefersReducedMotion()) {
    stageIcon.animate(
      [
        { opacity: 0, transform: `scale(.86) translateX(${delta * 26}px)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: 320, easing: "cubic-bezier(.22, 1, .36, 1)" },
    );
  }
}

function wireKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (!state.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
      return;
    }
    if (e.key === "Tab") trapFocus(e);
  });
}

function trapFocus(e) {
  const focusables = $$(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    stageEl,
  ).filter((n) => !n.hasAttribute("disabled") && n.offsetParent !== null);

  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function prettyVariety(key) {
  return key
    .split("-")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

function cssEscape(str) {
  return String(str).replace(/(["\\])/g, "\\$1");
}

const raf = () => new Promise((r) => requestAnimationFrame(r));

export const stage = { init, open, close, isOpen };
