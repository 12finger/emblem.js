// Generated by CoffeeScript 1.3.3
var Preprocessor, StringScanner, inspect;

StringScanner = require('StringScanner');

inspect = function(o) {
  return (require('util')).inspect(o, false, 9e9, true);
};

this.Preprocessor = Preprocessor = (function() {
  var DEDENT, INDENT, TERM, anyWhitespaceAndNewlinesTouchingEOF, any_whitespaceFollowedByNewlines_, processInput, ws;

  ws = '\\t\\x0B\\f \\xA0\\u1680\\u180E\\u2000-\\u200A\\u202F\\u205F\\u3000\\uFEFF';

  INDENT = '\uEFEF';

  DEDENT = '\uEFFE';

  TERM = '\uEFFF';

  anyWhitespaceAndNewlinesTouchingEOF = RegExp("[" + ws + "\\n]*$");

  any_whitespaceFollowedByNewlines_ = RegExp("(?:[" + ws + "]*\\n)+");

  function Preprocessor() {
    this.base = this.indent = null;
    this.context = [];
    this.context.peek = function() {
      if (this.length) {
        return this[this.length - 1];
      } else {
        return null;
      }
    };
    this.context.err = function(c) {
      throw new Error("Unexpected " + inspect(c));
    };
    this.output = '';
    this.context.observe = function(c) {
      var top;
      top = this.peek();
      switch (c) {
        case INDENT:
          this.push(c);
          break;
        case DEDENT:
          if (top !== INDENT) {
            this.err(c);
          }
          this.pop();
          break;
        case '\n':
          if (top !== '/') {
            this.err(c);
          }
          this.pop();
          break;
        case '/':
          this.push(c);
          break;
        case 'end-\\':
          if (top !== '\\') {
            this.err(c);
          }
          this.pop();
          break;
        default:
          throw new Error("undefined token observed: " + c);
      }
      return this;
    };
    this.ss = new StringScanner('');
  }

  Preprocessor.prototype.p = function(s) {
    if (s) {
      this.output += s;
    }
    return s;
  };

  Preprocessor.prototype.scan = function(r) {
    return this.p(this.ss.scan(r));
  };

  processInput = function(isEnd) {
    return function(data) {
      var b, c, delta, level, lines, message, newLevel, tok;
      if (!isEnd) {
        this.ss.concat(data);
      }
      while (!this.ss.eos()) {
        switch (this.context.peek()) {
          case null:
          case INDENT:
            if (this.ss.bol() || this.scan(any_whitespaceFollowedByNewlines_)) {
              this.scan(RegExp("(?:[" + ws + "]*(\\#\\#?(?!\\#)[^\\n]*)?\\n)+"));
              if (!isEnd && ((this.ss.check(RegExp("[" + ws + "\\n]*$"))) != null)) {
                return;
              }
              if (this.base != null) {
                if ((this.scan(this.base)) == null) {
                  throw new Error("inconsistent base indentation");
                }
              } else {
                b = this.scan(RegExp("[" + ws + "]*"));
                this.base = RegExp("" + b);
              }
              if (this.indent != null) {
                level = ((function() {
                  var _i, _len, _ref, _results;
                  _ref = this.context;
                  _results = [];
                  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    c = _ref[_i];
                    if (c === INDENT) {
                      _results.push(0);
                    }
                  }
                  return _results;
                }).call(this)).length;
                if (this.ss.check(RegExp("(?:" + this.indent + "){" + (level + 1) + "}[^" + ws + "#]"))) {
                  this.scan(RegExp("(?:" + this.indent + "){" + (level + 1) + "}"));
                  this.context.observe(INDENT);
                  this.p(INDENT);
                } else if (level > 0 && this.ss.check(RegExp("(?:" + this.indent + "){0," + (level - 1) + "}[^" + ws + "]"))) {
                  newLevel = 0;
                  while (this.scan(RegExp("" + this.indent))) {
                    ++newLevel;
                  }
                  delta = level - newLevel;
                  while (delta--) {
                    this.context.observe(DEDENT);
                    this.p("" + DEDENT + TERM);
                  }
                } else if (this.ss.check(RegExp("(?:" + this.indent + "){" + level + "}[^" + ws + "]"))) {
                  this.scan(RegExp("(?:" + this.indent + "){" + level + "}"));
                } else {
                  lines = this.ss.str.substr(0, this.ss.pos).split(/\n/) || [''];
                  message = "Syntax error on line " + lines.length + ": invalid indentation";
                  throw new Error("" + message);
                }
              } else {
                if (this.indent = this.scan(RegExp("[" + ws + "]+"))) {
                  this.context.observe(INDENT);
                  this.p(INDENT);
                }
              }
            }
            this.scan(/[^\n\\\/]+/);
            if (tok = this.scan(/\//)) {
              this.context.observe(tok);
            }
            break;
          case '/':
            if (this.scan(/.*\n/)) {
              this.context.observe('\n');
            }
            break;
          case '\\':
            if (this.scan(/[\s\S]/)) {
              this.context.observe('end-\\');
            }
        }
      }
      if (isEnd) {
        this.scan(anyWhitespaceAndNewlinesTouchingEOF);
        while (this.context.length && INDENT === this.context.peek()) {
          this.context.observe(DEDENT);
          this.p("" + DEDENT + TERM);
        }
        if (this.context.length) {
          throw new Error('Unclosed ' + (inspect(this.context.peek())) + ' at EOF');
        }
        return;
      }
    };
  };

  Preprocessor.prototype.processData = processInput(false);

  Preprocessor.prototype.processEnd = processInput(true);

  Preprocessor.processSync = function(input) {
    var pre;
    pre = new Preprocessor;
    pre.processData(input);
    pre.processEnd();
    return pre.output;
  };

  return Preprocessor;

})();