
import React, { useMemo, useEffect, useRef } from 'react';
import { ThemeConfig } from '../types';

interface BackgroundProps {
  config: ThemeConfig;
  isLight?: boolean;
  analyser?: AnalyserNode | null;
  isPlaying?: boolean;
  profileBannerUrl?: string | null;
}

const Background: React.FC<BackgroundProps> = React.memo(({ config, isLight, analyser, isPlaying, profileBannerUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const effectiveBackgroundSource = config.backgroundSource || profileBannerUrl;
  const effectiveBackgroundType = config.backgroundSource ? config.backgroundType : (profileBannerUrl ? (profileBannerUrl.includes('video') || profileBannerUrl.endsWith('.mp4') || profileBannerUrl.endsWith('.webm') ? 'video' : 'image') : config.backgroundType);

  useEffect(() => {
    if (!config.animateBackground || !analyser || !isPlaying || effectiveBackgroundType !== 'liquid') {
      if (containerRef.current) {
        containerRef.current.style.transform = 'scale(1)';
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate bass intensity (first few bins)
      let bassSum = 0;
      const bassBins = 10;
      for (let i = 0; i < bassBins; i++) {
        bassSum += dataArray[i];
      }
      const bassAvg = bassSum / bassBins;
      const scale = 1 + (bassAvg / 255) * 0.15; // Max scale 1.15

      if (containerRef.current) {
        containerRef.current.style.transform = `scale(${scale})`;
      }

      animationRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (containerRef.current) containerRef.current.style.transform = 'scale(1)';
    };
  }, [analyser, isPlaying, config.animateBackground, effectiveBackgroundType, config.enableGlass]);
  // Optimization: Disable filter if blur is 0 OR glass is disabled.
  const mediaStyle = useMemo(() => {
    const isBlurred = config.enableGlass && config.blurLevel > 0 && effectiveBackgroundType !== 'liquid';
    return {
      filter: isBlurred ? `blur(${config.blurLevel}px)` : 'none',
      transform: 'translate3d(0, 0, 0)',
      backfaceVisibility: 'hidden' as const,
      perspective: '1000px',
      willChange: 'transform',
    };
  }, [config.blurLevel, config.enableGlass, effectiveBackgroundType]);

  const overlayStyle = useMemo(() => ({
    opacity: config.brightness
  }), [config.brightness]);

  const blendMode = isLight ? 'mix-blend-soft-light' : 'mix-blend-screen';

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none transform-gpu">
      {effectiveBackgroundType === 'liquid' ? (
          <div className="liquid-bg relative w-full h-full overflow-hidden bg-[var(--bg-main)]" style={mediaStyle}>
            <div ref={containerRef} className="w-full h-full absolute inset-0 transition-transform duration-75 ease-out">
              <div className={`blob w-[800px] h-[800px] rounded-full top-[-200px] left-[-200px] ${blendMode} opacity-20 blur-[100px] ${config.animateBackground ? 'animate-blob' : ''}`} style={{ backgroundColor: config.accentColor }}></div>
              <div className={`blob bg-blue-600 w-[600px] h-[600px] rounded-full bottom-[-100px] right-[-100px] ${blendMode} opacity-20 blur-[100px] ${config.animateBackground ? 'animate-blob animation-delay-2000' : ''}`}></div>
              <div className={`blob bg-purple-600 w-[700px] h-[700px] rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${blendMode} opacity-15 blur-[100px] ${config.animateBackground ? 'animate-blob animation-delay-4000' : ''}`}></div>
            </div>
          </div>
      ) : effectiveBackgroundType === 'image' && effectiveBackgroundSource ? (
          <img 
              key={effectiveBackgroundSource}
              src={effectiveBackgroundSource} 
              className="w-full h-full object-cover transition-opacity duration-500"
              style={mediaStyle}
              alt="Background"
          />
      ) : effectiveBackgroundType === 'video' && effectiveBackgroundSource ? (
          <video 
              key={effectiveBackgroundSource}
              src={effectiveBackgroundSource}
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover transition-opacity duration-500"
              style={mediaStyle}
          />
      ) : (
        <div className="bg-[var(--bg-main)] w-full h-full" />
      )}
      
      {/* Brightness Overlay */}
      <div 
        className="absolute inset-0 bg-black transition-opacity duration-300 pointer-events-none" 
        style={overlayStyle}
      ></div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.config.backgroundType === nextProps.config.backgroundType &&
    prevProps.config.backgroundSource === nextProps.config.backgroundSource &&
    prevProps.profileBannerUrl === nextProps.profileBannerUrl &&
    prevProps.config.blurLevel === nextProps.config.blurLevel &&
    prevProps.config.brightness === nextProps.config.brightness &&
    prevProps.config.accentColor === nextProps.config.accentColor &&
    prevProps.config.enableGlass === nextProps.config.enableGlass &&
    prevProps.config.animateBackground === nextProps.config.animateBackground &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.analyser === nextProps.analyser
  );
});

export default Background;
