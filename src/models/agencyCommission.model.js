import mongoose from "mongoose";

const agencyCommissionSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true },
    date: { type: Date, required: true },
    rebateLevel: { type: Number, required: true },
    l1Bets: { type: Number, default: 0 },
    l2Bets: { type: Number, default: 0 },
    l3Bets: { type: Number, default: 0 },
    l1Rate: { type: Number, default: 0 },
    l2Rate: { type: Number, default: 0 },
    l3Rate: { type: Number, default: 0 },
    l1Amount: { type: Number, default: 0 },
    l2Amount: { type: Number, default: 0 },
    l3Amount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["PENDING", "CREDITED"], default: "PENDING" },
    creditedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

agencyCommissionSchema.index({ userId: 1, date: -1 });

export default mongoose.model("AgencyCommission", agencyCommissionSchema);
