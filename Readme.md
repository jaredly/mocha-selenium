
# Mocha Selenium

## Installation

`npm install -g mocha-selenium`

## Usage

```
  Usage: mocha-selenium [options]

  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    -e, --environment [env]  Pick the environment to run (host + browsers). Default: local
    -p, --parallel           Run the tests in parallel. Default: false
    -c, --config [file]      Specify the config file. Default: ./selenium.json
```

## Config

```javascript
{
  files: // filename or glob, or list of filenames or globs
  envs: { // a map of [envname] to an environment definition.
    local: [browserdef, ...] || {
      browsers: [browserdef, ...],
      inherits: // name or list of names of other environemnts. Their browserdefs will be appended to the current env.
      // if no hostname is given, mocha-selenium will start its own selenium drivers. Currently phantomjs and chrome are supported
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
