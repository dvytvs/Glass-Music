import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  accentColor: string;
  enabled?: boolean;
}

const Visualizer: React.FC<VisualizerProps> = React.memo(({ analyser, isPlaying, accentColor, enabled = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (!analyser || !canvasRef.current || !enabled || !isPlaying) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = Math.min(analyser.frequencyBinCount, 64);
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying || !enabled) return;
      requestRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, `${accentColor}00`);
      gradient.addColorStop(1, `${accentColor}50`);
      ctx.fillStyle = gradient;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.4;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    requestRef.current = requestAnimationFrame(draw);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, isPlaying, accentColor, enabled]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-500 ${enabled && isPlaying ? 'opacity-40' : 'opacity-0'}`}
    />
  );
});

export default Visualizer;

