package external

import (
	"os"
	"path/filepath"
	"testing"
)

func TestOSDirLister_Resolve(t *testing.T) {
	dir := t.TempDir()
	if err := os.Mkdir(filepath.Join(dir, "sub"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "file.txt"), []byte("hi"), 0o644); err != nil {
		t.Fatal(err)
	}

	lister := OSDirLister{}

	t.Run("lists directory entries", func(t *testing.T) {
		resolved, entries, err := lister.Resolve(dir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resolved == "" {
			t.Fatal("expected non-empty resolved path")
		}
		if len(entries) != 2 {
			t.Fatalf("expected 2 entries, got %d: %+v", len(entries), entries)
		}
	})

	t.Run("not a directory fails at readdir stage", func(t *testing.T) {
		filePath := filepath.Join(dir, "file.txt")
		resolved, _, err := lister.Resolve(filePath)
		if err == nil {
			t.Fatal("expected error for non-directory path")
		}
		if resolved == "" {
			t.Fatal("expected resolved to be populated even on readdir failure")
		}
	})

	t.Run("nonexistent path fails at evalsymlinks stage", func(t *testing.T) {
		resolved, _, err := lister.Resolve(filepath.Join(dir, "does-not-exist"))
		if err == nil {
			t.Fatal("expected error for nonexistent path")
		}
		if resolved != "" {
			t.Fatalf("expected resolved to be empty on evalsymlinks failure, got %q", resolved)
		}
	})
}
