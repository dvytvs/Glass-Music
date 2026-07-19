const fs = require('fs');

const funcCode = `
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=)([^#&\\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
`;

let code = fs.readFileSync('downloader.js', 'utf8');

if (!code.includes('extractYouTubeId')) {
    code = code.replace(
        'async function downloadTrack(queryOrUrl, sender, downloadPath) {',
        funcCode + '\nasync function downloadTrack(queryOrUrl, sender, downloadPath) {'
    );
}

// Replace the URL handling logic.
const oldBlock = `
        let title = '';
        let artist = '';
        let coverUrl = null;
        let album = 'Unknown Album';
        let searchQuery = queryOrUrl;

        // If it's a Spotify link, extract metadata
        if (queryOrUrl.includes('spotify.com/track/')) {
            const meta = await getSpotifyMetadata(queryOrUrl);
            title = meta.title;
            artist = meta.artist;
            coverUrl = meta.coverUrl;
            album = meta.album || 'Unknown Album';
            searchQuery = \`\${artist} - \${title}\`;
            
            sender.send('spotiflac-metadata', meta);
        }

        const finalName = \`\${artist ? artist + ' - ' : ''}\${title || searchQuery}\`.replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '');
`;

const newBlock = `
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
            searchQuery = \`\${artist} - \${title}\`;
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
                        searchQuery = \`\${artist} - \${title}\`;
                        sender.send('spotiflac-metadata', { title, artist, coverUrl });
                    }
                } catch(e) { console.error("YT Video ID Search Error", e); }
            }
        }

        const fallbackName = queryOrUrl.replace(/https?:\\/\\//g, '').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '_');
        const finalName = title ? \`\${artist ? artist + ' - ' : ''}\${title}\`.replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '') : fallbackName;
`;

code = code.replace(oldBlock, newBlock);

fs.writeFileSync('downloader.js', code);
