const { app, BrowserWindow, ipcMain, nativeTheme, Tray, Menu, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const NodeID3 = require('node-id3');
const { downloadTrack } = require('./downloader.js');

 
 
const os = require('os');

 
const YT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SC_CLIENT_IDS = [
    'OGA0P5R5U4CpyooNe9OUcnjIMxao2hB2',
    'a3e059563d7fd3372b49b37f00a00bcf',
    '2t9loNfh0ekAzfqxmBycnUtDbFCNuR62',
    'iZIs9mchVcX5lhVR1hnOIYY8tZi1v65O'
];

const streamCacheDir = path.join(os.tmpdir(), 'glass_stream_cache');
try {
    if (!fs.existsSync(streamCacheDir)) fs.mkdirSync(streamCacheDir, { recursive: true });
} catch (e) {}

const ytInfoCache = new Map();
const ytFailCache = new Map();
const sponsorBlockCache = new Map();

function extractYouTubeId(value) {
    if (!value) return '';
    const str = String(value).replace(/^yt_/, '').trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:v=|\/vi\/|youtu\.be\/|\/watch\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : '';
}

function pickAudioFormat(info) {
    const formats = (info && info.formats) || [];
    const audioOnly = formats.filter(f => {
        if (!f || !f.url) return false;
        const hasAudio = f.hasAudio || (f.mimeType && f.mimeType.startsWith('audio/'));
        const hasVideo = f.hasVideo || (f.mimeType && f.mimeType.startsWith('video/'));
        return hasAudio && !hasVideo;
    });
    if (!audioOnly.length) return null;

    const score = (f) => {
        let s = f.audioBitrate || 0;
        const mime = f.mimeType || '';
        if (/opus/i.test(mime)) s += 60;
        if (/mp4a/i.test(mime)) s += 30;
        if (f.itag === 251 || f.itag === 140) s += 40;
        return s;
    };

    audioOnly.sort((a, b) => score(b) - score(a));
    return audioOnly[0];
}

function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label || 'operation'} timeout after ${ms}ms`)), ms);
        Promise.resolve(promise).then(
            value => { clearTimeout(timer); resolve(value); },
            error => { clearTimeout(timer); reject(error); }
        );
    });
}

async function getYouTubeInfo(videoId) {
    const cached = ytInfoCache.get(videoId);
    if (cached && cached.expiresAt > Date.now() && cached.info) return cached.info;

    const ytdl = require('@distube/ytdl-core');
    const info = await withTimeout(ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, {
        requestOptions: {
            headers: {
                'user-agent': YT_USER_AGENT,
                'accept-language': 'en-US,en;q=0.9'
            }
        }
    }), 12000, 'ytdl.getInfo');

    ytInfoCache.set(videoId, { info, expiresAt: Date.now() + 1000 * 60 * 60 * 3 });
    if (ytInfoCache.size > 40) {
        const oldest = ytInfoCache.keys().next().value;
        if (oldest) ytInfoCache.delete(oldest);
    }
    return info;
}

function parseByteRange(rangeHeader, total) {
    if (!rangeHeader || !total) return null;
    const m = /bytes=(\d*)-(\d*)/.exec(String(rangeHeader));
    if (!m) return null;
    let start = m[1] ? parseInt(m[1], 10) : NaN;
    let end = m[2] ? parseInt(m[2], 10) : NaN;

    if (Number.isNaN(start)) {
        if (Number.isNaN(end)) return null;
        start = Math.max(0, total - end);
        end = total - 1;
    } else if (Number.isNaN(end) || end >= total) {
        end = total - 1;
    }

    if (start > end || start >= total || start < 0) return null;
    return { start, end };
}

function isYouTubeIdFailed(id) {
    const until = ytFailCache.get(id);
    if (!until) return false;
    if (until < Date.now()) {
        ytFailCache.delete(id);
        return false;
    }
    return true;
}

function markYouTubeIdFailed(id) {
    if (!id) return;
    ytFailCache.set(id, Date.now() + 1000 * 60 * 10);
}

async function streamYouTubeAudio(req, res, videoId) {
    const ytdl = require('@distube/ytdl-core');
    const info = await getYouTubeInfo(videoId);
    const format = pickAudioFormat(info);
    if (!format) throw new Error('No audio-only format available');

    const total = Number(format.contentLength) || 0;
    const range = req.headers.range ? parseByteRange(req.headers.range, total) : null;
    const start = range ? range.start : 0;
    const end = range ? range.end : undefined;

    const downloadOptions = { format };
    if (range) downloadOptions.range = { start, end };

    const stream = ytdl.downloadFromInfo(info, downloadOptions);
    const contentType = String(format.mimeType || 'audio/webm').split(';')[0];

    const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Accept-Ranges': total ? 'bytes' : 'none',
        'Cache-Control': 'no-store'
    };

    if (total > 0) {
        headers['Content-Length'] = String(range ? (end - start + 1) : total);
        if (range) headers['Content-Range'] = `bytes ${start}-${end}/${total}`;
    }

    if (req.method === 'HEAD') {
        res.writeHead(200, headers);
        res.end();
        try { stream.destroy(); } catch (e) {}
        return;
    }

    res.writeHead(range ? 206 : 200, headers);

    const cleanup = () => {
        try { stream.destroy(); } catch (e) {}
    };

    req.on('close', cleanup);
    stream.on('error', (err) => {
        console.error('[Stream] YouTube stream error:', err && err.message);
        cleanup();
        try { res.end(); } catch (e) {}
    });
    stream.pipe(res);
}

let cachedScClientId = '';
let cachedScClientIdExpires = 0;

async function discoverSoundCloudClientId() {
    if (cachedScClientIdExpires > Date.now()) return cachedScClientId;

    const failCache = () => {
        cachedScClientId = '';
        cachedScClientIdExpires = Date.now() + 1000 * 60 * 5;
        return '';
    };

    try {
        const home = await fetch('https://soundcloud.com/', {
            headers: { 'user-agent': YT_USER_AGENT },
            signal: AbortSignal.timeout(4000)
        });
        if (!home.ok) return failCache();
        const html = await home.text();
        const assetUrls = Array.from(html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g))
            .map(match => match[1])
            .slice(-8);

        for (const assetUrl of assetUrls) {
            try {
                const assetRes = await fetch(assetUrl, {
                    headers: { 'user-agent': YT_USER_AGENT },
                    signal: AbortSignal.timeout(4000)
                });
                if (!assetRes.ok) continue;
                const code = await assetRes.text();
                const match = code.match(/client_id\s*:\s*"([a-zA-Z0-9]{32})"/) || code.match(/client_id=([a-zA-Z0-9]{32})/);
                if (match && match[1]) {
                    cachedScClientId = match[1];
                    cachedScClientIdExpires = Date.now() + 1000 * 60 * 60 * 6;
                    console.log('[SoundCloud] Discovered fresh client_id');
                    return cachedScClientId;
                }
            } catch (e) {}
        }
    } catch (e) {}

    return failCache();
}

let scDiscoveryStarted = false;

async function getSoundCloudClientIds() {
    if (!scDiscoveryStarted) {
        scDiscoveryStarted = true;
        discoverSoundCloudClientId().catch(() => {});
    }
    const ids = cachedScClientId ? [cachedScClientId, ...SC_CLIENT_IDS] : [...SC_CLIENT_IDS];
    return Array.from(new Set(ids));
}

async function resolveSoundCloudStreamUrl(trackId) {
    if (!trackId) return null;
    const clientIds = await getSoundCloudClientIds();
    for (const clientId of clientIds) {
        try {
            const infoRes = await fetch(`https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${clientId}`, {
                headers: { 'user-agent': YT_USER_AGENT }
            });
            if (!infoRes.ok) continue;
            const info = await infoRes.json();
            const transcodings = (info && info.media && info.media.transcodings) || [];
            if (!transcodings.length) continue;

            const audioTranscodings = transcodings.filter(t => t && t.url && t.format && /audio|mpeg|mp4|aac/i.test(String(t.format.mime_type || t.format.protocol || 'audio')));

            const scoreTranscoding = (trans) => {
                let score = 0;
                const mime = String((trans.format && trans.format.mime_type) || '');
                const preset = String(trans.preset || '');
                if (/mpeg/i.test(mime) || /^mp3/i.test(preset)) score += 100;
                else if (/aac|mp4/i.test(mime)) score += 60;
                if (trans.format && trans.format.protocol === 'progressive') score += 10;
                return score;
            };

            const ordered = audioTranscodings.slice().sort((a, b) => scoreTranscoding(b) - scoreTranscoding(a));
            if (!ordered.length) continue;
            console.log('[SoundCloud] transcodings:', ordered.map(t => `${t.preset || t.format.protocol}:${t.format.mime_type}`).join(', '));

            for (const trans of ordered) {
                if (!trans || !trans.url) continue;
                const sep = trans.url.includes('?') ? '&' : '?';
                const streamRes = await fetch(`${trans.url}${sep}client_id=${clientId}`, {
                    headers: { 'user-agent': YT_USER_AGENT }
                });
                if (!streamRes.ok) continue;
                const data = await streamRes.json().catch(() => null);
                if (data && data.url) {
                    const mime = String((trans.format && trans.format.mime_type) || '');
                    const isHls = /\.m3u8(\?|$)/i.test(data.url)
                        || /mpegurl/i.test(String(data.mime_type || ''))
                        || /mpegurl/i.test(mime);
                    const contentType = /mpeg/i.test(mime) || /^mp3/i.test(String(trans.preset || ''))
                        ? 'audio/mpeg'
                        : 'audio/mp4';
                    return { url: data.url, contentType, isHls };
                }
            }
        } catch (e) {}
    }
    return null;
}

async function proxyRemoteAudio(req, res, remoteUrl, fallbackContentType) {
    const upstreamHeaders = {};
    if (req.headers.range) upstreamHeaders.range = req.headers.range;
    upstreamHeaders['user-agent'] = YT_USER_AGENT;

    const upstream = await fetch(remoteUrl, { headers: upstreamHeaders });
    if (!upstream.ok && upstream.status !== 206) throw new Error(`Upstream responded ${upstream.status}`);

    const pass = {};
    for (const headerName of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
        const value = upstream.headers.get(headerName);
        if (value) pass[headerName] = value;
    }
    if (!pass['content-type']) pass['content-type'] = fallbackContentType || 'audio/mpeg';
    pass['access-control-allow-origin'] = '*';
    pass['access-control-allow-headers'] = '*';
    pass['cache-control'] = 'no-store';

    if (req.method === 'HEAD') {
        res.writeHead(upstream.status, pass);
        res.end();
        return;
    }

    res.writeHead(upstream.status, pass);

    const { Readable } = require('stream');
    const body = upstream.body ? Readable.fromWeb(upstream.body) : null;
    if (!body) {
        res.end();
        return;
    }
    body.on('error', () => { try { res.end(); } catch (e) {} });
    req.on('close', () => { try { body.destroy(); } catch (e) {} });
    body.pipe(res);
}

async function searchYouTubeNative(query, limit = 15) {
    if (!query) return [];
    try {
        const ytSearch = require('yt-search');
        const result = await withTimeout(ytSearch({ query, pageStart: 1, pageEnd: 1 }), 9000, 'yt-search');
        const videos = (result && result.videos) || [];
        const tracks = [];
        for (const video of videos) {
            if (!video || !video.videoId) continue;
            const seconds = Number(video.seconds) || 0;
            if (seconds < 30 || seconds > 1800) continue;
            tracks.push({
                id: `yt_${video.videoId}`,
                videoId: video.videoId,
                title: video.title || 'Unknown',
                artist: (video.author && video.author.name) || 'YouTube',
                duration: seconds,
                coverUrl: video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
                url: video.url || `https://www.youtube.com/watch?v=${video.videoId}`
            });
            if (tracks.length >= limit) break;
        }
        return tracks;
    } catch (err) {
        console.error('[Search] YouTube native search failed:', err && err.message);
        return [];
    }
}

