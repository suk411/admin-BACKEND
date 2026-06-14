import mongoose from "mongoose";

const giftCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    rewardAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    turnoverMultiplier: {
      type: Number,
      default: 1,
      min: 0,
    },
    maxRedemptions: {
      type: Number,
      required: true,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    minDepositToday: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

giftCodeSchema.index({ isActive: 1, expiryDate: 1 });

giftCodeSchema.methods.isExpired = function () {
  return new Date() > this.expiryDate;
};

giftCodeSchema.methods.isFullyRedeemed = function () {
  return this.usedCount >= this.maxRedemptions;
};

giftCodeSchema.methods.isAvailable = function () {
  return this.isActive && !this.isExpired() && !this.isFullyRedeemed();
};

giftCodeSchema.statics.generateUniqueCode = async function (length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = "";
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const exists = await this.findOne({ code: code.toUpperCase() });
    if (!exists) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    const timestamp = Date.now().toString(36).toUpperCase();
    code = `GC${timestamp}`;
  }

  return code.toUpperCase();
};

export default mongoose.model("GiftCode", giftCodeSchema);
