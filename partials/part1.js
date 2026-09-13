




/* ============================================================
   MyBeats — Consolidated Single-File App (No ES Modules)
   Everything attached to window for 100% accessibility.
   jQuery for AJAX + DOM. Native-app feel via rAF batching,
   passive listeners, will-change hints, and animated transitions.
   ============================================================ */

/* ==================== 1. CORE ==================== */

const Config = {
  IMAGE_BASE: {
    artist: "https://raw.githubusercontent.com/ClockBlocked/beats/refs/heads/ClockBlocked-patch-1/content/artistPortraits/",
    album: "https://raw.githubusercontent.com/ClockBlocked/beats/refs/heads/ClockBlocked-patch-1/content/albumCovers/"
  },
  FAVOURITES: {
    favSongs: "Songs",
    favArtists: "Artists",
    favAlbums: "Albums",
    favPlaylists: "FavPlaylists",
    playlists: "Playlists"
  },
  DEFAULT_COVER: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23333"/%3E%3Ccircle cx="50" cy="50" r="30" fill="%23666"/%3E%3C/svg%3E',
  QUEUE: { recentMax: 30 },
  VOLUME: { default: 1 }
};

class Utils {
  static slug(name) {
    return name ? name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().trim() || "default" : "default";
  }
  static clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }
  static shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  static fmtTime(s) {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }
  static id(val) { return val == null ? "" : String(val); }
  static newId(prefix = "id") {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
  static esc(str = "") {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  static fmtDuration(raw) {
    if (raw === null || raw === undefined || raw === "") return "";
    if (typeof raw === "string") {
      const text = raw.trim();
      if (!text) return "";
      if (text.includes(":") || /[a-zA-Z]/.test(text)) return text;
      const parsed = Number(text);
      if (!Number.isFinite(parsed)) return text;
      return Utils.fmtTime(parsed);
    }
    if (!Number.isFinite(raw) || raw <= 0) return String(raw);
    return Utils.fmtTime(raw);
  }
  static albumQueue(state, artistId, albumId) {
    const artist = state.getArtistById(artistId);
    const album = artist?.albums.find(a => Utils.id(a.id) === Utils.id(albumId));
    if (!artist || !album) return [];
    return album.songs.map(s => ({
      ...s,
      artistId: artist.id,
      albumId: album.id,
      artist: artist.artist,
      album: album.album,
      coverUrl: album.coverUrl,
      artistImageUrl: artist.imageUrl
    }));
  }
}

class Prefs {
  static KEY = "mybeats.prefs.v1";
  static _cache = null;
  static THEMES = {
    dark: { label: "Dark", dark: true, preview: { bg: "53 59 69", card: "44 49 60", text: "171 178 191", accent: "198 120 221" } },
    onedark: { label: "One Dark", dark: true, preview: { bg: "41 48 60", card: "36 42 54", text: "176 186 202", accent: "170 126 218" } },
    mocha: { label: "Mocha", dark: true, preview: { bg: "58 58 61", card: "49 49 52", text: "188 188 191", accent: "168 142 200" } },
    tokoyonight: { label: "Tokoyo Night", dark: true, preview: { bg: "49 62 55", card: "42 53 46", text: "180 193 181", accent: "109 168 129" } },
    moon: { label: "Moon", dark: true, preview: { bg: "232 224 212", card: "226 218 206", text: "38 30 22", accent: "148 102 130" } },
    light: { label: "Light", dark: false, preview: { bg: "218 228 240", card: "212 222 235", text: "16 24 38", accent: "72 118 190" } },
    bloom: { label: "Bloom", dark: false, preview: { bg: "236 222 204", card: "230 215 196", text: "44 34 20", accent: "172 112 68" } }
  };
  static DEFAULT_THEME = "dark";
  static DEFAULT_LIGHT = "light";

  static _read() {
    if (Prefs._cache) return Prefs._cache;
    try {
      const raw = localStorage.getItem(Prefs.KEY);
      Prefs._cache = raw ? JSON.parse(raw) : {};
    } catch { Prefs._cache = {}; }
    return Prefs._cache;
  }
  static _write(data) {
    Prefs._cache = data;
    try { localStorage.setItem(Prefs.KEY, JSON.stringify(data)); } catch {}
  }
  static get(key, fallback = null) {
    const data = Prefs._read();
    return key in data ? data[key] : fallback;
  }
  static set(key, value) {
    const data = Prefs._read();
    data[key] = value;
    Prefs._write(data);
  }
  static isValidTheme(name) { return !!Prefs.THEMES[name]; }
  static theme() {
    const saved = Prefs.get("theme", null);
    return Prefs.isValidTheme(saved) ? saved : Prefs.DEFAULT_THEME;
  }
  static listThemes() {
    return Object.entries(Prefs.THEMES).map(([key, cfg]) => ({ key, ...cfg }));
  }
  static applyTheme(name, { persist = true } = {}) {
    if (!Prefs.isValidTheme(name)) name = Prefs.DEFAULT_THEME;
    const cfg = Prefs.THEMES[name];
    document.documentElement.setAttribute("data-theme", name);
    document.body.classList.toggle("dark", cfg.dark);
    document.querySelectorAll(".theme-toggle-btn").forEach(b => b.classList.toggle("dark", cfg.dark));
    if (persist) {
      Prefs.set("theme", name);
      if (cfg.dark) Prefs.set("lastDarkTheme", name); else Prefs.set("lastLightTheme", name);
      try { localStorage.setItem("theme", cfg.dark ? "dark" : "light"); } catch {}
    }
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: name, dark: cfg.dark } }));
  }
  static nextToggle() {
    const current = Prefs.theme();
    const cfg = Prefs.THEMES[current];
    if (cfg.dark) {
      const lastLight = Prefs.get("lastLightTheme", null);
      return Prefs.isValidTheme(lastLight) && !Prefs.THEMES[lastLight].dark ? lastLight : Prefs.DEFAULT_LIGHT;
    }
    const lastDark = Prefs.get("lastDarkTheme", null);
    return Prefs.isValidTheme(lastDark) && Prefs.THEMES[lastDark].dark ? lastDark : Prefs.DEFAULT_THEME;
  }
  static init() {
    const savedTheme = Prefs.get("theme", null);
    const theme = Prefs.isValidTheme(savedTheme) ? savedTheme : Prefs.DEFAULT_THEME;
    document.documentElement.setAttribute("data-theme", theme);
    Prefs.set("theme", theme);
    const savedAccent = Prefs.get("accent", "coral");
    document.documentElement.setAttribute("data-accent", savedAccent);
    Prefs.set("accent", savedAccent);
  }
}

class IdUtils {
  static norm(v) { return Utils.id(v); }
  static sample(arr, n) { return Utils.shuffle(arr).slice(0, n); }
  static hslToRgb(hslString) {
    // Accepts "h s% l%" or {h,s,l} or "h s l"
    let h, s, l;
    if (typeof hslString === "string") {
      const parts = hslString.split(" ").map(p => parseFloat(p));
      h = parts[0]; s = parts[1]; l = parts[2];
    } else if (hslString && typeof hslString === "object") {
      h = hslString.h; s = hslString.s; l = hslString.l;
    } else {
      return { r: 255, g: 107, b: 107 };
    }
    h = ((h % 360) + 360) % 360;
    s = s / 100; l = l / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  }
}

class ColorExtractor {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultColors = { primary: "20 20 40", secondary: "28 32 52", accent: "220 38 38" };
    this.opts = { sampleRate: 10, skipThreshold: 30, whiteThreshold: 225, colorQuantize: 10, dominantColorCount: 3, ...options };
  }
  async extract(imageUrl) {
    if (!imageUrl) return { ...this.defaultColors };
    if (this.cache.has(imageUrl)) return this.cache.get(imageUrl);
    try {
      const img = await this._loadImg(imageUrl);
      const pixels = this._getPixels(img);
      const colors = this._domColors(pixels);
      this.cache.set(imageUrl, colors);
      return colors;
    } catch (err) {
      console.warn("[ColorExtractor] Extraction failed, using defaults.", err);
      return { ...this.defaultColors };
    }
  }
  applyPlayer(colors) {
    const root = document.documentElement;
    root.style.setProperty("--borderPrimary", colors.primary);
    root.style.setProperty("--textOthers", colors.secondary);
    root.style.setProperty("--playerAccent", colors.accent);
    root.style.setProperty("--player-gradient", `linear-gradient(135deg, rgb(var(--player-primary)), rgb(var(--player-secondary)))`);
    root.style.setProperty("--player-glow", this._toRGBA(colors.accent, .25));
    root.style.setProperty("--player-glow-strong", this._toRGBA(colors.accent, .5));
    root.style.setProperty("--player-tint", this._mixBlack(colors.primary, .65));
    window.dispatchEvent(new CustomEvent("themechange", { detail: { ...colors } }));
  }
  _loadImg(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load error"));
      img.src = url;
    });
  }
  _getPixels(img) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const maxSize = 100;
    let { width, height } = img;
    if (width > height) { height = height / width * maxSize; width = maxSize; }
    else { width = width / height * maxSize; height = maxSize; }
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  }
  _domColors(pixelData) {
    const colorMap = new Map();
    for (let i = 0; i < pixelData.length; i += this.opts.sampleRate * 4) {
      const r = pixelData[i], g = pixelData[i + 1], b = pixelData[i + 2], a = pixelData[i + 3];
      if (a < 128) continue;
      const brightness = (r + g + b) / 3;
      if (brightness < this.opts.skipThreshold || brightness > this.opts.whiteThreshold) continue;
      const key = `${Math.floor(r / this.opts.colorQuantize)},${Math.floor(g / this.opts.colorQuantize)},${Math.floor(b / this.opts.colorQuantize)}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
    const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, this.opts.dominantColorCount);
    const palette = sorted.map(([key]) => {
      const [r, g, b] = key.split(",").map(v => parseInt(v) * this.opts.colorQuantize);
      return { r, g, b };
    });
    return this._buildScheme(palette);
  }
  _buildScheme(palette) {
    if (!palette.length) return { ...this.defaultColors };
    const hslPalette = palette.map(c => this._rgbToHsl(c));
    const primaryHSL = { h: hslPalette[0].h, s: Math.min(hslPalette[0].s, 40), l: Math.max(hslPalette[0].l, 80) };
    const secondaryHSL = { h: hslPalette[0].h, s: Math.min(hslPalette[0].s, 30), l: Math.min(hslPalette[0].l, 70) };
    const vibrant = hslPalette.reduce((a, b) => a.s > b.s ? a : b);
    const accentHSL = { h: vibrant.h, s: Math.min(vibrant.s + 20, 100), l: Math.round((45 + 55) / 2) };
    return {
      primary: this._hslToRGBString(primaryHSL),
      secondary: this._hslToRGBString(secondaryHSL),
      accent: this._hslToRGBString(accentHSL)
    };
  }
  _hslToRGBString({ h, s, l }) {
    const rgb = this._hslToRgb(h, s, l);
    return `${rgb.r} ${rgb.g} ${rgb.b}`;
  }
  _hslToRgb(h, s, l) {
    h = (h % 360 + 360) % 360; s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(h / 60 % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  }
  _rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > .5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    } else { h = s = 0; }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  _mixBlack(rgbString, ratio) {
    const [r, g, b] = rgbString.split(" ").map(Number);
    if (isNaN(r)) return rgbString;
    return `${Math.round(r * (1 - ratio))} ${Math.round(g * (1 - ratio))} ${Math.round(b * (1 - ratio))}`;
  }
  _toRGBA(rgbString, alpha) {
    const [r, g, b] = rgbString.split(" ").map(Number);
    if (isNaN(r)) return `rgba(0,0,0,${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

class Spinner {
  static #CSS_INJECTED = false;
  static #injectStyles() {
    if (Spinner.#CSS_INJECTED) return;
    const style = document.createElement("style");
    style.id = "spnr-styles";
    style.textContent = `
      @keyframes spnr-spin { to { transform: rotate(360deg); } }
      .spnr-circle { width: 2.5rem; height: 2.5rem; border: 0.25rem solid rgba(255,255,255,0.2); border-top-color: #dc143c; border-radius: 9999px; animation: spnr-spin 0.75s linear infinite; }
      .spnr-overlay { display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 10000; transition: opacity 0.3s ease; }
      .spnr-overlay.show { opacity: 1; pointer-events: auto; }
      .spnr-overlay.hide { opacity: 0; pointer-events: none; }
      .spnr-overlay--page { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
      .spnr-overlay--area { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: inherit; }
      .spnr-inline { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: inline-flex; align-items: center; justify-content: center; transition: opacity 0.25s ease; pointer-events: none; }
      .spnr-inline .spnr-circle { width: 1.25rem; height: 1.25rem; border-width: 0.18rem; }
      .spnr-inline.show { opacity: 1; }
      .spnr-inline.hide { opacity: 0; }
    `;
    document.head.appendChild(style);
    Spinner.#CSS_INJECTED = true;
  }
  constructor({ type = "page", container } = {}) {
    Spinner.#injectStyles();
    this.type = type;
    this.container = container || document.body;
    this.el = null;
    this.#build();
  }
  #build() {
    if (this.type === "page" || this.type === "area") this.#buildOverlay();
    else if (this.type === "inline") this.#buildInline();
    else throw new Error(`Unknown spinner type: ${this.type}`);
    this.el.classList.add("hide");
  }
  #buildOverlay() {
    const overlay = document.createElement("div");
    overlay.classList.add("spnr-overlay");
    overlay.classList.add(this.type === "page" ? "spnr-overlay--page" : "spnr-overlay--area");
    const circle = document.createElement("div");
    circle.classList.add("spnr-circle");
    overlay.appendChild(circle);
    if (this.type === "page") document.body.appendChild(overlay);
    else {
      if (!this.container) throw new Error('"area" spinner requires a container element.');
      if (window.getComputedStyle(this.container).position === "static") this.container.style.position = "relative";
      this.container.appendChild(overlay);
    }
    this.el = overlay;
  }
  #buildInline() {
    if (!this.container) throw new Error('"inline" spinner requires a container element.');
    if (window.getComputedStyle(this.container).position === "static") this.container.style.position = "relative";
    const inline = document.createElement("span");
    inline.classList.add("spnr-inline");
    const circle = document.createElement("div");
    circle.classList.add("spnr-circle");
    inline.appendChild(circle);
    this.container.appendChild(inline);
    this.el = inline;
  }
  show() {
    if (!this.el) return;
    this.el.classList.remove("hide");
    this.el.classList.add("show");
    this.container?.setAttribute?.("aria-busy", "true");
  }
  hide() {
    if (!this.el) return;
    this.el.classList.remove("show");
    this.el.classList.add("hide");
    this.container?.removeAttribute?.("aria-busy");
  }
  remove() {
    if (this.el) { this.el.remove(); this.el = null; }
  }
}

class SearchUtils {
  static recentKey = "mybeats.recentSearches";
  static maxRecent = 10;
  static fuzzy(text, query) {
    if (!text || !query) return false;
    return text.toLowerCase().includes(query.toLowerCase());
  }
  static getRecent() {
    try { const raw = localStorage.getItem(this.recentKey); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  }
  static addRecent(query) {
    if (!query || query.trim() === "") return;
    const recent = this.getRecent();
    const clean = query.trim();
    const filtered = recent.filter(q => q !== clean);
    filtered.unshift(clean);
    const trimmed = filtered.slice(0, this.maxRecent);
    try { localStorage.setItem(this.recentKey, JSON.stringify(trimmed)); } catch {}
  }
  static clearRecent() {
    try { localStorage.removeItem(this.recentKey); } catch {}
  }
}

class PersistenceManager {
  static STORAGE_KEYS = {
    LAST_SONG: "mybeats_last_song", QUEUE: "mybeats_queue", QUEUE_INDEX: "mybeats_queue_index",
    CURRENT_TIME: "mybeats_current_time", IS_PLAYING: "mybeats_is_playing", VOLUME: "mybeats_volume",
    MUTED: "mybeats_muted", PLAYBACK_RATE: "mybeats_playback_rate", REPEAT_MODE: "mybeats_repeat_mode",
    SHUFFLED: "mybeats_shuffled", RECENTLY_PLAYED: "mybeats_recently_played"
  };
  constructor(state, audioPlayer) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    this.saveThrottle = null;
    this.lastSavedTime = 0;
    this._restored = false;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => this.restore());
    else setTimeout(() => this.restore(), 50);
    this.bind();
  }
  restore() {
    if (this._restored) return;
    this._restored = true;
    try {
      const vol = localStorage.getItem(PersistenceManager.STORAGE_KEYS.VOLUME);
      if (vol !== null) { this.state.volume = parseFloat(vol); this.audioPlayer.setVolume(this.state.volume); }
      const muted = localStorage.getItem(PersistenceManager.STORAGE_KEYS.MUTED);
      if (muted !== null) {
        this.state.isMuted = muted === "true";
        if (this.state.isMuted) this.audioPlayer.audio.volume = 0;
        else this.audioPlayer.audio.volume = this.state.volume;
      }
      const rate = localStorage.getItem(PersistenceManager.STORAGE_KEYS.PLAYBACK_RATE);
      if (rate !== null) { this.state.playbackRate = parseFloat(rate); this.audioPlayer.audio.playbackRate = this.state.playbackRate; }
      const repeat = localStorage.getItem(PersistenceManager.STORAGE_KEYS.REPEAT_MODE);
      if (repeat !== null) this.state.repeatMode = repeat;
      const shuffled = localStorage.getItem(PersistenceManager.STORAGE_KEYS.SHUFFLED);
      if (shuffled !== null) this.state.isShuffled = shuffled === "true";
      const savedQueue = localStorage.getItem(PersistenceManager.STORAGE_KEYS.QUEUE);
      const savedIdx = localStorage.getItem(PersistenceManager.STORAGE_KEYS.QUEUE_INDEX);
      const lastSong = localStorage.getItem(PersistenceManager.STORAGE_KEYS.LAST_SONG);
      if (savedQueue && savedIdx !== null && lastSong) {
        const queue = JSON.parse(savedQueue);
        const song = JSON.parse(lastSong);
        const idx = parseInt(savedIdx, 10);
        if (queue.length && idx >= 0 && idx < queue.length && song.id == queue[idx]?.id) {
          this.state.queue = queue;
          this.state.queueIndex = idx;
          this.state.currentSong = song;
          const savedTime = parseFloat(localStorage.getItem(PersistenceManager.STORAGE_KEYS.CURRENT_TIME) || "0");
          const wasPlaying = localStorage.getItem(PersistenceManager.STORAGE_KEYS.IS_PLAYING) === "true";
          this.audioPlayer.restorePlaybackState(song, queue, savedTime, wasPlaying);
        }
      }
      const recent = localStorage.getItem(PersistenceManager.STORAGE_KEYS.RECENTLY_PLAYED);
      if (recent) { try { this.state.recentlyPlayed = JSON.parse(recent); } catch (e) {} }
      if (window.uiManager) {
        if (this.state.isDrawerOpen) window.uiManager.updateFullPlayer();
        window.uiManager.updateMiniPlayer();
      }
    } catch (e) { console.warn("[Persistence] Restore error:", e); }
  }
  bind() {
    const audio = this.audioPlayer.audio;
    audio.addEventListener("play", () => this.save());
    audio.addEventListener("pause", () => this.save());
    audio.addEventListener("timeupdate", () => {
      const now = Date.now();
      if (now - this.lastSavedTime > 2000) { this.lastSavedTime = now; this.saveTime(); }
    });
    window.addEventListener("beforeunload", () => this.save(true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.save(true);
    });
    this.wrap("playSong", () => this.save());
    this.wrap("skipForward", () => this.save());
    this.wrap("skipBack", () => this.save());
    this.wrap("setVolume", () => this.saveVolume());
    this.wrap("toggleMute", () => this.saveVolume());
    this.wrap("cycleRepeat", () => this.saveMode());
    this.wrap("toggleShuffle", () => this.saveMode());
  }
  wrap(methodName, afterHook) {
    const original = this.audioPlayer[methodName];
    if (typeof original !== "function") return;
    this.audioPlayer[methodName] = function (...args) {
      const result = original.apply(this, args);
      afterHook();
      return result;
    };
  }
  save(immediate = false) {
    if (!this.state.currentSong) return;
    const doSave = () => {
      try {
        localStorage.setItem(PersistenceManager.STORAGE_KEYS.LAST_SONG, JSON.stringify(this.state.currentSong));
        localStorage.setItem(PersistenceManager.STORAGE_KEYS.QUEUE, JSON.stringify(this.state.queue));
        localStorage.setItem(PersistenceManager.STORAGE_KEYS.QUEUE_INDEX, this.state.queueIndex.toString());
        localStorage.setItem(PersistenceManager.STORAGE_KEYS.IS_PLAYING, this.state.isPlaying.toString());
        localStorage.setItem(PersistenceManager.STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(this.state.recentlyPlayed));
        this.saveTime(); this.saveVolume(); this.saveMode();
      } catch (e) { console.warn("[Persistence] Save failed:", e); }
    };
    if (immediate) doSave();
    else { clearTimeout(this.saveThrottle); this.saveThrottle = setTimeout(doSave, 200); }
  }
  saveTime() {
    if (this.audioPlayer.audio) localStorage.setItem(PersistenceManager.STORAGE_KEYS.CURRENT_TIME, this.audioPlayer.audio.currentTime.toString());
  }
  saveVolume() {
    localStorage.setItem(PersistenceManager.STORAGE_KEYS.VOLUME, this.state.volume.toString());
    localStorage.setItem(PersistenceManager.STORAGE_KEYS.MUTED, this.state.isMuted.toString());
    localStorage.setItem(PersistenceManager.STORAGE_KEYS.PLAYBACK_RATE, this.state.playbackRate.toString());
  }
  saveMode() {
    localStorage.setItem(PersistenceManager.STORAGE_KEYS.REPEAT_MODE, this.state.repeatMode);
    localStorage.setItem(PersistenceManager.STORAGE_KEYS.SHUFFLED, this.state.isShuffled.toString());
  }
}

class NProgress {
  static settings = {
    minimum: 0.08, easing: "ease", positionUsing: "", speed: 200,
    trickle: true, trickleRate: 0.02, trickleSpeed: 800, showSpinner: true,
    barSelector: '[role="bar"]', spinnerSelector: '[role="spinner"]', parent: "body",
    template: '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'
  };
  static status = null;
  static pending = [];
  static initial = 0;
  static current = 0;
  static configure(options) {
    for (let key in options) {
      if (options[key] !== undefined && this.settings.hasOwnProperty(key)) this.settings[key] = options[key];
    }
    return this;
  }
  static set(n) {
    const started = this.isStarted();
    n = this.clamp(n, this.settings.minimum, 1);
    this.status = n === 1 ? null : n;
    const progress = this.render(!started);
    const bar = progress.querySelector(this.settings.barSelector);
    const speed = this.settings.speed;
    const ease = this.settings.easing;
    progress.offsetWidth;
    this.queue(function (next) {
      if (this.settings.positionUsing === "") this.settings.positionUsing = this.getPositioningCSS();
      this.css(bar, this.barPositionCSS(n, speed, ease));
      if (n === 1) {
        this.css(progress, { transition: "none", opacity: 1 });
        progress.offsetWidth;
        setTimeout(() => {
          this.css(progress, { transition: "all " + speed + "ms linear", opacity: 0 });
          setTimeout(() => { this.remove(); next(); }, speed);
        }, speed);
      } else setTimeout(next, speed);
    }.bind(this));
    return this;
  }
  static isStarted() { return typeof this.status === "number"; }
  static start() {
    if (!this.status) this.set(0);
    const work = () => {
      setTimeout(() => {
        if (!this.status) return;
        this.trickle();
        work();
      }, this.settings.trickleSpeed);
    };
    if (this.settings.trickle) work();
    return this;
  }
  static done(force) {
    if (!force && !this.status) return this;
    return this.inc(0.3 + 0.5 * Math.random()).set(1);
  }
  static inc(amount) {
    let n = this.status;
    if (!n) return this.start();
    if (typeof amount !== "number") amount = (1 - n) * this.clamp(Math.random() * n, 0.1, 0.95);
    n = this.clamp(n + amount, 0, 0.994);
    return this.set(n);
  }
  static trickle() { return this.inc(Math.random() * this.settings.trickleRate); }
  static promise($promise) {
    if (!$promise || $promise.state() === "resolved") return this;
    if (this.current === 0) this.start();
    this.initial++; this.current++;
    $promise.always(() => {
      this.current--;
      if (this.current === 0) { this.initial = 0; this.done(); }
      else this.set((this.initial - this.current) / this.initial);
    });
    return this;
  }
  static render(fromStart) {
    if (this.isRendered()) return document.getElementById("nprogress");
    this.addClass(document.documentElement, "nprogress-busy");
    const progress = document.createElement("div");
    progress.id = "nprogress";
    progress.innerHTML = this.settings.template;
    const bar = progress.querySelector(this.settings.barSelector);
    const perc = fromStart ? "-100" : this.toBarPerc(this.status || 0);
    const parent = document.querySelector(this.settings.parent);
    this.css(bar, { transition: "all 0 linear", transform: "translate3d(" + perc + "%,0,0)" });
    if (!this.settings.showSpinner) {
      const spinner = progress.querySelector(this.settings.spinnerSelector);
      spinner && this.removeElement(spinner);
    }
    if (parent != document.body) this.addClass(parent, "nprogress-custom-parent");
    parent.appendChild(progress);
    return progress;
  }
  static remove() {
    this.removeClass(document.documentElement, "nprogress-busy");
    this.removeClass(document.querySelector(this.settings.parent), "nprogress-custom-parent");
    const progress = document.getElementById("nprogress");
    progress && this.removeElement(progress);
  }
  static isRendered() { return !!document.getElementById("nprogress"); }
  static getPositioningCSS() {
    const bodyStyle = document.body.style;
    const vendorPrefix = "WebkitTransform" in bodyStyle ? "Webkit" : "MozTransform" in bodyStyle ? "Moz" : "msTransform" in bodyStyle ? "ms" : "OTransform" in bodyStyle ? "O" : "";
    if (vendorPrefix + "Perspective" in bodyStyle) return "translate3d";
    else if (vendorPrefix + "Transform" in bodyStyle) return "translate";
    else return "margin";
  }
  static clamp(n, min, max) { return n < min ? min : n > max ? max : n; }
  static toBarPerc(n) { return (-1 + n) * 100; }
  static barPositionCSS(n, speed, ease) {
    let barCSS;
    if (this.settings.positionUsing === "translate3d") barCSS = { transform: "translate3d(" + this.toBarPerc(n) + "%,0,0)" };
    else if (this.settings.positionUsing === "translate") barCSS = { transform: "translate(" + this.toBarPerc(n) + "%,0)" };
    else barCSS = { "margin-left": this.toBarPerc(n) + "%" };
    barCSS.transition = "all " + speed + "ms " + ease;
    return barCSS;
  }
  static queue(fn) {
    const next = () => {
      const current = this.pending.shift();
      if (current) current(next);
    };
    this.pending.push(fn);
    if (this.pending.length == 1) next();
  }
  static css(element, properties) {
    const cssPrefixes = ["Webkit", "O", "Moz", "ms"];
    const cssProps = {};
    const camelCase = (string) => string.replace(/^-ms-/, "ms-").replace(/-([\da-z])/gi, (match, letter) => letter.toUpperCase());
    const getVendorProp = (name) => {
      const style = document.body.style;
      if (name in style) return name;
      let i = cssPrefixes.length, capName = name.charAt(0).toUpperCase() + name.slice(1), vendorName;
      while (i--) {
        vendorName = cssPrefixes[i] + capName;
        if (vendorName in style) return vendorName;
      }
      return name;
    };
    const getStyleProp = (name) => {
      name = camelCase(name);
      return cssProps[name] || (cssProps[name] = getVendorProp(name));
    };
    const applyCss = (element, prop, value) => {
      prop = getStyleProp(prop);
      element.style[prop] = value;
    };
    if (arguments.length == 2) {
      for (let prop in properties) {
        const value = properties[prop];
        if (value !== undefined && properties.hasOwnProperty(prop)) applyCss(element, prop, value);
      }
    } else applyCss(element, arguments[1], arguments[2]);
  }
  static hasClass(element, name) {
    const list = typeof element == "string" ? element : this.classList(element);
    return list.indexOf(" " + name + " ") >= 0;
  }
  static addClass(element, name) {
    const oldList = this.classList(element);
    const newList = oldList + name;
    if (this.hasClass(oldList, name)) return;
    element.className = newList.substring(1);
  }
  static removeClass(element, name) {
    const oldList = this.classList(element);
    const newList = oldList.replace(" " + name + " ", " ");
    element.className = newList.substring(1, newList.length - 1);
  }
  static classList(element) { return (" " + (element.className || "") + " ").replace(/\s+/gi, " "); }
  static removeElement(element) { element && element.parentNode && element.parentNode.removeChild(element); }
}

const Icons = {
  general: {
    close: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    heart: (size = 16, filled = false) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    playlistAdd: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    link: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    checkBadge: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    user: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M5.3 18.3C6.8 16.5 9.2 15 12 15s5.2 1.5 6.7 3.3"/></svg>`,
    album: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/></svg>`,
    search: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    moreVert: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`,
    moreHoriz: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
    arrowRight: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    plus: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    playlist: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    dragHandle: (size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`,
    eye: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    sparkles: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.9 5.8L20 12l-6.1 3.2L12 21l-1.9-5.8L4 12l6.1-3.2L12 3z"/></svg>`,
    grid: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    list: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    chevronDown: () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
    artist: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 0v8m0 0v4m0-4H4m8 0h8"/></svg>`,
    musicNote: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  },
  player: {
    play: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor"><path d="M6 3L16 10L6 17V3Z"/></svg>`,
    pause: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="3" width="4" height="14" rx="1"/><rect x="11" y="3" width="4" height="14" rx="1"/></svg>`,
    shuffle: (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>`,
  }
};

/* ==================== 2. INTERACTIONS ==================== */

class PopupsManager {
  constructor({ ui = null, container = document.body } = {}) {
    this.ui = ui;
    this.container = typeof container === "string" ? document.querySelector(container) : container;
    if (!this.container) this.container = document.body;
    this.active = new Set();
    this.stack = [];
    this._keyHandler = (e) => this._onKeyDown(e);
    this._resizeHandler = () => this._repositionPopups();
    this._tooltipEnterHandler = (e) => this._onTooltipEnter(e);
    document.addEventListener("keydown", this._keyHandler, true);
    window.addEventListener("resize", this._resizeHandler);
    this._ensureToastContainer();
    this.notificationHistory = [];
    this.enableTooltips();
  }
  static _esc(text = "") { return Utils.esc(text); }
  static _escAttr(text = "") {
    return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  static get icons() {
    const svg = (attrs, content) => `<svg ${attrs}>${content}</svg>`;
    return {
      close(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`, `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`); },
      heart(size = 16, filled = false) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"`, `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`); },
      playlistAdd(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`); },
      link(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`); },
      checkBadge(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`); },
      user(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<circle cx="12" cy="8" r="4"/><path d="M5.3 18.3C6.8 16.5 9.2 15 12 15s5.2 1.5 6.7 3.3"/>`); },
      album(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/>`); },
      play(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor"`, `<path d="M6 3L16 10L6 17V3Z"/>`); },
      eye(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`); },
      undo(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>`); },
      info(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`); },
      success(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`); },
      warning(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`); },
      error(size = 16) { return svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`, `<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`); }
    };
  }
  register(popup) { if (this.destroyed) return; this.active.add(popup); this.stack.push(popup); }
  unregister(popup) {
    if (this.destroyed) return;
    this.active.delete(popup);
    const idx = this.stack.indexOf(popup);
    if (idx >= 0) this.stack.splice(idx, 1);
  }
  closeType(type) { [...this.stack].reverse().forEach((p) => { if (p.type === type && p.isOpen) p.hide(); }); }
  closeAll() { [...this.stack].reverse().forEach((p) => { if (p.isOpen) p.hide(); }); }
  cleanup() { this.closeAll(); }
  destroy() {
    this.cleanup(); this.destroyed = true;
    document.removeEventListener("keydown", this._keyHandler, true);
    window.removeEventListener("resize", this._resizeHandler);
    document.removeEventListener("mouseenter", this._tooltipEnterHandler, true);
  }
  _onKeyDown(e) {
    if (e.key !== "Escape") return;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const p = this.stack[i];
      if (p.isOpen && p.type !== "toast" && p.closable !== false) {
        e.preventDefault(); e.stopPropagation(); p.hide(); break;
      }
    }
  }
  _repositionPopups() { this.active.forEach((p) => { if (p.isOpen && typeof p.reposition === "function") p.reposition(); }); }
  _updateToastStack() {
    if (!this._toastContainer) return;
    const toasts = this._toastContainer.querySelectorAll(".popups-toast");
    toasts.forEach((toast, idx) => toast.setAttribute("data-stack-idx", idx));
  }
  _ensureToastContainer() {
    if (this._toastContainer) return this._toastContainer;
    let el = document.getElementById("popups-toast-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "popups-toast-container";
      el.className = "popups-toast-container";
      document.body.appendChild(el);
    }
    this._toastContainer = el;
    el.addEventListener("mouseenter", () => el.classList.add("popups-stack-expanded"));
    el.addEventListener("mouseleave", () => el.classList.remove("popups-stack-expanded"));
    return el;
  }
  modal(options) { const p = new PopupsModal(this, options); p.show(); return p; }
  dialog(options) {
    const { title = "", message = "", confirmLabel = "Confirm", cancelLabel = "Cancel", dangerous = false, onConfirm, onCancel, size = "sm" } = options;
    const p = new PopupsModal(this, {
      title, size, closable: false,
      content: `<p class="popups-dialog-message">${PopupsManager._esc(message)}</p>`,
      actions: [{ label: cancelLabel, action: "cancel", type: "secondary" }, { label: confirmLabel, action: "confirm", type: dangerous ? "danger" : "primary" }],
      onAction: (action) => { if (action === "confirm") onConfirm && onConfirm(); else onCancel && onCancel(); },
      onClose: () => { onCancel && onCancel(); }
    });
    p.show(); return p;
  }
  dropdown(options) { const p = new PopupsDropdown(this, options); p.show(); return p; }
  popover(options) { const p = new PopupsPopover(this, options); p.show(); return p; }
  tooltip(target, text) {
    const options = target instanceof HTMLElement ? { target, text } : target;
    const p = new PopupsTooltip(this, options);
    p.show(); return p;
  }
  enableTooltips(selector = "[data-tooltip]") {
    this._tooltipSelector = selector;
    document.addEventListener("mouseenter", this._tooltipEnterHandler, true);
  }
  _onTooltipEnter(e) {
    const target = e.target.closest && e.target.closest(this._tooltipSelector);
    if (!target || target._popupsTooltip) return;
    const text = target.dataset.tooltip;
    if (!text || !text.trim()) return;
    const tip = new PopupsTooltip(this, { target, text });
    target._popupsTooltip = tip;
    tip._enterTimer = setTimeout(() => { tip._enterTimer = null; tip.show(); }, 250);
    const removeListeners = () => {
      clearTimeout(tip._enterTimer); tip._enterTimer = null;
      tip.hide();
      target.removeEventListener("mouseleave", onLeave);
      target.removeEventListener("mousedown", onLeave);
      target._popupsTooltip = null;
    };
    const onLeave = () => removeListeners();
    target.addEventListener("mouseleave", onLeave, { once: true });
    target.addEventListener("mousedown", onLeave, { once: true });
  }
  toast(options) {
    this.notificationHistory.unshift({
      id: Date.now() + Math.random(),
      type: options.type || "info",
      title: options.title || "",
      message: options.message || "",
      timestamp: new Date().toISOString()
    });
    if (this.notificationHistory.length > 50) this.notificationHistory.length = 50;
    const p = new PopupsToast(this, options);
    p.show();
    return p;
  }
  showNotificationPanel(anchorEl) {
    if (!anchorEl || !this.notificationHistory.length) return;
    const pageSize = 8;
    let currentOffset = 0;
    const buildList = (notifications) => {
      if (!notifications.length) return `<div class="notifications-empty">No notifications yet</div>`;
      return notifications.map((n) => `
        <div class="notification-item notification-${n.type}">
          <span class="notification-icon">${PopupsManager.icons[n.type] ? PopupsManager.icons[n.type](16) : PopupsManager.icons.info(16)}</span>
          <div class="notification-content">
            ${n.title ? `<div class="notification-title">${PopupsManager._esc(n.title)}</div>` : ''}
            <div class="notification-message">${PopupsManager._esc(n.message)}</div>
          </div>
          <div class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</div>
        </div>
      `).join("");
    };
    const initialSlice = this.notificationHistory.slice(0, pageSize);
    const hasMore = this.notificationHistory.length > pageSize;
    const renderContent = (notifications, hasMore) => `
      <div class="notifications-popover-wrapper">
        <div class="notifications-header"><h3>Notifications</h3></div>
        <div class="notifications-list">${buildList(notifications)}</div>
        ${hasMore ? `<div class="notifications-load-more"><button class="load-more-btn" data-action="load-more">Load earlier</button><div class="load-more-spinner" style="display:none;"><span class="spinner"></span>Loading…</div></div>` : ""}
      </div>
    `;
    const popover = this.popover({
      content: renderContent(initialSlice, hasMore),
      persistentActions: ['load-more'],
      onAction: (action) => {
        if (action === "load-more") {
          const loadMoreBtn = popover.el.querySelector(".load-more-btn");
          const spinner = popover.el.querySelector(".load-more-spinner");
          if (loadMoreBtn && spinner) {
            loadMoreBtn.style.display = "none";
            spinner.style.display = "flex";
            setTimeout(() => {
              currentOffset += pageSize;
              const allCurrent = this.notificationHistory.slice(0, currentOffset + pageSize);
              const stillHasMore = this.notificationHistory.length > currentOffset + pageSize;
              const listEl = popover.el.querySelector(".notifications-list");
              if (listEl) listEl.innerHTML = buildList(allCurrent);
              const loadMoreSection = popover.el.querySelector(".notifications-load-more");
              if (loadMoreSection) {
                if (stillHasMore) {
                  loadMoreSection.innerHTML = `<button class="load-more-btn" data-action="load-more">Load earlier</button><div class="load-more-spinner" style="display:none;"><span class="spinner"></span>Loading…</div>`;
                } else loadMoreSection.remove();
              }
            }, 1500);
          }
        }
      }
    });
    const rect = anchorEl.getBoundingClientRect();
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const offsetLeft = 7 * rootFontSize;
    let left = rect.left + rect.width / 2 - offsetLeft;
    const popoverWidth = popover.el.offsetWidth;
    if (left + popoverWidth > window.innerWidth - 12) left = window.innerWidth - 12 - popoverWidth;
    if (left < 12) left = 12;
    popover.el.style.left = `${left}px`;
    popover.el.style.top = `${rect.bottom + 8}px`;
  }
  showSongMenu(songId, event) {
    const state = this.ui && this.ui.state;
    const song = state && typeof state.getSongById === "function" && state.getSongById(songId);
    if (!song) return null;
    const isFav = this.ui && this.ui.favorites && typeof this.ui.favorites.isSongFavorite === "function" && this.ui.favorites.isSongFavorite(songId);
    const isCached = window.offlineCache && typeof window.offlineCache.isCached === "function" && window.offlineCache.isCached(song);
    const dataAttr = (data) => {
      if (!data) return "";
      return Object.entries(data).map(([k, v]) => `data-${k}="${PopupsManager._escAttr(v)}"`).join(" ");
    };
    return this.dropdown({
      triggerEvent: event,
      header: { title: song.title, subtitle: song.artist || "" },
      groups: [
        [
          { action: "add-fav", label: isFav ? "Remove from Favorites" : "Add to Favorites", iconHTML: PopupsManager.icons.heart(16, isFav), style: isFav ? "color:rgb(var(--colorPink))" : "" },
          { action: "add-playlist", label: "Add to Playlist", iconHTML: PopupsManager.icons.playlistAdd(16) }
        ],
        [
          { action: "copy-link", label: "Copy link", iconHTML: PopupsManager.icons.link(16) },
          { action: "offline-toggle", label: isCached ? "Remove offline copy" : "Cache for offline", iconHTML: PopupsManager.icons.checkBadge(16) }
        ],
        [
          { action: "view-artist", label: "View Artist", iconHTML: PopupsManager.icons.user(16), data: { artistId: song.artistId } },
          { action: "view-album", label: "View Album", iconHTML: PopupsManager.icons.album(16), data: { artistId: song.artistId, albumId: song.albumId } }
        ]
      ],
      itemExtraData: dataAttr,
      onAction: (action, item) => {
        if (action === "add-fav" && this.ui && this.ui.favorites) this.ui.favorites.toggleSong(song);
        else if (action === "add-playlist") {
          if (window.favoritesPlaylists && typeof window.favoritesPlaylists.addToPlaylistModal === "function") window.favoritesPlaylists.addToPlaylistModal(song);
        } else if (action === "view-artist") {
          if (this.ui && typeof this.ui.navigate === "function") this.ui.navigate("artist", song.artistId);
        } else if (action === "view-album") {
          if (this.ui && typeof this.ui.navigate === "function") this.ui.navigate("artist", song.artistId, song.albumId);
        } else if (action === "copy-link") {
          const url = `${window.location.origin}/artist/${song.artistId}/album/${song.albumId}?song=${song.id}`;
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => this.toast({ message: "Link copied to clipboard" }));
        } else if (action === "offline-toggle") {
          if (!window.offlineCache) return;
          if (window.offlineCache.isCached && window.offlineCache.isCached(song)) {
            if (window.offlineCache.removeSong) window.offlineCache.removeSong(song);
          } else if (window.offlineCache.cacheSong) window.offlineCache.cacheSong(song);
        }
      }
    });
  }
  showArtistPopover(artistId, event) {
    const state = this.ui && this.ui.state;
    const artist = state && typeof state.getArtistById === "function" && state.getArtistById(artistId);
    if (!artist) return null;
    const albums = artist.albums && artist.albums.length ? artist.albums.length : 0;
    const listeners = artist.monthlyListeners || "24.5K";
    const topPlays = artist.topSong && artist.topSong.plays ? artist.topSong.plays : "12.3K";
    const content = `
      <div class="popover-gradient-border"></div>
      <div class="popover-content">
        <div class="popover-header">
          <div class="popover-avatar-wrapper">
            <img src="${PopupsManager._escAttr(artist.imageUrl)}" class="popover-avatar" alt="${PopupsManager._escAttr(artist.artist)}">
            <div class="popover-avatar-glow"></div>
          </div>
          <div class="popover-title-section">
            <h3 class="popover-artist-name">${PopupsManager._esc(artist.artist)}</h3>
            <span class="popover-genre-badge">${PopupsManager._esc(artist.genre || "Artist")}</span>
          </div>
        </div>
        <div class="popover-stats">
          <div class="popover-stat"><span class="popover-stat-value">${albums}</span><span class="popover-stat-label">Albums</span></div>
          <div class="popover-stat-divider"></div>
          <div class="popover-stat"><span class="popover-stat-value">${listeners}</span><span class="popover-stat-label">Listeners</span></div>
          <div class="popover-stat-divider"></div>
          <div class="popover-stat"><span class="popover-stat-value">${topPlays}</span><span class="popover-stat-label">Plays</span></div>
        </div>
        <div class="popups-popover-actions">
          <button class="popups-action-btn popups-action-primary" data-action="go-artist">${PopupsManager.icons.eye(18)}<span>View Profile</span></button>
          <button class="popups-action-btn popups-action-secondary" data-action="play-top">${PopupsManager.icons.play(18)}<span>Play Top Hit</span></button>
        </div>
        <div class="popover-footer">
          <div class="popover-waveform"><span></span><span></span><span></span><span></span><span></span></div>
          <span class="popover-tip">Click outside to close</span>
        </div>
      </div>
    `;
    return this.popover({
      triggerEvent: event,
      variant: "artist",
      size: "artist",
      content,
      onAction: (action) => {
        if (navigator.vibrate && typeof navigator.vibrate === "function") navigator.vibrate(20);
        if (action === "go-artist") {
          if (this.ui && typeof this.ui.navigate === "function") this.ui.navigate("artist", artistId);
        } else if (action === "play-top") {
          if (artist.albums && artist.albums.length) {
            const queue = Utils.albumQueue(state, artist.id, artist.albums[0].id);
            if (queue && queue.length && this.ui && this.ui.audioPlayer) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
          }
        }
      }
    });
  }
}

