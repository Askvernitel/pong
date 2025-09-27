package main

import (
	"net/http"
	"time"

	"pong.ge/internal/handlers"
	"pong.ge/internal/services"
)

func main() {
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
