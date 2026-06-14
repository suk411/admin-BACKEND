import { istNow } from "./time.js";

const MAX_LOGS = 2000;
const buffer = [];

function push(entry) {
  buffer.push(entry);
  if (buffer.length > MAX_LOGS) buffer.shift();
}

function now() {
  return istNow();
}

function oneLine(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

function info(message, meta = {}) {
  const entry = {
    ts: now(),
    level: "info",
    message: oneLine(message),
    meta,
  };
  push(entry);
}

function error(err, meta = {}) {
  const e = err instanceof Error ? err : new Error(String(err));
  const entry = {
    ts: now(),
    level: "error",
    message: oneLine(e.message || "Error"),
    stack: e.stack || String(err),
    meta,
  };
  push(entry);
}

function warn(message, meta = {}) {
  const entry = {
    ts: now(),
    level: "warn",
    message: oneLine(message),
    meta,
  };
  push(entry);
}

function getLogs({ level, since, limit = 200 } = {}) {
  let items = buffer;
  if (level) items = items.filter((l) => l.level === level);
  if (since) {
    const sinceTs = new Date(since).getTime();
    if (!Number.isNaN(sinceTs)) {
      items = items.filter((l) => new Date(l.ts).getTime() >= sinceTs);
    }
  }
  const lm = Math.max(1, Math.min(1000, Number(limit) || 200));
  return items.slice(-lm).reverse();
}

function requestLogger() {
  return (req, res, next) => {
    const start = Date.now();
    const ctx = { method: req.method, path: req.originalUrl || req.url };
    info(`REQ ${req.method} ${req.originalUrl || req.url}`, ctx);
    res.on("finish", () => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      const u = (req.user && req.user.userId) || null;
      const msg = `RES ${req.method} ${req.originalUrl || req.url} ${status} ${ms}ms user=${u ?? "-"}`;
      if (status >= 400) {
        error(new Error(msg), { ...ctx, status, ms, userId: u });
      } else {
        info(msg, { ...ctx, status, ms, userId: u });
      }
    });
    next();
  };
}

function errorHandler() {
  return (err, req, res, next) => {
    error(err, {
      method: req.method,
      path: req.originalUrl || req.url,
      userId: req.user && req.user.userId,
    });
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({
      msg: err.message || "Internal Server Error",
      status: "failed",
    });
  };
}

export default { info, error, warn, getLogs, requestLogger, errorHandler };
