function foo(){
  console.log('from worker');
}

function foo2(a, b, c) {
  console.log('look ma args!', a, b + c);
}


var thread = new Runnable();
thread.add(foo);
thread.add(foo2);
const thing = thread.add(() => {
  console.log('soup');
});

thread.call(foo);
thread.call(foo2, 1, 2, 3);
thread.call(thing);

console.log(thread._workerOpMap);

console.log('yo');
