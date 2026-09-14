




/* ============================================================
   builder.ts — Router, listeners, content events, offline cache,
                 search, UI manager, context menu
   ============================================================ */

import { Config, Utils, Prefs, IdUtils, Spinner, Icons } from './core';
import { PopupsManager } from './interactions';
import { PlayerManager } from './player';
import {
  Home, Library, Favorites, Playlists, Artists, EditPlaylist, Error404,
} from './layouts';
import type { PlayerState, AudioEngine } from './player';
import type { FavoritesPlaylistsManager } from './interactions';
import type {
  PageType, PlaySource, LibraryView, LibrarySort, LibraryMode,
  LibraryFilter, LibraryFilterType, FavoritesTab, Song, Artist,
  Playlist, EnrichedAlbum, EnrichedArtistLite, GenreEntry, HeartType,
  SWMessage,
} from './types';

/* ============================================================
   AppRouter
   ============================================================ */

export class AppRouter {
  ui: UIManager;
  constructor(ui: UIManager) {
    this.ui = ui;
  }

  private get state(): PlayerState { return this.ui.state; }
  private get audioPlayer(): AudioEngine { return this.ui.audioPlayer; }
  private get favorites(): FavoritesPlaylistsManager { return this.ui.favorites; }

  buildHomeURL(): string { return '/home/'; }

  buildLibraryURL(): string {
    const lib = this.ui.libraryPage;
    if (!lib) return '/library/';
    const view = lib.view || 'overview';
    const sort = lib.sort || 'recent';
    const filter = lib.filter || { type: 'all', value: null, label: '' };
    if (sort === 'mostPlayed' && view === 'albums') return '/library/top/albums/';
    if (sort === 'mostPlayed' && view === 'artists') return '/library/top/artists/';
    if (sort === 'mostPlayed') return '/library/mostplayed/';
    if (view === 'artists' && filter.type === 'all' && filter.value === null) return '/library/artists/all/';
    if (view && view !== 'overview') return '/library/' + view + '/';
    return '/library/';
  }

  buildFavoritesURL(): string {
    const tab = this.state.favoritesTab || 'songs';
    return '/favorites/' + tab + '/';
  }

  buildPlaylistsURL(): string { return '/playlists/'; }

  buildPlaylistURL(): string {
    return this.state.selectedPlaylistId
      ? '/playlist/' + this.state.selectedPlaylistId + '/'
      : '/playlists/';
  }

  buildEditPlaylistURL(): string {
    return this.state.editingPlaylistId
      ? '/playlist/' + this.state.editingPlaylistId + '/edit/'
      : '/playlists/';
  }

  buildArtistURL(artistId: string | null, albumId: string | null): string {
    if (!artistId) return '/home/';
    if (albumId) return '/artist/' + artistId + '/album/' + albumId + '/';
    return '/artist/' + artistId + '/';
  }

  buildURL(page: PageType, artistId: string | null = null, albumId: string | null = null): string {
    switch (page) {
      case 'home': return this.buildHomeURL();
      case 'library': return this.buildLibraryURL();
      case 'favorites': return this.buildFavoritesURL();
      case 'playlists': return this.buildPlaylistURL();
      case 'editPlaylist': return this.buildEditPlaylistURL();
      case 'artist': return this.buildArtistURL(artistId, albumId);
      default: return '/home/';
    }
  }

  private normalizePath(p: string): string {
    if (!p) return '/';
    const stripped = p.replace(/\/+$/, '');
    return stripped === '' ? '/' : stripped;
  }

  private setURL(page: PageType, artistId: string | null, albumId: string | null): void {
    const url = this.buildURL(page, artistId, albumId);
    const current = this.normalizePath(window.location.pathname);
    const target = this.normalizePath(url);
    const currentSearch = window.location.search || '';
    if (current === target && !currentSearch) return;
    history.pushState({ page, artistId, albumId }, '', url);
  }

  goTo(page: PageType, artistId: string | null = null, albumId: string | null = null): void {
    if (this.state.isDrawerOpen) this.ui.closePlayerDrawer();
    let artist: Artist | null = null;
    if (artistId) {
      artist = this.state.getArtistById(artistId);
      if (!artist) {
        const found = this.state.enrichedLibrary.find((a) => a.artist === artistId);
        if (found) {
          artist = found;
          artistId = found.id;
        }
      }
    }
    const tab = this.state.favoritesTab || 'songs';
    const album = albumId ? this.state.getAlbumById(albumId) : null;

    const titleMap: Record<string, string> = {
      home: 'MyBeats — Home',
      library: 'MyBeats — Library',
      favorites: `MyBeats — Favorites / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`,
      playlists: this.state.selectedPlaylistName
        ? `MyBeats — Playlist: ${this.state.selectedPlaylistName}`
        : 'MyBeats — Playlists',
      editPlaylist: this.state.selectedPlaylistName
        ? `MyBeats — Edit: ${this.state.selectedPlaylistName}`
        : 'MyBeats — Playlists',
      artist: artist
        ? album
          ? `MyBeats — ${artist.artist} / ${album.album}`
          : `MyBeats — ${artist.artist}`
        : 'MyBeats',
    };

    this.state.currentPage = page;
    this.state.artistId = artistId || null;
    this.state.artistPageName = artist?.artist || null;
    this.state.selectedAlbumId = albumId || null;
    this.state.selectedAlbumName = album?.album || null;
    this.state.isSearchOpen = false;
    this.state.selectedPlaylistName = null;
    this.state.isCreatingPlaylist = false;
    document.title = titleMap[page] ?? 'MyBeats';
    this.setURL(page, artistId, albumId);
    this.updateActiveNav();
    this.updateBreadcrumbs();
    this.ui.render();
  }

  private parseLibraryRoute(parts: string[]): void {
    const lib = this.ui.libraryPage;
    if (!lib) return;
    lib.view = 'overview';
    lib.filter = { type: 'all', value: null, label: '' };
    lib.sort = 'recent';
    lib.mode = 'grid';
    lib.query = '';
    if (!parts.length) return;
    const a = parts[0];
    const b = parts[1];
    const views: LibraryView[] = ['overview', 'songs', 'albums', 'artists', 'playlists', 'genres'];
    if (a === 'top' && b && views.includes(b as LibraryView)) {
      lib.view = b as LibraryView;
      lib.sort = 'mostPlayed';
      return;
    }
    if (a === 'mostplayed') {
      lib.view = 'songs';
      lib.sort = 'mostPlayed';
      return;
    }
    if (a === 'artists' && b === 'all') {
      lib.view = 'artists';
      lib.filter = { type: 'all', value: null, label: '' };
      return;
    }
    if (a === 'artists' && b) {
      lib.view = 'artists';
      lib.filter = { type: 'artist', value: b, label: b };
      return;
    }
    if (a === 'genres' && b) {
      lib.view = 'genres';
      lib.filter = { type: 'genre', value: b, label: b };
      return;
    }
    if (a === 'year' && b) {
      lib.view = 'albums';
      lib.filter = { type: 'year', value: b, label: b };
      return;
    }
    if (a === 'decade' && b) {
      lib.view = 'albums';
      lib.filter = { type: 'decade', value: b, label: b + 's' };
      return;
    }
    if (views.includes(a as LibraryView)) {
      lib.view = a as LibraryView;
    }
  }

  private parseDiscoverRoute(parts: string[]): void {
    const lib = this.ui.libraryPage;
    if (!lib) return;
    lib.view = 'overview';
    lib.filter = { type: 'all', value: null, label: '' };
    lib.sort = 'recent';
    lib.mode = 'grid';
    lib.query = '';
    if (!parts.length) return;
    const a = parts[0];
    if (a === 'artists') lib.view = 'artists';
    else if (a === 'albums') lib.view = 'albums';
    else if (a === 'songs') lib.view = 'songs';
    else if (a === 'genres') lib.view = 'genres';
  }

  syncWithURL(): void {
    const parts = window.location.pathname.split('/').filter((p) => p);
    const searchParams = new URLSearchParams(window.location.search);
    const deepLinkSong = searchParams.get('song');
    this.state.pendingDeepLinkSong = null;
    this.state.editingPlaylistId = null;

    if (!parts.length || parts[0] === 'home') {
      Object.assign(this.state, {
        currentPage: 'home',
        artistId: null,
        artistPageName: null,
        selectedAlbumId: null,
        selectedAlbumName: null,
        selectedPlaylistName: null,
        selectedPlaylistId: null,
        isCreatingPlaylist: false,
      });
    } else {
      const page = parts[0]!;
      if (page === 'library') {
        Object.assign(this.state, {
          currentPage: 'library',
          artistId: null,
          artistPageName: null,
          selectedAlbumId: null,
          selectedAlbumName: null,
          selectedPlaylistName: null,
          selectedPlaylistId: null,
          isCreatingPlaylist: false,
        });
        this.parseLibraryRoute(parts.slice(1));
      } else if (page === 'discover') {
        Object.assign(this.state, {
          currentPage: 'library',
          artistId: null,
          artistPageName: null,
          selectedAlbumId: null,
          selectedAlbumName: null,
          selectedPlaylistName: null,
          selectedPlaylistId: null,
          isCreatingPlaylist: false,
        });
        this.parseDiscoverRoute(parts.slice(1));
      } else if (page === 'favorites') {
        this.state.currentPage = 'favorites';
        this.state.favoritesTab = (parts[1] as FavoritesTab) || 'songs';
        this.state.artistId = null;
        this.state.artistPageName = null;
        this.state.selectedAlbumId = null;
        this.state.selectedAlbumName = null;
        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
      } else if (page === 'playlist' && parts[1]) {
        const playlistId = parts[1]!;
        const normalizedId = IdUtils.norm(playlistId);
        const playlist = this.state.playlists.find((p) => IdUtils.norm(p.id) === normalizedId);
        if (parts[2] === 'edit' && playlist) {
          this.state.currentPage = 'editPlaylist';
          this.state.editingPlaylistId = playlistId;
          this.state.selectedPlaylistName = playlist.name;
          this.state.selectedPlaylistId = playlistId;
        } else if (parts[2] === 'edit') {
          this.state.currentPage = '404';
        } else {
          this.state.currentPage = 'playlists';
          this.state.selectedPlaylistName = playlist?.name || null;
          this.state.selectedPlaylistId = playlist ? playlistId : null;
        }
        this.state.artistId = null;
        this.state.artistPageName = null;
        this.state.selectedAlbumId = null;
        this.state.selectedAlbumName = null;
        this.state.isCreatingPlaylist = false;
      } else if (page === 'playlists') {
        this.state.currentPage = 'playlists';
        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
        this.state.artistId = null;
        this.state.artistPageName = null;
        this.state.selectedAlbumId = null;
        this.state.selectedAlbumName = null;
      } else if (page === 'artist' && parts[1]) {
        const artistId = parts[1]!;
        const artist = this.state.getArtistById(artistId);
        if (artist) {
          this.state.currentPage = 'artist';
          this.state.artistId = artistId;
          this.state.artistPageName = artist.artist;
          if (parts[2] === 'album' && parts[3]) {
            const albumId = parts[3]!;
            const album = artist.albums.find((a) => IdUtils.norm(a.id) === IdUtils.norm(albumId));
            this.state.selectedAlbumId = album ? albumId : null;
            this.state.selectedAlbumName = album?.album || null;
          } else {
            this.state.selectedAlbumId = null;
            this.state.selectedAlbumName = null;
          }
          if (deepLinkSong) this.state.pendingDeepLinkSong = deepLinkSong;
        } else {
          this.state.currentPage = '404';
        }
        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
      } else {
        this.state.currentPage = '404';
        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
      }
    }
    this.updateActiveNav();
    this.updateBreadcrumbs();
    this.updateTitle();
    this.ui.render();
  }

