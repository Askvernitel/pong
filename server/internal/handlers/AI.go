package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"pong.ge/internal/models"
	"pong.ge/internal/services"
)

type AIHandler struct {
}

func NewAIHandler() *AIHandler {
	return &AIHandler{}
}
func (ah *AIHandler) HandleCoachRequest(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Access-Control-Allow-Origin", "http://127.0.0.1:5500")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	reqBody, err := io.ReadAll(r.Body)

	fmt.Println("TTHERE")
	if err != nil {
		w.WriteHeader(403)
		return
	}
	fmt.Println("PTHERE")
	parsed := &models.ProviderRequest{}
	fmt.Println("ReqBody" + string(reqBody))
	err = json.Unmarshal(reqBody, parsed)
	if err != nil {
		w.WriteHeader(403)
		return
	}

	fmt.Println("THERE")
	provider, err := services.GetPlayerProviderByName(parsed.Name)
	if err != nil {
		w.WriteHeader(403)
		return
	}
	fmt.Println("HERE")
	AIresponse := provider.SendRequest()

	response, err := json.Marshal(&models.ProviderResponse{State: AIresponse})
	if err != nil {
		w.Write([]byte(err.Error()))
		return
	}
	w.Header().Set("contentType", "application/json")
	w.Write(response)
}
