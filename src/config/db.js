import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function connectDB() {
  const mongoURI = process.env.MONGO_URI;
  try {
    await mongoose.connect(mongoURI);
    console.log("[DB] Main MongoDB connected");
  } catch (err) {
    console.error("[DB] Connection error:", err.message);
    process.exit(1);
  }
}

export { connectDB };
