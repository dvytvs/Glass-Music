
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MainView from './components/MainView';
import PlayerControls from './components/PlayerControls';
import FullScreenPlayer from './components/FullScreenPlayer';
import SettingsModal from './components/SettingsModal';
import ProfileModal from './components/ProfileModal';
import OnboardingModal from './components/OnboardingModal';
import Background from './components/Background';
import SnowEffect from './components/SnowEffect';
import { Track, PlaybackState, PlayerState, ViewType, ThemeConfig, ArtistMetadata, UserProfile } from './types';
import { generateMockCover, parseFileMetadata, sortTracks } from './utils';

const STORAGE_KEY = 'glass_music_library_v1';
const THEME_KEY = 'glass_music_theme_v1';
const ARTIST_DATA_KEY = 'glass_music_artists_v1';
const USER_PROFILE_KEY = 'glass_music_profile_v1';

const DEFAULT_THEME: ThemeConfig = {
  accentColor: '#db2777', 
  backgroundType: 'liquid',
  backgroundSource: null,
  blurLevel: 24,
  brightness: 0.4,
  enableGlass: true, 
  seasonalTheme: false, 
  playerStyle: 'floating' 
};

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  avatarUrl: null,
  bannerUrl: null,
  onboardingDone: false
};

const ARTIST_SPLIT_REGEX = /\s*(?:,|;|feat\.?|ft\.?|&|\/|featuring)\s+/i;

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
    currentTrack: null, queue: [], playbackState: PlaybackState.PAUSED,
    volume: 0.8, currentTime: 0, duration: 0, isShuffled: false,
    isRepeating: false, currentView: 'songs', history: []
  });

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // РЕФЫ ДЛЯ МГНОВЕННОГО ДОСТУПА ВНУТРИ СОБЫТИЙ AUDIO
  const tracksRef = useRef<Track[]>([]);
  const queueRef = useRef<Track[]>([]);
  const playerStateRef = useRef(playerState);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { 
    queueRef.current = playerState.queue; 
    playerStateRef.current = playerState;
  }, [playerState]);

  const isElectron = () => (window as any).require && (window as any).require('electron');

  const loadData = async () => {
      try {
          let savedTracks, savedTheme, savedArtists, savedProfile;
          if (isElectron()) {
              const { ipcRenderer } = (window as any).require('electron');
              [savedTracks, savedTheme, savedArtists, savedProfile] = await Promise.all([
                ipcRenderer.invoke('get-local-data', { key: STORAGE_KEY }),
                ipcRenderer.invoke('get-local-data', { key: THEME_KEY }),
                ipcRenderer.invoke('get-local-data', { key: ARTIST_DATA_KEY }),
                ipcRenderer.invoke('get-local-data', { key: USER_PROFILE_KEY })
              ]);
          } else {
              savedTracks = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
              savedTheme = JSON.parse(localStorage.getItem(THEME_KEY) || 'null');
              savedArtists = JSON.parse(localStorage.getItem(ARTIST_DATA_KEY) || 'null');
              savedProfile = JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || 'null');
          }

          if (savedTracks) {
              const restored = (Array.isArray(savedTracks) ? savedTracks : []).map(t => (t.path && !t.fileUrl) ? { ...t, fileUrl: `file://${t.path}` } : t);
              setTracks(sortTracks(restored.filter(t => t.fileUrl || t.path)));
          }
          if (savedTheme) setTheme({ ...DEFAULT_THEME, ...savedTheme });
          if (savedArtists) setArtistMetadata(savedArtists);
          if (savedProfile) setUserProfile({ ...DEFAULT_PROFILE, ...savedProfile });
      } catch (e) { console.error(e); } finally { setIsLoaded(true); }
  };

  useEffect(() => { loadData(); }, []);

  const playTrackInternal = async (track: Track) => {
    let src = track.fileUrl || (track.path ? `file://${track.path}` : null);
    if (!src) return;
    
    audioRef.current.pause();
    audioRef.current.src = src;
    audioRef.current.volume = playerStateRef.current.volume;
    
    try {
      await audioRef.current.play();
      setPlayerState(prev => ({ ...prev, currentTrack: track, playbackState: PlaybackState.PLAYING }));
    } catch (err) { 
        console.error("Playback error:", err);
        setPlayerState(prev => ({ ...prev, currentTrack: track, playbackState: PlaybackState.PAUSED }));
    }
  };

  const handleNext = useCallback(() => {
    // Если очередь пуста, берем все треки из библиотеки
    const activeQueue = queueRef.current.length > 0 ? queueRef.current : tracksRef.current;
    const current = playerStateRef.current.currentTrack;
    
    if (!current || activeQueue.length === 0) return;

    if (playerStateRef.current.isRepeating) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        return;
    }

    let nextIndex = 0;
    const currentIndex = activeQueue.findIndex(t => t.id === current.id);

    if (playerStateRef.current.isShuffled && activeQueue.length > 1) {
        do { nextIndex = Math.floor(Math.random() * activeQueue.length); } while (nextIndex === currentIndex && activeQueue.length > 1);
    } else { 
        nextIndex = (currentIndex + 1) % activeQueue.length; 
    }
    
    playTrackInternal(activeQueue[nextIndex]);
  }, []);

  const handlePrev = useCallback(() => {
     const activeQueue = queueRef.current.length > 0 ? queueRef.current : tracksRef.current;
     const current = playerStateRef.current.currentTrack;
     if (!current || activeQueue.length === 0) return;

     if (audioRef.current.currentTime > 3) { 
         audioRef.current.currentTime = 0; 
         return; 
     }
     
     const currentIndex = activeQueue.findIndex(t => t.id === current.id);
     const prevIndex = (currentIndex - 1 + activeQueue.length) % activeQueue.length;
     playTrackInternal(activeQueue[prevIndex]);
  }, []);

  const handlePlay = useCallback(async (track: Track, newQueue?: Track[]) => {
    if (playerStateRef.current.currentTrack?.id === track.id) {
        if (playerStateRef.current.playbackState === PlaybackState.PLAYING) {
          audioRef.current.pause();
          setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PAUSED }));
        } else {
          audioRef.current.play();
          setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PLAYING }));
        }
        return;
    }

    if (newQueue) {
        setPlayerState(prev => ({ ...prev, queue: newQueue }));
        queueRef.current = newQueue;
    }
    
    await playTrackInternal(track);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    
    const onEnded = () => {
        console.log("Track ended. Moving to next.");
        handleNext();
    };
    const onTimeUpdate = () => setPlayerState(prev => ({ ...prev, currentTime: audio.currentTime }));
    const onDurationChange = () => {
        if (!Number.isNaN(audio.duration) && audio.duration !== Infinity) {
            setPlayerState(prev => ({ ...prev, duration: audio.duration }));
        }
    };
    
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onDurationChange);

    return () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('durationchange', onDurationChange);
        audio.removeEventListener('loadedmetadata', onDurationChange);
    };
  }, [handleNext]);

  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
        try {
            const tracksToSave = tracks.map(t => ({ ...t, fileUrl: '' }));
            if (isElectron()) {
                const { ipcRenderer } = (window as any).require('electron');
                await Promise.all([
                    ipcRenderer.invoke('save-local-data', { key: STORAGE_KEY, data: tracksToSave }),
                    ipcRenderer.invoke('save-local-data', { key: THEME_KEY, data: theme }),
                    ipcRenderer.invoke('save-local-data', { key: ARTIST_DATA_KEY, data: artistMetadata }),
                    ipcRenderer.invoke('save-local-data', { key: USER_PROFILE_KEY, data: userProfile })
                ]);
            }
        } catch (e) { console.error("Save error:", e); }
    }, 2000);
  }, [tracks, theme, artistMetadata, userProfile, isLoaded]);

  const handleUpdateTheme = (newConfig: Partial<ThemeConfig>) => setTheme(prev => ({ ...prev, ...newConfig }));
  const handleUpdateArtist = (artist: string, data: Partial<ArtistMetadata>) => setArtistMetadata(prev => ({ ...prev, [artist]: { ...prev[artist], ...data } }));

  const handleGoToArtist = async (artist: string) => {
      setPreviousView(playerState.currentView);
      setSelectedArtist(artist);
      setPlayerState(prev => ({ ...prev, currentView: 'artist_detail' }));
      if (isElectron() && !artistMetadata[artist]?.avatar) {
          const { ipcRenderer } = (window as any).require('electron');
          const meta = await ipcRenderer.invoke('get-artist-metadata', artist);
          if (meta) handleUpdateArtist(artist, meta);
      }
  };

  const handleGoToAlbum = (album: string) => {
      setPreviousView(playerState.currentView);
      setSelectedAlbum(album);
      setPlayerState(prev => ({ ...prev, currentView: 'album_detail' }));
  };

  const handleOnboardingComplete = (profile: Partial<UserProfile>, themeUpdate: Partial<ThemeConfig>) => {
    setUserProfile(prev => ({ ...prev, ...profile, onboardingDone: true }));
    setTheme(prev => ({ ...prev, ...themeUpdate }));
  };

  const handleSeek = (time: number) => { audioRef.current.currentTime = time; };
  const handleVolume = (vol: number) => { audioRef.current.volume = vol; setPlayerState(prev => ({ ...prev, volume: vol })); };
  const toggleShuffle = () => setPlayerState(prev => ({ ...prev, isShuffled: !prev.isShuffled }));

  const handleUpdateTrack = (id: string, data: Partial<Track>) => {
    setTracks(prev => sortTracks(prev.map(t => t.id === id ? { ...t, ...data } : t)));
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
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files; if (!files) return;
    const newTracks: Track[] = [];
    for (const file of Array.from(files)) {
        if (!file.type.startsWith('audio/')) continue;
        const metadata = await parseFileMetadata(file);
        newTracks.push({
          id: Math.random().toString(36).substr(2, 9), title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: metadata.artist || "Неизвестный артист", album: metadata.album || "Локальный импорт",
          duration: 0, coverUrl: metadata.coverUrl || generateMockCover(file.name),
          fileUrl: URL.createObjectURL(file), path: (file as any).path, isLiked: false, 
          year: new Date().getFullYear().toString(), source: 'local'
        });
    }
    setTracks(prev => sortTracks([...prev, ...newTracks]));
  };

  return (
    <div className="relative w-full h-screen flex overflow-hidden bg-black text-white selection:text-white">
      {theme.seasonalTheme && <SnowEffect />}
      <Background config={theme} />
      
      {!userProfile.onboardingDone && isLoaded && (
        <OnboardingModal onComplete={handleOnboardingComplete} accentColor={theme.accentColor} />
      )}

      <Sidebar 
        onImportClick={() => fileInputRef.current?.click()} onSettingsClick={() => setSettingsOpen(true)}
        onProfileClick={() => setProfileOpen(true)} currentView={playerState.currentView}
        onChangeView={(view) => { setPlayerState(prev => ({ ...prev, currentView: view })); setSidebarOpen(true); }}
        isOpen={sidebarOpen} accentColor={theme.accentColor} searchQuery={searchQuery}
        onSearchChange={setSearchQuery} enableGlass={theme.enableGlass} user={userProfile}
      />
      <div className={`flex-1 flex flex-col relative z-10 glass-panel border-y-0 border-r-0 rounded-l-3xl overflow-hidden shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${!sidebarOpen ? 'ml-0 rounded-l-none' : 'ml-2'}`}>
        <MainView 
          tracks={tracks} currentTrack={playerState.currentTrack} playbackState={playerState.playbackState}
          onPlay={handlePlay} onShuffleAll={(q) => { setPlayerState(prev => ({ ...prev, isShuffled: true, queue: q })); if (q[0]) handlePlay(q[0], q); }}
          currentView={playerState.currentView} selectedArtist={selectedArtist} selectedAlbum={selectedAlbum}
          onUpdateTrack={handleUpdateTrack} onDeleteTrack={handleDeleteTrack} onGoToArtist={handleGoToArtist}
          onGoToAlbum={handleGoToAlbum} onBack={() => setPlayerState(prev => ({ ...prev, currentView: previousView }))}
          accentColor={theme.accentColor} artistMetadata={artistMetadata} onUpdateArtist={handleUpdateArtist}
          searchQuery={searchQuery} onRequestFileUnlock={() => { audioRef.current.pause(); audioRef.current.src = ""; }}
        />
        <PlayerControls 
          currentTrack={playerState.currentTrack} playbackState={playerState.playbackState}
          onPlayPause={() => playerState.currentTrack ? handlePlay(playerState.currentTrack) : null}
          onNext={handleNext} onPrev={handlePrev} currentTime={playerState.currentTime} duration={playerState.duration}
          onSeek={handleSeek} volume={playerState.volume} onVolumeChange={handleVolume} isShuffled={playerState.isShuffled}
          onToggleShuffle={toggleShuffle} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleFullScreen={() => setFullScreenMode('cover')} onOpenLyrics={() => setFullScreenMode('lyrics')}
          onToggleLike={handleToggleLike} accentColor={theme.accentColor} onGoToArtist={handleGoToArtist}
          onGoToAlbum={handleGoToAlbum} playerStyle={theme.playerStyle}
        />
      </div>
      {fullScreenMode !== 'none' && playerState.currentTrack && (
        <FullScreenPlayer 
            track={playerState.currentTrack} playbackState={playerState.playbackState}
            currentTime={playerState.currentTime} duration={playerState.duration}
            volume={playerState.volume} isShuffled={playerState.isShuffled}
            onPlayPause={() => handlePlay(playerState.currentTrack!)} onNext={handleNext} onPrev={handlePrev}
            onSeek={handleSeek} onVolumeChange={handleVolume} onToggleShuffle={toggleShuffle}
            onToggleLike={handleToggleLike} onClose={() => setFullScreenMode('none')}
            accentColor={theme.accentColor} initialMode={fullScreenMode === 'lyrics' ? 'lyrics' : 'cover'}
        />
      )}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} config={theme} onUpdate={handleUpdateTheme} onClearLibrary={handleClearLibrary} />
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} profile={userProfile} onUpdate={(data) => setUserProfile(prev => ({ ...prev, ...data }))} accentColor={theme.accentColor} />
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="audio/*" className="hidden" />
    </div>
  );
};

export default App;
