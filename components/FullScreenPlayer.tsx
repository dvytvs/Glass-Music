
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Track, PlaybackState } from '../types';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Minimize2, Heart, MoreHorizontal, 
  Quote, Rabbit, Turtle
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
  onToggleAudioEffect
}) => {
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  
  const [showLyrics, setShowLyrics] = useState(initialMode === 'lyrics');
  const [isClosing, setIsClosing] = useState(false);
  const prevVolumeRef = useRef<number>(1);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
     setShowLyrics(initialMode === 'lyrics');
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

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth - 0.5) * 20; // max 20px offset
    const y = (clientY / window.innerHeight - 0.5) * 20;
    setMousePos({ x, y });
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] overflow-hidden flex flex-col ${isClosing ? 'animate-slide-down-full' : 'animate-slide-up-full'}`}
      onAnimationEnd={onAnimationEnd}
      onMouseMove={handleMouseMove}
    >
      {/* Background Layer */}
      <div className={`absolute inset-0 bg-black/60 ${enableGlass ? 'backdrop-blur-[120px]' : ''} z-0`}></div>
      
      {/* Dynamic Colored Glow */}
      <div 
        className="absolute inset-0 z-0 opacity-50 scale-150 blur-[140px] transition-all duration-[3s]"
        style={{ 
          backgroundImage: `url(${track.coverUrl})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          transform: `translate(${mousePos.x * -2}px, ${mousePos.y * -2}px) scale(1.5)`
        }}
      ></div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-8 shrink-0">
        <button onClick={handleClose} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all active:scale-95 shadow-lg">
          <Minimize2 className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-1">Сейчас играет</span>
            <div className="w-8 h-1 bg-white/30 rounded-full"></div>
        </div>
        <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all active:scale-95 shadow-lg">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className={`relative z-10 flex-1 flex ${showLyrics ? 'flex-col lg:flex-row' : 'flex-col'} items-center justify-center gap-6 lg:gap-12 px-4 md:px-8 max-w-screen-2xl mx-auto w-full overflow-y-auto pb-8 min-h-0`}>
        
        {/* Left Side / Top: Cover Art */}
        <div className={`transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center justify-center shrink
            ${showLyrics 
                ? 'w-full lg:w-1/3 h-[30vh] lg:h-auto lg:aspect-square order-1' 
                : 'w-full max-w-[40vh] md:max-w-[45vh] aspect-square order-1 mt-auto'
            }`}
            style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
        >
             <div className={`rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-white/10 animate-scale-in transition-all duration-700 relative group flex items-center justify-center bg-black/20
                 ${showLyrics 
                    ? 'w-auto h-full aspect-square lg:w-full lg:h-auto' 
                    : 'w-full h-full aspect-square'
                 }`}>
                <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s] ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             </div>
             
             {showLyrics && (
                 <div className="mt-8 text-center lg:text-left w-full space-y-1 hidden lg:block animate-fade-in">
                     <h2 className="text-3xl font-bold truncate text-white tracking-tight drop-shadow-md">{track.title}</h2>
                     <p className="text-lg text-white/70 truncate font-medium drop-shadow-sm">{track.artist}</p>
                 </div>
             )}
        </div>

        {/* Right Side / Bottom: Content */}
        <div className={`transition-all duration-700 w-full flex flex-col justify-center shrink-0
            ${showLyrics 
                ? 'lg:w-2/3 h-full order-2' 
                : 'max-w-[800px] order-2 items-center mb-auto'
            }`}
        >
            {showLyrics ? (
                <div className={`h-full w-full rounded-[2.5rem] bg-black/20 border border-white/10 p-6 lg:p-10 relative overflow-hidden shadow-2xl ${enableGlass ? 'backdrop-blur-3xl' : ''}`}>
                    <LyricsView lyricsRaw={track.lyrics} currentTime={currentTime} />
                </div>
            ) : (
                <div className="flex flex-col items-center w-full gap-8 animate-slide-up">
                    <div className="space-y-2 text-center w-full">
                        <h2 className="text-4xl md:text-5xl font-bold truncate text-white tracking-tight drop-shadow-md">{track.title}</h2>
                        <p className="text-xl md:text-2xl text-white/70 truncate font-medium drop-shadow-sm">{track.artist}</p>
                    </div>

                    <div className="w-full max-w-2xl group pt-4">
                        <div 
                          className="h-2.5 bg-white/20 rounded-full cursor-pointer relative mb-3 overflow-hidden hover:h-3.5 transition-all"
                          onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const percent = (e.clientX - rect.left) / rect.width;
                              onSeek(percent * duration);
                          }}
                        >
                          <div 
                              className="absolute h-full rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                              style={{ width: `${progressPercent}%`, backgroundColor: 'white' }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-white/60 tracking-wide">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-6 md:gap-10 w-full max-w-2xl">
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={onToggleShuffle} 
                          className={`transition-all p-4 rounded-full hover:bg-white/10 ${isShuffled ? 'text-white bg-white/10' : 'text-white/50 hover:text-white'}`}
                        >
                          <Shuffle className="w-6 h-6" />
                        </motion.button>
                        
                        <motion.button whileTap={{ scale: 0.9 }} onClick={onPrev} className="text-white/80 hover:text-white transition-all p-4 hover:bg-white/10 rounded-full">
                            <SkipBack className="w-10 h-10 fill-current" />
                        </motion.button>
                        <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={onPlayPause}
                            className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.3)]"
                        >
                            {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={onNext} className="text-white/80 hover:text-white transition-all p-4 hover:bg-white/10 rounded-full">
                            <SkipForward className="w-10 h-10 fill-current" />
                        </motion.button>

                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={onToggleRepeat}
                          className={`transition-all p-4 rounded-full hover:bg-white/10 ${isRepeating ? 'text-white bg-white/10' : 'text-white/50 hover:text-white'}`}
                        >
                          <Repeat className="w-6 h-6" />
                        </motion.button>
                    </div>

                    <div className="flex items-center justify-between w-full max-w-2xl mt-4">
                        <div className="flex items-center gap-4 w-1/3 group">
                          <button onClick={handleVolumeToggle} className="text-white/50 hover:text-white transition-colors">
                            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                          <div className="relative flex-1 h-2 bg-white/20 rounded-full cursor-pointer overflow-hidden hover:h-3 transition-all flex items-center">
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01" 
                                value={volume}
                                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div 
                              className="absolute left-0 top-0 bottom-0 bg-white rounded-full pointer-events-none"
                              style={{ width: `${volume * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <motion.button 
                                whileTap={{ scale: 0.9 }}
                                onClick={onToggleAudioEffect}
                                className={`p-4 rounded-full transition-all hover:scale-105 ${audioEffect !== 'normal' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                                title={audioEffect === 'slowed' ? 'Slowed' : audioEffect === 'spedup' ? 'Speed Up' : 'Normal Speed'}
                            >
                                {audioEffect === 'slowed' ? <Turtle className="w-6 h-6" /> : <Rabbit className={`w-6 h-6 ${audioEffect === 'normal' ? 'opacity-50' : ''}`} />}
                            </motion.button>
                            <motion.button 
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setShowLyrics(!showLyrics)}
                                className={`p-4 rounded-full transition-all hover:scale-105 ${showLyrics ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                                title="Текст песни"
                            >
                                <Quote className="w-6 h-6 fill-current" />
                            </motion.button>

                            <motion.button 
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onToggleLike(track.id)}
                                className={`p-4 rounded-full transition-all hover:scale-105 ${track.isLiked ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                            >
                                <Heart className={`w-6 h-6 ${track.isLiked ? 'fill-current' : ''}`} />
                            </motion.button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Floating Controls Bar for Lyrics Mode */}
      {showLyrics && (
          <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-center z-20 pointer-events-none">
              <div className={`pointer-events-auto bg-white/5 ${enableGlass ? 'backdrop-blur-3xl' : 'bg-black/80'} border border-white/10 rounded-[2.5rem] px-10 py-5 flex items-center gap-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-slide-up`}>
                 <motion.button whileTap={{ scale: 0.9 }} onClick={onPrev} className="text-white/50 hover:text-white transition-all"><SkipBack className="w-6 h-6 fill-current" /></motion.button>
                 <motion.button whileTap={{ scale: 0.9 }} onClick={onPlayPause} className="bg-white text-black rounded-full p-4 hover:scale-110 transition-all shadow-xl">
                     {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                 </motion.button>
                 <motion.button whileTap={{ scale: 0.9 }} onClick={onNext} className="text-white/50 hover:text-white transition-all"><SkipForward className="w-6 h-6 fill-current" /></motion.button>
                 <div className="w-px h-8 bg-white/10 mx-2"></div>
                 <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowLyrics(false)} 
                    className="text-white/70 hover:text-white hover:scale-110 transition-all"
                    title="Скрыть текст"
                 >
                     <Quote className="w-6 h-6 fill-current" />
                 </motion.button>
              </div>
          </div>
      )}

    </div>
  );
};

export default FullScreenPlayer;