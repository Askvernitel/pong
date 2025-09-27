package models

import "github.com/gorilla/websocket"

type PlayerData struct {
	X float64
	Y float64

	Prompt string
}

type Player struct {
	Name       string
	Conn       *websocket.Conn
	PlayerData PlayerData
}
