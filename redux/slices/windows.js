const {createSlice} = require('@reduxjs/toolkit');

const windows = createSlice({
  name: 'recording',
  initialState: {
    capture: {
      open: false
    },
    settings: {
      open: false
    },
    screenshot: {
      open: false
    }
  },
  reducers: {
    hide: (state, action) => {
      state[action.payload.window].open = false;
      return state;
    },
    show: (state, action) => {
      state[action.payload.window].open = true;
      return state;
    },
    adjust: (state, action) => {
      const {x, y, width, height} = action.payload;
      const window = state[action.payload.window];
      if (x) window.x = x;
      if (y) window.y = y;
      if (width) window.width = width;
      if (height) window.height = height;
    }
  }
});

module.exports = windows;
