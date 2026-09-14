




import { Config, Utils, Prefs } from 'https://mybeats.cloud/core/base.ts';
import type { PlayerState } from 'https://mybeats.cloud/core/player.ts';
import type {
  DialogOptions,
  DropdownItem,
  DropdownOptions,
  HeartType,
  ModalOptions,
  NotificationEntry,
  Playlist,
  PopoverOptions,
  Song,
  ToastOptions,
} from 'https://mybeats.cloud/core/types.ts';



/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   P L A Y E R  M A N A G E M E N T
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
//////////  Liked Status  ( "Loved", "Favorited", "Liked" )
interface UILike {
  state: PlayerState;
  favorites: { isSong: (id: string) => boolean };
  navigate: (page: string, artistId?: string | null, albumId?: string | null) => void;
  audioPlayer: { playSong: (...args: unknown[]) => void };
  likeStatus: (type: string, isFav: boolean, isHovered: boolean, tempState: string | null) => string;
}





/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   D Y N A M I C   O V E R L A Y S
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
export class PopupsManager {
  ui: UILike | null;
  private container: HTMLElement;
  private active = new Set<PopupsBase>();
  private stack: PopupsBase[] = [];
  private destroyed = false;
  private _toastContainer: HTMLElement | null = null;
  notificationHistory: NotificationEntry[] = [];
  private _tooltipSelector = '[data-tooltip]';

  constructor({ ui = null, container = document.body }: { ui?: UILike | null; container?: HTMLElement | string } = {}) {
    this.ui = ui;
    this.container = typeof container === 'string' ? document.querySelector(container) ?? document.body : container;
    if (!this.container) this.container = document.body;

    document.addEventListener('keydown', this._onKeyDown, true);
    window.addEventListener('resize', this._resizeHandler);

    this._ensureToastContainer();
    this.enableTooltips();
  }

  static _esc(text: unknown = ''): string {
    return Utils.esc(text);
  }

