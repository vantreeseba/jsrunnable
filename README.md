# JS Runnable

An easy way to do workers kinda??? I dunno, I just wanted to see if it would work.

### Example
This code is in the [docs](https://vantreeseba.github.io/jsrunnable/) example as well.

```

var x = 4; // To show context cannot pass.

var runner = new Runnable();

// Simple basic function
const basic = runner.add(() => console.log('hello worker!'));

// Function with args
const withArgs = runner.add((a, b, c) => console.log(a, b, c));

// Function trying to capture context.
// const context = runner.add(() => console.log('I explode!', x));

const returnResult = runner.add(() => {
  return 2 + 2;
});

const returnResult2 = runner.add(() => {
  return 2 + 5;
});

basic();
withArgs(1, 2, 3);
returnResult().then(result => console.log(result));
returnResult2().then(result => console.log(result));
```
