const Utils = require('./utils');
const Worker = require('./worker');
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
      const worker = Utils.buildWorker(Worker);
      this._workers.push(worker);
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

    return (...args) => {
      this._call(name, ...args);
    };
  }

  /**
   * Call the remote function.
   */
  _call(name, ...args) {
    name = name.name || name;
    const worker = this._workers[this._workerOpMap.get(name)];

    worker.postMessage({
      type:'call',
      args: args,
      name: name
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
}

module.exports = Runnable;
