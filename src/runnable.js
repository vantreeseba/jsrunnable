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
  constructor(funcs) {
    this._ops = new Map();
    this._workers = [];
    this._workerOpMap = new Map();

    this.cores = navigator && navigator.hardwareConcurrency || 1;
    for (var i = 0; i < this.cores; i++) {
      this._workers.push(Utils.buildWorker(this._workerFunc, i));
    }

    this.add(funcs);
  }

  /**
   * Add functions to workers to call.
   * @param {Array|Function} funcs Function(s) to assign to workers.
   */
  add(funcs) {
    if (funcs) {
      if (typeof(funcs) === 'function') {
        this._ops.set(funcs.name, funcs);
      }
      if (funcs instanceof Array) {
        funcs.forEach(f => this._ops.set(f.name, f));
      }
    }
  }

  /**
   * Build the workers.
   */
  compile() {
    Array.from(this._ops.values()).forEach((op, i) => {
      const index = i % this.cores;

      const message = {
        type: 'compile',
        func: Utils.functionToMessage(op),
      };

      this._workers[index].postMessage(message);
      this._workerOpMap.set(op.name, index);
    });
  }

  /**
  * run
  *
  * @access public
  */
  call(name, args) {
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
        funcMap.get(message.name)(message.args);
      }
    };
  }
}

module.exports = Runnable;