  handlePopState(): void {
    this.syncWithURL();
  }

  updateActiveNav(): void {
    document.querySelectorAll<HTMLElement>('nav .link[data-nav]').forEach((link) => {
      link.classList.toggle('active', link.dataset.nav === this.state.currentPage);
    });
  }

  updateBreadcrumbs(): void {
    const container = document.getElementById('breadcrumb-items');
    if (!container) return;
    const crumbs = this.getBreadcrumbs();
    const existingItems = container.querySelectorAll('.item, .sep');
    if (existingItems.length > 0) {
      existingItems.forEach((el) => el.classList.add('removing'));
      setTimeout(() => this.renderNewCrumbs(container, crumbs), 350);
    } else {
      this.renderNewCrumbs(container, crumbs);
    }
  }

  private renderNewCrumbs(container: HTMLElement, crumbs: string[]): void {
    if (!crumbs.length) {
      container.innerHTML = '<span class="item active">Home</span>';
      return;
    }
    container.innerHTML = crumbs
      .map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return `
          <span class="item ${isLast ? 'active' : ''}" style="--i: ${i};">
            ${crumb}
          </span>
          ${!isLast ? `<span class="sep" style="--i: ${i};">›</span>` : ''}
        `;
      })
      .join('');
  }

  getBreadcrumbs(): string[] {
    const crumbs: string[] = [];
    const page = this.state.currentPage;
    const lib = this.ui.libraryPage;
    if (page === 'home') {
      crumbs.push('Home');
    } else if (page === 'library') {
      crumbs.push('Library');
      if (lib) {
        const view = lib.view || 'overview';
        const sort = lib.sort || 'recent';
        const filter = lib.filter || { type: 'all', value: null, label: '' };
        if (sort === 'mostPlayed' && view === 'albums') crumbs.push('Top', 'Albums');
        else if (sort === 'mostPlayed' && view === 'artists') crumbs.push('Top', 'Artists');
        else if (sort === 'mostPlayed') crumbs.push('Most Played');
        else if (view && view !== 'overview') {
          const label = view.charAt(0).toUpperCase() + view.slice(1);
          crumbs.push(label);
          if (view === 'artists' && filter.type === 'all' && filter.value === null) crumbs.push('All');
          else if (filter.type !== 'all' && filter.label) crumbs.push(filter.label);
        }
      }
    } else if (page === 'favorites') {
      const tab = this.state.favoritesTab || 'songs';
      crumbs.push('Library', 'Favorites', tab.charAt(0).toUpperCase() + tab.slice(1));
    } else if (page === 'playlists') {
      crumbs.push('Library', 'Playlists');
      if (this.state.selectedPlaylistName) crumbs.push(this.state.selectedPlaylistName);
      if (this.state.isCreatingPlaylist) crumbs.push('Create');
    } else if (page === 'editPlaylist') {
      crumbs.push('Library', 'Playlists');
      if (this.state.selectedPlaylistName) crumbs.push(this.state.selectedPlaylistName);
      crumbs.push('Edit');
    } else if (page === 'artist') {
      crumbs.push('Artists');
      if (this.state.artistPageName) crumbs.push(this.state.artistPageName);
      if (this.state.selectedAlbumName) crumbs.push(this.state.selectedAlbumName);
    }
    return crumbs;
  }

  toggleBreadcrumb(): void {
    const breadcrumbNav = document.querySelector<HTMLElement>('[data-navbar="breadcrumbs"]');
    if (!breadcrumbNav) return;
    this.ui.isBreadcrumbHidden = !this.ui.isBreadcrumbHidden;
    breadcrumbNav.classList.toggle('hide', this.ui.isBreadcrumbHidden);
  }

  updateTitle(): void {
    const page = this.state.currentPage;
    const tab = this.state.favoritesTab || 'songs';
    const artist = this.state.artistId ? this.state.getArtistById(this.state.artistId) : null;
    const album = this.state.selectedAlbumId ? this.state.getAlbumById(this.state.selectedAlbumId) : null;
    const titles: Record<string, string> = {
      home: 'MyBeats — Home',
      library: 'MyBeats — Library',
      favorites: `MyBeats — Favorites / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`,
      playlists: this.state.selectedPlaylistName
        ? `MyBeats — Playlist: ${this.state.selectedPlaylistName}`
        : 'MyBeats — Playlists',
      editPlaylist: this.state.selectedPlaylistName
        ? `MyBeats — Edit: ${this.state.selectedPlaylistName}`
        : 'MyBeats — Playlists',
      artist: artist
        ? album
          ? `MyBeats — ${artist.artist} / ${album.album}`
          : `MyBeats — ${artist.artist}`
        : 'MyBeats',
    };
    document.title = titles[page] ?? 'MyBeats';
  }
}

/* ============================================================
   AppListeners
   ============================================================ */

interface ListenerBinding {
  el?: EventTarget | null;
  type?: string;
  handler?: EventListener;
  setup?: (bindList: ListenerBinding[]) => void;
  immediate?: () => void;
}

export class AppListeners {
  static global(ui: UIManager): ListenerBinding[] {
    return [
      {
        el: document.getElementById('modal-overlay'),
        type: 'click',
        handler: () => ui.state.modalClose(),
      },
      {
        el: document,
        type: 'contextmenu',
        handler: (e) => {
          const evt = e as MouseEvent;
          evt.preventDefault();
          const target = (evt.target as HTMLElement).closest<HTMLElement>(
            '[data-artist-id], [data-album-id], [data-song-id], [data-playlist-id]',
          );
          if (!target) return;
          const artistId = target.dataset.artistId;
          const albumId = target.dataset.albumId;
          const songId = target.dataset.songId;
          const playlistId = target.dataset.playlistId;
          if (window.contextMenu) {
            window.contextMenu.show(evt.clientX, evt.clientY, {
              artistId, albumId, songId, playlistId,
            } as never);
          }
        },
      },
      {
        el: window,
        type: 'keydown',
        handler: (e) => {
          const evt = e as KeyboardEvent;
          const target = evt.target as HTMLElement | null;
          const tag = target?.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
          if (evt.key === '?' && !evt.ctrlKey && !evt.metaKey && !evt.altKey) {
            evt.preventDefault();
            ui.showShortcutsHelp();
            return;
          }
          if (evt.ctrlKey || evt.metaKey || evt.altKey) return;
          switch (evt.code) {
            case 'Space':
              evt.preventDefault();
              ui.audioPlayer.togglePlay();
              break;
            case 'ArrowLeft':
              evt.preventDefault();
              ui.audioPlayer.skipBack();
              break;
            case 'ArrowRight':
              evt.preventDefault();
              ui.audioPlayer.skipForward();
              break;
            case 'ArrowUp':
              evt.preventDefault();
              ui.audioPlayer.setVolume(ui.state.volume + 0.05);
              break;
            case 'ArrowDown':
              evt.preventDefault();
              ui.audioPlayer.setVolume(ui.state.volume - 0.05);
              break;
            case 'KeyM':
              ui.audioPlayer.toggleMute();
              break;
            case 'KeyL':
              if (ui.state.currentSong) void ui.toggleFavAndReRender(ui.state.currentSong.id);
              break;
            case 'KeyS':
              ui.audioPlayer.toggleShuffle();
              break;
            case 'KeyR':
              ui.audioPlayer.cycleRepeat();
              break;
            case 'KeyQ':
              if (!ui.state.isDrawerOpen) {
                ui.openPlayerDrawer();
                ui.player.openQueue();
              } else {
                ui.player.toggleQueue();
              }
              break;
            case 'Escape':
              if (ui.state.isDrawerOpen) ui.closePlayerDrawer();
              if (document.querySelector('.modal.active')) ui.state.modalClose();
              break;
          }
        },
      },
    ];
  }

  static static(ui: UIManager): ListenerBinding[] {
    const navButtons = document.querySelectorAll<HTMLElement>('nav .link[data-nav]');
    return Array.from(navButtons).map((btn) => ({
      el: btn,
      type: 'click',
      handler: () => ui.navigate(btn.dataset.nav as PageType),
    }));
  }

  static init(ui: UIManager): ListenerBinding[] {
    return [
      {
        el: window,
        type: 'popstate',
        handler: () => ui.router.handlePopState(),
      },
      {
        el: document.getElementById('breadcrumb-toggle'),
        type: 'click',
        handler: () => ui.router.toggleBreadcrumb(),
      },
      {
        el: document.getElementById('open-search'),
        type: 'click',
        handler: () => ui.openSearch(),
      },
      {
        el: document.getElementById('close-search'),
        type: 'click',
        handler: () => ui.closeSearch(),
      },
      {
        el: document.getElementById('search-overlay'),
        type: 'click',
        handler: () => ui.closeSearch(),
      },
      {
        el: document.querySelector('[data-action="settings"]'),
        type: 'click',
        handler: () => ui.showSettingsModal(),
      },
      {
        el: document.querySelector('[data-dash="notifications"]'),
        type: 'click',
        handler: (e) => {
          const evt = e as Event;
          window.popups?.showNotificationPanel(evt.currentTarget as HTMLElement);
        },
      },
      {
        setup: (bind) => {
          const input = document.getElementById('search-input') as HTMLInputElement | null;
          if (input) {
            let timer: number | undefined;
            const handler = (e: Event) => {
              window.clearTimeout(timer);
              ui.state.searchQuery = (e.target as HTMLInputElement).value;
              timer = window.setTimeout(() => ui.search.updateDropdown(), 200);
            };
            input.addEventListener('input', handler);
            bind.push({ el: input, type: 'input', handler });
          }
        },
      },
      {
        setup: (bind) => {
          const handler = (e: Event) => {
            const evt = e as KeyboardEvent;
            if (evt.key === 'Escape' && ui.state.isSearchOpen) ui.closeSearch();
            if ((evt.metaKey || evt.ctrlKey) && evt.key === 'k') {
              evt.preventDefault();
              ui.openSearch();
            }
          };
          document.addEventListener('keydown', handler);
          bind.push({ el: document, type: 'keydown', handler });
        },
      },
      {
        immediate: () => {
          Prefs.applyTheme(Prefs.theme(), { persist: false });
        },
      },
    ];
  }

  static add(_ui: UIManager): ListenerBinding[] { return []; }
  static remove(_ui: UIManager): ListenerBinding[] { return []; }

  static bindAll(ui: UIManager): ListenerBinding[] {
    const bindList: ListenerBinding[] = [];
    const attach = (arr: ListenerBinding[]) => {
      arr.forEach((item) => {
        if (item.setup) item.setup(bindList);
        else if (item.immediate) item.immediate();
        else if (item.el && item.type && item.handler) {
          item.el.addEventListener(item.type, item.handler);
          bindList.push(item);
        }
      });
    };
    attach(AppListeners.global(ui));
    attach(AppListeners.static(ui));
    attach(AppListeners.init(ui));
    attach(AppListeners.add(ui));
    return bindList;
  }
}

/* ============================================================
   ContentEvents
   ============================================================ */

export class ContentEvents {
  ui: UIManager;
  popups: PopupsManager;

  constructor(ui: UIManager) {
    this.ui = ui;
    this.popups = window.popups || new PopupsManager({ ui: ui as never });
    this.popups.ui = ui as never;
  }

  esc(text = ''): string { return Utils.esc(text); }

  setupHeartButton(btn: HTMLElement | null, _type: string, _id: string): void {
    window.heartManager?.bindAll(btn?.parentElement || document);
  }

  attachHeartEvents(): void {
    window.heartManager?.bindAll(document);
  }

