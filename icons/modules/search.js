




/* ============================================================
   ICON FORGE — js/search.js
   The global search box that lives in the top bar.

   Behaviour:
     • Debounced input → navigates to #/search?q=…
     • Enter forces navigation immediately
     • `/` key focuses the box from anywhere (when not typing)
     • Escape clears the box and refocuses the view
     • The box's value is mirrored from the current route query
       so deep links stay consistent.
   ============================================================ */

import { TIMING } from "./config.js";
import { debounce, log, $ } from "./utils.js";
import { router } from "./router.js";

let input;
let form;

/* ============================================================
   PUBLIC
   ============================================================ */
export const search = {
  init() {
    input = document.getElementById("searchInput");
    form  = input?.closest("form");

    if (!input) {
      log.warn("search input missing");
      return;
    }

    // Debounced navigation
    const navigate = debounce(() => {
      const q = input.value.trim();
      pushQuery(q);
    }, TIMING.searchDebounce);

    input.addEventListener("input", navigate);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        pushQuery(input.value.trim(), { immediate: true });
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (input.value) {
          input.value = "";
          pushQuery("", { immediate: true });
        } else {
          input.blur();
        }
      }
    });

    // Prevent accidental form submits (if wrapped in a form)
    form?.addEventListener("submit", (e) => e.preventDefault());

    // Global "/" shortcut
    document.addEventListener("keydown", (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      const tag = t?.tagName?.toLowerCase?.();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        t?.isContentEditable;
      if (isTyping) return;
      e.preventDefault();
      input.focus();
      input.select?.();
    });

    // Route → input mirror
    router.onChange((route) => {
      const q = route?.query?.q ?? "";
      if (input.value !== q) input.value = q;
    });

    // Initial hydrate (in case the app booted on /search?q=…)
    queueMicrotask(() => {
      const r = router.current();
      const q = r?.query?.q ?? "";
      if (q) input.value = q;
    });
  },

  /** Programmatic focus. */
  focus() {
    input?.focus();
    input?.select?.();
  },

  /** Programmatic set. */
  setQuery(q, opts = {}) {
    if (!input) return;
    input.value = q;
    pushQuery(q, opts);
  },

  /** Current in-box value. */
  value() {
    return input?.value ?? "";
  },
};

/* ============================================================
   INTERNAL
   ============================================================ */
function pushQuery(q, { immediate = false } = {}) {
  const trimmed = String(q || "").trim();
  const target = trimmed
    ? `#/search?q=${encodeURIComponent(trimmed)}`
    : "#/search";

  const current = location.hash || "#/";

  // If we're already on /search with the same query, do nothing.
  if (current === target) return;

  // If we're NOT on /search yet and the query is empty, do nothing.
  if (!trimmed && !current.startsWith("#/search")) return;

  if (immediate) {
    location.hash = target;
  } else {
    // Use replaceState for a smoother "type and it updates" feel —
    // but only when we're already on /search, so the back button
    // doesn't fill up with every keystroke.
    if (current.startsWith("#/search")) {
      const url =
        location.pathname + location.search + target;
      history.replaceState(null, "", url);
      // Manually kick the router, since replaceState doesn't
      // fire hashchange.
      router.refresh();
    } else {
      location.hash = target;
    }
  }
}