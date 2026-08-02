package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHostCheckMiddleware(t *testing.T) {
	ok := hostCheckMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

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
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
			req.Host = c.host
			rr := httptest.NewRecorder()

			ok.ServeHTTP(rr, req)

			if rr.Code != c.wantStatus {
				t.Fatalf("Host %q: got status %d, want %d", c.host, rr.Code, c.wantStatus)
			}
		})
	}
}
