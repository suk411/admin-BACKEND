import mongoose from "mongoose";

const depositBonusConfigSchema = new mongoose.Schema(
  {
    depositCount: {
      type: Number,
      required: true,
      unique: true,
      enum: [1, 2, 3],
    },
    bonusRate: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

depositBonusConfigSchema.statics.getDefaultConfigs = async function () {
  const defaults = [
    { depositCount: 1, bonusRate: 1.0, active: true },
    { depositCount: 2, bonusRate: 0.5, active: true },
    { depositCount: 3, bonusRate: 0.3, active: true },
  ];

  for (const def of defaults) {
    await this.findOneAndUpdate(
      { depositCount: def.depositCount },
      def,
      { upsert: true, returnDocument: "after" },
    );
  }
};

depositBonusConfigSchema.statics.getRate = async function (depositCount) {
  const config = await this.findOne({ depositCount, active: true });
  return config ? config.bonusRate : 0;
};

const DepositBonusConfig = mongoose.model("DepositBonusConfig", depositBonusConfigSchema);

export default DepositBonusConfig;
