/* ============================================================
   modules/sw-register.js
   ============================================================ */

import { log } from "./utils.js";
import { toast } from "./toast.js";

let registration = null;
let userAcceptedReload = false;

export const swRegister = {
  init() {
    if (!("serviceWorker" in navigator)) return;
    if (!shouldRegister()) return;
    window.addEventListener("load", () => setTimeout(register, 1500));
  },
};

function shouldRegister() {
  if (!/^https?:$/.test(location.protocol)) return false;
  const params = new URLSearchParams(location.search);
  if (params.get("sw") === "skip") return false;
  if (params.get("sw") === "force") return true;
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".local")) return false;
  return true;
}

async function register() {
  try {
    registration = await navigator.serviceWorker.register("https://clockblocked.github.io/leisurelyCoded/icons/sw.js", {
      scope: "https://clockblocked.github.io/leisurelyCoded/icons/",
      updateViaCache: "none",
    });
    log.info("service worker registered:", registration.scope);

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          promptForUpdate(installing);
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (userAcceptedReload) window.location.reload();
    });

    setInterval(() => { registration?.update?.().catch(() => {}); }, 3600000);
  } catch (err) {
    log.warn("service worker registration failed:", err.message);
  }
}

function promptForUpdate(waitingWorker) {
  if (promptForUpdate._shown) return;
  promptForUpdate._shown = true;

  const host = document.getElementById("toast");
  const msgEl = document.getElementById("toastMsg");
  if (!host || !msgEl) return;

  msgEl.textContent = "Update available";
  host.classList.add("is-show", "is-actionable");

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

  setTimeout(() => {
    if (host.classList.contains("is-actionable")) {
      host.classList.remove("is-show", "is-actionable");
    }
  }, 12000);
}

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