
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
