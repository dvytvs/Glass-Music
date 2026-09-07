const { app, BrowserWindow, ipcMain, nativeTheme, Tray, Menu, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const NodeID3 = require('node-id3');
const { downloadTrack } = require('./downloader.js');

 
let localMediaPort = 0;
const mediaServer = http.createServer((req, res) => {
    try {
        let rawUrl = req.url || '';
        let cleanUrl = rawUrl.split('?')[0];
        let filePath;
        try {
            filePath = decodeURIComponent(cleanUrl);
        } catch (e) {
            filePath = cleanUrl;
        }

        if (process.platform === 'win32') {
            while (filePath.startsWith('/')) {
                filePath = filePath.slice(1);
            }
        } else {
            if (!filePath.startsWith('/')) {
                filePath = '/' + filePath;
            }
        }

        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'
            });
            res.end();
            return;
        }

        if (!fs.existsSync(filePath)) {
            const normalized = path.normalize(filePath);
            if (fs.existsSync(normalized)) {
                filePath = normalized;
            } else {
                res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
                res.end('Not found');
                return;
            }
        }

        const stat = fs.statSync(filePath);
        const total = stat.size;
        const ext = path.extname(filePath).toLowerCase();
        
        let contentType = 'application/octet-stream';
        if (ext === '.mp3') contentType = 'audio/mpeg';
        else if (ext === '.flac') contentType = 'audio/flac';
        else if (ext === '.wav') contentType = 'audio/wav';
        else if (ext === '.ogg' || ext === '.opus') contentType = 'audio/ogg';
        else if (ext === '.m4a' || ext === '.aac' || ext === '.mp4') contentType = 'audio/mp4';
        else if (ext === '.webm') contentType = 'audio/webm';
        else if (ext === '.aiff' || ext === '.aif') contentType = 'audio/aiff';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.gif') contentType = 'image/gif';

        if (req.method === 'HEAD') {
            res.writeHead(200, {
                'Content-Length': total,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Cache-Control': 'no-cache'
            });
            res.end();
            return;
        }

        if (req.headers.range) {
            const range = req.headers.range;
            const parts = range.replace(/bytes=/, "").split("-");
            const partialstart = parts[0];
            const partialend = parts[1];
            
            const start = parseInt(partialstart, 10);
            const end = partialend ? parseInt(partialend, 10) : total - 1;
            const chunksize = (end - start) + 1;
            
            const fileStream = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${total}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Cache-Control': 'no-cache'
            });

            req.on('close', () => {
                if (fileStream && !fileStream.destroyed) {
                    fileStream.destroy();
                }
            });

            fileStream.pipe(res);
        } else {
            const fileStream = fs.createReadStream(filePath);
            res.writeHead(200, {
                'Content-Length': total,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Cache-Control': 'no-cache'
            });

            req.on('close', () => {
                if (fileStream && !fileStream.destroyed) {
                    fileStream.destroy();
                }
            });

            fileStream.pipe(res);
        }
    } catch (e) {
        console.error("Media Server Error:", e);
        if (!res.headersSent) {
            res.writeHead(500, { 'Access-Control-Allow-Origin': '*' });
        }
        res.end();
    }
});

mediaServer.listen(0, '127.0.0.1', () => {
    localMediaPort = mediaServer.address().port;
});

ipcMain.handle('get-media-port', () => localMediaPort);
ipcMain.on('get-media-port-sync', (e) => e.returnValue = localMediaPort);


 
if (process.platform === 'linux') {
    app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    if (app.setDesktopName) {
        app.setDesktopName('glass-music.desktop');
    }
}

