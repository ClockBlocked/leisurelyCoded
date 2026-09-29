/* ============================================================
   ICON FORGE — js/sw-register.js
   Registers the service worker and manages the update flow.

   Behaviour:
     • Skips registration on localhost, file://, and any URL with
       ?sw=skip — so dev iteration stays instant.
     • Force-enable on any origin via ?sw=force.
     • Surfaces an "update available" toast when a new SW is
       waiting, with a Reload button that calls SKIP_WAITING.
     • Auto-reloads once the new worker takes control — but only
       if the user clicked Reload, never silently.
   ============================================================ */

import { log } from "./utils.js";
import { toast } from "./toast.js";

let registration = null;
let userAcceptedReload = false;

/* ============================================================
   PUBLIC
   ============================================================ */
export const swRegister = {
  init() {
    if (!("serviceWorker" in navigator)) {
      log.info("service workers unsupported — skipping");
      return;
    }
    if (!shouldRegister()) {
      log.info("service worker disabled by environment — skipping");
      return;
    }

    // Register after the page is fully idle so we don't compete
    // with the app's own boot sequence for bandwidth.
    window.addEventListener("load", () => {
      // Give the app ~1.5s to finish booting before we start
      // pulling down the shell.
      setTimeout(() => register(), 1500);
    });
  },
};

/* ============================================================
   INTERNAL
   ============================================================ */
function shouldRegister() {
  // file:// and other odd schemes
  if (!/^https?:$/.test(location.protocol)) return false;

  // Opt-in / opt-out via query string
  const params = new URLSearchParams(location.search);
  if (params.get("sw") === "skip") return false;
  if (params.get("sw") === "force") return true;

  // Skip on localhost / 127.0.0.1 by default
  const host = location.hostname;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  ) {
    return false;
  }

  return true;
}

async function register() {
  try {
    registration = await navigator.serviceWorker.register("./sw.js", {
      scope: "./",
      updateViaCache: "none",
    });
    log.info("service worker registered:", registration.scope);

    // Watch for a new worker installing.
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;

      installing.addEventListener("statechange", () => {
        if (installing.state === "installed") {
          if (navigator.serviceWorker.controller) {
            // An update is ready — prompt the user.
            promptForUpdate(installing);
          } else {
            // First install — no prompt needed.
            log.info("service worker installed for the first time");
          }
        }
      });
    });

    // Reload once the new worker claims this page — but only
    // if the user explicitly asked for it.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!userAcceptedReload) return;
      log.info("new service worker took control — reloading");
      window.location.reload();
    });

    // Periodically check for updates if the tab stays open a while.
    setInterval(() => {
      registration?.update?.().catch(() => {});
    }, 60 * 60 * 1000); // hourly
  } catch (err) {
    log.warn("service worker registration failed:", err.message);
  }
}

function promptForUpdate(waitingWorker) {
  // Show a persistent toast with a reload button.
  // We only show one per session.
  if (promptForUpdate._shown) return;
  promptForUpdate._shown = true;

  const host = document.getElementById("toast");
  const msgEl = document.getElementById("toastMsg");
  if (!host || !msgEl) return;

  // Swap the toast into an interactive mode.
  msgEl.textContent = "Update available";
  host.classList.add("is-show", "is-actionable");

  // Build (or reuse) the action button.
  let actionBtn = host.querySelector(".toast__action");
  if (!actionBtn) {
    actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast__action";
    actionBtn.textContent = "Reload";
    host.appendChild(actionBtn);
  }

  actionBtn.onclick = () => {
    userAcceptedReload = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    host.classList.remove("is-show", "is-actionable");
  };

  // Auto-dismiss after a while so it doesn't linger forever.
  setTimeout(() => {
    if (host.classList.contains("is-actionable")) {
      host.classList.remove("is-show", "is-actionable");
    }
  }, 12000);
}

/* ============================================================
   MANUAL CONTROLS (exposed via window.__forge)
   ============================================================ */
export async function clearCaches() {
  if (!("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  reg?.active?.postMessage({ type: "CLEAR_CACHES" });
  return true;
}

export async function unregisterSW() {
  if (!("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  await reg.unregister();
  toast("Service worker unregistered");
  return true;
}