const {forwardToMain, replayActionRenderer, getInitialStateRenderer} = require('electron-redux');
const reducers = require('./reducers');
const {createStore, applyMiddleware} = require('redux');
const initialState = require('./initialState');

module.exports = function() {
  const store = createStore(
    reducers,
    initialState,
    applyMiddleware(
      forwardToMain
    )
  );

  replayActionRenderer(store);
  return store;
};