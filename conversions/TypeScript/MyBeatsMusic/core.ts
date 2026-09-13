/* ============================================================
   core.ts — Utilities, preferences, theming, progress, icons
   ============================================================ */

import type {
  ColorScheme,
  PrefsData,
  ThemeConfig,
  ThemeKey,
} from './types';

/* ============================================================
   Config
   ============================================================ */

export const Config = {
  IMAGE_BASE: {
    artist:
      'https://raw.githubusercontent.com/ClockBlocked/beats/refs/heads/ClockBlocked-patch-1/content/artistPortraits/',
    album:
      'https://raw.githubusercontent.com/ClockBlocked/beats/refs/heads/ClockBlocked-patch-1/content/albumCovers/',
  },
  FAVOURITES: {
    favSongs: 'Songs',
    favArtists: 'Artists',
    favAlbums: 'Albums',
    favPlaylists: 'FavPlaylists',
    playlists: 'Playlists',
  },
  DEFAULT_COVER:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23333"/%3E%3Ccircle cx="50" cy="50" r="30" fill="%23666"/%3E%3C/svg%3E',
  QUEUE: { recentMax: 30 },
  VOLUME: { default: 1 },
} as const;

/* ============================================================
   Utils
   ============================================================ */

export class Utils {
  static slug(name?: string): string {
    return name
      ? name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim() || 'default'
      : 'default';
  }

  static clamp(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val));
  }

  static shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]!;
      a[i] = a[j]!;
      a[j] = tmp;
    }
    return a;
  }

  static fmtTime(s: number | null | undefined): string {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  static id(val: unknown): string {
    return val == null ? '' : String(val);
  }

  static newId(prefix = 'id'): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }

  static esc(str: unknown = ''): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  static fmtDuration(raw: string | number | null | undefined): string {
    if (raw === null || raw === undefined || raw === '') return '';
    if (typeof raw === 'string') {
      const text = raw.trim();
      if (!text) return '';
      if (text.includes(':') || /[a-zA-Z]/.test(text)) return text;
      const parsed = Number(text);
      if (!Number.isFinite(parsed)) return text;
      return Utils.fmtTime(parsed);
    }
    if (!Number.isFinite(raw) || raw <= 0) return String(raw);
    return Utils.fmtTime(raw);
  }

  /**
   * albumQueue — resolves a list of songs from a given artist+album into
   * fully enriched Song objects. Takes a minimally duck-typed state object
   * so it can be used before PlayerState is instantiated.
   */
  static albumQueue(
    state: { getArtistById: (id: string) => unknown },
    artistId: string,
    albumId: string,
  ): Song[] {
    const artist = state.getArtistById(artistId) as
      | import('./types').Artist
      | null;
    const album = artist?.albums.find(
      (a) => Utils.id(a.id) === Utils.id(albumId),
    );
    if (!artist || !album) return [];
    return album.songs.map((s) => ({
      ...s,
      artistId: artist.id,
      albumId: album.id,
      artist: artist.artist,
      album: album.album,
      coverUrl: album.coverUrl,
      artistImageUrl: artist.imageUrl,
    }));
  }

  /* ---------- Colour math helpers (used by visualizer) ---------- */

  static hslToRgb(hsl: string | { h: number; s: number; l: number }): {
    r: number;
    g: number;
    b: number;
  } {
    let h: number, s: number, l: number;
    if (typeof hsl === 'string') {
      const parts = hsl.trim().split(/\s+/).map(Number);
      [h, s, l] = parts.length >= 3 ? (parts as [number, number, number]) : [0, 0, 50];
    } else {
      h = hsl.h;
      s = hsl.s;
      l = hsl.l;
    }
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }
}

/* Need the Song type import at the bottom to avoid a circular import
   at module-evaluation time. */
import type { Song } from './types';

/* ============================================================
   Prefs
   ============================================================ */

export class Prefs {
  static readonly KEY = 'mybeats.prefs.v1';
  private static _cache: PrefsData | null = null;

