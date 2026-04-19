const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('scan-folder', async (event, folderPath) => {
  const supported = ['.mp4', '.webm', '.mov'];
  const files = [];
  
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (supported.includes(ext)) {
          const videoPath = path.join(folderPath, entry.name);
          const tagPath = videoPath + '.json';
          let tags = [];
          try {
            if (fs.existsSync(tagPath)) {
              const data = JSON.parse(fs.readFileSync(tagPath, 'utf-8'));
              tags = data.tags || [];
            }
          } catch (e) {}
          files.push({
            name: entry.name,
            path: videoPath,
            tags: tags
          });
        }
      }
    }
  } catch (err) {
    console.error('Error scanning folder:', err);
  }
  
  return files;
});

ipcMain.handle('get-video-tags', async (event, videoPath) => {
  const tagPath = videoPath + '.json';
  try {
    if (fs.existsSync(tagPath)) {
      return JSON.parse(fs.readFileSync(tagPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading tags:', err);
  }
  return { tags: [] };
});

ipcMain.handle('save-video-tags', async (event, videoPath, tags) => {
  const tagPath = videoPath + '.json';
  try {
    fs.writeFileSync(tagPath, JSON.stringify({ tags }, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving tags:', err);
    return false;
  }
});