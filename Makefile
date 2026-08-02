.PHONY: build test

build:
	cd web && npm install && npm run build
	go build -o madabyo ./cmd/madabyo

test:
	go test ./...
	cd web && npm test
