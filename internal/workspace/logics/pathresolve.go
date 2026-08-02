package logics

import "path/filepath"

func CleanAbs(raw string) (string, error) {
	if raw == "" {
		raw = "."
	}
	cleaned := filepath.Clean(raw)
	return filepath.Abs(cleaned)
}
