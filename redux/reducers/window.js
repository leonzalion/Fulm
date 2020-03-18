const initialState = require('../initialState');

module.exports = function window(state = initialState.window, action) {
  const win = state[action.payload];
  switch (action.type) {
    case 'SHOW_WINDOW':
      return {...state, [win]: {...win, isOpen: true}};
    case 'HIDE_WINDOW':
      return {...state, [win]: {...win, isOpen: false}};
    default:
      return state;
  }
};
