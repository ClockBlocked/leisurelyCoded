




/* ============================================================
   ICON FORGE — js/views/home.js
   Home page renderer.

   Contents:
     • Hero (title, blurb, live counts)
     • Recently viewed strip (from store.recent)
     • "Browse categories" preview grid
     • "Browse varieties" preview grid
     • Full grid of the current variety

   The view is a single async function. It mounts into the
   container passed by the router, replacing its children.

   Contract:
     export async function render(container, route)
   ============================================================ */

import { el, mount, $, $$, prettyIconName, slug, safeFocus } from "../utils.js";
import { registry } from "../sprite.js";
import { data }     from "../data.js";
import { store }    from "../store.js";
import { router }   from "../router.js";

/* ============================================================
   ENTRY
   ============================================================ */
export async function render(container, route) {
  const view = el("div", { cls: "view-home" });

  view.append(
    hero(),
    recentStrip(),
    sectionCategories(),
    sectionVarieties(),
    sectionCurrentVariety(),
  );

  mount(container, view);
  await new Promise((r) => requestAnimationFrame(r));
}

/* ============================================================
   HERO
   ============================================================ */
function hero() {
  const totals = data.totals();
  const varieties = data.varieties().filter((v) => v.available);

  return el("section", { cls: "hero" },
    el("span", { cls: "hero__eyebrow" },
      el("i"),
      "Live icon library",
    ),
    el("h1", {
      cls: "hero__title",
      html: `Every icon, <em>forged</em> into one place.`,
    }),
    el("p", {
      cls: "hero__sub",
      text:
        "A fast, searchable Font Awesome gallery. Browse by category, " +
        "compare varieties side-by-side, and export icons as SVG, JSX " +
        "or Data URI — all in one keystroke.",
    }),
    el("div", { cls: "hero__stats" },
      stat(String(totals.names), "Icons"),
      stat(String(varieties.length), "Varieties"),
      stat(String(totals.categories), "Categories"),
      stat(String(store.bookmark.all().length), "Bookmarked"),
    ),
  );
}

function stat(num, label) {
  return el("div", { cls: "stat" },
    el("span", { cls: "stat__num", text: num }),
    el("span", { cls: "stat__label", text: label }),
  );
}

/* ============================================================
   RECENTLY VIEWED
   ============================================================ */
function recentStrip() {
  const items = store.recent.all();
  if (!items.length) return document.createComment("no-recent");

  const resolved = data.resolve(items);
  if (!resolved.length) return document.createComment("no-recent");

  const strip = el("div", { cls: "grid", role: "list" });
  resolved.forEach((entry, i) => {
    strip.append(tile(entry.variety, entry.name, i));
  });

  return el("section", { cls: "section" },
    sectionBar({
      title: "Recently viewed",
      subtitle: `${resolved.length} icon${resolved.length === 1 ? "" : "s"}`,
      tools: [
        chip("Clear", "clear-recent", () => {
          store.recent.clear();
          router.refresh();
        }),
      ],
    }),
    strip,
  );
}

/* ============================================================
   CATEGORY PREVIEW
   ============================================================ */
function sectionCategories() {
  const cats = data.categories()
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (!cats.length) return document.createComment("no-categories");

  const grid = el("div", { cls: "cardgrid" });
  cats.forEach((cat, i) => {
    grid.append(categoryCard(cat, i));
  });

  return el("section", { cls: "section" },
    sectionBar({
      title: "Browse categories",
      subtitle: `${data.categories().length} total`,
      tools: [
        chip("View all", "all-cats", () => router.go("/categories")),
      ],
    }),
    grid,
  );
}

function categoryCard(cat, i) {
  const variety = store.variety.current();
  const pool = data.categoryNamesForVariety(cat.key, variety);
  const preview = pool.slice(0, 5);

  const previewRow = el("div", { cls: "card__preview" },
    preview.map((name) => {
      const svg = registry.svgString(variety, name, { size: 20 });
      return el("span", { html: svg });
    }),
  );

  return el("button", {
    cls: "card",
    type: "button",
    style: { "--i": i },
    attrs: { "aria-label": `Open ${cat.label}` },
    on: { click: () => router.go(`/categories/${cat.key}`) },
  },
    el("div", { cls: "card__top" },
      el("span", { cls: "card__icon",
        html: catIconSvg(cat.icon),
      }),
      el("span", { cls: "card__count", text: `${cat.count}` }),
    ),
    el("h3", { cls: "card__name", text: cat.label }),
    el("p",  { cls: "card__desc", text: cat.blurb }),
    previewRow,
    el("span", { cls: "card__arrow", html:
      `View <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
        stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>` }),
  );
}

/** Small helper: pick the first icon we can render for a category
    banner. Falls back to a generic dot if not found. */
function catIconSvg(iconName) {
  if (!iconName) return "";
  // Try the name across every variety, first hit wins.
  for (const v of data.varieties()) {
    if (!v.available) continue;
    const svg = registry.svgString(v.key, iconName, { size: 21 });
    if (svg) return svg;
  }
  return "";
}

/* ============================================================
   VARIETY PREVIEW
   ============================================================ */
function sectionVarieties() {
  const varieties = data.varieties().filter((v) => v.available);
  if (!varieties.length) return document.createComment("no-varieties");

  const grid = el("div", { cls: "cardgrid" });
  varieties.forEach((v, i) => grid.append(varietyCard(v, i)));

  return el("section", { cls: "section" },
    sectionBar({
      title: "Compare varieties",
      subtitle: `${varieties.length} available`,
      tools: [
        chip("View all", "all-vars", () => router.go("/varieties")),
      ],
    }),
    grid,
  );
}

