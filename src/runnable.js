const Utils = require('./utils');
/**
 * Runnable
 */
class Runnable {
  /**
   * Constructor
   * @param {Array} funcs array of functions to run in workers
   * @return {Runnable}
   */
  constructor() {
    this._ops = new Map();
    this._workers = [];
    this._workerOpMap = new Map();
    this._lastWorkerIndex = 0;

    this.cores = navigator && navigator.hardwareConcurrency || 1;
    for (var i = 0; i < this.cores; i++) {
      this._workers.push(Utils.buildWorker(this._workerFunc, i));
    }
  }

  /**
   * Add functions to workers to call.
   * @param {Function} func Function to assign to workers.
   */
  add(func) {
    const name = func.name || 'id_' + Math.floor(Math.random() * 200000);
    this._ops.set(name, func);
    this._compile(name, func);
    return name;
  }

  /**
   * Build the workers.
   */
  compile() {
    this._ops.forEach((op, name) => {
      this._compile(name, op);
    });
  }

  /**
   * Internal Compile Function
   */
  _compile(name, op) {
    if(this._workerOpMap.has(name)) {
      return;
    }

    const message = {
      type: 'compile',
      func: Utils.functionToMessage(op, name),
    };

    const index = this._lastWorkerIndex % this.cores;
    this._workers[index].postMessage(message);
    this._workerOpMap.set(name, index);

    this._lastWorkerIndex++;
  }

  /**
  * run
  *
  * @access public
  */
  call(name, ...args) {
    name = name.name || name;
    const worker = this._workers[this._workerOpMap.get(name)];

    worker.postMessage({
      type:'call',
      args: args,
      name: name
    });
  }

  /**
  * _workerFunc
  *
  * @access private
  */
  _workerFunc() {
  /**
   * getFunction
   *
   * @access public
   * @param {string} funcString Stringified function for worker to execute.
   * @returns {function} eval'd function
   */
    function getFunction(funcObj) {
      let foo = new Function(funcObj.args.split(','), funcObj.body);

      return foo;
    }

    let _id = -1;
    const funcMap = new Map();

    this.onmessage = function onmessage(ev) {
      const message = ev.data;

      if(message.type === 'init') {
        _id = message.id;
        console.log('setup worker with id: ', _id);
      }

      if(message.type === 'compile') {
        funcMap.set(message.func.name, getFunction(message.func));
      }

      if(message.type === 'call') {
        funcMap.get(message.name)(...message.args);
      }
    };
  }
}

module.exports = Runnable;
