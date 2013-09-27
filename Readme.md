
# Mocha Selenium
Everything you need for selenium testing in node.js.

### The Library
Setup and teardown with mocha's `before` and `after`.
- gives you `wd.driver` Webdriver Client
- start fresh instance of your app
- start webdriver server (chrome or phantomjs)
- take screenshots after failed tests

```js
var driver = require('mocha-selenium').setup("Login Page", {
  appDir: path.dirname(__dirname),
  lastShot: "failed"
});
```

[Read the docs](https://jaredly.github.io/mocha-selenium/#section-2) for more information on the options.

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
      inherits: // name or list of names of other environemnts. Their browserdefs will be appended to the current env.
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
