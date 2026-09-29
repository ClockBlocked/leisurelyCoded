/* ============================================================
   modules/palette.js
   ============================================================ */

import { PALETTE_COMMANDS, TIMING, UI } from "./config.js";
import {
  el,
  mount,
  debounce,
  prettyIconName,
  unique,
  safeFocus,
} from "./utils.js";
import { registry } from "./sprite.js";
import { data } from "./data.js";
import { store } from "./store.js";
import { router } from "./router.js";
import { toast } from "./toast.js";
import { stage } from "./stage.js";

const state = {
  open: false,
  query: "",
  items: [],
  activeIndex: 0,
  lastFocused: null,
  dom: null,
};

export function init() {
  buildDOM();
  wireKeyboard();
  router.onChange(() => {
    if (state.open) close();
  });
}

export function openPalette(initialQuery = "") {
  if (state.open) return;
  state.open = true;
  state.query = initialQuery;
  state.activeIndex = 0;
  state.lastFocused = document.activeElement;
  state.dom.root.hidden = false;
  requestAnimationFrame(() => {
    state.dom.root.classList.add("is-open");
    state.dom.input.value = initialQuery;
    safeFocus(state.dom.input);
    refresh();
  });
}

export function close() {
  if (!state.open) return;
  state.open = false;
  state.dom.root.classList.remove("is-open");
  setTimeout(() => {
    state.dom.root.hidden = true;
  }, 180);
  if (state.lastFocused && document.contains(state.lastFocused))
    safeFocus(state.lastFocused);
}

export function toggle() {
  state.open ? close() : openPalette();
}
export function isOpen() {
  return state.open;
}

