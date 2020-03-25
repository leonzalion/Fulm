const Window = require('../../Window');
const observeStore = require('../../redux/observeStore');
const windows = require('../../redux/slices/windows');
const {app} = require('electron');
const path = require('path');

module.exports = class SettingsWindow {
  constructor(store) {
    this.store = store;

    observeStore(this.store, state => state.windows.settings.open, async isOpen => {
      if (isOpen) await this.open();
      else if (this.window) this.window.hide();
    });
  }

  async init() {
    let settingsWindowOptions = {
      file: path.join(app.getAppPath(), 'renderer/settingsWindow/index.html'),
      fullscreenable: false,
      titleBarStyle: 'hiddenInset',
      height: 200,
      webPreferences: {
        nodeIntegration: true
      }
    };

    switch (process.platform) {
      case 'darwin':
        settingsWindowOptions.vibrancy = 'menu';
        break;
      case 'win32':
        settingsWindowOptions.backgroundColor = '#000';
        break;
    }

    this.window = new Window(settingsWindowOptions);

    this.window.on('focus', () => {
      this.store.dispatch(windows.actions.show({window: 'settings'}));
    });

    this.window.on('blur', () => {
      this.store.dispatch(windows.actions.hide({window: 'settings'}));
    });

    this.window.on('closed', () => {
      this.window = null;
      this.store.dispatch(windows.actions.hide({window: 'settings'}));
    });


  }

  async open() {
    if (!this.window) await this.init();
    this.window.show();
  }
};