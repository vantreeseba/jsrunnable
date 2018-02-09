/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(1);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

const Runnable = __webpack_require__(2);

if(window) {
  window.Runnable = Runnable;
}


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

const Utils = __webpack_require__(3);
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


/***/ }),
/* 3 */
/***/ (function(module, exports) {

/**
 * Utilities for jsrunnable
 */
class Utils {
  /**
   * Stringifies a function
   *
   * @param {function} func Function to stringify.
   * @return {string} Stringified function.
   */
  static funcToString(func) {
    let stringFunc = func.toString();
    if(!stringFunc.startsWith('function')){
      stringFunc = 'function ' + stringFunc;
    }

    return stringFunc;
  }

  /**
  * _buildWorker
  */
  static buildWorker(workerFunc, i) {
    var blob = new Blob(['(' + Utils.funcToString(workerFunc) + ')()']);
    var uri = URL.createObjectURL(blob, {type: 'text/javascript'});
    const worker = new Worker(uri);

    worker.postMessage({type: 'init', id: i});
    return worker;
  }

  /**
   * Turn a function into an object for sending to a worker.
   *
   * @param {function} func
   * @return {Object} Function message object.
   */
  static functionToMessage(func) {
    var funcString = Utils.funcToString(func);
    var args = funcString.substring(funcString.indexOf('(') + 1, funcString.indexOf(')'));
    var body = funcString.substring(funcString.indexOf('{') + 1, funcString.lastIndexOf('}'));

    return {
      name: func.name,
      args: args,
      body: body,
    };
  }
}

module.exports = Utils;


/***/ })
/******/ ]);
//# sourceMappingURL=app.js.map
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJhcHAuanM/Mjc4NTg4NjFiYTNmN2FkMTE3MGYiLCJzb3VyY2VSb290IjoiIn0=