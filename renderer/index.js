const api = require('./api');
const {ipcRenderer} = require('electron');

const captureWindowIcons = $('#show-capture-window-icon, #hide-capture-window-icon');

captureWindowIcons.click(function() {
  captureWindowIcons.toggleClass('hidden');
});

const recordingIcons = $('#start-recording-icon, #stop-recording-icon');
recordingIcons.click(function() {
  recordingIcons.toggleClass('hidden');
});

ipcRenderer.on('tookScreenshot', function(event, imgPath) {
  console.log(imgPath);
  $('#most-recent-screenshot').attr('src', imgPath);
});