function buildDOM() {
  const root = el("div", {
    cls: "palette",
    attrs: {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Command palette",
    },
    hidden: true,
  });
  const scrim = el("div", { cls: "palette__scrim", on: { click: close } });
  const panel = el("div", { cls: "palette__panel" });

  const inputWrap = el(
    "div",
    { cls: "palette__inputwrap" },
    el("span", {
      cls: "palette__searchicon",
      html: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none"
        stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
        aria-hidden="true"><circle cx="11" cy="11" r="7"/>
        <path d="m20 20-3.6-3.6"/></svg>`,
    }),
    el("input", {
      cls: "palette__input",
      attrs: {
        type: "text",
        placeholder: "Search icons, pages, categories…",
        autocomplete: "off",
        spellcheck: "false",
        "aria-label": "Command input",
      },
      on: {
        input: debounce(() => {
          state.query = state.dom.input.value;
          state.activeIndex = 0;
          refresh();
        }, TIMING.paletteDebounce),
        keydown: onInputKeydown,
      },
    }),
    el("kbd", { cls: "palette__esc", text: "esc" }),
  );

  const list = el("div", {
    cls: "palette__list",
    attrs: { role: "listbox", "aria-label": "Palette results" },
    on: {
      mousemove: (e) => {
        const row = e.target.closest?.("[data-index]");
        if (!row) return;
        const idx = Number(row.dataset.index);
        if (idx !== state.activeIndex) {
          state.activeIndex = idx;
          paintActive();
        }
      },
      click: (e) => {
        const row = e.target.closest?.("[data-index]");
        if (!row) return;
        const idx = Number(row.dataset.index);
        const item = state.items[idx];
        if (item) runItem(item);
      },
    },
  });

  const footer = el(
    "div",
    { cls: "palette__footer" },
    hint("↑↓", "Navigate"),
    hint("↵", "Open"),
    hint("esc", "Close"),
    hint("⌘K", "Toggle"),
  );

  panel.append(inputWrap, list, footer);
  root.append(scrim, panel);
  document.body.appendChild(root);
  state.dom = { root, panel, input: inputWrap.querySelector("input"), list };
}

function hint(key, label) {
  return el(
    "span",
    { cls: "palette__hint" },
    el("kbd", { text: key }),
    el("span", { text: label }),
  );
}

function wireKeyboard() {
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      toggle();
      return;
    }
    if (state.open && e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
}

function onInputKeydown(e) {
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      move(1);
      break;
    case "ArrowUp":
      e.preventDefault();
      move(-1);
      break;
    case "Home":
      e.preventDefault();
      state.activeIndex = 0;
      paintActive();
      scrollActiveIntoView();
      break;
    case "End":
      e.preventDefault();
      state.activeIndex = Math.max(0, state.items.length - 1);
      paintActive();
      scrollActiveIntoView();
      break;
    case "Enter": {
      e.preventDefault();
      const item = state.items[state.activeIndex];
      if (item) runItem(item);
      break;
    }
    case "Tab":
      e.preventDefault();
      move(e.shiftKey ? -1 : 1, { byGroup: true });
      break;
    case "Backspace":
      if (!state.dom.input.value) {
        e.preventDefault();
        close();
      }
      break;
  }
}

function move(delta, { byGroup = false } = {}) {
  if (!state.items.length) return;
  if (byGroup) {
    const groups = unique(state.items.map((i) => i.group));
    const current = state.items[state.activeIndex];
    const gi = groups.indexOf(current.group);
    let target = gi + delta;
    if (target < 0) target = groups.length - 1;
    if (target >= groups.length) target = 0;
    const targetGroup = groups[target];
    const idx = state.items.findIndex((i) => i.group === targetGroup);
    state.activeIndex = idx === -1 ? 0 : idx;
  } else {
    state.activeIndex =
      (state.activeIndex + delta + state.items.length) % state.items.length;
  }
  paintActive();
  scrollActiveIntoView();
}

function refresh() {
  const query = state.query.trim();
  const groups = buildGroups(query);
  const flat = [];
  for (const g of groups) {
    for (const item of g.items)
      flat.push({ ...item, group: g.id, groupLabel: g.label });
  }
  state.items = flat;
  if (state.activeIndex >= flat.length) state.activeIndex = 0;
  paint(groups, flat);
}

function buildGroups(query) {
  const q = query.toLowerCase();
  const groups = [];

  if (!q) {
    const recent = store.paletteRecent.all().slice(0, 6);
    const recentItems = recent.map((id) => itemFromId(id)).filter(Boolean);
    if (recentItems.length)
      groups.push({ id: "recent", label: "Recent", items: recentItems });
  }

  const commandItems = PALETTE_COMMANDS.map((cmd) => ({
    id: `cmd:${cmd.id}`,
    kind: "command",
    icon: cmd.icon,
    label: cmd.label,
    subtitle: cmd.subtitle,
    keywords: cmd.keywords || [],
    run: () => executeCommand(cmd),
  })).filter((it) => matchItem(it, q));
  if (commandItems.length)
    groups.push({ id: "commands", label: "Commands", items: commandItems });

  if (q) {
    const pages = [
      { path: "/", label: "Home", subtitle: "Icon grid" },
      { path: "/categories", label: "Categories", subtitle: "Browse by topic" },
      { path: "/varieties", label: "Varieties", subtitle: "Compare styles" },
      {
        path: "/bookmarks",
        label: "Bookmarks",
        subtitle: "Your starred icons",
      },
      { path: "/collections", label: "Collections", subtitle: "Named groups" },
    ];
    const pageItems = pages
      .map((p) => ({
        id: `page:${p.path}`,
        kind: "page",
        icon: "compass",
        label: p.label,
        subtitle: p.subtitle,
        keywords: [p.path],
        run: () => router.go(p.path),
      }))
      .filter((it) => matchItem(it, q));
    if (pageItems.length)
      groups.push({ id: "pages", label: "Pages", items: pageItems });

    const catItems = data
      .categories()
      .filter((c) => matchString(c.label, q) || matchString(c.key, q))
      .slice(0, UI.paletteMaxPerGroup)
      .map((c) => ({
        id: `cat:${c.key}`,
        kind: "category",
        icon: c.icon,
        label: c.label,
        subtitle: `${c.count} icons`,
        keywords: [c.key],
        run: () => router.go(`/categories/${c.key}`),
      }));
    if (catItems.length)
      groups.push({ id: "categories", label: "Categories", items: catItems });

    const varietyItems = data
      .varieties()
      .filter(
        (v) => v.loaded && (matchString(v.key, q) || matchString(v.label, q)),
      )
      .slice(0, UI.paletteMaxPerGroup)
      .map((v) => ({
        id: `var:${v.key}`,
        kind: "variety",
        icon: "layer-group",
        label: v.label || v.key,
        subtitle: `${v.count} icons`,
        keywords: [v.key],
        run: () => router.go(`/varieties/${v.key}`),
      }));
    if (varietyItems.length)
      groups.push({ id: "varieties", label: "Varieties", items: varietyItems });

    const collectionItems = store
      .get()
      .collections.filter((c) => matchString(c.name, q))
      .slice(0, UI.paletteMaxPerGroup)
      .map((c) => ({
        id: `col:${c.id}`,
        kind: "collection",
        icon: "folder",
        label: c.name,
        subtitle: `${c.items.length} icon${c.items.length === 1 ? "" : "s"}`,
        keywords: [c.description],
        run: () => router.go(`/collections/${c.id}`),
      }));
    if (collectionItems.length)
      groups.push({
        id: "collections",
        label: "Collections",
        items: collectionItems,
      });

    const names = data.search(q, { limit: UI.paletteMaxIcons });
    const iconItems = names.map((name) => {
      const variety = store.variety.current();
      const exists = registry.has(variety, name);
      return {
        id: `icon:${variety}:${name}`,
        kind: "icon",
        label: prettyIconName(name),
        subtitle: variety,
        variety,
        name,
        keywords: [],
        run: () => {
          if (exists) {
            const tile = findOrMakeTile(variety, name);
            stage.open({ variety, name, from: tile });
          } else {
            router.go(`/search?q=${encodeURIComponent(name)}`);
          }
        },
      };
    });
    if (iconItems.length)
      groups.push({ id: "icons", label: "Icons", items: iconItems });
  }

  return groups;
}

function matchItem(item, q) {
  if (!q) return true;
  const hay = [item.label, item.subtitle, ...(item.keywords || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return matchString(hay, q);
}

function matchString(hay, q) {
  const h = String(hay || "").toLowerCase();
  if (h.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < h.length && qi < q.length; i++) if (h[i] === q[qi]) qi++;
  return qi === q.length;
}

function paint(groups, flat) {
  const list = state.dom.list;
  if (!flat.length) {
    mount(list, emptyResults(state.query));
    return;
  }

  let runningIndex = 0;
  const nodes = [];
  for (const g of groups) {
    nodes.push(el("div", { cls: "palette__group", text: g.label }));
    for (const item of g.items) {
      const idx = runningIndex++;
      nodes.push(row(item, idx, idx === state.activeIndex));
    }
  }
  mount(list, nodes);
}

function row(item, index, active) {
  const node = el("div", {
    cls: `palette__row${active ? " is-active" : ""}${item.kind === "icon" ? " palette__row--icon" : ""}`,
    attrs: { role: "option", "aria-selected": String(active) },
    dataset: { index },
  });
  const iconHost = el("span", { cls: "palette__icon" });
  iconHost.innerHTML = iconFor(item);
  node.append(iconHost);
  node.append(
    el(
      "span",
      { cls: "palette__text" },
      el("span", { cls: "palette__label", text: item.label }),
      item.subtitle
        ? el("span", { cls: "palette__sub", text: item.subtitle })
        : null,
    ),
  );
  node.append(el("span", { cls: "palette__kind", text: kindLabel(item.kind) }));
  return node;
}

function iconFor(item) {
  if (item.kind === "icon")
    return registry.svgString(item.variety, item.name, { size: 22 }) || "";
  const name = item.icon || "circle";
  for (const v of data.varieties()) {
    if (!v.loaded) continue;
    const svg = registry.svgString(v.key, name, { size: 20 });
    if (svg) return svg;
  }
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>`;
}

function kindLabel(kind) {
  return (
    {
      command: "Action",
      page: "Page",
      category: "Category",
      variety: "Variety",
      collection: "Collection",
      icon: "Icon",
      recent: "Recent",
    }[kind] || ""
  );
}

function emptyResults(query) {
  return el(
    "div",
    { cls: "palette__empty" },
    el("span", {
      cls: "palette__empty-icon",
      html: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none"
        stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/>
        <path d="m20 20-3.6-3.6"/></svg>`,
    }),
    el("span", {
      text: query ? `No matches for “${query}”` : "Type to search",
    }),
  );
}

function paintActive() {
  const rows = state.dom.list.querySelectorAll(".palette__row");
  rows.forEach((row) => {
    const idx = Number(row.dataset.index);
    const on = idx === state.activeIndex;
    row.classList.toggle("is-active", on);
    row.setAttribute("aria-selected", String(on));
  });
}

function scrollActiveIntoView() {
  const row = state.dom.list.querySelector(".palette__row.is-active");
  if (!row) return;
  const list = state.dom.list;
  const rTop = row.offsetTop;
  const rBot = rTop + row.offsetHeight;
  const lTop = list.scrollTop;
  const lBot = lTop + list.clientHeight;
  if (rTop < lTop + 8) list.scrollTop = rTop - 8;
  else if (rBot > lBot - 8) list.scrollTop = rBot - list.clientHeight + 8;
}

function runItem(item) {
  if (!item) return;
  store.paletteRecent.push(item.id);
  close();
  requestAnimationFrame(() => {
    try {
      item.run?.();
    } catch (err) {
      console.error("[forge] palette action failed:", err);
      toast("That didn't work", { variant: "error" });
    }
  });
}

function executeCommand(cmd) {
  if (cmd.path) {
    router.go(cmd.path);
    return;
  }
  switch (cmd.action) {
    case "toggle-theme":
      store.theme.toggle();
      toast("Theme toggled");
      break;
    case "clear-recent":
      store.recent.clear();
      toast("Recent history cleared");
      break;
  }
}

function itemFromId(id) {
  if (!id || typeof id !== "string") return null;
  if (id.startsWith("cmd:")) {
    const cmd = PALETTE_COMMANDS.find((c) => `cmd:${c.id}` === id);
    if (!cmd) return null;
    return {
      id,
      kind: "command",
      icon: cmd.icon,
      label: cmd.label,
      subtitle: cmd.subtitle,
      keywords: cmd.keywords || [],
      run: () => executeCommand(cmd),
    };
  }
  if (id.startsWith("icon:")) {
    const parts = id.split(":");
    const variety = parts[1],
      name = parts.slice(2).join(":");
    if (!variety || !name || !registry.has(variety, name)) return null;
    return {
      id,
      kind: "icon",
      label: prettyIconName(name),
      subtitle: variety,
      variety,
      name,
      keywords: [],
      run: () => {
        const tile = findOrMakeTile(variety, name);
        stage.open({ variety, name, from: tile });
      },
    };
  }
  if (id.startsWith("page:")) {
    const path = id.slice(5);
    return {
      id,
      kind: "page",
      icon: "compass",
      label: path === "/" ? "Home" : path.slice(1),
      subtitle: "Page",
      keywords: [path],
      run: () => router.go(path),
    };
  }
  if (id.startsWith("cat:")) {
    const key = id.slice(4);
    const cat = data.category(key);
    if (!cat) return null;
    return {
      id,
      kind: "category",
      icon: cat.icon,
      label: cat.label,
      subtitle: `${cat.count} icons`,
      keywords: [key],
      run: () => router.go(`/categories/${key}`),
    };
  }
  if (id.startsWith("var:")) {
    const key = id.slice(4);
    const v = data.varieties().find((x) => x.key === key);
    if (!v) return null;
    return {
      id,
      kind: "variety",
      icon: "layer-group",
      label: v.label || key,
      subtitle: `${v.count} icons`,
      keywords: [key],
      run: () => router.go(`/varieties/${key}`),
    };
  }
  if (id.startsWith("col:")) {
    const cid = id.slice(4);
    const c = store.get().collections.find((x) => x.id === cid);
    if (!c) return null;
    return {
      id,
      kind: "collection",
      icon: "folder",
      label: c.name,
      subtitle: `${c.items.length} icons`,
      keywords: [c.description],
      run: () => router.go(`/collections/${cid}`),
    };
  }
  return null;
}

function findOrMakeTile(variety, name) {
  const existing = document.querySelector(
    `.tile[data-variety="${cssEsc(variety)}"][data-name="${cssEsc(name)}"]`,
  );
  if (existing) return existing;

  const ghost = document.createElement("button");
  ghost.className = "tile";
  ghost.dataset.variety = variety;
  ghost.dataset.name = name;
  ghost.style.cssText =
    "position:fixed;left:50%;top:50%;width:1px;height:1px;" +
    "opacity:0;pointer-events:none;transform:translate(-50%,-50%)";
  ghost.innerHTML = registry.svgString(variety, name, { size: 26 });
  document.body.appendChild(ghost);
  setTimeout(() => ghost.remove(), 1200);
  return ghost;
}

function cssEsc(s) {
  return String(s).replace(/(["\\])/g, "\\$1");
}
