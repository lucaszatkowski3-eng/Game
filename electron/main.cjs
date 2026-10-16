const electron = require('electron');
const path = require('path');
electron.app.whenReady().then(() => {
  const window = new electron.BrowserWindow({ width: 1600, height: 950, minWidth: 960, minHeight: 640, autoHideMenuBar: true, backgroundColor: '#101b18' });
  window.loadFile(path.join(__dirname, '../dist/index.html'));
});
electron.app.on('window-all-closed', () => { if (process.platform !== 'darwin') electron.app.quit(); });
