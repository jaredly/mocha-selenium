
REPORTER := spec
tolint := *.js *.json lib

test: lint test-only

test-only:
	@./node_modules/.bin/mocha test/* -R $(REPORTER)

lint:
	@./node_modules/.bin/jshint --verbose --extra-ext .js,.json $(tolint)

docs:
	docco lib/*.js Readme.md
	mv docs/* ./
	git add -A
	git stash
	git checkout gh-pages
	git rm *.html
	git stash pop

.PHONY: docs lint test test-only