async function searchSoundCloudNative(query, limit = 15) {
    if (!query) return [];
    const clientIds = await getSoundCloudClientIds();
    for (const clientId of clientIds) {
        try {
            const url = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=${Math.min(limit * 2, 40)}&linked_partitioning=1`;
            const res = await fetch(url, { headers: { 'user-agent': YT_USER_AGENT } });
            if (!res.ok) continue;
            const data = await res.json();
            const collection = (data && data.collection) || [];
            if (!collection.length) continue;
            const tracks = [];
            for (const item of collection) {
                if (!item || !item.id) continue;
                if (item.policy === 'BLOCK' || item.policy === 'SNIP') continue;
                const duration = Math.round((item.full_duration || item.duration || 0) / 1000);
                if (duration < 30 || duration > 1800) continue;
                tracks.push({
                    id: `sc_${item.id}`,
                    trackId: String(item.id),
                    title: item.title || 'Unknown',
                    artist: (item.user && item.user.username) || 'SoundCloud',
                    duration,
                    coverUrl: item.artwork_url || (item.user && item.user.avatar_url) || '',
                    url: item.permalink_url || ''
                });
                if (tracks.length >= limit) break;
            }
            return tracks;
        } catch (e) {}
    }
    return [];
}

async function resolveHlsMedia(playlistUrl, depth = 0) {
    if (!playlistUrl || depth > 3) return null;
    const response = await fetch(playlistUrl, { headers: { 'user-agent': YT_USER_AGENT } });
    if (!response.ok) return null;
    const text = await response.text();
    if (!text || !text.includes('#EXTM3U')) return null;

    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

    const variants = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
            const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/i);
            const next = lines[i + 1];
            if (next && !next.startsWith('#')) {
                variants.push({ bandwidth: bandwidthMatch ? Number(bandwidthMatch[1]) : 0, uri: next });
            }
        }
    }

    if (variants.length) {
        variants.sort((a, b) => b.bandwidth - a.bandwidth);
        const childUrl = new URL(variants[0].uri, playlistUrl).toString();
        return resolveHlsMedia(childUrl, depth + 1);
    }

    let initUrl = null;
    const segments = [];
    for (const line of lines) {
        if (line.startsWith('#EXT-X-MAP:')) {
            const mapMatch = line.match(/URI="([^"]+)"/);
            if (mapMatch) initUrl = new URL(mapMatch[1], playlistUrl).toString();
            continue;
        }
        if (line.startsWith('#')) continue;
        segments.push(new URL(line, playlistUrl).toString());
    }

    if (!segments.length) return null;
    return { initUrl, segments };
}

function serveCachedAudioFile(req, res, filePath, contentType) {
    try {
        const total = fs.statSync(filePath).size;
        const range = parseByteRange(req.headers.range, total);
        const start = range ? range.start : 0;
        const end = range ? range.end : total - 1;
        const headers = {
            'Content-Type': contentType || 'audio/mpeg',
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Cache-Control': 'no-store'
        };
        if (range) headers['Content-Range'] = `bytes ${start}-${end}/${total}`;
        res.writeHead(range ? 206 : 200, headers);
        const stream = fs.createReadStream(filePath, { start, end });
        stream.on('error', () => { try { res.end(); } catch (e) {} });
        req.on('close', () => { try { stream.destroy(); } catch (e) {} });
        stream.pipe(res);
        return true;
    } catch (e) {
        return false;
    }
}

async function writeHlsMp3Cache(media, cacheFile) {
    const tmpOut = `${cacheFile}.${Date.now()}.tmp`;
    const out = fs.createWriteStream(tmpOut);
    const upstreamHeaders = { 'user-agent': YT_USER_AGENT };
    try {
        for (const segmentUrl of media.segments) {
            const response = await fetch(segmentUrl, { headers: upstreamHeaders });
            if (!response.ok) continue;
            const buffer = Buffer.from(await response.arrayBuffer());
            if (!out.write(buffer)) {
                await new Promise(resolve => out.once('drain', resolve));
            }
        }
        await new Promise(resolve => out.end(resolve));
        if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 20480) {
            fs.renameSync(tmpOut, cacheFile);
            return true;
        }
    } catch (e) {
        console.warn('[Stream] HLS mp3 cache error:', e && e.message);
    }
    try { out.destroy(); } catch (e) {}
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
    return false;
}

async function remuxHlsToAacCache(media, cacheFile) {
    const { spawn } = require('child_process');
    const ffmpegBin = getFfmpegBinary();
    const tmpOut = `${cacheFile}.${Date.now()}.tmp`;
    const upstreamHeaders = { 'user-agent': YT_USER_AGENT };

    const proc = spawn(ffmpegBin, [
        '-hide_banner', '-loglevel', 'error',
        '-i', 'pipe:0',
        '-vn', '-c:a', 'copy', '-f', 'adts',
        tmpOut, '-y'
    ], { stdio: ['pipe', 'ignore', 'pipe'] });

    let stderrTail = '';
    proc.stderr.on('data', (chunk) => {
        stderrTail = (stderrTail + chunk.toString()).slice(-1200);
    });

    const finished = new Promise((resolve) => {
        proc.on('close', (code) => resolve(code));
        proc.on('error', () => resolve(-1));
    });

    const feed = (async () => {
        try {
            if (media.initUrl) {
                const initRes = await fetch(media.initUrl, { headers: upstreamHeaders });
                if (initRes.ok) {
                    const initBuf = Buffer.from(await initRes.arrayBuffer());
                    if (!proc.stdin.write(initBuf)) {
                        await new Promise(resolve => proc.stdin.once('drain', resolve));
                    }
                }
            }
            for (const segmentUrl of media.segments) {
                const segmentRes = await fetch(segmentUrl, { headers: upstreamHeaders });
                if (!segmentRes.ok) continue;
                const buf = Buffer.from(await segmentRes.arrayBuffer());
                if (!proc.stdin.write(buf)) {
                    await new Promise(resolve => proc.stdin.once('drain', resolve));
                }
            }
        } catch (e) {}
        try { proc.stdin.end(); } catch (e) {}
    })();

    let code = -1;
    try {
        code = await withTimeout(finished, 45000, 'ffmpeg hls remux');
    } catch (e) {
        try { proc.kill('SIGKILL'); } catch (err) {}
    }
    await feed.catch(() => {});

    if (code === 0 && fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 20480) {
        try {
            fs.renameSync(tmpOut, cacheFile);
            return true;
        } catch (e) {}
    }

    console.warn('[Stream] ffmpeg remux failed (code ' + code + '):', stderrTail.slice(0, 300));
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
    return false;
}

async function streamHlsMedia(req, res, media, contentType, cacheKey) {
    const isMp3 = contentType === 'audio/mpeg';
    const outType = isMp3 ? 'audio/mpeg' : 'audio/aac';
    const cacheFile = cacheKey ? path.join(streamCacheDir, `${cacheKey}.${isMp3 ? 'mp3' : 'aac'}`) : null;

    if (cacheFile && fs.existsSync(cacheFile)) {
        try {
            if (fs.statSync(cacheFile).size > 20480 && serveCachedAudioFile(req, res, cacheFile, outType)) return;
        } catch (e) {}
    }

    if (req.method === 'HEAD') {
        res.writeHead(200, {
            'Content-Type': outType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
        });
        res.end();
        return;
    }

    res.writeHead(200, {
        'Content-Type': outType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-store',
        'Accept-Ranges': 'none'
    });

    const upstreamHeaders = { 'user-agent': YT_USER_AGENT };
    const tmpCache = cacheFile ? `${cacheFile}.${Date.now()}.part` : null;
    let fileOut = null;
    if (tmpCache) {
        try {
            fileOut = fs.createWriteStream(tmpCache);
            fileOut.on('error', () => {});
        } catch (e) {
            fileOut = null;
        }
    }

    let closed = false;
    let feedCompleted = false;

    const commitCache = () => {
        if (!fileOut || !tmpCache || !cacheFile) return;
        try {
            fileOut.end(() => {
                try {
                    if (fs.existsSync(tmpCache) && fs.statSync(tmpCache).size > 20480) {
                        fs.renameSync(tmpCache, cacheFile);
                    } else if (fs.existsSync(tmpCache)) {
                        fs.unlinkSync(tmpCache);
                    }
                } catch (e) {}
            });
        } catch (e) {}
    };

    const dropCache = () => {
        try { fileOut && fileOut.destroy(); } catch (e) {}
        try { if (tmpCache && fs.existsSync(tmpCache)) fs.unlinkSync(tmpCache); } catch (e) {}
    };

    const finalizeCache = () => {
        if (feedCompleted) commitCache();
        else dropCache();
    };

    if (isMp3) {
        req.on('close', () => { closed = true; });
        (async () => {
            try {
                for (const segmentUrl of media.segments) {
                    if (closed) break;
                    const response = await fetch(segmentUrl, { headers: upstreamHeaders });
                    if (!response.ok) continue;
                    const buffer = Buffer.from(await response.arrayBuffer());
                    if (fileOut) {
                        try { fileOut.write(buffer); } catch (e) {}
                    }
                    if (!res.write(buffer)) {
                        await new Promise(resolve => res.once('drain', resolve));
                    }
                }
            } catch (e) {}
            if (!closed) feedCompleted = true;
            finalizeCache();
            try { res.end(); } catch (e) {}
        })();
        return;
    }

    const { spawn } = require('child_process');
    const ffmpegBin = getFfmpegBinary();
    const proc = spawn(ffmpegBin, [
        '-hide_banner', '-loglevel', 'error',
        '-probesize', '32768',
        '-analyzeduration', '0',
        '-i', 'pipe:0',
        '-vn', '-c:a', 'copy', '-f', 'adts',
        'pipe:1'
    ], { stdio: ['pipe', 'pipe', 'ignore'] });

    proc.stdout.on('data', (chunk) => {
        if (fileOut) {
            try { fileOut.write(chunk); } catch (e) {}
        }
        try { res.write(chunk); } catch (e) {}
    });

    let finished = false;
    const finish = (ok) => {
        if (finished) return;
        finished = true;
        if (ok && feedCompleted) commitCache();
        else dropCache();
        try { res.end(); } catch (e) {}
    };

    proc.on('error', (err) => {
        console.warn('[Stream] ffmpeg unavailable:', err && err.message);
        finish(false);
    });
    proc.on('close', (code) => finish(code === 0));

    req.on('close', () => {
        closed = true;
        try { proc.kill('SIGKILL'); } catch (e) {}
    });

    (async () => {
        const writeToFfmpeg = async (buffer) => {
            if (!proc.stdin || proc.stdin.destroyed) return;
            if (!proc.stdin.write(buffer)) {
                await new Promise(resolve => proc.stdin.once('drain', resolve));
            }
        };

        try {
            if (media.initUrl) {
                const initRes = await fetch(media.initUrl, { headers: upstreamHeaders });
                if (initRes.ok) {
                    await writeToFfmpeg(Buffer.from(await initRes.arrayBuffer()));
                }
            }

            const total = media.segments.length;
            const concurrency = 6;
            const pending = new Map();

            const loadSegment = (index) => {
                if (index < 0 || index >= total) return Promise.resolve(null);
                if (!pending.has(index)) {
                    pending.set(index, (async () => {
                        try {
                            const segmentRes = await fetch(media.segments[index], { headers: upstreamHeaders });
                            if (!segmentRes.ok) return null;
                            return Buffer.from(await segmentRes.arrayBuffer());
                        } catch (e) {
                            return null;
                        }
                    })());
                }
                return pending.get(index);
            };

            for (let i = 0; i < Math.min(concurrency, total); i++) loadSegment(i);

            for (let i = 0; i < total; i++) {
                if (closed) break;
                const buffer = await loadSegment(i);
                loadSegment(i + concurrency);
                pending.delete(i);
                if (buffer) await writeToFfmpeg(buffer);
            }
        } catch (e) {}

        if (!closed) feedCompleted = true;
        try { proc.stdin.end(); } catch (e) {}
    })();
}


async function resolveWithYtDlp(videoId) {
    try {
        const ytDlpModule = require('youtube-dl-exec');
        const ytDlpExec = ytDlpModule.exec || ytDlpModule;
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const result = await ytDlpExec(watchUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            format: 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
            referer: watchUrl,
            userAgent: YT_USER_AGENT
        }, { timeout: 30000 });

        const raw = result && (typeof result === 'string' ? result : result.stdout);
        if (!raw) return null;
        const data = JSON.parse(raw);
        let directUrl = null;
        let ext = '';
        if (data && data.url) {
            directUrl = data.url;
            ext = data.ext || '';
        } else if (data && Array.isArray(data.requested_formats) && data.requested_formats.length) {
            const audioFormat = data.requested_formats.find(f => f.acodec && f.acodec !== 'none');
            if (audioFormat && audioFormat.url) {
                directUrl = audioFormat.url;
                ext = audioFormat.ext || '';
            }
        }
        if (!directUrl) return null;
        return {
            url: directUrl,
            contentType: ext === 'webm' ? 'audio/webm' : ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg'
        };
    } catch (err) {
        console.warn('[Stream] yt-dlp fallback failed:', err && err.message);
        return null;
    }
}

function normalizeForMatch(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[\(\[].*?[\)\]]/g, ' ')
        .replace(/\b(official|video|audio|lyrics?|lyric|visuali[sz]er|remaster(?:ed)?|hq|hd|4k|mv|m\/v|topic|vevo|music|clip|premiere)\b/g, ' ')
        .replace(/[^\p{L}\p{N} ]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokensOf(value) {
    return normalizeForMatch(value).split(' ').filter(token => token.length > 1);
}

function matchScore(query, title, artist) {
    const queryTokens = Array.from(new Set(tokensOf(query)));
    const candidateTokens = new Set([...tokensOf(title), ...tokensOf(artist)]);
    if (!queryTokens.length || !candidateTokens.size) return 0;
    let hits = 0;
    for (const token of queryTokens) {
        if (candidateTokens.has(token)) hits++;
    }
    return hits / queryTokens.length;
}

function pickBestMatch(query, items, minScore = 0.6) {
    let best = null;
    let bestScore = 0;
    for (const item of items || []) {
        if (!item) continue;
        const score = matchScore(query, item.title, item.artist);
        if (score > bestScore) {
            bestScore = score;
            best = item;
        }
    }
    if (!best || bestScore < minScore) return null;
    console.log('[Stream] matched "' + query + '" -> "' + best.title + '" (score ' + bestScore.toFixed(2) + ')');
    return best;
}

async function handleStreamRequest(req, res, rawUrl) {
    const parsedUrl = new URL(rawUrl, 'http://127.0.0.1');
    const provider = (parsedUrl.searchParams.get('provider') || '').toLowerCase();
    const rawId = parsedUrl.searchParams.get('id') || '';
    const trackUrl = parsedUrl.searchParams.get('url') || '';
    const query = (parsedUrl.searchParams.get('q') || '').trim();

    const videoId = extractYouTubeId(rawId) || extractYouTubeId(trackUrl);
    const scRaw = rawId.replace(/^sc_/, '');
    const scId = /^\d{4,}$/.test(scRaw) ? scRaw : '';

    const tryYouTube = async (id) => {
        if (!id || isYouTubeIdFailed(id)) return false;
        try {
            await streamYouTubeAudio(req, res, id);
            return true;
        } catch (err) {
            console.warn('[Stream] ytdl-core failed for', id, '-', err && err.message);
        }

        try {
            const resolved = await resolveWithYtDlp(id);
            if (resolved && resolved.url) {
                await proxyRemoteAudio(req, res, resolved.url, resolved.contentType);
                return true;
            }
        } catch (err) {
            console.warn('[Stream] yt-dlp stream failed for', id, '-', err && err.message);
        }

        markYouTubeIdFailed(id);
        return false;
    };

    const trySoundCloud = async (id) => {
        if (!id) return false;
        try {
            const resolved = await resolveSoundCloudStreamUrl(id);
            if (!resolved || !resolved.url) return false;

            if (resolved.isHls) {
                const hlsMedia = await resolveHlsMedia(resolved.url);
                if (!hlsMedia) return false;
                await streamHlsMedia(req, res, hlsMedia, resolved.contentType, `sc_${id}`);
                return true;
            }

            await proxyRemoteAudio(req, res, resolved.url, resolved.contentType);
            return true;
        } catch (err) {
            console.warn('[Stream] SoundCloud failed for', id, '-', err && err.message);
            return false;
        }
    };

    const tryYouTubeByQuery = async () => {
        if (!query) return false;
        const results = await searchYouTubeNative(query, 6);
        const best = pickBestMatch(query, results, 0.6);
        if (!best || !best.videoId) return false;
        return tryYouTube(best.videoId);
    };

    const trySoundCloudByQuery = async () => {
        if (!query) return false;
        const results = await searchSoundCloudNative(query, 6);
        const best = pickBestMatch(query, results, 0.6);
        if (!best || !best.trackId) return false;
        return trySoundCloud(best.trackId);
    };

    try {
        if (provider === 'soundcloud') {
            if (await trySoundCloud(scId)) return;
            if (await trySoundCloudByQuery()) return;
            if (await tryYouTubeByQuery()) return;
        } else {
            if (await tryYouTube(videoId)) return;
            if (await trySoundCloudByQuery()) return;
        }

        if (!res.headersSent) {
            res.writeHead(404, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            });
            res.end('Stream not available');
        }
    } catch (err) {
        console.error('[Stream] Fatal stream error:', err);
        if (!res.headersSent) {
            res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
            res.end();
        } else {
            try { res.end(); } catch (e) {}
        }
    }
}

let localMediaPort = 0;
const mediaServer = http.createServer((req, res) => {
    try {
        let rawUrl = req.url || '';
        let cleanUrl = rawUrl.split('?')[0];
        let filePath = '';
        try {
            filePath = decodeURIComponent(cleanUrl);
        } catch (e) {
            filePath = cleanUrl;
        }

        filePath = filePath.replace(/^[/\\]*file:[/\\]*/i, '');

        if (process.platform === 'win32') {
            filePath = filePath.replace(/^[/]+/, '');
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

        if (cleanUrl.startsWith('/api/stream')) {
            handleStreamRequest(req, res, rawUrl);
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
            const parts = range.replace(/bytes=/, '').split('-');
            let start = parts[0] ? parseInt(parts[0], 10) : NaN;
            let end = parts[1] ? parseInt(parts[1], 10) : NaN;

            if (isNaN(start)) {
                if (!isNaN(end)) {
                    start = Math.max(0, total - end);
                    end = total - 1;
                } else {
                    start = 0;
                    end = total - 1;
                }
            } else if (isNaN(end) || end >= total) {
                end = total - 1;
            }

            if (start > end || start >= total || start < 0) {
                res.writeHead(416, {
                    'Content-Range': `bytes */${total}`,
                    'Access-Control-Allow-Origin': '*'
                });
                res.end();
                return;
            }

            const chunksize = (end - start) + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });

            fileStream.on('error', (err) => {
                if (!res.headersSent) {
                    res.writeHead(500, { 'Access-Control-Allow-Origin': '*' });
                }
                res.end();
            });

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

            fileStream.on('error', (err) => {
                if (!res.headersSent) {
                    res.writeHead(500, { 'Access-Control-Allow-Origin': '*' });
                }
                res.end();
            });

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

ipcMain.handle('music-search', async (e, payload = {}) => {
    const query = String(payload.query || '').trim();
    const provider = String(payload.provider || 'all').toLowerCase();
    const limit = Math.max(1, Math.min(Number(payload.limit) || 20, 50));
    if (!query) return [];

    try {
        if (provider === 'youtube') return await searchYouTubeNative(query, limit);
        if (provider === 'soundcloud') return await searchSoundCloudNative(query, limit);

        const [ytResults, scResults] = await Promise.all([
            searchYouTubeNative(query, Math.ceil(limit / 2)),
            searchSoundCloudNative(query, Math.ceil(limit / 2))
        ]);

        const merged = [];
        const maxLen = Math.max(ytResults.length, scResults.length);
        for (let i = 0; i < maxLen; i++) {
            if (ytResults[i]) merged.push(ytResults[i]);
            if (scResults[i]) merged.push(scResults[i]);
        }
        return merged.slice(0, limit);
    } catch (err) {
        console.error('[Search] music-search failed:', err && err.message);
        return [];
    }
});

ipcMain.handle('sponsorblock-segments', async (e, payload = {}) => {
    const videoId = extractYouTubeId(payload.videoId);
    if (!videoId) return [];

    const categories = Array.isArray(payload.categories) && payload.categories.length
        ? payload.categories
        : ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'music_offtopic'];

    const cacheKey = `${videoId}:${categories.join(',')}`;
    const cached = sponsorBlockCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.segments;

    try {
        const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=${encodeURIComponent(JSON.stringify(categories))}`;
        const response = await fetch(url, { headers: { 'user-agent': YT_USER_AGENT } });
        let segments = [];
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                segments = data
                    .map(item => ({
                        category: item.category,
                        start: Array.isArray(item.segment) ? item.segment[0] : NaN,
                        end: Array.isArray(item.segment) ? item.segment[1] : NaN,
                        uuid: item.UUID || ''
                    }))
                    .filter(segment => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.end > segment.start);
            }
        }
        sponsorBlockCache.set(cacheKey, { segments, expiresAt: Date.now() + 1000 * 60 * 60 * 6 });
        return segments;
    } catch (err) {
        console.error('[SponsorBlock] fetch failed:', err && err.message);
        return [];
    }
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

ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Audio Files', extensions: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'opus', 'webm'] }
        ]
    });
    if (result.canceled) return [];
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
                    if (!t) return null;
                    const lines = String(t).split('\n');
                    for (const line of lines) {
                        const eqIdx = line.indexOf('=');
                        if (eqIdx !== -1) {
                            const val = line.slice(eqIdx + 1).trim();
                            if (val) return val;
                        }
                    }
                    return null;
                };
                title = title || getTag('TITLE');
                artist = artist || getTag('ARTIST');
                album = album || getTag('ALBUM');
                albumArtist = albumArtist || getTag('ALBUMARTIST') || getTag('ALBUM ARTIST');
                year = year || getTag('DATE') || getTag('YEAR');
                lyrics = lyrics || getTag('UNSYNCEDLYRICS') || getTag('LYRICS');

                if (!foundImageBuffer) {
                    if (flac.picturesDatas && flac.picturesDatas.length > 0 && Buffer.isBuffer(flac.picturesDatas[0])) {
                        foundImageBuffer = flac.picturesDatas[0];
                        if (flac.picturesSpecs && flac.picturesSpecs[0] && flac.picturesSpecs[0].mime) {
                            foundMime = flac.picturesSpecs[0].mime;
                        }
                    }
                }
            } catch (flacErr) {
                console.error("FLAC read error:", flacErr);
            }
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

