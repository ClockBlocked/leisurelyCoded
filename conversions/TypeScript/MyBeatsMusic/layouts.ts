




import { Config, Utils, IdUtils, Icons } from 'https://mybeats.cloud/core/base.ts';
import type { PlayerState } from 'https://mybeats.cloud/core/player.ts';
import type { UIManager } from 'https://mybeats.cloud/core/builder.ts';
import type {
  Artist, Song, Playlist, Album,
  EnrichedAlbum, EnrichedArtistLite, GenreEntry,
  LibraryView, LibrarySort, LibraryMode, LibraryFilter,
  LibraryFilterType, FavoritesTab, HeartType, PageType,
} from 'https://mybeats.cloud/core/types.ts';



/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   H O M E —  P A G E
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
export class Home {
  ui: UIManager;
  RECENT_LIMIT = 15;
  MOST_PLAYED_LIMIT = 3;
  DISCOVER_ARTIST_LIMIT = 5;
  DISCOVER_SONGS_PER_ARTIST = 3;
  GENRE_LIMIT = 14;

  private _discoverIndex = 0;
  private _discoverCache: Array<{
    artistId: string;
    artistName: string;
    genre: string;
    imageUrl: string;
    songs: Song[];
  }> | null = null;
  private _focusedGenre: string | null = null;

  private static _liveBound = false;

  constructor(ui: UIManager) {
    this.ui = ui;
    this._bindLiveUpdates();
  }

  /* ---------- Data builders ---------- */

  buildSongs(state: PlayerState): Song[] {
    return state.enrichedLibrary.flatMap((artist) =>
      artist.albums.flatMap((album) =>
        album.songs.map((song) => ({
          ...song,
          artistId: artist.id,
          albumId: album.id,
          artist: artist.artist,
          album: album.album,
          coverUrl: album.coverUrl,
          artistImageUrl: artist.imageUrl,
          genre: artist.genre || '',
        })),
      ),
    );
  }

  buildAlbums(state: PlayerState): EnrichedAlbum[] {
    return state.enrichedLibrary.flatMap((a) =>
      a.albums.map((alb) => ({
        ...alb,
        artistId: a.id,
        artistName: a.artist,
        songCount: alb.songs.length,
        totalSeconds: 0,
        plays: 0,
      })),
    );
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }

  pickFeatured(state: PlayerState): EnrichedAlbum | null {
    const albums = this.buildAlbums(state).filter((a) => a.coverUrl);
    if (!albums.length) return null;
    return this.shuffle(albums)[0] ?? null;
  }

  getRecent(state: PlayerState): Song[] {
    return (state.recentlyPlayed || [])
      .slice(0, this.RECENT_LIMIT)
      .map((s) => state.getSongById(s.id) || s)
      .filter((s): s is Song => !!s);
  }

  getMostPlayed(state: PlayerState): Array<{ song: Song; plays: number }> {
    const songs = state.getMostPlayed(this.MOST_PLAYED_LIMIT);
    return songs.map((s) => ({ song: s, plays: state.getPlayCount(s.id) }));
  }

  getCounts(state: PlayerState): { songs: number; albums: number; artists: number; playlists: number } {
    return {
      songs: this.buildSongs(state).length,
      albums: this.buildAlbums(state).length,
      artists: state.enrichedLibrary.length,
      playlists: (state.playlists || []).length,
    };
  }

