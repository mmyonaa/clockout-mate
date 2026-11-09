const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mate', {
  getConfig: () => ipcRenderer.invoke('config'),
  onConfig: (callback) => ipcRenderer.on('config', (_event, config) => callback(config)),
  setInteractive: (on) => ipcRenderer.send('interactive', on),
  setStatus: (text) => ipcRenderer.send('status', text),
  showMenu: () => ipcRenderer.send('menu'),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  // 설정 창
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (changes) => ipcRenderer.invoke('settings:set', changes),
  setAutoLaunch: (on) => ipcRenderer.invoke('settings:auto-launch', on),
  resetPosition: () => ipcRenderer.send('settings:reset-position'),
});
