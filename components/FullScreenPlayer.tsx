
import React from 'react';
import { Track, PlaybackState } from '../types';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  Shuffle, Repeat, Minimize2, Heart, MoreHorizontal, Airplay, ListMusic
} from './Icons';
import { formatTime } from '../utils';

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
  onClose
}) => {
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-[#1c1c1e] text-white overflow-hidden flex flex-col">
      {/* Blurred Background */}
      <div 
        className="absolute inset-0 z-0 opacity-40 scale-110 blur-[100px]"
        style={{ 
          backgroundImage: `url(${track.coverUrl})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        }}
      ></div>
      <div className="absolute inset-0 z-0 bg-black/40 backdrop-blur-3xl"></div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 py-12">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <Minimize2 className="w-5 h-5 text-white" />
        </button>
        <div className="w-12 h-1 bg-white/20 rounded-full"></div>
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <MoreHorizontal className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-12 px-8 max-w-6xl mx-auto w-full">
        {/* Artwork */}
        <div className="w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
          <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover" />
        </div>

        {/* Controls Container */}
        <div className="w-full max-w-md flex flex-col justify-center gap-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold truncate">{track.title}</h2>
            <p className="text-xl text-white/60 truncate">{track.artist} — {track.album}</p>
          </div>

          {/* Progress Bar */}
          <div className="group">
            <div 
              className="h-1.5 bg-white/20 rounded-full cursor-pointer relative mb-2"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                onSeek(percent * duration);
              }}
            >
              <div 
                className="absolute h-full bg-white/80 rounded-full" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs font-medium text-white/40">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-between">
            <button 
              onClick={onToggleShuffle} 
              className={`transition-colors ${isShuffled ? 'text-pink-500' : 'text-white/40 hover:text-white'}`}
            >
              <Shuffle className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-8">
              <button onClick={onPrev} className="text-white hover:text-white/70 transition-colors">
                <SkipBack className="w-10 h-10 fill-current" />
              </button>
              <button 
                onClick={onPlayPause}
                className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
              >
                {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
              </button>
              <button onClick={onNext} className="text-white hover:text-white/70 transition-colors">
                <SkipForward className="w-10 h-10 fill-current" />
              </button>
            </div>

            <button onClick={() => onToggleShuffle} className="text-white/40 hover:text-white transition-colors">
              <Repeat className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
               <Volume2 className="w-4 h-4 text-white/60" />
               <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
             <div className="flex items-center gap-6">
                 <button className="text-white/40 hover:text-white transition-colors">
                    <Airplay className="w-5 h-5" />
                 </button>
                 <button className="text-white/40 hover:text-white transition-colors">
                    <ListMusic className="w-5 h-5" />
                 </button>
             </div>
          </div>
        </div>
      </div>
       {/* Like Button Floating */}
       <div className="absolute bottom-12 right-12 z-20">
          <button 
            onClick={() => onToggleLike(track.id)}
            className={`p-4 rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 ${track.isLiked ? 'text-pink-500' : 'text-white/40'}`}
          >
             <Heart className={`w-6 h-6 ${track.isLiked ? 'fill-current' : ''}`} />
          </button>
       </div>
    </div>
  );
};

export default FullScreenPlayer;
