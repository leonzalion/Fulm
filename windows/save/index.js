const {app, dialog, ipcMain} = require('electron');

const Window = require('../../Window');
const eStore = require('electron-store');
const estore = new eStore();

module.exports = class SaveWindow {
  constructor(store) {this.store = store;}

  async init() {
    let saveWindowOptions = {
      file: './renderer/saveWindow/index.html',
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


    let shouldSaveWindowExit = true;

    this.window.on('close', async (e) => {
      if (shouldSaveWindowExit) {
        e.preventDefault();
        const messageBox = await dialog.showMessageBox({
          type: 'question',
          buttons: ['Yes', 'No', 'Cancel'],
          title: 'Confirm',
          message: `Should I delete this session's screenshots (located at "${this.screenshotSaveDir}")?`
        });
        this.messageBoxResponse = messageBox.response;
        if (messageBox.response === 0 || messageBox.response === 1) {
          shouldSaveWindowExit = false;
          this.window.close();
        }
      }
    });

    ipcMain.handle('selectDirectory', () => {
      return dialog.showSaveDialogSync(this.window, {
        filters: [
          {name: 'Movies', extensions: ['mp4']}
        ],
        defaultPath: '~/Untitled.mp4',
        properties: ["createDirectory"]
      });
    });

    return new Promise((resolve) => {
      this.window.webContents.on('did-finish-load', () => {
        resolve();
      });
    });
  }

  async open() {
    if (!this.window) await this.init();
    this.window.show();
  }
};