  static _escAttr(text: unknown = ''): string {
    return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const p = this.stack[i]!;
      if (p.isOpen && p.type !== 'toast' && p.closable !== false) {
        e.preventDefault();
        e.stopPropagation();
        p.hide();
        break;
      }
    }
  };

  private _resizeHandler = () => {
    this.active.forEach((p) => {
      if (p.isOpen && typeof (p as unknown as { reposition?: () => void }).reposition === 'function') {
        (p as unknown as { reposition: () => void }).reposition();
      }
    });
  };

  private _tooltipEnterHandler = (e: MouseEvent) => this._onTooltipEnter(e);

  static get icons() {
    const svg = (attrs: string, content: string) => `<svg ${attrs}>${content}</svg>`;
    return {
      close: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`,
          `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
        ),
      heart: (size = 16, filled = false) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"`,
          `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`,
        ),
      playlistAdd: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`,
        ),
      link: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
        ),
      checkBadge: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
        ),
      user: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<circle cx="12" cy="8" r="4"/><path d="M5.3 18.3C6.8 16.5 9.2 15 12 15s5.2 1.5 6.7 3.3"/>`,
        ),
      album: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/>`,
        ),
      play: (size = 16) =>
        svg(`width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor"`, `<path d="M6 3L16 10L6 17V3Z"/>`),
      eye: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
        ),
      undo: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>`,
        ),
      info: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`,
        ),
      success: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
        ),
      warning: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
        ),
      error: (size = 16) =>
        svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`,
        ),
    };
  }

  register(popup: PopupsBase): void {
    if (this.destroyed) return;
    this.active.add(popup);
    this.stack.push(popup);
  }
  unregister(popup: PopupsBase): void {
    if (this.destroyed) return;
    this.active.delete(popup);
    const idx = this.stack.indexOf(popup);
    if (idx >= 0) this.stack.splice(idx, 1);
  }

  closeType(type: string): void {
    [...this.stack].reverse().forEach((p) => {
      if (p.type === type && p.isOpen) p.hide();
    });
  }
  closeAll(): void {
    [...this.stack].reverse().forEach((p) => {
      if (p.isOpen) p.hide();
    });
  }
  cleanup(): void {
    this.closeAll();
  }
  destroy(): void {
    this.cleanup();
    this.destroyed = true;
    document.removeEventListener('keydown', this._onKeyDown, true);
    window.removeEventListener('resize', this._resizeHandler);
    document.removeEventListener('mouseenter', this._tooltipEnterHandler, true);
  }

  private _updateToastStack(): void {
    if (!this._toastContainer) return;
    this._toastContainer.querySelectorAll<HTMLElement>('.popups-toast').forEach((toast, idx) => {
      toast.setAttribute('data-stack-idx', String(idx));
    });
  }

  private _ensureToastContainer(): HTMLElement {
    if (this._toastContainer) return this._toastContainer;
    let el = document.getElementById('popups-toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'popups-toast-container';
      el.className = 'popups-toast-container';
      document.body.appendChild(el);
    }
    this._toastContainer = el;
    el.addEventListener('mouseenter', () => el!.classList.add('popups-stack-expanded'));
    el.addEventListener('mouseleave', () => el!.classList.remove('popups-stack-expanded'));
    return el;
  }

  modal(options: ModalOptions): PopupsModal {
    const p = new PopupsModal(this, options);
    p.show();
    return p;
  }

  dialog(options: DialogOptions): PopupsModal {
    const {
      title = '',
      message = '',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      dangerous = false,
      onConfirm,
      onCancel,
      size = 'sm',
    } = options;
    const p = new PopupsModal(this, {
      title,
      size,
      closable: false,
      content: `<p class="popups-dialog-message">${PopupsManager._esc(message)}</p>`,
      actions: [
        { label: cancelLabel, action: 'cancel', type: 'secondary' },
        { label: confirmLabel, action: 'confirm', type: dangerous ? 'danger' : 'primary' },
      ],
      onAction: (action) => {
        if (action === 'confirm') onConfirm?.();
        else onCancel?.();
      },
      onClose: () => onCancel?.(),
    });
    p.show();
    return p;
  }

  dropdown(options: DropdownOptions): PopupsDropdown {
    const p = new PopupsDropdown(this, options);
    p.show();
    return p;
  }

  popover(options: PopoverOptions): PopupsPopover {
    const p = new PopupsPopover(this, options);
    p.show();
    return p;
  }

  tooltip(target: HTMLElement, text: string): PopupsTooltip {
    const p = new PopupsTooltip(this, { target, text });
    p.show();
    return p;
  }

  enableTooltips(selector = '[data-tooltip]'): void {
    this._tooltipSelector = selector;
    document.addEventListener('mouseenter', this._tooltipEnterHandler, true);
  }

  private _onTooltipEnter(e: MouseEvent): void {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(this._tooltipSelector);
    if (!target) return;
    const anyTarget = target as HTMLElement & { _popupsTooltip?: PopupsTooltip };
    if (anyTarget._popupsTooltip) return;
    const text = target.dataset.tooltip;
    if (!text || !text.trim()) return;
    const tip = new PopupsTooltip(this, { target, text });
    anyTarget._popupsTooltip = tip;
    const enterTimer = window.setTimeout(() => tip.show(), 250);
    const removeListeners = () => {
      window.clearTimeout(enterTimer);
      tip.hide();
      target.removeEventListener('mouseleave', onLeave);
      target.removeEventListener('mousedown', onLeave);
      delete anyTarget._popupsTooltip;
    };
    const onLeave = () => removeListeners();
    target.addEventListener('mouseleave', onLeave, { once: true });
    target.addEventListener('mousedown', onLeave, { once: true });
  }

  toast(options: ToastOptions): PopupsToast {
    this.notificationHistory.unshift({
      id: Date.now() + Math.random(),
      type: options.type ?? 'info',
      title: options.title ?? '',
      message: options.message ?? '',
      timestamp: new Date().toISOString(),
    });
    if (this.notificationHistory.length > 50) this.notificationHistory.length = 50;
    const p = new PopupsToast(this, options);
    p.show();
    return p;
  }

  showNotificationPanel(anchorEl: HTMLElement): void {
    if (!anchorEl || !this.notificationHistory.length) return;
    const pageSize = 8;
    let currentOffset = 0;

    const buildList = (notifications: NotificationEntry[]) => {
      if (!notifications.length) return `<div class="notifications-empty">No notifications yet</div>`;
      return notifications
        .map(
          (n) => `
        <div class="notification-item notification-${n.type}">
          <span class="notification-icon">${
            (PopupsManager.icons as Record<string, (s?: number) => string>)[n.type]?.(16) ??
            PopupsManager.icons.info(16)
          }</span>
          <div class="notification-content">
            ${n.title ? `<div class="notification-title">${PopupsManager._esc(n.title)}</div>` : ''}
            <div class="notification-message">${PopupsManager._esc(n.message)}</div>
          </div>
          <div class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</div>
        </div>`,
        )
        .join('');
    };

    const initialSlice = this.notificationHistory.slice(0, pageSize);
    const hasMore = this.notificationHistory.length > pageSize;

    const renderContent = (notifications: NotificationEntry[], more: boolean) => `
      <div class="notifications-popover-wrapper">
        <div class="notifications-header"><h3>Notifications</h3></div>
        <div class="notifications-list">${buildList(notifications)}</div>
        ${
          more
            ? `<div class="notifications-load-more"><button class="load-more-btn" data-action="load-more">Load earlier</button><div class="load-more-spinner" style="display:none;"><span class="spinner"></span>Loading…</div></div>`
            : ''
        }
      </div>`;

    const popover = this.popover({
      content: renderContent(initialSlice, hasMore),
      persistentActions: ['load-more'],
      onAction: (action) => {
        if (action === 'load-more') {
          const loadMoreBtn = popover.el?.querySelector<HTMLElement>('.load-more-btn');
          const spinner = popover.el?.querySelector<HTMLElement>('.load-more-spinner');
          if (loadMoreBtn && spinner) {
            loadMoreBtn.style.display = 'none';
            spinner.style.display = 'flex';
            setTimeout(() => {
              currentOffset += pageSize;
              const allCurrent = this.notificationHistory.slice(0, currentOffset + pageSize);
              const stillHasMore = this.notificationHistory.length > currentOffset + pageSize;
              const listEl = popover.el?.querySelector('.notifications-list');
              if (listEl) listEl.innerHTML = buildList(allCurrent);
              const loadMoreSection = popover.el?.querySelector<HTMLElement>('.notifications-load-more');
              if (loadMoreSection) {
                if (stillHasMore) {
                  loadMoreSection.innerHTML = `<button class="load-more-btn" data-action="load-more">Load earlier</button><div class="load-more-spinner" style="display:none;"><span class="spinner"></span>Loading…</div>`;
                } else {
                  loadMoreSection.remove();
                }
              }
            }, 1500);
          }
        }
      },
    });

    const rect = anchorEl.getBoundingClientRect();
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const offsetLeft = 7 * rootFontSize;
    let left = rect.left + rect.width / 2 - offsetLeft;
    const popoverWidth = popover.el?.offsetWidth ?? 0;
    if (left + popoverWidth > window.innerWidth - 12) left = window.innerWidth - 12 - popoverWidth;
    if (left < 12) left = 12;
    if (popover.el) {
      popover.el.style.left = `${left}px`;
      popover.el.style.top = `${rect.bottom + 8}px`;
    }
  }

  showSongMenu(songId: string, event: MouseEvent): PopupsDropdown | null {
    const state = this.ui?.state;
    const song = state?.getSongById(songId);
    if (!song) return null;

    const isFav = this.ui?.favorites?.isSong(songId) ?? false;
    const isCached = window.offlineCache?.isCached(song) ?? false;

    const dataAttr = (data: DropdownItem['data']) => {
      if (!data) return '';
      return Object.entries(data)
        .map(([k, v]) => `data-${k}="${PopupsManager._escAttr(v)}"`)
        .join(' ');
    };

    return this.dropdown({
      triggerEvent: event,
      header: { title: song.title, subtitle: song.artist ?? '' },
      groups: [
        [
          {
            action: 'add-fav',
            label: isFav ? 'Remove from Favorites' : 'Add to Favorites',
            iconHTML: PopupsManager.icons.heart(16, isFav),
            style: isFav ? 'color:rgb(var(--colorPink))' : '',
          },
          { action: 'add-playlist', label: 'Add to Playlist', iconHTML: PopupsManager.icons.playlistAdd(16) },
        ],
        [
          { action: 'copy-link', label: 'Copy link', iconHTML: PopupsManager.icons.link(16) },
          {
            action: 'offline-toggle',
            label: isCached ? 'Remove offline copy' : 'Cache for offline',
            iconHTML: PopupsManager.icons.checkBadge(16),
          },
        ],
        [
          {
            action: 'view-artist',
            label: 'View Artist',
            iconHTML: PopupsManager.icons.user(16),
            data: { artistId: song.artistId },
          },
          {
            action: 'view-album',
            label: 'View Album',
            iconHTML: PopupsManager.icons.album(16),
            data: { artistId: song.artistId, albumId: song.albumId },
          },
        ],
      ],
      itemExtraData: dataAttr,
      onAction: (action) => {
        if (action === 'add-fav') this.ui?.favorites?.toggleSong?.(song);
        else if (action === 'add-playlist') window.favoritesPlaylists?.addToPlaylistModal?.(song);
        else if (action === 'view-artist') this.ui?.navigate?.('artist', song.artistId ?? null);
        else if (action === 'view-album')
          this.ui?.navigate?.('artist', song.artistId ?? null, song.albumId ?? null);
        else if (action === 'copy-link') {
          const url = `${window.location.origin}/artist/${song.artistId}/album/${song.albumId}?song=${song.id}`;
          navigator.clipboard?.writeText(url).then(() =>
            this.toast({ message: 'Link copied to clipboard' }),
          );
        } else if (action === 'offline-toggle') {
          if (!window.offlineCache) return;
          if (window.offlineCache.isCached(song)) window.offlineCache.removeSong(song);
          else window.offlineCache.cacheSong(song);
        }
      },
    });
  }

  showArtistPopover(artistId: string, event: MouseEvent): PopupsPopover | null {
    const state = this.ui?.state;
    const artist = state?.getArtistById(artistId);
    if (!artist) return null;

    const albums = artist.albums?.length ?? 0;
    const listeners = artist.monthlyListeners ?? '24.5K';
    const topPlays = artist.topSong?.plays ?? '12.3K';

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
            <span class="popover-genre-badge">${PopupsManager._esc(artist.genre ?? 'Artist')}</span>
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
      </div>`;

    return this.popover({
      triggerEvent: event,
      variant: 'artist',
      size: 'artist',
      content,
      onAction: (action) => {
        if (typeof navigator.vibrate === 'function') navigator.vibrate(20);
        if (action === 'go-artist') this.ui?.navigate?.('artist', artistId);
        else if (action === 'play-top') {
          if (artist.albums?.length) {
            const queue = Utils.albumQueue(state!, artist.id, artist.albums[0]!.id);
            if (queue.length) this.ui?.audioPlayer?.playSong?.(queue[0], queue, true, 'album');
          }
        }
      },
    });
  }
}

