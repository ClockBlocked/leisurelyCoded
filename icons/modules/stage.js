




/* ============================================================
   ICON FORGE — js/stage.js
   The icon detail modal ("stage").

   Responsibilities:
     • Open with a FLIP animation from a tile → big icon
     • Close with the reverse FLIP back onto the source tile
     • Swatch picker, stroke/weight slider, bookmark toggle
     • Six actions: Copy SVG / JSX / URI, Download .txt / .svg,
       and jump to the source page
     • Prev / Next navigation with arrow keys
     • Focus trap + Escape + scrim-click dismiss
     • Scroll lock while open

   Exports:
     init()                       wire DOM once
     open({ variety, name, from }) open programmatically
     close()                      close programmatically
     isOpen()
   ============================================================ */

import {
  ACTIONS,
  SWATCHES,
  GLYPHS,
  UI,
} from "./config.js";
import {
  $, $$, el, mount,
  prettyIconName, slug,
  copyText, download, svgToJSX, svgToDataURI,
  flipTransform, isVisible, safeFocus,
  prefersReducedMotion, lockScroll, unlockScroll,
  log,
} from "./utils.js";
import { registry } from "./sprite.js";
import { data }     from "./data.js";
import { store }    from "./store.js";
import { router }   from "./router.js";
import { toast }    from "./toast.js";

/* ============================================================
   STATE
   ============================================================ */
const state = {
  open: false,
  busy: false,
  variety: null,
  name: null,
  color: "currentColor",
  stroke: 0,             // 0 = use sprite's native weight
  sourceTile: null,
  openAnim: null,
  closeAnim: null,
};

/* ============================================================
   DOM REFS (wired in init)
   ============================================================ */
let stageEl, stageIcon, stageTitle, stageSub;
let closeBtn, prevBtn, nextBtn;
let actionsEl, swatchesEl;
let strokeRange, strokeValue;
let bookmarkBtn, bookmarkLabel;
let scrimEl;

/* ============================================================
   INIT
   ============================================================ */
export function init() {
  stageEl     = $("#stage");
  stageIcon   = $("#stageIcon");
  stageTitle  = $("#stageTitle");
  stageSub    = $("#stageSub");
  closeBtn    = $("#closeBtn");
  prevBtn     = $("#prevBtn");
  nextBtn     = $("#nextBtn");
  actionsEl   = $("#actions");
  swatchesEl  = $("#swatches");
  strokeRange = $("#strokeRange");
  strokeValue = $("#strokeValue");
  bookmarkBtn = $("#bookmarkBtn");
  bookmarkLabel = $("#bookmarkLabel");
  scrimEl     = stageEl?.querySelector(".stage__scrim");

  if (!stageEl) {
    log.warn("stage element not found");
    return;
  }

  buildSwatches();
  buildActions();
  wireControls();
  wireKeyboard();

  // Global click delegation for tiles (grids render dynamically).
  document.addEventListener("click", onTileClick, false);

  // Close on any route change so the modal doesn't leak across pages.
  router.onChange(() => {
    if (state.open) close();
  });
}

/* ============================================================
   TILE DELEGATION
   ------------------------------------------------------------
   Any element with [data-variety][data-name] that lives inside
   a .tile opens the stage. This lets every view render its own
   tiles without wiring anything.
   ============================================================ */
function onTileClick(e) {
  const tile = e.target.closest?.(".tile");
  if (!tile) return;
  // Ignore clicks that landed on a bookmark action inside the tile
  if (e.target.closest?.("[data-nostage]")) return;

  e.preventDefault();
  const { variety, name } = tile.dataset;
  if (!variety || !name) return;
  open({ variety, name, from: tile });
}

/* ============================================================
   OPEN
   ============================================================ */
export async function open({ variety, name, from = null }) {
  if (state.open || state.busy) return;
  const entry = registry.get(variety, name);
  if (!entry) {
    log.warn(`icon not in registry: ${variety}/${name}`);
    return;
  }

  state.busy = true;

  // Persist context
  state.variety = variety;
  state.name    = name;
  state.color   = "currentColor";
  state.stroke  = 0;
  state.sourceTile = from;

  // Adopt the variety as the active browsing one
  if (store.variety.current() !== variety) store.variety.set(variety);
  store.recent.push(variety, name);

  // Lock scroll before measuring so layout is stable.
  lockScroll();

  // Render content while hidden
  renderContent();

  // Show shell (invisible → animate in)
  stageEl.hidden = false;
  stageEl.classList.remove("is-open");
  await raf(); await raf();

  // Flip
  const fromRect = from?.querySelector?.("svg")?.getBoundingClientRect?.();
  const toRect   = stageIcon.getBoundingClientRect();

  stageEl.classList.add("is-open");

  if (!prefersReducedMotion() && fromRect && fromRect.width > 0 && toRect.width > 0) {
    state.openAnim = stageIcon.animate(
      [
        {
          transform: flipTransform(fromRect, toRect),
          opacity: 0.35,
          filter: "brightness(1.6)",
        },
        { transform: "translate(0,0) scale(1,1)", opacity: 1, filter: "brightness(1)" },
      ],
      { duration: 620, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" }
    );
    state.openAnim.onfinish = () => {
      state.openAnim?.cancel?.();
      state.openAnim = null;
    };
  }

  // Mark source tile
  if (from) from.setAttribute("aria-current", "true");

  state.open = true;
  state.busy = false;

  requestAnimationFrame(() => safeFocus(closeBtn));
}

/* ============================================================
   CLOSE
   ============================================================ */
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
      { duration: 460, easing: "cubic-bezier(.5, 0, .75, 0)", fill: "both" }
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

/* ============================================================
   CONTENT RENDER
   ============================================================ */
function renderContent() {
  const { variety, name } = state;

  // Head
  stageTitle.textContent = prettyIconName(name);
  stageSub.textContent   = `${prettyVariety(variety)} · ${slug(name)}`;

  // Icon
  stageIcon.innerHTML = registry.svgString(variety, name, { size: 320 });
  applyPaint();

  // Bookmark toggle
  refreshBookmarkBtn();

  // Reset swatch + stroke UI
  syncSwatchPressed();
  syncStrokeInput();
}

/* ============================================================
   SWATCHES
   ============================================================ */
function buildSwatches() {
  if (!swatchesEl) return;
  mount(swatchesEl,
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
        style: {
          color: s.value === "currentColor" ? "var(--text)" : s.value,
        },
        on: {
          click: () => {
            state.color = s.value;
            applyPaint();
            syncSwatchPressed();
          },
        },
      })
    )
  );
}

