
import { LyricLine, Track } from "./types";

// Using global jsmediatags from CDN
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

export const parseFileMetadata = (file: File): Promise<{ title?: string, artist?: string, album?: string, coverUrl?: string }> => {
  return new Promise((resolve) => {
    if (!jsmediatags) {
       console.warn("jsmediatags library not loaded from CDN");
       resolve({});
       return;
    }

    jsmediatags.read(file, {
      onSuccess: (tag: any) => {
        const tags = tag.tags;
        let coverUrl = undefined;

        if (tags.picture) {
          const { data, format } = tags.picture;
          let base64String = "";
          for (let i = 0; i < data.length; i++) {
            base64String += String.fromCharCode(data[i]);
          }
          coverUrl = `data:${format};base64,${window.btoa(base64String)}`;
        }

        resolve({
          title: tags.title,
          artist: tags.artist,
          album: tags.album,
          coverUrl
        });
      },
      onError: (error: any) => {
        resolve({});
      }
    });
  });
};

export const fileToDataURL = (file: File): Promise<string> => {
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
    if (!lrcString) return [];
    
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

// --- SORTING HELPER ---
export const sortTracks = (tracks: Track[]): Track[] => {
    return [...tracks].sort((a, b) => {
        const titleA = (a.title || "").trim();
        const titleB = (b.title || "").trim();
        
        // Check if starts with English letter (A-Z, a-z)
        const isEngA = /^[a-zA-Z]/.test(titleA);
        const isEngB = /^[a-zA-Z]/.test(titleB);

        // Logic: Non-English (Russian, Symbols) comes BEFORE English
        if (!isEngA && isEngB) return -1;
        if (isEngA && !isEngB) return 1;

        // Otherwise, standard alphabetical sort (case insensitive)
        return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
    });
};

// --- WIKIDATA ARTIST FETCH ONLY ---
const cleanString = (str: string) => {
    return str.replace(/\(.*\)/g, '').replace(/\[.*\]/g, '').replace(/feat\.|ft\./gi, '').trim();
};

export const fetchLyricsFromLRCLIB = async (artist: string, title: string): Promise<string | null> => {
    console.log(`[LRCLIB] Fetching lyrics for: ${artist} - ${title}`);
    try {
        const cleanArtist = cleanString(artist);
        const cleanTitle = cleanString(title);
        
        // 1. Try GET (Best match)
        const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
        
        const response = await fetch(getUrl, {
            headers: {
                'User-Agent': 'MyElectronPlayer/1.0.0 (https://github.com)'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log("[LRCLIB] GET success:", data.trackName);
            return data.syncedLyrics || data.plainLyrics || null;
        }

        console.log(`[LRCLIB] GET failed with status ${response.status}, trying SEARCH...`);

        // 2. Try SEARCH (Fallback)
        const searchUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
        const searchRes = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'MyElectronPlayer/1.0.0 (https://github.com)'
            }
        });

        if (searchRes.ok) {
            const results = await searchRes.json();
            if (results && results.length > 0) {
                console.log("[LRCLIB] SEARCH success, found", results.length, "results. Taking first.");
                return results[0].syncedLyrics || results[0].plainLyrics || null;
            }
        }

        console.warn(`[LRCLIB] No lyrics found for ${artist} - ${title}`);
        return null;
    } catch (error) {
        console.error("[LRCLIB] Error fetching lyrics:", error);
        return null;
    }
};

export const fetchOpenSourceArtistImage_Safe = async (artistName: string): Promise<{ avatar: string, banner: string } | null> => {
    try {
        const cArtist = cleanString(artistName);

        // 1. Search Wikidata
        const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(cArtist)}&language=en&limit=1&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (!searchData.search || searchData.search.length === 0) return null;
        const qid = searchData.search[0].id;

        // 2. Get Claims (Image = P18)
        const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`;
        const claimsRes = await fetch(claimsUrl);
        const claimsData = await claimsRes.json();

        const claims = claimsData.claims?.P18;
        if (!claims || claims.length === 0) return null;

        // 3. Resolve Image URL
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
        // Silent fail - user won't see errors, just no image.
        return null;
    }
};

// Placeholder for deleted function to prevent import errors if any remain
export const fetchOpenSourceCover = async () => null;