class PopupsBase {
  constructor(manager, options = {}) {
    this.manager = manager;
    this.options = options;
    this.type = "base";
    this.closable = true;
    this.el = null;
    this.isOpen = false;
    this.destroyed = false;
  }
  render() { return document.createElement("div"); }
  show() {
    if (this.destroyed) return;
    this.el = this.render();
    if (!this.el) return;
    this.manager.container.appendChild(this.el);
    this.attachEvents();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => this.el.classList.add("popups-open"));
  }
  hide() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    if (this.options.onClose && typeof this.options.onClose === "function") {
      try { this.options.onClose(this); } catch (e) { console.error(e); }
    }
    if (this.el) this.el.classList.remove("popups-open");
    setTimeout(() => this.destroy(), 220);
  }
  destroy() {
    if (this.destroyed) return;
    this.beforeDestroy && this.beforeDestroy();
    this.detachEvents && this.detachEvents();
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    this.destroyed = true;
    this.manager.unregister(this);
    this.el = null;
  }
  attachEvents() {}
  detachEvents() {}
}

class PopupsModal extends PopupsBase {
  constructor(manager, options) { super(manager, options); this.type = "modal"; this.closable = options.closable !== false; }
  render() {
    const overlay = document.createElement("div");
    overlay.className = "popups-overlay";
    overlay.setAttribute("role", "presentation");
    const size = this.options.size || "md";
    const closable = this.closable;
    const actions = Array.isArray(this.options.actions) ? this.options.actions : [];
    const actionButtons = actions.map((a, idx) => {
      const action = a.action !== undefined ? a.action : String(idx);
      return `<button class="popups-btn popups-btn-${a.type || "secondary"}" data-action="${PopupsManager._escAttr(action)}" type="button">${PopupsManager._esc(a.label || "")}</button>`;
    }).join("");
    overlay.innerHTML = `
      <div class="popups-modal popups-size-${size} popups-surface" role="dialog" aria-modal="true">
        ${this.options.title ? `<div class="popups-modal-header"><h3 class="popups-modal-title">${PopupsManager._esc(this.options.title)}</h3>${closable ? `<button class="popups-close-btn" data-action="close" aria-label="Close">${PopupsManager.icons.close(18)}</button>` : ""}</div>` : closable ? `<button class="popups-close-btn popups-close-float" data-action="close" aria-label="Close">${PopupsManager.icons.close(18)}</button>` : ""}
        <div class="popups-modal-body"></div>
        ${actionButtons ? `<div class="popups-modal-footer">${actionButtons}</div>` : ""}
      </div>
    `;
    const body = overlay.querySelector(".popups-modal-body");
    const content = this.options.content;
    if (content instanceof HTMLElement) body.appendChild(content);
    else if (content != null) body.innerHTML = String(content);
    return overlay;
  }
  attachEvents() {
    this._backdropMouseDown = (e) => { if (e.target === this.el) { e.preventDefault(); this._bounce(); } };
    this._onClick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "close") { this.hide(); return; }
      if (this.options.onAction && typeof this.options.onAction === "function") this.options.onAction(action, this);
      if (this.options.autoClose !== false) this.hide();
    };
    this.el.addEventListener("mousedown", this._backdropMouseDown);
    this.el.addEventListener("click", this._onClick);
  }
  detachEvents() {
    if (this.el) {
      this.el.removeEventListener("mousedown", this._backdropMouseDown);
      this.el.removeEventListener("click", this._onClick);
    }
  }
  _bounce() {
    const inner = this.el && this.el.querySelector(".popups-modal, .popups-dialog");
    if (!inner) return;
    inner.classList.remove("popups-bounce");
    void inner.offsetWidth;
    inner.classList.add("popups-bounce");
    setTimeout(() => inner.classList.remove("popups-bounce"), 300);
  }
}

class PopupsDropdown extends PopupsBase {
  constructor(manager, options) { super(manager, options); this.type = "dropdown"; }
  render() {
    const el = document.createElement("div");
    el.className = "song menu";
    el.setAttribute("role", "menu");
    el.setAttribute("data-popup", "dropdown");
    const header = this.options.header;
    const groups = Array.isArray(this.options.groups) ? this.options.groups : [];
    const extras = this.options.itemExtraData || (() => "");
    const html = [];
    if (header) {
      html.push(`<div class="header"><span class="title">${PopupsManager._esc(header.title || "")}</span><span class="subtitle">${PopupsManager._esc(header.subtitle || "")}</span></div><div class="divider"></div>`);
    }
    let groupIndex = 0;
    groups.forEach((group) => {
      if (!Array.isArray(group) || group.length === 0) return;
      if (groupIndex > 0) html.push('<div class="divider"></div>');
      groupIndex += 1;
      html.push('<div class="group">');
      group.forEach((item) => {
        const extra = typeof extras === "function" ? extras(item.data) : extras;
        html.push(`
          <button class="option" data-action="${PopupsManager._escAttr(item.action)}" ${item.style ? `style="${PopupsManager._escAttr(item.style)}"` : ""} ${extra} type="button">
            ${item.iconHTML ? `<span class="icon">${item.iconHTML}</span>` : ""}
            <span class="label">${PopupsManager._esc(item.label || item.action)}</span>
          </button>
        `);
      });
      html.push("</div>");
    });
    el.innerHTML = html.join("");
    return el;
  }
  show() {
    super.show();
    const e = this.options.triggerEvent;
    if (e && typeof e.clientX === "number") this.positionAt(e.clientX, e.clientY);
    else if (this.options.rect) this.positionAtRect(this.options.rect);
  }
  positionAt(x, y) {
    const pad = 12;
    this.el.style.setProperty("--popups-x", `${x}px`);
    this.el.style.setProperty("--popups-y", `${y}px`);
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    requestAnimationFrame(() => {
      const rect = this.el.getBoundingClientRect();
      let left = x, top = y;
      if (rect.right > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
      if (left < pad) left = pad;
      if (rect.bottom > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
      if (top < pad) top = pad;
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    });
  }
  positionAtRect(rect) { this.positionAt(rect.left, rect.bottom + 6); }
  attachEvents() {
    this._itemClick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      e.stopPropagation();
      const action = btn.dataset.action;
      const item = this._findItem(action);
      if (this.options.onAction && typeof this.options.onAction === "function") this.options.onAction(action, item);
      else if (item && typeof item.onClick === "function") item.onClick(action, item);
      this.hide();
    };
    this.el.addEventListener("click", this._itemClick);
    setTimeout(() => {
      this._outsideClick = (e) => { if (!this.el.contains(e.target)) this.hide(); };
      document.addEventListener("click", this._outsideClick, { once: true });
    }, 0);
  }
  detachEvents() {
    if (this.el) this.el.removeEventListener("click", this._itemClick);
    if (this._outsideClick) { document.removeEventListener("click", this._outsideClick); this._outsideClick = null; }
  }
  _findItem(action) {
    const groups = Array.isArray(this.options.groups) ? this.options.groups : [];
    for (const group of groups) {
      if (!Array.isArray(group)) continue;
      for (const item of group) { if (String(item.action) === String(action)) return item; }
    }
    return null;
  }
}

class PopupsPopover extends PopupsBase {
  constructor(manager, options) { super(manager, options); this.type = "popover"; }
  render() {
    const el = document.createElement("div");
    const size = this.options.size || "md";
    el.className = `popups-popover popups-popover-${size} popups-surface animate-popoverReveal`;
    el.setAttribute("data-popover", this.options.variant || "generic");
    el.innerHTML = `<div class="popups-popover-inner">${this.options.content || ""}</div>`;
    return el;
  }
  show() {
    super.show();
    const e = this.options.triggerEvent;
    if (e && typeof e.clientX === "number") this.positionAt(e.clientX, e.clientY);
    else if (this.options.x != null && this.options.y != null) this.positionAt(this.options.x, this.options.y);
  }
  positionAt(x, y) {
    const pad = 20;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    requestAnimationFrame(() => {
      const rect = this.el.getBoundingClientRect();
      let left = x, top = y;
      if (rect.right > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
      if (left < pad) left = pad;
      if (rect.bottom > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
      if (top < pad) top = pad;
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    });
  }
  attachEvents() {
    this._onClick = (e) => {
      e.stopPropagation();
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (this.options.onAction && typeof this.options.onAction === 'function') this.options.onAction(action, btn.dataset, this);
      if (!this.options.persistentActions || !this.options.persistentActions.includes(action)) this.hide();
    };
    this.el.addEventListener('click', this._onClick);
    setTimeout(() => {
      this._outsideClick = (e) => { if (!this.el.contains(e.target)) this.hide(); };
      window.addEventListener('click', this._outsideClick, { once: true });
    }, 10);
  }
  detachEvents() {
    if (this.el) this.el.removeEventListener('click', this._onClick);
    if (this._outsideClick) { window.removeEventListener('click', this._outsideClick); this._outsideClick = null; }
  }
  hide() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    if (this.options.onClose && typeof this.options.onClose === "function") {
      try { this.options.onClose(this); } catch (e) { console.error(e); }
    }
    if (this.el) this.el.style.animation = "popoverFadeOut 0.2s ease forwards";
    setTimeout(() => this.destroy(), 200);
  }
}

class PopupsTooltip extends PopupsBase {
  constructor(manager, options) { super(manager, options); this.type = "tooltip"; this.target = options.target; this.text = options.text || ""; }
  render() {
    const el = document.createElement("div");
    el.className = "popups-tooltip";
    el.textContent = this.text;
    return el;
  }
  show() {
    if (this.destroyed || !this.target || !this.target.isConnected) return;
    document.body.appendChild(this.el);
    this.position();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => this.el.classList.add("popups-open"));
  }
  position() {
    if (!this.target || !this.el) return;
    const rect = this.target.getBoundingClientRect();
    const tipRect = this.el.getBoundingClientRect();
    const pad = 8;
    let top = rect.top - tipRect.height - 6;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    if (top < pad) top = rect.bottom + 6;
    if (left < pad) left = pad;
    if (left + tipRect.width > window.innerWidth - pad) left = window.innerWidth - tipRect.width - pad;
    this.el.style.top = `${top}px`;
    this.el.style.left = `${left}px`;
  }
  hide() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    if (this.el) this.el.classList.remove("popups-open");
    setTimeout(() => this.destroy(), 160);
  }
}

class PopupsToast extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "toast";
    this.duration = Number(options.duration) || 5000;
    this.remaining = this.duration;
    this.paused = false;
    this.dragStartX = 0;
    this.dragging = false;
  }
  render() {
    const type = ["info", "success", "warning", "error"].includes(this.options.type) ? this.options.type : "info";
    const iconMap = { info: "info", success: "success", warning: "warning", error: "error" };
    const el = document.createElement("div");
    el.className = `popups-toast popups-toast-${type}`;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    const hasUndo = this.options.onUndo && typeof this.options.onUndo === "function";
    el.innerHTML = `
      <div class="popups-toast-progress"><div class="popups-toast-progress-fill"></div></div>
      <button class="popups-toast-close" aria-label="Close">${PopupsManager.icons.close(14)}</button>
      <div class="popups-toast-icon">${PopupsManager.icons[iconMap[type]](18)}</div>
      <div class="popups-toast-body">
        ${this.options.title ? `<div class="popups-toast-title">${PopupsManager._esc(this.options.title)}</div>` : ""}
        ${this.options.message ? `<div class="popups-toast-message">${PopupsManager._esc(this.options.message)}</div>` : ""}
      </div>
      ${hasUndo ? `<button class="popups-toast-undo" aria-label="Undo">${PopupsManager.icons.undo(14)}<span>Undo</span></button>` : ""}
    `;
    this._fill = el.querySelector(".popups-toast-progress-fill");
    return el;
  }
  show() {
    if (this.destroyed) return;
    this.el = this.render();
    const container = this.manager._ensureToastContainer();
    container.insertBefore(this.el, container.firstChild);
    this.manager._updateToastStack();
    this.attachEvents();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => this.el.classList.add("popups-open"));
    this._lastTick = performance.now();
    this._tick();
  }
  hide(direction = null) {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    cancelAnimationFrame(this._raf);
    if (direction === "left") this.el.classList.add("popups-toast-out-left");
    else if (direction === "right") this.el.classList.add("popups-toast-out-right");
    else this.el.classList.add("popups-toast-fade-out");
    if (this.options.onClose && typeof this.options.onClose === "function") {
      setTimeout(() => { try { this.options.onClose(this); } catch (e) { console.error(e); } }, 250);
    }
    setTimeout(() => { this.destroy(); this.manager._updateToastStack(); }, 350);
  }
  attachEvents() {
    const closeBtn = this.el.querySelector(".popups-toast-close");
    const undoBtn = this.el.querySelector(".popups-toast-undo");
    this._onClose = () => this.hide();
    closeBtn && closeBtn.addEventListener("click", this._onClose);
    if (undoBtn) {
      this._onUndo = (e) => { e.stopPropagation(); if (this.options.onUndo) this.options.onUndo(this); this.hide(); };
      undoBtn.addEventListener("click", this._onUndo);
    }
    this._onEnter = () => { this.paused = true; };
    this._onLeave = () => { this.paused = false; this._lastTick = performance.now(); };
    this.el.addEventListener("mouseenter", this._onEnter);
    this.el.addEventListener("mouseleave", this._onLeave);
    this._onPointerDown = (e) => {
      if (e.target.closest(".popups-toast-close, .popups-toast-undo")) return;
      this.dragging = true;
      this.dragStartX = e.clientX;
      this.el.classList.add("popups-toast-dragging");
      this.el.style.transition = "none";
      if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    };
    this._onPointerMove = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.dragStartX;
      const scale = this._getStackScale();
      this.el.style.transform = `translate3d(${dx}px, 0, 0) scale(${scale})`;
    };
    this._onPointerUp = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      const dx = e.clientX - this.dragStartX;
      this.el.classList.remove("popups-toast-dragging");
      this.el.style.transition = "";
      this.el.style.transform = "";
      if (dx > 100) { this.el.classList.add("popups-toast-out-right"); setTimeout(() => this.destroy(), 350); }
      else if (dx < -100) { this.el.classList.add("popups-toast-out-left"); setTimeout(() => this.destroy(), 350); }
    };
    this.el.addEventListener("pointerdown", this._onPointerDown);
    this.el.addEventListener("pointermove", this._onPointerMove);
    this.el.addEventListener("pointerup", this._onPointerUp);
    this.el.addEventListener("pointercancel", this._onPointerUp);
  }
  detachEvents() {
    if (!this.el) return;
    const closeBtn = this.el.querySelector(".popups-toast-close");
    const undoBtn = this.el.querySelector(".popups-toast-undo");
    closeBtn && closeBtn.removeEventListener("click", this._onClose);
    undoBtn && undoBtn.removeEventListener("click", this._onUndo);
    this.el.removeEventListener("mouseenter", this._onEnter);
    this.el.removeEventListener("mouseleave", this._onLeave);
    this.el.removeEventListener("pointerdown", this._onPointerDown);
    this.el.removeEventListener("pointermove", this._onPointerMove);
    this.el.removeEventListener("pointerup", this._onPointerUp);
    this.el.removeEventListener("pointercancel", this._onPointerUp);
  }
  _getStackScale() {
    const idx = Number(this.el.getAttribute("data-stack-idx")) || 0;
    if (idx === 0) return 1;
    if (idx === 1) return 0.96;
    if (idx === 2) return 0.92;
    return 0.88;
  }
  _tick() {
    if (this.destroyed || !this.isOpen) return;
    const now = performance.now();
    if (!this.paused) {
      const dt = now - this._lastTick;
      this.remaining -= dt;
      const pct = Math.max(0, (this.remaining / this.duration) * 100);
      if (this._fill) this._fill.style.width = `${pct}%`;
      if (this.remaining <= 0) { this.hide(); return; }
    }
    this._lastTick = now;
    this._raf = requestAnimationFrame(() => this._tick());
  }
}

class HeartStore {
  constructor(favoritesPlaylists, state) {
    this.fav = favoritesPlaylists;
    this.state = state;
    this._localOverrides = new Map();
  }
  _key(type, id) { return `${type}:${id}`; }
  is(type, id) {
    const override = this._localOverrides.get(this._key(type, id));
    if (override !== undefined) return override;
    const f = this.fav;
    switch (type) {
      case "song": return f.isSong(id);
      case "artist": return f.isArtist(id);
      case "album": return f.isAlbum(id);
      case "playlist": return typeof f.isPlaylist === "function" ? f.isPlaylist(id) : false;
      default: return false;
    }
  }
  setOverride(type, id, value) { this._localOverrides.set(this._key(type, id), value); }
  clearOverride(type, id) { this._localOverrides.delete(this._key(type, id)); }
  async set(type, id, value) {
    if (this.is(type, id) === value) return;
    this.clearOverride(type, id);
    const f = this.fav;
    switch (type) {
      case "song": { const song = this.state.getSongById(id); if (song) await Promise.resolve(f.toggleSong(song)); break; }
      case "artist": await Promise.resolve(f.toggleArtist(id)); break;
      case "album": await Promise.resolve(f.toggleAlbum(id)); break;
      case "playlist": if (typeof f.togglePlaylist === "function") await Promise.resolve(f.togglePlaylist(id)); break;
    }
  }
}

class HeartButton {
  constructor(el, type, id, manager) {
    this.el = el;
    this.type = type;
    this.id = String(id);
    this.manager = manager;
    this.isHovering = false;
    this.phase = null;
    this._timer = null;
    this._onEnter = () => { this.isHovering = true; this.render(); };
    this._onLeave = () => { this.isHovering = false; this.render(); };
    this._onClick = (e) => this._handleClick(e);
    el.addEventListener("mouseenter", this._onEnter);
    el.addEventListener("mouseleave", this._onLeave);
    el.addEventListener("click", this._onClick);
    el.classList.add("heart-bound");
    this.render();
  }
  get liked() { return this.manager.store.is(this.type, this.id); }
  _icon() {
    if (this.phase === "error") return PopupsManager.icons.heart(20, true);
    if (this.phase === "confirm") return PopupsManager.icons.heart(20, true);
    if (this.liked) return this.isHovering ? PopupsManager.icons.heart(20, true) : PopupsManager.icons.heart(18, true);
    return this.isHovering ? PopupsManager.icons.heart(20, false) : PopupsManager.icons.heart(18, false);
  }
  render() {
    if (!this.el.isConnected) { this.destroy(); return; }
    this.el.innerHTML = this._icon();
    const liked = this.liked;
    this.el.classList.toggle("favorited", liked);
    this.el.classList.toggle("is-favorite", liked);
    this.el.classList.toggle("heart-busy", this.phase !== null);
    this.el.setAttribute("aria-pressed", String(liked));
    this.el.setAttribute("title", liked ? "Remove from favorites" : "Add to favorites");
  }
  async _handleClick(e) {
    e.stopPropagation();
    e.preventDefault();
    if (this.phase === "confirm" || this.phase === "error") return;
    const wasLiked = this.liked;
    try {
      if (wasLiked) {
        await this.manager.store.set(this.type, this.id, false);
        this.phase = null;
        this.render();
      } else {
        this.phase = "confirm";
        this.render();
        await this.manager.store.set(this.type, this.id, true);
        clearTimeout(this._timer);
        this._timer = setTimeout(() => { this.phase = null; this.render(); }, 3000);
      }
    } catch (err) {
      this.manager.store.setOverride(this.type, this.id, wasLiked);
      this.phase = "error";
      this.render();
      clearTimeout(this._timer);
      this._timer = setTimeout(() => { this.phase = null; this.render(); }, 4000);
    }
  }
  sync() { if (this.phase === "confirm" || this.phase === "error") return; this.render(); }
  destroy() {
    clearTimeout(this._timer);
    this._timer = null;
    this.el.removeEventListener("mouseenter", this._onEnter);
    this.el.removeEventListener("mouseleave", this._onLeave);
    this.el.removeEventListener("click", this._onClick);
    this.el.classList.remove("heart-bound");
    this.manager._instances.delete(this.el);
  }
}

class HeartButtonManager {
  constructor(favoritesPlaylists, state) {
    this.store = new HeartStore(favoritesPlaylists, state);
    this._instances = new Map();
    window.addEventListener("mybeats:favorites-changed", (e) => {
      const { type, id } = e.detail || {};
      if (type && id != null) this._syncEntity(type, String(id));
      else this._syncAll();
    });
    this._observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) this.bindAll(node);
        }
      }
    });
    const startObserving = () => this._observer.observe(document.body, { childList: true, subtree: true });
    if (document.body) startObserving();
    else document.addEventListener("DOMContentLoaded", startObserving, { once: true });
  }
  static describe(el) {
    const d = el.dataset || {};
    if (d.heartType && d.heartId) return { type: d.heartType, id: d.heartId };
    if (d.favSong) return { type: "song", id: d.favSong };
    if (d.artistHeart) return { type: "artist", id: d.artistHeart };
    if (d.heartPlaylist) return { type: "playlist", id: d.heartPlaylist };
    if (d.action === "toggle-favorite-album" && d.albumId) return { type: "album", id: d.albumId };
    return null;
  }
  static get SELECTOR() {
    return [
      "[data-heart-type][data-heart-id]",
      "[data-fav-song]",
      "[data-artist-heart]",
      "[data-heart-playlist]",
      '[data-action="toggle-favorite-album"][data-album-id]'
    ].join(",");
  }
  bindAll(root = document) {
    if (root instanceof HTMLElement && root.matches?.(HeartButtonManager.SELECTOR)) this._bindOne(root);
    const els = root.querySelectorAll ? root.querySelectorAll(HeartButtonManager.SELECTOR) : [];
    els.forEach((el) => this._bindOne(el));
  }
  _bindOne(el) {
    const info = HeartButtonManager.describe(el);
    if (!info || info.id == null || info.id === "") return;
    const existing = this._instances.get(el);
    if (existing) {
      if (existing.type === info.type && existing.id === String(info.id)) { existing.sync(); return; }
      existing.destroy();
    }
    this._instances.set(el, new HeartButton(el, info.type, info.id, this));
  }
  _syncEntity(type, id) { for (const hb of this._instances.values()) { if (hb.type === type && hb.id === id) hb.sync(); } }
  _syncAll() { for (const hb of this._instances.values()) hb.sync(); }
  async toggle(type, id) {
    const sid = String(id);
    const next = !this.store.is(type, sid);
    await this.store.set(type, sid, next);
  }
  notify(type, id) {
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", { detail: { type: type, id: String(id) } }));
  }
  prune() { for (const hb of [...this._instances.values()]) { if (!hb.el.isConnected) hb.destroy(); } }
  destroy() {
    this._observer.disconnect();
    for (const hb of [...this._instances.values()]) hb.destroy();
    this._instances.clear();
  }
  async set(type, id, value) { await this.store.set(type, id, value); this.notify(type, id); }
}

