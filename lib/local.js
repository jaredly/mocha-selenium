
var spawn = require('child_process').spawn
  , async = require('async')

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

function killNicely(child, timeout, done) {
  if (arguments.length === 2) {
    done = timeout;
    timeout = 1000;
  }
  if (child.hasExited) {
    done(new Error('Child process has already exited'));
  }
  var timeid = setTimeout(function () {
    child.removeListener('exit', exit);
    done(new Error('Child process failed to exit within the specified timeout.'));
  }, timeout);
  child.on('exit', exit);
  function exit() {
    clearTimeout(timeid);
    done();
  }
  child.kill();
}

function killRunning(running, done) {
  if (!running.app && !running.driver) return done();
  var killed = {
    app: !running.app,
    driver: !running.driver
  };
  function iskilled(which) {
    killed[which] = true;
    if (killed.app && killed.driver) done();
  }
  if (running.app) {
    killNicely(running.app, iskilled.bind(null, 'app'));
  }
  if (running.driver) {
    killNicely(running.driver, iskilled.bind(null, 'driver'));
  }
}

function quitDrivers(drivers, done) {
  var tasks = [];
  for (var i=0; i<drivers.length; i++) {
    tasks.push(drivers[i].quit.bind(drivers[i]));
  }
  async.parallel(tasks, function (err) {
    var e;
    if (err) {
      e = new Error('Error shutting down dependent drivers: ' + err.message);
      e.stack = err.stack;
    }
    done(e);
  });
}

// Kill the local server and webdriver, if they were started
function teardown(running, drivers, done) {
  if (!drivers || !drivers.length) {
    return killRunning(running, done);
  }
  quitDrivers(drivers, function (err) {
    killRunning(running, function (err2) {
      done(err || err2);
    });
  });
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

  console.log(utils.color('  [starting ' + config.cmd + ' on port ' + port + ']', 32));
  if (name.indexOf('phantom') === 0) {
    config = DRIVERS.phantomjs;
  } else if (name.indexOf('chrome') !== 0 && name.indexOf('google') !== 0) {
    console.warn('  No driver for ' + name +'. Using chrome');
  }
  var child = spawn(config.cmd, config.args.concat([config.port + port]), {
    stdio: [null, 'pipe', 'pipe']
  });
  var out = '';
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
  function exit() {
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
  console.log(utils.color('  [starting foreman on port ' + port + ' in directory ' + appdir + ']', 32));
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
  function exit() {
    console.log('\n' + out);
    console.error(utils.color("\nFailed to start foreman!\nIf you're not in your app's root directory, be sure to set the env variable APP_HOME. Quiting", 31));
    process.exit(1);
  }
  app.on('exit', exit);
  app.stdout.on('data', listen);
  return app;
}
