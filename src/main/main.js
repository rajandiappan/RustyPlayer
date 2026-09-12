const { app, BrowserWindow, ipcMain, dialog, shell, crashReporter } = require('electron');
const path = require('path');
const fs = require('fs');

let log;
try {
  log = require('electron-log');
  if (log.transports && log.transports.file && log.transports.file.resolvePathFn !== undefined) {
    try {
      log.transports.file.resolvePathFn = () => path.join(app.getPath('logs'), 'main.log');
    } catch (_) {}
  }
} catch (_) {
  log = console;
}

let mainWindow;

function getConfigPath() {
  return path.join(app.getPath('userData'), 'rustyplayer-config.json');
}

function loadConfig() {
  try {
    const cfgPath = getConfigPath();
    if (fs.existsSync(cfgPath)) {
      const raw = fs.readFileSync(cfgPath, 'utf-8');
      try {
        return JSON.parse(raw);
      } catch (parseErr) {
        // Corrupt JSON — back up so user data is not lost, then return empty
        try {
          log.error('Corrupt config JSON, backing up:', parseErr);
          const bakPath = cfgPath + '.bak';
          try { fs.renameSync(cfgPath, bakPath); } catch (_) {}
        } catch (_) {}
        return {};
      }
    }
  } catch (e) {
    try { log.error('Error loading config:', e); } catch (_) {}
  }
  return {};
}

function isValidString(s, maxLen = 500) {
  return typeof s === 'string' && s.length > 0 && s.length <= maxLen && !s.includes('\0');
}
function isValidTags(tags) {
  if (!Array.isArray(tags) || tags.length > 20) return false;
  const jsonLen = JSON.stringify(tags).length;
  if (jsonLen > 10 * 1024) return false;
  return tags.every(t => typeof t === 'string' && t.length > 0 && t.length <= 64);
}
function isValidBounds(b) {
  return b && typeof b.x === 'number' && typeof b.y === 'number' && typeof b.width === 'number' && typeof b.height === 'number'
    && Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.width) && Number.isFinite(b.height)
    && b.width >= 400 && b.width <= 5000 && b.height >= 300 && b.height <= 4000;
}
function sanitizeConfig(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const out = {};
  if (data.bounds !== undefined) {
    if (isValidBounds(data.bounds)) out.bounds = data.bounds;
  }
  if (data.sidebarWidth !== undefined) {
    if (typeof data.sidebarWidth === 'number' && data.sidebarWidth >= 0 && data.sidebarWidth <= 100) out.sidebarWidth = data.sidebarWidth;
  }
  if (data.volume !== undefined) {
    if (typeof data.volume === 'number' && data.volume >= 0 && data.volume <= 1) out.volume = data.volume;
  }
  if (data.lastFolder !== undefined) {
    if (isValidString(data.lastFolder, 1000) && path.isAbsolute(data.lastFolder)) out.lastFolder = data.lastFolder;
  }
  if (data.lastVideoIndex !== undefined) {
    if (Number.isInteger(data.lastVideoIndex) && data.lastVideoIndex >= 0) out.lastVideoIndex = data.lastVideoIndex;
  }
  if (data.recentFolders !== undefined) {
    if (Array.isArray(data.recentFolders) && data.recentFolders.length <= 10) {
      const filtered = data.recentFolders.filter(p => isValidString(p, 1000) && path.isAbsolute(p));
      if (filtered.length === data.recentFolders.length) out.recentFolders = filtered;
    }
  }
  return out;
}

let saveQueue = Promise.resolve();

function doSave(data) {
  try {
    if (data && typeof data === 'object' && (Object.prototype.hasOwnProperty.call(data, '__proto__') || Object.prototype.hasOwnProperty.call(data, 'constructor') || Object.prototype.hasOwnProperty.call(data, 'prototype'))) return false;
    const clean = sanitizeConfig(data);
    const current = loadConfig();
    // prevent pollution via Object.assign on polluted prototype - use spread on clean
    const merged = { ...current, ...clean };
    // atomic write via temp file
    const tmp = getConfigPath() + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(merged, null, 2));
    fs.renameSync(tmp, getConfigPath());
    return true;
  } catch (err) {
    try { log.error('Error saving config:', err); } catch (_) { console.error('Error saving config:', err); }
    if (err && (err.code === 'ENOSPC' || err.code === 'EACCES')) {
      try { dialog.showMessageBoxSync(null, { type: 'error', title: 'Save failed', message: err.code === 'ENOSPC' ? 'Disk full — could not save settings.' : 'Permission denied — could not save settings.' }); } catch (_) {}
    }
    return false;
  }
}

