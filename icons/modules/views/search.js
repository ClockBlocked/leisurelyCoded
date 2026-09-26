




/* ============================================================
   ICON FORGE — js/views/search.js
   Search results page. Query comes from the hash
   (#/search?q=arrow) so results are linkable.

   Behaviour:
   - Empty query → prompt the user to type
   - Zero results → empty state with suggestions
   - Results are grouped by variety when there's more than one
     available; otherwise a single grid.
   ============================================================ */

import { el, mount, debounce } from "../utils.js";
import { registry } from "../sprite.js";
import { data }     from "../data.js";
import { store }    from "../store.js";
import { router }   from "../router.js";
import { tile, emptyState, sectionBar } from "./home.js";

/* ============================================================
   ENTRY
   ============================================================ */
export async function render(container, route) {
  const q = String(route.query?.q || "").trim();
  const variety = store.variety.current();

  const view = el("div", { cls: "view-search" });

  view.append(
    pageHead({
      eyebrow: "Search",
      title: q ? `Results for “${q}”` : "Search icons",
      sub: q
        ? "Matches ranked by name, then by category."
        : "Type a name, a category, or a keyword to begin.",
    }),
    searchField(q),
  );

  if (!q) {
    view.append(
      emptyState(
        "What are you looking for?",
        "Try “arrow”, “camera”, “user”, or any keyword from the icon's name.",
      ),
    );
    mount(container, view);
    wireSearch(view);
    return;
  }

  // Search across all varieties (unique names)
  const names = data.search(q, { limit: 800 });

  if (!names.length) {
    view.append(
      emptyState(
        "No icons matched",
        `Nothing in the library matches “${q}”. Try a shorter query, ` +
        `or browse categories.`,
        { label: "Browse categories", onClick: () => router.go("/categories") },
      ),
    );
    mount(container, view);
    wireSearch(view);
    return;
  }

  // Which varieties actually contain these names?
  const varietiesWithMatches = new Map();
  for (const v of data.varieties()) {
    if (!v.available) continue;
    const set = new Set(data.varietyNames(v.key));
    const hits = names.filter((n) => set.has(n));
    if (hits.length) varietiesWithMatches.set(v.key, hits);
  }

  view.append(
    el("div", { cls: "section-bar" },
      el("h2", { cls: "section-bar__title",
        text: `${names.length} match${names.length === 1 ? "" : "es"}`,
      }),
      el("div", { cls: "section-bar__tools" },
        el("span", { text: "Showing every variety below" }),
      ),
    ),
  );

  // If we have more than one variety with matches, render per-variety
  // sections so nothing is hidden by the currently active variety.
  if (varietiesWithMatches.size > 1) {
    let idx = 0;
    for (const [variety, hits] of varietiesWithMatches) {
      const grid = el("div", { cls: "grid", role: "list" });
      hits.forEach((name) => grid.append(tile(variety, name, idx++)));

      view.append(
        el("section", { cls: "section" },
          sectionBar({
            title: prettyVariety(variety),
            subtitle: `${hits.length}`,
            tools: [
              (() => {
                const b = el("button", {
                  cls: "chip",
                  type: "button",
                  text: "Set as active variety",
                });
                b.addEventListener("click", () => {
                  store.variety.set(variety);
                  router.refresh();
                });
                return b;
              })(),
            ],
          }),
          grid,
        ),
      );
    }
  } else {
    // Single variety → one simple grid using the current variety.
    const grid = el("div", { cls: "grid", role: "list" });
    names.forEach((name, i) => grid.append(tile(variety, name, i)));
    view.append(grid);
  }

  mount(container, view);
  wireSearch(view);
}

/* ============================================================
   PIECES
   ============================================================ */
function pageHead({ eyebrow, title, sub }) {
  return el("header", { cls: "page-head" },
    eyebrow ? el("span", { cls: "page-head__eyebrow", text: eyebrow }) : null,
    el("h1", { cls: "page-head__title", text: title }),
    sub ? el("p", { cls: "page-head__sub", text: sub }) : null,
  );
}

function searchField(initial) {
  const input = el("input", {
    attrs: {
      id: "search-page-input",
      type: "search",
      placeholder: "Search icons…",
      autocomplete: "off",
      spellcheck: "false",
      "aria-label": "Search icons",
      value: initial,
    },
    style: {
      width: "100%",
      height: "44px",
      padding: "0 16px 0 42px",
      "border-radius": "12px",
      border: "1px solid var(--border)",
      background: "var(--surface)",
      color: "var(--text)",
      "font-size": ".9375rem",
      outline: "none",
    },
  });

  const wrap = el("div", {
    cls: "search-page-field",
    style: { position: "relative", "margin-bottom": "24px" },
  },
    (() => {
      const w = el("span", { html:
        `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
          stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
          aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>`,
        style: {
          position: "absolute",
          left: "14px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-faint)",
          "pointer-events": "none",
        },
      });
      return w;
    })(),
    input,
  );

  return wrap;
}

function wireSearch(view) {
  const input = view.querySelector("#search-page-input");
  if (!input) return;

  const run = debounce(() => {
    const q = input.value.trim();
    const next = q ? `#/search?q=${encodeURIComponent(q)}` : "#/search";
    if (location.hash !== next) {
      location.hash = next;
    }
  }, 220);

  input.addEventListener("input", run);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim();
      location.hash = q ? `#/search?q=${encodeURIComponent(q)}` : "#/search";
    }
  });

  // Focus on arrival, preserving the query text.
  requestAnimationFrame(() => {
    try {
      input.focus({ preventScroll: true });
      const len = input.value.length;
      input.setSelectionRange(len, len);
    } catch { /* noop */ }
  });
}

function prettyVariety(key) {
  return key.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}