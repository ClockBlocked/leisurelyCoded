/* ============================================================
   core.js — grid, mode toggle, spinner, search, theme, palette
   ============================================================ */

(function () {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const state = { query: '', tier: 'all' };

  document.addEventListener('DOMContentLoaded', () => {
    applyStoredTheme();
    buildSidebar();
    renderGrid();
    wireSearch();
    wireTierFilter();
    wireSidebar();
    wireThemeToggle();
    wireCommandPalette();
    wireGlobalShortcuts();
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
    const byCat = new Map();
    window.UI_REGISTRY.forEach(c => {
      if (!byCat.has(c.category)) byCat.set(c.category, []);
      byCat.get(c.category).push(c);
    });
    nav.innerHTML = '';
    byCat.forEach((comps, cat) => {
      const group = document.createElement('div');
      group.className = 'sb-group';
      group.innerHTML = `<div class="sb-heading">${cat}</div>`;
      const list = document.createElement('ul');
      list.className = 'sb-list';
      comps.forEach(c => {
        const li = document.createElement('li');
        li.dataset.tier = c.tier;
        li.innerHTML = `<a class="sb-link" href="#card-${c.id}">
          <span>${c.name}</span>${c.tier === 'pro' ? '<span class="sb-pro">Pro</span>' : ''}
        </a>`;
        list.appendChild(li);
      });
      group.appendChild(list);
      nav.appendChild(group);
    });
    nav.addEventListener('click', e => {
      const a = e.target.closest('.sb-link');
      if (!a) return;
      $$('.sb-link.is-active').forEach(el => el.classList.remove('is-active'));
      a.classList.add('is-active');
      document.body.classList.remove('sidebar-open');
    });
  }
  function wireSidebar() {
    $('#sidebarToggle')?.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
    $('#sidebarScrim')?.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
  }

  /* ---------------- grid ---------------- */
  function renderGrid() {
    const grid = $('#componentGrid');
    if (!grid) return;
    grid.innerHTML = '';
    filtered().forEach(c => grid.appendChild(makeCard(c)));
    updateCount();
    updateEmpty();
    observeCards();
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    return window.UI_REGISTRY.filter(c => {
      if (state.tier !== 'all' && c.tier !== state.tier) return false;
      if (!q) return true;
      return (c.name + ' ' + c.category + ' ' + c.description).toLowerCase().includes(q);
    });
  }

  function makeCard(comp) {
    const article = document.createElement('article');
    article.className = 'showcase-card';
    article.id = 'card-' + comp.id;
    article.dataset.tier = comp.tier;
    article.dataset.mode = 'view';
    article._comp = comp;

    article.innerHTML = `
      <div class="card-head">
        <div class="card-meta">
          <span class="card-category">${comp.category}</span>
          <h3 class="card-title">${comp.name}</h3>
          <p class="card-desc">${comp.description}</p>
        </div>
        <div class="card-head-actions">
          <button class="icon-btn card-open-btn" data-open-viewer title="Open in new window" aria-label="Open in new window">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>
            </svg>
          </button>
          <span class="card-tier ${comp.tier}">${comp.tier === 'pro' ? 'Pro' : 'Free'}</span>
        </div>
      </div>

      <div class="card-stage">
        <div class="mode-toggle" data-mode-toggle>
          <button class="mode-btn is-active" data-mode-btn="view">View</button>
          <button class="mode-btn" data-mode-btn="code">Code</button>
        </div>

        <div class="stage-pane stage-view" data-view>
          <div class="preview-skeleton">
            <div class="ui-skel ui-skel-title"></div>
            <div class="ui-skel ui-skel-text"></div>
            <div class="ui-skel ui-skel-text" style="width:60%"></div>
          </div>
        </div>

        <div class="stage-pane stage-code" data-code hidden>
          <div class="code-block-container">
            <div class="code-toolbar">
              <div class="code-tabs">
                <button class="code-tab is-active" data-code-tab="html">HTML</button>
                <button class="code-tab" data-code-tab="js" hidden>JS</button>
              </div>
              <button class="copy-code-btn" data-copy>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                <span>Copy</span>
              </button>
            </div>
            <pre class="code-pre" data-code="html"><code></code></pre>
            <pre class="code-pre" data-code="js" hidden><code></code></pre>
          </div>
        </div>

        <div class="stage-loader" data-loader hidden>
          <div class="loader-spinner"></div>
        </div>
      </div>
    `;

    // mode toggle
    const toggle = $('[data-mode-toggle]', article);
    toggle.addEventListener('click', e => {
      const btn = e.target.closest('[data-mode-btn]');
      if (!btn) return;
      switchMode(article, btn.dataset.modeBtn);
    });

    // code tabs
    const tabs = $$('.code-tab', article);
    const panels = $$('.code-pre', article);
    tabs.forEach(t => t.addEventListener('click', () => {
      const name = t.dataset.codeTab;
      tabs.forEach(x => x.classList.toggle('is-active', x === t));
      panels.forEach(p => p.hidden = p.dataset.code !== name);
    }));

    // copy
    $('[data-copy]', article).addEventListener('click', async e => {
      const btn = e.currentTarget;
      const activeTab = $('.code-tab.is-active', article);
      const which = activeTab ? activeTab.dataset.codeTab : 'html';
      const panel = $(`.code-pre[data-code="${which}"]`, article);
      try {
        await navigator.clipboard.writeText(panel.innerText);
        btn.classList.add('is-copied');
        btn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.querySelector('span').textContent = 'Copy';
        }, 1600);
      } catch {}
    });

    // open viewer
    $('[data-open-viewer]', article).addEventListener('click', () => {
      openViewer(comp);
    });

    return article;
  }

  /* ---------------- lazy load previews ---------------- */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      observer.unobserve(card);
      if (!card.dataset.previewLoaded) {
        loadPreview(card);
      }
    });
  }, { rootMargin: '250px 0px' });

  function observeCards() {
    $$('.showcase-card').forEach(card => observer.observe(card));
  }

  async function loadPreview(card) {
    const view = $('[data-view]', card);
    const comp = card._comp;
    try {
      const payload = await window.Loader.fetch(comp.path);
      card._payload = payload;
      view.innerHTML = '';
      window.Loader.inject(view, payload);
      card.dataset.previewLoaded = 'true';

      // Prefill code panels so switching is instant
      const htmlPre = $('.code-pre[data-code="html"] code', card);
      const jsPre   = $('.code-pre[data-code="js"] code', card);
      htmlPre.textContent = payload.html;
      if (payload.js) {
        jsPre.textContent = payload.js;
        $('.code-tab[data-code-tab="js"]', card).hidden = false;
      }
    } catch (err) {
      view.innerHTML = `<p style="color:var(--red);font-size:13px">Failed to load component.</p>`;
      console.error(err);
    }
  }

  /* ---------------- mode switching with spinner ---------------- */
  async function switchMode(card, newMode) {
    if (card.dataset.mode === newMode) return;
    if (card.dataset.switching === 'true') return;

    card.dataset.switching = 'true';

    const loader   = $('[data-loader]', card);
    const viewPane = $('[data-view]', card);
    const codePane = $('[data-code]', card);

    loader.hidden = false;

    const minWait = 600 + Math.random() * (1750 - 600);

    const ensureLoaded = (async () => {
      if (!card.dataset.previewLoaded) await loadPreview(card);
    })();

    await Promise.all([ensureLoaded, new Promise(r => setTimeout(r, minWait))]);

    if (newMode === 'code') {
      viewPane.hidden = true;
      codePane.hidden = false;
    } else {
      viewPane.hidden = false;
      codePane.hidden = true;
    }

    $$('[data-mode-btn]', card).forEach(b => {
      b.classList.toggle('is-active', b.dataset.modeBtn === newMode);
    });

    card.dataset.mode = newMode;
    loader.hidden = true;
    card.dataset.switching = 'false';
  }

  /* ---------------- viewer ---------------- */
  function openViewer(comp) {
    const absolute = new URL(comp.path, document.baseURI).href;
    const qs = new URLSearchParams({
      src: absolute,
      name: comp.name,
      id: comp.id
    });
    window.open(`components/viewer.html?${qs}`, '_blank', 'noopener');
  }

  /* ---------------- counts / empty ---------------- */
  function updateCount() {
    const el = $('#resultCount');
    if (el) el.textContent = `${filtered().length} of ${window.UI_REGISTRY.length}`;
  }
  function updateEmpty() {
    const empty = $('#emptySearch');
    if (empty) empty.hidden = filtered().length !== 0;
  }

  /* ---------------- search / filter ---------------- */
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
    $('#clearSearch')?.addEventListener('click', () => {
      input.value = '';
      state.query = '';
      renderGrid();
      syncHeading();
    });
  }
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
        !query || (c.name + ' ' + c.category + ' ' + c.description).toLowerCase().includes(query)
      ).slice(0, 40);
      list.innerHTML = items.map((c, i) => `
        <li class="cmd-list-item ${i === 0 ? 'is-active' : ''}" data-id="${c.id}">
          <span class="cmd-cat">${c.category}</span>
          <span class="cmd-name">${c.name}</span>
          ${c.tier === 'pro' ? '<span class="sb-pro">Pro</span>' : ''}
        </li>`).join('') || '<li class="cmd-empty">No matches</li>';
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

    trigger?.addEventListener('click', open);
    $('#cmdClose')?.addEventListener('click', close);
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

  /* ---------------- misc ---------------- */
  function wireGlobalShortcuts() {
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        $('#componentSearch')?.focus();
      }
    });
  }
  function wireScrollButtons() {
    $$('[data-scroll]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelector(btn.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }
})();
