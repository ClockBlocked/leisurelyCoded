




const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));


      $$("[data-copy]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const wrapper = btn.closest(".gh-code");
          const pre =
            wrapper.querySelector("pre:not(.hidden)") ||
            wrapper.querySelector("pre");
          if (!pre) return;
          try {
            await navigator.clipboard.writeText(pre.innerText);
            const label = btn.querySelector("span");
            const original = label.textContent;
            btn.querySelector("i").className =
              "ph-bold ph-check text-sm text-[#8ddb8c]";
            label.textContent = "Copied";
            setTimeout(() => {
              btn.querySelector("i").className = "ph ph-copy text-sm";
              label.textContent = original;
            }, 1600);
          } catch (e) {
            /* clipboard unavailable */
          }
        });
      });

      $$(".code-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          const root = tab.closest(".gh-code");
          $$(".code-tab", root).forEach((t) => {
            t.classList.remove(
              "active",
              "bg-gh-bg",
              "border",
              "border-gh-border",
              "text-gh-fg",
            );
            t.classList.add("text-gh-muted");
          });
          tab.classList.add(
            "active",
            "bg-gh-bg",
            "border",
            "border-gh-border",
            "text-gh-fg",
          );
          tab.classList.remove("text-gh-muted");

          $$("[data-panel]", root).forEach((p) => p.classList.add("hidden"));
          const panel = root.querySelector(`[data-panel="${tab.dataset.tab}"]`);
          if (panel) panel.classList.remove("hidden");
        });
      });

      /* ============================================================
   POPOVERS
   ============================================================ */
      $$("[data-popover-root]").forEach((root) => {
        const trigger = $("[data-popover-trigger]", root);
        const pop = $("[data-popover]", root);
        if (!trigger || !pop) return;

        trigger.addEventListener("click", (e) => {
          e.stopPropagation();
          const isOpen = !pop.classList.contains("hidden");
          closeAllPopovers();
          if (!isOpen) pop.classList.remove("hidden");
        });

        pop.addEventListener("click", (e) => e.stopPropagation());
      });

      function closeAllPopovers() {
        $$("[data-popover]").forEach((p) => p.classList.add("hidden"));
      }
      document.addEventListener("click", closeAllPopovers);

      /* ============================================================
   BACKDROP / OVERLAY CONTROLLER
   ============================================================ */
      const backdrop = $("#backdrop");
      let activeOverlay = null;

      function showBackdrop() {
        backdrop.classList.remove("hidden");
        requestAnimationFrame(() => backdrop.classList.remove("opacity-0"));
        document.body.style.overflow = "hidden";
      }
      function hideBackdrop() {
        backdrop.classList.add("opacity-0");
        setTimeout(() => backdrop.classList.add("hidden"), 300);
        document.body.style.overflow = "";
      }
      function closeAllOverlays() {
        // Modals
        $$("#modalBasic, #modalConfirm").forEach((m) => {
          const panel = m.querySelector(".modal-panel");
          if (panel) {
            panel.classList.add("opacity-0", "scale-95");
          }
          setTimeout(() => m.classList.add("hidden"), 250);
        });
        // Sheets
        const sr = $("#sheetRight");
        if (sr) sr.classList.add("translate-x-full");
        const sl = $("#sheetLeft");
        if (sl) sl.classList.add("-translate-x-full");
        const ob = $("#offcanvasBottom");
        if (ob) ob.classList.add("translate-y-full");
        setTimeout(() => {
          sr?.classList.add("hidden");
          sl?.classList.add("hidden");
          ob?.classList.add("hidden");
        }, 320);

        // Command palette
        const cp = $("#commandPalette");
        if (cp && !cp.classList.contains("hidden")) {
          const panel = cp.querySelector(".cmd-panel");
          panel.classList.add("opacity-0", "scale-95");
          setTimeout(() => cp.classList.add("hidden"), 200);
        }

        hideBackdrop();
        activeOverlay = null;

        // If video was docked, return it
        if (["sheet", "offcanvas"].includes(playerState)) {
          setPlayerState("inline");
        }
      }

      backdrop.addEventListener("click", closeAllOverlays);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeAllOverlays();
          closeAllPopovers();
          $("#contextMenu").classList.add("hidden");
        }
      });

      /* ---- Modals ---- */
      $$("[data-open-modal]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const modal = document.getElementById(btn.dataset.openModal);
          if (!modal) return;
          closeAllOverlays();
          modal.classList.remove("hidden");
          showBackdrop();
          activeOverlay = modal;
          const panel = modal.querySelector(".modal-panel");
          requestAnimationFrame(() =>
            panel.classList.remove("opacity-0", "scale-95"),
          );
        });
      });
      $$("[data-close-modal]").forEach((btn) =>
        btn.addEventListener("click", closeAllOverlays),
      );

      /* ---- Sheets & Offcanvas ---- */
      $$("[data-open-sheet]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const sheet = document.getElementById(btn.dataset.openSheet);
          if (!sheet) return;
          closeAllOverlays();
          sheet.classList.remove("hidden");
          showBackdrop();
          activeOverlay = sheet;
          requestAnimationFrame(() => {
            if (sheet.id === "sheetRight")
              sheet.classList.remove("translate-x-full");
            if (sheet.id === "sheetLeft")
              sheet.classList.remove("-translate-x-full");
            if (sheet.id === "offcanvasBottom")
              sheet.classList.remove("translate-y-full");
          });
        });
      });
      $$("[data-close-sheet]").forEach((btn) =>
        btn.addEventListener("click", closeAllOverlays),
      );

      /* ---- Command Palette ---- */
      function openCommand() {
        closeAllOverlays();
        const cp = $("#commandPalette");
        cp.classList.remove("hidden");
        showBackdrop();
        activeOverlay = cp;
        const panel = cp.querySelector(".cmd-panel");
        requestAnimationFrame(() => {
          panel.classList.remove("opacity-0", "scale-95");
          $("#cmdInput").focus();
        });
      }
      $$("[data-open-command]").forEach((b) =>
        b.addEventListener("click", openCommand),
      );
      document.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          openCommand();
        }
      });
      $("#commandPalette").addEventListener("click", (e) => {
        if (e.target.id === "commandPalette") closeAllOverlays();
      });

      /* ============================================================
   CONTEXT MENU
   ============================================================ */
      const ctxArea = $("#ctxArea");
      const ctxMenu = $("#contextMenu");
      const ctxItems = [
        { icon: "ph-play", label: "Play now", hint: "↵" },
        { icon: "ph-queue", label: "Add to queue", hint: "Q" },
        { icon: "ph-heart", label: "Save to library", hint: "S" },
        { divider: true },
        { icon: "ph-playlist", label: "Add to playlist" },
        { icon: "ph-share-network", label: "Share", hint: "⌘S" },
        { icon: "ph-download-simple", label: "Download" },
        { divider: true },
        { icon: "ph-eye-slash", label: "Hide this track", danger: true },
      ];
      ctxMenu.innerHTML = ctxItems
        .map((it) => {
          if (it.divider)
            return '<div class="h-px bg-gray-100 my-1.5 mx-2"></div>';
          return `
    <button class="ctx-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors
      ${it.danger ? "text-red-500 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}">
      <i class="ph ${it.icon} text-lg ${it.danger ? "" : "text-gray-400"}"></i>
      <span class="flex-1 text-[13px] font-semibold">${it.label}</span>
      ${it.hint ? `<kbd class="font-sans text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">${it.hint}</kbd>` : ""}
    </button>`;
        })
        .join("");

      ctxArea.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const menuW = 224,
          menuH = ctxMenu.offsetHeight || 320;
        let x = e.clientX,
          y = e.clientY;
        if (x + menuW > window.innerWidth - 12)
          x = window.innerWidth - menuW - 12;
        if (y + menuH > window.innerHeight - 12)
          y = window.innerHeight - menuH - 12;
        ctxMenu.style.left = x + "px";
        ctxMenu.style.top = y + "px";
        ctxMenu.classList.remove("hidden");
      });
      document.addEventListener("click", () => ctxMenu.classList.add("hidden"));
      ctxMenu.addEventListener("click", (e) => {
        const item = e.target.closest(".ctx-item");
        if (item) {
          pushToast(
            "info",
            "Action triggered",
            item.querySelector("span").textContent,
          );
          ctxMenu.classList.add("hidden");
        }
      });

      /* ============================================================
   FLOATING VIDEO PLAYER — 4 STATES
   ============================================================ */
      const video = $("#theVideo");
      const videoWrap = $("#videoWrap");
      const videoDock = $("#videoDock");
      const sheetSlot = $("#sheetVideoSlot");
      const offSlot = $("#offcanvasVideoSlot");
      const stateBadge = $("#playerStateBadge");
      const vPlay = $("#vPlay");
      const vProgress = $("#vProgress");
      const vBar = $("#vBar");
      const vTime = $("#vTime");
      const vMute = $("#vMute");
      const vClose = $("#vClose");

      let playerState = "inline";

      function setPlayerState(next) {
        if (next === playerState && next !== "pip") return;

        // Always clean up floating class first
        videoWrap.classList.remove("video-floating");
        vClose.classList.add("hidden");
        vClose.classList.remove("flex");

        // Return to the inline dock, then re-parent as needed
        if (next !== "pip") {
          if (videoWrap.parentElement !== videoDock)
            videoDock.appendChild(videoWrap);
          videoWrap.className = "relative w-full";
        }

        switch (next) {
          case "inline":
            videoDock.appendChild(videoWrap);
            videoWrap.className = "relative w-full";
            stateBadge.textContent = "Inline";
            break;

          case "floating":
            document.body.appendChild(videoWrap);
            videoWrap.className = "video-floating";
            vClose.classList.remove("hidden");
            vClose.classList.add("flex");
            stateBadge.textContent = "Floating";
            break;

          case "sheet":
            // Open the right sheet and dock the player inside it
            closeAllOverlays();
            videoDock.appendChild(videoWrap);
            videoWrap.className = "relative w-full rounded-2xl overflow-hidden";
            const sr = $("#sheetRight");
            sr.classList.remove("hidden");
            showBackdrop();
            activeOverlay = sr;
            requestAnimationFrame(() =>
              sr.classList.remove("translate-x-full"),
            );
            sheetSlot.appendChild(videoWrap);
            stateBadge.textContent = "Docked · Sheet";
            break;

          case "offcanvas":
            closeAllOverlays();
            videoDock.appendChild(videoWrap);
            videoWrap.className = "relative w-full rounded-2xl overflow-hidden";
            const ob = $("#offcanvasBottom");
            ob.classList.remove("hidden");
            showBackdrop();
            activeOverlay = ob;
            requestAnimationFrame(() =>
              ob.classList.remove("translate-y-full"),
            );
            offSlot.appendChild(videoWrap);
            stateBadge.textContent = "Docked · Offcanvas";
            break;

          case "pip":
            stateBadge.textContent = "Picture-in-Picture";
            requestPiP();
            return;
        }

        playerState = next;
        syncStateButtons();
      }

      function syncStateButtons() {
        $$(".player-state-btn").forEach((btn) => {
          const active = btn.dataset.playerState === playerState;
          btn.className = active
            ? "player-state-btn px-4 py-2 rounded-full text-[12px] font-bold bg-primary text-white shadow-glow transition-colors"
            : "player-state-btn px-4 py-2 rounded-full text-[12px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors";
        });
        // PiP button always dark
        const pipBtn = $('[data-player-state="pip"]');
        if (pipBtn && playerState !== "pip") {
          pipBtn.className =
            "player-state-btn px-4 py-2 rounded-full text-[12px] font-bold bg-gray-900 text-white hover:bg-black transition-colors";
        }
      }

      async function requestPiP() {
        try {
          if (!document.pictureInPictureEnabled) throw new Error("unsupported");
          if (video.readyState < 2) {
            await new Promise((r) =>
              video.addEventListener("loadedmetadata", r, { once: true }),
            );
          }
          if (video.paused) await video.play().catch(() => {});
          await video.requestPictureInPicture();
          playerState = "pip";
          stateBadge.textContent = "Picture-in-Picture";
          syncStateButtons();
        } catch (err) {
          stateBadge.textContent = "PiP unavailable";
          pushToast(
            "warning",
            "Picture-in-Picture blocked",
            "Your browser or this context does not allow PiP.",
          );
          playerState = "inline";
          syncStateButtons();
        }
      }

      video.addEventListener("leavepictureinpicture", () => {
        playerState = "inline";
        videoDock.appendChild(videoWrap);
        videoWrap.className = "relative w-full";
        stateBadge.textContent = "Inline";
        syncStateButtons();
      });

      $$(".player-state-btn").forEach((btn) => {
        btn.addEventListener("click", () =>
          setPlayerState(btn.dataset.playerState),
        );
      });

      vClose.addEventListener("click", () => setPlayerState("inline"));

      /* ---- Video playback controls ---- */
      vPlay.addEventListener("click", () => {
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      });
      video.addEventListener(
        "play",
        () => (vPlay.innerHTML = '<i class="ph-fill ph-pause text-sm"></i>'),
      );
      video.addEventListener(
        "pause",
        () => (vPlay.innerHTML = '<i class="ph-fill ph-play text-sm"></i>'),
      );

      video.addEventListener("timeupdate", () => {
        if (!video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        vProgress.style.width = pct + "%";
        const m = Math.floor(video.currentTime / 60);
        const s = Math.floor(video.currentTime % 60)
          .toString()
          .padStart(2, "0");
        vTime.textContent = `${m}:${s}`;
      });

      vBar.addEventListener("click", (e) => {
        const rect = vBar.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        if (video.duration) video.currentTime = ratio * video.duration;
      });

      vMute.addEventListener("click", () => {
        video.muted = !video.muted;
        vMute.innerHTML = video.muted
          ? '<i class="ph ph-speaker-slash text-base"></i>'
          : '<i class="ph ph-speaker-high text-base"></i>';
      });

      /* ============================================================
   TAGS INPUT
   ============================================================ */
      const tagsField = $("#tagsField");
      const tagsInput = $("#tagsInput");

      function bindTagRemove(chip) {
        const btn = chip.querySelector(".tag-remove");
        if (btn) btn.addEventListener("click", () => chip.remove());
      }

      $$(".tag-chip").forEach(bindTagRemove);

      function addTag(value) {
        const text = value.trim();
        if (!text) return;
        const chip = document.createElement("span");
        chip.className =
          "tag-chip inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[12px] font-bold pl-3 pr-1.5 py-1.5 rounded-full fade-up";
        chip.innerHTML = `${text} <button class="tag-remove w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center"><i class="ph-bold ph-x text-[10px]"></i></button>`;
        bindTagRemove(chip);
        tagsField.insertBefore(chip, tagsInput);
        tagsInput.value = "";
      }

      tagsInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addTag(tagsInput.value);
        }
        if (e.key === "Backspace" && tagsInput.value === "") {
          const chips = $$(".tag-chip", tagsField);
          if (chips.length) chips[chips.length - 1].remove();
        }
      });
      tagsField.addEventListener("click", () => tagsInput.focus());

      /* ============================================================
   COLOR PICKER
   ============================================================ */
      const swatches = $$(".swatch");
      const colorPreview = $("#colorPreview");
      const colorHex = $("#colorHex");
      const customColor = $("#customColor");

      function setColor(hex) {
        colorPreview.style.backgroundColor = hex;
        colorHex.textContent = hex;
        swatches.forEach((s) => {
          const isMatch = s.dataset.color.toLowerCase() === hex.toLowerCase();
          s.classList.toggle("ring-transparent", !isMatch);
          if (isMatch) {
            const ring = s.dataset.color;
            s.style.setProperty("--tw-ring-color", ring);
            s.classList.remove("ring-transparent");
          }
        });
      }

      swatches.forEach((s) => {
        s.addEventListener("click", () => {
          swatches.forEach((o) => {
            o.classList.add("ring-transparent");
            o.style.removeProperty("--tw-ring-color");
          });
          s.classList.remove("ring-transparent");
          s.style.setProperty("--tw-ring-color", s.dataset.color);
          setColor(s.dataset.color);
        });
      });
      customColor.addEventListener("input", (e) => setColor(e.target.value));

      /* ============================================================
   RANGE SLIDER BUBBLE
   ============================================================ */
      const volRange = $("#volRange");
      const rangeBubble = $("#rangeBubble");
      function updateBubble() {
        const pct = volRange.value;
        rangeBubble.style.left = pct + "%";
        rangeBubble.textContent = pct;
      }
      volRange.addEventListener("input", updateBubble);
      updateBubble();

      /* ============================================================
   STAR RATING
   ============================================================ */
      const stars = $$(".star");
      const starLabel = $("#starLabel");
      const ratingText = [
        "",
        "Terrible",
        "Poor",
        "Okay",
        "Great",
        "Masterpiece",
      ];

      stars.forEach((star, i) => {
        star.addEventListener("mouseenter", () => {
          stars.forEach((s, j) => s.classList.toggle("text-amber-400", j <= i));
          stars.forEach((s, j) => s.classList.toggle("text-gray-200", j > i));
        });
        star.addEventListener("click", () => {
          stars.forEach((s, j) => {
            s.classList.toggle("text-amber-400", j <= i);
            s.classList.toggle("text-gray-200", j > i);
            s.dataset.selected = j <= i ? "1" : "0";
          });
          starLabel.textContent = `${i + 1} / 5 — ${ratingText[i + 1]}`;
          starLabel.classList.add("text-gray-900");
        });
      });
      $("#starRow").addEventListener("mouseleave", () => {
        stars.forEach((s) => {
          const on = s.dataset.selected === "1";
          s.classList.toggle("text-amber-400", on);
          s.classList.toggle("text-gray-200", !on);
        });
      });

      /* ============================================================
   SEGMENTED CONTROL
   ============================================================ */
      const segBtns = $$("#segmented .seg-btn");
      const segLabel = $("#segLabel");
      segBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          segBtns.forEach((b) => {
            b.className =
              "seg-btn flex-1 px-4 py-2 rounded-full text-[12.5px] font-bold text-gray-500 hover:text-gray-900 transition-all";
          });
          btn.className =
            "seg-btn flex-1 px-4 py-2 rounded-full text-[12.5px] font-bold bg-white text-gray-900 shadow-sm transition-all";
          segLabel.textContent = btn.textContent.trim();
        });
      });

      /* ============================================================
   STEPPER
   ============================================================ */
      let currentStep = 1;
      const totalSteps = 4;
      const stepBar = $("#stepBar");

      function renderStepper() {
        $$(".step-node").forEach((node) => {
          const n = Number(node.dataset.step);
          const dot = node.querySelector(".step-dot");
          const label = node.querySelector("span");
          const done = n < currentStep;
          const active = n === currentStep;

          dot.className =
            "step-dot w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] transition-all " +
            (done
              ? "bg-primary text-white shadow-md"
              : active
                ? "bg-primary text-white shadow-md ring-4 ring-primary/20"
                : "bg-white border-2 border-gray-200 text-gray-400");

          dot.innerHTML = done ? '<i class="ph-bold ph-check"></i>' : n;
          label.className =
            "text-[11px] font-bold transition-colors " +
            (done || active ? "text-gray-900" : "text-gray-400");
        });
        stepBar.style.width =
          ((currentStep - 1) / (totalSteps - 1)) * 100 + "%";
      }
      $("#stepNext").addEventListener("click", () => {
        if (currentStep < totalSteps) {
          currentStep++;
          renderStepper();
        }
      });
      $("#stepPrev").addEventListener("click", () => {
        if (currentStep > 1) {
          currentStep--;
          renderStepper();
        }
      });
      renderStepper();

      /* ============================================================
   DATA TABLE
   ============================================================ */
      const members = [
        {
          name: "Sarah Jenkins",
          role: "Owner",
          status: "active",
          last: "Just now",
          avatar:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100",
        },
        {
          name: "Mark Otto",
          role: "Admin",
          status: "active",
          last: "2h ago",
          avatar:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100",
        },
        {
          name: "Emily Jones",
          role: "Member",
          status: "pending",
          last: "Yesterday",
          avatar: null,
          initials: "EJ",
        },
        {
          name: "Daniel Craig",
          role: "Member",
          status: "active",
          last: "3d ago",
          avatar:
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100",
        },
      ];

      const statusMap = {
        active: {
          cls: "bg-green-50 text-green-700",
          dot: "bg-green-500",
          label: "Active",
        },
        pending: {
          cls: "bg-amber-50 text-amber-700",
          dot: "bg-amber-500",
          label: "Pending",
        },
      };

      function renderTable(rows) {
        $("#tableBody").innerHTML = rows
          .map((m) => {
            const s = statusMap[m.status];
            const avatarHTML = m.avatar
              ? `<img src="${m.avatar}" class="w-9 h-9 rounded-full object-cover">`
              : `<div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-extrabold text-gray-500">${m.initials}</div>`;
            return `
      <tr class="hover:bg-gray-50/70 transition-colors">
        <td class="px-3 py-3">
          <div class="flex items-center gap-3">
            ${avatarHTML}
            <span class="text-[13.5px] font-bold">${m.name}</span>
          </div>
        </td>
        <td class="px-3 py-3 text-[13px] text-gray-600 font-medium">${m.role}</td>
        <td class="px-3 py-3">
          <span class="inline-flex items-center gap-1.5 ${s.cls} text-[11.5px] font-bold px-2.5 py-1 rounded-full">
            <span class="w-1.5 h-1.5 rounded-full ${s.dot}"></span>${s.label}
          </span>
        </td>
        <td class="px-3 py-3 text-[12.5px] text-gray-400 font-semibold text-right">${m.last}</td>
      </tr>`;
          })
          .join("");
      }
      renderTable(members);

      $("#tableSearch").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        renderTable(
          members.filter(
            (m) =>
              m.name.toLowerCase().includes(q) ||
              m.role.toLowerCase().includes(q),
          ),
        );
      });

      let sortAsc = true;
      $('[data-sort="name"]').addEventListener("click", () => {
        sortAsc = !sortAsc;
        const sorted = [...members].sort((a, b) =>
          sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
        );
        renderTable(sorted);
      });

      /* ============================================================
   ACCORDION
   ============================================================ */
      $$(".acc-trigger").forEach((trigger) => {
        trigger.addEventListener("click", () => {
          const item = trigger.closest(".acc-item");
          const panel = item.querySelector(".acc-panel");
          const icon = item.querySelector(".acc-icon");
          const isOpen = panel.classList.contains("grid-rows-[1fr]");

          // Close all
          $$(".acc-panel").forEach((p) =>
            p.classList.remove("grid-rows-[1fr]"),
          );
          $$(".acc-panel").forEach((p) => p.classList.add("grid-rows-[0fr]"));
          $$(".acc-icon").forEach((i) => i.classList.remove("rotate-180"));

          if (!isOpen) {
            panel.classList.remove("grid-rows-[0fr]");
            panel.classList.add("grid-rows-[1fr]");
            icon.classList.add("rotate-180");
          }
        });
      });

      /* ============================================================
   TABS
   ============================================================ */
      $$("#tabGroup .tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          $$("#tabGroup .tab-btn").forEach((b) => {
            b.className =
              "tab-btn flex-1 px-3 py-2 rounded-full text-[12.5px] font-bold text-gray-500 hover:text-gray-900 transition-all";
          });
          btn.className =
            "tab-btn flex-1 px-3 py-2 rounded-full text-[12.5px] font-bold bg-white text-gray-900 shadow-sm transition-all";

          $$("[data-tab-panel]").forEach((p) => p.classList.add("hidden"));
          const panel = document.querySelector(
            `[data-tab-panel="${btn.dataset.tabBtn}"]`,
          );
          if (panel) {
            panel.classList.remove("hidden");
            panel.classList.add("fade-up");
          }
        });
      });

      /* ============================================================
   TOASTS
   ============================================================ */
      const toastContainer = $("#toastContainer");
      const toastConfig = {
        success: {
          icon: "ph-check-circle",
          color: "text-green-500",
          bg: "bg-green-50",
          title: "Success",
        },
        error: {
          icon: "ph-x-circle",
          color: "text-red-500",
          bg: "bg-red-50",
          title: "Something went wrong",
        },
        warning: {
          icon: "ph-warning",
          color: "text-amber-500",
          bg: "bg-amber-50",
          title: "Heads up",
        },
        info: {
          icon: "ph-info",
          color: "text-blue-500",
          bg: "bg-blue-50",
          title: "For your information",
        },
      };
      const toastMessages = {
        success: "Your playlist was saved to the library.",
        error: "We couldn't reach the server. Please retry.",
        warning: "Your storage is nearly full.",
        info: "A new version is available to install.",
      };

      function pushToast(type, title, message) {
        const cfg = toastConfig[type] || toastConfig.info;
        const el = document.createElement("div");
        el.className =
          "toast-in pointer-events-auto bg-card rounded-2xl shadow-pop border border-gray-100 p-4 flex items-start gap-3";
        el.innerHTML = `
    <span class="w-9 h-9 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0">
      <i class="ph-fill ${cfg.icon} text-lg"></i>
    </span>
    <div class="flex-1 min-w-0">
      <h4 class="text-[13.5px] font-bold text-gray-900">${title || cfg.title}</h4>
      <p class="text-[12.5px] text-gray-500 mt-0.5 leading-snug">${message || toastMessages[type]}</p>
    </div>
    <button class="toast-close text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0">
      <i class="ph-bold ph-x text-sm"></i>
    </button>`;
        toastContainer.appendChild(el);

        const dismiss = () => {
          el.classList.add("toast-out");
          setTimeout(() => el.remove(), 260);
        };
        el.querySelector(".toast-close").addEventListener("click", dismiss);
        setTimeout(dismiss, 4200);
      }

      $$("[data-toast]").forEach((btn) => {
        btn.addEventListener("click", () => pushToast(btn.dataset.toast));
      });

      /* ============================================================
   ALERT DISMISS
   ============================================================ */
      $$(".alert-close").forEach((btn) => {
        btn.addEventListener("click", () => {
          const alert = btn.closest(".alert");
          alert.style.transition = "opacity .25s, transform .25s";
          alert.style.opacity = "0";
          alert.style.transform = "translateY(-4px)";
          setTimeout(() => alert.remove(), 260);
        });
      });

      /* ============================================================
   SKELETON LOADER
   ============================================================ */
      function renderSkeleton(loading) {
        const area = $("#skeletonArea");
        if (loading) {
          area.innerHTML = Array.from({ length: 3 })
            .map(
              () => `
      <div class="flex items-center gap-3">
        <div class="shimmer relative overflow-hidden w-12 h-12 rounded-2xl bg-gray-100"></div>
        <div class="flex-1 space-y-2">
          <div class="shimmer relative overflow-hidden h-3.5 bg-gray-100 rounded-full w-3/4"></div>
          <div class="shimmer relative overflow-hidden h-3 bg-gray-100 rounded-full w-1/2"></div>
        </div>
      </div>`,
            )
            .join("");
        } else {
          const tracks = [
            {
              title: "Midnight City",
              artist: "M83",
              img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=100",
            },
            {
              title: "Blinding Lights",
              artist: "The Weeknd",
              img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=100",
            },
            {
              title: "Levitating",
              artist: "Dua Lipa",
              img: "https://images.unsplash.com/photo-1520607162513-322f08a8e100?auto=format&fit=crop&q=80&w=100",
            },
          ];
          area.innerHTML = tracks
            .map(
              (t) => `
      <div class="flex items-center gap-3 fade-up">
        <img src="${t.img}" class="w-12 h-12 rounded-2xl object-cover">
        <div class="flex-1">
          <h4 class="text-[13.5px] font-bold">${t.title}</h4>
          <p class="text-[12px] text-gray-500">${t.artist}</p>
        </div>
        <button class="w-8 h-8 rounded-full bg-gray-100 hover:bg-primary hover:text-white text-gray-500 flex items-center justify-center transition-colors">
          <i class="ph-fill ph-play text-xs"></i>
        </button>
      </div>`,
            )
            .join("");
        }
      }
      renderSkeleton(true);
      setTimeout(() => renderSkeleton(false), 1600);

      $("#reloadSkeleton").addEventListener("click", () => {
        renderSkeleton(true);
        setTimeout(() => renderSkeleton(false), 1600);
      });

      /* ============================================================
   CIRCULAR PROGRESS — animate on view
   ============================================================ */
      const ring = $("#ringProgress");
      const ringObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const circumference = 2 * Math.PI * 52;
              const target = circumference * (1 - 0.68);
              ring.style.strokeDashoffset = target;
              ringObserver.disconnect();
            }
          });
        },
        { threshold: 0.4 },
      );
      if (ring) ringObserver.observe(ring);

      /* ============================================================
   INITIAL STATE
   ============================================================ */
      syncStateButtons();