function saveConfig(data) {
  // In-process mutex via promise chain to serialize concurrent saves and avoid interleaved tmp+rename
  const result = saveQueue.then(() => doSave(data));
  // Keep queue alive even if doSave somehow rejects (defensive; doSave returns boolean)
  saveQueue = result.catch(() => false).then(() => {});
  return result;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#1a1a1a', symbolColor: '#e0e0e0', height: 36 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  const config = loadConfig();
  if (config.bounds) {
    mainWindow.setBounds(config.bounds);
  }

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

process.on('uncaughtException', (err) => {
  try { log.error('Uncaught exception:', err); } catch (_) { console.error('Uncaught exception:', err); }
  try { dialog.showMessageBoxSync(null, { type: 'error', title: 'Unexpected error', message: String(err.message || err) }); } catch {}
});

app.on('render-process-gone', (event, webContents, details) => {
  try { log.error('Render process gone:', details); } catch (_) { console.error('Render process gone:', details); }
  try { dialog.showMessageBoxSync(null, { type: 'error', title: 'Renderer crashed', message: `Reason: ${details.reason}` }); } catch {}
});
app.on('child-process-gone', (event, details) => {
  try { log.error('Child process gone:', details); } catch (_) { console.error('Child process gone:', details); }
});

// P1.2: before-quit sync save to fix beforeunload race (async IPC may be killed before flush).
// Renderer saves via async window.api.saveConfig on beforeunload; main guarantees a sync flush
// of window bounds here using atomic tmp+rename so state is not lost if renderer is terminated.
app.on('before-quit', () => {
  if (!mainWindow) return;
  try {
    const bounds = mainWindow.getBounds();
    if (isValidBounds(bounds)) {
      // Reuse doSave synchronously to avoid promise-queue timing (must be sync in before-quit)
      doSave({ bounds });
    } else {
      // Fallback direct sync write if bounds invalid (still try to persist)
      const current = loadConfig();
      const merged = { ...current };
      const tmp = getConfigPath() + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(merged, null, 2));
      fs.renameSync(tmp, getConfigPath());
    }
  } catch (_) {}
});

try {
  if (crashReporter && typeof crashReporter.start === 'function') {
    crashReporter.start({ submitURL: '', uploadToServer: false });
  }
} catch (_) {}
try { log.info('App starting, Electron version:', process.versions.electron); } catch (_) {}

app.whenReady().then(() => {
  try { log.info('App ready, creating window'); } catch (_) {}
  createWindow();
  try { log.info('Window created'); } catch (_) {}
  // Auto-updater (P0.5): checks GitHub releases when publish provider is github; no-op if no CSC or offline
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    log.info('AutoUpdater check triggered');
  } catch (e) {
    // electron-updater not installed or CSC not configured — expected in dev
  }
});

