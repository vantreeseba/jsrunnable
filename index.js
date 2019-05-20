const Runnable = require('./runnable');

if(window) {
  window.Runnable = Runnable;
} else {
  module.exports = Runnable;
}
