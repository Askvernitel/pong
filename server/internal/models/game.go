package models

import (
	"encoding/json"
	"fmt"

	"github.com/gorilla/websocket"
)

type PlayerData struct {
	PosX float64 `json:"posX"`
	PosY float64 `json:"posY"`

	VelocityX float64 `json:"velocityX"`
	VelocityY float64 `json:"velocityY"`

	Prompt string `json:"prompt"`

	Rot            float64        `json:"rotation"`
	TargetRot      float64        `json:"targetRotation"`
	State          float64        `json:"state"`
	Hp             float64        `json:"hp"`
	MaxHp          float64        `json:"maxHp"`
	Color          string         `json:"color"`
	KnockbackTimer float64        `json:"knockbackTimer"`
	DamageFlash    float64        `json:"damageFlash"`
	Hands          []*PlayerHands `json:"hands"`
}
type PlayerHands struct {
	Angle       float64 `json:"angle"`
	TargetAngle float64 `json:"targetAngle"`
	Len         float64 `json:"len"`
	Extending   bool    `json:"extending"`
	Retracting  bool    `json:"retracting"`
}
type Player struct {
	Name string `json:"name"`
	Conn *websocket.Conn

	PlayerData PlayerData `json:"playerData"`
}

type Message struct {
	Type    string `json:"type"`
	Payload string `json:"Payload"`
}

func (m *Message) Serialized() []byte {
	result, err := json.Marshal(m)
	if err != nil {
		fmt.Println(err)
	}
	return result
}
