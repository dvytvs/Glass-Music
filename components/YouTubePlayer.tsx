
import React, { useEffect, useRef } from 'react';

interface YouTubePlayerProps {
  videoId: string | null;
  isPlaying: boolean;
  volume: number;
  onReady: (player: any) => void;
  onStateChange: (state: number) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  visible: boolean;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  isPlaying,
  volume,
  onReady,
  onStateChange,
  onTimeUpdate,
  onDurationChange,
  visible
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  const initPlayer = () => {
    if (!containerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '200',
      width: '200',
      videoId: videoId || '',
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(volume * 100);
          onReady(event.target);
        },
        onStateChange: (event: any) => {
          onStateChange(event.data);
          
          if (event.data === window.YT.PlayerState.PLAYING) {
            startTrackingTime();
            onDurationChange(event.target.getDuration());
          } else {
            stopTrackingTime();
          }
        },
      },
    });
  };

  const startTrackingTime = () => {
    if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);
    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        onTimeUpdate(playerRef.current.getCurrentTime());
      }
    }, 500);
  };

  const stopTrackingTime = () => {
    if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);
  };

  useEffect(() => {
    if (playerRef.current && playerRef.current.loadVideoById && videoId) {
      playerRef.current.loadVideoById(videoId);
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [videoId]);

  useEffect(() => {
    if (playerRef.current && playerRef.current.playVideo && playerRef.current.pauseVideo) {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(volume * 100);
    }
  }, [volume]);

  return (
    <div 
      className={`fixed bottom-24 right-6 z-[60] transition-all duration-500 rounded-2xl overflow-hidden shadow-2xl border border-white/10 ${
        visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'
      }`}
      style={{ width: '200px', height: '200px' }}
    >
      <div ref={containerRef}></div>
    </div>
  );
};

export default YouTubePlayer;
