import mongoose from "mongoose";

const turnoverConfigSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "DEPOSIT",
        "SIGNUP_BONUS",
        "FIRST_DEPOSIT_BONUS",
        "VIP_BONUS",
        "WEEKLY_BONUS",
        "UPGRADE_BONUS",
        "ADMIN_BONUS",
        "REFERRAL_BONUS",
        "PROMOTION",
        "DEPOSIT_BONUS",
        "AGENT_COMMISSION",
      ],
    },
    multiplier: {
      type: Number,
      default: 1,
      min: 0,
      max: 100,
    },
    description: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

turnoverConfigSchema.statics.getDefaultConfig = async function () {
  const defaults = [
    { type: "DEPOSIT", multiplier: 1, description: "Deposit turnover requirement", active: true },
    { type: "SIGNUP_BONUS", multiplier: 1, description: "Signup bonus turnover requirement", active: true },
    { type: "FIRST_DEPOSIT_BONUS", multiplier: 1, description: "First deposit bonus turnover requirement", active: true },
    { type: "VIP_BONUS", multiplier: 1, description: "VIP Bonus turnover requirement", active: true },
    { type: "WEEKLY_BONUS", multiplier: 1, description: "Weekly bonus turnover requirement", active: true },
    { type: "UPGRADE_BONUS", multiplier: 1, description: "Upgrade bonus turnover requirement", active: true },
    { type: "ADMIN_BONUS", multiplier: 1, description: "Admin bonus turnover requirement", active: true },
    { type: "REFERRAL_BONUS", multiplier: 1, description: "Referral bonus turnover requirement", active: true },
    { type: "PROMOTION", multiplier: 1, description: "Promotion bonus turnover requirement", active: true },
    { type: "DEPOSIT_BONUS", multiplier: 7, description: "Deposit bonus turnover requirement", active: true },
    { type: "AGENT_COMMISSION", multiplier: 1, description: "Agent commission turnover requirement", active: true },
  ];

  for (const def of defaults) {
    await this.findOneAndUpdate(
      { type: def.type },
      def,
      { upsert: true, returnDocument: "after" }
    );
  }
};

turnoverConfigSchema.statics.getMultiplier = async function (type) {
  const config = await this.findOne({ type, active: true });
  return config ? config.multiplier : 1;
};

const TurnoverConfig = mongoose.model("TurnoverConfig", turnoverConfigSchema);

export default TurnoverConfig;
