const {ipcRenderer} = require('electron');
const $ = require('jquery');
const path = require('path');

(async() => {
  ipcRenderer.on('savePath', function(event, savePath) {
    $('#save-directory-input-box').val(savePath);
    $("body").fadeIn(1000);

    const progressBar = $('#progress-bar');
    ipcRenderer.on('saveProgressUpdate', function(event, percent) {
      progressBar.css('width', `${percent}%`);
    });

    $('#change-save-directory').click(async function () {
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
