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
