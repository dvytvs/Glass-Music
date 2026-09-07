
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

  const effectiveBackgroundType = config.backgroundType;
  const effectiveBackgroundSource = config.backgroundType === 'liquid' ? null : (config.backgroundSource || profileBannerUrl);

  useEffect(() => {
    if (!config.animateBackground || !analyser || !isPlaying || effectiveBackgroundType !== 'liquid') {
      if (containerRef.current) {
        containerRef.current.style.transform = 'scale(1)';
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const dataArray = new Uint8Array(16);
    
    const update = () => {
      if (!isPlaying || !config.animateBackground) return;
      animationRef.current = requestAnimationFrame(update);

      analyser.getByteFrequencyData(dataArray);
      
      let bassSum = 0;
      const bassBins = 6;
      for (let i = 0; i < bassBins; i++) {
        bassSum += dataArray[i];
      }
      const bassAvg = bassSum / bassBins;
      const scale = 1 + (bassAvg / 255) * 0.08;

      if (containerRef.current) {
        containerRef.current.style.transform = `scale3d(${scale}, ${scale}, 1)`;
      }
    };

    animationRef.current = requestAnimationFrame(update);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (containerRef.current) containerRef.current.style.transform = 'scale(1)';
    };
  }, [analyser, isPlaying, config.animateBackground, effectiveBackgroundType]);
   
  const mediaStyle = useMemo(() => {
     
    const isBlurred = config.enableGlass && config.blurLevel > 0 && effectiveBackgroundType === 'image';
    return {
      filter: isBlurred ? `blur(${Math.min(config.blurLevel, 20)}px)` : undefined,
      transform: 'translate3d(0, 0, 0)',
      willChange: 'transform',
      backfaceVisibility: 'hidden' as const,
    };
  }, [config.blurLevel, config.enableGlass, effectiveBackgroundType]);

  const overlayStyle = useMemo(() => ({
    opacity: config.brightness
  }), [config.brightness]);

  const blendMode = isLight ? 'mix-blend-normal' : 'mix-blend-normal';

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none transform-gpu" style={{ contain: 'strict', isolation: 'isolate', transform: 'translate3d(0,0,0)' }}>
      {effectiveBackgroundType === 'liquid' ? (
          <div className=" relative w-full h-full overflow-hidden bg-[var(--bg-main)]">
            <div ref={containerRef} className="w-full h-full absolute inset-0 transition-transform duration-75 ease-out">
              <div className={`absolute w-[1000px] h-[1000px] top-[-250px] left-[-250px] ${blendMode} opacity-10 ${config.animateBackground ? '' : ''}`} style={{ background: `radial-gradient(circle, ${config.accentColor} 0%, transparent 60%)` }}></div>
              <div className={`absolute w-[800px] h-[800px] bottom-[-150px] right-[-150px] ${blendMode} opacity-10 ${config.animateBackground ? ' ' : ''}`} style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 60%)' }}></div>
              <div className={`absolute w-[900px] h-[900px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${blendMode} opacity-10 ${config.animateBackground ? ' ' : ''}`} style={{ background: 'radial-gradient(circle, #9333ea 0%, transparent 60%)' }}></div>
            </div>
          </div>
      ) : effectiveBackgroundType === 'image' && effectiveBackgroundSource ? (
          <img 
              key={effectiveBackgroundSource}
              src={effectiveBackgroundSource} 
              className="w-full h-full object-cover"
              style={mediaStyle}
              alt="Background"
              loading="eager"
              decoding="async"
          />
      ) : effectiveBackgroundType === 'video' && effectiveBackgroundSource ? (
          <video 
              key={effectiveBackgroundSource}
              src={effectiveBackgroundSource} 
              autoPlay 
              loop 
              muted 
              playsInline
              preload="auto"
              disablePictureInPicture
              className="w-full h-full object-cover"
              style={{
                transform: 'translate3d(0, 0, 0)',
                backfaceVisibility: 'hidden',
                willChange: 'transform'
              }}
          />
      ) : (
        <div className="bg-[var(--bg-main)] w-full h-full" />
      )}
      
       
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
