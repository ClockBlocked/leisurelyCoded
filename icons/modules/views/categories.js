




/* ============================================================
   ICON FORGE — js/views/categories.js
   Full list of categories with a live filter box.
   ============================================================ */

import { el, mount, debounce, prettyIconName } from "../utils.js";
import { registry } from "../sprite.js";
import { data }     from "../data.js";
import { store }    from "../store.js";
import { router }   from "../router.js";
import { sectionBar, emptyState } from "./home.js";

/* ============================================================
   ENTRY
   ============================================================ */
export async function render(container, route) {
  const cats = data.categories().sort((a, b) => b.count - a.count);

  const view = el("div", { cls: "view-categories" });

  view.append(
    pageHead({
      eyebrow: "Browse by topic",
      title: "Categories",
      sub:
        "Every icon is filed by keyword — a name can live in more " +
        "than one category, so feel free to wander.",
      meta: [
        metaStat(cats.length, "Categories"),
        metaStat(data.totals().names, "Unique icons"),
      ],
    }),
    filterBar(),
    el("div", { cls: "grid-wrap", id: "category-grid" }, buildGrid(cats)),
  );

  mount(container, view);

  // Wire up filtering
  const input = view.querySelector("#category-filter");
  const gridWrap = view.querySelector("#category-grid");
  if (input) {
    const run = debounce(() => {
      const q = input.value.trim().toLowerCase();
      const filtered = q
        ? cats.filter(
            (c) =>
              c.label.toLowerCase().includes(q) ||
              c.key.toLowerCase().includes(q)
          )
        : cats;
      mount(gridWrap, buildGrid(filtered));
    }, 120);

    input.addEventListener("input", run);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        input.value = "";
        run();
      }
    });

    // Autofocus if we arrived via search jump
    if (route?.query?.focus === "1") input.focus({ preventScroll: true });
  }
}

/* ============================================================
   PAGE HEAD
   ============================================================ */
function pageHead({ eyebrow, title, sub, meta = [] }) {
  return el("header", { cls: "page-head" },
    eyebrow ? el("span", { cls: "page-head__eyebrow", text: eyebrow }) : null,
    el("h1", { cls: "page-head__title", text: title }),
    sub ? el("p", { cls: "page-head__sub", text: sub }) : null,
    meta.length ? el("div", { cls: "page-head__meta" }, meta) : null,
  );
}

function metaStat(num, label) {
  return el("span", null,
    el("strong", { text: String(num) }),
    label,
  );
}

/* ============================================================
   FILTER BAR
   ============================================================ */
function filterBar() {
  return el("div", { cls: "section-bar" },
    el("h2", { cls: "section-bar__title", text: "All categories" }),
    el("div", { cls: "section-bar__tools" },
      el("label", { cls: "searchbox", attrs: { style: "min-width:220px" } },
        svgSearch(),
        el("input", {
          attrs: {
            id: "category-filter",
            type: "search",
            placeholder: "Filter categories…",
            autocomplete: "off",
            spellcheck: "false",
            "aria-label": "Filter categories",
          },
        }),
      ),
    ),
  );
}

function svgSearch() {
  const wrap = el("span", { html:
    `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
      stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
      aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>`,
  });
  return wrap.firstChild;
}

/* ============================================================
   GRID
   ============================================================ */
function buildGrid(cats) {
  if (!cats.length) {
    return emptyState(
      "No categories matched",
      "Try a different filter — or clear the search box.",
    );
  }

  const grid = el("div", { cls: "cardgrid" });
  cats.forEach((cat, i) => grid.append(categoryCard(cat, i)));
  return grid;
}

function categoryCard(cat, i) {
  const variety = store.variety.current();
  const pool = data.categoryNamesForVariety(cat.key, variety);
  const preview = pool.slice(0, 5);

  const previewRow = el("div", { cls: "card__preview" },
    preview.map((name) =>
      el("span", { html: registry.svgString(variety, name, { size: 20 }) })
    ),
  );

  return el("button", {
    cls: "card",
    type: "button",
    style: { "--i": i },
    attrs: { "aria-label": `Open ${cat.label} category` },
    on: { click: () => router.go(`/categories/${cat.key}`) },
  },
    el("div", { cls: "card__top" },
      el("span", { cls: "card__icon", html: catIconSvg(cat.icon) }),
      el("span", { cls: "card__count", text: String(cat.count) }),
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

function catIconSvg(iconName) {
  if (!iconName) return "";
  for (const v of data.varieties()) {
    if (!v.available) continue;
    const svg = registry.svgString(v.key, iconName, { size: 21 });
    if (svg) return svg;
  }
  return "";
}