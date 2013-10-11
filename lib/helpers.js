
/** Selenium Webdriver helper functions **/

var async = require('async')
  , wd = require('wd')
  , _ = require('underscore')

  , utils = require('wd/lib/utils')

module.exports = {
  ensureCookie: ensureCookie,
  fillInForm: fillInForm,
  asyncFunction: asyncFunction,
  rel: rel,
  textBy: textBy,
  valueBy: valueBy,
  attrBy: attrBy,
  moveToBy: moveToBy,
  visibleBy: visibleBy,
  clickBy: clickBy,
  waitAndClick: waitAndClick,
  waitAndGet: waitAndGet
};

function rel(driver, url, done) {
  driver.get(driver.baseUrl + url, done);
}

function textBy(driver, using, value, done) {
  driver.element(using, value, function (err, el) {
    if (err) return done(err);
    el.text(function (err, text) {
      done(err, text, el);
    });
  });
}

function attrBy(driver, using, value, attr, done) {
  driver.element(using, value, function (err, el) {
    if (err) return done(err);
    el.getAttribute(attr, function (err, value) {
      done(err, value, el);
    });
  });
}

function moveToBy(driver, using, value, done) {
  driver.element(using, value, function (err, el) {
    if (err) return done(err);
    driver.moveTo(el, function (err) {
      done(err, el);
    });
  });
}

function visibleBy(driver, using, value, done) {
  driver.element(using, value, function (err, el) {
    if (err) return done(err);
    el.isDisplayed(function (err, displayed) {
      done(err, displayed, el);
    });
  });
}

function valueBy(driver, using, value, done) {
  driver.element(using, value, function (err, el) {
    if (err) return done(err);
    driver.getValue(el, function (err, value) {
      done(err, value, el);
    });
  });
}

function clickBy(driver, using, value, done) {
  driver.element(using, value, function (err, el) {
    if (err) return done(err);
    el.click(function (err) {
      return done(err, el);
    });
  });
}

function waitAndClick(driver, using, value, timeout, done) {
  driver.waitAndGet(using, value, timeout, function (err, elements) {
    if (err) return done(err);
    if (!elements.length) return done(new Error('Element not found'));
    elements[0].click(done);
  });
}

function waitAndGet(driver, using, value, timeout, done) {
  var endTime = Date.now() + timeout;

  var poll = function(){
    driver.elements(using, value, function(err, elements){
      if(err){
        return done(err);
      }

      if (elements.length) {
        done(null, elements);
      } else {
        if(Date.now() > endTime){
          done(new Error("Element didn't appear"));
        } else {
          setTimeout(poll, 200);
        }
      }
    });
  };

  poll();
}

var extension = {};
for (var name in module.exports) {
  extension[name] = wrap(module.exports[name]);
}
module.exports.extension = extension;

module.exports.parseFunction = parseFunction;

_.each(utils.elementFuncTypes, function(type) {

  /**
   * valueByClassName(value, cb) -> cb(err, element)
   * ...
   *
   * @jsonWire POST /session/:sessionId/element
   */
  extension['value' + utils.elFuncSuffix(type)] = function(value, cb) {
    valueBy.apply(this, [this, utils.elFuncFullType(type), value, cb]);
  };

  extension['moveTo' + utils.elFuncSuffix(type)] = function(value, cb) {
    moveToBy.apply(this, [this, utils.elFuncFullType(type), value, cb]);
  };

  extension['attr' + utils.elFuncSuffix(type)] = function(value, attr, cb) {
    attrBy.apply(this, [this, utils.elFuncFullType(type), value, attr, cb]);
  };

  extension['text' + utils.elFuncSuffix(type)] = function(value, cb) {
    textBy.apply(this, [this, utils.elFuncFullType(type), value, cb]);
  };

  extension['visible' + utils.elFuncSuffix(type)] = function(value, cb) {
    visibleBy.apply(this, [this, utils.elFuncFullType(type), value, cb]);
  };

  /**
   * clickByClassName(value, cb) -> cb(err, element)
   * ...
   *
   * @jsonWire POST /session/:sessionId/element
   */
  extension['click' + utils.elFuncSuffix(type)] = function(value, cb) {
    clickBy.apply(this, [this, utils.elFuncFullType(type), value, cb]);
  };

  /**
   * waitAndGetByClassName(value, timeout, cb) -> cb(err)
   * ...
   */

  extension['waitAndGet' + utils.elFuncSuffix(type)] = function(value, timeout, cb) {
    waitAndGet.apply(this, [this, utils.elFuncFullType(type), value, timeout, cb]);
  };

  extension['waitAndClick' + utils.elFuncSuffix(type)] = function(value, timeout, cb) {
    waitAndClick.apply(this, [this, utils.elFuncFullType(type), value, timeout, cb]);
  };

});


