
var net = require('net');

module.exports = {
  envServer: envServer,
  envBrowser: envBrowser,
  getPort: getPort
};

function envServer() {
  if (!process.env.SEL_HOST) return 'dev';
  return {
    host: process.env.SEL_HOST,
    port: process.env.SEL_PORT,
    username: process.env.SEL_USERNAME,
    password: process.env.SEL_PASSWORD
  };
}

function envBrowser() {
  if (!process.env.SEL_BROWSER) return ['chrome', '', 'ANY'];
  return [
    process.env.SEL_BROWSER,
    process.env.SEL_VERSION || '',
    process.env.SEL_PLATFORM || 'ANY'
  ];
}

// not currently used.
function getPort(from, to, done) {
  var port = from + parseInt(Math.random() * (to - from), 10)
    , server = net.createServer();
  server.listen(port, function (err) {
    if (err) return getPort(from, to, done);
    server.once('close', function () {
      done(port);
    });
    server.close();
  });
  server.on('error', function () {
    getPort(from, to, done);
  });
}
