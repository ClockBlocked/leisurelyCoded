/* ============================================================
   modules/progress.js
   ============================================================ */

import { TIMING } from "./config.js";

const MIN_VISIBLE = 180;
const MAX_AT_HOLD = 0.92;
const START_AT = 0.08;

let hostEl = null;
let barEl = null;
let visible = false;
let active = false;
let value = 0;
let trickleTimer = null;
let startAt = 0;

export const progress = {
  init() {
    hostEl = document.getElementById("progress");
    barEl = document.getElementById("progressBar");
  },

  start() {
    if (!hostEl || !barEl || active) return;
    active = true;
    value = START_AT;
    startAt = performance.now();
    hostEl.classList.remove("is-complete");
    hostEl.classList.add("is-active");
    visible = true;
    paint();
    scheduleTrickle();
  },

  set(v) {
    if (!active) return;
    const target = clamp01(v) * MAX_AT_HOLD;
    if (target > value) value = target;
    paint();
  },

  bump(by = 0.05) {
    if (!active) return;
    value = Math.min(MAX_AT_HOLD, value + by);
    paint();
  },

  finish() {
    if (!active) return Promise.resolve();
    active = false;
    const sinceStart = performance.now() - startAt;
    const wait = Math.max(0, MIN_VISIBLE - sinceStart);

    return new Promise((resolve) => {
      setTimeout(() => {
        value = 1;
        paint(true);
        if (trickleTimer) {
          clearInterval(trickleTimer);
          trickleTimer = null;
        }
        hostEl.classList.add("is-complete");
        setTimeout(() => {
          hostEl.classList.remove("is-active", "is-complete");
          visible = false;
          value = 0;
          paint();
          resolve();
        }, TIMING.progressFinish + 200);
      }, wait);
    });
  },

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

  isActive() {
    return visible;
  },
};

function paint() {
  if (!barEl) return;
  barEl.style.width = Math.round(value * 100) + "%";
}

function scheduleTrickle() {
  if (trickleTimer) clearInterval(trickleTimer);
  trickleTimer = setInterval(() => {
    if (!active) return;
    const remaining = MAX_AT_HOLD - value;
    if (remaining <= 0.005) return;
    value = Math.min(MAX_AT_HOLD, value + Math.max(0.002, remaining * 0.08));
    paint();
  }, TIMING.progressTick);
}

function clamp01(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
