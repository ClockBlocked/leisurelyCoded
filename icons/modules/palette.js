/* ============================================================
   ICON FORGE — js/palette.js
   The ⌘K / Ctrl+K command palette.

   Sections (in order):
     1. Recently used        (from store.paletteRecent)
     2. Commands             (from PALETTE_COMMANDS)
     3. Pages                (built-in navigation)
     4. Categories           (from data.categories())
     5. Varieties            (from data.varieties())
     6. Collections          (from store.collections)
     7. Icons                (fuzzy match over data.allNames)

   Keyboard:
     ⌘K / Ctrl+K             open
     ↑ / ↓                   navigate
     Enter                   run highlighted
     Tab / Shift+Tab         jump groups
     Esc                     close
     Backspace on empty      close

   Public:
     palette.init()
     palette.open(initialQuery?)
     palette.close()
     palette.toggle()
     palette.isOpen()
   ============================================================ */

import {
  PALETTE_COMMANDS,
  TIMING,
  UI,
} from "./config.js";
import {
  el, mount, debounce, prettyIconName, slug, unique, safeFocus,
} from "./utils.js";
import { registry } from "./sprite.js";
import { data }     from "./data.js";
import { store }    from "./store.js";
import { router }   from "./router.js";
import { toast }    from "./toast.js";

/* ============================================================
   STATE
   ============================================================ */
const state = {
  open: false,
  query: "",
  items: [],
  activeIndex: 0,
  lastFocused: null,
  actions: Object.create(null),
  dom: null,
};

/* ============================================================
   INIT
   ============================================================ */
export function init() {
  buildDOM();
  wireKeyboard();
  wireOutsideClick();

  // Route changes should close the palette.
  router.onChange(() => {
    if (state.open) close();
  });
}

/* ============================================================
   PUBLIC
   ============================================================ */
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
    if (initialQuery) {
      const len = state.dom.input.value.length;
      try { state.dom.input.setSelectionRange(len, len); } catch {}
    }
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

  if (state.lastFocused && document.contains(state.lastFocused)) {
    safeFocus(state.lastFocused);
  } else {
    safeFocus(document.body);
  }
}

export function toggle() {
  if (state.open) close();
  else openPalette();
}

export function isOpen() {
  return state.open;
}

/* ============================================================
   DOM
   ============================================================ */
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

  const scrim = el("div", {
    cls: "palette__scrim",
    on: { click: close },
  });

  const panel = el("div", { cls: "palette__panel" });

  const inputWrap = el("div", { cls: "palette__inputwrap" },
    (() => {
      const w = el("span", { cls: "palette__searchicon", html:
        `<svg viewBox="0 0 24 24" width="17" height="17" fill="none"
          stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
          aria-hidden="true"><circle cx="11" cy="11" r="7"/>
          <path d="m20 20-3.6-3.6"/></svg>`,
      });
      return w;
    })(),
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

  const footer = el("div", { cls: "palette__footer" },
    hint("↑↓", "Navigate"),
    hint("↵", "Open"),
    hint("esc", "Close"),
    hint("⌘K", "Toggle"),
  );

  panel.append(inputWrap, list, footer);
  root.append(scrim, panel);
  document.body.appendChild(root);

  state.dom = { root, scrim, panel, input: inputWrap.querySelector("input"), list, footer };
}

function hint(key, label) {
  return el("span", { cls: "palette__hint" },
    el("kbd", { text: key }),
    el("span", { text: label }),
  );
}

/* ============================================================
   GLOBAL KEYBOARD
   ============================================================ */
