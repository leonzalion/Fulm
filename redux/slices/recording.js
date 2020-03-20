const {createSlice} = require('@reduxjs/toolkit');

const recording = createSlice({
  name: 'recording',
  initialState: 'inactive',
  reducers: {
    pause: () => 'paused',
    stop: () => 'stopped',
    start: (state) => state === 'paused' ? 'resumed' : 'started'
  }
});

module.exports = recording;
