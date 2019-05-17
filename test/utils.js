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
      // const worker = Utils.buildWorker(() => {});
      // assert.isOK(worker);
    }
  }
};

// const distanceTest = (x1, y1, x2, y2, expected) => {
//   const actual = distanceFrom(x1, y1, x2, y2);
//   assert.equal(actual, expected);
// };

// const testCases = [
//   {x1: 0, y1: 0, x2: 1, y2: 0, expected: 1},
//   {x1: 0, y1: 0, x2: 0, y2: 1, expected: 1},
//   {x1: -1, y1: 0, x2: 0, y2: 0, expected: 1},
//   {x1: 0, y1: -1, x2: 0, y2: 1, expected: 2},
//   {x1: 0, y1: 100, x2: 0, y2: 0, expected: 100},
//   {x1: 100, y1: 100, x2: 100, y2: 0, expected: 100},
// ];

// const tests = {DistanceFrom:{}};

// testCases.forEach(tc => {
//   tests.DistanceFrom[`distance from ${tc.x1},${tc.y1} to ${tc.x2},${tc.y2} should be ${tc.expected}`] = () => {
//     distanceTest(tc.x1, tc.y1, tc.x2, tc.y2, tc.expected);
//   };
// });

module.exports = tests;
