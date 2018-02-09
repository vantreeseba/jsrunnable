function foo(){
  console.log('from worker');
}

function foo2(a, b, c) {
  console.log('look ma args!', a, b + c);
}

var x = 4;

function foo3() {
  console.log('I explode.', x);
}


var thread = new Runnable();
thread.add(foo);
thread.add(foo2);
thread.add(foo3);
const thing = thread.add(() => {
  console.log('soup');
});

thread.call(foo);
thread.call(foo2, 1, 2, 3);
thread.call(foo3);
thread.call(thing);

console.log(thread._workerOpMap);

console.log('yo');
