import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

let redis;

async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[Redis] REDIS_URL not set, skipping");
    return;
  }
  try {
    redis = new Redis(url);
    await redis.ping();
    console.log("[Redis] Connected");
  } catch (err) {
    console.error("[Redis] Connection error:", err.message);
    process.exit(1);
  }
}

function getRedis() {
  return redis;
}

export { connectRedis, getRedis };
