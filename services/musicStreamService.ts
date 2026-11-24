import { Track, OnlineAlbum } from '../types';

const SOUNDCLOUD_CLIENT_IDS = [
  'OGA0P5R5U4CpyooNe9OUcnjIMxao2hB2',
  'a3e059563d7fd3372b49b37f00a00bcf',
  '2t9loNfh0ekAzfqxmBycnUtDbFCNuR62',
  'iZIs9mchVcX5lhVR1hnOIYY8tZi1v65O'
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be',
  'https://invidious.jing.rocks',
  'https://invidious.drgns.space',
  'https://inv.in.projectsegfau.lt'
];

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
  'https://piped-api.lunar.icu',
  'https://api.piped.projectsegfau.lt'
];

const streamUrlCache = new Map<string, { url: string; expiresAt: number }>();
const hdCoverCache = new Map<string, string>();

let currentScClientIdIndex = 0;
function getSoundCloudClientId(): string {
  return SOUNDCLOUD_CLIENT_IDS[currentScClientIdIndex % SOUNDCLOUD_CLIENT_IDS.length];
}

function rotateSoundCloudClientId(): void {
  currentScClientIdIndex = (currentScClientIdIndex + 1) % SOUNDCLOUD_CLIENT_IDS.length;
}

export function getHighResArtworkUrl(artworkUrl?: string | null): string {
  if (!artworkUrl || typeof artworkUrl !== 'string') {
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=85';
  }
  let url = artworkUrl.trim();
  if (url.includes('sndcdn.com')) {
    url = url.replace(/-(?:large|t\d+x\d+|badge|small|mini|crop)\.([a-z0-9]+)$/i, '-t500x500.$1');
    if (url.includes('-large')) {
      url = url.replace('-large', '-t500x500');
    }
    return url;
  }
  if (url.includes('ytimg.com') || url.includes('youtube.com')) {
    const videoIdMatch = url.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
    if (videoIdMatch && videoIdMatch[1]) {
      return `https://i.ytimg.com/vi/${videoIdMatch[1]}/hq720.jpg`;
    }
  }
  if (url.includes('mzstatic.com')) {
    return url.replace(/\/\d+x\d+bb\./, '/1000x1000bb.');
  }
  return url;
}

export async function fetchHighResAlbumCover(artist: string, title: string): Promise<string | null> {
  const cleanA = (artist || '').trim();
  const cleanT = (title || '').trim();
  if (!cleanA || !cleanT) return null;

  const cacheKey = `${cleanA.toLowerCase()}___${cleanT.toLowerCase()}`;
  if (hdCoverCache.has(cacheKey)) {
    return hdCoverCache.get(cacheKey) || null;
  }

  try {
    const query = encodeURIComponent(`${cleanA} ${cleanT}`);
    const res = await fetchWithTimeout(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`, {}, 3000);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        const item = data.results[0];
        if (item && item.artworkUrl100) {
          const hd = item.artworkUrl100.replace('100x100bb', '1000x1000bb');
          hdCoverCache.set(cacheKey, hd);
          return hd;
        }
      }
    }
  } catch {}

  try {
    const query = encodeURIComponent(`${cleanA} ${cleanT}`);
    const res = await fetchWithTimeout(`https://api.deezer.com/search?q=${query}&limit=1`, {}, 3000);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        const album = data.data[0]?.album;
        const hd = album?.cover_xl || album?.cover_big;
        if (hd) {
          hdCoverCache.set(cacheKey, hd);
          return hd;
        }
      }
    }
  } catch {}

  return null;
}

export function cleanTrackTitle(rawTitle: string, rawArtist?: string): { title: string; artist: string } {
  let title = (rawTitle || '').trim();
  let artist = (rawArtist || '').trim();

  title = title
    .replace(/\s*[\(\[](?:official\s*(?:video|audio|music\s*video|lyric\s*video|visualizer)|lyrics?|hq|hd|4k|remastered|audio)[\)\]]/gi, '')
    .trim();

  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    const left = parts[0].trim();
    const right = parts.slice(1).join(' - ').trim();
    if (!artist || artist.toLowerCase() === 'unknown' || artist.toLowerCase() === left.toLowerCase() || left.toLowerCase().includes(artist.toLowerCase())) {
      artist = left;
      title = right;
    }
  }

  if (!artist || artist.toLowerCase() === 'unknown') {
    artist = 'Various Artists';
  }

  return { title, artist };
}

function getIpcRenderer(): any | null {
  if (typeof window === 'undefined' || !(window as any).require) return null;
  try {
    return (window as any).require('electron').ipcRenderer;
  } catch {
    return null;
  }
}

