const screenshot = require('screenshot-desktop');
const Window = require('./Window');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');
const {app, Menu, screen, ipcMain, dialog} = require('electron');
const dateFormat = require('dateformat');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const spawn = require('child_process').spawn;
const observeStore = require('./redux/observeStore');

class ScreenCapturer {
  x = 0;
  y = 0;
  width = 800;
  height = 600;
  screenshotDelay = 2;
  isRecording = false;
  screenshotNumber = 1;

  constructor({
    store,
    x = this.x,
    y = this.y,
    width = this.width,
    height = this.height,
    screenshotDelay = this.screenshotDelay
  } = {}) {
    this.store = store;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.screenshotDelay = screenshotDelay;
    this.displays = screen.getAllDisplays();
    this.captureDisplayId = 0;
    this.captureDisplay = this.displays[0];

    this.setupPaths();
    this.setupWindows();
    this.setupMenu();
    this.setupObservers();
    this.debug();
  };

  debug() {
    //this.mainWindow.webContents.openDevTools({mode: 'detach'});
    //this.saveWindow.webContents.openDevTools({mode: 'detach'});
  }

  setupPaths() {
    const defaultVideoDir = path.join(app.getPath('videos'), 'Fulm');
    if (!fs.existsSync(defaultVideoDir)) fs.mkdirSync(defaultVideoDir);
    const defaultScreenshotDir = path.join(app.getPath('pictures'), 'Fulm');
    if (!fs.existsSync(defaultScreenshotDir)) fs.mkdirSync(defaultScreenshotDir);
    this.videoDir = defaultVideoDir;
    this.screenshotDir = defaultScreenshotDir;
  }

  setupMenu() {
    const self = this;
    this.captureWindowContextMenu = Menu.buildFromTemplate([
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
          type: 'TOGGLE_CAPTURE_WINDOW',
          payload: false
        })
      },
      {
        label: "Snap to Top-Left",
        click: function() {
          self.captureWindow.setBounds({x: 0, y: 0});
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
          self.captureWindow.setBounds(self.captureDisplay.bounds);
        }
      },
      {
        label: "Hide Border when Recording",
        click: function() {
        }
      }
    ]);
  }

  setupWindows() {
    this.captureWindow = new Window({
      file: './renderer/select-region.html',
      width: this.width,
      height: this.height,
      transparent: true,
      frame: false,
      backgroundColor: '#10FFFFFF',
      enableLargerThanScreen: true,
      webPreferences: {
        nodeIntegration: true
      }
    });
    this.captureWindow.excludedFromShownWindowsMenu = true;
    this.captureWindow.setBounds({x: 0, y: 0});
    this.captureWindow.setAlwaysOnTop(true, "pop-up-menu", 1);
    this.captureWindow.setPosition(this.x, this.y);

    this.mainWindow = new Window({
      file: './renderer/index.html',
      width: 140,
      height: 85,
      frame: false,
      resizable: false,
      acceptFirstMouse: true,
      vibrancy: 'menu'
    });
    this.mainWindow.setAlwaysOnTop(true, "pop-up-menu", 1);

    this.saveWindow = new Window({
      file: './renderer/save.html',
    });

    this.settingsWindow = new Window({
      file: './renderer/settings.html'
    });
  }

  setupObservers() {
    // watch capture window
    observeStore(this.store, state => state.captureWindow.isOpen, isOpen => {
      if (isOpen) this.captureWindow.show();
      else this.captureWindow.hide();
    });

    observeStore(this.store, state => state.recording.state, state => {
      switch (state) {
        case 'RECORDING':
          this.startRecording();
          break;
        case 'STOPPED':
          this.stopRecording();
          break;
      }
    });

    ipcMain.handle('selectDirectory', () => {
      return dialog.showOpenDialogSync({
        properties: ["openDirectory", "createDirectory"]
      });
    });

    ipcMain.handle('openContextMenu', () => {
      this.captureWindowContextMenu.popup();
    });
  }

  saveRecording() {
    const numScreenshots = this.numScreenshots;

    const dateIdentifier = dateFormat(new Date(), "yyyy-mm-dd'T'HH-MM-ss");
    const videoPath = path.join(this.videoDir, `${dateIdentifier}.mp4`);

    // ffmpeg -framerate 24 -i ~/Desktop/WBSScreenshots/$uuid-%08d.jpg $name.mp4
    const ffmpeg = spawn(ffmpegPath, [
      '-framerate', '24',
      '-i', `${this.saveDir}/%d.jpg`,
      '-pix_fmt', 'yuv420p',
      videoPath
    ]);
    ffmpeg.stdout.setEncoding('utf8');

    const self = this;
    ffmpeg.stderr.on('data', function(data) {
      const matches = /frame=\s*(\d+)/g.exec(data);
      if (matches !== null) {
        const percentage = matches[1] / numScreenshots * 100;
        console.log(percentage + '%');
        self.saveWindow.send('saveProgressUpdate', percentage);
      }
    });

    ffmpeg.on('exit', function() {
      console.log('Time-lapse saved.');
      self.saveWindow.close();
    });
  }

  startRecording() {
    this.save();

    const dateIdentifier = dateFormat(new Date(), "yyyy-mm-dd'T'HH-MM-ss");
    this.saveDir = path.join(this.screenshotDir, dateIdentifier);
    fs.mkdirSync(this.saveDir);

    this.lockRecordingScreen();

    const self = this;
    this.isRecording = true;
    async function takeScreenshot() {
      if (self.isRecording) {
        const screenshotPath = path.join(self.saveDir, `${self.screenshotNumber++}.jpg`);
        await screenshot({screen: self.captureDisplayId, filename: screenshotPath});

        // editing screenshot
        const image = await Jimp.read(screenshotPath);
        image.crop(self.x, self.y, self.width, self.height).write(screenshotPath);

        self.mainWindow.send('tookScreenshot', screenshotPath);
      }
    }

    (async () => await takeScreenshot())();
    this.recordingIntervalId = setInterval(takeScreenshot,this.screenshotDelay * 1000);
  }

  save() {
    [this.width, this.height] = this.captureWindow.getSize();
    [this.x, this.y] = this.captureWindow.getPosition();
  }

  lockRecordingScreen() {
    this.captureWindow.setIgnoreMouseEvents(true);
    this.captureWindow.setBackgroundColor('#00FFFFFF');
    this.captureWindow.setAlwaysOnTop(true);
    this.captureWindow.closable = false;
    this.captureWindow.minimizable = false;
    this.captureWindow.setHasShadow(false);
  }

  unlockRecordingScreen() {
    this.captureWindow.setIgnoreMouseEvents(false);
    this.captureWindow.setBackgroundColor('#10FFFFFF');
    this.captureWindow.setAlwaysOnTop(false);
    this.captureWindow.closable = true;
    this.captureWindow.minimizable = true;
    this.captureWindow.setHasShadow(true);
  }

  stopRecording() {
    clearInterval(this.recordingIntervalId);
    this.isRecording = false;
    this.numScreenshots = this.screenshotNumber;
    this.screenshotNumber = 1;
    this.unlockRecordingScreen();
    this.captureWindow.hide();
    this.saveWindow.show();
  }


}

module.exports = ScreenCapturer;
