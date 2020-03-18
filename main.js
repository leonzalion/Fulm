'use strict';

const {app, ipcMain, Menu, Tray} = require('electron');
const ScreenCapturer = require('./ScreenCapturer');
const store = require('./redux/createMainStore')();

app.allowRendererProcessReuse = true;
let willQuitApp = false;
let tray = null;

async function main() {
  const screenCapturer = new ScreenCapturer({store});
  let mainWindow = screenCapturer.mainWindow;

  tray = new Tray('./assets/logo.png');

  tray.on('click', toggleWindow);
  tray.on('double-click', toggleWindow);
  tray.on('right-click', toggleWindow);

  function toggleWindow() {
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.show();
  }

  mainWindow.on('close', (e) => {
    if (!willQuitApp) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  const windowBounds = mainWindow.getBounds();
  const trayBounds = tray.getBounds();

  // Center window horizontally below the tray icon
  const x = Math.round(trayBounds.x + (trayBounds.width / 2)
    - (windowBounds.width / 2));

  // Position window 4 pixels vertically below the tray icon
  let y;
  switch (process.platform) {
    case "win32":
      y = Math.round(trayBounds.y - windowBounds.height - 4);
      break;
    case "darwin":
      y = Math.round(trayBounds.y + trayBounds.height + 4);
      break;
  }

  mainWindow.setBounds({x, y});
  mainWindow.show();
}

app.on('ready', main);
app.on('before-quit', () => willQuitApp = true);
app.on('window-all-closed', () => {app.quit()});
