import React, { useEffect, useRef, useMemo } from 'react';
import { LyricLine } from '../types';
import { parseLrc } from '../utils';
import { RefreshCw } from './Icons';

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
            <div className="w-full h-full overflow-y-auto px-6 md:px-12 py-24 space-y-8">
                {lines.map((line, index) => (
                    <p 
                        key={index} 
                        className="text-2xl md:text-4xl font-black text-white/80 leading-relaxed text-left hover:text-white transition-all cursor-default tracking-tight"
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
        className="w-full h-full overflow-y-auto px-4 md:px-8 py-[42vh] space-y-10 scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {lines.map((line, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          const distance = Math.abs(index - activeIndex);
          const isCountdown = (line as any).isCountdown;

          let scale = 1;
          let opacity = 1;
          if (isActive) {
            scale = isCountdown ? 1.25 : 1.04;
            opacity = 1;
          } else if (isPast) {
            scale = 0.98;
            opacity = Math.max(0.18, 0.45 - distance * 0.08);
          } else {
            scale = 0.98;
            opacity = Math.max(0.2, 0.55 - distance * 0.1);
          }

          const nextLine = lines[index + 1];
          const lineDuration = nextLine && nextLine.time > line.time ? Math.min(8, Math.max(1.2, nextLine.time - line.time)) : 4;
          const lineProgress = isActive ? Math.min(1, Math.max(0, (currentTime - line.time) / lineDuration)) : (isPast ? 1 : 0);

          const rawWords = line.text.split(/(\s+)/);

          return (
            <div
              key={index}
              ref={isActive ? activeLineRef : null}
              onClick={() => onSeek && onSeek(line.time)}
              className="transition-all duration-500 ease-out origin-left cursor-pointer group"
              style={{
                transform: `scale(${scale})`,
                opacity: opacity
              }}
            >
              {isCountdown ? (
                <p className="text-4xl md:text-6xl font-black font-mono tracking-[0.5em] text-[var(--accent-color)] drop-shadow-[0_0_25px_var(--accent-color)]">
                  {line.text}
                </p>
              ) : (
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.25] font-black tracking-tight text-left select-none">
                  {rawWords.map((part, wIdx) => {
                    const isWhitespace = /^\s+$/.test(part);
                    if (isWhitespace) {
                      return <span key={wIdx}>{part}</span>;
                    }

                    const wordCount = Math.max(1, line.text.trim().split(/\s+/).length);
                    const wordRealIdx = line.text.slice(0, line.text.indexOf(part) + part.length).trim().split(/\s+/).length - 1;
                    const wordStart = wordRealIdx / wordCount;
                    const wordEnd = (wordRealIdx + 1) / wordCount;

                    const isWordActive = isActive && lineProgress >= wordStart && lineProgress < wordEnd;
                    const isWordPassed = (isActive && lineProgress >= wordEnd) || isPast;

                    return (
                      <span
                        key={wIdx}
                        className={`inline-block transition-all duration-300 ${
                          isWordActive
                            ? 'text-white scale-105 drop-shadow-[0_0_24px_rgba(255,255,255,0.95)] font-black'
                            : isWordPassed
                            ? 'text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                            : isActive
                            ? 'text-white/35 font-bold'
                            : 'text-white/30 group-hover:text-white/60'
                        }`}
                      >
                        {part}
                      </span>
                    );
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LyricsView;
