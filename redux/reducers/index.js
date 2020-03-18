const {combineReducers} = require('redux');
const window = require('./window');
const recording = require('./recording');
const settings = require('./settings');

module.exports = combineReducers({
  window,
  recording,
  settings,
});
