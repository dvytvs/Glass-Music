
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
      className={`fixed inset-0 z-[100] bg-[#050505] overflow-hidden flex flex-col md:flex-row ${isClosing ? 'animate-slide-down-full' : 'animate-slide-up-full'}`}
      onAnimationEnd={onAnimationEnd}
    >
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 opacity-40 blur-[120px] transition-all duration-[3s] object-cover mix-blend-screen"
        style={{ 
          backgroundImage: `url(${track.coverUrl})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
        }}
      ></div>

      {/* Close Button Top Right */}
      <button 
        onClick={handleClose} 
        className="absolute top-8 right-8 z-50 w-14 h-14 flex items-center justify-center rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all active:scale-95 shadow-lg backdrop-blur-md"
      >
        <Minimize2 className="w-6 h-6" />
      </button>

      {/* Content Container */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 max-w-7xl mx-auto mt-8">
          {/* Main Content Area */}
          <div className="w-full h-[60vh] md:h-[65vh] flex flex-col items-center justify-center relative">
              <AnimatePresence mode="wait">
                  {viewMode === 'lyrics' ? (
                     <motion.div 
                         key="lyrics"
                         initial={{ opacity: 0, y: 20, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: -20, scale: 0.95 }}
                         transition={{ duration: 0.4 }}
                         className="w-full max-w-4xl h-full flex flex-col"
                     >
                          <LyricsView lyricsRaw={track.lyrics} currentTime={currentTime} />
                     </motion.div>
                  ) : (
                     <motion.div 
                         key="cover"
                         initial={{ opacity: 0, y: 20, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: -20, scale: 0.95 }}
                         transition={{ duration: 0.4 }}
                         className="w-full flex flex-col items-center"
                     >
                         <div className={`relative w-[30vh] h-[30vh] md:w-[45vh] md:h-[45vh] lg:w-[50vh] lg:h-[50vh] max-w-[500px] max-h-[500px] rounded-2xl overflow-hidden shadow-2xl mb-12 shrink-0 transition-transform ${isPlaying ? 'animate-pulse-beat' : ''}`}>
                             <img 
                                src={track.coverUrl} 
                                alt="Cover" 
                                className={`w-full h-full object-cover transition-transform duration-[20s] ease-out ${isPlaying ? 'scale-110' : 'scale-100'}`} 
                             />
                         </div>
                         
                         <div className="text-center max-w-3xl px-4">
                             <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-sans tracking-tight text-white mb-4 line-clamp-2 leading-tight">
                                 {track.title}
                             </h1>
                             <p className="text-xl md:text-2xl text-white/60 font-medium tracking-wide">
                                 {track.artist}
                             </p>
                         </div>
                     </motion.div>
                  )}
              </AnimatePresence>
          </div>

          {/* Controls Area */}
          <div className="w-full max-w-4xl mt-auto pb-12 shrink-0 px-4">
              {/* Progress */}
              <div className="w-full relative py-6 group flex items-center h-16">
                  <input 
                      type="range" 
                      min="0" max={duration || 100} step="0.01"
                      value={currentTime} 
                      onChange={(e) => onSeek(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30 touch-none"
                  />
                  
                  {/* Track Container */}
                  <div className="relative w-full h-1.5 bg-white/20 rounded-full flex items-center">
                      
                      {/* Wavy Area (above the track) */}
                      <div 
                         className="absolute bottom-0 left-0 h-[40px] pointer-events-none transition-all duration-75 overflow-hidden" 
                         style={{ width: `${progressPercent}%` }}
                      >
                          <div 
                             className={`one-ui-wave-mask w-full h-full opacity-90 ${isPlaying ? '' : 'pause-animation'}`}
                             style={{ 
                                background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor} 30%, #eab308 60%, ${accentColor} 100%)`,
                             }}
                          ></div>
                      </div>

                      {/* Filled straight track */}
                      <div 
                          className="absolute top-0 left-0 h-full rounded-full transition-all duration-75" 
                          style={{ width: `${progressPercent}%`, backgroundColor: 'white' }}
                      ></div>

                      {/* Hover/Active highlight line if needed */}
                      <div 
                          className="absolute top-0 left-0 h-full rounded-full transition-all duration-75 opacity-0 group-hover:opacity-100 group-active:h-2" 
                          style={{ width: `${progressPercent}%`, backgroundColor: 'white' }}
                      ></div>

                      {/* Thumb */}
                      <div 
                         className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-[4px] border-white z-20 pointer-events-none flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-125 focus:scale-125 shadow-lg"
                         style={{ 
                            left: `${progressPercent}%`, 
                            marginLeft: '-12px',
                            backgroundColor: accentColor,
                            boxShadow: `0 0 20px ${accentColor}, 0 0 40px ${accentColor}`
                         }}
                      ></div>
                  </div>
              </div>
              <div className="flex justify-between text-xs font-bold text-white/40 tracking-wider mt-1 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span className="uppercase tracking-[0.2em]">{viewMode === 'lyrics' ? 'LYRICS' : 'NOW PLAYING'}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Massive Controls */}
              <div className="flex items-center justify-between mt-6">
                  {/* Left Actions */}
                  <div className="flex items-center gap-4">
                      <div className="hidden md:flex items-center h-12 rounded-full transition-all relative">
                          <button 
                             onClick={() => setShowVolumeSlider(!showVolumeSlider)} 
                             className="text-white/50 hover:text-white transition-colors p-3 hover:bg-white/10 rounded-full shrink-0"
                          >
                            {volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                          </button>
                          
                          {showVolumeSlider && (
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-32 h-10 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center px-4 shadow-2xl animate-fade-in origin-left pointer-events-auto z-50">
                                  <input 
                                     type="range" 
                                     min="0" 
                                     max="1" 
                                     step="0.01" 
                                     value={volume} 
                                     onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                     className="w-full h-1 accent-white appearance-none bg-white/20 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                                   />
                              </div>
                          )}
                      </div>
                      <button 
                         onClick={onToggleShuffle} 
                         className={`transition-all p-3 rounded-full hover:bg-white/10 ${isShuffled ? 'text-white bg-white/10' : 'text-white/50 hover:text-white'}`}
                      >
                        <Shuffle className="w-6 h-6" />
                      </button>
                  </div>

                  {/* Center Playback */}
                  <div className="flex items-center gap-6">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={onPrev} className="text-white/70 hover:text-white transition-all p-4 hover:bg-white/10 rounded-full">
                          <SkipBack className="w-8 h-8 fill-current" />
                      </motion.button>
                      <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={onPlayPause}
                          className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-[0_10px_50px_rgba(255,255,255,0.4)]"
                      >
                          {isPlaying ? <Pause className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current ml-2" />}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={onNext} className="text-white/70 hover:text-white transition-all p-4 hover:bg-white/10 rounded-full">
                          <SkipForward className="w-8 h-8 fill-current" />
                      </motion.button>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2">
                       <motion.button 
                           whileTap={{ scale: 0.9 }}
                           onClick={() => setViewMode(viewMode === 'lyrics' ? 'cover' : 'lyrics')}
                           className={`p-3 rounded-full transition-all flex items-center justify-center ${viewMode === 'lyrics' ? 'bg-white text-black shadow-lg' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
                           title="Текст песни"
                       >
                           <Quote className="w-6 h-6 fill-current" />
                       </motion.button>
                       <motion.button 
                           whileTap={{ scale: 0.9 }}
                           onClick={() => onToggleLike(track.id)}
                           className={`p-3 rounded-full transition-all ${track.isLiked ? 'text-[var(--accent-color)] drop-shadow-[0_0_10px_var(--accent-color)]' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
                       >
                           <Heart className={`w-6 h-6 ${track.isLiked ? 'fill-current' : ''}`} />
                       </motion.button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default FullScreenPlayer;