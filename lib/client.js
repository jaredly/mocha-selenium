/* globals $:true, document:true */

/** CLIENT SIDE
 *  the following functions are passed into the browser as text. They
 *  are not evaluated on the serverside. **/

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
