
var spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , async = require('async')
  , httpcheck = require('httpcheck')
  , _ = require('underscore')
  , shellParse = require('shell-quote').parse

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
function setup(appCmd, apport, driverPort, appdir, browser, done) {
  var ready = {};
  function next(which) {
    ready[which] = true;
    if ((!apport || ready.app) && (!driverPort || ready.driver)) {
      console.log('');
      done();
    }
  }
  return {
    app: apport && startApp(appCmd, appdir, apport, next.bind(null, 'app')),
    driver: driverPort && startDriver(browser, driverPort, next.bind(null, 'driver'))
  };
}

function killRunning(running, done) {
  if (!running.app && !running.driver) return done();
  if (running.app) {
    running.app.kill('SIGTERM');
  }
  if (running.driver) {
    running.driver.kill();
  }
  return done();
}


// Kill the local server and webdriver, if they were started
function teardown(running, drivers, done) {
  if (!drivers || !drivers.length) {
    return killRunning(running, done);
  }
}

var DRIVERS = {
  chrome: {
    cmd: 'chromedriver',
    args: ['--url-base=wd/hub', "--verbose=1"],
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
  var child = spawn(config.cmd, config.args.concat([config.port + port]));
  child.stderr.pipe(process.stderr)
  child.stdout.pipe(process.stdout)
  var out = '';
  function listen(data) {
    out += data.toString();
    // console.log([data.toString()])
    if (data.toString().indexOf(config.listen) !== -1) {
      // Verify GET /status returns 200 to avoid race
      httpcheck({url: "http://localhost:" + port + "/wd/hub/status",
        check: function(res) {
          return res && res.statusCode === 200
        }
      }, function(err) {
        if (err) {
          console.error(utils.color("\nFailed to start driver: ", 31)+ err)
          process.exit(1);
        }
        console.log(utils.color('  [webdriver ready]', 32));
        child.stdout.removeListener('data', listen);

        child.removeListener('exit', exit);
        next();
      })

    }
  }
  function exit() {
    console.log('\n' + out);
    console.error(utils.color('\nFailed to start webdriver ' + name + '!\nPlease make sure you have the required binary "' + config.cmd + '" available on your $PATH. Quiting', 31));
    process.exit(1);
  }
  child.on('exit', exit);
  child.on('error', exit);
  child.stdout.on('data', listen);
  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)
  return child;
}

function foreman(appdir, port) {
  return spawn('foreman', ['start', '-p', port], {
    cwd: appdir,
    stdio: [null, 'pipe', process.stderr]
  });
}

function appCmd(cmd, args, appdir, port) {
  return spawn(cmd, args, {
    env: _.extend({}, process.env, {PORT: port}),
    cwd: appdir,
    stdio: [null, 'pipe', 'pipe']
  });
}

function startApp(cmd, appdir, port, next) {
  if (cmd) cmd = shellParse(cmd)
  var app = cmd ? appCmd(cmd[0], cmd.slice(1), appdir, port) : foreman(appdir, port)
  console.log(utils.color('  [starting app on port ' + port + ' in directory ' + appdir + ']', 32));
  var out = '';
  function listen(data) {
    out += data.toString();
    if (data.toString().indexOf('listening on port') !== -1) {
      app.stdout.removeListener('data', listen);
      app.stdout.pipe(process.stdout);
      app.stderr.pipe(process.stderr);
      app.removeListener('exit', exit);
      app.on('exit', function () {
        app.hasExited = true;
      });
      httpcheck({
        url:"http://localhost:" + port + "/status",
        check: function(res) {
          return res && res.statusCode === 200;
        }
      }, function(err) {
        if (err) {
          console.error("App has not started up");
          process.exit(1);
        }
        console.log(utils.color('  [your app is ready]', 32));
        next();
      })
    }
  }
  function exit() {
    console.log('\n' + out);
    console.log(">>", cmd, appdir, port)
    console.error(utils.color("\nFailed to start app!\nIf you're not in your app's root directory, be sure to set the env variable APP_HOME. Quiting", 31));
    process.exit(1);
  }
  app.on('exit', exit);
  app.on('error', exit);
  app.stdout.on('data', listen);
  app.stderr.on('data', function (data) {
    out += data.toString();
  });
  app.stdout.pipe(process.stdout)
  app.stderr.pipe(process.stderr)
  return app;
}
