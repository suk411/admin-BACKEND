import mongoose from "mongoose";

const depositConfigSchema = new mongoose.Schema({
  channel: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  minAmount: { type: Number, default: 100 },
  maxAmount: { type: Number, default: 100000 },
  exchangeRate: { type: Number, default: 1, min: 0 },
  sortOrder: { type: Number, default: 0 },
  description: { type: String, default: "" },
}, { timestamps: true, versionKey: false });

const DepositConfig = mongoose.model("DepositConfig", depositConfigSchema);

export async function ensureDefaultDepositConfigs() {
  const count = await DepositConfig.countDocuments();
  if (count > 0) return;
  const defaults = [
    { channel: "simplypay", name: "SimplyPay", isActive: true, minAmount: 100, maxAmount: 100000, sortOrder: 0, description: "UPI / Bank Transfer" },
    { channel: "upay", name: "UPay", isActive: true, minAmount: 200, maxAmount: 50000, sortOrder: 1, description: "UPay Wallet" },
    { channel: "gspayusdt", name: "USDT", isActive: true, minAmount: 1, maxAmount: 1000, exchangeRate: 90, sortOrder: 2, description: "USDT (Tether)" },
    { channel: "gspayinr", name: "GSPAY", isActive: true, minAmount: 100, maxAmount: 100000, sortOrder: 3, description: "INR Wallet" },
    { channel: "fpay", name: "FPay", isActive: true, minAmount: 100, maxAmount: 100000, sortOrder: 4, description: "FPay Gateway" },
  ];
  await DepositConfig.insertMany(defaults);
}

export default DepositConfig;
