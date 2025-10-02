package services

import (
	"bytes"
	"context"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"

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

type LlamaProvider struct {
	body string
	host string
}

func NewLlamaProvider(host string) *LlamaProvider {
	return &LlamaProvider{
		body: PREDEFINED_PROMPT,
		host: host, // e.g. "http://localhost:8080"
	}
}

func (p *LlamaProvider) AppendData(data []byte) {
	p.body += string(data)
	// limit context to last ~10k chars
	if len(p.body) > 10000 {
		p.body = p.body[len(p.body)-10000:]
	}
}

func (p *LlamaProvider) SendRequest() string {
	ctx := context.Background()

	// Build OpenAI-compatible request
	payload := map[string]interface{}{
		"model": "local-llama",
		"messages": []map[string]string{
			{"role": "system", "content": PREDEFINED_PROMPT},
			{"role": "user", "content": p.body},
		},
		"temperature": 0.6,
		"max_tokens":  128,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		log.Fatal(err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", p.host+"/v1/chat/completions", bytes.NewBuffer(data))
	if err != nil {
		log.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		log.Fatalf("unmarshal error: %v\nraw: %s", err, string(body))
	}

	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content
	}
	return ""
}
