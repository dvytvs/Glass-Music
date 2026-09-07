const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const yts = require('yt-search');
const { spawn, execSync } = require('child_process');
const scdl = require('soundcloud-downloader').default;
const Metaflac = require('metaflac-js');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

 
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

 
function getYtDlpPath() {
    try {
        let pkgPath = require('youtube-dl-exec/src/constants').YOUTUBE_DL_PATH;
        if (pkgPath && pkgPath.includes('app.asar')) {
            pkgPath = pkgPath.replace('app.asar', 'app.asar.unpacked');
        }
        if (pkgPath && fs.existsSync(pkgPath)) {
            return pkgPath;
        }
    } catch (_) {}

     
    const candidates = [
        '/usr/bin/yt-dlp',
        '/usr/local/bin/yt-dlp',
        path.join(os.homedir(), '.local', 'bin', 'yt-dlp'),
        path.join(process.resourcesPath || '', 'bin', 'yt-dlp'),
        path.join(process.resourcesPath || '', 'yt-dlp'),
        path.join(__dirname, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }

    try {
        const which = execSync(process.platform === 'win32' ? 'where yt-dlp' : 'which yt-dlp', { encoding: 'utf8' }).trim();
        if (which && fs.existsSync(which)) return which;
    } catch (_) {}

    return null;
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchJson(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(null);
                }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchHtml(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function convertStreamToFlac(inputStream, outputFilePath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputStream)
            .toFormat('flac')
            .audioCodec('flac')
            .audioChannels(2)
            .audioFrequency(44100)
            .outputOptions(['-compression_level 5'])
            .save(outputFilePath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
    });
}

function executeYtDlp(url, flags) {
    const binPath = getYtDlpPath();
    if (!binPath) {
        return Promise.reject(new Error('yt-dlp binary is not available on this system'));
    }

    return new Promise((resolve, reject) => {
        const args = [url];
        for (const [key, value] of Object.entries(flags)) {
            const flagName = '--' + key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
            if (value === true) {
                args.push(flagName);
            } else if (value !== false && value !== undefined) {
                args.push(flagName, String(value));
            }
        }
        
        const child = spawn(binPath, args);
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', chunk => stdout += chunk);
        child.stderr.on('data', chunk => stderr += chunk);
        
        child.on('close', code => {
            if (code === 0) {
                try {
                    resolve(flags.dumpJson ? JSON.parse(stdout) : stdout);
                } catch (e) {
                    resolve(stdout);
                }
            } else {
                const err = new Error(`yt-dlp exited with code ${code}\n${stderr}`);
                err.code = code;
                err.stderr = stderr;
                reject(err);
            }
        });
        child.on('error', err => reject(err));
    });
}

async function getSpotifyMetadata(url) {
    let title = "Unknown Track";
    let artist = "Unknown Artist";
    let coverUrl = null;
    let album = "Unknown Album";
    let year = new Date().getFullYear().toString();

     
    try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
        const oembed = await fetchJson(oembedUrl);
        if (oembed) {
            if (oembed.title) title = oembed.title;
            if (oembed.author_name) artist = oembed.author_name;
            if (oembed.thumbnail_url) coverUrl = oembed.thumbnail_url;
        }
    } catch (e) {
        console.warn("Spotify oEmbed error:", e);
    }

     
    try {
        const html = await fetchHtml(url);
        if (title === "Unknown Track" || !coverUrl) {
            const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/property="og:title"\s*content="([^"]+)"/i);
            if (titleMatch) title = titleMatch[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

            const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i) || html.match(/property="og:description"\s*content="([^"]+)"/i);
            if (descMatch) {
                const desc = descMatch[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
                const parts = desc.split('·').map(p => p.trim());
                if (parts.length > 0 && artist === "Unknown Artist") artist = parts[0];
                if (parts.length > 2 && parts[2] === 'Song') {
                    album = parts[1];
                    if (parts[3]) year = parts[3];
                } else if (parts.length > 1) {
                    album = parts[1];
                }
            }

            const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i) || html.match(/property="og:image"\s*content="([^"]+)"/i);
            if (imageMatch && !coverUrl) coverUrl = imageMatch[1];
        }
    } catch (err) {
        console.warn("Spotify HTML parse error:", err);
    }

     
    if (title && title !== "Unknown Track") {
        try {
            const cleanQuery = `${title} ${artist !== "Unknown Artist" ? artist : ''}`.trim();
            const deezerRes = await fetchJson(`https://api.deezer.com/search?q=${encodeURIComponent(cleanQuery)}&limit=1`);
            if (deezerRes && deezerRes.data && deezerRes.data.length > 0) {
                const item = deezerRes.data[0];
                if (item.album) {
                    if (album === "Unknown Album") album = item.album.title || album;
                    if (!coverUrl || coverUrl.includes('spotifycdn.com')) {
                        coverUrl = item.album.cover_xl || item.album.cover_big || coverUrl;
                    }
                }
            }
        } catch (e) {
             
        }
    }

    return { title, artist, album, year, coverUrl };
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