function wireKeyboard() {
  document.addEventListener("keydown", (e) => {
    // ⌘K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      toggle();
      return;
    }

    // ⌘⇧P / Ctrl+Shift+P — same palette, familiar to VS Code users
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
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

function wireOutsideClick() {
  // Scrim handles it; nothing else needed.
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
    case "Enter":
      e.preventDefault();
      {
        const item = state.items[state.activeIndex];
        if (item) runItem(item);
      }
      break;
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

/* ============================================================
   REFRESH / RENDER
   ============================================================ */
function refresh() {
  const query = state.query.trim();
  const groups = buildGroups(query);

  // Flatten for keyboard navigation while keeping group headers.
  const flat = [];
  for (const g of groups) {
    for (const item of g.items) flat.push({ ...item, group: g.id, groupLabel: g.label });
  }
  state.items = flat;

  // Clamp active index.
  if (state.activeIndex >= flat.length) state.activeIndex = 0;

  // Render.
  paint(groups, flat);
}

function buildGroups(query) {
  const q = query.toLowerCase();
  const groups = [];

  /* ---- 1. Recent (only when query is empty) ---- */
  if (!q) {
    const recent = store.paletteRecent.all().slice(0, 6);
    const recentItems = recent
      .map((id) => itemFromId(id))
      .filter(Boolean);
    if (recentItems.length) {
      groups.push({ id: "recent", label: "Recent", items: recentItems });
    }
  }

  /* ---- 2. Commands ---- */
  const commandItems = PALETTE_COMMANDS
    .map((cmd) => ({
      id: `cmd:${cmd.id}`,
      kind: "command",
      icon: cmd.icon,
      label: cmd.label,
      subtitle: cmd.subtitle,
      keywords: cmd.keywords || [],
      run: () => executeCommand(cmd),
    }))
    .filter((it) => matchItem(it, q));
  if (commandItems.length) {
    groups.push({ id: "commands", label: "Commands", items: commandItems });
  }

  /* ---- 3. Pages ---- */
  const pages = [
    { path: "/",           label: "Home",        subtitle: "Icon grid" },
    { path: "/categories", label: "Categories",  subtitle: "Browse by topic" },
    { path: "/varieties",  label: "Varieties",   subtitle: "Compare styles" },
    { path: "/bookmarks",  label: "Bookmarks",   subtitle: "Your starred icons" },
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
  if (pageItems.length && q) {
    groups.push({ id: "pages", label: "Pages", items: pageItems });
  }

  /* ---- 4. Categories ---- */
  if (q || !state.query) {
    const catItems = data
      .categories()
      .filter((c) =>
        !q
          ? false
          : matchString(c.label, q) || matchString(c.key, q)
      )
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
    if (catItems.length) {
      groups.push({ id: "categories", label: "Categories", items: catItems });
    }
  }

  /* ---- 5. Varieties ---- */
  const varietyItems = data
    .varieties()
    .filter((v) => v.available && (q ? matchString(v.key, q) || matchString(v.label, q) : false))
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
  if (varietyItems.length) {
    groups.push({ id: "varieties", label: "Varieties", items: varietyItems });
  }

  /* ---- 6. Collections ---- */
  const collectionItems = store
    .get()
    .collections
    .filter((c) => (q ? matchString(c.name, q) : false))
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
  if (collectionItems.length) {
    groups.push({ id: "collections", label: "Collections", items: collectionItems });
  }

  /* ---- 7. Icons ---- */
  if (q) {
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
            // Simulate a tile click to open the stage.
            const tile = findOrMakeTile(variety, name);
            import("./stage.js").then(({ stage }) => {
              if (stage?.open) {
                stage.open({ variety, name, from: tile });
              }
            });
          } else {
            // Fall back to a search page.
            router.go(`/search?q=${encodeURIComponent(name)}`);
          }
        },
      };
    });
    if (iconItems.length) {
      groups.push({ id: "icons", label: "Icons", items: iconItems });
    }
  }

  return groups;
}