function ensureJpegOrPngBuffer(inputBuffer) {
    if (!inputBuffer || !Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) return null;
    if (inputBuffer.length >= 4) {
        if (inputBuffer[0] === 0xFF && inputBuffer[1] === 0xD8 && inputBuffer[2] === 0xFF) {
            return { buffer: inputBuffer, mime: 'image/jpeg' };
        }
        if (inputBuffer[0] === 0x89 && inputBuffer[1] === 0x50 && inputBuffer[2] === 0x4E && inputBuffer[3] === 0x47) {
            return { buffer: inputBuffer, mime: 'image/png' };
        }
    }
    try {
        const { execSync } = require('child_process');
        const ffmpegPath = require('ffmpeg-static');
        const tmpDir = app.getPath('temp');
        const tmpIn = path.join(tmpDir, `cov_in_${Date.now()}_${Math.random().toString(36).substring(2)}`);
        const tmpOut = path.join(tmpDir, `cov_out_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`);
        fs.writeFileSync(tmpIn, inputBuffer);
        try {
            execSync(`"${ffmpegPath}" -i "${tmpIn}" -frames:v 1 -update 1 -q:v 2 "${tmpOut}" -y`, { stdio: 'ignore' });
            if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
                const outBuf = fs.readFileSync(tmpOut);
                return { buffer: outBuf, mime: 'image/jpeg' };
            }
        } finally {
            try { if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn); } catch (e) {}
            try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
        }
    } catch (err) {
        console.error("FFmpeg image conversion error:", err);
    }
    return { buffer: inputBuffer, mime: 'image/jpeg' };
}

