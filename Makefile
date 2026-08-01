.PHONY: build

build:
	cd web && npm install && npm run build
	go build -o madabyo ./cmd/madabyo
