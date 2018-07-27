# JS Runnable

An easy way to do workers kinda??? I dunno, I just wanted to see if it would work.

### Basic Usage: 
```javascript
var runner = new Runnable();
const myWorkerFunction = runner.add(() => console.log('hello from webworker'));
myWorkerFunction();
```

### You can pass arguments:
```javascript
var runner = new Runnable();
const myWorkerFunction = runner.add((a,b,c,d) => console.log('hello from webworker', a, b, c, d));
myWorkerFunction(1,2,3,4);
```

### You can return results (as a promise):
```javascript
var runner = new Runnable();
const myWorkerFunction = runner.add((a,b,c,d) => { return a + b + c + d; });
myWorkerFunction(1,2,3,4).then(result => console.log(result));
```

### It can run on multiple workers:
```javascript
var runner = new Runnable();
var workerCount = 4;
const myWorkerFunction = runner.add((a,b,c,d) => { return a + b + c + d; }, workerCount);
myWorkerFunction(1,2,3,4).then(result => console.log(result));
myWorkerFunction(4,4,4,4).then(result => console.log(result));
```

### API:
##### new Runnable()
Create a new runnable to spin up workers, and be able to attach functions to them.
##### runnable.add([function], workerCount[number])
Attach a function to the runnable;
It returns a wrapped function, that you can call to run the function on the web worker. 
This call will return a promise resolved with the result of the function call on the worker.
The worker count can be anything, but will limit internally to the number of available threads.

## Classes

<dl>
<dt><a href="#Runnable">Runnable</a></dt>
<dd><p>Runnable</p>
</dd>
<dt><a href="#Utils">Utils</a></dt>
<dd><p>Utilities for jsrunnable</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#worker">worker()</a></dt>
<dd><p>worker</p>
</dd>
</dl>

<a name="Runnable"></a>

## Runnable
Runnable

**Kind**: global class  

* [Runnable](#Runnable)
    * [new Runnable(funcs)](#new_Runnable_new)
    * [.add(func)](#Runnable+add)

<a name="new_Runnable_new"></a>

### new Runnable(funcs)
Constructor


| Param | Type | Description |
| --- | --- | --- |
| funcs | <code>Array</code> | array of functions to run in workers |

<a name="Runnable+add"></a>

### runnable.add(func)
Add functions to workers to call.

**Kind**: instance method of [<code>Runnable</code>](#Runnable)  

| Param | Type | Description |
| --- | --- | --- |
| func | <code>function</code> | Function to assign to workers. |

<a name="Utils"></a>

## Utils
Utilities for jsrunnable

**Kind**: global class  

* [Utils](#Utils)
    * [.funcToString(func)](#Utils.funcToString) ⇒ <code>string</code>
    * [.buildWorker()](#Utils.buildWorker)
    * [.functionToMessage(func)](#Utils.functionToMessage) ⇒ <code>Object</code>
    * [.randomId(prefix)](#Utils.randomId) ⇒ <code>String</code>

<a name="Utils.funcToString"></a>

### Utils.funcToString(func) ⇒ <code>string</code>
Stringifies a function

**Kind**: static method of [<code>Utils</code>](#Utils)  
**Returns**: <code>string</code> - Stringified function.  

| Param | Type | Description |
| --- | --- | --- |
| func | <code>function</code> | Function to stringify. |

<a name="Utils.buildWorker"></a>

### Utils.buildWorker()
_buildWorker

**Kind**: static method of [<code>Utils</code>](#Utils)  
<a name="Utils.functionToMessage"></a>

### Utils.functionToMessage(func) ⇒ <code>Object</code>
Turn a function into an object for sending to a worker.

**Kind**: static method of [<code>Utils</code>](#Utils)  
**Returns**: <code>Object</code> - Function message object.  

| Param | Type |
| --- | --- |
| func | <code>function</code> | 

<a name="Utils.randomId"></a>

### Utils.randomId(prefix) ⇒ <code>String</code>
Returns a random id.

**Kind**: static method of [<code>Utils</code>](#Utils)  
**Returns**: <code>String</code> - A string id.  

| Param | Type | Description |
| --- | --- | --- |
| prefix | <code>String</code> | A string to prefix the id with. |

<a name="worker"></a>

## worker()
worker

**Kind**: global function  

* [worker()](#worker)
    * [~postResult(message, result)](#worker..postResult)
    * [~postError(message, err)](#worker..postError)
    * [~compile(message)](#worker..compile)
    * [~call(message)](#worker..call)

<a name="worker..postResult"></a>

### worker~postResult(message, result)
Posts the result of a called worker function back to the main thread.

**Kind**: inner method of [<code>worker</code>](#worker)  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>Object</code> | Message object for function called. |
| result | <code>\*</code> | The result of the function call. |

<a name="worker..postError"></a>

### worker~postError(message, err)
Post an error back to the main thread.

**Kind**: inner method of [<code>worker</code>](#worker)  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>Object</code> | the message which called |
| err | <code>Object</code> \| <code>String</code> | The error to post to main thread. |

<a name="worker..compile"></a>

### worker~compile(message)
Create the function from the message object

**Kind**: inner method of [<code>worker</code>](#worker)  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>Object</code> | Message object from main thread. |

<a name="worker..call"></a>

### worker~call(message)
Call the function from the message object.

**Kind**: inner method of [<code>worker</code>](#worker)  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>Object</code> | Message object from main thread. |

