import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "https://emerald-admin-suite.vercel.app" ,
   "https://1xkingadminnew.vercel.app",
   "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-bot-token"],
  }),
);

app.use("/api/admin/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    msg: "Admin server is running but route not found",
    status: "failed",
  });
});

export default app;