  private attachEditPlaylistEvents(): void {
    const state = this.ui.state;
    const id = state.editingPlaylistId;
    const pl = state.playlists.find((p) => String(p.id) === String(id));
    if (!pl) return;

    const nameInput = document.getElementById('edit-pl-name') as HTMLInputElement | null;
    const descInput = document.getElementById('edit-pl-desc') as HTMLTextAreaElement | null;
    const tagWrap = document.getElementById('edit-pl-tags');

    if (nameInput) {
      nameInput.addEventListener('change', () => {
        window.favoritesPlaylists.renamePlaylist(id!, nameInput.value);
      });
    }
    if (descInput) {
      descInput.addEventListener('change', () => {
        window.favoritesPlaylists.updateDesc(id!, descInput.value);
      });
    }
    if (tagWrap) {
      const input = tagWrap.querySelector<HTMLInputElement>('.edit-playlist-tag-input');
      input?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const raw = input.value.trim();
        if (!raw) return;
        const vals = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        const tags = pl.tags || [];
        vals.forEach((v) => {
          if (!tags.includes(v) && tags.length < 8) tags.push(v);
        });
        input.value = '';
        window.favoritesPlaylists.updateTags(id!, tags);
        this.ui.render();
      });
      tagWrap.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('.edit-playlist-tag-remove');
        if (!btn) return;
        const tag = btn.dataset.tag;
        const tags = (pl.tags || []).filter((t) => t !== tag);
        window.favoritesPlaylists.updateTags(id!, tags);
        this.ui.render();
      });
    }

    document.querySelectorAll<HTMLElement>('[data-page="edit-playlist"] [data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'back' || action === 'done') {
          this.ui.navigate('playlists');
        } else if (action === 'delete-playlist') {
          window.favoritesPlaylists['_confirmDelete'](id!);
        } else if (action === 'shuffle-play') {
          const queue = state.buildPlaylistQueue(id!);
          if (queue.length) {
            const shuffled = Utils.shuffle(queue);
            this.ui.audioPlayer.playSong(shuffled[0]!, shuffled, true, 'playlist');
          }
        } else if (action === 'add-songs') {
          this.ui.navigate('library');
        }
      });
    });

    const list = document.getElementById('edit-playlist-songs');
    if (list) {
      let dragIdx: number | null = null;
      list.querySelectorAll<HTMLElement>('.edit-playlist-song-row').forEach((row) => {
        row.addEventListener('dragstart', (e) => {
          dragIdx = parseInt(row.dataset.index || '0', 10);
          row.classList.add('dragging');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', String(dragIdx)); } catch { /* noop */ }
          }
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          list.querySelectorAll('.edit-playlist-song-row').forEach((r) => r.classList.remove('drop-target'));
          dragIdx = null;
        });
        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          list.querySelectorAll('.edit-playlist-song-row').forEach((r) => r.classList.remove('drop-target'));
          row.classList.add('drop-target');
        });
        row.addEventListener('drop', (e) => {
          e.preventDefault();
          const targetIdx = parseInt(row.dataset.index || '0', 10);
          if (dragIdx === null || isNaN(targetIdx) || dragIdx === targetIdx) return;
          const newOrder = [...pl.songs];
          const [moved] = newOrder.splice(dragIdx, 1);
          if (moved) newOrder.splice(targetIdx, 0, moved);
          window.favoritesPlaylists.reorderSongs(id!, newOrder);
          this.ui.render();
        });
      });
      list.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action="remove-song"]');
        if (!btn) return;
        const index = parseInt(btn.dataset.index || '0', 10);
        const sid = pl.songs[index];
        const song = sid ? state.getSongById(sid) : null;
        if (song) {
          window.favoritesPlaylists.removeSongFromPlaylist(id!, sid!);
        } else {
          const newOrder = [...pl.songs];
          newOrder.splice(index, 1);
          window.favoritesPlaylists.reorderSongs(id!, newOrder);
          this.ui.render();
        }
      });
    }
  }

  showArtistPopover(artistId: string, event: MouseEvent): void {
    this.popups.showArtistPopover(artistId, event);
  }

  showSongMenu(songId: string, event: MouseEvent): void {
    this.popups.showSongMenu(songId, event);
  }

  attachContentEvents(): void {
    window.heartManager?.prune();
    window.heartManager?.bindAll(document);

    const mainContent = document.getElementById('main-content');
    if (mainContent && !(mainContent as HTMLElement & { artistClicksBound?: boolean }).artistClicksBound) {
      (mainContent as HTMLElement & { artistClicksBound?: boolean }).artistClicksBound = true;
      mainContent.addEventListener('click', (e) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>('[data-artist-id]');
        if (!el) return;
        const artistId = el.dataset.artistId;
        if (!artistId) return;
        const albumId = el.dataset.albumId || null;
        e.stopPropagation();
        this.ui.navigate('artist', artistId, albumId);
      });
      mainContent.addEventListener('dblclick', (e) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>('.album-cover-wrap[data-artist-id][data-album-id]');
        if (!el) return;
        const artistId = el.dataset.artistId;
        const albumId = el.dataset.albumId;
        if (!artistId || !albumId) return;
        const queue = Utils.albumQueue(this.ui.state, artistId, albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0]!, queue, true, 'album');
      });
    }

    document.querySelectorAll<HTMLElement>('[data-action="add-album-to-playlist"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const albumId = el.dataset.albumId;
        if (!albumId) return;
        const album = this.ui.state.getAlbumById(albumId);
        if (!album?.songs?.length) return;
        const firstSong = this.ui.state.getSongById(album.songs[0]!.id) || album.songs[0]!;
        const queue = Utils.albumQueue(this.ui.state, album.artistId, albumId);
        if (queue.length) window.favoritesPlaylists?.addToPlaylistModal?.(firstSong);
      });
    });

    document.querySelectorAll<HTMLElement>('[data-action="add-album-to-queue"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const albumId = el.dataset.albumId;
        if (!albumId) return;
        const album = this.ui.state.getAlbumById(albumId);
        if (!album?.songs?.length) return;
        const queue = Utils.albumQueue(this.ui.state, album.artistId, albumId);
        const currentQueue = this.ui.state.queue || [];
        const startIndex = currentQueue.length;
        this.ui.state.queue = [...currentQueue, ...queue];
        if (this.ui.state.currentSong && startIndex === currentQueue.length) {
          this.ui.state.queueIndex = this.ui.state.queue.findIndex(
            (s) => s.id === this.ui.state.currentSong?.id,
          );
        }
        this.ui.state.showToast(
          `Added ${queue.length} song${queue.length === 1 ? '' : 's'} to queue`,
        );
      });
    });

    document.querySelectorAll<HTMLElement>('[data-song-id]').forEach((el) => {
      el.addEventListener('dblclick', (e) => {
        if ((e.target as HTMLElement).closest('.downloadBtn')) return;
        const songId = el.dataset.songId;
        if (!songId) return;
        const song = this.ui.state.getSongById(songId);
        if (!song) return;
        if (el.dataset.context) {
          const ctx = JSON.parse(el.dataset.context) as { artistId: string; albumId: string };
          const queue = Utils.albumQueue(this.ui.state, ctx.artistId, ctx.albumId);
          if (queue.length) {
            const start = queue.find((s) => IdUtils.norm(s.id) === IdUtils.norm(songId)) || queue[0]!;
            this.ui.audioPlayer.playSong(start, queue, true, 'album');
            return;
          }
        }
        if (el.dataset.playlistId) {
          const queue = this.ui.state.buildPlaylistQueue(el.dataset.playlistId);
          if (queue.length) {
            const startSong = queue.find((s) => IdUtils.norm(s.id) === IdUtils.norm(songId)) || queue[0]!;
            this.ui.audioPlayer.playSong(startSong, queue, true, 'playlist');
            return;
          }
        }
        this.ui.audioPlayer.playSong(song, null, true, (el.dataset.playSource as PlaySource) || null);
      });
    });

    document.querySelectorAll<HTMLElement>('[data-play-album]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if ((e as MouseEvent).detail > 1) return;
        const data = JSON.parse(el.dataset.playAlbum || '{}') as { artistId: string; albumId: string };
        const queue = Utils.albumQueue(this.ui.state, data.artistId, data.albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0]!, queue, true, 'album');
      });
    });

    document.querySelectorAll<HTMLElement>('[data-playlist-play]').forEach((el) => {
      if ((el as HTMLElement & { _plPlayBound?: boolean })._plPlayBound) return;
      (el as HTMLElement & { _plPlayBound?: boolean })._plPlayBound = true;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.playlistPlay;
        if (!id) return;
        const queue = this.ui.state.buildPlaylistQueue(id);
        if (queue.length) {
          this.ui.audioPlayer.playSong(queue[0]!, queue, true, 'playlist');
          this.ui.state.showToast('Playing playlist');
        } else {
          this.ui.state.showToast('Playlist is empty');
        }
      });
    });

    document.querySelectorAll<HTMLElement>('[data-playlist-view]').forEach((el) => {
      if ((el as HTMLElement & { _plViewBound?: boolean })._plViewBound) return;
      (el as HTMLElement & { _plViewBound?: boolean })._plViewBound = true;
      el.addEventListener('click', () => {
        const pl = this.ui.state.playlists.find((p) => p.name === el.dataset.playlistView);
        if (!pl) return;
        history.pushState(null, '', '/playlist/' + pl.id);
        this.ui.handlePopState();
      });
    });

    document.querySelectorAll<HTMLElement>('[data-playlist-shuffle]').forEach((el) => {
      if ((el as HTMLElement & { _plShuffleBound?: boolean })._plShuffleBound) return;
      (el as HTMLElement & { _plShuffleBound?: boolean })._plShuffleBound = true;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.playlistShuffle;
        if (!id) return;
        const queue = this.ui.state.buildPlaylistQueue(id);
        if (queue.length) {
          const shuffled = Utils.shuffle(queue);
          this.ui.audioPlayer.playSong(shuffled[0]!, shuffled, true, 'playlist');
          this.ui.state.showToast('Shuffling playlist');
        } else {
          this.ui.state.showToast('Playlist is empty');
        }
      });
    });

    document.querySelectorAll<HTMLElement>('[data-more-song]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (el.dataset.moreSong) this.showSongMenu(el.dataset.moreSong, e);
      });
    });

    document.querySelectorAll<HTMLElement>('.add-to-playlist-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        if (!songId) return;
        const song = this.ui.state.getSongById(songId);
        if (song) this.ui.favorites.addToPlaylistModal(song);
      });
    });

    document.querySelectorAll<HTMLElement>('.artist-name-pill').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const artistId = el.dataset.artistId;
        if (artistId) this.showArtistPopover(artistId, e);
      });
    });

    document.querySelectorAll<HTMLElement>('[data-album-id][data-dynamic="true"]').forEach((el) => {
      el.addEventListener('click', () => {
        const artistId = IdUtils.norm(el.dataset.artistId);
        const albumId = IdUtils.norm(el.dataset.albumId);
        if (artistId && albumId) this.ui.navigate('artist', artistId, albumId);
      });
    });

    if (this.ui.state.currentPage === 'playlists') {
      const createPlBtn = document.getElementById('create-playlist-btn');
      if (createPlBtn && !(createPlBtn as HTMLElement & { _hasListener?: boolean })._hasListener) {
        (createPlBtn as HTMLElement & { _hasListener?: boolean })._hasListener = true;
        createPlBtn.addEventListener('click', () => {
          window.favoritesPlaylists.createNewPlaylist();
          this.ui.render();
        });
      }
      document.querySelectorAll<HTMLInputElement>('.playlist-name-input, .playlist-description-input').forEach((el) => {
        el.addEventListener('input', (e) => {
          const t = e.target as HTMLInputElement;
          const pl = this.ui.state.playlists.find((p) => p.id === t.dataset.playlistId);
          if (pl) {
            (pl as unknown as Record<string, unknown>)[t.dataset.field!] = t.value;
            this.ui.state.persist();
          }
        });
      });
      document.querySelectorAll<HTMLInputElement>('.tag-input').forEach((input) => {
        input.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' || !input.value.trim()) return;
          e.preventDefault();
          const pl = this.ui.state.playlists.find((p) => p.id === input.dataset.playlistId);
          if (!pl) return;
          const newTag = input.value.trim();
          if (!pl.tags) pl.tags = [];
          if (pl.tags.includes(newTag)) return;
          pl.tags.push(newTag);
          this.ui.state.persist();
          const chip = document.createElement('span');
          chip.className = 'tag-chip animate-fadeIn';
          chip.style.background = 'rgba(var(--bg-interactive))';
          const safeTag = newTag
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
          chip.innerHTML = `${safeTag} <button class="remove-tag-btn" data-tag="${safeTag}">×</button>`;
          input.closest('.tags-container')?.insertBefore(chip, input);
          chip.querySelector('.remove-tag-btn')?.addEventListener('click', (ce) => {
            ce.stopPropagation();
            pl.tags = pl.tags.filter((t) => t !== (ce.target as HTMLElement).dataset.tag);
            this.ui.state.persist();
            chip.remove();
          });
          input.value = '';
        });
      });
      document.querySelectorAll<HTMLElement>('.remove-tag-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const target = e.target as HTMLElement;
          const plId = target.closest<HTMLElement>('.tags-container')?.dataset.playlistId;
          const pl = this.ui.state.playlists.find((p) => p.id === plId);
          if (pl?.tags) {
            pl.tags = pl.tags.filter((t) => t !== target.dataset.tag);
            this.ui.state.persist();
            target.closest('.tag-chip')?.remove();
          }
        });
      });
      document.querySelectorAll<HTMLElement>('.remove-from-playlist-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pl = this.ui.state.playlists.find((p) => p.id === btn.dataset.playlistId);
          if (pl) {
            pl.songs = pl.songs.filter((sid) => String(sid) !== String(btn.dataset.songId));
            this.ui.state.persist();
            btn.closest('.song-row')?.remove();
          }
        });
      });
      document.querySelectorAll<HTMLElement>('.share-playlist-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pl = this.ui.state.playlists.find((p) => p.id === btn.dataset.playlistId);
          if (!pl) return;
          const shareText = `Playlist: ${pl.name}\n${pl.songs.length} songs\n${pl.description || ''}`;
          if (navigator.share) navigator.share({ title: pl.name, text: shareText }).catch(() => {});
          else navigator.clipboard?.writeText(shareText).then(() => this.ui.state.showToast('Playlist copied to clipboard'));
        });
      });
    }

    if (this.ui.state.currentPage === 'editPlaylist') {
      this.attachEditPlaylistEvents();
    }

    document.querySelectorAll<HTMLElement>('[data-hover-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.hoverAction;
        const artistId = btn.dataset.artistId;
        const albumId = btn.dataset.albumId;
        const playlistId = btn.dataset.playlistId;
        const state = this.ui.state;
        switch (action) {
          case 'play-album': {
            const queue = Utils.albumQueue(state, artistId!, albumId!);
            if (queue.length) this.ui.audioPlayer.playSong(queue[0]!, queue, true, 'album');
            break;
          }
          case 'shuffle-album': {
            const queue = Utils.albumQueue(state, artistId!, albumId!);
            if (queue.length) {
              const shuffled = Utils.shuffle(queue);
              this.ui.audioPlayer.playSong(shuffled[0]!, shuffled, true, 'album');
            }
            break;
          }
          case 'favorite-album': {
            await window.heartManager?.toggle('album', albumId!);
            break;
          }
          case 'album-playlist': {
            const album = state.getAlbumById(albumId!);
            const firstSong = album?.songs?.[0] ? state.getSongById(album.songs[0]!.id) : null;
            if (firstSong) window.favoritesPlaylists?.addToPlaylistModal?.(firstSong);
            break;
          }
          case 'view-artist': {
            this.ui.navigate('artist', artistId!);
            break;
          }
          case 'play-artist': {
            const artist = state.getArtistById(artistId!);
            if (artist?.albums?.length) {
              const queue = Utils.albumQueue(state, artistId!, artist.albums[0]!.id);
              if (queue.length) this.ui.audioPlayer.playSong(queue[0]!, queue, true, 'album');
            }
            break;
          }
          case 'favorite-artist': {
            await window.heartManager?.toggle('artist', artistId!);
            break;
          }
          case 'play-playlist': {
            const queue = state.buildPlaylistQueue(playlistId!);
            if (queue.length) this.ui.audioPlayer.playSong(queue[0]!, queue, true, 'playlist');
            break;
          }
          case 'shuffle-playlist': {
            const queue = state.buildPlaylistQueue(playlistId!);
            if (queue.length) {
              const shuffled = Utils.shuffle(queue);
              this.ui.audioPlayer.playSong(shuffled[0]!, shuffled, true, 'playlist');
            }
            break;
          }
          case 'edit-playlist': {
            this.ui.editPlaylist(playlistId!);
            break;
          }
          case 'share-playlist': {
            const pl = state.playlists.find((p) => String(p.id) === String(playlistId));
            if (!pl) return;
            const shareText = `Playlist: ${pl.name}\n${pl.songs.length} songs\n${pl.description || ''}`;
            if (navigator.share) navigator.share({ title: pl.name, text: shareText }).catch(() => {});
            else navigator.clipboard?.writeText(shareText).then(() => state.showToast('Playlist copied to clipboard'));
            break;
          }
        }
      });
    });

    this.attachHeartEvents();

    document.querySelectorAll<HTMLElement>('.tab-btn').forEach((btn) => {
      if ((btn as HTMLElement & { _tabBound?: boolean })._tabBound) return;
      (btn as HTMLElement & { _tabBound?: boolean })._tabBound = true;
      btn.addEventListener('click', () => {
        this.ui.refreshFavoritesContent(btn.dataset.tab as FavoritesTab);
      });
    });

    window.saveToLibraryDrawer?.refreshSavedBadges?.();
    window.offlineCache?.badgeRows?.();
  }
}

