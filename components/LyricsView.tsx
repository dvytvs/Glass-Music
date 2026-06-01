
import React, { useEffect, useRef, useMemo } from 'react';
import { LyricLine } from '../types';
import { parseLrc } from '../utils';

interface LyricsViewProps {
  lyricsRaw?: string;
  currentTime: number;
}

const LyricsView: React.FC<LyricsViewProps> = ({ lyricsRaw, currentTime }) => {
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

  // Check if it's plain text mode (time is -1)
  const isPlainText = lines.length > 0 && lines[0].time === -1;

  // Find active line (only for synced)
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

  // Auto-scroll logic (only for synced)
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
      <div className="w-full h-full flex flex-col items-center justify-center text-white/20 animate-fade-in">
         <p className="text-4xl font-black tracking-tighter mb-4">Текст не найден</p>
         <p className="text-sm font-bold uppercase tracking-widest opacity-50 text-center px-8 leading-loose">
            Добавь текст в режиме редактирования трека. <br/>Поддерживается обычный текст и LRC.
         </p>
      </div>
    );
  }

  // --- Plain Text View (Static Scroll) ---
  if (isPlainText) {
      return (
        <div className="w-full h-full overflow-hidden relative">
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

  // --- Synced View (LRC) ---
  return (
    <div className="w-full h-full overflow-hidden relative">
      <div 
        ref={containerRef}
        className="w-full h-full overflow-y-auto px-8 py-[45vh] text-center space-y-12 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {lines.map((line, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          const distance = Math.abs(index - activeIndex);
          
          // Cinematic karaoke style
          let blur = 0;
          let scale = 1;
          let opacity = 1;
          
          const isCountdown = (line as any).isCountdown;

          if (isActive) {
            scale = isCountdown ? 1.4 : 1.15;
            opacity = 1;
            blur = 0;
          } else if (isPast) {
            scale = 0.95;
            opacity = Math.max(0.1, 0.5 - distance * 0.1);
            blur = Math.min(distance * 1.5, 8);
          } else {
            scale = 0.95;
            opacity = Math.max(0.1, 0.7 - distance * 0.15);
            blur = Math.min(distance * 1, 4);
          }

          return (
            <div
              key={index}
              ref={isActive ? activeLineRef : null}
              className="transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] origin-center"
              style={{
                transform: `scale(${scale})`,
                opacity: opacity,
                filter: `blur(${blur}px)`,
              }}
            >
              <p 
                className={`text-4xl md:text-6xl lg:text-7xl leading-tight cursor-pointer font-black transition-colors duration-700 
                ${isCountdown ? 'tracking-[0.5em] font-mono' : 'tracking-tighter'} 
                ${isActive 
                    ? (isCountdown ? 'text-[var(--accent-color)] drop-shadow-[0_0_40px_var(--accent-color)]' : 'text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.6)]') 
                    : (isCountdown ? 'text-[var(--accent-color)] opacity-50' : 'text-white/40')}
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