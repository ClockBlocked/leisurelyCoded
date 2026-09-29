/* ============================================================
   modules/theme.js
   ============================================================ */

import { store } from "./store.js";

let btn = null;
let label = null;

export function init() {
  btn = document.getElementById("themeBtn");
  label = document.getElementById("themeLabel");

  apply(store.theme.current(), { silent: true });

  btn?.addEventListener("click", () => {
    store.theme.toggle();
    apply(store.theme.current());
  });

  store.subscribe((s, patch) => {
    if ("theme" in patch) apply(s.theme);
  });
}

function apply(name) {
  const root = document.documentElement;
  const next = name === "light" ? "light" : "dark";
  root.dataset.theme = next;
  if (label) label.textContent = next === "light" ? "Dark" : "Light";
  btn?.setAttribute("aria-pressed", next === "light" ? "true" : "false");
}

export const theme = { init, current: () => store.theme.current(), set: (n) => { store.theme.set(n); apply(n); } };