function wrap(fn) {
  return function () {
    return fn.apply(null, [this].concat([].slice.call(arguments)));
  };
}

function parseFunction(method) {
  var text = method.toString()
    , body = text.substring(text.indexOf('{') + 1, text.lastIndexOf('}') - 1)
    , args = text.split('(')[1].split(')')[0].split(',').map(Function.call.bind(''.trim))
    , decl;
  if (args.length !== method.length) {
    throw new Error('Failed to parse async method: bad arguments. ' + JSON.stringify(args) + '; should be ' + method.length);
  }
  if (!args.length) return body;
  decl = '  var ' + args.map(function (name, i) {
    return name + ' = arguments[' + i + ']';
  }).join('\n    , ') + ';';
  return decl + '\n' + body;
}

// usage: (driver, method, arg, arg, ..., callback)
function asyncFunction(driver, method) {
  var args = [].slice.call(arguments, 2)
    , done = args.pop()
    , body = parseFunction(method);
  if ('function' !== typeof done) {
    throw new Error('Last argument to `asyncFunction` must be a callback function');
  }
  driver.executeAsync(body, args, function (err, result) {
    done(err, result);
  });
}

// Set a cookie. If the cookie is already set, we don't re-set it.
//   b: driver
//   name: cookie name
//   value: string or fn(curvalue) -> newvalue
//   done(err): continuation
function ensureCookie(b, name, value, done) {
  b.allCookies(function (err, cookies) {
    if (err) return done(err);
    var cookie = cookies.reduce(function (got, cookie) {
      if (got) return got;
      if (cookie.name === name) return cookie;
      return null;
    }, null);
    if (!cookie) return done(new Error('No "' + name + '" cookie'));
    if ('function' === typeof value) {
      value = value(cookie.value);
    }
    if (value === cookie.value) {
      return done();
    }
    b.deleteCookie(name, function (err) {
      if (err) return done(err);
      b.setCookie(cookie, function (err) {
        if (err) return done(err);
        b.refresh(function (err) {
          if (err) return done(err);
          // validate that the cookie was indeed set
          b.allCookies(function (err, cookies) {
            var cookie = cookies.reduce(function (got, cookie) {
              if (got) return got;
              if (cookie.name === name) return cookie;
              return null;
            }, null);
            if (!cookie) return done(new Error('No "' + name + '" cookie after setting'));
            if (cookie.value !== value) {
              return done(new Error('unable to set "' + name + '" cookie'));
            }
            return done();
          });
       });
     });
   });
  });
}

// Fill in a form with data
//   driver: driver
//   data: {name: value, ...}
//   form: selector for form. null for global lookup
//   then(err): continuation
// fillInForm(driver, data, then)
// fillInForm(driver, data, formSelector, then)
function fillInForm(driver, data, formSelector, then) {
  if (arguments.length === 3) {
    then = formSelector;
    formSelector = null;
  }
  var keys = Object.keys(data)
    , steps = [];
  keys.forEach(function (key) {
    var value, getter;
    value = data[key];
    if (formSelector) {
      getter = driver.elementByCss.bind(driver, formSelector + ' [name="' + key + '"]');
    } else {
      getter = driver.elementByName.bind(driver, key);
    }
    steps.push(function (next) {
      getter(function (err, el) {
        if (err) return then(err);
        el.type(value, function (err) {
          if (err) return then(err);
          next(null, getter);
        });
      });
    });
  });
  async.series(steps, function (err, els) {
    if (err) return then(err);
    els[els.length - 1](function (err, el) {
      if (err) return then(err);
      el.type(wd.SPECIAL_KEYS.Tab, then);
    });
  });
}
