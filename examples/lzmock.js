/* Copyright 2007 by Oliver Steele.  Released under the MIT License. */

var Mock = {
    configure: function(options) {
        this.options = options;
    },
    create: function(master) {
        return new MockObject(master);
    },
    callback: function(value) {
        return new this.Callback(value);
    },
    expectEvent: function(sender, eventName, expectationValue) {
        var self = this,
            delegate = new LzDelegate({run:run}, 'run', sender, eventName)
        delegate.sender = sender;
        delegate.eventName = eventName;
        delegate.error = 'was not sent';
        this._events.push(delegate);
        function run(value) {
            if (!delegate.error)
                return;
            delegate.error = 'was called, but with the wrong arguments';
            if (typeof expectationValue == 'undefined' && typeof value == 'undefined'
                || Expect.value(expectationValue, value, function() {
                    delegate.error = Array.slice(arguments, 0);
                }))
                delegate.error = null;
        }
    },
    verify: function(testCase) {
        var mocks = this['_registered'] || [];
        delete this.mocks;
        for (var i = 0; i < mocks.length; i++)
            mocks[i].mock.verify(testCase);
    },
    verifyEvents: function(fail) {
        var events = this._events;
        this._events = [];
        for (var i = 0; i < events.length; i++) {
            var delegate = events[i];
            delegate.unregisterAll();
            if (delegate.error)
                fail.apply(null, [delegate.sender+'.'+delegate.eventName+':']
                           .concat(delegate.error));
        }
    },
    // private:
    _register: function(mock) {
        (this._registered = this['_registered'] || []).push(mock);
    },
    _events: [],
    Callback: function(value) {
        this.exec = function(fn) {
            if (fn instanceof Function)
                this['async']
                ? setTimeout(function() {fn.call(null, value)}, 10)
                : fn.call(null, value);
        }
    }
}


function MockObject(master) {
    var self = this,
        expector = {},
        expectations = [],
        stubs = {},
        error = false,
        errors = [];
    Mock._register(this);
    addMethods(master);
    typeof master == 'function' && addMethods(new master);
    this.mock = {expects: expector, verify: verify};
    this.stubs = this.stub = function(name) {
        var callback = null,
            returnValue = null,
            stub = stubs[name] = {
                applyTo:function(args) {
                    Mock['trace'] && Debug.write('stub', name, args);
                    if (callback)
                        for (var i = 0; i < args.length; i++) {
                            if (typeof args[i] == 'function') {
                                args[i].apply(null, callback);
                                break;
                            }
                        }
                    return typeof returnValue ? undefined : returnValue[0];
                },
                callback:function(value) {
                    callback = Array.slice(arguments, 0);
                },
                calling:function(value) {
                    callback = Array.slice(arguments, 0);
                },
                returning:function(value) {
                    returnValue = [value];
                }
            };
        stub.by = stub.and = stub;
        return stub;
    };
    function addMethods(object) {
        for (var name in object)
            typeof object[name] == 'function' && addMethod(name);
    }
    function addMethod(name) {
        self[name] = function() {
            Mock['trace'] && Debug.write('call', name, arguments);
            // stop checking if we've already had an error
            if (error) return;
            var stub = stubs[name];
            // if there's no expectation, or this isn't the next
            // expectation, then it's only okay if there's a stub
            if (!expectations.length || expectations[0].name != name) {
                return stub
                    ? stub.applyTo(arguments)
                    : fail(['unexpected call to ', master, '.', name, '()'].
                           join(''));
            }
            var expectation = expectations.shift(),
                actualArgs = arguments;
            Expect.arguments(expectation.arguments, arguments, function() {
                var args = [[master, '.', name, '(): '].join('')];
                args = args.concat(arguments);
                args.push('; received');
                args = args.concat(actualArgs);
                fail.apply(null, args);
            });
            for (var ix = 0; ix < arguments.length; ix++)
                if (expectation.arguments[ix] instanceof Mock.Callback)
                    expectation.arguments[ix].exec(arguments[ix]);
            if (stub)
                return stub.applyTo(arguments);
            return expectation.value;
        };
        expector[name] = function() {
            Mock['trace'] && Debug.write('expect', name, arguments);
            var options = {},
                expectation = {
                    name: name,
                    arguments: Array.slice(arguments, 0),
                    value: null
                };
            expectations.push(expectation);

            return Fluently.make(function(define) {
                define('calls', calls),
                define('returns', returns);
                define.alias('calls.back', 'calls');
                define.empty('and');
                define.modifier.dictionary(options);
                define.modifier('eventually');
            });

            function calls(pos, value) {
                if (arguments.length < 2) {
                    var args = expectation.arguments,
                        len = args.length;
                    value = pos;
                    for (var i = 0; i < len; i++)
                        if (args[i] == Function) {
                            pos = i;
                            break;
                        }
                }
                var cb = expectation.arguments[pos] = Mock.callback(value);
                cb.async = options.eventually;
            };
            function returns(value) {
                expectation.value = value;
            }
        }
    }
    function fail() {
        Debug.error.apply(Debug, arguments);
        errors.push(Array.slice(arguments, 0));
        error = true;
    }
    function verify(testcase) {
        expectations.length &&
            fail(['expected call to ', master, '.', expectations[0].name,
                  '(); didn\'t happen'].join(''));
        if (arguments.length) {
            for (var ix = 0; ix < errors.length; ix++)
                testcase.fail(errors[ix].join(' '));
            errors.length || testcase.assertTrue(true);
        }
        expectations = [];
        errors = [];
        error = false;
        Mock.verifyEvents(function() {
            fail.apply(null, arguments);
            testcase.fail(Array.slice(arguments, 0).join(' '));
        });
    }
}

