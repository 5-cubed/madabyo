package server

import (
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandleLog(t *testing.T) {
	t.Run("valid body returns 200 and logs message", func(t *testing.T) {
		var buf bytes.Buffer
		logger := log.New(&buf, "", 0)

		handler := handleLog(logger)

		req := httptest.NewRequest(http.MethodPost, "/api/log", strings.NewReader(`{"level":"error","message":"x"}`))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200", rr.Code)
		}

		logOutput := buf.String()
		if !strings.Contains(logOutput, "x") {
			t.Errorf("log missing message, got: %q", logOutput)
		}
	})

	t.Run("GET returns 405", func(t *testing.T) {
		var buf bytes.Buffer
		logger := log.New(&buf, "", 0)

		handler := handleLog(logger)

		req := httptest.NewRequest(http.MethodGet, "/api/log", nil)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusMethodNotAllowed {
			t.Fatalf("got status %d, want 405", rr.Code)
		}
	})

	t.Run("unknown level returns 400 and logs nothing", func(t *testing.T) {
		var buf bytes.Buffer
		logger := log.New(&buf, "", 0)

		handler := handleLog(logger)

		req := httptest.NewRequest(http.MethodPost, "/api/log", strings.NewReader(`{"level":"banana","message":"x"}`))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("got status %d, want 400", rr.Code)
		}

		logOutput := buf.String()
		if logOutput != "" {
			t.Errorf("expected no log output, got: %q", logOutput)
		}
	})

	t.Run("body over 4 KB returns 400 and logs nothing", func(t *testing.T) {
		var buf bytes.Buffer
		logger := log.New(&buf, "", 0)

		handler := handleLog(logger)

		// Create a large message > 4 KB
		largeMsg := strings.Repeat("x", 4100)
		payload := `{"level":"error","message":"` + largeMsg + `"}`

		req := httptest.NewRequest(http.MethodPost, "/api/log", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("got status %d, want 400", rr.Code)
		}

		logOutput := buf.String()
		if logOutput != "" {
			t.Errorf("expected no log output, got: %q", logOutput)
		}
	})

	t.Run("message with newline has no newline in log", func(t *testing.T) {
		var buf bytes.Buffer
		logger := log.New(&buf, "", 0)

		handler := handleLog(logger)

		req := httptest.NewRequest(http.MethodPost, "/api/log", strings.NewReader(`{"level":"error","message":"line1\nline2"}`))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200", rr.Code)
		}

		logOutput := strings.TrimSpace(buf.String())
		if strings.Contains(logOutput, "\n") {
			t.Errorf("log should not contain newline in message, got: %q", logOutput)
		}
		if !strings.Contains(logOutput, "line1") || !strings.Contains(logOutput, "line2") {
			t.Errorf("log should contain both parts, got: %q", logOutput)
		}
	})
}
