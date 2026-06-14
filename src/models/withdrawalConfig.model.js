import mongoose from "mongoose";

const withdrawalConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "default" },
  perDayLimit: { type: Number, default: 3 },
  limits: {
    BANK: {
      min: { type: Number, default: 110 },
      max: { type: Number, default: 50000 },
    },
    UPI: {
      min: { type: Number, default: 300 },
      max: { type: Number, default: 15000 },
    },
    UPAY: {
      min: { type: Number, default: 300 },
      max: { type: Number, default: 50000 },
    },
  },
}, { timestamps: true });

withdrawalConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne({ key: "default" });
  if (!config) {
    config = await this.create({ key: "default" });
  }
  return config;
};

export default mongoose.model("WithdrawalConfig", withdrawalConfigSchema);
