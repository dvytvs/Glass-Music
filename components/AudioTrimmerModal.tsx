import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Play, Pause, Scissors, RotateCcw, ZoomIn, ZoomOut, Maximize2, Check, Clock, Layers, Volume2 } from 'lucide-react';
import { Track } from '../types';
import { TranslationKey } from '../translations';

interface AudioTrimmerModalProps {
  track: Track;
  onClose: () => void;
  onTrimComplete: (newDuration: number) => void;
  accentColor?: string;
  t: (key: TranslationKey) => string;
}

const formatPrecisionTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const parsePrecisionTime = (str: string): number => {
  const parts = str.trim().split(':');
  if (parts.length === 2) {
    const m = parseFloat(parts[0]) || 0;
    const s = parseFloat(parts[1]) || 0;
    return Math.max(0, m * 60 + s);
  }
  return Math.max(0, parseFloat(str) || 0);
};

const AudioTrimmerModal: React.FC<AudioTrimmerModalProps> = ({
  track,
  onClose,
  onTrimComplete,
  accentColor = '#db2777',
  t
}) => {
  const [totalDuration, setTotalDuration] = useState<number>(track.duration || 0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(track.duration || 10);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [playSelectionOnly, setPlaySelectionOnly] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fileExt = useMemo(() => {
    const p = track.path || track.title || '';
    const match = p.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : 'audio';
  }, [track.path, track.title]);

  const isFlac = fileExt === 'flac';
  const isMp3 = fileExt === 'mp3';

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = track.fileUrl;
    audioPreviewRef.current = audio;

    let isCancelled = false;

    const onLoadedMetadata = () => {
      if (isCancelled) return;
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setTotalDuration(audio.duration);
        setEndTime(prev => (prev <= 0 || prev > audio.duration ? audio.duration : prev));
      }
    };

    const onTimeUpdate = () => {
      if (isCancelled) return;
      const cur = audio.currentTime;
      setCurrentTime(cur);

      if (playSelectionOnly && cur >= endTime) {
        if (isLooping) {
          audio.currentTime = startTime;
          audio.play().catch(console.error);
        } else {
          audio.pause();
          setIsPlaying(false);
          audio.currentTime = startTime;
        }
      }
    };

    const onEnded = () => {
      if (isCancelled) return;
      if (isLooping && playSelectionOnly) {
        audio.currentTime = startTime;
        audio.play().catch(console.error);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    const loadWaveformData = async () => {
      setIsLoadingAudio(true);
      try {
        const response = await fetch(track.fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtxClass();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        if (!isCancelled) {
          setAudioBuffer(decoded);
          if (decoded.duration > 0) {
            setTotalDuration(decoded.duration);
            setEndTime(decoded.duration);
          }
        }
        ctx.close();
      } catch (err) {
        console.warn('Could not decode audio buffer for detailed waveform:', err);
      } finally {
        if (!isCancelled) setIsLoadingAudio(false);
      }
    };

    loadWaveformData();

    return () => {
      isCancelled = true;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [track.fileUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, width, height);

    const rulerHeight = 24;
    ctx.fillStyle = '#161923';
    ctx.fillRect(0, 0, width, rulerHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(0, rulerHeight);
    ctx.lineTo(width, rulerHeight);
    ctx.stroke();

    const duration = totalDuration || 1;
    const timeStep = duration > 300 ? 30 : duration > 120 ? 15 : duration > 60 ? 10 : 5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    for (let tSec = 0; tSec <= duration; tSec += timeStep) {
      const x = (tSec / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, rulerHeight - 8);
      ctx.lineTo(x, rulerHeight);
      ctx.stroke();
      ctx.fillText(formatPrecisionTime(tSec).slice(0, 5), x, 14);
    }

    const waveformTop = rulerHeight;
    const waveformHeight = height - rulerHeight;
    const centerY = waveformTop + waveformHeight / 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    if (audioBuffer) {
      const channelData = audioBuffer.getChannelData(0);
      const step = Math.ceil(channelData.length / width);
      const amp = waveformHeight / 2 - 4;

      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        const offset = i * step;

        for (let j = 0; j < step; j++) {
          const datum = channelData[offset + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }

        const tSec = (i / width) * duration;
        const isSelected = tSec >= startTime && tSec <= endTime;

        ctx.fillStyle = isSelected ? accentColor : 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(i, centerY + min * amp, 1, Math.max(1, (max - min) * amp));
      }
    } else {
      const amp = waveformHeight * 0.35;
      for (let i = 0; i < width; i += 2) {
        const tSec = (i / width) * duration;
        const isSelected = tSec >= startTime && tSec <= endTime;
        const pseudoAmp = (Math.sin(i * 0.05) * 0.5 + Math.cos(i * 0.02) * 0.5) * amp;
        ctx.fillStyle = isSelected ? accentColor : 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(i, centerY - Math.abs(pseudoAmp), 1.5, Math.abs(pseudoAmp) * 2);
      }
    }

    const startX = (startTime / duration) * width;
    const endX = (endTime / duration) * width;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, waveformTop, startX, waveformHeight);
    ctx.fillRect(endX, waveformTop, width - endX, waveformHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(startX, waveformTop, endX - startX, waveformHeight);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX + 10, 0);
    ctx.lineTo(startX, 16);
    ctx.fill();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX - 10, 0);
    ctx.lineTo(endX, 16);
    ctx.fill();

    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playheadX, rulerHeight);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(playheadX, rulerHeight + 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [audioBuffer, totalDuration, startTime, endTime, currentTime, accentColor, zoomLevel]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const clickTime = ratio * (totalDuration || 1);

    const startX = (startTime / (totalDuration || 1)) * rect.width;
    const endX = (endTime / (totalDuration || 1)) * rect.width;

    if (Math.abs(x - startX) <= 12) {
      setActiveHandle('start');
    } else if (Math.abs(x - endX) <= 12) {
      setActiveHandle('end');
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.currentTime = clickTime;
        setCurrentTime(clickTime);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeHandle) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const targetTime = ratio * (totalDuration || 1);

    if (activeHandle === 'start') {
      const clamped = Math.min(targetTime, endTime - 0.1);
      setStartTime(Math.max(0, clamped));
    } else if (activeHandle === 'end') {
      const clamped = Math.max(targetTime, startTime + 0.1);
      setEndTime(Math.min(totalDuration, clamped));
    }
  };

  const handleCanvasMouseUp = () => {
    setActiveHandle(null);
  };

  const togglePlay = () => {
    const audio = audioPreviewRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setPlaySelectionOnly(false);
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const playSelection = () => {
    const audio = audioPreviewRef.current;
    if (!audio) return;
    audio.currentTime = startTime;
    setPlaySelectionOnly(true);
    audio.play().then(() => setIsPlaying(true)).catch(console.error);
  };

  const resetSelection = () => {
    setStartTime(0);
    setEndTime(totalDuration);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const adjustStartTime = (delta: number) => {
    setStartTime(prev => {
      const next = Math.max(0, Math.min(prev + delta, endTime - 0.05));
      return parseFloat(next.toFixed(2));
    });
  };

  const adjustEndTime = (delta: number) => {
    setEndTime(prev => {
      const next = Math.min(totalDuration, Math.max(prev + delta, startTime + 0.05));
      return parseFloat(next.toFixed(2));
    });
  };

  const handleSaveTrim = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.removeAttribute('src');
      audioPreviewRef.current.load();
      setIsPlaying(false);
    }

    const isDesktop = () => (window as any).require !== undefined;

    try {
      if (isDesktop() && track.path) {
        const ipcRenderer = (window as any).require('electron').ipcRenderer;
        const res: any = await ipcRenderer.invoke('trim-audio', {
          filePath: track.path,
          startTime: startTime,
          endTime: endTime
        });

        if (res && res.success) {
          const newDur = res.duration || (endTime - startTime);
          onTrimComplete(newDur);
          onClose();
          return;
        } else {
          alert((res && res.error) || t('trim_failed'));
        }
      } else {
        if (audioBuffer) {
          const sampleRate = audioBuffer.sampleRate;
          const startSample = Math.floor(startTime * sampleRate);
          const endSample = Math.floor(endTime * sampleRate);
          const frameCount = endSample - startSample;

          if (frameCount > 0) {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioCtxClass();
            const trimmedBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, frameCount, sampleRate);

            for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
              const srcData = audioBuffer.getChannelData(c);
              const destData = trimmedBuffer.getChannelData(c);
              for (let i = 0; i < frameCount; i++) {
                destData[i] = srcData[startSample + i];
              }
            }
            ctx.close();
            onTrimComplete(endTime - startTime);
            onClose();
            return;
          }
        }
        onTrimComplete(endTime - startTime);
        onClose();
      }
    } catch (err: any) {
      console.error('Error during audio trim:', err);
      alert(err.message || t('trim_failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const selectionDuration = Math.max(0, endTime - startTime);

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in-view">
      <div 
        ref={containerRef}
        className="bg-[#0b0d14] border border-white/10 w-full max-w-5xl rounded-[32px] shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[95vh] text-white"
        onMouseUp={handleCanvasMouseUp}
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#131622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10" style={{ color: accentColor }}>
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">{t('trim_audio')}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isFlac ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  isMp3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                }`}>
                  {isFlac ? 'FLAC Lossless Studio' : isMp3 ? 'MP3 Frame Audio' : fileExt.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-white/50 truncate max-w-md">
                {track.title} • {track.artist}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="bg-[#0f111a] p-4 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-lg transition-transform active:scale-95"
                style={{ backgroundColor: accentColor, color: '#ffffff' }}
                title="Play / Pause"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={playSelection}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold transition-colors flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                {t('trim_play_selection')}
              </button>
              <button
                type="button"
                onClick={() => setIsLooping(!isLooping)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  isLooping ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 hover:bg-white/10 text-white/60'
                }`}
              >
                {t('loop_selection')}
              </button>
              <button
                type="button"
                onClick={resetSelection}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title={t('trim_reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/40 font-mono tabular-nums">
                {formatPrecisionTime(currentTime)} / {formatPrecisionTime(totalDuration)}
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.5))}
                disabled={zoomLevel <= 1}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-30 transition-colors"
                title={t('zoom_out')}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold font-mono px-1">{zoomLevel}x</span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(4, prev + 0.5))}
                disabled={zoomLevel >= 4}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-30 transition-colors"
                title={t('zoom_in')}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-white/50 px-1 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {t('trim_start')}: {formatPrecisionTime(startTime)}
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Clock className="w-3.5 h-3.5" />
                {t('trim_duration')}: {formatPrecisionTime(selectionDuration)}
              </span>
              <span className="flex items-center gap-1.5 text-red-400 font-bold">
                {t('trim_end')}: {formatPrecisionTime(endTime)}
                <span className="w-2 h-2 rounded-full bg-red-400" />
              </span>
            </div>

            <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-white/10 bg-[#0e1017] select-none cursor-crosshair">
              {isLoadingAudio && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-2" />
                  <p className="text-xs text-white/70 font-semibold">{t('searching')}</p>
                </div>
              )}
              <canvas
                ref={canvasRef}
                width={1200}
                height={176}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                className="w-full h-full block"
              />
            </div>
            <p className="text-[10px] text-white/30 text-center tracking-wide">
              {t('audio_editor')} • Drag green and red boundaries or click on waveform to set position
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111420] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {t('trim_start')}
                </label>
                <div className="text-xs font-mono text-white/50">{formatPrecisionTime(startTime)}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustStartTime(-1)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold font-mono transition-colors"
                >
                  -1.0s
                </button>
                <button
                  type="button"
                  onClick={() => adjustStartTime(-0.1)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold font-mono transition-colors"
                >
                  -0.1s
                </button>
                <input
                  type="text"
                  value={formatPrecisionTime(startTime)}
                  onChange={e => setStartTime(parsePrecisionTime(e.target.value))}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center font-mono font-bold text-sm text-emerald-300"
                />
                <button
                  type="button"
                  onClick={() => adjustStartTime(0.1)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold font-mono transition-colors"
                >
                  +0.1s
                </button>
                <button
                  type="button"
                  onClick={() => adjustStartTime(1)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold font-mono transition-colors"
                >
                  +1.0s
                </button>
              </div>
            </div>

            <div className="bg-[#111420] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  {t('trim_end')}
                </label>
                <div className="text-xs font-mono text-white/50">{formatPrecisionTime(endTime)}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustEndTime(-1)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold font-mono transition-colors"
                >
                  -1.0s
                </button>
                <button
                  type="button"
                  onClick={() => adjustEndTime(-0.1)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold font-mono transition-colors"
                >
                  -0.1s
                </button>
                <input
                  type="text"
                  value={formatPrecisionTime(endTime)}
                  onChange={e => setEndTime(parsePrecisionTime(e.target.value))}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center font-mono font-bold text-sm text-red-300"
                />
                <button
                  type="button"
                  onClick={() => adjustEndTime(0.1)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold font-mono transition-colors"
                >
                  +0.1s
                </button>
                <button
                  type="button"
                  onClick={() => adjustEndTime(1)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold font-mono transition-colors"
                >
                  +1.0s
                </button>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/60 flex items-center gap-3">
            <Layers className="w-4 h-4 shrink-0 text-cyan-400" />
            <div>
              {isFlac ? (
                <span><strong>FLAC Lossless Audio Engine:</strong> Sample-accurate slicing with complete Vorbis metadata and embedded artwork preservation.</span>
              ) : isMp3 ? (
                <span><strong>MP3 Bitstream Audio Engine:</strong> Frame-accurate cutting with ID3v2.3 tag preservation.</span>
              ) : (
                <span><strong>Audio Engine:</strong> Direct audio trimming for {fileExt.toUpperCase()} format.</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex justify-between items-center bg-[#131622]">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-xl text-white/60 hover:text-white font-bold text-sm transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSaveTrim}
            disabled={isProcessing || selectionDuration <= 0}
            className="px-8 py-3 rounded-2xl text-white font-bold text-sm shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
            style={{ backgroundColor: accentColor }}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('trim_processing')}
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                {t('trim_save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioTrimmerModal;