async function downloadTrack(queryOrUrl, sender, downloadPath) {
    try {
        sender.send('spotiflac-progress', { status: 'resolving', message: 'Resolving track metadata...' });
        
        let title = '';
        let artist = '';
        let coverUrl = null;
        let album = 'Unknown Album';
        let searchQuery = queryOrUrl;

         
        if (queryOrUrl.includes('spotify.com/')) {
            const meta = await getSpotifyMetadata(queryOrUrl);
            title = meta.title;
            artist = meta.artist;
            coverUrl = meta.coverUrl;
            album = meta.album || 'Unknown Album';
            searchQuery = `${artist} - ${title}`;
            sender.send('spotiflac-metadata', meta);
        } else if (queryOrUrl.includes('deezer.com/')) {
            const trackIdMatch = queryOrUrl.match(/track\/(\d+)/);
            if (trackIdMatch) {
                try {
                    const dData = await fetchJson(`https://api.deezer.com/track/${trackIdMatch[1]}`);
                    if (dData && dData.title) {
                        title = dData.title;
                        artist = dData.artist ? dData.artist.name : '';
                        album = dData.album ? dData.album.title : '';
                        coverUrl = dData.album ? (dData.album.cover_xl || dData.album.cover_big) : null;
                        searchQuery = `${artist} - ${title}`;
                        sender.send('spotiflac-metadata', { title, artist, album, coverUrl });
                    }
                } catch (e) {}
            }
        } else if (queryOrUrl.includes('youtube.com/') || queryOrUrl.includes('youtu.be/')) {
            const ytId = extractYouTubeId(queryOrUrl);
            if (ytId) {
                try {
                    const ytMeta = await yts({ videoId: ytId });
                    if (ytMeta) {
                        title = ytMeta.title;
                        artist = ytMeta.author ? ytMeta.author.name : '';
                        coverUrl = ytMeta.thumbnail;
                        searchQuery = `${artist} - ${title}`;
                        sender.send('spotiflac-metadata', { title, artist, coverUrl });
                    }
                } catch(e) { console.error("YT Video ID Search Error", e); }
            }
        } else {
             
            try {
                const itunes = await fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(queryOrUrl)}&entity=song&limit=1`);
                if (itunes && itunes.results && itunes.results.length > 0) {
                    const r = itunes.results[0];
                    title = r.trackName || title;
                    artist = r.artistName || artist;
                    album = r.collectionName || album;
                    coverUrl = r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '600x600bb') : coverUrl;
                    sender.send('spotiflac-metadata', { title, artist, album, coverUrl });
                }
            } catch (e) {}
        }

        const cleanPart = (str) => (str || '').replace(/[\/\?<>\\:\*\|":]/g, '').trim();
        const fallbackName = queryOrUrl.replace(/https?:\/\//g, '').replace(/[\/\?<>\\:\*\|":]/g, '_').slice(0, 50);
        const finalName = title ? `${cleanPart(artist) ? cleanPart(artist) + ' - ' : ''}${cleanPart(title)}` : fallbackName;
        
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }
        
        const outputFilePath = path.join(downloadPath, `${finalName}.flac`);
        let downloadSuccess = false;
        
         
        sender.send('spotiflac-progress', { status: 'searching', message: `Searching YouTube for: ${searchQuery}` });
        try {
            const searchResult = await yts(searchQuery);
            if (searchResult && searchResult.videos && searchResult.videos.length > 0) {
                 
                 
                const fullVideos = searchResult.videos.filter(v => (v.seconds >= 50 && v.seconds <= 900));
                
                 
                const scored = (fullVideos.length > 0 ? fullVideos : searchResult.videos).map(v => {
                    let score = 0;
                    const vTitle = (v.title || '').toLowerCase();
                    const vAuthor = (v.author?.name || '').toLowerCase();
                    const tLower = (title || '').toLowerCase();
                    const aLower = (artist || '').toLowerCase();
                    
                    if (tLower && vTitle.includes(tLower)) score += 10;
                    if (aLower && (vTitle.includes(aLower) || vAuthor.includes(aLower))) score += 10;
                    if (vAuthor.includes('topic') || vTitle.includes('official audio') || vTitle.includes('audio')) score += 5;
                    if (vTitle.includes('remix') && !tLower.includes('remix')) score -= 15;
                    if (vTitle.includes('cover') && !tLower.includes('cover')) score -= 15;
                    if (vTitle.includes('slowed') && !tLower.includes('slowed')) score -= 15;
                    if (vTitle.includes('sped up') && !tLower.includes('sped up')) score -= 15;
                    if (vTitle.includes('tik tok') || vTitle.includes('tiktok') || vTitle.includes('shorts')) score -= 20;
                    if (v.seconds < 45) score -= 50;  
                    return { video: v, score };
                });

                scored.sort((a, b) => b.score - a.score);
                const video = scored.length > 0 ? scored[0].video : searchResult.videos[0];
                
                if (!title) title = video.title;
                if (!coverUrl) coverUrl = video.thumbnail;
                
                sender.send('spotiflac-metadata', { title, artist: artist || video.author.name, coverUrl });
                sender.send('spotiflac-progress', { status: 'downloading', message: 'Downloading audio stream in FLAC...', progress: 40 });
                
                const ytdlOutputTemplate = path.join(downloadPath, `${finalName}.%(ext)s`);
                
                 
                if (getYtDlpPath()) {
                    const clientOptions = [
                        'youtube:player_client=android',
                        'youtube:player_client=web',
                        'youtube:player_client=ios'
                    ];

                    for (const clientArg of clientOptions) {
                        try {
                            await executeYtDlp(video.url, {
                                extractAudio: true,
                                audioFormat: 'flac',
                                audioQuality: '0',
                                output: ytdlOutputTemplate,
                                extractorArgs: clientArg
                            });
                            downloadSuccess = true;
                            break;
                        } catch (err) {
                            console.warn("yt-dlp client attempt failed:", err.message);
                        }
                    }
                }

                 
                if (!downloadSuccess) {
                    try {
                        const play = require('play-dl');
                        const stream = await play.stream(video.url);
                        if (stream && stream.stream) {
                            sender.send('spotiflac-progress', { status: 'downloading', message: 'Encoding YouTube stream to FLAC...', progress: 60 });
                            await convertStreamToFlac(stream.stream, outputFilePath);
                            downloadSuccess = true;
                        }
                    } catch (playErr) {
                        console.warn("play-dl stream fallback failed:", playErr.message);
                    }
                }
            }
        } catch (ytErr) {
            console.error("YouTube Download Failed, falling back to SoundCloud...", ytErr);
        }
        
         
        if (!downloadSuccess) {
            sender.send('spotiflac-progress', { status: 'searching', message: `YouTube unavailable. Searching SoundCloud for: ${searchQuery}` });
            const searchResult = await scdl.search({ query: searchQuery, resourceType: 'tracks', limit: 15 });
            
            if (!searchResult || !searchResult.collection || searchResult.collection.length === 0) {
                throw new Error("No available audio streams found on YouTube or SoundCloud.");
            }
            
             
            const validTracks = searchResult.collection.filter(t => {
                const dur = t.full_duration || t.duration || 0;
                return t.policy !== 'SNIP' && t.policy !== 'BLOCK' && dur >= 50000;
            });

             
            const scoredSC = (validTracks.length > 0 ? validTracks : searchResult.collection).map(t => {
                let score = 0;
                const scTitle = (t.title || '').toLowerCase();
                const scUser = (t.user?.username || '').toLowerCase();
                const tLower = (title || '').toLowerCase();
                const aLower = (artist || '').toLowerCase();
                if (tLower && scTitle.includes(tLower)) score += 10;
                if (aLower && (scTitle.includes(aLower) || scUser.includes(aLower))) score += 10;
                if (scTitle.includes('preview') || scTitle.includes('teaser') || scTitle.includes('snippet')) score -= 30;
                if (scTitle.includes('remix') && !tLower.includes('remix')) score -= 15;
                if ((t.duration || 0) < 45000) score -= 50;
                return { track: t, score };
            });

            scoredSC.sort((a, b) => b.score - a.score);
            let track = scoredSC.length > 0 ? scoredSC[0].track : searchResult.collection[0];
            
            if (!title) title = track.title;
            if (!coverUrl) coverUrl = track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : null;
            
            sender.send('spotiflac-metadata', { title, artist: artist || track.user.username, coverUrl });
            sender.send('spotiflac-progress', { status: 'downloading', message: 'Streaming lossless audio from SoundCloud...', progress: 50 });
            
             
            try {
                const scStream = await scdl.download(track.permalink_url);
                await convertStreamToFlac(scStream, outputFilePath);
                downloadSuccess = true;
            } catch (scStreamErr) {
                console.warn("Direct SCDL stream error, trying fallback:", scStreamErr);
                 
                if (getYtDlpPath()) {
                    const ytdlOutputTemplate = path.join(downloadPath, `${finalName}.%(ext)s`);
                    await executeYtDlp(track.permalink_url, {
                        extractAudio: true,
                        audioFormat: 'flac',
                        audioQuality: '0',
                        output: ytdlOutputTemplate
                    });
                    downloadSuccess = true;
                } else {
                    throw scStreamErr;
                }
            }
        }

        sender.send('spotiflac-progress', { status: 'processing', message: 'Writing high-quality FLAC Vorbis tags and embedding cover art...' });

         
        let coverBuffer = null;
        if (coverUrl) {
            try {
                const doFetch = typeof global.fetch === 'function' ? global.fetch : (await import('node-fetch')).default;
                const res = await doFetch(coverUrl);
                const arrayBuffer = await res.arrayBuffer();
                coverBuffer = Buffer.from(arrayBuffer);
            } catch (e) {
                console.error("Failed to fetch cover for FLAC:", e);
            }
        }

        const finalArtist = artist || "Unknown Artist";
        const finalAlbum = album || "Single";

        try {
            if (fs.existsSync(outputFilePath)) {
                const flac = new Metaflac(outputFilePath);
                flac.setTag('TITLE=' + (title || 'Unknown Title'));
                flac.setTag('ARTIST=' + finalArtist);
                flac.setTag('ALBUM=' + finalAlbum);
                flac.setTag('ALBUMARTIST=' + finalArtist);
                flac.setTag('DATE=' + new Date().getFullYear().toString());
                
                if (coverBuffer) {
                    try {
                        flac.importPictureFromBuffer(coverBuffer);
                    } catch (e) {
                        console.error("Could not import picture to FLAC", e);
                    }
                }
                flac.save();
            }
        } catch (tagErr) {
            console.warn("FLAC tagging warning:", tagErr);
        }

        sender.send('spotiflac-progress', { status: 'done', message: 'FLAC Download complete!', filePath: outputFilePath, progress: 100 });
        return { success: true, filePath: outputFilePath };
    } catch (err) {
        console.error("Downloader error:", err);
        sender.send('spotiflac-progress', { status: 'error', message: err.message });
        throw err;
    }
}

async function searchTracks(query) {
    try {
        const results = [];
        const seen = new Set();

         
        try {
            const deezer = await fetchJson(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`);
            if (deezer && Array.isArray(deezer.data)) {
                for (const t of deezer.data) {
                    const key = `${(t.title || '').toLowerCase()}-${(t.artist?.name || '').toLowerCase()}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        const mins = Math.floor((t.duration || 0) / 60);
                        const secs = (t.duration || 0) % 60;
                        results.push({
                            id: `deezer-${t.id}`,
                            title: t.title,
                            artist: t.artist?.name || 'Unknown',
                            album: t.album?.title || '',
                            coverUrl: t.album?.cover_xl || t.album?.cover_big || t.album?.cover_medium,
                            duration: `${mins}:${secs.toString().padStart(2, '0')}`,
                            source: 'spotify',
                            url: t.link || `https://www.deezer.com/track/${t.id}`
                        });
                    }
                }
            }
        } catch (e) {
            console.warn("Deezer search error:", e);
        }

         
        try {
            const itunes = await fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=10`);
            if (itunes && Array.isArray(itunes.results)) {
                for (const t of itunes.results) {
                    const key = `${(t.trackName || '').toLowerCase()}-${(t.artistName || '').toLowerCase()}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        const durSec = Math.floor((t.trackTimeMillis || 0) / 1000);
                        const mins = Math.floor(durSec / 60);
                        const secs = durSec % 60;
                        results.push({
                            id: `itunes-${t.trackId}`,
                            title: t.trackName,
                            artist: t.artistName || 'Unknown',
                            album: t.collectionName || '',
                            coverUrl: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '600x600bb') : null,
                            duration: `${mins}:${secs.toString().padStart(2, '0')}`,
                            source: 'spotify',
                            url: t.trackViewUrl || query
                        });
                    }
                }
            }
        } catch (e) {
            console.warn("iTunes search error:", e);
        }

         
        try {
            const yt = await yts(query);
            if (yt && yt.videos) {
                for (const v of yt.videos.slice(0, 5)) {
                    results.push({
                        id: `yt-${v.videoId}`,
                        title: v.title,
                        artist: v.author.name,
                        album: 'YouTube',
                        coverUrl: v.thumbnail,
                        duration: v.timestamp,
                        source: 'youtube',
                        url: v.url
                    });
                }
            }
        } catch (e) {
            console.warn("YT search error:", e);
        }

        return { success: true, results };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = { downloadTrack, searchTracks, getSpotifyMetadata };


