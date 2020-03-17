const initialState = require('../initialState');

module.exports = function settings(state = initialState.settings, action) {
  switch (action.type) {
    case 'CHANGE_DEFAULT_SAVE_PATH':
      return {...state, defaultSavePath: action.payload};
    case 'CHANGE_SCREENSHOT_DELAY':
      return {...state, screenshotDelay: action.payload};
    default:
      return state;
  }
};
