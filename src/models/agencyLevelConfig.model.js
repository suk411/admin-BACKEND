import mongoose from "mongoose";

const agencyLevelConfigSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true, unique: true, min: 0, max: 10 },
    minMembers: { type: Number, required: true, default: 0 },
    minBets: { type: Number, required: true, default: 0 },
    minDeposit: { type: Number, required: true, default: 0 },
    l1Rate: { type: Number, required: true },
    l2Rate: { type: Number, required: true },
    l3Rate: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("AgencyLevelConfig", agencyLevelConfigSchema);
