import mongoose from "mongoose";

let connecting = false;
let seedDone = false;
let retryHandle: ReturnType<typeof setTimeout> | null = null;

export async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (connecting) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[mongodb] MONGODB_URI not set — whitelist features disabled");
    return;
  }

  connecting = true;
  if (retryHandle) { clearTimeout(retryHandle); retryHandle = null; }

  console.info("[mongodb] Connecting to Atlas…");

  mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20_000,
    connectTimeoutMS: 20_000,
    socketTimeoutMS: 45_000,
    heartbeatFrequencyMS: 30_000,
    maxPoolSize: 3,
    readPreference: "primaryPreferred",
  }).then(async () => {
    connecting = false;
    console.info("[mongodb] ✓ Connected to NEX0S_DB");
    await runSeed();
  }).catch((err: Error) => {
    connecting = false;
    // Log the real cause, ignore the generic "IP whitelist" red herring
    const msg = err.message ?? String(err);
    const isTls = msg.includes("SSL") || msg.includes("TLS") || msg.includes("tlsv");
    if (isTls) {
      console.warn("[mongodb] TLS error — scheduling retry in 15s:", msg.slice(0, 100));
    } else {
      console.error("[mongodb] Connection error — retrying in 15s:", msg.slice(0, 200));
    }
    scheduleRetry(15_000);
  });
}

function scheduleRetry(delayMs: number) {
  if (retryHandle) clearTimeout(retryHandle);
  retryHandle = setTimeout(() => {
    retryHandle = null;
    connectMongo();
  }, delayMs);
}

mongoose.connection.on("connected", () => {
  connecting = false;
  console.info("[mongodb] ✓ Ready");
  if (!seedDone) runSeed();
});

mongoose.connection.on("disconnected", () => {
  connecting = false;
  const state = mongoose.connection.readyState;
  // State 3 = disconnecting (intentional), don't retry
  if (state !== 3) {
    console.warn("[mongodb] Disconnected — retrying in 10s…");
    scheduleRetry(10_000);
  }
});

mongoose.connection.on("error", (err: Error) => {
  const msg = err?.message ?? String(err);
  const isTls = msg.includes("SSL") || msg.includes("TLS") || msg.includes("tlsv");
  if (isTls) {
    // Atlas M0 secondary TLS alerts are transient — suppress verbose output
    console.warn("[mongodb] Transient TLS alert (Atlas M0) — will auto-recover");
  } else {
    console.error("[mongodb] Error:", msg.slice(0, 200));
  }
});

async function runSeed() {
  if (seedDone) return;
  if (!isMongoConnected()) return;
  try {
    const { WhitelistedUser } = await import("../models/WhitelistedUser");
    const SEED_EMAILS = ["fady.basem347@gmail.com", "nexus.admin@gmail.com"];
    for (const email of SEED_EMAILS) {
      const exists = await WhitelistedUser.findOne({ email }).maxTimeMS(8_000);
      if (!exists) {
        await WhitelistedUser.create({ email, addedBy: "system", note: "Master admin — auto-seeded" });
        console.info(`[mongodb] ✓ Seeded whitelist entry: ${email}`);
      }
    }
    seedDone = true;
    console.info("[mongodb] Whitelist seed complete");
  } catch (err) {
    console.warn("[mongodb] Seed error (will retry on next connect):", err instanceof Error ? err.message : err);
  }
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function mongoReadyState(): number {
  return mongoose.connection.readyState;
}

export { mongoose };
