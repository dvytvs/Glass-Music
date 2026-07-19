const fs = require('fs');
const path = require('path');
const https = require('https');
const yts = require('yt-search');
const { spawn } = require('child_process');
let ytdlPath = require('youtube-dl-exec/src/constants').YOUTUBE_DL_PATH;
if (ytdlPath.includes('app.asar')) {
    ytdlPath = ytdlPath.replace('app.asar', 'app.asar.unpacked');
}
const scdl = require('soundcloud-downloader').default;
const ffmpeg = require('fluent-ffmpeg');
const Metaflac = require('metaflac-js');

function executeYtDlp(url, flags) {
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
        
        const child = spawn(ytdlPath, args);
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

function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function getSpotifyMetadata(url) {
    try {
        const html = await fetchHtml(url);
        
        let title = "Unknown Track";
        let artist = "Unknown Artist";
        let coverUrl = null;
        let album = "Unknown Album";
        let year = new Date().getFullYear().toString();

        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/property="og:title"\s*content="([^"]+)"/i);
        if (titleMatch) title = titleMatch[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i) || html.match(/property="og:description"\s*content="([^"]+)"/i);
        if (descMatch) {
            const desc = descMatch[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
            const parts = desc.split('·').map(p => p.trim());
            if (parts.length > 0) artist = parts[0];
            if (parts.length > 2 && parts[2] === 'Song') {
                album = parts[1];
                if (parts[3]) year = parts[3];
            } else if (parts.length > 1) {
                album = parts[1];
            }
        }

        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i) || html.match(/property="og:image"\s*content="([^"]+)"/i);
        if (imageMatch) coverUrl = imageMatch[1];

        return { title, artist, album, year, coverUrl };
    } catch (err) {
        console.error("Error fetching Spotify metadata:", err);
        throw new Error("Could not parse Spotify metadata");
    }
}


function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

