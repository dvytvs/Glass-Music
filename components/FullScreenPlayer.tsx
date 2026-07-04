
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Track, PlaybackState } from '../types';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Minimize2, Heart, MoreHorizontal, 
  Quote, Rabbit, Turtle, X
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
  analyser
}) => {
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  
  const [viewMode, setViewMode] = useState<'cover' | 'lyrics'>(initialMode);
  const [isClosing, setIsClosing] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const prevVolumeRef = useRef<number>(1);

  useEffect(() => {
     setViewMode(initialMode === 'lyrics' ? 'lyrics' : 'cover');
  }, [initialMode]);

  const handleClose = () => {
    setIsClosing(true);
  };

  const onAnimationEnd = (e: React.AnimationEvent) => {
    if (isClosing && e.animationName === 'slideDownFull') {
      onClose();
    }
  };

  const handleVolumeToggle = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolumeRef.current || 1);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-[#020202] overflow-hidden flex flex-col ${isClosing ? 'animate-slide-down-full' : 'animate-slide-up-full'}`}
      onAnimationEnd={onAnimationEnd}
    >
      {/* Dynamic Animated Background Blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div 
            className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-40 animate-pulse-slow mix-blend-screen"
            style={{ backgroundColor: accentColor, filter: 'blur(120px)' }}
          />
          <div 
            className="absolute top-[30%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[140px] opacity-30 animate-pulse-slow mix-blend-screen delay-1000"
            style={{ backgroundColor: accentColor === '#ffffff' ? '#3b82f6' : '#ffffff', filter: 'blur(140px)' }}
          />
          <div 
            className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full blur-[100px] opacity-20 animate-pulse-slow mix-blend-screen delay-2000"
            style={{ backgroundColor: accentColor, filter: 'blur(100px)' }}
          />
          <div 
            className="absolute inset-0 z-0 opacity-30 blur-[150px] transition-all duration-[4s]"
            style={{ 
              backgroundImage: `url(${track.coverUrl})`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center',
              filter: 'blur(150px)'
            }}
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>

      {/* Close Button Top Right */}
      <button 
        onClick={handleClose} 
        className="absolute top-8 right-8 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all active:scale-90 backdrop-blur-xl border border-white/10 shadow-2xl"
      >
        <Minimize2 className="w-5 h-5" />
      </button>

      {/* Content Container */}
      <div className="relative z-10 w-full h-full flex flex-col p-6 md:p-12 lg:p-20 max-w-[1600px] mx-auto">
          {/* Main Content Area: Side by Side on large screens */}
          <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-stretch gap-12 lg:gap-24 overflow-hidden">
              
              {/* Left Side: Cover Art */}
              <motion.div 
                layout
                className={`flex flex-col items-center justify-center transition-all duration-700 ${viewMode === 'lyrics' ? 'lg:w-1/2 lg:items-start' : 'w-full items-center'}`}
              >
                  <div className={`relative group transition-all duration-700 ease-out ${viewMode === 'lyrics' ? 'w-[30vh] h-[30vh] md:w-[40vh] md:h-[40vh] lg:w-[45vh] lg:h-[45vh]' : 'w-[40vh] h-[40vh] md:w-[55vh] md:h-[55vh] lg:w-[60vh] lg:h-[60vh]'} max-w-[600px] max-h-[600px] rounded-[40px] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] ${isPlaying ? 'scale-100' : 'scale-[0.98] grayscale-[0.2]'}`}>
                      <img 
                        src={track.coverUrl} 
                        alt="Cover" 
                        className={`w-full h-full object-cover transition-transform duration-[30s] ease-linear ${isPlaying ? 'scale-110 rotate-1' : 'scale-100'}`} 
                      />
                  </div>
                  
                  <div className={`mt-10 transition-all duration-700 ${viewMode === 'lyrics' ? 'text-center lg:text-left' : 'text-center'} w-full max-w-4xl`}>
                      <motion.h1 
                        layout
                        className={`${viewMode === 'lyrics' ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-5xl md:text-7xl lg:text-8xl'} font-black font-sans tracking-tight text-white mb-3 line-clamp-2 leading-[1.1] drop-shadow-2xl`}
                      >
                          {track.title}
                      </motion.h1>
                      <motion.p 
                        layout
                        className={`${viewMode === 'lyrics' ? 'text-xl lg:text-2xl' : 'text-2xl md:text-4xl'} text-white/60 font-semibold tracking-tight`}
                      >
                          {track.artist}
                      </motion.p>
                  </div>
              </motion.div>

              {/* Right Side: Lyrics (Only visible on desktop or if mode is lyrics) */}
              <AnimatePresence mode="wait">
                  {viewMode === 'lyrics' && (
                     <motion.div 
                         key="lyrics-container"
                         initial={{ opacity: 0, x: 50 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: 50 }}
                         transition={{ duration: 0.6, ease: "easeOut" }}
                         className="w-full lg:w-1/2 h-full flex flex-col justify-center overflow-hidden"
                     >
                          <LyricsView lyricsRaw={track.lyrics} currentTime={currentTime} onSeek={onSeek} />
                     </motion.div>
                  )}
              </AnimatePresence>
          </div>

          {/* Controls Area (Floating at bottom) */}
          <div className="w-full max-w-5xl mx-auto mt-12 pb-6 shrink-0 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-6 shadow-2xl relative">
              {/* Progress */}
              <div className="w-full px-4 mb-4">
                  <div className="flex justify-between text-[10px] font-black text-white/30 tracking-[0.2em] mb-2 font-mono uppercase">
                    <span>{formatTime(currentTime)}</span>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                        <span>{viewMode === 'lyrics' ? 'Sync Lyrics' : 'Immersive'}</span>
                    </div>
                    <span>{formatTime(duration)}</span>
                  </div>
                  
                  <div className="w-full relative h-1.5 group flex items-center">
                      <input 
                          type="range" 
                          min="0" max={duration || 100} step="0.01"
                          value={currentTime} 
                          onChange={(e) => onSeek(Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30 touch-none"
                      />
                      
                      <div className="relative w-full h-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                              className="absolute top-0 left-0 h-full" 
                              style={{ width: `${progressPercent}%`, backgroundColor: 'white' }}
                              transition={{ duration: 0.1 }}
                          />
                      </div>
                      
                      <motion.div 
                         className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] z-20 pointer-events-none transition-transform group-hover:scale-125"
                         style={{ left: `${progressPercent}%`, marginLeft: '-8px' }}
                      />
                  </div>
              </div>

              {/* Controls Grid */}
              <div className="flex items-center justify-between gap-4">
                  {/* Extras Left */}
                  <div className="flex items-center gap-1 md:gap-3">
                      <div className="relative group">
                          <button 
                             onClick={handleVolumeToggle}
                             onMouseEnter={() => setShowVolumeSlider(true)}
                             className="p-3 rounded-2xl transition-all text-white/40 hover:bg-white/10 hover:text-white"
                          >
                            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                          
                          {showVolumeSlider && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onMouseLeave={() => setShowVolumeSlider(false)}
                                className="absolute bottom-full left-0 mb-4 bg-black/80 backdrop-blur-2xl border border-white/10 p-4 rounded-3xl h-40 flex flex-col items-center shadow-2xl"
                              >
                                  <input 
                                     type="range" 
                                     min="0" max="1" step="0.01"
                                     value={volume} 
                                     onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                     className="h-full w-1 accent-white appearance-none bg-white/20 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                                     style={{ writingMode: 'bt-lr' as any, WebkitAppearance: 'slider-vertical' }}
                                  />
                              </motion.div>
                          )}
                      </div>
                      <button 
                         onClick={onToggleShuffle} 
                         className={`p-3 rounded-2xl transition-all ${isShuffled ? 'bg-white text-black' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                      >
                        <Shuffle className="w-5 h-5" />
                      </button>
                      <button 
                         onClick={onToggleRepeat} 
                         className={`p-3 rounded-2xl transition-all ${isRepeating ? 'bg-white text-black' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                      >
                        <Repeat className="w-5 h-5" />
                      </button>
                  </div>

                  {/* Playback Center */}
                  <div className="flex items-center gap-4 md:gap-8">
                      <button onClick={onPrev} className="text-white/50 hover:text-white transition-all p-3 hover:bg-white/10 rounded-full">
                          <SkipBack className="w-7 h-7 fill-current" />
                      </button>
                      <button 
                          onClick={onPlayPause}
                          className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                      >
                          {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                      </button>
                      <button onClick={onNext} className="text-white/50 hover:text-white transition-all p-3 hover:bg-white/10 rounded-full">
                          <SkipForward className="w-7 h-7 fill-current" />
                      </button>
                  </div>

                  {/* Extras Right */}
                  <div className="flex items-center gap-1 md:gap-3">
                       <button 
                           onClick={() => setViewMode(viewMode === 'lyrics' ? 'cover' : 'lyrics')}
                           className={`p-3 rounded-2xl transition-all flex items-center gap-2 ${viewMode === 'lyrics' ? 'bg-white text-black' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                       >
                           <Quote className="w-5 h-5 fill-current" />
                       </button>
                       <button 
                           onClick={() => onToggleLike(track.id)}
                           className={`p-3 rounded-2xl transition-all ${track.isLiked ? 'text-red-500 bg-red-500/10' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                       >
                           <Heart className={`w-5 h-5 ${track.isLiked ? 'fill-current' : ''}`} />
                       </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default FullScreenPlayer;