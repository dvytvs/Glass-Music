
const { app, BrowserWindow } = require('electron');
const path = require('path');

// --- PERFORMANCE FLAGS ---
// Fix for "tile memory limits exceeded" and flickering with heavy CSS filters
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
// Allocate more memory for textures (helps with 4K screens/large blur areas)
app.commandLine.appendSwitch('force-gpu-mem-available-mb', '2048'); 
// Prevent aggressive throttling of background timers which can cause stutter
app.commandLine.appendSwitch('disable-background-timer-throttling');
// -------------------------

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    title: 'Glass Music',
    icon: path.join(__dirname, 'assets', 'glass-music.png'),
    backgroundColor: '#000000', // Black background to hide initial flickering
    titleBarStyle: 'hiddenInset',
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required',
      // Explicitly enable WebGL features
      webgl: true,
      experimentalFeatures: true
    },
  });

  mainWindow.setMenuBarVisibility(false);

  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';

  if (process.env.npm_lifecycle_event === 'electron:dev') {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

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
