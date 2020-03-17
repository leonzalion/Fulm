const initialState = require('../initialState');

module.exports = function captureWindow(state = initialState.captureWindow, action) {
  switch (action.type) {
    case 'TOGGLE_CAPTURE_WINDOW':
      return {...state, isOpen: action.payload};
    default:
      return state;
  }
};
