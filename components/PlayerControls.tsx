
import React from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  Repeat, Shuffle, ListMusic, Airplay, Heart, Maximize2, Quote
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
  t
}) => {
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  
  const isFloating = playerStyle === 'floating';

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
    ? `absolute bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl h-[100px] rounded-[32px] ${enableGlass ? 'glass-panel' : 'bg-[var(--panel-bg)]'} z-50 flex flex-col justify-center px-8 shadow-[0_30px_60px_rgba(0,0,0,0.5)] transition-all duration-500 border border-[var(--glass-border)] hover:border-white/20`
    : `absolute bottom-0 left-0 right-0 h-[100px] w-full ${enableGlass ? 'glass-panel bg-black/40 backdrop-blur-3xl' : 'bg-[var(--bg-main-transparent)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]'} border-t border-[var(--glass-border)] z-50 flex flex-col justify-center px-8`;

  return (
    <div className={containerClasses}>
      
      <div className="flex items-center justify-between h-full w-full gap-8">
        
        {/* Track Info */}
        <div className="flex items-center gap-5 w-1/3 min-w-[240px] z-20">
          {currentTrack ? (
            <>
              <div 
                className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl relative group cursor-pointer flex-shrink-0 border border-[var(--glass-border)] transition-transform duration-500 hover:scale-105 bg-[var(--card-bg)]"
                onClick={onToggleFullScreen}
              >
                <img src={currentTrack.coverUrl} alt="Album Art" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
                  <Maximize2 className="w-5 h-5 text-[var(--text-main)]" />
                </div>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span 
                  className="text-[15px] font-black text-[var(--text-main)] truncate hover:opacity-80 cursor-pointer transition-colors tracking-tight"
                  onClick={() => onGoToAlbum(currentTrack.album)}
                >
                  {currentTrack.title}
                </span>
                <span className="text-[12px] text-[var(--text-muted)] truncate font-bold tracking-tight">
                   {renderArtists(currentTrack.artist)}
                </span>
              </div>
              <button 
                onClick={() => onToggleLike(currentTrack.id)}
                className={`transition-all ml-2 hover:scale-125 active:scale-90 p-2 rounded-xl hover:bg-[var(--card-hover)] ${currentTrack.isLiked ? '' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                style={{ color: currentTrack.isLiked ? accentColor : undefined }}
              >
                <Heart className={`w-4 h-4 ${currentTrack.isLiked ? 'fill-current' : ''}`} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-5 opacity-30">
              <div className="w-14 h-14 rounded-2xl bg-[var(--card-bg)] animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-3 w-32 bg-[var(--card-bg)] rounded-full animate-pulse"></div>
                <div className="h-2 w-20 bg-[var(--card-bg)] rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Center Controls */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-xl gap-2 z-10">
          <div className="flex items-center gap-8">
            <button 
              onClick={onToggleShuffle}
              className={`transition-all p-2 rounded-xl hover:bg-[var(--card-hover)] ${isShuffled ? '' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              style={{ color: isShuffled ? accentColor : undefined }}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={onPrev} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all p-2 hover:bg-[var(--card-hover)] rounded-xl active:scale-90">
              <SkipBack className="w-6 h-6 fill-current" />
            </button>
            <button 
              onClick={onPlayPause}
              className="w-12 h-12 rounded-2xl bg-[var(--text-main)] flex items-center justify-center text-[var(--bg-main)] hover:scale-110 active:scale-90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>
            <button onClick={onNext} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all p-2 hover:bg-[var(--card-hover)] rounded-xl active:scale-90">
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
            <button 
              onClick={onToggleRepeat}
              className={`transition-all p-2 rounded-xl hover:bg-[var(--card-hover)] ${isRepeating ? '' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              style={{ color: isRepeating ? accentColor : undefined }}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full flex items-center gap-4 text-[10px] text-[var(--text-muted)] font-black tracking-widest mt-1">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <div 
              className="flex-1 h-1.5 bg-[var(--card-bg)] rounded-full cursor-pointer relative group overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                onSeek(percent * duration);
              }}
            >
              <div 
                className="absolute h-full bg-[var(--text-muted)] group-hover:bg-[var(--text-main)] rounded-full transition-colors" 
                style={{ width: `${progressPercent}%` }}
              ></div>
              <div 
                className="absolute h-full bg-[var(--text-main)] rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                style={{ width: `${progressPercent}%`, opacity: isPlaying ? 0.8 : 0.4 }}
              ></div>
            </div>
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Extras */}
        <div className="flex items-center justify-end gap-3 w-1/3 z-20">
           <button 
              onClick={onOpenLyrics} 
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all p-2.5 rounded-xl hover:bg-[var(--card-hover)]"
              title={t('lyrics')}
           >
              <Quote className="w-4 h-4" />
           </button>

           <button onClick={onToggleSidebar} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all p-2.5 rounded-xl hover:bg-[var(--card-hover)]">
              <ListMusic className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 w-32 group ml-2">
              <Volume2 className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
              <div className="relative flex-1 h-1.5 bg-[var(--card-bg)] rounded-full overflow-hidden cursor-pointer">
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="absolute h-full bg-[var(--text-muted)] group-hover:bg-[var(--text-main)] transition-colors" style={{ width: `${volume * 100}%` }}></div>
              </div>
            </div>
             <button className="text-[var(--text-muted)] transition-all hidden sm:block hover:text-[var(--text-main)] p-2.5 rounded-xl hover:bg-[var(--card-hover)]" title="AirPlay Unavailable in Browser">
              <Airplay className="w-4 h-4" />
            </button>
        </div>

      </div>
    </div>
  );
};

export default PlayerControls;