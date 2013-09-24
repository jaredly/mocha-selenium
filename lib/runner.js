
var wd = require('wd')
  , async = require('async')
  , _ = require('underscore')

  , spawn = require('child_process').spawn
  , path = require('path')
  , fs = require('fs')

  , utils = require('./utils')
  , Progress = require('./progress');

module.exports = Runner;

function Runner(options) {
  this.options = _.extend({
    environment: 'local',
    config: './selenium.json',
    parallel: false
  }, options);
  this.cwd = process.cwd();
  var cfile = path.join(this.cwd, this.options.config);
  try {
    this.config = require(cfile);
  } catch (e) {
    console.error('Failed to load config file.');
    throw e;
  }
  if (!this.config || !this.config.envs) {
    throw new Error('Invalid config file. Need `envs: { ... }` defined');
  }
  this.env = this.config.envs[this.options.environment];
  if (!this.env) {
    throw new Error('Requested environmnet not found');
  }
  if (Array.isArray(this.env)) {
    this.env = {browsers: this.env};
  }
  this.env.browsers = utils.extendEnv(this.config.envs, this.env);
}

Runner.prototype = {
  execute: function (done) {
    var self = this;
    utils.resolveFiles(this.config.files, this.cwd, function (err, files) {
      if (err) return done(err);
      if (!files.length) {
        console.log('Failed to collect any files to test.', files, self.config.files);
        return done();
      }
      // console.log('Files', files);
      self.run(self.options.parallel, files, done);
    });
  },
  run: function (parallel, files, done) {
    var tasks = []
      , self = this
      , progress = new Progress(files.length * this.env.browsers.length, {update: 200});
    // output to start things off
    console.log('Running tests in ' + (parallel ? 'parallel' : 'serial'));
    console.log('');
    utils.printBrowsers(this.env.browsers);
    console.log('');
    utils.printFiles(files);
    console.log('');

    this.env.browsers.forEach(function (browser) {
      files.forEach(function (file) {
        tasks.push(function (next) {
          if (parallel) {
            console.log('Starting %s on %s', file, utils.browserName(browser));
          }
          self.runOne(!parallel, file, browser, function (code, out) {
            if (parallel) {
              console.log();
              process.stdout.write('\n  ' + utils.recolor(out, code));
            }
            progress.inc(!code);
            next(null, code);
          });
        });
      });
    });
    async[parallel ? 'parallel' : 'series'](tasks, function (err, results) {
      progress.terminate();
      if (!results.length) {
        console.log('Looks like no files were run. Check your configuration?');
        return done(1);
      }
      var passed = 0
        , failed = 0;
      for (var i=0; i<results.length; i++) {
        if (results[i]) failed++;
        else passed++;
      }
      console.log('  ' + utils.color(passed + ' passed', 32));
      if (failed) {
        console.log('  ' + utils.color(failed + ' failed', 31));
      }
      done(failed, passed);
    });
  },
  runOne: function (pipe, file, browser, done) {
    var auth = _.extend({}, this.env.auth);
    if (auth && auth.type === 'env') {
      auth.username = process.env[auth.username];
      auth.password = process.env[auth.password];
    }
    var out = '';
    // console.log('Running', files, pipe, browser);
    var ENV = _.extend({}, process.env, {
      SEL_USERNAME: auth && auth.username,
      SEL_PASSWORD: auth && auth.password,
      SEL_BROWSER: browser[0],
      SEL_VERSION: browser[1],
      SEL_PLATFORM: browser[2]
    });
    if (this.env.hostname) {
      ENV.SEL_HOST = this.env.hostname;
      ENV.SEL_PORT = this.env.port;
    }
    var child = spawn('/usr/bin/env', ['mocha', '-R', 'spec', file], {
      stdio: pipe ? 'inherit' : undefined,
      // detached: true,
      cwd: this.cwd,
      env: ENV
    });
    if (!pipe) {
      child.stdout.on('data', function (data) {
        out += data;
      });
      child.stderr.on('data', function (data) {
        out += data;
      });
    }
    child.on('close', function (code) {
      done(code, out);
    });
  },
};