/* ============================================================
   OfflineCache
   ============================================================ */

export class OfflineCache {
  state: PlayerState;
  cachedUrls: Set<string> = new Set();
  private _listening = false;

  constructor(state: PlayerState) {
    this.state = state;
    this.init();
  }

  private normalizeUrl(song: Song): string {
    if (!song?.downloadPath) return '';
    try {
      return new URL(song.downloadPath, window.location.origin).href;
    } catch {
      return song.downloadPath;
    }
  }

  isCached(song: Song | null): boolean {
    if (!song) return false;
    const abs = this.normalizeUrl(song);
    return this.cachedUrls.has(abs) || (song.downloadPath ? this.cachedUrls.has(song.downloadPath) : false);
  }

  init(): void {
    if (!('serviceWorker' in navigator)) return;
    if (!this._listening) {
      this._listening = true;
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data as SWMessage | null;
        if (!data || !data.type) return;
        if (data.type === 'CACHE_STATUS_RESULT') {
          const urls = data.songs?.urls || [];
          this.cachedUrls = new Set(urls);
          this.badgeRows();
        }
        if (data.type === 'SONG_CACHED' && data.url) {
          this.cachedUrls.add(data.url);
          this.badgeRows();
          this.state.showToast('Song available offline');
        }
      });
    }
    this.queryStatus();
    window.addEventListener('sw:controller-change', () => this.queryStatus());
    window.addEventListener('sw:ready', () => this.queryStatus());
  }

  queryStatus(): void {
    const send = () => {
      navigator.serviceWorker?.controller?.postMessage({ type: 'GET_CACHE_STATUS' });
    };
    if (navigator.serviceWorker?.controller) send();
    else navigator.serviceWorker?.ready.then(send).catch(() => {});
  }

  cacheSong(song: Song): void {
    if (!song?.downloadPath) return;
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      this.state.showToast('Offline caching unavailable');
      return;
    }
    if (this.isCached(song)) {
      this.state.showToast('Already available offline');
      return;
    }
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_SONG',
      url: this.normalizeUrl(song),
    });
    this.state.showToast('Caching song for offline…');
  }

  removeSong(song: Song): void {
    if (!song?.downloadPath) return;
    const abs = this.normalizeUrl(song);
    this.cachedUrls.delete(abs);
    this.cachedUrls.delete(song.downloadPath);
    this._deleteFromCacheDb(abs);
    this._deleteFromCacheDb(song.downloadPath);
    this.badgeRows();
    this.state.showToast('Offline copy removed');
  }

  private _deleteFromCacheDb(url: string): void {
    try {
      const request = indexedDB.open('mybeats-cache', 1);
      request.onsuccess = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains('songs')) {
            db.close();
            return;
          }
          const tx = db.transaction('songs', 'readwrite');
          tx.objectStore('songs').delete(url);
          tx.oncomplete = () => db.close();
          tx.onerror = () => db.close();
        } catch {
          /* noop */
        }
      };
    } catch {
      /* noop */
    }
  }

  badgeRows(): void {
    document.querySelectorAll<HTMLElement>('[data-song-id]').forEach((row) => {
      const song = this.state.getSongById(row.dataset.songId || '');
      if (!song) return;
      const has = this.isCached(song);
      const existing = row.querySelector('.offline-badge');
      if (has && !existing) {
        const badge = document.createElement('span');
        badge.className = 'offline-badge';
        badge.title = 'Available offline';
        badge.innerHTML = Icons.general.checkBadge(12);
        const host = row.querySelector('.time') || row;
        host.appendChild(badge);
      } else if (!has && existing) {
        existing.remove();
      }
    });
  }
}

/* ============================================================
   Search
   ============================================================ */

interface SearchHit<T> { kind: string; ref: T; sc: number; }

export class Search {
  ui: UIManager;
  activeIndex = -1;
  private _kbBound = false;
  private _lastQueue: Song[] | null = null;

  constructor(ui: UIManager) {
    this.ui = ui;
  }

