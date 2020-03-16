'use strict';

const {app, ipcMain, Menu, Tray} = require('electron');
app.allowRendererProcessReuse = true;
const ScreenCapturer = require('./ScreenCapturer');

let willQuitApp = false;
let tray = null;

async function main() {
  tray = new Tray('./assets/logo.png');

  const screenCapturer = new ScreenCapturer();
  let mainWindow = screenCapturer.mainWindow;
  // mainWindow.webContents.openDevTools();

  mainWindow.on('close', (e) => {
    if (!willQuitApp) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

app.on('ready', main);
app.on('before-quit', () => willQuitApp = true);
app.on('window-all-closed', () => {app.quit()});