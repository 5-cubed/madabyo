package server

import (
	"encoding/json"
	"net/http"

	"madabyo/internal/workspace/external"
	"madabyo/internal/workspace/usecase"
)

func handleFile(reader external.FileReader) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method == http.MethodGet {
			result := usecase.FileUsecase{}.Get(r.URL.Query().Get("path"), reader)
			json.NewEncoder(w).Encode(result)
			return
		}

		if r.Method == http.MethodPut {
			var req struct {
				Path          string `json:"path"`
				Content       string `json:"content"`
				ExpectedMtime int64  `json:"expectedMtime"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				result := map[string]string{"error": "invalid request body"}
				json.NewEncoder(w).Encode(result)
				return
			}
			result := usecase.FileUsecase{}.Save(req.Path, req.Content, req.ExpectedMtime, reader)
			json.NewEncoder(w).Encode(result)
			return
		}

		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
	}
}
