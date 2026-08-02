package external

import (
	"os"
	"path/filepath"
)

type FileReader interface {
	Resolve(abs string) (resolved string, err error)
	ReadFile(resolved string) (content string, err error)
}

type OSFileReader struct{}

func (OSFileReader) Resolve(abs string) (string, error) {
	return filepath.EvalSymlinks(abs)
}

func (OSFileReader) ReadFile(resolved string) (string, error) {
	data, err := os.ReadFile(resolved)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
