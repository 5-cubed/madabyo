package server

import (
	"encoding/json"
	"io/fs"
	"net/http"

	"madabyo/internal/workspace/external"
	"madabyo/web"
)

func New(configPath string) (http.Handler, error) {
	dist, err := fs.Sub(web.DistFS, "dist")
	if err != nil {
		return nil, err
	}

	lister := external.OSDirLister{}
	store := external.JSONFileConfigStore{Path: configPath}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/api/list", handleList(lister))
	mux.HandleFunc("/api/settings", handleSettings(store, lister))
	mux.Handle("/", http.FileServer(http.FS(dist)))

	return hostCheckMiddleware(mux), nil
}
