const $ = require('jquery');
const {ipcRenderer} = require('electron');
const observeStore = require('../redux/observeStore');
const store = require('../redux/createRendererStore')();

const showCaptureWindowIcon = $('#show-capture-window-icon');
const hideCaptureWindowIcon = $('#hide-capture-window-icon');
const startRecordingIcon = $('#start-recording-icon');
const stopRecordingIcon = $('#stop-recording-icon');

observeStore(store, state => state.window.capture.isOpen, function(isOpen) {
  showCaptureWindowIcon.toggleClass('hidden', isOpen);
  hideCaptureWindowIcon.toggleClass('hidden', !isOpen);
});

observeStore(store, state => state.recording.state, state => {
  switch (state) {
    case 'RECORDING':
      stopRecordingIcon.show();
      startRecordingIcon.hide();
      break;
    case 'STOPPED':
      stopRecordingIcon.hide();
      startRecordingIcon.show();
  }
});

showCaptureWindowIcon.click(() => store.dispatch({
  type: 'SHOW_WINDOW',
  payload: 'capture'
}));

hideCaptureWindowIcon.click(() => store.dispatch({
  type: 'HIDE_WINDOW',
  payload: 'capture'
}));

startRecordingIcon.click(() => {
  store.dispatch({
    type: 'CHANGE_RECORDING_STATE',
    payload: 'RECORDING'
  })
});

stopRecordingIcon.click(() => store.dispatch({
  type: 'CHANGE_RECORDING_STATE',
  payload: 'STOPPED'
}));

ipcRenderer.on('tookScreenshot', function(event, imgPath) {
  console.log(imgPath);
  $('#most-recent-screenshot').attr('src', imgPath);
});
