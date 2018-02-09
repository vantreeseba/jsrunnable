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

basic();
withArgs(1, 2, 3);
var result = returnResult();

console.log(result);

