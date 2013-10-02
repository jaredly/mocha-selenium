
/** Selenium Webdriver helper functions **/

var async = require('async')
  , wd = require('wd');

module.exports = {
  ensureCookie: ensureCookie,
  fillInForm: fillInForm,
  parseFunction: parseFunction,
  asyncFunction: asyncFunction,
  extension: {
    ensureCookie: wrap(ensureCookie),
    fillInForm: wrap(fillInForm),
    asyncFunction: wrap(asyncFunction)
  }
};

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
