




/* ============================================================
   ICON FORGE — js/spinner.js
   Fragment-level loading overlay.

   A blurred panel with a rotating SVG ring. Used for
   "partial" navigations: switching variety, applying a filter,
   running a search, opening a category from within a page, etc.

   Usage:
     spinner.show("Switching variety…")
     await spinner.hide()
     spinner.wrap(promise, "Searching…")   // one-shot
   ============================================================ */

import { TIMING } from "./config.js";
import { log } from "./utils.js";

let hostEl = null;
let textEl = null;

let shownAt = 0;
let hideTimer = null;
let showing = false;

/* ============================================================
   PUBLIC
   ============================================================ */
export const spinner = {
  /** Wire the DOM once at boot. */
  init() {
    hostEl = document.getElementById("spinner");
    textEl = document.getElementById("loaderText");
    if (!hostEl) log.warn("spinner overlay element not found");
    if (!textEl) log.warn("spinner text element not found");
  },

  /** Show the overlay with an optional label. Idempotent. */
  show(label) {
    if (!hostEl) return;

    if (label != null && textEl) textEl.textContent = String(label);

    // Cancel any pending hide so a rapid re-show doesn't flash off.
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    if (showing) return;
    hostEl.hidden = false;
    showing = true;
    shownAt = performance.now();
  },

  /** Hide after (at least) the minimum display time. */
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

  /** One-shot wrapper around a promise or an async fn. */
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

  /**
   * Simulate a fragment transition: hold the spinner for at
   * least `delay` ms while running `work`.
   */
  async transition(delay, work, label) {
    spinner.show(label);
    const [value] = await Promise.all([
      typeof work === "function" ? work() : Promise.resolve(work),
      new Promise((r) => setTimeout(r, delay)),
    ]);
    await spinner.hide();
    return value;
  },

  isVisible() {
    return showing;
  },
};