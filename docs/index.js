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
}, 4);

basic();
noParenWithArg(1);
returnResult().then(result => console.log(result));
returnResult2().then(result => console.log(result));

for(var i = 0; i < 10; i++) {
  returnResult3(i, 0).then(result => console.log(result));
}
