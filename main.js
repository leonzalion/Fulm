'use strict';

const {app, ipcMain, Menu, Tray} = require('electron');
const ScreenCapturer = require('./ScreenCapturer');
const store = require('./redux/createMainStore')();
const path = require('path');

app.allowRendererProcessReuse = true;
let willQuitApp = false;
let tray = null;

async function main() {
  const screenCapturer = new ScreenCapturer({store});

}

app.on('ready', main);
app.on('before-quit', () => willQuitApp = true);
app.on('window-all-closed', () => {app.quit()});
