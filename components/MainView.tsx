
import React, { useState, useRef, useEffect } from 'react';
import { Track, PlaybackState, ViewType, ArtistMetadata } from '../types';
import { Play, MoreHorizontal, Music, Disc, Mic2, Edit, Trash2, ArrowRight, X, Check, Upload, ArrowLeft, Heart, Image, Search, Quote } from './Icons';
import { formatTime } from '../utils';

interface MainViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  playbackState: PlaybackState;
  onPlay: (track: Track) => void;
  onShuffleAll: () => void;
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
}

const MainView: React.FC<MainViewProps> = ({ 
  tracks, currentTrack, playbackState, onPlay, onShuffleAll, currentView, 
  selectedArtist, selectedAlbum, onUpdateTrack, onDeleteTrack, onGoToArtist, onGoToAlbum, onBack, accentColor,
  artistMetadata = {}, onUpdateArtist, searchQuery = ""
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for artist upload
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTrack) {
      onUpdateTrack(editingTrack.id, {
        title: editingTrack.title,
        artist: editingTrack.artist,
        album: editingTrack.album,
        year: editingTrack.year,
        coverUrl: editingTrack.coverUrl,
        lyrics: editingTrack.lyrics
      });
      setEditingTrack(null);
      setActiveMenuId(null);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editingTrack) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setEditingTrack({ ...editingTrack, coverUrl: ev.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleArtistImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'avatar') => {
      if (!selectedArtist || !onUpdateArtist) return;
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  onUpdateArtist(selectedArtist, { [type]: ev.target.result as string });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const isPlaying = (id: string) => currentTrack?.id === id && playbackState === PlaybackState.PLAYING;

  // Helper to get individual artists from a comma/semicolon separated string
  const parseArtists = (artistString: string): string[] => {
      return artistString.split(/[,;]/).map(a => a.trim()).filter(a => a.length > 0);
  };

  const renderContent = () => {
    let displayTracks = tracks;
    let title = "";
    let subtitle = "";
    let showHeaderImage = false;
    let currentArtistMeta: ArtistMetadata | undefined;

    if (currentView === 'search') {
        const query = searchQuery.toLowerCase();
        displayTracks = tracks.filter(t => 
            t.title.toLowerCase().includes(query) || 
            t.artist.toLowerCase().includes(query) || 
            t.album.toLowerCase().includes(query)
        );
        title = "Поиск";
        subtitle = `Результаты для "${searchQuery}"`;
    } else if (currentView === 'artist_detail' && selectedArtist) {
        displayTracks = tracks.filter(t => {
            const artists = parseArtists(t.artist);
            return artists.includes(selectedArtist);
        });
        title = selectedArtist;
        subtitle = "Исполнитель";
        showHeaderImage = true;
        currentArtistMeta = artistMetadata[selectedArtist];
    } else if (currentView === 'album_detail' && selectedAlbum) {
        displayTracks = tracks.filter(t => t.album === selectedAlbum);
        title = selectedAlbum;
        subtitle = `Альбом • ${displayTracks[0]?.artist || ''}`;
    } else if (currentView === 'favorites') {
        displayTracks = tracks.filter(t => t.isLiked);
        title = "Избранное";
        subtitle = `${displayTracks.length} треков`;
    }

    if (tracks.length === 0 && currentView !== 'favorites' && currentView !== 'search') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-white/50 animate-fade-in-view">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <Music className="w-10 h-10 opacity-30" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Музыка не найдена</h2>
          <p className="max-w-md text-center">Импортируйте локальные файлы.</p>
        </div>
      );
    }
    
    if (currentView === 'favorites' && displayTracks.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/50 animate-fade-in-view">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Heart className="w-10 h-10 opacity-30" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Здесь пока пусто</h2>
                <p className="max-w-md text-center">Добавляйте любимые треки, нажимая на сердечко.</p>
            </div>
        )
    }

    if (currentView === 'search' && displayTracks.length === 0 && searchQuery) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/50 animate-fade-in-view">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Search className="w-10 h-10 opacity-30" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Ничего не найдено</h2>
                <p className="max-w-md text-center">Попробуйте изменить запрос.</p>
            </div>
        )
    }

    if (currentView === 'albums') {
      const albums = Array.from(new Set(tracks.map(t => t.album)));
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-2 stagger-list">
          {albums.map(albumName => {
            const albumTrack = tracks.find(t => t.album === albumName);
            return (
              <div 
                key={albumName} 
                className="group flex flex-col gap-3 p-4 rounded-3xl glass-button transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border-transparent hover:border-white/20"
                onClick={() => onGoToAlbum(albumName)}
              >
                <div className="aspect-square rounded-2xl overflow-hidden shadow-lg relative">
                  <img src={albumTrack?.coverUrl} alt={albumName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); albumTrack && onPlay(albumTrack); }}
                      className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:scale-110 transition-all shadow-xl"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Play className="w-5 h-5 fill-current ml-1" />
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-medium truncate">{albumName}</h3>
                  <p className="text-white/50 text-sm truncate">{albumTrack?.artist}</p>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (currentView === 'artists') {
      const uniqueArtists = new Set<string>();
      tracks.forEach(track => {
          parseArtists(track.artist).forEach(artist => uniqueArtists.add(artist));
      });
      const artists = Array.from(uniqueArtists).sort();

      return (
        <div className="space-y-2 p-2 stagger-list">
          {artists.map(artist => {
            const artistMeta = artistMetadata[artist];
            return (
                <div 
                    key={artist} 
                    className="flex items-center gap-4 p-4 rounded-2xl glass-button transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] border-transparent hover:border-white/20"
                    onClick={() => onGoToArtist(artist)}
                >
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white/50 overflow-hidden relative shadow-inner">
                    {artistMeta?.avatar ? (
                        <img src={artistMeta.avatar} className="w-full h-full object-cover" />
                    ) : (
                        <Mic2 className="w-6 h-6" />
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-white transition-colors" style={{ color: `var(--hover-color, white)` }}
                        onMouseEnter={(e) => e.currentTarget.style.color = accentColor}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                    >{artist}</h3>
                    <p className="text-white/40 text-sm">Исполнитель</p>
                </div>
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-white" />
                </div>
                </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {(currentView === 'artist_detail' || currentView === 'album_detail' || currentView === 'favorites' || currentView === 'search') && (
            <div className={`flex flex-col mb-8 animate-fade-in-view relative overflow-hidden rounded-3xl ${showHeaderImage ? 'min-h-[300px] justify-end p-8' : 'flex-row items-center gap-6 px-2'}`}>
                 
                 {/* Artist Banner Background */}
                 {showHeaderImage && (
                     <>
                        <div className="absolute inset-0 bg-neutral-900">
                             {currentArtistMeta?.banner ? (
                                 <img src={currentArtistMeta.banner} className="w-full h-full object-cover" />
                             ) : (
                                 <div className="w-full h-full bg-gradient-to-b from-neutral-800 to-neutral-900" />
                             )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                        
                        {/* Upload Banner Button (Top Right) */}
                        <div className="absolute top-4 right-4 opacity-0 hover:opacity-100 transition-opacity z-20">
                            <button 
                                onClick={() => bannerInputRef.current?.click()}
                                className="bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs backdrop-blur-md flex items-center gap-2 glass-button"
                            >
                                <Image className="w-3 h-3" /> Изменить обложку
                            </button>
                            <input type="file" ref={bannerInputRef} onChange={(e) => handleArtistImageUpload(e, 'banner')} className="hidden" accept="image/*" />
                        </div>
                     </>
                 )}

                 {/* Content Wrapper */}
                 <div className={`relative z-10 flex items-end gap-6 ${showHeaderImage ? 'w-full' : ''}`}>
                     
                     {currentView === 'album_detail' && (
                         <div className="w-40 h-40 rounded-xl overflow-hidden shadow-2xl">
                             <img src={displayTracks[0]?.coverUrl} className="w-full h-full object-cover" />
                         </div>
                     )}
                     
                     {currentView === 'artist_detail' && (
                         <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-2xl bg-white/10 relative group border-4 border-black/20">
                             {currentArtistMeta?.avatar ? (
                                 <img src={currentArtistMeta.avatar} className="w-full h-full object-cover" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center">
                                     <Mic2 className="w-10 h-10 text-white/50" />
                                 </div>
                             )}
                             <div 
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => avatarInputRef.current?.click()}
                             >
                                 <Upload className="w-6 h-6 text-white" />
                             </div>
                             <input type="file" ref={avatarInputRef} onChange={(e) => handleArtistImageUpload(e, 'avatar')} className="hidden" accept="image/*" />
                         </div>
                     )}

                     {currentView === 'favorites' && (
                         <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                             <Heart className="w-10 h-10 text-white fill-white" />
                         </div>
                     )}
                     
                     {currentView === 'search' && (
                         <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg backdrop-blur-md border border-white/10">
                             <Search className="w-8 h-8 text-white" />
                         </div>
                     )}

                     <div className="flex-1">
                        <h1 className={`${showHeaderImage ? 'text-5xl md:text-7xl' : 'text-4xl'} font-bold text-white mb-2 tracking-tight shadow-black drop-shadow-lg`}>{title}</h1>
                        <p className="text-white/80 text-lg font-medium drop-shadow-md">{subtitle}</p>
                        
                        {/* Play Button Row */}
                        <div className="flex gap-3 mt-6">
                             {displayTracks.length > 0 && (
                                <button 
                                    onClick={() => onPlay(displayTracks[0])} 
                                    className="text-white px-8 py-3 rounded-full text-base font-bold transition-all shadow-lg flex items-center gap-2 hover:opacity-90 hover:scale-105 active:scale-95 glass-button border-0"
                                    style={{ backgroundColor: accentColor, boxShadow: `0 8px 30px ${accentColor}50` }}
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Слушать
                                </button>
                             )}
                        </div>
                     </div>
                 </div>
            </div>
        )}

        {/* Column Headers */}
        <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[40px_3fr_2fr_1.5fr_120px] gap-4 text-xs font-semibold text-white/40 uppercase tracking-wider border-b border-white/5 pb-2 mb-2 px-2 animate-fade-in-view items-center">
          <div className="text-center">#</div>
          <div>Название</div>
          <div className="hidden md:block">Альбом</div>
          <div className="hidden md:block">Год</div>
          <div className="text-right pr-2">Время</div>
        </div>

        {/* Tracks List */}
        <div className="stagger-list pb-8">
          {displayTracks.map((track, index) => {
            const active = currentTrack?.id === track.id;
            const isMenuOpen = activeMenuId === track.id;

            return (
              <div 
                key={track.id}
                style={{ zIndex: isMenuOpen ? 50 : 'auto', position: 'relative' }}
                className={`group grid grid-cols-[auto_1fr_auto] md:grid-cols-[40px_3fr_2fr_1.5fr_120px] gap-4 items-center py-2 px-2 rounded-xl cursor-pointer transition-all duration-200 border border-transparent ${
                  active 
                    ? 'bg-white/15 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] border-white/10' 
                    : 'hover:bg-white/5 hover:border-white/5'
                }`}
              >
                <div 
                  className="w-full flex justify-center text-white/40 text-sm font-medium"
                  onClick={() => onPlay(track)}
                >
                  <span className={`group-hover:hidden ${active ? 'hidden' : 'block'}`}>{index + 1}</span>
                  <button className={`hidden group-hover:block ${active ? 'block' : ''} text-white`}>
                    {active && playbackState === PlaybackState.PLAYING ? (
                      <div className="flex gap-[2px] items-end h-3 w-3">
                        <div className="w-0.5 h-full animate-[bounce_0.8s_infinite]" style={{ backgroundColor: accentColor }}></div>
                        <div className="w-0.5 h-2/3 animate-[bounce_1.1s_infinite]" style={{ backgroundColor: accentColor }}></div>
                        <div className="w-0.5 h-full animate-[bounce_0.6s_infinite]" style={{ backgroundColor: accentColor }}></div>
                      </div>
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3 min-w-0" onClick={() => onPlay(track)}>
                  <img src={track.coverUrl} alt="" className="w-10 h-10 rounded-lg shadow-md object-cover bg-neutral-800 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-medium truncate ${active ? '' : 'text-white'}`} style={{ color: active ? accentColor : undefined }}>{track.title}</span>
                    <span className="text-xs text-white/50 truncate group-hover:text-white/70">
                       {/* Render Artists Clickable */}
                       {parseArtists(track.artist).map((artist, i, arr) => (
                           <span key={i} onClick={(e) => { e.stopPropagation(); onGoToArtist(artist); }} className="hover:text-white hover:underline cursor-pointer relative z-20">
                               {artist}{i < arr.length - 1 ? ', ' : ''}
                           </span>
                       ))}
                    </span>
                  </div>
                </div>

                {/* Render Album Clickable */}
                <div 
                    className="text-sm text-white/50 truncate min-w-0 group-hover:text-white/70 hidden md:block" 
                    onClick={() => onPlay(track)}
                >
                    <span onClick={(e) => { e.stopPropagation(); onGoToAlbum(track.album); }} className="hover:text-white hover:underline cursor-pointer relative z-20">
                        {track.album}
                    </span>
                </div>
                
                <div className="text-sm text-white/40 truncate min-w-0 hidden md:block">{track.year || '-'}</div>

                {/* Fixed Right Column */}
                <div className="flex items-center justify-end gap-4 relative md:justify-self-end w-full pr-2">
                  <span className={`text-sm font-mono text-white/40 group-hover:text-white/70 ${isMenuOpen ? 'hidden' : 'group-hover:hidden block'}`}>{formatTime(track.duration)}</span>
                  <button 
                      onMouseDown={(e) => e.stopPropagation()} 
                      onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : track.id);
                      }}
                      className={`items-center justify-center p-1.5 rounded-md hover:bg-white/10 transition-colors ${isMenuOpen ? 'flex bg-white/10 text-white' : 'hidden group-hover:flex'}`}
                  >
                      <MoreHorizontal className="w-5 h-5" />
                  </button>

                  {isMenuOpen && (
                      <div 
                        ref={menuRef} 
                        onMouseDown={(e) => e.stopPropagation()} 
                        className="absolute top-8 right-0 w-48 bg-[#1e1e20]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-zoom-in origin-top-right"
                      >
                          <div className="p-1">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); setEditingTrack(track); setActiveMenuId(null); }}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 flex items-center gap-2"
                              >
                                  <Edit className="w-4 h-4 text-white/60" /> Редактировать
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onGoToAlbum(track.album); setActiveMenuId(null); }}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 flex items-center gap-2"
                              >
                                  <Disc className="w-4 h-4 text-white/60" /> Перейти к альбому
                              </button>
                              <div className="h-px bg-white/10 my-1"></div>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onDeleteTrack(track.id); setActiveMenuId(null); }}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                              >
                                  <Trash2 className="w-4 h-4" /> Удалить
                              </button>
                          </div>
                      </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getTitle = () => {
    switch(currentView) {
      case 'albums': return 'Альбомы';
      case 'artists': return 'Артисты';
      case 'recent': return 'Недавно добавленные';
      case 'browse': return 'Обзор';
      case 'radio': return 'Радио';
      case 'listen_now': return 'Слушать';
      case 'artist_detail': return 'Артист';
      case 'album_detail': return 'Альбом';
      case 'favorites': return 'Избранное';
      case 'search': return 'Поиск';
      default: return 'Песни';
    }
  }

  return (
    <div className="flex-1 h-full overflow-y-auto pb-32 pt-8 px-8 custom-scrollbar relative">
      {/* Edit Modal */}
      {editingTrack && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in-view"
          onMouseDown={(e) => e.stopPropagation()}
        >
             <div className="bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-zoom-in flex flex-col max-h-[90vh]" onMouseDown={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-xl font-bold text-white">Редактировать трек</h3>
                    <button onClick={() => setEditingTrack(null)} className="text-white/40 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleEditSave} className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex gap-6 mb-6">
                        <div className="w-32 h-32 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group shrink-0">
                            <img src={editingTrack.coverUrl} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Upload className="w-6 h-6 text-white mb-1" />
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleCoverUpload} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-1">Название</label>
                                <input type="text" value={editingTrack.title} onChange={e => setEditingTrack({...editingTrack, title: e.target.value})} className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent)]" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-white/40 mb-1">Исполнитель</label>
                                <input type="text" value={editingTrack.artist} onChange={e => setEditingTrack({...editingTrack, artist: e.target.value})} className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm focus:outline-none" />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-1">Альбом</label>
                                    <input type="text" value={editingTrack.album} onChange={e => setEditingTrack({...editingTrack, album: e.target.value})} className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-1">Год</label>
                                    <input type="text" value={editingTrack.year || ''} onChange={e => setEditingTrack({...editingTrack, year: e.target.value})} className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm focus:outline-none" placeholder="2024" />
                                </div>
                             </div>
                        </div>
                    </div>
                    
                    {/* Lyrics Editor */}
                    <div className="border-t border-white/10 pt-6">
                        <label className="block text-sm font-medium text-white/60 mb-2 flex items-center gap-2">
                            <Quote className="w-4 h-4" /> Текст песни
                        </label>
                        <div className="text-xs text-white/40 mb-2">
                             Вставьте текст песни. Можно просто текст (без таймингов), либо в формате LRC (<code>[мм:сс] Строка</code>).
                        </div>
                        <textarea 
                            value={editingTrack.lyrics || ''}
                            onChange={e => setEditingTrack({...editingTrack, lyrics: e.target.value})}
                            className="w-full h-48 glass-input rounded-xl p-3 text-white/80 text-sm font-mono focus:outline-none resize-none leading-relaxed"
                            placeholder="Просто вставьте текст сюда..."
                        />
                    </div>

                     <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-[#1c1c1e] z-10">
                         <button type="button" onClick={() => setEditingTrack(null)} className="px-4 py-2 rounded-lg text-white/60 hover:text-white text-sm font-medium glass-button border-0">Отмена</button>
                         <button type="submit" className="px-6 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 glass-button border-0" style={{ backgroundColor: accentColor }}>
                             <Check className="w-4 h-4" /> Сохранить
                         </button>
                     </div>
                </form>
            </div>
        </div>
      )}

      {(currentView !== 'artist_detail' && currentView !== 'album_detail' && currentView !== 'favorites' && currentView !== 'search') && (
        <div className="flex items-end justify-between mb-8 sticky top-0 z-10 py-4 -mx-8 px-8 backdrop-blur-md bg-transparent transition-all animate-fade-in-view">
            <div>
            <h2 className="text-4xl font-bold text-white mb-1 tracking-tight drop-shadow-lg">{getTitle()}</h2>
            <p className="text-white/40 text-sm font-medium">{tracks.length} Композиций</p>
            </div>
            <div className="flex gap-2">
            <button onClick={() => tracks.length > 0 && onPlay(tracks[0])} className="bg-white text-black px-6 py-2 rounded-full text-sm font-semibold hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10">Play</button>
            <button onClick={onShuffleAll} className="glass-button text-white px-6 py-2 rounded-full text-sm font-semibold hover:scale-105 active:scale-95 transition-all backdrop-blur-md">Перемешать</button>
            </div>
        </div>
      )}

      {(currentView === 'artist_detail' || currentView === 'album_detail' || currentView === 'favorites' || currentView === 'search') && (
          <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white mb-4 transition-colors animate-fade-in-view absolute top-8 left-8 z-30 glass-button px-4 py-2 rounded-full border-0">
              <ArrowLeft className="w-4 h-4" /> Назад
          </button>
      )}

      {/* Force animation on view change by using key */}
      <div key={currentView}>
        {renderContent()}
      </div>
      <div className="h-10" />
    </div>
  );
};

export default MainView;