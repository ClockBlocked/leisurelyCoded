




import type { Prefs, ColorExtractor, PersistenceManager, NProgress, Utils } from 'https://mybeats.cloud/core/base.ts';
import type { PlayerState, AudioEngine, MediaSessionManager } from 'https://mybeats.cloud/core/player.ts';
import type { PopupsManager, FavoritesPlaylistsManager, HeartButtonManager } from 'https://mybeats.cloud/core/interactions.ts';
import type { UIManager, ContextMenu, OfflineCache } from '.https://mybeats.cloud/core/builder.ts';
import type { Artist, Song, PlaySource } from 'https://mybeats.cloud/core/types.ts';

declare global {
  interface Window {
    Prefs: typeof Prefs;
    colorExtractor: ColorExtractor;
    state: PlayerState;
    audioPlayer: AudioEngine;
    popups: PopupsManager;
    favoritesPlaylists: FavoritesPlaylistsManager;
    heartManager: HeartButtonManager;
    contextMenu: ContextMenu;
    offlineCache: OfflineCache;
    persistence: PersistenceManager;
    mediaSessionManager: MediaSessionManager;
    uiManager: UIManager;
    metadata: Artist[];
    NProgress: typeof NProgress;
    Utils: typeof Utils;
    closeModal: () => void;
    createNewPlaylist: () => void;
    renamePlaylist: (id: string, name?: string) => void;
    deletePlaylist: (id: string) => void;
    addSongToPlaylist: (plId: string, songId: string) => void;
    toggleFavAndReRender: (id: string) => void;
    openMoreMenu: (event: MouseEvent, type: string, id: string) => void;
    saveToLibraryDrawer: {
      refreshSavedBadges: () => void;
      badgeRows: () => void;
    };
    saveDrawer: Window['saveToLibraryDrawer'];
    pagesActions: {
      buildSongs: () => Song[];
      playQueue: (queue: Song[], index?: number, label?: string, source?: PlaySource | null) => void;
      playSong: (songId: string, source?: PlaySource | null) => void;
      shuffleAll: () => void;
      playGenre: (genre: string) => void;
      playMood: (mood: string) => void;
      openStatsDashboard: () => void;
      goHome: () => void;
      playAlbum: (artistId: string, albumId: string) => void;
      shuffleAlbum: (artistId: string, albumId: string) => void;
      openGenre: (genre: string) => void;
    };
    libraryPage?: {
      playArtist: (id: string) => void;
      view: string;
      filter: unknown;
    };
    playlistsPage?: {
      viewPlaylist: (name: string | null) => void;
      showMenu?: (e: MouseEvent, id: string) => void;
    };
    showToast?: (message: string, type?: string, duration?: number) => void;
  }

  interface WindowEventMap {
    'sw:ready': CustomEvent<void>;
    'sw:controller-change': CustomEvent<void>;
    'mybeats:recently-played': CustomEvent<{ song: Song }>;
    'mybeats:playback-change': CustomEvent<void>;
    'mybeats:favorites-changed': CustomEvent<{ type: string; id: string }>;
    'mybeats:play-counts': CustomEvent<void>;
    'mybeats:library-changed': CustomEvent<void>;
    'mybeats:playlists-changed': CustomEvent<void>;
    themechange: CustomEvent<{ theme?: string; dark?: boolean; accent?: string }>;
  }
}

export {};
