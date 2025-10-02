package main

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"pong.ge/internal/handlers"
	"pong.ge/internal/services"
)

func main() {
	os.Setenv("GEMINI_API_KEY", "AIzaSyCJi4jRhr-4MydvhEaT7Z5B2GUG9CrVoPo")
	hub := services.NewHub()

	ticker := services.NewTicker(1 * time.Second)
	ticker.RegisterToTick(hub)
	serveMux := http.NewServeMux()
	playerHandler := handlers.NewPlayerHandler(hub, ticker)
	AIHandler := handlers.NewAIHandler()
	serveMux.HandleFunc("/ws", playerHandler.HandleConn)
	serveMux.HandleFunc("/provider/response", AIHandler.HandleCoachRequest)
	go ticker.Run()
	fmt.Printf("READY!")
	if err := http.ListenAndServe(":8888", serveMux); err != nil {
		panic(err)
	}
}
