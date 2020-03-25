const $ = require('jquery');
const {ipcRenderer} = require('electron');

const progressBar = $('#progress-bar');
ipcRenderer.on('saveProgressUpdate', function(event, percent) {
  progressBar.css('width', `${percent}%`);
});
