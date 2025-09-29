package services

import (
	"context"
	"log"

	"google.golang.org/genai"
)

const (
	PREDEFINED_PROMPT = `
		YOU WILL GET PLAYER DATA AS INPUT RETURN RESPONSES IN CORRESPONDING FORMAT:
		if you think you should rotate send "1" **NO MARKUP"" Plain 1.
		if you think you should run send "2" **NO MARKUP"" Plain 2.	
	`
)

type Provider interface {
	SendRequest() string
	AppendData([]byte)
}

type GeminiProvider struct {
	body string
}

func NewGeminiProvider() *GeminiProvider {
	return &GeminiProvider{body: PREDEFINED_PROMPT}
}
func (p *GeminiProvider) AppendData(data []byte) {
	p.body += string(data)
	//max lenth of context
	p.body = p.body[max(0, len(p.body)-10000):len(p.body)]
}
func (p *GeminiProvider) SendRequest() string {
	ctx := context.Background()

	client, err := genai.NewClient(ctx, nil)
	if err != nil {
		log.Fatal(err)
	}
	result, err := client.Models.GenerateContent(
		ctx,
		"gemini-2.5-flash",
		genai.Text(p.body),
		nil,
	)
	if err != nil {
		log.Fatal(err)
	}
	return result.Text()
}
