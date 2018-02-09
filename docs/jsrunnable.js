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


    this.cores = 1; // navigator && navigator.hardwareConcurrency || 1;
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
    throw "wee";
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgOTAyODMzNjZkMzFjNzExZDlhMjAiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydW5uYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3dvcmtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOztBQUVBO0FBQ0E7QUFDQTs7Ozs7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE1BQU07QUFDbkIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0EsbUJBQW1CO0FBQ25CLG1CQUFtQixnQkFBZ0I7QUFDbkM7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsYUFBYSxTQUFTO0FBQ3RCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBLGlDQUFpQyxnQkFBZ0I7QUFDakQsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7Ozs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLFNBQVM7QUFDdEIsY0FBYyxPQUFPO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5Q0FBeUMsd0JBQXdCO0FBQ2pFOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsYUFBYSxTQUFTO0FBQ3RCLGNBQWMsT0FBTztBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlEQUF5RCxpQ0FBaUM7O0FBRTFGO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7Ozs7OztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsT0FBTztBQUNwQixlQUFlLFNBQVM7QUFDeEI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsZUFBZSw2QkFBNkI7QUFDNUMsZUFBZSxFQUFFO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AscUJBQXFCLHVDQUF1QztBQUM1RDtBQUNBO0FBQ0E7QUFDQTs7QUFFQSIsImZpbGUiOiJqc3J1bm5hYmxlLmpzPzFhMzRlM2NiMWJmYTNjZjhhZWZkIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pIHtcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbiBcdFx0fVxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbiBcdFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdFx0fSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiL1wiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDApO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDkwMjgzMzY2ZDMxYzcxMWQ5YTIwIiwiY29uc3QgUnVubmFibGUgPSByZXF1aXJlKCcuL3J1bm5hYmxlJyk7XG5cbmlmKHdpbmRvdykge1xuICB3aW5kb3cuUnVubmFibGUgPSBSdW5uYWJsZTtcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2luZGV4LmpzXG4vLyBtb2R1bGUgaWQgPSAxXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsImNvbnN0IFV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuY29uc3QgV29ya2VyID0gcmVxdWlyZSgnLi93b3JrZXInKTtcbi8qKlxuICogUnVubmFibGVcbiAqL1xuY2xhc3MgUnVubmFibGUge1xuICAvKipcbiAgICogQ29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtBcnJheX0gZnVuY3MgYXJyYXkgb2YgZnVuY3Rpb25zIHRvIHJ1biBpbiB3b3JrZXJzXG4gICAqIEByZXR1cm4ge1J1bm5hYmxlfVxuICAgKi9cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fb3BzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3dvcmtlcnMgPSBbXTtcbiAgICB0aGlzLl93b3JrZXJPcE1hcCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9yZXN1bHRNYXAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fbGFzdFdvcmtlckluZGV4ID0gMDtcblxuICAgIGNvbnN0IG9ubWVzc2FnZSA9IChldikgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG5cbiAgICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ3Jlc3VsdCcgJiYgdGhpcy5fcmVzdWx0TWFwLmhhcyhtZXNzYWdlLm5hbWUpKSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdE1hcC5nZXQobWVzc2FnZS5uYW1lKS5yZXNvbHZlKG1lc3NhZ2UucmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgaWYobWVzc2FnZS50eXBlID09PSAnZXJyb3InICYmIHRoaXMuX3Jlc3VsdE1hcC5oYXMobWVzc2FnZS5uYW1lKSkge1xuICAgICAgICB0aGlzLl9yZXN1bHRNYXAuZ2V0KG1lc3NhZ2UubmFtZSkucmVqZWN0KG1lc3NhZ2UuZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgb25lcnJvciA9IChlcnIpID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBldi5kYXRhO1xuICAgICAgaWYodGhpcy5fcmVzdWx0TWFwLmhhcyhtZXNzYWdlLm5hbWUpKSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdE1hcC5nZXQobWVzc2FnZS5uYW1lKS5yZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB0aGlzLmNvcmVzID0gMTsgLy8gbmF2aWdhdG9yICYmIG5hdmlnYXRvci5oYXJkd2FyZUNvbmN1cnJlbmN5IHx8IDE7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvcmVzOyBpKyspIHtcbiAgICAgIGNvbnN0IHdvcmtlciA9IFV0aWxzLmJ1aWxkV29ya2VyKFdvcmtlcik7XG4gICAgICB3b3JrZXIub25tZXNzYWdlID0gb25tZXNzYWdlO1xuICAgICAgd29ya2VyLm9uZXJyb3IgPSBvbmVycm9yO1xuXG4gICAgICB0aGlzLl93b3JrZXJzLnB1c2god29ya2VyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkIGZ1bmN0aW9ucyB0byB3b3JrZXJzIHRvIGNhbGwuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgRnVuY3Rpb24gdG8gYXNzaWduIHRvIHdvcmtlcnMuXG4gICAqL1xuICBhZGQoZnVuYykge1xuICAgIGNvbnN0IG5hbWUgPSBmdW5jLm5hbWUgfHwgJ2lkXycgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyMDAwMDApO1xuICAgIHRoaXMuX29wcy5zZXQobmFtZSwgZnVuYyk7XG4gICAgdGhpcy5fY29tcGlsZShuYW1lLCBmdW5jKTtcblxuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuX2NhbGwobmFtZSwgLi4uYXJncyk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIHRoZSByZW1vdGUgZnVuY3Rpb24uXG4gICAqL1xuICBfY2FsbChuYW1lLCAuLi5hcmdzKSB7XG4gICAgbmFtZSA9IG5hbWUubmFtZSB8fCBuYW1lO1xuICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuX3dvcmtlcnNbdGhpcy5fd29ya2VyT3BNYXAuZ2V0KG5hbWUpXTtcblxuICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOidjYWxsJyxcbiAgICAgIGFyZ3M6IGFyZ3MsXG4gICAgICBuYW1lOiBuYW1lXG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5fcmVzdWx0TWFwLnNldChuYW1lLCB7cmVzb2x2ZSwgcmVqZWN0fSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW50ZXJuYWwgQ29tcGlsZSBGdW5jdGlvblxuICAgKi9cbiAgX2NvbXBpbGUobmFtZSwgb3ApIHtcbiAgICBpZih0aGlzLl93b3JrZXJPcE1hcC5oYXMobmFtZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBtZXNzYWdlID0ge1xuICAgICAgdHlwZTogJ2NvbXBpbGUnLFxuICAgICAgZnVuYzogVXRpbHMuZnVuY3Rpb25Ub01lc3NhZ2Uob3AsIG5hbWUpLFxuICAgIH07XG5cbiAgICBjb25zdCBpbmRleCA9IHRoaXMuX2xhc3RXb3JrZXJJbmRleCAlIHRoaXMuY29yZXM7XG4gICAgdGhpcy5fd29ya2Vyc1tpbmRleF0ucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgdGhpcy5fd29ya2VyT3BNYXAuc2V0KG5hbWUsIGluZGV4KTtcblxuICAgIHRoaXMuX2xhc3RXb3JrZXJJbmRleCsrO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUnVubmFibGU7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9ydW5uYWJsZS5qc1xuLy8gbW9kdWxlIGlkID0gMlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIFV0aWxpdGllcyBmb3IganNydW5uYWJsZVxuICovXG5jbGFzcyBVdGlscyB7XG4gIC8qKlxuICAgKiBTdHJpbmdpZmllcyBhIGZ1bmN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZ1bmMgRnVuY3Rpb24gdG8gc3RyaW5naWZ5LlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9IFN0cmluZ2lmaWVkIGZ1bmN0aW9uLlxuICAgKi9cbiAgc3RhdGljIGZ1bmNUb1N0cmluZyhmdW5jKSB7XG4gICAgbGV0IHN0cmluZ0Z1bmMgPSBmdW5jLnRvU3RyaW5nKCk7XG4gICAgaWYoIXN0cmluZ0Z1bmMuc3RhcnRzV2l0aCgnZnVuY3Rpb24nKSl7XG4gICAgICBzdHJpbmdGdW5jID0gJ2Z1bmN0aW9uICcgKyBzdHJpbmdGdW5jO1xuICAgIH1cblxuICAgIHJldHVybiBzdHJpbmdGdW5jO1xuICB9XG5cbiAgLyoqXG4gICogX2J1aWxkV29ya2VyXG4gICovXG4gIHN0YXRpYyBidWlsZFdvcmtlcih3b3JrZXJGdW5jKSB7XG4gICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbJygnICsgVXRpbHMuZnVuY1RvU3RyaW5nKHdvcmtlckZ1bmMpICsgJykoKSddKTtcbiAgICB2YXIgdXJpID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iLCB7dHlwZTogJ3RleHQvamF2YXNjcmlwdCd9KTtcbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKHVyaSk7XG5cbiAgICByZXR1cm4gd29ya2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIFR1cm4gYSBmdW5jdGlvbiBpbnRvIGFuIG9iamVjdCBmb3Igc2VuZGluZyB0byBhIHdvcmtlci5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gZnVuY1xuICAgKiBAcmV0dXJuIHtPYmplY3R9IEZ1bmN0aW9uIG1lc3NhZ2Ugb2JqZWN0LlxuICAgKi9cbiAgc3RhdGljIGZ1bmN0aW9uVG9NZXNzYWdlKGZ1bmMsIG5hbWUpIHtcbiAgICB2YXIgZnVuY1N0cmluZyA9IFV0aWxzLmZ1bmNUb1N0cmluZyhmdW5jKTtcbiAgICB2YXIgYXJncyA9IGZ1bmNTdHJpbmcuc3Vic3RyaW5nKGZ1bmNTdHJpbmcuaW5kZXhPZignKCcpICsgMSwgZnVuY1N0cmluZy5pbmRleE9mKCcpJykpO1xuICAgIHZhciBib2R5ID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCd7JykgKyAxLCBmdW5jU3RyaW5nLmxhc3RJbmRleE9mKCd9JykpO1xuXG4gICAgaWYoYm9keS5sZW5ndGggPCAxKSB7XG4gICAgICBib2R5ID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCc9PicpICsgMik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IG5hbWUgfHwgZnVuYy5uYW1lLFxuICAgICAgYXJnczogYXJncyxcbiAgICAgIGJvZHk6IGJvZHksXG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWxzO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvdXRpbHMuanNcbi8vIG1vZHVsZSBpZCA9IDNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gICogd29ya2VyXG4gICovXG5mdW5jdGlvbiB3b3JrZXIoKSB7XG4gIC8qKlxuICAgKiBnZXRGdW5jdGlvblxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZnVuY1N0cmluZyBTdHJpbmdpZmllZCBmdW5jdGlvbiBmb3Igd29ya2VyIHRvIGV4ZWN1dGUuXG4gICAqIEByZXR1cm5zIHtmdW5jdGlvbn0gZXZhbCdkIGZ1bmN0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBnZXRGdW5jdGlvbihmdW5jT2JqKSB7XG4gICAgbGV0IGZvbyA9IG5ldyBGdW5jdGlvbihmdW5jT2JqLmFyZ3Muc3BsaXQoJywnKSwgZnVuY09iai5ib2R5KTtcblxuICAgIHJldHVybiBmb287XG4gIH1cblxuICAvKipcbiAgICAgKiBQb3N0cyB0aGUgcmVzdWx0IG9mIGEgY2FsbGVkIHdvcmtlciBmdW5jdGlvbiBiYWNrIHRvIHRoZSBtYWluIHRocmVhZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7TmFtZSBvZiB0aGUgZnVuY3Rpb24gY2FsbGVkLn0gbmFtZSBTdHJpbmdcbiAgICAgKiBAcGFyYW0geyp9IHJlc3VsdCBUaGUgcmVzdWx0IG9mIHRoZSBmdW5jdGlvbiBjYWxsLlxuICAgICAqL1xuICBmdW5jdGlvbiBwb3N0UmVzdWx0KG5hbWUsIHJlc3VsdCkge1xuICAgIHRocm93IFwid2VlXCI7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ3Jlc3VsdCcsXG4gICAgICBuYW1lLFxuICAgICAgcmVzdWx0XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBmdW5jTWFwID0gbmV3IE1hcCgpO1xuXG4gIHRoaXMub25tZXNzYWdlID0gZnVuY3Rpb24gb25tZXNzYWdlKGV2KSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGV2LmRhdGE7XG5cbiAgICBpZihtZXNzYWdlLnR5cGUgPT09ICdjb21waWxlJykge1xuICAgICAgZnVuY01hcC5zZXQobWVzc2FnZS5mdW5jLm5hbWUsIGdldEZ1bmN0aW9uKG1lc3NhZ2UuZnVuYykpO1xuICAgIH1cblxuICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ2NhbGwnKSB7XG4gICAgICBsZXQgcmVzdWx0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gZnVuY01hcC5nZXQobWVzc2FnZS5uYW1lKSguLi5tZXNzYWdlLmFyZ3MpO1xuICAgICAgICBwb3N0UmVzdWx0KG1lc3NhZ2UubmFtZSwgcmVzdWx0KTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBwb3N0TWVzc2FnZSh7dHlwZTogJ2Vycm9yJywgbmFtZTogbWVzc2FnZS5uYW1lLCBlcnJ9KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd29ya2VyO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvd29ya2VyLmpzXG4vLyBtb2R1bGUgaWQgPSA0XG4vLyBtb2R1bGUgY2h1bmtzID0gMCJdLCJzb3VyY2VSb290IjoiIn0=