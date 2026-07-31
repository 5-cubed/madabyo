package main

import (
	"log"
	"net/http"

	"madabyo/internal/server"
)

func main() {
	h, err := server.New()
	if err != nil {
		log.Fatal(err)
	}

	addr := ":8765"
	log.Printf("madabyo listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, h))
}
