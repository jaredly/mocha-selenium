#!/usr/bin/env node

var program = require('commander')
  , Runner = require('../lib')

program
  .version('0.0.1')
  .option('-e, --environment [env]', 'Pick the environment to run (host + browsers). Default: local')
  .option('-p, --parallel', 'Run the tests in parallel. Default: false')
  .option('-c, --config [file]', 'Specify the config file. Default: ./selenium.json')
  .parse(process.argv);

new Runner(program).execute();

