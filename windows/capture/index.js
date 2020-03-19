const Window = require('../../Window');
const {screen, ipcMain} = require('electron');
const contextMenu = require('electron-context-menu');
const observeStore = require('../../redux/observeStore');

module.exports = class CaptureWindow {
  width = 800;
  height = 600;
  x = 0;
  y = 0;

  constructor(store) {
    this.store = store;
    observeStore(this.store, state => state.window.capture.isOpen, async isOpen => {
      if (isOpen) await this.open();
      else if (this.window) this.window.hide();
    });

    ipcMain.on('windowMoving', (e, {mouseX, mouseY}) => {
      const { x, y } = screen.getCursorScreenPoint();
      this.window.setPosition(x - mouseX, y - mouseY)
    });
  }

  async init() {
    this.window = new Window({
      file: './renderer/captureWindow/index.html',
      width: this.width,
      height: this.height,
      transparent: true,
      frame: false,
      backgroundColor: '#10FFFFFF',
      enableLargerThanScreen: true,
      resizable: true,
      webPreferences: {
        nodeIntegration: true
      }
    });
    this.window.excludedFromShownWindowsMenu = true;
    this.window.setBounds({x: 0, y: 0});
    this.window.setAlwaysOnTop(true, "pop-up-menu", 0);
    this.window.setPosition(this.x, this.y);

    this.displays = screen.getAllDisplays();
    this.captureDisplayId = 0;
    this.captureDisplay = this.displays[0];

    this.window.on('closed', () => {
      this.window = null;
    });

    this.setupMenu();
  }

  save() {
    [this.width, this.height] = this.window.getSize();
    [this.x, this.y] = this.window.getPosition();
  }

  lock() {
    this.window.setIgnoreMouseEvents(true);
    this.window.setBackgroundColor('#00FFFFFF');
    this.window.setAlwaysOnTop(true);
    this.window.closable = false;
    this.window.minimizable = false;
    this.window.setHasShadow(false);
  }

  unlock() {
    this.window.setIgnoreMouseEvents(false);
    this.window.setBackgroundColor('#10FFFFFF');
    this.window.setAlwaysOnTop(false);
    this.window.closable = true;
    this.window.minimizable = true;
    this.window.setHasShadow(true);
  }

  setupMenu() {
    const self = this;
    contextMenu({
      showInspectElement: false,
      prepend: (defaultActions, params, browserWindow) => [
        {
          label: "Start Capture",
          click: () => self.store.dispatch({
            type: 'CHANGE_RECORDING_STATE',
            payload: 'RECORDING'
          })
        },
        {
          label: "Hide Capture Window",
          click: () => self.store.dispatch({
            type: 'HIDE_WINDOW',
            payload: 'capture'
          })
        },
        {
          label: "Snap to Top-Left",
          click: function() {
            self.window.setBounds({x: 0, y: 0});
          }
        },
        {
          label: "Display to Capture",
          submenu: self.displays.map(function(display, i) {
            return {
              type: 'radio',
              checked: i === 0,
              label: `Display ${i}: ${display.size.width}x${display.size.height}`,
              click: function() {
                self.captureDisplay = display;
                self.captureDisplayId = i;
              }
            };
          })
        },
        {
          label: "Fit to Screen",
          click: function() {
            self.window.setBounds(self.captureDisplay.bounds);
          }
        },
        {
          label: "Hide Border when Recording",
          click: function() {
          }
        }
      ],
      window: self.window
    });
  }

  async open() {
    if (!this.window) await this.init();
    this.window.show();
  }
};