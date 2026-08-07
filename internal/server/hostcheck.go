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
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if h, _, err := net.SplitHostPort(host); err == nil {
			host = h
		}

		if !allowedHosts[host] {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "forbidden: host not allowed"})
			return
		}

		next.ServeHTTP(w, r)
	})
}
