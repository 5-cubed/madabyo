package server

import (
	"encoding/json"
	"io/fs"
	"net/http"

	"madabyo/web"
)

func New() (http.Handler, error) {
	dist, err := fs.Sub(web.DistFS, "dist")
	if err != nil {
		return nil, err
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	mux.Handle("/", http.FileServer(http.FS(dist)))

	return mux, nil
}
