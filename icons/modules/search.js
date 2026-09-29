/* ============================================================
   modules/search.js
   ============================================================ */

import { TIMING } from "./config.js";
import { debounce, log } from "./utils.js";
import { router } from "./router.js";

let input;
let form;

export const search = {
  init() {
    input = document.getElementById("searchInput");
    form = input?.closest("form");
    if (!input) { log.warn("search input missing"); return; }

    const navigate = debounce(() => pushQuery(input.value.trim()), TIMING.searchDebounce);
    input.addEventListener("input", navigate);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); pushQuery(input.value.trim(), { immediate: true }); }
      else if (e.key === "Escape") {
        e.preventDefault();
        if (input.value) { input.value = ""; pushQuery("", { immediate: true }); }
        else input.blur();
      }
    });

    form?.addEventListener("submit", (e) => e.preventDefault());

    document.addEventListener("keydown", (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      const tag = t?.tagName?.toLowerCase?.();
      const isTyping = tag === "input" || tag === "textarea" || t?.isContentEditable;
      if (isTyping) return;
      e.preventDefault();
      input.focus();
      input.select?.();
    });

    router.onChange((route) => {
      const q = route?.query?.q ?? "";
      if (input.value !== q) input.value = q;
    });

    queueMicrotask(() => {
      const r = router.current();
      const q = r?.query?.q ?? "";
      if (q) input.value = q;
    });
  },

  focus() { input?.focus(); input?.select?.(); },
  value() { return input?.value ?? ""; },
};

function pushQuery(q, { immediate = false } = {}) {
  const trimmed = String(q || "").trim();
  const target = trimmed ? `#/search?q=${encodeURIComponent(trimmed)}` : "#/search";
  const current = location.hash || "#/";

  if (current === target) return;
  if (!trimmed && !current.startsWith("#/search")) return;

  if (immediate) location.hash = target;
  else {
    if (current.startsWith("#/search")) {
      const url = location.pathname + location.search + target;
      history.replaceState(null, "", url);
      router.refresh();
    } else location.hash = target;
  }
}