#!/usr/bin/env node

var program = require('commander')
  , Runner = require('../lib/runner')

program
  .version('0.0.1')
  .usage('[options] <test files / directories...>')
  .option('-e, --environment [env]', 'Pick the environment to run (host + browsers). Default: local')
  .option('-p, --parallel', 'Run the tests in parallel. Default: false')
  .option('-c, --config [file]', 'Specify the config file. Default: ./selenium.json')
  .parse(process.argv);

if (!program.args.length > 0){
  program.args = ['.']
}

program.paths = program.args


new Runner(program).execute(function (failed, passed) {
  process.exit(failed ? 1 : 0);
});

