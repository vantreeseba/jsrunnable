function foo(test, bar){
  console.log('from worker');
}

var thread = new Runnable(foo);

thread.run();
console.log('yo');
