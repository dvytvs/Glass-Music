
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Track, PlaybackState, ViewType, ArtistMetadata } from '../types';
import { 
  Play, Music, Disc, Mic2, Edit, Trash2, ArrowLeft, Heart, 
  Upload, X, Check, Quote, Image as ImageIcon, Search, MoreHorizontal, User, Calendar
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
  onUpdateArtist?: (artist: string, data: Partial<ArtistMetadata>) => void;
  searchQuery?: string;
  onRequestFileUnlock: () => void;
  youtubeResults?: Track[];
  isSearchingYoutube?: boolean;
  onYoutubeSearch?: (query: string) => void;
}

const ARTIST_SPLIT_REGEX = /\s*(?:,|;|feat\.?|ft\.?|&|\/|featuring)\s+/i;

const MainView: React.FC<MainViewProps> = ({ 
  tracks, currentTrack, playbackState, onPlay, onShuffleAll, currentView, 
  selectedArtist, selectedAlbum, onUpdateTrack, onDeleteTrack, onGoToArtist, onGoToAlbum, onBack, accentColor,
  artistMetadata = {}, onUpdateArtist, searchQuery = "", onRequestFileUnlock,
  youtubeResults = [], isSearchingYoutube = false, onYoutubeSearch
}) => {
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const artistAvatarInputRef = useRef<HTMLInputElement>(null);
  const artistBannerInputRef = useRef<HTMLInputElement>(null);

  const isElectron = () => (window as any).require && (window as any).require('electron');

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

  const handleArtistAssetChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file && selectedArtist && onUpdateArtist) {
        const url = await fileToDataURL(file);
        onUpdateArtist(selectedArtist, { [type]: url });
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
      if (currentView === 'search' && searchQuery) {
          const q = searchQuery.toLowerCase();
          return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tracks, currentView, selectedArtist, selectedAlbum, searchQuery]);

  const renderTrackList = (tracksToRender: Track[]) => (
    <div className="space-y-1">
      {tracksToRender.map((track, index) => {
        const isActive = currentTrack?.id === track.id;
        return (
          <div key={track.id} className={`group flex items-center gap-4 p-3 rounded-2xl transition-all hover:bg-white/5 cursor-pointer ${isActive ? 'bg-white/10 shadow-lg' : ''}`} onClick={() => onPlay(track, tracksToRender)}>
             <div className="w-8 text-xs font-mono text-white/20 group-hover:text-white/40 transition-colors text-right shrink-0">
                {index + 1}.
             </div>
             <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 shadow-md border border-white/10 bg-white/5">
                <img src={track.coverUrl} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23222'/%3E%3C/svg%3E")} />
                {isActive && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="flex gap-1 items-end h-4"><div className="w-1 bg-white rounded-full animate-pulse h-[60%]"></div><div className="w-1 bg-white rounded-full animate-pulse h-full"></div><div className="w-1 bg-white rounded-full animate-pulse h-[80%]"></div></div></div>}
             </div>
             <div className="flex-1 min-w-0">
                <p 
                    className={`text-sm font-bold truncate hover:underline ${isActive ? '' : 'text-white'}`} 
                    style={{ color: isActive ? accentColor : undefined }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onGoToAlbum(track.album);
                    }}
                >
                    {track.title}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-white/40 truncate font-medium">
                    <span className="flex items-center">
                        {renderArtistLinks(track.artist)}
                    </span>
                    <span className="mx-1">—</span>
                    <span className="hover:text-white hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); onGoToAlbum(track.album); }}>{track.album}</span>
                </div>
             </div>
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className={`p-2 hover:bg-white/10 rounded-full ${track.isLiked ? '' : 'text-white/30 hover:text-white'}`} style={{ color: track.isLiked ? accentColor : undefined }} onClick={e => { e.stopPropagation(); onUpdateTrack(track.id, { isLiked: !track.isLiked }); }}><Heart className={`w-4 h-4 ${track.isLiked ? 'fill-current' : ''}`} /></button>
                <button className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white" onClick={e => { e.stopPropagation(); setEditingTrack(track); }} title="Редактировать"><Edit className="w-4 h-4" /></button>
                <button className="p-2 hover:bg-white/10 rounded-full text-red-500/60 hover:text-red-500" onClick={e => { e.stopPropagation(); onDeleteTrack(track.id); }} title="Удалить"><Trash2 className="w-4 h-4" /></button>
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

  const renderView = () => {
    switch (currentView) {
      case 'listen_now':
        return (
          <div className="space-y-12 animate-fade-in-view px-4">
            {/* Top Artists Section */}
            {topArtists.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <User className="w-6 h-6" style={{ color: accentColor }} />
                    Ваши любимые артисты
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
                  {topArtists.map((artist, i) => {
                    const meta = artistMetadata[artist];
                    return (
                      <div key={i} className="group cursor-pointer flex flex-col items-center text-center" onClick={() => onGoToArtist(artist)}>
                        <div className="w-full aspect-square rounded-full overflow-hidden shadow-2xl mb-3 relative border border-white/10 transition-all group-hover:scale-105 group-hover:ring-4 ring-white/10 bg-white/5">
                          {meta?.avatar ? <img src={meta.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><User className="w-1/2 h-1/2" /></div>}
                        </div>
                        <h3 className="text-xs font-bold truncate text-white w-full">{artist}</h3>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Favorite Tracks Section */}
            {favoriteTracks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <Heart className="w-6 h-6 fill-current" style={{ color: accentColor }} />
                    Любимые треки
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                  {favoriteTracks.map((track) => {
                    const isActive = currentTrack?.id === track.id;
                    return (
                      <div key={track.id} className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all" onClick={() => onPlay(track, favoriteTracks)}>
                        <div className="w-10 h-10 rounded-lg overflow-hidden relative shrink-0 shadow-md border border-white/10 bg-white/5">
                          <img src={track.coverUrl} className="w-full h-full object-cover" />
                          {isActive && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><div className="w-1 h-3 bg-white animate-pulse rounded-full"></div></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate text-white">{track.title}</p>
                          <p className="text-[10px] text-white/40 truncate font-medium">{track.artist}</p>
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <Calendar className="w-6 h-6" style={{ color: accentColor }} />
                    Недавно добавленные
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {recentlyAdded.map((track) => (
                    <div key={track.id} className="group cursor-pointer" onClick={() => onPlay(track, recentlyAdded)}>
                      <div className="aspect-square rounded-2xl overflow-hidden shadow-xl mb-3 relative border border-white/5 transition-all group-hover:scale-[1.03] group-hover:shadow-2xl">
                        <img src={track.coverUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 text-white fill-current" />
                          </div>
                        </div>
                      </div>
                      <h3 className="text-sm font-bold truncate text-white">{track.title}</h3>
                      <p className="text-xs text-white/40 truncate">{track.artist}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tracks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <Music className="w-12 h-12 text-white/10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ваша медиатека пуста</h3>
                <p className="text-white/40 max-w-xs">Импортируйте музыку, чтобы начать прослушивание</p>
              </div>
            )}
          </div>
        );

      case 'albums':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 stagger-list">
            {albums.map((album, i) => (
              <div key={i} className="group cursor-pointer" onClick={() => onGoToAlbum(album.title)}>
                <div className="aspect-square rounded-2xl overflow-hidden shadow-xl mb-3 relative border border-white/5 transition-transform group-hover:scale-[1.03]">
                  <img src={album.cover} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = "")} />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center"><Play className="w-6 h-6 text-white fill-current" /></div></div>
                </div>
                <h3 className="text-sm font-bold truncate text-white">{album.title}</h3>
                <p className="text-xs text-white/40 truncate">{album.artist}</p>
              </div>
            ))}
          </div>
        );

      case 'artists':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 stagger-list">
            {artists.map((artist, i) => {
              const meta = artistMetadata[artist];
              return (
                <div key={i} className="group cursor-pointer flex flex-col items-center text-center" onClick={() => onGoToArtist(artist)}>
                  <div className="w-full aspect-square rounded-full overflow-hidden shadow-2xl mb-4 relative border border-white/10 transition-transform group-hover:scale-[1.03] bg-white/5">
                    {meta?.avatar ? <img src={meta.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><User className="w-1/2 h-1/2" /></div>}
                  </div>
                  <h3 className="text-sm font-bold truncate text-white w-full">{artist}</h3>
                </div>
              );
            })}
          </div>
        );

      case 'artist_detail':
        const metaDetail = selectedArtist ? artistMetadata[selectedArtist] : null;
        return (
          <div className="animate-fade-in-view">
            <div className="relative h-[45vh] min-h-[350px] -mx-8 -mt-8 mb-12 group overflow-hidden">
                <div className="absolute inset-0">
                    {metaDetail?.banner ? (
                        <img src={metaDetail.banner} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-black opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <button 
                        onClick={() => artistBannerInputRef.current?.click()}
                        className="absolute top-8 right-8 p-3 rounded-full bg-black/40 backdrop-blur-md text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                        title="Изменить баннер артиста"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    <input type="file" ref={artistBannerInputRef} className="hidden" accept="image/*" onChange={e => handleArtistAssetChange(e, 'banner')} />
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-12 flex flex-col md:flex-row items-center md:items-end gap-8">
                    <div className="w-48 h-48 rounded-full border-4 border-black/40 shadow-2xl overflow-hidden relative group/avatar bg-white/5 cursor-pointer shrink-0" onClick={() => artistAvatarInputRef.current?.click()}>
                        {metaDetail?.avatar ? (
                            <img src={metaDetail.avatar} className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : null}
                        <User className="w-full h-full p-12 text-white/10 absolute inset-0 -z-1" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity"><Edit className="w-8 h-8 text-white" /></div>
                    </div>
                    <input type="file" ref={artistAvatarInputRef} className="hidden" accept="image/*" onChange={e => handleArtistAssetChange(e, 'avatar')} />
                    
                    <div className="flex-1 text-center md:text-left min-w-0">
                        <h1 className="text-6xl font-black text-white mb-2 drop-shadow-2xl truncate">{selectedArtist}</h1>
                        <p className="text-white/60 font-medium uppercase tracking-[0.3em]">{filteredTracks.length} Песен в коллекции</p>
                    </div>
                    <div className="flex gap-4 shrink-0">
                        <button onClick={() => filteredTracks.length > 0 && onPlay(filteredTracks[0], filteredTracks)} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-xl"><Play className="w-5 h-5 fill-current" /> Слушать всё</button>
                        <button onClick={() => onShuffleAll(filteredTracks)} className="glass-button px-8 py-3 rounded-full font-bold">Перемешать</button>
                    </div>
                </div>
            </div>

            {metaDetail?.bio && (
                <div className="px-4 mb-12 animate-slide-up">
                    <div className="glass-panel p-8 rounded-[32px] border border-white/5">
                        <h3 className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-4 font-bold flex items-center gap-2">
                             Об артисте
                        </h3>
                        <p className="text-white/70 text-lg leading-relaxed font-medium">
                            {metaDetail.bio}
                        </p>
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 px-4"><Music className="w-5 h-5" style={{ color: accentColor }} /> Песни</h2>
            {renderTrackList(filteredTracks)}
          </div>
        );

      case 'album_detail':
        return (
            <div className="animate-fade-in-view">
                <div className="flex flex-col md:flex-row gap-10 mb-12 items-center md:items-end px-4">
                    <div className="w-64 h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-white/5"><img src={filteredTracks[0]?.coverUrl} className="w-full h-full object-cover" /></div>
                    <div className="flex-1 text-center md:text-left min-w-0">
                        <p className="text-[12px] uppercase tracking-[0.4em] text-white/40 mb-2 font-bold">Альбом</p>
                        <h1 className="text-5xl font-black text-white mb-4 truncate">{selectedAlbum}</h1>
                        <p className="text-lg font-bold mb-6 truncate">
                            {renderArtistLinks(filteredTracks[0]?.artist || "")}
                        </p>
                        <div className="flex gap-4 justify-center md:justify-start">
                            <button onClick={() => filteredTracks.length > 0 && onPlay(filteredTracks[0], filteredTracks)} className="bg-white text-black px-10 py-3 rounded-full font-bold hover:scale-105 transition-transform shadow-xl">Воспроизвести</button>
                            <button onClick={() => onShuffleAll(filteredTracks)} className="glass-button px-10 py-3 rounded-full font-bold">Перемешать</button>
                        </div>
                    </div>
                </div>
                {renderTrackList(filteredTracks)}
            </div>
        );

      case 'search':
        return (
          <div className="space-y-10">
            {filteredTracks.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 px-4 flex items-center gap-2">
                  <Music className="w-5 h-5" style={{ color: accentColor }} />
                  Ваша медиатека
                </h2>
                {renderTrackList(filteredTracks)}
              </section>
            )}

            <section className="px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" style={{ color: accentColor }} />
                  YouTube
                </h2>
                <button 
                  onClick={() => onYoutubeSearch?.(searchQuery)}
                  disabled={isSearchingYoutube}
                  className="text-xs font-bold px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {isSearchingYoutube ? 'Поиск...' : 'Искать в YouTube'}
                </button>
              </div>

              {youtubeResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {youtubeResults.map((track) => (
                    <div 
                      key={track.id} 
                      className="group flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
                      onClick={() => onPlay(track, youtubeResults)}
                    >
                      <div className="w-20 h-12 rounded-lg overflow-hidden shrink-0 shadow-lg border border-white/10">
                        <img src={track.coverUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-white">{track.title}</p>
                        <p className="text-xs text-white/40 truncate">{track.artist}</p>
                      </div>
                      <Play className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center border border-dashed border-white/10 rounded-3xl">
                  <p className="text-white/20 text-sm">Нажмите кнопку выше, чтобы найти это в YouTube</p>
                </div>
              )}
            </section>
          </div>
        );

      default:
        return renderTrackList(filteredTracks);
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case 'listen_now': return 'Слушать сейчас';
      case 'albums': return 'Альбомы';
      case 'artists': return 'Артисты';
      case 'songs': return 'Песни';
      case 'favorites': return 'Избранное';
      case 'search': return searchQuery ? `Результаты: ${searchQuery}` : 'Поиск';
      default: return '';
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto pb-32 pt-8 px-8 custom-scrollbar relative">
      {editingTrack && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-fade-in-view">
             <div className="bg-[#1c1c1e]/95 border border-white/10 w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden animate-zoom-in flex flex-col max-h-[95vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">Редактирование
                        <button type="button" onClick={handleFetchMetadata} disabled={isSearchingMetadata} className={`ml-4 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-2 text-xs font-bold transition-all ${isSearchingMetadata ? 'opacity-50' : ''}`}>
                            {isSearchingMetadata ? 'Поиск...' : '✨ Магия API'}
                        </button>
                    </h3>
                    <button onClick={() => setEditingTrack(null)} className="text-white/40 hover:text-white p-2 transition-colors"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (editingTrack) onUpdateTrack(editingTrack.id, editingTrack); setEditingTrack(null); }} className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    <div className="flex flex-col md:flex-row gap-10">
                        <div className="flex flex-col items-center gap-4 shrink-0">
                            <div className="w-56 h-56 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group cursor-pointer shadow-2xl" onClick={() => coverInputRef.current?.click()}>
                                <img src={editingTrack.coverUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="w-10 h-10 text-white" /></div>
                            </div>
                            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={async e => {
                                const f = e.target.files?.[0]; if (f) setEditingTrack({...editingTrack, coverUrl: await fileToDataURL(f)});
                            }} />
                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Нажмите на фото, чтобы изменить</p>
                        </div>
                        <div className="flex-1 space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] text-white/40 font-bold uppercase ml-2">Название песни</label>
                                <input type="text" value={editingTrack.title} onChange={e => setEditingTrack({...editingTrack, title: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3 text-lg font-bold" placeholder="Название" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-white/40 font-bold uppercase ml-2">Артист</label>
                                    <input type="text" value={editingTrack.artist} onChange={e => setEditingTrack({...editingTrack, artist: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3" placeholder="Артист" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-white/40 font-bold uppercase ml-2">Альбом</label>
                                    <input type="text" value={editingTrack.album} onChange={e => setEditingTrack({...editingTrack, album: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3" placeholder="Альбом" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-white/40 font-bold uppercase ml-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> Год</label>
                                    <input type="text" value={editingTrack.year || ""} onChange={e => setEditingTrack({...editingTrack, year: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3" placeholder="2024" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-white/40 font-bold uppercase ml-2 flex items-center gap-1"><Quote className="w-3 h-3" /> Текст песни (LRC или обычный)</label>
                                <textarea 
                                    value={editingTrack.lyrics || ""} 
                                    onChange={e => setEditingTrack({...editingTrack, lyrics: e.target.value})} 
                                    className="w-full glass-input rounded-xl px-4 py-3 h-48 resize-none font-medium text-sm leading-relaxed" 
                                    placeholder="Вставьте текст песни здесь..."
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-[#1c1c1e] py-6 border-t border-white/5">
                         <button type="button" onClick={() => setEditingTrack(null)} className="px-8 py-3 text-white/60 font-bold hover:text-white transition-colors">Отмена</button>
                         <button type="submit" className="px-12 py-3 rounded-2xl text-white font-bold shadow-xl hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: accentColor }}>Сохранить изменения</button>
                    </div>
                </form>
             </div>
        </div>
      )}

      {currentView !== 'artist_detail' && currentView !== 'album_detail' && (
          <div className="flex items-end justify-between mb-10 px-4">
              <div><h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-xl">{getTitle()}</h1></div>
          </div>
      )}

      {(currentView === 'artist_detail' || currentView === 'album_detail') && (
          <button onClick={onBack} className="mb-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all sticky top-4 z-[100] backdrop-blur-xl border border-white/10 mx-4 shadow-2xl">
              <ArrowLeft className="w-6 h-6 text-white" />
          </button>
      )}

      <div className="min-h-[50vh]">{renderView()}</div>
    </div>
  );
};

export default MainView;
