/* ============================================================
   modules/chrome.js
   ============================================================ */

import { el, mount, log } from "./utils.js";
import { data, invalidate } from "./data.js";
import { store } from "./store.js";
import { router } from "./router.js";
import { registry } from "./sprite.js";
import { toast } from "./toast.js";
import { toggle as togglePalette } from "./palette.js";
import { VARIETY_GROUPS, VARIETY_GROUP_LABELS, UI } from "./config.js";

let topnavEl;
let stylenavEl;
let bookmarkPillEl;

export const chrome = {
  init() {
    topnavEl = document.getElementById("topnav");
    stylenavEl = document.getElementById("stylenav");
    bookmarkPillEl = document.getElementById("bookmarkCount");

    if (!topnavEl) log.warn("topnav missing");
    if (!stylenavEl) log.warn("stylenav missing");

    renderTopNav();
    renderStyleNav();
    syncBookmarkPill(store.bookmark.all().length);
    wirePaletteHint();

    store.subscribe((s, patch) => {
      if ("variety" in patch) syncStyleNav(s.variety);
      if ("bookmarks" in patch) {
        syncBookmarkPill(s.bookmarks.length);
        bouncePill();
      }
    });

    router.onChange((route) => syncTopNav(route));
    queueMicrotask(() => scrollActiveIntoView("instant"));
  },

  refreshStyleNav() {
    renderStyleNav();
  },
};

const TOP_LINKS = [
  {
    label: "Home",
    path: "/",
    match: ["home", "category", "variety", "search", "collection"],
  },
  { label: "Categories", path: "/categories", match: ["categories"] },
  { label: "Varieties", path: "/varieties", match: ["varieties"] },
  { label: "Bookmarks", path: "/bookmarks", match: ["bookmarks"] },
  { label: "Collections", path: "/collections", match: ["collections"] },
];

function renderTopNav() {
  if (!topnavEl) return;

  const items = TOP_LINKS.map((link) => {
    const a = el("a", {
      cls: "topnav__link",
      attrs: { href: "#" + link.path, "data-route": link.path },
      dataset: { match: link.match.join("|") },
    });
    a.append(el("span", { text: link.label }));
    if (link.path === "/bookmarks") {
      a.append(
        el("span", { cls: "pill", attrs: { id: "bookmarkCount" }, text: "0" }),
      );
    }
    return a;
  });

  mount(topnavEl, items);
  bookmarkPillEl = document.getElementById("bookmarkCount");
}

