import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Track, PlaybackState } from '../types';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Heart, Quote, Image as ImageIcon,
  ChevronDown, Headphones, RefreshCw
} from './Icons';
import { formatTime } from '../utils';
import LyricsView from './LyricsView';

interface FullScreenPlayerProps {
  track: Track;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  isRepeating: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (trackId: string) => void;
  onClose: () => void;
  accentColor: string;
  initialMode: 'cover' | 'lyrics';
  enableGlass: boolean;
  audioEffect?: 'normal' | 'slowed' | 'spedup';
  onToggleAudioEffect?: () => void;
  analyser?: AnalyserNode | null;
  onRefetchLyrics?: (track: Track) => void;
  isRefetchingLyrics?: boolean;
  onGoToAlbum?: (album: string, artist?: string) => void;
  onGoToArtist?: (artist: string) => void;
}

const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  track,
  playbackState,
  currentTime,
  duration,
  volume,
  isShuffled,
  isRepeating,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onClose,
  accentColor,
  initialMode,
  enableGlass,
  audioEffect = 'normal',
  onToggleAudioEffect,
  analyser,
  onRefetchLyrics,
  isRefetchingLyrics,
  onGoToAlbum,
  onGoToArtist
}) => {
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const progressPercent = duration && duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  
  const [viewMode, setViewMode] = useState<'cover' | 'lyrics'>(initialMode);
  const [isClosing, setIsClosing] = useState(false);
  const [audioDeviceName, setAudioDeviceName] = useState<string>('Наушники');
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);
  const prevVolumeRef = useRef<number>(1);

  useEffect(() => {
    setViewMode(initialMode === 'lyrics' ? 'lyrics' : 'cover');
  }, [initialMode]);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const output = devices.find(d => d.kind === 'audiooutput' && d.label);
        if (output && output.label) {
          setAudioDeviceName(output.label);
        } else {
          setAudioDeviceName('Наушники');
        }
      }).catch(() => {
        setAudioDeviceName('Наушники');
      });
    }
  }, []);

  const handleClose = () => {
    setIsClosing(true);
  };

  const onAnimationEnd = (e: React.AnimationEvent) => {
    if (isClosing && e.animationName === 'slideDownFull') {
      onClose();
    }
  };

  const playButtonColor = accentColor && accentColor !== '#ffffff' ? accentColor : '#e8a5c8';

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-[#050505] overflow-hidden flex flex-col ${isClosing ? 'animate-slide-down-full' : 'animate-slide-up-full'}`}
      onAnimationEnd={onAnimationEnd}
    >
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {track.coverUrl ? (
          <div 
            className="absolute -inset-24 bg-cover bg-center filter blur-3xl scale-125 opacity-35 transition-all duration-1000 transform-gpu"
            style={{ 
              backgroundImage: `url(${track.coverUrl})`,
              willChange: 'transform, opacity'
            }}
          />
        ) : (
          <div 
            className="absolute inset-0 opacity-20 blur-3xl"
            style={{ 
              background: `radial-gradient(circle at 30% 50%, ${accentColor} 0%, transparent 70%)`
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" />
      </div>

      <div className="absolute top-6 right-8 z-50 flex items-center gap-3">
        <button 
          onClick={() => setViewMode(viewMode === 'lyrics' ? 'cover' : 'lyrics')}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 backdrop-blur-md border ${
            viewMode === 'lyrics' 
              ? 'bg-white/20 border-white/30 text-white' 
              : 'bg-white/10 hover:bg-white/20 border-white/10 text-white/70 hover:text-white'
          }`}
          title={viewMode === 'lyrics' ? 'Показать обложку' : 'Показать текст песни'}
        >
          {viewMode === 'lyrics' ? <ImageIcon className="w-4 h-4" /> : <Quote className="w-4 h-4" />}
        </button>

        <button 
          onClick={handleClose} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all active:scale-90 backdrop-blur-md border border-white/10"
          title="Свернуть"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      <div key={track.id} className="relative z-10 w-full h-full flex flex-col px-8 md:px-16 lg:px-24 pt-12 pb-6 max-w-[1700px] mx-auto animate-fade-in overflow-hidden">
        {viewMode === 'lyrics' ? (
          <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-center justify-between gap-12 lg:gap-20 overflow-hidden w-full">
            <div className="w-full lg:w-[380px] shrink-0 flex flex-col items-start select-none">
              <div className={`relative aspect-square w-64 md:w-80 lg:w-[360px] rounded-[32px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-white/15 bg-white/5 transition-transform duration-700 ${isPlaying ? 'scale-100' : 'scale-[0.98]'}`}>
                <img 
                  src={track.coverUrl} 
                  alt={track.title}
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'assets/default-cover.png';
                  }}
                />
              </div>

              <div className="mt-8 w-full max-w-[360px]">
                <h1 
                  className={`text-2xl md:text-3xl font-extrabold text-white tracking-tight line-clamp-2 leading-tight ${onGoToAlbum ? 'cursor-pointer hover:underline' : ''}`}
                  onClick={() => {
                    if (onGoToAlbum && track) {
                      onClose();
                      onGoToAlbum(track.album || track.title, track.albumArtist || track.artist);
                    }
                  }}
                  title={track.title}
                >
                  {track.title}
                </h1>

                <div className="flex items-center gap-2 mt-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-white/10 text-white/90 border border-white/15 tracking-wider">
                    E
                  </span>
                  <p 
                    className={`text-sm md:text-base font-semibold text-white/70 truncate ${onGoToArtist ? 'cursor-pointer hover:text-white hover:underline' : ''}`}
                    onClick={() => {
                      if (onGoToArtist && track.artist) {
                        onClose();
                        onGoToArtist(track.artist);
                      }
                    }}
                  >
                    {track.artist}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3 text-xs text-white/40 font-medium truncate">
                  <Headphones className="w-3.5 h-3.5 shrink-0 text-white/50" />
                  <span className="truncate">{audioDeviceName}</span>
                </div>

                <div className="flex items-center gap-4 mt-7">
                  <button 
                    onClick={onPrev}
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90"
                    title="Предыдущий трек"
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>

                  <button 
                    onClick={onPlayPause}
                    className="w-14 h-14 rounded-full text-black flex items-center justify-center transition-all active:scale-95 shadow-xl hover:scale-105"
                    style={{ backgroundColor: playButtonColor }}
                    title={isPlaying ? 'Пауза' : 'Воспроизведение'}
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                  </button>

                  <button 
                    onClick={onNext}
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90"
                    title="Следующий трек"
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button 
                    onClick={() => onToggleLike(track.id)}
                    className="text-white/40 hover:text-white p-1 rounded-full transition-colors active:scale-90"
                    title={track.isLiked ? 'Удалить из избранного' : 'Добавить в избранное'}
                  >
                    <Heart className={`w-6 h-6 ${track.isLiked ? 'fill-white text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full h-[55vh] lg:h-[75vh] flex flex-col justify-center overflow-hidden">
              <LyricsView 
                lyricsRaw={track.lyrics} 
                currentTime={currentTime} 
                onSeek={onSeek} 
                onRefetchLyrics={() => onRefetchLyrics && onRefetchLyrics(track)}
                isRefetching={isRefetchingLyrics}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center overflow-hidden w-full max-w-4xl mx-auto text-center select-none">
            <div className={`relative aspect-square w-72 md:w-96 lg:w-[460px] rounded-[44px] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.9)] border border-white/15 bg-white/5 transition-transform duration-700 ${isPlaying ? 'scale-100' : 'scale-[0.98]'}`}>
              <img 
                src={track.coverUrl} 
                alt={track.title}
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'assets/default-cover.png';
                }}
              />
            </div>

            <div className="mt-10 w-full">
              <h1 
                className={`text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight line-clamp-2 ${onGoToAlbum ? 'cursor-pointer hover:underline' : ''}`}
                onClick={() => {
                  if (onGoToAlbum && track) {
                    onClose();
                    onGoToAlbum(track.album || track.title, track.albumArtist || track.artist);
                  }
                }}
              >
                {track.title}
              </h1>
              <p 
                className={`text-xl md:text-2xl font-bold text-white/60 mt-3 ${onGoToArtist ? 'cursor-pointer hover:text-white hover:underline' : ''}`}
                onClick={() => {
                  if (onGoToArtist && track.artist) {
                    onClose();
                    onGoToArtist(track.artist);
                  }
                }}
              >
                {track.artist}
              </p>
            </div>

            <div className="flex items-center gap-6 mt-8">
              <button 
                onClick={onPrev}
                className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              <button 
                onClick={onPlayPause}
                className="w-20 h-20 rounded-full text-black flex items-center justify-center transition-all active:scale-95 shadow-2xl hover:scale-105"
                style={{ backgroundColor: playButtonColor }}
              >
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </button>

              <button 
                onClick={onNext}
                className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button 
                onClick={() => onToggleLike(track.id)}
                className="text-white/40 hover:text-white p-2 rounded-full transition-colors active:scale-90"
              >
                <Heart className={`w-7 h-7 ${track.isLiked ? 'fill-white text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]' : ''}`} />
              </button>
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl mx-auto pt-6 pb-2 shrink-0">
          <div className="flex items-center justify-between text-xs font-semibold text-white/40 mb-2 tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="w-full relative h-1.5 group flex items-center cursor-pointer">
            <input 
              type="range" 
              min="0" 
              max={duration > 0 ? duration : 100} 
              step="0.01"
              value={currentTime} 
              onChange={(e) => onSeek(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30 touch-none"
            />
            
            <div className="relative w-full h-full bg-white/15 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-75"
                style={{ 
                  width: `${progressPercent}%`, 
                  backgroundColor: accentColor && accentColor !== '#ffffff' ? accentColor : '#ffffff' 
                }}
              />
            </div>

            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none transition-transform group-hover:scale-125"
              style={{ left: `${progressPercent}%`, marginLeft: '-7px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenPlayer;