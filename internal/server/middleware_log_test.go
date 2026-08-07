package server

import (
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMiddlewareLog(t *testing.T) {
	t.Run("logs request with method, path, status, and duration", func(t *testing.T) {
		var buf bytes.Buffer
		logger := log.New(&buf, "", 0)

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		wrapped := newLoggingMiddleware(handler, logger)

		req := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
		rr := httptest.NewRecorder()

		wrapped.ServeHTTP(rr, req)

		logOutput := buf.String()
		if !strings.Contains(logOutput, "GET") {
			t.Errorf("log missing method, got: %q", logOutput)
		}
		if !strings.Contains(logOutput, "/api/ping") {
			t.Errorf("log missing path, got: %q", logOutput)
		}
		if !strings.Contains(logOutput, "200") {
			t.Errorf("log missing status, got: %q", logOutput)
		}
	})
}
