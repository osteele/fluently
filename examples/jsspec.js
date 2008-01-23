/* Copyright 2007 by Oliver Steele.  Released under the MIT License. */

var JSSpec = {
    define:function() {
        this.definitions.add.apply(this.definitions, arguments);
    }
}

JSSpec.definitions = {
    definitions:[],

    add:function(name, fn) {
        this.definitions.push([name, fn]);
    },

    defineWith:function(define, options) {
        var definitions = this.definitions;
        for (var i = 0; i < definitions.length; i++) {
            var defn = definitions[i];
            define(defn[0], guard(defn[1]));
        }
        function guard(fn) {
            return function() {
                if (options.positive)
                    return fn.apply(this, arguments);
            }
        }
    }
}

//JSSpec.define.negative = function

JSSpec.Runner = function(target, name) {
    var fn = target,
        args = Array.prototype.slice.call(arguments, 2);
    if (arguments.length > 1) {
        target[name] || Debug.error('unknown method:', name);
        fn = function() { return target[name].apply(target, args) }
    }
    var tests = [],
        options = {positive:true};
    return {
        run:function() {
            var value = fn();
            Mock.verify(options.testCase);
            Mock.verifyEvents(fail);
            runTests();
            return value;
        },
        call:function(target, name) {
            if (!options.positive)
                return;
            var expector = target.mock.expects,
                args = Array.prototype.slice.call(arguments, 2);
            expector[name] || Debug.error("unknown method:", name);
            expector[name].apply(expector, args);
        },
        change:function(target, property) {
            tests.push({target:target, property:property,
                        value:target[property], run:runTest,
                        equals:!options.positive});
        },
        increment:function(target, property) {
            tests.push({target:target, property:property,
                        value:target[property]+1, run:runTest,
                        equals:options.positive});
        },
        _options:options
    }

    function fail() {
        options.testCase.fail(Array.prototype.join.call(arguments, ' '));
    }
    function defineTest(target, property, expected, predicate) {
    }
    function runTests() {
        for (var i = 0; i < tests.length; i++)
            tests[i].run();
    }
    function runTest() {
        var testCase = options.testCase;
        (this.equals ? testCase.assertEquals : testCase.assertNotEquals).call(
            testCase, this.value, this.target[this.property], this.property);
    }
}

JSSpec.calling = function(target, name) {
    var runner = JSSpec.Runner.apply(JSSpec.Runner, arguments),
        options = runner._options,
        runner = HopKit.make(function(define) {
            define('run', runner.run),
            define('call', runner.call);
            define('change', runner.change);
            define('increment', runner.increment);
            define('not').sets(options, 'positive').to(false);
            define('but').sets(options, 'positive').to(true);
            define.alias('now', 'run');
            define.empty('should');
            define.empty('and');
            JSSpec.definitions.defineWith(define, options);
        });
    runner.set = function(key, value) { options[key] = value; return runner; }
    return runner;
}

TestCase.addProperty('calling', function() {
    return JSSpec.calling.apply(JSSpec, arguments).set('testCase', this);
});
