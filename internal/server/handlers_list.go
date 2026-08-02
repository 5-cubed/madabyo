package server

import (
	"encoding/json"
	"net/http"

	"madabyo/internal/workspace/external"
	"madabyo/internal/workspace/usecase"
)

func handleList(lister external.DirLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		result := usecase.ListingUsecase{}.List(r.URL.Query().Get("path"), lister)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}
