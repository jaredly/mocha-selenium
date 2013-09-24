
/** Selenium Webdriver helper functions **/

var async = require('async')
  , wd = require('wd');

module.exports = {
  ensureCookie: ensureCookie,
  fillInForm: fillInForm
};

// Set a cookie
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
//   b: driver
//   data: {name: value, ...}
//   form: selector for form. null for global lookup
//   then(err): continuation
// fillInForm(b, data, then)
// fillInForm(b, data, formSelector, then)
function fillInForm(b, data, formSelector, then) {
  var el, by, key, value;
  if (!then && typeof(formSelector) === 'function') {
    then = formSelector;
    formSelector = null;
  }
  var keys = Object.keys(data);
  var steps = [];
  keys.forEach(function (key) {
    var value, getter;
    value = data[key];
    if (formSelector) {
      getter = b.elementByCss.bind(b, formSelector + ' [name="' + key + '"]');
    } else {
      getter = b.elementByName.bind(b, key);
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
