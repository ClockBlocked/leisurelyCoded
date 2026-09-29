/* ============================================================
   modules/spinner.js
   ============================================================ */

import { TIMING } from "./config.js";

let hostEl = null;
let textEl = null;
let shownAt = 0;
let hideTimer = null;
let showing = false;

export const spinner = {
  init() {
    hostEl = document.getElementById("spinner");
    textEl = document.getElementById("loaderText");
  },

  show(label) {
    if (!hostEl) return;
    if (label != null && textEl) textEl.textContent = String(label);
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (showing) return;
    hostEl.hidden = false;
    showing = true;
    shownAt = performance.now();
  },

  hide() {
    if (!hostEl || !showing) return Promise.resolve();
    const elapsed = performance.now() - shownAt;
    const wait = Math.max(0, TIMING.spinnerMin - elapsed);
    return new Promise((resolve) => {
      hideTimer = setTimeout(() => {
        hideTimer = null;
        hostEl.hidden = true;
        showing = false;
        resolve();
      }, wait);
    });
  },

  async wrap(work, label) {
    spinner.show(label);
    try {
      const value = typeof work === "function" ? await work() : await work;
      await spinner.hide();
      return value;
    } catch (err) {
      await spinner.hide();
      throw err;
    }
  },

  isVisible() { return showing; },
};