class FavoritesPlaylistsManager {
  constructor(state) { this.state = state; }
  get popups() { return window.popups || null; }
  get ui() { return window.uiManager || null; }
  _toast(options) {
    const popups = this.popups;
    if (!popups) return;
    popups.toast({ type: options.type || "info", message: options.message, duration: 6000, onUndo: options.onUndo });
  }
  isSong(id) { return this.state.favoriteSongs.some(sid => String(sid) === String(id)); }
  toggleSong(song) {
    const id = String(song.id);
    const idx = this.state.favoriteSongs.findIndex(sid => String(sid) === id);
    if (idx >= 0) {
      this.state.favoriteSongs.splice(idx, 1);
      this._toast({
        message: `Removed "${song.title}" from favorites`,
        onUndo: () => {
          if (!this.isSong(id)) {
            this.state.favoriteSongs.push(id);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        }
      });
    } else {
      this.state.favoriteSongs.push(id);
      this._toast({
        message: `Added "${song.title}" to favorites`,
        onUndo: () => {
          const i = this.state.favoriteSongs.findIndex(sid => String(sid) === id);
          if (i >= 0) {
            this.state.favoriteSongs.splice(i, 1);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        }
      });
    }
    this.state.persist();
    if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", { detail: { type: "song", id: id } }));
  }
  isArtist(id) { return this.state.favoriteArtists.some(aid => String(aid) === String(id)); }
  toggleArtist(id) {
    const sid = String(id);
    const idx = this.state.favoriteArtists.findIndex(aid => String(aid) === sid);
    const artist = this.state.getArtistById(id);
    const name = artist?.artist || "Artist";
    if (idx >= 0) {
      this.state.favoriteArtists.splice(idx, 1);
      this._toast({
        message: `Removed ${name} from favorite artists`,
        onUndo: () => { if (!this.isArtist(id)) { this.state.favoriteArtists.push(sid); this.state.persist(); this.ui?.render(); } }
      });
    } else {
      this.state.favoriteArtists.push(sid);
      this._toast({
        message: `Added ${name} to favorite artists`,
        onUndo: () => {
          const i = this.state.favoriteArtists.findIndex(aid => String(aid) === sid);
          if (i >= 0) { this.state.favoriteArtists.splice(i, 1); this.state.persist(); this.ui?.render(); }
        }
      });
    }
    this.state.persist();
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", { detail: { type: "artist", id: sid } }));
    this.ui?.render();
  }
  isAlbum(id) { return this.state.favoriteAlbums.some(aid => String(aid) === String(id)); }
  toggleAlbum(id) {
    const sid = String(id);
    const idx = this.state.favoriteAlbums.findIndex(aid => String(aid) === sid);
    const album = this.state.getAlbumById(id);
    const name = album?.album || "Album";
    if (idx >= 0) {
      this.state.favoriteAlbums.splice(idx, 1);
      this._toast({
        message: `Removed ${name} from favorite albums`,
        onUndo: () => {
          if (!this.isAlbum(id)) {
            this.state.favoriteAlbums.push(sid);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        }
      });
    } else {
      this.state.favoriteAlbums.push(sid);
      this._toast({
        message: `Added ${name} to favorite albums`,
        onUndo: () => {
          const i = this.state.favoriteAlbums.findIndex(aid => String(aid) === sid);
          if (i >= 0) {
            this.state.favoriteAlbums.splice(i, 1);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        }
      });
    }
    this.state.persist();
    if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", { detail: { type: "album", id: sid } }));
  }
  isPlaylist(id) { return (this.state.favoritePlaylists || []).some(pid => String(pid) === String(id)); }
  togglePlaylist(id) {
    const pid = String(id);
    this.state.favoritePlaylists = this.state.favoritePlaylists || [];
    const idx = this.state.favoritePlaylists.findIndex(x => String(x) === pid);
    const pl = this.getPlaylist(pid);
    const name = pl?.name || "Playlist";
    if (idx >= 0) {
      this.state.favoritePlaylists.splice(idx, 1);
      this._toast({
        message: `Removed ${name} from favorites`,
        onUndo: () => { if (!this.isPlaylist(pid)) { this.state.favoritePlaylists.push(pid); this.state.persist(); this.ui?.render(); } }
      });
    } else {
      this.state.favoritePlaylists.push(pid);
      this._toast({
        message: `Added ${name} to favorites`,
        onUndo: () => {
          const i = this.state.favoritePlaylists.findIndex(x => String(x) === pid);
          if (i >= 0) { this.state.favoritePlaylists.splice(i, 1); this.state.persist(); this.ui?.render(); }
        }
      });
    }
    this.state.persist();
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", { detail: { type: "playlist", id: pid } }));
  }
  getPlaylist(id) {
    const sid = String(id);
    return this.state.playlists.find(p => String(p.id) === sid);
  }
  createPlaylist({ name, description = "", tags = [] } = {}) {
    const playlist = { id: Utils.newId("pl"), name: name || "Unnamed Playlist", description, tags: Array.isArray(tags) ? tags : [], songs: [] };
    this.state.playlists.push(playlist);
    this.state.persist();
    return playlist;
  }
  renamePlaylist(id, newName) {
    const pl = this.getPlaylist(id);
    if (!pl || !newName.trim()) return false;
    pl.name = newName.trim();
    this.state.persist();
    return true;
  }
  updateDesc(id, description) {
    const pl = this.getPlaylist(id);
    if (!pl) return false;
    pl.description = description;
    this.state.persist();
    return true;
  }
  updateTags(id, tags) {
    const pl = this.getPlaylist(id);
    if (!pl) return false;
    pl.tags = Array.isArray(tags) ? tags : [];
    this.state.persist();
    return true;
  }
  deletePlaylist(id) {
    const pl = this.getPlaylist(id);
    if (!pl) return false;
    const name = pl.name;
    this.state.playlists = this.state.playlists.filter(p => String(p.id) !== String(id));
    this.state.persist();
    if (this.popups) this.popups.toast({ type: "success", message: `Playlist "${name}" deleted` });
    return true;
  }
  reorderSongs(id, newOrder) {
    const pl = this.getPlaylist(id);
    if (!pl || !Array.isArray(newOrder)) return false;
    pl.songs = newOrder.map(sid => String(sid));
    this.state.persist();
    return true;
  }
  removeSongFromPlaylist(playlistId, songId) {
    const pl = this.getPlaylist(playlistId);
    if (!pl) return false;
    const sid = String(songId);
    const before = [...pl.songs];
    const song = this.state.getSongById(sid);
    pl.songs = pl.songs.filter(id => String(id) !== sid);
    this.state.persist();
    if (song) {
      this._toast({
        message: `Removed "${song.title}" from ${pl.name}`,
        onUndo: () => {
          pl.songs = before;
          this.state.persist();
          if (this.ui?.state?.currentPage === "editPlaylist" && this.ui.state.editingPlaylistId === playlistId) this.ui.render();
        }
      });
    }
    return true;
  }
  addSongToPlaylist(playlistId, songId) {
    const pl = this.getPlaylist(playlistId);
    const sid = String(songId);
    if (!pl || pl.songs.some(id => String(id) === sid)) return false;
    const song = this.state.getSongById(sid);
    pl.songs.push(sid);
    this.state.persist();
    if (song) {
      this._toast({
        message: `Added "${song.title}" to ${pl.name}`,
        onUndo: () => { pl.songs = pl.songs.filter(id => String(id) !== sid); this.state.persist(); this.ui?.render(); }
      });
    }
    return true;
  }
  openModal() {
    const popups = this.popups;
    if (!popups) return;
    const content = document.createElement("div");
    content.className = "popups-playlist-list";
    content.innerHTML = this.state.playlists.length ? this.state.playlists.map(pl => `
      <div class="popups-playlist-row" data-action="view" data-id="${Utils.esc(pl.id)}">
        <div class="popups-playlist-cover">${this._coverPreview(pl, 40)}</div>
        <div class="popups-playlist-info">
          <p class="popups-playlist-name">${Utils.esc(pl.name)}</p>
          <p class="popups-playlist-meta">${pl.songs.length} songs</p>
        </div>
        <div class="popups-playlist-actions">
          <button class="popups-icon-btn" data-action="edit" data-id="${Utils.esc(pl.id)}" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="popups-icon-btn popups-danger" data-action="delete" data-id="${Utils.esc(pl.id)}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join("") : `<p class="popups-empty">No playlists yet.</p>`;
    const modal = popups.modal({
      title: "Your Playlists",
      size: "md",
      content,
      closable: true,
      actions: [{ label: "Create New Playlist", action: "create", type: "primary" }],
      onAction: action => { if (action === "create") this.createNewPlaylist(); }
    });
    content.addEventListener("click", e => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      e.stopPropagation();
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "view") {
        modal.hide();
        this.ui?.navigate("playlists");
        this.state.selectedPlaylistName = this.getPlaylist(id)?.name || null;
        this.ui?.render();
      } else if (action === "edit") { modal.hide(); this.editPlaylist(id); }
      else if (action === "delete") { modal.hide(); this._confirmDelete(id); }
    });
  }
  _coverPreview(pl, size = 40) {
    const state = this.state;
    const songs = pl.songs.map(sid => state.getSongById(sid)).filter(Boolean).slice(0, 4);
    if (!songs.length) return `<div class="popups-cover-empty" style="width:${size}px;height:${size}px">${this._playlistIcon(Math.round(size * .5))}</div>`;
    if (songs.length === 1) return `<img src="${songs[0].coverUrl}" width="${size}" height="${size}" class="popups-cover-img">`;
    return `
      <div class="popups-cover-mosaic" style="width:${size}px;height:${size}px">
        ${Array.from({ length: 4 }).map((_, i) => songs[i] ? `<img src="${songs[i].coverUrl}" class="popups-cover-quarter">` : `<div class="popups-cover-quarter popups-cover-quarter-empty"></div>`).join("")}
      </div>
    `;
  }
  _playlistIcon(size = 24) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l10 9-10 9-10-9 10-9z"/></svg>`; }
  _confirmDelete(id) {
    const pl = this.getPlaylist(id);
    if (!pl) return;
    this.popups.dialog({
      title: "Delete Playlist?",
      message: `Are you sure you want to delete "${pl.name}"? This cannot be undone.`,
      dangerous: true,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: () => {
        this.deletePlaylist(id);
        if (this.state.selectedPlaylistName === pl.name) {
          this.state.selectedPlaylistName = null;
          this.state.selectedPlaylistId = null;
        }
        this.ui?.render();
      }
    });
  }
  createNewPlaylist() {
    const popups = this.popups;
    if (!popups) return;
    const wrap = document.createElement("div");
    wrap.className = "popups-form";
    wrap.innerHTML = `
      <div class="popups-field">
        <label for="new-pl-name">Playlist name</label>
        <input type="text" id="new-pl-name" class="popups-input" placeholder="e.g. Late Night Drive" autocomplete="off" maxlength="80">
      </div>
      <div class="popups-field">
        <label for="new-pl-desc">Description <span>(optional)</span></label>
        <textarea id="new-pl-desc" class="popups-textarea" rows="2" placeholder="What's this playlist about?" maxlength="240"></textarea>
      </div>
      <div class="popups-field">
        <label>Tags <span>(optional, press Enter)</span></label>
        <div class="popups-tag-input-wrap"><input type="text" id="new-pl-tags" class="popups-input" placeholder="e.g. Chill, Workout, Focus" maxlength="20"></div>
        <div class="popups-tag-list" id="new-pl-tag-list"></div>
      </div>
    `;
    const tagInput = wrap.querySelector("#new-pl-tags");
    const tagList = wrap.querySelector("#new-pl-tag-list");
    const tags = [];
    const renderTags = () => {
      tagList.innerHTML = tags.map(t => `
        <span class="popups-tag-chip" data-tag="${Utils.esc(t)}">
          ${Utils.esc(t)}
          <button type="button" class="popups-tag-remove" data-tag="${Utils.esc(t)}">×</button>
        </span>
      `).join("");
    };
    tagInput.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const raw = tagInput.value.trim();
      if (!raw) return;
      const vals = raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      vals.forEach(v => { if (!tags.includes(v) && tags.length < 8) tags.push(v); });
      tagInput.value = "";
      renderTags();
    });
    tagList.addEventListener("click", e => {
      const btn = e.target.closest(".popups-tag-remove");
      if (!btn) return;
      const t = btn.dataset.tag;
      const i = tags.indexOf(t);
      if (i >= 0) tags.splice(i, 1);
      renderTags();
    });
    const nameInput = wrap.querySelector("#new-pl-name");
    const modal = popups.modal({
      title: "Create Playlist",
      size: "sm",
      content: wrap,
      closable: true,
      actions: [{ label: "Cancel", action: "cancel", type: "secondary" }, { label: "Create", action: "create", type: "primary" }],
      onAction: (action, popup) => {
        if (action !== "create") return;
        const name = nameInput.value.trim();
        if (!name) { popups.toast({ type: "warning", message: "Please enter a playlist name" }); return; }
        const description = wrap.querySelector("#new-pl-desc").value.trim();
        this.createPlaylist({ name, description, tags: [...tags] });
        popups.toast({ type: "success", message: `Playlist "${name}" created` });
        this.ui?.render();
        popup.hide();
      }
    });
    setTimeout(() => nameInput.focus(), 50);
  }
  editPlaylist(id) {
    if (!this.ui) return;
    this.state.editingPlaylistId = id;
    this.state.selectedPlaylistName = this.getPlaylist(id)?.name || null;
    this.ui.navigate("editPlaylist");
    history.pushState(null, "", `/playlist/${id}/edit`);
  }
  addToPlaylistModal(song) {
    const popups = this.popups;
    if (!popups) return;
    if (!this.state.playlists.length) {
      popups.modal({
        title: "Add to Playlist",
        size: "sm",
        content: `<p class="popups-empty">You don't have any playlists yet.</p>`,
        actions: [{ label: "Create Playlist", action: "create", type: "primary" }],
        onAction: action => { if (action === "create") this.createNewPlaylist(); }
      });
      return;
    }
    const content = document.createElement("div");
    content.className = "popups-add-to-playlist";
    const songHeader = song ? `
      <div class="popups-song-context">
        <img src="${song.coverUrl || Config.DEFAULT_COVER}" class="popups-song-context-thumb" alt="">
        <div class="popups-song-context-info">
          <p class="popups-song-context-title">${Utils.esc(song.title)}</p>
          <p class="popups-song-context-sub">${Utils.esc(song.artist || "")}</p>
        </div>
      </div>
    ` : "";
    const list = this.state.playlists.map(pl => `
      <button class="popups-playlist-row" data-action="add" data-id="${Utils.esc(pl.id)}">
        <div class="popups-playlist-cover">${this._coverPreview(pl, 44)}</div>
        <div class="popups-playlist-info">
          <p class="popups-playlist-name">${Utils.esc(pl.name)}</p>
          <p class="popups-playlist-meta">${pl.songs.length} songs</p>
        </div>
        ${pl.songs.some(sid => String(sid) === String(song?.id)) ? `<span class="popups-in-list-badge">In playlist</span>` : ""}
      </button>
    `).join("");
    content.innerHTML = songHeader + `<div class="popups-playlist-list">${list}</div>`;
    const modal = popups.modal({
      title: song ? `Add to Playlist` : "Select Playlist",
      size: "sm",
      content,
      closable: true,
      actions: [{ label: "Create New", action: "create", type: "secondary" }],
      onAction: action => { if (action === "create") { modal.hide(); this.createNewPlaylist(); } }
    });
    content.addEventListener("click", e => {
      const btn = e.target.closest('[data-action="add"]');
      if (!btn) return;
      e.stopPropagation();
      const plId = btn.dataset.id;
      const pl = this.getPlaylist(plId);
      if (!pl || !song) return;
      if (pl.songs.some(sid => String(sid) === String(song.id))) {
        popups.toast({ type: "warning", message: `"${song.title}" is already in ${pl.name}` });
        return;
      }
      this.addSongToPlaylist(plId, song.id);
      modal.hide();
    });
  }
}

/* ==================== 3. PLAYER ==================== */

const AUDIO_CDN_BASE = "https://pub-54216af4fb1549ff95a6cb5f8d63fe2d.r2.dev";

class PlayerState {
  constructor() {
    this.currentSong = null;
    this.queue = [];
    this.queueIndex = -1;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = Config.VOLUME.default;
    this.isMuted = false;
    this.playbackRate = 1;
    this.repeatMode = 'off';
    this.isShuffled = false;
    this.recentlyPlayed = [];
    this.isDrawerOpen = false;
    this.isQueueOpen = false;
    this.isLyricsOpen = false;
    this.sleepTimerEndsAt = null;
    this.sleepTimerId = null;
    this.sleepTimerTrackEnd = false;
    this.audioError = null;
    this.pendingDeepLinkSong = null;
    this.favoriteSongs = [];
    this.favoriteArtists = [];
    this.favoriteAlbums = [];
    this.favoritePlaylists = [];
    this.playlists = [];
    this.enrichedLibrary = [];
    this.favoritesTab = 'songs';
    this.selectedPlaylistName = null;
    this.selectedPlaylistId = null;
    this.isCreatingPlaylist = false;
    this.editingPlaylistId = null;
    this.artistId = null;
    this.selectedAlbumId = null;
    this.artistPageName = null;
    this.selectedAlbumName = null;
    this.currentPage = 'home';
    this.isSearchOpen = false;
    this.searchQuery = '';
    this.is404 = false;
    this._persist = null;
    this._playCounts = new Map();
    this._recentCache = [];
    this._originalQueue = null;
    this.lastVolume = 1;
  }
  getSongById(id) {
    const sid = String(id);
    for (const artist of this.enrichedLibrary) {
      for (const album of artist.albums) {
        const song = album.songs.find((s) => String(s.id) === sid);
        if (song) return { ...song, artistId: artist.id, albumId: album.id, artist: artist.artist, album: album.album, coverUrl: album.coverUrl };
      }
    }
    return null;
  }
  getArtistById(id) {
    const sid = String(id);
    return this.enrichedLibrary.find((a) => String(a.id) === sid || a.artist === sid) || null;
  }
  getAlbumById(id) {
    const sid = String(id);
    for (const artist of this.enrichedLibrary) {
      const album = artist.albums.find((a) => String(a.id) === sid);
      if (album) return { ...album, artistId: artist.id, artistName: artist.artist };
    }
    return null;
  }
  getAllSongs() {
    const songs = [];
    for (const artist of this.enrichedLibrary) {
      for (const album of artist.albums) {
        for (const song of album.songs) {
          songs.push({ ...song, artistId: artist.id, albumId: album.id, artist: artist.artist, album: album.album, coverUrl: album.coverUrl });
        }
      }
    }
    return songs;
  }
  buildPlaylistQueue(playlistId) {
    const pl = this.playlists.find((p) => String(p.id) === String(playlistId));
    if (!pl) return [];
    return pl.songs.map((id) => this.getSongById(id)).filter(Boolean);
  }
  getPlayCount(songId) { return this._playCounts.get(String(songId)) || 0; }
  getMostPlayed(limit = 10) {
    const entries = [...this._playCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    return entries.map(([id]) => this.getSongById(id)).filter(Boolean);
  }
  formatTime(seconds) { return Utils.fmtTime(seconds); }
  persist() { if (this._persist) this._persist.save(); }
  showToast(message, type = 'info', duration) { window.popups?.toast({ message, type, duration }); }
  modalOpen(content) { window.popups?.modal({ content, closable: true, autoClose: false }); }
  modalClose() { window.popups?.closeType('modal'); }
}

class AudioEngine {
  constructor(state) {
    this.state = state;
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.volume = state.volume;
    this.audio.playbackRate = state.playbackRate;
    this.mediaSessionManager = null;
    this._listeners = {};
    this._sourceCandidates = [];
    this._sourceIndex = 0;
    this._autoplayPending = false;
    if (!this.state._playCounts) this.state._playCounts = new Map();
    if (!this.state._originalQueue) this.state._originalQueue = null;
    this._init();
  }
  _init() {
    this.audio.addEventListener('loadstart', () => { this.state.duration = 0; this.state.currentTime = 0; });
    this.audio.addEventListener('play', () => { this.state.isPlaying = true; this._autoplayPending = false; this._emit('play'); });
    this.audio.addEventListener('pause', () => { this.state.isPlaying = false; this._emit('pause'); });
    this.audio.addEventListener('ended', () => { this._emit('ended'); this.handleEnded(); });
    this.audio.addEventListener('timeupdate', () => { this.state.currentTime = this.audio.currentTime; this._emit('timeupdate'); });
    this.audio.addEventListener('loadedmetadata', () => { this.state.duration = this.audio.duration; this._emit('loadedmetadata'); });
    this.audio.addEventListener('error', () => {
      if (this._sourceIndex < this._sourceCandidates.length - 1) {
        this._sourceIndex++;
        this.audio.src = this._sourceCandidates[this._sourceIndex];
        this.audio.load();
        if (this._autoplayPending) this.audio.play().catch(() => {});
        return;
      }
      this._autoplayPending = false;
      this.state.audioError = this.state.currentSong ? this.state.currentSong.id : null;
      this._emit('error');
    });
    this.audio.addEventListener('ratechange', () => { this.state.playbackRate = this.audio.playbackRate; this._emit('ratechange'); });
  }
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }
  off(event, cb) {
    if (this._listeners[event]) this._listeners[event] = this._listeners[event].filter((f) => f !== cb);
  }
  _emit(event, data) { (this._listeners[event] || []).forEach((cb) => cb(data)); }
  setMediaSessionManager(mgr) { this.mediaSessionManager = mgr; }
  playSong(song, queue = null, autoplay = true, source = null) {
    if (!song) return;
    if (queue && queue.length) {
      this.state.queue = queue;
      this.state.queueIndex = queue.findIndex((s) => String(s.id) === String(song.id));
      if (this.state.queueIndex === -1) this.state.queueIndex = 0;
    } else {
      this.state.queue = [song];
      this.state.queueIndex = 0;
    }
    this.state.currentSong = song;
    this.state.audioError = null;
    this.state.duration = 0;
    const songId = song.id;
    if (!songId) { console.error('Cannot build audio URL: song has no id.'); return; }
    this._sourceCandidates = [`${AUDIO_CDN_BASE}/${songId}.mp3`, `${AUDIO_CDN_BASE}/${songId}.webm`];
    this._sourceIndex = 0;
    this._autoplayPending = !!autoplay;
    this.audio.src = this._sourceCandidates[0];
    this.audio.load();
    if (autoplay) this.audio.play().catch((err) => console.warn('Playback failed:', err));
    this._updateRecentlyPlayed(song);
    this._updatePlayCount(song.id);
    const enriched = this.state.getSongById(song.id) || song;
    this.mediaSessionManager?.updateMetadata(enriched);
    this._emit('songchange', { song, source });
    if (this.state.isDrawerOpen) window.uiManager?.updateFullPlayer();
  }
  togglePlay() {
    if (!this.state.currentSong) return;
    if (this.audio.paused) this.audio.play().catch(() => {});
    else this.audio.pause();
  }
  skipForward() {
    if (!this.state.queue.length) return;
    let nextIndex = this.state.queueIndex + 1;
    if (nextIndex >= this.state.queue.length) {
      if (this.state.repeatMode === 'all') nextIndex = 0;
      else return;
    }
    this.state.queueIndex = nextIndex;
    this.playSong(this.state.queue[nextIndex]);
  }
  skipBack() {
    if (!this.state.queue.length) return;
    let prevIndex = this.state.queueIndex - 1;
    if (prevIndex < 0) {
      if (this.state.repeatMode === 'all') prevIndex = this.state.queue.length - 1;
      else prevIndex = 0;
    }
    this.state.queueIndex = prevIndex;
    this.playSong(this.state.queue[prevIndex]);
  }
  setVolume(vol) {
    this.state.volume = Utils.clamp(vol, 0, 1);
    this.audio.volume = this.state.volume;
    this.state.isMuted = this.state.volume === 0;
    this._emit('volumechange');
  }
  toggleMute() {
    if (!this.state.isMuted) {
      this.state.lastVolume = this.state.volume > 0 ? this.state.volume : this.state.lastVolume || 1;
      this.state.isMuted = true;
      this.audio.volume = 0;
    } else {
      this.state.isMuted = false;
      this.audio.volume = this.state.lastVolume || this.state.volume || 1;
      this.state.volume = this.audio.volume;
    }
    this._emit('volumechange');
  }
  toggleShuffle() {
    this.state.isShuffled = !this.state.isShuffled;
    if (this.state.isShuffled) {
      if (!this.state._originalQueue) this.state._originalQueue = [...this.state.queue];
      const current = this.state.queue[this.state.queueIndex];
      const rest = this.state.queue.filter((_, i) => i !== this.state.queueIndex);
      const shuffledRest = Utils.shuffle(rest);
      this.state.queue = [current, ...shuffledRest];
      this.state.queueIndex = 0;
    } else {
      if (this.state._originalQueue) {
        const currentSong = this.state.currentSong;
        this.state.queue = [...this.state._originalQueue];
        this.state.queueIndex = this.state.queue.findIndex((s) => s.id === currentSong?.id);
        this.state._originalQueue = null;
      }
    }
    this._emit('shufflechange');
  }
  cycleRepeat() {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(this.state.repeatMode);
    this.state.repeatMode = modes[(idx + 1) % modes.length];
    this._emit('repeatchange');
    this.audio.loop = this.state.repeatMode === 'one';
  }
  handleEnded() {
    if (this.state.repeatMode === 'one') { this.audio.currentTime = 0; this.audio.play().catch(() => {}); return; }
    if (this.state.queueIndex < this.state.queue.length - 1) this.skipForward();
    else if (this.state.repeatMode === 'all') { this.state.queueIndex = 0; this.playSong(this.state.queue[0]); }
    else { this.state.isPlaying = false; this._emit('queueend'); }
  }
  _updateRecentlyPlayed(song) {
    const id = song.id;
    const existing = this.state.recentlyPlayed.find((s) => String(s.id) === String(id));
    if (existing) this.state.recentlyPlayed.splice(this.state.recentlyPlayed.indexOf(existing), 1);
    this.state.recentlyPlayed.unshift(song);
    if (this.state.recentlyPlayed.length > Config.QUEUE.recentMax) this.state.recentlyPlayed.length = Config.QUEUE.recentMax;
    window.dispatchEvent(new CustomEvent('mybeats:recently-played', { detail: { song } }));
  }
  _updatePlayCount(songId) {
    const sid = String(songId);
    this.state._playCounts.set(sid, (this.state._playCounts.get(sid) || 0) + 1);
    window.dispatchEvent(new CustomEvent('mybeats:play-counts'));
  }
  restorePlaybackState(song, queue, time, wasPlaying) {
    this.state.currentSong = song;
    this.state.queue = queue;
    this.state.queueIndex = queue.findIndex((s) => String(s.id) === String(song.id));
    const songId = song.id;
    this._sourceCandidates = songId ? [`${AUDIO_CDN_BASE}/${songId}.mp3`, `${AUDIO_CDN_BASE}/${songId}.webm`] : [];
    this._sourceIndex = 0;
    this._autoplayPending = !!wasPlaying;
    this.audio.src = this._sourceCandidates[0] || '';
    this.audio.load();
    if (time) this.audio.currentTime = time;
    if (wasPlaying) this.audio.play().catch(() => {});
    const enriched = this.state.getSongById(song.id) || song;
    this.mediaSessionManager?.updateMetadata(enriched);
  }
  get currentTime() { return this.audio.currentTime; }
  set currentTime(val) { this.audio.currentTime = val; }
  get duration() { return this.audio.duration; }
  set duration(val) { this.state.duration = val; }
}

class MediaSessionManager {
  constructor(state, audioPlayer) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    this.audio = audioPlayer.audio;
    this._supported = typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof window.MediaMetadata === 'function';
    this._pendingMetadata = null;
    this._rafId = null;
    this._positionUpdateScheduled = false;
    this._onPlay = () => { this.updatePlaybackState(); this._reapplyMetadataIfMissing(); };
    this._onPause = () => this.updatePlaybackState();
    this._onEnded = () => this.updatePlaybackState();
    this._onTimeUpdate = () => this._schedulePositionUpdate();
    this._onLoadedMetadata = () => { this.updatePositionState(); this._reapplyMetadataIfMissing(); };
    this._onDurationChange = () => this.updatePositionState();
    this._onSeeked = () => this.updatePositionState();
    this._onRateChange = () => this.updatePositionState();
    if (!this._supported) { console.warn('[MediaSession] API not supported in this browser'); return; }
    this._setupActionHandlers();
    this._attachAudioListeners();
  }
  updateMetadata(songData) {
    if (!this._supported) return;
    if (!songData) { this.clearMetadata(); return; }
    const song = this._resolveSong(songData);
    const title = song.title || song.name || 'Unknown Title';
    const artist = song.artist || song.artistName || 'Unknown Artist';
    const album = song.album || song.albumName || '';
    const artwork = this._buildArtwork(song.coverUrl);
    this._pendingMetadata = { title, artist, album, artwork };
    try { navigator.mediaSession.metadata = new MediaMetadata(this._pendingMetadata); }
    catch (err) {
      console.warn('[MediaSession] Metadata with artwork failed:', err);
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album });
        this._pendingMetadata = { title, artist, album, artwork: [] };
      } catch (err2) { console.error('[MediaSession] Metadata failed entirely:', err2); return; }
    }
    this.updatePlaybackState();
    this.updatePositionState();
  }
  clearMetadata() {
    if (!this._supported) return;
    this._pendingMetadata = null;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    if ('setPositionState' in navigator.mediaSession) {
      try { navigator.mediaSession.setPositionState(); }
      catch (err) { console.warn('[MediaSession] clearMetadata setPositionState failed:', err); }
    }
  }
  updatePlaybackState() {
    if (!this._supported) return;
    navigator.mediaSession.playbackState = this.audio.paused ? 'paused' : 'playing';
  }
  updatePositionState() {
    if (!this._supported) return;
    if (!('setPositionState' in navigator.mediaSession)) return;
    const duration = this.audio.duration;
    const position = this.audio.currentTime;
    const rate = this.audio.playbackRate;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (!Number.isFinite(position) || position < 0) return;
    if (!Number.isFinite(rate) || rate <= 0) return;
    try { navigator.mediaSession.setPositionState({ duration, playbackRate: rate, position: Math.min(position, duration) }); }
    catch (err) { console.warn('[MediaSession] setPositionState failed:', err); }
  }
  destroy() {
    if (!this._supported) return;
    this.audio.removeEventListener('play', this._onPlay);
    this.audio.removeEventListener('pause', this._onPause);
    this.audio.removeEventListener('ended', this._onEnded);
    this.audio.removeEventListener('timeupdate', this._onTimeUpdate);
    this.audio.removeEventListener('loadedmetadata', this._onLoadedMetadata);
    this.audio.removeEventListener('durationchange', this._onDurationChange);
    this.audio.removeEventListener('seeked', this._onSeeked);
    this.audio.removeEventListener('ratechange', this._onRateChange);
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this.clearMetadata();
  }
  _resolveSong(song) {
    if (song.title && song.artist && song.coverUrl) return song;
    const enriched = this.state?.getSongById?.(song.id);
    return enriched ? { ...song, ...enriched } : song;
  }
  _reapplyMetadataIfMissing() {
    if (!this._supported || !this._pendingMetadata) return;
    if (navigator.mediaSession.metadata) return;
    try { navigator.mediaSession.metadata = new MediaMetadata(this._pendingMetadata); }
    catch (err) { console.warn('[MediaSession] Re-apply failed:', err); }
  }
  _buildArtwork(coverUrl) {
    if (!coverUrl) return [];
    let absoluteUrl;
    try { absoluteUrl = new URL(coverUrl, document.baseURI).href; }
    catch { console.warn('[MediaSession] Invalid coverUrl:', coverUrl); return []; }
    const protocol = new URL(absoluteUrl).protocol;
    if (protocol !== 'http:' && protocol !== 'https:') { console.warn('[MediaSession] Non-http(s) coverUrl skipped:', absoluteUrl); return []; }
    const type = this._detectMimeType(absoluteUrl);
    const sizes = ['96x96', '128x128', '192x192', '256x256', '384x384', '512x512'];
    return sizes.map((size) => { const entry = { src: absoluteUrl, sizes: size }; if (type) entry.type = type; return entry; });
  }
  _detectMimeType(url) {
    const path = url.split('?')[0].split('#')[0].toLowerCase();
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
    if (path.endsWith('.png')) return 'image/png';
    if (path.endsWith('.webp')) return 'image/webp';
    if (path.endsWith('.avif')) return 'image/avif';
    if (path.endsWith('.gif')) return 'image/gif';
    if (path.endsWith('.svg')) return 'image/svg+xml';
    return null;
  }
  _setupActionHandlers() {
    const ms = navigator.mediaSession;
    if (!ms) return;
    const safeHandler = (action, fn) => { try { ms.setActionHandler(action, fn); } catch { console.warn('[MediaSession] Action not supported:', action); } };
    const seekBy = (delta) => {
      const duration = this.audio.duration;
      if (!Number.isFinite(duration)) return;
      this.audio.currentTime = Math.min(duration, Math.max(0, this.audio.currentTime + delta));
    };
    safeHandler('play', () => this.audioPlayer.togglePlay?.());
    safeHandler('pause', () => this.audioPlayer.togglePlay?.());
    safeHandler('previoustrack', () => this.audioPlayer.skipBack?.());
    safeHandler('nexttrack', () => this.audioPlayer.skipForward?.());
    safeHandler('seekbackward', (d) => seekBy(-(d?.seekOffset ?? 10)));
    safeHandler('seekforward', (d) => seekBy(d?.seekOffset ?? 10));
    safeHandler('seekto', (d) => {
      if (d?.seekTime == null) return;
      const duration = this.audio.duration;
      if (!Number.isFinite(duration)) return;
      this.audio.currentTime = Math.min(duration, Math.max(0, d.seekTime));
    });
    safeHandler('stop', () => { this.audio.pause(); this.audio.currentTime = 0; this.state.isPlaying = false; this.clearMetadata(); });
  }
  _attachAudioListeners() {
    this.audio.addEventListener('play', this._onPlay);
    this.audio.addEventListener('pause', this._onPause);
    this.audio.addEventListener('ended', this._onEnded);
    this.audio.addEventListener('timeupdate', this._onTimeUpdate);
    this.audio.addEventListener('loadedmetadata', this._onLoadedMetadata);
    this.audio.addEventListener('durationchange', this._onDurationChange);
    this.audio.addEventListener('seeked', this._onSeeked);
    this.audio.addEventListener('ratechange', this._onRateChange);
  }
  _schedulePositionUpdate() {
    if (this._positionUpdateScheduled) return;
    this._positionUpdateScheduled = true;
    this._rafId = requestAnimationFrame(() => { this._positionUpdateScheduled = false; this._rafId = null; this.updatePositionState(); });
  }
}

