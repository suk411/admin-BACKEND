import { getRedis } from "../config/redis.js";

const MODE_KEY = "wingo:resultMode";
const DEFAULT_MODE = "RANDOM";

export async function getResultMode() {
  try {
    const redis = getRedis();
    if (!redis) return DEFAULT_MODE;
    const mode = await redis.get(MODE_KEY);
    return mode || DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export async function setResultMode(mode) {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(MODE_KEY, mode);
}
