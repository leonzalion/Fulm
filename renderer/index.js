const api = require('./api');
const {ipcRenderer} = require('electron');

const hideCaptureWindowIcon = document.getElementById('hide-capture-window-icon');
const showCaptureWindowIcon = document.getElementById('show-capture-window-icon');

hideCaptureWindowIcon.addEventListener('click', function() {
  hideCaptureWindowIcon.style.display = 'none';
  showCaptureWindowIcon.style.display = 'inline-block';
});

showCaptureWindowIcon.addEventListener('click', function() {
  showCaptureWindowIcon.style.display = 'none';
  hideCaptureWindowIcon.style.display = 'inline-block';
});

ipcRenderer.on('tookScreenshot', function(event, imgPath) {
  console.log(imgPath);
  document.getElementById('most-recent-screenshot').src = imgPath;
});

