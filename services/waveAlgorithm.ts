import { Track, WaveMood, WaveSource } from '../types';
import { searchYouTube, searchSoundCloud, searchOnlineAll, resolveStreamUrl } from './musicStreamService';

const MOOD_SEEDS: Record<WaveMood, string[]> = {
  all: [
    'top hits music', 'chill vibes remix', 'synthwave neon', 'indie electronic',
    'melodic techno', 'deep groove', 'lofi beats'
  ],
  energetic: [
    'electronic dance workout high energy', 'drum and bass fast beat',
    'synthwave electro dance', 'phonk drift aggressive beat',
    'future house energetic', 'hardstyle club remix'
  ],
  calm: [
    'lofi hip hop chill beats to relax', 'acoustic guitar indie calm',
    'ambient sleep mellow', 'bedroom pop soft vibes',
    'warm piano peaceful chill', 'neo classical calm'
  ],
  drive: [
    'synthwave retro 80s night drive', 'cyberpunk electro bass',
    'drift phonk bass boosted', 'dark techno fast pace',
    'electro highway drive', 'midtempo bass groove'
  ],
  deep: [
    'melodic deep house sunset', 'progressive electronic atmospheric',
    'underground soundcloud special', 'ambient techno soundscape',
    'deep organic house', 'experimental electronic beats'
  ],
  favorites: [
    'best vocal hits', 'popular chart music', 'beloved acoustic melodies'
  ],
  discovery: [
    'underrated indie gems', 'underground producer beats',
    'rare soundcloud electronic', 'future sound experimental',
    'niche electronic artists', 'indie alternative gems'
  ]
};

export class WaveAlgorithm {
  private libraryTracks: Track[] = [];
  private mood: WaveMood = 'all';
  private source: WaveSource = 'all';
  private dislikedTrackIds: Set<string> = new Set();
  private dislikedArtists: Set<string> = new Set();
  private likedTrackIds: Set<string> = new Set();
  private boostedArtists: Map<string, number> = new Map();
  private recentWaveTrackIds: Set<string> = new Set();
  private preloadedQueue: Track[] = [];
  private isFetching = false;
  private seedIndex = 0;

  constructor(libraryTracks: Track[] = [], initialMood: WaveMood = 'all', initialSource: WaveSource = 'all') {
    this.libraryTracks = libraryTracks;
    this.mood = initialMood;
    this.source = initialSource;

    libraryTracks.forEach(t => {
      if (t.isLiked) {
        this.likedTrackIds.add(t.id);
        const count = this.boostedArtists.get(t.artist) || 0;
        this.boostedArtists.set(t.artist, count + 2);
      }
      if (t.playCount && t.playCount > 2) {
        const count = this.boostedArtists.get(t.artist) || 0;
        this.boostedArtists.set(t.artist, count + 1);
      }
    });
  }

  public updateLibrary(tracks: Track[]): void {
    this.libraryTracks = tracks;
  }

  public setMood(mood: WaveMood): void {
    if (this.mood !== mood) {
      this.mood = mood;
      this.preloadedQueue = [];
      this.seedIndex = 0;
    }
  }

  public setSource(source: WaveSource): void {
    if (this.source !== source) {
      this.source = source;
      this.preloadedQueue = [];
    }
  }

  public getMood(): WaveMood {
    return this.mood;
  }

  public getSource(): WaveSource {
    return this.source;
  }

  public getPreloadedQueue(): Track[] {
    return [...this.preloadedQueue];
  }

  public likeTrack(track: Track): void {
    this.likedTrackIds.add(track.id);
    const count = this.boostedArtists.get(track.artist) || 0;
    this.boostedArtists.set(track.artist, count + 4);
  }

  public async dislikeTrack(track: Track): Promise<Track> {
    this.dislikedTrackIds.add(track.id);
    this.dislikedArtists.add(track.artist.toLowerCase());
    this.preloadedQueue = this.preloadedQueue.filter(
      t => t.id !== track.id && t.artist.toLowerCase() !== track.artist.toLowerCase()
    );
    return this.getNextTrack();
  }

