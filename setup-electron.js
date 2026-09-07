const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function ensureElectronInstalled() {
  try {
    const electronDir = path.join(__dirname, 'node_modules', 'electron');
    const distDir = path.join(electronDir, 'dist');
    const pathTxt = path.join(electronDir, 'path.txt');
    const electronExe = process.platform === 'win32' 
      ? path.join(distDir, 'electron.exe') 
      : path.join(distDir, 'electron');

    if (!fs.existsSync(electronDir)) {
      return;
    }

     
    const expectedPathTxt = process.platform === 'win32' ? 'electron.exe' : 'electron';
    if (!fs.existsSync(pathTxt) || fs.readFileSync(pathTxt, 'utf8').trim() !== expectedPathTxt) {
      fs.writeFileSync(pathTxt, expectedPathTxt);
    }

    if (fs.existsSync(electronExe)) {
      if (process.platform !== 'win32') {
        try { fs.chmodSync(electronExe, 0o755); } catch (_) {}
      }
      return;
    }

     
    const homeDir = os.homedir();
    const cacheDirs = [
      path.join(homeDir, '.cache', 'electron'),
      path.join(homeDir, '.electron'),
      path.join(homeDir, 'AppData', 'Local', 'electron', 'Cache')
    ];

    let foundZip = null;
    for (const cDir of cacheDirs) {
      if (fs.existsSync(cDir)) {
        const files = fs.readdirSync(cDir);
        const zips = files.filter(f => f.endsWith('.zip') && f.includes('electron-v33'));
        if (zips.length > 0) {
          foundZip = path.join(cDir, zips[zips.length - 1]);
          break;
        }
      }
    }

    if (foundZip) {
      console.log(`[setup-electron] Auto-extracting Electron from cache: ${foundZip}`);
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      if (process.platform !== 'win32') {
        execSync(`unzip -o "${foundZip}" -d "${distDir}"`, { stdio: 'ignore' });
        fs.writeFileSync(pathTxt, 'electron');
        try { fs.chmodSync(electronExe, 0o755); } catch (_) {}
      }
      console.log('[setup-electron] Electron binary initialized successfully.');
    } else {
       
      const installJs = path.join(electronDir, 'install.js');
      if (fs.existsSync(installJs)) {
        execSync(`node "${installJs}"`, { stdio: 'inherit' });
      }
    }
  } catch (err) {
     
    console.warn('[setup-electron] Notice:', err.message);
  }
}

function ensureYtDlpBinary() {
  try {
    const ytdlExecDir = path.join(__dirname, 'node_modules', 'youtube-dl-exec');
    const binDir = path.join(ytdlExecDir, 'bin');
    const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const binPath = path.join(binDir, binName);

    if (!fs.existsSync(binPath) && fs.existsSync(ytdlExecDir)) {
      const postInstall = path.join(ytdlExecDir, 'scripts', 'postinstall.js');
      if (fs.existsSync(postInstall)) {
        console.log('[setup-electron] Running youtube-dl-exec postinstall to download yt-dlp binary...');
        execSync(`node "${postInstall}"`, { stdio: 'inherit' });
      }
    }

    if (fs.existsSync(binPath) && process.platform !== 'win32') {
      try { fs.chmodSync(binPath, 0o755); } catch (_) {}
    }
  } catch (err) {
    console.warn('[setup-electron] yt-dlp verification notice:', err.message);
  }
}

ensureElectronInstalled();
ensureYtDlpBinary();
