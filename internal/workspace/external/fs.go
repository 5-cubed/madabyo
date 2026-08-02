package external

import (
	"os"
	"path/filepath"

	"madabyo/internal/workspace/objects"
)

type DirLister interface {
	Resolve(abs string) (resolved string, entries []objects.Entry, err error)
}

type OSDirLister struct{}

func (OSDirLister) Resolve(abs string) (string, []objects.Entry, error) {
	resolved, err := filepath.EvalSymlinks(abs)
	if err != nil {
		return "", nil, err
	}

	dirEntries, err := os.ReadDir(resolved)
	if err != nil {
		return resolved, nil, err
	}

	entries := make([]objects.Entry, 0, len(dirEntries))
	for _, de := range dirEntries {
		entries = append(entries, objects.Entry{Name: de.Name(), IsDir: de.IsDir()})
	}
	return resolved, entries, nil
}