function varietyCard(v, i) {
  const pool = data.varietyNames(v.key);
  const preview = pool.slice(0, 5);

  const previewRow = el("div", { cls: "card__preview" },
    preview.map((name) => el("span", {
      html: registry.svgString(v.key, name, { size: 20 }),
    })),
  );

  return el("button", {
    cls: "card",
    type: "button",
    style: { "--i": i },
    attrs: { "aria-label": `Browse ${v.key} variety` },
    on: { click: () => router.go(`/varieties/${v.key}`) },
  },
    el("div", { cls: "card__top" },
      el("span", { cls: "card__icon", html: varietyGlyph(v.key) }),
      el("span", { cls: "card__count", text: `${v.count}` }),
    ),
    el("h3", { cls: "card__name", text: prettyVariety(v.key) }),
    el("p",  { cls: "card__desc", text: varietyBlurb(v.key) }),
    previewRow,
    el("span", { cls: "card__arrow", html:
      `Browse <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
        stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>` }),
  );
}

export function prettyVariety(key) {
  return key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function varietyBlurb(key) {
  const map = {
    solid:   "Bold, filled shapes. The workhorse of the set.",
    regular: "Outlined strokes with a lighter touch.",
    sharp:   "Crisp corners engineered for UI chrome.",
    light:   "Airy hairlines that whisper.",
    thin:    "Featherweight strokes for editorial layouts.",
    duotone: "Two-tone depth for icons that pop.",
    brands:  "Logos for social, platforms, and integrations.",
  };
  return map[key] || "A distinct visual style.";
}

function varietyGlyph(key) {
  // Small inline glyph — not from the sprite, so it renders even
  // when the variety itself failed to load.
  const d = {
    solid:   '<path d="M12 3 3 12h6v9h6v-9h6z"/>',
    regular: '<path d="M12 3 3 12h6v9h6v-9h6z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    sharp:   '<path d="M4 4h16v4H8v4h12v4H8v4H4z"/>',
    light:   '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1"/>',
    thin:    '<path d="M4 12h16" stroke="currentColor" stroke-width="1"/>',
    duotone: '<circle cx="12" cy="12" r="8" opacity=".35"/><circle cx="12" cy="12" r="4"/>',
    brands:  '<path d="M12 3 3 8v8l9 5 9-5V8z"/>',
  }[key] || '<circle cx="12" cy="12" r="6"/>';
  return `<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor"
    stroke="currentColor" aria-hidden="true">${d}</svg>`;
}

/* ============================================================
   CURRENT VARIETY FULL GRID
   ============================================================ */
function sectionCurrentVariety() {
  const variety = store.variety.current();
  const names = data.varietyNames(variety);
  if (!names.length) {
    return el("section", { cls: "section" },
      emptyState(
        "No icons in this variety",
        "The sprite for this variety either failed to load or is empty.",
      ),
    );
  }

  const grid = el("div", { cls: "grid", role: "list" });
  names.forEach((name, i) => grid.append(tile(variety, name, i)));

  return el("section", { cls: "section" },
    sectionBar({
      title: prettyVariety(variety),
      subtitle: `${names.length} icon${names.length === 1 ? "" : "s"}`,
      tools: [
        chip("Bookmarks", "view-bm", () => router.go("/bookmarks")),
      ],
    }),
    grid,
  );
}

/* ============================================================
   SHARED PIECES
   ============================================================ */

/** Icon tile — the atomic unit of every grid. */
export function tile(variety, name, i) {
  const svg = registry.svgString(variety, name, { size: 26 });
  const bookmarked = store.bookmark.has(variety, name);

  const node = el("button", {
    cls: "tile" + (bookmarked ? " is-bookmarked" : ""),
    type: "button",
    style: { "--i": i },
    dataset: { variety, name },
    attrs: { "role": "listitem", "aria-label": `View ${prettyIconName(name)}` },
  });

  node.innerHTML = `
    ${svg}
    <span class="tile__name">${prettyIconName(name)}</span>
    <svg class="tile__mark" viewBox="0 0 24 24" fill="currentColor"
         stroke="currentColor" stroke-width="1" aria-hidden="true">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/>
    </svg>
  `;

  // Cursor-tracking spotlight
  node.addEventListener("pointermove", (e) => {
    const r = node.getBoundingClientRect();
    node.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    node.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  });

  return node;
}

/** Section header bar with optional inline tools. */
export function sectionBar({ title, subtitle, tools = [] }) {
  const left = el("h2", { cls: "section-bar__title" },
    title,
    subtitle ? el("small", { text: subtitle }) : null,
  );

  const right = tools.length
    ? el("div", { cls: "section-bar__tools" }, tools)
    : null;

  return el("header", { cls: "section-bar" }, left, right);
}

/** Inline pill chip. */
export function chip(label, id, onClick) {
  const b = el("button", {
    cls: "chip",
    type: "button",
    text: label,
    dataset: id ? { action: id } : {},
    on: { click: onClick },
  });
  return b;
}

/** Empty state block. */
export function emptyState(title, text, cta) {
  return el("div", { cls: "empty" },
    el("span", { cls: "empty__icon", html:
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">
        <path d="M3 7h18M3 12h18M3 17h10"/>
      </svg>`,
    }),
    el("h3", { cls: "empty__title", text: title }),
    el("p",  { cls: "empty__text",  text }),
    cta ? (() => {
      const b = el("button", {
        cls: "empty__cta",
        type: "button",
        on: { click: cta.onClick },
      }, cta.label, svgArrowInline());
      return b;
    })() : null,
  );
}

function svgArrowInline() {
  const span = el("span", { html:
    `<svg viewBox="0 0 24 24" width="14" height="14" fill="none"
      stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`,
  });
  return span.firstChild;
}