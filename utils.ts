
import { LyricLine } from "./types";

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
        console.log('Error reading tags:', error);
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
    
    // Check if the text actually has timestamps
    const hasTimestamps = lines.some(line => timeRegex.test(line));

    if (!hasTimestamps) {
        // Plain text mode: return lines with time -1 to indicate no sync
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