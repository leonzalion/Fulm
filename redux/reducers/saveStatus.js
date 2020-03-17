const initialState = require('../initialState');

module.exports = function settings(state = initialState.settings, action) {
  switch (action.type) {
    case 'UPDATE_PROGRESS':
      return {...state, progress: action.payload};
    case 'CHANGE_SAVE_PATH':
      return {...state, path: action.payload};
    default:
      return state;
  }
};
