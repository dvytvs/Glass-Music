
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, Shuffle, ListMusic, Airplay, Heart, Maximize2, Quote, Rabbit, Turtle
} from './Icons';
import { Track, PlaybackState } from '../types';
import { TranslationKey } from '../translations';
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
  onVolumeChange: (vol: number) => void;
  isShuffled: boolean;
  onToggleShuffle: () => void;
  isRepeating: boolean;
  onToggleRepeat: () => void;
  onToggleSidebar: () => void;
  onToggleFullScreen: () => void;
  onOpenLyrics: () => void; // New prop
  onToggleLike: (id: string) => void;
  accentColor: string;
  onGoToArtist: (artist: string) => void;
  onGoToAlbum: (album: string) => void;
  playerStyle?: 'floating' | 'classic'; // Added prop
  enableGlass?: boolean;
  t: (key: TranslationKey) => string;
  audioEffect?: 'normal' | 'slowed' | 'spedup';
  onToggleAudioEffect?: () => void;
}

const ARTIST_SPLIT_REGEX = /\s*(?:,|;|feat\.?|ft\.?|&|\/|featuring)\s+/i;

const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentTrack,
  playbackState,
  onPlayPause,
  onNext,
  onPrev,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isShuffled,
  onToggleShuffle,
  isRepeating,
  onToggleRepeat,
  onToggleSidebar,
  onToggleFullScreen,
  onOpenLyrics,
  onToggleLike,
  accentColor,
  onGoToArtist,
  onGoToAlbum,
  playerStyle = 'classic', // Default if not provided
  enableGlass = true,
  t,
  audioEffect = 'normal',
  onToggleAudioEffect
}) => {
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  
  const isFloating = playerStyle === 'floating';
  const prevVolumeRef = useRef(1);

  const handleVolumeToggle = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolumeRef.current || 1);
    }
  };

  const renderArtists = (artistString: string) => {
    const artists = artistString.split(ARTIST_SPLIT_REGEX).map(a => a.trim()).filter(Boolean);
    return artists.map((artist, index) => (
      <React.Fragment key={index}>
        <span 
          className="hover:text-[var(--text-main)] hover:underline cursor-pointer transition-colors"
          onClick={(e) => { e.stopPropagation(); onGoToArtist(artist); }}
        >
          {artist}
        </span>
        {index < artists.length - 1 && <span className="mx-0.5 opacity-40">/</span>}
      </React.Fragment>
    ));
  };

  const containerClasses = isFloating 
    ? `absolute bottom-6 left-1/2 -translate-x-1/2 w-[96%] max-w-6xl h-[90px] rounded-[2.5rem] ${enableGlass ? 'bg-black/60 backdrop-blur-2xl border border-white/10' : 'bg-[var(--panel-bg)] border border-[var(--glass-border)]'} z-50 flex flex-col justify-center px-8 shadow-2xl transition-all duration-500`
    : `w-full h-[100px] shrink-0 ${enableGlass ? 'bg-black/70 backdrop-blur-3xl border-t border-white/5' : 'bg-[var(--panel-bg)] border-t border-[var(--glass-border)]'} z-50 flex flex-col justify-center px-8 transition-all duration-500 relative`;

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between h-full w-full gap-4">
        
        {/* Track Info */}
        <div 
          className="flex items-center gap-4 w-[30%] min-w-[180px] z-20 cursor-pointer group/trackinfo"
          onClick={onToggleFullScreen}
        >
          {currentTrack ? (
            <>
              <div className="w-16 h-16 rounded-2xl overflow-hidden relative group cursor-pointer flex-shrink-0 bg-[var(--card-bg)] shadow-lg">
                <img src={currentTrack.coverUrl} alt="Album Art" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col overflow-hidden justify-center">
                <span 
                  className="text-[15px] font-bold text-[var(--text-main)] truncate hover:underline cursor-pointer tracking-tight group-hover/trackinfo:text-[var(--accent-color)] transition-colors"
                  onClick={(e) => { e.stopPropagation(); onGoToAlbum(currentTrack.album); }}
                >
                  {currentTrack.title}
                </span>
                <span className="text-[13px] text-[var(--text-muted)] truncate mt-0.5 font-medium">
                   {renderArtists(currentTrack.artist)}
                </span>
              </div>
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); onToggleLike(currentTrack.id); }}
                className={`ml-2 p-2.5 rounded-full hover:bg-[var(--card-hover)] transition-all ${currentTrack.isLiked ? '' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                style={{ color: currentTrack.isLiked ? accentColor : undefined }}
              >
                <Heart className={`w-5 h-5 ${currentTrack.isLiked ? 'fill-current' : ''}`} />
              </motion.button>
            </>
          ) : (
            <div className="flex items-center gap-4 opacity-40">
              <div className="w-16 h-16 rounded-2xl bg-[var(--card-bg)] animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-3 w-24 bg-[var(--card-bg)] rounded-full animate-pulse"></div>
                <div className="h-2 w-16 bg-[var(--card-bg)] rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Center Controls */}
        <div className="flex flex-col items-center justify-center w-[40%] max-w-[722px] z-10">
          <div className="flex items-center gap-6 mb-2">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={onToggleShuffle}
              className={`p-2 rounded-full hover:bg-[var(--card-hover)] transition-all ${isShuffled ? '' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              style={{ color: isShuffled ? accentColor : undefined }}
            >
              <Shuffle className="w-4 h-4" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onPrev} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all p-2 hover:bg-[var(--card-hover)] rounded-full">
              <SkipBack className="w-5 h-5 fill-current" />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={onPlayPause}
              className="w-10 h-10 rounded-full bg-[var(--text-main)] flex items-center justify-center text-[var(--bg-main)] hover:scale-105 transition-all shadow-md"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onNext} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all p-2 hover:bg-[var(--card-hover)] rounded-full">
              <SkipForward className="w-5 h-5 fill-current" />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={onToggleRepeat}
              className={`p-2 rounded-full hover:bg-[var(--card-hover)] transition-all ${isRepeating ? '' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              style={{ color: isRepeating ? accentColor : undefined }}
              title={t('repeat')}
            >
              <Repeat className="w-4 h-4" />
            </motion.button>
          </div>
          
          <div className="w-full flex items-center gap-3 text-[12px] text-[var(--text-muted)] font-medium">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <div 
              className="flex-1 h-1.5 bg-[var(--card-bg)] rounded-full cursor-pointer relative group flex items-center"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                onSeek(percent * duration);
              }}
            >
              <div 
                className="absolute h-1.5 bg-[var(--text-muted)] group-hover:bg-[var(--text-main)] rounded-full transition-colors" 
                style={{ width: `${progressPercent}%` }}
              ></div>
              <div 
                className="absolute h-3.5 w-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" 
                style={{ left: `calc(${progressPercent}% - 7px)` }}
              ></div>
            </div>
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Extras */}
        <div className="flex items-center justify-end gap-2 w-[30%] min-w-[180px] z-20">
           <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={onToggleAudioEffect}
              className={`p-2.5 rounded-full hover:bg-[var(--card-hover)] transition-all ${audioEffect !== 'normal' ? '' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              style={{ color: audioEffect !== 'normal' ? accentColor : undefined }}
              title={audioEffect === 'slowed' ? 'Slowed' : audioEffect === 'spedup' ? 'Speed Up' : 'Normal Speed'}
            >
              {audioEffect === 'slowed' ? <Turtle className="w-4 h-4" /> : <Rabbit className={`w-4 h-4 ${audioEffect === 'normal' ? 'opacity-50' : ''}`} />}
            </motion.button>
           <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={onOpenLyrics} 
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all p-2.5 rounded-full hover:bg-[var(--card-hover)]"
              title={t('lyrics')}
           >
              <Quote className="w-4 h-4" />
           </motion.button>
           <motion.button whileTap={{ scale: 0.9 }} onClick={onToggleSidebar} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all p-2.5 rounded-full hover:bg-[var(--card-hover)]">
              <ListMusic className="w-4 h-4" />
            </motion.button>
            <div className="flex items-center gap-2 w-28 group ml-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleVolumeToggle} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1 rounded-full hover:bg-[var(--card-hover)]">
                {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </motion.button>
              <div className="relative flex-1 h-1.5 bg-[var(--card-bg)] rounded-full flex items-center cursor-pointer">
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="absolute h-1.5 bg-[var(--text-muted)] group-hover:bg-[var(--text-main)] rounded-full transition-colors" style={{ width: `${volume * 100}%` }}></div>
                <div className="absolute h-3.5 w-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${volume * 100}% - 7px)` }}></div>
              </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PlayerControls;