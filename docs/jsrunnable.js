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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgOWU2MjI1OTA1OGVlZTdkYjFjOWEiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydW5uYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3dvcmtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOztBQUVBO0FBQ0E7QUFDQTs7Ozs7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE1BQU07QUFDbkIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0EsbUJBQW1CLGdCQUFnQjtBQUNuQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxhQUFhLFNBQVM7QUFDdEI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQSxtQ0FBbUMsZ0JBQWdCO0FBQ25ELEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE9BQU87QUFDcEIsY0FBYyxPQUFPO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBLGtCQUFrQixlQUFlO0FBQ2pDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOzs7Ozs7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYSxTQUFTO0FBQ3RCLGNBQWMsT0FBTztBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUNBQXlDLHdCQUF3QjtBQUNqRTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QixjQUFjLE9BQU87QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5REFBeUQsaUNBQWlDOztBQUUxRjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7Ozs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE9BQU87QUFDcEIsZUFBZSxTQUFTO0FBQ3hCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsNkJBQTZCO0FBQzVDLGVBQWUsRUFBRTtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE9BQU87QUFDcEIsYUFBYSxjQUFjO0FBQzNCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQSxhQUFhLE9BQU87QUFDcEI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLGFBQWEsT0FBTztBQUNwQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBOztBQUVBIiwiZmlsZSI6ImpzcnVubmFibGUuanM/MDMwNWQ1YWU3Y2E0NmU2NWNmOTUiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMCk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgOWU2MjI1OTA1OGVlZTdkYjFjOWEiLCJjb25zdCBSdW5uYWJsZSA9IHJlcXVpcmUoJy4vcnVubmFibGUnKTtcblxuaWYod2luZG93KSB7XG4gIHdpbmRvdy5SdW5uYWJsZSA9IFJ1bm5hYmxlO1xufVxuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDFcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5jb25zdCBXb3JrZXIgPSByZXF1aXJlKCcuL3dvcmtlcicpO1xuLyoqXG4gKiBSdW5uYWJsZVxuICovXG5jbGFzcyBSdW5uYWJsZSB7XG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0FycmF5fSBmdW5jcyBhcnJheSBvZiBmdW5jdGlvbnMgdG8gcnVuIGluIHdvcmtlcnNcbiAgICogQHJldHVybiB7UnVubmFibGV9XG4gICAqL1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl93b3JrZXJzID0gW107XG4gICAgdGhpcy5fd29ya2VyT3BNYXAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcmVzdWx0TWFwID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX2xhc3RXb3JrZXJJbmRleCA9IDA7XG5cbiAgICBjb25zdCBvbm1lc3NhZ2UgPSAoZXYpID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBldi5kYXRhO1xuXG4gICAgICBpZihtZXNzYWdlLnR5cGUgPT09ICdyZXN1bHQnICYmIHRoaXMuX3Jlc3VsdE1hcC5oYXMobWVzc2FnZS5jYWxsSWQpKSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdE1hcC5nZXQobWVzc2FnZS5jYWxsSWQpLnJlc29sdmUobWVzc2FnZS5yZXN1bHQpO1xuICAgICAgfVxuXG4gICAgICBpZihtZXNzYWdlLnR5cGUgPT09ICdlcnJvcicgJiYgdGhpcy5fcmVzdWx0TWFwLmhhcyhtZXNzYWdlLm5hbWUpKSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdE1hcC5nZXQobWVzc2FnZS5uYW1lKS5yZWplY3QobWVzc2FnZS5lcnIpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9yZXN1bHRNYXAuZGVsZXRlKG1lc3NhZ2UuY2FsbElkKTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25lcnJvciA9IChlcnIpID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBldi5kYXRhO1xuICAgICAgaWYodGhpcy5fcmVzdWx0TWFwLmhhcyhtZXNzYWdlLm5hbWUpKSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdE1hcC5nZXQobWVzc2FnZS5uYW1lKS5yZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB0aGlzLmNvcmVzID0gbmF2aWdhdG9yICYmIG5hdmlnYXRvci5oYXJkd2FyZUNvbmN1cnJlbmN5IHx8IDE7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvcmVzOyBpKyspIHtcbiAgICAgIGNvbnN0IHdvcmtlciA9IFV0aWxzLmJ1aWxkV29ya2VyKFdvcmtlcik7XG4gICAgICB3b3JrZXIub25tZXNzYWdlID0gb25tZXNzYWdlO1xuICAgICAgd29ya2VyLm9uZXJyb3IgPSBvbmVycm9yO1xuXG4gICAgICB0aGlzLl93b3JrZXJzLnB1c2god29ya2VyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkIGZ1bmN0aW9ucyB0byB3b3JrZXJzIHRvIGNhbGwuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgRnVuY3Rpb24gdG8gYXNzaWduIHRvIHdvcmtlcnMuXG4gICAqL1xuICBhZGQoZnVuYywgd29ya2VyTnVtID0gMSkge1xuICAgIGNvbnN0IG5hbWUgPSBmdW5jLm5hbWUgfHwgJ2lkXycgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyMDAwMDApO1xuICAgIHRoaXMuX2NvbXBpbGUobmFtZSwgZnVuYywgd29ya2VyTnVtKTtcblxuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuX2NhbGwobmFtZSwgLi4uYXJncyk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIHRoZSByZW1vdGUgZnVuY3Rpb24uXG4gICAqL1xuICBfY2FsbChuYW1lLCAuLi5hcmdzKSB7XG4gICAgbmFtZSA9IG5hbWUubmFtZSB8fCBuYW1lO1xuICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuX3dvcmtlcnNbdGhpcy5fZ2V0QW5kTW92ZUluZGV4SW5PcE1hcChuYW1lKV07XG4gICAgY29uc3QgY2FsbElkID0gJ2NhbGxfJyArIChNYXRoLnJhbmRvbSgpICogMjAwMDAwKTtcblxuICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOidjYWxsJyxcbiAgICAgIGFyZ3M6IGFyZ3MsXG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgY2FsbElkLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMuX3Jlc3VsdE1hcC5zZXQoY2FsbElkLCB7cmVzb2x2ZSwgcmVqZWN0fSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogIEdldCdzIHRoZSBuZXh0IHdvcmtlciB0byBjYWxsIGluIGEgcm91bmQgcm9iaW4gZmFzaGlvbi4gXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIGZ1bmN0aW9uIHRvIGdldCB3b3JrZXIgbWFwIGZvci5cbiAgICogQHJldHVybiB7TnVtYmVyfSBUaGUgd29ya2VyIGlkIHRvIGNhbGwuXG4gICAqL1xuICBfZ2V0QW5kTW92ZUluZGV4SW5PcE1hcChuYW1lKSB7XG4gICAgY29uc3Qgb3BNYXAgPSB0aGlzLl93b3JrZXJPcE1hcC5nZXQobmFtZSk7XG4gICAgY29uc3Qgd29ya2VySWQgPSBvcE1hcC5wb3AoKTtcbiAgICBvcE1hcC51bnNoaWZ0KHdvcmtlcklkKTtcbiAgICByZXR1cm4gd29ya2VySWQ7XG4gIH1cblxuICAvKipcbiAgICogSW50ZXJuYWwgQ29tcGlsZSBGdW5jdGlvblxuICAgKi9cbiAgX2NvbXBpbGUobmFtZSwgb3AsIHdvcmtlck51bSA9IDEpIHtcbiAgICBpZih0aGlzLl93b3JrZXJPcE1hcC5oYXMobmFtZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBtZXNzYWdlID0ge1xuICAgICAgdHlwZTogJ2NvbXBpbGUnLFxuICAgICAgZnVuYzogVXRpbHMuZnVuY3Rpb25Ub01lc3NhZ2Uob3AsIG5hbWUpLFxuICAgIH07XG5cbiAgICBjb25zdCBvcE1hcCA9IHRoaXMuX3dvcmtlck9wTWFwLmdldChuYW1lKSB8fCBbXTtcblxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB3b3JrZXJOdW07IGkgKyspIHtcbiAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fbGFzdFdvcmtlckluZGV4ICUgdGhpcy5jb3JlcztcbiAgICAgIHRoaXMuX3dvcmtlcnNbaW5kZXhdLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgb3BNYXAucHVzaChpbmRleCk7XG4gICAgICB0aGlzLl9sYXN0V29ya2VySW5kZXgrKztcbiAgICB9XG5cbiAgICB0aGlzLl93b3JrZXJPcE1hcC5zZXQobmFtZSwgb3BNYXApO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUnVubmFibGU7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9ydW5uYWJsZS5qc1xuLy8gbW9kdWxlIGlkID0gMlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIFV0aWxpdGllcyBmb3IganNydW5uYWJsZVxuICovXG5jbGFzcyBVdGlscyB7XG4gIC8qKlxuICAgKiBTdHJpbmdpZmllcyBhIGZ1bmN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZ1bmMgRnVuY3Rpb24gdG8gc3RyaW5naWZ5LlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9IFN0cmluZ2lmaWVkIGZ1bmN0aW9uLlxuICAgKi9cbiAgc3RhdGljIGZ1bmNUb1N0cmluZyhmdW5jKSB7XG4gICAgbGV0IHN0cmluZ0Z1bmMgPSBmdW5jLnRvU3RyaW5nKCk7XG4gICAgbGV0IG5vQXJnUGFyZW5zID0gc3RyaW5nRnVuYy5pbmRleE9mKCcoJykgPiBzdHJpbmdGdW5jLmluZGV4T2YoJz0+Jyk7XG4gICAgaWYoIXN0cmluZ0Z1bmMuc3RhcnRzV2l0aCgnZnVuY3Rpb24nKSl7XG4gICAgICBpZihub0FyZ1BhcmVucykge1xuICAgICAgICBzdHJpbmdGdW5jID0gJ2Z1bmN0aW9uICgnICsgc3RyaW5nRnVuYy5zdWJzdHJpbmcoMCwgc3RyaW5nRnVuYy5pbmRleE9mKCc9PicpKSArICcpJyArIHN0cmluZ0Z1bmM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHJpbmdGdW5jID0gJ2Z1bmN0aW9uICcgKyBzdHJpbmdGdW5jO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdHJpbmdGdW5jO1xuICB9XG5cbiAgLyoqXG4gICogX2J1aWxkV29ya2VyXG4gICovXG4gIHN0YXRpYyBidWlsZFdvcmtlcih3b3JrZXJGdW5jKSB7XG4gICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbJygnICsgVXRpbHMuZnVuY1RvU3RyaW5nKHdvcmtlckZ1bmMpICsgJykoKSddKTtcbiAgICB2YXIgdXJpID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iLCB7dHlwZTogJ3RleHQvamF2YXNjcmlwdCd9KTtcbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKHVyaSk7XG5cbiAgICByZXR1cm4gd29ya2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIFR1cm4gYSBmdW5jdGlvbiBpbnRvIGFuIG9iamVjdCBmb3Igc2VuZGluZyB0byBhIHdvcmtlci5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gZnVuY1xuICAgKiBAcmV0dXJuIHtPYmplY3R9IEZ1bmN0aW9uIG1lc3NhZ2Ugb2JqZWN0LlxuICAgKi9cbiAgc3RhdGljIGZ1bmN0aW9uVG9NZXNzYWdlKGZ1bmMsIG5hbWUpIHtcbiAgICB2YXIgZnVuY1N0cmluZyA9IFV0aWxzLmZ1bmNUb1N0cmluZyhmdW5jKTtcbiAgICB2YXIgYXJncyA9IGZ1bmNTdHJpbmcuc3Vic3RyaW5nKGZ1bmNTdHJpbmcuaW5kZXhPZignKCcpICsgMSwgZnVuY1N0cmluZy5pbmRleE9mKCcpJykpO1xuICAgIHZhciBib2R5ID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCd7JykgKyAxLCBmdW5jU3RyaW5nLmxhc3RJbmRleE9mKCd9JykpO1xuXG4gICAgaWYoYm9keS5sZW5ndGggPCAxKSB7XG4gICAgICBib2R5ID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCc9PicpICsgMik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IG5hbWUgfHwgZnVuYy5uYW1lLFxuICAgICAgYXJnczogYXJncyxcbiAgICAgIGJvZHk6IGJvZHksXG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWxzO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvdXRpbHMuanNcbi8vIG1vZHVsZSBpZCA9IDNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gICogd29ya2VyXG4gICovXG5mdW5jdGlvbiB3b3JrZXIoKSB7XG4gIGNvbnN0IGZ1bmNNYXAgPSBuZXcgTWFwKCk7XG5cbiAgLyoqXG4gICAqIGdldEZ1bmN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmdW5jU3RyaW5nIFN0cmluZ2lmaWVkIGZ1bmN0aW9uIGZvciB3b3JrZXIgdG8gZXhlY3V0ZS5cbiAgICogQHJldHVybnMge2Z1bmN0aW9ufSBldmFsJ2QgZnVuY3Rpb25cbiAgICovXG4gIGNvbnN0IGdldEZ1bmN0aW9uID0gKGZ1bmNPYmopID0+IHtcbiAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKGZ1bmNPYmouYXJncy5zcGxpdCgnLCcpLCBmdW5jT2JqLmJvZHkpO1xuICB9XG5cbiAgLyoqXG4gICAgICogUG9zdHMgdGhlIHJlc3VsdCBvZiBhIGNhbGxlZCB3b3JrZXIgZnVuY3Rpb24gYmFjayB0byB0aGUgbWFpbiB0aHJlYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge05hbWUgb2YgdGhlIGZ1bmN0aW9uIGNhbGxlZC59IG5hbWUgU3RyaW5nXG4gICAgICogQHBhcmFtIHsqfSByZXN1bHQgVGhlIHJlc3VsdCBvZiB0aGUgZnVuY3Rpb24gY2FsbC5cbiAgICAgKi9cbiAgY29uc3QgcG9zdFJlc3VsdCA9IChtZXNzYWdlLCByZXN1bHQpID0+IHtcbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiAncmVzdWx0JyxcbiAgICAgIG5hbWU6IG1lc3NhZ2UubmFtZSxcbiAgICAgIGNhbGxJZDogbWVzc2FnZS5jYWxsSWQsXG4gICAgICByZXN1bHRcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogUG9zdCBhbiBlcnJvciBiYWNrIHRvIHRoZSBtYWluIHRocmVhZC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgdGhlIG1lc3NhZ2Ugd2hpY2ggY2FsbGVkXG4gICAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gZXJyIFRoZSBlcnJvciB0byBwb3N0IHRvIG1haW4gdGhyZWFkLlxuICAgKi9cbiAgY29uc3QgcG9zdEVycm9yID0gKG1lc3NhZ2UsIGVycikgPT4ge1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICBuYW1lOiBtZXNzYWdlLm5hbWUsXG4gICAgICBjYWxsSWQ6IG1lc3NhZ2UuY2FsbElkLFxuICAgICAgZXJyXG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aGUgZnVuY3Rpb24gZnJvbSB0aGUgbWVzc2FnZSBvYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgTWVzc2FnZSBvYmplY3QgZnJvbSBtYWluIHRocmVhZC5cbiAgICovXG4gIGNvbnN0IGNvbXBpbGUgPSAobWVzc2FnZSkgPT4ge1xuICAgIGZ1bmNNYXAuc2V0KG1lc3NhZ2UuZnVuYy5uYW1lLCBnZXRGdW5jdGlvbihtZXNzYWdlLmZ1bmMpKTtcbiAgfTtcblxuICAvKipcbiAgICogQ2FsbCB0aGUgZnVuY3Rpb24gZnJvbSB0aGUgbWVzc2FnZSBvYmplY3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIE1lc3NhZ2Ugb2JqZWN0IGZyb20gbWFpbiB0aHJlYWQuXG4gICAqL1xuICBjb25zdCBjYWxsID0gKG1lc3NhZ2UpID0+IHtcbiAgICBsZXQgcmVzdWx0O1xuICAgIHRyeSB7XG4gICAgICByZXN1bHQgPSBmdW5jTWFwLmdldChtZXNzYWdlLm5hbWUpKC4uLm1lc3NhZ2UuYXJncyk7XG4gICAgICBwb3N0UmVzdWx0KG1lc3NhZ2UsIHJlc3VsdCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBwb3N0RXJyb3IobWVzc2FnZSwgZXJyKTtcbiAgICB9XG4gIH07XG5cbiAgb25tZXNzYWdlID0gKGV2KSA9PiB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG5cbiAgICBtZXNzYWdlLnR5cGUgPT09ICdjb21waWxlJyA/IGNvbXBpbGUobWVzc2FnZSlcbiAgICAgIDogbWVzc2FnZS50eXBlID09PSAnY2FsbCcgPyBjYWxsKG1lc3NhZ2UpXG4gICAgICAgIDogMDsgLy8gV2h5IGNhbid0IEkgZG8gYSByZXR1cm4gaGVyZT9cbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3b3JrZXI7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy93b3JrZXIuanNcbi8vIG1vZHVsZSBpZCA9IDRcbi8vIG1vZHVsZSBjaHVua3MgPSAwIl0sInNvdXJjZVJvb3QiOiIifQ==