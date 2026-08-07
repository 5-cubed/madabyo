package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

var validLevels = map[string]bool{
	"error": true,
	"warn":  true,
	"info":  true,
	"debug": true,
}

const maxLogPayloadSize = 4 * 1024

func handleLog(logger *log.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, maxLogPayloadSize)

		var payload struct {
			Level   string `json:"level"`
			Message string `json:"message"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		if !validLevels[payload.Level] {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		cleanMessage := strings.ReplaceAll(payload.Message, "\n", " ")
		logger.Printf("[%s] %s", payload.Level, cleanMessage)
		w.WriteHeader(http.StatusOK)
	}
}
