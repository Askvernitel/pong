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

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	reqBody, err := io.ReadAll(r.Body)
	if err != nil || len(reqBody) == 0 {
		fmt.Println("Empty or unreadable body:", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	fmt.Println("Raw body:", string(reqBody))
	parsed := &models.ProviderRequest{}
	if err := json.Unmarshal(reqBody, parsed); err != nil {
		fmt.Println("Unmarshal error:", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	provider, err := services.GetPlayerProviderByName(parsed.Name)
	if err != nil {
		fmt.Println("Could not find provider:", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	provider.AppendData([]byte(parsed.Msg))
	AIresponse := provider.SendRequest()

	provider.AppendData([]byte(AIresponse))

	fmt.Println("Response: ", string(AIresponse))

	response, _ := json.Marshal(&models.ProviderResponse{State: AIresponse})
	w.Header().Set("Content-Type", "application/json")
	w.Write(response)
}
