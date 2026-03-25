
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  fileUrl: string;
  path?: string;
  year?: string;
  isLiked?: boolean;
  source?: 'local' | 'web';
  lyrics?: string;
  playCount?: number;
  addedAt?: number;
}

export enum PlaybackState {
  PAUSED,
  PLAYING,
  BUFFERING,
}

export type ViewType = 'listen_now' | 'albums' | 'artists' | 'songs' | 'artist_detail' | 'album_detail' | 'favorites' | 'search' | 'playlists' | 'playlist_detail' | 'profile';

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
    listeningTime: number; // in seconds
    topArtists: Record<string, number>;
  };
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

export interface ThemeConfig {
  accentColor: string;
  backgroundType: 'liquid' | 'image' | 'video';
  backgroundSource: string | null;
  blurLevel: number;
  brightness: number;
  enableGlass: boolean;
  seasonalTheme: boolean;
  playerStyle: 'floating' | 'classic';
  themeMode: 'dark' | 'light' | 'system';
  animateBackground: boolean;
  eqBands?: number[];
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
