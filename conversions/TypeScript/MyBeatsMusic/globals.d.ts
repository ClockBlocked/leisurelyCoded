/* ============================================================
   globals.d.ts — Window augmentation for MyBeats globals
   ============================================================ */

import type { Prefs } from './core';
import type { ColorExtractor } from './core';
import type { PlayerState, AudioEngine, MediaSessionManager } from './player';
import type { PopupsManager, FavoritesPlaylistsManager, HeartButtonManager } from './interactions';
import type { UIManager, ContextMenu, OfflineCache } from './builder';
import type { PersistenceManager } from './core';
import type { Artist, Playlist, Song } from './types';

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
    NProgress: typeof import('./core').NProgress;
    Utils: typeof import('./core').Utils;
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
      playQueue: (queue: Song[], index?: number, label?: string, source?: string | null) => void;
      playSong: (songId: string, source?: string | null) => void;
      shuffleAll: () => void;
      playGenre: (genre: string) => void;
      playMood: (mood: string) => void;
      openStatsDashboard: () => void;
      goHome: () => void;
      playAlbum: (artistId: string, albumId: string) => void;
      shuffleAlbum: (artistId: string, albumId: string) => void;
    };
    libraryPage?: { playArtist: (id: string) => void };
    playlistsPage?: { viewPlaylist: (name: string | null) => void; showMenu?: (e: MouseEvent, id: string) => void };
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