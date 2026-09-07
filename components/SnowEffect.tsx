import React, { useEffect, useRef } from 'react';
import { ThemePreset } from '../types';

interface SnowEffectProps {
  themePreset?: ThemePreset;
  accentColor?: string;
}

const SnowEffect: React.FC<SnowEffectProps> = ({ themePreset, accentColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; vx: number }>({ x: 0, y: 0, vx: 0 });
  const lastMouseXRef = useRef<number>(0);

  const isAutumn = themePreset === 'autumn';
  const isWinter = !isAutumn;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastMouseXRef.current;
      lastMouseXRef.current = e.clientX;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.vx = deltaX * 0.05;
    };

    window.addEventListener('mousemove', handleMouseMove);

     
    const particleCount = isAutumn ? 45 : 120;
    
    interface SnowParticle {
      x: number;
      y: number;
      r: number;
      speedY: number;
      speedX: number;
      opacity: number;
      angle: number;
      spinSpeed: number;
      layer: number;  
      isCrystal: boolean;
    }

    interface LeafParticle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      rotation: number;
      rotationSpeed: number;
      flip: number;
      flipSpeed: number;
      color: string;
      wobble: number;
    }

    const leafColors = ['#e07a5f', '#f59e0b', '#d97706', '#dc2626', '#b45309', '#f97316'];

    const snowParticles: SnowParticle[] = Array.from({ length: particleCount }, () => {
      const layer = Math.random() < 0.2 ? 2 : Math.random() < 0.6 ? 1 : 0;
      const baseR = layer === 2 ? 4 + Math.random() * 5 : layer === 1 ? 2.5 + Math.random() * 3 : 1 + Math.random() * 2;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: baseR,
        speedY: (layer === 2 ? 1.8 + Math.random() * 2 : layer === 1 ? 0.9 + Math.random() * 1.2 : 0.4 + Math.random() * 0.6),
        speedX: (Math.random() - 0.5) * 0.5,
        opacity: layer === 2 ? 0.85 + Math.random() * 0.15 : layer === 1 ? 0.6 + Math.random() * 0.3 : 0.25 + Math.random() * 0.35,
        angle: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.03,
        layer,
        isCrystal: layer >= 1 && Math.random() > 0.45,
      };
    });

    const leafParticles: LeafParticle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 10 + Math.random() * 14,
      speedY: 0.8 + Math.random() * 1.5,
      speedX: (Math.random() - 0.5) * 0.8,
      opacity: 0.65 + Math.random() * 0.35,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      flip: Math.random() * Math.PI,
      flipSpeed: 0.02 + Math.random() * 0.03,
      color: leafColors[Math.floor(Math.random() * leafColors.length)],
      wobble: Math.random() * Math.PI * 2,
    }));

     
    const drawSnowflakeCrystal = (x: number, y: number, radius: number, angle: number, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = Math.max(0.8, radius * 0.15);
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = radius > 4 ? 6 : 2;

      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -radius);
        ctx.stroke();

        if (radius > 3.5) {
          const branchPos = radius * 0.55;
          const branchLen = radius * 0.35;
          ctx.beginPath();
          ctx.moveTo(0, -branchPos);
          ctx.lineTo(branchLen, -branchPos - branchLen);
          ctx.moveTo(0, -branchPos);
          ctx.lineTo(-branchLen, -branchPos - branchLen);
          ctx.stroke();
        }
        ctx.rotate((Math.PI * 2) / 6);
      }
      ctx.restore();
    };

    const drawSnowFlakeDot = (x: number, y: number, radius: number, opacity: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = radius > 3 ? `rgba(255, 255, 255, ${opacity})` : `rgba(230, 245, 255, ${opacity})`;
      if (radius > 3) {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 8;
      }
      ctx.fill();
      ctx.restore();
    };

    const drawMapleLeaf = (x: number, y: number, size: number, rotation: number, flipAngle: number, color: string, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const flipScale = Math.cos(flipAngle);
      ctx.scale(flipScale, 1);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;

      const s = size / 16;
      ctx.beginPath();
      ctx.moveTo(0 * s, 14 * s);
      ctx.lineTo(0 * s, 4 * s);
      ctx.lineTo(-4 * s, 6 * s);
      ctx.lineTo(-9 * s, 3 * s);
      ctx.lineTo(-6 * s, 0 * s);
      ctx.lineTo(-14 * s, -4 * s);
      ctx.lineTo(-7 * s, -6 * s);
      ctx.lineTo(-9 * s, -13 * s);
      ctx.lineTo(-3 * s, -9 * s);
      ctx.lineTo(0 * s, -16 * s);
      ctx.lineTo(3 * s, -9 * s);
      ctx.lineTo(9 * s, -13 * s);
      ctx.lineTo(7 * s, -6 * s);
      ctx.lineTo(14 * s, -4 * s);
      ctx.lineTo(6 * s, 0 * s);
      ctx.lineTo(9 * s, 3 * s);
      ctx.lineTo(4 * s, 6 * s);
      ctx.lineTo(0 * s, 4 * s);
      ctx.closePath();
      ctx.fill();

       
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 12 * s);
      ctx.lineTo(0, -12 * s);
      ctx.moveTo(0, 0);
      ctx.lineTo(-7 * s, -5 * s);
      ctx.moveTo(0, 0);
      ctx.lineTo(7 * s, -5 * s);
      ctx.stroke();

      ctx.restore();
    };

     
    const render = () => {
      ctx.clearRect(0, 0, width, height);

       
      mouseRef.current.vx *= 0.94;
      const windForce = mouseRef.current.vx;

      if (isWinter) {
        snowParticles.forEach((p) => {
          p.angle += p.spinSpeed;
          p.y += p.speedY;
          p.x += p.speedX + Math.sin(p.angle) * 0.6 + windForce;

           
          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          if (p.x > width + 20) p.x = -20;
          if (p.x < -20) p.x = width + 20;

          if (p.isCrystal) {
            drawSnowflakeCrystal(p.x, p.y, p.r, p.angle, p.opacity);
          } else {
            drawSnowFlakeDot(p.x, p.y, p.r, p.opacity);
          }
        });
      } else {
        leafParticles.forEach((p) => {
          p.wobble += 0.03;
          p.rotation += p.rotationSpeed;
          p.flip += p.flipSpeed;
          p.y += p.speedY;
          p.x += p.speedX + Math.sin(p.wobble) * 1.2 + windForce * 1.5;

          if (p.y > height + 30) {
            p.y = -30;
            p.x = Math.random() * width;
          }
          if (p.x > width + 30) p.x = -30;
          if (p.x < -30) p.x = width + 30;

          drawMapleLeaf(p.x, p.y, p.size, p.rotation, p.flip, p.color, p.opacity);
        });
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isAutumn, isWinter]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

       
      {isWinter && (
        <div className="absolute top-0 left-0 right-0 h-10 pointer-events-none z-[61] flex justify-between items-start px-2 overflow-hidden">
           
          <svg className="w-full h-10 absolute top-0 left-0" preserveAspectRatio="none" viewBox="0 0 1200 40">
            <path 
              d="M 0 4 Q 50 32 100 4 Q 150 32 200 4 Q 250 32 300 4 Q 350 32 400 4 Q 450 32 500 4 Q 550 32 600 4 Q 650 32 700 4 Q 750 32 800 4 Q 850 32 900 4 Q 950 32 1000 4 Q 1050 32 1100 4 Q 1150 32 1200 4" 
              fill="none" 
              stroke="rgba(255,255,255,0.2)" 
              strokeWidth="2" 
            />
          </svg>
          
           
          <div className="w-full flex justify-between items-center relative z-10 pt-1 px-4">
            {Array.from({ length: 24 }).map((_, i) => {
              const lightColors = ['#ff4d4d', '#ffd166', '#06d6a0', '#3b82f6', '#a855f7', '#ec4899'];
              const bulbColor = lightColors[i % lightColors.length];
              const animDelay = (i % 6) * 0.35;
              const isEven = i % 2 === 0;

              return (
                <div key={i} className={`relative flex flex-col items-center ${isEven ? 'translate-y-2' : 'translate-y-0.5'}`}>
                   
                  <div className="w-1.5 h-2 bg-gray-800/80 rounded-xs mb-0.5 border border-white/10" />
                   
                  <div 
                    className="w-3.5 h-4 rounded-full transition-all duration-700 animate-pulse"
                    style={{
                      backgroundColor: bulbColor,
                      boxShadow: `0 0 10px ${bulbColor}, 0 0 20px ${bulbColor}, inset 0 -2px 4px rgba(0,0,0,0.3)`,
                      animationDuration: `${1.4 + (i % 4) * 0.4}s`,
                      animationDelay: `${animDelay}s`,
                    }}
                  />
                </div>
              );
            })}
          </div>

           
          <div 
            className="absolute top-0 left-0 right-0 h-16 pointer-events-none" 
            style={{ 
              background: 'linear-gradient(to bottom, rgba(136, 192, 208, 0.12) 0%, rgba(136, 192, 208, 0.03) 60%, transparent 100%)' 
            }} 
          />
        </div>
      )}

       
      {isAutumn && (
        <div 
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-[61]" 
          style={{ 
            background: 'radial-gradient(ellipse at 50% 0%, rgba(224, 122, 95, 0.18) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 80%)' 
          }} 
        />
      )}
    </div>
  );
};

export default SnowEffect;
