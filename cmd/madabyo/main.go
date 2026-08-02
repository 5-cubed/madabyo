package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"madabyo/internal/server"
)

func configPath() string {
	dir, err := os.UserConfigDir()
	if err != nil {
		log.Printf("warning: could not determine user config dir (%v), falling back to ./madabyo-config.json", err)
		return "madabyo-config.json"
	}
	return filepath.Join(dir, "madabyo", "config.json")
}

func main() {
	cwd, err := os.Getwd()
	if err != nil {
		log.Printf("warning: could not determine working directory (%v), falling back to \".\"", err)
		cwd = "."
	}
	h, err := server.New(configPath(), cwd)
	if err != nil {
		log.Fatal(err)
	}

	addr := ":8765"
	log.Printf("madabyo listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, h))
}
