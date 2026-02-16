
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MainView from './components/MainView';
import PlayerControls from './components/PlayerControls';
import FullScreenPlayer from './components/FullScreenPlayer';
import SettingsModal from './components/SettingsModal';
import ProfileModal from './components/ProfileModal';
import Background from './components/Background';
import SnowEffect from './components/SnowEffect';
import { Track, PlaybackState, PlayerState, ViewType, ThemeConfig, ArtistMetadata, UserProfile } from './types';
import { generateMockCover, parseFileMetadata, fetchOpenSourceArtistImage_Safe, sortTracks } from './utils';

const STORAGE_KEY = 'glass_music_library_v1';
const THEME_KEY = 'glass_music_theme_v1';
const ARTIST_DATA_KEY = 'glass_music_artists_v1';
const USER_PROFILE_KEY = 'glass_music_profile_v1';

const DEFAULT_THEME: ThemeConfig = {
  accentColor: '#db2777', // Pink-600
  backgroundType: 'liquid',
  backgroundSource: null,
  blurLevel: 24,
  brightness: 0.4,
  enableGlass: true, // Default enabled
  seasonalTheme: false, // Default off
  playerStyle: 'floating' // New default
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'Слушатель',
  avatarUrl: null,
  bannerUrl: null
};

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artistMetadata, setArtistMetadata] = useState<Record<string, ArtistMetadata>>({});
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  const [fullScreenMode, setFullScreenMode] = useState<'none' | 'cover' | 'lyrics'>('none');

  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<ViewType>('songs');
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
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
    history: []
  });

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const isElectron = () => {
      return (window as any).require && (window as any).require('electron');
  };

  const loadData = async () => {
      try {
          let savedTracks = null;
          let savedTheme = null;
          let savedArtists = null;
          let savedProfile = null;

          if (isElectron()) {
              const { ipcRenderer } = (window as any).require('electron');
              savedTracks = await ipcRenderer.invoke('get-local-data', { key: STORAGE_KEY });
              savedTheme = await ipcRenderer.invoke('get-local-data', { key: THEME_KEY });
              savedArtists = await ipcRenderer.invoke('get-local-data', { key: ARTIST_DATA_KEY });
              savedProfile = await ipcRenderer.invoke('get-local-data', { key: USER_PROFILE_KEY });
          } else {
              const t = localStorage.getItem(STORAGE_KEY);
              const th = localStorage.getItem(THEME_KEY);
              const a = localStorage.getItem(ARTIST_DATA_KEY);
              const p = localStorage.getItem(USER_PROFILE_KEY);
              if (t) savedTracks = JSON.parse(t);
              if (th) savedTheme = JSON.parse(th);
              if (a) savedArtists = JSON.parse(a);
              if (p) savedProfile = JSON.parse(p);
          }

          if (savedTracks) {
              const parsedTracks: Track[] = Array.isArray(savedTracks) ? savedTracks : [];
              const restoredTracks = parsedTracks.map(track => {
                  if (track.path && !track.fileUrl) {
                      return { ...track, fileUrl: `file://${track.path}` };
                  }
                  return track;
              });
              const validTracks = restoredTracks.filter(t => t.fileUrl || t.path);
              setTracks(sortTracks(validTracks));
          }

          if (savedTheme) setTheme({ ...DEFAULT_THEME, ...savedTheme });
          if (savedArtists) setArtistMetadata(savedArtists);
          if (savedProfile) setUserProfile({ ...DEFAULT_PROFILE, ...savedProfile });

      } catch (e) {
          console.error("Critical Load Error:", e);
      } finally {
          setIsLoaded(true);
      }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
        const tracksToSave = tracks.map(t => ({ ...t, fileUrl: '' }));
        try {
            if (isElectron()) {
                const { ipcRenderer } = (window as any).require('electron');
                await Promise.all([
                    ipcRenderer.invoke('save-local-data', { key: STORAGE_KEY, data: tracksToSave }),
                    ipcRenderer.invoke('save-local-data', { key: THEME_KEY, data: theme }),
                    ipcRenderer.invoke('save-local-data', { key: ARTIST_DATA_KEY, data: artistMetadata }),
                    ipcRenderer.invoke('save-local-data', { key: USER_PROFILE_KEY, data: userProfile })
                ]);
            } else {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tracksToSave));
                localStorage.setItem(THEME_KEY, JSON.stringify(theme));
                localStorage.setItem(ARTIST_DATA_KEY, JSON.stringify(artistMetadata));
                localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
            }
        } catch (e) { console.error("Save Error:", e); }
    }, 1000);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }
  }, [tracks, theme, artistMetadata, userProfile, isLoaded]);

  useEffect(() => {
    if (theme.enableGlass) document.body.classList.remove('no-glass');
    else document.body.classList.add('no-glass');
  }, [theme.enableGlass]);

  const handleUpdateTheme = (newConfig: Partial<ThemeConfig>) => setTheme(prev => ({ ...prev, ...newConfig }));
  const handleUpdateArtist = (artist: string, data: Partial<ArtistMetadata>) => {
      setArtistMetadata(prev => ({ ...prev, [artist]: { ...prev[artist], ...data } }));
  };

  const handleGoToArtist = async (artist: string) => {
      setPreviousView(playerState.currentView);
      setSelectedArtist(artist);
      setPlayerState(prev => ({ ...prev, currentView: 'artist_detail' }));

      // --- NEW: FETCH ARTIST METADATA AUTOMATICALLY ---
      if (isElectron() && (!artistMetadata[artist] || !artistMetadata[artist].avatar)) {
          try {
              const { ipcRenderer } = (window as any).require('electron');
              const meta = await ipcRenderer.invoke('get-artist-metadata', artist);
              if (meta) {
                  handleUpdateArtist(artist, meta);
              }
          } catch (e) {
              console.error("Auto Artist Fetch Error:", e);
          }
      }
  };

  const handleGoToAlbum = (album: string) => {
      setPreviousView(playerState.currentView);
      setSelectedAlbum(album);
      setPlayerState(prev => ({ ...prev, currentView: 'album_detail' }));
  };

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
    if (playerState.currentTrack) document.title = `${playerState.currentTrack.title} • ${playerState.currentTrack.artist}`;
    else document.title = "Glass Music";
  }, [playerState.currentTrack]);

  const playTrackInternal = async (track: Track) => {
    let src = track.fileUrl;
    if (!src && track.path) src = `file://${track.path}`;
    if (!src) return;
    audioRef.current.src = src;
    audioRef.current.volume = playerState.volume;
    try {
      await audioRef.current.play();
      setPlayerState(prev => ({ ...prev, currentTrack: track, playbackState: PlaybackState.PLAYING }));
    } catch (err) { console.error(err); }
  };

  const handlePlay = useCallback(async (track: Track, newQueue?: Track[]) => {
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
    
    if (playerState.currentTrack) {
        setPlayerState(prev => ({ ...prev, history: [...prev.history, prev.currentTrack!.id] }));
    }

    if (newQueue) {
        setPlayerState(prev => ({ ...prev, queue: newQueue }));
    } else {
        setPlayerState(prev => ({ ...prev, queue: [] }));
    }

    await playTrackInternal(track);
  }, [playerState.currentTrack, playerState.playbackState, playerState.volume]);

  const handleNext = useCallback(() => {
    const activeQueue = playerState.queue.length > 0 ? playerState.queue : tracks;
    if (!playerState.currentTrack || activeQueue.length === 0) return;
    
    setPlayerState(prev => ({ ...prev, history: [...prev.history, prev.currentTrack!.id] }));
    
    let nextIndex = 0;
    const currentIndex = activeQueue.findIndex(t => t.id === playerState.currentTrack?.id);
    
    if (playerState.isShuffled) {
      if (activeQueue.length > 1) {
          do { nextIndex = Math.floor(Math.random() * activeQueue.length); } 
          while (nextIndex === currentIndex);
      } else {
          nextIndex = 0;
      }
    } else { 
      nextIndex = (currentIndex + 1) % activeQueue.length; 
    }
    
    playTrackInternal(activeQueue[nextIndex]);
  }, [playerState.currentTrack, tracks, playerState.queue, playerState.isShuffled]);

  const nextTrackRef = useRef(handleNext);
  useEffect(() => { nextTrackRef.current = handleNext; }, [handleNext]);

  const handlePrev = useCallback(() => {
     const activeQueue = playerState.queue.length > 0 ? playerState.queue : tracks;
     if (!playerState.currentTrack || activeQueue.length === 0) return;
     
     const audio = audioRef.current;
     if (audio.currentTime > 3) { audio.currentTime = 0; return; }
     
     if (playerState.history.length > 0) {
         const prevTrackId = playerState.history[playerState.history.length - 1];
         const prevTrack = activeQueue.find(t => t.id === prevTrackId);
         if (prevTrack) {
             setPlayerState(prev => ({ ...prev, history: prev.history.slice(0, -1) }));
             playTrackInternal(prevTrack);
             return;
         }
     }
     
    const currentIndex = activeQueue.findIndex(t => t.id === playerState.currentTrack?.id);
    const prevIndex = (currentIndex - 1 + activeQueue.length) % activeQueue.length;
    playTrackInternal(activeQueue[prevIndex]);
  }, [playerState.currentTrack, tracks, playerState.history, playerState.queue]);

  const handleSeek = (time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setPlayerState(prev => ({ ...prev, currentTime: time })); }
  };

  const handleVolume = (vol: number) => {
    if (audioRef.current) { audioRef.current.volume = vol; setPlayerState(prev => ({ ...prev, volume: vol })); }
  };

  const toggleShuffle = () => setPlayerState(prev => ({ ...prev, isShuffled: !prev.isShuffled }));

  const handleUpdateTrack = (id: string, data: Partial<Track>) => {
    setTracks(prev => {
        const updatedTracks = prev.map(t => t.id === id ? { ...t, ...data } : t);
        if (data.title) return sortTracks(updatedTracks);
        return updatedTracks;
    });
    if (playerState.currentTrack?.id === id) setPlayerState(prev => ({ ...prev, currentTrack: { ...prev.currentTrack!, ...data } }));
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

  const handleClearLibrary = async () => {
    if (window.confirm("Очистить библиотеку?")) {
        audioRef.current.pause();
        audioRef.current.src = "";
        setTracks([]);
        setArtistMetadata({});
        setPlayerState(prev => ({ ...prev, currentTrack: null, playbackState: PlaybackState.PAUSED, queue: [] }));
        if (isElectron()) {
            const { ipcRenderer } = (window as any).require('electron');
            await ipcRenderer.invoke('clear-local-data');
        } else {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(ARTIST_DATA_KEY);
        }
    }
  };

  const handleReleaseFileLock = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PAUSED }));
    }
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
        const artist = metadata.artist || "Неизвестный артист";
        const title = metadata.title || fileName;
        const album = metadata.album || "Локальный импорт";
        let coverUrl = metadata.coverUrl || generateMockCover(fileName);
        newTracks.push({
          id, title, artist, album, duration: 0, coverUrl, 
          fileUrl: URL.createObjectURL(file), path: realPath, isLiked: false, 
          year: new Date().getFullYear().toString(), source: 'local'
        });
    }
    setTracks(prev => sortTracks([...prev, ...newTracks]));
  };

  return (
    <div className="relative w-full h-screen flex overflow-hidden bg-black text-white selection:text-white">
      {theme.seasonalTheme && <SnowEffect />}
      <Background config={theme} />
      <Sidebar 
        onImportClick={() => fileInputRef.current?.click()} 
        onSettingsClick={() => setSettingsOpen(true)}
        onProfileClick={() => setProfileOpen(true)}
        currentView={playerState.currentView}
        onChangeView={(view) => { setPlayerState(prev => ({ ...prev, currentView: view })); setSidebarOpen(true); }}
        isOpen={sidebarOpen}
        accentColor={theme.accentColor}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        enableGlass={theme.enableGlass}
        user={userProfile}
      />
      
      <div className={`flex-1 flex flex-col relative z-10 glass-panel border-y-0 border-r-0 rounded-l-3xl overflow-hidden shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${!sidebarOpen ? 'ml-0 rounded-l-none' : 'ml-2'}`}>
        <MainView 
          tracks={tracks} 
          currentTrack={playerState.currentTrack}
          playbackState={playerState.playbackState}
          onPlay={handlePlay}
          onShuffleAll={(contextTracks) => { 
            const startTrack = contextTracks[Math.floor(Math.random() * contextTracks.length)];
            setPlayerState(prev => ({ ...prev, isShuffled: true, queue: contextTracks })); 
            if (startTrack) handlePlay(startTrack, contextTracks);
          }}
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
          searchQuery={searchQuery}
          onRequestFileUnlock={handleReleaseFileLock}
        />
        <PlayerControls 
          currentTrack={playerState.currentTrack}
          playbackState={playerState.playbackState}
          onPlayPause={() => playerState.currentTrack ? handlePlay(playerState.currentTrack) : null}
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
          onToggleFullScreen={() => setFullScreenMode('cover')}
          onOpenLyrics={() => setFullScreenMode('lyrics')}
          onToggleLike={handleToggleLike}
          accentColor={theme.accentColor}
          onGoToArtist={handleGoToArtist}
          onGoToAlbum={handleGoToAlbum}
          playerStyle={theme.playerStyle}
        />
      </div>
      
      {fullScreenMode !== 'none' && playerState.currentTrack && (
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
            onClose={() => setFullScreenMode('none')}
            accentColor={theme.accentColor}
            initialMode={fullScreenMode === 'lyrics' ? 'lyrics' : 'cover'}
        />
      )}

      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        config={theme} 
        onUpdate={handleUpdateTheme}
        onClearLibrary={handleClearLibrary}
      />

      <ProfileModal 
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={userProfile}
        onUpdate={(data) => setUserProfile(prev => ({ ...prev, ...data }))}
        accentColor={theme.accentColor}
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        multiple 
        accept="audio/*" 
        className="hidden" 
      />
    </div>
  );
};

export default App;
