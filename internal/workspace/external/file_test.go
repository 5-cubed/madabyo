package external

import (
	"os"
	"path/filepath"
	"testing"
)

func TestOSFileReader(t *testing.T) {
	tmpDir := t.TempDir()

	// Create a real file
	realFile := filepath.Join(tmpDir, "notes.md")
	testContent := "# Test Markdown\n\nContent here."
	if err := os.WriteFile(realFile, []byte(testContent), 0644); err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	// Create a symlink to the real file
	symlinkedFile := filepath.Join(tmpDir, "link.md")
	if err := os.Symlink(realFile, symlinkedFile); err != nil {
		t.Fatalf("Failed to create symlink: %v", err)
	}

	reader := OSFileReader{}

	t.Run("ReadFile real file", func(t *testing.T) {
		content, err := reader.ReadFile(realFile)
		if err != nil {
			t.Fatalf("ReadFile failed: %v", err)
		}
		if content != testContent {
			t.Errorf("ReadFile content mismatch: got %q, want %q", content, testContent)
		}
	})

	t.Run("Resolve symlink", func(t *testing.T) {
		resolved, err := reader.Resolve(symlinkedFile)
		if err != nil {
			t.Fatalf("Resolve failed: %v", err)
		}
		// After resolving, it should point to the real file
		// Use EvalSymlinks on the real file path too for comparison (handles /private prefix on macOS)
		expectedResolved, _ := filepath.EvalSymlinks(realFile)
		if resolved != expectedResolved {
			t.Errorf("Resolve symlink: got %q, want %q", resolved, expectedResolved)
		}
	})

	t.Run("ReadFile after symlink resolution", func(t *testing.T) {
		resolved, err := reader.Resolve(symlinkedFile)
		if err != nil {
			t.Fatalf("Resolve failed: %v", err)
		}
		content, err := reader.ReadFile(resolved)
		if err != nil {
			t.Fatalf("ReadFile failed: %v", err)
		}
		if content != testContent {
			t.Errorf("ReadFile content mismatch: got %q, want %q", content, testContent)
		}
	})

	t.Run("Resolve missing file", func(t *testing.T) {
		missingFile := filepath.Join(tmpDir, "missing.md")
		_, err := reader.Resolve(missingFile)
		if err == nil {
			t.Errorf("Resolve missing file should fail, got nil error")
		}
	})

	t.Run("ReadFile missing file", func(t *testing.T) {
		missingFile := filepath.Join(tmpDir, "missing.md")
		_, err := reader.ReadFile(missingFile)
		if err == nil {
			t.Errorf("ReadFile missing file should fail, got nil error")
		}
	})
}
