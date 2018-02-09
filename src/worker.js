/**
  * worker
  */
function worker() {
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
  const call = (message) => {
    try {
      postResult(message, funcMap.get(message.name)(...message.args));
    } catch (err) {
      postError(message, err);
    }
  };

  onmessage = (ev) => {
    const message = ev.data;

    message.type === 'compile' ? compile(message)
      : message.type === 'call' ? call(message)
      : 0;
  };
}

module.exports = worker;
