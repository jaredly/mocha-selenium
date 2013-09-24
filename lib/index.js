
/* globals describe:true */

var webdriver = require('wd')
  , async = require('async')

  , spawn = require('child_process').spawn

  , utils = require('./utils');

module.exports = {
  client: require('./client'),
  selenium: selenium,
  fromEnv: fromEnv,
  helpers: require('./helpers')
};

function envServer() {
  if (process.env.SEL_HOST === 'dev') return 'dev';
  if (!process.env.SEL_HOST) return null;
  return {
    host: process.env.SEL_HOST,
    port: process.env.SEL_PORT,
    username: process.env.SEL_USERNAME,
    password: process.env.SEL_PASSWORD
  };
}

function envBrowser() {
  if (!process.env.SEL_BROWSER) return ['phantomjs', '', 'ANY'];
  return [
    process.env.SEL_BROWSER,
    process.env.SEL_VERSION || '',
    process.env.SEL_PLATFORM || 'ANY'
  ];
}

function fromEnv(title, body) {
  runOne(title, envServer(), envBrowser(), process.env.SEL_URL || 'http://localhost:5000',  body);
}

function devServer(server, title, appdir, browserConfig, next) {
  var driver = webdriver.remote();
  driver.init({
    browserName: browserConfig[0],
    version: browserConfig[1],
    platform: browserConfig[2],
    name: title
  }, function (err) {
    if (err && err.code === 'ECONNREFUSED') {
      var msg = 'Unable to connect to selenium. Please start a server.\n\n' +
        'If you have the local selenium server, you can run ' +
        '`java -jar /path/to/selenium-server-standalone-2.34.0.jar`\n';
      var newErr = new Error(msg);
      newErr.stack = '';
      return next(newErr);
    }
    next(err, driver);
  });
  return driver;
}

function remoteServer(server, title, appdir, browserConfig, next) {
  console.log('Connecting to server', server.host, server.port);
  var driver = webdriver.remote(server.host, server.port, server.username, server.password);
  driver.init({
    browserName: browserConfig[0],
    version: browserConfig[1],
    platform: browserConfig[2],
    name: title
  }, function (err) {
    if (err && err.code === 'ECONNREFUSED') {
      var msg = 'Unable to connect to selenium server. Please check your config.\n\n' +
        'You can use sauce labs by setting the ENV variables SAUCE_USERNAME and SAUCE_ACCESS_KEY';
      var newErr = new Error(msg);
      newErr.stack = '';
      return next(newErr);
    }
    next(err, driver);
  });
  return driver;
}

var DRIVERS = {
  'chrome': {
    cmd: 'chromedriver',
    args: ['--url-base=wd/hub'],
    port: '--port='
  },
  'phantomjs': {
    cmd: 'phantomjs',
    args: [],
    port: '--webdriver='
  }
};

function localServer(server, title, appdir, browser, next) {
  // start a local chromedriver
  var port = parseInt(Math.random() * 1000, 10) + 4000
    , appport = parseInt(Math.random() * 1000, 10) + 6000
    , name = browser[0].toLowerCase()
    , config = DRIVERS.phantomjs;

  if (name.indexOf('chrome') === 0 || name.indexOf('google') === 0) {
    config = DRIVERS.chrome;
  } else if (name.indexOf('phantom') !== 0) {
    console.warn(name + ' driver not available. Using phantomjs');
  }

  console.log(utils.color('  [starting webdriver and foreman]', 32));
  var child = spawn(config.cmd, config.args.concat([config.port + port]), {
        stdio: [null, 'pipe', 'pipe']
      })
    , app = spawn('foreman', ['start', '-p', appport], {
        cwd: appdir,
        stdio: [null, 'pipe', process.stderr]
      });

  var driver = webdriver.remote('localhost', port)
    , oldquit = driver.quit;

  driver.quit = function (done) {
    oldquit.call(driver, function (err) {
      child.kill();
      app.kill();
      setTimeout(function () {
        done(err);
      }, 5000);
    });
  };
  function connect() {
    if (!childup || !appup) return;
    driver.init({}, function (err) {
      if (err && err.code === 'ECONNREFUSED') {
        var msg = 'Unable to connect to local server.'
          , newErr = new Error(msg);
        newErr.stack = '';
        return next(newErr);
      }
      next(err, driver, 'http://localhost:' + appport);
    });
  }
  var childup = false
    , appup = false;
  function listen(data) {
    if (data.toString().indexOf('listening on port') !== -1) {
      app.stdout.removeListener('data', listen);
      appup = true;
      connect();
    }
  }
  function listen2(data) {
    if (data.toString().indexOf('running on port') !== -1) {
      child.stdout.removeListener('data', listen2);
      childup = true;
      connect();
    }
  }
  app.stdout.on('data', listen);
  child.stdout.on('data', listen2);
  return driver;
}

function runOne(name, server, browserConfig, url, body) {
  var browser = browserConfig[0]
    , version = browserConfig[1]
    , os = browserConfig[2]
    , title = 'Testing ' + name + ' with Selenium: ' + browser +
          (version ? ' version ' + version : '') + (os === 'ANY' ? '' : ' on ' + os);

  describe(title, function () {
    this.timeout(server ? 180000 : 50000);
    body(function getDriver(done) {
      var make = server ? remoteServer : localServer;
      if (server === 'dev') {
        make = devServer;
      }
      return make(server, name, process.env.APP_DIR || process.cwd(), browserConfig, function (err, driver, nurl) {
        if (err) return done(err, driver);
        url = nurl || url;
        driver.get(url, function (err) {
          done(err, driver, url);
        });
      });
    });
  });
}

function selenium(title, server, local, remote, url, body) {
  if (arguments.length === 3) {
    body = remote;
    remote = local;
    local = server;
    server = null;
  }
  if (server === null && process.env.SAUCE_USERNAME) {
    server = {
      host: 'ondemand.saucelabs.com',
      port: 80,
      username: process.env.SAUCE_USERNAME,
      password: process.env.SAUCE_ACCESS_KEY
    };
  }
  (server ? remote : local).forEach(function (browser) {
    runOne(title, server, browser, url, body);
  });
}

