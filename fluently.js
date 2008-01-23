/* Copyright 2007 by Oliver Steele.  Released under the MIT License. */

var HopKit = {
    // returns a new object initialized by `fn`.  `fn` is passed a single
    // argument `define` which defines chainable functions of the object.
    make:function(fn) {
        var host = {},
            finalizers = [],
            modifiers;

        define.alias = function(target, source) {
            path(target).set(host[source]);
        }
        define.empty = function(name) {
            host[name] = host;
        }
        define.modifier = function(name) {
            modifiers[name] = false;
            defineSetter(name, modifiers, name, true);
        }
        define.modifier.dictionary = function(object) {
            modifiers = object;
        }

        fn(define);
        for (var i = 0; i < finalizers.length; i++)
            finalizers[i]();
        return host;

        function define(name, fn) {
            if (arguments.length > 1) {
                host[name] = function() {
                    var value = fn.apply(this, arguments);
                    return typeof value == 'undefined' ? host : value;
                }
            } else {
                return {
                    sets:function(object, propertyName, value) {
                        if (arguments.length > 2)
                            defineSetter(name, object, propertyName, value);
                        return {
                            to:function(value) {
                                defineSetter(name, object, propertyName, value);
                            }
                        }
                    }
                }
            }
        }
        function path(name) {
            var target = host;
            if (name.indexOf('.') >= 0) {
                var components = name.split('.');
                while (components.length > 1)
                    target = target[components.shift()];
                name = components[0];
            }
            return {target:target, name:name,
                    get:function() {return target[name]},
                    set:function(value) {target[name] = value}}
        }
        function defineSetter(methodName, object, propertyName, value) {
            host[methodName] = makeSetter(function() {
                object[propertyName]=value;
            });
        }
        // returns an object that is like host, except that all of its functions
        // call `before` first
        function makeSetter(before) {
            var modifier = {};
            finalizers.push(function() {
                for (var propertyName in host) {
                    var value = host[propertyName];
                    if (value == host)
                        value = modifier;
                    else if (typeof value == 'function')
                        value = adviseBefore(value, before);
                    modifier[propertyName] = value
                }
            });
            return modifier;
        }
        // returns a function equivalent to `fn`, except that `before`
        // is called first
        function adviseBefore(fn, before) {
            return function() {
                before.apply(this, arguments);
                return fn.apply(this, arguments);
            }
        }
    }
};
