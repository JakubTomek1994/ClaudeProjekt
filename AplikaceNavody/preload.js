const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key) => ipcRenderer.invoke('set-api-key', key),
  openPdf: () => ipcRenderer.invoke('open-pdf'),
  parsePdfPath: (filePath) => ipcRenderer.invoke('parse-pdf-path', filePath),
  askQuestion: (data) => ipcRenderer.invoke('ask-question', data),
});