app.setName('Glass Music');


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
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("http")) {
            require("electron").shell.openExternal(url);
            return { action: "deny" };
        }
        return { action: "allow" };
    });
    
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
            if (app.isQuitting) {
                return;
            }
            
            if (isPlaying) {
                e.preventDefault();
                mainWindow.hide();
            }
        });

        ipcMain.on('window-minimize', () => {
            if (mainWindow) mainWindow.minimize();
        });
        ipcMain.on('window-maximize', () => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) {
                    mainWindow.restore();
                }
                if (mainWindow.isFullScreen()) {
                    mainWindow.setFullScreen(false);
                } else if (mainWindow.isMaximized()) {
                    mainWindow.unmaximize();
                } else {
                    mainWindow.maximize();
                }
            }
        });
        ipcMain.on('window-close', () => {
             if (mainWindow) mainWindow.close();
        });

         
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

ipcMain.handle('select-folders', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'multiSelections']
    });
    return result.filePaths;
});

ipcMain.handle('scan-folders', async (e, folders) => {
    const audioExts = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac'];
    const files = [];

    async function scanDir(dir) {
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await scanDir(fullPath);
                } else if (entry.isFile() && audioExts.includes(path.extname(entry.name).toLowerCase())) {
                    const stat = await fs.promises.stat(fullPath);
                    files.push({
                        path: fullPath,
                        name: entry.name,
                        size: stat.size,
                        lastModified: stat.mtimeMs
                    });
                }
            }
        } catch (err) {
            console.error(`Failed to scan dir ${dir}:`, err);
        }
    }

    for (const folder of folders) {
        if (fs.existsSync(folder)) {
            await scanDir(folder);
        }
    }
    return files;
});

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
        const tempPath = path.join(userDataPath, `${key}_${Date.now()}_${Math.random().toString(36).slice(2)}.json.tmp`);
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
        const tempPath = path.join(userDataPath, `${key}_${Date.now()}_${Math.random().toString(36).slice(2)}.json.tmp`);
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

