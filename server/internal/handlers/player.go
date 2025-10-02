package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"pong.ge/internal/models"
	"pong.ge/internal/services"
)

type PlayerHandler struct {
	hub    services.IHub
	ticker services.ITicker
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func NewPlayerHandler(hub services.IHub, ticker services.ITicker) *PlayerHandler {
	return &PlayerHandler{hub: hub, ticker: ticker}
}
func (h *PlayerHandler) HandleConn(w http.ResponseWriter, r *http.Request) {
	fmt.Println("REQUEST")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	_, msg, _ := conn.ReadMessage()
	fmt.Println("Connect:" + string(msg))
	p := &models.Player{}
	err = json.Unmarshal(msg, p)
	if err != nil {
		panic(err)
	}
	provider := services.NewLlamaProvider("http://127.0.0.1:6969")
	services.RegisterPlayerToProvider(p.Name, provider)
	h.hub.RegisterPlayer(p.Name, conn, provider)
}
