package usecase

import (
	"madabyo/internal/workspace/external"
	"madabyo/internal/workspace/logics"
	"madabyo/internal/workspace/objects"
)

type SettingsUsecase struct{}

func (SettingsUsecase) Get(store external.ConfigStore) (objects.Config, error) {
	return store.Load()
}

func (SettingsUsecase) Save(raw string, lister external.DirLister, store external.ConfigStore) (objects.Config, objects.ListResult, error) {
	cfg := objects.Config{WorkspacePath: raw}
	if err := logics.ValidateConfig(cfg); err != nil {
		current, loadErr := store.Load()
		if loadErr != nil {
			current = objects.Config{}
		}
		return current, objects.ListResult{Requested: raw, Error: err.Error()}, nil
	}

	result := ListingUsecase{}.List(raw, lister)
	if result.Error != "" {
		current, loadErr := store.Load()
		if loadErr != nil {
			current = objects.Config{}
		}
		return current, result, nil
	}

	if err := store.Save(cfg); err != nil {
		return objects.Config{}, objects.ListResult{}, err
	}

	return cfg, objects.ListResult{}, nil
}

func (SettingsUsecase) EnsureDefaultWorkspace(store external.ConfigStore, cwd string) error {
	cfg, err := store.Load()
	if err != nil {
		return err
	}
	if cfg.WorkspacePath != "" || cwd == "" {
		return nil
	}
	cfg.WorkspacePath = cwd
	return store.Save(cfg)
}