var Expect = {
    limit: null,

    arguments: function(expect, actual, fail) {
        if (expect.length != actual.length)
            return fail(['expected ', expect.length, ' arguments'].join(''));
        for (var ix = 0; ix < arguments.length; ix++) {
            var e = expect[ix],
                a = actual[ix];
            if (!this.value(e, a, fail))
                return fail('expected', e, 'at position ' + (ix+1));
        }
    },

    value: function(expect, actual, fail) {
        if (expect == actual)
            return true;
        if (this.limit != null) {
            if (this.limit <= 0)
                return;
            this.limit -= 1;
            0 && Debug.write('cf', expect, 'and', actual);
        }
        if (expect instanceof Function &&
            (actual instanceof expect || actual === null))
            return true;
        if (expect instanceof Function)
            return fail('oops!', expect, 'is a function');
        if (expect instanceof LzDataElement)
            return this.xml(expect, actual, fail);
        if (expect instanceof Mock.Callback)
            return !actual || typeof actual == 'function' || actual instanceof LzDelegate;
        //if (expect.__proto__ != actual.__proto__)
        //    return fail(expect, 'and', actual, 'have different prototypes');
        if (typeof expect == 'object' && typeof actual == 'object') {
            for (var name in expect)
                if (!this.value(expect[name], actual[name], fail))
                    return false;
            return true;
        }
        fail('expected', expect, '; received ', actual);
        return false;
    },

    xml: function(expect, actual, fail) {
        if (expect.nodeName != actual.nodeName) {
            fail(expect.nodeName, actual.nodeName, 'node name');
            return false;
        }
        var eattributes = expect['attributes']||{},
            echildren = expect['childNodes']||[];
        for (var aname in eattributes) {
            var evalue = expect.attributes[aname],
                avalue = actual.attributes[aname],
                context = 'attribute '+expect.nodeName+'.@'+aname;
            if (typeof avalue == 'undefined')
                return failed(evalue, avalue);
            if (evalue == '*')
                continue;
            if (evalue.charAt(0) == '{' && evalue.charAt(evalue.length-1) == '}')
                evalue = eval(evalue.substring(1, evalue.length-1));
            switch (evalue) {
            case Number:
                if (typeof avalue != 'number' && parseInt(avalue) != avalue)
                    return failed(evalue, avalue);
                break;
            case String:
                break;
            default:
                if (evalue != avalue)
                    return failed(evalue, avalue);
            }
        }
        var includesText = false;
        for (var ix = 0; ix < echildren.length; ix++) {
            var echild = echildren[ix];
            if (echild instanceof LzDataText) {
                includesText = true;
                continue;
            }
            var cname = echild.nodeName,
                achild = null,
                context = 'element ' + expect.nodeName+'.'+cname;
            for (var j = 0; j < actual.childNodes.length; j++) {
                if (actual.childNodes[j]['nodeName'] == cname)
                    achild = achild || actual.childNodes[j];
            }
            if (!achild)
                return failed(echild, achild, context);
            if (echild['text']) {
                if (echild.text != achild.childNodes[0].data)
                    return failed(echild.text, achild);
            } else
                Expect.value(echild, achild, failed);
        }
        includesText && Expect.value(expect.toString(), actual.toString(), fail);
        function failed(expect, actual) {
            fail(context + ': expected ', expect, '; received ', actual);
            return false;
        }
    }
}

Array['slice'] || (Array.slice = (function() {
    var slice = Array.prototype.slice;
    return function(array) {
        return slice.apply(array, slice.call(arguments, 1));
    }
})());