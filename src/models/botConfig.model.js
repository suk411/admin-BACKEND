import mongoose from "mongoose";

const botConfigSchema = new mongoose.Schema({
  ownerId: { type: String, default: "" },
  allowedUserIds: [{ type: String }],
  allowedGroupIds: [{ type: String }],
}, { timestamps: true });

const BotConfig = mongoose.model("BotConfig", botConfigSchema);

export default BotConfig;
