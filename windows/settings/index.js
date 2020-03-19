const {Window} = require('electron');
const observeStore = require('../../redux/observeStore');

module.exports = class SettingsWindow {
  constructor(store) {
    this.store = store;
    observeStore(this.store, state => state.window.settings.isOpen, async isOpen => {
      if (isOpen) await this.open();
      else if (this.window) this.window.hide();
    });
  }

  async init() {
    let settingsWindowOptions = {
      file: './renderer/settingsWindow/index.html',
      titleBarStyle: 'hidden',
    };

    this.window = new Window(settingsWindowOptions);

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  async open() {
    if (!this.window) await this.init();
    this.window.show();
  }
};