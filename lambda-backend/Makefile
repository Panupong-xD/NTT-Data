.PHONY: build-WellyncBackendFunction build-FrontendFunction
build-WellyncBackendFunction:
	npm ci --no-audit --no-fund
	npm run build
	cp -R dist node_modules package.json "$(ARTIFACTS_DIR)/"

build-FrontendFunction: build-WellyncBackendFunction