ipcMain.handle('write-id3-tags', async (e, { filePath, tags }) => {
    try {
        if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
        
        let coverBuffer = null;
        if (tags.coverUrl && typeof tags.coverUrl === 'string') {
            if (tags.coverUrl.startsWith('data:image')) {
                const base64Data = tags.coverUrl.split(';base64,').pop();
                coverBuffer = Buffer.from(base64Data, 'base64');
            } else if (tags.coverUrl.startsWith('file://')) {
                try {
                    const filePathUrl = new URL(tags.coverUrl);
                    if (fs.existsSync(filePathUrl)) {
                        coverBuffer = fs.readFileSync(filePathUrl);
                    }
                } catch (e) {
                    console.error("Failed to read file:// cover:", e);
                }
            } else if (fs.existsSync(tags.coverUrl)) {
                try {
                    coverBuffer = fs.readFileSync(tags.coverUrl);
                } catch (e) {
                    console.error("Failed to read local cover path:", e);
                }
            } else if (tags.coverUrl.startsWith('http://') || tags.coverUrl.startsWith('https://')) {
                try {
                    const res = await fetch(tags.coverUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                    if (res.ok) {
                        const arrayBuffer = await res.arrayBuffer();
                        coverBuffer = Buffer.from(arrayBuffer);
                    }
                } catch (e) {
                    console.error("Failed to fetch cover image:", e);
                }
            }
        }

        const ext = path.extname(filePath).toLowerCase();

         
        if (ext === '.flac') {
            let metaflacSuccess = false;
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
                    const validImg = ensureJpegOrPngBuffer(coverBuffer);
                    if (validImg && validImg.buffer) {
                        flac.pictures = [];
                        flac.picturesSpecs = [];
                        flac.picturesDatas = [];
                        flac.importPictureFromBuffer(validImg.buffer);
                    }
                }

                flac.save();
                metaflacSuccess = true;
            } catch (flacErr) {
                console.error("Metaflac write error, attempting FFmpeg fallback:", flacErr);
            }

            if (metaflacSuccess) {
                return { success: true };
            }

            try {
                const { execSync } = require('child_process');
                const ffmpegPath = require('ffmpeg-static');
                const tmpOut = path.join(app.getPath('temp'), `flac_out_${Date.now()}_${Math.random().toString(36).substring(2)}.flac`);
                let cmd = `"${ffmpegPath}" -i "${filePath}"`;
                let coverTmp = null;
                if (coverBuffer) {
                    const validImg = ensureJpegOrPngBuffer(coverBuffer);
                    coverTmp = path.join(app.getPath('temp'), `flac_cov_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`);
                    fs.writeFileSync(coverTmp, validImg.buffer);
                    cmd += ` -i "${coverTmp}" -map 0:a -map 1:0 -c:a copy -c:v:0 copy -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)" -disposition:v:0 attached_pic`;
                } else {
                    cmd += ` -map 0:a -map 0:v? -c copy`;
                }

                if (tags.title) cmd += ` -metadata title=${JSON.stringify(tags.title)}`;
                if (tags.artist) cmd += ` -metadata artist=${JSON.stringify(tags.artist)}`;
                if (tags.album) cmd += ` -metadata album=${JSON.stringify(tags.album)}`;
                if (tags.albumArtist) cmd += ` -metadata album_artist=${JSON.stringify(tags.albumArtist)}`;
                if (tags.year) cmd += ` -metadata date=${JSON.stringify(String(tags.year))}`;
                if (tags.lyrics) cmd += ` -metadata lyrics=${JSON.stringify(tags.lyrics)}`;
                cmd += ` "${tmpOut}" -y`;

                try {
                    execSync(cmd, { stdio: 'ignore' });
                    if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
                        fs.copyFileSync(tmpOut, filePath);
                        return { success: true };
                    }
                } finally {
                    try { if (coverTmp && fs.existsSync(coverTmp)) fs.unlinkSync(coverTmp); } catch (e) {}
                    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
                }
            } catch (ffErr) {
                console.error("FFmpeg FLAC write error:", ffErr);
                return { success: false, error: ffErr.message };
            }
        }

        if (ext === '.mp3') {
            let nodeID3Success = false;
            try {
                const id3Tags = {};
                if (tags.title !== undefined) id3Tags.title = tags.title;
                if (tags.artist !== undefined) id3Tags.artist = tags.artist;
                if (tags.album !== undefined) id3Tags.album = tags.album;
                if (tags.albumArtist !== undefined) id3Tags.performerInfo = tags.albumArtist;
                if (tags.year !== undefined) id3Tags.year = String(tags.year);
                if (tags.lyrics !== undefined) {
                    id3Tags.unsynchronisedLyrics = {
                        language: 'eng',
                        text: tags.lyrics
                    };
                }

                if (coverBuffer) {
                    const validImg = ensureJpegOrPngBuffer(coverBuffer);
                    if (validImg && validImg.buffer) {
                        id3Tags.image = {
                            mime: validImg.mime || 'image/jpeg',
                            type: { id: 3, name: 'front cover' },
                            description: 'Cover',
                            imageBuffer: validImg.buffer
                        };
                    }
                }

                const res = NodeID3.update(id3Tags, filePath);
                if (res === true) {
                    nodeID3Success = true;
                }
            } catch (id3Err) {
                console.error("NodeID3 update error:", id3Err);
            }

            if (nodeID3Success) {
                return { success: true };
            }

            try {
                const { execSync } = require('child_process');
                const ffmpegPath = require('ffmpeg-static');
                const tmpOut = path.join(app.getPath('temp'), `mp3_out_${Date.now()}_${Math.random().toString(36).substring(2)}.mp3`);
                let coverTmp = null;
                let cmd = `"${ffmpegPath}" -i "${filePath}"`;
                if (coverBuffer) {
                    const validImg = ensureJpegOrPngBuffer(coverBuffer);
                    coverTmp = path.join(app.getPath('temp'), `mp3_cov_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`);
                    fs.writeFileSync(coverTmp, validImg.buffer);
                    cmd += ` -i "${coverTmp}" -map 0:a:0 -map 1:0 -c:a copy -c:v:0 copy -id3v2_version 3 -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)" -disposition:v:0 attached_pic`;
                } else {
                    cmd += ` -map 0:a:0 -map 0:v? -c copy -id3v2_version 3`;
                }

                if (tags.title) cmd += ` -metadata title=${JSON.stringify(tags.title)}`;
                if (tags.artist) cmd += ` -metadata artist=${JSON.stringify(tags.artist)}`;
                if (tags.album) cmd += ` -metadata album=${JSON.stringify(tags.album)}`;
                if (tags.albumArtist) cmd += ` -metadata album_artist=${JSON.stringify(tags.albumArtist)}`;
                if (tags.year) cmd += ` -metadata date=${JSON.stringify(String(tags.year))}`;
                if (tags.lyrics) cmd += ` -metadata lyrics=${JSON.stringify(tags.lyrics)}`;
                cmd += ` "${tmpOut}" -y`;

                try {
                    execSync(cmd, { stdio: 'ignore' });
                    if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
                        fs.copyFileSync(tmpOut, filePath);
                        return { success: true };
                    }
                } finally {
                    try { if (coverTmp && fs.existsSync(coverTmp)) fs.unlinkSync(coverTmp); } catch (e) {}
                    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
                }
            } catch (ffErr) {
                console.error("FFmpeg MP3 write error:", ffErr);
                return { success: false, error: ffErr.message };
            }
        }

        try {
            const { execSync } = require('child_process');
            const ffmpegPath = require('ffmpeg-static');
            const tmpOut = path.join(app.getPath('temp'), `audio_out_${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`);
            let cmd = `"${ffmpegPath}" -i "${filePath}"`;
            let coverTmp = null;
            if (coverBuffer) {
                const validImg = ensureJpegOrPngBuffer(coverBuffer);
                coverTmp = path.join(app.getPath('temp'), `cov_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`);
                fs.writeFileSync(coverTmp, validImg.buffer);
                cmd += ` -i "${coverTmp}" -map 0:a -map 1:0 -c:a copy -c:v:0 copy -disposition:v:0 attached_pic`;
            } else {
                cmd += ` -map 0:a -map 0:v? -c copy`;
            }

            if (tags.title) cmd += ` -metadata title=${JSON.stringify(tags.title)}`;
            if (tags.artist) cmd += ` -metadata artist=${JSON.stringify(tags.artist)}`;
            if (tags.album) cmd += ` -metadata album=${JSON.stringify(tags.album)}`;
            if (tags.albumArtist) cmd += ` -metadata album_artist=${JSON.stringify(tags.albumArtist)}`;
            if (tags.year) cmd += ` -metadata date=${JSON.stringify(String(tags.year))}`;
            if (tags.lyrics) cmd += ` -metadata lyrics=${JSON.stringify(tags.lyrics)}`;
            cmd += ` "${tmpOut}" -y`;

            try {
                execSync(cmd, { stdio: 'ignore' });
                if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
                    fs.copyFileSync(tmpOut, filePath);
                    return { success: true };
                }
            } finally {
                try { if (coverTmp && fs.existsSync(coverTmp)) fs.unlinkSync(coverTmp); } catch (e) {}
                try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
            }
        } catch (ffErr) {
            console.error("FFmpeg generic write error:", ffErr);
            return { success: false, error: ffErr.message };
        }

        return { success: true };
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

