import React from 'react';
import { motion } from 'framer-motion';
import { Track, PlaybackState } from '../types';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat,
  Maximize2, Heart, Mic2, ListMusic, Rabbit, Turtle, Quote
} from './Icons';
import { formatTime } from '../utils';

interface PlayerControlsProps {
  currentTrack: Track | null;
  playbackState: PlaybackState;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isShuffled: boolean;
  isRepeating: boolean;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleSidebar?: () => void;
  onToggleFullScreen: () => void;
  onOpenLyrics: () => void;
  onToggleLike: (trackId: string) => void;
  accentColor: string;
  onGoToArtist: (artist: string) => void;
  onGoToAlbum: (album: string) => void;
  playerStyle?: 'floating' | 'classic' | 'split';
  enableGlass?: boolean;
  audioEffect?: 'normal' | 'slowed' | 'spedup';
  onToggleAudioEffect?: () => void;
  t: (key: string) => string;
}

const ARTIST_SPLIT_REGEX = /\s*(?:,|;|feat\.?|ft\.?|&|\/|featuring)\s+/i;

const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentTrack, playbackState, onPlayPause, onNext, onPrev, currentTime, duration,
  onSeek, volume, onVolumeChange, isShuffled, isRepeating, onToggleRepeat,
  onToggleShuffle, onToggleSidebar, onToggleFullScreen, onOpenLyrics, onToggleLike,
  accentColor, onGoToArtist, onGoToAlbum, playerStyle = 'floating', enableGlass = true,
  audioEffect = 'normal', onToggleAudioEffect, t
}) => {
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const isSplit = playerStyle === 'split';

  const formatArtists = (artistString: string) => {
    return artistString.split(ARTIST_SPLIT_REGEX).map(a => a.trim()).filter(Boolean);
  };

  const handleVolumeToggle = () => {
    if (volume === 0) onVolumeChange(1);
    else onVolumeChange(0);
  };

  const renderTrackInfo = (className: string = "flex items-center w-[30%] min-w-[200px] max-w-[350px] group") => (
        <div className={className}>
            <div 
              className={`w-16 h-16 overflow-hidden shrink-0 cursor-pointer relative shadow-lg mr-4 border border-white/10 ${playerStyle === 'classic' ? 'rounded-md' : 'rounded-2xl'}`}
              onClick={onToggleFullScreen}
            >
                {currentTrack ? <img src={currentTrack.coverUrl} className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-110' : 'scale-100'}`} /> : <div className="w-full h-full bg-white/5" />}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                    <Maximize2 className="w-6 h-6 text-white" />
                </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p 
                  className="text-[15px] font-bold text-white truncate cursor-pointer hover:underline"
                  onClick={() => currentTrack && onGoToAlbum(currentTrack.album)}
                >
                  {currentTrack?.title || 'No Track'}
                </p>
                <p className="text-[13px] font-semibold text-white/50 truncate mt-0.5">
                  {currentTrack ? formatArtists(currentTrack.artist).map((artist, i, arr) => (
                    <React.Fragment key={i}>
                      <span className="hover:text-white cursor-pointer transition-colors" onClick={() => onGoToArtist(artist)}>{artist}</span>
                      {i < arr.length - 1 && ' • '}
                    </React.Fragment>
                  )) : 'Unknown Artist'}
                </p>
            </div>
            <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={() => currentTrack && onToggleLike(currentTrack.id)}
                className={`ml-2 p-2.5 rounded-full transition-all ${currentTrack?.isLiked ? 'scale-110 drop-shadow-[0_0_8px_currentColor]' : 'text-white/30 hover:text-white hover:bg-white/10'}`}
                style={{ color: currentTrack?.isLiked ? accentColor : undefined }}
            >
                <Heart className={`w-5 h-5 ${currentTrack?.isLiked ? 'fill-current' : ''}`} />
            </motion.button>
        </div>
  );

  const renderControls = (className: string = "flex-1 flex flex-col items-center justify-center px-4 md:px-8 max-w-[600px] w-full") => (
        <div className={className}>
            <div className="flex items-center gap-4 md:gap-8 mb-1.5">
                <motion.button whileTap={{ scale: 0.9 }} onClick={onToggleShuffle} className={`p-2 transition-all ${isShuffled ? '' : 'text-white/40 hover:text-white'}`} style={{ color: isShuffled ? accentColor : undefined }}>
                    <Shuffle className="w-5 h-5" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onPrev} className="text-white/80 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full">
                    <SkipBack className="w-6 h-6 fill-current" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={onPlayPause} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.3)]">
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onNext} className="text-white/80 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full">
                    <SkipForward className="w-6 h-6 fill-current" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onToggleRepeat} className={`p-2 transition-all ${isRepeating ? '' : 'text-white/40 hover:text-white'}`} style={{ color: isRepeating ? accentColor : undefined }}>
                    <Repeat className="w-5 h-5" />
                </motion.button>
            </div>
            <div className="w-full flex items-center gap-4">
                <span className="text-[11px] font-bold text-white/50 w-9 text-right tabular-nums">{formatTime(currentTime)}</span>
                <div className="flex-1 relative flex items-center group h-6">
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
                           className="absolute bottom-0 left-0 h-[30px] pointer-events-none transition-all duration-75 overflow-hidden" 
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
                           className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-[3px] border-white z-20 pointer-events-none flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 group-hover:scale-110 group-active:scale-125 focus:scale-125 shadow-lg"
                           style={{ 
                              left: `${progressPercent}%`, 
                              marginLeft: '-8px',
                              backgroundColor: accentColor,
                              boxShadow: `0 0 10px ${accentColor}, 0 0 20px ${accentColor}`
                           }}
                        ></div>
                    </div>
                </div>
                <span className="text-[11px] font-bold text-white/50 w-9 tabular-nums text-left">{formatTime(duration)}</span>
            </div>
        </div>
  );

  const renderTools = (className: string = "flex items-center justify-end w-[30%] min-w-[200px] max-w-[350px] gap-2 lg:gap-4") => (
        <div className={className}>
            <motion.button 
                whileTap={{ scale: 0.9 }} 
                onClick={onOpenLyrics} 
                className="text-white/50 hover:text-white hover:bg-white/10 transition-all p-2.5 rounded-full hidden lg:block"
                title={t('lyrics')}
            >
                <Quote className="w-5 h-5 fill-current" />
            </motion.button>
            {onToggleAudioEffect && (
              <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleAudioEffect}
                  className={`p-2.5 transition-all rounded-full hidden md:block hover:bg-white/10 ${audioEffect !== 'normal' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}
                  title={audioEffect === 'slowed' ? 'Slowed' : audioEffect === 'spedup' ? 'Speed Up' : 'Normal'}
              >
                  {audioEffect === 'slowed' ? <Turtle className="w-5 h-5" /> : <Rabbit className={`w-5 h-5 ${audioEffect === 'normal' ? 'opacity-50' : ''}`} />}
              </motion.button>
            )}
            <div className="flex items-center gap-3 flex-1 max-w-[140px] pl-2">
                <button onClick={handleVolumeToggle} className="text-white/50 hover:text-white transition-colors">
                  {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden group hover:h-2 transition-all">
                  <input 
                      type="range" 
                      min="0" max="1" step="0.01" 
                      value={volume} onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="absolute top-0 left-0 bottom-0 bg-white rounded-full transition-all group-hover:bg-[var(--accent-color)]" style={{ width: `${volume * 100}%` }} />
                </div>
            </div>
            {onToggleSidebar && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={onToggleSidebar} className="text-white/50 hover:text-white hover:bg-white/10 transition-all p-2.5 rounded-full hidden md:block" title="Toggle Sidebar">
                  <ListMusic className="w-5 h-5" />
              </motion.button>
            )}
        </div>
  );

  const transitionClasses = `transition-transform duration-700 ${!currentTrack ? 'translate-y-[150%] opacity-0' : 'translate-y-0 opacity-100'}`;
  const glassClasses = enableGlass ? 'bg-black/60 backdrop-blur-[60px] border border-white/20' : 'bg-[#18181b] border border-white/10';

  if (playerStyle === 'split') {
    return (
      <div className={`fixed bottom-6 left-0 right-0 z-50 flex items-center justify-between px-6 pointer-events-none`}>
         <div className={`pointer-events-auto h-[90px] px-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses} flex items-center justify-center min-w-[300px]`}>
            {renderTrackInfo("flex items-center group w-full")}
         </div>
         <div className={`pointer-events-auto h-[90px] px-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses} flex items-center justify-center min-w-[450px]`}>
            {renderControls("flex flex-col items-center justify-center w-full")}
         </div>
         <div className={`pointer-events-auto h-[90px] px-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses} flex items-center justify-center min-w-[250px]`}>
            {renderTools("flex items-center justify-end gap-2 lg:gap-4 w-full")}
         </div>
      </div>
    );
  }

  if (playerStyle === 'classic') {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between w-full h-[90px] px-6 pointer-events-auto rounded-none ${transitionClasses} ${glassClasses}`}>
        {renderTrackInfo()}
        {renderControls()}
        {renderTools()}
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between xl:justify-center w-[98%] md:w-auto md:min-w-[900px] max-w-[1400px] h-[90px] rounded-[3rem] px-6 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses}`}>
       {renderTrackInfo()}
       {renderControls()}
       {renderTools()}
    </div>
  );
};

export default PlayerControls;
