const { app, BrowserWindow, ipcMain, nativeTheme, Tray, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const NodeID3 = require('node-id3');

// Disable Chromium's MPRIS / Media Session integration to prevent playbackRate from syncing to the OS
app.commandLine.appendSwitch('disable-features', 'MediaSessionService,HardwareMediaKeyHandling');

let mainWindow;
let tray;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });

    function createTray() {
        const { nativeImage } = require('electron');
        const iconPath = path.join(__dirname, 'trei', 'trei.png');
        
        // Create native image from path (works better inside asar archives)
        let trayIcon = nativeImage.createFromPath(iconPath);
        
        tray = new Tray(trayIcon); 
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Show Player', click: () => mainWindow.show() },
            { type: 'separator' },
            { label: 'Quit', click: () => {
                app.isQuitting = true;
                app.quit();
            }}
        ]);
        tray.setToolTip('Glass Music');
        tray.setContextMenu(contextMenu);
        tray.on('click', () => {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        });
    }

    function createWindow() {
    mainWindow = new BrowserWindow({
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
    
    if (process.env.npm_lifecycle_event === 'electron:dev') {
        mainWindow.loadURL('http://127.0.0.1:3000');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        let isPlaying = false;

        ipcMain.on('playback-state-changed', (e, state) => {
            isPlaying = state === 'playing';
            if (tray) {
                tray.setToolTip(`Glass Music - ${state === 'playing' ? 'Playing' : 'Paused'}`);
            }
        });

        mainWindow.on('close', (e) => {
            if (!app.isQuitting && isPlaying) {
                e.preventDefault();
                mainWindow.hide();
            } else {
                app.isQuitting = true;
                app.quit();
            }
        });

        // Notify renderer about theme changes
        nativeTheme.on('updated', () => {
            if (mainWindow) {
                mainWindow.webContents.send('system-theme-updated', {
                    shouldUseDarkColors: nativeTheme.shouldUseDarkColors
                });
            }
        });

        if (!tray) createTray();
    }

app.setPath('userData', path.join(app.getPath('appData'), 'glass-music'));
const userDataPath = app.getPath('userData');

ipcMain.handle('get-system-info', async () => {
    return {
        locale: app.getLocale(),
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors
    };
});

ipcMain.handle('save-local-data', async (e, { key, data }) => {
    try {
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }
        const filePath = path.join(userDataPath, `${key}.json`);
        const tempPath = path.join(userDataPath, `${key}.json.tmp`);
        await fs.promises.writeFile(tempPath, JSON.stringify(data));
        await fs.promises.rename(tempPath, filePath);
        return { success: true };
    } catch (err) { 
        console.error("Failed to save local data:", err);
        return { success: false }; 
    }
});

ipcMain.on('save-local-data-sync', (e, { key, data }) => {
    try {
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }
        const filePath = path.join(userDataPath, `${key}.json`);
        const tempPath = path.join(userDataPath, `${key}.json.tmp`);
        fs.writeFileSync(tempPath, JSON.stringify(data));
        fs.renameSync(tempPath, filePath);
        e.returnValue = { success: true };
    } catch (err) { 
        console.error("Failed to save local data sync:", err);
        e.returnValue = { success: false }; 
    }
});

ipcMain.handle('get-local-data', async (e, { key }) => {
    try {
        const filePath = path.join(userDataPath, `${key}.json`);
        if (fs.existsSync(filePath)) {
            const raw = await fs.promises.readFile(filePath, 'utf-8');
            try {
                return JSON.parse(raw);
            } catch (parseErr) {
                console.error(`Failed to parse ${filePath}, backing up...`);
                await fs.promises.copyFile(filePath, `${filePath}.corrupted-${Date.now()}`);
                return null;
            }
        }
        return null;
    } catch (err) { return null; }
});

ipcMain.handle('get-metadata', async (e, query) => {
    try {
        const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const trackShort = data.data[0];
            
            // Fetch full track details for contributors and album details for year
            const [trackRes, albumRes] = await Promise.all([
                fetch(`https://api.deezer.com/track/${trackShort.id}`),
                fetch(`https://api.deezer.com/album/${trackShort.album.id}`)
            ]);
            
            const trackFull = await trackRes.json();
            const albumFull = await albumRes.json();
            
            // Handle multiple artists for track
            let artistName = trackFull.artist.name;
            if (trackFull.contributors && trackFull.contributors.length > 1) {
                artistName = trackFull.contributors.map(c => c.name).join(', ');
            }
            
            // Handle multiple artists for album
            let albumArtistName = albumFull.artist ? albumFull.artist.name : (trackFull.album.artist ? trackFull.album.artist.name : artistName);
            if (albumFull.contributors && albumFull.contributors.length > 1) {
                albumArtistName = albumFull.contributors.map(c => c.name).join(', ');
            }
            
            return {
                title: trackFull.title,
                artist: artistName,
                album: trackFull.album.title,
                albumArtist: albumArtistName,
                cover: trackFull.album.cover_xl || trackFull.album.cover_big,
                year: trackFull.release_date ? trackFull.release_date.substring(0, 4) : (albumFull.release_date ? albumFull.release_date.substring(0, 4) : "")
            };
        }
        return null;
    } catch (err) { 
        console.error("Metadata fetch error:", err);
        return null; 
    }
});

