export const GAME_MODES = {
  "30s": { durationMs: 30000, bettingMs: 25000, gameCode: "WinGo_30S", intervalMinute: 0.5 },
  "1m":  { durationMs: 60000, bettingMs: 55000, gameCode: "WinGo_1M",  intervalMinute: 1 },
  "3m":  { durationMs: 180000, bettingMs: 175000, gameCode: "WinGo_3M", intervalMinute: 3 },
  "5m":  { durationMs: 300000, bettingMs: 295000, gameCode: "WinGo_5M", intervalMinute: 5 },
};

export const MODE_LIST = ["30s", "1m", "3m", "5m"];
export const DEFAULT_MODE = "30s";

export function getModeConfig(mode) {
  return GAME_MODES[mode] || GAME_MODES[DEFAULT_MODE];
}

export function redisKey(base, mode = DEFAULT_MODE) {
  return `wingo:${mode}:${base}`;
}

export function extractMode(req) {
  return req.query?.mode || req.body?.gameMode || req.body?.mode || DEFAULT_MODE;
}
