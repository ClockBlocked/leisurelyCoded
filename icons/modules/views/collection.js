/* ============================================================
   modules/views/collection.js
   ============================================================ */

import { el, mount, debounce, prettyIconName, download, safeFocus } from "../utils.js";
import { registry } from "../sprite.js";
import { data } from "../data.js";
import { store } from "../store.js";
import { router } from "../router.js";
import { toast } from "../toast.js";
import { collections, collectionFileName } from "../collections.js";
import { tile, emptyState } from "./home.js";

export async function render(container, route) {
  const id = route.params?.id;
  const c = collections.get(id);

  if (!c) {
    mount(container, el("div", { cls: "view-collection" },
      emptyState("Collection not found",
        "That collection may have been deleted, or the link is stale.",
        { label: "All collections", onClick: () => router.go("/collections") }),
    ));
    return;
  }

  const view = el("div", { cls: "view-collection" });
  view.append(
    breadcrumb([
      { label: "Collections", href: "/collections" },
      { label: c.name },
    ]),
    header(c),
    toolbar(c),
    el("div", { id: "collection-body" }, bodyFor(c)),
  );
  mount(container, view);

  wireHeader(view, c);
  wireToolbar(view, c);
}

function breadcrumb(items) {
  const list = el("nav", { cls: "breadcrumb",
    attrs: { "aria-label": "Breadcrumb",
      style: "display:flex;gap:8px;font-size:.75rem;color:var(--text-faint);margin-bottom:18px" } });
  items.forEach((item, i) => {
    if (i) list.append(el("span", { text: "/", attrs: { "aria-hidden": "true" } }));
    if (item.href) list.append(el("a", { text: item.label, attrs: { href: "#" + item.href },
      style: { color: "var(--text-dim)" } }));
    else list.append(el("strong", { text: item.label, style: { color: "var(--text)" } }));
  });
  return list;
}

function header(c) {
  return el("header", { cls: "page-head", dataset: { id: c.id } },
    el("span", { cls: "page-head__eyebrow", text: "Collection" }),
    el("h1", { cls: "page-head__title", text: c.name,
      attrs: { title: "Click to rename", "data-role": "name" },
      style: { cursor: "text" } }),
    el("p", { cls: "page-head__sub", text: c.description || "Add a description…",
      attrs: { "data-role": "desc" },
      style: { cursor: "text", opacity: c.description ? "1" : "0.65" } }),
    el("div", { cls: "page-head__meta" },
      el("span", null,
        el("strong", { text: String(c.items.length), "data-role": "count" }),
        "icons"),
      el("span", null,
        el("strong", { text: humanDate(c.updatedAt) }),
        "updated"),
    ),
  );
}

function toolbar(c) {
  return el("div", { cls: "section-bar" },
    el("h2", { cls: "section-bar__title", text: "Icons in this collection" }),
    el("div", { cls: "section-bar__tools" },
      chip("Add icons", "add", { primary: true }),
      chip("Duplicate", "duplicate"),
      chip("Export", "export"),
      chip("Import", "import"),
      chip("Clear", "clear", { danger: true }),
      chip("Delete", "delete", { danger: true }),
      el("input", { attrs: { id: "collection-item-file", type: "file",
        accept: ".json,application/json", style: "display:none" } }),
    ),
  );
}

function chip(label, action, opts = {}) {
  const b = el("button", { cls: "chip", type: "button", text: label, dataset: { action } });
  if (opts.primary) {
    b.style.background = "var(--accent)";
    b.style.color = "#fff";
    b.style.borderColor = "transparent";
    b.style.boxShadow = "0 6px 18px -10px var(--accent-glow)";
  }
  if (opts.danger) {
    b.style.color = "var(--danger)";
    b.style.borderColor = "rgba(251, 113, 133, 0.4)";
  }
  return b;
}

function bodyFor(c) {
  if (!c.items.length) {
    return emptyState("This collection is empty",
      "Use “Add icons” to start picking. Icons you add here stay linked to the collection.",
      { label: "Add icons", onClick: () => openAddIcons(c.id) });
  }

  const grid = el("div", { cls: "grid", role: "list" });
  c.items.forEach((it, i) => grid.append(collectionTile(c, it, i)));
  return grid;
}

