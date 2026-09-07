
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MainView from './components/MainView';
import PlayerControls from './components/PlayerControls';
import FullScreenPlayer from './components/FullScreenPlayer';
import SettingsModal from './components/SettingsModal';
import OnboardingModal from './components/OnboardingModal';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import LayoutEditorOverlay from './components/LayoutEditorOverlay';
import SelectTracksModal from './components/SelectTracksModal';
import YouTubeModal from './components/YouTubeModal';
import SpotifyModal from './components/SpotifyModal';
import Background from './components/Background';
import Visualizer from './components/Visualizer';
import SnowEffect from './components/SnowEffect';
import TitleBar from './components/TitleBar';
import { Track, PlaybackState, PlayerState, ViewType, ThemeConfig, ArtistMetadata, UserProfile, Playlist, AudioEffect } from './types';
import { generateMockCover, generateMockCoverPng, parseFileMetadata, sortTracks, fetchLyricsFromLRCLIB, isJunkLyrics } from './utils';
import { translations, TranslationKey } from './translations';
import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'glass_music_library_v1';
const THEME_KEY = 'glass_music_theme_v1';
const ARTIST_DATA_KEY = 'glass_music_artists_v1';
const USER_PROFILE_KEY = 'glass_music_profile_v1';
const PLAYLISTS_KEY = 'glass_music_playlists_v1';
const SESSION_KEY = 'glass_music_session_v1';

const DEFAULT_THEME: ThemeConfig = {
  accentColor: '#db2777', 
  backgroundType: 'liquid',
  backgroundSource: null,
  blurLevel: 24,
  brightness: 0.4,
  enableGlass: true, 
  seasonalTheme: false, 
  playerStyle: 'split',
  themeMode: 'system',
  animateBackground: true,
  sidebarPosition: 'left',
  playerDock: 'bottom',
  speedUpRate: 1.25,
  slowedRate: 0.85,
  savePlaybackSession: true
};

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  avatarUrl: null,
  bannerUrl: null,
  onboardingDone: false,
  language: 'system'
};

const ARTIST_SPLIT_REGEX = /\s*(?:,|;|feat\.?|ft\.?|&|\/|featuring)\s+/i;