/* ============================================================
   Base + Subclasses
   ============================================================ */

abstract class PopupsBase {
  protected manager: PopupsManager;
  protected options: Record<string, unknown> & {
    onClose?: (popup: PopupsBase) => void;
  };
  type = 'base';
  closable = true;
  el: HTMLElement | null = null;
  isOpen = false;
  destroyed = false;

  constructor(manager: PopupsManager, options: Record<string, unknown> = {}) {
    this.manager = manager;
    this.options = options as PopupsBase['options'];
  }

  protected abstract render(): HTMLElement;

  show(): void {
    if (this.destroyed) return;
    this.el = this.render();
    if (!this.el) return;
    this.manager['container'].appendChild(this.el);
    this.attachEvents();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => this.el?.classList.add('popups-open'));
  }

  hide(): void {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    if (typeof this.options.onClose === 'function') {
      try {
        this.options.onClose(this);
      } catch (e) {
        console.error(e);
      }
    }
    this.el?.classList.remove('popups-open');
    setTimeout(() => this.destroy(), 220);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.beforeDestroy?.();
    this.detachEvents?.();
    this.el?.parentNode?.removeChild(this.el);
    this.destroyed = true;
    this.manager.unregister(this);
    this.el = null;
  }

  protected attachEvents(): void {}
  protected detachEvents(): void {}
  protected beforeDestroy(): void {}
}

class PopupsModal extends PopupsBase {
  override type = 'modal';

  constructor(manager: PopupsManager, private opts: ModalOptions) {
    super(manager, opts as Record<string, unknown>);
    this.closable = opts.closable !== false;
  }

  protected override render(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'popups-overlay';
    overlay.setAttribute('role', 'presentation');

    const size = this.opts.size ?? 'md';
    const closable = this.closable;
    const actions = Array.isArray(this.opts.actions) ? this.opts.actions : [];

    const actionButtons = actions
      .map(
        (a, idx) =>
          `<button class="popups-btn popups-btn-${a.type ?? 'secondary'}" data-action="${PopupsManager._escAttr(
            a.action ?? String(idx),
          )}" type="button">${PopupsManager._esc(a.label ?? '')}</button>`,
      )
      .join('');

    overlay.innerHTML = `
      <div class="popups-modal popups-size-${size} popups-surface" role="dialog" aria-modal="true">
        ${
          this.opts.title
            ? `<div class="popups-modal-header"><h3 class="popups-modal-title">${PopupsManager._esc(
                this.opts.title,
              )}</h3>${
                closable
                  ? `<button class="popups-close-btn" data-action="close" aria-label="Close">${PopupsManager.icons.close(18)}</button>`
                  : ''
              }</div>`
            : closable
              ? `<button class="popups-close-btn popups-close-float" data-action="close" aria-label="Close">${PopupsManager.icons.close(
                  18,
                )}</button>`
              : ''
        }
        <div class="popups-modal-body"></div>
        ${actionButtons ? `<div class="popups-modal-footer">${actionButtons}</div>` : ''}
      </div>`;

    const body = overlay.querySelector<HTMLElement>('.popups-modal-body')!;
    const content = this.opts.content;
    if (content instanceof HTMLElement) body.appendChild(content);
    else if (content != null) body.innerHTML = String(content);

    return overlay;
  }

  protected override attachEvents(): void {
    this.el!.addEventListener('mousedown', this._backdropMouseDown);
    this.el!.addEventListener('click', this._onClick);
  }

  protected override detachEvents(): void {
    this.el?.removeEventListener('mousedown', this._backdropMouseDown);
    this.el?.removeEventListener('click', this._onClick);
  }

  private _backdropMouseDown = (e: MouseEvent) => {
    if (e.target === this.el) {
      e.preventDefault();
      this._bounce();
    }
  };

  private _onClick = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action!;
    if (action === 'close') {
      this.hide();
      return;
    }
    this.opts.onAction?.(action, this);
    if (this.opts.autoClose !== false) this.hide();
  };

  private _bounce(): void {
    const inner = this.el?.querySelector<HTMLElement>('.popups-modal, .popups-dialog');
    if (!inner) return;
    inner.classList.remove('popups-bounce');
    void inner.offsetWidth;
    inner.classList.add('popups-bounce');
    setTimeout(() => inner.classList.remove('popups-bounce'), 300);
  }
}

class PopupsDropdown extends PopupsBase {
  override type = 'dropdown';

  constructor(manager: PopupsManager, private opts: DropdownOptions) {
    super(manager, opts as unknown as Record<string, unknown>);
  }

  protected override render(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'song menu';
    el.setAttribute('role', 'menu');
    el.setAttribute('data-popup', 'dropdown');

    const header = this.opts.header;
    const groups = Array.isArray(this.opts.groups) ? this.opts.groups : [];
    const extras = this.opts.itemExtraData ?? (() => '');

    const html: string[] = [];
    if (header) {
      html.push(
        `<div class="header"><span class="title">${PopupsManager._esc(
          header.title ?? '',
        )}</span><span class="subtitle">${PopupsManager._esc(header.subtitle ?? '')}</span></div><div class="divider"></div>`,
      );
    }

    let groupIndex = 0;
    groups.forEach((group) => {
      if (!Array.isArray(group) || group.length === 0) return;
      if (groupIndex > 0) html.push('<div class="divider"></div>');
      groupIndex++;
      html.push('<div class="group">');
      group.forEach((item) => {
        const extra = typeof extras === 'function' ? extras(item.data) : extras;
        html.push(`
          <button class="option" data-action="${PopupsManager._escAttr(item.action)}" ${
            item.style ? `style="${PopupsManager._escAttr(item.style)}"` : ''
          } ${extra} type="button">
            ${item.iconHTML ? `<span class="icon">${item.iconHTML}</span>` : ''}
            <span class="label">${PopupsManager._esc(item.label ?? item.action)}</span>
          </button>`);
      });
      html.push('</div>');
    });

    el.innerHTML = html.join('');
    return el;
  }

  override show(): void {
    super.show();
    const e = this.opts.triggerEvent;
    if (e && typeof e.clientX === 'number') this.positionAt(e.clientX, e.clientY);
    else if (this.opts.rect) this.positionAtRect(this.opts.rect);
  }

