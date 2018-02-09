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
const Worker = __webpack_require__(4);
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
  add(func) {
    const name = func.name || 'id_' + Math.floor(Math.random() * 200000);
    this._ops.set(name, func);
    this._compile(name, func);

    return (...args) => {
      return this._call(name, ...args);
    };
  }

  /**
   * Call the remote function.
   */
  _call(name, ...args) {
    name = name.name || name;
    const worker = this._workers[this._workerOpMap.get(name)];
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
    let noArgParens = stringFunc.indexOf('(') > stringFunc.indexOf('=>');
    if(!stringFunc.startsWith('function')){
      if(noArgParens) {
        stringFunc = 'function (' + stringFunc.substring(0, stringFunc.indexOf('=>')) + ')' + stringFunc;
      } else {
        stringFunc = 'function ' + stringFunc;
      }
    }

    return stringFunc;
  }

  /**
  * _buildWorker
  */
  static buildWorker(workerFunc) {
    var blob = new Blob(['(' + Utils.funcToString(workerFunc) + ')()']);
    var uri = URL.createObjectURL(blob, {type: 'text/javascript'});
    const worker = new Worker(uri);

    return worker;
  }

  /**
   * Turn a function into an object for sending to a worker.
   *
   * @param {function} func
   * @return {Object} Function message object.
   */
  static functionToMessage(func, name) {
    var funcString = Utils.funcToString(func);
    var args = funcString.substring(funcString.indexOf('(') + 1, funcString.indexOf(')'));
    var body = funcString.substring(funcString.indexOf('{') + 1, funcString.lastIndexOf('}'));

    if(body.length < 1) {
      body = funcString.substring(funcString.indexOf('=>') + 2);
    }

    return {
      name: name || func.name,
      args: args,
      body: body,
    };
  }
}

module.exports = Utils;


