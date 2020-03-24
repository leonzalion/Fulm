const {menubar} = require('menubar');
const {app, Tray} = require('electron');
const path = require('path');

module.exports = class TrayWindow {
  constructor(store) {this.store = store;}

  async init() {
    let trayWindowOptions = {
      file: './renderer/trayWindow/index.html',
      width: 140,
      height: 85,
      frame: false,
      resizable: false,
      acceptFirstMouse: true,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: true
      }
    };

    switch (process.platform) {
      case 'darwin':
        trayWindowOptions.vibrancy = 'menu';
        break;
      case 'win32':
        trayWindowOptions.backgroundColor = '#000';
        break;
    }

    const trayWindowPath = path.join(app.getAppPath(), 'renderer/trayWindow/index.html');

    const tray = new Tray('./assets/logo.png');
    const mb = menubar({
      browserWindow: trayWindowOptions,
      index: `file://${trayWindowPath}`,
      preloadWindow: true,
      tray: tray
    });

    this.menubar = mb;
    const self = this;
    return new Promise((resolve) => {
      mb.on('ready', async () => {
        mb.window.setAlwaysOnTop(true, "pop-up-menu", 1);
        this.window = mb.window;
        resolve();
      });
    });
  }

  async open() {
    if (!this.window) await this.init();
    this.menubar.showWindow();
  }
};