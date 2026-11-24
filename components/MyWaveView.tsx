import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Track, PlaybackState, WaveMood, WaveSource } from '../types';
import { TranslationKey } from '../translations';
import { 
  Play, Pause, SkipForward, Heart, ThumbsDown, Waves, Plus, Check,
  Flame, Zap, Compass, Disc, Sparkles, Loader2, Music
} from './Icons';
import { WaveAlgorithm } from '../services/waveAlgorithm';
import { formatTime } from '../utils';

interface MyWaveViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  playbackState: PlaybackState;
  onPlayTrack: (track: Track, newQueue?: Track[]) => void;
  onTogglePlayPause: () => void;
  onToggleLike: (id: string, track?: Track) => void;
  onAddTrackToLibrary?: (track: Track) => void;
  accentColor: string;
  enableGlass?: boolean;
  analyser?: AnalyserNode | null;
  t: (key: TranslationKey) => string;
}

const MOODS: { id: WaveMood; labelKey: TranslationKey; icon: React.ReactNode; color: string }[] = [
  { id: 'all', labelKey: 'wave_mood_all', icon: <Waves className="w-4 h-4" />, color: '#ec4899' },
  { id: 'energetic', labelKey: 'wave_mood_energetic', icon: <Zap className="w-4 h-4" />, color: '#f59e0b' },
  { id: 'calm', labelKey: 'wave_mood_calm', icon: <Sparkles className="w-4 h-4" />, color: '#06b6d4' },
  { id: 'drive', labelKey: 'wave_mood_drive', icon: <Flame className="w-4 h-4" />, color: '#ef4444' },
  { id: 'deep', labelKey: 'wave_mood_deep', icon: <Disc className="w-4 h-4" />, color: '#8b5cf6' },
  { id: 'favorites', labelKey: 'wave_mood_favorites', icon: <Heart className="w-4 h-4" />, color: '#f43f5e' },
  { id: 'discovery', labelKey: 'wave_mood_discovery', icon: <Compass className="w-4 h-4" />, color: '#10b981' }
];

