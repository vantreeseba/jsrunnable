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

      if(message.type === 'result' && this._resultMap.has(message.name)) {
        this._resultMap.get(message.name).resolve(message.result);
      }

      if(message.type === 'error' && this._resultMap.has(message.name)) {
        this._resultMap.get(message.name).reject(message.err);
      }
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

    worker.postMessage({
      type:'call',
      args: args,
      name: name
    });

    return new Promise((resolve, reject) => {
      this._resultMap.set(name, {resolve, reject});
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
    if(!stringFunc.startsWith('function')){
      stringFunc = 'function ' + stringFunc;
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
  function postResult(name, result) {
    postMessage({
      type: 'result',
      name,
      result
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
        postResult(message.name, result);
      } catch (err) {
        postMessage({type: 'error', name: message.name, err});
      }
    }
  };
}

module.exports = worker;


/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgODJmNWE5YTJiZmVhNzM2M2QxNDEiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydW5uYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3dvcmtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOztBQUVBO0FBQ0E7QUFDQTs7Ozs7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE1BQU07QUFDbkIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQSxtQkFBbUIsZ0JBQWdCO0FBQ25DO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQSxpQ0FBaUMsZ0JBQWdCO0FBQ2pELEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOzs7Ozs7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYSxTQUFTO0FBQ3RCLGNBQWMsT0FBTztBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUNBQXlDLHdCQUF3QjtBQUNqRTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QixjQUFjLE9BQU87QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5REFBeUQsaUNBQWlDOztBQUUxRjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE9BQU87QUFDcEIsZUFBZSxTQUFTO0FBQ3hCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsNkJBQTZCO0FBQzVDLGVBQWUsRUFBRTtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxxQkFBcUIsdUNBQXVDO0FBQzVEO0FBQ0E7QUFDQTtBQUNBOztBQUVBIiwiZmlsZSI6ImpzcnVubmFibGUuanM/NTlkOTE0YTE4YmViMDViMTJjYzYiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMCk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgODJmNWE5YTJiZmVhNzM2M2QxNDEiLCJjb25zdCBSdW5uYWJsZSA9IHJlcXVpcmUoJy4vcnVubmFibGUnKTtcblxuaWYod2luZG93KSB7XG4gIHdpbmRvdy5SdW5uYWJsZSA9IFJ1bm5hYmxlO1xufVxuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDFcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5jb25zdCBXb3JrZXIgPSByZXF1aXJlKCcuL3dvcmtlcicpO1xuLyoqXG4gKiBSdW5uYWJsZVxuICovXG5jbGFzcyBSdW5uYWJsZSB7XG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0FycmF5fSBmdW5jcyBhcnJheSBvZiBmdW5jdGlvbnMgdG8gcnVuIGluIHdvcmtlcnNcbiAgICogQHJldHVybiB7UnVubmFibGV9XG4gICAqL1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9vcHMgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fd29ya2VycyA9IFtdO1xuICAgIHRoaXMuX3dvcmtlck9wTWFwID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3Jlc3VsdE1hcCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9sYXN0V29ya2VySW5kZXggPSAwO1xuXG4gICAgY29uc3Qgb25tZXNzYWdlID0gKGV2KSA9PiB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXYuZGF0YTtcblxuICAgICAgaWYobWVzc2FnZS50eXBlID09PSAncmVzdWx0JyAmJiB0aGlzLl9yZXN1bHRNYXAuaGFzKG1lc3NhZ2UubmFtZSkpIHtcbiAgICAgICAgdGhpcy5fcmVzdWx0TWFwLmdldChtZXNzYWdlLm5hbWUpLnJlc29sdmUobWVzc2FnZS5yZXN1bHQpO1xuICAgICAgfVxuXG4gICAgICBpZihtZXNzYWdlLnR5cGUgPT09ICdlcnJvcicgJiYgdGhpcy5fcmVzdWx0TWFwLmhhcyhtZXNzYWdlLm5hbWUpKSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdE1hcC5nZXQobWVzc2FnZS5uYW1lKS5yZWplY3QobWVzc2FnZS5lcnIpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBvbmVycm9yID0gKGVycikgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG4gICAgICBpZih0aGlzLl9yZXN1bHRNYXAuaGFzKG1lc3NhZ2UubmFtZSkpIHtcbiAgICAgICAgdGhpcy5fcmVzdWx0TWFwLmdldChtZXNzYWdlLm5hbWUpLnJlamVjdChlcnIpO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgIHRoaXMuY29yZXMgPSBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLmhhcmR3YXJlQ29uY3VycmVuY3kgfHwgMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29yZXM7IGkrKykge1xuICAgICAgY29uc3Qgd29ya2VyID0gVXRpbHMuYnVpbGRXb3JrZXIoV29ya2VyKTtcbiAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBvbm1lc3NhZ2U7XG4gICAgICB3b3JrZXIub25lcnJvciA9IG9uZXJyb3I7XG5cbiAgICAgIHRoaXMuX3dvcmtlcnMucHVzaCh3b3JrZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgZnVuY3Rpb25zIHRvIHdvcmtlcnMgdG8gY2FsbC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBhc3NpZ24gdG8gd29ya2Vycy5cbiAgICovXG4gIGFkZChmdW5jKSB7XG4gICAgY29uc3QgbmFtZSA9IGZ1bmMubmFtZSB8fCAnaWRfJyArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIwMDAwMCk7XG4gICAgdGhpcy5fb3BzLnNldChuYW1lLCBmdW5jKTtcbiAgICB0aGlzLl9jb21waWxlKG5hbWUsIGZ1bmMpO1xuXG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5fY2FsbChuYW1lLCAuLi5hcmdzKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgdGhlIHJlbW90ZSBmdW5jdGlvbi5cbiAgICovXG4gIF9jYWxsKG5hbWUsIC4uLmFyZ3MpIHtcbiAgICBuYW1lID0gbmFtZS5uYW1lIHx8IG5hbWU7XG4gICAgY29uc3Qgd29ya2VyID0gdGhpcy5fd29ya2Vyc1t0aGlzLl93b3JrZXJPcE1hcC5nZXQobmFtZSldO1xuXG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6J2NhbGwnLFxuICAgICAgYXJnczogYXJncyxcbiAgICAgIG5hbWU6IG5hbWVcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLl9yZXN1bHRNYXAuc2V0KG5hbWUsIHtyZXNvbHZlLCByZWplY3R9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBDb21waWxlIEZ1bmN0aW9uXG4gICAqL1xuICBfY29tcGlsZShuYW1lLCBvcCkge1xuICAgIGlmKHRoaXMuX3dvcmtlck9wTWFwLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICB0eXBlOiAnY29tcGlsZScsXG4gICAgICBmdW5jOiBVdGlscy5mdW5jdGlvblRvTWVzc2FnZShvcCwgbmFtZSksXG4gICAgfTtcblxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fbGFzdFdvcmtlckluZGV4ICUgdGhpcy5jb3JlcztcbiAgICB0aGlzLl93b3JrZXJzW2luZGV4XS5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICB0aGlzLl93b3JrZXJPcE1hcC5zZXQobmFtZSwgaW5kZXgpO1xuXG4gICAgdGhpcy5fbGFzdFdvcmtlckluZGV4Kys7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSdW5uYWJsZTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL3J1bm5hYmxlLmpzXG4vLyBtb2R1bGUgaWQgPSAyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogVXRpbGl0aWVzIGZvciBqc3J1bm5hYmxlXG4gKi9cbmNsYXNzIFV0aWxzIHtcbiAgLyoqXG4gICAqIFN0cmluZ2lmaWVzIGEgZnVuY3Rpb25cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBzdHJpbmdpZnkuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5naWZpZWQgZnVuY3Rpb24uXG4gICAqL1xuICBzdGF0aWMgZnVuY1RvU3RyaW5nKGZ1bmMpIHtcbiAgICBsZXQgc3RyaW5nRnVuYyA9IGZ1bmMudG9TdHJpbmcoKTtcbiAgICBpZighc3RyaW5nRnVuYy5zdGFydHNXaXRoKCdmdW5jdGlvbicpKXtcbiAgICAgIHN0cmluZ0Z1bmMgPSAnZnVuY3Rpb24gJyArIHN0cmluZ0Z1bmM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cmluZ0Z1bmM7XG4gIH1cblxuICAvKipcbiAgKiBfYnVpbGRXb3JrZXJcbiAgKi9cbiAgc3RhdGljIGJ1aWxkV29ya2VyKHdvcmtlckZ1bmMpIHtcbiAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFsnKCcgKyBVdGlscy5mdW5jVG9TdHJpbmcod29ya2VyRnVuYykgKyAnKSgpJ10pO1xuICAgIHZhciB1cmkgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IsIHt0eXBlOiAndGV4dC9qYXZhc2NyaXB0J30pO1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIodXJpKTtcblxuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cblxuICAvKipcbiAgICogVHVybiBhIGZ1bmN0aW9uIGludG8gYW4gb2JqZWN0IGZvciBzZW5kaW5nIHRvIGEgd29ya2VyLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmdW5jXG4gICAqIEByZXR1cm4ge09iamVjdH0gRnVuY3Rpb24gbWVzc2FnZSBvYmplY3QuXG4gICAqL1xuICBzdGF0aWMgZnVuY3Rpb25Ub01lc3NhZ2UoZnVuYywgbmFtZSkge1xuICAgIHZhciBmdW5jU3RyaW5nID0gVXRpbHMuZnVuY1RvU3RyaW5nKGZ1bmMpO1xuICAgIHZhciBhcmdzID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCcoJykgKyAxLCBmdW5jU3RyaW5nLmluZGV4T2YoJyknKSk7XG4gICAgdmFyIGJvZHkgPSBmdW5jU3RyaW5nLnN1YnN0cmluZyhmdW5jU3RyaW5nLmluZGV4T2YoJ3snKSArIDEsIGZ1bmNTdHJpbmcubGFzdEluZGV4T2YoJ30nKSk7XG5cbiAgICBpZihib2R5Lmxlbmd0aCA8IDEpIHtcbiAgICAgIGJvZHkgPSBmdW5jU3RyaW5nLnN1YnN0cmluZyhmdW5jU3RyaW5nLmluZGV4T2YoJz0+JykgKyAyKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogbmFtZSB8fCBmdW5jLm5hbWUsXG4gICAgICBhcmdzOiBhcmdzLFxuICAgICAgYm9keTogYm9keSxcbiAgICB9O1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbHM7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy91dGlscy5qc1xuLy8gbW9kdWxlIGlkID0gM1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAgKiB3b3JrZXJcbiAgKi9cbmZ1bmN0aW9uIHdvcmtlcigpIHtcbiAgLyoqXG4gICAqIGdldEZ1bmN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmdW5jU3RyaW5nIFN0cmluZ2lmaWVkIGZ1bmN0aW9uIGZvciB3b3JrZXIgdG8gZXhlY3V0ZS5cbiAgICogQHJldHVybnMge2Z1bmN0aW9ufSBldmFsJ2QgZnVuY3Rpb25cbiAgICovXG4gIGZ1bmN0aW9uIGdldEZ1bmN0aW9uKGZ1bmNPYmopIHtcbiAgICBsZXQgZm9vID0gbmV3IEZ1bmN0aW9uKGZ1bmNPYmouYXJncy5zcGxpdCgnLCcpLCBmdW5jT2JqLmJvZHkpO1xuXG4gICAgcmV0dXJuIGZvbztcbiAgfVxuXG4gIC8qKlxuICAgICAqIFBvc3RzIHRoZSByZXN1bHQgb2YgYSBjYWxsZWQgd29ya2VyIGZ1bmN0aW9uIGJhY2sgdG8gdGhlIG1haW4gdGhyZWFkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtOYW1lIG9mIHRoZSBmdW5jdGlvbiBjYWxsZWQufSBuYW1lIFN0cmluZ1xuICAgICAqIEBwYXJhbSB7Kn0gcmVzdWx0IFRoZSByZXN1bHQgb2YgdGhlIGZ1bmN0aW9uIGNhbGwuXG4gICAgICovXG4gIGZ1bmN0aW9uIHBvc3RSZXN1bHQobmFtZSwgcmVzdWx0KSB7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ3Jlc3VsdCcsXG4gICAgICBuYW1lLFxuICAgICAgcmVzdWx0XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBmdW5jTWFwID0gbmV3IE1hcCgpO1xuXG4gIHRoaXMub25tZXNzYWdlID0gZnVuY3Rpb24gb25tZXNzYWdlKGV2KSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG5cbiAgICBpZihtZXNzYWdlLnR5cGUgPT09ICdjb21waWxlJykge1xuICAgICAgZnVuY01hcC5zZXQobWVzc2FnZS5mdW5jLm5hbWUsIGdldEZ1bmN0aW9uKG1lc3NhZ2UuZnVuYykpO1xuICAgIH1cblxuICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ2NhbGwnKSB7XG4gICAgICBsZXQgcmVzdWx0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gZnVuY01hcC5nZXQobWVzc2FnZS5uYW1lKSguLi5tZXNzYWdlLmFyZ3MpO1xuICAgICAgICBwb3N0UmVzdWx0KG1lc3NhZ2UubmFtZSwgcmVzdWx0KTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBwb3N0TWVzc2FnZSh7dHlwZTogJ2Vycm9yJywgbmFtZTogbWVzc2FnZS5uYW1lLCBlcnJ9KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd29ya2VyO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvd29ya2VyLmpzXG4vLyBtb2R1bGUgaWQgPSA0XG4vLyBtb2R1bGUgY2h1bmtzID0gMCJdLCJzb3VyY2VSb290IjoiIn0=