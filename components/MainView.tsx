
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Track, PlaybackState, ViewType, ArtistMetadata } from '../types';
import { 
  Play, Music, Disc, Mic2, Edit, Trash2, ArrowLeft, Heart, 
  Upload, X, Check, Quote, Image as ImageIcon, Search, MoreHorizontal, User
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
}

const ARTIST_SPLIT_REGEX = /\s*(?:,|;|feat\.?|ft\.?|&|\/|featuring)\s+/i;

const MainView: React.FC<MainViewProps> = ({ 
  tracks, currentTrack, playbackState, onPlay, onShuffleAll, currentView, 
  selectedArtist, selectedAlbum, onUpdateTrack, onDeleteTrack, onGoToArtist, onGoToAlbum, onBack, accentColor,
  artistMetadata = {}, onUpdateArtist, searchQuery = "", onRequestFileUnlock
}) => {
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isElectron = () => (window as any).require && (window as any).require('electron');

  // --- METADATA SEARCH (API) ---
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
        } else {
            alert("Ничего не найдено");
        }
    } catch (e) {
        console.error("Metadata fetch error:", e);
    } finally {
        setIsSearchingMetadata(false);
    }
  };

  // --- DATA AGGREGATION ---
  const albums = useMemo(() => {
    const map = new Map<string, { title: string, artist: string, cover: string, year?: string }>();
    tracks.forEach(t => {
      const key = `${t.album}-${t.artist}`;
      if (!map.has(key)) {
        map.set(key, { title: t.album, artist: t.artist, cover: t.coverUrl, year: t.year });
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
    return tracks.filter(t => {
      if (currentView === 'favorites') return t.isLiked;
      if (currentView === 'artist_detail') {
          const names = t.artist.split(ARTIST_SPLIT_REGEX).map(n => n.trim().toLowerCase());
          return names.includes(selectedArtist?.toLowerCase() || "");
      }
      if (currentView === 'album_detail') return t.album === selectedAlbum;
      if (currentView === 'search' && searchQuery) {
          const query = searchQuery.toLowerCase();
          return t.title.toLowerCase().includes(query) || 
                 t.artist.toLowerCase().includes(query) || 
                 t.album.toLowerCase().includes(query);
      }
      return true;
    });
  }, [tracks, currentView, selectedArtist, selectedAlbum, searchQuery]);

  const renderArtistLinks = (artistString: string) => {
    const names = artistString.split(ARTIST_SPLIT_REGEX).map(n => n.trim()).filter(Boolean);
    return names.map((name, i) => (
        <React.Fragment key={i}>
            <span 
                className="hover:text-white hover:underline cursor-pointer" 
                onClick={(e) => { e.stopPropagation(); onGoToArtist(name); }}
            >
                {name}
            </span>
            {i < names.length - 1 && <span className="mx-1 text-white/20">/</span>}
        </React.Fragment>
    ));
  };

  const renderTrackList = (tracksToRender: Track[]) => (
    <div className="space-y-1">
      {tracksToRender.map((track) => {
        const isActive = currentTrack?.id === track.id;
        return (
          <div 
            key={track.id}
            className={`group flex items-center gap-4 p-3 rounded-2xl transition-all hover:bg-white/5 cursor-pointer ${isActive ? 'bg-white/10 shadow-lg' : ''}`}
            onClick={() => onPlay(track, tracksToRender)}
          >
             <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 shadow-md border border-white/10">
                <img src={track.coverUrl} className="w-full h-full object-cover" />
                {isActive && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="flex gap-1 items-end h-4">
                            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '60%' }}></div>
                            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '100%' }}></div>
                            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '80%' }}></div>
                        </div>
                    </div>
                )}
             </div>
             <div className="flex-1 min-w-0">
                <p 
                    className={`text-sm font-bold truncate hover:underline ${isActive ? '' : 'text-white'}`} 
                    style={{ color: isActive ? accentColor : undefined }}
                    onClick={(e) => { e.stopPropagation(); onGoToAlbum(track.album); }}
                >
                    {track.title}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-white/40 truncate font-medium">
                    <div className="flex items-center">{renderArtistLinks(track.artist)}</div>
                    <span>—</span>
                    <span className="hover:text-white hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); onGoToAlbum(track.album); }}>{track.album}</span>
                </div>
             </div>
             <div className="text-xs text-white/20 font-mono hidden md:block">{formatTime(track.duration || 0)}</div>
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    className={`p-2 hover:bg-white/10 rounded-full transition-colors ${track.isLiked ? '' : 'text-white/30 hover:text-white'}`}
                    style={{ color: track.isLiked ? accentColor : undefined }}
                    onClick={(e) => { e.stopPropagation(); onUpdateTrack(track.id, { isLiked: !track.isLiked }); }}
                >
                    <Heart className={`w-4 h-4 ${track.isLiked ? 'fill-current' : ''}`} />
                </button>
                <button 
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                    onClick={(e) => { e.stopPropagation(); setEditingTrack(track); }}
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button 
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); onDeleteTrack(track.id); }}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
             </div>
          </div>
        );
      })}
    </div>
  );

  const renderView = () => {
    switch (currentView) {
      case 'albums':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 stagger-list">
            {albums.map((album, i) => (
              <div key={i} className="group cursor-pointer" onClick={() => onGoToAlbum(album.title)}>
                <div className="aspect-square rounded-2xl overflow-hidden shadow-xl mb-3 relative border border-white/5 transition-transform group-hover:scale-[1.03] group-active:scale-95">
                  <img src={album.cover} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-current" />
                    </div>
                  </div>
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
                  <div className="w-full aspect-square rounded-full overflow-hidden shadow-2xl mb-4 relative border border-white/10 transition-transform group-hover:scale-[1.03] group-active:scale-95 bg-white/5">
                    {meta?.avatar ? <img src={meta.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><User className="w-1/2 h-1/2" /></div>}
                  </div>
                  <h3 className="text-sm font-bold truncate text-white w-full">{artist}</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Артист</p>
                </div>
              );
            })}
          </div>
        );

      case 'artist_detail':
        const metaDetail = selectedArtist ? artistMetadata[selectedArtist] : null;
        return (
          <div className="animate-fade-in-view">
            <div className="relative h-[40vh] min-h-[300px] -mx-8 -mt-8 mb-12 group">
                <div className="absolute inset-0 overflow-hidden">
                    {metaDetail?.banner ? <img src={metaDetail.banner} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-12 flex flex-col md:flex-row items-center md:items-end gap-8">
                    <div className="w-48 h-48 rounded-full border-4 border-black/40 shadow-2xl overflow-hidden relative group/avatar bg-white/5">
                        {metaDetail?.avatar ? <img src={metaDetail.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-12 text-white/10" />}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-6xl font-black text-white mb-2 drop-shadow-2xl">{selectedArtist}</h1>
                        <p className="text-white/60 font-medium uppercase tracking-[0.3em]">{filteredTracks.length} Песен в коллекции</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => filteredTracks.length > 0 && onPlay(filteredTracks[0], filteredTracks)} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-xl">
                            <Play className="w-5 h-5 fill-current" /> Слушать
                        </button>
                    </div>
                </div>
            </div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Music className="w-5 h-5" style={{ color: accentColor }} /> Песни
            </h2>
            {renderTrackList(filteredTracks)}
          </div>
        );

      case 'album_detail':
        return (
            <div className="animate-fade-in-view">
                <div className="flex flex-col md:flex-row gap-10 mb-12 items-center md:items-end">
                    <div className="w-64 h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
                        <img src={filteredTracks[0]?.coverUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <p className="text-[12px] uppercase tracking-[0.4em] text-white/40 mb-2 font-bold">Альбом</p>
                        <h1 className="text-5xl font-black text-white mb-4">{selectedAlbum}</h1>
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
                            <span className="text-lg font-bold hover:underline cursor-pointer" onClick={() => onGoToArtist(filteredTracks[0]?.artist.split(ARTIST_SPLIT_REGEX)[0])}>{filteredTracks[0]?.artist}</span>
                        </div>
                        <div className="flex gap-4 justify-center md:justify-start">
                            <button onClick={() => filteredTracks.length > 0 && onPlay(filteredTracks[0], filteredTracks)} className="bg-white text-black px-10 py-3 rounded-full font-bold hover:scale-105 transition-transform shadow-xl">Воспроизвести</button>
                            <button onClick={() => onShuffleAll(filteredTracks)} className="glass-button px-10 py-3 rounded-full font-bold">Перемешать</button>
                        </div>
                    </div>
                </div>
                {renderTrackList(filteredTracks)}
            </div>
        );

      default:
        return renderTrackList(filteredTracks);
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case 'listen_now': return 'Слушать сейчас';
      case 'browse': return 'Обзор';
      case 'radio': return 'Радио';
      case 'recent': return 'Недавно';
      case 'albums': return 'Альбомы';
      case 'artists': return 'Артисты';
      case 'songs': return 'Песни';
      case 'favorites': return 'Избранное';
      case 'search': return searchQuery ? `Результаты: ${searchQuery}` : 'Поиск';
      default: return '';
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingTrack) {
        const url = await fileToDataURL(file);
        setEditingTrack({ ...editingTrack, coverUrl: url });
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto pb-32 pt-8 px-8 custom-scrollbar relative">
      {editingTrack && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-fade-in-view">
             <div className="bg-[#1c1c1e]/95 border border-white/10 w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden animate-zoom-in flex flex-col max-h-[95vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Редактировать сведения
                        <button 
                            type="button"
                            onClick={handleFetchMetadata} 
                            disabled={isSearchingMetadata}
                            className={`ml-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-bold ${isSearchingMetadata ? 'animate-pulse opacity-50' : ''}`}
                            title="Автозаполнение через YouTube Music API"
                        >
                            {isSearchingMetadata ? 'Поиск...' : '✨ Магия API'}
                        </button>
                    </h3>
                    <button onClick={() => setEditingTrack(null)} className="text-white/40 hover:text-white transition-colors p-2"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (editingTrack) onUpdateTrack(editingTrack.id, editingTrack); setEditingTrack(null); }} className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-48 h-48 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group cursor-pointer shadow-2xl" onClick={() => coverInputRef.current?.click()}>
                                <img src={editingTrack.coverUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="w-8 h-8 text-white" /></div>
                            </div>
                            <button type="button" onClick={() => coverInputRef.current?.click()} className="text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors">Изменить обложку</button>
                            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverChange} />
                        </div>
                        <div className="flex-1 grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Название песни</label>
                                <input type="text" value={editingTrack.title} onChange={e => setEditingTrack({...editingTrack, title: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3 text-lg font-bold" placeholder="Название" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Артисты (через запятую)</label>
                                <input type="text" value={editingTrack.artist} onChange={e => setEditingTrack({...editingTrack, artist: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3" placeholder="Артист" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Альбом</label>
                                    <input type="text" value={editingTrack.album} onChange={e => setEditingTrack({...editingTrack, album: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3" placeholder="Альбом" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Год выпуска</label>
                                    <input type="text" value={editingTrack.year || ""} onChange={e => setEditingTrack({...editingTrack, year: e.target.value})} className="w-full glass-input rounded-xl px-4 py-3" placeholder="2024" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2"><Quote className="w-3 h-3"/> Текст песни (Поддерживается LRC)</label>
                        <textarea value={editingTrack.lyrics || ""} onChange={e => setEditingTrack({...editingTrack, lyrics: e.target.value})} className="w-full glass-input rounded-2xl px-4 py-4 min-h-[200px] font-mono text-sm leading-relaxed" placeholder="Вставьте текст песни здесь...&#10;[00:15.00]Первая строчка" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-[#1c1c1e]/95 py-4">
                         <button type="button" onClick={() => setEditingTrack(null)} className="px-8 py-3 text-white/60 font-bold hover:text-white transition-colors">Отмена</button>
                         <button type="submit" className="px-12 py-3 rounded-2xl text-white font-bold shadow-xl hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: accentColor }}>Сохранить изменения</button>
                    </div>
                </form>
             </div>
        </div>
      )}

      {currentView !== 'artist_detail' && currentView !== 'album_detail' && (
          <div className="flex items-end justify-between mb-10 animate-fade-in-view">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-xl">{getTitle()}</h1>
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-2">{filteredTracks.length} Элементов в категории</p>
              </div>
              {currentView === 'favorites' && (
                  <div className="flex gap-3">
                      <button onClick={() => onShuffleAll(filteredTracks)} className="glass-button px-8 py-3 rounded-full font-bold flex items-center gap-2">
                          <Play className="w-4 h-4 fill-current" /> Перемешать всё
                      </button>
                  </div>
              )}
          </div>
      )}

      {(currentView === 'artist_detail' || currentView === 'album_detail') && (
          <button onClick={onBack} className="mb-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all group sticky top-0 z-20 backdrop-blur-md">
              <ArrowLeft className="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform" />
          </button>
      )}

      <div className="min-h-[50vh]">{renderView()}</div>
    </div>
  );
};

export default MainView;
