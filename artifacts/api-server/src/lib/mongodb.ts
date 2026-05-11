import mongoose from "mongoose";

let connected = false;

export async function connectMongo(): Promise<void> {
  if (connected || mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[mongodb] MONGODB_URI not set — whitelist features disabled");
    return;
  }
  try {
    await mongoose.connect(uri, { dbName: "NEX0S_DB" });
    connected = true;
    console.info("[mongodb] Connected to NEX0S_DB");
  } catch (err) {
    console.error("[mongodb] Connection failed:", err);
  }
}

export { mongoose };
