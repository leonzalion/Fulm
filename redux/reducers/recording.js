const initialState = require('../initialState');

module.exports = function recording(state = initialState.captureWindow, action) {
  switch (action.type) {
    case 'CHANGE_RECORDING_STATE':
      return {...state, state: action.payload};
    default:
      return state;
  }
};