  getFavSummary(state: PlayerState): { songCount: number; albumCount: number; artistCount: number; coverUrl: string } {
    const songCount = (state.favoriteSongs || []).length;
    const albumCount = (state.favoriteAlbums || []).length;
    const artistCount = (state.favoriteArtists || []).length;
    let coverUrl = '';
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

  esc(text: unknown): string { return Utils.esc(text); }

  /* ---------- Icon helpers ---------- */

  private iconChevronLeft(size = 16): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  private iconChevronRight(size = 16): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  private iconShuffle(size = 16): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 5h2.2c1.1 0 2.1.55 2.7 1.47L10.1 10l2.2 3.53c.6.92 1.6 1.47 2.7 1.47H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 15h2.2c1.1 0 2.1-.55 2.7-1.47l.9-1.43" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.1 5H17M15.1 15H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14.4 3.4 16.6 5l-2.2 1.6M14.4 13.4 16.6 15l-2.2 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  private sectionIconDiscover(): string {
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><path d="M12.9 7.1 11.4 11.4 7.1 12.9 8.6 8.6z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  }

  private sectionIconCollections(): string {
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="6.5" width="11" height="11" rx="2.6" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><path d="M6 4.4h8.4A3.1 3.1 0 0 1 17.5 7.5V15" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  }

  private sectionIconGenres(): string {
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="11.1" y="2.5" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="2.5" y="11.1" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="11.1" y="11.1" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/></svg>`;
  }

  /* ---------- Discover ---------- */

  private _getDiscoverArtists(state: PlayerState): typeof this._discoverCache & Array<{
    artistId: string; artistName: string; genre: string; imageUrl: string; songs: Song[];
  }> {
    if (this._discoverCache && this._discoverCache.length) return this._discoverCache as never;

    let songs: Song[] = [];
    try { songs = this.buildSongs(state); } catch { songs = []; }

    const byArtist = new Map<string, Song[]>();
    songs.forEach((s) => {
      if (s == null || s.artistId == null) return;
      const key = String(s.artistId);
      if (!byArtist.has(key)) byArtist.set(key, []);
      byArtist.get(key)!.push(s);
    });

    const pool = [...byArtist.values()].filter((list) => list.length > 0);
    if (!pool.length) {
      this._discoverCache = [];
      return this._discoverCache as never;
    }

    const picked = this.shuffle(pool).slice(0, this.DISCOVER_ARTIST_LIMIT);
    this._discoverCache = picked.map((list) => {
      const first = list[0]!;
      const sample = this.shuffle(list).slice(0, this.DISCOVER_SONGS_PER_ARTIST);
      return {
        artistId: first.artistId!,
        artistName: first.artist || 'Unknown Artist',
        genre: first.genre || '',
        imageUrl: first.artistImageUrl || first.coverUrl || '',
        songs: sample,
      };
    });
    return this._discoverCache as never;
  }

  private discoverSongRow(s: Song, i: number): string {
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.esc(s.title || 'Unknown Title');
    return `
      <button type="button" class="discoverSong${isPlaying ? ' is-playing' : ''}" data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId ?? '')}" data-album-id="${this.esc(s.albumId ?? '')}" aria-label="Play ${title}">
        <span class="discoverSongIndex" aria-hidden="true">${i + 1}</span>
        <span class="discoverSongArt" aria-hidden="true"><img src="${this.esc(s.coverUrl || '')}" alt="" loading="lazy"></span>
        <span class="discoverSongInfo">
          <span class="discoverSongTitle">${title}</span>
          <span class="discoverSongAlbum">${this.esc(s.album || '')}</span>
        </span>
        <span class="discoverSongPlay" aria-hidden="true">${Icons.player.play(14)}</span>
      </button>`;
  }

  private discoverArtistCard(a: { artistId: string; artistName: string; genre: string; imageUrl: string; songs: Song[] }): string {
    const name = this.esc(a.artistName);
    return `
      <div class="discoverArtist" data-artist-id="${this.esc(a.artistId)}">
        <div class="discoverArtistHead">
          <div class="discoverArtistArt"><img src="${this.esc(a.imageUrl || '')}" alt="${name}" loading="lazy"></div>
          <div class="discoverArtistMeta">
            <span class="discoverArtistName">${name}</span>
            <span class="discoverArtistGenre">${this.esc(a.genre || 'Artist')}</span>
          </div>
          <button type="button" class="discoverArtistOpen" data-artist-open="${this.esc(a.artistId)}" aria-label="Open ${name}">${this.iconChevronRight(15)}</button>
        </div>
        <div class="discoverSongList">${a.songs.map((s, i) => this.discoverSongRow(s, i)).join('')}</div>
      </div>`;
  }

  private discoverNav(index: number, total: number): string {
    return `
      <div class="discoverNav">
        <button type="button" class="cardAction" data-discover-refresh aria-label="Shuffle discoveries">${this.iconShuffle(15)}</button>
        <span class="discoverCounter" data-discover-counter>${index + 1} / ${total}</span>
        <button type="button" class="cardAction" data-discover-prev aria-label="Previous artist" ${index <= 0 ? 'disabled' : ''}>${this.iconChevronLeft(16)}</button>
        <button type="button" class="cardAction" data-discover-next aria-label="Next artist" ${index >= total - 1 ? 'disabled' : ''}>${this.iconChevronRight(16)}</button>
      </div>`;
  }

  renderDiscover(state: PlayerState): string {
    const artists = this._getDiscoverArtists(state) as Array<{ artistId: string; artistName: string; genre: string; imageUrl: string; songs: Song[] }>;
    if (!artists.length) return '';
    let index = Number.isFinite(this._discoverIndex) ? this._discoverIndex : 0;
    index = Math.max(0, Math.min(artists.length - 1, index));
    this._discoverIndex = index;
    return `
      <article class="musicCard discoverCard" data-card="discover">
        ${this.sectionTitle({ icon: this.sectionIconDiscover(), title: 'Discover', notes: [this.musicNoteSvg(2)], action: this.discoverNav(index, artists.length) })}
        <div class="discoverViewport">
          <div class="discoverTrack" style="transform: translateX(-${index * 100}%)">${artists.map((a) => this.discoverArtistCard(a)).join('')}</div>
        </div>
      </article>`;
  }

  private _moveDiscover(delta: number): void {
    const artists = (this._discoverCache || []) as Array<unknown>;
    if (!artists.length) return;
    const current = Math.max(0, Math.min(artists.length - 1, this._discoverIndex || 0));
    const next = Math.max(0, Math.min(artists.length - 1, current + delta));
    if (next === current) return;
    this._discoverIndex = next;
    this._syncDiscover();
  }

  private _syncDiscover(): void {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const track = root.querySelector<HTMLElement>('.discoverTrack');
    if (!track) return;
    const total = track.children.length;
    if (!total) return;
    const index = Math.max(0, Math.min(total - 1, this._discoverIndex || 0));
    this._discoverIndex = index;
    track.style.transform = `translateX(-${index * 100}%)`;
    const prev = root.querySelector<HTMLButtonElement>('[data-discover-prev]');
    const next = root.querySelector<HTMLButtonElement>('[data-discover-next]');
    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = index >= total - 1;
    const counter = root.querySelector<HTMLElement>('[data-discover-counter]');
    if (counter) counter.textContent = `${index + 1} / ${total}`;
  }

  private _rebuildDiscoverCard(): void {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const card = root.querySelector<HTMLElement>('[data-card="discover"]');
    const html = this.renderDiscover(this.ui.state);
    if (!card) {
      if (!html) return;
      const grid = root.querySelector<HTMLElement>('.bentoGrid');
      if (!grid) return;
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      const fresh = tpl.content.firstElementChild;
      if (fresh) grid.appendChild(fresh);
      this._syncNowPlaying();
      return;
    }
    if (!html) { card.remove(); return; }
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    const fresh = tpl.content.firstElementChild;
    if (!fresh) return;
    card.replaceWith(fresh);
    this._syncNowPlaying();
  }

  /* ---------- Genres ---------- */

  buildGenres(state: PlayerState): GenreEntry[] {
    let songs: Song[] = [];
    try { songs = this.buildSongs(state); } catch { songs = []; }
    const map = new Map<string, GenreEntry>();
    songs.forEach((s) => {
      const name = (s.genre || '').trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, { name, count: 0, coverUrl: s.coverUrl || '' });
      const entry = map.get(name)!;
      entry.count += 1;
      if (!entry.coverUrl && s.coverUrl) entry.coverUrl = s.coverUrl;
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }

  private genreTile(g: GenreEntry): string {
    const name = this.esc(g.name);
    return `
      <button type="button" class="genreTile" data-genre="${name}" aria-label="Genre ${name}">
        <span class="genreTileArt" aria-hidden="true">${g.coverUrl ? `<img src="${this.esc(g.coverUrl)}" alt="" loading="lazy">` : ''}</span>
        <span class="genreTileBody">
          <span class="genreTileName">${name}</span>
          <span class="genreTileCount">${g.count} song${g.count === 1 ? '' : 's'}</span>
        </span>
      </button>`;
  }

  renderGenres(state: PlayerState): string {
    const genres = this.buildGenres(state).slice(0, this.GENRE_LIMIT);
    if (!genres.length) return '';
    const tiles = genres.map((g) => this.genreTile(g)).join('');
    return `
      <section class="homeGenres" aria-label="Browse by genre">
        ${this.sectionTitle({ icon: this.sectionIconGenres(), title: 'Genres', notes: [this.musicNoteSvg(2), this.musicNoteSvg(4)], action: this.actionButton('open-library', 'Open library') })}
        <div class="genreMarquee" data-genre-marquee>
          <div class="genreMarqueeTrack">${tiles}${tiles}</div>
        </div>
      </section>`;
  }

  private _syncGenreFocus(): void {
    const root = this._root();
    if (!root) return;
    const marquee = root.querySelector<HTMLElement>('[data-genre-marquee]');
    if (!marquee) return;
    const focused = this._focusedGenre;
    marquee.classList.toggle('has-focus', !!focused);
    marquee.querySelectorAll<HTMLElement>('.genreTile').forEach((tile) => {
      const isFocus = !!focused && tile.dataset.genre === focused;
      tile.classList.toggle('is-focused', isFocus);
      tile.setAttribute('aria-pressed', isFocus ? 'true' : 'false');
    });
  }

  private _clearGenreFocus(): void {
    if (!this._focusedGenre) return;
    this._focusedGenre = null;
    this._syncGenreFocus();
  }

  private _openGenre(name: string): void {
    if (!name) return;
    if (window.pagesActions?.openGenre) { window.pagesActions.openGenre(name); return; }
    if (window.pagesActions?.playGenre) { window.pagesActions.playGenre(name); return; }
    this.ui.navigate('library');
  }

  /* ---------- Collections ---------- */

  private collectionCard(pl: Playlist, _i: number, state: PlayerState): string {
    const songs = (pl.songs || [])
      .map((id) => state.getSongById(id))
      .filter((s): s is Song => !!s);
    const covers = songs.map((s) => s.coverUrl).filter((c): c is string => !!c);
    const uniqueCovers = [...new Set(covers)];
    let art = '';
    if (uniqueCovers.length >= 4) {
      art = `<div class="collectionMosaic">${uniqueCovers.slice(0, 4).map((c) => `<img src="${this.esc(c)}" alt="" loading="lazy">`).join('')}</div>`;
    } else if (uniqueCovers.length >= 1) {
      art = `<img src="${this.esc(uniqueCovers[0]!)}" alt="" loading="lazy">`;
    } else {
      art = `<div class="collectionEmpty">${Icons.general.playlistAdd(30)}</div>`;
    }
    const name = this.esc(pl.name);
    const count = songs.length;
    return `
      <div class="collection-card" data-playlist-id="${this.esc(pl.id)}" data-playlist-name="${name}" role="button" tabindex="0" aria-label="Open collection ${name}">
        <div class="imgBx">${art}</div>
        <div class="content">
          <div class="contentBx"><h3>${name}<br><span>${count} song${count === 1 ? '' : 's'}</span></h3></div>
          <ul class="sci">
            <li style="--i:1"><button type="button" class="icon-btn" data-playlist-play="${this.esc(pl.id)}" aria-label="Play collection">${Icons.player.play(18)}</button></li>
            <li style="--i:2"><button type="button" class="icon-btn" data-playlist-shuffle="${this.esc(pl.id)}" aria-label="Shuffle collection">${this.iconShuffle(18)}</button></li>
            <li style="--i:3"><button type="button" class="icon-btn" data-playlist-more="${this.esc(pl.id)}" aria-label="More options">${Icons.general.moreVert(18)}</button></li>
          </ul>
        </div>
      </div>`;
  }

  private collectionsInner(state: PlayerState): string {
    const playlists = (state.playlists || []).filter((p) => p && p.name);
    if (!playlists.length) return this.emptyNote('No collections yet — create a playlist and it will show up here.');
    return `<div class="collectionGrid">${playlists.map((pl, i) => this.collectionCard(pl, i, state)).join('')}</div>`;
  }

  renderCollections(state: PlayerState): string {
    return `
      <article class="musicCard collectionsCard" data-card="collections">
        ${this.sectionTitle({ icon: this.sectionIconCollections(), title: 'Collections', notes: [this.musicNoteSvg(4), this.musicNoteSvg(3)], action: this.actionButton('open-playlists', 'Open all collections') })}
        <div class="cardContent" id="homeCollectionsWrap">${this.collectionsInner(state)}</div>
      </article>`;
  }

  private _syncCollections(): void {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const wrap = root.querySelector<HTMLElement>('#homeCollectionsWrap');
    if (!wrap) return;
    wrap.innerHTML = this.collectionsInner(this.ui.state);
    wrap.classList.remove('hp-swap');
    void wrap.offsetWidth;
    wrap.classList.add('hp-swap');
  }

  /* ---------- Row renderers ---------- */

  songRow(s: Song): string {
    const isFav = this.ui.favorites.isSong(s.id);
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.esc(s.title || 'Unknown Title');
    return `
      <article class="song${isPlaying ? ' is-playing' : ''}" data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId ?? '')}" data-album-id="${this.esc(s.albumId ?? '')}">
        <div class="songArtwork">
          <img src="${this.esc(s.coverUrl || '')}" alt="${title}" loading="lazy">
          <button type="button" class="songArtworkOverlay" aria-label="Play ${title}" data-action="play">
            <span class="playIcon" aria-hidden="true">${Icons.player.play(13)}</span>
          </button>
        </div>
        <div class="songInformation">
          <span class="songArtist">${this.esc(s.artist || 'Unknown Artist')}</span>
          <span class="songTitle">${title}</span>
          <div class="songMeta">
            <span class="songAlbum">${this.esc(s.album || '')}</span>
            <span aria-hidden="true">&bull;</span>
            <span class="songDuration">${this.esc(s.duration || '')}</span>
          </div>
        </div>
        <div class="songActions">
          <button type="button" class="songAction favorite${isFav ? ' is-favorite favorited' : ''}" aria-label="Favorite song" data-fav-song="${this.esc(s.id)}">${this.ui.likeStatus('song', isFav, false, null)}</button>
          <button type="button" class="songAction" aria-label="More options" data-more-song="${this.esc(s.id)}">${Icons.general.moreVert(18)}</button>
        </div>
      </article>`;
  }

  rankRow(entry: { song: Song; plays: number }, index: number): string {
    const s = entry.song;
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.esc(s.title || 'Unknown Title');
    const plays = entry.plays;
    return `
      <article class="rankItem${isPlaying ? ' is-playing' : ''}" data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId ?? '')}" data-album-id="${this.esc(s.albumId ?? '')}">
        <span class="rankNumber">${String(index + 1).padStart(2, '0')}</span>
        <div class="rankArtwork"><img src="${this.esc(s.coverUrl || '')}" alt="${title}" loading="lazy"></div>
        <div class="rankInformation">
          <span class="rankTitle">${title}</span>
          <span class="rankSubtitle">${this.esc(s.artist || 'Unknown Artist')}</span>
        </div>
        <span class="rankCount">${plays} play${plays === 1 ? '' : 's'}</span>
      </article>`;
  }

  emptyNote(text: string): string {
    return `<div class="hp-empty">${this.esc(text)}</div>`;
  }

  /* ---------- Shared layout pieces ---------- */

  private renderHeader(): string {
    return `
      <header class="pageHeader">
        <div class="pageHeaderContent">
          <span class="pageKicker">Your Music</span>
          <h1 class="pageTitle">Music Library</h1>
          <p class="pageDescription">Pick up where you left off, discover new releases, and explore your music collection.</p>
        </div>
        <button type="button" class="headerAction" data-nav="library">View Library</button>
      </header>`;
  }

  sectionTitle({ icon, title, notes = [], action = '' }: { icon: string; title: string; notes?: string[]; action?: string }): string {
    return `
      <div class="section-title-wrap">
        <span class="section-title-icon" aria-hidden="true">${icon}</span>
        <h2 class="section-title">${title}</h2>
        ${notes.length ? `<div class="section-title-notes" aria-hidden="true">${notes.join('')}</div>` : ''}
        ${action}
      </div>`;
  }

  private actionButton(action: string, label: string): string {
    return `<button type="button" class="cardAction" aria-label="${label}" data-action="${action}">${Icons.general.arrowRight(16)}</button>`;
  }

  private musicNoteSvg(type: number): string {
    const color = 'rgba(190,140,255,0.85)';
    if (type === 1) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5"><circle cx="17.9922" cy="15.75" r="3"></circle><circle cx="5.99219" cy="17.75" r="3"></circle><path d="M8.99219 17.75V9.66559M8.99219 9.66559V8.77944C8.99219 7.26371 8.99219 6.50585 9.41578 5.9576C9.83937 5.40936 10.5669 5.22555 12.022 4.85793L16.022 3.84738C18.3099 3.26938 19.4538 2.98038 20.223 3.58727C20.859 4.08907 20.9691 4.99061 20.9882 6.63495M8.99219 9.66559L20.9882 6.63495M20.9922 15.7289V7.76889C20.9922 7.35623 20.9922 6.9793 20.9882 6.63495M20.9882 6.63495L20.9922 6.63394" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    if (type === 2) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5"><path d="M7 9.5C7 10.8807 5.88071 12 4.5 12C3.11929 12 2 10.8807 2 9.5C2 8.11929 3.11929 7 4.5 7C5.88071 7 7 8.11929 7 9.5ZM7 9.5V2C7.33333 2.5 7.6 4.6 10 5" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="10.5" cy="19.5" r="2.5"></circle><circle cx="20" cy="18" r="2"></circle><path d="M13 19.5L13 11C13 10.09 13 9.63502 13.2466 9.35248C13.4932 9.06993 13.9938 9.00163 14.9949 8.86504C18.0085 8.45385 20.2013 7.19797 21.3696 6.42937C21.6498 6.24509 21.7898 6.15295 21.8949 6.20961C22 6.26627 22 6.43179 22 6.76283V17.9259" stroke-linecap="round" stroke-linejoin="round"></path><path d="M13 13C17.8 13 21 10.6667 22 10" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    if (type === 3) return `<svg width="24" height="19" viewBox="0 0 24 19" fill="none"><line x1="6" y1="3" x2="6" y2="14.5" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/><line x1="18" y1="1" x2="18" y2="13.5" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/><line x1="6" y1="3" x2="18" y2="1" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="6.5" x2="18" y2="4.5" stroke="rgba(190,140,255,0.62)" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="3.4" cy="15" rx="3" ry="2" transform="rotate(-15 3.4 15)" fill="rgba(190,140,255,0.8)"/><ellipse cx="15.4" cy="14" rx="3" ry="2" transform="rotate(-15 15.4 14)" fill="rgba(190,140,255,0.8)"/></svg>`;
    if (type === 4) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.49219" cy="17" r="4"></circle><path d="M13.4922 17V3C13.4922 5.76142 15.7308 8 18.4922 8"></path></svg>`;
    return '';
  }

  /* ---------- Cards ---------- */

  private renderRecentlyPlayed(recent: Song[]): string {
    return `
      <article class="musicCard recentlyPlayed" data-card="recents">
        ${this.sectionTitle({ icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><polygon points="8.5,7 8.5,13.5 14.5,10.25" fill="rgba(190,140,255,0.82)"/></svg>`, title: 'Recently Played', notes: [this.musicNoteSvg(1), this.musicNoteSvg(2)], action: this.actionButton('view-recents', 'View recently played') })}
        <div class="cardContent">
          <div class="songList" id="recentSongs" aria-label="Recently played songs">
            ${recent.length ? recent.map((s) => this.songRow(s)).join('') : this.emptyNote('Nothing here yet — play a song and it will appear at the top of this list.')}
          </div>
        </div>
      </article>`;
  }

  private renderNewRelease(rel: EnrichedAlbum | null): string {
    if (!rel) return '';
    const playData = this.esc(JSON.stringify({ artistId: rel.artistId, albumId: rel.id }));
    return `
      <article class="musicCard releasesCard" data-card="releases" data-artist-id="${this.esc(rel.artistId)}" data-album-id="${this.esc(rel.id)}">
        ${this.sectionTitle({ icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><line x1="10" y1="6.5" x2="10" y2="13.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/><line x1="6.5" y1="10" x2="13.5" y2="10" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/></svg>`, title: 'New Release', notes: [this.musicNoteSvg(3)], action: this.actionButton('view-releases', 'View all releases') })}
        <div class="releaseFeature">
          <img class="releaseBackground" src="${this.esc(rel.coverUrl ?? '')}" alt="${this.esc(rel.album)}">
          <div class="releaseInfo">
            <span class="releaseLabel">Featured Album</span>
            <h3 class="releaseTitle">${this.esc(rel.album)}</h3>
            <p class="releaseArtist">${this.esc(rel.artistName)}</p>
            <div class="releaseControls">
              <button type="button" class="primaryPlay" aria-label="Play album" data-play-album='${playData}'>${Icons.player.play(18)}</button>
              <button type="button" class="secondaryControl" aria-label="Add album to queue" data-action="add-album-to-queue" data-album-id="${this.esc(rel.id)}">${Icons.general.plus(18)}</button>
              <button type="button" class="secondaryControl" aria-label="More album options" data-release-more data-artist-id="${this.esc(rel.artistId)}" data-album-id="${this.esc(rel.id)}">${Icons.general.moreVert(18)}</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  private renderMostPlayed(mostPlayed: Array<{ song: Song; plays: number }>): string {
    return `
      <article class="musicCard mostPlayed" data-card="most-played">
        ${this.sectionTitle({ icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 16.5 C10 16.5 3 11.5 3 7 C3 4.8 4.8 3 7 3 C8.5 3 9.7 3.9 10 5 C10.3 3.9 11.5 3 13 3 C15.2 3 17 4.8 17 7 C17 11.5 10 16.5 10 16.5Z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" fill="rgba(190,140,255,0.1)"/></svg>`, title: 'Most Played', notes: [this.musicNoteSvg(1)], action: this.actionButton('view-most-played', 'View most played') })}
        <div class="cardContent">
          <div class="rankList" id="mostPlayedSongs">
            ${mostPlayed.length ? mostPlayed.map((e, i) => this.rankRow(e, i)).join('') : this.emptyNote('Your most played songs will show up here once you start listening.')}
          </div>
        </div>
      </article>`;
  }

  private renderLibraryCard(counts: { songs: number; albums: number; artists: number; playlists: number }): string {
    const items = [
      { key: 'songs', label: 'Songs', count: counts.songs, icon: Icons.general.musicNote(18) },
      { key: 'albums', label: 'Albums', count: counts.albums, icon: Icons.general.album(18) },
      { key: 'artists', label: 'Artists', count: counts.artists, icon: Icons.general.artist(18) },
      { key: 'playlists', label: 'Playlists', count: counts.playlists, icon: Icons.general.playlistAdd(18) },
    ];
    return `
      <article class="musicCard libraryCard" data-card="library">
        ${this.sectionTitle({ icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><line x1="10" y1="6.5" x2="10" y2="13.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/><line x1="6.5" y1="10" x2="13.5" y2="10" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/></svg>`, title: 'Your Library', notes: [], action: this.actionButton('open-library', 'Open library') })}
        <div class="cardContent">
          <div class="libraryGrid">
            ${items.map((it) => `
              <button type="button" class="libraryItem" data-library="${it.key}">
                <span class="libraryIcon" aria-hidden="true">${it.icon}</span>
                <span class="libraryName">${it.label}</span>
                <span class="libraryCount">${it.count} ${it.label.toLowerCase()}</span>
              </button>`).join('')}
          </div>
        </div>
      </article>`;
  }

  private favoritesCardInner(): string {
    const f = this.getFavSummary(this.ui.state);
    const total = f.songCount + f.albumCount + f.artistCount;
    return `
      <div class="favoriteHero">
        ${f.coverUrl ? `<img class="favoriteArtwork" src="${this.esc(f.coverUrl)}" alt="Favorite album artwork">` : ''}
        <div class="favoriteInfo">
          <h3 class="favoriteTitle">Your Favorite Music</h3>
          <p class="favoriteSubtitle">
            ${total ? `${f.songCount} song${f.songCount === 1 ? '' : 's'} &bull; ${f.albumCount} album${f.albumCount === 1 ? '' : 's'} &bull; ${f.artistCount} artist${f.artistCount === 1 ? '' : 's'}` : 'Your most-loved songs and albums.'}
          </p>
        </div>
      </div>`;
  }

  private renderFavoritesCard(): string {
    return `
      <article class="musicCard favoritesCard" data-card="favorites">
        ${this.sectionTitle({ icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 16.5 C10 16.5 3 11.5 3 7 C3 4.8 4.8 3 7 3 C8.5 3 9.7 3.9 10 5 C10.3 3.9 11.5 3 13 3 C15.2 3 17 4.8 17 7 C17 11.5 10 16.5 10 16.5Z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" fill="rgba(190,140,255,0.1)"/></svg>`, title: 'Favorites', notes: [this.musicNoteSvg(4), this.musicNoteSvg(3)], action: this.actionButton('view-favorites', 'View favorites') })}
        <div class="favoriteContent" id="homeFavoritesCard">${this.favoritesCardInner()}</div>
      </article>`;
  }

  /* ---------- Page render ---------- */

  render(): string {
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
          <section class="bentoGrid" aria-label="Music dashboard">${cards.join('')}</section>
        </div>
      </div>`;
    this._bindWhenReady();
    return html;
  }

  /* ---------- Mount / binding ---------- */

  private _bindWhenReady(attempts = 0): void {
    const root = document.querySelector<HTMLElement>('[data-page="home"].hp');
    if (root) this.bindEvents(root);
    else if (attempts < 60) setTimeout(() => this._bindWhenReady(attempts + 1), 50);
  }

  private _root(): HTMLElement | null {
    return document.querySelector<HTMLElement>('[data-page="home"].hp');
  }

  bindEvents(root: HTMLElement): void {
    const rootAny = root as HTMLElement & {
      _homeCardFocusBound?: boolean;
      _homeDelegated?: boolean;
    };

    if (!rootAny._homeCardFocusBound) {
      rootAny._homeCardFocusBound = true;
      root.addEventListener('click', (e) => this._handleCardFocus(e), true);
      root.addEventListener('focusin', (e) => {
        const grid = root.querySelector<HTMLElement>('.bentoGrid');
        if (!grid) return;
        const card = (e.target as HTMLElement).closest<HTMLElement>('.musicCard[data-card]');
        if (!card || !grid.contains(card)) return;
        grid.querySelectorAll<HTMLElement>('.musicCard.is-card-focused').forEach((c) => c.classList.remove('is-card-focused'));
        card.classList.add('is-card-focused');
        grid.classList.add('has-card-focus');
      });
      document.addEventListener('click', (e) => {
        if (!root.isConnected) return;
        if (!root.contains(e.target as Node)) this._clearCardFocus();
      }, true);
    }

    if (rootAny._homeDelegated) return;
    rootAny._homeDelegated = true;

    root.addEventListener('click', (e) => {
      const ui = this.ui;
      const state = ui.state;

      if (this._focusedGenre && !(e.target as HTMLElement).closest('.genreTile[data-genre]')) {
        this._clearGenreFocus();
      }

      const target = e.target as HTMLElement;

      const overlay = target.closest<HTMLElement>('.songArtworkOverlay');
      if (overlay) {
        const row = overlay.closest<HTMLElement>('[data-song-id]');
        const song = row && state.getSongById(row.dataset.songId!);
        if (song) {
          e.stopPropagation();
          ui.audioPlayer.playSong(song, null, true, 'home');
        }
        return;
      }

      const moreBtn = target.closest<HTMLElement>('[data-more-song]');
      if (moreBtn) {
        e.stopPropagation();
        if (moreBtn.dataset.moreSong) ui.contentEvents.showSongMenu(moreBtn.dataset.moreSong, e);
        return;
      }

      const albumMore = target.closest<HTMLElement>('[data-album-more]');
      if (albumMore) {
        e.stopPropagation();
        window.contextMenu?.show(e.clientX, e.clientY, {
          artistId: albumMore.dataset.artistId,
          albumId: albumMore.dataset.albumId,
        });
        return;
      }

      const artistPlay = target.closest<HTMLElement>('[data-artist-play]');
      if (artistPlay) {
        e.stopPropagation();
        if (artistPlay.dataset.artistPlay) ui.libraryPage?.playArtist(artistPlay.dataset.artistPlay);
        return;
      }

      const artistOpen = target.closest<HTMLElement>('[data-artist-open]');
      if (artistOpen) {
        e.stopPropagation();
        if (artistOpen.dataset.artistOpen) ui.navigate('artist', artistOpen.dataset.artistOpen);
        return;
      }

      const dRefresh = target.closest<HTMLElement>('[data-discover-refresh]');
      if (dRefresh) {
        e.stopPropagation();
        this._discoverCache = null;
        this._discoverIndex = 0;
        this._rebuildDiscoverCard();
        return;
      }

      const dPrev = target.closest<HTMLButtonElement>('[data-discover-prev]');
      if (dPrev) {
        e.stopPropagation();
        if (!dPrev.disabled) this._moveDiscover(-1);
        return;
      }

      const dNext = target.closest<HTMLButtonElement>('[data-discover-next]');
      if (dNext) {
        e.stopPropagation();
        if (!dNext.disabled) this._moveDiscover(1);
        return;
      }

      const dSong = target.closest<HTMLElement>('.discoverSong[data-song-id]');
      if (dSong) {
        e.stopPropagation();
        const song = state.getSongById(dSong.dataset.songId!);
        if (song) ui.audioPlayer.playSong(song, null, true, 'home');
        return;
      }

      const genreTile = target.closest<HTMLElement>('.genreTile[data-genre]');
      if (genreTile) {
        e.stopPropagation();
        const name = genreTile.dataset.genre!;
        if (this._focusedGenre !== name) {
          this._focusedGenre = name;
          this._syncGenreFocus();
          return;
        }
        this._focusedGenre = null;
        this._syncGenreFocus();
        this._openGenre(name);
        return;
      }

      const releaseMore = target.closest<HTMLElement>('[data-release-more]');
      if (releaseMore) {
        e.stopPropagation();
        window.contextMenu?.show(e.clientX, e.clientY, {
          artistId: releaseMore.dataset.artistId,
          albumId: releaseMore.dataset.albumId,
        });
        return;
      }

      const plPlay = target.closest<HTMLElement>('[data-playlist-play]');
      if (plPlay) {
        e.stopPropagation();
        const id = plPlay.dataset.playlistPlay!;
        const pl = (state.playlists || []).find((p) => String(p.id) === String(id));
        const songs = pl ? (pl.songs || []).map((sid) => state.getSongById(sid)).filter((s): s is Song => !!s) : [];
        if (songs.length) ui.audioPlayer.playSong(songs[0]!, songs, true, 'home');
        return;
      }

      const plShuffle = target.closest<HTMLElement>('[data-playlist-shuffle]');
      if (plShuffle) {
        e.stopPropagation();
        const id = plShuffle.dataset.playlistShuffle!;
        const pl = (state.playlists || []).find((p) => String(p.id) === String(id));
        const songs = pl ? (pl.songs || []).map((sid) => state.getSongById(sid)).filter((s): s is Song => !!s) : [];
        const shuffled = this.shuffle(songs);
        if (shuffled.length) ui.audioPlayer.playSong(shuffled[0]!, shuffled, true, 'home');
        return;
      }

      const plMore = target.closest<HTMLElement>('[data-playlist-more]');
      if (plMore) {
        e.stopPropagation();
        const id = plMore.dataset.playlistMore!;
        if (typeof ui.openMoreMenu === 'function') ui.openMoreMenu(e, 'playlist', id);
        else if (typeof ui.playlistsPage?.showMenu === 'function') ui.playlistsPage.showMenu(e, id);
        else window.contextMenu?.show(e.clientX, e.clientY, { playlistId: id });
        return;
      }

      const navBtn = target.closest<HTMLElement>('[data-nav], .cardAction[data-action]');
      if (navBtn) {
        e.stopPropagation();
        const actionMap: Record<string, PageType> = {
          'view-recents': 'library',
          'view-releases': 'library',
          'view-most-played': 'library',
          'open-library': 'library',
          'view-favorites': 'favorites',
          'open-playlists': 'playlists',
        };
        const dest = (navBtn.dataset.nav as PageType | undefined) ?? actionMap[navBtn.dataset.action!];
        if (dest) ui.navigate(dest);
        return;
      }

      const libItem = target.closest<HTMLElement>('.libraryItem[data-library]');
      if (libItem) {
        e.stopPropagation();
        ui.navigate(libItem.dataset.library === 'playlists' ? 'playlists' : 'library');
        return;
      }

      if (target.closest('.favoriteContent')) {
        e.stopPropagation();
        ui.navigate('favorites');
        return;
      }

      const collCard = target.closest<HTMLElement>('.collection-card[data-playlist-name]');
      if (collCard) {
        if (target.closest('button')) return;
        e.stopPropagation();
        collCard.classList.add('active');
        const name = collCard.dataset.playlistName!;
        ui.navigate('playlists');
        setTimeout(() => {
          try { ui.playlistsPage?.viewPlaylist?.(name); } catch { /* noop */ }
        }, 60);
        return;
      }

      const row = target.closest<HTMLElement>('.song[data-song-id], .rankItem[data-song-id]');
      if (row) {
        if (target.closest('button')) return;
        e.stopPropagation();
        const song = state.getSongById(row.dataset.songId!);
        if (song) ui.audioPlayer.playSong(song, null, true, 'home');
        return;
      }
    });

    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const target = e.target as HTMLElement;
      const collCard = target.closest<HTMLElement>('.collection-card[data-playlist-name]');
      if (!collCard) return;
      if (target.closest('button')) return;
      e.preventDefault();
      e.stopPropagation();
      const name = collCard.dataset.playlistName!;
      this.ui.navigate('playlists');
      setTimeout(() => {
        try { this.ui.playlistsPage?.viewPlaylist?.(name); } catch { /* noop */ }
      }, 60);
    });
  }

  private _hydrateRow(row: HTMLElement): void {
    const songId = row.dataset.songId!;
    const heart = row.querySelector<HTMLElement>('[data-fav-song]');
    if (heart) this.ui.contentEvents.setupHeartButton(heart, 'song', heart.dataset.favSong!);
    const more = row.querySelector<HTMLElement>('[data-more-song]');
    if (more && !(more as HTMLElement & { _homeMoreBound?: boolean })._homeMoreBound) {
      (more as HTMLElement & { _homeMoreBound?: boolean })._homeMoreBound = true;
      more.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ui.contentEvents.showSongMenu(songId, e);
      });
    }
  }

  /* ---------- Live updates ---------- */

  private _bindLiveUpdates(): void {
    if (Home._liveBound) return;
    Home._liveBound = true;

    window.addEventListener('mybeats:recently-played', (e) => this._onRecentlyPlayed(e.detail.song));
    window.addEventListener('mybeats:playback-change', () => this._syncNowPlaying());
    window.addEventListener('mybeats:favorites-changed', () => this._syncFavorites());
    window.addEventListener('mybeats:play-counts', () => this._syncMostPlayed());
    window.addEventListener('mybeats:library-changed', () => {
      this._discoverCache = null;
      this._discoverIndex = 0;
      if (this._isActive()) this._rebuildDiscoverCard();
    });
    window.addEventListener('mybeats:playlists-changed', () => {
      if (this._isActive()) this._syncCollections();
    });
  }

  private _isActive(): boolean {
    return this.ui.state.currentPage === 'home' && !!this._root();
  }

  private _onRecentlyPlayed(song: Song | null | undefined): void {
    if (!song || !this._isActive()) return;
    const resolved = this.ui.state.getSongById(song.id) || song;
    const root = this._root();
    const list = root?.querySelector<HTMLElement>('#recentSongs');
    if (!list) return;

    list.querySelector('.hp-empty')?.remove();

    const sel = `.song[data-song-id="${String(resolved.id).replace(/"/g, '\\"')}"]`;
    const existing = list.querySelector<HTMLElement>(sel);
    const kids = [...list.querySelectorAll<HTMLElement>('.song')];
    const tops = new Map(kids.map((k) => [k, k.getBoundingClientRect().top]));

    const animateSiblings = () => {
      kids.forEach((k) => {
        const delta = (tops.get(k) ?? 0) - k.getBoundingClientRect().top;
        if (!delta) return;
        k.style.transition = 'none';
        k.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          k.style.transition = 'transform 350ms cubic-bezier(0.22, 1, 0.36, 1)';
          k.style.transform = '';
        });
      });
    };

    if (existing) {
      if (list.firstElementChild !== existing) {
        list.prepend(existing);
        animateSiblings();
      }
      existing.classList.remove('song-bump');
      void existing.offsetWidth;
      existing.classList.add('song-bump');
      setTimeout(() => existing.classList.remove('song-bump'), 900);
    } else {
      const tpl = document.createElement('template');
      tpl.innerHTML = this.songRow(resolved).trim();
      const row = tpl.content.firstElementChild as HTMLElement | null;
      if (!row) return;
      row.classList.add('song-enter');
      list.prepend(row);
      animateSiblings();
      this._hydrateRow(row);
      row.addEventListener('animationend', () => row.classList.remove('song-enter'), { once: true });
    }

    this._syncNowPlaying();

    const rows = [...list.querySelectorAll<HTMLElement>('.song')];
    rows.slice(this.RECENT_LIMIT).forEach((row) => {
      row.classList.add('song-exit');
      row.addEventListener('animationend', () => row.remove(), { once: true });
      setTimeout(() => row.remove(), 400);
    });
  }

  private _syncNowPlaying(): void {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const id = this.ui.state.currentSong?.id;
    root.querySelectorAll<HTMLElement>('.song.is-playing, .rankItem.is-playing, .discoverSong.is-playing').forEach((el) => el.classList.remove('is-playing'));
    if (id == null) return;
    const sel = `[data-song-id="${String(id).replace(/"/g, '\\"')}"]`;
    root.querySelectorAll<HTMLElement>(`.song${sel}, .rankItem${sel}, .discoverSong${sel}`).forEach((el) => el.classList.add('is-playing'));
  }

  private _syncFavorites(): void {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const card = root.querySelector<HTMLElement>('#homeFavoritesCard');
    if (!card) return;
    card.innerHTML = this.favoritesCardInner();
    card.classList.remove('hp-swap');
    void card.offsetWidth;
    card.classList.add('hp-swap');
  }

  private _syncMostPlayed(): void {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const list = root.querySelector<HTMLElement>('#mostPlayedSongs');
    if (!list) return;
    const entries = this.getMostPlayed(this.ui.state);
    list.innerHTML = entries.length
      ? entries.map((e, i) => this.rankRow(e, i)).join('')
      : this.emptyNote('Your most played songs will show up here once you start listening.');
    list.classList.remove('hp-swap');
    void list.offsetWidth;
    list.classList.add('hp-swap');
    this._syncNowPlaying();
  }

  /* ---------- Card focus ---------- */

  private _handleCardFocus(e: MouseEvent): void {
    const root = this._root();
    if (!root) return;
    const grid = root.querySelector<HTMLElement>('.bentoGrid');
    if (!grid) return;
    const card = (e.target as HTMLElement).closest<HTMLElement>('.musicCard[data-card]');
    if (!card || !grid.contains(card)) {
      this._clearCardFocus();
      return;
    }
    if (card.classList.contains('is-card-focused')) {
      this._clearCardFocus();
      return;
    }
    grid.querySelectorAll<HTMLElement>('.musicCard.is-card-focused').forEach((c) => c.classList.remove('is-card-focused'));
    card.classList.add('is-card-focused');
    grid.classList.add('has-card-focus');
  }

  private _clearCardFocus(): void {
    const root = this._root();
    if (!root) return;
    const grid = root.querySelector<HTMLElement>('.bentoGrid');
    if (!grid) return;
    grid.classList.remove('has-card-focus');
    grid.querySelectorAll<HTMLElement>('.musicCard.is-card-focused').forEach((c) => c.classList.remove('is-card-focused'));
  }
}





