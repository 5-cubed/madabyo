package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHostCheckMiddleware(t *testing.T) {
	cases := []struct {
		name       string
		host       string
		wantStatus int
	}{
		{"localhost", "localhost:8765", http.StatusOK},
		{"127.0.0.1", "127.0.0.1:8765", http.StatusOK},
		{"ipv6 loopback with port", "[::1]:8765", http.StatusOK},
		{"ipv6 loopback without port", "[::1]", http.StatusOK},
		{"localhost no port", "localhost", http.StatusOK},
		{"attacker domain", "evil.example:8765", http.StatusForbidden},
		{"attacker domain no port", "evil.example", http.StatusForbidden},
		{"localhost suffix", "localhost.evil.example:8765", http.StatusForbidden},
		{"loopback suffix", "127.0.0.1.evil.example:8765", http.StatusForbidden},
		{"external ipv4", "192.168.1.10:8765", http.StatusForbidden},
		{"external ipv6", "[2001:db8::1]:8765", http.StatusForbidden},
		{"empty host", "", http.StatusForbidden},
		{"malformed host port", "localhost:8765:80", http.StatusForbidden},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			called := false
			handler := hostCheckMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
				w.WriteHeader(http.StatusOK)
			}))
			req := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
			req.Host = c.host
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			if called != (c.wantStatus == http.StatusOK) {
				t.Fatalf("Host %q: next handler called = %t", c.host, called)
			}

			if rr.Code != c.wantStatus {
				t.Fatalf("Host %q: got status %d, want %d", c.host, rr.Code, c.wantStatus)
			}
		})
	}
}
