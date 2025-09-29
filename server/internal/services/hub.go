package services

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
	"pong.ge/internal/models"
)

type IHub interface {
	RegisterPlayer(string, *websocket.Conn, Provider)
}
type PlayerConn struct {
	Conn       *websocket.Conn
	Mu         sync.Mutex
	AIProvider Provider
}

func (pl *PlayerConn) WriteMessage(t int, msg []byte) {
	pl.AIProvider.AppendData(msg)
	fmt.Println(string(msg))
	msgPlayer := models.Message{Type: "GAME", Payload: string(msg)}
	//	go pl.WriteAIMessage(t)
	pl.Conn.WriteMessage(t, msgPlayer.Serialized())
}
func (pl *PlayerConn) WriteAIMessage(t int) {
	resp := pl.AIProvider.SendRequest()
	msgAI := models.Message{Type: "AI", Payload: resp}
	pl.Conn.WriteMessage(t, msgAI.Serialized())
}

type Hub struct {
	players map[string]*PlayerConn

	errors []error
}

func NewHub() *Hub {
	return &Hub{players: make(map[string]*PlayerConn)}
}
func (h *Hub) RegisterPlayer(player string, conn *websocket.Conn, provider Provider) {
	h.players[player] = &PlayerConn{Conn: conn, Mu: sync.Mutex{}, AIProvider: provider}

	go h.ReadPlayerAndWrite(player, conn)

}
func (h *Hub) OnTick() {
	for _, err := range h.errors {
		fmt.Println("ERROR " + err.Error())
	}
	h.errors = []error{}
}
func (h *Hub) WriteToAllPlayers(writer string, msg []byte) {

	for name, player := range h.players {
		if name == writer {
			continue
		}
		player.Mu.Lock()
		player.WriteMessage(websocket.TextMessage, msg)
		player.Mu.Unlock()
		/*
			if err != nil {
				h.errors = append(h.errors, err)
			}*/
	}
}
func (h *Hub) ReadPlayerAndWrite(name string, c *websocket.Conn) {
	for {
		p := &models.Player{}
		if err := c.ReadJSON(p); err != nil {
			h.errors = append(h.errors, err)
			c.Close()
			delete(h.players, name)
			return
		}
		data, err := json.Marshal(p)
		if err != nil {
			h.errors = append(h.errors, err)
			c.Close()
			delete(h.players, name)
			return
		}
		h.WriteToAllPlayers(name, data)
	}
}
