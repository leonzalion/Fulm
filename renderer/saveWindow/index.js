const {ipcRenderer} = require('electron');
const $ = require('jquery');
const path = require('path');

(async() => {
  ipcRenderer.on('savePath', function(event, savePath) {
    const saveDirectory = $('#save-directory');
    $('#save-directory-input-box').val(savePath);
    $("body").fadeIn(1000);

    saveDirectory.click(async function () {
      let userSavePath = await ipcRenderer.invoke('selectDirectory');
      if (userSavePath === undefined) return;
      if (path.extname(userSavePath) !== '.mp4') userSavePath += '.mp4';
      savePath = userSavePath;
      $('#save-directory-input-box').val(savePath);
    });

    $('#save-time-lapse').click(async function () {
      await ipcRenderer.invoke('saveTimeLapse', savePath);
    });
  });
})();
