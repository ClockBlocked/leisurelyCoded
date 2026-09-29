/* ============================================================
   modules/views/varieties.js
   ============================================================ */

import { el, mount } from "../utils.js";
import { registry } from "../sprite.js";
import { data } from "../data.js";
import { store } from "../store.js";
import { router } from "../router.js";
import { registry as reg } from "../sprite.js";
import { invalidate } from "../data.js";
import { toast } from "../toast.js";

export async function render(container, route) {
  const varieties = data.varieties();

  const view = el("div", { cls: "view-varieties" });
  view.append(
    pageHead({
      eyebrow: "Every style",
      title: "Varieties",
      sub: "Font Awesome ships the same icon family in multiple visual styles.",
      meta: [
        metaStat(varieties.filter((v) => v.loaded).length, "Loaded"),
        metaStat(varieties.length, "Total"),
      ],
    }),
    el("div", { cls: "variety-grid" }, varieties.map((v, i) => banner(v, i))),
  );

  mount(container, view);
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

function banner(v, i) {
  const enabled = v.available !== false;
  const pool = v.loaded ? data.varietyNames(v.key) : [];
  const preview = pool.slice(0, 8);
  const isCurrent = store.variety.current() === v.key;

  const previewStrip = el("div", { cls: "variety-banner__preview" },
    preview.map((name) => el("span", {
      cls: "variety-banner__icon",
      html: registry.svgString(v.key, name, { size: 30 }),
    })),
  );

  const node = el("button", {
    cls: "variety-banner" + (enabled ? "" : " is-disabled") + (isCurrent ? " is-current" : ""),
    type: "button", style: { "--i": i }, dataset: { variety: v.key },
    attrs: { "aria-label": enabled ? `Browse the ${prettyVariety(v.key)} variety`
      : `${prettyVariety(v.key)} is unavailable`,
      disabled: enabled ? null : true },
    on: {
      click: async () => {
        if (!enabled) return;
        if (!reg.isLoaded(v.key)) {
          node.classList.add("is-loading");
          try { await reg.ensure(v.key); invalidate(); }
          catch { toast("Couldn't load that variety", { variant: "error" }); return; }
          finally { node.classList.remove("is-loading"); }
        }
        store.variety.set(v.key);
        router.go(`/varieties/${v.key}`);
      },
    },
  },
    el("div", { cls: "variety-banner__head" },
      el("div", { cls: "variety-banner__title" },
        el("span", { cls: "variety-banner__glyph", html: glyphFor(v.key) }),
        el("span", { cls: "variety-banner__name", text: v.label || prettyVariety(v.key) }),
      ),
      el("span", { cls: "variety-banner__count",
        text: enabled ? (v.loaded ? `${v.count} icons` : "not loaded") : "unavailable" }),
    ),
    el("p", { cls: "variety-banner__blurb", text: v.blurb || blurbFor(v.key) }),
    previewStrip,
    el("span", { cls: "variety-banner__cta", html:
      enabled ? `Browse variety <svg viewBox="0 0 24 24" width="12" height="12"
        fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`
      : `This style isn't loaded` }),
  );

  return node;
}

function prettyVariety(key) {
  return key.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

function blurbFor(key) {
  const map = {
    solid: "Bold, filled shapes. The workhorse.",
    regular: "Refined line icons.",
    sharp: "Crisp corners for editor chrome.",
    light: "Airy hairlines that whisper.",
    thin: "Featherweight strokes.",
    duotone: "Two-tone depth.",
    brands: "Logos for social and integrations.",
  };
  return map[key] || "A distinct visual style.";
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