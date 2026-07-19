const fs = require('fs');

let mainJs = fs.readFileSync('main.js', 'utf8');

if (!mainJs.includes("ipcMain.handle('select-folder'")) {
    mainJs = mainJs.replace(
        "ipcMain.handle('spotiflac-download'",
        `ipcMain.handle('select-folder', async () => {
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

ipcMain.handle('spotiflac-download'`
    );
}

mainJs = mainJs.replace(
    "ipcMain.handle('spotiflac-download', async (e, { urlOrQuery }) => {",
    "ipcMain.handle('spotiflac-download', async (e, { urlOrQuery, customPath }) => {"
);
mainJs = mainJs.replace(
    "const downloadsPath = path.join(userDataPath, 'Downloads');",
    "const downloadsPath = customPath || path.join(userDataPath, 'Downloads');"
);

fs.writeFileSync('main.js', mainJs);
