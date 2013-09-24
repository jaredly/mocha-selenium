
var _ = require('underscore');

module.exports = Progress;

var COLORS = {
  'green': 32,
  'red': 31
};

function color(text, name, tty) {
  if (!tty) return text;
  return '\u001b[' + COLORS[name] + 'm' + text + '\u001b[0m';
}

function Progress(num, options) {
  this.options = _.extend({
    tty: true,
    prefix: 'progress: '
  }, options);
  this.prefix = this.options.prefix;
  this.update = this.options.update;
  this.rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  this.rl.setPrompt('', 0);
  this.rl.clearLine = function() {
    this.write(null, {ctrl: true, name: 'u'});
  };
  this.num = num;
  this.passed = 0;
  this.failed = 0;
  this.started = new Date().getTime();
  if (this.update) {
    this._interval = setInterval(this.render.bind(this), this.update);
  }
}

Progress.prototype = {
  render: function () {
    var text = this.prefix
      , left = this.num - this.passed - this.failed;
    text += color(this.passed, 'green', this.options.tty) + ':';
    text += color(this.failed, 'red', this.options.tty) + ':';
    text += left;
    if (this.update) {
      var dur = parseInt((new Date().getTime() - this.started) / 1000);
      text += ' ' + dur + 's';
    }
    this.rl.clearLine();
    this.rl.write(text);
  },
  inc: function (passed) {
    this[passed ? 'passed' : 'failed']++;
    this.render();
    if (this.passed + this.failed >= this.num) {
      this.terminate();
      return true;
    }
  },
  terminate: function () {
    clearInterval(this._interval);
    this.rl.resume();
    if (this.clear) {
      this.rl.clearLine();
      this.rl.close();
    } else {
      this.rl.close();
      console.log();
    }
  }
};
