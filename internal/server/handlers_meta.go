package server

import (
	"encoding/json"
	"net/http"

	"madabyo/internal/workspace/external"
	"madabyo/internal/workspace/usecase"
)

func handleMeta(reader external.FileReader) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		result := usecase.FileUsecase{}.Meta(r.URL.Query().Get("path"), reader)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}
