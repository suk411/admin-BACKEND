import mongoose from "mongoose";

const modeStatsSchema = new mongoose.Schema({
  betCount: { type: Number, default: 0 },
  totalBets: { type: Number, default: 0 },
  profitLoss: { type: Number, default: 0 },
}, { _id: false });

const agentTallySchema = new mongoose.Schema({
  l1Bets: { type: Number, default: 0 },
  l2Bets: { type: Number, default: 0 },
  l3Bets: { type: Number, default: 0 },
  l1Deposit: { type: Number, default: 0 },
  l2Deposit: { type: Number, default: 0 },
  l3Deposit: { type: Number, default: 0 },
  l1DepositCount: { type: Number, default: 0 },
  l2DepositCount: { type: Number, default: 0 },
  l3DepositCount: { type: Number, default: 0 },
  l1FirstDepositCount: { type: Number, default: 0 },
  l2FirstDepositCount: { type: Number, default: 0 },
  l3FirstDepositCount: { type: Number, default: 0 },
  l1FirstDepositAmount: { type: Number, default: 0 },
  l2FirstDepositAmount: { type: Number, default: 0 },
  l3FirstDepositAmount: { type: Number, default: 0 },
  l1Withdrawal: { type: Number, default: 0 },
  l2Withdrawal: { type: Number, default: 0 },
  l3Withdrawal: { type: Number, default: 0 },
  l1RegCount: { type: Number, default: 0 },
  l2RegCount: { type: Number, default: 0 },
  l3RegCount: { type: Number, default: 0 },
}, { _id: false });

const dailyGameStatsSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  wingo: {
    betCount: { type: Number, default: 0 },
    totalBets: { type: Number, default: 0 },
    profitLoss: { type: Number, default: 0 },
    byMode: {
      "30s": { type: modeStatsSchema, default: () => ({}) },
      "1m": { type: modeStatsSchema, default: () => ({}) },
      "3m": { type: modeStatsSchema, default: () => ({}) },
      "5m": { type: modeStatsSchema, default: () => ({}) },
    },
  },
  gameProviders: {
    betCount: { type: Number, default: 0 },
    totalBets: { type: Number, default: 0 },
    profitLoss: { type: Number, default: 0 },
    byProvider: {
      type: Map,
      of: modeStatsSchema,
      default: () => ({}),
    },
  },
  agents: {
    type: Map,
    of: agentTallySchema,
    default: () => ({}),
  },
  commissionProcessed: { type: Boolean, default: false },
  lastUpdatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

export default mongoose.model("DailyGameStats", dailyGameStatsSchema);
