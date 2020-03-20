const {forwardToMain, replayActionRenderer, getInitialStateRenderer} = require('electron-redux');
const reducers = require('./reducers');
const {createStore, applyMiddleware} = require('redux');

module.exports = function() {
  const store = createStore(
    reducers,
    applyMiddleware(
      forwardToMain,
    )
  );

  replayActionRenderer(store);
  return store;
};