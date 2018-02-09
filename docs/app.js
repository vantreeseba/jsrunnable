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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgY2Y3NTAzZmUyMjZlMzFjMzM4NTIiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydW5uYWJsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7OztBQzdEQTs7QUFFQTtBQUNBO0FBQ0E7Ozs7Ozs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsTUFBTTtBQUNuQixjQUFjO0FBQ2Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLG1CQUFtQixnQkFBZ0I7QUFDbkM7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxhQUFhLGVBQWU7QUFDNUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYSxPQUFPO0FBQ3BCLGVBQWUsU0FBUztBQUN4QjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7Ozs7OztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QixjQUFjLE9BQU87QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlDQUF5Qyx3QkFBd0I7QUFDakU7O0FBRUEsd0JBQXdCLG9CQUFvQjtBQUM1QztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsU0FBUztBQUN0QixjQUFjLE9BQU87QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5REFBeUQsaUNBQWlDOztBQUUxRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSIsImZpbGUiOiJhcHAuanM/Mjc4NTg4NjFiYTNmN2FkMTE3MGYiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMCk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgY2Y3NTAzZmUyMjZlMzFjMzM4NTIiLCJjb25zdCBSdW5uYWJsZSA9IHJlcXVpcmUoJy4vcnVubmFibGUnKTtcblxuaWYod2luZG93KSB7XG4gIHdpbmRvdy5SdW5uYWJsZSA9IFJ1bm5hYmxlO1xufVxuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDFcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG4vKipcbiAqIFJ1bm5hYmxlXG4gKi9cbmNsYXNzIFJ1bm5hYmxlIHtcbiAgLyoqXG4gICAqIENvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7QXJyYXl9IGZ1bmNzIGFycmF5IG9mIGZ1bmN0aW9ucyB0byBydW4gaW4gd29ya2Vyc1xuICAgKiBAcmV0dXJuIHtSdW5uYWJsZX1cbiAgICovXG4gIGNvbnN0cnVjdG9yKGZ1bmNzKSB7XG4gICAgdGhpcy5fb3BzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3dvcmtlcnMgPSBbXTtcbiAgICB0aGlzLl93b3JrZXJPcE1hcCA9IG5ldyBNYXAoKTtcblxuICAgIHRoaXMuY29yZXMgPSBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLmhhcmR3YXJlQ29uY3VycmVuY3kgfHwgMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29yZXM7IGkrKykge1xuICAgICAgdGhpcy5fd29ya2Vycy5wdXNoKFV0aWxzLmJ1aWxkV29ya2VyKHRoaXMuX3dvcmtlckZ1bmMsIGkpKTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZChmdW5jcyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGZ1bmN0aW9ucyB0byB3b3JrZXJzIHRvIGNhbGwuXG4gICAqIEBwYXJhbSB7QXJyYXl8RnVuY3Rpb259IGZ1bmNzIEZ1bmN0aW9uKHMpIHRvIGFzc2lnbiB0byB3b3JrZXJzLlxuICAgKi9cbiAgYWRkKGZ1bmNzKSB7XG4gICAgaWYgKGZ1bmNzKSB7XG4gICAgICBpZiAodHlwZW9mKGZ1bmNzKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9vcHMuc2V0KGZ1bmNzLm5hbWUsIGZ1bmNzKTtcbiAgICAgIH1cbiAgICAgIGlmIChmdW5jcyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZ1bmNzLmZvckVhY2goZiA9PiB0aGlzLl9vcHMuc2V0KGYubmFtZSwgZikpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZCB0aGUgd29ya2Vycy5cbiAgICovXG4gIGNvbXBpbGUoKSB7XG4gICAgQXJyYXkuZnJvbSh0aGlzLl9vcHMudmFsdWVzKCkpLmZvckVhY2goKG9wLCBpKSA9PiB7XG4gICAgICBjb25zdCBpbmRleCA9IGkgJSB0aGlzLmNvcmVzO1xuXG4gICAgICBjb25zdCBtZXNzYWdlID0ge1xuICAgICAgICB0eXBlOiAnY29tcGlsZScsXG4gICAgICAgIGZ1bmM6IFV0aWxzLmZ1bmN0aW9uVG9NZXNzYWdlKG9wKSxcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuX3dvcmtlcnNbaW5kZXhdLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgdGhpcy5fd29ya2VyT3BNYXAuc2V0KG9wLm5hbWUsIGluZGV4KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAqIHJ1blxuICAqXG4gICogQGFjY2VzcyBwdWJsaWNcbiAgKi9cbiAgY2FsbChuYW1lLCBhcmdzKSB7XG4gICAgbmFtZSA9IG5hbWUubmFtZSB8fCBuYW1lO1xuICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuX3dvcmtlcnNbdGhpcy5fd29ya2VyT3BNYXAuZ2V0KG5hbWUpXTtcblxuICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOidjYWxsJyxcbiAgICAgIGFyZ3M6IGFyZ3MsXG4gICAgICBuYW1lOiBuYW1lXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgKiBfd29ya2VyRnVuY1xuICAqXG4gICogQGFjY2VzcyBwcml2YXRlXG4gICovXG4gIF93b3JrZXJGdW5jKCkge1xuICAvKipcbiAgICogZ2V0RnVuY3Rpb25cbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IGZ1bmNTdHJpbmcgU3RyaW5naWZpZWQgZnVuY3Rpb24gZm9yIHdvcmtlciB0byBleGVjdXRlLlxuICAgKiBAcmV0dXJucyB7ZnVuY3Rpb259IGV2YWwnZCBmdW5jdGlvblxuICAgKi9cbiAgICBmdW5jdGlvbiBnZXRGdW5jdGlvbihmdW5jT2JqKSB7XG4gICAgICBsZXQgZm9vID0gbmV3IEZ1bmN0aW9uKGZ1bmNPYmouYXJncy5zcGxpdCgnLCcpLCBmdW5jT2JqLmJvZHkpO1xuXG4gICAgICByZXR1cm4gZm9vO1xuICAgIH1cblxuICAgIGxldCBfaWQgPSAtMTtcbiAgICBjb25zdCBmdW5jTWFwID0gbmV3IE1hcCgpO1xuXG4gICAgdGhpcy5vbm1lc3NhZ2UgPSBmdW5jdGlvbiBvbm1lc3NhZ2UoZXYpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBldi5kYXRhO1xuXG4gICAgICBpZihtZXNzYWdlLnR5cGUgPT09ICdpbml0Jykge1xuICAgICAgICBfaWQgPSBtZXNzYWdlLmlkO1xuICAgICAgICBjb25zb2xlLmxvZygnc2V0dXAgd29ya2VyIHdpdGggaWQ6ICcsIF9pZCk7XG4gICAgICB9XG5cbiAgICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gJ2NvbXBpbGUnKSB7XG4gICAgICAgIGZ1bmNNYXAuc2V0KG1lc3NhZ2UuZnVuYy5uYW1lLCBnZXRGdW5jdGlvbihtZXNzYWdlLmZ1bmMpKTtcbiAgICAgIH1cblxuICAgICAgaWYobWVzc2FnZS50eXBlID09PSAnY2FsbCcpIHtcbiAgICAgICAgZnVuY01hcC5nZXQobWVzc2FnZS5uYW1lKShtZXNzYWdlLmFyZ3MpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSdW5uYWJsZTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL3J1bm5hYmxlLmpzXG4vLyBtb2R1bGUgaWQgPSAyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogVXRpbGl0aWVzIGZvciBqc3J1bm5hYmxlXG4gKi9cbmNsYXNzIFV0aWxzIHtcbiAgLyoqXG4gICAqIFN0cmluZ2lmaWVzIGEgZnVuY3Rpb25cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBzdHJpbmdpZnkuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5naWZpZWQgZnVuY3Rpb24uXG4gICAqL1xuICBzdGF0aWMgZnVuY1RvU3RyaW5nKGZ1bmMpIHtcbiAgICBsZXQgc3RyaW5nRnVuYyA9IGZ1bmMudG9TdHJpbmcoKTtcbiAgICBpZighc3RyaW5nRnVuYy5zdGFydHNXaXRoKCdmdW5jdGlvbicpKXtcbiAgICAgIHN0cmluZ0Z1bmMgPSAnZnVuY3Rpb24gJyArIHN0cmluZ0Z1bmM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cmluZ0Z1bmM7XG4gIH1cblxuICAvKipcbiAgKiBfYnVpbGRXb3JrZXJcbiAgKi9cbiAgc3RhdGljIGJ1aWxkV29ya2VyKHdvcmtlckZ1bmMsIGkpIHtcbiAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFsnKCcgKyBVdGlscy5mdW5jVG9TdHJpbmcod29ya2VyRnVuYykgKyAnKSgpJ10pO1xuICAgIHZhciB1cmkgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IsIHt0eXBlOiAndGV4dC9qYXZhc2NyaXB0J30pO1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIodXJpKTtcblxuICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7dHlwZTogJ2luaXQnLCBpZDogaX0pO1xuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cblxuICAvKipcbiAgICogVHVybiBhIGZ1bmN0aW9uIGludG8gYW4gb2JqZWN0IGZvciBzZW5kaW5nIHRvIGEgd29ya2VyLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmdW5jXG4gICAqIEByZXR1cm4ge09iamVjdH0gRnVuY3Rpb24gbWVzc2FnZSBvYmplY3QuXG4gICAqL1xuICBzdGF0aWMgZnVuY3Rpb25Ub01lc3NhZ2UoZnVuYykge1xuICAgIHZhciBmdW5jU3RyaW5nID0gVXRpbHMuZnVuY1RvU3RyaW5nKGZ1bmMpO1xuICAgIHZhciBhcmdzID0gZnVuY1N0cmluZy5zdWJzdHJpbmcoZnVuY1N0cmluZy5pbmRleE9mKCcoJykgKyAxLCBmdW5jU3RyaW5nLmluZGV4T2YoJyknKSk7XG4gICAgdmFyIGJvZHkgPSBmdW5jU3RyaW5nLnN1YnN0cmluZyhmdW5jU3RyaW5nLmluZGV4T2YoJ3snKSArIDEsIGZ1bmNTdHJpbmcubGFzdEluZGV4T2YoJ30nKSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogZnVuYy5uYW1lLFxuICAgICAgYXJnczogYXJncyxcbiAgICAgIGJvZHk6IGJvZHksXG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWxzO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvdXRpbHMuanNcbi8vIG1vZHVsZSBpZCA9IDNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIl0sInNvdXJjZVJvb3QiOiIifQ==