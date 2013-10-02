/* globals $:true, document:true */

/** CLIENT SIDE
 *  the following functions are passed into the browser as text. They
 *  are not evaluated on the serverside. **/

module.exports = {
  afterXhr: afterXhr,
  snoopXhr: snoopXhr,
  catchXhr: catchXhr
};

function wrap(method) {
  return function () {
    var args = [].slice.call(arguments);
    this.asyncFunction.apply(this, [method].concat(args));
  };
}

var extension = {};
for (var name in module.exports) {
  extension[name] = wrap(module.exports[name]);
}
module.exports.extension = extension;

function catchXhr(match, cb) {
  if (arguments.length === 1) {
    cb = match;
    match = null;
  }
  console.log('matching', match);
  var rx = new RegExp(match);
  function handler(evt, res, req) {
    if (match && !req.url.match(rx)) {
      console.log('xhr, but no match', req.url, match);
    }
    var body = null;
    try {
      body = JSON.parse(res.responseText);
    } catch (e) {}
    $(document).off('ajaxComplete', handler);
    cb({
      body: body,
      status: res.status,
      text: res.responseText,
      headers: res.getAllResponseHeaders(),
      sent: {
        data: req.data,
        accept: req.Accept,
        contentType: req.contentType,
        url: req.url
      }
    });
  }
  $(document).on('ajaxComplete', handler);
}

function afterXhr(timeout, cb) {
  if (!cb) {
    cb = timeout;
    timeout = 0;
  }
  $(document).one('ajaxComplete', function (evt, res, req) {
    console.log(res, req, res.getAllResponseHeaders());
    var body = null;
    try {
      body = JSON.parse(res.responseText);
    } catch (e) {}
    setTimeout(function () {
      cb({
        status: res.status,
        text: res.responseText,
        body: body,
        headers: res.getAllResponseHeaders(),
        sent: {
          data: req.data,
          accept: req.Accept,
          contentType: req.contentType,
          url: req.url
        }
      });
    }, timeout);
  });
}

function snoopXhr(cb) {
  $(document).one('ajaxComplete', function (evt, res, req) {
    console.log(res, req, res.getAllResponseHeaders());
    var body = null;
    try {
      body = JSON.parse(res.responseText);
    } catch (e) {}
    cb({
      status: res.status,
      text: res.responseText,
      body: body,
      headers: res.getAllResponseHeaders(),
      sent: {
        data: req.data,
        accept: req.Accept,
        contentType: req.contentType,
        url: req.url
      }
    });
  });
}
