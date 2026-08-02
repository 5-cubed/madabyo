package logics

import (
	"path/filepath"
	"testing"
)

func TestCleanAbs(t *testing.T) {
	cases := []struct {
		name string
		raw  string
	}{
		{"empty defaults to cwd", ""},
		{"relative path", "."},
		{"dot-dot segments", "a/../b"},
		{"already absolute", "/tmp/x"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := CleanAbs(c.raw)
			if err != nil {
				t.Fatalf("CleanAbs(%q) returned error: %v", c.raw, err)
			}
			if !filepath.IsAbs(got) {
				t.Fatalf("CleanAbs(%q) = %q, want absolute path", c.raw, got)
			}
		})
	}
}

func TestCleanAbs_EmptyDefaultsToCwd(t *testing.T) {
	fromEmpty, err := CleanAbs("")
	if err != nil {
		t.Fatalf("CleanAbs(\"\") returned error: %v", err)
	}
	fromDot, err := CleanAbs(".")
	if err != nil {
		t.Fatalf("CleanAbs(\".\") returned error: %v", err)
	}
	if fromEmpty != fromDot {
		t.Fatalf("CleanAbs(\"\") = %q, want same as CleanAbs(\".\") = %q", fromEmpty, fromDot)
	}
}