ipcMain.handle('trash-file', async (e, { filePath }) => {
    try {
        if (!filePath) return { success: false, error: 'File path is required' };
        const { shell } = require('electron');
        if (fs.existsSync(filePath)) {
            await shell.trashItem(filePath);
            return { success: true };
        }
        return { success: false, error: 'File does not exist' };
    } catch (err) {
        console.error("Trash file error:", err);
        return { success: false, error: err.message };
    }
});

function getFfmpegBinary() {
    let p = null;
    try {
        p = require('ffmpeg-static');
        if (p && fs.existsSync(p)) {
            try {
                fs.chmodSync(p, 0o755);
            } catch (e) {}
            return p;
        }
    } catch (e) {}
    return 'ffmpeg';
}

function runFfmpeg(args) {
    const { spawnSync } = require('child_process');
    const bin = getFfmpegBinary();
    try {
        if (bin && bin !== 'ffmpeg') {
            fs.chmodSync(bin, 0o755);
        }
    } catch (e) {}
    
    let res = spawnSync(bin, args, { stdio: 'pipe' });
    if (res.error || res.status !== 0) {
        if (bin !== 'ffmpeg') {
            const fallbackRes = spawnSync('ffmpeg', args, { stdio: 'pipe' });
            if (!fallbackRes.error && fallbackRes.status === 0) {
                return fallbackRes;
            }
        }
        const errDetails = res.stderr ? res.stderr.toString() : (res.error ? res.error.message : 'FFmpeg process exited with code ' + res.status);
        throw new Error(errDetails);
    }
    return res;
}

