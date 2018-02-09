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
    this._workers = [];
    this._workerOpMap = new Map();
    this._resultMap = new Map();
    this._lastWorkerIndex = 0;

    const onmessage = (ev) => {
      const message = ev.data;

      if(message.type === 'result' && this._resultMap.has(message.callId)) {
        this._resultMap.get(message.callId).resolve(message.result);
      }

      if(message.type === 'error' && this._resultMap.has(message.name)) {
        this._resultMap.get(message.name).reject(message.err);
      }

      this._resultMap.delete(message.callId);
    };

    const onerror = (err) => {
      const message = ev.data;
      if(this._resultMap.has(message.name)) {
        this._resultMap.get(message.name).reject(err);
      }
    };


    this.cores = navigator && navigator.hardwareConcurrency || 1;
    for (var i = 0; i < this.cores; i++) {
      const worker = Utils.buildWorker(Worker);
      worker.onmessage = onmessage;
      worker.onerror = onerror;

      this._workers.push(worker);
    }
  }

  /**
   * Add functions to workers to call.
   * @param {Function} func Function to assign to workers.
   */
  add(func, workerNum = 1) {
    const name = func.name || 'id_' + Math.floor(Math.random() * 200000);
    this._compile(name, func, workerNum);

    return (...args) => {
      return this._call(name, ...args);
    };
  }

  /**
   * Call the remote function.
   */
  _call(name, ...args) {
    name = name.name || name;
    const worker = this._workers[this._getAndMoveIndexInOpMap(name)];
    const callId = 'call_' + (Math.random() * 200000);

    worker.postMessage({
      type:'call',
      args: args,
      name: name,
      callId,
    });

    return new Promise((resolve, reject) => {
      this._resultMap.set(callId, {resolve, reject});
    });
  }

  /**
   *  Get's the next worker to call in a round robin fashion. 
   *
   * @param {String} name Name of the function to get worker map for.
   * @return {Number} The worker id to call.
   */
  _getAndMoveIndexInOpMap(name) {
    const opMap = this._workerOpMap.get(name);
    const workerId = opMap.pop();
    opMap.unshift(workerId);
    return workerId;
  }

  /**
   * Internal Compile Function
   */
  _compile(name, op, workerNum = 1) {
    if(this._workerOpMap.has(name)) {
      return;
    }

    const message = {
      type: 'compile',
      func: Utils.functionToMessage(op, name),
    };

    const opMap = this._workerOpMap.get(name) || [];

    for(var i = 0; i < workerNum; i ++) {
      const index = this._lastWorkerIndex % this.cores;
      this._workers[index].postMessage(message);
      opMap.push(index);
      this._lastWorkerIndex++;
    }

    this._workerOpMap.set(name, opMap);
  }
}

module.exports = Runnable;
