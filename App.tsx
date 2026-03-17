
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MainView from './components/MainView';
import PlayerControls from './components/PlayerControls';
import FullScreenPlayer from './components/FullScreenPlayer';
import SettingsModal from './components/SettingsModal';
import ProfileModal from './components/ProfileModal';
import OnboardingModal from './components/OnboardingModal';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import SelectTracksModal from './components/SelectTracksModal';
import Background from './components/Background';
import Visualizer from './components/Visualizer';
import SnowEffect from './components/SnowEffect';
import { Track, PlaybackState, PlayerState, ViewType, ThemeConfig, ArtistMetadata, UserProfile, Playlist } from './types';
import { generateMockCover, parseFileMetadata, sortTracks, fetchLyricsFromLRCLIB } from './utils';
import { translations, TranslationKey } from './translations';
import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'glass_music_library_v1';
const THEME_KEY = 'glass_music_theme_v1';
const ARTIST_DATA_KEY = 'glass_music_artists_v1';
const USER_PROFILE_KEY = 'glass_music_profile_v1';
const PLAYLISTS_KEY = 'glass_music_playlists_v1';

const DEFAULT_THEME: ThemeConfig = {
  accentColor: '#db2777', 
  backgroundType: 'liquid',
  backgroundSource: null,
  blurLevel: 24,
  brightness: 0.4,
  enableGlass: true, 
  seasonalTheme: false, 
  playerStyle: 'floating',
  themeMode: 'system',
  animateBackground: true
};

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  avatarUrl: null,
  bannerUrl: null,
  onboardingDone: false,
  language: 'system'
};

