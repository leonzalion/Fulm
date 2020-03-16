const {ipcRenderer} = require('electron');

const progressBar = document.getElementById('progress-bar');
ipcRenderer.on('saveProgressUpdate', function(event, percent) {
  progressBar.style.width = `${percent}%`;
});

