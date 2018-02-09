/**
  * worker
  */
function worker() {
  const funcMap = new Map();

  /**
   * getFunction
   *
   * @param {string} funcString Stringified function for worker to execute.
   * @returns {function} eval'd function
   */
  const getFunction = (funcObj) => {
    return new Function(funcObj.args.split(','), funcObj.body);
  }

  /**
     * Posts the result of a called worker function back to the main thread.
     *
     * @param {Name of the function called.} name String
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
    funcMap.set(message.func.name, getFunction(message.func));
  };

  /**
   * Call the function from the message object.
   * @param {Object} message Message object from main thread.
   */
  const call = (message) => {
    let result;
    try {
      result = funcMap.get(message.name)(...message.args);
      postResult(message, result);
    } catch (err) {
      postError(message, err);
    }
  };

  onmessage = (ev) => {
    const message = ev.data;

    message.type === 'compile' ? compile(message)
      : message.type === 'call' ? call(message)
        : 0; // Why can't I do a return here?
  };
}

module.exports = worker;
