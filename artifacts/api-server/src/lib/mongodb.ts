import mongoose from "mongoose";

let connectPromise: Promise<void> | null = null;

export async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (connectPromise) return connectPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[mongodb] MONGODB_URI not set — whitelist features disabled");
    return;
  }

  connectPromise = mongoose.connect(uri, {
    dbName: "NEX0S_DB",
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  }).then(() => {
    console.info("[mongodb] Connected to NEX0S_DB");
  }).catch((err) => {
    console.warn("[mongodb] Connection failed (whitelist will fail-open):", err?.message ?? err);
    connectPromise = null;
  });

  return connectPromise;
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export { mongoose };