async function trimFlacFile(filePath, startTime, endTime) {
    const Metaflac = require('metaflac-js');
    let existingTags = [];
    let existingPictures = [];
    try {
        const flac = new Metaflac(filePath);
        existingTags = flac.getAllTags() || [];
        if (flac.picturesDatas && flac.picturesDatas.length > 0 && Buffer.isBuffer(flac.picturesDatas[0])) {
            existingPictures = [flac.picturesDatas[0]];
        }
    } catch (e) {}

    const tmpOut = path.join(app.getPath('temp'), `trim_flac_${Date.now()}_${Math.random().toString(36).substring(2)}.flac`);
    const duration = Math.max(0.05, endTime - startTime);
    const args = [
        '-ss', String(startTime),
        '-i', filePath,
        '-t', String(duration),
        '-c:a', 'flac',
        '-compression_level', '5',
        tmpOut,
        '-y'
    ];
    runFfmpeg(args);

    if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
        try {
            const newFlac = new Metaflac(tmpOut);
            for (const tag of existingTags) {
                newFlac.setTag(tag);
            }
            if (existingPictures.length > 0) {
                newFlac.importPictureFromBuffer(existingPictures[0]);
            }
            newFlac.save();
        } catch (e) {}

        fs.copyFileSync(tmpOut, filePath);
        try { fs.unlinkSync(tmpOut); } catch (e) {}
        let realDuration = duration;
        try {
            const mm = require('music-metadata');
            const meta = await mm.parseFile(filePath, { duration: true });
            if (meta && meta.format && meta.format.duration && !isNaN(meta.format.duration)) {
                realDuration = Math.round(meta.format.duration);
            }
        } catch (e) {}
        return { success: true, duration: realDuration };
    }
    throw new Error('FLAC trim output file is missing or empty');
}

