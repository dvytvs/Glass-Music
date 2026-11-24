
export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArtist?: string;
  album: string;
  duration: number;
  coverUrl: string;
  fileUrl: string;
  path?: string;
  year?: string;
  isLiked?: boolean;
  source?: 'local' | 'web';
  streamProvider?: 'youtube' | 'soundcloud' | 'local' | 'web';
  streamId?: string;
  originalUrl?: string;
  backupStreamUrls?: string[];
  lyrics?: string;
  playCount?: number;
  addedAt?: number;
}

export enum PlaybackState {
  PAUSED,
  PLAYING,
  BUFFERING,
}

export type ViewType = 'wave' | 'listen_now' | 'albums' | 'artists' | 'songs' | 'artist_detail' | 'album_detail' | 'favorites' | 'search' | 'playlists' | 'playlist_detail' | 'profile';
export type WaveMood = 'all' | 'energetic' | 'calm' | 'drive' | 'deep' | 'favorites' | 'discovery';
export type WaveSource = 'all' | 'youtube' | 'soundcloud';

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  coverUrl?: string;
  createdAt: number;
}

export interface UserProfile {
  name: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  onboardingDone?: boolean;
  language?: string;
  stats?: {
    totalListens: number;
    listeningTime: number;  
    topArtists: Record<string, number>;
  };
  syncFolders?: string[];
}

export type AudioEffect = 'normal' | 'slowed' | 'spedup';

export interface PlayerState {
  currentTrack: null | Track;
  queue: Track[];
  playbackState: PlaybackState;
  volume: number;
  currentTime: number;
  duration: number;
  isShuffled: boolean;
  isRepeating: boolean;
  currentView: ViewType;
  history: string[];
  audioEffect: AudioEffect;
}

export type ThemePreset = 'liquid' | 'tokyo_night' | 'win95' | 'catppuccin' | 'nord' | 'cyberpunk' | 'oled' | 'autumn';

export interface ThemeConfig {
  themePreset?: ThemePreset;
  accentColor: string;
  backgroundType: 'liquid' | 'image' | 'video';
  backgroundSource: string | null;
  blurLevel: number;
  brightness: number;
  enableGlass: boolean;
  seasonalTheme: boolean;
  playerStyle: 'floating' | 'classic' | 'split';
  themeMode: 'dark' | 'light' | 'system';
  animateBackground: boolean;
  isShuffled?: boolean;
  isRepeating?: boolean;
  sidebarPosition?: 'left' | 'right' | 'top' | 'bottom';
  playerDock?: 'bottom' | 'top' | 'left' | 'right';
  eqBands?: number[];
  speedUpRate?: number;
  slowedRate?: number;
  globalAudioEffect?: 'none' | 'slowed' | 'spedup';
  reverbLevel?: number;
  bassLevel?: number;
  trebleLevel?: number;
  savePlaybackSession?: boolean;
  enableMusicService?: boolean;
}

export interface OnlineAlbum {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year?: string;
  trackCount?: number;
}

export interface ArtistMetadata {
    avatar?: string;
    banner?: string;
    bio?: string;
}

export interface LyricLine {
    time: number;
    text: string;
}
