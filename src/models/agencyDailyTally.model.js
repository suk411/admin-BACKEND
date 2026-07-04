import mongoose from "mongoose";

const agencyDailyTallySchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  date: { type: Date, required: true, index: true },
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
  processed: { type: Boolean, default: false },
}, { versionKey: false });

agencyDailyTallySchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("AgencyDailyTally", agencyDailyTallySchema);