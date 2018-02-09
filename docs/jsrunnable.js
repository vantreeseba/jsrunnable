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
  add(func, workerNum = 1) {
    const name = func.name || Utils.randomId('id');
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
    const callId = Utils.randomId('call');

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

    workerNum = workerNum >= 1 ? workerNum : 1;

    const message = {
      type: 'compile',
      func: Utils.functionToMessage(op, name),
    };

    const opMap = this._workerOpMap.get(name) || [];

    for(var i = 0; i < workerNum; i ++) {
      const index = this._lastWorkerIndex % this.cores;
      this._workers[index].postMessage(message);
      if(opMap.indexOf(index) === -1) {
        opMap.push(index);
      }
      this._lastWorkerIndex++;
    }

    this._workerOpMap.set(name, opMap);
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


/***/ }),
/* 4 */
/***/ (function(module, exports) {

/**
  * worker
  */
function worker() {
  const funcMap = new Map();

  /**
   * Posts the result of a called worker function back to the main thread.
   *
   * @param {Object} message Message object for function called. 
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
    const compiled = new Function(message.func.args.split(','), message.func.body);
    funcMap.set(message.func.name, compiled);
  };

  /**
   * Call the function from the message object.
   * @param {Object} message Message object from main thread.
   */
  const call = (message) => {
    try {
      postResult(message, funcMap.get(message.name)(...message.args));
    } catch (err) {
      postError(message, err);
    }
  };

  onmessage = (ev) => {
    const message = ev.data;

    message.type === 'compile' ? compile(message)
      : message.type === 'call' ? call(message)
      : 0;
  };
}

module.exports = worker;


/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgZTU1ZGUxZmM1ZTM5NjFjZTJhNmMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydW5uYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3dvcmtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOztBQUVBO0FBQ0E7QUFDQTs7Ozs7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE1BQU07QUFDbkIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0EsbUJBQW1CLGdCQUFnQjtBQUNuQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxhQUFhLFNBQVM7QUFDdEI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQSxtQ0FBbUMsZ0JBQWdCO0FBQ25ELEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE9BQU87QUFDcEIsY0FBYyxPQUFPO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBLGtCQUFrQixlQUFlO0FBQ2pDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7Ozs7OztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QixjQUFjLE9BQU87QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlDQUF5Qyx3QkFBd0I7QUFDakU7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLFNBQVM7QUFDdEIsY0FBYyxPQUFPO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseURBQXlELGlDQUFpQzs7QUFFMUY7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsT0FBTztBQUNwQixjQUFjLE9BQU87QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7Ozs7OztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsT0FBTztBQUNwQixhQUFhLEVBQUU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE9BQU87QUFDcEIsYUFBYSxjQUFjO0FBQzNCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQSxhQUFhLE9BQU87QUFDcEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsYUFBYSxPQUFPO0FBQ3BCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEiLCJmaWxlIjoianNydW5uYWJsZS5qcz80MDc5MTUwNWNiZDI5NjdmMjljZCIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAwKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCBlNTVkZTFmYzVlMzk2MWNlMmE2YyIsImNvbnN0IFJ1bm5hYmxlID0gcmVxdWlyZSgnLi9ydW5uYWJsZScpO1xuXG5pZih3aW5kb3cpIHtcbiAgd2luZG93LlJ1bm5hYmxlID0gUnVubmFibGU7XG59XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gMVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbmNvbnN0IFdvcmtlciA9IHJlcXVpcmUoJy4vd29ya2VyJyk7XG4vKipcbiAqIFJ1bm5hYmxlXG4gKi9cbmNsYXNzIFJ1bm5hYmxlIHtcbiAgLyoqXG4gICAqIENvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7QXJyYXl9IGZ1bmNzIGFycmF5IG9mIGZ1bmN0aW9ucyB0byBydW4gaW4gd29ya2Vyc1xuICAgKiBAcmV0dXJuIHtSdW5uYWJsZX1cbiAgICovXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX3dvcmtlcnMgPSBbXTtcbiAgICB0aGlzLl93b3JrZXJPcE1hcCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXN1bHRNYXAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fbGFzdFdvcmtlckluZGV4ID0gMDtcblxuICAgIGNvbnN0IG9ubWVzc2FnZSA9IChldikgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG5cbiAgICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ3Jlc3VsdCcgJiYgdGhpcy5fcmVzdWx0TWFwLmhhcyhtZXNzYWdlLmNhbGxJZCkpIHtcbiAgICAgICAgdGhpcy5fcmVzdWx0TWFwLmdldChtZXNzYWdlLmNhbGxJZCkucmVzb2x2ZShtZXNzYWdlLnJlc3VsdCk7XG4gICAgICB9XG5cbiAgICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ2Vycm9yJyAmJiB0aGlzLl9yZXN1bHRNYXAuaGFzKG1lc3NhZ2UubmFtZSkpIHtcbiAgICAgICAgdGhpcy5fcmVzdWx0TWFwLmdldChtZXNzYWdlLm5hbWUpLnJlamVjdChtZXNzYWdlLmVycik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3Jlc3VsdE1hcC5kZWxldGUobWVzc2FnZS5jYWxsSWQpO1xuICAgIH07XG5cbiAgICBjb25zdCBvbmVycm9yID0gKGVycikgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG4gICAgICBpZih0aGlzLl9yZXN1bHRNYXAuaGFzKG1lc3NhZ2UubmFtZSkpIHtcbiAgICAgICAgdGhpcy5fcmVzdWx0TWFwLmdldChtZXNzYWdlLm5hbWUpLnJlamVjdChlcnIpO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgIHRoaXMuY29yZXMgPSBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLmhhcmR3YXJlQ29uY3VycmVuY3kgfHwgMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29yZXM7IGkrKykge1xuICAgICAgY29uc3Qgd29ya2VyID0gVXRpbHMuYnVpbGRXb3JrZXIoV29ya2VyKTtcbiAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBvbm1lc3NhZ2U7XG4gICAgICB3b3JrZXIub25lcnJvciA9IG9uZXJyb3I7XG5cbiAgICAgIHRoaXMuX3dvcmtlcnMucHVzaCh3b3JrZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgZnVuY3Rpb25zIHRvIHdvcmtlcnMgdG8gY2FsbC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBhc3NpZ24gdG8gd29ya2Vycy5cbiAgICovXG4gIGFkZChmdW5jLCB3b3JrZXJOdW0gPSAxKSB7XG4gICAgY29uc3QgbmFtZSA9IGZ1bmMubmFtZSB8fCBVdGlscy5yYW5kb21JZCgnaWQnKTtcbiAgICB0aGlzLl9jb21waWxlKG5hbWUsIGZ1bmMsIHdvcmtlck51bSk7XG5cbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLl9jYWxsKG5hbWUsIC4uLmFyZ3MpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB0aGUgcmVtb3RlIGZ1bmN0aW9uLlxuICAgKi9cbiAgX2NhbGwobmFtZSwgLi4uYXJncykge1xuICAgIG5hbWUgPSBuYW1lLm5hbWUgfHwgbmFtZTtcbiAgICBjb25zdCB3b3JrZXIgPSB0aGlzLl93b3JrZXJzW3RoaXMuX2dldEFuZE1vdmVJbmRleEluT3BNYXAobmFtZSldO1xuICAgIGNvbnN0IGNhbGxJZCA9IFV0aWxzLnJhbmRvbUlkKCdjYWxsJyk7XG5cbiAgICB3b3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTonY2FsbCcsXG4gICAgICBhcmdzOiBhcmdzLFxuICAgICAgbmFtZTogbmFtZSxcbiAgICAgIGNhbGxJZCxcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLl9yZXN1bHRNYXAuc2V0KGNhbGxJZCwge3Jlc29sdmUsIHJlamVjdH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqICBHZXQncyB0aGUgbmV4dCB3b3JrZXIgdG8gY2FsbCBpbiBhIHJvdW5kIHJvYmluIGZhc2hpb24uIFxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBmdW5jdGlvbiB0byBnZXQgd29ya2VyIG1hcCBmb3IuXG4gICAqIEByZXR1cm4ge051bWJlcn0gVGhlIHdvcmtlciBpZCB0byBjYWxsLlxuICAgKi9cbiAgX2dldEFuZE1vdmVJbmRleEluT3BNYXAobmFtZSkge1xuICAgIGNvbnN0IG9wTWFwID0gdGhpcy5fd29ya2VyT3BNYXAuZ2V0KG5hbWUpO1xuICAgIGNvbnN0IHdvcmtlcklkID0gb3BNYXAucG9wKCk7XG4gICAgb3BNYXAudW5zaGlmdCh3b3JrZXJJZCk7XG4gICAgcmV0dXJuIHdvcmtlcklkO1xuICB9XG5cbiAgLyoqXG4gICAqIEludGVybmFsIENvbXBpbGUgRnVuY3Rpb25cbiAgICovXG4gIF9jb21waWxlKG5hbWUsIG9wLCB3b3JrZXJOdW0gPSAxKSB7XG4gICAgaWYodGhpcy5fd29ya2VyT3BNYXAuaGFzKG5hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgd29ya2VyTnVtID0gd29ya2VyTnVtID49IDEgPyB3b3JrZXJOdW0gOiAxO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgIHR5cGU6ICdjb21waWxlJyxcbiAgICAgIGZ1bmM6IFV0aWxzLmZ1bmN0aW9uVG9NZXNzYWdlKG9wLCBuYW1lKSxcbiAgICB9O1xuXG4gICAgY29uc3Qgb3BNYXAgPSB0aGlzLl93b3JrZXJPcE1hcC5nZXQobmFtZSkgfHwgW107XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgd29ya2VyTnVtOyBpICsrKSB7XG4gICAgICBjb25zdCBpbmRleCA9IHRoaXMuX2xhc3RXb3JrZXJJbmRleCAlIHRoaXMuY29yZXM7XG4gICAgICB0aGlzLl93b3JrZXJzW2luZGV4XS5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgIGlmKG9wTWFwLmluZGV4T2YoaW5kZXgpID09PSAtMSkge1xuICAgICAgICBvcE1hcC5wdXNoKGluZGV4KTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2xhc3RXb3JrZXJJbmRleCsrO1xuICAgIH1cblxuICAgIHRoaXMuX3dvcmtlck9wTWFwLnNldChuYW1lLCBvcE1hcCk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSdW5uYWJsZTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL3J1bm5hYmxlLmpzXG4vLyBtb2R1bGUgaWQgPSAyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogVXRpbGl0aWVzIGZvciBqc3J1bm5hYmxlXG4gKi9cbmNsYXNzIFV0aWxzIHtcbiAgLyoqXG4gICAqIFN0cmluZ2lmaWVzIGEgZnVuY3Rpb25cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBzdHJpbmdpZnkuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5naWZpZWQgZnVuY3Rpb24uXG4gICAqL1xuICBzdGF0aWMgZnVuY1RvU3RyaW5nKGZ1bmMpIHtcbiAgICBsZXQgc3RyaW5nRnVuYyA9IGZ1bmMudG9TdHJpbmcoKTtcbiAgICBsZXQgbm9BcmdQYXJlbnMgPSBzdHJpbmdGdW5jLmluZGV4T2YoJygnKSA+IHN0cmluZ0Z1bmMuaW5kZXhPZignPT4nKTtcbiAgICBpZighc3RyaW5nRnVuYy5zdGFydHNXaXRoKCdmdW5jdGlvbicpKXtcbiAgICAgIGlmKG5vQXJnUGFyZW5zKSB7XG4gICAgICAgIHN0cmluZ0Z1bmMgPSAnZnVuY3Rpb24gKCcgKyBzdHJpbmdGdW5jLnN1YnN0cmluZygwLCBzdHJpbmdGdW5jLmluZGV4T2YoJz0+JykpICsgJyknICsgc3RyaW5nRnVuYztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0cmluZ0Z1bmMgPSAnZnVuY3Rpb24gJyArIHN0cmluZ0Z1bmM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cmluZ0Z1bmM7XG4gIH1cblxuICAvKipcbiAgKiBfYnVpbGRXb3JrZXJcbiAgKi9cbiAgc3RhdGljIGJ1aWxkV29ya2VyKHdvcmtlckZ1bmMpIHtcbiAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFsnKCcgKyBVdGlscy5mdW5jVG9TdHJpbmcod29ya2VyRnVuYykgKyAnKSgpJ10pO1xuICAgIHZhciB1cmkgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IsIHt0eXBlOiAndGV4dC9qYXZhc2NyaXB0J30pO1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIodXJpKTtcblxuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cblxuICAvKipcbiAgICogVHVybiBhIGZ1bmN0aW9uIGludG8gYW4gb2JqZWN0IGZvciBzZW5kaW5nIHRvIGEgd29ya2VyLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmdW5jXG4gICAqIEByZXR1cm4ge09iamVjdH0gRnVuY3Rpb24gbWVzc2FnZSBvYmplY3QuXG4gICAqL1xuICBzdGF0aWMgZnVuY3Rpb25Ub01lc3NhZ2UoZnVuYywgbmFtZSkge1xuICAgIHZhciBmdW5jU3RyaW5nID0gVXRpbHMuZnVuY1RvU3RyaW5nKGZ1bmMpO1xuICAgIHZhciBhcmdzID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCcoJykgKyAxLCBmdW5jU3RyaW5nLmluZGV4T2YoJyknKSk7XG4gICAgdmFyIGJvZHkgPSBmdW5jU3RyaW5nLnN1YnN0cmluZyhmdW5jU3RyaW5nLmluZGV4T2YoJ3snKSArIDEsIGZ1bmNTdHJpbmcubGFzdEluZGV4T2YoJ30nKSk7XG5cbiAgICBpZihib2R5Lmxlbmd0aCA8IDEpIHtcbiAgICAgIGJvZHkgPSBmdW5jU3RyaW5nLnN1YnN0cmluZyhmdW5jU3RyaW5nLmluZGV4T2YoJz0+JykgKyAyKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogbmFtZSB8fCBmdW5jLm5hbWUsXG4gICAgICBhcmdzOiBhcmdzLFxuICAgICAgYm9keTogYm9keSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSByYW5kb20gaWQuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHByZWZpeCBBIHN0cmluZyB0byBwcmVmaXggdGhlIGlkIHdpdGguXG4gICAqIEByZXR1cm4ge1N0cmluZ30gQSBzdHJpbmcgaWQuXG4gICAqL1xuICBzdGF0aWMgcmFuZG9tSWQocHJlZml4ID0gJycpIHtcbiAgICByZXR1cm4gcHJlZml4ICsgJ18nICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogRGF0ZS5ub3coKSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBVdGlscztcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL3V0aWxzLmpzXG4vLyBtb2R1bGUgaWQgPSAzXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICAqIHdvcmtlclxuICAqL1xuZnVuY3Rpb24gd29ya2VyKCkge1xuICBjb25zdCBmdW5jTWFwID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiBQb3N0cyB0aGUgcmVzdWx0IG9mIGEgY2FsbGVkIHdvcmtlciBmdW5jdGlvbiBiYWNrIHRvIHRoZSBtYWluIHRocmVhZC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgTWVzc2FnZSBvYmplY3QgZm9yIGZ1bmN0aW9uIGNhbGxlZC4gXG4gICAqIEBwYXJhbSB7Kn0gcmVzdWx0IFRoZSByZXN1bHQgb2YgdGhlIGZ1bmN0aW9uIGNhbGwuXG4gICAqL1xuICBjb25zdCBwb3N0UmVzdWx0ID0gKG1lc3NhZ2UsIHJlc3VsdCkgPT4ge1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdyZXN1bHQnLFxuICAgICAgbmFtZTogbWVzc2FnZS5uYW1lLFxuICAgICAgY2FsbElkOiBtZXNzYWdlLmNhbGxJZCxcbiAgICAgIHJlc3VsdFxuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBQb3N0IGFuIGVycm9yIGJhY2sgdG8gdGhlIG1haW4gdGhyZWFkLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSB0aGUgbWVzc2FnZSB3aGljaCBjYWxsZWRcbiAgICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBlcnIgVGhlIGVycm9yIHRvIHBvc3QgdG8gbWFpbiB0aHJlYWQuXG4gICAqL1xuICBjb25zdCBwb3N0RXJyb3IgPSAobWVzc2FnZSwgZXJyKSA9PiB7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIG5hbWU6IG1lc3NhZ2UubmFtZSxcbiAgICAgIGNhbGxJZDogbWVzc2FnZS5jYWxsSWQsXG4gICAgICBlcnJcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBmdW5jdGlvbiBmcm9tIHRoZSBtZXNzYWdlIG9iamVjdFxuICAgKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSBNZXNzYWdlIG9iamVjdCBmcm9tIG1haW4gdGhyZWFkLlxuICAgKi9cbiAgY29uc3QgY29tcGlsZSA9IChtZXNzYWdlKSA9PiB7XG4gICAgY29uc3QgY29tcGlsZWQgPSBuZXcgRnVuY3Rpb24obWVzc2FnZS5mdW5jLmFyZ3Muc3BsaXQoJywnKSwgbWVzc2FnZS5mdW5jLmJvZHkpO1xuICAgIGZ1bmNNYXAuc2V0KG1lc3NhZ2UuZnVuYy5uYW1lLCBjb21waWxlZCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGwgdGhlIGZ1bmN0aW9uIGZyb20gdGhlIG1lc3NhZ2Ugb2JqZWN0LlxuICAgKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSBNZXNzYWdlIG9iamVjdCBmcm9tIG1haW4gdGhyZWFkLlxuICAgKi9cbiAgY29uc3QgY2FsbCA9IChtZXNzYWdlKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHBvc3RSZXN1bHQobWVzc2FnZSwgZnVuY01hcC5nZXQobWVzc2FnZS5uYW1lKSguLi5tZXNzYWdlLmFyZ3MpKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHBvc3RFcnJvcihtZXNzYWdlLCBlcnIpO1xuICAgIH1cbiAgfTtcblxuICBvbm1lc3NhZ2UgPSAoZXYpID0+IHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXYuZGF0YTtcblxuICAgIG1lc3NhZ2UudHlwZSA9PT0gJ2NvbXBpbGUnID8gY29tcGlsZShtZXNzYWdlKVxuICAgICAgOiBtZXNzYWdlLnR5cGUgPT09ICdjYWxsJyA/IGNhbGwobWVzc2FnZSlcbiAgICAgIDogMDtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3b3JrZXI7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy93b3JrZXIuanNcbi8vIG1vZHVsZSBpZCA9IDRcbi8vIG1vZHVsZSBjaHVua3MgPSAwIl0sInNvdXJjZVJvb3QiOiIifQ==