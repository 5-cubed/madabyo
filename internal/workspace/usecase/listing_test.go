package usecase

import (
	"errors"
	"testing"

	"madabyo/internal/workspace/objects"
)

type fakeDirLister struct {
	resolved string
	entries  []objects.Entry
	err      error
}

func (f fakeDirLister) Resolve(abs string) (string, []objects.Entry, error) {
	return f.resolved, f.entries, f.err
}

func TestListingUsecase_List(t *testing.T) {
	t.Run("success returns entries", func(t *testing.T) {
		lister := fakeDirLister{resolved: "/tmp", entries: []objects.Entry{{Name: "a", IsDir: true}}}
		result := ListingUsecase{}.List("/tmp", lister)

		if result.Error != "" {
			t.Fatalf("unexpected error: %q", result.Error)
		}
		if result.Resolved != "/tmp" {
			t.Fatalf("Resolved = %q, want /tmp", result.Resolved)
		}
		if len(result.Entries) != 1 {
			t.Fatalf("expected 1 entry, got %d", len(result.Entries))
		}
	})

	t.Run("resolve failure surfaces as error", func(t *testing.T) {
		lister := fakeDirLister{err: errors.New("boom")}
		result := ListingUsecase{}.List("/tmp", lister)

		if result.Error == "" {
			t.Fatal("expected error, got none")
		}
	})
}
