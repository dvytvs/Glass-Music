
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import { Track, PlaybackState, ViewType, ArtistMetadata } from '../types';
import { TranslationKey } from '../translations';
import { 
  Play, Pause, Music, Disc, Mic2, Edit, Trash2, ArrowLeft, Heart, 
  Upload, X, Check, Quote, Image as ImageIcon, Search, MoreHorizontal, User, Calendar, RefreshCw, ListMusic, Timer, Shuffle, ChevronDown, ChevronRight,
  Sparkles, Layers, Flame, Grid, List
} from './Icons';
import { formatTime, fileToDataURL, fetchLyricsFromLRCLIB, isJunkLyrics } from '../utils';

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
  playerStyle?: 'floating' | 'classic' | 'split';
  playerDock?: 'bottom' | 'top' | 'left' | 'right';
}

const ARTIST_SPLIT_REGEX = /\s*(?:,|;|feat\.?|ft\.?|&|\/|featuring)\s+/i;

const MainView: React.FC<MainViewProps> = React.memo(({ 
  tracks, currentTrack, playbackState, onPlay, onShuffleAll, currentView, 
  selectedArtist, selectedAlbum, onUpdateTrack, onDeleteTrack, onGoToArtist, onGoToAlbum, onBack, accentColor,
  artistMetadata = {}, onUpdateArtist, searchQuery = "", onRequestFileUnlock,
  onToggleLike, enableGlass = true, t, onTranslate, playlists = [], selectedPlaylist, onUpdatePlaylist, onDeletePlaylist, onCreatePlaylist, onChangeView, onOpenSelectTracks, userProfile, onUpdateProfile, playerStyle = 'classic', playerDock = 'bottom'
}) => {
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [isTranslatingBio, setIsTranslatingBio] = useState(false);

  const [playlistMenuOpen, setPlaylistMenuOpen] = useState<string | null>(null);
  const [showAllPopularTracks, setShowAllPopularTracks] = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);
  const [sortOption, setSortOption] = useState<'default' | 'title_asc' | 'title_desc' | 'date_desc' | 'date_asc' | 'duration_desc' | 'duration_asc'>('default');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [trackViewMode, setTrackViewMode] = useState<'list' | 'grid'>('list');
  const [homeFilter, setHomeFilter] = useState<'all' | 'liked' | 'recent' | 'flac'>('all');

  const handleTranslateBio = async (text: string) => {
    if (isTranslatingBio) return;
    setIsTranslatingBio(true);
    const translated = await onTranslate(text);
    setTranslatedBio(translated);
    setIsTranslatingBio(false);
  };

  useEffect(() => {
    setTranslatedBio(null);
    
     
    const isDesktop = () => (window as any).require !== undefined;
    if (selectedArtist && currentView === 'artist_detail' && isDesktop() && onUpdateArtist) {
      const meta = artistMetadata[selectedArtist];
      
      const isBadLastFmImage = (url: string | undefined) => url && (url.includes('last.fm') || url.includes('2a96cbd8b46e442fc41c2b86b821562f'));
      
      if (!meta || (!meta.avatar && !meta.banner && !meta.bio) || isBadLastFmImage(meta.avatar) || isBadLastFmImage(meta.banner)) {
        const fetchMeta = async () => {
          setIsRefreshingArtist(true);
          try {
            const ipcRenderer = (window as any).require('electron').ipcRenderer;
            const newMeta = await ipcRenderer.invoke('get-artist-metadata', { artist: selectedArtist, lastfmKey: import.meta.env.VITE_LASTFM_API_KEY });
            if (newMeta) onUpdateArtist(selectedArtist, newMeta as any);
          } catch (e) { console.error(e); } finally { setIsRefreshingArtist(false); }
        };
        fetchMeta();
      }
    }
  }, [selectedArtist, currentView]);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [isRefreshingArtist, setIsRefreshingArtist] = useState(false);
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);
  const artistAvatarInputRef = useRef<HTMLInputElement>(null);
  const artistBannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const scrollPositions = useRef<Record<string, number>>({});
  const virtuosoIndices = useRef<Record<string, number>>({});
  
  const isListView = !['artist_detail', 'album_detail', 'playlist_detail', 'profile'].includes(currentView);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isListView) {
      scrollPositions.current[currentView] = e.currentTarget.scrollTop;
    }
  };

  useEffect(() => {
    if (scrollParentRef.current) {
      const saved = isListView ? (scrollPositions.current[currentView] || 0) : 0;
      
      let attempts = 0;
      const tryScroll = () => {
        if (!scrollParentRef.current) return;
        
        scrollParentRef.current.scrollTo({ top: saved, behavior: 'instant' });
        
         
        if (saved > 0 && scrollParentRef.current.scrollTop < saved && attempts < 50) {
          attempts++;
          setTimeout(tryScroll, 20);
        }
      };
      
      tryScroll();
    }
  }, [currentView, selectedArtist, selectedAlbum, selectedPlaylist]);

  const [editingFile, setEditingFile] = useState<{ url: string, type: 'avatar' | 'banner', fileType: string } | null>(null);
  const [position, setPosition] = useState(50);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  const handleProfileFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const isDesktop = () => (window as any).require !== undefined;
      if (isDesktop() && (file as any).path) {
        const url = `file://${encodeURI((file as any).path.replace(/\\/g, '/'))}`;
        setEditingFile({ url, type, fileType: file.type });
        setPosition(50);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          setEditingFile({ url, type, fileType: file.type });
          setPosition(50);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSaveProfileEdit = async () => {
    if (editingFile && onUpdateProfile) {
      let finalUrl = editingFile.url;
      const field = editingFile.type === 'avatar' ? 'avatarUrl' : 'bannerUrl';
      const isDesktop = () => (window as any).require !== undefined;
      if (typeof window !== 'undefined' && isDesktop() && editingFile.url.startsWith('data:image')) {
          try {
              const ipcRenderer = (window as any).require('electron').ipcRenderer;
              let ext = 'png';
              if (editingFile.fileType) {
                  ext = editingFile.fileType.split('/')[1] || 'png';
              }
              const res: any = await ipcRenderer.invoke('save-custom-image', {
                  folder: 'custom-images/user',
                  filename: `user_${editingFile.type}_${Date.now()}.${ext}`,
                  base64Data: editingFile.url
              });
              if (res && res.success) {
                  finalUrl = res.url;
              }
          } catch (err) { console.error("Failed to save user image via Electron IPC", err); }
      }
      onUpdateProfile({ [field]: finalUrl });
      setEditingFile(null);
    }
  };

  const handleFetchMetadata = async () => {
    const isDesktop = () => (window as any).require !== undefined;
    if (!editingTrack || !isDesktop()) return;
    setIsSearchingMetadata(true);
    try {
        const ipcRenderer = (window as any).require('electron').ipcRenderer;
        const query = `${editingTrack.title} ${editingTrack.artist}`;
        const result: any = await ipcRenderer.invoke('get-metadata', { query });
        if (result) {
            setEditingTrack({
                ...editingTrack,
                title: result.title || editingTrack.title,
                artist: result.artist || editingTrack.artist,
                album: result.album || editingTrack.album,
                albumArtist: result.albumArtist || editingTrack.albumArtist,
                year: result.year || editingTrack.year,
                coverUrl: result.cover || editingTrack.coverUrl
            });
        }
    } catch (e) { console.error(e); } finally { setIsSearchingMetadata(false); }
  };

  const handleRefreshArtistMetadata = async () => {
    const isDesktop = () => (window as any).require !== undefined;
    if (!selectedArtist || !isDesktop() || !onUpdateArtist) return;
    setIsRefreshingArtist(true);
    try {
        const ipcRenderer = (window as any).require('electron').ipcRenderer;
        const meta = await ipcRenderer.invoke('get-artist-metadata', { artist: selectedArtist, lastfmKey: import.meta.env.VITE_LASTFM_API_KEY });
        if (meta) onUpdateArtist(selectedArtist, meta as Partial<ArtistMetadata>);
    } catch (e) { console.error(e); } finally { setIsRefreshingArtist(false); }
  };
  const handleArtistAssetChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file && selectedArtist && onUpdateArtist) {
        const url = await fileToDataURL(file);
        const isDesktop = () => (window as any).require !== undefined;
        if (typeof window !== 'undefined' && isDesktop()) {
            try {
                const ipcRenderer = (window as any).require('electron').ipcRenderer;
                const safeName = selectedArtist.replace(/[/\\?%*:|"<>]/g, '_');
                const ext = file.name.split('.').pop() || 'png';
                const res: any = await ipcRenderer.invoke('save-custom-image', {
                    folder: 'custom-images/artists',
                    filename: `${safeName}_${type}_${Date.now()}.${ext}`,
                    base64Data: url
                });
                if (res && res.success) {
                    const convertedUrl = res.url;
                    onUpdateArtist(selectedArtist, { [type]: convertedUrl }, true);
                    return;
                }
            } catch (err) { console.error("Failed to save artist asset via Electron IPC", err); }
        }
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
    const map = new Map<string, { title: string, artist: string, cover: string, year?: string, artists: Set<string> }>();
    tracks.forEach(t => {
      const key = t.album;
      if (!map.has(key)) {
        map.set(key, { 
            title: t.album, 
            artist: t.albumArtist || t.artist, 
            cover: t.coverUrl, 
            year: t.year,
            artists: new Set([t.artist])
        });
      } else {
        const existing = map.get(key)!;
        existing.artists.add(t.artist);
        if (t.albumArtist && existing.artist !== t.albumArtist) {
            existing.artist = t.albumArtist;
        } else if (!t.albumArtist && existing.artists.size > 1 && !existing.artist.includes("Various")) {
            existing.artist = "Various Artists";
        }
        if (!existing.cover || existing.cover.includes('default')) {
            existing.cover = t.coverUrl;
        }
      }
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
    let result = tracks.filter(t => {
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

    if (sortOption !== 'default') {
      result = [...result].sort((a, b) => {
        switch (sortOption) {
          case 'title_asc': return a.title.localeCompare(b.title);
          case 'title_desc': return b.title.localeCompare(a.title);
          case 'date_desc': return (b.addedAt || 0) - (a.addedAt || 0);
          case 'date_asc': return (a.addedAt || 0) - (b.addedAt || 0);
          case 'duration_desc': return b.duration - a.duration;
          case 'duration_asc': return a.duration - b.duration;
          default: return 0;
        }
      });
    }
    return result;
  }, [tracks, currentView, selectedArtist, selectedAlbum, searchQuery, selectedPlaylist, playlists, sortOption]);

  const renderTrackList = (tracksToRender: Track[], contextTracks: Track[] = tracksToRender) => {
    const isGrid = trackViewMode === 'grid';
    
    const viewSwitcher = (
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-xs font-semibold text-[var(--text-muted)] tracking-wide">{tracksToRender.length} tracks</p>
        <div className="relative flex items-center bg-[var(--card-bg)] p-1 rounded-full border border-[var(--glass-border)] shadow-sm">
          <button 
            onClick={() => setTrackViewMode('list')}
            className={`relative z-10 p-1.5 px-2.5 rounded-full transition-colors duration-200 flex items-center justify-center ${trackViewMode === 'list' ? 'text-white font-bold' : 'text-[var(--text-muted)] hover:text-white'}`}
            title="List View"
          >
            <List className="w-4 h-4" />
            {trackViewMode === 'list' && (
              <motion.div 
                layoutId="trackViewModePill"
                className="absolute inset-0 bg-white/20 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
          </button>
          <button 
            onClick={() => setTrackViewMode('grid')}
            className={`relative z-10 p-1.5 px-2.5 rounded-full transition-colors duration-200 flex items-center justify-center ${trackViewMode === 'grid' ? 'text-white font-bold' : 'text-[var(--text-muted)] hover:text-white'}`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
            {trackViewMode === 'grid' && (
              <motion.div 
                layoutId="trackViewModePill"
                className="absolute inset-0 bg-white/20 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
          </button>
        </div>
      </div>
    );

    if (isGrid) {
      return (
        <div className="w-full">
          {viewSwitcher}
          <motion.div 
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
          >
            {tracksToRender.map((track) => {
              const isActive = currentTrack?.id === track.id;
              const isCurrentlyPlaying = isActive && playbackState === PlaybackState.PLAYING;
              return (
                <motion.div 
                  key={track.id}
                  whileHover={{ y: -4 }}
                  onClick={() => onPlay(track, contextTracks)}
                  className={`group relative flex flex-col p-3 rounded-3xl transition-all cursor-pointer border ${isActive ? 'bg-[var(--card-bg)] border-[var(--glass-border)] shadow-xl' : 'bg-white/[0.02] hover:bg-[var(--card-hover)] border-transparent'}`}
                >
                  <div className="w-full aspect-square rounded-2xl overflow-hidden mb-3 relative shadow-lg group-hover:shadow-2xl transition-all bg-[var(--card-bg)]">
                    <img 
                      src={track.coverUrl} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      onError={(e) => (e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23222'/%3E%3C/svg%3E")}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-none">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl text-black transition-transform duration-300 scale-90 group-hover:scale-100"
                        style={{ backgroundColor: accentColor || 'white', color: accentColor !== '#ffffff' ? 'white' : 'black' }}
                      >
                        {isCurrentlyPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleLike(track.id, track); }}
                      className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-none transition-all ${track.isLiked ? 'bg-black/60 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100 text-white/70 hover:text-white'}`}
                      style={{ color: track.isLiked ? accentColor : undefined }}
                    >
                      <Heart className={`w-4 h-4 ${track.isLiked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <h4 
                    className="font-bold text-sm truncate text-[var(--text-main)] mb-0.5 hover:underline cursor-pointer" 
                    style={{ color: isActive ? accentColor : undefined }}
                    onClick={(e) => { e.stopPropagation(); onGoToAlbum(track.album); }}
                    title={track.title}
                  >
                    {track.title}
                  </h4>
                  <div className="text-xs text-[var(--text-muted)] truncate font-medium">
                    {renderArtistLinks(track.artist)}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      );
    }

    return (
      <div className="w-full">
        {viewSwitcher}

        <div className="flex items-center gap-4 px-4 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--glass-border)] mb-2">
          <div className="w-8 text-center">#</div>
          <div className="flex-1 min-w-0">{t('track_title')}</div>
          <div className="hidden md:block w-1/4 min-w-[120px]">{t('album_title')}</div>
          <div className="hidden lg:block w-32">{t('year')}</div>
          <div className="w-32 text-right pr-4"><Timer className="w-4 h-4 inline-block" /></div>
        </div>
        
        <div className="space-y-1">
          <Virtuoso
            useWindowScroll={false}
            customScrollParent={scrollParentRef.current || undefined}
            initialTopMostItemIndex={virtuosoIndices.current[currentView] || 0}
            rangeChanged={(range) => {
              virtuosoIndices.current[currentView] = range.startIndex;
            }}
            data={tracksToRender}
            itemContent={(index, track) => {
              const isActive = currentTrack?.id === track.id;
              const isCurrentlyPlaying = isActive && playbackState === PlaybackState.PLAYING;
              return (
                <div 
                  key={track.id} 
                  className={`group flex items-center gap-4 px-4 py-2.5 rounded-2xl transition-all duration-200 hover:bg-[var(--card-hover)] cursor-pointer ${isActive ? 'bg-[var(--card-bg)] border border-[var(--glass-border)] shadow-sm' : 'border border-transparent'} mb-1`} 
                  onClick={() => onPlay(track, contextTracks)}
                >
                   <div className="w-8 text-sm font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors text-center shrink-0 flex items-center justify-center">
                      {isActive ? (
                        <div className="flex gap-[3px] items-end h-4 justify-center w-5">
                          <div 
                            className={`w-[3px] rounded-full ${isCurrentlyPlaying ? 'eq-bar-1' : 'h-[30%]'}`}
                            style={{ backgroundColor: accentColor || 'var(--text-main)' }}
                          />
                          <div 
                            className={`w-[3px] rounded-full ${isCurrentlyPlaying ? 'eq-bar-2' : 'h-[70%]'}`}
                            style={{ backgroundColor: accentColor || 'var(--text-main)' }}
                          />
                          <div 
                            className={`w-[3px] rounded-full ${isCurrentlyPlaying ? 'eq-bar-3' : 'h-[40%]'}`}
                            style={{ backgroundColor: accentColor || 'var(--text-main)' }}
                          />
                          <div 
                            className={`w-[3px] rounded-full ${isCurrentlyPlaying ? 'eq-bar-4' : 'h-[85%]'}`}
                            style={{ backgroundColor: accentColor || 'var(--text-main)' }}
                          />
                        </div>
                      ) : (
                        <>
                          <span className="group-hover:hidden tabular-nums">{index + 1}</span>
                          <Play className="w-4 h-4 hidden group-hover:inline-block fill-current" />
                        </>
                      )}
                   </div>
                   
                   <div className="flex-1 min-w-0 flex items-center gap-3.5">
                     <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-[var(--card-bg)] shadow-md border border-white/10 relative group/thumb">
                        <img 
                          src={track.coverUrl} 
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300" 
                          onError={(e) => (e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23222'/%3E%3C/svg%3E")} 
                        />
                     </div>
                     <div className="flex flex-col min-w-0">
                        <p 
                            className={`text-sm font-semibold truncate transition-colors hover:underline cursor-pointer ${isActive ? '' : 'text-[var(--text-main)]'}`} 
                            style={{ color: isActive ? accentColor : undefined }}
                            onClick={(e) => { e.stopPropagation(); onGoToAlbum(track.album); }}
                            title={track.title}
                        >
                            {track.title}
                        </p>
                        <div className="text-xs text-[var(--text-muted)] truncate group-hover:text-[var(--text-main)] transition-colors mt-0.5">
                            {renderArtistLinks(track.artist)}
                        </div>
                     </div>
                   </div>

                   <div className="hidden md:block w-1/4 min-w-[120px] text-sm text-[var(--text-muted)] truncate group-hover:text-[var(--text-main)] transition-colors">
                     <span className="hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); onGoToAlbum(track.album); }}>{track.album}</span>
                   </div>

                   <div className="hidden lg:block w-32 text-sm text-[var(--text-muted)] truncate tabular-nums">
                     {track.year || ''}
                   </div>

                   <div className="flex items-center justify-end gap-2 w-32 shrink-0">
                     <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className={`p-2 hover:bg-white/10 rounded-full transition-all ${track.isLiked ? 'opacity-100' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} 
                          style={{ color: track.isLiked ? accentColor : undefined }} 
                          onClick={e => { e.stopPropagation(); onToggleLike(track.id, track); }}
                        >
                          <Heart className={`w-4 h-4 ${track.isLiked ? 'fill-current' : ''}`} />
                        </button>
                        <div className="relative">
                          <button 
                            className="p-2 hover:bg-white/10 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all" 
                            onClick={e => { e.stopPropagation(); setPlaylistMenuOpen(playlistMenuOpen === track.id ? null : track.id); }} 
                            title={t('add_to_playlist')}
                          >
                            <ListMusic className="w-4 h-4" />
                          </button>
                          {playlistMenuOpen === track.id && (
                            <div className="absolute right-0 bottom-full mb-2 w-52 bg-[var(--sidebar-bg)] backdrop-blur-none border border-[var(--glass-border)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden z-50 animate-fade-in p-1">
                              <div className="px-3 py-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--glass-border)]">{t('add_to_playlist')}</div>
                              <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                                {playlists.length === 0 ? (
                                  <div className="p-3 text-xs text-[var(--text-muted)] text-center">
                                    {t('no_playlists')}
                                    <button onClick={(e) => { e.stopPropagation(); if (onCreatePlaylist) onCreatePlaylist(); setPlaylistMenuOpen(null); }} className="block w-full mt-2 py-1.5 rounded-xl border border-[var(--glass-border)] hover:bg-[var(--card-hover)] transition-colors text-xs font-semibold">
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
                                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-[var(--text-main)] hover:bg-[var(--card-hover)] transition-colors flex items-center justify-between font-medium"
                                    >
                                      <span className="truncate">{p.name}</span>
                                      {p.trackIds.includes(track.id) && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button className="p-2 hover:bg-white/10 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all" onClick={e => { e.stopPropagation(); setEditingTrack(track); }} title={t('edit')}><Edit className="w-4 h-4" /></button>
                        <button className="p-2 hover:bg-white/10 rounded-full text-[var(--text-muted)] hover:text-red-400 transition-all" onClick={e => { e.stopPropagation(); onDeleteTrack(track.id); }} title={t('delete')}><Trash2 className="w-4 h-4" /></button>
                     </div>
                     
                     <div className="w-12 text-sm font-medium text-[var(--text-muted)] text-right pr-2 tabular-nums">
                        {formatTime(track.duration || 0)}
                     </div>
                   </div>
                </div>
              );
            }}
          />
        </div>
      </div>
    );
  };

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
      case 'listen_now': {
        const hour = new Date().getHours();
        let greeting = t('good_evening');
        if (hour >= 5 && hour < 12) greeting = t('good_morning');
        else if (hour >= 12 && hour < 18) greeting = t('good_afternoon');

        const topTrack = favoriteTracks[0] || recentlyAdded[0] || tracks[0];

        const displayedTracks = homeFilter === 'liked' 
          ? favoriteTracks 
          : homeFilter === 'flac' 
          ? tracks.filter(t => ((t.fileUrl || t.path || '').endsWith('.flac') || (t.fileUrl || t.path || '').endsWith('.wav') || t.title.toLowerCase().includes('flac'))).slice(0, 18)
          : homeFilter === 'recent'
          ? recentlyAdded
          : recentlyAdded.slice(0, 18);

        return (
          <div className="space-y-8 animate-fade-in px-2 md:px-4 pb-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-[var(--text-main)] tracking-tight mb-1.5">
                  {greeting}
                </h1>
                <p className="text-sm md:text-base text-[var(--text-muted)] font-medium">{t('personal_space_subtitle')}</p>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all', label: t('all_music'), icon: Sparkles },
                  { id: 'liked', label: t('liked_tracks'), icon: Heart },
                  { id: 'flac', label: t('lossless_hires'), icon: Disc },
                  { id: 'recent', label: t('recently_added'), icon: Timer }
                ].map((chip) => {
                  const ChipIcon = chip.icon;
                  const isSelected = homeFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      onClick={() => setHomeFilter(chip.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all border shrink-0 ${
                        isSelected 
                          ? 'bg-white text-black border-white shadow-lg' 
                          : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-hover)] border-[var(--glass-border)]'
                      }`}
                      style={isSelected && accentColor !== '#ffffff' ? { backgroundColor: accentColor, color: '#ffffff', borderColor: accentColor } : undefined}
                    >
                      <ChipIcon className={`w-3.5 h-3.5 ${isSelected ? 'fill-current' : ''}`} />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {topTrack && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div 
                  className="lg:col-span-2 relative min-h-[220px] md:h-[260px] rounded-3xl overflow-hidden group cursor-pointer shadow-xl border border-[var(--glass-border)] flex flex-col justify-end p-6 md:p-8 bg-gradient-to-r from-white/[0.07] via-white/[0.03] to-transparent hover:border-white/20 transition-all duration-300"
                  onClick={() => onPlay(topTrack, tracks)}
                >
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-5">
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden shadow-2xl shrink-0 border border-white/20 relative group-hover:scale-105 transition-transform duration-300 bg-black/40">
                        {topTrack.coverUrl ? (
                          <img src={topTrack.coverUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center"><Music className="w-10 h-10 text-white/40" /></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="uppercase tracking-wider text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                            {t('featured_track')}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {t('studio_master')}
                          </span>
                        </div>
                        <h2 className="text-xl md:text-3xl font-black text-[var(--text-main)] truncate mb-0.5">{topTrack.title}</h2>
                        <p className="text-sm md:text-base text-[var(--text-muted)] font-medium truncate">{topTrack.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <motion.button 
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); onShuffleAll(tracks); }}
                        className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[var(--text-main)] font-bold text-xs flex items-center gap-2 border border-white/15 transition-all shadow-md"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>{t('shuffle')}</span>
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-xl shrink-0 transition-transform"
                        style={{ backgroundColor: accentColor || 'white', color: accentColor !== '#ffffff' ? 'white' : 'black' }}
                      >
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex-1 bg-[var(--card-bg)] rounded-3xl p-5 border border-[var(--glass-border)] shadow-lg overflow-hidden flex flex-col hover:bg-[var(--card-hover)] transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 fill-current text-pink-500" /> {t('favorites')}
                      </h3>
                      <button onClick={() => onChangeView && onChangeView('favorites')} className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">{t('see_all')}</button>
                    </div>
                    <div className="flex-1 flex flex-col justify-around gap-1.5">
                      {favoriteTracks.slice(0, 2).map((t) => (
                        <div key={t.id} onClick={() => onPlay(t, favoriteTracks)} className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shrink-0 bg-white/5">
                            {t.coverUrl ? <img src={t.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full bg-white/10" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate text-[var(--text-main)] group-hover:text-[var(--accent-color,white)] transition-colors" style={{ color: currentTrack?.id === t.id ? accentColor : undefined }}>{t.title}</div>
                            <div className="text-xs text-[var(--text-muted)] truncate">{t.artist}</div>
                          </div>
                        </div>
                      ))}
                      {favoriteTracks.length === 0 && <div className="text-xs text-[var(--text-muted)] text-center my-auto">{t('no_tracks')}</div>}
                    </div>
                  </div>

                  <div className="h-[90px] bg-[var(--card-bg)] rounded-3xl px-6 py-4 border border-[var(--glass-border)] shadow-lg relative overflow-hidden flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{t('library_size')}</h3>
                      <div className="text-2xl font-black text-[var(--text-main)]">{tracks.length} <span className="text-xs font-medium text-[var(--text-muted)]">{t('tracks_count')}</span></div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--text-muted)]">
                      <Music className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {topArtists.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-4 px-2">
                  <div>
                    <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">{t('top_artists')}</h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('top_artists_desc')}</p>
                  </div>
                  <button onClick={() => onChangeView && onChangeView('artists')} className="text-xs font-bold hover:underline text-[var(--text-muted)] hover:text-[var(--text-main)]">{t('see_all')}</button>
                </div>
                <div className="flex overflow-x-auto gap-5 pb-3 pt-1 px-2 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {topArtists.map((artist, i) => {
                    const meta = artistMetadata[artist];
                    return (
                      <motion.div 
                        key={i} 
                        whileHover={{ y: -3 }}
                        className="group cursor-pointer flex flex-col items-center text-center shrink-0 w-[110px] snap-center" 
                        onClick={() => onGoToArtist(artist)}
                      >
                        <div className="w-24 h-24 rounded-full overflow-hidden shadow-md mb-2.5 relative border border-white/10 group-hover:border-white/40 transition-all duration-300 bg-[var(--card-bg)]">
                          {meta?.avatar ? (
                            <img src={meta.avatar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><User className="w-7 h-7" /></div>
                          )}
                        </div>
                        <h3 className="text-xs font-bold truncate text-[var(--text-main)] w-full">{artist}</h3>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-0.5 font-semibold">{t('artist')}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            {displayedTracks.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-4 px-2">
                  <div>
                    <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">
                      {homeFilter === 'liked' ? t('liked_tracks') : homeFilter === 'flac' ? t('lossless_hires') : t('fresh_drops')}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('fresh_drops_desc')}</p>
                  </div>
                  <button onClick={() => onChangeView && onChangeView('songs')} className="text-xs font-bold hover:underline text-[var(--text-muted)] hover:text-[var(--text-main)]">{t('see_all')}</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {displayedTracks.map((track) => {
                    const isActive = currentTrack?.id === track.id;
                    const isCurrentlyPlaying = isActive && playbackState === PlaybackState.PLAYING;
                    return (
                      <motion.div 
                        key={track.id} 
                        whileHover={{ y: -3 }}
                        onClick={() => onPlay(track, displayedTracks)}
                        className="group cursor-pointer"
                      >
                        <div className="w-full aspect-square rounded-2xl overflow-hidden mb-2.5 relative shadow-md group-hover:shadow-xl transition-all duration-300 bg-[var(--card-bg)] border border-[var(--glass-border)]">
                          {track.coverUrl ? (
                            <img src={track.coverUrl} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-10 h-10 text-[var(--text-muted)]/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl text-black translate-y-1 group-hover:translate-y-0 transition-transform duration-200"
                              style={{ backgroundColor: accentColor || 'white', color: accentColor !== '#ffffff' ? 'white' : 'black' }}
                            >
                              {isCurrentlyPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </div>
                          </div>
                        </div>
                        <h3 
                          className={`font-bold text-xs truncate mb-0.5 transition-colors hover:underline cursor-pointer group-hover:text-[var(--text-main)] ${isActive ? '' : 'text-[var(--text-main)]/90'}`} 
                          style={{ color: isActive ? accentColor : undefined }}
                          onClick={(e) => { e.stopPropagation(); onGoToAlbum(track.album); }}
                          title={track.title}
                        >
                          {track.title}
                        </h3>
                        <div className="text-[11px] text-[var(--text-muted)] truncate font-medium group-hover:text-[var(--text-main)]/70 transition-colors">
                          {renderArtistLinks(track.artist)}
                        </div>
                      </motion.div>
                    );
                  })}
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
      }

      case 'albums':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 stagger-list px-4">
            {albums.map((album, i) => (
              <div key={i} className="group cursor-pointer" onClick={() => onGoToAlbum(album.title)}>
                <div className="aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl mb-4 relative border border-[var(--glass-border)] transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] bg-[var(--card-bg)]">
                  <img src={album.cover} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = "")} />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-500">
                    <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-none flex items-center justify-center shadow-2xl border border-white/10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
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
                  <div className="w-full aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl mb-5 relative border border-[var(--glass-border)] transition-all duration-500 group-hover:scale-[1.05] group-hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] bg-[var(--card-bg)]">
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
        const artistImage = metaDetail?.banner || metaDetail?.avatar || (filteredTracks[0]?.coverUrl ? filteredTracks[0].coverUrl : null);
        return (
          <div className="animate-fade-in pb-24">
            <div className="relative h-[48vh] min-h-[360px] -mx-8 -mt-8 mb-6 group overflow-hidden flex flex-col justify-end">
                <div className="absolute inset-0 z-0">
                    {artistImage ? (
                        <img src={artistImage} referrerPolicy="no-referrer" className="w-full h-full object-cover object-top scale-105 group-hover:scale-100 transition-transform duration-[2000ms] ease-out" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--text-main)]/20 to-[var(--bg-main)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-main)]/80 via-transparent to-transparent" />
                    
                    <button 
                        onClick={() => artistBannerInputRef.current?.click()}
                        className="absolute top-8 right-8 p-3 rounded-full bg-black/30 backdrop-blur-none text-white/80 hover:text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-all border border-white/10 shadow-lg z-20"
                        title={t('change_banner')}
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    <input 
                      type="file" 
                      ref={artistBannerInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleArtistAssetChange(e, 'banner')} 
                    />
                </div>
                <div className="relative z-10 px-8 md:px-12 pb-8 flex flex-col justify-end">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-none text-white text-[10px] font-black uppercase tracking-widest border border-white/10">
                            {t('artist')}
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight drop-shadow-xl truncate mb-2">
                        {selectedArtist}
                    </h1>
                    <p className="text-white/80 font-semibold text-sm md:text-base">
                        {filteredTracks.length} {t('songs')}
                    </p>
                </div>
            </div>

            <div className="px-4 md:px-8 max-w-7xl mx-auto space-y-12">
                 
                <div className="flex items-center gap-4 py-2">
                    <button 
                        onClick={() => filteredTracks.length > 0 && onPlay(filteredTracks[0], filteredTracks)} 
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-transform"
                        style={{ background: accentColor }}
                        title={t('listen_now')}
                    >
                        <Play className="w-7 h-7 fill-current ml-0.5" />
                    </button>
                    <button 
                        onClick={() => onShuffleAll(filteredTracks)} 
                        className="w-12 h-12 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--glass-border)] text-[var(--text-main)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                        title={t('shuffle')}
                    >
                        <Shuffle className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleRefreshArtistMetadata}
                        disabled={isRefreshingArtist}
                        className={`w-12 h-12 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--glass-border)] text-[var(--text-main)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md ${isRefreshingArtist ? 'animate-spin opacity-50' : ''}`}
                        title={t('refresh_metadata')}
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                 
                {(() => {
                  const popularTracks = [...filteredTracks].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
                  const displayedTracks = showAllPopularTracks ? popularTracks : popularTracks.slice(0, 5);
                  
                  const albumsMap = new Map<string, Track[]>();
                  filteredTracks.forEach(t => {
                    if (!albumsMap.has(t.album)) albumsMap.set(t.album, []);
                    albumsMap.get(t.album)!.push(t);
                  });
                  const albums = Array.from(albumsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                  const displayedAlbums = showAllAlbums ? albums : albums.slice(0, 3);

                  return (
                    <>
                       
                      <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-3 mb-6">
                          <h2 className="text-2xl font-bold text-[var(--text-main)]">{t('popular_tracks')}</h2>
                          {popularTracks.length > 5 && (
                            <button 
                              onClick={() => setShowAllPopularTracks(!showAllPopularTracks)}
                              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all border border-[var(--glass-border)] text-sm font-medium"
                            >
                              {showAllPopularTracks ? 'Скрыть' : 'Все треки'}
                              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showAllPopularTracks ? 'rotate-90' : ''}`} />
                            </button>
                          )}
                        </div>
                        <div className="mt-4">
                            {renderTrackList(displayedTracks, popularTracks)}
                        </div>
                      </div>

                       
                      {albums.length > 0 && (
                        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                          <div className="flex items-center gap-3 mb-6">
                            <h2 className="text-2xl font-bold text-[var(--text-main)]">{t('albums')}</h2>
                            {albums.length > 3 && (
                              <button 
                                onClick={() => setShowAllAlbums(!showAllAlbums)}
                                className="p-1.5 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all border border-[var(--glass-border)]"
                              >
                                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showAllAlbums ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>
                          
                          {showAllAlbums ? (
                             
                            <div className="flex flex-col gap-3">
                              {displayedAlbums.map(([albumName, albumTracks]) => (
                                <div 
                                  key={albumName}
                                  onClick={() => onGoToAlbum(albumName)}
                                  className="group cursor-pointer flex items-center gap-4 p-3 rounded-full hover:bg-[var(--card-hover)] transition-all border border-transparent hover:border-[var(--glass-border)] bg-[var(--card-bg)]/10"
                                >
                                  <div className="w-20 h-20 rounded-full overflow-hidden relative shadow-md shrink-0">
                                    {albumTracks[0]?.coverUrl ? (
                                        <img src={albumTracks[0].coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full bg-[var(--glass-border)] flex items-center justify-center">
                                            <Music className="w-8 h-8 text-[var(--text-muted)]" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-none">
                                      <Play className="w-8 h-8 text-white fill-current drop-shadow-lg" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-[var(--text-main)] text-lg truncate mb-1">{albumName}</h3>
                                    <p className="text-[var(--text-muted)] text-sm font-medium">{albumTracks.length} {t('songs')}</p>
                                  </div>
                                  <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)]">
                                    <ChevronRight className="w-6 h-6" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                             
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                              {displayedAlbums.map(([albumName, albumTracks]) => (
                                <div 
                                  key={albumName}
                                  onClick={() => onGoToAlbum(albumName)}
                                  className="group cursor-pointer bg-[var(--card-bg)]/20 p-4 rounded-[2.5rem] hover:bg-[var(--card-hover)] transition-all border border-[var(--glass-border)]"
                                >
                                  <div className="aspect-square rounded-[2rem] overflow-hidden mb-4 relative shadow-lg">
                                    {albumTracks[0]?.coverUrl ? (
                                        <img src={albumTracks[0].coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full bg-[var(--glass-border)] flex items-center justify-center">
                                            <Music className="w-12 h-12 text-[var(--text-muted)]" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-none">
                                      <Play className="w-12 h-12 text-white fill-current drop-shadow-lg" />
                                    </div>
                                  </div>
                                  <h3 className="font-bold text-[var(--text-main)] truncate text-base mb-1">{albumName}</h3>
                                  <p className="text-[var(--text-muted)] text-sm font-medium">{albumTracks.length} {t('songs')}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                       
                      {metaDetail?.bio && (
                        <div className="animate-slide-up pt-4" style={{ animationDelay: '0.3s' }}>
                          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-5">{t('about_artist')}</h2>
                          <div className="relative overflow-hidden rounded-[2.5rem] min-h-[340px] md:min-h-[420px] border border-[var(--glass-border)] shadow-2xl flex flex-col justify-end p-8 md:p-12 group bg-black/40">
                             
                            <div className="absolute inset-0 z-0">
                              {artistImage ? (
                                <img 
                                  src={artistImage} 
                                  referrerPolicy="no-referrer" 
                                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105" 
                                  onError={(e) => (e.currentTarget.style.display = 'none')} 
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-black" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20" />
                            </div>

                             
                            <div className="relative z-10 max-w-4xl space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-widest text-white/70 font-bold">
                                  {t('bio')}
                                </span>
                                <button 
                                  onClick={() => translatedBio ? setTranslatedBio(null) : handleTranslateBio(metaDetail.bio!)}
                                  className="text-xs font-bold text-white/90 hover:text-white bg-white/15 hover:bg-white/25 backdrop-blur-none px-3.5 py-1.5 rounded-full transition-all flex items-center gap-2 border border-white/10"
                                >
                                  {isTranslatingBio ? (
                                    <><RefreshCw className="w-3 h-3 animate-spin" /> {t('searching')}</>
                                  ) : (
                                    translatedBio ? t('original') : t('translate')
                                  )}
                                </button>
                              </div>

                              <p className="text-white/90 text-sm md:text-base leading-relaxed font-medium whitespace-pre-wrap line-clamp-6 hover:line-clamp-none transition-all duration-500">
                                {translatedBio || metaDetail.bio.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
            </div>
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
                            <button onClick={() => onShuffleAll(filteredTracks)} className="bg-[var(--card-bg)] backdrop-blur-none border border-[var(--glass-border)] px-12 py-4 rounded-[20px] font-black text-sm hover:bg-[var(--card-hover)] transition-all text-[var(--text-main)]">{t('shuffle')}</button>
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
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-none cursor-pointer" onClick={() => {
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
                            <button onClick={() => onShuffleAll(filteredTracks)} className="bg-[var(--card-bg)] backdrop-blur-none border border-[var(--glass-border)] px-12 py-4 rounded-[20px] font-black text-sm hover:bg-[var(--card-hover)] transition-all text-[var(--text-main)]">{t('shuffle')}</button>
                            <button onClick={() => onOpenSelectTracks?.()} className="bg-[var(--card-bg)] backdrop-blur-none border border-[var(--glass-border)] px-6 py-4 rounded-[20px] font-black text-sm hover:bg-[var(--card-hover)] transition-all text-[var(--text-main)]">{t('add_tracks')}</button>
                            <button onClick={() => {
                              if (window.confirm(t('delete_playlist_confirm'))) {
                                if (selectedPlaylist && onDeletePlaylist) onDeletePlaylist(selectedPlaylist);
                              }
                            }} className="bg-[var(--card-bg)] backdrop-blur-none border border-red-500/30 text-red-500 px-6 py-4 rounded-[20px] font-black text-sm hover:bg-red-500/10 transition-all">{t('delete')}</button>
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
            <div className="animate-fade-in space-y-12 max-w-5xl mx-auto pb-8">
                 
                <div className="relative rounded-[40px] overflow-hidden border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-2xl group">
                    <div className="h-64 w-full relative bg-gradient-to-br from-[var(--accent-color)]/20 to-transparent">
                        {userProfile?.bannerUrl ? (
                            isBannerVideo ? (
                                <video src={userProfile.bannerUrl} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-50 mix-blend-normal" />
                            ) : (
                                <img 
                                  src={userProfile.bannerUrl} 
                                  className="w-full h-full object-cover opacity-50 mix-blend-normal" 
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
                            className="absolute top-6 right-6 p-3 rounded-2xl bg-black/40 border border-white/10 text-white/60 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-none"
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
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-all backdrop-blur-none"
                            >
                                <Upload className="w-8 h-8 text-white" />
                            </button>
                        </div>
                        <div className="flex-1 text-center md:text-left mb-4">
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-2 group/name">
                                {isEditingName ? (
                                    <input
                                        type="text"
                                        value={editNameValue}
                                        onChange={(e) => setEditNameValue(e.target.value)}
                                        onBlur={() => {
                                            setIsEditingName(false);
                                            if (editNameValue.trim() && editNameValue !== userProfile?.name) {
                                                onUpdateProfile?.({ name: editNameValue.trim() });
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setIsEditingName(false);
                                                if (editNameValue.trim() && editNameValue !== userProfile?.name) {
                                                    onUpdateProfile?.({ name: editNameValue.trim() });
                                                }
                                            }
                                        }}
                                        autoFocus
                                        className="text-5xl font-black text-[var(--text-main)] tracking-tight bg-transparent border-b-2 border-[var(--accent-color)] outline-none w-full max-w-md"
                                    />
                                ) : (
                                    <>
                                        <h1 className="text-5xl font-black text-[var(--text-main)] tracking-tight">{userProfile?.name || 'User'}</h1>
                                        <button 
                                            onClick={() => {
                                                setEditNameValue(userProfile?.name || 'User');
                                                setIsEditingName(true);
                                            }}
                                            className="p-2 rounded-full hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors opacity-100"
                                            title="Edit Name"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-none">
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

                        <div className={`relative overflow-hidden bg-black/20 rounded-[2.5rem] mb-8 ${editingFile.type === 'avatar' ? 'aspect-square max-w-sm mx-auto rounded-full' : 'aspect-video'}`}>
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

  let paddingClass = 'pb-12 pt-0';
  if (currentTrack) {
     if (playerDock === 'top') {
         paddingClass = 'pt-[120px] pb-12';
     } else if (playerDock === 'bottom') {
         paddingClass = 'pb-[120px] pt-0';
     } else if (playerDock === 'left') {
         if (playerStyle === 'classic' || playerStyle === 'split') paddingClass = 'pl-[380px] pb-12';
         else paddingClass = 'pb-[120px] pt-0';  
     } else if (playerDock === 'right') {
         if (playerStyle === 'classic' || playerStyle === 'split') paddingClass = 'pr-[380px] pb-12';
         else paddingClass = 'pb-[120px] pt-0';
     }
  }

  return (
    <div className={`flex-1 h-full overflow-y-auto custom-scrollbar relative ${paddingClass}`} ref={scrollParentRef} onScroll={handleScroll}>
      <div key={currentView} className="animate-fade-in">
         
        <div 
          className="absolute top-0 left-0 right-0 h-80 pointer-events-none opacity-40 transition-colors duration-1000"
          style={{
            background: `linear-gradient(to bottom, ${accentColor} 0%, transparent 100%)`
          }}
        />

        <div className="relative z-10 pt-8 px-8">
          {editingTrack && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-none p-4 animate-fade-in-view">
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
                              <div className="w-56 h-56 rounded-[2.5rem] bg-[var(--card-bg)] border border-[var(--glass-border)] relative overflow-hidden group cursor-pointer shadow-2xl" onClick={() => coverInputRef.current?.click()}>
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
                                      <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase ml-2">Исполнитель альбома</label>
                                      <input type="text" value={editingTrack.albumArtist || ""} onChange={e => setEditingTrack({...editingTrack, albumArtist: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3 text-[var(--text-main)]" placeholder="Исполнитель альбома" />
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
                                  <div className="flex items-center justify-between ml-2">
                                      <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase flex items-center gap-1"><Quote className="w-3 h-3" /> {t('lyrics')}</label>
                                      <div className="flex items-center gap-3">
                                          <button 
                                              type="button" 
                                              disabled={isFetchingLyrics}
                                              onClick={async () => {
                                                  if (!editingTrack.artist || !editingTrack.title) return;
                                                  setIsFetchingLyrics(true);
                                                  const lyr = await fetchLyricsFromLRCLIB(editingTrack.artist, editingTrack.title);
                                                  setIsFetchingLyrics(false);
                                                  if (lyr) {
                                                      setEditingTrack({...editingTrack, lyrics: lyr});
                                                  } else {
                                                      alert('Текст песни не найден в базе LRCLIB');
                                                  }
                                              }} 
                                              className="text-[10px] text-[var(--accent-color)] hover:text-white font-bold uppercase flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                                          >
                                              <Sparkles className={`w-3 h-3 ${isFetchingLyrics ? 'animate-spin' : ''}`} /> 
                                              {isFetchingLyrics ? 'Поиск...' : 'LRCLIB'}
                                          </button>
                                          <button type="button" onClick={() => lyricsInputRef.current?.click()} className="text-[10px] text-[var(--text-muted)] hover:text-white font-bold uppercase flex items-center gap-1 transition-colors">
                                              <Upload className="w-3 h-3" /> {t('import_tracks')}
                                          </button>
                                      </div>
                                  </div>
                                  <textarea 
                                      value={editingTrack.lyrics || ""} 
                                      onChange={e => setEditingTrack({...editingTrack, lyrics: e.target.value})} 
                                      className="w-full glass-input rounded-xl px-4 py-3 h-48 resize-none font-medium text-sm leading-relaxed text-[var(--text-main)]" 
                                      placeholder={t('lyrics')}
                                  />
                                  <input type="file" ref={lyricsInputRef} className="hidden" accept=".txt,.lrc" onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                              const result = event.target?.result;
                                              if (typeof result === 'string') {
                                                  setEditingTrack({...editingTrack, lyrics: result});
                                              }
                                          };
                                          reader.readAsText(file);
                                      }
                                       
                                      e.target.value = '';
                                  }} />
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
            <div className="flex items-end justify-between mb-8 px-4 pt-8">
                <div><h1 className="text-5xl md:text-6xl font-black text-[var(--text-main)] tracking-tighter">{getTitle()}</h1></div>
                {currentView === 'songs' && (
                  <div className="relative">
                    <button
                      onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                      className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--glass-border)] text-[var(--text-main)] text-sm font-bold py-2 pl-4 pr-3 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] cursor-pointer"
                    >
                      {sortOption === 'default' && (t('sort_default') || 'По умолчанию')}
                      {sortOption === 'title_asc' && (t('sort_title_asc') || 'По названию (А-Я)')}
                      {sortOption === 'title_desc' && (t('sort_title_desc') || 'По названию (Я-А)')}
                      {sortOption === 'date_desc' && (t('sort_date_desc') || 'Сначала новые')}
                      {sortOption === 'date_asc' && (t('sort_date_asc') || 'Сначала старые')}
                      {sortOption === 'duration_desc' && (t('sort_duration_desc') || 'Сначала длинные')}
                      {sortOption === 'duration_asc' && (t('sort_duration_asc') || 'Сначала короткие')}
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                    
                    <AnimatePresence>
                      {sortDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setSortDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-48 bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-none"
                          >
                            {[
                              { value: 'default', label: t('sort_default') || 'По умолчанию' },
                              { value: 'title_asc', label: t('sort_title_asc') || 'По названию (А-Я)' },
                              { value: 'title_desc', label: t('sort_title_desc') || 'По названию (Я-А)' },
                              { value: 'date_desc', label: t('sort_date_desc') || 'Сначала новые' },
                              { value: 'date_asc', label: t('sort_date_asc') || 'Сначала старые' },
                              { value: 'duration_desc', label: t('sort_duration_desc') || 'Сначала длинные' },
                              { value: 'duration_asc', label: t('sort_duration_asc') || 'Сначала короткие' }
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  setSortOption(opt.value as any);
                                  setSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${sortOption === opt.value ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-main)] hover:bg-[var(--bg-main-transparent)]'}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
            </div>
        )}

        {(currentView === 'artist_detail' || currentView === 'album_detail') && (
            <button onClick={onBack} className={`mb-8 p-3 ${enableGlass ? 'bg-black/20 backdrop-blur-none' : 'bg-[var(--bg-main-transparent)]'} hover:bg-black/40 rounded-full transition-all sticky top-4 z-[100] border border-white/10 mx-4 shadow-xl group`}>
                <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
            </button>
        )}

        <div className="min-h-[50vh]">{renderView()}</div>
      </div>
      </div>
    </div>
  );
});

export default MainView;