class PlayerManager {
  constructor(ui) {
    this.ui = ui;
    this._coverBufferVisible = false;
    this._sleepBadgeTimer = null;
    this._dragQueueIdx = null;
    this._rafId = null;
    this._eventsBound = false;
  }
  bindAudioEvents() {
    if (this._eventsBound) return;
    const ap = this.ui.audioPlayer;
    if (!ap) return;
    this._eventsBound = true;
    ap.on("play", () => { this._setPlayingUI(true); this._startProgressLoop(); });
    ap.on("pause", () => { this._setPlayingUI(false); this._stopProgressLoop(); });
    ap.on("timeupdate", () => this.updateProgressOnly());
    ap.on("loadedmetadata", () => this.updateProgressOnly());
    ap.on("durationchange", () => this.updateProgressOnly());
    ap.on("songchange", () => {
      this.renderMiniPlayer();
      if (this.ui.state.isDrawerOpen) this.renderFullPlayer();
      this.updateProgressOnly();
    });
    ap.on("error", () => { this.applyPlaybackErrorState(); this.hideCoverBuffer(); });
    ap.on("volumechange", () => this.updateProgressOnly());
    this._setPlayingUI(!!this.ui.state.isPlaying);
    this.updateProgressOnly();
    if (this.ui.state.isPlaying) this._startProgressLoop();
  }
  _startProgressLoop() {
    if (this._rafId) return;
    const tick = () => { this.updateProgressOnly(); this._rafId = requestAnimationFrame(tick); };
    this._rafId = requestAnimationFrame(tick);
  }
  _stopProgressLoop() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this.updateProgressOnly();
  }
  _setPlayingUI(isPlaying) {
    const playSVG = Icons.player.play(22);
    const pauseSVG = Icons.player.pause(22);
    const miniBtn = document.getElementById("toggle-play-mini");
    if (miniBtn) miniBtn.innerHTML = isPlaying ? pauseSVG : playSVG;
    const drawerBtn = document.getElementById("play-pause-drawer");
    if (drawerBtn) {
      drawerBtn.classList.toggle("playing", isPlaying);
      drawerBtn.innerHTML = isPlaying ? Icons.player.pause(32) : Icons.player.play(32);
    }
  }
  updateProgressOnly() {
    const state = this.ui.state;
    const pct = state.duration ? (state.currentTime / state.duration) * 100 : 0;
    const pctStr = `${pct}%`;
    const cur = state.formatTime(state.currentTime);
    const total = state.formatTime(state.duration);
    const miniProgress = document.getElementById("mini-progress");
    if (miniProgress) miniProgress.style.width = pctStr;
    const progressFill = document.getElementById("progress-fill");
    if (progressFill) progressFill.style.width = pctStr;
    const curEl = document.getElementById("drawer-current-time");
    if (curEl) curEl.textContent = cur;
    const totalEl = document.getElementById("total-time");
    if (totalEl) totalEl.textContent = total;
  }
  showCoverBuffer() {
    this._coverBufferVisible = true;
    const cover = document.querySelector('#player-bar-container .mini-cover');
    if (!cover) return;
    if (cover.querySelector('.mini-cover-buffer')) return;
    const overlay = document.createElement('div');
    overlay.className = 'mini-cover-buffer';
    const circle = document.createElement('div');
    circle.className = 'spnr-circle';
    overlay.appendChild(circle);
    cover.appendChild(overlay);
  }
  hideCoverBuffer() {
    this._coverBufferVisible = false;
    document.querySelectorAll('#player-bar-container .mini-cover-buffer').forEach((el) => el.remove());
  }
  applyPlaybackErrorState() {
    const state = this.ui.state;
    const hasError = !!(state.audioError && state.currentSong && state.audioError === state.currentSong.id);
    if (hasError) this.hideCoverBuffer();
    const miniInner = document.querySelector('#player-bar-container .mini-player-inner');
    if (miniInner) miniInner.classList.toggle('audio-missing', hasError);
    ['toggle-play-mini','skip-forward-mini','play-pause-drawer','prev-btn','next-btn','shuffle-btn','like-btn'].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (hasError) btn.setAttribute('disabled', '');
      else if (state.currentSong) btn.removeAttribute('disabled');
    });
  }
  openDrawer() {
    this.ui.state.isDrawerOpen = true;
    document.getElementById('player-drawer-overlay').classList.add('open');
    this.renderFullPlayer();
  }
  closeDrawer() {
    this.ui.state.isDrawerOpen = false;
    this.ui.state.isQueueOpen = false;
    this.ui.state.isLyricsOpen = false;
    document.getElementById('player-drawer-overlay').classList.remove('open');
    const drawer = document.getElementById('full-player-drawer');
    if (drawer) { drawer.classList.remove('open'); setTimeout(() => drawer.remove(), 500); }
  }
  renderMiniPlayer() {
    this.bindAudioEvents();
    const container = document.getElementById('player-bar-container');
    const state = this.ui.state;
    const currentSong = state.currentSong;
    const progress = currentSong && state.duration ? (state.currentTime / state.duration) * 100 : 0;
    const pauseSVG = Icons.player.pause(22);
    const playSVG = Icons.player.play(22);
    const skipSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="20" height="20"><path opacity=".4" fill="currentColor" d="M0 72L0 440c0 14.7 8.1 28.2 21 35.2s28.7 6.3 41-1.8l258-169.6 0-95.7-258-169.6c-12.3-8.1-28-8.8-41-1.8S0 57.3 0 72z"/><path fill="currentColor" d="M352 32l0 0c17.7 0 32 14.3 32 32l0 384c0 17.7-14.3 32-32 32l0 0c-17.7 0-32-14.3-32-32l0-384c0-17.7 14.3-32 32-32z"/></svg>`;
    const defaultCover = Config.DEFAULT_COVER;
    const coverUrl = currentSong ? currentSong.coverUrl : defaultCover;
    const title = currentSong ? currentSong.title : 'MyBeats';
    const artistDisplay = currentSong ? this.ui.artistNameTooltip(currentSong.artistId) : 'Music';
    const isFav = currentSong ? this.ui.favorites.isSong(currentSong.id) : false;
    container.innerHTML = `
      <div data-player="mini" class="mini-player">
        <div class="mini-player-inner" id="open-drawer">
          <div class="track"><div class="mini-progress" id="mini-progress" style="width: ${progress}%;"></div></div>
          <div class="bar">
            <div class="mini-cover cover"><img src="${coverUrl}" class="mini-cover-img" onerror="this.style.display='none'"></div>
            <div class="info">
              <p class="title">${title}</p>
              <p class="sub">${artistDisplay}</p>
            </div>
            <div class="actions">
              <button id="fav-mini" class="${isFav ? 'favorited' : ''}" ${!currentSong ? 'disabled' : ''}>${currentSong ? this.ui.likeStatus('song', isFav, false, null) : '<i class="fa-solid fa-heart not-liked-icon"></i>'}</button>
              <button id="toggle-play-mini" class="toggle" ${!currentSong ? 'disabled' : ''}>${currentSong ? (state.isPlaying ? pauseSVG : playSVG) : playSVG}</button>
              <button id="skip-forward-mini" ${!currentSong ? 'disabled' : ''}>${skipSVG}</button>
            </div>
          </div>
        </div>
      </div>
    `;
    const openDrawerBtn = document.getElementById('open-drawer');
    if (openDrawerBtn) openDrawerBtn.onclick = () => this.ui.openPlayerDrawer();
    if (currentSong) {
      const favBtn = document.getElementById('fav-mini');
      if (favBtn) { favBtn.dataset.favSong = currentSong.id; window.heartManager?.bindAll(container); }
      const toggleBtn = document.getElementById('toggle-play-mini');
      if (toggleBtn) toggleBtn.onclick = (e) => { e.stopPropagation(); this.ui.audioPlayer.togglePlay(); };
      const skipBtn = document.getElementById('skip-forward-mini');
      if (skipBtn) skipBtn.onclick = (e) => { e.stopPropagation(); this.ui.audioPlayer.skipForward(); };
    }
    this.applyPlaybackErrorState();
    if (this._coverBufferVisible) this.showCoverBuffer();
  }
  renderFullPlayer() {
    const oldDrawer = document.getElementById('full-player-drawer');
    const state = this.ui.state;
    const song = state.currentSong;
    if (oldDrawer && song) {
      const oldImg = oldDrawer.querySelector('.album-art');
      if (oldImg) {
        const currentSrc = oldImg.getAttribute('src');
        if (currentSrc === song.coverUrl) { this.softUpdateDrawer(oldDrawer); this.attachFullPlayerEvents(); return; }
      }
    }
    document.getElementById('full-player-drawer')?.remove();
    const defaultCover = Config.DEFAULT_COVER;
    const title = song ? song.title : 'MyBeats';
    const artistDisplay = song ? this.ui.artistNameTooltip(song.artistId) : 'Music';
    const coverUrl = song ? song.coverUrl : defaultCover;
    const progress = song && state.duration ? (state.currentTime / state.duration) * 100 : 0;
    const isPlaying = song ? state.isPlaying : false;
    const isFav = song ? this.ui.favorites.isSong(song.id) : false;
    const disabledAttr = !song ? 'disabled style="opacity:0.5"' : '';
    const pauseSVG = Icons.player.pause(32);
    const playSVG = Icons.player.play(32);
    document.body.insertAdjacentHTML('beforeend', `
      <div data-player="full" class="player-drawer open" id="full-player-drawer">
        <div class="dot-pattern"></div>
        <div class="drawerUpper">
          <div class="drawer-header">
            <button class="header-btn" id="close-drawer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="header-btn" id="queue-toggle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
          <div class="album-art-wrapper" id="album-wrapper"><img src="${coverUrl}" alt="${title}" class="album-art"></div>
          <div class="meta">
            <h1 class="title">${title}</h1>
            <p class="sub">${artistDisplay}</p>
          </div>
          <canvas id="visualizer"></canvas>
        </div>
        <div class="control-panel">
          <div class="extra-controls">
            <button class="control-btn" id="share-btn" aria-label="Share" ${disabledAttr}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button class="speed-btn" id="speed-btn" ${disabledAttr}>${state.playbackRate}x</button>
            <button class="control-btn" id="sleep-btn" aria-label="Sleep Timer" ${disabledAttr}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </button>
          </div>
          <div class="progress-container" id="progress-container">
            <div class="progress-bar-bg"><div class="progress-bar-fill" id="progress-fill" style="width: ${progress}%; background: var(--playerAccent);"></div></div>
            <div class="time-display">
              <span id="drawer-current-time">${song ? state.formatTime(state.currentTime) : '0:00'}</span>
              <span id="total-time">${song ? state.formatTime(state.duration) : '0:00'}</span>
            </div>
          </div>
          <div class="controls">
            <button class="control-btn ${state.isShuffled ? 'active' : ''}" id="shuffle-btn" ${disabledAttr}>${Icons.player.shuffle(22)}</button>
            <button class="control-btn" id="prev-btn" ${disabledAttr}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="28"><path opacity=".4" fill="currentColor" d="M64 208.1l0 95.7 258 169.6c12.3 8.1 28 8.8 41 1.8s21-20.5 21-35.2l0-368c0-14.7-8.1-28.2-21-35.2s-28.7-6.3-41 1.8L64 208.1z"/><path fill="currentColor" d="M32 32l0 0C14.3 32 0 46.3 0 64L0 448c0 17.7 14.3 32 32 32l0 0c17.7 0 32-14.3 32-32L64 64c0-17.7-14.3-32-32-32z"/></svg>
            </button>
            <button class="play-btn ${isPlaying ? 'playing' : ''}" id="play-pause-drawer" ${disabledAttr}>${isPlaying ? pauseSVG : playSVG}</button>
            <button class="control-btn" id="next-btn" ${disabledAttr}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="28"><path opacity=".4" fill="currentColor" d="M0 72L0 440c0 14.7 8.1 28.2 21 35.2s28.7 6.3 41-1.8l258-169.6 0-95.7-258-169.6c-12.3-8.1-28-8.8-41-1.8S0 57.3 0 72z"/><path fill="currentColor" d="M352 32l0 0c17.7 0 32 14.3 32 32l0 384c0 17.7-14.3 32-32 32l0 0c-17.7 0-32-14.3-32-32l0-384c0-17.7 14.3-32 32-32z"/></svg>
            </button>
            <button class="control-btn ${isFav ? 'favorited' : ''}" id="like-btn" data-song-id="${song?.id || ''}" ${disabledAttr}>${song ? this.ui.likeStatus('song', isFav, false, null) : '<i class="fa-solid fa-heart not-liked-icon"></i>'}</button>
          </div>
        </div>
        <div class="queue-modal ${state.isQueueOpen ? 'open' : ''}" id="queue-modal">
          <div class="drag-handle"></div>
          <div class="queue-header">
            <h3 class="title">Up Next</h3>
            <div class="queue-header-actions">
              <button class="queue-action-btn" id="queue-save-playlist" title="Save remaining queue as a playlist">Save as Playlist</button>
              <button class="queue-action-btn" id="queue-clear" title="Clear upcoming songs">Clear</button>
              <button class="control-btn" id="close-queue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div class="queue-list scroll-contain" id="queue-list"></div>
        </div>
        <div class="lyrics-overlay ${state.isLyricsOpen ? 'visible' : ''}" id="lyrics-overlay">
          <div class="lyrics-text"><p>Lyrics will appear here</p><p class="hint">Tap anywhere to close</p></div>
        </div>
      </div>
    `);
    this.attachFullPlayerEvents();
    this.renderQueueList();
    if (song) this.setupVisualizer();
    else { const canvas = document.getElementById('visualizer'); if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); }
  }
  softUpdateDrawer(drawer) {
    const song = this.ui.state.currentSong;
    if (!song) return;
    const state = this.ui.state;
    const progress = state.duration ? (state.currentTime / state.duration) * 100 : 0;
    const fill = drawer.querySelector('#progress-fill');
    if (fill) fill.style.width = `${progress}%`;
    const curTime = drawer.querySelector('#drawer-current-time');
    const totTime = drawer.querySelector('#total-time');
    if (curTime) curTime.textContent = state.formatTime(state.currentTime);
    if (totTime) totTime.textContent = state.formatTime(state.duration);
    const playBtn = drawer.querySelector('#play-pause-drawer');
    if (playBtn) { playBtn.classList.toggle('playing', state.isPlaying); playBtn.innerHTML = state.isPlaying ? Icons.player.pause(32) : Icons.player.play(32); }
    const shuffleBtn = drawer.querySelector('#shuffle-btn');
    if (shuffleBtn) shuffleBtn.classList.toggle('active', state.isShuffled);
    const likeBtn = drawer.querySelector('#like-btn');
    if (likeBtn) { likeBtn.dataset.favSong = song.id; window.heartManager?.bindAll(drawer); }
    this.applyPlaybackErrorState();
  }
  attachFullPlayerEvents() {
    const song = this.ui.state.currentSong;
    document.getElementById('close-drawer')?.addEventListener('click', () => this.ui.closePlayerDrawer());
    document.getElementById('player-drawer-overlay')?.addEventListener('click', () => this.ui.closePlayerDrawer());
    document.getElementById('queue-toggle')?.addEventListener('click', () => this.toggleQueue());
    document.getElementById('close-queue')?.addEventListener('click', () => this.closeQueue());
    document.getElementById('queue-clear')?.addEventListener('click', () => this.clearQueue());
    document.getElementById('queue-save-playlist')?.addEventListener('click', () => this.saveQueueAsPlaylist());
    if (song) {
      document.getElementById('play-pause-drawer')?.addEventListener('click', () => this.ui.audioPlayer.togglePlay());
      document.getElementById('prev-btn')?.addEventListener('click', () => this.ui.audioPlayer.skipBack());
      document.getElementById('next-btn')?.addEventListener('click', () => this.ui.audioPlayer.skipForward());
      document.getElementById('shuffle-btn')?.addEventListener('click', () => this.ui.audioPlayer.toggleShuffle());
      document.getElementById('share-btn')?.addEventListener('click', () => this.toggleShare());
      document.getElementById('speed-btn')?.addEventListener('click', () => this.cycleSpeed());
      document.getElementById('sleep-btn')?.addEventListener('click', () => this.toggleSleepTimer());
      document.getElementById('album-wrapper')?.addEventListener('click', () => this.ui.audioPlayer.togglePlay());
      document.getElementById('lyrics-overlay')?.addEventListener('click', () => this.toggleLyrics());
      document.getElementById('progress-container')?.addEventListener('click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        this.ui.audioPlayer.audio.currentTime = ((e.clientX - rect.left) / rect.width) * this.ui.state.duration;
      });
      const likeBtn = document.getElementById('like-btn');
      if (likeBtn) { likeBtn.dataset.favSong = song.id; window.heartManager?.bindAll(document.getElementById('full-player-drawer') || document); }
      const drawer = document.getElementById('full-player-drawer');
      let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
      drawer.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; touchStartX = t.screenX; touchStartY = t.screenY; touchStartTime = performance.now(); }, { passive: true });
      drawer.addEventListener('touchend', (e) => {
        const t = e.changedTouches[0];
        const dx = t.screenX - touchStartX;
        const dy = t.screenY - touchStartY;
        const dt = performance.now() - touchStartTime;
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        if (absDx > absDy && absDx > 50) {
          const velocity = absDx / dt;
          if (velocity > 0.4 || absDx > 120) dx > 0 ? this.ui.audioPlayer.skipBack() : this.ui.audioPlayer.skipForward();
          return;
        }
        if (dy < -80 && absDy > absDx) { this.openQueue(); return; }
        if (dy > 80 && absDy > absDx && touchStartY < drawer.getBoundingClientRect().top + 120) this.ui.closePlayerDrawer();
      }, { passive: true });
    }
    this.ui.contentEvents.attachHeartEvents();
    this.applyPlaybackErrorState();
    this.updateSleepBadge();
  }
  renderQueueList() {
    const list = document.getElementById('queue-list');
    if (!list) return;
    const state = this.ui.state;
    list.innerHTML = '';
    if (!state.queue.length) { list.innerHTML = '<div class="empty">Queue is empty</div>'; return; }
    state.queue.forEach((s, idx) => {
      const item = document.createElement('div');
      item.className = `queue-item ${idx === state.queueIndex ? 'active' : ''}`;
      item.draggable = true;
      item.dataset.queueIdx = idx;
      item.onclick = (e) => {
        if (e.target.closest('.queue-item-remove') || e.target.closest('.queue-drag-handle')) return;
        this.ui.audioPlayer.playSong(s, state.queue, true, 'queue');
        this.closeQueue();
      };
      const indicator = idx === state.queueIndex ? `<div class="now-playing-indicator"><div class="bar-anim"></div><div class="bar-anim"></div><div class="bar-anim"></div></div>` : `<span class="num">${idx + 1}</span>`;
      item.innerHTML = `
        <span class="queue-drag-handle" title="Drag to reorder">${Icons.general.dragHandle(14)}</span>
        <img src="${s.coverUrl}" class="queue-item-thumb">
        <div class="queue-item-info"><div class="queue-item-title">${s.title}</div><div class="queue-item-artist">${s.artist}</div></div>
        ${indicator}
        <button class="queue-item-remove" title="Remove from queue">${Icons.general.close(12)}</button>
      `;
      item.querySelector('.queue-item-remove').addEventListener('click', (e) => { e.stopPropagation(); this.removeQueueItem(idx); });
      item.addEventListener('dragstart', (e) => { this._dragQueueIdx = idx; item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(idx)); } catch (err) {} });
      item.addEventListener('dragend', () => { item.classList.remove('dragging'); this._dragQueueIdx = null; });
      item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        let from = this._dragQueueIdx;
        if (from == null) { const parsed = parseInt(e.dataTransfer.getData('text/plain'), 10); from = Number.isInteger(parsed) ? parsed : null; }
        if (from != null && from !== idx) this.moveQueueItem(from, idx);
      });
      list.appendChild(item);
    });
  }
  moveQueueItem(from, to) {
    const state = this.ui.state;
    if (from < 0 || from >= state.queue.length || to < 0 || to >= state.queue.length) return;
    const [moved] = state.queue.splice(from, 1);
    state.queue.splice(to, 0, moved);
    if (state.queueIndex === from) state.queueIndex = to;
    else if (from < state.queueIndex && to >= state.queueIndex) state.queueIndex--;
    else if (from > state.queueIndex && to <= state.queueIndex) state.queueIndex++;
    this.renderQueueList();
  }
  removeQueueItem(idx) {
    const state = this.ui.state;
    if (idx < 0 || idx >= state.queue.length) return;
    const wasCurrent = idx === state.queueIndex;
    state.queue.splice(idx, 1);
    if (wasCurrent) state.queueIndex = idx - 1;
    else if (idx < state.queueIndex) state.queueIndex--;
    this.renderQueueList();
    state.showToast('Removed from queue');
  }
  clearQueue() {
    const state = this.ui.state;
    const current = state.queue[state.queueIndex] || state.currentSong;
    state.queue = current ? [current] : [];
    state.queueIndex = current ? 0 : -1;
    this.renderQueueList();
    state.showToast('Queue cleared');
  }
  saveQueueAsPlaylist() {
    const state = this.ui.state;
    const remaining = state.queue.slice(Math.max(0, state.queueIndex + 1));
    if (!remaining.length) { state.showToast('No upcoming songs to save'); return; }
    state.modalOpen(`
      <div data-modal="save-queue" class="saveQueue">
        <div class="head"><h2 class="title">Save Queue as Playlist</h2>
          <button onclick="window.closeModal()" class="close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <p class="note">${remaining.length} upcoming song${remaining.length === 1 ? '' : 's'} will be saved.</p>
        <input type="text" id="save-queue-playlist-name" placeholder="Playlist name" class="input">
        <button id="save-queue-playlist-confirm" class="cta">Save Playlist</button>
      </div>
    `);
    document.getElementById('save-queue-playlist-confirm')?.addEventListener('click', () => {
      const name = document.getElementById('save-queue-playlist-name')?.value.trim();
      if (!name) return;
      state.playlists.push({ id: Utils.newId('pl'), name, description: '', tags: [], songs: remaining.map((s) => Utils.id(s.id)) });
      state.persist();
      state.modalClose();
      state.showToast(`Playlist "${name}" created`);
    });
  }
  toggleQueue() {
    this.ui.state.isQueueOpen = !this.ui.state.isQueueOpen;
    document.getElementById('queue-modal')?.classList.toggle('open', this.ui.state.isQueueOpen);
    if (this.ui.state.isQueueOpen) this.renderQueueList();
  }
  openQueue() {
    if (this.ui.state.isQueueOpen) return;
    this.ui.state.isQueueOpen = true;
    document.getElementById('queue-modal')?.classList.add('open');
    this.renderQueueList();
  }
  closeQueue() {
    this.ui.state.isQueueOpen = false;
    document.getElementById('queue-modal')?.classList.remove('open');
  }
  toggleLyrics() {
    this.ui.state.isLyricsOpen = !this.ui.state.isLyricsOpen;
    document.getElementById('lyrics-overlay')?.classList.toggle('visible', this.ui.state.isLyricsOpen);
  }
  toggleShare() {
    const song = this.ui.state.currentSong;
    if (!song) return;
    const url = `${window.location.origin}/artist/${song.artistId}/album/${song.albumId}?song=${song.id}`;
    if (navigator.share) navigator.share({ title: song.title, text: `Listen to ${song.title} by ${song.artist}`, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => this.ui.state.showToast('Link copied to clipboard'));
  }
  cycleSpeed() {
    const speeds = [0.5, 1, 1.5, 2];
    const idx = (speeds.indexOf(this.ui.state.playbackRate) + 1) % speeds.length;
    this.ui.state.playbackRate = speeds[idx];
    this.ui.audioPlayer.audio.playbackRate = this.ui.state.playbackRate;
    const btn = document.getElementById('speed-btn');
    if (btn) { btn.textContent = this.ui.state.playbackRate + 'x'; btn.classList.toggle('active', this.ui.state.playbackRate !== 1); }
  }
  toggleSleepTimer() { this.openSleepMenu(); }
  openSleepMenu() {
    const state = this.ui.state;
    const minutes = [5, 15, 30, 45, 60];
    const activeMin = state.sleepTimerEndsAt ? Math.round((state.sleepTimerEndsAt - Date.now()) / 60000) : null;
    state.modalOpen(`
      <div data-modal="sleep" class="sleep-menu">
        <div class="head"><h2 class="title">Sleep Timer</h2>
          <button onclick="window.closeModal()" class="close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div data-list="options" class="sleep-options">
          ${minutes.map((m) => `<button class="sleep-option ${activeMin === m ? 'active' : ''}" data-sleep-min="${m}"><span class="sleep-option-label">${m} minutes</span></button>`).join('')}
          <button class="sleep-option ${state.sleepTimerTrackEnd ? 'active' : ''}" data-sleep-track="1"><span class="sleep-option-label">End of current track</span></button>
          <button class="sleep-option sleep-option-off" data-sleep-off="1"><span class="sleep-option-label">Off</span></button>
        </div>
      </div>
    `);
    document.querySelectorAll('#modal [data-sleep-min]').forEach((btn) => btn.addEventListener('click', () => this.setSleepTimer(parseInt(btn.dataset.sleepMin, 10))));
    document.querySelector('#modal [data-sleep-track]')?.addEventListener('click', () => this.setSleepTrackEnd());
    document.querySelector('#modal [data-sleep-off]')?.addEventListener('click', () => { this.clearSleepTimer(); state.modalClose(); });
  }
  setSleepTimer(minutes) {
    const state = this.ui.state;
    this.clearSleepTimer({ silent: true });
    state.sleepTimerEndsAt = Date.now() + minutes * 60 * 1000;
    state.sleepTimerId = setTimeout(() => this._fireSleepTimer(), minutes * 60 * 1000);
    document.getElementById('sleep-btn')?.classList.add('active');
    this._startSleepBadge();
    state.modalClose();
    state.showToast(`Sleep timer: ${minutes} min`);
  }
  setSleepTrackEnd() {
    const state = this.ui.state;
    this.clearSleepTimer({ silent: true });
    state.sleepTimerTrackEnd = true;
    document.getElementById('sleep-btn')?.classList.add('active');
    this.updateSleepBadge();
    state.modalClose();
    state.showToast('Sleep timer: stops after the current track');
  }
  clearSleepTimer({ silent = false } = {}) {
    const state = this.ui.state;
    if (state.sleepTimerId) clearTimeout(state.sleepTimerId);
    state.sleepTimerId = null;
    state.sleepTimerEndsAt = null;
    state.sleepTimerTrackEnd = false;
    if (this._sleepBadgeTimer) { clearInterval(this._sleepBadgeTimer); this._sleepBadgeTimer = null; }
    document.getElementById('sleep-btn')?.classList.remove('active');
    this.updateSleepBadge();
    if (!silent) state.showToast('Sleep timer off');
  }
  _fireSleepTimer() {
    const state = this.ui.state;
    state.sleepTimerId = null;
    state.sleepTimerEndsAt = null;
    if (state.isPlaying) this.ui.audioPlayer.togglePlay();
    this.clearSleepTimer({ silent: true });
    state.showToast('Sleep timer ended');
  }
  _startSleepBadge() {
    if (this._sleepBadgeTimer) clearInterval(this._sleepBadgeTimer);
    this.updateSleepBadge();
    this._sleepBadgeTimer = setInterval(() => this.updateSleepBadge(), 1000);
  }
  updateSleepBadge() {
    const btn = document.getElementById('sleep-btn');
    if (!btn) return;
    const state = this.ui.state;
    let badge = btn.querySelector('.sleep-badge');
    const remaining = state.sleepTimerEndsAt ? Math.max(0, state.sleepTimerEndsAt - Date.now()) : null;
    if (remaining == null && !state.sleepTimerTrackEnd) { badge?.remove(); return; }
    if (!badge) { badge = document.createElement('span'); badge.className = 'sleep-badge'; btn.appendChild(badge); }
    badge.textContent = state.sleepTimerTrackEnd ? 'track' : Utils.fmtTime(Math.ceil(remaining / 1000));
  }
  setupVisualizer() {
    const canvas = document.getElementById('visualizer');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let width, height;
    const resize = () => { width = canvas.offsetWidth; height = canvas.offsetHeight; canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    window.addEventListener('resize', resize);
    let analyser, dataArray, audioConnected = false;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(this.ui.audioPlayer.audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioConnected = true;
    } catch {}
    const barCount = 30;
    const barTargets = new Float32Array(barCount);
    const barCurrent = new Float32Array(barCount);
    let accentRGB = { r: 255, g: 107, b: 107 };
    window.addEventListener('themechange', (e) => { if (e.detail?.accent) accentRGB = IdUtils.hslToRgb(e.detail.accent); });
    let animFrame;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      if (this.ui.state.isPlaying) {
        if (audioConnected && analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);
          const step = dataArray.length / barCount;
          for (let i = 0; i < barCount; i++) {
            let sum = 0;
            const start = Math.floor(i * step), end = Math.floor((i + 1) * step);
            for (let j = start; j < end; j++) sum += dataArray[j];
            barTargets[i] = sum / Math.max(1, end - start) / 255;
          }
        } else {
          const t = performance.now() / 1000;
          for (let i = 0; i < barCount; i++) barTargets[i] = Math.sin(t * 2 + i * 0.4) * 0.3 + Math.sin(t * 3.5 + i * 0.7) * 0.2 + Math.sin(t * 1.2 + i * 0.2) * 0.15 + 0.35;
        }
        const lerpFactor = 0.12;
        for (let i = 0; i < barCount; i++) barCurrent[i] += (barTargets[i] - barCurrent[i]) * lerpFactor;
        const halfBars = Math.floor(barCount / 2);
        const barWidth = width / barCount;
        const centerX = width / 2;
        for (let i = 0; i < halfBars; i++) {
          const h = barCurrent[i] * height * 0.85;
          if (h < 1) continue;
          const xLeft = centerX - (i + 1) * barWidth;
          const xRight = centerX + i * barWidth;
          const y = height - h;
          const gradient = ctx.createLinearGradient(0, y, 0, height);
          gradient.addColorStop(0, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b}, 0)`);
          gradient.addColorStop(0.5, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b}, 0.25)`);
          gradient.addColorStop(1, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b}, 0.55)`);
          ctx.fillStyle = gradient;
          const w = barWidth - 2;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') { ctx.roundRect(xLeft, y, w, h, [3, 3, 0, 0]); ctx.roundRect(xRight, y, w, h, [3, 3, 0, 0]); }
          else {
            ctx.moveTo(xLeft + 3, y); ctx.lineTo(xLeft + w - 3, y); ctx.quadraticCurveTo(xLeft + w, y, xLeft + w, y + 3); ctx.lineTo(xLeft + w, y + h); ctx.lineTo(xLeft, y + h); ctx.lineTo(xLeft, y + 3); ctx.quadraticCurveTo(xLeft, y, xLeft + 3, y);
            ctx.moveTo(xRight + 3, y); ctx.lineTo(xRight + w - 3, y); ctx.quadraticCurveTo(xRight + w, y, xRight + w, y + 3); ctx.lineTo(xRight + w, y + h); ctx.lineTo(xRight, y + h); ctx.lineTo(xRight, y + 3); ctx.quadraticCurveTo(xRight, y, xRight + 3, y);
          }
          ctx.fill();
        }
      }
      animFrame = requestAnimationFrame(draw);
    };
    draw();
    const observer = new MutationObserver(() => { if (!document.getElementById('full-player-drawer')) { cancelAnimationFrame(animFrame); observer.disconnect(); } });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

/* ==================== 4. LAYOUTS ==================== */