async function downloadTrack(queryOrUrl, sender, downloadPath) {
    try {
        sender.send('spotiflac-progress', { status: 'resolving', message: 'Resolving track info...' });
        
        let title = '';
        let artist = '';
        let coverUrl = null;
        let album = 'Unknown Album';
        let searchQuery = queryOrUrl;

        // Extract metadata based on URL type
        if (queryOrUrl.includes('spotify.com/track/')) {
            const meta = await getSpotifyMetadata(queryOrUrl);
            title = meta.title;
            artist = meta.artist;
            coverUrl = meta.coverUrl;
            album = meta.album || 'Unknown Album';
            searchQuery = `${artist} - ${title}`;
            sender.send('spotiflac-metadata', meta);
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
        }

        const fallbackName = queryOrUrl.replace(/https?:\/\//g, '').replace(/[\/\?<>\\:\*\|":]/g, '_');
        const finalName = title ? `${artist ? artist + ' - ' : ''}${title}`.replace(/[\/\?<>\\:\*\|":]/g, '') : fallbackName;
        
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }
        
        const outputFilePath = path.join(downloadPath, `${finalName}.flac`);
        let downloadSuccess = false;
        
        // 1. Try YouTube First with Android Client bypass
        sender.send('spotiflac-progress', { status: 'searching', message: `Searching YouTube for: ${searchQuery}` });
        try {
            const searchResult = await yts(searchQuery);
            if (searchResult && searchResult.videos && searchResult.videos.length > 0) {
                const video = searchResult.videos[0];
                if (!title) title = video.title;
                if (!coverUrl) coverUrl = video.thumbnail;
                
                sender.send('spotiflac-metadata', { title, artist: artist || video.author.name, coverUrl });
                sender.send('spotiflac-progress', { status: 'downloading', message: 'Starting YouTube download (bypassing bot block)...', progress: 50 });
                
                const ytdlOutputTemplate = path.join(downloadPath, `${finalName}.%(ext)s`);
                await executeYtDlp(video.url, {
                    extractAudio: true,
                    audioFormat: 'flac',
                    output: ytdlOutputTemplate,
                    extractorArgs: 'youtube:player_client=android' // Critical fix for 429 Error
                });
                downloadSuccess = true;
            }
        } catch (ytErr) {
            console.error("YouTube Download Failed, falling back to SoundCloud...", ytErr);
        }
        
        // 2. Fallback to SoundCloud (Snippets bypassed)
        if (!downloadSuccess) {
            sender.send('spotiflac-progress', { status: 'searching', message: `YouTube failed. Searching SoundCloud for: ${searchQuery}` });
            const searchResult = await scdl.search({ query: searchQuery, resourceType: 'tracks', limit: 10 });
            
            if (!searchResult || searchResult.collection.length === 0) {
                throw new Error("No results found on YouTube or SoundCloud.");
            }
            
            let track = searchResult.collection.find(t => t.policy !== 'SNIP' && t.full_duration > 60000);
            if (!track) track = searchResult.collection[0];
            
            if (!title) title = track.title;
            if (!coverUrl) coverUrl = track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : null;
            
            sender.send('spotiflac-metadata', { title, artist: artist || track.user.username, coverUrl });
            sender.send('spotiflac-progress', { status: 'downloading', message: 'Downloading full track from SoundCloud...', progress: 50 });
            
            const ytdlOutputTemplate = path.join(downloadPath, `${finalName}.%(ext)s`);
            await executeYtDlp(track.permalink_url, {
                extractAudio: true,
                audioFormat: 'flac',
                output: ytdlOutputTemplate
            });
            downloadSuccess = true;
        }

        sender.send('spotiflac-progress', { status: 'processing', message: 'Applying FLAC metadata tags...' });

        // Apply FLAC tags
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
        const finalAlbum = album;

        const flac = new Metaflac(outputFilePath);
        flac.setTag('TITLE=' + title);
        flac.setTag('ARTIST=' + finalArtist);
        flac.setTag('ALBUM=' + finalAlbum);
        
        if (coverBuffer) {
            try {
                flac.importPictureFromBuffer(coverBuffer);
            } catch (e) {
                console.error("Could not import picture to FLAC", e);
            }
        }
        flac.save();

        sender.send('spotiflac-progress', { status: 'done', message: 'FLAC Download complete!', filePath: outputFilePath });
        return { success: true, filePath: outputFilePath };
    } catch (err) {
        console.error("Downloader error:", err);
        sender.send('spotiflac-progress', { status: 'error', message: err.message });
        throw err;
    }
}


async function searchTracks(query) {
    try {
        const yts = require('yt-search');
        const scdl = require('soundcloud-downloader').default;
        
        let ytResults = [];
        let scResults = [];

        try {
            const yt = await yts(query);
            if (yt && yt.videos) {
                ytResults = yt.videos.slice(0, 5).map(v => ({
                    id: v.videoId,
                    title: v.title,
                    artist: v.author.name,
                    coverUrl: v.thumbnail,
                    duration: v.timestamp,
                    source: 'youtube',
                    url: v.url
                }));
            }
        } catch(e) { console.error("YT Search Error:", e); }

        try {
            const sc = await scdl.search({ query, resourceType: 'tracks', limit: 5 });
            if (sc && sc.collection) {
                scResults = sc.collection.filter(t => t.policy !== 'SNIP').map(t => {
                    const dur = t.full_duration ? Math.floor(t.full_duration / 1000) : 0;
                    const mins = Math.floor(dur / 60);
                    const secs = dur % 60;
                    return {
                        id: t.id.toString(),
                        title: t.title,
                        artist: t.user.username,
                        coverUrl: t.artwork_url ? t.artwork_url.replace('-large', '-t500x500') : null,
                        duration: `${mins}:${secs.toString().padStart(2, '0')}`,
                        source: 'soundcloud',
                        url: t.permalink_url
                    };
                });
            }
        } catch(e) { console.error("SC Search Error:", e); }

        // Interleave results
        const combined = [];
        const maxLen = Math.max(ytResults.length, scResults.length);
        for(let i=0; i<maxLen; i++) {
            if(ytResults[i]) combined.push(ytResults[i]);
            if(scResults[i]) combined.push(scResults[i]);
        }

        return { success: true, results: combined };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = { downloadTrack, searchTracks };

