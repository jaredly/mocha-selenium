
/* globals before: true, after: true, afterEach: true */

var webdriver = require('wd')
  , _ = require('underscore')
  , mkdirp = require('mkdirp')

  , path = require('path')
  , fs = require('fs')

  , screenshot = require('./screenshot')
  , helpers = require('./helpers')
  , config = require('./config')
  , local = require('./local');

module.exports = {
  client: require('./client'),
  setup: setup
};

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
// If it's null, we'll start up a `chromedriver` or `phantomjs`, based
// on the `browser` argument defaulting to `chromedriver`. 'dev' is a
// shortcut for `{host: 'localhost', port: 4444}`.
//
// If `server` is null and `process.env.SEL_HOST` is truthy, then the
// server is taken from the following `ENV` variables.
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
// save screenshots of the final state of each test. `true`: all
// test. `'failed'`: only tests that failed.
//
// ##### appDir
// the root directory of your app (so foreman knows). Defaults to `cwd`.
//
// ##### shotDir
// where to save screenshots. Defaults to `appDir/test/last-shots`.
function setup(testname, options) {
  if (!global.before || !global.after) {
    throw new Error('Global `before` and `after` not found. setup() can only be run in conjunction with mocha');
  }

  options = _.extend({
    appDir: process.env.APP_DIR || process.cwd(),
    browser: config.envBrowser(),
    server: config.envServer(),
    url: process.env.SEL_URL,
    lastShot: false,
    shotDir: null
  }, options || {});

  if (options.lastShot && !options.shotDir) {
    options.shotDir = path.join(options.appDir, 'test/last-shot');
    if (!fs.exitsSync(options.shotDir)) {
      mkdirp = require('mkdirp');
      mkdirp.sync(options.shotDir);
    }
  }

  var startDriver = false
    , running = {}
    , driver
    , port;

  if (!options.url) {
    port = parseInt(Math.random() * 1000, 10) + 6000;
    options.url = 'http://localhost:' + port;
  }

  if (options.server === null) {
    startDriver = true;
    options.server = {
      host: 'localhost',
      port: parseInt(Math.random() * 1000, 10) + 7000
    };
  } else if (options.server === 'dev') {
    /* attach to your local selenium server */
    options.server = {
      host: 'localhost',
      port: 4444
    };
  }

  driver = remote(options.server);
  driver.baseUrl = options.url;
  _.extend(driver, helpers.extension);

  if (options.url.indexOf('http://localhost') === 0 && options.server.host === 'ondemand.saucelabs.com') {
    console.log("NOTE: make sure you're running sauce-connect.");
  }

  before(function (done) {
    function connect() {
      driver.init({
        browserName: options.browser[0],
        version: options.browser[1],
        platform: options.browser[2],
        name: testname
      }, function (err) {
        if (err && err.code === 'ECONNREFUSED') {
          var msg = 'Unabled to connect to selenium server.';
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
    running = local.setup(port, startDriver && options.server.port, options.appDir, options.browser, connect);
  });

  after(function (done) {
    if (running) local.teardown(running);
    driver.write(done);
  });

  if (!options.lastShot) return driver;

  afterEach(function (done) {
    if (options.lastShot === 'failed' && this.currentTest.state === 'passed') {
      return done();
    }
    screenshot(this.currentTest, driver, options.shotDir, done);
  });

  return driver;
}