/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   L I B R A R Y  ( "Discover"  /  "My" Library )
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
export class Library {
  ui: UIManager;
  view: LibraryView = 'overview';
  filter: LibraryFilter = { type: 'all', value: null, label: '' };
  sort: LibrarySort = 'recent';
  mode: LibraryMode = 'grid';
  query = '';

  private _menuCloser: ((e: MouseEvent) => void) | null = null;

  constructor(ui: UIManager) { this.ui = ui; }

  allSongs(state: PlayerState): Song[] {
    return state.enrichedLibrary.flatMap((a) =>
      a.albums.flatMap((alb) =>
        alb.songs.map((s) => ({
          ...s,
          artistId: a.id,
          albumId: alb.id,
          artist: a.artist,
          album: alb.album,
          coverUrl: alb.coverUrl,
          genre: a.genre || '',
          year: alb.year || '',
        })),
      ),
    );
  }

  allAlbums(state: PlayerState): EnrichedAlbum[] {
    return state.enrichedLibrary.flatMap((a) =>
      a.albums.map((alb) => {
        const totalSeconds = alb.songs.reduce((sum, s) => {
          const p = String(s.duration || '0:0').split(':');
          return sum + (parseInt(p[0] || '0', 10) || 0) * 60 + (parseInt(p[1] || '0', 10) || 0);
        }, 0);
        const plays = alb.songs.reduce((sum, s) => sum + state.getPlayCount(s.id), 0);
        return {
          ...alb,
          artistId: a.id,
          artistName: a.artist,
          songCount: alb.songs.length,
          totalSeconds,
          plays,
        };
      }),
    );
  }

