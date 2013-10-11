
var path = require('path')
  , glob = require('glob')
  , async = require('async')
  , fs = require('fs')

module.exports = {
  browserName: browserName,
  printBrowsers: printBrowsers,
  printFiles: printFiles,
  recolor: recolor,
  color: color,

  resolveFiles: resolveFiles,
  extendEnv: extendEnv,
  getBrowsers: getBrowsers,
  removeDuplicateBrowsers: removeDuplicateBrowsers
};

function browserName(browser) {
  return browser[0] +
    (browser[1] ? ' ' + browser[1] : '') +
    (browser[2] === 'ANY' ? '' : ' ' + browser[2]);
}

function printBrowsers(browsers) {
  console.log('Browsers:');
  for (var i=0; i<browsers.length; i++) {
    console.log('  - ' + browserName(browsers[i]));
  }
}

function printFiles(files) {
  console.log('Files:');
  for (var i=0; i<files.length; i++) {
    console.log('  - ' + files[i]);
  }
}

function color(text, num) {
  return '\u001b[' + num + 'm' + text + '\u001b[0m';
}

function recolor(text, result) {
  var lines = text.trim().split('\n');
  lines[lines.length - 1] = color(lines[lines.length - 1], result ? 31 : 32);
  return lines.join('\n') + '\n\n';
}


function resolveFiles(configFiles, configDir, paths, done) {

  var tasks = [];

  configFiles.forEach(function (file) {
    var full = path.resolve(path.join(configDir, file));
    tasks.push(function (next) {
      glob(full, next);
    });
  });

  var resolvePath = function(file){
    var file = path.resolve('.', file)
    var stat = fs.statSync(file)
    if (stat.isDirectory()){ 
      tasks.push(function(next){
        glob(file + '/*', next)
      })
    } else if (stat.isFile()) {
      tasks.push(function(next){
        glob(file, next);
      })
    } 
  }
  paths.forEach(resolvePath)

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
