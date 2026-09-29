/* ============================================================
   modules/views/search.js
   ============================================================ */

import { el, mount, debounce, safeFocus } from "../utils.js";
import { registry } from "../sprite.js";
import { data } from "../data.js";
import { store } from "../store.js";
import { router } from "../router.js";
import { tile, emptyState } from "./home.js";

export async function render(container, route) {
  const q = String(route.query?.q || "").trim();

  const view = el("div", { cls: "view-search" });
  view.append(
    pageHead({
      eyebrow: "Search",
      title: q ? `Results for “${q}”` : "Search icons",
      sub: q ? "Matches ranked by name, then by category."
        : "Type a name, a category, or a keyword to begin.",
    }),
    searchField(q),
  );

  if (!q) {
    view.append(emptyState("What are you looking for?",
      "Try “arrow”, “camera”, “user”, or any keyword from the icon's name."));
    mount(container, view);
    wireSearch(view);
    return;
  }

  const names = data.search(q, { limit: 300 });

  if (!names.length) {
    view.append(emptyState("No icons matched",
      `Nothing in the library matches “${q}”. Try a shorter query.`,
      { label: "Browse categories", onClick: () => router.go("/categories") }));
    mount(container, view);
    wireSearch(view);
    return;
  }

  const variety = store.variety.current();
  const varietySet = new Set(registry.listIcons(variety));
  const loadedByVariety = registry.loadedVarieties()
    .map((k) => ({ k, set: new Set(registry.listIcons(k)) }));

  const grid = el("div", { cls: "grid", role: "list" });
  let idx = 0;
  for (const name of names) {
    let vKey = varietySet.has(name) ? variety : null;
    if (!vKey) for (const entry of loadedByVariety) {
      if (entry.set.has(name)) { vKey = entry.k; break; }
    }
    if (vKey) grid.append(tile(vKey, name, idx++));
  }

  view.append(
    el("div", { cls: "section-bar" },
      el("h2", { cls: "section-bar__title",
        text: `${names.length} match${names.length === 1 ? "" : "es"}` }),
    ),
    grid,
  );

  mount(container, view);
  wireSearch(view);
}

function pageHead({ eyebrow, title, sub }) {
  return el("header", { cls: "page-head" },
    eyebrow ? el("span", { cls: "page-head__eyebrow", text: eyebrow }) : null,
    el("h1", { cls: "page-head__title", text: title }),
    sub ? el("p", { cls: "page-head__sub", text: sub }) : null,
  );
}

function searchField(initial) {
  const input = el("input", {
    attrs: { id: "search-page-input", type: "search", placeholder: "Search icons…",
      autocomplete: "off", spellcheck: "false", "aria-label": "Search icons", value: initial },
    style: { width: "100%", height: "44px", padding: "0 16px 0 42px",
      "border-radius": "12px", border: "1px solid var(--border)",
      background: "var(--surface)", color: "var(--text)",
      "font-size": ".9375rem", outline: "none" },
  });

  return el("div", { cls: "search-page-field",
    style: { position: "relative", "margin-bottom": "24px" } },
    (() => {
      const w = el("span", { html:
        `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
          stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
          aria-hidden="true"><circle cx="11" cy="11" r="7"/>
          <path d="m20 20-3.6-3.6"/></svg>`,
        style: { position: "absolute", left: "14px", top: "50%",
          transform: "translateY(-50%)", color: "var(--text-faint)",
          "pointer-events": "none" } });
      return w;
    })(),
    input,
  );
}

function wireSearch(view) {
  const input = view.querySelector("#search-page-input");
  if (!input) return;

  const run = debounce(() => {
    const q = input.value.trim();
    const next = q ? `#/search?q=${encodeURIComponent(q)}` : "#/search";
    if (location.hash !== next) location.hash = next;
  }, 220);

  input.addEventListener("input", run);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim();
      location.hash = q ? `#/search?q=${encodeURIComponent(q)}` : "#/search";
    }
  });

  requestAnimationFrame(() => {
    try {
      input.focus({ preventScroll: true });
      const len = input.value.length;
      input.setSelectionRange(len, len);
    } catch {}
  });
}