




/* ============================================================
   ICON FORGE — js/views/bookmarks.js
   Bookmarks page — every icon the user has starred, grouped
   by variety so the list stays legible.

   Includes:
     • Export all bookmarks as a JSON file
     • Import bookmarks from a JSON file
     • Clear-all with confirmation
     • Empty state with a CTA back to Home
   ============================================================ */

import { el, mount, download, debounce } from "../utils.js";
import { toast } from "../toast.js";
import { registry } from "../sprite.js";
import { data }     from "../data.js";
import { store }    from "../store.js";
import { router }   from "../router.js";
import { tile, emptyState, sectionBar } from "./home.js";

/* ============================================================
   ENTRY
   ============================================================ */
export async function render(container, route) {
  const all = store.bookmark.all();
  const resolved = data.resolve(all);

  if (!resolved.length) {
    mount(container,
      el("div", { cls: "view-bookmarks" },
        pageHead({
          eyebrow: "Your collection",
          title: "Bookmarks",
          sub: "Icons you've starred appear here. Nothing saved yet.",
        }),
        emptyState(
          "No bookmarks yet",
          "Open any icon and tap the bookmark button to pin it here. " +
          "Your bookmarks persist across reloads.",
          { label: "Browse icons", onClick: () => router.go("/") },
        ),
      ),
    );
    return;
  }

  // Group by variety
  const grouped = new Map();
  for (const r of resolved) {
    if (!grouped.has(r.variety)) grouped.set(r.variety, []);
    grouped.get(r.variety).push(r.name);
  }

  const view = el("div", { cls: "view-bookmarks" });

  view.append(
    pageHead({
      eyebrow: "Your collection",
      title: "Bookmarks",
      sub:
        "Everything you've starred, grouped by variety. Use the " +
        "toolbar to export or import your set.",
      meta: [
        metaStat(resolved.length, "Bookmarked"),
        metaStat(grouped.size, "Varieties"),
      ],
    }),
    toolbar(),
    ...buildGroups(grouped),
  );

  mount(container, view);

  // Wire toolbar
  const exportBtn = view.querySelector('[data-action="export"]');
  const importBtn = view.querySelector('[data-action="import"]');
  const fileInput = view.querySelector("#bookmark-file");
  const clearBtn  = view.querySelector('[data-action="clear"]');

  exportBtn?.addEventListener("click", exportBookmarks);
  importBtn?.addEventListener("click", () => fileInput?.click());
  clearBtn?.addEventListener("click", clearBookmarks);

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importBookmarks(file);
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

function toolbar() {
  return el("div", { cls: "section-bar" },
    el("h2", { cls: "section-bar__title", text: "Your icons" }),
    el("div", { cls: "section-bar__tools" },
      toolBtn("Export .json", "export"),
      toolBtn("Import .json", "import"),
      toolBtn("Clear all", "clear", { danger: true }),
      el("input", {
        attrs: {
          id: "bookmark-file",
          type: "file",
          accept: ".json,application/json",
          style: "display:none",
        },
      }),
    ),
  );
}

function toolBtn(label, action, opts = {}) {
  const b = el("button", {
    cls: "chip" + (opts.danger ? " chip--danger" : ""),
    type: "button",
    text: label,
    dataset: { action },
  });
  if (opts.danger) {
    b.style.color = "var(--danger)";
    b.style.borderColor = "rgba(251, 113, 133, 0.4)";
  }
  return b;
}

function buildGroups(grouped) {
  const sections = [];
  let globalIdx = 0;

  for (const [variety, names] of grouped) {
    const grid = el("div", { cls: "grid", role: "list" });
    names.forEach((name) => {
      grid.append(tile(variety, name, globalIdx++));
    });

    sections.push(
      el("section", { cls: "section" },
        sectionBar({
          title: prettyVariety(variety),
          subtitle: `${names.length} icon${names.length === 1 ? "" : "s"}`,
          tools: [
            (() => {
              const b = el("button", {
                cls: "chip",
                type: "button",
                text: "Remove all in this variety",
              });
              b.addEventListener("click", () => {
                for (const n of names) store.bookmark.remove(variety, n);
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

  return sections;
}

/* ============================================================
   ACTIONS
   ============================================================ */
function exportBookmarks() {
  const payload = {
    app: "Icon Forge",
    version: 1,
    exportedAt: new Date().toISOString(),
    bookmarks: store.bookmark.all(),
  };
  const filename = `icon-forge-bookmarks-${dateStamp()}.json`;
  download(filename, JSON.stringify(payload, null, 2), "application/json");
  toast(`Exported ${payload.bookmarks.length} bookmarks`);
}

async function importBookmarks(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : parsed?.bookmarks;
    if (!Array.isArray(list)) throw new Error("Unrecognized file format");

    let added = 0;
    for (const item of list) {
      if (
        item &&
        typeof item.variety === "string" &&
        typeof item.name === "string"
      ) {
        if (store.bookmark.add(item.variety, item.name)) added++;
      }
    }
    toast(`Imported ${added} new bookmark${added === 1 ? "" : "s"}`);
    router.refresh();
  } catch (err) {
    toast("Couldn't import that file", { error: true });
  }
}

function clearBookmarks() {
  const n = store.bookmark.all().length;
  if (!n) return;
  if (!confirm(`Remove all ${n} bookmark${n === 1 ? "" : "s"}? This cannot be undone.`)) return;
  store.bookmark.clear();
  toast("Bookmarks cleared");
  router.refresh();
}

function dateStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function prettyVariety(key) {
  return key.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}