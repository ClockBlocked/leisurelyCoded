/* ============================================================
   modules/toast.js
   ============================================================ */

import { TIMING } from "./config.js";

let hostEl = null;
let msgEl = null;
let timer = null;

export function init() {
  hostEl = document.getElementById("toast");
  msgEl = document.getElementById("toastMsg");
}

export function show(message, { variant = "success", duration = TIMING.toast } = {}) {
  if (!hostEl || !msgEl) init();
  if (!hostEl || !msgEl) return;

  msgEl.textContent = String(message ?? "");
  hostEl.classList.toggle("is-error", variant === "error");
  hostEl.classList.add("is-show");

  clearTimeout(timer);
  timer = setTimeout(hide, duration);
}

export function hide() {
  if (!hostEl) return;
  hostEl.classList.remove("is-show");
  clearTimeout(timer);
  timer = null;
}

export const toast = Object.assign(
  (message, opts = {}) => show(message, opts),
  { init, show, hide, success: (m) => show(m), error: (m) => show(m, { variant: "error" }) }
);