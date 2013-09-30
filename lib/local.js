
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
    if ((!apport || ready.app) && (!driverPort || ready.driver)) {
      console.log('');
      done();
    }
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
    port: '--port=',
    listen: 'on port'
  },
  phantomjs: {
    cmd: 'phantomjs',
    args: [],
    port: '--webdriver=',
    listen: 'running on port'
  }
};

function startDriver(browser, port, next) {
  var name = browser[0].toLowerCase()
    , config = DRIVERS.chrome;

  console.log(utils.color('  [starting webdriver]', 32));
  if (name.indexOf('phantom') === 0) {
    config = DRIVERS.phantomjs;
  } else if (name.indexOf('chrome') !== 0 && name.indexOf('google') !== 0) {
    console.warn('  No driver for ' + name +'. Using chrome');
  }
  var child = spawn(config.cmd, config.args.concat([config.port + port]), {
    stdio: [null, 'pipe', 'pipe']
  });
  var out = ''
  function listen(data) {
    out += data.toString();
    // console.log([data.toString()])
    if (data.toString().indexOf(config.listen) !== -1) {
      console.log(utils.color('  [webdriver ready]', 32));
      child.stdout.removeListener('data', listen);
      child.removeListener('exit', exit);
      next();
    }
  }
  function exit(exitCode, signal) {
    console.log('\n' + out);
    console.error(utils.color('\nFailed to start webdriver ' + name + '!\nPlease make sure you have the required binary "' + config.cmd + '" available on your $PATH. Quiting', 31));
    process.exit(1);
  }
  child.on('exit', exit);
  child.stdout.on('data', listen);
  return child;
}

function startApp(appdir, port, next) {
  var app = spawn('foreman', ['start', '-p', port], {
        cwd: appdir,
        stdio: [null, 'pipe', process.stderr]
      });
  console.log(utils.color('  [starting foreman]', 32));
  var out = '';
  function listen(data) {
    out += data.toString();
    if (data.toString().indexOf('listening on port') !== -1) {
      console.log(utils.color('  [foreman ready]', 32));
      app.stdout.removeListener('data', listen);
      app.removeListener('exit', exit);
      next();
    }
  }
  function exit(exitCode, signal) {
    console.log('\n' + out);
    console.error(utils.color("\nFailed to start foreman!\nIf you're not in your app's root directory, be sure to set the env variable APP_HOME. Quiting", 31));
    process.exit(1);
  }
  app.on('exit', exit);
  app.stdout.on('data', listen);
  return app;
}
