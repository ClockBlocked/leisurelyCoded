




/* ============================================================
   ICON FORGE — js/toast.js
   Small, dependency-free toast utility.
   Uses the DOM nodes already present in index.html:
     #toast  (container)
     #toastMsg (text node)
   ============================================================ */

import { TIMING } from "./config.js";

let hostEl = null;
let msgEl  = null;
let timer  = null;

export const toast = Object.assign(
  /* callable */ (message, opts = {}) => show(message, opts),
  {
    init,
    show,
    hide,
    success: (msg) => show(msg, { variant: "success" }),
    error:   (msg) => show(msg, { variant: "error" }),
  }
);

/* ------------------------------------------------------------
   INIT
   ------------------------------------------------------------ */
function init() {
  hostEl = document.getElementById("toast");
  msgEl  = document.getElementById("toastMsg");
  if (!hostEl) console.warn("[forge] toast host missing");
}

/* ------------------------------------------------------------
   SHOW / HIDE
   ------------------------------------------------------------ */
function show(message, { variant = "success", duration = TIMING.toast } = {}) {
  if (!hostEl || !msgEl) return;

  msgEl.textContent = String(message ?? "");
  hostEl.classList.toggle("is-error", variant === "error");
  hostEl.classList.add("is-show");

  clearTimeout(timer);
  timer = setTimeout(() => hide(), duration);
}

function hide() {
  if (!hostEl) return;
  hostEl.classList.remove("is-show");
  clearTimeout(timer);
  timer = null;
}