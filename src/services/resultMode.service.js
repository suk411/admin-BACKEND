import { getRedis } from "../config/redis.js";
import { DEFAULT_MODE as DEFAULT_GAME_MODE, redisKey } from "../config/gameModes.js";

const DEFAULT_RESULT_MODE = "RANDOM";

export async function getResultMode(gameMode = DEFAULT_GAME_MODE) {
  try {
    const redis = getRedis();
    if (!redis) return DEFAULT_RESULT_MODE;
    const key = redisKey("resultMode", gameMode);
    const mode = await redis.get(key);
    return mode || DEFAULT_RESULT_MODE;
  } catch {
    return DEFAULT_RESULT_MODE;
  }
}

export async function setResultMode(resultMode, gameMode = DEFAULT_GAME_MODE) {
  const redis = getRedis();
  if (!redis) return;
  const key = redisKey("resultMode", gameMode);
  await redis.set(key, resultMode);
}
