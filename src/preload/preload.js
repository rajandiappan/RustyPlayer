const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFolder: () => ipcRenderer.invoke('open-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  getVideoTags: (videoPath) => ipcRenderer.invoke('get-video-tags', videoPath),
  saveVideoTags: (videoPath, tags) => ipcRenderer.invoke('save-video-tags', videoPath, tags),
  openInExplorer: (filePath) => ipcRenderer.invoke('open-in-explorer', filePath),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (data) => ipcRenderer.invoke('save-config', data),
  getRecentFolders: () => ipcRenderer.invoke('get-recent-folders'),
  addRecentFolder: (folderPath) => ipcRenderer.invoke('add-recent-folder', folderPath),
  clearRecentFolders: () => ipcRenderer.invoke('clear-recent-folders'),
  generateThumbnail: (videoPath) => ipcRenderer.invoke('generate-thumbnail', videoPath)
});