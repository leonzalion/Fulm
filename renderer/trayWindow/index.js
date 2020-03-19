const $ = require('jquery');
const {ipcRenderer} = require('electron');
const observeStore = require('../../redux/observeStore');
const store = require('../../redux/createRendererStore')();

const showCaptureWindowIcon = $('#show-capture-window-icon');
const hideCaptureWindowIcon = $('#hide-capture-window-icon');
const startRecordingIcon = $('#start-recording-icon');
const stopRecordingIcon = $('#stop-recording-icon');
const resumeRecordingIcon = $('#resume-recording-icon');
const showSettingsWindowIcon = $('#show-settings-window-icon');
const hideSettingsWindowIcon = $('#hide-settings-window-icon');

observeStore(store, state => state.window.capture.isOpen, function(isOpen) {
  showCaptureWindowIcon.toggleClass('hidden', isOpen);
  hideCaptureWindowIcon.toggleClass('hidden', !isOpen);
});

observeStore(store, state => state.window.settings.isOpen, function(isOpen) {
  showSettingsWindowIcon.toggleClass('hidden', isOpen);
  hideSettingsWindowIcon.toggleClass('hidden', !isOpen);
});


observeStore(store, state => state.recording.state, state => {
  switch (state) {
    case 'RECORDING':
    case 'RESUMED':
    case 'PAUSED':
      stopRecordingIcon.removeClass('hidden');
      resumeRecordingIcon.removeClass('hidden');
      startRecordingIcon.addClass('hidden');
      break;
    case 'STOPPED':
      stopRecordingIcon.addClass('hidden');
      resumeRecordingIcon.addClass('hidden');
      startRecordingIcon.removeClass('hidden');
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

showSettingsWindowIcon.click(() => store.dispatch({
  type: 'SHOW_WINDOW',
  payload: 'settings'
}));

hideSettingsWindowIcon.click(() => store.dispatch({
  type: 'HIDE_WINDOW',
  payload: 'settings'
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

resumeRecordingIcon.click(() => store.dispatch({
  type: 'CHANGE_RECORDING_STATE',
  payload: 'RESUMED'
}));

ipcRenderer.on('tookScreenshot', function(event, imgPath) {
  console.log(imgPath);
  $('#most-recent-screenshot').attr('src', imgPath);
});