function nativeResultToTrack(item: any): Track | null {
  if (!item || !item.id) return null;
  const isYoutube = String(item.id).startsWith('yt_');
  const { title, artist } = cleanTrackTitle(item.title, item.artist);
  const videoId = item.videoId || String(item.id).replace('yt_', '');

  return {
    id: item.id,
    title,
    artist,
    album: isYoutube ? 'YouTube Music' : 'SoundCloud',
    duration: typeof item.duration === 'number' ? item.duration : 0,
    coverUrl: getHighResArtworkUrl(item.coverUrl) || (isYoutube ? `https://i.ytimg.com/vi/${videoId}/hq720.jpg` : ''),
    fileUrl: '',
    source: 'web',
    streamProvider: isYoutube ? 'youtube' : 'soundcloud',
    streamId: isYoutube ? videoId : String(item.trackId || String(item.id).replace('sc_', '')),
    originalUrl: item.url || '',
    addedAt: Date.now()
  };
}

async function nativeSearch(query: string, provider: 'youtube' | 'soundcloud', limit: number): Promise<Track[]> {
  const ipcRenderer = getIpcRenderer();
  if (!ipcRenderer) return [];
  try {
    const results = await ipcRenderer.invoke('music-search', { query, provider, limit });
    if (!Array.isArray(results)) return [];
    return results.map(nativeResultToTrack).filter(Boolean) as Track[];
  } catch {
    return [];
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function searchYouTube(query: string, limit = 15): Promise<Track[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const nativeTracks = await nativeSearch(cleanQ, 'youtube', limit);
  if (nativeTracks.length > 0) return nativeTracks;

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video&sort_by=relevance`;
      const res = await fetchWithTimeout(searchUrl, {}, 5000);
      if (!res.ok) continue;

      const data = await res.json();
      if (!Array.isArray(data)) continue;

      const tracks: Track[] = [];
      for (const item of data) {
        if (!item.videoId) continue;
        const dur = typeof item.lengthSeconds === 'number' ? item.lengthSeconds : 0;
        if (dur < 30 || dur > 900) continue;

        const { title, artist } = cleanTrackTitle(item.title, item.author);
        const cover = `https://i.ytimg.com/vi/${item.videoId}/hq720.jpg`;

        tracks.push({
          id: `yt_${item.videoId}`,
          title,
          artist,
          album: 'YouTube Music',
          duration: dur,
          coverUrl: cover,
          fileUrl: '',
          source: 'web',
          streamProvider: 'youtube',
          streamId: item.videoId,
          originalUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
          addedAt: Date.now()
        });

        if (tracks.length >= limit) break;
      }

      if (tracks.length > 0) {
        return tracks;
      }
    } catch {
      continue;
    }
  }

  for (const instance of PIPED_INSTANCES) {
    try {
      const pipedUrl = `${instance}/search?q=${encodeURIComponent(cleanQ)}&filter=music_songs`;
      const res = await fetchWithTimeout(pipedUrl, {}, 5000);
      if (!res.ok) continue;

      const data = await res.json();
      const items = data.items || data;
      if (!Array.isArray(items)) continue;

      const tracks: Track[] = [];
      for (const item of items) {
        const videoId = item.url ? item.url.replace('/watch?v=', '') : item.id;
        if (!videoId || videoId.length !== 11) continue;

        const dur = typeof item.duration === 'number' ? item.duration : 0;
        if (dur > 0 && (dur < 30 || dur > 900)) continue;

        const { title, artist } = cleanTrackTitle(item.title, item.uploaderName || item.uploader);
        const cover = `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;

        tracks.push({
          id: `yt_${videoId}`,
          title,
          artist,
          album: 'YouTube Music',
          duration: dur || 210,
          coverUrl: cover,
          fileUrl: '',
          source: 'web',
          streamProvider: 'youtube',
          streamId: videoId,
          originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          addedAt: Date.now()
        });

        if (tracks.length >= limit) break;
      }

      if (tracks.length > 0) {
        return tracks;
      }
    } catch {
      continue;
    }
  }

  return [];
}

export async function searchSoundCloud(query: string, limit = 15): Promise<Track[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const nativeTracks = await nativeSearch(cleanQ, 'soundcloud', limit);
  if (nativeTracks.length > 0) return nativeTracks;

  for (let attempt = 0; attempt < SOUNDCLOUD_CLIENT_IDS.length; attempt++) {
    const clientId = getSoundCloudClientId();
    try {
      const url = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(cleanQ)}&client_id=${clientId}&limit=${limit * 2}&linked_partitioning=1`;
      const res = await fetchWithTimeout(url, {
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01'
        }
      }, 5000);

      if (!res.ok) {
        rotateSoundCloudClientId();
        continue;
      }

      const data = await res.json();
      const collection = data.collection || [];
      if (!Array.isArray(collection) || collection.length === 0) {
        return [];
      }

      const tracks: Track[] = [];
      for (const item of collection) {
        if (!item || !item.id) continue;
        if (item.policy === 'BLOCK' || item.policy === 'SNIP') continue;
        const durMs = item.full_duration || item.duration || 0;
        const durSec = Math.round(durMs / 1000);
        if (durSec < 30 || durSec > 900) continue;

        const rawTitle = item.title || 'Untitled Track';
        const rawArtist = item.user?.username || 'SoundCloud Artist';
        const { title, artist } = cleanTrackTitle(rawTitle, rawArtist);

        const rawArtwork = item.artwork_url || item.user?.avatar_url;
        const cover = getHighResArtworkUrl(rawArtwork);

        const transcodings = item.media?.transcodings || [];
        const backupUrls: string[] = [];
        for (const t of transcodings) {
          if (t?.url) backupUrls.push(t.url);
        }

        tracks.push({
          id: `sc_${item.id}`,
          title,
          artist,
          album: item.genre ? `SoundCloud • ${item.genre}` : 'SoundCloud',
          duration: durSec,
          coverUrl: cover,
          fileUrl: '',
          source: 'web',
          streamProvider: 'soundcloud',
          streamId: String(item.id),
          originalUrl: item.permalink_url || `https://soundcloud.com/tracks/${item.id}`,
          backupStreamUrls: backupUrls,
          addedAt: Date.now()
        });

        if (tracks.length >= limit) break;
      }

      return tracks;
    } catch {
      rotateSoundCloudClientId();
    }
  }

  return [];
}

