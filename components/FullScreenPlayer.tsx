
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

  const onAnimationEnd = (e: React.AnimationEvent) => {
    if (isClosing && e.animationName === 'fadeOut') {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] overflow-hidden flex flex-col ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      onAnimationEnd={onAnimationEnd}
    >
      {/* Background Layer */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[100px] z-0"></div>
      
      {/* Dynamic Colored Glow */}
      <div 
        className="absolute inset-0 z-0 opacity-40 scale-150 blur-[120px] transition-all duration-[3s]"
        style={{ 
          backgroundImage: `url(${track.coverUrl})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
        }}
      ></div>

      {/* Header Controls */}
      <div className="relative z-10 flex items-center justify-between px-12 py-12 shrink-0">
        <button onClick={handleClose} className="w-14 h-14 flex items-center justify-center rounded-[20px] bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90">
          <Minimize2 className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-1">Сейчас играет</span>
            <div className="w-12 h-1 bg-white/10 rounded-full"></div>
        </div>
        <button className="w-14 h-14 flex items-center justify-center rounded-[20px] bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 px-12 max-w-screen-2xl mx-auto w-full overflow-hidden pb-12">
        
        {/* Left Side: Cover Art */}
        <div className={`transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center justify-center
            ${showLyrics 
                ? 'w-full md:w-1/3 h-[35vh] md:h-auto md:aspect-square order-1' 
                : 'w-full max-w-xl aspect-square order-1'
            }`}
        >
             <div className={`rounded-[40px] md:rounded-[60px] overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.8)] border border-white/10 animate-scale-in transition-all duration-700 relative group
                 ${showLyrics 
                    ? 'w-auto h-full aspect-square md:w-full md:h-auto' 
                    : 'w-full h-full aspect-square'
                 }`}>
                <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </div>
             
             {showLyrics && (
                 <div className="mt-10 text-center md:text-left w-full space-y-2 hidden md:block animate-fade-in">
                     <h2 className="text-4xl font-black truncate text-white tracking-tighter">{track.title}</h2>
                     <p className="text-xl text-white/40 truncate font-bold uppercase tracking-widest">{track.artist}</p>
                 </div>
             )}
        </div>

        {/* Right Side / Center: Content */}
        <div className={`transition-all duration-700 w-full flex flex-col justify-center
            ${showLyrics 
                ? 'md:w-1/2 h-full order-2' 
                : 'max-w-xl order-2'
            }`}
        >
            {showLyrics ? (
                <div className="h-full w-full rounded-[40px] bg-white/[0.02] border border-white/5 p-6 md:p-12 relative overflow-hidden backdrop-blur-3xl">
                    <LyricsView lyricsRaw={track.lyrics} currentTime={currentTime} />
                </div>
            ) : (
                <div className="flex flex-col gap-12 p-12 rounded-[60px] bg-white/[0.03] border border-white/10 shadow-2xl w-full backdrop-blur-3xl">
                    <div className="space-y-3 text-center md:text-left">
                        <h2 className="text-5xl font-black truncate text-white tracking-tighter leading-tight">{track.title}</h2>
                        <p className="text-2xl text-white/30 truncate font-bold uppercase tracking-widest">{track.artist}</p>
                    </div>

                    <div className="group pt-4">
                        <div 
                        className="h-3 bg-white/5 rounded-full cursor-pointer relative mb-6 overflow-hidden"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            onSeek(percent * duration);
                        }}
                        >
                        <div 
                            className="absolute h-full rounded-full transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.4)]" 
                            style={{ width: `${progressPercent}%`, backgroundColor: 'white' }}
                        ></div>
                        </div>
                        <div className="flex justify-between text-xs font-black text-white/20 uppercase tracking-[0.3em]">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-4">
                        <button 
                        onClick={onToggleShuffle} 
                        className={`transition-all p-4 rounded-2xl hover:bg-white/10 ${isShuffled ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
                        >
                        <Shuffle className="w-6 h-6" />
                        </button>
                        
                        <div className="flex items-center gap-10">
                        <button onClick={onPrev} className="text-white/40 hover:text-white transition-all active:scale-75 p-4 hover:bg-white/10 rounded-full">
                            <SkipBack className="w-10 h-10 fill-current" />
                        </button>
                        <button 
                            onClick={onPlayPause}
                            className="w-28 h-28 rounded-[40px] bg-white text-black flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-[0_20px_60px_rgba(255,255,255,0.2)]"
                        >
                            {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
                        </button>
                        <button onClick={onNext} className="text-white/40 hover:text-white transition-all active:scale-75 p-4 hover:bg-white/10 rounded-full">
                            <SkipForward className="w-10 h-10 fill-current" />
                        </button>
                        </div>

                        <button className="text-white/20 hover:text-white/40 transition-all p-4 rounded-2xl hover:bg-white/10">
                        <Repeat className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-10 border-t border-white/5">
                        <div className="flex items-center gap-6 w-full pr-8">
                        <Volume2 className="w-5 h-5 text-white/20" />
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01" 
                            value={volume}
                            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                        />
                        </div>
                        <div className="flex items-center gap-6 shrink-0">
                            <button 
                                onClick={() => setShowLyrics(!showLyrics)}
                                className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-90 ${showLyrics ? 'bg-white text-black shadow-2xl' : 'bg-white/5 text-white/20 border border-white/5'}`}
                                title="Текст песни"
                            >
                                <Quote className="w-6 h-6 fill-current" />
                            </button>

                            <button 
                                onClick={() => onToggleLike(track.id)}
                                className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-90 ${track.isLiked ? 'bg-white text-black shadow-2xl' : 'bg-white/5 text-white/20 border border-white/5'}`}
                            >
                                <Heart className={`w-6 h-6 ${track.isLiked ? 'fill-current' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Floating Controls Bar */}
      {showLyrics && (
          <div className="fixed bottom-0 left-0 right-0 p-12 flex justify-center z-20 pointer-events-none">
              <div className="pointer-events-auto bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[40px] px-12 py-6 flex items-center gap-12 shadow-[0_40px_80px_rgba(0,0,0,0.6)] animate-slide-up">
                 <button onClick={onPrev} className="text-white/40 hover:text-white transition-all active:scale-75"><SkipBack className="w-7 h-7 fill-current" /></button>
                 <button onClick={onPlayPause} className="bg-white text-black rounded-[24px] p-5 hover:scale-110 active:scale-90 transition-all shadow-2xl">
                     {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                 </button>
                 <button onClick={onNext} className="text-white/40 hover:text-white transition-all active:scale-75"><SkipForward className="w-7 h-7 fill-current" /></button>
                 <div className="w-px h-10 bg-white/10 mx-2"></div>
                 <button 
                    onClick={() => setShowLyrics(false)} 
                    className="text-white hover:scale-110 transition-all"
                    title="Скрыть текст"
                 >
                     <Quote className="w-6 h-6 fill-current" />
                 </button>
              </div>
          </div>
      )}

    </div>
  );
};

export default FullScreenPlayer;