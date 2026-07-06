import mongoose from "mongoose";

const botConfigSchema = new mongoose.Schema({
  ownerIds: [{ type: String }],
  allowedUserIds: [{ type: String }],
  allowedGroupIds: [{ type: String }],
}, { timestamps: true });

const BotConfig = mongoose.model("BotConfig", botConfigSchema);

export default BotConfig;
