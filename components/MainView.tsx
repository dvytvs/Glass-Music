
import React, { useState, useRef, useEffect } from 'react';
import { Track, PlaybackState, ViewType } from '../types';
import { Play, MoreHorizontal, Music, Disc, Mic2, Edit, Trash2, ArrowRight, X, Check, Upload, ArrowLeft } from './Icons';
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
}

const MainView: React.FC<MainViewProps> = ({ 
  tracks, currentTrack, playbackState, onPlay, onShuffleAll, currentView, 
  selectedArtist, selectedAlbum, onUpdateTrack, onDeleteTrack, onGoToArtist, onGoToAlbum, onBack
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        coverUrl: editingTrack.coverUrl
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

  const isPlaying = (id: string) => currentTrack?.id === id && playbackState === PlaybackState.PLAYING;

  // Render logic based on view
  const renderContent = () => {
    // Filter tracks based on view type
    let displayTracks = tracks;
    let title = "";
    let subtitle = "";

    if (currentView === 'artist_detail' && selectedArtist) {
        displayTracks = tracks.filter(t => t.artist === selectedArtist);
        title = selectedArtist;
        subtitle = "Исполнитель";
    } else if (currentView === 'album_detail' && selectedAlbum) {
        displayTracks = tracks.filter(t => t.album === selectedAlbum);
        title = selectedAlbum;
        subtitle = `Альбом • ${displayTracks[0]?.artist || ''}`;
    }

    if (tracks.length === 0) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-white/50">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <Music className="w-10 h-10 opacity-30" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Музыка не найдена</h2>
          <p className="max-w-md text-center">Импортируйте локальные файлы. Поддерживаются MP3, WAV, FLAC.</p>
        </div>
      );
    }

    if (currentView === 'albums') {
      const albums = Array.from(new Set(tracks.map(t => t.album)));
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-2">
          {albums.map(albumName => {
            const albumTrack = tracks.find(t => t.album === albumName);
            return (
              <div 
                key={albumName} 
                className="group flex flex-col gap-3 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => onGoToAlbum(albumName)}
              >
                <div className="aspect-square rounded-xl overflow-hidden shadow-lg relative">
                  <img src={albumTrack?.coverUrl} alt={albumName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); albumTrack && onPlay(albumTrack); }}
                      className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-pink-500 hover:scale-110 transition-all"
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
      const artists = Array.from(new Set(tracks.map(t => t.artist)));
      return (
        <div className="space-y-2 p-2">
          {artists.map(artist => (
            <div 
                key={artist} 
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                onClick={() => onGoToArtist(artist)}
            >
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white/50 overflow-hidden">
                 {/* Try to find an image from a track, else default */}
                 <Mic2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white group-hover:text-pink-400 transition-colors">{artist}</h3>
                <p className="text-white/40 text-sm">Исполнитель</p>
              </div>
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // LIST VIEW (Songs, Artist Detail, Album Detail, Recent, etc)
    return (
      <div className="space-y-1">
        {/* Detail Header for Artist/Album */}
        {(currentView === 'artist_detail' || currentView === 'album_detail') && (
            <div className="flex items-center gap-6 mb-8 px-2">
                 {currentView === 'album_detail' && (
                     <div className="w-40 h-40 rounded-xl overflow-hidden shadow-2xl">
                         <img src={displayTracks[0]?.coverUrl} className="w-full h-full object-cover" />
                     </div>
                 )}
                 <div>
                    <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
                    <p className="text-white/60 text-lg">{subtitle}</p>
                    <div className="flex gap-3 mt-4">
                         <button 
                            onClick={() => displayTracks.length > 0 && onPlay(displayTracks[0])} 
                            className="bg-pink-600 hover:bg-pink-500 text-white px-8 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-lg shadow-pink-600/20 flex items-center gap-2"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Слушать
                        </button>
                    </div>
                 </div>
            </div>
        )}

        {/* Grid Header */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 text-xs font-semibold text-white/40 uppercase tracking-wider border-b border-white/5 pb-2 mb-2 px-2">
          <div className="w-8 text-center">#</div>
          <div>Название</div>
          <div>Альбом</div>
          <div className="hidden md:block">Год</div>
          <div className="w-16 text-right">Время</div>
        </div>

        {displayTracks.map((track, index) => {
          const active = currentTrack?.id === track.id;
          const isMenuOpen = activeMenuId === track.id;

          return (
            <div 
              key={track.id}
              className={`group grid grid-cols-[auto_1fr_1fr_auto] md:grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 items-center py-2 px-2 rounded-lg cursor-pointer transition-all duration-200 ${
                active 
                  ? 'bg-white/15 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]' 
                  : 'hover:bg-white/5'
              }`}
            >
              <div 
                className="w-8 flex justify-center text-white/40 text-sm font-medium"
                onClick={() => onPlay(track)}
              >
                <span className={`group-hover:hidden ${active ? 'hidden' : 'block'}`}>{index + 1}</span>
                <button className={`hidden group-hover:block ${active ? 'block' : ''} text-white`}>
                   {active && playbackState === PlaybackState.PLAYING ? (
                     <div className="flex gap-[2px] items-end h-3 w-3">
                       <div className="w-0.5 bg-pink-500 h-full animate-[bounce_0.8s_infinite]"></div>
                       <div className="w-0.5 bg-pink-500 h-2/3 animate-[bounce_1.1s_infinite]"></div>
                       <div className="w-0.5 bg-pink-500 h-full animate-[bounce_0.6s_infinite]"></div>
                     </div>
                   ) : (
                     <Play className="w-3 h-3 fill-current" />
                   )}
                </button>
              </div>

              <div className="flex items-center gap-3 min-w-0" onClick={() => onPlay(track)}>
                <img src={track.coverUrl} alt="" className="w-10 h-10 rounded shadow-md object-cover bg-neutral-800" />
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm font-medium truncate ${active ? 'text-pink-400' : 'text-white'}`}>{track.title}</span>
                  <span className="text-xs text-white/50 truncate group-hover:text-white/70">{track.artist}</span>
                </div>
              </div>

              <div className="text-sm text-white/50 truncate min-w-0 group-hover:text-white/70 hidden md:block" onClick={() => onPlay(track)}>{track.album}</div>
              
              <div className="text-sm text-white/40 truncate min-w-0 hidden md:block">{track.year || '-'}</div>

              <div className="w-16 text-right text-sm font-mono text-white/40 group-hover:text-white/70 flex items-center justify-end gap-4 ml-auto relative">
                 <span className="group-hover:hidden">{formatTime(track.duration)}</span>
                 <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : track.id);
                    }}
                    className={`hidden group-hover:flex items-center justify-center p-1 rounded-md hover:bg-white/10 ${isMenuOpen ? 'flex bg-white/10 text-white' : ''}`}
                 >
                    <MoreHorizontal className="w-4 h-4" />
                 </button>

                 {/* Context Menu */}
                 {isMenuOpen && (
                     <div ref={menuRef} className="absolute top-8 right-0 w-48 bg-[#1e1e20] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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
      default: return 'Песни';
    }
  }

  return (
    <div className="flex-1 h-full overflow-y-auto pb-32 pt-8 px-8 custom-scrollbar relative">
      
      {/* Edit Modal */}
      {editingTrack && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Редактировать трек</h3>
                    <button onClick={() => setEditingTrack(null)} className="text-white/40 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleEditSave} className="p-6 space-y-6">
                    <div className="flex gap-6">
                        <div className="w-32 h-32 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                            <img src={editingTrack.coverUrl} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Upload className="w-6 h-6 text-white mb-1" />
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleCoverUpload} 
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                            />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-1">Название</label>
                                <input 
                                    type="text" 
                                    value={editingTrack.title} 
                                    onChange={e => setEditingTrack({...editingTrack, title: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-white/40 mb-1">Исполнитель</label>
                                <input 
                                    type="text" 
                                    value={editingTrack.artist} 
                                    onChange={e => setEditingTrack({...editingTrack, artist: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                                />
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-white/40 mb-1">Альбом</label>
                            <input 
                                type="text" 
                                value={editingTrack.album} 
                                onChange={e => setEditingTrack({...editingTrack, album: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-white/40 mb-1">Год</label>
                            <input 
                                type="text" 
                                value={editingTrack.year || ''} 
                                onChange={e => setEditingTrack({...editingTrack, year: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                            />
                        </div>
                     </div>
                     <div className="flex justify-end gap-3 pt-2">
                         <button type="button" onClick={() => setEditingTrack(null)} className="px-4 py-2 rounded-lg text-white/60 hover:text-white text-sm font-medium">Отмена</button>
                         <button type="submit" className="px-6 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium flex items-center gap-2">
                             <Check className="w-4 h-4" /> Сохранить
                         </button>
                     </div>
                </form>
            </div>
        </div>
      )}

      {/* Header */}
      {(currentView !== 'artist_detail' && currentView !== 'album_detail') && (
        <div className="flex items-end justify-between mb-8 sticky top-0 z-10 py-4 -mx-8 px-8 backdrop-blur-md bg-transparent transition-all">
            <div>
            <h2 className="text-4xl font-bold text-white mb-1 tracking-tight">{getTitle()}</h2>
            <p className="text-white/40 text-sm font-medium">{tracks.length} Композиций • Локальная библиотека</p>
            </div>
            <div className="flex gap-2">
            <button onClick={() => tracks.length > 0 && onPlay(tracks[0])} className="bg-white text-black px-6 py-2 rounded-full text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg shadow-white/10">Play</button>
            <button onClick={onShuffleAll} className="bg-white/10 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-white/20 transition-colors backdrop-blur-md">Перемешать</button>
            </div>
        </div>
      )}

      {/* Back button for Details View */}
      {(currentView === 'artist_detail' || currentView === 'album_detail') && (
          <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Назад
          </button>
      )}

      {renderContent()}
      
      {/* Bottom Spacer */}
      <div className="h-10" />
    </div>
  );
};

export default MainView;
