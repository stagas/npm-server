
install: package.json
	@npm install --production

dev: package.json
	@npm install

test:
	@node test/test

clean:
	rm -rf node_modules

.PHONY: test clean
