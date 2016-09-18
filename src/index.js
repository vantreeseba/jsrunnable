/**
 * Runnable
 *
 * @class 
 * @param {function} func Function to run on worker
 * @returns {Runnable} A new runnable object wrapping the function.
 */
function Runnable(func) {
  this.func;

  if (func && typeof(func) === 'function') {
    this.func = func;
  }
}

/**
 * run
 *
 * @access public
 */
Runnable.prototype.run = function run() {

  var blob = new Blob(['(' + this._workerFunc.toString() + ')()']);
  var uri = URL.createObjectURL(blob, { type: 'text/javascript' });
  var worker = new Worker(uri);

  worker.postMessage(this.func.toString());
};

/**
 * _workerFunc
 *
 * @access private
 */
Runnable.prototype._workerFunc = function _workerFunc() {
  /**
   * getFunction
   *
   * @access public
   * @param {string} funcString Stringified function for worker to execute.
   * @returns {function} eval'd function
   */
  function getFunction(funcString) {

    // Will use this when ES allow setting function name.
    // Helps with debugging and etc.
    // var name = funcString.substring(0, funcString.indexOf('('));
    var args = funcString.substring(funcString.indexOf('(') + 1, funcString.indexOf(')'));
    var body = funcString.substring(funcString.indexOf('{') + 1, funcString.lastIndexOf('}'));

    return new Function(args.split(','), body);
  }

  this.onmessage = function onmessage(ev) {
    var f = getFunction(ev.data);

    f();
  };
};