  private positionAt(x: number, y: number): void {
    if (!this.el) return;
    const pad = 12;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    requestAnimationFrame(() => {
      if (!this.el) return;
      const rect = this.el.getBoundingClientRect();
      let left = x;
      let top = y;
      if (rect.right > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
      if (left < pad) left = pad;
      if (rect.bottom > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
      if (top < pad) top = pad;
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    });
  }

  private positionAtRect(rect: DOMRect): void {
    this.positionAt(rect.left, rect.bottom + 6);
  }

  protected override attachEvents(): void {
    this.el!.addEventListener('click', this._itemClick);
    setTimeout(() => {
      this._outsideClick = (e: MouseEvent) => {
        if (!this.el?.contains(e.target as Node)) this.hide();
      };
      document.addEventListener('click', this._outsideClick, { once: true });
    }, 0);
  }

  protected override detachEvents(): void {
    this.el?.removeEventListener('click', this._itemClick);
    if (this._outsideClick) {
      document.removeEventListener('click', this._outsideClick);
      this._outsideClick = null;
    }
  }

  private _outsideClick: ((e: MouseEvent) => void) | null = null;

  private _itemClick = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    e.stopPropagation();
    const action = btn.dataset.action!;
    const item = this._findItem(action);
    if (this.opts.onAction) this.opts.onAction(action, item);
    else if (item && typeof item.onClick === 'function') item.onClick(action, item);
    this.hide();
  };

  private _findItem(action: string): DropdownItem | null {
    for (const group of this.opts.groups ?? []) {
      for (const item of group) {
        if (String(item.action) === String(action)) return item;
      }
    }
    return null;
  }
}

class PopupsPopover extends PopupsBase {
  override type = 'popover';

  constructor(manager: PopupsManager, private opts: PopoverOptions) {
    super(manager, opts as unknown as Record<string, unknown>);
  }

  protected override render(): HTMLElement {
    const el = document.createElement('div');
    const size = this.opts.size ?? 'md';
    el.className = `popups-popover popups-popover-${size} popups-surface animate-popoverReveal`;
    el.setAttribute('data-popover', this.opts.variant ?? 'generic');
    el.innerHTML = `<div class="popups-popover-inner">${this.opts.content ?? ''}</div>`;
    return el;
  }

  override show(): void {
    super.show();
    const e = this.opts.triggerEvent;
    if (e && typeof e.clientX === 'number') this.positionAt(e.clientX, e.clientY);
    else if (this.opts.x != null && this.opts.y != null) this.positionAt(this.opts.x, this.opts.y);
  }