  static readonly THEMES: Record<ThemeKey, ThemeConfig> = {
    dark: {
      label: 'Dark',
      dark: true,
      preview: { bg: '53 59 69', card: '44 49 60', text: '171 178 191', accent: '198 120 221' },
    },
    onedark: {
      label: 'One Dark',
      dark: true,
      preview: { bg: '41 48 60', card: '36 42 54', text: '176 186 202', accent: '170 126 218' },
    },
    mocha: {
      label: 'Mocha',
      dark: true,
      preview: { bg: '58 58 61', card: '49 49 52', text: '188 188 191', accent: '168 142 200' },
    },
    tokoyonight: {
      label: 'Tokoyo Night',
      dark: true,
      preview: { bg: '49 62 55', card: '42 53 46', text: '180 193 181', accent: '109 168 129' },
    },
    moon: {
      label: 'Moon',
      dark: true,
      preview: { bg: '232 224 212', card: '226 218 206', text: '38 30 22', accent: '148 102 130' },
    },
    light: {
      label: 'Light',
      dark: false,
      preview: { bg: '218 228 240', card: '212 222 235', text: '16 24 38', accent: '72 118 190' },
    },
    bloom: {
      label: 'Bloom',
      dark: false,
      preview: { bg: '236 222 204', card: '230 215 196', text: '44 34 20', accent: '172 112 68' },
    },
  };

  static readonly DEFAULT_THEME: ThemeKey = 'dark';
  static readonly DEFAULT_LIGHT: ThemeKey = 'light';

  private static _read(): PrefsData {
    if (Prefs._cache) return Prefs._cache;
    try {
      const raw = localStorage.getItem(Prefs.KEY);
      Prefs._cache = raw ? (JSON.parse(raw) as PrefsData) : {};
    } catch {
      Prefs._cache = {};
    }
    return Prefs._cache;
  }

  private static _write(data: PrefsData): void {
    Prefs._cache = data;
    try {
      localStorage.setItem(Prefs.KEY, JSON.stringify(data));
    } catch {
      /* quota errors — silently ignore */
    }
  }

  static get<T = unknown>(key: string, fallback: T | null = null): T | null {
    const data = Prefs._read();
    return key in data ? (data[key] as T) : fallback;
  }

  static set(key: string, value: unknown): void {
    const data = Prefs._read();
    data[key] = value;
    Prefs._write(data);
  }

  static isValidTheme(name: unknown): name is ThemeKey {
    return typeof name === 'string' && name in Prefs.THEMES;
  }

  static theme(): ThemeKey {
    const saved = Prefs.get('theme');
    return Prefs.isValidTheme(saved) ? saved : Prefs.DEFAULT_THEME;
  }

  static listThemes(): Array<ThemeConfig & { key: ThemeKey }> {
    return (Object.entries(Prefs.THEMES) as Array<[ThemeKey, ThemeConfig]>).map(
      ([key, cfg]) => ({ key, ...cfg }),
    );
  }

  static applyTheme(
    name: ThemeKey,
    { persist = true }: { persist?: boolean } = {},
  ): void {
    if (!Prefs.isValidTheme(name)) name = Prefs.DEFAULT_THEME;
    const cfg = Prefs.THEMES[name];
    document.documentElement.setAttribute('data-theme', name);
    document.body.classList.toggle('dark', cfg.dark);
    document
      .querySelectorAll<HTMLElement>('.theme-toggle-btn')
      .forEach((b) => b.classList.toggle('dark', cfg.dark));
    if (persist) {
      Prefs.set('theme', name);
      if (cfg.dark) Prefs.set('lastDarkTheme', name);
      else Prefs.set('lastLightTheme', name);
      try {
        localStorage.setItem('theme', cfg.dark ? 'dark' : 'light');
      } catch {
        /* ignore */
      }
    }
    window.dispatchEvent(
      new CustomEvent('themechange', { detail: { theme: name, dark: cfg.dark } }),
    );
  }

  static nextToggle(): ThemeKey {
    const current = Prefs.theme();
    const cfg = Prefs.THEMES[current];
    if (cfg.dark) {
      const lastLight = Prefs.get('lastLightTheme');
      return Prefs.isValidTheme(lastLight) && !Prefs.THEMES[lastLight].dark
        ? lastLight
        : Prefs.DEFAULT_LIGHT;
    }
    const lastDark = Prefs.get('lastDarkTheme');
    return Prefs.isValidTheme(lastDark) && Prefs.THEMES[lastDark].dark
      ? lastDark
      : Prefs.DEFAULT_THEME;
  }

  static init(): void {
    const savedTheme = Prefs.get('theme');
    const theme = Prefs.isValidTheme(savedTheme) ? savedTheme : Prefs.DEFAULT_THEME;
    document.documentElement.setAttribute('data-theme', theme);
    Prefs.set('theme', theme);

    const savedAccent = Prefs.get('accent', 'coral');
    document.documentElement.setAttribute('data-accent', String(savedAccent));
    Prefs.set('accent', savedAccent);

    window.Prefs = Prefs;
  }
}