  allArtists(state: PlayerState): EnrichedArtistLite[] {
    return state.enrichedLibrary.map((a) => ({
      id: a.id,
      name: a.artist,
      imageUrl: a.imageUrl,
      genre: a.genre || '',
      albumCount: a.albums.length,
      songCount: a.albums.reduce((n, alb) => n + alb.songs.length, 0),
      plays: a.albums.reduce((n, alb) => n + alb.songs.reduce((m, s) => m + state.getPlayCount(s.id), 0), 0),
    }));
  }

  allGenres(state: PlayerState): GenreEntry[] {
    const map = new Map<string, number>();
    this.allSongs(state).forEach((s) => {
      if (!s.genre) return;
      map.set(s.genre, (map.get(s.genre) || 0) + 1);
    });
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  private minutes(totalSeconds: number): string {
    if (!totalSeconds) return '';
    const m = Math.round(totalSeconds / 60);
    return m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`;
  }

  esc(text: unknown): string { return Utils.esc(text == null ? '' : String(text)); }

  private pipeline<T extends { artistId?: string; id?: string; genre?: string; year?: string; title?: string; albumName?: string; name?: string; album?: string; artist?: string; artistName?: string }>(items: T[]): T[] {
    let out = [...items];
    const f = this.filter;
    if (f.type !== 'all' && f.value != null) {
      out = out.filter((it) => {
        if (f.type === 'artist') return String(it.artistId ?? it.id) === String(f.value);
        if (f.type === 'genre') return (it.genre || '').toLowerCase() === String(f.value).toLowerCase();
        if (f.type === 'year') return String(it.year || '') === String(f.value);
        if (f.type === 'decade') return it.year && Math.floor(Number(it.year) / 10) * 10 === Number(f.value);
        return true;
      });
    }
    if (this.query.trim()) {
      const q = this.query.trim().toLowerCase();
      out = out.filter((it) =>
        [it.title, it.albumName, it.name, it.album, it.artist, it.artistName, it.genre]
          .filter((t): t is string => !!t)
          .some((t) => String(t).toLowerCase().includes(q)),
      );
    }
    const sorters: Record<LibrarySort, ((a: T, b: T) => number) | undefined> = {
      recent: undefined,
      title: (a, b) => String(a.title ?? a.albumName ?? a.name ?? '').localeCompare(String(b.title ?? b.albumName ?? b.name ?? '')),
      artist: (a, b) => String(a.artist ?? a.artistName ?? a.name ?? '').localeCompare(String(b.artist ?? b.artistName ?? b.name ?? '')),
      yearDesc: (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0),
      yearAsc: (a, b) => (Number(a.year) || 0) - (Number(b.year) || 0),
      mostPlayed: (a, b) => ((b as unknown as { plays?: number }).plays || 0) - ((a as unknown as { plays?: number }).plays || 0),
    };
    const by = sorters[this.sort];
    if (by) out.sort(by);
    return out;
  }

  albumCard(alb: EnrichedAlbum): string {
    const isFav = this.ui.favorites.isAlbum(alb.id);
    const playData = this.esc(JSON.stringify({ artistId: alb.artistId, albumId: alb.id }));
    const meta = [`${alb.songCount} song${alb.songCount === 1 ? '' : 's'}`, this.minutes(alb.totalSeconds), alb.plays ? `${alb.plays} play${alb.plays === 1 ? '' : 's'}` : ''].filter(Boolean).join(' • ');
    return `
      <article class="albumCard" data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.id)}" tabindex="0" aria-label="${this.esc(alb.album)}">
        <div class="albumArtwork">
          <img src="${this.esc(alb.coverUrl || '')}" alt="${this.esc(alb.album)}" loading="lazy">
          <button class="albumPlay" type="button" aria-label="Play ${this.esc(alb.album)}" data-play-album='${playData}'>${Icons.player.play(16)}</button>
          <div class="albumHover">
            <div class="albumHoverTop">${alb.year ? `<span class="albumBadge">${this.esc(alb.year)}</span>` : ''}${alb.genre ? `<span class="albumBadge albumBadgeGenre">${this.esc(alb.genre)}</span>` : ''}</div>
            <div class="albumHoverBody">
              <h3 class="albumHoverTitle">${this.esc(alb.album)}</h3>
              <p class="albumHoverArtist">${this.esc(alb.artistName)}</p>
              <p class="albumHoverMeta">${meta}</p>
            </div>
            <div class="albumHoverActions">
              <button type="button" class="albumHoverPlay" data-play-album='${playData}'>${Icons.player.play(13)} Play</button>
              <button type="button" class="albumHoverBtn${isFav ? ' favorited' : ''}" aria-label="Favorite album" data-action="toggle-favorite-album" data-album-id="${this.esc(alb.id)}"><i class="fa-solid fa-heart ${isFav ? 'liked-icon' : 'not-liked-icon'}"></i></button>
              <button type="button" class="albumHoverBtn" aria-label="Add to queue" data-action="add-album-to-queue" data-album-id="${this.esc(alb.id)}">${Icons.general.plus(16)}</button>
              <button type="button" class="albumHoverBtn" aria-label="More options" data-album-more data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.id)}">${Icons.general.moreVert(16)}</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  private albumRow(alb: EnrichedAlbum): string {
    return `
      <div class="rowItem" data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.id)}">
        <div class="rowArtwork"><img src="${this.esc(alb.coverUrl || '')}" alt="" loading="lazy"></div>
        <span class="rowPrimary">${this.esc(alb.album)}</span>
        <span class="rowSecondary">${this.esc(alb.artistName)}</span>
        <span class="rowMeta">${alb.year ? this.esc(alb.year) + ' • ' : ''}${alb.songCount} songs</span>
        <div class="rowActions">
          <button type="button" class="tableAction" aria-label="Play" data-play-album='${this.esc(JSON.stringify({ artistId: alb.artistId, albumId: alb.id }))}'>${Icons.player.play(14)}</button>
          <button type="button" class="tableAction" aria-label="More options" data-album-more data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.id)}">${Icons.general.moreVert(16)}</button>
        </div>
      </div>`;
  }

  artistCard(a: EnrichedArtistLite): string {
    return `
      <article class="artistCard" data-artist-id="${this.esc(a.id)}">
        <div class="artistPortrait"><img src="${this.esc(a.imageUrl || '')}" alt="${this.esc(a.name)}" loading="lazy"></div>
        <div class="artistInfo">
          <span class="artistName">${this.esc(a.name)}</span>
          <p class="artistDetails">${a.albumCount} album${a.albumCount === 1 ? '' : 's'} • ${a.songCount} song${a.songCount === 1 ? '' : 's'}</p>
          <div class="artistActions">
            <button type="button" class="artistButton primary" data-artist-open="${this.esc(a.id)}">View Artist</button>
            <button type="button" class="artistButton" data-artist-play="${this.esc(a.id)}">Play</button>
          </div>
        </div>
      </article>`;
  }

  private artistRow(a: EnrichedArtistLite): string {
    return `
      <div class="rowItem" data-artist-id="${this.esc(a.id)}">
        <div class="rowArtwork round"><img src="${this.esc(a.imageUrl || '')}" alt="" loading="lazy"></div>
        <span class="rowPrimary">${this.esc(a.name)}</span>
        <span class="rowSecondary">${this.esc(a.genre || 'Artist')}</span>
        <span class="rowMeta">${a.albumCount} albums • ${a.songCount} songs</span>
        <div class="rowActions">
          <button type="button" class="tableAction" aria-label="Play artist" data-artist-play="${this.esc(a.id)}">${Icons.player.play(14)}</button>
          <button type="button" class="tableAction" aria-label="View artist" data-artist-open="${this.esc(a.id)}">${Icons.general.arrowRight(14)}</button>
        </div>
      </div>`;
  }

  playlistCard(pl: Playlist, state: PlayerState): string {
    const covers = pl.songs.map((id) => state.getSongById(id)).filter((s): s is Song => !!s).map((s) => s.coverUrl).filter((c): c is string => !!c);
    const isPlFav = this.ui.favorites.isPlaylist(pl.id);
    return `
      <article class="playlistCard" data-playlist-id="${this.esc(pl.id)}">
        <button type="button" class="heart playlistCardHeart${isPlFav ? ' favorited is-favorite' : ''}" data-heart-playlist="${this.esc(pl.id)}" aria-label="Favorite playlist"></button>
        <div class="playlistMosaic">
          ${covers.slice(0, 4).map((c) => `<img src="${this.esc(c)}" alt="" loading="lazy">`).join('') || `<div class="playlistMosaicEmpty">${Icons.general.playlist(28)}</div>`}
        </div>
        <div class="playlistInformation">
          <span class="playlistType">Playlist</span>
          <h3 class="playlistName">${this.esc(pl.name)}</h3>
          ${pl.description ? `<p class="playlistDescription">${this.esc(pl.description)}</p>` : ''}
          <span class="playlistCount">${pl.songs.length} song${pl.songs.length === 1 ? '' : 's'}</span>
        </div>
      </article>`;
  }

  genreCard(g: GenreEntry): string {
    return `
      <article class="genreCard" data-genre="${this.esc(g.name)}">
        <h3 class="genreName">${this.esc(g.name)}</h3>
        <p class="genreCount">${g.count} song${g.count === 1 ? '' : 's'}</p>
      </article>`;
  }

  private songRow(s: Song, i: number, _queue: Song[]): string {
    const isFav = this.ui.favorites.isSong(s.id);
    return `
      <tr data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId || '')}" data-album-id="${this.esc(s.albumId || '')}" data-context='${this.esc(JSON.stringify({ artistId: s.artistId, albumId: s.albumId }))}'>
        <td class="tableNum">${i + 1}</td>
        <td>
          <div class="tableSong">
            <div class="tableArtwork"><img src="${this.esc(s.coverUrl || '')}" alt="" loading="lazy"></div>
            <div class="tableSongInformation">
              <span class="tableSongTitle">${this.esc(s.title)}</span>
              <span class="tableSongArtist">${this.esc(s.artist || '')}</span>
            </div>
          </div>
        </td>
        <td>${this.esc(s.album || '')}</td>
        <td>${this.esc(s.year || '—')}</td>
        <td>${this.esc(s.duration || '')}</td>
        <td>
          <div class="rowActions">
            <button type="button" class="tableAction heart${isFav ? ' favorited is-favorite' : ''}" aria-label="Favorite" data-fav-song="${this.esc(s.id)}">${this.ui.likeStatus('song', isFav, false, null)}</button>
            <button type="button" class="tableAction" aria-label="More options" data-more-song="${this.esc(s.id)}">${Icons.general.moreVert(16)}</button>
          </div>
        </td>
      </tr>`;
  }

  private emptyState(title: string, desc: string): string {
    return `
      <div class="emptyState">
        <div class="emptyIcon">${Icons.general.search(34)}</div>
        <h3 class="emptyTitle">${this.esc(title)}</h3>
        <p class="emptyDescription">${this.esc(desc)}</p>
      </div>`;
  }

  private sectionHead(title: string, sub: string): string {
    return `
      <div class="resultsHeader">
        <div>
          <h2 class="resultsTitle">${this.esc(title)}</h2>
          <p class="resultsSubtitle">${this.esc(sub)}</p>
        </div>
      </div>`;
  }

  private contentFor(view: LibraryView): string {
    const state = this.ui.state;
    if (view === 'songs') {
      const songs = this.pipeline(this.allSongs(state));
      if (!songs.length) return this.emptyState('No songs match', 'Try clearing your search or filters.');
      return `
        <div class="songTableWrapper">
          <table class="songTable">
            <thead><tr><th>#</th><th>Title</th><th>Album</th><th>Year</th><th>Time</th><th></th></tr></thead>
            <tbody>${songs.map((s, i) => this.songRow(s, i, songs)).join('')}</tbody>
          </table>
        </div>`;
    }
    if (view === 'albums') {
      const albums = this.pipeline(this.allAlbums(state));
      if (!albums.length) return this.emptyState('No albums match', 'Try clearing your search or filters.');
      return this.mode === 'grid'
        ? `<div class="albumGrid">${albums.map((a) => this.albumCard(a)).join('')}</div>`
        : `<div class="rowsList">${albums.map((a) => this.albumRow(a)).join('')}</div>`;
    }
    if (view === 'artists') {
      const artists = this.pipeline(this.allArtists(state));
      if (!artists.length) return this.emptyState('No artists match', 'Try clearing your search or filters.');
      return this.mode === 'grid'
        ? `<div class="artistGrid">${artists.map((a) => this.artistCard(a)).join('')}</div>`
        : `<div class="rowsList">${artists.map((a) => this.artistRow(a)).join('')}</div>`;
    }
    if (view === 'playlists') {
      const pls = (state.playlists || []).filter((pl) => !this.query.trim() || pl.name.toLowerCase().includes(this.query.trim().toLowerCase()));
      if (!pls.length) return this.emptyState('No playlists yet', 'Create a playlist and it will show up here.');
      return `<div class="playlistGrid">${pls.map((pl) => this.playlistCard(pl, state)).join('')}</div>`;
    }
    if (view === 'genres') {
      const genres = this.pipeline(this.allGenres(state));
      if (!genres.length) return this.emptyState('No genres found', 'Your library genres will appear here.');
      return `<div class="genreGrid">${genres.map((g) => this.genreCard(g)).join('')}</div>`;
    }
    const albums = this.allAlbums(state);
    const recentAlbums = this.pipeline([...albums].reverse()).slice(0, 10);
    const artists = this.pipeline(this.allArtists(state)).sort((a, b) => b.songCount - a.songCount).slice(0, 5);
    const playlists = (state.playlists || []).slice(0, 3);
    const genres = this.allGenres(state).slice(0, 8);
    return `
      ${recentAlbums.length ? `<section>${this.sectionHead('Recently Added', 'New additions to your collection.')}<div class="albumGrid">${recentAlbums.map((a) => this.albumCard(a)).join('')}</div></section>` : ''}
      ${artists.length ? `<section style="margin-top: 3rem">${this.sectionHead('Popular Artists', 'Artists with the most music in your collection.')}<div class="artistGrid">${artists.map((a) => this.artistCard(a)).join('')}</div></section>` : ''}
      ${playlists.length ? `<section style="margin-top: 3rem">${this.sectionHead('Explore Playlists', 'Curated collections ready to explore.')}<div class="playlistGrid">${playlists.map((pl) => this.playlistCard(pl, state)).join('')}</div></section>` : ''}
      ${genres.length ? `<section style="margin-top: 3rem">${this.sectionHead('Browse by Genre', 'Find something based on the mood.')}<div class="genreGrid">${genres.map((g) => this.genreCard(g)).join('')}</div></section>` : ''}`;
  }

  private countFor(view: LibraryView): string {
    const state = this.ui.state;
    const fmt = (n: number) => `${n.toLocaleString()} item${n === 1 ? '' : 's'}`;
    switch (view) {
      case 'songs': return fmt(this.pipeline(this.allSongs(state)).length);
      case 'albums': return fmt(this.pipeline(this.allAlbums(state)).length);
      case 'artists': return fmt(this.pipeline(this.allArtists(state)).length);
      case 'playlists': return fmt((state.playlists || []).length);
      case 'genres': return fmt(this.pipeline(this.allGenres(state)).length);
      default: {
        const total = this.allAlbums(state).length + this.allArtists(state).length + (state.playlists || []).length + this.allGenres(state).length;
        return fmt(total);
      }
    }
  }

  private viewMeta(view: LibraryView): [string, string] {
    const map: Record<LibraryView, [string, string]> = {
      overview: ['Explore Your Collection', 'A curated overview of your music.'],
      songs: ['All Songs', 'Every track in your library.'],
      albums: ['All Albums', 'Hover an album for the full story.'],
      artists: ['All Artists', 'The people behind your music.'],
      playlists: ['All Playlists', 'Your curated collections.'],
      genres: ['All Genres', 'Browse by mood and style.'],
    };
    return map[view] ?? ['', ''];
  }

  private sortLabel(): string {
    const map: Record<LibrarySort, string> = {
      recent: 'Recently Added',
      title: 'Title A–Z',
      artist: 'Artist A–Z',
      yearDesc: 'Newest First',
      yearAsc: 'Oldest First',
      mostPlayed: 'Most Played',
    };
    return map[this.sort];
  }

  render(): string {
    const tabs: Array<[LibraryView, string]> = [
      ['overview', 'Overview'], ['songs', 'Songs'], ['albums', 'Albums'],
      ['artists', 'Artists'], ['playlists', 'Playlists'], ['genres', 'Genres'],
    ];
    const f = this.filter;
    const filterBtn = (type: LibraryFilterType, label: string) => {
      const active = f.type === type;
      return `
        <button type="button" class="filterButton${active ? ' has-filter is-active' : ''}" data-filter="${type}">
          ${active ? this.esc(f.label) : label}
          <span class="filterArrow">${Icons.general.chevronDown()}</span>
        </button>`;
    };
    const [title, sub] = this.viewMeta(this.view);
    const html = `
      <div data-page="library" class="bp browsePage">
        <div class="browseContainer">
          <header class="browseHeader">
            <div>
              <span class="browseKicker">Explore</span>
              <h1 class="browseTitle">Browse Music</h1>
              <p class="browseDescription">Explore songs, albums, artists, playlists, genres, and everything else in your music collection.</p>
            </div>
            <div class="searchWrapper">
              <span class="searchIcon" aria-hidden="true">${Icons.general.search(16)}</span>
              <input type="search" class="librarySearch" id="librarySearch" placeholder="Search songs, artists, albums, playlists..." autocomplete="off" value="${this.esc(this.query)}">
            </div>
            <nav class="browseNavigation" aria-label="Browse categories">
              ${tabs.map(([key, label]) => `<button class="browseTab${this.view === key ? ' is-active' : ''}" type="button" data-view="${key}">${label}</button>`).join('')}
            </nav>
            <div class="filterToolbar">
              <div class="filterGroup">
                <button type="button" class="filterButton${f.type === 'all' ? ' is-active' : ''}" data-filter="all">All</button>
                ${filterBtn('artist', 'Artist')}
                ${filterBtn('genre', 'Genre')}
                ${filterBtn('year', 'Year')}
                ${filterBtn('decade', 'Decade')}
              </div>
              <div class="displayControls">
                <button type="button" class="sortButton" data-action="sort">${this.sortLabel()}<span>${Icons.general.chevronDown()}</span></button>
                <div class="viewToggle" aria-label="Display mode">
                  <button type="button" class="viewButton${this.mode === 'grid' ? ' is-active' : ''}" aria-label="Grid view" data-view-mode="grid">${Icons.general.grid(15)}</button>
                  <button type="button" class="viewButton${this.mode === 'list' ? ' is-active' : ''}" aria-label="List view" data-view-mode="list">${Icons.general.list(15)}</button>
                </div>
              </div>
            </div>
          </header>
          <div class="resultsHeader" id="browseResultsHeader">
            <div>
              <h2 class="resultsTitle">${title}</h2>
              <p class="resultsSubtitle">${sub}</p>
            </div>
            <span class="resultsCount" id="browseResultsCount">${this.countFor(this.view)}</span>
          </div>
          <section class="dynamicContent" id="browseContent" aria-live="polite">
            <div class="loadingLayer is-hidden" id="loadingLayer" aria-hidden="true">
              <div class="loadingContent">
                <div class="loadingSpinner" aria-hidden="true"></div>
                <div>
                  <div class="loadingTitle">Searching your library…</div>
                  <p class="loadingDescription">Finding the music that matches your selection.</p>
                </div>
              </div>
            </div>
            <div class="contentSection" data-content-view="${this.view}">${this.contentFor(this.view)}</div>
          </section>
        </div>
      </div>`;
    this._bindWhenReady();
    return html;
  }

  private _bindWhenReady(attempts = 0): void {
    const root = document.querySelector<HTMLElement>('[data-page="library"].bp');
    if (root) this.bindEvents(root);
    else if (attempts < 60) setTimeout(() => this._bindWhenReady(attempts + 1), 50);
  }

  private _root(): HTMLElement | null {
    return document.querySelector<HTMLElement>('[data-page="library"].bp');
  }

  private refreshContent(withLoading = false): void {
    const root = this._root();
    if (!root) return;
    const swap = () => {
      const section = root.querySelector<HTMLElement>('.contentSection');
      if (section) {
        section.dataset.contentView = this.view;
        section.innerHTML = this.contentFor(this.view);
      }
      const [title, sub] = this.viewMeta(this.view);
      const head = root.querySelector<HTMLElement>('#browseResultsHeader');
      if (head) {
        const t = head.querySelector('.resultsTitle');
        const s = head.querySelector('.resultsSubtitle');
        if (t) t.textContent = title;
        if (s) s.textContent = sub;
      }
      const count = root.querySelector<HTMLElement>('#browseResultsCount');
      if (count) count.textContent = this.countFor(this.view);
      root.querySelectorAll<HTMLElement>('.browseTab').forEach((t) => t.classList.toggle('is-active', t.dataset.view === this.view));
      this.hydrate(root.querySelector<HTMLElement>('#browseContent'));
    };
    if (withLoading) {
      const layer = root.querySelector<HTMLElement>('#loadingLayer');
      layer?.classList.remove('is-hidden');
      setTimeout(() => {
        swap();
        layer?.classList.add('is-hidden');
      }, 260);
    } else swap();
  }

  private hydrate(scope: HTMLElement | null): void {
    if (!scope) return;
    window.heartManager?.bindAll(scope);
    scope.querySelectorAll<HTMLElement>('[data-more-song]').forEach((el) => {
      if ((el as HTMLElement & { _moreBound?: boolean })._moreBound) return;
      (el as HTMLElement & { _moreBound?: boolean })._moreBound = true;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ui.contentEvents.showSongMenu(el.dataset.moreSong!, e);
      });
    });
    scope.querySelectorAll<HTMLElement>('[data-play-album]').forEach((el) => {
      if ((el as HTMLElement & { _paBound?: boolean })._paBound) return;
      (el as HTMLElement & { _paBound?: boolean })._paBound = true;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const data = JSON.parse(el.dataset.playAlbum || '{}') as { artistId: string; albumId: string };
        const queue = Utils.albumQueue(this.ui.state, data.artistId, data.albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0]!, queue, true, 'album');
      });
    });
    scope.querySelectorAll<HTMLElement>('[data-action="add-album-to-queue"]').forEach((el) => {
      if ((el as HTMLElement & { _aqBound?: boolean })._aqBound) return;
      (el as HTMLElement & { _aqBound?: boolean })._aqBound = true;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const state = this.ui.state;
        const albumId = el.dataset.albumId!;
        const album = state.getAlbumById(albumId);
        if (!album?.songs?.length) return;
        const queue = Utils.albumQueue(state, album.artistId, albumId);
        const currentQueue = state.queue || [];
        state.queue = [...currentQueue, ...queue];
        if (state.currentSong) state.queueIndex = state.queue.findIndex((s) => s.id === state.currentSong?.id);
        state.showToast(`Added ${queue.length} song${queue.length === 1 ? '' : 's'} to queue`);
      });
    });
  }

  private closeMenus(): void {
    this._root()?.querySelectorAll('.filterMenu').forEach((m) => m.remove());
  }

  private openMenu(
    anchorBtn: HTMLElement,
    items: Array<{ value: string | number; label: string; count?: number }>,
    current: string | number | null,
    onSelect: (value: string) => void,
  ): void {
    this.closeMenus();
    const root = this._root();
    if (!root) return;
    const menu = document.createElement('div');
    menu.className = 'filterMenu';
    menu.innerHTML = items.map((it) => `
      <button type="button" class="filterMenuItem${String(it.value) === String(current) ? ' is-active' : ''}" data-value="${this.esc(it.value)}">
        <span>${this.esc(it.label)}</span>
        ${it.count != null ? `<span class="count">${it.count}</span>` : ''}
      </button>`).join('');
    root.appendChild(menu);
    const rect = anchorBtn.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    menu.style.top = `${rect.bottom - rootRect.top + root.scrollTop + 6}px`;
    menu.style.left = `${Math.max(8, rect.left - rootRect.left)}px`;
    menu.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.filterMenuItem');
      if (!item) return;
      e.stopPropagation();
      onSelect(item.dataset.value!);
      this.closeMenus();
    });
    setTimeout(() => {
      this._menuCloser = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) this.closeMenus();
      };
      document.addEventListener('click', this._menuCloser, { once: true });
    }, 0);
  }

  private openFilterMenu(btn: HTMLElement, type: LibraryFilterType): void {
    const state = this.ui.state;
    let items: Array<{ value: string | number; label: string; count?: number }> = [];
    if (type === 'artist') {
      items = this.allArtists(state).sort((a, b) => a.name.localeCompare(b.name)).map((a) => ({ value: a.id, label: a.name, count: a.songCount }));
    } else if (type === 'genre') {
      items = this.allGenres(state).map((g) => ({ value: g.name, label: g.name, count: g.count }));
    } else if (type === 'year') {
      const years = [...new Set(this.allAlbums(state).map((a) => a.year).filter((y): y is string => !!y))].sort().reverse();
      items = years.map((y) => ({ value: y, label: y }));
    } else if (type === 'decade') {
      const decades = [...new Set(this.allAlbums(state).map((a) => a.year).filter((y): y is string => !!y).map((y) => Math.floor(Number(y) / 10) * 10))].sort((a, b) => b - a);
      items = decades.map((d) => ({ value: d, label: `${d}s` }));
    }
    if (!items.length) {
      state.showToast('Nothing to filter by yet');
      return;
    }
    this.openMenu(btn, items, this.filter.type === type ? this.filter.value : null, (value) => {
      const it = items.find((i) => String(i.value) === String(value));
      this.filter = { type, value, label: it ? it.label : value };
      this.ui.render();
    });
  }

  private openSortMenu(btn: HTMLElement): void {
    const items: Array<{ value: LibrarySort; label: string }> = [
      { value: 'recent', label: 'Recently Added' },
      { value: 'title', label: 'Title A–Z' },
      { value: 'artist', label: 'Artist A–Z' },
      { value: 'yearDesc', label: 'Newest First' },
      { value: 'yearAsc', label: 'Oldest First' },
      { value: 'mostPlayed', label: 'Most Played' },
    ];
    this.openMenu(btn, items, this.sort, (value) => {
      this.sort = value as LibrarySort;
      this.ui.render();
    });
  }

  playArtist(artistId: string): void {
    const state = this.ui.state;
    const artist = state.getArtistById(artistId);
    if (!artist) return;
    const queue = artist.albums.flatMap((alb) => alb.songs.map((s) => state.getSongById(s.id)).filter((s): s is Song => !!s));
    if (queue.length) {
      this.ui.audioPlayer.playSong(queue[0]!, queue, true, 'artist');
      state.showToast(`Playing ${artist.artist}`);
    }
  }

  bindEvents(root: HTMLElement): void {
    const rootAny = root as HTMLElement & { _browseDelegated?: boolean };
    if (rootAny._browseDelegated) return;
    rootAny._browseDelegated = true;
    const ui = this.ui;

    root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tab = target.closest<HTMLElement>('.browseTab');
      if (tab) {
        e.stopPropagation();
        if (tab.dataset.view !== this.view) {
          this.view = tab.dataset.view as LibraryView;
          this.refreshContent(true);
        }
        return;
      }
      const filterBtn = target.closest<HTMLElement>('.filterButton');
      if (filterBtn) {
        e.stopPropagation();
        const type = filterBtn.dataset.filter as LibraryFilterType;
        if (type === 'all') {
          if (this.filter.type !== 'all') {
            this.filter = { type: 'all', value: null, label: '' };
            ui.render();
          }
          return;
        }
        this.openFilterMenu(filterBtn, type);
        return;
      }
      const sortBtn = target.closest<HTMLElement>('[data-action="sort"]');
      if (sortBtn) {
        e.stopPropagation();
        this.openSortMenu(sortBtn);
        return;
      }
      const viewBtn = target.closest<HTMLElement>('.viewButton[data-view-mode]');
      if (viewBtn) {
        e.stopPropagation();
        const mode = viewBtn.dataset.viewMode as LibraryMode;
        if (mode !== this.mode) {
          this.mode = mode;
          root.querySelectorAll<HTMLElement>('.viewButton').forEach((b) => b.classList.toggle('is-active', b === viewBtn));
          this.refreshContent(false);
        }
        return;
      }
      const albumMore = target.closest<HTMLElement>('[data-album-more]');
      if (albumMore) {
        e.stopPropagation();
        window.contextMenu?.show(e.clientX, e.clientY, {
          artistId: albumMore.dataset.artistId,
          albumId: albumMore.dataset.albumId,
        });
        return;
      }
      const artistPlay = target.closest<HTMLElement>('[data-artist-play]');
      if (artistPlay) {
        e.stopPropagation();
        this.playArtist(artistPlay.dataset.artistPlay!);
        return;
      }
      const artistOpen = target.closest<HTMLElement>('[data-artist-open]');
      if (artistOpen) {
        e.stopPropagation();
        ui.navigate('artist', artistOpen.dataset.artistOpen!);
        return;
      }
      const genre = target.closest<HTMLElement>('.genreCard[data-genre]');
      if (genre) {
        e.stopPropagation();
        window.pagesActions?.playGenre(genre.dataset.genre!);
        return;
      }
      const plCard = target.closest<HTMLElement>('.playlistCard[data-playlist-id]');
      if (plCard) {
        e.stopPropagation();
        const pl = ui.state.playlists.find((p) => String(p.id) === String(plCard.dataset.playlistId));
        if (pl) {
          ui.state.selectedPlaylistName = pl.name;
          ui.state.selectedPlaylistId = pl.id;
          ui.navigate('playlists');
        }
        return;
      }
      const songRowEl = target.closest<HTMLElement>('tr[data-song-id]');
      if (songRowEl) {
        if (target.closest('button')) return;
        e.stopPropagation();
        const song = ui.state.getSongById(songRowEl.dataset.songId!);
        if (!song) return;
        const queue = [...root.querySelectorAll<HTMLElement>('tr[data-song-id]')]
          .map((r) => ui.state.getSongById(r.dataset.songId!))
          .filter((s): s is Song => !!s);
        ui.audioPlayer.playSong(song, queue.length ? queue : null, true, 'library');
        return;
      }
      const rowItem = target.closest<HTMLElement>('.rowItem[data-artist-id]');
      if (rowItem) {
        if (target.closest('button')) return;
        e.stopPropagation();
        ui.navigate('artist', rowItem.dataset.artistId!, rowItem.dataset.albumId || null);
        return;
      }
    });

    const searchInput = root.querySelector<HTMLInputElement>('#librarySearch');
    if (searchInput && !(searchInput as HTMLInputElement & { _browseSearchBound?: boolean })._browseSearchBound) {
      (searchInput as HTMLInputElement & { _browseSearchBound?: boolean })._browseSearchBound = true;
      let t = 0;
      searchInput.addEventListener('input', () => {
        window.clearTimeout(t);
        t = window.setTimeout(() => {
          this.query = searchInput.value;
          this.refreshContent(false);
        }, 160);
      });
    }
  }

  destroy(): void {
    if (this._menuCloser) {
      document.removeEventListener('click', this._menuCloser);
      this._menuCloser = null;
    }
  }
}





