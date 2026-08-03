package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"madabyo/internal/server"
)

const defaultPort = 4800

func configPath() string {
	dir, err := os.UserConfigDir()
	if err != nil {
		log.Printf("warning: could not determine user config dir (%v), falling back to ./madabyo-config.json", err)
		return "madabyo-config.json"
	}
	return filepath.Join(dir, "madabyo", "config.json")
}

func main() {
	port := flag.Int("port", defaultPort, "HTTP server port")
	flag.IntVar(port, "p", defaultPort, "HTTP server port (shorthand)")
	flag.Parse()

	cwd, err := os.Getwd()
	if err != nil {
		log.Printf("warning: could not determine working directory (%v), falling back to \".\"", err)
		cwd = "."
	}
	h, err := server.New(configPath(), cwd)
	if err != nil {
		log.Fatal(err)
	}

	addr := fmt.Sprintf(":%d", *port)
	log.Printf("madabyo listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, h))
}
