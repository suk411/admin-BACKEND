import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, unique: true },
    holderName: { type: String, default: "" },
    bank: {
      bankName: { type: String, default: "" },
      ifsc: { type: String, default: "" },
      accountNo: { type: String, default: "" },
    },
    upi: {
      address: { type: String, default: "" },
    },
    upay: {
      address: { type: String, default: "" },
    },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("PaymentMethod", paymentMethodSchema);
