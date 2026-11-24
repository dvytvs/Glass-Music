
import { LyricLine, Track } from "./types";

 
const jsmediatags = (window as any).jsmediatags;

export const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const generateMockCover = (id: string) => {
  const hash = id.split("").reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const hue = Math.abs(hash) % 360;
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><rect width="500" height="500" fill="hsl(${hue}, 70%, 20%)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="100" fill="rgba(255,255,255,0.2)">♫</text></svg>`;
};

export const generateMockCoverPng = (id: string): string => {
  if (typeof document === 'undefined') return generateMockCover(id);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return generateMockCover(id);
    
    const hash = id.split("").reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const hue = Math.abs(hash) % 360;
    
     
    ctx.fillStyle = `hsl(${hue}, 65%, 22%)`;
    ctx.fillRect(0, 0, 512, 512);
    
     
    ctx.beginPath();
    ctx.arc(256, 256, 140, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 75%, 35%, 0.3)`;
    ctx.fill();
    
     
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 160px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♫', 256, 256);
    
    return canvas.toDataURL('image/png');
  } catch (e) {
    return generateMockCover(id);
  }
};

export const parseFileMetadata = async (file: File): Promise<{ title?: string, artist?: string, album?: string, coverUrl?: string, year?: string, albumArtist?: string, duration?: number, lyrics?: string }> => {
  const isDesktop = () => (window as any).require !== undefined;
  
  if (isDesktop()) {
    try {
      const electron = (window as any).require('electron');
      const ipcRenderer = electron.ipcRenderer;
      let path = (file as any).path;
      if (!path && electron.webUtils && typeof electron.webUtils.getPathForFile === 'function') {
        try {
          path = electron.webUtils.getPathForFile(file);
        } catch (e) {}
      }
      if (path) {
        const tags: any = await Promise.race([
          ipcRenderer.invoke('read-id3-tags', { filePath: path }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Electron IPC timeout')), 10000))
        ]);
        if (tags) {
          return {
            title: tags.title,
            artist: tags.artist,
            album: tags.album,
            albumArtist: tags.albumArtist,
            coverUrl: tags.coverUrl,  
            year: tags.year,
            lyrics: tags.lyrics,
            duration: typeof tags.duration === 'number' ? tags.duration : undefined
          };
        }
      }
    } catch (e) {
      console.error("Error reading ID3 tags via Electron IPC:", e);
    }
  }

  return new Promise((resolve) => {
    if (!jsmediatags) {
       console.warn("jsmediatags library not loaded from CDN");
       resolve({});
       return;
    }

    let timeoutId = setTimeout(() => {
      resolve({});
    }, 1500);

    try {
      jsmediatags.read(file, {
        onSuccess: (tag: any) => {
          clearTimeout(timeoutId);
          const tags = tag.tags;
          let coverUrl = undefined;

          if (tags.picture) {
            const { data, format } = tags.picture;
            const uint8Array = new Uint8Array(data);
            const blob = new Blob([uint8Array], { type: format });
            coverUrl = URL.createObjectURL(blob);
          }

          resolve({
            title: tags.title,
            artist: tags.artist,
            album: tags.album,
            albumArtist: tags.TPE2?.data,
            coverUrl,
            year: tags.year
          });
        },
        onError: (error: any) => {
          clearTimeout(timeoutId);
          resolve({});
        }
      });
    } catch (e) {
      clearTimeout(timeoutId);
      console.error("jsmediatags sync error:", e);
      resolve({});
    }
  });
};

export const fileToDataURL = (file: File): Promise<string> => {
  if (typeof window !== 'undefined' && (window as any).require !== undefined && (file as any).path) {
    return Promise.resolve(`file://${encodeURI((file as any).path.replace(/\\/g, '/'))}`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject("Failed to read file");
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const parseLrc = (lrcString: string): LyricLine[] => {
    if (!lrcString || isJunkLyrics(lrcString)) return [];
    
    const lines = lrcString.split('\n');
    const lyrics: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    const hasTimestamps = lines.some(line => timeRegex.test(line));

    if (!hasTimestamps) {
        return lines
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(text => ({ time: -1, text }));
    }

    lines.forEach(line => {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3], 10);
            const totalSeconds = minutes * 60 + seconds + milliseconds / (match[3].length === 3 ? 1000 : 100);
            const text = line.replace(timeRegex, '').trim();
            if (text) {
                lyrics.push({ time: totalSeconds, text });
            }
        }
    });

    return lyrics.sort((a, b) => a.time - b.time);
};

 
export const sortTracks = (tracks: Track[]): Track[] => {
    return [...tracks].sort((a, b) => {
        const titleA = (a.title || "").trim();
        const titleB = (b.title || "").trim();
        
         
        const isEngA = /^[a-zA-Z]/.test(titleA);
        const isEngB = /^[a-zA-Z]/.test(titleB);

         
        if (!isEngA && isEngB) return -1;
        if (isEngA && !isEngB) return 1;

         
        return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
    });
};

 
const cleanString = (str: string) => {
    const cleaned = str.replace(/\(.*\)/g, '').replace(/\[.*\]/g, '').replace(/feat\.|ft\./gi, '').trim();
    return cleaned || str.trim();
};

