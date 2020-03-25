const $ = require('jquery');
const EStore = require('electron-store');
const estore = new EStore();

const screenshotDelay = $('#screenshot-delay');
screenshotDelay.val(estore.get('settings.screenshotDelay') || 3);

function calcMinutes() {
  $('#minutes-needed-per-minute').html(screenshotDelay.val() * 24);
}

screenshotDelay.on('input', calcMinutes);
calcMinutes();

$('#save-button').on('click', function() {
  estore.set('settings.screenshotDelay', screenshotDelay.val());
  $('#save-notice-text').show();
  setTimeout(function() {$('#save-notice-text').fadeOut("slow")}, 1000);
});
