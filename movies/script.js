/* ==================================================================
   VAULT — APPLICATION SCRIPT
   Vanilla JS. No framework. No jQuery. Everything is hand-rolled.
   ------------------------------------------------------------------
   Table of contents
   01. Configuration & constants
   02. The video library (demo data + Google Drive entries)
   03. Tiny DOM/utility helpers
   04. Persistent storage layer
   05. Toast system
   06. Google Drive adapter (direct / embed / thumbnail / API)
   07. Global application state
   08. Video card rendering
   09. Grid rendering, filtering, sorting, infinite scroll
   10. Hover-preview engine
   11. Context menu
   12. Player engine (the big one)
   13. Mini player engine (drag / resize / snap)
   14. Queue / up-next management
   15. Keyboard shortcuts
   16. Modals
   17. Theme
   18. Media Session API
   19. Document Picture-in-Picture
   20. Boot
   ================================================================== */

(function () {
  'use strict';

  /* ================================================================
     01. CONFIGURATION & CONSTANTS
     ================================================================ */

  const CONFIG = {
    storagePrefix: 'vault.',
    pageSize: 8,
    hoverPreviewDelay: 700,
    hoverPreviewStart: 0.25,      // start preview at 25% of the video
    resumeThreshold: 10,           // seconds — below this we don't resume
    resumeComplete: 0.95,          // above this fraction we consider it watched
    seekStep: 5,
    seekStepLarge: 10,
    maxQueue: 100,
    miniSnapMargin: 22,
    defaultVolume: 1,
    drive: {
      // Paste an API key + folder id here, or set them in Settings.
      apiKey: '',
      folderId: '',
      autoLoad: false
    }
  };

  const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const SHORTCUTS = [
    { keys: ['Space', 'K'], label: 'Play / Pause' },
    { keys: ['J'], label: 'Rewind 10 seconds' },
    { keys: ['L'], label: 'Forward 10 seconds' },
    { keys: ['←'], label: 'Rewind 5 seconds' },
    { keys: ['→'], label: 'Forward 5 seconds' },
    { keys: ['↑'], label: 'Volume up 5%' },
    { keys: ['↓'], label: 'Volume down 5%' },
    { keys: ['M'], label: 'Mute / Unmute' },
    { keys: ['F'], label: 'Fullscreen' },
    { keys: ['T'], label: 'Theater mode' },
    { keys: ['I'], label: 'Mini player' },
    { keys: ['P'], label: 'Picture-in-Picture' },
    { keys: ['C'], label: 'Toggle subtitles' },
    { keys: ['A'], label: 'Set A–B loop point' },
    { keys: ['L'], label: 'Toggle loop' },
    { keys: ['0', '–', '9'], label: 'Jump to 0–90%' },
    { keys: ['Shift', '+'], label: 'Increase speed' },
    { keys: ['Shift', '–'], label: 'Decrease speed' },
    { keys: ['N'], label: 'Next video' },
    { keys: ['Shift', 'P'], label: 'Previous video' },
    { keys: ['Q'], label: 'Add to queue' },
    { keys: ['Esc'], label: 'Close player / overlay' },
    { keys: ['?'], label: 'Show shortcuts' },
    { keys: ['B'], label: 'Toggle sidebar' },
    { keys: ['Ctrl', 'K'], label: 'Focus search' },
    { keys: ['Ctrl', '/'], label: 'Toggle theme' }
  ];

  /* ================================================================
     02. THE VIDEO LIBRARY
     ----------------------------------------------------------------
     HOW TO USE YOUR OWN GOOGLE DRIVE VIDEOS
     ----------------------------------------------------------------
     1) Upload the video to Google Drive.
     2) Right-click → Share → "Anyone with the link" → Viewer → Copy link.
     3) The link looks like:
        https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^ this is the file id
     4) Add an entry below with `driveId: 'THE_FILE_ID'`.
     5) Optionally add `poster` — otherwise Vault uses Drive's own thumbnail
        endpoint automatically:
        https://drive.google.com/thumbnail?id=FILE_ID&sz=w1280
     ----------------------------------------------------------------
     GOOGLE PHOTOS
     ----------------------------------------------------------------
     Google Photos does not expose direct, publicly streamable MP4 URLs
     without OAuth. The practical route is:
       a) Download the item from Photos, then re-upload to Drive, OR
       b) Use the Photos Library API (OAuth) to fetch `baseUrl=dv`, which
          yields a short-lived direct stream URL. Paste that URL into `src`.
     Vault supports both — just supply `src` for a Photos direct URL, or
     `driveId` for Drive-hosted videos.
     ================================================================ */

  const LIBRARY = [
    {
      id: 'v01',
      title: 'Basic how to ride your skateboard comfortably',
      description: 'In this beginner-friendly session we break down stance, foot placement, pushing technique and the small balance drills that make everything else click. Practise each drill for five minutes before moving on — repetition beats theory every single time.',
      src: 'https://pub-96789678a92c479d85e59ff13f0cd4fe.r2.dev/00032.mp4',
      poster: 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 486,
      views: 54210,
      likes: 3120,
      category: 'Skateboarding',
      tags: ['beginner', 'basics', 'street'],
      publishedAt: '2024-11-04',
      author: { name: 'Andy William', avatar: 'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 1980893, verified: true },
      chapters: [
        { time: 0, title: 'Intro — what you need' },
        { time: 62, title: 'Stance & foot placement' },
        { time: 148, title: 'Your first push' },
        { time: 245, title: 'Turning with your shoulders' },
        { time: 340, title: 'Stopping safely' },
        { time: 430, title: 'Practice routine' }
      ],
      comments: [
        { author: 'Wijaya Adabi', avatar: 'https://images.unsplash.com/photo-1560941001-d4b52ad00ecc?auto=format&fit=crop&w=100&q=80', text: 'The shoulder-turning tip at 4:05 completely fixed my carving. Thanks!', time: '2 days ago', likes: 44 },
        { author: 'Johny Wise', avatar: 'https://images.pexels.com/photos/2889942/pexels-photo-2889942.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', text: 'Watched this three times. The practice routine is gold.', time: '5 days ago', likes: 21 },
        { author: 'Budi Hakim', avatar: 'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?auto=format&fit=crop&w=100&q=80', text: 'Any chance of a follow-up on ollies?', time: '1 week ago', likes: 12 }
      ]
    },
    {
      id: 'v02',
      title: 'Prepare for your first skateboard jump',
      description: 'Jumping is 20% pop and 80% commitment. We walk through the ollie motion frame by frame, then run a set of confidence drills over a chalk line before you ever attempt it rolling.',
      src: 'https://player.vimeo.com/external/449972745.sd.mp4?s=9943177fe8a6147b7bc4598259401f06ec57878a&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 312,
      views: 42190,
      likes: 2410,
      category: 'Tutorial',
      tags: ['ollie', 'jump', 'intermediate'],
      publishedAt: '2024-10-22',
      author: { name: 'Gerard Bind', avatar: 'https://images.pexels.com/photos/3370021/pexels-photo-3370021.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 842100, verified: false },
      chapters: [
        { time: 0, title: 'Why jumps feel scary' },
        { time: 55, title: 'The pop — slow motion' },
        { time: 140, title: 'Slide and level out' },
        { time: 210, title: 'Chalk-line drills' },
        { time: 270, title: 'Common mistakes' }
      ],
      comments: [
        { author: 'Thomas Hope', avatar: 'https://images.pexels.com/photos/1870163/pexels-photo-1870163.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', text: 'The slow-motion section is the clearest ollie breakdown on the internet.', time: '3 days ago', likes: 67 }
      ]
    },
    {
      id: 'v03',
      title: 'Basic equipment to play skateboard safely',
      description: 'Helmets, pads, deck widths, wheel durometer and bearing ratings — a no-nonsense buyer's guide so you spend money once instead of three times.',
      src: 'https://player.vimeo.com/external/436553499.sd.mp4?s=0e44527f269278743db448761e35c5e39cfaa52c&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 402,
      views: 64230,
      likes: 4180,
      category: 'Tutorial',
      tags: ['gear', 'safety', 'buying guide'],
      publishedAt: '2024-10-11',
      author: { name: 'John Wise', avatar: 'https://images.pexels.com/photos/1870163/pexels-photo-1870163.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 511900, verified: true },
      chapters: [
        { time: 0, title: 'Helmets that actually fit' },
        { time: 90, title: 'Pads and wrist guards' },
        { time: 180, title: 'Deck width explained' },
        { time: 280, title: 'Wheels & bearings' },
        { time: 350, title: 'Budget build list' }
      ],
      comments: []
    },
    {
      id: 'v04',
      title: 'Tips to playing skateboard on the ramp',
      description: 'Transition skating is all about pumping and weight transfer. We cover drop-ins, kick turns, axle stalls and how to bail without breaking a wrist.',
      src: 'https://player.vimeo.com/external/361861493.sd.mp4?s=19d8275ca755d653042a87ef28b2f0b2eabf57d0&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1564982752387-9b2c4b3b1b1c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 366,
      views: 50110,
      likes: 2890,
      category: 'Skateboarding',
      tags: ['ramp', 'transition', 'pumping'],
      publishedAt: '2024-09-28',
      author: { name: 'Budi Hakim', avatar: 'https://images.pexels.com/photos/2889942/pexels-photo-2889942.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 233400, verified: false },
      chapters: [
        { time: 0, title: 'Reading the ramp' },
        { time: 70, title: 'Pumping for speed' },
        { time: 160, title: 'Your first drop-in' },
        { time: 250, title: 'Kick turns' },
        { time: 320, title: 'Bailing safely' }
      ],
      comments: []
    },
    {
      id: 'v05',
      title: 'Street lines — full session in downtown',
      description: 'A raw 12-minute edit from a Saturday session: warm-up, three lines, one slam, and the make that saved the day.',
      src: 'https://player.vimeo.com/external/390402719.sd.mp4?s=20cfdb066c4253047562b65bd4e411b86a004bc5&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 742,
      views: 88120,
      likes: 6120,
      category: 'Competition',
      tags: ['street', 'session', 'edit'],
      publishedAt: '2024-09-15',
      author: { name: 'Tony Andrew', avatar: 'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?auto=format&fit=crop&w=100&q=80', subscribers: 1204300, verified: true },
      chapters: [
        { time: 0, title: 'Warm up' },
        { time: 180, title: 'Line one' },
        { time: 380, title: 'The slam' },
        { time: 520, title: 'Line two' },
        { time: 660, title: 'The make' }
      ],
      comments: []
    },
    {
      id: 'v06',
      title: 'Building a community skatepark — full documentary',
      description: 'How a group of volunteers turned an abandoned lot into a fully legal, free-to-use skatepark in eleven months.',
      src: 'https://player.vimeo.com/external/436572488.sd.mp4?s=eae5fb490e214deb9ff532dd98d101efe94e7a8b&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 1520,
      views: 129400,
      likes: 9820,
      category: 'Community',
      tags: ['documentary', 'community', 'build'],
      publishedAt: '2024-08-30',
      author: { name: 'Vault Originals', avatar: 'https://images.unsplash.com/photo-1587918842454-870dbd18261a?auto=format&fit=crop&w=100&q=80', subscribers: 3400000, verified: true },
      chapters: [
        { time: 0, title: 'The empty lot' },
        { time: 300, title: 'Getting permission' },
        { time: 640, title: 'Raising the money' },
        { time: 980, title: 'Pouring concrete' },
        { time: 1280, title: 'Opening day' }
      ],
      comments: []
    },
    {
      id: 'v07',
      title: 'Flatground freestyle — 30 tricks in 30 minutes',
      description: 'A rapid-fire freestyle session. Every trick is timestamped in the chapters panel so you can jump straight to the one you want to learn.',
      src: 'https://player.vimeo.com/external/449972745.sd.mp4?s=9943177fe8a6147b7bc4598259401f06ec57878a&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 1804,
      views: 231900,
      likes: 15320,
      category: 'Competition',
      tags: ['freestyle', 'flatground', 'tricks'],
      publishedAt: '2024-08-02',
      author: { name: 'Andy William', avatar: 'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 1980893, verified: true },
      chapters: [
        { time: 0, title: 'Trick 1–5' },
        { time: 320, title: 'Trick 6–12' },
        { time: 780, title: 'Trick 13–20' },
        { time: 1240, title: 'Trick 21–27' },
        { time: 1620, title: 'Trick 28–30' }
      ],
      comments: []
    },
    {
      id: 'v08',
      title: 'Slow-motion cinematography for skate films',
      description: 'Frame rates, shutter angles, gimbal work and colour grading — how to make a phone edit look like a $50k production.',
      src: 'https://player.vimeo.com/external/436553499.sd.mp4?s=0e44527f269278743db448761e35c5e39cfaa52c&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 528,
      views: 76500,
      likes: 5240,
      category: 'Tutorial',
      tags: ['filming', 'cinematography', 'editing'],
      publishedAt: '2024-07-19',
      author: { name: 'Lena Park', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80', subscribers: 654000, verified: true },
      chapters: [
        { time: 0, title: 'Frame rate basics' },
        { time: 120, title: 'Shutter angle' },
        { time: 250, title: 'Gimbal technique' },
        { time: 380, title: 'Colour grading' },
        { time: 470, title: 'Export settings' }
      ],
      comments: []
    },
    {
      id: 'v09',
      title: 'Downhill racing — the full mountain run',
      description: 'A single unbroken 90-second run at 70 km/h, then a breakdown of the racing line and braking points.',
      src: 'https://player.vimeo.com/external/361861493.sd.mp4?s=19d8275ca755d653042a87ef28b2f0b2eabf57d0&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 268,
      views: 412300,
      likes: 32400,
      category: 'Competition',
      tags: ['downhill', 'racing', 'speed'],
      publishedAt: '2024-06-25',
      author: { name: 'Marco Silva', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', subscribers: 2870000, verified: true },
      chapters: [
        { time: 0, title: 'The run' },
        { time: 95, title: 'Racing line breakdown' },
        { time: 180, title: 'Braking points' }
      ],
      comments: []
    },
    {
      id: 'v10',
      title: 'Deck shapes explained — every width compared',
      description: '7.5" to 9.0" decks side by side. Which width suits which foot size, riding style and trick vocabulary.',
      src: 'https://player.vimeo.com/external/390402719.sd.mp4?s=20cfdb066c4253047562b65bd4e411b86a004bc5&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 234,
      views: 28900,
      likes: 1740,
      category: 'Tutorial',
      tags: ['gear', 'decks', 'sizing'],
      publishedAt: '2024-06-01',
      author: { name: 'John Wise', avatar: 'https://images.pexels.com/photos/1870163/pexels-photo-1870163.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 511900, verified: true },
      chapters: [],
      comments: []
    },
    {
      id: 'v11',
      title: 'Night session — LED boards and city lights',
      description: 'A moody night edit shot entirely between 11pm and 3am. Ambient mode looks fantastic on this one.',
      src: 'https://player.vimeo.com/external/436572488.sd.mp4?s=eae5fb490e214deb9ff532dd98d101efe94e7a8b&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 194,
      views: 98700,
      likes: 8410,
      category: 'Community',
      tags: ['night', 'led', 'edit', 'aesthetic'],
      publishedAt: '2024-05-14',
      author: { name: 'Nova Collective', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80', subscribers: 421000, verified: false },
      chapters: [],
      comments: []
    },
    {
      id: 'v12',
      title: 'Beginner to confident in 30 days — full plan',
      description: 'A day-by-day training plan with a downloadable checklist. This is the companion video to the 30-day series.',
      src: 'https://player.vimeo.com/external/449972745.sd.mp4?s=9943177fe8a6147b7bc4598259401f06ec57878a&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 912,
      views: 175600,
      likes: 14200,
      category: 'Tutorial',
      tags: ['plan', '30 days', 'beginner'],
      publishedAt: '2024-04-30',
      author: { name: 'Andy William', avatar: 'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 1980893, verified: true },
      chapters: [
        { time: 0, title: 'Week 1 — comfort' },
        { time: 220, title: 'Week 2 — pushing' },
        { time: 460, title: 'Week 3 — turning' },
        { time: 700, title: 'Week 4 — first tricks' },
        { time: 860, title: 'What next' }
      ],
      comments: []
    }
  ];

  /* ================================================================
     03. TINY DOM / UTILITY HELPERS
     ================================================================ */

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, '');
      else if (v !== false && v != null) node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatViews(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function formatNumber(n) { return new Intl.NumberFormat().format(n); }

  function relativeDate(iso) {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    const units = [
      ['year', 31536000], ['month', 2592000], ['week', 604800],
      ['day', 86400], ['hour', 3600], ['minute', 60]
    ];
    for (const [name, secs] of units) {
      const v = Math.floor(diff / secs);
      if (v >= 1) return `${v} ${name}${v > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  }

  function debounce(fn, wait = 200) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function throttle(fn, limit = 100) {
    let last = 0, timer = null;
    return function (...args) {
      const now = Date.now();
      if (now - last >= limit) { last = now; fn.apply(this, args); }
      else {
        clearTimeout(timer);
        timer = setTimeout(() => { last = Date.now(); fn.apply(this, args); }, limit - (now - last));
      }
    };
  }

  function uid(prefix = 'id') {
    return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  /* ================================================================
     04. PERSISTENT STORAGE LAYER
     ================================================================ */

  const Store = {
    key(k) { return CONFIG.storagePrefix + k; },
    get(k, fallback = null) {
      try {
        const raw = localStorage.getItem(this.key(k));
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(this.key(k), JSON.stringify(v)); return true; }
      catch (e) { return false; }
    },
    remove(k) { try { localStorage.removeItem(this.key(k)); } catch (e) {} },
    clear() {
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith(CONFIG.storagePrefix))
          .forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
  };

  /* ================================================================
     05. TOAST SYSTEM
     ================================================================ */

  const Toast = (() => {
    const stack = $('#toastStack');
    const ICONS = {
      info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>',
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>',
      error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      warn:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
    };

    function show(type, title, msg = '', duration = 3600) {
      const node = el('div', { class: `toast toast--${type}` });
      node.innerHTML = `
        <span class="toast__icon">${ICONS[type] || ICONS.info}</span>
        <div class="toast__body">
          <div class="toast__title">${escapeHtml(title)}</div>
          ${msg ? `<div class="toast__msg">${escapeHtml(msg)}</div>` : ''}
        </div>
        <button class="toast__close" aria-label="Dismiss">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:13px;height:13px"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>`;

      const dismiss = () => {
        node.classList.add('is-out');
        setTimeout(() => node.remove(), 300);
      };

      node.querySelector('.toast__close').addEventListener('click', dismiss);
      stack.appendChild(node);
      if (duration > 0) setTimeout(dismiss, duration);
      return { dismiss };
    }

    return {
      info: (t, m, d) => show('info', t, m, d),
      success: (t, m, d) => show('success', t, m, d),
      error: (t, m, d) => show('error', t, m, d, d || 5200),
      warn: (t, m, d) => show('warn', t, m, d)
    };
  })();

  /* ================================================================
     06. GOOGLE DRIVE ADAPTER
     ----------------------------------------------------------------
     Provides the four URL shapes we need:
       - directUrl()   → progressive MP4 stream for <video src>
       - previewUrl()  → iframe embed used as a fallback
       - thumbUrl()    → poster image at a given width
       - listFolder()  → Drive API v3 listing (needs an API key)
     ================================================================ */

  const DriveSource = {
    FILE_ID_RE: /(?:\/file\/d\/|id=|\/d\/)([A-Za-z0-9_-]{20,})/,

    extractId(input) {
      if (!input) return '';
      const m = String(input).match(this.FILE_ID_RE);
      return m ? m[1] : (String(input).length > 20 ? String(input) : '');
    },

    directUrl(id) {
      return `https://drive.google.com/uc?export=download&id=${id}`;
    },

    /** A second direct form that some CDN edges prefer. */
    directUrlAlt(id) {
      return `https://drive.usercontent.google.com/download?id=${id}&export=download`;
    },

    previewUrl(id) {
      return `https://drive.google.com/file/d/${id}/preview`;
    },

    thumbUrl(id, width = 1280) {
      return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
    },

    async listFolder(apiKey, folderId) {
      if (!apiKey || !folderId) throw new Error('API key and folder ID are both required.');
      const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and mimeType contains 'video/'`);
      const fields = 'files(id,name,description,thumbnailLink,mimeType,size,createdTime,videoMediaMetadata)';
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}&fields=${fields}&pageSize=200&orderBy=createdTime desc`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Drive API error ${res.status}. ${body.slice(0, 180)}`);
      }
      const data = await res.json();
      return (data.files || []).map((f, i) => ({
        id: 'drive_' + f.id,
        driveId: f.id,
        source: 'drive',
        title: f.name.replace(/\.[^.]+$/, ''),
        description: f.description || 'Imported from Google Drive.',
        poster: this.thumbUrl(f.id, 1280),
        duration: f.videoMediaMetadata && f.videoMediaMetadata.durationMillis
          ? Math.round(parseInt(f.videoMediaMetadata.durationMillis, 10) / 1000)
          : 0,
        views: Math.floor(Math.random() * 90000) + 2000,
        likes: Math.floor(Math.random() * 8000) + 120,
        category: 'Drive imports',
        tags: ['google drive'],
        publishedAt: f.createdTime ? f.createdTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
        author: {
          name: 'My Drive',
          avatar: 'https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
          subscribers: 0,
          verified: false
        },
        chapters: [],
        comments: []
      }));
    }
  };

  /* ================================================================
     07. GLOBAL APPLICATION STATE
     ================================================================ */

  const State = {
    library: [],
    filtered: [],
    page: 1,
    view: Store.get('view', 'grid'),
    filter: 'all',
    sort: Store.get('sort', 'newest'),
    query: '',
    category: 'All',
    current: null,          // currently loaded video object
    queue: Store.get('queue', []),
    history: Store.get('history', []),        // [{id, time, at}]
    watchLater: Store.get('watchLater', []),
    favorites: Store.get('favorites', []),
    liked: Store.get('liked', []),
    disliked: Store.get('disliked', []),
    hidden: Store.get('hidden', []),
    positions: Store.get('positions', {}),    // id → seconds
    comments: Store.get('comments', {}),      // id → [{...}]
    settings: Object.assign({
      autoplay: true,
      ambient: false,
      hoverPreview: true,
      resume: true,
      loop: false,
      dataSaver: false,
      speed: 1,
      volume: 1,
      muted: false,
      theme: 'dark'
    }, Store.get('settings', {})),
    player: {
      isPlaying: false,
      isMini: false,
      isTheater: false,
      isFullscreen: false,
      isPip: false,
      isDragging: false,
      isScrubbing: false,
      abLoop: { a: null, b: null },
      chaptersVisible: true,
      statsVisible: false,
      lastVolume: 1,
      sourceKind: 'direct'      // 'direct' | 'embed'
    }
  };

  /* ================================================================
     08. VIDEO CARD RENDERING
     ================================================================ */

  function getPoster(video) {
    if (video.poster) return video.poster;
    if (video.driveId) return DriveSource.thumbUrl(video.driveId, 1280);
    return 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=900&q=70';
  }

  function getProgress(video) {
    const t = State.positions[video.id];
    if (!t || !video.duration) return 0;
    return clamp((t / video.duration) * 100, 0, 100);
  }

  function buildCard(video, index) {
    const progress = getProgress(video);
    const isLiked = State.liked.includes(video.id);
    const isSaved = State.watchLater.includes(video.id);
    const isPlaying = State.current && State.current.id === video.id;

    const card = el('article', {
      class: `video-card anim${isPlaying ? ' is-playing' : ''}`,
      'data-id': video.id,
      role: 'listitem',
      tabindex: '0',
      style: `--delay:${Math.min(index * 0.045, 0.5)}s`,
      'aria-label': video.title
    });

    const badges = [];
    if (video.driveId || video.source === 'drive') badges.push('<span class="badge badge--drive">DRIVE</span>');
    if (video.duration && video.duration < 300) badges.push('<span class="badge badge--new">QUICK</span>');
    if (video.duration && video.duration > 900) badges.push('<span class="badge badge--hd">HD</span>');

    card.innerHTML = `
      <div class="video-card__thumb">
        <img class="video-card__img" data-src="${escapeHtml(getPoster(video))}" alt="" loading="lazy" />
        <video class="video-card__preview" muted playsinline loop preload="none"></video>
        ${badges.length ? `<div class="video-card__badges">${badges.join('')}</div>` : ''}
        <span class="video-card__duration">${formatTime(video.duration)}</span>
        ${progress > 1 ? `<div class="video-card__progress"><span style="width:${progress}%"></span></div>` : ''}
        <button class="video-card__menu" aria-label="More options" data-menu>
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
        </button>
        <div class="video-card__overlay">
          <button class="video-card__play" aria-label="Play ${escapeHtml(video.title)}">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        <div class="video-card__quick">
          <button data-quick="like" class="${isLiked ? 'is-on' : ''}" aria-label="Like" title="Like">
            <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H7a2 2 0 01-2-2V12a2 2 0 01.6-1.44l5.2-5.2A2 2 0 0114 6.83V7"/></svg>
          </button>
          <button data-quick="watchlater" class="${isSaved ? 'is-on' : ''}" aria-label="Watch later" title="Watch later">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5l3 2"/></svg>
          </button>
          <button data-quick="queue" aria-label="Add to queue" title="Add to queue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
      <div class="video-card__body">
        <img class="video-card__avatar" src="${escapeHtml(video.author.avatar)}" alt="" loading="lazy" />
        <div class="video-card__info">
          <h3 class="video-card__title">${escapeHtml(video.title)}</h3>
          <div class="video-card__by">
            ${escapeHtml(video.author.name)}
            ${video.author.verified ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
          </div>
          <div class="video-card__view">
            ${formatViews(video.views)} views
            <span class="seperate"></span>
            ${relativeDate(video.publishedAt)}
          </div>
        </div>
      </div>`;

    return card;
  }

  /* ================================================================
     09. GRID RENDERING, FILTERING, SORTING, INFINITE SCROLL
     ================================================================ */

  const grid = $('#videoGrid');
  const sentinel = $('#gridSentinel');
  const loadMoreBtn = $('#loadMoreBtn');

  const thumbObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src) { img.src = src; img.removeAttribute('data-src'); }
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '300px 0px' });

  function applyFilters() {
    let list = State.library.slice();

    // Hidden
    list = list.filter(v => !State.hidden.includes(v.id));

    // Category
    if (State.category && State.category !== 'All') {
      list = list.filter(v => v.category === State.category);
    }

    // Quick filter chips
    switch (State.filter) {
      case 'new':
        list = list.filter(v => (Date.now() - new Date(v.publishedAt).getTime()) < 1000 * 60 * 60 * 24 * 120);
        break;
      case 'hd':
        list = list.filter(v => v.duration > 600);
        break;
      case 'drive':
        list = list.filter(v => v.driveId || v.source === 'drive');
        break;
      case 'short':
        list = list.filter(v => v.duration < 300);
        break;
      case 'long':
        list = list.filter(v => v.duration > 600);
        break;
      case 'liked':
        list = list.filter(v => State.liked.includes(v.id));
        break;
      case 'saved':
        list = list.filter(v => State.watchLater.includes(v.id) || State.favorites.includes(v.id));
        break;
      default: break;
    }

    // Search query
    if (State.query) {
      const q = State.query.toLowerCase();
      list = list.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.author.name.toLowerCase().includes(q) ||
        (v.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (v.category || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    const sorters = {
      newest:   (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
      oldest:   (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt),
      popular:  (a, b) => b.views - a.views,
      liked:    (a, b) => b.likes - a.likes,
      az:       (a, b) => a.title.localeCompare(b.title),
      za:       (a, b) => b.title.localeCompare(a.title),
      duration: (a, b) => b.duration - a.duration
    };
    list.sort(sorters[State.sort] || sorters.newest);

    State.filtered = list;
  }

  function renderGrid(reset = true) {
    if (reset) {
      grid.innerHTML = '';
      State.page = 1;
    }

    const end = State.page * CONFIG.pageSize;
    const slice = State.filtered.slice(0, end);

    if (!State.filtered.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          </div>
          <h3>No videos found</h3>
          <p>Try a different search term, clear the active filters, or import a folder from Google Drive in Settings.</p>
          <button class="btn btn--primary btn--sm" id="clearFiltersBtn">Clear all filters</button>
        </div>`;
      const btn = $('#clearFiltersBtn');
      if (btn) btn.addEventListener('click', () => {
        State.query = '';
        State.filter = 'all';
        State.category = 'All';
        $('#searchInput').value = '';
        $$('#filterChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.filter === 'all'));
        refresh();
      });
      loadMoreBtn.style.display = 'none';
      return;
    }

    const frag = document.createDocumentFragment();
    slice.forEach((video, i) => frag.appendChild(buildCard(video, i)));
    grid.appendChild(frag);

    // Lazy-load thumbnails
    $$('.video-card__img[data-src]', grid).forEach(img => thumbObserver.observe(img));

    // Show / hide the load-more button
    loadMoreBtn.style.display = slice.length < State.filtered.length ? 'inline-flex' : 'none';

    updateGridCountLabel();
  }

  function updateGridCountLabel() {
    const label = $('#videoCountLabel');
    const n = State.filtered.length;
    if (label) label.textContent = `${n} video${n === 1 ? '' : 's'}`;
  }

  const loadMore = () => {
    if (State.page * CONFIG.pageSize >= State.filtered.length) return;
    State.page++;
    renderGrid(false);
  };

  loadMoreBtn.addEventListener('click', loadMore);

  // Infinite scroll
  const scrollObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) loadMore(); });
  }, { rootMargin: '500px' });
  scrollObserver.observe(sentinel);

  function refresh() {
    applyFilters();
    renderGrid(true);
    renderContinueWatching();
  }

  /* ================================================================
     10. HOVER-PREVIEW ENGINE
     ================================================================ */

  let previewTimer = null;
  let previewCard = null;

  function startPreview(card, video) {
    if (!State.settings.hoverPreview) return;
    if (video.sourceKind === 'embed' || video.driveId) return; // iframes can't preview
    if (isTouchDevice()) return;

    const previewEl = card.querySelector('.video-card__preview');
    if (!previewEl) return;

    const src = video.src || (video.driveId ? DriveSource.directUrl(video.driveId) : '');
    if (!src) return;

    previewEl.src = src;
    previewEl.currentTime = Math.max(0, (video.duration || 60) * CONFIG.hoverPreviewStart);
    previewEl.play().then(() => {
      card.classList.add('is-previewing');
      previewCard = card;
    }).catch(() => { /* autoplay blocked — silently ignore */ });
  }

  function stopPreview() {
    clearTimeout(previewTimer);
    if (previewCard) {
      const v = previewCard.querySelector('.video-card__preview');
      if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
      previewCard.classList.remove('is-previewing');
      previewCard = null;
    }
  }

  grid.addEventListener('mouseover', e => {
    const card = e.target.closest('.video-card');
    if (!card || card === previewCard) return;
    stopPreview();
    const video = State.library.find(v => v.id === card.dataset.id);
    if (!video) return;
    previewTimer = setTimeout(() => startPreview(card, video), CONFIG.hoverPreviewDelay);
  });

  grid.addEventListener('mouseout', e => {
    const card = e.target.closest('.video-card');
    if (!card) return;
    if (!e.relatedTarget || !card.contains(e.relatedTarget)) stopPreview();
  });

  /* ================================================================
     11. CONTEXT MENU
     ================================================================ */

  const ctxMenu = $('#ctxMenu');
  let ctxTargetVideo = null;

  function openContextMenu(x, y, video) {
    ctxTargetVideo = video;
    ctxMenu.classList.add('is-open');

    // Keep it on screen
    const rect = ctxMenu.getBoundingClientRect();
    const px = Math.min(x, window.innerWidth - rect.width - 12);
    const py = Math.min(y, window.innerHeight - rect.height - 12);
    ctxMenu.style.left = Math.max(8, px) + 'px';
    ctxMenu.style.top = Math.max(8, py) + 'px';
  }

  function closeContextMenu() {
    ctxMenu.classList.remove('is-open');
    ctxTargetVideo = null;
  }

  document.addEventListener('click', e => {
    if (!ctxMenu.contains(e.target)) closeContextMenu();
  });
  document.addEventListener('scroll', closeContextMenu, true);

  ctxMenu.addEventListener('click', e => {
    const btn = e.target.closest('[data-ctx]');
    if (!btn || !ctxTargetVideo) return;
    const action = btn.dataset.ctx;
    const video = ctxTargetVideo;
    closeContextMenu();

    switch (action) {
      case 'play':        openPlayer(video); break;
      case 'queue':       Queue.add(video, false); Toast.success('Added to queue', video.title); break;
      case 'next':        Queue.addNext(video); Toast.success('Playing next', video.title); break;
      case 'watchlater':  toggleWatchLater(video); break;
      case 'favorite':    toggleFavorite(video); break;
      case 'mini':        openPlayer(video); setTimeout(enterMiniPlayer, 420); break;
      case 'share':       copyToClipboard(shareUrlFor(video)); break;
      case 'copyid':      copyToClipboard(video.driveId || 'Not a Drive video'); break;
      case 'snapshot':    takeSnapshot(); break;
      case 'hide':        hideVideo(video); break;
      default: break;
    }
  });

  function hideVideo(video) {
    if (!State.hidden.includes(video.id)) {
      State.hidden.push(video.id);
      Store.set('hidden', State.hidden);
      refresh();
      Toast.info('Hidden from feed', video.title);
    }
  }

  /* ================================================================
     12. PLAYER ENGINE
     ----------------------------------------------------------------
     One <video> element is created once and physically moved between
     the theater stage and the mini-player stage. Playback continues
     seamlessly because we preserve currentTime / volume / rate.
     ================================================================ */

  const playerStage   = $('#playerStage');
  const miniStage     = $('#miniStage');
  const playerShell   = $('#playerShell');
  const playerAmbient = $('#playerAmbient');
  const playerBigPlay = $('#playerBigPlay');
  const playerSpinner = $('#playerSpinner');
  const playerError   = $('#playerError');
  const playerErrorMsg= $('#playerErrorMsg');
  const playerControls= $('#playerControls');
  const playerFlash   = $('#playerFlash');
  const playerStats   = $('#playerStats');

  const tl          = $('#timeline');
  const tlBuffer    = $('#tlBuffer');
  const tlPlayed    = $('#tlPlayed');
  const tlHandle    = $('#tlHandle');
  const tlTooltip   = $('#tlTooltip');
  const tlPreview   = $('#tlPreview');
  const tlChapters  = $('#tlChapters');
  const tlMarkers   = $('#tlMarkers');
  const scrubVideo  = $('#scrubVideo');

  const ctlPlayIcon = $('#ctlPlayIcon');
  const ctlVolIcon  = $('#ctlVolIcon');
  const ctlFsIcon   = $('#ctlFsIcon');
  const volumeRange = $('#volumeRange');
  const timeCurrent = $('#timeCurrent');
  const timeDuration= $('#timeDuration');
  const speedLabel  = $('#speedLabel');

  const speedMenu   = $('#speedMenu');
  const qualityMenu = $('#qualityMenu');

  const miniPlayer  = $('#miniPlayer');
  const miniTitle   = $('#miniTitle');
  const miniProgress= $('#miniProgress');
  const miniTime    = $('#miniTime');
  const miniPlayIcon= $('#miniPlayIcon');

  const PAUSE_ICON = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
  const PLAY_ICON  = '<path d="M8 5v14l11-7z"/>';

  let video = document.createElement('video');
  video.id = 'vaultVideo';
  video.playsInline = true;
  video.preload = 'metadata';
  video.controls = false;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.crossOrigin = 'anonymous';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'contain';
  video.style.background = '#000';

  let controlsHideTimer = null;
  let flashTimer = null;
  let statsTimer = null;

  /* ---------- 12.1 Volume helpers ---------- */

  function applyVolume(v, persist = true) {
    v = clamp(v, 0, 1);
    video.volume = v;
    video.muted = v === 0;
    volumeRange.value = String(v);
    updateVolumeIcon();
    if (persist) {
      State.settings.volume = v;
      Store.set('settings', State.settings);
    }
  }

  function updateVolumeIcon() {
    const muted = video.muted || video.volume === 0;
    if (muted) {
      ctlVolIcon.innerHTML = '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    } else if (video.volume < 0.5) {
      ctlVolIcon.innerHTML = '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    } else {
      ctlVolIcon.innerHTML = '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 6a9 9 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    }
  }

  /* ---------- 12.2 Flash message on the player ---------- */

  function flash(text) {
    playerFlash.textContent = text;
    playerFlash.classList.add('is-visible');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => playerFlash.classList.remove('is-visible'), 900);
  }

  /* ---------- 12.3 Loading / error states ---------- */

  function showSpinner(show) {
    playerSpinner.classList.toggle('is-visible', !!show);
  }

  function showError(message) {
    playerErrorMsg.textContent = message || 'This video could not be loaded.';
    playerError.classList.add('is-visible');
    showSpinner(false);
  }

  function hideError() { playerError.classList.remove('is-visible'); }

  /* ---------- 12.4 Source resolution ---------- */

  function resolveSource(v) {
    if (v.src) return { kind: 'direct', url: v.src };
    if (v.driveId) return { kind: 'direct', url: DriveSource.directUrl(v.driveId) };
    return { kind: 'none', url: '' };
  }

  function loadSource(v, { autoplay = true, startAt = 0 } = {}) {
    hideError();
    showSpinner(true);

    const resolved = resolveSource(v);
    State.player.sourceKind = resolved.kind;

    // Clear any previously injected iframe
    const oldIframe = playerStage.querySelector('iframe');
    if (oldIframe) oldIframe.remove();

    if (resolved.kind === 'none') {
      showError('No playable source was provided for this video.');
      return;
    }

    // Make sure the <video> element is mounted in the theater stage
    if (video.parentElement !== playerStage) {
      playerStage.insertBefore(video, playerStage.firstChild);
    }

    // Reset
    video.pause();
    video.removeAttribute('src');
    video.innerHTML = '';
    video.load();

    // Caption tracks
    (v.captions || []).forEach(track => {
      const t = document.createElement('track');
      t.kind = 'subtitles';
      t.label = track.label;
      t.srclang = track.srclang;
      t.src = track.src;
      video.appendChild(t);
    });

    video.src = resolved.url;
    video.load();

    if (startAt > 0) {
      video.addEventListener('loadedmetadata', function once() {
        video.removeEventListener('loadedmetadata', once);
        try { video.currentTime = startAt; } catch (e) {}
      });
    }

    video.playbackRate = State.settings.speed || 1;
    speedLabel.textContent = formatSpeed(State.settings.speed || 1);
    applyVolume(State.settings.volume, false);

    if (autoplay) {
      const p = video.play();
      if (p && p.catch) {
        p.catch(() => {
          // Autoplay blocked — surface the big play button
          playerBigPlay.classList.remove('is-hidden');
          $('#bigPlayLabel').textContent = 'Click to play';
        });
      }
    }

    // Scrub preview uses the same source (muted, silent)
    if (resolved.kind === 'direct') {
      scrubVideo.src = resolved.url;
    }
  }

  /** Fallback: swap the <video> for a Drive iframe embed. */
  function loadEmbed(v) {
    if (!v.driveId) {
      showError('Embed fallback is only available for Google Drive videos.');
      return;
    }
    hideError();
    showSpinner(false);
    video.pause();

    const iframe = document.createElement('iframe');
    iframe.src = DriveSource.previewUrl(v.driveId) + '?autoplay=1';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = v.title;

    const existing = playerStage.querySelector('iframe');
    if (existing) existing.remove();
    playerStage.appendChild(iframe);

    State.player.sourceKind = 'embed';
    Toast.info('Using Drive embed', 'Custom controls are disabled in embed mode.');
  }

  /* ---------- 12.5 Play / pause ---------- */

  function togglePlay() {
    if (State.player.sourceKind === 'embed') {
      flash('Embed mode — use the Drive controls');
      return;
    }
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  function setPlayingUI(isPlaying) {
    State.player.isPlaying = isPlaying;
    ctlPlayIcon.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    miniPlayIcon.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    playerBigPlay.classList.toggle('is-hidden', isPlaying);
    if (isPlaying) scheduleControlsHide();
    updateMediaSession();
  }

  /* ---------- 12.6 Progress / timeline ---------- */

  function updateProgressUI() {
    const d = video.duration || 0;
    const c = video.currentTime || 0;
    const pct = d ? (c / d) * 100 : 0;

    tlPlayed.style.width = pct + '%';
    tlHandle.style.left = pct + '%';
    tl.setAttribute('aria-valuenow', String(Math.round(pct)));

    try {
      if (video.buffered.length) {
        const end = video.buffered.end(video.buffered.length - 1);
        tlBuffer.style.width = (d ? (end / d) * 100 : 0) + '%';
      }
    } catch (e) {}

    timeCurrent.textContent = formatTime(c);
    timeDuration.textContent = formatTime(d);

    miniProgress.style.width = pct + '%';
    miniTime.textContent = formatTime(c);

    // Chapter highlighting
    if (State.current && State.current.chapters && State.current.chapters.length) {
      const chapters = State.current.chapters;
      let activeIdx = 0;
      for (let i = 0; i < chapters.length; i++) {
        if (c >= chapters[i].time) activeIdx = i;
      }
      $$('.chapter-item', $('#chapterList')).forEach((node, i) => {
        node.classList.toggle('is-active', i === activeIdx);
      });
    }
  }

  function renderChapterMarkers() {
    tlChapters.innerHTML = '';
    if (!State.current || !State.current.chapters || !video.duration) return;
    State.current.chapters.forEach(ch => {
      const pct = (ch.time / video.duration) * 100;
      const mark = el('div', { class: 'tl__chapter', title: ch.title });
      mark.style.left = pct + '%';
      tlChapters.appendChild(mark);
    });
  }

  /* ---------- 12.7 Seeking ---------- */

  function seekTo(seconds) {
    if (State.player.sourceKind === 'embed') return;
    const d = video.duration || 0;
    video.currentTime = clamp(seconds, 0, d || 0);
  }

  function seekBy(delta) {
    seekTo((video.currentTime || 0) + delta);
  }

  function timelinePointerToTime(clientX) {
    const rect = tl.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * (video.duration || 0);
  }

  let scrubbing = false;

  tl.addEventListener('pointerdown', e => {
    if (State.player.sourceKind === 'embed') return;
    scrubbing = true;
    State.player.isScrubbing = true;
    tl.classList.add('is-scrubbing');
    tl.setPointerCapture(e.pointerId);
    const t = timelinePointerToTime(e.clientX);
    tlPlayed.style.width = ((t / (video.duration || 1)) * 100) + '%';
    tlHandle.style.left = ((t / (video.duration || 1)) * 100) + '%';
    tlTooltip.style.left = ((t / (video.duration || 1)) * 100) + '%';
    tlTooltip.textContent = formatTime(t);
  });

  tl.addEventListener('pointermove', e => {
    const rect = tl.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const t = ratio * (video.duration || 0);

    tlTooltip.textContent = formatTime(t);
    tlTooltip.style.left = (ratio * 100) + '%';

    if (scrubbing) {
      tlPlayed.style.width = (ratio * 100) + '%';
      tlHandle.style.left = (ratio * 100) + '%';
    }

    // Scrub preview frame
    if (!isTouchDevice() && scrubVideo.readyState >= 2 && video.duration) {
      tlPreview.classList.add('is-visible');
      tlPreview.style.left = clamp(ratio * 100, 8, 92) + '%';
      try { scrubVideo.currentTime = t; } catch (err) {}
    }
  });

  tl.addEventListener('pointerup', e => {
    if (!scrubbing) return;
    scrubbing = false;
    State.player.isScrubbing = false;
    tl.classList.remove('is-scrubbing');
    seekTo(timelinePointerToTime(e.clientX));
    try { tl.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  tl.addEventListener('pointerleave', () => {
    tlPreview.classList.remove('is-visible');
  });

  tl.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { seekBy(CONFIG.seekStep); e.preventDefault(); }
    if (e.key === 'ArrowLeft')  { seekBy(-CONFIG.seekStep); e.preventDefault(); }
    if (e.key === 'Home') { seekTo(0); e.preventDefault(); }
    if (e.key === 'End')  { seekTo(video.duration || 0); e.preventDefault(); }
  });

  /* ---------- 12.8 Speed ---------- */

  function formatSpeed(s) {
    return (s === 1 ? '1×' : String(s).replace(/0+$/, '').replace(/\.$/, '') + '×');
  }

  function setSpeed(speed) {
    video.playbackRate = speed;
    State.settings.speed = speed;
    Store.set('settings', State.settings);
    speedLabel.textContent = formatSpeed(speed);
    $$('#speedMenu .player-pop__item').forEach(b => {
      b.classList.toggle('is-active', parseFloat(b.dataset.speed) === speed);
    });
    flash('Speed ' + formatSpeed(speed));
  }

  speedMenu.addEventListener('click', e => {
    const btn = e.target.closest('[data-speed]');
    if (!btn) return;
    setSpeed(parseFloat(btn.dataset.speed));
    closeAllPlayerPops();
  });

  function stepSpeed(dir) {
    const idx = SPEED_PRESETS.indexOf(video.playbackRate);
    const next = SPEED_PRESETS[clamp((idx === -1 ? 3 : idx) + dir, 0, SPEED_PRESETS.length - 1)];
    setSpeed(next);
  }

  /* ---------- 12.9 Player popovers ---------- */

  function closeAllPlayerPops() {
    speedMenu.classList.remove('is-open');
    qualityMenu.classList.remove('is-open');
  }

  $('#ctlSpeed').addEventListener('click', e => {
    e.stopPropagation();
    const open = speedMenu.classList.contains('is-open');
    closeAllPlayerPops();
    if (!open) speedMenu.classList.add('is-open');
  });

  $('#ctlQuality').addEventListener('click', e => {
    e.stopPropagation();
    const open = qualityMenu.classList.contains('is-open');
    closeAllPlayerPops();
    if (!open) qualityMenu.classList.add('is-open');
  });

  qualityMenu.addEventListener('click', e => {
    const btn = e.target.closest('[data-quality]');
    if (!btn) return;
    $$('#qualityMenu .player-pop__item').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    flash('Quality: ' + btn.textContent.trim().split(' ')[0]);
    closeAllPlayerPops();
  });

  document.addEventListener('click', closeAllPlayerPops);

  /* ---------- 12.10 Controls auto-hide ---------- */

  function scheduleControlsHide() {
    clearTimeout(controlsHideTimer);
    if (!State.player.isPlaying) return;
    controlsHideTimer = setTimeout(() => {
      playerStage.classList.remove('is-active');
    }, 2800);
  }

  playerStage.addEventListener('mousemove', () => {
    playerStage.classList.add('is-active');
    scheduleControlsHide();
  });

  playerStage.addEventListener('mouseleave', () => {
    if (State.player.isPlaying) playerStage.classList.remove('is-active');
  });

  /* ---------- 12.11 Click / double click on video ---------- */

  let clickTimer = null;
  playerStage.addEventListener('click', e => {
    if (e.target.closest('.player-controls')) return;
    if (e.target.closest('.player-bigplay')) return;
    if (e.target.closest('.player-stats')) return;

    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => togglePlay(), 190);
  });

  playerStage.addEventListener('dblclick', e => {
    if (e.target.closest('.player-controls')) return;
    clearTimeout(clickTimer);
    toggleFullscreen();
  });

  // Double-tap to seek on touch devices
  let lastTap = 0;
  let lastTapX = 0;
  playerStage.addEventListener('touchend', e => {
    if (e.target.closest('.player-controls')) return;
    const now = Date.now();
    const x = e.changedTouches[0].clientX;
    if (now - lastTap < 300) {
      const rect = playerStage.getBoundingClientRect();
      const isLeft = x < rect.left + rect.width / 2;
      seekBy(isLeft ? -CONFIG.seekStepLarge : CONFIG.seekStepLarge);
      flash((isLeft ? '⏪ ' : '⏩ ') + CONFIG.seekStepLarge + 's');
      showGesture(isLeft ? 'left' : 'right', CONFIG.seekStepLarge);
    }
    lastTap = now;
    lastTapX = x;
  });

  function showGesture(side, seconds) {
    const node = side === 'left' ? $('#gestureLeft') : $('#gestureRight');
    const label = side === 'left' ? $('#gestureLeftText') : $('#gestureRightText');
    label.textContent = seconds + 's';
    node.classList.add('is-visible');
    setTimeout(() => node.classList.remove('is-visible'), 520);
  }

  /* ---------- 12.12 Fullscreen ---------- */

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function toggleFullscreen() {
    const target = playerStage;
    if (!isFullscreen()) {
      const req = target.requestFullscreen || target.webkitRequestFullscreen;
      if (req) req.call(target).catch(() => {});
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document).catch(() => {});
    }
  }

  document.addEventListener('fullscreenchange', () => {
    State.player.isFullscreen = isFullscreen();
    ctlFsIcon.innerHTML = State.player.isFullscreen
      ? '<path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3"/>'
      : '<path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/>';
    if (!State.player.isFullscreen) playerStage.classList.add('is-active');
  });

  /* ---------- 12.13 Picture-in-Picture ---------- */

  async function togglePip() {
    if (State.player.sourceKind === 'embed') {
      Toast.warn('Not available', 'Picture-in-Picture is unavailable in Drive embed mode.');
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        State.player.isPip = false;
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        State.player.isPip = true;
      } else {
        Toast.warn('Not supported', 'Your browser does not support Picture-in-Picture.');
      }
    } catch (e) {
      Toast.error('Picture-in-Picture failed', e.message || '');
    }
  }

  video.addEventListener('enterpictureinpicture', () => { State.player.isPip = true; });
  video.addEventListener('leavepictureinpicture', () => { State.player.isPip = false; });

  /* ---------- 12.14 A–B loop ---------- */

  function handleAbLoop() {
    const loop = State.player.abLoop;
    if (loop.a === null) {
      loop.a = video.currentTime;
      flash('A point set at ' + formatTime(loop.a));
    } else if (loop.b === null) {
      loop.b = video.currentTime;
      if (loop.b <= loop.a) { const t = loop.a; loop.a = loop.b; loop.b = t; }
      flash('A–B loop active');
      renderAbMarkers();
    } else {
      loop.a = null; loop.b = null;
      tlMarkers.innerHTML = '';
      flash('A–B loop cleared');
    }
  }

  function renderAbMarkers() {
    tlMarkers.innerHTML = '';
    const { a, b } = State.player.abLoop;
    const d = video.duration || 1;
    if (a !== null) {
      const m = el('div', { class: 'tl__marker' });
      m.style.left = (a / d) * 100 + '%';
      tlMarkers.appendChild(m);
    }
    if (b !== null) {
      const m = el('div', { class: 'tl__marker' });
      m.style.left = (b / d) * 100 + '%';
      tlMarkers.appendChild(m);
    }
  }

  /* ---------- 12.15 Snapshot ---------- */

  function takeSnapshot() {
    if (State.player.sourceKind === 'embed') {
      Toast.warn('Not available', 'Snapshots are unavailable in Drive embed mode.');
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) { Toast.error('Snapshot failed', 'The frame could not be captured.'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(State.current?.title || 'frame').slice(0, 48).replace(/[^\w\s-]/g, '')}-${Math.floor(video.currentTime)}s.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        Toast.success('Snapshot saved', 'Check your downloads folder.');
      }, 'image/png');
    } catch (e) {
      Toast.error('Snapshot blocked', 'The video source may not allow canvas capture.');
    }
  }

  /* ---------- 12.16 Stats for nerds ---------- */

  function toggleStats() {
    State.player.statsVisible = !State.player.statsVisible;
    playerStats.classList.toggle('is-visible', State.player.statsVisible);
    if (State.player.statsVisible) {
      updateStats();
      statsTimer = setInterval(updateStats, 800);
    } else {
      clearInterval(statsTimer);
    }
  }

  function updateStats() {
    try {
      $('#stRes').textContent = `${video.videoWidth || 0}×${video.videoHeight || 0}`;
      let buf = 0;
      if (video.buffered.length) buf = video.buffered.end(video.buffered.length - 1) - video.currentTime;
      $('#stBuf').textContent = buf.toFixed(1) + 's ahead';
      const q = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
      $('#stDrop').textContent = q ? q.droppedVideoFrames : 'n/a';
      $('#stRate').textContent = video.playbackRate + '×';
      $('#stVol').textContent = Math.round(video.volume * 100) + '%' + (video.muted ? ' (muted)' : '');
      $('#stSrc').textContent = State.player.sourceKind === 'embed' ? 'Drive embed' : (State.current?.driveId ? 'Drive direct' : 'Direct MP4');
      $('#stLat').textContent = State.current?.driveId ? '—' : (video.src.startsWith('blob:') ? 'blob' : 'network');
    } catch (e) {}
  }

  /* ---------- 12.17 Ambient mode ---------- */

  function setAmbient(on) {
    State.settings.ambient = on;
    Store.set('settings', State.settings);
    playerShell.classList.toggle('is-ambient-off', !on);
    $('#setAmbient').checked = on;
    if (on && State.current) {
      playerAmbient.style.backgroundImage = `url("${getPoster(State.current)}")`;
    }
  }

  /* ---------- 12.18 Captions ---------- */

  function toggleCaptions() {
    const tracks = video.textTracks;
    if (!tracks || !tracks.length) {
      flash('No subtitles available');
      return;
    }
    let anyShowing = false;
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].mode === 'showing') anyShowing = true;
    }
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = anyShowing ? 'hidden' : 'showing';
    }
    $('#ctlCaptions').classList.toggle('is-active', !anyShowing);
    flash(anyShowing ? 'Subtitles off' : 'Subtitles on');
  }

  /* ---------- 12.19 Video event wiring ---------- */

  video.addEventListener('loadedmetadata', () => {
    showSpinner(false);
    updateProgressUI();
    renderChapterMarkers();
    renderAbMarkers();
    timeDuration.textContent = formatTime(video.duration);
    updateMediaSession();
  });

  video.addEventListener('timeupdate', () => {
    if (!State.player.isScrubbing) updateProgressUI();
    checkAbLoop();
    savePositionThrottled();
  });

  video.addEventListener('progress', updateProgressUI);
  video.addEventListener('play', () => setPlayingUI(true));
  video.addEventListener('pause', () => setPlayingUI(false));
  video.addEventListener('waiting', () => showSpinner(true));
  video.addEventListener('playing', () => showSpinner(false));
  video.addEventListener('canplay', () => showSpinner(false));

  video.addEventListener('ended', () => {
    setPlayingUI(false);
    clearPosition(State.current?.id);
    if (State.settings.loop) {
      video.currentTime = 0;
      video.play().catch(() => {});
      return;
    }
    if (State.settings.autoplay) {
      const next = Queue.next();
      if (next) { openPlayer(next, { fromQueue: true }); return; }
    }
    playerBigPlay.classList.remove('is-hidden');
    $('#bigPlayLabel').textContent = 'Replay';
  });

  video.addEventListener('error', () => {
    showSpinner(false);
    const v = State.current;
    if (v && v.driveId && State.player.sourceKind !== 'embed') {
      showError('Google Drive refused the direct stream. This usually means the file is not shared publicly. Try the embed fallback below, or set the file to “Anyone with the link can view”.');
    } else {
      showError('The video failed to load. Check the URL, or try again.');
    }
  });

  function checkAbLoop() {
    const { a, b } = State.player.abLoop;
    if (a !== null && b !== null && video.currentTime >= b) {
      video.currentTime = a;
    }
  }

  const savePositionThrottled = throttle(() => {
    if (!State.current || !State.settings.resume) return;
    if (!video.duration) return;
    State.positions[State.current.id] = video.currentTime;
    Store.set('positions', State.positions);
    touchHistory(State.current, video.currentTime);
  }, 4000);

  function clearPosition(id) {
    if (!id) return;
    delete State.positions[id];
    Store.set('positions', State.positions);
  }

  function touchHistory(v, time) {
    const idx = State.history.findIndex(h => h.id === v.id);
    const entry = { id: v.id, time, at: Date.now() };
    if (idx >= 0) State.history.splice(idx, 1);
    State.history.unshift(entry);
    State.history = State.history.slice(0, 30);
    Store.set('history', State.history);
  }

  /* ---------- 12.20 Control button wiring ---------- */

  $('#ctlPlay').addEventListener('click', togglePlay);
  $('#bigPlayBtn').addEventListener('click', e => { e.stopPropagation(); togglePlay(); });
  playerBigPlay.addEventListener('click', togglePlay);

  $('#ctlPrev').addEventListener('click', () => {
    const prev = Queue.previous();
    if (prev) openPlayer(prev, { fromQueue: true });
    else { seekTo(0); flash('Start of video'); }
  });

  $('#ctlNext').addEventListener('click', () => {
    const next = Queue.next();
    if (next) openPlayer(next, { fromQueue: true });
    else flash('Queue is empty');
  });

  $('#ctlMute').addEventListener('click', () => {
    if (video.muted || video.volume === 0) {
      applyVolume(State.player.lastVolume || 0.8);
      flash('Unmuted');
    } else {
      State.player.lastVolume = video.volume;
      applyVolume(0);
      flash('Muted');
    }
  });

  volumeRange.addEventListener('input', e => {
    applyVolume(parseFloat(e.target.value));
    if (parseFloat(e.target.value) > 0) State.player.lastVolume = parseFloat(e.target.value);
  });

  $('#ctlChapters').addEventListener('click', () => {
    switchTab('chapters');
    const el2 = document.querySelector('[data-panel="chapters"]');
    if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  $('#ctlCaptions').addEventListener('click', toggleCaptions);

  $('#ctlLoop').addEventListener('click', () => {
    video.loop = !video.loop;
    $('#ctlLoop').classList.toggle('is-active', video.loop);
    flash(video.loop ? 'Loop on' : 'Loop off');
  });

  $('#ctlAbLoop').addEventListener('click', handleAbLoop);
  $('#ctlStats').addEventListener('click', toggleStats);
  $('#ctlSnapshot').addEventListener('click', takeSnapshot);
  $('#ctlPip').addEventListener('click', togglePip);
  $('#ctlFullscreen').addEventListener('click', toggleFullscreen);
  $('#ctlMini').addEventListener('click', enterMiniPlayer);
  $('#ctlAmbient').addEventListener('click', () => setAmbient(!State.settings.ambient));

  $('#ctlTheater').addEventListener('click', () => {
    const layout = $('.theater__layout');
    State.player.isTheater = !State.player.isTheater;
    layout.style.gridTemplateColumns = State.player.isTheater ? 'minmax(0,1fr)' : '';
    $('#ctlTheater').classList.toggle('is-active', State.player.isTheater);
    Toast.info(State.player.isTheater ? 'Theater mode on' : 'Theater mode off');
  });

  $('#ctlCast').addEventListener('click', async () => {
    if (video.remote && video.remote.state !== 'disconnected') {
      try { await video.remote.prompt(); } catch (e) {}
    } else if (video.remote) {
      try { await video.remote.prompt(); } catch (e) {
        Toast.warn('No cast devices', 'No remote playback device was found.');
      }
    } else {
      Toast.warn('Casting unavailable', 'Your browser does not expose the Remote Playback API.');
    }
  });

  $('#errorRetry').addEventListener('click', () => {
    if (State.current) loadSource(State.current, {
      autoplay: true,
      startAt: State.positions[State.current.id] || 0
    });
  });

  $('#errorEmbed').addEventListener('click', () => {
    if (State.current) loadEmbed(State.current);
  });

  /* ---------- 12.21 Open / close player ---------- */

  const theater = $('#theater');

  function openPlayer(v, opts = {}) {
    if (!v) return;
    State.current = v;

    theater.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Meta
    $('#theaterTitleMini').textContent = v.title;
    $('#vpTitle').textContent = v.title;
    $('#vpAvatar').src = v.author.avatar;
    $('#vpAuthor').textContent = v.author.name;
    $('#vpSubs').textContent = v.author.subscribers
      ? formatNumber(v.author.subscribers) + ' subscribers'
      : 'Imported from Google Drive';
    $('#likeCount').textContent = formatNumber(v.likes);
    $('#vsViews').textContent = formatNumber(v.views) + ' views';
    $('#vsDate').textContent = relativeDate(v.publishedAt);
    $('#vsTags').textContent = (v.tags || []).map(t => '#' + t).join('  ');
    $('#vpDescription').textContent = v.description || 'No description provided.';
    $('#vpTags').textContent = (v.tags || []).map(t => '#' + t).join(' · ');

    $('#btnLike').classList.toggle('is-on', State.liked.includes(v.id));
    $('#btnDislike').classList.toggle('is-on', State.disliked.includes(v.id));
    $('#btnSave').classList.toggle('is-on', State.watchLater.includes(v.id));

    // Reset A–B
    State.player.abLoop = { a: null, b: null };
    tlMarkers.innerHTML = '';

    // Chapters
    renderChapters(v);
    renderComments(v);
    renderRelated(v);
    renderQueue();

    // Source
    const resumeAt = (State.settings.resume && !opts.fromStart) ? (State.positions[v.id] || 0) : 0;
    loadSource(v, { autoplay: true, startAt: resumeAt });

    // Ambient
    setAmbient(State.settings.ambient);
    if (State.settings.ambient) {
      playerAmbient.style.backgroundImage = `url("${getPoster(v)}")`;
    }

    // Fullscreen / mini state
    exitMiniPlayer({ silent: true });
    playerBigPlay.classList.remove('is-hidden');

    // Media session
    updateMediaSession();

    // Mark card as playing
    $$('.video-card').forEach(c => c.classList.toggle('is-playing', c.dataset.id === v.id));

    // Scroll theater to top
    theater.scrollTop = 0;

    // History
    touchHistory(v, resumeAt);

    if (!opts.silent) {
      // Push a history entry so the back button closes the player
      if (!history.state || history.state.player !== v.id) {
        history.pushState({ player: v.id }, '', '#watch=' + v.id);
      }
    }
  }

  function closePlayer() {
    theater.classList.remove('is-open');
    document.body.style.overflow = '';
    stopPreview();
    savePositionThrottled();
    if (State.player.sourceKind !== 'embed') {
      video.pause();
    } else {
      const iframe = playerStage.querySelector('iframe');
      if (iframe) iframe.remove();
    }
    $$('.video-card').forEach(c => c.classList.remove('is-playing'));
  }

  $('#theaterClose').addEventListener('click', closePlayer);
  $('#theaterBack').addEventListener('click', () => history.back());
  $('#theaterMini').addEventListener('click', enterMiniPlayer);

  theater.addEventListener('click', e => {
    // Click on the dark backdrop (not inside the inner content) closes
    if (e.target === theater) closePlayer();
  });

  window.addEventListener('popstate', () => {
    if (theater.classList.contains('is-open')) closePlayer();
  });

  /* ---------- 12.22 Chapters / comments / related ---------- */

  function renderChapters(v) {
    const list = $('#chapterList');
    const count = $('#chapterCount');
    list.innerHTML = '';
    const chapters = v.chapters || [];
    count.textContent = String(chapters.length);

    if (!chapters.length) {
      list.innerHTML = '<p class="video-p-subtitle">This video has no chapters.</p>';
      return;
    }

    chapters.forEach((ch, i) => {
      const item = el('button', { class: 'chapter-item', 'data-time': ch.time });
      item.innerHTML = `
        <span class="chapter-item__time">${formatTime(ch.time)}</span>
        <img class="chapter-item__thumb" src="${escapeHtml(getPoster(v))}" alt="" loading="lazy" />
        <span class="chapter-item__title">${escapeHtml(ch.title)}</span>`;
      item.addEventListener('click', () => {
        seekTo(ch.time);
        video.play().catch(() => {});
        flash('Jumped to ' + ch.title);
      });
      list.appendChild(item);
    });
  }

  function renderComments(v) {
    const list = $('#commentList');
    const count = $('#commentCount');
    const stored = State.comments[v.id] || [];
    const all = stored.concat(v.comments || []);
    count.textContent = String(all.length);

    list.innerHTML = '';
    all.forEach(c => {
      const node = el('div', { class: 'comment' });
      node.innerHTML = `
        <img class="author-img" style="width:40px;height:40px" src="${escapeHtml(c.avatar)}" alt="" loading="lazy" />
        <div class="comment__body">
          <div class="comment__head">
            <span class="comment__name">${escapeHtml(c.author)}</span>
            <span class="comment__time">${escapeHtml(c.time)}</span>
          </div>
          <div class="comment__text">${escapeHtml(c.text)}</div>
          <div class="comment__actions">
            <button><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H7a2 2 0 01-2-2V12a2 2 0 01.6-1.44l5.2-5.2A2 2 0 0114 6.83V7"/></svg> ${c.likes || 0}</button>
            <button>Reply</button>
          </div>
        </div>`;
      list.appendChild(node);
    });
  }

  function renderRelated(v) {
    const list = $('#relatedList');
    list.innerHTML = '';
    const pool = State.library.filter(x => x.id !== v.id);
    // Prefer same category, then fill with the rest
    const sameCat = pool.filter(x => x.category === v.category);
    const rest = pool.filter(x => x.category !== v.category);
    const related = sameCat.concat(rest).slice(0, 8);

    related.forEach(r => {
      const node = el('div', { class: 'rel-item' });
      node.innerHTML = `
        <div class="rel-item__thumb">
          <img src="${escapeHtml(getPoster(r))}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover" />
          <span class="rel-item__dur">${formatTime(r.duration)}</span>
        </div>
        <div class="rel-item__info">
          <div class="rel-item__title">${escapeHtml(r.title)}</div>
          <div class="rel-item__meta">${escapeHtml(r.author.name)} · ${formatViews(r.views)} views</div>
        </div>`;
      node.addEventListener('click', () => openPlayer(r));
      list.appendChild(node);
    });
  }

  $('#commentSubmit').addEventListener('click', () => {
    const input = $('#commentInput');
    const text = input.value.trim();
    if (!text || !State.current) return;
    const list = State.comments[State.current.id] || [];
    list.unshift({
      author: 'You',
      avatar: 'https://images.unsplash.com/photo-1587918842454-870dbd18261a?auto=format&fit=crop&w=100&q=80',
      text,
      time: 'just now',
      likes: 0
    });
    State.comments[State.current.id] = list;
    Store.set('comments', State.comments);
    input.value = '';
    renderComments(State.current);
    Toast.success('Comment posted');
  });

  /* ---------- 12.23 Tabs ---------- */

  function switchTab(name) {
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab === name));
    $$('.tab-panel').forEach(p => p.classList.toggle('is-active', p.dataset.panel === name));
  }

  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  /* ================================================================
     13. MINI PLAYER ENGINE
     ================================================================ */

  let miniPos = Store.get('miniPos', null);
  let miniSize = Store.get('miniSize', null);
  let dragging = false;
  let dragOffset = { x: 0, y: 0 };
  let resizing = false;
  let resizeStart = { x: 0, y: 0, w: 0, h: 0 };

  function enterMiniPlayer() {
    if (State.player.sourceKind === 'embed') {
      Toast.warn('Mini player unavailable', 'Drive embed mode cannot be shrunk into the mini player.');
      return;
    }
    if (!State.current) return;

    State.player.isMini = true;
    miniPlayer.classList.add('is-open');
    miniTitle.textContent = State.current.title;

    // Preserve playback while physically moving the element
    const wasPlaying = !video.paused;
    const t = video.currentTime;
    const rate = video.playbackRate;
    const vol = video.volume;
    const muted = video.muted;

    miniStage.appendChild(video);

    video.currentTime = t;
    video.playbackRate = rate;
    video.volume = vol;
    video.muted = muted;
    if (wasPlaying) video.play().catch(() => {});

    applyMiniPosition();
    applyMiniSize();

    // Close the theater so the mini player is visible
    theater.classList.remove('is-open');
    document.body.style.overflow = '';

    Toast.info('Mini player active', 'Drag the header to move, resize from the corner.');
  }

  function exitMiniPlayer({ silent = false } = {}) {
    if (!State.player.isMini) return;

    const wasPlaying = !video.paused;
    const t = video.currentTime;
    const rate = video.playbackRate;
    const vol = video.volume;
    const muted = video.muted;

    playerStage.insertBefore(video, playerStage.firstChild);

    video.currentTime = t;
    video.playbackRate = rate;
    video.volume = vol;
    video.muted = muted;
    if (wasPlaying) video.play().catch(() => {});

    miniPlayer.classList.remove('is-open');
    State.player.isMini = false;
    if (!silent) { /* nothing else */ }
  }

  $('#miniClose').addEventListener('click', () => {
    video.pause();
    miniPlayer.classList.remove('is-open');
    State.player.isMini = false;
    State.current = null;
  });

  $('#miniExpand').addEventListener('click', () => {
    exitMiniPlayer();
    if (State.current) openPlayer(State.current, { silent: true });
  });

  $('#miniPlayBtn').addEventListener('click', togglePlay);
  $('#miniStage').addEventListener('click', e => {
    if (e.target.closest('.mini-player__overlay')) return;
    togglePlay();
  });

  $('#miniPrev').addEventListener('click', () => {
    const p = Queue.previous();
    if (p) openPlayer(p, { fromQueue: true, silent: true });
  });
  $('#miniNext').addEventListener('click', () => {
    const n = Queue.next();
    if (n) openPlayer(n, { fromQueue: true, silent: true });
  });
  $('#miniRew').addEventListener('click', () => seekBy(-CONFIG.seekStepLarge));
  $('#miniFwd').addEventListener('click', () => seekBy(CONFIG.seekStepLarge));
  $('#miniMute').addEventListener('click', () => {
    video.muted = !video.muted;
    updateVolumeIcon();
  });

  $('#miniTimeline').addEventListener('click', e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    seekTo(ratio * (video.duration || 0));
  });

  /* ---------- 13.1 Drag ---------- */

  const dragHandle = $('#miniDragHandle');

  dragHandle.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    miniPlayer.classList.add('is-dragging');
    const rect = miniPlayer.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    // Switch to left/top positioning while dragging
    miniPlayer.style.left = rect.left + 'px';
    miniPlayer.style.top = rect.top + 'px';
    miniPlayer.style.right = 'auto';
    miniPlayer.style.bottom = 'auto';

    dragHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  dragHandle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const w = miniPlayer.offsetWidth;
    const h = miniPlayer.offsetHeight;
    const x = clamp(e.clientX - dragOffset.x, 8, window.innerWidth - w - 8);
    const y = clamp(e.clientY - dragOffset.y, 8, window.innerHeight - h - 8);
    miniPlayer.style.left = x + 'px';
    miniPlayer.style.top = y + 'px';
  });

  dragHandle.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    miniPlayer.classList.remove('is-dragging');
    snapMiniToNearestCorner();
    try { dragHandle.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  function snapMiniToNearestCorner() {
    const rect = miniPlayer.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;
    const rightSide = midX > window.innerWidth / 2;
    const bottomSide = midY > window.innerHeight / 2;

    miniPlayer.classList.add('is-snapping');
    miniPlayer.style.left = rightSide ? 'auto' : CONFIG.miniSnapMargin + 'px';
    miniPlayer.style.right = rightSide ? CONFIG.miniSnapMargin + 'px' : 'auto';
    miniPlayer.style.top = bottomSide ? 'auto' : CONFIG.miniSnapMargin + 'px';
    miniPlayer.style.bottom = bottomSide ? CONFIG.miniSnapMargin + 'px' : 'auto';

    Store.set('miniPos', { rightSide, bottomSide });
    setTimeout(() => miniPlayer.classList.remove('is-snapping'), 340);
  }

  function applyMiniPosition() {
    if (!miniPos) return;
    miniPlayer.style.left = miniPos.rightSide ? 'auto' : CONFIG.miniSnapMargin + 'px';
    miniPlayer.style.right = miniPos.rightSide ? CONFIG.miniSnapMargin + 'px' : 'auto';
    miniPlayer.style.top = miniPos.bottomSide ? 'auto' : CONFIG.miniSnapMargin + 'px';
    miniPlayer.style.bottom = miniPos.bottomSide ? CONFIG.miniSnapMargin + 'px' : 'auto';
  }

  /* ---------- 13.2 Resize ---------- */

  const resizeHandle = $('#miniResize');

  resizeHandle.addEventListener('pointerdown', e => {
    resizing = true;
    resizeStart = {
      x: e.clientX,
      y: e.clientY,
      w: miniPlayer.offsetWidth,
      h: miniPlayer.offsetHeight
    };
    resizeHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  resizeHandle.addEventListener('pointermove', e => {
    if (!resizing) return;
    const w = clamp(resizeStart.w + (e.clientX - resizeStart.x), 260, window.innerWidth - 40);
    const h = clamp(resizeStart.h + (e.clientY - resizeStart.y), 160, window.innerHeight - 40);
    miniPlayer.style.width = w + 'px';
    miniPlayer.style.height = 'auto';
    miniSize = { w, h };
  });

  resizeHandle.addEventListener('pointerup', e => {
    if (!resizing) return;
    resizing = false;
    if (miniSize) Store.set('miniSize', miniSize);
    try { resizeHandle.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  function applyMiniSize() {
    if (!miniSize) return;
    miniPlayer.style.width = miniSize.w + 'px';
  }

  /* ---------- 13.3 Document Picture-in-Picture ---------- */

  async function enterDocumentPip() {
    if (!('documentPictureInPicture' in window)) {
      Toast.warn('Not supported', 'Document Picture-in-Picture requires Chrome 116+.');
      return;
    }
    if (!State.current) return;
    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 480,
        height: 300
      });

      // Copy styles so the video looks right
      [...document.styleSheets].forEach(sheet => {
        try {
          const css = [...sheet.cssRules].map(r => r.cssText).join('');
          const style = pipWin.document.createElement('style');
          style.textContent = css;
          pipWin.document.head.appendChild(style);
        } catch (e) {}
      });

      const wrapper = pipWin.document.createElement('div');
      wrapper.style.cssText = 'width:100vw;height:100vh;background:#000;display:grid;place-items:center;';
      wrapper.appendChild(video);
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
      pipWin.document.body.style.margin = '0';
      pipWin.document.body.appendChild(wrapper);

      pipWin.addEventListener('pagehide', () => {
        playerStage.insertBefore(video, playerStage.firstChild);
        video.style.width = '100%';
        video.style.height = '100%';
      });

      Toast.success('Floating player opened');
    } catch (e) {
      Toast.error('Floating player failed', e.message || '');
    }
  }

  /* ================================================================
     14. QUEUE / UP-NEXT
     ================================================================ */

  const Queue = {
    add(video, silent = false) {
      if (State.queue.some(q => q.id === video.id)) {
        if (!silent) Toast.info('Already in queue', video.title);
        return;
      }
      State.queue.push(video.id);
      State.queue = State.queue.slice(-CONFIG.maxQueue);
      Store.set('queue', State.queue);
      renderQueue();
      if (!silent) Toast.success('Added to queue', video.title);
    },

    addNext(video) {
      const filtered = State.queue.filter(id => id !== video.id);
      filtered.unshift(video.id);
      State.queue = filtered.slice(0, CONFIG.maxQueue);
      Store.set('queue', State.queue);
      renderQueue();
    },

    remove(id) {
      State.queue = State.queue.filter(q => q !== id);
      Store.set('queue', State.queue);
      renderQueue();
    },

    clear() {
      State.queue = [];
      Store.set('queue', State.queue);
      renderQueue();
      Toast.info('Queue cleared');
    },

    next() {
      if (!State.queue.length) return null;
      let idx = State.queue.indexOf(State.current?.id ?? '');
      // If the current video isn't in the queue, play the head
      if (idx === -1) idx = -1;
      const nextId = State.queue[idx + 1];
      if (nextId) {
        const v = State.library.find(x => x.id === nextId);
        if (v) return v;
      }
      return null;
    },

    previous() {
      if (!State.queue.length) return null;
      const idx = State.queue.indexOf(State.current?.id ?? '');
      if (idx > 0) {
        const v = State.library.find(x => x.id === State.queue[idx - 1]);
        if (v) return v;
      }
      return null;
    },

    reorder(fromIdx, toIdx) {
      const arr = State.queue.slice();
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      State.queue = arr;
      Store.set('queue', State.queue);
      renderQueue();
    }
  };

  function renderQueue() {
    const list = $('#queueList');
    $('#queueCount').textContent = String(State.queue.length);
    $('#nowPlayingBar').style.display = State.current ? 'flex' : 'none';

    if (!State.queue.length) {
      list.innerHTML = `<div style="padding:24px 16px;text-align:center;font-size:13px;color:var(--body-color)">
        Your queue is empty.<br>Add videos with the <b style="color:var(--white)">+</b> button on any card.
      </div>`;
      return;
    }

    list.innerHTML = '';
    State.queue.forEach((id, index) => {
      const v = State.library.find(x => x.id === id);
      if (!v) return;

      const item = el('div', {
        class: 'queue-item' + (State.current && State.current.id === id ? ' is-current' : ''),
        draggable: 'true',
        'data-index': index,
        'data-id': id
      });

      item.innerHTML = `
        <span class="queue-item__grip">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:12px;height:12px"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
        </span>
        <span class="queue-item__num">${index + 1}</span>
        <img class="queue-item__thumb" src="${escapeHtml(getPoster(v))}" alt="" loading="lazy" />
        <div class="queue-item__info">
          <div class="queue-item__title">${escapeHtml(v.title)}</div>
          <div class="queue-item__by">${escapeHtml(v.author.name)} · ${formatTime(v.duration)}</div>
        </div>
        <button class="queue-item__remove" data-remove="${id}" aria-label="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>`;

      item.addEventListener('click', e => {
        if (e.target.closest('[data-remove]')) return;
        openPlayer(v, { fromQueue: true, silent: true });
      });

      // Drag & drop reordering
      item.addEventListener('dragstart', e => {
        item.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      });
      item.addEventListener('dragend', () => item.classList.remove('is-dragging'));
      item.addEventListener('dragover', e => {
        e.preventDefault();
        item.classList.add('is-over');
      });
      item.addEventListener('dragleave', () => item.classList.remove('is-over'));
      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('is-over');
        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const to = index;
        if (!isNaN(from) && from !== to) Queue.reorder(from, to);
      });

      list.appendChild(item);
    });

    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        Queue.remove(btn.dataset.remove);
      });
    });
  }

  $('#queueClear').addEventListener('click', () => Queue.clear());

  /* ================================================================
     15. KEYBOARD SHORTCUTS
     ================================================================ */

  function isTypingContext(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  document.addEventListener('keydown', e => {
    if (isTypingContext(e.target)) {
      if (e.key === 'Escape' && e.target.id === 'searchInput') e.target.blur();
      return;
    }

    const inPlayer = theater.classList.contains('is-open') || State.player.isMini;

    // Global shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      $('#searchInput').focus();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      toggleTheme();
      return;
    }
    if (e.key === '?') { e.preventDefault(); openModal('#shortcutsModal'); return; }
    if (e.key.toLowerCase() === 'b' && !inPlayer) { e.preventDefault(); toggleSidebar(); return; }

    // Player shortcuts
    if (!inPlayer) return;

    const k = e.key;
    const lower = k.toLowerCase();

    switch (lower) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'j':
        e.preventDefault();
        seekBy(-CONFIG.seekStepLarge);
        flash('⏪ 10s');
        break;
      case 'l':
        if (e.shiftKey) { stepSpeed(1); }
        else { e.preventDefault(); seekBy(CONFIG.seekStepLarge); flash('⏩ 10s'); }
        break;
      case 'arrowleft':
        e.preventDefault();
        seekBy(-CONFIG.seekStep);
        showGesture('left', CONFIG.seekStep);
        break;
      case 'arrowright':
        e.preventDefault();
        seekBy(CONFIG.seekStep);
        showGesture('right', CONFIG.seekStep);
        break;
      case 'arrowup':
        e.preventDefault();
        applyVolume(clamp(video.volume + 0.05, 0, 1));
        flash('Volume ' + Math.round(video.volume * 100) + '%');
        break;
      case 'arrowdown':
        e.preventDefault();
        applyVolume(clamp(video.volume - 0.05, 0, 1));
        flash('Volume ' + Math.round(video.volume * 100) + '%');
        break;
      case 'm':
        e.preventDefault();
        $('#ctlMute').click();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 't':
        e.preventDefault();
        $('#ctlTheater').click();
        break;
      case 'i':
        e.preventDefault();
        if (State.player.isMini) {
          exitMiniPlayer();
          openPlayer(State.current, { silent: true });
        } else {
          enterMiniPlayer();
        }
        break;
      case 'p':
        if (e.shiftKey) {
          e.preventDefault();
          const prev = Queue.previous();
          if (prev) openPlayer(prev, { fromQueue: true });
        } else {
          e.preventDefault();
          togglePip();
        }
        break;
      case 'n':
        e.preventDefault();
        if (e.shiftKey) {
          const prev = Queue.previous();
          if (prev) openPlayer(prev, { fromQueue: true });
        } else {
          const next = Queue.next();
          if (next) openPlayer(next, { fromQueue: true });
        }
        break;
      case 'c':
        e.preventDefault();
        toggleCaptions();
        break;
      case 'a':
        e.preventDefault();
        handleAbLoop();
        break;
      case 'q':
        e.preventDefault();
        if (State.current) Queue.add(State.current);
        break;
      case 'escape':
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen();
        else if (miniPlayer.classList.contains('is-open')) {
          exitMiniPlayer();
        } else if (theater.classList.contains('is-open')) {
          closePlayer();
        }
        break;
      default:
        // 0–9 seek to percentage
        if (/^[0-9]$/.test(k) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const pct = parseInt(k, 10) / 10;
          seekTo((video.duration || 0) * pct);
          flash('Jumped to ' + Math.round(pct * 100) + '%');
        }
        // Shift + / - for speed
        if (k === '+' || k === '=') { e.preventDefault(); stepSpeed(1); }
        if (k === '-' || k === '_') { e.preventDefault(); stepSpeed(-1); }
        break;
    }
  });

  function buildShortcutGrid() {
    const grid = $('#shortcutGrid');
    grid.innerHTML = '';
    SHORTCUTS.forEach(s => {
      const row = el('div', { class: 'shortcut-row' });
      const keys = s.keys.map(k => `<span class="kbd">${escapeHtml(k)}</span>`).join('');
      row.innerHTML = `<span>${escapeHtml(s.label)}</span><span class="shortcut-keys">${keys}</span>`;
      grid.appendChild(row);
    });
  }

  /* ================================================================
     16. MODALS
     ================================================================ */

  function openModal(sel) {
    const m = $(sel);
    if (!m) return;
    m.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(sel) {
    const m = $(sel);
    if (!m) return;
    m.classList.remove('is-open');
    if (!$('.modal-backdrop.is-open')) document.body.style.overflow = '';
  }

  $$('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeModal('#' + backdrop.id);
    });
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-close-modal]')) {
      const m = e.target.closest('.modal-backdrop');
      if (m) closeModal('#' + m.id);
    }
  });

  $('#shortcutsBtn').addEventListener('click', () => openModal('#shortcutsModal'));
  $('#settingsBtn').addEventListener('click', () => openModal('#settingsModal'));

  document.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'open-settings') openModal('#settingsModal');
    if (action === 'open-shortcuts') openModal('#shortcutsModal');
    if (action === 'open-watchlater') {
      State.filter = 'saved';
      $$('#filterChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.filter === 'saved'));
      refresh();
    }
    if (action === 'signout') Toast.info('Signed out', 'This is a demo — nothing actually happened.');
  });

  /* ---------- 16.1 Settings wiring ---------- */

  function syncSettingsUI() {
    $('#setAutoplay').checked = State.settings.autoplay;
    $('#setAmbient').checked = State.settings.ambient;
    $('#setHoverPreview').checked = State.settings.hoverPreview;
    $('#setResume').checked = State.settings.resume;
    $('#setLoop').checked = State.settings.loop;
    $('#setDataSaver').checked = State.settings.dataSaver;
    $('#setSpeed').value = String(State.settings.speed);
    $('#setDriveKey').value = CONFIG.drive.apiKey || '';
    $('#setDriveFolder').value = CONFIG.drive.folderId || '';
  }

  function bindSetting(id, key, onChange) {
    const node = $(id);
    if (!node) return;
    node.addEventListener('change', () => {
      const value = node.type === 'checkbox' ? node.checked : node.value;
      State.settings[key] = value;
      Store.set('settings', State.settings);
      if (onChange) onChange(value);
    });
  }

  bindSetting('#setAutoplay', 'autoplay');
  bindSetting('#setAmbient', 'ambient', v => setAmbient(v));
  bindSetting('#setHoverPreview', 'hoverPreview');
  bindSetting('#setResume', 'resume');
  bindSetting('#setLoop', 'loop', v => { video.loop = v; });
  bindSetting('#setDataSaver', 'dataSaver');
  bindSetting('#setSpeed', 'speed', v => setSpeed(parseFloat(v)));

  $('#setDriveKey').addEventListener('change', e => {
    CONFIG.drive.apiKey = e.target.value.trim();
    Store.set('driveApiKey', CONFIG.drive.apiKey);
  });

  $('#setDriveFolder').addEventListener('change', e => {
    CONFIG.drive.folderId = DriveSource.extractId(e.target.value.trim());
    Store.set('driveFolder', CONFIG.drive.folderId);
  });

  $('#driveImportBtn').addEventListener('click', async () => {
    const key = $('#setDriveKey').value.trim();
    const folder = DriveSource.extractId($('#setDriveFolder').value.trim());
    if (!key || !folder) {
      Toast.warn('Missing details', 'Enter both an API key and a folder ID.');
      return;
    }
    Toast.info('Importing…', 'Contacting the Google Drive API.');
    try {
      const items = await DriveSource.listFolder(key, folder);
      if (!items.length) {
        Toast.warn('Nothing found', 'That folder contains no video files.');
        return;
      }
      const existing = new Set(State.library.map(v => v.driveId).filter(Boolean));
      const fresh = items.filter(i => !existing.has(i.driveId));
      State.library = fresh.concat(State.library);
      Store.set('driveLibrary', fresh);
      refresh();
      Toast.success(`Imported ${fresh.length} video${fresh.length === 1 ? '' : 's'}`, 'They now appear at the top of your library.');
    } catch (err) {
      Toast.error('Import failed', err.message || 'Unknown error');
    }
  });

  $('#driveResetBtn').addEventListener('click', () => {
    Store.remove('driveLibrary');
    State.library = LIBRARY.slice();
    refresh();
    Toast.info('Library reset', 'Back to the bundled demo videos.');
  });

  /* ---------- 16.2 Share ---------- */

  function shareUrlFor(v) {
    const base = location.origin + location.pathname;
    return `${base}#watch=${v.id}`;
  }

  function openShareModal(v) {
    $('#shareUrl').value = shareUrlFor(v);
    $('#shareTimestamp').checked = false;
    openModal('#shareModal');
  }

  $('#btnShare2').addEventListener('click', () => State.current && openShareModal(State.current));
  $('#theaterShare').addEventListener('click', () => State.current && openShareModal(State.current));

  $('#shareCopy').addEventListener('click', () => {
    copyToClipboard($('#shareUrl').value);
  });

  $('#shareTimestamp').addEventListener('change', e => {
    if (!State.current) return;
    const t = Math.floor(video.currentTime || 0);
    $('#shareUrl').value = e.target.checked
      ? shareUrlFor(State.current) + '&t=' + t
      : shareUrlFor(State.current);
  });

  $$('[data-share]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = encodeURIComponent($('#shareUrl').value);
      const title = encodeURIComponent(State.current?.title || 'Check out this video');
      const targets = {
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        whatsapp: `https://wa.me/?text=${title}%20${url}`,
        email: `mailto:?subject=${title}&body=${url}`
      };
      if (btn.dataset.share === 'embed') {
        copyToClipboard(`<iframe src="${DriveSource.previewUrl(State.current?.driveId || '')}" width="640" height="360" allowfullscreen></iframe>`);
        return;
      }
      window.open(targets[btn.dataset.share], '_blank', 'noopener');
    });
  });

  function copyToClipboard(text) {
    if (!text) return;
    const done = () => Toast.success('Copied to clipboard', text.slice(0, 64) + (text.length > 64 ? '…' : ''));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { Toast.error('Copy failed'); }
    ta.remove();
  }

  /* ================================================================
     17. THEME
     ================================================================ */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    State.settings.theme = theme;
    Store.set('settings', State.settings);
    const icon = $('#themeIcon');
    if (icon) {
      icon.innerHTML = theme === 'dark'
        ? '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>'
        : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1f1d2b' : '#f4f5fa');
  }

  function toggleTheme() {
    const next = State.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    Toast.info(next === 'dark' ? 'Dark theme' : 'Light theme');
  }

  $('#themeToggle').addEventListener('click', toggleTheme);

  /* ================================================================
     18. MEDIA SESSION API
     ================================================================ */

  function updateMediaSession() {
    if (!('mediaSession' in navigator) || !State.current) return;
    const v = State.current;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: v.title,
        artist: v.author.name,
        album: 'Vault',
        artwork: [
          { src: getPoster(v), sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => video.play());
      navigator.mediaSession.setActionHandler('pause', () => video.pause());
      navigator.mediaSession.setActionHandler('seekbackward', d => seekBy(-(d.seekOffset || 10)));
      navigator.mediaSession.setActionHandler('seekforward', d => seekBy(d.seekOffset || 10));
      navigator.mediaSession.setActionHandler('seekto', d => { if (d.seekTime != null) seekTo(d.seekTime); });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        const p = Queue.previous();
        if (p) openPlayer(p, { fromQueue: true });
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        const n = Queue.next();
        if (n) openPlayer(n, { fromQueue: true });
      });
    } catch (e) {}
  }

  /* ================================================================
     19. LIKES / SAVES / FAVOURITES
     ================================================================ */

  function toggleLike(v) {
    const i = State.liked.indexOf(v.id);
    const d = State.disliked.indexOf(v.id);
    if (d >= 0) State.disliked.splice(d, 1);
    if (i >= 0) {
      State.liked.splice(i, 1);
      v.likes = Math.max(0, v.likes - 1);
      Toast.info('Like removed');
    } else {
      State.liked.push(v.id);
      v.likes += 1;
      Toast.success('Liked', v.title);
    }
    Store.set('liked', State.liked);
    Store.set('disliked', State.disliked);
    $('#btnLike').classList.toggle('is-on', State.liked.includes(v.id));
    $('#btnDislike').classList.toggle('is-on', State.disliked.includes(v.id));
    $('#likeCount').textContent = formatNumber(v.likes);
  }

  function toggleDislike(v) {
    const i = State.disliked.indexOf(v.id);
    const l = State.liked.indexOf(v.id);
    if (l >= 0) { State.liked.splice(l, 1); v.likes = Math.max(0, v.likes - 1); }
    if (i >= 0) State.disliked.splice(i, 1);
    else State.disliked.push(v.id);
    Store.set('liked', State.liked);
    Store.set('disliked', State.disliked);
    $('#btnLike').classList.toggle('is-on', State.liked.includes(v.id));
    $('#btnDislike').classList.toggle('is-on', State.disliked.includes(v.id));
    $('#likeCount').textContent = formatNumber(v.likes);
  }

  function toggleWatchLater(v) {
    const i = State.watchLater.indexOf(v.id);
    if (i >= 0) {
      State.watchLater.splice(i, 1);
      Toast.info('Removed from Watch later');
    } else {
      State.watchLater.push(v.id);
      Toast.success('Saved to Watch later', v.title);
    }
    Store.set('watchLater', State.watchLater);
    if (State.current && State.current.id === v.id) {
      $('#btnSave').classList.toggle('is-on', State.watchLater.includes(v.id));
    }
    refresh();
  }

  function toggleFavorite(v) {
    const i = State.favorites.indexOf(v.id);
    if (i >= 0) { State.favorites.splice(i, 1); Toast.info('Removed from favourites'); }
    else { State.favorites.push(v.id); Toast.success('Added to favourites', v.title); }
    Store.set('favorites', State.favorites);
    refresh();
  }

  $('#btnLike').addEventListener('click', () => State.current && toggleLike(State.current));
  $('#btnDislike').addEventListener('click', () => State.current && toggleDislike(State.current));
  $('#btnSave').addEventListener('click', () => State.current && toggleWatchLater(State.current));
  $('#btnQueue').addEventListener('click', () => State.current && Queue.add(State.current));
  $('#btnDownload').addEventListener('click', () => {
    if (!State.current) return;
    const url = State.current.src || (State.current.driveId ? DriveSource.directUrl(State.current.driveId) : '');
    if (!url) { Toast.warn('No download URL'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = State.current.title + '.mp4';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    Toast.info('Download started', 'Drive files may open in a new tab.');
  });

  /* ================================================================
     20. CONTINUE WATCHING RAIL
     ================================================================ */

  function renderContinueWatching() {
    const rail = $('#continueRail');
    const section = $('#continueSection');
    const items = State.history
      .map(h => ({ entry: h, video: State.library.find(v => v.id === h.id) }))
      .filter(x => x.video)
      .slice(0, 10);

    if (!items.length) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    rail.innerHTML = '';

    items.forEach(({ entry, video: v }) => {
      const pct = v.duration ? clamp((entry.time / v.duration) * 100, 0, 100) : 0;
      const node = el('div', { class: 'rail__item' });
      node.innerHTML = `
        <div class="continue-card">
          <div class="continue-card__thumb">
            <img src="${escapeHtml(getPoster(v))}" alt="" loading="lazy" />
            <div class="continue-card__play">
              <span><svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px;margin-left:2px"><path d="M8 5v14l11-7z"/></svg></span>
            </div>
            <div class="continue-card__bar"><span style="width:${pct}%"></span></div>
          </div>
          <div class="continue-card__body">
            <div class="continue-card__title">${escapeHtml(v.title)}</div>
            <div class="continue-card__meta">${formatTime(entry.time)} / ${formatTime(v.duration)}</div>
          </div>
        </div>`;
      node.querySelector('.continue-card').addEventListener('click', () => openPlayer(v));
      rail.appendChild(node);
    });
  }

  $('#clearHistoryBtn').addEventListener('click', () => {
    State.history = [];
    State.positions = {};
    Store.set('history', []);
    Store.set('positions', {});
    renderContinueWatching();
    Toast.info('Watch history cleared');
  });

  /* ================================================================
     21. GRID EVENT DELEGATION
     ================================================================ */

  grid.addEventListener('click', e => {
    const card = e.target.closest('.video-card');
    if (!card) return;
    const v = State.library.find(x => x.id === card.dataset.id);
    if (!v) return;

    const quick = e.target.closest('[data-quick]');
    if (quick) {
      e.stopPropagation();
      const kind = quick.dataset.quick;
      if (kind === 'like') toggleLike(v);
      if (kind === 'watchlater') toggleWatchLater(v);
      if (kind === 'queue') Queue.add(v);
      return;
    }

    if (e.target.closest('[data-menu]')) {
      e.stopPropagation();
      const rect = e.target.getBoundingClientRect();
      openContextMenu(rect.left, rect.bottom + 6, v);
      return;
    }

    openPlayer(v);
  });

  grid.addEventListener('contextmenu', e => {
    const card = e.target.closest('.video-card');
    if (!card) return;
    e.preventDefault();
    const v = State.library.find(x => x.id === card.dataset.id);
    if (v) openContextMenu(e.clientX, e.clientY, v);
  });

  grid.addEventListener('keydown', e => {
    const card = e.target.closest('.video-card');
    if (!card) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const v = State.library.find(x => x.id === card.dataset.id);
      if (v) openPlayer(v);
    }
    if (e.key.toLowerCase() === 'q') {
      const v = State.library.find(x => x.id === card.dataset.id);
      if (v) Queue.add(v);
    }
  });

  /* ================================================================
     22. TOOLBAR / SEARCH / FILTER WIRING
     ================================================================ */

  $('#searchInput').addEventListener('input', debounce(e => {
    State.query = e.target.value.trim();
    refresh();
  }, 220));

  $('#filterChips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    State.filter = chip.dataset.filter;
    $$('#filterChips .chip').forEach(c => c.classList.toggle('is-active', c === chip));
    refresh();
  });

  $('#categoryMenu').addEventListener('click', e => {
    const link = e.target.closest('[data-cat]');
    if (!link) return;
    e.preventDefault();
    State.category = link.dataset.cat;
    $$('#categoryMenu .sidebar-link').forEach(l => l.classList.toggle('is-active', l === link));
    refresh();
    Toast.info('Category: ' + State.category);
  });

  document.addEventListener('click', e => {
    const sortBtn = e.target.closest('[data-sort]');
    if (!sortBtn) return;
    State.sort = sortBtn.dataset.sort;
    Store.set('sort', State.sort);
    const labels = {
      newest: 'Newest', oldest: 'Oldest', popular: 'Most viewed',
      liked: 'Most liked', az: 'A → Z', za: 'Z → A', duration: 'Longest'
    };
    $('#sortLabel').textContent = labels[State.sort] || 'Sort';
    refresh();
  });

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.view = btn.dataset.view;
      Store.set('view', State.view);
      grid.classList.toggle('is-list', State.view === 'list');
      $$('[data-view]').forEach(b => b.classList.toggle('is-active', b === btn));
    });
  });

  /* ================================================================
     23. SIDEBAR
     ================================================================ */

  const sidebar = $('#sidebar');
  const sidebarBackdrop = $('#sidebarBackdrop');

  function toggleSidebar() {
    if (window.innerWidth <= 1100) {
      sidebar.classList.toggle('is-mobile-open');
      sidebarBackdrop.classList.toggle('is-open', sidebar.classList.contains('is-mobile-open'));
    } else {
      sidebar.classList.toggle('is-collapsed');
      Store.set('sidebarCollapsed', sidebar.classList.contains('is-collapsed'));
    }
  }

  $('#sidebarToggle').addEventListener('click', toggleSidebar);
  sidebarBackdrop.addEventListener('click', () => {
    sidebar.classList.remove('is-mobile-open');
    sidebarBackdrop.classList.remove('is-open');
  });

  $$('.sidebar-link[data-nav]').forEach(link => {
    link.addEventListener('click', e => {
      if (link.dataset.nav === 'discover' || link.dataset.nav === 'trending') {
        e.preventDefault();
      }
      $$('.sidebar-link[data-nav]').forEach(l => l.classList.toggle('is-active', l === link));
    });
  });

  /* ================================================================
     24. SCROLL TO TOP
     ================================================================ */

  const mainContainer = $('#mainContainer');
  const scrollTopBtn = $('#scrollTop');

  mainContainer.addEventListener('scroll', throttle(() => {
    scrollTopBtn.classList.toggle('is-visible', mainContainer.scrollTop > 600);
  }, 120));

  scrollTopBtn.addEventListener('click', () => {
    mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ================================================================
     25. NOTIFICATIONS (decorative)
     ================================================================ */

  $('#notifyBtn').addEventListener('click', () => {
    const dot = $('.icon-btn__dot');
    if (dot) dot.remove();
    Toast.info('You are all caught up', 'No new notifications.');
  });

  /* ================================================================
     26. HERO WIRING
     ================================================================ */

  function wireHero() {
    const featured = State.library[0];
    const second = State.library[1];

    if (featured) {
      $('#featuredTitle').textContent = featured.title;
      $('#featuredCard').style.backgroundImage = `url("${getPoster(featured)}")`;
      $('#featuredMeta').innerHTML = `
        <img class="user-img" style="width:26px;height:26px" src="${escapeHtml(featured.author.avatar)}" alt="">
        <span>${escapeHtml(featured.author.name)}</span><span class="seperate"></span>
        <span>${formatViews(featured.views)} views</span><span class="seperate"></span>
        <span>${relativeDate(featured.publishedAt)}</span>`;
      $('#featuredPlay').addEventListener('click', () => openPlayer(featured));
      $('#featuredQueue').addEventListener('click', () => Queue.add(featured));
      $('#featuredInfo').addEventListener('click', () => openPlayer(featured));
    }

    if (second) {
      const card2 = $('#featuredCard2');
      card2.querySelector('.featured-card__title').textContent = second.title;
      card2.style.backgroundImage = `url("${getPoster(second)}")`;
      const meta = card2.querySelector('.featured-card__meta');
      meta.innerHTML = `
        <img class="user-img" style="width:26px;height:26px" src="${escapeHtml(second.author.avatar)}" alt="">
        <span>${escapeHtml(second.author.name)}</span><span class="seperate"></span>
        <span>${formatViews(second.views)} views</span>`;
      card2.querySelector('[data-play-featured]').addEventListener('click', () => openPlayer(second));
    }
  }

  /* ================================================================
     27. GOOGLE DRIVE LIBRARY RESTORE
     ================================================================ */

  function restoreDriveLibrary() {
    const saved = Store.get('driveLibrary', null);
    if (Array.isArray(saved) && saved.length) {
      State.library = saved.concat(LIBRARY);
    } else {
      State.library = LIBRARY.slice();
    }
  }

  /* ================================================================
     28. DEEP LINKING (#watch=id)
     ================================================================ */

  function handleDeepLink() {
    const hash = location.hash;
    const m = hash.match(/#watch=([\w-]+)/);
    if (!m) return;
    const v = State.library.find(x => x.id === m[1]);
    if (v) {
      // Defer so the grid renders first
      setTimeout(() => openPlayer(v, { silent: true }), 320);
    }
  }

  /* ================================================================
     29. FIRST-RUN ONBOARDING TOASTS
     ================================================================ */

  function firstRunHints() {
    if (Store.get('visited', false)) return;
    Store.set('visited', true);
    setTimeout(() => Toast.info('Welcome to Vault', 'Press ? for keyboard shortcuts, or hover a card to preview it.', 6000), 900);
    setTimeout(() => Toast.info('Google Drive ready', 'Add your file IDs in Settings to stream from your own Drive.', 7000), 3600);
  }

  /* ================================================================
     30. BOOT SEQUENCE
     ================================================================ */

  function boot() {
    // Theme
    applyTheme(State.settings.theme || 'dark');

    // Sidebar state
    if (Store.get('sidebarCollapsed', false) && window.innerWidth > 1100) {
      sidebar.classList.add('is-collapsed');
    }

    // View mode
    grid.classList.toggle('is-list', State.view === 'list');
    $$('[data-view]').forEach(b => b.classList.toggle('is-active', b.dataset.view === State.view));

    // Drive config restore
    CONFIG.drive.apiKey = Store.get('driveApiKey', CONFIG.drive.apiKey);
    CONFIG.drive.folderId = Store.get('driveFolder', CONFIG.drive.folderId);

    // Library
    restoreDriveLibrary();

    // Initial volume / speed
    applyVolume(State.settings.volume, false);
    video.loop = State.settings.loop;
    setSpeed(State.settings.speed || 1);

    // UI builds
    buildShortcutGrid();
    syncSettingsUI();
    wireHero();
    refresh();
    renderQueue();

    // Shortcuts modal open/close consistency
    $('#settingsBtn').addEventListener('click', syncSettingsUI);

    // Deep link
    handleDeepLink();
    window.addEventListener('hashchange', handleDeepLink);

    // First-run hints
    firstRunHints();

    // Keyboard lock state for PiP
    video.addEventListener('enterpictureinpicture', () => {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });

    // Prevent the browser's default drag behaviour on the mini player
    miniPlayer.addEventListener('dragstart', e => e.preventDefault());

    // Responsive: clamp the mini player into view on resize
    window.addEventListener('resize', debounce(() => {
      if (!miniPlayer.classList.contains('is-open')) return;
      const rect = miniPlayer.getBoundingClientRect();
      if (rect.right > window.innerWidth || rect.left < 0 || rect.bottom > window.innerHeight) {
        miniPlayer.style.left = 'auto';
        miniPlayer.style.top = 'auto';
        miniPlayer.style.right = CONFIG.miniSnapMargin + 'px';
        miniPlayer.style.bottom = CONFIG.miniSnapMargin + 'px';
      }
    }, 200));

    // Double-click on the mini player header expands it
    dragHandle.addEventListener('dblclick', () => {
      exitMiniPlayer();
      if (State.current) openPlayer(State.current, { silent: true });
    });

    // Save state before unload
    window.addEventListener('beforeunload', () => {
      savePositionThrottled();
      Store.set('settings', State.settings);
    });

    // Console easter egg
    console.log('%cVault', 'font-size:34px;font-weight:800;color:#6c5ecf;text-shadow:0 2px 14px rgba(108,94,207,.6)');
    console.log('%cAdvanced video gallery & player — built with vanilla JS.', 'color:#808191;font-size:12px');
    console.log('%cAdd your Google Drive file IDs in Settings → Google Drive API key.', 'color:#22b07d;font-size:12px');
  }

  // Kick everything off once the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();/* ==================================================================
   VAULT — APPLICATION SCRIPT
   Vanilla JS. No framework. No jQuery. Everything is hand-rolled.
   ------------------------------------------------------------------
   Table of contents
   01. Configuration & constants
   02. The video library (demo data + Google Drive entries)
   03. Tiny DOM/utility helpers
   04. Persistent storage layer
   05. Toast system
   06. Google Drive adapter (direct / embed / thumbnail / API)
   07. Global application state
   08. Video card rendering
   09. Grid rendering, filtering, sorting, infinite scroll
   10. Hover-preview engine
   11. Context menu
   12. Player engine (the big one)
   13. Mini player engine (drag / resize / snap)
   14. Queue / up-next management
   15. Keyboard shortcuts
   16. Modals
   17. Theme
   18. Media Session API
   19. Document Picture-in-Picture
   20. Boot
   ================================================================== */

(function () {
  'use strict';

  /* ================================================================
     01. CONFIGURATION & CONSTANTS
     ================================================================ */

  const CONFIG = {
    storagePrefix: 'vault.',
    pageSize: 8,
    hoverPreviewDelay: 700,
    hoverPreviewStart: 0.25,      // start preview at 25% of the video
    resumeThreshold: 10,           // seconds — below this we don't resume
    resumeComplete: 0.95,          // above this fraction we consider it watched
    seekStep: 5,
    seekStepLarge: 10,
    maxQueue: 100,
    miniSnapMargin: 22,
    defaultVolume: 1,
    drive: {
      // Paste an API key + folder id here, or set them in Settings.
      apiKey: '',
      folderId: '',
      autoLoad: false
    }
  };

  const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const SHORTCUTS = [
    { keys: ['Space', 'K'], label: 'Play / Pause' },
    { keys: ['J'], label: 'Rewind 10 seconds' },
    { keys: ['L'], label: 'Forward 10 seconds' },
    { keys: ['←'], label: 'Rewind 5 seconds' },
    { keys: ['→'], label: 'Forward 5 seconds' },
    { keys: ['↑'], label: 'Volume up 5%' },
    { keys: ['↓'], label: 'Volume down 5%' },
    { keys: ['M'], label: 'Mute / Unmute' },
    { keys: ['F'], label: 'Fullscreen' },
    { keys: ['T'], label: 'Theater mode' },
    { keys: ['I'], label: 'Mini player' },
    { keys: ['P'], label: 'Picture-in-Picture' },
    { keys: ['C'], label: 'Toggle subtitles' },
    { keys: ['A'], label: 'Set A–B loop point' },
    { keys: ['L'], label: 'Toggle loop' },
    { keys: ['0', '–', '9'], label: 'Jump to 0–90%' },
    { keys: ['Shift', '+'], label: 'Increase speed' },
    { keys: ['Shift', '–'], label: 'Decrease speed' },
    { keys: ['N'], label: 'Next video' },
    { keys: ['Shift', 'P'], label: 'Previous video' },
    { keys: ['Q'], label: 'Add to queue' },
    { keys: ['Esc'], label: 'Close player / overlay' },
    { keys: ['?'], label: 'Show shortcuts' },
    { keys: ['B'], label: 'Toggle sidebar' },
    { keys: ['Ctrl', 'K'], label: 'Focus search' },
    { keys: ['Ctrl', '/'], label: 'Toggle theme' }
  ];

  /* ================================================================
     02. THE VIDEO LIBRARY
     ----------------------------------------------------------------
     HOW TO USE YOUR OWN GOOGLE DRIVE VIDEOS
     ----------------------------------------------------------------
     1) Upload the video to Google Drive.
     2) Right-click → Share → "Anyone with the link" → Viewer → Copy link.
     3) The link looks like:
        https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^ this is the file id
     4) Add an entry below with `driveId: 'THE_FILE_ID'`.
     5) Optionally add `poster` — otherwise Vault uses Drive's own thumbnail
        endpoint automatically:
        https://drive.google.com/thumbnail?id=FILE_ID&sz=w1280
     ----------------------------------------------------------------
     GOOGLE PHOTOS
     ----------------------------------------------------------------
     Google Photos does not expose direct, publicly streamable MP4 URLs
     without OAuth. The practical route is:
       a) Download the item from Photos, then re-upload to Drive, OR
       b) Use the Photos Library API (OAuth) to fetch `baseUrl=dv`, which
          yields a short-lived direct stream URL. Paste that URL into `src`.
     Vault supports both — just supply `src` for a Photos direct URL, or
     `driveId` for Drive-hosted videos.
     ================================================================ */

  const LIBRARY = [
    {
      id: 'v01',
      title: 'Basic how to ride your skateboard comfortably',
      description: 'In this beginner-friendly session we break down stance, foot placement, pushing technique and the small balance drills that make everything else click. Practise each drill for five minutes before moving on — repetition beats theory every single time.',
      src: 'https://player.vimeo.com/external/436572488.sd.mp4?s=eae5fb490e214deb9ff532dd98d101efe94e7a8b&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 486,
      views: 54210,
      likes: 3120,
      category: 'Skateboarding',
      tags: ['beginner', 'basics', 'street'],
      publishedAt: '2024-11-04',
      author: { name: 'Andy William', avatar: 'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 1980893, verified: true },
      chapters: [
        { time: 0, title: 'Intro — what you need' },
        { time: 62, title: 'Stance & foot placement' },
        { time: 148, title: 'Your first push' },
        { time: 245, title: 'Turning with your shoulders' },
        { time: 340, title: 'Stopping safely' },
        { time: 430, title: 'Practice routine' }
      ],
      comments: [
        { author: 'Wijaya Adabi', avatar: 'https://images.unsplash.com/photo-1560941001-d4b52ad00ecc?auto=format&fit=crop&w=100&q=80', text: 'The shoulder-turning tip at 4:05 completely fixed my carving. Thanks!', time: '2 days ago', likes: 44 },
        { author: 'Johny Wise', avatar: 'https://images.pexels.com/photos/2889942/pexels-photo-2889942.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', text: 'Watched this three times. The practice routine is gold.', time: '5 days ago', likes: 21 },
        { author: 'Budi Hakim', avatar: 'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?auto=format&fit=crop&w=100&q=80', text: 'Any chance of a follow-up on ollies?', time: '1 week ago', likes: 12 }
      ]
    },
    {
      id: 'v02',
      title: 'Prepare for your first skateboard jump',
      description: 'Jumping is 20% pop and 80% commitment. We walk through the ollie motion frame by frame, then run a set of confidence drills over a chalk line before you ever attempt it rolling.',
      src: 'https://player.vimeo.com/external/449972745.sd.mp4?s=9943177fe8a6147b7bc4598259401f06ec57878a&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 312,
      views: 42190,
      likes: 2410,
      category: 'Tutorial',
      tags: ['ollie', 'jump', 'intermediate'],
      publishedAt: '2024-10-22',
      author: { name: 'Gerard Bind', avatar: 'https://images.pexels.com/photos/3370021/pexels-photo-3370021.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 842100, verified: false },
      chapters: [
        { time: 0, title: 'Why jumps feel scary' },
        { time: 55, title: 'The pop — slow motion' },
        { time: 140, title: 'Slide and level out' },
        { time: 210, title: 'Chalk-line drills' },
        { time: 270, title: 'Common mistakes' }
      ],
      comments: [
        { author: 'Thomas Hope', avatar: 'https://images.pexels.com/photos/1870163/pexels-photo-1870163.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', text: 'The slow-motion section is the clearest ollie breakdown on the internet.', time: '3 days ago', likes: 67 }
      ]
    },
    {
      id: 'v03',
      title: 'Basic equipment to play skateboard safely',
      description: 'Helmets, pads, deck widths, wheel durometer and bearing ratings — a no-nonsense buyer's guide so you spend money once instead of three times.',
      src: 'https://player.vimeo.com/external/436553499.sd.mp4?s=0e44527f269278743db448761e35c5e39cfaa52c&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 402,
      views: 64230,
      likes: 4180,
      category: 'Tutorial',
      tags: ['gear', 'safety', 'buying guide'],
      publishedAt: '2024-10-11',
      author: { name: 'John Wise', avatar: 'https://images.pexels.com/photos/1870163/pexels-photo-1870163.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 511900, verified: true },
      chapters: [
        { time: 0, title: 'Helmets that actually fit' },
        { time: 90, title: 'Pads and wrist guards' },
        { time: 180, title: 'Deck width explained' },
        { time: 280, title: 'Wheels & bearings' },
        { time: 350, title: 'Budget build list' }
      ],
      comments: []
    },
    {
      id: 'v04',
      title: 'Tips to playing skateboard on the ramp',
      description: 'Transition skating is all about pumping and weight transfer. We cover drop-ins, kick turns, axle stalls and how to bail without breaking a wrist.',
      src: 'https://player.vimeo.com/external/361861493.sd.mp4?s=19d8275ca755d653042a87ef28b2f0b2eabf57d0&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1564982752387-9b2c4b3b1b1c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 366,
      views: 50110,
      likes: 2890,
      category: 'Skateboarding',
      tags: ['ramp', 'transition', 'pumping'],
      publishedAt: '2024-09-28',
      author: { name: 'Budi Hakim', avatar: 'https://images.pexels.com/photos/2889942/pexels-photo-2889942.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 233400, verified: false },
      chapters: [
        { time: 0, title: 'Reading the ramp' },
        { time: 70, title: 'Pumping for speed' },
        { time: 160, title: 'Your first drop-in' },
        { time: 250, title: 'Kick turns' },
        { time: 320, title: 'Bailing safely' }
      ],
      comments: []
    },
    {
      id: 'v05',
      title: 'Street lines — full session in downtown',
      description: 'A raw 12-minute edit from a Saturday session: warm-up, three lines, one slam, and the make that saved the day.',
      src: 'https://player.vimeo.com/external/390402719.sd.mp4?s=20cfdb066c4253047562b65bd4e411b86a004bc5&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 742,
      views: 88120,
      likes: 6120,
      category: 'Competition',
      tags: ['street', 'session', 'edit'],
      publishedAt: '2024-09-15',
      author: { name: 'Tony Andrew', avatar: 'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?auto=format&fit=crop&w=100&q=80', subscribers: 1204300, verified: true },
      chapters: [
        { time: 0, title: 'Warm up' },
        { time: 180, title: 'Line one' },
        { time: 380, title: 'The slam' },
        { time: 520, title: 'Line two' },
        { time: 660, title: 'The make' }
      ],
      comments: []
    },
    {
      id: 'v06',
      title: 'Building a community skatepark — full documentary',
      description: 'How a group of volunteers turned an abandoned lot into a fully legal, free-to-use skatepark in eleven months.',
      src: 'https://player.vimeo.com/external/436572488.sd.mp4?s=eae5fb490e214deb9ff532dd98d101efe94e7a8b&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 1520,
      views: 129400,
      likes: 9820,
      category: 'Community',
      tags: ['documentary', 'community', 'build'],
      publishedAt: '2024-08-30',
      author: { name: 'Vault Originals', avatar: 'https://images.unsplash.com/photo-1587918842454-870dbd18261a?auto=format&fit=crop&w=100&q=80', subscribers: 3400000, verified: true },
      chapters: [
        { time: 0, title: 'The empty lot' },
        { time: 300, title: 'Getting permission' },
        { time: 640, title: 'Raising the money' },
        { time: 980, title: 'Pouring concrete' },
        { time: 1280, title: 'Opening day' }
      ],
      comments: []
    },
    {
      id: 'v07',
      title: 'Flatground freestyle — 30 tricks in 30 minutes',
      description: 'A rapid-fire freestyle session. Every trick is timestamped in the chapters panel so you can jump straight to the one you want to learn.',
      src: 'https://player.vimeo.com/external/449972745.sd.mp4?s=9943177fe8a6147b7bc4598259401f06ec57878a&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 1804,
      views: 231900,
      likes: 15320,
      category: 'Competition',
      tags: ['freestyle', 'flatground', 'tricks'],
      publishedAt: '2024-08-02',
      author: { name: 'Andy William', avatar: 'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 1980893, verified: true },
      chapters: [
        { time: 0, title: 'Trick 1–5' },
        { time: 320, title: 'Trick 6–12' },
        { time: 780, title: 'Trick 13–20' },
        { time: 1240, title: 'Trick 21–27' },
        { time: 1620, title: 'Trick 28–30' }
      ],
      comments: []
    },
    {
      id: 'v08',
      title: 'Slow-motion cinematography for skate films',
      description: 'Frame rates, shutter angles, gimbal work and colour grading — how to make a phone edit look like a $50k production.',
      src: 'https://player.vimeo.com/external/436553499.sd.mp4?s=0e44527f269278743db448761e35c5e39cfaa52c&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 528,
      views: 76500,
      likes: 5240,
      category: 'Tutorial',
      tags: ['filming', 'cinematography', 'editing'],
      publishedAt: '2024-07-19',
      author: { name: 'Lena Park', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80', subscribers: 654000, verified: true },
      chapters: [
        { time: 0, title: 'Frame rate basics' },
        { time: 120, title: 'Shutter angle' },
        { time: 250, title: 'Gimbal technique' },
        { time: 380, title: 'Colour grading' },
        { time: 470, title: 'Export settings' }
      ],
      comments: []
    },
    {
      id: 'v09',
      title: 'Downhill racing — the full mountain run',
      description: 'A single unbroken 90-second run at 70 km/h, then a breakdown of the racing line and braking points.',
      src: 'https://player.vimeo.com/external/361861493.sd.mp4?s=19d8275ca755d653042a87ef28b2f0b2eabf57d0&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 268,
      views: 412300,
      likes: 32400,
      category: 'Competition',
      tags: ['downhill', 'racing', 'speed'],
      publishedAt: '2024-06-25',
      author: { name: 'Marco Silva', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', subscribers: 2870000, verified: true },
      chapters: [
        { time: 0, title: 'The run' },
        { time: 95, title: 'Racing line breakdown' },
        { time: 180, title: 'Braking points' }
      ],
      comments: []
    },
    {
      id: 'v10',
      title: 'Deck shapes explained — every width compared',
      description: '7.5" to 9.0" decks side by side. Which width suits which foot size, riding style and trick vocabulary.',
      src: 'https://player.vimeo.com/external/390402719.sd.mp4?s=20cfdb066c4253047562b65bd4e411b86a004bc5&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 234,
      views: 28900,
      likes: 1740,
      category: 'Tutorial',
      tags: ['gear', 'decks', 'sizing'],
      publishedAt: '2024-06-01',
      author: { name: 'John Wise', avatar: 'https://images.pexels.com/photos/1870163/pexels-photo-1870163.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 511900, verified: true },
      chapters: [],
      comments: []
    },
    {
      id: 'v11',
      title: 'Night session — LED boards and city lights',
      description: 'A moody night edit shot entirely between 11pm and 3am. Ambient mode looks fantastic on this one.',
      src: 'https://player.vimeo.com/external/436572488.sd.mp4?s=eae5fb490e214deb9ff532dd98d101efe94e7a8b&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 194,
      views: 98700,
      likes: 8410,
      category: 'Community',
      tags: ['night', 'led', 'edit', 'aesthetic'],
      publishedAt: '2024-05-14',
      author: { name: 'Nova Collective', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80', subscribers: 421000, verified: false },
      chapters: [],
      comments: []
    },
    {
      id: 'v12',
      title: 'Beginner to confident in 30 days — full plan',
      description: 'A day-by-day training plan with a downloadable checklist. This is the companion video to the 30-day series.',
      src: 'https://player.vimeo.com/external/449972745.sd.mp4?s=9943177fe8a6147b7bc4598259401f06ec57878a&profile_id=139&oauth2_token_id=57447761',
      poster: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      duration: 912,
      views: 175600,
      likes: 14200,
      category: 'Tutorial',
      tags: ['plan', '30 days', 'beginner'],
      publishedAt: '2024-04-30',
      author: { name: 'Andy William', avatar: 'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=100', subscribers: 1980893, verified: true },
      chapters: [
        { time: 0, title: 'Week 1 — comfort' },
        { time: 220, title: 'Week 2 — pushing' },
        { time: 460, title: 'Week 3 — turning' },
        { time: 700, title: 'Week 4 — first tricks' },
        { time: 860, title: 'What next' }
      ],
      comments: []
    }
  ];

  /* ================================================================
     03. TINY DOM / UTILITY HELPERS
     ================================================================ */

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, '');
      else if (v !== false && v != null) node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatViews(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function formatNumber(n) { return new Intl.NumberFormat().format(n); }

  function relativeDate(iso) {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    const units = [
      ['year', 31536000], ['month', 2592000], ['week', 604800],
      ['day', 86400], ['hour', 3600], ['minute', 60]
    ];
    for (const [name, secs] of units) {
      const v = Math.floor(diff / secs);
      if (v >= 1) return `${v} ${name}${v > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  }

  function debounce(fn, wait = 200) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function throttle(fn, limit = 100) {
    let last = 0, timer = null;
    return function (...args) {
      const now = Date.now();
      if (now - last >= limit) { last = now; fn.apply(this, args); }
      else {
        clearTimeout(timer);
        timer = setTimeout(() => { last = Date.now(); fn.apply(this, args); }, limit - (now - last));
      }
    };
  }

  function uid(prefix = 'id') {
    return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  /* ================================================================
     04. PERSISTENT STORAGE LAYER
     ================================================================ */

  const Store = {
    key(k) { return CONFIG.storagePrefix + k; },
    get(k, fallback = null) {
      try {
        const raw = localStorage.getItem(this.key(k));
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(this.key(k), JSON.stringify(v)); return true; }
      catch (e) { return false; }
    },
    remove(k) { try { localStorage.removeItem(this.key(k)); } catch (e) {} },
    clear() {
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith(CONFIG.storagePrefix))
          .forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
  };

  /* ================================================================
     05. TOAST SYSTEM
     ================================================================ */

  const Toast = (() => {
    const stack = $('#toastStack');
    const ICONS = {
      info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>',
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>',
      error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      warn:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
    };

    function show(type, title, msg = '', duration = 3600) {
      const node = el('div', { class: `toast toast--${type}` });
      node.innerHTML = `
        <span class="toast__icon">${ICONS[type] || ICONS.info}</span>
        <div class="toast__body">
          <div class="toast__title">${escapeHtml(title)}</div>
          ${msg ? `<div class="toast__msg">${escapeHtml(msg)}</div>` : ''}
        </div>
        <button class="toast__close" aria-label="Dismiss">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:13px;height:13px"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>`;

      const dismiss = () => {
        node.classList.add('is-out');
        setTimeout(() => node.remove(), 300);
      };

      node.querySelector('.toast__close').addEventListener('click', dismiss);
      stack.appendChild(node);
      if (duration > 0) setTimeout(dismiss, duration);
      return { dismiss };
    }

    return {
      info: (t, m, d) => show('info', t, m, d),
      success: (t, m, d) => show('success', t, m, d),
      error: (t, m, d) => show('error', t, m, d, d || 5200),
      warn: (t, m, d) => show('warn', t, m, d)
    };
  })();

  /* ================================================================
     06. GOOGLE DRIVE ADAPTER
     ----------------------------------------------------------------
     Provides the four URL shapes we need:
       - directUrl()   → progressive MP4 stream for <video src>
       - previewUrl()  → iframe embed used as a fallback
       - thumbUrl()    → poster image at a given width
       - listFolder()  → Drive API v3 listing (needs an API key)
     ================================================================ */

  const DriveSource = {
    FILE_ID_RE: /(?:\/file\/d\/|id=|\/d\/)([A-Za-z0-9_-]{20,})/,

    extractId(input) {
      if (!input) return '';
      const m = String(input).match(this.FILE_ID_RE);
      return m ? m[1] : (String(input).length > 20 ? String(input) : '');
    },

    directUrl(id) {
      return `https://drive.google.com/uc?export=download&id=${id}`;
    },

    /** A second direct form that some CDN edges prefer. */
    directUrlAlt(id) {
      return `https://drive.usercontent.google.com/download?id=${id}&export=download`;
    },

    previewUrl(id) {
      return `https://drive.google.com/file/d/${id}/preview`;
    },

    thumbUrl(id, width = 1280) {
      return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
    },

    async listFolder(apiKey, folderId) {
      if (!apiKey || !folderId) throw new Error('API key and folder ID are both required.');
      const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and mimeType contains 'video/'`);
      const fields = 'files(id,name,description,thumbnailLink,mimeType,size,createdTime,videoMediaMetadata)';
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}&fields=${fields}&pageSize=200&orderBy=createdTime desc`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Drive API error ${res.status}. ${body.slice(0, 180)}`);
      }
      const data = await res.json();
      return (data.files || []).map((f, i) => ({
        id: 'drive_' + f.id,
        driveId: f.id,
        source: 'drive',
        title: f.name.replace(/\.[^.]+$/, ''),
        description: f.description || 'Imported from Google Drive.',
        poster: this.thumbUrl(f.id, 1280),
        duration: f.videoMediaMetadata && f.videoMediaMetadata.durationMillis
          ? Math.round(parseInt(f.videoMediaMetadata.durationMillis, 10) / 1000)
          : 0,
        views: Math.floor(Math.random() * 90000) + 2000,
        likes: Math.floor(Math.random() * 8000) + 120,
        category: 'Drive imports',
        tags: ['google drive'],
        publishedAt: f.createdTime ? f.createdTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
        author: {
          name: 'My Drive',
          avatar: 'https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
          subscribers: 0,
          verified: false
        },
        chapters: [],
        comments: []
      }));
    }
  };

  /* ================================================================
     07. GLOBAL APPLICATION STATE
     ================================================================ */

  const State = {
    library: [],
    filtered: [],
    page: 1,
    view: Store.get('view', 'grid'),
    filter: 'all',
    sort: Store.get('sort', 'newest'),
    query: '',
    category: 'All',
    current: null,          // currently loaded video object
    queue: Store.get('queue', []),
    history: Store.get('history', []),        // [{id, time, at}]
    watchLater: Store.get('watchLater', []),
    favorites: Store.get('favorites', []),
    liked: Store.get('liked', []),
    disliked: Store.get('disliked', []),
    hidden: Store.get('hidden', []),
    positions: Store.get('positions', {}),    // id → seconds
    comments: Store.get('comments', {}),      // id → [{...}]
    settings: Object.assign({
      autoplay: true,
      ambient: false,
      hoverPreview: true,
      resume: true,
      loop: false,
      dataSaver: false,
      speed: 1,
      volume: 1,
      muted: false,
      theme: 'dark'
    }, Store.get('settings', {})),
    player: {
      isPlaying: false,
      isMini: false,
      isTheater: false,
      isFullscreen: false,
      isPip: false,
      isDragging: false,
      isScrubbing: false,
      abLoop: { a: null, b: null },
      chaptersVisible: true,
      statsVisible: false,
      lastVolume: 1,
      sourceKind: 'direct'      // 'direct' | 'embed'
    }
  };

  /* ================================================================
     08. VIDEO CARD RENDERING
     ================================================================ */

  function getPoster(video) {
    if (video.poster) return video.poster;
    if (video.driveId) return DriveSource.thumbUrl(video.driveId, 1280);
    return 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=900&q=70';
  }

  function getProgress(video) {
    const t = State.positions[video.id];
    if (!t || !video.duration) return 0;
    return clamp((t / video.duration) * 100, 0, 100);
  }

  function buildCard(video, index) {
    const progress = getProgress(video);
    const isLiked = State.liked.includes(video.id);
    const isSaved = State.watchLater.includes(video.id);
    const isPlaying = State.current && State.current.id === video.id;

    const card = el('article', {
      class: `video-card anim${isPlaying ? ' is-playing' : ''}`,
      'data-id': video.id,
      role: 'listitem',
      tabindex: '0',
      style: `--delay:${Math.min(index * 0.045, 0.5)}s`,
      'aria-label': video.title
    });

    const badges = [];
    if (video.driveId || video.source === 'drive') badges.push('<span class="badge badge--drive">DRIVE</span>');
    if (video.duration && video.duration < 300) badges.push('<span class="badge badge--new">QUICK</span>');
    if (video.duration && video.duration > 900) badges.push('<span class="badge badge--hd">HD</span>');

    card.innerHTML = `
      <div class="video-card__thumb">
        <img class="video-card__img" data-src="${escapeHtml(getPoster(video))}" alt="" loading="lazy" />
        <video class="video-card__preview" muted playsinline loop preload="none"></video>
        ${badges.length ? `<div class="video-card__badges">${badges.join('')}</div>` : ''}
        <span class="video-card__duration">${formatTime(video.duration)}</span>
        ${progress > 1 ? `<div class="video-card__progress"><span style="width:${progress}%"></span></div>` : ''}
        <button class="video-card__menu" aria-label="More options" data-menu>
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
        </button>
        <div class="video-card__overlay">
          <button class="video-card__play" aria-label="Play ${escapeHtml(video.title)}">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        <div class="video-card__quick">
          <button data-quick="like" class="${isLiked ? 'is-on' : ''}" aria-label="Like" title="Like">
            <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H7a2 2 0 01-2-2V12a2 2 0 01.6-1.44l5.2-5.2A2 2 0 0114 6.83V7"/></svg>
          </button>
          <button data-quick="watchlater" class="${isSaved ? 'is-on' : ''}" aria-label="Watch later" title="Watch later">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5l3 2"/></svg>
          </button>
          <button data-quick="queue" aria-label="Add to queue" title="Add to queue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
      <div class="video-card__body">
        <img class="video-card__avatar" src="${escapeHtml(video.author.avatar)}" alt="" loading="lazy" />
        <div class="video-card__info">
          <h3 class="video-card__title">${escapeHtml(video.title)}</h3>
          <div class="video-card__by">
            ${escapeHtml(video.author.name)}
            ${video.author.verified ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
          </div>
          <div class="video-card__view">
            ${formatViews(video.views)} views
            <span class="seperate"></span>
            ${relativeDate(video.publishedAt)}
          </div>
        </div>
      </div>`;

    return card;
  }

  /* ================================================================
     09. GRID RENDERING, FILTERING, SORTING, INFINITE SCROLL
     ================================================================ */

  const grid = $('#videoGrid');
  const sentinel = $('#gridSentinel');
  const loadMoreBtn = $('#loadMoreBtn');

  const thumbObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src) { img.src = src; img.removeAttribute('data-src'); }
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '300px 0px' });

  function applyFilters() {
    let list = State.library.slice();

    // Hidden
    list = list.filter(v => !State.hidden.includes(v.id));

    // Category
    if (State.category && State.category !== 'All') {
      list = list.filter(v => v.category === State.category);
    }

    // Quick filter chips
    switch (State.filter) {
      case 'new':
        list = list.filter(v => (Date.now() - new Date(v.publishedAt).getTime()) < 1000 * 60 * 60 * 24 * 120);
        break;
      case 'hd':
        list = list.filter(v => v.duration > 600);
        break;
      case 'drive':
        list = list.filter(v => v.driveId || v.source === 'drive');
        break;
      case 'short':
        list = list.filter(v => v.duration < 300);
        break;
      case 'long':
        list = list.filter(v => v.duration > 600);
        break;
      case 'liked':
        list = list.filter(v => State.liked.includes(v.id));
        break;
      case 'saved':
        list = list.filter(v => State.watchLater.includes(v.id) || State.favorites.includes(v.id));
        break;
      default: break;
    }

    // Search query
    if (State.query) {
      const q = State.query.toLowerCase();
      list = list.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.author.name.toLowerCase().includes(q) ||
        (v.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (v.category || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    const sorters = {
      newest:   (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
      oldest:   (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt),
      popular:  (a, b) => b.views - a.views,
      liked:    (a, b) => b.likes - a.likes,
      az:       (a, b) => a.title.localeCompare(b.title),
      za:       (a, b) => b.title.localeCompare(a.title),
      duration: (a, b) => b.duration - a.duration
    };
    list.sort(sorters[State.sort] || sorters.newest);

    State.filtered = list;
  }

  function renderGrid(reset = true) {
    if (reset) {
      grid.innerHTML = '';
      State.page = 1;
    }

    const end = State.page * CONFIG.pageSize;
    const slice = State.filtered.slice(0, end);

    if (!State.filtered.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          </div>
          <h3>No videos found</h3>
          <p>Try a different search term, clear the active filters, or import a folder from Google Drive in Settings.</p>
          <button class="btn btn--primary btn--sm" id="clearFiltersBtn">Clear all filters</button>
        </div>`;
      const btn = $('#clearFiltersBtn');
      if (btn) btn.addEventListener('click', () => {
        State.query = '';
        State.filter = 'all';
        State.category = 'All';
        $('#searchInput').value = '';
        $$('#filterChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.filter === 'all'));
        refresh();
      });
      loadMoreBtn.style.display = 'none';
      return;
    }

    const frag = document.createDocumentFragment();
    slice.forEach((video, i) => frag.appendChild(buildCard(video, i)));
    grid.appendChild(frag);

    // Lazy-load thumbnails
    $$('.video-card__img[data-src]', grid).forEach(img => thumbObserver.observe(img));

    // Show / hide the load-more button
    loadMoreBtn.style.display = slice.length < State.filtered.length ? 'inline-flex' : 'none';

    updateGridCountLabel();
  }

  function updateGridCountLabel() {
    const label = $('#videoCountLabel');
    const n = State.filtered.length;
    if (label) label.textContent = `${n} video${n === 1 ? '' : 's'}`;
  }

  const loadMore = () => {
    if (State.page * CONFIG.pageSize >= State.filtered.length) return;
    State.page++;
    renderGrid(false);
  };

  loadMoreBtn.addEventListener('click', loadMore);

  // Infinite scroll
  const scrollObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) loadMore(); });
  }, { rootMargin: '500px' });
  scrollObserver.observe(sentinel);

  function refresh() {
    applyFilters();
    renderGrid(true);
    renderContinueWatching();
  }

  /* ================================================================
     10. HOVER-PREVIEW ENGINE
     ================================================================ */

  let previewTimer = null;
  let previewCard = null;

  function startPreview(card, video) {
    if (!State.settings.hoverPreview) return;
    if (video.sourceKind === 'embed' || video.driveId) return; // iframes can't preview
    if (isTouchDevice()) return;

    const previewEl = card.querySelector('.video-card__preview');
    if (!previewEl) return;

    const src = video.src || (video.driveId ? DriveSource.directUrl(video.driveId) : '');
    if (!src) return;

    previewEl.src = src;
    previewEl.currentTime = Math.max(0, (video.duration || 60) * CONFIG.hoverPreviewStart);
    previewEl.play().then(() => {
      card.classList.add('is-previewing');
      previewCard = card;
    }).catch(() => { /* autoplay blocked — silently ignore */ });
  }

  function stopPreview() {
    clearTimeout(previewTimer);
    if (previewCard) {
      const v = previewCard.querySelector('.video-card__preview');
      if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
      previewCard.classList.remove('is-previewing');
      previewCard = null;
    }
  }

  grid.addEventListener('mouseover', e => {
    const card = e.target.closest('.video-card');
    if (!card || card === previewCard) return;
    stopPreview();
    const video = State.library.find(v => v.id === card.dataset.id);
    if (!video) return;
    previewTimer = setTimeout(() => startPreview(card, video), CONFIG.hoverPreviewDelay);
  });

  grid.addEventListener('mouseout', e => {
    const card = e.target.closest('.video-card');
    if (!card) return;
    if (!e.relatedTarget || !card.contains(e.relatedTarget)) stopPreview();
  });

  /* ================================================================
     11. CONTEXT MENU
     ================================================================ */

  const ctxMenu = $('#ctxMenu');
  let ctxTargetVideo = null;

  function openContextMenu(x, y, video) {
    ctxTargetVideo = video;
    ctxMenu.classList.add('is-open');

    // Keep it on screen
    const rect = ctxMenu.getBoundingClientRect();
    const px = Math.min(x, window.innerWidth - rect.width - 12);
    const py = Math.min(y, window.innerHeight - rect.height - 12);
    ctxMenu.style.left = Math.max(8, px) + 'px';
    ctxMenu.style.top = Math.max(8, py) + 'px';
  }

  function closeContextMenu() {
    ctxMenu.classList.remove('is-open');
    ctxTargetVideo = null;
  }

  document.addEventListener('click', e => {
    if (!ctxMenu.contains(e.target)) closeContextMenu();
  });
  document.addEventListener('scroll', closeContextMenu, true);

  ctxMenu.addEventListener('click', e => {
    const btn = e.target.closest('[data-ctx]');
    if (!btn || !ctxTargetVideo) return;
    const action = btn.dataset.ctx;
    const video = ctxTargetVideo;
    closeContextMenu();

    switch (action) {
      case 'play':        openPlayer(video); break;
      case 'queue':       Queue.add(video, false); Toast.success('Added to queue', video.title); break;
      case 'next':        Queue.addNext(video); Toast.success('Playing next', video.title); break;
      case 'watchlater':  toggleWatchLater(video); break;
      case 'favorite':    toggleFavorite(video); break;
      case 'mini':        openPlayer(video); setTimeout(enterMiniPlayer, 420); break;
      case 'share':       copyToClipboard(shareUrlFor(video)); break;
      case 'copyid':      copyToClipboard(video.driveId || 'Not a Drive video'); break;
      case 'snapshot':    takeSnapshot(); break;
      case 'hide':        hideVideo(video); break;
      default: break;
    }
  });

  function hideVideo(video) {
    if (!State.hidden.includes(video.id)) {
      State.hidden.push(video.id);
      Store.set('hidden', State.hidden);
      refresh();
      Toast.info('Hidden from feed', video.title);
    }
  }

  /* ================================================================
     12. PLAYER ENGINE
     ----------------------------------------------------------------
     One <video> element is created once and physically moved between
     the theater stage and the mini-player stage. Playback continues
     seamlessly because we preserve currentTime / volume / rate.
     ================================================================ */

  const playerStage   = $('#playerStage');
  const miniStage     = $('#miniStage');
  const playerShell   = $('#playerShell');
  const playerAmbient = $('#playerAmbient');
  const playerBigPlay = $('#playerBigPlay');
  const playerSpinner = $('#playerSpinner');
  const playerError   = $('#playerError');
  const playerErrorMsg= $('#playerErrorMsg');
  const playerControls= $('#playerControls');
  const playerFlash   = $('#playerFlash');
  const playerStats   = $('#playerStats');

  const tl          = $('#timeline');
  const tlBuffer    = $('#tlBuffer');
  const tlPlayed    = $('#tlPlayed');
  const tlHandle    = $('#tlHandle');
  const tlTooltip   = $('#tlTooltip');
  const tlPreview   = $('#tlPreview');
  const tlChapters  = $('#tlChapters');
  const tlMarkers   = $('#tlMarkers');
  const scrubVideo  = $('#scrubVideo');

  const ctlPlayIcon = $('#ctlPlayIcon');
  const ctlVolIcon  = $('#ctlVolIcon');
  const ctlFsIcon   = $('#ctlFsIcon');
  const volumeRange = $('#volumeRange');
  const timeCurrent = $('#timeCurrent');
  const timeDuration= $('#timeDuration');
  const speedLabel  = $('#speedLabel');

  const speedMenu   = $('#speedMenu');
  const qualityMenu = $('#qualityMenu');

  const miniPlayer  = $('#miniPlayer');
  const miniTitle   = $('#miniTitle');
  const miniProgress= $('#miniProgress');
  const miniTime    = $('#miniTime');
  const miniPlayIcon= $('#miniPlayIcon');

  const PAUSE_ICON = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
  const PLAY_ICON  = '<path d="M8 5v14l11-7z"/>';

  let video = document.createElement('video');
  video.id = 'vaultVideo';
  video.playsInline = true;
  video.preload = 'metadata';
  video.controls = false;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.crossOrigin = 'anonymous';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'contain';
  video.style.background = '#000';

  let controlsHideTimer = null;
  let flashTimer = null;
  let statsTimer = null;

  /* ---------- 12.1 Volume helpers ---------- */

  function applyVolume(v, persist = true) {
    v = clamp(v, 0, 1);
    video.volume = v;
    video.muted = v === 0;
    volumeRange.value = String(v);
    updateVolumeIcon();
    if (persist) {
      State.settings.volume = v;
      Store.set('settings', State.settings);
    }
  }

  function updateVolumeIcon() {
    const muted = video.muted || video.volume === 0;
    if (muted) {
      ctlVolIcon.innerHTML = '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    } else if (video.volume < 0.5) {
      ctlVolIcon.innerHTML = '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    } else {
      ctlVolIcon.innerHTML = '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 6a9 9 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    }
  }

  /* ---------- 12.2 Flash message on the player ---------- */

  function flash(text) {
    playerFlash.textContent = text;
    playerFlash.classList.add('is-visible');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => playerFlash.classList.remove('is-visible'), 900);
  }

  /* ---------- 12.3 Loading / error states ---------- */

  function showSpinner(show) {
    playerSpinner.classList.toggle('is-visible', !!show);
  }

  function showError(message) {
    playerErrorMsg.textContent = message || 'This video could not be loaded.';
    playerError.classList.add('is-visible');
    showSpinner(false);
  }

  function hideError() { playerError.classList.remove('is-visible'); }

  /* ---------- 12.4 Source resolution ---------- */

  function resolveSource(v) {
    if (v.src) return { kind: 'direct', url: v.src };
    if (v.driveId) return { kind: 'direct', url: DriveSource.directUrl(v.driveId) };
    return { kind: 'none', url: '' };
  }

  function loadSource(v, { autoplay = true, startAt = 0 } = {}) {
    hideError();
    showSpinner(true);

    const resolved = resolveSource(v);
    State.player.sourceKind = resolved.kind;

    // Clear any previously injected iframe
    const oldIframe = playerStage.querySelector('iframe');
    if (oldIframe) oldIframe.remove();

    if (resolved.kind === 'none') {
      showError('No playable source was provided for this video.');
      return;
    }

    // Make sure the <video> element is mounted in the theater stage
    if (video.parentElement !== playerStage) {
      playerStage.insertBefore(video, playerStage.firstChild);
    }

    // Reset
    video.pause();
    video.removeAttribute('src');
    video.innerHTML = '';
    video.load();

    // Caption tracks
    (v.captions || []).forEach(track => {
      const t = document.createElement('track');
      t.kind = 'subtitles';
      t.label = track.label;
      t.srclang = track.srclang;
      t.src = track.src;
      video.appendChild(t);
    });

    video.src = resolved.url;
    video.load();

    if (startAt > 0) {
      video.addEventListener('loadedmetadata', function once() {
        video.removeEventListener('loadedmetadata', once);
        try { video.currentTime = startAt; } catch (e) {}
      });
    }

    video.playbackRate = State.settings.speed || 1;
    speedLabel.textContent = formatSpeed(State.settings.speed || 1);
    applyVolume(State.settings.volume, false);

    if (autoplay) {
      const p = video.play();
      if (p && p.catch) {
        p.catch(() => {
          // Autoplay blocked — surface the big play button
          playerBigPlay.classList.remove('is-hidden');
          $('#bigPlayLabel').textContent = 'Click to play';
        });
      }
    }

    // Scrub preview uses the same source (muted, silent)
    if (resolved.kind === 'direct') {
      scrubVideo.src = resolved.url;
    }
  }

  /** Fallback: swap the <video> for a Drive iframe embed. */
  function loadEmbed(v) {
    if (!v.driveId) {
      showError('Embed fallback is only available for Google Drive videos.');
      return;
    }
    hideError();
    showSpinner(false);
    video.pause();

    const iframe = document.createElement('iframe');
    iframe.src = DriveSource.previewUrl(v.driveId) + '?autoplay=1';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = v.title;

    const existing = playerStage.querySelector('iframe');
    if (existing) existing.remove();
    playerStage.appendChild(iframe);

    State.player.sourceKind = 'embed';
    Toast.info('Using Drive embed', 'Custom controls are disabled in embed mode.');
  }

  /* ---------- 12.5 Play / pause ---------- */

  function togglePlay() {
    if (State.player.sourceKind === 'embed') {
      flash('Embed mode — use the Drive controls');
      return;
    }
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  function setPlayingUI(isPlaying) {
    State.player.isPlaying = isPlaying;
    ctlPlayIcon.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    miniPlayIcon.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    playerBigPlay.classList.toggle('is-hidden', isPlaying);
    if (isPlaying) scheduleControlsHide();
    updateMediaSession();
  }

  /* ---------- 12.6 Progress / timeline ---------- */

  function updateProgressUI() {
    const d = video.duration || 0;
    const c = video.currentTime || 0;
    const pct = d ? (c / d) * 100 : 0;

    tlPlayed.style.width = pct + '%';
    tlHandle.style.left = pct + '%';
    tl.setAttribute('aria-valuenow', String(Math.round(pct)));

    try {
      if (video.buffered.length) {
        const end = video.buffered.end(video.buffered.length - 1);
        tlBuffer.style.width = (d ? (end / d) * 100 : 0) + '%';
      }
    } catch (e) {}

    timeCurrent.textContent = formatTime(c);
    timeDuration.textContent = formatTime(d);

    miniProgress.style.width = pct + '%';
    miniTime.textContent = formatTime(c);

    // Chapter highlighting
    if (State.current && State.current.chapters && State.current.chapters.length) {
      const chapters = State.current.chapters;
      let activeIdx = 0;
      for (let i = 0; i < chapters.length; i++) {
        if (c >= chapters[i].time) activeIdx = i;
      }
      $$('.chapter-item', $('#chapterList')).forEach((node, i) => {
        node.classList.toggle('is-active', i === activeIdx);
      });
    }
  }

  function renderChapterMarkers() {
    tlChapters.innerHTML = '';
    if (!State.current || !State.current.chapters || !video.duration) return;
    State.current.chapters.forEach(ch => {
      const pct = (ch.time / video.duration) * 100;
      const mark = el('div', { class: 'tl__chapter', title: ch.title });
      mark.style.left = pct + '%';
      tlChapters.appendChild(mark);
    });
  }

  /* ---------- 12.7 Seeking ---------- */

  function seekTo(seconds) {
    if (State.player.sourceKind === 'embed') return;
    const d = video.duration || 0;
    video.currentTime = clamp(seconds, 0, d || 0);
  }

  function seekBy(delta) {
    seekTo((video.currentTime || 0) + delta);
  }

  function timelinePointerToTime(clientX) {
    const rect = tl.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * (video.duration || 0);
  }

  let scrubbing = false;

  tl.addEventListener('pointerdown', e => {
    if (State.player.sourceKind === 'embed') return;
    scrubbing = true;
    State.player.isScrubbing = true;
    tl.classList.add('is-scrubbing');
    tl.setPointerCapture(e.pointerId);
    const t = timelinePointerToTime(e.clientX);
    tlPlayed.style.width = ((t / (video.duration || 1)) * 100) + '%';
    tlHandle.style.left = ((t / (video.duration || 1)) * 100) + '%';
    tlTooltip.style.left = ((t / (video.duration || 1)) * 100) + '%';
    tlTooltip.textContent = formatTime(t);
  });

  tl.addEventListener('pointermove', e => {
    const rect = tl.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const t = ratio * (video.duration || 0);

    tlTooltip.textContent = formatTime(t);
    tlTooltip.style.left = (ratio * 100) + '%';

    if (scrubbing) {
      tlPlayed.style.width = (ratio * 100) + '%';
      tlHandle.style.left = (ratio * 100) + '%';
    }

    // Scrub preview frame
    if (!isTouchDevice() && scrubVideo.readyState >= 2 && video.duration) {
      tlPreview.classList.add('is-visible');
      tlPreview.style.left = clamp(ratio * 100, 8, 92) + '%';
      try { scrubVideo.currentTime = t; } catch (err) {}
    }
  });

  tl.addEventListener('pointerup', e => {
    if (!scrubbing) return;
    scrubbing = false;
    State.player.isScrubbing = false;
    tl.classList.remove('is-scrubbing');
    seekTo(timelinePointerToTime(e.clientX));
    try { tl.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  tl.addEventListener('pointerleave', () => {
    tlPreview.classList.remove('is-visible');
  });

  tl.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { seekBy(CONFIG.seekStep); e.preventDefault(); }
    if (e.key === 'ArrowLeft')  { seekBy(-CONFIG.seekStep); e.preventDefault(); }
    if (e.key === 'Home') { seekTo(0); e.preventDefault(); }
    if (e.key === 'End')  { seekTo(video.duration || 0); e.preventDefault(); }
  });

  /* ---------- 12.8 Speed ---------- */

  function formatSpeed(s) {
    return (s === 1 ? '1×' : String(s).replace(/0+$/, '').replace(/\.$/, '') + '×');
  }

  function setSpeed(speed) {
    video.playbackRate = speed;
    State.settings.speed = speed;
    Store.set('settings', State.settings);
    speedLabel.textContent = formatSpeed(speed);
    $$('#speedMenu .player-pop__item').forEach(b => {
      b.classList.toggle('is-active', parseFloat(b.dataset.speed) === speed);
    });
    flash('Speed ' + formatSpeed(speed));
  }

  speedMenu.addEventListener('click', e => {
    const btn = e.target.closest('[data-speed]');
    if (!btn) return;
    setSpeed(parseFloat(btn.dataset.speed));
    closeAllPlayerPops();
  });

  function stepSpeed(dir) {
    const idx = SPEED_PRESETS.indexOf(video.playbackRate);
    const next = SPEED_PRESETS[clamp((idx === -1 ? 3 : idx) + dir, 0, SPEED_PRESETS.length - 1)];
    setSpeed(next);
  }

  /* ---------- 12.9 Player popovers ---------- */

  function closeAllPlayerPops() {
    speedMenu.classList.remove('is-open');
    qualityMenu.classList.remove('is-open');
  }

  $('#ctlSpeed').addEventListener('click', e => {
    e.stopPropagation();
    const open = speedMenu.classList.contains('is-open');
    closeAllPlayerPops();
    if (!open) speedMenu.classList.add('is-open');
  });

  $('#ctlQuality').addEventListener('click', e => {
    e.stopPropagation();
    const open = qualityMenu.classList.contains('is-open');
    closeAllPlayerPops();
    if (!open) qualityMenu.classList.add('is-open');
  });

  qualityMenu.addEventListener('click', e => {
    const btn = e.target.closest('[data-quality]');
    if (!btn) return;
    $$('#qualityMenu .player-pop__item').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    flash('Quality: ' + btn.textContent.trim().split(' ')[0]);
    closeAllPlayerPops();
  });

  document.addEventListener('click', closeAllPlayerPops);

  /* ---------- 12.10 Controls auto-hide ---------- */

  function scheduleControlsHide() {
    clearTimeout(controlsHideTimer);
    if (!State.player.isPlaying) return;
    controlsHideTimer = setTimeout(() => {
      playerStage.classList.remove('is-active');
    }, 2800);
  }

  playerStage.addEventListener('mousemove', () => {
    playerStage.classList.add('is-active');
    scheduleControlsHide();
  });

  playerStage.addEventListener('mouseleave', () => {
    if (State.player.isPlaying) playerStage.classList.remove('is-active');
  });

  /* ---------- 12.11 Click / double click on video ---------- */

  let clickTimer = null;
  playerStage.addEventListener('click', e => {
    if (e.target.closest('.player-controls')) return;
    if (e.target.closest('.player-bigplay')) return;
    if (e.target.closest('.player-stats')) return;

    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => togglePlay(), 190);
  });

  playerStage.addEventListener('dblclick', e => {
    if (e.target.closest('.player-controls')) return;
    clearTimeout(clickTimer);
    toggleFullscreen();
  });

  // Double-tap to seek on touch devices
  let lastTap = 0;
  let lastTapX = 0;
  playerStage.addEventListener('touchend', e => {
    if (e.target.closest('.player-controls')) return;
    const now = Date.now();
    const x = e.changedTouches[0].clientX;
    if (now - lastTap < 300) {
      const rect = playerStage.getBoundingClientRect();
      const isLeft = x < rect.left + rect.width / 2;
      seekBy(isLeft ? -CONFIG.seekStepLarge : CONFIG.seekStepLarge);
      flash((isLeft ? '⏪ ' : '⏩ ') + CONFIG.seekStepLarge + 's');
      showGesture(isLeft ? 'left' : 'right', CONFIG.seekStepLarge);
    }
    lastTap = now;
    lastTapX = x;
  });

  function showGesture(side, seconds) {
    const node = side === 'left' ? $('#gestureLeft') : $('#gestureRight');
    const label = side === 'left' ? $('#gestureLeftText') : $('#gestureRightText');
    label.textContent = seconds + 's';
    node.classList.add('is-visible');
    setTimeout(() => node.classList.remove('is-visible'), 520);
  }

  /* ---------- 12.12 Fullscreen ---------- */

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function toggleFullscreen() {
    const target = playerStage;
    if (!isFullscreen()) {
      const req = target.requestFullscreen || target.webkitRequestFullscreen;
      if (req) req.call(target).catch(() => {});
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document).catch(() => {});
    }
  }

  document.addEventListener('fullscreenchange', () => {
    State.player.isFullscreen = isFullscreen();
    ctlFsIcon.innerHTML = State.player.isFullscreen
      ? '<path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3"/>'
      : '<path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/>';
    if (!State.player.isFullscreen) playerStage.classList.add('is-active');
  });

  /* ---------- 12.13 Picture-in-Picture ---------- */

  async function togglePip() {
    if (State.player.sourceKind === 'embed') {
      Toast.warn('Not available', 'Picture-in-Picture is unavailable in Drive embed mode.');
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        State.player.isPip = false;
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        State.player.isPip = true;
      } else {
        Toast.warn('Not supported', 'Your browser does not support Picture-in-Picture.');
      }
    } catch (e) {
      Toast.error('Picture-in-Picture failed', e.message || '');
    }
  }

  video.addEventListener('enterpictureinpicture', () => { State.player.isPip = true; });
  video.addEventListener('leavepictureinpicture', () => { State.player.isPip = false; });

  /* ---------- 12.14 A–B loop ---------- */

  function handleAbLoop() {
    const loop = State.player.abLoop;
    if (loop.a === null) {
      loop.a = video.currentTime;
      flash('A point set at ' + formatTime(loop.a));
    } else if (loop.b === null) {
      loop.b = video.currentTime;
      if (loop.b <= loop.a) { const t = loop.a; loop.a = loop.b; loop.b = t; }
      flash('A–B loop active');
      renderAbMarkers();
    } else {
      loop.a = null; loop.b = null;
      tlMarkers.innerHTML = '';
      flash('A–B loop cleared');
    }
  }

  function renderAbMarkers() {
    tlMarkers.innerHTML = '';
    const { a, b } = State.player.abLoop;
    const d = video.duration || 1;
    if (a !== null) {
      const m = el('div', { class: 'tl__marker' });
      m.style.left = (a / d) * 100 + '%';
      tlMarkers.appendChild(m);
    }
    if (b !== null) {
      const m = el('div', { class: 'tl__marker' });
      m.style.left = (b / d) * 100 + '%';
      tlMarkers.appendChild(m);
    }
  }

  /* ---------- 12.15 Snapshot ---------- */

  function takeSnapshot() {
    if (State.player.sourceKind === 'embed') {
      Toast.warn('Not available', 'Snapshots are unavailable in Drive embed mode.');
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) { Toast.error('Snapshot failed', 'The frame could not be captured.'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(State.current?.title || 'frame').slice(0, 48).replace(/[^\w\s-]/g, '')}-${Math.floor(video.currentTime)}s.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        Toast.success('Snapshot saved', 'Check your downloads folder.');
      }, 'image/png');
    } catch (e) {
      Toast.error('Snapshot blocked', 'The video source may not allow canvas capture.');
    }
  }

  /* ---------- 12.16 Stats for nerds ---------- */

  function toggleStats() {
    State.player.statsVisible = !State.player.statsVisible;
    playerStats.classList.toggle('is-visible', State.player.statsVisible);
    if (State.player.statsVisible) {
      updateStats();
      statsTimer = setInterval(updateStats, 800);
    } else {
      clearInterval(statsTimer);
    }
  }

  function updateStats() {
    try {
      $('#stRes').textContent = `${video.videoWidth || 0}×${video.videoHeight || 0}`;
      let buf = 0;
      if (video.buffered.length) buf = video.buffered.end(video.buffered.length - 1) - video.currentTime;
      $('#stBuf').textContent = buf.toFixed(1) + 's ahead';
      const q = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
      $('#stDrop').textContent = q ? q.droppedVideoFrames : 'n/a';
      $('#stRate').textContent = video.playbackRate + '×';
      $('#stVol').textContent = Math.round(video.volume * 100) + '%' + (video.muted ? ' (muted)' : '');
      $('#stSrc').textContent = State.player.sourceKind === 'embed' ? 'Drive embed' : (State.current?.driveId ? 'Drive direct' : 'Direct MP4');
      $('#stLat').textContent = State.current?.driveId ? '—' : (video.src.startsWith('blob:') ? 'blob' : 'network');
    } catch (e) {}
  }

  /* ---------- 12.17 Ambient mode ---------- */

  function setAmbient(on) {
    State.settings.ambient = on;
    Store.set('settings', State.settings);
    playerShell.classList.toggle('is-ambient-off', !on);
    $('#setAmbient').checked = on;
    if (on && State.current) {
      playerAmbient.style.backgroundImage = `url("${getPoster(State.current)}")`;
    }
  }

  /* ---------- 12.18 Captions ---------- */

  function toggleCaptions() {
    const tracks = video.textTracks;
    if (!tracks || !tracks.length) {
      flash('No subtitles available');
      return;
    }
    let anyShowing = false;
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].mode === 'showing') anyShowing = true;
    }
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = anyShowing ? 'hidden' : 'showing';
    }
    $('#ctlCaptions').classList.toggle('is-active', !anyShowing);
    flash(anyShowing ? 'Subtitles off' : 'Subtitles on');
  }

  /* ---------- 12.19 Video event wiring ---------- */

  video.addEventListener('loadedmetadata', () => {
    showSpinner(false);
    updateProgressUI();
    renderChapterMarkers();
    renderAbMarkers();
    timeDuration.textContent = formatTime(video.duration);
    updateMediaSession();
  });

  video.addEventListener('timeupdate', () => {
    if (!State.player.isScrubbing) updateProgressUI();
    checkAbLoop();
    savePositionThrottled();
  });

  video.addEventListener('progress', updateProgressUI);
  video.addEventListener('play', () => setPlayingUI(true));
  video.addEventListener('pause', () => setPlayingUI(false));
  video.addEventListener('waiting', () => showSpinner(true));
  video.addEventListener('playing', () => showSpinner(false));
  video.addEventListener('canplay', () => showSpinner(false));

  video.addEventListener('ended', () => {
    setPlayingUI(false);
    clearPosition(State.current?.id);
    if (State.settings.loop) {
      video.currentTime = 0;
      video.play().catch(() => {});
      return;
    }
    if (State.settings.autoplay) {
      const next = Queue.next();
      if (next) { openPlayer(next, { fromQueue: true }); return; }
    }
    playerBigPlay.classList.remove('is-hidden');
    $('#bigPlayLabel').textContent = 'Replay';
  });

  video.addEventListener('error', () => {
    showSpinner(false);
    const v = State.current;
    if (v && v.driveId && State.player.sourceKind !== 'embed') {
      showError('Google Drive refused the direct stream. This usually means the file is not shared publicly. Try the embed fallback below, or set the file to “Anyone with the link can view”.');
    } else {
      showError('The video failed to load. Check the URL, or try again.');
    }
  });

  function checkAbLoop() {
    const { a, b } = State.player.abLoop;
    if (a !== null && b !== null && video.currentTime >= b) {
      video.currentTime = a;
    }
  }

  const savePositionThrottled = throttle(() => {
    if (!State.current || !State.settings.resume) return;
    if (!video.duration) return;
    State.positions[State.current.id] = video.currentTime;
    Store.set('positions', State.positions);
    touchHistory(State.current, video.currentTime);
  }, 4000);

  function clearPosition(id) {
    if (!id) return;
    delete State.positions[id];
    Store.set('positions', State.positions);
  }

  function touchHistory(v, time) {
    const idx = State.history.findIndex(h => h.id === v.id);
    const entry = { id: v.id, time, at: Date.now() };
    if (idx >= 0) State.history.splice(idx, 1);
    State.history.unshift(entry);
    State.history = State.history.slice(0, 30);
    Store.set('history', State.history);
  }

  /* ---------- 12.20 Control button wiring ---------- */

  $('#ctlPlay').addEventListener('click', togglePlay);
  $('#bigPlayBtn').addEventListener('click', e => { e.stopPropagation(); togglePlay(); });
  playerBigPlay.addEventListener('click', togglePlay);

  $('#ctlPrev').addEventListener('click', () => {
    const prev = Queue.previous();
    if (prev) openPlayer(prev, { fromQueue: true });
    else { seekTo(0); flash('Start of video'); }
  });

  $('#ctlNext').addEventListener('click', () => {
    const next = Queue.next();
    if (next) openPlayer(next, { fromQueue: true });
    else flash('Queue is empty');
  });

  $('#ctlMute').addEventListener('click', () => {
    if (video.muted || video.volume === 0) {
      applyVolume(State.player.lastVolume || 0.8);
      flash('Unmuted');
    } else {
      State.player.lastVolume = video.volume;
      applyVolume(0);
      flash('Muted');
    }
  });

  volumeRange.addEventListener('input', e => {
    applyVolume(parseFloat(e.target.value));
    if (parseFloat(e.target.value) > 0) State.player.lastVolume = parseFloat(e.target.value);
  });

  $('#ctlChapters').addEventListener('click', () => {
    switchTab('chapters');
    const el2 = document.querySelector('[data-panel="chapters"]');
    if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  $('#ctlCaptions').addEventListener('click', toggleCaptions);

  $('#ctlLoop').addEventListener('click', () => {
    video.loop = !video.loop;
    $('#ctlLoop').classList.toggle('is-active', video.loop);
    flash(video.loop ? 'Loop on' : 'Loop off');
  });

  $('#ctlAbLoop').addEventListener('click', handleAbLoop);
  $('#ctlStats').addEventListener('click', toggleStats);
  $('#ctlSnapshot').addEventListener('click', takeSnapshot);
  $('#ctlPip').addEventListener('click', togglePip);
  $('#ctlFullscreen').addEventListener('click', toggleFullscreen);
  $('#ctlMini').addEventListener('click', enterMiniPlayer);
  $('#ctlAmbient').addEventListener('click', () => setAmbient(!State.settings.ambient));

  $('#ctlTheater').addEventListener('click', () => {
    const layout = $('.theater__layout');
    State.player.isTheater = !State.player.isTheater;
    layout.style.gridTemplateColumns = State.player.isTheater ? 'minmax(0,1fr)' : '';
    $('#ctlTheater').classList.toggle('is-active', State.player.isTheater);
    Toast.info(State.player.isTheater ? 'Theater mode on' : 'Theater mode off');
  });

  $('#ctlCast').addEventListener('click', async () => {
    if (video.remote && video.remote.state !== 'disconnected') {
      try { await video.remote.prompt(); } catch (e) {}
    } else if (video.remote) {
      try { await video.remote.prompt(); } catch (e) {
        Toast.warn('No cast devices', 'No remote playback device was found.');
      }
    } else {
      Toast.warn('Casting unavailable', 'Your browser does not expose the Remote Playback API.');
    }
  });

  $('#errorRetry').addEventListener('click', () => {
    if (State.current) loadSource(State.current, {
      autoplay: true,
      startAt: State.positions[State.current.id] || 0
    });
  });

  $('#errorEmbed').addEventListener('click', () => {
    if (State.current) loadEmbed(State.current);
  });

  /* ---------- 12.21 Open / close player ---------- */

  const theater = $('#theater');

  function openPlayer(v, opts = {}) {
    if (!v) return;
    State.current = v;

    theater.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Meta
    $('#theaterTitleMini').textContent = v.title;
    $('#vpTitle').textContent = v.title;
    $('#vpAvatar').src = v.author.avatar;
    $('#vpAuthor').textContent = v.author.name;
    $('#vpSubs').textContent = v.author.subscribers
      ? formatNumber(v.author.subscribers) + ' subscribers'
      : 'Imported from Google Drive';
    $('#likeCount').textContent = formatNumber(v.likes);
    $('#vsViews').textContent = formatNumber(v.views) + ' views';
    $('#vsDate').textContent = relativeDate(v.publishedAt);
    $('#vsTags').textContent = (v.tags || []).map(t => '#' + t).join('  ');
    $('#vpDescription').textContent = v.description || 'No description provided.';
    $('#vpTags').textContent = (v.tags || []).map(t => '#' + t).join(' · ');

    $('#btnLike').classList.toggle('is-on', State.liked.includes(v.id));
    $('#btnDislike').classList.toggle('is-on', State.disliked.includes(v.id));
    $('#btnSave').classList.toggle('is-on', State.watchLater.includes(v.id));

    // Reset A–B
    State.player.abLoop = { a: null, b: null };
    tlMarkers.innerHTML = '';

    // Chapters
    renderChapters(v);
    renderComments(v);
    renderRelated(v);
    renderQueue();

    // Source
    const resumeAt = (State.settings.resume && !opts.fromStart) ? (State.positions[v.id] || 0) : 0;
    loadSource(v, { autoplay: true, startAt: resumeAt });

    // Ambient
    setAmbient(State.settings.ambient);
    if (State.settings.ambient) {
      playerAmbient.style.backgroundImage = `url("${getPoster(v)}")`;
    }

    // Fullscreen / mini state
    exitMiniPlayer({ silent: true });
    playerBigPlay.classList.remove('is-hidden');

    // Media session
    updateMediaSession();

    // Mark card as playing
    $$('.video-card').forEach(c => c.classList.toggle('is-playing', c.dataset.id === v.id));

    // Scroll theater to top
    theater.scrollTop = 0;

    // History
    touchHistory(v, resumeAt);

    if (!opts.silent) {
      // Push a history entry so the back button closes the player
      if (!history.state || history.state.player !== v.id) {
        history.pushState({ player: v.id }, '', '#watch=' + v.id);
      }
    }
  }

  function closePlayer() {
    theater.classList.remove('is-open');
    document.body.style.overflow = '';
    stopPreview();
    savePositionThrottled();
    if (State.player.sourceKind !== 'embed') {
      video.pause();
    } else {
      const iframe = playerStage.querySelector('iframe');
      if (iframe) iframe.remove();
    }
    $$('.video-card').forEach(c => c.classList.remove('is-playing'));
  }

  $('#theaterClose').addEventListener('click', closePlayer);
  $('#theaterBack').addEventListener('click', () => history.back());
  $('#theaterMini').addEventListener('click', enterMiniPlayer);

  theater.addEventListener('click', e => {
    // Click on the dark backdrop (not inside the inner content) closes
    if (e.target === theater) closePlayer();
  });

  window.addEventListener('popstate', () => {
    if (theater.classList.contains('is-open')) closePlayer();
  });

  /* ---------- 12.22 Chapters / comments / related ---------- */

  function renderChapters(v) {
    const list = $('#chapterList');
    const count = $('#chapterCount');
    list.innerHTML = '';
    const chapters = v.chapters || [];
    count.textContent = String(chapters.length);

    if (!chapters.length) {
      list.innerHTML = '<p class="video-p-subtitle">This video has no chapters.</p>';
      return;
    }

    chapters.forEach((ch, i) => {
      const item = el('button', { class: 'chapter-item', 'data-time': ch.time });
      item.innerHTML = `
        <span class="chapter-item__time">${formatTime(ch.time)}</span>
        <img class="chapter-item__thumb" src="${escapeHtml(getPoster(v))}" alt="" loading="lazy" />
        <span class="chapter-item__title">${escapeHtml(ch.title)}</span>`;
      item.addEventListener('click', () => {
        seekTo(ch.time);
        video.play().catch(() => {});
        flash('Jumped to ' + ch.title);
      });
      list.appendChild(item);
    });
  }

  function renderComments(v) {
    const list = $('#commentList');
    const count = $('#commentCount');
    const stored = State.comments[v.id] || [];
    const all = stored.concat(v.comments || []);
    count.textContent = String(all.length);

    list.innerHTML = '';
    all.forEach(c => {
      const node = el('div', { class: 'comment' });
      node.innerHTML = `
        <img class="author-img" style="width:40px;height:40px" src="${escapeHtml(c.avatar)}" alt="" loading="lazy" />
        <div class="comment__body">
          <div class="comment__head">
            <span class="comment__name">${escapeHtml(c.author)}</span>
            <span class="comment__time">${escapeHtml(c.time)}</span>
          </div>
          <div class="comment__text">${escapeHtml(c.text)}</div>
          <div class="comment__actions">
            <button><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H7a2 2 0 01-2-2V12a2 2 0 01.6-1.44l5.2-5.2A2 2 0 0114 6.83V7"/></svg> ${c.likes || 0}</button>
            <button>Reply</button>
          </div>
        </div>`;
      list.appendChild(node);
    });
  }

  function renderRelated(v) {
    const list = $('#relatedList');
    list.innerHTML = '';
    const pool = State.library.filter(x => x.id !== v.id);
    // Prefer same category, then fill with the rest
    const sameCat = pool.filter(x => x.category === v.category);
    const rest = pool.filter(x => x.category !== v.category);
    const related = sameCat.concat(rest).slice(0, 8);

    related.forEach(r => {
      const node = el('div', { class: 'rel-item' });
      node.innerHTML = `
        <div class="rel-item__thumb">
          <img src="${escapeHtml(getPoster(r))}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover" />
          <span class="rel-item__dur">${formatTime(r.duration)}</span>
        </div>
        <div class="rel-item__info">
          <div class="rel-item__title">${escapeHtml(r.title)}</div>
          <div class="rel-item__meta">${escapeHtml(r.author.name)} · ${formatViews(r.views)} views</div>
        </div>`;
      node.addEventListener('click', () => openPlayer(r));
      list.appendChild(node);
    });
  }

  $('#commentSubmit').addEventListener('click', () => {
    const input = $('#commentInput');
    const text = input.value.trim();
    if (!text || !State.current) return;
    const list = State.comments[State.current.id] || [];
    list.unshift({
      author: 'You',
      avatar: 'https://images.unsplash.com/photo-1587918842454-870dbd18261a?auto=format&fit=crop&w=100&q=80',
      text,
      time: 'just now',
      likes: 0
    });
    State.comments[State.current.id] = list;
    Store.set('comments', State.comments);
    input.value = '';
    renderComments(State.current);
    Toast.success('Comment posted');
  });

  /* ---------- 12.23 Tabs ---------- */

  function switchTab(name) {
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab === name));
    $$('.tab-panel').forEach(p => p.classList.toggle('is-active', p.dataset.panel === name));
  }

  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  /* ================================================================
     13. MINI PLAYER ENGINE
     ================================================================ */

  let miniPos = Store.get('miniPos', null);
  let miniSize = Store.get('miniSize', null);
  let dragging = false;
  let dragOffset = { x: 0, y: 0 };
  let resizing = false;
  let resizeStart = { x: 0, y: 0, w: 0, h: 0 };

  function enterMiniPlayer() {
    if (State.player.sourceKind === 'embed') {
      Toast.warn('Mini player unavailable', 'Drive embed mode cannot be shrunk into the mini player.');
      return;
    }
    if (!State.current) return;

    State.player.isMini = true;
    miniPlayer.classList.add('is-open');
    miniTitle.textContent = State.current.title;

    // Preserve playback while physically moving the element
    const wasPlaying = !video.paused;
    const t = video.currentTime;
    const rate = video.playbackRate;
    const vol = video.volume;
    const muted = video.muted;

    miniStage.appendChild(video);

    video.currentTime = t;
    video.playbackRate = rate;
    video.volume = vol;
    video.muted = muted;
    if (wasPlaying) video.play().catch(() => {});

    applyMiniPosition();
    applyMiniSize();

    // Close the theater so the mini player is visible
    theater.classList.remove('is-open');
    document.body.style.overflow = '';

    Toast.info('Mini player active', 'Drag the header to move, resize from the corner.');
  }

  function exitMiniPlayer({ silent = false } = {}) {
    if (!State.player.isMini) return;

    const wasPlaying = !video.paused;
    const t = video.currentTime;
    const rate = video.playbackRate;
    const vol = video.volume;
    const muted = video.muted;

    playerStage.insertBefore(video, playerStage.firstChild);

    video.currentTime = t;
    video.playbackRate = rate;
    video.volume = vol;
    video.muted = muted;
    if (wasPlaying) video.play().catch(() => {});

    miniPlayer.classList.remove('is-open');
    State.player.isMini = false;
    if (!silent) { /* nothing else */ }
  }

  $('#miniClose').addEventListener('click', () => {
    video.pause();
    miniPlayer.classList.remove('is-open');
    State.player.isMini = false;
    State.current = null;
  });

  $('#miniExpand').addEventListener('click', () => {
    exitMiniPlayer();
    if (State.current) openPlayer(State.current, { silent: true });
  });

  $('#miniPlayBtn').addEventListener('click', togglePlay);
  $('#miniStage').addEventListener('click', e => {
    if (e.target.closest('.mini-player__overlay')) return;
    togglePlay();
  });

  $('#miniPrev').addEventListener('click', () => {
    const p = Queue.previous();
    if (p) openPlayer(p, { fromQueue: true, silent: true });
  });
  $('#miniNext').addEventListener('click', () => {
    const n = Queue.next();
    if (n) openPlayer(n, { fromQueue: true, silent: true });
  });
  $('#miniRew').addEventListener('click', () => seekBy(-CONFIG.seekStepLarge));
  $('#miniFwd').addEventListener('click', () => seekBy(CONFIG.seekStepLarge));
  $('#miniMute').addEventListener('click', () => {
    video.muted = !video.muted;
    updateVolumeIcon();
  });

  $('#miniTimeline').addEventListener('click', e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    seekTo(ratio * (video.duration || 0));
  });

  /* ---------- 13.1 Drag ---------- */

  const dragHandle = $('#miniDragHandle');

  dragHandle.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    miniPlayer.classList.add('is-dragging');
    const rect = miniPlayer.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    // Switch to left/top positioning while dragging
    miniPlayer.style.left = rect.left + 'px';
    miniPlayer.style.top = rect.top + 'px';
    miniPlayer.style.right = 'auto';
    miniPlayer.style.bottom = 'auto';

    dragHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  dragHandle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const w = miniPlayer.offsetWidth;
    const h = miniPlayer.offsetHeight;
    const x = clamp(e.clientX - dragOffset.x, 8, window.innerWidth - w - 8);
    const y = clamp(e.clientY - dragOffset.y, 8, window.innerHeight - h - 8);
    miniPlayer.style.left = x + 'px';
    miniPlayer.style.top = y + 'px';
  });

  dragHandle.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    miniPlayer.classList.remove('is-dragging');
    snapMiniToNearestCorner();
    try { dragHandle.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  function snapMiniToNearestCorner() {
    const rect = miniPlayer.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;
    const rightSide = midX > window.innerWidth / 2;
    const bottomSide = midY > window.innerHeight / 2;

    miniPlayer.classList.add('is-snapping');
    miniPlayer.style.left = rightSide ? 'auto' : CONFIG.miniSnapMargin + 'px';
    miniPlayer.style.right = rightSide ? CONFIG.miniSnapMargin + 'px' : 'auto';
    miniPlayer.style.top = bottomSide ? 'auto' : CONFIG.miniSnapMargin + 'px';
    miniPlayer.style.bottom = bottomSide ? CONFIG.miniSnapMargin + 'px' : 'auto';

    Store.set('miniPos', { rightSide, bottomSide });
    setTimeout(() => miniPlayer.classList.remove('is-snapping'), 340);
  }

  function applyMiniPosition() {
    if (!miniPos) return;
    miniPlayer.style.left = miniPos.rightSide ? 'auto' : CONFIG.miniSnapMargin + 'px';
    miniPlayer.style.right = miniPos.rightSide ? CONFIG.miniSnapMargin + 'px' : 'auto';
    miniPlayer.style.top = miniPos.bottomSide ? 'auto' : CONFIG.miniSnapMargin + 'px';
    miniPlayer.style.bottom = miniPos.bottomSide ? CONFIG.miniSnapMargin + 'px' : 'auto';
  }

  /* ---------- 13.2 Resize ---------- */

  const resizeHandle = $('#miniResize');

  resizeHandle.addEventListener('pointerdown', e => {
    resizing = true;
    resizeStart = {
      x: e.clientX,
      y: e.clientY,
      w: miniPlayer.offsetWidth,
      h: miniPlayer.offsetHeight
    };
    resizeHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  resizeHandle.addEventListener('pointermove', e => {
    if (!resizing) return;
    const w = clamp(resizeStart.w + (e.clientX - resizeStart.x), 260, window.innerWidth - 40);
    const h = clamp(resizeStart.h + (e.clientY - resizeStart.y), 160, window.innerHeight - 40);
    miniPlayer.style.width = w + 'px';
    miniPlayer.style.height = 'auto';
    miniSize = { w, h };
  });

  resizeHandle.addEventListener('pointerup', e => {
    if (!resizing) return;
    resizing = false;
    if (miniSize) Store.set('miniSize', miniSize);
    try { resizeHandle.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  function applyMiniSize() {
    if (!miniSize) return;
    miniPlayer.style.width = miniSize.w + 'px';
  }

  /* ---------- 13.3 Document Picture-in-Picture ---------- */

  async function enterDocumentPip() {
    if (!('documentPictureInPicture' in window)) {
      Toast.warn('Not supported', 'Document Picture-in-Picture requires Chrome 116+.');
      return;
    }
    if (!State.current) return;
    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 480,
        height: 300
      });

      // Copy styles so the video looks right
      [...document.styleSheets].forEach(sheet => {
        try {
          const css = [...sheet.cssRules].map(r => r.cssText).join('');
          const style = pipWin.document.createElement('style');
          style.textContent = css;
          pipWin.document.head.appendChild(style);
        } catch (e) {}
      });

      const wrapper = pipWin.document.createElement('div');
      wrapper.style.cssText = 'width:100vw;height:100vh;background:#000;display:grid;place-items:center;';
      wrapper.appendChild(video);
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
      pipWin.document.body.style.margin = '0';
      pipWin.document.body.appendChild(wrapper);

      pipWin.addEventListener('pagehide', () => {
        playerStage.insertBefore(video, playerStage.firstChild);
        video.style.width = '100%';
        video.style.height = '100%';
      });

      Toast.success('Floating player opened');
    } catch (e) {
      Toast.error('Floating player failed', e.message || '');
    }
  }

  /* ================================================================
     14. QUEUE / UP-NEXT
     ================================================================ */

  const Queue = {
    add(video, silent = false) {
      if (State.queue.some(q => q.id === video.id)) {
        if (!silent) Toast.info('Already in queue', video.title);
        return;
      }
      State.queue.push(video.id);
      State.queue = State.queue.slice(-CONFIG.maxQueue);
      Store.set('queue', State.queue);
      renderQueue();
      if (!silent) Toast.success('Added to queue', video.title);
    },

    addNext(video) {
      const filtered = State.queue.filter(id => id !== video.id);
      filtered.unshift(video.id);
      State.queue = filtered.slice(0, CONFIG.maxQueue);
      Store.set('queue', State.queue);
      renderQueue();
    },

    remove(id) {
      State.queue = State.queue.filter(q => q !== id);
      Store.set('queue', State.queue);
      renderQueue();
    },

    clear() {
      State.queue = [];
      Store.set('queue', State.queue);
      renderQueue();
      Toast.info('Queue cleared');
    },

    next() {
      if (!State.queue.length) return null;
      let idx = State.queue.indexOf(State.current?.id ?? '');
      // If the current video isn't in the queue, play the head
      if (idx === -1) idx = -1;
      const nextId = State.queue[idx + 1];
      if (nextId) {
        const v = State.library.find(x => x.id === nextId);
        if (v) return v;
      }
      return null;
    },

    previous() {
      if (!State.queue.length) return null;
      const idx = State.queue.indexOf(State.current?.id ?? '');
      if (idx > 0) {
        const v = State.library.find(x => x.id === State.queue[idx - 1]);
        if (v) return v;
      }
      return null;
    },

    reorder(fromIdx, toIdx) {
      const arr = State.queue.slice();
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      State.queue = arr;
      Store.set('queue', State.queue);
      renderQueue();
    }
  };

  function renderQueue() {
    const list = $('#queueList');
    $('#queueCount').textContent = String(State.queue.length);
    $('#nowPlayingBar').style.display = State.current ? 'flex' : 'none';

    if (!State.queue.length) {
      list.innerHTML = `<div style="padding:24px 16px;text-align:center;font-size:13px;color:var(--body-color)">
        Your queue is empty.<br>Add videos with the <b style="color:var(--white)">+</b> button on any card.
      </div>`;
      return;
    }

    list.innerHTML = '';
    State.queue.forEach((id, index) => {
      const v = State.library.find(x => x.id === id);
      if (!v) return;

      const item = el('div', {
        class: 'queue-item' + (State.current && State.current.id === id ? ' is-current' : ''),
        draggable: 'true',
        'data-index': index,
        'data-id': id
      });

      item.innerHTML = `
        <span class="queue-item__grip">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:12px;height:12px"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
        </span>
        <span class="queue-item__num">${index + 1}</span>
        <img class="queue-item__thumb" src="${escapeHtml(getPoster(v))}" alt="" loading="lazy" />
        <div class="queue-item__info">
          <div class="queue-item__title">${escapeHtml(v.title)}</div>
          <div class="queue-item__by">${escapeHtml(v.author.name)} · ${formatTime(v.duration)}</div>
        </div>
        <button class="queue-item__remove" data-remove="${id}" aria-label="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>`;

      item.addEventListener('click', e => {
        if (e.target.closest('[data-remove]')) return;
        openPlayer(v, { fromQueue: true, silent: true });
      });

      // Drag & drop reordering
      item.addEventListener('dragstart', e => {
        item.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      });
      item.addEventListener('dragend', () => item.classList.remove('is-dragging'));
      item.addEventListener('dragover', e => {
        e.preventDefault();
        item.classList.add('is-over');
      });
      item.addEventListener('dragleave', () => item.classList.remove('is-over'));
      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('is-over');
        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const to = index;
        if (!isNaN(from) && from !== to) Queue.reorder(from, to);
      });

      list.appendChild(item);
    });

    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        Queue.remove(btn.dataset.remove);
      });
    });
  }

  $('#queueClear').addEventListener('click', () => Queue.clear());

  /* ================================================================
     15. KEYBOARD SHORTCUTS
     ================================================================ */

  function isTypingContext(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  document.addEventListener('keydown', e => {
    if (isTypingContext(e.target)) {
      if (e.key === 'Escape' && e.target.id === 'searchInput') e.target.blur();
      return;
    }

    const inPlayer = theater.classList.contains('is-open') || State.player.isMini;

    // Global shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      $('#searchInput').focus();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      toggleTheme();
      return;
    }
    if (e.key === '?') { e.preventDefault(); openModal('#shortcutsModal'); return; }
    if (e.key.toLowerCase() === 'b' && !inPlayer) { e.preventDefault(); toggleSidebar(); return; }

    // Player shortcuts
    if (!inPlayer) return;

    const k = e.key;
    const lower = k.toLowerCase();

    switch (lower) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'j':
        e.preventDefault();
        seekBy(-CONFIG.seekStepLarge);
        flash('⏪ 10s');
        break;
      case 'l':
        if (e.shiftKey) { stepSpeed(1); }
        else { e.preventDefault(); seekBy(CONFIG.seekStepLarge); flash('⏩ 10s'); }
        break;
      case 'arrowleft':
        e.preventDefault();
        seekBy(-CONFIG.seekStep);
        showGesture('left', CONFIG.seekStep);
        break;
      case 'arrowright':
        e.preventDefault();
        seekBy(CONFIG.seekStep);
        showGesture('right', CONFIG.seekStep);
        break;
      case 'arrowup':
        e.preventDefault();
        applyVolume(clamp(video.volume + 0.05, 0, 1));
        flash('Volume ' + Math.round(video.volume * 100) + '%');
        break;
      case 'arrowdown':
        e.preventDefault();
        applyVolume(clamp(video.volume - 0.05, 0, 1));
        flash('Volume ' + Math.round(video.volume * 100) + '%');
        break;
      case 'm':
        e.preventDefault();
        $('#ctlMute').click();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 't':
        e.preventDefault();
        $('#ctlTheater').click();
        break;
      case 'i':
        e.preventDefault();
        if (State.player.isMini) {
          exitMiniPlayer();
          openPlayer(State.current, { silent: true });
        } else {
          enterMiniPlayer();
        }
        break;
      case 'p':
        if (e.shiftKey) {
          e.preventDefault();
          const prev = Queue.previous();
          if (prev) openPlayer(prev, { fromQueue: true });
        } else {
          e.preventDefault();
          togglePip();
        }
        break;
      case 'n':
        e.preventDefault();
        if (e.shiftKey) {
          const prev = Queue.previous();
          if (prev) openPlayer(prev, { fromQueue: true });
        } else {
          const next = Queue.next();
          if (next) openPlayer(next, { fromQueue: true });
        }
        break;
      case 'c':
        e.preventDefault();
        toggleCaptions();
        break;
      case 'a':
        e.preventDefault();
        handleAbLoop();
        break;
      case 'q':
        e.preventDefault();
        if (State.current) Queue.add(State.current);
        break;
      case 'escape':
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen();
        else if (miniPlayer.classList.contains('is-open')) {
          exitMiniPlayer();
        } else if (theater.classList.contains('is-open')) {
          closePlayer();
        }
        break;
      default:
        // 0–9 seek to percentage
        if (/^[0-9]$/.test(k) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const pct = parseInt(k, 10) / 10;
          seekTo((video.duration || 0) * pct);
          flash('Jumped to ' + Math.round(pct * 100) + '%');
        }
        // Shift + / - for speed
        if (k === '+' || k === '=') { e.preventDefault(); stepSpeed(1); }
        if (k === '-' || k === '_') { e.preventDefault(); stepSpeed(-1); }
        break;
    }
  });

  function buildShortcutGrid() {
    const grid = $('#shortcutGrid');
    grid.innerHTML = '';
    SHORTCUTS.forEach(s => {
      const row = el('div', { class: 'shortcut-row' });
      const keys = s.keys.map(k => `<span class="kbd">${escapeHtml(k)}</span>`).join('');
      row.innerHTML = `<span>${escapeHtml(s.label)}</span><span class="shortcut-keys">${keys}</span>`;
      grid.appendChild(row);
    });
  }

  /* ================================================================
     16. MODALS
     ================================================================ */

  function openModal(sel) {
    const m = $(sel);
    if (!m) return;
    m.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(sel) {
    const m = $(sel);
    if (!m) return;
    m.classList.remove('is-open');
    if (!$('.modal-backdrop.is-open')) document.body.style.overflow = '';
  }

  $$('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeModal('#' + backdrop.id);
    });
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-close-modal]')) {
      const m = e.target.closest('.modal-backdrop');
      if (m) closeModal('#' + m.id);
    }
  });

  $('#shortcutsBtn').addEventListener('click', () => openModal('#shortcutsModal'));
  $('#settingsBtn').addEventListener('click', () => openModal('#settingsModal'));

  document.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'open-settings') openModal('#settingsModal');
    if (action === 'open-shortcuts') openModal('#shortcutsModal');
    if (action === 'open-watchlater') {
      State.filter = 'saved';
      $$('#filterChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.filter === 'saved'));
      refresh();
    }
    if (action === 'signout') Toast.info('Signed out', 'This is a demo — nothing actually happened.');
  });

  /* ---------- 16.1 Settings wiring ---------- */

  function syncSettingsUI() {
    $('#setAutoplay').checked = State.settings.autoplay;
    $('#setAmbient').checked = State.settings.ambient;
    $('#setHoverPreview').checked = State.settings.hoverPreview;
    $('#setResume').checked = State.settings.resume;
    $('#setLoop').checked = State.settings.loop;
    $('#setDataSaver').checked = State.settings.dataSaver;
    $('#setSpeed').value = String(State.settings.speed);
    $('#setDriveKey').value = CONFIG.drive.apiKey || '';
    $('#setDriveFolder').value = CONFIG.drive.folderId || '';
  }

  function bindSetting(id, key, onChange) {
    const node = $(id);
    if (!node) return;
    node.addEventListener('change', () => {
      const value = node.type === 'checkbox' ? node.checked : node.value;
      State.settings[key] = value;
      Store.set('settings', State.settings);
      if (onChange) onChange(value);
    });
  }

  bindSetting('#setAutoplay', 'autoplay');
  bindSetting('#setAmbient', 'ambient', v => setAmbient(v));
  bindSetting('#setHoverPreview', 'hoverPreview');
  bindSetting('#setResume', 'resume');
  bindSetting('#setLoop', 'loop', v => { video.loop = v; });
  bindSetting('#setDataSaver', 'dataSaver');
  bindSetting('#setSpeed', 'speed', v => setSpeed(parseFloat(v)));

  $('#setDriveKey').addEventListener('change', e => {
    CONFIG.drive.apiKey = e.target.value.trim();
    Store.set('driveApiKey', CONFIG.drive.apiKey);
  });

  $('#setDriveFolder').addEventListener('change', e => {
    CONFIG.drive.folderId = DriveSource.extractId(e.target.value.trim());
    Store.set('driveFolder', CONFIG.drive.folderId);
  });

  $('#driveImportBtn').addEventListener('click', async () => {
    const key = $('#setDriveKey').value.trim();
    const folder = DriveSource.extractId($('#setDriveFolder').value.trim());
    if (!key || !folder) {
      Toast.warn('Missing details', 'Enter both an API key and a folder ID.');
      return;
    }
    Toast.info('Importing…', 'Contacting the Google Drive API.');
    try {
      const items = await DriveSource.listFolder(key, folder);
      if (!items.length) {
        Toast.warn('Nothing found', 'That folder contains no video files.');
        return;
      }
      const existing = new Set(State.library.map(v => v.driveId).filter(Boolean));
      const fresh = items.filter(i => !existing.has(i.driveId));
      State.library = fresh.concat(State.library);
      Store.set('driveLibrary', fresh);
      refresh();
      Toast.success(`Imported ${fresh.length} video${fresh.length === 1 ? '' : 's'}`, 'They now appear at the top of your library.');
    } catch (err) {
      Toast.error('Import failed', err.message || 'Unknown error');
    }
  });

  $('#driveResetBtn').addEventListener('click', () => {
    Store.remove('driveLibrary');
    State.library = LIBRARY.slice();
    refresh();
    Toast.info('Library reset', 'Back to the bundled demo videos.');
  });

  /* ---------- 16.2 Share ---------- */

  function shareUrlFor(v) {
    const base = location.origin + location.pathname;
    return `${base}#watch=${v.id}`;
  }

  function openShareModal(v) {
    $('#shareUrl').value = shareUrlFor(v);
    $('#shareTimestamp').checked = false;
    openModal('#shareModal');
  }

  $('#btnShare2').addEventListener('click', () => State.current && openShareModal(State.current));
  $('#theaterShare').addEventListener('click', () => State.current && openShareModal(State.current));

  $('#shareCopy').addEventListener('click', () => {
    copyToClipboard($('#shareUrl').value);
  });

  $('#shareTimestamp').addEventListener('change', e => {
    if (!State.current) return;
    const t = Math.floor(video.currentTime || 0);
    $('#shareUrl').value = e.target.checked
      ? shareUrlFor(State.current) + '&t=' + t
      : shareUrlFor(State.current);
  });

  $$('[data-share]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = encodeURIComponent($('#shareUrl').value);
      const title = encodeURIComponent(State.current?.title || 'Check out this video');
      const targets = {
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        whatsapp: `https://wa.me/?text=${title}%20${url}`,
        email: `mailto:?subject=${title}&body=${url}`
      };
      if (btn.dataset.share === 'embed') {
        copyToClipboard(`<iframe src="${DriveSource.previewUrl(State.current?.driveId || '')}" width="640" height="360" allowfullscreen></iframe>`);
        return;
      }
      window.open(targets[btn.dataset.share], '_blank', 'noopener');
    });
  });

  function copyToClipboard(text) {
    if (!text) return;
    const done = () => Toast.success('Copied to clipboard', text.slice(0, 64) + (text.length > 64 ? '…' : ''));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { Toast.error('Copy failed'); }
    ta.remove();
  }

  /* ================================================================
     17. THEME
     ================================================================ */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    State.settings.theme = theme;
    Store.set('settings', State.settings);
    const icon = $('#themeIcon');
    if (icon) {
      icon.innerHTML = theme === 'dark'
        ? '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>'
        : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1f1d2b' : '#f4f5fa');
  }

  function toggleTheme() {
    const next = State.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    Toast.info(next === 'dark' ? 'Dark theme' : 'Light theme');
  }

  $('#themeToggle').addEventListener('click', toggleTheme);

  /* ================================================================
     18. MEDIA SESSION API
     ================================================================ */

  function updateMediaSession() {
    if (!('mediaSession' in navigator) || !State.current) return;
    const v = State.current;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: v.title,
        artist: v.author.name,
        album: 'Vault',
        artwork: [
          { src: getPoster(v), sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => video.play());
      navigator.mediaSession.setActionHandler('pause', () => video.pause());
      navigator.mediaSession.setActionHandler('seekbackward', d => seekBy(-(d.seekOffset || 10)));
      navigator.mediaSession.setActionHandler('seekforward', d => seekBy(d.seekOffset || 10));
      navigator.mediaSession.setActionHandler('seekto', d => { if (d.seekTime != null) seekTo(d.seekTime); });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        const p = Queue.previous();
        if (p) openPlayer(p, { fromQueue: true });
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        const n = Queue.next();
        if (n) openPlayer(n, { fromQueue: true });
      });
    } catch (e) {}
  }

  /* ================================================================
     19. LIKES / SAVES / FAVOURITES
     ================================================================ */

  function toggleLike(v) {
    const i = State.liked.indexOf(v.id);
    const d = State.disliked.indexOf(v.id);
    if (d >= 0) State.disliked.splice(d, 1);
    if (i >= 0) {
      State.liked.splice(i, 1);
      v.likes = Math.max(0, v.likes - 1);
      Toast.info('Like removed');
    } else {
      State.liked.push(v.id);
      v.likes += 1;
      Toast.success('Liked', v.title);
    }
    Store.set('liked', State.liked);
    Store.set('disliked', State.disliked);
    $('#btnLike').classList.toggle('is-on', State.liked.includes(v.id));
    $('#btnDislike').classList.toggle('is-on', State.disliked.includes(v.id));
    $('#likeCount').textContent = formatNumber(v.likes);
  }

  function toggleDislike(v) {
    const i = State.disliked.indexOf(v.id);
    const l = State.liked.indexOf(v.id);
    if (l >= 0) { State.liked.splice(l, 1); v.likes = Math.max(0, v.likes - 1); }
    if (i >= 0) State.disliked.splice(i, 1);
    else State.disliked.push(v.id);
    Store.set('liked', State.liked);
    Store.set('disliked', State.disliked);
    $('#btnLike').classList.toggle('is-on', State.liked.includes(v.id));
    $('#btnDislike').classList.toggle('is-on', State.disliked.includes(v.id));
    $('#likeCount').textContent = formatNumber(v.likes);
  }

  function toggleWatchLater(v) {
    const i = State.watchLater.indexOf(v.id);
    if (i >= 0) {
      State.watchLater.splice(i, 1);
      Toast.info('Removed from Watch later');
    } else {
      State.watchLater.push(v.id);
      Toast.success('Saved to Watch later', v.title);
    }
    Store.set('watchLater', State.watchLater);
    if (State.current && State.current.id === v.id) {
      $('#btnSave').classList.toggle('is-on', State.watchLater.includes(v.id));
    }
    refresh();
  }

  function toggleFavorite(v) {
    const i = State.favorites.indexOf(v.id);
    if (i >= 0) { State.favorites.splice(i, 1); Toast.info('Removed from favourites'); }
    else { State.favorites.push(v.id); Toast.success('Added to favourites', v.title); }
    Store.set('favorites', State.favorites);
    refresh();
  }

  $('#btnLike').addEventListener('click', () => State.current && toggleLike(State.current));
  $('#btnDislike').addEventListener('click', () => State.current && toggleDislike(State.current));
  $('#btnSave').addEventListener('click', () => State.current && toggleWatchLater(State.current));
  $('#btnQueue').addEventListener('click', () => State.current && Queue.add(State.current));
  $('#btnDownload').addEventListener('click', () => {
    if (!State.current) return;
    const url = State.current.src || (State.current.driveId ? DriveSource.directUrl(State.current.driveId) : '');
    if (!url) { Toast.warn('No download URL'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = State.current.title + '.mp4';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    Toast.info('Download started', 'Drive files may open in a new tab.');
  });

  /* ================================================================
     20. CONTINUE WATCHING RAIL
     ================================================================ */

  function renderContinueWatching() {
    const rail = $('#continueRail');
    const section = $('#continueSection');
    const items = State.history
      .map(h => ({ entry: h, video: State.library.find(v => v.id === h.id) }))
      .filter(x => x.video)
      .slice(0, 10);

    if (!items.length) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    rail.innerHTML = '';

    items.forEach(({ entry, video: v }) => {
      const pct = v.duration ? clamp((entry.time / v.duration) * 100, 0, 100) : 0;
      const node = el('div', { class: 'rail__item' });
      node.innerHTML = `
        <div class="continue-card">
          <div class="continue-card__thumb">
            <img src="${escapeHtml(getPoster(v))}" alt="" loading="lazy" />
            <div class="continue-card__play">
              <span><svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px;margin-left:2px"><path d="M8 5v14l11-7z"/></svg></span>
            </div>
            <div class="continue-card__bar"><span style="width:${pct}%"></span></div>
          </div>
          <div class="continue-card__body">
            <div class="continue-card__title">${escapeHtml(v.title)}</div>
            <div class="continue-card__meta">${formatTime(entry.time)} / ${formatTime(v.duration)}</div>
          </div>
        </div>`;
      node.querySelector('.continue-card').addEventListener('click', () => openPlayer(v));
      rail.appendChild(node);
    });
  }

  $('#clearHistoryBtn').addEventListener('click', () => {
    State.history = [];
    State.positions = {};
    Store.set('history', []);
    Store.set('positions', {});
    renderContinueWatching();
    Toast.info('Watch history cleared');
  });

  /* ================================================================
     21. GRID EVENT DELEGATION
     ================================================================ */

  grid.addEventListener('click', e => {
    const card = e.target.closest('.video-card');
    if (!card) return;
    const v = State.library.find(x => x.id === card.dataset.id);
    if (!v) return;

    const quick = e.target.closest('[data-quick]');
    if (quick) {
      e.stopPropagation();
      const kind = quick.dataset.quick;
      if (kind === 'like') toggleLike(v);
      if (kind === 'watchlater') toggleWatchLater(v);
      if (kind === 'queue') Queue.add(v);
      return;
    }

    if (e.target.closest('[data-menu]')) {
      e.stopPropagation();
      const rect = e.target.getBoundingClientRect();
      openContextMenu(rect.left, rect.bottom + 6, v);
      return;
    }

    openPlayer(v);
  });

  grid.addEventListener('contextmenu', e => {
    const card = e.target.closest('.video-card');
    if (!card) return;
    e.preventDefault();
    const v = State.library.find(x => x.id === card.dataset.id);
    if (v) openContextMenu(e.clientX, e.clientY, v);
  });

  grid.addEventListener('keydown', e => {
    const card = e.target.closest('.video-card');
    if (!card) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const v = State.library.find(x => x.id === card.dataset.id);
      if (v) openPlayer(v);
    }
    if (e.key.toLowerCase() === 'q') {
      const v = State.library.find(x => x.id === card.dataset.id);
      if (v) Queue.add(v);
    }
  });

  /* ================================================================
     22. TOOLBAR / SEARCH / FILTER WIRING
     ================================================================ */

  $('#searchInput').addEventListener('input', debounce(e => {
    State.query = e.target.value.trim();
    refresh();
  }, 220));

  $('#filterChips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    State.filter = chip.dataset.filter;
    $$('#filterChips .chip').forEach(c => c.classList.toggle('is-active', c === chip));
    refresh();
  });

  $('#categoryMenu').addEventListener('click', e => {
    const link = e.target.closest('[data-cat]');
    if (!link) return;
    e.preventDefault();
    State.category = link.dataset.cat;
    $$('#categoryMenu .sidebar-link').forEach(l => l.classList.toggle('is-active', l === link));
    refresh();
    Toast.info('Category: ' + State.category);
  });

  document.addEventListener('click', e => {
    const sortBtn = e.target.closest('[data-sort]');
    if (!sortBtn) return;
    State.sort = sortBtn.dataset.sort;
    Store.set('sort', State.sort);
    const labels = {
      newest: 'Newest', oldest: 'Oldest', popular: 'Most viewed',
      liked: 'Most liked', az: 'A → Z', za: 'Z → A', duration: 'Longest'
    };
    $('#sortLabel').textContent = labels[State.sort] || 'Sort';
    refresh();
  });

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.view = btn.dataset.view;
      Store.set('view', State.view);
      grid.classList.toggle('is-list', State.view === 'list');
      $$('[data-view]').forEach(b => b.classList.toggle('is-active', b === btn));
    });
  });

  /* ================================================================
     23. SIDEBAR
     ================================================================ */

  const sidebar = $('#sidebar');
  const sidebarBackdrop = $('#sidebarBackdrop');

  function toggleSidebar() {
    if (window.innerWidth <= 1100) {
      sidebar.classList.toggle('is-mobile-open');
      sidebarBackdrop.classList.toggle('is-open', sidebar.classList.contains('is-mobile-open'));
    } else {
      sidebar.classList.toggle('is-collapsed');
      Store.set('sidebarCollapsed', sidebar.classList.contains('is-collapsed'));
    }
  }

  $('#sidebarToggle').addEventListener('click', toggleSidebar);
  sidebarBackdrop.addEventListener('click', () => {
    sidebar.classList.remove('is-mobile-open');
    sidebarBackdrop.classList.remove('is-open');
  });

  $$('.sidebar-link[data-nav]').forEach(link => {
    link.addEventListener('click', e => {
      if (link.dataset.nav === 'discover' || link.dataset.nav === 'trending') {
        e.preventDefault();
      }
      $$('.sidebar-link[data-nav]').forEach(l => l.classList.toggle('is-active', l === link));
    });
  });

  /* ================================================================
     24. SCROLL TO TOP
     ================================================================ */

  const mainContainer = $('#mainContainer');
  const scrollTopBtn = $('#scrollTop');

  mainContainer.addEventListener('scroll', throttle(() => {
    scrollTopBtn.classList.toggle('is-visible', mainContainer.scrollTop > 600);
  }, 120));

  scrollTopBtn.addEventListener('click', () => {
    mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ================================================================
     25. NOTIFICATIONS (decorative)
     ================================================================ */

  $('#notifyBtn').addEventListener('click', () => {
    const dot = $('.icon-btn__dot');
    if (dot) dot.remove();
    Toast.info('You are all caught up', 'No new notifications.');
  });

  /* ================================================================
     26. HERO WIRING
     ================================================================ */

  function wireHero() {
    const featured = State.library[0];
    const second = State.library[1];

    if (featured) {
      $('#featuredTitle').textContent = featured.title;
      $('#featuredCard').style.backgroundImage = `url("${getPoster(featured)}")`;
      $('#featuredMeta').innerHTML = `
        <img class="user-img" style="width:26px;height:26px" src="${escapeHtml(featured.author.avatar)}" alt="">
        <span>${escapeHtml(featured.author.name)}</span><span class="seperate"></span>
        <span>${formatViews(featured.views)} views</span><span class="seperate"></span>
        <span>${relativeDate(featured.publishedAt)}</span>`;
      $('#featuredPlay').addEventListener('click', () => openPlayer(featured));
      $('#featuredQueue').addEventListener('click', () => Queue.add(featured));
      $('#featuredInfo').addEventListener('click', () => openPlayer(featured));
    }

    if (second) {
      const card2 = $('#featuredCard2');
      card2.querySelector('.featured-card__title').textContent = second.title;
      card2.style.backgroundImage = `url("${getPoster(second)}")`;
      const meta = card2.querySelector('.featured-card__meta');
      meta.innerHTML = `
        <img class="user-img" style="width:26px;height:26px" src="${escapeHtml(second.author.avatar)}" alt="">
        <span>${escapeHtml(second.author.name)}</span><span class="seperate"></span>
        <span>${formatViews(second.views)} views</span>`;
      card2.querySelector('[data-play-featured]').addEventListener('click', () => openPlayer(second));
    }
  }

  /* ================================================================
     27. GOOGLE DRIVE LIBRARY RESTORE
     ================================================================ */

  function restoreDriveLibrary() {
    const saved = Store.get('driveLibrary', null);
    if (Array.isArray(saved) && saved.length) {
      State.library = saved.concat(LIBRARY);
    } else {
      State.library = LIBRARY.slice();
    }
  }

  /* ================================================================
     28. DEEP LINKING (#watch=id)
     ================================================================ */

  function handleDeepLink() {
    const hash = location.hash;
    const m = hash.match(/#watch=([\w-]+)/);
    if (!m) return;
    const v = State.library.find(x => x.id === m[1]);
    if (v) {
      // Defer so the grid renders first
      setTimeout(() => openPlayer(v, { silent: true }), 320);
    }
  }

  /* ================================================================
     29. FIRST-RUN ONBOARDING TOASTS
     ================================================================ */

  function firstRunHints() {
    if (Store.get('visited', false)) return;
    Store.set('visited', true);
    setTimeout(() => Toast.info('Welcome to Vault', 'Press ? for keyboard shortcuts, or hover a card to preview it.', 6000), 900);
    setTimeout(() => Toast.info('Google Drive ready', 'Add your file IDs in Settings to stream from your own Drive.', 7000), 3600);
  }

  /* ================================================================
     30. BOOT SEQUENCE
     ================================================================ */

  function boot() {
    // Theme
    applyTheme(State.settings.theme || 'dark');

    // Sidebar state
    if (Store.get('sidebarCollapsed', false) && window.innerWidth > 1100) {
      sidebar.classList.add('is-collapsed');
    }

    // View mode
    grid.classList.toggle('is-list', State.view === 'list');
    $$('[data-view]').forEach(b => b.classList.toggle('is-active', b.dataset.view === State.view));

    // Drive config restore
    CONFIG.drive.apiKey = Store.get('driveApiKey', CONFIG.drive.apiKey);
    CONFIG.drive.folderId = Store.get('driveFolder', CONFIG.drive.folderId);

    // Library
    restoreDriveLibrary();

    // Initial volume / speed
    applyVolume(State.settings.volume, false);
    video.loop = State.settings.loop;
    setSpeed(State.settings.speed || 1);

    // UI builds
    buildShortcutGrid();
    syncSettingsUI();
    wireHero();
    refresh();
    renderQueue();

    // Shortcuts modal open/close consistency
    $('#settingsBtn').addEventListener('click', syncSettingsUI);

    // Deep link
    handleDeepLink();
    window.addEventListener('hashchange', handleDeepLink);

    // First-run hints
    firstRunHints();

    // Keyboard lock state for PiP
    video.addEventListener('enterpictureinpicture', () => {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });

    // Prevent the browser's default drag behaviour on the mini player
    miniPlayer.addEventListener('dragstart', e => e.preventDefault());

    // Responsive: clamp the mini player into view on resize
    window.addEventListener('resize', debounce(() => {
      if (!miniPlayer.classList.contains('is-open')) return;
      const rect = miniPlayer.getBoundingClientRect();
      if (rect.right > window.innerWidth || rect.left < 0 || rect.bottom > window.innerHeight) {
        miniPlayer.style.left = 'auto';
        miniPlayer.style.top = 'auto';
        miniPlayer.style.right = CONFIG.miniSnapMargin + 'px';
        miniPlayer.style.bottom = CONFIG.miniSnapMargin + 'px';
      }
    }, 200));

    // Double-click on the mini player header expands it
    dragHandle.addEventListener('dblclick', () => {
      exitMiniPlayer();
      if (State.current) openPlayer(State.current, { silent: true });
    });

    // Save state before unload
    window.addEventListener('beforeunload', () => {
      savePositionThrottled();
      Store.set('settings', State.settings);
    });

    // Console easter egg
    console.log('%cVault', 'font-size:34px;font-weight:800;color:#6c5ecf;text-shadow:0 2px 14px rgba(108,94,207,.6)');
    console.log('%cAdvanced video gallery & player — built with vanilla JS.', 'color:#808191;font-size:12px');
    console.log('%cAdd your Google Drive file IDs in Settings → Google Drive API key.', 'color:#22b07d;font-size:12px');
  }

  // Kick everything off once the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
