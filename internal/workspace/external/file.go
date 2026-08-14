package external

import (
	"os"
	"path/filepath"
)

type FileReader interface {
	Resolve(abs string) (resolved string, err error)
	ReadFile(resolved string) (content string, err error)
	Stat(resolved string) (mtime int64, err error)
	WriteFile(resolved string, content string) error
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

func (OSFileReader) Stat(resolved string) (int64, error) {
	info, err := os.Stat(resolved)
	if err != nil {
		return 0, err
	}
	return info.ModTime().UnixMilli(), nil
}

func (OSFileReader) WriteFile(resolved string, content string) error {
	return os.WriteFile(resolved, []byte(content), 0644)
}
