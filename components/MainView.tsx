
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Track, PlaybackState, ViewType, ArtistMetadata } from '../types';
import { TranslationKey } from '../translations';
import { 
  Play, Music, Disc, Mic2, Edit, Trash2, ArrowLeft, Heart, 
  Upload, X, Check, Quote, Image as ImageIcon, Search, MoreHorizontal, User, Calendar, RefreshCw, ListMusic, Timer
} from './Icons';
import { formatTime, fileToDataURL } from '../utils';

interface MainViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  playbackState: PlaybackState;
  onPlay: (track: Track, queue?: Track[]) => void;
  onShuffleAll: (queue: Track[]) => void;
  currentView: ViewType;
  selectedArtist: string | null;
  selectedAlbum: string | null;
  onUpdateTrack: (id: string, data: Partial<Track>) => void;
  onDeleteTrack: (id: string) => void;
  onGoToArtist: (artist: string) => void;
  onGoToAlbum: (album: string) => void;
  onBack: () => void;
  accentColor: string;
  artistMetadata?: Record<string, ArtistMetadata>;
  onUpdateArtist?: (artist: string, data: Partial<ArtistMetadata>, overwrite?: boolean) => void;
  searchQuery?: string;
  onRequestFileUnlock: () => void;
  onToggleLike: (id: string, track?: Track) => void;
  enableGlass?: boolean;
  t: (key: TranslationKey) => string;
  onTranslate: (text: string) => Promise<string>;
  playlists?: import('../types').Playlist[];
  selectedPlaylist?: string | null;
  onUpdatePlaylist?: (id: string, data: Partial<import('../types').Playlist>) => void;
  onDeletePlaylist?: (id: string) => void;
  onCreatePlaylist?: () => void;
  onChangeView?: (view: ViewType) => void;
  onOpenSelectTracks?: () => void;
  userProfile?: import('../types').UserProfile;
  onUpdateProfile?: (data: Partial<import('../types').UserProfile>) => void;
}

const ARTIST_SPLIT_REGEX = /\s*(?:,|;|feat\.?|ft\.?|&|\/|featuring)\s+/i;

