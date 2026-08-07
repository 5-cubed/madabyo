package server

import (
	"encoding/json"
	"net"
	"net/http"
)

var allowedHosts = map[string]bool{
	"localhost": true,
	"127.0.0.1": true,
	"::1":       true,
	"[::1]":     true,
}

func hostCheckMiddleware(next http.Handler) http.Handler {
	return next
}
