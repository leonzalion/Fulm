const screenshot = require('screenshot-desktop');
const Window = require('./Window');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');
const {app, ipcMain, dialog} = require('electron');
const dateFormat = require('dateformat');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const spawn = require('child_process').spawn;
const observeStore = require('./redux/observeStore');
const rimraf = require('rimraf');
const TrayWindow = require('./windows/tray');
const CaptureWindow = require('./windows/capture');
const SettingsWindow = require('./windows/settings');

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

    this.setupPaths();
    this.setupObservers();
    this.debug();
  };

  async init() {
    await this.setupWindows();
  }

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

  async setupWindows() {
    this.trayWindow = new TrayWindow(this.store);
    await this.trayWindow.init();

    this.trayWindow.menubar.tray.on('click', () => {
      if (this.isRecording) {
        this.store.dispatch({
          type: 'CHANGE_RECORDING_STATE',
          payload: 'PAUSED'
        });
      }
    });

    this.captureWindow = new CaptureWindow(this.store);
    await this.captureWindow.init();

    this.settingsWindow = new SettingsWindow(this.store);
  }

  setupObservers() {
    observeStore(this.store, state => state.recording.state, state => {
      switch (state) {
        case 'RECORDING':
          this.startRecording();
          this.trayWindow.menubar.tray.setImage('./assets/pause-icon.png');
          this.store.dispatch({
            type: 'HIDE_WINDOW',
            payload: 'capture'
          });
          break;
        case 'PAUSED':
          this.pauseRecording();
          break;
        case 'RESUMED':
          this.resumeRecording();
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



  async takeScreenshot() {
    const {x, y, width, height} = this.captureWindow;
    if (this.isRecording) {
      console.log('screenshot no.' + this.screenshotNumber);
      const screenshotPath = path.join(this.screenshotSaveDir, `${this.screenshotNumber++}.jpg`);
      await screenshot({
        screen: this.captureWindow.captureDisplayId,
        filename: screenshotPath
      });

      // editing screenshot
      const image = await Jimp.read(screenshotPath);
      image.crop(x, y, width, height).write(screenshotPath);

      this.trayWindow.window.webContents.send('tookScreenshot', screenshotPath);
    }
  }

  startRecording() {
    this.captureWindow.save();

    const dateIdentifier = dateFormat(new Date(), "yyyy-mm-dd'T'HH-MM-ss");
    this.screenshotSaveDir = path.join(this.screenshotDir, dateIdentifier);
    fs.mkdirSync(this.screenshotSaveDir);
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
    const videoPath = path.join(this.videoDir, `${dateIdentifier}.mp4`);

    let saveWindowOptions = {
      file: './renderer/saveWindow/index.html',
      height: 132,
      width: 500,
      showOnReady: true,
      titleBarStyle: 'hidden'
    };

    switch (process.platform) {
      case 'darwin':
        saveWindowOptions.vibrancy = 'menu';
        break;
      case 'win32':
        saveWindowOptions.backgroundColor = '#000';
        break;
    }

    this.saveWindow = new Window(saveWindowOptions);
    let saveWindowExitPrompt = this.showSaveWindowExitPrompt;

    let messageBoxResponse = null;

    this.saveWindow.on('close', async (e) => {
      if (saveWindowExitPrompt) {
        e.preventDefault();
        const messageBox = await dialog.showMessageBox({
          type: 'question',
          buttons: ['Yes', 'No', 'Cancel'],
          title: 'Confirm',
          message: `Should I delete this session's screenshots (located at "${this.screenshotSaveDir}")?`
        });
        messageBoxResponse = messageBox.response;
        if (messageBox.response === 0 || messageBox.response === 1) {
          saveWindowExitPrompt = false;
          this.saveWindow.close();
        }
      }
    });

    this.saveWindow.on('closed', () => {
      if (messageBoxResponse === 0) {
        rimraf(this.screenshotSaveDir, () => {
          console.log(`Deleted ${this.screenshotSaveDir}.`);
        });
      }
    });

    this.saveWindow.on("ready-to-show", () => {
      this.saveWindow.webContents.send('savePath', videoPath);
    });

  }

  saveRecording(savePath) {
    // ffmpeg -framerate 24 -i ~/Desktop/WBSScreenshots/$uuid-%08d.jpg $name.mp4
    const {width, height} = this.captureWindow;

    let scaleString = 'scale=';
    if (width % 2 === 0) scaleString += `${width}:-2`;
    else if (height % 2 === 0) scaleString += `-2:${height}`;
    else scaleString += `${Math.floor(width / 2) * 2}:-2`;

    const ffmpeg = spawn(ffmpegPath, [
      '-framerate', '24',
      '-i', `${this.screenshotSaveDir}/%d.jpg`,
      '-pix_fmt', 'yuv420p',
      '-vf', scaleString,
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
}

module.exports = ScreenCapturer;
