/* ============================================================
   registry.js — every component the site ships
   Each entry: { id, name, category, tier, description, html, js? }
   ============================================================ */

window.UI_REGISTRY = [

/* ---------------------------------------------------------------
   BUTTONS
   --------------------------------------------------------------- */
{
  id: 'primary-button',
  name: 'Primary Button',
  category: 'Buttons',
  tier: 'free',
  description: 'High-emphasis action button with spring-eased hover lift and glow.',
  html: `<button class="ui-btn ui-btn-primary">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
  Get started
</button>`
},
{
  id: 'button-variants',
  name: 'Button Variants',
  category: 'Buttons',
  tier: 'free',
  description: 'Solid, outline, ghost, soft, danger, success, and link styles.',
  html: `<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
  <button class="ui-btn ui-btn-primary">Primary</button>
  <button class="ui-btn ui-btn-outline">Outline</button>
  <button class="ui-btn ui-btn-ghost">Ghost</button>
  <button class="ui-btn ui-btn-soft">Soft</button>
  <button class="ui-btn ui-btn-success">Success</button>
  <button class="ui-btn ui-btn-danger">Danger</button>
  <button class="ui-btn ui-btn-link">Link</button>
</div>`
},
{
  id: 'button-sizes',
  name: 'Button Sizes',
  category: 'Buttons',
  tier: 'free',
  description: 'Small, default, and large scales that all share the same tokens.',
  html: `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center">
  <button class="ui-btn ui-btn-primary ui-btn-sm">Small</button>
  <button class="ui-btn ui-btn-primary">Default</button>
  <button class="ui-btn ui-btn-primary ui-btn-lg">Large</button>
</div>`
},
{
  id: 'button-group',
  name: 'Button Group',
  category: 'Buttons',
  tier: 'free',
  description: 'Segmented controls with merged radii and active state.',
  html: `<div class="ui-btn-group" data-btn-group>
  <button class="ui-btn ui-btn-outline is-active">Day</button>
  <button class="ui-btn ui-btn-outline">Week</button>
  <button class="ui-btn ui-btn-outline">Month</button>
  <button class="ui-btn ui-btn-outline">Year</button>
</div>`,
  js: `// Handled automatically by Plugins.buttonGroup(root)`
},
{
  id: 'button-loading',
  name: 'Loading Button',
  category: 'Buttons',
  tier: 'pro',
  description: 'In-button spinner that preserves width and colors on submit.',
  html: `<button class="ui-btn ui-btn-primary" data-loading-btn>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
  Submit order
</button>`,
  js: `const btn = document.querySelector('[data-loading-btn]');
btn.addEventListener('click', () => {
  btn.classList.add('is-loading');
  setTimeout(() => btn.classList.remove('is-loading'), 2000);
});`
},
{
  id: 'split-button',
  name: 'Split Button',
  category: 'Buttons',
  tier: 'pro',
  description: 'Primary action with an attached caret for secondary options.',
  html: `<div class="ui-split">
  <button class="ui-btn ui-btn-primary">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    Deploy
  </button>
  <button class="ui-btn ui-btn-primary" aria-label="More deploy options">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
  </button>
</div>`
},
{
  id: 'fab',
  name: 'Floating Action Button',
  category: 'Buttons',
  tier: 'pro',
  description: 'Circular CTA that rotates and scales on hover.',
  html: `<div style="display:flex;justify-content:center;padding:12px">
  <button class="ui-fab" aria-label="Create">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
  </button>
</div>`
},

/* ---------------------------------------------------------------
   FORMS
   --------------------------------------------------------------- */
{
  id: 'text-input',
  name: 'Text Input',
  category: 'Forms',
  tier: 'free',
  description: 'Labeled input with focus ring and helper text.',
  html: `<div style="width:100%;max-width:340px">
  <label class="ui-label" for="t1">Email address <span class="req">*</span></label>
  <input id="t1" class="ui-input" type="email" placeholder="you@example.com">
  <p class="ui-help">We'll never share your email.</p>
</div>`
},
{
  id: 'textarea',
  name: 'Textarea',
  category: 'Forms',
  tier: 'free',
  description: 'Resizable multi-line field with matching focus styles.',
  html: `<div style="width:100%;max-width:340px">
  <label class="ui-label" for="ta1">Message</label>
  <textarea id="ta1" class="ui-textarea" placeholder="Type your message…"></textarea>
</div>`
},
{
  id: 'select',
  name: 'Select',
  category: 'Forms',
  tier: 'free',
  description: 'Native select with a custom chevron drawn in CSS.',
  html: `<div style="width:100%;max-width:340px">
  <label class="ui-label" for="sel1">Framework</label>
  <select id="sel1" class="ui-select">
    <option>Vanilla JS</option>
    <option>React</option>
    <option>Vue</option>
    <option>Svelte</option>
  </select>
</div>`
},
{
  id: 'checkbox',
  name: 'Checkbox',
  category: 'Forms',
  tier: 'free',
  description: 'Accessible checkbox with animated checkmark pop.',
  html: `<div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:320px">
  <label class="ui-check">
    <input type="checkbox" checked>
    <span class="box">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>
    </span>
    <span>Email notifications</span>
  </label>
  <label class="ui-check">
    <input type="checkbox">
    <span class="box">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>
    </span>
    <span>SMS notifications</span>
  </label>
</div>`
},
{
  id: 'radio',
  name: 'Radio Group',
  category: 'Forms',
  tier: 'free',
  description: 'Radio buttons with an animated inner dot.',
  html: `<div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:320px">
  <label class="ui-check">
    <input type="radio" name="plan" checked>
    <span class="radio-circle"></span>
    <span>Monthly billing</span>
  </label>
  <label class="ui-check">
    <input type="radio" name="plan">
    <span class="radio-circle"></span>
    <span>Annual billing — save 20%</span>
  </label>
</div>`
},
{
  id: 'switch',
  name: 'Toggle Switch',
  category: 'Forms',
  tier: 'free',
  description: 'Pill switch with a spring-driven thumb.',
  html: `<div style="display:flex;flex-direction:column;gap:16px;width:100%;max-width:320px">
  <label class="ui-switch">
    <input type="checkbox" checked>
    <span class="track"></span>
    <span>Enable notifications</span>
  </label>
  <label class="ui-switch">
    <input type="checkbox">
    <span class="track"></span>
    <span>Dark mode</span>
  </label>
</div>`
},
{
  id: 'floating-label',
  name: 'Floating Label Input',
  category: 'Forms',
  tier: 'pro',
  description: 'Label shrinks and moves up when the field has content.',
  html: `<div style="width:100%;max-width:340px;display:flex;flex-direction:column;gap:16px">
  <div class="ui-float">
    <input class="ui-input" type="text" placeholder=" " id="fl1">
    <label for="fl1">Full name</label>
  </div>
  <div class="ui-float">
    <input class="ui-input" type="email" placeholder=" " id="fl2">
    <label for="fl2">Email address</label>
  </div>
</div>`
},
{
  id: 'input-icon',
  name: 'Input with Icon',
  category: 'Forms',
  tier: 'pro',
  description: 'Leading icon plus an optional trailing action button.',
  html: `<div style="width:100%;max-width:340px;display:flex;flex-direction:column;gap:14px">
  <div class="ui-input-wrap">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input class="ui-input" placeholder="Search…">
  </div>
  <div class="ui-input-wrap has-trail">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    <input class="ui-input" type="password" value="hunter2">
    <button class="trail-btn" data-toggle-pw aria-label="Toggle password">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
    </button>
  </div>
</div>`,
  js: `document.querySelector('[data-toggle-pw]').addEventListener('click', e => {
  const input = e.currentTarget.parentElement.querySelector('input');
  input.type = input.type === 'password' ? 'text' : 'password';
});`
},
{
  id: 'otp-input',
  name: 'OTP Input',
  category: 'Forms',
  tier: 'pro',
  description: 'One-time-code boxes that auto-advance and support paste.',
  html: `<div class="ui-otp" data-otp>
  <input maxlength="1" inputmode="numeric">
  <input maxlength="1" inputmode="numeric">
  <input maxlength="1" inputmode="numeric">
  <input maxlength="1" inputmode="numeric">
  <input maxlength="1" inputmode="numeric">
  <input maxlength="1" inputmode="numeric">
</div>`,
  js: `// Auto-wired by Plugins.otp(root)`
},
{
  id: 'tag-input',
  name: 'Tag Input',
  category: 'Forms',
  tier: 'pro',
  description: 'Type and press Enter to add removable chips.',
  html: `<div class="ui-tags" data-tags style="width:100%;max-width:340px">
  <span class="ui-tag">design<button aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>
  <span class="ui-tag">frontend<button aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>
  <input placeholder="Add tag…">
</div>`,
  js: `// Auto-wired by Plugins.tags(root)`
},
{
  id: 'file-drop',
  name: 'File Drop',
  category: 'Forms',
  tier: 'pro',
  description: 'Click or drag files in; shows a live file list.',
  html: `<label class="ui-drop" data-drop style="width:100%;max-width:340px">
  <input type="file" multiple>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5-5 5 5M12 5v12"/></svg>
  <strong>Drop files here</strong>
  <span>or click to browse</span>
  <ul class="file-list"></ul>
</label>`,
  js: `// Auto-wired by Plugins.fileDrop(root)`
},
{
  id: 'range-slider',
  name: 'Range Slider',
  category: 'Forms',
  tier: 'pro',
  description: 'Native range input restyled with a live readout.',
  html: `<div style="width:100%;max-width:340px">
  <div style="display:flex;justify-content:space-between;margin-bottom:8px">
    <label class="ui-label" for="rng" style="margin:0">Volume</label>
    <span class="mono" data-range-out style="font-size:13px;color:var(--text-2)">64</span>
  </div>
  <input id="rng" class="ui-range" type="range" min="0" max="100" value="64" data-range>
</div>`,
  js: `// Auto-wired by Plugins.range(root)`
},
{
  id: 'validation-states',
  name: 'Validation States',
  category: 'Forms',
  tier: 'pro',
  description: 'Error, success, and helper text patterns in one block.',
  html: `<div style="width:100%;max-width:340px;display:flex;flex-direction:column;gap:14px">
  <div>
    <label class="ui-label">Username</label>
    <input class="ui-input is-error" value="taken_name">
    <p class="ui-error-text">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      That username is already taken.
    </p>
  </div>
  <div>
    <label class="ui-label">Email</label>
    <input class="ui-input is-success" value="you@example.com">
    <p class="ui-help" style="color:var(--green)">Looks good.</p>
  </div>
</div>`
},
{
  id: 'color-picker',
  name: 'Color Picker',
  category: 'Forms',
  tier: 'pro',
  description: 'Swatch grid with a selected ring.',
  html: `<div style="display:flex;flex-direction:column;gap:10px" data-color-picker>
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    <button class="ui-swatch" data-color="#4c8dff" style="width:32px;height:32px;border-radius:50%;background:#4c8dff;border:2px solid var(--bg-elev);box-shadow:0 0 0 2px var(--accent)"></button>
    <button class="ui-swatch" data-color="#a371f7" style="width:32px;height:32px;border-radius:50%;background:#a371f7;border:2px solid var(--bg-elev)"></button>
    <button class="ui-swatch" data-color="#3fb950" style="width:32px;height:32px;border-radius:50%;background:#3fb950;border:2px solid var(--bg-elev)"></button>
    <button class="ui-swatch" data-color="#d29922" style="width:32px;height:32px;border-radius:50%;background:#d29922;border:2px solid var(--bg-elev)"></button>
    <button class="ui-swatch" data-color="#f85149" style="width:32px;height:32px;border-radius:50%;background:#f85149;border:2px solid var(--bg-elev)"></button>
    <button class="ui-swatch" data-color="#39c5cf" style="width:32px;height:32px;border-radius:50%;background:#39c5cf;border:2px solid var(--bg-elev)"></button>
  </div>
  <span class="mono" data-color-out style="font-size:13px;color:var(--text-2)">#4c8dff</span>
</div>`,
  js: `// Auto-wired by Plugins.colorPicker(root)`
},
{
  id: 'rating',
  name: 'Star Rating',
  category: 'Forms',
  tier: 'pro',
  description: 'Click-to-set stars with hover preview.',
  html: `<div style="display:flex;flex-direction:column;gap:8px;align-items:center" data-rating>
  <div class="ui-stars" style="font-size:0;gap:4px">
    <button data-star="1"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9z"/></svg></button>
    <button data-star="2"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9z"/></svg></button>
    <button data-star="3"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9z"/></svg></button>
    <button data-star="4"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9z"/></svg></button>
    <button data-star="5"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9z"/></svg></button>
  </div>
  <span data-rating-out style="font-size:13px;color:var(--text-2)">3 of 5</span>
</div>`,
  js: `// Auto-wired by Plugins.rating(root)`
},

/* ---------------------------------------------------------------
   DATA DISPLAY
   --------------------------------------------------------------- */
{
  id: 'badge',
  name: 'Badges',
  category: 'Data',
  tier: 'free',
  description: 'Status pills in every semantic color.',
  html: `<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
  <span class="ui-badge">Default</span>
  <span class="ui-badge ui-badge-primary">Primary</span>
  <span class="ui-badge ui-badge-success"><span class="ui-badge-dot"></span>Active</span>
  <span class="ui-badge ui-badge-warn">Pending</span>
  <span class="ui-badge ui-badge-danger">Error</span>
  <span class="ui-badge ui-badge-purple">Beta</span>
  <span class="ui-badge ui-badge-outline">Outline</span>
</div>`
},
{
  id: 'chip',
  name: 'Filter Chips',
  category: 'Data',
  tier: 'free',
  description: 'Clickable filter chips with an active state.',
  html: `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center" data-chips>
  <button class="ui-chip is-active">All</button>
  <button class="ui-chip">Design</button>
  <button class="ui-chip">Engineering</button>
  <button class="ui-chip">Marketing</button>
</div>`
},
{
  id: 'avatar',
  name: 'Avatars',
  category: 'Data',
  tier: 'free',
  description: 'Sizes plus square variant with initials fallback.',
  html: `<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center">
  <div class="ui-avatar ui-avatar-xs">AB</div>
  <div class="ui-avatar ui-avatar-sm">CD</div>
  <div class="ui-avatar">EF</div>
  <div class="ui-avatar ui-avatar-lg">GH</div>
  <div class="ui-avatar ui-avatar-xl ui-avatar-square">IJ</div>
</div>`
},
{
  id: 'avatar-group',
  name: 'Avatar Group',
  category: 'Data',
  tier: 'pro',
  description: 'Stacked avatars with overlap and hover lift.',
  html: `<div style="display:flex;justify-content:center">
  <div class="ui-avatar-group">
    <div class="ui-avatar" style="background:linear-gradient(135deg,#4c8dff,#a371f7)">AL</div>
    <div class="ui-avatar" style="background:linear-gradient(135deg,#3fb950,#39c5cf)">BK</div>
    <div class="ui-avatar" style="background:linear-gradient(135deg,#d29922,#f85149)">CM</div>
    <div class="ui-avatar" style="background:linear-gradient(135deg,#db61a2,#a371f7)">DR</div>
    <div class="ui-avatar" style="background:var(--surface-3);color:var(--text-2)">+5</div>
  </div>
</div>`
},
{
  id: 'avatar-status',
  name: 'Avatar with Status',
  category: 'Data',
  tier: 'pro',
  description: 'Presence dots for online, away, busy, and offline.',
  html: `<div style="display:flex;gap:18px;justify-content:center;align-items:center">
  <div class="ui-avatar ui-avatar-lg ui-status" style="background:linear-gradient(135deg,#3fb950,#39c5cf)">A</div>
  <div class="ui-avatar ui-avatar-lg ui-status is-away" style="background:linear-gradient(135deg,#d29922,#db61a2)">B</div>
  <div class="ui-avatar ui-avatar-lg ui-status is-busy" style="background:linear-gradient(135deg,#f85149,#db61a2)">C</div>
  <div class="ui-avatar ui-avatar-lg ui-status is-offline" style="background:linear-gradient(135deg,#6e7681,#30363d)">D</div>
</div>`
},
{
  id: 'card',
  name: 'Card',
  category: 'Data',
  tier: 'free',
  description: 'Header, body, and footer with a hover lift.',
  html: `<div class="ui-card ui-card-hover" style="width:100%;max-width:340px">
  <div class="ui-card-head">
    <div>
      <div class="ui-card-title">Project Aurora</div>
      <div class="ui-card-sub">Updated 2 hours ago</div>
    </div>
    <span class="ui-badge ui-badge-success">Active</span>
  </div>
  <div class="ui-card-body">
    A design system project with 62 components and a tiny JS footprint.
  </div>
  <div class="ui-card-foot">
    <button class="ui-btn ui-btn-ghost ui-btn-sm">Dismiss</button>
    <button class="ui-btn ui-btn-primary ui-btn-sm">Open</button>
  </div>
</div>`
},
{
  id: 'stat-card',
  name: 'Stat Cards',
  category: 'Data',
  tier: 'free',
  description: 'KPI tiles with delta indicators.',
  html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:400px">
  <div class="ui-stat">
    <span class="ui-stat-label">Revenue</span>
    <span class="ui-stat-value">$48.2k</span>
    <span class="ui-stat-delta up">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M7 14l5-5 5 5M12 9v12"/></svg>
      12.4%
    </span>
  </div>
  <div class="ui-stat">
    <span class="ui-stat-label">Churn</span>
    <span class="ui-stat-value">2.1%</span>
    <span class="ui-stat-delta down">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M7 10l5 5 5-5M12 15V3"/></svg>
      0.3%
    </span>
  </div>
</div>`
},
{
  id: 'data-table',
  name: 'Sortable Data Table',
  category: 'Data',
  tier: 'pro',
  description: 'Click any header to sort the rows.',
  html: `<div class="ui-table-wrap" data-table style="width:100%">
  <table class="ui-table">
    <thead>
      <tr>
        <th class="is-sortable" data-sort="name">Name <span class="sort-ind">↕</span></th>
        <th class="is-sortable" data-sort="role">Role <span class="sort-ind">↕</span></th>
        <th class="is-sortable" data-sort="status">Status <span class="sort-ind">↕</span></th>
      </tr>
    </thead>
    <tbody>
      <tr><td><strong>Alice Nguyen</strong></td><td>Designer</td><td><span class="ui-badge ui-badge-success">Active</span></td></tr>
      <tr><td><strong>Ben Kaur</strong></td><td>Engineer</td><td><span class="ui-badge ui-badge-warn">Away</span></td></tr>
      <tr><td><strong>Cara Diaz</strong></td><td>PM</td><td><span class="ui-badge ui-badge-success">Active</span></td></tr>
      <tr><td><strong>Devon Park</strong></td><td>Engineer</td><td><span class="ui-badge ui-badge-danger">Offline</span></td></tr>
    </tbody>
  </table>
</div>`,
  js: `// Auto-wired by Plugins.table(root)`
},
{
  id: 'timeline',
  name: 'Timeline',
  category: 'Data',
  tier: 'free',
  description: 'Vertical event log with done and idle states.',
  html: `<div class="ui-timeline" style="width:100%;max-width:340px">
  <div class="ui-tl-item is-done">
    <div class="ui-tl-time">09:14</div>
    <div class="ui-tl-title">Order placed</div>
    <div class="ui-tl-desc">Payment confirmed via card ending 4242.</div>
  </div>
  <div class="ui-tl-item is-done">
    <div class="ui-tl-time">11:02</div>
    <div class="ui-tl-title">Packed</div>
    <div class="ui-tl-desc">Warehouse scanned 3 items.</div>
  </div>
  <div class="ui-tl-item">
    <div class="ui-tl-time">In progress</div>
    <div class="ui-tl-title">Out for delivery</div>
    <div class="ui-tl-desc">Courier is 4 stops away.</div>
  </div>
  <div class="ui-tl-item is-idle">
    <div class="ui-tl-time">Pending</div>
    <div class="ui-tl-title">Delivered</div>
  </div>
</div>`
},
{
  id: 'file-tree',
  name: 'File Tree',
  category: 'Data',
  tier: 'pro',
  description: 'Collapsible folders with an active file state.',
  html: `<div class="ui-tree" data-tree style="width:100%;max-width:300px">
  <div class="ui-tree-row is-open"><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>src</div>
  <div class="ui-tree-children">
    <div class="ui-tree-row"><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>css</div>
    <div class="ui-tree-children">
      <div class="ui-tree-row is-active"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>core.css<span class="ui-tree-size">4.2kb</span></div>
      <div class="ui-tree-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>layout.css<span class="ui-tree-size">2.1kb</span></div>
    </div>
    <div class="ui-tree-row"><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>js</div>
    <div class="ui-tree-children">
      <div class="ui-tree-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>core.js<span class="ui-tree-size">3.8kb</span></div>
    </div>
  </div>
</div>`,
  js: `// Auto-wired by Plugins.tree(root)`
},
{
  id: 'calendar',
  name: 'Calendar',
  category: 'Data',
  tier: 'pro',
  description: 'Month grid with today, selected, and event dots.',
  html: `<div class="ui-cal" data-cal style="width:100%;max-width:320px">
  <div class="ui-cal-head">
    <button class="icon-btn" data-cal-prev aria-label="Previous month">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <div class="ui-cal-title" data-cal-title>March 2025</div>
    <button class="icon-btn" data-cal-next aria-label="Next month">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>
    </button>
  </div>
  <div class="ui-cal-grid" data-cal-grid></div>
</div>`,
  js: `// Auto-wired by Plugins.calendar(root)`
},
{
  id: 'kanban',
  name: 'Kanban Board',
  category: 'Data',
  tier: 'pro',
  description: 'Drag cards between columns. Fully HTML5 drag and drop.',
  html: `<div class="ui-kanban" data-kanban style="width:100%">
  <div class="ui-kb-col" data-col>
    <div class="ui-kb-head">To Do <span class="ui-kb-count">2</span></div>
    <div class="ui-kb-card" draggable="true"><strong>Fix login bug</strong><span>Reported by 3 users</span></div>
    <div class="ui-kb-card" draggable="true"><strong>Write release notes</strong><span>v1.0.4</span></div>
  </div>
  <div class="ui-kb-col" data-col>
    <div class="ui-kb-head">Doing <span class="ui-kb-count">1</span></div>
    <div class="ui-kb-card" draggable="true"><strong>Redesign pricing</strong><span>Draft in Figma</span></div>
  </div>
  <div class="ui-kb-col" data-col>
    <div class="ui-kb-head">Done <span class="ui-kb-count">1</span></div>
    <div class="ui-kb-card" draggable="true"><strong>Ship dark mode</strong><span>Merged #482</span></div>
  </div>
</div>`,
  js: `// Auto-wired by Plugins.kanban(root)`
},

/* ---------------------------------------------------------------
   NAVIGATION
   --------------------------------------------------------------- */
{
  id: 'breadcrumb',
  name: 'Breadcrumb',
  category: 'Navigation',
  tier: 'free',
  description: 'Path navigation with chevron separators.',
  html: `<nav>
  <ol class="ui-breadcrumb">
    <li><a href="#">Home</a></li>
    <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></li>
    <li><a href="#">Components</a></li>
    <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></li>
    <li class="is-current">Breadcrumb</li>
  </ol>
</nav>`
},
{
  id: 'pagination',
  name: 'Pagination',
  category: 'Navigation',
  tier: 'free',
  description: 'Page numbers with prev/next and an ellipsis.',
  html: `<nav class="ui-pagination">
  <button class="ui-page" disabled aria-label="Previous">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
  </button>
  <button class="ui-page is-active">1</button>
  <button class="ui-page">2</button>
  <button class="ui-page">3</button>
  <span class="ui-page-dots">…</span>
  <button class="ui-page">12</button>
  <button class="ui-page" aria-label="Next">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>
  </button>
</nav>`
},
{
  id: 'tabs',
  name: 'Pill Tabs',
  category: 'Navigation',
  tier: 'free',
  description: 'Segmented tab switcher with animated active pill.',
  html: `<div style="width:100%;max-width:400px" data-tabs>
  <div class="ui-tabs">
    <button class="ui-tab is-active" data-tab="a">Overview</button>
    <button class="ui-tab" data-tab="b">Activity</button>
    <button class="ui-tab" data-tab="c">Settings</button>
  </div>
  <div class="ui-panel" data-panel="a">Project overview with key metrics and recent changes.</div>
  <div class="ui-panel" data-panel="b" hidden>Activity feed from your team over the last 7 days.</div>
  <div class="ui-panel" data-panel="c" hidden>Workspace settings, integrations, and permissions.</div>
</div>`,
  js: `// Auto-wired by Plugins.tabs(root)`
},
{
  id: 'tabs-underline',
  name: 'Underline Tabs',
  category: 'Navigation',
  tier: 'pro',
  description: 'Minimal tabs with a sliding underline.',
  html: `<div style="width:100%;max-width:420px" data-tabs-underline>
  <div class="ui-tabs ui-tabs-underline">
    <button class="ui-tab is-active" data-tab="a">General</button>
    <button class="ui-tab" data-tab="b">Billing</button>
    <button class="ui-tab" data-tab="c">Team</button>
    <button class="ui-tab" data-tab="d">API</button>
  </div>
  <div class="ui-panel" data-panel="a">General workspace settings.</div>
  <div class="ui-panel" data-panel="b" hidden>Billing history and payment methods.</div>
  <div class="ui-panel" data-panel="c" hidden>Invite teammates and manage roles.</div>
  <div class="ui-panel" data-panel="d" hidden>Generate API keys and webhooks.</div>
</div>`,
  js: `// Auto-wired by Plugins.tabs(root)`
},
{
  id: 'vertical-tabs',
  name: 'Vertical Tabs',
  category: 'Navigation',
  tier: 'pro',
  description: 'Side navigation paired with a content pane.',
  html: `<div class="ui-vtabs" data-tabs-vertical style="width:100%">
  <div class="ui-vtab-list">
    <button class="ui-vtab is-active" data-tab="a">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
      Profile
    </button>
    <button class="ui-vtab" data-tab="b">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Security
    </button>
    <button class="ui-vtab" data-tab="c">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
      Notifications
    </button>
  </div>
  <div>
    <div class="ui-panel" data-panel="a" style="padding-top:0">Your public profile information.</div>
    <div class="ui-panel" data-panel="b" style="padding-top:0" hidden>Password, 2FA, and sessions.</div>
    <div class="ui-panel" data-panel="c" style="padding-top:0" hidden>Email and push notification preferences.</div>
  </div>
</div>`,
  js: `// Auto-wired by Plugins.tabs(root)`
},
{
  id: 'steps',
  name: 'Step Indicator',
  category: 'Navigation',
  tier: 'pro',
  description: 'Horizontal progress through a multi-step flow.',
  html: `<div class="ui-steps" style="width:100%">
  <div class="ui-step is-done">
    <span class="ui-step-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg></span>
    <span class="ui-step-label">Account</span>
  </div>
  <div class="ui-step is-active">
    <span class="ui-step-dot">2</span>
    <span class="ui-step-label">Billing</span>
  </div>
  <div class="ui-step">
    <span class="ui-step-dot">3</span>
    <span class="ui-step-label">Confirm</span>
  </div>
</div>`
},
{
  id: 'accordion',
  name: 'Accordion',
  category: 'Navigation',
  tier: 'pro',
  description: 'Expandable sections with a rotating chevron.',
  html: `<div class="ui-accordion" data-accordion style="width:100%;max-width:420px">
  <div class="ui-acc-item is-open">
    <button class="ui-acc-head">
      What is OpenUI?
      <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <div class="ui-acc-body"><div><p>A free, copy-paste component library built with pure HTML, CSS, and Vanilla JS.</p></div></div>
  </div>
  <div class="ui-acc-item">
    <button class="ui-acc-head">
      Do I need a build step?
      <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <div class="ui-acc-body"><div><p>No. Drop the CSS and JS files in and start using the components.</p></div></div>
  </div>
  <div class="ui-acc-item">
    <button class="ui-acc-head">
      Is it really free?
      <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <div class="ui-acc-body"><div><p>Yes — MIT licensed, forever free, including every Pro component.</p></div></div>
  </div>
</div>`,
  js: `// Auto-wired by Plugins.accordion(root)`
},

/* ---------------------------------------------------------------
   FEEDBACK
   --------------------------------------------------------------- */
{
  id: 'alert',
  name: 'Alerts',
  category: 'Feedback',
  tier: 'free',
  description: 'Inline messages for info, success, warning, and danger.',
  html: `<div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:420px">
  <div class="ui-alert ui-alert-info">
    <svg class="alert-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
    <div><div class="ui-alert-title">Heads up</div><div class="ui-alert-body">A new version is available.</div></div>
  </div>
  <div class="ui-alert ui-alert-success">
    <svg class="alert-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg>
    <div><div class="ui-alert-title">Saved</div><div class="ui-alert-body">Your changes have been saved.</div></div>
  </div>
  <div class="ui-alert ui-alert-danger">
    <svg class="alert-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m12 2 10 18H2z"/><path d="M12 9v5M12 17h.01"/></svg>
    <div><div class="ui-alert-title">Something went wrong</div><div class="ui-alert-body">We couldn't process your request.</div></div>
  </div>
</div>`
},
{
  id: 'toast',
  name: 'Toasts',
  category: 'Feedback',
  tier: 'pro',
  description: 'Stacked notifications with auto-dismiss and progress bars.',
  html: `<div style="display:flex;flex-direction:column;gap:12px;align-items:center;width:100%">
  <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
    <button class="ui-btn ui-btn-success ui-btn-sm" data-toast-trigger="success">Success</button>
    <button class="ui-btn ui-btn-danger ui-btn-sm" data-toast-trigger="error">Error</button>
    <button class="ui-btn ui-btn-soft ui-btn-sm" data-toast-trigger="info">Info</button>
  </div>
  <div class="ui-toast-stack" data-toast-stack></div>
</div>`,
  js: `// Auto-wired by Plugins.toast(root)`
},
{
  id: 'progress',
  name: 'Progress Bars',
  category: 'Feedback',
  tier: 'free',
  description: 'Determinate bars with a striped animated variant.',
  html: `<div style="display:flex;flex-direction:column;gap:16px;width:100%;max-width:400px">
  <div>
    <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--text-2);margin-bottom:6px"><span>Uploading</span><span>64%</span></div>
    <div class="ui-progress"><div class="ui-progress-fill" style="width:64%"></div></div>
  </div>
  <div>
    <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--text-2);margin-bottom:6px"><span>Processing</span><span>32%</span></div>
    <div class="ui-progress ui-progress-striped"><div class="ui-progress-fill" style="width:32%"></div></div>
  </div>
</div>`
},
{
  id: 'skeleton',
  name: 'Skeleton Loaders',
  category: 'Feedback',
  tier: 'free',
  description: 'Shimmer placeholders that match final content shape.',
  html: `<div style="display:flex;gap:14px;width:100%;max-width:400px;align-items:flex-start">
  <div class="ui-skel ui-skel-avatar"></div>
  <div style="flex:1">
    <div class="ui-skel ui-skel-title"></div>
    <div class="ui-skel ui-skel-text"></div>
    <div class="ui-skel ui-skel-text" style="width:80%"></div>
    <div class="ui-skel ui-skel-text" style="width:60%"></div>
    <div class="ui-skel ui-skel-img" style="margin-top:14px"></div>
  </div>
</div>`
},
{
  id: 'empty-state',
  name: 'Empty State',
  category: 'Feedback',
  tier: 'pro',
  description: 'Illustration, copy, and CTA for zero-data screens.',
  html: `<div class="ui-empty">
  <div class="ui-empty-ico">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
  </div>
  <h4>No projects yet</h4>
  <p>Get started by creating your first project. It only takes a minute.</p>
  <button class="ui-btn ui-btn-primary ui-btn-sm">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    New project
  </button>
</div>`
},

/* ---------------------------------------------------------------
   OVERLAYS
   --------------------------------------------------------------- */
{
  id: 'modal',
  name: 'Modal Dialog',
  category: 'Overlays',
  tier: 'pro',
  description: 'Centered dialog with backdrop blur and ESC to close.',
  html: `<div style="position:relative;width:100%;min-height:200px;display:flex;align-items:center;justify-content:center" data-modal-demo>
  <button class="ui-btn ui-btn-primary" data-modal-open>Open modal</button>
  <div class="ui-modal-backdrop" data-modal-backdrop hidden>
    <div class="ui-modal">
      <div class="ui-modal-head">
        <span class="ui-modal-title">Confirm deletion</span>
        <button class="icon-btn" data-modal-close aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="ui-modal-body">
        This action cannot be undone. The project and all of its data will be permanently removed.
      </div>
      <div class="ui-modal-foot">
        <button class="ui-btn ui-btn-ghost" data-modal-close>Cancel</button>
        <button class="ui-btn ui-btn-danger" data-modal-close>Delete project</button>
      </div>
    </div>
  </div>
</div>`,
  js: `// Auto-wired by Plugins.modal(root)`
},
{
  id: 'drawer',
  name: 'Side Drawer',
  category: 'Overlays',
  tier: 'pro',
  description: 'Slide-in panel from the right edge.',
  html: `<div style="position:relative;width:100%;min-height:200px;display:flex;align-items:center;justify-content:center" data-drawer-demo>
  <button class="ui-btn ui-btn-primary" data-drawer-open>Open drawer</button>
  <div class="ui-drawer-backdrop" data-drawer-backdrop hidden>
    <div class="ui-drawer">
      <div class="ui-drawer-head">
        <strong>Filters</strong>
        <button class="icon-btn" data-drawer-close aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="ui-drawer-body">
        <label class="ui-label">Category</label>
        <select class="ui-select" style="margin-bottom:14px"><option>All</option><option>Design</option><option>Engineering</option></select>
        <label class="ui-label">Status</label>
        <div style="display:flex;flex-direction:column;gap:10px">
          <label class="ui-check"><input type="checkbox" checked><span class="box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg></span><span>Active</span></label>
          <label class="ui-check"><input type="checkbox"><span class="box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg></span><span>Archived</span></label>
        </div>
      </div>
      <div class="ui-drawer-foot">
        <button class="ui-btn ui-btn-ghost ui-btn-block" data-drawer-close>Reset</button>
        <button class="ui-btn ui-btn-primary ui-btn-block" data-drawer-close>Apply</button>
      </div>
    </div>
  </div>
</div>`,
  js: `// Auto-wired by Plugins.drawer(root)`
},
{
  id: 'dropdown',
  name: 'Dropdown Menu',
  category: 'Overlays',
  tier: 'pro',
  description: 'Anchored menu that closes on outside click.',
  html: `<div class="ui-menu-anchor" data-menu style="display:inline-block">
  <button class="ui-btn ui-btn-outline" data-menu-trigger>
    Options
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
  </button>
  <div class="ui-menu">
    <div class="ui-menu-label">Actions</div>
    <button class="ui-menu-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
      Edit <kbd class="kbd">E</kbd>
    </button>
    <button class="ui-menu-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
      Duplicate <kbd class="kbd">D</kbd>
    </button>
    <button class="ui-menu-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
      Share
    </button>
    <div class="ui-menu-sep"></div>
    <button class="ui-menu-item is-danger">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      Delete <kbd class="kbd">⌫</kbd>
    </button>
  </div>
</div>`,
  js: `// Auto-wired by Plugins.menu(root)`
},
{
  id: 'context-menu',
  name: 'Context Menu',
  category: 'Overlays',
  tier: 'pro',
  description: 'Right-click anywhere in the zone to open a menu at the cursor.',
  html: `<div class="ui-ctx-zone" data-ctx-zone style="width:100%;max-width:380px">
  Right-click inside this area
</div>`,
  js: `// Auto-wired by Plugins.contextMenu(root)`
},
{
  id: 'popover',
  name: 'Popover',
  category: 'Overlays',
  tier: 'pro',
  description: 'Rich panel anchored to a trigger button.',
  html: `<div class="ui-pop-wrap" data-popover>
  <button class="ui-btn ui-btn-outline" data-pop-trigger>Show details</button>
  <div class="ui-popover">
    <div class="ui-popover-title">Workspace storage</div>
    <div class="ui-popover-body">You've used 64% of your 10 GB plan.</div>
    <div class="ui-progress ui-progress-sm" style="margin-top:10px"><div class="ui-progress-fill" style="width:64%"></div></div>
  </div>
</div>`,
  js: `// Auto-wired by Plugins.popover(root)`
},
{
  id: 'tooltip',
  name: 'Tooltip',
  category: 'Overlays',
  tier: 'free',
  description: 'Pure-CSS tooltips on hover and focus.',
  html: `<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
  <span class="ui-tip-wrap">
    <button class="ui-btn ui-btn-outline ui-btn-sm">Hover me</button>
    <span class="ui-tooltip">Tooltip on top</span>
  </span>
  <span class="ui-tip-wrap">
    <button class="ui-btn ui-btn-icon ui-btn-outline ui-btn-sm" aria-label="Info">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
    </button>
    <span class="ui-tooltip">Helpful hint</span>
  </span>
</div>`
},
{
  id: 'command-palette',
  name: 'Command Palette',
  category: 'Overlays',
  tier: 'pro',
  description: 'Searchable command list with keyboard navigation.',
  html: `<div class="ui-cmd" data-cmd style="width:100%;max-width:400px">
  <div class="ui-cmd-input-row">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input placeholder="Type a command…" data-cmd-input>
    <kbd class="kbd">Esc</kbd>
  </div>
  <ul class="ui-cmd-list" data-cmd-list>
    <li class="ui-cmd-item" data-cmd-item><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>New file <kbd class="kbd">⌘N</kbd></li>
    <li class="ui-cmd-item" data-cmd-item><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>Search files <kbd class="kbd">⌘P</kbd></li>
    <li class="ui-cmd-item" data-cmd-item><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Rename <kbd class="kbd">F2</kbd></li>
    <li class="ui-cmd-item" data-cmd-item><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete <kbd class="kbd">⌫</kbd></li>
    <li class="ui-cmd-item" data-cmd-item><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>Export <kbd class="kbd">⌘E</kbd></li>
  </ul>
</div>`,
  js: `// Auto-wired by Plugins.commandPalette(root)`
},
{
  id: 'notifications',
  name: 'Notification List',
  category: 'Overlays',
  tier: 'pro',
  description: 'Read and unread items with dismiss buttons.',
  html: `<div class="ui-notif-list" data-notifs style="width:100%;max-width:400px">
  <div class="ui-notif is-unread">
    <div class="ui-avatar ui-avatar-sm" style="background:linear-gradient(135deg,#4c8dff,#a371f7)">A</div>
    <div class="ui-notif-body">
      <div class="ui-notif-title">Alice commented on your PR</div>
      <div class="ui-notif-text">"Looks good, just one nit on line 42."</div>
      <div class="ui-notif-time">2 minutes ago</div>
    </div>
    <button class="ui-notif-x" aria-label="Dismiss"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>
  <div class="ui-notif">
    <div class="ui-avatar ui-avatar-sm" style="background:linear-gradient(135deg,#3fb950,#39c5cf)">B</div>
    <div class="ui-notif-body">
      <div class="ui-notif-title">Deployment succeeded</div>
      <div class="ui-notif-text">v1.0.4 is now live in production.</div>
      <div class="ui-notif-time">1 hour ago</div>
    </div>
    <button class="ui-notif-x" aria-label="Dismiss"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>
  <div class="ui-notif">
    <div class="ui-avatar ui-avatar-sm" style="background:linear-gradient(135deg,#d29922,#f85149)">C</div>
    <div class="ui-notif-body">
      <div class="ui-notif-title">Storage almost full</div>
      <div class="ui-notif-text">You've used 92% of your plan.</div>
      <div class="ui-notif-time">Yesterday</div>
    </div>
    <button class="ui-notif-x" aria-label="Dismiss"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>
</div>`,
  js: `// Auto-wired by Plugins.notifications(root)`
},

/* ---------------------------------------------------------------
   LAYOUT
   --------------------------------------------------------------- */
{
  id: 'chat',
  name: 'Chat Interface',
  category: 'Layout',
  tier: 'pro',
  description: 'Message bubbles, avatars, typing indicator, and send.',
  html: `<div class="ui-chat" data-chat>
  <div class="ui-chat-head">
    <div class="ui-avatar ui-avatar-sm ui-status" style="background:linear-gradient(135deg,#3fb950,#39c5cf)">M</div>
    <div>
      <div style="font-size:13.5px;font-weight:650">Maya Chen</div>
      <div style="font-size:11.5px;color:var(--text-3)">Online</div>
    </div>
  </div>
  <div class="ui-chat-body" data-chat-body>
    <div class="ui-msg">
      <div class="ui-avatar ui-avatar-xs" style="background:linear-gradient(135deg,#3fb950,#39c5cf)">M</div>
      <div>
        <div class="ui-msg-bubble">Hey! Did you see the new deploy?</div>
        <span class="ui-msg-time">10:24 AM</span>
      </div>
    </div>
    <div class="ui-msg is-me">
      <div class="ui-avatar ui-avatar-xs">Y</div>
      <div>
        <div class="ui-msg-bubble">Yes — looks super smooth. Nice work!</div>
        <span class="ui-msg-time">10:25 AM</span>
      </div>
    </div>
    <div class="ui-msg">
      <div class="ui-avatar ui-avatar-xs" style="background:linear-gradient(135deg,#3fb950,#39c5cf)">M</div>
      <div class="ui-msg-bubble"><span class="ui-typing"><i></i><i></i><i></i></span></div>
    </div>
  </div>
  <form class="ui-chat-foot" data-chat-form>
    <input class="ui-input" placeholder="Type a message…" data-chat-input>
    <button class="ui-btn ui-btn-primary ui-btn-icon" aria-label="Send">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/></svg>
    </button>
  </form>
</div>`,
  js: `// Auto-wired by Plugins.chat(root)`
},
{
  id: 'pricing',
  name: 'Pricing Cards',
  category: 'Layout',
  tier: 'pro',
  description: 'Three tiers with a highlighted featured plan.',
  html: `<div class="ui-pricing" style="width:100%">
  <div class="ui-price-card">
    <div class="ui-price-name">Starter</div>
    <div class="ui-price-amount"><sup>$</sup>0<span>/mo</span></div>
    <ul class="ui-price-list">
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg>10 components</li>
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg>MIT license</li>
    </ul>
    <button class="ui-btn ui-btn-outline ui-btn-block" style="margin-top:auto">Get started</button>
  </div>
  <div class="ui-price-card is-featured">
    <span class="ui-price-flag">Popular</span>
    <div class="ui-price-name">Pro</div>
    <div class="ui-price-amount"><sup>$</sup>12<span>/mo</span></div>
    <ul class="ui-price-list">
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg>All 62 components</li>
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg>Priority support</li>
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg>Figma file</li>
    </ul>
    <button class="ui-btn ui-btn-primary ui-btn-block" style="margin-top:auto">Start free trial</button>
  </div>
  <div class="ui-price-card">
    <div class="ui-price-name">Team</div>
    <div class="ui-price-amount"><sup>$</sup>29<span>/mo</span></div>
    <ul class="ui-price-list">
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg>Unlimited seats</li>
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg>SSO</li>
    </ul>
    <button class="ui-btn ui-btn-outline ui-btn-block" style="margin-top:auto">Contact sales</button>
  </div>
</div>`
},
{
  id: 'testimonial',
  name: 'Testimonial',
  category: 'Layout',
  tier: 'pro',
  description: 'Quote card with stars, avatar, and attribution.',
  html: `<div class="ui-quote" style="max-width:420px">
  <div class="ui-quote-mark">"</div>
  <p class="ui-quote-text">OpenUI replaced three paid libraries for us. The components are cleaner, the code is smaller, and we shipped a full dashboard in a weekend.</p>
  <div class="ui-stars">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9z"/></svg>
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9z"/></svg>
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9z"/></svg>
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9z"/></svg>
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9z"/></svg>
  </div>
  <div class="ui-quote-person">
    <div class="ui-avatar" style="background:linear-gradient(135deg,#4c8dff,#a371f7)">SK</div>
    <div>
      <strong>Sarah Kim</strong>
      <span>Head of Design, Northwind</span>
    </div>
  </div>
</div>`
},
{
  id: 'multi-step-form',
  name: 'Multi-Step Form',
  category: 'Layout',
  tier: 'pro',
  description: 'Wizard with step indicator and next/back navigation.',
  html: `<div style="width:100%;max-width:420px" data-wizard>
  <div class="ui-steps" style="margin-bottom:22px">
    <div class="ui-step is-active" data-step-ind="1"><span class="ui-step-dot">1</span><span class="ui-step-label">Account</span></div>
    <div class="ui-step" data-step-ind="2"><span class="ui-step-dot">2</span><span class="ui-step-label">Plan</span></div>
    <div class="ui-step" data-step-ind="3"><span class="ui-step-dot">3</span><span class="ui-step-label">Done</span></div>
  </div>
  <div data-step="1">
    <div class="ui-field"><label class="ui-label">Full name</label><input class="ui-input" placeholder="Jane Doe"></div>
    <div class="ui-field"><label class="ui-label">Email</label><input class="ui-input" type="email" placeholder="jane@example.com"></div>
  </div>
  <div data-step="2" hidden>
    <div class="ui-field"><label class="ui-label">Plan</label>
      <select class="ui-select"><option>Starter</option><option>Pro</option><option>Team</option></select>
    </div>
    <div class="ui-field"><label class="ui-label">Card number</label><input class="ui-input" placeholder="4242 4242 4242 4242"></div>
  </div>
  <div data-step="3" hidden>
    <div class="ui-empty" style="padding:0">
      <div class="ui-empty-ico" style="background:var(--green-soft);color:var(--green);border-color:transparent">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m5 12 5 5L20 7"/></svg>
      </div>
      <h4>You're all set</h4>
      <p>Your account has been created and your plan is active.</p>
    </div>
  </div>
  <div style="display:flex;gap:8px;margin-top:18px">
    <button class="ui-btn ui-btn-outline" data-wiz-back style="flex:1">Back</button>
    <button class="ui-btn ui-btn-primary" data-wiz-next style="flex:1">Continue</button>
  </div>
</div>`,
  js: `// Auto-wired by Plugins.wizard(root)`
},
{
  id: 'search-results',
  name: 'Search with Results',
  category: 'Layout',
  tier: 'pro',
  description: 'Live filtering across a result list.',
  html: `<div style="width:100%;max-width:380px" data-search>
  <div class="ui-input-wrap" style="margin-bottom:12px">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input class="ui-input" placeholder="Search users…" data-search-input>
  </div>
  <div class="ui-notif-list" data-search-list>
    <div class="ui-notif" data-search-item="Alice Nguyen"><div class="ui-avatar ui-avatar-sm">A</div><div class="ui-notif-body"><div class="ui-notif-title">Alice Nguyen</div><div class="ui-notif-text">Designer</div></div></div>
    <div class="ui-notif" data-search-item="Ben Kaur"><div class="ui-avatar ui-avatar-sm">B</div><div class="ui-notif-body"><div class="ui-notif-title">Ben Kaur</div><div class="ui-notif-text">Engineer</div></div></div>
    <div class="ui-notif" data-search-item="Cara Diaz"><div class="ui-avatar ui-avatar-sm">C</div><div class="ui-notif-body"><div class="ui-notif-title">Cara Diaz</div><div class="ui-notif-text">PM</div></div></div>
    <div class="ui-notif" data-search-item="Devon Park"><div class="ui-avatar ui-avatar-sm">D</div><div class="ui-notif-body"><div class="ui-notif-title">Devon Park</div><div class="ui-notif-text">Engineer</div></div></div>
  </div>
  <p data-search-empty hidden style="text-align:center;font-size:13px;color:var(--text-3);padding:16px 0">No matches.</p>
</div>`,
  js: `// Auto-wired by Plugins.search(root)`
},
{
  id: 'sortable-list',
  name: 'Sortable List',
  category: 'Layout',
  tier: 'pro',
  description: 'Drag rows to reorder them.',
  html: `<ul class="ui-notif-list" data-sortable style="width:100%;max-width:340px">
  <li class="ui-notif" draggable="true" style="cursor:grab"><div class="ui-avatar ui-avatar-xs">1</div><div class="ui-notif-body"><div class="ui-notif-title">Design homepage</div></div></li>
  <li class="ui-notif" draggable="true" style="cursor:grab"><div class="ui-avatar ui-avatar-xs">2</div><div class="ui-notif-body"><div class="ui-notif-title">Build auth flow</div></div></li>
  <li class="ui-notif" draggable="true" style="cursor:grab"><div class="ui-avatar ui-avatar-xs">3</div><div class="ui-notif-body"><div class="ui-notif-title">Write API docs</div></div></li>
  <li class="ui-notif" draggable="true" style="cursor:grab"><div class="ui-avatar ui-avatar-xs">4</div><div class="ui-notif-body"><div class="ui-notif-title">Set up analytics</div></div></li>
</ul>`,
  js: `// Auto-wired by Plugins.sortable(root)`
},
{
  id: 'copy-field',
  name: 'Copy Field',
  category: 'Layout',
  tier: 'pro',
  description: 'Read-only input with an inline copy button and feedback.',
  html: `<div style="width:100%;max-width:360px" data-copy-field>
  <label class="ui-label">Your API key</label>
  <div class="ui-input-wrap has-trail">
    <input class="ui-input mono" readonly value="sk_live_4f8a2b1c9d3e7f6a">
    <button class="trail-btn" data-copy-btn aria-label="Copy">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
    </button>
  </div>
  <p class="ui-help">Keep this secret. Rotate it if leaked.</p>
</div>`,
  js: `// Auto-wired by Plugins.copyField(root)`
},
{
  id: 'theme-switcher',
  name: 'Theme Switcher',
  category: 'Layout',
  tier: 'pro',
  description: 'Light / dark / system segmented control that flips data-theme.',
  html: `<div class="ui-btn-group" data-theme-switch>
  <button class="ui-btn ui-btn-outline ui-btn-sm" data-theme-value="light">Light</button>
  <button class="ui-btn ui-btn-outline ui-btn-sm is-active" data-theme-value="dark">Dark</button>
  <button class="ui-btn ui-btn-outline ui-btn-sm" data-theme-value="system">System</button>
</div>`,
  js: `// Auto-wired by Plugins.themeSwitch(root)`
}

];

// quick lookup
window.UI_REGISTRY_BY_ID = Object.fromEntries(window.UI_REGISTRY.map(c => [c.id, c]));
