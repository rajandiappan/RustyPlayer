const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFolder: () => ipcRenderer.invoke('open-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  getVideoTags: (videoPath) => ipcRenderer.invoke('get-video-tags', videoPath),
  saveVideoTags: (videoPath, tags) => ipcRenderer.invoke('save-video-tags', videoPath, tags)
});