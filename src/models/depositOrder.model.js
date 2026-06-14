import mongoose from "mongoose";

const depositOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, index: true },
    userId: { type: Number, required: true, index: true },
    amount: { type: Number, required: true },
    receivedAmount: { type: Number },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    gatewayOrderNo: { type: String },
    paymentLinks: { type: Object, default: {} },
    channelName: { type: String, default: "Paysimply" },
    bonusOptIn: { type: Boolean, default: false },
    bonusAmount: { type: Number, default: 0 },
    note: { type: String },
  },
  { timestamps: true, versionKey: false },
);

depositOrderSchema.index({ status: 1, createdAt: -1 });
depositOrderSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.model("DepositOrder", depositOrderSchema);
