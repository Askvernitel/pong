package main

import (
	"net/http"
	"os"
	"pong.ge/internal/handlers"
	"pong.ge/internal/services"
	"time"
)

func main() {
	os.Setenv("GEMINI_API_KEY", "AIzaSyCJi4jRhr-4MydvhEaT7Z5B2GUG9CrVoPo")
	hub := services.NewHub()
	ticker := services.NewTicker(1 * time.Second)
	ticker.RegisterToTick(hub)
	serveMux := http.NewServeMux()
	playerHandler := handlers.NewPlayerHandler(hub, ticker)

	serveMux.HandleFunc("/ws", playerHandler.HandleConn)

	go ticker.Run()
	if err := http.ListenAndServe(":8888", serveMux); err != nil {
		panic(err)
	}
}
