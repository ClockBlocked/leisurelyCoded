




/* ============================================================
   ICON FORGE — js/views/category.js
   Single category page — grid of tiles, filtered by the active
   variety. Switching variety here is a FRAGMENT transition.
   ============================================================ */

import { el, mount, prettyIconName, debounce } from "../utils.js";
import { registry } from "../sprite.js";
import { data }     from "../data.js";
import { store }    from "../store.js";
import { router }   from "../router.js";
import { tile, emptyState, sectionBar } from "./home.js";

/* ============================================================
   ENTRY
   ============================================================ */
export async function render(container, route) {
  const key = route.params?.key;
  const cat = data.category(key);

  if (!cat) {
    mount(container,
      el("div", { cls: "view-category" },
        emptyState(
          "Category not found",
          `No category is registered under "${key}".`,
          { label: "Back to categories", onClick: () => router.go("/categories") },
        ),
      ),
    );
    return;
  }

  const variety = store.variety.current();
  const names = data.categoryNamesForVariety(key, variety);
  const totalNames = cat.names.length;

  const view = el("div", { cls: "view-category" });

  view.append(
    breadcrumb([
      { label: "Categories", href: "/categories" },
      { label: cat.label },
    ]),
    pageHead({
      eyebrow: "Category",
      title: cat.label,
      sub: cat.blurb,
      meta: [
        metaStat(names.length, `in ${prettyVariety(variety)}`),
        metaStat(totalNames, "across all varieties"),
      ],
    }),
    searchRow(),
    el("div", { id: "category-tiles" }, buildTiles(key, variety, names)),
  );

  mount(container, view);

  const input = view.querySelector("#tile-filter");
  const wrap  = view.querySelector("#category-tiles");
  if (input) {
    const run = debounce(() => {
      const q = input.value.trim().toLowerCase();
      const filtered = q
        ? names.filter((n) => n.toLowerCase().includes(q))
        : names;
      mount(wrap, buildTiles(key, variety, filtered));
    }, 120);

    input.addEventListener("input", run);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { input.value = ""; run(); }
    });
  }
}

/* ============================================================
   PIECES
   ============================================================ */
function breadcrumb(items) {
  const list = el("nav", {
    cls: "breadcrumb",
    attrs: { "aria-label": "Breadcrumb", style:
      "display:flex;gap:8px;font-size:.75rem;color:var(--text-faint);margin-bottom:18px" },
  });

  items.forEach((item, i) => {
    if (i) list.append(el("span", { text: "/", attrs: { "aria-hidden": "true" } }));
    if (item.href) {
      list.append(el("a", {
        text: item.label,
        attrs: { href: "#" + item.href },
        style: { color: "var(--text-dim)" },
      }));
    } else {
      list.append(el("strong", { text: item.label, style: { color: "var(--text)" } }));
    }
  });
  return list;
}

function pageHead({ eyebrow, title, sub, meta = [] }) {
  return el("header", { cls: "page-head" },
    eyebrow ? el("span", { cls: "page-head__eyebrow", text: eyebrow }) : null,
    el("h1", { cls: "page-head__title", text: title }),
    sub ? el("p", { cls: "page-head__sub", text: sub }) : null,
    meta.length ? el("div", { cls: "page-head__meta" }, meta) : null,
  );
}

function metaStat(num, label) {
  return el("span", null, el("strong", { text: String(num) }), label);
}

function prettyVariety(key) {
  return key.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

function searchRow() {
  return el("div", { cls: "section-bar" },
    el("h2", { cls: "section-bar__title", text: "Icons" }),
    el("div", { cls: "section-bar__tools" },
      el("label", { cls: "searchbox", attrs: { style: "min-width:220px" } },
        (() => {
          const w = el("span", { html:
            `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
              stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
              aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>`,
          });
          return w.firstChild;
        })(),
        el("input", {
          attrs: {
            id: "tile-filter",
            type: "search",
            placeholder: "Filter this category…",
            autocomplete: "off",
            spellcheck: "false",
            "aria-label": "Filter icons in this category",
          },
        }),
      ),
    ),
  );
}

function buildTiles(catKey, variety, names) {
  if (!names.length) {
    return emptyState(
      "Nothing here yet",
      `No icons in “${catKey}” match the current variety or filter. ` +
      `Try switching variety from the top bar.`,
    );
  }

  const grid = el("div", { cls: "grid", role: "list" });
  names.forEach((name, i) => grid.append(tile(variety, name, i)));
  return grid;
}