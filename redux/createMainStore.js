const reducers = require('./reducers');
const {createStore, applyMiddleware} = require('redux');
const {replayActionMain, forwardToRenderer} = require('electron-redux');

module.exports = function() {
  const store = createStore(
    reducers,
    applyMiddleware(forwardToRenderer)
  );

  replayActionMain(store);

  return store;
};
