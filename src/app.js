import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { globalLimiter, authLimiter } from "./utils/rateLimiter.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

const allowedOrigins = [
  "https://emerald-admin-suite.vercel.app",
  "https://1xkingadminnew.vercel.app",
  "http://localhost:3000",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    callback(null, allowedOrigins.includes(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-bot-token"],
};

app.use(cors(corsOptions));

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(globalLimiter);

app.use("/api/admin/auth", authLimiter, authRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    msg: "Admin server is running but route not found",
    status: "failed",
  });
});

export default app;
