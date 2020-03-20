const recording = require('../slices/recording');
const windows = require('../slices/windows');
const {combineReducers} = require('redux');

module.exports = combineReducers({
  recording: recording.reducer,
  windows: windows.reducer
});