function collectionTile(c, item, i) {
  const { variety, name } = item;
  const base = tile(variety, name, i);

  const remove = el("button", {
    cls: "tile__remove", type: "button",
    attrs: { "aria-label": `Remove ${prettyIconName(name)} from collection` },
    dataset: { nostage: "1" },
    on: {
      click: (e) => {
        e.stopPropagation();
        collections.remove_item(c.id, variety, name);
        toast("Removed from collection");
        router.refresh();
      },
    },
    html: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none"
      stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12"/></svg>`,
  });

  base.append(remove);
  return base;
}

function wireHeader(view, c) {
  const nameNode = view.querySelector('[data-role="name"]');
  const descNode = view.querySelector('[data-role="desc"]');

  nameNode?.addEventListener("click", () => {
    editInline(nameNode, c.name, (next) => {
      if (!next || next === c.name) return;
      collections.rename(c.id, next);
      nameNode.textContent = next;
      toast("Renamed");
    });
  });

  descNode?.addEventListener("click", () => {
    editInline(descNode, c.description || "", (next) => {
      collections.describe(c.id, next);
      descNode.textContent = next || "Add a description…";
      descNode.style.opacity = next ? "1" : "0.65";
      toast("Description saved");
    });
  });
}

function editInline(node, initial, commit) {
  const input = el("input", {
    attrs: { type: "text", value: initial, maxlength: "240" },
    style: { width: "100%", padding: "4px 8px", "border-radius": "6px",
      border: "1px solid var(--accent)", background: "var(--surface-hi)",
      color: "var(--text)", outline: "none", font: "inherit" },
  });

  const parent = node.parentNode;
  parent.replaceChild(input, node);
  safeFocus(input);
  input.select();

  const finish = (doCommit) => {
    if (parent.contains(input)) parent.replaceChild(node, input);
    if (doCommit) commit(input.value.trim());
  };

  input.addEventListener("blur", () => finish(true));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    else if (e.key === "Escape") { e.preventDefault(); finish(false); }
  });
}

function wireToolbar(view, c) {
  const add = view.querySelector('[data-action="add"]');
  const dup = view.querySelector('[data-action="duplicate"]');
  const exp = view.querySelector('[data-action="export"]');
  const imp = view.querySelector('[data-action="import"]');
  const clr = view.querySelector('[data-action="clear"]');
  const del = view.querySelector('[data-action="delete"]');
  const fileInput = view.querySelector("#collection-item-file");

  add?.addEventListener("click", () => openAddIcons(c.id));
  dup?.addEventListener("click", () => duplicateCollection(c.id));
  exp?.addEventListener("click", () => exportCollection(c.id));
  imp?.addEventListener("click", () => fileInput?.click());
  clr?.addEventListener("click", () => clearCollection(c.id));
  del?.addEventListener("click", () => deleteCollection(c.id));
  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importItems(c.id, file);
    e.target.value = "";
  });
}

let addDrawer = null;

