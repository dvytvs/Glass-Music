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
  playerDock?: 'bottom' | 'top' | 'left' | 'right';
  enableGlass?: boolean;
  audioEffect?: 'normal' | 'slowed' | 'spedup';
  onToggleAudioEffect?: () => void;
  t: (key: string) => string;
}

const ARTIST_SPLIT_REGEX = /\s*(?:,|;|feat\.?|ft\.?|&|\/|featuring)\s+/i;

const PlayerControls: React.FC<PlayerControlsProps> = React.memo(({
  currentTrack, playbackState, onPlayPause, onNext, onPrev, currentTime, duration,
  onSeek, volume, onVolumeChange, isShuffled, isRepeating, onToggleRepeat,
  onToggleShuffle, onToggleSidebar, onToggleFullScreen, onOpenLyrics, onToggleLike,
  accentColor, onGoToArtist, onGoToAlbum, playerStyle = 'floating', playerDock = 'bottom', enableGlass = true,
  audioEffect = 'normal', onToggleAudioEffect, t
}) => {
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const isSplit = playerStyle === 'split';

  const formatArtists = (artistString: string) => {
    return artistString.split(ARTIST_SPLIT_REGEX).map(a => a.trim()).filter(Boolean);
  };

  const getAudioBadge = (track?: Track | null) => {
    if (!track) return null;
    const url = track.fileUrl || track.path || '';
    const title = (track.title || '') + (track.album || '');
    if (url.endsWith('.flac') || url.includes('.flac') || title.toLowerCase().includes('flac')) {
      return { text: 'FLAC', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
    if (url.endsWith('.wav') || url.includes('.wav')) {
      return { text: 'WAV', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    }
    if (url.endsWith('.ogg') || url.includes('.ogg') || url.endsWith('.m4a') || url.endsWith('.aac')) {
      return { text: 'AAC', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    }
    return { text: 'HQ', color: 'bg-white/10 text-white/70 border-white/15' };
  };

  const audioBadge = getAudioBadge(currentTrack);

  const handleVolumeToggle = () => {
    if (volume === 0) onVolumeChange(1);
    else onVolumeChange(0);
  };

  const isVertical = playerStyle !== 'floating' && (playerDock === 'left' || playerDock === 'right');

  const renderTrackInfo = (className: string = "flex items-center w-[30%] min-w-[220px] max-w-[380px] group") => (
        <div className={className}>
             
            <div className={`relative ${isVertical ? 'w-full aspect-square mb-6 mx-auto max-w-[260px]' : 'w-16 h-16 mr-4'} shrink-0 flex items-center justify-center`}>
                 
                {!isVertical && currentTrack && (
                  <div 
                    className={`absolute -right-2 w-14 h-14 rounded-full bg-[#111] border-2 border-white/20 shadow-xl flex items-center justify-center transition-all duration-700 pointer-events-none z-0 ${
                      isPlaying ? 'translate-x-3 rotate-[360deg]' : 'translate-x-0 opacity-40'
                    }`}
                    style={{
                      background: 'radial-gradient(circle, #222 25%, #000 26%, #111 55%, #000 56%, #222 75%, #050505 100%)',
                      animation: isPlaying ? 'spin 6s linear infinite' : 'none'
                    }}
                  >
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: accentColor || '#ffffff' }} />
                  </div>
                )}

                <div 
                  className={`w-full h-full overflow-hidden shrink-0 cursor-pointer relative z-10 shadow-[0_8px_24px_rgba(0,0,0,0.5)] border border-white/20 ${playerStyle === 'classic' && !isVertical ? 'rounded-xl' : 'rounded-2xl'} group/cover`}
                  onClick={onToggleFullScreen}
                >
                    {currentTrack ? (
                      <img 
                        src={currentTrack.coverUrl} 
                        className={`w-full h-full object-cover transition-all duration-700 ${isPlaying ? 'scale-105 contrast-[1.05]' : 'scale-100 opacity-90'}`} 
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <span className="text-white/20 text-xs">No cover</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-none">
                        <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                </div>
            </div>

            <div className={`flex-1 min-w-0 flex flex-col ${isVertical ? 'items-center text-center w-full' : 'justify-center'} z-10`}>
                <div className={`flex items-center ${isVertical ? 'justify-center' : 'justify-start'} gap-1.5 max-w-full min-w-0`}>
                  <p 
                    className={`${isVertical ? 'text-2xl mb-1' : 'text-[14px]'} font-bold text-white truncate min-w-0 cursor-pointer hover:text-white/90 hover:underline tracking-tight`}
                    onClick={() => currentTrack && onGoToAlbum(currentTrack.album)}
                    title={currentTrack?.title || ''}
                  >
                    {currentTrack?.title || 'No Track'}
                  </p>
                  {audioBadge && !isVertical && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border tracking-wider shrink-0 uppercase select-none ${audioBadge.color}`}>
                      {audioBadge.text}
                    </span>
                  )}
                </div>
                <p className={`${isVertical ? 'text-base mb-2' : 'text-[12px]'} font-medium text-white/60 truncate max-w-full mt-0.5`}>
                  {currentTrack ? formatArtists(currentTrack.artist).map((artist, i, arr) => (
                    <React.Fragment key={i}>
                      <span className="hover:text-white cursor-pointer transition-colors" onClick={() => onGoToArtist(artist)}>{artist}</span>
                      {i < arr.length - 1 && ' • '}
                    </React.Fragment>
                  )) : 'Unknown Artist'}
                </p>
            </div>
            {!isVertical && (
               <motion.button 
                   whileHover={{ scale: 1.15 }}
                   whileTap={{ scale: 0.85 }}
                   onClick={() => currentTrack && onToggleLike(currentTrack.id)}
                   className={`ml-2 p-2.5 rounded-full transition-all shrink-0 z-10 ${currentTrack?.isLiked ? 'drop-shadow-[0_0_12px_currentColor]' : 'text-white/30 hover:text-white hover:bg-white/10'}`}
                   style={{ color: currentTrack?.isLiked ? accentColor : undefined }}
               >
                   <Heart className={`w-5 h-5 ${currentTrack?.isLiked ? 'fill-current' : ''}`} />
               </motion.button>
            )}
            {isVertical && (
               <div className="flex items-center gap-4 py-2 justify-center w-full">
                 <motion.button 
                     whileHover={{ scale: 1.15 }}
                     whileTap={{ scale: 0.85 }}
                     onClick={() => currentTrack && onToggleLike(currentTrack.id)}
                     className={`p-3 rounded-full transition-all ${currentTrack?.isLiked ? 'drop-shadow-[0_0_12px_currentColor]' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'}`}
                     style={{ color: currentTrack?.isLiked ? accentColor : undefined }}
                 >
                     <Heart className={`w-6 h-6 ${currentTrack?.isLiked ? 'fill-current' : ''}`} />
                 </motion.button>
               </div>
            )}
        </div>
  );

  const renderControls = (className: string = "flex-1 flex flex-col items-center justify-center px-4 md:px-8 max-w-[620px] w-full") => (
        <div className={className}>
            <div className="flex items-center gap-4 md:gap-7 mb-1.5">
                <motion.button 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={onToggleShuffle} 
                  className={`p-2 rounded-full transition-all ${isShuffled ? 'drop-shadow-[0_0_8px_currentColor]' : 'text-white/40 hover:text-white hover:bg-white/5'}`} 
                  style={{ color: isShuffled ? accentColor : undefined }}
                >
                    <Shuffle className="w-5 h-5" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={onPrev} 
                  className="text-white/80 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full"
                >
                    <SkipBack className="w-6 h-6 fill-current" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.06 }} 
                  whileTap={{ scale: 0.92 }} 
                  onClick={onPlayPause} 
                  className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center transition-all shadow-[0_4px_25px_rgba(255,255,255,0.35)] hover:shadow-[0_6px_30px_rgba(255,255,255,0.5)] cursor-pointer"
                >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={onNext} 
                  className="text-white/80 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full"
                >
                    <SkipForward className="w-6 h-6 fill-current" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={onToggleRepeat} 
                  className={`p-2 rounded-full transition-all ${isRepeating ? 'drop-shadow-[0_0_8px_currentColor]' : 'text-white/40 hover:text-white hover:bg-white/5'}`} 
                  style={{ color: isRepeating ? accentColor : undefined }}
                >
                    <Repeat className="w-5 h-5" />
                </motion.button>
            </div>
            <div className="w-full flex items-center gap-3.5">
                <span className="text-[11px] font-semibold text-white/50 w-10 text-right tabular-nums tracking-tight">{formatTime(currentTime)}</span>
                <div className="flex-1 relative flex items-center group h-6 cursor-pointer">
                    <input 
                        type="range" 
                        min="0" max={duration || 100} step="0.01"
                        value={currentTime} 
                        onChange={(e) => onSeek(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30 touch-none"
                    />
                     
                    <div className="relative w-full h-1.5 group-hover:h-2 bg-white/20 rounded-full flex items-center transition-all duration-200 overflow-visible shadow-inner">
                         
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

                         
                        <div 
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-75" 
                            style={{ 
                              width: `${progressPercent}%`, 
                              backgroundColor: accentColor || 'white',
                              boxShadow: `0 0 12px ${accentColor || 'rgba(255,255,255,0.5)'}`
                            }}
                        ></div>

                         
                        <div 
                           className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-[2.5px] border-white z-20 pointer-events-none flex items-center justify-center transition-all duration-150 opacity-0 group-hover:opacity-100 group-hover:scale-110 group-active:scale-125 focus:scale-125 shadow-lg"
                           style={{ 
                              left: `${progressPercent}%`, 
                              marginLeft: '-8px',
                              backgroundColor: accentColor || '#ffffff',
                              boxShadow: `0 0 10px ${accentColor || '#ffffff'}, 0 0 20px ${accentColor || '#ffffff'}`
                           }}
                        ></div>
                    </div>
                </div>
                <span className="text-[11px] font-semibold text-white/50 w-10 tabular-nums text-left tracking-tight">{formatTime(duration)}</span>
            </div>
        </div>
  );

  const renderTools = (className: string = "flex items-center justify-end w-[30%] min-w-[200px] max-w-[350px] gap-2 lg:gap-3") => (
        <div className={className}>
            <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }} 
                onClick={onOpenLyrics} 
                className="text-white/50 hover:text-white hover:bg-white/10 transition-all p-2.5 rounded-full hidden lg:flex items-center justify-center"
                title={t('lyrics')}
            >
                <Quote className="w-5 h-5 fill-current" />
            </motion.button>
            {onToggleAudioEffect && (
              <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleAudioEffect}
                  className={`p-2.5 transition-all rounded-full hidden md:flex items-center justify-center hover:bg-white/10 ${audioEffect !== 'normal' ? 'bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]' : 'text-white/50 hover:text-white'}`}
                  title={audioEffect === 'slowed' ? 'Slowed' : audioEffect === 'spedup' ? 'Speed Up' : 'Normal'}
              >
                  {audioEffect === 'slowed' ? <Turtle className="w-5 h-5" /> : <Rabbit className={`w-5 h-5 ${audioEffect === 'normal' ? 'opacity-50' : ''}`} />}
              </motion.button>
            )}
            <div className="flex items-center gap-2.5 flex-1 max-w-[140px] pl-1 group">
                <button onClick={handleVolumeToggle} className="text-white/60 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5">
                  {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden group-hover:h-2 transition-all shadow-inner">
                  <input 
                      type="range" 
                      min="0" max="1" step="0.01" 
                      value={volume} onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div 
                    className="absolute top-0 left-0 bottom-0 bg-white rounded-full transition-all duration-75 group-hover:brightness-110" 
                    style={{ 
                      width: `${volume * 100}%`,
                      backgroundColor: accentColor || '#ffffff',
                      boxShadow: `0 0 8px ${accentColor || 'rgba(255,255,255,0.4)'}`
                    }} 
                  />
                </div>
            </div>
            {onToggleSidebar && (
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }} 
                onClick={onToggleSidebar} 
                className="text-white/50 hover:text-white hover:bg-white/10 transition-all p-2.5 rounded-full hidden md:flex items-center justify-center" 
                title="Toggle Sidebar"
              >
                  <ListMusic className="w-5 h-5" />
              </motion.button>
            )}
        </div>
  );

  let transClassSuffix = !currentTrack ? 'opacity-0 scale-95' : 'opacity-100 scale-100';
  if (playerDock === 'top') transClassSuffix = !currentTrack ? '-translate-y-[150%] opacity-0' : 'translate-y-0 opacity-100';
  else if (playerDock === 'bottom') transClassSuffix = !currentTrack ? 'translate-y-[150%] opacity-0' : 'translate-y-0 opacity-100';
  else if (playerDock === 'left') transClassSuffix = !currentTrack ? '-translate-x-[150%] opacity-0' : 'translate-x-0 opacity-100';
  else if (playerDock === 'right') transClassSuffix = !currentTrack ? 'translate-x-[150%] opacity-0' : 'translate-x-0 opacity-100';
  
  const transitionClasses = `transition-all duration-700 ${transClassSuffix}`;
  const glassClasses = enableGlass 
    ? 'bg-black/65 backdrop-blur-none border border-white/20 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.25),0_25px_60px_-15px_rgba(0,0,0,0.7)]' 
    : 'bg-[#18181b] border border-white/10 shadow-2xl';

  if (playerStyle === 'split') {
    let splitDock = 'bottom-6 left-0 right-0 px-6';
    if (playerDock === 'top') splitDock = 'top-6 left-0 right-0 px-6';
    else if (playerDock === 'left') splitDock = 'top-6 bottom-6 left-6 py-2 w-[350px] overflow-y-auto rounded-[3rem] no-scrollbar hide-scrollbar';
    else if (playerDock === 'right') splitDock = 'top-6 bottom-6 right-6 py-2 w-[350px] overflow-y-auto rounded-[3rem] no-scrollbar hide-scrollbar';
    
    return (
      <div className={`absolute ${splitDock} z-50 flex ${isVertical ? '!flex-col' : '!flex-row'} items-center ${isVertical ? 'justify-start' : 'justify-between'} pointer-events-none ${isVertical ? 'gap-0' : 'gap-6'}`}>
         {isVertical ? (
           <>
              
             <div className="flex-1 pointer-events-none" />
             <div className={`pointer-events-auto flex items-center justify-center rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses} w-full py-8 px-6 shrink-0`}>
                {renderTrackInfo("flex flex-col items-center w-full group my-auto")}
             </div>
             <div className="flex-1 pointer-events-none" />
             
              
             <div className="w-full flex flex-col gap-6 shrink-0 mt-auto">
               <div className={`pointer-events-auto flex items-center justify-center rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses} w-full py-8 px-6 mb-6`}>
                  {renderControls("flex flex-col items-center justify-center w-full")}
               </div>
               <div className={`pointer-events-auto flex items-center justify-center rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses} w-full py-6 px-6 mb-8`}>
                  {renderTools("flex items-center justify-center gap-2 lg:gap-4 w-full")}
               </div>
             </div>
           </>
         ) : (
           <>
             <div className={`pointer-events-auto flex items-center justify-center rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses} h-[90px] px-4 min-w-[300px]`}>
                {renderTrackInfo("flex items-center group w-full")}
             </div>
             <div className={`pointer-events-auto flex items-center justify-center rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses} h-[90px] px-8 min-w-[450px]`}>
                {renderControls("flex flex-col items-center justify-center w-full")}
             </div>
             <div className={`pointer-events-auto flex items-center justify-center rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses} h-[90px] px-6 min-w-[250px]`}>
                {renderTools("flex items-center justify-center gap-2 lg:gap-4 w-full")}
             </div>
           </>
         )}
      </div>
    );
  }

  if (playerStyle === 'classic') {
    let classicDock = 'bottom-0 left-0 right-0 w-full h-[90px] px-6';
    if (playerDock === 'top') classicDock = 'top-0 left-0 right-0 w-full h-[90px] px-6';
    else if (playerDock === 'left') classicDock = 'top-0 bottom-0 left-0 w-[350px] h-full py-[8vh] border-r border-[var(--glass-border)] no-scrollbar hover:overflow-y-auto overflow-hidden';
    else if (playerDock === 'right') classicDock = 'top-0 bottom-0 right-0 w-[350px] h-full py-[8vh] border-l border-[var(--glass-border)] no-scrollbar hover:overflow-y-auto overflow-hidden';
    
    return (
      <div className={`absolute ${classicDock} z-50 flex ${isVertical ? '!flex-col' : '!flex-row'} items-center ${isVertical ? 'justify-start py-8' : 'justify-between'} pointer-events-auto rounded-none ${transitionClasses} ${glassClasses}`}>
        {isVertical ? (
           <>
              
             <div className="flex-1 pointer-events-none" />
             {renderTrackInfo("flex flex-col items-center w-full group px-6 shrink-0")}
             <div className="flex-1 pointer-events-none" />
             <div className="w-full flex flex-col gap-[6vh] shrink-0 px-2 mt-auto">
                {renderControls("flex flex-col items-center justify-center w-full px-6")}
                {renderTools("flex items-center justify-center w-full gap-4 px-6")}
             </div>
           </>
        ) : (
           <>
             {renderTrackInfo("flex items-center w-[30%] min-w-[200px] max-w-[350px] group")}
             {renderControls("flex-1 flex flex-col items-center justify-center px-4 md:px-8 max-w-[600px] w-full")}
             {renderTools("flex items-center justify-end w-[30%] min-w-[200px] max-w-[350px] gap-2 lg:gap-4")}
           </>
        )}
      </div>
    );
  }

  let floatDock = 'bottom-6 left-1/2 -translate-x-1/2';
  if (playerDock === 'top') floatDock = 'top-6 left-1/2 -translate-x-1/2';
  else if (playerDock === 'left') floatDock = 'bottom-6 left-8';
  else if (playerDock === 'right') floatDock = 'bottom-6 right-8';

  return (
    <div className={`absolute ${floatDock} z-50 flex items-center justify-between xl:justify-center w-[98%] md:w-auto md:min-w-[700px] max-w-[1200px] h-[90px] rounded-[3rem] px-6 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${transitionClasses} ${glassClasses}`}>
       {renderTrackInfo()}
       {renderControls()}
       {renderTools()}
    </div>
  );
});

export default PlayerControls;
