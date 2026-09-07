
import React, { useEffect, useRef, useMemo } from 'react';
import { LyricLine } from '../types';
import { parseLrc } from '../utils';
import { RefreshCw, Sparkles } from './Icons';

interface LyricsViewProps {
  lyricsRaw?: string;
  currentTime: number;
  onSeek?: (time: number) => void;
  onRefetchLyrics?: () => void;
  isRefetching?: boolean;
}

const LyricsView: React.FC<LyricsViewProps> = ({ lyricsRaw, currentTime, onSeek, onRefetchLyrics, isRefetching }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const lines = useMemo(() => {
    if (!lyricsRaw) return [];
    let parsed = parseLrc(lyricsRaw);
    if (parsed.length === 0 || parsed[0].time === -1) return parsed;

    const firstTextLineIndex = parsed.findIndex(l => l.text.trim().length > 0);
    if (firstTextLineIndex !== -1) {
       const firstTime = parsed[firstTextLineIndex].time;
       const countdownLines: any[] = [];
       
       if (firstTime >= 1) countdownLines.push({ time: firstTime - 1, text: '• 1 •', isCountdown: true });
       if (firstTime >= 2) countdownLines.unshift({ time: firstTime - 2, text: '• 2 •', isCountdown: true });
       if (firstTime >= 3) countdownLines.unshift({ time: firstTime - 3, text: '• 3 •', isCountdown: true });
       
       if (countdownLines.length > 0) {
          const before = parsed.slice(0, firstTextLineIndex);
          const minCountdownTime = countdownLines[0].time;
          const filteredBefore = before.filter(l => l.time < minCountdownTime || l.time > firstTime);
          const after = parsed.slice(firstTextLineIndex);
          parsed = [...filteredBefore, ...countdownLines, ...after];
          parsed.sort((a, b) => a.time - b.time);
       }
    }

    return parsed;
  }, [lyricsRaw]);

   
  const isPlainText = lines.length > 0 && lines[0].time === -1;

   
  const activeIndex = useMemo(() => {
      if (isPlainText || lines.length === 0) return -1;
      for (let i = lines.length - 1; i >= 0; i--) {
          if (currentTime >= lines[i].time) {
              return i;
          }
      }
      return -1;
  }, [lines, currentTime, isPlainText]);

  const activeLineRef = useRef<HTMLDivElement>(null);

   
  useEffect(() => {
    if (!isPlainText && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isPlainText]);

  if (!lyricsRaw || lines.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/40 animate-fade-in p-6 text-center">
         <p className="text-3xl md:text-4xl font-black tracking-tight mb-3 text-white/80">Текст не найден</p>
         <p className="text-xs font-bold uppercase tracking-widest opacity-60 text-center max-w-md leading-relaxed mb-6">
            Загрузи текст из сети через LRCLIB или добавь его вручную в параметрах трека.
         </p>
         {onRefetchLyrics && (
           <button 
             onClick={onRefetchLyrics}
             disabled={isRefetching}
             className="px-6 py-3 bg-white/10 hover:bg-white text-white hover:text-black rounded-full font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 border border-white/20 shadow-xl disabled:opacity-50 cursor-pointer"
           >
             <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
             <span>{isRefetching ? 'Поиск в LRCLIB...' : 'Загрузить из LRCLIB'}</span>
           </button>
         )}
      </div>
    );
  }

   
  if (isPlainText) {
      return (
        <div className="w-full h-full overflow-hidden relative group">
            {onRefetchLyrics && (
              <button 
                onClick={onRefetchLyrics}
                disabled={isRefetching}
                title="Обновить текст из LRCLIB"
                className="absolute top-4 right-4 z-20 px-4 py-2 bg-black/40 hover:bg-white text-white/70 hover:text-black rounded-full text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-white/10 backdrop-blur-md cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                <span>{isRefetching ? 'Обновление...' : 'LRCLIB'}</span>
              </button>
            )}
            <div className="w-full h-full overflow-y-auto px-10 py-24 space-y-8">
                {lines.map((line, index) => (
                    <p 
                        key={index} 
                        className="text-3xl md:text-5xl font-black text-white/90 leading-tight text-center hover:text-white transition-all hover:scale-105 cursor-default tracking-tighter"
                    >
                        {line.text}
                    </p>
                ))}
            </div>
        </div>
      );
  }

   
  return (
    <div className="w-full h-full overflow-hidden relative">
      {onRefetchLyrics && (
        <button 
          onClick={onRefetchLyrics}
          disabled={isRefetching}
          title="Обновить текст из LRCLIB"
          className="absolute top-4 right-4 z-20 px-4 py-2 bg-black/40 hover:bg-white text-white/70 hover:text-black rounded-full text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-white/10 backdrop-blur-md cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          <span>{isRefetching ? 'Обновление...' : 'LRCLIB'}</span>
        </button>
      )}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-y-auto px-4 lg:px-0 py-[50vh] space-y-10 scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {lines.map((line, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          const distance = Math.abs(index - activeIndex);
          
           
          let blur = 0;
          let scale = 1;
          let opacity = 1;
          
          const isCountdown = (line as any).isCountdown;

          if (isActive) {
            scale = isCountdown ? 1.3 : 1.05;
            opacity = 1;
          } else if (isPast) {
            scale = 0.98;
            opacity = Math.max(0.15, 0.4 - distance * 0.08);
          } else {
            scale = 0.98;
            opacity = Math.max(0.15, 0.6 - distance * 0.1);
          }

          return (
            <div
              key={index}
              ref={isActive ? activeLineRef : null}
              onClick={() => !isPlainText && onSeek && onSeek(line.time)}
              className="transition-all duration-500 ease-out origin-left cursor-pointer group"
              style={{
                transform: `scale(${scale})`,
                opacity: opacity,
              }}
            >
              <p 
                className={`text-3xl md:text-5xl lg:text-6xl leading-[1.2] font-black transition-colors duration-500 
                ${isCountdown ? 'tracking-[0.5em] font-mono' : 'tracking-tight'} 
                ${isActive 
                    ? (isCountdown ? 'text-[var(--accent-color)] drop-shadow-[0_0_20px_var(--accent-color)]' : 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]') 
                    : 'text-white/30 group-hover:text-white/60'}
              `}>
                {line.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LyricsView;
