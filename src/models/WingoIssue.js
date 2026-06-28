import mongoose from "mongoose";
import { conn } from "../config/wingo-db.js";

const wingoIssueSchema = new mongoose.Schema({
  issueNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  startTime: {
    type: Number,
    required: true,
  },
  endTime: {
    type: Number,
    required: true,
  },
  gameMode: {
    type: String,
    enum: ["30s", "1m", "3m", "5m"],
    default: "30s",
    index: true,
  },
  result: {
    number: { type: Number, default: null },
    color: { type: String, default: null },
    size: { type: String, default: null },
  },
  resultMode: {
    type: String,
    enum: ["RANDOM", "MAX_PROFIT", "MAX_LOSS"],
    default: "RANDOM",
  },
  status: {
    type: String,
    enum: ["open", "closed", "settled"],
    default: "open",
  },
}, { timestamps: true });

wingoIssueSchema.index({ createdAt: -1 });
wingoIssueSchema.index({ status: 1, createdAt: -1 });
wingoIssueSchema.index({ status: 1, "result.number": 1, createdAt: -1 });
wingoIssueSchema.index({ gameMode: 1, status: 1, createdAt: -1 });
wingoIssueSchema.index({ gameMode: 1, status: 1, "result.number": 1, createdAt: -1 });

export default conn.model("WingoIssue", wingoIssueSchema);
