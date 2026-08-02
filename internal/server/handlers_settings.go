package server

import (
	"encoding/json"
	"net/http"

	"madabyo/internal/workspace/external"
	"madabyo/internal/workspace/objects"
	"madabyo/internal/workspace/usecase"
)

func handleSettings(store external.ConfigStore, lister external.DirLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleSettingsGet(w, store)
		case http.MethodPut:
			handleSettingsPut(w, r, store, lister)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func handleSettingsGet(w http.ResponseWriter, store external.ConfigStore) {
	cfg, err := usecase.SettingsUsecase{}.Get(store)
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	json.NewEncoder(w).Encode(cfg)
}

func handleSettingsPut(w http.ResponseWriter, r *http.Request, store external.ConfigStore, lister external.DirLister) {
	var body objects.Config
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
		return
	}

	saved, listResult, err := usecase.SettingsUsecase{}.Save(body.WorkspacePath, lister, store)
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if listResult.Error != "" {
		json.NewEncoder(w).Encode(map[string]string{
			"error":         listResult.Error,
			"workspacePath": saved.WorkspacePath,
		})
		return
	}

	json.NewEncoder(w).Encode(saved)
}
