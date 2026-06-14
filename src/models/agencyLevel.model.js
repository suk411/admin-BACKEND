import mongoose from "mongoose";

const agencyLevelSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, unique: true, index: true },
    level: { type: Number, default: 0, min: 0, max: 10 },
    teamMembers: { type: Number, default: 0 },
    teamBets: { type: Number, default: 0 },
    teamDeposit: { type: Number, default: 0 },
    l1Members: { type: Number, default: 0 },
    l2Members: { type: Number, default: 0 },
    l3Members: { type: Number, default: 0 },
    l1Bets: { type: Number, default: 0 },
    l2Bets: { type: Number, default: 0 },
    l3Bets: { type: Number, default: 0 },
    l1Deposit: { type: Number, default: 0 },
    l2Deposit: { type: Number, default: 0 },
    l3Deposit: { type: Number, default: 0 },
    l1Withdrawal: { type: Number, default: 0 },
    l2Withdrawal: { type: Number, default: 0 },
    l3Withdrawal: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("AgencyLevel", agencyLevelSchema);