export async function searchOnlineAll(query: string, limit = 20): Promise<Track[]> {
  const [scTracks, ytTracks] = await Promise.all([
    searchSoundCloud(query, Math.ceil(limit / 2)),
    searchYouTube(query, Math.ceil(limit / 2))
  ]);

  const combined: Track[] = [];
  const maxLen = Math.max(scTracks.length, ytTracks.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < scTracks.length) combined.push(scTracks[i]);
    if (i < ytTracks.length) combined.push(ytTracks[i]);
  }

  const selected = combined.slice(0, limit);

  for (let i = 0; i < Math.min(selected.length, 6); i++) {
    const t = selected[i];
    fetchHighResAlbumCover(t.artist, t.title).then(hd => {
      if (hd) {
        t.coverUrl = hd;
      }
    }).catch(() => {});
  }

  return selected;
}

export async function searchOnlineAlbums(query: string, limit = 12): Promise<OnlineAlbum[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const albums: OnlineAlbum[] = [];
  const seen = new Set<string>();

  try {
    const dzRes = await fetchWithTimeout(`https://api.deezer.com/search/album?q=${encodeURIComponent(cleanQ)}&limit=${limit * 2}`, {}, 4000);
    if (dzRes.ok) {
      const data = await dzRes.json();
      const list = data.data || [];
      for (const item of list) {
        if (!item || !item.title) continue;
        const key = `${item.title.toLowerCase()}___${(item.artist?.name || '').toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          albums.push({
            id: `dz_alb_${item.id}`,
            title: item.title,
            artist: item.artist?.name || 'Various Artists',
            coverUrl: item.cover_xl || item.cover_big || item.cover_medium,
            trackCount: item.nb_tracks
          });
        }
      }
    }
  } catch {}

  if (albums.length < limit) {
    try {
      const itunesRes = await fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=album&limit=${limit}`, {}, 4000);
      if (itunesRes.ok) {
        const data = await itunesRes.json();
        const list = data.results || [];
        for (const item of list) {
          if (!item || !item.collectionName) continue;
          const key = `${item.collectionName.toLowerCase()}___${(item.artistName || '').toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            albums.push({
              id: `it_alb_${item.collectionId}`,
              title: item.collectionName,
              artist: item.artistName || 'Various Artists',
              coverUrl: (item.artworkUrl100 || '').replace('100x100bb', '1000x1000bb'),
              year: item.releaseDate ? item.releaseDate.slice(0, 4) : undefined,
              trackCount: item.trackCount
            });
          }
        }
      }
    } catch {}
  }

  return albums.slice(0, limit);
}

export async function fetchArtistOnlineCatalog(artist: string): Promise<{ albums: OnlineAlbum[]; popularTracks: Track[] }> {
  const cleanA = artist.trim();
  if (!cleanA) return { albums: [], popularTracks: [] };

  const [albums, songResults] = await Promise.all([
    searchOnlineAlbums(cleanA, 16),
    searchOnlineAll(cleanA, 16)
  ]);

  return {
    albums,
    popularTracks: songResults
  };
}

export async function fetchOnlineAlbumTracks(albumTitle: string, artistName?: string): Promise<Track[]> {
  const cleanAlb = (albumTitle || '').trim();
  const cleanArt = (artistName || '').trim();
  if (!cleanAlb) return [];

  const query = cleanArt ? `${cleanArt} ${cleanAlb}` : cleanAlb;
  
  try {
    const searchRes = await fetchWithTimeout(`https://api.deezer.com/search/album?q=${encodeURIComponent(query)}&limit=1`, {}, 4000);
    if (searchRes.ok) {
      const sData = await searchRes.json();
      const firstAlb = sData.data?.[0];
      if (firstAlb && firstAlb.id) {
        const tracksRes = await fetchWithTimeout(`https://api.deezer.com/album/${firstAlb.id}/tracks?limit=50`, {}, 4000);
        if (tracksRes.ok) {
          const tData = await tracksRes.json();
          const list = tData.data || [];
          if (Array.isArray(list) && list.length > 0) {
            const cover = firstAlb.cover_xl || firstAlb.cover_big || firstAlb.cover_medium;
            return list.map((item: any, idx: number) => ({
              id: `dz_tr_${item.id}`,
              title: item.title,
              artist: item.artist?.name || cleanArt || 'Various Artists',
              album: firstAlb.title || cleanAlb,
              duration: item.duration || 180,
              coverUrl: cover,
              fileUrl: '',
              source: 'web' as const,
              streamProvider: 'soundcloud' as const,
              originalUrl: '',
              backupStreamUrls: [],
              addedAt: Date.now() + idx
            }));
          }
        }
      }
    }
  } catch {}

  try {
    const itunesRes = await fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=1`, {}, 4000);
    if (itunesRes.ok) {
      const itData = await itunesRes.json();
      const firstAlb = itData.results?.[0];
      if (firstAlb && firstAlb.collectionId) {
        const lookRes = await fetchWithTimeout(`https://itunes.apple.com/lookup?id=${firstAlb.collectionId}&entity=song&limit=50`, {}, 4000);
        if (lookRes.ok) {
          const lookData = await lookRes.json();
          const list = (lookData.results || []).filter((r: any) => r.wrapperType === 'track');
          if (list.length > 0) {
            const cover = (firstAlb.artworkUrl100 || '').replace('100x100bb', '1000x1000bb');
            return list.map((item: any, idx: number) => ({
              id: `it_tr_${item.trackId}`,
              title: item.trackName,
              artist: item.artistName || cleanArt || 'Various Artists',
              album: firstAlb.collectionName || cleanAlb,
              duration: Math.round((item.trackTimeMillis || 180000) / 1000),
              coverUrl: cover,
              fileUrl: item.previewUrl || '',
              source: 'web' as const,
              streamProvider: 'soundcloud' as const,
              originalUrl: '',
              backupStreamUrls: [],
              addedAt: Date.now() + idx
            }));
          }
        }
      }
    }
  } catch {}

  const songs = await searchOnlineAll(`${cleanArt} ${cleanAlb}`, 20);
  return songs.map(s => ({
    ...s,
    album: cleanAlb
  }));
}

export async function resolveStreamUrl(track: Track, forceRefresh = false): Promise<string> {
  const cacheKey = track.id;
  if (!forceRefresh) {
    const cached = streamUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }
  }

  if (typeof window !== 'undefined' && (window as any).require) {
    try {
      const electron = (window as any).require('electron');
      const port = electron.ipcRenderer.sendSync('get-media-port-sync') || 0;
      if (port > 0) {
        const query = `${track.artist} - ${track.title}`;
        const proxyUrl = `http://127.0.0.1:${port}/api/stream?id=${encodeURIComponent(track.streamId || track.id)}&provider=${encodeURIComponent(track.streamProvider || '')}&url=${encodeURIComponent(track.originalUrl || '')}&q=${encodeURIComponent(query)}`;
        streamUrlCache.set(cacheKey, { url: proxyUrl, expiresAt: Date.now() + 1000 * 60 * 60 * 2 });
        return proxyUrl;
      }
    } catch (_) {}
  }

  if (track.streamProvider === 'soundcloud') {
    if (!track.streamId && (!track.originalUrl || track.originalUrl.includes('/search'))) {
      const scSearch = await searchSoundCloud(`${track.artist} ${track.title}`, 1).catch(() => []);
      if (scSearch.length > 0) {
        track.streamId = scSearch[0].streamId;
        track.originalUrl = scSearch[0].originalUrl;
        track.backupStreamUrls = scSearch[0].backupStreamUrls;
        if (!track.duration || track.duration <= 0) {
          track.duration = scSearch[0].duration;
        }
      }
    }

    const stream = await resolveSoundCloudStream(track);
    if (stream) {
      streamUrlCache.set(cacheKey, {
        url: stream,
        expiresAt: Date.now() + 1000 * 60 * 60 * 3
      });
      return stream;
    }
  }

  if (track.streamProvider === 'youtube' || track.streamId?.startsWith('yt_')) {
    const stream = await resolveYouTubeStream(track);
    if (stream) {
      streamUrlCache.set(cacheKey, {
        url: stream,
        expiresAt: Date.now() + 1000 * 60 * 60 * 2
      });
      return stream;
    }

    const scFallback = await searchSoundCloud(`${track.artist} ${track.title}`, 1).catch(() => []);
    if (scFallback.length > 0) {
      const stream = await resolveSoundCloudStream(scFallback[0]);
      if (stream) {
        streamUrlCache.set(cacheKey, {
          url: stream,
          expiresAt: Date.now() + 1000 * 60 * 60 * 2
        });
        return stream;
      }
    }
  }

  if (track.fileUrl && (track.fileUrl.startsWith('http://') || track.fileUrl.startsWith('https://') || track.fileUrl.startsWith('blob:'))) {
    return track.fileUrl;
  }

  throw new Error(`Unable to resolve stream for ${track.title}`);
}

