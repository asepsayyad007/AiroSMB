const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  getAutostartSettings: () => ipcRenderer.invoke('settings:getAutostart'),
  setAutostartSettings: (enable) => ipcRenderer.invoke('settings:setAutostart', enable),
  isElectron: () => true
});
