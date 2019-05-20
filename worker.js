/**
  * worker
  */
function worker() {
  const isBrowser = typeof window !== 'undefined';
  let postMessage;
  if (!isBrowser) {
    try {
      const threads = require('worker_threads');
      parentPort = threads.parentPort;
      postMessage = parentPort.postMessage.bind(parentPort);
      // const {
      // Worker, isMainThread, parentPort, workerData
      // } = require('worker_threads');
    } catch (ex) {
      throw new Error('You must have node v12 to use workers');
    }
  } else {
    postMessage = window.postMessage;
  }
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
  const call = async (message) => {
    try {
      const result = await funcMap.get(message.name)(...message.args);
      postResult(message, result);
    } catch (err) {
      postError(message, err);
    }
  };

  const handler = (ev) => {
    const message = ev.data;

    message.type === 'compile' ? compile(message)
      : message.type === 'call' ? call(message)
        : 0;

  };

  if (parentPort) {
    parentPort.on('message', handler);
  } else {
    onmessage = handler;
  }
}

module.exports = worker;