const MainView: React.FC<MainViewProps> = ({ 
  tracks, currentTrack, playbackState, onPlay, onShuffleAll, currentView, 
  selectedArtist, selectedAlbum, onUpdateTrack, onDeleteTrack, onGoToArtist, onGoToAlbum, onBack, accentColor,
  artistMetadata = {}, onUpdateArtist, searchQuery = "", onRequestFileUnlock,
  onToggleLike, enableGlass = true, t, onTranslate, playlists = [], selectedPlaylist, onUpdatePlaylist, onDeletePlaylist, onCreatePlaylist, onChangeView, onOpenSelectTracks, userProfile, onUpdateProfile
}) => {
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [isTranslatingBio, setIsTranslatingBio] = useState(false);

  const [playlistMenuOpen, setPlaylistMenuOpen] = useState<string | null>(null);

  const handleTranslateBio = async (text: string) => {
    if (isTranslatingBio) return;
    setIsTranslatingBio(true);
    const translated = await onTranslate(text);
    setTranslatedBio(translated);
    setIsTranslatingBio(false);
  };

  useEffect(() => {
    setTranslatedBio(null);
    
    // Auto-fetch artist metadata if missing
    if (selectedArtist && currentView === 'artist_detail' && isElectron() && onUpdateArtist) {
      const meta = artistMetadata[selectedArtist];
      if (!meta || (!meta.avatar && !meta.banner && !meta.bio)) {
        const fetchMeta = async () => {
          setIsRefreshingArtist(true);
          try {
            const { ipcRenderer } = (window as any).require('electron');
            const newMeta = await ipcRenderer.invoke('get-artist-metadata', selectedArtist);
            if (newMeta) onUpdateArtist(selectedArtist, newMeta);
          } catch (e) { console.error(e); } finally { setIsRefreshingArtist(false); }
        };
        fetchMeta();
      }
    }
  }, [selectedArtist, currentView]);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [isRefreshingArtist, setIsRefreshingArtist] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const artistAvatarInputRef = useRef<HTMLInputElement>(null);
  const artistBannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isElectron = () => (window as any).require && (window as any).require('electron');

  const [editingFile, setEditingFile] = useState<{ url: string, type: 'avatar' | 'banner', fileType: string } | null>(null);
  const [position, setPosition] = useState(50);

  const handleProfileFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setEditingFile({ url, type, fileType: file.type });
        setPosition(50);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfileEdit = () => {
    if (editingFile && onUpdateProfile) {
      const field = editingFile.type === 'avatar' ? 'avatarUrl' : 'bannerUrl';
      onUpdateProfile({ [field]: editingFile.url });
      setEditingFile(null);
    }
  };

  const handleFetchMetadata = async () => {
    if (!editingTrack || !isElectron()) return;
    setIsSearchingMetadata(true);
    try {
        const { ipcRenderer } = (window as any).require('electron');
        const query = `${editingTrack.title} ${editingTrack.artist}`;
        const result = await ipcRenderer.invoke('get-metadata', query);
        if (result) {
            setEditingTrack({
                ...editingTrack,
                title: result.title || editingTrack.title,
                artist: result.artist || editingTrack.artist,
                album: result.album || editingTrack.album,
                coverUrl: result.cover || editingTrack.coverUrl
            });
        }
    } catch (e) { console.error(e); } finally { setIsSearchingMetadata(false); }
  };

  const handleRefreshArtistMetadata = async () => {
    if (!selectedArtist || !isElectron() || !onUpdateArtist) return;
    setIsRefreshingArtist(true);
    try {
        const { ipcRenderer } = (window as any).require('electron');
        const meta = await ipcRenderer.invoke('get-artist-metadata', selectedArtist);
        if (meta) onUpdateArtist(selectedArtist, meta);
    } catch (e) { console.error(e); } finally { setIsRefreshingArtist(false); }
  };
  const handleArtistAssetChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file && selectedArtist && onUpdateArtist) {
        const url = await fileToDataURL(file);
        onUpdateArtist(selectedArtist, { [type]: url }, true);
    }
  };

  const renderArtistLinks = (artistString: string) => {
    if (!artistString) return null;
    const artists = artistString.split(ARTIST_SPLIT_REGEX).map(a => a.trim()).filter(Boolean);
    return artists.map((artist, index) => (
      <React.Fragment key={index}>
        <span 
          className="hover:text-white hover:underline cursor-pointer transition-colors"
          onClick={(e) => { e.stopPropagation(); onGoToArtist(artist); }}
        >
          {artist}
        </span>
        {index < artists.length - 1 && <span className="mx-0.5 opacity-40">/</span>}
      </React.Fragment>
    ));
  };

  const albums = useMemo(() => {
    const map = new Map<string, { title: string, artist: string, cover: string, year?: string }>();
    tracks.forEach(t => {
      const key = `${t.album}-${t.artist}`;
      if (!map.has(key)) map.set(key, { title: t.album, artist: t.artist, cover: t.coverUrl, year: t.year });
    });
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [tracks]);

  const artists = useMemo(() => {
    const artistSet = new Set<string>();
    tracks.forEach(t => {
      const splitNames = t.artist.split(ARTIST_SPLIT_REGEX).map(n => n.trim()).filter(Boolean);
      splitNames.forEach(name => artistSet.add(name));
    });
    return Array.from(artistSet).sort((a, b) => a.localeCompare(b));
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    return tracks.filter(t => {
      if (currentView === 'favorites') return t.isLiked;
      if (currentView === 'artist_detail') return t.artist.split(ARTIST_SPLIT_REGEX).map(n => n.trim().toLowerCase()).includes(selectedArtist?.toLowerCase() || "");
      if (currentView === 'album_detail') return t.album === selectedAlbum;
      if (currentView === 'playlist_detail' && selectedPlaylist) {
        const playlist = playlists.find(p => p.id === selectedPlaylist);
        return playlist ? playlist.trackIds.includes(t.id) : false;
      }
      if (currentView === 'search' && searchQuery) {
          const q = searchQuery.toLowerCase();
          return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tracks, currentView, selectedArtist, selectedAlbum, searchQuery, selectedPlaylist, playlists]);

  const renderTrackList = (tracksToRender: Track[]) => (
    <div className="space-y-1 px-4">
      {tracksToRender.map((track, index) => {
        const isActive = currentTrack?.id === track.id;
        return (
          <div 
            key={track.id} 
            className={`group flex items-center gap-4 p-2.5 rounded-2xl transition-all hover:bg-[var(--card-hover)] cursor-pointer border border-transparent hover:border-[var(--glass-border)] ${isActive ? 'bg-[var(--card-bg)] border-[var(--glass-border)] shadow-xl' : ''}`} 
            onClick={() => onPlay(track, tracksToRender)}
          >
             <div className="w-6 text-[10px] font-black text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors text-center shrink-0">
                {isActive ? (
                  <div className="flex gap-0.5 items-end h-3 justify-center">
                    <div className="w-0.5 bg-[var(--text-main)] rounded-full animate-pulse h-[60%]"></div>
                    <div className="w-0.5 bg-[var(--text-main)] rounded-full animate-pulse h-full"></div>
                    <div className="w-0.5 bg-[var(--text-main)] rounded-full animate-pulse h-[80%]"></div>
                  </div>
                ) : (
                  index + 1
                )}
             </div>
             <div className="w-11 h-11 rounded-xl overflow-hidden relative shrink-0 shadow-lg border border-[var(--glass-border)] bg-[var(--card-bg)]">
                <img src={track.coverUrl} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23222'/%3E%3C/svg%3E")} />
                {isActive && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"><Play className="w-4 h-4 text-white fill-current" /></div>}
             </div>
             <div className="flex-1 min-w-0">
                <p 
                    className={`text-[13px] font-bold truncate transition-colors ${isActive ? '' : 'text-[var(--text-main)]/90 group-hover:text-[var(--text-main)]'}`} 
                    style={{ color: isActive ? accentColor : undefined }}
                >
                    {track.title}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] truncate font-semibold group-hover:text-[var(--text-main)]/50 transition-colors">
                    <span className="flex items-center">
                        {renderArtistLinks(track.artist)}
                    </span>
                    <span className="mx-0.5 opacity-30">•</span>
                    <span className="hover:text-[var(--text-main)]/80 transition-colors" onClick={(e) => { e.stopPropagation(); onGoToAlbum(track.album); }}>{track.album}</span>
                </div>
             </div>
             <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all md:translate-x-2 md:group-hover:translate-x-0 relative">
                <button className={`p-2 hover:bg-[var(--card-hover)] rounded-xl transition-all ${track.isLiked ? '' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} style={{ color: track.isLiked ? accentColor : undefined }} onClick={e => { e.stopPropagation(); onToggleLike(track.id, track); }}><Heart className={`w-3.5 h-3.5 ${track.isLiked ? 'fill-current' : ''}`} /></button>
                <div className="relative">
                  <button className="p-2 hover:bg-[var(--card-hover)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all" onClick={e => { e.stopPropagation(); setPlaylistMenuOpen(playlistMenuOpen === track.id ? null : track.id); }} title={t('add_to_playlist')}><ListMusic className="w-3.5 h-3.5" /></button>
                  {playlistMenuOpen === track.id && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                      <div className="p-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--glass-border)]">{t('add_to_playlist')}</div>
                      <div className="max-h-48 overflow-y-auto">
                        {playlists.length === 0 ? (
                          <div className="p-3 text-xs text-[var(--text-muted)] text-center">
                            {t('no_playlists')}
                            <button onClick={(e) => { e.stopPropagation(); if (onCreatePlaylist) onCreatePlaylist(); setPlaylistMenuOpen(null); }} className="block w-full mt-2 py-1.5 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--card-hover)] transition-colors">
                              {t('create_playlist')}
                            </button>
                          </div>
                        ) : (
                          playlists.map(p => (
                            <button 
                              key={p.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUpdatePlaylist) {
                                  const newTrackIds = p.trackIds.includes(track.id) 
                                    ? p.trackIds.filter(id => id !== track.id)
                                    : [...p.trackIds, track.id];
                                  onUpdatePlaylist(p.id, { trackIds: newTrackIds });
                                }
                                setPlaylistMenuOpen(null);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--card-hover)] transition-colors flex items-center justify-between"
                            >
                              <span className="truncate">{p.name}</span>
                              {p.trackIds.includes(track.id) && <Check className="w-3 h-3 text-green-500" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button className="p-2 hover:bg-[var(--card-hover)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all" onClick={e => { e.stopPropagation(); setEditingTrack(track); }} title={t('edit')}><Edit className="w-3.5 h-3.5" /></button>
                <button className="p-2 hover:bg-[var(--card-hover)] rounded-xl text-red-500/40 hover:text-red-500 transition-all" onClick={e => { e.stopPropagation(); onDeleteTrack(track.id); }} title={t('delete')}><Trash2 className="w-3.5 h-3.5" /></button>
             </div>
             <div className="w-12 text-[11px] font-bold text-[var(--text-muted)] text-right pr-2 group-hover:text-[var(--text-main)]/40 transition-colors">
                {formatTime(track.duration || 0)}
             </div>
          </div>
        );
      })}
    </div>
  );

  const topArtists = useMemo(() => {
    const artistCounts = new Map<string, number>();
    tracks.forEach(t => {
      const splitNames = t.artist.split(ARTIST_SPLIT_REGEX).map(n => n.trim()).filter(Boolean);
      splitNames.forEach(name => {
        artistCounts.set(name, (artistCounts.get(name) || 0) + (t.playCount || 0));
      });
    });
    return Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [tracks]);

  const favoriteTracks = useMemo(() => {
    return tracks.filter(t => t.isLiked).slice(0, 12);
  }, [tracks]);

  const recentlyAdded = useMemo(() => {
    return [...tracks].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 12);
  }, [tracks]);

  const selectedPlaylistData = useMemo(() => {
    return playlists.find(p => p.id === selectedPlaylist);
  }, [playlists, selectedPlaylist]);

  const renderView = () => {
    switch (currentView) {
      case 'listen_now':
        return (
          <div className="space-y-16 animate-fade-in px-4">
            {/* Top Artists Section */}
            {topArtists.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
                    {t('artists')}
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-8">
                  {topArtists.map((artist, i) => {
                    const meta = artistMetadata[artist];
                    return (
                      <div key={i} className="group cursor-pointer flex flex-col items-center text-center" onClick={() => onGoToArtist(artist)}>
                        <div className="w-full aspect-square rounded-full overflow-hidden shadow-2xl mb-4 relative border border-[var(--glass-border)] transition-all duration-500 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] bg-[var(--card-bg)]">
                          {meta?.avatar ? <img src={meta.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><User className="w-1/2 h-1/2" /></div>}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-8 h-8 text-white fill-current translate-y-2 group-hover:translate-y-0 transition-transform duration-500" />
                          </div>
                        </div>
                        <h3 className="text-[13px] font-bold truncate text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors w-full">{artist}</h3>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Favorite Tracks Section */}
            {favoriteTracks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
                    {t('favorites')}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-3">
                  {favoriteTracks.map((track) => {
                    const isActive = currentTrack?.id === track.id;
                    return (
                      <div key={track.id} className="group flex items-center gap-4 p-2 rounded-2xl hover:bg-[var(--card-hover)] cursor-pointer transition-all border border-transparent hover:border-[var(--glass-border)]" onClick={() => onPlay(track, favoriteTracks)}>
                        <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 shadow-xl border border-[var(--glass-border)] bg-[var(--card-bg)]">
                          <img src={track.coverUrl} className="w-full h-full object-cover" />
                          {isActive && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"><div className="w-1 h-3 bg-white animate-pulse rounded-full"></div></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold truncate text-[var(--text-main)]/90 group-hover:text-[var(--text-main)] transition-colors">{track.title}</p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate font-semibold group-hover:text-[var(--text-main)]/50 transition-colors">{track.artist}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Recently Added Section */}
            {recentlyAdded.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
                    {t('new_in_collection')}
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                  {recentlyAdded.map((track) => (
                    <div key={track.id} className="group cursor-pointer" onClick={() => onPlay(track, recentlyAdded)}>
                      <div className="aspect-square rounded-[24px] overflow-hidden shadow-2xl mb-4 relative border border-[var(--glass-border)] transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                        <img src={track.coverUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-500">
                          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                            <Play className="w-6 h-6 text-white fill-current" />
                          </div>
                        </div>
                      </div>
                      <h3 className="text-[13px] font-bold truncate text-[var(--text-main)]/90 group-hover:text-[var(--text-main)] transition-colors">{track.title}</h3>
                      <p className="text-[11px] text-[var(--text-muted)] truncate font-semibold group-hover:text-[var(--text-main)]/50 transition-colors">{track.artist}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tracks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 rounded-full bg-[var(--card-bg)] flex items-center justify-center mb-6">
                  <Music className="w-12 h-12 text-[var(--text-muted)]/10" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{t('library_empty')}</h3>
                <p className="text-[var(--text-muted)] max-w-xs">{t('import_tracks_hint')}</p>
              </div>
            )}
          </div>
        );

      case 'albums':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 stagger-list px-4">
            {albums.map((album, i) => (
              <div key={i} className="group cursor-pointer" onClick={() => onGoToAlbum(album.title)}>
                <div className="aspect-square rounded-[28px] overflow-hidden shadow-2xl mb-4 relative border border-[var(--glass-border)] transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] bg-[var(--card-bg)]">
                  <img src={album.cover} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = "")} />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-500">
                    <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-2xl flex items-center justify-center shadow-2xl border border-white/10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <Play className="w-7 h-7 text-white fill-current" />
                    </div>
                  </div>
                </div>
                <h3 className="text-[14px] font-bold truncate text-[var(--text-main)]/90 group-hover:text-[var(--text-main)] transition-colors">{album.title}</h3>
                <p className="text-[11px] text-[var(--text-muted)] truncate font-semibold group-hover:text-[var(--text-main)]/50 transition-colors">{album.artist}</p>
              </div>
            ))}
          </div>
        );

      case 'artists':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-10 stagger-list px-4">
            {artists.map((artist, i) => {
              const meta = artistMetadata[artist];
              return (
                <div key={i} className="group cursor-pointer flex flex-col items-center text-center" onClick={() => onGoToArtist(artist)}>
                  <div className="w-full aspect-square rounded-full overflow-hidden shadow-2xl mb-5 relative border border-[var(--glass-border)] transition-all duration-500 group-hover:scale-[1.05] group-hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] bg-[var(--card-bg)]">
                    {meta?.avatar ? <img src={meta.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><User className="w-1/2 h-1/2" /></div>}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-10 h-10 text-white fill-current translate-y-4 group-hover:translate-y-0 transition-transform duration-500" />
                    </div>
                  </div>
                  <h3 className="text-[14px] font-bold truncate text-[var(--text-main)]/90 group-hover:text-[var(--text-main)] transition-colors w-full">{artist}</h3>
                </div>
              );
            })}
          </div>
        );

      case 'artist_detail':
        const metaDetail = selectedArtist ? artistMetadata[selectedArtist] : null;
        return (
          <div className="animate-fade-in">
            <div className="relative h-[55vh] min-h-[450px] -mx-8 -mt-8 mb-12 group overflow-hidden">
                <div className="absolute inset-0">
                    {metaDetail?.banner ? (
                        <img src={metaDetail.banner} className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-1000" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                    <button 
                        onClick={() => artistBannerInputRef.current?.click()}
                        className="absolute top-8 right-8 p-3 rounded-2xl bg-black/40 backdrop-blur-xl text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-all border border-white/10 shadow-2xl"
                        title={t('change_banner')}
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    <input type="file" ref={artistBannerInputRef} className="hidden" accept="image/*" onChange={e => handleArtistAssetChange(e, 'banner')} />
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-12 flex flex-col md:flex-row items-center md:items-end gap-10">
                    <div className="w-56 h-56 rounded-[40px] border-4 border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative group/avatar bg-white/5 cursor-pointer shrink-0" onClick={() => artistAvatarInputRef.current?.click()}>
                        {metaDetail?.avatar ? (
                            <img src={metaDetail.avatar} className="w-full h-full object-cover transition-transform duration-700 group-hover/avatar:scale-110" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : null}
                        <User className="w-full h-full p-14 text-white/5 absolute inset-0 -z-1" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]"><Edit className="w-10 h-10 text-white" /></div>
                    </div>
                    <input type="file" ref={artistAvatarInputRef} className="hidden" accept="image/*" onChange={e => handleArtistAssetChange(e, 'avatar')} />
                    
                    <div className="flex-1 text-center md:text-left min-w-0 pb-4">
                        <div className="flex items-center justify-center md:justify-start gap-5 mb-4">
                            <h1 className="text-7xl font-black text-[var(--text-main)] tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] truncate">{selectedArtist}</h1>
                            <button 
                                onClick={handleRefreshArtistMetadata}
                                disabled={isRefreshingArtist}
                                className={`p-3 rounded-2xl bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-all border border-[var(--glass-border)] shadow-xl ${isRefreshingArtist ? 'animate-spin opacity-50' : ''}`}
                                title={t('refresh_metadata')}
                            >
                                <RefreshCw className="w-5 h-5 text-[var(--text-main)]" />
                            </button>
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-3">
                          <span className="px-3 py-1 rounded-full bg-[var(--card-bg)] border border-[var(--glass-border)] text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('artists')}</span>
                          <p className="text-[var(--text-muted)] font-bold text-sm tracking-tight">{filteredTracks.length} {t('songs')} {t('personalization')}</p>
                        </div>
                    </div>
                    <div className="flex gap-4 shrink-0 pb-4">
                        <button onClick={() => filteredTracks.length > 0 && onPlay(filteredTracks[0], filteredTracks)} className="bg-[var(--text-main)] text-[var(--bg-main)] px-10 py-4 rounded-[20px] font-black text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-2xl shadow-white/10"><Play className="w-5 h-5 fill-current" /> {t('listen_now')}</button>
                        <button onClick={() => onShuffleAll(filteredTracks)} className="bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--glass-border)] px-10 py-4 rounded-[20px] font-black text-sm hover:bg-[var(--card-hover)] transition-all text-[var(--text-main)]">{t('shuffle')}</button>
                    </div>
                </div>
            </div>

            {metaDetail?.bio && (
                <div className="px-4 mb-16 animate-slide-up">
                    <div className="relative overflow-hidden group rounded-[32px] bg-gradient-to-br from-[var(--card-bg)] to-transparent border border-[var(--glass-border)] p-8 md:p-12 shadow-2xl backdrop-blur-xl">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700 pointer-events-none">
                          <Quote className="w-64 h-64 text-[var(--text-main)]" />
                        </div>
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[var(--text-main)]/10 flex items-center justify-center">
                                    <User className="w-5 h-5 text-[var(--text-main)]" />
                                </div>
                                <div>
                                    <h3 className="text-[12px] uppercase tracking-[0.3em] text-[var(--text-main)] font-black">
                                        {t('bio')}
                                    </h3>
                                    <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1 uppercase tracking-wider">About the artist</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => translatedBio ? setTranslatedBio(null) : handleTranslateBio(metaDetail.bio!)}
                                className="px-5 py-2.5 rounded-full bg-[var(--text-main)]/5 hover:bg-[var(--text-main)]/10 text-[11px] uppercase tracking-widest font-black text-[var(--text-main)] transition-all border border-[var(--text-main)]/10 hover:border-[var(--text-main)]/20 shadow-lg flex items-center gap-2"
                            >
                                {isTranslatingBio ? (
                                    <><RefreshCw className="w-3 h-3 animate-spin" /> {t('searching')}</>
                                ) : (
                                    translatedBio ? t('original') : t('translate')
                                )}
                            </button>
                        </div>
                        
                        <div className="relative z-10">
                            <p className="text-[var(--text-main)]/80 text-[15px] md:text-[17px] leading-[1.8] font-medium whitespace-pre-wrap max-w-5xl">
                                {translatedBio || metaDetail.bio.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-8 px-4">
              <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">{t('popular_tracks')}</h2>
            </div>
            {renderTrackList(filteredTracks)}
          </div>
        );

      case 'album_detail':
        return (
            <div className="animate-fade-in">
                <div className="flex flex-col md:flex-row gap-12 mb-16 items-center md:items-end px-4">
                    <div className="w-72 h-72 rounded-[40px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10 shrink-0 bg-white/5 transition-transform duration-700 hover:scale-[1.02]">
                      <img src={filteredTracks[0]?.coverUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-center md:text-left min-w-0 pb-4">
                        <p className="text-[11px] uppercase tracking-[0.5em] text-[var(--text-muted)] mb-4 font-black">{t('albums')}</p>
                        <h1 className="text-6xl font-black text-[var(--text-main)] mb-6 tracking-tighter drop-shadow-2xl truncate">{selectedAlbum}</h1>
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-10">
                          <div className="w-8 h-8 rounded-full bg-[var(--card-bg)] overflow-hidden border border-[var(--glass-border)]">
                            {artistMetadata[filteredTracks[0]?.artist || ""]?.avatar ? (
                              <img src={artistMetadata[filteredTracks[0]?.artist || ""]?.avatar} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><User className="w-4 h-4" /></div>
                            )}
                          </div>
                          <p className="text-lg font-bold text-[var(--text-main)]/80 transition-colors hover:text-[var(--text-main)]">
                              {renderArtistLinks(filteredTracks[0]?.artist || "")}
                          </p>
                          <span className="text-[var(--text-muted)] font-black">•</span>
                          <p className="text-sm font-bold text-[var(--text-muted)]">{filteredTracks.length} {t('songs')}</p>
                        </div>
                        <div className="flex gap-4 justify-center md:justify-start">
                            <button onClick={() => filteredTracks.length > 0 && onPlay(filteredTracks[0], filteredTracks)} className="bg-[var(--text-main)] text-[var(--bg-main)] px-12 py-4 rounded-[20px] font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10 flex items-center gap-3"><Play className="w-5 h-5 fill-current" /> {t('listen_now')}</button>
                            <button onClick={() => onShuffleAll(filteredTracks)} className="bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--glass-border)] px-12 py-4 rounded-[20px] font-black text-sm hover:bg-[var(--card-hover)] transition-all text-[var(--text-main)]">{t('shuffle')}</button>
                        </div>
                    </div>
                </div>
                {renderTrackList(filteredTracks)}
            </div>
        );

      case 'playlist_detail':
        return (
            <div className="animate-fade-in">
                <div className="flex flex-col md:flex-row gap-12 mb-16 items-center md:items-end px-4">
                    <div className="w-72 h-72 rounded-[40px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10 shrink-0 bg-white/5 transition-transform duration-700 hover:scale-[1.02] flex items-center justify-center relative group">
                      {selectedPlaylistData?.coverUrl ? (
                        <img src={selectedPlaylistData.coverUrl} className="w-full h-full object-cover" />
                      ) : (
                        <ListMusic className="w-24 h-24 text-[var(--text-muted)]/30" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px] cursor-pointer" onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file && selectedPlaylist && onUpdatePlaylist) {
                            const url = await fileToDataURL(file);
                            onUpdatePlaylist(selectedPlaylist, { coverUrl: url });
                          }
                        };
                        input.click();
                      }}>
                        <Edit className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left min-w-0 pb-4">
                        <p className="text-[11px] uppercase tracking-[0.5em] text-[var(--text-muted)] mb-4 font-black">{t('playlist')}</p>
                        <h1 className="text-6xl font-black text-[var(--text-main)] mb-6 tracking-tighter drop-shadow-2xl truncate group relative flex items-center gap-4">
                          {selectedPlaylistData?.name}
                          <button onClick={() => {
                            const newName = window.prompt(t('enter_new_playlist_name'), selectedPlaylistData?.name);
                            if (newName && newName.trim() && selectedPlaylist && onUpdatePlaylist) {
                              onUpdatePlaylist(selectedPlaylist, { name: newName.trim() });
                            }
                          }} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full">
                            <Edit className="w-6 h-6 text-[var(--text-muted)] hover:text-[var(--text-main)]" />
                          </button>
                        </h1>
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-10">
                          <p className="text-sm font-bold text-[var(--text-muted)]">{filteredTracks.length} {t('songs')}</p>
                        </div>
                        <div className="flex gap-4 justify-center md:justify-start">
                            <button onClick={() => filteredTracks.length > 0 && onPlay(filteredTracks[0], filteredTracks)} className="bg-[var(--text-main)] text-[var(--bg-main)] px-12 py-4 rounded-[20px] font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10 flex items-center gap-3"><Play className="w-5 h-5 fill-current" /> {t('listen_now')}</button>
                            <button onClick={() => onShuffleAll(filteredTracks)} className="bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--glass-border)] px-12 py-4 rounded-[20px] font-black text-sm hover:bg-[var(--card-hover)] transition-all text-[var(--text-main)]">{t('shuffle')}</button>
                            <button onClick={() => onOpenSelectTracks?.()} className="bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--glass-border)] px-6 py-4 rounded-[20px] font-black text-sm hover:bg-[var(--card-hover)] transition-all text-[var(--text-main)]">{t('add_tracks')}</button>
                            <button onClick={() => {
                              if (window.confirm(t('delete_playlist_confirm'))) {
                                if (selectedPlaylist && onDeletePlaylist) onDeletePlaylist(selectedPlaylist);
                              }
                            }} className="bg-[var(--card-bg)] backdrop-blur-xl border border-red-500/30 text-red-500 px-6 py-4 rounded-[20px] font-black text-sm hover:bg-red-500/10 transition-all">{t('delete')}</button>
                        </div>
                    </div>
                </div>
                {filteredTracks.length === 0 ? (
                  <div className="text-center text-[var(--text-muted)] py-12">
                    <p className="mb-4">{t('no_tracks')}</p>
                    <button 
                      onClick={() => onOpenSelectTracks?.()}
                      className="px-6 py-3 rounded-2xl font-bold text-[var(--text-main)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--glass-border)] transition-all"
                    >
                      {t('add_tracks')}
                    </button>
                  </div>
                ) : (
                  renderTrackList(filteredTracks)
                )}
            </div>
        );

      case 'search':
        return (
          <div className="space-y-10">
            {filteredTracks.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 px-4 flex items-center gap-2">
                  <Music className="w-5 h-5" style={{ color: accentColor }} />
                  {t('your_library')}
                </h2>
                {renderTrackList(filteredTracks)}
              </section>
            )}
          </div>
        );

      case 'profile':
        const isBannerVideo = userProfile?.bannerUrl?.includes('video') || userProfile?.bannerUrl?.endsWith('.mp4') || userProfile?.bannerUrl?.endsWith('.webm');
        const isAvatarVideo = userProfile?.avatarUrl?.includes('video') || userProfile?.avatarUrl?.endsWith('.mp4') || userProfile?.avatarUrl?.endsWith('.webm');

        return (
            <div className="animate-fade-in space-y-12 max-w-5xl mx-auto pb-48">
                {/* Profile Header */}
                <div className="relative rounded-[40px] overflow-hidden border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-2xl group">
                    <div className="h-64 w-full relative bg-gradient-to-br from-[var(--accent-color)]/20 to-transparent">
                        {userProfile?.bannerUrl ? (
                            isBannerVideo ? (
                                <video src={userProfile.bannerUrl} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-50 mix-blend-overlay" />
                            ) : (
                                <img 
                                  src={userProfile.bannerUrl} 
                                  className="w-full h-full object-cover opacity-50 mix-blend-overlay" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/banner/1920/1080?blur=4';
                                  }}
                                />
                            )
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] to-transparent" />
                        <button 
                            onClick={() => bannerInputRef.current?.click()}
                            className="absolute top-6 right-6 p-3 rounded-2xl bg-black/40 border border-white/10 text-white/60 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md"
                            title="Change Banner"
                        >
                            <ImageIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="px-12 pb-12 relative -mt-24 flex flex-col md:flex-row items-center md:items-end gap-8">
                        <div className="w-48 h-48 rounded-full border-4 border-[var(--bg-main)] shadow-2xl overflow-hidden bg-[var(--card-bg)] shrink-0 relative group/avatar">
                            {userProfile?.avatarUrl ? (
                                isAvatarVideo ? (
                                    <video src={userProfile.avatarUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                ) : (
                                    <img 
                                      src={userProfile.avatarUrl} 
                                      className="w-full h-full object-cover" 
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=random&size=256`;
                                      }}
                                    />
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                    <User className="w-20 h-20" />
                                </div>
                            )}
                            <button 
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm"
                            >
                                <Upload className="w-8 h-8 text-white" />
                            </button>
                        </div>
                        <div className="flex-1 text-center md:text-left mb-4">
                            <h1 className="text-5xl font-black text-[var(--text-main)] tracking-tight mb-2">{userProfile?.name || 'User'}</h1>
                            <p className="text-[var(--text-muted)] font-medium tracking-widest uppercase text-sm">Music Lover</p>
                        </div>
                    </div>
                </div>

                <input 
                    type="file" 
                    ref={avatarInputRef} 
                    className="hidden" 
                    accept="image/*,video/*,.gif" 
                    onChange={(e) => handleProfileFileSelect(e, 'avatar')} 
                />
                <input 
                    type="file" 
                    ref={bannerInputRef} 
                    className="hidden" 
                    accept="image/*,video/*,.gif" 
                    onChange={(e) => handleProfileFileSelect(e, 'banner')} 
                />

                <AnimatePresence>
                  {editingFile && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-[var(--card-bg)] border border-white/10 rounded-[40px] p-8 max-w-2xl w-full shadow-2xl"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-[var(--text-main)]">
                            {editingFile.type === 'avatar' ? 'Настройка аватара' : 'Настройка фона'}
                          </h2>
                          <button onClick={() => setEditingFile(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <X className="w-6 h-6 text-[var(--text-muted)]" />
                          </button>
                        </div>

                        <div className={`relative overflow-hidden bg-black/20 rounded-3xl mb-8 ${editingFile.type === 'avatar' ? 'aspect-square max-w-sm mx-auto rounded-full' : 'aspect-video'}`}>
                          {editingFile.fileType.includes('video') ? (
                            <video 
                              src={editingFile.url} 
                              autoPlay 
                              loop 
                              muted 
                              className="w-full h-full object-cover"
                              style={{ objectPosition: editingFile.type === 'avatar' ? 'center' : `center ${position}%` }}
                            />
                          ) : (
                            <img 
                              src={editingFile.url} 
                              className="w-full h-full object-cover"
                              style={{ objectPosition: editingFile.type === 'avatar' ? 'center' : `center ${position}%` }}
                            />
                          )}
                        </div>

                        {editingFile.type === 'banner' && (
                          <div className="mb-8">
                            <div className="flex justify-between mb-4">
                              <label className="text-sm font-medium text-[var(--text-muted)]">
                                Позиция по вертикали
                              </label>
                              <span className="text-sm font-bold text-[var(--accent-color)]">{position}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={position}
                              onChange={(e) => setPosition(parseInt(e.target.value))}
                              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>
                        )}

                        <div className="flex gap-4">
                          <button 
                            onClick={() => setEditingFile(null)}
                            className="flex-1 py-4 rounded-2xl font-bold text-[var(--text-main)] bg-white/5 hover:bg-white/10 transition-all"
                          >
                            Отмена
                          </button>
                          <button 
                            onClick={handleSaveProfileEdit}
                            className="flex-1 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/20"
                          >
                            Сохранить
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-[32px] p-8 flex flex-col items-center justify-center text-center shadow-xl hover:scale-[1.02] transition-transform">
                        <div className="w-16 h-16 rounded-full bg-[var(--accent-color)]/10 flex items-center justify-center mb-6 text-[var(--accent-color)]">
                            <Play className="w-8 h-8 fill-current" />
                        </div>
                        <h3 className="text-4xl font-black text-[var(--text-main)] mb-2">{userProfile?.stats?.totalListens || 0}</h3>
                        <p className="text-[var(--text-muted)] font-medium tracking-widest uppercase text-xs">Total Listens</p>
                    </div>
                    <div className="bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-[32px] p-8 flex flex-col items-center justify-center text-center shadow-xl hover:scale-[1.02] transition-transform">
                        <div className="w-16 h-16 rounded-full bg-[var(--accent-color)]/10 flex items-center justify-center mb-6 text-[var(--accent-color)]">
                            <Timer className="w-8 h-8" />
                        </div>
                        <h3 className="text-4xl font-black text-[var(--text-main)] mb-2">{Math.floor((userProfile?.stats?.listeningTime || 0) / 60)}</h3>
                        <p className="text-[var(--text-muted)] font-medium tracking-widest uppercase text-xs">Minutes Listened</p>
                    </div>
                    <div className="bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-[32px] p-8 flex flex-col items-center justify-center text-center shadow-xl hover:scale-[1.02] transition-transform">
                        <div className="w-16 h-16 rounded-full bg-[var(--accent-color)]/10 flex items-center justify-center mb-6 text-[var(--accent-color)]">
                            <Heart className="w-8 h-8 fill-current" />
                        </div>
                        <h3 className="text-4xl font-black text-[var(--text-main)] mb-2">{tracks.filter(t => t.isLiked).length}</h3>
                        <p className="text-[var(--text-muted)] font-medium tracking-widest uppercase text-xs">Favorite Tracks</p>
                    </div>
                </div>
            </div>
        );

      default:
        return renderTrackList(filteredTracks);
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case 'listen_now': return t('listen_now');
      case 'albums': return t('albums');
      case 'artists': return t('artists');
      case 'songs': return t('songs');
      case 'favorites': return t('favorites');
      case 'search': return searchQuery ? `${t('search')}: ${searchQuery}` : t('search');
      case 'playlist_detail': return selectedPlaylistData?.name || t('playlist');
      default: return '';
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto pb-48 pt-8 px-8 custom-scrollbar relative animate-fade-in" key={currentView}>
      {editingTrack && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-fade-in-view">
             <div className="bg-[var(--bg-main)] border border-[var(--glass-border)] w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden animate-zoom-in flex flex-col max-h-[95vh]">
                <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-[var(--card-bg)]">
                    <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">{t('edit')}
                        <button type="button" onClick={handleFetchMetadata} disabled={isSearchingMetadata} className={`ml-4 px-3 py-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--card-hover)] flex items-center gap-2 text-xs font-bold transition-all ${isSearchingMetadata ? 'opacity-50' : ''}`}>
                            {isSearchingMetadata ? t('searching') : '✨ ' + t('magic_api')}
                        </button>
                    </h3>
                    <button onClick={() => setEditingTrack(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2 transition-colors"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (editingTrack) onUpdateTrack(editingTrack.id, editingTrack); setEditingTrack(null); }} className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    <div className="flex flex-col md:flex-row gap-10">
                        <div className="flex flex-col items-center gap-4 shrink-0">
                            <div className="w-56 h-56 rounded-3xl bg-[var(--card-bg)] border border-[var(--glass-border)] relative overflow-hidden group cursor-pointer shadow-2xl" onClick={() => coverInputRef.current?.click()}>
                                <img src={editingTrack.coverUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="w-10 h-10 text-white" /></div>
                            </div>
                            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={async e => {
                                const f = e.target.files?.[0]; if (f) setEditingTrack({...editingTrack, coverUrl: await fileToDataURL(f)});
                            }} />
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">{t('click_to_change')}</p>
                        </div>
                        <div className="flex-1 space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase ml-2">{t('songs')}</label>
                                <input type="text" value={editingTrack.title} onChange={e => setEditingTrack({...editingTrack, title: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3 text-lg font-bold text-[var(--text-main)]" placeholder={t('songs')} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase ml-2">{t('artists')}</label>
                                    <input type="text" value={editingTrack.artist === "Неизвестный артист" || editingTrack.artist === "Unknown Artist" ? "" : editingTrack.artist} onChange={e => setEditingTrack({...editingTrack, artist: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3 text-[var(--text-main)]" placeholder={t('artists')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase ml-2">{t('albums')}</label>
                                    <input type="text" value={editingTrack.album === "Локальный импорт" || editingTrack.album === "Local Import" ? "" : editingTrack.album} onChange={e => setEditingTrack({...editingTrack, album: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3 text-[var(--text-main)]" placeholder={t('albums')} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase ml-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('year')}</label>
                                    <input type="text" value={editingTrack.year || ""} onChange={e => setEditingTrack({...editingTrack, year: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3 text-[var(--text-main)]" placeholder="2024" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase ml-2 flex items-center gap-1"><Quote className="w-3 h-3" /> {t('lyrics')}</label>
                                <textarea 
                                    value={editingTrack.lyrics || ""} 
                                    onChange={e => setEditingTrack({...editingTrack, lyrics: e.target.value})} 
                                    className="w-full glass-input rounded-xl px-4 py-3 h-48 resize-none font-medium text-sm leading-relaxed text-[var(--text-main)]" 
                                    placeholder={t('lyrics')}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-[var(--bg-main)] py-6 border-t border-[var(--glass-border)]">
                         <button type="button" onClick={() => setEditingTrack(null)} className="px-8 py-3 text-[var(--text-muted)] font-bold hover:text-[var(--text-main)] transition-colors">{t('cancel')}</button>
                         <button type="submit" className="px-12 py-3 rounded-2xl text-white font-bold shadow-xl hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: accentColor }}>{t('save')}</button>
                    </div>
                </form>
             </div>
        </div>
      )}

      {currentView !== 'artist_detail' && currentView !== 'album_detail' && (
          <div className="flex items-end justify-between mb-12 px-4">
              <div><h1 className="text-5xl md:text-6xl font-black text-[var(--text-main)] tracking-tighter">{getTitle()}</h1></div>
          </div>
      )}

      {(currentView === 'artist_detail' || currentView === 'album_detail') && (
          <button onClick={onBack} className={`mb-8 p-4 ${enableGlass ? 'bg-white/5 backdrop-blur-2xl' : 'bg-[var(--bg-main-transparent)]'} hover:bg-white/10 rounded-2xl transition-all sticky top-4 z-[100] border border-[var(--glass-border)] mx-4 shadow-2xl group`}>
              <ArrowLeft className="w-6 h-6 text-[var(--text-main)] group-hover:-translate-x-1 transition-transform" />
          </button>
      )}

      <div className="min-h-[50vh]">{renderView()}</div>
    </div>
  );
};

export default MainView;