/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   F A V O R I T E S
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
export class Favorites {
  ui: UIManager;
  constructor(ui: UIManager) { this.ui = ui; }

  private emptyState(emoji: string, title: string, desc: string): string {
    return `
      <div class="emptyState animate-fadeInUp" style="text-align: center; padding: 4rem 0;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">${emoji}</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: rgb(var(--textPrimary));">${title}</h3>
        <p style="color: rgba(var(--textSecondary)/1);">${desc}</p>
      </div>`;
  }

  private renderSongCards(songs: Song[]): string {
    if (!songs.length) return '';
    const groups: Record<string, Song[]> = {};
    songs.forEach((song) => {
      const genre = song.genre || 'Unknown Genre';
      if (!groups[genre]) groups[genre] = [];
      groups[genre]!.push(song);
    });
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
                    <span class="song-row-artist">${s.artist || ''}</span>
                  </div>
                  <button class="heart ${this.ui.favorites.isSong(s.id) ? 'favorited' : ''}" data-fav-song="${s.id}" onclick="event.stopPropagation();">${this.ui.likeStatus('song', this.ui.favorites.isSong(s.id), false, null)}</button>
                </div>`).join('')}
            </div>
          </section>`).join('')}
      </div>`;
  }

  private renderAlbumCards(albums: Array<Album & { artistId: string; artistName: string }>): string {
    return `
      <div class="ui-grid album-grid animate-fadeInUp">
        ${albums.map((alb, i) => `
          <div class="ui-card album-card" style="--d: ${i * 40}ms" data-album-id="${alb.id}">
            <div class="imgBx" onclick="window.uiManager.navigate('artist', '${alb.artistId}', '${alb.id}')">
              <img src="${alb.coverUrl}" loading="lazy" alt="">
            </div>
            <div class="content">
              <div class="contentBx"><h3>${alb.album}<br><span>${alb.artistName}</span></h3></div>
              <ul class="sci">
                <li style="--i:1"><button class="icon-btn" onclick="event.stopPropagation(); window.pagesActions.playAlbum('${alb.artistId}', '${alb.id}')" title="Play">${Icons.player.play(18)}</button></li>
                <li style="--i:2"><button class="icon-btn" onclick="event.stopPropagation(); window.pagesActions.shuffleAlbum('${alb.artistId}', '${alb.id}')" title="Shuffle Play">${Icons.player.shuffle(18)}</button></li>
                <li style="--i:3"><button class="icon-btn" onclick="event.stopPropagation(); window.uiManager.openMoreMenu(event, 'album', '${alb.id}')" title="More">${Icons.general.moreVert(18)}</button></li>
              </ul>
            </div>
          </div>`).join('')}
      </div>`;
  }

  private renderArtistCards(artists: Artist[]): string {
    return `
      <div class="ui-grid animate-fadeInUp">
        ${artists.map((a, i) => `
          <div class="ui-card" data-artist-id="${a.id}" style="--d: ${i * 40}ms" onclick="window.uiManager.navigate('artist', '${a.id}')">
            <div class="ui-art-wrap" style="border-radius: 50%;"><img src="${a.imageUrl}" loading="lazy" alt=""></div>
            <div class="ui-info" style="justify-content: center; text-align: center;">
              <div class="ui-text">
                <span class="ui-title">${a.artist}</span>
                <span class="ui-sub">${a.genre || 'Artist'}</span>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  private renderPlaylistCards(playlists: Playlist[]): string {
    const state = this.ui.state;
    return `
      <div class="ui-grid animate-fadeInUp">
        ${playlists.map((pl, i) => {
          const covers = pl.songs.map((id) => state.getSongById(id)).filter((s): s is Song => !!s).slice(0, 4).map((s) => s.coverUrl);
          return `
          <div class="ui-card" data-playlist-view="${Utils.esc(pl.name)}" style="--d: ${i * 40}ms" onclick="window.uiManager.navigate('playlists'); window.uiManager.playlistsPage.viewPlaylist('${Utils.esc(pl.name)}')">
            <div class="ui-art-wrap mosaic-wrap">
              ${covers.length ? covers.map((c) => `<img src="${c}" alt="">`).join('') : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
              <button class="ui-play-btn" data-playlist-play="${pl.id}" onclick="event.stopPropagation();">${Icons.player.play(18)}</button>
            </div>
            <div class="ui-info">
              <div class="ui-text">
                <span class="ui-title">${Utils.esc(pl.name)}</span>
                <span class="ui-sub">${pl.songs.length} songs</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  render(): string {
    const state = this.ui.state;
    const tabs: Array<{ key: FavoritesTab; label: string }> = [
      { key: 'songs', label: 'Songs' },
      { key: 'albums', label: 'Albums' },
      { key: 'artists', label: 'Artist' },
      { key: 'playlists', label: 'Playlists' },
    ];
    return `
      <div data-page="favorites" class="page animate-fadeInUp">
        <header class="pageHeader">
          <h1 class="pageTitle">Favorites</h1>
          <nav class="tabs">
            ${tabs.map(({ key, label }) => `
              <button class="tab-btn ${key === state.favoritesTab ? 'active' : ''}" data-tab="${key}" onclick="window.uiManager.refreshFavoritesContent('${key}')">
                ${label}
              </button>`).join('')}
          </nav>
        </header>
        <div id="favorites-content">${this.tabContent(state.favoritesTab)}</div>
      </div>`;
  }

  tabContent(tab: FavoritesTab): string {
    const state = this.ui.state;
    if (tab === 'songs') {
      const songIds = state.favoriteSongs;
      if (!songIds.length) return this.emptyState('🎵', 'No favorite songs yet', 'Tap the heart on any track to save it.');
      return this.renderSongCards(songIds.map((id) => state.getSongById(id)).filter((s): s is Song => !!s));
    }
    if (tab === 'artists') {
      const artistIds = state.favoriteArtists;
      if (!artistIds.length) return this.emptyState('🎤', 'No favorite artists yet', 'Save the artists you love most.');
      return this.renderArtistCards(artistIds.map((id) => state.getArtistById(id)).filter((a): a is Artist => !!a));
    }
    if (tab === 'albums') {
      const albumIds = state.favoriteAlbums;
      if (!albumIds.length) return this.emptyState('💿', 'No favorite albums yet', 'Mark standout albums to keep them close.');
      return this.renderAlbumCards(albumIds.map((id) => state.getAlbumById(id)).filter((a): a is Album & { artistId: string; artistName: string } => !!a));
    }
    if (tab === 'playlists') {
      return state.playlists.length ? this.renderPlaylistCards(state.playlists) : this.emptyState('📚', 'No playlists yet', 'Create a playlist to curate your mood.');
    }
    return '';
  }
}

/* ============================================================
   Playlists
   ============================================================ */

export class Playlists {
  ui: UIManager;
  constructor(ui: UIManager) { this.ui = ui; }

  viewPlaylist(name: string | null): void {
    this.ui.state.selectedPlaylistName = name;
    this.ui.render();
  }

  render(): string {
    const state = this.ui.state;
    const viewing = state.selectedPlaylistName;
    return `
      <div data-page="playlists" class="page animate-fadeInUp">
        <header class="pageHeader">
          <h1 class="pageTitle">${viewing || 'Playlists'}</h1>
          ${!viewing ? `
            <button class="action-btn primary" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" onclick="window.uiManager.showSpinner(); setTimeout(() => { document.getElementById('create-playlist-modal')?.classList.remove('hidden'); window.uiManager.hideSpinner(); }, window.uiManager.fragmentLoadDelay);">+ New</button>`
          : `
            <button class="action-btn" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" onclick="window.uiManager.playlistsPage.viewPlaylist(null)">&larr; Back</button>`}
        </header>
        ${viewing ? this.playlistViewer(viewing) : this.playlistsGrid()}
      </div>`;
  }

  private playlistsGrid(): string {
    const state = this.ui.state;
    if (!state.playlists.length) {
      return `<div style="text-align: center; padding: 4rem 0; color: rgba(var(--textSecondary)/1);">No playlists yet.</div>`;
    }
    return `
      <div class="playlist-grid animate-fadeInUp">
        ${state.playlists.map((pl) => {
          const covers = pl.songs.map((id) => state.getSongById(id)).filter((s): s is Song => !!s).slice(0, 4).map((s) => s.coverUrl);
          return `
            <div class="playlist-card" onclick="window.uiManager.playlistsPage.viewPlaylist('${Utils.esc(pl.name)}')">
              <div class="mosaic-wrap">
                ${covers.length ? covers.map((c) => `<img src="${c}">`).join('') : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
                <button class="playlist-play-btn" data-playlist-play="${pl.id}" onclick="event.stopPropagation();">${Icons.player.play(20)}</button>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="min-width: 0;">
                  <span style="font-weight: 700; font-size: 1rem; color: rgb(var(--textPrimary)); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.esc(pl.name)}</span>
                  <span style="font-size: 0.8rem; color: rgba(var(--textSecondary)/1); display: block;">by You</span>
                </div>
                <button class="ui-more-btn" onclick="event.stopPropagation(); window.favoritesPlaylists.openModal()">${Icons.general.moreVert(18)}</button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  private playlistViewer(name: string): string {
    const state = this.ui.state;
    const playlist = state.playlists.find((p) => p.name === name);
    if (!playlist) return `<div>Playlist not found</div>`;
    const songs = playlist.songs.map((id) => state.getSongById(id)).filter((s): s is Song => !!s);
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
              <div style="min-width: 0;">
                <span class="row-title">${Utils.esc(s.title)}</span>
                <span class="row-sub">${Utils.esc(s.artist || '')} • ${Utils.esc(s.album || '')}</span>
              </div>
              <button class="ui-more-btn" data-more-song="${s.id}" onclick="event.stopPropagation();">${Icons.general.moreHoriz(20)}</button>
            </div>`).join('')}
        </div>
      </div>`;
  }
}

/* ============================================================
   Artists
   ============================================================ */

export class Artists {
  ui: UIManager;
  private _tabsScrollHandler: (() => void) | null = null;
  private _tabsRaf = 0;
  private _pinned = false;

  constructor(ui: UIManager) { this.ui = ui; }

  render(): string {
    const state = this.ui.state;
    const artistId = state.artistId;
    if (!artistId) return `<div class="artist-missing">Artist not found</div>`;
    const artist = state.getArtistById(artistId);
    if (!artist) return `<div class="artist-missing">Artist not found</div>`;
    const activeAlbumId = state.selectedAlbumId;
    const activeAlbum = activeAlbumId
      ? artist.albums.find((a) => IdUtils.norm(a.id) === IdUtils.norm(activeAlbumId))
      : artist.albums[0];
    if (!activeAlbum) return `<div class="artist-missing">Album not found</div>`;
    const similarIds = artist.similar || [];
    const similarArtists = similarIds.map((id) => state.getArtistById(id)).filter((a): a is Artist => !!a);
    const rows = [similarArtists.slice(0, 4), similarArtists.slice(4, 8), similarArtists.slice(8, 12)];
    const html = `
      <div class="artist-page" data-page="artist">
        <div class="artist-shell">
          ${this.renderHeader(artist)}
          <div class="albumTabsSentinel" aria-hidden="true"></div>
          ${this.renderAlbumTabs(artist, activeAlbum)}
          <div class="artist-heroBody">
            <div class="hero-stage">
              <div class="hero-left">
                ${this.renderHeroCover(artist, activeAlbum)}
                ${this.renderMetaSummary(artist, activeAlbum)}
              </div>
              <div class="hero-right">${this.renderSongsList(artist, activeAlbum)}</div>
            </div>
          </div>
          ${similarIds.length ? this.similarMarquee(rows, artist.id) : ''}
        </div>
      </div>`;
    this._bindWhenReady();
    return html;
  }

  private renderHeader(artist: Artist): string {
    const isFav = this.ui.favorites.isArtist(artist.id);
    return `
      <header class="artist-header">
        <div class="artist-header-left">
          <span class="artist-header-kicker">Artist</span>
          <h1 class="artist-name">${Utils.esc(artist.artist)}</h1>
        </div>
        <button type="button" class="artist-heart ${isFav ? 'favorited' : ''}" data-artist-heart="${Utils.esc(artist.id)}" aria-label="Favorite artist">
          ${this.ui.likeStatus('artist', isFav, false, null)}
        </button>
      </header>`;
  }

  private renderAlbumTabs(artist: Artist, activeAlbum: Album): string {
    return `
      <nav class="albumTabsBar" data-area="albums" aria-label="Albums">
        <div class="albumTabs-scroll">
          ${artist.albums.map((alb) => `
            <button type="button" class="albumTab ${alb.id === activeAlbum.id ? 'active' : ''}" data-artist-id="${Utils.esc(artist.id)}" data-album-id="${Utils.esc(alb.id)}" aria-pressed="${alb.id === activeAlbum.id}">
              ${Utils.esc(alb.album)}
            </button>`).join('')}
        </div>
      </nav>`;
  }

  private renderHeroCover(artist: Artist, activeAlbum: Album): string {
    return `
      <div class="hero-cover">
        <img src="${Utils.esc(activeAlbum.coverUrl || '')}" alt="${Utils.esc(activeAlbum.album)}" loading="eager">
        <div class="hero-scrim"></div>
        <div class="hero-overlay">
          <div class="album-meta">
            <h2 class="album-title">${Utils.esc(activeAlbum.album)}</h2>
            <span class="track-count">${activeAlbum.songs.length} track${activeAlbum.songs.length === 1 ? '' : 's'}</span>
          </div>
          <button type="button" class="play-all" data-play-album='${JSON.stringify({ artistId: artist.id, albumId: activeAlbum.id })}' aria-label="Shuffle album">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/><polygon points="10,7 17,12 10,17" fill="currentColor"/></svg>
            <span class="shuffle-text">Shuffle</span>
          </button>
        </div>
      </div>`;
  }

  private renderMetaSummary(_artist: Artist, activeAlbum: Album): string {
    const isAlbumFav = this.ui.favorites.isAlbum(activeAlbum.id);
    return `
      <div data-area="meta-summary" class="hero-meta">
        <div data-list="editorial-brief" class="bento-meta-node">
          <div class="brief-wrapper">
            <span class="brief-mono">${Utils.esc(activeAlbum.year || '2024')}</span>
            <span class="brief-heading">${Utils.esc(activeAlbum.status || 'Double Platinum')}</span>
          </div>
          <a href="#" class="brief-anchor" id="bento-album-share" data-album-title="${Utils.esc(activeAlbum.album)}">Share this album</a>
        </div>
        <div data-list="utility-hub" class="bento-meta-node">
          <button type="button" class="hub-pill-btn" id="bento-offline-toggle" data-album-id="${Utils.esc(activeAlbum.id)}">
            <span class="hub-btn-txt">Listen Offline</span>
          </button>
          <div class="hub-group">
            <h5 class="hub-group-title">Add to library</h5>
            <div class="hub-links">
              <a href="#" class="hub-link-item" data-action="add-album-to-playlist" data-album-id="${Utils.esc(activeAlbum.id)}">Playlist</a>
              <a href="#" class="hub-link-item" data-action="add-album-to-queue" data-album-id="${Utils.esc(activeAlbum.id)}">Queue</a>
              <a href="#" class="hub-link-item" data-action="toggle-favorite-album" data-album-id="${Utils.esc(activeAlbum.id)}">${isAlbumFav ? 'Remove Favorite' : 'Favorites'}</a>
            </div>
          </div>
        </div>
      </div>`;
  }

  private renderSongsList(artist: Artist, activeAlbum: Album): string {
    return `
      <div data-list="songs" data-type="album" class="hero-songs">
        <div id="songsList" class="body">
          ${activeAlbum.songs.map((song, i) => this.createSongRow(song, i, artist, activeAlbum)).join('')}
        </div>
      </div>`;
  }

  createSongRow(song: Song, index: number, artist: Artist, album: Album): string {
    const isFav = this.ui.favorites.isSong(song.id);
    const isPlaying = this.ui.state.currentSong?.id == song.id;
    return `
      <div class="songItem ${isPlaying ? 'playing' : ''}" data-song-id="${Utils.esc(song.id)}" data-context='${JSON.stringify({ artistId: artist.id, albumId: album.id })}'>
        <div class="left">
          <div class="trackNum">${index + 1}</div>
          <div class="play">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/><polygon points="10,7 17,12 10,17" fill="currentColor"/></svg>
          </div>
        </div>
        <div class="center">
          <div class="title"><span>${Utils.esc(song.title)}</span></div>
        </div>
        <div class="right">
          <div class="time">${Utils.esc(song.duration || '')}</div>
          <button type="button" class="heart ${isFav ? 'favorited' : ''}" data-fav-song="${Utils.esc(song.id)}" aria-label="Favorite song">${this.ui.likeStatus('song', isFav, false, null)}</button>
          <button type="button" class="downloadBtn" data-action="download-song" data-song-id="${Utils.esc(song.id)}" data-song-title="${Utils.esc(song.title)}" data-song-thumbnail="${Utils.esc(album.coverUrl || '')}" aria-label="Download song">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button type="button" class="moreMenu" data-more-song="${Utils.esc(song.id)}" aria-label="More options">${Icons.general.moreVert(18)}</button>
        </div>
      </div>`;
  }

  private similarMarquee(rows: Artist[][], _artistId: string): string {
    const configs: Array<['left' | 'right', number]> = [['left', 40], ['right', 45], ['left', 35]];
    const marquee = (artists: Artist[], dir: 'left' | 'right', dur: number) => `
      <div class="marquee-container">
        <div class="marquee-track marquee-${dir}" style="animation-duration: ${dur}s;">
          ${[...artists, ...artists].map((a) => `
            <span class="artist-name-pill animate-fadeIn" data-artist-id="${Utils.esc(a.id)}" data-artist-name="${Utils.esc(a.artist)}" onclick="window.uiManager.showSpinner(); setTimeout(() => { window.uiManager.contentEvents.showArtistPopover('${Utils.esc(a.id)}', event); window.uiManager.hideSpinner(); }, window.uiManager.popoverDelay);">
              ${Utils.esc(a.artist)}
            </span>`).join('')}
        </div>
      </div>`;
    return `
      <div data-area="similar" class="similar-artists-section">
        <h5 class="similar-artists-title">Listen to similar Artists</h5>
        ${rows.map((row, i) => (row.length ? marquee(row, ...(configs[i] || ['left', 40] as ['left', number])) : '')).join('')}
      </div>`;
  }

  private _bindWhenReady(attempts = 0): void {
    const root = document.querySelector<HTMLElement>('[data-page="artist"]');
    if (root) this._afterRender();
    else if (attempts < 60) setTimeout(() => this._bindWhenReady(attempts + 1), 50);
  }

  private _afterRender(): void {
    this._watchAlbumTabsPin();
    this._bindAlbumTabsClick();
  }

  private _bindAlbumTabsClick(): void {
    const root = this._root();
    if (!root) return;
    const bar = root.querySelector<HTMLElement>('.albumTabsBar');
    if (!bar || (bar as HTMLElement & { _bound?: boolean })._bound) return;
    (bar as HTMLElement & { _bound?: boolean })._bound = true;
    bar.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).closest<HTMLElement>('.albumTab');
      if (!tab) return;
      const artistId = tab.dataset.artistId;
      const albumId = tab.dataset.albumId;
      if (!artistId || !albumId) return;
      bar.querySelectorAll<HTMLElement>('.albumTab.active').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-pressed', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-pressed', 'true');
      try { window.uiManager?.refreshArtistContent?.(artistId, albumId); } catch { return; }
      setTimeout(() => {
        this._watchAlbumTabsPin();
        this._scrollHeroIntoView();
      }, 40);
    });
  }

  private _scrollHeroIntoView(): void {
    const root = this._root();
    if (!root) return;
    const sentinel = root.querySelector<HTMLElement>('.albumTabsSentinel');
    if (!sentinel) return;
    const PIN_TOP = 56;
    const rect = sentinel.getBoundingClientRect();
    const sentinelBottomPage = rect.bottom + window.scrollY;
    const targetY = Math.max(0, sentinelBottomPage - PIN_TOP + 2);
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  private _watchAlbumTabsPin(): void {
    const root = this._root();
    if (!root) return;
    if (this._tabsScrollHandler) {
      window.removeEventListener('scroll', this._tabsScrollHandler, true);
      this._tabsScrollHandler = null;
    }
    if (this._tabsRaf) {
      cancelAnimationFrame(this._tabsRaf);
      this._tabsRaf = 0;
    }
    const bar = root.querySelector<HTMLElement>('.albumTabsBar');
    const sentinel = root.querySelector<HTMLElement>('.albumTabsSentinel');
    if (!bar || !sentinel) return;
    const PIN_TOP = 56;
    const compute = () => {
      this._tabsRaf = 0;
      if (!bar.isConnected || !sentinel.isConnected) return;
      const sRect = sentinel.getBoundingClientRect();
      const pinned = sRect.bottom <= PIN_TOP + 0.5;
      if (pinned !== this._pinned) {
        this._pinned = pinned;
        bar.classList.toggle('is-pinned', pinned);
      }
    };
    this._tabsScrollHandler = () => {
      if (this._tabsRaf) return;
      this._tabsRaf = requestAnimationFrame(compute);
    };
    this._pinned = false;
    bar.classList.remove('is-pinned');
    compute();
    window.addEventListener('scroll', this._tabsScrollHandler, { passive: true, capture: true });
  }

  private _root(): HTMLElement | null {
    return document.querySelector<HTMLElement>('[data-page="artist"]');
  }

  aboutSection(artist: Artist, album: Album): string {
    return `
      <div class="about-content">
        <h3>About ${Utils.esc(album.album)}</h3>
        <p>${Utils.esc(artist.artist)}'s ${Utils.esc(album.album)}.</p>
      </div>`;
  }
}

/* ============================================================
   EditPlaylist
   ============================================================ */

export class EditPlaylist {
  ui: UIManager;
  constructor(ui: UIManager) { this.ui = ui; }

  render(): string {
    const state = this.ui.state;
    const id = state.editingPlaylistId;
    const pl = state.playlists.find((p) => String(p.id) === String(id));
    if (!pl) return `<div class="page animate-fadeInUp"><div class="missing">Playlist not found</div></div>`;
    const songs = pl.songs.map((sid, i) => ({ song: state.getSongById(sid), index: i, sid: String(sid) }));
    const totalDuration = songs.reduce((sum, item) => {
      const parts = item.song?.duration?.split(':') || ['0', '0'];
      if (parts.length === 2) return sum + parseInt(parts[0] || '0', 10) * 60 + parseInt(parts[1] || '0', 10);
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
            <div class="edit-playlist-field">
              <label for="edit-pl-name">Name</label>
              <input type="text" id="edit-pl-name" class="edit-playlist-input" value="${Utils.esc(pl.name)}" maxlength="80" data-playlist-id="${Utils.esc(pl.id)}">
            </div>
            <div class="edit-playlist-field">
              <label for="edit-pl-desc">Description</label>
              <textarea id="edit-pl-desc" class="edit-playlist-textarea" rows="2" maxlength="240" data-playlist-id="${Utils.esc(pl.id)}">${Utils.esc(pl.description || '')}</textarea>
            </div>
            <div class="edit-playlist-field">
              <label>Tags</label>
              <div class="edit-playlist-tags" id="edit-pl-tags">
                ${(pl.tags || []).map((t) => `<span class="edit-playlist-tag" data-tag="${Utils.esc(t)}">${Utils.esc(t)}<button type="button" class="edit-playlist-tag-remove" data-tag="${Utils.esc(t)}">×</button></span>`).join('')}
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
              <div class="edit-playlist-drag" title="Drag to reorder">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg>
              </div>
              <img src="${item.song.coverUrl}" class="edit-playlist-song-thumb" alt="">
              <div class="edit-playlist-song-info">
                <p class="edit-playlist-song-title">${Utils.esc(item.song.title)}</p>
                <p class="edit-playlist-song-artist">${Utils.esc(item.song.artist || '')} • ${Utils.esc(item.song.album || '')}</p>
              </div>
              <span class="edit-playlist-song-time">${item.song.duration || ''}</span>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}" title="Remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>` : `
            <div class="edit-playlist-song-row edit-playlist-song-missing" data-index="${i}">
              <div class="edit-playlist-drag"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg></div>
              <p class="edit-playlist-song-title">Unknown song</p>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}">Remove</button>
            </div>`)).join('')}
        </div>
        ${!pl.songs.length ? `
          <div class="edit-playlist-empty">
            <div class="edit-playlist-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/></svg></div>
            <h3 class="edit-playlist-empty-title">No songs yet</h3>
            <p class="edit-playlist-empty-desc">Add songs to start building your playlist.</p>
          </div>` : ''}
      </div>`;
  }

  private _coverPreview(pl: Playlist): string {
    const state = this.ui.state;
    const songs = pl.songs.map((sid) => state.getSongById(sid)).filter((s): s is Song => !!s).slice(0, 4);
    if (!songs.length) return `<div class="edit-cover-empty">${Icons.general.playlist(48)}</div>`;
    if (songs.length === 1) return `<img src="${songs[0]!.coverUrl}" class="edit-cover-img" alt="">`;
    return `<div class="edit-cover-mosaic">${songs.map((s) => `<img src="${s.coverUrl}" class="edit-cover-quarter" alt="">`).join('')}</div>`;
  }
}

/* ============================================================
   Error404
   ============================================================ */

export class Error404 {
  ui: UIManager;
  constructor(ui: UIManager) { this.ui = ui; }

  render(): string {
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
    </div>`;
  }
}

/* ============================================================
   window.pagesActions
   ============================================================ */

if (typeof window !== 'undefined') {
  window.pagesActions = {
    buildSongs(): Song[] {
      const state = window.uiManager?.state || window.state;
      if (!state?.enrichedLibrary) return [];
      return state.enrichedLibrary.flatMap((artist) =>
        artist.albums.flatMap((album) =>
          album.songs.map((song) => ({
            ...song,
            artistId: artist.id,
            albumId: album.id,
            artist: artist.artist,
            album: album.album,
            coverUrl: album.coverUrl,
            artistImageUrl: artist.imageUrl,
            genre: artist.genre || '',
          })),
        ),
      );
    },
    playQueue(queue: Song[], index = 0, label = '', source: PlaySource | null = null): void {
      if (!queue.length || !window.uiManager?.audioPlayer) return;
      const safeIndex = Math.max(0, Math.min(index, queue.length - 1));
      window.uiManager.audioPlayer.playSong(queue[safeIndex]!, queue, true, source);
      if (label) (window.uiManager?.state || window.state)?.showToast(label);
    },
    playSong(songId: string, source: PlaySource | null = null): void {
      const state = window.uiManager?.state || window.state;
      const song = state?.getSongById(songId);
      if (song && window.uiManager?.audioPlayer) window.uiManager.audioPlayer.playSong(song, null, true, source);
    },
    shuffleAll(): void {
      const all = this.buildSongs();
      const songs = IdUtils.sample(all, all.length);
      this.playQueue(songs, 0, 'Shuffling your whole library', 'home');
    },
    playGenre(genre: string): void {
      const genreSongs = this.buildSongs().filter((song) => String(song.genre).toLowerCase() === String(genre).toLowerCase());
      if (!genreSongs.length) return;
      const pick = IdUtils.sample(genreSongs, 1)[0];
      if (pick) this.playSong(pick.id, 'home');
      (window.uiManager?.state || window.state)?.showToast(`Playing ${genre}`);
    },
    playMood(mood: string): void {
      const moodMap: Record<string, string[]> = {
        chill: ['pop', 'indie', 'acoustic', 'r&b', 'soul'],
        energy: ['dance', 'electronic', 'edm', 'hip hop', 'rock', 'pop'],
        focus: ['indie', 'acoustic', 'classical', 'instrumental', 'alternative'],
        party: ['dance', 'electronic', 'club', 'pop', 'hip hop'],
        romance: ['r&b', 'soul', 'ballad', 'pop', 'love'],
      };
      const tags = moodMap[mood] || [];
      const allSongs = this.buildSongs();
      const filtered = allSongs.filter((song) => tags.some((tag) => String(song.genre).toLowerCase().includes(tag)));
      const pool = filtered.length ? filtered : allSongs;
      const queue = IdUtils.sample(pool, Math.min(12, pool.length));
      this.playQueue(queue, 0, `${mood.charAt(0).toUpperCase() + mood.slice(1)} mix loaded`, 'home');
    },
    openStatsDashboard(): void {
      if (!window.uiManager || !window.state) return;
      const homeAny = window.uiManager.homePage as unknown as { statsDashboard?: () => string };
      if (homeAny.statsDashboard) window.state.modalOpen(homeAny.statsDashboard());
    },
    goHome(): void {
      const state = window.uiManager?.state || window.state;
      if (state) {
        state.is404 = false;
        window.uiManager?.navigate('home');
      }
    },
    playAlbum(artistId: string, albumId: string): void {
      const state = window.uiManager?.state || window.state;
      const queue = Utils.albumQueue(state, artistId, albumId);
      if (queue.length) window.uiManager.audioPlayer.playSong(queue[0]!, queue, true, 'album');
    },
    shuffleAlbum(artistId: string, albumId: string): void {
      const state = window.uiManager?.state || window.state;
      const queue = Utils.albumQueue(state, artistId, albumId);
      if (queue.length) {
        const shuffled = Utils.shuffle(queue);
        window.uiManager.audioPlayer.playSong(shuffled[0]!, shuffled, true, 'album');
      }
    },
    openGenre(genre: string): void {
      const ui = window.uiManager;
      if (!ui) return;
      const lib = ui.libraryPage;
      lib.view = 'albums';
      lib.filter = { type: 'genre', value: genre, label: genre };
      ui.navigate('library');
    },
  };
}

/* Share / offline album actions */
document.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  const shareAnchor = target.closest<HTMLElement>('#bento-album-share');
  if (shareAnchor) {
    e.preventDefault();
    const albumTitle = shareAnchor.getAttribute('data-album-title') || 'Album Selection';
    const shareMeta = {
      title: albumTitle,
      text: `Listen to ${albumTitle} streaming on our app portfolio platform.`,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareMeta);
      else {
        await navigator.clipboard.writeText(window.location.href);
        if (window.uiManager?.state?.showToast) window.uiManager.state.showToast('Share path copied to device clipboard!');
        else if (window.state?.showToast) window.state.showToast('Share path copied to device clipboard!');
      }
    } catch (err) {
      console.warn('Media runtime share actions terminated cleanly:', err);
    }
  }
  const offlineBtn = target.closest<HTMLElement>('#bento-offline-toggle');
  if (offlineBtn) {
    e.preventDefault();
    offlineBtn.classList.toggle('is-cached-locally');
    const indicatorText = offlineBtn.querySelector<HTMLElement>('.hub-btn-txt');
    if (indicatorText) {
      if (offlineBtn.classList.contains('is-cached-locally')) {
        indicatorText.textContent = 'Saved Offline ✓';
        offlineBtn.style.borderColor = 'rgba(var(--colorPurple), 0.8)';
      } else {
        indicatorText.textContent = 'Listen Offline';
        offlineBtn.style.borderColor = '';
      }
    }
  }
});