function syncSwatchPressed() {
  $$(".swatch", swatchesEl).forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.value === state.color))
  );
}

/* ============================================================
   STROKE
   ============================================================ */
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
    // Also update the source tile if still mounted
    if (state.sourceTile) {
      state.sourceTile.classList.toggle("is-bookmarked", nowMarked);
    }
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
  if (bookmarkLabel) bookmarkLabel.textContent = marked ? "Bookmarked" : "Bookmark";
}

function formatStroke(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "auto";
  return n.toFixed(2).replace(/0$/, "");
}

function applyPaint() {
  const svg = stageIcon?.querySelector("svg");
  if (!svg) return;

  if (state.color && state.color !== "currentColor") {
    svg.style.color = state.color;
  } else {
    svg.style.color = "";
  }

  if (state.stroke > 0) {
    svg.style.strokeWidth = String(state.stroke);
    // For outline-y varieties, ensure the stroke renders visibly.
    svg.style.stroke = "currentColor";
    if (svg.getAttribute("fill") === "currentColor") svg.style.fill = "none";
  } else {
    svg.style.strokeWidth = "";
    svg.style.stroke = "";
    svg.style.fill = "";
  }
}

/* ============================================================
   ACTIONS
   ============================================================ */
function buildActions() {
  if (!actionsEl) return;
  mount(actionsEl,
    ACTIONS.map((a) =>
      el("button", {
        cls: "action" + (a.primary ? " action--primary" : ""),
        type: "button",
        dataset: { action: a.id },
        on: { click: (e) => runAction(a.id, e.currentTarget) },
        html: `${glyphSvg(GLYPHS[a.glyph])}<span>${a.label}</span>`,
      })
    )
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
      toast(ok ? "SVG copied" : "Copy failed", { variant: ok ? "success" : "error" });
      if (ok) flash(btn);
      break;
    }
    case "copy-jsx": {
      const ok = await copyText(svgToJSX(svgStr));
      toast(ok ? "JSX copied" : "Copy failed", { variant: ok ? "success" : "error" });
      if (ok) flash(btn);
      break;
    }
    case "copy-uri": {
      const ok = await copyText(svgToDataURI(svgStr));
      toast(ok ? "Data URI copied" : "Copy failed", { variant: ok ? "success" : "error" });
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
        "noopener,noreferrer"
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

/* ============================================================
   PREV / NEXT
   ============================================================ */
function step(delta) {
  const { variety, name } = state;
  if (!variety || !name) return;

  const pool = data.varietyNames(variety);
  if (!pool.length) return;

  const idx  = pool.indexOf(name);
  const next = pool[(idx + delta + pool.length) % pool.length];
  if (!next || next === name) return;

  state.name = next;
  store.recent.push(variety, next);

  // Update the source tile (for the eventual close-flip)
  const tile = document.querySelector(
    `.tile[data-variety="${cssEscape(variety)}"][data-name="${cssEscape(next)}"]`
  );
  if (tile) state.sourceTile = tile;

  // Rerender content without reopening the shell
  stageTitle.textContent = prettyIconName(next);
  stageSub.textContent   = `${prettyVariety(variety)} · ${slug(next)}`;
  stageIcon.innerHTML = registry.svgString(variety, next, { size: 320 });
  applyPaint();
  refreshBookmarkBtn();

  if (!prefersReducedMotion()) {
    stageIcon.animate(
      [
        { opacity: 0, transform: `scale(.86) translateX(${delta * 26}px)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: 340, easing: "cubic-bezier(.22, 1, .36, 1)" }
    );
  }
}

/* ============================================================
   KEYBOARD
   ============================================================ */
function wireKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (!state.open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowLeft")  { e.preventDefault(); step(-1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); step(1);  return; }
    if (e.key.toLowerCase() === "b" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      bookmarkBtn?.click();
      return;
    }
    if (e.key === "Tab") {
      trapFocus(e);
    }
  });
}

function trapFocus(e) {
  const focusables = $$(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    stageEl
  ).filter((n) => !n.hasAttribute("disabled") && n.offsetParent !== null);

  if (!focusables.length) return;
  const first = focusables[0];
  const last  = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/* ============================================================
   MISC
   ============================================================ */
function prettyVariety(key) {
  return key.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

function cssEscape(str) {
  return String(str).replace(/(["\\])/g, "\\$1");
}

const raf = () => new Promise((r) => requestAnimationFrame(r));