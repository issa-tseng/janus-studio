default: build

SASS = $(shell find lib -name "*.sass" -type f | grep -v bundle | sort)

lib/app.css: lib/styles/app.sass $(SASS)
	node node_modules/node-sass/bin/node-sass --output-style compressed $< > $@

build: lib/app.css

