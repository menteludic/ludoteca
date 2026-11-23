# Comandos del proyecto. Todo lo que se ejecuta se hace desde aquí.

NODE ?= node
NPM ?= npm

.PHONY: install check lint typecheck test coverage gate start

install:
	$(NPM) ci

check: lint typecheck coverage gate

lint:
	$(NPM) run lint

typecheck:
	$(NPM) run typecheck

test:
	$(NPM) test

coverage:
	$(NPM) run test:coverage

gate:
	sh deploy/gate-selftest.sh

start:
	$(NODE) src/bootstrap/server.js