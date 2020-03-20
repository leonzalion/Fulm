const $ = require('jquery');
const {ipcRenderer} = require('electron');
const observeStore = require('../../redux/observeStore');
const store = require('../../redux/createRendererStore')();
const recording = require('../../redux/slices/recording');
const windows = require('../../redux/slices/windows');

const showCaptureWindowIcon = $('#show-capture-window-icon');
const hideCaptureWindowIcon = $('#hide-capture-window-icon');
const startRecordingIcon = $('#start-recording-icon');
const stopRecordingIcon = $('#stop-recording-icon');
const resumeRecordingIcon = $('#resume-recording-icon');
const showSettingsWindowIcon = $('#show-settings-window-icon');
const hideSettingsWindowIcon = $('#hide-settings-window-icon');

observeStore(store, state => state.windows.capture.open, function(isOpen) {
  showCaptureWindowIcon.toggleClass('hidden', isOpen);
  hideCaptureWindowIcon.toggleClass('hidden', !isOpen);
});

observeStore(store, state => state.windows.settings.open, function(isOpen) {
  showSettingsWindowIcon.toggleClass('hidden', isOpen);
  hideSettingsWindowIcon.toggleClass('hidden', !isOpen);
});

observeStore(store, state => state.recording, state => {
  switch (state) {
    case 'started':
    case 'resumed':
    case 'paused':
      stopRecordingIcon.removeClass('hidden');
      resumeRecordingIcon.removeClass('hidden');
      startRecordingIcon.addClass('hidden');
      break;
    case 'stopped':
      stopRecordingIcon.addClass('hidden');
      resumeRecordingIcon.addClass('hidden');
      startRecordingIcon.removeClass('hidden');
  }
});

showCaptureWindowIcon.on('click', () => store.dispatch(
  windows.actions.show({window: 'capture'})
));

hideCaptureWindowIcon.on('click', () => store.dispatch(
  windows.actions.hide({window: 'capture'})
));

showSettingsWindowIcon.on('click', () => store.dispatch(
  windows.actions.show({window: 'settings'})
));

hideSettingsWindowIcon.on('click', () => store.dispatch(
  windows.actions.hide({window: 'settings'})
));

startRecordingIcon.on('click', () => store.dispatch(
  recording.actions.start()
));

stopRecordingIcon.on('click', () => store.dispatch(
  recording.actions.stop()
));

resumeRecordingIcon.click(() => store.dispatch(
  recording.actions.start()
));

ipcRenderer.on('tookScreenshot', function(event, imgPath) {
  console.log(imgPath);
  $('#most-recent-screenshot').attr('src', imgPath);
});

