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

/* ============================================================
   STYLE NAV
   ============================================================ */
function renderStyleNav() {
  if (!stylenavEl) return;

  const varieties = data.varieties();
  const items = varieties.map((v) => {
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

    chip.addEventListener("click", () => {
      if (!v.available) return;
      const current = store.variety.current();

      if (current === v.key) {
        // Same chip — still navigate to the canonical URL if we
        // aren't already there.
        const r = router.current();
        if (r?.name !== "variety" || r?.params?.key !== v.key) {
          router.go(`/varieties/${v.key}`);
        }
        return;
      }

      store.variety.set(v.key);

      const r = router.current();
      if (r?.name === "variety") {
        router.go(`/varieties/${v.key}`);
      } else {
        // Fragment transition — spinner shows, view re-renders.
        router.refresh();
      }
    });

    return chip;
  });

  mount(stylenavEl, items);
  syncStyleNav(store.variety.current());
  queueMicrotask(() => scrollActiveIntoView("instant"));
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