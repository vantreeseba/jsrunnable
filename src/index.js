/**
 * Runnable
 *
 * @class 
 * @param {function} func Function to run on worker
 * @returns {Runnable} A new runnable object wrapping the function.
 */
function Runnable(funcs) {
  this._ops = [];
  this._workers = [];

  if (funcs) {
    if (typeof(funcs) === 'function') {
      this._ops.push(funcs);
    }
    if (funcs instanceof Array) {
      this._ops = this._ops.concat(funcs);
    }
  }

  var cores = navigator && navigator.hardwareConcurrency || 2;
  for (var i = 0; i < cores; i++) {
    this._workers.push(this._buildWorker());
  }
}

/**
 * run
 *
 * @access public
 */
Runnable.prototype.run = function run() {
  this._workers.forEach(this._postToWorker.bind(this));
};

/**
 * _postToWorker
 *
 * @access private
 * @param {WebWorker} worker
 */
Runnable.prototype._postToWorker = function _postToWorker(worker){
  console.log(this);
  worker.postMessage(this._ops[0].toString());
}

/**
 * _buildWorker
 *
 * @access private
 */
Runnable.prototype._buildWorker = function _buildWorker() {
  var blob = new Blob(['(' + this._workerFunc.toString() + ')()']);
  var uri = URL.createObjectURL(blob, { type: 'text/javascript' });
  return new Worker(uri);
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
