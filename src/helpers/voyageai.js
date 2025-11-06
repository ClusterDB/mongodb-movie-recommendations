import {VoyageAIClient} from 'voyageai';
import config from "../config.js";

let client;
let isConnecting = false;

export function getVoyageClient() {
  if (client) return client;
  try {
    if (isConnecting) {
      throw new Error("Voyage AI client is already being initialized");
    }

    isConnecting = true;

    const apiKey = config.voyageAPIKey;
    if (!apiKey) {
      throw new Error("Voyage AI API key not configured!");
    }
    
    client = new VoyageAIClient({ apiKey: apiKey })
    console.log("✅ Voyage AI client initialized");

    isConnecting = false;
    return client;
  } catch (err) {
    console.error("🚨 Voyage AI client initialization failed:", err.message);
    client = null;
    isConnecting = false;
    throw err;
  }
}

export default getVoyageClient;