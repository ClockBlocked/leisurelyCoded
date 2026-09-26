




/* ============================================================
   ICON FORGE — js/theme.js
   Theme controller: mirrors the store's theme onto
   <html data-theme="…">, updates the top-bar label, and wires
   the toggle button. Also reacts to OS-level preference
   changes ONLY when the user hasn't picked a theme.
   ============================================================ */

import { UI } from "./config.js";
import { $ } from "./utils.js";
import { store } from "./store.js";

let btn = null;
let label = null;
const mql = window.matchMedia("(prefers-color-scheme: light)");

/* ------------------------------------------------------------
   PUBLIC
   ------------------------------------------------------------ */
export const theme = {
  init() {
    btn   = document.getElementById("themeBtn");
    label = document.getElementById("themeLabel");

    apply(store.theme.current(), { silent: true });

    // Toggle
    btn?.addEventListener("click", () => {
      store.theme.toggle();
      apply(store.theme.current());
    });

    // Store → DOM sync
    store.subscribe((s, patch) => {
      if ("theme" in patch) apply(s.theme);
    });

    // OS preference — only adopted if the user has never chosen.
    mql.addEventListener?.("change", (e) => {
      const hasExplicit = !!localStorage.getItem("iconforge.theme.v1");
      if (hasExplicit) return;
      const next = e.matches ? "light" : "dark";
      store.theme.set(next);
      apply(next);
    });
  },

  current() {
    return store.theme.current();
  },

  set(name) {
    store.theme.set(name);
    apply(name);
  },
};

/* ------------------------------------------------------------
   APPLY
   ------------------------------------------------------------ */
function apply(name, { silent = false } = {}) {
  const root = document.documentElement;
  const next = name === "light" ? "light" : "dark";

  root.dataset.theme = next;

  // Label shows what clicking will switch TO.
  if (label) label.textContent = next === "light" ? "Dark" : "Light";

  // aria-pressed is a nice touch on the toggle button.
  btn?.setAttribute("aria-pressed", next === "light" ? "true" : "false");

  if (!silent) {
    // Give the browser a frame to commit the new tokens before
    // anything heavy runs (prevents a flash of stale colors).
    requestAnimationFrame(() => {});
  }
}