function openAddIcons(collectionId) {
  if (addDrawer) addDrawer.remove();

  const variety = store.variety.current();
  const existing = new Set(
    collections.get(collectionId)?.items.map((i) => i.variety + ":" + i.name) || []
  );

  const overlay = el("div", { cls: "add-drawer" });
  const panel = el("div", { cls: "add-drawer__panel" });

  const input = el("input", {
    cls: "add-drawer__input",
    attrs: { type: "text", placeholder: "Search icons to add…",
      autocomplete: "off", spellcheck: "false", "aria-label": "Search icons" },
    on: { input: debounce(() => refreshResults(), 120) },
  });

  const closeBtn = el("button", {
    cls: "add-drawer__close", type: "button", attrs: { "aria-label": "Close" },
    on: { click: close },
    html: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12"/></svg>`,
  });

  const results = el("div", { cls: "add-drawer__results" });

  panel.append(
    el("header", { cls: "add-drawer__head" },
      el("h3", { text: "Add icons to this collection" }),
      closeBtn,
    ),
    el("div", { cls: "add-drawer__search" }, input),
    results,
  );

  overlay.append(el("div", { cls: "add-drawer__scrim", on: { click: close } }), panel);

  document.body.append(overlay);
  requestAnimationFrame(() => { overlay.classList.add("is-open"); safeFocus(input); });
  addDrawer = overlay;
  refreshResults();

  function refreshResults() {
    const q = input.value.trim();
    const names = q
      ? data.search(q, { variety, limit: 120 })
      : data.varietyNames(variety).slice(0, 60);

    if (!names.length) {
      mount(results, el("div", { cls: "add-drawer__empty" },
        el("span", { text: "No matches" })));
      return;
    }

    const grid = el("div", { cls: "add-drawer__grid" });
    for (const name of names) {
      const key = variety + ":" + name;
      const already = existing.has(key);

      const cell = el("button", {
        cls: "add-drawer__cell" + (already ? " is-added" : ""),
        type: "button",
        attrs: {
          "aria-pressed": already ? "true" : "false",
          "aria-label": already ? `Already in collection: ${prettyIconName(name)}` : `Add ${prettyIconName(name)}`,
          disabled: already ? true : null,
        },
        dataset: { name, variety },
        on: {
          click: () => {
            if (already) return;
            const ok = collections.add(collectionId, variety, name);
            if (ok) {
              existing.add(key);
              cell.classList.add("is-added", "is-just-added");
              cell.setAttribute("aria-pressed", "true");
              cell.setAttribute("disabled", "");
              refreshCountInPage(collectionId);
              setTimeout(() => cell.classList.remove("is-just-added"), 700);
              toast(`Added ${prettyIconName(name)}`);
            }
          },
        },
      });
      cell.innerHTML = `
        ${registry.svgString(variety, name, { size: 24 })}
        <span class="add-drawer__cell-name">${prettyIconName(name)}</span>
        ${already ? `<span class="add-drawer__check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
            stroke="currentColor" stroke-width="3" stroke-linecap="round"
            stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>
        </span>` : ""}
      `;
      grid.append(cell);
    }
    mount(results, grid);
  }

  function close() {
    overlay.classList.remove("is-open");
    setTimeout(() => {
      overlay.remove();
      if (addDrawer === overlay) addDrawer = null;
      router.refresh();
    }, 200);
  }
}

function refreshCountInPage(id) {
  const c = collections.get(id);
  const node = document.querySelector('[data-role="count"]');
  if (node && c) node.textContent = String(c.items.length);
}

function duplicateCollection(id) {
  const copy = collections.duplicate(id);
  if (!copy) { toast("Couldn't duplicate", { variant: "error" }); return; }
  toast(`Duplicated as "${copy.name}"`);
  router.go(`/collections/${copy.id}`);
}

function exportCollection(id) {
  const c = collections.get(id);
  if (!c) return;
  const json = collections.exportJson(id);
  if (!json) return;
  download(collectionFileName(c), json, "application/json");
  toast(`Exported "${c.name}"`);
}

async function importItems(id, file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const payload = parsed?.collection || parsed;
    const items = Array.isArray(payload?.items) ? payload.items : [];
    let added = 0;
    for (const it of items) {
      if (it && typeof it.variety === "string" && typeof it.name === "string" && registry.has(it.variety, it.name)) {
        if (collections.add(id, it.variety, it.name)) added++;
      }
    }
    toast(`Imported ${added} icon${added === 1 ? "" : "s"}`);
    router.refresh();
  } catch {
    toast("Couldn't import that file", { variant: "error" });
  }
}

function clearCollection(id) {
  const c = collections.get(id);
  if (!c) return;
  if (!c.items.length) { toast("Already empty"); return; }
  if (!confirm(`Remove all ${c.items.length} icons from "${c.name}"?`)) return;
  collections.clear(id);
  toast("Collection emptied");
  router.refresh();
}

function deleteCollection(id) {
  const c = collections.get(id);
  if (!c) return;
  if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
  collections.remove(id);
  toast("Collection deleted");
  router.go("/collections");
}

function humanDate(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = (now - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}