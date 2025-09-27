import { syncAgent } from './renderer.js';

const ws = new WebSocket("wss://asd.com/ws");
const API_LINK = "asd/api/asd"

export async function sendCoaching(msg) {
    try {
        const response = await fetch(API_LINK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: msg })
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

ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("Received:", data);
});