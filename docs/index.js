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
  return 'promise 1';
}, 32);

const withInternalPromise = runner.add(() => {
  return 'promise 2';
  // return new Promise((resolve, reject) => {
    // setTimeout(() => resolve('promise 2'), 0);
  // });
}, 32)

// const withInterval = runner.add(() => {
//   setInterval(()=>resolve('interval'), 2000);
// });

// let res = 0;
// let res1 = 1;
// setInterval(() => returnResult3(res, res1).then((ret) => {
//   res += ret;
//   console.log('interval', res);
// }), 2000);

const raf = async (funcs) => {
  let count = 0;
  let time = [];

  const internal = async () => {
    let t1 = performance.now();
    const results = await Promise.all(funcs.map(x => x()));
    let t2 = performance.now();

    time.push(t2 - t1);

    console.log('took: ', t2 - t1);

    count++;

    if (count > 100) {
      const ms = time.reduce((acc, cur) => acc += cur, 0) / time.length;
      console.log('on avg, took: ', ms);
      return;
    }

    window.requestAnimationFrame(internal);
  }

  internal();
}

//Give time for workers to compile.
setTimeout(() => {
  console.log('done compiling, runnning');
  raf([returnResult3, withInternalPromise], 'result 3');
}, 500);


basic();
noParenWithArg(1);
returnResult().then(result => console.log(result));
returnResult2().then(result => console.log(result));
withInternalPromise().then(result => console.log(result));

for (var i = 0; i < 10; i++) {
  returnResult3(i, 0).then(result => console.log(result));
}
