package external

import (
	"encoding/json"
	"os"
	"path/filepath"

	"madabyo/internal/workspace/objects"
)

type ConfigStore interface {
	Load() (objects.Config, error)
	Save(objects.Config) error
}

type JSONFileConfigStore struct {
	Path string
}

func (s JSONFileConfigStore) Load() (objects.Config, error) {
	data, err := os.ReadFile(s.Path)
	if os.IsNotExist(err) {
		return objects.Config{}, nil
	}
	if err != nil {
		return objects.Config{}, err
	}

	var cfg objects.Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return objects.Config{}, err
	}
	return cfg, nil
}

func (s JSONFileConfigStore) Save(cfg objects.Config) error {
	if err := os.MkdirAll(filepath.Dir(s.Path), 0o755); err != nil {
		return err
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(s.Path, data, 0o644)
}
