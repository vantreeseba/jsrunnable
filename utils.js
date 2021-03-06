const isBrowser = typeof window !== 'undefined';
if (!isBrowser) {
  try {
    const threads = require('worker_threads');
    Worker = threads.Worker;
  // const {
    // Worker, isMainThread, parentPort, workerData
  // } = require('worker_threads');
  } catch (ex) {
    throw new Error('You must have node v12 to use workers');
  }
}
/**
 * Utilities for jsrunnable
 */
class Utils {
  /**
   * Stringifies a function
   *
   * @static
   * @param {function} func Function to stringify.
   * @return {string} Stringified function.
   */
  static funcToString(func) {
    let stringFunc = func.toString();
    const arrowIndex = stringFunc.indexOf('=>');
    const noArgParens = stringFunc.indexOf('(') > arrowIndex || stringFunc.indexOf('(') === -1;
    if (!stringFunc.startsWith('function')) {
      if (noArgParens) {
        let args = stringFunc.substring(0, arrowIndex).trim();
        let body = stringFunc.substring(arrowIndex, stringFunc.length);
        stringFunc = '(' + args + ') ' + body;
      }
    }

    return stringFunc.trim();
  }

  /**
  * Build a worker containing the given function.
  *
  * @static
  * @param {Function} workerFunc The function to build a worker for.
  * @return {Worker} worker The worker.
  */
  static buildWorker(workerFunc) {
    const funcString = Utils.funcToString(workerFunc);
    const funcWrapped = '(' + funcString + ')()';
    let worker;
    if (isBrowser) {
      var blob = new Blob([funcWrapped]);
      var uri = URL.createObjectURL(blob, {type: 'text/javascript'});
      worker = new Worker(uri);
    } else {
      if (typeof Worker == 'undefined') {
        throw new Error('You need node 12.x to use workers or pass --experimental-workers');
      }
      worker = new Worker(funcString, {eval: true});
    }

    return worker;
  }

  /**
   * Turn a function into an object for sending to a worker.
   *
   * @static
   * @param {function} func
   * @return {Object} Function message object.
   */
  static functionToMessage(func, name) {
    var funcString = Utils.funcToString(func);
    var args = funcString.substring(funcString.indexOf('(') + 1, funcString.indexOf(')'));
    var body = funcString.substring(funcString.indexOf('{') + 1, funcString.lastIndexOf('}'));

    return {
      name: name || func.name,
      args: args,
      body: body,
    };
  }

  /**
   * Returns a random id.
   *
   * @static
   * @param {String} prefix A string to prefix the id with.
   * @return {String} A string id.
   */
  static randomId(prefix = '') {
    return prefix + '_' + Math.floor(Math.random() * Date.now());
  }
}

module.exports = Utils;
