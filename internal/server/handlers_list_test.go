package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"madabyo/internal/workspace/objects"
)

func newTestServer(t *testing.T) http.Handler {
	t.Helper()
	h, err := New(filepath.Join(t.TempDir(), "config.json"), "")
	if err != nil {
		t.Fatalf("New() returned error: %v", err)
	}
	return h
}

func TestHandleList(t *testing.T) {
	h := newTestServer(t)

	dir := t.TempDir()
	if err := os.Mkdir(filepath.Join(dir, "sub"), 0o755); err != nil {
		t.Fatal(err)
	}

	t.Run("valid directory returns 200 with entries", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/list?path="+dir, nil)
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200", rr.Code)
		}
		var result objects.ListResult
		if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if result.Error != "" {
			t.Fatalf("unexpected error in response: %q", result.Error)
		}
		if len(result.Entries) != 1 {
			t.Fatalf("expected 1 entry, got %d", len(result.Entries))
		}
	})

	t.Run("nonexistent path returns 200 with error field", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/list?path="+filepath.Join(dir, "does-not-exist"), nil)
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200 (errors are always 200 per contract)", rr.Code)
		}
		var result objects.ListResult
		if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if result.Error == "" {
			t.Fatal("expected error field to be populated")
		}
	})

	t.Run("disallowed host is rejected before reaching the handler", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/list?path="+dir, nil)
		req.Host = "evil.example"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Fatalf("got status %d, want 403", rr.Code)
		}
	})
}
