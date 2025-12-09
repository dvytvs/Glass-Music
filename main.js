const { app, BrowserWindow } = require('electron');
const path = require('path');

function getIconPath() {
  if (process.platform === 'win32') {
    return path.join(__dirname, 'build', 'icons', 'win', 'icon.ico');
  } else if (process.platform === 'darwin') {
    return path.join(__dirname, 'build', 'icons', 'mac', 'icon.icns');
  } else {
    return path.join(__dirname, 'build', 'icons', 'linux', 'icon.png');
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    title: 'Glass Music',
    icon: getIconPath(),
    backgroundColor: '#000000',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required'
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
