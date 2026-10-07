/* ============================================================
   core.js — site shell: grid, search, theme, command palette
   ============================================================ */

(function () {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------------- state ---------------- */
  const state = {
    query: '',
    tier: 'all'
  };

  /* ---------------- boot ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    applyStoredTheme();
    buildSidebar();
    renderGrid();
    wireSearch();
    wireTierFilter();
    wireSidebar();
    wireThemeToggle();
    wireCommandPalette();
    wireCollapseAll();
    wireGlobalShortcuts();
    wireModalButtons();
    wireScrollButtons();
  });

  /* ---------------- theme ---------------- */
  function applyStoredTheme() {
    let stored = null;
    try { stored = localStorage.getItem('openui-theme'); } catch (e) {}

    if (stored === 'light' || stored === 'dark') {
      document.documentElement.dataset.theme = stored;
      return;
    }
    // default: respect system, fall back to dark
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
  }

  function wireThemeToggle() {
    const btn = $('#themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('openui-theme', next); } catch (e) {}
    });
  }

  /* ---------------- sidebar ---------------- */
  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;

    const categories = [];
    const seen = new Map();
    window.UI_REGISTRY.forEach(c => {
      if (!seen.has(c.category)) {
        seen.set(c.category, []);
        categories.push(c.category);
      }
      seen.get(c.category).push(c);
    });

    nav.innerHTML = '';
    categories.forEach(cat => {
      const group = document.createElement('div');
      group.className = 'sb-group';
      group.dataset.category = cat;

      const heading = document.createElement('div');
      heading.className = 'sb-heading';
      heading.textContent = cat;
      group.appendChild(heading);

      const list = document.createElement('ul');
      list.className = 'sb-list';

      seen.get(cat).forEach(comp => {
        const li = document.createElement('li');
        li.dataset.tier = comp.tier;
        li.dataset.id = comp.id;
        const a = document.createElement('a');
        a.href = '#card-' + comp.id;
        a.className = 'sb-link';
        a.innerHTML = `<span>${comp.name}</span>${comp.tier === 'pro' ? '<span class="sb-pro">Pro</span>' : ''}`;
        li.appendChild(a);
        list.appendChild(li);
      });

      group.appendChild(list);
      nav.appendChild(group);
    });

    // click a link → scroll to card + highlight
    nav.addEventListener('click', e => {
      const a = e.target.closest('.sb-link');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const card = document.getElementById(id);
      if (!card) return;
      document.querySelectorAll('.sb-link.is-active').forEach(el => el.classList.remove('is-active'));
      a.classList.add('is-active');
      // close mobile drawer
      document.body.classList.remove('sidebar-open');
    });
  }

  function wireSidebar() {
    const toggle = $('#sidebarToggle');
    const scrim  = $('#sidebarScrim');
    if (toggle) toggle.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
    if (scrim)  scrim.addEventListener('click',  () => document.body.classList.remove('sidebar-open'));
  }

  /* ---------------- grid rendering ---------------- */
  function renderGrid() {
    const grid = $('#componentGrid');
    if (!grid) return;
    grid.innerHTML = '';

    filtered().forEach(comp => {
      grid.appendChild(makeCard(comp));
    });

    updateCount();
    updateEmpty();
    // run plugins against the whole grid once
    if (window.Plugins) window.Plugins.init(grid);
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    return window.UI_REGISTRY.filter(c => {
      if (state.tier !== 'all' && c.tier !== state.tier) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }

  function makeCard(comp) {
    const article = document.createElement('article');
    article.className = 'showcase-card';
    article.id = 'card-' + comp.id;
    article.dataset.tier = comp.tier;
    article.dataset.category = comp.category;

    const codeText = comp.js ? `${comp.html}\n\n<script>\n${comp.js}\n<\/script>` : comp.html;
    const escaped = escapeHtml(codeText);

    article.innerHTML = `
      <div class="card-head">
        <div class="card-meta">
          <span class="card-category">${comp.category}</span>
          <h3 class="card-title">${comp.name}</h3>
          <p class="card-desc">${comp.description}</p>
        </div>
        <span class="card-tier ${comp.tier}">${comp.tier === 'pro' ? 'Pro' : 'Free'}</span>
      </div>

      <div class="component-preview-area" data-preview>
        ${comp.html}
      </div>

      <div class="code-block-container">
        <div class="code-toolbar">
          <div class="code-tabs">
            <button class="code-tab is-active" data-code-tab="html">HTML</button>
            ${comp.js ? '<button class="code-tab" data-code-tab="js">JS</button>' : ''}
          </div>
          <button class="copy-code-btn" data-copy aria-label="Copy code">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
            <span>Copy</span>
          </button>
        </div>

        <pre class="code-pre" data-code="html"><code>${escaped}</code></pre>
        ${comp.js ? `<pre class="code-pre" data-code="js" hidden><code>${escapeHtml(comp.js)}</code></pre>` : ''}
      </div>
    `;

    // code tabs
    const tabs   = $$('.code-tab', article);
    const panels = $$('.code-pre', article);
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.codeTab;
        tabs.forEach(t => t.classList.toggle('is-active', t === tab));
        panels.forEach(p => p.hidden = p.dataset.code !== name);
      });
    });

    // copy button
    const copyBtn = $('[data-copy]', article);
    copyBtn.addEventListener('click', async () => {
      const activeTab = $('.code-tab.is-active', article);
      const which = activeTab ? activeTab.dataset.codeTab : 'html';
      const panel = $(`.code-pre[data-code="${which}"]`, article);
      const text = panel ? panel.innerText : comp.html;

      try {
        await navigator.clipboard.writeText(text);
        copyBtn.classList.add('is-copied');
        copyBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('is-copied');
          copyBtn.querySelector('span').textContent = 'Copy';
        }, 1600);
      } catch (err) {
        copyBtn.querySelector('span').textContent = 'Failed';
      }
    });

    return article;
  }

  function updateCount() {
    const el = $('#resultCount');
    if (!el) return;
    const n = filtered().length;
    el.textContent = `${n} of ${window.UI_REGISTRY.length}`;
  }

  function updateEmpty() {
    const empty = $('#emptySearch');
    if (!empty) return;
    empty.hidden = filtered().length !== 0;
  }

  /* ---------------- search ---------------- */
  function wireSearch() {
    const input = $('#componentSearch');
    if (!input) return;

    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.query = input.value;
        renderGrid();
        syncHeading();
      }, 90);
    });

    const clear = $('#clearSearch');
    if (clear) clear.addEventListener('click', () => {
      input.value = '';
      state.query = '';
      renderGrid();
      syncHeading();
    });
  }

  /* ---------------- tier filter ---------------- */
  function wireTierFilter() {
    const group = $('#tierFilter');
    if (!group) return;
    group.addEventListener('click', e => {
      const btn = e.target.closest('.seg-item');
      if (!btn) return;
      $$('.seg-item', group).forEach(b => b.classList.toggle('is-active', b === btn));
      state.tier = btn.dataset.tier;
      renderGrid();
      syncHeading();
    });
  }

  function syncHeading() {
    const h = $('#gridHeading');
    if (!h) return;
    const parts = [];
    if (state.tier !== 'all') parts.push(state.tier === 'pro' ? 'Pro' : 'Free');
    parts.push('components');
    if (state.query) parts.push(`matching “${state.query}”`);
    h.textContent = parts.join(' ');
  }

  /* ---------------- collapse all ---------------- */
  function wireCollapseAll() {
    const btn = $('#collapseAll');
    if (!btn) return;
    let collapsed = false;
    btn.addEventListener('click', () => {
      collapsed = !collapsed;
      $$('.code-block-container').forEach(el => {
        el.style.display = collapsed ? 'none' : '';
      });
      btn.textContent = collapsed ? 'Show code' : 'Collapse code';
    });
  }

  /* ---------------- command palette ---------------- */
  function wireCommandPalette() {
    const overlay = $('#cmdOverlay');
    const input   = $('#cmdInput');
    const list    = $('#cmdList');
    const trigger = $('#commandTrigger');
    if (!overlay || !input || !list) return;

    let active = 0;

    function build(q = '') {
      const query = q.trim().toLowerCase();
      const items = window.UI_REGISTRY.filter(c =>
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      ).slice(0, 40);

      list.innerHTML = items.map((c, i) => `
        <li class="cmd-list-item ${i === 0 ? 'is-active' : ''}" data-id="${c.id}">
          <span class="cmd-cat">${c.category}</span>
          <span class="cmd-name">${c.name}</span>
          ${c.tier === 'pro' ? '<span class="sb-pro">Pro</span>' : ''}
        </li>
      `).join('') || '<li class="cmd-empty">No matches</li>';

      active = 0;
    }

    function open() {
      overlay.hidden = false;
      document.body.classList.add('no-scroll');
      input.value = '';
      build('');
      setTimeout(() => input.focus(), 10);
    }

    function close() {
      overlay.hidden = true;
      document.body.classList.remove('no-scroll');
    }

    function jump(id) {
      close();
      const card = document.getElementById('card-' + id);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        card.classList.add('is-flash');
        setTimeout(() => card.classList.remove('is-flash'), 1200);
      }
    }

    if (trigger) trigger.addEventListener('click', open);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    input.addEventListener('input', () => build(input.value));
    input.addEventListener('keydown', e => {
      const items = $$('.cmd-list-item', list);
      if (!items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); active = (active - 1 + items.length) % items.length; }
      if (e.key === 'Enter')     { e.preventDefault(); jump(items[active].dataset.id); return; }
      items.forEach((el, i) => el.classList.toggle('is-active', i === active));
      items[active].scrollIntoView({ block: 'nearest' });
    });

    list.addEventListener('click', e => {
      const item = e.target.closest('.cmd-list-item');
      if (item) jump(item.dataset.id);
    });

    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        overlay.hidden ? open() : close();
      }
      if (e.key === 'Escape' && !overlay.hidden) close();
    });
  }

  /* ---------------- global shortcuts ---------------- */
  function wireGlobalShortcuts() {
    document.addEventListener('keydown', e => {
      // "/" focuses search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const input = $('#componentSearch');
        if (input) input.focus();
      }
    });
  }

  /* ---------------- modal buttons in hero ---------------- */
  function wireModalButtons() {
    $$('[data-open-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.openModal;
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  /* ---------------- hero scroll buttons ---------------- */
  function wireScrollButtons() {
    $$('[data-scroll]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.querySelector(btn.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ---------------- helpers ---------------- */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message, kind = 'info') {
    const region = $('#toastRegion');
    if (!region) return;
    const el = document.createElement('div');
    el.className = `ui-toast ui-toast-${kind}`;
    el.innerHTML = `
      <span class="ui-toast-ico">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="m5 12 5 5L20 7"/>
        </svg>
      </span>
      <div style="flex:1">${escapeHtml(message)}</div>
    `;
    region.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 250);
    }, 2600);
  }
})();