package server

import (
	"bytes"
	"encoding/json"
	"io"
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

	t.Run("PUT with matching mtime writes file and returns new mtime", func(t *testing.T) {
		originalMtime, err := os.Stat(mdFile)
		if err != nil {
			t.Fatal(err)
		}

		newContent := "# Updated content"
		payload := map[string]interface{}{
			"path":          mdFile,
			"content":       newContent,
			"expectedMtime": originalMtime.ModTime().UnixMilli(),
		}
		bodyBytes, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPut, "/api/file", io.NopCloser(bytes.NewReader(bodyBytes)))
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200", rr.Code)
		}
		var result objects.SaveResult
		if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if result.Error != "" {
			t.Fatalf("unexpected error in response: %q", result.Error)
		}

		// Verify file was written
		writtenContent, err := os.ReadFile(mdFile)
		if err != nil {
			t.Fatalf("failed to read written file: %v", err)
		}
		if string(writtenContent) != newContent {
			t.Fatalf("file content mismatch: got %q, want %q", string(writtenContent), newContent)
		}
	})

	t.Run("PUT with stale mtime returns error and file untouched", func(t *testing.T) {
		// Write a new file with known content
		testFile := filepath.Join(dir, "stale.md")
		originalContent := "# Original"
		if err := os.WriteFile(testFile, []byte(originalContent), 0o644); err != nil {
			t.Fatal(err)
		}

		// Get its mtime, then sleep to ensure a new mtime would be different
		originalMtime, err := os.Stat(testFile)
		if err != nil {
			t.Fatal(err)
		}

		// Try to write with an old expectedMtime
		newContent := "# New content (should fail)"
		payload := map[string]interface{}{
			"path":          testFile,
			"content":       newContent,
			"expectedMtime": originalMtime.ModTime().UnixMilli() - 1000,
		}
		bodyBytes, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPut, "/api/file", io.NopCloser(bytes.NewReader(bodyBytes)))
		req.Host = "localhost"
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("got status %d, want 200", rr.Code)
		}
		var result objects.SaveResult
		if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if result.Error == "" {
			t.Fatal("expected error for stale mtime")
		}

		// Verify file was not written
		fileContent, err := os.ReadFile(testFile)
		if err != nil {
			t.Fatalf("failed to read file: %v", err)
		}
		if string(fileContent) != originalContent {
			t.Fatalf("file was modified despite stale mtime; got %q, want %q", string(fileContent), originalContent)
		}
	})
}
