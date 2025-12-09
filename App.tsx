
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MainView from './components/MainView';
import PlayerControls from './components/PlayerControls';
import FullScreenPlayer from './components/FullScreenPlayer';
import { Track, PlaybackState, PlayerState, ViewType } from './types';
import { generateMockCover, parseFileMetadata } from './utils';

const STORAGE_KEY = 'glass_music_library_v1';

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<ViewType>('songs');
  const [isLoaded, setIsLoaded] = useState(false);

  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    playbackState: PlaybackState.PAUSED,
    volume: 0.8,
    currentTime: 0,
    duration: 0,
    isShuffled: false,
    isRepeating: false,
    currentView: 'songs',
  });

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence Logic ---

  // Load from storage on startup
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedTracks: Track[] = JSON.parse(savedData);
        // Reconstruct fileUrl from path if available (Electron)
        const restoredTracks = parsedTracks.map(track => ({
          ...track,
          // If we have a real path (Electron), use file:// protocol. 
          // If it was a web blob, it's lost, but we're targeting Electron primarily now.
          fileUrl: track.path ? `file://${track.path}` : '' 
        }));
        
        // Filter out tracks that have no valid URL mechanism
        const validTracks = restoredTracks.filter(t => t.fileUrl || t.path);
        setTracks(validTracks);
      }
    } catch (e) {
      console.error("Failed to load library", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to storage on changes
  useEffect(() => {
    if (!isLoaded) return;
    
    // We create a "storable" version of tracks. 
    // We do NOT store the blob `fileUrl` as it expires. We rely on `path`.
    // We DO store `coverUrl` (base64) but strictly it can be heavy. 
    const tracksToSave = tracks.map(t => ({
      ...t,
      fileUrl: '' // Clear blob url for storage
    }));
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tracksToSave));
    } catch (e) {
      console.error("Storage quota exceeded or error saving library", e);
    }
  }, [tracks, isLoaded]);


  // Initialize Audio Events
  useEffect(() => {
    const audio = audioRef.current;
    
    const updateTime = () => {
      setPlayerState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const updateDuration = () => {
       setPlayerState(prev => ({ ...prev, duration: audio.duration }));
    };
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);

  // Handle auto-advance
  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => {
      nextTrackRef.current();
    };
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []); // Run once, depend on Ref

  // Update title
  useEffect(() => {
    if (playerState.currentTrack) {
      document.title = `${playerState.currentTrack.title} • ${playerState.currentTrack.artist}`;
    } else {
      document.title = "GlassMusic";
    }
  }, [playerState.currentTrack]);

  const handlePlay = useCallback(async (track: Track) => {
    if (!track.fileUrl && !track.path) {
        alert("Файл не найден. Возможно, он был перемещен или удален.");
        return;
    }

    // Determine Source
    let src = track.fileUrl;
    if (!src && track.path) {
        src = `file://${track.path}`;
    }

    if (playerState.currentTrack?.id === track.id) {
      if (playerState.playbackState === PlaybackState.PLAYING) {
        audioRef.current.pause();
        setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PAUSED }));
      } else {
        await audioRef.current.play();
        setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PLAYING }));
      }
    } else {
      audioRef.current.src = src;
      audioRef.current.volume = playerState.volume;
      try {
        await audioRef.current.play();
        setPlayerState(prev => ({ 
          ...prev, 
          currentTrack: track, 
          playbackState: PlaybackState.PLAYING 
        }));
      } catch (err) {
        console.error("Playback error:", err);
      }
    }
  }, [playerState.currentTrack, playerState.playbackState, playerState.volume]);

  const handleNext = useCallback(() => {
    if (!playerState.currentTrack || tracks.length === 0) return;
    
    let nextIndex = 0;
    const currentIndex = tracks.findIndex(t => t.id === playerState.currentTrack?.id);

    if (playerState.isShuffled) {
      // Pick random index different from current
      do {
        nextIndex = Math.floor(Math.random() * tracks.length);
      } while (tracks.length > 1 && nextIndex === currentIndex);
    } else {
      nextIndex = (currentIndex + 1) % tracks.length;
    }

    handlePlay(tracks[nextIndex]);
  }, [playerState.currentTrack, tracks, playerState.isShuffled, handlePlay]);

  // Keep a ref to handleNext for the event listener to avoid stale closures
  const nextTrackRef = useRef(handleNext);
  useEffect(() => { nextTrackRef.current = handleNext; }, [handleNext]);

  const handlePrev = useCallback(() => {
     if (!playerState.currentTrack || tracks.length === 0) return;
     const audio = audioRef.current;
     if (audio.currentTime > 3) {
       audio.currentTime = 0;
       return;
     }
    const currentIndex = tracks.findIndex(t => t.id === playerState.currentTrack?.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    handlePlay(tracks[prevIndex]);
  }, [playerState.currentTrack, tracks, handlePlay]);

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setPlayerState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const handleVolume = (vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setPlayerState(prev => ({ ...prev, volume: vol }));
    }
  };

  const toggleShuffle = () => {
    setPlayerState(prev => ({ ...prev, isShuffled: !prev.isShuffled }));
  };

  const handleUpdateTrack = (id: string, data: Partial<Track>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    // Also update current track if it's the one being edited
    if (playerState.currentTrack?.id === id) {
        setPlayerState(prev => ({
            ...prev,
            currentTrack: { ...prev.currentTrack!, ...data }
        }));
    }
  };

  const handleToggleLike = (id: string) => {
      const track = tracks.find(t => t.id === id);
      if (track) {
          handleUpdateTrack(id, { isLiked: !track.isLiked });
      }
  };

  const handleDeleteTrack = (id: string) => {
      // Stop playing if deleting current track
      if (playerState.currentTrack?.id === id) {
          audioRef.current.pause();
          setPlayerState(prev => ({ ...prev, currentTrack: null, playbackState: PlaybackState.PAUSED }));
      }
      setTracks(prev => prev.filter(t => t.id !== id));
  };

  const handleGoToArtist = (artist: string) => {
      setPreviousView(playerState.currentView);
      setSelectedArtist(artist);
      setPlayerState(prev => ({ ...prev, currentView: 'artist_detail' }));
  };

  const handleGoToAlbum = (album: string) => {
      setPreviousView(playerState.currentView);
      setSelectedAlbum(album);
      setPlayerState(prev => ({ ...prev, currentView: 'album_detail' }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileList = Array.from(files) as File[];
    const audioFiles = fileList.filter(file => file.type.startsWith('audio/'));
    
    const newTracks: Track[] = [];

    // Process files one by one to extract metadata
    for (const file of audioFiles) {
        const id = Math.random().toString(36).substr(2, 9);
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        
        // Attempt to extract real metadata
        const metadata = await parseFileMetadata(file);

        // Capture real path for Electron persistence
        const realPath = (file as any).path; 

        newTracks.push({
          id,
          title: metadata.title || fileName,
          artist: metadata.artist || "Неизвестный артист",
          album: metadata.album || "Локальный импорт",
          duration: 0,
          coverUrl: metadata.coverUrl || generateMockCover(fileName),
          fileUrl: URL.createObjectURL(file), // For immediate session playback
          path: realPath, // For stored playback after restart
          isLiked: false,
          year: new Date().getFullYear().toString()
        });
    }

    setTracks(prev => [...prev, ...newTracks]);
  };

  return (
    <div className="relative w-full h-screen flex overflow-hidden bg-black text-white selection:bg-pink-500 selection:text-white">
      {/* Dynamic Backgrounds */}
      <div className="liquid-bg">
        <div className="blob bg-purple-600 w-96 h-96 rounded-full top-0 left-0 mix-blend-screen opacity-40"></div>
        <div className="blob bg-blue-600 w-96 h-96 rounded-full bottom-0 right-0 mix-blend-screen opacity-40 animation-delay-2000"></div>
        <div className="blob bg-pink-600 w-80 h-80 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mix-blend-screen opacity-30 animation-delay-4000"></div>
      </div>

      <Sidebar 
        onImportClick={() => fileInputRef.current?.click()} 
        currentView={playerState.currentView}
        onChangeView={(view) => {
            setPlayerState(prev => ({ ...prev, currentView: view }));
            setSidebarOpen(true);
        }}
        isOpen={sidebarOpen}
      />
      
      <div className={`flex-1 flex flex-col relative z-10 glass-panel border-y-0 border-r-0 rounded-l-3xl overflow-hidden shadow-2xl transition-all ${!sidebarOpen ? 'ml-0 rounded-l-none' : 'ml-2'}`}>
        <MainView 
          tracks={tracks} 
          currentTrack={playerState.currentTrack}
          playbackState={playerState.playbackState}
          onPlay={handlePlay}
          onShuffleAll={() => {
            setPlayerState(prev => ({ ...prev, isShuffled: true }));
            handleNext();
          }}
          currentView={playerState.currentView}
          selectedArtist={selectedArtist}
          selectedAlbum={selectedAlbum}
          onUpdateTrack={handleUpdateTrack}
          onDeleteTrack={handleDeleteTrack}
          onGoToArtist={handleGoToArtist}
          onGoToAlbum={handleGoToAlbum}
          onBack={() => setPlayerState(prev => ({ ...prev, currentView: previousView }))}
        />
        
        <PlayerControls 
          currentTrack={playerState.currentTrack}
          playbackState={playerState.playbackState}
          onPlayPause={() => playerState.currentTrack && handlePlay(playerState.currentTrack)}
          onNext={handleNext}
          onPrev={handlePrev}
          currentTime={playerState.currentTime}
          duration={playerState.duration}
          onSeek={handleSeek}
          volume={playerState.volume}
          onVolumeChange={handleVolume}
          isShuffled={playerState.isShuffled}
          onToggleShuffle={toggleShuffle}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleFullScreen={() => setIsFullScreen(true)}
          onToggleLike={handleToggleLike}
        />
      </div>

      {/* Full Screen Player Overlay */}
      {isFullScreen && playerState.currentTrack && (
        <FullScreenPlayer 
            track={playerState.currentTrack}
            playbackState={playerState.playbackState}
            currentTime={playerState.currentTime}
            duration={playerState.duration}
            volume={playerState.volume}
            isShuffled={playerState.isShuffled}
            onPlayPause={() => handlePlay(playerState.currentTrack!)}
            onNext={handleNext}
            onPrev={handlePrev}
            onSeek={handleSeek}
            onVolumeChange={handleVolume}
            onToggleShuffle={toggleShuffle}
            onToggleLike={handleToggleLike}
            onClose={() => setIsFullScreen(false)}
        />
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
        multiple 
        accept="audio/*"
      />
    </div>
  );
};

export default App;