
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  fileUrl: string;
  path?: string; // Real file system path for persistence
  year?: string;
  isLiked?: boolean;
  source?: 'local' | 'web';
  lyrics?: string; // LRC format string
}

export enum PlaybackState {
  PAUSED,
  PLAYING,
  BUFFERING,
}

export type ViewType = 'listen_now' | 'browse' | 'radio' | 'recent' | 'albums' | 'artists' | 'songs' | 'artist_detail' | 'album_detail' | 'favorites' | 'search';

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  playbackState: PlaybackState;
  volume: number;
  currentTime: number;
  duration: number;
  isShuffled: boolean;
  isRepeating: boolean;
  currentView: ViewType;
  history: string[]; // Track IDs of played songs for "Previous" logic
}

export interface ThemeConfig {
  accentColor: string; // Hex code
  backgroundType: 'liquid' | 'image' | 'video';
  backgroundSource: string | null; // URL or DataURI
  blurLevel: number; // px
  brightness: number; // 0.1 to 1.0 (overlay opacity)
  enableGlass: boolean; // New toggle for global glass effect
  seasonalTheme: boolean; // Winter/Christmas mode
}

export interface ArtistMetadata {
    avatar?: string;
    banner?: string;
}

export interface LyricLine {
    time: number; // seconds
    text: string;
}
