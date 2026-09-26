




/* ============================================================
   ICON FORGE — js/chrome.js
   Renders and maintains the two sticky nav bars:

     • Top nav     → page-level routes (Home, Categories,
                     Varieties, Bookmarks)
     • Style nav   → variety chips (Solid, Sharp, Duotone…)

   Keeps the top-nav active state, the bookmark counter pill,
   and the style-nav pressed state in sync with the store and
   the router. Horizontally scrollable by default (see CSS).
   ============================================================ */

import { el, mount, log } from "./utils.js";
import { data }   from "./data.js";
import { store }  from "./store.js";
import { router } from "./router.js";
import { prettyVariety as _pv } from "./views/home.js";

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
    syncBookmarkPill(0);

    // Store → chrome sync
    store.subscribe((s, patch) => {
      if ("variety" in patch)  syncStyleNav(s.variety);
      if ("bookmarks" in patch) {
        syncBookmarkPill(s.bookmarks.length);
        bouncePill();
      }
    });

    // Router → top-nav sync
    router.onChange((route) => syncTopNav(route));

    // Keep the style-nav scrolled so the active chip is visible.
    queueMicrotask(() => scrollActiveIntoView("instant"));
  },
};

/* ============================================================
   TOP NAV
   ============================================================ */
const TOP_LINKS = [
  { label: "Home",       path: "/",           match: ["home", "category", "variety", "search"] },
  { label: "Categories", path: "/categories", match: ["categories"] },
  { label: "Varieties",  path: "/varieties",  match: ["varieties"] },
  { label: "Bookmarks",  path: "/bookmarks",  match: ["bookmarks"] },
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
    if (isActive) {
      a.setAttribute("aria-current", "page");
    } else {
      a.removeAttribute("aria-current");
    }
  });
}

/* ============================================================
   STYLE NAV
   ============================================================ */
function renderStyleNav() {
  if (!stylenavEl) return;

  const varieties = data.varieties();
  const items = varieties.map((v) => {
    const chip = el("button", {
      cls: "stylechip",
      type: "button",
      dataset: { variety: v.key },
      attrs: {
        "aria-pressed": "false",
        title: v.available
          ? `${v.count} icons in ${_pv(v.key)}`
          : `${_pv(v.key)} — unavailable`,
        disabled: v.available ? null : true,
      },
      style: v.available ? null : { opacity: "0.4", cursor: "not-allowed" },
    },
      el("span", { cls: "stylechip__dot" }),
      el("span", { text: _pv(v.key) }),
      el("span", { cls: "stylechip__count", text: String(v.count) }),
    );

    chip.addEventListener("click", () => {
      if (!v.available) return;
      const current = store.variety.current();
      if (current === v.key) {
        // Already active → still navigate to the variety page for
        // a canonical URL, but as a fragment transition.
        const r = router.current();
        if (r?.name !== "variety" || r?.params?.key !== v.key) {
          router.go(`/varieties/${v.key}`);
        }
        return;
      }
      store.variety.set(v.key);

      // If we're on a page that has a per-variety view, swap
      // through the router; otherwise just refresh.
      const r = router.current();
      if (r?.name === "variety") {
        router.go(`/varieties/${v.key}`);
      } else {
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
    if (on) chip.classList.add("is-active");
    else chip.classList.remove("is-active");
  });

  // Do not auto-scroll during initial route paint — only on user
  // actions or explicit calls.
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
  if (!bookmarkPillEl) {
    bookmarkPillEl = document.getElementById("bookmarkCount");
  }
  if (!bookmarkPillEl) return;
  bookmarkPillEl.textContent = String(count);
  bookmarkPillEl.style.display = count > 0 ? "" : "none";
}

function bouncePill() {
  if (!bookmarkPillEl) return;
  bookmarkPillEl.classList.remove("is-pop");
  // Force reflow so the animation restarts.
  void bookmarkPillEl.offsetWidth;
  bookmarkPillEl.classList.add("is-pop");
  setTimeout(() => bookmarkPillEl?.classList.remove("is-pop"), 520);
}

/* ============================================================
   Expose for external triggers (e.g. after variety click in
   home page code)
   ============================================================ */
export function scrollToActiveVariety() {
  scrollActiveIntoView("smooth");
}