function syncTopNav(route) {
  if (!topnavEl) return;
  topnavEl.querySelectorAll(".topnav__link").forEach((a) => {
    const matches = (a.dataset.match || "").split("|");
    const isActive = matches.includes(route.name);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function renderStyleNav() {
  if (!stylenavEl) return;

  const varieties = data.varieties();
  const inline = pickInlineVarieties(varieties);
  const inlineKeys = new Set(inline.map((v) => v.key));
  const tucked = varieties.filter((v) => !inlineKeys.has(v.key));

  const items = inline.map((v) => makeStyleChip(v));
  if (tucked.length) items.push(makeMoreStylesButton(tucked));

  mount(stylenavEl, items);
  syncStyleNav(store.variety.current());
  queueMicrotask(() => scrollActiveIntoView("instant"));
}

function pickInlineVarieties(varieties) {
  const manifestPrimary = varieties.filter((v) => v.primary !== false);
  const coreOrder = [...VARIETY_GROUPS.core, "sharp-solid", "sharp-regular"];
  const picked = [];
  const seen = new Set();

  for (const v of manifestPrimary) {
    if (picked.length >= UI.maxInlineChips) break;
    picked.push(v);
    seen.add(v.key);
  }

  for (const key of coreOrder) {
    if (picked.length >= UI.maxInlineChips) break;
    if (seen.has(key)) continue;
    const v = varieties.find((x) => x.key === key);
    if (v) {
      picked.push(v);
      seen.add(key);
    }
  }

  return picked.sort((a, b) => varieties.indexOf(a) - varieties.indexOf(b));
}

function makeStyleChip(v) {
  const label = v.label || prettyVariety(v.key);
  const isDisabled = !v.available && v.loaded;

  const opts = {
    cls: "stylechip",
    type: "button",
    dataset: { variety: v.key },
    attrs: {
      "aria-pressed": "false",
      title: v.available
        ? `${v.count || "…"} icons in ${label}`
        : `${label} — unavailable`,
      disabled: isDisabled ? true : null,
    },
  };

  if (isDisabled) opts.style = { opacity: "0.4", cursor: "not-allowed" };

  const chip = el(
    "button",
    opts,
    el("span", { cls: "stylechip__dot" }),
    el("span", { text: label }),
    el("span", {
      cls: "stylechip__count",
      text: v.loaded ? String(v.count) : "·",
    }),
  );

  chip.addEventListener("click", () => activateVariety(v, chip));
  return chip;
}

async function activateVariety(v, chipEl) {
  const current = store.variety.current();
  const sameChip = current === v.key;

  if (!registry.isLoaded(v.key)) {
    if (chipEl) chipEl.classList.add("is-loading");
    try {
      await registry.ensure(v.key);
      invalidate();
      refreshChipCount(v.key);
    } catch {
      toast("Couldn't load that variety", { variant: "error" });
      if (chipEl) chipEl.classList.remove("is-loading");
      return;
    }
    if (chipEl) chipEl.classList.remove("is-loading");
  }

  if (sameChip) {
    const r = router.current();
    if (r?.name !== "variety" || r?.params?.key !== v.key) {
      router.go(`/varieties/${v.key}`);
    }
    return;
  }

  store.variety.set(v.key);
  const r = router.current();
  if (r?.name === "variety") router.go(`/varieties/${v.key}`);
  else router.refresh();
}

function refreshChipCount(key) {
  const v = data.varieties().find((x) => x.key === key);
  if (!v) return;
  const chip = stylenavEl?.querySelector(`.stylechip[data-variety="${key}"]`);
  if (chip) {
    const countEl = chip.querySelector(".stylechip__count");
    if (countEl) countEl.textContent = String(v.count);
  }
}

function syncStyleNav(activeVariety) {
  if (!stylenavEl) return;
  stylenavEl.querySelectorAll(".stylechip[data-variety]").forEach((chip) => {
    const on = chip.dataset.variety === activeVariety;
    chip.setAttribute("aria-pressed", String(on));
    chip.classList.toggle("is-active", on);
  });
}

function scrollActiveIntoView(behavior = "smooth") {
  if (!stylenavEl) return;
  const active = stylenavEl.querySelector('.stylechip[aria-pressed="true"]');
  if (!active) return;
  const { offsetLeft: aLeft, offsetWidth: aWidth } = active;
  const { scrollLeft, clientWidth } = stylenavEl;
  const aRight = aLeft + aWidth;
  const sRight = scrollLeft + clientWidth;
  if (aLeft < scrollLeft + 16 || aRight > sRight - 16) {
    const target = aLeft - clientWidth / 2 + aWidth / 2;
    try {
      stylenavEl.scrollTo({ left: target, behavior });
    } catch {
      stylenavEl.scrollLeft = target;
    }
  }
}

let moreMenuEl = null;

function makeMoreStylesButton(secondary) {
  const btn = el(
    "button",
    {
      cls: "stylechip stylechip--more",
      type: "button",
      attrs: { "aria-haspopup": "menu", "aria-expanded": "false" },
      title: `${secondary.length} more styles`,
    },
    el("span", { text: "More" }),
    el("span", { cls: "stylechip__count", text: String(secondary.length) }),
  );

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (moreMenuEl) closeMoreMenu();
    else openMoreMenu(btn, secondary);
  });
  return btn;
}

function openMoreMenu(anchor, varieties) {
  closeMoreMenu();
  const menu = el("div", { cls: "more-menu", attrs: { role: "menu" } });

  const seen = new Set();
  for (const [groupId, keys] of Object.entries(VARIETY_GROUPS)) {
    if (groupId === "core") continue;
    const inGroup = varieties.filter((v) => keys.includes(v.key));
    if (!inGroup.length) continue;
    inGroup.forEach((v) => seen.add(v.key));
    menu.append(
      el("div", {
        cls: "more-menu__group",
        text: VARIETY_GROUP_LABELS[groupId] || groupId,
      }),
    );
    for (const v of inGroup) menu.append(makeMenuItem(v));
  }

  const leftovers = varieties.filter((v) => !seen.has(v.key));
  if (leftovers.length) {
    menu.append(el("div", { cls: "more-menu__group", text: "Other styles" }));
    for (const v of leftovers) menu.append(makeMenuItem(v));
  }

  const rect = anchor.getBoundingClientRect();
  const menuWidth = 300;
  menu.style.position = "fixed";
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8))}px`;
  menu.style.width = `${menuWidth}px`;
  menu.style.zIndex = "200";

  document.body.appendChild(menu);
  moreMenuEl = menu;
  anchor.setAttribute("aria-expanded", "true");

  setTimeout(() => {
    document.addEventListener("click", onDocClick, { once: true });
  }, 0);

  function onDocClick(e) {
    if (moreMenuEl && !moreMenuEl.contains(e.target) && e.target !== anchor) {
      closeMoreMenu();
    } else {
      document.addEventListener("click", onDocClick, { once: true });
    }
  }
}

function makeMenuItem(v) {
  const active = store.variety.current() === v.key;
  const item = el(
    "button",
    {
      cls: "more-menu__item" + (active ? " is-active" : ""),
      type: "button",
      attrs: { role: "menuitem" },
    },
    el("span", { cls: "more-menu__dot" }),
    el("span", { cls: "more-menu__label", text: v.label || v.key }),
    el("span", {
      cls: "more-menu__count",
      text: v.loaded ? String(v.count) : "·",
    }),
  );
  item.addEventListener("click", () => {
    closeMoreMenu();
    activateVariety(v, null);
  });
  return item;
}

function closeMoreMenu() {
  moreMenuEl?.remove();
  moreMenuEl = null;
  document
    .querySelectorAll('.stylechip--more[aria-expanded="true"]')
    .forEach((n) => n.setAttribute("aria-expanded", "false"));
}

function syncBookmarkPill(count) {
  if (!bookmarkPillEl)
    bookmarkPillEl = document.getElementById("bookmarkCount");
  if (!bookmarkPillEl) return;
  bookmarkPillEl.textContent = String(count);
  bookmarkPillEl.style.display = count > 0 ? "" : "none";
}

function bouncePill() {
  if (!bookmarkPillEl) return;
  bookmarkPillEl.classList.remove("is-pop");
  void bookmarkPillEl.offsetWidth;
  bookmarkPillEl.classList.add("is-pop");
  setTimeout(() => bookmarkPillEl?.classList.remove("is-pop"), 520);
}

function wirePaletteHint() {
  const tools = document.querySelector(".topbar__tools");
  if (!tools) return;
  if (tools.querySelector(".palette-hint")) return;

  const btn = el("button", {
    cls: "ghost-btn palette-hint",
    type: "button",
    attrs: { "aria-label": "Open command palette (⌘K)" },
    on: { click: () => togglePalette() },
  });
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7"/>
      <path d="m20 20-3.6-3.6"/>
    </svg>
    <span>Search <kbd>⌘K</kbd></span>
  `;

  const themeBtn = tools.querySelector("#themeBtn");
  if (themeBtn) tools.insertBefore(btn, themeBtn);
  else tools.appendChild(btn);
}

function prettyVariety(key) {
  return key
    .split("-")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

export function scrollToActiveVariety() {
  scrollActiveIntoView("smooth");
}
