/* ============================================================
   ICON FORGE — js/views/collections.js
   Index of every collection the user has created.

   Features:
     • "New collection" call-to-action at the top
     • Grid of collection cards with live preview icons
     • Import / Export-all in the toolbar
     • Empty state with a friendly nudge
     • Inline rename via double-click on the name
   ============================================================ */

import {
  el, mount, prettyIconName, download, debounce, safeFocus,
} from "../utils.js";
import { registry } from "../sprite.js";
import { data }     from "../data.js";
import { store }    from "../store.js";
import { router }   from "../router.js";
import { toast }    from "../toast.js";
import {
  collections,
  collectionFileName,
} from "../collections.js";
import { emptyState } from "./home.js";

/* ============================================================
   ENTRY
   ============================================================ */
export async function render(container, route) {
  const all = collections.all();

  const view = el("div", { cls: "view-collections" });

  view.append(
    pageHead({
      eyebrow: "Your library",
      title: "Collections",
      sub:
        "Named groups of icons — perfect for grouping a design " +
        "system, a project, or a single page's worth of glyphs.",
      meta: [
        metaStat(all.length, "Collections"),
        metaStat(
          all.reduce((acc, c) => acc + c.items.length, 0),
          "Icons stored"
        ),
      ],
    }),
    toolbar(all.length > 0),
  );

  if (!all.length) {
    view.append(
      emptyState(
        "No collections yet",
        "Create your first collection and start grouping icons by project, " +
        "page, or mood. You can also import a collection someone else shared.",
        {
          label: "Create your first collection",
          onClick: () => createAndNavigate(),
        },
      ),
    );
  } else {
    const grid = el("div", { cls: "cardgrid" });
    all.forEach((c, i) => grid.append(collectionCard(c, i)));
    view.append(grid);
  }

  mount(container, view);

  // Wire toolbar
  const newBtn    = view.querySelector('[data-action="new"]');
  const exportBtn = view.querySelector('[data-action="export-all"]');
  const importBtn = view.querySelector('[data-action="import"]');
  const fileInput = view.querySelector("#collection-file");

  newBtn?.addEventListener("click", () => createAndNavigate());
  exportBtn?.addEventListener("click", () => exportAll());
  importBtn?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importFromFile(file);
    e.target.value = "";
  });
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

function toolbar(hasAny) {
  return el("div", { cls: "section-bar" },
    el("h2", { cls: "section-bar__title", text: "All collections" }),
    el("div", { cls: "section-bar__tools" },
      chip("New collection", "new", { primary: true }),
      hasAny ? chip("Export all", "export-all") : null,
      chip("Import", "import"),
      el("input", {
        attrs: {
          id: "collection-file",
          type: "file",
          accept: ".json,application/json",
          style: "display:none",
        },
      }),
    ),
  );
}

function chip(label, action, opts = {}) {
  const b = el("button", {
    cls: "chip" + (opts.primary ? " chip--primary" : ""),
    type: "button",
    text: label,
    dataset: { action },
  });
  if (opts.primary) {
    b.style.background = "var(--accent)";
    b.style.color = "#fff";
    b.style.borderColor = "transparent";
    b.style.boxShadow = "0 6px 18px -10px var(--accent-glow)";
  }
  return b;
}

/* ============================================================
   CARD
   ============================================================ */
function collectionCard(c, i) {
  const preview = c.items.slice(0, 6);

  const previewStrip = el("div", { cls: "card__preview" });
  if (preview.length) {
    for (const it of preview) {
      const svg = registry.svgString(it.variety, it.name, { size: 20 });
      if (svg) previewStrip.append(el("span", { html: svg }));
    }
  } else {
    previewStrip.append(el("span", {
      cls: "card__preview-empty",
      text: "Empty",
      style: {
        color: "var(--text-faint)",
        "font-size": ".75rem",
        "letter-spacing": ".05em",
        "text-transform": "uppercase",
      },
    }));
  }

  const nameNode = el("h3", {
    cls: "card__name",
    text: c.name,
    attrs: { title: "Double-click to rename" },
    style: { cursor: "text" },
    on: {
      dblclick: (e) => {
        e.stopPropagation();
        startRename(c, nameNode);
      },
    },
  });

  const node = el("button", {
    cls: "card",
    type: "button",
    style: { "--i": i },
    dataset: { id: c.id },
    attrs: { "aria-label": `Open collection ${c.name}` },
    on: {
      click: (e) => {
        // Ignore clicks that happen during rename editing
        if (node.dataset.editing === "1") return;
        router.go(`/collections/${c.id}`);
      },
    },
  },
    el("div", { cls: "card__top" },
      el("span", {
        cls: "card__icon",
        html: folderGlyph(),
      }),
      el("span", {
        cls: "card__count",
        text: `${c.items.length} icon${c.items.length === 1 ? "" : "s"}`,
      }),
    ),
    nameNode,
    c.description
      ? el("p", { cls: "card__desc", text: c.description })
      : el("p", { cls: "card__desc", style: { opacity: "0.6" },
          text: "No description yet." }),
    previewStrip,
    el("span", { cls: "card__arrow", html:
      `Open <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
        stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>` }),
  );

  return node;
}

function startRename(c, nameNode) {
  const card = nameNode.closest(".card");
  if (card) card.dataset.editing = "1";

  const input = el("input", {
    attrs: { type: "text", value: c.name, maxlength: "60" },
    style: {
      width: "100%",
      "font-size": "1.0625rem",
      "font-weight": "650",
      "letter-spacing": "-0.015em",
      padding: "4px 6px",
      "border-radius": "6px",
      border: "1px solid var(--accent)",
      background: "var(--surface-hi)",
      color: "var(--text)",
      outline: "none",
      font: "inherit",
    },
  });

  const parent = nameNode.parentNode;
  parent.replaceChild(input, nameNode);
  safeFocus(input);
  input.select();

  const finish = (commit) => {
    if (card) card.dataset.editing = "";
    if (commit) {
      const next = input.value.trim();
      if (next && next !== c.name) {
        collections.rename(c.id, next);
        toast("Collection renamed");
        nameNode.textContent = next;
      }
    }
    if (parent.contains(input)) parent.replaceChild(nameNode, input);
  };

  input.addEventListener("blur", () => finish(true));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    else if (e.key === "Escape") { e.preventDefault(); finish(false); }
  });
}

function folderGlyph() {
  return `<svg viewBox="0 0 24 24" width="21" height="21" fill="none"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  </svg>`;
}

/* ============================================================
   ACTIONS
   ============================================================ */
function createAndNavigate() {
  const existing = collections.all();
  const n = existing.length + 1;
  const created = collections.create(`Collection ${n}`);
  if (!created) {
    toast("Couldn't create collection", { variant: "error" });
    return;
  }
  toast(`Created “${created.name}”`);
  router.go(`/collections/${created.id}`);
}

function exportAll() {
  const json = collections.exportAll();
  const filename = `icon-forge-collections-${dateStamp()}.json`;
  download(filename, json, "application/json");
  toast("Exported every collection");
}

async function importFromFile(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Distinguish single vs. multi.
    if (parsed?.collection) {
      const created = collections.importJson(parsed);
      if (!created) throw new Error("bad payload");
      toast(`Imported “${created.name}”`);
    } else if (Array.isArray(parsed?.collections) || Array.isArray(parsed)) {
      const n = collections.importAll(parsed);
      toast(`Imported ${n} collection${n === 1 ? "" : "s"}`);
    } else {
      throw new Error("Unrecognized file format");
    }
    router.refresh();
  } catch {
    toast("Couldn't import that file", { variant: "error" });
  }
}

function dateStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}