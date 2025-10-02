import { syncAgent, gameState } from "./renderer.js";
const API_LINK = "http://localhost:8888/provider/response";

export async function sendCoaching(msg) {
  try {
    const response = await fetch(API_LINK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: gameState.playerName, msg: msg }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error sending coaching message:", err);
    throw err;
  }
}
