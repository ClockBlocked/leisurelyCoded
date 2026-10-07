




/* ============================================================
   plugins.js — every interactive component behavior
   All plugins are namespaced under window.Plugins and are
   scoped to a root element so they can be re-initialized per card.
   ============================================================ */

(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------- buttons ---------------- */
  function buttonGroup(root) {
    $$('[data-btn-group]', root).forEach(group => {
      group.addEventListener('click', e => {
        const btn = e.target.closest('.ui-btn');
        if (!btn || !group.contains(btn)) return;
        $$('.ui-btn', group).forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });
  }

  function loadingButton(root) {
    $$('[data-loading-btn]', root).forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('is-loading')) return;
        btn.classList.add('is-loading');
        setTimeout(() => btn.classList.remove('is-loading'), 1800);
      });
    });
  }

  /* ---------------- forms ---------------- */
  function passwordToggle(root) {
    $$('[data-toggle-pw]', root).forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
  }

  function otp(root) {
    $$('[data-otp]', root).forEach(group => {
      const inputs = $$('input', group);
      inputs.forEach((input, i) => {
        input.addEventListener('input', () => {
          input.value = input.value.replace(/\D/g, '').slice(0, 1);
          if (input.value && i < inputs.length - 1) inputs[i + 1].focus();
        });
        input.addEventListener('keydown', e => {
          if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus();
          if (e.key === 'ArrowLeft' && i > 0) inputs[i - 1].focus();
          if (e.key === 'ArrowRight' && i < inputs.length - 1) inputs[i + 1].focus();
        });
        input.addEventListener('paste', e => {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
          text.split('').slice(0, inputs.length - i).forEach((ch, k) => {
            inputs[i + k].value = ch;
          });
          const next = Math.min(i + text.length, inputs.length - 1);
          inputs[next].focus();
        });
      });
    });
  }

  function tags(root) {
    $$('[data-tags]', root).forEach(wrap => {
      const input = $('input', wrap);

      const makeTag = value => {
        const tag = document.createElement('span');
        tag.className = 'ui-tag';
        tag.innerHTML = `${escapeHtml(value)}<button type="button" aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
        wrap.insertBefore(tag, input);
      };

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && input.value.trim()) {
          e.preventDefault();
          makeTag(input.value.trim());
          input.value = '';
        } else if (e.key === 'Backspace' && !input.value) {
          const last = input.previousElementSibling;
          if (last && last.classList.contains('ui-tag')) last.remove();
        }
      });

      wrap.addEventListener('click', e => {
        const rm = e.target.closest('.ui-tag button');
        if (rm) rm.closest('.ui-tag').remove();
      });
    });
  }

  function fileDrop(root) {
    $$('[data-drop]', root).forEach(drop => {
      const input = $('input[type="file"]', drop);
      const list  = $('.file-list', drop);

      const render = files => {
        list.innerHTML = '';
        Array.from(files).forEach(f => {
          const li = document.createElement('li');
          li.innerHTML = `<span>${escapeHtml(f.name)}</span><span>${(f.size / 1024).toFixed(1)} KB</span>`;
          list.appendChild(li);
        });
      };

      input.addEventListener('change', () => render(input.files));

      ['dragenter', 'dragover'].forEach(ev => {
        drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); });
      });
      ['dragleave', 'drop'].forEach(ev => {
        drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); });
      });
      drop.addEventListener('drop', e => {
        if (e.dataTransfer && e.dataTransfer.files.length) render(e.dataTransfer.files);
      });
    });
  }

  function range(root) {
    $$('[data-range]', root).forEach(input => {
      const out = $('[data-range-out]', root);
      const sync = () => { if (out) out.textContent = input.value; };
      input.addEventListener('input', sync);
      sync();
    });
  }

  function colorPicker(root) {
    $$('[data-color-picker]', root).forEach(wrap => {
      const out = $('[data-color-out]', wrap);
      $$('.ui-swatch', wrap).forEach(sw => {
        sw.addEventListener('click', () => {
          $$('.ui-swatch', wrap).forEach(s => s.style.boxShadow = 'none');
          sw.style.boxShadow = '0 0 0 2px var(--accent)';
          if (out) out.textContent = sw.dataset.color;
        });
      });
    });
  }

  function rating(root) {
    $$('[data-rating]', root).forEach(wrap => {
      const stars = $$('[data-star]', wrap);
      const out = $('[data-rating-out]', wrap);
      let value = 3;
      const paint = v => {
        stars.forEach(s => {
          const on = Number(s.dataset.star) <= v;
          s.style.color = on ? 'var(--yellow)' : 'var(--text-3)';
        });
        if (out) out.textContent = `${v} of 5`;
      };
      stars.forEach(s => {
        s.addEventListener('mouseenter', () => paint(Number(s.dataset.star)));
        s.addEventListener('click', () => { value = Number(s.dataset.star); paint(value); });
      });
      wrap.addEventListener('mouseleave', () => paint(value));
      paint(value);
    });
  }

  /* ---------------- chips ---------------- */
  function chips(root) {
    $$('[data-chips]', root).forEach(group => {
      group.addEventListener('click', e => {
        const chip = e.target.closest('.ui-chip');
        if (!chip || !group.contains(chip)) return;
        $$('.ui-chip', group).forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
      });
    });
  }

  /* ---------------- tabs ---------------- */
  function tabs(root) {
    const groups = [
      ...$$('[data-tabs]', root),
      ...$$('[data-tabs-underline]', root),
      ...$$('[data-tabs-vertical]', root)
    ];
    groups.forEach(group => {
      const tabs   = $$('[data-tab]', group);
      const panels = $$('[data-panel]', group);
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const id = tab.dataset.tab;
          tabs.forEach(t => t.classList.toggle('is-active', t === tab));
          panels.forEach(p => p.hidden = p.dataset.panel !== id);
        });
      });
    });
  }

  /* ---------------- accordion ---------------- */
  function accordion(root) {
    $$('[data-accordion]', root).forEach(acc => {
      const items = $$('.ui-acc-item', acc);
      items.forEach(item => {
        const head = $('.ui-acc-head', item);
        if (!head) return;
        head.addEventListener('click', () => {
          const isOpen = item.classList.contains('is-open');
          // single-open behavior — remove this loop for multi-open
          items.forEach(i => i.classList.remove('is-open'));
          if (!isOpen) item.classList.add('is-open');
        });
      });
    });
  }

  /* ---------------- overlays ---------------- */
  function modal(root) {
    $$('[data-modal-demo]', root).forEach(demo => {
      const backdrop = $('[data-modal-backdrop]', demo);
      if (!backdrop) return;
      const open  = () => { backdrop.hidden = false; document.body.classList.add('no-scroll'); };
      const close = () => { backdrop.hidden = true;  document.body.classList.remove('no-scroll'); };

      $$('[data-modal-open]', demo).forEach(b => b.addEventListener('click', open));
      $$('[data-modal-close]', demo).forEach(b => b.addEventListener('click', close));
      backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !backdrop.hidden) close();
      });
    });
  }

  function drawer(root) {
    $$('[data-drawer-demo]', root).forEach(demo => {
      const backdrop = $('[data-drawer-backdrop]', demo);
      if (!backdrop) return;
      const open  = () => { backdrop.hidden = false; document.body.classList.add('no-scroll'); };
      const close = () => { backdrop.hidden = true;  document.body.classList.remove('no-scroll'); };
      $$('[data-drawer-open]',  demo).forEach(b => b.addEventListener('click', open));
      $$('[data-drawer-close]', demo).forEach(b => b.addEventListener('click', close));
      backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !backdrop.hidden) close();
      });
    });
  }

  function menu(root) {
    $$('[data-menu]', root).forEach(anchor => {
      const trigger = $('[data-menu-trigger]', anchor);
      if (!trigger) return;
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        // close any other open menu
        document.querySelectorAll('.ui-menu-anchor.is-open').forEach(a => {
          if (a !== anchor) a.classList.remove('is-open');
        });
        anchor.classList.toggle('is-open');
      });
    });
    // outside click closes all
    document.addEventListener('click', () => {
      document.querySelectorAll('.ui-menu-anchor.is-open').forEach(a => a.classList.remove('is-open'));
    });
  }

  function popover(root) {
    $$('[data-popover]', root).forEach(wrap => {
      const trigger = $('[data-pop-trigger]', wrap);
      if (!trigger) return;
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.ui-pop-wrap.is-open').forEach(w => {
          if (w !== wrap) w.classList.remove('is-open');
        });
        wrap.classList.toggle('is-open');
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.ui-pop-wrap.is-open').forEach(w => w.classList.remove('is-open'));
    });
  }

  function contextMenu(root) {
    $$('[data-ctx-zone]', root).forEach(zone => {
      zone.addEventListener('contextmenu', e => {
        e.preventDefault();
        document.querySelectorAll('.ui-ctx-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'ui-ctx-menu';
        menu.innerHTML = `
          <button class="ui-menu-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Edit</button>
          <button class="ui-menu-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Duplicate</button>
          <div class="ui-menu-sep"></div>
          <button class="ui-menu-item is-danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete</button>
        `;
        document.body.appendChild(menu);

        const x = Math.min(e.clientX, window.innerWidth  - menu.offsetWidth  - 8);
        const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 8);
        menu.style.left = x + 'px';
        menu.style.top  = y + 'px';

        setTimeout(() => {
          const close = () => { menu.remove(); document.removeEventListener('click', close); document.removeEventListener('contextmenu', close); };
          document.addEventListener('click', close);
          document.addEventListener('contextmenu', close);
        }, 0);
      });
    });
  }

  /* ---------------- table sort ---------------- */
  function table(root) {
    $$('[data-table]', root).forEach(wrap => {
      const table = $('table', wrap);
      if (!table) return;
      const tbody = $('tbody', table);
      let dir = 1, lastKey = null;

      $$('th.is-sortable', table).forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.sort;
          if (lastKey === key) dir *= -1; else { dir = 1; lastKey = key; }
          const colIdx = Array.from(th.parentElement.children).indexOf(th);
          const rows = Array.from(tbody.querySelectorAll('tr'));
          rows.sort((a, b) => {
            const av = a.children[colIdx].innerText.trim().toLowerCase();
            const bv = b.children[colIdx].innerText.trim().toLowerCase();
            return av.localeCompare(bv) * dir;
          });
          rows.forEach(r => tbody.appendChild(r));
          $$('th', table).forEach(h => h.classList.remove('is-sorted'));
          th.classList.add('is-sorted');
          const ind = $('.sort-ind', th);
          if (ind) ind.textContent = dir === 1 ? '↑' : '↓';
        });
      });
    });
  }

  /* ---------------- kanban ---------------- */
  function kanban(root) {
    $$('[data-kanban]', root).forEach(board => {
      let dragged = null;

      $$('.ui-kb-card', board).forEach(card => {
        card.addEventListener('dragstart', () => {
          dragged = card;
          card.classList.add('is-dragging');
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('is-dragging');
          $$('.ui-kb-col', board).forEach(c => c.classList.remove('is-over'));
        });
      });

      $$('[data-col]', board).forEach(col => {
        col.addEventListener('dragover', e => {
          e.preventDefault();
          col.classList.add('is-over');
        });
        col.addEventListener('dragleave', () => col.classList.remove('is-over'));
        col.addEventListener('drop', e => {
          e.preventDefault();
          col.classList.remove('is-over');
          if (dragged) {
            const firstCard = $('.ui-kb-card', col);
            if (firstCard) col.insertBefore(dragged, firstCard);
            else col.appendChild(dragged);
            refreshCounts(board);
          }
        });
      });

      function refreshCounts(board) {
        $$('[data-col]', board).forEach(col => {
          const count = $$('.ui-kb-card', col).length;
          const badge = $('.ui-kb-count', col);
          if (badge) badge.textContent = count;
        });
      }
    });
  }

  /* ---------------- calendar ---------------- */
  function calendar(root) {
    $$('[data-cal]', root).forEach(cal => {
      const grid = $('[data-cal-grid]', cal);
      const title = $('[data-cal-title]', cal);
      if (!grid) return;
      let view = new Date(2025, 2, 1); // March 2025
      let selected = new Date(2025, 2, 12);

      const dows = ['S','M','T','W','T','F','S'];
      const events = [3, 9, 12, 18, 24];

      function render() {
        grid.innerHTML = '';
        title.textContent = view.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        dows.forEach(d => {
          const el = document.createElement('div');
          el.className = 'ui-cal-dow';
          el.textContent = d;
          grid.appendChild(el);
        });

        const year = view.getFullYear();
        const month = view.getMonth();
        const first = new Date(year, month, 1).getDay();
        const days  = new Date(year, month + 1, 0).getDate();
        const prevDays = new Date(year, month, 0).getDate();

        for (let i = first - 1; i >= 0; i--) {
          const el = document.createElement('div');
          el.className = 'ui-cal-day is-muted';
          el.textContent = prevDays - i;
          grid.appendChild(el);
        }
        for (let d = 1; d <= days; d++) {
          const el = document.createElement('div');
          el.className = 'ui-cal-day';
          el.textContent = d;
          if (d === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear()) {
            el.classList.add('is-selected');
          }
          if (events.includes(d)) el.classList.add('has-event');
          el.addEventListener('click', () => {
            selected = new Date(year, month, d);
            render();
          });
          grid.appendChild(el);
        }
      }

      $('[data-cal-prev]', cal)?.addEventListener('click', () => {
        view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
        render();
      });
      $('[data-cal-next]', cal)?.addEventListener('click', () => {
        view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
        render();
      });

      render();
    });
  }

  /* ---------------- file tree ---------------- */
  function tree(root) {
    $$('[data-tree]', root).forEach(treeEl => {
      treeEl.addEventListener('click', e => {
        const row = e.target.closest('.ui-tree-row');
        if (!row) return;
        const chev = $('.chev', row);
        if (!chev) return;
        row.classList.toggle('is-open');
      });
    });
  }

  /* ---------------- toasts ---------------- */
  function toast(root) {
    $$('[data-toast-stack]', root).forEach(stack => {
      $$('[data-toast-trigger]', root).forEach(btn => {
        btn.addEventListener('click', () => spawn(btn.dataset.toastTrigger));
      });

      function spawn(kind) {
        const map = {
          success: { ico: 'M5 12l5 5L20 7', cls: 'ui-toast-success', text: 'Saved successfully.' },
          error:   { ico: 'M18 6 6 18M6 6l12 12', cls: 'ui-toast-error', text: 'Something went wrong.' },
          info:    { ico: 'M12 16v-4M12 8h.01', cls: 'ui-toast-info', text: 'Heads up — new version.' }
        };
        const cfg = map[kind] || map.info;
        const el = document.createElement('div');
        el.className = `ui-toast ${cfg.cls}`;
        el.innerHTML = `
          <span class="ui-toast-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">${kind === 'info' ? '<circle cx="12" cy="12" r="10"/><path d="' + cfg.ico + '"/></svg>' : '<path d="' + cfg.ico + '"/></svg>'}</span>
          <div style="flex:1"><div style="font-weight:600">${cfg.text}</div></div>
          <button class="ui-toast-x" aria-label="Dismiss"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
          <div class="ui-toast-progress"></div>
        `;
        stack.appendChild(el);

        const dismiss = () => {
          el.classList.add('is-leaving');
          setTimeout(() => el.remove(), 250);
        };
        $('.ui-toast-x', el).addEventListener('click', dismiss);
        setTimeout(dismiss, 3000);
      }
    });
  }

  /* ---------------- command palette ---------------- */
  function commandPalette(root) {
    $$('[data-cmd]', root).forEach(cmd => {
      const input = $('[data-cmd-input]', cmd);
      const items = $$('[data-cmd-item]', cmd);
      let active = 0;

      const visible = () => items.filter(i => !i.hidden);

      const paint = () => {
        items.forEach(i => i.classList.remove('is-active'));
        const vis = visible();
        if (vis[active]) vis[active].classList.add('is-active');
      };

      input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        items.forEach(i => i.hidden = !i.textContent.toLowerCase().includes(q));
        active = 0;
        paint();
      });

      input.addEventListener('keydown', e => {
        const vis = visible();
        if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % vis.length; paint(); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); active = (active - 1 + vis.length) % vis.length; paint(); }
      });

      items.forEach(i => i.addEventListener('click', () => {
        input.value = i.textContent.trim();
      }));

      paint();
    });
  }

  /* ---------------- notifications ---------------- */
  function notifications(root) {
    $$('[data-notifs]', root).forEach(list => {
      list.addEventListener('click', e => {
        const x = e.target.closest('.ui-notif-x');
        if (!x) return;
        const item = x.closest('.ui-notif');
        item.style.transition = 'opacity .2s, transform .2s';
        item.style.opacity = '0';
        item.style.transform = 'translateX(20px)';
        setTimeout(() => item.remove(), 200);
      });
    });
  }

  /* ---------------- chat ---------------- */
  function chat(root) {
    $$('[data-chat]', root).forEach(box => {
      const form  = $('[data-chat-form]', box);
      const input = $('[data-chat-input]', box);
      const body  = $('[data-chat-body]', box);

      form.addEventListener('submit', e => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        const el = document.createElement('div');
        el.className = 'ui-msg is-me';
        el.innerHTML = `
          <div class="ui-avatar ui-avatar-xs">Y</div>
          <div>
            <div class="ui-msg-bubble">${escapeHtml(text)}</div>
            <span class="ui-msg-time">just now</span>
          </div>
        `;
        body.appendChild(el);
        body.scrollTop = body.scrollHeight;
        input.value = '';
      });
    });
  }

  /* ---------------- wizard ---------------- */
  function wizard(root) {
    $$('[data-wizard]', root).forEach(wiz => {
      const steps  = $$('[data-step]', wiz);
      const inds   = $$('[data-step-ind]', wiz);
      const back   = $('[data-wiz-back]', wiz);
      const next   = $('[data-wiz-next]', wiz);
      let current = 1;

      const paint = () => {
        steps.forEach(s => s.hidden = Number(s.dataset.step) !== current);
        inds.forEach(i => {
          const n = Number(i.dataset.stepInd);
          i.classList.toggle('is-active', n === current);
          i.classList.toggle('is-done',   n < current);
        });
        back.style.visibility = current === 1 ? 'hidden' : 'visible';
        next.textContent = current === steps.length ? 'Finish' : 'Continue';
      };

      back.addEventListener('click', () => { if (current > 1) { current--; paint(); } });
      next.addEventListener('click', () => { if (current < steps.length) { current++; paint(); } });

      paint();
    });
  }

  /* ---------------- search ---------------- */
  function search(root) {
    $$('[data-search]', root).forEach(wrap => {
      const input = $('[data-search-input]', wrap);
      const items = $$('[data-search-item]', wrap);
      const empty = $('[data-search-empty]', wrap);

      input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        let hits = 0;
        items.forEach(i => {
          const match = i.dataset.searchItem.toLowerCase().includes(q);
          i.hidden = !match;
          if (match) hits++;
        });
        if (empty) empty.hidden = hits !== 0;
      });
    });
  }

  /* ---------------- sortable list ---------------- */
  function sortable(root) {
    $$('[data-sortable]', root).forEach(list => {
      let dragged = null;

      $$('li[draggable="true"]', list).forEach(li => {
        li.addEventListener('dragstart', () => { dragged = li; li.style.opacity = '.4'; });
        li.addEventListener('dragend',   () => { li.style.opacity = ''; dragged = null; });
        li.addEventListener('dragover',  e => {
          e.preventDefault();
          if (!dragged || dragged === li) return;
          const rect = li.getBoundingClientRect();
          const after = (e.clientY - rect.top) / rect.height > .5;
          list.insertBefore(dragged, after ? li.nextSibling : li);
        });
      });
    });
  }

  /* ---------------- copy field ---------------- */
  function copyField(root) {
    $$('[data-copy-field]', root).forEach(wrap => {
      const btn = $('[data-copy-btn]', wrap);
      const input = $('input', wrap);
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(input.value);
          const original = btn.innerHTML;
          btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg>';
          btn.style.color = 'var(--green)';
          setTimeout(() => { btn.innerHTML = original; btn.style.color = ''; }, 1600);
        } catch (e) { /* noop */ }
      });
    });
  }

  /* ---------------- theme switch ---------------- */
  function themeSwitch(root) {
    $$('[data-theme-switch]', root).forEach(group => {
      const buttons = $$('[data-theme-value]', group);

      const sync = () => {
        const current = document.documentElement.dataset.theme || 'dark';
        buttons.forEach(b => b.classList.toggle('is-active', b.dataset.themeValue === current));
      };

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.themeValue;
          if (val === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
          } else {
            document.documentElement.dataset.theme = val;
          }
          try { localStorage.setItem('openui-theme', val); } catch (e) {}
          sync();
        });
      });

      sync();
    });
  }

  /* ---------------- helpers ---------------- */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  /* ---------------- public API ---------------- */
  window.Plugins = {
    buttonGroup, loadingButton, passwordToggle, otp, tags, fileDrop,
    range, colorPicker, rating, chips, tabs, accordion,
    modal, drawer, menu, popover, contextMenu,
    table, kanban, calendar, tree, toast,
    commandPalette, notifications, chat, wizard, search, sortable,
    copyField, themeSwitch,

    /** Initialize every plugin against a root element. */
    init(root = document) {
      this.buttonGroup(root);
      this.loadingButton(root);
      this.passwordToggle(root);
      this.otp(root);
      this.tags(root);
      this.fileDrop(root);
      this.range(root);
      this.colorPicker(root);
      this.rating(root);
      this.chips(root);
      this.tabs(root);
      this.accordion(root);
      this.modal(root);
      this.drawer(root);
      this.menu(root);
      this.popover(root);
      this.contextMenu(root);
      this.table(root);
      this.kanban(root);
      this.calendar(root);
      this.tree(root);
      this.toast(root);
      this.commandPalette(root);
      this.notifications(root);
      this.chat(root);
      this.wizard(root);
      this.search(root);
      this.sortable(root);
      this.copyField(root);
      this.themeSwitch(root);
    }
  };
})();