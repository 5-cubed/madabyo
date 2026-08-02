package external

import (
	"path/filepath"
	"testing"

	"madabyo/internal/workspace/objects"
)

func TestJSONFileConfigStore(t *testing.T) {
	t.Run("load missing file returns zero value, no error", func(t *testing.T) {
		store := JSONFileConfigStore{Path: filepath.Join(t.TempDir(), "config.json")}
		cfg, err := store.Load()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if cfg.WorkspacePath != "" {
			t.Fatalf("expected empty WorkspacePath, got %q", cfg.WorkspacePath)
		}
	})

	t.Run("save then load round-trips, creating parent dirs", func(t *testing.T) {
		store := JSONFileConfigStore{Path: filepath.Join(t.TempDir(), "nested", "config.json")}
		want := objects.Config{WorkspacePath: "/some/path"}

		if err := store.Save(want); err != nil {
			t.Fatalf("Save returned error: %v", err)
		}

		got, err := store.Load()
		if err != nil {
			t.Fatalf("Load returned error: %v", err)
		}
		if got != want {
			t.Fatalf("Load() = %+v, want %+v", got, want)
		}
	})
}
