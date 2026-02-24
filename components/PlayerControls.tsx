
import React from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  Repeat, Shuffle, ListMusic, Airplay, Heart, Maximize2, Quote
} from './Icons';
import { Track, PlaybackState } from '../types';
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
  onToggleSidebar: () => void;
  onToggleFullScreen: () => void;
  onOpenLyrics: () => void; // New prop
  onToggleLike: (id: string) => void;
  accentColor: string;
  onGoToArtist: (artist: string) => void;
  onGoToAlbum: (album: string) => void;
  playerStyle?: 'floating' | 'classic'; // Added prop
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
  onToggleSidebar,
  onToggleFullScreen,
  onOpenLyrics,
  onToggleLike,
  accentColor,
  onGoToArtist,
  onGoToAlbum,
  playerStyle = 'classic' // Default if not provided
}) => {
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  
  const isFloating = playerStyle === 'floating';

  const renderArtists = (artistString: string) => {
    const artists = artistString.split(ARTIST_SPLIT_REGEX).map(a => a.trim()).filter(Boolean);
    return artists.map((artist, index) => (
      <React.Fragment key={index}>
        <span 
          className="hover:text-white hover:underline cursor-pointer transition-colors"
          onClick={(e) => { e.stopPropagation(); onGoToArtist(artist); }}
        >
          {artist}
        </span>
        {index < artists.length - 1 && <span className="mx-0.5 opacity-40">/</span>}
      </React.Fragment>
    ));
  };

  const containerClasses = isFloating 
    ? "fixed bottom-6 left-6 right-6 h-[88px] rounded-3xl glass-panel z-50 flex flex-col justify-center px-6 md:px-8 shadow-2xl transition-all duration-300 mx-auto max-w-screen-2xl border border-white/10"
    : "fixed bottom-0 left-0 right-0 h-[88px] w-full glass-panel border-t-0 border-l-0 border-r-0 border-b-0 rounded-t-none md:rounded-b-none md:rounded-t-none z-50 flex flex-col justify-center px-6 md:px-8 bg-black/20";

  return (
    <div className={containerClasses}>
      
      <div className="flex items-center justify-between h-full w-full gap-4">
        
        {/* Track Info */}
        <div className="flex items-center gap-4 w-1/3 min-w-[200px] z-20">
          {currentTrack ? (
            <>
              <div 
                className="w-12 h-12 rounded-lg overflow-hidden shadow-lg relative group cursor-pointer flex-shrink-0 border border-white/10"
                onClick={onToggleFullScreen}
              >
                <img src={currentTrack.coverUrl} alt="Album Art" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                  <Maximize2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span 
                  className="text-sm font-semibold text-white truncate hover:underline cursor-pointer drop-shadow-sm"
                  onClick={() => onGoToAlbum(currentTrack.album)}
                >
                  {currentTrack.title}
                </span>
                <span className="text-xs text-white/50 truncate">
                   {renderArtists(currentTrack.artist)}
                </span>
              </div>
              <button 
                onClick={() => onToggleLike(currentTrack.id)}
                className={`transition-colors ml-2 hover:scale-110 active:scale-95 p-1.5 rounded-full hover:bg-white/10 ${currentTrack.isLiked ? '' : 'text-white/30 hover:text-white'}`}
                style={{ color: currentTrack.isLiked ? accentColor : undefined }}
              >
                <Heart className={`w-4 h-4 ${currentTrack.isLiked ? 'fill-current' : ''}`} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4 opacity-50">
              <div className="w-12 h-12 rounded-lg bg-white/10 animate-pulse border border-white/5"></div>
              <div className="space-y-2">
                <div className="h-3 w-24 bg-white/10 rounded animate-pulse"></div>
                <div className="h-3 w-16 bg-white/10 rounded animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Center Controls */}
        <div className="flex flex-col items-center justify-center w-1/3 gap-1 z-10 absolute left-1/2 -translate-x-1/2 md:relative md:left-auto md:translate-x-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={onToggleShuffle}
              className={`transition-colors p-2 rounded-full hover:bg-white/5 ${isShuffled ? '' : 'text-white/40 hover:text-white'}`}
              style={{ color: isShuffled ? accentColor : undefined }}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={onPrev} className="text-white hover:text-white/70 transition-colors p-1 hover:bg-white/5 rounded-full">
              <SkipBack className="w-6 h-6 fill-current" />
            </button>
            <button 
              onClick={onPlayPause}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button onClick={onNext} className="text-white hover:text-white/70 transition-colors p-1 hover:bg-white/5 rounded-full">
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
            <button className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
              <Repeat className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full max-w-md flex items-center gap-2 text-xs text-white/40 font-medium font-mono mt-1">
            <span className="w-8 text-right">{formatTime(currentTime)}</span>
            <div 
              className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer relative group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                onSeek(percent * duration);
              }}
            >
              <div 
                className="absolute h-full bg-white/40 group-hover:bg-white/80 rounded-full backdrop-blur-sm" 
                style={{ width: `${progressPercent}%` }}
              ></div>
              <div 
                className="absolute h-3 w-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] opacity-0 group-hover:opacity-100 top-1/2 -translate-y-1/2 -ml-1.5 pointer-events-none transition-opacity"
                style={{ left: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="w-8">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Extras */}
        <div className="flex items-center justify-end gap-4 w-1/3 z-20">
           <button 
              onClick={onOpenLyrics} 
              className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
              title="Текст"
           >
              <Quote className="w-4 h-4 fill-current" />
           </button>

           <button onClick={onToggleSidebar} className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
              <ListMusic className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 w-28 group">
              <Volume2 className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:opacity-0 hover:[&::-webkit-slider-thumb]:opacity-100"
              />
            </div>
             <button className="text-white/40 transition-colors hidden sm:block hover:text-white p-2 rounded-full hover:bg-white/5" title="AirPlay Unavailable in Browser">
              <Airplay className="w-4 h-4" />
            </button>
        </div>

      </div>
    </div>
  );
};

export default PlayerControls;