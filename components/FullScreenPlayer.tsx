
import React, { useState, useEffect } from 'react';
import { Track, PlaybackState } from '../types';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  Shuffle, Repeat, Minimize2, Heart, MoreHorizontal, 
  Quote
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
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleShuffle: () => void;
  onToggleLike: (trackId: string) => void;
  onClose: () => void;
  accentColor: string;
  initialMode: 'cover' | 'lyrics';
}

const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  track,
  playbackState,
  currentTime,
  duration,
  volume,
  isShuffled,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleLike,
  onClose,
  accentColor,
  initialMode
}) => {
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  
  const [showLyrics, setShowLyrics] = useState(initialMode === 'lyrics');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
     setShowLyrics(initialMode === 'lyrics');
  }, [initialMode]);

  const handleClose = () => {
    setIsClosing(true);
  };

  const onAnimationEnd = () => {
    if (isClosing) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] overflow-hidden flex flex-col ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
      onAnimationEnd={onAnimationEnd}
    >
      {/* Background Layer - Reduced opacity for better Glass Effect (Request #2) */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-3xl z-0 fullscreen-bg"></div>
      
      {/* Dynamic Colored Glow */}
      <div 
        className="absolute inset-0 z-0 opacity-60 scale-125 blur-3xl transition-all duration-[2s] fullscreen-glow"
        style={{ 
          backgroundImage: `url(${track.coverUrl})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          willChange: 'opacity, transform'
        }}
      ></div>

      {/* Header Controls */}
      <div className="relative z-10 flex items-center justify-between px-8 py-8 shrink-0">
        <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full glass-button text-white/80 hover:text-white transition-colors">
          <Minimize2 className="w-5 h-5" />
        </button>
        <div className="w-16 h-1.5 bg-white/20 rounded-full backdrop-blur-md"></div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full glass-button text-white/80 hover:text-white transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 px-8 max-w-screen-2xl mx-auto w-full overflow-hidden pb-8">
        
        {/* Layout Logic: (Request #1) 
            If Lyrics ON: Split Screen (Cover Left, Lyrics Right).
            If Lyrics OFF: Centered Cover.
        */}
        
        {/* Left Side: Cover Art */}
        <div className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col items-center justify-center
            ${showLyrics 
                ? 'w-full md:w-1/3 h-[30vh] md:h-auto md:aspect-square order-1 md:order-1' 
                : 'w-full max-w-md aspect-square order-1'
            }`}
        >
             <div className={`rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 glass-panel animate-zoom-in transition-all duration-500 relative
                 ${showLyrics 
                    ? 'w-auto h-full aspect-square md:w-full md:h-auto' 
                    : 'w-full h-full aspect-square' // Strict aspect ratio
                 }`}>
                <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover" />
             </div>
             
             {/* Info under cover ONLY in lyrics mode (Apple Music style) */}
             {showLyrics && (
                 <div className="mt-6 text-center md:text-left w-full space-y-1 hidden md:block animate-fade-in-view">
                     <h2 className="text-2xl font-bold truncate text-white drop-shadow-md">{track.title}</h2>
                     <p className="text-lg text-white/60 truncate font-medium">{track.artist}</p>
                 </div>
             )}
        </div>

        {/* Right Side / Center: Content */}
        <div className={`transition-all duration-500 w-full flex flex-col justify-center
            ${showLyrics 
                ? 'md:w-1/2 h-full order-2 md:order-2' 
                : 'max-w-md order-2' // Controls container when no lyrics
            }`}
        >
            {showLyrics ? (
                // --- LYRICS VIEW ---
                <div className="h-full w-full rounded-3xl glass-sidebar border border-white/5 p-4 md:p-8 relative overflow-hidden">
                    <LyricsView lyricsRaw={track.lyrics} currentTime={currentTime} />
                </div>
            ) : (
                // --- CONTROLS VIEW (Standard) ---
                <div className="flex flex-col gap-8 p-8 rounded-3xl glass-sidebar border border-white/10 shadow-2xl w-full">
                    <div className="space-y-2 text-center md:text-left">
                        <h2 className="text-3xl font-bold truncate text-white drop-shadow-md">{track.title}</h2>
                        <p className="text-xl text-white/60 truncate font-medium">{track.artist}</p>
                    </div>

                    <div className="group pt-2">
                        <div 
                        className="h-2 bg-white/10 rounded-full cursor-pointer relative mb-3 overflow-hidden"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            onSeek(percent * duration);
                        }}
                        >
                        <div 
                            className="absolute h-full rounded-full transition-all duration-100 shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                            style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
                        ></div>
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-white/40 tracking-wide">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <button 
                        onClick={onToggleShuffle} 
                        className={`transition-all p-2 rounded-full hover:bg-white/10 ${isShuffled ? '' : 'text-white/30 hover:text-white'}`}
                        style={{ color: isShuffled ? accentColor : undefined }}
                        >
                        <Shuffle className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center gap-6">
                        <button onClick={onPrev} className="text-white hover:text-white/70 transition-colors active:scale-90 transform duration-150 p-2 hover:bg-white/10 rounded-full">
                            <SkipBack className="w-8 h-8 fill-current" />
                        </button>
                        <button 
                            onClick={onPlayPause}
                            className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                        >
                            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </button>
                        <button onClick={onNext} className="text-white hover:text-white/70 transition-colors active:scale-90 transform duration-150 p-2 hover:bg-white/10 rounded-full">
                            <SkipForward className="w-8 h-8 fill-current" />
                        </button>
                        </div>

                        <button className="text-white/30 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                        <Repeat className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-3 w-full pr-4">
                        <Volume2 className="w-4 h-4 text-white/50" />
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01" 
                            value={volume}
                            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                        />
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                            <button 
                                onClick={() => setShowLyrics(!showLyrics)}
                                className={`p-2.5 rounded-full glass-button transition-all hover:scale-110 active:scale-95 ${showLyrics ? '' : 'text-white/40'}`}
                                style={{ color: showLyrics ? accentColor : undefined }}
                                title="Текст песни"
                            >
                                <Quote className="w-5 h-5 fill-current" />
                            </button>

                            <button 
                                onClick={() => onToggleLike(track.id)}
                                className={`p-2.5 rounded-full glass-button transition-all hover:scale-110 active:scale-95 ${track.isLiked ? '' : 'text-white/40'}`}
                                style={{ color: track.isLiked ? accentColor : undefined }}
                            >
                                <Heart className={`w-5 h-5 ${track.isLiked ? 'fill-current' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Floating Controls Bar (Only visible when Lyrics are ON to control music while reading) */}
      {showLyrics && (
          <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-center z-20 pointer-events-none">
              <div className="pointer-events-auto bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/10 rounded-full px-8 py-4 flex items-center gap-8 shadow-2xl animate-slide-up">
                 <button onClick={onPrev}><SkipBack className="w-6 h-6 fill-current text-white hover:text-white/70" /></button>
                 <button onClick={onPlayPause} className="bg-white text-black rounded-full p-3 hover:scale-105 transition-transform">
                     {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                 </button>
                 <button onClick={onNext}><SkipForward className="w-6 h-6 fill-current text-white hover:text-white/70" /></button>
                 <div className="w-px h-8 bg-white/10 mx-2"></div>
                 <button 
                    onClick={() => setShowLyrics(false)} 
                    className="text-white/50 hover:text-white"
                    title="Скрыть текст"
                 >
                     <Quote className="w-5 h-5 fill-current text-[var(--accent)]" style={{ color: accentColor }} />
                 </button>
              </div>
          </div>
      )}

    </div>
  );
};

export default FullScreenPlayer;