/* ============================================================
   MATCHING
   ============================================================ */
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
  // cheap fuzzy: chars in order
  let qi = 0;
  for (let i = 0; i < h.length && qi < q.length; i++) {
    if (h[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

/* ============================================================
   RENDER
   ============================================================ */
function paint(groups, flat) {
  const list = state.dom.list;
  if (!flat.length) {
    mount(list, emptyResults(state.query));
    return;
  }

  let runningIndex = 0;
  const nodes = [];

  for (const g of groups) {
    const header = el("div", { cls: "palette__group", text: g.label });
    nodes.push(header);

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

  // Icon side
  const iconHost = el("span", { cls: "palette__icon" });
  iconHost.innerHTML = iconFor(item);
  node.append(iconHost);

  // Text side
  const text = el("span", { cls: "palette__text" },
    el("span", { cls: "palette__label", text: item.label }),
    item.subtitle ? el("span", { cls: "palette__sub", text: item.subtitle }) : null,
  );
  node.append(text);

  // Kind badge
  node.append(el("span", { cls: "palette__kind", text: kindLabel(item.kind) }));

  return node;
}

function iconFor(item) {
  if (item.kind === "icon") {
    return registry.svgString(item.variety, item.name, { size: 22 }) || "";
  }
  // Try to resolve any of our own icon names for the palette.
  const name = item.icon || "circle";
  for (const v of data.varieties()) {
    if (!v.available) continue;
    const svg = registry.svgString(v.key, name, { size: 20 });
    if (svg) return svg;
  }
  // Generic fallback glyph
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8"/></svg>`;
}

function kindLabel(kind) {
  return {
    command: "Action",
    page: "Page",
    category: "Category",
    variety: "Variety",
    collection: "Collection",
    icon: "Icon",
    recent: "Recent",
  }[kind] || "";
}

function emptyResults(query) {
  return el("div", { cls: "palette__empty" },
    el("span", { cls: "palette__empty-icon", html:
      `<svg viewBox="0 0 24 24" width="24" height="24" fill="none"
        stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>`,
    }),
    el("span", { text: query ? `No matches for “${query}”` : "Type to search" }),
  );
}

/* ============================================================
   INTERACTION
   ============================================================ */
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

  // Give the palette's close animation a frame to start.
  requestAnimationFrame(() => {
    try {
      item.run?.();
    } catch (err) {
      console.error("[forge] palette action failed:", err);
      toast("That didn't work", { variant: "error" });
    }
  });
}

/* ============================================================
   COMMANDS
   ============================================================ */
function executeCommand(cmd) {
  if (cmd.path) {
    router.go(cmd.path);
    return;
  }
  switch (cmd.action) {
    case "toggle-theme": {
      store.theme.toggle();
      // theme.js already reacts; toast for feedback.
      toast("Theme toggled");
      break;
    }
    case "clear-recent": {
      store.recent.clear();
      toast("Recent history cleared");
      break;
    }
    default:
      // Unknown command — do nothing.
      break;
  }
}

/* ============================================================
   RECENT LOOKUP
   ============================================================ */
function itemFromId(id) {
  if (!id || typeof id !== "string") return null;

  // cmd:<id>
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

  // icon:<variety>:<name>
  if (id.startsWith("icon:")) {
    const [, variety, name] = id.split(":");
    if (!variety || !name) return null;
    if (!registry.has(variety, name)) return null;
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
        import("./stage.js").then(({ stage }) => {
          if (stage?.open) stage.open({ variety, name, from: tile });
        });
      },
    };
  }

  // page:/path
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

  // cat:key
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

  // var:key
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

  // col:id
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

/* ============================================================
   TILE HELPER (for FLIP origin)
   ------------------------------------------------------------
   When a palette icon is opened, we want the FLIP animation
   to originate from a real tile. If one exists in the DOM,
   use it; otherwise fabricate an off-screen tile so the
   stage's getBoundingClientRect has something to work with.
   ============================================================ */
function findOrMakeTile(variety, name) {
  const existing = document.querySelector(
    `.tile[data-variety="${cssEsc(variety)}"][data-name="${cssEsc(name)}"]`
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

  // Clean up after the animation window.
  setTimeout(() => ghost.remove(), 1200);
  return ghost;
}

function cssEsc(s) {
  return String(s).replace(/(["\\])/g, "\\$1");
}