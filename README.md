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
