import mongoose from "mongoose";

const betRecordSchema = new mongoose.Schema(
  {
    member: {
      type: String,
      required: true,
      index: true,
    },
    site: { type: String, required: true, index: true },
    product: { type: String, required: true },
    gameId: { type: String, default: "" },
    refNo: { type: String, required: true },
    betTime: { type: Date, required: true },
    settleTime: { type: Date, required: true },
    bet: { type: Number, required: true },
    payout: { type: Number, required: true },
    turnover: { type: Number, default: 0 },
    status: { type: Number, required: true },
  },
  { timestamps: true },
);

betRecordSchema.index({ site: 1, refNo: 1 }, { unique: true });
betRecordSchema.index({ member: 1, settleTime: -1 });
betRecordSchema.index({ member: 1, site: 1 });
betRecordSchema.index({ settleTime: -1 });
betRecordSchema.index({ member: 1, settleTime: -1, status: 1 });

export default mongoose.model("BetRecord", betRecordSchema);