export const isJunkLyrics = (lyrics?: string | null): boolean => {
    if (!lyrics || !lyrics.trim()) return true;
    const trimmed = lyrics.trim();
    if (trimmed === '[00:00.00]' || trimmed === '[00:00.00]你好！' || trimmed === '[00:00.00]你好') return true;
    if (trimmed.includes('你好') && trimmed.length < 20) return true;
    return false;
};

export const fetchLyricsFromLRCLIB = async (artist: string, title: string, duration?: number): Promise<string | null> => {
    if (!artist || !title) return null;
    try {
        const cleanArtist = cleanString(artist);
        let cleanTitle = cleanString(title);
        cleanTitle = cleanTitle.replace(/-.*(remix|remaster|edit|mix|version|single|live).*/gi, '').trim() || cleanTitle;

        const normalize = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
        const normTargetArtist = normalize(cleanArtist);
        const normTargetTitle = normalize(cleanTitle);

        const isArtistMatch = (candArtist?: string | null) => {
            const cand = normalize(candArtist);
            if (!cand || !normTargetArtist) return false;
            return cand === normTargetArtist || cand.includes(normTargetArtist) || normTargetArtist.includes(cand);
        };

        const isTitleMatch = (candTitle?: string | null) => {
            const cand = normalize(candTitle);
            if (!cand || !normTargetTitle) return false;
            return cand === normTargetTitle || cand.includes(normTargetTitle) || normTargetTitle.includes(cand);
        };

        const isValidSynced = (lyr?: string | null) => {
            if (!lyr || isJunkLyrics(lyr)) return false;
            return /\[\d{2}:\d{2}\.\d{2,3}\]/.test(lyr);
        };

        const isValidPlain = (lyr?: string | null) => {
            if (!lyr || isJunkLyrics(lyr)) return false;
            return lyr.trim().length > 5;
        };

        const durParam = (duration && duration > 0) ? `&duration=${Math.round(duration)}` : '';
        const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}${durParam}`;

        try {
            const getRes = await fetch(getUrl);
            if (getRes.ok) {
                const item = await getRes.json();
                if (item && !item.instrumental) {
                    if (isArtistMatch(item.artistName) && isTitleMatch(item.trackName)) {
                        if (isValidSynced(item.syncedLyrics)) return item.syncedLyrics!;
                        if (isValidPlain(item.plainLyrics)) return item.plainLyrics!;
                    }
                }
            }
        } catch (e) {
            console.error("[LRCLIB] Exact get error:", e);
        }

        const rawCandidates: any[] = [];
        const fetchSearch = async (url: string) => {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        data.forEach(d => { if (d) rawCandidates.push(d); });
                    }
                }
            } catch (e) {}
        };

        await fetchSearch(`https://lrclib.net/api/search?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`);

        if (rawCandidates.length === 0) {
            await fetchSearch(`https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`);
        }

        const validCandidates = rawCandidates.filter(item => {
            if (!item || item.instrumental) return false;
            if (!isValidSynced(item.syncedLyrics) && !isValidPlain(item.plainLyrics)) return false;
            if (!isArtistMatch(item.artistName)) return false;
            if (!isTitleMatch(item.trackName)) return false;
            if (duration && duration > 0 && item.duration && item.duration > 0) {
                if (Math.abs(item.duration - duration) > 25) return false;
            }
            return true;
        });

        if (duration && duration > 0) {
            validCandidates.sort((a, b) => {
                const diffA = a.duration ? Math.abs(a.duration - duration) : 999;
                const diffB = b.duration ? Math.abs(b.duration - duration) : 999;
                return diffA - diffB;
            });
        }

        for (const item of validCandidates) {
            if (isValidSynced(item.syncedLyrics)) return item.syncedLyrics!;
        }

        for (const item of validCandidates) {
            if (isValidPlain(item.plainLyrics)) return item.plainLyrics!;
        }

        return null;
    } catch (error) {
        console.error("[LRCLIB] Error fetching lyrics:", error);
        return null;
    }
};

export const fetchOpenSourceArtistImage_Safe = async (artistName: string): Promise<{ avatar: string, banner: string } | null> => {
    try {
        const cArtist = cleanString(artistName);

         
        const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(cArtist)}&language=en&limit=1&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (!searchData.search || searchData.search.length === 0) return null;
        const qid = searchData.search[0].id;

         
        const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`;
        const claimsRes = await fetch(claimsUrl);
        const claimsData = await claimsRes.json();

        const claims = claimsData.claims?.P18;
        if (!claims || claims.length === 0) return null;

         
        const fileName = claims[0].mainsnak.datavalue.value;
        const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
        
        const imgRes = await fetch(imageInfoUrl);
        const imgData = await imgRes.json();

        const pages = imgData.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') return null;

        const finalUrl = pages[pageId].imageinfo[0].url;
        return { avatar: finalUrl, banner: finalUrl };

    } catch (e) {
         
        return null;
    }
};

 
export const fetchOpenSourceCover = async () => null;