/***/ }),
/* 4 */
/***/ (function(module, exports) {

/**
  * worker
  */
function worker() {
  /**
   * getFunction
   *
   * @param {string} funcString Stringified function for worker to execute.
   * @returns {function} eval'd function
   */
  function getFunction(funcObj) {
    let foo = new Function(funcObj.args.split(','), funcObj.body);

    return foo;
  }

  /**
     * Posts the result of a called worker function back to the main thread.
     *
     * @param {Name of the function called.} name String
     * @param {*} result The result of the function call.
     */
  function postResult(message, result) {
    postMessage({
      type: 'result',
      name: message.name,
      callId: message.callId,
      result
    });
  }

  /**
   * Post an error back to the main thread.
   *
   * @param {Object} message the message which called
   * @param {Object|String} err The error to post to main thread.
   */
  function postError(message, err) {
    postMessage({
      type: 'error',
      name: message.name,
      callId: message.callId,
      err
    });
  }

  const funcMap = new Map();

  this.onmessage = function onmessage(ev) {
    const message = ev.data;

    if(message.type === 'compile') {
      funcMap.set(message.func.name, getFunction(message.func));
    }

    if(message.type === 'call') {
      let result;
      try {
        result = funcMap.get(message.name)(...message.args);
        postResult(message, result);
      } catch (err) {
        postError(message, err);
      }
    }
  };
}

module.exports = worker;


/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgY2QzYzRkMDE4NzE4ODhmZDg0ZDkiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydW5uYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3dvcmtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOztBQUVBO0FBQ0E7QUFDQTs7Ozs7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE1BQU07QUFDbkIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQSxtQkFBbUIsZ0JBQWdCO0FBQ25DO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0EsbUNBQW1DLGdCQUFnQjtBQUNuRCxLQUFLO0FBQ0w7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7Ozs7OztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QixjQUFjLE9BQU87QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlDQUF5Qyx3QkFBd0I7QUFDakU7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLFNBQVM7QUFDdEIsY0FBYyxPQUFPO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseURBQXlELGlDQUFpQzs7QUFFMUY7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOzs7Ozs7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYSxPQUFPO0FBQ3BCLGVBQWUsU0FBUztBQUN4QjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxlQUFlLDZCQUE2QjtBQUM1QyxlQUFlLEVBQUU7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsYUFBYSxPQUFPO0FBQ3BCLGFBQWEsY0FBYztBQUMzQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEiLCJmaWxlIjoianNydW5uYWJsZS5qcz84NTUzMWY4ODI3MDg0MzEzODE5NSIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAwKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCBjZDNjNGQwMTg3MTg4OGZkODRkOSIsImNvbnN0IFJ1bm5hYmxlID0gcmVxdWlyZSgnLi9ydW5uYWJsZScpO1xuXG5pZih3aW5kb3cpIHtcbiAgd2luZG93LlJ1bm5hYmxlID0gUnVubmFibGU7XG59XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gMVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbmNvbnN0IFdvcmtlciA9IHJlcXVpcmUoJy4vd29ya2VyJyk7XG4vKipcbiAqIFJ1bm5hYmxlXG4gKi9cbmNsYXNzIFJ1bm5hYmxlIHtcbiAgLyoqXG4gICAqIENvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7QXJyYXl9IGZ1bmNzIGFycmF5IG9mIGZ1bmN0aW9ucyB0byBydW4gaW4gd29ya2Vyc1xuICAgKiBAcmV0dXJuIHtSdW5uYWJsZX1cbiAgICovXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX29wcyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl93b3JrZXJzID0gW107XG4gICAgdGhpcy5fd29ya2VyT3BNYXAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmVzdWx0TWFwID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2xhc3RXb3JrZXJJbmRleCA9IDA7XG5cbiAgICBjb25zdCBvbm1lc3NhZ2UgPSAoZXYpID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBldi5kYXRhO1xuXG4gICAgICBpZihtZXNzYWdlLnR5cGUgPT09ICdyZXN1bHQnICYmIHRoaXMuX3Jlc3VsdE1hcC5oYXMobWVzc2FnZS5jYWxsSWQpKSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdE1hcC5nZXQobWVzc2FnZS5jYWxsSWQpLnJlc29sdmUobWVzc2FnZS5yZXN1bHQpO1xuICAgICAgfVxuXG4gICAgICBpZihtZXNzYWdlLnR5cGUgPT09ICdlcnJvcicgJiYgdGhpcy5fcmVzdWx0TWFwLmhhcyhtZXNzYWdlLm5hbWUpKSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdE1hcC5nZXQobWVzc2FnZS5uYW1lKS5yZWplY3QobWVzc2FnZS5lcnIpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9yZXN1bHRNYXAuZGVsZXRlKG1lc3NhZ2UuY2FsbElkKTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25lcnJvciA9IChlcnIpID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBldi5kYXRhO1xuICAgICAgaWYodGhpcy5fcmVzdWx0TWFwLmhhcyhtZXNzYWdlLm5hbWUpKSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdE1hcC5nZXQobWVzc2FnZS5uYW1lKS5yZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB0aGlzLmNvcmVzID0gbmF2aWdhdG9yICYmIG5hdmlnYXRvci5oYXJkd2FyZUNvbmN1cnJlbmN5IHx8IDE7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvcmVzOyBpKyspIHtcbiAgICAgIGNvbnN0IHdvcmtlciA9IFV0aWxzLmJ1aWxkV29ya2VyKFdvcmtlcik7XG4gICAgICB3b3JrZXIub25tZXNzYWdlID0gb25tZXNzYWdlO1xuICAgICAgd29ya2VyLm9uZXJyb3IgPSBvbmVycm9yO1xuXG4gICAgICB0aGlzLl93b3JrZXJzLnB1c2god29ya2VyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkIGZ1bmN0aW9ucyB0byB3b3JrZXJzIHRvIGNhbGwuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgRnVuY3Rpb24gdG8gYXNzaWduIHRvIHdvcmtlcnMuXG4gICAqL1xuICBhZGQoZnVuYykge1xuICAgIGNvbnN0IG5hbWUgPSBmdW5jLm5hbWUgfHwgJ2lkXycgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyMDAwMDApO1xuICAgIHRoaXMuX29wcy5zZXQobmFtZSwgZnVuYyk7XG4gICAgdGhpcy5fY29tcGlsZShuYW1lLCBmdW5jKTtcblxuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuX2NhbGwobmFtZSwgLi4uYXJncyk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIHRoZSByZW1vdGUgZnVuY3Rpb24uXG4gICAqL1xuICBfY2FsbChuYW1lLCAuLi5hcmdzKSB7XG4gICAgbmFtZSA9IG5hbWUubmFtZSB8fCBuYW1lO1xuICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuX3dvcmtlcnNbdGhpcy5fd29ya2VyT3BNYXAuZ2V0KG5hbWUpXTtcbiAgICBjb25zdCBjYWxsSWQgPSAnY2FsbF8nICsgKE1hdGgucmFuZG9tKCkgKiAyMDAwMDApO1xuXG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6J2NhbGwnLFxuICAgICAgYXJnczogYXJncyxcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBjYWxsSWQsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5fcmVzdWx0TWFwLnNldChjYWxsSWQsIHtyZXNvbHZlLCByZWplY3R9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBDb21waWxlIEZ1bmN0aW9uXG4gICAqL1xuICBfY29tcGlsZShuYW1lLCBvcCkge1xuICAgIGlmKHRoaXMuX3dvcmtlck9wTWFwLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICB0eXBlOiAnY29tcGlsZScsXG4gICAgICBmdW5jOiBVdGlscy5mdW5jdGlvblRvTWVzc2FnZShvcCwgbmFtZSksXG4gICAgfTtcblxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fbGFzdFdvcmtlckluZGV4ICUgdGhpcy5jb3JlcztcbiAgICB0aGlzLl93b3JrZXJzW2luZGV4XS5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICB0aGlzLl93b3JrZXJPcE1hcC5zZXQobmFtZSwgaW5kZXgpO1xuXG4gICAgdGhpcy5fbGFzdFdvcmtlckluZGV4Kys7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSdW5uYWJsZTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL3J1bm5hYmxlLmpzXG4vLyBtb2R1bGUgaWQgPSAyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogVXRpbGl0aWVzIGZvciBqc3J1bm5hYmxlXG4gKi9cbmNsYXNzIFV0aWxzIHtcbiAgLyoqXG4gICAqIFN0cmluZ2lmaWVzIGEgZnVuY3Rpb25cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBzdHJpbmdpZnkuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5naWZpZWQgZnVuY3Rpb24uXG4gICAqL1xuICBzdGF0aWMgZnVuY1RvU3RyaW5nKGZ1bmMpIHtcbiAgICBsZXQgc3RyaW5nRnVuYyA9IGZ1bmMudG9TdHJpbmcoKTtcbiAgICBsZXQgbm9BcmdQYXJlbnMgPSBzdHJpbmdGdW5jLmluZGV4T2YoJygnKSA+IHN0cmluZ0Z1bmMuaW5kZXhPZignPT4nKTtcbiAgICBpZighc3RyaW5nRnVuYy5zdGFydHNXaXRoKCdmdW5jdGlvbicpKXtcbiAgICAgIGlmKG5vQXJnUGFyZW5zKSB7XG4gICAgICAgIHN0cmluZ0Z1bmMgPSAnZnVuY3Rpb24gKCcgKyBzdHJpbmdGdW5jLnN1YnN0cmluZygwLCBzdHJpbmdGdW5jLmluZGV4T2YoJz0+JykpICsgJyknICsgc3RyaW5nRnVuYztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0cmluZ0Z1bmMgPSAnZnVuY3Rpb24gJyArIHN0cmluZ0Z1bmM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cmluZ0Z1bmM7XG4gIH1cblxuICAvKipcbiAgKiBfYnVpbGRXb3JrZXJcbiAgKi9cbiAgc3RhdGljIGJ1aWxkV29ya2VyKHdvcmtlckZ1bmMpIHtcbiAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFsnKCcgKyBVdGlscy5mdW5jVG9TdHJpbmcod29ya2VyRnVuYykgKyAnKSgpJ10pO1xuICAgIHZhciB1cmkgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IsIHt0eXBlOiAndGV4dC9qYXZhc2NyaXB0J30pO1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIodXJpKTtcblxuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cblxuICAvKipcbiAgICogVHVybiBhIGZ1bmN0aW9uIGludG8gYW4gb2JqZWN0IGZvciBzZW5kaW5nIHRvIGEgd29ya2VyLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmdW5jXG4gICAqIEByZXR1cm4ge09iamVjdH0gRnVuY3Rpb24gbWVzc2FnZSBvYmplY3QuXG4gICAqL1xuICBzdGF0aWMgZnVuY3Rpb25Ub01lc3NhZ2UoZnVuYywgbmFtZSkge1xuICAgIHZhciBmdW5jU3RyaW5nID0gVXRpbHMuZnVuY1RvU3RyaW5nKGZ1bmMpO1xuICAgIHZhciBhcmdzID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCcoJykgKyAxLCBmdW5jU3RyaW5nLmluZGV4T2YoJyknKSk7XG4gICAgdmFyIGJvZHkgPSBmdW5jU3RyaW5nLnN1YnN0cmluZyhmdW5jU3RyaW5nLmluZGV4T2YoJ3snKSArIDEsIGZ1bmNTdHJpbmcubGFzdEluZGV4T2YoJ30nKSk7XG5cbiAgICBpZihib2R5Lmxlbmd0aCA8IDEpIHtcbiAgICAgIGJvZHkgPSBmdW5jU3RyaW5nLnN1YnN0cmluZyhmdW5jU3RyaW5nLmluZGV4T2YoJz0+JykgKyAyKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogbmFtZSB8fCBmdW5jLm5hbWUsXG4gICAgICBhcmdzOiBhcmdzLFxuICAgICAgYm9keTogYm9keSxcbiAgICB9O1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbHM7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy91dGlscy5qc1xuLy8gbW9kdWxlIGlkID0gM1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAgKiB3b3JrZXJcbiAgKi9cbmZ1bmN0aW9uIHdvcmtlcigpIHtcbiAgLyoqXG4gICAqIGdldEZ1bmN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmdW5jU3RyaW5nIFN0cmluZ2lmaWVkIGZ1bmN0aW9uIGZvciB3b3JrZXIgdG8gZXhlY3V0ZS5cbiAgICogQHJldHVybnMge2Z1bmN0aW9ufSBldmFsJ2QgZnVuY3Rpb25cbiAgICovXG4gIGZ1bmN0aW9uIGdldEZ1bmN0aW9uKGZ1bmNPYmopIHtcbiAgICBsZXQgZm9vID0gbmV3IEZ1bmN0aW9uKGZ1bmNPYmouYXJncy5zcGxpdCgnLCcpLCBmdW5jT2JqLmJvZHkpO1xuXG4gICAgcmV0dXJuIGZvbztcbiAgfVxuXG4gIC8qKlxuICAgICAqIFBvc3RzIHRoZSByZXN1bHQgb2YgYSBjYWxsZWQgd29ya2VyIGZ1bmN0aW9uIGJhY2sgdG8gdGhlIG1haW4gdGhyZWFkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtOYW1lIG9mIHRoZSBmdW5jdGlvbiBjYWxsZWQufSBuYW1lIFN0cmluZ1xuICAgICAqIEBwYXJhbSB7Kn0gcmVzdWx0IFRoZSByZXN1bHQgb2YgdGhlIGZ1bmN0aW9uIGNhbGwuXG4gICAgICovXG4gIGZ1bmN0aW9uIHBvc3RSZXN1bHQobWVzc2FnZSwgcmVzdWx0KSB7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ3Jlc3VsdCcsXG4gICAgICBuYW1lOiBtZXNzYWdlLm5hbWUsXG4gICAgICBjYWxsSWQ6IG1lc3NhZ2UuY2FsbElkLFxuICAgICAgcmVzdWx0XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUG9zdCBhbiBlcnJvciBiYWNrIHRvIHRoZSBtYWluIHRocmVhZC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgdGhlIG1lc3NhZ2Ugd2hpY2ggY2FsbGVkXG4gICAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gZXJyIFRoZSBlcnJvciB0byBwb3N0IHRvIG1haW4gdGhyZWFkLlxuICAgKi9cbiAgZnVuY3Rpb24gcG9zdEVycm9yKG1lc3NhZ2UsIGVycikge1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICBuYW1lOiBtZXNzYWdlLm5hbWUsXG4gICAgICBjYWxsSWQ6IG1lc3NhZ2UuY2FsbElkLFxuICAgICAgZXJyXG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBmdW5jTWFwID0gbmV3IE1hcCgpO1xuXG4gIHRoaXMub25tZXNzYWdlID0gZnVuY3Rpb24gb25tZXNzYWdlKGV2KSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG5cbiAgICBpZihtZXNzYWdlLnR5cGUgPT09ICdjb21waWxlJykge1xuICAgICAgZnVuY01hcC5zZXQobWVzc2FnZS5mdW5jLm5hbWUsIGdldEZ1bmN0aW9uKG1lc3NhZ2UuZnVuYykpO1xuICAgIH1cblxuICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ2NhbGwnKSB7XG4gICAgICBsZXQgcmVzdWx0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gZnVuY01hcC5nZXQobWVzc2FnZS5uYW1lKSguLi5tZXNzYWdlLmFyZ3MpO1xuICAgICAgICBwb3N0UmVzdWx0KG1lc3NhZ2UsIHJlc3VsdCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcG9zdEVycm9yKG1lc3NhZ2UsIGVycik7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdvcmtlcjtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL3dvcmtlci5qc1xuLy8gbW9kdWxlIGlkID0gNFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiXSwic291cmNlUm9vdCI6IiJ9