const {app, dialog, ipcMain} = require('electron');
const path = require('path');

const Window = require('../../Window');
const eStore = require('electron-store');
const estore = new eStore();

module.exports = class SaveWindow {
  constructor(store) {
    this.store = store;

    ipcMain.handle('selectDirectory', () => {
      return dialog.showSaveDialogSync(this.window, {
        filters: [
          {name: 'Movies', extensions: ['mp4']}
        ],
        defaultPath: '~/Untitled.mp4',
        properties: ["createDirectory"]
      });
    });
  }

  async init() {
    let saveWindowOptions = {
      file: path.join(app.getAppPath(), 'renderer/saveWindow/index.html'),
      height: 132,
      width: 500,
      showOnReady: true,
      titleBarStyle: 'hidden',
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: true
      }
    };

    switch (process.platform) {
      case 'darwin':
        saveWindowOptions.vibrancy = 'menu';
        break;
      case 'win32':
        saveWindowOptions.backgroundColor = '#000';
        break;
    }

    this.window = new Window(saveWindowOptions);

    this.window.on('closed', () => this.window = null);

    return new Promise((resolve) => {
      this.window.webContents.on('did-finish-load', resolve);
    });
  }

  async open() {
    if (!this.window) await this.init();
    this.window.show();
  }
};