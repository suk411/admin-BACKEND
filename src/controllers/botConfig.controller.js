import BotConfig from "../models/botConfig.model.js";

async function getBotConfig(req, res) {
  try {
    let config = await BotConfig.findOne();
    if (!config) {
      config = await BotConfig.create({});
    }
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
}

async function updateBotConfig(req, res) {
  try {
    if (!req.user?.admin) {
      return res.status(403).json({ success: false, msg: "Admins only" });
    }
    const { ownerId, allowedUserIds, allowedGroupIds } = req.body;
    const config = await BotConfig.findOneAndUpdate(
      {},
      { ownerId: ownerId || "", allowedUserIds: allowedUserIds || [], allowedGroupIds: allowedGroupIds || [] },
      { upsert: true, new: true },
    );
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
}

export { getBotConfig, updateBotConfig };
