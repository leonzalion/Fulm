const screenshot = require('screenshot-desktop');
const Window = require('./Window');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');
const {app, ipcMain} = require('electron');
const dateFormat = require('dateformat');
const observeStore = require('./redux/observeStore');
const recording = require('./redux/slices/recording');
const windows = require('./redux/slices/windows');
const TrayWindow = require('./windows/tray');
const CaptureWindow = require('./windows/capture');
const SettingsWindow = require('./windows/settings');
const SaveWindow = require('./windows/save');
const eStore = require('electron-store');
const estore = new eStore();
const rimraf = require('rimraf');
const spawn = require('child_process').spawn;
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

class ScreenCapturer {
  screenshotDelay = 2;
  isRecording = false;
  screenshotNumber = 1;
  showSaveWindowExitPrompt = true;

  constructor({
    store,
    screenshotDelay = this.screenshotDelay
  } = {}) {
    this.store = store;
    this.screenshotDelay = screenshotDelay;

    this.setupObservers();
  };

  async init() {
    await this.setupWindows();
    this.setupPaths();
  }

  setupPaths() {
    this.fulmVideoDir = estore.get('settings.fulmVideoDir');
    if (!this.fulmVideoDir) {
      const defaultVideoDir = path.join(app.getPath('videos'), 'Fulm');
      if (!fs.existsSync(defaultVideoDir)) fs.mkdirSync(defaultVideoDir);
      this.fulmVideoDir = defaultVideoDir;
    }

    this.fulmScreenshotDir = estore.get('settings.fulmScreenshotDir');
    if (!this.fulmScreenshotDir) {
      const defaultScreenshotDir = path.join(app.getPath('pictures'), 'Fulm');
      if (!fs.existsSync(defaultScreenshotDir)) fs.mkdirSync(defaultScreenshotDir);
      this.fulmScreenshotDir = defaultScreenshotDir;
    }
  }

  async setupWindows() {
    this.trayWindow = new TrayWindow(this.store);
    await this.trayWindow.init();

    this.trayWindow.menubar.tray.on('click', () => {
      if (this.isRecording) this.store.dispatch(recording.actions.pause());
    });

    this.captureWindow = new CaptureWindow(this.store);
    await this.captureWindow.init();

    this.settingsWindow = new SettingsWindow(this.store);

    this.saveWindow = new SaveWindow(this.store);
  }

  setupObservers() {
    observeStore(this.store, state => state.recording, state => {
      switch (state) {
        case 'started':
          this.startRecording();
          this.trayWindow.menubar.tray.setImage('./assets/pause-icon.png');
          this.store.dispatch(windows.actions.hide({window: 'capture'}));
          break;
        case 'paused':
          this.pauseRecording();
          break;
        case 'resumed':
          this.resumeRecording();
          break;
        case 'stopped':
          this.stopRecording();
          break;
      }
    });

    ipcMain.handle('saveTimeLapse', (event, savePath) => {
      this.saveRecording(savePath);
    });


  }

  async takeScreenshot() {
    const {x, y, width, height} = this.captureWindow;
    if (this.isRecording) {
      console.log('screenshot no.' + this.screenshotNumber);
      const screenshotFile = path.join(this.sessionScreenshotDir, `${this.screenshotNumber++}.jpg`);
      await screenshot({
        screen: this.captureWindow.captureDisplayId,
        filename: screenshotFile
      });

      // editing screenshot
      const image = await Jimp.read(screenshotFile);
      image.crop(x, y, width, height).write(screenshotFile);

      this.trayWindow.window.webContents.send('tookScreenshot', screenshotFile);
    }
  }

  startRecording() {
    this.captureWindow.save();

    const dateIdentifier = dateFormat(new Date(), "yyyy-mm-dd'T'HH-MM-ss");
    this.sessionScreenshotDir = path.join(this.fulmScreenshotDir, dateIdentifier);
    fs.mkdirSync(this.sessionScreenshotDir);
    this.captureWindow.lock();

    this.resumeRecording();
  }

  resumeRecording() {
    this.trayWindow.window.hide();
    this.trayWindow.menubar.tray.setImage('./assets/pause-icon.png');

    this.isRecording = true;
    (async () => await this.takeScreenshot())();
    this.recordingIntervalId = setInterval(async () => {
      await this.takeScreenshot();
    }, this.screenshotDelay * 1000);
  }

  pauseRecording() {
    this.trayWindow.menubar.tray.setImage('./assets/logo.png');
    this.isRecording = false;
    clearInterval(this.recordingIntervalId);
  }

  stopRecording() {
    this.pauseRecording();
    this.numScreenshots = this.screenshotNumber;
    this.screenshotNumber = 1;
    this.captureWindow.unlock();
    this.captureWindow.window.hide();

    const dateIdentifier = dateFormat(new Date(), "yyyy-mm-dd'T'HH-MM-ss");
    this.videoFile = path.join(this.fulmVideoDir, `${dateIdentifier}.mp4`);

    (async () => {
      await this.saveWindow.open();
      this.saveWindow.window.on('closed', () => {
        if (this.saveWindow.messageBoxResponse === 0) {
          rimraf(this.sessionScreenshotDir, () => {
            console.log(`Deleted ${this.sessionScreenshotDir}.`);
          });
        }
      });
      this.saveWindow.window.webContents.send('savePath', this.videoFile);
    })();
  }

  saveRecording() {
    const {width, height} = this.captureWindow;

    // ffmpeg -framerate 24 -i ~/Desktop/WBSScreenshots/$uuid-%08d.jpg $name.mp4
    let scaleString = 'scale=';
    if (width % 2 === 0) scaleString += `${width}:-2`;
    else if (height % 2 === 0) scaleString += `-2:${height}`;
    else scaleString += `${Math.floor(width / 2) * 2}:-2`;

    const ffmpeg = spawn(ffmpegPath, [
      '-framerate', '24',
      '-i', `${this.sessionScreenshotDir}/%d.jpg`,
      '-pix_fmt', 'yuv420p',
      '-vf', scaleString,
      this.videoFile
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


}

module.exports = ScreenCapturer;
