import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { msg: "Too many requests, please try again later", status: "failed" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { msg: "Too many auth attempts, please try again later", status: "failed" },
  standardHeaders: true,
  legacyHeaders: false,
});
