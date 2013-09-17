
var wd = require('wd')
  , async = require('async')
  , glob = require('glob')
  , _ = require('underscore')

  , spawn = require('child_process').spawn
  , path = require('path')
  , fs = require('fs');

module.exports = Runner;

function color(text, num) {
  return '\u001b[' + num + 'm' + text + '\u001b[0m';
}

function recolor(text, result) {
  var lines = text.trim().split('\n');
  lines[lines.length - 1] = color(lines[lines.length - 1], result ? 31 : 32)
  return lines.join('\n') + '\n\n\n';
}

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
  this.env.browsers = extendEnv(this.config.envs, this.env);
}

function printBrowsers(browsers) {
  console.log('Browsers:');
  for (var i=0; i<browsers.length; i++) {
    console.log('  - ' + browsers[i][0] +
                (browsers[i][1] ? ' ' + browsers[i][1] : '') +
                (browsers[i][2] === 'ANY' ? '' : ' ' + browsers[i][2]));
  }
}

function printFiles(files) {
  console.log('Files:');
  for (var i=0; i<files.length; i++) {
    console.log('  - ' + files[i]);
  }
}

Runner.prototype = {
  execute: function (done) {
    var self = this;
    resolveFiles(this.config.files, this.cwd, function (err, files) {
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
      , self = this;
    console.log('Running tests in ' + (parallel ? 'parallel' : 'serial'));
    console.log('');
    printBrowsers(this.env.browsers);
    console.log('');
    printFiles(files);
    console.log('');
    this.env.browsers.forEach(function (browser) {
      files.forEach(function (file) {
        tasks.push(function (next) {
          self.runOne(!parallel, file, browser, function (code, out) {
            if (parallel) process.stdout.write(recolor(out, code));
            next(null, code);
          });
        });
      });
    });
    async[parallel ? 'parallel' : 'series'](tasks, function (err, results) {
      if (!results.length) {
        return console.log('Looks like no files were run. Check your configuration?');
      }
      var passed = 0
        , failed = 0;
      for (var i=0; i<results.length; i++) {
        if (results[i]) failed++;
        else passed++;
      }
      console.log('  ' + color(passed + ' passed', 32))
      if (failed) {
        console.log('  ' + color(failed + ' failed', 31))
      }
    });
  },
  runOne: function (pipe, file, browser, done) {
    var auth = this.env.auth;
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
      ENV.hostname = this.env.hostname;
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

function resolveFiles(files, cwd, done) {
  var tasks = [];
  files.forEach(function (file) {
    var full = path.join(cwd, file);
    tasks.push(function (next) {
      glob(full, next);
    });
  });
  async.parallel(tasks, function (err, results) {
    if (err) return done(err);
    var all = [];
    for (var i=0; i<results.length; i++) {
      all = all.concat(results[i]);
    }
    done(null, all);
  });
}

function extendEnv(envs, env) {
  var extend = env.extend
    , browsers = env.browsers.slice();
  if (!extend) return browsers;
  if ('string' === typeof extend) {
    extend = [extend];
  }
  for (var i=0; i<extend.length; i++) {
    browsers = browsers.concat(getBrowsers(envs[extend[i]]));
  }
  return removeDuplicateBrowsers(browsers);
}

function getBrowsers(env) {
  if (Array.isArray(env)) return env;
  return env.browsers;
}

function removeDuplicateBrowsers(browsers) {
  var good = []
    , have;
  for (var i=0; i<browsers.length; i++) {
    have = false;
    for (var j=0; j<good.length; j++) {
      if (browsers[i][0] === good[j][0] &&
          browsers[i][1] === good[j][1] &&
          browsers[i][2] === good[j][2]) {
        have = true;
      }
    }
    if (!have) good.push(browsers[i]);
  }
  return good;
}
