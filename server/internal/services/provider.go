package services

import "net/http"

type Provider interface {
	SendRequest(string) *http.Response
}

type GeminiProvider struct {
}
