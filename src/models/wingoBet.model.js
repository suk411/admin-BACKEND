import mongoose from "mongoose";

const wingoBetSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    issueNumber: {
      type: String,
      required: true,
      index: true,
    },
    gameMode: {
      type: String,
      enum: ["30s", "1m", "3m", "5m"],
      default: "30s",
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      required: true,
    },
    realAmount: {
      type: Number,
      required: true,
    },
    selectType: {
      type: String,
      required: true,
      enum: ["red", "green", "violet", "big", "small", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    },
    result: {
      number: { type: String, default: null },
      selectType: { type: String, default: null },
      colour: { type: String, default: null },
      premium: { type: String, default: null },
      profitAmount: { type: Number, default: null },
      timestamp: { type: String, default: null },
    },
    status: {
      type: String,
      enum: ["pending", "won", "lost"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

wingoBetSchema.index({ userId: 1, issueNumber: 1 });
wingoBetSchema.index({ userId: 1, status: 1 });
wingoBetSchema.index({ issueNumber: 1, userId: 1, selectType: 1 });
wingoBetSchema.index({ issueNumber: 1, status: 1 });

export default mongoose.model("WingoBet", wingoBetSchema);
