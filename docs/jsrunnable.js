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
    this._lastWorkerIndex = 0;

    this.cores = navigator && navigator.hardwareConcurrency || 1;
    for (var i = 0; i < this.cores; i++) {
      const worker = Utils.buildWorker(Worker);
      worker.onmessage = function(ev) {
        console.log(ev.data);
      }
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
    self.postMessage({
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
      postResult(message.name, funcMap.get(message.name)(...message.args));
    }
  };
}

module.exports = worker;


/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNGRjOGY2NzkxN2I0ODNjMTRhMjkiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydW5uYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3dvcmtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOztBQUVBO0FBQ0E7QUFDQTs7Ozs7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE1BQU07QUFDbkIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLG1CQUFtQixnQkFBZ0I7QUFDbkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOzs7Ozs7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYSxTQUFTO0FBQ3RCLGNBQWMsT0FBTztBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUNBQXlDLHdCQUF3QjtBQUNqRTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QixjQUFjLE9BQU87QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5REFBeUQsaUNBQWlDOztBQUUxRjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE9BQU87QUFDcEIsZUFBZSxTQUFTO0FBQ3hCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsNkJBQTZCO0FBQzVDLGVBQWUsRUFBRTtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEiLCJmaWxlIjoianNydW5uYWJsZS5qcz84ZGE1MDA2YTFhMzAzNDhiOWEzNyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAwKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCA0ZGM4ZjY3OTE3YjQ4M2MxNGEyOSIsImNvbnN0IFJ1bm5hYmxlID0gcmVxdWlyZSgnLi9ydW5uYWJsZScpO1xuXG5pZih3aW5kb3cpIHtcbiAgd2luZG93LlJ1bm5hYmxlID0gUnVubmFibGU7XG59XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gMVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbmNvbnN0IFdvcmtlciA9IHJlcXVpcmUoJy4vd29ya2VyJyk7XG4vKipcbiAqIFJ1bm5hYmxlXG4gKi9cbmNsYXNzIFJ1bm5hYmxlIHtcbiAgLyoqXG4gICAqIENvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7QXJyYXl9IGZ1bmNzIGFycmF5IG9mIGZ1bmN0aW9ucyB0byBydW4gaW4gd29ya2Vyc1xuICAgKiBAcmV0dXJuIHtSdW5uYWJsZX1cbiAgICovXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX29wcyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl93b3JrZXJzID0gW107XG4gICAgdGhpcy5fd29ya2VyT3BNYXAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fbGFzdFdvcmtlckluZGV4ID0gMDtcblxuICAgIHRoaXMuY29yZXMgPSBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLmhhcmR3YXJlQ29uY3VycmVuY3kgfHwgMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29yZXM7IGkrKykge1xuICAgICAgY29uc3Qgd29ya2VyID0gVXRpbHMuYnVpbGRXb3JrZXIoV29ya2VyKTtcbiAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldikge1xuICAgICAgICBjb25zb2xlLmxvZyhldi5kYXRhKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3dvcmtlcnMucHVzaCh3b3JrZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgZnVuY3Rpb25zIHRvIHdvcmtlcnMgdG8gY2FsbC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBhc3NpZ24gdG8gd29ya2Vycy5cbiAgICovXG4gIGFkZChmdW5jKSB7XG4gICAgY29uc3QgbmFtZSA9IGZ1bmMubmFtZSB8fCAnaWRfJyArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIwMDAwMCk7XG4gICAgdGhpcy5fb3BzLnNldChuYW1lLCBmdW5jKTtcbiAgICB0aGlzLl9jb21waWxlKG5hbWUsIGZ1bmMpO1xuXG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICB0aGlzLl9jYWxsKG5hbWUsIC4uLmFyZ3MpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB0aGUgcmVtb3RlIGZ1bmN0aW9uLlxuICAgKi9cbiAgX2NhbGwobmFtZSwgLi4uYXJncykge1xuICAgIG5hbWUgPSBuYW1lLm5hbWUgfHwgbmFtZTtcbiAgICBjb25zdCB3b3JrZXIgPSB0aGlzLl93b3JrZXJzW3RoaXMuX3dvcmtlck9wTWFwLmdldChuYW1lKV07XG5cbiAgICB3b3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTonY2FsbCcsXG4gICAgICBhcmdzOiBhcmdzLFxuICAgICAgbmFtZTogbmFtZVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEludGVybmFsIENvbXBpbGUgRnVuY3Rpb25cbiAgICovXG4gIF9jb21waWxlKG5hbWUsIG9wKSB7XG4gICAgaWYodGhpcy5fd29ya2VyT3BNYXAuaGFzKG5hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgIHR5cGU6ICdjb21waWxlJyxcbiAgICAgIGZ1bmM6IFV0aWxzLmZ1bmN0aW9uVG9NZXNzYWdlKG9wLCBuYW1lKSxcbiAgICB9O1xuXG4gICAgY29uc3QgaW5kZXggPSB0aGlzLl9sYXN0V29ya2VySW5kZXggJSB0aGlzLmNvcmVzO1xuICAgIHRoaXMuX3dvcmtlcnNbaW5kZXhdLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgIHRoaXMuX3dvcmtlck9wTWFwLnNldChuYW1lLCBpbmRleCk7XG5cbiAgICB0aGlzLl9sYXN0V29ya2VySW5kZXgrKztcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJ1bm5hYmxlO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvcnVubmFibGUuanNcbi8vIG1vZHVsZSBpZCA9IDJcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBVdGlsaXRpZXMgZm9yIGpzcnVubmFibGVcbiAqL1xuY2xhc3MgVXRpbHMge1xuICAvKipcbiAgICogU3RyaW5naWZpZXMgYSBmdW5jdGlvblxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmdW5jIEZ1bmN0aW9uIHRvIHN0cmluZ2lmeS5cbiAgICogQHJldHVybiB7c3RyaW5nfSBTdHJpbmdpZmllZCBmdW5jdGlvbi5cbiAgICovXG4gIHN0YXRpYyBmdW5jVG9TdHJpbmcoZnVuYykge1xuICAgIGxldCBzdHJpbmdGdW5jID0gZnVuYy50b1N0cmluZygpO1xuICAgIGlmKCFzdHJpbmdGdW5jLnN0YXJ0c1dpdGgoJ2Z1bmN0aW9uJykpe1xuICAgICAgc3RyaW5nRnVuYyA9ICdmdW5jdGlvbiAnICsgc3RyaW5nRnVuYztcbiAgICB9XG5cbiAgICByZXR1cm4gc3RyaW5nRnVuYztcbiAgfVxuXG4gIC8qKlxuICAqIF9idWlsZFdvcmtlclxuICAqL1xuICBzdGF0aWMgYnVpbGRXb3JrZXIod29ya2VyRnVuYykge1xuICAgIHZhciBibG9iID0gbmV3IEJsb2IoWycoJyArIFV0aWxzLmZ1bmNUb1N0cmluZyh3b3JrZXJGdW5jKSArICcpKCknXSk7XG4gICAgdmFyIHVyaSA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYiwge3R5cGU6ICd0ZXh0L2phdmFzY3JpcHQnfSk7XG4gICAgY29uc3Qgd29ya2VyID0gbmV3IFdvcmtlcih1cmkpO1xuXG4gICAgcmV0dXJuIHdvcmtlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBUdXJuIGEgZnVuY3Rpb24gaW50byBhbiBvYmplY3QgZm9yIHNlbmRpbmcgdG8gYSB3b3JrZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZ1bmNcbiAgICogQHJldHVybiB7T2JqZWN0fSBGdW5jdGlvbiBtZXNzYWdlIG9iamVjdC5cbiAgICovXG4gIHN0YXRpYyBmdW5jdGlvblRvTWVzc2FnZShmdW5jLCBuYW1lKSB7XG4gICAgdmFyIGZ1bmNTdHJpbmcgPSBVdGlscy5mdW5jVG9TdHJpbmcoZnVuYyk7XG4gICAgdmFyIGFyZ3MgPSBmdW5jU3RyaW5nLnN1YnN0cmluZyhmdW5jU3RyaW5nLmluZGV4T2YoJygnKSArIDEsIGZ1bmNTdHJpbmcuaW5kZXhPZignKScpKTtcbiAgICB2YXIgYm9keSA9IGZ1bmNTdHJpbmcuc3Vic3RyaW5nKGZ1bmNTdHJpbmcuaW5kZXhPZigneycpICsgMSwgZnVuY1N0cmluZy5sYXN0SW5kZXhPZignfScpKTtcblxuICAgIGlmKGJvZHkubGVuZ3RoIDwgMSkge1xuICAgICAgYm9keSA9IGZ1bmNTdHJpbmcuc3Vic3RyaW5nKGZ1bmNTdHJpbmcuaW5kZXhPZignPT4nKSArIDIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBuYW1lIHx8IGZ1bmMubmFtZSxcbiAgICAgIGFyZ3M6IGFyZ3MsXG4gICAgICBib2R5OiBib2R5LFxuICAgIH07XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBVdGlscztcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL3V0aWxzLmpzXG4vLyBtb2R1bGUgaWQgPSAzXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICAqIHdvcmtlclxuICAqL1xuZnVuY3Rpb24gd29ya2VyKCkge1xuICAvKipcbiAgICogZ2V0RnVuY3Rpb25cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGZ1bmNTdHJpbmcgU3RyaW5naWZpZWQgZnVuY3Rpb24gZm9yIHdvcmtlciB0byBleGVjdXRlLlxuICAgKiBAcmV0dXJucyB7ZnVuY3Rpb259IGV2YWwnZCBmdW5jdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0RnVuY3Rpb24oZnVuY09iaikge1xuICAgIGxldCBmb28gPSBuZXcgRnVuY3Rpb24oZnVuY09iai5hcmdzLnNwbGl0KCcsJyksIGZ1bmNPYmouYm9keSk7XG5cbiAgICByZXR1cm4gZm9vO1xuICB9XG5cbiAgLyoqXG4gICAgICogUG9zdHMgdGhlIHJlc3VsdCBvZiBhIGNhbGxlZCB3b3JrZXIgZnVuY3Rpb24gYmFjayB0byB0aGUgbWFpbiB0aHJlYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge05hbWUgb2YgdGhlIGZ1bmN0aW9uIGNhbGxlZC59IG5hbWUgU3RyaW5nXG4gICAgICogQHBhcmFtIHsqfSByZXN1bHQgVGhlIHJlc3VsdCBvZiB0aGUgZnVuY3Rpb24gY2FsbC5cbiAgICAgKi9cbiAgZnVuY3Rpb24gcG9zdFJlc3VsdChuYW1lLCByZXN1bHQpIHtcbiAgICBzZWxmLnBvc3RNZXNzYWdlKHtcbiAgICAgIG5hbWUsXG4gICAgICByZXN1bHRcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGZ1bmNNYXAgPSBuZXcgTWFwKCk7XG5cbiAgdGhpcy5vbm1lc3NhZ2UgPSBmdW5jdGlvbiBvbm1lc3NhZ2UoZXYpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXYuZGF0YTtcblxuICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ2NvbXBpbGUnKSB7XG4gICAgICBmdW5jTWFwLnNldChtZXNzYWdlLmZ1bmMubmFtZSwgZ2V0RnVuY3Rpb24obWVzc2FnZS5mdW5jKSk7XG4gICAgfVxuXG4gICAgaWYobWVzc2FnZS50eXBlID09PSAnY2FsbCcpIHtcbiAgICAgIHBvc3RSZXN1bHQobWVzc2FnZS5uYW1lLCBmdW5jTWFwLmdldChtZXNzYWdlLm5hbWUpKC4uLm1lc3NhZ2UuYXJncykpO1xuICAgIH1cbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3b3JrZXI7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy93b3JrZXIuanNcbi8vIG1vZHVsZSBpZCA9IDRcbi8vIG1vZHVsZSBjaHVua3MgPSAwIl0sInNvdXJjZVJvb3QiOiIifQ==