package server

import (
	"encoding/json"
	"net/http"

	"madabyo/internal/workspace/external"
	"madabyo/internal/workspace/usecase"
)

func handleFile(reader external.FileReader) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		result := usecase.FileUsecase{}.Get(r.URL.Query().Get("path"), reader)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}
