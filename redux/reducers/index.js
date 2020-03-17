const {combineReducers} = require('redux');
const captureWindow = require('./captureWindow');
const recording = require('./recording');
const settings = require('./settings');
const saveStatus = require('./saveStatus');

module.exports = combineReducers({
  captureWindow,
  recording,
  settings,
  saveStatus
});
