const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function ensureElectronInstalled() {
  try {
    const electronDir = path.join(__dirname, 'node_modules', 'electron');
    const distDir = path.join(electronDir, 'dist');
    const pathTxt = path.join(electronDir, 'path.txt');
    const isWin = process.platform === 'win32';
    const electronExe = isWin 
      ? path.join(distDir, 'electron.exe') 
      : path.join(distDir, 'electron');

    if (!fs.existsSync(electronDir)) {
      return;
    }

    const expectedPathTxt = isWin ? 'electron.exe' : 'electron';
    if (!fs.existsSync(pathTxt) || fs.readFileSync(pathTxt, 'utf8').trim() !== expectedPathTxt) {
      fs.writeFileSync(pathTxt, expectedPathTxt);
    }

    if (fs.existsSync(electronExe)) {
      if (!isWin) {
        try { fs.chmodSync(electronExe, 0o755); } catch (_) {}
      }
      return;
    }

    if (!isWin && fs.existsSync(path.join(distDir, 'electron.exe'))) {
      console.log('[setup-electron] Detected incompatible Windows Electron binary in dist on Linux. Cleaning dist...');
      try {
        fs.rmSync(distDir, { recursive: true, force: true });
      } catch (_) {}
    } else if (isWin && fs.existsSync(path.join(distDir, 'electron')) && !fs.existsSync(electronExe)) {
      try {
        fs.rmSync(distDir, { recursive: true, force: true });
      } catch (_) {}
    }

    const targetPlatform = isWin ? 'win32' : (process.platform === 'darwin' ? 'darwin' : 'linux');
    const targetArch = process.arch;

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
        const zips = files.filter(f => 
          f.endsWith('.zip') && 
          f.includes('electron-v33') && 
          f.includes(targetPlatform) && 
          f.includes(targetArch)
        );
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
      if (!isWin) {
        try {
          execSync(`unzip -o "${foundZip}" -d "${distDir}"`, { stdio: 'ignore' });
        } catch (e) {
          console.warn('[setup-electron] unzip warning:', e.message);
        }
      } else {
        try {
          execSync(`powershell -command "Expand-Archive -Path '${foundZip}' -DestinationPath '${distDir}' -Force"`, { stdio: 'ignore' });
        } catch (e) {
          console.warn('[setup-electron] Expand-Archive warning:', e.message);
        }
      }
    }

    if (!fs.existsSync(electronExe)) {
      const installJs = path.join(electronDir, 'install.js');
      if (fs.existsSync(installJs)) {
        console.log(`[setup-electron] Fetching Electron binary for ${targetPlatform}-${targetArch} via install.js...`);
        execSync(`node "${installJs}"`, { stdio: 'inherit' });
      }
    }

    if (fs.existsSync(electronExe)) {
      if (!isWin) {
        try { fs.chmodSync(electronExe, 0o755); } catch (_) {}
      }
      fs.writeFileSync(pathTxt, expectedPathTxt);
      console.log('[setup-electron] Electron binary initialized successfully.');
    } else {
      console.error(`[setup-electron] Failed to locate or download Electron binary for ${targetPlatform}-${targetArch}.`);
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
