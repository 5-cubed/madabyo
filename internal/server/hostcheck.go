package server

import (
	"net/http"
)

func hostCheckMiddleware(next http.Handler) http.Handler {
	return next
}
