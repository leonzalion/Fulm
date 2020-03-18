const initialState = require('../initialState');

module.exports = function window(state = initialState.window, action) {
  const win = action.payload;
  switch (action.type) {
    case 'SHOW_WINDOW':
      return {...state, [win]: {...state[win], isOpen: true}};
    case 'HIDE_WINDOW':
      return {...state, [win]: {...state[win], isOpen: false}};
    default:
      return state;
  }
};
