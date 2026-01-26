
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const NodeID3 = require('node-id3');
const fs = require('fs');
const os = require('os');

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
      contextIsolation: false, // Required for window.require
      webSecurity: false,
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

  // Open links in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// --- STORAGE HANDLERS (Fix for Data Persistence) ---
// We use direct FS access because localStorage has a 5MB-10MB limit which Base64 images easily exceed.

const userDataPath = app.getPath('userData');

ipcMain.handle('save-local-data', async (event, { key, data }) => {
    try {
        const filePath = path.join(userDataPath, `${key}.json`);
        // Write asynchronously to avoid UI freeze, but verify success
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
        const files = ['glass_music_library_v1.json', 'glass_music_theme_v1.json', 'glass_music_artists_v1.json'];
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

// --- METADATA HANDLERS ---

ipcMain.handle('write-metadata', async (event, { filePath, tags }) => {
  console.log("=== НАЧАЛО ЗАПИСИ ТЕГОВ (SIMPLE MODE) ===");
  console.log("Файл:", filePath);

  if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Файл не существует.' };
  }

  // 1. Prepare Tags Object
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

  // 2. Direct Write
  try {
      const success = NodeID3.write(id3Tags, filePath);
      
      if (success) {
          console.log("NodeID3 вернул успех.");
          return { success: true };
      } else {
          console.error("NodeID3 вернул false.");
          return { success: false, error: "Ошибка записи файла (библиотека вернула false)." };
      }
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
