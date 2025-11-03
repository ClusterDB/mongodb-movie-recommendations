import { MongoClient } from "mongodb";
import config from "../config.js";

let client;
let db;
let isConnecting = false;

export async function connectDB() {
  if (db) return db; 
  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return db;
  }

  isConnecting = true;

  try {
    console.log(`🔌 Connecting to MongoDB... at ${config.mongoDBURI}`);
    client = new MongoClient(config.mongoDBURI, {
      maxPoolSize: 10,              
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(config.database);

    console.log("✅ MongoDB connected");

    // Optional: listen for connection loss
    client.on("close", () => {
      console.warn("⚠️ MongoDB connection closed");
      db = null; // force reconnect on next call
    });

    client.on("error", (err) => {
      console.error("❌ MongoDB client error:", err);
      db = null; // clear cached db on error
    });

    return db;
  } catch (err) {
    console.error("🚨 MongoDB connection failed:", err.message);
    db = null;
    throw err;
  } finally {
    isConnecting = false;
  }
}

export async function getDB() {
  if (!db) {
    return await connectDB();
  }
  return db;
}