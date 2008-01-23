var v1 = new GV;
var v2 = new GV;
function reset() {
    v1.set(null);
    v2.set(null);
}

var object = Fluently.make(function(define) {
    define('v1', function(v) {v1.set(v)}),
    define('v11', function() {v1.set(1)}),
    define('v12', function() {v1.set(2)});
    define('v21', function() {v2.set(1)}),
    define('v22', function() {v2.set(2)});
    define.empty('run');
});

// calling a method should execute its definition
calling(function() {object.v11()}).should.set(v1).to(1);
calling(function() {object.v12()}).should.set(v1).to(2);

// calling chained methods should execute them all

// calling a method that returns a value should evaluate to that value

// defining a path should define a method with that path

// defining an empty word

// defining an alias

// defining a modifier should affect the environment of
// downstream calls in the same chain

// a modifier shouldn't affect other chains

// a property should invoke its function if it's followed by
// another definition

function GV() {}
GV.prototype = {
    get:function() { return this.value },
    set:function(value) { this.value = value }
}
