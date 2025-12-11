const { app, BrowserWindow } = require('electron');
const path = require('path');

// Removed electron-squirrel-startup check to avoid runtime errors if module is missing.

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    title: 'Glass Music',
    icon: path.join(__dirname, 'assets', 'glass-music.png'),
    backgroundColor: '#000000',
    titleBarStyle: 'hiddenInset', // Mac-style nice header, falls back gracefully on Linux
    frame: true, // Native Linux frame
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Allows simple access to standard web APIs without complex preload
      webSecurity: false, // Required to load local audio files via file:// protocol
      autoplayPolicy: 'no-user-gesture-required'
    },
  });

  // Remove the default menu bar for a cleaner "app-like" aesthetic
  mainWindow.setMenuBarVisibility(false);

  // In development, load from the Vite dev server
  // In production, load the built index.html
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';

  // Check if we are in dev mode to wait for localhost
  if (process.env.npm_lifecycle_event === 'electron:dev') {
    mainWindow.loadURL(startUrl);
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
  } else {
    // Production build loading
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});