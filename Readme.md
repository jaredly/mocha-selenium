
# Mocha Selenium

## Config

```javascript
{
  files: ["fname", "fglob*.js", ...] || "one-file.js",
  envs: {
    local: [browserdef, ...]
    envname: {
      // wd config here: hostname, port, protocol, path -- https://github.com/admc/wd#defaults
      inherits: null || "otherenv" || ["multiple", "other", "envs"],
      browsers: [browserdef, ...]
    }
  }
}
```

Browserdef:

```
[
  "browsername", "version", "platform"
]

ex:
[
  "internet explorer", "8", "Windows XP"
]
```

