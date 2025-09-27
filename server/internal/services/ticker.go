package services

import "time"

type ToTick interface {
	OnTick()
}
type ITicker interface {
}
type Ticker struct {
	toTick []ToTick
	delta  time.Duration
}

func NewTicker(delta time.Duration) *Ticker {
	return &Ticker{toTick: []ToTick{}, delta: delta}
}
func (t *Ticker) RegisterToTick(tick ToTick) {
	t.toTick = append(t.toTick, tick)
}
func (t *Ticker) TickAll() {
	for _, toTick := range t.toTick {
		toTick.OnTick()
	}
}

func (t *Ticker) Run() {
	tckr := time.NewTicker(t.delta)

	for range tckr.C {
		t.TickAll()
	}
}
