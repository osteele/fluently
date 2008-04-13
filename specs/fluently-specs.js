/* Copyright 2008 by Oliver Steele.  Released under the MIT License. */

describe('Definitions', {
    'should call the right function': function() {
        var chain = Fluently.make(function(define) {
            define('a', function() {return 1});
            define('b', function() {return 2});
        });
        value_of(chain.a()).should_be(1);
        value_of(chain.b()).should_be(2);
    },
    'should chain': function() {
        var trace;
        var chain = Fluently.make(function(define) {
            define('reset', function() {trace = ''});
            define('a', function() {trace += 'a'});
            define('b', function() {trace += 'b'});
            define('trace', function() {return trace});
        });
        value_of(chain.reset().a().trace()).should_be('a');
        value_of(chain.reset().a().b().trace()).should_be('ab');
        value_of(chain.reset().a().b().a().trace()).should_be('aba');
    },
    'should define multipart paths': function() {
        var capture = 1;
        var chain = Fluently.make(function(define) {
            define('a.b', function(n) { capture = n; });
            define('a.c', function(n) { capture = n+1; });
        });
        chain.a.b(1);
        value_of(capture).should_be(1);
        chain.a.c(1);
        value_of(capture).should_be(2);
    },
    'should recognize aliases': function() {
        var chain = Fluently.make(function(define) {
            define('a', function() {return 1});
            define('b', function() {return 2});
            define.alias('self');
            define.alias('alias_a', 'a');
            define.alias('alias_b', 'b');
        });
        value_of(chain.self.a()).should_be(1);
        value_of(chain.alias_a()).should_be(1);
        value_of(chain.alias_b()).should_be(2);
        value_of(chain.self.alias_a()).should_be(1);
    },
    'should apply options': function() {
        var trace;
        var options = {};
        options.reset = function() {
            for (var name in options)
                if (name != 'reset')
                    delete options[name];
        }
        function t(methodName) {
            var optionNames = [];
            for (var name in options)
                name == 'reset' || optionNames.push(name);
            optionNames.sort();
            spans = [methodName, '('];
            for (var ix = 0; ix < optionNames.length; ix++) {
                var name = optionNames[ix];
                ix && spans.push(',');
                spans.push(name);
                options[name] == true || spans.push(':', options[name]);
            }
            spans.push(')');
            trace += spans.join('');
        }
        var chain = Fluently.make(function(define) {
            define.option.dictionary(options);
            define.option('o1');
            define.option('o2');
            define('reset', function() {trace = ''; options.reset()});
            define('a', function() {t('a')});
            define('b', function() {t('b')});
            define('trace', function() {return trace});
        });
        value_of(chain.reset().a().trace()).should_be('a()');
        value_of(chain.reset().a().b().trace()).should_be('a()b()');
        value_of(chain.reset().o1.a().trace()).should_be('a(o1)');
        value_of(chain.reset().o2.a().trace()).should_be('a(o2)');
        // pending:
        // value_of(chain.reset().o1.o2.a().trace()).should_be('a(o1)');
    }
})
