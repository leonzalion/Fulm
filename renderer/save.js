const {ipcRenderer} = require('electron');
const $ = require('jquery');
const store = require('../redux/createRendererStore')();

const progressBar = $('#progress-bar');
ipcRenderer.on('saveProgressUpdate', function(event, percent) {
  progressBar.css('width', `${percent}%`);
});

let saveDirectory = store.getState().settings.defaultSavePath;
$('#save-directory').html(saveDirectory);

$('#change-save-directory').click(function() {
  const newDirectory = ipcRenderer.invoke('saveDirectory');
  if (newDirectory !== undefined) {
    saveDirectory = newDirectory;
    $('#save-directory').html(newDirectory);
  }
});
