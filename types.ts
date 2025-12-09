
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
}

export enum PlaybackState {
  PAUSED,
  PLAYING,
}

export type ViewType = 'listen_now' | 'browse' | 'radio' | 'recent' | 'albums' | 'artists' | 'songs' | 'artist_detail' | 'album_detail';

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
}