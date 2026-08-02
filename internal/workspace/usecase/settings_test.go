package usecase

import (
	"errors"
	"testing"

	"madabyo/internal/workspace/objects"
)

type fakeConfigStore struct {
	cfg      objects.Config
	loadErr  error
	saveErr  error
	saveCall *objects.Config
}

func (f *fakeConfigStore) Load() (objects.Config, error) {
	return f.cfg, f.loadErr
}

func (f *fakeConfigStore) Save(cfg objects.Config) error {
	f.saveCall = &cfg
	if f.saveErr != nil {
		return f.saveErr
	}
	f.cfg = cfg
	return nil
}

func TestSettingsUsecase_Save(t *testing.T) {
	t.Run("empty path is rejected without touching the store", func(t *testing.T) {
		store := &fakeConfigStore{}
		lister := fakeDirLister{}

		_, result, err := SettingsUsecase{}.Save("", lister, store)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Error == "" {
			t.Fatal("expected validation error")
		}
		if store.saveCall != nil {
			t.Fatal("Save should not have been called on the store")
		}
	})

	t.Run("unlistable path is rejected, store unchanged", func(t *testing.T) {
		store := &fakeConfigStore{cfg: objects.Config{WorkspacePath: "/old"}}
		lister := fakeDirLister{err: errors.New("not found")}

		saved, result, err := SettingsUsecase{}.Save("/bad", lister, store)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Error == "" {
			t.Fatal("expected listing error")
		}
		if saved.WorkspacePath != "/old" {
			t.Fatalf("expected unchanged config /old, got %q", saved.WorkspacePath)
		}
		if store.saveCall != nil {
			t.Fatal("Save should not have been called on the store")
		}
	})

	t.Run("valid listable path is persisted", func(t *testing.T) {
		store := &fakeConfigStore{}
		lister := fakeDirLister{resolved: "/tmp/ws", entries: nil}

		saved, result, err := SettingsUsecase{}.Save("/tmp/ws", lister, store)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Error != "" {
			t.Fatalf("unexpected list error: %q", result.Error)
		}
		if saved.WorkspacePath != "/tmp/ws" {
			t.Fatalf("saved.WorkspacePath = %q, want /tmp/ws", saved.WorkspacePath)
		}
		if store.saveCall == nil || store.saveCall.WorkspacePath != "/tmp/ws" {
			t.Fatal("expected store.Save to be called with /tmp/ws")
		}
	})
}

func TestSettingsUsecase_Get(t *testing.T) {
	store := &fakeConfigStore{cfg: objects.Config{WorkspacePath: "/tmp/ws"}}
	cfg, err := SettingsUsecase{}.Get(store)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.WorkspacePath != "/tmp/ws" {
		t.Fatalf("cfg.WorkspacePath = %q, want /tmp/ws", cfg.WorkspacePath)
	}
}

func TestSettingsUsecase_EnsureDefaultWorkspace(t *testing.T) {
	t.Run("empty config + non-empty cwd fills config", func(t *testing.T) {
		store := &fakeConfigStore{cfg: objects.Config{}}
		err := SettingsUsecase{}.EnsureDefaultWorkspace(store, "/home/user")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if store.saveCall == nil {
			t.Fatal("expected Save to be called")
		}
		if store.saveCall.WorkspacePath != "/home/user" {
			t.Fatalf("saved WorkspacePath = %q, want /home/user", store.saveCall.WorkspacePath)
		}
	})

	t.Run("non-empty config is untouched by cwd", func(t *testing.T) {
		store := &fakeConfigStore{cfg: objects.Config{WorkspacePath: "/existing"}}
		err := SettingsUsecase{}.EnsureDefaultWorkspace(store, "/home/user")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if store.saveCall != nil {
			t.Fatal("expected Save not to be called when config already has a path")
		}
	})

	t.Run("empty cwd is a no-op", func(t *testing.T) {
		store := &fakeConfigStore{cfg: objects.Config{}}
		err := SettingsUsecase{}.EnsureDefaultWorkspace(store, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if store.saveCall != nil {
			t.Fatal("expected Save not to be called when cwd is empty")
		}
	})
}
