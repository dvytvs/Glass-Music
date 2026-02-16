
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const NodeID3 = require('node-id3');
const fs = require('fs');
const YTMusic = require('ytmusic-api');

// Инициализация YTMusic API
const yt = new YTMusic();
let isYtReady = false;

yt.initialize().then(() => {
    isYtReady = true;
    console.log('[YTMusic] API Ready');
}).catch(err => {
    console.error('[YTMusic] Init Error:', err);
});

// --- PERFORMANCE FLAGS ---
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('force-gpu-mem-available-mb', '2048'); 
app.commandLine.appendSwitch('disable-background-timer-throttling');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    title: 'Glass Music',
    icon: path.join(__dirname, 'assets', 'glass-music.png'),
    backgroundColor: '#000000',
    titleBarStyle: 'hiddenInset',
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, 
      webSecurity: false,
      webviewTag: true,
      autoplayPolicy: 'no-user-gesture-required',
      webgl: true,
      experimentalFeatures: true
    },
  });

  mainWindow.setMenuBarVisibility(false);

  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';

  if (process.env.npm_lifecycle_event === 'electron:dev') {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// --- STORAGE HANDLERS ---
const userDataPath = app.getPath('userData');

ipcMain.handle('save-local-data', async (event, { key, data }) => {
    try {
        const filePath = path.join(userDataPath, `${key}.json`);
        await fs.promises.writeFile(filePath, JSON.stringify(data));
        return { success: true };
    } catch (e) {
        console.error(`[Main] Save failed for ${key}:`, e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-local-data', async (event, { key }) => {
    try {
        const filePath = path.join(userDataPath, `${key}.json`);
        if (fs.existsSync(filePath)) {
            const raw = await fs.promises.readFile(filePath, 'utf-8');
            return JSON.parse(raw);
        }
        return null;
    } catch (e) {
        console.error(`[Main] Load failed for ${key}:`, e);
        return null;
    }
});

ipcMain.handle('clear-local-data', async (event) => {
    try {
        const files = ['glass_music_library_v1.json', 'glass_music_theme_v1.json', 'glass_music_artists_v1.json', 'glass_music_profile_v1.json'];
        for (const file of files) {
            const filePath = path.join(userDataPath, file);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// --- YT MUSIC METADATA SEARCH ---
ipcMain.handle('get-metadata', async (event, query) => {
    try {
        if (!isYtReady) await yt.initialize();
        const results = await yt.search(query);
        const songs = results.filter(r => r.type === 'SONG' || r.type === 'MUSIC_VIDEO_TYPE_ATV');
        
        if (songs.length > 0) {
            const track = songs[0];
            return {
                title: track.name || track.title,
                artist: track.artist ? (track.artist.name || track.artist) : (track.artists && track.artists[0] ? track.artists[0].name : 'Unknown Artist'),
                album: track.album ? (track.album.name || track.album) : 'Unknown Album',
                cover: track.thumbnails && track.thumbnails.length > 0 ? track.thumbnails[track.thumbnails.length - 1].url : null
            };
        }
        return null;
    } catch (error) {
        console.error('[YTMusic] Search error:', error);
        return null;
    }
});

// --- NEW: ARTIST METADATA SEARCH ---
ipcMain.handle('get-artist-metadata', async (event, artistName) => {
    try {
        if (!isYtReady) await yt.initialize();
        
        console.log(`[YTMusic] Searching for artist: ${artistName}`);
        const results = await yt.search(artistName);
        const artists = results.filter(r => r.type === 'ARTIST');
        
        if (artists.length > 0) {
            const artist = artists[0];
            const fullArtist = await yt.getArtist(artist.artistId);
            
            return {
                avatar: fullArtist.thumbnails && fullArtist.thumbnails.length > 0 
                    ? fullArtist.thumbnails[fullArtist.thumbnails.length - 1].url 
                    : null,
                banner: fullArtist.thumbnails && fullArtist.thumbnails.length > 1 
                    ? fullArtist.thumbnails[fullArtist.thumbnails.length - 1].url // Зачастую последний - самый большой
                    : (fullArtist.thumbnails ? fullArtist.thumbnails[0].url : null)
            };
        }
        return null;
    } catch (error) {
        console.error('[YTMusic] Artist search error:', error);
        return null;
    }
});

// --- METADATA HANDLERS (LOCAL ID3) ---
ipcMain.handle('write-metadata', async (event, { filePath, tags }) => {
  if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Файл не существует.' };
  }

  const id3Tags = {
    title: tags.title,
    artist: tags.artist,
    album: tags.album,
    year: tags.year,
    unsynchronisedLyrics: {
      language: "eng",
      text: tags.lyrics || ""
    }
  };

  if (tags.coverUrl && tags.coverUrl.startsWith('data:image')) {
    try {
        const matches = tags.coverUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            id3Tags.image = {
            mime: matches[1],
            type: { id: 3, name: 'front cover' },
            description: 'Cover',
            imageBuffer: Buffer.from(matches[2], 'base64')
            };
        }
    } catch (e) {
        console.warn("Ошибка обработки обложки:", e);
    }
  }

  try {
      const success = NodeID3.write(id3Tags, filePath);
      return success ? { success: true } : { success: false, error: "Ошибка библиотеки NodeID3." };
  } catch (err) {
      console.error("Ошибка при записи:", err);
      return { success: false, error: err.message };
  }
});

ipcMain.handle('show-item-in-folder', (event, filePath) => {
    if (filePath) {
        shell.showItemInFolder(filePath);
    }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
