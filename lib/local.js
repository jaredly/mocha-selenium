
var spawn = require('child_process').spawn
  , utils = require('./utils');

module.exports = {
  setup: setup,
  teardown: teardown,
  startDriver: startDriver,
  startApp: startApp
};

// Start the local server & selenium webdriver
// - apport: the port the app should listen on. If apport is falsey, no local server is started
// - driverPort: the port the selenium webdriver should listen on. If falsey, no webdriver is started
// - appdir: the root directory of the app. `foreman` is run with in that directory
// - browser: (default: "chrome") the name of the browser to start. Currently "phantomjs" and "chrome" are supported.
// - done(err)
function setup(apport, driverPort, appdir, browser, done) {
  var ready = {};
  function next(which) {
    ready[which] = true;
    if ((!apport || ready.app) && (!driverPort || ready.driver)) done();
  }
  return {
    app: apport && startApp(appdir, apport, next.bind(null, 'app')),
    driver: driverPort && startDriver(browser, driverPort, next.bind(null, 'driver'))
  };
}

// Kill the local server and webdriver, if they were started
function teardown(running) {
  if (running.app) running.app.kill();
  if (running.driver) running.driver.kill();
}

var DRIVERS = {
  chrome: {
    cmd: 'chromedriver',
    args: ['--url-base=wd/hub'],
    port: '--port='
  },
  phantomjs: {
    cmd: 'phantomjs',
    args: [],
    port: '--webdriver='
  }
};

function startDriver(browser, port, next) {
  var name = browser[0].toLowerCase()
    , config = DRIVERS.chrome;

  console.log(utils.color('  [starting webdriver]', 32));
  if (name.indexOf('phantom') === 0 || name.indexOf('google') === 0) {
    config = DRIVERS.phantomjs;
  } else if (name.indexOf('phantom') !== 0) {
    console.warn('No driver for ' + name +'. Using chrome');
  }
  var child = spawn(config.cmd, config.args.concat([config.port + port]), {
    stdio: [null, 'pipe', 'pipe']
  });
  function listen(data) {
    if (data.toString().indexOf('running on port') !== -1) {
      console.log(utils.color('  [webdriver ready]', 32));
      child.stdout.removeListener('data', listen);
      next();
    }
  }
  child.stdout.on('data', listen);
  return child;
}

function startApp(appdir, port, next) {
  var app = spawn('foreman', ['start', '-p', port], {
        cwd: appdir,
        stdio: [null, 'pipe', process.stderr]
      });
  console.log(utils.color('  [starting foreman]', 32));
  function listen(data) {
    if (data.toString().indexOf('listening on port') !== -1) {
      console.log(utils.color('  [foreman ready]', 32));
      app.stdout.removeListener('data', listen);
      next();
    }
  }
  app.stdout.on('data', listen);
  return app;
}
