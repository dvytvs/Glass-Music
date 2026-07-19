const fs = require('fs');
let dlJs = fs.readFileSync('downloader.js', 'utf8');

const searchFunc = `
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
                        duration: \`\${mins}:\${secs.toString().padStart(2, '0')}\`,
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
`;

if (!dlJs.includes('async function searchTracks')) {
    dlJs = dlJs.replace('module.exports = { downloadTrack };', searchFunc + '\nmodule.exports = { downloadTrack, searchTracks };\n');
    fs.writeFileSync('downloader.js', dlJs);
}