ipcMain.handle('get-artist-metadata', async (e, artistName) => {
    let result = { avatar: null, banner: null, bio: "" };
    const cleanName = artistName.trim();
    if (!cleanName || cleanName.toLowerCase() === 'неизвестный артист') return null;

    // 1. Fetch from Deezer (Images)
    try {
        const dzRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(cleanName)}&limit=10`);
        const dzData = await dzRes.json();
        if (dzData.data && dzData.data.length > 0) {
            // Try to find exact match first
            const exactMatch = dzData.data.find(a => a.name.toLowerCase() === cleanName.toLowerCase());
            const artist = exactMatch || dzData.data[0];
            result.avatar = artist.picture_xl || artist.picture_big || artist.picture_medium || artist.picture;
            result.banner = result.avatar; // Deezer doesn't have explicit banners in search
        }
    } catch (err) { console.error("Deezer error:", err); }

    // 2. Fetch from Last.fm (Bio)
    try {
        const apiKey = process.env.LASTFM_API_KEY || '832c52267b9e19bcde175057e7c3a6fa';
        console.log(`[Main] Fetching Last.fm bio for: ${cleanName}`);
        const lfRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(cleanName)}&api_key=${apiKey}&format=json`);
        const lfData = await lfRes.json();
        
        if (lfData.error) {
            console.error(`[Main] Last.fm API error: ${lfData.message} (Code: ${lfData.error})`);
        } else if (lfData.artist && lfData.artist.bio) {
            const bioData = lfData.artist.bio;
            let bio = bioData.content || bioData.summary || "";
            
            // 1. Strip HTML tags
            bio = bio.replace(/<[^>]*>?/gm, '');
            
            // 2. Decode common HTML entities
            bio = bio.replace(/&quot;/g, '"')
                     .replace(/&amp;/g, '&')
                     .replace(/&lt;/g, '<')
                     .replace(/&gt;/g, '>')
                     .replace(/&apos;/g, "'")
                     .replace(/&nbsp;/g, ' ');

            // 3. Clean up Last.fm specific footers
            bio = bio.replace(/User-contributed text is available under the Creative Commons By-SA License; additional terms may apply\./g, '');
            bio = bio.replace(/Read more on Last\.fm.*/gi, '');
            
            result.bio = bio.trim();
            
            // If bio is still just a "Read more" or similar link-like text, clear it
            if (result.bio.toLowerCase().includes('last.fm/music') && result.bio.length < 100) {
                result.bio = "";
            }

            console.log(`[Main] Bio for ${cleanName}: ${result.bio ? result.bio.substring(0, 50) + '...' : 'EMPTY'}`);
            
            // If Deezer failed, try Last.fm for image
            if (!result.avatar && lfData.artist.image) {
                const img = lfData.artist.image.find(i => i.size === 'mega' || i.size === 'extralarge' || i.size === 'large');
                if (img && img['#text'] && !img['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
                    result.avatar = img['#text'];
                    result.banner = result.avatar;
                }
            }
        }
    } catch (err) { console.error("Last.fm error:", err); }

    return (result.avatar || result.bio) ? result : null;
});

