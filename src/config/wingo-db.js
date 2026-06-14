import mongoose from "mongoose";

const conn = mongoose.createConnection();

async function connectWingoDB() {
  const uri = process.env.WINGO_MONGO_URI;
  if (!uri) {
    console.warn("[WingoDB] WINGO_MONGO_URI not set, skipping");
    return;
  }
  try {
    await conn.openUri(uri);
    console.log("[WingoDB] Wingo MongoDB connected");
  } catch (err) {
    console.error("[WingoDB] Connection error:", err.message);
    process.exit(1);
  }
}

export { conn, connectWingoDB };