async function trimMp3File(filePath, startTime, endTime) {
    let existingTags = null;
    try {
        existingTags = NodeID3.read(filePath);
    } catch (e) {}

    const tmpOut = path.join(app.getPath('temp'), `trim_mp3_${Date.now()}_${Math.random().toString(36).substring(2)}.mp3`);
    const duration = Math.max(0.05, endTime - startTime);
    let success = false;
    try {
        const copyArgs = [
            '-ss', String(startTime),
            '-i', filePath,
            '-t', String(duration),
            '-c:a', 'copy',
            '-id3v2_version', '3',
            tmpOut,
            '-y'
        ];
        runFfmpeg(copyArgs);
        if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 1024) {
            success = true;
        }
    } catch (e) {}

    if (!success) {
        const reencodeArgs = [
            '-ss', String(startTime),
            '-i', filePath,
            '-t', String(duration),
            '-c:a', 'libmp3lame',
            '-q:a', '0',
            '-b:a', '320k',
            '-id3v2_version', '3',
            tmpOut,
            '-y'
        ];
        runFfmpeg(reencodeArgs);
        if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
            success = true;
        }
    }

    if (success && fs.existsSync(tmpOut)) {
        if (existingTags) {
            try {
                NodeID3.write(existingTags, tmpOut);
            } catch (e) {}
        }
        fs.copyFileSync(tmpOut, filePath);
        try { fs.unlinkSync(tmpOut); } catch (e) {}
        let realDuration = duration;
        try {
            const mm = require('music-metadata');
            const meta = await mm.parseFile(filePath, { duration: true });
            if (meta && meta.format && meta.format.duration && !isNaN(meta.format.duration)) {
                realDuration = Math.round(meta.format.duration);
            }
        } catch (e) {}
        return { success: true, duration: realDuration };
    }
    throw new Error('MP3 trim output file is missing or empty');
}