async function resolveSoundCloudStream(track: Track): Promise<string | null> {
  const backupTranscodings = track.backupStreamUrls || [];

  if (backupTranscodings.length > 0) {
    for (let i = 0; i < backupTranscodings.length; i++) {
      const transcodingUrl = backupTranscodings[i];
      for (let attempt = 0; attempt < SOUNDCLOUD_CLIENT_IDS.length; attempt++) {
        const clientId = getSoundCloudClientId();
        try {
          const sep = transcodingUrl.includes('?') ? '&' : '?';
          const reqUrl = `${transcodingUrl}${sep}client_id=${clientId}`;
          const res = await fetchWithTimeout(reqUrl, {}, 4000);
          if (!res.ok) {
            rotateSoundCloudClientId();
            continue;
          }
          const json = await res.json();
          if (json && json.url) {
            return json.url;
          }
        } catch {
          rotateSoundCloudClientId();
        }
      }
    }
  }

  const clientId = getSoundCloudClientId();
  try {
    const trackApiUrl = `https://api-v2.soundcloud.com/tracks/${track.streamId}?client_id=${clientId}`;
    const res = await fetchWithTimeout(trackApiUrl, {}, 5000);
    if (res.ok) {
      const data = await res.json();
      const trans = data.media?.transcodings || [];
      const prog = trans.find((t: any) => t.format?.protocol === 'progressive') || trans[0];
      if (prog?.url) {
        const streamInfoRes = await fetchWithTimeout(`${prog.url}?client_id=${clientId}`, {}, 4000);
        if (streamInfoRes.ok) {
          const info = await streamInfoRes.json();
          if (info?.url) return info.url;
        }
      }
    }
  } catch {
    rotateSoundCloudClientId();
  }

  return null;
}

async function resolveYouTubeStream(track: Track): Promise<string | null> {
  const videoId = track.streamId || (track.id.startsWith('yt_') ? track.id.replace('yt_', '') : '');
  if (!videoId) return null;

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`;
      const res = await fetchWithTimeout(url, {}, 5000);
      if (!res.ok) continue;

      const data = await res.json();
      const adaptive = data.adaptiveFormats || [];
      const audioStreams = adaptive.filter((f: any) => f.type && f.type.startsWith('audio/'));

      if (audioStreams.length > 0) {
        audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
        const chosen = audioStreams[0];
        if (chosen.url) {
          return chosen.url;
        }
      }
    } catch {
      continue;
    }
  }

  for (const instance of PIPED_INSTANCES) {
    try {
      const url = `${instance}/streams/${videoId}`;
      const res = await fetchWithTimeout(url, {}, 5000);
      if (!res.ok) continue;

      const data = await res.json();
      const audioStreams = data.audioStreams || [];
      if (Array.isArray(audioStreams) && audioStreams.length > 0) {
        audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
        const stream = audioStreams[0];
        if (stream?.url) {
          return stream.url;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}