const formatTrackMediaUrl = (filePath: string, port?: number) => {
  if (!filePath) return '';
  const cleanPath = filePath.replace(/\\/g, '/');
  const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  
  const encodedPath = formattedPath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  if (port && port > 0) {
    return `http://127.0.0.1:${port}${encodedPath}`;
  }
  return `file://${encodedPath}`;
};

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artistMetadata, setArtistMetadata] = useState<Record<string, ArtistMetadata>>({});
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'settings' | 'about' | 'changelog'>('settings');
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [isSelectTracksOpen, setIsSelectTracksOpen] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState<'none' | 'cover' | 'lyrics'>('none');
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [viewHistory, setViewHistory] = useState<{view: ViewType, artist: string | null, album: string | null}[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('dark');
  const [systemLocale, setSystemLocale] = useState('ru');

  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTrack: null, queue: [], playbackState: PlaybackState.PAUSED,
    volume: 0.8, currentTime: 0, duration: 0, isShuffled: false,
    isRepeating: false, currentView: 'listen_now', history: [],
    audioEffect: 'normal'
  });

  const audioRef = useRef<HTMLAudioElement>(new window.Audio());
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqBandsRef = useRef<BiquadFilterNode[]>([]);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const reverbGainNodeRef = useRef<GainNode | null>(null);
  const bassNodeRef = useRef<BiquadFilterNode | null>(null);
  const trebleNodeRef = useRef<BiquadFilterNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const shuffledQueueRef = useRef<string[]>([]);
  const historyRef = useRef<string[]>([]);
  const forwardHistoryRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const lastListenTimeLoggedRef = useRef<number>(0);
  
   
  const tracksRef = useRef<Track[]>([]);
  const queueRef = useRef<Track[]>([]);
  const playerStateRef = useRef(playerState);
  const themeRef = useRef(theme);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { 
    queueRef.current = playerState.queue; 
    playerStateRef.current = playerState;
  }, [playerState]);

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

    const preset = theme.themePreset || 'liquid';
    document.documentElement.classList.remove('theme-tokyo_night', 'theme-win95', 'theme-catppuccin', 'theme-nord', 'theme-cyberpunk', 'theme-oled');
    if (preset !== 'liquid') {
      document.documentElement.classList.add(`theme-${preset}`);
    }
  }, [getEffectiveTheme(), theme.themePreset]);

  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setSystemTheme(prefersDark ? 'dark' : 'light');
    setSystemLocale(navigator.language.split('-')[0] || 'en');
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
     
  }, [playerState.playbackState]);

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      const audio = audioRef.current;
      audio.preservesPitch = false;
      (audio as any).mozPreservesPitch = false;
      (audio as any).webkitPreservesPitch = false;
      
      const source = ctx.createMediaElementSource(audio);
      sourceNodeRef.current = source;

       
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

       
      const bassNode = ctx.createBiquadFilter();
      bassNode.type = 'lowshelf';
      bassNode.frequency.value = 200;
      bassNode.gain.value = theme.bassLevel || 0;
      bassNodeRef.current = bassNode;

      const trebleNode = ctx.createBiquadFilter();
      trebleNode.type = 'highshelf';
      trebleNode.frequency.value = 3000;
      trebleNode.gain.value = theme.trebleLevel || 0;
      trebleNodeRef.current = trebleNode;

       
      let currentConnection: AudioNode = source;
      bands.forEach(band => {
        currentConnection.connect(band);
        currentConnection = band;
      });
      currentConnection.connect(bassNode);
      bassNode.connect(trebleNode);
      trebleNode.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      
       
      if (theme.eqBands) {
        theme.eqBands.forEach((gain, i) => {
          if (bands[i]) bands[i].gain.value = gain;
        });
      }
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e);
    }
  }, [theme.eqBands, theme.bassLevel, theme.trebleLevel]);

  useEffect(() => {
    if (eqBandsRef.current.length > 0 && theme.eqBands) {
      theme.eqBands.forEach((gain, i) => {
        if (eqBandsRef.current[i]) {
          eqBandsRef.current[i].gain.value = gain;
        }
      });
    }
  }, [theme.eqBands]);

  useEffect(() => {
    if (reverbGainNodeRef.current) {
        reverbGainNodeRef.current.gain.value = theme.reverbLevel || 0;
    }
    if (bassNodeRef.current) {
        bassNodeRef.current.gain.value = theme.bassLevel || 0;
    }
    if (trebleNodeRef.current) {
        trebleNodeRef.current.gain.value = theme.trebleLevel || 0;
    }
  }, [theme.reverbLevel, theme.bassLevel, theme.trebleLevel]);

  useEffect(() => {
    const audio = audioRef.current;
    const currentEffect = theme.globalAudioEffect && theme.globalAudioEffect !== 'none' 
        ? theme.globalAudioEffect 
        : playerState.audioEffect;
        
    if (currentEffect === 'slowed') {
      audio.playbackRate = theme.slowedRate || 0.85;
    } else if (currentEffect === 'spedup') {
      audio.playbackRate = theme.speedUpRate || 1.25;
    } else {
      audio.playbackRate = 1.0;
    }
  }, [theme.globalAudioEffect, theme.slowedRate, theme.speedUpRate, playerState.audioEffect]);

  const translateText = async (text: string): Promise<string> => {
    if (!text) return "";
    const cleanText = text.trim();
    if (!cleanText) return "";

    const targetLang = getEffectiveLanguage() === 'ru' ? 'ru' : 'en';

     
    const libreTranslateUrls = [
      'https://translate.terraprint.co/translate',
      'https://libretranslate.de/translate',
      'https://translate.argosopentech.com/translate'
    ];

    for (const ltUrl of libreTranslateUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(ltUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: cleanText,
            source: 'auto',
            target: targetLang,
            format: 'text'
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data && data.translatedText) {
            return data.translatedText;
          }
        }
      } catch (e) {
         
      }
    }

     
    try {
      const maxChunk = 1400;
      const chunks: string[] = [];
      for (let i = 0; i < cleanText.length; i += maxChunk) {
        chunks.push(cleanText.substring(i, i + maxChunk));
      }
      
      const translatedChunks = await Promise.all(chunks.map(async (chunk) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data[0])) {
            return data[0].map((item: any) => item[0]).filter(Boolean).join('');
          }
        }
        return chunk;
      }));
      
      const fullTranslated = translatedChunks.join('');
      if (fullTranslated && fullTranslated !== cleanText) {
        return fullTranslated;
      }
    } catch (e) {
      console.warn("GTX translation failed, trying MyMemory...", e);
    }

     
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText.slice(0, 500))}&langpair=en|${targetLang}`;
      const res = await fetch(myMemoryUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.responseData && data.responseData.translatedText) {
          return data.responseData.translatedText;
        }
      }
    } catch (e) {
      console.error("MyMemory translation error:", e);
    }

     
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const targetLangName = targetLang === 'ru' ? 'Russian' : 'English';
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Translate the following text to ${targetLangName}. Keep the meaning and tone. Only return the translated text:\n\n${cleanText}`,
        });
        if (response.text) return response.text;
      } catch (e) {
        console.error("Translation error:", e);
      }
    }

    return text;
  };

  const loadData = async () => {
      try {
          let savedTracks, savedTheme, savedArtists, savedProfile, savedPlaylists, savedSession;
          const isDesktop = () => (window as any).require !== undefined;
          if (isDesktop()) {
              const ipcRenderer = (window as any).require('electron').ipcRenderer;
              [savedTracks, savedTheme, savedArtists, savedProfile, savedPlaylists, savedSession] = await Promise.all([
                ipcRenderer.invoke('get-local-data', { key: STORAGE_KEY }),
                ipcRenderer.invoke('get-local-data', { key: THEME_KEY }),
                ipcRenderer.invoke('get-local-data', { key: ARTIST_DATA_KEY }),
                ipcRenderer.invoke('get-local-data', { key: USER_PROFILE_KEY }),
                ipcRenderer.invoke('get-local-data', { key: PLAYLISTS_KEY }),
                ipcRenderer.invoke('get-local-data', { key: SESSION_KEY })
              ]);
          } else {
              savedTracks = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
              savedTheme = JSON.parse(localStorage.getItem(THEME_KEY) || 'null');
              savedArtists = JSON.parse(localStorage.getItem(ARTIST_DATA_KEY) || 'null');
              savedProfile = JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || 'null');
              savedPlaylists = JSON.parse(localStorage.getItem(PLAYLISTS_KEY) || 'null');
              savedSession = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
          }

          if (savedTracks) {
              const convertFileSrc = (path: string) => formatTrackMediaUrl(path);
              const restored = (Array.isArray(savedTracks) ? savedTracks : []).map(t => {
                  let fixedCover = t.coverUrl;
                  if (fixedCover) {
                      if (fixedCover.startsWith('asset://localhost/')) {
                          const rawPath = decodeURIComponent(fixedCover.replace('asset://localhost/', ''));
                          fixedCover = convertFileSrc(rawPath);
                      }
                  }
                  
                  if (t.path && !t.fileUrl) {
                      return { ...t, fileUrl: convertFileSrc(t.path), coverUrl: fixedCover };
                  }
                  return { ...t, coverUrl: fixedCover };
              });
              const sortedRestored = sortTracks(restored.filter(t => t.fileUrl || t.path));
              setTracks(sortedRestored);

               
              if (savedTheme?.savePlaybackSession !== false && savedSession && savedSession.currentTrackId) {
                  const sessionTrack = sortedRestored.find(t => t.id === savedSession.currentTrackId);
                  if (sessionTrack) {
                      const restoredQueue = savedSession.queueIds && Array.isArray(savedSession.queueIds)
                          ? savedSession.queueIds.map((id: string) => sortedRestored.find(t => t.id === id)).filter(Boolean) as Track[]
                          : sortedRestored;
                      const restoredPos = typeof savedSession.currentTime === 'number' ? savedSession.currentTime : 0;
                      
                      setPlayerState(prev => ({
                          ...prev,
                          currentTrack: sessionTrack,
                          currentTime: restoredPos,
                          duration: sessionTrack.duration || 0,
                          queue: restoredQueue.length > 0 ? restoredQueue : sortedRestored,
                          playbackState: PlaybackState.PAUSED
                      }));

                      const audio = audioRef.current;
                      let src = sessionTrack.fileUrl;
                      if (sessionTrack.path && isDesktop()) {
                          try {
                              const ipcRenderer = (window as any).require('electron').ipcRenderer;
                              const port = ipcRenderer.sendSync('get-media-port-sync');
                              if (port) {
                                  src = formatTrackMediaUrl(sessionTrack.path, port);
                              }
                          } catch (e) {}
                      }
                      if (src) {
                          audio.src = src;
                          audio.load();
                          const setPosOnLoad = () => {
                              if (restoredPos > 0) {
                                  audio.currentTime = restoredPos;
                              }
                          };
                          audio.addEventListener('loadedmetadata', setPosOnLoad, { once: true });
                      }
                  }
              }

              if (isDesktop()) {
                   
                  setTimeout(async () => {
                      try {
                          const ipcRenderer = (window as any).require('electron').ipcRenderer;
                          const tracksToUpdate = restored.filter(t => t.path && (!t.coverUrl || t.coverUrl.startsWith('data:image/svg+xml') || t.coverUrl.startsWith('blob:')));
                          for (const t of tracksToUpdate) {
                              try {
                                  const meta = await ipcRenderer.invoke('read-id3-tags', { filePath: t.path });
                                  if (meta && meta.coverUrl) {
                                      setTracks(curr => curr.map(item => item.id === t.id ? { ...item, coverUrl: meta.coverUrl, albumArtist: meta.albumArtist || item.albumArtist, year: meta.year || item.year } : item));
                                  }
                              } catch (err) {}
                          }
                      } catch (e) {}
                  }, 1000);
              }
          }
          if (savedTheme) {
              setTheme({ ...DEFAULT_THEME, ...savedTheme });
              if (savedTheme.isShuffled !== undefined || savedTheme.isRepeating !== undefined) {
                  setPlayerState(prev => ({
                      ...prev,
                      isShuffled: savedTheme.isShuffled ?? prev.isShuffled,
                      isRepeating: savedTheme.isRepeating ?? prev.isRepeating
                  }));
              }
          }
          if (savedArtists) {
              const convertFileSrc = (path: string) => `file://${encodeURI(path.replace(/\\/g, '/'))}`;
              const fixedArtists: any = {};
              for (const key in savedArtists) {
                  const meta = savedArtists[key];
                  if (meta) {
                      let avatar = meta.avatar;
                      let banner = meta.banner;
                      if (avatar && avatar.startsWith('asset://localhost/')) {
                          avatar = convertFileSrc(decodeURIComponent(avatar.replace('asset://localhost/', '')));
                      }
                      if (banner && banner.startsWith('asset://localhost/')) {
                          banner = convertFileSrc(decodeURIComponent(banner.replace('asset://localhost/', '')));
                      }
                      fixedArtists[key] = { ...meta, avatar, banner };
                  }
              }
              setArtistMetadata(fixedArtists);
          }
          if (savedProfile) {
              const convertFileSrc = (path: string) => `file://${encodeURI(path.replace(/\\/g, '/'))}`;
              let avatarUrl = savedProfile.avatarUrl;
              let bannerUrl = savedProfile.bannerUrl;
              if (avatarUrl && avatarUrl.startsWith('asset://localhost/')) {
                  avatarUrl = convertFileSrc(decodeURIComponent(avatarUrl.replace('asset://localhost/', '')));
              }
              if (bannerUrl && bannerUrl.startsWith('asset://localhost/')) {
                  bannerUrl = convertFileSrc(decodeURIComponent(bannerUrl.replace('asset://localhost/', '')));
              }
              const fixedProfile = { ...DEFAULT_PROFILE, ...savedProfile, avatarUrl, bannerUrl };
              setUserProfile(fixedProfile);
              if (fixedProfile.syncFolders && fixedProfile.syncFolders.length > 0) {
                  scanFolders(fixedProfile.syncFolders);
              }
          }
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

   
  useEffect(() => {
    const isDesktop = () => (window as any).require !== undefined;
    if (isDesktop()) {
        const ipcRenderer = (window as any).require('electron').ipcRenderer;
        ipcRenderer.send('playback-state-changed', playerState.playbackState === PlaybackState.PLAYING ? 'playing' : 'paused');
    }
  }, [playerState.playbackState]);

   
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (playerState.currentTrack) {
        const { currentTrack } = playerState;
        const isDesktop = () => (window as any).require !== undefined;

         
        if (isDesktop() && currentTrack.path && (!currentTrack.coverUrl || currentTrack.coverUrl.startsWith('data:image/svg+xml') || currentTrack.coverUrl.startsWith('blob:'))) {
            try {
                const ipcRenderer = (window as any).require('electron').ipcRenderer;
                ipcRenderer.invoke('read-id3-tags', { filePath: currentTrack.path }).then((tags: any) => {
                    if (tags && tags.coverUrl && tags.coverUrl !== currentTrack.coverUrl) {
                        setTracks(curr => curr.map(item => item.id === currentTrack.id ? { ...item, coverUrl: tags.coverUrl } : item));
                        setPlayerState(prev => prev.currentTrack?.id === currentTrack.id ? { ...prev, currentTrack: { ...prev.currentTrack, coverUrl: tags.coverUrl } } : prev);
                    }
                }).catch(() => {});
            } catch (e) {}
        }

        const artworks: MediaImage[] = [];
        let coverSrc = currentTrack.coverUrl;
        
         
        if (isDesktop() && coverSrc && (coverSrc.startsWith('file://') || coverSrc.startsWith('/'))) {
            try {
                const fs = (window as any).require('fs');
                let localPath = coverSrc.replace(/^file:\/\//, '');
                if (process.platform === 'win32' && localPath.startsWith('/')) {
                    localPath = localPath.slice(1);
                }
                localPath = decodeURIComponent(localPath);
                if (fs.existsSync(localPath)) {
                    const buf = fs.readFileSync(localPath);
                    const isPng = localPath.toLowerCase().endsWith('.png');
                    const mime = isPng ? 'image/png' : 'image/jpeg';
                    coverSrc = `data:${mime};base64,${buf.toString('base64')}`;
                }
            } catch (e) {}
        }

        if (coverSrc && typeof coverSrc === 'string' && coverSrc.trim().length > 0 && !coverSrc.startsWith('data:image/svg+xml')) {
            const isJpg = coverSrc.toLowerCase().includes('.jpg') || coverSrc.toLowerCase().includes('.jpeg') || coverSrc.startsWith('data:image/jpeg');
            const mimeType = isJpg ? 'image/jpeg' : 'image/png';
            artworks.push({
                src: coverSrc,
                sizes: '512x512',
                type: mimeType
            });
            artworks.push({
                src: coverSrc,
                sizes: '256x256',
                type: mimeType
            });
            artworks.push({
                src: coverSrc,
                sizes: '128x128',
                type: mimeType
            });
            artworks.push({
                src: coverSrc,
                sizes: '96x96',
                type: mimeType
            });
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title || 'Unknown Title',
            artist: currentTrack.artist || 'Unknown Artist',
            album: currentTrack.album || 'Glass Music',
            artwork: artworks
        });

        navigator.mediaSession.playbackState = playerState.playbackState === PlaybackState.PLAYING ? 'playing' : 'paused';

         
        try {
            if (navigator.mediaSession.setPositionState && playerState.duration > 0 && !Number.isNaN(playerState.duration) && Number.isFinite(playerState.duration)) {
                const pos = Math.min(Math.max(playerState.currentTime || 0, 0), playerState.duration);
                navigator.mediaSession.setPositionState({
                    duration: playerState.duration,
                    playbackRate: audioRef.current.playbackRate || 1,
                    position: pos
                });
            }
        } catch (error) {
             
        }
    } else {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
    }
  }, [playerState.currentTrack, playerState.playbackState, playerState.currentTime, playerState.duration]);

   
  useEffect(() => {
    if (!isLoaded) return;
    const currentVersion = "3.0.0";
    const lastVersion = localStorage.getItem('glass_music_last_version');
    if (lastVersion !== currentVersion) {
        setSettingsInitialView('changelog');
        setSettingsOpen(true);
        localStorage.setItem('glass_music_last_version', currentVersion);
    }
  }, [isLoaded]);

   


  const handleUpdateTrack = useCallback((id: string, data: Partial<Track>) => {
    setTracks(prev => {
        const track = prev.find(t => t.id === id);
        
        const metadataChanged = ['title', 'artist', 'album', 'albumArtist', 'year', 'lyrics', 'coverUrl'].some(key => key in data && data[key as keyof Track] !== track?.[key as keyof Track]);

        const isDesktop = () => (window as any).require !== undefined;
        if (metadataChanged && track && track.path && isDesktop()) {
            try {
                const ipcRenderer = (window as any).require('electron').ipcRenderer;
                ipcRenderer.invoke('write-id3-tags', { filePath: track.path, tags: { ...track, ...data } })
                    .then((result: any) => {
                        if (!result.success) {
                            console.error("Failed to write audio tags:", result.error);
                        } else {
                            console.log("Successfully wrote audio tags to", track.path);
                             
                            if (playerStateRef.current.currentTrack?.id === id) {
                                const audio = audioRef.current;
                                if (audio.error) {
                                    const port = ipcRenderer.sendSync('get-media-port-sync');
                                    const currentPos = playerStateRef.current.currentTime || 0;
                                    const wasPlaying = playerStateRef.current.playbackState === PlaybackState.PLAYING;
                                    audio.src = `${formatTrackMediaUrl(track.path, port)}?t=${Date.now()}`;
                                    audio.load();
                                    audio.currentTime = currentPos;
                                    if (wasPlaying) {
                                        audio.play().catch(console.error);
                                    }
                                }
                            }
                        }
                    })
                    .catch((err: any) => console.error("Electron error writing audio tags:", err));
            } catch (e) {
                console.error(e);
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

  const handleUpdateProfile = useCallback((data: Partial<UserProfile>) => {
    setUserProfile(prev => {
        const updated = { ...prev, ...data };
        const isDesktop = () => (window as any).require !== undefined;
        if (isDesktop()) {
            const ipcRenderer = (window as any).require('electron').ipcRenderer;
            ipcRenderer.invoke('save-local-data', { key: USER_PROFILE_KEY, data: updated }).catch(console.error);
        } else {
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated));
        }
        return updated;
    });
  }, []);

  const playTrackInternal = useCallback(async (track: Track, addToHistory = true) => {
    const currentTrack = playerStateRef.current.currentTrack;
    if (addToHistory && currentTrack) {
        historyRef.current.push(currentTrack.id);
        if (historyRef.current.length > 100) historyRef.current.shift();
        setPlayerState(prev => ({ ...prev, history: [...historyRef.current] }));
        forwardHistoryRef.current = [];  
    }

     
    audioRef.current.pause();

     
    handleUpdateTrack(track.id, { playCount: (track.playCount || 0) + 1 });
    
     
    setUserProfile(prev => {
        if (!prev) return prev;
        return {
            ...prev,
            stats: {
                ...prev.stats,
                totalListens: (prev.stats?.totalListens || 0) + 1,
                listeningTime: prev.stats?.listeningTime || 0,
                topArtists: prev.stats?.topArtists || {}
            }
        } as any;
    });

    let src = '';
    const isDesktop = () => (window as any).require !== undefined;
    if (isDesktop() && track.path) {
        try {
            const ipcRenderer = (window as any).require('electron').ipcRenderer;
            const port = ipcRenderer.sendSync('get-media-port-sync');
            src = formatTrackMediaUrl(track.path, port);
        } catch (e) {
            src = formatTrackMediaUrl(track.path);
        }
    } else {
        src = track.fileUrl || (track.path ? formatTrackMediaUrl(track.path) : '');
    }
    if (!src) return;
    
    const targetVolume = playerStateRef.current.volume;
    const audio = audioRef.current;
    
     
    if (audio.src && audio.src.startsWith('blob:') && audio.src !== src) {
        URL.revokeObjectURL(audio.src);
    }
    
     
    audio.pause();
    audio.src = src;
    audio.load();  
    audio.currentTime = 0;
    audio.volume = targetVolume;
    
     
    let currentEffect = themeRef.current.globalAudioEffect && themeRef.current.globalAudioEffect !== 'none' 
        ? themeRef.current.globalAudioEffect 
        : 'normal';
        
    if (currentEffect === 'slowed') {
      audio.playbackRate = themeRef.current.slowedRate || 0.85;
    } else if (currentEffect === 'spedup') {
      audio.playbackRate = themeRef.current.speedUpRate || 1.25;
    } else {
      audio.playbackRate = 1.0;
    }
    
    try {
      initAudioContext();
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
          playPromise.then(() => {
              if (audioContextRef.current?.state === 'suspended') {
                 audioContextRef.current.resume();
              }
          }).catch(err => {
              console.error("Playback prevented:", err);
              setPlayerState(prev => ({ 
                  ...prev, 
                  currentTrack: track, 
                  playbackState: PlaybackState.PAUSED,
                  audioEffect: currentEffect === 'normal' ? 'normal' : prev.audioEffect
              }));
          });
      }

      setPlayerState(prev => ({ 
          ...prev, 
          currentTrack: track, 
          playbackState: PlaybackState.PLAYING,
          audioEffect: currentEffect === 'normal' ? 'normal' : prev.audioEffect  
      }));
    } catch (err) { 
        console.error("Playback error:", err);
        setPlayerState(prev => ({ 
            ...prev, 
            currentTrack: track, 
            playbackState: PlaybackState.PAUSED,
            audioEffect: currentEffect === 'normal' ? 'normal' : prev.audioEffect
        }));
    }

     
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

    if (forwardHistoryRef.current.length > 0) {
        const nextId = forwardHistoryRef.current.pop();
        nextTrack = activeQueue.find(t => t.id === nextId) || tracksRef.current.find(t => t.id === nextId);
        if (nextTrack) {
            playTrackInternal(nextTrack, true);
            return;
        }
    }

    if (playerStateRef.current.isShuffled) {
        if (shuffledQueueRef.current.length === 0) {
             
            shuffledQueueRef.current = activeQueue
                .map(t => t.id)
                .filter(id => id !== current.id);
            
             
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
         if (current) forwardHistoryRef.current.push(current.id);
         const prevId = historyRef.current.pop();
         setPlayerState(prev => ({ ...prev, history: [...historyRef.current] }));
         const allTracks = tracksRef.current;
         const prevTrack = allTracks.find(t => t.id === prevId);
         if (prevTrack) {
             playTrackInternal(prevTrack, false);
             return;
         }
     }
     
      
     const activeQueue = queueRef.current.length > 0 ? queueRef.current : tracksRef.current;
     if (!current || activeQueue.length === 0) return;

     const currentIndex = activeQueue.findIndex(t => t.id === current.id);
     const prevIndex = (currentIndex - 1 + activeQueue.length) % activeQueue.length;
     playTrackInternal(activeQueue[prevIndex]);
  }, []);

  const handlePlayPause = useCallback(() => {
    const state = playerStateRef.current;
    if (state.playbackState === PlaybackState.PLAYING) {
        audioRef.current.pause();
        setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PAUSED }));
    } else if (state.currentTrack) {
        audioRef.current.play().then(() => {
            setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PLAYING }));
        }).catch(console.error);
    }
  }, []);

  const handlePlay = useCallback(async (track: Track, newQueue?: Track[]) => {
    if (playerStateRef.current.currentTrack?.id === track.id) {
        const audio = audioRef.current;
        if (playerStateRef.current.playbackState === PlaybackState.PLAYING) {
           
          audio.pause();
          setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PAUSED }));
        } else {
           
          initAudioContext();
          const playPromise = audio.play();
          if (playPromise !== undefined) {
             playPromise.then(() => {
                 if (audioContextRef.current?.state === 'suspended') {
                    audioContextRef.current.resume();
                 }
             }).catch(err => {
                 console.error("Playback prevented in toggle:", err);
             });
          }
          setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PLAYING }));
        }
        return;
    }

    if (newQueue) {
        setPlayerState(prev => ({ ...prev, queue: newQueue }));
        queueRef.current = newQueue;
        shuffledQueueRef.current = [];  
    }
    
    await playTrackInternal(track);
  }, [playTrackInternal]);

  useEffect(() => {
    const isDesktop = () => (window as any).require !== undefined;
    if (isDesktop()) {
        const ipcRenderer = (window as any).require('electron').ipcRenderer;
        
        ipcRenderer.on('media-play-pause', handlePlayPause);
        ipcRenderer.on('media-next-track', handleNext);
        ipcRenderer.on('media-previous-track', handlePrev);

        return () => {
            ipcRenderer.removeListener('media-play-pause', handlePlayPause);
            ipcRenderer.removeListener('media-next-track', handleNext);
            ipcRenderer.removeListener('media-previous-track', handlePrev);
        };
    }
  }, [handleNext, handlePrev, handlePlayPause]);

  useEffect(() => {
    const audio = audioRef.current;
    
    const onEnded = () => {
        console.log("Track ended. Moving to next.");
        handleNext(true);
    };
    const onTimeUpdate = () => {
        if (Math.abs(playerStateRef.current.currentTime - audio.currentTime) > 0.25) {
            setPlayerState(prev => ({ ...prev, currentTime: audio.currentTime }));
        }
        
         
        const now = Date.now();
        if (playerStateRef.current.playbackState === PlaybackState.PLAYING && now - lastListenTimeLoggedRef.current >= 30000) {
            const elapsedSeconds = Math.round((now - (lastListenTimeLoggedRef.current || (now - 30000))) / 1000);
            lastListenTimeLoggedRef.current = now;
            setUserProfile(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    stats: {
                        ...prev.stats,
                        totalListens: prev.stats?.totalListens || 0,
                        listeningTime: (prev.stats?.listeningTime || 0) + (elapsedSeconds > 0 ? elapsedSeconds : 30),
                        topArtists: prev.stats?.topArtists || {}
                    }
                };
            });
        }
    };
    const onDurationChange = () => {
        if (!Number.isNaN(audio.duration) && audio.duration !== Infinity) {
            setPlayerState(prev => ({ ...prev, duration: audio.duration }));
        }
    };
    const onError = (e: any) => {
        console.error("Audio element error:", audio.error);
        const currentTrack = playerStateRef.current.currentTrack;
        const currentPos = playerStateRef.current.currentTime || 0;
        const wasPlaying = playerStateRef.current.playbackState === PlaybackState.PLAYING;
        const isDesktop = () => typeof window !== 'undefined' && (window as any).require !== undefined;

         
        if (currentTrack && isDesktop() && currentTrack.path) {
            try {
                const ipcRenderer = (window as any).require('electron').ipcRenderer;
                const port = ipcRenderer.sendSync('get-media-port-sync');
                if (port) {
                    console.log("Auto-recovering audio playback stream...");
                    const recoveredSrc = `${formatTrackMediaUrl(currentTrack.path, port)}?t=${Date.now()}`;
                    setTimeout(() => {
                        audio.src = recoveredSrc;
                        audio.load();
                        audio.currentTime = currentPos;
                        if (wasPlaying) {
                            audio.play().then(() => {
                                setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PLAYING }));
                            }).catch(console.error);
                        }
                    }, 200);
                    return;
                }
            } catch (recoveryErr) {
                console.error("Recovery failed:", recoveryErr);
            }
        }
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
            const shouldSaveSession = theme.savePlaybackSession !== false;
            const sessionToSave = (shouldSaveSession && playerState.currentTrack) ? {
                currentTrackId: playerState.currentTrack.id,
                currentTime: audioRef.current ? (audioRef.current.currentTime || playerState.currentTime || 0) : 0,
                queueIds: playerState.queue.map(t => t.id)
            } : null;

            const isDesktop = () => (window as any).require !== undefined;
            if (isDesktop()) {
                const ipcRenderer = (window as any).require('electron').ipcRenderer;
                await Promise.all([
                    ipcRenderer.invoke('save-local-data', { key: STORAGE_KEY, data: tracksToSave }),
                    ipcRenderer.invoke('save-local-data', { key: THEME_KEY, data: theme }),
                    ipcRenderer.invoke('save-local-data', { key: ARTIST_DATA_KEY, data: artistMetadata }),
                    ipcRenderer.invoke('save-local-data', { key: USER_PROFILE_KEY, data: userProfile }),
                    ipcRenderer.invoke('save-local-data', { key: PLAYLISTS_KEY, data: playlists }),
                    sessionToSave 
                      ? ipcRenderer.invoke('save-local-data', { key: SESSION_KEY, data: sessionToSave }) 
                      : ipcRenderer.invoke('save-local-data', { key: SESSION_KEY, data: null })
                ]);
            } else {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tracksToSave));
                localStorage.setItem(THEME_KEY, JSON.stringify(theme));
                localStorage.setItem(ARTIST_DATA_KEY, JSON.stringify(artistMetadata));
                localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
                localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
                if (sessionToSave) {
                  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionToSave));
                } else {
                  localStorage.removeItem(SESSION_KEY);
                }
            }
        } catch (e) { console.error("Save error:", e); }
    }, 1000);

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [tracks, theme, artistMetadata, userProfile, playlists, isLoaded]);

  const [isRefetchingLyrics, setIsRefetchingLyrics] = useState(false);

  const handleRefetchLyrics = useCallback(async (track: Track) => {
    if (!track) return;
    setIsRefetchingLyrics(true);
    const lyrics = await fetchLyricsFromLRCLIB(track.artist, track.title);
    setIsRefetchingLyrics(false);
    if (lyrics && !isJunkLyrics(lyrics)) {
      handleUpdateTrack(track.id, { lyrics });
    } else {
      alert(t('lyrics_not_found'));
    }
  }, [handleUpdateTrack, t]);

  useEffect(() => {
    const track = playerState.currentTrack;
    if (track && (!track.lyrics || isJunkLyrics(track.lyrics))) {
      console.log(`[App] Auto-fetching lyrics for: ${track.artist} - ${track.title}`);
      fetchLyricsFromLRCLIB(track.artist, track.title).then(lyrics => {
        if (lyrics && !isJunkLyrics(lyrics)) {
          console.log(`[App] Auto-fetch success for: ${track.title}`);
          handleUpdateTrack(track.id, { lyrics });
        } else {
          console.log(`[App] Auto-fetch failed or returned junk for: ${track.title}`);
        }
      });
    }
  }, [playerState.currentTrack?.id, handleUpdateTrack]);

  const handleUpdateTheme = (newConfig: Partial<ThemeConfig>) => {
    setTheme(prev => {
        const next = { ...prev, ...newConfig };
         
        const isDesktop = () => (window as any).require !== undefined;
        if (isDesktop()) {
            const ipcRenderer = (window as any).require('electron').ipcRenderer;
            ipcRenderer.send('save-local-data-sync', { key: THEME_KEY, data: next });
        }
        return next;
    });
  };

  const handleUpdateArtist = (artist: string, data: Partial<ArtistMetadata>, overwrite = false) => {
    setArtistMetadata(prev => {
        const existing = prev[artist] || {};
        const newArtistData = overwrite 
            ? { ...existing, ...data }
            : {
                ...existing,
                avatar: existing.avatar || data.avatar,
                banner: existing.banner || data.banner,
                bio: existing.bio || data.bio
            };
        const newState = { ...prev, [artist]: newArtistData };
        
         
        const isDesktop = () => (window as any).require !== undefined;
        if (isDesktop()) {
            const ipcRenderer = (window as any).require('electron').ipcRenderer;
            ipcRenderer.invoke('save-local-data', { key: ARTIST_DATA_KEY, data: newState }).catch(console.error);
        } else {
            localStorage.setItem(ARTIST_DATA_KEY, JSON.stringify(newState));
        }
        
        return newState;
    });
  };

  const handleGoToArtist = async (artist: string) => {
      setViewHistory(prev => [...prev, { view: playerState.currentView, artist: selectedArtist, album: selectedAlbum }]);
      setSelectedArtist(artist);
      setPlayerState(prev => ({ ...prev, currentView: 'artist_detail' }));
      
       
      const existingMeta = artistMetadata[artist];
      const isDesktop = () => (window as any).require !== undefined;
      if (isDesktop() && (!existingMeta?.avatar || !existingMeta?.bio)) {
          try {
            const ipcRenderer = (window as any).require('electron').ipcRenderer;
            const meta = await ipcRenderer.invoke('get-artist-metadata', { artist, lastfmKey: import.meta.env.VITE_LASTFM_API_KEY });
            if (meta) handleUpdateArtist(artist, meta as any, false);
          } catch(e) {}
      }
  };

  const handleGoToAlbum = (album: string) => {
      setViewHistory(prev => [...prev, { view: playerState.currentView, artist: selectedArtist, album: selectedAlbum }]);
      setSelectedAlbum(album);
      setPlayerState(prev => ({ ...prev, currentView: 'album_detail' }));
  };

  const handleBack = () => {
      setViewHistory(prev => {
          if (prev.length === 0) {
              setPlayerState(p => ({ ...p, currentView: 'songs' }));
              return prev;
          }
          const newHistory = [...prev];
          const lastState = newHistory.pop()!;
          setSelectedArtist(lastState.artist);
          setSelectedAlbum(lastState.album);
          setPlayerState(p => ({ ...p, currentView: lastState.view }));
          return newHistory;
      });
  };

  useEffect(() => {
    const isDesktop = () => (window as any).require !== undefined;
    if (!isLoaded || !isDesktop() || tracks.length === 0) return;

    const fetchAllArtistsMetadata = async () => {
      const uniqueArtists = new Set<string>();
      tracks.forEach(t => {
        const splitNames = t.artist.split(ARTIST_SPLIT_REGEX).map(n => n.trim()).filter(Boolean);
        splitNames.forEach(name => uniqueArtists.add(name));
      });
      
      const artistsToFetch = Array.from(uniqueArtists);
      
      for (const artist of artistsToFetch) {
        const existingMeta = artistMetadata[artist];
        const isBadLastFmImage = (url: string | undefined) => url && (url.includes('last.fm') || url.includes('2a96cbd8b46e442fc41c2b86b821562f'));
        
        if (!existingMeta?.avatar || !existingMeta?.bio || isBadLastFmImage(existingMeta?.avatar) || isBadLastFmImage(existingMeta?.banner)) {
          try {
            const ipcRenderer = (window as any).require('electron').ipcRenderer;
            const meta = await ipcRenderer.invoke('get-artist-metadata', { artist, lastfmKey: import.meta.env.VITE_LASTFM_API_KEY });
            if (meta) {
              handleUpdateArtist(artist, meta as any, false);
            }
             
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (e) {
            console.error(`Failed to fetch metadata for ${artist}:`, e);
          }
        }
      }
    };

    fetchAllArtistsMetadata();
  }, [isLoaded, tracks.length]);  

  const handleOnboardingComplete = (profile: Partial<UserProfile>, themeUpdate: Partial<ThemeConfig>) => {
    setUserProfile(prev => ({ ...prev, ...profile, onboardingDone: true }));
    setTheme(prev => ({ ...prev, ...themeUpdate }));
  };

  const handleSeek = useCallback((time: number) => { 
    audioRef.current.currentTime = time; 
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const onPlay = () => handlePlayPause();
    const onPause = () => handlePlayPause();
    const onPrev = () => handlePrev();
    const onNext = () => handleNext(false);
    const onSeekTo = (details: MediaSessionActionDetails) => {
        if (details.seekTime !== undefined && !Number.isNaN(details.seekTime)) {
            handleSeek(details.seekTime);
        }
    };
    const onSeekBackward = (details: MediaSessionActionDetails) => {
        const skip = details.seekOffset || 10;
        handleSeek(Math.max((audioRef.current.currentTime || 0) - skip, 0));
    };
    const onSeekForward = (details: MediaSessionActionDetails) => {
        const skip = details.seekOffset || 10;
        handleSeek(Math.min((audioRef.current.currentTime || 0) + skip, audioRef.current.duration || 0));
    };
    const onStop = () => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setPlayerState(prev => ({ ...prev, playbackState: PlaybackState.PAUSED, currentTime: 0 }));
    };

    navigator.mediaSession.setActionHandler('play', onPlay);
    navigator.mediaSession.setActionHandler('pause', onPause);
    navigator.mediaSession.setActionHandler('previoustrack', onPrev);
    navigator.mediaSession.setActionHandler('nexttrack', onNext);
    navigator.mediaSession.setActionHandler('seekto', onSeekTo);
    navigator.mediaSession.setActionHandler('seekbackward', onSeekBackward);
    navigator.mediaSession.setActionHandler('seekforward', onSeekForward);
    navigator.mediaSession.setActionHandler('stop', onStop);

    return () => {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('stop', null);
    };
  }, [handlePlayPause, handlePrev, handleNext, handleSeek]);
  const handleVolume = (vol: number) => { 
    audioRef.current.volume = vol; 
    setPlayerState(prev => ({ ...prev, volume: vol })); 
    localStorage.setItem('glass_music_volume', vol.toString());
  };
  const toggleShuffle = () => {
    setPlayerState(prev => {
        const newState = !prev.isShuffled;
        if (newState) {
            shuffledQueueRef.current = [];  
        }
        setTheme(t => ({ ...t, isShuffled: newState }));
        return { ...prev, isShuffled: newState };
    });
  };

  const toggleRepeat = () => {
    setPlayerState(prev => {
        const newState = !prev.isRepeating;
        setTheme(t => ({ ...t, isRepeating: newState }));
        return { ...prev, isRepeating: newState };
    });
  };

  const toggleAudioEffect = () => {
    if (themeRef.current.globalAudioEffect && themeRef.current.globalAudioEffect !== 'none') {
         
        return;
    }
    
    setPlayerState(prev => {
      const effects: AudioEffect[] = ['normal', 'slowed', 'spedup'];
      const nextIndex = (effects.indexOf(prev.audioEffect) + 1) % effects.length;
      const nextEffect = effects[nextIndex];
      
      const audio = audioRef.current;
      if (nextEffect === 'slowed') {
        audio.playbackRate = theme.slowedRate || 0.85;
      } else if (nextEffect === 'spedup') {
        audio.playbackRate = theme.speedUpRate || 1.25;
      } else {
        audio.playbackRate = 1.0;
      }
      
      return { ...prev, audioEffect: nextEffect };
    });
  };

  const handleToggleLike = (id: string, trackData?: Track) => {
      const trackInLibrary = tracks.find(t => t.id === id);
      if (trackInLibrary) {
          handleUpdateTrack(id, { isLiked: !trackInLibrary.isLiked });
      } else {
           
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

  const getAudioDuration = (file: File | string): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      const isFile = typeof file !== 'string';
      const objectUrl = isFile ? URL.createObjectURL(file as File) : (file as string);
      
      let timeoutId: any;

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (isFile) URL.revokeObjectURL(objectUrl);
        audio.removeAttribute('src');
        audio.load();
      };

      timeoutId = setTimeout(() => {
        resolve(0);
        cleanup();
      }, 1500);  

      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        cleanup();
      });
      audio.addEventListener('error', () => {
        resolve(0);
        cleanup();
      });
      audio.src = objectUrl;
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files; if (!files) return;
    
    let batch: Track[] = [];
    const filesArray = Array.from(files);

    for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const isAudioType = file.type.startsWith('audio/');
        const isAudioExt = /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(file.name);
        if (!isAudioType && !isAudioExt) continue;
        
        try {
            const metadata = await parseFileMetadata(file);
            const filePath = (file as any).path;
            
            let fileUrl = '';
            const isDesktop = () => (window as any).require !== undefined;
            if (isDesktop() && filePath) {
                fileUrl = `file://${encodeURI(filePath.replace(/\\/g, '/'))}`;
            } else {
                fileUrl = URL.createObjectURL(file);
            }
            
            const duration = metadata.duration || (await getAudioDuration(file));

            batch.push({
              id: Math.random().toString(36).substr(2, 9), title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
              artist: metadata.artist || "", album: metadata.album || "", albumArtist: metadata.albumArtist || "",
              duration: duration || 0, coverUrl: metadata.coverUrl || generateMockCover(file.name),
              fileUrl: fileUrl, path: filePath, isLiked: false, 
              year: metadata.year || new Date().getFullYear().toString(), source: 'local', addedAt: Date.now()
            });

             
            if (batch.length >= 10 || i === filesArray.length - 1) {
                const currentBatch = [...batch];
                setTracks(prev => {
                    const normalizePath = (p?: string) => p ? p.toLowerCase().replace(/\\/g, '/') : '';
                    const existingPaths = new Set(prev.filter(t => t.path).map(t => normalizePath(t.path)));
                    const existingSignatures = new Set(prev.filter(t => !t.path).map(t => `${t.title}-${t.artist}-${t.duration}`));
                    
                    const uniqueBatch = currentBatch.filter(t => {
                        if (t.path) return !existingPaths.has(normalizePath(t.path));
                        return !existingSignatures.has(`${t.title}-${t.artist}-${t.duration}`);
                    });
                    
                    if (uniqueBatch.length === 0) return prev;
                    return sortTracks([...prev, ...uniqueBatch]);
                });
                batch = [];
            }
        } catch (e) {
            console.error("Error processing file:", file.name, e);
        }
    }
  };

  const scanFolders = async (folders: string[]) => {
    if (!folders || folders.length === 0) return;
    const isDesktop = () => (window as any).require !== undefined;
    if (!isDesktop()) return;

    try {
        const ipcRenderer = (window as any).require('electron').ipcRenderer;
        const files: { path: string, name: string, size: number, lastModified: number }[] = await ipcRenderer.invoke('scan-folders', folders);
        
        if (files && files.length > 0) {
            const normalizePath = (p?: string) => p ? p.toLowerCase().replace(/\\/g, '/') : '';
            const existingPaths = new Set(tracksRef.current.filter(t => t.path).map(t => normalizePath(t.path)));
            const newFiles = files.filter(f => !existingPaths.has(normalizePath(f.path)));
            
            if (newFiles.length === 0) return;
            
            let batch: Track[] = [];
            const chunkSize = 10;
            
            for (let i = 0; i < newFiles.length; i += chunkSize) {
                const chunk = newFiles.slice(i, i + chunkSize);
                
                const results = await Promise.all(chunk.map(async (file) => {
                    try {
                        const mockFile = { path: file.path, name: file.name } as any as File;
                        const metadata = await parseFileMetadata(mockFile);
                        const fileUrl = `file://${encodeURI(file.path.replace(/\\/g, '/'))}`;
                        const duration = metadata.duration || 0;
                        
                        return {
                            id: Math.random().toString(36).substr(2, 9),
                            title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
                            artist: metadata.artist || "",
                            album: metadata.album || "",
                            albumArtist: metadata.albumArtist || "",
                            duration: duration || 0,
                            coverUrl: metadata.coverUrl || generateMockCover(file.name),
                            fileUrl: fileUrl,
                            path: file.path,
                            isLiked: false,
                            year: metadata.year || new Date().getFullYear().toString(),
                            source: 'local',
                            addedAt: Date.now()
                        } as Track;
                    } catch (e) {
                        console.error("Error processing scanned file:", file.name, e);
                        return null;
                    }
                }));
                
                const validTracks = results.filter(t => t !== null) as Track[];
                batch.push(...validTracks);

                if (batch.length >= 20 || i + chunkSize >= newFiles.length) {
                    const currentBatch = [...batch];
                    setTracks(tPrev => {
                        const currentPaths = new Set(tPrev.filter(t => t.path).map(t => normalizePath(t.path)));
                        const uniqueBatch = currentBatch.filter(t => !currentPaths.has(normalizePath(t.path)));
                        if (uniqueBatch.length === 0) return tPrev;
                        return sortTracks([...tPrev, ...uniqueBatch]);
                    });
                    batch = [];
                }
            }
        }
    } catch (e) {
        console.error("Error scanning folders:", e);
    }
  };

  
  const handleDownloadSuccess = (folderPath: string) => {
      if (folderPath) {
          const newSyncFolders = Array.from(new Set([...(userProfile.syncFolders || []), folderPath]));
          if (newSyncFolders.length !== (userProfile.syncFolders || []).length) {
              handleUpdateProfile({ syncFolders: newSyncFolders });
          }
          scanFolders([folderPath]);
      }
  };

  const handleImportFolderClick = async () => {
      const isDesktop = () => (window as any).require !== undefined;
      if (isDesktop()) {
          const ipcRenderer = (window as any).require('electron').ipcRenderer;
          const folders = await ipcRenderer.invoke('select-folders');
          if (folders && folders.length > 0) {
              const newSyncFolders = Array.from(new Set([...(userProfile.syncFolders || []), ...folders]));
              handleUpdateProfile({ syncFolders: newSyncFolders });
              scanFolders(folders);
          }
      }
  };

  const handleShuffleAll = useCallback((q: Track[]) => {
    setPlayerState(prev => ({ ...prev, isShuffled: true, queue: q }));
    if (q[0]) handlePlay(q[0], q);
  }, [handlePlay]);

  const handleChangeView = useCallback((view: ViewType) => {
    setViewHistory([]);
    setPlayerState(prev => ({ ...prev, currentView: view }));
    setSidebarOpen(true);
  }, []);

  const handleSelectPlaylist = useCallback((id: string) => {
    setSelectedPlaylist(id);
    setPlayerState(prev => ({ ...prev, currentView: 'playlist_detail' }));
    setSidebarOpen(true);
  }, []);

  const handleDeletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    setSelectedPlaylist(prev => prev === id ? null : prev);
  }, []);

  const handleUpdatePlaylist = useCallback((id: string, data: Partial<Playlist>) => {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }, []);

  const handleRequestFileUnlock = useCallback(() => {
    audioRef.current.pause();
    audioRef.current.src = "";
  }, []);

  const handleCreatePlaylistOpen = useCallback(() => {
    setIsCreatePlaylistOpen(true);
  }, []);

  const handleOpenSelectTracks = useCallback(() => {
    setIsSelectTracksOpen(true);
  }, []);

  const isVideoBg = theme.backgroundType === 'video';
  const isHeavyBg = isVideoBg || (theme.animateBackground && playerState.playbackState === PlaybackState.PLAYING);

  const mainGlassClass = theme.enableGlass
    ? (isHeavyBg ? 'bg-black/55 backdrop-blur-xl border border-white/10' : 'bg-black/40 backdrop-blur-2xl border border-white/10')
    : 'bg-[var(--panel-bg)] border border-[var(--glass-border)]';

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] selection:text-[var(--text-main)]">
      <TitleBar />
      {(theme.themePreset === 'nord' || theme.themePreset === 'autumn') && (
        <SnowEffect themePreset={theme.themePreset} accentColor={theme.accentColor} />
      )}
      <Background config={theme} isLight={getEffectiveTheme() === 'light'} analyser={analyser} isPlaying={playerState.playbackState === PlaybackState.PLAYING} profileBannerUrl={userProfile.bannerUrl} />
      <Visualizer analyser={analyser} isPlaying={playerState.playbackState === PlaybackState.PLAYING} accentColor={theme.accentColor} enabled={theme.animateBackground && !isVideoBg} />
      
      {!userProfile.onboardingDone && isLoaded && (
        <OnboardingModal onComplete={handleOnboardingComplete} accentColor={theme.accentColor} t={t} />
      )}

      <div className={`flex-1 flex ${theme.sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'} overflow-hidden relative z-10 p-2 md:p-4 gap-2 md:gap-4`}>
        <Sidebar 
          onImportClick={() => fileInputRef.current?.click()} 
          onImportFolderClick={handleImportFolderClick}
          onYouTubeImportClick={() => setIsYouTubeModalOpen(true)}
          onSpotiFLACImportClick={() => setIsSpotifyModalOpen(true)}
          onSettingsClick={() => setSettingsOpen(true)}
          currentView={playerState.currentView}
          onChangeView={handleChangeView}
          isOpen={sidebarOpen} accentColor={theme.accentColor} searchQuery={searchQuery}
          onSearchChange={setSearchQuery} enableGlass={theme.enableGlass} isVideoBg={isHeavyBg} user={userProfile} t={t}
          playlists={playlists}
          selectedPlaylist={selectedPlaylist}
          onSelectPlaylist={handleSelectPlaylist}
          onCreatePlaylist={handleCreatePlaylistOpen}
        />
        <div className={`flex-1 flex flex-col relative z-20 ${mainGlassClass} rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl`}>
          <MainView 
            tracks={tracks} currentTrack={playerState.currentTrack} playbackState={playerState.playbackState}
            onPlay={handlePlay} onShuffleAll={handleShuffleAll}
            currentView={playerState.currentView} selectedArtist={selectedArtist} selectedAlbum={selectedAlbum}
            onUpdateTrack={handleUpdateTrack} onDeleteTrack={handleDeleteTrack} onGoToArtist={handleGoToArtist}
            onGoToAlbum={handleGoToAlbum} onBack={handleBack}
            accentColor={theme.accentColor} artistMetadata={artistMetadata} onUpdateArtist={handleUpdateArtist}
            searchQuery={searchQuery} onRequestFileUnlock={handleRequestFileUnlock}
            onToggleLike={handleToggleLike} enableGlass={theme.enableGlass} t={t} onTranslate={translateText}
            playlists={playlists} selectedPlaylist={selectedPlaylist}
            onChangeView={handleChangeView}
            onDeletePlaylist={handleDeletePlaylist}
            onUpdatePlaylist={handleUpdatePlaylist}
            onCreatePlaylist={handleCreatePlaylistOpen}
            onOpenSelectTracks={handleOpenSelectTracks}
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            playerStyle={theme.playerStyle}
            playerDock={theme.playerDock}
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
              onGoToAlbum={handleGoToAlbum} playerStyle={theme.playerStyle} playerDock={theme.playerDock} enableGlass={theme.enableGlass} t={t}
              audioEffect={theme.globalAudioEffect && theme.globalAudioEffect !== 'none' ? theme.globalAudioEffect : playerState.audioEffect} 
              onToggleAudioEffect={toggleAudioEffect}
            />
        </div>
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
            audioEffect={theme.globalAudioEffect && theme.globalAudioEffect !== 'none' ? theme.globalAudioEffect : playerState.audioEffect} 
            onToggleAudioEffect={toggleAudioEffect}
            analyser={analyser}
            onRefetchLyrics={handleRefetchLyrics}
            isRefetchingLyrics={isRefetchingLyrics}
        />
      )}
      {isEditingLayout && (
        <LayoutEditorOverlay 
          config={theme}
          onUpdate={handleUpdateTheme}
          onClose={() => setIsEditingLayout(false)}
          t={t}
        />
      )}
      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => {
            setSettingsOpen(false);
            setSettingsInitialView('settings');
        }} 
        initialView={settingsInitialView}
        config={theme} 
        onUpdate={handleUpdateTheme} 
        onClearLibrary={handleClearLibrary} 
        userProfile={userProfile} 
        onUpdateProfile={handleUpdateProfile}
        onEditLayout={() => setIsEditingLayout(true)} t={t}
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
      <YouTubeModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        t={t}
        accentColor={theme.accentColor}
      />
      <SpotifyModal
        isOpen={isSpotifyModalOpen}
        onDownloadSuccess={handleDownloadSuccess}
        onClose={() => setIsSpotifyModalOpen(false)}
        t={t}
        accentColor={theme.accentColor}
      />
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="audio/*" className="hidden" />
    </div>
  );
};

export default App;