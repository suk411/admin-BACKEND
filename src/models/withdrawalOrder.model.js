import mongoose from "mongoose";

const withdrawalOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, index: true },
    userId: { type: Number, required: true, index: true },
    amount: { type: Number, required: true },
    charge: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["PENDING", "AUDITING", "SUCCESS", "FAILED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    gatewayOrderNo: { type: String, index: true },
    gatewayOrderStatus: { type: Number, default: null },
    receiptUrl: { type: String, default: null },
    gatewayResponse: { type: String, default: null },
    gatewayCreateTime: { type: Number, default: null },
    gatewayUpdateTime: { type: Number, default: null },
    paymentMethod: { type: String, enum: ["UPI", "BANK", "UPAY"], default: "BANK" },
    paymentDetails: {
      upiId: { type: String, default: "" },
      accountNo: { type: String, default: "" },
      ifsc: { type: String, default: "" },
      bankName: { type: String, default: "" },
      rplId: { type: String, default: "" },
      holderName: { type: String, default: "" },
    },
    bankDetails: {
      bankName: { type: String, default: "" },
      bankCode: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      accountHolder: { type: String, default: "" },
      ifsc: { type: String, default: "" },
    },
    channelName: { type: String, default: "SimplyPay" },
    chargeFrom: { type: String, enum: ["user", "platform"], default: null },
    note: { type: String },
  },
  { timestamps: true, versionKey: false },
);

withdrawalOrderSchema.index({ createdAt: -1 });
withdrawalOrderSchema.index({ status: 1, createdAt: -1 });
withdrawalOrderSchema.index({ userId: 1, createdAt: -1 });
withdrawalOrderSchema.index({ status: 1, userId: 1, createdAt: -1 });

export default mongoose.model("WithdrawalOrder", withdrawalOrderSchema);
