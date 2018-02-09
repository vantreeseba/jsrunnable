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
  _compile(name, op, workerNum = 1) {
    if(this._workerOpMap.has(name)) {
      return;
    }

    const message = {
      type: 'compile',
      func: Utils.functionToMessage(op, name),
    };

    for(var i = 0; i < workerNum; i ++) {
      const index = this._lastWorkerIndex % this.cores;
      this._workers[index].postMessage(message);
      this._workerOpMap.set(name, index);

      this._lastWorkerIndex++;
    }
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
  const funcMap = new Map();

  /**
   * getFunction
   *
   * @param {string} funcString Stringified function for worker to execute.
   * @returns {function} eval'd function
   */
  const getFunction = (funcObj) => {
    return new Function(funcObj.args.split(','), funcObj.body);
  }

  /**
     * Posts the result of a called worker function back to the main thread.
     *
     * @param {Name of the function called.} name String
     * @param {*} result The result of the function call.
     */
  const postResult = (message, result) => {
    postMessage({
      type: 'result',
      name: message.name,
      callId: message.callId,
      result
    });
  };

  /**
   * Post an error back to the main thread.
   *
   * @param {Object} message the message which called
   * @param {Object|String} err The error to post to main thread.
   */
  const postError = (message, err) => {
    postMessage({
      type: 'error',
      name: message.name,
      callId: message.callId,
      err
    });
  };

  /**
   * Create the function from the message object
   * @param {Object} message Message object from main thread.
   */
  const compile = (message) => {
    funcMap.set(message.func.name, getFunction(message.func));
  };

  /**
   * Call the function from the message object.
   * @param {Object} message Message object from main thread.
   */
  const call = (message) => {
    let result;
    try {
      result = funcMap.get(message.name)(...message.args);
      postResult(message, result);
    } catch (err) {
      postError(message, err);
    }
  };

  onmessage = (ev) => {
    const message = ev.data;

    message.type === 'compile' ? compile(message)
      : message.type === 'call' ? call(message)
        : 0; // Why can't I do a return here?
  };
}

module.exports = worker;


