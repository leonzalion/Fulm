let animationId;
let mouseX;
let mouseY;

const {ipcRenderer} = require('electron');
const $ = require('jquery');

$('#container').mousedown(function(e) {
  if (e.which === 1) onMouseDown(e);
});

function onMouseDown(e) {
  mouseX = e.clientX;
  mouseY = e.clientY;

  document.addEventListener('mouseup', onMouseUp);
  requestAnimationFrame(moveWindow);
}

function onMouseUp(e) {
  ipcRenderer.send('windowMoved');
  document.removeEventListener('mouseup', onMouseUp);
  cancelAnimationFrame(animationId)
}

function moveWindow() {
  ipcRenderer.send('windowMoving', { mouseX, mouseY });
  animationId = requestAnimationFrame(moveWindow);
}
