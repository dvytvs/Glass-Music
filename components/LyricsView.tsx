
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
      <div className="w-full h-full flex flex-col items-center justify-center text-white/50 animate-fade-in-view">
         <p className="text-2xl font-bold mb-2">Текст отсутствует</p>
         <p className="text-sm text-center px-4">Добавьте текст в режиме редактирования трека. <br/>Поддерживается как обычный текст, так и LRC.</p>
      </div>
    );
  }

  // --- Plain Text View (Static Scroll) ---
  if (isPlainText) {
      return (
        <div className="w-full h-full overflow-hidden relative mask-image-gradient">
            <div className="w-full h-full overflow-y-auto custom-scrollbar px-6 py-12 space-y-4">
                {lines.map((line, index) => (
                    <p 
                        key={index} 
                        className="text-xl md:text-2xl font-medium text-white/90 leading-relaxed text-center hover:text-white transition-colors"
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
    <div className="w-full h-full overflow-hidden relative mask-image-gradient">
      <div 
        ref={containerRef}
        className="w-full h-full overflow-y-auto custom-scrollbar px-4 py-[50vh] text-center space-y-8"
      >
        {lines.map((line, index) => {
          const isActive = index === activeIndex;
          // Calculate closeness for blur effect
          const distance = Math.abs(index - activeIndex);
          const blur = isActive ? 0 : Math.min(distance * 1.5, 6);
          const scale = isActive ? 1.1 : 1;
          const opacity = isActive ? 1 : Math.max(0.3, 1 - distance * 0.2);

          return (
            <div
              key={index}
              ref={isActive ? activeLineRef : null}
              className="transition-all duration-500 ease-out origin-center"
              style={{
                transform: `scale(${scale})`,
                opacity: opacity,
                filter: `blur(${blur}px)`,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <p className="text-2xl md:text-4xl leading-relaxed cursor-pointer hover:opacity-80">
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