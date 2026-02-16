
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Configs
const LASTFM_API_KEY = '832c52267b9e19bcde175057e7c3a6fa';
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const DEEZER_BASE_URL = 'https://api.deezer.com/search';

// Список известных хэшей заглушек Last.fm (звезды на сером фоне)
const LFM_PLACEHOLDERS = [
    '2a96cbd8b46e442fc41c2b86b821562f',
    '412fc41c2b86b821562f',
    '03831777-62f3-424d-97e3-a62d77d12f3e'
];

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1000,
        minHeight: 600,
        title: 'Glass Music',
        backgroundColor: '#000000',
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
        },
    });

    mainWindow.setMenuBarVisibility(false);
    const startUrl = 'http://localhost:3000';
    
    if (process.env.npm_lifecycle_event === 'electron:dev') {
        setTimeout(() => {
            mainWindow.loadURL(startUrl).catch(() => {
                mainWindow.loadURL('http://localhost:3001');
            });
        }, 500); 
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
}

const userDataPath = app.getPath('userData');

ipcMain.handle('save-local-data', async (e, { key, data }) => {
    try {
        const filePath = path.join(userDataPath, `${key}.json`);
        await fs.promises.writeFile(filePath, JSON.stringify(data));
        return { success: true };
    } catch (err) { return { success: false }; }
});

ipcMain.handle('get-local-data', async (e, { key }) => {
    try {
        const filePath = path.join(userDataPath, `${key}.json`);
        if (fs.existsSync(filePath)) {
            const raw = await fs.promises.readFile(filePath, 'utf-8');
            return JSON.parse(raw);
        }
        return null;
    } catch (err) { return null; }
});

// ПОИСК МЕТАДАННЫХ ТРЕКА (Deezer API)
ipcMain.handle('get-metadata', async (e, query) => {
    try {
        console.log(`[Deezer Search] Ищем трек: ${query}`);
        const res = await fetch(`${DEEZER_BASE_URL}?q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        
        if (data.data && data.data.length > 0) {
            // Ищем лучшее совпадение
            const track = data.data[0];
            return {
                title: track.title,
                artist: track.artist.name,
                album: track.album.title,
                cover: track.album.cover_xl || track.album.cover_big || track.album.cover_medium
            };
        }
        return null;
    } catch (err) { 
        console.error('[Deezer Error]:', err.message);
        return null; 
    }
});

// ПОИСК АРТИСТА (Deezer для Фото + Last.fm для Био)
ipcMain.handle('get-artist-metadata', async (e, artistName) => {
    let result = { avatar: null, banner: null, bio: "" };
    const cleanName = artistName.trim();
    if (!cleanName || cleanName.toLowerCase() === 'неизвестный артист') return null;

    try {
        // 1. Ищем фото в Deezer
        const dzRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(cleanName)}&limit=10`);
        const dzData = await dzRes.json();
        
        if (dzData.data && dzData.data.length > 0) {
            // Пытаемся найти максимально точное совпадение по имени
            const exactMatch = dzData.data.find(a => a.name.toLowerCase() === cleanName.toLowerCase()) || dzData.data[0];
            result.avatar = exactMatch.picture_xl || exactMatch.picture_big;
            result.banner = result.avatar;
        }

        // 2. Ищем биографию в Last.fm
        const lfmUrl = `${LASTFM_BASE_URL}?method=artist.getinfo&artist=${encodeURIComponent(cleanName)}&api_key=${LASTFM_API_KEY}&format=json`;
        const lfmRes = await fetch(lfmUrl);
        const lfmData = await lfmRes.json();

        if (lfmData.artist) {
            const artist = lfmData.artist;
            result.bio = (artist.bio?.summary || "").replace(/<a\b[^>]*>(.*?)<\/a>/gi, "").trim();
            
            // Резервное фото из Last.fm если Deezer пустой (с фильтром звезд)
            if (!result.avatar) {
                const images = artist.image || [];
                const bestImg = images.find(i => i.size === 'mega' || i.size === 'extralarge');
                const url = bestImg ? bestImg['#text'] : null;
                const isPlaceholder = url && LFM_PLACEHOLDERS.some(p => url.includes(p));
                
                if (url && !isPlaceholder && url.startsWith('http')) {
                    result.avatar = url;
                    result.banner = url;
                }
            }
        }

        if (result.avatar) {
            console.log(`[OK] Найдено лицо для: ${cleanName}`);
        } else {
            console.log(`[NOT FOUND] Нет фото для: ${cleanName}`);
        }

        return (result.avatar || result.bio) ? result : null;
    } catch (err) { 
        console.error(`[IPC Error] ${cleanName}:`, err.message);
        return null; 
    }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
