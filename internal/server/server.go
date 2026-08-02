package server

import (
	"encoding/json"
	"io/fs"
	"net/http"

	"madabyo/internal/workspace/external"
	"madabyo/internal/workspace/usecase"
	"madabyo/web"
)

func New(configPath string, cwd string) (http.Handler, error) {
	dist, err := fs.Sub(web.DistFS, "dist")
	if err != nil {
		return nil, err
	}

	lister := external.OSDirLister{}
	store := external.JSONFileConfigStore{Path: configPath}
	fileReader := external.OSFileReader{}

	// Ensure default workspace is set if config is empty
	if err := (usecase.SettingsUsecase{}).EnsureDefaultWorkspace(store, cwd); err != nil {
		return nil, err
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/api/list", handleList(lister))
	mux.HandleFunc("/api/file", handleFile(fileReader))
	mux.HandleFunc("/api/settings", handleSettings(store, lister))
	mux.Handle("/", http.FileServer(http.FS(dist)))

	return hostCheckMiddleware(mux), nil
}
