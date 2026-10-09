(function () {
  'use strict';

  const cache = new Map();

  async function fetchComponent(path) {
    if (cache.has(path)) return cache.get(path);

    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Fetch failed: ${path} (${res.status})`);
    const text = await res.text();

    // Split on the first <script>…</script> block
    const m = text.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const html = (m ? text.replace(m[0], '') : text).trim();
    const js   = m ? m[1].trim() : '';

    const payload = { html, js };
    cache.set(path, payload);
    return payload;
  }

  function inject(target, payload) {
    target.innerHTML = payload.html;

    if (payload.js) {
      try {
        new Function('root', payload.js)(target);
      } catch (err) {
        console.error('[loader] component JS error:', err);
      }
    }
    if (window.Plugins && window.Plugins.init) {
      window.Plugins.init(target);
    }
  }

  async function fetchWithMinDelay(path, minMs = 600, maxMs = 1750) {
    const minWait = minMs + Math.random() * (maxMs - minMs);
    const [payload] = await Promise.all([
      fetchComponent(path),
      new Promise(r => setTimeout(r, minWait))
    ]);
    return payload;
  }

  window.Loader = { fetch: fetchComponent, fetchWithMinDelay, inject, cache };
})();
