
# Mocha Selenium
Everything you need for selenium testing in node.js.

There are two parts: the library and the runner.

The library provides you with the `setup()` function which returns a driver that is instrumented to make your tests **simple, semantic, and easy to use**. Among other things, it is automatically initialized in a `before()` clause, destroyed in an `after()` clause, and will even fire up an instance of your app & a webdriver server if you need them!

The runner is configured with a `selenium.json` file, and will run your mocha test files in series or in parallel, for any number of browsers. Installing it with `npm install -g mocha-selenium` will give you the `mocha-selenium` command on your path.

### The Library
Has a bunch of options. Some of the options are default to ENV variables if they are present. [Read the docs](http://jaredly.github.io/mocha-selenium/#section-2) for a thorough description.

Optionally if you are using the promise webdriver or promiseChain webdriver supported by [wd](https://github.com/admc/wd#q-promises--chaining), you can pass a `webdriverType` to the setup options object. You can use either 'promise' or 'promiseChain' as the string, if not passed the default webdriver will be used.

Here's an example:
```js
var expect = require('expect.js')
  , b = require('mocha-selenium').setup("Login Page", {
      appDir: path.dirname(__dirname),
      lastShot: "failed",
      webdriverType: 'promiseChain'  // OPTIONAL
    });

describe('The login page', function () {
  this.timeout(20 * 1000)
  before(function (done) {
    b.get(b.baseUrl + '/login', done)
  })
  it('should work', function (done) {
    function fail(err) {
      b.haltChain()
      done(err)
    }
    b.chain({onError: fail})
     .fillInForm('.loginForm', {
       username: 'jsmith',
       password: '1830'
     })
     .clickByCss('.loginForm button.submit')
     // make sure we were redirected to the account page
     .url(function (err, url) {
       if (err) return fail(err)
       expect(url).to.match(/\/account$/)
       done()
     })
  })
})
```

### Convenience functions added to the driver
In addition to the normal
[wd methods](https://github.com/admc/wd/#supported-methods), there are
the following:

#### General Methods

##### `ensureCookie(name, value, done(err))`
On the current page, if the cookie by the name of `name` with value
`value` does not exist, set the cookie and refresh the page.

If value is a function, it is called with the current value of the
cookie. If it returns a value other than the current cookie value, the
cookie is set to that value.

##### `fillInForm(data, [formSelector,] done(err))`
Data is a map of `"input name": "value to type"`. If `formSelector` is
given, only inputs that are children of the given selector will be
filled in. Otherwise, the first input in the document with the given
`name` will be populated.

##### `rel(url, done(err))`
= `b.get(b.baseUrl + url, done)`.

#### Element-specific methods
The following suffixes are available for these methods, mirroring the `wd` library:

ByClassName, ByCssSelector, ById, ByName, ByLinkText, ByPartialLinkText, ByTagName, ByXPath, ByCss.

I will use the `ByCss` suffix for demonstration.

- textByCss(selector, done(err, text, element))
- visibleByCss(selector, done(err, isVisible, element))
- valueByCss(selector, done(err, value, element))
- clickByCss(selector, done(err, element))
- waitAndGet(selector, timeout, done(err, element))
- waitAndClickByCss(selector, timeout, done(err, element))

### The Runner
Run your mocha selenium tests in parallel in mutliple browsers.

#### Usage

```
  Usage: mocha-selenium [options]

  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    -e, --environment [env]  Pick the environment to run (host + browsers). Default: local
    -p, --parallel           Run the tests in parallel. Default: false
    -c, --config [file]      Specify the config file. Default: ./selenium.json
```

##### Config

```javascript
{
  files: // filename or glob, or list of filenames or globs
  envs: { // a map of [envname] to an environment definition.
    local: [browserdef, ...] OR {
      browsers: [browserdef, ...],
      inherits: // name or list of names of other environemnts. Their
                // browserdefs will be appended to the current env.
      // if no hostname is given, mocha-selenium will start its own
      // selenium drivers. Currently phantomjs and chrome are supported
      hostname: "ondemand.saucelabs.com",
      port: 80,
      auth: {
        type: 'plain',
        username: 'MyName',
        password: 'secret'
      } OR {
        type: 'env', // the username and password are environmental variables
        username: 'SAUCE_USERNAME',
        password: 'SAUCE_ACCESS_KEY'
      }
    },
    otherenv: ...,
    ...
  }
}
```

#### Browserdef:

```
["browsername", "version", "platform"]

ex:
["internet explorer", "8", "Windows XP"]
```