ipcMain.handle('read-id3-tags', async (e, filePath) => {
    try {
        if (!fs.existsSync(filePath)) return null;
        
        const tags = await new Promise((resolve) => {
            let timeoutId = setTimeout(() => resolve(null), 1500);
            NodeID3.read(filePath, (err, tags) => {
                clearTimeout(timeoutId);
                if (err) resolve(null);
                else resolve(tags);
            });
        });

        if (!tags) return null;

        let coverUrl = null;
        if (tags.image && tags.image.imageBuffer) {
            const crypto = require('crypto');
            const hash = crypto.createHash('md5').update(tags.image.imageBuffer).digest('hex');
            const coversDir = path.join(userDataPath, 'covers');
            if (!fs.existsSync(coversDir)) {
                fs.mkdirSync(coversDir, { recursive: true });
            }
            const ext = tags.image.mime === 'image/png' ? 'png' : 'jpg';
            const coverPath = path.join(coversDir, `${hash}.${ext}`);
            if (!fs.existsSync(coverPath)) {
                fs.writeFileSync(coverPath, tags.image.imageBuffer);
            }
            coverUrl = `file://${coverPath.replace(/\\/g, '/')}`;
        }

        return {
            title: tags.title,
            artist: tags.artist,
            album: tags.album,
            albumArtist: tags.performerInfo,
            coverUrl: coverUrl,
            year: tags.year
        };
    } catch (err) {
        console.error("Error reading ID3 tags:", err);
        return null;
    }
});

ipcMain.handle('write-id3-tags', async (e, { filePath, tags }) => {
    try {
        if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
        
        let coverBuffer = null;
        if (tags.coverUrl && tags.coverUrl.startsWith('data:image')) {
            const base64Data = tags.coverUrl.split(';base64,').pop();
            coverBuffer = Buffer.from(base64Data, 'base64');
        } else if (tags.coverUrl && tags.coverUrl.startsWith('http')) {
            const res = await fetch(tags.coverUrl);
            const arrayBuffer = await res.arrayBuffer();
            coverBuffer = Buffer.from(arrayBuffer);
        }

        const id3Tags = {
            title: tags.title,
            artist: tags.artist,
            album: tags.album,
            performerInfo: tags.albumArtist,
            year: tags.year,
            unsynchronisedLyrics: {
                language: 'eng',
                text: tags.lyrics || ''
            }
        };

        if (coverBuffer) {
            id3Tags.image = {
                mime: 'image/jpeg',
                type: { id: 3, name: 'front cover' },
                description: 'Cover',
                imageBuffer: coverBuffer
            };
        }

        const success = NodeID3.update(id3Tags, filePath);
        return { success: success !== false };
    } catch (err) {
        console.error("ID3 write error:", err);
        return { success: false, error: err.message };
    }
});

    app.on('before-quit', () => { app.isQuitting = true; });
    app.whenReady().then(() => {
        createWindow();
        
        globalShortcut.register('MediaPlayPause', () => {
            if (mainWindow) mainWindow.webContents.send('media-play-pause');
        });
        globalShortcut.register('MediaNextTrack', () => {
            if (mainWindow) mainWindow.webContents.send('media-next-track');
        });
        globalShortcut.register('MediaPreviousTrack', () => {
            if (mainWindow) mainWindow.webContents.send('media-previous-track');
        });
    });
    
    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });
    
    app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
