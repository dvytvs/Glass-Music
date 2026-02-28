const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

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
            
            // Handle multiple artists
            let artistName = trackFull.artist.name;
            if (trackFull.contributors && trackFull.contributors.length > 1) {
                artistName = trackFull.contributors.map(c => c.name).join(', ');
            }
            
            return {
                title: trackFull.title,
                artist: artistName,
                album: trackFull.album.title,
                cover: trackFull.album.cover_xl || trackFull.album.cover_big,
                year: albumFull.release_date ? albumFull.release_date.substring(0, 4) : ""
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
            result.avatar = artist.picture_xl || artist.picture_big;
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
                const img = lfData.artist.image.find(i => i.size === 'mega' || i.size === 'extralarge');
                if (img) result.avatar = img['#text'];
            }
        }
    } catch (err) { console.error("Last.fm error:", err); }

    return (result.avatar || result.bio) ? result : null;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
