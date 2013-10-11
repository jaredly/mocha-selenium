
# Mocha Selenium
Everything you need for selenium testing in node.js.

### The Library
Setup and teardown with mocha's `before` and `after`.
- gives you `wd.driver` Webdriver Client
- start fresh instance of your app (if needed)
- start webdriver server (if needed)
- take screenshots after failed tests

```js
var driver = require('mocha-selenium').setup("Login Page", {
  appDir: path.dirname(__dirname),
  lastShot: "failed"
});
```

[Read the docs](http://jaredly.github.io/mocha-selenium/#section-2) for more information on the options.

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

#### Element-specific methods
The following suffixes are available for these methods, mirroring the `wd` library:

ByClassName, ByCssSelector, ById, ByName, ByLinkText, ByPartialLinkText, ByTagName, ByXPath, ByCss.

I will use the `ByCss` suffix for demonstration.

- valueByCss(selector, done(err, value, element)
- clickByCss(selector, done(err, element)
- waitAndGet(selector, timeout, done(err, element)
- waitAndClickByCss(selector, timeout, done(err, element)

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
    local: [browserdef, ...] || {
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
      } || {
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