  openSearch(): void {
    this.ui.state.isSearchOpen = true;
    this.ui.state.searchQuery = '';
    document.querySelector('.breadcrumb-wrapper')?.classList.add('search-active');
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
      searchBar.classList.remove('hidden');
      searchBar.style.opacity = '0';
      requestAnimationFrame(() => { searchBar.style.opacity = '1'; });
      if (window.innerWidth > 768) {
        setTimeout(() => (document.getElementById('search-input') as HTMLInputElement | null)?.focus(), 150);
      }
    }
    this._resetResults();
    this._bindKeyboard();
  }

  closeSearch(): void {
    this.ui.state.isSearchOpen = false;
    this.ui.state.searchQuery = '';
    document.querySelector('.breadcrumb-wrapper')?.classList.remove('search-active');
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
      searchBar.style.opacity = '0';
      setTimeout(() => {
        searchBar.classList.add('hidden');
        searchBar.style.opacity = '';
      }, 300);
    }
    const input = document.getElementById('search-input') as HTMLInputElement | null;
    if (input) input.value = '';
    this._resetResults();
  }

  private _resultsEl(): HTMLElement {
    let el = document.getElementById('search-results-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'search-results-container';
      const host = document.querySelector('#search-bar .panel') || document.getElementById('search-bar');
      host?.appendChild(el);
    }
    return el;
  }

  private _resetResults(): void {
    const el = document.getElementById('search-results-container');
    if (el) {
      el.className = 'results hidden';
      el.innerHTML = '';
    }
    this.activeIndex = -1;
    this._lastQueue = null;
  }

  updateDropdown(): void {
    if (!this.ui.state.isSearchOpen) return;
    const q = (this.ui.state.searchQuery || '').trim();
    const el = this._resultsEl();
    if (!el) return;
    if (!q) {
      this._resetResults();
      return;
    }
    el.className = 'srResults';
    el.innerHTML = this.renderDropdown();
    this.activeIndex = -1;
    this.attachResultEvents(el);
  }

  private _collect(q: string): {
    top: SearchHit<Song | Artist | EnrichedAlbum | Playlist> | null;
    songs: SearchHit<Song>[];
    artists: SearchHit<Artist>[];
    albums: SearchHit<EnrichedAlbum>[];
    playlists: SearchHit<Playlist>[];
  } {
    const state = this.ui.state;
    const lower = q.toLowerCase();
    const score = (text?: string): number => {
      const t = (text || '').toLowerCase();
      if (!t || !lower) return 0;
      if (t === lower) return 3;
      if (t.startsWith(lower)) return 2;
      return t.includes(lower) ? 1 : 0;
    };
    const songHits = state
      .getAllSongs()
      .map((song): SearchHit<Song> => ({
        kind: 'song',
        ref: song,
        sc: Math.max(score(song.title), score(song.artist) * 0.65, score(song.album) * 0.65),
      }))
      .filter((h) => h.sc > 0)
      .sort((a, b) => b.sc - a.sc);
    const artistHits = state.enrichedLibrary
      .map((a): SearchHit<Artist> => ({ kind: 'artist', ref: a, sc: score(a.artist) * 1.25 }))
      .filter((h) => h.sc > 0)
      .sort((a, b) => b.sc - a.sc);
    const albumHits: SearchHit<EnrichedAlbum>[] = [];
    state.enrichedLibrary.forEach((a) => {
      a.albums.forEach((alb) => {
        const sc = score(alb.album) * 1.15;
        if (sc > 0) {
          albumHits.push({
            kind: 'album',
            ref: {
              ...alb,
              artistId: a.id,
              artistName: a.artist,
              songCount: alb.songs ? alb.songs.length : 0,
              totalSeconds: 0,
              plays: 0,
            },
            sc,
          });
        }
      });
    });
    albumHits.sort((a, b) => b.sc - a.sc);
    const playlistHits = (state.playlists || [])
      .map((p): SearchHit<Playlist> => ({ kind: 'playlist', ref: p, sc: score(p.name) * 1.1 }))
      .filter((h) => h.sc > 0)
      .sort((a, b) => b.sc - a.sc);

    const top =
      [artistHits[0], songHits[0], albumHits[0], playlistHits[0]]
        .filter((x): x is SearchHit<Song | Artist | EnrichedAlbum | Playlist> => !!x)
        .sort((a, b) => b.sc - a.sc)[0] || null;

    const without = <T>(list: SearchHit<T>[]): SearchHit<T>[] =>
      list.filter((h) => !top || h.ref !== top.ref);

    return {
      top,
      songs: (top?.kind === 'song' ? without(songHits) : songHits).slice(0, 5),
      artists: (top?.kind === 'artist' ? without(artistHits) : artistHits).slice(0, 6),
      albums: (top?.kind === 'album' ? without(albumHits) : albumHits).slice(0, 6),
      playlists: (top?.kind === 'playlist' ? without(playlistHits) : playlistHits).slice(0, 3),
    };
  }

  private _esc(text: unknown): string { return Utils.esc(text == null ? '' : String(text)); }

  private _hl(text: string | undefined, q: string): string {
    const t = this._esc(text ?? '');
    const needle = this._esc(q.trim());
    if (!needle) return t;
    const rx = new RegExp('(' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    return t.replace(rx, '<mark class="sr-hl">$1</mark>');
  }

  private _hero(top: SearchHit<Song | Artist | EnrichedAlbum | Playlist>, q: string): string {
    const kindLabel: Record<string, string> = {
      song: 'Song', artist: 'Artist', album: 'Album', playlist: 'Playlist',
    };
    let art = '';
    let title = '';
    let sub = '';
    let attrs = '';
    let playBtn = '';

    if (top.kind === 'song') {
      const s = top.ref as Song;
      attrs = `data-sr-song="${this._esc(s.id)}"`;
      art = `<img src="${this._esc(s.coverUrl || '')}" alt="" loading="lazy">`;
      title = this._hl(s.title, q);
      sub = `${kindLabel.song} · ${this._hl(s.artist || '', q)}${s.album ? ` · ${this._hl(s.album, q)}` : ''}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-song="${this._esc(s.id)}" aria-label="Play ${this._esc(s.title)}">${Icons.player.play(16)}</button>`;
    } else if (top.kind === 'artist') {
      const a = top.ref as Artist;
      const albums = a.albums ? a.albums.length : 0;
      const songs = (a.albums || []).reduce((n, alb) => n + alb.songs.length, 0);
      attrs = `data-sr-artist="${this._esc(a.id)}"`;
      art = `<img src="${this._esc(a.imageUrl || '')}" alt="" loading="lazy">`;
      title = this._hl(a.artist, q);
      sub = `${kindLabel.artist}${a.genre ? ` · ${this._hl(a.genre, q)}` : ''} · ${albums} album${albums === 1 ? '' : 's'} · ${songs} song${songs === 1 ? '' : 's'}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-artist="${this._esc(a.id)}" aria-label="Play ${this._esc(a.artist)}">${Icons.player.play(16)}</button>`;
    } else if (top.kind === 'album') {
      const al = top.ref as EnrichedAlbum;
      attrs = `data-sr-album="${this._esc(al.id)}" data-artist-id="${this._esc(al.artistId)}"`;
      art = `<img src="${this._esc(al.coverUrl || '')}" alt="" loading="lazy">`;
      title = this._hl(al.album, q);
      sub = `${kindLabel.album}${al.year ? ` · ${this._esc(al.year)}` : ''} · ${this._hl(al.artistName, q)} · ${al.songCount} song${al.songCount === 1 ? '' : 's'}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-album="${this._esc(al.id)}" data-artist-id="${this._esc(al.artistId)}" aria-label="Play ${this._esc(al.album)}">${Icons.player.play(16)}</button>`;
    } else {
      const p = top.ref as Playlist;
      attrs = `data-sr-playlist="${this._esc(p.id)}"`;
      art = `<span class="srHeroArtFallback">${Icons.general.playlist(30)}</span>`;
      title = this._hl(p.name, q);
      sub = `${kindLabel.playlist} · ${p.songs.length} song${p.songs.length === 1 ? '' : 's'}`;
    }
    return `
      <div class="srHero" data-sr-item ${attrs} role="button" tabindex="-1">
        <span class="srHeroArt${top.kind === 'artist' ? ' round' : ''}">
          ${art}
          ${playBtn}
        </span>
        <span class="srHeroBody">
          <span class="srHeroBadge">${Icons.general.sparkles(12)} Top result</span>
          <span class="srHeroTitle">${title}</span>
          <span class="srHeroSub">${sub}</span>
        </span>
      </div>`;
  }

  private _songRow(song: Song, i: number, q: string): string {
    const isFav = this.ui.favorites.isSong(song.id);
    return `
      <div class="srRow" data-sr-item data-sr-song="${this._esc(song.id)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srRowNum">${i + 1}</span>
        <span class="srRowArt">
          <img src="${this._esc(song.coverUrl || '')}" alt="" loading="lazy">
          <span class="srRowPlay">${Icons.player.play(11)}</span>
        </span>
        <span class="srRowText">
          <span class="srRowTitle">${this._hl(song.title, q)}</span>
          <span class="srRowSub">${this._hl(song.artist || '', q)}${song.album ? ` · ${this._hl(song.album, q)}` : ''}</span>
        </span>
        <button type="button" class="srIconBtn heart${isFav ? ' favorited is-favorite' : ''}" data-fav-song="${this._esc(song.id)}" aria-label="Favorite ${this._esc(song.title)}">${this.ui.likeStatus('song', isFav, false, null)}</button>
        <button type="button" class="srIconBtn" data-more-song="${this._esc(song.id)}" aria-label="More options">${Icons.general.moreVert(15)}</button>
        <span class="srRowTime">${this._esc(song.duration || '')}</span>
      </div>`;
  }

  private _albumCard(al: EnrichedAlbum, i: number, q: string): string {
    return `
      <div class="srCard" data-sr-item data-sr-album="${this._esc(al.id)}" data-artist-id="${this._esc(al.artistId)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srCardArt">
          <img src="${this._esc(al.coverUrl || '')}" alt="" loading="lazy">
          <button type="button" class="srCardPlay" data-sr-play data-sr-album="${this._esc(al.id)}" data-artist-id="${this._esc(al.artistId)}" aria-label="Play ${this._esc(al.album)}">${Icons.player.play(13)}</button>
        </span>
        <span class="srCardTitle">${this._hl(al.album, q)}</span>
        <span class="srCardSub">${al.year ? `${this._esc(al.year)} · ` : ''}${this._hl(al.artistName, q)}</span>
      </div>`;
  }

  private _artistCard(a: Artist, i: number, q: string): string {
    const albums = a.albums ? a.albums.length : 0;
    return `
      <div class="srCard srCardArtist" data-sr-item data-sr-artist="${this._esc(a.id)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srCardArt round">
          <img src="${this._esc(a.imageUrl || '')}" alt="" loading="lazy">
        </span>
        <span class="srCardTitle">${this._hl(a.artist, q)}</span>
        <span class="srCardSub">Artist · ${albums} album${albums === 1 ? '' : 's'}</span>
      </div>`;
  }

  private _playlistRow(p: Playlist, i: number, q: string): string {
    return `
      <div class="srRow" data-sr-item data-sr-playlist="${this._esc(p.id)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srRowArt srRowArtPl">${Icons.general.playlist(20)}</span>
        <span class="srRowText">
          <span class="srRowTitle">${this._hl(p.name, q)}</span>
          <span class="srRowSub">Playlist · ${p.songs.length} song${p.songs.length === 1 ? '' : 's'}</span>
        </span>
        <span class="srRowGo">${Icons.general.arrowRight(15)}</span>
      </div>`;
  }

  renderDropdown(): string {
    const q = (this.ui.state.searchQuery || '').trim();
    if (!q) return '';
    const { top, songs, artists, albums, playlists } = this._collect(q);
    this._lastQueue = songs.map((s) => s.ref);
    if (!top && !songs.length && !artists.length && !albums.length && !playlists.length) {
      return `
        <div class="srEmpty">
          <span class="srEmptyIcon">${Icons.general.search(26)}</span>
          <p class="srEmptyTitle">No results for &ldquo;${this._esc(q)}&rdquo;</p>
          <p class="srEmptySub">Check the spelling, or try a different song, artist, album or playlist.</p>
        </div>`;
    }
    const section = (label: string, inner: string) => `
      <section class="srSection">
        <h4 class="srLabel">${label}</h4>
        ${inner}
      </section>`;
    let html = '';
    if (top) html += this._hero(top, q);
    if (songs.length) html += section('Songs', `<div class="srRows">${songs.map((h, i) => this._songRow(h.ref, i, q)).join('')}</div>`);
    if (albums.length) html += section('Albums', `<div class="srCards">${albums.map((h, i) => this._albumCard(h.ref, i, q)).join('')}</div>`);
    if (artists.length) html += section('Artists', `<div class="srCards">${artists.map((h, i) => this._artistCard(h.ref, i, q)).join('')}</div>`);
    if (playlists.length) html += section('Playlists', `<div class="srRows">${playlists.map((h, i) => this._playlistRow(h.ref, i, q)).join('')}</div>`);
    html += `
      <div class="srFoot">
        <span><kbd>&#8593;</kbd><kbd>&#8595;</kbd> navigate</span>
        <span><kbd>&#8629;</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
      </div>`;
    return html;
  }

  private _activate(el: HTMLElement, forcePlay = false): void {
    const d = el.dataset;
    const ui = this.ui;
    if (d.srSong) {
      const song = ui.state.getSongById(d.srSong);
      if (song) ui.audioPlayer.playSong(song, this._lastQueue?.length ? this._lastQueue : null, true, 'search');
      this.closeSearch();
      return;
    }
    if (d.srAlbum) {
      if (forcePlay) {
        const queue = Utils.albumQueue(ui.state, d.artistId!, d.srAlbum);
        if (queue.length) ui.audioPlayer.playSong(queue[0]!, queue, true, 'album');
      } else {
        ui.navigate('artist', d.artistId!, d.srAlbum);
      }
      this.closeSearch();
      return;
    }
    if (d.srArtist) {
      if (forcePlay && ui.libraryPage?.playArtist) {
        ui.libraryPage.playArtist(d.srArtist);
      } else {
        ui.navigate('artist', d.srArtist);
      }
      this.closeSearch();
      return;
    }
    if (d.srPlaylist) {
      const pl = (ui.state.playlists || []).find((p) => String(p.id) === String(d.srPlaylist));
      if (pl) {
        ui.state.selectedPlaylistName = pl.name;
        ui.state.selectedPlaylistId = pl.id;
      }
      ui.navigate('playlists');
      this.closeSearch();
    }
  }

  attachResultEvents(container: HTMLElement | null): void {
    if (!container) return;
    if (!(container as HTMLElement & { _srDelegated?: boolean })._srDelegated) {
      (container as HTMLElement & { _srDelegated?: boolean })._srDelegated = true;
      container.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const more = target.closest<HTMLElement>('[data-more-song]');
        if (more) {
          e.stopPropagation();
          this.ui.contentEvents.showSongMenu(more.dataset.moreSong!, e);
          return;
        }
        const play = target.closest<HTMLElement>('[data-sr-play]');
        if (play) {
          e.stopPropagation();
          this._activate(play, true);
          return;
        }
        const item = target.closest<HTMLElement>('[data-sr-item]');
        if (item) {
          if (target.closest('[data-fav-song]')) return;
          this._activate(item, false);
        }
      });
    }
    container.querySelectorAll<HTMLElement>('[data-fav-song]').forEach((btn) =>
      this.ui.contentEvents.setupHeartButton(btn, 'song', btn.dataset.favSong!),
    );
  }

  private _bindKeyboard(): void {
    if (this._kbBound) return;
    const input = document.getElementById('search-input') as HTMLInputElement | null;
    if (!input) return;
    this._kbBound = true;
    input.addEventListener('keydown', (e) => {
      if (!this.ui.state.isSearchOpen) return;
      const items = [...document.querySelectorAll<HTMLElement>('#search-results-container [data-sr-item]')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        this.activeIndex =
          e.key === 'ArrowDown'
            ? (this.activeIndex + 1) % items.length
            : (this.activeIndex - 1 + items.length) % items.length;
        items.forEach((el, i) => el.classList.toggle('sr-active', i === this.activeIndex));
        items[this.activeIndex]?.scrollIntoView?.({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        if (!items.length) return;
        e.preventDefault();
        const target = items[this.activeIndex] || items[0];
        if (target) this._activate(target, false);
      }
    });
  }

  attachCategoryCollapse(): void { /* noop */ }
  attachSearchDropdownEvents(): void { /* noop */ }
}

/* ============================================================
   UIManager
   ============================================================ */

export class UIManager {
  state: PlayerState;
  audioPlayer: AudioEngine;
  favorites: FavoritesPlaylistsManager;

  isTransitioning = false;
  isBreadcrumbHidden = false;
  skipProgress = false;
  fragmentLoadDelay = 1500;
  popoverDelay = 400;

  router: AppRouter;
  player: PlayerManager;
  search: Search;
  contentEvents: ContentEvents;
  homePage: Home;
  libraryPage: Library;
  favoritesPage: Favorites;
  playlistsPage: Playlists;
  editPlaylistPage: EditPlaylist;
  artistPage: Artists;
  errorPage: Error404;

  private _spinner: Spinner | null = null;
  private _favTabLoading = false;
  private _artistTabLoading = false;
  private transitionStart = 0;
  private main: HTMLElement | null = null;

  constructor(state: PlayerState, audioPlayer: AudioEngine, favorites: FavoritesPlaylistsManager) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    this.favorites = favorites;
    this.state.favoritesTab = 'songs';
    this.state.selectedPlaylistName = null;
    this.state.isCreatingPlaylist = false;

    this.router = new AppRouter(this);
    this.player = new PlayerManager(this as never);
    this.search = new Search(this);
    this.contentEvents = new ContentEvents(this);

    this.homePage = new Home(this as never);
    this.libraryPage = new Library(this as never);
    this.favoritesPage = new Favorites(this as never);
    this.playlistsPage = new Playlists(this as never);
    this.editPlaylistPage = new EditPlaylist(this as never);
    this.artistPage = new Artists(this as never);
    this.errorPage = new Error404(this as never);

    this.init();
    window.NProgress?.configure({ showSpinner: true, speed: 300, trickleSpeed: 600 });
  }

  private _ensureSpinner(): Spinner | null {
    const main = document.getElementById('main-content');
    if (!main) return null;
    if (!this._spinner || !this._spinner.el || !main.contains(this._spinner.el)) {
      this._spinner?.remove?.();
      this._spinner = new Spinner({ type: 'area', container: main });
    }
    return this._spinner;
  }

  showSpinner(): void { this._ensureSpinner()?.show(); }
  hideSpinner(): void { this._spinner?.hide(); }

  private init(): void {
    this.render = this.render.bind(this);
    this.navigate = this.navigate.bind(this);
    this.handlePopState = this.handlePopState.bind(this);

    AppListeners.bindAll(this);
    this.router.syncWithURL();
    window.addEventListener('popstate', this.handlePopState);
  }

  navigate(page: PageType, artistId: string | null = null, albumId: string | null = null): void {
    if (!this.skipProgress && window.NProgress) window.NProgress.start();
    this.skipProgress = false;
    this.router.goTo(page, artistId, albumId);
  }

  handlePopState(): void {
    this.router.handlePopState();
  }

  render(): void {
    this.main = document.getElementById('main-content');
    if (!this.main) return;
    this.scrollToTop();

    if (this.isTransitioning) {
      if (this.transitionStart && Date.now() - this.transitionStart > 2000) {
        console.warn('[UIManager] Transition timeout — forcing reset');
        this.isTransitioning = false;
      } else return;
    }
    this.isTransitioning = true;
    this.transitionStart = Date.now();

    Object.assign(this.main.style, {
      transition: 'opacity 0.3s ease, transform 0.3s ease, filter 0.3s ease',
      opacity: '0',
      transform: 'translateY(10px)',
      filter: 'blur(8px)',
    });
    this.routes();
    this.player.renderMiniPlayer();
  }

  private routes(): void {
    const pageMap: Record<string, () => string> = {
      home: () => this.homePage.render(),
      library: () => this.libraryPage.render(),
      favorites: () => this.favoritesPage.render(),
      playlists: () => this.playlistsPage.render(),
      editPlaylist: () => this.editPlaylistPage.render(),
      artist: () => this.artistPage.render(),
      '404': () => this.errorPage.render(),
    };
    setTimeout(() => {
      if (!this.main) return;
      try {
        const render = pageMap[this.state.currentPage] ?? (() => '<div>Not found</div>');
        this.main.innerHTML = render();
        this._ensureSpinner();
        Object.assign(this.main.style, {
          opacity: '1',
          transform: 'translateY(0)',
          filter: 'blur(0px)',
        });
        setTimeout(() => {
          if (this.main) this.main.style.transition = '';
          this.isTransitioning = false;
        }, 300);
        this.contentEvents.attachContentEvents();
        if (window.NProgress && window.NProgress.status !== null) window.NProgress.done();
        this._maybeAutoPlayDeepLink();
      } catch (err) {
        console.error('[UIManager] Page render error:', err);
        this.isTransitioning = false;
        if (window.NProgress && window.NProgress.status !== null) window.NProgress.done();
      }
    }, 300);
  }

  scrollSection(title: string, cards: string[]): string {
    return `<section data-area="scroll" class="section container"><h2 class="section-header">${title}</h2><div class="scroll-row">${cards.join('')}</div></section>`;
  }

  albumCard(
    artistId: string, artistName: string, albumId: string, albumName: string,
    coverUrl: string, index = 0, _size = '170px',
  ): string {
    const album = this.state.getAlbumById(albumId);
    const isFav = albumId && this.favorites.isAlbum(albumId);
    const songCount = album?.songs?.length || 0;
    return `
<div class="card animate-fadeInUp" style="--d: ${index * 50}ms" data-artist-id="${artistId}" data-album-id="${albumId}">
  <div class="imgBx"><img src="${coverUrl}" alt="${Utils.esc(albumName)}" loading="lazy"></div>
  <div class="content">
    <div class="contentBx">
      <h3>${albumName}<br><span>${artistName} • ${songCount} song${songCount === 1 ? '' : 's'}</span></h3>
    </div>
    <ul class="sci">
      <li style="--i:1"><a href="#" data-hover-action="play-album" data-artist-id="${artistId}" data-album-id="${albumId}" title="Play"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path opacity=".4" fill="currentColor" d="M48 256a208 208 0 1 0 416 0 208 208 0 1 0 -416 0zm128-88c0-8.7 4.7-16.7 12.3-20.9s16.8-4.1 24.3 .5l144 88c7.1 4.4 11.5 12.1 11.5 20.5s-4.4 16.1-11.5 20.5l-144 88c-7.4 4.5-16.7 4.7-24.3 .5S176 352.7 176 344l0-176z"/><path fill="currentColor" d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM212.5 147.5c-7.4-4.5-16.7-4.7-24.3-.5S176 159.3 176 168l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88zM298 256l-74 45.2 0-90.4 74 45.2z"/></svg></a></li>
      <li style="--i:2"><a href="#" data-hover-action="shuffle-album" data-artist-id="${artistId}" data-album-id="${albumId}" title="Shuffle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M425 31l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39-74.1 0c-15.1 0-29.3 7.1-38.4 19.2l-33.6 44.8-30-40 25.2-33.6C297.3 118.2 325.8 104 356 104l74.1 0-39-39c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0zM194 336l-25.2 33.6C150.7 393.8 122.2 408 92 408l-68 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l68 0c15.1 0 29.3-7.1 38.4-19.2L164 296 194 336zm197-49c9.4-9.4 24.6-9.4 33.9 0l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39-74.1 0c-30.2 0-58.7-14.2-76.8-38.4L130.4 171.2C121.3 159.1 107.1 152 92 152l-68 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l68 0c30.2 0 58.7 14.2 76.8 38.4L317.6 340.8c9.1 12.1 23.3 19.2 38.4 19.2l74.1 0-39-39c-9.4-9.4-9.4-24.6 0-33.9z"/></svg></a></li>
      <li style="--i:3"><a href="#" class="${isFav ? 'favorited' : ''}" data-hover-action="favorite-album" data-album-id="${albumId}" title="Favorite"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path opacity=".4" fill="currentColor" d="M48 256a208 208 0 1 0 416 0 208 208 0 1 0 -416 0zm96-21.3c0-32.4 26.3-58.7 58.7-58.7 18.5 0 35.9 8.7 46.9 23.5l6.4 8.5 6.4-8.5c11.1-14.8 28.5-23.5 46.9-23.5 32.4 0 58.7 26.3 58.7 58.7l0 5.3c0 49.1-65.8 98.1-96.5 118.3-9.5 6.2-21.5 6.2-30.9 0-30.7-20.2-96.5-69.3-96.5-118.3l0-5.3z"/><path fill="currentColor" d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-6.4-312.5c-11.1-14.8-28.5-23.5-46.9-23.5-32.4 0-58.7 26.3-58.7 58.7l0 5.3c0 49.1 65.8 98.1 96.5 118.3 9.5 6.2 21.5 6.2 30.9 0 30.7-20.2 96.5-69.3 96.5-118.3l0-5.3c0-32.4-26.3-58.7-58.7-58.7-18.5 0-35.9 8.7-46.9 23.5l-6.4 8.5-6.4-8.5z"/></svg></a></li>
      <li style="--i:4"><a href="#" data-hover-action="album-playlist" data-artist-id="${artistId}" data-album-id="${albumId}" title="Add to playlist"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path opacity=".4" fill="currentColor" d="M64 240l261.8 0c-14.7 9.8-28 21.5-39.4 34.9-9.7-1.9-19.9-2.9-30.4-2.9-63.1 0-114.3 35.8-114.3 80 0 41 44.1 74.8 100.8 79.5 1.8 11.2 4.7 22.1 8.4 32.5L96 464 64 240z"/><path fill="currentColor" d="M152 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l208 0c13.3 0 24-10.7 24-24S373.3 0 360 0L152 0zM104 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l304 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L104 96zM484.3 208.6C475.1 198 461.9 192 448 192L64 192c-13.9 0-27.1 6-36.3 16.6S14.5 233 16.5 246.8l32 224C51.9 494.4 72.1 512 96 512l180 0c-10.5-14.6-19-30.7-25.1-48L96 464 64 240 325.8 240c30.4-20.2 66.9-32 106.2-32 20.3 0 39.8 3.1 58.1 8.9-1.6-3-3.6-5.8-5.8-8.4zM256 272c-63.1 0-114.3 35.8-114.3 80 0 41 44.1 74.8 100.8 79.5-1.7-10.2-2.6-20.7-2.6-31.5 0-9.5 .7-18.8 2-27.8-10.7-3.6-18-11.3-18-20.2 0-11.7 12.9-21.4 29.3-22.3 7.9-20.2 19.2-38.7 33.1-54.8-9.7-1.9-19.9-2.9-30.4-2.9zM432 544a144 144 0 1 0 0-288 144 144 0 1 0 0 288zm16-208l0 48 48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-48 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48-48 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l48 0 0-48c0-8.8 7.2-16 16-16s16 7.2 16 16l48 0 0-48c0-8.8 7.2-16 16-16s16 7.2 16 16z"/></svg></a></li>
    </ul>
  </div>
</div>`;
  }

  artistCard(artist: Artist, index = 0): string {
    const isFav = this.favorites.isArtist(artist.id);
    const albumCount = artist.albums?.length || 0;
    return `
<div class="card animate-fadeInUp" style="--d: ${index * 60}ms" data-artist-id="${artist.id}">
  <div class="imgBx"><img src="${artist.imageUrl}" alt="${Utils.esc(artist.artist)}" loading="lazy"></div>
  <div class="content">
    <div class="contentBx"><h3>${artist.artist}<br><span>${artist.genre || 'Artist'} • ${albumCount} album${albumCount === 1 ? '' : 's'}</span></h3></div>
    <ul class="sci">
      <li style="--i:1"><a href="#" data-hover-action="view-artist" data-artist-id="${artist.id}" title="View">${Icons.general.eye(16)}</a></li>
      <li style="--i:2"><a href="#" data-hover-action="play-artist" data-artist-id="${artist.id}" title="Play top">${Icons.player.play(16)}</a></li>
      <li style="--i:3"><a href="#" class="${isFav ? 'favorited' : ''}" data-hover-action="favorite-artist" data-artist-id="${artist.id}" title="Favorite">${Icons.general.heart(16, isFav)}</a></li>
    </ul>
  </div>
</div>`;
  }

  recentCard(song: Song, index = 0): string {
    return `
      <div data-card="album" class="card animate-fadeInUp" style="--w: 140px; --d: ${index * 50}ms">
        <div class="art-wrap" data-song-id="${song.id}" data-play-source="home">
          <img src="${song.coverUrl}" alt="${Utils.esc(song.title)}" loading="lazy">
          <div class="art-overlay"><span class="play-glyph">${Icons.player.play(16)}</span></div>
        </div>
        <div class="card-info">
          <p class="primary">${song.title}</p>
          <p class="secondary">${song.artist}</p>
        </div>
      </div>`;
  }

  songRow(song: Song, index: number, showDuration = true): string {
    const artistId = song.artistId;
    const albumId = song.albumId;
    return `
      <div class="song-row animate-fadeInUp" style="--d: ${index * 25}ms">
        <button class="main" data-song-id="${song.id}">
          <img src="${song.coverUrl}" class="cover">
          <div class="info">
            <p class="title">${song.title}</p>
            <p class="sub">${this.artistNameTooltip(artistId)} • <span class="album-link" data-artist-id="${artistId}" data-album-id="${albumId}" onclick="event.stopPropagation(); window.uiManager.navigate('artist', '${artistId}', '${albumId}')">${song.album}</span></p>
          </div>
        </button>
        <button class="downloadBtn" data-action="download-song" data-song-id="${song.id}" data-song-title="${song.title}" data-song-thumbnail="${song.coverUrl}" title="Download">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        ${showDuration ? `<span class="time">${song.duration}</span>` : ''}
        <button class="heart ${this.favorites.isSong(song.id) ? 'favorited' : ''}" data-fav-song="${song.id}">${this.likeStatus('song', this.favorites.isSong(song.id), false, null)}</button>
      </div>`;
  }

  artistNameTooltip(artistId?: string, displayText: string | null = null): string {
    if (!artistId) return displayText || 'Unknown';
    const artist = this.state.getArtistById(artistId);
    if (!artist) return displayText || 'Unknown';
    const name = artist.artist;
    const text = displayText || name;
    return `
    <div class="tooltip-wrapper" tabindex="0" role="button">
      <span class="text">${text}
        <span class="popup" role="tooltip" onclick="event.stopPropagation(); window.uiManager.navigate('artist', '${artistId}')">View Artist</span>
      </span>
    </div>`;
  }

  editPlaylist(playlistId: string): void {
    this.state.editingPlaylistId = playlistId;
    const pl = this.state.playlists.find((p) => String(p.id) === String(playlistId));
    this.state.selectedPlaylistName = pl?.name || null;
    history.pushState(null, '', `/playlist/${playlistId}/edit`);
    this.navigate('editPlaylist');
  }

  private _maybeAutoPlayDeepLink(): void {
    const songId = this.state.pendingDeepLinkSong;
    if (!songId) return;
    this.state.pendingDeepLinkSong = null;
    const url = new URL(window.location.href);
    url.searchParams.delete('song');
    history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
    if (this.state.currentPage !== 'artist') return;
    const song = this.state.getSongById(songId);
    if (!song) return;
    const queue = Utils.albumQueue(this.state, song.artistId!, song.albumId!);
    const startSong = queue.find((s) => Utils.id(s.id) === Utils.id(songId)) || song;
    this.audioPlayer.playSong(startSong, queue.length ? queue : null, true, 'album');
  }

  toggleTheme(): void {
    Prefs.applyTheme(Prefs.nextToggle());
  }

  showSettingsModal(): void {
    const popups = window.popups;
    if (!popups) return;
    const currentTheme = Prefs.theme();
    const darkThemes = Prefs.listThemes().filter((t) => t.dark);
    const lightThemes = Prefs.listThemes().filter((t) => !t.dark);
    const themeCard = (t: { key: string; label: string; preview: { bg: string; card: string; text: string; accent: string } }) => `
      <button type="button" class="popups-theme-card ${t.key === currentTheme ? 'active' : ''}"
              data-theme-option="${t.key}" role="radio" aria-checked="${t.key === currentTheme}" aria-label="${t.label} theme">
        <span class="popups-theme-preview" style="--preview-bg:${t.preview.bg};--preview-card:${t.preview.card};--preview-text:${t.preview.text};--preview-accent:${t.preview.accent};">
          <span class="popups-theme-preview-bar"></span>
          <span class="popups-theme-preview-body"><span class="popups-theme-preview-chip"></span><span class="popups-theme-preview-line"></span></span>
          <span class="popups-theme-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        </span>
        <span class="popups-theme-name">${t.label}</span>
      </button>`;

    const content = document.createElement('div');
    content.className = 'popups-settings';
    content.innerHTML = `
      <section class="popups-settings-section">
        <p class="popups-settings-label">Color scheme — Dark</p>
        <div class="popups-theme-grid" role="radiogroup" aria-label="Dark color schemes">${darkThemes.map(themeCard).join('')}</div>
      </section>
      <section class="popups-settings-section">
        <p class="popups-settings-label">Color scheme — Light</p>
        <div class="popups-theme-grid" role="radiogroup" aria-label="Light color schemes">${lightThemes.map(themeCard).join('')}</div>
      </section>
      <section class="popups-settings-section">
        <p class="popups-settings-label">Playback</p>
        <label class="popups-toggle"><input type="checkbox" id="pref-fade" ${Prefs.get('fadeTransitions') ? 'checked' : ''}><span>Fade transitions between tracks</span></label>
        <label class="popups-toggle"><input type="checkbox" id="pref-radio" ${Prefs.get('radioAutoplay') ? 'checked' : ''}><span>Radio autoplay when queue ends</span></label>
      </section>`;

    popups.modal({
      title: 'Settings',
      size: 'md',
      content,
      closable: true,
      autoClose: false,
      onClose: () => {
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
      },
    });
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');

    const setActiveCard = (activeEl: HTMLElement) => {
      content.querySelectorAll<HTMLElement>('.popups-theme-card').forEach((el) => {
        const on = el === activeEl;
        el.classList.toggle('active', on);
        el.setAttribute('aria-checked', String(on));
      });
    };

    content.querySelectorAll<HTMLElement>('.popups-theme-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.themeOption;
        if (!next || !Prefs.isValidTheme(next)) return;
        Prefs.applyTheme(next);
        setActiveCard(btn);
        popups.toast({ message: `Theme: ${Prefs.THEMES[next].label}` });
      });
    });

    content.querySelector<HTMLInputElement>('#pref-fade')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      Prefs.set('fadeTransitions', checked);
      popups.toast({ message: checked ? 'Fade transitions on' : 'Fade transitions off' });
    });
    content.querySelector<HTMLInputElement>('#pref-radio')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      Prefs.set('radioAutoplay', checked);
      popups.toast({ message: checked ? 'Radio autoplay on' : 'Radio autoplay off' });
    });

    setTimeout(() => {
      content.querySelector<HTMLElement>('.popups-theme-card.active, .popups-theme-card, input, button')?.focus();
    }, 50);
  }

  openSearch(): void { this.search.openSearch(); }
  closeSearch(): void { this.search.closeSearch(); }
  showArtistPopover(artistId: string, event: MouseEvent): void { this.contentEvents.showArtistPopover(artistId, event); }
  closePlayerDrawer(): void { this.player.closeDrawer(); }
  openPlayerDrawer(): void { this.player.openDrawer(); }
  updateMiniPlayer(): void { this.player.renderMiniPlayer(); }
  updateProgressOnly(): void { this.player.updateProgressOnly(); }

  updateFullPlayer(): void {
    const drawer = document.getElementById('full-player-drawer');
    if (drawer) this.player.softUpdateDrawer(drawer);
    else if (this.state.isDrawerOpen) this.player.renderFullPlayer();
  }

  showShortcutsHelp(): void {
    const shortcuts: Array<[string, string]> = [
      ['Space', 'Play / Pause'], ['←', 'Previous track'], ['→', 'Next track'],
      ['↑', 'Volume up'], ['↓', 'Volume down'], ['M', 'Mute'],
      ['L', 'Favorite current song'], ['S', 'Shuffle'], ['R', 'Cycle repeat mode'],
      ['Q', 'Up Next queue'], ['Ctrl/⌘ + K', 'Search'], ['?', 'This help'],
      ['Esc', 'Close dialogs'],
    ];
    this.state.modalOpen(`
      <div data-modal="shortcuts" class="shortcuts-help">
        <div class="head">
          <h2 class="title">Keyboard Shortcuts</h2>
          <button onclick="window.closeModal()" class="close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div data-list="shortcuts" class="grid">
          ${shortcuts.map(([key, description]) => `<div class="row"><span class="desc">${description}</span><kbd class="kbd">${key}</kbd></div>`).join('')}
        </div>
      </div>`);
  }

  scrollToTop(duration = 500): void {
    const startY = window.scrollY;
    const startTime = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, startY * (1 - ease(progress)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  refreshArtistContent(artistId: string, albumId: string | null): void {
    if (this._artistTabLoading) return;
    if (artistId !== this.state.artistId) {
      this.navigate('artist', artistId, albumId);
      return;
    }
    this._artistTabLoading = true;
    this.state.selectedAlbumId = albumId;
    this.router.updateTitle();
    this.router.updateBreadcrumbs();
    const artist = this.state.getArtistById(artistId);
    const album = artist?.albums.find((a) => IdUtils.norm(a.id) === IdUtils.norm(albumId));
    if (!artist || !album) {
      this._artistTabLoading = false;
      return;
    }
    const coverContainer = document.querySelector<HTMLElement>('.hero-card .hero-cover');
    const songsArea = document.querySelector<HTMLElement>('[data-list="songs"]');
    const aboutArea = document.querySelector<HTMLElement>('[data-page="artist"] > [data-area="about"]');
    const coverSpinner = coverContainer ? new Spinner({ type: 'area', container: coverContainer }) : null;
    const songsSpinner = songsArea ? new Spinner({ type: 'area', container: songsArea }) : null;
    coverSpinner?.show();
    songsSpinner?.show();
    songsArea?.classList.add('isLoading');

    setTimeout(() => {
      if (coverContainer && album.coverUrl) {
        const img = coverContainer.querySelector<HTMLImageElement>('img');
        if (img) img.src = album.coverUrl;
        else coverContainer.style.backgroundImage = `url(${album.coverUrl})`;
      }
      if (songsArea) {
        songsArea.innerHTML = `
          <div class="header">
            <div class="left"><span class="badge">${album.certification || 'Double Platinum'}</span><span class="year">${album.year || '2024'}</span></div>
            <span class="hint">Double-click</span>
          </div>
          <div class="body">${album.songs.map((song, i) => this.artistPage.createSongRow(song, i, artist, album)).join('')}</div>`;
        songsArea.classList.remove('isLoading');
        this.contentEvents.attachContentEvents();
      }
      if (aboutArea && this.artistPage['aboutSection']) {
        const aboutFn = this.artistPage['aboutSection'] as (a: Artist, al: typeof album) => string;
        aboutArea.innerHTML = aboutFn(artist, album);
        aboutArea.querySelectorAll<HTMLElement>('.tab').forEach((btn) => {
          btn.classList.toggle('active', IdUtils.norm(btn.dataset.albumId) === IdUtils.norm(albumId));
        });
        this.contentEvents.attachContentEvents();
      }
      coverSpinner?.hide();
      songsSpinner?.hide();
      setTimeout(() => {
        coverSpinner?.remove();
        songsSpinner?.remove();
      }, 400);
      this._artistTabLoading = false;
    }, 1500);
  }

  refreshFavoritesContent(tab: FavoritesTab): void {
    if (this._favTabLoading) return;
    const favContainer = document.getElementById('favorites-content');
    if (!favContainer) return;
    this._favTabLoading = true;
    const spinner = new Spinner({ type: 'area', container: favContainer });
    spinner.show();
    this.state.favoritesTab = tab;
    history.pushState(null, '', `/favorites/${tab}`);
    this.router.updateBreadcrumbs();
    document.querySelectorAll<HTMLElement>('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    setTimeout(() => {
      favContainer.innerHTML = this.favoritesPage.tabContent(tab);
      this.contentEvents.attachContentEvents();
      spinner.hide();
      spinner.remove();
      this._favTabLoading = false;
    }, 600);
  }

  async toggleFavAndReRender(songId: string): Promise<void> {
    await window.heartManager?.toggle('song', songId);
  }

  likeStatus(_type: string, isFavorite: boolean, isHovered: boolean, tempState: string | null): string {
    if (tempState === 'error' || tempState === 'exclamation') {
      return `<i class="fa-solid fa-heart-circle-exclamation error-icon"></i>`;
    }
    if (tempState === 'check' || tempState === 'confirm') {
      return `<i class="fa-solid fa-heart-circle-check confirm-icon"></i>`;
    }
    if (isFavorite) {
      return isHovered
        ? `<i class="fa-solid fa-heart-circle-minus hover-liked-icon"></i>`
        : `<i class="fa-solid fa-heart liked-icon"></i>`;
    }
    return isHovered
      ? `<i class="fa-solid fa-heart-circle-plus hover-not-liked-icon"></i>`
      : `<i class="fa-solid fa-heart not-liked-icon"></i>`;
  }
}

