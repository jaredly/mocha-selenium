
REPORTER := spec
tolint := *.js *.json lib

test: lint test-only

test-only:
	@./node_modules/.bin/mocha test/* -R $(REPORTER)

lint:
	@./node_modules/.bin/jshint --verbose --extra-ext .js,.json $(tolint)
