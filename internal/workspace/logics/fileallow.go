package logics

import (
	"path/filepath"
	"strings"
)

func IsAllowedFile(resolved string) bool {
	base := filepath.Base(resolved)
	ext := strings.ToLower(filepath.Ext(base))
	if ext == ".md" || ext == ".markdown" {
		return true
	}
	return ext == "" && strings.EqualFold(base, "README")
}
