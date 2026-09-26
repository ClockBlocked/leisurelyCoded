




/* ============================================================
   ICON FORGE — js/progress.js
   The 3px top loading bar. Driven by full-page transitions.

   Usage:
     progress.start()               // begin
     progress.set(0.42)             // 0..1
     progress.bump()                // nudge forward a bit
     progress.finish()              // ease to 100% and fade out
     progress.track(promise)        // auto-start/finish around a promise

   Behaviour:
   - Holds at 90% until finish() is called, then jumps to 100%.
   - Increments in a "trickle" pattern so it never feels frozen.
   - Debounces its own visibility: quick ops (<120ms) don't flash it.
   ============================================================ */

import { TIMING } from "./config.js";
import { log } from "./utils.js";

const MIN_VISIBLE = 180;   // ms — don't flash for super-fast ops
const MAX_AT_HOLD = 0.92;  // stop trickling at 92%
const START_AT = 0.08;

let hostEl = null;
let barEl = null;

let visible = false;
let active = false;
let value = 0;
let target = 0;
let trickleTimer = null;
let finishedAt = 0;
let startAt = 0;

/* ============================================================
   PUBLIC
   ============================================================ */
export const progress = {
  /** Wire the DOM once at boot. */
  init() {
    hostEl = document.getElementById("progress");
    barEl = document.getElementById("progressBar");
    if (!hostEl || !barEl) {
      log.warn("progress bar elements not found");
    }
  },

  /** Begin a transition. Safe to call multiple times. */
  start() {
    if (!hostEl || !barEl) return;
    if (active) {
      // Already running — just reset toward hold state so we
      // don't visually restart mid-flight.
      target = Math.min(target, MAX_AT_HOLD);
      return;
    }

    active = true;
    value = START_AT;
    target = START_AT;
    startAt = performance.now();
    finishedAt = 0;

    hostEl.classList.remove("is-complete");
    hostEl.classList.add("is-active");
    visible = true;

    paint();
    scheduleTrickle();
  },

  /** Set progress to a definite value (0..1). */
  set(v) {
    if (!active) return;
    target = clamp01(v) * MAX_AT_HOLD;
    if (target > value) value = target;
    paint();
  },

  /** Nudge forward. */
  bump(by = 0.05) {
    if (!active) return;
    target = Math.min(MAX_AT_HOLD, value + by);
    if (target > value) value = target;
    paint();
  },

  /** Complete, then hide. Resolves after the fade-out. */
  finish() {
    if (!active) return Promise.resolve();
    active = false;
    finishedAt = performance.now();

    const sinceStart = finishedAt - startAt;
    const wait = Math.max(0, MIN_VISIBLE - sinceStart);

    return new Promise((resolve) => {
      setTimeout(() => {
        // Jump to 100%
        value = 1;
        target = 1;
        paint(true);

        if (trickleTimer) {
          clearInterval(trickleTimer);
          trickleTimer = null;
        }

        hostEl.classList.add("is-complete");

        const fadeTime = TIMING.progressFinish + 220;
        setTimeout(() => {
          hostEl.classList.remove("is-active", "is-complete");
          visible = false;
          value = 0;
          target = 0;
          paint();
          resolve();
        }, fadeTime);
      }, wait);
    });
  },

  /**
   * Convenience: wrap a promise in start/finish.
   *   await progress.track(doWork())
   */
  async track(promise) {
    progress.start();
    try {
      const out = await promise;
      await progress.finish();
      return out;
    } catch (err) {
      await progress.finish();
      throw err;
    }
  },

  /** True if visible. */
  isActive() {
    return visible;
  },
};

/* ============================================================
   INTERNAL
   ============================================================ */
function paint(force = false) {
  if (!barEl) return;
  const pct = Math.round(value * 100);
  barEl.style.width = pct + "%";

  if (force) {
    barEl.style.transition =
      `width ${TIMING.progressEase}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    // Restore default transition next tick
    requestAnimationFrame(() => {
      barEl.style.transition = "";
    });
  }
}

function scheduleTrickle() {
  if (trickleTimer) clearInterval(trickleTimer);
  trickleTimer = setInterval(() => {
    if (!active) return;
    // Diminishing returns: the closer to MAX_AT_HOLD, the slower.
    const remaining = MAX_AT_HOLD - value;
    if (remaining <= 0.005) return;
    const step = Math.max(0.002, remaining * 0.08);
    value = Math.min(MAX_AT_HOLD, value + step);
    paint();
  }, TIMING.progressTick);
}

function clamp01(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}