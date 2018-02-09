# JS Runnable

An easy way to do workers kinda??? I dunno, I just wanted to see if it would work.

### Usage

### API:
##### new Runnable()
- Create a new runnnable to spin up workers, and be able to attach functions to them.

##### runnable.add(function)
* Attach a function to the runnable, it returns a wrapped function, that you can call to run the function on the web worker. This call will return a promise resolved with the result of the function call on the worker.
* This should be able to handle most function definition types
* function() {}
  * () => {}
  * a => a + 2;

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

### It tracks internal calls to return the correct results to the correct promise:
```javascript
var runner = new Runnable();
const myWorkerFunction = runner.add((a,b,c,d) => { return a + b + c + d; });
myWorkerFunction(1,2,3,4).then(result => console.log(result));
myWorkerFunction(4,4,4,4).then(result => console.log(result));
```

### Example:
This code is in the [docs](https://vantreeseba.github.io/jsrunnable/) example as well.

```javascript
var x = 4; // To show context cannot pass.

var runner = new Runnable();

const basic = runner.add(() => console.log('hello worker!'));

const noParenWithArg = runner.add(a => console.log('soup', a));

const withArgs = runner.add((a, b, c) => console.log('soup', a, b, c));

// Function trying to capture context.
// const context = runner.add(() => console.log('I explode!', x));

const returnResult = runner.add(() => {
  return 2 + 2;
});

const returnResult2 = runner.add(() => {
  return 2 + 5;
});

const returnResult3 = runner.add((a, b) => {
  return a + b;
});

basic();
noParenWithArg(1);
returnResult().then(result => console.log(result));
returnResult2().then(result => console.log(result));

for(var i = 0; i < 10; i++) {
  returnResult3(i, 0).then(result => console.log(result));
}
```