async function trimGenericFile(filePath, startTime, endTime, ext) {
    const tmpOut = path.join(app.getPath('temp'), `trim_gen_${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`);
    const duration = Math.max(0.05, endTime - startTime);
    let success = false;
    try {
        const copyArgs = [
            '-ss', String(startTime),
            '-i', filePath,
            '-t', String(duration),
            '-c', 'copy',
            tmpOut,
            '-y'
        ];
        runFfmpeg(copyArgs);
        if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 1024) {
            success = true;
        }
    } catch (e) {}

    if (!success) {
        const fallbackArgs = [
            '-ss', String(startTime),
            '-i', filePath,
            '-t', String(duration),
            tmpOut,
            '-y'
        ];
        runFfmpeg(fallbackArgs);
        if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
            success = true;
        }
    }

    if (success && fs.existsSync(tmpOut)) {
        fs.copyFileSync(tmpOut, filePath);
        try { fs.unlinkSync(tmpOut); } catch (e) {}
        let realDuration = duration;
        try {
            const mm = require('music-metadata');
            const meta = await mm.parseFile(filePath, { duration: true });
            if (meta && meta.format && meta.format.duration && !isNaN(meta.format.duration)) {
                realDuration = Math.round(meta.format.duration);
            }
        } catch (e) {}
        return { success: true, duration: realDuration };
    }
    throw new Error('Audio trim output file is missing or empty');
}

ipcMain.handle('trim-audio', async (e, { filePath, startTime, endTime }) => {
    try {
        if (!filePath || !fs.existsSync(filePath)) {
            return { success: false, error: 'File not found' };
        }
        const start = Math.max(0, parseFloat(startTime) || 0);
        const end = parseFloat(endTime);
        if (isNaN(end) || end <= start) {
            return { success: false, error: 'Invalid time range' };
        }
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.flac') {
            return await trimFlacFile(filePath, start, end);
        } else if (ext === '.mp3') {
            return await trimMp3File(filePath, start, end);
        } else {
            return await trimGenericFile(filePath, start, end, ext);
        }
    } catch (err) {
        console.error("Audio trim error:", err);
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
