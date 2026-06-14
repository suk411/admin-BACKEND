import mongoose from "mongoose";

const giftCodeRedemptionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    rewardAmount: {
      type: Number,
      required: true,
    },
    turnoverAdded: {
      type: Number,
      required: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransactionLedger",
    },
  },
  { timestamps: true },
);

giftCodeRedemptionSchema.index({ code: 1, userId: 1 }, { unique: true });

giftCodeRedemptionSchema.statics.hasUserRedeemed = async function (code, userId) {
  const redemption = await this.findOne({
    code: code.toUpperCase(),
    userId,
  });
  return !!redemption;
};

export default mongoose.model("GiftCodeRedemption", giftCodeRedemptionSchema);