app.on('window-all-closed', () => {
  if (mainWindow) {
    try {
      // Use synchronous save at quit path to avoid async race (tests and real quit expect flushed file)
      doSave({ bounds: mainWindow.getBounds() });
    } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('scan-folder', async (event, folderPath) => {
  if (!isValidString(folderPath, 2000) || !path.isAbsolute(folderPath)) return [];
  const supported = ['.mp4', '.webm', '.mov'];
  const files = [];
  try {
    const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
    const videoEntries = entries.filter(e => e.isFile() && supported.includes(path.extname(e.name).toLowerCase()));
    // Parallelize tag reads (was sequential — slow for large folders)
    const results = await Promise.all(videoEntries.map(async (entry) => {
      const videoPath = path.join(folderPath, entry.name);
      const tagPath = videoPath + '.json';
      let tags = [];
      try {
        const raw = await fs.promises.readFile(tagPath, 'utf-8');
        if (raw.length > 10 * 1024) throw new Error('sidecar too large');
        const data = JSON.parse(raw);
        if (Array.isArray(data.tags) && data.tags.every(t => typeof t === 'string' && t.length <= 64) && data.tags.length <= 20) {
          tags = data.tags;
        }
      } catch (e) {
        if (e && (e instanceof SyntaxError || (e.message && e.message.includes('sidecar too large')))) {
          try { await fs.promises.rename(tagPath, tagPath + '.bak'); } catch {}
        } else if (e && e.code !== 'ENOENT') {
          // ENOENT (no sidecar) is normal — ignore
        }
      }
      return { name: entry.name, path: videoPath, tags };
    }));
    return results;
  } catch (err) {
    try { log.error('Error scanning folder:', err); } catch (_) { console.error('Error scanning folder:', err); }
  }
  return files;
});

ipcMain.handle('get-video-tags', async (event, videoPath) => {
  if (!isValidString(videoPath, 2000) || !path.isAbsolute(videoPath)) return { tags: [] };
  const ext = path.extname(videoPath).toLowerCase();
  if (!['.mp4', '.webm', '.mov'].includes(ext)) return { tags: [] };
  const tagPath = videoPath + '.json';
  try {
    const raw = await fs.promises.readFile(tagPath, 'utf-8');
    if (raw.length > 10 * 1024) {
      try { await fs.promises.rename(tagPath, tagPath + '.bak'); } catch {}
      return { tags: [] };
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data.tags) && data.tags.every(t => typeof t === 'string' && t.length <= 64) && data.tags.length <= 20) {
      return { tags: data.tags };
    }
    return { tags: [] };
  } catch (err) {
    if (err && err instanceof SyntaxError) {
      try { await fs.promises.rename(tagPath, tagPath + '.bak'); } catch {}
    }
    return { tags: [] };
  }
});

ipcMain.handle('save-video-tags', async (event, videoPath, tags) => {
  if (!isValidString(videoPath, 2000) || !path.isAbsolute(videoPath)) return false;
  const ext = path.extname(videoPath).toLowerCase();
  if (!['.mp4', '.webm', '.mov'].includes(ext)) return false;
  if (!isValidTags(tags)) return false;
  const tagPath = videoPath + '.json';
  try {
    await fs.promises.writeFile(tagPath, JSON.stringify({ tags }, null, 2));
    return true;
  } catch (err) {
    try { log.error('Error saving tags:', err); } catch (_) { console.error('Error saving tags:', err); }
    return false;
  }
});

ipcMain.handle('open-in-explorer', async (event, filePath) => {
  if (!isValidString(filePath, 2000) || !path.isAbsolute(filePath)) return;
  try { await fs.promises.access(filePath); } catch { return; }
  shell.showItemInFolder(filePath);
});

ipcMain.handle('get-config', async () => {
  return loadConfig();
});

ipcMain.handle('save-config', async (event, data) => {
  return saveConfig(data);
});

ipcMain.handle('get-recent-folders', async () => {
  return loadConfig().recentFolders || [];
});

ipcMain.handle('add-recent-folder', async (event, folderPath) => {
  if (!isValidString(folderPath, 2000) || !path.isAbsolute(folderPath)) return loadConfig().recentFolders || [];
  const config = loadConfig();
  const list = [folderPath, ...(config.recentFolders || []).filter(f => f !== folderPath)].slice(0, 10);
  config.recentFolders = list;
  await saveConfig(config);
  return list;
});

ipcMain.handle('clear-recent-folders', async () => {
  const config = loadConfig();
  config.recentFolders = [];
  await saveConfig(config);
  return [];
});

ipcMain.handle('generate-thumbnail', async (event, videoPath) => {
  if (!isValidString(videoPath, 2000) || !path.isAbsolute(videoPath)) return null;
  const ext = path.extname(videoPath).toLowerCase();
  if (!['.mp4', '.webm', '.mov'].includes(ext)) return null;
  const thumbPath = videoPath + '.thumb.jpg';
  try {
    await fs.promises.access(thumbPath);
    return thumbPath;
  } catch (e) {}
  // Try ffmpeg generation — graceful fallback if fluent-ffmpeg/ffmpeg not installed (P1 hardening: don't crash gallery)
  try {
    const ffmpeg = require('fluent-ffmpeg');
    // Use system ffmpeg or bundled binary if available
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on('error', reject)
        .on('end', resolve)
        .screenshots({
          timestamps: ['00:00:02'],
          filename: path.basename(thumbPath),
          folder: path.dirname(thumbPath),
          size: '320x?'
        });
    });
    await fs.promises.access(thumbPath);
    return thumbPath;
  } catch (e) {
    try { log.error('Thumbnail generation failed:', e.message || e); } catch (_) {}
    return null;
  }
});