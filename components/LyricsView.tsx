
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
    return parseLrc(lyricsRaw);
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

  // Auto-scroll logic (only for synced)
  useEffect(() => {
    if (!isPlainText && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isPlainText]);

  const activeLineRef = useRef<HTMLDivElement>(null);

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
            <div className="w-full h-full overflow-y-auto custom-scrollbar px-10 py-24 space-y-8">
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
        className="w-full h-full overflow-y-auto custom-scrollbar px-8 py-[45vh] text-center space-y-12"
      >
        {lines.map((line, index) => {
          const isActive = index === activeIndex;
          const distance = Math.abs(index - activeIndex);
          const blur = isActive ? 0 : Math.min(distance * 2, 10);
          const scale = isActive ? 1.15 : 1;
          const opacity = isActive ? 1 : Math.max(0.1, 1 - distance * 0.25);

          return (
            <div
              key={index}
              ref={isActive ? activeLineRef : null}
              className="transition-all duration-700 ease-out origin-center"
              style={{
                transform: `scale(${scale})`,
                opacity: opacity,
                filter: `blur(${blur}px)`,
              }}
            >
              <p className={`text-4xl md:text-6xl leading-tight cursor-pointer tracking-tighter font-black ${isActive ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]' : 'text-white/40'}`}>
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