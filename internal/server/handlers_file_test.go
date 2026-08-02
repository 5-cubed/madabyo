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

func TestHandleFile(t *testing.T) {
	h := newTestServer(t)

	dir := t.TempDir()
	mdFile := filepath.Join(dir, "notes.md")
	mdContent := "# Test Markdown"
	if err := os.WriteFile(mdFile, []byte(mdContent), 0o644); err != nil {
		t.Fatal(err)
	}

	txtFile := filepath.Join(dir, "notes.txt")
	if err := os.WriteFile(txtFile, []byte("not allowed"), 0o644); err != nil {
		t.Fatal(err)
	}

	t.Run("valid .md file returns 200 with content", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/file?path="+mdFile, nil)
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200", rr.Code)
		}
		var result objects.FileResult
		if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if result.Error != "" {
			t.Fatalf("unexpected error in response: %q", result.Error)
		}
		if result.Content != mdContent {
			t.Fatalf("content mismatch: got %q, want %q", result.Content, mdContent)
		}
	})

	t.Run("disallowed extension returns 200 with error field", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/file?path="+txtFile, nil)
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200 (errors are always 200 per contract)", rr.Code)
		}
		var result objects.FileResult
		if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if result.Error == "" {
			t.Fatal("expected error field to be populated")
		}
	})

	t.Run("nonexistent path returns 200 with error field", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/file?path="+filepath.Join(dir, "missing.md"), nil)
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200 (errors are always 200 per contract)", rr.Code)
		}
		var result objects.FileResult
		if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if result.Error == "" {
			t.Fatal("expected error field to be populated")
		}
	})

	t.Run("disallowed host is rejected before reaching the handler", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/file?path="+mdFile, nil)
		req.Host = "evil.example"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Fatalf("got status %d, want 403", rr.Code)
		}
	})
}
