(async function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const src  = params.get('src');
  const name = params.get('name') || 'Component';
  const cat  = params.get('category') || '';

  document.title = `${name} — OpenUI`;
  document.getElementById('vName').textContent = name;
  if (cat) document.getElementById('vCat').textContent = cat;

  const stage = document.getElementById('stage');

  if (!src) {
    stage.innerHTML = '<div class="viewer-error">No component specified.</div>';
    return;
  }

  try {
    const payload = await window.Loader.fetch(src);
    stage.innerHTML = '';
    window.Loader.inject(stage, payload);
  } catch (err) {
    stage.innerHTML = '<div class="viewer-error">Failed to load component.</div>';
    console.error(err);
  }
})();