  public async getNextTrack(): Promise<Track> {
    if (this.preloadedQueue.length > 0) {
      const next = this.preloadedQueue.shift()!;
      this.recentWaveTrackIds.add(next.id);
      this.ensureBuffer();
      try {
        if (!next.fileUrl) {
          next.fileUrl = await resolveStreamUrl(next);
        }
      } catch {
        return this.getNextTrack();
      }
      return next;
    }

    await this.fetchBatch();

    if (this.preloadedQueue.length > 0) {
      const next = this.preloadedQueue.shift()!;
      this.recentWaveTrackIds.add(next.id);
      this.ensureBuffer();
      try {
        if (!next.fileUrl) {
          next.fileUrl = await resolveStreamUrl(next);
        }
      } catch {
        return this.getNextTrack();
      }
      return next;
    }

    if (this.libraryTracks.length > 0) {
      const available = this.libraryTracks.filter(t => !this.dislikedTrackIds.has(t.id));
      const fallback = available[Math.floor(Math.random() * available.length)];
      return fallback;
    }

    throw new Error('Unable to generate next Wave track');
  }

  private async ensureBuffer(): Promise<void> {
    if (this.preloadedQueue.length < 3 && !this.isFetching) {
      this.fetchBatch().catch(() => {});
    }
  }

  private async fetchBatch(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const query = this.generateQuery();
      let candidates: Track[] = [];

      if (this.source === 'youtube') {
        candidates = await searchYouTube(query, 12);
      } else if (this.source === 'soundcloud') {
        candidates = await searchSoundCloud(query, 12);
      } else {
        candidates = await searchOnlineAll(query, 14);
      }

      if (this.mood === 'favorites' && this.libraryTracks.length > 0) {
        const likedOrTop = this.libraryTracks.filter(
          t => (t.isLiked || (t.playCount && t.playCount > 1)) && !this.dislikedTrackIds.has(t.id) && !this.recentWaveTrackIds.has(t.id)
        );
        if (likedOrTop.length > 0) {
          const randomLocal = likedOrTop[Math.floor(Math.random() * likedOrTop.length)];
          candidates.unshift(randomLocal);
        }
      }

      const filtered = candidates.filter(t => {
        if (this.dislikedTrackIds.has(t.id)) return false;
        if (this.dislikedArtists.has(t.artist.toLowerCase())) return false;
        if (this.recentWaveTrackIds.has(t.id)) return false;
        if (this.preloadedQueue.some(p => p.id === t.id)) return false;
        return true;
      });

      filtered.sort((a, b) => {
        const aBoost = this.boostedArtists.get(a.artist) || 0;
        const bBoost = this.boostedArtists.get(b.artist) || 0;
        return (bBoost + Math.random() * 2) - (aBoost + Math.random() * 2);
      });

      for (const track of filtered) {
        this.preloadedQueue.push(track);
        if (this.preloadedQueue.length >= 6) break;
      }

      if (this.preloadedQueue.length > 0) {
        const first = this.preloadedQueue[0];
        if (!first.fileUrl) {
          resolveStreamUrl(first).then(url => {
            first.fileUrl = url;
          }).catch(() => {});
        }
      }
    } finally {
      this.isFetching = false;
    }
  }

  private generateQuery(): string {
    const boosted = Array.from(this.boostedArtists.entries())
      .filter(([artist]) => !this.dislikedArtists.has(artist.toLowerCase()))
      .sort((a, b) => b[1] - a[1]);

    const moodSeeds = MOOD_SEEDS[this.mood] || MOOD_SEEDS.all;
    const moodSeed = moodSeeds[this.seedIndex % moodSeeds.length];
    this.seedIndex++;

    if (this.mood === 'discovery') {
      const discoverySeeds = MOOD_SEEDS.discovery;
      return discoverySeeds[Math.floor(Math.random() * discoverySeeds.length)];
    }

    if (boosted.length > 0 && Math.random() > 0.35) {
      const topArtist = boosted[Math.floor(Math.random() * Math.min(3, boosted.length))][0];
      if (this.mood === 'energetic') return `${topArtist} remix high energy`;
      if (this.mood === 'calm') return `${topArtist} acoustic chill`;
      if (this.mood === 'drive') return `${topArtist} remix bass`;
      if (this.mood === 'deep') return `${topArtist} deep electronic`;
      return `${topArtist} songs similar`;
    }

    if (this.libraryTracks.length > 0 && Math.random() > 0.4) {
      const valid = this.libraryTracks.filter(t => !this.dislikedArtists.has(t.artist.toLowerCase()));
      if (valid.length > 0) {
        const randomTrack = valid[Math.floor(Math.random() * valid.length)];
        return `${randomTrack.artist} ${moodSeed}`;
      }
    }

    return moodSeed;
  }
}