/* ============================================================
   ContextMenu
   ============================================================ */

interface ContextMenuData {
  songId?: string;
  albumId?: string;
  artistId?: string;
  playlistId?: string;
}

export class ContextMenu {
  el: HTMLElement | null = null;

  constructor() {
    document.addEventListener('click', () => this.hide());
    document.addEventListener('scroll', () => this.hide(), true);
    window.addEventListener('resize', () => this.hide());
  }

  show(x: number, y: number, data: ContextMenuData): void {
    this.hide();
    const menu = document.createElement('div');
    menu.id = 'mybeats-context-menu';
    menu.className = 'mb-context-menu';
    let items = '';

    if (data.songId) {
      const song = window.uiManager?.state?.getSongById(data.songId);
      if (song) {
        const isFav = window.uiManager.favorites.isSong(data.songId);
        items += `
          <button class="mb-ctx-item" data-ctx="play-song" data-id="${data.songId}">${Icons.player.play(16)} Play</button>
          <button class="mb-ctx-item" data-ctx="fav-song" data-id="${data.songId}"><i class="fa-solid fa-heart ${isFav ? 'liked-icon' : 'not-liked-icon'}"></i> ${isFav ? 'Remove from Favorites' : 'Add to Favorites'}</button>
          <button class="mb-ctx-item" data-ctx="add-playlist" data-id="${data.songId}">${Icons.general.playlistAdd(16)} Add to Playlist</button>
          <div class="mb-ctx-divider"></div>`;
      }
    }
    if (data.albumId && data.artistId) {
      items += `
        <button class="mb-ctx-item" data-ctx="play-album" data-artist="${data.artistId}" data-album="${data.albumId}"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg> Play Album</button>
        <button class="mb-ctx-item" data-ctx="shuffle-album" data-artist="${data.artistId}" data-album="${data.albumId}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg> Shuffle Album</button>
        <button class="mb-ctx-item" data-ctx="view-album" data-artist="${data.artistId}" data-album="${data.albumId}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> View Album</button>
        <div class="mb-ctx-divider"></div>`;
    }
    if (data.artistId && !data.albumId) {
      items += `
        <button class="mb-ctx-item" data-ctx="view-artist" data-artist="${data.artistId}">${Icons.general.artist(16)} View Artist</button>
        <button class="mb-ctx-item" data-ctx="play-artist" data-artist="${data.artistId}">${Icons.player.play(16)} Play Artist</button>
        <button class="mb-ctx-item" data-ctx="fav-artist" data-artist="${data.artistId}"><i class="fa-solid fa-heart not-liked-icon"></i> Favorite Artist</button>`;
    }
    if (data.playlistId) {
      items += `
        <button class="mb-ctx-item" data-ctx="play-playlist" data-playlist="${data.playlistId}">${Icons.player.play(16)} Play Playlist</button>
        <button class="mb-ctx-item" data-ctx="shuffle-playlist" data-playlist="${data.playlistId}">${Icons.player.shuffle(16)} Shuffle Playlist</button>
        <button class="mb-ctx-item" data-ctx="edit-playlist" data-playlist="${data.playlistId}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Playlist</button>`;
    }
    if (!items) return;
    menu.innerHTML = items;
    document.body.appendChild(menu);
    this.el = menu;
    const rect = menu.getBoundingClientRect();
    let posX = x;
    let posY = y;
    if (posX + rect.width > window.innerWidth) posX = window.innerWidth - rect.width - 8;
    if (posY + rect.height > window.innerHeight) posY = window.innerHeight - rect.height - 8;
    menu.style.left = posX + 'px';
    menu.style.top = posY + 'px';

    menu.querySelectorAll<HTMLElement>('.mb-ctx-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.ctx;
        const id = btn.dataset.id;
        const artistId = btn.dataset.artist;
        const albumId = btn.dataset.album;
        const playlistId = btn.dataset.playlist;
        const state = window.uiManager?.state;
        switch (action) {
          case 'play-song': {
            const song = id ? state?.getSongById(id) : null;
            if (song) window.uiManager.audioPlayer.playSong(song, null, true, 'context');
            break;
          }
          case 'fav-song': {
            const song = id ? state?.getSongById(id) : null;
            if (song) window.uiManager.favorites.toggleSong(song);
            break;
          }
          case 'add-playlist': {
            const song = id ? state?.getSongById(id) : null;
            if (song) window.favoritesPlaylists?.addToPlaylistModal?.(song);
            break;
          }
          case 'play-album': {
            if (!state || !artistId || !albumId) break;
            const queue = Utils.albumQueue(state, artistId, albumId);
            if (queue.length) window.uiManager.audioPlayer.playSong(queue[0]!, queue, true, 'album');
            break;
          }
          case 'shuffle-album': {
            if (!state || !artistId || !albumId) break;
            const queue = Utils.albumQueue(state, artistId, albumId);
            if (queue.length) {
              const shuffled = Utils.shuffle(queue);
              window.uiManager.audioPlayer.playSong(shuffled[0]!, shuffled, true, 'album');
            }
            break;
          }
          case 'view-album':
            if (artistId && albumId) window.uiManager.navigate('artist', artistId, albumId);
            break;
          case 'view-artist':
            if (artistId) window.uiManager.navigate('artist', artistId);
            break;
          case 'play-artist': {
            if (!state || !artistId) break;
            const artist = state.getArtistById(artistId);
            if (artist?.albums?.length) {
              const queue = Utils.albumQueue(state, artistId, artist.albums[0]!.id);
              if (queue.length) window.uiManager.audioPlayer.playSong(queue[0]!, queue, true, 'album');
            }
            break;
          }
          case 'fav-artist':
            if (artistId) window.favoritesPlaylists?.toggleArtist?.(artistId);
            break;
          case 'play-playlist': {
            if (!state || !playlistId) break;
            const queue = state.buildPlaylistQueue(playlistId);
            if (queue.length) window.uiManager.audioPlayer.playSong(queue[0]!, queue, true, 'playlist');
            break;
          }
          case 'shuffle-playlist': {
            if (!state || !playlistId) break;
            const queue = state.buildPlaylistQueue(playlistId);
            if (queue.length) {
              const shuffled = Utils.shuffle(queue);
              window.uiManager.audioPlayer.playSong(shuffled[0]!, shuffled, true, 'playlist');
            }
            break;
          }
          case 'edit-playlist':
            if (playlistId) window.uiManager.editPlaylist(playlistId);
            break;
        }
        this.hide();
      });
    });
  }

  hide(): void {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }
}
