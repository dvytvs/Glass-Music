
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MainView from './components/MainView';
import PlayerControls from './components/PlayerControls';
import FullScreenPlayer from './components/FullScreenPlayer';
import SettingsModal from './components/SettingsModal';
import { Track, PlaybackState, PlayerState, ViewType, ThemeConfig, ArtistMetadata } from './types';
import { generateMockCover, parseFileMetadata } from './utils';

const STORAGE_KEY = 'glass_music_library_v1';
const THEME_KEY = 'glass_music_theme_v1';
const ARTIST_DATA_KEY = 'glass_music_artists_v1';

const DEFAULT_THEME: ThemeConfig = {
  accentColor: '#db2777', // Pink-600
  backgroundType: 'liquid',
  backgroundSource: null,
  blurLevel: 0,
  brightness: 0.4
};

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artistMetadata, setArtistMetadata] = useState<Record<string, ArtistMetadata>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<ViewType>('songs');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Customization State
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);

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

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      const savedTheme = localStorage.getItem(THEME_KEY);
      const savedArtists = localStorage.getItem(ARTIST_DATA_KEY);
      
      if (savedData) {
        const parsedTracks: Track[] = JSON.parse(savedData);
        const restoredTracks = parsedTracks.map(track => {
            if (track.path && !track.fileUrl) {
                return { ...track, fileUrl: `file://${track.path}` };
            }
            return track;
        });
        const validTracks = restoredTracks.filter(t => t.fileUrl || t.path);
        setTracks(validTracks);
      }

      if (savedTheme) {
        setTheme(JSON.parse(savedTheme));
      }

      if (savedArtists) {
        setArtistMetadata(JSON.parse(savedArtists));
      }
    } catch (e) {
      console.error("Failed to load library", e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const tracksToSave = tracks.map(t => ({ ...t, fileUrl: '' }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tracksToSave));
      localStorage.setItem(THEME_KEY, JSON.stringify(theme));
      localStorage.setItem(ARTIST_DATA_KEY, JSON.stringify(artistMetadata));
    } catch (e) {
      console.error("Storage error", e);
    }
  }, [tracks, isLoaded, theme, artistMetadata]);

  // --- Theme Updates ---
  const handleUpdateTheme = (newConfig: Partial<ThemeConfig>) => {
    setTheme(prev => ({ ...prev, ...newConfig }));
  };

  const handleUpdateArtist = (artist: string, data: Partial<ArtistMetadata>) => {
      setArtistMetadata(prev => ({
          ...prev,
          [artist]: { ...prev[artist], ...data }
      }));
  };

  // --- Navigation Helpers ---
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

  // --- Audio Logic (Existing) ---
  useEffect(() => {
    const audio = audioRef.current;
    
    const updateTime = () => setPlayerState(prev => ({ ...prev, currentTime: audio.currentTime }));
    const updateDuration = () => {
       if (!Number.isNaN(audio.duration) && audio.duration !== Infinity) {
          setPlayerState(prev => ({ ...prev, duration: audio.duration }));
       }
    };
    const handleWaiting = () => setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.BUFFERING }));
    const handlePlaying = () => setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PLAYING }));
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => nextTrackRef.current();
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  useEffect(() => {
    if (playerState.currentTrack) {
      document.title = `${playerState.currentTrack.title} • ${playerState.currentTrack.artist}`;
    } else {
      document.title = "Glass Music";
    }
  }, [playerState.currentTrack]);

  const handlePlay = useCallback(async (track: Track) => {
    if (playerState.currentTrack?.id === track.id) {
        if (playerState.playbackState === PlaybackState.PLAYING) {
          audioRef.current.pause();
          setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PAUSED }));
        } else {
          await audioRef.current.play();
          setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PLAYING }));
        }
        return;
    }
    let src = track.fileUrl;
    if (!src && track.path) src = `file://${track.path}`;
    if (!src) return;

    audioRef.current.src = src;
    audioRef.current.volume = playerState.volume;
    try {
      await audioRef.current.play();
      setPlayerState(prev => ({ ...prev, currentTrack: track, playbackState: PlaybackState.PLAYING }));
    } catch (err) { console.error("Playback error:", err); }
  }, [playerState.currentTrack, playerState.playbackState, playerState.volume]);

  const handleNext = useCallback(() => {
    if (!playerState.currentTrack || tracks.length === 0) return;
    let nextIndex = 0;
    const currentIndex = tracks.findIndex(t => t.id === playerState.currentTrack?.id);

    if (playerState.isShuffled) {
      do { nextIndex = Math.floor(Math.random() * tracks.length); } 
      while (tracks.length > 1 && nextIndex === currentIndex);
    } else {
      nextIndex = (currentIndex + 1) % tracks.length;
    }
    handlePlay(tracks[nextIndex]);
  }, [playerState.currentTrack, tracks, playerState.isShuffled, handlePlay]);

  const nextTrackRef = useRef(handleNext);
  useEffect(() => { nextTrackRef.current = handleNext; }, [handleNext]);

  const handlePrev = useCallback(() => {
     if (!playerState.currentTrack || tracks.length === 0) return;
     const audio = audioRef.current;
     if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const currentIndex = tracks.findIndex(t => t.id === playerState.currentTrack?.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    handlePlay(tracks[prevIndex]);
  }, [playerState.currentTrack, tracks, handlePlay]);

  const handleSeek = (time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setPlayerState(prev => ({ ...prev, currentTime: time })); }
  };

  const handleVolume = (vol: number) => {
    if (audioRef.current) { audioRef.current.volume = vol; setPlayerState(prev => ({ ...prev, volume: vol })); }
  };

  const toggleShuffle = () => setPlayerState(prev => ({ ...prev, isShuffled: !prev.isShuffled }));

  const handleUpdateTrack = (id: string, data: Partial<Track>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    if (playerState.currentTrack?.id === id) {
        setPlayerState(prev => ({ ...prev, currentTrack: { ...prev.currentTrack!, ...data } }));
    }
  };

  const handleToggleLike = (id: string) => {
      const track = tracks.find(t => t.id === id);
      if (track) handleUpdateTrack(id, { isLiked: !track.isLiked });
  };

  const handleDeleteTrack = (id: string) => {
      if (playerState.currentTrack?.id === id) {
          audioRef.current.pause();
          setPlayerState(prev => ({ ...prev, currentTrack: null, playbackState: PlaybackState.PAUSED }));
      }
      setTracks(prev => prev.filter(t => t.id !== id));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const fileList = Array.from(files) as File[];
    const audioFiles = fileList.filter(file => file.type.startsWith('audio/'));
    const newTracks: Track[] = [];

    for (const file of audioFiles) {
        const id = Math.random().toString(36).substr(2, 9);
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        const metadata = await parseFileMetadata(file);
        const realPath = (file as any).path; 
        newTracks.push({
          id,
          title: metadata.title || fileName,
          artist: metadata.artist || "Неизвестный артист",
          album: metadata.album || "Локальный импорт",
          duration: 0,
          coverUrl: metadata.coverUrl || generateMockCover(fileName),
          fileUrl: URL.createObjectURL(file),
          path: realPath,
          isLiked: false,
          year: new Date().getFullYear().toString(),
          source: 'local'
        });
    }
    setTracks(prev => [...prev, ...newTracks]);
  };

  return (
    <div className="relative w-full h-screen flex overflow-hidden bg-black text-white selection:text-white">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden transition-all duration-700 ease-in-out">
        {theme.backgroundType === 'liquid' ? (
           <div className="liquid-bg">
             <div className="blob w-96 h-96 rounded-full top-0 left-0 mix-blend-screen opacity-40" style={{ backgroundColor: theme.accentColor }}></div>
             <div className="blob bg-blue-600 w-96 h-96 rounded-full bottom-0 right-0 mix-blend-screen opacity-40 animation-delay-2000"></div>
             <div className="blob bg-purple-600 w-80 h-80 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mix-blend-screen opacity-30 animation-delay-4000"></div>
           </div>
        ) : theme.backgroundType === 'image' && theme.backgroundSource ? (
            <img 
                src={theme.backgroundSource} 
                className="w-full h-full object-cover transition-opacity duration-500"
                style={{ filter: `blur(${theme.blurLevel}px)` }}
            />
        ) : theme.backgroundType === 'video' && theme.backgroundSource ? (
            <video 
                src={theme.backgroundSource}
                autoPlay loop muted playsInline
                className="w-full h-full object-cover transition-opacity duration-500"
                style={{ filter: `blur(${theme.blurLevel}px)` }}
            />
        ) : <div className="bg-black w-full h-full" />}
        
        {/* Brightness Overlay */}
        <div className="absolute inset-0 bg-black pointer-events-none transition-all duration-300" style={{ opacity: theme.brightness }}></div>
      </div>

      <Sidebar 
        onImportClick={() => fileInputRef.current?.click()} 
        onSettingsClick={() => setSettingsOpen(true)}
        currentView={playerState.currentView}
        onChangeView={(view) => { setPlayerState(prev => ({ ...prev, currentView: view })); setSidebarOpen(true); }}
        isOpen={sidebarOpen}
        accentColor={theme.accentColor}
      />
      
      <div className={`flex-1 flex flex-col relative z-10 glass-panel border-y-0 border-r-0 rounded-l-3xl overflow-hidden shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${!sidebarOpen ? 'ml-0 rounded-l-none' : 'ml-2'}`}>
        <MainView 
          tracks={tracks} 
          currentTrack={playerState.currentTrack}
          playbackState={playerState.playbackState}
          onPlay={handlePlay}
          onShuffleAll={() => { setPlayerState(prev => ({ ...prev, isShuffled: true })); handleNext(); }}
          currentView={playerState.currentView}
          selectedArtist={selectedArtist}
          selectedAlbum={selectedAlbum}
          onUpdateTrack={handleUpdateTrack}
          onDeleteTrack={handleDeleteTrack}
          onGoToArtist={handleGoToArtist}
          onGoToAlbum={handleGoToAlbum}
          onBack={() => setPlayerState(prev => ({ ...prev, currentView: previousView }))}
          accentColor={theme.accentColor}
          artistMetadata={artistMetadata}
          onUpdateArtist={handleUpdateArtist}
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
          accentColor={theme.accentColor}
          onGoToArtist={handleGoToArtist}
          onGoToAlbum={handleGoToAlbum}
        />
      </div>

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
            accentColor={theme.accentColor}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={theme}
        onUpdate={handleUpdateTheme}
      />

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="audio/*" />
    </div>
  );
};

export default App;
