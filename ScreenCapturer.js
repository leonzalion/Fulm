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
const contextMenu = require('electron-context-menu');

class ScreenCapturer {
  x = 0;
  y = 0;
  width = 400;
  height = 300;
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
      ],
      window: self.captureWindow
    });
  }

  setupWindows() {
    this.captureWindow = new Window({
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
    this.captureWindow.excludedFromShownWindowsMenu = true;
    this.captureWindow.setBounds({x: 0, y: 0});
    this.captureWindow.setAlwaysOnTop(true, "pop-up-menu", 1);
    this.captureWindow.setPosition(this.x, this.y);

    ipcMain.on('windowMoving', (e, {mouseX, mouseY}) => {
      const { x, y } = screen.getCursorScreenPoint();
      this.captureWindow.setPosition(x - mouseX, y - mouseY)
    });

    const trayWindowOptions = {
      file: './renderer/trayWindow/index.html',
      width: 140,
      height: 85,
      frame: false,
      resizable: false,
      acceptFirstMouse: true,
    };

    switch (process.platform) {
      case 'darwin':
        trayWindowOptions.vibrancy = 'menu';
        break;
      case 'win32':
        trayWindowOptions.backgroundColor = '#000';
        trayWindowOptions.center = true;
        trayWindowOptions.showOnReady = true;
        break;
    }

    this.trayWindow = new Window(trayWindowOptions);
    this.trayWindow.setAlwaysOnTop(true, "pop-up-menu", 1);



    this.settingsWindow = new Window({
      file: './renderer/settingsWindow/index.html'
    });


  }

  setupObservers() {
    // watch capture window
    observeStore(this.store, state => state.window.capture.isOpen, isOpen => {
      if (isOpen) this.captureWindow.show();
      else this.captureWindow.hide();
    });

    observeStore(this.store, state => state.recording.state, state => {
      switch (state) {
        case 'RECORDING':
          this.startRecording();
          this.store.dispatch({
            type: 'HIDE_WINDOW',
            payload: 'capture'
          });
          break;
        case 'STOPPED':
          this.stopRecording();
          break;
      }
    });

    ipcMain.handle('saveTimeLapse', (event, savePath) => {
      this.saveRecording(savePath);
    });

    ipcMain.handle('selectDirectory', () => {
      return dialog.showSaveDialogSync(this.saveWindow, {
        filters: [
          {name: 'Movies', extensions: ['mp4']}
        ],
        defaultPath: '~/Untitled.mp4',
        properties: ["createDirectory"]
      });
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

        self.trayWindow.webContents.send('tookScreenshot', screenshotPath);
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

    const dateIdentifier = dateFormat(new Date(), "yyyy-mm-dd'T'HH-MM-ss");
    const videoPath = path.join(this.videoDir, `${dateIdentifier}.mp4`);

    this.saveWindow = new Window({
      file: './renderer/saveWindow/index.html',
      height: 75,
      width: 500,
      showOnReady: true
    });

    this.saveWindow.on("ready-to-show", () => {
      this.saveWindow.webContents.send('savePath', videoPath);
    });

  }

  saveRecording(savePath) {
    // ffmpeg -framerate 24 -i ~/Desktop/WBSScreenshots/$uuid-%08d.jpg $name.mp4

    const ffmpeg = spawn(ffmpegPath, [
      '-framerate', '24',
      '-i', `${this.saveDir}/%d.jpg`,
      '-pix_fmt', 'yuv420p',
      savePath
    ]);

    this.saveProgressWindow = new Window({
      file: './renderer/saveProgressWindow/index.html',
      height: 100,
      width: 800,
      showOnReady: true
    });

    ffmpeg.stdout.setEncoding('utf8');

    ffmpeg.stderr.on('data', (data) => {
      console.log(data.toString());
      const matches = /frame=\s*(\d+)/g.exec(data);
      if (matches !== null) {
        const percentage = matches[1] / this.numScreenshots * 100;
        console.log(percentage + '%');
        this.saveProgressWindow.webContents.send('saveProgressUpdate', percentage);
      }
    });

    ffmpeg.on('exit', () => {
      console.log('Time-lapse saved.');
      ffmpeg.kill('SIGINT');
      this.saveProgressWindow.close();
    });
  }

  openSettings() {

  }

}

module.exports = ScreenCapturer;
