
var path = require('path')
  , fs = require('fs');

module.exports = screenshot;

// Take a screenshot for the current test
//
// test: the mocha test object
// driver: wd.driver
// done(err)
function screenshot(test, driver, basedir, done) {
  var filename = path.join(basedir, testFileName(test) + '.png');
  driver.takeScreenshot(function (err, img) {
    if (err) return done(err);
    fs.writeFileSync(filename, new Buffer(img, 'base64'));
    done();
  });
}

// Get the title of a test as a list of the titles, starting with the root description.
// name, idx, name, idx, name, idx, name
function testPath(test) {
  if (!test.parent) return [test.title];
  var idx = test.parent[test.type === 'test' ? 'tests' : 'suites'].indexOf(test);
  return testPath(test.parent).concat([idx, test.title]);
}

function sanitize(name) {
  return (name + '').replace(/\s/g, '-').replace(/[^\w-]/g, '').replace(/-+/g, '-');
}

function date() {
  var now = new Date();
  return now.getFullYear() + '-' + now.getMonth() + '-' + now.getDay() + '.' + now.getHours() + '.' + now.getMinutes();
}

function testFileName(test) {
  return date() + testPath(test).map(sanitize).join('.');
}