/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgY2FhNjU5NWNiZDNmNjAyNzJlZTUiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydW5uYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3dvcmtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOztBQUVBO0FBQ0E7QUFDQTs7Ozs7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE1BQU07QUFDbkIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0EsbUJBQW1CLGdCQUFnQjtBQUNuQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxhQUFhLFNBQVM7QUFDdEI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQSxtQ0FBbUMsZ0JBQWdCO0FBQ25ELEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxrQkFBa0IsZUFBZTtBQUNqQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7Ozs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLFNBQVM7QUFDdEIsY0FBYyxPQUFPO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5Q0FBeUMsd0JBQXdCO0FBQ2pFOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsYUFBYSxTQUFTO0FBQ3RCLGNBQWMsT0FBTztBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlEQUF5RCxpQ0FBaUM7O0FBRTFGO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7Ozs7OztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsT0FBTztBQUNwQixlQUFlLFNBQVM7QUFDeEI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsZUFBZSw2QkFBNkI7QUFDNUMsZUFBZSxFQUFFO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsT0FBTztBQUNwQixhQUFhLGNBQWM7QUFDM0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7QUFDQTtBQUNBLGFBQWEsT0FBTztBQUNwQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsYUFBYSxPQUFPO0FBQ3BCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7O0FBRUEiLCJmaWxlIjoianNydW5uYWJsZS5qcz82Mzc4NzZkODJmZGY0YjRhZTJjNyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAwKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCBjYWE2NTk1Y2JkM2Y2MDI3MmVlNSIsImNvbnN0IFJ1bm5hYmxlID0gcmVxdWlyZSgnLi9ydW5uYWJsZScpO1xuXG5pZih3aW5kb3cpIHtcbiAgd2luZG93LlJ1bm5hYmxlID0gUnVubmFibGU7XG59XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gMVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbmNvbnN0IFdvcmtlciA9IHJlcXVpcmUoJy4vd29ya2VyJyk7XG4vKipcbiAqIFJ1bm5hYmxlXG4gKi9cbmNsYXNzIFJ1bm5hYmxlIHtcbiAgLyoqXG4gICAqIENvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7QXJyYXl9IGZ1bmNzIGFycmF5IG9mIGZ1bmN0aW9ucyB0byBydW4gaW4gd29ya2Vyc1xuICAgKiBAcmV0dXJuIHtSdW5uYWJsZX1cbiAgICovXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX3dvcmtlcnMgPSBbXTtcbiAgICB0aGlzLl93b3JrZXJPcE1hcCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXN1bHRNYXAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fbGFzdFdvcmtlckluZGV4ID0gMDtcblxuICAgIGNvbnN0IG9ubWVzc2FnZSA9IChldikgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG5cbiAgICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ3Jlc3VsdCcgJiYgdGhpcy5fcmVzdWx0TWFwLmhhcyhtZXNzYWdlLmNhbGxJZCkpIHtcbiAgICAgICAgdGhpcy5fcmVzdWx0TWFwLmdldChtZXNzYWdlLmNhbGxJZCkucmVzb2x2ZShtZXNzYWdlLnJlc3VsdCk7XG4gICAgICB9XG5cbiAgICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ2Vycm9yJyAmJiB0aGlzLl9yZXN1bHRNYXAuaGFzKG1lc3NhZ2UubmFtZSkpIHtcbiAgICAgICAgdGhpcy5fcmVzdWx0TWFwLmdldChtZXNzYWdlLm5hbWUpLnJlamVjdChtZXNzYWdlLmVycik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3Jlc3VsdE1hcC5kZWxldGUobWVzc2FnZS5jYWxsSWQpO1xuICAgIH07XG5cbiAgICBjb25zdCBvbmVycm9yID0gKGVycikgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG4gICAgICBpZih0aGlzLl9yZXN1bHRNYXAuaGFzKG1lc3NhZ2UubmFtZSkpIHtcbiAgICAgICAgdGhpcy5fcmVzdWx0TWFwLmdldChtZXNzYWdlLm5hbWUpLnJlamVjdChlcnIpO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgIHRoaXMuY29yZXMgPSBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLmhhcmR3YXJlQ29uY3VycmVuY3kgfHwgMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29yZXM7IGkrKykge1xuICAgICAgY29uc3Qgd29ya2VyID0gVXRpbHMuYnVpbGRXb3JrZXIoV29ya2VyKTtcbiAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBvbm1lc3NhZ2U7XG4gICAgICB3b3JrZXIub25lcnJvciA9IG9uZXJyb3I7XG5cbiAgICAgIHRoaXMuX3dvcmtlcnMucHVzaCh3b3JrZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgZnVuY3Rpb25zIHRvIHdvcmtlcnMgdG8gY2FsbC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBhc3NpZ24gdG8gd29ya2Vycy5cbiAgICovXG4gIGFkZChmdW5jKSB7XG4gICAgY29uc3QgbmFtZSA9IGZ1bmMubmFtZSB8fCAnaWRfJyArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIwMDAwMCk7XG4gICAgdGhpcy5fY29tcGlsZShuYW1lLCBmdW5jKTtcblxuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuX2NhbGwobmFtZSwgLi4uYXJncyk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIHRoZSByZW1vdGUgZnVuY3Rpb24uXG4gICAqL1xuICBfY2FsbChuYW1lLCAuLi5hcmdzKSB7XG4gICAgbmFtZSA9IG5hbWUubmFtZSB8fCBuYW1lO1xuICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuX3dvcmtlcnNbdGhpcy5fd29ya2VyT3BNYXAuZ2V0KG5hbWUpXTtcbiAgICBjb25zdCBjYWxsSWQgPSAnY2FsbF8nICsgKE1hdGgucmFuZG9tKCkgKiAyMDAwMDApO1xuXG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6J2NhbGwnLFxuICAgICAgYXJnczogYXJncyxcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBjYWxsSWQsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5fcmVzdWx0TWFwLnNldChjYWxsSWQsIHtyZXNvbHZlLCByZWplY3R9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBDb21waWxlIEZ1bmN0aW9uXG4gICAqL1xuICBfY29tcGlsZShuYW1lLCBvcCwgd29ya2VyTnVtID0gMSkge1xuICAgIGlmKHRoaXMuX3dvcmtlck9wTWFwLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICB0eXBlOiAnY29tcGlsZScsXG4gICAgICBmdW5jOiBVdGlscy5mdW5jdGlvblRvTWVzc2FnZShvcCwgbmFtZSksXG4gICAgfTtcblxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB3b3JrZXJOdW07IGkgKyspIHtcbiAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fbGFzdFdvcmtlckluZGV4ICUgdGhpcy5jb3JlcztcbiAgICAgIHRoaXMuX3dvcmtlcnNbaW5kZXhdLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgdGhpcy5fd29ya2VyT3BNYXAuc2V0KG5hbWUsIGluZGV4KTtcblxuICAgICAgdGhpcy5fbGFzdFdvcmtlckluZGV4Kys7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUnVubmFibGU7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9ydW5uYWJsZS5qc1xuLy8gbW9kdWxlIGlkID0gMlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIFV0aWxpdGllcyBmb3IganNydW5uYWJsZVxuICovXG5jbGFzcyBVdGlscyB7XG4gIC8qKlxuICAgKiBTdHJpbmdpZmllcyBhIGZ1bmN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZ1bmMgRnVuY3Rpb24gdG8gc3RyaW5naWZ5LlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9IFN0cmluZ2lmaWVkIGZ1bmN0aW9uLlxuICAgKi9cbiAgc3RhdGljIGZ1bmNUb1N0cmluZyhmdW5jKSB7XG4gICAgbGV0IHN0cmluZ0Z1bmMgPSBmdW5jLnRvU3RyaW5nKCk7XG4gICAgbGV0IG5vQXJnUGFyZW5zID0gc3RyaW5nRnVuYy5pbmRleE9mKCcoJykgPiBzdHJpbmdGdW5jLmluZGV4T2YoJz0+Jyk7XG4gICAgaWYoIXN0cmluZ0Z1bmMuc3RhcnRzV2l0aCgnZnVuY3Rpb24nKSl7XG4gICAgICBpZihub0FyZ1BhcmVucykge1xuICAgICAgICBzdHJpbmdGdW5jID0gJ2Z1bmN0aW9uICgnICsgc3RyaW5nRnVuYy5zdWJzdHJpbmcoMCwgc3RyaW5nRnVuYy5pbmRleE9mKCc9PicpKSArICcpJyArIHN0cmluZ0Z1bmM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHJpbmdGdW5jID0gJ2Z1bmN0aW9uICcgKyBzdHJpbmdGdW5jO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdHJpbmdGdW5jO1xuICB9XG5cbiAgLyoqXG4gICogX2J1aWxkV29ya2VyXG4gICovXG4gIHN0YXRpYyBidWlsZFdvcmtlcih3b3JrZXJGdW5jKSB7XG4gICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbJygnICsgVXRpbHMuZnVuY1RvU3RyaW5nKHdvcmtlckZ1bmMpICsgJykoKSddKTtcbiAgICB2YXIgdXJpID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iLCB7dHlwZTogJ3RleHQvamF2YXNjcmlwdCd9KTtcbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKHVyaSk7XG5cbiAgICByZXR1cm4gd29ya2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIFR1cm4gYSBmdW5jdGlvbiBpbnRvIGFuIG9iamVjdCBmb3Igc2VuZGluZyB0byBhIHdvcmtlci5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gZnVuY1xuICAgKiBAcmV0dXJuIHtPYmplY3R9IEZ1bmN0aW9uIG1lc3NhZ2Ugb2JqZWN0LlxuICAgKi9cbiAgc3RhdGljIGZ1bmN0aW9uVG9NZXNzYWdlKGZ1bmMsIG5hbWUpIHtcbiAgICB2YXIgZnVuY1N0cmluZyA9IFV0aWxzLmZ1bmNUb1N0cmluZyhmdW5jKTtcbiAgICB2YXIgYXJncyA9IGZ1bmNTdHJpbmcuc3Vic3RyaW5nKGZ1bmNTdHJpbmcuaW5kZXhPZignKCcpICsgMSwgZnVuY1N0cmluZy5pbmRleE9mKCcpJykpO1xuICAgIHZhciBib2R5ID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCd7JykgKyAxLCBmdW5jU3RyaW5nLmxhc3RJbmRleE9mKCd9JykpO1xuXG4gICAgaWYoYm9keS5sZW5ndGggPCAxKSB7XG4gICAgICBib2R5ID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCc9PicpICsgMik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IG5hbWUgfHwgZnVuYy5uYW1lLFxuICAgICAgYXJnczogYXJncyxcbiAgICAgIGJvZHk6IGJvZHksXG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWxzO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvdXRpbHMuanNcbi8vIG1vZHVsZSBpZCA9IDNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gICogd29ya2VyXG4gICovXG5mdW5jdGlvbiB3b3JrZXIoKSB7XG4gIGNvbnN0IGZ1bmNNYXAgPSBuZXcgTWFwKCk7XG5cbiAgLyoqXG4gICAqIGdldEZ1bmN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmdW5jU3RyaW5nIFN0cmluZ2lmaWVkIGZ1bmN0aW9uIGZvciB3b3JrZXIgdG8gZXhlY3V0ZS5cbiAgICogQHJldHVybnMge2Z1bmN0aW9ufSBldmFsJ2QgZnVuY3Rpb25cbiAgICovXG4gIGNvbnN0IGdldEZ1bmN0aW9uID0gKGZ1bmNPYmopID0+IHtcbiAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKGZ1bmNPYmouYXJncy5zcGxpdCgnLCcpLCBmdW5jT2JqLmJvZHkpO1xuICB9XG5cbiAgLyoqXG4gICAgICogUG9zdHMgdGhlIHJlc3VsdCBvZiBhIGNhbGxlZCB3b3JrZXIgZnVuY3Rpb24gYmFjayB0byB0aGUgbWFpbiB0aHJlYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge05hbWUgb2YgdGhlIGZ1bmN0aW9uIGNhbGxlZC59IG5hbWUgU3RyaW5nXG4gICAgICogQHBhcmFtIHsqfSByZXN1bHQgVGhlIHJlc3VsdCBvZiB0aGUgZnVuY3Rpb24gY2FsbC5cbiAgICAgKi9cbiAgY29uc3QgcG9zdFJlc3VsdCA9IChtZXNzYWdlLCByZXN1bHQpID0+IHtcbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiAncmVzdWx0JyxcbiAgICAgIG5hbWU6IG1lc3NhZ2UubmFtZSxcbiAgICAgIGNhbGxJZDogbWVzc2FnZS5jYWxsSWQsXG4gICAgICByZXN1bHRcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogUG9zdCBhbiBlcnJvciBiYWNrIHRvIHRoZSBtYWluIHRocmVhZC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgdGhlIG1lc3NhZ2Ugd2hpY2ggY2FsbGVkXG4gICAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gZXJyIFRoZSBlcnJvciB0byBwb3N0IHRvIG1haW4gdGhyZWFkLlxuICAgKi9cbiAgY29uc3QgcG9zdEVycm9yID0gKG1lc3NhZ2UsIGVycikgPT4ge1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICBuYW1lOiBtZXNzYWdlLm5hbWUsXG4gICAgICBjYWxsSWQ6IG1lc3NhZ2UuY2FsbElkLFxuICAgICAgZXJyXG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aGUgZnVuY3Rpb24gZnJvbSB0aGUgbWVzc2FnZSBvYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgTWVzc2FnZSBvYmplY3QgZnJvbSBtYWluIHRocmVhZC5cbiAgICovXG4gIGNvbnN0IGNvbXBpbGUgPSAobWVzc2FnZSkgPT4ge1xuICAgIGZ1bmNNYXAuc2V0KG1lc3NhZ2UuZnVuYy5uYW1lLCBnZXRGdW5jdGlvbihtZXNzYWdlLmZ1bmMpKTtcbiAgfTtcblxuICAvKipcbiAgICogQ2FsbCB0aGUgZnVuY3Rpb24gZnJvbSB0aGUgbWVzc2FnZSBvYmplY3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIE1lc3NhZ2Ugb2JqZWN0IGZyb20gbWFpbiB0aHJlYWQuXG4gICAqL1xuICBjb25zdCBjYWxsID0gKG1lc3NhZ2UpID0+IHtcbiAgICBsZXQgcmVzdWx0O1xuICAgIHRyeSB7XG4gICAgICByZXN1bHQgPSBmdW5jTWFwLmdldChtZXNzYWdlLm5hbWUpKC4uLm1lc3NhZ2UuYXJncyk7XG4gICAgICBwb3N0UmVzdWx0KG1lc3NhZ2UsIHJlc3VsdCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBwb3N0RXJyb3IobWVzc2FnZSwgZXJyKTtcbiAgICB9XG4gIH07XG5cbiAgb25tZXNzYWdlID0gKGV2KSA9PiB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG5cbiAgICBtZXNzYWdlLnR5cGUgPT09ICdjb21waWxlJyA/IGNvbXBpbGUobWVzc2FnZSlcbiAgICAgIDogbWVzc2FnZS50eXBlID09PSAnY2FsbCcgPyBjYWxsKG1lc3NhZ2UpXG4gICAgICAgIDogMDsgLy8gV2h5IGNhbid0IEkgZG8gYSByZXR1cm4gaGVyZT9cbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3b3JrZXI7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy93b3JrZXIuanNcbi8vIG1vZHVsZSBpZCA9IDRcbi8vIG1vZHVsZSBjaHVua3MgPSAwIl0sInNvdXJjZVJvb3QiOiIifQ==