ipcMain.handle('get-metadata', async (e, { query }) => {
    try {
        const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
             
            let trackShort = data.data[0];
            const queryLower = query.toLowerCase();
            
            for (const item of data.data) {
                const titleLower = item.title.toLowerCase();
                const artistLower = item.artist.name.toLowerCase();
                
                 
                if (queryLower.includes(titleLower) && queryLower.includes(artistLower)) {
                    trackShort = item;
                    break;
                }
            }
            
             
            const [trackRes, albumRes] = await Promise.all([
                fetch(`https://api.deezer.com/track/${trackShort.id}`),
                fetch(`https://api.deezer.com/album/${trackShort.album.id}`)
            ]);
            
            const trackFull = await trackRes.json();
            const albumFull = await albumRes.json();
            
             
            let artistName = trackFull.artist.name;
            if (trackFull.contributors && trackFull.contributors.length > 1) {
                artistName = trackFull.contributors.map(c => c.name).join(', ');
            }
            
             
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

ipcMain.handle('get-artist-metadata', async (e, { artist, lastfmKey }) => {
    let result = { avatar: null, banner: null, bio: "" };
    const cleanName = artist.trim();
    if (!cleanName || cleanName.toLowerCase() === 'неизвестный артист') return null;

     
    try {
        const dzRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(cleanName)}&limit=10`);
        const dzData = await dzRes.json();
        if (dzData.data && dzData.data.length > 0) {
             
            const exactMatch = dzData.data.find(a => a.name.toLowerCase() === cleanName.toLowerCase());
            const artist = exactMatch || dzData.data[0];
            result.avatar = artist.picture_xl || artist.picture_big || artist.picture_medium || artist.picture;
            result.banner = result.avatar;  
        }
    } catch (err) { console.error("Deezer error:", err); }

     
    try {
        const apiKey = lastfmKey || process.env.LASTFM_API_KEY || process.env.VITE_LASTFM_API_KEY;
        if (apiKey) {
            console.log(`[Main] Fetching Last.fm bio for: ${cleanName}`);
            const lfRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(cleanName)}&api_key=${apiKey}&format=json`);
            const lfData = await lfRes.json();
            
            if (lfData.error) {
                console.error(`[Main] Last.fm API error: ${lfData.message} (Code: ${lfData.error})`);
            } else if (lfData.artist && lfData.artist.bio) {
                const bioData = lfData.artist.bio;
                let bio = bioData.content || bioData.summary || "";
            
                 
                bio = bio.replace(/<[^>]*>?/gm, '');
                
                 
                bio = bio.replace(/&quot;/g, '"')
                         .replace(/&amp;/g, '&')
                         .replace(/&lt;/g, '<')
                         .replace(/&gt;/g, '>')
                         .replace(/&apos;/g, "'")
                         .replace(/&nbsp;/g, ' ');

                 
                bio = bio.replace(/User-contributed text is available under the Creative Commons By-SA License; additional terms may apply\./g, '');
                bio = bio.replace(/Read more on Last\.fm.*/gi, '');
                
                result.bio = bio.trim();
                
                 
                if (result.bio.toLowerCase().includes('last.fm/music') && result.bio.length < 100) {
                    result.bio = "";
                }

                console.log(`[Main] Bio for ${cleanName}: ${result.bio ? result.bio.substring(0, 50) + '...' : 'EMPTY'}`);
                
                 
                if (!result.avatar && lfData.artist.image) {
                    const img = lfData.artist.image.find(i => i.size === 'mega' || i.size === 'extralarge' || i.size === 'large');
                    if (img && img['#text'] && !img['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
                        result.avatar = img['#text'];
                        result.banner = result.avatar;
                    }
                }
            }
        }
    } catch (err) { console.error("Last.fm error:", err); }

    return (result.avatar || result.bio) ? result : null;
});

ipcMain.handle('save-custom-image', async (e, { folder, filename, base64Data }) => {
    try {
        const destDir = path.join(userDataPath, folder);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        const filePath = path.join(destDir, filename);
        
        let buffer;
        if (base64Data.startsWith('data:image')) {
            const b64 = base64Data.split(';base64,').pop();
            buffer = Buffer.from(b64, 'base64');
        } else if (base64Data.startsWith('http')) {
            const res = await fetch(base64Data);
            const arrayBuffer = await res.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else {
            buffer = Buffer.from(base64Data, 'base64');
        }
        
        fs.writeFileSync(filePath, buffer);
        return { success: true, url: 'file://' + encodeURI(filePath.replace(/\\/g, '/')) };
    } catch (err) {
        console.error("Save custom image error:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('read-id3-tags', async (e, { filePath }) => {
    try {
        if (!fs.existsSync(filePath)) return null;
        const ext = path.extname(filePath).toLowerCase();

        const getFileUrl = (absPath) => {
            const clean = absPath.replace(/\\/g, '/');
            return process.platform === 'win32'
                ? `file:///${clean.startsWith('/') ? clean.slice(1) : clean}`
                : `file://${clean.startsWith('/') ? clean : '/' + clean}`;
        };

        let title = null;
        let artist = null;
        let album = null;
        let albumArtist = null;
        let year = null;
        let lyrics = null;
        let duration = 0;
        let foundImageBuffer = null;
        let foundMime = 'image/jpeg';

         
        try {
            const mm = require('music-metadata');
            const meta = await mm.parseFile(filePath, { duration: true });
            if (meta) {
                const common = meta.common || {};
                title = common.title || null;
                artist = common.artist || (Array.isArray(common.artists) ? common.artists.join(', ') : null);
                album = common.album || null;
                albumArtist = common.albumartist || null;
                year = common.year ? String(common.year) : (common.date ? String(common.date).substring(0, 4) : null);
                if (common.lyrics) {
                    lyrics = Array.isArray(common.lyrics) ? common.lyrics.join('\n') : String(common.lyrics);
                }
                if (meta.format && meta.format.duration && !Number.isNaN(meta.format.duration)) {
                    duration = Math.round(meta.format.duration);
                }

                 
                const pictures = common.picture || [];
                for (const p of pictures) {
                    if (p && p.data && p.data.length > 0) {
                        foundImageBuffer = p.data;
                        if (p.format) foundMime = p.format;
                        break;
                    }
                }

                 
                if (!foundImageBuffer && meta.native) {
                    for (const tagSetKey of Object.keys(meta.native)) {
                        const tagList = meta.native[tagSetKey] || [];
                        for (const item of tagList) {
                            if (item && (item.id === 'APIC' || item.id === 'PIC' || item.id === 'METADATA_BLOCK_PICTURE' || item.id === 'COVERART')) {
                                if (item.value) {
                                    if (Buffer.isBuffer(item.value.data)) {
                                        foundImageBuffer = item.value.data;
                                        if (item.value.format) foundMime = item.value.format;
                                        break;
                                    } else if (Buffer.isBuffer(item.value)) {
                                        foundImageBuffer = item.value;
                                        break;
                                    } else if (item.value.imageBuffer && Buffer.isBuffer(item.value.imageBuffer)) {
                                        foundImageBuffer = item.value.imageBuffer;
                                        break;
                                    }
                                }
                            }
                        }
                        if (foundImageBuffer) break;
                    }
                }
            }
        } catch (mmErr) {}

         
        if (ext === '.flac') {
            try {
                const Metaflac = require('metaflac-js');
                const flac = new Metaflac(filePath);
                const getTag = (name) => {
                    const t = flac.getTag(name);
                    return t && t.length > 0 ? t[0] : null;
                };
                title = title || getTag('TITLE');
                artist = artist || getTag('ARTIST');
                album = album || getTag('ALBUM');
                albumArtist = albumArtist || getTag('ALBUMARTIST') || getTag('ALBUM ARTIST');
                year = year || getTag('DATE') || getTag('YEAR');
                lyrics = lyrics || getTag('UNSYNCEDLYRICS') || getTag('LYRICS');

                if (!foundImageBuffer) {
                    const pic = flac.getPicture();
                    if (pic && pic.buffer) {
                        foundImageBuffer = pic.buffer;
                        if (pic.mime) foundMime = pic.mime;
                    }
                }
            } catch (flacErr) {}
        }

         
        try {
            const rawTags = NodeID3.read(filePath);
            if (rawTags) {
                title = title || rawTags.title;
                artist = artist || rawTags.artist;
                album = album || rawTags.album;
                albumArtist = albumArtist || rawTags.performerInfo;
                year = year || rawTags.year;
                if (!lyrics && rawTags.unsynchronisedLyrics) {
                    lyrics = rawTags.unsynchronisedLyrics.text;
                }
                if (!foundImageBuffer) {
                    if (rawTags.image && rawTags.image.imageBuffer) {
                        foundImageBuffer = rawTags.image.imageBuffer;
                        if (rawTags.image.mime) foundMime = rawTags.image.mime;
                    } else if (rawTags.raw && rawTags.raw.APIC) {
                        const apic = rawTags.raw.APIC;
                        if (Buffer.isBuffer(apic)) foundImageBuffer = apic;
                        else if (apic.imageBuffer) {
                            foundImageBuffer = apic.imageBuffer;
                            if (apic.mime) foundMime = apic.mime;
                        } else if (apic.data) {
                            foundImageBuffer = apic.data;
                            if (apic.mime) foundMime = apic.mime;
                        }
                    }
                }
            }
        } catch (nodeId3Err) {}

         
        if (!foundImageBuffer) {
            try {
                const stat = fs.statSync(filePath);
                const readSize = Math.min(stat.size, 10 * 1024 * 1024);
                const fd = fs.openSync(filePath, 'r');
                const headBuf = Buffer.alloc(readSize);
                fs.readSync(fd, headBuf, 0, readSize, 0);
                fs.closeSync(fd);

                let imgStart = -1;
                let isPng = false;
                for (let i = 0; i < headBuf.length - 8; i++) {
                    if (headBuf[i] === 0xFF && headBuf[i+1] === 0xD8 && headBuf[i+2] === 0xFF) {
                        imgStart = i;
                        isPng = false;
                        break;
                    } else if (headBuf[i] === 0x89 && headBuf[i+1] === 0x50 && headBuf[i+2] === 0x4E && headBuf[i+3] === 0x47) {
                        imgStart = i;
                        isPng = true;
                        break;
                    }
                }
                if (imgStart >= 0) {
                    if (isPng) {
                        const iendIdx = headBuf.indexOf(Buffer.from([0x49, 0x45, 0x4E, 0x44]), imgStart);
                        if (iendIdx > imgStart) {
                            foundImageBuffer = headBuf.slice(imgStart, iendIdx + 8);
                            foundMime = 'image/png';
                        }
                    } else {
                        for (let j = imgStart + 4; j < headBuf.length - 1; j++) {
                            if (headBuf[j] === 0xFF && headBuf[j+1] === 0xD9) {
                                foundImageBuffer = headBuf.slice(imgStart, j + 2);
                                foundMime = 'image/jpeg';
                                break;
                            }
                        }
                    }
                }
            } catch (binErr) {}
        }

         
        if (duration <= 0) {
            try {
                const fd = fs.openSync(filePath, 'r');
                const buf = Buffer.alloc(8192);
                const bytesRead = fs.readSync(fd, buf, 0, 8192, 0);
                fs.closeSync(fd);

                if (bytesRead >= 34 && ext === '.flac' && buf.toString('ascii', 0, 4) === 'fLaC') {
                    const streamInfo = buf.slice(8, 42);
                    const sr = (streamInfo[10] << 12) | (streamInfo[11] << 4) | (streamInfo[12] >> 4);
                    const samplesHi = BigInt(streamInfo[13] & 0x0F);
                    const samplesLo = BigInt(streamInfo.readUInt32BE(14));
                    const totalSamples = (samplesHi << 32n) | samplesLo;
                    if (sr > 0 && totalSamples > 0n) {
                        duration = Math.round(Number(totalSamples) / sr);
                    }
                } else if (bytesRead >= 44 && ext === '.wav' && buf.toString('ascii', 0, 4) === 'RIFF') {
                    const byteRate = buf.readUInt32LE(28);
                    const stat = fs.statSync(filePath);
                    if (byteRate > 0) duration = Math.round((stat.size - 44) / byteRate);
                }
            } catch (durErr) {}
        }

        let coverUrl = null;
        let coverDataUrl = null;

        if (foundImageBuffer && Buffer.isBuffer(foundImageBuffer) && foundImageBuffer.length > 0) {
            const crypto = require('crypto');
            const hash = crypto.createHash('md5').update(foundImageBuffer).digest('hex');
            const coversDir = path.join(userDataPath, 'covers');
            if (!fs.existsSync(coversDir)) {
                fs.mkdirSync(coversDir, { recursive: true });
            }
            const mimeLower = foundMime.toLowerCase();
            const extPic = mimeLower.includes('png') ? 'png' : (mimeLower.includes('webp') ? 'webp' : 'jpg');
            const coverPath = path.join(coversDir, `${hash}.${extPic}`);
            if (!fs.existsSync(coverPath)) {
                fs.writeFileSync(coverPath, foundImageBuffer);
            }
            coverUrl = getFileUrl(coverPath);
            coverDataUrl = `data:${mimeLower.startsWith('image/') ? mimeLower : 'image/' + mimeLower};base64,${foundImageBuffer.toString('base64')}`;
        }

        return {
            title,
            artist,
            album,
            albumArtist,
            coverUrl,
            coverDataUrl,
            year,
            lyrics,
            duration
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
            try {
                const res = await fetch(tags.coverUrl);
                const arrayBuffer = await res.arrayBuffer();
                coverBuffer = Buffer.from(arrayBuffer);
            } catch (e) {
                console.error("Failed to fetch cover image:", e);
            }
        }

        const ext = path.extname(filePath).toLowerCase();

         
        if (ext === '.flac') {
            try {
                const Metaflac = require('metaflac-js');
                const flac = new Metaflac(filePath);
                
                if (tags.title !== undefined) {
                    flac.removeTag('TITLE');
                    if (tags.title) flac.setTag('TITLE=' + tags.title);
                }
                if (tags.artist !== undefined) {
                    flac.removeTag('ARTIST');
                    if (tags.artist) flac.setTag('ARTIST=' + tags.artist);
                }
                if (tags.album !== undefined) {
                    flac.removeTag('ALBUM');
                    if (tags.album) flac.setTag('ALBUM=' + tags.album);
                }
                if (tags.albumArtist !== undefined) {
                    flac.removeTag('ALBUMARTIST');
                    flac.removeTag('ALBUM ARTIST');
                    if (tags.albumArtist) {
                        flac.setTag('ALBUMARTIST=' + tags.albumArtist);
                        flac.setTag('ALBUM ARTIST=' + tags.albumArtist);
                    }
                }
                if (tags.year !== undefined) {
                    flac.removeTag('DATE');
                    flac.removeTag('YEAR');
                    if (tags.year) {
                        flac.setTag('DATE=' + tags.year);
                        flac.setTag('YEAR=' + tags.year);
                    }
                }
                if (tags.lyrics !== undefined) {
                    flac.removeTag('UNSYNCEDLYRICS');
                    flac.removeTag('LYRICS');
                    if (tags.lyrics !== null && tags.lyrics !== '') {
                        flac.setTag('UNSYNCEDLYRICS=' + tags.lyrics);
                        flac.setTag('LYRICS=' + tags.lyrics);
                    }
                }

                if (coverBuffer) {
                    try {
                        flac.removePictures();
                        flac.importPictureFromBuffer(coverBuffer);
                    } catch (picErr) {
                        console.error("Could not import picture to FLAC:", picErr);
                    }
                }

                flac.save();
                return { success: true };
            } catch (flacErr) {
                console.error("FLAC write error:", flacErr);
                return { success: false, error: flacErr.message };
            }
        }

         
        const id3Tags = {};
        if (tags.title) id3Tags.title = tags.title;
        if (tags.artist) id3Tags.artist = tags.artist;
        if (tags.album) id3Tags.album = tags.album;
        if (tags.albumArtist) id3Tags.performerInfo = tags.albumArtist;
        if (tags.year) id3Tags.year = tags.year;
        if (tags.lyrics !== undefined) {
            id3Tags.unsynchronisedLyrics = {
                language: 'eng',
                text: tags.lyrics
            };
        }

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

ipcMain.handle('select-folder', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (result.canceled) {
        return null;
    } else {
        return result.filePaths[0];
    }
});

ipcMain.handle('spotiflac-search', async (e, { query }) => {
    try {
        const { searchTracks } = require('./downloader');
        return await searchTracks(query);
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('open-external', async (e, url) => {
    try {
        const { shell } = require('electron');
        if (url) {
            await shell.openExternal(url);
        }
    } catch (err) {
        console.error("Failed to open external URL:", err);
    }
});

ipcMain.handle('spotiflac-download', async (e, { urlOrQuery, customPath }) => {
    try {
        const downloadsPath = customPath || path.join(userDataPath, 'Downloads');
        const res = await downloadTrack(urlOrQuery, e.sender, downloadsPath);
        if (res && res.success) {
            res.folder = downloadsPath;
        }
        return res;
    } catch (err) {
        return { success: false, error: err.message };
    }
});

    app.on('before-quit', () => { app.isQuitting = true; });
    app.whenReady().then(() => {
        createTray();
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
