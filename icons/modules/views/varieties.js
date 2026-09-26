




/* ============================================================
   ICON FORGE — js/views/varieties.js
   Banner-style index of every variety (Solid, Sharp, Duotone…).
   Each is a big, elegant card showing preview icons.
   ============================================================ */

import { el, mount } from "../utils.js";
import { registry } from "../sprite.js";
import { data }     from "../data.js";
import { store }    from "../store.js";
import { router }   from "../router.js";
import { emptyState } from "./home.js";

/* ============================================================
   ENTRY
   ============================================================ */
export async function render(container, route) {
  const varieties = data.varieties();

  const view = el("div", { cls: "view-varieties" });

  view.append(
    pageHead({
      eyebrow: "Every style",
      title: "Varieties",
      sub:
        "Font Awesome ships the same icon family in multiple visual " +
        "styles. Pick the one that matches your tone — crisp and " +
        "functional, or soft and decorative.",
      meta: [
        metaStat(varieties.filter((v) => v.available).length, "Available"),
        metaStat(varieties.length, "Total"),
      ],
    }),
    el("div", { cls: "variety-grid" }, varieties.map(banner)),
  );

  mount(container, view);
}

/* ============================================================
   PIECES
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
  return el("span", null, el("strong", { text: String(num) }), label);
}

function banner(v, i) {
  const enabled = v.available && v.count > 0;
  const pool = data.varietyNames(v.key);
  const preview = pool.slice(0, 8);
  const isCurrent = store.variety.current() === v.key;

  const previewStrip = el("div", { cls: "variety-banner__preview" },
    preview.map((name) => el("span", {
      cls: "variety-banner__icon",
      html: registry.svgString(v.key, name, { size: 30 }),
    })),
  );

  const node = el("button", {
    cls:
      "variety-banner" +
      (enabled ? "" : " is-disabled") +
      (isCurrent ? " is-current" : ""),
    type: "button",
    style: { "--i": i },
    dataset: { variety: v.key },
    attrs: {
      "aria-label": enabled
        ? `Browse the ${prettyVariety(v.key)} variety`
        : `${prettyVariety(v.key)} variety is unavailable`,
      disabled: enabled ? null : true,
    },
    on: {
      click: () => {
        if (!enabled) return;
        store.variety.set(v.key);
        router.go(`/varieties/${v.key}`);
      },
    },
  },
    el("div", { cls: "variety-banner__head" },
      el("div", { cls: "variety-banner__title" },
        el("span", { cls: "variety-banner__glyph", html: glyphFor(v.key) }),
        el("span", { cls: "variety-banner__name", text: prettyVariety(v.key) }),
      ),
      el("span", { cls: "variety-banner__count",
        text: enabled ? `${v.count} icons` : "unavailable",
      }),
    ),
    el("p", { cls: "variety-banner__blurb", text: blurbFor(v.key) }),
    previewStrip,
    el("span", { cls: "variety-banner__cta", html:
      enabled
        ? `Browse variety <svg viewBox="0 0 24 24" width="12" height="12"
             fill="none" stroke="currentColor" stroke-width="2.4"
             stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`
        : `This style isn't loaded`,
    }),
  );

  return node;
}

function prettyVariety(key) {
  return key.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

function blurbFor(key) {
  const map = {
    solid:   "Bold, filled shapes with the most visual weight. The workhorse of the set.",
    regular: "Refined line icons with a lighter, airier feel — perfect for dense UI.",
    sharp:   "Crisp corners and precise angles, engineered for editor chrome.",
    light:   "Airy hairlines that whisper rather than shout. Great for editorial.",
    thin:    "Featherweight strokes. Elegant when scaled large, legible when small.",
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