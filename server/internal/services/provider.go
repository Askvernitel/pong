package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	"google.golang.org/genai"
)

const (
	PREDEFINED_PROMPT = `
You are a coaching AI for a fighting game. You will be given strings of player actions and coaching instructions. 

Your task:
- Analyze the latest message using the context of previous messages.
- Decide a single action to recommend from the following action list:

0: Forward
1: Backward
2: Strafe Right
3: Strafe Left
4: Left Jab
5: Right Jab
6: Side Attack Left
7: Side Attack Right
8: Defend Center
9: Defend Right
10: Defend Left

Output **ONLY valid JSON** with the following format:

{
  "thought": "short description of your current thought",
  "state": <number from 0 to 10>
}

Rules:
- Do not include explanations, backticks, comments, or markdown.
- Do not output anything besides the JSON object.
- [state] must always be an integer 0–10.
- [thought] should be 1–2 short sentences summarizing your reasoning.
`
)

var mapAIToProviders map[string]Provider = make(map[string]Provider)

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

func RegisterPlayerToProvider(name string, provider Provider) {
	fmt.Println("REGISTER", name)
	mapAIToProviders[name] = provider
}

func GetPlayerProviderByName(name string) (Provider, error) {
	res, ok := mapAIToProviders[name]
	if !ok {
		return nil, fmt.Errorf("Provider Not Found")
	}
	return res, nil
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
	// limit context to last ~10k chars // davita idzaxis rom 4096 sakmarisia
	if len(p.body) > 4096 {
		p.body = p.body[len(p.body)-4096:]
	}
}

func (p *LlamaProvider) SendRequest() string {
	ctx := context.Background()

	// Build OpenAI-compatible request
	aiPayload, _ := json.Marshal(p.body)
	fmt.Println("JSON sent to llama-server:", string(aiPayload))

	payload := map[string]interface{}{
		"model": "local-llama",
		"messages": []map[string]string{
			{"role": "system", "content": PREDEFINED_PROMPT},
			{"role": "user", "content": string(aiPayload)},
		},
		"temperature":    0.6,
		"max_new_tokens": 128,
		"stream":         false,
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
