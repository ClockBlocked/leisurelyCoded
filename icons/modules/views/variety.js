




/* ============================================================
   ICON FORGE — js/views/variety.js
   Single variety page. Big banner at the top, full grid below,
   plus an in-page filter box and cross-links to sibling
   varieties for quick side-by-side comparison.
   ============================================================ */

import { el, mount, debounce, prettyIconName } from "../utils.js";
import { registry } from "../sprite.js";
import { data }     from "../data.js";
import { store }    from "../store.js";
import { router }   from "../router.js";
import { tile, emptyState } from "./home.js";

/* ============================================================
   ENTRY
   ============================================================ */
export async function render(container, route) {
  const key = route.params?.key;
  const meta = data.varieties().find((v) => v.key === key);

  if (!meta || !meta.available) {
    mount(container,
      el("div", { cls: "view-variety" },
        emptyState(
          "Variety unavailable",
          `“${key}” doesn't seem to be loaded. It may have failed to fetch, ` +
          `or it may not exist in your sprite folder.`,
          { label: "See all varieties", onClick: () => router.go("/varieties") },
        ),
      ),
    );
    return;
  }

  const names = data.varietyNames(key);
  const isCurrent = store.variety.current() === key;
  const siblingKeys = data.varieties()
    .filter((v) => v.available && v.key !== key)
    .slice(0, 6)
    .map((v) => v.key);

  const view = el("div", { cls: "view-variety" });

  view.append(
    breadcrumb([
      { label: "Varieties", href: "/varieties" },
      { label: prettyVariety(key) },
    ]),
    banner(key, meta, isCurrent),
    siblingRow(siblingKeys),
    searchRow(),
    el("div", { id: "variety-tiles" }, buildTiles(key, names)),
  );

  mount(container, view);

  // Wire up the local filter
  const input = view.querySelector("#variety-filter");
  const wrap  = view.querySelector("#variety-tiles");
  if (input) {
    const run = debounce(() => {
      const q = input.value.trim().toLowerCase();
      const filtered = q
        ? names.filter((n) => n.toLowerCase().includes(q))
        : names;
      mount(wrap, buildTiles(key, filtered));
    }, 120);

    input.addEventListener("input", run);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { input.value = ""; run(); }
    });
  }

  // If this isn't the active variety yet, quietly adopt it so
  // the top nav reflects where the user is.
  if (!isCurrent) store.variety.set(key);
}

/* ============================================================
   PIECES
   ============================================================ */
function breadcrumb(items) {
  const list = el("nav", {
    cls: "breadcrumb",
    attrs: {
      "aria-label": "Breadcrumb",
      style:
        "display:flex;gap:8px;font-size:.75rem;color:var(--text-faint);margin-bottom:18px",
    },
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

function banner(key, meta, isCurrent) {
  const pool = data.varietyNames(key);
  const preview = pool.slice(0, 12);

  const previewStrip = el("div", { cls: "variety-banner__preview" },
    preview.map((name) => el("span", {
      cls: "variety-banner__icon",
      html: registry.svgString(key, name, { size: 32 }),
    })),
  );

  return el("section", { cls: "variety-banner is-hero" },
    el("div", { cls: "variety-banner__head" },
      el("div", { cls: "variety-banner__title" },
        el("span", { cls: "variety-banner__glyph", html: glyphFor(key) }),
        el("span", { cls: "variety-banner__name", text: prettyVariety(key) }),
      ),
      el("span", { cls: "variety-banner__count",
        text: `${meta.count} icon${meta.count === 1 ? "" : "s"}`,
      }),
    ),
    el("p", { cls: "variety-banner__blurb", text: blurbFor(key) }),
    previewStrip,
    isCurrent
      ? el("span", { cls: "variety-banner__badge", text: "Active variety" })
      : null,
  );
}

function siblingRow(keys) {
  if (!keys.length) return document.createComment("no-siblings");

  const row = el("div", {
    cls: "sibling-row",
    attrs: { style:
      "display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 4px;align-items:center" },
  });

  row.append(el("span", {
    text: "Switch:",
    style: {
      "font-size": ".72rem",
      "font-weight": "600",
      "letter-spacing": ".08em",
      "text-transform": "uppercase",
      color: "var(--text-faint)",
      "margin-right": "4px",
    },
  }));

  for (const k of keys) {
    row.append(el("button", {
      cls: "chip",
      type: "button",
      text: prettyVariety(k),
      on: {
        click: () => {
          store.variety.set(k);
          router.go(`/varieties/${k}`);
        },
      },
    }));
  }

  return row;
}

function searchRow() {
  return el("div", { cls: "section-bar" },
    el("h2", { cls: "section-bar__title", text: "All icons" }),
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
            id: "variety-filter",
            type: "search",
            placeholder: "Filter this variety…",
            autocomplete: "off",
            spellcheck: "false",
            "aria-label": "Filter icons in this variety",
          },
        }),
      ),
    ),
  );
}

function buildTiles(variety, names) {
  if (!names.length) {
    return emptyState(
      "No matches",
      "Try a different filter — or clear the input with Escape.",
    );
  }
  const grid = el("div", { cls: "grid", role: "list" });
  names.forEach((name, i) => grid.append(tile(variety, name, i)));
  return grid;
}

function prettyVariety(key) {
  return key.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

function blurbFor(key) {
  const map = {
    solid:   "Bold, filled shapes with the most visual weight. The workhorse of the set.",
    regular: "Refined line icons with a lighter, airier feel — perfect for dense UI.",
    sharp:   "Crisp corners and precise angles, engineered for editor chrome.",
    light:   "Airy hairlines that whisper rather than shout.",
    thin:    "Featherweight strokes. Elegant at scale, legible when small.",
    duotone: "Two-tone depth that makes icons pop off the page.",
    brands:  "Logos for social platforms, tools, and third-party integrations.",
  };
  return map[key] || "A distinct visual style within the Font Awesome family.";
}

function glyphFor(key) {
  const d = {
    solid:   '<path d="M12 3 3 12h6v9h6v-9h6z"/>',
    regular: '<path d="M12 3 3 12h6v9h6v-9h6z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    sharp:   '<path d="M4 4h16v4H8v4h12v4H8v4H4z"/>',
    light:   '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1"/>',
    thin:    '<path d="M4 12h16" stroke="currentColor" stroke-width="1"/>',
    duotone: '<circle cx="12" cy="12" r="8" opacity=".35"/><circle cx="12" cy="12" r="4"/>',
    brands:  '<path d="M12 3 3 8v8l9 5 9-5V8z"/>',
  }[key] || '<circle cx="12" cy="12" r="6"/>';
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"
    stroke="currentColor" aria-hidden="true">${d}</svg>`;
}