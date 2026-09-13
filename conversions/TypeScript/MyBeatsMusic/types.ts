/* ============================================================
   types.ts — Shared type definitions for MyBeats
   ============================================================ */

export type RepeatMode = 'off' | 'all' | 'one';
export type PageType =
  | 'home'
  | 'library'
  | 'favorites'
  | 'playlists'
  | 'editPlaylist'
  | 'artist'
  | '404';

export type FavoritesTab = 'songs' | 'albums' | 'artists' | 'playlists';

export type LibraryView =
  | 'overview'
  | 'songs'
  | 'albums'
  | 'artists'
  | 'playlists'
  | 'genres';

export type LibrarySort =
  | 'recent'
  | 'title'
  | 'artist'
  | 'yearDesc'
  | 'yearAsc'
  | 'mostPlayed';

export type LibraryMode = 'grid' | 'list';
export type LibraryFilterType = 'all' | 'artist' | 'genre' | 'year' | 'decade';

export type PlaySource =
  | 'home'
  | 'library'
  | 'album'
  | 'playlist'
  | 'search'
  | 'artist'
  | 'queue'
  | 'favorites'
  | 'context';

export type ThemeKey =
  | 'dark'
  | 'onedark'
  | 'mocha'
  | 'tokoyonight'
  | 'moon'
  | 'light'
  | 'bloom';

export type HeartType = 'song' | 'artist' | 'album' | 'playlist';

/* ---------- Library entities ---------- */

export interface Song {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  duration?: string;
  downloadPath?: string;
  /** Enriched at load time by global.ts */
  artistId?: string;
  albumId?: string;
  genre?: string;
  year?: string;
  artistImageUrl?: string;
  _artistName?: string;
  _artistId?: string;
  _albumName?: string;
  _albumId?: string;
}

export interface Album {
  id: string;
  album: string;
  coverUrl?: string;
  year?: string;
  certification?: string;
  status?: string;
  songs: Song[];
}

export interface Artist {
  id: string;
  artist: string;
  imageUrl?: string;
  genre?: string;
  albums: Album[];
  similar?: string[];
  monthlyListeners?: string;
  topSong?: { plays?: string };
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  tags: string[];
  songs: string[];
}

/* ---------- Enriched derivatives ---------- */

export interface EnrichedAlbum extends Album {
  artistId: string;
  artistName: string;
  songCount: number;
  totalSeconds: number;
  plays: number;
}

export interface EnrichedArtistLite {
  id: string;
  name: string;
  imageUrl?: string;
  genre: string;
  albumCount: number;
  songCount: number;
  plays: number;
}

export interface EnrichedSong extends Song {
  artistId: string;
  albumId: string;
  artist: string;
  album: string;
  coverUrl: string;
  genre: string;
  artistImageUrl?: string;
  year?: string;
}

export interface GenreEntry {
  name: string;
  count: number;
  coverUrl?: string;
}

export interface LibraryFilter {
  type: LibraryFilterType;
  value: string | number | null;
  label: string;
}

/* ---------- Preferences / theming ---------- */

export interface ThemePreview {
  bg: string;
  card: string;
  text: string;
  accent: string;
}

export interface ThemeConfig {
  label: string;
  dark: boolean;
  preview: ThemePreview;
}

export interface PrefsData {
  theme?: ThemeKey;
  accent?: string;
  lastDarkTheme?: ThemeKey;
  lastLightTheme?: ThemeKey;
  fadeTransitions?: boolean;
  radioAutoplay?: boolean;
  [key: string]: unknown;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
}

/* ---------- Popups ---------- */

export interface DropdownItem {
  action: string;
  label?: string;
  iconHTML?: string;
  style?: string;
  data?: Record<string, unknown>;
  onClick?: (action: string, item: DropdownItem) => void;
}

export interface DropdownOptions {
  triggerEvent?: MouseEvent;
  rect?: DOMRect;
  header?: { title?: string; subtitle?: string };
  groups: DropdownItem[][];
  itemExtraData?: string | ((data: DropdownItem['data']) => string);
  onAction?: (action: string, item: DropdownItem | null) => void;
}

export interface PopoverOptions {
  triggerEvent?: MouseEvent;
  x?: number;
  y?: number;
  content: string | HTMLElement;
  variant?: string;
  size?: 'sm' | 'md' | 'lg' | 'artist';
  persistentActions?: string[];
  onAction?: (action: string, dataset: DOMStringMap, popup: unknown) => void;
  onClose?: (popup: unknown) => void;
}

export interface ModalAction {
  label: string;
  action: string;
  type?: 'primary' | 'secondary' | 'danger';
}

export interface ModalOptions {
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  content?: string | HTMLElement;
  actions?: ModalAction[];
  closable?: boolean;
  autoClose?: boolean;
  onAction?: (action: string, popup: unknown) => void;
  onClose?: (popup: unknown) => void;
}

export interface ToastOptions {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message?: string;
  duration?: number;
  onUndo?: (popup: unknown) => void;
  onClose?: (popup: unknown) => void;
}

export interface DialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export interface NotificationEntry {
  id: number;
  type: string;
  title: string;
  message: string;
  timestamp: string;
}

/* ---------- Events ---------- */

export interface SongChangeEvent {
  song: Song;
  source: PlaySource | null;
}

export interface ThemeChangeDetail {
  theme?: string;
  dark?: boolean;
  primary?: string;
  secondary?: string;
  accent?: string;
}

export interface MyBeatsEvents {
  'mybeats:recently-played': CustomEvent<{ song: Song }>;
  'mybeats:playback-change': CustomEvent<void>;
  'mybeats:favorites-changed': CustomEvent<{ type: HeartType; id: string }>;
  'mybeats:play-counts': CustomEvent<void>;
  'mybeats:library-changed': CustomEvent<void>;
  'mybeats:playlists-changed': CustomEvent<void>;
  themechange: CustomEvent<ThemeChangeDetail>;
  'sw:ready': CustomEvent<void>;
  'sw:controller-change': CustomEvent<void>;
}

/* ---------- Persistence ---------- */

export interface PersistenceSnapshot {
  lastSong: Song | null;
  queue: Song[];
  queueIndex: number;
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  repeatMode: RepeatMode;
  shuffled: boolean;
  recentlyPlayed: Song[];
}

/* ---------- Service worker message ---------- */

export interface SWCacheStatusMessage {
  type: 'CACHE_STATUS_RESULT';
  songs?: { urls?: string[] };
}

export interface SWSongCachedMessage {
  type: 'SONG_CACHED';
  url: string;
}

export type SWMessage = SWCacheStatusMessage | SWSongCachedMessage;