class Home {
  constructor(ui) {
    this.ui = ui;
    this.RECENT_LIMIT = 15;
    this.MOST_PLAYED_LIMIT = 3;
    this.DISCOVER_ARTIST_LIMIT = 5;
    this.DISCOVER_SONGS_PER_ARTIST = 3;
    this.GENRE_LIMIT = 14;
    this._discoverIndex = 0;
    this._discoverCache = null;
    this._focusedGenre = null;
    this._bindLiveUpdates();
  }
  buildSongs(state) {
    return state.enrichedLibrary.flatMap((artist) => artist.albums.flatMap((album) => album.songs.map((song) => ({
      ...song, artistId: artist.id, albumId: album.id, artist: artist.artist, album: album.album, coverUrl: album.coverUrl, artistImageUrl: artist.imageUrl, genre: artist.genre || "",
    }))));
  }
  buildAlbums(state) {
    return state.enrichedLibrary.flatMap((a) => a.albums.map((alb) => ({
      artistId: a.id, artistName: a.artist, albumId: alb.id, albumName: alb.album, coverUrl: alb.coverUrl, genre: a.genre || "", year: alb.year || "2024", songCount: alb.songs.length, songs: alb.songs,
    })));
  }
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  pickFeatured(state) {
    const albums = this.buildAlbums(state).filter((a) => a.coverUrl);
    if (!albums.length) return null;
    return this.shuffle(albums)[0];
  }
  getRecent(state) {
    return (state.recentlyPlayed || []).slice(0, this.RECENT_LIMIT).map((s) => state.getSongById(s.id) || s).filter(Boolean);
  }
  getMostPlayed(state) {
    const songs = typeof state.getMostPlayed === "function" ? state.getMostPlayed(this.MOST_PLAYED_LIMIT) : [];
    return songs.map((s) => ({ song: s, plays: state.getPlayCount ? state.getPlayCount(s.id) : 0 }));
  }
  getCounts(state) {
    return { songs: this.buildSongs(state).length, albums: this.buildAlbums(state).length, artists: state.enrichedLibrary.length, playlists: (state.playlists || []).length };
  }
  getFavSummary(state) {
    const songCount = (state.favoriteSongs || []).length;
    const albumCount = (state.favoriteAlbums || []).length;
    const artistCount = (state.favoriteArtists || []).length;
    let coverUrl = "";
    const latestSongId = [...(state.favoriteSongs || [])].pop();
    const latestSong = latestSongId != null ? state.getSongById(latestSongId) : null;
    if (latestSong?.coverUrl) coverUrl = latestSong.coverUrl;
    else {
      const latestAlbumId = [...(state.favoriteAlbums || [])].pop();
      const latestAlbum = latestAlbumId != null ? state.getAlbumById(latestAlbumId) : null;
      if (latestAlbum?.coverUrl) coverUrl = latestAlbum.coverUrl;
    }
    return { songCount, albumCount, artistCount, coverUrl };
  }
  esc(text) { return Utils.esc(text); }
  iconChevronLeft(size = 16) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
  iconChevronRight(size = 16) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
  iconShuffle(size = 16) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 5h2.2c1.1 0 2.1.55 2.7 1.47L10.1 10l2.2 3.53c.6.92 1.6 1.47 2.7 1.47H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 15h2.2c1.1 0 2.1-.55 2.7-1.47l.9-1.43" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.1 5H17M15.1 15H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14.4 3.4 16.6 5l-2.2 1.6M14.4 13.4 16.6 15l-2.2 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
  sectionIconDiscover() { return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><path d="M12.9 7.1 11.4 11.4 7.1 12.9 8.6 8.6z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" stroke-linejoin="round"/></svg>`; }
  sectionIconCollections() { return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="6.5" width="11" height="11" rx="2.6" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><path d="M6 4.4h8.4A3.1 3.1 0 0 1 17.5 7.5V15" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" stroke-linecap="round"/></svg>`; }
  sectionIconGenres() { return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="11.1" y="2.5" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="2.5" y="11.1" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="11.1" y="11.1" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/></svg>`; }
  _getDiscoverArtists(state) {
    if (this._discoverCache && this._discoverCache.length) return this._discoverCache;
    let songs = [];
    try { songs = this.buildSongs(state); } catch { songs = []; }
    const byArtist = new Map();
    songs.forEach((s) => {
      if (s == null || s.artistId == null) return;
      const key = String(s.artistId);
      if (!byArtist.has(key)) byArtist.set(key, []);
      byArtist.get(key).push(s);
    });
    const pool = [...byArtist.values()].filter((list) => list.length > 0);
    if (!pool.length) { this._discoverCache = []; return this._discoverCache; }
    const picked = this.shuffle(pool).slice(0, this.DISCOVER_ARTIST_LIMIT);
    this._discoverCache = picked.map((list) => {
      const first = list[0];
      const sample = this.shuffle(list).slice(0, this.DISCOVER_SONGS_PER_ARTIST);
      return { artistId: first.artistId, artistName: first.artist || "Unknown Artist", genre: first.genre || "", imageUrl: first.artistImageUrl || first.coverUrl || "", songs: sample };
    });
    return this._discoverCache;
  }
  discoverSongRow(s, i) {
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.esc(s.title || "Unknown Title");
    const album = this.esc(s.album || "");
    return `
      <button type="button" class="discoverSong${isPlaying ? " is-playing" : ""}" data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId ?? "")}" data-album-id="${this.esc(s.albumId ?? "")}" aria-label="Play ${title}">
        <span class="discoverSongIndex" aria-hidden="true">${i + 1}</span>
        <span class="discoverSongArt" aria-hidden="true"><img src="${this.esc(s.coverUrl || "")}" alt="" loading="lazy"></span>
        <span class="discoverSongInfo"><span class="discoverSongTitle">${title}</span><span class="discoverSongAlbum">${album}</span></span>
        <span class="discoverSongPlay" aria-hidden="true">${Icons.player.play(14)}</span>
      </button>
    `;
  }
  discoverArtistCard(a) {
    const name = this.esc(a.artistName);
    return `
      <div class="discoverArtist" data-artist-id="${this.esc(a.artistId)}">
        <div class="discoverArtistHead">
          <div class="discoverArtistArt"><img src="${this.esc(a.imageUrl || "")}" alt="${name}" loading="lazy"></div>
          <div class="discoverArtistMeta"><span class="discoverArtistName">${name}</span><span class="discoverArtistGenre">${this.esc(a.genre || "Artist")}</span></div>
          <button type="button" class="discoverArtistOpen" data-artist-open="${this.esc(a.artistId)}" aria-label="Open ${name}">${this.iconChevronRight(15)}</button>
        </div>
        <div class="discoverSongList">${a.songs.map((s, i) => this.discoverSongRow(s, i)).join("")}</div>
      </div>
    `;
  }
  discoverNav(index, total) {
    return `
      <div class="discoverNav">
        <button type="button" class="cardAction" data-discover-refresh aria-label="Shuffle discoveries">${this.iconShuffle(15)}</button>
        <span class="discoverCounter" data-discover-counter>${index + 1} / ${total}</span>
        <button type="button" class="cardAction" data-discover-prev aria-label="Previous artist" ${index <= 0 ? "disabled" : ""}>${this.iconChevronLeft(16)}</button>
        <button type="button" class="cardAction" data-discover-next aria-label="Next artist" ${index >= total - 1 ? "disabled" : ""}>${this.iconChevronRight(16)}</button>
      </div>
    `;
  }
  renderDiscover(state) {
    const artists = this._getDiscoverArtists(state);
    if (!artists.length) return "";
    let index = Number.isFinite(this._discoverIndex) ? this._discoverIndex : 0;
    index = Math.max(0, Math.min(artists.length - 1, index));
    this._discoverIndex = index;
    return `
      <article class="musicCard discoverCard" data-card="discover">
        ${this.sectionTitle({ icon: this.sectionIconDiscover(), title: "Discover", notes: [this.musicNoteSvg(2)], action: this.discoverNav(index, artists.length) })}
        <div class="discoverViewport"><div class="discoverTrack" style="transform: translateX(-${index * 100}%)">${artists.map((a) => this.discoverArtistCard(a)).join("")}</div></div>
      </article>
    `;
  }
  _moveDiscover(delta) {
    const artists = this._discoverCache || [];
    if (!artists.length) return;
    const current = Math.max(0, Math.min(artists.length - 1, this._discoverIndex || 0));
    const next = Math.max(0, Math.min(artists.length - 1, current + delta));
    if (next === current) return;
    this._discoverIndex = next;
    this._syncDiscover();
  }
  _syncDiscover() {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const track = root.querySelector(".discoverTrack");
    if (!track) return;
    const total = track.children.length;
    if (!total) return;
    const index = Math.max(0, Math.min(total - 1, this._discoverIndex || 0));
    this._discoverIndex = index;
    track.style.transform = `translateX(-${index * 100}%)`;
    const prev = root.querySelector("[data-discover-prev]");
    const next = root.querySelector("[data-discover-next]");
    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = index >= total - 1;
    const counter = root.querySelector("[data-discover-counter]");
    if (counter) counter.textContent = `${index + 1} / ${total}`;
  }
  _rebuildDiscoverCard() {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const card = root.querySelector('[data-card="discover"]');
    const html = this.renderDiscover(this.ui.state);
    if (!card) {
      if (!html) return;
      const grid = root.querySelector(".bentoGrid");
      if (!grid) return;
      const tpl = document.createElement("template");
      tpl.innerHTML = html.trim();
      const fresh = tpl.content.firstElementChild;
      if (fresh) grid.appendChild(fresh);
      this._syncNowPlaying();
      return;
    }
    if (!html) { card.remove(); return; }
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    const fresh = tpl.content.firstElementChild;
    if (!fresh) return;
    card.replaceWith(fresh);
    this._syncNowPlaying();
  }
  buildGenres(state) {
    let songs = [];
    try { songs = this.buildSongs(state); } catch { songs = []; }
    const map = new Map();
    songs.forEach((s) => {
      const name = (s.genre || "").trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, { name, count: 0, coverUrl: s.coverUrl || "" });
      const entry = map.get(name);
      entry.count += 1;
      if (!entry.coverUrl && s.coverUrl) entry.coverUrl = s.coverUrl;
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }
  genreTile(g) {
    const name = this.esc(g.name);
    const count = g.count;
    return `
      <button type="button" class="genreTile" data-genre="${name}" aria-label="Genre ${name}">
        <span class="genreTileArt" aria-hidden="true">${g.coverUrl ? `<img src="${this.esc(g.coverUrl)}" alt="" loading="lazy">` : ""}</span>
        <span class="genreTileBody"><span class="genreTileName">${name}</span><span class="genreTileCount">${count} song${count === 1 ? "" : "s"}</span></span>
      </button>
    `;
  }
  renderGenres(state) {
    const genres = this.buildGenres(state).slice(0, this.GENRE_LIMIT);
    if (!genres.length) return "";
    const tiles = genres.map((g) => this.genreTile(g)).join("");
    return `
      <section class="homeGenres" aria-label="Browse by genre">
        ${this.sectionTitle({ icon: this.sectionIconGenres(), title: "Genres", notes: [this.musicNoteSvg(2), this.musicNoteSvg(4)], action: this.actionButton("open-library", "Open library") })}
        <div class="genreMarquee" data-genre-marquee><div class="genreMarqueeTrack">${tiles}${tiles}</div></div>
      </section>
    `;
  }
  _syncGenreFocus() {
    const root = this._root();
    if (!root) return;
    const marquee = root.querySelector("[data-genre-marquee]");
    if (!marquee) return;
    const focused = this._focusedGenre;
    marquee.classList.toggle("has-focus", !!focused);
    marquee.querySelectorAll(".genreTile").forEach((tile) => {
      const isFocus = !!focused && tile.dataset.genre === focused;
      tile.classList.toggle("is-focused", isFocus);
      tile.setAttribute("aria-pressed", isFocus ? "true" : "false");
    });
  }
  _clearGenreFocus() { if (!this._focusedGenre) return; this._focusedGenre = null; this._syncGenreFocus(); }
  _openGenre(name) {
    if (!name) return;
    if (window.pagesActions?.openGenre) { window.pagesActions.openGenre(name); return; }
    if (window.pagesActions?.playGenre) { window.pagesActions.playGenre(name); return; }
    this.ui.navigate("library");
  }
  collectionCard(pl, i, state) {
    const songs = (pl.songs || []).map((id) => (typeof state.getSongById === "function" ? state.getSongById(id) : null)).filter(Boolean);
    const covers = songs.map((s) => s.coverUrl).filter(Boolean);
    const uniqueCovers = [...new Set(covers)];
    let art = "";
    if (uniqueCovers.length >= 4) art = `<div class="collectionMosaic">${uniqueCovers.slice(0, 4).map((c) => `<img src="${this.esc(c)}" alt="" loading="lazy">`).join("")}</div>`;
    else if (uniqueCovers.length >= 1) art = `<img src="${this.esc(uniqueCovers[0])}" alt="" loading="lazy">`;
    else art = `<div class="collectionEmpty">${Icons.general.playlistAdd(30)}</div>`;
    const name = this.esc(pl.name);
    const count = songs.length;
    return `
      <div class="collection-card" data-playlist-id="${this.esc(pl.id)}" data-playlist-name="${name}" role="button" tabindex="0" aria-label="Open collection ${name}">
        <div class="imgBx">${art}</div>
        <div class="content">
          <div class="contentBx"><h3>${name}<br><span>${count} song${count === 1 ? "" : "s"}</span></h3></div>
          <ul class="sci">
            <li style="--i:1"><button type="button" class="icon-btn" data-playlist-play="${this.esc(pl.id)}" aria-label="Play collection">${Icons.player.play(18)}</button></li>
            <li style="--i:2"><button type="button" class="icon-btn" data-playlist-shuffle="${this.esc(pl.id)}" aria-label="Shuffle collection">${this.iconShuffle(18)}</button></li>
            <li style="--i:3"><button type="button" class="icon-btn" data-playlist-more="${this.esc(pl.id)}" aria-label="More options">${Icons.general.moreVert(18)}</button></li>
          </ul>
        </div>
      </div>
    `;
  }
  collectionsInner(state) {
    const playlists = (state.playlists || []).filter((p) => p && p.name);
    if (!playlists.length) return this.emptyNote("No collections yet — create a playlist and it will show up here.");
    return `<div class="collectionGrid">${playlists.map((pl, i) => this.collectionCard(pl, i, state)).join("")}</div>`;
  }
  renderCollections(state) {
    return `
      <article class="musicCard collectionsCard" data-card="collections">
        ${this.sectionTitle({ icon: this.sectionIconCollections(), title: "Collections", notes: [this.musicNoteSvg(4), this.musicNoteSvg(3)], action: this.actionButton("open-playlists", "Open all collections") })}
        <div class="cardContent" id="homeCollectionsWrap">${this.collectionsInner(state)}</div>
      </article>
    `;
  }
  _syncCollections() {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const wrap = root.querySelector("#homeCollectionsWrap");
    if (!wrap) return;
    wrap.innerHTML = this.collectionsInner(this.ui.state);
    wrap.classList.remove("hp-swap");
    void wrap.offsetWidth;
    wrap.classList.add("hp-swap");
  }
  songRow(s) {
    const isFav = this.ui.favorites.isSong(s.id);
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.esc(s.title || "Unknown Title");
    return `
      <article class="song${isPlaying ? " is-playing" : ""}" data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId ?? "")}" data-album-id="${this.esc(s.albumId ?? "")}">
        <div class="songArtwork">
          <img src="${this.esc(s.coverUrl || "")}" alt="${title}" loading="lazy">
          <button type="button" class="songArtworkOverlay" aria-label="Play ${title}" data-action="play"><span class="playIcon" aria-hidden="true">${Icons.player.play(13)}</span></button>
        </div>
        <div class="songInformation">
          <span class="songArtist">${this.esc(s.artist || "Unknown Artist")}</span>
          <span class="songTitle">${title}</span>
          <div class="songMeta"><span class="songAlbum">${this.esc(s.album || "")}</span><span aria-hidden="true">&bull;</span><span class="songDuration">${this.esc(s.duration || "")}</span></div>
        </div>
        <div class="songActions">
          <button type="button" class="songAction favorite${isFav ? " is-favorite favorited" : ""}" aria-label="Favorite song" data-fav-song="${this.esc(s.id)}">${this.ui.likeStatus("song", isFav, false, null)}</button>
          <button type="button" class="songAction" aria-label="More options" data-more-song="${this.esc(s.id)}">${Icons.general.moreVert(18)}</button>
        </div>
      </article>
    `;
  }
  rankRow(entry, index) {
    const s = entry.song;
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.esc(s.title || "Unknown Title");
    const plays = entry.plays;
    return `
      <article class="rankItem${isPlaying ? " is-playing" : ""}" data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId ?? "")}" data-album-id="${this.esc(s.albumId ?? "")}">
        <span class="rankNumber">${String(index + 1).padStart(2, "0")}</span>
        <div class="rankArtwork"><img src="${this.esc(s.coverUrl || "")}" alt="${title}" loading="lazy"></div>
        <div class="rankInformation"><span class="rankTitle">${title}</span><span class="rankSubtitle">${this.esc(s.artist || "Unknown Artist")}</span></div>
        <span class="rankCount">${plays} play${plays === 1 ? "" : "s"}</span>
      </article>
    `;
  }
  emptyNote(text) { return `<div class="hp-empty">${this.esc(text)}</div>`; }
  renderHeader() {
    return `
      <header class="pageHeader">
        <div class="pageHeaderContent">
          <span class="pageKicker">Your Music</span>
          <h1 class="pageTitle">Music Library</h1>
          <p class="pageDescription">Pick up where you left off, discover new releases, and explore your music collection.</p>
        </div>
        <button type="button" class="headerAction" data-nav="library">View Library</button>
      </header>
    `;
  }
  sectionTitle({ icon, title, notes = [], action = "" }) {
    return `
      <div class="section-title-wrap">
        <span class="section-title-icon" aria-hidden="true">${icon}</span>
        <h2 class="section-title">${title}</h2>
        ${notes.length ? `<div class="section-title-notes" aria-hidden="true">${notes.join("")}</div>` : ""}
        ${action}
      </div>
    `;
  }
  actionButton(action, label) { return `<button type="button" class="cardAction" aria-label="${label}" data-action="${action}">${Icons.general.arrowRight(16)}</button>`; }
  musicNoteSvg(type) {
    const color = "rgba(190,140,255,0.85)";
    if (type === 1) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5"><circle cx="17.9922" cy="15.75" r="3"></circle><circle cx="5.99219" cy="17.75" r="3"></circle><path d="M8.99219 17.75V9.66559M8.99219 9.66559V8.77944C8.99219 7.26371 8.99219 6.50585 9.41578 5.9576C9.83937 5.40936 10.5669 5.22555 12.022 4.85793L16.022 3.84738C18.3099 3.26938 19.4538 2.98038 20.223 3.58727C20.859 4.08907 20.9691 4.99061 20.9882 6.63495M8.99219 9.66559L20.9882 6.63495M20.9922 15.7289V7.76889C20.9922 7.35623 20.9922 6.9793 20.9882 6.63495M20.9882 6.63495L20.9922 6.63394" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    if (type === 2) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5"><path d="M7 9.5C7 10.8807 5.88071 12 4.5 12C3.11929 12 2 10.8807 2 9.5C2 8.11929 3.11929 7 4.5 7C5.88071 7 7 8.11929 7 9.5ZM7 9.5V2C7.33333 2.5 7.6 4.6 10 5" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="10.5" cy="19.5" r="2.5"></circle><circle cx="20" cy="18" r="2"></circle><path d="M13 19.5L13 11C13 10.09 13 9.63502 13.2466 9.35248C13.4932 9.06993 13.9938 9.00163 14.9949 8.86504C18.0085 8.45385 20.2013 7.19797 21.3696 6.42937C21.6498 6.24509 21.7898 6.15295 21.8949 6.20961C22 6.26627 22 6.43179 22 6.76283V17.9259" stroke-linecap="round" stroke-linejoin="round"></path><path d="M13 13C17.8 13 21 10.6667 22 10" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    if (type === 3) return `<svg width="24" height="19" viewBox="0 0 24 19" fill="none"><line x1="6" y1="3" x2="6" y2="14.5" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/><line x1="18" y1="1" x2="18" y2="13.5" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/><line x1="6" y1="3" x2="18" y2="1" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="6.5" x2="18" y2="4.5" stroke="rgba(190,140,255,0.62)" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="3.4" cy="15" rx="3" ry="2" transform="rotate(-15 3.4 15)" fill="rgba(190,140,255,0.8)"/><ellipse cx="15.4" cy="14" rx="3" ry="2" transform="rotate(-15 15.4 14)" fill="rgba(190,140,255,0.8)"/></svg>`;
    if (type === 4) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.49219" cy="17" r="4"></circle><path d="M13.4922 17V3C13.4922 5.76142 15.7308 8 18.4922 8"></path></svg>`;
    return "";
  }
  renderRecentlyPlayed(recent) {
    return `
      <article class="musicCard recentlyPlayed" data-card="recents">
        ${this.sectionTitle({ icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><polygon points="8.5,7 8.5,13.5 14.5,10.25" fill="rgba(190,140,255,0.82)"/></svg>`, title: "Recently Played", notes: [this.musicNoteSvg(1), this.musicNoteSvg(2)], action: this.actionButton("view-recents", "View recently played") })}
        <div class="cardContent"><div class="songList" id="recentSongs" aria-label="Recently played songs">${recent.length ? recent.map((s) => this.songRow(s)).join("") : this.emptyNote("Nothing here yet — play a song and it will appear at the top of this list.")}</div></div>
      </article>
    `;
  }
  renderNewRelease(rel) {
    if (!rel) return "";
    const playData = this.esc(JSON.stringify({ artistId: rel.artistId, albumId: rel.albumId }));
    return `
      <article class="musicCard releasesCard" data-card="releases" data-artist-id="${this.esc(rel.artistId)}" data-album-id="${this.esc(rel.albumId)}">
        ${this.sectionTitle({ icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><line x1="10" y1="6.5" x2="10" y2="13.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/><line x1="6.5" y1="10" x2="13.5" y2="10" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/></svg>`, title: "New Release", notes: [this.musicNoteSvg(3)], action: this.actionButton("view-releases", "View all releases") })}
        <div class="releaseFeature">
          <img class="releaseBackground" src="${this.esc(rel.coverUrl)}" alt="${this.esc(rel.albumName)}">
          <div class="releaseInfo">
            <span class="releaseLabel">Featured Album</span>
            <h3 class="releaseTitle">${this.esc(rel.albumName)}</h3>
            <p class="releaseArtist">${this.esc(rel.artistName)}</p>
            <div class="releaseControls">
              <button type="button" class="primaryPlay" aria-label="Play album" data-play-album='${playData}'>${Icons.player.play(18)}</button>
              <button type="button" class="secondaryControl" aria-label="Add album to queue" data-action="add-album-to-queue" data-album-id="${this.esc(rel.albumId)}">${Icons.general.plus(18)}</button>
              <button type="button" class="secondaryControl" aria-label="More album options" data-release-more data-artist-id="${this.esc(rel.artistId)}" data-album-id="${this.esc(rel.albumId)}">${Icons.general.moreVert(18)}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }
  renderMostPlayed(mostPlayed) {
    return `
      <article class="musicCard mostPlayed" data-card="most-played">
        ${this.sectionTitle({ icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 16.5 C10 16.5 3 11.5 3 7 C3 4.8 4.8 3 7 3 C8.5 3 9.7 3.9 10 5 C10.3 3.9 11.5 3 13 3 C15.2 3 17 4.8 17 7 C17 11.5 10 16.5 10 16.5Z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" fill="rgba(190,140,255,0.1)"/></svg>`, title: "Most Played", notes: [this.musicNoteSvg(1)], action: this.actionButton("view-most-played", "View most played") })}
        <div class="cardContent"><div class="rankList" id="mostPlayedSongs">${mostPlayed.length ? mostPlayed.map((e, i) => this.rankRow(e, i)).join("") : this.emptyNote("Your most played songs will show up here once you start listening.")}</div></div>
      </article>
    `;
  }
  renderLibraryCard(counts) {
    const items = [
      { key: "songs", label: "Songs", count: counts.songs, icon: Icons.general.musicNote(18) },
      { key: "albums", label: "Albums", count: counts.albums, icon: Icons.general.album(18) },
      { key: "artists", label: "Artists", count: counts.artists, icon: Icons.general.artist(18) },
      { key: "playlists", label: "Playlists", count: counts.playlists, icon: Icons.general.playlistAdd(18) },
    ];
    return `
      <article class="musicCard libraryCard" data-card="library">
        ${this.sectionTitle({ icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><line x1="10" y1="6.5" x2="10" y2="13.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/><line x1="6.5" y1="10" x2="13.5" y2="10" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/></svg>`, title: "Your Library", notes: [], action: this.actionButton("open-library", "Open library") })}
        <div class="cardContent"><div class="libraryGrid">${items.map((it) => `
          <button type="button" class="libraryItem" data-library="${it.key}">
            <span class="libraryIcon" aria-hidden="true">${it.icon}</span>
            <span class="libraryName">${it.label}</span>
            <span class="libraryCount">${it.count} ${it.label.toLowerCase()}</span>
          </button>`).join("")}
        </div></div>
      </article>
    `;
  }
  favoritesCardInner() {
    const f = this.getFavSummary(this.ui.state);
    const total = f.songCount + f.albumCount + f.artistCount;
    return `
      <div class="favoriteHero">
        ${f.coverUrl ? `<img class="favoriteArtwork" src="${this.esc(f.coverUrl)}" alt="Favorite album artwork">` : ""}
        <div class="favoriteInfo">
          <h3 class="favoriteTitle">Your Favorite Music</h3>
          <p class="favoriteSubtitle">${total ? `${f.songCount} song${f.songCount === 1 ? "" : "s"} &bull; ${f.albumCount} album${f.albumCount === 1 ? "" : "s"} &bull; ${f.artistCount} artist${f.artistCount === 1 ? "" : "s"}` : "Your most-loved songs and albums."}</p>
        </div>
      </div>
    `;
  }
  renderFavoritesCard() {
    return `
      <article class="musicCard favoritesCard" data-card="favorites">
        ${this.sectionTitle({ icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 16.5 C10 16.5 3 11.5 3 7 C3 4.8 4.8 3 7 3 C8.5 3 9.7 3.9 10 5 C10.3 3.9 11.5 3 13 3 C15.2 3 17 4.8 17 7 C17 11.5 10 16.5 10 16.5Z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" fill="rgba(190,140,255,0.1)"/></svg>`, title: "Favorites", notes: [this.musicNoteSvg(4), this.musicNoteSvg(3)], action: this.actionButton("view-favorites", "View favorites") })}
        <div class="favoriteContent" id="homeFavoritesCard">${this.favoritesCardInner()}</div>
      </article>
    `;
  }
  render() {
    const state = this.ui.state;
    this._focusedGenre = null;
    this._clearCardFocus();
    if (!Array.isArray(this._discoverCache)) this._discoverCache = null;
    const cards = [
      this.renderNewRelease(this.pickFeatured(state)),
      this.renderRecentlyPlayed(this.getRecent(state)),
      this.renderMostPlayed(this.getMostPlayed(state)),
      this.renderLibraryCard(this.getCounts(state)),
      this.renderFavoritesCard(),
      this.renderDiscover(state),
      this.renderCollections(state),
      this.renderGenres(state),
    ].filter(Boolean);
    const html = `
      <div data-page="home" class="hp pageSection">
        <div class="container">
          ${this.renderHeader()}
          <section class="bentoGrid" aria-label="Music dashboard">${cards.join("")}</section>
        </div>
      </div>
    `;
    this._bindWhenReady();
    return html;
  }
  _bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="home"].hp');
    if (root) this.bindEvents(root);
    else if (attempts < 60) setTimeout(() => this._bindWhenReady(attempts + 1), 50);
  }
  _root() { return document.querySelector('[data-page="home"].hp'); }
  bindEvents(root) {
    if (!root._homeCardFocusBound) {
      root._homeCardFocusBound = true;
      root.addEventListener("click", (e) => this._handleCardFocus(e), true);
      root.addEventListener("focusin", (e) => {
        const grid = root.querySelector(".bentoGrid");
        if (!grid) return;
        const card = e.target.closest(".musicCard[data-card]");
        if (!card || !grid.contains(card)) return;
        grid.querySelectorAll(".musicCard.is-card-focused").forEach((c) => c.classList.remove("is-card-focused"));
        card.classList.add("is-card-focused");
        grid.classList.add("has-card-focus");
      });
      document.addEventListener("click", (e) => { if (!root.isConnected) return; if (!root.contains(e.target)) this._clearCardFocus(); }, true);
    }
    if (!root || root._homeDelegated) return;
    root._homeDelegated = true;
    root.addEventListener("click", (e) => {
      const ui = this.ui;
      const state = ui.state;
      if (this._focusedGenre && !e.target.closest(".genreTile[data-genre]")) this._clearGenreFocus();
      const overlay = e.target.closest(".songArtworkOverlay");
      if (overlay) {
        const row = overlay.closest("[data-song-id]");
        const song = row && state.getSongById(row.dataset.songId);
        if (song) { e.stopPropagation(); ui.audioPlayer.playSong(song, null, true, "home"); }
        return;
      }
      const moreBtn = e.target.closest("[data-more-song]");
      if (moreBtn) { e.stopPropagation(); ui.contentEvents.showSongMenu(moreBtn.dataset.moreSong, e); return; }
      const albumMore = e.target.closest("[data-album-more]");
      if (albumMore) { e.stopPropagation(); window.contextMenu?.show(e.clientX, e.clientY, { artistId: albumMore.dataset.artistId, albumId: albumMore.dataset.albumId }); return; }
      const artistPlay = e.target.closest("[data-artist-play]");
      if (artistPlay) { e.stopPropagation(); this.ui.libraryPage?.playArtist(artistPlay.dataset.artistPlay); return; }
      const artistOpen = e.target.closest("[data-artist-open]");
      if (artistOpen) { e.stopPropagation(); this.ui.navigate("artist", artistOpen.dataset.artistOpen); return; }
      const dRefresh = e.target.closest("[data-discover-refresh]");
      if (dRefresh) { e.stopPropagation(); this._discoverCache = null; this._discoverIndex = 0; this._rebuildDiscoverCard(); return; }
      const dPrev = e.target.closest("[data-discover-prev]");
      if (dPrev) { e.stopPropagation(); if (!dPrev.disabled) this._moveDiscover(-1); return; }
      const dNext = e.target.closest("[data-discover-next]");
      if (dNext) { e.stopPropagation(); if (!dNext.disabled) this._moveDiscover(1); return; }
      const dSong = e.target.closest(".discoverSong[data-song-id]");
      if (dSong) { e.stopPropagation(); const song = state.getSongById(dSong.dataset.songId); if (song) ui.audioPlayer.playSong(song, null, true, "home"); return; }
      const genreTile = e.target.closest(".genreTile[data-genre]");
      if (genreTile) {
        e.stopPropagation();
        const name = genreTile.dataset.genre;
        if (this._focusedGenre !== name) { this._focusedGenre = name; this._syncGenreFocus(); return; }
        this._focusedGenre = null;
        this._syncGenreFocus();
        this._openGenre(name);
        return;
      }
      const releaseMore = e.target.closest("[data-release-more]");
      if (releaseMore) { e.stopPropagation(); window.contextMenu?.show(e.clientX, e.clientY, { artistId: releaseMore.dataset.artistId, albumId: releaseMore.dataset.albumId }); return; }
      const plPlay = e.target.closest("[data-playlist-play]");
      if (plPlay) {
        e.stopPropagation();
        const id = plPlay.dataset.playlistPlay;
        const pl = (state.playlists || []).find((p) => String(p.id) === String(id));
        const songs = pl ? (pl.songs || []).map((sid) => state.getSongById(sid)).filter(Boolean) : [];
        if (songs.length) ui.audioPlayer.playSong(songs[0], songs, true, "home");
        return;
      }
      const plShuffle = e.target.closest("[data-playlist-shuffle]");
      if (plShuffle) {
        e.stopPropagation();
        const id = plShuffle.dataset.playlistShuffle;
        const pl = (state.playlists || []).find((p) => String(p.id) === String(id));
        const songs = pl ? (pl.songs || []).map((sid) => state.getSongById(sid)).filter(Boolean) : [];
        const shuffled = this.shuffle(songs);
        if (shuffled.length) ui.audioPlayer.playSong(shuffled[0], shuffled, true, "home");
        return;
      }
      const plMore = e.target.closest("[data-playlist-more]");
      if (plMore) {
        e.stopPropagation();
        const id = plMore.dataset.playlistMore;
        if (typeof ui.openMoreMenu === "function") ui.openMoreMenu(e, "playlist", id);
        else if (typeof ui.playlistsPage?.showMenu === "function") ui.playlistsPage.showMenu(e, id);
        else if (window.contextMenu?.show) window.contextMenu.show(e.clientX, e.clientY, { playlistId: id });
        return;
      }
      const navBtn = e.target.closest("[data-nav], .cardAction[data-action]");
      if (navBtn) {
        e.stopPropagation();
        const dest = navBtn.dataset.nav || { "view-recents": "library", "view-releases": "library", "view-most-played": "library", "open-library": "library", "view-favorites": "favorites", "open-playlists": "playlists" }[navBtn.dataset.action];
        if (dest) ui.navigate(dest);
        return;
      }
      const libItem = e.target.closest(".libraryItem[data-library]");
      if (libItem) { e.stopPropagation(); ui.navigate(libItem.dataset.library === "playlists" ? "playlists" : "library"); return; }
      if (e.target.closest(".favoriteContent")) { e.stopPropagation(); ui.navigate("favorites"); return; }
      const collCard = e.target.closest(".collection-card[data-playlist-name]");
      if (collCard) {
        if (e.target.closest("button")) return;
        e.stopPropagation();
        collCard.classList.add("active");
        const name = collCard.dataset.playlistName;
        ui.navigate("playlists");
        setTimeout(() => { try { ui.playlistsPage?.viewPlaylist?.(name); } catch {} }, 60);
        return;
      }
      const row = e.target.closest(".song[data-song-id], .rankItem[data-song-id]");
      if (row) {
        if (e.target.closest("button")) return;
        e.stopPropagation();
        const song = state.getSongById(row.dataset.songId);
        if (song) ui.audioPlayer.playSong(song, null, true, "home");
        return;
      }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const collCard = e.target.closest(".collection-card[data-playlist-name]");
      if (!collCard) return;
      if (e.target.closest("button")) return;
      e.preventDefault(); e.stopPropagation();
      const name = collCard.dataset.playlistName;
      this.ui.navigate("playlists");
      setTimeout(() => { try { this.ui.playlistsPage?.viewPlaylist?.(name); } catch {} }, 60);
    });
  }
  _hydrateRow(row) {
    const songId = row.dataset.songId;
    const heart = row.querySelector("[data-fav-song]");
    if (heart) this.ui.contentEvents.setupHeartButton(heart, "song", heart.dataset.favSong);
    const more = row.querySelector("[data-more-song]");
    if (more && !more._homeMoreBound) {
      more._homeMoreBound = true;
      more.addEventListener("click", (e) => { e.stopPropagation(); this.ui.contentEvents.showSongMenu(songId, e); });
    }
  }
  _bindLiveUpdates() {
    if (Home._liveBound) return;
    Home._liveBound = true;
    window.addEventListener("mybeats:recently-played", (e) => this._onRecentlyPlayed(e.detail?.song));
    window.addEventListener("mybeats:playback-change", () => this._syncNowPlaying());
    window.addEventListener("mybeats:favorites-changed", () => this._syncFavorites());
    window.addEventListener("mybeats:play-counts", () => this._syncMostPlayed());
    window.addEventListener("mybeats:library-changed", () => { this._discoverCache = null; this._discoverIndex = 0; if (this._isActive()) this._rebuildDiscoverCard(); });
    window.addEventListener("mybeats:playlists-changed", () => { if (this._isActive()) this._syncCollections(); });
  }
  _isActive() { return this.ui.state.currentPage === "home" && !!this._root(); }
  _onRecentlyPlayed(song) {
    if (!song || !this._isActive()) return;
    const resolved = this.ui.state.getSongById(song.id) || song;
    const list = this._root().querySelector("#recentSongs");
    if (!list) return;
    list.querySelector(".hp-empty")?.remove();
    const sel = `.song[data-song-id="${String(resolved.id).replace(/"/g, '\\"')}"]`;
    const existing = list.querySelector(sel);
    const kids = [...list.querySelectorAll(".song")];
    const tops = new Map(kids.map((k) => [k, k.getBoundingClientRect().top]));
    const animateSiblings = () => {
      kids.forEach((k) => {
        const delta = (tops.get(k) ?? 0) - k.getBoundingClientRect().top;
        if (!delta) return;
        k.style.transition = "none";
        k.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => { k.style.transition = "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)"; k.style.transform = ""; });
      });
    };
    if (existing) {
      if (list.firstElementChild !== existing) { list.prepend(existing); animateSiblings(); }
      existing.classList.remove("song-bump");
      void existing.offsetWidth;
      existing.classList.add("song-bump");
      setTimeout(() => existing.classList.remove("song-bump"), 900);
    } else {
      const tpl = document.createElement("template");
      tpl.innerHTML = this.songRow(resolved).trim();
      const row = tpl.content.firstElementChild;
      row.classList.add("song-enter");
      list.prepend(row);
      animateSiblings();
      this._hydrateRow(row);
      row.addEventListener("animationend", () => row.classList.remove("song-enter"), { once: true });
    }
    this._syncNowPlaying();
    const rows = [...list.querySelectorAll(".song")];
    rows.slice(this.RECENT_LIMIT).forEach((row) => {
      row.classList.add("song-exit");
      row.addEventListener("animationend", () => row.remove(), { once: true });
      setTimeout(() => row.remove(), 400);
    });
  }
  _syncNowPlaying() {
    if (!this._isActive()) return;
    const root = this._root();
    const id = this.ui.state.currentSong?.id;
    root.querySelectorAll(".song.is-playing, .rankItem.is-playing, .discoverSong.is-playing").forEach((el) => el.classList.remove("is-playing"));
    if (id == null) return;
    const sel = `[data-song-id="${String(id).replace(/"/g, '\\"')}"]`;
    root.querySelectorAll(`.song${sel}, .rankItem${sel}, .discoverSong${sel}`).forEach((el) => el.classList.add("is-playing"));
  }
  _syncFavorites() {
    if (!this._isActive()) return;
    const root = this._root();
    const card = root.querySelector("#homeFavoritesCard");
    if (card) {
      card.innerHTML = this.favoritesCardInner();
      card.classList.remove("hp-swap");
      void card.offsetWidth;
      card.classList.add("hp-swap");
    }
  }
  _syncMostPlayed() {
    if (!this._isActive()) return;
    const list = this._root().querySelector("#mostPlayedSongs");
    if (!list) return;
    const entries = this.getMostPlayed(this.ui.state);
    list.innerHTML = entries.length ? entries.map((e, i) => this.rankRow(e, i)).join("") : this.emptyNote("Your most played songs will show up here once you start listening.");
    list.classList.remove("hp-swap");
    void list.offsetWidth;
    list.classList.add("hp-swap");
    this._syncNowPlaying();
  }
  _handleCardFocus(e) {
    const root = this._root();
    if (!root) return;
    const grid = root.querySelector(".bentoGrid");
    if (!grid) return;
    const card = e.target.closest(".musicCard[data-card]");
    if (!card || !grid.contains(card)) { this._clearCardFocus(); return; }
    if (card.classList.contains("is-card-focused")) { this._clearCardFocus(); return; }
    grid.querySelectorAll(".musicCard.is-card-focused").forEach((c) => c.classList.remove("is-card-focused"));
    card.classList.add("is-card-focused");
    grid.classList.add("has-card-focus");
  }
  _clearCardFocus() {
    const root = this._root();
    if (!root) return;
    const grid = root.querySelector(".bentoGrid");
    if (!grid) return;
    grid.classList.remove("has-card-focus");
    grid.querySelectorAll(".musicCard.is-card-focused").forEach((c) => c.classList.remove("is-card-focused"));
  }
}

class Library {
  constructor(ui) {
    this.ui = ui;
    this.view = "overview";
    this.filter = { type: "all", value: null, label: "" };
    this.sort = "recent";
    this.mode = "grid";
    this.query = "";
  }
  allSongs(state) {
    return state.enrichedLibrary.flatMap((a) => a.albums.flatMap((alb) => alb.songs.map((s) => ({
      ...s, artistId: a.id, albumId: alb.id, artist: a.artist, album: alb.album, coverUrl: alb.coverUrl, genre: a.genre || "", year: alb.year || "",
    }))));
  }
  allAlbums(state) {
    return state.enrichedLibrary.flatMap((a) => a.albums.map((alb) => {
      const totalSeconds = alb.songs.reduce((sum, s) => { const p = String(s.duration || "0:0").split(":"); return sum + (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }, 0);
      const plays = alb.songs.reduce((sum, s) => sum + (state.getPlayCount ? state.getPlayCount(s.id) : 0), 0);
      return { artistId: a.id, artistName: a.artist, albumId: alb.id, albumName: alb.album, coverUrl: alb.coverUrl, genre: a.genre || "", year: alb.year || "", songs: alb.songs, songCount: alb.songs.length, totalSeconds, plays };
    }));
  }
  allArtists(state) {
    return state.enrichedLibrary.map((a) => ({
      id: a.id, name: a.artist, imageUrl: a.imageUrl, genre: a.genre || "", albumCount: a.albums.length,
      songCount: a.albums.reduce((n, alb) => n + alb.songs.length, 0),
      plays: a.albums.reduce((n, alb) => n + alb.songs.reduce((m, s) => m + (state.getPlayCount ? state.getPlayCount(s.id) : 0), 0), 0),
    }));
  }
  allGenres(state) {
    const map = new Map();
    this.allSongs(state).forEach((s) => { if (!s.genre) return; map.set(s.genre, (map.get(s.genre) || 0) + 1); });
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }
  minutes(totalSeconds) {
    if (!totalSeconds) return "";
    const m = Math.round(totalSeconds / 60);
    return m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`;
  }
  esc(text) { return Utils.esc(text == null ? "" : String(text)); }
  pipeline(items) {
    let out = [...items];
    const f = this.filter;
    if (f.type !== "all" && f.value != null) {
      out = out.filter((it) => {
        if (f.type === "artist") return String(it.artistId ?? it.id) === String(f.value);
        if (f.type === "genre") return (it.genre || "").toLowerCase() === String(f.value).toLowerCase();
        if (f.type === "year") return String(it.year || "") === String(f.value);
        if (f.type === "decade") return it.year && Math.floor(Number(it.year) / 10) * 10 === Number(f.value);
        return true;
      });
    }
    if (this.query.trim()) {
      const q = this.query.trim().toLowerCase();
      out = out.filter((it) => [it.title, it.albumName, it.name, it.album, it.artist, it.artistName, it.genre].filter(Boolean).some((t) => String(t).toLowerCase().includes(q)));
    }
    const by = {
      title: (a, b) => String(a.title ?? a.albumName ?? a.name ?? "").localeCompare(String(b.title ?? b.albumName ?? b.name ?? "")),
      artist: (a, b) => String(a.artist ?? a.artistName ?? a.name ?? "").localeCompare(String(b.artist ?? b.artistName ?? b.name ?? "")),
      yearDesc: (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0),
      yearAsc: (a, b) => (Number(a.year) || 0) - (Number(b.year) || 0),
      mostPlayed: (a, b) => (b.plays || 0) - (a.plays || 0),
    }[this.sort];
    if (by) out.sort(by);
    return out;
  }
  albumCard(alb) {
    const isFav = this.ui.favorites.isAlbum(alb.albumId);
    const playData = this.esc(JSON.stringify({ artistId: alb.artistId, albumId: alb.albumId }));
    const meta = [`${alb.songCount} song${alb.songCount === 1 ? "" : "s"}`, this.minutes(alb.totalSeconds), alb.plays ? `${alb.plays} play${alb.plays === 1 ? "" : "s"}` : ""].filter(Boolean).join(" • ");
    return `
      <article class="albumCard" data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.albumId)}" tabindex="0" aria-label="${this.esc(alb.albumName)}">
        <div class="albumArtwork">
          <img src="${this.esc(alb.coverUrl || "")}" alt="${this.esc(alb.albumName)}" loading="lazy">
          <button class="albumPlay" type="button" aria-label="Play ${this.esc(alb.albumName)}" data-play-album='${playData}'>${Icons.player.play(16)}</button>
          <div class="albumHover">
            <div class="albumHoverTop">${alb.year ? `<span class="albumBadge">${this.esc(alb.year)}</span>` : ""}${alb.genre ? `<span class="albumBadge albumBadgeGenre">${this.esc(alb.genre)}</span>` : ""}</div>
            <div class="albumHoverBody"><h3 class="albumHoverTitle">${this.esc(alb.albumName)}</h3><p class="albumHoverArtist">${this.esc(alb.artistName)}</p><p class="albumHoverMeta">${meta}</p></div>
            <div class="albumHoverActions">
              <button type="button" class="albumHoverPlay" data-play-album='${playData}'>${Icons.player.play(13)} Play</button>
              <button type="button" class="albumHoverBtn${isFav ? " favorited" : ""}" aria-label="Favorite album" title="${isFav ? "Remove from favorites" : "Add to favorites"}" data-action="toggle-favorite-album" data-album-id="${this.esc(alb.albumId)}"><i class="fa-solid fa-heart ${isFav ? "liked-icon" : "not-liked-icon"}"></i></button>
              <button type="button" class="albumHoverBtn" aria-label="Add to queue" title="Add to queue" data-action="add-album-to-queue" data-album-id="${this.esc(alb.albumId)}">${Icons.general.plus(16)}</button>
              <button type="button" class="albumHoverBtn" aria-label="More options" title="More options" data-album-more data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.albumId)}">${Icons.general.moreVert(16)}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }
  albumRow(alb) {
    return `
      <div class="rowItem" data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.albumId)}">
        <div class="rowArtwork"><img src="${this.esc(alb.coverUrl || "")}" alt="" loading="lazy"></div>
        <span class="rowPrimary">${this.esc(alb.albumName)}</span>
        <span class="rowSecondary">${this.esc(alb.artistName)}</span>
        <span class="rowMeta">${alb.year ? this.esc(alb.year) + " • " : ""}${alb.songCount} songs</span>
        <div class="rowActions">
          <button type="button" class="tableAction" aria-label="Play" data-play-album='${this.esc(JSON.stringify({ artistId: alb.artistId, albumId: alb.albumId }))}'>${Icons.player.play(14)}</button>
          <button type="button" class="tableAction" aria-label="More options" data-album-more data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.albumId)}">${Icons.general.moreVert(16)}</button>
        </div>
      </div>
    `;
  }
  artistCard(a) {
    return `
      <article class="artistCard" data-artist-id="${this.esc(a.id)}">
        <div class="artistPortrait"><img src="${this.esc(a.imageUrl || "")}" alt="${this.esc(a.name)}" loading="lazy"></div>
        <div class="artistInfo">
          <span class="artistName">${this.esc(a.name)}</span>
          <p class="artistDetails">${a.albumCount} album${a.albumCount === 1 ? "" : "s"} • ${a.songCount} song${a.songCount === 1 ? "" : "s"}</p>
          <div class="artistActions"><button type="button" class="artistButton primary" data-artist-open="${this.esc(a.id)}">View Artist</button><button type="button" class="artistButton" data-artist-play="${this.esc(a.id)}">Play</button></div>
        </div>
      </article>
    `;
  }
  artistRow(a) {
    return `
      <div class="rowItem" data-artist-id="${this.esc(a.id)}">
        <div class="rowArtwork round"><img src="${this.esc(a.imageUrl || "")}" alt="" loading="lazy"></div>
        <span class="rowPrimary">${this.esc(a.name)}</span>
        <span class="rowSecondary">${this.esc(a.genre || "Artist")}</span>
        <span class="rowMeta">${a.albumCount} albums • ${a.songCount} songs</span>
        <div class="rowActions">
          <button type="button" class="tableAction" aria-label="Play artist" data-artist-play="${this.esc(a.id)}">${Icons.player.play(14)}</button>
          <button type="button" class="tableAction" aria-label="View artist" data-artist-open="${this.esc(a.id)}">${Icons.general.arrowRight(14)}</button>
        </div>
      </div>
    `;
  }
  playlistCard(pl, state) {
    const covers = pl.songs.map((id) => state.getSongById(id)).filter(Boolean).map((s) => s.coverUrl).filter(Boolean);
    while (covers.length < 4 && covers.length) covers.push(covers[covers.length % Math.max(covers.length, 1)] || "");
    const isPlFav = this.ui?.favorites?.isPlaylist?.(pl.id) || false;
    return `
      <article class="playlistCard" data-playlist-id="${this.esc(pl.id)}">
        <button type="button" class="heart playlistCardHeart${isPlFav ? " favorited is-favorite" : ""}" data-heart-playlist="${this.esc(pl.id)}" aria-label="Favorite playlist"></button>
        <div class="playlistMosaic">${covers.slice(0, 4).map((c) => `<img src="${this.esc(c)}" alt="" loading="lazy">`).join("") || `<div class="playlistMosaicEmpty">${Icons.general.playlist(28)}</div>`}</div>
        <div class="playlistInformation">
          <span class="playlistType">Playlist</span>
          <h3 class="playlistName">${this.esc(pl.name)}</h3>
          ${pl.description ? `<p class="playlistDescription">${this.esc(pl.description)}</p>` : ""}
          <span class="playlistCount">${pl.songs.length} song${pl.songs.length === 1 ? "" : "s"}</span>
        </div>
      </article>
    `;
  }
  genreCard(g) {
    return `<article class="genreCard" data-genre="${this.esc(g.name)}"><h3 class="genreName">${this.esc(g.name)}</h3><p class="genreCount">${g.count} song${g.count === 1 ? "" : "s"}</p></article>`;
  }
  songRow(s, i, queue) {
    const isFav = this.ui.favorites.isSong(s.id);
    return `
      <tr data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId)}" data-album-id="${this.esc(s.albumId)}" data-context='${this.esc(JSON.stringify({ artistId: s.artistId, albumId: s.albumId }))}'>
        <td class="tableNum">${i + 1}</td>
        <td>
          <div class="tableSong">
            <div class="tableArtwork"><img src="${this.esc(s.coverUrl || "")}" alt="" loading="lazy"></div>
            <div class="tableSongInformation"><span class="tableSongTitle">${this.esc(s.title)}</span><span class="tableSongArtist">${this.esc(s.artist)}</span></div>
          </div>
        </td>
        <td>${this.esc(s.album)}</td>
        <td>${this.esc(s.year || "—")}</td>
        <td>${this.esc(s.duration || "")}</td>
        <td>
          <div class="rowActions">
            <button type="button" class="tableAction heart${isFav ? " favorited is-favorite" : ""}" aria-label="Favorite" data-fav-song="${this.esc(s.id)}">${this.ui.likeStatus("song", isFav, false, null)}</button>
            <button type="button" class="tableAction" aria-label="More options" data-more-song="${this.esc(s.id)}">${Icons.general.moreVert(16)}</button>
          </div>
        </td>
      </tr>
    `;
  }
  emptyState(title, desc) {
    return `<div class="emptyState"><div class="emptyIcon">${Icons.general.search(34)}</div><h3 class="emptyTitle">${this.esc(title)}</h3><p class="emptyDescription">${this.esc(desc)}</p></div>`;
  }
  sectionHead(title, sub) {
    return `<div class="resultsHeader"><div><h2 class="resultsTitle">${this.esc(title)}</h2><p class="resultsSubtitle">${this.esc(sub)}</p></div></div>`;
  }
  contentFor(view) {
    const state = this.ui.state;
    if (view === "songs") {
      const songs = this.pipeline(this.allSongs(state));
      if (!songs.length) return this.emptyState("No songs match", "Try clearing your search or filters.");
      return `<div class="songTableWrapper"><table class="songTable"><thead><tr><th>#</th><th>Title</th><th>Album</th><th>Year</th><th>Time</th><th></th></tr></thead><tbody>${songs.map((s, i) => this.songRow(s, i)).join("")}</tbody></table></div>`;
    }
    if (view === "albums") {
      const albums = this.pipeline(this.allAlbums(state));
      if (!albums.length) return this.emptyState("No albums match", "Try clearing your search or filters.");
      return this.mode === "grid" ? `<div class="albumGrid">${albums.map((a) => this.albumCard(a)).join("")}</div>` : `<div class="rowsList">${albums.map((a) => this.albumRow(a)).join("")}</div>`;
    }
    if (view === "artists") {
      const artists = this.pipeline(this.allArtists(state));
      if (!artists.length) return this.emptyState("No artists match", "Try clearing your search or filters.");
      return this.mode === "grid" ? `<div class="artistGrid">${artists.map((a) => this.artistCard(a)).join("")}</div>` : `<div class="rowsList">${artists.map((a) => this.artistRow(a)).join("")}</div>`;
    }
    if (view === "playlists") {
      const pls = (state.playlists || []).filter((pl) => !this.query.trim() || pl.name.toLowerCase().includes(this.query.trim().toLowerCase()));
      if (!pls.length) return this.emptyState("No playlists yet", "Create a playlist and it will show up here.");
      return `<div class="playlistGrid">${pls.map((pl) => this.playlistCard(pl, state)).join("")}</div>`;
    }
    if (view === "genres") {
      const genres = this.pipeline(this.allGenres(state));
      if (!genres.length) return this.emptyState("No genres found", "Your library genres will appear here.");
      return `<div class="genreGrid">${genres.map((g) => this.genreCard(g)).join("")}</div>`;
    }
    const albums = this.allAlbums(state);
    const recentAlbums = this.pipeline([...albums].reverse()).slice(0, 10);
    const artists = this.pipeline(this.allArtists(state)).sort((a, b) => b.songCount - a.songCount).slice(0, 5);
    const playlists = (state.playlists || []).slice(0, 3);
    const genres = this.allGenres(state).slice(0, 8);
    return `
      ${recentAlbums.length ? `<section>${this.sectionHead("Recently Added", "New additions to your collection.")}<div class="albumGrid">${recentAlbums.map((a) => this.albumCard(a)).join("")}</div></section>` : ""}
      ${artists.length ? `<section style="margin-top: 3rem">${this.sectionHead("Popular Artists", "Artists with the most music in your collection.")}<div class="artistGrid">${artists.map((a) => this.artistCard(a)).join("")}</div></section>` : ""}
      ${playlists.length ? `<section style="margin-top: 3rem">${this.sectionHead("Explore Playlists", "Curated collections ready to explore.")}<div class="playlistGrid">${playlists.map((pl) => this.playlistCard(pl, state)).join("")}</div></section>` : ""}
      ${genres.length ? `<section style="margin-top: 3rem">${this.sectionHead("Browse by Genre", "Find something based on the mood.")}<div class="genreGrid">${genres.map((g) => this.genreCard(g)).join("")}</div></section>` : ""}
    `;
  }
  countFor(view) {
    const state = this.ui.state;
    const fmt = (n) => `${n.toLocaleString()} item${n === 1 ? "" : "s"}`;
    switch (view) {
      case "songs": return fmt(this.pipeline(this.allSongs(state)).length);
      case "albums": return fmt(this.pipeline(this.allAlbums(state)).length);
      case "artists": return fmt(this.pipeline(this.allArtists(state)).length);
      case "playlists": return fmt((state.playlists || []).length);
      case "genres": return fmt(this.pipeline(this.allGenres(state)).length);
      default: {
        const total = this.allAlbums(state).length + this.allArtists(state).length + (state.playlists || []).length + this.allGenres(state).length;
        return fmt(total);
      }
    }
  }
  viewMeta(view) {
    return ({ overview: ["Explore Your Collection", "A curated overview of your music."], songs: ["All Songs", "Every track in your library."], albums: ["All Albums", "Hover an album for the full story."], artists: ["All Artists", "The people behind your music."], playlists: ["All Playlists", "Your curated collections."], genres: ["All Genres", "Browse by mood and style."] }[view] || ["", ""]);
  }
  sortLabel() {
    return ({ recent: "Recently Added", title: "Title A–Z", artist: "Artist A–Z", yearDesc: "Newest First", yearAsc: "Oldest First", mostPlayed: "Most Played" }[this.sort]);
  }
  render() {
    const tabs = [["overview", "Overview"], ["songs", "Songs"], ["albums", "Albums"], ["artists", "Artists"], ["playlists", "Playlists"], ["genres", "Genres"]];
    const f = this.filter;
    const filterBtn = (type, label) => {
      const active = f.type === type;
      return `<button type="button" class="filterButton${active ? " has-filter is-active" : ""}" data-filter="${type}">${active ? this.esc(f.label) : label}<span class="filterArrow">${Icons.general.chevronDown()}</span></button>`;
    };
    const [title, sub] = this.viewMeta(this.view);
    const html = `
      <div data-page="library" class="bp browsePage">
        <div class="browseContainer">
          <header class="browseHeader">
            <div><span class="browseKicker">Explore</span><h1 class="browseTitle">Browse Music</h1><p class="browseDescription">Explore songs, albums, artists, playlists, genres, and everything else in your music collection.</p></div>
            <div class="searchWrapper"><span class="searchIcon" aria-hidden="true">${Icons.general.search(16)}</span><input type="search" class="librarySearch" id="librarySearch" placeholder="Search songs, artists, albums, playlists..." autocomplete="off" value="${this.esc(this.query)}"></div>
            <nav class="browseNavigation" aria-label="Browse categories">${tabs.map(([key, label]) => `<button class="browseTab${this.view === key ? " is-active" : ""}" type="button" data-view="${key}">${label}</button>`).join("")}</nav>
            <div class="filterToolbar">
              <div class="filterGroup">
                <button type="button" class="filterButton${f.type === "all" ? " is-active" : ""}" data-filter="all">All</button>
                ${filterBtn("artist", "Artist")}${filterBtn("genre", "Genre")}${filterBtn("year", "Year")}${filterBtn("decade", "Decade")}
              </div>
              <div class="displayControls">
                <button type="button" class="sortButton" data-action="sort">${this.sortLabel()}<span>${Icons.general.chevronDown()}</span></button>
                <div class="viewToggle" aria-label="Display mode">
                  <button type="button" class="viewButton${this.mode === "grid" ? " is-active" : ""}" aria-label="Grid view" data-view-mode="grid">${Icons.general.grid(15)}</button>
                  <button type="button" class="viewButton${this.mode === "list" ? " is-active" : ""}" aria-label="List view" data-view-mode="list">${Icons.general.list(15)}</button>
                </div>
              </div>
            </div>
          </header>
          <div class="resultsHeader" id="browseResultsHeader"><div><h2 class="resultsTitle">${title}</h2><p class="resultsSubtitle">${sub}</p></div><span class="resultsCount" id="browseResultsCount">${this.countFor(this.view)}</span></div>
          <section class="dynamicContent" id="browseContent" aria-live="polite">
            <div class="loadingLayer is-hidden" id="loadingLayer" aria-hidden="true"><div class="loadingContent"><div class="loadingSpinner" aria-hidden="true"></div><div><div class="loadingTitle">Searching your library…</div><p class="loadingDescription">Finding the music that matches your selection.</p></div></div></div>
            <div class="contentSection" data-content-view="${this.view}">${this.contentFor(this.view)}</div>
          </section>
        </div>
      </div>
    `;
    this._bindWhenReady();
    return html;
  }
  _bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="library"].bp');
    if (root) this.bindEvents(root);
    else if (attempts < 60) setTimeout(() => this._bindWhenReady(attempts + 1), 50);
  }
  _root() { return document.querySelector('[data-page="library"].bp'); }
  refreshContent(withLoading = false) {
    const root = this._root();
    if (!root) return;
    const swap = () => {
      const section = root.querySelector(".contentSection");
      if (section) { section.dataset.contentView = this.view; section.innerHTML = this.contentFor(this.view); }
      const [title, sub] = this.viewMeta(this.view);
      const head = root.querySelector("#browseResultsHeader");
      if (head) { head.querySelector(".resultsTitle").textContent = title; head.querySelector(".resultsSubtitle").textContent = sub; }
      const count = root.querySelector("#browseResultsCount");
      if (count) count.textContent = this.countFor(this.view);
      root.querySelectorAll(".browseTab").forEach((t) => t.classList.toggle("is-active", t.dataset.view === this.view));
      this.hydrate(root.querySelector("#browseContent"));
    };
    if (withLoading) {
      const layer = root.querySelector("#loadingLayer");
      layer?.classList.remove("is-hidden");
      setTimeout(() => { swap(); layer?.classList.add("is-hidden"); }, 260);
    } else swap();
  }
  hydrate(scope) {
    if (!scope) return;
    window.heartManager?.bindAll(scope);
    scope.querySelectorAll("[data-more-song]").forEach((el) => {
      if (el._moreBound) return;
      el._moreBound = true;
      el.addEventListener("click", (e) => { e.stopPropagation(); this.ui.contentEvents.showSongMenu(el.dataset.moreSong, e); });
    });
    scope.querySelectorAll("[data-play-album]").forEach((el) => {
      if (el._paBound) return;
      el._paBound = true;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const data = JSON.parse(el.dataset.playAlbum);
        const queue = Utils.albumQueue(this.ui.state, data.artistId, data.albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
      });
    });
    scope.querySelectorAll('[data-action="add-album-to-queue"]').forEach((el) => {
      if (el._aqBound) return;
      el._aqBound = true;
      el.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const state = this.ui.state;
        const albumId = el.dataset.albumId;
        const album = state.getAlbumById(albumId);
        if (!album?.songs?.length) return;
        const queue = Utils.albumQueue(state, album.artistId, albumId);
        const currentQueue = state.queue || [];
        state.queue = [...currentQueue, ...queue];
        if (state.currentSong) state.queueIndex = state.queue.findIndex((s) => s.id == state.currentSong.id);
        state.showToast(`Added ${queue.length} song${queue.length === 1 ? "" : "s"} to queue`);
      });
    });
  }
  closeMenus() { this._root()?.querySelectorAll(".filterMenu").forEach((m) => m.remove()); }
  openMenu(anchorBtn, items, current, onSelect) {
    this.closeMenus();
    const root = this._root();
    if (!root) return;
    const menu = document.createElement("div");
    menu.className = "filterMenu";
    menu.innerHTML = items.map((it) => `<button type="button" class="filterMenuItem${String(it.value) === String(current) ? " is-active" : ""}" data-value="${this.esc(it.value)}"><span>${this.esc(it.label)}</span>${it.count != null ? `<span class="count">${it.count}</span>` : ""}</button>`).join("");
    root.appendChild(menu);
    const rect = anchorBtn.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    menu.style.top = `${rect.bottom - rootRect.top + root.scrollTop + 6}px`;
    menu.style.left = `${Math.max(8, rect.left - rootRect.left)}px`;
    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".filterMenuItem");
      if (!item) return;
      e.stopPropagation();
      onSelect(item.dataset.value);
      this.closeMenus();
    });
    setTimeout(() => {
      this._menuCloser = (e) => { if (!menu.contains(e.target)) this.closeMenus(); };
      document.addEventListener("click", this._menuCloser, { once: true });
    }, 0);
  }
  openFilterMenu(btn, type) {
    const state = this.ui.state;
    let items = [];
    if (type === "artist") items = this.allArtists(state).sort((a, b) => a.name.localeCompare(b.name)).map((a) => ({ value: a.id, label: a.name, count: a.songCount }));
    else if (type === "genre") items = this.allGenres(state).map((g) => ({ value: g.name, label: g.name, count: g.count }));
    else if (type === "year") { const years = [...new Set(this.allAlbums(state).map((a) => a.year).filter(Boolean))].sort().reverse(); items = years.map((y) => ({ value: y, label: y })); }
    else if (type === "decade") { const decades = [...new Set(this.allAlbums(state).map((a) => a.year).filter(Boolean).map((y) => Math.floor(Number(y) / 10) * 10))].sort((a, b) => b - a); items = decades.map((d) => ({ value: d, label: `${d}s` })); }
    if (!items.length) { state.showToast?.("Nothing to filter by yet"); return; }
    this.openMenu(btn, items, this.filter.type === type ? this.filter.value : null, (value) => {
      const it = items.find((i) => String(i.value) === String(value));
      this.filter = { type, value, label: it ? it.label : value };
      this.ui.render();
    });
  }
  openSortMenu(btn) {
    const items = [
      { value: "recent", label: "Recently Added" }, { value: "title", label: "Title A–Z" }, { value: "artist", label: "Artist A–Z" },
      { value: "yearDesc", label: "Newest First" }, { value: "yearAsc", label: "Oldest First" }, { value: "mostPlayed", label: "Most Played" },
    ];
    this.openMenu(btn, items, this.sort, (value) => { this.sort = value; this.ui.render(); });
  }
  playArtist(artistId) {
    const state = this.ui.state;
    const artist = state.getArtistById(artistId);
    if (!artist) return;
    const queue = artist.albums.flatMap((alb) => alb.songs.map((s) => state.getSongById(s.id)).filter(Boolean));
    if (queue.length) { this.ui.audioPlayer.playSong(queue[0], queue, true, "artist"); state.showToast?.(`Playing ${artist.artist}`); }
  }
  bindEvents(root) {
    if (!root || root._browseDelegated) return;
    root._browseDelegated = true;
    const ui = this.ui;
    root.addEventListener("click", (e) => {
      const tab = e.target.closest(".browseTab");
      if (tab) { e.stopPropagation(); if (tab.dataset.view !== this.view) { this.view = tab.dataset.view; this.refreshContent(true); } return; }
      const filterBtn = e.target.closest(".filterButton");
      if (filterBtn) {
        e.stopPropagation();
        const type = filterBtn.dataset.filter;
        if (type === "all") { if (this.filter.type !== "all") { this.filter = { type: "all", value: null, label: "" }; ui.render(); } return; }
        this.openFilterMenu(filterBtn, type);
        return;
      }
      if (e.target.closest('[data-action="sort"]')) { e.stopPropagation(); this.openSortMenu(e.target.closest('[data-action="sort"]')); return; }
      const viewBtn = e.target.closest(".viewButton[data-view-mode]");
      if (viewBtn) {
        e.stopPropagation();
        if (viewBtn.dataset.viewMode !== this.mode) {
          this.mode = viewBtn.dataset.viewMode;
          root.querySelectorAll(".viewButton").forEach((b) => b.classList.toggle("is-active", b === viewBtn));
          this.refreshContent(false);
        }
        return;
      }
      const albumMore = e.target.closest("[data-album-more]");
      if (albumMore) { e.stopPropagation(); window.contextMenu?.show(e.clientX, e.clientY, { artistId: albumMore.dataset.artistId, albumId: albumMore.dataset.albumId }); return; }
      const artistPlay = e.target.closest("[data-artist-play]");
      if (artistPlay) { e.stopPropagation(); this.playArtist(artistPlay.dataset.artistPlay); return; }
      const artistOpen = e.target.closest("[data-artist-open]");
      if (artistOpen) { e.stopPropagation(); ui.navigate("artist", artistOpen.dataset.artistOpen); return; }
      const genre = e.target.closest(".genreCard[data-genre]");
      if (genre) { e.stopPropagation(); if (window.pagesActions?.playGenre) window.pagesActions.playGenre(genre.dataset.genre); return; }
      const plCard = e.target.closest(".playlistCard[data-playlist-id]");
      if (plCard) {
        e.stopPropagation();
        const pl = ui.state.playlists.find((p) => String(p.id) === String(plCard.dataset.playlistId));
        if (pl) { ui.state.selectedPlaylistName = pl.name; ui.state.selectedPlaylistId = pl.id; ui.navigate("playlists"); }
        return;
      }
      const songRow = e.target.closest("tr[data-song-id]");
      if (songRow) {
        if (e.target.closest("button")) return;
        e.stopPropagation();
        const song = ui.state.getSongById(songRow.dataset.songId);
        if (!song) return;
        const queue = [...root.querySelectorAll("tr[data-song-id]")].map((r) => ui.state.getSongById(r.dataset.songId)).filter(Boolean);
        ui.audioPlayer.playSong(song, queue.length ? queue : null, true, "library");
        return;
      }
      const rowItem = e.target.closest(".rowItem[data-artist-id]");
      if (rowItem) { if (e.target.closest("button")) return; e.stopPropagation(); ui.navigate("artist", rowItem.dataset.artistId, rowItem.dataset.albumId || null); return; }
    });
    const searchInput = root.querySelector("#librarySearch");
    if (searchInput && !searchInput._browseSearchBound) {
      searchInput._browseSearchBound = true;
      let t;
      searchInput.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => { this.query = searchInput.value; this.refreshContent(false); }, 160);
      });
    }
  }
  destroy() {}
}