const ARTIST_SPLIT_REGEX = /\s*(?:,|;|feat\.?|ft\.?|&|\/|featuring)\s+/i;

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artistMetadata, setArtistMetadata] = useState<Record<string, ArtistMetadata>>({});
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isSelectTracksOpen, setIsSelectTracksOpen] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState<'none' | 'cover' | 'lyrics'>('none');
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<ViewType>('songs');
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('dark');
  const [systemLocale, setSystemLocale] = useState('ru');

  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTrack: null, queue: [], playbackState: PlaybackState.PAUSED,
    volume: 0.8, currentTime: 0, duration: 0, isShuffled: false,
    isRepeating: false, currentView: 'listen_now', history: []
  });

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqBandsRef = useRef<BiquadFilterNode[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const shuffledQueueRef = useRef<string[]>([]);
  const historyRef = useRef<string[]>([]);
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

  const getEffectiveTheme = useCallback(() => {
    if (theme.themeMode === 'system') return systemTheme;
    return theme.themeMode;
  }, [theme.themeMode, systemTheme]);

  const getEffectiveLanguage = useCallback(() => {
    if (userProfile.language === 'system') return systemLocale;
    return userProfile.language || 'ru';
  }, [userProfile.language, systemLocale]);

  const t = useCallback((key: TranslationKey): string => {
    const lang = getEffectiveLanguage();
    const dict = translations[lang] || translations['en'];
    return dict[key] || translations['en'][key] || key;
  }, [getEffectiveLanguage]);

  useEffect(() => {
    const effectiveTheme = getEffectiveTheme();
    if (effectiveTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [getEffectiveTheme()]);

  useEffect(() => {
    if (isElectron()) {
      const { ipcRenderer } = (window as any).require('electron');
      
      ipcRenderer.invoke('get-system-info').then((info: any) => {
        if (info) {
          setSystemLocale(info.locale.split('-')[0]);
          setSystemTheme(info.shouldUseDarkColors ? 'dark' : 'light');
        }
      });

      const handleThemeUpdate = (_: any, info: any) => {
        setSystemTheme(info.shouldUseDarkColors ? 'dark' : 'light');
      };

      ipcRenderer.on('system-theme-updated', handleThemeUpdate);
      return () => {
        ipcRenderer.removeListener('system-theme-updated', handleThemeUpdate);
      };
    }
  }, []);

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      // Create 10-band EQ
      const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      const bands = frequencies.map(freq => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
      });

      eqBandsRef.current = bands;

      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserRef.current = analyserNode;
      setAnalyser(analyserNode);

      // Connect source -> bands -> analyser -> destination
      let currentConnection: AudioNode = source;
      bands.forEach(band => {
        currentConnection.connect(band);
        currentConnection = band;
      });
      currentConnection.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      
      // Apply saved EQ
      if (theme.eqBands) {
        theme.eqBands.forEach((gain, i) => {
          if (bands[i]) bands[i].gain.value = gain;
        });
      }
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e);
    }
  }, [theme.eqBands]);

  useEffect(() => {
    if (eqBandsRef.current.length > 0 && theme.eqBands) {
      theme.eqBands.forEach((gain, i) => {
        if (eqBandsRef.current[i]) {
          eqBandsRef.current[i].gain.value = gain;
        }
      });
    }
  }, [theme.eqBands]);

  const translateText = async (text: string): Promise<string> => {
    if (!text) return "";
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const targetLang = getEffectiveLanguage() === 'ru' ? 'Russian' : 'English';
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text to ${targetLang}. Keep the meaning and tone. Only return the translated text:\n\n${text}`,
      });
      return response.text || text;
    } catch (e) {
      console.error("Translation error:", e);
      return text;
    }
  };

  const loadData = async () => {
      try {
          let savedTracks, savedTheme, savedArtists, savedProfile, savedPlaylists;
          if (isElectron()) {
              const { ipcRenderer } = (window as any).require('electron');
              [savedTracks, savedTheme, savedArtists, savedProfile, savedPlaylists] = await Promise.all([
                ipcRenderer.invoke('get-local-data', { key: STORAGE_KEY }),
                ipcRenderer.invoke('get-local-data', { key: THEME_KEY }),
                ipcRenderer.invoke('get-local-data', { key: ARTIST_DATA_KEY }),
                ipcRenderer.invoke('get-local-data', { key: USER_PROFILE_KEY }),
                ipcRenderer.invoke('get-local-data', { key: PLAYLISTS_KEY })
              ]);
          } else {
              savedTracks = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
              savedTheme = JSON.parse(localStorage.getItem(THEME_KEY) || 'null');
              savedArtists = JSON.parse(localStorage.getItem(ARTIST_DATA_KEY) || 'null');
              savedProfile = JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || 'null');
              savedPlaylists = JSON.parse(localStorage.getItem(PLAYLISTS_KEY) || 'null');
          }

          if (savedTracks) {
              const restored = (Array.isArray(savedTracks) ? savedTracks : []).map(t => (t.path && !t.fileUrl) ? { ...t, fileUrl: `file://${t.path}` } : t);
              setTracks(sortTracks(restored.filter(t => t.fileUrl || t.path)));
          }
          if (savedTheme) setTheme({ ...DEFAULT_THEME, ...savedTheme });
          if (savedArtists) setArtistMetadata(savedArtists);
          if (savedProfile) setUserProfile({ ...DEFAULT_PROFILE, ...savedProfile });
          if (savedPlaylists) setPlaylists(savedPlaylists);
          
          const savedVolume = localStorage.getItem('glass_music_volume');
          if (savedVolume) {
              const vol = parseFloat(savedVolume);
              audioRef.current.volume = vol;
              setPlayerState(prev => ({ ...prev, volume: vol }));
          }
      } catch (e) { console.error(e); } finally { setIsLoaded(true); }
  };

  useEffect(() => { loadData(); }, []);

  // Fetch metadata for top artists on load
  useEffect(() => {
    if (tracks.length > 0 && isElectron()) {
      const { ipcRenderer } = (window as any).require('electron');
      const artistCounts: Record<string, number> = {};
      tracks.forEach(t => {
        const splitNames = t.artist.split(ARTIST_SPLIT_REGEX).map(n => n.trim()).filter(Boolean);
        splitNames.forEach(name => {
          artistCounts[name] = (artistCounts[name] || 0) + (t.playCount || 1);
        });
      });
      const topArtists = Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(entry => entry[0]);

      topArtists.forEach(artist => {
        if (!artistMetadata[artist] || (!artistMetadata[artist].avatar && !artistMetadata[artist].banner)) {
          ipcRenderer.invoke('get-artist-metadata', artist).then((meta: any) => {
            if (meta) {
              setArtistMetadata(prev => {
                const updated = { ...prev, [artist]: { ...prev[artist], ...meta } };
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(() => {
                  ipcRenderer.invoke('save-local-data', { key: ARTIST_DATA_KEY, data: updated });
                }, 1000);
                return updated;
              });
            }
          }).catch(console.error);
        }
      });
    }
  }, [tracks.length]);

  const handleUpdateTrack = useCallback((id: string, data: Partial<Track>) => {
    setTracks(prev => {
        const track = prev.find(t => t.id === id);
        if (track && track.path && (window as any).require) {
            try {
                const { ipcRenderer } = (window as any).require('electron');
                ipcRenderer.invoke('write-id3-tags', { filePath: track.path, tags: { ...track, ...data } })
                    .then((result: any) => {
                        if (!result.success) console.error("Failed to write ID3 tags:", result.error);
                        else console.log("Successfully wrote ID3 tags to", track.path);
                    })
                    .catch((err: any) => console.error("IPC error writing ID3 tags:", err));
            } catch (err) {
                console.error("Error invoking write-id3-tags:", err);
            }
        }
        return sortTracks(prev.map(t => t.id === id ? { ...t, ...data } : t));
    });
    setPlayerState(prev => {
        if (prev.currentTrack?.id === id) {
            return { ...prev, currentTrack: { ...prev.currentTrack, ...data } as Track };
        }
        return prev;
    });
  }, []);

  const playTrackInternal = useCallback(async (track: Track, addToHistory = true) => {
    const currentTrack = playerStateRef.current.currentTrack;
    if (addToHistory && currentTrack) {
        historyRef.current.push(currentTrack.id);
        if (historyRef.current.length > 100) historyRef.current.shift();
        setPlayerState(prev => ({ ...prev, history: [...historyRef.current] }));
    }

    // Stop current playback
    audioRef.current.pause();

    // Increment play count
    handleUpdateTrack(track.id, { playCount: (track.playCount || 0) + 1 });

    let src = track.fileUrl || (track.path ? `file://${track.path}` : null);
    if (!src) return;
    
    const targetVolume = playerStateRef.current.volume;
    const audio = audioRef.current;
    
    // Сбрасываем текущее время перед сменой источника
    audio.currentTime = 0;
    audio.src = src;
    audio.volume = targetVolume;
    
    try {
      initAudioContext();
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      await audio.play();
      setPlayerState(prev => ({ ...prev, currentTrack: track, playbackState: PlaybackState.PLAYING }));
    } catch (err) { 
        console.error("Playback error:", err);
        setPlayerState(prev => ({ ...prev, currentTrack: track, playbackState: PlaybackState.PAUSED }));
    }

    // Fetch lyrics if needed
    if (!track.lyrics) {
      fetchLyricsFromLRCLIB(track.artist, track.title).then(lyrics => {
        if (lyrics) {
          handleUpdateTrack(track.id, { lyrics });
        }
      });
    }
  }, [handleUpdateTrack]);

  const handleNext = useCallback((fromEnded: boolean = false) => {
    const activeQueue = queueRef.current.length > 0 ? queueRef.current : tracksRef.current;
    const current = playerStateRef.current.currentTrack;
    
    if (!current || activeQueue.length === 0) return;

    if (fromEnded && playerStateRef.current.isRepeating) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        return;
    }

    let nextTrack: Track | undefined;

    if (playerStateRef.current.isShuffled) {
        if (shuffledQueueRef.current.length === 0) {
            // Refill shuffled queue
            shuffledQueueRef.current = activeQueue
                .map(t => t.id)
                .filter(id => id !== current.id);
            
            // If only one track in queue, we have to allow it
            if (shuffledQueueRef.current.length === 0 && activeQueue.length > 0) {
                shuffledQueueRef.current = [activeQueue[0].id];
            }
        }

        if (shuffledQueueRef.current.length > 0) {
            const randomIndex = Math.floor(Math.random() * shuffledQueueRef.current.length);
            const nextId = shuffledQueueRef.current.splice(randomIndex, 1)[0];
            nextTrack = activeQueue.find(t => t.id === nextId);
        }
    } else { 
        const currentIndex = activeQueue.findIndex(t => t.id === current.id);
        const nextIndex = (currentIndex + 1) % activeQueue.length; 
        nextTrack = activeQueue[nextIndex];
    }
    
    if (nextTrack) playTrackInternal(nextTrack);
  }, []);

  const handlePrev = useCallback(() => {
     const current = playerStateRef.current.currentTrack;
     const currentTime = audioRef.current.currentTime;
     if (currentTime > 3) { 
         audioRef.current.currentTime = 0; 
         return; 
     }

     if (historyRef.current.length > 0) {
         const prevId = historyRef.current.pop();
         setPlayerState(prev => ({ ...prev, history: [...historyRef.current] }));
         const allTracks = tracksRef.current;
         const prevTrack = allTracks.find(t => t.id === prevId);
         if (prevTrack) {
             playTrackInternal(prevTrack, false);
             return;
         }
     }
     
     // Fallback to sequential prev if history is empty
     const activeQueue = queueRef.current.length > 0 ? queueRef.current : tracksRef.current;
     const currentTrack = playerStateRef.current.currentTrack;
     if (!current || activeQueue.length === 0) return;

     const currentIndex = activeQueue.findIndex(t => t.id === current.id);
     const prevIndex = (currentIndex - 1 + activeQueue.length) % activeQueue.length;
     playTrackInternal(activeQueue[prevIndex]);
  }, []);

  const handlePlay = useCallback(async (track: Track, newQueue?: Track[]) => {
    if (playerStateRef.current.currentTrack?.id === track.id) {
        const audio = audioRef.current;
        if (playerStateRef.current.playbackState === PlaybackState.PLAYING) {
          // Spotify/YouTube pause handled by state
          audio.pause();
          setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PAUSED }));
        } else {
          // Spotify/YouTube play handled by state
          initAudioContext();
          if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
          }
          audio.play();
          setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PLAYING }));
        }
        return;
    }

    if (newQueue) {
        setPlayerState(prev => ({ ...prev, queue: newQueue }));
        queueRef.current = newQueue;
        shuffledQueueRef.current = []; // Reset shuffle for new queue
    }
    
    await playTrackInternal(track);
  }, [playTrackInternal]);

  useEffect(() => {
    const audio = audioRef.current;
    
    const onEnded = () => {
        console.log("Track ended. Moving to next.");
        handleNext(true);
    };
    const onTimeUpdate = () => setPlayerState(prev => ({ ...prev, currentTime: audio.currentTime }));
    const onDurationChange = () => {
        if (!Number.isNaN(audio.duration) && audio.duration !== Infinity) {
            setPlayerState(prev => ({ ...prev, duration: audio.duration }));
        }
    };
    const onError = (e: any) => {
        console.error("Audio element error:", audio.error);
        setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PAUSED }));
    };
    
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onDurationChange);
    audio.addEventListener('error', onError);

    return () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('durationchange', onDurationChange);
        audio.removeEventListener('loadedmetadata', onDurationChange);
        audio.removeEventListener('error', onError);
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
                    ipcRenderer.invoke('save-local-data', { key: USER_PROFILE_KEY, data: userProfile }),
                    ipcRenderer.invoke('save-local-data', { key: PLAYLISTS_KEY, data: playlists })
                ]);
            } else {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tracksToSave));
                localStorage.setItem(THEME_KEY, JSON.stringify(theme));
                localStorage.setItem(ARTIST_DATA_KEY, JSON.stringify(artistMetadata));
                localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
                localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
            }
        } catch (e) { console.error("Save error:", e); }
    }, 2000);
  }, [tracks, theme, artistMetadata, userProfile, playlists, isLoaded]);

  useEffect(() => {
    const track = playerState.currentTrack;
    if (track && !track.lyrics) {
      console.log(`[App] Auto-fetching lyrics for: ${track.artist} - ${track.title}`);
      fetchLyricsFromLRCLIB(track.artist, track.title).then(lyrics => {
        if (lyrics) {
          console.log(`[App] Auto-fetch success for: ${track.title}`);
          handleUpdateTrack(track.id, { lyrics });
        } else {
          console.log(`[App] Auto-fetch failed for: ${track.title}`);
        }
      });
    }
  }, [playerState.currentTrack?.id, handleUpdateTrack]);

  const handleUpdateTheme = (newConfig: Partial<ThemeConfig>) => setTheme(prev => ({ ...prev, ...newConfig }));

  const handleUpdateArtist = (artist: string, data: Partial<ArtistMetadata>, overwrite = false) => {
    setArtistMetadata(prev => {
        const existing = prev[artist] || {};
        if (overwrite) return { ...prev, [artist]: { ...existing, ...data } };
        
        // Merge only missing fields
        return { 
            ...prev, 
            [artist]: {
                ...existing,
                avatar: existing.avatar || data.avatar,
                banner: existing.banner || data.banner,
                bio: existing.bio || data.bio
            }
        };
    });
  };

  const handleGoToArtist = async (artist: string) => {
      setPreviousView(playerState.currentView);
      setSelectedArtist(artist);
      setPlayerState(prev => ({ ...prev, currentView: 'artist_detail' }));
      
      // Fetch metadata if avatar OR bio is missing
      const existingMeta = artistMetadata[artist];
      if (isElectron() && (!existingMeta?.avatar || !existingMeta?.bio)) {
          const { ipcRenderer } = (window as any).require('electron');
          const meta = await ipcRenderer.invoke('get-artist-metadata', artist);
          if (meta) handleUpdateArtist(artist, meta, false); // Use merge mode
      }
  };

  useEffect(() => {
    if (!isLoaded || !isElectron() || tracks.length === 0) return;

    const fetchTopArtistsMetadata = async () => {
      const artistCounts = new Map<string, number>();
      tracks.forEach(t => {
        const splitNames = t.artist.split(ARTIST_SPLIT_REGEX).map(n => n.trim()).filter(Boolean);
        splitNames.forEach(name => {
          artistCounts.set(name, (artistCounts.get(name) || 0) + (t.playCount || 0));
        });
      });
      
      const topArtists = Array.from(artistCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name]) => name);

      const { ipcRenderer } = (window as any).require('electron');
      
      for (const artist of topArtists) {
        const existingMeta = artistMetadata[artist];
        if (!existingMeta?.avatar || !existingMeta?.bio) {
          try {
            const meta = await ipcRenderer.invoke('get-artist-metadata', artist);
            if (meta) {
              setArtistMetadata(prev => ({
                ...prev,
                [artist]: { ...prev[artist], ...meta }
              }));
            }
          } catch (e) {
            console.error(`Failed to fetch metadata for ${artist}:`, e);
          }
        }
      }
    };

    fetchTopArtistsMetadata();
  }, [isLoaded, tracks.length]); // Only run when tracks are loaded or added

  const handleGoToAlbum = (album: string) => {
      setPreviousView(playerState.currentView);
      setSelectedAlbum(album);
      setPlayerState(prev => ({ ...prev, currentView: 'album_detail' }));
  };

  const handleOnboardingComplete = (profile: Partial<UserProfile>, themeUpdate: Partial<ThemeConfig>) => {
    setUserProfile(prev => ({ ...prev, ...profile, onboardingDone: true }));
    setTheme(prev => ({ ...prev, ...themeUpdate }));
  };

  const handleSeek = (time: number) => { 
    audioRef.current.currentTime = time; 
  };
  const handleVolume = (vol: number) => { 
    audioRef.current.volume = vol; 
    setPlayerState(prev => ({ ...prev, volume: vol })); 
    localStorage.setItem('glass_music_volume', vol.toString());
  };
  const toggleShuffle = () => {
    setPlayerState(prev => {
        const newState = !prev.isShuffled;
        if (newState) {
            shuffledQueueRef.current = []; // Will be refilled on next
        }
        return { ...prev, isShuffled: newState };
    });
  };

  const toggleRepeat = () => {
    setPlayerState(prev => ({ ...prev, isRepeating: !prev.isRepeating }));
  };

  const handleToggleLike = (id: string, trackData?: Track) => {
      const trackInLibrary = tracks.find(t => t.id === id);
      if (trackInLibrary) {
          handleUpdateTrack(id, { isLiked: !trackInLibrary.isLiked });
      } else {
          // Если трека нет в библиотеке (например, из поиска Spotify), добавляем его
          const trackToAdd = trackData || (playerStateRef.current.currentTrack?.id === id ? playerStateRef.current.currentTrack : null);
          if (trackToAdd) {
              const newTrack = { ...trackToAdd, isLiked: true };
              setTracks(prev => sortTracks([...prev, newTrack]));
              if (playerStateRef.current.currentTrack?.id === id) {
                  setPlayerState(prev => ({ ...prev, currentTrack: newTrack }));
              }
          }
      }
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
          artist: metadata.artist || "", album: metadata.album || "",
          duration: 0, coverUrl: metadata.coverUrl || generateMockCover(file.name),
          fileUrl: URL.createObjectURL(file), path: (file as any).path, isLiked: false, 
          year: new Date().getFullYear().toString(), source: 'local', addedAt: Date.now()
        });
    }
    setTracks(prev => sortTracks([...prev, ...newTracks]));
  };

  return (
    <div className="relative w-full h-screen flex overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] selection:text-[var(--text-main)]">
      {theme.seasonalTheme && <SnowEffect />}
      <Background config={theme} isLight={getEffectiveTheme() === 'light'} analyser={analyser} isPlaying={playerState.playbackState === PlaybackState.PLAYING} />
      <Visualizer analyser={analyser} isPlaying={playerState.playbackState === PlaybackState.PLAYING} accentColor={theme.accentColor} enabled={theme.animateBackground} />
      
      {!userProfile.onboardingDone && isLoaded && (
        <OnboardingModal onComplete={handleOnboardingComplete} accentColor={theme.accentColor} t={t} />
      )}

      <Sidebar 
        onImportClick={() => fileInputRef.current?.click()} onSettingsClick={() => setSettingsOpen(true)}
        onProfileClick={() => setProfileOpen(true)} currentView={playerState.currentView}
        onChangeView={(view) => { setPlayerState(prev => ({ ...prev, currentView: view })); setSidebarOpen(true); }}
        isOpen={sidebarOpen} accentColor={theme.accentColor} searchQuery={searchQuery}
        onSearchChange={setSearchQuery} enableGlass={theme.enableGlass} user={userProfile} t={t}
        playlists={playlists}
        selectedPlaylist={selectedPlaylist}
        onSelectPlaylist={(id) => {
          setSelectedPlaylist(id);
          setPlayerState(prev => ({ ...prev, currentView: 'playlist_detail' }));
          setSidebarOpen(true);
        }}
        onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
      />
      <div className={`flex-1 flex flex-col relative z-10 ${theme.enableGlass ? 'glass-panel' : 'bg-[var(--panel-bg)]'} border-y-0 border-r-0 rounded-l-3xl overflow-hidden shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${!sidebarOpen ? 'ml-0 rounded-l-none' : 'ml-2'}`}>
        <MainView 
          tracks={tracks} currentTrack={playerState.currentTrack} playbackState={playerState.playbackState}
          onPlay={handlePlay} onShuffleAll={(q) => { setPlayerState(prev => ({ ...prev, isShuffled: true, queue: q })); if (q[0]) handlePlay(q[0], q); }}
          currentView={playerState.currentView} selectedArtist={selectedArtist} selectedAlbum={selectedAlbum}
          onUpdateTrack={handleUpdateTrack} onDeleteTrack={handleDeleteTrack} onGoToArtist={handleGoToArtist}
          onGoToAlbum={handleGoToAlbum} onBack={() => setPlayerState(prev => ({ ...prev, currentView: previousView }))}
          accentColor={theme.accentColor} artistMetadata={artistMetadata} onUpdateArtist={handleUpdateArtist}
          searchQuery={searchQuery} onRequestFileUnlock={() => { audioRef.current.pause(); audioRef.current.src = ""; }}
          onToggleLike={handleToggleLike} enableGlass={theme.enableGlass} t={t} onTranslate={translateText}
          playlists={playlists} selectedPlaylist={selectedPlaylist}
          onChangeView={(view) => { setPlayerState(prev => ({ ...prev, currentView: view })); }}
          onDeletePlaylist={(id) => {
            setPlaylists(prev => prev.filter(p => p.id !== id));
            if (selectedPlaylist === id) setSelectedPlaylist(null);
          }}
          onUpdatePlaylist={(id, data) => {
            setPlaylists(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
          }}
          onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
          onOpenSelectTracks={() => setIsSelectTracksOpen(true)}
        />
        <PlayerControls 
          currentTrack={playerState.currentTrack} playbackState={playerState.playbackState}
          onPlayPause={() => playerState.currentTrack ? handlePlay(playerState.currentTrack) : null}
          onNext={() => handleNext(false)} onPrev={handlePrev} currentTime={playerState.currentTime} duration={playerState.duration}
          onSeek={handleSeek} volume={playerState.volume} onVolumeChange={handleVolume} isShuffled={playerState.isShuffled}
          isRepeating={playerState.isRepeating} onToggleRepeat={toggleRepeat}
          onToggleShuffle={toggleShuffle} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleFullScreen={() => setFullScreenMode('cover')} onOpenLyrics={() => setFullScreenMode('lyrics')}
          onToggleLike={handleToggleLike} accentColor={theme.accentColor} onGoToArtist={handleGoToArtist}
          onGoToAlbum={handleGoToAlbum} playerStyle={theme.playerStyle} enableGlass={theme.enableGlass} t={t}
        />
      </div>
      {fullScreenMode !== 'none' && playerState.currentTrack && (
        <FullScreenPlayer 
            track={playerState.currentTrack} playbackState={playerState.playbackState}
            currentTime={playerState.currentTime} duration={playerState.duration}
            volume={playerState.volume} isShuffled={playerState.isShuffled} isRepeating={playerState.isRepeating}
            onPlayPause={() => handlePlay(playerState.currentTrack!)} onNext={() => handleNext(false)} onPrev={handlePrev}
            onSeek={handleSeek} onVolumeChange={handleVolume} onToggleShuffle={toggleShuffle} onToggleRepeat={toggleRepeat}
            onToggleLike={handleToggleLike} onClose={() => setFullScreenMode('none')}
            accentColor={theme.accentColor} initialMode={fullScreenMode === 'lyrics' ? 'lyrics' : 'cover'}
            enableGlass={theme.enableGlass}
        />
      )}
      <SettingsModal 
        isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} config={theme} 
        onUpdate={handleUpdateTheme} onClearLibrary={handleClearLibrary} 
        userProfile={userProfile} onUpdateProfile={(data) => setUserProfile(prev => ({ ...prev, ...data }))} t={t}
      />
      <ProfileModal 
        isOpen={profileOpen} onClose={() => setProfileOpen(false)} profile={userProfile} 
        onUpdate={(data) => setUserProfile(prev => ({ ...prev, ...data }))} accentColor={theme.accentColor} t={t} enableGlass={theme.enableGlass}
      />
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreate={(name, coverUrl) => {
          const newPlaylist: Playlist = {
            id: Date.now().toString(),
            name,
            coverUrl,
            trackIds: [],
            createdAt: Date.now()
          };
          setPlaylists(prev => [...prev, newPlaylist]);
          setSelectedPlaylist(newPlaylist.id);
          setPlayerState(prev => ({ ...prev, currentView: 'playlist_detail' }));
        }}
        accentColor={theme.accentColor}
        enableGlass={theme.enableGlass}
        t={t}
      />
      <SelectTracksModal
        isOpen={isSelectTracksOpen}
        onClose={() => setIsSelectTracksOpen(false)}
        tracks={tracks}
        playlistTrackIds={playlists.find(p => p.id === selectedPlaylist)?.trackIds || []}
        onAddTracks={(trackIds) => {
          if (selectedPlaylist) {
            setPlaylists(prev => prev.map(p => {
              if (p.id === selectedPlaylist) {
                return { ...p, trackIds: [...p.trackIds, ...trackIds] };
              }
              return p;
            }));
          }
        }}
        accentColor={theme.accentColor}
        enableGlass={theme.enableGlass}
        t={t}
      />
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="audio/*" className="hidden" />
    </div>
  );
};

export default App;