/* ============================================================
   IdUtils
   ============================================================ */

export class IdUtils {
  static norm(v: unknown): string {
    return Utils.id(v);
  }

  static sample<T>(arr: readonly T[], n: number): T[] {
    return Utils.shuffle(arr).slice(0, n);
  }
}

/* ============================================================
   ColorExtractor
   ============================================================ */

interface ColorExtractorOptions {
  sampleRate: number;
  skipThreshold: number;
  whiteThreshold: number;
  colorQuantize: number;
  dominantColorCount: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

export class ColorExtractor {
  private cache = new Map<string, ColorScheme>();
  private defaultColors: ColorScheme = {
    primary: '20 20 40',
    secondary: '28 32 52',
    accent: '220 38 38',
  };
  private opts: ColorExtractorOptions;

  constructor(options: Partial<ColorExtractorOptions> = {}) {
    this.opts = {
      sampleRate: 10,
      skipThreshold: 30,
      whiteThreshold: 225,
      colorQuantize: 10,
      dominantColorCount: 3,
      ...options,
    };
  }

  async extract(imageUrl: string | undefined | null): Promise<ColorScheme> {
    if (!imageUrl) return { ...this.defaultColors };
    if (this.cache.has(imageUrl)) return this.cache.get(imageUrl)!;
    try {
      const img = await this._loadImg(imageUrl);
      const pixels = this._getPixels(img);
      const colors = this._domColors(pixels);
      this.cache.set(imageUrl, colors);
      return colors;
    } catch (err) {
      console.warn('[ColorExtractor] Extraction failed, using defaults.', err);
      return { ...this.defaultColors };
    }
  }

  applyPlayer(colors: ColorScheme): void {
    const root = document.documentElement;
    root.style.setProperty('--borderPrimary', colors.primary);
    root.style.setProperty('--textOthers', colors.secondary);
    root.style.setProperty('--playerAccent', colors.accent);
    root.style.setProperty(
      '--player-gradient',
      `linear-gradient(135deg, rgb(var(--player-primary)), rgb(var(--player-secondary)))`,
    );
    root.style.setProperty('--player-glow', this._toRGBA(colors.accent, 0.25));
    root.style.setProperty('--player-glow-strong', this._toRGBA(colors.accent, 0.5));
    root.style.setProperty('--player-tint', this._mixBlack(colors.primary, 0.65));
    window.dispatchEvent(new CustomEvent('themechange', { detail: { ...colors } }));
  }

