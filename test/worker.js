const {assert} = require('chai');
const Utils = require('../utils');
const WorkerScript = require('../worker');
const {Worker} = require('worker_threads');

const tests = {
  Worker: {
    'Should build a worker': () => {
      // const worker = Utils.buildWorker(WorkerScript);
      // assert.isOk(worker);
    },
    'should pass a message to the worker': (done) => {
      const wrapped = `(${Utils.funcToString(WorkerScript)})()`;
      const worker = new Worker(wrapped, {eval: true});

      const func = Utils.functionToMessage(() => {});

      worker.postMessage({
        data: {
          type: 'compile',
          func
        }
      });

      worker.postMessage({
        data: {
          type: 'call',
          name: '',
          args: []
        }
      });

      worker.on('message', msg => {
        console.log('got from worker', msg);
        assert.isOk(worker);
        done();
      });
    }
  }
};

module.exports = tests;
