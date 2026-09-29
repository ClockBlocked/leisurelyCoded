/* ============================================================
   ICON FORGE — js/chrome.js
   Renders and maintains the two sticky nav bars:

     • Top nav     → page-level routes (Home, Categories,
                     Varieties, Bookmarks, Collections)
     • Style nav   → variety chips (Solid, Sharp, Duotone…)

   Also wires:
     • The bookmark counter pill (with pop animation)
     • A ⌘K palette hint button in the top bar
     • Active-state sync with the router
     • Horizontal scroll-into-view for the active style chip
   ============================================================ */

import { el, mount, log } from "./utils.js";
import { data }   from "./data.js";
import { store }  from "./store.js";
import { router } from "./router.js";
import { toggle as togglePalette } from "./palette.js";

import { VARIETY_GROUPS, VARIETY_GROUP_LABELS } from "./config.js";

/* ============================================================
   DOM REFS
   ============================================================ */
let topnavEl;
let stylenavEl;
let bookmarkPillEl;

/* ============================================================
   PUBLIC
   ============================================================ */
export const chrome = {
  init() {
    topnavEl       = document.getElementById("topnav");
    stylenavEl     = document.getElementById("stylenav");
    bookmarkPillEl = document.getElementById("bookmarkCount");

    if (!topnavEl)  log.warn("topnav missing");
    if (!stylenavEl) log.warn("stylenav missing");

    renderTopNav();
    renderStyleNav();
    syncBookmarkPill(store.bookmark.all().length);
    wirePaletteHint();

    // Store → chrome sync
    store.subscribe((s, patch) => {
      if ("variety" in patch) syncStyleNav(s.variety);
      if ("bookmarks" in patch) {
        syncBookmarkPill(s.bookmarks.length);
        bouncePill();
      }
    });

    // Router → top-nav sync
    router.onChange((route) => syncTopNav(route));

    // Ensure the active style chip is visible on first paint.
    queueMicrotask(() => scrollActiveIntoView("instant"));
  },
};

/* ============================================================
   TOP NAV
   ============================================================ */
const TOP_LINKS = [
  {
    label: "Home",
    path: "/",
    match: ["home", "category", "variety", "search", "collection"],
  },
  { label: "Categories",  path: "/categories",  match: ["categories"] },
  { label: "Varieties",   path: "/varieties",   match: ["varieties"] },
  { label: "Bookmarks",   path: "/bookmarks",   match: ["bookmarks"] },
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
      a.append(el("span", {
        cls: "pill",
        attrs: { id: "bookmarkCount" },
        text: "0",
      }));
    }
    return a;
  });

  mount(topnavEl, items);
  bookmarkPillEl = document.getElementById("bookmarkCount");
}