  private _loadImg(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load error'));
      img.src = url;
    });
  }

  private _getPixels(img: HTMLImageElement): Uint8ClampedArray {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D context unavailable');
    const maxSize = 100;
    let { width, height } = img;
    if (width > height) {
      height = (height / width) * maxSize;
      width = maxSize;
    } else {
      width = (width / height) * maxSize;
      height = maxSize;
    }
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  }

  private _domColors(pixelData: Uint8ClampedArray): ColorScheme {
    const colorMap = new Map<string, number>();
    for (let i = 0; i < pixelData.length; i += this.opts.sampleRate * 4) {
      const r = pixelData[i]!;
      const g = pixelData[i + 1]!;
      const b = pixelData[i + 2]!;
      const a = pixelData[i + 3]!;
      if (a < 128) continue;
      const brightness = (r + g + b) / 3;
      if (brightness < this.opts.skipThreshold || brightness > this.opts.whiteThreshold) continue;
      const key = `${Math.floor(r / this.opts.colorQuantize)},${Math.floor(
        g / this.opts.colorQuantize,
      )},${Math.floor(b / this.opts.colorQuantize)}`;
      colorMap.set(key, (colorMap.get(key) ?? 0) + 1);
    }
    const sorted = [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.opts.dominantColorCount);
    const palette: RGB[] = sorted.map(([key]) => {
      const [r, g, b] = key.split(',').map((v) => parseInt(v, 10) * this.opts.colorQuantize);
      return { r: r!, g: g!, b: b! };
    });
    return this._buildScheme(palette);
  }

  private _buildScheme(palette: RGB[]): ColorScheme {
    if (!palette.length) return { ...this.defaultColors };
    const hslPalette = palette.map((c) => this._rgbToHsl(c));
    const primaryHSL: HSL = {
      h: hslPalette[0]!.h,
      s: Math.min(hslPalette[0]!.s, 40),
      l: Math.max(hslPalette[0]!.l, 80),
    };
    const secondaryHSL: HSL = {
      h: hslPalette[0]!.h,
      s: Math.min(hslPalette[0]!.s, 30),
      l: Math.min(hslPalette[0]!.l, 70),
    };
    const vibrant = hslPalette.reduce((a, b) => (a.s > b.s ? a : b));
    const accentHSL: HSL = {
      h: vibrant.h,
      s: Math.min(vibrant.s + 20, 100),
      l: Math.round((45 + 55) / 2),
    };
    return {
      primary: this._hslToRGBString(primaryHSL),
      secondary: this._hslToRGBString(secondaryHSL),
      accent: this._hslToRGBString(accentHSL),
    };
  }

  private _hslToRGBString({ h, s, l }: HSL): string {
    const rgb = this._hslToRgb(h, s, l);
    return `${rgb.r} ${rgb.g} ${rgb.b}`;
  }

  private _hslToRgb(h: number, s: number, l: number): RGB {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  private _rgbToHsl({ r, g, b }: RGB): HSL {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  private _mixBlack(rgbString: string, ratio: number): string {
    const [r, g, b] = rgbString.split(' ').map(Number);
    if (r === undefined || isNaN(r)) return rgbString;
    return `${Math.round(r * (1 - ratio))} ${Math.round(g! * (1 - ratio))} ${Math.round(
      b! * (1 - ratio),
    )}`;
  }

  private _toRGBA(rgbString: string, alpha: number): string {
    const [r, g, b] = rgbString.split(' ').map(Number);
    if (r === undefined || isNaN(r)) return `rgba(0,0,0,${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

/* ============================================================
   Spinner
   ============================================================ */

export type SpinnerType = 'page' | 'area' | 'inline';

export interface SpinnerOptions {
  type?: SpinnerType;
  container?: HTMLElement | null;
}

export class Spinner {
  private static _CSS_INJECTED = false;

  private static _injectStyles(): void {
    if (Spinner._CSS_INJECTED) return;
    const style = document.createElement('style');
    style.id = 'spnr-styles';
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
    Spinner._CSS_INJECTED = true;
  }

  private type: SpinnerType;
  private container: HTMLElement;
  el: HTMLElement | null = null;

  constructor({ type = 'page', container }: SpinnerOptions = {}) {
    Spinner._injectStyles();
    this.type = type;
    this.container = container ?? document.body;
    this._build();
  }

  private _build(): void {
    if (this.type === 'page' || this.type === 'area') this._buildOverlay();
    else if (this.type === 'inline') this._buildInline();
    else throw new Error(`Unknown spinner type: ${this.type}`);
    this.el!.classList.add('hide');
  }

  private _buildOverlay(): void {
    const overlay = document.createElement('div');
    overlay.classList.add('spnr-overlay', this.type === 'page' ? 'spnr-overlay--page' : 'spnr-overlay--area');
    const circle = document.createElement('div');
    circle.classList.add('spnr-circle');
    overlay.appendChild(circle);
    if (this.type === 'page') {
      document.body.appendChild(overlay);
    } else {
      if (!this.container) throw new Error('"area" spinner requires a container element.');
      if (window.getComputedStyle(this.container).position === 'static') {
        this.container.style.position = 'relative';
      }
      this.container.appendChild(overlay);
    }
    this.el = overlay;
  }

  private _buildInline(): void {
    if (!this.container) throw new Error('"inline" spinner requires a container element.');
    if (window.getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
    const inline = document.createElement('span');
    inline.classList.add('spnr-inline');
    const circle = document.createElement('div');
    circle.classList.add('spnr-circle');
    inline.appendChild(circle);
    this.container.appendChild(inline);
    this.el = inline;
  }

  show(): void {
    if (!this.el) return;
    this.el.classList.remove('hide');
    this.el.classList.add('show');
    this.container?.setAttribute('aria-busy', 'true');
  }

  hide(): void {
    if (!this.el) return;
    this.el.classList.remove('show');
    this.el.classList.add('hide');
    this.container?.removeAttribute('aria-busy');
  }

  remove(): void {
    this.el?.remove();
    this.el = null;
  }
}

/* ============================================================
   SearchUtils
   ============================================================ */

export class SearchUtils {
  static readonly recentKey = 'mybeats.recentSearches';
  static readonly maxRecent = 10;

  static fuzzy(text: string | undefined, query: string | undefined): boolean {
    if (!text || !query) return false;
    return text.toLowerCase().includes(query.toLowerCase());
  }

  static getRecent(): string[] {
    try {
      const raw = localStorage.getItem(this.recentKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  static addRecent(query: string): void {
    if (!query || query.trim() === '') return;
    const recent = this.getRecent();
    const clean = query.trim();
    const filtered = recent.filter((q) => q !== clean);
    filtered.unshift(clean);
    const trimmed = filtered.slice(0, this.maxRecent);
    try {
      localStorage.setItem(this.recentKey, JSON.stringify(trimmed));
    } catch {
      /* ignore */
    }
  }

  static clearRecent(): void {
    try {
      localStorage.removeItem(this.recentKey);
    } catch {
      /* ignore */
    }
  }
}

/* ============================================================
   PersistenceManager
   ============================================================ */

import type { PlayerState, AudioEngine } from './player';
import type { RepeatMode } from './types';

export class PersistenceManager {
  static readonly STORAGE_KEYS = {
    LAST_SONG: 'mybeats_last_song',
    QUEUE: 'mybeats_queue',
    QUEUE_INDEX: 'mybeats_queue_index',
    CURRENT_TIME: 'mybeats_current_time',
    IS_PLAYING: 'mybeats_is_playing',
    VOLUME: 'mybeats_volume',
    MUTED: 'mybeats_muted',
    PLAYBACK_RATE: 'mybeats_playback_rate',
    REPEAT_MODE: 'mybeats_repeat_mode',
    SHUFFLED: 'mybeats_shuffled',
    RECENTLY_PLAYED: 'mybeats_recently_played',
  } as const;

  private state: PlayerState;
  private audioPlayer: AudioEngine;
  private saveThrottle: number | null = null;
  private lastSavedTime = 0;
  private _restored = false;

  constructor(state: PlayerState, audioPlayer: AudioEngine) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.restore());
    } else {
      setTimeout(() => this.restore(), 50);
    }
    this.bind();
  }

  restore(): void {
    if (this._restored) return;
    this._restored = true;
    const K = PersistenceManager.STORAGE_KEYS;
    try {
      const vol = localStorage.getItem(K.VOLUME);
      if (vol !== null) {
        this.state.volume = parseFloat(vol);
        this.audioPlayer.setVolume(this.state.volume);
      }
      const muted = localStorage.getItem(K.MUTED);
      if (muted !== null) {
        this.state.isMuted = muted === 'true';
        this.audioPlayer.audio.volume = this.state.isMuted ? 0 : this.state.volume;
      }
      const rate = localStorage.getItem(K.PLAYBACK_RATE);
      if (rate !== null) {
        this.state.playbackRate = parseFloat(rate);
        this.audioPlayer.audio.playbackRate = this.state.playbackRate;
      }
      const repeat = localStorage.getItem(K.REPEAT_MODE) as RepeatMode | null;
      if (repeat !== null) this.state.repeatMode = repeat;
      const shuffled = localStorage.getItem(K.SHUFFLED);
      if (shuffled !== null) this.state.isShuffled = shuffled === 'true';

      const savedQueue = localStorage.getItem(K.QUEUE);
      const savedIdx = localStorage.getItem(K.QUEUE_INDEX);
      const lastSong = localStorage.getItem(K.LAST_SONG);
      if (savedQueue && savedIdx !== null && lastSong) {
        const queue = JSON.parse(savedQueue) as Song[];
        const song = JSON.parse(lastSong) as Song;
        const idx = parseInt(savedIdx, 10);
        if (queue.length && idx >= 0 && idx < queue.length && song.id == queue[idx]?.id) {
          this.state.queue = queue;
          this.state.queueIndex = idx;
          this.state.currentSong = song;
          const savedTime = parseFloat(localStorage.getItem(K.CURRENT_TIME) ?? '0');
          const wasPlaying = localStorage.getItem(K.IS_PLAYING) === 'true';
          this.audioPlayer.restorePlaybackState(song, queue, savedTime, wasPlaying);
        }
      }
      const recent = localStorage.getItem(K.RECENTLY_PLAYED);
      if (recent) {
        try {
          this.state.recentlyPlayed = JSON.parse(recent) as Song[];
        } catch {
          /* ignore */
        }
      }
      if (window.uiManager) {
        if (this.state.isDrawerOpen) window.uiManager.updateFullPlayer();
        window.uiManager.updateMiniPlayer();
      }
    } catch (e) {
      console.warn('[Persistence] Restore error:', e);
    }
  }

  private bind(): void {
    const audio = this.audioPlayer.audio;
    audio.addEventListener('play', () => this.save());
    audio.addEventListener('pause', () => this.save());
    audio.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - this.lastSavedTime > 2000) {
        this.lastSavedTime = now;
        this.saveTime();
      }
    });
    window.addEventListener('beforeunload', () => this.save(true));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.save(true);
    });
    this.wrap('playSong', () => this.save());
    this.wrap('skipForward', () => this.save());
    this.wrap('skipBack', () => this.save());
    this.wrap('setVolume', () => this.saveVolume());
    this.wrap('toggleMute', () => this.saveVolume());
    this.wrap('cycleRepeat', () => this.saveMode());
    this.wrap('toggleShuffle', () => this.saveMode());
  }

  private wrap(methodName: keyof AudioEngine, afterHook: () => void): void {
    const original = this.audioPlayer[methodName] as unknown;
    if (typeof original !== 'function') return;
    const originalFn = original as (...args: unknown[]) => unknown;
    (this.audioPlayer as unknown as Record<string, unknown>)[methodName] = function (
      this: AudioEngine,
      ...args: unknown[]
    ) {
      const result = originalFn.apply(this, args);
      afterHook();
      return result;
    };
  }

  save(immediate = false): void {
    if (!this.state.currentSong) return;
    const K = PersistenceManager.STORAGE_KEYS;
    const doSave = () => {
      try {
        localStorage.setItem(K.LAST_SONG, JSON.stringify(this.state.currentSong));
        localStorage.setItem(K.QUEUE, JSON.stringify(this.state.queue));
        localStorage.setItem(K.QUEUE_INDEX, this.state.queueIndex.toString());
        localStorage.setItem(K.IS_PLAYING, this.state.isPlaying.toString());
        localStorage.setItem(K.RECENTLY_PLAYED, JSON.stringify(this.state.recentlyPlayed));
        this.saveTime();
        this.saveVolume();
        this.saveMode();
      } catch (e) {
        console.warn('[Persistence] Save failed:', e);
      }
    };
    if (immediate) doSave();
    else {
      if (this.saveThrottle) window.clearTimeout(this.saveThrottle);
      this.saveThrottle = window.setTimeout(doSave, 200);
    }
  }

  private saveTime(): void {
    if (this.audioPlayer.audio) {
      localStorage.setItem(
        PersistenceManager.STORAGE_KEYS.CURRENT_TIME,
        this.audioPlayer.audio.currentTime.toString(),
      );
    }
  }

  private saveVolume(): void {
    const K = PersistenceManager.STORAGE_KEYS;
    localStorage.setItem(K.VOLUME, this.state.volume.toString());
    localStorage.setItem(K.MUTED, this.state.isMuted.toString());
    localStorage.setItem(K.PLAYBACK_RATE, this.state.playbackRate.toString());
  }

  private saveMode(): void {
    const K = PersistenceManager.STORAGE_KEYS;
    localStorage.setItem(K.REPEAT_MODE, this.state.repeatMode);
    localStorage.setItem(K.SHUFFLED, this.state.isShuffled.toString());
  }
}

/* ============================================================
   NProgress
   ============================================================ */

interface NProgressSettings {
  minimum: number;
  easing: string;
  positionUsing: string;
  speed: number;
  trickle: boolean;
  trickleRate: number;
  trickleSpeed: number;
  showSpinner: boolean;
  barSelector: string;
  spinnerSelector: string;
  parent: string;
  template: string;
}

export class NProgress {
  private static settings: NProgressSettings = {
    minimum: 0.08,
    easing: 'ease',
    positionUsing: '',
    speed: 200,
    trickle: true,
    trickleRate: 0.02,
    trickleSpeed: 800,
    showSpinner: true,
    barSelector: '[role="bar"]',
    spinnerSelector: '[role="spinner"]',
    parent: 'body',
    template:
      '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>',
  };

  static status: number | null = null;
  private static pending: Array<(next: () => void) => void> = [];
  private static initial = 0;
  private static current = 0;

  static configure(options: Partial<NProgressSettings>): typeof NProgress {
    for (const key of Object.keys(options) as Array<keyof NProgressSettings>) {
      const val = options[key];
      if (val !== undefined && Object.prototype.hasOwnProperty.call(this.settings, key)) {
        (this.settings as Record<string, unknown>)[key] = val;
      }
    }
    return this;
  }

  static set(n: number): typeof NProgress {
    const started = this.isStarted();
    n = this.clamp(n, this.settings.minimum, 1);
    this.status = n === 1 ? null : n;
    const progress = this.render(!started);
    const bar = progress.querySelector<HTMLElement>(this.settings.barSelector);
    const speed = this.settings.speed;
    const ease = this.settings.easing;
    if (!bar) return this;
    progress.offsetWidth;
    this.queue(
      function (this: typeof NProgress, next: () => void) {
        if (this.settings.positionUsing === '')
          this.settings.positionUsing = this.getPositioningCSS();
        this.css(bar, this.barPositionCSS(n, speed, ease));
        if (n === 1) {
          this.css(progress, { transition: 'none', opacity: '1' });
          progress.offsetWidth;
          setTimeout(() => {
            this.css(progress, { transition: 'all ' + speed + 'ms linear', opacity: '0' });
            setTimeout(() => {
              this.remove();
              next();
            }, speed);
          }, speed);
        } else {
          setTimeout(next, speed);
        }
      }.bind(this),
    );
    return this;
  }

  static isStarted(): boolean {
    return typeof this.status === 'number';
  }

  static start(): typeof NProgress {
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

  static done(force?: boolean): typeof NProgress {
    if (!force && !this.status) return this;
    return this.inc(0.3 + 0.5 * Math.random()).set(1);
  }

  static inc(amount?: number): typeof NProgress {
    let n = this.status;
    if (!n) return this.start();
    if (typeof amount !== 'number') amount = (1 - n) * this.clamp(Math.random() * n, 0.1, 0.95);
    n = this.clamp(n + amount, 0, 0.994);
    return this.set(n);
  }

  static trickle(): typeof NProgress {
    return this.inc(Math.random() * this.settings.trickleRate);
  }

  private static render(fromStart: boolean): HTMLElement {
    if (this.isRendered()) return document.getElementById('nprogress')!;
    this.addClass(document.documentElement, 'nprogress-busy');
    const progress = document.createElement('div');
    progress.id = 'nprogress';
    progress.innerHTML = this.settings.template;
    const bar = progress.querySelector<HTMLElement>(this.settings.barSelector);
    const perc = fromStart ? '-100' : this.toBarPerc(this.status ?? 0);
    const parent = document.querySelector<HTMLElement>(this.settings.parent);
    if (bar) {
      this.css(bar, { transition: 'all 0 linear', transform: `translate3d(${perc}%,0,0)` });
    }
    if (!this.settings.showSpinner) {
      const spinner = progress.querySelector(this.settings.spinnerSelector);
      if (spinner) this.removeElement(spinner);
    }
    if (parent && parent !== document.body) this.addClass(parent, 'nprogress-custom-parent');
    (parent ?? document.body).appendChild(progress);
    return progress;
  }

  static remove(): void {
    this.removeClass(document.documentElement, 'nprogress-busy');
    const parent = document.querySelector(this.settings.parent);
    if (parent) this.removeClass(parent, 'nprogress-custom-parent');
    const progress = document.getElementById('nprogress');
    if (progress) this.removeElement(progress);
  }

  static isRendered(): boolean {
    return !!document.getElementById('nprogress');
  }

  static getPositioningCSS(): string {
    const bodyStyle = document.body.style as unknown as Record<string, unknown>;
    const vendorPrefix =
      'WebkitTransform' in bodyStyle
        ? 'Webkit'
        : 'MozTransform' in bodyStyle
          ? 'Moz'
          : 'msTransform' in bodyStyle
            ? 'ms'
            : 'OTransform' in bodyStyle
              ? 'O'
              : '';
    if (vendorPrefix + 'Perspective' in bodyStyle) return 'translate3d';
    else if (vendorPrefix + 'Transform' in bodyStyle) return 'translate';
    else return 'margin';
  }

  static clamp(n: number, min: number, max: number): number {
    return n < min ? min : n > max ? max : n;
  }

  static toBarPerc(n: number): number {
    return (-1 + n) * 100;
  }

  static barPositionCSS(
    n: number,
    speed: number,
    ease: string,
  ): Record<string, string> {
    let barCSS: Record<string, string>;
    if (this.settings.positionUsing === 'translate3d')
      barCSS = { transform: `translate3d(${this.toBarPerc(n)}%,0,0)` };
    else if (this.settings.positionUsing === 'translate')
      barCSS = { transform: `translate(${this.toBarPerc(n)}%,0)` };
    else barCSS = { 'margin-left': `${this.toBarPerc(n)}%` };
    barCSS.transition = `all ${speed}ms ${ease}`;
    return barCSS;
  }

  static queue(fn: (next: () => void) => void): void {
    const next = () => {
      const current = this.pending.shift();
      if (current) current(next);
    };
    this.pending.push(fn);
    if (this.pending.length === 1) next();
  }

  static css(element: HTMLElement, properties: Record<string, string>): void;
  static css(element: HTMLElement, prop: string, value: string): void;
  static css(
    element: HTMLElement,
    properties: Record<string, string> | string,
    value?: string,
  ): void {
    const cssPrefixes = ['Webkit', 'O', 'Moz', 'ms'];
    const cssProps: Record<string, string> = {};
    const camelCase = (string: string) =>
      string.replace(/^-ms-/, 'ms-').replace(/-([\da-z])/gi, (_m, letter: string) => letter.toUpperCase());
    const getVendorProp = (name: string) => {
      const style = document.body.style as unknown as Record<string, unknown>;
      if (name in style) return name;
      let i = cssPrefixes.length;
      const capName = name.charAt(0).toUpperCase() + name.slice(1);
      let vendorName: string;
      while (i--) {
        vendorName = (cssPrefixes[i] ?? '') + capName;
        if (vendorName in style) return vendorName;
      }
      return name;
    };
    const getStyleProp = (name: string) => {
      name = camelCase(name);
      return cssProps[name] ?? (cssProps[name] = getVendorProp(name));
    };
    const applyCss = (el: HTMLElement, prop: string, val: string) => {
      prop = getStyleProp(prop);
      (el.style as unknown as Record<string, string>)[prop] = val;
    };
    if (typeof properties === 'object') {
      for (const prop in properties) {
        if (Object.prototype.hasOwnProperty.call(properties, prop)) {
          applyCss(element, prop, properties[prop]!);
        }
      }
    } else if (value !== undefined) {
      applyCss(element, properties, value);
    }
  }

  static hasClass(element: Element, name: string): boolean {
    const list = this.classList(element);
    return list.indexOf(' ' + name + ' ') >= 0;
  }

  static addClass(element: Element, name: string): void {
    const oldList = this.classList(element);
    const newList = oldList + name;
    if (this.hasClass(element, name)) return;
    element.className = newList.substring(1);
  }

  static removeClass(element: Element, name: string): void {
    const oldList = this.classList(element);
    const newList = oldList.replace(' ' + name + ' ', ' ');
    element.className = newList.substring(1, newList.length - 1);
  }

  static classList(element: Element): string {
    return (' ' + (element.className || '') + ' ').replace(/\s+/gi, ' ');
  }

  static removeElement(element: Element): void {
    element.parentNode?.removeChild(element);
  }
}

if (typeof window !== 'undefined' && !window.NProgress) {
  window.NProgress = NProgress;
}

/* ============================================================
   Icons — typed shape
   ============================================================ */

type IconFn = (size?: number) => string;

export const Icons: {
  general: Record<string, IconFn> & {
    close: IconFn;
    heart: (size?: number, filled?: boolean) => string;
    playlistAdd: IconFn;
    link: IconFn;
    checkBadge: IconFn;
    user: IconFn;
    album: IconFn;
    search: IconFn;
    moreVert: IconFn;
    moreHoriz: IconFn;
    arrowRight: IconFn;
    plus: IconFn;
    playlist: IconFn;
    dragHandle: IconFn;
    eye: IconFn;
    sparkles: IconFn;
    grid: IconFn;
    list: IconFn;
    chevronDown: IconFn;
    artist: IconFn;
    musicNote: IconFn;
  };
  player: {
    play: IconFn;
    pause: IconFn;
    shuffle: IconFn;
  };
} = {
  general: {
    close: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    heart: (size = 16, filled = false) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    playlistAdd: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    link: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    checkBadge: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    user: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M5.3 18.3C6.8 16.5 9.2 15 12 15s5.2 1.5 6.7 3.3"/></svg>`,
    album: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/></svg>`,
    search: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    moreVert: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`,
    moreHoriz: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
    arrowRight: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    plus: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    playlist: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    dragHandle: (size = 14) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`,
    eye: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    sparkles: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.9 5.8L20 12l-6.1 3.2L12 21l-1.9-5.8L4 12l6.1-3.2L12 3z"/></svg>`,
    grid: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    list: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    chevronDown: () =>
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
    artist: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 0v8m0 0v4m0-4H4m8 0h8"/></svg>`,
    musicNote: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  },
  player: {
    play: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor"><path d="M6 3L16 10L6 17V3Z"/></svg>`,
    pause: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="3" width="4" height="14" rx="1"/><rect x="11" y="3" width="4" height="14" rx="1"/></svg>`,
    shuffle: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>`,
  },
};