  private positionAt(x: number, y: number): void {
    if (!this.el) return;
    const pad = 20;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    requestAnimationFrame(() => {
      if (!this.el) return;
      const rect = this.el.getBoundingClientRect();
      let left = x;
      let top = y;
      if (rect.right > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
      if (left < pad) left = pad;
      if (rect.bottom > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
      if (top < pad) top = pad;
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    });
  }

  protected override attachEvents(): void {
    this.el!.addEventListener('click', this._onClick);
    setTimeout(() => {
      this._outsideClick = (e: MouseEvent) => {
        if (!this.el?.contains(e.target as Node)) this.hide();
      };
      window.addEventListener('click', this._outsideClick, { once: true });
    }, 10);
  }

  protected override detachEvents(): void {
    this.el?.removeEventListener('click', this._onClick);
    if (this._outsideClick) {
      window.removeEventListener('click', this._outsideClick);
      this._outsideClick = null;
    }
  }

  private _outsideClick: ((e: MouseEvent) => void) | null = null;

  private _onClick = (e: MouseEvent) => {
    e.stopPropagation();
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action!;
    this.opts.onAction?.(action, btn.dataset, this);
    if (!this.opts.persistentActions?.includes(action)) this.hide();
  };

  override hide(): void {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    if (typeof this.options.onClose === 'function') {
      try {
        this.options.onClose(this);
      } catch (e) {
        console.error(e);
      }
    }
    if (this.el) this.el.style.animation = 'popoverFadeOut 0.2s ease forwards';
    setTimeout(() => this.destroy(), 200);
  }
}

class PopupsTooltip extends PopupsBase {
  override type = 'tooltip';
  private target: HTMLElement;
  private text: string;

  constructor(manager: PopupsManager, options: { target: HTMLElement; text: string }) {
    super(manager, options);
    this.target = options.target;
    this.text = options.text;
  }

  protected override render(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'popups-tooltip';
    el.textContent = this.text;
    return el;
  }

  override show(): void {
    if (this.destroyed || !this.target?.isConnected) return;
    this.el = this.render();
    document.body.appendChild(this.el);
    this.position();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => this.el?.classList.add('popups-open'));
  }

  private position(): void {
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

  override hide(): void {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    this.el?.classList.remove('popups-open');
    setTimeout(() => this.destroy(), 160);
  }
}

class PopupsToast extends PopupsBase {
  override type = 'toast';
  private duration: number;
  private remaining: number;
  private paused = false;
  private dragStartX = 0;
  private dragging = false;
  private _fill: HTMLElement | null = null;
  private _raf = 0;
  private _lastTick = 0;

  constructor(manager: PopupsManager, options: ToastOptions) {
    super(manager, options as unknown as Record<string, unknown>);
    this.duration = Number(options.duration) || 5000;
    this.remaining = this.duration;
  }

  protected override render(): HTMLElement {
    const opts = this.options as unknown as ToastOptions;
    const type = ['info', 'success', 'warning', 'error'].includes(opts.type ?? '')
      ? (opts.type as 'info' | 'success' | 'warning' | 'error')
      : 'info';
    const iconMap: Record<string, (s?: number) => string> = {
      info: PopupsManager.icons.info,
      success: PopupsManager.icons.success,
      warning: PopupsManager.icons.warning,
      error: PopupsManager.icons.error,
    };
    const el = document.createElement('div');
    el.className = `popups-toast popups-toast-${type}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');

    const hasUndo = typeof opts.onUndo === 'function';

    el.innerHTML = `
      <div class="popups-toast-progress"><div class="popups-toast-progress-fill"></div></div>
      <button class="popups-toast-close" aria-label="Close">${PopupsManager.icons.close(14)}</button>
      <div class="popups-toast-icon">${iconMap[type]!(18)}</div>
      <div class="popups-toast-body">
        ${opts.title ? `<div class="popups-toast-title">${PopupsManager._esc(opts.title)}</div>` : ''}
        ${opts.message ? `<div class="popups-toast-message">${PopupsManager._esc(opts.message)}</div>` : ''}
      </div>
      ${hasUndo ? `<button class="popups-toast-undo" aria-label="Undo">${PopupsManager.icons.undo(14)}<span>Undo</span></button>` : ''}
    `;
    this._fill = el.querySelector('.popups-toast-progress-fill');
    return el;
  }

  override show(): void {
    if (this.destroyed) return;
    this.el = this.render();
    const container = this.manager['_ensureToastContainer']() as HTMLElement;
    container.insertBefore(this.el, container.firstChild);
    this.manager['_updateToastStack']();
    this.attachEvents();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => this.el?.classList.add('popups-open'));
    this._lastTick = performance.now();
    this._tick();
  }

  override hide(direction: 'left' | 'right' | null = null): void {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    cancelAnimationFrame(this._raf);
    if (!this.el) return;
    if (direction === 'left') this.el.classList.add('popups-toast-out-left');
    else if (direction === 'right') this.el.classList.add('popups-toast-out-right');
    else this.el.classList.add('popups-toast-fade-out');
    const opts = this.options as unknown as ToastOptions;
    if (typeof opts.onClose === 'function') {
      setTimeout(() => {
        try {
          opts.onClose!(this);
        } catch (e) {
          console.error(e);
        }
      }, 250);
    }
    setTimeout(() => {
      this.destroy();
      this.manager['_updateToastStack']();
    }, 350);
  }

  protected override attachEvents(): void {
    const closeBtn = this.el!.querySelector('.popups-toast-close');
    const undoBtn = this.el!.querySelector('.popups-toast-undo');
    closeBtn?.addEventListener('click', this._onClose);
    if (undoBtn) {
      this._onUndo = (e) => {
        e.stopPropagation();
        (this.options as unknown as ToastOptions).onUndo?.(this);
        this.hide();
      };
      undoBtn.addEventListener('click', this._onUndo);
    }
    this.el!.addEventListener('mouseenter', this._onEnter);
    this.el!.addEventListener('mouseleave', this._onLeave);
    this.el!.addEventListener('pointerdown', this._onPointerDown);
    this.el!.addEventListener('pointermove', this._onPointerMove);
    this.el!.addEventListener('pointerup', this._onPointerUp);
    this.el!.addEventListener('pointercancel', this._onPointerUp);
  }

  protected override detachEvents(): void {
    if (!this.el) return;
    const closeBtn = this.el.querySelector('.popups-toast-close');
    const undoBtn = this.el.querySelector('.popups-toast-undo');
    closeBtn?.removeEventListener('click', this._onClose);
    if (this._onUndo && undoBtn) undoBtn.removeEventListener('click', this._onUndo);
    this.el.removeEventListener('mouseenter', this._onEnter);
    this.el.removeEventListener('mouseleave', this._onLeave);
    this.el.removeEventListener('pointerdown', this._onPointerDown);
    this.el.removeEventListener('pointermove', this._onPointerMove);
    this.el.removeEventListener('pointerup', this._onPointerUp);
    this.el.removeEventListener('pointercancel', this._onPointerUp);
  }

  private _onClose = () => this.hide();
  private _onUndo: ((e: MouseEvent) => void) | null = null;
  private _onEnter = () => {
    this.paused = true;
  };
  private _onLeave = () => {
    this.paused = false;
    this._lastTick = performance.now();
  };
  private _onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.popups-toast-close, .popups-toast-undo')) return;
    this.dragging = true;
    this.dragStartX = e.clientX;
    this.el?.classList.add('popups-toast-dragging');
    if (this.el) this.el.style.transition = 'none';
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  private _onPointerMove = (e: PointerEvent) => {
    if (!this.dragging || !this.el) return;
    const dx = e.clientX - this.dragStartX;
    const scale = this._getStackScale();
    this.el.style.transform = `translate3d(${dx}px, 0, 0) scale(${scale})`;
  };
  private _onPointerUp = (e: PointerEvent) => {
    if (!this.dragging || !this.el) return;
    this.dragging = false;
    const dx = e.clientX - this.dragStartX;
    this.el.classList.remove('popups-toast-dragging');
    this.el.style.transition = '';
    this.el.style.transform = '';
    if (dx > 100) this.hide('right');
    else if (dx < -100) this.hide('left');
  };

  private _getStackScale(): number {
    const idx = Number(this.el?.getAttribute('data-stack-idx')) || 0;
    if (idx === 0) return 1;
    if (idx === 1) return 0.96;
    if (idx === 2) return 0.92;
    return 0.88;
  }

  private _tick(): void {
    if (this.destroyed || !this.isOpen) return;
    const now = performance.now();
    if (!this.paused) {
      const dt = now - this._lastTick;
      this.remaining -= dt;
      const pct = Math.max(0, (this.remaining / this.duration) * 100);
      if (this._fill) this._fill.style.width = `${pct}%`;
      if (this.remaining <= 0) {
        this.hide();
        return;
      }
    }
    this._lastTick = now;
    this._raf = requestAnimationFrame(() => this._tick());
  }
}





/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   F A V O R I T E S
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
export class HeartStore {
  private _localOverrides = new Map<string, boolean>();

  constructor(
    private fav: FavoritesPlaylistsManager,
    private state: PlayerState,
  ) {}

  private _key(type: string, id: string): string {
    return `${type}:${id}`;
  }

  is(type: HeartType, id: string): boolean {
    const override = this._localOverrides.get(this._key(type, id));
    if (override !== undefined) return override;
    const f = this.fav;
    switch (type) {
      case 'song':
        return f.isSong(id);
      case 'artist':
        return f.isArtist(id);
      case 'album':
        return f.isAlbum(id);
      case 'playlist':
        return f.isPlaylist(id);
      default:
        return false;
    }
  }

  setOverride(type: HeartType, id: string, value: boolean): void {
    this._localOverrides.set(this._key(type, id), value);
  }

  clearOverride(type: HeartType, id: string): void {
    this._localOverrides.delete(this._key(type, id));
  }

  async set(type: HeartType, id: string, value: boolean): Promise<void> {
    if (this.is(type, id) === value) return;
    this.clearOverride(type, id);
    const f = this.fav;
    switch (type) {
      case 'song': {
        const song = this.state.getSongById(id);
        if (song) await Promise.resolve(f.toggleSong(song));
        break;
      }
      case 'artist':
        await Promise.resolve(f.toggleArtist(id));
        break;
      case 'album':
        await Promise.resolve(f.toggleAlbum(id));
        break;
      case 'playlist':
        await Promise.resolve(f.togglePlaylist(id));
        break;
    }
  }
}

export class HeartButton {
  private isHovering = false;
  private phase: 'confirm' | 'error' | null = null;
  private _timer: number | null = null;

  constructor(
    public el: HTMLElement,
    public type: HeartType,
    public id: string,
    private manager: HeartButtonManager,
  ) {
    this.id = String(id);
    el.addEventListener('mouseenter', this._onEnter);
    el.addEventListener('mouseleave', this._onLeave);
    el.addEventListener('click', this._onClick);
    el.classList.add('heart-bound');
    this.render();
  }

  private _onEnter = () => {
    this.isHovering = true;
    this.render();
  };
  private _onLeave = () => {
    this.isHovering = false;
    this.render();
  };
  private _onClick = (e: MouseEvent) => {
    void this._handleClick(e);
  };

  private get liked(): boolean {
    return this.manager.store.is(this.type, this.id);
  }

  private _icon(): string {
    if (this.phase === 'error' || this.phase === 'confirm')
      return PopupsManager.icons.heart(20, true);
    if (this.liked)
      return this.isHovering ? PopupsManager.icons.heart(20, true) : PopupsManager.icons.heart(18, true);
    return this.isHovering ? PopupsManager.icons.heart(20, false) : PopupsManager.icons.heart(18, false);
  }

  render(): void {
    if (!this.el.isConnected) {
      this.destroy();
      return;
    }
    this.el.innerHTML = this._icon();
    const liked = this.liked;
    this.el.classList.toggle('favorited', liked);
    this.el.classList.toggle('is-favorite', liked);
    this.el.classList.toggle('heart-busy', this.phase !== null);
    this.el.setAttribute('aria-pressed', String(liked));
    this.el.setAttribute('title', liked ? 'Remove from favorites' : 'Add to favorites');
  }

  private async _handleClick(e: MouseEvent): Promise<void> {
    e.stopPropagation();
    e.preventDefault();
    if (this.phase === 'confirm' || this.phase === 'error') return;
    const wasLiked = this.liked;
    try {
      if (wasLiked) {
        await this.manager.store.set(this.type, this.id, false);
        this.phase = null;
        this.render();
      } else {
        this.phase = 'confirm';
        this.render();
        await this.manager.store.set(this.type, this.id, true);
        if (this._timer) window.clearTimeout(this._timer);
        this._timer = window.setTimeout(() => {
          this.phase = null;
          this.render();
        }, 3000);
      }
    } catch {
      this.manager.store.setOverride(this.type, this.id, wasLiked);
      this.phase = 'error';
      this.render();
      if (this._timer) window.clearTimeout(this._timer);
      this._timer = window.setTimeout(() => {
        this.phase = null;
        this.render();
      }, 4000);
    }
  }

  sync(): void {
    if (this.phase === 'confirm' || this.phase === 'error') return;
    this.render();
  }

  destroy(): void {
    if (this._timer) window.clearTimeout(this._timer);
    this._timer = null;
    this.el.removeEventListener('mouseenter', this._onEnter);
    this.el.removeEventListener('mouseleave', this._onLeave);
    this.el.removeEventListener('click', this._onClick);
    this.el.classList.remove('heart-bound');
    this.manager._instances.delete(this.el);
  }
}

export class HeartButtonManager {
  store: HeartStore;
  _instances = new Map<HTMLElement, HeartButton>();
  private _observer: MutationObserver;

  constructor(favoritesPlaylists: FavoritesPlaylistsManager, state: PlayerState) {
    this.store = new HeartStore(favoritesPlaylists, state);

    window.addEventListener('mybeats:favorites-changed', (e) => {
      const { type, id } = e.detail ?? {};
      if (type && id != null) this._syncEntity(type as HeartType, String(id));
      else this._syncAll();
    });

    this._observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) this.bindAll(node as HTMLElement);
        }
      }
    });

    const start = () => this._observer.observe(document.body, { childList: true, subtree: true });
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  }

  static describe(el: HTMLElement): { type: HeartType; id: string } | null {
    const d = el.dataset;
    if (d.heartType && d.heartId) return { type: d.heartType as HeartType, id: d.heartId };
    if (d.favSong) return { type: 'song', id: d.favSong };
    if (d.artistHeart) return { type: 'artist', id: d.artistHeart };
    if (d.heartPlaylist) return { type: 'playlist', id: d.heartPlaylist };
    if (d.action === 'toggle-favorite-album' && d.albumId) return { type: 'album', id: d.albumId };
    return null;
  }

  static get SELECTOR(): string {
    return [
      '[data-heart-type][data-heart-id]',
      '[data-fav-song]',
      '[data-artist-heart]',
      '[data-heart-playlist]',
      '[data-action="toggle-favorite-album"][data-album-id]',
    ].join(',');
  }

  bindAll(root: HTMLElement | Document = document): void {
    if (root instanceof HTMLElement && root.matches?.(HeartButtonManager.SELECTOR)) {
      this._bindOne(root);
    }
    const els = root.querySelectorAll<HTMLElement>(HeartButtonManager.SELECTOR);
    els.forEach((el) => this._bindOne(el));
  }

  private _bindOne(el: HTMLElement): void {
    const info = HeartButtonManager.describe(el);
    if (!info || info.id == null || info.id === '') return;
    const existing = this._instances.get(el);
    if (existing) {
      if (existing.type === info.type && existing.id === String(info.id)) {
        existing.sync();
        return;
      }
      existing.destroy();
    }
    this._instances.set(el, new HeartButton(el, info.type, info.id, this));
  }

  private _syncEntity(type: HeartType, id: string): void {
    for (const hb of this._instances.values()) {
      if (hb.type === type && hb.id === id) hb.sync();
    }
  }

  private _syncAll(): void {
    for (const hb of this._instances.values()) hb.sync();
  }

  async toggle(type: HeartType, id: string): Promise<void> {
    const sid = String(id);
    const next = !this.store.is(type, sid);
    await this.store.set(type, sid, next);
  }

  notify(type: HeartType, id: string): void {
    window.dispatchEvent(
      new CustomEvent('mybeats:favorites-changed', { detail: { type, id: String(id) } }),
    );
  }

  prune(): void {
    for (const hb of [...this._instances.values()]) {
      if (!hb.el.isConnected) hb.destroy();
    }
  }

  destroy(): void {
    this._observer.disconnect();
    for (const hb of [...this._instances.values()]) hb.destroy();
    this._instances.clear();
  }

  async set(type: HeartType, id: string, value: boolean): Promise<void> {
    await this.store.set(type, id, value);
    this.notify(type, id);
  }
}

/* ============================================================
   FavoritesPlaylistsManager
   ============================================================ */

export class FavoritesPlaylistsManager {
  constructor(public state: PlayerState) {}

  private get popups(): PopupsManager | null {
    return window.popups ?? null;
  }
  private get ui(): UILike | null {
    return window.uiManager ?? null;
  }

  private _toast(options: { message: string; type?: string; onUndo?: () => void }): void {
    this.popups?.toast({
      type: (options.type as ToastOptions['type']) ?? 'info',
      message: options.message,
      duration: 6000,
      onUndo: options.onUndo,
    });
  }

  isSong(id: string): boolean {
    return this.state.favoriteSongs.some((sid) => String(sid) === String(id));
  }

  toggleSong(song: Song): void {
    const id = String(song.id);
    const idx = this.state.favoriteSongs.findIndex((sid) => String(sid) === id);
    if (idx >= 0) {
      this.state.favoriteSongs.splice(idx, 1);
      this._toast({
        message: `Removed "${song.title}" from favorites`,
        onUndo: () => {
          if (!this.isSong(id)) {
            this.state.favoriteSongs.push(id);
            this.state.persist();
            this.ui?.render?.();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer?.();
          }
        },
      });
    } else {
      this.state.favoriteSongs.push(id);
      this._toast({
        message: `Added "${song.title}" to favorites`,
        onUndo: () => {
          const i = this.state.favoriteSongs.findIndex((sid) => String(sid) === id);
          if (i >= 0) {
            this.state.favoriteSongs.splice(i, 1);
            this.state.persist();
            this.ui?.render?.();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer?.();
          }
        },
      });
    }
    this.state.persist();
    if (this.state.isDrawerOpen) this.ui?.updateFullPlayer?.();
    window.dispatchEvent(
      new CustomEvent('mybeats:favorites-changed', { detail: { type: 'song', id } }),
    );
  }

  isArtist(id: string): boolean {
    return this.state.favoriteArtists.some((aid) => String(aid) === String(id));
  }

  toggleArtist(id: string): void {
    const sid = String(id);
    const idx = this.state.favoriteArtists.findIndex((aid) => String(aid) === sid);
    const artist = this.state.getArtistById(id);
    const name = artist?.artist ?? 'Artist';
    if (idx >= 0) {
      this.state.favoriteArtists.splice(idx, 1);
      this._toast({
        message: `Removed ${name} from favorite artists`,
        onUndo: () => {
          if (!this.isArtist(id)) {
            this.state.favoriteArtists.push(sid);
            this.state.persist();
            this.ui?.render?.();
          }
        },
      });
    } else {
      this.state.favoriteArtists.push(sid);
      this._toast({
        message: `Added ${name} to favorite artists`,
        onUndo: () => {
          const i = this.state.favoriteArtists.findIndex((aid) => String(aid) === sid);
          if (i >= 0) {
            this.state.favoriteArtists.splice(i, 1);
            this.state.persist();
            this.ui?.render?.();
          }
        },
      });
    }
    this.state.persist();
    window.dispatchEvent(
      new CustomEvent('mybeats:favorites-changed', { detail: { type: 'artist', id: sid } }),
    );
    this.ui?.render?.();
  }

  isAlbum(id: string): boolean {
    return this.state.favoriteAlbums.some((aid) => String(aid) === String(id));
  }

  toggleAlbum(id: string): void {
    const sid = String(id);
    const idx = this.state.favoriteAlbums.findIndex((aid) => String(aid) === sid);
    const album = this.state.getAlbumById(id);
    const name = album?.album ?? 'Album';
    if (idx >= 0) {
      this.state.favoriteAlbums.splice(idx, 1);
      this._toast({
        message: `Removed ${name} from favorite albums`,
        onUndo: () => {
          if (!this.isAlbum(id)) {
            this.state.favoriteAlbums.push(sid);
            this.state.persist();
            this.ui?.render?.();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer?.();
          }
        },
      });
    } else {
      this.state.favoriteAlbums.push(sid);
      this._toast({
        message: `Added ${name} to favorite albums`,
        onUndo: () => {
          const i = this.state.favoriteAlbums.findIndex((aid) => String(aid) === sid);
          if (i >= 0) {
            this.state.favoriteAlbums.splice(i, 1);
            this.state.persist();
            this.ui?.render?.();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer?.();
          }
        },
      });
    }
    this.state.persist();
    if (this.state.isDrawerOpen) this.ui?.updateFullPlayer?.();
    window.dispatchEvent(
      new CustomEvent('mybeats:favorites-changed', { detail: { type: 'album', id: sid } }),
    );
  }

  isPlaylist(id: string): boolean {
    return (this.state.favoritePlaylists ?? []).some((pid) => String(pid) === String(id));
  }

  togglePlaylist(id: string): void {
    const pid = String(id);
    this.state.favoritePlaylists = this.state.favoritePlaylists ?? [];
    const idx = this.state.favoritePlaylists.findIndex((x) => String(x) === pid);
    const pl = this.getPlaylist(pid);
    const name = pl?.name ?? 'Playlist';
    if (idx >= 0) {
      this.state.favoritePlaylists.splice(idx, 1);
      this._toast({
        message: `Removed ${name} from favorites`,
        onUndo: () => {
          if (!this.isPlaylist(pid)) {
            this.state.favoritePlaylists.push(pid);
            this.state.persist();
            this.ui?.render?.();
          }
        },
      });
    } else {
      this.state.favoritePlaylists.push(pid);
      this._toast({
        message: `Added ${name} to favorites`,
        onUndo: () => {
          const i = this.state.favoritePlaylists.findIndex((x) => String(x) === pid);
          if (i >= 0) {
            this.state.favoritePlaylists.splice(i, 1);
            this.state.persist();
            this.ui?.render?.();
          }
        },
      });
    }
    this.state.persist();
    window.dispatchEvent(
      new CustomEvent('mybeats:favorites-changed', { detail: { type: 'playlist', id: pid } }),
    );
  }

  getPlaylist(id: string): Playlist | undefined {
    return this.state.playlists.find((p) => String(p.id) === String(id));
  }

  createPlaylist({ name, description = '', tags = [] }: { name?: string; description?: string; tags?: string[] } = {}): Playlist {
    const playlist: Playlist = {
      id: Utils.newId('pl'),
      name: name || 'Unnamed Playlist',
      description,
      tags: Array.isArray(tags) ? tags : [],
      songs: [],
    };
    this.state.playlists.push(playlist);
    this.state.persist();
    return playlist;
  }

  renamePlaylist(id: string, newName: string): boolean {
    const pl = this.getPlaylist(id);
    if (!pl || !newName.trim()) return false;
    pl.name = newName.trim();
    this.state.persist();
    return true;
  }

  updateDesc(id: string, description: string): boolean {
    const pl = this.getPlaylist(id);
    if (!pl) return false;
    pl.description = description;
    this.state.persist();
    return true;
  }

  updateTags(id: string, tags: string[]): boolean {
    const pl = this.getPlaylist(id);
    if (!pl) return false;
    pl.tags = Array.isArray(tags) ? tags : [];
    this.state.persist();
    return true;
  }

  deletePlaylist(id: string): boolean {
    const pl = this.getPlaylist(id);
    if (!pl) return false;
    const name = pl.name;
    this.state.playlists = this.state.playlists.filter((p) => String(p.id) !== String(id));
    this.state.persist();
    this.popups?.toast({ type: 'success', message: `Playlist "${name}" deleted` });
    return true;
  }

  reorderSongs(id: string, newOrder: Array<string | number>): boolean {
    const pl = this.getPlaylist(id);
    if (!pl || !Array.isArray(newOrder)) return false;
    pl.songs = newOrder.map((sid) => String(sid));
    this.state.persist();
    return true;
  }

  removeSongFromPlaylist(playlistId: string, songId: string): boolean {
    const pl = this.getPlaylist(playlistId);
    if (!pl) return false;
    const sid = String(songId);
    const before = [...pl.songs];
    const song = this.state.getSongById(sid);
    pl.songs = pl.songs.filter((id) => String(id) !== sid);
    this.state.persist();
    if (song) {
      this._toast({
        message: `Removed "${song.title}" from ${pl.name}`,
        onUndo: () => {
          pl.songs = before;
          this.state.persist();
          if (
            this.state.currentPage === 'editPlaylist' &&
            this.state.editingPlaylistId === playlistId
          ) {
            this.ui?.render?.();
          }
        },
      });
    }
    return true;
  }

  addSongToPlaylist(playlistId: string, songId: string): boolean {
    const pl = this.getPlaylist(playlistId);
    const sid = String(songId);
    if (!pl || pl.songs.some((id) => String(id) === sid)) return false;
    const song = this.state.getSongById(sid);
    pl.songs.push(sid);
    this.state.persist();
    if (song) {
      this._toast({
        message: `Added "${song.title}" to ${pl.name}`,
        onUndo: () => {
          pl.songs = pl.songs.filter((id) => String(id) !== sid);
          this.state.persist();
          this.ui?.render?.();
        },
      });
    }
    return true;
  }

  openModal(): void {
    const popups = this.popups;
    if (!popups) return;
    const content = document.createElement('div');
    content.className = 'popups-playlist-list';
    content.innerHTML = this.state.playlists.length
      ? this.state.playlists
          .map(
            (pl) => `
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
        </div>`,
          )
          .join('')
      : `<p class="popups-empty">No playlists yet.</p>`;

    const modal = popups.modal({
      title: 'Your Playlists',
      size: 'md',
      content,
      closable: true,
      actions: [{ label: 'Create New Playlist', action: 'create', type: 'primary' }],
      onAction: (action) => {
        if (action === 'create') this.createNewPlaylist();
      },
    });

    content.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const id = btn.dataset.id!;
      const action = btn.dataset.action;
      if (action === 'view') {
        modal.hide();
        this.ui?.navigate?.('playlists');
        this.state.selectedPlaylistName = this.getPlaylist(id)?.name ?? null;
        this.ui?.render?.();
      } else if (action === 'edit') {
        modal.hide();
        this.editPlaylist(id);
      } else if (action === 'delete') {
        modal.hide();
        this._confirmDelete(id);
      }
    });
  }

  private _coverPreview(pl: Playlist, size = 40): string {
    const state = this.state;
    const songs = pl.songs
      .map((sid) => state.getSongById(sid))
      .filter((s): s is Song => !!s)
      .slice(0, 4);
    if (!songs.length) {
      return `<div class="popups-cover-empty" style="width:${size}px;height:${size}px">${this._playlistIcon(
        Math.round(size * 0.5),
      )}</div>`;
    }
    if (songs.length === 1) {
      return `<img src="${songs[0]!.coverUrl}" width="${size}" height="${size}" class="popups-cover-img">`;
    }
    return `
      <div class="popups-cover-mosaic" style="width:${size}px;height:${size}px">
        ${Array.from({ length: 4 })
          .map((_, i) =>
            songs[i]
              ? `<img src="${songs[i]!.coverUrl}" class="popups-cover-quarter">`
              : `<div class="popups-cover-quarter popups-cover-quarter-empty"></div>`,
          )
          .join('')}
      </div>`;
  }

  private _playlistIcon(size = 24): string {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l10 9-10 9-10-9 10-9z"/></svg>`;
  }

  private _confirmDelete(id: string): void {
    const pl = this.getPlaylist(id);
    if (!pl) return;
    this.popups?.dialog({
      title: 'Delete Playlist?',
      message: `Are you sure you want to delete "${pl.name}"? This cannot be undone.`,
      dangerous: true,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        this.deletePlaylist(id);
        if (this.state.selectedPlaylistName === pl.name) {
          this.state.selectedPlaylistName = null;
          this.state.selectedPlaylistId = null;
        }
        this.ui?.render?.();
      },
    });
  }

  createNewPlaylist(): void {
    const popups = this.popups;
    if (!popups) return;
    const wrap = document.createElement('div');
    wrap.className = 'popups-form';
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
        <div class="popups-tag-input-wrap">
          <input type="text" id="new-pl-tags" class="popups-input" placeholder="e.g. Chill, Workout, Focus" maxlength="20">
        </div>
        <div class="popups-tag-list" id="new-pl-tag-list"></div>
      </div>
    `;
    const tagInput = wrap.querySelector<HTMLInputElement>('#new-pl-tags')!;
    const tagList = wrap.querySelector<HTMLElement>('#new-pl-tag-list')!;
    const tags: string[] = [];
    const renderTags = () => {
      tagList.innerHTML = tags
        .map(
          (t) => `
        <span class="popups-tag-chip" data-tag="${Utils.esc(t)}">
          ${Utils.esc(t)}
          <button type="button" class="popups-tag-remove" data-tag="${Utils.esc(t)}">×</button>
        </span>`,
        )
        .join('');
    };
    tagInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const raw = tagInput.value.trim();
      if (!raw) return;
      const vals = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      vals.forEach((v) => {
        if (!tags.includes(v) && tags.length < 8) tags.push(v);
      });
      tagInput.value = '';
      renderTags();
    });
    tagList.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.popups-tag-remove');
      if (!btn) return;
      const t = btn.dataset.tag!;
      const i = tags.indexOf(t);
      if (i >= 0) tags.splice(i, 1);
      renderTags();
    });
    const nameInput = wrap.querySelector<HTMLInputElement>('#new-pl-name')!;
    const modal = popups.modal({
      title: 'Create Playlist',
      size: 'sm',
      content: wrap,
      closable: true,
      actions: [
        { label: 'Cancel', action: 'cancel', type: 'secondary' },
        { label: 'Create', action: 'create', type: 'primary' },
      ],
      onAction: (action) => {
        if (action !== 'create') return;
        const name = nameInput.value.trim();
        if (!name) {
          popups.toast({ type: 'warning', message: 'Please enter a playlist name' });
          return;
        }
        const description = wrap.querySelector<HTMLTextAreaElement>('#new-pl-desc')!.value.trim();
        this.createPlaylist({ name, description, tags: [...tags] });
        popups.toast({ type: 'success', message: `Playlist "${name}" created` });
        this.ui?.render?.();
        modal.hide();
      },
    });
    setTimeout(() => nameInput.focus(), 50);
  }

  editPlaylist(id: string): void {
    if (!this.ui) return;
    this.state.editingPlaylistId = id;
    this.state.selectedPlaylistName = this.getPlaylist(id)?.name ?? null;
    this.ui.navigate('editPlaylist');
    history.pushState(null, '', `/playlist/${id}/edit`);
  }

  addToPlaylistModal(song: Song): void {
    const popups = this.popups;
    if (!popups) return;
    if (!this.state.playlists.length) {
      popups.modal({
        title: 'Add to Playlist',
        size: 'sm',
        content: `<p class="popups-empty">You don't have any playlists yet.</p>`,
        actions: [{ label: 'Create Playlist', action: 'create', type: 'primary' }],
        onAction: (action) => {
          if (action === 'create') this.createNewPlaylist();
        },
      });
      return;
    }
    const content = document.createElement('div');
    content.className = 'popups-add-to-playlist';
    const songHeader = song
      ? `
      <div class="popups-song-context">
        <img src="${song.coverUrl || Config.DEFAULT_COVER}" class="popups-song-context-thumb" alt="">
        <div class="popups-song-context-info">
          <p class="popups-song-context-title">${Utils.esc(song.title)}</p>
          <p class="popups-song-context-sub">${Utils.esc(song.artist ?? '')}</p>
        </div>
      </div>`
      : '';
    const list = this.state.playlists
      .map(
        (pl) => `
      <button class="popups-playlist-row" data-action="add" data-id="${Utils.esc(pl.id)}">
        <div class="popups-playlist-cover">${this._coverPreview(pl, 44)}</div>
        <div class="popups-playlist-info">
          <p class="popups-playlist-name">${Utils.esc(pl.name)}</p>
          <p class="popups-playlist-meta">${pl.songs.length} songs</p>
        </div>
        ${
          pl.songs.some((sid) => String(sid) === String(song.id))
            ? `<span class="popups-in-list-badge">In playlist</span>`
            : ''
        }
      </button>`,
      )
      .join('');
    content.innerHTML = songHeader + `<div class="popups-playlist-list">${list}</div>`;
    const modal = popups.modal({
      title: 'Add to Playlist',
      size: 'sm',
      content,
      closable: true,
      actions: [{ label: 'Create New', action: 'create', type: 'secondary' }],
      onAction: (action) => {
        if (action === 'create') {
          modal.hide();
          this.createNewPlaylist();
        }
      },
    });
    content.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action="add"]');
      if (!btn) return;
      e.stopPropagation();
      const plId = btn.dataset.id!;
      const pl = this.getPlaylist(plId);
      if (!pl) return;
      if (pl.songs.some((sid) => String(sid) === String(song.id))) {
        popups.toast({ type: 'warning', message: `"${song.title}" is already in ${pl.name}` });
        return;
      }
      this.addSongToPlaylist(plId, song.id);
      modal.hide();
    });
  }
}



//////////  Globalizers  ( Ensured Availability )
window.PopupsManager = PopupsManager;
window.HeartButtonManager = HeartButtonManager;
window.FavoritesPlaylistsManager = FavoritesPlaylistsManager;