class Favorites {
  constructor(ui) { this.ui = ui; }
  emptyState(emoji, title, desc) {
    return `
      <div class="emptyState animate-fadeInUp" style="text-align: center; padding: 4rem 0;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">${emoji}</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: rgb(var(--textPrimary));">${title}</h3>
        <p style="color: rgba(var(--textSecondary)/1);">${desc}</p>
      </div>
    `;
  }
  renderSongCards(songs) {
    if (!songs.length) return '';
    const groups = {};
    songs.forEach(song => { const genre = song.genre || 'Unknown Genre'; if (!groups[genre]) groups[genre] = []; groups[genre].push(song); });
    return `
      <div class="song-list animate-fadeInUp">
        ${Object.entries(groups).map(([genre, genreSongs]) => `
          <section class="song-genre-group">
            <h2 class="song-genre-title">${genre}</h2>
            <div class="song-rows">
              ${genreSongs.map((s, i) => `
                <div class="song-row" style="--d: ${i * 30}ms">
                  <div class="song-row-art" onclick="event.stopPropagation(); window.pagesActions.playSong('${s.id}', 'favorites')">
                    <img src="${s.coverUrl}" loading="lazy" alt="">
                    <div class="song-row-play">${Icons.player.play(16)}</div>
                  </div>
                  <div class="song-row-info">
                    <span class="song-row-title">${s.title}</span>
                    <span class="song-row-artist">${s.artist}</span>
                  </div>
                  <button class="heart ${this.ui.favorites.isSong(s.id) ? 'favorited' : ''}" data-fav-song="${s.id}" onclick="event.stopPropagation();">${this.ui.likeStatus('song', this.ui.favorites.isSong(s.id), false, null)}</button>
                </div>
              `).join('')}
            </div>
          </section>
        `).join('')}
      </div>
    `;
  }
  renderAlbumCards(albums) {
    return `
      <div class="ui-grid album-grid animate-fadeInUp">
        ${albums.map((alb, i) => `
          <div class="ui-card album-card" style="--d: ${i * 40}ms" data-album-id="${alb.id}">
            <div class="imgBx" onclick="window.uiManager.navigate('artist', '${alb.artistId}', '${alb.id}')"><img src="${alb.coverUrl}" loading="lazy" alt=""></div>
            <div class="content">
              <div class="contentBx"><h3>${alb.album}<br><span>${alb.artistName}</span></h3></div>
              <ul class="sci">
                <li style="--i:1"><button class="icon-btn" onclick="event.stopPropagation(); window.pagesActions.playAlbum('${alb.artistId}', '${alb.id}')" title="Play">${Icons.player.play(18)}</button></li>
                <li style="--i:2"><button class="icon-btn" onclick="event.stopPropagation(); window.pagesActions.shuffleAlbum('${alb.artistId}', '${alb.id}')" title="Shuffle Play">${Icons.player.shuffle ? Icons.player.shuffle(18) : ''}</button></li>
                <li style="--i:3"><button class="icon-btn" onclick="event.stopPropagation(); window.uiManager.openMoreMenu(event, 'album', '${alb.id}')" title="More">${Icons.general.more(18) || Icons.general.moreHoriz(18)}</button></li>
              </ul>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  renderArtistCards(artists) {
    return `
      <div class="ui-grid animate-fadeInUp">
        ${artists.map((a, i) => `
          <div class="ui-card" data-artist-id="${a.id}" style="--d: ${i * 40}ms" onclick="window.uiManager.navigate('artist', '${a.id}')">
            <div class="ui-art-wrap" style="border-radius: 50%;"><img src="${a.imageUrl}" loading="lazy" alt=""></div>
            <div class="ui-info" style="justify-content: center; text-align: center;">
              <div class="ui-text"><span class="ui-title">${a.artist}</span><span class="ui-sub">${a.genre || "Artist"}</span></div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }
  renderPlaylistCards(playlists) {
    const state = this.ui.state;
    return `
      <div class="ui-grid animate-fadeInUp">
        ${playlists.map((pl, i) => {
          const covers = pl.songs.map(id => state.getSongById(id)).filter(Boolean).slice(0, 4).map(s => s.coverUrl);
          return `
          <div class="ui-card" data-playlist-view="${Utils.esc(pl.name)}" style="--d: ${i * 40}ms" onclick="window.uiManager.navigate('playlists'); window.uiManager.playlistsPage.viewPlaylist('${Utils.esc(pl.name)}')">
            <div class="ui-art-wrap mosaic-wrap">
              ${covers.length ? covers.map(c => `<img src="${c}" alt="">`).join("") : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
              <button class="ui-play-btn" data-playlist-play="${pl.id}" onclick="event.stopPropagation();">${Icons.player.play(18)}</button>
            </div>
            <div class="ui-info">
              <div class="ui-text"><span class="ui-title">${Utils.esc(pl.name)}</span><span class="ui-sub">${pl.songs.length} songs</span></div>
            </div>
          </div>
        `}).join("")}
      </div>
    `;
  }
  render() {
    const state = this.ui.state;
    const tabs = [{ key: "songs", label: "Songs" }, { key: "albums", label: "Albums" }, { key: "artists", label: "Artist" }, { key: "playlists", label: "Playlists" }];
    return `
      <div data-page="favorites" class="page animate-fadeInUp">
        <header class="pageHeader">
          <h1 class="pageTitle">Favorites</h1>
          <nav class="tabs">${tabs.map(({ key, label }) => `<button class="tab-btn ${key === state.favoritesTab ? "active" : ""}" data-tab="${key}" onclick="window.uiManager.refreshFavoritesContent('${key}')">${label}</button>`).join("")}</nav>
        </header>
        <div id="favorites-content">${this.tabContent(state.favoritesTab)}</div>
      </div>
    `;
  }
  tabContent(tab) {
    const state = this.ui.state;
    if (tab === "songs") {
      const songIds = state.favoriteSongs;
      if (!songIds.length) return this.emptyState("🎵", "No favorite songs yet", "Tap the heart on any track to save it.");
      return this.renderSongCards(songIds.map(id => state.getSongById(id)).filter(Boolean));
    }
    if (tab === "artists") {
      const artistIds = state.favoriteArtists;
      if (!artistIds.length) return this.emptyState("🎤", "No favorite artists yet", "Save the artists you love most.");
      return this.renderArtistCards(artistIds.map(id => state.getArtistById(id)).filter(Boolean));
    }
    if (tab === "albums") {
      const albumIds = state.favoriteAlbums;
      if (!albumIds.length) return this.emptyState("💿", "No favorite albums yet", "Mark standout albums to keep them close.");
      return this.renderAlbumCards(albumIds.map(id => state.getAlbumById(id)).filter(Boolean));
    }
    if (tab === "playlists") return state.playlists.length ? this.renderPlaylistCards(state.playlists) : this.emptyState("📚", "No playlists yet", "Create a playlist to curate your mood.");
    return "";
  }
}

class Playlists {
  constructor(ui) { this.ui = ui; }
  viewPlaylist(name) { this.ui.state.selectedPlaylistName = name; this.ui.render(); }
  render() {
    const state = this.ui.state;
    const viewing = state.selectedPlaylistName;
    return `
      <div data-page="playlists" class="page animate-fadeInUp">
        <header class="pageHeader">
          <h1 class="pageTitle">${viewing || "Playlists"}</h1>
          ${!viewing ? `<button class="action-btn primary" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" onclick="window.uiManager.showSpinner(); setTimeout(() => { document.getElementById('create-playlist-modal')?.classList.remove('hidden'); window.uiManager.hideSpinner(); }, window.uiManager.fragmentLoadDelay);">+ New</button>` : `<button class="action-btn" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" onclick="window.uiManager.playlistsPage.viewPlaylist(null)">&larr; Back</button>`}
        </header>
        ${viewing ? this.playlistViewer(viewing) : this.playlistsGrid()}
      </div>
    `;
  }
  playlistsGrid() {
    const state = this.ui.state;
    if (!state.playlists.length) return `<div style="text-align: center; padding: 4rem 0; color: rgba(var(--textSecondary)/1);">No playlists yet.</div>`;
    return `
      <div class="playlist-grid animate-fadeInUp">
        ${state.playlists.map((pl) => {
          const covers = pl.songs.map(id => state.getSongById(id)).filter(Boolean).slice(0, 4).map(s => s.coverUrl);
          return `
            <div class="playlist-card" onclick="window.uiManager.playlistsPage.viewPlaylist('${Utils.esc(pl.name)}')">
              <div class="mosaic-wrap">
                ${covers.length ? covers.map(c => `<img src="${c}">`).join("") : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
                <button class="playlist-play-btn" data-playlist-play="${pl.id}" onclick="event.stopPropagation();">${Icons.player.play(20)}</button>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="min-width: 0;">
                  <span style="font-weight: 700; font-size: 1rem; color: rgb(var(--textPrimary)); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.esc(pl.name)}</span>
                  <span style="font-size: 0.8rem; color: rgba(var(--textSecondary)/1); display: block;">by You</span>
                </div>
                <button class="ui-more-btn" onclick="event.stopPropagation(); window.favoritesPlaylists.openModal()">${Icons.general.moreVert(18)}</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
  playlistViewer(name) {
    const state = this.ui.state;
    const playlist = state.playlists.find(p => p.name === name);
    if (!playlist) return `<div>Playlist not found</div>`;
    const songs = playlist.songs.map(id => state.getSongById(id)).filter(Boolean);
    return `
      <div class="animate-fadeInUp">
        <div class="viewer-header">
          <p style="color: rgba(var(--textSecondary)/1); font-size: 0.9rem;">Experience this playlist curated by you.<br>${songs.length} Songs</p>
          <div class="action-bar">
            <button class="action-btn" data-action="download-playlist" title="Download"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <button class="action-btn" onclick="window.uiManager.editPlaylist('${playlist.id}')" title="Edit"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
            <button class="action-btn primary" data-playlist-play="${playlist.id}" style="width: 50px; height: 50px;" title="Play">${Icons.player.play(24)}</button>
            <button class="action-btn share-playlist-btn" data-playlist-id="${playlist.id}" title="Share"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
            <button class="action-btn" title="More">${Icons.general.moreHoriz(18)}</button>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${songs.map((s, i) => `
            <div class="list-row" data-song-id="${s.id}" data-playlist-id="${playlist.id}" data-play-source="playlist" style="cursor: pointer;" onclick="window.pagesActions.playSong(this.dataset.songId, 'playlist')">
              <span style="color: rgba(var(--textOthers)/1); font-size: 0.85rem; font-weight: 600; text-align: center;">${i + 1}</span>
              <img src="${s.coverUrl}" class="row-thumb">
              <div style="min-width: 0;"><span class="row-title">${Utils.esc(s.title)}</span><span class="row-sub">${Utils.esc(s.artist)} • ${Utils.esc(s.album)}</span></div>
              <button class="ui-more-btn" data-more-song="${s.id}" onclick="event.stopPropagation();">${Icons.general.moreHoriz(20)}</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }
}

class Artists {
  constructor(ui) {
    this.ui = ui;
    this._tabsScrollHandler = null;
    this._tabsRaf = null;
    this._pinned = false;
  }
  render() {
    const state = this.ui.state;
    const artistId = state.artistId;
    if (!artistId) return `<div class="artist-missing">Artist not found</div>`;
    const artist = state.getArtistById(artistId);
    if (!artist) return `<div class="artist-missing">Artist not found</div>`;
    const activeAlbumId = state.selectedAlbumId;
    const activeAlbum = activeAlbumId ? artist.albums.find((a) => IdUtils.norm(a.id) === IdUtils.norm(activeAlbumId)) : artist.albums[0];
    if (!activeAlbum) return `<div class="artist-missing">Album not found</div>`;
    const similarIds = artist.similar || [];
    const similarArtists = similarIds.map((id) => state.getArtistById(id)).filter(Boolean);
    const rows = [similarArtists.slice(0, 4), similarArtists.slice(4, 8), similarArtists.slice(8, 12)];
    const html = `
      <div class="artist-page" data-page="artist">
        <div class="artist-shell">
          ${this.renderHeader(artist)}
          <div class="albumTabsSentinel" aria-hidden="true"></div>
          ${this.renderAlbumTabs(artist, activeAlbum)}
          <div class="artist-heroBody">
            <div class="hero-stage">
              <div class="hero-left">${this.renderHeroCover(artist, activeAlbum)}${this.renderMetaSummary(artist, activeAlbum)}</div>
              <div class="hero-right">${this.renderSongsList(artist, activeAlbum)}</div>
            </div>
          </div>
          ${similarIds.length ? this.similarMarquee(rows, artist.id) : ""}
        </div>
      </div>
    `;
    this._bindWhenReady();
    return html;
  }
  renderHeader(artist) {
    const isFav = this.ui.favorites.isArtist(artist.id);
    return `
      <header class="artist-header">
        <div class="artist-header-left"><span class="artist-header-kicker">Artist</span><h1 class="artist-name">${Utils.esc(artist.artist)}</h1></div>
        <button type="button" class="artist-heart ${isFav ? "favorited" : ""}" data-artist-heart="${Utils.esc(artist.id)}" aria-label="Favorite artist">${this.ui.likeStatus("artist", isFav, false, null)}</button>
      </header>
    `;
  }
  renderAlbumTabs(artist, activeAlbum) {
    return `
      <nav class="albumTabsBar" data-area="albums" aria-label="Albums">
        <div class="albumTabs-scroll">
          ${artist.albums.map((alb) => `<button type="button" class="albumTab ${alb.id === activeAlbum.id ? "active" : ""}" data-artist-id="${Utils.esc(artist.id)}" data-album-id="${Utils.esc(alb.id)}" aria-pressed="${alb.id === activeAlbum.id}">${Utils.esc(alb.album)}</button>`).join("")}
        </div>
      </nav>
    `;
  }
  renderHeroCover(artist, activeAlbum) {
    return `
      <div class="hero-cover">
        <img src="${Utils.esc(activeAlbum.coverUrl)}" alt="${Utils.esc(activeAlbum.album)}" loading="eager">
        <div class="hero-scrim"></div>
        <div class="hero-overlay">
          <div class="album-meta"><h2 class="album-title">${Utils.esc(activeAlbum.album)}</h2><span class="track-count">${activeAlbum.songs.length} track${activeAlbum.songs.length === 1 ? "" : "s"}</span></div>
          <button type="button" class="play-all" data-play-album='${JSON.stringify({ artistId: artist.id, albumId: activeAlbum.id })}' aria-label="Shuffle album">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/><polygon points="10,7 17,12 10,17" fill="currentColor"/></svg>
            <span class="shuffle-text">Shuffle</span>
          </button>
        </div>
      </div>
    `;
  }
  renderMetaSummary(artist, activeAlbum) {
    const isAlbumFav = this.ui.favorites.isAlbum(activeAlbum.id);
    return `
      <div data-area="meta-summary" class="hero-meta">
        <div data-list="editorial-brief" class="bento-meta-node">
          <div class="brief-wrapper"><span class="brief-mono">${Utils.esc(activeAlbum.year || "2024")}</span><span class="brief-heading">${Utils.esc(activeAlbum.status || "Double Platinum")}</span></div>
          <a href="#" class="brief-anchor" id="bento-album-share" data-album-title="${Utils.esc(activeAlbum.album)}">Share this album</a>
        </div>
        <div data-list="utility-hub" class="bento-meta-node">
          <button type="button" class="hub-pill-btn" id="bento-offline-toggle" data-album-id="${Utils.esc(activeAlbum.id)}"><span class="hub-btn-txt">Listen Offline</span></button>
          <div class="hub-group">
            <h5 class="hub-group-title">Add to library</h5>
            <div class="hub-links">
              <a href="#" class="hub-link-item" data-action="add-album-to-playlist" data-album-id="${Utils.esc(activeAlbum.id)}">Playlist</a>
              <a href="#" class="hub-link-item" data-action="add-album-to-queue" data-album-id="${Utils.esc(activeAlbum.id)}">Queue</a>
              <a href="#" class="hub-link-item" data-action="toggle-favorite-album" data-album-id="${Utils.esc(activeAlbum.id)}">${isAlbumFav ? "Remove Favorite" : "Favorites"}</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  renderSongsList(artist, activeAlbum) {
    return `<div data-list="songs" data-type="album" class="hero-songs"><div id="songsList" class="body">${activeAlbum.songs.map((song, i) => this.createSongRow(song, i, artist, activeAlbum)).join("")}</div></div>`;
  }
  createSongRow(song, index, artist, album) {
    const isFav = this.ui.favorites.isSong(song.id);
    const isPlaying = this.ui.state.currentSong?.id == song.id;
    return `
      <div class="songItem ${isPlaying ? "playing" : ""}" data-song-id="${Utils.esc(song.id)}" data-context='${JSON.stringify({ artistId: artist.id, albumId: album.id })}'>
        <div class="left">
          <div class="trackNum">${index + 1}</div>
          <div class="play"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/><polygon points="10,7 17,12 10,17" fill="currentColor"/></svg></div>
        </div>
        <div class="center"><div class="title"><span>${Utils.esc(song.title)}</span></div></div>
        <div class="right">
          <div class="time">${Utils.esc(song.duration || "")}</div>
          <button type="button" class="heart ${isFav ? "favorited" : ""}" data-fav-song="${Utils.esc(song.id)}" aria-label="Favorite song">${this.ui.likeStatus("song", isFav, false, null)}</button>
          <button type="button" class="downloadBtn" data-action="download-song" data-song-id="${Utils.esc(song.id)}" data-song-title="${Utils.esc(song.title)}" data-song-thumbnail="${Utils.esc(album.coverUrl)}" aria-label="Download song"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          <button type="button" class="moreMenu" data-more-song="${Utils.esc(song.id)}" aria-label="More options">${Icons.general.moreVert(18)}</button>
        </div>
      </div>
    `;
  }
  similarMarquee(rows, artistId) {
    const configs = [["left", 40], ["right", 45], ["left", 35]];
    const marquee = (artists, dir, dur) => `
      <div class="marquee-container">
        <div class="marquee-track marquee-${dir}" style="animation-duration: ${dur}s;">
          ${[...artists, ...artists].map((a) => `<span class="artist-name-pill animate-fadeIn" data-artist-id="${Utils.esc(a.id)}" data-artist-name="${Utils.esc(a.artist)}" onclick="window.uiManager.showSpinner(); setTimeout(() => { window.uiManager.contentEvents.showArtistPopover('${Utils.esc(a.id)}', event); window.uiManager.hideSpinner(); }, window.uiManager.popoverDelay);">${Utils.esc(a.artist)}</span>`).join("")}
        </div>
      </div>
    `;
    return `
      <div data-area="similar" class="similar-artists-section">
        <h5 class="similar-artists-title">Listen to similar Artists</h5>
        ${rows.map((row, i) => (row.length ? marquee(row, ...configs[i]) : "")).join("")}
      </div>
    `;
  }
  _bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="artist"]');
    if (root) this._afterRender();
    else if (attempts < 60) setTimeout(() => this._bindWhenReady(attempts + 1), 50);
  }
  _afterRender() { this._watchAlbumTabsPin(); this._bindAlbumTabsClick(); }
  _bindAlbumTabsClick() {
    const root = this._root();
    if (!root) return;
    const bar = root.querySelector(".albumTabsBar");
    if (!bar || bar._bound) return;
    bar._bound = true;
    bar.addEventListener("click", (e) => {
      const tab = e.target.closest(".albumTab");
      if (!tab) return;
      const artistId = tab.dataset.artistId;
      const albumId = tab.dataset.albumId;
      if (!artistId || !albumId) return;
      bar.querySelectorAll(".albumTab.active").forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-pressed", "false"); });
      tab.classList.add("active");
      tab.setAttribute("aria-pressed", "true");
      try { window.uiManager?.refreshArtistContent?.(artistId, albumId); } catch { return; }
      setTimeout(() => { this._watchAlbumTabsPin(); this._scrollHeroIntoView(); }, 40);
    });
  }
  _scrollHeroIntoView() {
    const root = this._root();
    if (!root) return;
    const sentinel = root.querySelector(".albumTabsSentinel");
    if (!sentinel) return;
    const PIN_TOP = 56;
    const rect = sentinel.getBoundingClientRect();
    const sentinelBottomPage = rect.bottom + window.scrollY;
    const targetY = Math.max(0, sentinelBottomPage - PIN_TOP + 2);
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }
  _watchAlbumTabsPin() {
    const root = this._root();
    if (!root) return;
    if (this._tabsScrollHandler) { window.removeEventListener("scroll", this._tabsScrollHandler, true); this._tabsScrollHandler = null; }
    if (this._tabsRaf) { cancelAnimationFrame(this._tabsRaf); this._tabsRaf = null; }
    const bar = root.querySelector(".albumTabsBar");
    const sentinel = root.querySelector(".albumTabsSentinel");
    if (!bar || !sentinel) return;
    const PIN_TOP = 56;
    const compute = () => {
      this._tabsRaf = null;
      if (!bar.isConnected || !sentinel.isConnected) return;
      const sRect = sentinel.getBoundingClientRect();
      const pinned = sRect.bottom <= PIN_TOP + 0.5;
      if (pinned !== this._pinned) { this._pinned = pinned; bar.classList.toggle("is-pinned", pinned); }
    };
    this._tabsScrollHandler = () => { if (this._tabsRaf) return; this._tabsRaf = requestAnimationFrame(compute); };
    this._pinned = false;
    bar.classList.remove("is-pinned");
    compute();
    window.addEventListener("scroll", this._tabsScrollHandler, { passive: true, capture: true });
  }
  _root() { return document.querySelector('[data-page="artist"]'); }
}

class EditPlaylist {
  constructor(ui) { this.ui = ui; }
  render() {
    const state = this.ui.state;
    const id = state.editingPlaylistId;
    const pl = state.playlists.find((p) => String(p.id) === String(id));
    if (!pl) return `<div class="page animate-fadeInUp"><div class="missing">Playlist not found</div></div>`;
    const songs = pl.songs.map((sid, i) => { const song = state.getSongById(sid); return { song, index: i, sid: String(sid) }; });
    const totalDuration = songs.reduce((sum, item) => {
      const parts = item.song?.duration?.split(":") || ["0", "0"];
      if (parts.length === 2) return sum + parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return sum;
    }, 0);
    const durationText = Utils.fmtTime(totalDuration);
    return `
      <div data-page="edit-playlist" class="page animate-fadeInUp">
        <div class="edit-playlist-header">
          <button class="edit-playlist-back" data-action="back" aria-label="Back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
          <h1 class="edit-playlist-title">Edit Playlist</h1>
          <button class="edit-playlist-done" data-action="done">Done</button>
        </div>
        <div class="edit-playlist-hero">
          <div class="edit-playlist-cover">
            ${this._coverPreview(pl)}
            <button class="edit-playlist-cover-btn" data-action="change-cover" title="Change cover"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          </div>
          <div class="edit-playlist-meta-fields">
            <div class="edit-playlist-field"><label for="edit-pl-name">Name</label><input type="text" id="edit-pl-name" class="edit-playlist-input" value="${Utils.esc(pl.name)}" maxlength="80" data-playlist-id="${Utils.esc(pl.id)}"></div>
            <div class="edit-playlist-field"><label for="edit-pl-desc">Description</label><textarea id="edit-pl-desc" class="edit-playlist-textarea" rows="2" maxlength="240" data-playlist-id="${Utils.esc(pl.id)}">${Utils.esc(pl.description || "")}</textarea></div>
            <div class="edit-playlist-field">
              <label>Tags</label>
              <div class="edit-playlist-tags" id="edit-pl-tags">
                ${(pl.tags || []).map((t) => `<span class="edit-playlist-tag" data-tag="${Utils.esc(t)}">${Utils.esc(t)}<button type="button" class="edit-playlist-tag-remove" data-tag="${Utils.esc(t)}">×</button></span>`).join("")}
                <input type="text" class="edit-playlist-tag-input" placeholder="Add tag + Enter" maxlength="20">
              </div>
            </div>
            <p class="edit-playlist-stats">${pl.songs.length} songs • ${durationText}</p>
          </div>
        </div>
        <div class="edit-playlist-toolbar">
          <button class="edit-playlist-tool" data-action="shuffle-play"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg> Shuffle Play</button>
          <button class="edit-playlist-tool" data-action="add-songs"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Songs</button>
          <button class="edit-playlist-tool edit-playlist-tool-danger" data-action="delete-playlist"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete</button>
        </div>
        <div class="edit-playlist-songs" id="edit-playlist-songs" data-playlist-id="${Utils.esc(pl.id)}">
          ${songs.map((item, i) => (item.song ? `
            <div class="edit-playlist-song-row" draggable="true" data-index="${i}" data-song-id="${item.song.id}">
              <div class="edit-playlist-drag" title="Drag to reorder"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg></div>
              <img src="${item.song.coverUrl}" class="edit-playlist-song-thumb" alt="">
              <div class="edit-playlist-song-info"><p class="edit-playlist-song-title">${Utils.esc(item.song.title)}</p><p class="edit-playlist-song-artist">${Utils.esc(item.song.artist || "")} • ${Utils.esc(item.song.album || "")}</p></div>
              <span class="edit-playlist-song-time">${item.song.duration || ""}</span>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}" title="Remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          ` : `
            <div class="edit-playlist-song-row edit-playlist-song-missing" data-index="${i}">
              <div class="edit-playlist-drag"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg></div>
              <p class="edit-playlist-song-title">Unknown song</p>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}">Remove</button>
            </div>
          `)).join("")}
        </div>
        ${!pl.songs.length ? `<div class="edit-playlist-empty"><div class="edit-playlist-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/></svg></div><h3 class="edit-playlist-empty-title">No songs yet</h3><p class="edit-playlist-empty-desc">Add songs to start building your playlist.</p></div>` : ""}
      </div>
    `;
  }
  _coverPreview(pl) {
    const state = this.ui.state;
    const songs = pl.songs.map((sid) => state.getSongById(sid)).filter(Boolean).slice(0, 4);
    if (!songs.length) return `<div class="edit-cover-empty">${Icons.general.playlist(48)}</div>`;
    if (songs.length === 1) return `<img src="${songs[0].coverUrl}" class="edit-cover-img" alt="">`;
    return `<div class="edit-cover-mosaic">${songs.map((s) => `<img src="${s.coverUrl}" class="edit-cover-quarter" alt="">`).join("")}</div>`;
  }
}

class Error404 {
  constructor(ui) { this.ui = ui; }
  render() {
    return `
      <div data-page="404" class="page animate-fadeInUp">
        <div class="wrap">
          <div class="code">404</div>
          <h1 class="title">Page Not Found</h1>
          <p class="desc">The page you're looking for doesn't exist or may have been moved.</p>
          <div class="actions">
            <button onclick="window.pagesActions.goHome()" class="home">🏠 Take me Home</button>
            <button onclick="window.history.back()" class="back">↩ Go Back</button>
          </div>
          <div class="note"><p>Error 404 — The requested resource could not be found.</p></div>
        </div>
      </div>
    `;
  }
}

/* ==================== 5. BUILDER ==================== */

class AppRouter {
  constructor(ui) {
    this.ui = ui;
    this.state = ui.state;
    this.audioPlayer = ui.audioPlayer;
    this.favorites = ui.favorites;
  }
  buildHomeURL() { return "/home/"; }
  buildLibraryURL() {
    const lib = this.ui.libraryPage;
    if (!lib) return "/library/";
    const view = lib.view || "overview";
    const sort = lib.sort || "recent";
    const filter = lib.filter || { type: "all", value: null, label: "" };
    if (sort === "mostPlayed" && view === "albums") return "/library/top/albums/";
    if (sort === "mostPlayed" && view === "artists") return "/library/top/artists/";
    if (sort === "mostPlayed") return "/library/mostplayed/";
    if (view === "artists" && filter.type === "all" && filter.value === null) return "/library/artists/all/";
    if (view && view !== "overview") return "/library/" + view + "/";
    return "/library/";
  }
  buildFavoritesURL() { const tab = this.state.favoritesTab || "songs"; return "/favorites/" + tab + "/"; }
  buildPlaylistsURL() { return "/playlists/"; }
  buildPlaylistURL() { return this.state.selectedPlaylistId ? "/playlist/" + this.state.selectedPlaylistId + "/" : "/playlists/"; }
  buildEditPlaylistURL() { return this.state.editingPlaylistId ? "/playlist/" + this.state.editingPlaylistId + "/edit/" : "/playlists/"; }
  buildArtistURL(artistId, albumId) {
    if (!artistId) return "/home/";
    if (albumId) return "/artist/" + artistId + "/album/" + albumId + "/";
    return "/artist/" + artistId + "/";
  }
  buildURL(page, artistId, albumId) {
    switch (page) {
      case "home": return this.buildHomeURL();
      case "library": return this.buildLibraryURL();
      case "favorites": return this.buildFavoritesURL();
      case "playlists": return this.buildPlaylistURL();
      case "editPlaylist": return this.buildEditPlaylistURL();
      case "artist": return this.buildArtistURL(artistId, albumId);
      default: return "/home/";
    }
  }
  normalizePath(p) { if (!p) return "/"; const stripped = p.replace(/\/+$/, ""); return stripped === "" ? "/" : stripped; }
  setURL(page, artistId, albumId) {
    const url = this.buildURL(page, artistId, albumId);
    const current = this.normalizePath(window.location.pathname);
    const target = this.normalizePath(url);
    const currentSearch = window.location.search || "";
    if (current === target && !currentSearch) return;
    history.pushState({ page, artistId, albumId }, "", url);
  }
  goTo(page, artistId = null, albumId = null) {
    if (this.state.isDrawerOpen) this.ui.closePlayerDrawer();
    let artist = null;
    if (artistId) {
      artist = this.state.getArtistById(artistId);
      if (!artist) { artist = this.state.enrichedLibrary.find(a => a.artist === artistId); if (artist) artistId = artist.id; }
    }
    const tab = this.state.favoritesTab || "songs";
    const album = albumId ? this.state.getAlbumById(albumId) : null;
    const titleMap = {
      home: "MyBeats — Home",
      library: "MyBeats — Library",
      favorites: `MyBeats — Favorites / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`,
      playlists: this.state.selectedPlaylistName ? `MyBeats — Playlist: ${this.state.selectedPlaylistName}` : "MyBeats — Playlists",
      editPlaylist: this.state.selectedPlaylistName ? `MyBeats — Edit: ${this.state.selectedPlaylistName}` : "MyBeats — Playlists",
      artist: artist ? (album ? `MyBeats — ${artist.artist} / ${album.album}` : `MyBeats — ${artist.artist}`) : "MyBeats"
    };
    this.state.currentPage = page;
    this.state.artistId = artistId || null;
    this.state.artistPageName = artist?.artist || null;
    this.state.selectedAlbumId = albumId || null;
    this.state.selectedAlbumName = album?.album || null;
    this.state.isSearchOpen = false;
    this.state.selectedPlaylistName = null;
    this.state.isCreatingPlaylist = false;
    document.title = titleMap[page] ?? "MyBeats";
    this.setURL(page, artistId, albumId);
    this.updateActiveNav();
    this.updateBreadcrumbs();
    this.ui.render();
  }
  parseLibraryRoute(parts) {
    const lib = this.ui.libraryPage;
    if (!lib) return;
    lib.view = "overview";
    lib.filter = { type: "all", value: null, label: "" };
    lib.sort = "recent";
    lib.mode = "grid";
    lib.query = "";
    if (!parts.length) return;
    const a = parts[0], b = parts[1];
    const views = ["overview", "songs", "albums", "artists", "playlists", "genres"];
    if (a === "top" && b && views.includes(b)) { lib.view = b; lib.sort = "mostPlayed"; return; }
    if (a === "mostplayed") { lib.view = "songs"; lib.sort = "mostPlayed"; return; }
    if (a === "artists" && b === "all") { lib.view = "artists"; lib.filter = { type: "all", value: null, label: "" }; return; }
    if (a === "artists" && b) { lib.view = "artists"; lib.filter = { type: "artist", value: b, label: b }; return; }
    if (a === "genres" && b) { lib.view = "genres"; lib.filter = { type: "genre", value: b, label: b }; return; }
    if (a === "year" && b) { lib.view = "albums"; lib.filter = { type: "year", value: b, label: b }; return; }
    if (a === "decade" && b) { lib.view = "albums"; lib.filter = { type: "decade", value: b, label: b + "s" }; return; }
    if (views.includes(a)) { lib.view = a; return; }
  }
  parseDiscoverRoute(parts) {
    const lib = this.ui.libraryPage;
    if (!lib) return;
    lib.view = "overview";
    lib.filter = { type: "all", value: null, label: "" };
    lib.sort = "recent";
    lib.mode = "grid";
    lib.query = "";
    if (!parts.length) return;
    const a = parts[0];
    if (a === "artists") lib.view = "artists";
    else if (a === "albums") lib.view = "albums";
    else if (a === "songs") lib.view = "songs";
    else if (a === "genres") lib.view = "genres";
  }
  syncWithURL() {
    const parts = window.location.pathname.split("/").filter(p => p);
    const searchParams = new URLSearchParams(window.location.search);
    const deepLinkSong = searchParams.get("song");
    this.state.pendingDeepLinkSong = null;
    this.state.editingPlaylistId = null;
    if (!parts.length || parts[0] === "home") {
      this.state.currentPage = "home";
      this.state.artistId = null; this.state.artistPageName = null;
      this.state.selectedAlbumId = null; this.state.selectedAlbumName = null;
      this.state.selectedPlaylistName = null; this.state.selectedPlaylistId = null;
      this.state.isCreatingPlaylist = false;
    } else {
      const page = parts[0];
      if (page === "library") {
        this.state.currentPage = "library";
        this.state.artistId = null; this.state.artistPageName = null;
        this.state.selectedAlbumId = null; this.state.selectedAlbumName = null;
        this.state.selectedPlaylistName = null; this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
        this.parseLibraryRoute(parts.slice(1));
      } else if (page === "discover") {
        this.state.currentPage = "library";
        this.state.artistId = null; this.state.artistPageName = null;
        this.state.selectedAlbumId = null; this.state.selectedAlbumName = null;
        this.state.selectedPlaylistName = null; this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
        this.parseDiscoverRoute(parts.slice(1));
      } else if (page === "favorites") {
        this.state.currentPage = "favorites";
        this.state.favoritesTab = parts[1] || "songs";
        this.state.artistId = null; this.state.artistPageName = null;
        this.state.selectedAlbumId = null; this.state.selectedAlbumName = null;
        this.state.selectedPlaylistName = null; this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
      } else if (page === "playlist" && parts[1]) {
        const playlistId = parts[1];
        const normalizedId = IdUtils.norm(playlistId);
        const playlist = this.state.playlists.find(p => IdUtils.norm(p.id) === normalizedId);
        if (parts[2] === "edit" && playlist) {
          this.state.currentPage = "editPlaylist";
          this.state.editingPlaylistId = playlistId;
          this.state.selectedPlaylistName = playlist.name;
          this.state.selectedPlaylistId = playlistId;
        } else if (parts[2] === "edit") this.state.currentPage = "404";
        else {
          this.state.currentPage = "playlists";
          this.state.selectedPlaylistName = playlist?.name || null;
          this.state.selectedPlaylistId = playlist ? playlistId : null;
        }
        this.state.artistId = null; this.state.artistPageName = null;
        this.state.selectedAlbumId = null; this.state.selectedAlbumName = null;
        this.state.isCreatingPlaylist = false;
      } else if (page === "playlists") {
        this.state.currentPage = "playlists";
        this.state.selectedPlaylistName = null; this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
        this.state.artistId = null; this.state.artistPageName = null;
        this.state.selectedAlbumId = null; this.state.selectedAlbumName = null;
      } else if (page === "artist" && parts[1]) {
        const artistId = parts[1];
        const artist = this.state.getArtistById(artistId);
        if (artist) {
          this.state.currentPage = "artist";
          this.state.artistId = artistId;
          this.state.artistPageName = artist.artist;
          if (parts[2] === "album" && parts[3]) {
            const albumId = parts[3];
            const album = artist.albums.find(a => IdUtils.norm(a.id) === IdUtils.norm(albumId));
            this.state.selectedAlbumId = album ? albumId : null;
            this.state.selectedAlbumName = album?.album || null;
          } else { this.state.selectedAlbumId = null; this.state.selectedAlbumName = null; }
          if (deepLinkSong) this.state.pendingDeepLinkSong = deepLinkSong;
        } else this.state.currentPage = "404";
        this.state.selectedPlaylistName = null; this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
      } else {
        this.state.currentPage = "404";
        this.state.selectedPlaylistName = null; this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
      }
    }
    this.updateActiveNav();
    this.updateBreadcrumbs();
    this.updateTitle();
    this.ui.render();
  }
  handlePopState() { this.syncWithURL(); }
  updateActiveNav() {
    document.querySelectorAll("nav .link[data-nav]").forEach(link => {
      link.classList.toggle("active", link.dataset.nav === this.state.currentPage);
    });
  }
  updateBreadcrumbs() {
    const container = document.getElementById("breadcrumb-items");
    if (!container) return;
    const crumbs = this.getBreadcrumbs();
    const existingItems = container.querySelectorAll(".item, .sep");
    if (existingItems.length > 0) {
      existingItems.forEach(el => el.classList.add("removing"));
      setTimeout(() => { this.renderNewCrumbs(container, crumbs); }, 350);
    } else this.renderNewCrumbs(container, crumbs);
  }
  renderNewCrumbs(container, crumbs) {
    if (!crumbs.length) { container.innerHTML = '<span class="item active">Home</span>'; return; }
    container.innerHTML = crumbs.map((crumb, i) => {
      const isLast = i === crumbs.length - 1;
      return `<span class="item ${isLast ? "active" : ""}" style="--i: ${i};">${crumb}</span>${!isLast ? `<span class="sep" style="--i: ${i};">›</span>` : ""}`;
    }).join("");
  }
  getBreadcrumbs() {
    const crumbs = [];
    const page = this.state.currentPage;
    const lib = this.ui.libraryPage;
    if (page === "home") crumbs.push("Home");
    else if (page === "library") {
      crumbs.push("Library");
      if (lib) {
        const view = lib.view || "overview";
        const sort = lib.sort || "recent";
        const filter = lib.filter || { type: "all", value: null, label: "" };
        if (sort === "mostPlayed" && view === "albums") crumbs.push("Top", "Albums");
        else if (sort === "mostPlayed" && view === "artists") crumbs.push("Top", "Artists");
        else if (sort === "mostPlayed") crumbs.push("Most Played");
        else if (view && view !== "overview") {
          const label = view.charAt(0).toUpperCase() + view.slice(1);
          crumbs.push(label);
          if (view === "artists" && filter.type === "all" && filter.value === null) crumbs.push("All");
          else if (filter.type !== "all" && filter.label) crumbs.push(filter.label);
        }
      }
    } else if (page === "favorites") {
      const tab = this.state.favoritesTab || "songs";
      crumbs.push("Library", "Favorites", tab.charAt(0).toUpperCase() + tab.slice(1));
    } else if (page === "playlists") {
      crumbs.push("Library", "Playlists");
      if (this.state.selectedPlaylistName) crumbs.push(this.state.selectedPlaylistName);
      if (this.state.isCreatingPlaylist) crumbs.push("Create");
    } else if (page === "editPlaylist") {
      crumbs.push("Library", "Playlists");
      if (this.state.selectedPlaylistName) crumbs.push(this.state.selectedPlaylistName);
      crumbs.push("Edit");
    } else if (page === "artist") {
      crumbs.push("Artists");
      if (this.state.artistPageName) crumbs.push(this.state.artistPageName);
      if (this.state.selectedAlbumName) crumbs.push(this.state.selectedAlbumName);
    }
    return crumbs;
  }
  toggleBreadcrumb() {
    const breadcrumbNav = document.querySelector('[data-navbar="breadcrumbs"]');
    if (!breadcrumbNav) return;
    this.ui.isBreadcrumbHidden = !this.ui.isBreadcrumbHidden;
    if (this.ui.isBreadcrumbHidden) breadcrumbNav.classList.add("hide");
    else breadcrumbNav.classList.remove("hide");
  }
  updateTitle() {
    const page = this.state.currentPage;
    const tab = this.state.favoritesTab || "songs";
    const artist = this.state.artistId ? this.state.getArtistById(this.state.artistId) : null;
    const album = this.state.selectedAlbumId ? this.state.getAlbumById(this.state.selectedAlbumId) : null;
    const titles = {
      home: "MyBeats — Home",
      library: "MyBeats — Library",
      favorites: `MyBeats — Favorites / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`,
      playlists: this.state.selectedPlaylistName ? `MyBeats — Playlist: ${this.state.selectedPlaylistName}` : "MyBeats — Playlists",
      editPlaylist: this.state.selectedPlaylistName ? `MyBeats — Edit: ${this.state.selectedPlaylistName}` : "MyBeats — Playlists",
      artist: artist ? (album ? `MyBeats — ${artist.artist} / ${album.album}` : `MyBeats — ${artist.artist}`) : "MyBeats"
    };
    document.title = titles[page] ?? "MyBeats";
  }
}

class AppListeners {
  static global(ui) {
    return [
      { el: document.getElementById("modal-overlay"), type: "click", handler: () => ui.state.modalClose() },
      {
        el: document,
        type: "contextmenu",
        handler: e => {
          e.preventDefault();
          const target = e.target.closest("[data-artist-id], [data-album-id], [data-song-id], [data-playlist-id]");
          if (!target) return;
          const artistId = target.dataset.artistId;
          const albumId = target.dataset.albumId;
          const songId = target.dataset.songId;
          const playlistId = target.dataset.playlistId;
          if (window.contextMenu?.show) window.contextMenu.show(e.clientX, e.clientY, { artistId, albumId, songId, playlistId });
        }
      },
      {
        el: window,
        type: "keydown",
        handler: e => {
          const tag = e.target.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
          if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); ui.showShortcutsHelp(); return; }
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          switch (e.code) {
            case "Space": e.preventDefault(); ui.audioPlayer.togglePlay(); break;
            case "ArrowLeft": e.preventDefault(); ui.audioPlayer.skipBack(); break;
            case "ArrowRight": e.preventDefault(); ui.audioPlayer.skipForward(); break;
            case "ArrowUp": e.preventDefault(); ui.audioPlayer.setVolume(ui.state.volume + .05); break;
            case "ArrowDown": e.preventDefault(); ui.audioPlayer.setVolume(ui.state.volume - .05); break;
            case "KeyM": ui.audioPlayer.toggleMute(); break;
            case "KeyL": if (ui.state.currentSong) ui.toggleFavAndReRender(ui.state.currentSong.id); break;
            case "KeyS": ui.audioPlayer.toggleShuffle(); break;
            case "KeyR": ui.audioPlayer.cycleRepeat(); break;
            case "KeyQ":
              if (!ui.state.isDrawerOpen) { ui.openPlayerDrawer(); ui.player.openQueue(); }
              else ui.player.toggleQueue();
              break;
            case "Escape":
              if (ui.state.isDrawerOpen) ui.closePlayerDrawer();
              if (document.querySelector(".modal.active")) ui.state.modalClose();
              break;
          }
        }
      }
    ];
  }
  static static(ui) {
    const navButtons = document.querySelectorAll("nav .link[data-nav]");
    return Array.from(navButtons).map(btn => ({ el: btn, type: "click", handler: () => ui.navigate(btn.dataset.nav) }));
  }
  static init(ui) {
    return [
      { el: window, type: "popstate", handler: () => ui.router.handlePopState() },
      { el: document.getElementById("breadcrumb-toggle"), type: "click", handler: () => ui.router.toggleBreadcrumb() },
      { el: document.getElementById("open-search"), type: "click", handler: () => ui.openSearch() },
      { el: document.getElementById("close-search"), type: "click", handler: () => ui.closeSearch() },
      { el: document.getElementById("search-overlay"), type: "click", handler: () => ui.closeSearch() },
      { el: document.querySelector('[data-action="settings"]'), type: "click", handler: () => ui.showSettingsModal() },
      { el: document.querySelector('[data-dash="notifications"]'), type: "click", handler: e => window.popups.showNotificationPanel(e.currentTarget) },
      {
        setup: bind => {
          const input = document.getElementById("search-input");
          if (input) {
            let timer;
            const handler = e => { clearTimeout(timer); ui.state.searchQuery = e.target.value; timer = setTimeout(() => ui.search.updateDropdown(), 200); };
            input.addEventListener("input", handler);
            bind.push({ el: input, type: "input", handler });
          }
        }
      },
      {
        setup: bind => {
          const handler = e => {
            if (e.key === "Escape" && ui.state.isSearchOpen) ui.closeSearch();
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); ui.openSearch(); }
          };
          document.addEventListener("keydown", handler);
          bind.push({ el: document, type: "keydown", handler });
        }
      },
      { immediate: () => Prefs.applyTheme(Prefs.theme(), { persist: false }) }
    ];
  }
  static add(ui) { return []; }
  static remove(ui) { return []; }
  static bindAll(ui) {
    const bindList = [];
    const attach = arr => {
      arr.forEach(item => {
        if (item.setup) item.setup(bindList);
        else if (item.immediate) item.immediate();
        else if (item.el && item.type && item.handler) { item.el.addEventListener(item.type, item.handler); bindList.push(item); }
      });
    };
    attach(AppListeners.global(ui));
    attach(AppListeners.static(ui));
    attach(AppListeners.init(ui));
    attach(AppListeners.add(ui));
    return bindList;
  }
}

class ContentEvents {
  constructor(ui) {
    this.ui = ui;
    this.popups = window.popups || new PopupsManager({ ui });
    this.popups.ui = ui;
  }
  esc(text = "") { return Utils.esc(text); }
  setupHeartButton(btn, type, id) { window.heartManager?.bindAll(btn?.parentElement || document); }
  attachHeartEvents() { window.heartManager?.bindAll(document); }
  attachEditPlaylistEvents() {
    const state = this.ui.state;
    const id = state.editingPlaylistId;
    const pl = state.playlists.find(p => String(p.id) === String(id));
    if (!pl) return;
    const nameInput = document.getElementById("edit-pl-name");
    const descInput = document.getElementById("edit-pl-desc");
    const tagWrap = document.getElementById("edit-pl-tags");
    if (nameInput) nameInput.addEventListener("change", () => window.favoritesPlaylists.renamePlaylist(id, nameInput.value));
    if (descInput) descInput.addEventListener("change", () => window.favoritesPlaylists.updateDesc(id, descInput.value));
    if (tagWrap) {
      const input = tagWrap.querySelector(".edit-playlist-tag-input");
      input?.addEventListener("keydown", e => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const raw = input.value.trim();
        if (!raw) return;
        const vals = raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        const tags = pl.tags || [];
        vals.forEach(v => { if (!tags.includes(v) && tags.length < 8) tags.push(v); });
        input.value = "";
        window.favoritesPlaylists.updateTags(id, tags);
        this.ui.render();
      });
      tagWrap.addEventListener("click", e => {
        const btn = e.target.closest(".edit-playlist-tag-remove");
        if (!btn) return;
        const tag = btn.dataset.tag;
        const tags = (pl.tags || []).filter(t => t !== tag);
        window.favoritesPlaylists.updateTags(id, tags);
        this.ui.render();
      });
    }
    document.querySelectorAll('[data-page="edit-playlist"] [data-action]').forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === "back" || action === "done") this.ui.navigate("playlists");
        else if (action === "delete-playlist") window.favoritesPlaylists._confirmDelete(id);
        else if (action === "shuffle-play") {
          const queue = state.buildPlaylistQueue(id);
          if (queue.length) { const shuffled = Utils.shuffle(queue); this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist"); }
        } else if (action === "add-songs") this.ui.navigate("library");
      });
    });
    const list = document.getElementById("edit-playlist-songs");
    if (list) {
      let dragIdx = null;
      list.querySelectorAll(".edit-playlist-song-row").forEach(row => {
        row.addEventListener("dragstart", e => {
          dragIdx = parseInt(row.dataset.index, 10);
          row.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
          try { e.dataTransfer.setData("text/plain", String(dragIdx)); } catch {}
        });
        row.addEventListener("dragend", () => {
          row.classList.remove("dragging");
          list.querySelectorAll(".edit-playlist-song-row").forEach(r => r.classList.remove("drop-target"));
          dragIdx = null;
        });
        row.addEventListener("dragover", e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          list.querySelectorAll(".edit-playlist-song-row").forEach(r => r.classList.remove("drop-target"));
          row.classList.add("drop-target");
        });
        row.addEventListener("drop", e => {
          e.preventDefault();
          const targetIdx = parseInt(row.dataset.index, 10);
          if (dragIdx === null || isNaN(targetIdx) || dragIdx === targetIdx) return;
          const newOrder = [...pl.songs];
          const [moved] = newOrder.splice(dragIdx, 1);
          newOrder.splice(targetIdx, 0, moved);
          window.favoritesPlaylists.reorderSongs(id, newOrder);
          this.ui.render();
        });
      });
      list.addEventListener("click", e => {
        const btn = e.target.closest('[data-action="remove-song"]');
        if (!btn) return;
        const index = parseInt(btn.dataset.index, 10);
        const sid = pl.songs[index];
        const song = state.getSongById(sid);
        if (song) window.favoritesPlaylists.removeSongFromPlaylist(id, sid);
        else {
          const newOrder = [...pl.songs];
          newOrder.splice(index, 1);
          window.favoritesPlaylists.reorderSongs(id, newOrder);
          this.ui.render();
        }
      });
    }
  }
  showArtistPopover(artistId, event) { return this.popups.showArtistPopover(artistId, event); }
  showSongMenu(songId, event) { return this.popups.showSongMenu(songId, event); }
  attachContentEvents() {
    window.heartManager?.prune();
    window.heartManager?.bindAll(document);
    const mainContent = document.getElementById("main-content");
    if (mainContent && !mainContent.artistClicksBound) {
      mainContent.artistClicksBound = true;
      mainContent.addEventListener("click", e => {
        const el = e.target.closest("[data-artist-id]");
        if (!el) return;
        const artistId = el.dataset.artistId;
        const albumId = el.dataset.albumId || null;
        e.stopPropagation();
        this.ui.navigate("artist", artistId, albumId);
      });
      mainContent.addEventListener("dblclick", e => {
        const el = e.target.closest(".album-cover-wrap[data-artist-id][data-album-id]");
        if (!el) return;
        const artistId = el.dataset.artistId;
        const albumId = el.dataset.albumId;
        if (!artistId || !albumId) return;
        const queue = Utils.albumQueue(this.ui.state, artistId, albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
      });
    }
    document.querySelectorAll('[data-action="add-album-to-playlist"]').forEach(el => {
      el.addEventListener("click", e => {
        e.preventDefault(); e.stopPropagation();
        const albumId = el.dataset.albumId;
        const album = this.ui.state.getAlbumById(albumId);
        if (!album?.songs?.length) return;
        const firstSong = this.ui.state.getSongById(album.songs[0].id) || album.songs[0];
        if (window.favoritesPlaylists?.addToPlaylistModal) window.favoritesPlaylists.addToPlaylistModal(firstSong);
      });
    });
    document.querySelectorAll('[data-action="add-album-to-queue"]').forEach(el => {
      el.addEventListener("click", e => {
        e.preventDefault(); e.stopPropagation();
        const albumId = el.dataset.albumId;
        const album = this.ui.state.getAlbumById(albumId);
        if (!album?.songs?.length) return;
        const queue = Utils.albumQueue(this.ui.state, album.artistId, albumId);
        const currentQueue = this.ui.state.queue || [];
        const startIndex = currentQueue.length;
        this.ui.state.queue = [...currentQueue, ...queue];
        if (this.ui.state.currentSong && startIndex === currentQueue.length) {
          this.ui.state.queueIndex = this.ui.state.queue.findIndex(s => s.id == this.ui.state.currentSong.id);
        }
        this.ui.state.showToast(`Added ${queue.length} song${queue.length === 1 ? "" : "s"} to queue`);
      });
    });
    document.querySelectorAll("[data-song-id]").forEach(el => {
      el.addEventListener("dblclick", e => {
        if (e.target.closest(".downloadBtn")) return;
        const songId = el.dataset.songId;
        const song = this.ui.state.getSongById(songId);
        if (!song) return;
        if (el.dataset.context) {
          const ctx = JSON.parse(el.dataset.context);
          const queue = Utils.albumQueue(this.ui.state, ctx.artistId, ctx.albumId);
          if (queue.length) { this.ui.audioPlayer.playSong(queue.find(s => IdUtils.norm(s.id) === IdUtils.norm(songId)), queue, true, "album"); return; }
        }
        if (el.dataset.playlistId) {
          const queue = this.ui.state.buildPlaylistQueue(el.dataset.playlistId);
          if (queue.length) { const startSong = queue.find(s => IdUtils.norm(s.id) === IdUtils.norm(songId)) || queue[0]; this.ui.audioPlayer.playSong(startSong, queue, true, "playlist"); return; }
        }
        this.ui.audioPlayer.playSong(song, null, true, el.dataset.playSource || null);
      });
    });
    document.querySelectorAll("[data-play-album]").forEach(el => {
      el.addEventListener("click", e => {
        e.stopPropagation();
        if (e.detail > 1) return;
        const data = JSON.parse(el.dataset.playAlbum);
        const queue = Utils.albumQueue(this.ui.state, data.artistId, data.albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
      });
    });
    document.querySelectorAll("[data-playlist-play]").forEach(el => {
      if (el._plPlayBound) return;
      el._plPlayBound = true;
      el.addEventListener("click", e => {
        e.stopPropagation();
        const queue = this.ui.state.buildPlaylistQueue(el.dataset.playlistPlay);
        if (queue.length) { this.ui.audioPlayer.playSong(queue[0], queue, true, "playlist"); this.ui.state.showToast("Playing playlist"); }
        else this.ui.state.showToast("Playlist is empty");
      });
    });
    document.querySelectorAll("[data-playlist-view]").forEach(el => {
      if (el._plViewBound) return;
      el._plViewBound = true;
      el.addEventListener("click", () => {
        const pl = this.ui.state.playlists.find(p => p.name === el.dataset.playlistView);
        if (!pl) return;
        history.pushState(null, "", "/playlist/" + pl.id);
        this.ui.handlePopState();
      });
    });
    document.querySelectorAll("[data-playlist-shuffle]").forEach(el => {
      if (el._plShuffleBound) return;
      el._plShuffleBound = true;
      el.addEventListener("click", e => {
        e.stopPropagation();
        const queue = this.ui.state.buildPlaylistQueue(el.dataset.playlistShuffle);
        if (queue.length) { const shuffled = Utils.shuffle(queue); this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist"); this.ui.state.showToast("Shuffling playlist"); }
        else this.ui.state.showToast("Playlist is empty");
      });
    });
    document.querySelectorAll("[data-more-song]").forEach(el => {
      el.addEventListener("click", e => { e.stopPropagation(); this.showSongMenu(el.dataset.moreSong, e); });
    });
    document.querySelectorAll(".add-to-playlist-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const song = this.ui.state.getSongById(btn.dataset.songId);
        if (song) this.ui.favorites.addToPlaylistModal(song);
      });
    });
    document.querySelectorAll(".artist-name-pill").forEach(el => {
      el.addEventListener("click", e => {
        e.stopPropagation();
        const artistId = el.dataset.artistId;
        if (artistId) this.showArtistPopover(artistId, e);
      });
    });
    document.querySelectorAll('[data-album-id][data-dynamic="true"]').forEach(el => {
      el.addEventListener("click", () => {
        const artistId = IdUtils.norm(el.dataset.artistId);
        const albumId = IdUtils.norm(el.dataset.albumId);
        if (artistId && albumId) this.ui.navigate("artist", artistId, albumId);
      });
    });
    if (this.ui.state.currentPage === "playlists") {
      const createPlBtn = document.getElementById("create-playlist-btn");
      if (createPlBtn && !createPlBtn._hasListener) {
        createPlBtn._hasListener = true;
        createPlBtn.addEventListener("click", () => { window.favoritesPlaylists.createNewPlaylist(); this.ui.render(); });
      }
      document.querySelectorAll(".playlist-name-input, .playlist-description-input").forEach(el => {
        el.addEventListener("input", e => {
          const pl = this.ui.state.playlists.find(p => p.id === e.target.dataset.playlistId);
          if (pl) { pl[e.target.dataset.field] = e.target.value; this.ui.state.persist(); }
        });
      });
      document.querySelectorAll(".tag-input").forEach(input => {
        input.addEventListener("keydown", e => {
          if (e.key !== "Enter" || !e.target.value.trim()) return;
          e.preventDefault();
          const pl = this.ui.state.playlists.find(p => p.id === e.target.dataset.playlistId);
          if (!pl) return;
          const newTag = e.target.value.trim();
          if (!pl.tags) pl.tags = [];
          if (pl.tags.includes(newTag)) return;
          pl.tags.push(newTag);
          this.ui.state.persist();
          const chip = document.createElement("span");
          chip.className = "tag-chip animate-fadeIn";
          chip.style.background = "rgba(var(--bg-interactive))";
          const safeTag = newTag.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          chip.innerHTML = `${safeTag} <button class="remove-tag-btn" data-tag="${safeTag}">×</button>`;
          e.target.closest(".tags-container").insertBefore(chip, e.target);
          chip.querySelector(".remove-tag-btn").addEventListener("click", ce => {
            ce.stopPropagation();
            pl.tags = pl.tags.filter(t => t !== ce.target.dataset.tag);
            this.ui.state.persist();
            chip.remove();
          });
          e.target.value = "";
        });
      });
      document.querySelectorAll(".remove-tag-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const plId = e.target.closest(".tags-container").dataset.playlistId;
          const pl = this.ui.state.playlists.find(p => p.id === plId);
          if (pl?.tags) { pl.tags = pl.tags.filter(t => t !== e.target.dataset.tag); this.ui.state.persist(); e.target.closest(".tag-chip").remove(); }
        });
      });
      document.querySelectorAll(".remove-from-playlist-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const pl = this.ui.state.playlists.find(p => p.id === btn.dataset.playlistId);
          if (pl) { pl.songs = pl.songs.filter(sid => String(sid) !== String(btn.dataset.songId)); this.ui.state.persist(); btn.closest(".song-row").remove(); }
        });
      });
      document.querySelectorAll(".share-playlist-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const pl = this.ui.state.playlists.find(p => p.id === btn.dataset.playlistId);
          if (!pl) return;
          const shareText = `Playlist: ${pl.name}\n${pl.songs.length} songs\n${pl.description || ""}`;
          if (navigator.share) navigator.share({ title: pl.name, text: shareText });
          else navigator.clipboard?.writeText(shareText).then(() => this.ui.state.showToast("Playlist copied to clipboard"));
        });
      });
    }
    if (this.ui.state.currentPage === "editPlaylist") this.attachEditPlaylistEvents();
    document.querySelectorAll("[data-hover-action]").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const action = btn.dataset.hoverAction;
        const artistId = btn.dataset.artistId;
        const albumId = btn.dataset.albumId;
        const playlistId = btn.dataset.playlistId;
        const state = this.ui.state;
        switch (action) {
          case "play-album": { const queue = Utils.albumQueue(state, artistId, albumId); if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album"); break; }
          case "shuffle-album": { const queue = Utils.albumQueue(state, artistId, albumId); if (queue.length) { const shuffled = Utils.shuffle(queue); this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "album"); } break; }
          case "favorite-album": { await window.heartManager?.toggle("album", albumId); break; }
          case "album-playlist": { const album = state.getAlbumById(albumId); const firstSong = album?.songs?.[0] ? state.getSongById(album.songs[0].id) : null; if (firstSong) window.favoritesPlaylists?.addToPlaylistModal?.(firstSong); break; }
          case "view-artist": { this.ui.navigate("artist", artistId); break; }
          case "play-artist": { const artist = state.getArtistById(artistId); if (artist?.albums?.length) { const queue = Utils.albumQueue(state, artistId, artist.albums[0].id); if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album"); } break; }
          case "favorite-artist": { await window.heartManager?.toggle("artist", artistId); break; }
          case "play-playlist": { const queue = state.buildPlaylistQueue(playlistId); if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "playlist"); break; }
          case "shuffle-playlist": { const queue = state.buildPlaylistQueue(playlistId); if (queue.length) { const shuffled = Utils.shuffle(queue); this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist"); } break; }
          case "edit-playlist": { this.ui.editPlaylist(playlistId); break; }
          case "share-playlist": {
            const pl = state.playlists.find(p => String(p.id) === String(playlistId));
            if (!pl) return;
            const shareText = `Playlist: ${pl.name}\n${pl.songs.length} songs\n${pl.description || ""}`;
            if (navigator.share) navigator.share({ title: pl.name, text: shareText });
            else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(shareText).then(() => state.showToast("Playlist copied to clipboard"));
            break;
          }
        }
      });
    });
    this.attachHeartEvents();
    document.querySelectorAll(".tab-btn").forEach(btn => {
      if (btn._tabBound) return;
      btn._tabBound = true;
      btn.addEventListener("click", () => { this.ui.refreshFavoritesContent(btn.dataset.tab); });
    });
    window.saveToLibraryDrawer?.refreshSavedBadges?.();
    window.offlineCache?.badgeRows?.();
  }
}

class OfflineCache {
  constructor(state) {
    this.state = state;
    this.cachedUrls = new Set();
    this._listening = false;
    this.init();
  }
  normalizeUrl(song) {
    if (!song?.downloadPath) return "";
    try { return new URL(song.downloadPath, window.location.origin).href; }
    catch (e) { return song.downloadPath; }
  }
  isCached(song) {
    const abs = this.normalizeUrl(song);
    return this.cachedUrls.has(abs) || this.cachedUrls.has(song?.downloadPath);
  }
  init() {
    if (!("serviceWorker" in navigator)) return;
    if (!this._listening) {
      this._listening = true;
      navigator.serviceWorker.addEventListener("message", event => {
        const data = event.data;
        if (!data || !data.type) return;
        if (data.type === "CACHE_STATUS_RESULT") { const urls = data.songs?.urls || []; this.cachedUrls = new Set(urls); this.badgeRows(); }
        if (data.type === "SONG_CACHED" && data.url) { this.cachedUrls.add(data.url); this.badgeRows(); this.state.showToast("Song available offline"); }
      });
    }
    this.queryStatus();
    window.addEventListener("sw:controller-change", () => this.queryStatus());
    window.addEventListener("sw:ready", () => this.queryStatus());
  }
  queryStatus() {
    const send = () => { if (navigator.serviceWorker?.controller) navigator.serviceWorker.controller.postMessage({ type: "GET_CACHE_STATUS" }); };
    if (navigator.serviceWorker?.controller) send();
    else if (navigator.serviceWorker?.ready) navigator.serviceWorker.ready.then(send).catch(() => {});
  }
  cacheSong(song) {
    if (!song?.downloadPath) return;
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) { this.state.showToast("Offline caching unavailable"); return; }
    if (this.isCached(song)) { this.state.showToast("Already available offline"); return; }
    navigator.serviceWorker.controller.postMessage({ type: "CACHE_SONG", url: this.normalizeUrl(song) });
    this.state.showToast("Caching song for offline…");
  }
  removeSong(song) {
    if (!song?.downloadPath) return;
    const abs = this.normalizeUrl(song);
    this.cachedUrls.delete(abs);
    this.cachedUrls.delete(song.downloadPath);
    this._deleteFromCacheDb(abs);
    this._deleteFromCacheDb(song.downloadPath);
    this.badgeRows();
    this.state.showToast("Offline copy removed");
  }
  _deleteFromCacheDb(url) {
    try {
      const request = indexedDB.open("mybeats-cache", 1);
      request.onsuccess = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains("songs")) { db.close(); return; }
          const tx = db.transaction("songs", "readwrite");
          tx.objectStore("songs").delete(url);
          tx.oncomplete = () => db.close();
          tx.onerror = () => db.close();
        } catch (e) {}
      };
    } catch (e) {}
  }
  badgeRows() {
    document.querySelectorAll("[data-song-id]").forEach(row => {
      const song = this.state.getSongById(row.dataset.songId);
      if (!song) return;
      const has = this.isCached(song);
      const existing = row.querySelector(".offline-badge");
      if (has && !existing) {
        const badge = document.createElement("span");
        badge.className = "offline-badge";
        badge.title = "Available offline";
        badge.innerHTML = Icons.general.checkBadge(12);
        const host = row.querySelector(".time") || row;
        host.appendChild(badge);
      } else if (!has && existing) existing.remove();
    });
  }
}

class Search {
  constructor(ui) {
    this.ui = ui;
    this.activeIndex = -1;
    this._kbBound = false;
    this._lastQueue = null;
  }
  openSearch() {
    this.ui.state.isSearchOpen = true;
    this.ui.state.searchQuery = "";
    document.querySelector(".breadcrumb-wrapper")?.classList.add("search-active");
    const searchBar = document.getElementById("search-bar");
    if (searchBar) {
      searchBar.classList.remove("hidden");
      searchBar.style.opacity = "0";
      requestAnimationFrame(() => { searchBar.style.opacity = "1"; });
      if (window.innerWidth > 768) setTimeout(() => document.getElementById("search-input")?.focus(), 150);
    }
    this._resetResults();
    this._bindKeyboard();
  }
  closeSearch() {
    this.ui.state.isSearchOpen = false;
    this.ui.state.searchQuery = "";
    document.querySelector(".breadcrumb-wrapper")?.classList.remove("search-active");
    const searchBar = document.getElementById("search-bar");
    if (searchBar) {
      searchBar.style.opacity = "0";
      setTimeout(() => { searchBar.classList.add("hidden"); searchBar.style.opacity = ""; }, 300);
    }
    const input = document.getElementById("search-input");
    if (input) input.value = "";
    this._resetResults();
  }
  _resultsEl() {
    let el = document.getElementById("search-results-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "search-results-container";
      const host = document.querySelector("#search-bar .panel") || document.getElementById("search-bar");
      host?.appendChild(el);
    }
    return el;
  }
  _resetResults() {
    const el = document.getElementById("search-results-container");
    if (el) { el.className = "results hidden"; el.innerHTML = ""; }
    this.activeIndex = -1;
    this._lastQueue = null;
  }
  updateDropdown() {
    if (!this.ui.state.isSearchOpen) return;
    const q = (this.ui.state.searchQuery || "").trim();
    const el = this._resultsEl();
    if (!el) return;
    if (!q) { this._resetResults(); return; }
    el.className = "srResults";
    el.innerHTML = this.renderDropdown();
    this.activeIndex = -1;
    this.attachResultEvents(el);
  }
  _collect(q) {
    const state = this.ui.state;
    const lower = q.toLowerCase();
    const score = text => {
      const t = (text || "").toLowerCase();
      if (!t || !lower) return 0;
      if (t === lower) return 3;
      if (t.startsWith(lower)) return 2;
      return t.includes(lower) ? 1 : 0;
    };
    const songHits = state.getAllSongs().map(song => ({ kind: "song", ref: song, sc: Math.max(score(song.title), score(song.artist) * .65, score(song.album) * .65) })).filter(h => h.sc > 0).sort((a, b) => b.sc - a.sc);
    const artistHits = state.enrichedLibrary.map(a => ({ kind: "artist", ref: a, sc: score(a.artist) * 1.25 })).filter(h => h.sc > 0).sort((a, b) => b.sc - a.sc);
    const albumHits = [];
    state.enrichedLibrary.forEach(a => a.albums.forEach(alb => {
      const sc = score(alb.album) * 1.15;
      if (sc > 0) albumHits.push({ kind: "album", ref: { artistId: a.id, albumId: alb.id, artistName: a.artist, albumName: alb.album, coverUrl: alb.coverUrl, year: alb.year || "", songCount: alb.songs ? alb.songs.length : 0 }, sc });
    }));
    albumHits.sort((a, b) => b.sc - a.sc);
    const playlistHits = (state.playlists || []).map(p => ({ kind: "playlist", ref: p, sc: score(p.name) * 1.1 })).filter(h => h.sc > 0).sort((a, b) => b.sc - a.sc);
    const top = [artistHits[0], songHits[0], albumHits[0], playlistHits[0]].filter(Boolean).sort((a, b) => b.sc - a.sc)[0] || null;
    const without = list => list.filter(h => !top || h.ref !== top.ref);
    return {
      top,
      songs: (top?.kind === "song" ? without(songHits) : songHits).slice(0, 5),
      artists: (top?.kind === "artist" ? without(artistHits) : artistHits).slice(0, 6),
      albums: (top?.kind === "album" ? without(albumHits) : albumHits).slice(0, 6),
      playlists: (top?.kind === "playlist" ? without(playlistHits) : playlistHits).slice(0, 3)
    };
  }
  _esc(text) { return Utils.esc(text == null ? "" : String(text)); }
  _hl(text, q) {
    const t = this._esc(text);
    const needle = this._esc(q.trim());
    if (!needle) return t;
    const rx = new RegExp("(" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    return t.replace(rx, '<mark class="sr-hl">$1</mark>');
  }
  _hero(top, q) {
    const kindLabel = { song: "Song", artist: "Artist", album: "Album", playlist: "Playlist" };
    let art = "", title = "", sub = "", attrs = "", playBtn = "";
    if (top.kind === "song") {
      const s = top.ref;
      attrs = `data-sr-song="${this._esc(s.id)}"`;
      art = `<img src="${this._esc(s.coverUrl || "")}" alt="" loading="lazy">`;
      title = this._hl(s.title, q);
      sub = `${kindLabel.song} · ${this._hl(s.artist || "", q)}${s.album ? ` · ${this._hl(s.album, q)}` : ""}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-song="${this._esc(s.id)}" aria-label="Play ${this._esc(s.title)}">${Icons.player.play(16)}</button>`;
    } else if (top.kind === "artist") {
      const a = top.ref;
      const albums = a.albums ? a.albums.length : 0;
      const songs = (a.albums || []).reduce((n, alb) => n + alb.songs.length, 0);
      attrs = `data-sr-artist="${this._esc(a.id)}"`;
      art = `<img src="${this._esc(a.imageUrl || "")}" alt="" loading="lazy">`;
      title = this._hl(a.artist, q);
      sub = `${kindLabel.artist}${a.genre ? ` · ${this._hl(a.genre, q)}` : ""} · ${albums} album${albums === 1 ? "" : "s"} · ${songs} song${songs === 1 ? "" : "s"}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-artist="${this._esc(a.id)}" aria-label="Play ${this._esc(a.artist)}">${Icons.player.play(16)}</button>`;
    } else if (top.kind === "album") {
      const al = top.ref;
      attrs = `data-sr-album="${this._esc(al.albumId)}" data-artist-id="${this._esc(al.artistId)}"`;
      art = `<img src="${this._esc(al.coverUrl || "")}" alt="" loading="lazy">`;
      title = this._hl(al.albumName, q);
      sub = `${kindLabel.album}${al.year ? ` · ${this._esc(al.year)}` : ""} · ${this._hl(al.artistName, q)} · ${al.songCount} song${al.songCount === 1 ? "" : "s"}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-album="${this._esc(al.albumId)}" data-artist-id="${this._esc(al.artistId)}" aria-label="Play ${this._esc(al.albumName)}">${Icons.player.play(16)}</button>`;
    } else {
      const p = top.ref;
      attrs = `data-sr-playlist="${this._esc(p.id)}"`;
      art = `<span class="srHeroArtFallback">${Icons.general.playlist(30)}</span>`;
      title = this._hl(p.name, q);
      sub = `${kindLabel.playlist} · ${p.songs.length} song${p.songs.length === 1 ? "" : "s"}`;
    }
    return `
      <div class="srHero" data-sr-item ${attrs} role="button" tabindex="-1">
        <span class="srHeroArt${top.kind === "artist" ? " round" : ""}">${art}${playBtn}</span>
        <span class="srHeroBody">
          <span class="srHeroBadge">${Icons.general.sparkles(12)} Top result</span>
          <span class="srHeroTitle">${title}</span>
          <span class="srHeroSub">${sub}</span>
        </span>
      </div>
    `;
  }
  _songRow(song, i, q) {
    const isFav = this.ui.favorites.isSong(song.id);
    return `
      <div class="srRow" data-sr-item data-sr-song="${this._esc(song.id)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srRowNum">${i + 1}</span>
        <span class="srRowArt"><img src="${this._esc(song.coverUrl || "")}" alt="" loading="lazy"><span class="srRowPlay">${Icons.player.play(11)}</span></span>
        <span class="srRowText"><span class="srRowTitle">${this._hl(song.title, q)}</span><span class="srRowSub">${this._hl(song.artist || "", q)}${song.album ? ` · ${this._hl(song.album, q)}` : ""}</span></span>
        <button type="button" class="srIconBtn heart${isFav ? " favorited is-favorite" : ""}" data-fav-song="${this._esc(song.id)}" aria-label="Favorite ${this._esc(song.title)}">${this.ui.likeStatus("song", isFav, false, null)}</button>
        <button type="button" class="srIconBtn" data-more-song="${this._esc(song.id)}" aria-label="More options">${Icons.general.moreVert(15)}</button>
        <span class="srRowTime">${this._esc(song.duration || "")}</span>
      </div>
    `;
  }
  _albumCard(al, i, q) {
    return `
      <div class="srCard" data-sr-item data-sr-album="${this._esc(al.albumId)}" data-artist-id="${this._esc(al.artistId)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srCardArt"><img src="${this._esc(al.coverUrl || "")}" alt="" loading="lazy"><button type="button" class="srCardPlay" data-sr-play data-sr-album="${this._esc(al.albumId)}" data-artist-id="${this._esc(al.artistId)}" aria-label="Play ${this._esc(al.albumName)}">${Icons.player.play(13)}</button></span>
        <span class="srCardTitle">${this._hl(al.albumName, q)}</span>
        <span class="srCardSub">${al.year ? `${this._esc(al.year)} · ` : ""}${this._hl(al.artistName, q)}</span>
      </div>
    `;
  }
  _artistCard(a, i, q) {
    const albums = a.albums ? a.albums.length : 0;
    return `
      <div class="srCard srCardArtist" data-sr-item data-sr-artist="${this._esc(a.id)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srCardArt round"><img src="${this._esc(a.imageUrl || "")}" alt="" loading="lazy"></span>
        <span class="srCardTitle">${this._hl(a.artist, q)}</span>
        <span class="srCardSub">Artist · ${albums} album${albums === 1 ? "" : "s"}</span>
      </div>
    `;
  }
  _playlistRow(p, i, q) {
    return `
      <div class="srRow" data-sr-item data-sr-playlist="${this._esc(p.id)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srRowArt srRowArtPl">${Icons.general.playlist(20)}</span>
        <span class="srRowText"><span class="srRowTitle">${this._hl(p.name, q)}</span><span class="srRowSub">Playlist · ${p.songs.length} song${p.songs.length === 1 ? "" : "s"}</span></span>
        <span class="srRowGo">${Icons.general.arrowRight(15)}</span>
      </div>
    `;
  }
  renderDropdown() {
    const q = (this.ui.state.searchQuery || "").trim();
    if (!q) return "";
    const { top, songs, artists, albums, playlists } = this._collect(q);
    this._lastQueue = songs.map(s => s.ref);
    if (!top && !songs.length && !artists.length && !albums.length && !playlists.length) {
      return `
        <div class="srEmpty">
          <span class="srEmptyIcon">${Icons.general.search(26)}</span>
          <p class="srEmptyTitle">No results for &ldquo;${this._esc(q)}&rdquo;</p>
          <p class="srEmptySub">Check the spelling, or try a different song, artist, album or playlist.</p>
        </div>
      `;
    }
    const section = (label, inner) => `<section class="srSection"><h4 class="srLabel">${label}</h4>${inner}</section>`;
    let html = "";
    if (top) html += this._hero(top, q);
    if (songs.length) html += section("Songs", `<div class="srRows">${songs.map((h, i) => this._songRow(h.ref, i, q)).join("")}</div>`);
    if (albums.length) html += section("Albums", `<div class="srCards">${albums.map((h, i) => this._albumCard(h.ref, i, q)).join("")}</div>`);
    if (artists.length) html += section("Artists", `<div class="srCards">${artists.map((h, i) => this._artistCard(h.ref, i, q)).join("")}</div>`);
    if (playlists.length) html += section("Playlists", `<div class="srRows">${playlists.map((h, i) => this._playlistRow(h.ref, i, q)).join("")}</div>`);
    html += `<div class="srFoot"><span><kbd>&#8593;</kbd><kbd>&#8595;</kbd> navigate</span><span><kbd>&#8629;</kbd> open</span><span><kbd>esc</kbd> close</span></div>`;
    return html;
  }
  _activate(el, forcePlay = false) {
    if (!el) return;
    const d = el.dataset;
    const ui = this.ui;
    if (d.srSong) {
      const song = ui.state.getSongById(d.srSong);
      if (song) ui.audioPlayer.playSong(song, this._lastQueue && this._lastQueue.length ? this._lastQueue : null, true, "search");
      this.closeSearch();
      return;
    }
    if (d.srAlbum) {
      if (forcePlay) { const queue = Utils.albumQueue(ui.state, d.artistId, d.srAlbum); if (queue.length) ui.audioPlayer.playSong(queue[0], queue, true, "album"); }
      else ui.navigate("artist", d.artistId, d.srAlbum);
      this.closeSearch();
      return;
    }
    if (d.srArtist) {
      if (forcePlay && ui.libraryPage?.playArtist) ui.libraryPage.playArtist(d.srArtist);
      else ui.navigate("artist", d.srArtist);
      this.closeSearch();
      return;
    }
    if (d.srPlaylist) {
      const pl = (ui.state.playlists || []).find(p => String(p.id) === String(d.srPlaylist));
      if (pl) { ui.state.selectedPlaylistName = pl.name; ui.state.selectedPlaylistId = pl.id; }
      ui.navigate("playlists");
      this.closeSearch();
    }
  }
  attachResultEvents(container) {
    if (!container) return;
    if (!container._srDelegated) {
      container._srDelegated = true;
      container.addEventListener("click", e => {
        const more = e.target.closest("[data-more-song]");
        if (more) { e.stopPropagation(); this.ui.contentEvents.showSongMenu(more.dataset.moreSong, e); return; }
        const play = e.target.closest("[data-sr-play]");
        if (play) { e.stopPropagation(); this._activate(play, true); return; }
        const item = e.target.closest("[data-sr-item]");
        if (item) {
          if (e.target.closest("[data-fav-song]")) return;
          this._activate(item, false);
        }
      });
    }
    container.querySelectorAll("[data-fav-song]").forEach(btn => this.ui.contentEvents.setupHeartButton(btn, "song", btn.dataset.favSong));
  }
  _bindKeyboard() {
    if (this._kbBound) return;
    const input = document.getElementById("search-input");
    if (!input) return;
    this._kbBound = true;
    input.addEventListener("keydown", e => {
      if (!this.ui.state.isSearchOpen) return;
      const items = [...document.querySelectorAll("#search-results-container [data-sr-item]")];
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!items.length) return;
        e.preventDefault();
        this.activeIndex = e.key === "ArrowDown" ? (this.activeIndex + 1) % items.length : (this.activeIndex - 1 + items.length) % items.length;
        items.forEach((el, i) => el.classList.toggle("sr-active", i === this.activeIndex));
        items[this.activeIndex].scrollIntoView?.({ block: "nearest" });
      } else if (e.key === "Enter") {
        if (!items.length) return;
        e.preventDefault();
        this._activate(items[this.activeIndex] || items[0], false);
      }
    });
  }
  attachCategoryCollapse() {}
  attachSearchDropdownEvents() {}
}

class UIManager {
  constructor(state, audioPlayer, favorites) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    this.favorites = favorites;
    this.isTransitioning = false;
    this.isBreadcrumbHidden = false;
    this.state.favoritesTab = "songs";
    this.state.selectedPlaylistName = null;
    this.state.isCreatingPlaylist = false;
    this.skipProgress = false;
    this.fragmentLoadDelay = 1500;
    this.popoverDelay = 400;
    this._spinner = null;
    this._favTabLoading = false;
    this._artistTabLoading = false;
    this.router = new AppRouter(this);
    this.player = new PlayerManager(this);
    this.search = new Search(this);
    this.contentEvents = new ContentEvents(this);
    this.homePage = new Home(this);
    this.libraryPage = new Library(this);
    this.favoritesPage = new Favorites(this);
    this.playlistsPage = new Playlists(this);
    this.editPlaylistPage = new EditPlaylist(this);
    this.artistPage = new Artists(this);
    this.errorPage = new Error404(this);
    this.init();
    window.NProgress?.configure({ showSpinner: true, speed: 300, trickleSpeed: 600 });
  }
  _ensureSpinner() {
    const main = document.getElementById("main-content");
    if (!main) return null;
    if (!this._spinner || !this._spinner.el || !main.contains(this._spinner.el)) {
      this._spinner?.remove?.();
      this._spinner = new Spinner({ type: "area", container: main });
    }
    return this._spinner;
  }
  showSpinner() { this._ensureSpinner()?.show(); }
  hideSpinner() { this._spinner?.hide(); }
  init() {
    this.render = this.render.bind(this);
    this.navigate = this.navigate.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    AppListeners.bindAll(this);
    this.router.syncWithURL();
    window.addEventListener("popstate", this.handlePopState);
  }
  navigate(page, artistId = null, albumId = null) {
    if (!this.skipProgress && window.NProgress) NProgress.start();
    this.skipProgress = false;
    this.router.goTo(page, artistId, albumId);
  }
  handlePopState() { this.router.handlePopState(); }
  render() {
    this.main = document.getElementById("main-content");
    this.scrollToTop();
    if (this.isTransitioning) {
      if (this.transitionStart && Date.now() - this.transitionStart > 2000) {
        console.warn("[UIManager] Transition timeout — forcing reset");
        this.isTransitioning = false;
      } else return;
    }
    this.isTransitioning = true;
    this.transitionStart = Date.now();
    Object.assign(this.main.style, { transition: "opacity 0.3s ease, transform 0.3s ease, filter 0.3s ease", opacity: "0", transform: "translateY(10px)", filter: "blur(8px)" });
    this.routes();
    this.player.renderMiniPlayer();
  }
  routes() {
    const pageMap = {
      home: () => this.homePage.render(),
      library: () => this.libraryPage.render(),
      favorites: () => this.favoritesPage.render(),
      playlists: () => this.playlistsPage.render(),
      editPlaylist: () => this.editPlaylistPage.render(),
      artist: () => this.artistPage.render(),
      404: () => this.errorPage.render()
    };
    setTimeout(() => {
      try {
        this.main.innerHTML = (pageMap[this.state.currentPage] ?? (() => "<div>Not found</div>"))();
        this._ensureSpinner();
        Object.assign(this.main.style, { opacity: "1", transform: "translateY(0)", filter: "blur(0px)" });
        setTimeout(() => { this.main.style.transition = ""; this.isTransitioning = false; }, 300);
        this.contentEvents.attachContentEvents();
        if (window.NProgress && NProgress.status !== null) NProgress.done();
        this._maybeAutoPlayDeepLink();
      } catch (err) {
        console.error("[UIManager] Page render error:", err);
        this.isTransitioning = false;
        if (window.NProgress && NProgress.status !== null) NProgress.done();
      }
    }, 300);
  }
  scrollSection(title, cards) {
    return `<section data-area="scroll" class="section container"><h2 class="section-header">${title}</h2><div class="scroll-row">${cards.join("")}</div></section>`;
  }
  albumCard(artistId, artistName, albumId, albumName, coverUrl, index = 0, size = "170px") {
    const album = this.state.getAlbumById(albumId);
    const isFav = albumId && this.favorites.isAlbum(albumId);
    const songCount = album?.songs?.length || 0;
    return `
<div class="card animate-fadeInUp" style="--d: ${index * 50}ms" data-artist-id="${artistId}" data-album-id="${albumId}">
  <div class="imgBx"><img src="${coverUrl}" alt="${Utils.esc(albumName)}" loading="lazy"></div>
  <div class="content">
    <div class="contentBx"><h3>${albumName}<br><span>${artistName} • ${songCount} song${songCount === 1 ? "" : "s"}</span></h3></div>
    <ul class="sci">
      <li style="--i:1"><a href="#" data-hover-action="play-album" data-artist-id="${artistId}" data-album-id="${albumId}" title="Play"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path opacity=".4" fill="currentColor" d="M48 256a208 208 0 1 0 416 0 208 208 0 1 0 -416 0zm128-88c0-8.7 4.7-16.7 12.3-20.9s16.8-4.1 24.3 .5l144 88c7.1 4.4 11.5 12.1 11.5 20.5s-4.4 16.1-11.5 20.5l-144 88c-7.4 4.5-16.7 4.7-24.3 .5S176 352.7 176 344l0-176z"/><path fill="currentColor" d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM212.5 147.5c-7.4-4.5-16.7-4.7-24.3-.5S176 159.3 176 168l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88zM298 256l-74 45.2 0-90.4 74 45.2z"/></svg></a></li>
      <li style="--i:2"><a href="#" data-hover-action="shuffle-album" data-artist-id="${artistId}" data-album-id="${albumId}" title="Shuffle">${Icons.player.shuffle(16)}</a></li>
      <li style="--i:3"><a href="#" class="${isFav ? "favorited" : ""}" data-hover-action="favorite-album" data-album-id="${albumId}" title="Favorite">${Icons.general.heart(16, isFav)}</a></li>
      <li style="--i:4"><a href="#" data-hover-action="album-playlist" data-artist-id="${artistId}" data-album-id="${albumId}" title="Add to playlist">${Icons.general.playlistAdd(16)}</a></li>
    </ul>
  </div>
</div>
    `;
  }
  artistCard(artist, index = 0) {
    const isFav = this.favorites.isArtist(artist.id);
    const albumCount = artist.albums?.length || 0;
    return `
<div class="card animate-fadeInUp" style="--d: ${index * 60}ms" data-artist-id="${artist.id}">
  <div class="imgBx"><img src="${artist.imageUrl}" alt="${Utils.esc(artist.artist)}" loading="lazy"></div>
  <div class="content">
    <div class="contentBx"><h3>${artist.artist}<br><span>${artist.genre || "Artist"} • ${albumCount} album${albumCount === 1 ? "" : "s"}</span></h3></div>
    <ul class="sci">
      <li style="--i:1"><a href="#" data-hover-action="view-artist" data-artist-id="${artist.id}" title="View">${Icons.general.eye(16)}</a></li>
      <li style="--i:2"><a href="#" data-hover-action="play-artist" data-artist-id="${artist.id}" title="Play top">${Icons.player.play(16)}</a></li>
      <li style="--i:3"><a href="#" class="${isFav ? "favorited" : ""}" data-hover-action="favorite-artist" data-artist-id="${artist.id}" title="Favorite">${Icons.general.heart(16, isFav)}</a></li>
    </ul>
  </div>
</div>
    `;
  }
  recentCard(song, index = 0) {
    return `
      <div data-card="album" class="card animate-fadeInUp" style="--w: 140px; --d: ${index * 50}ms">
        <div class="art-wrap" data-song-id="${song.id}" data-play-source="home"><img src="${song.coverUrl}" alt="${Utils.esc(song.title)}" loading="lazy"><div class="art-overlay"><span class="play-glyph">${Icons.player.play(16)}</span></div></div>
        <div class="card-info"><p class="primary">${song.title}</p><p class="secondary">${song.artist}</p></div>
      </div>
    `;
  }
  songRow(song, index, showDuration = true) {
    const artistId = song.artistId;
    const albumId = song.albumId;
    return `
      <div class="song-row animate-fadeInUp" style="--d: ${index * 25}ms">
        <button class="main" data-song-id="${song.id}">
          <img src="${song.coverUrl}" class="cover">
          <div class="info"><p class="title">${song.title}</p><p class="sub">${this.artistNameTooltip(artistId)} • <span class="album-link" data-artist-id="${artistId}" data-album-id="${albumId}" onclick="event.stopPropagation(); window.uiManager.navigate('artist', '${artistId}', '${albumId}')">${song.album}</span></p></div>
        </button>
        <button class="downloadBtn" data-action="download-song" data-song-id="${song.id}" data-song-title="${song.title}" data-song-thumbnail="${song.coverUrl}" title="Download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
        ${showDuration ? `<span class="time">${song.duration}</span>` : ""}
        <button class="heart ${this.favorites.isSong(song.id) ? "favorited" : ""}" data-fav-song="${song.id}">${this.likeStatus("song", this.favorites.isSong(song.id), false, null)}</button>
      </div>
    `;
  }
  artistNameTooltip(artistId, displayText = null) {
    const artist = this.state.getArtistById(artistId);
    if (!artist) return displayText || "Unknown";
    const name = artist.artist;
    const text = displayText || name;
    return `<div class="tooltip-wrapper" tabindex="0" role="button"><span class="text">${text}<span class="popup" role="tooltip" onclick="event.stopPropagation(); window.uiManager.navigate('artist', '${artistId}')">View Artist</span></span></div>`;
  }
  editPlaylist(playlistId) {
    this.state.editingPlaylistId = playlistId;
    const pl = this.state.playlists.find(p => String(p.id) === String(playlistId));
    this.state.selectedPlaylistName = pl?.name || null;
    history.pushState(null, "", `/playlist/${playlistId}/edit`);
    this.navigate("editPlaylist");
  }
  _maybeAutoPlayDeepLink() {
    const songId = this.state.pendingDeepLinkSong;
    if (!songId) return;
    this.state.pendingDeepLinkSong = null;
    const url = new URL(window.location.href);
    url.searchParams.delete("song");
    history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
    if (this.state.currentPage !== "artist") return;
    const song = this.state.getSongById(songId);
    if (!song) return;
    const queue = Utils.albumQueue(this.state, song.artistId, song.albumId);
    const startSong = queue.find(s => Utils.id(s.id) === Utils.id(songId)) || song;
    this.audioPlayer.playSong(startSong, queue.length ? queue : null, true, "album");
  }
  toggleTheme() { Prefs.applyTheme(Prefs.nextToggle()); }
  showSettingsModal() {
    const popups = window.popups;
    if (!popups) return;
    const currentTheme = Prefs.theme();
    const darkThemes = Prefs.listThemes().filter(t => t.dark);
    const lightThemes = Prefs.listThemes().filter(t => !t.dark);
    const themeCard = ({ key, label, preview }) => `
      <button type="button" class="popups-theme-card ${key === currentTheme ? "active" : ""}" data-theme-option="${key}" role="radio" aria-checked="${key === currentTheme}" aria-label="${label} theme">
        <span class="popups-theme-preview" style="--preview-bg:${preview.bg};--preview-card:${preview.card};--preview-text:${preview.text};--preview-accent:${preview.accent};">
          <span class="popups-theme-preview-bar"></span>
          <span class="popups-theme-preview-body"><span class="popups-theme-preview-chip"></span><span class="popups-theme-preview-line"></span></span>
          <span class="popups-theme-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        </span>
        <span class="popups-theme-name">${label}</span>
      </button>
    `;
    const content = document.createElement("div");
    content.className = "popups-settings";
    content.innerHTML = `
      <section class="popups-settings-section">
        <p class="popups-settings-label">Color scheme — Dark</p>
        <div class="popups-theme-grid" role="radiogroup" aria-label="Dark color schemes">${darkThemes.map(themeCard).join("")}</div>
      </section>
      <section class="popups-settings-section">
        <p class="popups-settings-label">Color scheme — Light</p>
        <div class="popups-theme-grid" role="radiogroup" aria-label="Light color schemes">${lightThemes.map(themeCard).join("")}</div>
      </section>
      <section class="popups-settings-section">
        <p class="popups-settings-label">Playback</p>
        <label class="popups-toggle"><input type="checkbox" id="pref-fade" ${Prefs.get("fadeTransitions") ? "checked" : ""}><span>Fade transitions between tracks</span></label>
        <label class="popups-toggle"><input type="checkbox" id="pref-radio" ${Prefs.get("radioAutoplay") ? "checked" : ""}><span>Radio autoplay when queue ends</span></label>
      </section>
    `;
    popups.modal({
      title: "Settings", size: "md", content, closable: true, autoClose: false,
      onClose: () => { document.documentElement.classList.remove("modal-open"); document.body.classList.remove("modal-open"); }
    });
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    const setActiveCard = activeEl => {
      content.querySelectorAll(".popups-theme-card").forEach(el => {
        const on = el === activeEl;
        el.classList.toggle("active", on);
        el.setAttribute("aria-checked", String(on));
      });
    };
    content.querySelectorAll(".popups-theme-card").forEach(btn => {
      btn.addEventListener("click", () => {
        const next = btn.dataset.themeOption;
        if (!next || !Prefs.isValidTheme(next)) return;
        Prefs.applyTheme(next);
        setActiveCard(btn);
        popups.toast({ message: `Theme: ${Prefs.THEMES[next].label}` });
      });
    });
    content.querySelector("#pref-fade")?.addEventListener("change", e => {
      Prefs.set("fadeTransitions", e.target.checked);
      popups.toast({ message: e.target.checked ? "Fade transitions on" : "Fade transitions off" });
    });
    content.querySelector("#pref-radio")?.addEventListener("change", e => {
      Prefs.set("radioAutoplay", e.target.checked);
      popups.toast({ message: e.target.checked ? "Radio autoplay on" : "Radio autoplay off" });
    });
    setTimeout(() => { content.querySelector(".popups-theme-card.active, .popups-theme-card, input, button")?.focus(); }, 50);
  }
  openSearch() { this.search.openSearch(); }
  closeSearch() { this.search.closeSearch(); }
  showArtistPopover(artistId, event) { this.contentEvents.showArtistPopover(artistId, event); }
  closePlayerDrawer() { this.player.closeDrawer(); }
  openPlayerDrawer() { this.player.openDrawer(); }
  updateMiniPlayer() { this.player.renderMiniPlayer(); }
  updateProgressOnly() { this.player.updateProgressOnly(); }
  updateFullPlayer() {
    const drawer = document.getElementById("full-player-drawer");
    if (drawer) this.player.softUpdateDrawer(drawer);
    else if (this.state.isDrawerOpen) this.player.renderFullPlayer();
  }
  showShortcutsHelp() {
    const shortcuts = [
      ["Space", "Play / Pause"], ["←", "Previous track"], ["→", "Next track"], ["↑", "Volume up"], ["↓", "Volume down"],
      ["M", "Mute"], ["L", "Favorite current song"], ["S", "Shuffle"], ["R", "Cycle repeat mode"], ["Q", "Up Next queue"],
      ["Ctrl/⌘ + K", "Search"], ["?", "This help"], ["Esc", "Close dialogs"]
    ];
    this.state.modalOpen(`
      <div data-modal="shortcuts" class="shortcuts-help">
        <div class="head"><h2 class="title">Keyboard Shortcuts</h2>
          <button onclick="window.closeModal()" class="close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div data-list="shortcuts" class="grid">
          ${shortcuts.map(([key, description]) => `<div class="row"><span class="desc">${description}</span><kbd class="kbd">${key}</kbd></div>`).join("")}
        </div>
      </div>
    `);
  }
  scrollToTop(duration = 500) {
    const startY = window.scrollY;
    const startTime = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 4);
    const step = now => {
      const progress = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, startY * (1 - ease(progress)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  refreshArtistContent(artistId, albumId) {
    if (this._artistTabLoading) return;
    if (artistId !== this.state.artistId) { this.navigate("artist", artistId, albumId); return; }
    this._artistTabLoading = true;
    this.state.selectedAlbumId = albumId;
    this.router.updateTitle();
    this.router.updateBreadcrumbs();
    const artist = this.state.getArtistById(artistId);
    const album = artist?.albums.find(a => IdUtils.norm(a.id) === IdUtils.norm(albumId));
    if (!artist || !album) { this._artistTabLoading = false; return; }
    const coverContainer = document.querySelector(".hero-card .hero-cover");
    const songsArea = document.querySelector('[data-list="songs"]');
    const aboutArea = document.querySelector('[data-page="artist"] > [data-area="about"]');
    const coverSpinner = coverContainer ? new Spinner({ type: "area", container: coverContainer }) : null;
    const songsSpinner = songsArea ? new Spinner({ type: "area", container: songsArea }) : null;
    coverSpinner?.show();
    songsSpinner?.show();
    songsArea?.classList.add("isLoading");
    setTimeout(() => {
      if (coverContainer && album.coverUrl) {
        const img = coverContainer.querySelector("img");
        if (img) img.src = album.coverUrl;
        else coverContainer.style.backgroundImage = `url(${album.coverUrl})`;
      }
      if (songsArea) {
        const songsHTML = `<div class="header"><div class="left"><span class="badge">${album.certification || "Double Platinum"}</span><span class="year">${album.year || "2024"}</span></div><span class="hint">Double-click</span></div><div class="body">${album.songs.map((song, i) => this.artistPage.createSongRow(song, i, artist, album)).join("")}</div>`;
        songsArea.innerHTML = songsHTML;
        songsArea?.classList.remove("isLoading");
        this.contentEvents.attachContentEvents();
      }
      if
