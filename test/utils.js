const {assert} = require('chai');
const Utils = require('../utils');

const tests = {
  funcToString: {
    'should turn a named function into a string': () => {
      let a = function test() {};

      const string = Utils.funcToString(a);
      assert.equal(string, 'function test() {}');
    },
    'should turn a named function with args into a string': () => {
      let a = function test(arg) {
        return arg;
      };

      const expected = `function test(arg) {
        return arg;
      }`;

      const string = Utils.funcToString(a);
      assert.equal(string, expected);
    },
    'should turn an anonymous function into a string': () => {
      const test = function() {};

      const string = Utils.funcToString(test);
      assert.equal(string, 'function() {}');
    },
    'should turn an anonymous function with args into a string': () => {
      const test = function(arg) {};

      const string = Utils.funcToString(test);
      assert.equal(string, 'function(arg) {}');
    },
    'should turn an arrow function into a string': () => {
      const test = () => {};

      const string = Utils.funcToString(test);
      assert.equal(string, '() => {}');
    },
    'should turn an arrow function with arg and no parens into a string': () => {
      const test = x => {};

      const string = Utils.funcToString(test);
      assert.equal(string, '(x) => {}');
    },
    'should turn an arrow function with arg and parens into a string': () => {
      const test = (x) => {};

      const string = Utils.funcToString(test);
      assert.equal(string, '(x) => {}');
    },
    'should turn an arrow function with arg and parens and no curlys into a string': () => {
      const test = (x) => x + 1;

      const string = Utils.funcToString(test);
      assert.equal(string, '(x) => x + 1');
    }
  },
  buildWorker: {
    'should return a worker': () => {
      const worker = Utils.buildWorker(() => {});
      assert.isOk(worker);
    }
  }
};

module.exports = tests;
