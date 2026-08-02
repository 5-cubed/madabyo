package logics

import (
	"errors"

	"madabyo/internal/workspace/objects"
)

func ValidateConfig(cfg objects.Config) error {
	if cfg.WorkspacePath == "" {
		return errors.New("workspacePath must not be empty")
	}
	return nil
}
