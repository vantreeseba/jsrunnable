function foo(){
  console.log('from worker');
}

function foo2(){
  console.log('from worker 2');
}

var thread = new Runnable([foo, foo, foo2]);

thread.compile();
thread.call(foo);

console.log('yo');
