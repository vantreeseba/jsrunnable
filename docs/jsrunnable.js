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
  constructor() {
    this._ops = new Map();
    this._workers = [];
    this._workerOpMap = new Map();
    this._lastWorkerIndex = 0;

    this.cores = navigator && navigator.hardwareConcurrency || 1;
    for (var i = 0; i < this.cores; i++) {
      this._workers.push(Utils.buildWorker(this._workerFunc, i));
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
    return name;
  }

  /**
   * Build the workers.
   */
  compile() {
    this._ops.forEach((op, name) => {
      this._compile(name, op);
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

  /**
  * run
  *
  * @access public
  */
  call(name, ...args) {
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
        funcMap.get(message.name)(...message.args);
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
  static functionToMessage(func, name) {
    var funcString = Utils.funcToString(func);
    var args = funcString.substring(funcString.indexOf('(') + 1, funcString.indexOf(')'));
    var body = funcString.substring(funcString.indexOf('{') + 1, funcString.lastIndexOf('}'));

    return {
      name: name || func.name,
      args: args,
      body: body,
    };
  }
}

module.exports = Utils;


/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMjQxZWE4ODk2M2I5ZjBhOTQwMGYiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydW5uYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7OztBQzdEQTs7QUFFQTtBQUNBO0FBQ0E7Ozs7Ozs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsTUFBTTtBQUNuQixjQUFjO0FBQ2Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsbUJBQW1CLGdCQUFnQjtBQUNuQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsT0FBTztBQUNwQixlQUFlLFNBQVM7QUFDeEI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7Ozs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLFNBQVM7QUFDdEIsY0FBYyxPQUFPO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5Q0FBeUMsd0JBQXdCO0FBQ2pFOztBQUVBLHdCQUF3QixvQkFBb0I7QUFDNUM7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLFNBQVM7QUFDdEIsY0FBYyxPQUFPO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseURBQXlELGlDQUFpQzs7QUFFMUY7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEiLCJmaWxlIjoianNydW5uYWJsZS5qcz9iMmI2Nzc5YTQ5ZGRhYzlmZjBkZCIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAwKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCAyNDFlYTg4OTYzYjlmMGE5NDAwZiIsImNvbnN0IFJ1bm5hYmxlID0gcmVxdWlyZSgnLi9ydW5uYWJsZScpO1xuXG5pZih3aW5kb3cpIHtcbiAgd2luZG93LlJ1bm5hYmxlID0gUnVubmFibGU7XG59XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gMVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbi8qKlxuICogUnVubmFibGVcbiAqL1xuY2xhc3MgUnVubmFibGUge1xuICAvKipcbiAgICogQ29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtBcnJheX0gZnVuY3MgYXJyYXkgb2YgZnVuY3Rpb25zIHRvIHJ1biBpbiB3b3JrZXJzXG4gICAqIEByZXR1cm4ge1J1bm5hYmxlfVxuICAgKi9cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fb3BzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3dvcmtlcnMgPSBbXTtcbiAgICB0aGlzLl93b3JrZXJPcE1hcCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9sYXN0V29ya2VySW5kZXggPSAwO1xuXG4gICAgdGhpcy5jb3JlcyA9IG5hdmlnYXRvciAmJiBuYXZpZ2F0b3IuaGFyZHdhcmVDb25jdXJyZW5jeSB8fCAxO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb3JlczsgaSsrKSB7XG4gICAgICB0aGlzLl93b3JrZXJzLnB1c2goVXRpbHMuYnVpbGRXb3JrZXIodGhpcy5fd29ya2VyRnVuYywgaSkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgZnVuY3Rpb25zIHRvIHdvcmtlcnMgdG8gY2FsbC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBhc3NpZ24gdG8gd29ya2Vycy5cbiAgICovXG4gIGFkZChmdW5jKSB7XG4gICAgY29uc3QgbmFtZSA9IGZ1bmMubmFtZSB8fCAnaWRfJyArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIwMDAwMCk7XG4gICAgdGhpcy5fb3BzLnNldChuYW1lLCBmdW5jKTtcbiAgICB0aGlzLl9jb21waWxlKG5hbWUsIGZ1bmMpO1xuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkIHRoZSB3b3JrZXJzLlxuICAgKi9cbiAgY29tcGlsZSgpIHtcbiAgICB0aGlzLl9vcHMuZm9yRWFjaCgob3AsIG5hbWUpID0+IHtcbiAgICAgIHRoaXMuX2NvbXBpbGUobmFtZSwgb3ApO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEludGVybmFsIENvbXBpbGUgRnVuY3Rpb25cbiAgICovXG4gIF9jb21waWxlKG5hbWUsIG9wKSB7XG4gICAgaWYodGhpcy5fd29ya2VyT3BNYXAuaGFzKG5hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgIHR5cGU6ICdjb21waWxlJyxcbiAgICAgIGZ1bmM6IFV0aWxzLmZ1bmN0aW9uVG9NZXNzYWdlKG9wLCBuYW1lKSxcbiAgICB9O1xuXG4gICAgY29uc3QgaW5kZXggPSB0aGlzLl9sYXN0V29ya2VySW5kZXggJSB0aGlzLmNvcmVzO1xuICAgIHRoaXMuX3dvcmtlcnNbaW5kZXhdLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgIHRoaXMuX3dvcmtlck9wTWFwLnNldChuYW1lLCBpbmRleCk7XG5cbiAgICB0aGlzLl9sYXN0V29ya2VySW5kZXgrKztcbiAgfVxuXG4gIC8qKlxuICAqIHJ1blxuICAqXG4gICogQGFjY2VzcyBwdWJsaWNcbiAgKi9cbiAgY2FsbChuYW1lLCAuLi5hcmdzKSB7XG4gICAgbmFtZSA9IG5hbWUubmFtZSB8fCBuYW1lO1xuICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuX3dvcmtlcnNbdGhpcy5fd29ya2VyT3BNYXAuZ2V0KG5hbWUpXTtcblxuICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOidjYWxsJyxcbiAgICAgIGFyZ3M6IGFyZ3MsXG4gICAgICBuYW1lOiBuYW1lXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgKiBfd29ya2VyRnVuY1xuICAqXG4gICogQGFjY2VzcyBwcml2YXRlXG4gICovXG4gIF93b3JrZXJGdW5jKCkge1xuICAvKipcbiAgICogZ2V0RnVuY3Rpb25cbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IGZ1bmNTdHJpbmcgU3RyaW5naWZpZWQgZnVuY3Rpb24gZm9yIHdvcmtlciB0byBleGVjdXRlLlxuICAgKiBAcmV0dXJucyB7ZnVuY3Rpb259IGV2YWwnZCBmdW5jdGlvblxuICAgKi9cbiAgICBmdW5jdGlvbiBnZXRGdW5jdGlvbihmdW5jT2JqKSB7XG4gICAgICBsZXQgZm9vID0gbmV3IEZ1bmN0aW9uKGZ1bmNPYmouYXJncy5zcGxpdCgnLCcpLCBmdW5jT2JqLmJvZHkpO1xuXG4gICAgICByZXR1cm4gZm9vO1xuICAgIH1cblxuICAgIGxldCBfaWQgPSAtMTtcbiAgICBjb25zdCBmdW5jTWFwID0gbmV3IE1hcCgpO1xuXG4gICAgdGhpcy5vbm1lc3NhZ2UgPSBmdW5jdGlvbiBvbm1lc3NhZ2UoZXYpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBldi5kYXRhO1xuXG4gICAgICBpZihtZXNzYWdlLnR5cGUgPT09ICdpbml0Jykge1xuICAgICAgICBfaWQgPSBtZXNzYWdlLmlkO1xuICAgICAgICBjb25zb2xlLmxvZygnc2V0dXAgd29ya2VyIHdpdGggaWQ6ICcsIF9pZCk7XG4gICAgICB9XG5cbiAgICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ2NvbXBpbGUnKSB7XG4gICAgICAgIGZ1bmNNYXAuc2V0KG1lc3NhZ2UuZnVuYy5uYW1lLCBnZXRGdW5jdGlvbihtZXNzYWdlLmZ1bmMpKTtcbiAgICAgIH1cblxuICAgICAgaWYobWVzc2FnZS50eXBlID09PSAnY2FsbCcpIHtcbiAgICAgICAgZnVuY01hcC5nZXQobWVzc2FnZS5uYW1lKSguLi5tZXNzYWdlLmFyZ3MpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSdW5uYWJsZTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL3J1bm5hYmxlLmpzXG4vLyBtb2R1bGUgaWQgPSAyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogVXRpbGl0aWVzIGZvciBqc3J1bm5hYmxlXG4gKi9cbmNsYXNzIFV0aWxzIHtcbiAgLyoqXG4gICAqIFN0cmluZ2lmaWVzIGEgZnVuY3Rpb25cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBzdHJpbmdpZnkuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5naWZpZWQgZnVuY3Rpb24uXG4gICAqL1xuICBzdGF0aWMgZnVuY1RvU3RyaW5nKGZ1bmMpIHtcbiAgICBsZXQgc3RyaW5nRnVuYyA9IGZ1bmMudG9TdHJpbmcoKTtcbiAgICBpZighc3RyaW5nRnVuYy5zdGFydHNXaXRoKCdmdW5jdGlvbicpKXtcbiAgICAgIHN0cmluZ0Z1bmMgPSAnZnVuY3Rpb24gJyArIHN0cmluZ0Z1bmM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cmluZ0Z1bmM7XG4gIH1cblxuICAvKipcbiAgKiBfYnVpbGRXb3JrZXJcbiAgKi9cbiAgc3RhdGljIGJ1aWxkV29ya2VyKHdvcmtlckZ1bmMsIGkpIHtcbiAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFsnKCcgKyBVdGlscy5mdW5jVG9TdHJpbmcod29ya2VyRnVuYykgKyAnKSgpJ10pO1xuICAgIHZhciB1cmkgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IsIHt0eXBlOiAndGV4dC9qYXZhc2NyaXB0J30pO1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIodXJpKTtcblxuICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7dHlwZTogJ2luaXQnLCBpZDogaX0pO1xuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cblxuICAvKipcbiAgICogVHVybiBhIGZ1bmN0aW9uIGludG8gYW4gb2JqZWN0IGZvciBzZW5kaW5nIHRvIGEgd29ya2VyLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmdW5jXG4gICAqIEByZXR1cm4ge09iamVjdH0gRnVuY3Rpb24gbWVzc2FnZSBvYmplY3QuXG4gICAqL1xuICBzdGF0aWMgZnVuY3Rpb25Ub01lc3NhZ2UoZnVuYywgbmFtZSkge1xuICAgIHZhciBmdW5jU3RyaW5nID0gVXRpbHMuZnVuY1RvU3RyaW5nKGZ1bmMpO1xuICAgIHZhciBhcmdzID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCcoJykgKyAxLCBmdW5jU3RyaW5nLmluZGV4T2YoJyknKSk7XG4gICAgdmFyIGJvZHkgPSBmdW5jU3RyaW5nLnN1YnN0cmluZyhmdW5jU3RyaW5nLmluZGV4T2YoJ3snKSArIDEsIGZ1bmNTdHJpbmcubGFzdEluZGV4T2YoJ30nKSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogbmFtZSB8fCBmdW5jLm5hbWUsXG4gICAgICBhcmdzOiBhcmdzLFxuICAgICAgYm9keTogYm9keSxcbiAgICB9O1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbHM7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy91dGlscy5qc1xuLy8gbW9kdWxlIGlkID0gM1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiXSwic291cmNlUm9vdCI6IiJ9