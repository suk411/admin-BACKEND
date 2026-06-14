import mongoose from "mongoose";

const levelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    minDeposit: { type: Number, required: true },
    weeklyBonus: { type: Number, required: true },
    upgradeBonus: { type: Number, default: 0 },
    weeklyDepositRequirement: { type: Number, default: 0 },
  },
  { _id: false },
);

const vipConfigSchema = new mongoose.Schema(
  {
    levels: { type: [levelSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

const VipConfig = mongoose.model("VipConfig", vipConfigSchema);

async function ensureDefaultVipConfig() {
  await VipConfig.deleteMany({});
  const defaults = [
    { name: "VIP 1", minDeposit: 0, weeklyBonus: 0, upgradeBonus: 0, weeklyDepositRequirement: 0 },
    { name: "VIP 2", minDeposit: 100, weeklyBonus: 0, upgradeBonus: 0, weeklyDepositRequirement: 0 },
    { name: "VIP 3", minDeposit: 2000, weeklyBonus: 21, upgradeBonus: 15, weeklyDepositRequirement: 200 },
    { name: "VIP 4", minDeposit: 5000, weeklyBonus: 41, upgradeBonus: 31, weeklyDepositRequirement: 300 },
    { name: "VIP 5", minDeposit: 25000, weeklyBonus: 151, upgradeBonus: 90, weeklyDepositRequirement: 400 },
    { name: "VIP 6", minDeposit: 100000, weeklyBonus: 551, upgradeBonus: 900, weeklyDepositRequirement: 1000 },
  ];
  const doc = await VipConfig.create({ levels: defaults });
  return doc;
}

export default VipConfig;
export { ensureDefaultVipConfig };
