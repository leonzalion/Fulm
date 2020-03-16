const electron = require('electron');

const api = new Proxy({}, {
  get: function(obj, channel) {
    if (typeof channel !== 'string') throw Error();
    return async (...args) => {
      return await electron.ipcRenderer.invoke(channel, ...args);
    }
  }
});

module.exports = api;