function syncTopNav(route) {
  if (!topnavEl) return;

  const links = topnavEl.querySelectorAll(".topnav__link");
  links.forEach((a) => {
    const matches = (a.dataset.match || "").split("|");
    const isActive = matches.includes(route.name);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}



function renderStyleNav() {
  if (!stylenavEl) return;

  const varieties = data.varieties();
  const byKey = Object.fromEntries(varieties.map((v) => [v.key, v]));

  // Split into primary (visible) and secondary (behind "More")
  const primary = varieties.filter((v) => v.primary !== false && isPrimary(v.key));
  const secondary = varieties.filter((v) => !primary.includes(v));

  const items = primary.map((v) => makeStyleChip(v));

  if (secondary.length) {
    items.push(makeMoreStylesButton(secondary, byKey));
  }

  mount(stylenavEl, items);
  syncStyleNav(store.variety.current());
  queueMicrotask(() => scrollActiveIntoView("instant"));
}

function isPrimary(key) {
  const coreAndSharp = [
    ...VARIETY_GROUPS.core,
    "sharp-solid",
    "sharp-regular",
  ];
  return coreAndSharp.includes(key);
}

function makeStyleChip(v) {
  const label = v.label || prettyVariety(v.key);
  const chip = el("button", {
    cls: "stylechip",
    type: "button",
    dataset: { variety: v.key },
    attrs: {
      "aria-pressed": "false",
      title: v.available
        ? `${v.count} icons in ${label}`
        : `${label} — unavailable`,
      disabled: v.available ? null : true,
    },
    style: v.available ? null : { opacity: "0.4", cursor: "not-allowed" },
  },
    el("span", { cls: "stylechip__dot" }),
    el("span", { text: label }),
    el("span", { cls: "stylechip__count", text: String(v.count) }),
  );

  chip.addEventListener("click", () => activateVariety(v));
  return chip;
}

function activateVariety(v) {
  if (!v.available) return;
  const current = store.variety.current();

  if (current === v.key) {
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

function makeMoreStylesButton(secondary, byKey) {
  const btn = el("button", {
    cls: "stylechip stylechip--more",
    type: "button",
    attrs: { "aria-haspopup": "menu", "aria-expanded": "false" },
  },
    el("span", { text: "More styles" }),
    el("span", { cls: "stylechip__count", text: String(secondary.length) }),
  );

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openMoreMenu(btn, secondary, byKey);
  });

  return btn;
}

let moreMenuEl = null;

function openMoreMenu(anchor, varieties, byKey) {
  closeMoreMenu();

  const menu = el("div", { cls: "more-menu", attrs: { role: "menu" } });
  const groups = Object.entries(VARIETY_GROUPS);

  for (const [groupId, keys] of groups) {
    if (groupId === "core") continue; // already shown as primary
    const inGroup = varieties.filter((v) => keys.includes(v.key));
    if (!inGroup.length) continue;

    menu.append(el("div", { cls: "more-menu__group", text:
      VARIETY_GROUP_LABELS[groupId] || groupId }));

    for (const v of inGroup) {
      const item = el("button", {
        cls: "more-menu__item",
        type: "button",
        attrs: { role: "menuitem" },
        on: {
          click: () => {
            closeMoreMenu();
            activateVariety(v);
          },
        },
      },
        el("span", { cls: "more-menu__dot" }),
        el("span", { cls: "more-menu__label", text: v.label || v.key }),
        el("span", { cls: "more-menu__count", text: String(v.count) }),
      );
      menu.append(item);
    }
  }

  // Position under the anchor.
  const rect = anchor.getBoundingClientRect();
  menu.style.position = "fixed";
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;
  menu.style.zIndex = "200";

  document.body.appendChild(menu);
  moreMenuEl = menu;
  anchor.setAttribute("aria-expanded", "true");

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", onDocClick, { once: true });
  }, 0);

  function onDocClick(e) {
    if (moreMenuEl && !moreMenuEl.contains(e.target)) {
      closeMoreMenu();
    } else {
      document.addEventListener("click", onDocClick, { once: true });
    }
  }
}

function closeMoreMenu() {
  moreMenuEl?.remove();
  moreMenuEl = null;
  document.querySelectorAll(".stylechip--more[aria-expanded='true']")
    .forEach((n) => n.setAttribute("aria-expanded", "false"));
}





function syncStyleNav(activeVariety) {
  if (!stylenavEl) return;
  stylenavEl.querySelectorAll(".stylechip").forEach((chip) => {
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

/* ============================================================
   BOOKMARK PILL
   ============================================================ */
function syncBookmarkPill(count) {
  if (!bookmarkPillEl) bookmarkPillEl = document.getElementById("bookmarkCount");
  if (!bookmarkPillEl) return;

  bookmarkPillEl.textContent = String(count);
  bookmarkPillEl.style.display = count > 0 ? "" : "none";
}

function bouncePill() {
  if (!bookmarkPillEl) return;
  bookmarkPillEl.classList.remove("is-pop");
  void bookmarkPillEl.offsetWidth; // force reflow to restart animation
  bookmarkPillEl.classList.add("is-pop");
  setTimeout(() => bookmarkPillEl?.classList.remove("is-pop"), 520);
}

/* ============================================================
   PALETTE HINT BUTTON
   ------------------------------------------------------------
   A small floating button in the top bar that opens ⌘K. Also
   serves as a discovery affordance for keyboard-less users.
   ============================================================ */
function wirePaletteHint() {
  const tools = document.querySelector(".topbar__tools");
  if (!tools) return;
  if (tools.querySelector(".palette-hint")) return; // idempotent

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
    <span style="display:inline-flex;align-items:center;gap:6px">
      Search
      <kbd>⌘K</kbd>
    </span>
  `;

  // Insert before the theme button.
  const themeBtn = tools.querySelector("#themeBtn");
  if (themeBtn) tools.insertBefore(btn, themeBtn);
  else tools.appendChild(btn);
}

/* ============================================================
   UTIL
   ============================================================ */
function prettyVariety(key) {
  return key.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

/* ============================================================
   Exposed for external triggers
   ============================================================ */
export function scrollToActiveVariety() {
  scrollActiveIntoView("smooth");
}