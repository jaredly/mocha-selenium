
/* globals before: true, after: true, afterEach: true */

var webdriver = require('wd')
  , _ = require('underscore')
  , mkdirp = require('mkdirp')
  , superagent = require('superagent')
  , debugs = require('debug')
  , debug = {
      info: debugs('mocha-selenium:info'),
      warning: debugs('mocha-selenium:warn'),
      error: debugs('mocha-selenium:error')
    }

  , path = require('path')
  , fs = require('fs')

  , screenshot = require('./screenshot')
  , helpers = require('./helpers')
  , config = require('./config')
  , client = require('./client')
  , local = require('./local');

module.exports = {
  client: client,
  setup: setup
};

// if setups don't require globally unique apps and servers, just use ones stored here
var singletonRunners = {};

function remote(server) {
  return webdriver.remote(server.host, server.port, server.username, server.password);
}

// ### Setup the driver
// Registers `before`, `after`, and `afterEach` handlers and returns a
// `wd` Webdriver client.
//
// `testname` will be used as the saucelabs session name, if you're using saucelabs.
//
// #### Options
//
// ##### url
// the base url where your app is running. If you pass in something
// falsey, (and there's no `process.env.SEL_URL`) we'll start up a fresh
// server on a random port.
//
// ##### server
// The selenium server. `{host: , port: , username: , password: }`.
// If it's `"dev"`, we'll start up a `chromedriver` or `phantomjs`, based
// on the `browser` argument defaulting to `chromedriver`.
//
// If `server` is null and `process.env.SEL_HOST` is truthy, then the
// server is taken from the following `ENV` variables. If `SEL_HOST`
// is falsey, we'll start up a webdriver for you.
//
// ENV Defaults
//
// - host: `SEL_HOST`
// - port: `SEL_PORT`
// - username: `SEL_USERNAME`,
// - password: `SEL_PASSWORD`
//
// ##### browser
// the browser requirements `[browsername, version, os]`
//
// ENV Defaults
//
// - browsername: `SEL_BROWSER`
// - version: `SEL_VERSION`
// - os: `SEL_PLATFORM`
//
// ##### lastShot
// save screenshots of the final state of each test. `true`: take
// shots for all tests. `"failed"`: only tests that failed. `false`:
// don't take screenshots.
//
// ##### keepAlive
// Don't kill the browser after completing tests. Useful for manually
// inspecting failures.
//
// ##### appDir
// the root directory of your app (so foreman knows). Defaults to the
// env vbl `APP_HOME` or `cwd`.
//
// ##### shotDir
// where to save screenshots. Defaults to `appDir/test/last-shots`.
function setup(testname, options) {
  if (!global.before || !global.after) {
    throw new Error('Global `before` and `after` not found. setup() can only be run in conjunction with mocha');
  }

  options = _.extend({
    appDir: process.env.APP_HOME || process.cwd(),
    appCmd: null,
    browser: config.envBrowser(),
    server: config.envServer(),
    url: process.env.SEL_URL,
    keepAlive: false,
    lastShot: false,
    shotDir: null,
    unique: false
  }, options || {});

  var singleton;
  if (!options.unique && (!options.url || options.server === 'dev')) {
    singleton = JSON.stringify({
      appDir: !options.url && options.appDir,
      browser: options.browser || false,
      sever: options.server || false,
      url: options.url || false
    });
    if (singletonRunners[singleton]) {
      _.extend(options, singletonRunners[singleton].options);
    }
  }

  if (options.lastShot && !options.shotDir) {
    options.shotDir = path.join(options.appDir, 'test/last-shot');
    if (!fs.existsSync(options.shotDir)) {
      mkdirp = require('mkdirp');
      mkdirp.sync(options.shotDir);
    }
  }

  var startDriver = false
    , running = false
    , driver
    , port;

  if (!options.url) {
    port = parseInt(Math.random() * 1000, 10) + 6000;
    options.url = 'http://127.0.0.1:' + port;
  }

  if (options.server === 'dev') {
    startDriver = true;
    options.server = {
      host: 'localhost',
      port: parseInt(Math.random() * 1000, 10) + 7000
    };
  }

  driver = remote(options.server);
  driver.baseUrl = options.url;
  _.extend(driver, helpers.extension);
  _.extend(driver, client.extension);

  if (options.url.indexOf('http://127.0.0.1') === 0 && options.server.host === 'ondemand.saucelabs.com') {
    console.log("NOTE: make sure you're running sauce-connect.");
  }

  if (singleton) {
    if (singletonRunners[singleton]) {
      if (!options.keepAlive) {
        singletonRunners[singleton].drivers.push(driver);
      }
    } else {
      singletonRunners[singleton] = {
        drivers: [],
        options: {
          server: options.server,
          url: options.url
        }
      };
    }
  }

  before(function (done) {
    this.timeout(60 * 60 * 1000);
    function connect() {
      driver.init({
        browserName: options.browser[0],
        version: options.browser[1],
        platform: options.browser[2],
        name: testname
      }, function (err) {
        if (err && err.code === 'ECONNREFUSED') {
          var msg = 'Unabled to connect to selenium server at ' + options.server.host + ':' + options.server.port;
          err = new Error(msg);
          err.stack = '';
          return done(err);
        }
        if (err) return done(err);
        /* TODO check for the saucelabs "no sauce connect" error. */
        driver.get(options.url, done);
      });
    }
    if (!(port || startDriver)) return connect();
    running = local.setup(options.appCmd, port, startDriver && options.server.port, options.appDir, options.browser, connect);
  });

  after(function (done) {
    if (singleton && !running) {
      debug.info("Using singleton runners, and I didn't start it.", this.test.parent.title)
      return done();
    }
    this.timeout(20 * 1000);
    if (options.keepAlive) {
      debug.info('Not killing driver -- keepAline is truthy')
      return done();
    }
    var failed = mochaFailed(mochaRoot(this.test.parent))
    if (options.server.host !== 'ondemand.saucelabs.com') {
      return driver.quit(function () {
        if (!running) return done();
        local.teardown(running, singleton && singletonRunners[singleton].drivers, done);
      });
    }
    var url = 'http://' + options.server.username + ':' + options.server.password + '@saucelabs.com/rest/v1/' + options.server.username + '/jobs/' + driver.sessionID
    superagent.put(url)
      .set('Content-Type', 'application/json')
      .send({
        passed: failed === 0,
        build: process.env.BUILD_ID || Math.round(Date.now() / (1000*60))
      })
      .end(function (res) {
        driver.quit(function () {
          if (!running) return done();
          local.teardown(running, singleton && singletonRunners[singleton].drivers, done);
        });
      })
  });

  if (!options.lastShot) return driver;

  afterEach(function (done) {
    this.timeout(20 * 1000);
    if (options.lastShot === 'failed' && this.currentTest.state === 'passed') {
      debug.info('skipping screenshot - test passed')
      return done();
    }
    screenshot(this.currentTest, driver, options.shotDir, done);
  });

  return driver;
}

function mochaRoot(suite) {
  if (suite.root) return suite
  return mochaRoot(suite.parent)
}

function mochaFailed(suite) {
  return suite.tests.reduce(function (num, test) {
    return num + (test.state === 'failed' ? 1 : 0)
  }, 0) + suite.suites.reduce(function (num, suite) {
    return num + mochaFailed(suite)
  }, 0)
}

