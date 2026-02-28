
import React, { useMemo } from 'react';
import { ThemeConfig } from '../types';

interface BackgroundProps {
  config: ThemeConfig;
}

const Background: React.FC<BackgroundProps> = React.memo(({ config }) => {
  // Optimization: Disable filter if blur is 0 OR glass is disabled.
  const mediaStyle = useMemo(() => {
    const isBlurred = config.enableGlass && config.blurLevel > 0;
    return {
      filter: isBlurred ? `blur(${config.blurLevel}px)` : 'none',
      transform: 'translate3d(0, 0, 0)',
      backfaceVisibility: 'hidden' as const,
      perspective: '1000px',
      willChange: 'transform',
    };
  }, [config.blurLevel, config.enableGlass]);

  const overlayStyle = useMemo(() => ({
    opacity: config.brightness
  }), [config.brightness]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none transform-gpu">
      {config.backgroundType === 'liquid' && config.enableGlass ? (
          <div className="liquid-bg relative w-full h-full overflow-hidden" style={mediaStyle}>
            <div className="blob w-[800px] h-[800px] rounded-full top-[-200px] left-[-200px] mix-blend-screen opacity-20 blur-[100px] animate-blob" style={{ backgroundColor: config.accentColor }}></div>
            <div className="blob bg-blue-600 w-[600px] h-[600px] rounded-full bottom-[-100px] right-[-100px] mix-blend-screen opacity-20 blur-[100px] animate-blob animation-delay-2000"></div>
            <div className="blob bg-purple-600 w-[700px] h-[700px] rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mix-blend-screen opacity-15 blur-[100px] animate-blob animation-delay-4000"></div>
          </div>
      ) : (config.backgroundType === 'image' || (config.backgroundType === 'liquid' && !config.enableGlass)) && config.backgroundSource ? (
          <img 
              src={config.backgroundSource} 
              className="w-full h-full object-cover transition-opacity duration-500"
              style={mediaStyle}
              alt="Background"
          />
      ) : config.backgroundType === 'video' && config.backgroundSource ? (
          <video 
              src={config.backgroundSource}
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover transition-opacity duration-500"
              style={mediaStyle}
          />
      ) : (
        <div className="bg-black w-full h-full" />
      )}
      
      {/* Brightness Overlay */}
      <div 
        className="absolute inset-0 bg-black transition-opacity duration-300" 
        style={overlayStyle}
      ></div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.config.backgroundType === nextProps.config.backgroundType &&
    prevProps.config.backgroundSource === nextProps.config.backgroundSource &&
    prevProps.config.blurLevel === nextProps.config.blurLevel &&
    prevProps.config.brightness === nextProps.config.brightness &&
    prevProps.config.accentColor === nextProps.config.accentColor &&
    prevProps.config.enableGlass === nextProps.config.enableGlass
  );
});

export default Background;
