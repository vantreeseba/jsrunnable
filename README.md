# JS Runnable

An easy way to do workers kinda??? I dunno, I just wanted to see if it would work.

### Usage

new Runnable()
- Create a new runnnable to spin up workers, and be able to attach functions to them.

runnable.add(function)
- Attach a function to the runnable, it returns a wrapped function, that you can call to run the function on the web worker. This call will return a promise resolved with the result of the function call on the worker.
- This should be able to handle most function definition types
- - function() {}
- - () => {}
- - a => a + 2;


### Example
This code is in the [docs](https://vantreeseba.github.io/jsrunnable/) example as well.

```
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