const MyWaveView: React.FC<MyWaveViewProps> = ({
  tracks,
  currentTrack,
  playbackState,
  onPlayTrack,
  onTogglePlayPause,
  onToggleLike,
  onAddTrackToLibrary,
  accentColor,
  enableGlass = true,
  analyser,
  t
}) => {
  const [waveEngine] = useState<WaveAlgorithm>(() => new WaveAlgorithm(tracks, 'all', 'all'));
  const [currentMood, setCurrentMood] = useState<WaveMood>('all');
  const [currentSource, setCurrentSource] = useState<WaveSource>('all');
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [upcomingTracks, setUpcomingTracks] = useState<Track[]>([]);
  const [addedTracks, setAddedTracks] = useState<Record<string, boolean>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    waveEngine.updateLibrary(tracks);
  }, [tracks, waveEngine]);

  const updateUpcoming = useCallback(() => {
    const queue = waveEngine.getPreloadedQueue();
    setUpcomingTracks(queue.slice(0, 4));
  }, [waveEngine]);

  const handleNextInWave = useCallback(async () => {
    if (isLoadingNext) return;
    setIsLoadingNext(true);
    setStatusMessage(t('wave_generating'));
    try {
      const nextTrack = await waveEngine.getNextTrack();
      onPlayTrack(nextTrack);
      updateUpcoming();
    } catch {
      setStatusMessage('');
    } finally {
      setIsLoadingNext(false);
      setStatusMessage('');
    }
  }, [isLoadingNext, onPlayTrack, t, updateUpcoming, waveEngine]);

  const handleDislike = useCallback(async () => {
    if (!currentTrack || isLoadingNext) return;
    setIsLoadingNext(true);
    setStatusMessage(t('tuning_wave'));
    try {
      const nextTrack = await waveEngine.dislikeTrack(currentTrack);
      onPlayTrack(nextTrack);
      updateUpcoming();
    } catch {
      setStatusMessage('');
    } finally {
      setIsLoadingNext(false);
      setStatusMessage('');
    }
  }, [currentTrack, isLoadingNext, onPlayTrack, t, updateUpcoming, waveEngine]);

  const handleLike = useCallback(() => {
    if (!currentTrack) return;
    waveEngine.likeTrack(currentTrack);
    onToggleLike(currentTrack.id, currentTrack);
  }, [currentTrack, onToggleLike, waveEngine]);

  const handleMoodSelect = useCallback((mood: WaveMood) => {
    setCurrentMood(mood);
    waveEngine.setMood(mood);
    setStatusMessage(t('tuning_wave'));
    handleNextInWave();
  }, [handleNextInWave, t, waveEngine]);

  const handleSourceSelect = useCallback((source: WaveSource) => {
    setCurrentSource(source);
    waveEngine.setSource(source);
    setStatusMessage(t('tuning_wave'));
    handleNextInWave();
  }, [handleNextInWave, t, waveEngine]);

  const handleAddToLibrary = (track: Track) => {
    if (onAddTrackToLibrary) {
      onAddTrackToLibrary(track);
      setAddedTracks(prev => ({ ...prev, [track.id]: true }));
    }
  };

  useEffect(() => {
    if (!currentTrack) {
      handleNextInWave();
    } else {
      updateUpcoming();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };

    window.addEventListener('resize', handleResize);

    const freqData = new Uint8Array(analyser ? analyser.frequencyBinCount : 32);

    const activeMoodConfig = MOODS.find(m => m.id === currentMood) || MOODS[0];
    const waveColor = activeMoodConfig.color || accentColor;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let energy = 0.3;
      if (analyser && playbackState === PlaybackState.PLAYING) {
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < 32; i++) {
          sum += freqData[i];
        }
        energy = Math.min(1.5, Math.max(0.2, (sum / 32) / 120));
      } else if (playbackState === PlaybackState.PLAYING) {
        energy = 0.8;
      }

      phaseRef.current += 0.02 * energy;
      const phase = phaseRef.current;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.28;

      const layers = [
        { alpha: 0.15, scale: 1.25, freq: 4, speed: 1.2 },
        { alpha: 0.28, scale: 1.12, freq: 5, speed: -0.9 },
        { alpha: 0.45, scale: 1.0, freq: 6, speed: 1.5 }
      ];

      layers.forEach(layer => {
        ctx.beginPath();
        const numPoints = 80;
        for (let i = 0; i <= numPoints; i++) {
          const theta = (i / numPoints) * Math.PI * 2;
          const wobble = Math.sin(theta * layer.freq + phase * layer.speed) * 14 * energy
                       + Math.cos(theta * (layer.freq - 1) - phase) * 8 * energy;
          const r = baseRadius * layer.scale + wobble;
          const x = centerX + Math.cos(theta) * r;
          const y = centerY + Math.sin(theta) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.4, centerX, centerY, baseRadius * layer.scale * 1.3);
        grad.addColorStop(0, `${waveColor}00`);
        grad.addColorStop(0.7, `${waveColor}${Math.floor(layer.alpha * 255).toString(16).padStart(2, '0')}`);
        grad.addColorStop(1, `${waveColor}00`);

        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = `${waveColor}${Math.floor(layer.alpha * 1.5 * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 0.9);
      coreGrad.addColorStop(0, `${waveColor}44`);
      coreGrad.addColorStop(1, `${waveColor}00`);
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [analyser, currentMood, playbackState, accentColor]);

  const activeMood = MOODS.find(m => m.id === currentMood) || MOODS[0];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-y-auto custom-scrollbar px-4 sm:px-8 py-6 select-none">
      
      <div className="w-full max-w-4xl flex flex-col items-center gap-4 z-10">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-500/20"
            style={{ background: `linear-gradient(135deg, ${activeMood.color}, ${accentColor})` }}
          >
            <Waves className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-main)]">
              {t('my_wave')}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {statusMessage || t('my_wave_desc')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {MOODS.map(m => {
            const isSelected = m.id === currentMood;
            return (
              <button
                key={m.id}
                onClick={() => handleMoodSelect(m.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                  isSelected 
                    ? 'text-white shadow-lg scale-105' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--card-bg)]/60 hover:bg-[var(--card-hover)] border border-[var(--glass-border)]'
                }`}
                style={isSelected ? { background: m.color, boxShadow: `0 8px 20px -4px ${m.color}66` } : {}}
              >
                <span>{m.icon}</span>
                <span>{t(m.labelKey)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--card-bg)]/40 border border-[var(--glass-border)] text-[11px] font-bold">
          {(['all', 'youtube', 'soundcloud'] as WaveSource[]).map(src => {
            const isSelected = currentSource === src;
            const labelKey: TranslationKey = src === 'all' 
              ? 'wave_source_all' 
              : src === 'youtube' ? 'wave_source_yt' : 'wave_source_sc';
            return (
              <button
                key={src}
                onClick={() => handleSourceSelect(src)}
                className={`px-3 py-1 rounded-full transition-all ${
                  isSelected 
                    ? 'bg-white/15 text-[var(--text-main)] shadow-sm' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative w-full max-w-2xl flex-1 min-h-[300px] flex items-center justify-center my-4">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative group">
            <div 
              className="absolute -inset-4 rounded-full blur-2xl opacity-60 transition-all duration-700 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${activeMood.color}88 0%, transparent 70%)` }}
            />
            
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full p-2 bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden">
              {currentTrack?.coverUrl ? (
                <img 
                  src={currentTrack.coverUrl} 
                  alt={currentTrack.title}
                  className="w-full h-full object-cover rounded-full shadow-inner animate-[spin_30s_linear_infinite]"
                  style={{ animationPlayState: playbackState === PlaybackState.PLAYING ? 'running' : 'paused' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'assets/default-cover.png';
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[var(--card-bg)] flex items-center justify-center">
                  <Music className="w-16 h-16 text-[var(--text-muted)] opacity-50" />
                </div>
              )}

              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/50 via-transparent to-white/10 pointer-events-none" />
              
              <div className="absolute w-12 h-12 rounded-full bg-[var(--bg-main)] border-2 border-white/20 shadow-md flex items-center justify-center">
                <div className="w-4 h-4 rounded-full" style={{ background: activeMood.color }} />
              </div>
            </div>
          </div>

          <div className="mt-5 text-center px-4 max-w-md">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] truncate drop-shadow-md">
              {currentTrack?.title || t('wave_generating')}
            </h2>
            <p className="text-sm font-semibold text-[var(--text-muted)] truncate mt-1">
              {currentTrack?.artist || 'Glass Music Wave'}
            </p>
            {currentTrack?.album && (
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/10 text-[var(--text-muted)] border border-white/5">
                {currentTrack.album}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 sm:gap-6 mt-6">
            <button
              onClick={handleDislike}
              disabled={isLoadingNext}
              className="p-3 rounded-full bg-[var(--card-bg)]/60 hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 border border-[var(--glass-border)] transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
              title={t('dislike')}
            >
              <ThumbsDown className="w-5 h-5" />
            </button>

            <button
              onClick={onTogglePlayPause}
              disabled={isLoadingNext && !currentTrack}
              className="w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ 
                background: `linear-gradient(135deg, ${activeMood.color}, ${accentColor})`,
                boxShadow: `0 12px 28px -4px ${activeMood.color}88`
              }}
            >
              {isLoadingNext ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : playbackState === PlaybackState.PLAYING ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={handleNextInWave}
              disabled={isLoadingNext}
              className="p-3.5 rounded-full bg-[var(--card-bg)]/60 hover:bg-[var(--card-hover)] text-[var(--text-main)] border border-[var(--glass-border)] transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
              title={t('wave_next')}
            >
              <SkipForward className="w-6 h-6" />
            </button>

            <button
              onClick={handleLike}
              className={`p-3 rounded-full border border-[var(--glass-border)] transition-all hover:scale-110 active:scale-95 ${
                currentTrack?.isLiked 
                  ? 'bg-pink-500/20 text-pink-500 border-pink-500/30' 
                  : 'bg-[var(--card-bg)]/60 text-[var(--text-muted)] hover:text-pink-400'
              }`}
              title={t('favorites')}
            >
              <Heart className={`w-5 h-5 ${currentTrack?.isLiked ? 'fill-current' : ''}`} />
            </button>

            {currentTrack && (
              <button
                onClick={() => handleAddToLibrary(currentTrack)}
                disabled={Boolean(addedTracks[currentTrack.id])}
                className="p-3 rounded-full bg-[var(--card-bg)]/60 hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--glass-border)] transition-all hover:scale-110 active:scale-95"
                title={t('add_tracks')}
              >
                {addedTracks[currentTrack.id] ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {upcomingTracks.length > 0 && (
        <div className="w-full max-w-3xl mt-auto z-10 pt-4 border-t border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t('wave_next')}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">
              {upcomingTracks.length} {t('songs').toLowerCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {upcomingTracks.map((item, idx) => (
              <div
                key={item.id + '_' + idx}
                onClick={() => {
                  onPlayTrack(item);
                  waveEngine.likeTrack(item);
                  updateUpcoming();
                }}
                className="group flex items-center gap-2.5 p-2 rounded-2xl bg-[var(--card-bg)]/40 hover:bg-[var(--card-hover)] border border-[var(--glass-border)] cursor-pointer transition-all hover:scale-[1.02]"
              >
                <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-black/40">
                  <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--text-main)] truncate group-hover:text-pink-400 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    {item.artist}
                  </p>
                </div>

                <span className="text-[10px] text-[var(--text-muted)] shrink-0 pr-1">
                  {formatTime(item.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyWaveView;
