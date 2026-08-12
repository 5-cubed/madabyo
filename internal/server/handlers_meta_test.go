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

func TestHandleMeta(t *testing.T) {
	h := newTestServer(t)

	dir := t.TempDir()
	mdFile := filepath.Join(dir, "notes.md")
	mdContent := "# Test Markdown"
	if err := os.WriteFile(mdFile, []byte(mdContent), 0o644); err != nil {
		t.Fatal(err)
	}

	t.Run("valid .md file returns 200 with mtime > 0", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/file/meta?path="+mdFile, nil)
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200", rr.Code)
		}
		var result objects.MetaResult
		if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if result.Error != "" {
			t.Fatalf("unexpected error in response: %q", result.Error)
		}
		if result.Mtime <= 0 {
			t.Fatalf("mtime should be > 0, got %d", result.Mtime)
		}
	})

	t.Run("nonexistent path returns 200 with error field", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/file/meta?path="+filepath.Join(dir, "missing.md"), nil)
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200 (errors are always 200 per contract)", rr.Code)
		}
		var result objects.MetaResult
		if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if result.Error == "" {
			t.Fatal("expected error field to be populated")
		}
		if result.Mtime != 0 {
			t.Fatalf("Mtime should be 0 on error, got %d", result.Mtime)
		}
	})
}
