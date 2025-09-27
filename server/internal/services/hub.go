package services

import (
	"github.com/gorilla/websocket"
)

type IHub interface {
	RegisterPlayer(string, *websocket.Conn)
}

type Hub struct {
	players map[string]*websocket.Conn

	errors []error
}

func NewHub() *Hub {
	return &Hub{players: make(map[string]*websocket.Conn)}
}
func (h *Hub) RegisterPlayer(player string, conn *websocket.Conn) {
	h.players[player] = conn
}
func (h *Hub) OnTick() {
	h.WriteToAllPlayers("Hello")
}
func (h *Hub) WriteToAllPlayers(msg string) {
	for _, player := range h.players {
		err := player.WriteMessage(websocket.TextMessage, []byte(msg))
		if err != nil {
			h.errors = append(h.errors, err)
		}
	}
}

func (h *Hub) ReadPlayerAllData() {

}
