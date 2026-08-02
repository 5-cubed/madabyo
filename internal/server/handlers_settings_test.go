package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"madabyo/internal/workspace/objects"
)

func TestHandleSettings(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(t.TempDir(), "config.json")
	h, err := New(configPath)
	if err != nil {
		t.Fatalf("New() returned error: %v", err)
	}

	t.Run("GET before any save returns empty workspacePath", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/settings", nil)
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200", rr.Code)
		}
		var cfg objects.Config
		if err := json.Unmarshal(rr.Body.Bytes(), &cfg); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if cfg.WorkspacePath != "" {
			t.Fatalf("expected empty WorkspacePath, got %q", cfg.WorkspacePath)
		}
	})

	t.Run("PUT with malformed body returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewBufferString("{not json"))
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("got status %d, want 400", rr.Code)
		}
	})

	t.Run("PUT with unlistable path returns 200 with error, does not persist", func(t *testing.T) {
		body, _ := json.Marshal(objects.Config{WorkspacePath: filepath.Join(dir, "does-not-exist")})
		req := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewBuffer(body))
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200", rr.Code)
		}
		var resp map[string]string
		if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp["error"] == "" {
			t.Fatal("expected error field to be populated")
		}
		if _, err := os.Stat(configPath); !os.IsNotExist(err) {
			t.Fatal("expected config file to not exist after a rejected save")
		}
	})

	t.Run("PUT with valid path persists and GET reflects it", func(t *testing.T) {
		body, _ := json.Marshal(objects.Config{WorkspacePath: dir})
		putReq := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewBuffer(body))
		putReq.Host = "localhost"
		putRR := httptest.NewRecorder()

		h.ServeHTTP(putRR, putReq)

		if putRR.Code != http.StatusOK {
			t.Fatalf("PUT: got status %d, want 200", putRR.Code)
		}

		getReq := httptest.NewRequest(http.MethodGet, "/api/settings", nil)
		getReq.Host = "localhost"
		getRR := httptest.NewRecorder()

		h.ServeHTTP(getRR, getReq)

		var cfg objects.Config
		if err := json.Unmarshal(getRR.Body.Bytes(), &cfg); err != nil {
			t.Fatalf("failed to decode GET response: %v", err)
		}
		if cfg.WorkspacePath != dir {
			t.Fatalf("GET after PUT: WorkspacePath = %q, want %q", cfg.WorkspacePath, dir)
		}
	})

	t.Run("disallowed host is rejected before reaching the handler", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/settings", nil)
		req.Host = "evil.example"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Fatalf("got status %d, want 403", rr.Code)
		}
	})
}
